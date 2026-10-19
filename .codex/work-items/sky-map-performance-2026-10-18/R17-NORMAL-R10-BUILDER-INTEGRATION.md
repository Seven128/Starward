# r10 task builder 接入跨日等待连续性修复

2026-10-19，`adapt_r10_normal_builder`。状态：**TASK_ONLY_OFFLINE_PASS_COMPLETE_BUILD_AND_PHONE_UNVERIFIED**。只改 task builder 与已有 fixture，复用已独审的生产修复，不重审或改变其方案。有限入口为 `--observe-a1 --review-r10`；旧 r2–r9 分支保持原源码变换。

r10 计量包裹当前生产 `requestedTimePresentation` 的真实 `presentSkyTime` memo，保留原四项依赖。`selectSkyTimePresentation` 与 accepted scope 逐字不改；等待时复用已接受天空没有额外准备，也不会被计作新请求完成。一次实际算出 null 的请求仍是一次真实准备尝试，其 token 不绑定回退绘制。

原 draw 回调在 pending 时可能继续存在，因此 probe 用仅保存当前准备的 ref，在实际 request 处与 draw 所用的呈现身份核对；旧回调、accepted／committed fallback、无数据输入均不能消费新准备。相同时间复用 memo 时 token 仍归原准备 intent，不借新 state 重新计数。没有历史缓存、另一时间 writer、原生对象保存、资源需求或 draw 调度依赖变化。

复用 r9 的15秒 metrics、60秒同 run guarded Pause、原45秒 recorder 上限、单键 surface retirement 回执；迟到相对戳依原协议为 null。30秒 paused drain、普通预览与实际退出仍由 root 的现场观察负责。r10 的历史 owner 指向已存在的外部 `r9-before-r10-20261019/owner-manifest.private.json`；未把原 runtime session 的可变元数据说成旧字节复现。

离线结果：r10 **30/30**；旧 r8 **21/21**、r9 **25/25**；有限 argv **12/12**；r2–r9 的 page／controls／surface 输出对照 **24/24**。历史 raw 生产页由授权只读 `git show 3818...` 读入内存，必要的 CRLF 恢复后 SHA 精确匹配 r9 manifest。当前已有 `r17-normal-input.test.mjs` **11/11**；Miniapp TypeScript **5.9.3** 对全部1583份内存准备输入的严格 overlay 检查 **0错误**。

新增反例实际移除 current-ref 更新后失败：pending 旧 draw 带 token 1，期望 null；修复存在时通过。还核对 pending 保已接受输入、accepted-only 反复 render 不新增准备、新供给正常接管、等时复用归原 intent、取消、无数据、外来 binding 和准备抛错。fixture 只覆盖软件接线，不模拟手机像素或物理时延。

本 agent 未调用 prepare/build/inspect、未生成候选目录，1583份变换仅在内存中；只运行已有测试的临时 fixture。未操作设备／IDE／feedback／服务／账号／配对／VPN，未执行 Git 写操作，未改生产、协调 owner 或 Skill。root 仍需独审本次 task 变更、完整构建及同候选真机确认。完整 A/B、Apply／持久化、地形和其余 Goal 均未由此关闭。

精确 task／生产／历史绑定、逐项检查和限制见 [机器记录](R17-NORMAL-R10-BUILDER-INTEGRATION.json)。
