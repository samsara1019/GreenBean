import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { encrypt, decrypt, mask } from "./crypto.js";
import { newTrial, maxConnections, PRO_MAX_CONNECTIONS } from "./entitlement.js";

// 데이터 계층. SUPABASE_URL + SERVICE_ROLE_KEY 가 있으면 Supabase, 없으면
// 로컬 JSON 파일(.data/connections.json)로 자동 폴백 → 세팅 없이도 즉시 실행.
//
// 워커(slack-presence-worker)의 store.js 와 "같은 테이블"을 공유하는 것이
// 핵심. 스키마는 supabase/schema.sql 참고.

const USE_SUPABASE = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = USE_SUPABASE
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

const FILE_PATH = resolve(process.cwd(), ".data", "connections.json");
const SUBS_PATH = resolve(process.cwd(), ".data", "subscriptions.json");

// DB row → 클라이언트에 안전하게 보낼 형태 (토큰 원문 제거, 마스킹만).
function toPublic(row) {
  return {
    id: row.id,
    teamName: row.team_name,
    slackUserId: row.slack_user_id,
    enabled: row.enabled,
    schedule: row.schedule,
    status: row.status,
    lastPresence: row.last_presence,
    lastSeenActiveAt: row.last_seen_active_at,
    error: row.error,
    xoxcMasked: mask(safeDecrypt(row.enc_xoxc)),
  };
}

function safeDecrypt(v) {
  try {
    return v ? decrypt(v) : "";
  } catch {
    return "";
  }
}

/* ---------------- File fallback ---------------- */
async function fileReadAll() {
  try {
    return JSON.parse(await readFile(FILE_PATH, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
async function fileWriteAll(rows) {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(rows, null, 2));
}

/* ---------------- Public API ---------------- */

export async function listConnections(userId) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data.map(toPublic);
  }
  const rows = await fileReadAll();
  return rows.filter((r) => r.user_id === userId).map(toPublic);
}

// 확장에서 같은 워크스페이스를 다시 연결하면(토큰 만료 재인증 등) 새 행을 만들지
// 않고 기존 행의 토큰을 갱신하고 status를 pending으로 되살린다 → 중복 방지 +
// 워커가 재인증을 자동 감지.
// 연결 개수 한도는 플랜에 따라 다르다 (entitlement.maxConnections). Free 1 / Pro 3.
function limitError(limit) {
  const e = new Error(
    `현재 플랜에서는 워크스페이스를 최대 ${limit}개까지 연결할 수 있습니다.` +
      (limit < PRO_MAX_CONNECTIONS
        ? ` Pro로 업그레이드하면 최대 ${PRO_MAX_CONNECTIONS}개까지 가능합니다.`
        : "")
  );
  e.code = "LIMIT";
  return e;
}

export async function createConnection(userId, { teamName, xoxc, xoxd, schedule }) {
  const name = teamName || "My Workspace";
  const tokenPatch = {
    enc_xoxc: encrypt(xoxc),
    enc_xoxd: encrypt(xoxd),
    enabled: true,
    status: "pending",
    error: null,
  };

  if (USE_SUPABASE) {
    const { data: existing, error: selErr } = await supabase
      .from("connections")
      .select("id")
      .eq("user_id", userId)
      .eq("team_name", name)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing) {
      const patch = { ...tokenPatch, ...(schedule ? { schedule } : {}) };
      const { data, error } = await supabase
        .from("connections")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return toPublic(data);
    }

    // 새 연결 → 플랜별 개수 제한 검사 (기존 워크스페이스 갱신은 위에서 이미 return됨).
    const limit = maxConnections(await getOrCreateSubscription(userId));
    const { count, error: cntErr } = await supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (cntErr) throw cntErr;
    if ((count || 0) >= limit) throw limitError(limit);

    const row = newConnectionRow(userId, name, tokenPatch, schedule);
    const { data, error } = await supabase.from("connections").insert(row).select().single();
    if (error) throw error;
    return toPublic(data);
  }

  // file mode
  const rows = await fileReadAll();
  const existing = rows.find((r) => r.user_id === userId && r.team_name === name);
  if (existing) {
    Object.assign(existing, tokenPatch, schedule ? { schedule } : {});
    await fileWriteAll(rows);
    return toPublic(existing);
  }
  const fileLimit = maxConnections(await getOrCreateSubscription(userId));
  if (rows.filter((r) => r.user_id === userId).length >= fileLimit) {
    throw limitError(fileLimit);
  }
  const row = newConnectionRow(userId, name, tokenPatch, schedule);
  rows.push(row);
  await fileWriteAll(rows);
  return toPublic(row);
}

