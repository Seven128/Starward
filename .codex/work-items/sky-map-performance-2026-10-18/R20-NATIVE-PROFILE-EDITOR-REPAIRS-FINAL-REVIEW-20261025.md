# R20 Native 偏好编辑修复最终独审

2026-10-25，新审阅者独立核对。**当前冻结仍有一项已执行 P2，结论 FAILED，不能按本范围通过或更新手机。** 原四项反例的九条代表机制通过；新增的同一未知保存跨 Quick／完整视图确认失败。没有改产品、Context、Root任务状态、Git、设备、构建、服务、网络、Secret或真实用户数据库。

## 输入与责任核对

沿适用 AGENTS、global、Native Source `mobile-shell-and-preferences`、Screen core journeys、Native DESIGN、interaction Skill／Native mapping／wording及唯一 PLAN/HANDOFF 审查。完整阅读原语义／恢复独审与本轮四项修复报告，追踪真实 Screen → 共享 `useProfileEditor`／两个字段视图 → 原 `profile-save-attempt` → store／runtime → 生产 Expo SQLite adapter。复用原 v2/CAS/current-projection，未把新建完整预设的静态提示扩为本轮门槛。

冻结 `tmp/native-profile-editor-review-repairs-20261025/source-freeze.json` SHA256：

`9ae02daa71c78cf4bef5afbd52542c25c1bbff5a20915c03550b8a211bed5925`

28项长度／SHA在开始和结束逐件核对一致；本轮6改／22不变与作者声明相符，合并前轮基础后的交付写集为8项。Root的3d23独立交付和旧CI不作为此WIP的通过证据，新Activity module亦不在本轮消费效果声明中。

## 已执行 P2：同一未知保存跨完整视图被重新规范化成新候选

位置是 `MobileShellScreen.tsx` 为同一 Quick editor 按 `wizardEntry` 更换 resolver，`use-profile-editor.ts` 的提交回调按**本次解析后值**计算保存 identity；`profile-save-attempt.ts` 在 identity不同后替换原未知候选。按钮是否“确认上次保存”却按原始表单 identity判断，两者不一致。

独立反例完全通过真实组件和生产 SQL owner执行：

1. 通过原 store实际保存合法 A r5，name／city／startingPlace含首尾空白，新建独立 SQLite连接确认这些完整原值合法且已持久化。
2. Quick选行星并保存，注入唯一的提交后丢确认；SQL实际 A r6，UI保未知。恢复读取后明确切当前B。
3. 从同一Quick卡进入完整视图，不改任何字段；实际按钮为“确认上次保存”，点击。
4. 完整视图的 Zod resolver trim上述**未编辑**完整字段，产生不同 parsed identity。实际结果是“此预设已有新版本。草稿已保留，请核对后再次保存。”，完整视图仍打开，而非确认原保存。

本例 SQL写数5→5，持久字节精确不变，B仍当前，A r6保留原空白和行星；因此本次没有错误覆盖已提交数据。**确认能力仍失败**：同输入的原确认被当作新候选拒绝，源码随后按已知冲突清掉该新 attempt，不能把这个结果称为原未知保存已确认。报告不以“零新写”掩盖失败，也不把其误报为新的用户编辑或修复既有数据。

最小修复归原共享草稿／attempt owner：同一原始输入的未知确认必须重放原冻结 candidate／命令，不可因视图的 validator或规范化规则变化而换 identity。只有真实新编辑使用既有显式新intent；不要改CAS、去掉文本校验、修剪已存字段或复制第二套pending平台来迁就此例。

严格正确期望在 `tmp/review-profile-editor-repair-effects-20261025/lifecycle.test.tsx` 的 `replays the same uncertain Quick save...`；`cross-view-confirm.log`为**1 failed / 6 filtered-out，exit1**，失败断言要求确认后错误为空，未使用预期失败通过。全部SQL状态为合成资料。

## 有效通过范围与测试边界

`final-run.log`在增加上述新反例前独立执行**2文件9/9，exit0**：

- 原完整条件说明、合法一字名／多目标／非三档距离／0／null与全部高级字段，Wizard→Quick真实保存和UI/runtime冷重建读回通过。
- 原Quick未保存行星／0→完整只改夜间徒步，SQL A r5保三项；已知A冲突后再次保存实际 A r6保后来城市／停车，B r4完全未写。
- 同视图未知A确认保持完整字节、零新写、B当前且文案不承诺切回；实际保存期间后改和完整视图旧写完成后的重开输入保护通过。
- 新增一个有区分力的控制：完整视图异步真实Zod校验pending时关闭／重开，旧视图没有派发SQL；共享草稿的后续显式保存才一次写A r5并保B。

九条与新增失败是分别执行的集合，不和作者23项／8项相加为新整体验收。复用原独审probes的SQL／版本／owner断言；仅将错误旧动作定位改为“确认上次保存”、增加禁止切回承诺断言、将合成数据库／输出改到本轮目录。另加强所有生命周期 `current()`读回：新建独立 SQLite连接读取canonical projection，并与原facade逐值对照后再判定。完整字段三例原本就使用独立连接。

真实 Screen、RuntimeRoot、schema、保存／CAS和生产存储adapter不替换；仅RN primitives渲染为jsdom、Expo crypto替换Node原语、Native SQLite原语替换真实Node文件SQLite。异步校验控制仅延迟实际 Zod resolver返回，不改其值或业务。首次三例未运行因本审阅者生成的Windows路径字符串未转义，保存在 `first-path-error.log`／`semantics.first-path-error.tsx`；只修测试路径后通过，不是产品故障。旧独审失败、作者证据和原probes未覆盖，原probe完整字节另存本轮目录。

## 收尾与未验

`start-pins.json`／`end-pins.json`及`completion.json`在本轮tmp。所有React roots卸载、包括新读回连接的SQLite句柄关闭，测试进程终态退出，自有Node进程0，没有网络listener／待决外部动作。唯一写集为本报告及本轮tmp。

已通知Root这一P2，修复需新冻结和新独审；当前九条通过不关闭它。实际Android Expo SQLite／APK／保存及冷启、外观／键盘／Back／原生生命周期、首次许可／fresh GPS、iOS、完整family／生产／多版本及整个Goal保持未验。两类性能后置且OOM未解决，未改变用户顺序。
