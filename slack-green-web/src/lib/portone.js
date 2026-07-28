import crypto from "node:crypto";

// 포트원(PortOne) V2 정기결제 어댑터.
//
// 정기결제 흐름:
//   1) 브라우저에서 PortOne SDK로 카드 등록 → "빌링키(billingKey)" 발급
//   2) 서버가 빌링키를 저장하고, 매 결제주기마다 이 빌링키로 결제를 청구
//   3) 웹훅으로 결제 성공/실패를 통보받아 구독 상태 갱신
//
// 이 모듈은 2)의 "빌링키로 청구"를 담당. 실제 호출에는 PortOne 계정의
// STORE_ID / API_SECRET 이 필요하다. 없거나 MOCK_BILLING=1 이면 목(mock)으로
// 동작해 로컬에서 전체 흐름을 테스트할 수 있다.

const API_BASE = "https://api.portone.io";

export const MOCK = process.env.MOCK_BILLING === "1" || !process.env.PORTONE_API_SECRET;

// 빌링키로 실제 결제를 청구한다. paymentId는 우리가 생성하는 고유 주문 ID.
export async function chargeWithBillingKey({ paymentId, billingKey, amountKrw, orderName, customer }) {
  if (MOCK) {
    return { ok: true, mock: true, paymentId, status: "PAID" };
  }

  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}/billing-key`, {
    method: "POST",
    headers: {
      Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeId: process.env.PORTONE_STORE_ID,
      billingKey,
      orderName,
      customer, // { id, email } 등
      amount: { total: amountKrw },
      currency: "KRW",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.message || `PortOne HTTP ${res.status}`, raw: data };
  }
  return { ok: true, paymentId, status: data?.status || "PAID", raw: data };
}

// 웹훅 검증 — standard-webhooks 규격(PortOne V2가 채택).
// 서명 대상: `${webhook-id}.${webhook-timestamp}.${rawBody}` 를 시크릿으로
// HMAC-SHA256 → base64. 헤더 webhook-signature 는 "v1,<sig>" 공백구분 목록.
// rawBody(파싱 전 원문 문자열)가 필요하다.
const TOLERANCE_SEC = 5 * 60; // 재전송 공격 방지 시간창

export function verifyWebhook(rawBody, headers) {
  if (MOCK) return true;
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) return false;

  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  // 타임스탬프 신선도 검사(재전송 방지)
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(nowMs() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SEC) return false;

  // 시크릿은 "whsec_" 접두사 + base64
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

  // 헤더의 여러 서명(v1,<sig>) 중 하나라도 상수시간 일치하면 통과
  for (const part of signatureHeader.split(" ")) {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    if (timingSafeEqualB64(sig, expected)) return true;
  }
  return false;
}

function timingSafeEqualB64(a, b) {
  const ab = Buffer.from(a || "", "base64");
  const bb = Buffer.from(b || "", "base64");
  if (ab.length !== bb.length || ab.length === 0) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Date.now 래퍼(테스트에서 주입 가능하도록 분리).
function nowMs() {
  return Date.now();
}
