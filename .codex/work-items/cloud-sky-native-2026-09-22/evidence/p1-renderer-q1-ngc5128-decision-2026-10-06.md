# P1 renderer只读收口与Q1 NGC5128成品资格

**P1仍UNKNOWN，已有证据不足以安全选择重置对象；转独立Q1，新增ESO成品仅为一次原消费者条件输入。普通不采用。** 产品源码、300WEAPP、六保护项、原服务保持。全33项不缩减。

## P1 实际窗口与IPC阶段

[安装owner与5个日志前缀](../../../../output/p1-renderer-root-1006-r1/lifecycle-and-channel-facts.json)：[现字段读回](../../../../output/p1-renderer-root-1006-r1/window-fields-r4.json)使用实际EConstMessagerName.PROJECT=RENDERER_PROJECT，确认旧log的143行(10-01 02:19:55.125)与37813行(10-02 03:58:29.562)在同一行把本工作区apps/wechat-miniapp与renderer s0/s1绑定。只是历史port分配，不能读成当前内存WindowService map。近期10-06 13:09:55.189的s0 receive heartbeat/status opened/previousPendingCount1证明当时收到心跳，不证明MCP callback完成、源page正确或s1失效。所读前缀零heartbeat timeout close记录；无此记录不证明没有其它路径/日志。

实际ABMessagerService getClients缺client要等待600秒；invoke在取得client后才进入300秒ABMessagerProxy timer。上一轮bootstrap Error Timeout/该timer堆栈与同刻Codex allow可定位至IPC阶段，但无requestId/window/callback，仍不能把失败归到s0/s1，也不能证明ensureStarted/settings rehydration正在等待。OS原13736及当前child renderer存在不提供IPC/window对应。安装archive/EXE/package的9-23时间早于原10-01进程，只读元数据没有支持运行中被更新的推断。

前两版宽松字段读回得到null，不能当缺字段；source enum纠正前r3断言0≠2的失败原日志保留。r4按真实RENDERER_PROJECT/static util-inspect字段读回，不改原日志。历史标签附近scope只作线索，同一行port绑定才是这里的归属证据。所有原始log/body、凭证/命令行未保存，只有行号/SHA/固定字段。没有新增DevTools HTTP/SDK/工具/授权/截图或重启，不循环重扫前缀，不关闭窗口/清缓存/改安装。真实native WXML/Canvas/控件/Back仍未验；仅新具体动态归属和可修owner证据再开P1。

## Q1 新成品与现owner

[ESO具体观测资产](https://www.eso.org/public/images/eso1221a/)与[当前使用条款](https://www.eso.org/public/outreach/copyright/)：NGC5128 WFI历史光学B/OIII/V/R/H-alpha合成；公开credit ESO，默认CC BY4且无具体例外，要求清晰完整可见credit及在线链接、不暗示认可。内嵌Rights也为CC BY4，未覆盖旧版授权。仅目标照片，不恢复任何商业排除源；页面滤镜表不认证RGB通道映射或当前观测。这里使用primary Web读回，不冒Browser UI或真实小程序来源页通过。

沿官方页面的Publication JPEG链接一次取得[完整4000×3912 JPEG](../../../../output/eso-ngc5128-finished-1006-q1-r1/eso1221a-publication.jpg)，3404178B；原XMP/ICC抽出保留，无新图像加工。8547×8358是原高分辨率坐标参考，不把下载照片假写成该尺寸。现prepared_rgb_observation原owner无代码改动接受ICRS/J2000/TAN/无CDMatrix，按成熟PyAVM缩放约定处理细小rotation；[源资格](../../../../output/eso-ngc5128-finished-1006-q1-r1/result.json)、[名义覆盖/身份](../../../../output/eso-ngc5128-finished-1006-q1-r1/nominal-catalogue-readback.json)保存精确事实与hash。

固定OpenNGC原CSV NGC5128类型G，目录未新增。目录椭圆四边仍有约828/601/395/656px名义余量；49方向成熟库逆回误差约2.2e-10px只证明名义自洽，不证明绝对配准或全部观测外围。完整源在tool缩放呈现已看：保halo/dust与左上jet等弱结构、密彩色星点和亮星晕；足够继续一次现whole-source/page消费者条件试验，不能据此称照片外沿、连续背景或原生细节合格。没有抠黑/PSF/裁边/去星/生成细节；未生成三档/出版/Scene，科学availability UNKNOWN。

Q1从这份缓存继续，不重复下载、未采用就扩批或扩一般registry。当前一次公开图供给总3404178B；许可未知不填零，完整实际来源/线上链接、全发布消费者、弱外围、一般目录重复/整场物理峰与设备仍开。旧NGC5907当前显示FAILED和所有原失败保留。

Q1 复用缓存ESO eso1221a/NGC5128完整成品作原消费者有界决定：当前一次官方出版JPEG3404178B/4000×3912、原XMP/ICC与ESO CC BY4已读回，现AVM/TAN owner无产品改动接受；固定OpenNGC NGC5128 G、名义椭圆内余量及49方向成熟库逆回仅支持条件试验，科学/绝对配准/弱外围未验。下一沿现whole-source publisher、现page/Scene与原区域合同复用完整源做概览/中/细及原来源/公开Back/暖回/退休和整场驻留/临时峰，实际看完整照片外沿、原halo/jet/dust、照片内外星点与重复；用实际像素/投影/压力定初档，512/1024/2048不作需求上限，不裁窄/抠黑/羽化/关目录/PSF/无变化重加工掩缺。未决定图质/来源/完整发布消费者前普通Prepared空/HiPS关，目录不扩；名义椭圆不定观测范围上限。P1只读收口：getClients缺client为600秒，而原300秒Timeout在已获client的IPC阶段；历史s0/s1都曾指此工作区，近期s0收到心跳，不是失效证明；无动态window/callback归属或运行rehydration证据，不安全选择关闭/重置对象，保UNKNOWN，不延超时/重发initialize/SDK/截图/扫日志，不改安装/重启原3432/24040/13736。仅有新具体动态归属/可修owner证据再开P1。原R1、NGC5907等当前FAILED、全部33项/完整体验、真实权限/可见时长/物理峰、Android-iOS/新版月面/200DAU/独审保开放。Goal active无预算，无提交推送采购部署发布外联。
