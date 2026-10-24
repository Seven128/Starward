import { join } from "node:path";
import { NotificationRuleService } from "./rule-service";
import { SqliteNotificationRuleRepository } from "./sqlite-rule-repository";
import { SqliteNotificationInboxRepository } from "./sqlite-inbox-repository";
import { NotificationEvaluationService } from "./evaluation-service";

export interface NotificationRuntimeOptions {
  dataDir: string;
  releaseProfile?: { id: string; productionTrafficAllowed: boolean; externalServicesBudgetCny: number };
  now?: () => Date;
}
export async function createNotificationToolsRuntime(options: NotificationRuntimeOptions) {
  if (!options.dataDir.trim()) throw new Error("notification_rule_data_dir_required");
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false || options.releaseProfile.externalServicesBudgetCny > 200)) throw new Error("notification_rule_release_profile_invalid");
  const file = join(options.dataDir, "notifications-and-toolbox.sqlite");
  const repository = new SqliteNotificationRuleRepository(file);
  let inbox: SqliteNotificationInboxRepository;
  try { inbox = new SqliteNotificationInboxRepository(file); } catch (error) { repository.close(); throw error; }
  const evaluations = new NotificationEvaluationService(inbox, options.now);
  return { service: new NotificationRuleService(repository, options.now && (() => options.now!().toISOString())), evaluations,
    close: async () => { await evaluations.close(); inbox.close(); repository.close(); } };
}
