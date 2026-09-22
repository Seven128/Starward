import {createHash} from 'node:crypto';

export interface SaoStarRow {
  sourceId:string;visualMagnitude:number;raDeg:number;decDeg:number;
  pmRaCosDecArcsecYr:number;pmDecArcsecYr:number;visualMagnitudeReference:number;remarks:number;
  hd:string|null;hdComponent:string|null;spectralType:string|null;
}
type RawRow=readonly [string,number,number,number,number,number,number,number,string|null,string|null,string|null];
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const fail=(why:string):never=>{throw new Error(`sao_catalog_invalid:${why}`);};
const FIELDS=['sourceId','visualMagnitude','raJ2000Deg','decJ2000Deg','pmRaCosDecArcsecYr','pmDecArcsecYr','visualMagnitudeReference','remarks','hd','hdComponent','spectralType'];

/** Node-only scientific source owner. BFF chooses the fixed local asset file;
 * this module accepts no URL and imports no client contracts or product page.
 */
export function parseSaoCatalog(bytes:Uint8Array,expected:{catalogHash:string;baseCatalogVersion:string;baseAssetSha256:string}){
  if(createHash('sha256').update(bytes).digest('hex')!==expected.catalogHash)fail('source_hash');
  const pack=JSON.parse(Buffer.from(bytes).toString('utf8'));
  if(pack.schemaVersion!=='sao-visual-supplement-v1'||pack.catalogVersion!=='sao-visual-supplement.v1'||
    pack.frame!=='FK5'||pack.referenceEpoch!==2000||pack.magnitudeBand!=='VISUAL'||pack.magnitudeLimit!==10||
    pack.baseCatalogVersion!==expected.baseCatalogVersion||pack.baseAssetSha256!==expected.baseAssetSha256||
    JSON.stringify(pack.rowFields)!==JSON.stringify(FIELDS)||!Array.isArray(pack.rows)||pack.rows.length!==246280)fail('shape');
  const byId=new Map<string,RawRow>();let previous=0;
  for(const r of pack.rows){
    if(!Array.isArray(r)||r.length!==11||typeof r[0]!=='string'||!/^SAO:[1-9]\d{0,5}$/u.test(r[0])||
      Number(r[0].slice(4))<=previous||Number(r[0].slice(4))>258997||!r.slice(1,8).every(finite)||
      r[1]<-2||r[1]>10||r[2]<0||r[2]>=360||Math.abs(r[3])>90||!Number.isInteger(r[6])||!Number.isInteger(r[7])||
      r.slice(8).some(v=>v!==null&&(typeof v!=='string'||!v.trim()||v.length>100)))fail('row');
    previous=Number(r[0].slice(4));byId.set(r[0],Object.freeze(r) as unknown as RawRow);
  }
  return Object.freeze({catalogVersion:pack.catalogVersion as string,catalogHash:expected.catalogHash,rowCount:byId.size,
    get(reference:string):Readonly<SaoStarRow>|null{
      const r=byId.get(reference);if(!r)return null;
      return Object.freeze({sourceId:r[0],visualMagnitude:r[1],raDeg:r[2],decDeg:r[3],pmRaCosDecArcsecYr:r[4],pmDecArcsecYr:r[5],
        visualMagnitudeReference:r[6],remarks:r[7],hd:r[8],hdComponent:r[9],spectralType:r[10]});
    }});
}
