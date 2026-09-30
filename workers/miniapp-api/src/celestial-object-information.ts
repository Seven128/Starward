import { brightStarAliases, deepSkyAliases, saoStarAliases } from "./celestial-object-aliases.ts";
import { skyLuminaryBody, SKY_LUMINARY_NAMES, SKY_LUMINARY_CATALOG_HASH } from "@starward/miniapp-contracts";
import { skyLuminaryReferenceSources } from "./sky-luminary-catalog.ts";
import { MoonTexturePublicationService } from "./moon-texture-publication.ts";
import { skyVenusAppearanceSource } from "./sky-planet-catalog.ts";
import { createHash, randomUUID } from "node:crypto";
import {
  deepSkyRowByReference,
  loadDeepSkyCatalog,
} from "@starward/astronomy-core/deep-sky-catalog";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { isCelestialObjectReference, isSaoStarReference, skyPlanetBody, SKY_PLANET_NAMES, SKY_PLANET_CATALOG_HASH } from "@starward/miniapp-contracts";
import { loadSaoCatalog } from "./sao-catalog-provider.ts";
import type {
  ApiEnvelope,
  CelestialObjectInformation,
  SourceSummary,
  DeepSkyImageSelection,
} from "@starward/miniapp-contracts";
import { bsc5pCatalogSources } from "./sky-scene-catalog-provider.ts";
import { deepSkyCatalogSource } from "./deep-sky-scene-provider.ts";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";
import { SdssOpticalImageryService } from "./sdss-optical-imagery.ts";
import { skyJupiterBandSource, skyJupiterShapeSource, skyPlanetSource,
  skyUranusBandSource, skyNeptuneBandSource, skySaturnBandSource, skySaturnRingSource, skySaturnShapeSource } from "./sky-planet-catalog.ts";
import { loadChineseStarAliasesForBase } from "./chinese-star-alias-publication.ts";

const EDITORIAL_REVISION = "starward-celestial-editorial-zh-cn@2";
const PLANET_EDITORIAL_REVISION = "starward-planet-details-zh-cn@7";
const SAO_PRESENTATION_REVISION = "sao-details-zh-cn@2";
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

function envelope(data: CelestialObjectInformation, sources: readonly SourceSummary[],
  dataState: "FRESH" | "PARTIAL" = "FRESH", warnings: string[] = []): ApiEnvelope<CelestialObjectInformation> {
  const generatedAt = new Date().toISOString();
  return {
    apiVersion: "v2",
    data,
    dataState,
    generatedAt,
    validAt: null,
    etag: `W/"${digest(data).slice(0, 24)}"`,
    sources,
    warnings,
    requestId: `celestial:${randomUUID()}`,
  };
}

export class CelestialObjectInformationService {
  private readonly cache = new Map<string, ApiEnvelope<CelestialObjectInformation>>();

  constructor(private readonly imagery = new DeepSkyImageryService(),
    private readonly optical = new SdssOpticalImageryService(),
    private readonly moon = new MoonTexturePublicationService()) {}

