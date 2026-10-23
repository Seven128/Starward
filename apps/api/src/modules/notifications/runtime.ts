import { join } from "node:path";
import { NotificationRuleService } from "./rule-service";
import { SqliteNotificationRuleRepository } from "./sqlite-rule-repository";

export interface NotificationRuntimeOptions {
  dataDir: string;
  releaseProfile?: { id: string; productionTrafficAllowed: boolean; externalServicesBudgetCny: number };
}
export async function createNotificationToolsRuntime(options: NotificationRuntimeOptions) {
  if (!options.dataDir.trim()) throw new Error("notification_rule_data_dir_required");
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false || options.releaseProfile.externalServicesBudgetCny > 200)) throw new Error("notification_rule_release_profile_invalid");
  const repository = new SqliteNotificationRuleRepository(join(options.dataDir, "notifications-and-toolbox.sqlite"));
  return { service: new NotificationRuleService(repository), close: async () => repository.close() };
}
