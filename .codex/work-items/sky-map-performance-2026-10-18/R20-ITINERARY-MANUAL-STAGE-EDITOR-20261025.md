# 行程手工阶段编辑实施（2026-10-25）

本批已完成实际表单到原命令／SQLite owner 的手工阶段子路径，等待 Root 新独审。当前基线为 main `b4d2654540e203ffa247e31b1cc21db70aeab4e9`，没有提交 Git。层叠与 Sky Play 性能继续后置，OOM 未解决；本批不关闭 Native 运行时或完整 itinerary family。

## 责任与采用边界

已读适用 AGENTS、NEXT／INDEX 当前入口、完整 REQUIREMENTS／INHERITED／唯一 PLAN、最新 HANDOFF 和非性能准备报告；读取 default Context、架构、Native Screen Contract、Source 行程 outcome 全部正文／CTRL timeline／版本、失败、迁移和跨工作包义务，以及完整 Native interaction skill、mapping／wording 和 DESIGN Native profile。

当前 Native Screen Contract／DESIGN 明确旧 mobile-pages-v2／controls-v3 只保稳定语义，**不是当前页面／控制视觉约束**。本批沿当前 Native DESIGN／生成 tokens 与现有表单、单一 ScrollView、按压和阅读结构实施，没有重新采用／生成资源，也没有借 WEAPP Stitch 的样式。未取得实际 Native 画面、键盘／安全区或手感，不声明视觉符合或目标验收；该缺口交 Root 的原生验证责任。

原 Screen 的编辑基线／保存只有 title／inputs。本批仅写 `apps/mobile/src/features/itinerary/` 四个文件：现有 Screen、新的受控 `ManualStageEditor`、窄的 `manual-stage-edit` 输入适配／呈现和一个真实消费者测试文件。API、合同、domain、client／pending／owner 限制均未改。

## 实际行为

- 原表单持有唯一草稿，包括手工阶段输入；子组件只持展开状态。已支持的出发／勘察／观测／返回可添加、改类型和时刻、移除，并用原 `validateTimeline().ordered` 明确按时排序。排序不改实际时刻；移除在最终保存前可由取消编辑恢复。添加时复用该草稿最晚已核对结束时刻和当地日期，首次无阶段时只预填观星日期，不编造时间／路线／天文建议。
- 原 create 合同只接受基本输入，故先明确保存草稿，再明确编辑添加阶段；没有自动第二次写入。后续一次保存把所需 stages 与同一 title／inputs 放入原 patch、冻结 baseRevision、原 owner／key／receipt 事务，生成一个新 revision。原历史查看／引用恢复直接复用。
- 普通时间预填所属 IANA 的当地日期、完整时分秒／毫秒，用户也可直接填时分。适配器复用 `normalizeUtcMoment`；用该日期相邻实际时区偏移及原时刻产生候选，逐项做完整当地 roundtrip，不使用设备本机时区解析，也不把夏令时缺失小时向后调整。普通唯一时刻自动确定；重复小时才显示带实际 UTC 时差的两次选择。未核对的输入保持本地并阻止提交，原秒／毫秒和重复小时身份不会因标题等基本编辑丢失。
- 只有实际阶段编辑或明确日期核对才携 stages。改观星日期且已有阶段时必须明确“保留这些时刻”；继续改日期／阶段会撤销该核对。不会以无条件发送 unchanged stages 绕过原 `stages_require_review`。原阶段的类型／字段超出当前手工合同则保持只读，基本信息修改不带 stages，也不剥除旧内容。
- 非法区间、重叠、无法核对的当地时刻留在原草稿，不发命令；服务端仍保原权威校验。CAS 冲突保本地时刻，只有用户明确选择已存版本才重读并重新编辑。丢回执的原 body／key／qualification 不因本地取消、页面／client／API 重建或后来更高 current 而改写；所有权撤回继续由原 Screen／observation 边界隐藏私人投影。
- 实际时间线阅读与历史阶段差异复用同一精确呈现，显示完整起止瞬间。手工阶段持续声明不是计算所得天文事实，不新增蓝调／无月／目标窗口、地点、来源或路线事实。

## 实际检查与证据

证据在 `tmp/itinerary-manual-stage-editor-20261025/`，不对外上传：

- `baseline-counterexample.log`：b4 原 Screen 同一实际入口 **1 失败／6 跳过**，没有阶段编辑器。基线原字节与 13 项 manifest 在 `baseline-source-inputs/`／`baseline-source-freeze.json`。
- `final-consumers-with-entry-and-legacy.log`：**4 文件 26/26 通过**，其中新 **9 条**为实际 Screen → 原 client → Fastify inject／parser／service → 自有 SQLite。Native 原语／storage／crypto 仅沿原测试边界替换，不能冒 Native 存储或布局通过。
- 新旅程分别验证：首次 create 后明确添加；实际增删／类型／精确时刻与真实排序／保存新 revision；非法区间与取消零 POST；改日期明确核对；DST 重复小时原身份与明确第二次；春季不存在时刻拒绝与普通纠正自动确定；丢回执后取消＋API／client 从原库重建＋原 body／key确认且保较高 current；CAS 冲突保输入直到明确重读；合成旧不支持阶段只读而基本字段仍可保存且旧阶段内容保留。旧阶段 fixture 明确由自有合成 SQLite 设置，不冒当代受限命令曾产生该数据。
- `final-mobile-typecheck-with-entry-and-legacy.log`：mobile typecheck **exit 0**。中间默认值及严格 nullable／测试状态引用错误均已修正，初次日志保留；终态使用更新后源码与真实 shell-state 不变断言。
- 限定 `git diff --check` 通过；基线其余 **12 项 control** 原始 SHA 未变。没有借旧 b4 CI 认证本批 WIP，也没有扩大到全仓／完整 family。

## 冻结与收尾

最终 `source-freeze.json` 为 object.files **24 项：4 write／20 control**，manifest SHA256：

`1f185853c8285f4c81c02a122eed4060770e265e88d4bbaa83f2fc348d5db4a4`

24 项原始字节逐件校验后保存到 `final-source-inputs/`；包含真实 client／owner／pending、parser／service／SQLite／事务、domain／时刻、fixture、token 与相关旧消费者控制。`completion.json` 记录各终态检查和资源范围。

所有自有 React／Query、API／SQLite 已逐条 await 关闭，测试与类型命令终态退出；没有 TCP listener、真实 provider 请求或后台服务。未操作设备／ADB／DevTools／构建、网络／防火墙／VPN、共享服务、Root PLAN／HANDOFF／Context 或 Git。Root 后续可独审这份固定源码，再推进原生候选；完整地点／路线／天文生成、直接拖拽、真实 Native 视觉／生命周期／存储、部署及其它 family 结果仍未完成。
