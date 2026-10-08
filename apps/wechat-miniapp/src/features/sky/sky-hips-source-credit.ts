import type {SkyHipsCanvasTile} from "./sky-scene-render";
import {skyNativeImageIsCurrent} from "./sky-artwork-loader";
import {opticalHipsSourceRoute} from "../../services/optical-hips-source";

/** Input is the page's accepted Scene completion, never requested metadata. */
export function skyHipsSourceCredit(completed:readonly SkyHipsCanvasTile[]|null|undefined){
  const live=completed?.filter(tile=>tile.layer==="OPTICAL"&&skyNativeImageIsCurrent(tile.image))??[];
  const publication=live[0]?.publication;
  if(!publication||live.some(tile=>tile.publication!==publication||
    !publication.sources.some(source=>source.id===tile.sourceId)))return null;
  const sources=publication.sources.filter(source=>live.some(tile=>tile.sourceId===source.id));
  if(!sources.length)return null;
  return Object.freeze({publication,sourceIds:Object.freeze(sources.map(source=>source.id)),
    credit:sources.map(source=>source.provider).join(" / "),license:"原图权益见来源说明 · HiPS ODbL-1.0",
    description:"历史光学显示色 · 科学支持未认证",sourceRoute:opticalHipsSourceRoute(publication.publicationHash,sources.map(source=>source.id))});
}
export function sameSkyHipsCompletion(a:readonly SkyHipsCanvasTile[],b:readonly SkyHipsCanvasTile[]){
  return a.length===b.length&&a.every((tile,index)=>tile===b[index]);
}
