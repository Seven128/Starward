// One-time migration of existing owned palette into the new canonical source.
import { readFileSync, writeFileSync } from "node:fs";
const designPath = "DESIGN.md";
const scss = readFileSync("apps/wechat-miniapp/src/styles/tokens.scss", "utf8");
const themes = {};
for (const mode of ["day", "night", "observation"]) {
  const body = scss.match(new RegExp(`\\.theme-${mode} \\{([\\s\\S]*?)\\n\\}`))[1];
  themes[mode] = Object.fromEntries([...body.matchAll(/--([\w-]+): (.*);/g)].map((m) => [m[1], m[2]]));
}
// Small supporting text must satisfy the same contrast rule as ordinary text.
themes.observation["text-tertiary"] = themes.observation["text-secondary"];
const role = (size, line, weight = 400) => ({ size, line, weight });
const tokens = {
  schema: 1, unit: "logical-px",
  fontFamily: scss.match(/\$font-native: (.*);/)[1],
  type: {
    "page-title": role(18, 25, 600), "spot-title": role(20, 28, 600),
    section: role(16, 23, 600), body: role(15, 22), "body-secondary": role(14, 21),
    action: role(14, 20, 500), search: role(16, 23), metadata: role(12, 18),
    data: role(18, 25, 500), article: role(16, 26), critical: role(14, 20, 500), display: role(20, 28, 600),
  },
  geometry: {
    "target-min": 44, "icon-small": 18, "icon-medium": 20, "icon-large": 24,
    "page-inset": 16, "map-inset": 12, "space-related": 4, "space-inline": 8, "space-group": 12,
    "space-section": 18, "radius-control": 8, "radius-panel": 12, "radius-sheet": 18,
    "switch-width": 46, "switch-height": 24, "switch-thumb": 20, "switch-inset": 2, "switch-travel": 22,
    "mode-track-height": 36, "mode-track-max-width": 320,
  }, themes,
};
let design = readFileSync(designPath, "utf8");
if (design.includes("<!-- miniapp-tokens:start -->")) throw new Error("source already migrated");
const intro = `### 当前可执行令牌\n\n2026-09-06 用户授权合并手机尺度重构与既有业务收尾。下列结构化段是当前小程序颜色、排版与通用几何的唯一精确值来源；生成器输出 SCSS 与原生 TS，禁止手改生成文件。逻辑 px 固定，不随窄屏缩小；Taro 保持 750 designWidth，生成的 Px 需经实际 WEAPP 编译确认。200% 文字由全部角色成组放大和内容重排实现。既有不可变 selected-source 留作历史来源，当前尺寸不再从旧资源重新投射。组件章节的专用地图/手势几何仍适用，普通字级及通用命中下限统一使用这里的角色。该选择是实施起始尺度，尚不表示手机样板已获用户确认或全页面验证完成。\n\n<!-- miniapp-tokens:start -->\n\`\`\`json\n${JSON.stringify(tokens, null, 2)}\n\`\`\`\n<!-- miniapp-tokens:end -->\n\n`;
design = design.replace("### 1. 设计意图", `${intro.replaceAll("\\`", "`")}### 1. 设计意图`);
const start = design.indexOf("| 角色 | CSS px / rpx |");
const end = design.indexOf("\n- 中文标题", start);
design = design.slice(0, start) + "排版精确值只在上方 `type` 令牌维护：page-title 为页面、spot-title 为地点身份、section 为章节、body 为核心事实、body-secondary 为说明、action 为全部普通操作/筛选、search 为搜索、metadata 为来源时效、data 为关键数值、article 为长文、critical 为影响操作的状态、display 为少量主要展示。旧 type-label/type-caption 等生产类分别投射 action/metadata，不保留另一套数值。核心值/动作/风险不得借用 metadata 缩小。\n" + design.slice(end);
design = design.replace("conclusion 18/25、page 17/23、section 13.5/19、body 12/17、ordinary 11.5/16、compact 10.5/14.5、metadata 10/14、status 9.5/13.5；400/500/600 三档", "按当前结构化 type 角色投射，所有业务文字至少 metadata 下限；400/500/600 三档");
design = design.replace("完整值位于 `tokens.scss` 与 `colors_and_type.css`。", "完整值只在当前可执行令牌的 themes 中维护，`tokens.scss` 与原生主题由此生成；下列旧来源表仅解释既有色彩角色。");
// Keep the descriptive palette provenance, but remove its second precise-value table.
design = design.replace(/\| 角色 \| 值 \| 使用 \|[\s\S]*?(?=\n\n)/g, (table) => table.split("\n").map((line, i) => i === 0 ? "| 角色 | 使用 |" : i === 1 ? "|---|---|" : line.replace(/^(\|[^|]*\|)[^|]*\|/, "$1")).join("\n"));
writeFileSync(designPath, design);
