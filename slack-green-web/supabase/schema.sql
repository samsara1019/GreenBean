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
