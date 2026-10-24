# Starward 本机 main 接续提示词（2026-10-24）

将下文发给本机的新对话。旧对话完整Goal仍paused、未完成；本轮交付只同步最新代码、方案和证据。新对话须读取真实Goal状态，不能把旧聊天状态或本提示词摘要代替完整Goal正文。具体交接提交SHA由最终回复给出；包含本文件的main最新提交是接续点，f9798只是生产代码基线。

---

请接手 D:/dev/Starward，恢复并继续实施完整 Goal。这是明确继续指令，不是只阅读、总结或再写一套计划。允许按责任开新agent，完成即结束，不复用旧agent；必要人类动作尽量后置。

1. **先 get_goal，再核当前 checkout。** 本机已按用户最新指令转回 **main**，跟踪origin/main，后续在main开发。codex/remote-main-20260908是另一台电脑专用分支，不要再切过去。先核HEAD、分支和dirty成果，必要时fetch origin main并安全快进；保留全部本地成果、Harness、冻结构建、私有原件和任务缓存，不reset/clean/force/stash，不另建worktree，不用远端覆盖本地。原f9798接力代码已包含在main交付中，不重做迁移或重复拉旧分支。
2. **完整恢复目标与唯一方案。** 从本目录INDEX.md进入，完整读取GOAL-OBJECTIVE.md、REQUIREMENTS.md、INHERITED-REQUIREMENTS.md、PLAN.md、最新HANDOFF.md、CURRENT-VALIDATION-20261023.md、REVIEW-RECONCILIATION-20261023.md、R20-REMOTE-RECONCILIATION-20261024.md及其三份独审、R20-NIGHT-REPORT-PERSISTENCE-20261024.md。无Goal时，用GOAL-OBJECTIVE.md中“Goal 正文”全部创建，不设token预算；已有同目标则续用并承接最新要求，不缩目标、不冒称状态自动跨聊天继承。保留全部R1–R20/H1–H8/A01–A15/N01–N09及未撤销义务。旧提示中的分支、当前、下一步和待办不能覆盖最新HANDOFF。
3. **读取现行规则与相关owner。** 读取适用AGENTS、project_context/global.md、manifest默认Context，以及相关架构、Source Plan和验证owner。开发/性能任务完整读取最新.codex/skills/starward-miniapp-development/SKILL.md及references/performance-investigation.md；UI工作读取DESIGN.md、.codex/skills/uiux_design/SKILL.md与.codex/work-items/map-ui-design-2026-10-22/HANDOFF.md。实际恢复DevTools/设备工作时再加载对应官方与项目skill，复用已有有效会话和证据。
4. **唯一第一实施责任：收口NightReport持久化与确认协议。** f9798的WIP已接真实报告快照/receipt和完整输入，但仅类型通过，不是完成。本机已通过真实Fastify/SQLite/mobile client复现：owner提交后丢回复，身份失效后同requestId得到ephemeral报告，客户端误清原pending。按PLAN保完整原输入/requestId与权威持久性资格，临时响应或缺失资格不能确认旧durable/unknown尝试；身份恢复后对账原尝试。保正常guest基础查询与已确认后取得新数据的刷新，不加“保存”按钮，caller字段不构成授权。完成实际效果/重启/并发/回滚、相关消费者、structured/OpenAPI、新独审和必要检查，不重复泛化旧失败矩阵。
5. **另外两项确认P2沿原owner修复。** 管理端已知cache FAILED后的重试若缺少postCommit完成状态，仍会误confirmed并清journal；只有原操作的明确COMPLETE或有效公共恢复证据可关闭该已知失败。原生Map同id地点refetch后marker更新，但选中摘要/observer/route/navigation还用旧事实；统一接纳合格当前事实，或显式标旧snapshot过时并阻止冒当前。保选择身份、路线意图、权限/来源资格和迟到结果保护。三项修复逻辑、顺序与验证条件已在同一PLAN，不另起方案。
6. **已完成实现直接复用。** 认证/命令主干、媒体023–026及队列/锁序、偏好v2/真实Web CAS、F07已解决主链、F09/F10、Sky具名帧/资源消费者、既有草稿/规则定义、消费者CI、EOG获取/镜像/接收和原完整读回均已有证据，不重新从零实施。真实环境、未完成业务family、Map故障重建/native退休、采用UI/H4/连续手势与正常Play/OOM等剩余结果仍保留。仅有条件的建议先满足PLAN验证条件，不照搬外部审查结论。
7. **先做不占用设备的工作。** 微信开发者工具、手机及原共享调试服务仍由另一对话占用，本对话先做代码和自有隔离验证；不要操作、重启、重新绑定IDE/手机/ADB/PG/API/桥/队列或刷新现用构建。相关验收后置，不撤销。旧IP/PID/端口只作历史定位，保VPN/TUN、配对、原账号/N05、gen26 UNKNOWN和已送达R6，不重种或重发。
8. **产品结果顺序与冻结边界继续有效。** 先完成已采用UI，再叠层完整显示/连续操作/内存，随后Sky六字段/正常Play内存。My唯一采用，保Stitch3995519477980461148及原完整依赖，复用公共来源按钮/跳转/模板，不重新选稿或生成未变区域。R28 gen34已冻结但未激活，禁止prepare/build/refresh，也不重建其他冻结代；R27同问追踪已停止，gen24 scene-memo继续暂停。OOM仍未解决，不减星、降精度或用任意节流替代真实优化。已有LAN/Heap通路资格和采集复用，不重做网络或逐项profiler矩阵。
9. **准备依赖与核对证据要相称。** 本机已按f9798的package-lock完成npm ci，并核验公共runtime和assets；只有实际缺失或新锁变化才补。按data-pipelines/runtime-data/current.lock.json及既有LFS/Drive/私有owner恢复必要输入；Git不代表数据库、Heap、冻结构建或私有资料已恢复，也不授权上传原件。当前三项缺陷未修、NightReport整合/独审未完成；旧05f CI成功不覆盖WIP，新main交付CI按实际head查，不假称全绿。通过的缺陷复现断言不是产品通过。
10. **沿同一方案持续实施到实际结果。** 进度、下一步和失败写短HANDOFF及证据；仅在责任、依赖或决定性事实改变时更新PLAN，不把它写成执行日志。保留已完成证据、全部未完成义务和失败。独立工作继续推进，必要人类动作准备好后给最小清单；完整必需项未完成，不得标Goal complete。
