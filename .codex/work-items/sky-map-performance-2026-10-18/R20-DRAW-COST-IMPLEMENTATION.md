# r20 实际绘制成本补充

2026-10-21；任务计量实现，待独立复核。依据 [r19 结果](R19-DRAW-REASON-RESULT.md) 只补齐“实际星点遍历与提交谁主导”的缺口。未改生产源码、PLAN、HANDOFF 或 Context，未操作 IDE、手机或服务，未构建、推送、上传或提交。

## 范围与解释

- 复用 `r17-normal-observations.ts`、现有时钟/interval、r19 实际 paint admission 与 collector；builder 只增加有限 `--review-r20`。
- `draw`：原 `drawSkyScene` 同步调用的 inclusive wall elapsed。通过原 `nativePaintOwner` 的同步 `port.paint` 调用范围绑定同次 admission；该调用返回后发生的工作为 `unbound`，不会归给上一帧。
- `starTraversal`：实际 BSC 分支一次，以及实际 SAO 分支加同时间退出星点一次。覆盖惰性 transform 的消费、投影、appearance、transition、pick/name 对象与顶点写入；空/低于分辨率工作保持 unknown。未逐星计时。
- `rendererSubmit`：原非空 `submit` 中的 typed packing、buffer upload、program/uniform、draw 与原错误处理；空 data 原样早退。复用 quad 没有新上传时仍按实际 submit 调用计时。它不是纯 packing、线程 CPU 或 GPU 时间。
- 首个星点可 flush 前一图元，`rendererSubmit` 可嵌在 `starTraversal` 中，两者都在 `draw` 内；**不可将三个已知 subtotal 相加**。新增协议明确携带这一含义。
- 同一次 paint 的原因按 r19 原因并集分为 `inputResourceEffect`、`continuationOnly`、`unknown`。unknown 位/缺失身份优先；effect 与 continuation 合并归 effect，不能据此称为重复或浪费。

## 有界性与失效

仅保留三类 × 三阶段和三个 unbound 阶段，共 12 份固定聚合：observed/valid/unknown 次数、已知 subtotal、max、原异常次数及原五种 unknown 覆盖。没有新增逐帧历史、逐星数据、frame/report/scene 强引用、timer 或 scheduler；现有 r19 数字环及 WeakMap 不变。同步 paint 绑定只含数字；Stop 清理，旧 run 的未完成 span 不能写入新 run。

继续使用既有 `Date.now` 的 wall elapsed 语义。逆跳、不可用、跨窗口、超范围和低于分辨率分别保留为 unknown，不归零。新增调用走原 `active` 门；正常 Play 前 1 秒 armed 工作不计入此次窗口。

外层为 `starward-r20-phone-probe-draw-costs-v1`，内层为 `starward-r20-draw-costs-v1`，解包后依次走 r19 与原严格协议。新字段在原 ruler/geometry 的 32 KiB 导出裁剪之前加入；不扩大上限。原同字节重试、冲突拒绝、manual 无 Play terminal、正常 Play 15 秒导出/60 秒同次 Pause 保留。实际新样本收集前，现有 bridge 必须重载当前协议模块；更新文件不等于已经热重载。

## 已完成检查

`node --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-normal-input.test.mjs`：**32/32 通过**，约 54 秒。包括 7 项新增检查：

1. 当前生产消费者与注入源码的完整内存 strict typecheck。
2. 直接执行真实 BSC/SAO 投影及 fallback 代码段、真实 submit 代码段，比较原/注入后的星点、pick/name、typed upload、绘制顺序和同一个异常；同时确认 submit 与星点遍历的嵌套 subtotal。
3. 真实生命周期 writer 的合并、native clone、同次 paint 分类，返回后的工作为 unbound。
4. 逆跳/低分辨率/不可用、原 throw、Stop 和新 run 的旧 span 隔离。
5. 正常 Play 前 1 秒待命不计数。
6. 完整 receipt ≤32 KiB、严格拒绝伪造字段、原 collector 幂等与 409 冲突。
7. 原 15 秒导出、60 秒同次 Pause、terminal 重试和历史 schema。

六份受改脚本 `git diff --check` 通过。未运行完整候选构建；Map 生产改动由另一责任并行完成，root 在其稳定后整合并独审。以上检查不证明手机流畅、物理 FPS 或无内存泄漏；本补充只为下一次必要候选提供能改变修复决定的成本归属。

受改脚本：`r17-normal-observations.ts`、`r17-normal-input-instrumentation.mjs`、`r17-normal-input-protocol.mjs`、`r17-normal-input.test.mjs`、`build-r17-normal-baseline-v3.mjs`、`r17-normal-baseline-v3-fixture.mjs`。
