// Slack Incoming Webhook 알림. SLACK_WEBHOOK_URL 이 없으면 조용히 skip한다
// (개발/미설정 환경에서 요청 기록 자체가 실패하지 않도록).
//
// 설정법: Slack → 앱 "Incoming Webhooks" → 채널 선택 → 발급된 URL을
// SLACK_WEBHOOK_URL 환경변수에 넣기.
export async function notifySlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
