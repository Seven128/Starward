import { describe, expect, it } from "vitest";
import { createNotificationToolsRuntime } from "./runtime";

describe("notification tools runtime", () => {
  it("rejects missing storage and production promotion rather than manufacturing a delivery boundary", async () => {
    await expect(createNotificationToolsRuntime({ dataDir: " " })).rejects.toThrow("notification_rule_data_dir_required");
    await expect(createNotificationToolsRuntime({ dataDir: "unused", releaseProfile: { id: "production", productionTrafficAllowed: true, externalServicesBudgetCny: 200 } })).rejects.toThrow("notification_rule_release_profile_invalid");
  });
});
