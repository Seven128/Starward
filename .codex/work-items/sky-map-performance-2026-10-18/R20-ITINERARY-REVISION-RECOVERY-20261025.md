# R20 行程版本历史、差异与明确恢复

状态：**本批实现与限定检查完成，源码已冻结待 root 新独审；不是 Native 设备、完整行程 family 或 Goal 验收。** Root 已转达用户将叠层性能、Sky 播放及相关内存/OOM 后置；本批只继续既有独立行程模块和 root 新实证的同 owner 旧拒权修复，没有操作现场或另起方案。

## 已实现的用户路径

沿[既有模块入口](R20-NEXT-ITINERARY-BOUNDARY-20261024.md)、Source 的 `REQ versioned-editing`、`CTRL version-and-share-actions` 和当前 Native Screen Contract：已保存草稿 → 版本历史 → 选择具体旧版 → 查看双方版本及真实内容差异 → 明确恢复 → 新 current revision。取消查看不发命令、不改 shell Context。未保存表单保持原输入，明确保存/取消前不能执行恢复。

- 原 SQLite repository 增加 `history`：按实际 actor/id/revision 游标读取最多50条摘要，沿原51条探测下一页；只取 revision/sequence/title/updatedAt，不把每个完整 snapshot 拉入 JS 或逐版本 HTTP 请求。新私有 GET `/v2/itineraries/:id/revisions` 复用现有 actor/restriction/error/no-store/Vary 责任，不添加第二历史库或写入协议。旧 current/version/receipt、SQLite schema、命令和 receipt wire 未改。
- `packages/domain/src/itinerary/draft-content.ts` 负责本草稿 schema 的完整可编辑投影、比较与恢复输入：`title + inputs + stages`，以及冻结比较所需的 id/owner/revision/timezone。API patch/input 的准入字段名也复用该声明。身份、创建信息、来源、状态、科学证据和旧操作日志不从历史拷回当前；恢复仍由原 `patch-draft` 生成新 revision/sequence/log/time，旧版本不重写。输入/阶段中不认识的可编辑字段不被静默丢掉，历史响应不兼容时拒绝用于恢复。
- 实际 itinerary client 增加 `history/getRevision`。读取历史前必须已有当前 family 的独立 owner 资格；历史页不能替代新 attempt 的资格取得。选中快照校验 schema/id/owner/指定 revision、时区和受支持的完整编辑内容。响应、游标、摘要顺序/大小不合约时拒绝；迟到 A 不能变成当前 B 的历史。
- `ItineraryScreen` 使用原 Native 样式、触控基础、Query 和同一保存 mutation/pending owner。比较基准在选版时冻结，选版后聚焦单版差异，保留选择其它版本及关闭入口。并发更新不自动更换 base：保留原比较，必须成功读取当前并明确重新比较，再另按一次恢复。读取失败保当前/所选版和编辑内容；已有所选快照的重读失败会保留并标明上次比较，重试成功前禁恢复。无差异/当前版本不制造空恢复版本。
- 未知恢复仍使用原完整 body/key/原 owner 和原 pending slot。关闭历史不取消/清除未知命令；client/消费者重建后重试原键。历史 receipt 只确认该次效果，显示仍以权威 current 为准，不覆盖后来更高版本。

沿现有64KiB命令请求限制处理明确拒绝，不靠裁字段适配；恢复超限的文案说明“尚未恢复、原版本保留”。本批没有新增产品数值上限、库、全局缓存、代理或命令框架。

## 同 owner 旧403的新增真实修复

这与[前轮旧成功列表撤销拒权](R20-PRIVATE-OBSERVATION-DENIAL-FINAL-REVIEW-20261024.md)不同。Root 的 `tmp/fresh-owner-old-denial-probe-20261025.json` 实证：ready A → 一份真实 get403暂扣 → 恢复可信A并新list成功 → 释放旧403，fresh private 又被撤为 denied。原 `publish` 对相同 status/owner 去重，成功确认没有发布新观察身份，旧错误仍被当作当前。

已在两 family 的正式真实 client→Fastify inject→SQLite 回归保存修前 **2失败，另10项按filter未执行**。当前只在现有 observation 的成功 `accept` 发布新资格身份；`begin`、尚未成功/503未知读取不提前取得该身份。现有当前401/403撤私有、拒权失效旧200、明确新读恢复、原A拒权不撤B和所有 pending/wire 规则保留，没有持久 epoch 或新 owner。

正式回归同时检查成功/未完成/503三种有意义的顺序，两 family 都实际执行。实际 ItineraryScreen／FieldReportsPanel 再明确 refetch 同 owner，每次只新增一次 library GET、保留当前私有投影；一次有界事件循环 drain 未见 subscriber/Query 自发循环。这不是性能/物理帧率证据。

## 实际检查与原件

