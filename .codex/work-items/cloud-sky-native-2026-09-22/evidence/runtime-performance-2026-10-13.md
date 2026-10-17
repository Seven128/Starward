# 原生提交、冷时刻与内存排查

用户明确授权继续四项排查及有实测收益、低维护的优化；原PLAN B/E/F，图像冻结／红光暂缓、33项及旧失败保原。不重跑已过旅程或完整测试；当前动作只见CONTINUE。

## 冷启动与换时刻的CPU责任

只读审查`cloud_sky_cold_time_review`定位：`attachSkyCatalog`在命中render catalog前仍逐次完整校验8404行；`presentSkyTime`的每个新时刻都会经过它。生产`createStellarCatalogClient`已经完整校验且冻结所有行／来源，Query已有`structuralSharing:false`能力。另有fine-target到达引起scene重展开、星座拓扑每时刻重建两个较低优先候选，未据想象改动。审查未运行检查／构建／手机，完成立即结束。

复用原private public fixture，在[profile-sky-runtime.mts](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/profile-sky-runtime.mts)中量冷构造和360个不同秒级时刻；前20个不纳入稳态统计。修前星表附着median3.1589ms／p95 5.0750ms；原星点展开2.9551ms、星座0.9084ms、Scene2.9656ms。冷样本：原出版准入9.2397ms、首次附着21.8463ms、星点展开7.0003ms；均为单次本机CPU，不含网络／手机启动。见[修前](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-runtime-before.json)。

实施仅沿原出版owner记弱引用准入身份：全部网络／304／离线响应仍完整校验后深冻并标记；消费者每次绑定version/hash，只有该owner已准入的原对象能复用；普通拷贝、浅冻或可变输入仍全验。BSC Query采用既有structuralSharing:false保身份，没新增数据／缓存服务。修后附着median0.0032ms／p95 0.0055ms，其它主要阶段近原量级；首附着9.0372ms只是单冷样本。两个端点真实绘出483星点，绘制／拾取摘要均`8ddb8e52b17d0df1cc15b3e224c2df61e8d5a2686bad60e70e0093365c5bcde5`。见[修后](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-runtime-admitted.json)。针对信任边界新案例1项通过，明确错误hash、复制后修改和浅冻坏对象被拒绝，已准入原行不可改；本地TS5.9通过。

Node强制GC后的持有量在120／240／360时刻约27–28MB附近，不是手机内存证明。没有拿暖Scene样本代替冷启动，未改精确时间／重复时刻拒绝、科学公式、取消或星数。

## 内存责任及手机样本

只读审查`cloud_sky_retention_review`未发现普通拖动／换时刻持有历史帧链：BSC、SAO按弱键保当前帧；Canvas latest＋一个在途；GPU finish退非本帧纹理；native hide清state／ref；encoded32MiB文件和16MiB在途政策保原。16MiB GPU pressure不是硬限，JS退休不等于驱动立即释放。审查未运行任何检查或手机，完成立即结束。

fine-target Query的key含精确at、继承30分钟gcTime，可能持有多个inactive advice envelopes；它不保8404星点。r16实际播放约八分钟仍只有2个inactive占位；暂停21:07:55并待一次聚合读数后3项／1active、序列化总量约8.6KiB，未发现逐播放帧累积响应。因此保原回收政策，不按可想象的历史增长重写Query。序列化字节不是retained heap。GPU submit的Float32Array短命分配实际均0.04–0.06ms，也不新增staging pool。

