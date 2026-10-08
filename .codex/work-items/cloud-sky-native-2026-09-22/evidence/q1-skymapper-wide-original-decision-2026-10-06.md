# SkyMapper同源外围/宽域：8°原成品配置退出

0.4°完整原像素预览保留M104暗带、两侧与外围；仅条件几何/供给输入，不是新native验收。8°/order3预览和四张完整原PNG均出现斜向绿色/紫色带、红色块及拼接矩形；原成品本身已有，当前显示配置FAILED退出。不补该配置的保守预取邻格，不出版/扩入产品，不用调色、抠黑、feather、PSF或生成掩盖。有限区域成功和本粗阶失败各守范围，不把SkyMapper全库判失败或禁商用。

## 新输入与当前相机

[当前plan](../../../../output/skymapper-m104-wide-plan-1006-q1-r1/plan.json)复用上轮实际公共正式地点的M104已完成相机、观测矩阵和2026-10-06T13:00Z时刻，将视域离线改为0.4°/8°；无修改页面/相机/源代码，未运行新page/Scene或重新编译。390×844，成熟HEALPix与当前inverse projection按正确column=NW,row=NE取原像素中心，未改源颜色。

当前选择器0.4°wanted为order8的12格；名义视口实际需要六格[401328,401329,401330,401331,401332,401334]，均已缓存，零新图。8°选择order3七格[389,390,391,396,397,402,408]，实际需要四格[391,397,402,408]。先只取四张必要原成品，而非先取得完整保守cap七格或其它阶。四URL各一次默认TLS证书验证，508,264/477,379/490,708/455,565B，共1,931,916B；无重复下载月面/既有七PNG/全库。

[原源与请求](../../../../output/skymapper-m104-wide-source-1006-q1-r1/Norder3-Npix391.png.request.json)均保；[修正后只读结果](../../../../output/skymapper-m104-wide-inspection-1006-q1-r2/result.json)绑定完整原PNG/解码、两329,160像素地址和MOC。两视图missing0、名义MOC100%，原alpha全255；科学mask仍UNKNOWN。名义覆盖不认证图质、真实观测有效性或绝对天文配准。

查看[0.4°](../../../../output/skymapper-m104-wide-inspection-1006-q1-r2/view-0.4-nearest-original.png)、[8°](../../../../output/skymapper-m104-wide-inspection-1006-q1-r2/view-8-nearest-original.png)和四完整512²原图：391有蓝块/明显斜向网带，397有绿紫格差，402有红绿面状拼接，408有明显红矩形及色差。它们已经是CDS成品原像素，当前几何地址不是修色工具。0.4°原区域暗带/弱外围保留，紫色噪声也保留；没有将一个raw预览冒完整target/native图质通过。

具体收藏与授权沿已核SkyMapper DR4原CC BY4.0/ANU完整署名、加工CDS/CNRS-Unistra ODbL和真实creator_did；原properties/原DR4 DOI/权利元数据均未改。v2缺加工DOI/完整版本机器可读及实际开发消费者成果保留，但这四图未出版、未普通采用，公开合规/发布仍NOT_COMPLETE。库约6.34TB不镜像，180GB仍全机共享预期，新增1.93MB原图不证明全机容量。

首次采集四图及两PNG预览已完成，末尾MOC统计NumPy int64在JSON编码失败；原r1图/请求/错误日志保留。r2仅将该统计转成Python整数并只读既有图，0网络请求；原r1/r2两个预览SHA完全相同。没有因诊断序列化失败重复下载或重跑产品路径。

## 新恢复线索及唯一下一依赖

本次另只读原r4已封存643阶段/64完成帧，并沿已有同帧视口原格资格核序：[第一可见格顺序](skymapper-first-visible-order-2026-10-06.json)。两个视口外cap格401307/401328先qualified，中心401329在首outside后60.1ms就绪；中心qualified至首有来源Scene开始另73.8ms。当前按数值格顺序开始原loader/native请求。这个具体顺序可有界比较，不把完整431.1ms恢复全归同因或据软件时间冒真实设备性能。

R1 HiPS来源Back首可见格优先有界比较：SkyMapper实际M104时序显示当前数值顺序先解码两个视口外保守cap格401307/401328，中心可见401329晚60.1ms qualified；其至首有来源Scene开始另73.8ms，四null/两partial仍FAILED。复用现v2七PNG、当前page/Scene与原encoded/native队列，先核current-camera中心/可见优先的最简单排序，在原两槽、20MiB光学源/32MiB encoded压力内做失败前反例和实际cold/warm/同帧来源/来源Back/终态像素/整场峰/取消/退休有界对照。只优化已证责任，不加调度框架、盲扩缓存/槽，不把排序收益冒连续恢复全部通过；native-ready至Scene间隔及Canvas生命周期另分因。Q1数据义务独立：当前SkyMapper 8°order3四原PNG有明显原生色块/拼接痕，配置FAILED退出，不再补其预取格或扩大产品；0.4°六缓存原格仅名义原像素条件预览，旧0.15°/0.25°有限候选/真实缺DOI v2与完整CC BY4.0-ANU/独立ODbL开发成果保留，不外推整库或普通采用。新的成品/元数据或供给证据才重开退出配置，不重复同图/TPV/PSF/全库框架；合格广角/区域与P1不被所有运行优化串行阻塞。DevTools/Android-iOS/新版月面/完整图质交互/科学UNKNOWN/绝对配准/公开发布/物理200DAU容量/独审与全部33项开放；SDK无新根因不循环。普通Prepared空/HiPS关，Goal active无预算，不提交推送采购部署外联。

本增量为PROGRESS：以四必要成品快速作退出决定，避免扩八额外cap格及不合格宽域消费者；已有真实区域/合同不回滚，原科学与广角/完整交互义务保持。62源码/300 WEAPP、六Settings/outbox、原服务/全部旧原图/失败/未提交文档保留；未改产品代码。新输入成本按实际四HTTP与1.93MB源留存，Agent/复核费用未知不填零。全部33验收行原文不变；Goal active，无预算，未完成。
