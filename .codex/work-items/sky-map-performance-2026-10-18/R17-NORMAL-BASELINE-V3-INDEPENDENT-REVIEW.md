# R17 normal baseline v3 independent review

2026-10-19。独立只读审查，依据 root 本轮明确委派及其确认的完整 Goal 恢复。审查对象是 gen25 `mode=normal` / `variant=baseline` / `probeVersion=3` 的既有 materialized source 与完整包，以及当次读到的两个 task-only 服务脚本。**发现两项应在本候选手机观察前修复的诊断边界问题；本报告不批准当前 gen25 的 same-run termination/public-only lane 声明。** 原生产 Sky 路径保留及构建绑定审查通过；这不等于手机或 R17 A/B 通过。

本代理未连接手机、DevTools、collector、API 或数据库，未读取外部 private 配置，未请求或启停服务，未修改产品、模板、候选、PLAN/HANDOFF/INDEX、分支或提交。唯一写入为本报告。root 保持所有共享运行状态的独占控制。修复后的源码/包须重新绑定；下面的结论只对应本报告列明的旧身份。

## Reviewed identity and actual readback

| 对象 | 独立实际读回 |
| --- | --- |
| source manifest SHA-256 | `241d14276fcbe93a8d19a259f7f5892f9b280018d621deb3eb903229b0a880eb` |
| build source binding | `41643d208fd62dfb471078ddca097f607a9e056f33e486d6f5b083bb170f535c`；重新计算 bindingInput hash 相符 |
| 当前生产输入 | manifest 的 1569 个文件逐项 SHA-256 相符；productionSourceBindings aggregate 与 bindingInput 相符 |
| materialized source | manifest 的 1573 个文件逐项 SHA-256 相符 |
| source build bundle | `848d3240b77fc6b7171a2ef7e96e8104ed4e59601462f3328166bc2ad0cd646d`；338 files / 4,999,177 bytes |
| project/weapp bundle | 同上；使用现有 fingerprintBundle 读回实际 bytes，与 source build 一致 |
| source maps | 31 份 map 的实际 hash 与 records 相符；每份对应 JS 在两个包中的 hash 均相符，共 62 次 JS 对照 |
| 关键 sourcesContent | probe runtime、stellar scene、scene render、canvas surface、spot page 的 map 内容分别与 materialized TS 逐字/hash 相符，5/5 |
| 包内 map 状态 | 两份包均未发现 `.map` 或 JS `sourceMappingURL` |

读回是文件读取/hash，不执行 builder，不重建，不运行整个仓库套件。第一次 source-content 定位错误地假设 webpack 保留斜杠路径；实际 map 使用 `._src_features_sky_...`，读过 sources 名称后按真实名字完成对照。这个定位错误不构成 map 不匹配。

已读 AGENTS、global/default routing、architecture entry、PLAN 当前 R17 段、development-feedback 性能边界、development skill 与 performance-investigation reference；后续真实执行由 root 的最新用户授权支配，文档中旧暂停文字不由本代理修改。实现审查覆盖全部 13 个生产→候选观察/config delta、4 个完整新增模块，以及真实 page 的 memo/request/copy/accepted/Play/Pause/hide consumers。巨大未变模块通过实际 delta 与 manifest source readback 保持边界，没有将片段 fixture 当成整个运行时。

## Blocking findings

### P2 — Observation-time string cannot fence a replacement playback

位置：候选 `source/apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx:2514–2527`，`r17-phone-probe-controls.tsx:152–165`；对应 builder `scripts/build-r17-normal-baseline-v3.mjs:108–112`，fixture `scripts/r17-normal-baseline-v3-fixture.mjs:186–193`。

20 秒 timeout 捕获的是 `runStartAt`，page callback 只检查当前产品仍为 PLAYING 且 `time.runStartAt === runStartAt`。原 observation-time owner 的 `play()` 把这个字段设为当前观测瞬间 `state.at`，它不是一次播放的唯一身份。正常 Pause 后，在第一次时间 tick 前重新 Play，或者回到同一观测瞬间再 Play，就会复用该字符串。旧诊断 timeout 随后可暂停新的播放，并把它记录为原 run 的 `pauseSuccess`。

