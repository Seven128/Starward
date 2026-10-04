# 云观星目标、计划与实现审查（2026-10-03）

## 审查结论与适用范围

目标保持：在已确认商业合规和自主代码边界内，依法优先借鉴、复用成熟能力，完成 Stellarium Web 的完整交互星空体验。原生 WEAPP Canvas/WebGL、TWGL、Astronomy Engine、自有服务的现有分层没有出现需要推倒重建的证据。200DAU、预期单机4核16GB/12Mbps/2000GB月出流量/180GB SSD、4GB测试环境不变。

本次是主agent对目标、当前计划、源码和既有证据的阅读审查，**不是独立产品验收、实机性能测试或容量认证**。只修改任务文档；以下实现建议均留待后续执行。本次不改Goal工具状态、不启用Prepared、不部署、不下载或重加工源。输入摘要见[review-inputs](goal-plan-review-inputs-2026-10-03.json)。执行顺序只有[唯一PLAN](../PLAN.md)，本报告解释理由和完成条件。

应保留的已有基础：公共文件缓存的哈希身份、原子写入/回读、并发去重、租约和取消代次；publication的身份/版本/错误语义；同帧相机和绘制回执；共同图像loader与粗层回退；可见资源退休与active GPU保留。不能为了降低局部数字而破坏有效独立结果、来源、旧客户端兼容或画质。

## 1. 优先修正交付闭环与计划漂移

**已确认问题：** 旧PLAN同时包含历史Goal active、早期“接Prepared消费者”下一步和后续消费者已开发的记录；历史READY不能代表最新DevTools状态。已有很多局部源码/软件GPU结果，但普通Prepared registry为空、照片背景仍FAILED、WXML组合仍FAILED_DEVTOOLS，完整用户旅程和客户端总资源仍未闭合。局部成功不断累积不等于逐步接近可验收候选。

**本次文档修正：** 唯一下一依赖改为一个当前真实page/Scene的完整组合结果，并将图质/普通采用、端云成本列为同一计划中的依赖。历史记录保留条件，不再发出竞争执行指令。每轮按“用户结果、剩余缺口、下一依赖”收口，停止重复已闭合矩阵和工具启动。

**下一阶段可观察结果：** 冷进入→可浏览→全天/地平下与缩放→选中目标细化/细档失败保粗档→图层切换→时间/跟踪→资料来源Back→隐藏/返回及资源退休，在实际参与家族上保持同帧、可读、可点与来源对应。允许用有界开发环境先定位问题，但native/手机证据仍必须单列。现有watch编译错误先按影响核实；仅有新根因线索才恢复DevTools观察链，不再循环启动。不必等手机恢复才能继续独立图质和服务端工作。

## 2. 整场资源核算优先于新增预算或调度框架

**源码事实：** [公共文件owner](../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts)的`pump`用FIFO、最多2个任务；暖命中仍执行完整读回校验和索引持久化。冷写入含传输验证、暂存回读、rename后回读，分别保护真实完整性。[loader](../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts)有active和retained两类decoded对象；[地景Hook](../../../../apps/wechat-miniapp/src/features/sky/use-sky-landscape.ts)以其他图片估算选档。[page](../../../../apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx)传入的其他主图集合不包含全部光学parent、retained对象和下载/解码临时分配。它是选档输入，**不是完整资源账本**。两个文件任务槽也不等于限制所有暖文件解码并发。

**下一步：** 在现有owner补齐轻量观测，按对象身份去重，分开encoded、JS/ArrayBuffer、decoded/native、GPU texture、FBO/辅助缓冲、替换过程旧新共存和待释放项；报告当前值、峰值、退休后值、未知范围。不能把有重叠的逻辑RGBA和GPU字节直接相加为进程内存。采样覆盖真实层互斥、可见需求及parent/fallback，不能虚构所有家族同时加载。

