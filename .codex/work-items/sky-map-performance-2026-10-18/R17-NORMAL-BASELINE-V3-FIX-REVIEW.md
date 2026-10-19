# R17 normal baseline v3 fix review

2026-10-19。按 root 本轮明确委派，独立复核上一份 `R17-NORMAL-BASELINE-V3-INDEPENDENT-REVIEW.md` 的两项阻断及最终 env 条件项。**三项在当前代码/软件层均已修复，本次复核未发现新的相关阻断。** 结论对应独立目录 `tmp/r17-normal-baseline-v3-review-r2` 的 gen25 / normal / baseline / probe v3，不把旧 gen25 包重新判为通过；build generation 相同，source binding 和实际 bundle 身份已经改变。

本代理只读源码、原报告和任务产物，运行一次无设备/API 副作用的现有 focused fixture，并写入本报告。未读取私有配置，未连接/请求/启停服务、collector、数据库、手机或 DevTools，未编辑产品、候选、PLAN/HANDOFF/INDEX、分支或提交。root 继续独占共享运行状态。沿用旧报告对未变生产 owner 的内容独审，不重复全仓套件或全包构建。

## 修复判断

### 1. 同一观测瞬间重新 Play：已修复

实际 r2 `source/apps/wechat-miniapp/src/features/sky/r17-phone-probe-controls.tsx:20,153–166` 新增独立的 `productPlayGeneration`。每次原 guarded Play 成功后，page 仍先执行原 `setTimeIntent(observationTime.play(Date.now()))`，再调用 `r17NormalProductPlayStarted`（page 第 2526–2527 行）。该调用现在在 armed/exporting/runStartAt guard **之前**推进播放代次，故未 armed 的替换播放也会撤销旧 timer 的暂停权限。原 page 中只有这一处 `observationTime.play`。

20 秒 timer 同时受原 diagnostic `generation` 和捕获的播放代次保护。代次相同才调用原 `pauseCurrentRun(runStartAt)`；其原 owner/datePicker/PLAYING/runStartAt guards 和 `pauseSkyTime()` 保留。代次不同明确记录 `pauseAttempt.lastResult=false`，不记录 `pauseSuccess`，随后仍 seal 固定 terminal。

`cancelDiagnostic`（第 41–46 行）只推进 diagnostic generation、清 timer/armed/cache/terminal 和观察状态，**不重置播放代次**；其他源码没有该代次的重置或产品状态 writer。隐藏/卸载仍先取消诊断；旧 timer 即使迟到也先被 diagnostic generation 拒绝。原生产 `runStartAt`、播放数学、accepted、renderer 和 setter 语义没有为本修复改变。

现有 fixture 第 187–196 行已用真实 `toggle(); toggle(); toggle()` 表达“开始→正常暂停→同一观测瞬间再开始”，不再伪造另一个 runStartAt。独立执行当前 fixture 一次，**19/19 项输出通过**，实际源码中的旧 20 秒 timer 保持 replacement 为 PLAYING，且 pauseSuccess 为零。该次执行同时保留以下既有断言：

- 实际 Play 相对 0 开始，15 秒 metrics 导出时仍 PLAYING；metrics 未含 20 秒 pauseAttempt。
- 同次正常播放在 20 秒通过原 Pause 恰好暂停一次，单独 terminal 与原 metrics 匹配，terminal 不改写 sealed metrics。
- 隐藏/卸载清理、metrics 503/延迟、terminal 424 后显式重试相同 bytes，均不重放 Play/Pause；hide 后的迟到 metrics 确认不发送已退休 terminal。

执行入口为仓库根 `node --input-type=module -e $reviewCode`，直接 import 当前 `scripts/r17-normal-baseline-v3-fixture.mjs`，以本地既有 TypeScript 调用 `verifyNormalBaselineV3Fixture`，参数为 r2 的实际 sourceRoot、当前生产根、`apps/wechat-miniapp/src/features/sky/`、buildGeneration 25 和当前 v3 protocol。运行只在 VM 内使用 fake Date/timers/request；这不是手机证据。

### 2. public-only bridge 遗漏实际账号 namespace：已修复

当前 `tmp/r17-normal-phone-bridge.mjs:31–39` 以明确的公共产品 namespace 白名单准入，其他路径在转发前返回 403。因此实际 `/v2/me`、auth、admin、operations、shares 等路径不再落入通用 GET/HEAD 转发。对照当前 `controller.ts` 的 `/v2/me/*`、`/v2/operations`、`/v2/shares/plans/:token` 和原 AppModule controller 注册，原阻断涉及的入口均不在白名单。

白名单内只转发 GET/HEAD；唯一允许的写方法仍为匿名 observation-context 的精确 resolve POST 和单 ID PUT。转发时剥离 Node 规范化后的 `authorization`、`cookie`、`x-admin-token`、`x-admin-actor`、`x-wechat-reauth-code`，保留原 API 的 optionalPrincipal/匿名 context 所有权判定。collector 仍走单独的 POST、认证/cookie 拒绝、大小限制及版本化校验路径。

health 的 `anonymousOnly:true` / `accountRoutesAvailable:false` 现在与 **8798 bridge 的准入代码**一致。它不表示 8799 的原 AppModule 移除了账号/admin controller，也不证明运行服务已经加载这份脚本。原来的 8791 恢复路径未被这次脚本加入。实际 HTTP 拒绝、合法公共响应及资源字节由 root 验证，本报告未发请求。

### 3. private runtime 可把 acceptance/fixture flag 写回：已修复

