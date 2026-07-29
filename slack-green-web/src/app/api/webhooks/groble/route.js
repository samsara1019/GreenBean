// Groble 결제 웹훅 수신 → 구독 자동 활성화/해지.
//
// 인증: Groble은 서명 헤더를 주지 않으므로, 등록 URL 뒤에 붙인 비밀값으로 인증한다.
//   https://<도메인>/api/webhooks/groble?key=<GROBLE_WEBHOOK_SECRET>
// 비밀값이 설정되지 않았으면 **거부한다**(503). 예전 포트원 웹훅이 mock 모드에서
// 서명 검증을 무조건 통과시켜 누구나 Pro를 켤 수 있었던 사고를 반복하지 않는다.
//
// 페이로드 형태는 아직 확정되지 않았다(테스트 발송으로 확인 필요). 그래서:
//   - 이벤트 종류/이메일을 여러 후보 필드에서 재귀적으로 찾는다
//   - 무엇을 받았고 어떻게 판단했는지 payment_events 에 raw 째로 남긴다
//   - 판단이 안 되면 applied=false 로 기록만 하고 200을 준다(재전송 폭주 방지)
// 실제 페이로드를 확인한 뒤 아래 EVENT_HINTS / 이메일 추출을 좁히면 된다.

import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  findUserIdByEmail,
  recordPaymentEvent,
  markPaymentEventApplied,
  notePaymentEvent,
  grantProMonth,
  revokePro,
} from "../../../../lib/db.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 페이로드 어딘가에 이 문자열이 있으면 해당 이벤트로 판단한다.
const EVENT_HINTS = {
  paid: ["paid", "payment.completed", "payment_completed", "결제 완료", "결제완료", "success"],
  canceled: [
    "cancel",
    "canceled",
    "cancelled",
    "payment.cancelled",
    "refund",
    "결제 취소",
    "결제취소",
    "해지",
  ],
};

const EMAIL_KEYS = ["email", "buyeremail", "customeremail", "purchaseremail", "useremail", "payeremail"];
const ID_KEYS = ["paymentid", "payment_id", "orderid", "order_id", "transactionid", "merchantuid", "id"];

