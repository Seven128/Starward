# 发给新对话：按既定方案实施微信原生迁移

请使用 [$durable-goal](C:/Users/777/.codex/skills/durable-goal/SKILL.md) 管理本次任务。**前期分析和唯一迁移方案已在上一对话写好；这条消息是我另行明确开始实施的授权。现在沿既有方案执行，不重复生成方案、不重新做技术选型，也不要因为第一次在本线程使用该技能而再次停在前期准备。** 若需要改变既有方案方向，先给具体依据与修改建议，等我明确授权；方案内的局部实现选择、必要修复和验证直接完成。

仓库：<https://github.com/Seven128/Starward>
工作区：`E:/dev/Starward`，沿当前 `main`。
唯一入口：`E:/dev/Starward/.codex/work-items/wechat-native-migration-2026-10-31/INDEX.md`。

**迁移起点是本次迁移准备提交**，包含测试退役、有效规则、旧计划封存及本目录方案，不再以分析时的 `f09da5e` 快照作为执行起点。该提交是首次加入本目录 `PLAN.md` 的提交；如消息未附具体 SHA，可在仓库运行 `git log --diff-filter=A --format=%H -- .codex/work-items/wechat-native-migration-2026-10-31/PLAN.md` 定位并记录。核对当前 HEAD 已包含它，保留它之后的合法改动，不自动 reset/checkout。这个提交就是可恢复起点，无需重新做一轮基线准备或提交。

先调用 get_goal，再读以下已有文件及 AGENTS.md/project_context/global.md。它们能恢复完整要求，不要只根据这段提示词执行：

1. 同目录 `REQUIREMENTS.md`：完整用户要求、最新纠正及授权。
2. `PLAN.md`：唯一方案，包含架构/版本、公共组件取舍、优化迁移表、M0–M6依赖顺序、Context矩阵、21注册路由和最少验证。
3. `HANDOFF.md`：当前工作树、阶段、遗留与真实未验项。

**默认不读 `RESEARCH.md`、`sources/` 或旧咨询提示词。** 所有已采纳决定、实施约束和必要风险已落实到 PLAN/HANDOFF。只有实际发现方案矛盾、证据缺口或需提出方案修改时，才查对应的依据段落；不整篇重读、不重新评估两份模型回复。适用的项目规则/Context及当前模块源码仍按需读取。

Goal应覆盖**最终完成迁移**，包括代码、公共组件/业务及性能优化、工程与Context同步、兼容、必要真实验证和封存任务交回；不能只以“方案已写完”为目标。同任务Goal存在就续用，无Goal才真实创建并在正文写入上述绝对入口。本任务前期已完成，本轮是已授权实施。上一线程曾误建的Goal已被我暂停，那是停止上一对话实施的指令，不抵消本消息对新对话的明确实施授权；不能伪报工具状态、覆盖无关未完Goal或新建第二套任务记录。

关键要求再次强调：

- **前端最终全原生**：微信Page/Component＋WXML/WXSS＋TypeScript，最终退出小程序Taro/React页面运行时和临时桥接。原生不等于放弃npm/构建/成熟库。后端Node/NestJS/Fastify＋Python、PostgreSQL/PostGIS、Redis/BullMQ保持；独立React Native/Expo App及其API保留，不恢复开发。
- **已选技术**：Zustand vanilla5.0.14、TanStack query-core5.90.20、npm/Webpack5/Sass/PostCSS。当前根还有另一query-core版本，保小程序实际版本和单一实例。core在无window环境会禁内部定时刷新，而Map天气预警在用该能力；按PLAN接原生刷新/前后台/联网和client.mount，不能只换import或伪造全局DOM。
- **公共组件与成熟能力必须落实**：已比较TDesign/Vant Weapp/WeUI；本轮选原生基础组件＋原生化Starward公共组件，不预设整套套库、不一律排除原生库。保唯一主题/token、SemanticIcon、受控状态、Back/手势/草稿owner。共同规则一次实现并迁真实消费者，不能逐页复制；不同机制用窄适配，不做万能框架。
- **保业务与既有优化**：按PLAN表逐owner处理。保账户/隐私/存储/草稿/未决命令、取消/迟到/代际、共享Query/缓存与reader、Map文件/native pin/安装/退休、Sky时间/几何供给/唯一writer/accepted/图像生命周期。Sources暂存、My逻辑前台、真正卸载不能合并处理。没有依据不得删除平台修复、重置预算或重开D1/D2/F04及已否决实验。
- **产品和设计保持**：功能、科学精度/时空语义、完整星表/必要影像、数据有效性/来源、画质及当前采用UI不缩水。每个UI模块前按owner实际查看Stitch采用资源。不能借原生化换引擎、Skyline、关闭preserveDrawingBuffer、改主题或降质量。
- **顺序已经确定**：M0核当前工作树/可恢复基线；M1公共runtime与原生构建，首条真实路由spot/data-source；M2公共视图/导航；M3/M4尽早打通Map→My→Map及Map→Sky→Sources→Sky→Map；M5按业务族迁完21注册入口；M6退出旧运行时、工程/Context/必要验证收口。不要先搬完简单页面再碰核心生命周期。
- **Context随实际模块同步**：按PLAN矩阵改现有owner、实现索引、开发/验证/发布入口及相关skills。当前事实与目标分开，不全仓替换“Taro”字样，不改低产品/设计合同掩盖缺口。计划、状态、证据各有唯一责任位置。
- **不写测试代码**：现有1302个项目测试/专用支持文件已退役，迁移中不得新增/恢复/移植测试、fixture/mock、专用测试页面、断言驱动或改名验证脚本。业务文件内残余纯测试入口按真实consumer退出；正常业务校验和真实诊断保留。代码质量约束照常遵守。
- **必要测试/验证仍要做，尽量少**：现有类型/编译/资源与发布保护，加PLAN四组按机制合并的真实旅程；所有注册入口基本可用与设计要覆盖，但不跑21套性能实验或历史全组合。用官方工具/实际设备，复用仍有效证据；缺数据/设备明确未验并推进独立工作。做完交代已验结果、实际收益，以及还需完成的最少操作和依赖，不能虚报通过。
- **旧任务继续封存**：`.codex/work-items/sky-map-performance-2026-10-18/` 的P1–P6/D0–D3、全国云量/光害、后端/CDN/部署等不在本次顺带实施。迁移完成后交回完整目标/证据/缺口/重开条件与新owner，先另行重写旧方案，再继续实现。
- 保所有当前未提交成果、数据、账号/storage、原始证据；不reset/clean或恢复旧测试，不自动建分支/worktree。只在用户范围内使用工具，不顺带发布、数据上传或给他人发送消息。

请从HANDOFF指向的M0/M1开始持续实施，按模块结果汇报。达到必要证据后继续下一模块，不重复检查求安心；存在真实冲突时说明具体影响，继续仍可独立完成的部分。全部必要结果达成才把Goal标complete。
