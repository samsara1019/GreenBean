// 웹앱 slack-green-web/src/lib/entitlement.js 의 판정 규칙과 동일하게 유지할 것.
// 워커는 "자격 있는 사용자"의 연결만 유지한다 — 체험/구독이 끝나면 초록불이 꺼진다.

const DAY_MS = 86_400_000;

export function isEntitled(sub, now = new Date()) {
  if (!sub) return false;
  const t = now.getTime();
  if (sub.status === "active" && sub.current_period_end) {
    return new Date(sub.current_period_end).getTime() > t;
  }
  if (sub.status === "trialing" && sub.trial_ends_at) {
    return new Date(sub.trial_ends_at).getTime() > t;
  }
  if (sub.status === "past_due" && sub.current_period_end) {
    return new Date(sub.current_period_end).getTime() + 3 * DAY_MS > t;
  }
  return false;
}
