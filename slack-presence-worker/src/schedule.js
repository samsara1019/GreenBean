// Decides whether "now" falls inside a connection's work window, in that
// connection's own timezone. No external deps — uses Intl for tz math.
//
// schedule shape:
//   { timezone: "Asia/Seoul", days: [1,2,3,4,5], start: "09:00", end: "18:00" }
//   days: 0=Sun .. 6=Sat. Omit `days` to mean every day.
//   Overnight windows (start > end, e.g. "22:00"–"06:00") are supported.
//
// A missing schedule means "always on".

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function isWithinSchedule(schedule, now = new Date()) {
  if (!schedule) return true;
  const { timezone = "Asia/Seoul", days, start, end } = schedule;
  if (!start || !end) return true;

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value])
  );

  const dow = WEEKDAY[parts.weekday];
  const cur = toMinutes(parts.hour, parts.minute);
  const s = toMinutes(...start.split(":"));
  const e = toMinutes(...end.split(":"));

  const inTimeWindow = s <= e ? cur >= s && cur < e : cur >= s || cur < e;

  if (!days) return inTimeWindow;

  if (s <= e) {
    // Same-day window: the active day is simply today.
    return days.includes(dow) && inTimeWindow;
  }
  // Overnight window: the "before midnight" and "after midnight" halves belong
  // to different calendar days. We anchor scheduling on the window's START day,
  // so the early-morning tail (cur < e) counts against yesterday's scheduled day.
  if (cur >= s) return days.includes(dow);
  return days.includes((dow + 6) % 7);
}

function toMinutes(h, m) {
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}
