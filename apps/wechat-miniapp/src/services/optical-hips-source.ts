import {assertOpticalHipsRights,type OpticalHipsRightsData,type OpticalHipsManifestData,type SourceSummary} from "@starward/miniapp-contracts";

export function opticalHipsSourceSelection(params:Record<string,string|undefined>){
  const hash=params.hipsPublicationHash,ids=params.hipsSourceIds?.split(",");
  if(!hash||!/^[a-f0-9]{64}$/u.test(hash)||!ids?.length||ids.length>4||
    ids.some(id=>!/^[a-z0-9-]{1,40}$/u.test(id))||new Set(ids).size!==ids.length||
    ["reference","imagePublicationHash","opticalPublicationHash","preparedPublicationHash"].some(key=>params[key]!==undefined))return null;
  return {hash,ids};
}
export function opticalHipsSourceRoute(hash:string,ids:readonly string[]){
  if(!opticalHipsSourceSelection({hipsPublicationHash:hash,hipsSourceIds:ids.join(",")}))throw new Error("optical_source_route_invalid");
  return `/sky/sources/index?hipsPublicationHash=${hash}&hipsSourceIds=${encodeURIComponent(ids.join(","))}`;
}
/** Original image permission and processed database permission are distinct. */
export function opticalHipsSources(root:OpticalHipsManifestData,ids:readonly string[],rights?:OpticalHipsRightsData):SourceSummary[]{
  if(rights)assertOpticalHipsRights(rights,root);
  if(ids.some(id=>!root.sources.some(source=>source.id===id)))throw new Error("optical_source_not_published");
  return root.sources.filter(source=>ids.includes(source.id)).flatMap(source=>{
    const notice=rights?.sources.find(value=>value.sourceId===source.id);
    const common={kind:"OPEN_DATA" as const,provider:source.provider,publishedAt:null,retrievedAt:null,validFrom:null,validTo:null,
      state:"FRESH" as const,confidence:null,precision:"历史显示色；科学支持、绝对配准和源分辨率未认证。",limitations:[]};
    return [{...common,id:`optical-hips:${root.publicationHash}:${source.id}:original`,title:`原始观测影像 · ${source.title}`,
      sourceUrl:source.originalDataUrl,license:notice?.originalContent.rights??source.originalRights,
      licenseUrl:notice?.originalContent.grantUrl??source.originalRightsUrl,
      attribution:{name:notice?.originalContent.copyright??source.provider,url:source.originalDataUrl,
        statements:notice?[notice.originalContent.sourceAcknowledgement,notice.originalContent.acknowledgement]:[]}},
    {...common,id:`optical-hips:${root.publicationHash}:${source.id}:database`,title:`加工 HiPS 数据库 · ${source.title}`,
      sourceUrl:source.hipsRecordUrl,license:source.hipsLicense,licenseUrl:"https://opendatacommons.org/licenses/odbl/1-0/",
      attribution:{name:(notice?`${notice.database.copyright} · ${notice.database.creator} · `:"")+
          (source.hipsDoi===null?`HiPS 标识 ${source.hipsCreatorDid}`:`HiPS DOI ${source.hipsDoi}`),
        url:source.hipsDoi===null?source.hipsRecordUrl:`https://doi.org/${source.hipsDoi}`,statements:notice?[notice.database.notice,rights!.alterations.type,
          ...rights!.alterations.reproductionMethod,notice.sourceInstancePolicy]:[]}}];
  });
}
