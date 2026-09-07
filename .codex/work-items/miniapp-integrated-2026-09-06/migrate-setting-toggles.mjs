import { readFileSync, writeFileSync } from "node:fs";
const directory = "apps/wechat-miniapp/src/content/settings/";
let source = readFileSync(directory + "settings-sections.tsx", "utf8");
source = source.replace("Button, Label, Switch, Text, View", "Button, Text, View");
source = 'import { ToggleField } from "@/components/toggle-field";\n' + source;
for (const [id, label, description, checked, onChange] of [
  ["nearby-location-preference", "附近地点", "仅在地图需要定位时询问，可随时改为手动位置", 'preferences.locationPreference === "ASK_ONCE"', '(checked) => updatePreference("locationPreference", checked ? "ASK_ONCE" : "MANUAL_ONLY")'],
  ["departure-condition-reminder", "出发前条件复核", "保存提醒意愿；仅针对已创建的今晚计划", "preferences.departureConditionReminder", '(checked) => updatePreference("departureConditionReminder", checked)'],
  ["contribution-status-reminder", "投稿状态变化", "保存退回补充、接收与拒绝的提醒意愿", "preferences.contributionStatusReminder", '(checked) => updatePreference("contributionStatusReminder", checked)'],
]) {
  const pattern = new RegExp(`<Label\\s+id="${id}"[\\s\\S]*?</Label>`);
  if (!pattern.test(source)) throw new Error(`missing row ${id}`);
  source = source.replace(pattern, `<ToggleField id="${id}" label="${label}"\n            description="${description}"\n            checked={${checked}}\n            onChange={${onChange}}\n          />`);
}
writeFileSync(directory + "settings-sections.tsx", source);
source = readFileSync(directory + "preference-fields.tsx", "utf8");
source = source.replace("Slider, Switch, Text", "Slider, Text");
source = 'import { ToggleField } from "@/components/toggle-field";\n' + source;
let index = 0;
source = source.replace(/<View className="setting-row">[\s\S]*?<Switch[\s\S]*?\/>\s*<\/View>/g, () => {
  const [key, label, description] = [
    ["largeText", "大字模式", "内容重排，不产生页面横向滚动"],
    ["reducedMotion", "减少动态", "即时或不超过 100ms 的等价反馈"],
  ][index++];
  return `<ToggleField label="${label}" description="${description}"\n          checked={preferences.${key}}\n          onChange={(checked) => updatePreference("${key}", checked)}\n        />`;
});
if (index !== 2) throw new Error("expected two accessibility settings");
writeFileSync(directory + "preference-fields.tsx", source);
