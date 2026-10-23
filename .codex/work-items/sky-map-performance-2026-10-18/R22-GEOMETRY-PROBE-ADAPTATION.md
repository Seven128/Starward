# r22 当前需求 geometry 观测适配

2026-10-21。已将既有任务 probe 适配到独立审查通过的当前 geometry owner。只修改三份指定脚本；未修改生产、Context、PLAN 或 HANDOFF，未 prepare/build、操作手机/IDE/服务、推送、提交或上传。文件身份与检查记录见 [JSON](R22-GEOMETRY-PROBE-ADAPTATION.json)。

## 观测边界

- 页面原来的 `readDemand` 回调完整保留，只在其后传入既有 intent 关联编号。hook 的必需参数和当前 demand 读取方式不变。
- 原 `queryFn` dispatch guard 先执行；过期 queued callback 不调用 client，也不产生 request 观测。guard 通过后，probe 才记录实际 `getSkyGeometryWindow` 调用。同步 client throw 仍抛出同一异常对象。
- `geometryWatch` 接收原 client Promise，记录的是该 client 已校验结果及其原始对象身份。生产原有 `.then` 中的 `signal.aborted` / `demandCurrent()` guard、取消异常和返回对象均保留。queryFn 现在本来就返回 guard chain，因此移除了旧 fixture 中“queryFn Promise 必须等于 raw client Promise”的错误要求。
- client 已校验完成和当前需求接受是两个阶段：raw client fulfilled 可产生原 code 4；随后 production guard 拒绝不产生 retained admission，也不被改写成 client validation rejection。若 guarded result 已成功返回、但 retained assignment 前需求再被撤销，原 assignment guard 仍阻止 code 6。
- 实际 retained assignment 后才调用既有 `geometryAdmitted`，其 `binding && query.data && demandCurrent()` 条件不改、不额外求值。没有新增请求、enabled 求值、产品时钟或 Context 写入。

保留原 schema、32 KiB UTF-8 上限、unknown/overflow、WeakMap 原对象关联、停止与新 run 隔离、collector 幂等，以及 15 秒 metrics / 60 秒同次正常 Pause 和 terminal 规则。未修改 protocol、collector、geometry recorder 或 bridge。builder 只增加有限的 `--review-r22` 选项，其他语义不变。

## 验证

1. 完整 `node --test scripts/r17-normal-input.test.mjs` **41/41 通过**，62.67 秒。覆盖四次当前消费者严格 TypeScript 内存物化、正常 Play/Pause、既有绘制观测、历史 schema、时钟 unknown、大小预算和 collector 幂等。
2. 此后只增加“guarded result 成功后、retained assignment 前撤销”的补充差分用例及实际调用参数断言，`--test-name-pattern '^r22'` 最终 **5/5 通过**。与完整运行合计 **42 个不同用例**通过；生产和注入源码在两次运行之间未变，未无必要重跑四次类型物化。
3. 原/注入 hook 对照覆盖同窗分钟继续、原 response/model/source 对象身份、过期 dispatch、不同窗/null demand/NIGHT 切换/实际 AbortSignal、校验后撤销、同步抛错和异步 rejection。live-demand 与 window 读取次数相同；没有用 probe 增加 current guard 或 enabled 求值。probe 明确观察 raw client Promise，而原/注入 queryFn 均保留生产 guard chain。
4. `--observe-a1 --review-r22 --usb-reverse` 只读 import 解析通过，没有触发 prepare/build；三份脚本 `git diff --check` 通过。

差分 fixture 执行原/注入生产 hook、实际 query-key 与 cancellation owner；只给 UTC 窗口和 hook 槽提供有限测试输入，不模拟真实 Query 调度器。真实 Query 的 optimistic result、passive effect 和取消重试由 [当前需求独立审查](GEOMETRY-CURRENT-DEMAND-INDEPENDENT-REVIEW-20261021.md) 的既有证据负责。这些检查只证明观测兼容性，不证明手机性能、流畅、无内存泄漏或 crash 已修复。后续完整候选及目标运行仍由 root 执行。
