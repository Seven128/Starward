# D1 当前 WLAN 普通手机观察

本记录续接原 PLAN D1，不构成新方案。606 条封口发布、原 17 窗与完整父图、旧 HTTP/暖态证据全部复用。GPU5140 场景未重播，PSS/物理释放/OOM未新增结论。

## 运行与候选绑定

用户本轮明确恢复完整 Goal，随后打开无线调试并按请求把地图缩到省级范围。已重用原配对；当前唯一无线 transport 的 shell、受控前台与真实截图成立。为核连接临时增加的重复 IP transport 已精确断开，保原 mDNS transport；没有重新配对、改变 VPN/TUN 或运行旧网络脚本。

旧 8787/8798 仍绑定不再属于当前接口的 `192.168.137.1`，原进程与 GPU collector 保留。沿原 `backend-data.mjs start`，从旧私有配置复制并仅改主机地址为当前 WLAN `192.168.31.26`，另起当前源码 API；launcher 36108/API 5604，端口仍 8787。1544 个锁定文件、任务库 publication 只读检查及 `/health/ready` 的 PostgreSQL/Redis 均通过；没有 restore/migrate、提醒 worker 或正式部署。当前 606 map-static 与 r6/fallback 选择保持。运行配置、启动记录和日志均在下述私有根。

普通候选由当前源码完整隔离编译，包含已完成 Map 迟到手势修复，不带 GPU/task observer：

- 输出 `apps/wechat-miniapp/dist/weapp-check-d1-resume-20261029`；341 文件、5,209,594 B，SHA `6c8baba4f3f6a632c2c11cc4610932505da842a4412b0d0b0d5792283a38c44d`。
- 主包 1,992,973 B；content 1,125,936 B，spot 701,460 B，sky 1,389,225 B；源包预算及物理设备编译地址守卫通过。普通 `dist/weapp`、所有旧候选与 source maps 保留。
- 官方 auto_preview terminal success。手机真实非空 Map、当前 WLAN 上该手机到 API 的连接、随手机输入发生的请求共同绑定开发反馈；不声称读到了手机包字节或 runtime AppID。
- 私有根 `E:/Dev/Starward-data/development/terrain-d1-resume-20261029`；feedback `starward-device-feedback-c8hPeh`，generation `generation-000001-zQU05h/project`，session `starward-device-test-BUweN3`。

## 实际请求与供给

现有 `/v2/operations` 的 terrain 事件直接复用，没有清 ring 或新增生产诊断。临时监测凭据仅留进程内存，证据仅保存非敏感标量。`sourceObjects` 是 provenance 数量，不是新增源 GET。静态追溯逐字节核对 PNG/proof，Root另核最终窗口 proof、当前 native ack 到 `presentedData` 的消费者路径及手机来源页。

| 观察 | 实际供给与成本 | 能证明的边界 |
| --- | --- | --- |
| 初始城市视窗 `4ba6d68a…` | z12/3345/1783/2×2，35.3m；10-28旧系统临时合成缓存，4 cells中仅上排2个属于当前 inventory；metadata355.07ms | 旧热成品路径，不冒本批纯成品命中。SPOT `5e1a3b6f…` 是独立内置 Copernicus 产品，不混入 Map window |
| 第一段城市拖动 | 10.047556s录像，只新增MapScene，无新terrain请求 | 仅暖覆盖；不拿它证明新范围供给 |
| 用户缩到省级后的 `b3ed022c…` | current exact z6/51/26/2×3，512×768、2308.4m，原17窗之一；本次metadata3.312ms | 已取得真实请求命中；该阶段未录缩放首帧，不外推可见等待 |
| 同阶段 `ffa77ed2…` | z6/51/27/2×2，本轮current-cell组合，4 cells全部匹配sealed inventory；metadata104.477ms | 新窗口组合，不在原17中，无需新源；不冒exact |
| 向东跨覆盖父图 `d2390f62…` | current完整z5/25/13/2×2，4687.2m；metadata7.331ms，250,136B资产读取12.598ms | 当前请求真实父图及图片到达，不把API返回等同首帧 |
| 同次最终细图 `53282919…` | z6/52/26/2×3，512×768、2308.4m；metadata3272.852ms，355,659B资产读取1.264ms | 不是纯current-cell命中；缺cell6/53/28实际派生后组合 |

缺cell `16a8f70d…` 实测9次源读取、775,434B，sourceCacheHits0、sharedReads0；源墙时3161.495ms，派生总时3208.775ms，projection17.929ms、sample5.518ms、shade15.868ms、encode7.925ms。它是首次新区域/LOD的等待，不能作为“过去已读原始PNG重复取数”的证据，因此不触发原始源持久缓存或并发扩张分支。用户缩放途中另外发生的z10/z9新源读取也保留在同一标量记录中，不改成成品命中。

## 真实显示与剩余缺口

同一次向东跨覆盖录像 `recording-1793258192352.mp4` 请求15s，实际MP4为12.555833s，1080×2376；不得按请求时长报15s完整画面。已实看有序1Hz概览：地图连续向东，随后出现“已显示临时地形，正在加载细节”和“临时地形”署名，末段退出加载状态；原件与4Hz过渡分析图均保留。首次准确覆盖时刻、逐帧完整性和全部配准不能由概览认证。

操作后重新打开手机“地图来源与许可”，实际看到 `source pyramid z6`、`derived grid approximately 2308.4 m`，底部明确“当前显示的地形 · 数据版本：Terrain Tiles Terrarium / source pyramid z6”，无“临时”。对应私有原图：

- `screen-a7380ca2-5d22-4072-a71e-be592667b7c2.png`：来源与精度；
- `screen-a6f03adf-a12c-421f-9679-ca52b513b0e2.png`：当前显示版本；
- `screen-5c637740-6f58-4b81-9c7d-33ae22fa42e0.png`：两次Back后的Map。

