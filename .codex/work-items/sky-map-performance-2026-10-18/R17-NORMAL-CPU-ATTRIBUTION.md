# R17 正常 Sky：手机 CPU 归因

这份样本已经把 CPU 路线从 Map 工具资格推进到真实、非空的正常 Sky 工作。它支持继续调查星表投影和实际页面数据／模板更新成本；**尚未解释进程内存增长，也不支持立即运行另一个 disable 或 scene-memo 变体**。

机器结果见 [R17-NORMAL-CPU-ATTRIBUTION.json](R17-NORMAL-CPU-ATTRIBUTION.json)，完整本次执行及内存事实仍由 [正常基线结果](R17-NORMAL-BASELINE-V3-RESULT.json) 管理。本文不修改 PLAN、产品源码或候选。

## 绑定与有效性

- normal / baseline / generation 25 / probe 3，review-r2；buildSource `10236f0e034ae96d9e31ed5e081a837a53f4cdd128e3f9ac34da6d588f151a4c`。
- 本地完整 bundle 回读 `d4ed31dfe62d4d0268eb3d415d932d0f958615ba6a9ac98e474edc7a13432819`；31 张 hidden maps 均按 manifest 的字节数与 SHA 回读。关键 map 的 `sourcesContent` 另与当前完整源快照绑定。
- 手机绑定来自官方交付、操作者绑定及真实 probe 内嵌源码身份。原结果的 `phoneBundleBytesVerified=false`、`runtimeAppIdVerified=false` 保留；未把本地构建回读提升为手机整包字节回读。
- 官方手机 capsule Start/Stop 得到 6,677,178 B 的 CPU 文件，SHA `50111e1805eb8629928856f5cd0db5c8fecc90bace35066f1c790f406cd59320`；手机原文件保留。9,182 节点、737,165 实际样本，样本／子节点引用全部有效，树无重复父节点。
- 导出覆盖 160,577,639 μs。`timeDeltas` 有 8,561 个负值，最小 −7,189 μs，负值合计 −614,392 μs；首个间隔为 1,259,442 μs。`hitCount` 合计 726,024，较真实 `samples[]` 少 11,141。因此本文主要使用**实际采样次数**，不把 signed interval 或 hitCount 换成精确 CPU 毫秒、暂停时长或利用率。没有补零或静默修正时钟。

## 窗口能确认到什么程度

现有 Start 前／后截图给出 17,184 ms 的操作区间；Play host 输入区间宽 2,861 ms。将 Start 区间与 Stop 区间减去导出时长求交，只能得到以下有条件的时间包络：

| 相对 CPU 文件起点 | 可解释范围 |
| --- | --- |
| 0–41.738 s | 早于 Play，含 profiler 启动和控制操作，不是纯 ready-idle 基线 |
| 41.738–81.794 s | 包含真实 Play 的保守包络，同时含无法排除的 ready／drain 边缘 |
| 81.794–160.578 s | 晚于原产品 Pause，含停止采样菜单操作，不全是安静 drain |

这是 host 截图／输入与 target 导出时长的关联，未建立精确跨时钟同步。Play 可能起于文件的 41.738–61.783 s；由终端回执得到原产品 Pause 在实际 Play 后 20,011 ms。全部不确定性组合后，没有一段能无条件指定为“只处于 Play”。文件 mtime 仅作一致性旁证，未当作停止事件。

14,006 ms 的 probe 窗口实际覆盖 Play 后约 1,010–15,016 ms。**不能将 CPU 全文件或上述 40.056 s 包络除以这 14,006 ms 的次数**。机器结果保留全部窗口边界与证据 hash，无私有绝对时刻。

CPU 自身的粗分箱显示工作集中在文件的 40–70 s：50–60 s 有 53,335 样本，其中 idle 382、GC 3,703、星表投影子树 10,429、微信 `updateValues` 子树 12,271。这里的“非 idle 采样占比”不是物理 CPU 利用率，也未被反过来用作精确 Play 锚点。81.794 s 之后，星表／`updateValues` 样本均为零；剩余主要是 idle 与 profiler 自身采样。

## 可用于下一行动的成本

全文件 idle 620,495，非 idle 116,670。以下各行的 inclusive 都按每个样本去重；子树相互重叠，**不能相加**。这些是样本占比，不是耗时或分配量。

| 调用责任／观察 | 实际样本 | 非 idle 样本占比 | 归因边界 |
| --- | ---: | ---: | --- |
| 微信 `updateValues` 子树 | 24,303 | 20.83% | 实际数据更新／模板求值；不等于物理呈现 |
| `forEachProjected` 子树 | 21,006 | 18.00% | 当前 BSC、SAO 与共享恒星变换责任 |
| BSC `motionAt` self | 3,341 | 2.86% | 唯一当前语义方法、源码内容 hash 与父调用关系相符 |
| `mayProjectVector` 子树 | 1,719 | 1.47% | 唯一当前投影方法；包含于恒星路径 |
| GC 样本 | 7,473 | 6.41% | 全样本占 1.01%；只有采样栈，不是完整 GC 事件／停顿序列 |
| profiler 命名节点 | 9,803 | 8.40% | `CallCollectSample` 加 profiler 启动，观察者成本不能隐藏 |

星表责任可关联到当前快照中的 [共享变换](tmp/r17-normal-baseline-v3-review-r2/source/apps/wechat-miniapp/src/features/sky/sky-stellar-transform.ts)、[BSC 场景](tmp/r17-normal-baseline-v3-review-r2/source/apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts)、[SAO 场景](tmp/r17-normal-baseline-v3-review-r2/source/apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts) 和 [视图投影](tmp/r17-normal-baseline-v3-review-r2/source/apps/wechat-miniapp/src/features/sky/sky-view-projection.ts)。它们的具名方法、真实调用嵌套、当前 AST 和内容绑定的 map 能相互校验。例如 BSC `motionAt` 位于共享 transform → `forEachProjected` → painter 链中，当前 owner 每次取用会构造六项 motion tuple；这标识可调查的 CPU／分配边界，未证明它造成约 1 GB 的增长。

