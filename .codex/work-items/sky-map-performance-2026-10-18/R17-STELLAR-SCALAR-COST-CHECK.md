# R17 恒星投影：单一中间 tuple 的主机成本核对

**本次不采用。** task-only scalar 候选与当前实现的实际数值和所测错误语义一致；三次独立进程均出现小幅正向的配对中位耗时差，但幅度没有通过本次预先写定的同源噪音筛选。它不足以支持把消除这个 tuple 作为下一项 A 修复。没有改生产代码、手机候选或 PLAN，B 的正常 Sky 分配采样义务保持未验证。

机器结果、全部配对观测、输入与源文件 hash 见 [JSON](R17-STELLAR-SCALAR-COST-CHECK.json)；复现入口是 [task-only 脚本](scripts/r17-stellar-scalar-cost-check.mts)。本报告仅回答 root 指定的一个问题，没有增加 disable、scene-memo、publication、缓存或第二个数值变体。

## 责任与唯一变化

当前 `packages/astronomy-core/src/stellar-vectors.ts` 的 `projectStellarMotionDirection` 依次调用 `stellarDirectionAt`、`rotateStellarDirection`。前者返回归一化 EQ 三元组，后者立即解构，再计算并归一化 ENU 三元组。候选将前一个三元组改为局部 scalar，保留：

- `julianYears` 验证先于所有 motion／matrix 读取；motion 下标访问顺序仍为 0、3、1、4、2、5。
- 原来的三项 proper-motion 乘加、第一次 `Math.hypot`、有限性／`1e-12` 阈值判断及 x、y、z 除法顺序。
- 原来的行优先矩阵乘加顺序、第二次 `Math.hypot`、相同判断与三次除法；最终仍返回新的三元组。

实际调用者 `sky-stellar-transform.ts` 由 BSC、SAO 共用。它只在某个 exact-time frame 首次需要某行方向时调用本内核，并缓存冻结的最终向量；同刻相机移动可复用它。BSC／SAO `motionAt` 现有六项数组、当前 frame 的缓存／retire、完整角度与外观计算、最终向量的冻结和所有消费者均未改变。

[正常手机 CPU 归因](R17-NORMAL-CPU-ATTRIBUTION.md) 中 `forEachProjected` 子树的 21,006／116,670 非 idle 样本（18.00%）涵盖多项责任。它没有把这些样本逐语句归到本三元组，也没有给出该内核在全部子树中的精确比例；不能把下面的主机比例与 18% 相乘，换成手机收益预测。

## 输入与实际语义检查

复用现有 owner 的输入和方法，无设备、服务、数据库、私有配置或网络读取：

- 生产采纳的 BSC v3 全部 8,404 行，使用与 `StellarCatalogPublicationService` 相同的 `createStellarMotion(row)`。catalog hash 为 `ba9bef4144d4cfb4c706a5d1d8a0958d8303854e7bfabe780005b63e0c904c2c`。
- 仓库 SAO v2 的实际索引／选中 tiles。索引与每个读取 tile 都经现有契约及实际文件大小／SHA 校验；其 base v3 身份匹配。全 publication 是 246,280 行／826 tiles，本次没有把总数当成每帧加载数。
- 沿用 `stellar-vectors.test.ts` 的北半球、南半球、南北极四站点和 J2000、2026、2050 三个时刻；沿用 `compare-sky-stellar.mts` 的 45°／10.8° 视图、390×844、basis(45,110,0)。语义检查选中 SAO 每例 439–9,713 行，共读取 221 个不同的真实 tile；计时子进程对另选 tile 同样执行实际文件与契约校验。

实际对照通过：

| 检查 | 实际覆盖与结果 |
| --- | --- |
| 方向精确一致 | 169,216 个向量、507,648 个分量逐项 `Object.is`，全部相同 |
| 水平角消费者 | 同数 169,216 组 azimuth／altitude 均 `Object.is` 相同 |
| 数值与错误边界 | 18 例，包括 signed zero、第一／第二归一化阈值恰好及以下、零向量、NaN／Infinity、缺项、motion 溢出、有限的大 `hypot` 输入、无效 epoch 先行拒绝；错误类别／消息相同 |
| 顺序与短路 | 8 组 getter 和 `Number.isFinite`／`Math.hypot` 调用 trace 完全相同；含 motion／matrix 抛错与无效 epoch／方向先行终止 |
| 原 owner 完整性 | 核心及实际调用者、生产 motion producer、原 fixture／CPU 比较入口共 7 个源文件，在运行前后 SHA 未变 |