  get(reference: string, locale = "zh-CN", catalogVersion: "bsc5p-bright-stars.v2" | "bsc5p-bright-stars.v3" = "bsc5p-bright-stars.v2",moonTextureVersion?:"coverage-v2",
    imageSelection: DeepSkyImageSelection = {}) {
    if (!isCelestialObjectReference(reference))
      throw new Error("celestial_object_reference_invalid");
    if (locale !== "zh-CN") throw new Error("celestial_object_locale_unsupported");
    const cacheKey = `${reference}:${locale}:${catalogVersion}:${moonTextureVersion??"legacy-v1"}:${imageSelection.imageVersion ?? "legacy-image"}:${imageSelection.publicationHash ?? "current"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return structuredClone(cached);
    const luminary = skyLuminaryBody(reference);
    if (luminary) {
      let moonManifest: ReturnType<MoonTexturePublicationService["manifest"]|MoonTexturePublicationService["coverageManifest"]> | undefined;
      let publicationUnavailable = false;
      if (luminary === "MOON") {
        try { moonManifest = moonTextureVersion==="coverage-v2"?this.moon.coverageManifest():this.moon.manifest(); } catch { publicationUnavailable = true; }
      }
      const names = SKY_LUMINARY_NAMES[luminary], sources = skyLuminaryReferenceSources(luminary, moonManifest);
      const data: CelestialObjectInformation = {
        reference, kind: names.kind, displayName: names.zh, catalogId: names.en,
        aliases: names.aliases, introduction: null, contentState: "BASIC_ONLY",
        contentRevision: digest({ catalog: SKY_LUMINARY_CATALOG_HASH, editorial: "sun-moon@1", sources, luminary, locale }).slice(0,24),
        facts: [{ label: "类别", value: luminary === "SUN" ? "恒星" : "地球的天然卫星", unit: null }],
        sources,
        limitations: ["当前位置、相位与视直径使用所选地点和时刻的观测报告；静态身份不代表现场可见。",
          luminary === "SUN" ? "星图为单波段历史平均临边模型及显示配色，不是实时日面、自然真彩、黑子或日冕。"
            : moonTextureVersion==="coverage-v2"
              ? "高倍率月面采用Clementine历史750nm灰阶图，配合同刻本体方向与月相；不是实时或自然彩色月面。中低纬和极区缺测处使用统一灰色盘面示意，不补出地貌；部分覆盖按有效面积混合。"
              : "高倍率月面采用有独立来源说明的Clementine历史750nm灰阶图，配合同刻本体方向与月相；不是实时或自然彩色月面。原始影像在中低纬和极区均有缺测，部分显示为黑色矩形，不代表真实地貌或当前阴影。"],
      };
      const result = envelope(data, sources, publicationUnavailable ? "PARTIAL" : "FRESH",
        publicationUnavailable ? ["moon_texture_publication_unavailable"] : []);
      if (!publicationUnavailable) this.cache.set(cacheKey, result);
      return structuredClone(result);
    }
    const planet = skyPlanetBody(reference);
    if (planet) {
      const names = SKY_PLANET_NAMES[planet];
      const sources = planet === "JUPITER" ? [skyPlanetSource,skyJupiterShapeSource,skyJupiterBandSource]
        : planet === "SATURN" ? [skyPlanetSource,skySaturnShapeSource,skySaturnRingSource,skySaturnBandSource]
          : planet === "URANUS" ? [skyPlanetSource,skyUranusBandSource]
          : planet === "NEPTUNE" ? [skyPlanetSource,skyNeptuneBandSource]
          : planet === "VENUS" ? [skyPlanetSource, skyVenusAppearanceSource]
          : [skyPlanetSource];
      const data: CelestialObjectInformation = {
        reference, kind: "PLANET", displayName: names.zh, catalogId: names.en,
        aliases: [names.zh, names.en, reference], introduction: null,
        facts: [{ label: "类别", value: "太阳系行星", unit: null }],
        contentState: "BASIC_ONLY",
        contentRevision: digest({ catalog: SKY_PLANET_CATALOG_HASH, editorial: PLANET_EDITORIAL_REVISION, planet, locale }).slice(0, 24),
        sources,
        limitations: ["当前仅提供静态身份资料；方位、相位、视星等和视直径随观测地点与时刻变化，应读取当前观测报告。",
          planet === "MARS" ? "此资料页不提供表面图；星图中可按需加载有独立来源说明的火星历史影像，不代表实时或自然真彩。"
            : planet === "MERCURY" ? "此资料页不提供表面图；星图中可按需加载有独立来源说明的水星历史 750 nm 灰阶影像，不代表实时或自然彩色。"
            : planet === "JUPITER" ? "星图按木星赤道和极半径绘制扁球轮廓及相位；高倍率可显示2024年HST OPAL历史纬度云带，已移除全部经度细节，不表示当前大红斑位置、实时云系或自然真彩。"
            : planet === "SATURN" ? "星图按土星1-bar扁球和环尺寸、同刻观察几何绘制轮廓与相位；高倍率可显示2025年HST OPAL历史纬度云带，已移除经度细节，环遮挡及极区缺图回退基础盘面。云带不是实时天气、自然真彩或当前环影，环不是实拍纹理。"
              : planet === "URANUS" || planet === "NEPTUNE" ? "高倍率可显示2025年HST OPAL历史纬度色带，已移除经度结构；未观测纬度回退基础盘面，不表示实时天气或自然真彩。本体轴无效或缺图时仍保留有效位置与相位。"
              : planet === "VENUS" ? skyVenusAppearanceSource.limitations.join(" ")
              : "此资料页不提供表面纹理；星图球面按当前相位计算示意。"],
      };
      const result = envelope(data, sources);
      this.cache.set(cacheKey, result);
      return structuredClone(result);
    }
    if (isSaoStarReference(reference)) {
      const {catalog,source}=loadSaoCatalog(catalogVersion),star=catalog.get(reference);
      if (!star) throw new Error("celestial_object_not_found");
      const label=reference.replace(':',' '),sources=[source];

      const data:CelestialObjectInformation={reference,kind:'STAR',displayName:label,catalogId:label,
        aliases:saoStarAliases(star),
        introduction:null,contentState:'BASIC_ONLY',contentRevision:digest({catalog:catalog.catalogHash,editorial:EDITORIAL_REVISION,presentation:SAO_PRESENTATION_REVISION,locale}).slice(0,24),
        facts:[{label:'视星等（视觉测光）',value:star.visualMagnitude.toFixed(2),unit:'mag'},
          ...(star.spectralType?[{label:'光谱型',value:star.spectralType === '+++' ? '复合、变化或特殊光谱（目录未区分）' : star.spectralType,unit:null}]:[])],sources,
        limitations:['保留原始视觉星等，未转换为统一 Johnson V。',
          '当前只有目录基本资料，尚无已采用的中文介绍；未提供本层采用的距离或色指数。']};
      const result=envelope(data,sources);this.cache.set(cacheKey,result);
      if(this.cache.size>256)this.cache.delete(this.cache.keys().next().value!);
      return structuredClone(result);
    }
    const deepSkyRow = deepSkyRowByReference(reference);
    if (deepSkyRow) {
      const catalog = loadDeepSkyCatalog();
      let imagerySource: SourceSummary | null = null;
      let imageryUnavailable = false;
      try { imagerySource = this.imagery.source(reference, imageSelection); }
      catch { imageryUnavailable = true; /* Catalog facts remain independent of the selected image publication. */ }
      if (imageSelection.publicationHash && !imagerySource) imageryUnavailable = true;
      let opticalSource: SourceSummary | null = null, opticalUnavailable = false;
      try { opticalSource = this.optical.source(reference); } catch { opticalUnavailable = true; }
      const sources = [deepSkyCatalogSource(), ...(imagerySource ? [imagerySource] : []), ...(opticalSource ? [opticalSource] : [])];
      const introduction = INTRODUCTIONS[reference] ?? null;
      const aliases = deepSkyAliases(deepSkyRow);
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
        contentRevision: digest({ catalog: catalog.catalogHash, sources, editorial: EDITORIAL_REVISION, locale }).slice(0, 24),
        sources,
        limitations: [
          "目录资料使用ICRS J2000静态坐标与角尺寸；当前地点和时刻的方位需使用对应天空帧。",
          "目录星等和角尺寸不代表肉眼、望远镜或相机在当前天气与光污染下必然可见。",
          ...(introduction ? [] : ["当前只有目录基本资料，尚无已采用的中文介绍。"]),
          ...(imageryUnavailable ? ["当前选择的影像出版版本来源暂不可用；目录资料仍可读取，请重试来源。"] : []),
          ...(opticalUnavailable ? ["当前天体的光学影像来源暂不可用；目录资料与其它已取得的来源仍可读取，请重试来源。"] : []),
        ],
      };
      const warnings = [
        ...(imageryUnavailable ? ["deep_sky_image_publication_unavailable"] : []),
        ...(opticalUnavailable ? ["sdss_optical_publication_unavailable"] : []),
      ];
      const result = envelope(data, sources, warnings.length ? "PARTIAL" : "FRESH", warnings);
      if (imagerySource && !warnings.length) this.cache.set(cacheKey, result);
      if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value!);
      return structuredClone(result);
    }
    const catalog = loadBsc5pStarCatalog(catalogVersion);
    const row = catalog.rows.find(candidate => candidate.sourceId === reference);
    if (!row) throw new Error("celestial_object_not_found");
    let chinese: ReturnType<typeof loadChineseStarAliasesForBase> | null = null;
    try { chinese = loadChineseStarAliasesForBase(catalogVersion); } catch { /* Independent BSC facts remain available. */ }
    const sources = [...bsc5pCatalogSources(catalog), ...(chinese ? [chinese.source] : [])];
    const introduction = INTRODUCTIONS[reference] ?? null;
    const aliases = brightStarAliases(row, chinese?.aliasesFor(reference));
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
      contentRevision: digest({ catalog: catalog.catalogHash, chineseAliases: chinese?.catalogHash ?? null,
        editorial: EDITORIAL_REVISION, locale }).slice(0, 24),
      sources,
      limitations: [
        "目录资料是恒星的静态身份与测量值；当前地点和时刻的方位需使用对应天空帧。",
        ...(row.vMagCode ? [`原始测光标记 ${row.vMagCode}；未转换为统一 Johnson V 测光。`] : []),
        ...(row.vMagUncertainty ? ["目录视星等带有原始不确定标记。"] : []),
        ...(row.bVUncertainty ? ["目录色指数带有原始不确定标记。"] : []),
        ...(introduction ? [] : ["当前只有目录基本资料，尚无已采用的中文介绍。"]),
        ...(chinese ? [] : ["中文恒星别名出版物暂不可用，现仅显示原有目录名与已审别名。"]),
      ],
    };
    const result = envelope(data, sources, chinese ? "FRESH" : "PARTIAL",
      chinese ? [] : ["中文恒星别名暂不可用，请稍后重试。"]);
    if (chinese) this.cache.set(cacheKey, result);
    if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value!);
    return structuredClone(result);
  }
}
