// 백그라운드 서비스 워커.
//  1) HttpOnly인 `d` 쿠키를 chrome.cookies API로 읽는다 (JS로는 불가능한 부분).
//  2) 콘텐츠 스크립트가 넘긴 xoxc + 이 쿠키를 합쳐 Green Bean API로 전송한다.
//
// host_permissions 덕분에 확장에서의 크로스오리진 fetch는 CORS 제약을 받지 않는다.
// credentials:"include"로 웹앱 세션 쿠키를 함께 보내므로, 웹앱에 Supabase Auth가
// 붙으면 자동으로 "그 로그인한 사용자"의 연결로 저장된다.

// 고정값. manifest host_permissions 에 등록된 주소로만 요청이 나갈 수 있으므로
// 사용자가 바꿀 수 있게 해봐야 의미가 없다. popup.js 의 API_BASE 와 같은 값.
const API_BASE = "https://green-bean-nu.vercel.app";

async function getDCookie() {
  // `d` 쿠키는 도메인 .slack.com, HttpOnly. url만 맞으면 값을 그대로 돌려준다.
  const cookie = await chrome.cookies.get({ url: "https://app.slack.com", name: "d" });
  return cookie ? cookie.value : null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "CONNECT") return false;

  (async () => {
    try {
      const xoxd = await getDCookie();
      if (!xoxd) {
        sendResponse({
          ok: false,
          error: "d 쿠키를 찾지 못했습니다. Slack에 로그인되어 있는지 확인하세요.",
        });
        return;
      }

      const res = await fetch(`${API_BASE}/api/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          teamName: msg.teamName,
          xoxc: msg.xoxc,
          xoxd,
          schedule: msg.schedule,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        sendResponse({ ok: false, error: data.error || `HTTP ${res.status}` });
        return;
      }
      sendResponse({ ok: true, item: data.item });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();

  return true; // 비동기 응답
});