**有条件的优化：** 若实测关键可见资源被后台细节拖延，才在现有队列补优先级/公平性/取消过期需求；若并发解码形成峰值，才加共享decode准入；若暖文件反复SHA/索引写入成为瓶颈，才评估同会话验证复用或LRU写合并，保损坏、clear、崩溃恢复与代次安全。不要先提高并发、扩大预算、强制全体先下载粗图或降低渲染清晰度。保既有fine-before-coarse和有效粗层恢复的实际语义。

GPU辅助政策须同时测画质、帧时和CPU/GPU同步等待。已有三次小`readPixels`/更多draw的受控候选不能只按纹理字节决定采用；默认仍未采用。16MiB是GPU压力目标，32MiB仅公共encoded预算，均非整场上限。微信全应用文件额度及真机解码释放要在目标环境复核。

## 3. 状态协调可分离，但以真实责任为单位

**源码事实：** page内仍负责selected W3 metadata/file/decode、最新相机需求、Canvas代次和恢复交接；光学已有[共同Hook](../../../../apps/wechat-miniapp/src/features/sky/use-sky-target-optical.ts)与[共同出屏资格](../../../../apps/wechat-miniapp/src/features/sky/sky-target-image-visibility.ts)。部分开发脚本绑定page AST变量名/旧JSX/旧源码hash，这使每次整场核验易演变为重写脚本。

**处理方向：** 实现第2项时，按需将selected影像生命周期和跨家族需求快照移到现有明确owner，页面保组合装配；以typed接口连接当前实际page消费者。受影响路径一次迁移并退休替代路径，保render/effect间隙的即时拒绝、onload迟到、同ref换档、Canvas恢复、原已绘来源。不要按文件行数大拆，也不要建立另一套通用渲染引擎。验证尽量调用实际owner/消费者行为；需要AST适配时只迁移必要边界，不能只换hash或用复制实现证明当前产品。重构不是交付前另设的一整阶段。

## 4. 影像质量必须与普通采用一起关闭

**已确认差距：** Prepared已有合法来源、TAN母图、三级PNG、传输、共同Hook/Scene及来源恢复机制，但M51 overview矩形/背景接缝仍FAILED，弱结构/颜色/PSF/绝对配准及整场可见credit未完成；M82部分科学输入不足。参见[真实像素证据](experience-prepared-optical-pixels-development-2026-10-03.md)和[当前独立交接](../CONTINUE-CLOUD-SKY.md)。本轮没有重新做像素验收。

**执行要求：** 复用现有共享离线链和原源；先分清源覆盖、配准、科学缺测、显示背景和LOD误差，再修对应共同机制；自动异常检测+代表机制验证+异常对象复核，不逐对象手抠。对合法但不足的源做有限研究/替换，不用“来源有限”把完整要求删掉，也不承诺不存在的高清细节。生成式补全不能进入真实天空层。候选要跨OV/MED/DETAIL、旋转、缩放、淡入淡出和不同天背景检查弱结构、接缝、颜色、覆盖及粗层恢复。

**普通采用条件：** 许可/处理披露、身份/配准/覆盖、可见质量、当前page的已绘credit与来源Back、完整传输/缓存/恢复/静态发布链、可接受整场资源均闭合，再显式采用registry/default政策。一个PNG或一个对象成功不代表全库；准备可重复批量管线和对象异常清单。未采用阶段持续保legacy普通链及其已知质量缺陷，不以回退可用宣布完整目标完成。

## 5. 服务端成本：先闭合现有静态链与磁盘生命周期

**源码确认的采用前缺口：** [标准导出器](../../../../workers/miniapp-api/src/sky-public-asset-export.ts)的`approvedSkyPublicAssets`当前枚举固定纹理/地景/广域/星座/SDSS/deep-sky，没有Prepared owner；[Prepared服务](../../../../workers/miniapp-api/src/prepared-optical-imagery.ts)默认descriptors为空。[静态bundle](../../../../tools/deployment/sky-static-bundle.mjs)已支持Prepared路由不等于标准导出器自动导出。[出口分类](../../../../infrastructure/deployment/sky-resource-logging.caddy)也未覆盖`/v2/sky/prepared-optical/*`。这些是未来普通采用前须补齐的集成项，**不是当前空registry导致的线上故障**。

