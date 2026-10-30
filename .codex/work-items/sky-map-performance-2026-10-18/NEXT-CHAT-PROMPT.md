# 封存后的恢复说明：迁移完成后先重写计划

2026-10-31起，旧“立即恢复EOG/性能实施、不重新规划”提示退役。原文可从Git基线 `f09da5e2762c6f80f387ded5a5de853b160e9924` 读取；当前顺序以封存HANDOFF及独立迁移入口为准。下方提示不自动解封，也不自动创建聊天或Goal。

```text
请在 E:/Dev/Starward 的 main 核对《今晚去观星》微信小程序原生迁移与封存后续任务。

先读：
- E:/Dev/Starward/project_context/global.md
- E:/Dev/Starward/project_context/architecture.md 的 wechat-native-stack-decision
- E:/Dev/Starward/.codex/work-items/wechat-native-migration-2026-10-31/INDEX.md，以及该任务实际形成的唯一PLAN和状态/完成证据
- E:/Dev/Starward/.codex/work-items/sky-map-performance-2026-10-18/INDEX.md、HANDOFF.md、PLAN.md、REQUIREMENTS.md、INHERITED-REQUIREMENTS.md、GOAL-OBJECTIVE.md 和 FREEZE-20261031.json

先确认原生迁移是否真实完成。若未完成，旧任务保持封存，下一动作归独立迁移任务，不继续EOG、云量、后端优化或旧性能调查。不得仅因旧Goal为active、历史实施授权或读到旧提示词就恢复旧方案。

若迁移已完成，先将旧PLAN在原路径重写为适用于真实原生实现的唯一后续方案，再按用户当时的有效授权继续实施。逐项核P1–P6未完义务、本轮优化覆盖表、EOG中断增量、云量FAILED/UNKNOWN、正式分发和容量依赖；注明保留、已由迁移解决、需适配或条件未触发，不遗漏或凭推测关闭。旧Goal正文保存完整目标，冲突顺序已由最新封存要求覆盖。

原生迁移期间禁止新增或恢复测试代码；全仓旧测试已经退役。使用已有类型/构建工具、历史证据和必要真实运行观察，不能重建fixture或用验证脚本名称绕过。

保既有公共性能优化、D1/D2/F04收口、被取消的山体遮挡验收和原不采用机制的重开条件。按公共owner、输入合同、资源接口与生命周期挑不同机制的最小回归；不逐地点/字段/时长/星数重测，不重录有效资料或重建冻结代。未变科学/业务证据可复用，变更后的原生目标效果不能用旧Taro结果冒通过；页面基本可用/设计一致性与性能实验分别组织。

后端仍为Node/NestJS/Fastify＋Python及原数据基础设施。计算池、算法/编码器、缓存/ETag、数据库/连接池、依赖/内存、tmpfs/磁盘、OSS/CDN与完整成本按旧PLAN覆盖表重写，不把报告固定数字或未经采纳的库当实施要求。

保main、源码/WIP、草稿N05、已送达R6、r6/旧URL、冻结候选、私有输入/证据与App历史；不reset/clean/force/stash、不另建worktree、不改VPN/TUN、不重发提醒。服务/PID、手机连接、私有数据和远端部署先实核，不继承旧状态。仍须的采购、上传、部署和对外发送按各自授权，不能因解封扩大权限。
```
