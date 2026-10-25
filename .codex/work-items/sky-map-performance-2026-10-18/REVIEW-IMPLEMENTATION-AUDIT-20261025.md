# 全仓审查实施核对与小程序范围收口

2026-10-25。用户已明确当前及未来一段时间只做微信小程序，App既有/未提交/中断成果保留不继续，已做事项不再留作计划待办，两类性能后置。本文保存审查映射和完成历史，不是第二份计划；只有[PLAN](PLAN.md)定义剩余实施责任。

## 审查来源与证据边界

原文为[《全仓代码审查》](https://chatgpt.com/c/6adb1c9b-2c58-83ea-b77e-eafe37de6e05)，固定基线4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0，八章、F01–F15。此次通过read_thread取回17,576字符完整回复，hasMore=false、无截断；原HTML附件及其中全部复现脚本没有单独取得。原报告自己的测试数字不计作本项目新验收。

原审计覆盖apps/mobile、apps/api、小程序、管理端及worker。F05–F08和F14本来就指App/独立API；后来的R20文档把它们纳入了跨工程任务。这说明它们有审计来源，不代表当前仍可继续开发App。新范围覆盖旧Goal/提示词中的App方向，保历史事实和成果，不回滚或删除。

原[采纳核验表](REVIEW-RECONCILIATION-20261023.md)仍保留其当时证据。此次另由新独立审阅者逐项核覆盖、相关当前源码与已完成记录，报告在 `tmp/miniapp-handoff-20261025/coverage-audit.md`；未重跑产品测试、设备或外部环境，未重新逐文件全仓审计。

## F01–F15：已做与实际剩余

“已实现/验证”只表示所列责任及证据范围，不等于生产/真机/完整产品完成。完成实现从活跃PLAN移出；只把右列剩余结果交给新Goal。

| 项 | 已有结果/归属 | 新计划去向 |
| --- | --- | --- |
| F01 管理身份/operation | [服务器principal/角色绑定、HTTP/PG与独审](R20-ADMIN-AUTH-VALIDATION-20261023.md)已有实现 | 原修复移历史；P4保实际配置/客户端配套/部署与输入结构判别 |
| F02 头像提交后误删 | [写入意图、未知提交保护与持久清理](R20-MEDIA-LIFECYCLE-20261023.md)已实施 | 原补偿不重做；P4保迁移、真实存储失败/恢复效果 |
| F03 outbox恢复 | [缺失句柄/unknown/dispatch代次与Redis恢复](R20-OUTBOX-RECOVERY-20261023.md)已有实际隔离证据 | 原实现移历史；P4保真实环境/长期恢复资格 |
| F04 微信Map重载死结 | [故障session源码/独审](R20-MAP-FAULT-SESSION-REVIEW-20261024.md)已成立 | P2保目标失败→替换→恢复、迟到隔离和实际native退休；未验不改成通过 |
| F05 App假定位 | App专属；已有源码和本机准备，真实定位/许可恢复仍有缺口 | 保留成果，退出当前Goal；小程序H5的wx定位是不同责任 |
| F06 App冷启动/hydration | App专属；已有根恢复/状态修复及部分设备证据 | 保留，不继续；不替代微信登录/页面/草稿恢复 |
| F07 App Context消费者 | App专属；已有日期/位置/时刻与同id事实更新修复 | 保留，不继续；小程序Context按自己的owner处理 |
| F08 App偏好存储 | App专属；v2/CAS及近期共享编辑/跨视图确认有成果，另有中断增量 | 全部原样保留；不继续预设创建、编辑或App验收，不把中断代码标完成 |
| F09 Sky调时查询累积 | [fields/ruler与Sources共同策略](R20-SKY-TIME-QUERY-POLICY-20261023.md)和[接力独审](R20-REMOTE-SKY-REVIEW-20261024.md)已有实现 | 原策略不重做；P3保目标正确性，延迟/播放内存后置D2 |
| F10 云量交付屏障 | [独立云响应/取消及两时间轴恢复](R20-INDEPENDENT-CLOUD-DELIVERY-20261023.md)已实现独审 | 原接口/缓存不再开发；P2保真实H4、所选小时/覆盖/来源和恢复 |
| F11 管理会话/重试 | [刷新/重开journal](R20-ADMIN-RESTART-RECOVERY-20261024.md)、[地点命令](R20-ADMIN-LEGACY-IDEMPOTENCY-20261024.md)、[缓存明确确认](R20-ADMIN-CACHE-CONFIRMATION-REVIEW-20261024.md)已落实 | 原开发移历史；P4保真实部署、凭据/存储恢复、旧无key结果对账 |
| F12 全局媒体清理耦合 | 有界后台维护、失败轮转与部分成功保留已有实现 | 原重构移历史；P4保目标存储/部署及必要恢复 |
| F13 删除/审核锁序 | [完整写者锁序及MEDIA/注销等待环](R20-QUEUE-LOCK-INDEPENDENT-REVIEW-20261023.md)、[续批丢回复修复](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)已有真实隔离结果 | 原锁序不重改；P4保迁移与受影响实际环境，不建全并发矩阵 |
| F14 独立API业务持久化 | 指apps/api；夜报、行程、规则/私人Inbox等已有实现和部分未完成扩展 | App专属历史，退出当前Goal；小程序原计划/提醒不能借此移到App |
| F15 消费者CI/检查漂移 | 现有product-ci、affected-checks及实际消费者已补；AppID/旧fixture/依赖失败已有修复 | 原补CI工作移历史；P6只核当前小程序/共享变更与实际CI/部署。保兼容检查，不自动承担App新开发 |

## 三组重构与未成为待办的建议

| 原审计建议 | 当前处理 |
| --- | --- |
| Map实例/故障/资源职责 | 源码基础复用，P2保尚缺目标效果；不能timeout清pin或把remount冒物理释放 |
| 媒体提交/持久清理/队列对账 | 已实现部分不再列开发；P4保迁移023–026、真实对象存储/恢复与版本配套 |
| Sky具名frame/资源消费者 | 44位置参数收敛、accepted/资源接线已实现；P3保目标正确性，D2保性能/OOM |
| 保留已有有效架构 | latest-demand、共享租约、pin/generation、唯一writer、accepted、账户ACTIVE锁和提醒UNKNOWN作为约束，不重造通用框架 |
| 管理DTO | 旧计划未明确列出完整body形状/错误语义准入；新增P4的最小判别，详下 |
| 纯contracts的Node存储 | 当前遗留位于packages/contracts/src/runtime/durable-business-runtime.ts，所查调用者为apps/api与domain/offline；未发现小程序/worker/其契约及天文/坐标消费者进入该路径。保App历史债，不新增全仓迁移；未来只有真实小程序依赖证据才扩大 |
| Taroify/图标 | 保当前未采用和现有Taro/Starward组件。仅有icons依赖不证明不能使用SemanticIcon；外部自定义图标线索也不证明本机适配。已澄清architecture口径，只有实际能力缺口才作目标/包体/键盘/取消/手势/许可比较 |
| Stellarium引擎/WASM/GPU | 属条件候选，保平台可行性、AGPL等许可/维护/等价性要求；不作为当前安装或替换任务，不承诺解决未定位OOM |
| COG/windowed IO/分块/预取 | 原源数据/供给/原生显示分别归原owner；只在后置性能的实测瓶颈支持时进入，不重建已做固定产品或误当微信native能力 |
| buffers/拾取/回调/Query/来源缓存 | 原R20条件保留在D：有实际成本或寿命缺口才选；原报告固定次数/容量/时长不采用为门槛，不能凭共同存活/finalizer或PSS判断根因 |

## 本轮补充的实际遗漏与口径修正

1. **管理输入结构是待判别线索，尚非已证漏洞。** 原报告第7章R6包含admin DTO。当前四管理controller有requireText/revision等字段检查，但直接解引用TypeScript标注的Body，所查main没有global ValidationPipe；null/非对象可能落入兜底500/PROVIDER_UNAVAILABLE/retryable。P4要求一条真实Nest/Fastify入口判别、一个合法控制与零业务写读回；已有拦截有效即结束，成立才窄修，不新增全仓DTO平台。
2. **清除重复开发措辞。** 管理缓存确认、Map静态adapter、EOG原件/Drive/receiver和主包预算已有后续证据，原PLAN中remaining/prepare/get之类开发待办已撤下，只保真实环境/目标验收。
3. **成熟方案口径一致。** 当前不采用Taroify不变，撤销“单凭必带icons即可定论”的一般化理由；后续选择仍须当前具体能力与真实目标证据。不把Node contracts建议套到无调用关系的小程序。
4. **入口去除范围混杂与旧顺序。** 新Goal/PLAN/要求/交接/提示词都只指小程序；不再默认读取App Source Plan或继续Native/App独立API事项，两个性能专题仍后置。

5. **保留原报告6.2的Play接受语义。** 独审指出精简后的“最新意图”可能被误读为必须匹配当前tick，已在PLAN/Goal/要求明确：同run/Context/generation内稍早而真实完成的accepted帧可显示，标签使用其实际时刻；最终停留结果仍取最新有效时刻，旧任务/错误来源不准入。这是文档歧义修正，没有新增或修改播放实现。

## 其他已完成工作：仅历史，不是下一步

- 已有合并/main接续、符合条件的祖先分支清理与设计资源迁移，不重复执行；本轮不改Stitch采用稿。
- 原R5的加载云幕只是在实际等待无法改善时才考虑的降级过渡，现有证据没有要求必须加入。保留该条件，不重新列作动画开发；只有后置性能的实际结果改变条件才重评，也不能用云幕/加载动画宣称等待或详细覆盖已解决。
- [EOG记录](EOG-SOURCE-RECOVERY.json)：锁定TIFF/传输、owner-only Drive远端读回和fresh receiver已完成；记录2 TIFF/17,420,036,496B及e6a68d22交付。不是新的下载/备份脚本任务。
- [Map静态adapter](MAP-STATIC-ADAPTER.md)：sealed inventory、旧URL、不可覆盖上传和HTTP读回owner已有实现；剩余是实际目标、权益、传输/启用与效果资格。
- [普通主包收口](R20-PACKAGE-BUDGET-CLOSURE-20261024.md)：main2,025,876B、普通官方推送成功；未来相关改动只做必要预算回归，不继续盲目瘦身。
- [host-cache观察](R20-HOST-CACHE-TARGET-OBSERVATION-20261025.md)已完成一次真实有限读取；它没有建立可删除集合或恢复容量，不能当新观察/清理待办反复执行。
- 既有N01–N06和上述小程序源码修复按原证据复用。App的既有提交、近期17项保全源码、APK/SDK/缓存及中断代码原样保留；其未完/失败不继承为当前Goal。

当前只留小程序UI/约4km/正常返回与真实业务、图层/云与时刻正确性、故障资源资格、山体/照片、wx权限/选点、分享/文件、部署/环境等剩余结果。性能两项后置不算完成。当前状态以HANDOFF为准，文档整理与原测试数量不代表产品验收。
