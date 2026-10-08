import type { OpticalHipsManifestData } from "./api-shapes.ts";

export interface OpticalHipsRightsData {
  schemaVersion: "starward-optical-hips-rights-v1" | "starward-optical-hips-rights-v2";
  publicationHash: string;
  scope: "TRIAL" | "PRODUCTION";
  offerChoice: "ODbL-1.0 4.6(b)";
  sources: Array<{
    sourceId: string;
    database: { title:string; creator:string; copyright:string; doi:string|null; creatorDid?:string; license:"ODbL-1.0";
      licenseUrl:string; recordUrl:string; notice:string };
    originalContent: { copyright:string; grantUrl:string; rights:string; acknowledgementUrl:string;
      acknowledgement:string; sourceAcknowledgement:string;
      sourceProperties:{bytes:number;sha256:string;utf8:string} };
    originalMaster: string;
    sourceInstancePolicy: string;
  }>;
  alterations: {
    type: string;
    pixelBytes: "UNCHANGED";
    selectedTiles: Array<{ sourceId:string; order:number; pixel:number; originalUrl:string;
      sha256:string; bytes:number; localPublishedFile:string; exactVersionDownloadUrl:string }>;
    completeResultMetadata: {
      manifest: OpticalHipsRightsMetadata;
      indexes: OpticalHipsRightsMetadata[];
    };
    reproductionMethod: string[];
  };
}
export interface OpticalHipsRightsMetadata { file:string; bytes:number; sha256:string; utf8:string }
export interface OpticalHipsRightsReferenceData {
  publicationHash:string; sha256:string; bytes:number; downloadUrl:string;
}

const text=(value:unknown):value is string=>typeof value==="string"&&value.trim().length>0;
const sha=(value:unknown):value is string=>typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value);
const keys=(value:unknown,names:string[])=>value!==null&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).sort().join("\0")===[...names].sort().join("\0");
const url=(value:unknown)=>typeof value==="string"&&/^https:\/\/[^\s/@]+(?:\/[^\s]*)?$/u.test(value);
const metadata=(value:OpticalHipsRightsMetadata,file:string,bytes?:number,digest?:string)=>
  keys(value,["file","bytes","sha256","utf8"])&&value.file===file&&
  Number.isSafeInteger(value.bytes)&&value.bytes>0&&sha(value.sha256)&&text(value.utf8)&&
  (bytes===undefined||value.bytes===bytes)&&(digest===undefined||value.sha256===digest);

/** Separate content permission from database licensing; bind every notice and
 * download to the selected version. Byte reconstruction is checked by its
 * publication owner, where SHA-256 and exact original metadata are available. */
