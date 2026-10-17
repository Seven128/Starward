# 共享日志与静默失败恢复的有界独审

用户明确允许只读子代理审查；输入为output/cloud-sky-native-updated-ide-2026-10-12-r1/r248-review-inputs.json，授权回执r248-review-authorization.json。审查者/root/shared_error_review已完成并停止，不复用。以下保留审查最终原文；行号属于审查时源码。四项发现的后续处理见末节，不把取得独审改写为无问题或完整Goal通过。

## 审查原文

发现 4 项可行动问题，均为 P2。分支、HEAD 与 14 个源码 pin 在审查开始及结束时均匹配；全程只读，未执行测试、构建、Git 变更或设备操作。

1. **[P2] SAO 的终端捕获边界仍吞掉真实错误。**  
   [sky-stellar-tile-loader.ts:41](E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts:41) 的 catch 仅置 `failed`。普通路径为 `useSkyStellarSupplement → saoCatalogClient.getTile → readPublishedSkyJson → encoded cache`；瓦片请求不走 Query，cache acquisition 与 JSON read 的错误只向上传播，最终在此被处理，App 未处理异常钩子也收不到。因此下载、文件读取、内容校验及 publication mismatch 可失败而无控制台记录。  
   同一 finding 还包括 [use-sky-stellar-supplement.ts:28](E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/src/features/sky/use-sky-stellar-supplement.ts:28) 与第 67 行的科学几何 catch：正常缺 scene/observer/时刻会返回 `null`，应保持安静；实际抛出的 catalogue/geometry/view/publication 异常目前同样仅变成 `failed`。应保留原因，在当前 owner/publication 的失败转移上有界记录，避免随 `basis/at` 更新在 `useMemo` 内反复打印。

2. **[P2] 纹理复制失败成功降级后完全漏报。**  
   [sky-gpu-textures.ts:130](E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts:130) 吞掉 framebuffer/copy 异常，设置 `copyUnavailable` 并保留原纹理；第 128/137 行又消费了 GL 错误。实际 renderer 的 artwork window 与 Galactic panorama window 均使用此 owner。由于原图仍有效，没有 `imageFailed` 或页面 failed 转移，后续 `finish` 也无法补记错误。现有复制失败测试证明了保原图与单次尝试，却没有验证控制台。应在此记录一次安全原因及 GL 数值，继续保持成功降级和原来的 latch。

3. **[P2] 部分 GPU draw 状态错误被消费，调用者无法补回原因；土星环路径甚至没有错误记录。**  
   [sky-gpu-renderer.ts:986](E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts:986) 将非零 `gl.getError()` 丢成无数值的固定 Error，随后 catch 仅设 `ringsUnavailable`、返回 `false`。没有 pending contribution 时，`submit` 不检查该状态；真实调用者 [sky-scene-render.ts:539](E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/src/features/sky/sky-scene-render.ts:539) 改画线段环，既不抛出也不设置页面失败，因此完全漏报。  
   相同数值丢失也存在于 solar light、phase/body 等局部检查；页面可能补一条 availability 日志，但无法恢复已消费的 GL 原因。应在共同 GPU 检查/捕获边界记录，保留各自降级，不能把正常的 `false` 返回一概当错误。

4. **[P2] 公共资源元数据请求丢弃原生原因，abort 异常也被吞掉。**  
   [bare-sky-resource.ts:57](E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/src/services/bare-sky-resource.ts:57) 的 fail、Promise rejection 与同步 catch 均重新创建无 `cause` 的 `sky_resource_request_failed`。因此原生 `errno/errCode` 在进入共享 reporter 前已经丢失，后续 Query 也无法补回。该入口真实服务于 Galactic、body、Prepared、HiPS、W3 等 metadata 消费者。第 50 行另将真正的 `abort()` 异常静默吞掉。应保存原 cause 给安全 reporter；正常取消仍保持安静、单次 settlement 不变。

已核查共享 reporter、BFF transport/Query/Mutation/App、方向启动与释放、encoded cache/JSON/native image lease、Canvas lifecycle、GPU renderer/contribution/texture，以及图片失败 UI 与独立目录恢复消费者。未发现这些新增日志改变请求 settlement、stale fallback 或资源 ownership 的明确回归；图片失败按钮/通知已与目录、时间、全 Canvas 恢复分开。

已读前像差异、相关测试源码与保存日志，并实际查看指定三张手机图。图像支持单次真实 shader 拒绝后保星点/连线/完整 Alderamin、Canvas generation 1→3 后恢复，以及普通回交无临时 HUD/探针按钮；普通画面仍有 vConsole 按钮。它们不证明手机 Console 已读回、原地 shader retry、texture upload/draw/context-loss 全机制、iOS、FPS/物理峰或手机字节/AppID。现有软件与有界 Android 开发证据不能关闭完整 Goal；原 I06/I09/V03/V06/V07 及其它 FAILED/UNKNOWN/MISSING 继续保留。

## 发现处理

主代理逐项核实上述四类路径后，在原SAO tile/Hook、GPU textures/renderer与bare metadata五个责任owner修复；没有改Scene/科学计算、原取消/保旧/资源寿命或图片静默UI。五个针对性回归在修前均真实失败，修后通过；受影响owner/consumer 50/50、最后共同GL helper的ring回归1/1，合计51个不同检查，最终类型/Context结构校验/构建/包预算/五编译origin均0。首类型联合推导问题保日志，已用明确selection结果类型修复。普通r250已官方推送，22:16–17 bootstrap/bound实际星图可见，无临时探针。完整源前像/最终pins和检查日志归output/cloud-sky-native-updated-ide-2026-10-12-r1/r249-251-review-repair-assessment.json。本段为主代理修复与自查处置，未将其冒称独立复审；原33与完整Goal独审、iOS/物理资源等缺口保留。
