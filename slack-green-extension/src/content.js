// *.slack.com 페이지에서 실행. 콘텐츠 스크립트는 페이지와 같은 origin의
// localStorage에 접근할 수 있으므로, 여기서 워크스페이스별 xoxc 토큰을 읽는다.
// (xoxd `d` 쿠키는 HttpOnly라 여기서 못 읽는다 → background.js가 담당.)

const XOXC_RE = /xoxc-[0-9]+-[0-9]+-[0-9]+-[0-9a-f]+/i;

function fromLocalConfig() {
  const raw = localStorage.getItem("localConfig_v2");
  if (!raw) return null;
  const cfg = JSON.parse(raw);
  const teams = cfg && cfg.teams ? cfg.teams : {};
  return Object.values(teams)
    .map((t) => ({
      teamId: t.id,
      teamName: t.name || t.team_name,
      url: t.url || t.domain,
      xoxc: t.token,
    }))
    .filter((t) => t.xoxc && t.xoxc.startsWith("xoxc-"));
}

// 폴백: Slack이 저장 위치를 바꾼 경우, localStorage 전체를 훑어 xoxc 토큰을 찾는다.
function scanFallback() {
  const found = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const val = localStorage.getItem(key) || "";
    const m = val.match(XOXC_RE);
    if (m) found.push({ teamId: key, teamName: "Slack Workspace", url: "", xoxc: m[0] });
  }
  return found;
}

function readWorkspaces() {
  try {
    let list = fromLocalConfig();
    if (!list || list.length === 0) list = scanFallback();
    if (!list || list.length === 0) {
      return {
        ok: false,
        error: "Slack 세션을 찾지 못했습니다. app.slack.com에 로그인된 상태인지 확인 후 새로고침하세요.",
      };
    }
    // 중복 토큰 제거
    const seen = new Set();
    const unique = list.filter((w) => (seen.has(w.xoxc) ? false : seen.add(w.xoxc)));
    return { ok: true, workspaces: unique };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "GET_WORKSPACES") {
    sendResponse(readWorkspaces());
  }
  return true;
});
