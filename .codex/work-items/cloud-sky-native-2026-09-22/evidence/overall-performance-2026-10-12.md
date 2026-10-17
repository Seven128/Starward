# 云观星整体性能优化

用户明确授权整体性能优化，保功能、少hack、便于后续维护并同步Context。沿唯一PLAN的B/E/F实施，不改变A–F架构和33项义务；图像获取／加工冻结，红光专项暂缓。

## 依据和改动

- r8用户确认十字同步，但缩放仍掉帧；最大Scene52ms、render→effect75ms、publish→nextTick157ms、同步copy1ms。不是FPS或GPU完成时间，见[手机结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-direct-result.json)。
- 现8404行真实BSC／48行星历／676星座线的CPU采样中，旧逐星appearance占833/2475 self samples。现一次视野共享明暗／大小常量，原公式、逐星有效性、星数和拾取门槛保持；SAO及tile选择复用同owner。
- 页面名称在接受帧的精确输入下memo化；一次projector与太阳读回替代逐对象重复构造。Hook在条件return之前，保名称遮挡、选择隐藏和独立深空失败含义。
- 银河按任务复用一次严格观测帧验证，示意／图片分开，资源Hook复用当前输入；没有全局地址缓存跳过可变输入校验。
- 土星纹理资格从完整环线段生成中分出共享投影，实际Scene和picking保原环精度。真实窄视野样本旧需求生成9848段，新需求0段，投影摘要一致；这不冒当前M31掉帧的唯一原因。
- 单指输入、GPU批次、精确星位缓存和现编码／原生／GPU生命周期已审查；本批没有无实测依据地替换它们、加入任意节流或降画质。

## 有界结果

**2026-10-13纠正样本范围：**旧`profile-sky-cpu.mts`请求的时间未匹配，实际退到hourly首项。复核为太阳高度+59.69256°、8404个位置、四视野实际星点提交0；所以下段及after-r2/r3/r4/r5的数字仅证明白天亮度筛选等Scene CPU成本，不证明夜间星点优化，旧JSON保留。手机纹理传输和用户反馈有独立真实证据，不受此样本错误影响。夜间替代样本及局部增益见下文。

同一私有固定公共示例输入、四档FOV 42/64/90/165、各800次暖Scene CPU采样：median **1.897→1.4055ms**，p95 **2.5037→2.0860ms**，total **1554.0718→1152.6733ms**。绘制命令与拾取快照摘要同为`a65987cab6f8b10bf6dea1f305980b5a94eedd4f2180453586eae5266888ad46`。此受控surface不执行原生GPU、图片纹理或React桥，不能推算手机FPS。见[before](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-cpu-profile-before.json)和[after-r2](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-cpu-profile-after-r2.json)。

同一真实土星星历、0.05°需求计算80次：median **2.7627→0.0428ms**，p95 **4.2817→0.0937ms**，投影摘要`6b3ef4c2babe029c7512ec28ec205c16a0fb4103b5f879cb713ef531662ac35e`一致；完整绘制环仍保留。见[before](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-body-demand-before.json)、[after](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-body-demand-after.json)。

相关既有检查：53项中40初次通过，13项因原受控投影替换与旧r8诊断／选择依赖缺失失败，修同一夹具后13通过；行为断言保原。更新的纹理资格案例通过；资源owner一项初过，6项因VM缺新resolver绑定失败，补原绑定后6项及OPAL实际资格案例通过。Miniapp本地TS5.9与生产差异检查通过。没有全量套件、变异测试、无关已过手机路径或图像重跑。

真实失败保留：初次profile脚本因CJS不支持顶层await失败，改.mts；第二次因把report Context引用误当完整privacy记录失败，改为同时核请求／响应为现公共示例身份。首次优化把投影移到亮度筛选之前且采样与编译／测试并行，median2.7188ms，更慢且时序不可比；保[该结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-cpu-profile-after.json)，恢复先亮度筛选并在无并发测试／编译下采after-r2，不把失败样本剔除后冒单调收益。

