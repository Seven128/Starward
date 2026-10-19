# r8 地形代表动作：新 HTTP 产品身份闭合，文件 ready 后仍有可见缺口

2026-10-19，独立文件复核，结论为 **`NEW_HTTP_PRODUCT_BOUND__VISIBLE_GAP_AFTER_FILE_READY__NOT_FINAL_ACCEPTANCE`**。复用既有 PLAN、performance-investigation 方法、r6 等待记录及 24 文件缓存归档；没有重选方案或重录动作。root 独占现场，本代理仅复制、读回和分析文件。

## 候选、动作与保存范围

本次手机仍为 A1 r8：应用指纹 `a4b55d3d876a65f731d0e044eb043e0961c05718a2d2a81c1f40aa502be8eb3e`，完整构建源 `3362e2d0595b7871835b0232eb43f2ac233c5a5aa012f609c5eb40e04df4bcb0`，绑定会话 x20PZ8。复用已冻结的官方成功、r8 标签与绑定 owner；本复核不另证手机整包字节或运行 AppID，也不把定向 development feedback 当最终验收。

root 报告只成功发送一次 1400ms 横向拖动；先前一次守卫拒绝没有输入。四张实际查看的原截图及 sidecar 全部校验字节/hash：图层截图确认地形已勾选、有效地形100%，云量已勾选但所选日期无预报，光害未选；动作前是 medium 点位面板和非空旧地形。没有清缓存。录像中 **n343 起点位面板关闭，转为 full map**，可见范围改变，不能忽略这个条件。

外部私有 owner：`E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r8-terrain-identity-20261019`。

| 冻结集合 | 文件 / 字节 | manifest SHA-256 |
| --- | ---: | --- |
| 原片、截图、绑定、health、产品 proof 与引用 | 34 / 9133111 | `cc96056e7df3a09d4ac4f9823d6585dd3636be03aebbdc6a7d802c8fe82dcc45` |
| 实际 bridge、terrain manifest 和 8 个 r8 插桩后源文件 | 10 / 199305 | `948dfb3c46cde8930e37c7077ec29a2bffa614dbc11fef63ba4e25e43418bc93` |
| 49 个原 PTS 帧、5 张接触图及索引/工具 | 60 / 82953786 | `9ad9d1e58a3e61314de4434f536b020f87661148a659c01337c26d170c686e8a` |

复制集合均核验 before/copy/after 相同，并在成文前再次读回。已有 24 文件 / 1,011,435 B 缓存归档也逐项重新核对，manifest 仍为 `864068b70e51dc00e90a4d5c43da57f4d1f072c180f2bce57a7533798f5cc119`，没有重新生成产品。

## 新请求与实际转发产品的绑定

冻结 bridge 原件为 **`d2ab53a59d805930ab31f65429631c8183e243c3d5c1338d974e4061f7d29f3e`**，与 root 给出的 exec 21018 运行字节一致；本代理没有读取进程内部身份。collector 目录虽以未来 normal-r9 命名，仍服务于这次尚未 refresh 的 r8 候选，目录名不代表手机换代。

before/after 保持相同旧 ring 前缀，新增 12 行中恰有一个 metadata 和一个 asset；两者的实例 UUID 相同、开始序号分别为 1 与 2。before 尚无地形行，因此没有 run UUID 可用于独立比较 before/after 的 UUID；同一未变 exec 的现场绑定来自 root，不能称作本代理直接验证了进程连续性。

| 事实 | metadata | asset |
| --- | --- | --- |
| 请求 / 状态 | GET / 200 | GET / 200 |
| 桥 handler→finish | 11 ms | 184 ms |
| host finish Date | 09:56:58.498Z | 09:56:58.727Z |
| 字节 | 声明 314570 B | 实际流 314570 B，声明也为 314570 B |
| 完整性 | COMPLETE；外层 PARTIAL，地形 AVAILABLE | COMPLETE_RESPONSE |

metadata 的 image SHA 与 asset 实际转发流 SHA 都为 **`4ba6d68aa59958c2017957929a6fcc72715896a702026b4f055bcd7046478340`**；两者 path SHA 相同。真实新请求由生产 key owner 计算的归一键 SHA 为 **`ca6355e6ca781cf0206eaf245d6bbfcfb1249a729723c51b2c580c0d32cd1f68`**。

它们逐一匹配已归档 v4 proof 的 key、图像长度/hash、512×512、z12/2×2 窗口及 source-set hash。复用现有 `validateTerrainPublication`、`validateTerrainAsset`、`terrainWindowRequest / terrainWindowViewport → normalizeTerrainRequest → terrainRequestKey` 验证，proof 自身 bounds 得到的键也相同。产品派生时间仍为 07:03:47.633Z，sourceIssues 为空；这次读到的是此前已存在的同一成品身份。实际 API 内部各级 cache hit、源 I/O/CPU 时间仍没有 telemetry 证据。

