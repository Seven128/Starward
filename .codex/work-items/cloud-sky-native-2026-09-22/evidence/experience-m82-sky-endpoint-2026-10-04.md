# M82完整三级试验、官方SKY端点与真实增量消费者

本轮仅改云观星离线`sdss_frame_noise.py`及两个相关测试，新增五个Sky任务脚本及对应文档。指定工作区/分支/HEAD保留，六项settings/outbox保护字节相同；未提交、推送、部署、发布、采购或改变其他业务逻辑。普通Prepared/science registry仍空，目标未完成、active无预算。

## 完整显示试验

完整[结果](../../../../output/sdss-m82-full-smooth-range-1004-r1/result.json)复用保存current gri/joint、原共享box-means和冻结stretch=.2358548697680099/Q8。OV/MED/DETAIL均512²，所有科学/当前估计/资格/alpha/WCS/旧recipe原字节保持；新候选独立[manifest](../../../../output/sdss-m82-full-smooth-range-1004-r1/candidate.json)，display-only全局`C/(1+maxC)`，不是科学校准/天空估计。没有重读天文原源/检测/variance/PSF/wholecoadd/filter/孔径选择。

三个完整对照页及全部20已核目录星体适用21层级已查看（20 OV、1 MED；DETAIL无这些目录星体，不供中央星体身份）。原9局部试验与完整输出对应crop精确。原maxRGB硬归一化子集5080/19783/73804像素，各最大8bit层次1→45/51/53；PNG488982/553654/472527B。均RGB从[41.883,30.598,15.658]→[29.737,22.151,11.410]、[108.057,77.920,39.000]→[69.169,50.712,25.529]、[189.381,130.901,59.611]→[108.599,75.695,34.457]。20星体OV最大通道139–255→90–155。中央层次有所增加，但画面/星体整体变暗，条带颗粒保持，暂不提升默认共享显示。一次9.989567s/CPU9.984375s、offline峰working set194392064B/peak pagefile503492608B，非端云容量。

## 官方来源纠正边界假设

