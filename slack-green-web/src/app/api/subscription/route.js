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
  // userId 를 함께 반환한다: 결제 링크에 ?ref=<userId> 로 실어 보내면 Groble 웹훅이
  // sellerReference 로 되돌려주므로, 결제 이메일 추측 없이 정확히 매칭된다.
  // (본인 uid 이므로 노출돼도 무해하다 — 세션 쿠키로만 스코핑된다.)
  return NextResponse.json({ ...summarize(sub), userId });
}
