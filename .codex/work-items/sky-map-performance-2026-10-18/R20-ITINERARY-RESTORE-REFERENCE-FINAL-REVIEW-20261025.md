# R20 行程引用恢复 API 增量独审

结论：**本次引用恢复的 API／事务／相关合同审查范围通过，未发现新的 P1/P2。** 原“分次合法保存的历史无法通过完整恢复 body 准入”已由当前受校验的源版本引用修复。App 阶段精度／pending 交互由配对新审阅者负责；本报告不是 Native 设备、完整行程 family 或 Goal 验收。

## 输入与责任

已读适用 AGENTS、global/default Context、架构／验证 owner、唯一 PLAN 的 historical restore closure／exact stage comparison display、原 API 反例及本批修复报告。用户后置层叠／Sky Play 性能的优先级保持，本次无现场或性能操作。

开始和结束均核对 `tmp/itinerary-restore-review-repairs-20261025/source-freeze.json` 的 object.files **24/24 长度/SHA一致**；manifest SHA256 为 **0c4bd6e0d5efb3d367f6899c34cb011db790f59b433d4584adc02040ba2ceaee**。没有用旧 main 576 CI 代替这份 WIP。未修改产品源码、Root PLAN／HANDOFF／Context 或 Git。

源码链：`draft-command.ts` 严格解析引用 → `itinerary-routes.ts` 先可信 actor 再 caller restriction → `ItineraryService.command` 对完整原命令计算原 digest → 原 `repository.commit`／`commitWithReceipt` 在 `BEGIN IMMEDIATE` 内先查 actor/key receipt → 仅无回执时读取同 actor/id/sourceRevision 并验证完整支持内容／时区 → 原 domain patch 生成新 revision → current/version/receipt 同事务。新引用没有第二写入／pending／事务 owner。

## 新的独立实际运行

复用现成 `privateDraftHttp`，实际 Fastify inject／parser／service／SQLite；只在未调用的 AsyncStorage／crypto 原生边界使用原测试替身，无 TCP listener。自有 `probe.mjs` 一条旅程核对六组机制：

1. 合法 create 保存40,000字符合成 origin，另一次合法 patch 保存200个不重叠普通 observation stages，再保存短 current revision 3。完整旧恢复 body **69,382B** 仍实际413；生产 helper生成的原 `restore-draft` 引用仅 **165B**，实际200生成 revision／sequence 4。完整 title/inputs/stages逐项相等，current id/owner/timezone/createdAt/source/stops/evidence保持；原三个 SQL version body 原字节不变。没有裁字段、拆多次恢复或放宽64KiB。
2. 正常编辑到 current 5后，兼容 `/v1/itineraries/commands` 用同 actor/key/原引用重放只返回原 receipt/revision 4，current仍5；同 key 改 sourceRevision 实际409 `itinerary_idempotency_conflict`。
3. 在 **v1、v2 两条实际命令入口**，可信 B携A restriction均403；B无头也不能写A计划，404且B没有新 receipt／版本。无 actor仍403，caller header不授身份。旧 generic `generate`仍409 upgrade／legacyRecordsPreserved，不被 restore variant 接管为新效果。
4. 在此**隔离合成 DB**故障注入源版本未知 editable 字段或移除源版本：首次新引用分别422／404，current和receipt不变；已提交的原引用在源非法／缺失时仍200重放原 receipt。这验证实际回执查回先于重新解析源内容。之后恢复本轮合成源行的原字节；没有触碰用户历史数据。
5. 自有 SQLite receipt trigger在 effect 后拒绝 receipt insert：实际503/unknown，current/version/receipt共同回滚；移除本轮 trigger后原引用安全重试生成 revision 6。旧 frozen base新key仍409，不能无声 rebase。
6. 关闭原 API／SQLite，从同一新文件重建 runtime/API：current 6、原 receipt 4及保存的所有 version hash均可实际读回；无重新写入或新版本。

证据仅在 `tmp/review-itinerary-restore-reference-20261025/probe.mjs`、`probe.log`、`result.json`；合成 DB后缀 **gD2ypQ** 保留。六组机制不与作者55项相加。

## 旧 wire／回执与公开合同

另外只读复制上一轮真实 API 审查留下的旧 DB（原后缀 **aPMGS0**）到新的自有目录 **N0OTIO**；**不修改原件**。新服务通过 v1兼容别名实际重放其旧 `create-draft`、`patch-draft` 两份已保存回执，得到原 revision 1／5，current仍6。复制库的 current/version/receipt各行内容与之前完全一致；原库相关文件 hash前后也相同。这只证明旧服务器记录／wire在新 owner下的兼容读取，不给缺原owner资格的旧客户端 pending补造历史。

对应 `old-receipts.mjs`、`old-receipts.log`、`old-receipts-result.json` 同目录保留。

- 与 Root 私有 b6原字节中的 OpenAPI深比较，移除新第三 variant后，**原两 variant及文档其余JSON语义完全相同**；当前195个内部 refs全部可解析。
- v2请求直接引用 `ItineraryDraftCommand`，v1在原 oneOf中引用同一命令并保留旧 generic union；两入口实际路由都使用相同 `respond`／可信 resolver／restriction／service。真实默认 `start.ts`仍装配原本的loopback POC resolver，受控A/B不构成生产身份。
- 生产新引用 body／实际成功和失败 envelope经现有 Ajv2020验证；额外 caller patch不通过命令合同。format注解未重新资格化。
- 原 create／patch parser分支及其之后旧invalid-command尾部与b6逐字相同；canonical digest／receipt transaction本身是本批未改控制。结合上述真实旧 receipt重放，不仅依赖类型或 source pattern判断旧wire兼容。

最初一条合同检查误把v1 schema当成直接 `$ref`；实际是保留generic命令的oneOf，该次只在元数据断言失败、未执行产品操作。按真实公开结构修正检查后通过，未修改合同来满足检查。

本检查没有把refs可解析当作全部历史API文档完备证明；v1参数表未列可选owner restriction是继承的描述差异，运行时仍实际强制已提供的restriction，新合格client仍使用v2。完整混合版本／生产部署不由此次局部兼容检查认证。

## 资源与仍欠

所有调用均已终态。每份自有fixture／API／SQLite由finally关闭，复制旧库的readonly连接也已关闭；实读本任务 entry路径 Node进程数 **0**，没有 listener、后台worker或共享服务。没有删除／上传原件、操作手机／ADB／IDE／build、PG／共享API、网络／VPN／防火墙或部署。源文件最后24 pins及manifest仍一致，记录 `final-source-check.json`。

原无资格attempt的可证恢复、同版API/client实际部署／多owner／混合版本、Native真实画面／AsyncStorage／进程杀死恢复／触摸键盘Back生命周期，以及完整行程 family、完整Goal和后置性能/OOM保持原未完成范围。Root最终整合、新head Git/CI及配对App审查另有责任。
