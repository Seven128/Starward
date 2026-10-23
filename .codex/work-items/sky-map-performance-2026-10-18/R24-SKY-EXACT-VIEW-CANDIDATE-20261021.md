# r24 精确视图准备候选：完整消费者对比后拒绝

2026-10-21。**拒绝“首遇流式、第二次同精确视图才建表”的候选，当前生产源码和测试均未改。** 一次性视图的包装分配确实减少，但完整 Scene 的同步绘制成本没有降低，恰好两次绘制时明确增加重复准备。不能为减少对象数而采用更慢的路径；不继续相邻变体，也不以此关闭普通 Play、六字段响应或泄漏/闪退义务。

## 已有责任与本次选择

复用 [r7 原分配归因](R17-NORMAL-R7-ALLOCATION-RESULT.md)、[r20 实际 draw 成本](R20-DRAW-COST-RESULT.md)、[r21 长按结果](R21-HOLD-RESULT.md)及当前源码。r7 的 rotateStellarDirection / transform 是存活采样归因，不是 churn、retaining root 或泄漏证明；本次没有重采 CPU、Allocation、Heap 或 Timeline。

| 方向 | 当前实际能力 | 本轮决定 |
| --- | --- | --- |
| 更早保守剔除 | SAO 已用当前精确 EQJ→ENU 的转置反求天球视向，以出版 tile 的球面边界、最亮成员及 `atan(maxMotion × abs(years))` 运动界先选 tile。BSC 已验证星等排序；BSC/SAO 都先做星等与精确向量视域剔除，再产生角度和外观。 | 最大视角下可剔除比例有限；没有新的测量证明应增加 BSC 空间索引或再复制 SAO 选择责任。更早 block 策略需先确定仍被遍历的、确实不可能贡献的工作和保守边界；不盲加索引。 |
| 静态与每时刻分工 | 不可变出版、BSC 条目/显示颜色与排序资格已经静态复用；每个 exact frame 共同使用一个精确旋转矩阵。SAO 每 tile 只留当前 geometry 变换；BSC 每 scene 只留当前 frame。 | 每颗星的原 proper motion、归一化、当前方向仍须保持。不能把“共用旋转”再当缺失功能实现，不重做已拒 scalar tuple，不增加时间近似或历史 frame cache。 |
| r21 current-exact-view 额外工作 | 当前 owner 首次绘制就为每个可见原始星点建立 `Point {star, projection}` 列表并 replay，同精确输入续帧可复用；改变时刻/视图后旧列表先退休。 | 这是本次选择的一个可区分候选：保持第一次同步输出，只有同一精确 view 第二次真正出现才建立列表，此后复用。用完整消费者判别，而非 toy kernel。 |
| 目标平台能力 | 准备、转场/点选/名称、最终遮挡及成功 copy 的接受责任彼此分离。 | Node 的受控 surface 不能回答 native/GPU 呈现、手机净响应或保留图；这些仍沿原目标观察和 owner 验证，不能由本试验代替。 |

候选仅在外部私有副本中实现。第一次调用同步走原 builder；每次发射前核当前 revision，完成且仍有效才记录“见过一次”。第二次收集仍在完整完成、revision 有效后 replay；replay 遇失效停止。它不检查 Play 模式、不改变时间、星数、调度、资格、源身份或 accepted owner。这些是候选意图；本轮因净成本拒绝，没有把尚未执行的异常/重入专项检查升级为通过。

## 实际输入与比较边界

直接复用 `sky-star-draw-preparation.test.ts` 的真实准入数据及完整 `drawSkyScene`，不是抽取恒星循环：全量 BSC **8,404 行**，同一实际选择的 **105 个 SAO tiles / 4,823 行**，384 × 796.800048828125、264.3550889449854°、夜间太阳高度 -24°、地景开启。两侧独立建立 exact-time report/geometry 与补充 frame，保持相同出版与数值；连续时刻以 125 ms 精确变化。实际渲染仍执行 projection/appearance、transition、拾取/名称、地景遮挡及完整 surface 命令。

