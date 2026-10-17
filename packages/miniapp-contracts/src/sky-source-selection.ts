import {isCelestialObjectReference,isDeepSkyObjectReference} from './celestial-identity.ts';
import {isPreparedOpticalReference} from './prepared-native-optical-publication.ts';

export const BODY_IMAGE_REFERENCES={moon:'SOLAR:MOON',mars:'PLANET:MARS',mercury:'PLANET:MERCURY',
  jupiter:'PLANET:JUPITER',saturn:'PLANET:SATURN',uranus:'PLANET:URANUS',neptune:'PLANET:NEPTUNE'} as const;
export type BodyImageReference=typeof BODY_IMAGE_REFERENCES[keyof typeof BODY_IMAGE_REFERENCES];
export function isBodyImageReference(value:unknown):value is BodyImageReference{
  return typeof value==='string'&&Object.values(BODY_IMAGE_REFERENCES).some(reference=>reference===value);
}
/** Object facts may legitimately carry both selected infrared and target-optical
 * editions for that same object. Other source families are mutually exclusive. */
export type SkySourceSelection=
  | {kind:'object';reference:string;imagePublicationHash?:string;opticalPublicationHash?:string}
  | {kind:'prepared';reference:string;publicationHash:string}
  | {kind:'body';reference:BodyImageReference;publicationHash:string}
  | {kind:'hips';publicationHash:string;sourceIds:readonly string[]};
const keys=['reference','imagePublicationHash','opticalPublicationHash','preparedPublicationHash',
  'bodyImagePublicationHash','hipsPublicationHash','hipsSourceIds'] as const;
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);

/** The same codec is used by route builders and native route admission.
 * Unknown unrelated router parameters do not become a selected-source identity. */
export function parseSkySourceSelection(params:Record<string,unknown>):SkySourceSelection|null{
  if(keys.some(key=>params[key]!==undefined&&typeof params[key]!=='string'))return null;
  const present=(key:typeof keys[number])=>params[key]!==undefined;
  let reference='';try{reference=decodeURIComponent(String(params.reference??''));}catch{return null;}
  const family=['preparedPublicationHash','bodyImagePublicationHash','hipsPublicationHash'].filter(key=>params[key]!==undefined);
  if(family.length>1)return null;
  if(present('hipsPublicationHash')){
    const ids=typeof params.hipsSourceIds==='string'?params.hipsSourceIds.split(','):[];
    if(present('reference')||present('imagePublicationHash')||present('opticalPublicationHash')||
      !hash(params.hipsPublicationHash)||!ids.length||ids.length>4||new Set(ids).size!==ids.length||
      ids.some(id=>!/^[a-z0-9-]{1,40}$/u.test(id)))return null;
    return {kind:'hips',publicationHash:params.hipsPublicationHash,sourceIds:ids};
  }
  if(present('hipsSourceIds'))return null;
  if(present('bodyImagePublicationHash')){
    if(!isBodyImageReference(reference)||!hash(params.bodyImagePublicationHash)||present('imagePublicationHash')||present('opticalPublicationHash'))return null;
    return {kind:'body',reference,publicationHash:params.bodyImagePublicationHash};
  }
  if(present('preparedPublicationHash')){
    if(!isPreparedOpticalReference(reference)||!hash(params.preparedPublicationHash)||present('imagePublicationHash')||present('opticalPublicationHash'))return null;
    return {kind:'prepared',reference,publicationHash:params.preparedPublicationHash};
  }
  if(!isCelestialObjectReference(reference)||
    (present('imagePublicationHash')&&(!isDeepSkyObjectReference(reference)||!hash(params.imagePublicationHash)))||
    (present('opticalPublicationHash')&&(!isDeepSkyObjectReference(reference)||!hash(params.opticalPublicationHash))))return null;
  return {kind:'object',reference,
    ...(present('imagePublicationHash')?{imagePublicationHash:params.imagePublicationHash as string}:{}),
    ...(present('opticalPublicationHash')?{opticalPublicationHash:params.opticalPublicationHash as string}:{})};
}

export function skySourceSelectionPath(selection:SkySourceSelection):string{
  const params:Record<string,string>=selection.kind==='hips'
    ?{hipsPublicationHash:selection.publicationHash,hipsSourceIds:selection.sourceIds.join(',')}
    :{reference:encodeURIComponent(selection.reference),...(selection.kind==='body'?{bodyImagePublicationHash:selection.publicationHash}:
      selection.kind==='prepared'?{preparedPublicationHash:selection.publicationHash}:
      {...(selection.imagePublicationHash!==undefined?{imagePublicationHash:selection.imagePublicationHash}:{}),
        ...(selection.opticalPublicationHash!==undefined?{opticalPublicationHash:selection.opticalPublicationHash}:{})})};
  if(parseSkySourceSelection(params)?.kind!==selection.kind)throw new Error('sky_source_selection_invalid');
  return '/sky/sources/index?'+Object.entries(params).map(([key,value])=>key+'='+
    (key==='reference'?value:encodeURIComponent(value))).join('&');
}
