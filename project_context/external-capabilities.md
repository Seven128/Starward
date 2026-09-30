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
| 云观星引擎 | 2026-09-22用户采用扩展现有原生Canvas/WebGL＋TWGL＋Astronomy Engine方案，对齐Stellarium Web能力；保留自主修改和自有业务代码的许可边界 | [选型理由与重评条件](#云观星引擎选型)、[能力目标](areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#云观星对齐-stellarium-web) |
| 亮星 | HEASARC具体发布的BSC5P，实际迁移数据、历元/自行/单位及身份；不以函数改名代替受限文件替换 | [目录迁移](architecture/runtime-and-domain.md#mini-program-external-capability-migration) |
| 深空目录与影像 | 保留指定OpenNGC及CC BY-SA 4.0数据义务；`allwise-w3-messier.v20260501`的51个目标各3级IRSA W3切图、CDS W3第0阶12张广角JPEG和IPAC Cool Cosmos 2MASS历史J/H/K银河全景分别按来源条件发布，同源BFF校验本地资产。W3广角默认关闭；2MASS仅夜间广角普通模式。均非现场可见光或光学全天高清 | [渐进影像](architecture/runtime-and-domain.md#cloud-sky-progressive-imagery)、[发布与权利](../data-pipelines/deep-sky/README.md#historical-2mass-galactic-panorama) |
| 天象 | 现有日月食算法及NASA参考；GMN获权高层资料整理成常年流星雨活动参考，不冒充当年特殊爆发、精确极大或现场流量预测 | [事件owner](areas/main/screen-contracts/wechat-miniapp/map-and-finder.md#selected-event-data) |
| 场地和内容 | 管理方、现场核验、获权投稿与自有编辑；保存来源、日期、条件与证据，机器内容审核不证明场地事实 | [产品界面](areas/main/product-surfaces/wechat-miniapp.md) |
| 账号、计划、上传、审核、分享、提醒、设备 | 微信平台与现有后端；私有数据隔离，失败不丢用户输入。提醒意愿、订阅授权、发送和送达分别建模 | [计划与提醒](areas/main/screen-contracts/wechat-miniapp/map-and-finder.md) |

天气最多240小时的公开能力不保证当前账号和旧适配已取得相同范围；第11–15天仍可使用天文和计划，天气按实际覆盖缺失。过去保存的预报、地区历史再分析、现场实测分开。地图云量必须来自真实查询点或网格，不能把少量点伪装成全国连续高清云场。主地图保留地形开关与LIGHT/TOTAL_CLOUD选择，点位地形图保留地形/光污染两个独立开关，不因报告简写取消现有地形入口。

现有地点身份、正式点发布、草稿/提案隔离、安全动作检查、计划版本、来源披露和数据失败恢复继续适用。支付、短信、原生推送、产品内AI、雷达、卫星云动画、科研级视宁度、相机AR和全天无限高清不因云观星引擎选型而新增。2026-09-14合规迁移中对空间站/彗星动态轨道的排除不再作为后续云观星能力对齐的上限；新目标见[云观星对齐Stellarium Web](areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#云观星对齐-stellarium-web)，具体数据覆盖、权益和验证仍须落实。

## 云观星引擎选型

2026-09-22用户明确采用**扩展现有引擎**，以Agent主导开发，使云观星能力对齐Stellarium Web。沿用原生WEAPP Canvas/WebGL、TWGL、Astronomy Engine及当前天文/数据服务，复用现有姿态校准、地点时间、绘制和点选责任；不接入网页容器或不可自主修改的成品页面/黑盒SDK。能力范围由[星空产品owner](areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#云观星对齐-stellarium-web)控制，实现边界见[天文与渲染架构](architecture/runtime-and-domain.md#cloud-sky-progressive-imagery)。本次采用是技术路线决定，不是功能、数据、设计资源或真机验收已完成。

选择理由：当前已有可复用的小程序原生渲染与交互基础；现有MIT基础库无需购买商业引擎许可，也不要求开放我们的业务源码。接受更多Agent开发和维护投入，以保持功能改造及代码许可的自主性。这个选择不是认定所有第三方引擎不可用，也不是已证明自建完整成本最低；符合责任边界、目标运行时和商业条件的成熟库/算法仍可按需要复用。

| 未采用的路线 | 决定性原因与保留边界 |
| --- | --- |
| H5/WebView、嵌入官方站点或成品页面 | 用户明确排除网页嵌入，要求在自己的项目中自主改造功能；不以网页方案替代原生交付 |
| Stellarium Web Engine商业授权移植 | [源码提供商业许可选项](https://github.com/Stellarium/stellarium-web-engine/blob/29870744c470ddc62fa869e153178c82a7824fa4/src/js/pre.js)，但没有已取得的报价或覆盖源码修改/分发、完整数据及服务的合同；还要承担未经真机验证的WASM、浏览器胶水和网络适配。暂不采购；不能把“价格未知”写成“价格已证实很高” |
| Stellarium Web Engine AGPL移植 | 可按AGPL商用且免引擎购买费，但不会消除原生适配工作；对应源码义务可能覆盖云观星乃至组合的小程序前端。用户把核心代码开放视为独立商业成本，本次不选择以此换免许可费。[AGPL](https://github.com/Stellarium/stellarium-web-engine/blob/29870744c470ddc62fa869e153178c82a7824fa4/LICENSE-AGPL-3.0.txt)不等于自动要求所有独立后端开源，也不能凭分包承诺只公开几个引擎文件 |
| WorldWide Telescope整套替换 | [引擎MIT许可](https://github.com/WorldWideTelescope/wwt-webgl-engine/blob/4478bb6b56ead48bbc05f5d954d38d45f5462ae2/LICENSE)有利于闭源，但浏览器适配、完整观星表现和独立资源运行仍有差距/待验证项；没有证据表明完整替换比扩展现有方案更省投入，数据权益仍独立核查 |
| Aladin Lite整套替换 | 更适合作为HiPS巡天子能力，未证明能替代完整观星引擎；Rust/WASM/WebGL2适配和双渲染职责也有成本。本次调研版本为[LGPL-3.0-or-later](https://github.com/cds-astro/aladin-lite/blob/60c5cf414d6d56a10b406761e62e8c2ce9f2a760/LICENSE)，不是笼统的GPL或MIT结论；实际采用时仍核对选定版本。必要子能力可另评，当前不引入 |

**数据边界：** 自有引擎不自动取得任何第三方星表、巡天、纹理或接口权益。Stellarium前端的搜索/资料服务与引擎源码分开，官网公开URL不作为已获权的商用后端。新增深星表、光学巡天及动态轨道的字段、覆盖、时效、加工、分发权逐项落实；[MAST现行数据政策](https://archive.stsci.edu/publishing/data-use)要求DSS等版权数据的营利商业用途取得书面许可，CDS镜像或数据库许可不能自动替代原始影像权益。当前已有来源及各自归因继续保留，新数据尚未因本次选型而采用或采购。

**无需新商业授权的收敛原则（2026-09-23用户决定）：** 不为云观星新增来源申请逐项商业许可；采用明确允许当前商用及实际获取、加工、自托管、展示／分发方式的公开或已有许可，并落实署名、通知、数据库／派生数据义务及服务端使用限制。开放许可本身是授权，无需逐项申请；“可下载”“API免费”“只分发计算结果”均不单独证明产品用途获权。按当前证据排除需书面许可的 DSS、ESA 当前 NC 条款的 Gaia EDR3／DR3 档案输入及商业图像条件未澄清的 ESA 全天银河图；不把这些来源限制扩大为删除全部深星或银河效果。现有 CelesTrak 用量政策未明确授予本产品轨道／派生位置的商业分发权，实时卫星位置、轨迹和过境功能不列入当前商业交付，除非找到无需逐项申请且权利明确的来源；彗星／小行星动态轨道同样待合格来源。SkyMapper／PS1 光学 HiPS 可继续核查替代资格，但原始权利、CDS 瓦片自托管／分发条件及生产获取尚未全部闭合，不宣称已采用全空域影像。已核明的现有星表、星座、红外影像和 MIT 天文／渲染依赖继续按各自实际许可使用。此决定只收缩受影响的数据能力，不改变已选原生引擎路线；如来源条款或可用替代改变，按具体能力重评。

**通用模拟地景的有限输入（2026-09-28）：** [Stellarium欧洲地景目录](https://stellarium.org/landscapes-europe.html)中的Stara Lesna Meadows / Lubomir Hambalek及其[原始下载包](https://github.com/Stellarium/stellarium-data/releases/download/landscapes/stara_lesna.zip)为现有正常原生路径提供历史草地/山林全景。包内README标注[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，来源目录标注[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)；两个声明都保留，Starward图片派生物按后者提供，明确作者、来源、缩小/alpha编码和显示曝光处理，保留固定原包、加工图及许可入口。派生图像条款与独立自有渲染代码分开。固定输入及尺寸/哈希/虚拟映射由`packages/miniapp-contracts/src/sky-landscape-publication.ts`和`workers/miniapp-api/assets/landscape/manifest.json`持有，不复制Stellarium引擎代码。图片接缝仅赋予虚拟ENU方位，不声称测得真北，不导入其斯洛伐克observer到所选观星点；历史固定照明不代表当地地貌、天气或实测遮挡。当前已接入开发路径，正式最终外观/共同驻留预算/目标质量仍待验证，不能将照片采用或来源披露认证为完整环境完成。Uvalno另一旧格式输入因实际拉伸且所需雾层缺失而淘汰；输入变化、扩大资源/发布方式或原声明变化时重核来源、权利及真实映射，详细原包/拒绝证据保任务记录。既有DSS/Gaia/ESA、动态天体和光学候选排除不变。

**Wikidata 中文恒星检索别名（2026-09-23）：** [Wikidata 结构化数据许可](https://www.wikidata.org/wiki/Wikidata:Licensing)为 CC0 1.0，适合把本次所取标签作为商用离线检索别名；[P528 目录代码](https://www.wikidata.org/wiki/Property:P528)带 [P972 目录限定符](https://www.wikidata.org/wiki/Property:P972)且目录为 Bright Star Catalogue 时才按 HR 与现行 BSC5P 精确关联。固定查询快照、哈希和获取时刻随服务端出版物保存；3,149 个无歧义 HR 有中文标签，两个 HR 的多个 Wikidata 对象关联被剔除。一个标签可能属于不同恒星，搜索保留独立身份。社区标签不是 IAU 正式中文名、已审中文介绍或额外天体测量；现有五条编辑名不被覆盖。运行时不调用 Wikidata，上游改变、基表改变或要扩大覆盖时重新核对查询、身份、许可和出版物。

**Gaia 银河与深星候选边界（2026-09-23）：** ESA Gaia EDR3/DR3 的官方数据集 DOI 页分别列明档案数据为 [CC BY-NC 3.0 IGO](https://esdcdoi.esac.esa.int/doi/html/data/astronomy/gaia/EDR3.html) 与 [同一 NC 条款](https://esdcdoi.esac.esa.int/doi/html/data/astronomy/gaia/DR3.html)，不能仅凭开放下载作为本商业小程序的自托管深星/银河生产输入。ESA 的 [EDR3 全天色彩图](https://www.esa.int/ESA_Multimedia/Images/2020/12/The_colour_of_the_sky_from_Gaia_s_Early_Data_Release_32)虽有可配准的等距柱状版本并单页列 CC BY-SA 3.0 IGO 或 ESA Standard Licence，[ESA 图像通用条款](https://www.esa.int/ESA_Multimedia/Terms_and_conditions_of_use_of_images_and_videos_available_on_the_esa_website)同时称商业用途须另获书面许可；未解决具体图像的适用关系前不纳入生产资产。2025 Gaia 银河俯/侧视图是外部视角艺术印象，不是可贴到观察者天空的全空域图。继续核实其他合法光学/银河成品，不将这些限制解释为取消 C02/C04/C06。

**SkyMapper DR4／PS1 光学候选边界（2026-09-23）：** [DR4 发行文档](https://skymapper.anu.edu.au/data-release/)提供带 TPV WCS 的逐次观测图和超过 26,000 平方度的统计覆盖；DOI 元数据列 CC BY 4.0。[SkyMapper 原站公开 SIAP](https://skymapper.anu.edu.au/how-to-access/)只给单边小于 10 角分的切片，完整 CCD/批量需联系；该**特定服务**不直接承担产品逐视角全天瓦片流；[官方 cutout 页](https://skymapper.anu.edu.au/image-cutout/)明确禁止系统性抓取大片天空，完整 CCD/批量需另找正式取得路径，不能用 DOI CC BY 代替源站使用权限。然而 CDS 已发布现成的[SkyMapper DR4 i/r/g 彩色 HiPS](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSkymapper%2FDR4%2Fcolor&fmt=html&get=record)（512px PNG、order10）及[PS1 DR1 i/r/g 彩色 HiPS](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FPanSTARRS%2FDR1%2Fcolor-i-r-g&fmt=html&get=record)（512px JPEG、order11）。实际两套 FITS MOC 在共同 order11 的并集覆盖约 99.9898% 天空，仍缺约 4.23 平方度；MOC 不保证任意层有效像素/深度/无接缝。CDS 加工库层各列 ODbL-1.0 和原始观测各自归属；SkyMapper 原 DOI CC BY 4.0、[PS1 STScI 开放数据授权](https://registry.opendata.aws/mast-panstarrs/)及 CDS 归因/数据库义务须分别落实，按 IVOA HiPS 规范，公开主站 `clonableOnce` 表示允许从主站复制一次，不能推出可无限反复抓取或已有生产容量；CDS 加工数据库的 ODbL 允许商业使用但不替独立原始图像授予权利，公开使用加工数据库还须履行通知、归因和机器可读数据等条件。当前仅有界下载 metadata/MOC、代表性真实瓦片和一张 SIAP 观测切片；PS1 M31 单瓦片已在原生 DevTools 及忽略目录的本地同源 HTTP TRIAL 验证，但生产资产、整套瓦片、页面真图运行证据和再分发权益均未落实，不能据试验声称已采用全空域来源。候选后续检查不同阶瓦片完整性、接缝/光度、生产发布/服务权利及成本；详任务内 `OPTICAL-DATA-RESEARCH.md`。

**Legacy Surveys 限定光学候选（2026-09-25）：** [官方图片条款](https://www.legacysurvey.org/acknowledgment/)对团队自制的 Legacy Surveys/DECaLS/MzLS+BASS 等 Sky Viewer 图层直接给图像 CC BY 4.0，要求 `Legacy Surveys / D. Lang (Perimeter Institute)` 清晰、随图可见且在线链接有效；同站第三方图层不自动适用。[DR10 官方 cutout](https://www.legacysurvey.org/dr10/description/)可脚本取得至多512px的 `ls-dr10` JPEG/FITS；M104 真实 TAN FITS 的 CRPIX=(N+1)/2 与 W3 的 N/2 不同，当前同一影像配准 owner 已显式支持该原点，但未把候选图接入产品。[DR10/DR11](https://www.legacysurvey.org/dr11/description/) M104 官网 2″/px FITS 分别有局部 `r`/`i` 零像素，彩色 JPEG 显示明显色块；更细的原生像素加逆方差复核证实 DR10 `r` 真无权重，但 DR11 同处 `i` 有值，后者缺口只属当前粗切图/拼接结果，不能误报 DR11 原生未观测。M51 样本另有拼缝/色偏；新增原生核查显示 M104 中心 782 个缺测像素集中于核心，北区 M51 中心64×64中619个至少缺一波段。相邻原生切图一处重叠差异较小，不能抵消目标核心缺测；这两个样本均不能凭全图有效率当作高质量成品。可下载且有商用条款不等于画质合格，应先验证有效波段/可追溯改作或缺片降级，不直接发布上述 JPEG。DR10 约两万多平方度、波段交集较小，北南色彩映射不同，[高密区缺图](https://www.legacysurvey.org/dr10/issues/)明确，不能替代全天高清。原始 DR10 目录亦含 Gaia EDR3 辅助字段，本产品不采纳该目录作深星输入。只有具体自制成品、可见署名/改作通知、有效像素与覆盖、获取节奏、自托管/流量成本和原生画面闭合后才可考虑商业接入；现仍为候选，商业 TRIAL 关闭。见任务 `OPTICAL-DATA-RESEARCH.md`。

**动态卫星计算与数据边界（2026-09-23）：** 继续采用现有 [CelesTrak OMM/GP JSON 格式](https://celestrak.org/NORAD/documentation/gp-data-formats.php)候选与集中获取责任，不能退回5位TLE；[使用政策](https://celestrak.org/usage-policy.php)要求仅取所需、GP每更新周期至多一次（约2小时），任意非200停止并人工调查。现有`CelesTrakOmmClient`只给出最短刷新秒数并禁止错误重试，**尚无生产跨进程集中节流/发布**；新增锁定MIT的[`satellite.js@7.1.0`](https://github.com/shashwatak/satellite-js)于 astronomy-core，只负责OMM→SGP4→观察者方位计算和明确过期/失败结果，不在客户端或生产BFF调用上游。一次受控 STATIONS 抓取22条/9,309 bytes及本机实算证明格式可算，不授权原轨道/派生目录商业再分发；CelesTrak/Space-Track具体适用权利和生产刷新成本仍需厘清后才启用发布。`maxEpochAgeMinutes`由消费场景明确选择，不能把SGP4有数值输出等同长时有效或肉眼可见。彗星/小行星仍需各自轨道来源、模型及权益。

**HiPS 几何库边界（2026-09-23）：** 已引入 [`healpix-ts@1.1.0`](https://github.com/developmentseed/healpix-ts) MIT 作为 Mini 原生球面 HiPS 瓦片几何计算依赖，保留原始作者版权和全文于 `sky/assets/licenses/healpix-ts.json`。实际从 CDS 两套真实瓦片/ICRS 位置试验选它，避免在产品重写HEALPix NESTED算法；该库只有几何/瓦片编号作用，不包含观测图片、获权或全空域数据。8×8三角采样的阶1/2/3几何试验及编译通过不替代正式瓦片选取、图像质量/接缝、端上帧耗时和权限。若目标运行时包体/性能或交叉校准不合适，重评几何实现，不回退整个原生引擎选择。

**成本口径：** Agent开发/维护有效时间、项目方参与时间单列，不用人日或Agent小时折算人民币；现金只记真实引擎/数据服务购买、云资源、必要外部服务和Agent新增使用费。已有订阅是否够用、数据费用和扩容未确定时不填零；核心代码开放的商业影响独立判断。详细工时、现金敏感性与公式保留在[任务调研第4–8节](../.codex/work-items/stellarium-cost-research-2026-09-22/research.md)和[可复算模型](../.codex/work-items/stellarium-cost-research-2026-09-22/cost-model.mjs)，都是未实测的规划假设，不是交付时限、采购授权或预算上限；旧整体月费算例不能与云观星新增项机械叠加。

**重评条件：** 当前方案在真实目标设备上经必要优化仍无法满足能力、正确性或性能要求；所需数据的覆盖/商业权益无法落实；或第三方出现可自主修改、可部署、权益明确且经运行验证有显著优势的方案时，重评受影响边界。常规功能扩展不重复整套选型，也不因实现困难缩减已确定的能力目标；先复用本次调研，更新变化的证据。完整比较见上述任务调研，当前采用状态以本节为准。

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
| 星座定义、名称、插画、713 个锚点几何 | Stellarium 原定义及英文名 CC BY-SA 4.0、维基百科指定版本的中文名改编数据 CC BY-SA 4.0、原插画 FAL 1.3、含 SIMBAD 身份关系的独立派生几何 ODbL、Acrux 身份资料 CC BY 4.0。仅名称/定义数据按相应共享方式提供，应用核心代码不因数据许可开放；保留分项署名／通知与所需可读数据下载，不把所有资产合并声明为同一许可证 | [分项 NOTICE 与官方链接](../workers/miniapp-api/assets/constellations/NOTICE.txt)、[中文名指定版本](https://zh.wikipedia.org/w/index.php?title=%E6%98%9F%E5%BA%A7%E5%88%97%E8%A1%A8&oldid=93845063)、[几何发布 owner](architecture/runtime-and-domain.md#cloud-sky-progressive-imagery) |
| IRSA AllWISE W3 影像 | 原影像保留 WISE＋NEOWISE 联合声明、IPAC/NASA 与 Atlas 引用；实际 CDS/Aladin HiPS 数据库另有 ODbL、CNRS/Unistra 和独立 DOI。目标切图和广角第0阶部分镜像分别保留归因、加工说明、机器可读数据／修改下载；广角源为CDS公开主站而非标记不可克隆的IRSA镜像，属性声明`public partial unclonable`。OpenNGC 位置字段仍单独 CC BY-SA，不把数据库许可泛化到所有图片或产品代码 | [目标切图manifest](../workers/miniapp-api/assets/deep-sky/manifest.json)、[广角manifest](../workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json)、[AllWISE 声明](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html)、[CDS W3 许可记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record)、[加工及分发入口](../data-pipelines/deep-sky/README.md#optional-wide-sky-infrared-layer) |
| 水星表面：采用固定 USGS MESSENGER 2013 灰阶小图 | USGS Astrogeology 的 Mercury MESSENGER MDIS Global Mosaic 250m (May 2013) 产品记录明确 Public domain、Please cite authors、填补极区并称 100% 覆盖。由官方 `MESSENGER_May2013` WMS 以正东经 −180°～180°、星心纬度导出 1024×512 JPEG（89984 B，SHA/请求/投影见 `workers/miniapp-api/assets/mercury/manifest.json`），同源 API 哈希绑定发布。没有新增逐项商业授权费，仍需计量获取、存储和流量。它是历史 750 nm 单波段反射率图，不是自然彩色或实时实景；低角直径不加载，解码约 2 MiB，目标设备纹理朝向、极点像素和峰值成本未证。初查另一款 MESSENGER 彩色图 WMS 的极区大面积缺图，因此未采用 | [USGS 原产品、权限和坐标](https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m)、[USGS WMS 图层](https://astrowebmaps.wr.usgs.gov/webmapatlas/Layers/maps.html) |
| 月面纹理：采用 USGS Clementine v2.1 覆盖率图，保留旧JPEG合同 | NASA CGI Moon Kit的ASU LROC WAC非PDS商用许可原因不变，未采用或付费。USGS Clementine UVVIS 750nm产品已有public domain依据；当前采用完整4.25GB v2.1 GeoTIFF按明确NoData=0缩小到2048×1024 RGBA，原始8bit灰度不拉伸，alpha表示每45×45源像素的有效面积。中低纬/极区缺测以统一灰色几何盘面示意，不虚构地貌、反照率或当前阴影；历史1994单波段影像不代表自然彩或实时月面。精确源/成品SHA、投影、加工与局限见`workers/miniapp-api/assets/moon/coverage-manifest.json`及`data-pipelines/planet-textures/publish_clementine_moon.py`。新版从`/v2/sky/moon/coverage/manifest`显式取PNG；旧WMS JPEG及原哈希地址继续服务旧客户端，资料请求按moonTextureVersion区分来源和缓存。新图1,595,187 B，RGBA理论解码8MiB；实际手机峰值/流量、Android/iOS新图方向和合成仍需验证。源获取/加工、云存储与流量/Agent现金分别计量，未知不写零 | [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720)、[LROC使用条款](https://lroc.im-ldi.com/about/terms)、[USGS Clementine产品](https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m)、[USGS WMS图层目录](https://astrowebmaps.wr.usgs.gov/webmapatlas/Layers/maps.html)、[USGS使用说明](https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted) |
| 火星表面：采用固定 USGS Viking 彩色化小图 | USGS Astrogeology 的 Mars Viking Colorized Global Mosaic 232m（MDIM 2.1，NASA Ames 彩色化）产品记录明确 Access Constraints 为 public domain、Use Constraints 为 None，东经与星心纬度。由对应 USGS `MDIM21_color` WMS 固定导出 1024×512 JPEG（94411 B，SHA/完整请求/投影见 `workers/miniapp-api/assets/mars/manifest.json`），同源 Mini API 哈希绑定发布；无需逐项商业授权费，仍需计量加工、云存储与流量。它是历史艺术彩色化地图而非自然真彩或当前实景；低角直径时不加载，1024×512 解码约 2 MiB，真机峰值和实际流量未测。Mars IAU 表面轴须按光发射时刻而非地面接收时刻计算；与 JPL Horizons 地心次观测点经度金标核对约差 0.03°，仍不代表设备像素或全面定位精度 | [USGS 原产品及权限、坐标](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m)、[USGS WMS 图层](https://astrowebmaps.wr.usgs.gov/webmapatlas/Layers/maps.html)、[JPL Horizons 接口与量14](https://ssd-api.jpl.nasa.gov/doc/horizons.html) |
| 木星历史纬度云带：采用 HST OPAL 2024c 衍生图 | MAST OPAL 高阶科学产品公开标注 CC BY 4.0，允许商用改作与再分发，须署名、链接许可证并说明修改；无需逐项授权，不要求开放 Starward 核心代码。官方 3600×1800 三滤镜合成图经每纬度有效经度中位数处理为 8×512 RGBA PNG（1026 B），完全去除旧大红斑等经度信息，透明极区回退几何盘面；正式清单绑定源/成品 SHA、观测日期、DOI、许可和加工说明。按行星图纬度映射到 1-bar 扁球，只代表历史条带而非自然真彩或当前天气。获取加工、云存储/流量与目标手机上传/峰值仍需单列验证 | [MAST OPAL 许可](https://archive.stsci.edu/hlsp/opal)、[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)、[Cycle 31 原图](https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31)、[Wong 等论文的完整纬度定义](https://stsci-opo.org/STScI-01EVSQQQA3VQ9Y32GQKZ0ADZ9A.pdf)、[加工脚本](../data-pipelines/planet-textures/README.md)、[正式清单](../workers/miniapp-api/assets/jupiter/manifest.json) |
| 土星历史纬度云带：采用 HST OPAL 2025a 衍生图 | 同一 OPAL 高阶产品页公开标注 CC BY 4.0，允许商用改作与再分发，须署名、链接许可证并说明修改；不是 DSS 权利的延伸，也不要求开放核心代码。官方 1800×900 三滤镜合成 TIFF 仅在有效经度覆盖至少 90% 的行取 RGB 中位数，生成 8×512 RGBA PNG（1003 B）；环遮挡、极区缺资料行透明回退普通球面，经度云纹和历史卫星影子不作为现时特征。清单固定原图/成品 SHA、观测日期、DOI、许可与加工。按同刻极轴和 1-bar 扁球映射行星图纬度；图像不是自然真彩、实时天气或当前环影。获取加工、云存储/流量、目标原生画面与峰值仍需单列验证 | [OPAL 许可](https://archive.stsci.edu/hlsp/opal)、[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)、[Cycle 32 原图](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32)、[加工脚本](../data-pipelines/planet-textures/README.md)、[正式清单](../workers/miniapp-api/assets/saturn/manifest.json) |
| 天王星／海王星历史纬度色带：采用 OPAL 2025a／2025b 衍生图 | 同一 OPAL HLSP CC BY 4.0 许可适用于这两份具体产品；保留 NASA/ESA HST OPAL、PI Amy Simon、STScI、DOI、许可证及 Starward 改作说明，无新增逐项商业授权费或核心开源义务。官方 RGB TIFF 固定 SHA 后按有效纬度取中位色并输出严格二值缺测掩码，分别只覆盖源图有观测的纬度；移除经度特征，不称自然真彩或实时天气。正式清单／HTTP／客户端已接，目标画面与设备成本未验证。源数据加工、云存储／流量和 Agent 成本继续单列 | [OPAL 权利与产品说明](https://archive.stsci.edu/hlsp/opal)、[天王星 Cycle 33](https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33)、[海王星 Cycle 32](https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32)、[天王星清单](../workers/miniapp-api/assets/uranus/manifest.json)、[海王星清单](../workers/miniapp-api/assets/neptune/manifest.json)、[加工说明](../data-pipelines/planet-textures/README.md) |
| Astronomy Engine 与 GMN 流星资料 | 算法代码保留 MIT 通知；GMN 指定高层资料按 CC BY 4.0 归因并说明派生。常年参考的授权不包含任意文章／照片或未经核验的年度预报 | [Astronomy Engine LICENSE](https://github.com/cosinekitty/astronomy/blob/master/LICENSE)、[GMN 来源及加工边界](../data-pipelines/meteor-catalog/README.md) |
| 软件／算法依赖（含 Astronomy Engine、TWGL、Quaternion 等） | 按实际锁定版本的代码许可证落实商用、修改与分发条件，保留要求的 LICENSE 原文及版权／许可通知；数据来源卡不能替代代码许可交付。Mini 的 TWGL／Quaternion 完整通知由构建复制到 `sky/assets/licenses/`；noble-hashes 和已核 React（含 reconciler／scheduler）、Babel runtime、TanStack Query／Zustand／Taro 运行时完整通知复制到主包 `assets/licenses/`。按 Mini workspace 的实际依赖解析版本维护，不能拿根目录另一版本代替；升级时同步原文。此记录不宣称已审完全部间接依赖 | 各 workspace 的 package.json／锁文件、所安装包 LICENSE、[Mini 许可资产](../apps/wechat-miniapp/src/assets/licenses/)与[构建 owner](../apps/wechat-miniapp/config/index.ts) |
| 文章读取的可选 Cloudflare 公共 DNS | 仅后端显式启用 `CLOUDFLARE_DOH` 时解析文章主机名，适用公共解析器及在线服务条款，禁止滥用或绕过限制；无 SLA，不能据此承诺稳定连通。解析方可见查询域名及服务器来源 IP，当前请求不含文章路径／正文、用户位置或凭据；遵循其隐私条款。此服务不授予文章转载权，若扩为客户端解析、网络设备或 ISP 集成须重新核对隐私和专门署名条件 | [服务条款入口](https://developers.cloudflare.com/1.1.1.1/terms-of-use/)、[在线服务条款](https://www.cloudflare.com/website-terms/)、[公共解析隐私](https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/)、[SLA 边界](https://developers.cloudflare.com/1.1.1.1/infrastructure/sla-and-support/)、[文章解析 owner](architecture/runtime-and-domain.md) |
| 文章、照片、投稿及微信账号／审核／订阅消息 | 内容复用须有相应用途授权，导入不等于获权或发布；平台服务按实际主体、类目、隐私、接口及模板授权使用。不能由内容审核成功推定版权或场地事实成立 | [内容与平台产品 owner](areas/main/product-surfaces/wechat-miniapp.md)、[发布档案](product-profile.md#current-release-profile)、实际微信后台及对应内容授权记录 |

和风声明原文由 `SourceSummary.attribution` 经共享 `SourceAttribution` 接入当前数据展示，预警同时保留原发布机构；具体共享责任见[来源披露 owner](areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md)。归因规范要求名称附官方超链接，当前小程序只实现明确标注的复制链接，仍有平台适配缺口。优先按标准要求实现，并核实实际小程序主体与业务域名是否支持；只有需要保留替代方式且公开规则不能明确覆盖时，才联系供应商确认或申请例外。复制测试通过不能证明超链接义务已满足。

用户确认：优先做点击打开官网；当前平台不能实现时，先在 Context 保留待办，不将这一项作为其余迁移工作的阻塞。当前登记为个人主体；[Taro WebView 文档](https://docs.taro.zone/docs/components/open/web-view)说明个人类型小程序不支持该网页容器，普通外部网页还需配置业务域名。当前不加入不能实际使用的网页路由，暂保留明确标注的复制入口。后续主体／网页能力和官网业务域名条件具备时，由共享 `SourceAttribution` 接入官网跳转并验证实际打开；此前仍不得宣称已满足超链接义务。这是延期处理决定，不是供应商豁免，也不要求现在联系供应商。

和风[缓存限制](https://dev.qweather.com/docs/best-practices/cache/#限制)对 GeoAPI 另有约束，不可用天气缓存许可推导地区资料存储权。近期天气仅实时解析地区，不保留 Geo 结果或含地区资料的完成响应缓存；独立天气日值可按既有天气缓存策略复用，HTTP 与客户端离线存储采用 no-store，隐藏／退出时释放地区展示状态。既有地区缓存不构成获权依据。Geo 查询随实际进入／恢复次数产生，成本核算不能继续假定七天地区缓存命中；不因此改变已采用的天气来源或自动采购。

真实和风账号权益、EOG 合法资产与获取方式、微信模板／平台权限，以及地图与中国天气传播的项目级适用条件，分别以实际核定为准；相关未决项不能由本表或适配器存在自动关闭。新增产品逻辑若超出表中用途，应先补相应条件和来源入口，再接入实现；不要求重做无变化的全部研究。

已采用资料按实际产品/版本保存获取来源、许可通知、归因、修改说明和发布清单：GLO-30-F、许可覆盖的EOG年度VNL、HEASARC BSC5P、OpenNGC（实际许可路径`LICENSES/CC-BY-SA-4.0.txt`）、Astronomy Engine MIT、指定IRSA WISE公开影像、GMN CC BY 4.0高层资料。不将某个镜像条款泛化为全部Gaia/Hipparcos，也不将NASA网页统一视为无限素材许可。

云观星星座原插画／连线继续采用 Stellarium v24.4 Modern 的 FAL 1.3／CC BY-SA 4.0；英文名取自同一固定提交的原始名称表，中文名只取自[维基百科星座列表固定版本](https://zh.wikipedia.org/w/index.php?title=%E6%98%9F%E5%BA%A7%E5%88%97%E8%A1%A8&oldid=93845063)的88个通行名称，保留Wikipedia contributors归因、改编说明和 CC BY-SA 4.0，不导入该页其他字段或媒体。几何 v2 改用 BSC5P／SAO 的 FK5 J2000 坐标和自行；HIP 仅为定义编号，不再导入 ESA 数值。身份关系采用 [SIMBAD 明示 ODbL](https://simbad.cds.unistra.fr/simbad/) 的同对象／系统成员编号；Acrux 使用 [IAU-WGSN／All Skies Encyclopaedia 明确编号](https://ase.exopla.net/index.php/Acrux)，保留作者和 CC BY 4.0。18 个系统用明确成员的等权球面几何代表点绘图，不宣称实测光心，不用于恒星合并／命名／拾取。派生几何单独按 ODbL 提供机器可读下载和归因，定义／插画许可不变。详[几何与发布 owner](architecture/runtime-and-domain.md#cloud-sky-progressive-imagery)。旧 HIP/Tycho CC BY-NC 数值仍非商用输入；镜像泛化条款不能覆盖上游。

SAO J2000作为补充暗星的接入候选：其[NASA具体目录元数据](https://data.nasa.gov/dataset/smithsonian-astrophysical-observatory-star-catalog)标记government-works，[HEASARC目录说明](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/sao.html)记录SAO/ADC/USNO来源，所用修订早于Hipparcos/Tycho发布；当前核查未发现上述NC冲突。此依据支持继续接入验证，不把CDS未写license本身当作授权，也不覆盖HIP星座坐标。SAO历史视觉星等与较老天体测量须保留局限，不能宣称统一Johnson V或完整至10等；原BSC保留，SAO已按空间分片接入服务与客户端；设备性能按实际证据范围记录。重评条件为具体来源条款冲突、所需精度/覆盖不足或目标运行时预算不合适。

2026-09-24 新增的 BSC5P v3 只把现行 IAU 名称 Acrux 明确赋给 HR:4730，不改变星位、测光或 HR:4731；输入、逐行差异与哈希在 [v3 manifest](../packages/astronomy-core/data/bsc5p-bright-stars.v3.manifest.json)。对应 SAO v2 与 Wikidata 中文别名 v2 仅重绑 BSC 基底，行内容不变，旧版仍保留给旧客户端；发布入口与兼容性见[运行时 owner](architecture/runtime-and-domain.md#celestial-object-selection-and-lazy-information)。这不新增源数据许可推定，正式环境需保留兼容静态资产并计量存储与内存，微信目标设备表现和云端成本尚未测定。

2026-09-30 中文别名 v3 仅将 [Q12975](https://www.wikidata.org/wiki/Q12975) 固定 EntityData 中的“牛郎星／天鹰座α”补入其原 HR:7557 行；原 3,149 个身份和其余标签、歧义剔除及商业边界不变。P528 的 HR 7557 及 Bright Star Catalogue P972 限定符在该原始快照中明确存在；不采用其星位、测光或其它数值。沿原 Wikidata 结构化数据 CC0 准入，旧批量标签与新单对象输入分别保 hash、revision／获取时刻，不声称整批实时刷新。原别名 v1/v2保留；当前 BSC v3 的搜索和资料共用新出版物，BSC v2仍用 v1。源码／原始输入和复现见[既有数据流水线](../data-pipelines/star-catalog/README.md#wikidata-chinese-bright-star-search-aliases)。这是已确认来源内的有限纠漏，不扩大完整中文介绍或新增数值来源的承诺。

报告保留两组项目级公开运营核定：实际AppID原生地图/选点/叠加组合与新增地理内容的坐标、标识及适用内容责任；中国小时预报/预警原发布单位、发布时间、云量图层传播及适用备案。这些不由数据开放许可、国内供应商身份或预算替代。常规主体、平台位置隐私、内容授权、订阅模板按各自发布owner落实；未完成的能力不声明已获准商业发布，额外必要合同取得实际报价再计入。

**SDSS 限定定点光学链（2026-09-25，2026-09-29扩展本地覆盖）：** [官方图像使用政策](https://www.sdss.org/collaboration/image-use-policy/)允许 SDSS 官网影像用于任何目的，须保留 Sloan Digital Sky Survey 等相应署名；本次重核其 CC BY 链接指向 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，保留许可及处理说明，不暗示 SDSS 背书。[官方 SkyServer JPEG 说明](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/)确认 ImgCutout 由 g/r/i FITS 帧形成中心裁图。M51 原三档清单/hash/JPEG保持兼容；新增M63/M64/M81/M82/M87按现有OpenNGC身份实取三档512px原JPEG，官方footprint查询确认请求中心有覆盖，全部原字节/完整解码已核且未加工像素。M81较大目录长轴由较宽概览保留。六目标沿现有固定出版/本地服务/Mini共享原生图片与GPU链实现；实际画面选择一个目标巡天波段，光学成功不与W3合成，边缘只作显示淡出；光学无图/失败保留独立W3。随已绘帧署名，来源页有各自固定清单/许可/加工和覆盖限制。中心footprint、可解码JPEG和软件绘图均不证明完整科学逐像素/逐波段覆盖或目标质量；M63概览明显条纹与多个细档饱和仍保已知限制，不能以淡出或免责声明验收。尚未部署、完成本代微信原生/手机质量与其它配准；M51亚像素未决事实不因增加目标改变。[DR18 成像说明](https://www.sdss.org/dr18/imaging/)的独有14,055平方度不是全天；[成像获取说明](https://www.sdss.org/dr18/imaging/tools/)的CAS footprint/field与SAS原帧路线仍是进一步评估入口，公共cutout批量承载、加工/自托管与实际费用未闭合，不承诺全天或持续批量采集；请求时不访问源站。新增样本只是有界准入，后续扩目标仍须同等核查。PS1/SkyMapper/Legacy其它来源的权利或质量结论不变。当前具体原图/请求/出版/失败证据见任务 `evidence/experience-sdss-targets-2026-09-29.md`，原M51研究保在 `evidence/c-sdss-target-source-2026-09-25.md`。

可直接核查的官方入口：[和风小时字段与范围](https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/)、[按量计价](https://dev.qweather.com/docs/finance/pricing/)、[EOG访问规则](https://eogdata.mines.edu/products/register/)、[BSC5P发布说明](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html)。本轮已重新读取前三项；其他许可采用原研究的具体结论，实际文件迁移仍需绑定对应原始通知，不能把研究引用ID写成已经归档的许可证。

## 实施连续性

基于当前main和未提交工作定向迁移，保留通用缓存/并发合并/超时取消、调用计量、缺测与时间窗、迁移及真机反馈工具的有效修复。先追踪实际加载/发布/消费路径，再替换供应商专属部分；不全量回退、不因某函数命名就宣称迁移完成，也不把文档更新视为生产完成。

实现组合、数据迁移与仍在运行的旧路径由[架构owner](architecture/runtime-and-domain.md#mini-program-external-capability-migration)记录，页面功能由上表owner维护。真实账号权益、部署来源、数据库持久状态、手机交互、地图配准和消息结果须各自取得证据；任务进度及检查日志保留在已有`output/provider-selection-and-repair/`，不放进本Context。
