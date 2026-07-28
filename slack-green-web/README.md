# slack-green-web (랜딩 + 대시보드)

AlwaysGreen 웹앱. Next.js(App Router) 기반. 랜딩페이지 + 대시보드 + 연결 관리 API.

## 로컬 실행 (세팅 0으로 바로)

```bash
npm install
npm run dev          # http://localhost:3000
```

Supabase 환경변수가 없으면 자동으로 **로컬 파일 모드**(`.data/connections.json`)로
동작해서 세팅 없이 바로 대시보드를 써볼 수 있다. 인증도 마찬가지로
`NEXT_PUBLIC_SUPABASE_*`가 없으면 **단일 개발 사용자**(`DEV_USER_ID`)로 폴백한다.
(단, `npm start`처럼 `NODE_ENV=production`이면 `APP_ENCRYPTION_KEY`가 필수이고,
인증 미설정 시엔 폴백하지 않고 에러를 낸다 — 전원이 한 계정을 공유하는 사고 방지.)

## 구조

```
src/middleware.js         세션 갱신 + /dashboard 보호
src/app/
  page.js                 랜딩페이지 (CTA → /login)
  login/page.js           가입·로그인 (Google OAuth)
  auth/callback/route.js  OAuth 리다이렉트 → 세션 쿠키 교환
  auth/signout/route.js   로그아웃
  dashboard/page.js       서버 컴포넌트 — 세션 확인
  dashboard/dashboard-client.js  대시보드 UI (연결 추가/스케줄/토글/삭제)
  api/connections/        REST API (GET/POST, PATCH/DELETE) — 전부 401 가드
src/lib/
  db.js               데이터 계층 — Supabase or 로컬 파일 자동 선택 (service_role)
  crypto.js           토큰 AES-256-GCM 암복호화 + 마스킹
  auth.js             세션에서 user.id 추출 + requireUserId() 가드
  supabase-auth.js    서버/미들웨어용 Auth 클라이언트 (anon 키 + 쿠키)
  supabase-browser.js 브라우저용 Auth 클라이언트
supabase/schema.sql   웹앱 + 워커가 공유하는 테이블 스키마 + RLS 정책
DESIGN.md             Verdana Health 디자인 시스템 (globals.css가 이걸 구현)
```

### 인증과 데이터 접근은 키가 다르다

| | 키 | 쓰는 곳 |
|---|---|---|
| 인증 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (공개 OK) | 브라우저·미들웨어·서버, 쿠키 세션 |
| 데이터 | `SUPABASE_SERVICE_ROLE_KEY` (절대 노출 금지) | 서버 전용, `user_id`로 직접 스코핑 |

서버는 service_role로 RLS를 우회해 워커와 같은 테이블을 다루고, RLS 정책은
anon 키로 오는 직접 접근에 대한 2차 방어선이다.

## 가입 → 체험 흐름

```
랜딩 CTA → /login → Google 동의 → /auth/callback
                                    ├─ 세션 쿠키 발급
                                    └─ subscriptions row 생성 = 14일 체험 시작
        → /dashboard
```

체험 기간은 `user_id` 기준으로만 추적된다. **가입이 먼저 있어야** 누가 며칠째
체험 중인지 판정할 수 있다 (`lib/db.js`의 `getOrCreateSubscription`).

체험 시작 시점은 **가입(첫 로그인) 순간**이다. `getOrCreateSubscription`은
이미 row가 있으면 그대로 반환하므로 재로그인해도 기간이 리셋되지 않는다.
콜백에서 생성이 실패해도 로그인은 진행되고, 대시보드의 `/api/subscription`이
다음 요청에서 다시 시도한다(이중 안전장치).

## 배포 전 필수 (읽고 넘어가지 말 것)

1. **Google 로그인 설정** — 아래 "Supabase Auth" 절 참고. `NEXT_PUBLIC_SUPABASE_*`
   없이 프로덕션 배포하면 앱이 시작 시 에러를 낸다(의도된 동작).
2. **`APP_ENCRYPTION_KEY` 설정** — 없으면 프로덕션에서 크립토가 예외를 던진다.
   웹앱과 워커가 **동일한 키**를 공유해야 한다.
3. **RLS 켜기** — `supabase/schema.sql` 하단 정책까지 실행할 것.

---

# 🚀 배포 가이드 (3-조각 아키텍처)

```
[웹: Vercel]  ──write──▶  [DB: Supabase]  ◀──read──  [워커: Railway]
 랜딩+대시보드            connections 테이블         WebSocket 상시 유지
```

**왜 웹과 워커를 나누나?** 워커는 사용자마다 WebSocket을 "계속 열어둬야" 한다.
Vercel 같은 서버리스는 함수가 몇 초 뒤 종료되므로 이 일을 못 한다. 그래서
상시 실행되는 프로세스(Railway/Fly.io/VPS)가 따로 필요하다.

## 1. Supabase (DB) — 먼저

1. supabase.com에서 프로젝트 생성 (서울 리전 권장)
2. SQL Editor에 `supabase/schema.sql` 붙여넣고 실행
3. Project Settings → API 에서 세 값 복사:
   - `Project URL` → `SUPABASE_URL` **및** `NEXT_PUBLIC_SUPABASE_URL` (같은 값)
   - `anon` 공개 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 시크릿 키 → `SUPABASE_SERVICE_ROLE_KEY` (절대 클라이언트 노출 금지)

## 1-b. Supabase Auth — Google 로그인