页面路径也有实际成本。`common.app.js` 的热位置 `x` self 7,329、`N` 3,037、`e` 2,897，调用栈中出现生成的 `tmpl_*`，而 `WASubContext` 有 `updateValues`／`_updateValues`。这支持“页面数据／模板更新并不免费”，但不能把该 runtime `common.app.js` 套成 Taro `common.js`，也不能仅凭名称把某个 minified 位置归到具体 React hook 或 TS 行。

probe 的同步 elapsed 与这个结论不冲突：draw／nativePaintOwner 分别有 4,926／4,950 ms 已知 subtotal（480／480 有效，二者嵌套，不相加）；`publishAccepted` 只有 49 个有效、431 个低分辨率未知调用，已知 subtotal 49 ms。这既不是完整 React／模板成本，也不能用来排除 setter 返回后的更新工作。所有统计保留各自窗口、覆盖与 unknown。

## 尚不能直接映射的运行时位置

官方手机再打包生成 `appservice.app.js`、`chunk_0.appservice.js` 等脚本。位置和顺序已改变：

| 方法 | 手机 CPU 坐标（零基） | 当前 Taro 坐标（零基） |
| --- | --- | --- |
| `motionAt` | script 38，line 62，column 447575 | sky/detail/index.js，line 1，column 475009 |
| `mayProjectVector` | script 38，line 62，column 46158 | sky/detail/index.js，line 1，column 49801 |

偏移不是常量；部分方法顺序也不同。本地现有成熟 minifier 的有限纯重排／压缩试验没有复现坐标，未采用任何推测映射。因此本报告只确认经当前代码和调用关系校验的**语义 owner**，保留普通 minified 帧、模板节点和 native wrapper 的精确源码映射缺口。map 给出的 owner 行也不是该热成本的逐语句分布。

当前获准读取的证据没有官方 packaged-runtime → Taro 的 map。只有当精确行会改变下一修复选择时，才从当前官方 Sources／编译 owner 获取这几个精确脚本及其平台映射；这不是重新预览、重建历史版本或新建调试连接的理由。

## 正常负载、内存与代表性

本次 14,006 ms 回执有 480 Scene、480 真实 accepted、480 native callback、5,760 GL draw 提交，失败 0；加载 BSC 8,404 行、SAO 666 行／16 tiles，45°。实际提交 BSC 87,090、SAO 65,203；这些总提交次数不能与加载行数混用。15 s 标量读到 509 次真实且 ready 的 native copy，synthetic 为 0、frozen=false；Page 496 提交／495 完成、pending 1、max pending 2；typed upload 1,018 次／8,228,844 B。

`nativeGlyphCalls` 和 lifetime 都为 0。这并非缓存命中证明；虽然完整 copy／caption 源码路径保留，实际名字／文字负载没有建立，不能将本次排名泛化到文字密集场景。

相同 guarded watch 的报告值（KiB）为：

| 阶段 | 报告 TOTAL PSS | Unknown | Swap PSS |
| --- | ---: | ---: | ---: |
| Play 前 | 3,812,705 | 288,772 | 2,852,732 |
| 观测峰值 | 4,832,573 | 1,275,032 | 2,851,216 |
| 后续 paused drain 末次 | 4,670,489 | 1,102,596 | 2,850,428 |

峰值相对 Play 前 +1,019,868 KiB，末次仍 +857,784 KiB；Unknown 对应 +986,260／+813,824 KiB。PSS、RSS、Swap 保留原口径，不相加。起点本身已有很高的 warm footprint／swap，不能称冷干净基线。**增长确实在这个 CPU profiling 条件下发生，并在有界 Pause 后仍高；CPU 文件不能把它归到 JS heap、native、GPU 或某个 WeakMap。**

## 后续决定

1. **B 的下一有信息量观察仍是正常 Sky 分配采样。** 现有 CPU 已回答“路线能否取得实际 Sky 栈”和“大成本在哪里”，无需重录相同 CPU。继续使用已验证的 ordinary true-debug allocation-sampling 路线，并保留当前原始 memo／publication、完整 BSC／SAO、真实 accepted／copy／资源需求。先区分采样语义和 target 覆盖，再解释 JS 与进程增长的差额；不能把未解释部分命名为 native leak。
2. **A 可从恒星变换与真实数据／模板更新 owner 继续。** 如后续轮到响应性修复，用这里的具名投影边界及实际数据更新成本选一个问题；普通 minified render／memo 热点仍需官方脚本映射。不要从一次 CPU 样本直接改 accepted 状态所有权或宣称优化通过。
3. gen22／23 的负证据仍有效：原生文字测量移除、direct-action 冻结 publication 下仍有增长，不能推翻；它们也不说明正常路径中的页面／模板没有 CPU 成本。gen24 scene-memo 保持 parked，不因完成准备或此次仍增长而自动执行。
4. 若 GUI 分配操作暂需人类，保留该依赖，继续独立 Goal 工作；不补造分配结论，不重试资格未改变的 heavy heap／native 路线，也不把本次 20 s 有界 Pause 当作可持续正常播放最终验收。

复现分析：在仓库根目录运行 `node .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-normal-cpu-attribution.mjs --write`。只读取现有私有证据和当前候选，写本任务 JSON；原始 profile、私有位置、账号及完整 URL 均未进入结果。
