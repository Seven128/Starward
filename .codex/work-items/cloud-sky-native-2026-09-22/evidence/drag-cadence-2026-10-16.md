# 当前拖动掉帧反馈与有界归因

用户明确当前问题为整幅画面拖动掉帧，文字没有单独脱节；停下才可看清细节，随便一个视角都有此感受。90°只是例子，不新增倍率阈值。沿原PLAN B/E/F继续，图像冻结、画质与功能保持；此前AppBrand窗口数据不证明本项通过。

## 普通r267原始样本

01:32实际手机由用户调至118.3°，同一普通r267（SHA0348af0660fc8989f0f490eec130c400bd0669c117a39a17fb2be4147f11e8a7）守卫单指(.35,.42)→(.65,.42)，1800ms，8秒私有录屏。实际看了前后整图、原编码第20/45帧与六个原像素局部；没有用重复截图冒视频。原录屏82编码帧，PTS跨度5.743089秒含静止段，最大编码间隔2999.055ms是输入前静止，不能称Sky卡住3秒或换算物理FPS。原始像素/帧保私有runtime，metadata在output/cloud-sky-native-updated-ide-2026-10-12-r1/r268-wide-drag-before-video.json。

既有trace-native-caption方法仅作局部排除：盾牌座模板及邻点82帧相对横位移范围[0,2]屏幕像素，最低模板相关.8873；包含真实投影曲率、压缩/跟踪误差，不能证明全局同步。用户已进一步明确并非文字脱节，此分支停止扩展。

## 同工作量的软件提交样本

复用r50有界observer，在最新Page/Scene插入整数Date.now阶段计时；没有逐帧诊断界面，没有换渲染器/数据/相机。两版均官方预览、实际同90°北向初态、同公开示例点/2026-10-13 19:00及同1800ms守卫横拖。包含180ms收尾和observer开销，Scene/names等重叠，不能加各最大值当整帧或称物理FPS。

| 指标 | r269修前 | r270局部修复后 |
| --- | ---: | ---: |
| touchmove | 199 | 201 |
| draw请求 | 330 | 220 |
| 成功copy | 124 | 139 |
| React render | 126 | 142 |
| 输入span ms | 1793 | 1799 |
| copy间隔mean/P95/max ms | 14.37/23/29 | 12.70/21/27 |
| Page调用mean/max ms | 2.75/12 | 2.30/5 |
| Scene调用mean/max ms | 7.64/23 | 6.68/20 |
| 同步copy mean/max ms | .10/1 | .11/1 |
| 名称准备mean/max ms | .45/3 | .38/1 |
| 原生非合并update计数 | 117 | 132 |

r269 SHA4a2d59989e4dbc099bf28a7b83f2a3301903b6de1e7b53c9d27b0dcfee7314bb；r270 SHA17cc060f738d05571a4866413b430ab0a60ad56ee1b39258b15b1bdf6e6791e7。实际before/cost PNG私有r269/r270-probe-*.png，已查看覆盖数值。单次顺序比较只支持本样本局部改善，不能隔离热机/系统变化或证明全角度顺滑；剩余artDraw最大14/16ms，原因尚不能由阶段名决定。

## 已修复与下一边界

useSkyOpticalHips在普通未启用/无供给时，相机变化生成新的空候选/空tiles，导致Page的draw依赖变化，反馈出多余请求。沿同Hook保稳定空值，不缓存旧视野/图像，不限制输入；真实试用图片到达、父细层、当前原生快照、hide/retirement仍更新。完整Hook→Page同类依赖回归修前6次draw变化（期望1）失败，修后通过；含真实新增图片及退休负例，受影响7项和恢复6项通过，无跳过。前像、修前/后日志保output/r270-*。

r269临时Page/Scene按当轮精确hash守卫已恢复到最新r267原像，helper归档；r270局部修复仍在源码。第一次恢复检查在临时Scene导入Taro诊断组件时遇Node出口错误，保原日志，恢复普通源后6/6；这是诊断夹具与Node环境边界，不是手机失败。

本项仍FAILED/UNVERIFIED，继续定位原生/GPU和共同提交节奏；没有证据时不迁字形图集、替换渲染架构、降画质或把局部CPU数字冒原生通过。原33和唯一PLAN保持。

## GPU与官方真机调试边界

r271同公开点/90°/1800ms，标准WebGL1 EXT_disjoint_timer_query能力实际为UNAVAILABLE，0个有效query；没有将Date.now或GL返回当GPU耗时，也未改参数/换扩展反复探测。仍保131次copy、mean13.46/P9520/max29ms及CPU Scene mean7.28ms样本范围，不是另一次修复收益。实际PNG为私有r271-gpu-unavailable.png，临时Page/Scene/helper已精确恢复/归档。采用的是[Khronos标准异步查询语义](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query/)，仅available且非disjoint才可读纳秒结果，资源在收尾/退休释放；本机能力缺失不等于GPU零成本。

用户再次询问真机调试能否供数。核读当前官方0.3.11根/Debugger/tool-index及已有r177真实结果：真机运行时曾实际连接，Performance的Record/Memory界面存在，但Record持续Initializing profiler、Time不动、Stop disabled，没有有效CPU/内存记录；此后已从官方UI结束调试并见WebSocket closed。当前官方已公开工具没有独立Profiler导出接口，不能把Console/Network/连接成功或普通预览当性能trace，不重复同一失效录制入口空等。保当前无数据边界，并继续可执行局部诊断。

原r27在更早45°输入与旧源码的RAF试验只保平均copy/调用成本不占优，不能认证本次用户的全视角掉帧已闭。当前已消除无供给资源反馈且用户明确问题是整帧节奏，有限复用原同Canvas RAF/timer切换owner，在同一新候选90°做一次成对软件与AppBrand窗口间隔对照；不是重开调度架构或预定采用RAF。成功/失败、静止基线、输入后summary界面和窗口归属限制须一并保存，结果无优势即停止此分支。

## r272同构建节奏对照与用户反馈

同一诊断包motion-cadence-probe，SHAcbba73c0a7d19695de20dc36be1fec0d4456d4272c76919e51f852e219d19a37，公开点/时刻、90°北向及1800ms横拖相同。两组均idle0、旧baseline仍在127项ring；AppBrand窗口读数含原生界面和最后summary，不是Sky-only、GPU时间或物理帧率。

