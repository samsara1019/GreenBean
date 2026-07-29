import { NextResponse } from "next/server";
import { requireUserId } from "../../../../lib/auth.js";
import { getOrCreateSubscription, updateSubscription } from "../../../../lib/db.js";
import { chargeWithBillingKey, MOCK } from "../../../../lib/portone.js";
import { nextPeriodEnd, PLAN_PRICE_KRW, summarize } from "../../../../lib/entitlement.js";

export const runtime = "nodejs";

// 체험 → 유료 전환. 브라우저에서 PortOne SDK로 발급받은 billingKey를 받아
// 첫 결제를 청구하고 구독을 active로 만든다. (MOCK 모드에서는 실제 청구 생략.)
export async function POST(request) {
  const { userId, response } = await requireUserId();
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  const billingKey = body.billingKey || null;

  if (!MOCK && !billingKey) {
    return NextResponse.json({ error: "billingKey가 필요합니다." }, { status: 400 });
  }

  await getOrCreateSubscription(userId); // 없으면 체험 row 생성

  const paymentId = `pay_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const charge = await chargeWithBillingKey({
    paymentId,
    billingKey,
    amountKrw: PLAN_PRICE_KRW,
    orderName: "Green Bean Pro (월 구독)",
    customer: { id: userId },
  });

  if (!charge.ok) {
    return NextResponse.json({ error: charge.error || "결제 실패" }, { status: 402 });
  }

  const updated = await updateSubscription(userId, {
    plan: "pro",
    status: "active",
    billing_key: billingKey, // db.js가 암호화 저장
    current_period_end: nextPeriodEnd(),
    last_payment_id: paymentId,
  });

  return NextResponse.json({ ok: true, mock: !!charge.mock, subscription: summarize(updated) });
}
