import type {SkyBodyImagePublications} from "../../services/sky-body-image-profile";
import {skyNativeImageIsCurrent} from "./sky-artwork-loader";
import type {SkyBodyImagePaint} from "./sky-scene-frame";

export type {SkyBodyImagePublications} from "../../services/sky-body-image-profile";
export type SkyBodyImageBinding={ [R in keyof SkyBodyImagePublications]:{
  readonly reference:R;readonly image:object;readonly publication:SkyBodyImagePublications[R];
}}[keyof SkyBodyImagePublications];

/** The validated hook's current bitmap and publication travel together in the
 * queued frame. This does not establish a successful texture submission. */
export function skyBodyImageBinding<R extends keyof SkyBodyImagePublications>(reference:R,
  image:object|null,publication:SkyBodyImagePublications[R]|undefined){
  return image&&publication&&skyNativeImageIsCurrent(image)?Object.freeze({reference,image,publication}):null;
}

/** Called only by the lifecycle's accepted completion, using that attempt's
 * immutable bindings. A newer hook result cannot lend its metadata to this draw. */
export function completeSkyBodyImages(paints:readonly SkyBodyImagePaint[]|undefined,
  bindings:readonly SkyBodyImageBinding[]|undefined):readonly SkyBodyImageBinding[]{
  const completed:SkyBodyImageBinding[]=[];
  for(const paint of paints??[]){
    if(!skyNativeImageIsCurrent(paint.image)||(paints??[]).filter(value=>value.reference===paint.reference).length!==1)continue;
    const matches=(bindings??[]).filter(value=>value.reference===paint.reference&&value.image===paint.image);
    if(matches.length!==1||(bindings??[]).filter(value=>value.reference===paint.reference).length!==1)continue;
    completed.push(matches[0]!);
  }
  return Object.freeze(completed);
}

export function sameSkyBodyImages(left:readonly SkyBodyImageBinding[]|undefined,right:readonly SkyBodyImageBinding[]|undefined){
  return (left?.length??0)===(right?.length??0)&&(left??[]).every((value,index)=>{
    const other=right?.[index];
    return other?.reference===value.reference&&other.image===value.image&&other.publication===value.publication;
  });
}

export function skyBodyImageBitmap(bindings:readonly SkyBodyImageBinding[]|undefined,reference:SkyBodyImageBinding['reference']){
  return bindings?.find(binding=>binding.reference===reference)?.image??null;
}
