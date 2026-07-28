import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { FileStore } from "./store.js";
import { KeeperManager } from "./KeeperManager.js";
import { log } from "./logger.js";

// DATA_BACKEND=supabase → 웹앱과 공유하는 DB에서 연결을 읽는다(프로덕션).
// 그 외에는 로컬 connections.json 파일(개발/단독 검증).
async function makeStore() {
  if (process.env.DATA_BACKEND === "supabase") {
    const { SupabaseStore } = await import("./SupabaseStore.js");
    log("main", "using Supabase store");
    return new SupabaseStore();
  }
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const connectionsPath =
    process.env.CONNECTIONS_PATH || resolve(__dirname, "..", "connections.json");
  log("main", `using file store: ${connectionsPath}`);
  return new FileStore(connectionsPath);
}

const manager = new KeeperManager(await makeStore());

async function main() {
  await manager.start();
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    log("main", `${sig} received — shutting down`);
    await manager.stopAll();
    process.exit(0);
  });
}

main().catch((e) => {
  log("main", `fatal: ${e.stack || e.message}`);
  process.exit(1);
});
