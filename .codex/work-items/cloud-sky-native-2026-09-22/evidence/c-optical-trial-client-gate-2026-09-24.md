# C 商业客户端光学 TRIAL 边界（2026-09-24）

## 用户结果与缺陷

PS1/SkyMapper 光学 HiPS 尚未取得完整自托管、派生物分发和生产获取准入；服务端 `miniapp-service.ts` 已只允许 `LOCAL` + `MEMORY_TEST` 的 `TRIAL` 出版。此前 Mini 的 `use-sky-optical-hips.ts` 只以 Sky 页面活跃、报告有效、非红光模式为条件，无论出版是否配置都会查询 `/v2/sky/optical/manifest`。商业端通常收 404，但网络错误时 `optical.failed` 可使普通页面出现“重试光学影像”，把未交付能力伪装成暂时故障，并造成无用请求。

## 修复边界

仍由原光学 hook 拥有清单、索引、图片和失败语义：它把页面 `active` 与既有编译常量 `__MINIAPP_DEVELOPMENT_FIXTURE_MODE__` 同时成立作为 `trialActive`。非夹具构建的清单/索引查询、原生图片、瓦片、加载/失败状态及 `retry()` 全部停用；即使查询缓存有旧 TRIAL publication 也不向当前页面暴露。LOCAL 开发夹具保持原有 TRIAL 查询/重试，服务端仍单独执行 LOCAL/MEMORY_TEST 限制。没有新增生产光学资产、开放生产端点或改动 PS1/SkyMapper 权利结论。

## 可复核检查

- 新的实际 hook 边界回归在修改前失败：商业路径有 **1** 个启用的光学 manifest 查询；修后商业路径 **0** 个启用查询、无 publication、无 `failed` 或重试效果；LOCAL 夹具路径仍启用清单并可重试，隐藏页面不发新查询。
- 定向 Mini 检查：`use-sky-optical-hips.test.ts`、`sky-optical-tile-selection.test.ts`、`optical-hips-publication.test.ts` 共 **9/9**；`npm run typecheck --workspace @starward/wechat-miniapp` 通过。
- 独立正式 WEAPP 构建 `MINIAPP_ISOLATED_CHECK_BUILD=1`、slot `optical-gate-0924`，退出 0；输出只在 `apps/wechat-miniapp/dist/weapp-check-optical-gate-0924`，未碰活动 `dist/weapp`/`dist/weapp-check`。产物 `sky/detail/index.js` 中清单查询的 `enabled` 被编译为恒假 `b=f&&!1`；静态构建检查只证明此编译候选的路径，不是实际设备网络抓包。构建仍有原先 3 类 Webpack warning（CSS顺序、asset大小、异步chunk建议），没有新增错误。
- `git diff --check` 针对改动源码无空白错误。未调用用户现用微信开发者工具、共享服务或手机。

C06 仍需来源权益、生产获取与发布、真实瓦片覆盖/分辨率/接缝、原生表现和运行成本，不能因关闭错误请求而标完成。