`use-map-raster-installation` 在非pending成功native回调后更新 `presentedData`；此来源页读当前展示值，支持本次最终z6、非临时的结论。但同dataset可对应不同window；来源文字不能单独唯一绑定SHA，也不认证手机图片bytes。当前直接读到的最终请求与实际显示证据分别保留。

**D1仍未关闭：** 精确首次正确可见等待、加载中再次拖缩的接管、My隐藏/Sky卸载返回、完整连续性及文件/native资源回落仍欠。普通观察尚未证明热文件后native安装主导，不据此做分块、预取、提高预算或原始PNG持久缓存。旧task observer仍未运行或修适配，未重建R27/gen34。

## 实测署名问题与修复边界

跨出原范围后，时区完整ODbL声明错误进入地图右侧窄列；地形完整声明也重复撑大层叠抽屉。实际图片 `screen-9ee1fd5b-e292-494e-9982-a36682b54eef.png` 留下问题。按当前Context的短署名/完整来源阅读职责，在共享 `SourceAttribution` 的credit呈现增加显式选择，Map仅让时区/地形长声明留既有阅读页；完整署名name、原SourceSummary、天气/EOG随图声明、临时状态及原生移除前署名不改。新增聚焦修前2失败/1通过，修后18项通过，最终小程序typecheck通过。

修后普通候选 `e3360bc3c02ea643c3cce6a955da69f9df398a23217c07c3b591d5910a15cf18` 完整编译、源包预算/物理设备地址守卫和官方auto-preview成功，341文件/5,209,983B、主包1,993,362B。输出 `apps/wechat-miniapp/dist/weapp-check-d1-credit-20261029`；私有 `credit-fix/starward-device-feedback-Tpz1Zd/generation-000001-V1MGU1/project`，session `starward-device-test-NIjmIn`。新手机画面已实际出现修后行为并绑定；旧6c8原件不倒绑。

Root实看 `credit-fix/reviewed-evidence` 中五张原件的390px分析副本：`screen-db9f3a43-299e-43c9-b799-7ce73a30c8c1` Map、`screen-a99dd747-27ee-4062-ad0d-96d107218163` 层叠、`screen-93f836fb-ad4e-4479-9f8d-2a4941b07494` 时区ODbL完整阅读、`screen-d756c253-349c-4876-9218-9b8e14ba8823` 地形许可、`screen-de82df33-f5c7-4024-bc1b-c3db4b28fbf2` 约2308.4m/100%有效精度。地图保完整署名名称而不重复许可段落，层叠保地形署名，完整正文未丢；Back返回Map。原件及哈希/时间receipt保留。此结果关闭本次声明呈现差异，不关闭D1剩余机制或整段UI验收。

Root多次因大图观察到执行间隔超过60秒被输入守卫拒绝，均未派发输入；随后停止该输入循环，交独立窄职责代理先完成准备、用390px分析图查看原件，再正常完成5次capture/2次swipe/2次Back，无freshness拒绝。守卫、原图receipt与候选绑定均未放宽；代理已结束。

## e336 普通候选两条返回路径

在同一无线/普通候选上，实际进入My再返回保原Fujian省级视野、地形及署名。通过现有Search选取已经存在的本地测试正式点，进入非空Sky后普通Back返回，选点marker、中面板和地形恢复；没有Play、改时间或创建业务记录。再重开来源页，明确显示当前z12、约35.3m、有效高度覆盖100%、无临时标签。Root已实际看My返回、非空Sky、Sky返回、当前来源和最终Map五张390px分析图。当前API同期最后Map metadata命中旧已知`4ba6d68a…`，2.680ms；此处仍是原系统缓存窗口，不倒改成纯当前sealed inventory命中。

私有 `terrain-d1-resume-20261029/lifecycle/result.json` 及12组原图/receipt保留。My返回录像请求12秒、实际10.348100秒，1Hz样本仅见My，post-record才见Map；不能据此计算首帧/转场耗时。页面中其他天气/官方预警失败如实存在，不混作地形失败，也不声称天气通过。两条路径关闭本样本的返回结果；后续接管/文件证据及受控清理边界见下文，不再把这些责任全部写成未知。

现有录制owner持有完整session锁，单次只容一个已查看手势，不能在同段录制里并发第二次受控capture/input。本轮未绕过守卫、建立第二session或改录制接口。为剩余真实阶段关联，原task terrain-wait已按当前源码边界适配；仪表通过与实际目标结果仍分开。

## 当前terrain-wait v3与首次加载接管记录

task gen38仅在七个当前生产源责任边界增加有界标量与Map手动arm/export，原产品源码不改。80事件、64弱身份、15秒及32KiB上限；第一真实手势开窗，后续手势不延长截止。metadata、文件SHA/bytes、native派发/真实返回/迟到/timeout及共享文件8项计数各自保留语义；native ack不等于像素或物理释放。16项task检查通过，生产/完整副本TypeScript零诊断，完整编译/预算/inspect通过。候选`125c22c6ef8c655ae56224a817d4a806eda6cf3cae58fef5c7d9ab2416f84adb`，341文件/5,220,521B，main2,003,863B，source binding `b54ca77c836692059a0489df2c2e54ae3d12ba189cb3edd064a23522c0098ee1`。30份source maps/7,679,856B在包外。官方auto-preview成功且实际Map出现TW marker后才绑定私有 `d1-d2-targeted-20261029/d1/starward-device-feedback-8y38GO/starward-device-test-umpQLV`；手机包字节/runtime AppID仍未读回。

当前新collector8799实际转发8787 ready，v3非法包400/无文件写入已核；旧8787热点/8798 GPU及原件未动。用户本轮明确已缩小、随后完成连续拖动。新包重启回近景是候选更新结果，不倒称用户前一次缩放未做。fresh图层截图证明terrain开、云量/光害关，未改开关。用户输入前只读录制请求15秒，encoded13.98秒；原件`recording-1793266031355.mp4`的14张1Hz样本全部仍TW armed/原视野。Root实看contact sheet确认录像早于实际手势，不能用它证明接管像素或首帧时间，不重命名成有效手势录像。

