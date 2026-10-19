# A1 / preview fixes independent review — 2026-10-19

## 可行动发现

本次未发现新的可行动阻断缺陷。[上一轮观察边界独审](OBSERVATION-BOUNDARIES-INDEPENDENT-REVIEW.md)的 P1、P2 已在当前实现和独立回归中修复。此结论覆盖下述软件与指定画面范围，不解除 gen26 UNKNOWN，也不认证 A/B、地形等待或完整 Goal 已通过。

- **P1 已修：auth success 不再成为 preview success。** `device-feedback-official.mjs` 的分类/旧状态规范化及 `device-feedback-session.mjs:113` 的原 task 结果记录均将成功的 `taskType: auth` 保持为 `authorization_ready` / `authorization_completed_preview_not_invoked`。原 tool/taskId 保留；`device-feedback-binding.mjs` 不接受该状态，记录授权不会调用业务预览。旧错误 `completed + auth success` 也会在读回时规范化。独立运行新增的 authorization 回归，通过且实际绑定被拒绝。
- **P2 已修：原返回值先保存，后做完整性与 QR 检查。** `device-feedback-preview.mjs:92` 在任何 post-call generation/QR 检查之前调用持久化回调；后验失败仍保留 sanitized 原结果与 taskId，状态转 UNKNOWN，不能借失败开放绑定/重发。两个真实 caller 已接持久化回调。新增 semantic-config-drift 回归独立通过，保存状态仍持原 `preview-before-drift` handle、调用次数 1、绑定被拒绝。此修复不能恢复历史 gen26 已丢失的原结果。

## 范围与独立性

完整读取 AGENTS/global、默认 manifest 路由、当前 PLAN/HANDOFF、development Skill/performance-investigation、旧独审、A/terrain 方案与源码、A1 preparation MD/JSON；视觉复核另读取 interaction Skill、DESIGN 的 WEAPP/Sky 规则及 `spot-and-sky` 的地景合同。复用既有方案，未重做同轮方案审查。

本次没有手机、ADB、DevTools、feedback、服务、网络、账号、数据库或构建操作；没有提交或改动实现、PLAN/HANDOFF/INDEX。本文件是本审查唯一持久工作区写入。自动检查只运行 mock/纯协议/临时 fixture，materialized fixture 使用现有已构建源。

## A1 实物绑定与正常责任保留

独立读取实际文件并重新计算，不只依赖准备记录中的布尔值：

| 实物 | 独立结果 |
| --- | --- |
| A1 manifest | SHA-256 `c0030c917f36a52322be2b69008a3d8c145608436d6beb3c47e3ad4f92829639`，与 preparation 一致 |
| buildSource | `ca9170ccf2fbfe0e520335cc81bdb5ee3e2520b9144fefb1858def5e4d83d758`；由实际 bindingInput 重算一致 |
| 当前输入与候选源 | 1,569 个生产输入、1,577 个 materialized 文件、17 个模板逐项 hash 一致；完整 snapshot `3e7c8f8fb36e8a89a8f21a3d44d493a089873eab21ddc969fdf3020d8cfc158a` 一致 |
| 两份完整 bundle | 均为 `2109fd9522be3c1613a0d4bb45824a9a5cbc79e27953898d04c99adfdf29293d`，338 文件 / 5,008,391 B |
| 外置 maps | 31 组 map→实际 JS 的 hash/字节数逐项一致，16 个关键源 `sourcesContent` 与本次 TS 字节一致；两份包的 80 个 JS 均无 sourceMappingURL，包内无 map |
| 历史 gen25 | archive 的 10 个原 builder/template 与 4 个历史输入逐项 hash/字节数一致；旧 materialized fixture 19/19 独立通过 |
| A1 materialized fixture | 20/20 独立通过 |

比较 A1 与实际 gen25 review-r2 的全部 sourceBindings，差异只在 13 个预期路径：A runtime/controls/Page observer/helper，六个真实 Map/文件消费者，以及 terrain runtime/marker/source manifest；未发现额外 Sky 生产 owner 或数学变化。builder 只有有限 `--observe-a1` 分支，未复制完整 builder；旧 builder/template 字节已归档，旧候选源/包未被覆盖。归档 builder 保持 provenance 范围，不能从迁移后相对路径直接执行。

逐项追踪 normal transform 与实际 materialized page：原 time-presentation memo 的依赖/返回身份、完整 accepted ref/state/updater/equality/null retirement、原 command setter、Scene/BSC/SAO、GPU/native copy/caption、资源需求与退休 owner 均保留。没有 scene-memo 替代、冻结渲染或 synthetic accepted。原 15 秒 metrics、同次产品 Play 的 20 秒 Pause、hide/unmount/replacement-run 和 metrics→terminal/同 bytes 重试守卫继续存在。夹具的这类行为证明仍是软件范围，不能证明手机非空负载或持续播放。

