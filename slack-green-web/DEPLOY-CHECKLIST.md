# AlwaysGreen 배포 체크리스트 (사람이 손으로 해야 하는 것들)

코드는 다 있고, 여기 적힌 건 **콘솔에서 클릭해야 하는 일**들이다.
각 단계 끝에 "검증"과 "터지는 지점"이 있으니 그것까지 확인하고 넘어갈 것.

## 진행 순서 (중요)

```
0. GitHub 저장소 만들기        ← 없으면 Vercel/Railway 시작 불가
3. Supabase 프로젝트 + 스키마
6. APP_ENCRYPTION_KEY 생성     ← 7·8에서 둘 다 필요하므로 먼저
7. Vercel 배포 → 도메인 확보
4. Google OAuth 설정           ← 7의 도메인이 있어야 함
8. Railway 배포 (워커)
9. 크롬 웹스토어 등록          ← 7의 도메인이 있어야 manifest 수정 가능
```

원래 표의 4번을 7번보다 먼저 하면 Site URL을 몰라서 되돌아와야 한다.

체크리스트 진행 중 값은 여기 임시로 모아두면 편하다 (**커밋 금지**):

```
SUPABASE_PROJECT_REF   = ____________________   (예: abcdefghijklmno)
SUPABASE_URL           = https://____.supabase.co
SUPABASE_ANON_KEY      = ____________________
SUPABASE_SERVICE_ROLE  = ____________________   ← 절대 노출 금지
APP_ENCRYPTION_KEY     = ____________________   ← Vercel·Railway 동일값
CRON_SECRET            = ____________________
APP_DOMAIN             = https://____________
GOOGLE_CLIENT_ID       = ____________________
GOOGLE_CLIENT_SECRET   = ____________________
EXTENSION_URL          = ____________________   (9단계 후)
```

---

# 0. GitHub 저장소 (선행 필수)

현재 `slack-green-web`, `slack-presence-worker`, `slack-green-extension` 모두 git
저장소가 아니다. Vercel·Railway는 GitHub 연결로 배포하므로 먼저 만들어야 한다.

**모노레포 1개를 권장한다.** 이유: `supabase/schema.sql`과 `entitlement.js`(웹/워커에
같은 규칙이 중복 존재)를 한 커밋으로 같이 바꿀 수 있다. 저장소를 나누면 웹만 배포하고
워커를 잊는 실수가 반드시 한 번은 난다.

```bash
cd /Users/sia/01_SourceCodes/02_SideProjects
mkdir alwaysgreen
mv slack-green-web slack-presence-worker slack-green-extension alwaysgreen/
cd alwaysgreen
git init -b main
git add -A
git status                      # ← node_modules / .env / .data / dist 가 없는지 눈으로 확인
git commit -m "AlwaysGreen 초기 커밋 (웹 + 워커 + 확장)"
gh repo create alwaysgreen --private --source=. --push
```

- 각 폴더에 `.gitignore`는 이미 있다(`node_modules/`, `.env*`, `.data/`, `connections.json`, `dist/`).
- `gh`가 없으면 github.com에서 **Private** 저장소를 만들고 `git remote add origin ... && git push -u origin main`.
- **Private로 만들 것.** 코드에 키는 없지만 회색지대 툴이라 공개 저장소로 둘 이유가 없다.

**검증:** GitHub 웹에서 3개 폴더가 보이고, `node_modules`와 `.env`는 안 보인다.

**터지는 지점:** `git status`에 `node_modules`가 잡히면 폴더를 옮기며 `.gitignore`가
빠진 것 — 커밋 전에 확인. 이미 커밋했다면 `git rm -r --cached node_modules`.

---

# 3. Supabase 프로젝트 + 스키마

## 3-1. 프로젝트 생성

1. https://supabase.com → 로그인 → **New project**
2. 입력값:
   - Name: `alwaysgreen`
   - Database Password: 강한 비밀번호 → **비밀번호 관리자에 저장**
     (지금 코드는 안 쓰지만 나중에 psql/마이그레이션에 필요하고, 재확인이 불가하다)
   - Region: **Northeast Asia (Seoul)** — 사용자가 한국이고 워커도 지연이 적을수록 좋다
   - Plan: Free로 시작