实际导出`terrain-wait-tw-mvtc14e1-98xq7e.json`共29行/11,302B，协议验证通过、source匹配，stopReason=deadline、无overflow。4个真实user-region-start输入中I3/I4的fetching=true，I1已在1.351秒完成fine原生回执后才有I2。I1 preview/fine metadata历时79/130ms，两个文件SHA分别`2e9a5b21…`（57,027B）与`2801bbf3…`（234,815B）；文件ready为相对1.241/1.305秒，原生update返回与ack为1.259/1.351秒。这些是合法链路时序，不冒首次正确像素。

后续request11的attempt3、5分别在新输入后返回failure，再由attempt6接管；仪表未记录failure分类，不能单据它断言取消或网络故障。最后metadata在15秒封口之后才完成，故最终native不在包内。API实读该窗z6/51/24/2×3、SHA`50f0a2c7b3384446ab870a8786ad58d657db9a3cb4f12ee387ad413694feb90b`、357,060B，metadata9399.7ms，preview UNAVAILABLE；这是原17窗外的首次新区域，不触发“重复已读源持久复用”分支。封口时共享文件entries/physicalFiles均8、readyBytes1,617,341、nativePins1，activeDownloads/queued/failedRemovals/activeReaders均0，nativePending0；不据此声称最终新图已安装或平台已物理释放。私有`d1/analysis/two-drag-receipt.json`保存Root阶段判断，`phone-observation/originals-receipt.json`绑定19个原件，stored状态已实看。剩余仅按实际缺口补首次覆盖/最终LOD和源页读回，不扩大观察窗或重录整批。

随后最终源页`source-z6-final-390.png`与Map由Root实看：z6、非临时、有效高程100%、约2128.1m，内陆省级视野；与上窗metadata一致。原observer在started后拒绝rearm，准备按钮实际无副作用拒绝。未改该已封口身份、重启VM或清缓存；只用原guarded record-swipe做一次独立向南手势补录像，不能把它并入前一包。

补录原件`recording-1793266811029.mp4`实际13.04秒，受控上拖1000ms正常派发；API对应z6/51/25/2×3，SHA`b23eaa1db2dd159e5a75bbac71cd795f6909b460b360bcb66bf58e53f2c2b1db`、380,082B，metadata146.76ms、asset2.09ms，preview UNAVAILABLE。本次复用刚生成及已有cells完成新组合，没有新的terrain_raster_derived记录；不是原17窗整窗直接命中。Root核系统cache512×768、有效100%、2225.3m，亦实看最终手机来源页同一精度/z6/非临时。4Hz变化段由Root实看，拖动期间地形持续可见，7.25–7.5秒样本为“正在更新地形”，7.75秒已恢复稳定地图；新资产首个像素与精确最终呈现时刻仍不能从该片段唯一确定，提示消失不冒native物理事实。

私有`phone-observation/observation-result-supplement.json`、`analysis-supplement-4hz/contact-sheet-4hz.png`和最终来源/Map分析图持本次结果；54份原件逐项SHA读回一致。D1手机代理已结束、录制进程已退出，手机交给D2。此次未出现持续地形失败或文件删除失败，未据未覆盖范围的首次9.4秒重开缓存/预取/分块；D1仍保首个新资产可见时序及平台资源回落边界，不把有限返回/接管/最终LOD通过升级为整个D1/P2完成。

## 现有资源证据的进一步判定

fresh只读复核后，Root重读原v3行及实际资源owner：seq1物理文件7/readyBytes1,640,069；seq9与15的两个cache miss新增57,027和234,815B；seq18细图update成功后物理文件8/readyBytes1,617,341、failedRemovals0、下载/队列0。由同一owner差额得到314,570B已退出物理文件记账；`raster-image-resources`只有adapter真实remove成功后扣账，alias脱离不扣物理字节。因此该样本已覆盖到达8文件边界后的淘汰与新图准入，不再额外制造第九次拖动。nativePins1属于仍显示的地形，seq24/27与封口activeReaders0；合法ready缓存及当前pin不要求归零，不是排空失败。

当前Map进入Sky的普通导航需等待三个安装owner的`suspendForExit`全部ready，再redirect；原`map-ground-overlay.suspend`要求本代remainingIds0，slot仅真实`removeGroundOverlay`成功后释放原file/replacement的pin。e336已实际进入非空Sky的对应样本因而支持受控native命令清理及pin退休；结合源码是有界行为证据，不是物理GPU/Map进程内存释放证据。Root核过`index.tsx`导航门槛、`map-ground-overlay.ts`真实remove/suspend及文件remove/reader/retainPath实现，未发现应再改生产代码的失败。

保留的最小产品缺口是：普通候选在已发布命中窗内，从无地形overlay到出现正确覆盖的可见结果，以及对应平台资源走势。原PLAN要求首次正确覆盖与回落，不额外要求精确首像素毫秒、全帧零闪烁或每次PSS回到同一数字。可与D2普通退出合并一次固定视窗地形关→确认底图→开→最终来源/覆盖，不清缓存、不重录v3；若原生池暂不下降，不能直接判泄漏，只有实际持续增长或责任未结清才展开。该结论不扩大新全国地形或重开持久缓存/分块分支。

## 普通 f0a8e642：地形关开后的可见结果

2026-10-29，当前源码包含D2 selection/尺子/Input窄修的完整普通候选`f0a8e6421b5350462737ff02c237335c4a97419fa7ccc0ad10da7d8612363e2f`已官方auto-preview成功、Root实看新启动Map后绑定`d2-render-fix/starward-device-feedback-boh3m6/starward-device-test-DFc9jc`。341文件/5,211,670B；无任务观察UI/fixture/自动播放，source binding `10f103dbe81bbd8a58ee604cb2dd50acdcbcc0341e916085ee6729cc7d981823`。这仍是development_feedback，手机包字节没有独立读回。

