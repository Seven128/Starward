# R17 A1 r6：单次真实时间输入的关联结果

2026-10-19，独立文件复核者 `review_r6_manual_input_a`。**本次补上一个最新、未被替代的真实输入首次软件接受样本：59ms wall elapsed。** 它证明这一次合法六字段输入实际经过完整准备和非空 Sky 绘制；不能证明物理触摸到呈现时延、整体 A 验收或 B 的增长解释。未据此选择生产调度、准备准入或 React 发布结构改写。机器可读投影见 [R17-A1-R6-MANUAL-RESULT.json](R17-A1-R6-MANUAL-RESULT.json)。

原始 metrics 为 `baseline-r17-2-td7a16w44u.json`，18,080B，SHA-256 `fd9e14901db2ea5951ef2274992be7d3eea16c6acfe7bba323050cf3374da9ce`。当前严格 `r17-normal-input-protocol.mjs` 准入通过，协议为 `starward-r17-phone-probe-v3-manual-input`，case 为 `manual-input`、trigger 1。manual 没有 Play terminal；actualPlay、pauseAttempt、pauseSuccess、terminalExport 均为 0。没有把旧延迟协议伪装成新实际采样。

46 份原始记录、4 张 PNG 及 sidecar、原录屏、官方结果、feedback/session、准备 owner、manifest、相关模板和真实生成源码已用独有新目录及 `wx` 逐字冻结到 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r6-manual-association-archive-20261019`。输入共 3,953,540B，原件与副本在冻结时全部读回一致；`archive-manifest.private.json` 的 SHA-256 为 `46e1dcff1cf0d03f67ad0ca5e8b8b3754ca6f268ca45935857aaca5bd4cf794d`。私有原始文件留在外部 owner，Git 仅有本摘要及数值投影。另读回两份完整编译目录的文件指纹，不修改候选。

候选 app SHA 为 `62ac5b330d8a735eadc43efc174e2e6f9b633ff7c543f38575e1fd38447e82b1`，buildSource 为 `95d1e91d1c68ee154de1251bd41c32852938e0bfcab13feda7e144741ce0c7c9`，production HEAD 为 `526d00ec2b9333951f7b63f1ab40081e22d9584f`，reviewRevision 6、buildGeneration 27、feedback generation 1、metrics window 2。现有 `fingerprintBundle` 对 local project 与实际 prepared phone project 均读回 337 files / 4,995,513B 及相同 app SHA。官方原始返回经现有 classifier 核为 `auto_preview/status=success/success=true`、taskId null，feedback 与 active session 的本地绑定相符；独立查看手机标签确为 `R17 正常Sky关联 A1 r6`。这不是凭 wrapper completed 重放旧 gen26；没有操作任何预览或旧 session。证据仍为 development feedback：运行 AppID 与手机完整包字节没有由本次补证。

root 的一次真实分钟↑把 committed 19日04:30:00 改成 04:31:00 预览，未 Play/Apply。待命只建立 arm，实际合法 `onPreview` 经过原输入 guards 后、原意图发布之前启动同一 recorder，startDelayMs=0。它晚于物理输入和平台派发；以下时钟起点不是手指落下。

| 同一 recorder 的真实边界 | 相对合法 onPreview recorder 起点 |
| --- | ---: |
| 实际意图发布 | 2ms |
| preparation 开始 | 7ms |
| preparation 完成 | 18ms |
| 首次 request | 37ms |
| 首次 paint attempt | 40ms |
| 首次软件 accepted | 61ms |
| 自动导出请求 | 15,003ms |
| metrics 封存 | 15,004ms |

因此该唯一 intent 的首次 accepted 是 **61−2=59ms**；合法 onPreview recorder 至 accepted 为 61ms。唯一 preparation 的已知经过时间 11ms，完成至首次 request 19ms，request 至首次 paint attempt 3ms，首次 paint attempt 至软件 accepted 21ms。这是一个已关联 token 的边界序列；不是把独立阶段的 p95/max 相加。`presentation` 自身另记 10ms，范围与包围它的 11ms preparation 不同，不能互换或叠加。

Date.now 明确为 wall elapsed、非已校准单调钟，名义 1ms、有效分辨率未知。此窗 193 次读钟，invalid/backward 各 0；相同读数仍保持 below-resolution unknown。实际 metrics elapsed 15,003ms，durationLimit 45,000ms 只是安全上限；本次 reason=manual 来自原 15 秒导出封存，不能当 45 秒持续使用或 host 决定的停止。没有视频 PTS、host capturedAt、实际触摸或 physical present 的时钟标定。

本次只有 1 个 intent、1 个完整且已消费 preparation，8 次 request 复用该准备值，7 次 paint attempt、native callback、软件接受及 Scene finish。1 个 first accepted 在接受时未 superseded；6 次只是同意图重复接受。没有 unknown intent/preparation lookup、linkage mismatch、identity rotation、容量溢出、未接受 intent、未消费或过期 preparation、synthetic publication。本次所有 retained links 都在导出中，不存在首尾抽样截断。它填补了 [r3 Play 结果](R17-A1-R3-PLAY-RESULT.md) 中 latest-unsuperseded 分布为 0 个样本的缺口，但只有这一个输入，不能把 p50/p95 都为 59ms 当成总体分布。

实际 Scene 非空：固定 viewport 384×796.800048828125、FOV45°，BSC 8,404 行、loaded SAO 666 行、16 个 selected tiles；实际 BSC/SAO 提交分别 1,283/945，GL submission 84，接受快照中的 BSC/SAO 对象累计 1,283/714，failed frame/invalidation 各 0。scalar 窗 1ms 至 15,003ms 另核 native copy/ready copy 各 7、无冻结或 synthetic publication。native measureText 返回计数本窗为 0；cache 字段没有提供，不能据此宣布没有文字工作或产生缓存收益。`DAY` 是 DisplayMode/显示主题；太阳高度与光照条件仍 UNKNOWN，不能把它当作太阳在地平线上方。该手动样本与 r3 Play 的 SAO/tile 和输入方式不同，不能用计数差宣称优化。

Page observer 可用。preparation 完成、request、paint 三个位置的 `[submitted, completed, pending]` 都为 `[0,0,0]`；scalar 窗末端为 6 submitted / 6 completed、pending 0、maxPending 2、无已记失败，6 个有界序列化样本共 12,075B。它说明这三个边界前没有该 Page observer 的新增提交，不能归因 19ms 等待给桥、React render 或某个 payload；其它 component/Canvas 责任也没有由 Page 数据覆盖。Page latency 的 140ms 小计/32ms 最大值仍为旧生产者的性能钟/fallback 口径，没有获本次 Date.now 校准，不是 CPU 或 physical present。

legacy `intentToAcceptedWallMs` 记录同一时刻的 7 次接受，范围 59–211ms，其中后 6 次为重复呈现，不能当成 7 次人类输入或用其 p95 211ms 代替首次响应。`time.*RelativeMs` 与 requested-minus-accepted 是观测天文时刻之间的差，本次均 0 不代表输入零延迟。base、selection、supplement、displayCopy、publishAccepted 仍有低于分辨率的未知覆盖；完整 known/unknown 留在 JSON，零已知小计不改写为零成本。draw/nativePaintOwner 有嵌套关系，不能相加成一帧成本或换算物理 FPS。

独立实际查看的静态帧如下，原图均 1080×2376，SHA 与 sidecar 相符：

| 帧 | capturedAt UTC | 已见事实 | PNG SHA-256 |
| --- | --- | --- | --- |
| `screen-65d5b7f6-3100-434a-bd12-3ddd4be552c1.png` | 06:57:33.120 | r6 唯一标签、manual-input 待命入口、非空 Sky | `caf8f471ae34e1744704e3b0e5f1305b7fa5bdf10e09f03f3a8796e7ecb45944` |
| `screen-d55804b1-b0d7-414d-8440-59af777365ba.png` | 06:57:54.342 | 19日04:30:00、无预览文字 | `110b130cea5b84aaee83867c3e84fbe6115b5d1938558b1bc13a882649678830` |
| `screen-073dcc71-fadd-45ec-a91a-d848da9ef930.png` | 06:58:26.424 | 19日04:31:00、预览与取消预览、非空 Sky | `1f37c00cae5c9b5d04633bd20fb3522b43ef883bb964fe34208842d08ba2ae25` |
| `screen-de346382-50ec-41fe-96c2-da945ddbae52.png` | 06:59:24.474 | root 实际取消后回19日04:30:00，预览/取消文字消失 | `f97f49e092362d49f6190c7af83e7f4a7366875fe463aca04eba0535c0bc800f` |

取消帧发生在 metrics 封存之后，只能作为该次取消的有限静态恢复证据，不提供取消时延、cross-day/window motion、每帧几何、Apply 或持久化证明。原视频 `recording-1792393106424.mp4` 203,188B 已冻结；本责任由实际首尾帧及关联记录即可回答，未额外解码视频或据其请求 15 秒推断编码时长/FPS。r6 首显 motion 由独立 entry 结果拥有，本文件不替它通过。

维持当前生产 owner；本样本没有显著未消费准备成本，也没有据此改动调度或发布的证据。不为安心重复这次 manual 样本，复用既有有效正常 CPU、r3 Play 与已答问题；继续现行 PLAN 尚未覆盖的真实原生 motion、高频/完整 A、B allocation/暂停排空/持续使用与退出、Terrain 及完整 Goal 义务。A/B 均未由此验收。本 agent 未操作设备、IDE、ADB、feedback、服务、构建、预览、生产源码、PLAN、HANDOFF 或 preparation owner，未提交文件，也没有新增人类动作或重开方案审查。
