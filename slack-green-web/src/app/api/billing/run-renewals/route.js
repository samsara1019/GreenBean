import { NextResponse } from "next/server";
import { listDueSubscriptions, updateSubscription } from "../../../../lib/db.js";
import { chargeWithBillingKey } from "../../../../lib/portone.js";
import { nextPeriodEnd, PLAN_PRICE_KRW } from "../../../../lib/entitlement.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 정기결제 갱신 배치. 매일 1회 크론이 호출한다.
// - Vercel Cron: GET + `Authorization: Bearer <CRON_SECRET>`
// - 수동/기타: POST + `x-cron-secret: <CRON_SECRET>`
// 둘 다 허용. 결제주기가 지난 구독을 빌링키로 자동 청구하고 다음 주기로 연장한다.
export async function GET(request) {
  return handle(request);
}
export async function POST(request) {
  return handle(request);
}

async function handle(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const bearer = request.headers.get("authorization") === `Bearer ${secret}`;
    const custom = request.headers.get("x-cron-secret") === secret;
    if (!bearer && !custom) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const due = await listDueSubscriptions();
  const results = [];

  for (const sub of due) {
    if (!sub.billingKey) {
      await updateSubscription(sub.userId, { status: "past_due" });
      results.push({ userId: sub.userId, ok: false, reason: "no_billing_key" });
      continue;
    }
    const paymentId = `pay_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const charge = await chargeWithBillingKey({
      paymentId,
      billingKey: sub.billingKey,
      amountKrw: PLAN_PRICE_KRW,
      orderName: "Green Bean Pro (월 구독 갱신)",
      customer: { id: sub.userId },
    });

    if (charge.ok) {
      await updateSubscription(sub.userId, {
        status: "active",
        current_period_end: nextPeriodEnd(),
        last_payment_id: paymentId,
      });
      results.push({ userId: sub.userId, ok: true });
    } else {
      await updateSubscription(sub.userId, { status: "past_due" });
      results.push({ userId: sub.userId, ok: false, reason: charge.error });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
