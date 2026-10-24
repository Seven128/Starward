# R20 通知采集、评估与 App 收件箱

本批接续同一 PLAN 的独立 API 责任。只推进真实预报采集到私有 App 收件箱这一条正常/失败/恢复路径，不关闭完整通知 family、F14 或 Goal。没有发送 OS、远端推送或第三方消息；未操作手机、IDE、共享服务、VPN、冻结代或用户数据库。全局与类别开关默认关闭，旧规则的 definition enabled 不获隐式投递授权。

**最新审查状态：** 初次冻结后独审实际确证6项P2（App4/API2），旧13/13或9/9不能覆盖它们。Root现独占App四项修复；本作者只修API两个来源资格问题。API两份原独立probe已原断言2/2通过，当前API三文件11/11及类型通过，新17份冻结见原manifest同路径；仍等独审复验，不宣称完整通过。下面初次冻结/消费者结果按当时范围解释。

## 支持合同与真实输入

- 原 `ForecastQueryService` / `OpenMeteoHttpClient` 仍拥有真实采集、合规 gate、归一单位、主/比较模型及有界预报缓存。新增的可选 primary-acquisition sink 接收同一实际 primary run、原查询点/目标、既有 astronomy owner 的 dark/target window 与算法版本；没有公开接收客户端 provider event 的路由。
- 事件继承 runId、原 modelRunTimeUtc、ingestedAt/fetchedAt、expiry、provider/model/use/许可与归因。`dataVersion` 是合格归一投影的内容摘要，**不是新造的上游 ProviderRun 版本**。当前 native POC 的 runId/modelRunTime 仍有原组合的本地采集身份边界，不能据此认证生产模型发布 epoch。
- 当前可评估组合是精确原查询 WGS84 点、实际 ForecastQuery 目标枚举，以及 `totalCloudPct/%`、`windSpeedMps/m/s`、`windGustMps/m/s`、`precipitationProbabilityPct/%`、`precipitationMm/mm`、`temperatureC/°C`。该预测小时必须同时落在既有暗夜与目标可观测窗口中；目标/天文算法版本进入比较身份与触发快照。
- 用户 `leadMinutes` 用于该实际目标小时段开始前的 dueAt，不改变查询或天气时刻。quiet hours 使用用户保存时区与 HH:mm；时间推进沿真实 UTC 检查，不凭空换算 DST 缺口/重复小时。cooldown 使用用户保存值；新表单按批准的行前/长期默认初始化，同一源事件的重复时段另受批准的 6h 冷却。
- 第一份合格资料建立真实或 unknown 基线，只在同规则 revision、目标、预测小时、来源方法的合格 false→true 边沿排入待处理。零值有效；missing 不当零/false，推进未知水位并等待新证据；旧/乱序采集不得覆写较新水位。阈值/目标/窗口滚动不能制造虚假边沿。off 时只有影子评估，没有 Inbox 写入或实际投递 cooldown 消耗。
- 任意 grid、综合 score/未知指标、单位不符、未知目标与非 Inbox 通道继续保存原配置，但 activity 明确 unsupported。行程 revision 风险、长期天象/空间站/综合最佳窗口、完整区域 ProviderRun 导入、系统权限/排程及各远端通道仍未完成。生产源权利/供应和目标设备验收未由本批替代。

## 责任与恢复

- `weather-acquisition.ts` 只做实际输入资格和不可变事件投影。通知 SQLite enqueue 失败时，独立有效 forecast 仍返回，并提示通知评估未确认；原有有界 forecast cache 仅保失败采集的 retry closure。缓存重读重放原 source/id/expiry，成功即释放 closure，不按新 query 时间造事件或重新请求每条规则。
- 同一 `notifications-and-toolbox.sqlite` 内新增通知专用 source/cursor、edge、审计、candidate、controls/receipt 与 Inbox 表。原 rule/version/receipt 和 legacy business_records 字节不改。源事件以 id/digest 去重，原点/target 索引定位规则；每批复用现有 50 条分页量，事务提交 cursor，批间让出执行。source 与 due 每轮各有执行机会，源持续到达不饿死已到时工作。
- 临时处理 payload 在事件完成后退休，原事件摘要/来源和规则/触发证据保留；不持久化上游原始响应。候选到时重验当前规则 revision、总/类别开关、有效期、quiet、原小时有效范围及最新合格证据。新资料反转取消候选；缺测/过期等待新资料，不把旧成功当当前事实。成功 Inbox 与候选终态在同一事务，写失败回滚，可在重启后继续。
- 普通 history/activity GET **不等待全局队列排空**：返回有界已提交结果与 ready/processing/unavailable；失败或处理中不冒成功空集。仅明确的 operational/test drain 才使用 `flush()`。timer 只跟实际 due/expiry/quiet/窗口边界，不轮询用户 provider。
- 控制命令复用现有 `commitWithReceipt` 和 App pending owner。完整 key/input/expectedOwnerId 派发前持久化；expectedOwnerId 和可选读 header 只限制 server-derived owner，不供给授权。丢回复、身份丢失/切换及读回失败不能清原 pending；原 owner/key 重试后以实际 current readback 收口。新 controls 与旧 rule 保存不共享 pending slot。
- immutable `NotificationRule` 配置/receipt 中的历史 `not-evaluated/not-configured` marker 不被覆写成后续状态。新增 `/v2/notifications/*` 的 activity/Inbox 才是当前执行责任；当前 App 已不把配置 marker 呈现为真实评估结论。旧/新 wire 与原始 receipt 保留；多版本已部署 App 共存并未由本批验收。

