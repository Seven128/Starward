// Task-only compiled Sky API for the isolated WEAPP candidate. Uses the
// deterministic public-spot/weather fixture; never proxies a private Context
// or replaces the shared 8789 owner. Port is allocated by the OS.
import { createPublicationBackend } from "./experience-w3-proxy-backend-2026-09-29.mts";

const backend = await createPublicationBackend();
process.stdout.write(JSON.stringify({ kind: "sky-time-local-bff", port: backend.port,
  publicationHash: backend.publicationHash }) + "\n");
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await backend.close();
  process.exit(0);
};
process.once("SIGINT", () => { void close(); });
process.once("SIGTERM", () => { void close(); });
setInterval(() => {}, 1_000_000);
