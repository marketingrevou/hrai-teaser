// Loads .env if present. Imported before any module that reads process.env at
// load time — ESM evaluates imports in order, so this side effect must sit in
// its own module rather than at the top of server.js.
try {
  process.loadEnvFile?.(new URL('../.env', import.meta.url));
} catch {
  // No .env file: environment variables (or none at all) are fine.
}