同一月湾测试点近景固定视窗，Root打开层叠见地形开、另外两项关；正常关闭地形后实际坡度阴影完全消失，只保原基础地图；重新开启后同区域起伏阴影恢复，未拖图、清缓存或重新派发v3。真实来源页读回source pyramid z12、derived grid约35.3m、有效高程100%，当前显示来源同z12；返回Map再进入非空Sky成功。原件/操作回执归私有`d1-d2-targeted-20261029/d2-render-fix/phone-observation/01–17`，Root实看关闭、重新开启及两张来源图。

这关闭上述“关→底图→开→正确覆盖/最终来源”的可见结果缺口；本窗是既有近景已发布/缓存路径，不冒原17省级窗606条封口发布命中，不重做已有效的v3接管/最终LOD结论。没有录制首像素毫秒或本次平台资源阶段PSS，不能把两张截图的墙时差当延迟或原生物理回落。后续D1仍需与真实平台资源走势、正式交付/容量义务分开收口，不因该项通过标整个Goal complete。

<a id="f04-recovery-candidate"></a>
## 2026-10-30：F04原生故障恢复的最小候选与实际结果

正常拖动、接管、返回和最终覆盖证据不重做。原P2 F04仍欠不同机制：真实原生命令无法及时结算时，经现有“重新加载地图”替换故障Map，并让旧真实迟到结果只清理原owner。只在任务源码副本注入一次显式arm后的地形add/update完成延后，同时控制真实callback和返回Promise；调用本身、生产10秒超时、共享文件/pin、恢复按钮和唯一Map session不改，不伪造原生结果。后继真实onUpdated与地形实际ack齐全才交还旧结果；物理Map释放固定标unknown。

Root核读三份任务实现/定向测试并运行6项通过，含当前production coordinator/session的9999/10000ms超时、双通道、旧pin保留、迟到清理、当前结果隔离及第二次故障恢复有界；完整副本TypeScript检查通过。常规仓库源码1679文件SHA 960d5f1de9be8da7c11c451e00f363cc2b31ce2e7dbced9bdd64af7769cbf52b与既有普通1de19f3e输出均未改。

唯一可交手机专项为 fd17ed2b27a2e160d354126238b1058db65a8f05078e9262005d190cc90a4205，341文件/5,218,621B，main 1,999,489B；guard、11项静态检查、包体预算、实际编译API/Sky origin owner及复制前后hash通过。项目 E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-preparation/source-project，名称starward-f04-native-recovery-20261030，miniprogramRoot为weapp/；使用已实读ready的192.168.31.26:8787。Map产物中唯一__STARWARD_F04__与同源SHA已读回；实际手机Console可达性仍待用户，不冒已连接。

隔离依赖junction的E:/Dev与真实E:/dev大小写不一致，曾让Taro写入和读取两个独立entry-cache实例并产出空页面。两份失败产物均被origin guard拒绝，未复制到待用项目、未到手机；有界Node编译观测确认非空source写入另一实例。仅重新创建本任务可再生junction并统一realpath，未改依赖内容、生产配置或普通候选；修正后的完整产物已通过上述检查。原日志、每次intent/终态、路径修复及最终candidate receipt保存于任务staging和私有f04-preparation，不重跑失败builder。

准备时曾将最小清单交用户，状态为AWAITING_USER_SINGLE_RECOVERY；最新自主委托已覆盖该操作安排。下节记录Root实际执行，不再等待或重发这份清单。

### 公共静态检查的空产物遗漏修复

随后Root沿本轮实际失败修复原公共构建检查：两份缺common.js、页面只剩wrapper的失败产物，在旧inspectCandidate中全部11项均true。原发布origin guard曾正确拦下，未发到手机，但独立基础检查存在漏报。

当前inspect-production复用compiled-sky-origin唯一必需runtime/common chunk声明，并要求app/runtime文件非空；现有built-candidate测试同时要求整个inspection通过。没有另加产物平台、固定大小阈值或源marker冒产品正确性。两份实际失败产物修后均passed=false，当前fd17专项12项通过，实际编译地址owner仍通过，手机项目完整hash保持fd17不变；对照归私有inspector-before.json/inspector-after.json。

只改工具、现有测试与开发流程owner；不变更1679文件的手机源码绑定、专项内容、API或用户操作。这个有界结构检查阻止本次缺失共享运行代码的漏报，仍不替代真机画面或F04故障恢复结果。

### 2026-10-30 自主执行：恢复可见，旧移除未确认

**Candidate identity：** development_feedback，复用原fd17专项、960d5f1d源码和已连接的Android 14/N2401真机调试。1679源文件逐项匹配，341产物及手机项目hash未变；未重建或重发。官方运行时读回当前Map与任务sourceSha，独立ADB截图证明实际手机前台；没有直接读取手机包字节或认证正式AppID。LAN传输模式未独立读回，不能以“已连接”徽标认定。

**Invocation result：** 实核旧PID已退、8787无监听后，沿实际owner `tools/resources/backend-data.mjs start`和原`runtime-wlan.private.json`恢复API，launcher19388/API37580。原PostgreSQL/Redis健康、1544锁定文件及既有任务库只读检查通过，主机及手机wx.request的health均ready/200；没有恢复DB、迁移、提醒worker或collector。只复用已配对无线设备，发现重复transport后只断开新加IP连接，保原mDNS连接。

同一arm只消费一次。首次半屏拖动没有新add/update：30秒后仍armed/selected=null，地形完整覆盖可复用，故停止重复拖动。沿现有层叠开关一次关→开触发真实add，未rearm、换包、清缓存或伪造native结果。旧map-1/id91301的真实success在派发后16ms到达并被持有；生产超时在10,002ms发出恢复要求。共享提示已自动消失，重新打开原层叠面板重新呈现该错误，核动作文字为“重新加载地图”后点击一次。

