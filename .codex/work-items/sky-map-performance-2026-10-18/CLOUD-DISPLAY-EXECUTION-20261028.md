# 云量离线加工：有界执行、真实单窗与有限显示质量

归唯一 PLAN P2 的加工/API分离；本轮完成原 producer 的执行边界，不是完整补图服务、全国规格或正式数据发布。源组 UNKNOWN、formalReady/runtimeActivated=false 保持，未改 PLAN、BFF ready、配置、数据指针、API/DB、业务提醒 worker、旧九张 pilot 或原件。

## 原 owner 的接通与恢复

`prepare_tcc_display.mts` 保留唯一采样、内部逐像素 GCJ→WGS84 配准、原色标和 PNG/proof 算法及八个科学源码身份。`CloudDisplayRenderSession` 在同一加工会话中只保当前窗口坐标与原有界 numeric store；批次仍按原 window/time 顺序，复用串行子进程、坐标和原生数值，不另建图片缓存。旧六/八份 codeHashes 的 proof 不改写。

薄 `cloud-display-execution.mts` 复用 `SharedReadPool` 做同键在途共享；身份含源目录/manifest、科学代码、固定窗口及精确 UTC 时刻。单 reader 取消不杀其它 reader，最后 reader 取消或绝对截止会终止对应 owned Node 子进程，等真实 close 后才释放槽位/接后继。同一会话可复用空闲进程；正常最终 close 等 numeric store 排空并取得正常退出报告，已回图但随后意外退出也不能封完整 inventory。入口 `cloud-display-process.mjs` 只调用原科学 owner，不构造 OutboxWorkerRuntime/API或读取凭据。

原 callable/CLI 增加必填 `execution`：绝对 `deadlineAt`、`maximumConcurrent`、`maximumQueued`、`maximumOutputBytes`；不设虚构的默认生产容量。可选 AbortSignal 与 CLI SIGINT/SIGTERM 沿同一取消责任。原批处理 CLI 已实际复用执行器，不是未接线的孤立 helper；两个现有测试 caller 仅补完整输入。

`cloud-display-output.mts` 只管平坦自有目录、exclusive lock及原不可变资产。现存/失败残余、临时清单、测量与完整 inventory 都计字节和有限项数；拒绝源目录重叠、别名、非普通项和已封 inventory。失败保自有残余，不靠删除旧文件回收“免费”额度。所有图成功、源码身份未变且加工进程正常排空后，才以不覆盖已有文件的原子提交发布本地 inventory；锁归属不符保 cleanup=false，重复调用不改报成功。

## 软件检查

- 原实现的过期截止反例实际失败；最终作者执行七项聚焦通过，Root另沿真实入口复跑 **7/7**：过期前置、同键/单取消/全取消、等待真实退出再换位、忙循环硬截止、已回图后异常退出、真实顺序加工复用/残余预算、exclusive lock及清理失败幂等、源读取失败不封账（部分机制在同一用例内）。
- 作者现有 cloud reader、Map static/OSS 消费者回归 **21/21**，API 项目与新测试严格 TypeScript 通过。Root没有把作者结果写成独立重跑；Root本轮实际重跑七项及下方真实输入。
- CPU 分父/子进程；子进程累计值只在正常退出求和一次，报告不完整不当作零成本。wall从 producer 入口到图片写入和真实进程排空，落盘测量明确不包含它自身/最后 inventory 写入；Root另记整个执行及读回耗时。RSS 是采样到的最大单进程值，非并发总峰值，原生瞬时峰和 tsx 辅助进程CPU仍有测量限制。

## 真实非整点单窗

操作在新私有根 `E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/bounded-display-unit-20261028`，`intent.json`/`run.mts`事先保存，`process.json`在执行前独占创建。进程已 **exit0 / result SUCCESS**，不得按 STARTED 记录再次运行。

输入复用原 numeric manifest `0569b5777aa8c6aef3f0ad61a9832902b1e47bb8ddddaebf39a33badd9bdc26c`；窗口 `5-24-12-2-2`、512×512，精确时刻 `2026-10-27T18:17:23.456Z`，完整原 grid/tilePixels 合同。显式开发 allowance 为30s、并发1/等待0/整个输出2MiB，依据旧九图3.628s和同窗136,475B样本留本次操作余量，不是生产阈值。

