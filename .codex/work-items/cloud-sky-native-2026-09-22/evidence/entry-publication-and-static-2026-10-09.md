# 上下文入口、出版隔离与完整静态读回

沿既有PLAN实施，不修改方案或提升33项验收状态。原输出在`output/cloud-sky-body-editions-2026-10-09`；以下是本轮有限证据，不是独审或原生/容量通过。

## 实现与行为检查

固定天体owner返回值原只复制image，调用者修改source、limitations或projection数组会污染同一hash后续metadata。现完整复制存储元数据，七具体owner与coverage保持各自合同。`edition-mutation-before-r2.log`在真实API工作目录复现污染；`edition-mutation-after-r2.log`11项通过。此前仓库根命令没有加载decorator配置的失败日志保留，不能算行为反例。

Sky上下文入口现先核完整参数，再开始原Query读取。临时读取失败显示ERROR/重试恢复，权威拒绝提供重新核验，参数不完整返回原入口；不会把请求故障当真实无数据。实际按钮重试再次核Context session，hide/换地点后排队的旧按钮不发旧请求，读取采用继续使用原selection/epoch围栏。`context-entry-recovery-1.log`保测试导入错误；修正到真实日期owner后`context-entry-recovery-2.log`26项通过。输出副本移除真实按钮guard的`context-entry-mutation.log`按预期失败于hidden queued retry；生产源码未替换。

银河源面板原机器清单指向可变discovery，默认静态出口只有bitmap。现合同持有exact metadata路径；真实光学DISPLAY与保留2MASS由原publication owner提供immutable metadata，HTTP和标准出口共用bytes/headers。客户端选定读取404/失败/错版都不借current；旧infrared discovery、display discovery及旧API404兼容仍保留。实际Sky面板使用presentedGalacticPublication的hash。`galactic-selected-http-1.log`16项、`galactic-selected-consumers-2.log`8项、`galactic-static-checks-1.log`8项通过。两个真实版次的4条记录/1,711,040B经标准writer落盘与校验，`galactic-selected-static-readback-1.json`保读回；没有新素材或采用。操作声明和生成SDK同步，生成初次把controller的colon参数写入schema被拒，已修为原schema的brace参数语法；不修改generator准入规则。

最新完整Sky/services：`integration-5.log`1031项/1030通过/0失败/1跳过（银河增量前），`integration-6.log`1033项/1032通过/0失败/1跳过。`app-types-10.log`、`api-types-6.log`、`contract-types-3.log`exit0；`app-types-8.log`保已修测试导入错误。`context-validate-r4.log`exit0仅证明结构引用，`diff-check-r3.log`exit0。`source-bindings-r2.json`517个有限输入，不是全部依赖或独审。

## 原生观察与释放

旧fixture274文件/4,632,214B已复制到`before-current-native-weapp-fixture`，原/副本SHA同为5f2e4024537b9afec338cdf226ac24198d75ccf5861ad5af712a724b916c6da2。`native-current-build-1.log`当前隔离构建成功（3条webpack warning）；`native-current-binding-1.json`绑定274文件/4,614,566B、SHA c2a4a9a6253ccb9031f14d1f5e42d7767f939dfbf113718c7cf76c065b80f1c1及LOCAL memory API。**该构建早于本证据的入口恢复/银河面板增量，不能当最新原生构建。**

该stage自有API8791/PID33980经真实factory/公开resolver生成测试FORMAL_SPOT Context，报告明确SAMPLE_DATA，没有持久数据库、acceptance controller或发布。CLI auto请求fixture/9421停在preparing，观察到期结束自己客户端；9421未监听，不声称服务端动作被取消。官方MCP针对新构建开页300s超时，随后无等待截图仍2×2；调用已经返回。旧9420公开SDK可读运行应用，systemInfo为devtools、SDK3.17.4、390×762、DPR3。进入实际sky/detail后显示“观测信息不完整”，canvas与dock没有出现；query可读且该Context在8791公开API有效。但活动项目路径/实际API origin没有闭合，不能归因到当前产品或渲染桥。

`native-current-sky-1.png`已查看，`native-current-sky-1.log`、`native-entry-inspection-1.log`、`native-runtime-probe-1.log`保原；console未得到匹配、network为空不是无错证明。再次运行旧probe复用了`native-existing-sdk.png`路径，初次PNG被后续地图观察刷新；旧log和初次所见事实仍在，该PNG不再是初次原图。此后截图使用独立路径，没有覆盖其它旧证据。

自有API exec17574已结束，8791不再监听，PID33980已退出。`native-entry-restoration-1.log`在路径及本stage Context守卫下navigateBack读回pages/map/index；SDK自建连接均disconnect，IDE23977与旧9420保留，没有账号/存储注入或清缓存。无活跃宿主调用；远端compile是否发生仍UNKNOWN。旧ctx随memory服务退休，下轮需重新resolve，不复用该query冒当前上下文。原生控件、来源Back、bridge成本及Android/iOS仍未验，既有FAILED保留。

## 默认静态库存输入

实际`approvedSkyPublicAssets()`通过原`exportSkyPublicAssets`与标准writer导出到`default-current-static-1/publication`，未传revision冒充dirty源码已提交、未部署。全部payload和index/delivery通过`validateSkyStaticBundle`读回：1738记录，logical payload81,588,995B；1128个SHA唯一内容/63,533,732B；1740个regular files/83,033,939B（包含index/delivery）。完整按家族记录在`default-current-static-readback-2.json`。R1曾把所有JSON计作metadata，R2分开manifest/properties与JSON数据（包括SAO/geometry/mask）；原R1保留。

记录数、LOD、别名与SHA重复不是可用对象数；ordinary Prepared仍0。这里仅绑定当前默认出口及实际本地文件，不证明照片Scene质量、科学/配准、权益采用闭合或真实设备效果。SHA去重不是已实施物理去重，Windows文件长度不是Linux物理盘占用；旧版全集、暂存/备份引用、非Sky业务、物理峰、混合负载与云容量仍UNVERIFIED。没有采购、部署、发布、外联或提交推送。