## 实际检查

- 新实际随机 loopback HTTP→ForecastQueryService→源 sink→SQLite→Inbox **7/7**，日志 `tmp/r20-notification-evaluation-http-current.log`。有非空来源/目标/前后值/实际时段与 due，默认 off 与显式启用、原事件 cache 重试、真实 Inbox SQL 写失败/rollback/restart/replay、missing/旧源/单位/grid、quiet/原 expiry/补新证据、105 规则与不同点位、所有权/CAS/精确重复。第一次7项为6pass/1fail：新有界读取期间按旧 cursor 数到100/105；原日志保留。现检查明确故障时已有50条可读，再实际 drain 后重开分页读全105，不把生产读改回全队列屏障。
- **真实默认 `start.ts` 组合 1/1**：仅新隔离 SQLite、随机 loopback 及已有 loopback weather transport，Node 标准 mock 只固定测试 Date；实际 OpenMeteo HTTP client、归一器、主/比较模型、真实启动路由/owner 均执行。第一次主采集建立 false，真正进程重启后新采集 true，原规则/controls/edge 恢复并读到一个非空 Inbox；4 次天气/2次共享AQ请求，无逐规则拉取。测试 source 是明确合成上游，不认证真实生产供应/许可。自建进程/监听/数据库均关闭，未触共享8806。
- **worker/reader 边界 1/1**：持续不排空的 source port 下，实际 service 同一轮仍调用 due，并在未排空时返回 committed history/processing，不借测试要求设置产品屏障。此端口测试只证明有限调度/读取，非持久效果证明；非空实际 SQL 效果归上两项。两项合跑原件 `tmp/r20-notification-start-and-bounds.log`。
- 现有配置/预报三文件 **14/14**；API 工作区最终 typecheck **exit0**，`tmp/r20-notification-evaluation-api-types-freeze.log`。App typecheck 曾 exit0；旧实际组件11项中1条文案断言仍期待“尚未评估，尚未投递”，已按新入口与系统通知未接通的实际合同修正，新的 App/HTTP consumer 检查尚在续补。

API/domain/公开合同和上述 backend tests 先冻结交新独审；清单归 `tmp/r20-notification-evaluation-backend-freeze.json`。作者继续 App client/consumer 的实际命令与失败恢复检查，不改冻结源；若真实反例需修后端，先通知 root 解除相应冻结。

## App 实际消费者续检

