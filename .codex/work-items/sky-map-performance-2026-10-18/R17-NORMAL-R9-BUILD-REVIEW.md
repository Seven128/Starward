# r9 完整候选文件与有限任务差异独审

2026-10-19，审查者 `qualify_r9_complete_build`。结论为 **OFFLINE_BUILD_BINDING_AND_FINITE_TASK_DIFF_REVIEW_PASSED_TARGET_UNVERIFIED**，未发现 P1/P2。本次只核验当前 r9 源码、双份 app、外置 map 及其与 r8 的有限差异，复用 [r9 退休观察独审](R17-NORMAL-R9-RETIREMENT-REVIEW.md) 和 [r8 构建资格](R17-NORMAL-R8-BUILD-REVIEW.md)。没有重新进行方案审查，没有操作手机、ADB、IDE、服务、feedback、预览、prepare/build/inspect 或 Git。

完整回执为 [R17-NORMAL-R9-BUILD-REVIEW.json](R17-NORMAL-R9-BUILD-REVIEW.json)，SHA256 `6568251ff26fe1b90239aefb809fd25e0f802bb7ad6e0c63fe61d5ede2dba71f`。

| 身份 | 精确值 |
| --- | --- |
| 生产 HEAD | `3818b44009d53d4b27cb16a95904c42ed3723af7` |
| buildSource | `ac12fdd389fac80b1858c3376e43952020d38024279cf1d296a7fd9fd2872211` |
| 完整 app | `413b8e0f97c46b99040e9cc5e78e0b81b6e2839575cb82c19f8b6e4170fb9eaf`；337 文件 / 5,002,086 B |
| source manifest | `f90760f4f90501c5b60b4578d96c72e6cb9af265049860623a77b24bbc2f3fa2` |
| source snapshot bindings | `fc40ffd08c8bb9db7816999c78ae37b1e691304bbf9556966bba14cd555023a8` |
| builder | `d706a76fa1f8b9e410b943d177f21035eea5ab99a468bef951bf9364d875103e` |
| 当前 map qualification | `tmp/r17-normal-a1-review-r9/source-map-bindings.json`；58,925 B；SHA256 `82abd538c5f5ac3ebb1cedb6d988e0b557729c0658b8362fe979d790604166b6` |

逐份读回 1,583 个 materialized source、1,573 个当前生产输入和 25 个任务模板，全部 SHA 与清单一致；bindingInput、productionSourceBindings 和 sourceBindings 的摘要独立匹配。全部生产输入仍与 r8 相同。当前 builder、observer、fixture 三项 SHA 与 r9 退休观察独审完全一致，原生表面修复的三项生产输入也仍匹配既有独审。

仅在内存中给原 builder 的 `preparedSources` 函数加 export，并保持原 import/module URL；没有调用 `main`、prepare、build 或 inspect。以当前 r9 参数、原生产输入和原模板重建的全部 1,583 个输出，以及完整 instrumentation 元信息，均与实际 materialized 字节一致。由此复用独审已执行的 r9 **25/25**、冻结 r8 **21/21**，没有重跑这些 fixture。root 完整构建的 delta typecheck 仍为生产 0、候选 0、无新增诊断；本审查没有把内存变换冒充类型检查。

相对 r8，模板仅 observer/fixture 两项变化；materialized 仅 surface、controls、observer、terrain observer 与绑定 JSON 五项变化，后两项随本次 source binding 更新。13 份正常 Scene、实际 copy/caption、accepted publication、命令 setter 等责任文件逐字不变。surface/observer 两份观察 owner 与 controls 完全来自同一已独审 r9 变换；没有关闭真实正常 Scene 或替换产品 Play/Pause。8 个有限 argv 内存场景通过，r9 要求 observe-a1，旧 r8/r7 入口保留，混合、重复、未知 revision 被原错误拒绝。没有重建或声称复原旧 r8 builder。

两份完整 app 经原 `fingerprintBundle` owner 独立计算，均匹配上述 app 身份；原预算 owner 对两份实际文件重新汇总：main 1,993,648 B，原 2 MiB 静态限额下余 103,504 B；content 1,041,374 B、spot 598,325 B、Sky 1,368,739 B。80 份 JS 均无 `sourceMappingURL`，双 app 均无 map。ruler/manual-input 和新增退休回执标识只进入 Sky 子包，共享 native ruler owner 字节未变。DAY 图标声明、common JS、native app.json 与三项资产按实际相同字节复用 r8 证据。

31 个外置 map 共 7,299,540 B、368,539 个 mapping segments。只有 map 与 generated JS 两个 SHA 均与 r8 相同才复用：22 个配对复用，9 个重新解码。新解码 169,806 个 generated/original 坐标均落在当前精确字节内；32 份关键 sourcesContent 逐字匹配，其中只有 1 份 source/map/JS 三项相同而复用坐标，其余 31 份重新核坐标。报告行号为一基，列为零基 UTF-16；WeChat 再打包脚本仍需其实际 inline map/运行脚本关联，不能直接套 Taro 坐标。

r8 外部归档 `r8-before-r9-20261019` 的 82 文件 / 30,633,097 B 全部逐份重读匹配，manifest SHA `9d3cca404f9a10a65ef33be6e1a11c51932705a2abe34b274d0df1138542834f`；本地 r8 manifest/map 与外部 owners 副本相同，旧双 app 仍为 `a4b55d3d876a65f731d0e044eb043e0961c05718a2d2a81c1f40aa502be8eb3e`。本次读回时，builder 默认生成的本地 `historicalA1OwnerArchive` 指针不存在；真实归档为 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/r8-before-r9-20261019/manifest.private.json`。root 后续仅校正 preparation 历史元信息，本审查没有为修指针改 preparation、冻结 manifest、source 或 app，也不把元信息修正当作重新构建。

上述只建立离线构建与映射资格。r9 保留约 14s active 的原 15s metrics 窗口，只将已有 same-run guarded Pause 设为 60s；晚到超出旧时钟范围的相对时间保持 null。实际候选送达、source-bound ready/session/surface 绑定、至少 60s 正常 Play、正常 Pause 后至少 30s drain、真实 Map 退出及同键退休读回仍由 root 验证。缺失、仅 ready/attempt、Storage 失败或绑定不符均保持 UNKNOWN；即使 complete/returned、尺寸归零和 contextLost=true，也只证明该 surface 退休边界，不能替代引用图、进程其余 scope、物理 GPU 回收或完整 Sky B。A、Terrain 和完整 Goal 其它义务继续保留原 owner。

本次仅新增当前 map binding、独审 MD/JSON 与 ignored 有限核验 helper；没有修改生产、测试、builder、候选、preparation、PLAN、HANDOFF 或 Context。
