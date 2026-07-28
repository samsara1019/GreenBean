import { createClient } from "@supabase/supabase-js";
import { decrypt } from "./crypto.js";
import { isEntitled } from "./entitlement.js";
import { log } from "./logger.js";

// FileStore와 동일한 인터페이스(loadConnections / setState)를 구현해, index.js가
// 그대로 쓸 수 있게 한다. 웹앱이 쓴 connections 테이블을 읽어 토큰을 복호화한다.
export class SupabaseStore {
  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
    }
    this.sb = createClient(url, key, { auth: { persistSession: false } });
  }

  async loadConnections() {
    const [{ data: conns, error: cErr }, { data: subs, error: sErr }] = await Promise.all([
      this.sb.from("connections").select("*").eq("enabled", true),
      this.sb.from("subscriptions").select("*"),
    ]);
    if (cErr) throw cErr;
    if (sErr) throw sErr;

    // user_id → 자격 여부. 체험/구독이 끝난 사용자의 연결은 아예 로드하지 않는다
    // → KeeperManager가 해당 keeper를 정리(초록불 꺼짐).
    const entitledBy = new Map();
    for (const s of subs || []) entitledBy.set(s.user_id, isEntitled(s));

    return (conns || [])
      .filter((row) => {
        if (!entitledBy.get(row.user_id)) {
          log(row.id, "skipped — 구독/체험 만료 (not entitled)");
          return false;
        }
        return true;
      })
      .map((row) => {
        try {
          return {
            id: row.id,
            teamName: row.team_name,
            xoxc: decrypt(row.enc_xoxc),
            xoxd: decrypt(row.enc_xoxd),
            schedule: row.schedule,
            enabled: row.enabled,
            status: row.status,
          };
        } catch (e) {
          log(row.id, `decrypt failed (skipping): ${e.message}`);
          return null;
        }
      })
      .filter(Boolean);
  }

  // 워커의 상태 변화를 DB로 반영해 대시보드에 보이게 한다.
  setState(id, patch) {
    const update = {};
    if (patch.status) update.status = patch.status;
    if ("error" in patch) update.error = patch.error;
    if (patch.lastPresence) update.last_presence = patch.lastPresence;
    if (patch.lastSeenActiveAt) {
      update.last_seen_active_at = new Date(patch.lastSeenActiveAt).toISOString();
    }
    if (Object.keys(update).length === 0) return;

    // fire-and-forget: 상태 기록 실패가 presence 유지를 막지 않도록.
    this.sb
      .from("connections")
      .update(update)
      .eq("id", id)
      .then(({ error }) => {
        if (error) log(id, `setState write failed: ${error.message}`);
      });
  }
}
