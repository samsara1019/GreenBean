// Groble 결제 웹훅 수신 → 구독 자동 활성화/정지.
// 스펙: https://www.groble.im/help/guides/webhook , /help/guides/webhook-events
//
// 인증 (문서 기준):
//   signature = HEX(HMAC-SHA256(secret, "{timestamp}.{raw_body}"))
//   헤더 X-Groble-Signature / X-Groble-Timestamp(초, ±5분) /
//        X-Groble-Signature-Previous(시크릿 교체 후 24시간 동안만)
//   → GROBLE_SIGNING_SECRET 로 검증한다.
//
//   URL 비밀값(?key=GROBLE_WEBHOOK_SECRET)도 폴백으로 남겨둔다. 서명 검증이 확실히
//   동작하는 것을 확인하면 URL 키는 없애는 게 맞다(비밀값이 URL·로그에 남는다).
//   비밀값이 하나도 없으면 503 — 예전 포트원 웹훅이 mock 모드에서 서명 검증을 무조건
//   통과시켜 누구나 Pro를 켤 수 있었던 사고를 반복하지 않기 위한 fail-closed.
//
// 사용자 매칭:
//   결제 링크에 `?ref=<user_id>` 를 붙이면 웹훅의 data.object.sellerReference 로
//   그대로 돌아온다 → 이메일 추측 없이 정확히 매칭된다. 단 환불 계열 이벤트에는
//   sellerReference 가 없으므로(문서 명시) buyer.email 로 폴백한다.

import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  findUserIdByEmail,
  getSubscription,
  recordPaymentEvent,
  markPaymentEventApplied,
  notePaymentEvent,
  grantProMonth,
  revokePro,
  markPastDue,
} from "../../../../lib/db.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMESTAMP_TOLERANCE_SEC = 300; // 문서: ±5분

// 이벤트별 처리. "환불(즉시 종료)"과 "해지(다음 갱신만 중단)"를 구분하는 것이 핵심 —
// 섞으면 사용자가 이미 결제한 잔여 기간을 잃는다.
const EVENT_ACTIONS = {
  "payment.completed": "grant", // 일반결제 완료
  "subscription_payment.completed": "grant", // 정기결제 완료(첫 결제 + 갱신)
  "subscription_payment.failed": "past_due", // 갱신 실패 → 유예 후 자동 정지
  "payment.refunded": "revoke", // 일반결제 취소 완료 = 환불 → 즉시 종료
  "subscription_payment.refunded": "revoke", // 정기결제 회차 환불 → 즉시 종료
  "payment.cancel_requested": "none", // 취소 요청(확정 아님)
  "subscription.cancel_requested": "none", // 해지 요청 → 잔여 기간 유지
  "subscription.terminated": "none", // 해지 완료 → 갱신만 없어짐, 만료일에 자연 종료
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeEq(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
}

function verifySignature(rawText, headers, secret) {
  if (!secret) return { ok: false, reason: "GROBLE_SIGNING_SECRET 미설정" };
  const sig = headers.get("x-groble-signature");
  const prev = headers.get("x-groble-signature-previous");
  const ts = headers.get("x-groble-timestamp");
  if (!sig || !ts) return { ok: false, reason: "서명/타임스탬프 헤더 없음" };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: "타임스탬프 형식 오류" };
  const skew = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
  if (skew > TIMESTAMP_TOLERANCE_SEC) {
    // 재전송 공격 방지. 문서가 요구하는 검사다.
    return { ok: false, reason: `타임스탬프 ±5분 초과(${skew}s)` };
  }

  const expected = createHmac("sha256", secret).update(`${ts}.${rawText}`).digest("hex");
  if (safeEq(expected, sig)) return { ok: true, how: "signature" };
  // 시크릿 교체 후 24시간: 우리가 아직 옛 시크릿을 들고 있으면 previous 와 맞는다.
  if (prev && safeEq(expected, prev)) return { ok: true, how: "signature-previous" };
  return { ok: false, reason: "서명 불일치" };
}

// subscription.nextBillingDate 는 "2026-08-29" 처럼 날짜만 온다(KST 기준).
// 그 날 결제가 일어나므로 만료일을 그 날짜 + 1일로 잡아 웹훅 지연 여유를 둔다.
// 형식이 예상과 다르면 null → 호출부가 "+1개월" 폴백을 쓴다.
function nextBillingEnd(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const t = Date.parse(`${dateStr}T00:00:00+09:00`);
  if (!Number.isFinite(t)) return null;
  return new Date(t + 86_400_000).toISOString();
}

// 중첩 객체에서 이메일 형태를 찾는 최후 수단(문서에 없는 필드 배치 대비).
function findEmailAnywhere(raw) {
  const m = JSON.stringify(raw).match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : null;
}