这些检查针对 admitted 数值 tuple 的合同及列出的边界，没有承诺支持蓄意替换 `Array.prototype` 迭代器的外部环境。矩阵、时间、Math 运算和归一化没有降精度或近似化。

## 温热主机成本

Windows x64，Node v24.16.0／V8 13.6.233.17-node.49，i5-11400F。三个全新的 Node 进程顺序运行；每个视图先做 10 对交替顺序 warm-up，再做 24 对 baseline／candidate 与穿插的 12 对 baseline／baseline 自比。comparison 两种顺序各半。每个块约 26 万次投影，所有最终向量都进入有限 checksum，每对 checksum 精确相同；没有强制 GC。原始块和 order 分组保留在 JSON。

每个视图预先准备 100 个真实 exact-time matrix：从既有 2026 时刻后 1 秒开始，每次前进 17 秒；实际选择和加载对应 SAO。45° 加载 472–543 行／17–19 tiles，10.8° 加载 2,696–4,627 行／12–18 tiles，外加完整 BSC。文件读取、解码、校验、motion 建立、matrix 建立与 tile selection 均在计时外。计时只含本函数、输入读取和 checksum，不代表整个 `forEachProjected`、Scene 或页面。

| 主机视图 | baseline 中位 ns／call | candidate 中位 ns／call | 配对中位下降 | 三进程配对中位下降 | baseline 自比绝对波动 p95 |
| --- | ---: | ---: | ---: | --- | ---: |
| 45° | 79.22 | 77.06 | 3.35% | 3.08%／4.05%／3.51% | 26.44% |
| 10.8° | 77.48 | 73.46 | 4.28% | 3.34%／5.07%／4.00% | 13.93% |

每列中位数使用各自定义：配对下降是每对 `(baseline−candidate)/baseline` 的中位数，不是两列 ns 中位数的商。`ns/call` 是 `hrtime.bigint` 主机 elapsed 除以实际次数，包含抢占／GC／主机负载，不是 thread CPU。

合并配对的 median bootstrap 95% 描述区间分别为 2.77%–4.61%、3.23%–5.30%；不能省略这个小幅正向信号。与此同时，10.8° 的第一个进程区间跨零（−0.57%–6.11%），并且两组中位差均小于同源顺序自比的 p95 波动。复用同一批输入的块也不是独立的设备试验。

脚本在运行前已采用保守筛选：每个新进程的 paired median 区间均为正，合并区间为正，且合并中位差超过实测同源自比绝对波动 p95，才将它列为可审阅主机信号。两视图均未满足。这个筛选只用于本次噪音判断，不是产品性能预算，也不证明数学意义上“没有任何收益”。当前可负责任的决定是**不采用，不继续加样本／调参寻找通过结果**。

## 分配解释与下一步边界

源码层面每次成功调用从“一个短命 EQ 数组＋一个返回 ENU 数组”变为“一个返回 ENU 数组”。被省掉的 EQ 数组没有逃逸到调用者；这清楚界定了要去掉的表达式，而非实测分配字节。host／target JIT 可能已经 scalar-replace 它；候选同时改变 helper-call 形态，本次没有第二变体拆分 call overhead。没有采集物理分配、GC 事件、retainer 或 retained heap，不能宣称少分配多少字节，更不能解释手机约 1 GB 的进程增长。

这个有界问题已经得到可复核的回答，不作为新的手机候选。A 的 input-to-accepted 结果、B 的正常完整播放／退出／恢复与分配归因，继续由既有 PLAN 和正常样本 owner 管理。正常 renderer、copy、caption、accepted、原 memo／publication、BSC／SAO 与精确时间要求全部保留。

复现命令（会重新写本任务 JSON，性能数字随主机负载变化）：

```powershell
node tools/run-node.cjs --import tsx .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-stellar-scalar-cost-check.mts
```