1. **Google Cloud Console** → APIs & Services → Credentials → *OAuth client ID*
   (Application type: Web application)
   - Authorized redirect URI 에 Supabase 콜백 주소를 넣는다:
     `https://<프로젝트ref>.supabase.co/auth/v1/callback`
   - 발급된 Client ID / Client Secret 복사
2. **Supabase** → Authentication → Providers → **Google** 활성화 후 위 두 값 붙여넣기
3. **Supabase** → Authentication → URL Configuration
   - Site URL: `https://<배포도메인>`
   - Redirect URLs 에 추가:
     ```
     https://<배포도메인>/auth/callback
     http://localhost:3000/auth/callback     # 로컬 테스트용
     ```

> 로컬에서 실제 Google 로그인을 테스트하려면 `.env.local` 에
> `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 넣으면 된다.
> 넣지 않으면 로그인 화면이 "로컬 개발 모드"로 표시되고 단일 `DEV_USER_ID` 로 동작한다.

## 2. Vercel (웹) — 랜딩 + 대시보드

1. 이 `slack-green-web` 폴더를 Vercel에 임포트 (Framework: Next.js 자동 감지)
2. Environment Variables 등록:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=...        # SUPABASE_URL과 같은 값
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   APP_ENCRYPTION_KEY=...   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Deploy. Node 20런타임 권장(package.json engines).

## 3. Railway (워커) — presence 유지

1. railway.app에서 새 프로젝트 → `slack-presence-worker` 폴더 배포
   (또는 Fly.io / 가장 저렴하게는 소형 VPS + pm2/systemd)
2. Start command: `npm start`
3. Environment Variables — **APP_ENCRYPTION_KEY는 Vercel과 반드시 동일하게**:
   ```
   DATA_BACKEND=supabase
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   APP_ENCRYPTION_KEY=...    # ← Vercel과 같은 값
   NODE_ENV=production
   ```
4. 워커는 웹서버가 아니므로 포트가 필요 없다(헬스체크 끄거나 무시).

## 배포처 요약

| 조각 | 추천 | 이유 | 대략 비용 |
|---|---|---|---|
| 웹 | **Vercel** | Next.js 무설정 배포, 무료 티어로 시작 | $0~ |
| DB | **Supabase** | Postgres+Auth 한 번에, 무료 티어 | $0~ |
| 워커 | **Railway** | 상시 프로세스, 배포 간단 | ~$5/월 |
| (대안) 워커 | Fly.io / VPS(Vultr·라이트세일) | 더 저렴/유연, 관리 부담↑ | ~$4/월 |

> 워커는 **동시 연결 수 = 열려있는 WebSocket 수**라 사용자가 늘면 메모리가
> 선형 증가한다. 초기엔 소형 인스턴스 1개로 충분하고, 커지면 사용자 샤딩(워커
> 여러 대가 user_id 범위를 나눠 맡기)으로 수평 확장한다.

---

# 💳 구독 / 결제 (14일 체험 → 유료전환)

## 모델

```
가입/첫 진입 → 14일 무료 체험(trialing) → 만료
                                          ├─ 구독함 → active (매월 자동결제)
                                          └─ 안 함 → 워커가 presence 정지(초록불 OFF)
```

- **자격 판정**은 `lib/entitlement.js` + `worker/src/entitlement.js`(동일 규칙)에 있다.
  `trialing`이고 체험 안 끝났거나, `active`이고 결제주기 안 끝났으면 "자격 있음".
- **워커가 강제한다**: `SupabaseStore.loadConnections`가 `subscriptions`를 join해서
  자격 없는 사용자의 연결은 아예 로드하지 않는다 → 체험/구독이 끝나면 초록불이 꺼진다.

## 결제 흐름 (포트원 V2 정기결제)

1. 대시보드에서 사용자가 **Pro 구독** 클릭
2. (프로덕션) 브라우저 PortOne SDK로 카드 등록 → **빌링키** 발급
3. `POST /api/billing/checkout` — 빌링키로 첫 결제 청구 + `status=active`, `current_period_end=+1개월`
4. 매일 `POST /api/billing/run-renewals`(Vercel Cron)가 주기 지난 구독을 **자동 청구**
5. `POST /api/billing/webhook` — 포트원 결제 결과 통보 → 상태 갱신(active/past_due/canceled)

## 로컬 테스트 (mock)

`MOCK_BILLING=1`(또는 `PORTONE_API_SECRET` 미설정)이면 실제 청구 없이 전체 흐름이
돈다. 카드 등록/빌링키 없이 `checkout`이 바로 `active`로 전환된다.

## 프로덕션 전환 체크리스트

- 포트원 가입 → StoreID / API Secret / 채널키 발급, `.env`에 세팅, `MOCK_BILLING=0`
- 대시보드 `subscribe()`의 TODO 위치에 PortOne 브라우저 SDK(`requestIssueBillingKey`) 연동
- `CRON_SECRET` 설정 → Vercel Cron이 `Authorization: Bearer` 로 호출 (`vercel.json`에 등록됨)
- `webhook`의 서명 검증을 `@portone/server-sdk`로 강화

## 흐름 정리

1. 사용자가 대시보드에서 (또는 Phase 2 브라우저 확장이 자동으로) 토큰 등록
   → 웹이 **암호화**해서 Supabase `connections`에 저장
2. 워커가 그 테이블을 읽어 **복호화** → 스케줄에 맞춰 WebSocket 연결/해제
3. 워커가 연결 상태(active/error 등)를 테이블에 다시 기록
   → 대시보드가 그 상태를 표시
