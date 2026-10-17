import {useCallback,useEffect,useRef} from "react";

/** Recovery belongs to the current visible demand, including the render/effect
 * gap. A queued button cannot restart a paused, hidden or unmounted resource.
 * The image owner still enforces Canvas/publication identity and reset meaning.
 * mayRecover captures the caller's interaction scope; latest callbacks are
 * reused only while that scope still admits the queued command.
 */
export function useSkyImageRecovery(enabled:boolean,retryImages:()=>boolean,refresh:()=>unknown,mayRecover?:()=>boolean){
  const live=useRef(true);
  const current=useRef({enabled,retryImages,refresh});
  current.current={enabled,retryImages,refresh};
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  return useCallback(()=>{
    const recovery=current.current;
    if(!live.current||!recovery.enabled||mayRecover&&!mayRecover())return false;
    const resetGpu=recovery.retryImages();
    void recovery.refresh();
    return resetGpu;
  },[mayRecover]);
}
