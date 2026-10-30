# 发给 Web GPT Pro：微信小程序全原生迁移方案建议

请为 Starward《今晚去观星》给出一份基于实际源码的微信小程序全原生迁移方案建议。现在只做方案分析，不实施代码，不操作部署。

仓库：[Seven128/Starward](https://github.com/Seven128/Starward)

源码参考提交：`f09da5e2762c6f80f387ded5a5de853b160e9924`。本轮本地的迁移任务登记、测试代码清理和新规则尚未提交/推送，所以公开快照仍可能包含旧测试及旧Taro开发要求；本提示中的最新用户决定优先，不能据旧文件要求恢复测试。若读取其他提交，请明确版本差异。

## 一、已经确定的决定，不需要重新做选型辩论

1. 当前及未来一段时间只交付微信小程序。前端最终从Taro＋React改为微信原生页面/组件＋TypeScript；最终小程序不依赖Taro/React页面运行时，也不把永久混合作为终点。逐步迁移中的短期混合可以讨论，但必须有退出条件。
2. “全原生”是WXML/WXSS与微信Page/Component等原生页面体系，不是Android/iOS独立App。TypeScript、npm、必要构建、状态绑定库及公共业务模块可以使用；不意味着所有能力从零手写。
3. 后端保持Node.js/NestJS/Fastify＋Python管线，以及PostgreSQL/PostGIS、Redis/BullMQ。只处理前端切换确实要求的兼容，不把迁移扩大为Go/Rust重写、微服务化或拆仓库。
4. 不改变产品功能、采用设计、科学精度、数据覆盖、画质、时间语义和必要可靠性。我的目标是同成本更高性能、同性能更低成本或两者兼得；一次性迁移投入不是主要否决理由，长期维护要评估，但不要编造固定百分比。

## 二、必须遵守的新规则：迁移期间不写任何测试代码

用户原话：“将已经写好的所有测试代码全部删掉（不是业务代码），并且迁移过程中不允许添加任何的测试代码。当然代码质量约束是要遵循的。”

本地已退役1,302个项目自有测试/专用支持文件，相关测试命令和CI测试步骤已移除；内存测试仓库、确定性天气、合成地点模拟成功等测试专用入口已退役。真实数据库/天气路径、业务参数/权限校验、数据完整性与实际发布保护保留。历史报告、Profiler/Heap与采集原件保留，但旧测试代码不再是可复用的执行基线。

请严格做到：

- 不建议新增、恢复、移植或生成单元、集成、合同、E2E测试，也不添加fixture/mock、专用测试页面、模拟器、smoke/回归脚本或临时断言程序；不能换成“校验脚本”“验收脚本”的名称绕过。
- 不把“先补测试再迁移”设为前置条件。旧测试可作为历史需求线索阅读，不能要求恢复执行。
- 代码质量约束仍然成立：职责与依赖明确、公共规则只有一个owner、类型与合同完整、错误/取消/迟到结果/生命周期处理正确、资源有界且可退休、权限与兼容不削弱。
- 可使用现有类型检查、编译、Context/资源/发布保护，以及官方DevTools、手机与Profiler等工具做必要的真实运行观察；不要为观察再编写测试基础设施。没有验证到的结果明确留未验，不因禁写测试而假称通过。

## 三、项目实际背景

- 当前前端为Taro 4.2.1、React 18.3.1、TypeScript、Webpack 5；配置只允许weapp。使用TanStack Query、Zustand、TWGL及共享天文/坐标/合同包。
- 主要入口是Map和My，另有地点信息、搜索、天气/天文事件、计划、投稿/反馈、账户、来源等页面及分包。
- Map已经使用微信原生Map能力，地形/云量/光害图层有共享的请求、文件缓存、安装、替换、取消、故障恢复与资源退休逻辑。
- 云观星Sky不是普通UI：涉及完整BSC星表、实际加载SAO、天文时间与几何、相机拖动缩放、时间尺/六字段/播放、影像与纹理、名称/拾取/来源。已有独立Canvas/WebGL调度、唯一writer与accepted帧身份。
- 现有Sky相机路径有ref/直接绘制组织，时间播放仍涉及React状态；有WebGL输出到2D Canvas的呈现过程。请读实际函数体，不能从名字、组件行数或API存在推定成本，更不能在迁移中顺带关闭preserveDrawingBuffer、换引擎或改显示语义。
- 已有不少性能修复落在公共模块：请求合并、缓存作用域、reader退休、旧回调隔离、文件/native资源交接、时间/供给/accepted一致性等。也存在编译器或平台特例。应保留其原因与有效机制，不因去掉Taro就全部重写或删除。
- D1地形、D2云观星及F04本轮性能/故障工作已有收口记录，部分物理native/GPU字节仍未知。播放准备合并、延期纹理上传等有既有“不采用及有条件重开”裁决，不能拿迁移名义全部重开。
- 只迁移微信小程序；仓库的React Native/Expo App、App专属API和其他workspace历史保留。不要全仓删除React依赖或把App验收加入任务。
- 在线BFF为`workers/miniapp-api`。API与Outbox/BullMQ worker已分进程；部分在线地形/PNG/天文计算仍在Node中。云量/光害另有Python离线加工。后端性能改造不在这次迁移中实施。

## 四、两类工作已经分开

第一类是本次前端迁移，包括代码、工程链、Context与必要运行验证；独立任务的迁移PLAN尚未编制。

第二类是原先未做完的P1–P6计划，加本次评估中采纳的优化：全国云量/光害供给与发布、已有业务未完项、后端计算/缓存/数据库、资源预算、图片分发/CDN及成本等。该计划已封存，顺序是“完成原生迁移 → 根据新实现重写旧计划 → 再继续实现”。不要顺带推进全国数据、部署/CDN或后端优化，也不能遗失这些未完义务。

## 五、我最关心的迁移成本和验证数量

我不希望过去的每个性能场景再测一遍。请按公共责任和不同机制编排迁移，不按页面×地点×字段×时长×星数×设备排列任务。

请先区分：可直接复用的业务/算法/数据模块、只需替换框架绑定的模块、真正需改写的模块，以及需核验才能保留/退休的特例。给出明确依据和真实消费者，不能认为所有`.ts`天然与React无关。

未改变的科学/业务证据尽量复用。状态绑定或生命周期改变时，只安排有判别力的代表性真实观察；同机制普通变体不重复。所有受影响页面的基本可用、采用设计一致性仍须覆盖，但不等于每页都跑完整性能实验。不要默认再建三套Taro/混合/原生完整实现做选型A/B，也不要重录已有效的资料。

## 六、请优先阅读这些源码和owner

- [项目范围](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/project_context/global.md)、[架构](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/project_context/architecture.md)
- [前端依赖](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/package.json)、[构建配置](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/config/index.ts)、[页面与分包](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/app.config.ts)
- [Map页面](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/pages/map/index.tsx)、[Sky页面](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx)、[Canvas呈现](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/features/sky/sky-canvas-surface.ts)
- [状态入口](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/apps/wechat-miniapp/src/state/app-store.ts)、[运行时职责](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/project_context/architecture/runtime-and-domain.md)
- [小程序Screen Contract](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/project_context/areas/main/screen-contracts/wechat-miniapp.md)、[设计权威](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/DESIGN.md)、[开发流程](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/project_context/development-workflow.md)
- [旧计划](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/.codex/work-items/sky-map-performance-2026-10-18/PLAN.md)、[历史交接](https://github.com/Seven128/Starward/blob/f09da5e2762c6f80f387ded5a5de853b160e9924/.codex/work-items/sky-map-performance-2026-10-18/HANDOFF.md)。它们是迁移前基线，不是让你恢复旧任务的指令。

沿真实imports追共享组件、导航、查询/网络/存储、Map资源、Sky时间/帧/资源owner和构建/发布工具。GitHub网页截断时可读对应`raw.githubusercontent.com`文件；读不到正文就标缺口，不用目录名或符号表编造函数体、行号或调用链。

## 七、希望方案明确回答的内容

1. 推荐的原生架构和目录职责：页面/组件、业务控制器、共享状态、查询与缓存、平台适配、Map/Sky资源如何协作；比较合适的现成能力后作选择，不默认手写一套框架，也不强制引入新的UI/状态库。
2. React/Taro依赖迁移表：Hooks/Context/React Query/Zustand绑定、事件、导航与返回、组件生命周期、时间尺/动画、资源路径、App初始化分别如何替换。相机/时间/账号/Context仍只有一个权威owner，避免双份状态或每页复制恢复逻辑。
3. 公共性能优化保留表：现有责任、消费者、可复用/适配/改写、特例处理及最小观察依据。指出成本最高/最不确定的部分，说明为什么；估算要有工作量假设，不按旧测试场景数量或任意百分比估计。
4. 有依赖顺序的迁移阶段：先用什么最小真实路径验证架构，再如何批量迁移、收敛例外和完成切换；过渡兼容与回滚如何控制，如何避免长期双维护。
5. Context与工程同步矩阵：global/product-profile/architecture及节点、Screen Contract/DESIGN技术映射、development-workflow、verification、implementation-index、AGENTS/skills、package scripts、CI、DevTools/发布配置分别何时改、改什么、不改什么。分清未来目标与已实现事实，不能全局把Taro替换成“原生”。
6. 禁写测试代码情况下的质量保证：类型/编译、代码责任核对、既有工具和少量真实WEAPP/设备观察如何提供必要证据。列出按机制去重后的最小观察，不生成测试代码、测试基础设施或庞大场景矩阵。
7. 迁移完成标准与交回旧计划的条件：功能/采用设计、科学合同、状态与资源生命周期、包体/启动/交互及现有数据兼容分别怎么判断；哪些证据可以复用，哪些不能继承；如何明确保留旧P1–P6未完义务并进入后续重写。

请先给清晰的推荐路线与主要风险，再给模块表、阶段顺序、Context同步矩阵和精简验证安排。事实、推断、待确认条件分开；收益幅度不知道可以直说，但仍应给明确方案建议，不把所有选项都留给我决定。
