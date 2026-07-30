// 무료 Pro 전환 (한시 정책).
//
// 해외 결제 준비가 끝나기 전까지는 결제 없이 버튼 클릭만으로 Pro를 부여한다.
// 결제 경로(Groble 웹훅)와 자격 판정(entitlement) 로직은 그대로 두고, 이 라우트만
// 스위치로 얹었다 — 정책을 끝낼 때 NEXT_PUBLIC_FREE_PRO 만 내리면 원복된다.
//
// ⚠️ 이 라우트는 "돈을 받지 않고 유료 등급을 주는" 엔드포인트다. 그래서:
//   1) NEXT_PUBLIC_FREE_PRO=1 이 아니면 403 (기본은 꺼짐 = fail-closed)
//   2) 로그인 필수 — 자기 계정에만 적용된다
//   3) 이미 유효한 Pro면 기간을 늘리지 않는다 (반복 클릭으로 무한 적립 방지)
// 예전 포트원 웹훅이 mock 모드에서 누구나 Pro를 켤 수 있었던 사고를 반복하지 않도록
// 게이트를 명시적으로 둔다.

import { NextResponse } from "next/server";
import { getUser, requireUserId } from "../../../../lib/auth.js";
import {
  countActivePro,
  getOrCreateSubscription,
  grantProMonth,
} from "../../../../lib/db.js";
import { isEntitled, summarize } from "../../../../lib/entitlement.js";
import { notifySlack } from "../../../../lib/notify.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_PRO = process.env.NEXT_PUBLIC_FREE_PRO === "1";
// 한 번 클릭에 부여하는 기간. 무한정이 아니라 기간제로 두어, 정책이 끝난 뒤에도
// 무료 Pro가 영구히 남지 않게 한다. 만료되면 사용자가 다시 누르면 된다.
const FREE_PRO_DAYS = Number(process.env.FREE_PRO_DAYS || 30);

export async function POST() {
  if (!FREE_PRO) {
    return NextResponse.json({ error: "무료 전환이 활성화되지 않았습니다." }, { status: 403 });
  }

  const { userId, response } = await requireUserId();
  if (response) return response;

  const sub = await getOrCreateSubscription(userId);

  // 이미 유효한 Pro면 그대로 둔다 — 클릭할수록 기간이 쌓이는 것을 막는다.
  if (sub.status === "active" && isEntitled(sub)) {
    return NextResponse.json({ ...summarize(sub), userId, already: true });
  }

  const end = new Date(Date.now() + FREE_PRO_DAYS * 86_400_000);
  const updated = await grantProMonth(userId, { periodEndIso: end.toISOString() });
  console.log(`[free-pro] ${userId} → active until ${end.toISOString()} (${FREE_PRO_DAYS}일)`);

  // 운영 알림. 실패해도 전환은 이미 끝났으므로 응답에 영향을 주지 않는다.
  // (notifySlack 자체가 예외를 먹지만, 이메일/집계 조회 실패까지 감싼다.)
  try {
    const user = await getUser();
    const total = await countActivePro();
    await notifySlack(
      [
        "🎁 *무료 Pro 전환*",
        `• 계정: ${user?.email || userId}`,
        `• 기간: ${FREE_PRO_DAYS}일 (만료 ${end.toISOString().slice(0, 10)})`,
        total != null ? `• 현재 활성 Pro: ${total}명` : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  } catch (e) {
    console.error("[free-pro] 알림 실패(무시):", e.message);
  }

  return NextResponse.json({ ...summarize(updated), userId, granted: true });
}
