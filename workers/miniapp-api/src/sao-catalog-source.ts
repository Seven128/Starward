import type {SaoSpatialIndex,SourceSummary} from '@starward/miniapp-contracts';

/** One attribution owner for the publication and celestial details. */
export function saoCatalogSource(index:Pick<SaoSpatialIndex,'catalogHash'|'sources'|'acquisition'>):SourceSummary{
  const source=index.sources,dates=index.acquisition.map(a=>a.retrievedAt);
  const retrievedAt=dates.every((v):v is string=>v!==null)?new Date(Math.max(...dates.map(Date.parse))).toISOString():null;
  return Object.freeze({id:`sao:${index.catalogHash}`,kind:'OPEN_DATA',provider:'SAO / ADC / USNO · NASA HEASARC',
    title:'SAO J2000 恒星目录',sourceUrl:source.landingUrl,license:'U.S. government works (NASA dataset metadata)',licenseUrl:source.rightsUrl,
    publishedAt:null,retrievedAt,validFrom:null,validTo:null,state:'FRESH',confidence:null,
    precision:'FK5 J2000及原始自行；保留历史视觉星等',limitations:Object.freeze([source.credit,
      '历史天体测量与视觉测光；不是统一 Johnson V，也不保证完整至10等。',
      '目录没有提供本层采用的 B−V 色指数或恒星距离；显示增强不表示肉眼实际可见。',
      ...(retrievedAt===null?['原始获取时刻未记录；不由文件修改时间推定。']:[])])});
}