- 当前 App 7份 client/consumer/正式测试已冻结，清单 `tmp/r20-notification-evaluation-app-freeze.json`；17份 backend/domain/合同仍逐件匹配。新 `NotificationInboxPanel.test.tsx` 通过真实随机 loopback API/SQLite/ForecastQueryService/source sink 与实际 Tools/Rules/Inbox React 组件，仅 RN primitives/平台 lifecycle 是受控端口。
- App 当前三文件 **13/13、0skip**，日志 `tmp/r20-notification-app-consumer-passing.log`；App工作区 typecheck **exit0**，`tmp/r20-notification-evaluation-mobile-types-freeze.log`。原规则客户端/原编辑消费者继续通过，原有文案断言迁为当前状态责任与“系统通知尚未接通”，不削弱原输入、版本、取消、冲突、原键重试断言。
- 实际全链包含：已保存 enabled rule 不自动 opt-in；UI开总开关真正落SQLite后丢回复→切其他server owner原键被拒且不修改对方→恢复原owner同原body重试、current读回→显式开类别→实际false/true采集→一个非空Inbox；界面显示80→10%、moon、真实窗口和归因。随后新资料反转保原记录，GET故障保已有行与重试，前台恢复后原资料过期不冒当前条件。没有额外provider轮询，3次采集/本批自建资源已关闭。
- 另一真实表单路径使用当前选点/target、已支持指标入口、Inbox通道和disabled默认，实际HTTP保存/读回；行前120与长期1440分钟默认切换，但用户显式33分钟不会被后续类别切换覆盖。进入当前规则的Inbox可见“尚无保存后的对应预报”，不把定义启用当成功执行。
- 初次新消费者13项为12pass/1fail：pending parser 重建对象导致重试JSON字段顺序改变（语义/原键未变），现按既有rule client模式先校验再保原对象，真实断言保持原body逐字相同。随后一条状态观察过早仍在加载，已等待实际activity返回，不改生产为同步屏障。两份原失败/中间React act提示保留，最终该13项无stderr提示。
- Inbox当前状态读回带server checkedAt，客户端以原请求开始时间保守推进该读取时钟；真正 expiry边界使已有内容标过期，前台变化只重读本模块的控制/历史，不为每个用户轮询provider。不可读取时保已有不可变触发资料，当前状态仍受原expiry约束。此为受控React行为，不建立目标手机色彩、手势、原生storage/权限或系统通知送达。

## 尚欠与交付边界

当前实际 App 入口仍归原 Tools/Notification Rules owner，新增的总/类别开关、记录/来源/反转与过期状态复用本地小按钮与三种显示模式。新规则默认 disabled、Inbox 通道、可选已支持指标；已有配置不改值。目标触摸/系统Back/键盘/前后台/真实 AsyncStorage 与渲染仍需相应 App 设备，不用 RN primitive mocks 冒验收。

真实 ProviderRun/区域覆盖、持续后台数据供给、完整天象/行程语义、OS权限/排程/取消、APNs/FCM/厂商/Expo、通知深链到当前合法业务目的地、长期保留/运营、生产授权/供应与整 family 仍欠。内部 Inbox 成功不是系统收到或关键安全送达，原 Source Plan 义务全部保留。独审、最终 App 检查、OpenAPI读回与 root 整合由后续同一 owner 更新，不据此标 complete。

## Root App 修复、独审与整合终态

两项API和四项App真实P2已在各自owner批量修复，原失败全部保留。[API最终独审](R20-NOTIFICATION-EVALUATION-API-REVIEW-20261024.md)以新17份冻结首尾hash、原两反例2/2、当前11/11及API类型关闭两项限定源码问题；[App最终独审](R20-NOTIFICATION-EVALUATION-APP-REVIEW-20261024.md)以新10份冻结首尾hash、原四条4/4、现有17/17及mobile类型关闭四项限定源码问题。原App7份/13项与API初次9项通过未发现这些缺陷，不能回写成当时已充分。

Root在作者明确handoff后独占App修复：编辑锁同步保护顶部Tools与子入口，保存/明确取消后释放；401/403撤消息/详情与Rules投影，普通503仍保独立有效历史；未知资格不显示成功空集。Rules与Inbox配对同一client authority观察，控制结果按当前读代次/owner/revision准入，取消Query前后复核，旧A确认可收口A原尝试但不覆盖B当前Query。原存储pending不被权限变化或取消编辑抹掉。为这组职责只新增feature内默认client配置，运行平台选择保留在feature边界，不引入data client的React Native解析依赖；最初该边界误引入导致1个旧client测试文件Flow加载失败已单独保留，迁回后受影响测试通过。

Root四条正式行为回归合入既有Inbox消费者文件，复用同一真实HTTP/SQLite/生产source fixture：阈值31不丢及取消后可离开；真实资格403而非空；A非空Inbox/详情与旧Rules投影在拒绝后撤下；已取得B后迟到A读回不覆盖Query，同时原A已确认pending可正常收口。probe合法的禁用/等待分支均由业务结果判断，没有为测试强迫保活路由或某一mutation终态。

最终root整合（同一新冻结源）为：API **typecheck + 34文件155/155**，`tmp/r20-notification-final-api-integration.log`；mobile fast **typecheck + 39文件156/156**，`tmp/r20-notification-final-mobile-integration.log`；旧NightReport/itinerary/rule-configuration structured owner **9/9**，`tmp/r20-notification-final-structured-compat.log`。各自范围不相加冒全仓；structured仍保整个family `passes:false`，其配置marker不是新执行状态。Root App定向17/17与类型原件归 `tmp/r20-notification-root-app-repair-tests.log`、`r20-notification-root-mobile-repair-types.log`，最终冻结清单为 `r20-notification-evaluation-app-repair-freeze.json`。