- 新 PNG **141,001B**，SHA `c706625dbf8074e81bc1f77a3eab29f8ef8adfd88cbb33853f7a993b00fcf142`；新 inventory SHA `015af593502efa4098550830dc5c508f4d0b77fa2438d35c201c820cdcb4d712`。最终四文件 **146,243B**，与 retainedOutput 实际读回一致，lock已释放。
- 原 `CloudDisplayPublication` 读回 AVAILABLE、精确时刻/窗口/PNG SHA一致且没有 imageUrl；明示历史校验时钟 `2026-10-27T18:50:00Z`，不冒当前正式预报有效性。PNG CRC/尺寸及实际 alpha支持 **262,144有效/0缺测**；三个内部像素分别与同源点采样0%、0%、100%的RGBA一致，零值仍为有效像素。
- processStarts=processExits=1、liveProcesses=queued=0、cpuMeasurementComplete=true、cleanup.lockReleased=true。单图 geometryReuses=0 正常；同窗多时刻复用由上述实际受控批次检查覆盖，没有重产旧九图来重复证明。
- producer wall **1.215s**；父 CPU0.046s、加工子进程CPU1.281s；父RSS采样90,124,288B、子95,252,480B。Root整个执行及读回 **1.589s**。不同工作量、测量口径及进程边界，不与旧九图直接作加速或省内存结论，更不代表全国/混合容量。
- 四个当前生产文件 SHA在执行前后一致，保于 `result.json.codeHashes`；原 numeric manifest 与旧 inventory `e28cbf…` 前后相同。入口不写旧资产目录，未获取新GRIB、改原proof或重产旧图。

Root日志 `root-execution-tests.log` / `root-real-window.log`、完整 `result.json` 与 `render/` 保留。WEAPP前端未因这项离线改动重建，当前普通包仍按HANDOFF；没有目标端显示/网络或手机证据。

## 2026-10-29 有限显示规格证据

Root在独立私有`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/display-quality-20261029`保存`run.mts`、作用前`intent.json/process.json`与完整`result.json`。一次批次已 **SUCCESS / exit0**；结果SHA为`7bd32ea2378360f3f20f1a6299f6ba037b2895eacf436960011ff1e8eb4f94ed`，不得按STARTED阶段重放。没有改生产代码、PLAN、API/DB、手机候选或任何正式资格。

有界问题是“有限粗图能否直接替代细视野、不同窗口原点是否改变内部像素、实际数值裁剪外是否保持透明”。复用原manifest `0569b5…`和九图inventory `e28cbf…`，只按同一真实时刻`2026-11-02T03:30:00Z`新增三个512×512窗口：`5-26-12-2-2`为两份既有细图的共同粗覆盖，`5-25-12-2-2`桥接原`5-24-12-2-2`，`5-24-10-2-2`跨原数值北侧边缘。没有重产旧九图、获取新GRIB或扩全国组合。显式开发allowance为90秒、并发1/等待0/输出6MiB，按上轮单窗30秒/2MiB放大三窗用于本次有限操作，不是生产容量。

- 三张新PNG共 **449,380B**，完整输出8文件 **461,426B**；原numeric manifest、inventory及九对PNG/proof共 **20份**前后SHA相同，八个科学源码角色前后相同。原producer正常退出1个owned加工进程，liveProcesses/queued均0，exclusive lock已释放。
- 新三图与同一时刻原三图共 **1,703,936像素**，沿bounds/Mercator像素中心→原GCJ逆变换→共用点值采样/色标逐像素核对，RGBA差异0；这是实际图片与点采样owner的一致性，不是独立预报精度或目标原生配准证明。
- 两个同网格重叠区各 **131,072像素**，逐RGBA差异0。北侧图 **15,872像素**明确在原numeric crop外、alpha为0，246,272像素有效，其中34,730为有效零；本例没有“crop内源缺测”。Root已实际查看新粗图/北侧图及原沿海细图，查看器的黑底不表示黑色有效数据。
- 同地理内容的512×512比较区域，粗图在沿海只贡献16×16原像素、内陆32×32。对粗图分别模拟nearest、straight bilinear及premultiplied bilinear；它们是明确的离线对照，**没有认定微信实际采用其中任何一种**。沿海原资产为768×512、比较取其末512列，内陆原资产为512×512；不能据比较区域相同宣称整张下载/解码预算相同。

