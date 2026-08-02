import { NextResponse } from "next/server";
import { recordInterest } from "../../../lib/db.js";
import { notifySlack } from "../../../lib/slackNotify.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 라우트(로그인 불필요). "정식 개발 요청" 클릭을 기록하고 Slack 알림을 보낸다.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "guide";
  const ua = (request.headers.get("user-agent") || "").slice(0, 300);

  let count = null;
  try {
    count = await recordInterest({ email, source, userAgent: ua });
  } catch (e) {
    // 기록 실패해도 알림은 시도한다(둘 다 실패해도 사용자에겐 성공처럼 보여도 무방).
    console.error("[interest] record failed:", e.message);
  }

  // Slack 알림 (webhook 미설정이면 조용히 skip). 서버리스에서 확실히 보내도록 await.
  await notifySlack(
    [
      ":raising_hand: *정식 개발 요청* 이 들어왔어요!",
      `• source: ${source}`,
      `• email: ${email || "(미입력)"}`,
      count != null ? `• 누적: ${count}건` : null,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return NextResponse.json({ ok: true, count });
}
