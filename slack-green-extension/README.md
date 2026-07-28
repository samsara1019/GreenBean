# slack-green-extension (Phase 2 — 토큰 자동 추출)

로그인된 Slack 웹에서 워크스페이스 자격증명을 **클릭 한 번**에 추출해
AlwaysGreen 서버로 연결하는 Chrome 확장 (Manifest V3).

## 왜 확장이 필요한가 (기술적 이유)

두 자격증명의 저장 위치가 달라서 하나의 방법으로는 못 가져온다:

| 값 | 위치 | 접근 방법 |
|---|---|---|
| `xoxc` 토큰 | Slack 웹 `localStorage.localConfig_v2` | **콘텐츠 스크립트**가 페이지 localStorage에서 읽음 |
| `xoxd` (`d` 쿠키) | `.slack.com`의 **HttpOnly 쿠키** | JS(`document.cookie`)로 불가 → **background + `chrome.cookies` API** |

그래서 구조가 3파트다:

```
content.js     Slack 페이지에서 xoxc 토큰 추출 → 팝업에 전달
background.js  d 쿠키(HttpOnly)를 chrome.cookies로 읽고, xoxc와 합쳐 서버로 POST
popup.*        워크스페이스 목록 + [연결] 버튼 UI
```

## 설치 (개발자 모드)

1. Chrome → `chrome://extensions`
2. 우상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드** → 이 `slack-green-extension` 폴더 선택
4. (아이콘은 생략되어 기본 퍼즐 아이콘으로 표시됨 — 배포 전 PNG 추가)

## 사용

1. 브라우저에서 **app.slack.com** 에 로그인
2. 확장 아이콘 클릭 → 감지된 워크스페이스 목록에서 **[연결]**
3. 설정에서 **서버 주소**를 지정 (개발: `http://localhost:3000`, 배포: 실제 도메인)
4. 연결되면 웹 대시보드에서 근무시간을 조정

## 서버 연동

- background가 `${서버주소}/api/connections` 로 `{ teamName, xoxc, xoxd, schedule }` POST.
- `host_permissions` 덕에 크로스오리진 fetch가 CORS 제약 없이 동작.
- `credentials:"include"` 로 웹앱 세션 쿠키를 함께 전송 → 웹앱에 Supabase Auth가
  붙으면 자동으로 "로그인한 사용자"의 연결로 저장된다. (지금은 인증 스텁이라
  DEV_USER_ID로 저장됨.)

## 아이콘 / 패키징

- 아이콘은 `node tools/generate-icons.mjs`로 생성 (icons/icon{16,48,128}.png).
- 스토어 업로드용 zip: `./build.sh` → `dist/alwaysgreen-extension-v<version>.zip`
  (개발 파일 제외하고 manifest·src·icons만 포함).

---

# 🧪 테스트 방법

## 1) 로컬 로드 (개발자 모드)

1. `chrome://extensions` → 우상단 **개발자 모드** ON
2. **압축해제된 확장 프로그램을 로드** → 이 폴더 선택
3. 코드 수정 후에는 확장 카드의 **새로고침(↻)** 아이콘을 눌러 리로드

## 2) 기능 확인

- **팝업**: app.slack.com 탭에서 아이콘 클릭 → 워크스페이스 목록이 뜨는지
- **content.js 로그**: Slack 페이지에서 DevTools Console 확인
- **background(service worker) 로그**: `chrome://extensions` → 확장 카드의
  **서비스 워커** 링크 클릭 → 전용 DevTools에서 `CONNECT` 처리/`fetch` 확인
- **연결 흐름**: 로컬 웹앱(`http://localhost:3000`)을 켜고, 팝업 설정에서 서버
  주소를 맞춘 뒤 [연결] → 대시보드에 워크스페이스가 추가되는지

## 3) 자주 겪는 문제

- 팝업이 "새로고침하라"고 하면 → Slack 페이지 새로고침(content script 재주입)
- `d 쿠키를 찾지 못했습니다` → app.slack.com 로그인 상태 확인
- 연결이 401 → 웹앱에 로그인돼 있어야 세션 쿠키가 함께 전송됨

---

# 🚀 비공개(Unlisted) 웹스토어 등록

검색에는 안 뜨지만 **링크로 원클릭 설치 + 자동 업데이트**가 되는 방식. 회색지대
툴 v1에 최적. 직접 .crx를 호스팅할 필요가 없어진다.

## 준비물

1. **Chrome 웹스토어 개발자 계정** — [Developer Dashboard](https://chrome.google.com/webstore/devconsole)에서 **최초 1회 $5** 등록
2. **패키지 zip** — `./build.sh`
3. **개인정보처리방침 URL** — 웹앱 `/privacy` (자격증명 취급 → 심사 필수)
4. **스토어 리스팅 자료** — 아이콘(128px, 있음), 스크린샷 최소 1장(1280×800 또는 640×400), 짧은 설명

## 절차

1. Developer Dashboard → **New item** → `dist/alwaysgreen-extension-vX.zip` 업로드
2. **Store listing** 작성: 설명은 "근무시간 상태 관리 도구"로 프레이밍, 스크린샷 첨부
3. **Privacy practices** 탭:
   - 단일 목적(single purpose) 서술
   - `cookies` / `activeTab` / host 권한 각각의 **사용 사유** 명시
   - 개인정보처리방침 URL 입력, "데이터 판매 안 함" 체크
4. **Visibility → Unlisted** 선택 (Public 아님)
5. 제출 → 심사(보통 수 시간~수일) → 통과되면 **고유 설치 URL** 발급
6. 그 URL을 웹앱 `NEXT_PUBLIC_EXTENSION_URL` 에 넣으면 `/guide` 설치 버튼이 활성화됨

## 심사 통과 팁 (반려 리스크 완화)

- 권한 최소화(이미 `tabs`→`activeTab`로 축소함)
- 설명에서 "Slack 우회/속임" 같은 표현 금지 → "상태 자동화/스케줄링"으로
- Slack 상표는 "Slack은 Slack Technologies의 상표이며 본 확장은 무관" 고지
- 원격 코드 실행 없음(모든 로직이 패키지에 포함) — MV3 정책 준수

## 업데이트

코드 변경 → `manifest.json`의 `version` 올림 → `./build.sh` → 대시보드에서 새 zip
업로드. **자동으로 전 사용자에게 배포**된다(직접 배포 불필요).

---

## 보안 주의

이 확장은 사용자의 Slack 자격증명을 그대로 다룬다. 전송은 반드시 HTTPS,
서버는 즉시 암호화 저장(웹앱이 AES-256-GCM으로 처리), 로그에 토큰을 남기지 말 것.
