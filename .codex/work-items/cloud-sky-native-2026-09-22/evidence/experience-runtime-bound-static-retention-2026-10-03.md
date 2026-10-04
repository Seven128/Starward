# 静态保留连接实际 Caddy mount：开发完成，远端未验

Goal active、无预算、未完成。实时工作区/分支/HEAD符合授权，r37的177源码/保护pin逐项相同后才修改；六保护仍不动。本增量仅改Sky静态保留owner/检查/CLI、部署说明和对应Context/任务，不部署、发布、清理、刷新secret/连接元数据、执行workflow或重启BFF/watch。

## 当前真实外部状态

[现有preview只读核查](../../../../output/sky-existing-runtime-observation-1003-r1/result.json)通过已有staging连接元数据解析入口，在内存使用现有GH会话和SSH BatchMode/严格known-host设置，仅拟读取current pointer/receipt、选定环境字段和Caddy mount。没有调用会写receipt的preview check操作。SSH读取未取得有效结果，记`existing_ssh_read_unavailable`；原因未细分，不能当无挂载、终止服务或远端为空。原stdout/stderr/metadata、私钥、token/完整敏感字段未写入结果或源码。执行脚本/有限结果保留，不反复启动或重试，不从本机Docker那两数据服务外推远端。

## 责任与实现

既有 `inspectSkyStaticRetention` 默认仍为filesystem dry-run并接显式声明引用。新增真实消费者需要的`observeRuntime:true`，仍在同一preparation lease内完成，不另建库存/删除框架。

按validated `COMPOSE_PROJECT_NAME` 精确限定一个running Caddy；只读`container ls/inspect`的ID、running、mounts，不读取容器env/credentials。没有running Caddy时仅返回有范围的观察，不认证全集空；多个/错误ID、失联/无效输出拒绝。两个Sky readonly bind须分别为generation/publication及其delivery.caddy，位于当前配置store同一原生filesystem，sealed bundle实读并属于现有获准history union。未挂public根的情况不冒已经静态服务。

实际mounted generation可不同于最新prepared pointer，新增`OBSERVED_RUNNING_MOUNT`保留原因，和人工`DECLARED_*`及`CURRENT_PREPARED_GENERATION`分开。再次读运行态/publication并核文件/pointer稳定；写挂载、foreign/root/错fragment、途中变动都拒绝并释放租约。租约与全source/旧URL integrity保持；无TTL/age/LRU/deletable bytes，全部未知继续保留。不能把一个mounted observation当receipt、backup/rollback全集或生产容量。

[CLI](../../../../tools/deployment/sky-static-retention.mjs)复用现有release/operator-preview descriptor/env validation再调用同一owner，host上明确`--env <absolute> --lane operator-preview|release`，不执行发布、pull/up/stop、HTTP矩阵、backup或operation receipt写入。配置无store时明示未检查runtime/引用，不证明实际服务无历史mount。Docker与store须同host filesystem；Desktop/foreign路径不猜映射。

## 逃逸回归及消费者验证

新回归构造两次真实已封存bundle/store：prepared pointer已经前进到第二代，注入的Docker只读观察仍mount第一代。报告精确保第一代为实际mount，第二代及获准source/旧URL仍保，pointer字节不改。写挂载、越界、fragment不一致、运行态中途变动、空/多/坏输出、daemon失败分别按owner边界验证，租约退出无遗留。

有界mutation仅让owner忽略runtime观察，首条新行为回归即失败（runtime=null），保留[mutation源码](../../../../output/sky-runtime-retention-development-1003-r1/ignore-runtime-mutated-owner.mjs)和对应shadow检查。恢复真实owner后，Sky静态owner/实际release和preview消费者四组42项受影响检查通过。它们用真实临时文件及受控Docker返回，**不是实际Docker mount/SSH/生产receipt验收**；未扩为全产品测试。既有非runtime filesystem检查/default/no-store路径与release/preview协议保持，无无变化库存、HTTP、旧dry-run重放。

新增量独立review仍MISSING；自审与mutation/测试不冒独审。现有非部署`loadSkyStaticDelivery`仍按prepared pointer选overlay，未改其行为或声称它已追踪实际旧mount；需要actual current/operation receipt与runtime联合绑定后继续收口，不能把新观测器当该消费者已修。远端SSH未读回也不能称当前生产没有配置。

## 未完成与直接下一依赖

继续既有D：将validated operation/release/current/rollback/backup来源引用接同一保留owner，先核实际schema/文件边界/环境/身份/失败和旧v1的含义。使用实际root与receipt，不能以声明列表/旧成功日志替代；远端不可读取保持未知而推进必要owner消费开发，不重复此controlled generation矩阵或SSH连接排查。仍须真实host引用/旧兼容/全部磁盘与暂存增长、180GB/headroom、全产品10/20普通混合冷进入与200DAU成本/容量。

B当前完整图质、当前非线性显示PSF、来源权益/信用/加工、批量出版/Source Back继续开放；局部匹配否决不重调，不缩减Android/iOS/newMoon/实际page/native/总资源义务。Prepared/science ordinary registry仍空，HST矩形FAILED、M82完整输入缺，DevTools WXML/Canvas原FAILED。测试4GB及预期4core16GB/12Mbps/2000GB月/180GB不变，未部署/验收状态不升级。
