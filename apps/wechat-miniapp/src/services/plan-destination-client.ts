import type { createAuthenticatedOperationRequester } from './authenticated-operation';

export function planDestinationFailureDetail(error:unknown) {
  return error instanceof Error && error.message==='WECHAT_IDENTITY_MISMATCH'
    ? '微信身份与当前计划账户不一致。请切回此计划所属的微信账号，再重新打开计划；本次未申请订阅授权。'
    : '身份验证未确认，请重试；本次未申请订阅授权。';
}

/** Refresh the same account's encrypted destination without replacing its session.
 * The UI owner aborts on account changes/unmount; native login itself is not cancellable. */
export function createPlanDestinationClient(deps: {
  request: ReturnType<typeof createAuthenticatedOperationRequester>;
  currentUser(): string | null;
  login(): Promise<{code?:string}>;
  confirmed(owner:string): Promise<void>;
}) {
  return async (owner:string,signal:AbortSignal) => {
    const check=()=>{
      if(signal.aborted)throw new Error('本次验证已取消，请重新打开通知说明。');
      if(!owner || deps.currentUser()!==owner)throw new Error('账户已变化，请重新打开计划。');
    };
    check();
    const {code}=await deps.login();
    check();
    if(!code)throw new Error('微信身份验证未完成，请重试。');
    const result=await deps.request('plan-reminder-destination','reminderDestinationReverifyPost',{
      auth:'REQUIRED',reauthenticationCode:code,cache:false,independent:true,signal,
    },false,owner);
    check();
    if(result.data.state==='READY') {await deps.confirmed(owner);check();}
    return result;
  };
}
