import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { evaluateSpotCompleteness } from "../../../workers/miniapp-api/src/spot-completeness-policy.ts";
import type { SpotDetail } from "@starward/miniapp-contracts";

const output = execFileSync("docker", ["exec", "starward-miniapp-demo-postgres-1", "psql",
  "-U", "starward_miniapp", "-d", "starward_miniapp", "-At", "-c",
  "SELECT r.payload FROM spot_overview_read_models r JOIN spots s USING(spot_id) ORDER BY s.display_order;",
], { encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
const now = new Date();
const items = output.trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const detail = JSON.parse(line) as SpotDetail;
  const result = evaluateSpotCompleteness({ detail, now,
    review: { actorId: "local-readonly-audit", reason: "只读检查现有正式地点资料缺口，不构成发布审核" } });
  return { name: detail.spot.name, complete: result.complete, issues: result.issues,
    satisfiedClaims: result.satisfiedClaims };
});
const counts: Record<string, number> = {};
for (const item of items) for (const issue of item.issues) counts[issue.code] = (counts[issue.code] ?? 0) + 1;
writeFileSync(".codex/work-items/miniapp-integrated-2026-09-06/spot-completeness-audit.json",
  JSON.stringify({ at: now.toISOString(), mode: "read_only_policy_evaluation", items, counts }, null, 2));
console.log(JSON.stringify({ assessed: items.length, complete: items.filter((item) => item.complete).length, counts,
  observatory: items.find((item) => item.name === "深圳市天文台") }));