| 对照 | 最近色阶分类差异比例 | 平均alpha字节差 | 最大alpha字节差 |
| --- | ---: | ---: | ---: |
| 沿海，nearest | 3.6797% | 0.6148 | 5 |
| 沿海，straight bilinear | 3.1570% | 0.3204 | 3.3132 |
| 沿海，premultiplied bilinear | 3.1567% | 0.3204 | 3.3132 |
| 内陆，nearest | 0% | 0.2177 | 4 |
| 内陆，两种bilinear | 0% | 0.1470 | 2.4063 |

“最近色阶”是把对照插值RGB映射到原三个色阶的诊断，不是生产改色/数值采样或新增通过阈值。沿海最大RGB单通道差51，内陆RGB色阶不变但alpha仍不同。因此不能将本次z5粗图直接宣布为所有细视野的等价替代；本次只缩小实际差异和后续原生观察的范围。尚未锁最高有效LOD、全国基础窗口或一图/多图方案，不据该比例反向更改PLAN或新增任意质量门槛。

producer wall **2.779s**、父/子合计CPU **2.655s**、最大单进程采样RSS **109,142,016B**；完整生产与分析14.608s。不同窗口令geometryReuses=0正常；这些不是目标部署容量、并发峰值或客户端内存。原历史批次的source-group仍UNKNOWN，当前完整240h资格也未重授；没有公网URL、OSS/CDN、API启用或手机显示证据。

本轮另复核了线上准入的最早缺口：`getMapCloud`的新合同分支仍503，`CloudDisplayPublication`只读不可变有限inventory；现有executor的去重/队列/截止是单离线会话级，输出owner不允许向已封inventory追加。正式static/cloud upload仍在client前拒绝。不能在每个HTTP miss创建executor、以本地numeric ready冒完整ready，或先造另一队列绕过显示规格/源组/容量前置。fresh只读agent已完成关闭；未发现新的离线执行器缺陷，原7项检查直接复用。

## 2026-10-30 原生粗细图对照

### Candidate identity

Root复用普通候选 `sky-time-compact/source-project`，341文件、5,212,592B、SHA `effa83c72d72d83270bb4454756193b8c6aed641912d7b3740c73db7b5e7bf0e`，源码binding48026264。NIO N2401/Android14/微信8.0.78，真实LAN调试与同一 `spot-map-2`；实际CSS384×797/DPR2.8125，SDK运行时3.17.5（调试面板3.17.6[1663]分别记录）。这是受限平台显示实验，不是生产云量消费者、正式数据或全国显示验收。

复用上述历史00Z数值源与精确时刻 `2026-11-02T03:30:00Z`；完整原细图 `10-834-445-3-2` 为768×512/34,125B/SHA `3d843ad2ccfee2ae436f7060bc2db74f95e060740c1ccd217ecbc2f531ea28c6`，粗图 `5-26-12-2-2` 为512×512/175,207B/SHA `9d3de0b1a3431b19240c0900538706e726a2f97a6835490a64e8f1629b45b5e0`。没有裁图重编码、重产批次或改配色。原proof/inventory与六份control的字节复核匹配；两图在手机下载后的SHA256/字节也逐项相同。

完整私有根为 `E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/native-display-probe-20261030/`，输入manifest SHA `4b4f72650156499c41167b9ce4be3984cb1ab1463c2b9244cdbe1221f7490fb4`。普通候选、fd17故障候选与1de普通历史候选不混用。

### Invocation result