**Observed product behavior：** 后继spot-map-2/generation1实际onUpdated、ready、地形native ack及displayAccepted成立；随后才放回旧success。Root实看恢复后地形、层叠状态，以及关闭面板后的完整Map，地形持续可见且没有旧错误覆盖当前状态。原件`screen-71ba252c-0763-41a1-ae58-3ca6dd26ae34.png`、`screen-b6a9c231-655b-47d1-aceb-ed097dd97f7a.png`和`screen-9620da6e-957f-476c-8de4-7324a6c618b5.png`分别保实际观察，不将调试徽标或callback单独作画面证明。

**Verified：** 一次故障→新实例→真实地形恢复、旧callback仅在后继资格齐全后交还、后继accepted身份保持，heldCalls0、14事件且无丢行。手机原方法没有返回Promise，因此本次只证明真实callback通道；双通道软件证据仍单列。原owner闭包绑定旧mapId，迟到结果只进入旧coordinator的cleanupLateMutation，不重新发布旧结果。

**Unverified：** oldRemoveAcknowledged始终false、无old_remove_result；不能由此分辨旧remove未完成、节点销毁后的无回执或同步异常，也不能冒旧pin已经退休。当前仪表没有记录remove派发，故不伪报已派发/已失败。保留既有“只有真实remove成功才释pin”和最多一个未知前任的边界；physicalMapRelease仍unknown。此边界是未确认而非清理通过，不能标整个F04资源义务、P2或Goal complete。没有新增长或独立成本，不再循环恢复/采集，也不以超时释放或扩大Map链修饰结果。

**Invalidated：** 准备期“未连接/等待用户”、旧PID和初次拖动“已触发故障”的推断均不能作为本次状态。ordinary1de仍是原普通候选，fd17结果不能倒绑普通运行或正式验收。

<a id="f04-resource-readback"></a>
### 本日后续：用户指定核旧地图资源回收

用户明确选择“核旧地图资源回收”，不是重做已有可见恢复。Root重新实读原 `f04-terminal-01a18a43.json`：14事件、无丢行、heldCalls=0，旧add的真实success已经交还；仍无old_remove_result，oldRemoveAcknowledged=false，且原仪表未记录remove派发，不能将其改判成remove未派发或必然失败。

当前有效手机候选已是effa普通版本，原F04窗口/手机调试在此前换候选时结束。官方CLI对当前项目作窄读回，得到 `route=pages/map/index`、`f04ObserverPresent=false`；当前截图确认原地点面板/地形可见。这不能追溯查询当时旧实例的native/GPU分配，也不能用当前进程总内存给原实例补签释放。

必要源码核对确认：`map-ground-overlay.ts`只有真实native remove成功才释文件pin；`native-map-session.ts`保最多一个未知原生前任，禁止再次故障建立无限Map链，其未知native寿命保留到appservice重启。它们说明现有保守边界，不建立物理释放证据。本轮未重arm、未重放F04/collector、未采Heap/PSS、未改生产回收策略。

**结果：核查已完成，原旧地图资源回收仍无法确认。** 原观察现场已结束且缺少按实例的释放回执，现有资料不能补成“已回收”或“已泄漏”。保留这一明确证据缺口；无新增长/故障或可定位责任，不继续重复恢复采集。私有 `f04-preparation/resource-readback-20261030.json` SHA `39b53454b0d815066b64003027a7d058a9fef7ad82428a2db5618cfc0484b884`绑定本次读回及原终态hash。

<a id="f04-resource-operator-checklist"></a>
### 用户操作清单：新现场的旧Map回收核验

