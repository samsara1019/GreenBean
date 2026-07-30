// 구독/체험 자격 판정 로직 (순수 함수). 웹과 워커가 "같은 규칙"으로 판단해야
// 하므로 이 파일과 worker/src/entitlement.js 는 동일하게 유지한다.
//
// 상태(status):
//   trialing  — 14일 무료 체험 중
//   active    — 유료 구독 중 (current_period_end 까지 유효)
//   past_due  — 결제 실패 (유예 기간 후 정지)
//   canceled  — 해지됨
//
// 자격 있음(entitled) = 체험이 안 끝났거나, 유료 기간이 안 끝남 → 워커가 presence 유지.

const DAY_MS = 86_400_000;

export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 14);
export const PLAN_PRICE_KRW = Number(process.env.PLAN_PRICE_KRW || 4900);

// 플랜별 워크스페이스 최대 개수. Free(체험) 1개 / Pro(유료) 3개.
export const FREE_MAX_CONNECTIONS = 1;
export const PRO_MAX_CONNECTIONS = 3;

// 유료(active/past_due 유예 포함)면 Pro 한도, 그 외(체험·만료)는 Free 한도.
export function maxConnections(sub) {
  const paid = sub && (sub.status === "active" || sub.status === "past_due");
  return paid ? PRO_MAX_CONNECTIONS : FREE_MAX_CONNECTIONS;
}

export function newTrial(now = new Date()) {
  const ends = new Date(now.getTime() + TRIAL_DAYS * DAY_MS);
  return {
    plan: "trial",
    status: "trialing",
    trial_started_at: now.toISOString(),
    trial_ends_at: ends.toISOString(),
    current_period_end: null,
  };
}

export function isEntitled(sub, now = new Date()) {
  if (!sub) return false;
  const t = now.getTime();
  if (sub.status === "active" && sub.current_period_end) {
    return new Date(sub.current_period_end).getTime() > t;
  }
  if (sub.status === "trialing" && sub.trial_ends_at) {
    return new Date(sub.trial_ends_at).getTime() > t;
  }
  // past_due: 유예(예: 3일) 동안은 유지해 결제 재시도 기회를 준다.
  if (sub.status === "past_due" && sub.current_period_end) {
    return new Date(sub.current_period_end).getTime() + 3 * DAY_MS > t;
  }
  return false;
}

// KST(UTC+9) 기준 '달력 날짜 인덱스'. 같은 날이면 같은 값 → 자정마다 1씩 증가.
function kstDayIndex(d) {
  return Math.floor((d.getTime() + 9 * 3_600_000) / DAY_MS);
}

// 남은 '달력 일수'. 가입일 당일 D-14, 다음 날(자정 지나면) D-13 … 로 매일 1씩 감소.
// (raw ms + ceil 방식은 가입 후 24시간이 안 지나면 계속 D-14로 보여 '안 떨어진다'는
//  오해를 준다. KST 자정 기준으로 바꿔 예측 가능하게 한다.)
export function trialDaysLeft(sub, now = new Date()) {
  if (!sub || sub.status !== "trialing" || !sub.trial_ends_at) return 0;
  return Math.max(0, kstDayIndex(new Date(sub.trial_ends_at)) - kstDayIndex(now));
}

export function summarize(sub, now = new Date()) {
  return {
    plan: sub?.plan || "trial",
    status: sub?.status || "none",
    trialEndsAt: sub?.trial_ends_at || null,
    currentPeriodEnd: sub?.current_period_end || null,
    daysLeft: trialDaysLeft(sub, now),
    entitled: isEntitled(sub, now),
    priceKrw: PLAN_PRICE_KRW,
    maxConnections: maxConnections(sub),
  };
}

// 다음 결제일 = 지금부터 1개월 뒤.
export function nextPeriodEnd(now = new Date()) {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
