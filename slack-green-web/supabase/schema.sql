-- AlwaysGreen 공유 스키마.
-- 웹앱(Next.js)과 워커(slack-presence-worker)가 이 한 테이블을 공유한다.
-- Supabase 프로젝트의 SQL Editor에 붙여넣어 실행.

create table if not exists connections (
  id                 text primary key,
  user_id            text not null,
  team_name          text not null default 'My Workspace',
  slack_user_id      text,
  -- 자격증명은 앱에서 AES-256-GCM으로 암호화한 문자열만 저장 (평문 금지).
  enc_xoxc           text not null,
  enc_xoxd           text not null,
  enabled            boolean not null default true,
  -- { timezone, days:[0-6], start:"HH:MM", end:"HH:MM" }
  schedule           jsonb not null default
                       '{"timezone":"Asia/Seoul","days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb,
  status             text not null default 'pending',  -- pending|active|paused|error
  last_presence      text,                             -- active|away
  last_seen_active_at timestamptz,
  error              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists connections_user_id_idx on connections (user_id);
create index if not exists connections_enabled_idx on connections (enabled);

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists connections_set_updated_at on connections;
create trigger connections_set_updated_at
  before update on connections
  for each row execute function set_updated_at();

-- 구독/체험 상태. 워커는 이 테이블을 join해 "자격 있는" 사용자의 연결만 유지한다.
create table if not exists subscriptions (
  user_id            text primary key,
  plan               text not null default 'trial',      -- trial | pro
  status             text not null default 'trialing',   -- trialing | active | past_due | canceled
  trial_started_at   timestamptz,
  trial_ends_at      timestamptz,
  enc_billing_key    text,               -- PortOne 빌링키 (암호화 저장)
  current_period_end timestamptz,        -- 유료 결제 유효 종료 시각 = 다음 결제일
  last_payment_id    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on subscriptions (status);
create index if not exists subscriptions_period_idx on subscriptions (current_period_end);

drop trigger if exists subscriptions_set_updated_at on subscriptions;
create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 결제 웹훅 (Groble) 수신 기록.
--
-- 왜 필요한가: ① 웹훅은 중복 배송될 수 있다 — event_key unique 로 두 번 적용되는
-- 것을 막는다(안 막으면 한 번 결제에 이용기간이 두 달씩 늘어난다). ② 페이로드
-- 형태가 바뀌거나 이메일 매칭이 실패했을 때 raw 를 보고 사후 처리할 수 있다.
-- ---------------------------------------------------------------------------
create table if not exists payment_events (
  id          bigserial primary key,
  provider    text not null default 'groble',
  event_key   text unique,        -- 결제ID 등. 없으면 페이로드 해시.
  event_type  text,               -- paid | canceled | unknown
  email       text,
  user_id     text,
  applied     boolean not null default false,  -- 구독에 반영됐는지
  note        text,
  raw         jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists payment_events_created_idx on payment_events (created_at desc);

alter table payment_events enable row level security;
-- 정책 없음 = anon/authenticated 는 접근 불가. 서버(service_role)만 읽고 쓴다.

-- 결제자 이메일 → auth.users.id 조회.
-- auth 스키마는 PostgREST 로 노출되지 않으므로 security definer 함수로 감싼다.
create or replace function public.user_id_by_email(p_email text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select id::text from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.user_id_by_email(text) from public;
revoke all on function public.user_id_by_email(text) from anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS (Row Level Security)
--
-- user_id 에는 Supabase Auth 의 auth.uid() (UUID) 가 문자열로 들어간다.
-- 웹앱 서버와 워커는 service_role 키를 쓰므로 RLS를 우회한다 — 아래 정책은
-- anon/authenticated 키로 오는 접근(브라우저에서 직접 호출 등)에 대한
-- 2차 방어선이다. 정책이 없으면 RLS를 켠 순간 anon은 아무것도 못 읽는다.
-- ---------------------------------------------------------------------------

alter table connections   enable row level security;
alter table subscriptions enable row level security;

-- 본인 행만 읽고 쓸 수 있다.
drop policy if exists "own connections" on connections;
create policy "own connections" on connections
  for all
  to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- 구독은 본인 것만 "읽기"만 허용. 생성/변경은 결제 검증을 거친 서버
-- (service_role) 만 해야 한다 — 안 그러면 클라이언트가 자기 체험 기간을
-- 늘리거나 status 를 active 로 바꿔버릴 수 있다.
drop policy if exists "read own subscription" on subscriptions;
create policy "read own subscription" on subscriptions
  for select
  to authenticated
  using (auth.uid()::text = user_id);