export async function POST(request) {
  const signingSecret = process.env.GROBLE_SIGNING_SECRET;
  const urlSecret = process.env.GROBLE_WEBHOOK_SECRET;
  if (!signingSecret && !urlSecret) {
    console.error("[groble] 비밀값 미설정 — 웹훅을 거부한다.");
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const rawText = await request.text();

  const sig = verifySignature(rawText, request.headers, signingSecret);
  const providedKey =
    new URL(request.url).searchParams.get("key") || request.headers.get("x-webhook-key");
  const byUrlKey = Boolean(urlSecret) && providedKey != null && safeEq(providedKey, urlSecret);

  if (!sig.ok && !byUrlKey) {
    console.warn(`[groble] 인증 실패: ${sig.reason}, urlKey=${providedKey ? "불일치" : "없음"}`);
    if (process.env.GROBLE_WEBHOOK_DEBUG === "1") {
      // 무엇이 왔는지 SQL로 확인할 수 있게 남긴다. 구독에는 절대 반영하지 않는다
      // (적용까지 하면 디버그를 켠 동안 누구나 Pro를 켤 수 있다).
      const headers = {};
      for (const [n, v] of request.headers.entries()) {
        if (/^(cookie|authorization)$/i.test(n)) continue;
        headers[n] = String(v).slice(0, 300);
      }
      await recordPaymentEvent({
        eventKey: `debug:${createHash("sha256")
          .update(rawText + Date.now())
          .digest("hex")
          .slice(0, 24)}`,
        eventType: "debug_unauthorized",
        raw: { _reason: sig.reason, _headers: headers, _body: rawText.slice(0, 4000) },
        note: "인증 실패 — 디버그 기록(구독 미반영)",
      }).catch((e) => console.error("[groble] 디버그 기록 실패:", e.message));
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw;
  try {
    raw = JSON.parse(rawText || "{}");
  } catch {
    raw = { _nonJsonBody: rawText.slice(0, 2000) };
  }

  const eventType = raw?.type || "unknown";
  const obj = raw?.data?.object || {};
  const action = EVENT_ACTIONS[eventType] || "unknown";

  // 중복 배송 차단. 문서가 X-Groble-Idempotency-Key 사용을 명시한다.
  const eventKey =
    request.headers.get("x-groble-idempotency-key") ||
    raw?.id ||
    `sha:${createHash("sha256").update(rawText).digest("hex").slice(0, 32)}`;

  const ref = typeof obj.sellerReference === "string" ? obj.sellerReference : null;
  const email = obj?.buyer?.email || findEmailAnywhere(raw);

  console.log(
    `[groble] ${eventType} action=${action} key=${eventKey} ` +
      `auth=${sig.ok ? sig.how : "url-key"} ref=${ref ? "있음" : "없음"}`
  );

  const { duplicate } = await recordPaymentEvent({
    eventKey,
    eventType,
    email,
    raw,
    note: action === "unknown" ? "처리 규칙 없는 이벤트" : null,
  });
  if (duplicate) return NextResponse.json({ ok: true, duplicate: true, eventKey });

  if (action === "unknown") {
    return NextResponse.json({ ok: true, applied: false, reason: "미지원 이벤트", eventType });
  }
  if (action === "none") {
    // 해지 요청/완료, 취소 요청 — 자격에는 손대지 않는다. 갱신 결제 웹훅이 더 오지
    // 않으므로 current_period_end 가 지나면 워커가 알아서 초록불을 끈다.
    await markPaymentEventApplied(eventKey, {
      note: "자격 변경 없음(잔여 기간 유지, 다음 갱신 없음)",
    });
    return NextResponse.json({ ok: true, applied: true, eventType, action });
  }

  // --- 사용자 매칭: ref(sellerReference) 우선, 없으면 이메일 ---
  let userId = null;
  let how = null;
  if (ref && UUID_RE.test(ref) && (await getSubscription(ref))) {
    userId = ref;
    how = "sellerReference";
  }
  if (!userId && email) {
    userId = await findUserIdByEmail(email);
    if (userId) how = "email";
  }
  if (!userId) {
    const reason = ref
      ? `ref(${ref})와 이메일(${email || "없음"}) 모두 매칭 실패`
      : `이메일(${email || "없음"}) 매칭 실패`;
    await notePaymentEvent(eventKey, `${reason} — 수동 확인 필요`).catch(() => {});
    return NextResponse.json({ ok: true, applied: false, reason, eventType });
  }

  let note;
  if (action === "grant") {
    // Groble이 알려주는 다음 결제일을 그대로 이용 만료일로 쓴다. 날짜만 오므로(KST)
    // 하루를 더해 둔다 — 갱신 웹훅이 몇 시간 늦어도 서비스가 끊기지 않게 하는 여유분.
    const periodEndIso = nextBillingEnd(obj?.subscription?.nextBillingDate);
    await grantProMonth(userId, { periodEndIso });
    note =
      `결제 완료 → Pro (매칭: ${how}, 만료: ` +
      `${periodEndIso ? periodEndIso.slice(0, 10) + "(nextBillingDate+1d)" : "+1개월 폴백"})`;
  } else if (action === "revoke") {
    await revokePro(userId);
    note = `환불 → 즉시 종료 (매칭: ${how})`;
  } else {
    await markPastDue(userId);
    note = `갱신 실패 → past_due 유예 (매칭: ${how})`;
  }
  await markPaymentEventApplied(eventKey, { userId, note });

  return NextResponse.json({ ok: true, applied: true, eventType, action, eventKey });
}

// Groble이 등록 검증용으로 GET을 때릴 수 있어 200을 준다(URL 비밀값 확인은 하되).
export async function GET(request) {
  const secret = process.env.GROBLE_WEBHOOK_SECRET;
  const url = new URL(request.url);
  if (!secret || !safeEq(url.searchParams.get("key") || "", secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, endpoint: "groble-webhook" });
}
