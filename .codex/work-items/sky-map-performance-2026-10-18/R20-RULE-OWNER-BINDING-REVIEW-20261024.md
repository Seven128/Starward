# R20 规则原 owner 绑定独立审阅

审阅者 `review_rule_owner_binding`。**本次限定同版 client/API 的规则尝试绑定责任，未发现未关闭 P1/P2。** 本结论绑定修后12份冻结源；不关闭生产身份、多版本部署、Native设备或完整通知 family/Goal。

## 依据与源码责任

读取[原实际判别](R20-RULE-OWNER-RETRY-DISCRIMINATION-20261024.md)、[修复证据](R20-RULE-OWNER-BINDING-20261024.md)、原配置/receipt协议、PLAN attempt-authority 条款、相关 Native Context、UIUX Skill/Native映射与 DESIGN App profile。默认入口只接受loopback并固定 `local-owner`；A/B变化由可信resolver端口控制，不把它描述为caller头改号或已具备生产认证。

- 原完整 input、key 与点击时 owner 限制在第一个异步存储读取前捕获。共享 `pending-api-command` 只增加可选 `prepare`；已有 pending 先阻止新尝试，完成真实 owner qualification 后先存本地，再dispatch。retry不调用prepare、不把较晚B资格加到A尝试上；原默认调用者仍走原生命周期。
- 新规则记录保原storage key，以本地 `ownerQualification` schema版本记录原owner。实际资格来自同域controls读取，字段不进入server command wire；重试的原完整JSON/key保持。无原资格legacy原字节不改、不HTTP重发、不以当前同key/full-input receipt反推历史。
- `owner-restriction.ts` 由规则/Inbox实际路由共享。它先取得服务端实际actor，caller期望owner只能收窄；规则POST和current/history/list均在效果/读取前核对。响应拒绝本次不等于证明旧尝试未提交，client的rejection规则不会据此清原pending。
- 原owner下回执附带的规则和actual current读回都须保持原归属；旧历史receipt不冒新版本。A原拒绝保它的expectedOwner，不撤已确认B观察。Rules的当前投影/发布继续受现owner/revision保护，存储恢复资料与当前界面资格分别处理。
- 没有修改历史规则/receipt的含义，没有新增认证框架、第二状态机、路由或保存流程。新头可选，旧无头wire仍按当次server actor执行，不能宣称旧client自动获得新保证。

## 本审阅者实际验证

12份清单 `tmp/rule-owner-binding-20261024/source-freeze.json` 首尾全部匹配；独立记录为 `tmp/rule-owner-binding-independent-review-20261024/{freeze-start,freeze-end}.json`。原始判别probe/config原样复制到本审阅目录后才执行，原失败目录未覆盖；probe SHA仍为 `50e10edbb4fe77b1403137dd37f777a93a5dfa69257ad18d0cb886d37e96d505`。

| 检查 | 实际结果与范围 |
| --- | --- |
| 原A丢回复→明确B→原retry的独立正确断言 | **1/1，0skip**。A原1条/B原0条；修后A仍1且原记录未变，B仍0；pending slot仍1且完整原记录相同，两次POST逐字相同；实际拒绝为 `notification_rule_owner_mismatch`。原判别的0/1失败继续保留。 |
| 新owner-binding与旧真实HTTP持久两文件 | **2文件11/11，0skip**。真实A恢复/原key/body重放、确认后新key、legacy A/B均有同key receipt也不推原归属、存储等待中的owner变化/无effect、私有空读限制、caller头不授权和旧无头wire等实际结果。 |
| App规则/Inbox与旧Itinerary/Field helper调用者 | **5文件32/32，0skip**。实际命令/React consumer、原输入/Context/unknown retry、资格/临时失败/迟到结果与旧helper默认行为。命令曾同时列出不存在的 `night-report-client.test.ts`，实际只有5文件，未把该路径冒作NightReport独立执行。 |
| 源冻结与限定diff | 12份首尾hash匹配，diff-check通过。 |

本审阅原件统一在 `tmp/rule-owner-binding-independent-review-20261024/`：`original-probe-after.log`/`observed.json`、`api-affected.log`、`mobile-affected.log`、原probe/config及source/关闭回执。原probe调用真实client、Fastify随机loopback、SQLite与pending owner，受控的是可信actor和已COMMIT回复的传输丢失，不复制业务算法或以空数据推成功。

Root另对相同新冻结输入完成API类型+35文件158/158、mobile fast类型+39文件157/157；这是Root整合结果，本审阅复用其旧NightReport/全部调用者范围，不重复或冒称本审阅新跑全套。两者不与上述局部批次相加成新总数。

## 兼容和未验条件

本次只准同版新client/new server配对。资格JSON版本不是服务端已经执行规则owner头的证明；“已有controls、规则路由仍忽略头”的混合/分步服务未经准入。变动可信authority前须同版或满足明确最低API约束，不据本次测试声明混合版本安全。定点读取Git `ebb67826` 的API路由组合未见新controls入口；这只支持源码先后，不证明实网当时部署版本。Root确认本批controls与restriction将同一源码提交交付，没有把未发布中间实现当已部署旧版。

旧无头客户端、多版本共同写入/降级、历史无原资格记录的可证明恢复、实际生产身份/供应、Native触摸/键盘/Back/前后台与真实AsyncStorage、OS/外部通知、合法深链和完整family仍按原owner保留。失败关闭旧无资格重发是保留未知，不是声称找回历史归属或完成产品验收。

本次未修改生产、正式tests、Context、PLAN/HANDOFF/INDEX、依赖或Git；没有build、IDE/手机、共享API8806/PG、网络/VPN、冻结代/Harness或原件上传操作。所有自建测试HTTP/runtime/SQLite句柄已关闭；仅本审阅task中的合成SQLite和原件保留，无所建活动监听。必要证据已充分，不继续扩actor/对象/时序矩阵。