## A 与 terrain 观察语义

**A：** request 时间戳位于原 draw owner 提交 lifecycle 之前；paint 位于原 lifecycle 取出实际 latest frame 之后。保留 prepareToken、原 intent/accepted 关联及首次 request/paint 去重，不移动 memo 或 admission writer。新增字段为既有 2,048 preparation ring 上的有限数字/布尔/null；分布和 first 4 + last 4 链仅在 export 构造。normal run 绑定、固定 Date wall-elapsed、epoch/window 检查、未知/亚分辨率计数、32 KiB/严格字段和旧 v1/v2/v3 兼容已核。它可把 presentation-finish→paint 分为 request 前/后两侧；Page 三计数只支持时间位置关联，不能证明 payload/intent 因果、React CPU 或物理呈现。retained/preselected 分布限制、未观测项及各阶段不能直接相加的限制继续有效。

**Terrain：** 六个注入点仍执行原 metadata Promise、实际完整性检查后的文件获取、共享 cache/租约、原下载 callback 与双 slot native coordinator，没有替换请求、成功或清理。imageKey/publication/path 只在有界匿名关联表内使用；80 事件 / 64 身份 / 15 秒、一次专用 key 写入、hide/unmount 封存与时钟回拨 UNKNOWN 已核。runtime 与 source manifest 使用真实 A1 buildSource，实际 emitted map 源也一致。

marker 会异步触发少量 Page 更新，本身属于观察成本；只在规定的 DAY 诊断动作解释，不作为普通 UI 或其它主题验收。当前 file_ready/current native_ack 标记实际先可见、同一有效资产仍空，才支持“至少部分等待在 ready 之后”的正向下界；跳过标记、旧资产/cleanup、无新请求、未可靠关联均不能反推出请求侧瓶颈。没有把 callback 当 decode/呈现时钟，亦没有从本软件准备选择分块/预取/worker 修复。

## 指定画面复核

实际查看 root 提供的五张 contact grids：外部 `normal-existing-resume-20261019/landscape-review/grid-{1792365751791,1792365780158,1792365810729,1792365838556,1792366327131}.png`，并查看现有 `output/playwright/r17-landscape-v2/{baseline,candidate}-panorama-below-45.png`。没有浏览其它手机内容或原账号资料。

这些采样画面可支持有限结论：上方天空保持星点/星座；地平附近的地面暗；继续向地景侧浏览后，灰色方向提示可辨，后方星点与星座仍可见；两组反向采样重新出现暗地平。未见采样间明显构图跳向或灰层突然消失。软件 before/candidate 展示的“原几乎消失→可辨灰 cue”与此方向一致，但手机相机/星空/合成不同，不做像素等值比较。

本次只审 contact grids，没有逐帧审原视频，不能据此认证连续触控流畅、physical FPS、绝对 pitch、完整越极点、精确抓取误差、亮度适应、pinch/follow/cancel 或同帧 picking。原正常Sky v3 的独有标签及输入授权/会话身份属于 root 证据；这些画面不绑定 A1/gen27、手机整包或 H3/gen26。

## 独立执行的检查与剩余义务

- `node --test` 三个 preview/feedback 边界文件：**40/40** 通过。
- `node --import tsx --test` A-correlation 与 terrain-observer：**12/12** 通过。
- 现有完整 materialized A1 fixture：**20/20**；旧 review-r2 fixture：**19/19**。另独立完成上述源/模板/bundle/map/archive 逐项实物读回。
- 首次本审查 archive checker 误用不存在的 `row.file`，在解析声明字段后改成 `row.archive` 才通过；只修正临时只读核验命令，没有修改 producer 或候选。未重跑完整构建、类型检查、CPU/heap 大样本或无关套件。

gen26 原官方终态仍 **UNKNOWN**，未重发、未绑定；已完成 CPU/Map 资格样本和 normal gen25 结果保持原范围。新候选尚未选中/送达/绑定；实际服务是否 reload 并准入 A 扩展/terminal、手机非空正常负载、A phase/Page 结果及观察成本、B 正常目标有效 Allocation sampling/增长/稳定尾段/恢复、terrain 目标 key/标记/实际覆盖关联和完整 R/H/A/N 验收继续未验证。8791/N05/R6/配对/VPN 的保护边界未变。