实际 page 中，每次通过原 owner/datePicker/model/data/time guard 的非 PLAYING→Play 都先执行原 `setTimeIntent(observationTime.play(Date.now()))`，随后调用 `r17NormalProductPlayStarted(observationTime.snapshot().runStartAt)`，包括未 armed 的 replacement。问题在 controls 的开头 `if (!armedPlay || exporting || !runStartAt) return false`：未 armed replacement 没有推进任何播放代次，旧 timeout 仍通过诊断 generation 检查。

现有 fixture 只把 `runStartAt` 直接改为另一个字符串 `'replacement-run'`，所以其通过不足以证明同次播放隔离。唯一新增 focused countercheck 在内存加载原 fixture，未改磁盘或任何原断言：

```js
const before = "controls.fixture.startDiagnostic('wide-play'); toggle(); runStartAt = 'replacement-run'; advance(35000);";
const after = "controls.fixture.startDiagnostic('wide-play'); toggle(); toggle(); toggle(); advance(35000);";
source = source.replace(before, after);
const fixture = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
await fixture.verifyNormalBaselineV3Fixture({
  sourceRoot: path.join(work, 'tmp/r17-normal-baseline-v3/source'),
  productionRoot: root,
  feature: 'apps/wechat-miniapp/src/features/sky/',
  ts, buildGeneration: 25,
  protocolPath: path.join(work, 'scripts/r17-phone-probe-v3-protocol.mjs'),
});
```

执行入口为仓库根的 `node --input-type=module -e $code`；用 `fs.readFile` 读原 fixture，`createRequire(<root>/package.json)` 取既有本地 TypeScript，VM 内仍使用原 actual page/control source 与 fake timers/request。前三次 toggle 是开始原播放→正常暂停→同一瞬间重新播放。到原第 20 秒的现存断言期望 replacement 仍为 `PLAYING`，实际 `PAUSED`，退出码 1。失败输出仅为 `AssertionError, actual: PAUSED, expected: PLAYING`。这不是设备证据。

建议在 task-only 边界为每次实际 Play 分配独立代次/token，未 armed 的 replacement 也必须退休旧 run 的 termination 权限；timer 比较该 token 后仍调用原 guarded product Pause。不要修改生产播放数学、setter 或新增产品 writer。root 已确认该项必须在手机前修复。

### P2 — Public-only bridge omits the actual `/v2/me` account namespace

位置：`tmp/r17-normal-phone-bridge.mjs:31–39`，对照 `workers/miniapp-api/src/controller.ts:855` 起。

bridge 拒绝 `/v2/(auth|account|my|plans|contributions)`，但实际账号 API 的前缀是 `/v2/me`，例如 `/v2/me/profile`、`/v2/me/favorites`、`/v2/me/observation-plans`。这些 GET 会通过通用 GET/HEAD 分支，且 bridge 会把原 `authorization`/`cookie` 继续转给 upstream。它没有绕过原 API 的身份认证，但违反了该诊断入口声明的无账号/public-only 边界；health 的 `accountRoutesAvailable:false` 因而并不成立。未向这些路由发请求。

修复 task-only bridge 的真实 namespace 检查；按本次所需公共产品入口明确处理私有 share-plan/admin/operations 读取范围。保持正式点、公开天文/资源及匿名 observation-context 产品入口，不新建或恢复账号。

## Preserved production responsibilities

实际 diff 支持以下结论：

- 原 `skyCommandStateSetter`、完整 accepted React state/ref/updater/equality 和三个 null retirement 保持；copy 后执行同一个完整 `attempt.publish`。没有 direct-action setter、synthetic publication、CPU frozen surface 或 scene-owned memo 介入。
- presentation 仍使用原 memo 的五个依赖及同一个 `presentSkyTime` 结果身份；新增 envelope 只带 token/intent。回退到 committed instant 时显式解除 request 的 intent/preparation 关联。完整 request 字段、draw dependencies、Scene/BSC/SAO、native renderer/copy/caption、resource demand/readiness/retirement 没有被削减。
- BSC/SAO/constellation 的原 WeakMap 和运算保留，只加同步 span。draw counters 位于原 native/GL 调用返回之后；`measureText` 继续调用原方法并原样返回 result，没有方法替换、cache、text/frame/context history 或新数组复制。
- request→resolved clone 的 identity 显式继承。intent/preparation 序号跨 run 不复用；run 重启替换 ring/WeakMap，容量和未知 lookup/overflow 明示。保留的事实均为数字、有限标识或 stamp，不强引用产品 report/frame。
- hide/unmount 清掉 diagnostic timers/armed/cache/terminal 并退休 Page wrapper，异步返回检查 generation。metrics bytes 缓存后重试不重放 Play/Pause；terminal 先 seal，等待同 run metrics，424 清除确认后只在显式后续导出重试相同 bytes。上面的同瞬间 replacement 漏洞是仍需修复的具体例外。

