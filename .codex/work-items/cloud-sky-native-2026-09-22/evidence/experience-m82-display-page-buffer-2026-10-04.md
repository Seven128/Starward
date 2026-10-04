# 实际 page 较大 drawingBuffer / 固定辅助预算 / 恢复（2026-10-04，r101）

本代只新增Sky task、对应Context/当前进度，没有production或其他业务逻辑修改。复用r100最终实际page bundle，全508frontend字节与当前生产精确；沿原Map正式入口/Sky/React-Query/Taro native page/真实隔离controller与原M82 display-v1。普通registry仍空/未采用；未改任何缓存、纹理压力或默认辅助策略，没有旧已闭合decode/callback/故障retry/三档矩阵、源下载加工、提交推送部署发布/原BFF-watch重启。

## 实际尺寸和策略

当前task native Canvas node宽高setter连接到真实软件HTML Canvas drawingBuffer；原页面`getWindowInfo`受控DPR1→4→1、原onResize消费，logical viewport仍390×844，同原Sky实例/Context/相机/时刻/选中M82。不是只改query fixture返回尺寸或GL getter。默认软件GL depth/antialias=true、preserveDrawingBuffer=true等actual attrs已保存，不外推微信或硬件。

初始实际390×844的完整signal1316640B＋4x4 ceil-MAX scratch88440B，辅助需要1405080B；DPR4实际1560×3376，signal21066240B、整chain1405080B，合计22471320B。页面实例冻结的task显式caller policy15803512B/maxGroups1从未变，大小边界在原owner setup之前拒绝；较大条件及两次原public赤道网格切换触发普通帧，完整辅助upload0、live signal/scratch FBO0。原完整image group实际submitted，五个实际核心pixel非空且GL error0；receipt fine/coarse/any UNKNOWN、completed=false，没有假正来源或latched fault retry按钮。

回到actual390×844，原onResize退休旧Canvas/handles并用warm encoded重解码当前代，辅助恢复当帧真实MED来源。两PNG共1122957B、整个尺寸往返无新PNG传输；current image handle改变而身份/hash不变，未沿用旧Canvas对象。原拟合尺寸before/after两组GL-PNG-GL严格，完整RGBA SHA1130429605f8c4da84d207259975469883be9a71c3fcdab136837b8d51ff0e00、像素精确。最后原Map/退出清理encoded/lease/queue/RGBA-registration/GL全0。

这证明预算保护/UNKNOWN含义与可用尺寸恢复，不证明15803512B足以交付DPR4完整来源体验或适合默认采用。普通预算尚未采用；高DPR实际设备整体资源/来源可用性仍需在完整产品验收处理，不能以拒绝降级代替目标正常体验。

## 资源与验证范围

根saved reader核508frontend/164backend/58实际public read、478当前baseline/六保护、actualbuffer assignments/各组已绘来源、原PNG、返回像素与退休，无浏览器/HTTP/加工重放。88HTTP5766929B、987模型观察，各独立MAX texture upload+copy11800576B/buffer26112B、8活动image handles/13369344B源RGBA等价、FSlogical含staging2989415B、encoded54项2947613B/lease13/reserve1122957B/running2/pending6/native requests4。

**default drawingBuffer的21066240B RGBA等价另列**，不是源texture模型、辅助预算或所有GPU之和；driver/AA/depth/多buffer/native decoder/CPU-RSS/allapp物理总峰未知，不把各层独立MAX相加。较大buffer仅五点readback，没有完整大图PNG或large pixel equality主张；拟合尺寸两张完整PNG/raw才做严格逐字节检查。不认证官方包体、Android/iOS/WXML/native合成、质量、Linux180GB保留/12Mbps/200DAU混合容量或独审。

四个本代Windows目录（development、失败actual r1、成功r2、readback）118files24187400logical/24383792reported allocation、links最大1/前后稳定，含复用bundle/失败和executed脚本；不含后续allocation/document/log/checkpoint/continuity、旧源输出/依赖，不供Linux保留或容量。

第一次task变量after与原source-after同scope冲突，parse失败且未执行程序；改bufferAfter，原task字节/日志保留。actual r1又读了不在Scene proxy里的page-only getter result而TypeError，没有after/final；改为观察原页面public fault按钮的缺席，保UNKNOWN/latched fault区分，r2正常exit0。生产不为task预期而改。旧478源允许四文档路径之外/9138旧证据/六保护精确，原branch/HEAD/staging0/进程时刻保持。

## 后续责任

pending native取消/辅助故障显式retry/较大固定budget尺寸边界各有限定开发证据，不重复旧组合。下一回B共享显示质量：直接复用已保存实际SCI/native IDs、noise-v2显示估计与冻结RGB/三级/原20目录星点，处理已实证maxRGB硬归一化损失核心层次、同时保弱外围与星体的责任；完整科学保真/结构/配准/跨级/来源出版与成本通过才采用。原g/r/i科学信号本身i>r>g，暖色不能凭视觉当背景扣掉；已否决全局C/(1+maxC)整体变暗，不能无变化重跑。先核现有成熟Astropy传递与真实reference，再做一个有明确来源和全域适用原则的显示变体，不扫参数、局部手抠、减掉真实星系或生成细节。普通registry空。

M51矩形FAILED、W3覆盖、旧strictBack1/2/9/4通道FAILED、WXMLFAILED/SCSS-native/Android-iOS新Moon、真实retention、全200DAU混合容量、独审MISSING及原33义务仍开；Goal active无预算。