复用现ADB选择／foreground guard，仅从当前AppBrand活动推导唯一进程，读取Android官方`dumpsys meminfo -s`数字；raw dumps、PID和设备标识不保存。语义据[Android官方文档](https://developer.android.com/tools/dumpsys)，进程总数包含微信引擎／预览开销，不等于云观星独占或JS heap。用同r13字节外部副本绑定，不重推／重编译原版本；01:17真实点击播放后，11次／620秒采样已完成。RSS从1,621,984到1,637,664KiB，区间峰1,676,892KiB；Graphics恒390,148KiB，Native Heap从140,620到138,956KiB。隐藏Sky至设置页后65秒RSS1,508,536KiB，Graphics404,432KiB，设置UI本身及平台池不能冒天空独占。见[汇总](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/phone-memory-r13-summary.json)及同目录原始数字JSON；这段没有持续累积证据，不认证整场无泄漏或绝对内存预算。实际星空／播放到21:12:10已保存private画面；后续公共预警出现无法更新提示，保事实，未据此改天气或重跑相关旅程。

## 原生提交／GPU探针

临时独立子组件每10秒显示聚合数，不逐帧更新页面。每10帧量一组公开GL调用、Float32转换和nextTick；Scene／copy计时、GPU资源live计数及fine-target条目数量分开。GPU elapsed仅在官方[EXT_disjoint_timer_query](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query/)可用且非disjoint时读取；不插gl.finish，不把GL调用返回或nextTick冒物理呈现。wx.getPerformance尝试只读官方launch／render／script数值；官方页面本次无法打开，实际API形状沿安装的Taro4.2.1声明，未臆造内存API。

r14诊断候选已编译但未推送；自审发现探针在GPU timer不支持时未清global GL引用，故修正诊断退休并另编r15，r14保留不用于内存结论。这是假设探针错误，不是产品泄漏。生产最终版本须移除全部临时探针并保普通功能。

r15 PERF1013B正式推送／可见后bind。首个surface初始化29ms、首Scene29ms；实际持续1×时间后1968次提交，Scene max29／mean12.44ms、同步显示复制1／0.04ms。抽样Float32构造2／0.04ms、bufferData调用1／0.01ms、getError4／0.26ms，毫秒时钟的0不是真正零耗时。live固定T9/B7/F0/R0/P8，encoded199项／9租约／10.3MiB，fine-target2项均inactive、序列化约0KiB；播放中没有此类响应历史增长。见[r15实际读数](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/runtime-r15-observed.json)。当前无依据增加Float32池、改变GPU错误检查、降画质或调大预算。

重要测量纠正：原“bridge”最大136ms／均32.58ms来自Taro.nextTick。核安装的Taro4.2.1 `dist/next-tick.js`，无pendingUpdate时会20ms轮询到100ms；它不是原生提交时长，旧JSON保持原字段但限制解释。GPU EXT timer实际不可用，wx.getPerformance没有读到匹配的launch条目，因此不能认证GPU完成时间或手机冷启动。r16改用现官方`setUpdatePerformanceListener`公开的pending/update时间戳（withDataPaths:false），只测数字；Taro/miniprogram-api-typings的本地声明已核，不读取私人payload。

r16 PERF1013C正式推送、fresh bootstrap可见后bind。02:12实际暂停帧累计8658帧、8713个非merged原生update样本，pending→update-start差max157／mean10.12，update-start→end差max107／mean8.86。官方类型未明确单位，截图临时ms标签不升级为独立校准后的延迟，更不是帧率或GPU完成时刻。Scene max47／mean16.20ms，同步copy1／0.06ms；Float32构造10／0.06ms、bufferData1／0.01ms、getError8／0.35ms。live T10/B7/F0/R0/P8，encoded199项／10租约／10.3MiB；取消预览回21:00后texture回9。02:13实际取消恢复10月13日21:00，不提交测量时刻。见[r16实际读数](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/runtime-r16-observed.json)，截图仅在private runtime。两个诊断代次没有严格同条件对照，不从均值差推断回归或增益。

本轮收敛：保留BSC准入身份优化；不改未证收益的原生标签/提交模型、GPU同步或池、Query回收、画质、预算或科学精度。冷CPU和surface首帧有局部读数；完整手机冷启动、GPU完成时长、整场及其它设备的内存仍未验。所有临时probe调用和导出已从生产路径移除，完整诊断源码保存在output同owner，未删旧证据。移除后本地TS5.9 noEmit通过；旧功能旅程和已过测试不为收尾重复。

本轮生产准入优化另经`cloud_sky_admission_change_review`限定只读独审：无阻塞，完整外部校验/失败失效、版本绑定、冻结身份及弱引用寿命保原；Query信号及条件没改。360帧均执行，但绘制／拾取hash只取首尾两个端点，共483星点，不冒逐帧比对。当前BSC实际不输出可选SourceSummary.attribution嵌套对象，未来扩展须补其冻结规则；这不是本轮引入的回归。完成立即结束，未运行检查或操作手机。

工具失败保原：在worktree源项目直接start被external_physical_directory_required拒绝；copy先mkdir后cp导致EEXIST，确认新目录为空后逐子项create-only复制并核原r13指纹，才建立外部session。没有放宽guard、强删目录或动手机数据。

## 包体边界与普通版交付

r17无探针候选编译成功，但主包2,097,196 B超过2 MiB限制44 B，保FAILED候选和包体回执，未推送。新增的Scene专用reference/version/hash校验入口当时位于主包transport模块；现把相同逻辑移到`sky-stellar-scene`，transport仅暴露私有WeakSet的只读身份查询，准入登记仍必须经过完整校验和冻结。没有缩短产品文案、删能力或压低包体门槛。因生产归属确实改变，重新运行受影响的同一信任边界案例1项及TS5.9，均通过，未扩大套件或重跑CPU样本。`cloud_sky_package_review`限定只读独审无阻塞：无授予准入的公开入口、版本绑定完整、依赖Sky→transport→contracts、弱引用/冻结/Query生命周期保持；完成立即结束。

### Candidate identity

`development_feedback`，r18／runtime-final，当前dirty worktree／既有HEAD，v79 LOCAL＋MEMORY_TEST＋显式天气fixture服务。SHA `a4c6436844cf3b921fd3da012f68b4a304e0ef41d9f686eac80b86a7b21312cd`，284文件／4,861,960 B。主包2,097,108 B，余44 B；Sky1,398,098 B，content1,012,709 B，spot354,045 B，现预算通过但主包余量极窄。见[新构建](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-runtime-final-build.json)、[包体](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-runtime-final-package.json)。r17及r14未推送，不能当当前手机候选。

### Invocation result

现官方`auto_preview`完成；新外部generation／fresh bootstrap在授权无线Android上捕获到重新进入的普通页面，再按实际可见按钮进入手动浏览，观察后bind。见[调用回执](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-runtime-final-delivery.json)；官方调用和operator绑定不冒手机字节读回。没有QR、上传体验版、发布或云部署。

### Observed product behavior

02:22实际手机可见普通星空、星点、星座图/连线/标签、方向/设置及底部菜单；临时PERF1013文字已消失。图像仅渲染既有合格资源，没有获取或加工。private截图`runtime-r18-ordinary.png`保留。此处只认证新交付画面；没有重新进行搜索、日期、三轴、后台或双指验收。

### Verified

新增准入信任边界、移除探针后的类型与实际构建、调整后的包体及限定独审成立。r16实测与r18相同校验逻辑只发生代码归属移动，旧有界CPU证据按该范围复用；最终源码/编译JS均无本轮runtime probe引用。图像冻结、红光暂缓及全部33项保持。

### Unverified

真冷手机启动、GPU完成时长/FPS、长达整场或其他设备的内存、固定候选/iOS/完整验收保持未验。十分钟进程内存没有持续上升不能证明绝无泄漏；单次surface初始化不能证明整App冷启动。物理AppID/SDK独立读回及phone bundle字节未认证。

### Invalidated

每次新代次均弃用旧截图和输入授权；r15/r16临时探针不作为最终普通版或固定候选。Taro nextTick字段不再解释为原生桥接耗时。r17超限候选不交付，历史r13预警无法更新现象保真实范围。

### Cleanup

r15 CqdU5p、r16 wujDlc及各bootstrap均owner stop；旧r13 TNUnvO也已完成。r18 nested AtbokJ和bootstrap zJNNGz已停止，无可复用截图/输入授权。r18 aAm15k临时generation仍`cleanup_pending`：精确project官方close返回CLOSE_PROJECT_WINDOW_FAILED；打开同字节源项目后再owner stop仍pending，随后新开的owned s2已官方关闭。没有强删或重启未知IDE。待DevTools释放该已核generation后再同owner收尾，源项目和旧包不删。官方project_list实际4项为已有入口，没有本轮private generation，不删未知旧条目。API owned PID19796/8797保留供已交付普通手机预览；当前无编译/推送/内存采样/用户动作等待。完整Goal不标complete。
