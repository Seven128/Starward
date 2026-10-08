import type { Bsc5pStarRow } from "@starward/astronomy-core/bsc5p-catalog";
import type { DeepSkyCatalogRow } from "@starward/astronomy-core/deep-sky-catalog";
import type { SaoStarRow } from "@starward/astronomy-core/sao-catalog";

// These Chinese names already identify the five adopted editorial introductions.
// Do not infer a Chinese name, or merge components, from a neighbouring record.
export const CELESTIAL_CHINESE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "HR:2491": ["天狼星"], "HR:7001": ["织女星"], "HR:424": ["北极星"],
  "M:31": ["仙女座星系"], "M:42": ["猎户座大星云"],
};
const unique = (values: readonly (string | null | undefined)[]) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

export function brightStarAliases(row: Readonly<Bsc5pStarRow>, chineseAliases: readonly string[] = []) {
  // Q680341 has two unrelated locale labels; its Chinese article and fixed
  // stellar source identify 參宿三. Keep the source snapshot, exclude bad names.
  const qualifiedAliases = row.hr === "1852"
    ? chineseAliases.filter(value => value !== "明铁盖达坂" && value !== "明铁盖达阪")
    : chineseAliases;
  return unique([row.properName, `HR ${row.hr}`, row.hip ? `HIP ${row.hip}` : null,
    row.hd ? `HD ${row.hd}` : null, row.alternateName, ...(CELESTIAL_CHINESE_ALIASES[row.sourceId] ?? []),
    ...qualifiedAliases]);
}
export function deepSkyAliases(row: DeepSkyCatalogRow, chineseAliases: readonly string[] = []) {
  return unique([row.messier === null ? null : `M ${row.messier}`, row.ngcName, ...row.commonNames,
    ...(CELESTIAL_CHINESE_ALIASES[row.objectRef] ?? []), ...chineseAliases]);
}
export function saoStarAliases(row: Readonly<SaoStarRow>) {
  const aliases = [row.sourceId.replace(":", " ")];
  if (row.hd) {
    // HEASARC multiplicity codes are not literal component identifiers.
    const suffix = row.hdComponent === "1" ? "（较亮分量）" : row.hdComponent === "2" ? "（较暗分量）" : "";
    aliases.push(row.hdComponent === "9" ? `HD ${row.hd} / HD ${Number(row.hd) + 1}（联合记录）` : `HD ${row.hd}${suffix}`);
  }
  return aliases;
}