当前 `tmp/r17-normal-profile-api.mts:16–20` 先从合成后的最终 `env` 删除 `MINIAPP_ACCEPTANCE_MODE` 和 `MINIAPP_DEVELOPMENT_FIXTURE_MODE`，再清 process.env 同名字段，最后才把 env 写回。之后才动态 import AppModule/runtime-config（第 24 行起）。原 AppModule 的 acceptance controller 注册仍在 import 时判断 `process.env.MINIAPP_ACCEPTANCE_MODE === "1"`；这两个字段不再能通过 original spread 被重新引入，继承进程中同名值也被清除。

代码仍使用 Postgres repository 的 `initialize({migrate:false})`、专用 MemoryCache 和既有 DeterministicWeatherTestAdapter；通过原 AppModule metadata 保留 controllers/providers，仅替换 MiniappService。migration/reminder delivery 的禁用配置、原关闭路径及 SAMPLE_DATA 天气说明没有被本修复改变。未读取私有值、未验证已运行进程或数据库身份/权限；这里只确认最终 env 的条件漏洞已闭合，不据此认证实际私有配置或真实数据覆盖。

## 封存身份与实际字节读回

| 对象 | 本次实际读回 |
| --- | --- |
| 旧 manifest SHA-256 | `241d14276fcbe93a8d19a259f7f5892f9b280018d621deb3eb903229b0a880eb`，与旧独审身份相同 |
| r2 manifest SHA-256 | `f87c10fb0b6ff0c24f3a979e99aa30cbde4ca1940af85805c5af56905642d0ba` |
| 新 build source binding | `10236f0e034ae96d9e31ed5e081a837a53f4cdd128e3f9ac34da6d588f151a4c`；重新计算 bindingInput hash 相符 |
| builder SHA-256 | `f961500532198c97e3184311c9daf96d246a0d7f9c83c3f5c808b702b202f24b`；与 r2 manifest 相符 |
| 生产输入声明 | 两 manifest 的 1569 个 productionSourceBindings 相同；未重新展开未变生产 owner 的内容审查 |
| materialized source | 旧、新各 1573 个实际文件逐项 SHA-256 与各自 manifest 相符；文件集合相同，实际 delta **仅 controls.tsx**，包括其中的 binding；probe runtime TS 未变 |
| source build / project weapp | 两份实际 fingerprint 同为 `d4ed31dfe62d4d0268eb3d415d932d0f958615ba6a9ac98e474edc7a13432819`；338 files / 4,999,195 bytes |
| source maps / JS | 31 份实际 map hash 全部匹配新 records；对应 JS 在两个新包中逐项核对，共 62 次；两份包 `.map` / sourceMappingURL 均为 0 |
| controls 的 map 与实际新 JS | `sky/detail/index.js.map` 的 sourcesContent 与新 TS 逐字相同；map SHA `3c44701a7813bc7090296837b93c7f347bf0e742773c713c3ec37dba359d61a8`；对应实际 JS SHA `537a8c14c152aa12711de5455eee49b89894a2d0d29057bec83214a41623ab26`，包含新 binding 且没有旧 binding |

controls 的实际文件 hash 由 `912e38212d88a32a5ac9921fdab321be5fd523520dd00b5b4cefedb35a668ac3` 变为 `b5dda258241f4c237c516bc67a95ad4108b6838b8cd9421488fa945cb5315d28`。templateBindings 只有真实 replacement fixture 改变。r2 manifest 记录的生产/候选 type diagnostics 为 0/0、无新增；本代理没有重跑 typecheck。

新包并非只有 sky/detail 两个文件的字节变化：独立目录/slot 重建还产生 shared chunk 名称和注册/加载 ID 变化。已实际读 diff：4 个 spot shared JS 载荷在只替换自身 webpack 注册 chunkId 后逐字相同；shared WXSS 字节相同；6 个受影响 entry 在只对应替换 shared 文件名及 loadIds 后逐字相同；runtime.js 仅 initial CSS chunkId `2131→1751`。变化的 map 是 runtime.js.map 和 sky/detail/index.js.map。该生成命名变化没有被误报为产品源码修改，也没有沿用旧包/旧 JS hash 认证新包。

本次读到的服务脚本身份为 bridge `e2ce682674d679c5bfe2c04a401ad32ee2b96ce707886dce99b155a2b8cbbefe`、API `fe8f9cb1919113c705fc07fc1bcd54b1f2003c1cc5aeb84569b0b1095b6a149a`；fixture 为 `a0d4b447f3bfd747b1bb55aa4ce63a15767a5561b4a6d93080bdb8427eb8c014`。这些是源码读回身份，不是进程加载证明。

## 仍需目标证据

本报告解除上述三项代码/软件范围的阻碍，保留旧报告的计时语义、observer 成本、Page legacy clock、1–15 秒计量窗口与 20 秒 terminal 边界说明。20 秒回执不补足 15–20 秒工作总量，也不证明 paused drain。

仍欠真实目标端的 source/session/target 绑定、非空正常 Sky/BSC/loaded SAO/native text/copy/accepted、目标时钟覆盖、profile 导出与本 bundle/window 的绑定、同次 20 秒 Pause 后的恢复/资源变化及普通预览症状一致性。R17 A 的输入到 accepted 响应，以及 R17 B 的持续正常播放、恢复/退出和超出已知失败区间的尾段，仍需按完整 Goal 验收；本报告不把 fixture、构建、静态 map 或服务代码通过换成这些结果。