上述17+10冻结对应的共享当前观察只处理该批实际展示与发布消费者，当时未为旧rule pending/POST补原owner资格；这一前后范围保留。后续[受控实际判别](R20-RULE-OWNER-RETRY-DISCRIMINATION-20261024.md)成立后，已由[原owner绑定增量](R20-RULE-OWNER-BINDING-20261024.md)/[新独审](R20-RULE-OWNER-BINDING-REVIEW-20261024.md)闭新attempt资格：版本化本地记录、原key/body/owner重试、shared optional prepare及server限制，旧无原资格原字节仍unknown，不拿同key回执推历史。只准同版API/client，旧无头/mixed部署不获新保证。最新root全整合为API类型+158/158、mobile fast类型+157/157，具体原件归该增量；本文较早155/156不倒改。生产/多owner、真实供应/区域与epoch、完整后台监控、OS/外部通道、深链及目标Native运行继续保留。Git/精确CI另由HANDOFF和CURRENT-VALIDATION拥有，完整通知family/Goal未完成。

## API 独审两项资格缺陷及同批修复

独立原件 `tmp/notification-api-independent-review-20261024/missing-hour.test.ts` / `missing-hour-before.log`、`enqueue-readiness.test.ts` / 对应修前日志分别证明：最新合格源省略21:00后，20:31的旧true仍在21:00落Inbox；Source INSERT真实失败后，普通空队列kick把已知未确认状态误清ready。这些都是生产边界缺陷，初次通过记录不掩盖它们。

- **覆盖/水位：** edge现在保原合格hour/window/query/天文算法身份，未来window按现有rule/revision与结束时间索引取回。新采集统一更新当前窗口与先前仍有效的合格窗口；同scope省略的hour成为unknown，推进原采集时刻水位，候选等新证据，现有历史不得借旧true冒当前。仍存在的其他hour独立更新/重装；晚到更早源先经同hour的采集水位拒绝。窗口身份包含night/timezone/真实起止，不能靠窗口滚动造false→true；不同算法不借旧窗口。
- **采集就绪：** 同一通知SQLite的readiness intent先独立提交完整原事件/digest，再原子enqueue source event并确认该intent。第二步失败保原payload/资格，可在同owner worker/读恢复或重启后原样重试；普通空读或另一点位的成功不能确认它。若连intent写也不可用，service暂保最小原header/digest作为volatile未知资格，原forecast cache仍拥有完整原输入；只在该id的真实接受读回或源实际过期且退休水位持久化后撤下该fallback，不凭空队列清除。
- **发布与读取：** 新observed-source水位同时限制due和current状态，即使新源尚未enqueue/完成或已过期退休，也不让较老证据重新冒当前。候选只等其当前合格hour，不波及其他有效hour/点。source intent、source page、due每轮各有有限执行机会；一个阶段失败后仍给独立阶段一次机会，然后停止原条件失败循环。失败只预约真正未来边界，不1ms重试旧错误。
- **有效退休：** expired pending源可退休处理payload，但保紧凑原观察水位；它不能恢复旧truth。成功接受则以原id/digest真实SQLite读回收口。不可恢复的整盘/进程输入损失、生产多worker资格、长期审计保留/运营仍未据此认证；实际composition仍为个人试用POC。
- **当前检查：** 两份独立probe原文件/原断言 **2/2**，`tmp/r20-notification-source-probes-after.log`；三份受影响API责任/真实start/worker-reader **11/11**，`tmp/r20-notification-source-regressions-final.log`；API类型exit0，`tmp/r20-notification-source-types-final.log`。新增两条正式回归沿已有helper：省略21点不投递且22点在新证据后仍可投递，晚旧源不能恢复21；Source INSERT失败、其他点成功与空读不能清未知，旧candidate即使仍新鲜也不能投递，解除故障后原事件从journal恢复取消旧候选，无重拉provider。
- 源修复后原配置/预报三文件再次 **14/14**，`tmp/r20-notification-existing-owners-after-source-repair.log`；这些保原责任范围，不与11项/独立2项累加冒一次全仓检查。当前17份冻结源保持，无新服务/进程/数据库句柄或App源写入遗留。

17份backend/domain/合同/fixture现再次冻结，新SHA仍归 `tmp/r20-notification-evaluation-backend-freeze.json`。公开OpenAPI同步上述就绪/遗漏资格；已精确保原无关路径/schema格式与字节，不做全文件格式化。Root的App修复与新freeze另归Root/对应独审，作者已明确交接且不再写App源或正式测试。
