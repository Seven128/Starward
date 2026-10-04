import { readFile, writeFile } from "node:fs/promises";
import { loadBsc5pBrightStarCatalog } from "../../../packages/astronomy-core/src/bsc5p-catalog.ts";

const source = JSON.parse(await readFile(new URL("./evidence/wikidata-chinese-name-probe.json", import.meta.url), "utf8"));
const byHr = new Map(loadBsc5pBrightStarCatalog().rows.map(row => [Number(row.hr), row]));
const rows = source.rows.map(item => ({ ...item, hr: Number(/^HR (\d+)$/u.exec(item.code)?.[1]) })).filter(item =>
  Number.isInteger(item.hr) && byHr.has(item.hr) && /\p{Script=Han}/u.test(item.label) &&
  item.label.length <= 32 && !/[\x00-\x1f]/u.test(item.label));
const keys = new Map();
for (const row of rows) {
  const list = keys.get(row.hr) ?? [];
  list.push(row);
  keys.set(row.hr, list);
}
const ambiguousHr = [...keys].filter(([, values]) => new Set(values.map(row => row.item)).size > 1);
const itemToHr = new Map();
for (const row of rows) {
  const list = itemToHr.get(row.item) ?? new Set();
  list.add(row.hr);
  itemToHr.set(row.item, list);
}
const ambiguousItems = [...itemToHr].filter(([, hrs]) => hrs.size > 1);
const labelToHr = new Map();
for (const row of rows) {
  const list = labelToHr.get(row.label) ?? new Set();
  list.add(row.hr);
  labelToHr.set(row.label, list);
}
const ambiguousLabels = [...labelToHr].filter(([, hrs]) => hrs.size > 1);
const clean = [...keys].filter(([hr, values]) => !ambiguousHr.some(([other]) => hr === other) &&
  !ambiguousItems.some(([item]) => values[0].item === item)).map(([hr, values]) => ({
    reference: `HR:${hr}`, labels: [...new Set(values.map(row => row.label))],
    wikidataItem: values[0].item, properName: byHr.get(hr).properName }));
const evidence = { at: new Date().toISOString(), sourceRetrievedAt: source.retrievedAt,
  inputRows: source.rows.length, matchedChineseRows: rows.length, distinctHrs: keys.size,
  ambiguousHrCount: ambiguousHr.length, ambiguousItemCount: ambiguousItems.length,
  ambiguousLabelCount: ambiguousLabels.length,
  cleanCount: clean.length, ambiguousHrExamples: ambiguousHr.slice(0, 30),
  ambiguousItemExamples: ambiguousItems.slice(0, 30).map(([item, hrs]) => ({ item, hrs: [...hrs] })),
  ambiguousLabelExamples: ambiguousLabels.slice(0, 30).map(([label, hrs]) => ({ label, hrs: [...hrs] })),
  cleanExamples: clean.slice(0, 50), clean };
await writeFile(new URL("./evidence/wikidata-chinese-name-analysis.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ inputRows: evidence.inputRows, matchedChineseRows: evidence.matchedChineseRows,
  distinctHrs: evidence.distinctHrs, ambiguousHrCount: evidence.ambiguousHrCount,
  ambiguousItemCount: evidence.ambiguousItemCount,
  ambiguousLabelCount: evidence.ambiguousLabelCount, cleanCount: evidence.cleanCount,
  ambiguousHrExamples: evidence.ambiguousHrExamples.slice(0, 4), ambiguousLabelExamples: evidence.ambiguousLabelExamples.slice(0, 5),
  cleanExamples: evidence.cleanExamples.slice(0, 15) }));
