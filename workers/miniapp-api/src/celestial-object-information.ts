import { createHash, randomUUID } from "node:crypto";
import {
  deepSkyRowByReference,
  loadDeepSkyCatalog,
} from "@starward/astronomy-core/deep-sky-catalog";
import { bsc5pRowByReference, loadBsc5pBrightStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { isCelestialObjectReference } from "@starward/miniapp-contracts";
import type {
  ApiEnvelope,
  CelestialObjectInformation,
  SourceSummary,
} from "@starward/miniapp-contracts";
import { bsc5pCatalogSources } from "./sky-scene-catalog-provider.ts";
import { deepSkyCatalogSource } from "./deep-sky-scene-provider.ts";

const EDITORIAL_REVISION = "starward-celestial-editorial-zh-cn@1";
const INTRODUCTIONS: Readonly<Record<string, string>> = Object.freeze({
  "HR:2491": "天狼星是大犬座 α 星，也是 IAU 采用的正式恒星名称。它在当前亮星目录中拥有最低的 V 波段视星等。",
  "HR:7001": "织女星是天琴座 α 星，IAU 正式名称为 Vega。它是北半球夏季夜空中醒目的亮星之一。",
  "HR:424": "北极星是小熊座 α 星，IAU 正式名称为 Polaris。它靠近北天极，常用于辨认北方。",
  "M:31": "仙女座星系是距离银河系最近的大型旋涡星系之一。在暗夜环境中可用肉眼看见它朦胧的核心区域；目录角尺寸描述的是更广阔、较暗的盘面范围。",
  "M:42": "猎户座大星云位于猎户座剑柄区域，是一处明亮的恒星形成区。肉眼可见的朦胧亮斑只是其发光气体结构的一部分。",
});

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function envelope(data: CelestialObjectInformation, sources: readonly SourceSummary[]): ApiEnvelope<CelestialObjectInformation> {
  const generatedAt = new Date().toISOString();
  return {
    apiVersion: "v2",
    data,
    dataState: "FRESH",
    generatedAt,
    validAt: null,
    etag: `W/"${digest(data).slice(0, 24)}"`,
    sources,
    warnings: [],
    requestId: `celestial:${randomUUID()}`,
  };
}

export class CelestialObjectInformationService {
  private readonly cache = new Map<string, ApiEnvelope<CelestialObjectInformation>>();

  get(reference: string, locale = "zh-CN") {
    if (!isCelestialObjectReference(reference))
      throw new Error("celestial_object_reference_invalid");
    if (locale !== "zh-CN") throw new Error("celestial_object_locale_unsupported");
    const cached = this.cache.get(`${reference}:${locale}`);
    if (cached) return structuredClone(cached);
    const deepSkyRow = deepSkyRowByReference(reference);
    if (deepSkyRow) {
      const catalog = loadDeepSkyCatalog();
      const sources = [deepSkyCatalogSource()];
      const introduction = INTRODUCTIONS[reference] ?? null;
      const aliases = [deepSkyRow.ngcName, ...deepSkyRow.commonNames]
        .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
      const facts = [
        { label: "类型", value: deepSkyRow.kind === "GALAXY" ? "星系" : "星云", unit: null },
        ...(deepSkyRow.vMag === null ? [] : [{ label: "V 波段视星等", value: deepSkyRow.vMag.toFixed(2), unit: "mag" }]),
        ...(deepSkyRow.majorAxisArcmin === null ? [] : [{ label: "目录长轴", value: deepSkyRow.majorAxisArcmin.toFixed(1), unit: "角分" }]),
        ...(deepSkyRow.minorAxisArcmin === null ? [] : [{ label: "目录短轴", value: deepSkyRow.minorAxisArcmin.toFixed(1), unit: "角分" }]),
        ...(deepSkyRow.positionAngleDeg === null ? [] : [{ label: "位置角", value: deepSkyRow.positionAngleDeg.toFixed(0), unit: "°" }]),
      ];
      const data: CelestialObjectInformation = {
        reference,
        kind: deepSkyRow.kind,
        displayName: `M ${deepSkyRow.messier}`,
        catalogId: `${deepSkyRow.ngcName} · M ${deepSkyRow.messier}`,
        aliases,
        introduction,
        facts,
        contentState: introduction ? "READY" : "BASIC_ONLY",
        contentRevision: digest({ catalog: catalog.catalogHash, editorial: EDITORIAL_REVISION, locale }).slice(0, 24),
        sources,
        limitations: [
          "目录资料使用ICRS J2000静态坐标与角尺寸；当前地点和时刻的方位需使用对应天空帧。",
          "目录星等和角尺寸不代表肉眼、望远镜或相机在当前天气与光污染下必然可见。",
          ...(introduction ? [] : ["当前只有目录基本资料，尚无已采用的中文介绍。"]),
        ],
      };
      const result = envelope(data, sources);
      this.cache.set(`${reference}:${locale}`, result);
      if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value!);
      return structuredClone(result);
    }
    const row = bsc5pRowByReference(reference);
    if (!row) throw new Error("celestial_object_not_found");
    const catalog = loadBsc5pBrightStarCatalog();
    const sources = bsc5pCatalogSources(catalog);
    const introduction = INTRODUCTIONS[reference] ?? null;
    const aliases = [row.properName, `HR ${row.hr}`, row.hip ? `HIP ${row.hip}` : null, row.hd ? `HD ${row.hd}` : null, row.alternateName]
      .filter((value): value is string => Boolean(value));
    const facts = [
      { label: "V 波段视星等", value: row.vMag.toFixed(2), unit: "mag" },
      ...(row.bV === null ? [] : [{ label: "B−V 色指数", value: row.bV.toFixed(3), unit: "mag" }]),
      ...(row.spectralType ? [{ label: "光谱型", value: row.spectralType, unit: null }] : []),
    ];
    const data: CelestialObjectInformation = {
      reference,
      kind: "STAR",
      displayName: row.properName ?? `HR ${row.hr}`,
      catalogId: `HR ${row.hr}`,
      aliases,
      introduction,
      facts,
      contentState: introduction ? "READY" : "BASIC_ONLY",
      contentRevision: digest({ catalog: catalog.catalogHash, editorial: EDITORIAL_REVISION, locale }).slice(0, 24),
      sources,
      limitations: [
        "目录资料是恒星的静态身份与测量值；当前地点和时刻的方位需使用对应天空帧。",
        ...(row.vMagCode ? [`原始测光标记 ${row.vMagCode}；未转换为统一 Johnson V 测光。`] : []),
        ...(row.vMagUncertainty ? ["目录视星等带有原始不确定标记。"] : []),
        ...(row.bVUncertainty ? ["目录色指数带有原始不确定标记。"] : []),
        ...(introduction ? [] : ["当前只有目录基本资料，尚无已采用的中文介绍。"]),
      ],
    };
    const result = envelope(data, sources);
    this.cache.set(`${reference}:${locale}`, result);
    if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value!);
    return structuredClone(result);
  }
}