所有本批日志、合同前字节与格式中间件、旧 helper 和冻结归 `tmp/itinerary-revision-recovery-20261025/`。不相加重叠批次或拿之前576的CI冒当前源码。

| 检查 | 结果／证据 |
| --- | --- |
| 新API恢复路径 | 4/4，包含于最终API批次。非空旧内容含日期、人数/出发地和用户阶段；新revision、旧SQL版本body原字节、current/receipt replay、新连接重开、实际receipt触发器回滚、CAS拒绝、53版分页、owner与新公开schema均实读。 |
| 最终受影响API | **4文件27/27**，`api-after-shared-qualification-final.log`；共享新资格修复之后重新检查了实际client参与的原HTTP/事务消费者。 |
| 新历史客户端边界 | **7/7**，包含于mobile批次。实际响应链的错误id/revision/owner/schema、未知编辑字段、错误标量类型，以及历史页不授当前资格；无POST/无pending写入。 |
| 新真实React历史旅程 | **5/5**；正常只读/取消/完整恢复、未存输入和两类读失败、明确冲突重比、未知恢复重建、真实拒权/迟到A。`history-selected-refetch-final.log` 是最终所选快照重读失败修正后的该文件结果。 |
| 受影响mobile消费者 | **8文件54/54**，`mobile-affected-after-same-owner.log`。包括新历史旅程、原Itinerary/Field实际消费者和private owner的14项协议；之后仅补所选快照重读失败的恢复门，已按上行重跑5/5。 |
| 新旧403同owner修前 | **2失败/10项按filter未执行**，`same-owner-denial-before.log`；旧helper字节保留为`private-owner-before-same-owner-fix.ts`。最终14项协议均在上述54项中通过。 |
| API/mobile完整类型 | **各exit0**，`api-type-final.log`、`mobile-type-frozen.log`。最后mobile检查覆盖最终UI条件。 |
| 合同完整性 | **193个内部refs全部可解**，只新增1条path、1个schema，其余既有JSON语义深比较一致，`contract-final.json`。新实际API响应另经Ajv schema检查；格式注解未因此重新资格化。 |
| 源字节 | **24/24**：17份写入路径、7份关键未改owner控制，UTF-8/无NUL/行尾空白检查通过；没有运行Git。 |

最初fixture reopen参数与已有options变量重名，两个新suite在加载期失败、0执行；修正后才有API/消费者结果，`*-history-first.log`保留，不算产品失败。OpenAPI曾生成全量展开的本作者中间格式，原件保留；最终只在原字节的对应key位置增加两行节点，未改无关格式和语义。

## 冻结与资源

`source-freeze.json` 是object，**files数组24项**，SHA256：**b6e165f5e05fa26c7d81fe1d6247163ea476d965412f1181e1b8eb7214c68df3**。基线5767cba3由父任务告知，作者没有Git读取/写入；冻结的是当前实际字节。17份写入路径包含新历史模块、对应合同/测试/fixture和Root新增授权的observation/真实消费者修复；7份控制为原pending、qualified command、receipt transaction、local actor、domain patch、private-owner contract及runtime。源码从此停止写入，后续只报告/核对。

新历史/同owner检查均使用inject，未启动listener；受影响的旧HTTP检查沿其既有随机loopback，均已终态并按原teardown关闭。Fastify/SQLite/暂扣响应都在finally/afterEach结束。新fixture保留TEMP的`starward-private-draft-owner-*`合成DB原件；没有逐case记录目录映射，不把它冒充完整取证索引。旧测试自己清理其新建临时目录的既有行为未更改，没有删除用户原件。资源归`resources-checkpoint.json`。

未操作手机/ADB/IDE/WEAPP build、原PG/API/共享服务、网络/VPN/防火墙、Git或部署；未改Root PLAN/HANDOFF/INDEX/Context。未重建冻结代、清N05、重发R6或上传资料。

## 提供给Root的Context事实与仍欠

建议只向现有Native runtime/domain与itinerary Screen Contract回写：私有历史摘要页/具体revision读取及其当前owner限制；完整可编辑内容比较/原patch恢复；冻结比较base、显式重比、未知命令不随关闭清除；成功同owner资格应产生新的观察身份，实际拒权与未成功读取的规则保持。具体版本、原件、过程和计数留本任务报告，不写进长期Context。

本批仍需新的独立审查、Root整合/授权Git/精确CI。实际Native画面、触摸/键盘/系统Back、AsyncStorage与进程死后恢复未在本批建立；React primitives不替代这些。公开/混合版本/多owner部署与原无资格pending的可证恢复仍未资格化。此次只补历史恢复责任，不提供天气刷新建议、真实路线/阶段生成、分享/协作/离线及完整行程family；原family `passes:false`、完整Goal与后置的性能/OOM义务均保留。
