import {useDidHide,useDidShow} from "@tarojs/taro";
import {useCallback,useEffect,useRef} from "react";

/** Sources retry is metadata-only. A queued control belongs to its original
 * selection lifetime, while eligibility and the query action stay current. */
export function useSkySourceRecovery(key:string,enabled:boolean,refresh:()=>unknown){
  const identity=useRef({key});
  if(identity.current.key!==key)identity.current={key};
  const selected=identity.current;
  const current=useRef({enabled,refresh});
  current.current={enabled,refresh};
  const mounted=useRef(true),visible=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useDidHide(()=>{visible.current=false;});
  useDidShow(()=>{visible.current=true;});
  return useCallback(()=>{
    if(!mounted.current||!visible.current||!current.current.enabled||identity.current!==selected)return;
    void current.current.refresh();
  },[selected]);
}
