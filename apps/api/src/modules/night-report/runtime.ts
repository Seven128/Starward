import { join } from "node:path";
import type { NightReportService } from "./night-report-service";
import { PersistedNightReportService } from "./persisted-night-report-service";
import { SqliteNightReportRepository } from "./sqlite-night-report-repository";

export interface NightReportRuntimeOptions {
  dataDir: string;
  generator: Pick<NightReportService, "generate">;
  releaseProfile?: { id: string; productionTrafficAllowed: boolean; externalServicesBudgetCny?: number };
}
export async function createNightReportRuntime(options: NightReportRuntimeOptions) {
  if (!options.dataDir.trim()) throw new Error("night_report_data_dir_required");
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false || (options.releaseProfile.externalServicesBudgetCny ?? 0) > 200)) throw new Error("night_report_release_profile_invalid");
  const repository = new SqliteNightReportRepository(join(options.dataDir, "tonight-decision.sqlite"));
  return { service: new PersistedNightReportService(repository, options.generator), close: async () => repository.close() };
}
