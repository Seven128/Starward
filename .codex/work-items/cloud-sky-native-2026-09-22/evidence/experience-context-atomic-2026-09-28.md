# D：观察时间并发提交与当前候选恢复

沿唯一 PLAN 的既有依赖核查，商业范围、原生路线、完整旅程与目标验收要求均未改变。此记录限本地开发证据，不是新计划或完整交付声明。

## 实际反例与责任修复

原 `ObservationContextService.update` 的 get → revision 检查 → set 在真实 MemoryCache 和真实 Redis 7.4 中都允许两个不同时间修改同时以 revision 2 返回成功；最后读回只有第二个时刻。Redis 使用两个独立客户端、两个服务实例和随机任务命名空间，没有改动其他缓存、数据库或容器。修前断言实际失败，见[修前结果](experience-context-concurrency-before-2026-09-28.json)。

修复保留 Context 的地点、时间/日期、event、指纹计算和错误语义 owner，只将提交改为 CachePort 的 `replaceIfRevision`。Memory 在同一同步片段检查并替换；Redis 在现有 ioredis 适配器执行固定参数化单键 Lua，版本检查、存在性和写入由存储原子执行。保留较早的原缓存到期时间/Context 绝对截止时间；缺失或提交中到期不能重建原 ID，冲突不会覆盖成功者。复用已有缓存适配器，没有新的存储、锁服务或依赖。Redis 的脚本原子性和 SET 的 XX/PXAT 语义来自[官方 Lua 文档](https://redis.io/docs/latest/develop/programmability/eval-intro/)和[SET 文档](https://redis.io/docs/latest/commands/set/)；实际适用支持已在本机 7.4 验证，远端配置未验证、未部署。

相同修前路径现在只有一次成功、一次 `observation_context_conflict`，revision 2 的读回与成功者一致，expiresAt 不变；同夜 clock 修改保留原夜指纹。见[修后结果](experience-context-concurrency-after-2026-09-28.json)。[真实消费者回归](../../../../workers/miniapp-api/src/observation-context-concurrency.test.ts)另经过两个 Nest/HTTP 服务和共享 Memory/独立 Redis 客户端，核实 200/409、REFETCH 恢复语义、随后 revision 3 跨夜编辑及另一实例读回、提交中存储到期不复活、缓存 TTL 不重启、较早绝对截止时间生效、真实 Redis 客户端断连失败保留原结果并可重连重试。Memory 失败使用单次提交边界拒绝，不称真实网络故障。

当前 Context PUT 仍不消费 Idempotency-Key，不新增持久回执。原子 revision 更新保证这一提交边界不会有两个同版本成功者；它不证明重放同一个幂等键总能得到同一响应。客户端原有不确定结果读回/完整意图验证继续负责丢失响应及冲突后的用户结果，取消/确定拒绝不重放；自动 native 传输次数仍按实际条件记录，不能由本轮提升为通用一次 HTTP 保证。

## 当前原生消费者与正常恢复点

仅替换本任务 owned BFF8789：旧 PID14388/exec22711 已退，新 PID22124/exec54820，日志 [新服务](experience-context-atomic-service-2026-09-28.log)。LOCAL/MEMORY_TEST/LOCAL_TEST/development fixture 保持本地开发性质；共享8787 PID2408、8788 PID15508未动。8791 PID12252/exec34149仍为必要 pass 转发；DevTools 仍只有 clean-v11/SDK9444 PID34128，没有新开项目或重打客户端。

真实服务替换使旧内存 Context 缺失。公开时间控件从 00:00 改到 00:30 后，既有 session 接受同正式点的新 Context，实际共享持久缓存、Canvas 和新 BFF 时刻相同。页面入口 route 保留旧 ID 是既有会话语义；旧采集脚本只查 route 因而遇到 404，不能把它当恢复失败或拿旧 ID 认证新帧。新只读脚本从实际 wx 存储中的接受结果读回服务，内部验证当前正式点与路由一致，ID 不写记录。见[恢复后的读回](experience-context-atomic-native-recovered-2026-09-28.json)。手动模式下旧时刻的定位标记按原“仅当前帧”规则隐藏；本轮重新公开定位 Vega 后进行跟踪，没有借用旧位置。

在实际 45°/Vega（HR7001）跟踪状态，代理物理丢弃一次成功时间 PUT 的响应，公开控件变为 01:00。实际只新增一个 HTTP PUT/一个 Context GET；BFF/shared durable Context/Canvas 同为 17Z、revision 3，跟踪、资料身份和来源 Back 保持，无旧时间错误。见[丢失响应读回](experience-context-atomic-native-tracked-loss-2026-09-28.json)。这是此次 native 条件的结果，不提升为其他客户端或重试条件的传输保证。

随后停止跟踪、公开恢复 00:00、Vega/85°，返回 Map；Map 公共控件显示 00:00，再用云观星入口重进并手动查看/定位。最终当前 route 与接受 Context 相同且 GET200，Canvas/存储/BFF 同 16Z、revision 4；普通 DAY、地景/星座开、W3关、无跟踪/面板/inline error。原版 2K 已绘图片来源经公开入口重新读到，原发布及 1K/2K PNG 的 HTTP SHA 均不变。详[最终活动 Context](experience-context-atomic-native-final-2026-09-28.json)、[实际捕获及来源](experience-context-atomic-native-captures-2026-09-28.json)、[最终代码/候选/服务/图片绑定](experience-context-atomic-binding-2026-09-28.json)。

客户端仍是 257 文件、4,469,986 raw bytes，SHA256 `99c50222cb3d64fc2201470c754d6e135c60b51b9711f8918b52f93469cc47db`；raw main 2,081,604B 不是官方包体。七次原生截图实际 193×413，逻辑 Canvas390.4×844；没有跨旧代像素清晰度认证，也没有把 aria/树文字当作手机控件合成验收。最终正常图实际已查看。旧 v8/v9/v10环境、故障及传输证据继续保各自条件。

## 检查与剩余义务

当前 API 类型/服务 release build、上述 Memory/真实 Redis 风险回归、既有 Context/Map exact-time HTTP 和 Context identity 检查、客户端不确定提交/共享 store 恢复检查均通过。新增 HTTP 测试初次双重退休同一 Redis client 的夹具清理失败已纠正为 app 单一退休 owner；不冒称产品并发失败，也不掩盖修前真实竞态。[检查记录](experience-context-atomic-checks-2026-09-28.json)分开这些条件。

本轮未推手机、未部署、未提交/推送，未改原图片/原始月面/已批准商业排除。新月面及所有新版修复仍不能用旧手机 D 样本验收。Redis 原子边界的本地证据不是 PostgreSQL 正式点、生产 ACL/故障切换、Android/iOS、姿态/校准/OS后台、峰值/FPS/流量/官方包体、整体视觉辨认或独立审查/实际费用证据。这些仍按唯一 PLAN 保留；Context 头回执/全服务幂等也没有由 CAS 自动认证。

下一依赖在唯一 PLAN 回到 C 的实际影像/地景组合和可用 D 测量：沿同一候选的用户旅程取代表机制和实际差异，修错误、验证恢复，不再重复已经完成的并发反例、重复下载研究或无限纹理精修。B3整体场景质量尚未通过，Goal active、无预算、未完成。
