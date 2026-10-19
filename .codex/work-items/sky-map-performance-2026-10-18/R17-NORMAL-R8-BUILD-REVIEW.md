# r8 完整候选文件与有限任务差异独审

2026-10-19，审查者 `qualify_r8_stable_surface_build`。结论为 **OFFLINE_BUILD_BINDING_AND_FINITE_TASK_DIFF_REVIEW_PASSED_TARGET_UNVERIFIED**，未发现 P1/P2。本次只核验 r8 当前文件、双份 app、外置 source map 与冻结 r7 之间的有限 builder 差异，复用已完成研究与有效软件证据；没有重做方案审查，也没有操作设备、IDE、ADB、服务、feedback、预览或构建。r7 的实际失败保留，r8 原生结果仍未验。

完整回执为 [R17-NORMAL-R8-BUILD-REVIEW.json](R17-NORMAL-R8-BUILD-REVIEW.json)，SHA256 `87e32be6dcc09fac4e6978c40145ac2a2f81910bb56bcdddb218e8910d2ced24`。审查读取了 [r7 构建独审](R17-NORMAL-R7-BUILD-REVIEW.md)、[稳定原生表面源码独审](SKY-RULER-STABLE-NATIVE-SURFACE-REVIEW.md)、development skill、完整 performance-investigation 方法、默认 Context 与开发反馈/资源/验证相关 owner。没有重新选择工具或增加验收要求。

| 当前身份 | 精确值 |
| --- | --- |
| 生产基线 HEAD | `c6bb28bc55b8b3e2ed2e32090f05512e233c4253`，另有本次独审绑定的生产 dirty 修改 |
| buildSource | `3362e2d0595b7871835b0232eb43f2ac233c5a5aa012f609c5eb40e04df4bcb0` |
| 完整 app | `a4b55d3d876a65f731d0e044eb043e0961c05718a2d2a81c1f40aa502be8eb3e`；337 文件 / 4,996,606 B |
| source manifest | `c888e807494165c375c4d1c0379c39b72a790dcfea1936bfb05bb63abe629722` |
| source snapshot bindings | `8cbeeafe93363a6ba24983ea3b7a87705c303c4f4dc3227b7d1041bb39aab23a` |
| builder | `64cca7ce9dc4547c1d08740f5ad3c381713a2c2c1149e96d6fd08b337f7a8ffa` |
| 当前 map qualification | `tmp/r17-normal-a1-review-r8/source-map-bindings.json`；60,278 B；SHA256 `e69113388f4e7162dca438ca37d09c1a86032621cde1ac02bb6e1767ccc97025` |

逐份读回 1,583 个 materialized source、1,573 个当前生产源和 25 个任务模板，全部 SHA 与清单一致；bindingInput 与 productionSourceBindings 的摘要也独立核验。两份完整 app 由原 `fingerprintBundle` owner 分别重新计算，均匹配上表。主包 1,993,648 B，原 2 MiB 静态限额下余 103,504 B；content 1,041,372 B、spot 598,321 B、Sky 1,363,265 B。这是本地原始包静态事实，不是官方预览/上传后的体积。

31 个外置 map 共 7,279,403 B、367,653 个 mapping segments。仅在 map 与 generated JS 的哈希均与 r7 完全相同时复用配对：22 个复用，9 个重新解码。变化项仍是 article/detail、contribution、map、runtime、sky/detail、spot/field、spot/guides、spot/plan、spot/search。新解码的 168,920 个 generated 与 original 坐标均在当前精确字节内。32 份关键 sourcesContent 逐字匹配；只有 1 份 source/map/JS 三项全部相同而复用坐标，其余 31 份重新核坐标。报告中的行号为一基，列为零基 UTF-16；不能把 WeChat 再打包脚本的位置直接用于这些 Taro map。

80 份 JS 均无 `sourceMappingURL`，两份 app 均无 map 文件。ruler entry v2、manual-input 及对应诊断 native 副本仍只进入 Sky 子包；共享 native owner 的生产与 materialized 字节相同。15 份正常 Scene、实际 copy/caption、accepted publication、命令 setter 等既有责任与 r7 相同。DAY 图标声明、common JS、native app.json 和三个资产按当前实际字节沿 r7 证据复用，JSON 本身没有独立 sourcesContent 映射。

另外在内存执行当前有限 builder 的 `controls()` / `normalPage()`，以及原 A1、ruler v2、manual-input 纯变换，6 份结果全部逐字匹配 materialized source；没有调用 main/build。当前生产页面、SCSS、回归输入的 raw SHA 分别为 `dbd27bcda233639776b9737223b0ee69078d25cca5b1951bb066a887f025f9d4`、`3fc2efb06c9af2b0a5c493e89dfbd1af02b5da69f367e382555e6ce4294f611d`、`b1f9488f1a07560b9ea53793d3f1d0cda12bd8a6538c155e89d76ac318f50b4b`，三项均与已有稳定原生表面独审相同。因此复用其 42/42 targeted tests、TypeScript 5.9.3 和先失败后通过的结构回归，没有重复全套或构建。

与外部冻结 r7 builder 比较，仅第 18、20、21 行增加有限 `--review-r8` 分支、白名单与互斥判断；`nativeAdmission >= 6` 保持，25 个任务模板全部相同。原参数边界按同一方式做了 8 个内存检查：r8、r7、r6、r5 正常配置保留；r8 缺 observe、未知 r9、混合 revision、重复 revision 均由原错误拒绝。没有新协议、观察运行时或通用框架。本次有限离线核验 helper 在 ignored scratch 中，长期入口仍是原 builder/qualification owner。首轮 helper 对白名单末项的字符串比较少处理了前置逗号，已仅修正 helper 并成功重跑；不是候选或产品失败，未改 builder。

r7 外部归档的 5 文件 / 596,711 B 及 manifest SHA `ecf8b6bb3de5c68645d997609671acc6df31549892b1023fbd0c8e9cbe83f06b` 已逐份核验；本地 r7 manifest/map report 与归档相同，两份旧 app 仍为 `c9874bb3c40e0167be3f840577ac02cb9ec3a86ba8539830a74b3b946b1f3ae1`。在本次 08:54Z 读回时，builder 通用元信息生成的本地 `historicalA1OwnerArchive` 默认指针不存在；实际归档是 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/r7-owner-before-r8-20261019/manifest.private.json`。root 负责校正当前 preparation 的元信息，本审查没有为修指针改 preparation、冻结 manifest、source 或 app。

静态构建资格不证明第一可辨/终态刻度对齐、guard 准入后的真实命中退休、恢复文案不叠字/retry、跨日/取消/重抓。r7 保留 `FAILED_NATIVE_ENTRY_POSITION_COHERENCE`，当前 r8 仍为 `UNVERIFIED`；不能凭固定节点源码证明微信 native instance 必保持。A 输入验收、B allocation/正常 Play/paused drain/退出、Terrain 软件就绪与实际覆盖顺序，以及完整 Goal 其它义务均保留原 owner。软件回执和 native ack 不是物理呈现，手机 Date.now 与视频 PTS 仍不能未经校准相减。

本次仅新增当前 map binding、独审 MD/JSON 与 ignored 有限核验 helper；没有修改生产源码、测试、builder、冻结候选、PLAN、HANDOFF、preparation，没有 Git 提交、暂存、分支或 worktree 操作。
