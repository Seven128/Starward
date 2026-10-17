import { reportSkyImageError } from "./sky-image-diagnostics";
import Taro from "@tarojs/taro";
import { PREPARED_OPTICAL_DISCOVERY_PATH } from "@starward/miniapp-contracts";
import { skyResourceOriginForPath, skyResourcePreviewHeaders } from "./sky-resource-origin";

type SurveyPath = "optical" | "sdss-optical" | "prepared-optical" | "wide-field" | "moon" | "mars" | "mercury" | "jupiter" | "saturn" | "uranus" | "neptune" | "galactic" | "landscape" | "deep-sky";

/** Bare hash-bound survey downloads share one environment and cancellation
 * boundary. Each consumer still validates its own manifest and exact URLs. */
export function skyResourceUrl(path:string,kind:SurveyPath){
  if (kind === "prepared-optical") {
    const object = "(?:[1-9]|[1-9][0-9]|10[0-9]|110)";
    if (path !== PREPARED_OPTICAL_DISCOVERY_PATH && !new RegExp(`^/v2/sky/prepared-optical/[a-f0-9]{64}/(?:manifest|M-${object}-(?:overview|medium|detail)\\.png|[a-z0-9]+(?:-[a-z0-9]+)*-(?:overview|medium|detail)\\.(?:png|jpg))$`, "u").test(path))
      throw new Error("sky_resource_path_invalid");
    return skyResourceOriginForPath(path) + path;
  }
  if (kind === "deep-sky") {
    const object = "(?:[1-9]|[1-9][0-9]|10[0-9]|110)";
    const hash = "[a-f0-9]{64}";
    const selected = new RegExp(`^/v2/sky/deep-sky/selected/M%3A${object}\\?imageVersion=source-finite-v3$`, "u");
    const file = new RegExp(`^/v2/sky/deep-sky/${hash}/(M-${object})/\\1-(?:overview|medium|detail)(?:\\.${hash}\\.png|\\.jpg)$`, "u");
    if (!selected.test(path) && !file.test(path)) throw new Error("sky_resource_path_invalid");
    return skyResourceOriginForPath(path) + path;
  }
  const fileTypes = kind === "landscape" ? "jpg|png|alpha-rle\\.json|zip" : "jpg|png";
  if(!new RegExp(`^/v2/sky/${kind}/[a-zA-Z0-9/_-]+(?:\\.(?:${fileTypes}))?$`,"u").test(path)||
    path.includes("//")||path.split("/").some(segment=>segment===".."||segment==="."))
    throw new Error("sky_resource_path_invalid");
  return skyResourceOriginForPath(path)+path;
}

export function requestBareSkyResource(path:string,kind:SurveyPath,signal?:AbortSignal):Promise<{status:number;body:unknown}>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new Error("sky_resource_request_cancelled"));return;}
    let settled=false;
    const complete=(result:{status:number;body:unknown}|Error)=>{
      if(settled)return;settled=true;signal?.removeEventListener("abort",onAbort);
      if(result instanceof Error){
        if(result.message!=="sky_resource_request_cancelled")reportSkyImageError("load",kind,result);
        reject(result);
      }else{
        if(result.status!==200)reportSkyImageError("load",kind,new Error(`sky_image_http_${result.status}`));
        resolve(result);
      }
    };
    let task:{abort():void}|undefined;
    const onAbort=()=>{
      if (settled) return;
      complete(new Error("sky_resource_request_cancelled"));
      try { task?.abort(); }
      catch (cause) { reportSkyImageError("load",kind,Object.assign(new Error("sky_resource_abort_failed"),{cause})); }
    };
    try {
      const url = skyResourceUrl(path,kind);
      task=Taro.request({url,method:"GET",timeout:10_000,
        ...skyResourcePreviewHeaders(url),
        success:response=>complete({status:response.statusCode,body:response.data}),
        fail:cause=>complete(Object.assign(new Error("sky_resource_request_failed"),{cause}))});
      void Promise.resolve(task).catch(cause=>complete(Object.assign(new Error("sky_resource_request_failed"),{cause})));
    } catch (cause) { complete(Object.assign(new Error("sky_resource_request_failed"),{cause})); }
    if (settled) return;
    signal?.addEventListener("abort",onAbort,{once:true});
    if(signal?.aborted)onAbort();
  });
}