function newConnectionRow(userId, name, tokenPatch, schedule) {
  return {
    id: `conn_${cryptoRandomId()}`,
    user_id: userId,
    team_name: name,
    slack_user_id: null,
    last_presence: null,
    last_seen_active_at: null,
    schedule: schedule || defaultSchedule(),
    created_at: new Date().toISOString(),
    ...tokenPatch,
  };
}

export async function updateConnection(userId, id, patch) {
  const allowed = {};
  if (typeof patch.enabled === "boolean") allowed.enabled = patch.enabled;
  if (patch.schedule) allowed.schedule = patch.schedule;
  if (patch.teamName) allowed.team_name = patch.teamName;

  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from("connections")
      .update(allowed)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return toPublic(data);
  }
  const rows = await fileReadAll();
  const row = rows.find((r) => r.id === id && r.user_id === userId);
  if (!row) throw new Error("not found");
  Object.assign(row, allowed);
  await fileWriteAll(rows);
  return toPublic(row);
}

export async function deleteConnection(userId, id) {
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from("connections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const rows = await fileReadAll();
  await fileWriteAll(rows.filter((r) => !(r.id === id && r.user_id === userId)));
}

/* ---------------- Subscriptions ---------------- */

// 사용자의 구독 정보를 반환한다. 없으면 14일 체험을 자동 생성한다(첫 진입 = 체험 시작).
export async function getOrCreateSubscription(userId) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    const row = { user_id: userId, ...newTrial() };
    const { data: created, error: insErr } = await supabase
      .from("subscriptions")
      .insert(row)
      .select()
      .single();
    if (insErr) throw insErr;
    return created;
  }
  // file mode
  const subs = await subsReadAll();
  let sub = subs.find((s) => s.user_id === userId);
  if (!sub) {
    sub = { user_id: userId, ...newTrial() };
    subs.push(sub);
    await subsWriteAll(subs);
  }
  return sub;
}

export async function updateSubscription(userId, patch) {
  const clean = { ...patch };
  if ("billing_key" in clean) {
    // 빌링키는 사실상 결제 권한 → 암호화 저장.
    clean.enc_billing_key = clean.billing_key ? encrypt(clean.billing_key) : null;
    delete clean.billing_key;
  }
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from("subscriptions")
      .update(clean)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const subs = await subsReadAll();
  const sub = subs.find((s) => s.user_id === userId);
  if (!sub) throw new Error("subscription not found");
  Object.assign(sub, clean);
  await subsWriteAll(subs);
  return sub;
}

// 갱신 대상: active/past_due 이면서 결제주기가 지난 구독. 빌링키를 복호화해 함께 반환.
export async function listDueSubscriptions(nowIso = new Date().toISOString()) {
  let rows;
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .in("status", ["active", "past_due"])
      .lte("current_period_end", nowIso);
    if (error) throw error;
    rows = data;
  } else {
    const subs = await subsReadAll();
    rows = subs.filter(
      (s) =>
        ["active", "past_due"].includes(s.status) &&
        s.current_period_end &&
        s.current_period_end <= nowIso
    );
  }
  return rows.map((s) => ({
    userId: s.user_id,
    status: s.status,
    currentPeriodEnd: s.current_period_end,
    billingKey: s.enc_billing_key ? safeDecrypt(s.enc_billing_key) : null,
  }));
}

