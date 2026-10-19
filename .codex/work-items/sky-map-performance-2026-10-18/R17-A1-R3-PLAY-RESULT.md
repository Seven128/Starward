# R17 A1 r3：本轮正常 Play 关联结果

2026-10-19。本轮有有效的正常 Play 关联与同次 Pause 回执，**不足以选择生产调度、准备或 React 发布结构的修复**。A 仍未验收，B 仍没有本轮正常 Sky allocation 样本；r3 已确认的跨日标尺错位与取消后错误日期窗口继续为失败。本文件只解释既有记录，没有新增采样或更改现场。机器可读投影见 [R17-A1-R3-PLAY-RESULT.json](R17-A1-R3-PLAY-RESULT.json)。

三份原始 JSON 已逐字复制至外部独有目录 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r3-play-association-archive-20261019`，采用新建目录和 `wx` 写入；原件与副本均重新读取并核对 SHA-256。完整 payload 留在该目录，Git 中只保留本摘要及数值投影。原件未改动。

| 原件 | bytes | SHA-256 |
| --- | ---: | --- |
| `baseline-r17-2-63s0s4grac.json` | 44,549 | `902ae4c82161b626c99718a5acd94a2f78468d608e3d0479cfeac2430eecd1e0` |
| `baseline-r17-2-63s0s4grac-terminal.json` | 1,587 | `334aff7aea732d091de7b9cf380c6def2bae5d06b04cb685fd04593dc00ec415` |
| `baseline-r17-1-w6gz92o2ck.json` | 16,760 | `26b90383d21037ac48f74f226018f30646bc265ebd1159f84de9d5a76a45e114` |

三份 JSON 均完整解析；现有严格 A1/v3 协议校验通过，Play metrics 与 terminal 的 run、binding 和封存边界匹配。归档清单 `archive-manifest.json` 保留路径、长度、摘要及读回结果。

本轮 run 为 `r17-2-63s0s4grac`、`wide-play`，属于普通官方 preview，未同时录制 CPU 或 heap。候选为完整正常 Sky A1 r3，应用指纹 `a2839caade3245fb9ec2cfcec172ce23ad3995ab08b774c6d7d714e68c0c6445`，buildSource `f76630fe3c39180d81e272fcef1c2c785018dc530ab6051b81f605e1fc4db472`，buildGeneration 27；实际手机唯一标签 `R17 正常Sky关联 A1 r3` 对应 `Ol0LKl` 的 feedback generation 1。来源是 [r3 被保留的 preparation/runtime owner](tmp/r17-normal-a1-owner-before-review-r4-20261019/R17-NORMAL-A1-PREPARATION.json)。原始 metrics 带正常模式、buildSource、generation 和 windowId 2；该链路没有新增手机完整字节读回或运行 AppID 证明，原有这两项未验证状态保留。后续 r4 构建不改变本轮身份。

采样使用 `Date.now`，单位 ms，明确为 wall elapsed、非已校准单调钟；名义分辨率 1ms、有效分辨率未知。metrics 有 17,855 次读钟，invalid/backward 各 0；terminal 有 17,859 次，亦各 0。相同读数按 below-resolution unknown 处理，不能写为零成本。所有阶段都是各自覆盖范围内的经过时间，不是线程 CPU。

| 边界 | 相对 recorder arm 的时间 |
| --- | ---: |
| 实际正常 Play 成功 | 2ms |
| 约 1 秒待机后开始 active metrics | 1,019ms |
| 自动导出请求 | 15,022ms |
| metrics 封存 | 15,023ms |
| active metrics 实际区间 | 14,004ms |
| 同一产品 run 的 Pause 成功及 terminal 封存 | 20,023ms |

Pause 是既有产品回调在相同 run 与播放代际检查后返回 true；不是 host 截图耗时或 agent 延时决定的停止。metrics 在约 15 秒已封存，不包含随后至 Pause 的约 5 秒，也没有 paused drain、进程内存或退出证据。Page/text/native-copy 的 scalar 读数覆盖 reset/arm 后 1ms 至 15,022ms，包含 active metrics 前的约 1 秒；不能与 14,004ms 的计数窗混算。

本轮 viewport 固定 384 × 796.800048828125、FOV 45°；每次已记录的 Scene 有 BSC 8,404 行、加载 SAO 752 行和 17 个 selected tiles。active metrics 中有 504 次绘制尝试、native callback、软件接受副本及 Scene finish；实际 BSC 提交 103,834、SAO 提交 73,504，GL submission 6,552，failed frame 与 invalidation 各 0。scalar 窗另记录 native copy/ready copy 各 537、native glyph call 3,222、无 synthetic publication/freeze。这确认工作量非空，计数不建立逐像素一致性或物理显示帧率。

`scene.modes = ["DAY"]` 是 **DisplayMode/显示主题**。真实调用从 `SpotSkyPage` 的 `useAppStore(state.mode)` 传入 `drawSkyScene`；`DisplayMode` 定义为 DAY/NIGHT/OBSERVATION，OBSERVATION 控制红光显示。太阳另由 `skySolarLightAt(data.hourly, frameAt)` 得到，恒星显隐使用另一个 `sun?.altitudeDeg`。因此该 DAY 不能证明太阳在地平线上方。本 receipt 没导出太阳高度/光照字段，光照条件保持 UNKNOWN；真实非空恒星提交仍有效，窄视场及密集场景验收没有由本轮补齐。

422 次 presentation preparation 均完成，其中 **421 次进入第一次绘制尝试**、1 次在 metrics 封存时尚未消费；没有 expired unconsumed preparation。已消费成本有 255 次可分辨、已知小计 307ms，另 166 次 below-resolution 未知。唯一未消费 preparation 是 token 422：14,991ms 完成，15,014ms 首次请求，15,023ms 即封存，没有 first paint；成本是 below-resolution unknown，而非已知 0ms。这是被导出边界截断的末端项，不能据此认定将永不被消费或有显著丢弃成本。

923 次 request 会重复使用准备值，504 次 paint 也会重复使用已准备时刻。请求数减绘制数 **不是**未消费准备的数量；本轮没有提供据此移动 preparation admission writer 的依据。该 consumed 字段在 `paintStarted` 置位，表示进入绘制尝试；它本身不是成功接受或物理呈现。

新 A1 扩展补上准备结束至第一次 request 的边界，分布覆盖全部 422 个 retained preparations。它仅导出首四及末四条 Page 位置，原 v3 链接保留首/末各 16 条；两者都是有界首尾选择，不能视为随机样本。未发生 2,048 容量溢出；身份表存在一次 state rotation、三次 frame rotation，5 个 accepted frame 无完整意图关联，3 次 request 无已知 intent，相关覆盖缺口继续保留。

| 时间口径 | 有效 / 未知 | p50 / p95 | min–max |
| --- | ---: | ---: | ---: |
| preparation finish → first request | 422 / 0 | 21 / 26ms | 11–171ms |
| first request → first paint attempt | 384 / 38 | 18 / 23ms | 1–30ms |
| intent → first software accepted | 419 / 0，均已 superseded | 69 / 82ms | 46–247ms |
| native callback，从 paint attempt 起 | 504 / 0 | 12 / 15ms | 3–164ms |
| 软件 accepted 间隔 | 503 / 0 | 29 / 36ms | 9–178ms |

request→paint 的 38 个未知包含 37 次相同读钟和末项未观察到 paint；18/23ms 只描述其余 384 个可分辨区间。该终点在 `sky-canvas-lifecycle` 调用 `port.paint` **之前**的 `paintStarted`，并非 native callback、accepted 或屏幕呈现。preparation→request 测到了准备结束后的等待，但尚未给出等待所属线程工作、React effect/admission 或其他调度原因。

505 个新 intent 中，419 个有 first accepted，**全部已经 superseded**；这些是原 observation-time owner 发布的状态，包括正常 Play 自动推进，不能当505次人类手势。80 次为同 intent 的重复接受。86 个尚未 first accepted 的 intent 包含 85 个已 superseded 和 1 个末端当前 intent。unsuperseded first accepted 分布没有样本。69/82ms 因而是观察到的旧意图首次接受分布，不能当最后一次输入或停止后的到位时延。legacy `intentToAcceptedWallMs` 因仅在最新时间字符串恰好匹配时计量，本轮为 0 个样本，不能理解为零延迟。`time.*RelativeMs` 及 requested-minus-accepted 是观测时刻字符串间的差值，不能另作运行时等待。

8 条 A1 首尾链接在 preparation finish→first request 期间均没有新增 Page submitted，2 条有 completed 变化。它们说明同时发生的 Page 活动及 pending 状态；没有 payload 身份或 React render 时间，不能把等待直接归因于桥或 React。scalar 窗 Page submitted/completed 为 452/451、pending 1、maxPending 2，无已记录失败；16 个有界 JSON 序列化样本共 19,493B。Page latency 仍使用既有 performance.now/Date.now fallback 和原有处理口径，未获本轮 v3 时钟校准，12723ms 总量及185ms最大值不能写成 CPU 或物理呈现时间。

同步 `draw` 和 `nativePaintOwner` 各 504 个有效区间，p50/p95 均 12/15ms、最大 165ms；它们有嵌套/重叠关系。`presentation` 有 251 个有效与171个未知，p50/p95 1/3ms；constellations 为 422 个有效，3/6ms。displayCopy 的 504 次中 434 次、publishAccepted 的504次中425次低于分辨率未知。完整覆盖列在 JSON 投影。不得把独立阶段的 p95、max 或已知小计相加成一次输入/一帧成本；返回的 copy/publish hook 是软件边界，不是物理 present。

这次区分了“非空正常 Play”“准备值是否进入绘制”“准备结束后的首次请求等待”“首次请求后的绘制尝试等待”，并保留了 superseded 与未知覆盖。它没有区分等待归属、末端当前意图到位、物理显示延迟、手势/密集标尺响应或 B 的 allocation/保留/进程增长解释。保持现有生产准备、调度、发布和资源所有权；不凭本轮选择结构改写，也不重开相邻禁用变体或同轮方案审查。下一步仍沿现行 PLAN 解决尚能改变决策的边界。

早先 `r17-1-w6gz92o2ck` 的 `wide-camera` 虽通过语法/协议校验，1,005ms 至15,012ms的计量未覆盖 root 实际手机手势，所有工作量计数为 0；它只是未采到代表动作，不能算性能零值、有效 A 或 Play 对照。

结论边界不变：A 有本次有限关联证据但尚未验收；B 无当前正常 Sky allocation 样本及对齐的持续、暂停排空、退出观察；r3 的跨日37物理像素错位与取消后12–16日窗口仍失败，见 [SKY-RULER-CROSSDAY-FOLLOWUP.md](SKY-RULER-CROSSDAY-FOLLOWUP.md)。本解释没有操作手机、ADB、开发工具、服务、feedback、生产源码、构建、预览或提交，也没有修改 PLAN、HANDOFF 或 preparation owner。
