# slack-presence-worker (Phase 1 코어 워커)

Slack에서 자리를 비워도 상태를 **초록불(active)** 로 유지시키는 서비스의 심장.
사용자별로 RTM WebSocket 연결을 상시 열어두고, 스케줄(근무시간/타임존)에 따라
자동으로 연결을 켜고 끈다.

## 동작 원리

- Slack Web API의 `users.setPresence`는 `active`를 강제할 수 없다 (Slack이 막아둠).
- 대신 **웹 클라이언트와 동일한 자격증명(xoxc 토큰 + `d` 쿠키)** 으로 RTM
  WebSocket을 열면, Slack이 "활성 클라이언트 접속 중"으로 판단해 초록불이 유지된다.
- 보조로 `users.setActive`를 주기적으로 호출해 auto-away 타이머를 리셋한다.
- `users.getPresence`로 자기 자신의 presence를 주기적으로 조회해 로그로 검증한다.

## 구조

```
src/
  slackClient.js    Slack Web API 호출 (xoxc + xoxd)
  PresenceKeeper.js 연결 1개 담당: WS open + ping + setActive + presence 체크 + 재연결
  KeeperManager.js  연결 N개 관리: 매 분 스케줄 재평가 → connect/disconnect
  schedule.js       근무시간/타임존/요일 판정 (Intl 기반, 오버나잇 지원)
  store.js          데이터 소스 추상화 (지금은 JSON 파일 → Phase 3에서 Supabase로 교체)
  index.js          진입점 + graceful shutdown
```

`store.js`의 인터페이스(`loadConnections()`, `setState()`)만 유지하면,
Phase 3에서 이 파일만 Supabase 구현으로 갈아끼우면 된다.

## 실행

```bash
npm install
cp connections.example.json connections.json   # 실제 토큰 입력 (gitignore됨)
npm start
```

## 토큰 얻는 법 (임시 — Phase 2에서 브라우저 확장이 자동화)

브라우저에서 Slack 웹(app.slack.com)에 로그인한 상태로:

1. **xoxc 토큰** — DevTools 콘솔에서:
   ```js
   JSON.parse(localStorage.localConfig_v2).teams
   ```
   워크스페이스별 객체의 `token` 값 (`xoxc-...`).

2. **xoxd 쿠키** — DevTools → Application → Cookies → `https://app.slack.com`
   → 이름이 `d`인 쿠키의 Value (`xoxd-...`).

> ⚠️ 이 자격증명은 사실상 해당 계정의 Slack 전체 접근 권한이다. 로컬에서만 쓰고,
> 프로덕션에서는 반드시 암호화 저장 + 최소권한 원칙을 지킬 것.

## 알려진 실패 케이스

- `rtm_disabled` / `rtm.connect` 에러 → 해당 워크스페이스가 RTM을 막아둔 경우.
  Enterprise Grid 등에서 발생 가능. (대체 접근 필요 — 향후 과제)
- `invalid_auth` / `token_revoked` → 토큰 만료. Phase 2에서 자동 갱신 필요.

## 주의 (사업적)

자동 presence 유지는 Slack ToS 회색지대다. 계정 정지 가능성을 유저에게 고지하고,
토큰은 반드시 암호화 저장할 것.