export function assertOpticalHipsRights(value:unknown,root:Pick<OpticalHipsManifestData,"publicationHash"|"scope">&{
  schemaVersion?:OpticalHipsManifestData["schemaVersion"];
  sources:readonly OpticalHipsManifestData["sources"][number][];
  shards:readonly OpticalHipsManifestData["shards"][number][];
}):asserts value is OpticalHipsRightsData {
  const rights=value as OpticalHipsRightsData;
  const v2=root.schemaVersion==="starward-optical-hips-v2";
  const fail=()=>{throw new Error("optical_rights_invalid");};
  if(!keys(rights,["schemaVersion","publicationHash","scope","offerChoice","sources","alterations"])||
    rights.schemaVersion!==(v2?"starward-optical-hips-rights-v2":"starward-optical-hips-rights-v1")||rights.publicationHash!==root.publicationHash||
    rights.scope!==root.scope||rights.offerChoice!=="ODbL-1.0 4.6(b)"||!Array.isArray(rights.sources)||rights.sources.length!==root.sources.length)fail();
  const ids=new Set<string>();
  for(const notice of rights.sources){
    const source=root.sources.find(a=>a.id===notice?.sourceId);
    if(!source||ids.has(notice.sourceId)||!keys(notice,["sourceId","database","originalContent","originalMaster","sourceInstancePolicy"]))fail();
    ids.add(notice.sourceId);
    const db=notice.database,content=notice.originalContent;
    if(!keys(db,["title","creator","copyright","doi","license","licenseUrl","recordUrl","notice",...v2?["creatorDid"]:[]])||
      v2&&db.creatorDid!==source!.hipsCreatorDid||
      ![db.title,db.creator,db.copyright,db.notice].every(text)||db.doi!==source!.hipsDoi||
      db.license!=="ODbL-1.0"||db.licenseUrl!=="https://opendatacommons.org/licenses/odbl/1-0/"||!url(db.recordUrl)||
      !keys(content,["copyright","grantUrl","rights","acknowledgementUrl","acknowledgement","sourceAcknowledgement","sourceProperties"])||
      ![content.copyright,content.rights,content.acknowledgement,content.sourceAcknowledgement,notice.sourceInstancePolicy].every(text)||
      !url(content.grantUrl)||!url(content.acknowledgementUrl)||!url(notice.originalMaster)||
      !keys(content.sourceProperties,["bytes","sha256","utf8"])||!Number.isSafeInteger(content.sourceProperties.bytes)||
      content.sourceProperties.bytes<=0||!sha(content.sourceProperties.sha256)||!text(content.sourceProperties.utf8))fail();
    if(v2){
      const did=content.sourceProperties.utf8.split(/\r?\n/u).map(line=>line.match(/^creator_did\s*=\s*(.*?)\s*$/u)?.[1]).find(Boolean);
      if(did!==source!.hipsCreatorDid)fail();
    }
  }
  const a=rights.alterations;
  if(!keys(a,["type","pixelBytes","selectedTiles","completeResultMetadata","reproductionMethod"])||!text(a.type)||
    a.pixelBytes!=="UNCHANGED"||!Array.isArray(a.selectedTiles)||
    a.selectedTiles.length!==root.shards.reduce((n,s)=>n+s.tileCount,0)||
    !Array.isArray(a.reproductionMethod)||!a.reproductionMethod.length||!a.reproductionMethod.every(text)||
    !keys(a.completeResultMetadata,["manifest","indexes"])||
    !metadata(a.completeResultMetadata.manifest,"manifest.json",undefined,root.publicationHash)||
    !Array.isArray(a.completeResultMetadata.indexes)||a.completeResultMetadata.indexes.length!==root.shards.length)fail();
  const files=new Set<string>();
  for(const m of a.completeResultMetadata.indexes){
    const ref=root.shards.find(s=>s.file===m?.file);
    if(!ref||files.has(m.file)||!metadata(m,ref.file,ref.bytes,ref.sha256))fail();
    files.add(m.file);
  }
  const tiles=new Set<string>();
  for(const tile of a.selectedTiles){
    const source=root.sources.find(s=>s.id===tile?.sourceId),notice=rights.sources.find(s=>s.sourceId===tile?.sourceId);
    const key=`${tile.sourceId}:${tile.order}:${tile.pixel}`;
    if(!source||!notice||!keys(tile,["sourceId","order","pixel","originalUrl","sha256","bytes","localPublishedFile","exactVersionDownloadUrl"])||
      !Number.isInteger(tile.order)||tile.order<0||tile.order>source.maxOrder||!Number.isInteger(tile.pixel)||tile.pixel<0||
      tile.pixel>=12*4**tile.order||tiles.has(key)||!sha(tile.sha256)||!Number.isSafeInteger(tile.bytes)||tile.bytes<=0)fail();
    const suffix=`Norder${tile.order}/Dir${Math.floor(tile.pixel/10000)*10000}/Npix${tile.pixel}.${source!.format==="jpeg"?"jpg":"png"}`;
    if(tile.localPublishedFile!==`${tile.sourceId}/${suffix}`||tile.originalUrl!==`${notice!.originalMaster}/${suffix}`||
      tile.exactVersionDownloadUrl!==`/v2/sky/optical/${root.publicationHash}/${tile.sourceId}/${tile.order}/${tile.pixel}`)fail();
    tiles.add(key);
  }
}