| 指标 | TIMER | Canvas RAF |
| --- | ---: | ---: |
| touchmove / draw请求 / 成功copy | 199 / 218 / 143 | 202 / 220 / 108 |
| 输入span ms | 1783 | 1793 |
| 软件copy间隔mean/P95/max ms | 12.25 / 17 / 29 | 16.33 / 22 / 27 |
| Page mean/max ms | 2.31 / 4 | 2.64 / 4 |
| Scene mean/max ms | 6.46 / 19 | 7.09 / 19 |
| observer原生更新计数 | 137 | 102 |
| 窗口新present / span ms | 85 / 1838.901 | 106 / 1838.928 |
| 窗口间隔median/P95/max ms | 24.961 / 33.282 / 33.284 | 16.642 / 24.968 / 41.604 |
| 调度fallback | 0 | 0 |

显示周期8.33ms不等于应用120FPS。RAF软件copy数量减少，而窗口呈现更均匀，说明单看copy平均/数量会误判；RAF仍有更差的一次41.604ms长间隔，不能称所有卡顿已解。实际读数PNG为私有r272-timer-result.png/r272-raf-result.png，两张均实际查看；原读回/手势身份在output的r272timer/r272raf-native-present-*.json。用户亲自比较后答“似乎看起来raf更好？”，保为倾向性反馈，不升级为整场通过。

采用边界：在原单writer的零延迟准入点使用实际display Canvas的requestAnimationFrame，不建立持续循环、不改相机/Scene/画质。初次节点未建/缺API保原timer；5秒原deadline仍用timer；请求异常/回调超时记录共同Console并降级，当前surface暂停再试，重建才恢复；取消句柄绑定其原Canvas，hide/retained Sources/resize/dispose取消并屏蔽迟到。r273新增4项覆盖上述机制及真实lifecycle单writer/最新帧/无空转，连原lifecycle/surface/PageHide共36项通过。Page/Scene消费者首次73/74，唯一失败为旧VM仍声明已退出的api-client导入；对准实际sky-catalog-api且意外星座调用显式throw后该6项通过，未改生产逻辑或弱化结果断言。类型检查0。普通r273 build0，SHAc6b77fd97d394eaf1c6b7991d9a1f90a7a2c5ee0df92f554a7e2b876896da515，284文件4902895B，包体/五origin0；官方预览与实际普通回交状态归CONTINUE。

## 用户追加的源码与重绘/重排研究

2026-10-16用户明确要求继续看Stellarium源码/同类前端表现优化，并问是否还涉及重绘/重排。复用10月14日固定版本研究，仅重开当前帧调度、界面派发/布局测量与已确认拖动链。当前源码可见paint接受后仍发布React呈现状态；r272每轮115–147次Page render说明这条链有成本，尚不能据此认定强制重排。待沿实际setData字段、SelectorQuery测量次数、React派生/组件消费者进一步区分，不把Web DOM术语直接套到Canvas，也不使用屏幕截图证明布局耗时。