用户随后问“这个有办法测吗，能的话你给我一份执行清单，我来操作，保存文件啥的”，再明确要求“那你准备好了之后告诉我，给我执行清单呀”并说“继续”。本节是现有F04责任的有界操作清单，不是第二份实施方案，也不重新打开已完成的Sky性能工作。**当前状态：本轮手机执行及三阶段保存已完成，真实地图恢复；旧移除已发但无回执，旧资源清理不能判通过。** 最新结果归[用户实测](#f04-resource-user-run-result)，下列清单只供追溯，不再执行。完整Goal工具状态仍paused，不自动续跑全国EOG；Root未代arm或派发手机输入。

#### 本轮能回答什么

- 可直接核：旧实例的remove是否真正派发、同步抛错/异步失败/成功/无回执各是哪一种；应用拥有的文件pin余额是否归零；旧coordinator的退休是否结算。必须按旧mapId/overlayId对应，不拿新实例的成功替代。
- 可辅助核：同一前台进程/启动身份下，重载前后Native/Graphics/PSS及SwapPss是否出现明显未回落占用。进程总账不能归因到单个Map，单次差额也不能断言泄漏。
- 不能保证证明：旧Map全部native/GPU字节已返还。现有项目通路没有经过资格验证的逐Map分配/释放回执；Heap主要显示所选JS VM的对象/引用，且取快照会触发GC。更底层的native分配跟踪有系统及被测应用profileable/debuggable限制，不将未验证可用的工具写成当前可执行步骤。参考[Heap语义](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots)、[Android内存分类](https://developer.android.com/tools/dumpsys#meminfo)、[native采集资格](https://perfetto.dev/docs/data-sources/native-heap-profiler)。

#### 已完成的主机准备及适用范围

- 沿原任务observer增加有界标量：真实remove派发/同步异常、callback/Promise结果、各mapId的文件retain/release余额、dispose及retired结算。最多12组/24个coordinator/256行，不向全局记录Map、图片、路径或凭据；生产coordinator字节不变，仍只有真实remove成功才释pin，生产10秒超时与单个未知前任保护不变。
- 新项目：`E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-resource-retirement/source-project`，名称`starward-f04-resource-retirement-20261030`，`weapp/`入口。绑定1679输入`48026264dd78f59f4bb42a99c39f9e2ac6def529650482e4753db1e3c3e45825`；原完整编译SHA `af2575353beafd101fa74e1aad1658e53eedfb3f9b8e2f34b9bf395e4f283518`，341文件/5,222,167B，main2,002,901B。当前开窗项目另封存为SHA `052a5b484fd527126707f5740b619b17bf9f3bbc56bc506ad889d4af833dbfaf`，342文件/5,222,192B，main2,002,926B，仅多下述25B注释文件。任务observer及既有内存anchor共18项通过，完整副本typecheck/build通过；原编译与当前项目分别通过12项产物检查、预算、device/origin guard。旧fd17与effa均再次核到原341文件/SHA，原件保留。
- 新候选已在官方CLI完整窗口打开。桌面读回已核到新resource schema、sourceSha及unused arm；这是`devtools`，不冒手机验证。现用API `192.168.31.26:8787/health/ready`实读ready/200，未重启服务、恢复DB、启动worker/collector或改VPN。当前手机连接/前台/实际地形由下面的`before`守卫核，不沿用旧effa会话。
- 私有保存脚本为同目录`Save-Checkpoint.ps1`，入口指向任务[scripts/f04-resource-checkpoint.ps1](scripts/f04-resource-checkpoint.ps1)。三次显式执行分别保存runtime readback和一次已有只读Android系统内存点，绑定同一前台进程及startTicks；不arm、不重载、不输入或强制GC。会拒绝模拟器、候选变化、已尝试相位、runtime重启及进程替换；读回后内存不合格会保留文件并如实标注。离线合成检查已覆盖这些守卫；实际桌面预检也已正确拒绝模拟器且capture仍空。三次手机采样本身尚未执行。
- 首次构建只因任务slot名超31字符失败，按原守卫缩短后完整通过。开窗后出现额外25B注释`pages/my/index.wxss`，首次原件已移至私有`ide-observation`留SHA；重新完整开窗后同文件再现，未独立追踪生成进程。Root核原341文件逐项一致、额外内容只有`/* pages/my/index.wxss */`，对当前342文件重新执行完整产物/device/origin/预算检查，另存`prepared-project.json`。原编译及原candidate JSON保留；保存脚本同时严格核原编译、当前完整SHA、每个原文件和唯一注释新增，不忽略路径或接受任意改动。Windows官方`.cmd`入口对多行JS实测拒绝，保存脚本已单行化并实核读回。日志/intent与准备检查归私有`f04-resource-retirement`和任务staging，不重放builder。

#### 用户执行（只做一次）

可直接阅读私有[执行清单](E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-resource-retirement/执行清单.md)。自动保存目录是：

**当前以下步骤均已执行，before/after/settled为COMPLETE；停止手机操作，不重复任何相位、arm或重载。** 旧终端编码问题已修，记录见[基线修复](#f04-resource-baseline-encoding-repair)，最终结果见[用户实测](#f04-resource-user-run-result)。

`E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-resource-retirement/capture`

1. 在已打开的`starward-f04-resource-retirement-20261030`项目点**真机调试**，使用**自动真机调试、局域网192.168.31.26**连接自己的手机。手机进入地图，搜索并选中“隔离测试·月湾营地”，仅开启地形；等真实地形显示后保持地图不动。本轮不进入云观星。
2. 在电脑**PowerShell 7终端**运行下面两行，出现`before: saved`才继续。命令会自动核手机VM/候选、当前terrain ack及unused arm，并保存基线和同一前台进程内存点。

   ```powershell
   $f04 = 'E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-resource-retirement/Save-Checkpoint.ps1'
   & $f04 -Phase before
   ```

3. 在**真机调试窗口的Console**只运行一次，确认返回`ok: true`：

   ```javascript
   globalThis.__STARWARD_F04__.arm()
   ```

   随后在手机层叠菜单把地形**关一次、开一次**；不重复拖动。arm不是ok就停，不再次arm。
4. 等现有约10秒超时提示，点一次**“重新加载地图”**。提示若已隐藏，重新打开层叠面板读取原错误。没有提示、掉线或一次重载后未恢复就停，保存当时画面及错误；不再点第二次重载。
5. 地形重新显示后，立即回同一个PowerShell终端运行：

   ```powershell
   & $f04 -Phase after
   ```

   再保存一张实际手机截图到`capture/02-map-restored.png`。失败则保`02-map-failed.png`，不要用模拟器图代替。
6. 留在同一地图、不拖动或切图层，静置30秒后运行最后一次：

   ```powershell
   & $f04 -Phase settled
   ```

   然后停止操作并保留会话，回复完成。30秒只是本次观察窗，不是产品释放期限。

三个相位各只执行一次。脚本自动保存`before/after/settled.json`、对应intent和内存原件，不再手抄三份Console readback。任一命令报错，把错误原样保存为`capture/stop-reason.txt`并停在原处，不重复同相位、不重新编译/arm/重载；即使内存步骤失败，已写入的readback也应保留。无需Heap、Performance、Allocation、清缓存或强制GC。新观察不能追认旧fd17现场的资源已经释放。

#### 结果决定下一步

- remove未派发、同步抛错、明确失败，或真实成功后旧文件占用仍不归零：沿首个可定位边界处理，再验证该边界。
- remove已发但没有回执：保原未知及单个前任保护，不超时清pin；不通过重复重载扩大Map链。
- remove成功、旧文件余额归零、coordinator已退休：可确认应用拥有的清理链完成。即使进程内存回落，也仍不写“全部native/GPU物理字节已释放”。
- 没有新增异常且必要清理已证：停止采集；只有实际资源增长、卡顿/退出或独立可定位成本才决定是否需要下一种证据。

**Cleanup：** 旧fd17 one-shot仍终态、原件保留在`E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-preparation`，不重复arm。新af257编译/052a one-shot也已消费，三阶段记录与用户JPEG原件保留；手机停止输入、连接暂留，API继续复用。没有本轮Heap/Profiler/录像/collector或网络变更；额外WXSS原件、编码故障、失败构建/命令记录与三个内存点均保留，不删除。

<a id="f04-resource-baseline-encoding-repair"></a>
### 用户执行第2步：旧终端编码修复及真实基线

清单交付后用户开始实际手机执行。用户上传截图显示Windows PowerShell下`ConvertFrom-Json`在1873字符报错；返回本身已是Android、同源48026264、spot-map-1 ready/terrain ack、arm未消费。Root先确认capture仍为空，失败发生在写入checkpoint/intent之前，没有覆盖或重放已有采样。

只读官方CLI保留当前resource readback为私有`operator-runtime-parser-input.json`；PowerShell5显式UTF-8能解析，默认编码则复现相同1873字符错误。保存脚本增加旧终端自动进入现有PowerShell7、CLI调用期间明确UTF-8并恢复原Console/OutputEncoding，JSON文件显式UTF-8；私有入口传播真实错误。离线守卫在CP936下通过，原候选/arm/进程等资格不放宽。

Root随后从PowerShell5/CP936入口执行一次`before`：返回`before: saved`，`capture/before.intent.json`为COMPLETE，`before.json`保Android当前ready地形、source48026264与unused arm，原只读memory owner取得一个前台同启动进程点并保存私有绑定。只保存基线，phoneInputSent=false、未arm、未故障/重载，没有Heap/Profiler；候选原编译af257/当前项目052a均由脚本严格复核。

该修复完成时交给用户的停点是清单第3步；之后的执行已完成，见下节，不再继续原步骤。基线成功本身不冒回收通过。截图、编码复现及本次操作回执归私有`f04-resource-retirement`。

<a id="f04-resource-user-run-result"></a>
### 用户实际执行：保存完成，旧remove已发但无回执

**Candidate identity / Invocation result：** 新诊断af257编译/052a项目，source48026264，Android development_feedback；三阶段全部COMPLETE、候选与首事件身份一致，三个系统内存点的私有pid/name/activity/startTicks逐项相同。用户的终端图中`Phone input sent: false`只描述保存脚本没有点击手机，不表示用户arm/关开/重载没执行。记录只有一个armed事件，armConsumed=true，heldCalls=0；最终54行，无事件/资源记录溢出。

**Observed product behavior / Verified：** successor spot-map-2/generation1真实onUpdated、ready、terrainAcknowledged与displayAccepted均成立，之后才交还旧add success。Root实际查看`capture/02-map-restored.jpg`，地形可见且仅地形开启；保用户JPEG原格式，不因清单曾写PNG要求重存。三份JSON、intent、内存原件与图片SHA/bytes归私有`user-run-result.json`。

**旧资源首个边界：** map-1/id91301迟到success交还后，remove call4实际派发，返回无Promise、无同步抛错；after与settled均没有该callId的callback success/failure。旧地形合计retain4/release3，pinBalance=1；dispose已返回complete=false/remainingIdsCount=1，retired=false。其它三个旧remove回执均真实成功，但包含恢复前的移除和另一id，不能替代call4。由此排除原来“是否根本没派发/同步异常”的缺口；本观察中应用清理仍未完成，不能记旧资源回收通过，也不能把无回执写成明确native失败或永久泄漏。

**用户实际操作与限制：** 用户补充“重新加载地图那个消失得太快，我是将地形关又开了三次才点到”，作为操作者报告原样保留。仪表另显示after与settled之间新map-2有一次remove成功、pin归零后重新retain；两次host读回相隔131,348ms。这不是严格一次关开或纯静置30秒对照，但不使一次arm、真实恢复及旧call4持续缺回执的证据失效。不强行把每条事件对应到用户自述某次手势，不混算device Date.now与host UTC的绝对差值。恢复入口消失过快/需要重复切层才触达记为独立待修交互，本轮未改提示策略。

**内存辅助 / Unverified：** 同进程三点PSS为982,482→999,094→875,722KiB，Native Heap为149,957→134,417→121,573KiB，Graphics为131,644→128,332→128,572KiB。后段总占用下降，但实际操作历史不同；这些总账不能证明旧Map底层已释放，旧pin仍1的直接记录也不能归因为全部native/GPU泄漏。physicalMapRelease保持unknown。

**停止与后续：** 用户的执行/保存已结束，不重arm、重载或补同类静置采集。必要证据已定位旧remove已发但无回执的责任边界；后续若继续实施，沿旧context/节点寿命及原session资源owner处理，不超时清pin、不建立无限未知Map链。保当前会话与原件，完整Goal仍paused；本轮未修改生产代码，也未标F04资源、P2或完整Goal完成。

<a id="f04-resource-repair-candidate"></a>
### 用户继续授权后的修复候选：保留清理目标，恢复动作持续可达

用户明确要求“继续啊，还要拿什么数据我来做，直到把这个问题解决为止”。Root据上节真实缺口沿原P2修复，没有修改PLAN、重放旧one-shot或恢复全国EOG。源码核到旧MapContext本已按coordinator缓存；问题是原Map JSX只渲染当前id，重载会立即移走旧节点，而本任务迟到结果要等后继ready且地形ack后才交还。上次remove call4因而发生在旧节点移走之后。这个生命周期缺口与观察吻合，实际平台remove是否恢复仍须下述一次手机回归。

**实现与软件验证：** `native-map-session`只为直接故障后继保留其仍有raster资源的前任id，Map JSX以稳定key/id把前任留在后继下面；只有真实raster retired后才移除。前任不可手势且全部native事件均被隔离，页面重进不重建已卸载id。文件pin仍只在真实remove成功后释放；未知物理Map寿命仍限制再造第二个故障后继。共享通知沿既有资源只为未解决的“重新加载地图”停用3秒自动消失，原普通通知时长保留；动作携带Map/账户/reset scope，隐藏、健康或替换清除旧通知，旧记录不可影响新任务。实际Map渲染回归在修前确实缺少旧节点，修后通过；恢复/通知38项、原栅格安装15项、任务observer11项通过。完整当前及任务副本typecheck/build均通过，软件检查不认证手机原生清理。

**Candidate identity：** `E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-resource-retirement-fix/source-project`，项目名`starward-f04-resource-fix-20261030`，`development_feedback`、任务resource observer开启。1679源输入SHA `83754241a0270e65e6dc9482c7f73a0810533c51d9ff56ac81ac5c17cbce2d72`，相对旧48026264仅本修复10个已有文件改变。完整编译SHA `de66555ff7f1c4e8e1d2e02c4e00d4d2ec3037fae24af4acee816d5ba0cb2cfd`，341文件/5,223,531B，main2,004,267B。开窗后仍仅新增同一25B注释WXSS，原341项逐字节相同，完整prepared SHA `fbfd9da06dde2fedd65dd1390130a15c1255c32d81e7847f0b9c08ba7be5acf8`，342文件/5,223,556B。两套完整产物各12项检查、预算、device/origin守卫通过；prepared未忽略任何路径。旧fd17/effa/af257/052a完整字节均受构建前后保护，原件没有覆盖。

**Invocation result / Verified：** 新完整窗口已沿官方CLI打开，旧052a窗口已关闭；没有更新上传或自动派发手机输入。首次冷开automation响应超时，保留原返回；当前页已真实可读后的一次只读evaluate成功，核到devtools、新source/schema和unused arm，不冒Android。产物inspector曾以不支持的绝对bundle参数返回false，改回原owner使用的repository-relative参数后完整检查通过，没有改产物或放宽检查。API192.168.31.26:8787沿原进程37580实读`/health/ready` ready/200，没有重启、恢复DB、worker、collector、VPN改动或新Heap/Profiler。

**原交付清单（本轮已执行）：** 私有[执行清单](E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-resource-retirement-fix/执行清单.md)要求新项目连真机并显示真实地形→`before`→一次arm→地形关开各一次→约10秒故障后再等5秒核按钮仍在→只重载一次→恢复后`after`和手机图。两个checkpoint复用已修编码/候选/前台进程守卫，不要求settled或同类30秒对照。用户已执行且说明按钮出现即点击，5秒持续显示没有观察；实际旧清理及后继地形结果见下节，不能因这项不同要求重放已消费arm/重载。

**Cleanup / 边界：** UI修复agent已停止，Root持有集成/构建/服务。当前只保新项目必要窗口；旧candidate、原截图/三点/私有数据保留。应用清理即使通过，physicalMapRelease仍unknown；没有具体新故障/增长或独立成本就停止采集，不冒完整F04物理回收或完整Goal完成。

<a id="f04-resource-repair-user-result"></a>
### 修复版用户实测：旧移除成功、pin归零、旧coordinator退休

**Candidate identity / Invocation result：** de66555f编译/fbfd9da0完整项目，source83754241，Android `development_feedback`；before/after两个intent均COMPLETE，候选、source与首事件身份一致，内存点绑定同一前台进程/启动身份。共41行、一次armed/一次successor创建、heldCalls=0，无行/组/coordinator溢出。Root未代arm或手机输入。此前用户关闭/重开项目后遇“请先结束其他真机调试”，Root先核候选未变且before尚未开始，再沿官方quit真实退出工具、核无工具窗口、重新打开同一项目；没有借清缓存、更改源码或重建候选处理，回执归私有`ide-debug-retirement-restart.json`。

**Observed product behavior / Verified：** 当前spot-map-2/generation1为ready，真实onUpdated、terrainAcknowledged、displayAccepted均成立。Root已实际查看用户的`capture/02-map-restored.jpg`（983,067B），地形可见、仅地形开启；保留JPEG原件。只在后继真实地形ack后交还旧map-1/id91301的迟到add success，旧回调没有替代当前呈现。

**旧清理最终结果：** 对应迟到指令的旧map-1/id91301 **remove call2**实际派发，随后同callId callback success；`selected.oldRemoveAcknowledged=true`。旧地形retain2/release2、**pinBalance=0**、removeAwaitingOutcome=0，无同步异常或失败。旧地形及另外两个空资源coordinator均**retired=true**。事件顺序为后继地形ack(seq32)→交还旧success(seq34)→旧remove派发(seq35)→真实成功(seq38/39)→旧pin归零(seq40)→旧coordinator退休(seq41)。因此原“旧remove无回执、pin留1”的应用清理缺口在这个修复样本已验证解决，不拿新Map的成功或另一旧remove替代。`lastDisposeComplete=false/remainingIdsCount=1`保留的是seq23较早dispose返回时的快照；后续真实成功及retired才是最终结算，不能误读为当前仍欠1。

**用户实际步骤 / Unverified：** 用户原话“已做好，不过‘重新加载地图’我没有等五秒，一出现我就点了”。5秒持续可达本次没有观察，不能记手机通过；不影响真实旧移除/pin/退休/恢复证据。共享通知的持续可达及普通3秒策略已有软件回归，本次不为补这5秒重演F04，后续正常使用若实际再消失才沿新现场处理。按钮动作已实际触发一次恢复，没有要求再点。

**内存辅助与停止：** 同启动进程before→after PSS 906,207→869,412KiB，Native Heap PSS 117,677→128,573KiB，Graphics 132,416→128,312KiB；不同项方向不同，不用总账断言逐Map全部字节返还、native泄漏或容量上限。physicalMapRelease仍unknown。应用旧图层清理及后继显示证据已足够，停止arm/重载/settled/Heap/Profiler，不再为未知物理字节扩场景。七份原件SHA/bytes、精确事件/进程资格及Root裁决归私有`f04-resource-retirement-fix/user-run-result.json`。本结果不代表完整P2/Goal、普通无诊断发布或全部原生Map物理回收验收。
