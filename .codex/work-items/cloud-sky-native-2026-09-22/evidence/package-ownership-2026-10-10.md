# F：普通生产包的合约归属与预算修复

仅在既定worktree/分支续用active、无预算Goal；固定图像继续冻结，33项及全部历史失败/未验保留。无新任务目录、素材下载/像素操作、云写、平台外发、提交或推送。

## 问题与改动

原保留普通优化输出`weapp-check-resource-origin-1010-r2`主包2183381B，比仓库2MiB预算超86229B。最大主包组为既有B图标879145B；真实消费者仍使用这些资源，未删图标或改采用。原shared common里单个合约聚合factory约142KB，包含仅Sky消费的光学验证器。

复用既有webpack5机制，仅对`packages/miniapp-contracts/src/index.ts`增加转导出入口的`sideEffects:false`规则，使编译器沿实际消费者决定叶模块归属；不改整个合约包、前端或样式的sideEffects，不拆第二份合同/状态/注册表。规则/类型由`apps/wechat-miniapp/config/contracts-reexports.cjs`和`.d.cts`持有，现Taro config唯一接入。

重要限定：标记转导出入口也可能跳过未使用依赖的初始化。首次真实webpack回归保留了这一反例——合约内全局注册消失，`registrations`未定义，见[原r1失败](../../../../output/cloud-sky-package-ownership-2026-10-10-r1/contracts-tests-r1.log)。没有把这条性质当成立；新增构建前检查完整本地依赖图，审计当前56个模块。当前仅本地声明/对象冻结、过滤声明派生、内部Set/WeakMap及已知过滤schema检查，外部仅现有noble纯hash helpers。入口只许相对转导出；全局写、未知调用/依赖、裸初始化、内建名遮蔽和改变入口执行责任会拒绝使用该标记。这个项目专用语法边界不是通用JavaScript纯度证明；新初始化机制/外部版本改变需重新核原责任，不能扩白名单绕过失败。

成熟依据：[webpack tree shaking](https://webpack.js.org/guides/tree-shaking/)说明纯转导出可以跳过、错误sideEffects声明会丢CSS/全局设置。具体Taro合约聚合和此次叶模块迁移由实际输出观察得出，不当作所有webpack版本的保证。

## 实际证据

两个新ordinary/fixture-off/diagnostics-off生产优化隔离构建r1/r2均成功，最终fingerprint相同；源AppID仍在，不能叫formal CI或可上传候选。r2共274文件4644224B，fingerprint`f75bdeecbc72b83b718441dadec498db4b3e017d3bd9a37ac08450da423ee4c2`。原r2旧产物仍完整匹配`e3d362…`，没有覆写原输出。

| 包 | 原B | 新B |
|---|---:|---:|
| main | 2183381 | 2096423 |
| content | 1009118 | 1012709 |
| spot | 354055 | 354045 |
| sky | 1095841 | 1181047 |

主包减少86958B，现余**729B**；没有扩大2MiB/20MiB仓库预算。新输出现有inspect owner的11项predicate全部true，但余量很紧，未来输入/配置必须重测具体候选。官方单包原文仍MISSING，不能把此仓库预算说成新认证的平台容量。

[真实绑定](../../../../output/cloud-sky-package-ownership-2026-10-10-r1/current-binding.json)核同一实际before/after全文件清单、全部路由及全部非JS文件：**163 assets、23 WXML、26 WXSS字节未变**。native-optical验证器错误marker从common移到Sky sub-vendors是代码位置的有限观察；不是native加载或Scene证明。实际新bundle自带runtime/common执行纯地址owner，API/资源/W3/SAO/cache环境和无preview credential的5项角色全部true。v8输入、r17库存及冻结回执保持原pin。

守护与编译回归真实webpack执行main/sky结果、保持消费者显式setup，同时拒绝带全局/未知初始化的合约依赖；保原r2路径scope错误、r3 fixture图断言错误，随后修scope和与Taro保守barrel图对应的fixture设置，不削弱真实输出预算/资源/行为要求。当前[相关工具回归](../../../../output/cloud-sky-package-ownership-2026-10-10-r1/affected-tests-r1.log)21/21、[发布消费者/工作流](../../../../output/cloud-sky-package-ownership-2026-10-10-r1/release-consumer-tests-r1.log)30/30及[合约行为](../../../../output/cloud-sky-package-ownership-2026-10-10-r1/contract-behavior-tests-r1.log)68/68通过。App类型检查使用其安装的TS5.9.3通过；第一次根目录`--bin`误选根TS6.0.3而触发已有baseUrl弃用，原日志保留，未改tsconfig迁就错误编译器。Context校验通过。

## 未闭责任

最终集中[工具回归](../../../../output/cloud-sky-package-ownership-2026-10-10-r1/final-tools-tests-r1.log)51/51通过；[最终pin与33义务](package-ownership-final-binding-2026-10-10.json)保留本次有限状态和所有未验，不作为另一份采用清单。

本次只修当前普通生产优化包预算和合约归属；正式环境绑定/DevTools上传包权威、原生跨包加载与完整交互、正常Canvas控件FAILED、Android/iOS、实际OSS/ESA/public-origin/OCI、旧版/current/rollback/off-host、同配置容量/物理峰和独审保持各自原状态。未独审，不把自查/静态JS位置/纯VM或测试汇总冒充。固定图像的采用/质量、追加覆盖延期及全部33项保持，Goal继续active。
