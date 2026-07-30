// Slack Incoming Webhook 알림. SLACK_WEBHOOK_URL 이 없으면 조용히 skip한다
// (개발/미설정 환경에서 요청 기록 자체가 실패하지 않도록).
//
// 설정법: Slack → 앱 "Incoming Webhooks" → 채널 선택 → 발급된 URL을
// SLACK_WEBHOOK_URL 환경변수에 넣기.
// 알림 때문에 본 작업이 느려지면 안 된다 — Slack 이 응답하지 않는 경우를 대비해
// 타임아웃을 둔다(없으면 fetch 기본값까지 요청이 매달려 있는다).
const TIMEOUT_MS = 3000;

export async function notifySlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // 실패를 조용히 삼키면 "알림이 왜 안 오지"를 추적할 수 없다.
      // 본문에 이유가 담긴다(invalid_token, channel_not_found 등).
      const body = await res.text().catch(() => "");
      console.error(`[slack] ${res.status}: ${body.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[slack] 전송 실패: ${e.message}`);
    return false;
  }
}