采用时沿同一已审核registry贯穿API发现、immutable URL、标准export、旧版本兼容、preview授权边界、GET/HEAD/条件请求/headers、日志分类及客户端来源，杜绝测试专用注入通过而普通出口漏资源。公开成品与私有上下文继续分开；日志仅固定资源类别/字节/状态，不泄露位置、身份或token。

**成本机制：** [deep-sky API文件读取](../../../../workers/miniapp-api/src/deep-sky-imagery.ts)会每次readFile/验证字节与SHA；已有Caddy静态直出可减少此处Node工作。应测真实static/API请求分流、出口字节和CPU/RSS，不先加无界内存缓存或Redis。Caddy已有压缩配置，不重复作为新增优化；PNG/JPEG也不要无依据再压缩。200DAU本身不能证明12Mbps峰值足够，平均月流量与同时冷启动是两个约束。

**磁盘生命周期：** [静态release](../../../../tools/deployment/sky-static-release.mjs)为旧客户端/回滚保留历史资源是正确兼容策略，但180GB盘上还需统计当前与保留出版、暂存双份、镜像、日志、数据库/备份及安全余量。建立按已支持版本/当前发布/回滚引用的保留与清理规则，先只读盘点和dry-run，不能按文件年龄/LRU直接删除immutable旧URL。数据库、日志和全机备份沿既有部署owner，不另造云观星运维系统；清理或云发布依实际授权。离线源加工留在开发/出版环境，服务端不按用户请求加工原始大图。

## 6. 服务端SAO突发重复工作风险需要小规模验证

**源码事实：** [SAO publication](../../../../workers/miniapp-api/src/sao-publication.ts)以同一个`Map<string, Promise<...>>`管理正在读取与已完成tile，超过64条直接删除最旧项，不区分pending。在超过64个不同tile尚未结束期间，重访已被逐出的tile会创建新的read/parse/validate Promise。这是可由代码推导的路径，**尚无当前200DAU混合负载下发生频率、延迟或内存收益的实测**。

后续先用受控慢读验证同key去重在容量压力下是否失效，并测实际瓦片大小/并发；若确认，分离有界in-flight去重与ready缓存，按实际字节/成本而非仅条数制定保留预算，明确过载回压和失败重试。保出版/hash校验、旧请求身份、错误含义及原缓存有效结果。不要提前采用分布式缓存、微服务或把公开星表接口随意改成不兼容静态响应。

## 成本与验收的共同收口

部署容量沿[现有owner](../../../../project_context/deployment/decisions-and-verification.md)，用户资源预算不变。以实际每用户冷/暖下载量、回访命中、更新比例和云观星使用比例计算月出口，再加天气/图片/地图等普通业务；按12Mbps共享出口测10/20同时冷启动及混合业务，场景数不是并发上限。约1.5MB/s只是理论总带宽换算，不是保证吞吐。

记录首个可用画面、细节完成、p95/尾延迟、连续交互帧时、客户端总资源、服务CPU/RSS/DB/队列/磁盘、真实HTTP字节和成本；性能门槛在基线后明确，不能优化后倒定“刚好通过”。4GB环境测协议/恢复与可测资源，不能认证16GB容量。若瓶颈在出口/跨地域且客户端和现有静态链优化仍不满足，再以实际账单与效果评估CDN/对象存储；若在CPU/DB则先修对应owner。没有证据不新增付费基础设施。

最终回到33项有效义务、整体图质/交互、Android/iOS、包体、干净固定候选及必要独立审查。手机暂不可用、大字号继续暂停；新版月面尚未推手机，旧证据不能替代。任何未验或FAILED项保留原结论，不以本次审查或文档更新关闭。
