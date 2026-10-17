import { Button, Text, View } from '@tarojs/components';
import { useEffect,useRef,useState } from 'react';
import { reverifyPlanReminderDestination } from '@/services/api-client';
import { useAppStore } from '@/state/app-store';
import { planDestinationFailureDetail } from '@/services/plan-destination-client';

export function PlanReminderDestination({owner}:{owner:string}) {
  const [state,setState]=useState({busy:false,detail:''});
  const active=useRef<AbortController|null>(null);
  const busy=useRef(false);
  useEffect(()=>{
    const controller=new AbortController(); active.current=controller;busy.current=false;
    const unsubscribe=useAppStore.subscribe(snapshot=>{
      if(snapshot.accountOwnerId!==owner)controller.abort();
    });
    return ()=>{unsubscribe();controller.abort();if(active.current===controller)active.current=null;};
  },[owner]);
  const verify=async()=>{
    const controller=active.current;
    if(!controller || controller.signal.aborted || busy.current)return;
    busy.current=true;setState({busy:true,detail:'正在验证当前微信身份…'});
    try {
      const result=await reverifyPlanReminderDestination(owner,controller.signal);
      if(!controller.signal.aborted)setState({busy:false,detail:result.data.state==='READY'
        ? '身份已验证。请查看更新后的通知状态，再授权本次提醒。'
        : '微信通知当前不可开通，清单仍可使用。'});
    } catch(error) {
      if(!controller.signal.aborted)setState({busy:false,detail:planDestinationFailureDetail(error)});
    } finally {if(active.current===controller)busy.current=false;}
  };
  return <>
    {state.detail ? <View role="status" aria-live="polite"><Text className="plan-reminder-status-dialog__detail">{state.detail}</Text></View> : null}
    <Button className="plan-reminder-status-dialog__close" disabled={state.busy} onClick={()=>void verify()}>
      {state.busy ? '验证中…' : '重新验证微信身份'}
    </Button>
  </>;
}
