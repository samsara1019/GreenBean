import { NextResponse } from "next/server";
import { verifyWebhook } from "../../../../lib/portone.js";
import { updateSubscription } from "../../../../lib/db.js";
import { nextPeriodEnd } from "../../../../lib/entitlement.js";

export const runtime = "nodejs";

// PortOne 결제 결과 웹훅. 정기결제(갱신) 성공/실패를 받아 구독 상태를 갱신한다.
// body 형태는 PortOne V2 스펙에 맞춰 매핑할 것 (여기서는 최소 필드만 처리).
export async function POST(request) {
  // 서명 검증에는 파싱 전 원문(raw body)이 필요하다.
  const rawBody = await request.text();
  if (!verifyWebhook(rawBody, request.headers)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const userId = body.userId || body.customerId; // 결제 시 customer.id로 넣은 값
  const status = body.status; // "PAID" | "FAILED" | "CANCELLED" 등
  if (!userId) return NextResponse.json({ error: "userId 없음" }, { status: 400 });

  if (status === "PAID") {
    await updateSubscription(userId, {
      status: "active",
      current_period_end: nextPeriodEnd(),
      last_payment_id: body.paymentId || null,
    });
  } else if (status === "FAILED") {
    await updateSubscription(userId, { status: "past_due" });
  } else if (status === "CANCELLED") {
    await updateSubscription(userId, { status: "canceled" });
  }

  return NextResponse.json({ ok: true });
}
