# UX19 搜索定位的连续转向与缩放

当前普通为r315，生产14输入见r315-navigation-source-pins.json；原33仍33行/d26d632c…，唯一PLAN SHAc1c931e338cdfde98cc096450d7cbcb85a51f4f6d66ffc20010f83e249b0c410。独审已完成，跟踪侧倾P2由root修复；用户实际中途接管无回跳但随后拖动严重卡顿，整体FAILED并优先排查，不能记该验收通过。r312正常far/near、资料返回证据保原范围；完整性能/iOS仍未验。下文各批次为保留形成过程，当前动作只归CONTINUE。

授权及完整语义见REQUIREMENTS的UX19，唯一PLAN同节已按用户明确指令更新；原33不改。前一性能排查收尾：r306属性重复清理候选无可解释实测收益，NOT_ADOPTED并精确撤回；页面onTouchMove已用refs合并至原single writer，固定时刻格式已有memo，未发现应立即另加Page缓存的具体依据，不继续无界试验。当前普通r307复用与原r301完全相符源，r299已采用球弧复用保。

## 当前方法依据与有界问题

- 固定Stellarium Web源码（原研究7d45c8…）navigation.c在方向上用四元数slerp、FOV另有同clock的smoothstep；这些源码不证明最优联合路径或商业移动版实现，不复制受限源码。
- 既有Starward旋转owner已经用Quaternion.js，browsing-camera持有局部/全天返回，Canvas生命周期有唯一调度与accepted copy。选择、资料、位置query与跟踪已有分责。将连续目标导航纳入同camera，不建新相机或RAF。
- [D3官方zoom interpolation](https://d3js.org/d3-interpolate/zoom)给出van Wijk/Nuij的联合平移/缩放曲线；其适用二维平面，不直接当球面最优证明。已核固定[v3.0.1实现](https://github.com/d3/d3-interpolate/blob/v3.0.1/src/zoom.js)与[ISC许可](https://github.com/d3/d3-interpolate/blob/v3.0.1/LICENSE)。候选把短球弧作为一维距离，按本投影的4tan(FOV/4)转换视场宽度，再由共同进度驱动转向与倍率；近目标保无多余拉远，极端值受原FOV界限约束。许可署名须随任何采用的改编一并交付，不引整套D3或浏览器引擎。

有界验证问：近/远、跨北/接近反向、大倍率跨度是否同时移动与缩放，保持短弧和精确终点，且没有非有限值、反向或超出原视场；成立后接camera、公共定位与真实搜索消费者。失败修本owner或保原，不以demo完毕代替产品效果。实际普通过渡、打断恢复、CPU/包体与独审分别记录，后续记录只提升其实际覆盖范围。

## r308：共同轨迹、页面命令与成功copy事务

共同path把短球弧/平行输运屏幕轴与stereographic宽度的联合zoom曲线放在一次导航；近目标不额外拉远，终点沿原定位尺度min(当前,45°)，轨迹全程受原FOV界限。借鉴固定Stellarium方向slerp及共同clock的方法，未复制其代码。D3 v3.0.1 closed form改编带完整ISC notice并由原copy配置纳入sky/assets/licenses/sky-navigation.json，无新runtime依赖。原文档不证明全球球面最优，目标为可解释短弧/联合变焦。

browsing-camera navigate/update/current/accept持有一次导航，采样不改已绘视角；晚到/替换/取消的candidate在native copy前拒绝，成功copy才推进basis/FOV/elapsed。导航直接续原Canvas RAF writer，不再叠16ms等待；既有fade timer保持原职责，无常驻新loop。页面搜索复用SkySelectedObject原位置query与不可用恢复，取最新实际pick snapshot的basis/FOV起点；资料“看位置”和track共享命令。新选择、手势、锁/Context/公共时刻/catalog/Canvas/visibility退休保原owner；跟踪只暂存导航期间最新valid data，手势从已绘抓取点接管。

r308路径/camera/页面命令/gesture/copy/既有DOM-label责任109/109，类型0；后补“搜索已收起的旧行回调”守卫，真实disclosure+search30/30。初版测试失败均保：一组夹具用不允许的sensor gamma模拟roll，已改实际roll旋转；零位移不再重建同一basis。旧页面fixture缺新导航端口；旧target DOM标签应属于既有OBSERVATION回退，ordinary现为Canvas，及旧deep wrapper严格对象身份断言均按实际消费者修，不改生产标签/红光/无障碍。所有旧失败/preimage保，不以修夹具冒原生或全Goal通过。

r309首普通构建48bb…/285files4910443B、type/build/package/five origins/official均0，尚未实际看；之后补live search disclosure守卫，因此不拿r309验最新源。r310普通search-navigation-clean构建/type在途，source pins归r310-navigation-source-pins.json。当前无手机过渡录像、普通原生结论或本批独审。接下来仅新源包与有界far/near录制/实际查看，不重做原33、缩放、传感器或逐天体文章验证。Context结构校验0只核manifest路径。

### r310→r311：搜索退出与跟踪换时刻边界

r310普通087adc…/285files4910455B、type/build/package/five origins和ISC notice逐hash/official均0，但未capture/观测。串联自审发现：导航期间收到新公共时刻的有效跟踪位置，若只“缓存直到飞行结束”，旧scope退休后该次新位置可能没有再次apply。新增重点例在旧实现true≠false失败（r310-track-time-before.log）；修复为同一有效导航scope继续暂存，换时刻/失效scope立即撤旧导航并沿既有tracking/browsing owner接当前有效basis。相关camera/命令39/39（r311-track-navigation-recovery.log），不改用户主动全天浏览的既有跟踪返回规则。

当时源码因此比r310再新，未用其旧包/旧回执验修复；r311 search-flight-recovery-clean随后编译和类型核0，仍无native动作、movie或独审；r309/r310 ordinary均未作为实见结果记通过。所有前像/初次失败/未推送构建及旧包保。

## r312：实际已绘尺寸与普通手机过渡

定位起点除basis/FOV外也从实际accepted pick snapshot取viewport宽高，避免React canvasSize尚未同步/为0时错误拒绝有效导航；相应命令26/26（r312-copied-viewport.log），最终类型0。现源码13输入逐hash与r312-navigation-source-pins相符，不重跑无变化检查。普通search-flight-current-clean构建/包体/五compiled origin/official均0：SHA3201625fcb0947ede561df106d5bda5ff67371a99f2729d42c30001b99829fa5、285files4910602B，main2075616/content1012709/spot354045/sky1468232；新增ISC notice源/包SHA415fece0…逐字节相符，无新runtime依赖。r309–311旧候选均保，未拿来验当前源。

同账号official后在原配对Android上fresh capture并实际查看；current bootstrap6Hx9IK，实际普通无诊断切换。搜索到HR5958、近邻HR5793各一次受守卫record-tap，原视频、帧、端点截图和实际观察私存在runtime/r312-navigation-observation.json；公开仅元数据r312-search-{far,near}-video和far-flight补充采样，不含private route/secret。补充帧来自同一far原视频并核video hash，没有再次操作或改写原片。

- 远距：实际查看far-flight帧7/10/12/14/16/18。搜索退出后，转向途中可见66.8°，随后仍在靠近目标时50.8°，最后45°且Blaze Star·HR5958居中；当前资料框未打开。这一原生片段证明转向和变焦同段推进，不是先移完再变焦。
- 近距：实际查看near帧9/12/15/19，HR5958→HR5793是短距离移动，周围星座尺度相近，未见多余先拉远；终点Alphecca居中。其后点marker打开Alphecca·HR5793资料，关闭仍保持同相机和选择，相关PNG已私存。未逐项核正文或新增天文精度调研。
- 远片51编码帧/601127B、PTS0–3.803s，近片32帧/546973B、PTS0–4.436s。输入前静止等待含约500ms间隔，不能将其解释为应用卡顿/2FPS；动态区间编码PTS也不能冒物理屏幕FPS或完整性能通过。近距期间还包含原键盘关闭动画，未把它算成相机变焦。

本批正常产品结果已有上述有界原生证据。改选/手势接管/锁/换时刻/Canvas和copy前拒迟到已作owner软件检查，**原生中途打断仍未验**；未以测试fixture代替手机。手机bundle bytes、runtime AppID、实际Console、iOS、完整方向/尺度与独立审查仍缺。当前无build/preview/录像/代理在途；独审须新批明确授权，不复用已结束arc审查授权。

本批审查范围：UX19有效要求及唯一PLAN、上述13输入/前像、原query与成功copy消费者、D3固定3.0.1 ISC notice、相关修前失败/修后检查、r312实际视频抽帧/端点/资料返回。重点查联合路径数值/短弧与终点、相机状态和打断、晚到及生命周期、同帧身份和资源成本；只读，不运行检查/操作手机/编辑/外联。自审不是独审，未授权/未获得结论前保MISSING。

本批只读独审授权已异步询问；无回复前不启动。等待期间7个旧临时feedback/bootstrap目录全部逐文件hash私存后由原owner stop完成，结果r312-feedback-archive-results.json；当前r312及全部output/runtime成果保，旧r293/r300未解锁项未重试。此清理不产生产品通过信用。

## r313：要求编号修正及验证停止点

串联原要求发现UX18已用于图片静默降级/共享错误日志；搜索新需求曾重复使用该编号。现只将新搜索要求、唯一PLAN标题和当前引用统一为UX19，原UX18及用户原文保留。r313-before-PLAN保前像，r313-requirement-identity-readback.json证明除标题编号外方法正文逐字一致、原33哈希不变、13产品输入未变；不以文档编号变化重建或重推普通包。r308/r312原scope/readback保各自真实历史时点，不篡改其旧hash。

本次左向普通拖动42编码帧338309B，原片/端点私存r313-name-left-edge。实际查看取样9（3.240s）/13（3.481s）及端点：所选Alphecca全名接近左缘时变淡、随后整体收起，reticle仍在，Blaze Star全名及北冕座中文完整。private r313-name-boundary-observation.json持video/帧hash与范围，不升级全部运动验收。回查r180自动恒星左右缘与r123/r230所选右缘、r231真实地景/星座中文已有有效同机制证据，因此停止同类再录；本次只保新增观察，不用重复片或更多元数据制造进展。完整名称族/iOS/原生中途打断等缺口仍保原，独审授权等待期间不扩依赖交付；未覆盖的方向/倍率不是新增穷举门槛。

## r314–315：独审发现、跟踪朝向修复及原生接管失败

用户明确授权的navigation_motion_review已只读完成即关闭。审查有效UX19/PLAN、r312代码、检查和far/near/资料实际图，仅发现1个P2：applyTrackedPosition用roll=0重建basis，使搜索保留的屏幕朝向在位置刷新时突然回正。r314-navigation-review.json保原范围，未编辑/运行测试/操作手机/外联。修后未另取得独立重审，不扩大为全Goal通过。

root将既有导航短弧/屏幕轴平行输运移至sky-view-rotation共同owner，持续跟踪从当前local意图旋转到新forward；显式全天浏览保自身相机，不把zenith覆盖回local意图。路径曲线/尺度/Scene/GPU/来源不变。r314初次夹具未形成足够roll仅fixture失败；修正为真实60°roll后，r314-tracking-roll-before-r2在原实现的right continuity真实失败。修后path/camera/actual commands43/43，补全天local分离1/1，类型0；所有前像/失败保留。Context只写共同朝向责任，PLAN/原33不改。

r315普通tracking-roll-continuity-clean SHA6107abe7f56d3794c1e98c98f39eac021ccd12c38fdfd0d3349f637aca263072，285files4910822B，build/package/五origin/official0，ISC notice415fece0…源包相符。用户明确已打开新预览后fresh实见并bind。HR5958跟踪6.7°后原生播放/暂停时间，原片play86帧168091B、pause36帧156861B；实际看play samples3/18、pause20及before/paused端点，邻星方向未见明显回正；未逐帧/全时间验收。随后取消时间回原19:00，没有提交Context。

用户实际点HR8162搜索结果并在飞行中拖动，答复“没有回跳，但是整个星图拖动变得非常卡”。fresh实际图174.4°，只记录无回跳，**整体仍FAILED**，不得以代码取消守卫或单项无回跳关闭原生接管/性能。后续一段450ms普通拖动视频10编码帧86883B，已看3/6/7；含输入前静止间隔，不把PTS换算物理FPS。诊断与未决原因转同一drag-cadence证据，不开对象级工作流。

同时实际跟踪状态遮住搜索标题/关闭X；r318仅扩原quick-settings的hidden条件，保跟踪组件和查询挂载，time底部保状态。13个既有tracking/time披露检查及类型0；普通包/原生修复结果尚未取得。

## r319–322：普通速度恢复及保挂载层遮挡修复

r317人手反馈本次正常，但目标可能已到达才拖，不能确认为飞行中接管。r319仅诊断把导航时钟放慢4倍，用户明确“已接管，之后正常”；后续拖动调度没有放慢。最终可见样本的navigation/animating皆0，只有最后一次拖动计数，不能证明前面所有动作或原速性能。原r315“之后每次拖动都卡”仍FAILED、原因UNKNOWN，本轮没有采用性能修复；不再循环同样相机/诊断。具体计数与限度归drag-cadence同日证据及r319-navigation-drag-observations.json。

r319实际菜单图证明r318的hidden方案未生效，跟踪文字仍穿过菜单。核生成的WEAPP base.wxml：View/ScrollView发布style、未发布hidden。r320仅hidden普通构建保留但未推送；r321共享style版首次类型失败（exactOptionalPropertyTypes不接受显式style=undefined），构建虽0也未推。当前sky-retained-layer由稳定display:none/空style保持组件挂载，已迁移菜单、搜索、图层、quick-status和time五个消费者；各披露仍拥有自己的隐藏条件，底部time保跟踪状态。没有重建查询/草稿、改Canvas/FOV/相机或增加循环。前像、失败与未推送包均保。

r322 retained-controls-current-clean为当前普通候选：285文件4,911,052B，SHA03eb616554d5a95568b7c3589cf763b59af82e61e923508235d6fbad6bd82004，main2075616/content1012709/spot354045/sky1468682；类型、构建、包体、五compiled origin和official均0。既有tracking/time披露13/13仍适用，之后只修style类型。所有observer/慢放源按各自前像hash退休，普通时钟恢复；ISC notice源包415fece0…相符。

同一原配对Android实际从NAV319切到r322普通画面后bind。实际逐次fresh capture并查看：HR8162跟踪时开菜单，跟踪状态确实隐藏；搜索标题/关闭无遮挡；从搜索开观测目标资料时，底下搜索和菜单确实隐藏；Android Back恢复原搜索。选观测目标按原产品规则停止旧天体跟踪，不把该有意选择当隐藏回归。重新跟踪HR8162后，只打开菜单→时间→关闭：底部时间面板及关闭后都保跟踪状态，目标仍居中，原公共10月13日19:00不变。没有重验传感器/双指/日月或逐星正文。

16项当前源码、局部构建重新读回、8张实际已看图片hash、原33/PLAN不变及观察边界归[r322 readback](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r322-retained-controls-readback.json)。图层ScrollView本批仅核同一style消费者及编译端口，未单独原生重走；phone bytes/runtime AppID/实际Console/iOS、完整旅程/性能仍未验。小型可逆遮挡修复的root核对不冒完整交付独审，既有r314独审仍只保原范围。
