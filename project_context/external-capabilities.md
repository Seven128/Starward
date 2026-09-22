# 小程序外部能力：采用方案与成本

当前状态：来源方案与下列产品取舍已获用户采用，正在基于当前工作区迁移。采用决定不代表各功能、设计资源、数据发布与生产验证已经完成。

本次迁移以**现有产品逻辑所需的外部数据／服务／能力满足商业使用条件，并完成必要的接入替换**为目标。产品展示、加工、缓存、分发及获权方式均须符合所用来源的适用条件；不能仅因接口可调用就认定商用合规。迁移不授权增加无关产品内容或偏离已采用的设计资源。后续扩展先查下方合规速查和对应官方条款，只在用途、版本、获取渠道或合同条件变化时重评受影响项。

**新增检查规则：产品逻辑涉及新增外部服务、能力或数据时，必须在采用与接入前检查商业化合规。** 检查拟用产品／版本是否允许本项目的商业用途，以及实际账号／获取权限、署名、修改、缓存、分发／相同方式共享和平台条件；将结论、主要限制与官方查询入口记入现有 owner。免费、开源、公开可下载或接口调通都不能单独证明已获商用许可。条件未明确时保留待核，不按已获权采用；已有来源扩大用途同样适用，不重复调查无变化部分。

**检查尺度：标准商业服务优先按公开条款直接适配和验证，不把逐项联系供应商设为接入审批。** 已明确的署名、缓存和分发要求由实现落实；账号权益、额度及价格由控制台、合同与实际接口核实。仅在用途明确超出许可、需要豁免，或有影响采用的实质歧义时联系供应商。将开发适配缺口与主体／平台的正式发布条件分开记录，后者不阻塞无依赖的本地开发；Context 保留主要条件和查询入口即可。

**合规迁移与功能开发分开：** 对当前实际使用的来源落实必要的许可、归因、缓存和分发适配；未启用的能力保留启用前条件，不因合规调研自动扩展为完整功能开发。微信提醒当前未启用实际发送：以后启用时核实主体／类目可用模板、用途与字段、用户订阅授权及平台发送规则。模板选择、原生授权弹窗和完整发送链的补开发，不作为本次既有外部能力合规迁移的完成前提；也不能因此声明提醒已经可用或获准发送。

