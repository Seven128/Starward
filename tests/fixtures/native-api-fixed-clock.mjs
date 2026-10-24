import { mock } from "node:test";
const now = Date.parse(process.env.STARWARD_FIXTURE_NOW ?? "");
if (!Number.isFinite(now)) throw new Error("isolated_api_fixture_clock_required");
mock.timers.enable({ apis: ["Date"], now });
await import("../../apps/api/src/start.ts");