## Timing and observer limits

v3 的固定 Date.now、window/epoch、不连续/不可用/低于分辨率→null、known subtotal 加 unknown coverage、版本化 collector match 逻辑相互一致。elapsed 是 wall elapsed，不能叫 thread CPU/GPU completion/物理呈现。`intentToAcceptedWallMs` 留作旧 latest-time 条件样本并明确不作新的 first-accepted 分布；新的 linkage 保留 superseded/duplicate/unknown。

Page observer 仍使用旧 performance→Date 回退及负值 clamp，且只记录 callback 耗时；它未被 v3 校准，不能作为校准后的 native latency。它在重置时保留 inherited pending；跨 reset 的 callback completion 可能来自旧提交，解释差值时必须保留该事实。key count 不是 payload bytes，最多 16 次序列化额外产生临时字符串。

normal text/copy 和 Page/upload scalar 在实际 Play 的相对 0 重置，捕获约 0/15s；recorder 的活动窗口约 1–15s，20s terminal 只追加控制事件，不补 15–20s 工作总量或 paused-drain 曲线。原格式部分 scene/viewport 零值只有结合 `sceneFinishes`/实际 workload 才能解释为观测结果，不能单独当成覆盖或真实零。main 的 80,379-byte 余量是生成包预算，官方编译/上传未由本代理验证。

observer 自身仍有成本：stage wrapper closure、Date stamp、有限 ring/样本、每个已画星的字符串计数、accepted object 遍历、Page callback wrapper 和有限序列化。它们有界且可在本包 map 中归因，但不能宣称无扰动。root 必须确认普通预览的相关症状在此 profiling 模式下仍存在，再解释 attribution；采样 surviving allocations、总 churn 和 Android process footprint 仍分开。

## Service DI and unresolved boundary

已读两个服务脚本及 AppModule、MiniappService constructor/destroy、MemoryCache、DeterministicWeatherTestAdapter 与实际 controller routes。8798 转向 8799 的 lane 不触及 8791 的恢复；DI 用原 controllers/providers，以 `useValue` 替换 MiniappService，真实 Postgres repository `initialize({migrate:false})`、专用 MemoryCache、原 astronomy engine。没有启动 worker，migration/reminder delivery 显式关闭；正常 `app.close()` 通过现有 onModuleDestroy 关闭 repo/cache/terrain/nightlight。weather 由既有 adapter 明示 `TEST_FIXTURE` / `SAMPLE_DATA`、非实时和限制，未伪装为真实供应商天气；真实 publication entitlement/资产存在仍须 root 验证。

另外有一项最终 env 边界未闭合：API 脚本先 `delete process.env.MINIAPP_ACCEPTANCE_MODE` / `MINIAPP_DEVELOPMENT_FIXTURE_MODE`，随后又将整个 `env` 写回 process.env，而 `env` 先 spread 原 private runtime。若原 runtime 包含这些字段，删除会被撤销；AppModule 在 import 时按 acceptance flag 增加 controller。因禁止读 private 配置，本代理未判断实际私有值，也未声称该问题已发生。root 可直接从最终 env 中删除/断言这些字段来闭合诊断边界，无需暴露私有值。

## Reused checks and target obligations

准备报告的 type diagnostics 0/0、protocol/collector 23/23、53 个候选检查及各自边界已读。原 affected-contract log 确有 6 个 harness/支持输入失败，没有把它当全绿；后续 actual-source GPU adapter 的原断言 4/4，以及生产未变 SAO owner+真实资产的 13/13 证据分别解决这些 harness 条件。未重复这些有效检查。新增 countercheck 只针对能改变当前结论的 replacement-run 漏洞。

本次未验证：服务实际 admission/health、手机 source/session/target、真实非空 Sky/BSC/loaded SAO/native text/copy/accepted、目标时钟覆盖、profiler export 与该 bundle 的 target/window 绑定、20s 正常 Pause 后 drain、普通症状复现和超出已知失败区间的持续尾段。R17 A 输入到 accepted 响应、R17 B 可持续正常播放/恢复/退出及完整 Goal 均仍未通过。修复已知阻断并绑定新完整包后，root 才能推进本次首个正常 Sky attribution 样本。
