// 회원 탈퇴.
//
// 되돌릴 수 없는 작업이므로 순서가 중요하다:
//   1) 연결(암호화된 Slack 자격증명)을 먼저 지운다 — 여기서 실패하면 중단해야
//      한다. 자격증명이 남은 채 계정만 사라지는 상태가 제일 나쁘다
//      (주인 없는 토큰을 워커가 계속 들고 있게 된다).
//   2) 구독·결제기록·요청기록 삭제
//   3) Auth 사용자 삭제
//   4) 세션 쿠키 정리
//
// 워커는 connections 를 읽어 동작하므로, 1)이 끝나는 순간 다음 스케줄 재평가에서
// 해당 사용자의 초록불 유지가 멈춘다.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser, requireUserId } from "../../../lib/auth.js";
import { deleteAccount } from "../../../lib/db.js";
import { createRouteSupabase, AUTH_CONFIGURED } from "../../../lib/supabase-auth.js";
import { notifySlack } from "../../../lib/slackNotify.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const { userId, response } = await requireUserId();
  if (response) return response;

  // 알림·기록용으로 지우기 전에 확보해 둔다.
  const user = await getUser().catch(() => null);
  const email = user?.email || null;

  let deleted;
  try {
    deleted = await deleteAccount(userId, email);
  } catch (e) {
    console.error("[account] 탈퇴 실패:", e);
    return NextResponse.json(
      { error: "탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  console.log(`[account] 탈퇴 완료 ${userId} ${JSON.stringify(deleted)}`);

  // 세션 쿠키 정리. Auth 사용자가 이미 지워져 토큰은 무효지만, 쿠키가 남아 있으면
  // 다음 요청이 401 로 튕기며 로그인 화면을 오가는 모양이 된다.
  try {
    if (AUTH_CONFIGURED) {
      const supabase = createRouteSupabase(cookies());
      await supabase.auth.signOut();
    }
  } catch (e) {
    console.error("[account] 로그아웃 실패(무시):", e.message);
  }

  // 알림은 부가 기능 — 실패해도 탈퇴는 이미 끝났다.
  try {
    await notifySlack(
      [
        "👋 *회원 탈퇴*",
        `• 계정: ${email || userId}`,
        `• 삭제: 연결 ${deleted.connections ?? 0}건 · 구독 ${deleted.subscriptions ?? 0}건`,
      ].join("\n")
    );
  } catch (e) {
    console.error("[account] 알림 실패(무시):", e.message);
  }

  return NextResponse.json({ ok: true, deleted });
}
