import { join } from "node:path";
import { FieldReportService } from "./report-service";
import { SqliteFieldReportRepository } from "./sqlite-report-repository";

export interface FieldReportRuntimeOptions {
  dataDir: string;
  releaseProfile?: { id: string; productionTrafficAllowed: boolean; externalServicesBudgetCny: number };
}
export async function createFieldReportRuntime(options: FieldReportRuntimeOptions) {
  if (!options.dataDir.trim()) throw new Error("field_report_data_dir_required");
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false || options.releaseProfile.externalServicesBudgetCny > 200)) throw new Error("field_report_release_profile_invalid");
  const repository = new SqliteFieldReportRepository(join(options.dataDir, "field-offline-safety.sqlite"));
  return { service: new FieldReportService(repository), close: async () => repository.close() };
}
