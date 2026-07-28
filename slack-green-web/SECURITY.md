# 보안 점검 (2026-07-28)

Slack 자격증명·결제 정보를 다루므로 배포 전 점검한 내역.

## 통과 항목 ✅

- **토큰/시크릿 로깅 없음** — 코드 전역에서 xoxc/xoxd/enc_/billing_key/secret 을
  로그로 찍는 곳 없음.
- **시크릿 클라이언트 미노출** — service_role 키·API 시크릿·암호화 키·웹훅 시크릿
  중 어느 것도 `NEXT_PUBLIC_` 로 노출되지 않음. `db.js`(service_role)는 서버
  라우트/서버 컴포넌트에서만 import됨.
- **인증** — `getUser()`(Auth 서버 검증) 사용, `getSession()`(쿠키 신뢰) 미사용.
  미들웨어가 세션 갱신 + /dashboard 보호. 콜백은 오픈 리다이렉트 방어(내부 경로만).
- **자격증명 암호화** — xoxc/xoxd/billing_key 는 AES-256-GCM으로 암호화 저장.
  프로덕션에서 `APP_ENCRYPTION_KEY` 미설정 시 크립토가 예외를 던져 평문 저장 차단.
- **RLS** — connections/subscriptions 에 Row Level Security + 본인 행 정책.
  구독은 select만 허용(클라이언트가 체험연장/active 조작 불가), 변경은 service_role만.
- **크론 보호** — `/api/billing/run-renewals` 는 CRON_SECRET(Bearer/헤더)로 보호.
- **`.env` gitignore** 확인.

## 이번에 고친 것 🔧

- **포트원 웹훅 서명 검증** — 기존엔 공유 시크릿 헤더 비교(스텁)였음. standard-webhooks
  규격(HMAC-SHA256 + `webhook-id/timestamp/signature`)으로 교체하고, 파싱 전 원문(raw
  body) 기반으로 검증 + 타임스탬프 5분 신선도 검사(재전송 방지) + 상수시간 비교.
  단위 테스트 4종(유효/변조/만료/본문변조) 통과.

## 남은 권고 (배포 후 우선순위) ⚠️

- **레이트 리밋** — `/api/connections` POST 에 사용자당 연결 수/속도 제한 없음.
  악용 시 대량 연결 생성 가능. Vercel/Upstash 레이트리밋 또는 DB 카운트 상한 권장.
- **에러 메시지 노출** — Slack API 원본 에러를 대시보드에 그대로 표시. 민감도 낮지만
  프로덕션에선 사용자 친화 메시지로 매핑 권장.
- **키 로테이션 절차** — `APP_ENCRYPTION_KEY` 교체 시 재암호화 마이그레이션 필요.
  현재 단일 키. 키 버전 태깅을 고려.