// 중첩 객체를 훑어 키 이름이 후보에 맞는 첫 값을 찾는다.
function findByKey(obj, candidates, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return null;
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase().replace(/[^a-z_]/g, "");
    if (candidates.includes(key) && (typeof v === "string" || typeof v === "number")) {
      return String(v);
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = findByKey(v, candidates, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// 키 이름을 못 믿을 때의 최후 수단: 값 중에서 이메일 형태를 찾는다.
function findEmailAnywhere(raw) {
  const m = JSON.stringify(raw).match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : null;
}

function classify(raw) {
  const blob = JSON.stringify(raw).toLowerCase();
  // 취소를 먼저 본다 — "취소 완료" 페이로드에도 'paid' 문자열이 섞여 있을 수 있다.
  if (EVENT_HINTS.canceled.some((h) => blob.includes(h.toLowerCase()))) return "canceled";
  if (EVENT_HINTS.paid.some((h) => blob.includes(h.toLowerCase()))) return "paid";
  return "unknown";
}

function safeEq(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
}

// Groble이 준 시크릿으로 오는 요청을 검증한다. 실제 전달 방식(문서 미확인)을 몰라서
// 흔한 형태를 모두 시도한다:
//   ① 헤더에 시크릿을 그대로 실어 보내는 방식
//   ② 본문의 HMAC-SHA256 (hex 또는 base64), `sha256=` 접두사나 `v1=` 형태 포함
// 어떤 헤더로 왔는지는 로그로 남겨서, 실제 형태를 확인한 뒤 하나로 좁힌다.
function verifySigningSecret(rawText, headers, signingSecret) {
  if (!signingSecret) return { ok: false, how: null, seen: [] };

  const seen = [];
  const values = [];
  for (const [name, value] of headers.entries()) {
    const n = name.toLowerCase();
    if (/(sign|signature|secret|token|hmac|groble)/.test(n)) {
      seen.push(n);
      values.push(value);
    }
  }
  if (!values.length) return { ok: false, how: null, seen };

  const hmacHex = createHmac("sha256", signingSecret).update(rawText).digest("hex");
  const hmacB64 = createHmac("sha256", signingSecret).update(rawText).digest("base64");

  for (const v of values) {
    // "sha256=xxx", "t=123,v1=xxx" 같은 형태에서 값만 뽑아낸다.
    const parts = String(v)
      .split(/[,\s]+/)
      .map((p) => (p.includes("=") ? p.slice(p.indexOf("=") + 1) : p))
      .filter(Boolean);
    for (const p of [v, ...parts]) {
      if (safeEq(p, signingSecret)) return { ok: true, how: "plain-secret-header", seen };
      if (safeEq(p, hmacHex)) return { ok: true, how: "hmac-sha256-hex", seen };
      if (safeEq(p, hmacB64)) return { ok: true, how: "hmac-sha256-base64", seen };
    }
  }
  return { ok: false, how: null, seen };
}

export async function POST(request) {
  const urlSecret = process.env.GROBLE_WEBHOOK_SECRET;
  const signingSecret = process.env.GROBLE_SIGNING_SECRET;
  if (!urlSecret && !signingSecret) {
    console.error("[groble] 비밀값 미설정 — 웹훅을 거부한다.");
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const rawText = await request.text();

  // URL 비밀값 또는 Groble 서명 중 **하나라도** 맞으면 통과. 서명 방식을 아직
  // 확정하지 못한 동안 결제가 조용히 실패하는 것을 막기 위한 이중 게이트다.
  // 실제 형태를 확인한 뒤에는 서명 검증만 남기고 URL 키를 없애는 게 맞다.
  const url = new URL(request.url);
  const providedKey = url.searchParams.get("key") || request.headers.get("x-webhook-key");
  const byUrlKey = Boolean(urlSecret) && providedKey != null && safeEq(providedKey, urlSecret);
  const sig = verifySigningSecret(rawText, request.headers, signingSecret);

  if (!byUrlKey && !sig.ok) {
    console.warn(
      `[groble] 인증 실패. urlKey=${providedKey ? "제공됨(불일치)" : "없음"} ` +
        `서명후보헤더=[${sig.seen.join(", ") || "없음"}]`
    );
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  console.log(
    `[groble] 인증 통과 (${byUrlKey ? "url-key" : sig.how}) ` +
      `서명후보헤더=[${sig.seen.join(", ") || "없음"}]`
  );
  let raw;
  try {
    raw = JSON.parse(rawText || "{}");
  } catch {
    // JSON이 아니어도 형태 파악을 위해 기록은 남긴다.
    raw = { _nonJsonBody: rawText.slice(0, 2000) };
  }

  const eventType = classify(raw);
  const email = findByKey(raw, EMAIL_KEYS) || findEmailAnywhere(raw);
  const paymentId = findByKey(raw, ID_KEYS);
  const eventKey =
    (paymentId ? `${eventType}:${paymentId}` : null) ||
    `${eventType}:sha:${createHash("sha256").update(rawText).digest("hex").slice(0, 32)}`;

  // 토큰·카드정보가 섞일 수 있으므로 페이로드 전체를 콘솔에 찍지 않는다.
  console.log(`[groble] event=${eventType} key=${eventKey} email=${email ? "found" : "none"}`);

  const { duplicate } = await recordPaymentEvent({
    eventKey,
    eventType,
    email,
    raw,
    note: email ? null : "이메일을 찾지 못함",
  });
  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true, eventKey });
  }

  if (eventType === "unknown") {
    return NextResponse.json({
      ok: true,
      applied: false,
      reason: "이벤트 종류를 판단하지 못함 — payment_events.raw 확인 필요",
      eventKey,
    });
  }
  if (!email) {
    return NextResponse.json({
      ok: true,
      applied: false,
      reason: "결제자 이메일을 찾지 못함 — 수동 처리 필요",
      eventKey,
    });
  }

  const userId = await findUserIdByEmail(email);
  if (!userId) {
    // 결제 이메일 ≠ 가입 이메일. 사람이 개입해야 하므로 applied 는 false 로 둔다.
    await notePaymentEvent(eventKey, `가입 계정 없음(${email}) — 수동 확인 필요`).catch(
      () => {}
    );
    return NextResponse.json({
      ok: true,
      applied: false,
      reason: "해당 이메일로 가입한 계정이 없음",
      eventKey,
    });
  }

  if (eventType === "paid") {
    await grantProMonth(userId);
  } else {
    await revokePro(userId);
  }
  await markPaymentEventApplied(eventKey, { userId, note: `${eventType} 적용됨` });

  return NextResponse.json({ ok: true, applied: true, eventType, eventKey });
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
