# Gen14 Map 内存观察独立证据复核

2026-10-23。只读复核[结果报告](OVERLAY-GEN14-MEMORY-RESULT-20261023.md)及[观察入口](OVERLAY-MEMORY-OBSERVATION-NEXT-20261023.md)，按当前 AGENTS、development skill 与 performance investigation method 检查。直接解析私有 owner 中全部 13＋5 行、各自两条 anchor、process sidecar、readback、source readback、product binding，以及相邻手机批次的 20 条 phase anchor。本代理没有运行设备、IDE、服务、构建或新采集，只新增本复核报告。

## 结果

未发现改变当前下一动作的证据缺陷或 P1/P2 结论问题。支持结束本轮资源观察，并继续核第二次手势未产生位移的输入/目标接受边界。

一处表述应修正：结果表的“原 13 点末点（关层前）”应改为“原 13 点末点（双层 off 尚未确认的混合窗）”。`terrain-off-invoke` 比首窗 end anchor 早 10.985 秒，`terrain-off-capture` 也已启动；只能确认尚无两层关闭后的 idle 样本，不能把该末点称为任何关层之前。该修正不改变有限资源趋势或停止采样的决定。

## 直接核验

- 两份观察文件实际 SHA 与各自 `completedRowsSha256`、readback 全等：13 点 `49b6caff10d13bbecbfb7952e8e253e1ee6585f98ef22d6bc04fe5228d6506c7`；5 点 `02695861cc436e2a17779d53a3342a503d69c5d5011f6bf7923f974914eb6f98`。anchor/sidecar/phase 的文件 SHA、行数、逐行数值也与 readback 一致，均正常 `observer_returned`。
- 18 点均为已验证前台 owner 和实例。实际 PID/name/activity/startTicks 在两文件及各点完全一致，前后 startTicks 相等；watchId/sampleIndex 对应正确。sidecar 与观察 bracket 同起，sidecar 结束早 0–1 ms，符合源码先写 sidecar 再完成观察行的顺序。三份实际工具源 SHA 与两份 start anchor、source readback 一致。
- 保守 off 观察边界确在首窗 end anchor 之后 89.637 秒，第二窗 start anchor 在 off 后 276.247 秒；两窗之间 365.884 秒未采样。报告没有把两窗拼成连续回落曲线；host wall 先后关系仍保留原端点读数和中间漂移限制。
- 五点 PSS/RSS 首末下降 65,716 KiB＝64.17578125 MiB；后四点各自极差 608 KiB。Swap PSS 恒定；Native Heap PSS 为 292,634→291,658→291,658→291,642→291,642 KiB，Graphics summary 恒为 171,620 KiB。表格、单位及约数与原行一致。

## 限度

两个原 start anchor 仍是 `productCandidateVerified=false`、`productRunId=null`；补充关联中的手机字节与 runtime AppID 也均未验证，没有覆写为产品绑定。实例一致仅覆盖实际采样点，不补齐窗间状态。

报告保留操作前高基线、整个 Appbrand 进程归属和 PSS/RSS/Swap/分类重叠限制；未把残留、Unknown、Native 或 Graphics 归为某页面、JS isolate、泄漏根因或完全回收证明。有限五点没有新增持续上升信号，可以决定停止本轮，不能完成叠层资源或 Sky 内存验收。本代理未重复查看 Root 已查看的视频/截图，视觉结论仍由原手机证据与 Root 复核承担。

私有原件位置沿结果报告 owner；本报告不写真实手机/进程身份值，也不改原件、PLAN、HANDOFF 或源码。
