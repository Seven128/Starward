import Taro from "@tarojs/taro";

type SurveyPath = "optical" | "sdss-optical" | "wide-field" | "moon" | "mars" | "mercury" | "jupiter" | "saturn" | "uranus" | "neptune" | "galactic" | "landscape";

/** Bare hash-bound survey downloads share one same-origin and cancellation
 * boundary. Each consumer still validates its own manifest and exact URLs. */
export function skyResourceUrl(path:string,kind:SurveyPath){
  const fileTypes = kind === "landscape" ? "jpg|png|alpha-rle\\.json|zip" : "jpg|png";
  if(!new RegExp(`^/v2/sky/${kind}/[a-zA-Z0-9/_-]+(?:\\.(?:${fileTypes}))?$`,"u").test(path)||
    path.includes("//")||path.split("/").some(segment=>segment===".."||segment==="."))
    throw new Error("sky_resource_path_invalid");
  return __MINIAPP_API_BASE__.replace(/\/+$/u,"")+path;
}

export function requestBareSkyResource(path:string,kind:SurveyPath,signal?:AbortSignal):Promise<{status:number;body:unknown}>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new Error("sky_resource_request_cancelled"));return;}
    let settled=false;
    const complete=(result:{status:number;body:unknown}|Error)=>{
      if(settled)return;settled=true;signal?.removeEventListener("abort",onAbort);
      if(result instanceof Error)reject(result);else resolve(result);
    };
    let task:{abort():void}|undefined;
    const onAbort=()=>{task?.abort();complete(new Error("sky_resource_request_cancelled"));};
    task=Taro.request({url:skyResourceUrl(path,kind),method:"GET",timeout:10_000,
      success:response=>complete({status:response.statusCode,body:response.data}),
      fail:()=>complete(new Error("sky_resource_request_failed"))});
    signal?.addEventListener("abort",onAbort,{once:true});
    if(signal?.aborted)onAbort();
  });
}
