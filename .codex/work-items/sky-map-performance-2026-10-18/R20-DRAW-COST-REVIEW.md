# r20 绘制成本计量独立窄审

2026-10-21；审查者 `review_r20_draw_cost_spans`。**未发现 P1/P2，可由 root 整合进下一次必要候选。** 这是任务计量的代码和有限反例结论，不是手机流畅、物理 FPS、GPU 成本或无内存泄漏验收。

已按 AGENTS、开发 skill 及性能分析方法审查 [实现说明](R20-DRAW-COST-IMPLEMENTATION.md)、六份脚本的相关改动和真实生产消费者。没有修改生产代码，没有操作手机、IDE、服务，没有构建、推送、上传或提交；并行 Map 生产改动不在本审范围。

## 已核对的边界

- **真实遍历与 submit 语义保持。** 两个 `starTraversal` 包裹点分别覆盖实际 BSC 和 SAO/同时间退出星点的循环。原 `paintStar`、投影、pick/name 收集及 transition 调用仍按原顺序执行；跨包裹范围使用的变量仍位于原外层作用域。`submit` 的空数组早退保留在包裹前，原 typed packing、上传、draw、贡献处理和 catch/同一异常重抛都留在包裹内。复用 quad 的再次 submit 仍是真实提交，不虚构上传。
- **实际 paint 归属。** r19 的 `paintStarted(frame)` 位于原 `port.paint` 之前；r20 在这个同步 `port.paint` 调用范围取同次 admission 的数字事实，并在 finally 恢复 scope。异步回调或该调用返回后的独立工作归 `unbound`。原因并集按 unknown 优先、其次 effect、最后 continuation 分类；它不能证明内容重复或浪费。
- **嵌套不能相加。** 第一颗星的 `disc` 可 flush 前一图元，submit 会嵌入遍历；两者也可能都在 draw 内。实现和协议明确输出 inclusive wall elapsed。嵌套 paint 归 unknown，外层 inclusive span 仍包含其执行时间，不能把组间或阶段 subtotal 当互斥 CPU 分解。实际 writer 的 busy/schedule 所有权未改动。
- **停止和 Play 生命周期。** 每个成本 span 绑定 generation，Stop 清 scope 并更换 generation，旧工作结束时不能写到新 run。外层 `active` 门保留正常 Play 前 1 秒 armed 阶段的排除；manual 的首次有效输入、15 秒导出、60 秒同次正常 Pause、terminal、取消/隐藏仍由原 owner 管理。r20 没有新 timer、scheduler 或输入写入。
- **有界保留与时钟。** 新增状态仅为三组 × 三阶段、三个 unbound 阶段及数字 scope；scope 不保留 frame/report/scene，原 WeakMap 和 32 项数字环未扩大。继续使用原 `now/interval`：低于分辨率、时钟不可用、逆跳、跨窗口和超范围不冒充零耗时。throw/return 语义没有变化。
- **协议仍严格。** r20 必须解包为 r19，再解包为既有 manual geometry 或原 v3 协议；无新字段进入 legacy 白名单。新结构有固定键、计数/unknown/已知 subtotal 一致性和与原因直方图的约束。完整 receipt 仍受原 32 KiB 限制；新字段在已有 export-only 裁剪之前加入，若不可裁剪的基础记录本身超限，仍由原路径拒绝，不扩大预算。collector 同字节重试及 409 冲突语义不变。

## 独立执行的有限检查

未重跑作者的 32 项全套。只运行能检验主要语义与严格性的三项现有检查，**3/3 通过**：

```text
node --test --test-name-pattern='r20 executes real BSC|r20 actual writer scopes|r20 complete receipt remains' .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-normal-input.test.mjs
```

分别执行原/注入后的真实 BSC/SAO 与 submit 代码、真实 lifecycle writer 的合并/clone/延期工作，以及完整 receipt、严格拒绝和 collector 幂等/冲突；不是只检查字符串标记。

另外直接加载当前 `createR20DrawCosts` 做了五个小反例，**5/5 通过**：嵌套 paint 归 unknown 而外层仍 inclusive；重复 admission 不复用旧 effect；返回后的 submit 归 unbound；unknown 位优先于 effect；span 中 Stop/启动新 run 后旧 span 不写入新记录。该检查使用受控时钟，只验证状态归属，不是手机耗时。

作为预算交叉检查，已有 r19 手机分钟长按原件序列化为 22,052 B；附加最小 run（一条 unbound draw）的固定 r20 扩展增加 3,250 B，合计 25,302 B。它只是实际已有 receipt 的容量例子，不是新手机记录或所有负载的上限证明；完整上限和拒绝策略仍由上述协议检查保障。

## 接续条件与保留缺口

root 在当前 Map 改动稳定后完成完整候选构建；收集新样本前重载现有 bridge 的当前协议模块，并验证真实非空 r20 receipt、各阶段 valid/unknown 覆盖、实际星点负载及 paint 分类。选择修复时比较同一次窗口内的已知 subtotal 和覆盖，不能把嵌套项相加，也不能从字节上传量推断 GPU 耗时。

这次未重新做完整严格 typecheck、构建或 60 秒 Play；作者已有对应检查可在其声明范围内复用。Memory/retainer、跨日流畅和叠层真实行为的独立未决项没有关闭。源文件身份、检查范围与结果见 [JSON](R20-DRAW-COST-REVIEW.json)。
