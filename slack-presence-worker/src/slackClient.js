// Slack Web API access using a browser session credential pair:
//   xoxc  — web client token (form field `token`)
//   xoxd  — the `d` cookie value (sent as a Cookie header)
// This is the same credential the real Slack web client uses, which is why it
// can hold a genuine "active" presence — unlike an OAuth bot/app token.

const SLACK_API = "https://slack.com/api";

export async function callSlack(method, xoxc, xoxd, params = {}) {
  const body = new URLSearchParams({ token: xoxc, ...params });

  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      // The web client presents the session via the `d` cookie.
      Cookie: `d=${xoxd}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Slack API ${method} HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json.ok) {
    const err = new Error(`Slack API ${method} failed: ${json.error}`);
    err.slackError = json.error; // e.g. "invalid_auth", "token_revoked", "rtm_disabled"
    throw err;
  }
  return json;
}

// Confirms the credential is valid; returns { user_id, user, team, team_id, url }.
export const authTest = (xoxc, xoxd) => callSlack("auth.test", xoxc, xoxd);

// Opens an RTM session; returns { url } — the websocket endpoint to connect to.
// The live websocket connection is what Slack reads as an active client.
export const rtmConnect = (xoxc, xoxd) =>
  callSlack("rtm.connect", xoxc, xoxd, { batch_presence_aware: "false" });

// Reads presence for verification/observability. presence = "active" | "away".
export const getPresence = (xoxc, xoxd, user) =>
  callSlack("users.getPresence", xoxc, xoxd, user ? { user } : {});

// ⚠️ 사용 안 함. users.setActive 는 2018년 폐기되어 지금은 no-op(성공만 반환).
// presence 유지는 오직 열린 WebSocket으로만 이뤄진다. 참고용으로만 남겨둠.
export const setActive = (xoxc, xoxd) => callSlack("users.setActive", xoxc, xoxd);
