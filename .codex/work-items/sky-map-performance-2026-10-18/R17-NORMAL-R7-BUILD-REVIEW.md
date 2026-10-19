# r7 完整候选文件与有限任务差异独审

2026-10-19，审查者 `qualify_r7_build_and_maps`。本次范围 **OFFLINE_BUILD_BINDING_AND_FINITE_TASK_DIFF_REVIEW_PASSED_TARGET_UNVERIFIED**，未发现遗留 P1/P2。这里只核验 r7 当前文件、source map 对应关系及相对冻结 r6 的 builder/marker 差异；没有重做方案审查，没有操作设备、IDE、ADB、服务、feedback、预览或构建，没有修改源码、builder、冻结候选、PLAN、HANDOFF 或 preparation owner。

完整机器回执为 [R17-NORMAL-R7-BUILD-REVIEW.json](R17-NORMAL-R7-BUILD-REVIEW.json)，SHA256 `f065b923b7a7fec59f8f735812bffb88da620a9049609cdae6fa13e57afcae47`。使用当前 preparation、manifest、[reveal/native 准入独审](SKY-RULER-REVEAL-NATIVE-ADMISSION-REVIEW.md)、[r6 观察链独审](R17-NORMAL-R6-OBSERVATION-REVIEW.md)、r6 map report 和 [r6 地形等待结果](TERRAIN-R6-WAIT-RESULT.md)。已读 development skill、完整 performance-investigation 方法及默认 Context 路由；复用原观察语义和有效证据，没有重新选择 profiler 或增加验收要求。

| 当前身份 | 精确值 |
| --- | --- |
| 生产 HEAD | `404d84df3c6003dbfa535864d5764e0f3c46c430` |
| buildSource | `528b3d8a99ca4c87958e10b01ac7af7040b031e5270e601e61bcf2b3949cf755` |
| 完整 app | `c9874bb3c40e0167be3f840577ac02cb9ec3a86ba8539830a74b3b946b1f3ae1`；337 文件 / 4,995,907 B |
| source manifest | `85efe32838adaac778496f43fc2876a3df8c0f873c9b94fa70647dde6ccbf3c3` |
| builder | `a00bd827e901d17911d8179d87457d99f2c076110e91ef8df42b56b7f0156e72` |
| marker | `bde0d77c5221fcee38578d00bd1a6e8bf8671ff11b37c92707f4d2e1d4e2d1b0` |
| 当前 map qualification | `tmp/r17-normal-a1-review-r7/source-map-bindings.json`；60,897 B；SHA256 `127036c4b2f1be50df11e33735d13ddf0da4e324227489797d4df3b3a6bcf9cb` |

逐份读回 1,583 个 materialized source、1,573 个当前生产源和 25 个任务模板；bindingInput 的 SHA 与 buildSource 一致。两份完整 app 由现有 `fingerprintBundle` 独立计算，均匹配表中身份。80 份 JS 均无 `sourceMappingURL`，两份 app 均无 map 文件。

31 个外置 map 共 7,278,368 B、367,594 个 mapping segments。只有 map 与 generated JS 两项哈希都和 r6 一致时才复用：22 个 pair 复用，9 个 pair 重新解码，包括 JS 变而 map 不变的 pair。变化项是 article/detail、contribution、map、runtime、sky/detail、spot/field、spot/guides、spot/plan、spot/search；新解码 168,861 个 generated/original 坐标均在当前精确字节范围内。32 份关键 sourcesContent 逐字匹配；仅 1 份 source/map/JS 三项全部相同而复用坐标，另外 31 份重新核原始坐标。此报告只绑定 Taro 生成的这些文件，不能把 WeChat 再打包脚本的坐标直接用于它们。

15 个正常 Scene、实际 copy/caption、accepted publication、命令 setter 等既有责任与 r6 相同。另在内存用同一有限 builder 的 `controls()` / `normalPage()` 和 A1、ruler v2、manual-input 纯变换生成 6 份输出，全部逐字匹配 materialized source；未运行 main、构建或生成其它候选。变换前的当前生产页面 SHA 为 `ecb5e51f83a49b3d9fb9c94062f33d9b32bee1d1be6392aea6f095cc0bbd327a`，回归输入 SHA 为 `f1295f75a55a2ed8f272594ae0327f8015bbf470846982d2ff883d766117b6d1`，均与已有 reveal/P2 独审最终身份一致。诊断 native 副本仍只在 Sky 子包，共享 native owner 本身逐字保留。DAY 图标声明、common JS、native app.json 和三个资产沿 r6 精确哈希复用。

相对外部冻结 r6 builder，实际只有第 18–21 行变化：新增有限 `--review-r7`、加入原白名单与互斥检查，并使 r7 复用 `nativeAdmission >= 6` 下已有 ruler v2/manual-input 协议。没有其它 builder 字节变化。直接执行源码中的参数边界做了 8 个内存检查：r7 正常入口可用，r6/r5/r4 设置保留；r7 无 observe、未知 r8、混合 revision、重复 revision 都由原错误拒绝。没有为这次扩展添加框架或另一套运行时。

marker 与冻结 r6 源码比较，唯一变化为 `zIndex: 9999 → 10050`，保留 `pointerEvents: "none"`、位置尺寸、异步订阅、原时钟、own task key、一次封存写入与 hidden/unmount 退休。其它 24 个模板逐字相同，r6 观察链和 collector 合同审查因此保留原有效范围。两份当前编译 `pages/map/index.js` 各恰有一处 marker 内联 `zIndex:10050,pointerEvents:"none"`；两份 `app-origin.wxss` 的原 `.notification-host` 为 `z-index:10040`，整个文件与 r6 相同。marker 和通知仍为原 Map 根内的相邻子节点，三份产品通知源码与生产、r6、r7 均逐字相同。此处只证明当前静态层级已高于通知且不接收触摸，真实目标是否可读仍须由下一次必要地形动作建立；没有把 zIndex 镜像断言扩成新测试套件。

r6 外部 5 文件 / 595,445 B 归档及 manifest SHA `1cee01d2132a5212d393557e8f95d8ef3cb2ecca12be34b178b2b22c578ee044` 已逐份核验；当前本地 r6 manifest/map report 与归档相同，双 app 仍为 `62ac5b330d8a735eadc43efc174e2e6f9b633ff7c543f38575e1fd38447e82b1`。builder 通用元信息生成的本地 `historicalA1OwnerArchive` 指针确实不存在；实际归档位于 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/r6-owner-before-r7-20261019/manifest.private.json`。root 已接管当前 preparation 元信息校正；本审查没有为修指针改冻结 manifest、source 或 app 身份。

本次没有重跑生产全套、完整构建或已有 r6 观察链测试。已有源码独审不能证明 r7 第一可见 selected tick、揭示中原生位置、稳定尾段或跨日/取消已通过；r6 的失败也未重命名为 r7 通过。A 的实际输入关联、B 有效 allocation/正常 Play/paused drain/退出、Terrain 文件就绪到实际覆盖顺序，以及完整 Goal 的其它义务均保留。异步 marker、native ack 和软件坐标均不是物理呈现，手机 Date.now 与视频 PTS 仍不可未经校准相减。
