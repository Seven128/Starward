# r21 绘制成本观测适配

2026-10-21。只适配现有任务计量以消费稳定的精确星点准备 owner；未改生产、PLAN、Context 或 HANDOFF，未操作手机、IDE、服务，未 prepare/build、推送、上传或提交。root 后续仍需完整候选构建及目标运行时核验。

## 当前边界

复用 r20 协议及同一计量实现，不增加 schema、阶段、计数体系、记录器或 scheduler。`--review-r21` 是既有 builder 的有限新选项；项目、任务 label、目录和源码绑定继续从所选 revision 推导，源码快照与包外 source maps 规则保持原样。

- BSC `starTraversal` 从 `buildCatalogStars` 定义前开始，到 `currentSupplement` 前结束。它涵盖完整 `starDrawing.catalog` lookup、未命中的实际 build、所有命中/未命中的 transition 和 paint replay。
- SAO `starTraversal` 从 `buildSupplementStars` 定义前开始，到 `solarDisc` 前结束。它涵盖对应 lookup/build/replay，以及原 BSC/SAO 同时间退出星点的投影和绘制。
- 共同的 `starDrawing.prepare` 精确视图 key 检查与原 appearance/view setup 仍在两段 `starTraversal` 外、总 `draw` 内。不能把它算成缓存命中后没有执行，也不能用 `starTraversal` 单独表示全部 Scene 成本。
- `rendererSubmit` 和 `draw` 的既有边界未改；submit 仍可能嵌在 traversal 中，三份 subtotal 不可相加。elapsed 仍是有分辨率限制的 wall elapsed，不是 CPU、GPU 或物理 FPS。

仍为三类原因 × 三阶段以及三个 unbound 阶段的 12 份固定聚合，原 32 KiB 完整 receipt 上限、unknown 时钟覆盖、Stop/新 run 隔离、历史 schema、collector 幂等、15 秒 metrics、60 秒同次正常 Pause 及 terminal 规则不变。协议文件与 bridge 接收逻辑未修改。

## 已做检查

1. 适配后的完整 `r17-normal-input.test.mjs` 既有 32 项全部通过（43.5 秒）。包括当前生产消费者的四次严格内存 typecheck、实际 BSC/SAO projected/fallback 与真实 renderer submit 的原/注入输出和异常一致性、完整正常 Play/Pause/退役 fixture，以及严格 schema/时钟/大小/幂等检查。
2. 随后新增一项 r21 命中回归，连同原实际 traversal/submit 检查 **2/2 通过**。它运行当前生产 `createSkyStarDrawPreparation`，只在 fixture 中控制输入资格；连续三次相同视图仅 build 一次，但每次实际执行 transition、disc、pick/name 与两个退出星点，并逐帧比较原/注入命令和结果。缓存命中两次的 traversal 仍有四个有效 span，lookup、transition、paint、exit 的合成时间全部计入；共用 prepare 的合成时间只出现在总 draw。另核对构建异常保持原对象，并由同一记录器记入 throw。
3. `--review-r21 --observe-a1 --usb-reverse` 通过 builder 的只读 import 解析，没有触发准备或构建。三份受改脚本 `git diff --check` 通过。

新增回归中的合成毫秒仅检验计量边界，不能解释为产品耗时。fixture 的资格控制不代替生产发布准入测试；真实 Scene/精确 key/生命周期正确性由生产 owner 的检查及后续候选验收负责。这些检查不证明手机改善或无内存泄漏。

## 审阅时源码绑定

| 文件 | SHA-256 |
| --- | --- |
| `apps/wechat-miniapp/src/features/sky/sky-scene-render.ts` | `0e2ece9cefdf68f1ae7103d4fb085bece329c727d0b12158faea0f319470c921` |
| `apps/wechat-miniapp/src/features/sky/sky-star-draw-preparation.ts` | `6ebacefaf052aa300d2a5d6511999e0ea160041442579e13e6f4b0319a02f7a1` |
| `scripts/build-r17-normal-baseline-v3.mjs` | `3dd503454d35ef41b841e3a740399c9a92975ebfdab44784f187df7a74eccf71` |
| `scripts/r17-normal-input-instrumentation.mjs` | `ef6bf56e28827c80254c72a80751fbe4c994e59d7560041153ba94d9c00043a2` |
| `scripts/r17-normal-input.test.mjs` | `6faf96a73151d179bd44e30845e125c7e5b3911b517743e29ba354fa999a84b0` |

这里记录源码审阅身份，不是已冻结的候选身份；完整 prepare/build/inspect 由 root 在生产与任务源码稳定后执行。