2026-09-14用户确认采用本轮重新调研的最终方案，并要求基于当前工作区继续改造、保留仍适用的部分。适用范围是微信小程序及其必要后端；不改变独立原生App的功能与供应商选择。当前主体、实际发布状态由[发布档案](product-profile.md#current-release-profile)维护，选型采用不等于采购、公开发布或实现验收。

## 来源与决定的连续性

- [完整16轮调研对话](../docs/research/miniapp-external-capabilities-2026-09-14/conversation.md)保存前文比较、纠正、最终总结及读取边界；[原对话](https://chatgpt.com/c/6aa7c4c5-fe84-83ea-aba4-62f353f3e557)为来源。原始引用ID不是已经恢复的一手网页或附件。
- 结论符合前文最终取舍：路线从继续验证候选转为当前不接；低/中/高分层云由用户明确删除；Windy比较后回到和风。早期“路线值得保留”“分层云尚未同意删除”等建议不再控制当前小程序。
- 采用目标是满足商业使用条件下的综合性价比，不宣称全市场绝对最低价或广东天气准确率第一。不再以350元试用上限或0.25元/DAU/月心理预期裁剪小程序方案；明确排除五万元级年度地图套餐。
- 资料许可、数据取得通道、账号权益、实际运行覆盖和项目公开传播条件分别判断。已有明确公开许可的版本直接落实其义务，不重复要求定制合同；未核项目条件不能因采用报告而改成通过。
- 用户在本次会话最终更正：云观星允许拖动模式，同时保留手机方向跟随。具体视角、切换和恢复已进入[星空交互owner](areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md)及生产相机状态；原sensor-follow-only规则已退役，真机传感器、Canvas手势和渐进影像仍需目标设备证据。

## 采用的能力与边界

用户补充的产品规则：取消底图主题；流星雨复用后台上传、候选审核与发布，并研究获权文章链接提取到候选的低频导入；地区无覆盖以“地区暂无数据”禁用或占位；未来天气只展示实际数据小时，通过问号说明范围限制；最近1–2天天气用于说明已发生事件及对场地的可能影响，真实天气与推断分开。统一“暂无数据”和顶部竖向通知，普通通知可关闭且约3秒带动效退出；关键恢复入口持续可用。地图页面按实际屏幕适配并限制过大尺寸。星空允许手动拖动并保留手机方向跟随。本次验证覆盖受商业化适配影响的现有消费者及必要的成功、缺测和失败路径，重点确认实际来源、署名、缓存与分发义务落地；不以已有测试数量代替这些证据，也不扩展为全产品功能补开发或整套手机／UI验收。

| 能力 | 当前选择与原因 | 对应规则owner |
| --- | --- | --- |
| 地图、定位、选点、导航交接 | 微信默认原生地图与公开平台能力；自有正式点搜索；投稿和计划起点使用平台选点，不买独立全国POI/逆地理/路线接口。底图与自有UI主题分开 | [地图、搜索与计划](areas/main/screen-contracts/wechat-miniapp/map-and-finder.md#external-location-and-travel-capabilities) |
| 自动路线 | 当前不接道路距离、分交通方式时长、道路折线、道路范围筛选和自动倒推出发/到达；保留手动计划、交通偏好、停车/入口事实、直线距离与外部导航 | 同上 |
| 天气 | 和风唯一主预报，保留未来逐小时总云量及对应时间尺/地图；官方预警、AQ为各自独立类别。移除小程序分层云、多模型和免费非商业源回退 | [天气含义](areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#selected-weather-evidence)、[服务组合](architecture/runtime-and-domain.md#mini-program-external-capability-migration) |
| 地形 | 指定Copernicus GLO-30-F免费开放版；当前`terrain:glo30:greater-bay-area:2021:v2`由2021 Public AWS COG真实源离线派生并仅覆盖大湾区中心85km，运行时核验成品完整性；保留2–50公里地形查看与各图层独立缺测，不恢复逐方向地平线分析 | [地形owner](areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#地形以可获得数据为边界) |
| 光污染 | 许可覆盖的EOG年度VIIRS夜光；年度卫星夜光估算，不等于实时天空亮度、精确波特尔等级或实测SQM | [地形与夜光发布](architecture/runtime-and-domain.md#mini-program-terrain-and-directional-light-evidence) |
| 日月行星、晨昏、月相、几何窗口 | 复用Astronomy Engine和现有天文服务；算法计算不保证现场可见性 | [天文架构](architecture/runtime-and-domain.md) |
| 亮星 | HEASARC具体发布的BSC5P，实际迁移数据、历元/自行/单位及身份；不以函数改名代替受限文件替换 | [目录迁移](architecture/runtime-and-domain.md#mini-program-external-capability-migration) |
| 深空目录与影像 | 保留指定OpenNGC及CC BY-SA 4.0数据义务；当前`allwise-w3-messier.v20260501`已离线发布采用的51个星系/星云目标各3级IRSA AllWISE W3 12µm JPEG，运行时仅由同源BFF校验并返回本地资产 | [渐进影像](architecture/runtime-and-domain.md#cloud-sky-progressive-imagery) |
| 天象 | 现有日月食算法及NASA参考；GMN获权高层资料整理成常年流星雨活动参考，不冒充当年特殊爆发、精确极大或现场流量预测 | [事件owner](areas/main/screen-contracts/wechat-miniapp/map-and-finder.md#selected-event-data) |
| 场地和内容 | 管理方、现场核验、获权投稿与自有编辑；保存来源、日期、条件与证据，机器内容审核不证明场地事实 | [产品界面](areas/main/product-surfaces/wechat-miniapp.md) |
| 账号、计划、上传、审核、分享、提醒、设备 | 微信平台与现有后端；私有数据隔离，失败不丢用户输入。提醒意愿、订阅授权、发送和送达分别建模 | [计划与提醒](areas/main/screen-contracts/wechat-miniapp/map-and-finder.md) |

天气最多240小时的公开能力不保证当前账号和旧适配已取得相同范围；第11–15天仍可使用天文和计划，天气按实际覆盖缺失。过去保存的预报、地区历史再分析、现场实测分开。地图云量必须来自真实查询点或网格，不能把少量点伪装成全国连续高清云场。主地图保留地形开关与LIGHT/TOTAL_CLOUD选择，点位地形图保留地形/光污染两个独立开关，不因报告简写取消现有地形入口。

现有地点身份、正式点发布、草稿/提案隔离、安全动作检查、计划版本、来源披露和数据失败恢复继续适用。支付、短信、原生推送、AI、雷达、卫星云动画、科研级视宁度、空间站/彗星动态轨道、相机AR和全天无限高清不是本次新增采购或实现范围。

## 已研究但不采用

- 高德五万元级标准商业许可违反明确约束；腾讯独立服务的商业许可与请求包须分开，不能仅凭调用单价推定总价。排除五万元级套餐，不反复以未知优惠恢复同一候选。
- 圆周旅迹调查证实网页高德底图、小程序腾讯底图以及网页自有后端返回四种交通方式；未证实后端上游和可复制的合同。一个请求返回四组数据不等于上游只收费一次，路线末点到地点的补线不证明驾车直达。
- 苹果地图的配套展示/留存和小程序承载、GraphHopper等独立路线服务的广东覆盖/公交/交通与合同、天地图节点规则均未形成满足本项目的完整结论，保留研究理由而不加入当前采购。
- OSM是道路数据，OSRM是路线软件；区域自建不是全国搜索/底图/公交/实时路况平台。此前新增100–300元/月、驾车5–10人日、增加步行骑行累计8–15人日是未实测工程估计，不是报价；当前不建设，不把两万元/年当自建最低成本。
- Windy地点接口与消费会员不同；前轮官方比较为固定三小时间隔、无ECMWF且无独立总云量参数，商业缓存/收费方式限制更多。990欧元/年也不替代原预警和AQ费用，不纳入当前主源或第二套长期采购。
- Open-Meteo付费单源、WeatherKit、彩云保留为历史比较，不在和风失败时暗中启用。删除分层云后不再为补该字段重新采购。

## 成本基准

下列为采用报告的固定规划算例，非供应商包价、实际账单、容量证明或开支授权。按自然月实际请求重算，年付仅表示折后月均消耗，不表示每月现金支付。

| 用量 | 统一假设 |
| --- | --- |
| 天气查询位置/用户/月 | 100个独立位置（包括云量采样和允许的私人位置），500 DAU，30天；非数据库最多100点 |
| 刷新 | 天气30分钟；预警5分钟；当前AQ每小时；AQ预报每天4次；历史等每点每月100次 |
| 文件 | 已发布资产、版本及备份100GB；每DAU每天新下载5MB；CDN命中90% |
| 机器审核 | 每月1000张图片×4场景，3000文本计费单元×2场景；人工另计 |
| 云主机 | 一台生产4核8GB、一台隔离测试2核4GB；生产应用/数据库/缓存/任务受控共存，非高可用集群 |

每点1440＋8640＋720＋120＋100＝11020次/月；100点为1102000次。和风同计费组前50000免费，随后950000×0.0007＋102000×0.0005＝716元；一年节省计划0.7系数为501.20元。预警占约78.4%请求；按区域/实际访问共享只能在语义、覆盖和时效成立时减少请求，不能延误预警，也不强制照算例全天轮询所有点。

| 项目 | 按量/月付（元/月） | 一年期折后月均（元/月） |
| --- | ---: | ---: |
| 天气、预警、AQ与零散请求 | 716.00 | 501.20 |
| 生产主机 | 230.00 | 195.50 |
| 隔离测试主机 | 65.00 | 55.25 |
| 文件存储、分发、回源 | 28.675 | 28.675 |
| 机器审核 | 19.20 | 19.20 |
| 小额请求和日志工程预留 | 20.00 | 20.00 |
| **合计** | **1078.875，约1080** | **819.825，约820** |

文件算例为100GB×0.118＋75GB×0.21＋7.5GB×0.15；审核为1000×4/1000×1.5＋3000×2/1000×2.2。服务器年付85折；天气承诺余额可能到期失效，用量未稳定先按量。现有合适云资源继续复用并用真实续费替换参照，不默认采购两台新机器。

相同刷新口径20/100/500独立点的标准天气费为119.28/716/2843.50元，七折83.496/501.20/1990.45元。相同文件假设500/2000/5000/10000 DAU约29/79/181/349元；不能据此保证主机和审核量无需增长。额外实时天气100点每30分钟查询增加144000次，在100点基准阶梯七折下约50.40元/月。

内测采用同一获权来源、明确隔离的固定测试数据和少量真实查询；4/5/10持续测试点在30天算例下天气为0/3.57/42.14元。新增费用可接近零不等于全部验证零成本，也不等于“内测”豁免商业许可。

不含首次数据获取/加工和迁移、开发、人工审核和实地核验、实际主体/域名/平台认证、必要但未报价的地图/专业服务、道路和个性化底图、支付短信、额外高可用与超出用量的资源。**EOG开放数据许可不等于免费程序化下载：当前注册页将2026-06-01后OpenID程序访问限定于付费订阅者；合法人工获取、已有获权文件和更新通道及其实际费用仍须落实，不填零。** 完整经营成本还需把这些项目按实际报价和工作量加入。

## 具体许可与公开运营条件

### 商业化合规速查

此表记录当前选用范围的主要义务及核查入口，不代替具体版本的许可、合同和平台权限。原始通知、准确署名、数据版本与加工记录留在资产 manifest／NOTICE 和对应实现 owner；产品通过现有来源披露责任满足必要归因，不把研究资料全部塞进页面。

天体资料采用简短署名＋独立小程序“来源与许可”页，完整声明、原始出处和适用的派生数据下载在该页可达，具体职责见[来源披露 owner](areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md)。这是用户为当前个人主体选择的展示方式，不是删除归因或把必须随数据展示的声明统一移出内容页；也不代表网页直跳已获平台支持。

| 外部能力／来源 | 产品需要遵守的主要条件 | 查询入口 |
| --- | --- | --- |
| 微信地图、定位、选点、导航 | 当前仅用已采用的平台能力；保留原生地图标识，落实实际 AppID 的位置隐私／权限和适用地理内容责任。不能由平台接口可调用推导独立地图 API 商用授权 | [地图与旅行 owner](areas/main/screen-contracts/wechat-miniapp/map-and-finder.md#external-location-and-travel-capabilities)、[微信地图文档](https://developers.weixin.qq.com/miniprogram/dev/component/map.html)及实际平台后台 |
| 和风预报、预警、AQ、近期天气 | 使用当前账号获权的服务；清晰署名和风并提供官方入口，保留各源要求的额外归因、原发布信息和真实时间／单位。当前 v1 的 `metadata.attributions` 明确要求与当前数据共同显示；不能只在后端保存或只保留供应商名称。旧接口 `refer.sources` 按其归因规范保留。不得用 GeoAPI 批量建地点索引或暗退非商用源 | [v1 元数据要求](https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/)、[归因规范](https://dev.qweather.com/docs/terms/attribution/)、[使用限制](https://dev.qweather.com/docs/terms/restriction/)、[许可协议入口](https://dev.qweather.com/docs/terms/tos/) |
| Copernicus GLO-30-F 地形 | 使用指定免费开放版；保留规定版权／来源通知，派生图标明使用 Copernicus WorldDEM-30 加工，保留修改说明。不得把许可扩大到其他 DEM 产品 | [COP-DEM 许可入口](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)、[发布器及准确声明](../data-pipelines/terrain/publish_copernicus_dem.py) |
| EOG 年度 VNL 夜光 | 指定许可覆盖数据按 CC BY 4.0 署名、标注修改；发布器按实际产品名保存 EXHIBIT 1 完整派生通知，小幅地图使用其允许的简短署名，大幅图须遵循标识要求，报告／出版物引用 EXHIBIT 2 对应论文。数据可商用与下载渠道获权分开；使用其 OpenID 程序下载通道时须满足现行订阅要求。年度夜光不冒充现场测量 | [数据许可及署名附件](https://eogdata.mines.edu/files/EOG_products_CC_License.pdf)、[获取规则](https://eogdata.mines.edu/products/register/)、[发布及通知 owner](../data-pipelines/dark-sky/README.md) |
| BSC5P／SAO 星表 | 使用已核具体发布版本与元数据，保留来源、作者和派生说明；不把 HEASARC／NASA 的一般政策扩大到第三方受限数据，不重新带回 HIP／Tycho 非商业数值 | [BSC5P manifest](../packages/astronomy-core/data/bsc5p-bright-stars.v2.manifest.json)、[SAO manifest](../workers/miniapp-api/assets/sao/catalog.manifest.json)、[HEASARC 数据政策](https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html) |
| OpenNGC 深空目录 | CC BY-SA 4.0：保留 Mattia Verga 及 contributors 署名、许可链接、Starward 筛选及字段／单位加工说明；分发改编数据时遵守相同方式共享。此目录许可不替代影像许可 | [指定版本与许可](../packages/astronomy-core/data/opengc-messier-deep-sky.v1.manifest.json) |
| 星座定义、插画、713 个锚点几何 | 分别遵守定义 CC BY-SA 4.0、插画 FAL 1.3、含 SIMBAD 身份关系的独立派生几何 ODbL、Acrux 身份资料 CC BY 4.0。保留分项署名／通知与所需可读数据下载，不把所有资产合并声明为同一许可证 | [分项 NOTICE 与官方链接](../workers/miniapp-api/assets/constellations/NOTICE.txt)、[几何发布 owner](architecture/runtime-and-domain.md#cloud-sky-progressive-imagery) |
| IRSA AllWISE W3 影像 | 原影像保留 WISE＋NEOWISE 联合声明、IPAC/NASA 与 Atlas 引用；实际 CDS/Aladin HiPS 数据库另有 ODbL、CNRS/Unistra 和独立 DOI。影像集合保留归因、加工说明及机器可读数据／修改下载；OpenNGC 位置字段仍单独 CC BY-SA，不把数据库许可泛化到所有图片或产品代码 | [实际 manifest](../workers/miniapp-api/assets/deep-sky/manifest.json)、[AllWISE 声明](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html)、[CDS W3 许可记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record)、[加工及分发入口](../data-pipelines/deep-sky/README.md#commercial-use-notices-and-distribution) |
| Astronomy Engine 与 GMN 流星资料 | 算法代码保留 MIT 通知；GMN 指定高层资料按 CC BY 4.0 归因并说明派生。常年参考的授权不包含任意文章／照片或未经核验的年度预报 | [Astronomy Engine LICENSE](https://github.com/cosinekitty/astronomy/blob/master/LICENSE)、[GMN 来源及加工边界](../data-pipelines/meteor-catalog/README.md) |
| 软件／算法依赖（含 Astronomy Engine、TWGL、Quaternion 等） | 按实际锁定版本的代码许可证落实商用、修改与分发条件，保留要求的 LICENSE 原文及版权／许可通知；数据来源卡不能替代代码许可交付。Mini 的 TWGL／Quaternion 完整通知由构建复制到 `sky/assets/licenses/`；noble-hashes 和已核 React（含 reconciler／scheduler）、Babel runtime、TanStack Query／Zustand／Taro 运行时完整通知复制到主包 `assets/licenses/`。按 Mini workspace 的实际依赖解析版本维护，不能拿根目录另一版本代替；升级时同步原文。此记录不宣称已审完全部间接依赖 | 各 workspace 的 package.json／锁文件、所安装包 LICENSE、[Mini 许可资产](../apps/wechat-miniapp/src/assets/licenses/)与[构建 owner](../apps/wechat-miniapp/config/index.ts) |
| 文章读取的可选 Cloudflare 公共 DNS | 仅后端显式启用 `CLOUDFLARE_DOH` 时解析文章主机名，适用公共解析器及在线服务条款，禁止滥用或绕过限制；无 SLA，不能据此承诺稳定连通。解析方可见查询域名及服务器来源 IP，当前请求不含文章路径／正文、用户位置或凭据；遵循其隐私条款。此服务不授予文章转载权，若扩为客户端解析、网络设备或 ISP 集成须重新核对隐私和专门署名条件 | [服务条款入口](https://developers.cloudflare.com/1.1.1.1/terms-of-use/)、[在线服务条款](https://www.cloudflare.com/website-terms/)、[公共解析隐私](https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/)、[SLA 边界](https://developers.cloudflare.com/1.1.1.1/infrastructure/sla-and-support/)、[文章解析 owner](architecture/runtime-and-domain.md) |
| 文章、照片、投稿及微信账号／审核／订阅消息 | 内容复用须有相应用途授权，导入不等于获权或发布；平台服务按实际主体、类目、隐私、接口及模板授权使用。不能由内容审核成功推定版权或场地事实成立 | [内容与平台产品 owner](areas/main/product-surfaces/wechat-miniapp.md)、[发布档案](product-profile.md#current-release-profile)、实际微信后台及对应内容授权记录 |

和风声明原文由 `SourceSummary.attribution` 经共享 `SourceAttribution` 接入当前数据展示，预警同时保留原发布机构；具体共享责任见[来源披露 owner](areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md)。归因规范要求名称附官方超链接，当前小程序只实现明确标注的复制链接，仍有平台适配缺口。优先按标准要求实现，并核实实际小程序主体与业务域名是否支持；只有需要保留替代方式且公开规则不能明确覆盖时，才联系供应商确认或申请例外。复制测试通过不能证明超链接义务已满足。

用户确认：优先做点击打开官网；当前平台不能实现时，先在 Context 保留待办，不将这一项作为其余迁移工作的阻塞。当前登记为个人主体；[Taro WebView 文档](https://docs.taro.zone/docs/components/open/web-view)说明个人类型小程序不支持该网页容器，普通外部网页还需配置业务域名。当前不加入不能实际使用的网页路由，暂保留明确标注的复制入口。后续主体／网页能力和官网业务域名条件具备时，由共享 `SourceAttribution` 接入官网跳转并验证实际打开；此前仍不得宣称已满足超链接义务。这是延期处理决定，不是供应商豁免，也不要求现在联系供应商。

和风[缓存限制](https://dev.qweather.com/docs/best-practices/cache/#限制)对 GeoAPI 另有约束，不可用天气缓存许可推导地区资料存储权。近期天气仅实时解析地区，不保留 Geo 结果或含地区资料的完成响应缓存；独立天气日值可按既有天气缓存策略复用，HTTP 与客户端离线存储采用 no-store，隐藏／退出时释放地区展示状态。既有地区缓存不构成获权依据。Geo 查询随实际进入／恢复次数产生，成本核算不能继续假定七天地区缓存命中；不因此改变已采用的天气来源或自动采购。

真实和风账号权益、EOG 合法资产与获取方式、微信模板／平台权限，以及地图与中国天气传播的项目级适用条件，分别以实际核定为准；相关未决项不能由本表或适配器存在自动关闭。新增产品逻辑若超出表中用途，应先补相应条件和来源入口，再接入实现；不要求重做无变化的全部研究。

已采用资料按实际产品/版本保存获取来源、许可通知、归因、修改说明和发布清单：GLO-30-F、许可覆盖的EOG年度VNL、HEASARC BSC5P、OpenNGC（实际许可路径`LICENSES/CC-BY-SA-4.0.txt`）、Astronomy Engine MIT、指定IRSA WISE公开影像、GMN CC BY 4.0高层资料。不将某个镜像条款泛化为全部Gaia/Hipparcos，也不将NASA网页统一视为无限素材许可。

云观星星座原插画／连线继续采用 Stellarium v24.4 Modern 的 FAL 1.3／CC BY-SA 4.0。几何 v2 改用 BSC5P／SAO 的 FK5 J2000 坐标和自行；HIP 仅为定义编号，不再导入 ESA 数值。身份关系采用 [SIMBAD 明示 ODbL](https://simbad.cds.unistra.fr/simbad/) 的同对象／系统成员编号；Acrux 使用 [IAU-WGSN／All Skies Encyclopaedia 明确编号](https://ase.exopla.net/index.php/Acrux)，保留作者和 CC BY 4.0。18 个系统用明确成员的等权球面几何代表点绘图，不宣称实测光心，不用于恒星合并／命名／拾取。派生几何单独按 ODbL 提供机器可读下载和归因，定义／插画许可不变。详[几何与发布 owner](architecture/runtime-and-domain.md#cloud-sky-progressive-imagery)。旧 HIP/Tycho CC BY-NC 数值仍非商用输入；镜像泛化条款不能覆盖上游。

SAO J2000作为补充暗星的接入候选：其[NASA具体目录元数据](https://data.nasa.gov/dataset/smithsonian-astrophysical-observatory-star-catalog)标记government-works，[HEASARC目录说明](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/sao.html)记录SAO/ADC/USNO来源，所用修订早于Hipparcos/Tycho发布；当前核查未发现上述NC冲突。此依据支持继续接入验证，不把CDS未写license本身当作授权，也不覆盖HIP星座坐标。SAO历史视觉星等与较老天体测量须保留局限，不能宣称统一Johnson V或完整至10等；原BSC保留，SAO已按空间分片接入服务与客户端；设备性能按实际证据范围记录。重评条件为具体来源条款冲突、所需精度/覆盖不足或目标运行时预算不合适。

报告保留两组项目级公开运营核定：实际AppID原生地图/选点/叠加组合与新增地理内容的坐标、标识及适用内容责任；中国小时预报/预警原发布单位、发布时间、云量图层传播及适用备案。这些不由数据开放许可、国内供应商身份或预算替代。常规主体、平台位置隐私、内容授权、订阅模板按各自发布owner落实；未完成的能力不声明已获准商业发布，额外必要合同取得实际报价再计入。

可直接核查的官方入口：[和风小时字段与范围](https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/)、[按量计价](https://dev.qweather.com/docs/finance/pricing/)、[EOG访问规则](https://eogdata.mines.edu/products/register/)、[BSC5P发布说明](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html)。本轮已重新读取前三项；其他许可采用原研究的具体结论，实际文件迁移仍需绑定对应原始通知，不能把研究引用ID写成已经归档的许可证。

## 实施连续性

基于当前main和未提交工作定向迁移，保留通用缓存/并发合并/超时取消、调用计量、缺测与时间窗、迁移及真机反馈工具的有效修复。先追踪实际加载/发布/消费路径，再替换供应商专属部分；不全量回退、不因某函数命名就宣称迁移完成，也不把文档更新视为生产完成。

实现组合、数据迁移与仍在运行的旧路径由[架构owner](architecture/runtime-and-domain.md#mini-program-external-capability-migration)记录，页面功能由上表owner维护。真实账号权益、部署来源、数据库持久状态、手机交互、地图配准和消息结果须各自取得证据；任务进度及检查日志保留在已有`output/provider-selection-and-repair/`，不放进本Context。
