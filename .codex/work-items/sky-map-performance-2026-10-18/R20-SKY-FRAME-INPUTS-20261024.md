# R20 Sky 具名帧已整合，资源职责继续（2026-10-24）

本批沿唯一 [PLAN 的 Refactor 3](PLAN.md#refactor-3-sky-frame-input-publication-and-resource-consumers)，承接 `2c4bb23574fb4a731725e4fa4fad31c2383a35a3`。仅推进不需要 IDE、手机或共享服务的责任；完整 Goal、原 UI → 叠层 → Sky 顺序及正常 Play/OOM 义务保留。

## 边界与当前实施

- Scene 的长位置参数改为 `drawSkyScene(surface, input, ports)`。`sky-scene-frame.ts` 承载 observation/view/Canvas 的小型不可变身份，资源输入 layers/imagery 与可变准备 work 分组；完成、失败回执携同一身份，实际接受仍归原 Canvas 成功 copy writer。
- 身份包含原 report/Context、精确时刻、真实 BSC/已加载 SAO、纯星座 frame、实际视图和 Canvas generation；不沿 pick/accepted 读者持有全部候选 bitmap、constellation bitmap Map 或可变准备 owner。实际图像参与、来源、失效和退休继续由各资源家族原 owner 证明。
- 复用 body 的 bitmap/publication typed binding，保留 IR 层级、目标光学/区域、HiPS、银河与地景各自的缺失/成功/失败含义。未增加另一 renderer、accepted writer、资源缓存、节流或星数上限。
- 本批页面队列、比较、accepted publication、拾取/名称/来源及受影响测试已迁具名身份；资源家族共享组装/比较/完成/live projection仍归后续职责，本文件不认证“资源全消费者重构已完成”。

前置只读审计没有发现已证的工作缓冲覆写历史 accepted 数据：GPU vertices 私有；BSC/SAO 懒填值不复写已发布值；星点过渡复制输入；名称及 Scene 回执逐 attempt 构造；地景 alpha 现生产构造后只读。这是当前所有权事实，不能扩写为无泄漏或已找到 OOM 原因。审计没有启动服务或改源码。

## 本地科学输出等价

复用既有公开 `sky-cpu-profile-input.json`，2,363,222 B、SHA-256 `9ce8706d36586ed4c0cb5e074c6b66efa396ec634320a2c4015bfb4d255011b0`。从精确 parent `2c4bb235` 读取原五个 owner 到独立临时目录，不创建 checkout/worktree、不修改 parent 或冻结候选。既有 [比较入口](scripts/compare-sky-stellar.mts) 对旧外部 baseline 作明确的历史接口适配；生产没有位置参数兼容入口，新 baseline capture 纳入具名帧 owner。

比较实际 parent/current Scene 输出，只排除新加的 `snapshot.identity` admission 元数据；原科学坐标、全部已绘制星点、拾取、名称、来源及完整 legacy points 字段仍逐项比较。结果：

- **exit 0，440 帧，最大数值差 0。** 原 45°/10.8°、冷准备/时间变化/同刻视图三种机制均有非空 BSC 与 SAO 消费者。
- **BSC 全 8,404 行准入，实际加载 SAO 最高 8,565 行**，没有用空场景、减星或仅目录元数据代替真实消费者。
- 最终纯星座 frame 移入 observation 后重新对照，结果为任务 `tmp/sky-frame-equivalence-final-20261024.json`，SHA-256 `a21bfe097d572ee4652e999544112fee1732a97209836d56ae54e58b4dcd0893`。其中 parent renderer 为 `0e2ece9cefdf68f1ae7103d4fb085bece329c727d0b12158faea0f319470c921`，本次实际 renderer 为 `8c8aefa31c1b040291f9f0b9e67bb37e50d67ac83a42c378c9e29d40863d37bc`，identity owner 为 `9c9e13f0a60f7952995c6156ab8be1264d4df7ae7566b703266545597dc55591`。前一中间接口对照保留原文件，不冒最终源身份。

此结果仅覆盖被绑定的源与本地科学输出，不证明图像/native GPU/React/Taro/物理画面、时延收益或 OOM 修复。既有 CPU 工具输出的本机 timings 不作新性能结论。

## 实际工具消费者

[图像 Scene 批次 runner](../cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs)仍是 imagery skill 的现用入口，本批同步其三种生成 Scene 程序到具名输入，逐次构造新 frame，保留真实资源与 publication、收据、退出/重试及回读。`profile-sky-time.mts`、`diagnose-sky-js-heap.mts` 和上述比较器同步具名接口。历史构建/冻结诊断脚本及旧证据保持原身份，不批量改写。

`node --check` 与三种生成 entry 的 esbuild 导入/语法检查已通过，三个 task TypeScript 脚本转译诊断为空。该检查使用 placeholder 输入，不执行图像 Scene、像素验收或私有处理链；没有重新获取、加工或采用天文图像。

worker 的 `sao-scene-client.test.ts` 也是真实 Scene 消费者，已迁具名输入；原星表/倍率/选星/精确时间/observer/版次断言保留，worker cwd 单文件 **1/1** 通过、无 skip。

新 Scene → body completion 依赖边还实际暴露跨 runtime 类型问题：即使将 alias 改成相对路径，publication service 的传输图仍将 Taro globals/timer 类型带入 Node，完整 Mini API noEmit 失败。已把 publication 纯类型移到既有 `sky-body-image-profile.ts`，service re-export 保持 UI 消费者兼容，completion 只依赖纯 owner；没有补 Node 的 Taro 全局声明。修后完整 Mini API workspace noEmit **exit0**，修前/后日志分别为任务 `tmp/miniapi-frame-integration-types-20261024.log` / `tmp/miniapi-frame-integration-types-fixed-20261024.log`。该纯类型变更不改变前述 Scene 科学输出。

新 owner 回归 **4/4** 通过；锁定 Miniapp TS5.9 的 production-only noEmit exit0。该类型检查排除 src tests/shared Scene fixture，不代替整个 workspace。实际日志/metadata在仓库根 `tmp/r20-sky-scene-frame-tests-20261024.log`、`tmp/r20-sky-frame-production-types-20261024.json`，不得误指任务 tmp；原不当根 TS6 的配置警告不算产品失败。

## 整合回归与独审

具名接口受影响29文件 **267/267**、无skip，Miniapp完整锁定TS5.9 noEmit通过；新共享 fixture 使用具名输入/ports及真实 publication 绑定，不恢复旧位置参数。新增实际页面 ports + Canvas lifecycle 的 A/B 回归覆盖非空 accepted 名称/来源/拾取、B准备/拒绝/外来 painted 身份/隐藏/退休及重复完成后 A 事实保持。

新独审未发现本批新增P1/P2；独立跑frame/body/accepted page三文件 **18/18**、worker真实SAO另 **1/1**，均无skip。实际Scene→snapshot→诊断投影探针只输出7个视图字段/263B，没有完整Context、identity或候选资源。结论不覆盖全资源家族重构或目标运行时。

整合首轮运行整个 Sky 模块为 **1119项：1054通过、64失败、1跳过，exit1**（86,917.3ms），保留任务 `tmp/sky-frame-module-integration-20261024.log`。64失败集中在 `sky-manual-gesture.test.ts` 和 `sky-page-navigation-ownership.test.ts` 的旧 accepted frame/缺失 pick ref。现两份真实消费者复用共同 accepted frame/pick 构造器，正向显式发布，陈旧 Context/时间/generation 继续保留旧pair；pick视图从不可变identity派生并保留实际mask。原85测试全部保留，另2个view错配身份反例，限定 **87/87**、无skip，最终Miniapp完整TS5.9 noEmit再次exit0；没有修改生产代码来兼容旧夹具。

原1跳过要求 `CLOUD_SKY_SCIENCE_PUBLICATION_PATH`。已找到历史现有 `output/sdss-science-optical-writer-1002-r1/publication/manifest.json`，18,078B、SHA-256 `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5`、publicationHash `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0`；测试原schema/hash/M:51准入保持。仅为本次子进程绑定该原件，相关页面文件 **6/6**、无skip（`tmp/sky-frame-existing-science-publication-20261024.log`）。这只恢复该 metadata/reader 用例，不证明原始科学图像、私有数据或整个处理链已恢复；不改首次运行的skip历史。

修复后在Miniapp cwd使用 `node ../../tools/run-node.cjs --import tsx --test --test-concurrency=2 'src/features/sky/*.test.ts'`，仅为该子进程显式绑定上述原science publication目录：**1121/1121通过，0失败/取消/跳过，exit0**（86,863.9ms）。完整模块包含手势、Sources、时间、原生生命周期、影像与科学消费者，没有过滤原失败文件；范围是Sky模块，不能冒一次全Miniapp或目标设备验收。日志为任务 `tmp/sky-frame-module-integration-repaired-20261024.log`，SHA-256 `6fc801c38f8e55c5161c09a011b0165cdfde47b7255f5d9f8aafe6a6a7906bda`。

两份追加 fixture 及共享 support 已由另一位新 reviewer 独审：原行为/恢复断言保留，负向旧pair没有自动刷新，实际错配pick反例能拒绝动作；独立两文件 **87/87**、无skip，限定diff检查通过，无该范围未解决P1/P2。没有以“补空字段”或总是current的假stub消除原64个失败。

下一步保存本批检查点，继续所有受影响资源家族的接线/比较/来源/退休共享责任。实际目标 UI、图像画面、源供给和六字段/Play/退出性能仍归原验证记录，不能以本地等价关闭。