本轮重新核读[固定Web canvas.js](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/js/canvas.js)：rAF调用update/render，输入状态进入该帧；同文件每帧getBoundingClientRect及DPR比较缺陷保原研究，不能照搬。依据[Taro 4.x官方优化指南](https://docs.taro.zone/docs/optimized)核小程序setData次数/数据量和引用稳定性；局部更新可用CustomWrapper，但改变组件边界会影响flex/选择器，必须先证当前瓶颈，不直接改全局baseLevel、恢复已拒CompileMode或新增渲染器。本轮为原PLAN B/E/F中的局部诊断/实现选择，唯一PLAN不改；社区与源码只研究方法，不复制受限实现。

## r273普通回交与本批独审

官方auto_preview终态0，feedback qmDoXg/prepared generation-000001-lkZN5y/project，bootstrap starward-device-test-kyOvJ4实际见普通星图、101.1°/右上菜单，无TIMER/RAF诊断按钮，之后bind新F9G6pK。当前倍率/方向取实际画面，不猜默认45°。同公开fixture守卫1800ms横拖，前后图及原视频第30/70解码帧实际查看，星点/线/插画/普通整字随画面移动，结束仍有图；只证明这些运行结果，不认证整场顺滑、全部画质或新日志手机读取。原8秒请求录屏98编码帧、PTS0..5.330956，3390.7ms最大间隔为输入前静止，不冒Sky3.39秒卡住；metadata r273-native-cadence-ordinary-video.json、像素私有runtime的r273-native-cadence-ordinary*。此前r267及r269–272全部10个feedback/bootstrap先完整逐hash归档后由原owner退休，r273-feedback-archive-results.json为COMPLETE；r273当前两session/普通candidate及全部源码/build/原图不动。

用户明确“允许本批只读审查”，cadence_owner_review仅本批只读源码/要求/日志，不运行检查、操作手机或外联，完成后已结束。独审未发现r273 RAF接入其他问题；只读不能证明原生物理时间线/全部设备。发现1项P2：trial publication有效但当前视野选择器返回新[]时，候选仍不稳定。主代理r274沿同Hook归一选择器空结果；扩展同一完整Hook测试保普通关闭、trial无匹配五次相机变化、实际tile到达与隐藏退休，修前7≠2失败，修后5/5通过。NaN/非正尺寸前置条件保持旧含义，无新网络/缓存策略。修后为主代理处置，不冒新增独立复核；r273手机普通尚无此trial分支修复，但商业开关关闭路径不受这次补全影响。

## 重绘/重排的证据边界与待测机制

当前生产拖动的输入直接写manualBasisRef/zoomRef并请求单writer，不按touchmove先整页渲染；但每次成功copy后仍更新presentedCamera/呈现receipt，触发React派生。普通名称已同copy，四方位字仍WXML left/top；这能证存在样式更新，不能单独证重排耗时占比。[Chrome布局说明](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)的读写交错原则只作方法，WEAPP SelectorQuery为异步边界，不据Web术语声称强制同步Layout。Taro4.2.1安装源码dom/root.js确认更新有batch再setData；hydrate.js中的cl/st/v/cn只作本app字段分类，不修改框架源码。

r274临时观测复用r50阶段observer及官方[setUpdatePerformanceListener类型](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.component.d.ts)：withDataPaths=true只在5秒有界拖动及180ms收尾收固定类目统计，不打印/保存字段值、文字、地址、原生data；另外记录controls/surface实际查询入口次数。updateStart/End只作官方更新运算区间，不称独占Layout/paint/GPU。原微信文档两个入口当前不可取，未重复请求或绕私有接口；类型源及现可用listener沿原owner，不拦截setData。此观测只解当前字段/测量不确定性，不重跑所有功能或预设迁Canvas/CustomWrapper。

r274实际同90°北向1800ms：moves200/req218/copy107/Page113/span1780，copy gap mean16.53/P9522/max36ms，Page mean2.64/max5、Scene mean7.22/max16ms。**controls查询0、surface查询0**，不支持“拖动时不停查布局/重设Canvas大小”的假设；不等于渲染层从未Layout。官方102次更新、wait mean1.49/max8ms、work mean1.02/max2ms，均只保该API区间。dataPaths数组存在，但第一版仅受理root前缀字符串，最终无可分类项；不把空类目当没有界面更新。r275只补这处诊断数据形态兼容和空/非匹配计数，接受分段数组或字符串地址后仍只输出固定类目；若仍无字段，保字段归因UNKNOWN，不重复同观测。r274普通Page/Scene已精确恢复，原probe/helper全部归档，实际结果PNG私有r274-update-path-result.png。

本次再次核桌面[StelMainView.cpp固定源码](https://github.com/Stellarium/stellarium/blob/8e3062e220808537936e492b108dabaed0c3faa4/src/StelMainView.cpp#L1525-L1619)：updateQueued控制单个更新，drawEnded后再安排，输入/时间速率影响活跃帧率；其Qt定时入口与Web RAF不同，不能把接口名称当所有平台的性能结论。Starward继续复用已有按需writer/闲置无循环，不照搬2.5秒或Qt帧率常量。

授权与历史方向：唯一PLAN中“rAF…已否定或无证据路线不重复试验”保其旧样本时态；本次有用户新的整帧节奏失败、同包窗口间隔/亲自倾向反馈，用户随后明确指出应使用requestAnimationFrame并要求继续。这一具体新指示覆盖旧“无证据”停止条件，仅采用现writer的准入时钟；没有据此重开其他已否定方案，也未擅改唯一PLAN正文/hash。

r275只修观测数据形态：实测dataPaths为分段数组，105条array/0string/0other/0empty/0missing；官方类型的string[]与本运行时形态不同。仍只保105个other归属、1children/104attribute，不把未识别具体属性猜作cardinal或重排热点；本轮字段细分停止，不为同问题继续推探针。90°同1800ms：moves198/req216/copy106/Page108/span1777，软件gap mean16.71/P9524/max27ms，Page mean2.97/max12、Scene mean8.20/max21、artDraw mean3.42/max13ms；controls/surface0，官方100次更新，wait mean1.55/max6、work mean1.15/max5ms。普通Taro界面属性更新与Canvas像素重画是不同边界，官方运算区间不能当独占Layout；已看私有r275-update-path-result.png，数据不冒新修复收益。

## r277减少已确认的重复计算

生产引用审查：Page的visibleOrientationTargets只给OBSERVATION保留的WXML目标名和该模式星座避让使用；普通Canvas paint已对相同目标作必要投影。r277仅按实际消费者增加模式前置判断，普通省下第二次projectSkyTargetLabels，OBSERVATION保持原路径，不隐藏Canvas名称或改变坐标。此前r276普通SHA74199110ff9fdbe5b935614261640a051aca3a3d83421888aa92e09e5d23f0a2已build但未推送，保全为中间候选，不冒最新源码/手机。

当前Scene artDraw区间包含星座连线细分/裁剪，沿原constellationLineSegments发现递归每个节点都求acos及固定阈值cos。保持原算法/0.35px误差/2°步长/深度16/地平与真球弧：每视图只算两个常量、同节点复用dot；中点已在视口球冠内时，其包围球冠必相交，跳过不可能拒绝它的角度测试；外部中点仍执行原精确角度与保守-1e-9判据。不加历史网格缓存、近似三角函数、降精度或新Scene。

有界独立函数对照r277-constellation-cap-study.json：同真实676条目录弧、现owner、显式单位矩阵几何fixture，90°/45°带roll和offset/0.05°真实端点居中/115°/264.36°共5条件，segment数352/87/3/348/0，前后每个坐标和顺序JSON精确相同；acos3688→1138，cos6362→1146。交替6轮、每轮400次调用均更少host wall，平均461.85→272.70ms，首before634ms明显离群，故不把均值当设备收益；该VM/host不含完整Scene/GL/物理呈现。初harness误将zenith当设备beta使0.05°空结果，原候选/前像保留，改为同真实端点正交basis后才成立，非产品失败。采用后实际owner/Scene/目标名称/全天校准消费者55/55，普通类型0；没有复验未受影响图像/交互。当前r277诊断只复用同r275 observer/公开90°/1800ms看此次Page/Scene成本变化，不继续扩字段归因。


r277诊断已build/包体/五origin/official0，SHAb2d5b2a0e884d08bca3fef472b8e11db38f401651a876652f6d5817c7db4cd27。手机90°复位后同1800ms横拖，实际PNG已看/私有r277-cap-ui-result.png：moves199/req218/copy106/Page111/span1790，软件gap mean16.63/P9521/max43ms，Page mean2.72/max4、Scene7.44/max17、artDraw3.08/max12ms。比r275局部CPU均值/尾部有改善，gap最大43ms更差；单次顺序样本不能完全隔离热机/系统调度，不认证所有卡顿已解，也不把106次copy换算物理FPS。host等价、更少工作与低维护代价支持保留；不继续同视角追漂亮数字。两处增量为自查与受影响检查，不冒r273独审已覆盖r277。Page/Scene/helper已按r277精确hash恢复/归档；普通回交状态归CONTINUE。


r278普通native-frame-work-clean回交及一次真实Sources保留Canvas返回成立，候选SHA15585981fdccf93bae9854b69f201adf45d3333760b2d149f54180fc940ef8bd，build/包体/五origin/official0，private r278-ordinary-before/sources-page/sources-return实际看。来源返回后星图与已选HR8162 reticle重绘，保持原投影；无TIMER/RAF/统计控件。11源/实际采用函数/33/PLAN pin归r278-performance-readback.json，八旧run完整hash归档/原owner退休COMPLETE。用户当前观感可选反馈未返回，不升级性能验收。实际打开资料发现共用data.limitations被整段铺入modal，属于原UX16/17待修的新观察，范围/下一动作归CONTINUE，不重开逐星资料调研。


用户在r278普通日常体验后明确“放大40度左右顺畅了，但是115度左右，依然有卡顿，糊糊的抖动感”。它是本机约40°观感改善和115°仍FAILED的直接反馈，不是全倍率通过或固定性能阈值。后续直接定位宽视野115°，不重复40°或旧90°已测条件；仍保完整图层、星点、画质、同帧身份与恢复。

用户随后补充原文：“这次是移动得比较快才会有卡顿，糊糊的抖动感”。下一次115°样本改用明确短于此前1800ms的快速横拖，记录时长；不把旧慢速样本当这个触发条件已验证。


r280实际115°/450ms快速横拖：50moves/74request/30copy/42Page/span430ms，软件gap mean17.91/P9522/max29ms，Page1.95/max4、Scene8.33/max14、artDraw4.10/max10ms。同AppBrand窗口idle0、43presents/span732.296ms，median16.642/P9541.606/max58.249ms、baseline仍在ring；包含界面与收尾、未量实际输入事件首尾，不冒Sky-only FPS。私有已看PNG/hash归r280-fast-observation.json。

r281只拆分同115°/450ms星座责任：51moves/73request/31copy/40Page/span450ms，软件gap mean19.19/P9526/max27ms，Page2.08/max5、Scene8.81/max17、artDraw4.26/max10ms，其中constImages1.90/max7、constGeometry1.16/max2、constSubmit1.19/max3ms。私有实际看PNG/hash归r281-fast-phase-observation.json；计时插入开销/单次顺序环境保留，不是独占GPU/整场验收。普通源均已由当轮精确hash退探针恢复；当前手机仍诊断，普通回交待后。


r282按r281实测constSubmit1.19ms优化原GPU renderer.segments：相同两三角形改为一次直接push36个数，去掉每线段的外层及六个顶点临时数组与RGB展开，保实际颜色owner/线宽/坐标/顺序/批次/GL上传/失败恢复，无新缓存。实际AST方法+676条真实目录弧在4视图及水平/竖直/反向/小数/退化通用线段下全部数值与Float32上传字节精确相同，push调用4746→791。6交替host轮mean 1230.55→449.58ms，每轮4000次；仅host方法，不冒手机/GPU/完整Scene改善。初对照把计数器的自定义push函数属性也作deepEqual导致harness失败，保原log/脚本，改为比较实际数组内容后才成立。候选/原像/study均保r282。

已有受影响检查首轮8/12，4失败均旧夹具：最小Page帧缺实际必需mode、两处target缺displayName/targetId、网格按钮仍找已改旧名称；未进入新GPU segments。沿共享skyPageCanvasTestFrame补普通NIGHT默认（显式输入优先），两个实际目标夹具补公共身份/名称，网格对准当前已采用2–4字名称；不改产品来迁就测试。失败2文件修后5/5，首轮另外8通过复用，类型0；不冒整体原生验收。后续r283同115°/450ms复用原分段观测验证实际收益。


r283修后同115°/450ms，51moves/77request/31copy/43Page/span433ms，Page2.05/max4、Scene7.94/max14、artDraw3.35/max8ms，其中constImages1.84/max7、constGeometry1.32/max3、constSubmit0.19/max1（r281旧1.19/max3）。软件gap mean19.50/P9534/max34ms，P95比r281的26更差，不声称全局帧间隔改善。当前同AppBrand窗口41presents/span707.353ms，median16.644/P9533.285/max41.607ms，相比r280尾部较短，但单次顺序/不同计时开销/界面收尾限制保持，不能认证Sky-only帧率或完整顺畅。实际原图已看/hash归r283-fast-vertices-observation.json。精确字节等价、低维护和实际constSubmit显著减少支持保留r282；整体快速拖动仍FAILED/未闭，不继续重复同样样本追数字。普通回交候选r284已build0、未推，当前源码探针已退回最新r282+r279普通。

r279同批共享资料披露：目录modal不再直接铺data.limitations，既有精确版次Sources页完整“资料说明”保原顺序/全文。介绍、aliases、facts/单位、所选地点时间/可见性和来源route/归因/许可/失败恢复保持。实际共享fixture修前2失败/修后11通过，类型0；这是统一模板修复，不逐星改正文，不修改供给数据。原生排版待r284普通输出。


独立审查wide_motion_review获本批用户单独授权后只读完成并立即结束：r277球弧/重复UI投影、r282顶点与夹具无其它发现；P2指出原测光标记/不确定语义不能随长limitations一起离开数值。r285已在原资料service的bscStarInformationFacts共同生成就地标记（有原测光标记用目录视星等；保raw code/原数值/单位，星等及色值不确定随数值），facts进入STAR contentRevision，无新API字段或逐星分支。原完整长说明保Sources，严格去掉已由本页Provenance展示的完全相同说明。当前两版BSC各260原测光标记、22有效色值不确定、0星等不确定；真实代表及受支持星等不确定构造在同owner覆盖，修前2失败、修后API/Source/modal26/26，API与UI类型0，不逐篇校文章。修后没有再独审，保此边界。

r284普通实际modal→Sources全文→Back→关闭后星图/选择恢复；一次Back输入因capture过期被拒后fresh capture/实看再正常发送，无产品失败。r286沿当前自有r126启动记录/准确argv/独占8797监听/创建时间差0.017404s核实PID14380（初用了错误旧r112记录及PowerShell日期再Parse失时区，拒绝后查实际类型/最新记录更正，不绕守卫）；隔离dist-check-r286编译并直接验证H事实后，仅停止该旧LOCAL进程，沿原恢复owner启动28832，health200/public context201，真实HTTP三代表200并具正确raw/不确定限定。旧dist/v79 OCI不覆盖，不冒旧镜像包含新代码；当前进程cwd未从运行态另读。

r287普通候选SHA379d1199ed0e9bf77929d237604f34dc51cbf44bfedb0d92eb9e40a4a91e5c17，284文件4903536B，build/包体/五origin/official0。实际公共搜索HR5958→资料，目录视星等2.00mag与H未转换统一Johnson V说明在数字旁完整显示，来源入口在facts后；返回搜索/关闭后普通星图实际看，无性能探针。公开HTTP/软件通用行证明色值分支，不逐星重验；r287的Source去重仅软件，原生完整来源/返回沿r284范围复用。文本输入未完成时提前capture被session_busy拒，待同一句柄完成再capture，没有重发输入。10旧feedback/bootstrap全文件逐hash私有归档后原owner退休COMPLETE，保当前r287及全部源码/输出/原片/旧dist/OCI。readback/pins归r287-current-readback.json；原33/PLAN不变，Context结构校验0不代事实/原生验收。


r288下一有界问题是绘图命令提交后的实际完成等待。依据[MDN finish](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/finish)及[OpenGL ES2规范5.1](https://registry.khronos.org/OpenGL/specs/es/2.0/es_full_spec_2.0.pdf)，临时探针在首12次成功Scene后、2D copy前调用标准gl.finish，每手势上限12，不是生产优化/独占GPU timer，故意破坏CPU/GL重叠。源码Page/Scene/constellation已按本轮hash恢复普通。初官方完成后phone不在小程序前台，capture守卫拒，沿已有授权同prepared重发一次后WAIT288实际可见，未重建或读无关手机内容。实际115°/450ms，completion available/12calls，mean3.92/max13ms；51moves/78req/32copy/47Page/span423，Page1.87/Scene7.22ms，gap mean17.90/P9522/max24。额外完成等待有实质成本，CPU提交墙时不能覆盖它；不能把屏幕所示节奏比旧样本较好当ordinary改善，更不把3.92当纯GPU/实际FPS。WEAPP实现语义未独立证实。原PNG已看/hash归r288-completion-observation.json。本次问题已完成，不继续同样probe追数字，不把finish放生产；准备回交同r287普通。

本地当前Taro4.2.1 plugin-framework-react实际在React18走createRoot，@tarojs/react options走ConcurrentRoot，并有batchedEventUpdates；没有证据需要再人工包一层批处理，本分支不改生产。此为本地源码事实，不冒实际Layout耗时证据。


r290进一步区分原生回调通道与绘制负载：仅在实际display Canvas收30个requestAnimationFrame回调，不调用绘图/不改相机FOV/数据，记录actual surface copy计数以限定空闲；30上限、2秒超时、原Canvas/隐藏/取消退休守卫。类型/build/包体/五origin/official0，SHAa37fdc936c9de790f0f2a273cfd93e82223e8a1d3613808c051a54093e716f80。实际CLOCK290按钮一次完成，callbacks30、wall/native各29间隔，mean16.172/median16/P9517/max17ms，copiesDuring0。原图实际看/hash归r290-clock-observation.json。它只说明本机当前display Canvas回调通道在此条件约16ms，不当物理FPS、所有设备/平台硬上限或115°卡顿已解决；仍有拖动34ms等额外长间隔，继续定位绘制/等待波动。一次输入capture过期先被守卫拒，fresh capture实看再发送，未绕守卫。当前Page/helper已按本轮前像/hash退回普通，未加入新的生产循环或绘图writer。准备复用同r287普通回交，不重编/重验未影响交互。

### r291 普通候选恢复与诊断退休

确认上次官方重发已完成后沿同一r287 prepared，不重复预览或构建。实际fresh capture/view看到普通星图与菜单、无WAIT/CLOCK诊断覆盖；bootstrap g6oJ3Q，bound CXe2ov。r291-ordinary-return-observation.json绑定原379d…候选与private实际图hash，仍仅development_feedback。r289旧bound在重发前归档，旧bootstrap、r290诊断feedback/bootstrap共4项逐文件hash相符后由原owner退休COMPLETE；当前普通CTKiiZ保留。无手势重验，不认证115°快速拖动顺畅、手机bytes/AppID或物理FPS。

### r292–r293 同尺寸矩形顶点复用（实施与有界问题）

当前constImages实测mean1.84/max7ms是本批起点；审查发现每个背景/星座图pass重建同12个顶点并向既有VBO再次bufferData。r292在原renderer内按当前logical尺寸复用同一矩形及各自buffer的已成功上传身份，全部7个全屏pass迁移；相机/图片uniform、attrib退休、draw顺序、pixel/coverage/质量和原检查保留。实际WebGL bufferData可能只设error不抛异常，首次/尺寸变化上传只有getError为0才保复用信用；动态写入、失败和renderer退休撤信用。不是typed array池、历史帧/图片缓存或新owner。preimage/candidate各自保存。

4个owner边界检查覆盖相同顶点字节/实时uniform和draw、不同buffer、resize/尺寸往返、dynamic穿插、throw/GL数值失败重试、contribution replay与现错误检查；连原GPU/body消费者22/22、生产UI类型0。受控GL只证提交语义，不证真实GPU像素。原before countercheck有2个upload数量失败（不把它们说成旧版原生故障）；初次fixture误提取另一局部quad变量已收窄到renderer自身声明，没有修改生产代码迎合夹具。

r293沿现临时observer对同一完整候选提供REPEAT/REUSE两种115°复位，各只一次450ms真实swipe；统计quad上传/复用分支与原phase/copy间隔，用以决定是否保留，问题有结论即停。REPEAT保原每次upload/原后续检查，不为基线额外每次getError；REUSE只在首次实际上传查error。无需gl.finish、GPU timer、质量削减/新循环。当前仅构建在途，exec session23561；预览未调用。源中4个临时插桩由r293-wide-motion-scope原hash持有，build后沿同owner退回r292当前普通前像，不借旧preimage覆盖。

### r293 实际同包矩形上传A/B

QUAD293实际显示，fresh capture/view后分别复位115°，相同0.72/0.46→0.28/0.46、450ms swipe各一次；两模式开始/结束星图均实看，星点/线/画/地景/字仍可见。REPEAT moves52/copies28/span435ms，quadUploads662/reused0、constImages mean2.25/max6、Scene8.71/max14、gapmean19.43/P9526/max31；REUSE moves52/copies29/span436ms，quadUploads0/reused687、constImages2.07/max8、Scene8.59/max17、gapmean19.05/P9524/max32。统计包含同一180ms收尾，单顺序样本非独占GPU/物理FPS。r293-quad-upload-observation.json绑定实际private图hash和完整标量。

固定矩形的重复上传确实消除，局部mean收益较小；Scene最大值和gap最大值未改善，115°快速拖动仍未通过。候选较少GL命令/重复分配、不增GPU存储/新owner，暂保等待独审，不反复抽样刷数字。构建后自查额外补数值upload error撤回pending contribution，原const/upload/quad语义不变，focused4/4；此冷失败守卫不在r293诊断字节内，普通候选需新构建。r292生产候选及guarded版本分别保全，四源探针已退。

### r294 普通回交与独立审查

用户针对本批另行回复“允许本批只读审查”。新的quad_submission_review只读要求、r292前像/候选/当前代码、消费者和真实输出，不编辑/运行测试/操作手机/外联；实际查看两张r293 A/B及r287 HR5958图。结论无新代码问题，认可有限低成本的矩形复用及错误/尺寸/动态/贡献/退休责任；上一批raw测光旁注P2已修，Sources只去当前卡片完全重复全文。审查强调单顺序样本仅局部小收益，Scene与最长间隔未一致改善，115°快速仍未通过。收到完成即关闭代理，不复用。

r294 wide-quad-clean类型/build/包体/五origin/official均0，284files4903693B，SHAc120cfcea54355658bb41148520ed8080fa13f401b8a9bf1f3bcd5aab0881f10；含最终numeric upload error撤贡献守卫，无探针。实际fresh capture/view普通星图及菜单，无QUAD覆盖；只证普通回交，不追加旧手势验收。r294-current-readback.json保当前源/实际图hash、PLAN与原33不变、独审范围。旧普通/诊断4项均全hash归档，3项原owner停COMPLETE，诊断r293 generation因EBUSY仍PENDING；精确官方close亦failed，保已归档原目录，不盲kill/删/重复close，当前普通排除。失败重试脚本尾部打印引用错误发生在已写回receipt之后，已读回确认真实PENDING，不把脚本exit误当无副作用重跑。

### r294 用户对普通版快速拖动的定性回评

普通wide-quad-clean c120cf…恢复后，用户针对自述约115°快速拖动的卡顿感明确回复“已经不明显”（问题未要求重做40°、缩放/校准）。当前交互的主观症状可记为用户回评改善/该条件不再明显，先前r278/r280等FAILED保历史，r293长帧数值也不回改。停止对同一症状继续微优化/同型采样，转完整Goal其它尚未闭义务。此用户回评非物理FPS、能耗、所有边角/全场景/其它设备或整Goal验收。

### r296 约95°向上拖动的新条件

用户新增：“我再提一点，在当前这个画面，显微镜座为中心 95度，向上拖的时候，卡顿较为明显”。r294普通此前“已经不明显”只保其当时回评，不覆盖此明确新失败；当前实际capture是95.6°、显微镜座附近/侧转地景。新增条件归同B/E/F性能owner，保当前视角，来源去重原生旅程暂停在菜单刚展开，尚未点搜索；不要求用户找别的天空，不把新反馈解释成文字脱节。

r296-before-sources.png为此前实际fresh capture/view，95.6°与这片天空已实看，未改为新的初始化视角。下一观测仅沿受守卫普通版保持原视角做一次向上拖动，并读取既有同AppBrand窗口的有界呈现信息；若需要诊断重预览，须明确不能把重置后的新视野冒原条件。

### r296 原普通视角向上实际观察

沿原r294相机95.6°/显微镜附近、上右斜地景，关闭刚展开菜单后fresh capture/view，再0.5/0.65→0.5/0.45、450ms一次向上swipe；FOV未改，实看后图显微镜/天鹤/宝瓶与星点/线/画/字上移。Scoped同AppBrand baseline idle0，完整窗口41次present/13024.748ms，含12425.578ms操作前空闲夹段，其间隔率3.071不是FPS，也不能把长空闲当绘制卡死；读后才截图，baseline还在ring。post-largest-gap尾段仅描述其实际点列，未测确切设备input边界，不能冒Sky-only或原因定位。完整原始数据与限定归r296-upward-observation.json，实际前后图私存。此新用户卡顿保持FAILED。原源/手机尚无新的探针/重发，避免以北天初始化复位冒该视角。

### r297 纹理窗口路径有界诊断准备

r297已沿现临时observer准备--vertical-field，插桩Page/Scene/constellation/sky-gpu-textures和一个helper，来源/GL检查/图片/owner不改。统计现texImage2D与原post-upload getError、copyTexImage2D/原post-copy检查调用wall、cache hit和逻辑resident bytes；无新资源/常驻循环/额外同步GL查询。诊断按当前constellationFrame中Mic真实方向，95.6°及受控-135°roll重建相近视野，明确不能当原用户相机；原前后截图/95.6°/r296原窗口和夹入空闲的局限均保留。问题：向上移动是否导致资源到达或裁切窗口重建、同步上传/等待长帧；一次代表向上，只有实际新upload出现时才补一个warm机制对照，不循环抽样。若无upload则此假设未支持，转实际CPU phase，不扩大缓存/降低质量。

当前类型→build在途，未包体验origin/official/手机观察。构建后先retire r297按自身最新r294前像和hash还原4源/helper，再后续交付；不得用r292或旧r287前像覆盖当前源。普通r294仍在手机，最新姿态为r296上拖后的显微镜/宝瓶附近，菜单已关闭，Sources旅程尚未执行。

### r297：95.6°显微镜座向上，上传与阶段观察

诊断候选microscopium-upward-probe已官方预览成功并实际看到VERT297，四源/helper已按自身preimage退休，当前源码仍普通。原相机无法随预览保持，使用当前真实Mic方向、95.6°/−135°受控roll的相近视角，原r296图保留；不冒原用户相机。首次被动样本156moves/25uploads方向未确认，仅旁证。

一次受守卫450ms向上(.5,.65→.5,.45)：50moves/29copies，软件gap mean19.24/P9526/max39ms，Scene mean9.31/max17ms，constImages2.00/max8、geometry1.66/max3；4uploads/1copy/659hits，现有post-upload getError等待mean3.25/max4ms。一次允许的固定pose复位后warm对照：53moves/29copies，gap mean18.09/P9527/max34，Scene10.03/max16，constImages2.38/max8、geometry1.76/max4，仍4uploads/1copy/687hits、uploadWait3.00/max5ms。逻辑resident最大23920640/24182784B，不是物理峰。两个样本及实图均存private runtime r297-agent-up-observation.json/r297-warm-reset-up-observation.json；实际查看完成。

这些计数尚不能区分首次可见、已退出重入与原缓存窗口不含新窗口；不据此扩大缓存或把全部卡顿归因上传，也不重复r297同样采样。r298只补这一分类的一个代表向上，源/时序/错误/缓存政策不变，已有stage观察复用。95°向上用户症状仍FAILED，软件call-wall不冒物理FPS或整体通过。

### r298：上传分类排除窗口反复重建

同近似Mic95.6°/−135°roll、一次受守卫450ms向上，实际MISS298已看并绑定。4次上传均为该GL owner首次处理的原生image身份，reentry0/windowMiss0，已有大窗口收缩copy1、hits722。首次source逻辑RGBA max1048576/mean851968B；原post-upload检查mean4/max5ms。31copies，Scene8.19/max16、constImages1.94/max8、geometry1.16/max2；gap17.17/P9527/max27ms仅软件，diagnostic时序浮动不当优化。此样本不支持纹理窗口反复重建假设；不扩缓存，不重采r298。新原生身份不等于全局新asset，仍不追读图片/目录对象逐个。probe四源已按本轮preimage退休，普通源保留；private r298-classified-up-observation.json及实图。下一小路径仅评估现精确时刻lines中与相机无关的弧中点/角跨度计算能否沿弱frame寿命复用，必须保所有坐标/顺序/误差/时间更新且有实测收益才采用，PLAN不改。

### r299/r300：精确时刻球弧复用，有界代码与同包手机对照

沿原PLAN B/D/F按输入寿命复用：仅原Scene输出的deep frozen lines/tuples/vectors可取WeakMap；节点保原中点、点积和角跨度，仅原≤2°角细分可留子节点，相机投影/半球交点/0.35px细分仍当帧计算。换时刻/报告/目录得到新lines身份，旧frame不由此强留；mutable或浅冻结输入不缓存。没有新图像/GPU资源、持久作业、星数/画质/精度改变。

r299 host真676弧×6视角（含Mic95.6°/受控roll、45°offset、.05°、115°和全天）旧/新每数字及顺序cold/warm相等，六交替轮mean405.684→288.628ms/480calls，仅host。第一冷调用5.181→3.877ms仅一个样本。warm局部hypot7318→2345/acos1434→108。最终guarded源SHA1b87c5b0a524fc367c11b9071d187f73064315a10d1b92be5929b18c5cb41c08。六视角后3632nodes/1478branches/805radii，数字payload122664B，不含JS对象/指针/GC，120同视角调用不增长；不是物理heap峰。r299-arc-memory-model.json为有界逻辑模型。

13相关render/scene/copy消费者通过，类型0。最初三个display旧fixture失败：首渐显空帧被当settled、整copy只预期星座而现公共canvas也有目录名、target缺displayName/direction；它们不依赖本次球弧函数。只修fixture的静态settled输入/该责任caption选择/真实target字段，保原非空/迟到/失败/同帧断言，未改生产UI或扩无障碍。原失败log与preimage保留。clipping port fixture改为读取模块全部local声明，退出private helper白名单依赖。

r300同包ARCS300、Mic95.6°/−135°roll，一次450ms向上每模式：BASELINE constGeometry mean1.41/max5ms→REUSE1.26/max2；Scene9.17/max20→8.52/max16。软件gap18.76/P9529/max42→16.79/P9520/max25。两模式均4uploads/1copy，uploadWait4.75→3ms、event52→53及Page长帧也变化，因此不能把全部cadence差异归因球弧，不能换算物理FPS/认定用户问题完全修好。不追更好数值重复采样。实际两图及r300-arc-observation.json在private runtime，已查看。初prep窄按钮误点得到0move/0copy不列样本；后fresh修正并实际显示BASELINE/REUSE。

决定保留该局部复用候选继续普通版反馈与独审：数学/输出/寿命不变，host及目标阶段都有低幅明确收益；不据此扩缓存/延迟错误检查。r300四源/helper已按自己的最新preimage退休，普通源码含r299最终guard；独审和原95°向上观感未闭。

### r301：最新普通源码回交

microscopium-arc-clean类型/WEAPP build/包体/五origin/official均0，284files4904143B，SHAcf6e58f00e0e1219929a082b446af8e3c72b1c66e62d611daeaa0d26a3de0e92。bootstrap fresh capture实际普通星图无ARCS/按钮，已看；private r301-ordinary-return.png。源码与r300自己的四前像精确相符，无live helper；r301-current-readback.json核PLAN/原33不变。此次是development feedback，不冒phone字节/AppID/实际Console、95°普通观感或整场验收。旧r294不含本批新源，保留为历史，未用旧包覆盖。

### r301本批独审与r302来源返回

用户明确“允许本批只读审查”后新建arc_lifetime_review，只读代码、前像、日志和r300两实际图/r301普通图；未编辑/测试/构建/手机/外联，无可操作代码/夹具发现，确认冻结身份、数学/顺序、角细分寿命和真实消费者。完成即关闭，不复用。主要未验：普通95°向上观感、物理FPS/heap/GC/全Goal；host29%为局部中间候选，最终deep-freeze guard冷路径未由该host时间单独证明，3632节点仅采过视角规模。保持这些限制，不扩大结论。

r302在同r301普通实际完成公共HR5958搜索→modal→来源→Android Back回同modal→Back回保HR5958query的搜索→Back回原普通天空。modal保2.00mag及H未统一Johnson V紧邻；来源首卡保全共同测光/精度说明，末卡保完整既有身份/变星限制，下方资料说明只留独有静态位置与H说明，无重复该末卡全文。实际可见五图/hash和r302-source-journey.json保private；这是一个共享呈现机制，不是逐篇文案审计，不查新外网、不复制出处/许可或开外链；不冒完整来源家族/目标验收。

本轮旧r294/r297/r298/r300共8项全文件hash归档后，原owner退休7项complete；r300 feedback598Wgn generation仍device_feedback_cleanup_pending，原目录和287文件archive均保。r293更早AqX3b6 EBUSY不重试。新r301严格排除，currentOrdinaryProtected true；r301-feedback-archive-results.json为状态owner。

### r303：普通回评与后续有界问题

用户补充确认“噢对，我记错了，我看95度显微镜座那里看起来好了一些了”。本机普通r301下定性有所改善；不是已经不明显/整场或全部设备通过。115°前次已不明显回评仍只保原范围，本轮不重复它。 已没有待回答问题/代理/构建/预览。r302 Context正确沿仓库npm run context:validate返回0；此前裸ty-context不在PATH，PowerShell外层0不是验证通过，未安装CLI。

继续在现宽视野绘制owner检查每帧共同view准备；现ready-artwork会先prepareArtwork再artwork，原renderer两次都计算相同ray hull/crop。只做有界真实几何host对照，若共享view准备实际收益不成立则停止，不引入资源缓存或改画质；现r301普通保留供日常使用，不为这项host问题操作手机。

### r304：实际用户95.1°普通视角，一次呈现记录

用户已自行回到95.1°显微镜座附近，实际fresh捕获并查看，未重发包/定位/改时刻或FOV。沿原scoped AppBrand reader，idle0后一次450ms向上，41new presents/2155.339ms；最大1531.249ms位于第2次present后，完整区间含pre-input/UI/收尾，18.56 rate不当app FPS/1.5秒渲染卡死。最大gap后的描述段39presents/582.475ms，median16.642/P9533.281/max41.599ms；同样非Sky-only/精确手势时间，不与r296不同相机当严格A/B。原完整timestamp回执保owner，实际图与r304-ordinary-up-observation.json保private。该通道仍能见部分长间隔但不能独占归因，不以重复同样读数追通过。

r303共同ray-hull prototype全部integer windows相同，host乐观mean0.122ms/job节省，仅初步上限；初模型只做视口culling，含实际会因constellation visibility退场的.05°/264°，因此整体均值不能当生产帧或原生收益。当前不采用/不改源/不推包，不为微小乐观收益引入mutable-view缓存。常驻GPU attribute数组每次submit全关仍为下一有界源码问题，先核同program/buffer及所有GL state writer边界，再决定是否值得试验；不绕旧dense-star GL1282恢复。

### r305/r306：连续星座图属性清理的有界候选

r305仅在当前frame内、相同simple-artwork program+buffer、非group且无pending贡献时，允许第二张及之后略过重复disable-all；TWGL attribute setter、uniform、draw、原GL错误检查均仍执行。任何其他submit/异常先撤信用，begin/finish、直接mesh group pointers、辅助observe/reset也撤。原dense-star→image全数组清理保留，未引VAO/新renderer/内存资源或改画质。

原renderer 3aed…前像与修改后的41e0569164cf8e65eee7d219e5c117981d4ee9b7a045dfbbd002ce62232b3e40候选保output。GPU相关34/34；新增边界后submit6/6，类型0。新重点在旧源32≠16失败、候选通过；这里是受控GL/TWGL端口与实际submit/方法边界，非GPU像素或原生验收。

r306沿同一observer/现Scene临时五源，固定95.6°/Mic受控pose各模式一次450ms向上。记录原disable-all与连续同布局省切换的实际调用数/耗时，不重复追更好值；若实际收益不足或恢复/维护代价不值则保原。包bd6f238ce2ba5af3870a5c0d6e2b30cc2baadb292a3e4d4e5816ab313be5d688、284files4909749B，type/build/package/five compiled origins 0；手机实际行为待观测，官方预览在途。候选尚未采用，无本批独审授权；r301普通与全部前像保。

r306实际同包各一次：BASELINE 839draws/26848 disable calls，REUSE801draws/5760 calls；reset显示max/mean 1/0.00→0/0.00ms。constImages mean2.06→2.20ms、Scene7.91→8.80/max均16、gap17.30/P9524/max26→17.52/P9523/max25；事件51/52、copies32/30、Page41/39、uploadWait4.5/4也不同。未测到可解释收益，不把波动叫回归或提升，不再重复追数。结论NOT_ADOPTED：额外GL状态寿命维护不值得。private r306-attribute-observation.json及两actual已看PNG保。

r306五探针按各自hash退休，再仅撤回r305自己的renderer/test改动；r306-layout-retirement.json证原renderer3aed…及testcc97…精确还原，最新r299弧1b87…保，全部候选、修前失败、检查和实际图保。无生产改动留下，不需将试验当待交付核心改动申请独审。r307复用与还原后源一致的r301普通cf6e…prepared、仅续公共route后official重发，未构建/以旧包覆盖新源；fresh capture实际普通无ATTR/按钮已看，private r307-ordinary-return-observation.json/PNG、public r307-phone-delivery.json保。新bound Ew7r8p，bootstrap仍vgYZ18；手机bytes/AppID/实际Console未独验。

## r315–318：搜索途中接管后的严重卡顿反馈

r315普通新搜索导航/跟踪朝向修复见search-navigation-motion证据。用户实际点HR8162并在飞行开始时拖动，报告“没有回跳，但是整个星图拖动变得非常卡”；fresh实图174.4°。本次整体FAILED，不借115°/95°历史改善或软件退出守卫关闭。一次受守卫450ms普通后续拖片10编码帧86883B，原片和样本3/6/7实际看；输入前静止间隔不作卡死/物理FPS。原未保存相机不能随新预览恢复。

先沿现observer仅增加camera调用wall、navigation/animating标志和FOV，不加新writer/常驻profile/同步GL/降低质量。r316受控174.4°保当时copied朝向，一次450ms向上，50moves/58requests/30copies/30pages；输入span431ms，Scene mean6.33/max19ms，Page3.67/max5，camera.03/max1，navigation/animating全0；软件copy gap18.09/P9523/max38ms。这是重新预览后的受控相机，不是原接管状态，未解释人手FAILED或证明物理FPS。private r316-wide-baseline.png已实际看；不重复同样取样追数。

r316诊断HUD盖住菜单影响准备操作，第一次意图搜索实际打开显示，已按实图识别，未算产品缺陷/有效目标动作。r317只使诊断HUD在现披露时隐藏，补6.7°准备入口；不是产品UI改版或性能修复。两个候选type/build/package/五origin/official0，三源/helper各按自己的前像/hash退休，当前生产不留probe。r317实际NAV317已看，当前6.7°/HR5958搜索结果备齐，用户一次实际接管诊断待回；现状态与source/PLAN/原33 pin归r318-navigation-drag-readback.json。无法自动跨越capture+实际查看的守卫往返来在≤1.6s飞行内发送第二输入，不弱化守卫。

### r317–322：人手接管结果与诊断停止点

r317用户答“这次正常，但是我没来得及停止，他就已经到达目标点了”，因此接管时机UNCONFIRMED，不关闭原生中断义务。最后显示34.119457°，28moves/36requests/23copies/26pages，输入span329ms，Scene mean5.13/max8、Page3/max5、软件copy gap16.06/P9518/max18ms，navigation/animating皆0。实际已看r317-human-late-takeover.png；指标仅最后一次手势。

r319沿同一observer只在诊断导航时钟把elapsed step除以4，未放慢后续手势。HR5958 6.7°→HR8162搜索准备后，用户按约2秒途中接管、再普通拖两次，明确“已接管，之后正常”。最终显示174.4°，23moves/31requests/17copies/19pages，span214ms；Scene mean5.53/max7、Page3.11/max4、camera.06/max1、软件gap16.30/P9518/max18ms，navigation/animating皆0。r319-human-midflight.png实际已看，hash/人手原话与限度归r319-navigation-drag-observations.json。最终计数会按每次touch重置，不能从这一张推断每个前序动作的精确时序；之后用户自行浏览的153.4°样本不替换该结果。

结论是放慢导航的这一轮接管后正常，原普通r315持续卡顿仍FAILED、原因UNKNOWN；没有生产性能修复或物理FPS结论。普通版已由r322恢复，无HUD/慢放时钟；四个临时源均沿自身preimage/hash退休。当前改动仅保挂载层的实际遮挡修复，归search-navigation-motion同日证据及r322-retained-controls-readback.json。若普通版再次再现，先保原现场与当前诊断再刷新；没有新依据时停止重复FOV矩阵/同型采样，不重新请用户做已通过的缩放或姿态。
