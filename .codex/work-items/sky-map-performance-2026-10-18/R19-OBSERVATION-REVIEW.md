# r19 有限绘制原因与地形观察器复核

2026-10-21；独立只读审查，源码基于 HEAD `5b27a062c670cb2336e8e5c00c7e7a4071db0fac` 加当前未提交修改。审查者只新增本报告及对应 JSON，没有修改产品或受审脚本，没有操作设备、IDE、服务、实际构建、上传或提交。

**未发现 P1/P2 阻断。** 这份观测补充足以进入当前候选构建与目标运行取数；它本身不证明性能修复、物理呈现或无内存泄漏。九份受审源文件的精确 SHA-256 在 [JSON](R19-OBSERVATION-REVIEW.json)。

## 已核对的责任

- `inputResourceEffect` 只来自原 page effect；camera / stars / names / images 四位直接读取原 continuation 条件。原条件、draw 依赖、请求对象和原调度参数保留；ready、resize 等未分类入口为 unknown，不据时间相等推断原因。
- 原生命周期仍只有 dirty/latest 和一个 writer。新请求只在原 dirty 为真时合并 pending 原因；已在飞行中的帧不被新请求覆写。实际 native clone 经原 `resolveFrame` 边界继承标记，paint admission 从原 `paintStarted` 边界取同一弱身份，intent / preparation 仍来自原帧事实。reset / retry 保留已有原因并加入 unknown，未冒充新的资源 effect。
- 弱身份最多每 256 次轮换，paint 环为 32 行数字，两个直方图各 64 桶；不保留帧、场景、图片或 Context。Stop 清理弱身份且停止回调计数；新 run 重置，不通过时间字符串把遗留帧补配成新输入。丢失身份保持 unknown。
- r19 使用显式外层 schema，校验器解包后仍走原 manual-geometry / normal / ruler 规则。新增字段在原 32 KiB 总预算的裁剪前加入；原 collector 路由、同字节重试与冲突拒绝保留。手工输入没有 Play terminal；正常 Play 的 15 秒导出、60 秒同次 Pause 与 terminal 重试仍由原 owner 控制。
- 地形观察器读取现有 result 的 `phase` 与 `presentationUnknown`；pending、unknown presentation、failure 分开，不计作 native_ack。原 `starward-terrain-wait-v2` schema 与 `starward.task.terrain-wait.v2` storage key 保留，旧原件没有改写；native_ack 仍不等于像素可见。

## 最少独立检查

复用作者已完成的 25/25、18/18 和完整源内存 typecheck 结果，不重复全量套件。本审查独立执行：

1. `node --test --test-name-pattern='r19 real latest-frame|r19 keeps bounded|r19 complete geometry|r19 keeps complete normal Play' .../r17-normal-input.test.mjs`：4/4 通过，覆盖实际生命周期合并、clone/replay、弱身份轮换、停止与新 run、严格 receipt/collector 以及 Play 终态。
2. `npm run node -- --import tsx --test --test-name-pattern='pending and unknown|current real consumer transforms|event overflow' .../terrain-wait-observer.test.mjs`：3/3 通过，覆盖 pending/unknown 不冒充确认、80 事件封口和当前真实 consumer 的注入边界。
3. 九份受审脚本 `git diff --check`：通过。

地形测试第一次直接用 `node --test` 启动时，TS 模块加载未得到命名导出；随后使用仓库既有 `--import tsx` 入口通过。该失败属于测试运行入口，不是产品或观察器行为失败。

## 使用限制

原因直方图表示请求原因在一次 pending admission 中的并集，不代表所有被合并输入都已画出，也不能据此称为浪费。paint 环只保留最后 32 次 admission；它不提供逐帧 CPU、GPU、物理 FPS 或每种原因的独立成本。实际候选必须保留非空全天空/地景负载及首次有效结果、最终终态的验证；Memory/retainer 问题仍按原计划单独未决。
