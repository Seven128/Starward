# 交接时的云观星架构与代码自审

用户明确要求在换对话时审计架构、代码质量，并将相关修复／改进写入新对话计划。本轮只完成审计、现有唯一PLAN修订和交接；生产源码没有整改，菜单没有重新实现。该审查是有范围的自审，**独立审查仍MISSING**，不是完整仓库审计或最终验收。

审查范围是Sky跨面板命令／返回、共享原生返回层及调用关系、资料服务缓存、文本供给执行证据和受菜单变更影响的测试边界。实际读过相关源码、控制owner、交互技能和现有测试；页面及大型controller只读上述责任相关片段，未声称逐行审查整个仓库。23份源码／规则指纹和11个共享返回消费者清单见[审计绑定](../../../../output/cloud-sky-text-remainder-2026-10-11-r1/audit-findings.json)，未来实际修改前仍须核消费者的当前代码。

| 问题 | 结论与影响 | 新对话处理 |
| --- | --- | --- |
| AUD01／P1：菜单不受统一Back处理 | `spot-sky-page.tsx`的goBack及NativeBackBoundary激活条件覆盖日期、天体资料／候选，却遗漏星体列表、时间和校准。提取实际生产handler的有界验证中，这3种状态均调用离开页面，另外6个对照成立。它证明当前命令缺口，不证明手机原生路由表现。 | E模块统一菜单进入／关闭／返回意图，复用时间取消及校准事务owner；显式Back和系统Back使用同一语义，再直接重设计菜单。 |
| AUD02／P1：共享返回协议与控制规则冲突 | 现辅助PageContainer先以show=false挂载，32ms后开启；消耗leave时仅disarm。implementation-index及交互技能要求当前已验证平台上的辅助modal边界从活动show=true新挂载，并在消耗后卸载／必要时重入。当前代码违背该控制规则；本轮没有真机重现，不能宣称新原生失败已取证。 | 修一次共享owner，保双leave只消耗一次、仍打开时重入、hide／卸载取消迟到；Map携带原生前景内容的分支须单独确认，不能盲用辅助边界规则。迁移／检查受影响真实消费者。 |
| AUD03／P2：资料缓存未统一有界，无关参数可放大键空间 | 实际controller参数parser与生产information service完成257次水星请求；合法格式的深空publicationHash对水星资料无作用，却各形成缓存键。257份返回data精确相同，实际map保留257项，超过其他家族已经使用的256项规则。Sun／Moon／planet插入没有淘汰。调用链从公开controller到服务可读；本轮未启动HTTP服务、未测物理内存或OOM。 | B及A信任边界使用现256项政策的共同写入／淘汰责任；按家族校验并限定选择参数和缓存键，保深空精确旧版合同与已有客户端兼容。 |
| AUD04／P2：菜单测试过度依赖生产结构 | time-disclosure测试按旧类名／私有声明抽取回调，date-ruler测试手写hook执行环境。它们的跨午夜、取消和迟到断言有价值，但视觉改版可能造成fixture失败而非产品失败。这是维护性改进，不是已证明行为错误。 | 在本次菜单改版内把受影响用例迁到稳定命令／真实组件行为及已有完整Taro／React／Query入口。保负向回归与消费者差异，不为旧fixture恢复生产变量名或弱化断言，不扩大成无关测试重建。 |
| AUD05／P2：实体collector缺少自身执行输入绑定 | entity collector的sourcePins保声明、资料与HTTP正文，未纳入自身代码和导入protocol／qualified-HR producer，也未自存执行副本；article collector已有这套before／after和create-only副本。首次历史实体执行副本MISSING继续保留，当前来源身份／正文检查并未因此自动失败。 | C文本供给／F证据沿现文章collector复用该规则，补执行副本、依赖前后绑定及异常运输元数据的有界收尾。只有新服务恢复输入才继续外网获取，不因修collector重跑239实体或重开图像。 |

实现顺序和完成条件只归[唯一PLAN](../PLAN.md#本次审计修复与菜单改版)，当前进度只归[CONTINUE](../CONTINUE-CLOUD-SKY.md)。以上全部为**待实施／待验**；本轮不把计划写入等同修复，不把软件handler结论等同原生用户旅程。

修前证据分别见[Back读回](../../../../output/cloud-sky-text-remainder-2026-10-11-r1/audit-back-before-fix.json)和[真实缓存读回](../../../../output/cloud-sky-text-remainder-2026-10-11-r1/audit-cache-before-fix.json)，执行源码同目录保留。首audit harness相对路径错误导致两项bootstrap失败，实际产品未被调用；失败副本／原因保存在[audit-harness-failure-r1](../../../../output/cloud-sky-text-remainder-2026-10-11-r1/audit-harness-failure-r1.json)，仅修审计脚本路径后得到上述结果。另一个handoff reader首清单计数错误也保留，不混为产品失败。

继续复用而不重造的边界：context-session的可见性／当前请求守卫、来源metadata的当前选择／mounted恢复、观察时间／姿态／相机／跟踪owner、家族完成回执与实际已绘帧的差异、v74共同出版及全部旧行／旧版文件的保留。这次没有证据要求更换引擎、renderer、数据库、缓存体系或重选图像处理工具；页面行数本身不构成拆分依据。

固定在制图像已收尾并冻结，图像0获取／0加工／0新采用，额外外网请求0。原生控件／Canvas合成的FAILED／UNKNOWN_PRODUCT_VS_DEVTOOLS、软件2D桥UNADOPTED、Android／iOS、真实云端、物理资源及独审的未验保持；本次自审不填补这些缺口。33项原始义务行保持原字节，新增UI和上述修复作为现模块责任，不另建任务目录或第二份计划。