/* ---------------- 결제 웹훅 (Groble) ---------------- */

// 결제자 이메일 → user_id. 못 찾으면 null (결제 이메일과 가입 이메일 불일치).
export async function findUserIdByEmail(email) {
  if (!email) return null;
  if (USE_SUPABASE) {
    const { data, error } = await supabase.rpc("user_id_by_email", { p_email: email });
    if (error) throw error;
    return data || null;
  }
  // 파일 모드(로컬 폴백)에는 auth.users 가 없다.
  return null;
}

// 웹훅 수신 기록 + 중복 배송 차단. 이미 같은 event_key 가 있으면 duplicate:true.
export async function recordPaymentEvent({ eventKey, eventType, email, userId, raw, note }) {
  const row = {
    provider: "groble",
    event_key: eventKey,
    event_type: eventType,
    email: email || null,
    user_id: userId || null,
    applied: false,
    note: note || null,
    raw,
  };
  if (USE_SUPABASE) {
    const { error } = await supabase.from("payment_events").insert(row);
    // 23505 = unique 위반 → 같은 이벤트가 이미 처리됨.
    if (error) {
      if (error.code === "23505") return { duplicate: true };
      throw error;
    }
    return { duplicate: false };
  }
  const path = resolve(process.cwd(), ".data", "payment_events.json");
  let rows = [];
  try {
    rows = JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (eventKey && rows.some((r) => r.event_key === eventKey)) return { duplicate: true };
  rows.push({ ...row, created_at: new Date().toISOString() });
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(rows, null, 2));
  return { duplicate: false };
}

// 적용은 하지 않고 사유만 남긴다(수동 처리 대상은 applied=false 로 남아야 한다).
export async function notePaymentEvent(eventKey, note) {
  if (!eventKey || !USE_SUPABASE) return;
  const { error } = await supabase
    .from("payment_events")
    .update({ note })
    .eq("event_key", eventKey);
  if (error) throw error;
}

export async function markPaymentEventApplied(eventKey, { userId, note } = {}) {
  if (!eventKey) return;
  if (USE_SUPABASE) {
    const { error } = await supabase
      .from("payment_events")
      .update({ applied: true, ...(userId ? { user_id: userId } : {}), ...(note ? { note } : {}) })
      .eq("event_key", eventKey);
    if (error) throw error;
  }
}

// 결제 완료 → Pro 1개월. 기간이 남아 있으면 그 끝에서 연장한다(조기 결제 손해 방지).
export async function grantProMonth(userId) {
  const sub = await getOrCreateSubscription(userId);
  const base = sub.current_period_end
    ? Math.max(new Date(sub.current_period_end).getTime(), Date.now())
    : Date.now();
  const end = new Date(base);
  end.setMonth(end.getMonth() + 1);
  return updateSubscription(userId, {
    plan: "pro",
    status: "active",
    current_period_end: end.toISOString(),
  });
}

// 결제 취소/환불 → 즉시 종료. 취소된 결제로 서비스가 계속 돌면 안 된다.
export async function revokePro(userId) {
  await getOrCreateSubscription(userId);
  return updateSubscription(userId, {
    status: "canceled",
    current_period_end: new Date().toISOString(),
  });
}

async function subsReadAll() {
  try {
    return JSON.parse(await readFile(SUBS_PATH, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
async function subsWriteAll(rows) {
  await mkdir(dirname(SUBS_PATH), { recursive: true });
  await writeFile(SUBS_PATH, JSON.stringify(rows, null, 2));
}

export const backend = USE_SUPABASE ? "supabase" : "file";

function defaultSchedule() {
  return { timezone: "Asia/Seoul", days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" };
}

function cryptoRandomId() {
  // Web Crypto (Edge/Node 18 모두 지원)
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
