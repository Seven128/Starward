# M82 noise-v2整图真实资格、边外来源及必要依赖

本轮仅新增四个云观星task脚本和对应Sky文档；生产/其他业务逻辑未改。r92现419源、6716证据及六项settings/outbox保护逐项绑定相同，指定工作区/分支/HEAD、原BFF/watch开始时间保持，无staging/commit/push/deploy/publish或新天文source请求。Goal继续active无预算，33义务及普通空registry、失败/未验证状态不升级。

## 完整crop的有界新消费者

[实际结果](../../../../output/sdss-m82-sky-v2-dependency-1004-r1/result.json)复用保存2048² SCI/common weights/投影fields、18缓存frame/CALIB-SKY/fpM/CAS和现owner。仅target→native WCS几何、positive contribution及四实际native邻点触及有限SKY网格端点定位可能变化域；所有其他点在当前源输入与原内部算术相同下不受本次constant-edge改动影响，NaN坐标不冒新资格。全域不重复science重投影/coadd、wholevariance、检测/fit/filter或孔径选择。

得到18958 potential target。仅这些点进入actual `_project_field` before-archived/v2、条件Cauchy marginals和既有不同RUN/不重叠MJD/known-bad供给及`_effective_recovery_samples`；metadata/core/data/native-ID/zero-contribution/flags门槛保原。旧方资格/strong精确等于保存parent，旧raw供给/值、恢复资格/strong精确等于旧候选。本次所有旧有限native variance数组项/IDs/weights一致；报告1226886是**有限数组位置数，包含无贡献neutral zero及重复native ID**，不是独立真实native测量数或目标点数。

|实际crop边界消费者|结果|
|---|---:|
|potential target|18958|
|新增原资格|16425|
|新增恢复资格|16467|
|potential域旧→新raw供给|2480→2522|
|新供给/丢失供给|42/0|
|有效资格/strong/raw-cohort或已资格variance变化依赖|16467|
|仅crop导致的最大8px图内需求|90711|
|其中内部/边缘|89921/790|
|64行非空块|23|

变化依赖并非potential全部，也不把source flag坏点伪装有效。全图新资格派生自旧q在真实改变域的更新；它只是诊断，不把旧publication/source snapshot标作当前v2，未生成新版完整显示。

## 真实外侧与完整需求

[四真实边窗](../../../../output/sdss-m82-sky-v2-exterior-1004-r1/result.json)复用`_project_real_source_window`。top/bottom 16×2064、left/right 2032×16，共131072外围含内外采样地址。18既有frame加载用于**新的实际边外消费者**；不是下载、全图variance/coadd或旧矩阵重跑。每窗内侧cached SCI、每带footprint/finite、joint availability、归一化common coefficients逐位验证，新增外侧值来自真实native，绝不padding/guess，也不当新增已出版science。

65792外侧地址实际available。其中有限SKY端点潜在168：top56、bottom0、left37、right75；compact before/after门槛得新增资格top56/left29/right65=150，外侧新供给0，原有限variance/IDs/系数保持。其余真正flag/unknown没有变更。

将这150真实外侧依赖加入原crop16467，完整16617变化点经最大8px圆传播：**图内必要90746=89921内部+825边缘，外侧比只crop增加35，23块**。不把near-edge一律裁掉，也不把131072整个外围作为请求集合。它是重算需求，不替代任一实际raw/资格/selected common-aperture消费者的准入。

## 保存读回与实际观察

[读回](../../../../output/sdss-m82-sky-v2-dependency-readback-1004-r1/result.json)用全部16617变化点逐坐标scatter197个整数圆点，独立于owner的窗口shift法；完整90746需求逐位相同，35 exterior增加仅限inner8之外。读回compact坐标/potential/changed-mask、外侧真实坐标、旧q/supply无损失、旧合格finite marginal保持。派生全q4121815→4138282/strong1019968→1025765只作`derived-new-qualification-not-display`诊断；两r92真实条带consumer的after q/strong逐位相同。没有native source/模型/孔径选择再运行。

[完整现图与范围map](../../../../output/sdss-m82-sky-v2-dependency-readback-1004-r1/actual-whole-dependency-and-current.png)已实际查看：原current RGB原样，边界窄条带新资格和所需邻域可定位。4×4压缩map可能叠色，准确范围以保存boolean arrays为准；图不是新RGB/质量修复。原颗粒、暖底、条带/配准和完整来源链义务不变。

## 本机成本与保留

crop geometry/compact consumer13.339558s/CPU13.234375s，offline峰working set1150935040B/pagefile1053216768B；真实外围10.632145s/CPU10.640625s，峰976044032B/pagefile945664000B；保存读回.729398s/原帧读0、孔径选择0。这是本机离线process与36次分阶段缓存frame加载，不能作4GB测试服/16GB生产/手机native或全小程序200DAU容量验收，也不是36次新增source获取。source载入总量和独立pixel数量不混称。

[局部Windows allocation](../../../../output/sdss-m82-sky-v2-dependency-readback-1004-r1/allocation-and-observation.json)：三新输出目录含测前executed-close共16文件、2319298逻辑B/2359296reportedallocation B、16file identity/maxlink1，前后稳定。排除后续measure/doc/log/checkpoint、旧source/候选/deps/FS内部和Linux实际保留；不折算180GB余量/混合200DAU或未知现金成本。旧证据/源图/frozenrecipe保字节，独审MISSING，数值路径/自审非独审。

## 当前唯一后续

按PLAN顶部实施必要90746目标的**显式noise-v2版本增量**和独立完整三级，复用既有raw RUN/epoch/knownbad/common coefficients/native-ID covariance与signed aperture责任，每块带真实8px halo。新raw/q/strong须对本账本与r92实际两域，旧强/unknown/无依赖current/SCI/alpha/WCS/recipe保持；取消/真实父/source snapshot/旧版本兼容在实际owner验证。不得将新q塞入旧typed v3/旧candidate以绕过源真实性；旧noise-v1执行保留，新model链明确绑定旧父、source implementation和实际执行。账本不供应新版图质，必须完成实际完整LOD/弱结构/星体/科学保真/来源API-registry-static-cache-renderedSourcesBack及成本后才普通采用。无变化旧全矩阵/variance/coadd/fit不重复，大字号/手机暂停与所有失败、目标义务继续原状态。