只开放两份原PNG的临时只读LAN入口，control/源码未暴露。关闭产品三层后，依次在同一空闲诊断id99001安装粗图、真实移除、安装细图、真实移除；各图使用各自原GCJ bounds，opacity1/zIndex20，始终只有一张实验图。四次调用均有原生success回执，实测回执间隔46/6/37/8ms；这些不是首次可见延迟或物理释放证据。生产guard、发布指针、数据库与业务API配置未改。

最初 `includePoints` 无回执且读回未改变，停止重复该调用；后用有成功回执的原生定点移动准备同一内容。关闭原面板会使受控相机恢复，因此最终对照在关闭面板后的定点移动完成后重新读回。一次小幅实际swipe虽已发送，但最终相机未变，不冒其已改变/提交视野。用于比较的before/coarse/fine均为实际scale14、完全相同region；没有把manifest建议scale11当实测。原生toScreenLocation另核中心及两角，读回坐标归 `projection.json`。

### Observed

Root实看四张手机原图与未改像素的左右裁剪：两张PNG均实际覆盖同一地图，云色色阶及过渡有可见差别，清除后回到原底图。`screenshots.json`绑定before/coarse/fine/after，四张1080×2376原图及采集元数据已复制到 `phone-evidence/`。选取不含banner、控件和系统栏的下半屏 `(50,1200)–(1030,2100)`，882,000像素的before/after逐字节完全相同；不是以工具success替代可见结果。

### Verified

Root独立重算稳定纯底色的5×5邻域筛选：611,568像素中，粗细图611,402像素不同，平均RGB字节差6.7227476，最大单通道21。另一有界分析在同一粗纹素内部、同一纯底色上核到189,809像素出现26种显示颜色；本例支持平滑重采样/显示，排除简单nearest直接显示原纹素。理想Mercator bilinear对粗图拟合误差低于nearest，但仍有合成/坐标取整误差，不能命名具体kernel、预乘或色彩转换方式。

这组实际结果足以否定“把本次低LOD着色粗图直接当作细图等价替代”。沿原PLAN保留基础覆盖及确有必要的有界局部成品，不因平台平滑而取消细节责任。量化只是诊断，不新设画质通过阈值。分析位于 `analysis/result.json`（SHA `f065d3a116ab871028b0cec1c18109dd0322de3532ed1c473ffac8f613a31d4b`）及同目录可复核脚本；Root已查看裁剪并复算上述主指标，agent已结束。

### Unverified

未锁定最高有效LOD、全国基础窗口/数量、全部内部控制点配准、iOS行为、正式云量消费者/三层合成、精确滤波实现或物理native/GPU释放与容量。没有新增Profiler/Heap、连续手势/退出重录或另一组合矩阵。source-group UNKNOWN、formalReady=false、runtimeActivated=false、12Z有限批次FAILED和正式分发缺口均保持。

### Invalidated

离线bilinear仅为对照的边界仍有效；不再把“是否简单nearest直接显示”列为这个Android样本的未验。粗图本例已不等价，因此不继续采集来命名shader。最初建议视野、失败includePoints、未生效的小swipe和生产云量入口均不是本次通过证据。

### Cleanup

两次原生remove均真实确认。临时 `wxfile://tmp_…` 直接unlink被平台拒绝，未误报清理；随后沿公开saveFile移动到预先核不存在的本任务私有路径，再unlink成功，原临时及自有路径均读回不存在（`phone-files-move-cleanup.json`）。只清理两份本轮下载副本，未清缓存或删除产品资产。Root核实owned PID18972命令后停止临时服务，8788监听为0；原8787业务API及真机连接保留。相机/scale14与原读回完全一致，地形开启、光害/云量关闭且真实地形可见，原地点面板已恢复。原输入、候选、截图与分析保留。

## 尚未完成

必要补图的线上需求发现/准入、完整发布与整组切换、源组资格/持续00–12批次、全国基础图规格及完整画质、OSS/ESA字节及冷回源、与业务API/DB重叠的目标配置容量、三层目标显示/资源回落和OOM均未关闭。有限内部/相邻窗口/裁剪边缘及本次Android对照只在各自范围有效。此模块的离线执行与真实退出不是已部署补图服务；本次真实平滑显示与不等价结果不授全国显示资格，也不要求继续追查不能改变决定的滤波实现细节。
