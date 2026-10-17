# Stellarium参考调研与有效修订（2026-10-14）

本记录保存用户四点、后续取消模拟云层和“瓦片看不到实际内容”的追问，以及足以决定方案的有限事实。当前只做调研、修订唯一PLAN/必要Context和新对话交接；不开始新的产品批次、不采用新图片/星表、不复制上游代码。先前r72已完成的有界结果仍归就绪渐显证据，普通手机仍r71。

## 后续追问：已找到对应双鱼座原图中的矩形（2026-10-14）

用户再次明确要求弄清楚密集无明显内容的矩形是否模拟云层，本次只重开这一有界研究问题，不开始产品实施或修改PLAN。此次证据比先前无关Polaris单瓦片更直接：官网实际搜索Delta Piscium并缩至DOM确认的11.5°，实见与用户图3/4相同的蓝色平行双线和棕蓝矩形底色。记录见[对应原图与回执](../../../../output/cloud-sky-stellarium-reference-2026-10-14/pisces-tile-origin-result.json)，[官网原截图](../../../../output/cloud-sky-stellarium-reference-2026-10-14/pisces-reference-original.png)。没有逐像素复现用户全部截图，不冒所有矩形的逐一配准。

从该视野已加载的CDP response分别保存并原尺寸查看三张512×512原WebP：Norder3 [Npix283](../../../../output/cloud-sky-stellarium-reference-2026-10-14/pisces-Norder3-Npix283.webp)、[Npix308](../../../../output/cloud-sky-stellarium-reference-2026-10-14/pisces-Norder3-Npix308.webp)、[Npix304](../../../../output/cloud-sky-stellarium-reference-2026-10-14/pisces-Norder3-Npix304.webp)。它们内部已经有直边棕蓝色块；283中有同一组蓝色双线。故该处矩形底色由巡天输入图片带入，不能仅解释为网页切片尚未加载，也不是运行时天气云层或亮星sprite产生。一个可见矩形不等于一个HiPS运输瓦片，单一原瓦片内部就能包含多块不同底色。这覆盖此前“未对应用户天区，只能猜层来源”的限制；每块来自哪张底片/哪道加工仍未追溯。

