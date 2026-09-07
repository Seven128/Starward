/** One mounted feedback editor belongs to its first authenticated account. */
export function createContributionAccountGuard(readUserId: () => string | null) {
  let owner = readUserId();
  return () => {
    const current = readUserId();
    if (!current) throw new Error("登录状态已变化，请返回我的页面后重新进入反馈。");
    owner ??= current;
    if (owner !== current) throw new Error("账号已切换，本页输入不会提交到新账号。请返回我的页面后重新进入反馈。");
  };
}
