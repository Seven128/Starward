import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ApiEnvelope, ObservationContext, SkyReport } from "@starward/miniapp-contracts";

type TimeFixture = { prior: ApiEnvelope<ObservationContext>; source: ApiEnvelope<SkyReport> };
let snapshot: TimeFixture | undefined;

/** Share one portable report per test process, with an independent copy per
 * consumer. Run the producer under its own server TypeScript configuration;
 * importing MiniappService here would drag server-only code into client types. */
export function skyTimeTestFixture(): TimeFixture {
  snapshot ??= JSON.parse(execFileSync(process.execPath, ["--import", "tsx",
    fileURLToPath(new URL("../../../../../workers/miniapp-api/src/test-fixtures/sky-time-consumer-fixture.ts", import.meta.url))], {
    cwd: fileURLToPath(new URL("../../../../../workers/miniapp-api/", import.meta.url)),
    encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
  })) as TimeFixture;
  return structuredClone(snapshot);
}
