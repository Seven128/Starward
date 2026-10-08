# R1 当前就绪图与Canvas已绘快照交接（2026-10-06）

## 已修责任

原native loader就绪payload已同步有效，React commit尚未完成时，排队Canvas帧仍使用旧空tiles。这一责任已在原[useSkyNativeImages](../../../../apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts)、[光学Hook](../../../../apps/wechat-miniapp/src/features/sky/use-sky-optical-hips.ts)、[Canvas lifecycle](../../../../apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle.ts)及[actual page](../../../../apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx)修复；只属当前试验光学交接，不采用任何普通新影像。

native Hook用同一owner dispatch payload提供currentImages只读入口，canvas/revision/hash/active current scope与owner同时核验；cleanup先清该引用，旧getter在新scope渲染后、即使effect还未跑也失效。没有另一个bitmap/file cache、新请求/槽或React框架。光学Hook用同一个source/candidate/保粗及稳定order/pixel排序函数投影普通返回tiles和即时读取。

原单Canvas writer在paint snapshot前一次resolveFrame；page仅在当前可见、同Canvas generation、有效data frame有读取入口时取当前光学tiles。返回新的不可变frame（原queued React frame不修改），生命周期latest、paint、presented/pendingSkyPaint均是同一已解析frame。位置/时刻/pose/镜头、宽场其它层及真实GPU贡献判断不变；当前来源仍由Scene真实正贡献完成，不以native ready冒已显示。错误仍走原fail/reset/retry，hide取消并清latest，不保旧Canvas句柄，也不新增绘制循环。

## 失败前与受影响检查

[原五失败](../tmp/ready-handoff-failing-before-2026-10-06.log)来自实际loader/Canvas owner与刻意暂不提交React state的回归：首就绪读取、scope边界、失败/迟到、旧空帧→真实paint/presented、读取失败的context退休/重试。之后补Canvas identity/hide前读回和光学当前payload的source/父子覆盖/稳定序，最终[58影响检查](../tmp/ready-handoff-affected-tests-r2-2026-10-06.log)全部通过，包含原Canvas/loader/native chain/Scene/普通试验隔离。不是与实现同义的source marker检查。

完整[WEAPP类型r2](../tmp/ready-handoff-typecheck-r2-2026-10-06.log)退出0。首类型失败的exactOptionalPropertyTypes已用有效frame条件spread修复，原失败日志保留；没有backend源码变更/重复backend类型矩阵。只有上述四产品owner、一原Hook测试与一新增回归改变；已有未提交源码、资产及审查文档按[当前快照](../tmp/ready-handoff-current-inputs-2026-10-06.json)保全（67源码/300WEAPP/10文档，2335旧pin核对）。无提交推送。

## 同实际输入的消费者证据

[当前完整page](../../../../output/playwright/skymapper-ready-handoff-page-1006-r1/result.json) 522前端inputs、62 Scene/107请求，原v2 hash24097ad218df3f817f9d5d92747d78025dbfb00584c9d33aa01468c0786f6028和七PNG4,357,637B；实际Map→正式spot→Sky→ground off→M104搜索定位→0.15/0.25°往返→完整来源/rights链接→Back→Map退出。React/Query/WEAPP桥和软件WebGL为实际source；native文件/image回调受控，样式未完整native排版，DevTools/手机未验。

[有界比较](ready-handoff-comparison-2026-10-06.json)：五终态同相机/时刻、每份1,316,640 RGBA字节与原r3严格相等；全部成功binary route/hash/bytes身份集合相等，Back零PNG body。0.15°/0.25°原名义视口3/4格完整，首有源帧来自当前401329/401331。

当前最后空request仍是[]（qualified后37.0ms、Hook实际新结果前），resolve-frame-enter[]在52282.1ms，exit/immutable paint snapshot变为[401329,401331]；当前generation3，真实Scene先完成/接受于52355.1ms，React首次非空结果稍后52357.1ms。说明它确实消费已经就绪的原bitmap，不能把非空旧React fixture或task直接塞帧冒消费者。空request可能在ready前或后被旧draw closure重新提交，这是同一状态交接责任；第一次比较脚本错误要求所有request必须先于ready，原脚本/失败日志保留，r2改为实际必要条件：空输入先于snapshot且早于新React结果，不重跑页面来过该偶然时序。

原三null→当前两null，当前ready后的null完成帧为0；剩余两null都在中心native资格前，一partial保留，完整连续恢复仍FAILED。首完成至首/完整来源213.2/302.0ms、qualified至首完成120.8ms限一次软件样本，不宣称设备/统计性能收益或整体恢复通过。原1×1 GPU贡献readback仍每首Scene执行，current Scene73.0ms仅同步软件wall；不删真实贡献，不据它调手机帧率。

encoded6,457,019B、source RGBA等效14,417,920B/9handle、GPU纹理11,763,712B/buffer28,308B和两槽/保留压力模型峰与原相等。逻辑文件峰减少128B来自warm时间戳编码，不是图像、缓存或物理内存收益；不同MAX不能相加。最终decoded/GPU/request/encoded owner0，空索引26B；临时Browser/API关闭，原BFF/watch/IDE未重启。

普通Prepared registry空/普通HiPS关闭；图质/科学UNKNOWN、绝对配准、全目标runtime、公开采用/发布、物理资源200DAU和独审仍缺证。共享入口是有真实首消费者的原owner扩展，未独审，不扩用到其他影像家族的即时读取行为。保全部33验收，原已退出图质配置不重开。

## 下一依赖

Q1 有限M104原区域外围的实际资格：R1当前owner就绪快照交接已源码修复，五失败前反例/58影响检查/WEAPP类型及实际62 Scene/107请求通过；原第三ready-null已变为真实两格同帧来源，五终态RGBA差0、等binary/模型峰/退休，普通Prepared空/HiPS关。剩余两null为首图未ready，连续恢复与设备时耗仍FAILED/未验，不再循环改状态队列、读回资格或扩缓存/槽。下一复用已缓存七order8 PNG、当前v2/原page/Scene及0.4°名义六格计划，在实际页面缩放至0.4°/0.15°细化/回0.4°/来源Back核完整外围原像素、可见格/完成来源、弱结构/照片边界/缺测含义与退出；先同原静态/内存试验小样决定有限区域可保留还是退出，不因保守cap十二格先下载视口外邻格，不把离线预览、软件成功或有限视域冒广角/普通采用。SkyMapper 8°order3及其它已退出配置保FAILED，有新成品/元数据才重开；合格全天背景、其它区域/真实非Messier与P1独立义务不缩减，不恢复PSF/TPV/全库或重下月面/七图。完整33项、DevTools/Android-iOS/月面/全图质交互、science UNKNOWN/绝对配准/公开发布/物理200DAU/独审保留；SDK无新根因不循环。Goal active无预算，无提交推送采购部署外联。

本增量PROGRESS：修掉已就绪仍绘空的实际一帧责任，且来源、终态和资源未退化；R1未达到完整设备/连续恢复验收，独立Q1不再被运行链每一次局部优化串行阻塞。Goal active，无预算，未完成。
