# R20 行程恢复准入与阶段瞬间差异批修

状态：**两项已实证 P2 已修复，限定回归／类型通过，24份当前源码冻结待 Root 新独审。** 不构成 Native 设备、完整行程 family 或 Goal 验收。用户后置层叠／Sky Play 性能的优先级保持；本批没有现场、性能、部署或 Git 操作。

## 输入与原件

接续[模块实现](R20-ITINERARY-REVISION-RECOVERY-20261025.md)、[API独审](R20-ITINERARY-REVISION-API-REVIEW-20261025.md)和[App独审](R20-ITINERARY-REVISION-APP-REVIEW-20261025.md)，按唯一 PLAN 的 historical restore closure／exact stage comparison display 执行。开始时对原 b6e165f5… manifest 的24份当前文件，以及 Root 私有 `device-resume/itinerary-revision-b6e165f5-20261025/` 的24份原字节逐件读回一致。旧清单、旧源码和两个独审反例不改。

本批日志、原合同、当前完整源字节及新清单归 `tmp/itinerary-restore-review-repairs-20261025/`。全部原件本机保留；没有上传。

## 恢复传输对合法历史闭合

原 create 和 stages patch 各自在64KiB内合法保存，合计历史可超过单次命令上限，不能用安全的413拒绝代替恢复能力。新增同一命令 union 的 `restore-draft`，仅冻结 `itineraryId + baseRevision + sourceRevision + idempotencyKey`；不传回整份历史内容、不裁字段、不拆多次写、不放宽上限。

`ItineraryService` 仍调用原 `repository.commit`。原 actor/key receipt 查回先执行；仅没有匹配回执时，现有 `BEGIN IMMEDIATE` 回调才读取同一真正 actor/id 的准确源 revision，验证 schema／身份／支持的完整编辑内容和时区，再用原领域 patch 生成新 revision、sequence、日志及时间。完整 `title + inputs + stages` 的比较、引用构造和服务端内容恢复共享原 content owner。旧 version body、当前 id/owner/timezone/createdAt/source/evidence/stops 不从历史重写，存储 schema／表和 receipt transaction 没有更换。

原 create／patch 分支、canonical digest、pending slot／qualification版本及旧 pending body/key保持。新 restore 的丢回复、重建、原owner对账和权威 current 读回走同一 owner；B 不能确认 A 的原引用。新增的缺源／不兼容拒绝码只在 receipt 查询之后的 restore 回调产生，client 仅在对应 restore retry 上认作该阶段拒绝；parser、authority和未知失败不扩成旧 attempt 未提交的证明。

公开 `ItineraryDraftCommand` 仅增加第三个 variant，其余合同语义不变。原 `/v1/itineraries/commands` 兼容写入别名也委派该 variant 给同一 qualified service，与两个版本共享的 schema 一致；实际原键别名重放返回200而未新建版本。旧 v1 读取／旧 generic commands 的 upgrade 行为保持。这不是恢复旧 renderer 或混合版本部署资格。

## 阶段差异精度

Native App 沿现有 `starward-interaction-design`、Screen Contract、样式和 Text 布局修复。阶段差异保本地可读时间，并附完整 canonical UTC 瞬间（支持的秒／毫秒），明确区别 DST 重复本地小时；使用已有 UTC 规范化和基础 Date 能力，不依赖新的 Native Intl 精度选项。原历史摘要 updatedAt 的分钟样式保持。

只改阶段比较的表示，不截断或舍入保存值。原 Text 未设置单行截断／固定最大高度，代码允许换行；**实际 Native 画面和可读性仍待目标设备核验**。待确认恢复另显示原 source revision 与比较 base，让重新打开消费者后的重试含义可辨识；跨owner时仍隐藏原私有内容。

## 实际检查

| 检查 | 结果与证据 |
| --- | --- |
| 合法大历史，同一正式断言修前 | **1失败／4按filter未执行**，`large-history-regression-before.log`；两个原始命令均成功且小于64KiB，旧完整恢复实际413。 |
| 秒／毫秒及 DST 正式实际 Screen 反例修前 | **2失败／5按filter未执行**，`precision-before.log`；实际恢复 SQL 值已先确认，失败点是预览不可辨识。 |
| 新正常／恢复 focused | **2文件13/13**，`repair-focused-final.log`；被下方最终批次覆盖，不相加。 |
| 最终受影响旧／新检查 | **8文件55/55**，`affected-frozen.log`。包括完整大历史恢复新rev4／原三版 SQL body不变／新请求小于64KiB、旧完整大 body仍413；缺源、跨owner、未知编辑字段和caller内容注入拒绝无写入；真实 receipt-trigger rollback、base冲突、同key改源409、丢回复重建／B拒绝保pending／A原ref-key确认且不盖后来 current；两个阶段表示反例及原消费者。 |
| API／mobile 两workspace完整类型 | **各exit0**，`api-type-frozen.log`、`mobile-type-frozen.log`；日志完成时间晚于本批最终 source edit。其它并发模块后续变更仍由 Root 最后统一整合。 |
| 公开合同 | **195 refs可解**，`contract-final.json`；只增加 restore variant，旧两 variant及其它JSON语义深比较一致。实际引用 body经Ajv通过，注入额外patch不通过；格式注解未因此重新资格化。 |
| 源冻结 | **24/24，10份变化＋14份未改控制**；当前源及 `final-source-inputs/` 原字节都重新读回一致。 |

第一版新增大历史 fixture 的 stage id较短，合并只有64,453B，先在“应超限”的准备断言失败；保 `large-history-before.log`，不计产品反例。改为实际支持的普通较长 id、仍保持两个原命令合法后，才取得上述真实413修前失败。初次旧UI测试仍按旧完整 patch 断言 pending，修为检查新原引用并保留原 body/key、SQL结果断言。合同编辑曾把多行节点当单行，候选 parse校验在写入前拒绝；后续直接写被Windows映射拒绝，原文件可解析。最终经同盘保原件替换成功，只插入新增 variant，未改其它节点或放宽格式断言。

## 冻结、资源与仍欠

当前 `source-freeze.json` 为 object，files数组24项，SHA256：**0c4bd6e0d5efb3d367f6899c34cb011db790f59b433d4584adc02040ba2ceaee**。完整当前原字节在同目录 `final-source-inputs/<repo-relative-path>`；原 b6清单仍在 `baseline-manifest.original.json`，Root私有归档不变。本作者已停止源码写入。

所有工具调用已终态，新增旅程全用 Fastify inject；检查里的 API／SQLite／React／Query 连接均由 finally／afterEach关闭，没有新 listener或后台helper。原及合成目录保留，资源说明归 `resources-checkpoint.json`。未操作手机、ADB、IDE、WEAPP build、PG／共享服务、网络／VPN／防火墙、Git、发布或后置性能。

Root仍需新独审与整体交付检查。实际 Native 画面／触摸／键盘／Back、AsyncStorage及进程杀死后的恢复、production／多owner／混合版本部署、旧无资格 attempt 可证恢复、完整行程/通知/Field family与后置性能/OOM保持原未完成范围。旧576 CI不覆盖本批。

建议仅向原 Context owner回写持久事实：同一命令事务的源 revision 引用恢复；成功/未知重放与 current分离；仅stage差异提供无歧义完整瞬间，摘要格式保持。计数、原件、临时过程留本任务报告。
