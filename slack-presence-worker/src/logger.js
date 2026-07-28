// Minimal structured logger. Swap for pino/winston when moving to production.
export function log(scope, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${scope}] ${msg}`);
}
