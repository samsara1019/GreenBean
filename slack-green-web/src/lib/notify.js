// 운영 알림 (Slack Incoming Webhook).
//
// 설정: Slack → 앱 만들기 → Incoming Webhooks 활성화 → 채널 선택 → 발급된 URL을
// SLACK_NOTIFY_WEBHOOK_URL 에 넣는다. 미설정이면 조용히 아무것도 하지 않는다
// (로컬 개발에서 알림 때문에 에러가 나지 않게).
//
// ⚠️ 알림은 부가 기능이다. 웹훅이 죽거나 느려도 **본 작업(구독 전환 등)은 성공해야
// 한다** → 예외를 먹고 3초 타임아웃을 둔다. 반대로 fire-and-forget(await 없이 호출)은
// 서버리스에서 응답 후 프로세스가 정리되며 요청이 잘릴 수 있어 쓰지 않는다.

const TIMEOUT_MS = 3000;

export async function notifySlack(text) {
  const url = process.env.SLACK_NOTIFY_WEBHOOK_URL;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // 본문에 실패 이유가 담긴다(예: invalid_token, channel_not_found).
      const body = await res.text().catch(() => "");
      console.error(`[notify] Slack ${res.status}: ${body.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[notify] Slack 전송 실패: ${e.message}`);
    return false;
  }
}
