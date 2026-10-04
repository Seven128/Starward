# D/B4 观察时间提交的成功响应与恢复边界

本轮修复正常2xx回复未经完整意图核对即可被当成功的缺口。Map和Sky继续共用现有API、Context、提交锁、通知和状态owner；没有新增回执存储、幂等服务或第二地点/时间。Goal仍active、无预算，完整旅程及原商业范围不变。

## 要求追溯与实际缺口

[原文](../request-original.txt)第5节共享地点/时间、公共时间提交及恢复，第6节有界请求、取消/迟到/失败恢复，与[REQUIREMENTS](../REQUIREMENTS.md)的I04/I05/I06、V02/V03要求操作确实产生正确的当前天空，失败保留原提交状态。现有Context已采用原子revision提交，并在不确定结果后禁用缓存读回完整意图。

原文没有要求通用“恰好一次”传输或按幂等键返回同一成功回执。Context PUT当前不消费Idempotency-Key/不持久化重放回执是既有技术边界，不自动成为整个Goal新硬条件；服务端仍须满足已有并发/授权/兼容与恢复义务。此前研究中的“Context头回执/全服务幂等未认证”不能扩大成重启存储或新建普遍机制的任务。

当前源码的真实缺口是正常PUT成功直接返回，没有使用已经存在的 `confirmedObservationContextEdit`。共同请求层只验证通用envelope形状；一个200回复仍可携带旧时间/未增长版本、错误地点/夜晚或相互矛盾的元数据，随后使Map/Sky把失败或错误值当成功提交并解除时间错误提示。

## 修前反例与修复

[修前定向结果](experience-context-ack-before-2026-09-29.log)实际失败：要求13:30时返回13:00，另一次未确认回复触发了成功缓存失效。保留修前完整生产Context函数[编译快照](experience-context-ack-http-before-domain-2026-09-29.js)。

在真实owned本地BFF8789创建独立的公开示例点Context，用当前生成operation、生产请求/缓存和Context函数跑[六种I/O与HTTP条件](experience-context-ack-http-before-2026-09-29.json)：正常、200旧时间、错误地点、错误夜晚、错误envelope绑定、未实际写入却返回200。前五种PUT实际到达BFF；最后一种由Taro I/O边界直接模拟假200，没有向BFF发PUT，其GET与独立状态读回仍为真实HTTP。后五种不满足要求：客户端有错误成功返回，独立服务读回与返回值不一致，或实际未提交却有成功失效动作。只在Taro I/O边界采用Node fetch并显式注入回复故障；原生UI和当前GUI Context未改，既有旧真实缓存确实在该生产缓存owner中存在。它是可复现开发反例，不宣称这些人为故障已在手机自然发生。

修复让正常回复和不确定结果继续使用同一个完整意图validator。地点/来源/时区/隐私/有效期/算法等不可变内容保持，时间/夜晚/event符合请求且版本更新；已有可选revision或非空validAt必须与payload一致，未提供可选revision/validAt为null仍兼容。正常合法回复直接完成；异常成功回复沿原不确定结果责任做最多一次同ID的禁用缓存GET，不重放PUT、不改地点或重建Context。读回仍不能确认时保持失败，不执行成功缓存失效，不把旧时间当新提交。

[修后结果](experience-context-ack-http-after-2026-09-29.json)六种均成立：正常只有一个实际PUT；四种已提交但回复错误的情况为一个实际PUT＋一个无If-None-Match的真实GET，返回与独立BFF读回一致的00:30/16:30Z、revision2、原正式地点及夜晚；未提交的假200为一次客户端PUT调用（未转发）＋一个真实GET，保持revision1/原00:00，返回失败，成功失效数组为空。没有靠重放或读取旧缓存得到结果。详[修后日志](experience-context-ack-http-after-2026-09-29.log)。

## 检查与候选

- [受影响消费者检查](experience-context-ack-affected-2026-09-29.log)覆盖Map/Sky真实提交回调和所有权、共享状态/通知、恢复、取消及缓存owner；[最终兼容检查](experience-context-ack-compatibility-2026-09-29.log)补核正常合法及既有可选/nullable绑定均不增加GET。过期Context仍只沿既有明确缺失/过期路径恢复；取消/确定拒绝不进行不确定结果读回。
- 正常回复新增夜晚核对仍复用 `miniapp-contracts/local-time.ts`，没有第二时区算法。[已有无formatToParts回归](experience-context-ack-zoned-time-2026-09-29.log)及[最终Mini类型检查](experience-context-ack-typecheck-final-2026-09-29.log)通过。此JS边界检查不是Android/iOS实机证明。
- [WEAPP构建](experience-context-ack-build-2026-09-29.log)通过，仍有原CSS顺序/webpack建议三条。最新[clean-v16](experience-combined-clean-v16-candidate-2026-09-29.json)SHA256 `1123034a5afeee5731523aa95278997e88c81ff1eab70da42c23299b9250d032`，257文件、4,476,370 rawB；main2,084,707B，sky955,991B，相对v15总量/main＋275B。无诊断/maps/debug/vConsole，loopback8791开发包；尚未打开或推手机，原始字节不是官方包体。

## 当前恢复与未闭合义务

本轮未重新查询失去响应的旧原生RPC，未新开项目窗口、杀进程、重试用户取消的提权、修改原生当前Frame/Context、推手机或云部署。v12当前活动Context/画面及4B夹具仍未知；历史process存在/Responding不能证明恢复。v15及原v13/v14证据保各自条件，不升级为v16运行证据。

上下文回复边界的当前本地开发缺口已修，原子提交与丢失回复的已证机制不重跑。下一顺序只在唯一[PLAN](../PLAN.md)：可安全恢复已有原生会话时退休旧v12，再用一个v16核入口/日期、重解码/实际Frame/来源、网格和新响应校验的组合；等待时转C影像真实有效性/源质量与当前可执行的配准缺口，保留既有源输入、权利与失败研究，不重复两个未返回的同一WCS端点、不无限补纹理。B3/C整体质量与合法覆盖、完整旅程、真实姿态/校准/后台、Android/iOS、资源性能/官方包体/实际费用、必要独立审查仍开放；新月面未推手机，旧D不认证新版。自检和软件HTTP不闭合独立审查或目标验收。
