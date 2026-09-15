import type { RecentWeatherDay } from "@starward/miniapp-contracts";

/** Regional facts support conditional relevance, never on-site access assertions. */
export function recentWeatherImplications(days: readonly RecentWeatherDay[]): string[] {
  const messages: string[] = [];
  if (days.some(day => day.precipitationMm !== null && day.precipitationMm > 0))
    messages.push("近期有降水，未铺装地面可能湿滑；实际路况需现场确认。");
  if (days.some(day => day.temperatureMinC !== null && day.temperatureMinC <= 0))
    messages.push("近期出现低温，潮湿路段可能结冰；不代表现场已经结冰。");
  return messages;
}

export function recentWeatherFacts(day: RecentWeatherDay): string[] {
  const facts: string[] = [];
  if (day.precipitationMm !== null) facts.push(`降水 ${day.precipitationMm} mm`);
  if (day.temperatureMinC !== null) facts.push(`最低 ${day.temperatureMinC}°C`);
  if (day.temperatureMaxC !== null) facts.push(`最高 ${day.temperatureMaxC}°C`);
  if (day.sampledWindMaxKph != null) facts.push(`已返回 ${day.sampledWindHours} 小时中最大风速 ${day.sampledWindMaxKph} km/h`);
  if (day.conditions.length) facts.push(`已返回时段：${day.conditions.join("、")}`);
  return facts;
}
