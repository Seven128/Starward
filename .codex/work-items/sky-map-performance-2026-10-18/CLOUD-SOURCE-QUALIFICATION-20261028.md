# 云量获取边界与源更正组资格

本记录归唯一 PLAN P2 的周期供给与源修订责任，不修改方案。现有 `batch-2026102700-qualified` 的 71 帧、9 份代表图、原件和旧开发指针均保留；目录名 `qualified` 只证明前批数值/来源参数准入，不证明供应商跨更正的共同模型作业身份。本轮不改 BFF/contracts schema、运行配置、DB、API、worker、手机或正式分发。

## 官方事实与实际边界

[ECMWF 2026-10-23 更正公告](https://forum.ecmwf.int/t/free-and-open-data-issue-ifs-22-october-2026-00-utc-forecast-steps-288-to-360/15493)明确记录：10-22 00 UTC 作业失败后从 288h 重跑，先发出的 294–324h 与后续 330h 起的消息可能来自不同实际运行；建议在公告给出的 13:00 UTC 修复时点后重取完整 288–360h。由此可见，同 run 和各消息 hash 不能证明一组帧来自同一次模型作业，不能只补一个看起来改变的文件。

[官方获取文档](https://confluence.ecmwf.int/spaces/DAC/pages/738041083/ECMWF%2Bopen%2Bdata%2Bgetting%2Bthe%2Bdata)给出 index 的 `_offset`/`_length` 和单字段 Range 路线；[官方客户端](https://github.com/ecmwf/ecmwf-opendata/blob/main/ecmwf/opendata/client.py)在本机安装的 0.3.35 版本逐 index/Range 获取。其 `maximum_retries=1` 实际交给 multiurl 后表示 **一次 attempt**，不是额外重试一次。

本机有界探测原件在 `E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/source-qualification-20261028/`：

- `preflight-2026102712.json`：22:43 UTC 对 12 UTC run 的 0/144/264h 做 HEAD+index，三者均 200、每份恰一条 sfc/tcc；仅元数据，未下载整批。所需集合为 0–144h 每 3h、150–264h 每 6h，共 69 帧。总耗时 12.42s，三个 index 合计约 32 KiB。实际单消息约 2.07–2.20 MB，不能把完整 surface 文件大小当 tcc 费用。
- `conditional-preflight.json`：故意错误 `If-Match` 在主入口得到 HEAD 200 / Range 206，说明该路径没有执行条件；官方 AWS 镜像对应两请求均为 412。探测没有消费 GRIB body。因此新开发候选显式选 `source=aws`，不在一批内自动换镜像或假设主入口已支持条件。
- 三份主入口对象均给出 21:34 UTC Last-Modified，没有共同模型作业或修订字段。该时间不是整体 ready 证明；两个稳定 HEAD 也不能产生原子批次身份。

## 已接入原获取 owner

`data-pipelines/cloud/prepare_ecmwf_tcc.py`仍用官方 Client 解释路径、level 文件、index 匹配及单字段 Range，并由 ecCodes 逐原生帧解码。新增边界在同一离线 owner：

- 实测错误条件必须返回 412；随后固定各对象的强 ETag。先固定 data 对象，再条件读取其 index，Range 使用原 data validator。核状态、Content-Range、实际长度、流式消费与原件摘要，保存实际 index 原文和 receipt。ETag 作为不透明对象身份，不解释成内容 SHA/MD5。
- 结束时重新确认本批引用的各对象；任一变更、412、错误 Range/身份都终止，不能更新 pin 或把晚来的新对象混入已有帧。查询参数不写 provenance，避免保存可能的签名凭据。
- session 统一最多 2 attempts，即额外 1 次 retry；官方 client 层仍为 1 attempt，避免叠加。仅对既有暂态 HTTP 状态或连接/读超时重试；拒绝身份、412、Range 和内容错误。失败诊断保存 method、去 query 的公共 URL、status/错误类型，不能把未知 HTTPError 猜成暂态。
- 限制逐请求连接/读超时、绝对获取/封数值截止和输出/传输字节。CLI watchdog 仅结束自己的离线进程，也覆盖 DNS/native I/O 的迟滞；`.part`及已收到原件保留，不能静默信任或删除。完成时核实际剩余 240h+reserve，迟到不能按旧 as-of 封口。
- 每次完成一帧后释放 values/mask，再进入下一原生帧；不新增全时域数值 cube。源码开始捕获、封口前再核，索引/receipt 不进入业务 API。已知更正用完整组及官方 cutoff 校验，未知更正组仍保持 UNKNOWN。

公开 numeric manifest schema 保持；额外传输 provenance 在原件 receipt/索引和 `candidate-qualification.json`，后者绑定实际 manifest SHA。它明确 `DEVELOPMENT_ONLY`、`formalReady=false`、`sourceGroup.state=UNKNOWN`。manifest 是最后数值 marker；它存在时不再次取数，应先核现有结果。此旁证不授予正式发布资格，未来 formal gate 必须另按原发布 owner 的完整合同实现。

## 检查及本次真实操作

本机隔离环境的原数值检查与新增获取边界共 **15/15** 通过。新增用例实际经过官方 Client 的 index/Range 入口，覆盖 header 大小写、条件被忽略时尚未读 GRIB body、错误/忽略 Range、短 body、对象变更、截止/磁盘拒绝、已知重跑完整组、恰一次暂态重试及签名 query 不落日志。没有重跑前批 71 帧或改数值精度。

Root 已批准一个 12 UTC 开发候选：69 帧、单帧处理、512 MiB 工作/传输上限、00:00 UTC 硬截止，无 current/ready/config 操作。输入意图、源码 SHA、输出、PID、日志与实际状态归：

`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/source-qualification-20261028/acquisition-2026102712-attempt2.json`

第一次数据尝试保留在 `batch-2026102712-development-candidate/`：0h 原件/receipt/数值成功，3h index 完成前遇到 HTTPError；没有最终 manifest，原 status 没有捕获，不能事后推断。复核该 3h 对象当前 HEAD 200 只表示当前可访问。第二次数据尝试沿 `batch-2026102712-development-candidate-attempt2/`：仅将已核 hash、且 data/index 再次 If-Match HEAD 200/etag 相同的 0h 原件、receipt 和 index 作硬链接复用；不复制旧数值或 processor。入口曾分别因 PowerShell 日期转型、非持久 Node launcher 在 Python 初始化前失败，均有原日志/无 request marker 的事实记录；修的是同一尝试入口，没有再建数据候选。

**本轮真实批次结果：FAILED。** 第二次实际进程 PID35668 已退出，0h 由该次保存的 `processor.py` 正常解码，3h 的数据 Range GET 在 23:12:59/23:13:01 UTC 两次 attempt 均为 HTTP503；没有最终 manifest、qualification marker、current 或 ready。`source-errors.jsonl` 保实际 method/公共 URL/status。此前一次 HEAD503 可由有限一次 retry 恢复，但数据 GET 用尽该界后正确终止，未无限重试、改镜像或启动第三数据批次。

`503-boundary-probe-3h.json`只做后续同对象 HEAD 与 1-byte 条件 Range：23:16 UTC 得到 AmazonS3 200/206、实际消费 1 byte。这不证明完整 tcc Range 已恢复，也没有取得之前的 503 XML，故不能把之前失败武断命名为 S3 SlowDown或某中间层故障。原错误状态和全部原件/失败目录保留。

## 时效及仍欠资格

新批未形成 69 帧完整数值，不能给出连续批次成功时效或完整资源峰值。第一批 171.70s 是取得时刻之后的处理用时，不是源发布延迟；本轮首次观察到代表对象可用也不是它们首次发布时刻。Last-Modified 不直接定义公共产品 TTL。两次晚时点的获取，且后者失败，不能锁定连续 00/12 发现、加工、图像/上传/正式 ready 的延迟规则。原 71 帧仅在其已声明的时间和资格范围继续保留，不延长有效期，也没有为了凑成功而退回主入口无条件读取。

[0.1° 官方说明](https://confluence.ecmwf.int/spaces/DAC/pages/738041087/ECMWF%2Bopen%2Bdata%2Bwhat%2Bs%2Bnew%2Bat%2B0.1%C2%B0)有单独 WIS2 文件通知；[WMO 通知合同](https://github.com/wmo-im/wis2-notification-message/blob/main/schemas/notificationMessageGeoJSON.yaml)的 data_id/pubtime/完整性字段描述文件，并未在本轮建立跨时次模型作业修订证明。[Aviso](https://aviso-server.ecmwf.int/)目前声明限已注册用户，且其实际可用 schema/权益、能否提供本任务需要的共同资格尚未验证。本轮没有开户、发信、采购、搭建 broker 或把这些候选能力当已取得事实。

因此正式源更正组权威、完整基础图/OSS读回/原子激活、整组回滚和连续周期实测仍欠；不能用本地 numeric manifest、每对象条件读或本记录关闭 P2。

实际数据进程已结束、源码已释放。结束后仅补 HTTP HEAD 响应退休和 URL userinfo 一并剔除这两个边界，最终同组 **15/15** 再通过；没有改写两个实际运行的源码快照或原件。当前共享获取边界仍由 Root 安排独立审阅，agent 自查和这些测试不代独审或正式资格。

## 独审发现的调用入口来源身份与窄修

后续独审发现：CLI 的官方镜像 choices 虽然受限，可调用的 `prepare(source_name=...)` 仍接受 SDK 支持的完整 URL；它会在创建 Client 前，把原值写入 `request.json`，成功时还会写入 manifest 的 `acquisitionMirror`。因此仅脱敏 HTTP receipt/错误日志不足以防止 URL 中的 userinfo 或签名 query 落入 provenance。当前真实 AWS 候选没有走这个 URL 分支，未发现本次真实原件中存在这类字段。

本次仅修该输入边界：`OFFICIAL_MIRRORS` 为原有 `ecmwf`、`aws`、`google`、`azure` 的唯一枚举 owner，CLI 与 `prepare()` 共用；`prepare()` 在读取加工快照、创建输出、写元数据或构造 Client 之前拒绝非字符串、未知名称及任何自定义 URL，错误码固定为 `cloud_source_mirror_invalid`，不回显输入。没有新增自定义 URL 或凭据输入能力，也没有改变正常镜像命名、HTTP/重试/Range、数值或公开 manifest 合同。

针对性回归实际调用 `prepare()`，仅 mock Client 构造以阻止任何真实获取。修复前，包含合成 userinfo/query 的输入越过边界，已有输出目录并到达 Client，反例失败；修复后，9 组非法值均为 0 输出、0 Client 构造、0 HTTP，四个已有官方镜像名仍到达原 Client 入口。原“忽略条件即拒绝”用例改为合法 `aws`，继续验证原 HTTP 边界而不依赖已禁止的 URL 来源输入。

当前来源获取模块 **9/9 通过**，包含上述两项新增回归及原 7 项边界检查；未重复数值生产、外网探测或原 71 帧。测试只使用受控临时文件，既有真实原件、失败目录、运行时源码快照与 `FAILED` / `sourceGroup UNKNOWN` / 无 formal ready 状态均未改变。代码与证据已释放，修后独立读回归 Root；本结果不关闭连续批次、源更正组权威或正式发布义务。

Root 已独立读回 `prepare()` 最先执行的官方镜像枚举 guard 与 CLI 共用 choices，并在原 cloud 隔离 venv 实际复跑该模块9/9通过。首次误用EOG venv缺requests属于harness未进入测试，已改用原环境，无安装依赖或外网获取。输入修复差异已闭环；原真实获取失败及完整源组/持续更新义务保持。

## 源组共同权威的有界核查（2026-10-28）

本次只核一个剩余问题：现有已取得的GRIB/index和公开通知机制，是否能给出超出逐对象完整性的共同模型作业/更正组资格。完整回读当前获取owner与内置`KNOWN_CORRECTIONS`/`qualify_corrections`；当前不存在独立`source_corrections.py`，没有另造更正规则或改PLAN。

### 已保存真实输入

用原cloud隔离环境的ecCodes **headers_only** 读取首批0/144/150/276h，以及失败12Z候选已保存0h，共5条真实消息；未获取新帧、读取数值数组或重加工。每份原件SHA与其已有manifest/receipt一致。共同字段为`generatingProcessIdentifier=161`、`experimentVersionNumber=0001`、`modelVersion=cy50r1`、`localDefinitionNumber=1`；00/12两个不同base time也共用这些值，故它们本身不是唯一一次作业身份。`modelVersionDate`在这5条均未定义。对0h的完整header key名再作revision/version/experiment/process/production等标量筛查，未发现另一个可直接绑定这组帧的修订字段；此观察限已存样本，不声称所有ECMWF产品永远不可能扩展字段。

失败12Z尝试已保存的0/3h两份index也已只读重开：字段集合为`domain,date,time,expver,class,type,stream,step,levtype,param,levelist,_offset,_length`；tcc条目`expver=0001`，没有共同作业或更正完成标识。[ECMWF文件命名说明](https://confluence.ecmwf.int/pages/viewpage.action?pageId=673333671)将operational experiment定义为1；[官方50R1编码说明](https://confluence.ecmwf.int/pages/viewpage.action?pageId=662506000)将`generatingProcessIdentifier`列作模型标识。由此只能支持模型/产品身份一致，不能把其相等升级为一次重跑组证明。

实际读回在`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/source-qualification-20261028/source-group-authority-readback-20261028.json`，SHA `c142b9e901d2fc4acf3646d9a656cbb67c4fe6575dee4cabd0c5e1f058eff327`。它是本次观察证据，不是qualification marker或ready输入；原数值manifest/receipt/processor及失败目录未改。

### 公开通知能证明的层级

- [WMO WIS2 notification schema](https://github.com/wmo-im/wis2-notification-message/blob/main/schemas/notificationMessageGeoJSON.yaml)的`id`保证通知消息唯一，`pubtime`对应文件发布时间，`data_id`由数据producer定义，`integrity`用于下载文件校验；`version`是协议schema版本（且已弃用而推荐`conformsTo`）。这些标准字段没有规定一组预测时次共享的模型重跑身份或整组最终完成承诺。schema允许producer补充语义，因此此结论不是否定某个尚未取得的ECMWF扩展。
- [现行Aviso客户端通知说明](https://sites.ecmwf.int/docs/aviso-client/main/concepts/notifications.html)明确sequence用于续听、可能重复/乱序，CloudEvent时间是发布时刻，identifier的实际字段由事件schema决定，payload由publisher提供。客户端示例`mars@N`和时间不能直接拿来当forecast revision。[ECMWF的Aviso介绍](https://www.ecmwf.int/en/newsletter/170/computing/aviso-ecmwfs-data-availability-notification-service)所述MARS/FDB通知按forecast step、产品交付通知按单product；未据此建立本任务0.1° tcc完整帧组的共同资格。
- 本次唯一新增公开metadata尝试是已公布API的`GET https://aviso-server.ecmwf.int/api/v1/schema/mars`：按Browser优先规则实际使用现有IAB runtime，结果为连接关闭，未取得schema，也不是401/403或账户权益判定。随后文档页导航被Browser的内部错误页URL策略拦截；未换浏览器/原始HTTP绕过，文档语义仅引用此前已取得的官方搜索内容。没有订阅、replay、创建账户、读取/提交凭据或外部联系。显式关闭该临时tab未获确认，turn默认清理是预期行为而非已核结果。

### 已知更正的准确适用范围与仍欠事实

重新读回[10-23官方公告](https://forum.ecmwf.int/t/free-and-open-data-issue-ifs-22-october-2026-00-utc-forecast-steps-288-to-360/15493)：该事件只适用于10-22 00 UTC的oper/wave，故障在324h、从288h重跑；原294–324h已发，330h起来自重跑。公告针对10-23 13:00 UTC前取得的数据要求重取288–360h，并明确其它forecast run不受该事件影响。该已知事件的完整组及cutoff可执行，不能据“其它run不受此事件影响”外推未来所有未公告更正均不存在，也不能用通知沉默或稳定两扫取代源组准入。

**结论仍为UNKNOWN。** 本轮未找到可用既有公开字段来闭合共同模型作业/更正完成权威，也未取得ECMWF实发Aviso/WIS2扩展的该项约束；这不证明供应商根本没有能力。下一项真正能改变判断的资料，是现有权益下实际事件schema/样例及其官方语义，明确某个组身份或完成声明如何绑定所需原生帧和对象修订；或由用户明确决定接受怎样的可声明一致性等级。后一种属于待决方向，不能在代码、Context或本记录中把UNKNOWN偷偷改为QUALIFIED。无须为此重跑原71帧、无限重试3h GET或先搭通知服务。

本轮没有生产/运行配置/DB/API/worker/Git/构建/手机、指针、上传和部署操作；没有重新做If-Match、Range或503探针。现有`DEVELOPMENT_ONLY`、`formalReady=false`、失败批次和持续供给义务均保持。

Root在代理结束后另作一次仅browser inventory核对：当前任务IAB标签页集合为空，已确认不再遗留该临时标签。此前“显式close未确认”仍是原动作真实结果，未改写为当时成功；本次没有重新导航/读取被拦页或关闭其它用户标签。

## 2026-10-29 数值开发发布的运行准入修复

恢复实施后发现原数值发布`ready.json`只有schema/publicationId/manifestSha256；它没有源组、完整显示或OSS资格。`MINIAPP_CLOUD_PUBLICATION_ROOT`却仅验绝对路径，TRIAL/COMMERCIAL的环境配置与直接API/outbox构造均可接受它，形成只迁移数值而新Map仍503的正式启用缺口。沿原PLAN P2“完整就绪后切换”窄修，不修改计划或降低源组要求。

`runtime-config.ts`新增单一`assertCloudPublicationRuntime`规则：当前数值root只允许LOCAL，绝对路径校验保持；环境加载、MiniappService直接构造（包括注入registry的root）和Outbox直接配置均调用。拒绝发生在repository、数据库/队列/worker初始化前。无root的TRIAL/COMMERCIAL仍走既有天气路径；LOCAL MEMORY_TEST及真实POSTGRES研发接线保留。没有新formal-ready schema、旁路开关或发布平台，也没有改旧manifest、ready/current或真实数据。

实施agent实际修前聚焦4项为3失败/1通过：环境未拒绝，API/outbox触及依赖哨兵；修后聚焦加原registry、Context、数值天气集成42/42通过。API typecheck首次仅在测试显式undefined触及exactOptionalPropertyTypes，改为条件属性后该3项重跑通过、最终typecheck通过。原工具输出在实施agent记录，未另存日志；不宣称有不存在的原始日志文件。

Root独立读回共享guard及三个实际入口、createFromEnvironment的资源创建顺序与回归断言。另在隔离进程用本机当前私有配置实读：LOCAL+POSTGRES且无cloud root仍可加载；加入绝对numeric root的LOCAL仍通过；TRIAL/COMMERCIAL均以固定`cloud_numeric_publication_requires_local`拒绝。此次核验0网络请求、0服务/worker启动，原私有配置SHA前后不变。没有重跑全套42项，也没有以测试fixture冒当前线上资格。

当前服务未重启/部署此修复，普通WEAPP未因纯BFF准入变更重建。当前源组UNKNOWN、formalReady false、正式新raster 503、全国显示规格/OSS/周期与容量仍未完；这项修复仅关闭“不合格数值路径可误启正式运行”的实现缺口。

## 2026-10-30：实发通知的补充判定与停止边界

本次只继续尚欠的供应商共同作业/更正组权威，不重跑已保存GRIB、原71帧、If-Match或503探针。复用原获取owner、已知更正规则和正式运行guard；没有新数据批次、源代码、配置、DB、服务、worker、指针或上传操作。

当前官方[Aviso快速入口](https://sites.ecmwf.int/docs/aviso-client/main/getting-started/quickstart.html)与[操作说明](https://sites.ecmwf.int/docs/aviso-client/main/cli/operations.html)仍明确：客户端示例schema不是实际服务器schema，须从有接收权限的服务读取事件类型和identifier/payload定义。Browser runtime本次可以初始化，但访问实际`https://aviso-server.ecmwf.int/`返回`ERR_CONNECTION_CLOSED`，未到认证或schema响应；不能据此判账户无权。该错误页的内部`data:`URL又令同tab的导航与显式close被Browser策略拒绝，本次未绕过；子代理结束默认清理尚需Root只读核对。

Browser失败后，经官方公开搜索发现加拿大气象部门的[WIS2通知查询集合](https://wis2-grep.weather.gc.ca/collections/wis2-notification-messages?f=html)。其公开HTTP元数据接口及[OpenAPI](https://wis2-grep.weather.gc.ca/openapi)可以读取。只读一个非定向`limit=1`入口确认结构后，按已公布的`metadata_id=urn:wmo:md:int-ecmwf:ifs:oper:forecast`作一次`limit=3`定向查询，HTTP200、6,433B、返回3条；未分页、订阅、replay或跟随GRIB下载链接。此次HTTP回执在本执行工具记录中，未另称已保存原始文件。

三条是2026-10-29 00UTC的**0.25°**实发原点通知，分别0/3/12h；通知id为`b9aa29b2-9f35-4438-9c84-a033d7b5209c`、`a7c45c66-3fe7-4946-adaf-5a7d5f460f36`、`a106f868-5f9a-4586-bcb7-8e9e6a71fb66`。其properties只有`datetime`、`pubtime`、逐文件`data_id`、共同数据集`metadata_id`、`cache`和`topic`；links给逐文件canonical/alternate URL及length，没有本样本可用的共同模型作业修订或整组完成声明。[该数据集的官方发现记录](https://wis2-gdc.weather.gc.ca/collections/wis2-discovery-metadata/items/urn%3Awmo%3Amd%3Aint-ecmwf%3Aifs%3Aoper%3Aforecast?f=html)也声明0.25°。这只能收窄“已有实发通知是否直接包含所需权威”的判断，**不能外推为本任务0.1°的通知合同**，更不能拿通知UUID或数据集id替代源组身份。

因此仍保持`sourceGroup UNKNOWN`、`formalReady false`和12Z有限批次`FAILED`；没有足够依据可实现新的资格提升规则。当前具体外部依赖是：取得实际0.1°通知/事件schema及供应商对共同作业或更正完成声明的语义，明确它如何绑定声明范围内全部原生帧及对象修订。仅恢复Aviso连接、获得账户或安装通知客户端都不自动满足这个条件。停止继续枚举公开字段、拉通知历史或重开数据批次；后续只有该权威资料到位，或用户明确改变可接受一致性等级，才重开本资格分支。全国显示规格、正式分发和其它独立实现仍可按原PLAN继续。

Root在本次agent终态后、打开自身设计参考前实读任务IAB列表为空，确认该代理临时标签已清理。随后Root自身两页设计参考也已显式关闭并读回空列表；未操作用户Chrome标签。