3. 프로비저닝 1~2분 대기

## 3-2. 스키마 실행

1. 왼쪽 **SQL Editor** → **New query**
2. `slack-green-web/supabase/schema.sql` **전체**를 복사해 붙여넣기
3. **Run** (⌘+Enter)
4. `Success. No rows returned` 확인

이 파일은 테이블 2개(`connections`, `subscriptions`) + 인덱스 + `updated_at` 트리거 +
**RLS 정책**까지 한 번에 만든다. 파일 아래쪽 RLS 부분을 자르지 말고 통째로 실행할 것.

## 3-3. 키 3개 복사

**Project Settings → API** (또는 최신 대시보드에서는 **API Keys**):

| 대시보드 표기 | 넣을 곳 |
|---|---|
| Project URL | `SUPABASE_URL` **그리고** `NEXT_PUBLIC_SUPABASE_URL` (같은 값) |
| `anon` / `public` (신규 UI에선 `publishable`, `sb_publishable_...`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / `secret` (신규 UI에선 `sb_secret_...`) | `SUPABASE_SERVICE_ROLE_KEY` |

- **anon 키는 브라우저에 노출돼도 되는 키다** (RLS가 방어선). 반면 `service_role`은
  RLS를 전부 우회하므로 노출되면 전 사용자 토큰이 털린다. 절대 `NEXT_PUBLIC_` 접두사를
  붙이지 말 것.
- 프로젝트 ref(URL의 서브도메인, 예: `abcdefghijklmno`)도 적어둘 것 — 4단계에서 쓴다.

**검증:** Table Editor에 `connections`, `subscriptions`가 있고 두 테이블 모두 **RLS
enabled** 배지가 붙어 있다.

**터지는 지점:**
- Free 플랜은 **7일간 활동이 없으면 프로젝트를 일시정지**시킨다. 출시 후에는 워커가 계속
  읽으니 문제없지만, 배포 전에 며칠 방치하면 대시보드에서 Restore를 눌러야 한다.
- `anon`과 `service_role`을 뒤바꿔 넣으면 증상이 애매하다(로그인은 되는데 데이터가 안
  보이거나, 반대로 남의 데이터가 보임). 붙여넣기 후 값 앞부분을 한 번 더 대조할 것.

---

# 6. APP_ENCRYPTION_KEY 생성

Slack 자격증명(xoxc/xoxd)을 AES-256-GCM으로 암호화하는 키. 웹이 암호화해서 DB에 넣고
워커가 복호화해서 쓰므로 **양쪽이 완전히 같은 값**이어야 한다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- 결과는 **hex 64자**. 다른 형식(base64, 짧은 문자열)을 넣으면 프로덕션에서 크립토가
  예외를 던진다.
- 비밀번호 관리자에 저장. 커밋 금지.
- **CRON_SECRET**도 지금 같은 방법으로 하나 더 생성해두면 7단계에서 바로 쓴다.

**터지는 지점 (가장 흔한 사고):**
- Vercel과 Railway 값이 한 글자라도 다르면 → 웹에서는 연결이 정상 저장되는데 워커가
  복호화 실패로 전부 error 상태가 된다. 증상이 "왜 초록불이 안 켜지지"로 나타나서
  원인 찾기가 오래 걸린다. **복사-붙여넣기로만 넣고, 앞 6자·뒤 6자를 대조할 것.**
- 키를 나중에 교체하면 **기존에 저장된 모든 토큰이 복호화 불가**가 된다(사용자 전원
  재연결 필요). 처음에 잘 만들어 두고 바꾸지 않는 게 맞다.

---

# 7. Vercel 배포 (웹)

## 7-1. 프로젝트 임포트

1. https://vercel.com → **Add New → Project** → GitHub 저장소(`alwaysgreen`) 선택
2. **Root Directory**: `slack-green-web` ← 모노레포이므로 반드시 지정
3. Framework Preset: Next.js (자동 감지됨). Build/Output은 기본값 그대로.

## 7-2. 환경변수 등록

Environment Variables에 아래를 넣는다. 스코프는 Production·Preview 둘 다 체크.

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co        # 위와 같은 값
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon 키>
APP_ENCRYPTION_KEY=<6단계 hex 64자>
TRIAL_DAYS=14
PLAN_PRICE_KRW=4900
CRON_SECRET=<6단계에서 만든 두 번째 값>
MOCK_BILLING=1
```

`NEXT_PUBLIC_EXTENSION_URL`은 9단계 후에 추가한다(없으면 `/guide`가 "곧 제공"으로 표시).

**주의 2가지:**
- `NEXT_PUBLIC_*`는 **빌드 시점에 코드에 박힌다.** 값을 바꾸면 반드시 Redeploy해야
  적용된다(런타임 반영 안 됨).
- `MOCK_BILLING=1`은 **결제 없이 구독 버튼만 눌러도 `active`가 되는 상태**다. 포트원
  연동 전 임시로만 두고, 외부 사용자를 받기 전에 `MOCK_BILLING=0` + 포트원 키로 바꿔야
  한다. 그 전에는 링크가 아는 사람에게만 공개돼야 한다.

## 7-3. 배포 & 도메인

1. **Deploy** → 성공 후 `https://<프로젝트>.vercel.app` 확보 → 위 메모의 `APP_DOMAIN`에 기록
2. 커스텀 도메인을 쓸 거라면 **지금 붙여라.** 4·9단계에 도메인이 박히므로 나중에 바꾸면
   Google 콘솔·Supabase·확장 manifest를 다시 손봐야 한다.

## 7-4. Cron 확인

`vercel.json`에 이미 등록돼 있다(`/api/billing/run-renewals`, 매일 03:00 UTC = 12:00 KST).

- Vercel Dashboard → **Settings → Cron Jobs**에 잡이 보이는지 확인
- Hobby 플랜은 **하루 1회 크론만** 허용 — 현재 설정이 정확히 그 조건이다
- 크론은 **Production 배포에만** 붙는다
- `CRON_SECRET`이 설정돼 있으면 Vercel이 `Authorization: Bearer <CRON_SECRET>`를
  자동으로 붙여 호출한다 (라우트가 그걸 검사한다)

**검증 (이 시점에 되는 것 / 안 되는 것):**
- `https://<도메인>/` 랜딩 표시 ✅
- `https://<도메인>/privacy` 표시 ✅ ← 9단계 심사에 이 URL이 필요하다
- `https://<도메인>/guide` 표시 ✅
- `/login` → Google 버튼은 보이지만 **누르면 실패한다** ← 정상. 4단계를 안 했으니까.

**터지는 지점:**
- 배포 직후 사이트가 500이면 대개 `NEXT_PUBLIC_SUPABASE_*` 누락이다. 프로덕션에서
  인증 미설정이면 코드가 의도적으로 에러를 던진다(전원이 한 계정을 공유하는 사고 방지).
- Root Directory를 안 잡으면 빌드가 "no Next.js detected"로 실패한다.

---

# 4. Google OAuth 설정 (로그인)

이 단계의 핵심 한 줄: **Google에 등록하는 redirect URI는 내 도메인이 아니라 Supabase
주소다.** 여기서 거의 모두가 한 번 막힌다.

## 4-1. Google Cloud Console — OAuth 동의 화면

1. https://console.cloud.google.com → 상단 프로젝트 선택기 → **새 프로젝트** `AlwaysGreen`
2. **APIs & Services → OAuth consent screen**
   - User Type: **External** → Create
   - App name: `AlwaysGreen`
   - User support email / Developer contact email: 본인 이메일
   - Scopes: **기본값 그대로**(`openid`, `email`, `profile`). 민감 스코프를 추가하지
     않으므로 Google 심사 대상이 아니다 — 추가하지 말 것.
3. **Publishing status를 "In production"으로 Publish** ← 빼먹기 쉬움
   - `Testing` 상태로 두면 **등록한 테스트 사용자(최대 100명)만** 로그인 가능하고
     발급된 세션이 7일 만에 만료된다.
   - 민감 스코프가 없으니 Publish는 즉시 적용된다(심사 대기 없음).
   - 나 혼자 테스트할 동안은 Testing + 본인 계정 test user로 둬도 된다. 남에게 링크를
     주기 전에 반드시 Publish.

## 4-2. OAuth 클라이언트 ID 발급

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**, Name: `supabase-auth`
3. **Authorized redirect URIs**에 정확히 이것 하나:
   ```
   https://<프로젝트ref>.supabase.co/auth/v1/callback
   ```
   (내 앱의 `/auth/callback`이 아니다. Supabase가 먼저 받고, 그 다음 내 앱으로 넘긴다.)
4. Create → **Client ID / Client Secret** 복사

## 4-3. Supabase에 연결

1. Supabase → **Authentication → Sign In / Providers → Google** → Enable
2. Client ID / Client Secret 붙여넣기 → **Save**
   - 이 화면에 Supabase가 "Callback URL"을 표시해준다. 4-2에 넣은 값과 **글자 단위로
     같은지** 대조할 것.

## 4-4. URL Configuration

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<APP_DOMAIN>` (Vercel 도메인 또는 커스텀 도메인)
- **Redirect URLs** (추가):
  ```
  https://<APP_DOMAIN>/auth/callback
  http://localhost:3000/auth/callback
  ```
  Vercel 프리뷰 배포에서도 로그인을 테스트하려면 와일드카드도 추가:
  ```
  https://<프로젝트명>-*.vercel.app/auth/callback
  ```

## 4-5. 검증 (이 테스트 하나로 3개가 동시에 검증된다)

1. `https://<APP_DOMAIN>/login` → **Google로 계속하기** → 동의 → `/dashboard` 도착
2. Supabase → Table Editor → **`subscriptions`** 에 row 1개 생성 확인
   - `status = trialing`, `trial_ends_at`이 **오늘 +14일**
3. 이게 통과하면 ① Google OAuth ② Supabase Auth 쿠키 세션 ③ service_role DB 쓰기 +
   체험 자동 생성이 전부 동작한다는 뜻이다.

**터지는 지점 (증상 → 원인):**

| 증상 | 원인 |
|---|---|
| `Error 400: redirect_uri_mismatch` | 4-2의 URI 오타. `https`, 프로젝트 ref, `/auth/v1/callback` 확인 |
| 로그인 후 `localhost:3000`으로 튕김 | Site URL이 localhost로 남아 있음 (4-4) |
| `requested path is invalid` | Redirect URLs에 내 도메인 `/auth/callback`이 없음 |
| `Access blocked: app not verified` / 특정 계정만 로그인 실패 | 동의 화면이 Testing 상태 (4-1의 Publish) |
| 로그인은 되는데 `subscriptions`에 row 없음 | `SUPABASE_SERVICE_ROLE_KEY` 누락/오타 (Vercel 로그 확인) |

---

# 8. Railway 배포 (워커)

워커는 사용자마다 WebSocket을 **계속 열어둬야** 하므로 서버리스로는 불가능하다. 그래서
상주 프로세스가 따로 필요하다.

## 8-1. 서비스 생성

1. https://railway.app → **New Project → Deploy from GitHub repo** → `alwaysgreen`
2. 서비스 **Settings → Root Directory**: `slack-presence-worker`
3. Start Command: `npm start` (Node는 자동 감지. `engines: node >= 18`)

## 8-2. 환경변수

```
DATA_BACKEND=supabase
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
APP_ENCRYPTION_KEY=<Vercel과 완전히 동일한 값>
NODE_ENV=production
```

- `DATA_BACKEND=supabase`를 빼면 워커가 로컬 `connections.json`을 찾는다 → 아무 일도
  안 하고 조용히 떠 있는다. **증상 없는 실패**라서 이걸 제일 조심.
- 워커는 anon 키를 쓰지 않는다(service_role로 RLS 우회).

## 8-3. Railway 설정에서 꼭 확인할 것

- **App Sleeping / Serverless를 OFF**로 둘 것. 켜져 있으면 유휴 시 컨테이너를 재우고
  WebSocket이 전부 끊긴다 = 서비스 자체가 죽는다.
- **Public Networking / 도메인 생성 불필요.** HTTP 서버가 아니다.
- **Healthcheck 설정하지 말 것.** 포트를 열지 않으므로 헬스체크를 켜면 배포가 실패한다.
- Restart Policy: `On Failure` (재시도 있게)
- 비용: Hobby ~$5/월 예상.

## 8-4. 검증 (실제 초록불까지)

1. Deploy Logs에서 `[main] using Supabase store` 확인
   → `using file store`가 보이면 `DATA_BACKEND` 미적용이다.
2. 확장 없이도 테스트 가능하다: 웹 대시보드에 xoxc/xoxd를 수동으로 넣어 연결 1개 추가
   (토큰 얻는 법은 `slack-presence-worker/README.md`)
3. 1분 내에 Railway 로그에 해당 연결의 WebSocket 연결 로그가 뜨는지
4. Supabase `connections` 테이블에서 `status`가 `pending → active`로 바뀌고
   `last_presence = active`, `last_seen_active_at`이 갱신되는지
5. Slack을 전부 종료한 다른 기기/동료 시점에서 내 아이콘이 초록인지

**터지는 지점:**
- 전 연결이 `status=error` + 복호화 에러 → `APP_ENCRYPTION_KEY` 불일치 (6단계).
- 연결은 로드되는데 아무것도 안 켜짐 → 스케줄 시간대 밖(기본 평일 09:00~18:00 KST) 또는
  체험/구독 자격 없음. 워커는 `subscriptions`를 join해 **자격 없는 사용자는 아예 로드하지
  않는다**(만료 시 초록불 자동 OFF가 의도된 동작).
- `rtm_disabled` → 해당 워크스페이스가 RTM을 막아둔 경우(Enterprise Grid 등). 코드 문제
  아니고 현재는 대응 불가.

> **미완 항목 상기:** 견고화된 재연결(75초 무트래픽 감지 / 30분 선제 재연결 / 연속 away
> 3회 강제 재연결)은 아직 **깨끗한 환경에서 2시간 이상 재검증되지 않았다.** 유료 사용자를
> 받기 전에 이 검증을 먼저 끝내는 게 맞다 — 2시간 뒤 소켓이 조용히 죽는 문제를 이미 한 번
> 실측했기 때문이다.

---

# 9. 크롬 웹스토어 등록 (Unlisted)

## 9-0. 먼저 코드 3곳을 고쳐야 한다 (도메인이 박혀 있음)

zip을 만들기 전에 필수:

1. `slack-green-extension/manifest.json` → `host_permissions`
   - `"https://YOUR-APP-DOMAIN.com/"` → **실제 도메인**으로 교체 (플레이스홀더 그대로면
     확장이 서버에 요청을 못 한다)
   - `"http://localhost:3000/"` → 스토어 제출 빌드에서는 **삭제 권장**. 심사에서 불필요한
     권한으로 지적될 수 있다.
2. `slack-green-extension/src/background.js`의 `API_DEFAULT` → 기본값을 프로덕션 도메인으로
   (지금은 `http://localhost:3000`. 그대로면 사용자가 팝업 설정에서 직접 주소를 입력해야
   하고, 안 하면 연결이 조용히 실패한다.)
3. `manifest.json`의 `version`을 `0.1.0` → 필요시 올림 (재업로드마다 반드시 올려야 함)

수정 후:
```bash
cd slack-green-extension
./build.sh                # → dist/alwaysgreen-extension-v<version>.zip
```
그리고 스토어에 올리기 전에 `chrome://extensions`에서 **압축해제 로드**로 실제 도메인
대상 동작을 한 번 확인할 것(팝업 → 연결 → 대시보드에 워크스페이스 추가).

## 9-1. 개발자 계정

1. https://chrome.google.com/webstore/devconsole → Google 계정으로 로그인
2. **최초 1회 $5** 등록비 결제 (카드)
3. 계정 정보(연락 이메일) 인증 완료

## 9-2. 아이템 생성 & 리스팅

1. **New Item** → `dist/alwaysgreen-extension-v0.1.0.zip` 업로드
2. **Store listing**
   - 설명 프레이밍: **"근무시간 상태 자동화/스케줄링 도구"**.
     "Slack 우회", "속임", "감시 회피" 같은 표현은 반려 사유가 된다.
   - 스크린샷: **1280×800 또는 640×400, 최소 1장** (팝업 + 대시보드 화면 권장)
   - 아이콘 128px: `icons/icon128.png` 있음
   - 상표 고지 한 줄 추가: "Slack은 Slack Technologies의 상표이며 본 확장은 Slack과
     무관합니다."
3. **Privacy practices** 탭 (여기서 대부분 반려된다 — 성실히 작성)
   - **Single purpose**: "사용자가 이미 로그인한 Slack 워크스페이스의 자격증명을 사용자의
     명시적 클릭으로 본인의 AlwaysGreen 계정에 연결한다" — 목적 1개로 서술
   - 권한별 사유:
     | 권한 | 사유 |
     |---|---|
     | `cookies` | HttpOnly인 `d` 쿠키는 페이지 JS로 읽을 수 없어 `chrome.cookies`가 유일한 경로 |
     | `activeTab` | 사용자가 팝업을 클릭한 현재 Slack 탭에서만 워크스페이스 정보를 읽음 |
     | host `*.slack.com` | 자격증명 추출 대상 |
     | host `<내 도메인>` | 추출한 값을 사용자 계정으로 전송 |
   - **개인정보처리방침 URL**: `https://<APP_DOMAIN>/privacy` ← 7단계에서 이미 뜬다
   - 데이터 사용 신고: **"인증 정보(authentication information) 수집"에 정직하게 체크**.
     숨기면 나중에 스토어에서 내려간다. "판매하지 않음", "제3자에 이전하지 않음",
     "명시된 용도로만 사용" 체크.
4. **Visibility → Unlisted** (Public 아님)
   - 검색에는 안 뜨지만 링크로 원클릭 설치 + 자동 업데이트가 된다.
5. **Submit for review** → 보통 수 시간~수일 (자격증명을 다루므로 더 길어질 수 있다)

## 9-3. 승인 후

1. 발급된 설치 URL을 복사
2. Vercel 환경변수에 `NEXT_PUBLIC_EXTENSION_URL=<그 URL>` 추가
3. **Redeploy** (NEXT_PUBLIC_*는 빌드타임에 박히므로 재배포 없이는 반영 안 됨)
4. `https://<APP_DOMAIN>/guide`의 설치 버튼이 활성화됐는지 확인

**터지는 지점:**
- 반려는 흔하다. 사유 메일이 오면 대개 (a) 권한 사유 설명 부족 (b) 개인정보처리방침이
  자격증명 취급을 명시하지 않음 (c) 단일 목적 위반. 문구를 고쳐 재제출하면 되고,
  코드 수정 없이 리스팅만 고치는 경우도 많다.
- 스토어 설치본의 **확장 ID는 개발자 모드 로드본과 다르다.** ID를 어딘가에 하드코딩하지
  않았으니 지금은 문제없지만, 나중에 서버에서 ID로 검증할 거라면 스토어 ID를 써야 한다.
- 업데이트는 `manifest.json`의 `version` 올림 → `./build.sh` → 새 zip 업로드. 전 사용자에게
  자동 배포된다.

---

# 출시 전 마지막 관문 (돈 받기 전에)

여기까지는 "동작하는 상태"고, 아래는 **유료 사용자를 받기 전 필수**다.

- [ ] 워커 재연결 로직 **2시간+ 클린 검증** (Slack 클라이언트 전부 종료 상태에서)
- [ ] `MOCK_BILLING=0` + 포트원 StoreID / API Secret / 채널키 등록
      (지금은 카드 없이 구독 버튼만으로 `active`가 된다)
- [ ] 대시보드 `subscribe()`의 TODO에 PortOne 브라우저 SDK(`requestIssueBillingKey`) 연동
- [ ] 웹훅 서명 검증을 `@portone/server-sdk`로 강화
- [ ] Slack ToS 회색지대 고지가 랜딩·`/login`·`/privacy`에 충분히 보이는지 재확인
