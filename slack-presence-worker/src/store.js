import { readFile } from "node:fs/promises";
import { log } from "./logger.js";

// Data source abstraction. Phase 1 reads connections from a local JSON file and
// keeps runtime state in memory. In Phase 3 this class is replaced by a Supabase
// implementation with the SAME interface — loadConnections() / setState() —
// so nothing above it needs to change.
export class FileStore {
  constructor(path) {
    this.path = path;
    this.state = new Map();
  }

  async loadConnections() {
    try {
      const raw = await readFile(this.path, "utf8");
      const conns = JSON.parse(raw);
      if (!Array.isArray(conns)) throw new Error("connections file must be an array");
      return conns;
    } catch (err) {
      if (err.code === "ENOENT") {
        log("store", `no connections file at ${this.path} — starting empty`);
        return [];
      }
      throw err;
    }
  }

  setState(id, patch) {
    const prev = this.state.get(id) || {};
    this.state.set(id, { ...prev, ...patch, updatedAt: Date.now() });
  }

  getState(id) {
    return this.state.get(id);
  }
}