只读独审已核r8守卫与重复计算候选，无已证r8正确性回归；未运行检查或操作手机，完成即结束。当前8个生产owner的最终只读独审已完成：未发现新增阻塞问题，核原公式／剪裁、Hook次序与依赖、银河校验和资源退休、完整土星绘制／拾取保持；审查未运行测试／构建／设备，完成已结束。后续r9和r11原生结果分别如下，不能据CPU或源码通过标手机性能通过。

## 身份与维护

本轮前生产源码由同output owner的`performance-before-*` create-only保留；测量脚本与JSON在该owner，含Context的实际输入只在既有私有runtime。持久责任同步`spot-and-sky.md`，具体执行状态只见CONTINUE。临时手机诊断在相关性能问题闭合后移除；旧候选、失败、原图及未提交成果保留。

本批r9普通编译exit0，284文件／4,863,416 B，本地SHA256 `ae8e23c46c6c74c2a6a4189932c120d013275893a1e052d7176b5c5b7f80fff2`。正式推送记录由同output owner的performance-overall build/delivery持有。

23:30–23:32 actual guarded Android画面已见PERF1012F；手动入口出现星点／星座／具名星，默认目录M31→定位后原静态reticle、名称和菜单可见。仅为新候选建立受影响画面及缩放起点，没有重放旧搜索／日期／来源／姿态／后台验收。其物理反馈已取得如下，原等待解除。r8 feedback及新bootstrap均owner stop成功，源项目和手机数据不变。

用户r9物理反馈：“肉眼观看还是差不多”。掉帧仍FAILED_NO_CLEAR_PERCEPTUAL_IMPROVEMENT；23:34实际最新触控session24帧／JS67／绘41／拷1／桥80ms，end0，最小33.98°／当前200°。混合动作后的最后session，不当单独pinch或FPS。见[手机结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-overall-result.json)。继续分段诊断实际Scene／GPU传输／页面计算，不重复用户手势或推广桌面CPU收益。

手机r10分段诊断：默认手动45°、host guarded650ms拖动，20draws／22page renders、页面自身最高7ms；Scene max33ms，背景25／星座11／星点11／其余0–2ms，独立max不能相加；texture API22ms累计、9次upload／约15MiB和11次copy，非GPU完成或物理内存。见[阶段结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-stages-result.json)。

随后只改原GPU texture owner：ordinary非exact纹理在`bytes-cached.bytes+fullBytes`不超现pressure时保完整驻留，避免无压力裁小后移动又重传；exact全景窗口、当前used/pinned、失败锁与退休不变，压力目标数字未提高。新增moving ordinary artwork回归实际修前2次upload应1失败；修后12项纹理owner检查及TS5.9通过。原复制恢复夹具改为实际有压力的输入，保原断言。静态独审无新增阻塞；当前活动working set／临时upload峰仍可能超过pressure，未冒物理内存上限。r11真实反馈已取得，见下文。

2026-10-13收尾：r11相同默认视角／650ms host拖动26draws／29renders，upload9→1、约15→8MiB、copy11→3；背景max19ms／mean2、星座5／2、星点13／6、finish1／1。Scene max26ms，page compute max15ms，bridge max114ms；独立最大值、事件数量和物理帧率不可混用。实际天空／图层／名称保留，native传输减少成立，该host样本不认证手感。见[纹理后结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-residency-result.json)。其后单次用户物理反馈如下，已解除等待。

目录颜色转入现不可变本地render model一次准备，显示公式原样，wire/cache不变；同固定CPU输入输出摘要仍一致，median1.3118ms／p95 1.8541ms／800次total1061.0915ms，见[after-r3](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-cpu-profile-after-r3.json)。增加每时刻ENU方向数组的进一步试验median1.2783ms／p95 1.8924ms／total1052.1194ms，收益很小且引入额外数组／API，已精准撤回；保[未采用样本](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-cpu-profile-after-r4.json)，不放进当前收益。

