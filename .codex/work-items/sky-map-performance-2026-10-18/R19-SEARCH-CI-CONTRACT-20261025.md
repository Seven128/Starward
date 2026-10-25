# Search 本页反馈：CI 夹具迁移

2026-10-25。仅修改两个相关测试文件；没有改产品、采用资源、构建、设备、共享服务、Git、App 或网络。

Root提供的33b9317b/40156515752失败日志表明，旧资源通知矩阵仍要求Search存在`search-resource-failed`浮层effect。DESIGN §5A.4要求Search局部状态复用本页反馈；本轮产品删除正确，不能为测试恢复重复通知。

- 保留其他页面的floating矩阵和原断言，Search独立按其本页责任验证。
- `resource-error-notification.test.ts`受控执行Search实际挂载effects，不再依赖旧dedupe名称；context/scene/place的成功STALE缓存回退、刷新失败与冷失败均不能追加资源浮层。
- `search-feedback.test.ts`从当前生产声明及JSX提取STALE准入、实际StatusPanel文案/恢复动作和原retry handler，一个参数化检查覆盖三资源、两种回退机制及有/无保留结果。移除本页反馈、给空文案、无效/全量重试、清查询或把旧数据改标新鲜均不能通过；fresh负控制不应制造过期通知。

检查：资源通知、Search反馈、Context恢复路由和资源重试四文件 **28/28 pass、0 skipped**；Mini Program typecheck **exit0**。没有重跑全2819项。额外临时反查遇到Windows ESM预载入口错误，未形成有效反查证据，不计入通过结果，按Root指令停止扩展。

这些检查仍是现有生产源码提取/VM适配的有界证据，不建立WEAPP画面或真实API验收；手机证据沿Root原owner复用。当前已取得下述Root安排的独审，剩余Git交付及新head CI。

Root已取得新的独立只读审阅：未发现本批must-fix，其他页面浮层正值、Search零额外通知与本页正值/实际恢复owner均保留，空反馈或无效重试不能通过。审阅者没有重复28项或类型检查。修复只涉及测试，不改变最终普通WEAPP字节；后续新head需要通过现有全量CI补齐前次失败后未执行的消费者兼容步骤，不作App产品验收或部署证明。
