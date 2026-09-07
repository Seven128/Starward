import { readFileSync, writeFileSync } from "node:fs";
const file = "apps/wechat-miniapp/src/app.scss";
let source = readFileSync(file, "utf8");
const role = (name) => `  font-size: var(--type-${name}-size);\n  line-height: var(--type-${name}-line);\n  font-weight: var(--type-${name}-weight);`;
const roles = { display: "display", "page-title": "page-title", "spot-title": "spot-title", section: "section", body: "body", secondary: "body-secondary", label: "action", caption: "metadata", data: "data", article: "article", critical: "critical", search: "search" };
const typeCss = Object.entries(roles).map(([name, token]) => `.type-${name} {\n${role(token)}${name === "caption" ? "\n  color: var(--text-secondary);" : ""}${name === "data" ? "\n  font-variant-numeric: tabular-nums;" : ""}\n}`).join("\n");
source = source.replace(/\.large-text \{[\s\S]*?(?=\.safe-top \{)/, `${typeCss}\n\n`);
source = source.replace("  font-size: 24rpx;\n  line-height: 34rpx;", role("body"));
// Each replacement edits the owning declaration, never appends overrides.
for (const [selector, token] of [["soft-button", "action"], ["chip", "action"], ["field", "body"], ["status-tag", "critical"], ["development-fixture-banner", "body-secondary"]]) {
  const expression = new RegExp(`(\\.${selector} \\{)([\\s\\S]*?)(\\n\\})`);
  source = source.replace(expression, (_, opening, body, closing) => opening + body
    .replace(/  font-size: [^;]+;\r?\n  line-height: [^;]+;/, role(token))
    .replaceAll("min-height: 88rpx", "min-height: var(--target-min)")
    .replaceAll("min-width: 88rpx", "min-width: var(--target-min)")
    .replace("white-space: nowrap", "white-space: normal") + closing);
}
writeFileSync(file, source);
