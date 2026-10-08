# C05 月面 coverage-v2 公共消费者与剩余光栅归因

沿当前无props普通page/实际Scene，fixture false、Prepared空、HiPS关；复用524输入bundle、旧源图/coverage-v2已发布PNG、服务与watch。本轮产品/测试/WEAPP源码0改，构建0、下载0、加工0、DevTools新请求0。r1完整6视图和r3定向2视图成功，合186Scene/271请求；r2诊断失败保留，不把失败请求/Scene混入成功路径数。控制端口/Taro JSX/software WebGL及test weather/repository仍非真实账号/WXML/native样式合成/手机/容量。

public date按钮仅允许当前Oct6前7后15天，Sep29约0.899715照明、Oct2约0.617095、Oct6原残月约0.187779。没有通过注入日期拿界外满月：bright/quarter只是诊断标签，quarter不是严格半月。Sep29/Oct2 FOV1.5盘半径151.545/150.839px，FOV0.5半径454.640/452.523px；真实历史灰度地貌及缺测灰矩形可见，无黑矩形或生成地貌替代。源仍1994 Clementine单波段750nm，非实时/自然色/测光产品。

原PNG SHA ba7b9eef33d3e4d25c251f79641c39ea5526c35edb5c262eecffb3dea67b23f6，2048×1024/1,595,187B。来源/加工/pub合同复读：GeoTIFF v2.1原4,247,470,871B，源SHA与历史记录保原；正东经/planetocentric simple-cylindrical；NoData0，45×45真实非零面积均值/alpha有效面积。11540 fully missing与57499 partial输出像素保原，不重加工/下载。实际GPU image绑定/current源同SHA，Moon u_profile0/colorMode0/polarRatio1，照明/方向与本体轴Float32同当前Scene，fallback #6F7175。空/部分覆盖是数据含义，不能把中性矩形写成修复源缺口。

r1 Sep29/Oct2真实核心点选→资料（缺测含义）→来源route（measured-area coverage）→Back同刻同Context；Oct6恢复原id/fingerprint/location/selectedAt/localDate，revision1→4，3明确日期提交。r3 Sep29内场3次拖动停止跟踪，实际盘中心x=-168.900/y=153.378，南极投影在视口内、半径454.642；中心在屏外故不宣称真实核心点击，原Scene仍绘可见月缘。随后Oct6公开恢复及Map，revision1→3，2提交。两独立Context不互相合并。

r1 bright-polar-pan名称保留但44px纵移的opaque只到-60.38°，不是高倍率极区。r2起点x380在390宽画布右16px边缘，原onSkyTouchStart edge=true/onMove拒绝，跟踪与相机未改变，诊断等停止跟踪而超时。准备脚本旧TIME_CONTROLS归因错误，现源码/真实参数纠正为EDGE_GUARD；没有产品缺陷/修复。r3起250/400，3有界内场拖动取真南极。r1/r2/r3均terminal且cleanup读回browser/API关闭，原服务不重启。严格读回最初错文件标签bright-information导致ENOENT（实际bright-polar-pan），原脚本/失败说明保留，修诊断后通过，无runtime重播。

查看8幅实际PNG，读取原RGBA，数值CPU按实际本体轴/相位/源RGBA作只读对照。第一分析误纳顶部导航导致最大103.48差，原分析/日志完整保留；第二分析只排除当前实测status24/capsuleBottom60传入renderer的y<60，未任意滤掉月面。opaque sq<=.96：完整缺测最大0.4991968，纯灰符合当前亮度；高倍率中低纬partial最大1.0304/0.7213/2.2424，measured最大1.6753/1.1892/3.4114；南极opaque 3077个|lat|≥75样本、CPU到-84.3048°，partial max3.4356/measured4.3336。只能关闭这些开发消费者里的完整缺测含义，不关闭全部采样/图质。

低倍率Sep29/Oct2高纬仍partial最大19.5552/22.1410，measured最大16.1950/22.5106；没有归因便不能写PASS，不能凭残差先改shader。南极另做sq>.96至.9998的limb footprint CPU范围-89.9102至-41.8055°、20fully missing/721partial/4997measured、2116polar；alpha可见边缘而非opaque。当前limb期望假定clearColor下层，实际solarLight提交、外场像素11/16/27与导航clear8/13/23不同，故这组差值无通过结论，必须用真实下层与GPU实际坐标核查。CPU footprint不是GPU atan/采样坐标的独立黄金值。见[opaque数值](lunar-raster-analysis-r2-2026-10-06.json)、[月缘假定分析](lunar-polar-limb-analysis-2026-10-06.json)、[严格读回](lunar-quality-readback-2026-10-06.json)。

两成功路径最终decoded/逻辑RGBA/GPU纹理buffer/pending native/encoded lease队列模型0；fsLogicalBytes26是非图像用户持久缓存，不把全机磁盘写0。原34检查/类型按源码hash继承未重跑；资源物理UNKNOWN、独审MISSING，原33义务/新版Android iOS/完整图质保开放。旧Context提交10像素max1 UNKNOWN、三暖重复54341B未全归因及FAILED照片不改。当前Goal active/no budget/not complete。

唯一下一依赖：C05/V03 月面剩余高纬/月缘光栅归因：新版coverage-v2普通公共日期/缩放/来源Back/恢复已补8保存视图，Sep29约90%及Oct2约62%照明、151px/454px盘及南极高倍率，186Scene271请求524输入、5明确日期提交、原build复用/产品测试WEAPP0改。完整缺测中性灰最大通道误差0.4992；高倍率中低纬部分覆盖仍显示真实灰色缺测矩形，不虚构地貌。原44px纵移不是极区，r2 x380触发16px边缘拖动保护失败保留，r3内场3次拖动真正取南极；CPU limb footprint近-89.91°不顶GPU精确采样或极区图质。排除实际导航y<60后低倍率高纬opaque最大残差22.5106仍UNKNOWN；月缘不是清屏色下层，实际solarLight已提交，当前清屏色假定比较无PASS。唯一下一直接在原sky-gpu-renderer/TWGL采样owner以已保存真实disc/GPU参数/源PNG做小范围GLSL坐标、atan/LINEAR及真实下层合成读回，对照CPU精确扁球求交/Float32顶点；证实owner偏差再修并回归受影响实际page，不凭假定改shader/滤掉残差。不重播九种静态/时间/相机按钮或完整月面矩阵，不重新下载旧月面/无变化加工/生成地貌/PSF/新星历框架。完整月面、多日期几何/昼暮/地平/图质、Android/iOS新版月面/DevTools原生/真实账号/33项/物理200DAU/独审仍开放；最终模型0不冒物理测量。旧10像素max1 UNKNOWN、三暖重复54341B未全归因及FAILED照片保原。普通Prepared空/HiPS关、Mellinger低分辨率DISPLAY，Q1仅新合格覆盖几何权益再开/ESO6k退出，P1仅新具体callback/window/rehydration再开，不重复初始化/SDK/log或重启服务。Goal active无预算，无提交推送采购部署发布外联。
