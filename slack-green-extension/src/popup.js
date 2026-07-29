const wsEl = document.getElementById("workspaces");
const statusEl = document.getElementById("status");
const dashLink = document.getElementById("dashLink");

// background.js의 API_BASE와 반드시 같은 값. 사용자가 바꿀 수 없는 고정값이다 —
// manifest host_permissions에 없는 주소로는 어차피 요청이 못 나가므로, 입력받아
// 봐야 잘못 넣으면 조용히 실패할 뿐이다.
const API_BASE = "https://green-bean-nu.vercel.app";

const DEFAULT_SCHEDULE = {
  timezone: "Asia/Seoul",
  days: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "18:00",
};

function init() {
  dashLink.href = `${API_BASE}/dashboard`;
  loadWorkspaces();
}

async function loadWorkspaces() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/[^/]*\.slack\.com/.test(tab.url || "")) {
    wsEl.innerHTML = `<div class="empty">Slack 웹(app.slack.com) 탭에서 열어주세요.</div>`;
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "GET_WORKSPACES" }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      wsEl.innerHTML = `<div class="empty">Slack 페이지를 새로고침한 뒤 다시 열어주세요.</div>`;
      return;
    }
    if (!resp.ok) {
      wsEl.innerHTML = `<div class="empty">${escapeHtml(resp.error)}</div>`;
      return;
    }
    render(resp.workspaces);
  });
}

function render(list) {
  wsEl.innerHTML = "";
  for (const w of list) {
    const row = document.createElement("div");
    row.className = "ws";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = w.teamName || w.teamId || "Slack";
    const url = document.createElement("div");
    url.className = "url";
    url.textContent = w.url || "";
    info.append(name, url);

    const btn = document.createElement("button");
    btn.textContent = "연결";
    btn.addEventListener("click", () => connect(w, btn));

    row.append(info, btn);
    wsEl.appendChild(row);
  }
}

function connect(w, btn) {
  btn.disabled = true;
  btn.textContent = "연결 중…";
  setStatus("");

  chrome.runtime.sendMessage(
    {
      type: "CONNECT",
      teamName: w.teamName,
      xoxc: w.xoxc,
      schedule: DEFAULT_SCHEDULE,
    },
    (resp) => {
      if (resp && resp.ok) {
        btn.textContent = "연결됨 ✓";
        setStatus("연결 완료! 대시보드에서 근무시간을 조정하세요.", "ok");
      } else {
        btn.disabled = false;
        btn.textContent = "연결";
        setStatus("실패: " + (resp && resp.error ? resp.error : "알 수 없는 오류"), "err");
      }
    }
  );
}

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

init();
