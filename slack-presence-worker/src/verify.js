// 라이브 presence 검증 스크립트 (일회성 실증용).
//
// 이제 프로덕션과 동일한 PresenceKeeper(재연결 + heartbeat + 선제 재연결)를
// 그대로 사용한다. 따라서 이 스크립트로 "2시간 벽"을 넘겨 장시간 유지되는지까지
// 검증할 수 있다.
//
// 실행:
//   export SLACK_XOXC='xoxc-...'
//   export SLACK_XOXD='xoxd-...'
//   node src/verify.js

import { authTest, getPresence } from "./slackClient.js";
import { PresenceKeeper } from "./PresenceKeeper.js";
import { log } from "./logger.js";

const xoxc = process.env.SLACK_XOXC;
const xoxd = process.env.SLACK_XOXD;

if (!xoxc || !xoxd) {
  console.error("SLACK_XOXC, SLACK_XOXD 환경변수가 필요합니다.");
  process.exit(1);
}

let keeper = null;

async function main() {
  let me;
  try {
    me = await authTest(xoxc, xoxd);
  } catch (e) {
    console.error(`❌ 인증 실패: ${e.slackError || e.message}`);
    console.error("   → 토큰/쿠키가 잘못됐거나 만료됐습니다. 다시 추출하세요.");
    process.exit(1);
  }
  log("verify", `✅ 인증 성공 — ${me.user} (${me.user_id}) @ ${me.team}`);

  const before = await getPresence(xoxc, xoxd, me.user_id);
  log("verify", `소켓 열기 전 presence = ${before.presence}`);
  log("verify", "👉 다른 Slack 앱/브라우저 탭을 모두 종료한 뒤 지켜보세요.");
  log("verify", "   (재연결/heartbeat 포함 — 장시간(2h+) 유지되는지 확인용)");

  const conn = { id: "verify", teamName: me.team, xoxc, xoxd, schedule: null };
  keeper = new PresenceKeeper(conn, (_id, st) => {
    if (st.status) {
      log("verify", `status → ${st.status}${st.error ? " (" + st.error + ")" : ""}`);
    }
    if (st.lastPresence) {
      const mark = st.lastPresence === "active" ? "🟢" : "⚪️";
      log("verify", `${mark} presence = ${st.lastPresence}`);
    }
  });
  keeper.start();
}

process.on("SIGINT", async () => {
  log("verify", "종료합니다.");
  if (keeper) await keeper.stop();
  process.exit(0);
});

main();
