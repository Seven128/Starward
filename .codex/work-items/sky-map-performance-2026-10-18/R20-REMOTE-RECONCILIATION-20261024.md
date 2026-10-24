# 远端接力复核与方案收敛（2026-10-24）

用户要求安全拉取另一电脑的成果，核查问题并更新现有PLAN；随后明确已完成实现不再列为后续重复任务。本轮范围是审查、有限复现和方案/交接更新，**没有修改生产代码，没有继续实施WIP，没有提交或推送本轮文档**。既有Goal实际paused，未标complete。

后续Git交付补充：用户随后明确要求本机改回main开发并推送远端main，本记录与同一PLAN的修订纳入该次交付。上段“未提交或推送”仅描述审查结束当时；最新分支、交付和继续入口以[HANDOFF](HANDOFF.md)及[NEXT-CHAT-PROMPT](NEXT-CHAT-PROMPT.md)为准，不改变三项缺陷未修的事实。

## 源码与本机条件

- D:/dev/Starward 原HEAD266df53ea48a65013b9a358cfc2ffeb28c274fcf；tracked工作区/暂存区及生产目录未跟踪源码为空。先fetch指定分支，确认f9798在FETCH_HEAD且0 ahead/11 behind，再ff-only到 **f9798d794d09332be6eac6ef8651ce50865e2d0b**。共11提交、279文件；本机大量任务缓存/私有原件保留，未reset/clean/force/stash或新建worktree。
- 先前完整Goal、REQUIREMENTS、INHERITED、PLAN、global/AGENTS、开发skill/performance方法相对266df53e未变，沿已完整读取内容复用；新接力入口、NightReport WIP、HANDOFF、最新验证及受影响owner重新读取。新机摘要不取代当前源码和外层用户范围。
- 五处安装依赖落后新lock，已执行`npm ci --ignore-scripts --no-audit --no-fund`，exit0；manifest/lock没有改动。安装期间代理只源审，之后才运行测试。没有把旧依赖失败算成产品问题。
- `backend:data:prepare`实际1544文件/234,624,578B、LOCKED_PUBLIC_FILES_VERIFIED、networkRequested=false；`assets:verify -- all`实际3044文件/409,897,988B、MATERIALIZED。后者只证明材料化，不替代出版资格。首次误传多个profile仅得到Usage，改用既有all入口后通过；未因此改变数据或断言。
- 没有操作设备、IDE、ADB、共享PG/API/桥/队列、VPN、当前/冻结构建。只用任务自有合成SQLite/HTTP或React边界；测试结束关闭连接。私有资料和原始Heap没有上传。

## 三项已确认的剩余问题

| 优先级 / 责任 | 触发与实际结果 | 修复归属及必要结果 |
| --- | --- | --- |
| P2 / NightReport未知提交 | 实际Fastify→真实SQLite提交完成后，fetcher在回复客户端时抛错；原pending仍在。可信owner随后缺失，同requestId重试返回另一份ephemeral报告，client删除原pending；owner恢复时又发新requestId。原已持久报告还存在但原尝试未被确认。 | 原NightReport pending/client/HTTP确认协议绑定输入、requestId及权限/持久性资格；临时响应不能确认旧durable或unknown尝试。保正常guest查询与真正确认后的新刷新。 |
| P2 / 管理缓存恢复 | journal记过cache FAILED；重开/认证后原key重试收到匹配receipt与管理读回，但postCommit缺失，页面仍confirmed并删除恢复行。 | 原page/session/journal读取累计cacheFailureObserved；已知失败只能由同操作的明确COMPLETE或既有公共恢复证据关闭。未知保原输入/key/回执，保无该失败历史的旧协议兼容。 |
| P2 / 原生Map同id事实刷新 | 选择B后列表refetch收到同id新名称、坐标与closed状态；marker显示新名称，摘要/observer/route/native导航仍使用旧对象。 | 现有选点/DecisionContext owner统一接纳合格新事实或显式标旧snapshot过时；保id/角色/路线意图、当前generation和权限资格，更新受影响消费者或拒绝冒当前。缺页/迟到不能改选首项。 |

第一项是交接中已提出的风险，本轮补到实际反例；另外两项来自新独立复核。三项都仍未修复，修复逻辑已放入同一[PLAN](PLAN.md)的原责任，未另起实施方案。NightReport仍是第一实施责任，其余两个独立残余可按依赖并行。

## 验证与独审范围

- NightReport：`scripts/r20-remote-night-report-review-20261024.test.ts`，真实报告聚合器使用非空合成天气/天文/地点/路线，经真实Fastify handler和SQLite receipt；仅网络回复丢失、owner切换与AsyncStorage端口受控。1/1是**缺陷复现断言**，不是产品通过；日志`tmp/remote-night-report-review-20261024.log`。GET在owner缺失时真实403，后续临时响应使pending从1变0，新key从1变2；原报告仍可由原owner读回。没有运行手机、完整Tonight页面或完整WIP并发/回滚矩阵。
- [管理/API独审](R20-REMOTE-API-ADMIN-REVIEW-20261024.md)：缓存反例正确结果断言0/1失败，明确COMPLETE正向控制1/1通过；原管理15/15、独立API三持久化文件25/25通过。没有重新启动PG，也不以管理读回证明真实Redis恢复。
- [原生独审](R20-REMOTE-NATIVE-REVIEW-20261024.md)：Map实际组件反例1/1是缺陷复现；偏好domain20/20、native相关27/27通过。Web旧writer共存属于已声明部署条件，不凭当前版本CAS冒跨版本兼容，也不在无新条件时重开已完成Web事务实现。
- [Sky/云量独审](R20-REMOTE-SKY-REVIEW-20261024.md)：聚焦59/59、真实Nest/HTTP云量3/3通过；本范围未发现新增P1/P2。原数值等价证据按仍匹配的源码复用，未重复整个Sky/全仓或采集。
- gh实际读回05f82bc8的Context40050057437/Product40050054529均success；本轮查询f9798精确head未返回CI运行。前者不覆盖NightReport WIP；没有触发CI或把无运行写成成功。

这次按责任核查11提交，不是对279文件每行或全部环境的无缺陷保证。新发现以实际调用/效果为证；未执行设备、部署、原生释放、完整family和性能验收仍未完成。

## 对原方案的处理

从待实施叙述移出已完成的认证/命令主干、媒体退休/对账/锁序、偏好v2/CAS、F07已解决主链、F09/F10、Sky具名帧/资源接线、已有草稿/规则定义和消费者CI；保留少量owner/证据引用及仍约束后续修复的不变量。EOG获取/镜像/接收实现与原完整读回已有证据，也不再安排重做流水线；每台电脑实际缺料按锁按需接收。

剩余待办明确为三项确认边界、NightReport行为/并发/重启/structured/OpenAPI/独审及相应head检查、未完成API实体/外部效果、环境迁移、Map session故障重建、采用UI/H4/连续操作/正常Play-OOM等目标结果。任何“已完成实现”都没有升级为“目标设备或整个Goal已完成”。进度、失败和统计归本记录/验证owner，不放回PLAN。

## 文档收口

新建独立文档审阅者`review_plan_continuity`已核PLAN差异、总证据与完整范围：未发现遗漏必需义务、重复实施待办、竞争下一步或误写目标完成；三项P2修复逻辑与反例一致。该审阅不替代未来代码修复独审。Context结构校验、任务文档本地链接及定向diff检查通过；GOAL-OBJECTIVE/REQUIREMENTS/INHERITED与生产源码均未改。全部代理和测试已结束，原资料/失败仍保留。
