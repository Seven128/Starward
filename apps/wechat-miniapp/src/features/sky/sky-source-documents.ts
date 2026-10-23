import { MINIAPP_API_BASE_PATH, type ConstellationCatalogPublication, type GalacticImageManifestData,
  type SourceSummary, type WideFieldW3ManifestData } from "@starward/miniapp-contracts";
import type { SourceDocument } from "@/utils/source-document";
import { constellationAssetUrl } from "@/services/sky-catalog-api";
import { galacticImageManifestUrl } from "@/services/galactic-image-client";
import { skyLandscapeAssetUrl } from "@/services/sky-landscape-client";
import { wideFieldW3TileUrl } from "@/services/wide-field-w3-client";
import type { SkyPanoramaMask } from "./sky-landscape-mask";

/** Presentation adapters only: selected publications and source eligibility stay
 * with the existing query, native-image and painted-frame owners. */
export function skyConstellationSourceDocument(catalog: {
  data: ConstellationCatalogPublication; sources: readonly SourceSummary[];
}): SourceDocument {
  const links = catalog.sources.flatMap(source => {
    const file = source.id.startsWith("constellation-geometry:") ? catalog.data.geometryAsset.file
      : source.id.startsWith("constellation:") ? "constellation_names.eng.fab" : null;
    return file ? [{ label: source.id.startsWith("constellation-geometry:") ? "星座几何数据" : "星座名称数据",
      url: constellationAssetUrl(catalog.data.catalogHash, file), download: true }] : [];
  });
  return { title: "来源", subtitle: "星座资料", sources: catalog.sources,
    ...(links.length ? { sections: [{ kind: "links", title: "当前资料", items: links }] } : {}) };
}

export function skyStellarSupplementSourceDocument(sources: readonly SourceSummary[]): SourceDocument {
  return { title: "来源", subtitle: "暗星资料", sources };
}

export function skySolarLightSourceDocument(): SourceDocument {
  return { title: "来源", subtitle: "太阳显示模型", sources: [], sections: [
    { kind: "text", paragraphs: [
      "太阳边缘明暗采用历史 579.88 nm 单波段临边昏暗模型（Neckel / Labs，Hestroffer / Magnan 1998）；颜色为显示配色，不是实时日面、自然真彩或测光结果。",
    ] },
    { kind: "links", items: [{ label: "太阳模型出处", url: "https://legacy.adsabs.harvard.edu/pdf/1998A%26A...333..338H" }] },
  ] };
}

export function skyLandscapeSourceDocument(photo: Pick<SkyPanoramaMask, "publication" | "resource">): SourceDocument {
  const { publication, resource } = photo;
  return { title: "来源", subtitle: "地面图片", sources: [], sections: [
    { kind: "facts", title: "图片与权利", items: [
      { label: "图片", value: publication.source.title },
      { label: "作者", value: publication.source.author },
      { label: "署名", value: publication.source.credit },
      { label: "原包许可", value: publication.source.packageLicense },
      { label: "来源目录许可", value: publication.source.registryLicense },
      { label: "派生图片许可", value: publication.source.derivativeLicense },
    ] },
    { kind: "text", title: "处理与适用范围", paragraphs: [
      "历史斯洛伐克草地全景经缩小、透明度编码及显示曝光处理；原包标注 CC BY 4.0，来源目录标注 CC BY-SA 4.0，图片派生物按 CC BY-SA 4.0 提供。它不是所选观星点的现场照片或遮挡测量。",
      publication.processing, ...publication.limitations,
    ] },
    { kind: "links", items: [
      { label: "图片条款", url: publication.source.rightsUrl },
      { label: "原始来源", url: publication.source.originalUrl },
      { label: "当前图片", url: skyLandscapeAssetUrl(resource.image.downloadUrl), download: true },
      { label: "原包", url: skyLandscapeAssetUrl(publication.source.originalDownloadUrl), download: true },
    ] },
  ] };
}

export function skyGalacticSourceDocument(publication: GalacticImageManifestData): SourceDocument {
  const infrared = publication.schemaVersion === "starward-2mass-galactic-v1";
  return { title: "来源", subtitle: "银河图片", sources: [], sections: [
    { kind: "facts", title: "图片与权利", items: [
      { label: "图片", value: publication.source.title },
      { label: "提供方", value: publication.source.provider },
      { label: "署名", value: publication.source.credit },
      ...(!infrared && "grant" in publication.source ? [{ label: "授权范围", value: publication.source.grant }] : []),
    ] },
    { kind: "text", title: "处理与适用范围", paragraphs: [
      infrared ? "历史 J/H/K 近红外伪彩色图，不是可见光、实时天空或现场可见性；缩放细节限于 2048×1024 图。"
        : "历史光学银河显示图，按名义 J2000 赤道坐标定位；不是实时天空或通用高清巡天。制作方完整处理、科学有效性和绝对配准尚未验证，黑像素不表示真实零亮度或缺测。",
      publication.processing,
      infrared ? "局部放大时对全景背景作平滑显示；原图中的红外点源不作为可点选恒星，恒星身份以目录为准。此显示处理不修改原始影像或补足缺测。"
        : "图片中的点源不提供可点选恒星身份，独立星表保持；不以该图补一般区域或照片外沿的高清细节。",
      ...publication.limitations,
    ] },
    { kind: "links", items: [
      { label: "原始图", url: publication.source.recordUrl },
      { label: "使用条款", url: publication.source.rightsUrl },
      ...(infrared && "galleryRightsUrl" in publication.source
        ? [{ label: "2MASS 图库公有领域声明", url: publication.source.galleryRightsUrl }] : []),
      { label: "数据清单", url: galacticImageManifestUrl(publication.publicationHash), download: true },
    ] },
  ] };
}

export function skyWideFieldSourceDocument(publication: WideFieldW3ManifestData): SourceDocument {
  return { title: "来源", subtitle: "所选红外图层", sources: [], sections: [
    { kind: "facts", title: "影像与权利", items: [
      { label: "影像", value: publication.source.title },
      { label: "原影像权利", value: publication.source.originalCopyright },
      { label: "HiPS 权利", value: publication.source.hipsCopyright },
      { label: "HiPS 许可", value: publication.source.hipsLicense },
    ] },
    { kind: "text", title: "处理与适用范围", paragraphs: [
      "2010 年历史红外资料，不是肉眼可见光、实时天空或现场可见性。仅有第 0 阶低分辨率影像。",
      publication.source.acknowledgment, publication.processing, ...publication.limitations,
    ] },
    { kind: "links", items: [
      { label: "原始来源", url: publication.source.recordUrl },
      { label: "原影像条款", url: publication.source.originalRightsUrl },
      { label: "HiPS 许可", url: publication.source.hipsLicenseUrl },
      { label: "数据清单", url: wideFieldW3TileUrl(`${MINIAPP_API_BASE_PATH}/sky/wide-field/manifest`), download: true },
    ] },
  ] };
}
