import Taro from "@tarojs/taro";

type SurveyPath = "optical" | "sdss-optical" | "prepared-optical" | "wide-field" | "moon" | "mars" | "mercury" | "jupiter" | "saturn" | "uranus" | "neptune" | "galactic" | "landscape" | "deep-sky";

/** Bare hash-bound survey downloads share one same-origin and cancellation
 * boundary. Each consumer still validates its own manifest and exact URLs. */
export function skyResourceUrl(path:string,kind:SurveyPath){
  if (kind === "prepared-optical") {
    const object = "(?:[1-9]|[1-9][0-9]|10[0-9]|110)";
    if (!new RegExp(`^/v2/sky/prepared-optical/[a-f0-9]{64}/(?:manifest|M-${object}-(?:overview|medium|detail)\\.png)$`, "u").test(path))
      throw new Error("sky_resource_path_invalid");
    return __MINIAPP_API_BASE__.replace(/\/+$/u, "") + path;
  }
  if (kind === "deep-sky") {
    const object = "(?:[1-9]|[1-9][0-9]|10[0-9]|110)";
    const hash = "[a-f0-9]{64}";
    const selected = new RegExp(`^/v2/sky/deep-sky/selected/M%3A${object}\\?imageVersion=source-finite-v3$`, "u");
    const file = new RegExp(`^/v2/sky/deep-sky/${hash}/(M-${object})/\\1-(?:overview|medium|detail)(?:\\.${hash}\\.png|\\.jpg)$`, "u");
    if (!selected.test(path) && !file.test(path)) throw new Error("sky_resource_path_invalid");
    return __MINIAPP_API_BASE__.replace(/\/+$/u, "") + path;
  }
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
    const onAbort=()=>{
      if (settled) return;
      complete(new Error("sky_resource_request_cancelled"));
      try { task?.abort(); } catch { /* Cancellation already owns the result. */ }
    };
    try {
      task=Taro.request({url:skyResourceUrl(path,kind),method:"GET",timeout:10_000,
        ...(typeof __MINIAPP_OPERATOR_PREVIEW_TOKEN__ !== "undefined" && __MINIAPP_OPERATOR_PREVIEW_TOKEN__ ?
          {header:{"X-Starward-Operator-Preview":__MINIAPP_OPERATOR_PREVIEW_TOKEN__}} : {}),
        success:response=>complete({status:response.statusCode,body:response.data}),
        fail:()=>complete(new Error("sky_resource_request_failed"))});
      void Promise.resolve(task).catch(()=>complete(new Error("sky_resource_request_failed")));
    } catch { complete(new Error("sky_resource_request_failed")); }
    if (settled) return;
    signal?.addEventListener("abort",onAbort,{once:true});
    if(signal?.aborted)onAbort();
  });
}
