# C05 月面高纬采样归因与原 renderer 修复

上一Goal turn为PROGRESS：真实月面公共消费者已取8视图，但低倍率高纬opaque残差max22.51、月缘下层仍未归因。本轮沿原已保存disc/GPU参数与真实PNG、当前renderer/TWGL，不下载/加工、不重播全矩阵。普通Prepared空/HiPS关、fixture false/无props页面、Mellinger仅低分辨率DISPLAY保原。

四真实保存几何：Sep29亮相完整/细视图、Oct2较亮半相完整、Sep29南极高倍率。原renderer独立读回与已保存page opaque像素逐通道差0，证明可在原owner复现。用RGBA32F读实际GLSL p/discriminant/longitude-latitude/brightness/edge与texture2D结果，不把CPU坐标当GPU实际值。CPU精确求交与GPU p最大差0.00017156；GPU源UV最大偏移1.27622纹素，陡峭高纬纹理形成max22.51354颜色差。按GPU真实UV双线性读取原PNG时最大仅约0.50002，按GPU真实sample/brightness也仅量化级，故不是PNG内容/alpha丢失或LINEAR有错。浏览器2D解码读回与原PNG差48111通道；拿它作黄金反而max5.83，不能冒原GL texture上传源。现GL直接sample证明原PNG正确，不修改源资产。

有界任务变体用gl_FragCoord按实际drawingBufferWidth/逻辑width、drawingBufferHeight/逻辑height还原逻辑像素，保原中心/投影半径/扁球轴/相位/阴影与来源。四variant opaque CPU期望max0.50383、GPU UV最大偏移<0.00086纹素，原max>20的反例会失败且修后<0.51；不是放宽旧失败阈值。然后仅在原bodyTextureFragment与paintBodyTexture加入u_discCenter/u_discRadius/u_framebufferScale，使用实际片元位置，不新增相机/星历/框架/缓存或资源层。Moon、Mercury、Mars、Jupiter、Saturn、Uranus、Neptune共用该真实纹理入口；Sun/无纹理相位和原低于4px解析回退保持原路径。把它称为quad UV插值偏差，未宣称某款手机/驱动底层实现已证实。

月缘实际下层是solarLight（夜间低空模拟辉光），外场11/16/27而最终导航clear8/13/23；上一轮清屏色假定不成立。当前原renderer单独读回该同刻下层，再用实际GPU edge与sample合成，四original样本limb最大0.54706；修后actual page三重点视图最大0.63473，opaque max0.50383、南极CPU footprint约-89.9102°。这些是保存视图同原page的受控采样/混合证据，不证明全时域、所有极区源支持、全部图质或微信native。

一次因renderer源码变更而必要的普通524输入bundle重建，actual page只取bright-full/south-polar-detail/quarter-full/original-restored，105Scene/141请求/4当前保存视图、3明确日期提交（rev1→4）；Oct2实际核心点选/缺测资料/来源measured-area coverage/Back同Context，Oct6恢复原id/fingerprint/地点/时刻后Map。完整缺测仍中性灰、部分灰矩形仍真实缺测，不生成地貌。实际新增disc uniforms与同已绘几何/拾取半径一致；南极核心屏外不冒真实核心点击。最终decoded/GPU texture-buffer/逻辑RGBA/pending native/encoded模型0，不称全机磁盘或物理内存0。

七真实纹理body用原保存当前几何与其匹配GPU SHA的原资产，各390×844和781×1688 backing，共14实际GL geometry样本，包含扁球。后者横纵scale不相同，证实使用实际backing scale；最大逻辑位置差约0.00001583px，Float32保守八操作舍入界8×2^-23×844=0.0008049px，仅数值舍入界，不是设备精度/资源预算。37既有月面/行星/纹理生命周期检查与当前tsc无emit通过；类型工具session72828终态exit0/空输出，PowerShell Tee对空管道没建log，按真实exit/source hash写receipt，未为补空文件重跑检查。

8有界renderer诊断各单构建：r1原shader取值成功；r2任务mutator漏fragment u_resolution导致plain回退，旧true draw不足以证明纹理；r3补声明后coords模式优化了u_image，错误诊断guard失败；r4核新disc均匀变量成功；r5产品shader成功。scale r1错planet签名使image落observationMode而拒绝纹理；r2固定签名后Neptune非均匀backing的归一化误差超过任意2e-6阈值；r3改以逻辑像素和Float32 operation舍入界核查，14通过，实测保留。全部失败日志/代码/产物保原，产品没有随失败乱改。另一次启动命令路径拼错MODULE_NOT_FOUND未启动浏览器/API；严格读回最初等不存在的空类型log ENOENT，原script/log保留后按已完成工具receipt修诊断。所有9浏览器（8diagnostic+1page）退出，原watch/BFF/IDE未重启，无新DevTools请求/外联。8shader diagnostic builds与1完整page build分开，不冒WEAPP新CLI build。

当前差异仅renderer.ts和watch自动更新Sky detail index.js/map；其余117源码/298产物、六项Settings/outbox、历史失败/旧提交10px UNKNOWN/三暖54341B未全归因及33账保原。独审MISSING，Android/iOS新版月面、DevTools真实组合、完整图质/真实账号/容量均未验。见[实际page严格读回](lunar-sampling-readback-2026-10-06.json)、[原GPU归因](lunar-sampling-analysis-2026-10-06.json)、[修后page数值](lunar-sampling-page-analysis-2026-10-06.json)。

唯一下一依赖：C05/V04 昼暮/地平与地景同帧消费者：月面高纬残差已归因于原quad UV插值偏移，原bodyTexture使用gl_FragCoord按实际backing scale还原同投影/拾取盘坐标，实测opaque最大22.5135→0.50383、月缘真实solarLight下层max0.63473；4当前普通page视图/105Scene141请求、3日期提交来源Back/Map恢复、37检查类型、七真实纹理body两backing尺寸14几何样本通过。只renderer1源码及watch Sky detail JS/map2产物改变，1普通bundle重建/1page运行，8有界shader诊断（含失败）全部退出；不顶完整月面/原生/物理。唯一下一沿现公共日期/时间/跟踪/相机和原Scene solarLight/landscape owner，选可区分夜间/晨暮/白昼及地平上下的真实日月视域，核同刻太阳高度/大气显示/地景实际遮挡与中心平滑淡出、后方星空显露、需求/拾取和恢复一致；发现偏差修原owner，不重播九天体静态/时间或已闭月面采样矩阵，不新星历/天气/DEM框架。实际DevTools/native/Android-iOS新版月面、其余完整图质/多日期精度/真实账号/33项/物理200DAU/独审仍开放。旧10像素max1 UNKNOWN、三暖重复54341B未全归因及FAILED照片保原。普通Prepared空/HiPS关、Mellinger仅低分辨率DISPLAY；Q1仅新合格覆盖几何权益再开/ESO6k退出，P1仅新具体callback/window/rehydration证据再开，不重复初始化/SDK/log或重启服务。Goal active无预算，无提交推送采购部署发布外联。
