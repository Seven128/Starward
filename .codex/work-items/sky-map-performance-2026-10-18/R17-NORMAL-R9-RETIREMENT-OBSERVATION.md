# r9：只补实际 surface 退休回执

状态为 **TASK_ONLY_IMPLEMENTED_RUNTIME_UNVERIFIED**。本次只补 [r7 allocation](R17-NORMAL-R7-ALLOCATION-RESULT.md) 与 [实际退出](R17-A1-R7-EXIT-RESULT.md) 留下的执行缺口；gen24 继续暂停，B 未通过。旧 normal observer 的 `retired` 仅在模块内，15s metrics 在退出前已经封存；关闭的 acceptance inspector 也没有这项持久证据。公开 selector 查询、Map 画面和 PSS 回落不能读出原 offscreen surface 是否实际执行退休。

有限入口是 builder 的 `--observe-a1 --review-r9`。只改 task 的 observer、builder 和既有 fixture，不改生产行为或 r8 冻结文件。r8 manifest 仍为 `c888e807494165c375c4d1c0379c39b72a790dcfea1936bfb05bb63abe629722`，map report 仍为 `e69113388f4e7162dca438ca37d09c1a86032621cde1ac02bb6e1767ccc97025`。

读取唯一键：`starward.r17.normal-surface-retirement.v1.<本次 manifest.buildSourceSha256>`。只通过确认绑定本次实际手机执行目标的官方 `wx.getStorage` 精确读该键，不扫描 Storage，也不把模拟器读数当手机证据。下一次本来必要的完整候选才纳入此观察；本文不代表已经构建、交付或读回 r9。

回执只在模块初始化、surface ready、retire attempt、retire complete 写入。ready 指 `createSkyCanvasSurface` 成功返回前的 surface 状态，不能代替首帧；attempt 在原 disposed guard 后；complete 在原 teardown 的 finally 中、实际读完 native facts 后。保存 source binding、随机 session ID、单调有界的 surface ID/构造尝试与边界计数，最后一个 surface 的 ready/after facts，以及最后一次已 armed 正常 Play 的 scalar start/Pause 结果。每次覆盖同一键，不保存历史数组、native/context/reader/frame/report 或用户内容；每帧仅延续数值 copy 计数，不做 JSON/Storage。

after 实际读取 node/display/selection 的 width、height、selectionLayer 是否仍存在，以及 `gl.isContextLost()`。每个读取失败为 null；context loss 不支持、步骤未调用、返回、抛错分别记录。原独立 teardown 调用和原异常策略保留，观察/Storage 失败不阻断原清理。`outcome=returned` 只证明原退休函数走完返回；仍须检查各步骤与 after，不能将它解释为所有 native/GPU 分配已经回收。context loss 返回后立即读到 false 也可能是异步状态，不能据此判泄漏。

root 已选本次 **60s 正常 Play，正常 Pause 后至少30s drain，再实际退出**，用于超过已知14–20s失效区间；这不是新产品预算。r9 只把原 same-run guarded Pause timer 改为60000，保留原15s metrics、约14s active metrics window、45s recorder 上限和所有历史 schema。15s seal 会取消 recorder deadline，但完整产品继续 Play；60s timer 稍晚到达时，原 v3 60000 上限使 terminal 的相对时间为 null，严格协议照常接受，不扩展上限。回执的 `normalRun.pauseReturnedAtMs` 是 guard 返回后的 Date.now wall stamp，`pauseResult` 是实际回调结果；不能用 wall stamp 宣称单调时钟或精确暂停耗时。30s drain 仍由 root 既有进程/画面观察承担，没有新增 timer。

尾段可比较同一 session/run 的 start、Pause、retire copy 累计；与15s metrics 相减还须确认 `observationResets` 一致。copy 返回不是物理呈现或 FPS。root 应在真实 ready 时读回并保存 session/surface ID，再在真实 Map 退出后读同一键；若仍为 ready/attempt、绑定不符或缺失，保留 UNKNOWN，不能倒推没有调用。只保存最后 surface，`constructionAttempts>1` 或 rejectedEvents 也不能证明其它 generation 都已退休。即使匹配 complete、尺寸归零且 contextLost=true，也只关闭这个 surface 边界执行缺口，不证明引用图、进程其余 scope 或完整 B 通过。

验证均在内存中运行，没有写候选目录或调用设备/IDE/服务/build/preview/Git：

- 原20s集成 fixture **21/21**；r9 **25/25**，含59.999s仍 Play、60.025s晚到为null、same-run/hide/unmount、失败/424/迟到回包与原严格 dispatcher。
- surface fixture 覆盖实际 post-teardown 数值、unsupported/读取失败 UNKNOWN、独立步骤失败、原 selection 异常继续抛出、Storage 失败不阻断清理、重复 dispose 和旧 surface 不覆盖新 receipt。
- TypeScript **5.9.3**，按现有严格配置检查内存 overlay 的 observer/surface/controls 与实际依赖，**0 semantic diagnostics**；不是完整 candidate delta typecheck。
- 8个有限 argv 场景通过；r9 必须 observe-a1、互斥旧 revision、拒绝重复/未知 flag。没有进入 prepare/build mutation。

任务文件 SHA256：builder `d706a76fa1f8b9e410b943d177f21035eea5ab99a468bef951bf9364d875103e`；observer `9f0fb5922771ca0719bbd647f558ac492c442bc32b65111f5a557dabff49d17a`；fixture `7b7a17af6861def2b5f81f800f92c2ca95f81322e714552ff7fd1cce6a7abcf8`。源码未提交；PLAN、HANDOFF、INDEX、Skill/Context、账号和运行现场均未改。