该闭合只证明**本次桥真实声明并转发的产品**。Node finish 和 COMPLETE_RESPONSE 不证明手机收到、校验、安装或显示了相同 SHA；手机 opaque A5 到 SHA 的表未直接读回。原 r6 没有该实际身份字段，关联仍 UNKNOWN，不能反向追认。

## 原片可见顺序与最小边界

原片 2,243,961 B，SHA `0ed20a9caea4fdbaca91ef9e006a136bad484817a981cd7570ebb00752fb2609`，1080×2376 H.264，389 个编码帧。容器 18.252533 秒，最后编码帧 PTS 14.739333 秒；保留 1/90000 原 time base，无 trim、PTS reset 或复制帧。实际查看 22 个分布样本和边界处连续 29 个编码样本（重叠2，共49），并逐张查看 n344–348 的完整原尺寸画面，避免接触图缩小误读。

| 编码帧 / PTS 秒 | 实际可见事实 |
| --- | --- |
| n0 / 0 | 非空旧地形、medium 点位面板，TW armed gesture。 |
| n239 / 3.996533 | TW 1 action A1 0ms 已可读；它不是物理手指开始时刻。 |
| n299 / 4.994622、n329 / 5.493089 | 右侧出现清楚旧覆盖直边，边外只有底图；左侧有效地形保留。 |
| n336 / 5.607989 | TW 4 file_acquire A5 1802ms；仍缺右侧覆盖。 |
| n343 / 5.740411 | TW 5 download_returned A5 2041ms；点位面板已关闭，full map 暴露，缺口仍在。 |
| **n344 / 5.757300、n345 / 5.774189** | **TW 6 file_ready A5 2052ms 已清楚可读，右侧仍缺新地形。** |
| **n346 / 5.790578** | **紧邻下一编码帧，新区域出现连续地形阴影，旧竖直边消失；标签仍是 file_ready，加载通知还在。** |
| n347 / 5.807122 | 新覆盖已在，仍显示 file_ready。 |
| n348 / 5.824222 | 才首次拍到 TW 7 native_ack A5 2107ms；不能据此把首覆盖推迟到这里。 |
| n354–356 / 5.923867–5.959000 | 新覆盖保持，加载提示短暂再现，随后 TW 9 file_ready A5 2259ms / TW 10 native_ack A5 2266ms。不能仅凭简写判断另一次事务和 current/cleanup。 |
| n358、n375、n376、n377、n387、n388 / 7.158078–14.739333 | 所审稀疏尾部样本保持新地形；中间未编码区间不补成连续帧证明。 |

本次这块新区域的首次有用覆盖边界为 **PTS (5.774189, 5.790578]**。所审明确缺口样本跨度为 4.994622–5.774189（0.779567 秒），它不等于完整缺口总时长。判断依据是相同位置先有清楚直边与平坦底图，后来增加真实连续阴影；不是把正常平坦或透明像素当缺测。

这里取得了方案所需的窄正向证据：**A5 文件 ready 的异步标签已经可读，之后仍拍到缺口。** 源码中 file_ready 位于共享资源路径获得、effect 未取消之后；marker 只表示这个准备事件已先发生。没有导出本次完整 terrain-wait receipt，因此 clock invalid/backward、overflow、attempt/current/cleanup、file cache 状态及 A5→实际 SHA 手机映射仍未认证。

没有 phone Date.now ↔ host Date/performance.now ↔ 录像 PTS 校准。不能把 2052/2107/2266、桥的 11/184 或 PTS 相互相减成物理延迟，也不能用编码帧数、60/1 名义率、录像文件名或终态截图 Date 计算物理 FPS。尾部存在 1.138811、0.657500、2.864922、3.513200 秒等编码采样缺口。已看到的 ready-before-gap 不证明全部残余时间都在 native 后侧，更不解释旧 r6 的冷 metadata 等待。

## 决定与仍保留的义务

新 HTTP 身份缺口已闭合，无须重复同一身份资格动作。若下一决定仍需细分后侧，可沿现有 file/native-install/presentation owner 复用这条 ready-before-gap 证据，并优先读取已存在的精确 task receipt，不能为了它重发本次动作。原 r6 的 metadata 2248ms、源读取与 CPU 贡献继续单独保留；这次已存在成品的 11ms 不能成为优化对照。

本复核没有采用 blocks、prefetch、worker、扩大 cache 或新 renderer，没有改生产/bridge、服务、feedback、构建、账号状态、Git 或 coordinator 文档。没有触碰原8791、N05、R6提醒、配对/VPN；没有留运行进程。完整地形连续性/细节/配准、Cloud/年度光害、iOS、资源回落、Sky A/B 及完整 Goal 均未由这个单样本关闭。
