import { PresenceKeeper } from "./PresenceKeeper.js";
import { isWithinSchedule } from "./schedule.js";
import { log } from "./logger.js";

const TICK_MS = 60_000; // re-evaluate schedules every minute

// Owns the full fleet of connections. Every tick it reconciles desired state
// (from the store + schedule) against running keepers: starts the ones that
// should be active now, stops the ones that shouldn't, and drops removed ones.
export class KeeperManager {
  constructor(store) {
    this.store = store;
    this.keepers = new Map(); // conn.id -> PresenceKeeper
    this.tick = null;
  }

  async start() {
    await this.reconcile();
    this.tick = setInterval(
      () => this.reconcile().catch((e) => log("manager", `reconcile error: ${e.message}`)),
      TICK_MS
    );
    log("manager", "started");
  }

  async reconcile() {
    const conns = await this.store.loadConnections();
    const seen = new Set();

    for (const conn of conns) {
      seen.add(conn.id);
      // needs_reauth = 토큰 만료로 멈춘 연결. 사용자가 재연결(status=pending)하기
      // 전까지 되살리지 않는다.
      const shouldRun =
        conn.enabled !== false &&
        conn.status !== "needs_reauth" &&
        isWithinSchedule(conn.schedule);
      const keeper = this.keepers.get(conn.id);

      if (shouldRun && !keeper) {
        const k = new PresenceKeeper(conn, (id, st) => this.store.setState(id, st));
        this.keepers.set(conn.id, k);
        k.start();
      } else if (!shouldRun && keeper) {
        await keeper.stop();
        this.keepers.delete(conn.id);
      }
    }

    // Connections removed from the store should have their keepers torn down.
    for (const [id, keeper] of this.keepers) {
      if (!seen.has(id)) {
        await keeper.stop();
        this.keepers.delete(id);
      }
    }
  }

  async stopAll() {
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
    for (const k of this.keepers.values()) await k.stop();
    this.keepers.clear();
  }
}