全部临时page／Scene／GPU计时和trace／marker样式已经移除，保普通FOV提示及产品功能。收尾TS5.9通过；原accepted-frame六项初因旧fixture的空orientation snapshot缺alignment而失败，补同现owner的auto状态后六项通过，原断言未弱化。旧诊断源码、包、结果和私有截图保留。r12普通无marker版本已编译／prepare，284文件／4,861,417 B／SHA `c6fa5db8b1fb4a16b4374772694b11d87ba52adec72ecf9e40380049259cb484`，未推送；后续局部优化已使它不是最新源码，保留而不覆盖。

## r11物理改善与星点收尾

用户明确回复PERF1012H：“有改善，不错呀，还能继续优化吗”。这确认相对F的肉眼改善，未声明零掉帧或固定FPS达标。00:14已读原生画面保夜空、名称、星座和底部菜单；最新session36draws／41renders、Scene31ms、星点8／7ms、13次upload／约67MiB，最小FOV0.43°、当前60.8°。视野范围与先前host拖动明显不同，不直接对比累计值。见[用户反馈与画面读数](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-residency-user-result.json)，截图已在原private runtime create-only保存。用户授权继续，等待已解除，不再重复请求同一物理缩放。

当前时刻的星点高度不随手势改变，故在`resolveSkySceneFrame`原单时刻缓存内懒算显示透射率；仅亮度筛选后需要的星才计算，换时刻替换整组、换scene隔离，不保全天数组。白天和播放新时刻不提前全表计算。原公式／绘制／拾取阈值、观察模式及缺派生字段的旧输入路径不变。曾尝试提前算全部因子，已改为上述按需方式，避免扩大冷时刻成本。

`profile-sky-night.mts`明确选择太阳高度低于−18°的真实时刻，并要求实际星点提交不少于100；四个视野实际2641点、输入8404行，两侧绘制和拾取摘要均为`83e95bc6885c90be3c671e7bad3d5bd8592e958263cb770a3df0b9318bceb787`。固定暖缓存800次：[完整旧helper对照](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-night-cpu-comparison.json)3.4309→2.4633ms使用当时的提前计算版本；[当前懒算增量对照](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-night-cpu-comparison-incremental-lazy.json)为颜色已准备的旧Scene2.8310→2.4687ms、p95 4.6527→3.9088ms，约12.8%中位计算降幅。两侧共用当前本地render model；不测冷启动／换时刻准备、真实图片／GPU、React桥、手机FPS或整机内存。首个旧helper打包因新增model导出缺失失败，改为显式共用外部render model后取得结果；原失败不当产品失败。

必要检查：扩充既有exact catalog frame案例，核−45°→+45°→返回时刻的透射率与原外观公式一致、精确缺时刻仍缺；1项通过，TS5.9通过。限定只读独审`cloud_sky_final_frame_cache_review`未发现阻塞问题，确认颜色与publication、因子与精确帧同生命周期，原视觉／拾取和fallback保持；未运行测试／构建／手机，已立即结束。不新增测试矩阵或全套重跑。r11物理改善不自动转成r13帧率验收。

普通r13编译与正式auto_preview完成，SHA `f6aaf519b912074324b7ffaa5f2abfee2d26f324d19bc321bacac11a10bd4cd0`／284文件／4,861,630 B；本地主包2,096,928 B、Sky分包1,397,948 B，均在现预算内，仅本地原始字节，不冒qualified upload/CI。00:35–00:37 guarded Android实际看到了新入口→手动夜空及一次650ms平移后的星点颜色、名称、星座和菜单，临时性能文字已消失；官方预览vConsole仍在。没有重跑搜索／日期／物理三轴／后台，也没有再问用户同样缩放。见[r13结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-night-result.json)和[包体](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-night-package.json)。

r13 bootstrap及r11旧feedback已stop，r13设备session也已停止；当前generation临时目录删除两次返回cleanup_pending，官方精确project的close_project_window也返回CLOSE_PROJECT_WINDOW_FAILED，保真实工具失败，不关闭未知窗口／整套IDE或反复重试。源项目、旧包、私有截图与手机数据保留，现有owned v79 API继续供刚推送的普通手机预览使用。当前路径及后续最小清理条件只由CONTINUE持有。初次bootstrap start误传仅capture支持的transport而被参数校验拒绝，改正后正常捕获，属于harness失败而非产品失败。
