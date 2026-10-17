# 原生跨realm二进制与实际影像恢复

当前官方 DevTools 2.02.2609232 / SDK trial3.17.4，隔离内存 API 8791，19:00 / 45° / DPR3。canonical 8787/watch99080、原始缓存及所有旧失败保留；不是正式点、手机、生产或物理资源验收。

## 实际根因与共享修复

官方公开 `wx.getFileSystemManager()` 在新 task-local 16B 文件上实际 write/stat/read 成功；返回对象 tag/constructor 为 ArrayBuffer、byteLength16、实际字节正确，而 `instanceof ArrayBuffer` 为 false。同域对照为 true。回执 `automation_evaluate-1791514530853.json`、`1791514554203.json`。该诊断文件保留，没有清缓存或注入 app 私有状态。

原 `sky-public-image-runtime.ts` 的文件/HTTP入口与旧 `sky-artwork-request.ts` 共三个消费者把合法外域 buffer 拒绝。新增 `services/sky-native-array-buffer.ts` 共用 intrinsic byteLength brand 校验，并拒绝 detached backing store，原对象零复制返回；拒绝伪造 tag/constructor、视图、SharedArrayBuffer、proxy。原 status/length/dimensions/hash、文件租约、取消、缓存限额及生命周期责任保持。

真实 foreign vm buffer 回归在修复前 8项中1项失败，`native-binary-before.log` 保留。修复后 owner32项、真实 runtime adapter2项通过；adapter测试执行当前转译的 production 模块和 native callback，cache core另有既有21项。两代 App 类型检查通过。没有重复闭合页面矩阵或新增模型/PS/编码。

## 必要构建与原生输出

构建前 fixture274文件 / 4,623,740B / SHA256 `6ba265f723f09728b8a105c6a254b68984142e5be657c492412b62df6fc67827` 完整复制到 `pre-native-binary-weapp-fixture`；`native-binary-preservation.json` 成对指纹相同。一次隔离 WEAPP build exit0，3条既有样式排序/体积警告保留。

完成后的 fixture274文件 / 4,623,924B / SHA256 `29ff54ea96dc5dc2456ef88bd75abf0020299758d80269965e85fab6e567d2bb` 由 `native-binary-built-binding.json` 绑定当前源码。较早 `native-binary-binding.json` 在构建进行时只捕获1文件965B，是 EARLY_INCOMPLETE_NOT_ACCEPTED，完整保留，不能作为当前产物。canonical watch 自然重编，不称旧指纹仍有效。

官方实际进入当前 Context rev3、手动星场，真实目录8404；初始图片不可用按钮消失，实际截图 `native-binary-resource-ready.png` 显示星座插画。原缓存目录为空的回执保留；当前v2 index有 Mellinger2048×1024 PNG1,003,398B、星座插画、Moon及地景alpha。公开来源列表实际包含已绘 Mellinger，区别于仅缓存。

使用完整公开 Canvas touch payload 下移至近地平；`native-binary-landscape-ready.png` 实际显示地景与后方星空/插画，公开来源列表实际含 Lubomir Hambalek 与 Mellinger。v2 committed inventory14条 / 2,125,275B，其中地景overview1024×512 PNG854,784B；固定manifest及哈希绑定见 `image-family-manifest-readback.json`。这是当前encoded库存，不能冒全家族同时驻留、physical peak、HTTP body计数或细档完成。

Polaris资料→真实 Sources `reference=HR:424`→其公开返回→关闭资料完成。Source/Back前后公共时刻/45°及Polaris坐标保持；index14条、字节和条目精确保持（前 `1791515253797`，后 `1791515620632`）。已看实际前后画面；479×1035截图排除顶部102系统行后446907像素中12像素变化、最大1码，**不是逐像素相同**，原因 UNKNOWN。`native-binary-source-pixels.json` 保存两份不同RGBA hash；新资源仍显示。资料来源route不带图像publication hash，不能冒精确光学版本来源验收。

## 保留缺口

公开SDK新增只读几何/样式核查：底部控件left12/top662、88×148，Polaris标记44×44且坐标在视口内；控件display flex/visibility visible/opacity1/z12，Canvas容器z0、实际节点type2d，root visible/opacity1/transform none。这些事实不支持隐藏/移出屏幕假设，但仍不能证明真实可见组合。官方安装ASAR截图实现只读核查保存hash：其截图冻结窗口并临时调整模拟器位置/scale/遮罩；没有证据证明该步骤造成丢控件，归因UNKNOWN。没有修改DevTools、执行私有RPC、CU或重复截图。公开原生SelectorQuery的一次组合读回clone失败也保留；SDK element style/offset/size实际成功与该失败分清。此局部缺口后置，沿新加载影像继续实际全景/地景渐隐与图层往返。

Sky WXML标签、资料、控件在官方截图仍不可见，FAILED_DEVTOOLS_COMPOSITION；公开逻辑控制可操作不替代可见正常体验。初次x/y-only touch无效果回执保留，补全SDK payload后的实际运动只证明该输入路径；此前网络grep UNPARSEABLE也保持 UNKNOWN。原16B跨realm根因已有实际反例，不能据此把所有旧Canvas/clone/recursive-update问题归因或关闭。

普通Prepared空、HiPS关、Mellinger低分辨DISPLAY、v72不变。图质/科学/配准/原生完整体验、设备/物理/容量/独立审查及全部33项原值保持。没有公开采用、提交推送、部署发布或外联。

原生回执、34项影响检查、构建/类型日志、保存前产物、截图和像素读回均在 `output/cloud-sky-native-session-2026-10-09/`。有限当前审查集合只作身份与导航，不认证完整产品。