[SDSS frame datamodel HDU2](https://data.sdss.org/datamodel/files/BOSS_PHOTOOBJ/frames/RERUN/RUN/CAMCOL/frame.html)说明SKY已从frame科学数据扣除、应按双线性重建，run末尾短Y网格端点采用constant而非linear extension；其IDL例子用`interpolate(...,/grid)`不指定MISSING。[IDL INTERPOLATE官方文档](https://www.nv5geospatialsoftware.com/docs/INTERPOLATE.html)明确默认越界坐标取最近合法边缘值，计算double、输出与输入类型相同。官方网页/回执保存于[authority](../../../../output/sdss-frame-sky-endpoint-authority-1004-r1/)，未获取新天文图像、未安装IDL。缓存SciPy nearest仅为任务数值oracle，不增生产依赖/库授权范围。

因此r91“科学四邻网格也决定SKY可用性”的实现假设被反证。旧源码/测试和失败日志保持；`retained_sky_samples`明确`sdss-retained-sky-idl-bilinear-constant-edge-v2`。原完整网格内部继续原算术；边缘clip坐标并重复最后行/列邻点，有限网格值方可重建。raw `sky_geometry`诊断不再当availability；真实NaN/Inf坐标或触及网格值、坏calib/science/negative variance仍未知。原CCD几何/科学四邻和处理flags不变，无科学填补、再扣sky、零noise或新confidence。

[修前owner失败](m82-sky-endpoint-before-2026-10-04.txt)复现原CCD col0合法noise被拒绝；[修后9项](m82-sky-endpoint-after-2026-10-04.txt)覆盖实际边界/官方数字/短一行/真实nonfinite。第一次[受影响检查](m82-sky-endpoint-consumers-2026-10-04.txt)49通过/1失败：旧恢复测试以finite SKY坐标10冒未知。原测试字节归档后拆成finite constant-edge保持相同供给/科学和nonfinite坐标保未知两个测试。[修后受影响检查](m82-sky-endpoint-consumers-fixed-2026-10-04.txt)58项通过，含noise、源差异、供给、孔径、adaptive/真实父、provenance；不冒全部目标/手机验收。

## 真实改变的资格、raw供给及共同孔径

[四区结果](../../../../output/sdss-m82-sky-endpoint-consumer-1004-r1/result.json)只读12 active原frame，4668实际端点native samples逐值等于SciPy nearest及官方条件方差；此前未知4094点新可用，其余内部finite variance逐位保持。原native IDs/权重与科学采样精确。下列资格是有条件noise/原flags门槛，非完整质量。

|实际128²域|原资格→新资格|新增资格|仍未知/处理拒绝|
|---|---:|---:|---:|
|outer-stripe|14797→15406|609|978|
|upper-stripe|14857→15415|558|969|
|lower-galaxy-stripe|15331→15331|0|1053|
|warm-core|15940→15940|0|444|

[两个条带实际增量](../../../../output/sdss-m82-sky-endpoint-apertures-1004-r2/result.json)用144²真实8px halo，仅新资格/variance/strong/raw供给改变可影响的最大8px圆作为调度需求，调度不是新科学mask。复用已有`_project_scan_samples`、`_select_scan_supply`、`_effective_recovery_samples`与native ID协方差共同孔径；保不同RUN/完整正贡献/不重叠MJD/已知bad-other规则。旧实现counterfactual独立任务注入且finally恢复，旧全图候选未变：两个域旧raw供给、q/protected、所请求radius/reached/estimated值与保存旧候选精确，不能冒新v2已经进入旧publication。

|域|需求target|供给before→after|恢复后q before→after|估计改变target|新仍未知/处理拒绝|
|---|---:|---:|---:|---:|---:|
|outer-stripe|2974|157→160|14954→15566|1610|818|
|upper-stripe|2827|97→122|14954→15537|105|847|

outer需求半径-1/0/1/2/4/8由1176/20/251/591/936/0→559/29/249/594/963/580；upper由913/1760/22/66/66/0→333/2279/28/81/105/1。强signed全部gri raw保持、真正unknown中心保raw，孔径不桥接flags/unknown，不用filtered父作新测量。只本次必要有界增量选择，未重复旧全矩阵/全图variance或filter-coadd/获取。

r1任务在科学数组元数据`g`而非`g-science`入口失败、原执行/失败保留；发生于原frame读取前。r2仅修task key。[读回](../../../../output/sdss-m82-sky-endpoint-apertures-readback-1004-r1/result.json)直接保存raw圈/排强邻点/mean scalar读2601个新均值精确，旧实际冻结LOD crop精确；适用outer OV、upper OV/MED新RGB变136/31/67像素，三个同条件对照页实际查看。局部颗粒有所减轻，条带/绿色结构仍在；无DETAIL对应crop，也无新版完整候选，不能外推整图图质/绝对配准/PSF或验收。

四区13.749319s/CPU13.703125s，offline峰working set208687104B/peak pagefile960004096B；两区消费者8.080521s/CPU8s，峰433528832B/pagefile799006720B；读回.415431s、不重新读原frame/选孔径。阶段合计12+12缓存frame读是不同真实消费者，非新源获取。末尾核全部输入pin相同。

## 保留、成本和下一依赖

[Windows allocation](../../../../output/sdss-m82-sky-endpoint-apertures-readback-1004-r1/allocation-and-observation.json)只测本轮六个输出目录（含测前executed-close）：47文件、45751892逻辑B、45847456reportedallocation B、47独立file identity/最大link1、前后稳定。排除随后测量/doc/log/检查点、旧源/候选/deps、FS内部/Linux实际保留及全小程序200DAU混合业务，不能充180GB磁盘或端云容量验收；没有把未知费用填零。

r91 414源中只3个Sky owner/测试和5个Sky文档/入口允许改变，原3源码字节归档；旧6660证据、6保护、原BFF/watch进程开始时间保。当前绑定由r92检查点和对应post-continuity维护，不重复加工证明保持。自审/数值oracle/测试并非独立审查，独审MISSING。WXML Canvas失败、手机/新版月面、Android/iOS、strict SourcesBack、M51/W3、实际静态/retention/200DAU容量与33义务继续原状态。

唯一下一依赖见PLAN顶部：先测新noise v2在整图真实资格/供给/最大8px需求，不把旧资格snapshot标成新版本；只有必要依赖增量进入独立新版完整三级，之后完成科学保真/图质/来源API-registry-standardstatic-cache-renderedBack和成本链。原科学与旧recipe/candidate不改；普通registry在质量与链路通过前保持空。