同批实际[数据声明](https://stellarium.sfo2.cdn.digitaloceanspaces.com/surveys/dss/v1/properties)标明ivo://CDS/P/DSS2/color：CDS将STScI扫描红/蓝巡天底片合成，绿通道取另两者的均值，观测年代范围为1975–1999，固定赤道坐标，层级生成标记median；[原文备份](../../../../output/cloud-sky-stellarium-reference-2026-10-14/pisces-dss-properties.txt)。它用于真实天区照片背景，不是当地实时或合成气象云。当前原图有很淡的摄影星点，矩形是图内背景色差/拼接痕迹；具体曝光、扫描、背景校正或后期步骤造成各块差异仍UNKNOWN。低层级median可能削弱细小点状结构而保留大尺度底色差，这是机制解释，不冒已重建制作方处理链或量化归因。

当前在线frontend-1.16.0与libswe-1.17.0绑定来自实际资源；公开旧view-settings源码有DSS开关，但在线UI只有Meridian/Ecliptic两项，未用旧UI接口假称完成关闭对照。本次没有DSS-off A/B；直接证据是对应天区输入像素及来源声明。只作公开源码/三块已缓存参考和实际UI观察，未执行下载所得的脚本、用调试注入改写图层参数、改变产品代码/PLAN/Context或采用素材；agent临时标签已关闭。既有人工云层取消方向不变。新增事实由root核看，之前交接独审不冒本次增量独审；没有必要重复产品检查。该实际研究进展打断先前等待实施授权的无进展连续计数，产品实施仍等新对话明确开始。

## 原始要求和参考

四点全文：[用户原话](stellarium-feedback-2026-10-14/request-original.txt)。五张原PNG按原尺寸完整保存：[图1](stellarium-feedback-2026-10-14/user-1.png)、[图2](stellarium-feedback-2026-10-14/user-2.png)、[图3](stellarium-feedback-2026-10-14/user-3.png)、[图4](stellarium-feedback-2026-10-14/user-4.png)、[图5](stellarium-feedback-2026-10-14/user-5.png)，源路径/字节/hash见[原件清单](stellarium-feedback-2026-10-14/originals.json)。第六张2560×1270原PNG为[最新追问图](stellarium-feedback-2026-10-14/user-6.png)，原件hash与官网实读见[研究回执](../../../../output/cloud-sky-stellarium-reference-2026-10-14/reference-observation.json)。[补充原话](stellarium-feedback-2026-10-14/latest-corrections.txt)保annotation 1与最后追问；本轮未修改截图像素。

用户有效修订：“如果我理解错了那这个明暗交替模拟云层的没必要做了，那他这个是干嘛的”；随后“但问题是我并没有看到他这些瓦片有什么实际内容呀”。因此取消人工云层/随机明暗/矩形叠片效果。保留真实银河丰富度方向，不把摄影底色或拼接差异当需要复刻的产品能力。

## 瓦片用途、实际内容与证据限度

公开源码固定版本7d45c8fec393fbbabadcefa935794290fc39723d：[milkyway.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/milkyway.c)用银河影像承担广角；[dss.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/dss.c)按10–20°视场过渡到巡天照片并调显示亮度；[hips.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/hips.c)按天区/层级取瓦片，未到时保父档/Allsky。瓦片是分块装载真实天区照片的运输/LOD方式，不是模拟天气云层；不同天区也不保证每片都有可辨星云。

使用项目Browser/IAB实际打开官网，初始120°看到银河/近黑地面/地平微亮，随后实际缩至约11.5°，DOM可见DSS colored加载。CDP实收17块Norder3 DSS WebP的200响应；公开在线资源标识libswe-1.17.0与上面公开源码commit不是同一身份，不冒精确生产源码绑定。[官网截图](../../../../output/cloud-sky-stellarium-reference-2026-10-14/reference-narrow-11-5.png)包括已打开的View Settings侧栏，FOV来自相邻DOM读回而非截图文字。未改官网地点、时间或灯光参数，浏览器为Unknown observer且当前天区靠Polaris，不是用户Singapore/Pisces条件。

从已加载浏览器response读出一块原512×512 DSS瓦片：[原瓦片](../../../../output/cloud-sky-stellarium-reference-2026-10-14/reference-only-Norder3-Npix61.webp)。root实际原尺寸核看：有很淡的摄影小星点，背景为低亮度棕/蓝变化，没有明显星云结构。官网明亮目录点与这些照片小星点不是同一种数据；它们显著主导画面，是“主要看见色块”的合理解释之一。没有同视角关巡天对照，不据此断言这就是用户六图矩形的唯一原因，也不证明每块内容、曝光/粗细档/接缝/加载根因。用途已确认；用户截图的具体块对应和原因仍UNKNOWN。摄影中的星点不冒真实目录身份，不能把它们计入可检索恒星数量。

pageAssets初次按已去query的URL寻找资源导致未命中，后有wrapper变量绑定失败，最终bundle为0成功/1失败、TypeError Failed to fetch；不冒成功下载或产品故障。只读取原浏览器已缓存response，没有新增图片HTTP请求/批量获取/加工；参考文件在output，未入生产assets或registry。AGENT自开官网标签已关闭，用户已有标签未动。有限核读达到辨别“并非云层、实际有极淡照片内容”的目的，不继续扩大巡天样本。

## 四项如何落到当前工程

| 标识 | 确认事实与采用方向 | 关键限制/待验 |
| --- | --- | --- |
| UX11 真实银河/背景丰富度 | 复用已采用的固定Mellinger 2048×1024 DISPLAY与当前银河Scene/GPU窗口，检查同条件色调、对比、尺度淡化/星层关系和源图已有细节；先调整现呈现，不复制巡天矩形或增加人造云。 | 当前分辨率是有效细节上限，不能承诺调色生成高清；完整绝对配准/科学资格仍未验。若真实缺口必须新影像，记后续冻结队列，当前不换源/扩批。 |
| UX12 夜景/地景自然对比 | 沿同公共时刻的sky-solar-light/shader与两地景shader的共同lighting调正常夜间RGB/显示曝光：暗地面、薄柔和天空侧地平亮度；UX03灰色仅保向地景侧浏览的方向提示与透明语义。 | 不做全天均匀白圈、不把夜空洗白，不改变原源alpha、mask/高度/拾取；四树闪现与重黄白圈是UX09既有失败，不当自然地平光通过。当前固定光照不是现场气象/月光测量。 |
| UX13 真实星数与逐级密度 | 现BSC v3 8,404条+SAO v2 246,280条去重补充=254,684条身份；先核相同天区、时刻、视场、投影/DPR和显示环境下实际就绪/准入/已绘集合，区分数据量、加载、星等阈值、颜色/半径和照片星场。沿原星表/瓦片/appearance/accepted owner修真实差距。 | 并未完成同条件可见数对比，不能断言截图只是错觉或我们同样多。现v2以历史visual≤10输入形成，不承诺完整10等或Gaia深度；更深目录只有真实必要且具体免许可费商用/取得/分发条件已核才进入原publisher，当前不启动扩表。 |
| UX14 随亮度变化的星芒 | 当前GPU pointVertex/Fragment已按真实星等/FOV派生半径驱动soft core、halo和轴向wing，无外部模板图。先核实际native输出与参考，再在该单一owner调比率/范围，暗星保小点，亮星差异连续，复用B-V颜色、point-size/DPR上限和同帧触控。 | 公开源码ordinary points为程序化核/晕；halo.png存在不足以证明在线图5每种星芒用不同模板。精确在线额外flare机制UNKNOWN；不新增逐星图片、全屏bloom/第二Canvas，不冒真实眼睛/仪器PSF或天体角径。 |

本地当前星表数据规模和字节以BSC manifest、SAO publication/index为准；SAO现826瓦片、tileBytes35,314,828，view/下载/cache边界复用现loader和选档owner，不能把全库条数当单帧星数。实际对比需按天空角覆盖归一化，不能仅把两端标注FOV数值调成相等。当前共同magnitudeLimit/sunAltitude/地平传输与就绪规则可能影响实际数量，先定位后调；不随机补点、静态撒星、借放宽科学资格迎合截图。当前星芒代码存在不等于已满足新参考效果或性能。

## 成熟参考、许可与成本

Stellarium公开引擎[README](https://github.com/Stellarium/stellarium-web-engine/tree/7d45c8fec393fbbabadcefa935794290fc39723d)及文件头为AGPL v3或商业许可。现已采用的原生WEAPP/TWGL/Astronomy Engine不变；只借可解释机制，不复制/翻译上游实现进自有产品，不采购商业许可或开放项目。HiPS格式可复用不等于授照片权。

既有DSS排除继续保持。[STScI官方数据使用条款](https://archive.stsci.edu/publishing/data-use)保DSS/GSC具体商业许可限制，公开CDN可访问不改变这一边界；本轮一块仅供用户请求的参考核读，无生产采用。指定Gaia/ESA受限产品也不因星量需求重开。固定Mellinger许可只涉及已核随包具体图与Axel署名，[固定CREDITS](https://github.com/Stellarium/stellarium/blob/608db95859f2393d5cc5067d90850ab2d7560c0c/CREDITS.md)不授作者新版高分辨率/付费FITS或其它素材；继续现有来源文案/原像素/hash，不借当前显示调整恢复加工。

已有SAO具体来源的免费/政府作品依据沿现采用声明，[NASA SAO数据页](https://data.nasa.gov/dataset/smithsonian-astrophysical-observatory-star-catalog)、[HEASARC政策](https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html)、[SAO机器可读文档](https://ntrs.nasa.gov/search.jsp?R=19910021722)支持当前具体选择；不是所有NASA/ESA网页资产的普遍授权。无需为当前已采用的BSC/SAO新增素材许可费；网络、存储、加工与运维不是零成本，200DAU/12Mbps及对象存储+CDN仍归部署owner、未采购/认证容量。若以后确需更深目录，不默认无限镜像十亿级数据，先用原publisher/cache链验证实际深度收益和规模/权利条件。

地平亮与地面黑的分工可参照[atmosphere.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/atmosphere.c)、[landscape.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/landscape.c)和[fog.glsl](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/data/shaders/fog.glsl)，并非给地面套统一灰层；本项目使用自己的既有display/太阳光照责任，不能把参考Moon/眼适应模型直接宣称已具备。普通星点程序参考[points.glsl](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/data/shaders/points.glsl)、[render_gl.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/render_gl.c)；无需重新选引擎或开图像生成。

## 决策、恢复与验收

方案方法只在唯一PLAN的UX11–UX14；产品语义沿Sky Context，技术归runtime-and-domain，来源边界沿external-capabilities。原33行逐字保持，UX01–UX10/所有实际FAILED与未验保持。四项尚无当前产品实施/原生/性能完成证据；研究原图、网页响应和他人渲染器成功不认证Starward。新对话明确开始后先按当前资源就绪/连续环境的未闭责任集成，再在各既有owner完成四项参考方向与真实差距，独立项可推进；旧完成批次/适用证据不重复。广角长帧/物理资源、跟随微抖、时间/四树、完整名称族、IR/HiPS、图像/端云与平台未验保原。当前阶段与唯一下一动作只见CONTINUE，新聊天开始正文见NEXT-CHAT-PROMPT。

## 前期读回与限定独审

本轮15份文档保存后逐字读回；新增/修改本地60链接和锚点检查实际exit0（2c44c4），原33行逐字一致、五个保留源码hash不变。Context manifest/controlling-source检查实际exit0（a206ec），只证明结构，不认证事实/产品。初次回执见output/cloud-sky-stellarium-reference-2026-10-14/handoff-write-readback.json与document-check-result.json，收口回执见同目录handoff-final-readback.json；前像保before-*，未覆盖旧失败。

sky_stellarium_handoff_review独立只读核原话/修订、四原图1/2/5/6和原512瓦片、15文档/五源码hash、原33、唯一PLAN/三Context/恢复阶段及固定源码/许可边界，无阻断，结束即关闭。没有运行产品测试/构建/手机/额外浏览器，不冒四项效果、同条件星数、当前连接、原生或FPS认证。root按其提示补明比较真实角覆盖而非标注FOV数值，属同条件语义澄清，不改变责任/依赖或引入新验收；没有新链接/Context/生产代码变动，不重复结构/产品检查。当前准备完成、本轮停下，同Goal仍active、无预算/未完成；新对话开始提示词足以解除阶段停点。

