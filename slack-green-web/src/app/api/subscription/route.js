import { NextResponse } from "next/server";
import { requireUserId } from "../../../lib/auth.js";
import { getOrCreateSubscription } from "../../../lib/db.js";
import { summarize } from "../../../lib/entitlement.js";

export const runtime = "nodejs";
// GET 라우트가 빌드타임에 정적 캐시되지 않도록 강제 (사용자별 실시간 상태 필수).
export const dynamic = "force-dynamic";

// 로그인한 사용자의 구독 상태. row가 없으면 여기서 14일 체험이 시작된다
// (= 가입 후 대시보드 첫 진입 시점).
export async function GET() {
  const { userId, response } = await requireUserId();
  if (response) return response;
  const sub = await getOrCreateSubscription(userId);
  return NextResponse.json(summarize(sub));
}
