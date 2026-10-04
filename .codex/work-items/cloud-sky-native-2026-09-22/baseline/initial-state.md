# 当前状态与恢复检查点

更新时间：2026-09-22 16:55 +08:00。阶段：goal 已启动、任务持久化校验完成；接着核实首条真实链路。完整目标仍待开发与验证，禁止以本目录建立完成为由完成模块 goal。

## 工作区基线

- 指定目录：E:/dev/worktrees/Starward/remote-main-20260908。
- 开始时 HEAD：6f6139ce282e424f6da4792ea8e892e4a48d1895。
- 开始时分支：codex/remote-main-20260908，这是用户指定的既有 checkout，非本任务创建；main 已由 E:/dev/Starward 占用。同 HEAD。保护此处未提交改动，不擅自切换/重置，也不以默认 main 规则移到别的 workspace。
- 已有 tracked 修改：project_context/architecture/runtime-and-domain.md；project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md；project_context/context.toml；project_context/external-capabilities.md。
- 已有 untracked：.codex/work-items/stellarium-cost-research-2026-09-22/，包含 research.md、cost-model.mjs/json、monthly-scenarios.csv、inquiry-draft.md。
- 本轮只新增 .codex/work-items/cloud-sky-native-2026-09-22/ 任务记录；当前没有生产代码修改。
- 完整起始 status、上述差异、tracked owner 快照及代码清单见 baseline/。不得拿快照回写覆盖后续修改。

## 已核事实

- 已完整读取用户原始附件。选择扩展原生引擎、全部功能、I/O/校准语义、数据权益和成本口径已保存完整原文，任务摘要不替代原文。
- get_goal 初次返回 null；随后使用 GOAL.md 原文创建了 active goal，未设置 token_budget。工具结果保存在 goal-creation.json，任务 ID 为 01a0c848-f0f5-7760-a397-84b4a47ff7e2；该结果是创建时快照，后续状态用 get_goal 查。
- request-original.txt 与附件逐字节一致：16,018 bytes、210 行，SHA-256 为 2370EB26635352046BC3BE983BF6BCB3EC23688B09406FD0D81E61308F91909A。已归档 72 个当前事实源/研究/设计/技能/manifest 输入，共 3,815,635 bytes，全部可读且哈希一致；原有这些文件未改动。备份不等于阅读或验证。
- 默认 Context manifest 确认仅 global.md 是默认正文；相关 owners 按责任扩读，不装网络 CLI。
- 已读取仓库 AGENTS、global、manifest；选型 owner 中“云观星引擎选型”；原研究 1–55 行和全部 cost-model.mjs。研究其余部分已索引，开展受影响机制前继续读取。
- 已读取 sky 合同 1–38 行（当前采用/校准/左下披露/全天/分层）及资料/来源相关条款；共享时间资源段落；runtime/domain 的 Sky catalog、Cloud-sky progressive imagery、Celestial object selection 相关段落。大文件之前批量输出有截断，不能把未显示部分算完整阅读；编辑责任前读取该完整相关段。
- 已读取 UI 实施技能和 wechatide 根技能；真机/具体 scene 尚未启动，按需要读取。
- 已读取 ADOPTED、adopted/cloud-stargazing/README、sky 当前局部 CURRENT。实际视觉查看和 prototype 检查尚未完成。DESIGN 小程序相关章节和 Source inventory 相关义务仍待按需完整读。
- manifest 核实 Taro 4.2.1、React 18.3.1、twgl.js 7.0.0、quaternion ^2.2.0。
- 当前 sky-scene-render.ts 前 170 行确认：普通天空固定 #080D17 / 观测黑底；基于同一 basis/FOV/center 绘制；选中深空图在暖红隐藏；地平/30°/60°网格；星座共用帧；BSC 依据真实 magnitude/colorIndex，SAO 无采用色值用中性色；绘制/点选共享当前数据。这里只证明源码结构，尚未验证 native 实际结果。
- sky-gpu-renderer.ts 定位到 TWGL/纹理/批处理/clearColor 所有者，尚需完整 inspect。现有分层、相机、校准、生命期测试与发布管道已定位。

## 初步缺口与首条链路

原生投影/全天浏览/BSC+SAO/星座/选中对象红外图已有可复用实现；固定天空底色不是完整银河/大气/晨昏，少量红外切图不是 optical all-sky。精细太阳系、通用搜索定位跟踪、动态轨道以及整体设备验收仍需核对/补齐。没有把代码清单或旧研究算已通过。

首条链路：真实 BSC5P/SAO 数据及 BFF exact-time geometry → 当前观察上下文 → native WebGL → painted pick/标签 → 同一身份 modal/source → 时间/缩放/生命周期。并提前核实 optical/深星/轨道数据权利与关键格式/运行时机制，继续独立代码工作。

## 下一步（恢复时从这里继续）

1. 在进行 UI/数据代码修改前，完成与首条链路相关的 DESIGN、Source disposition、runtime/source owner、采用视觉和验证技能读取；初始快照保存不等于完成这些读取。优先 DESIGN 小程序 267 行起的 profile / 6.12 Full-Sky Orientation Canvas、相关 Source sky/observation/sensor 条款及当前有效参考图。
2. 查看生产目录 manifest 和 BFF/客户端实际调用及现有测试，然后运行一组有代表性的确定性基线；新发现/失败保存在 evidence/，绑定 REQUIREMENTS。从 stellar-geometry-provider、BSC/SAO publication、sky-stellar-scene、drawSkyScene、pick snapshot、celestial modal/source 逐段追踪。
3. 按官方 wechatide 与项目开发/真机技能读取当前 runtime/设备事实；无设备仅限制设备证据，不停止独立计算/数据/渲染开发。
4. 沿 PLAN 第一链路关闭关键缺陷，开始完整功能扩展；不得以 baseline 完成为目标完成。原文八节及当前 owner 未完成项持续有效。

## 运行中命令、待答问题和外部条件

- 初始化时没有运行中长命令、没有未完成 wechatide pendingTask、没有用户待答权限问题；没有联系供应方或进行任何发布/采购。
- iOS/Android 设备、账号/会话、实际部署数据/网络、光学数据权利未在本任务确认；不是已证实不可用。
- 独立审查尚未进行，目标运行时验收尚未进行，性能/实际成本未测。缺口见 REQUIREMENTS。
- 不设置 token budget，未承诺交付日期。原估计不可当上限或暂停授权。

## 最新检查

- 2026-09-22 16:54：附件/归档 SHA-256、72 个输入快照、72 个原文件保护状态、7 个目标正文中的恢复路径、GOAL.md 与 create_goal 返回目标全文一致性全部通过，退出码 0；见 evidence/record-integrity.json。
- 2026-09-22 16:54：npm run context:validate 退出码 0，见 evidence/context-validate.log。仅证明 manifest 路径和显式 controlling-source 声明，不证明普通链接、事实正确性、实现或真机。
- 当前未运行产品测试、未打开 DevTools 或连接真机，未修改生产代码；不把当前初始化工作记为 C01–C10 或 V01–V07 验收完成。