先比较 36 帧完整 Scene 命令、拾取/名称 snapshot、动画及 completed 状态，涵盖每 view 1/2/6 次及未 commit 帧。全部逐项相等，累计 **205,392 个实际星点提交、162,103 个拾取对象、2,097 个名称**，不是空负载。它没有执行 GPU/native surface，也不覆盖真实页面选中动作、最终物理像素或完整后台/退出。

随后在 Node v24.19.0 中按每 view 1、2、6 次三个必要情形，分别做 6 个交错前后顺序批次。真实源/geometry 准备和显式 GC 放在测量区间外；计时覆盖完整 Scene 调用及其 transition 准备/commit，自动 GC 仍可能影响区间。时钟为 `performance.now`，单位 ms；以下是本机同步经过时间，不是手机线程 CPU、GPU 或物理 FPS。两侧每批实际提交、拾取、名称及提交坐标校验相等。

| 每个精确 view 的绘制次数 | 每侧计时帧数 | 原 r21 平均 / 中位 ms | 候选平均 / 中位 ms | 结果 |
| --- | ---: | ---: | ---: | --- |
| 1 | 384 | 17.736 / 12.738 | 18.646 / 14.718 | 消除本批 2,390,334 个 Point 包装仍无净收益；6 批中 5 批总成本更高。 |
| 2 | 384 | 10.386 / 11.387 | 12.856 / 12.548 | 6 批均更慢；第二次绘制中位 3.008 → 5.907 ms，重复准备抵消目的。 |
| 6 | 432 | 6.062 / 3.024 | 7.211 / 3.004 | 后续命中仍有效，但第二次成本不能收回；6 批总成本均更高。 |

原 r21 手机长按有 15 次 effect 与 27 次 continuation，续帧同步 draw 均值从 r20 的 29.43 ms 降至 25.04 ms，但首 accepted 与整体响应没有改善。该记录没有准备缓存的实际 hit/miss 计数，effect/continuation 也不等同 cache miss/hit；不能据它断言普通 Play 每个精确时刻只绘一次。此次两次情形的退步因此是不可忽略的拒绝依据。

**保留 r21 当前缓存实现，不宣称它已取得普通 Play 净收益。** 本结果排除这次延后建表策略，不证明原列表分配免费，也不证明整段变换无优化空间。下一步仍按实际剩余 owner 成本、当前候选和目标工具条件推进；不扩大为另一轮相邻缓存/关闭变体。

## 保全与未完成范围

原件仅本机：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r24-independent-20261021/sky-draw-preparation/`。`before-sky-star-draw-preparation.ts` 与原测试保留试验前原件；`candidate-source.ts` 是未采用候选，`baseline.mts` / `candidate.mts` 仅添加外部导入与收集数量计数；`complete-scene-bench.mts`、`result.json`、成功日志及生成脚本均保留。一次外部脚本 import 定位错误在实际比较开始前失败，修正后才得到本次结果；不算产品失败或第二次性能采样。

- `result.json`：195,832 B，SHA-256 `dde9480b9c3c292ba55030dca9fcfaea6c4b97e3afd3b2a7633c36942c413828`。
- 完整比较脚本：14,805 B，SHA-256 `ae47e3e0bb3942ebaef7dc07f2bc76be845464134c946f674ce9fcc47ad3d976`。
- 未采用候选源码：5,150 B，SHA-256 `0b978c0860511338962233669b5489718cc8733ed0b9df8572a074c92f56f384`。
- `preservation.json` 的 SHA-256 为 `7e99ebc8ef5e656f8494703f8144fd565c09a1e10a5c68da73896f8473cd0ce4`，保留各原件和比较后源码身份。生产 owner 与试验前副本均为 `6ebacefaf052aa300d2a5d6511999e0ea160041442579e13e6f4b0319a02f7a1`，现有测试均为 `a8d29bd10aab90ab6f664cfca0b2648137cedab3448c5fc287b083c9c89fe52e`，确认两文件未改。

没有操作设备、IDE、服务、GPU renderer、Map、完整构建、预览、Git 写入或上传；没有修改 PLAN/HANDOFF/Context。候选已在开发判别阶段拒绝，不再为其扩大验收。当前生产实现、全部现有 dirty 成果和完整 Goal 义务保留；手机最大视图六字段/正常 Play 的净响应、强引用/native 资源及持续退出结果仍未验收。
