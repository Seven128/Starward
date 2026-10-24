# R20 行程版本 App／当前资格独审

结论：**发现1项P2，当前24份冻结不能按本审查范围判通过。** 新历史／恢复和同owner成功资格的主干可复用；阶段时间差异的呈现会隐藏实际恢复改动。没有修改生产源码、PLAN、HANDOFF、Context或Git；没有操作手机、IDE、build、共享服务、网络、外部HTTP、防火墙或部署。

## 范围与输入

按适用AGENTS、global/default Context、唯一PLAN当前执行顺序及Independent API／private authority责任、Source的versioned-editing／version-and-share-actions、Native Screen Contract和DESIGN的App档案审查。采用现行starward-interaction-design及Native状态／恢复方法，未重新设计或套用WEAPP资源。用户后置层叠／Sky播放性能的最新指令保持；此次没有性能采集。

冻结清单为tmp/itinerary-revision-recovery-20261025/source-freeze.json，SHA256 **b6e165f5e05fa26c7d81fe1d6247163ea476d965412f1181e1b8eb7214c68df3**。开始和结束逐件核对 **24/24长度及SHA一致**。API/domain/公开合同另由配对审阅者负责；本审查沿实际App client／Screen／原pending owner／shared observation追踪。

## P2：阶段差异预览隐藏实际瞬间变化，仍允许恢复写入

位置：apps/mobile/src/features/itinerary/ItineraryScreen.tsx:67、:70及:138。共用localTime只输出short date／short time；stages差异对全部startsAt／endsAt也用这个分钟级表示。domain比较与恢复保留完整瞬间，因此“有变化”会启用恢复，但用户看到的当前／恢复后值可能完全相同，违反恢复前呈现真实差异的要求。

独立参数化反例实际执行生产ItineraryScreen → 原client → Fastify inject → SQLite：以同一个stage id、相同kind及其它内容建立旧rev2和当前rev3，打开实际历史／差异，读取生产组件生成的两行文本，然后按真实恢复按钮并读SQL效果。只复用作者原测试bootstrap的Native原语／shell适配器，不提取或替代产品formatter、command、route或SQL；没有TCP listener或外部请求。

| 支持输入／独立结果 | 实际预览及效果 |
| --- | --- |
| 同stage只有秒／毫秒变化：current start 2026-11-01T14:00:20.200Z，旧start 14:00:10.100Z；end同理 | 两行均为“1. 观测（same-user-stage） 2026/11/1 22:00—2026/11/1 23:00”。恢复按钮enabled，实际1个POST生成rev4，start改回旧10.100秒。 |
| Europe/London的DST重复本地小时：current start 2026-10-25T01:10:00.000Z，旧start 00:10:00.000Z；end分别01:20／00:20 | 两行均为“1. 观测（same-user-stage） 2026/10/25 01:10—2026/10/25 01:20”。按钮仍enabled，实际1个POST生成rev4，start改回一小时前。 |

两条最终严格“预览应可辨识实际改动”断言均失败；新revision与实际旧瞬间恢复的前置断言通过。**这是呈现丢失，不是保存值被截断的结论。** 单纯增加秒／毫秒仍不足以消除重复本地小时歧义；阶段比较应按实际支持精度无歧义表达瞬间（必要时含offset或UTC），保存内容不能截断。

该formatter的另一个消费者是历史摘要updatedAt，它同时有明确revision标识；未将这种分钟摘要本身认成第二个P2。人数和其它输入直接呈现完整值，没有发现同一舍入机制。修复应留在阶段差异呈现职责，避免无依据全局更改所有时间文案。

## 已核且未发现其它新增P1/P2的路径

- 历史选择、关闭和切版只读；shell Context不进入恢复command。选版冻结当前的id／owner／revision／timezone及完整title+inputs+stages，比较和恢复复用同一内容owner；未知字段／不支持快照拒绝用于恢复。
- 未存表单仍留在父Screen，editing阻止恢复；历史读失败保留当前／编辑。所选快照的后台重读失败保留旧比较并通过revision.isError阻止恢复，不把旧缓存冒新成功。
- 冲突保选定版本与旧base，恢复不会自动换base。只有当前读取成功且明确重新比较才更新base并解除冲突，然后还需再次恢复。原API CAS和当前权威读回继续负责写入结果。
- 关闭历史不清未知pending。恢复使用原patch和原slot/body/key/资格，client重建后可对账；onSuccess只发布当前owner且不把旧receipt结果盖过已有更高current。原pending清除条件和拒绝语义未改成历史面板自己的协议。
- history/getRevision须已有独立当前family资格，校验id／owner／revision／schema／完整可编辑内容；历史页不授予新attempt资格。当前private projection随authority过滤，跨owner或拒权会撤掉旧私有历史，不因旧响应复活A。
- observation只在真正成功accept时发布新的观察身份；begin和未成功读取不取得该身份。原拒权失效旧200、同owner新成功不受旧403撤销、原A拒权不撤B等原机制继续保留。

## 定向运行结果与原件

原件仅在tmp/review-itinerary-revision-app-20261025/：

| 检查 | 本次实际结果 |
| --- | --- |
| 独立实际Screen时间反例 | **2失败**，subminute-preview-two-mechanisms.log；两条均为同一P2的实际展示断言，恢复SQL效果另已确认。可复用subminute-preview.test.tsx及该目录vitest.config.mjs。 |
| 原真实owner协议的受影响筛选 | **8通过／6按filter跳过**，authority-selected-protocol.log：两family的新同owner资格、未完成／503不能推进成功身份、旧200不能撤拒权。未跑原legacy／旧API整套，只按其原证据复用。 |
| 实际React同owner refetch | **2通过／4按filter跳过**，same-owner-consumer-refetch.log；Itinerary／Field每次明确refetch各只增加一次library GET，当前私有内容保留，事件循环drain未见自发fetch循环。这不是物理性能结论。 |
| 源码收尾核验 | 24/24及manifest一致，review-completion-source-check.json；后续没有写生产源码。 |

首次临时bootstrap漏改./ItineraryScreen路径，0测试执行，原件first-load-failure单列。DST样本首次期望未按既有UTC .000规范书写，产生harness的字符串期望失败，precanonical-expectation日志单列；最终规范样本的两项失败均在正确的差异可辨识断言，不把准备错误认产品缺陷。

所有Vitest调用均终态；每个case的React root／QueryClient／Fastify／SQLite由原afterEach关闭，暂存合成DB原件保留，未建立listener。独立执行后实读本任务路径的Node进程数0，未杀任何进程。未逐case保存TEMP目录映射，不能把原件描述成完整取证索引。

本报告不认证Native实际画面、触摸／键盘／系统Back、AsyncStorage／进程杀死后的真实恢复、production／混合版本／多owner或完整行程family。Root需修复此P2、复用反例验证后取得新的增量审查；类型／现有作者结果／旧576 CI不能关闭本次实际失败。完整Goal和后置性能／OOM义务保留。
