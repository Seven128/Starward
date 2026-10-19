# 给 Web GPT Pro：Starward 云观星时间模块的性能诊断与修复方案研究

材料整理日期：2026-10-19（Asia/Shanghai）。下文实际手机试验发生于 2026-10-18；这是供外部研究使用的证据快照，不是新的执行计划。

请联网深入研究下面两个关联但不同的问题，并给出能交给编码代理执行的方案：

1. **怎样更高效、可靠地完成当前性能分析。** 我们已经做了不少局部测量和隔离试验，但仍未定位连续播放时快速内存增长的具体责任。目标是缩短“提出假设—获取有效证据—确定修复”的周期，避免继续低信息量地逐项试错。
2. **怎样解决云观星时间模块的性能问题。** 包括拖动时间轴时的明显卡顿、时间预览的完整链路成本，以及持续播放时出现的内存增长和退出。最终需要完整、准确、可持续的真实星图响应。

你只有本提示词和仓库地址。下面已嵌入必要背景、当前实现、实际观察与限制；不要假设能读取我们本机的文档、截图、视频或堆文件。请主动审查我们的分析方法和推断，不要把当前怀疑的文字测量当成已证实根因。

## 1. 仓库、版本与材料可见性

- 仓库：https://github.com/Seven128/Starward
- 本次实施分支：codex/remote-main-20260908。
- 整理时该分支 HEAD：944a1d6c9ffed6ede39fa9e6c7b56ff2594d57d2。
- 远端 main 当时仍为：32ec61a4f5321e571d499be6430a09918d65242e。**不要默认 main 已包含本轮时间模块和星表优化。**
- 本轮相关生产代码主要在 124217e166ee5ee7688b29e2ef37086b30ae1fa4，后续 HEAD 另含数据恢复与诊断交付工作。HEAD 的 Product CI、Context 检查已成功；绿色 CI 不代表手机性能通过。
- 后述 generation 15–22 是本机完整编译、官方预览的诊断候选编号，不是 Git 提交。近期诊断代码和结果中有尚未提交的任务文件，远端仓库可能没有。**以下实测摘要是这些未提交观察的独立输入，不要求你先找到本机文件才能分析。**
- 若仓库私有或网页读取受限，明确你实际读到了什么，先据本提示词提出方案。需要补充源码时，只列最少的关键文件/函数或具体日志字段，不要先要求上传全部仓库。
- 以下复用截至 2026-10-18 的实测证据。整理时新文字测量缓存诊断已构建，但没有其真机结果；不得自行补出结果。

这是研究委托，不要求你操作我们的手机、账号、服务或部署。请用中文回答，引用可核验的一手资料、实际源码或官方 issue；明确版本、适用平台和不确定性。

## 2. 产品背景与原始问题

Starward 是观星产品，本次目标是 **微信普通小程序的“云观星”页面**，不是小游戏、浏览器 H5、原生 Android App，也不是微信开发者工具模拟器。

用户从地图上的观测地点进入云观星。页面依据地点、时间、实际星表、天体与地景资料显示天空，支持：

- 拖动/缩放视野、地平线和地景；
- 修改上方年月日时分秒六字段；
- 拖动时间轴预览其它时刻；
- 正常 1× 时间播放和暂停；
- 名称、星座、天体选择/点选及来源阅读；
- 取消时间预览回到已提交时刻，或显式应用新的公共观测 Context。

最初的用户问题是：

- 上方六字段修改时刻后，星图应该像拖动时间轴一样同步预览，而不是只改数字或等待显式提交。
- 时间轴连续拖动有明显卡顿，希望参考 Stellarium 等成熟实现，在不损失星数、精度、细节和点选准确性的前提下优化。
- 同批还有地景跨越地平线/背面拖动的异常转换和淡灰背面方向层问题。相应几何修复已实现，但本次研究主线是时间模块性能；不要扩大成整个产品重设计。

**当前的两个问题必须区分：**

A. 时间变化的交互响应和渲染成本：请求时刻到真正画出该时刻的延迟、连续拖动是否顺畅、是否重复准备了不会显示的中间状态。

B. 在真机正常 1× Play 的验证中，发现进程内存快速增长，部分运行随后退出回微信。这是当前妨碍持续播放验收的严重问题。它是否与原来的拖动卡顿同源，尚未证实。

不能用解决 A 的局部 CPU 提速，宣称 B 已解决；也不能假设查明 B 后 A 自然全部消失。

## 3. 平台、工具和运行条件

- 前端：Taro 4.2.1、React 18.3.1，实际安装的 react-reconciler 为 0.29.0。
- 目标：一台已授权、无线 ADB 配对可用的真实 Android 手机，运行微信普通小程序。
- 开发机器：Windows；已安装官方微信开发者工具 2.02.2610092。
- 当前实际可用：官方整包 auto-preview、真机截图/录屏/输入、限定进程的 Android 内存读取。
- 早先部分 remote-debug SDK/MCP 连接不稳定；这不是“真机调试永久不可用”的结论。能否在当前普通小程序上获得足够的 JS/native 分配采样、正确 isolate 的快照、可靠 CPU profiler，仍需按实际支持能力核实。
- 手机型号、Android API、微信客户端和实际基础库版本、进程 debuggable/profileable 条件等，没有完整放入这份材料。若工具依赖这些条件，请列出最小核验方法，不要自行假设已 root、可 run-as 或能给生产微信注入 profiler。
- 主包接近平台限制：最新诊断主包 2,016,773 B，距 2,097,152 B 约余 80,379 B。引入大型分析/渲染依赖需要考虑分包和实际运行位置。
- 只有当前 Android 条件的观察；不能外推 iOS。
- 同一账号有应保护的本地/内存状态。不能清微信存储、重置账号或重启保存旧业务状态的服务来制造干净基线。允许准备有边界、可恢复的开发条件。
- 原始堆、截图和私有资料只在本机保存。研究不能要求上传未脱敏堆、账号资料、凭证或完整设备日志。

## 4. 当前时间与渲染架构

### 4.1 时间状态与几何供给

六字段、时间轴和播放已经接入同一个 observation-time owner。语义上至少区分：

1. 已提交的公共 Context 时刻；
2. 用户当前请求/预览的时刻；
3. 已有合法几何供给并完成准备的时刻；
4. 真正完成原生呈现和页面发布的时刻。

取消/关闭预览、hide、账号或 Context 变化、迟到响应均有退休/绑定保护。显式 Apply 才提交公共 Context；拖动或播放不能每帧写公共状态。

时间模型原有范围是约 24 小时、49 个 knot、最大 30 分钟间隔。客户端在模型覆盖内评估所请求的真实时间；跨出覆盖时，新增的只读 geometry 接口按 Context/地点/权限/来源取得窗口，不能外推过期模型或冒用旧报告。

- 当前 49-knot 模型实测约 226,698 B。
- 曾对既有 builder 做过 5-knot/2 小时模型试验，约 23,451 B；更小窗口还带来相邻窗口、时间轴覆盖和取消恢复责任。
- 目前没有目标网络证据证明必须更换窗口策略，因此没有直接采用小窗口。
- 几何预览不等于获得新的天气、事件建议或其它数据源。
- 原星表/深空图像注册锚点与新模型覆盖起点分别管理，不能跨日后错误重绑。
- 本地 CPU 初测中，时间模型插值本身约 0.13–0.17 ms 中位数；这不是当前最明显的已测热点，也不是手机测量。

正常 Play 使用一条约 16 ms 的 interval 调用 advanceSkyTime，时间进度按实际经过时间保持 1×；不是按完成帧数累加固定秒数。每次 render 不应重复创建独立播放循环；effect 有清理和状态保护。

当前相关代码简化如下，完整依赖以仓库为准：

~~~ts
useEffect(() => {
  if (!timePlaying) return;
  if (/* 页面/Context/保存/报告状态不再允许播放 */) {
    setTimeIntent(observationTime.pause());
    return;
  }
  const timer = setInterval(advanceSkyTime, 16);
  return () => clearInterval(timer);
}, [/* 播放、可见性、Context 和有效数据绑定 */]);
~~~

播放/拖动期间已经禁用逐时刻的 fine-target 建议查询；不能先假设每一帧都在请求后端。geometry window、星表、按视野 SAO 和资源读取各有现存 owner。

### 4.2 实际星表规模

- BSC 基础发布：8,404 行。
- SAO v2 总发布：246,280 行、826 个 tile。
- SAO 按实际视野选择和加载；不是每帧扫描或绘制全部 246,280 行。
- 窄视野真机样本实际加载 6,519 行 SAO、19 个 tile，且有非零提交/点选对象。
- 其它本地相同机制样本曾加载最多 8,565 行 SAO、24 个 tile。
- 必须分清总发布行数、实际已加载候选、经过视野/亮度判定后提交的对象，以及最终点选/接受对象数。不能用“只有 8,404 星”描述完整负载。

### 4.3 页面到显示的路径

目前不是把整个页面直接交给一个浏览器 WebGL canvas：

~~~text
六字段 / ruler / Play 的时间 intent
  → 当前合法 time-model / 必要时 geometry-window
  → 当前时刻 report、BSC 和已加载 SAO、星座等准备
  → React 页面状态与 frame demand
  → 现有 Canvas lifecycle：只保留 latest、单 writer、native RAF
  → drawSkyScene：天体、星图、地景、图像、名称布局等
  → 离屏 WebGL renderer
  → gl.flush()
  → 显示 Canvas2D.drawImage(离屏 WebGL canvas, 全幅)
  → Canvas2D captions；选择标记层/回退标记
  → attempt.publish：提交转场/名称、已绘快照、presented state
  → React/Taro → 原始 Page.setData / callback
~~~

- 离屏 WebGL 创建使用 preserveDrawingBuffer: true。
- 原生画布有独立 generation、尺寸/DPR、hide/dispose、迟到 callback 的保护。
- 现有 writer 已有 latest-frame/coalescing 机制；请检查实际效果后再建议新增一套 RAF/队列。
- CPU Scene 完成、调用 drawImage 返回、setData 回调、应用记录 accepted frame 与物理屏幕 scanout，是不同完成点。现在不能直接量到每个 physical presented frame。
- 页面也保留已接受的同帧对象、名称、来源/资源参与结果，供点选与 Sources 使用。把画布更新和这些语义拆开时不能造成显示一个时刻却点选另一个时刻。

### 4.4 高频文字路径

当前名称布局会对 selected、targets、catalog 和星座候选调用 surface.measureText。测量往往发生在碰撞、地景遮挡或最大显示数量的判断之前。

~~~ts
measureText(text, font, lineHeight, letterSpacing = 0) {
  if (disposed || !context.measureText) throw new Error(...);
  context.save();
  try {
    context.font = font;
    context.textAlign = "left";
    context.textBaseline = "middle";
    // spacing=0：测完整文本。
    // spacing>0：Array.from(text)，逐 code point 调 native measureText，
    // 再按原间距合成 width 和边界。
    // 校验并转换成 width/left/right/ascent/descent 五个普通数值。
    return parsedNumericMetrics;
  } finally {
    context.restore();
  }
}
~~~

普通 present 为居中/手工字距绘制最终 captions 时，还会再次调用 native measureText。

现有代码没有测量结果缓存。成功显示 catalog 最多 8 个、星座最多 6 个，并不代表只测 8/6 个：拒绝的候选也可能已被测量；非零间距星座还逐字测量。

只读检查未发现应用长期存储原生 TextMetrics；返回的是五个普通数值。也未发现常规路径 save/restore 未配对。**没有缓存、调用多，不等于已证明泄漏。**

### 4.5 发布和生命周期的源码核查

每次实际完成的 Scene 仍会 commit transitions/ready-images/name layout、替换 painted snapshot、更新 presented frame/camera 等状态。播放改变 frameAt，单凭“同一帧返回旧 state”的比较通常不能避免这部分更新。

相关 command setter 的实际形式是：

~~~ts
const next = typeof update === "function"
  ? update(current.current)
  : update;
current.current = next;
write(() => next);
~~~

这表示原 functional updater 当场求值，React 队列里是捕获 next 的闭包，不能把它误说成把全部 previous updater 链主动存入 next。实际 queued/skipped React 更新是否被及时消费，尚无手机分配证据。

只读检查还发现：

- landscape.previous 下游只用于本帧判断；未发现逐帧 previous 对象链。
- 名称、星点和图像转场 owner 替换当前集合，未发现 append 全部历史帧。
- 星表/SAO 当前 transform 与缓存没有明显保留全历史时刻。
- 图像加载 hook 主要按 canvas generation、publication/hash、当前需求管理；未找到必然随 frameAt 每帧重建/解码所有位图的直接路径。但尚无完整真机 start/decode/release 计数。
- Taro 4.2.1 的实际事件实现更新 handler 时先移除旧 wrapper，再加入新 wrapper；React props 写入固定属性。未发现“每次 render 都永久追加事件 handler”这一具体机制。
- RAF scheduler 每次创建 run/cancel 闭包和 watchdog；正常完成会取消 watchdog，源码只保留当前 scheduled/latest/busy 等状态。原生 callback registry 和其它 VM 是否真正释放，不能靠该源码检查证明。

这些是限定源码事实，不能替代 target heap/allocator 观察。

## 5. 已经完成的计算优化，以及它尚未证明什么

我们已参考固定版本的 Stellarium Web 源码，采用了适合现有 owner 的部分思路：

- 将不可变 catalogue/proper motion 与当前时刻变换、视野投影分开。
- 共用 BSC/SAO 精确方向变换。
- 先按原亮度和保守向量视野测试排除不可能贡献的对象，再对存活者物化原来的角度和投影。
- 保留原始 proper-motion、时刻、数学公式和最终 projector；向量测试本身不授予绘制/点选资格。
- 同时保留完整 legacy points 消费者，避免某个列表/名称/来源路径被减内容。
- 没有新增历史时刻无限缓存、减星、近似时刻、强制 FPS cap 或更换 renderer。

本地相同输入的完整 CPU 路径比较：

| 视野 / 场景 | 优化前 median / p95 | 优化后 median / p95 |
| --- | ---: | ---: |
| 45° 冷 CPU 准备 | 28.65 / 41.16 ms | 23.41 / 36.42 ms |
| 45° 时刻变化 | 8.27 / 12.44 ms | 6.12 / 11.26 ms |
| 45° 同时刻相机变化 | 1.52 / 2.10 ms | 1.51 / 1.76 ms |
| 10.8° 冷 CPU 准备 | 52.47 / 59.16 ms | 47.61 / 54.61 ms |
| 10.8° 时刻变化 | 11.50 / 17.81 ms | 7.91 / 12.15 ms |
| 10.8° 同时刻相机变化 | 2.16 / 4.55 ms | 2.05 / 3.92 ms |

440 个比较帧中的提交/点选/名称身份与相关完整数值相同；若干最终帧还比较完整 BSC/SAO 角数组，最大数值差为 0。

限制：

- 是本地 CPU、内存内数据，不含真实 React/Taro/native canvas/图片和网络。
- 冷准备是内存内解码/准入，不是手机网络冷启动。
- 延后计算会把工作从 eager resolver 移到 draw，不能把嵌套 stage 相加或只挑 resolver 的提升。
- 小样本 p95 不等于生产分位数。

随后 Android 做了两侧各四种 45 秒窗口，共八个有效 camera/ruler 样本。两侧都有现行时间/geometry/ruler 功能，主要差别是星表优化：

| 机制 | 优化前 prepared / accepted | 优化后 prepared / accepted | 前 draw p50 / p95 | 后 draw p50 / p95 |
| --- | ---: | ---: | ---: | ---: |
| 45° camera | 271 / 84 | 263 / 79 | 6 / 10 ms | 7 / 11 ms |
| 45° ruler | 99 / 68 | 98 / 67 | 3 / 10 ms | 4 / 14 ms |
| 10.8° camera | 265 / 93 | 266 / 98 | 7 / 11 ms | 6 / 8 ms |
| 10.8° ruler | 84 / 62 | 91 / 68 | 2 / 14 ms | 2 / 13 ms |

所有样本保留 8,404 BSC；两侧窄 camera 都有真实 6,519 SAO/19 tiles。宽 camera 瞬时已加载 SAO 最大数略有不同，手势实际调度的中间帧也不同，所以不是逐帧负载严格相同的因果 A/B。

结论只能是：局部计算优化有作用，但全链路结果混合，宽视野还出现较慢样本；没有建立整体 FPS 改善。连续 Play 在两侧均出现过退出，无法完成原本播放比较。

**这里的 baseline 不是“整个时间模块改造之前的老产品”。两侧共用现行时间 UI/供给/调度。两侧都失败能反对“仅由新星表优化导致”的简单解释，不能证明全部本轮时间改造之前就有同一故障。**

## 6. 当前严重现象：持续播放内存增长与退出

正常 1× Play 可推进实际画面和时刻，随后一些运行返回微信 Launcher。

- 三次较早运行最后观察到的产品播放时间分别约为 21、46、59 秒；这是最后观察点，不是精确崩溃阈值。
- 有 signal/native crash 相关 ApplicationExitInfo，尚无可靠调用栈/tombstone 或确认的 OOM 归因。部分后续退出记录只能按时间邻近关联；设置切换也会重启应用，不能混作播放崩溃。
- 某次临近退出截图出现日期/时间部分字形缺失；native composition、资源压力与截图边界未区分，不能当根因证据。
- 目前没有成功完成普通候选长期稳定播放的验收。

下面是已做试验，请据此判断下一步信息价值，不要原样再跑一轮。

| 试验 | 改动与保留边界 | 观察 | 允许的结论 |
| --- | --- | --- | --- |
| generation 17：整幅合成 copy | 在既有 full-frame drawImage 周围使用 scoped compositing copy，保恢复 | 内存仍增长并退出；早期进程 slot 关联证据较弱 | 该改法不是充分修复；不能精确归因 |
| generation 18：只抑制后续整幅 copy | 首次 copy 后不再 WebGL→2D 全幅复制；继续正常 GL、caption/reticle、CPU、真实页面发布 | 约 35 秒正常 Pause；前台进程内存仍显著增长 | 重复全幅 copy 不是该诊断增长的必要条件；不是正常显示通过 |
| generation 19：finish | 恢复正常 copy；gl.finish 代替 flush，真实 accepted 路径保留 | 有效约 14 秒、420 次实际 copy；仍增长，draw 样本变慢 | finish 不是充分修复；不采用 |
| generation 20：Page/GL 观察 | 正常 Scene/GL/copy/发布，数值化统计 raw Page setData 和实际 typed upload | 详见下节；callback 未持续积压，debug 关掉后仍增长/退出 | 未重现所观测 raw Page 的无限 ack backlog；debug-off 不充分 |
| 本地 Node 强保留检查 | 完整实际 CPU Scene/BSC/SAO、1,920 帧，局部 forced GC 观察 | retained heap 约 26.09→25.50 MB，平稳 | 仅覆盖该本地路径；没有真实 React/native/图片及有效非空名字路径，不能清除真机 JS 嫌疑 |
| 真机 heap snapshot | 原生开发菜单导出，后述详述 | 只有一份可用初始快照，第二次未得到新 bytes且干扰很大 | 无法得出播放前后 JS 强保留结论 |
| generation 21：CPU/page-only | 首个 ready native copy+publish 后冻结；保完整 CPU Scene 和真实 React/Taro publication，替换 GPU renderer 为 synthetic facade；后续 GL/native present/renderer staging 停止 | 有效 13,998 ms、490 次完整 Scene；GPU/accepted copy 均 0；约 20 秒后原正常 Pause，仍快速增长 | 这些被移除的后续工作不是此诊断增长的必要条件；仍不是具体 allocator 定位 |

所有 frozen/synthetic 版本都显著标识、禁止 Apply/点选/Sources，不能作正常产品图像/来源一致性验收。

这些隔离改变了调度、分配和 native 工作的组合；CPU facade 还给图像/readiness 调用返回 synthetic 结果。即使某项不再必要，也不能宣告普通路径中该模块绝无其它问题，更不能忽略诊断本身可能改变 flush/GC 节奏。任何最终修复必须返回完整正常路径验证。

### 6.1 Page/GL 实测的准确含义

generation 20 正常路径，在开启 debug 时：

- 约 14 秒窗口有 490 次实际 copy/Scene，2,450 个 GL draw submission。
- 同一轮从实际 Play 到约 15 秒的标量窗口：raw Page setData 500 次、callback 500 次，pending 0、最大 pending 2。
- 后来 Pause/关闭预览后为 1,403/1,403，最大 pending 3。
- 早期 callback 最大延迟 75 ms，后续观察最大 493 ms；不能说每次都快。
- 只对前 16 次 payload 做 UTF-8 大小抽样：总 18,700 B、最大 1,256 B；不是全部桥流量。
- 实际 bufferData 早期 516 次、累计 typed upload 5,656,896 B、单次最大 11,016 B。这是流量，不是 retained bytes，也不是所有 texture/native 分配。

关闭 debug 并经正常预览重开后：

- 有效 13,988 ms、489 次实际 copy/Scene、2,445 个 GL draw。
- 实际前台进程第一次到最后保留的内存样本：TOTAL PSS 840,538→2,034,905 KiB，Unknown 287,536→1,427,640 KiB，Swap PSS 40 KiB；采样跨度约 39.5 秒，GL/EGL mtrack 接近稳定。
- 最后见到约 31 秒“播放中”，随后 guarded Pause 因应用不在目标前台而拒绝发送。不能写成成功暂停，也不能据此给精确退出时刻。
- debug-off 运行没有取得完整播放后 Page 标量截图，不能套用上一轮 debug-on 的所有 Page 数字。

**重要口径：探针 K 是 raw setData payload 的 enumerable-own-key 数量/最大值/失败数，不是 React commit 次数、commit duration 或 render 次数。整理时已纠正一处任务 JSON 的误命名。我们目前没有据此获得 React commit 统计。**

setData ack=0 backlog 不代表 native/渲染队列已清空，也不代表 React skipped update/Fiber 已释放。

### 6.2 最有区分力的新结果：generation 21

同样 10.8°、真实 1× Play，debug/性能浮层关闭：

- 初始 ready copy 共 1 次，之后整个 native present 跳过，GPU upload/draw submission 为 0。
- 13,998 ms 的有效窗口完成 490 次完整 CPU Scene，保留 8,404 BSC、6,519 实际 SAO、19 tiles。
- 累计提交到 synthetic Scene 的 BSC/SAO 对象分别为 4,900/144,345。
- accepted copy 为 0 是诊断设计要求，不是空 Scene。
- Page 在早期导出时 492 次提交/492 次 callback，pending 0、最大 2；Pause/cancel 后 672/672。
- 诊断在实际 Play 后 15 秒导出，20 秒通过当前 runStartAt 和原 guard 调用产品原 Pause。实际屏幕停在 04:30:19，之后取消预览，无 Apply。
- 覆盖播放前、播放中和暂停后的前台内存观察：第一点 TOTAL PSS 958,063 KiB、Unknown 348,776 KiB，末点 1,873,329/1,220,568 KiB，Swap PSS 仍为 40 KiB。
- 内存 helper 从 Play 之前启动，整个观察约 47 秒，不能直接把 47 秒或 14 秒当作精确的内存增长区间计算斜率。

保留下来的边界包括：真实 surface.measureText 的 save/font/native measure/restore、native Canvas RAF、真实 React/Taro publication、原图像加载生命周期、完整 CPU Scene 与其消费者。

## 7. 当前性能分析为什么推进得慢

请把这一节作为第一项研究的主要问题，而不是只给“用 profiler”“加缓存”这类建议。

### 7.1 内存增长已经看到，但没有定位到分配责任

我们在正确前台 Activity 的 ProcessRecord 中绑定实际 Appbrand PID/名称，并再次核验 meminfo header。不能靠排序后第一个 appbrand slot 猜当前进程。

当前能稳定取得：

- TOTAL PSS、RSS、Swap PSS；
- Native Heap、Dalvik、Unknown、Other mmap、so mmap；
- GL/EGL mtrack 与 App Summary 若干字段。

这些字段不能直接回答是哪个 JS isolate、V8 external backing store、Canvas/字体、宿主回调、图像、native allocator 或 GPU/driver 保留了内存。Unknown/Private Other 不等于 JS；GL mtrack 平稳也不能排除所有图形/native 分配。

有些开启 profiler 的样本大量 swapping，TOTAL PSS 甚至高于 RSS；应核对当前 Android meminfo 的统计/汇总语义，不能把所有数值都直接当物理 DRAM。我们未建立可靠的 allocator stack 或随时间的对象归属。

### 7.2 真机堆快照只有一份，且观测干扰很大

实际普通小程序原生菜单确实存在 Take Heap Snapshot，也见到 CPU profiler/Force GC 等项，但“菜单存在”不证明都能低成本可靠使用。

一次初始快照成功：

- 导出文件 87,166,304 B；
- 解析后 1,126,865 nodes、4,245,198 edges；
- self_size 合计 71,087,332 B，约 67.79 MiB；
- 23 个 JSArrayBufferData 类型节点共 2,352,983 B；记录中的 Float32Array 对象 3 个；
- 只对这份初始快照作了结构校验和数值分析。

随后实际正常播放约 29 秒并成功 Pause，再点第二次 snapshot，但有界核验始终没得到不同文件，原 bytes/hash/mtime 未变化。因此没有有效 after snapshot，不能做 survivor/dominator diff。

第二次导出尝试后 native/Swap 大幅变化，PSS 约 3,848,619 KiB、Swap 2,168,576 KiB，profiler 本身或未结束工作构成实质干扰。该实验已经停止，并正常关闭性能浮层；没有把强制 GC 用作产品修复。

另外：尚未独立证明这个快照完整覆盖实际负载所在的全部 VM/isolate/宿主 external 分配。初始 V8 self_size 小，不能推出增长不在 JS，更不能覆盖整个进程。

### 7.3 分阶段计量没有真正闭合成输入到屏幕的统一时间线

已有 time intent、prepared request、paint attempt、native callback、Scene finish、copy/accepted 等计数；部分 stage 有 CPU duration。

仍有问题：

- 一些探针在目标手机退回 Date.now，亚毫秒工作显示 0。
- 若干 stage 嵌套，不能简单相加。
- 意图、标量、早期 receipt、内存 helper 的起止窗口不同。
- 有时存的是从 surface 冻结开始的累计值，有时是 Play 后 reset 的窗口值。
- accepted copy 是应用协议，不等于 physical scanout；录屏编码 cadence 也不是 app FPS。
- 当播放提前退出，旧的 45 秒只存内存方案会丢失结果。现已改为约 15 秒导出严格小 payload，且约 20 秒正常 Pause 的有界诊断；这是实验终止，不是产品限时。
- 单次每侧、手势中间事件和 tile 到达不同，不能把 p95、总耗时或帧数当严格同负载对比。

我们需要统一最少的事件/时钟/工作量口径，而不是无限新增探针。

### 7.4 每轮隔离的工具成本高，假设排除仍未闭环

每个候选必须来自完整源码构建，通过正常官方预览与绑定，不能改生成 JS 偷换条件。手机输入前要求有新鲜、已看过的目标截图，原生设置有些会重启应用。逐个工具调用的延迟曾让预期短试验持续更久，或错过正常 Pause。

我们已经复用了 bounded Play/export/Pause，但仍经过多个“改一个分支—构建—同步—回到相同画面—测量”的循环。要研究怎样在保留来源真实性、账号保护和正常产品路径的前提下：

- 优先选择信息增益最高的少数试验；
- 一次建立可复用、最小的观察入口，而不是每个假设复制一套脚本/测试/交接；
- 将宿主工具延迟与产品响应分开；
- 在具体能力失败后及时采用有判别力的 fallback；
- 得到足够证据后直接修复和验证，停止无新增信息的确认性重复。

### 7.5 本地和模拟证据容易造成过早结论

本地 Node 强保留平稳、模拟器平稳、静态生命周期看似正确、setData callback 全返回、构建/CI 通过，均不能替代真实目标分配/呈现行为。

我们需要你审查：现在的隔离方案是否还保留了关键负载，是否引入新的 command/flush/GC 行为；现有“排除”中哪些只是降低了某种可能性，哪些确实有足够反事实证据。

## 8. 已准备但还没有结果的下一项试验

generation 22 是 generation 21 的单一边界后继：

- 仍是 CPU/page-only 的 frozen/synthetic 诊断。
- 只在冻结后给 surface.measureText 加 per-surface、256 项 LRU 的精确数值缓存。
- key 含完整 font、text、lineHeight、letterSpacing。
- 命中发生在 native save/font/measure/restore 之前；miss 完整执行旧测量。
- 只缓存五个成功有限数值，不保存原生 TextMetrics；失败/非法输入不缓存。
- 仅对当前两个已确认合法字体声明缓存，其他 font 原样直通。
- dispose/新 surface 不共享；返回副本避免调用方突变污染。
- 256 是有界诊断参数，不是已选定的产品预算。
- 记录观察期/生命周期 hits、misses、evictions、实际 native measureText 次数、entries。
- Play 只 reset 观察计数，不清 cache；保持全部 Scene、React 发布、native RAF、图像生命周期、相同 15 秒导出/20 秒正常 Pause。
- facade、Page observer、page、GPU、probe runtime 与前一诊断逐字节相同。
- 整包、源码/双 bundle 回读和聚焦行为检查通过。诊断快照全量 tsc 的 19 条错误与父快照一致，新改动文件 0 错误；这不是把全量 tsc 声称通过。
- 整理时 feedback 已生成 generation 22，但 device session 尚未重新绑定，没有有效手机缓存命中/内存结果。

如果这一试验增长消失，也只能先定位“重复 native measurement 和其状态操作整体”，还不能直接分清 measureText、font、save/restore、短命 JS 分配或调度/GC；必须恢复正常 GPU/copy/caption/accepted 路径。

如果增长仍在且原生测量确实接近零，再转向剩余边界；如果大量 miss/eviction，不能当作有效排除。请评价这一步是否仍是最有价值的下一步，或给出更优、有证据支持的替代，不必迁就已准备的实现。

## 9. 第一项研究：请提出高效性能分析方案

请至少回答这些具体问题：

1. **最短诊断路线是什么？** 先修哪个计量缺口、先区分哪类机制，才能尽快从“增长存在”转为“谁在保留/分配什么”？给一棵有分支条件的简短决策树，优先列接下来最多三个高信息量动作。
2. **工具在当前平台上真的能用吗？** 对微信普通小程序真机的官方 Performance/CPU/Heap、远程调试、Android Perfetto/heapprofd/simpleperf、进程映射/内存统计等合适候选，给能力矩阵：观察对象、前提、权限、版本、能定位什么、不能定位什么、开销和首个验证动作。不是要求把这些全部跑一遍。
3. **如何验证抓到的是正确进程和正确 isolate/执行层？** 区分微信 Appbrand、逻辑层、渲染层、Canvas/native、JS external/backing store；如果某工具对当前生产微信/非 profileable 进程根本不适用，要直接说明可行 fallback。
4. **不靠第二份重型 snapshot，如何定位？** 研究低扰动 allocation sampling、有限对象/资源生命周期计数、分配/存活的间接对照、native trace 等可行路径。不要假设 Chrome H5 的 performance.memory 在普通 WEAPP 可用。
5. **怎样最小化观察本身的影响？** 给一次有效试验的 workload/起止/暖机/暂停后观察设计，如何避免 dump、console、JSON、视频、profiler、GC/Swap 改变结论。比较按每秒、每次真实 Scene、每次特定 native 调用的增长有什么意义和陷阱。
6. **最小 trace schema 和输出是什么？** 要能关联 intent→prepare→paint→copy/publish→bridge，标出嵌套/重叠和取消；避免每帧全量序列化或存完整状态。说明哪些 duration/counter 属于同一窗口，哪些仅是辅助。
7. **怎样降低每轮开发工具成本？** 在完整源码/官方预览/有效绑定的边界内，建议可复用诊断 owner、有限配置或入口、预置场景和有界正常 Pause；避免第二产品状态机或几十个长期 flags。
8. 每个建议的实验都必须写清：要否证的假设、只改变什么、保留什么、需要什么数据、结果 A/B 各如何影响下一步、何时停止。不要把“增长消失”一概等同于“已找到唯一根因”。
9. 请指出现有方法中最耗时且信息量低的部分，以及应该立即停止重复的试验；同时指出哪些已有证据足够复用。

若需要先补信息，请最多给 3–5 项对路径选择真正关键的缺口，并解释其决策作用。不要以信息不全为由只返回一个问卷。

## 10. 第二项研究：请提出时间模块性能修复方案

请将以下问题作为候选责任边界，而不是预设答案：

- 高频时间 intent、React render/commit、准备工作、native RAF 是否存在多个节拍或重复准备？现有 coalescing 如何实测有效？
- 能否让每帧渲染所需的高频内部状态留在已有 renderer/state owner，将真正需要变化的 UI 发布到 React/Taro？应如何保持选择/来源/时间标签与 accepted Scene 一致，避免另建 competing state？
- 在保留 1× 时钟和最新 intent 的前提下，如何合并尚未开始绘制的中间请求，而不是任意限帧/跳过应呈现的用户终态？
- 文字度量、排版、glyph advances、碰撞判定能在哪个 owner 精确复用？normal layout 和 actual caption painting 的真实消费者如何共同接入？字体加载、DPR/尺寸、spacing、失败和 disposal 的失效语义是什么？
- per-frame report/数组/闭包/React state 的分配是否值得优化？怎样先测 allocation rate 和 retained growth，再决定 buffer reuse、可变 scratch 或更清晰的 lifetime？怎样避免将仍被 accepted frame/异步消费者引用的数组改坏？
- WebGL buffer/texture lifetime、bufferData/bufferSubData、全幅 Canvas2D copy、preserveDrawingBuffer、image callback/RAF callback 的成熟做法有哪些真正适用于此平台？结合现有反事实结果，哪些应后置，不要重新把全部希望押在已失败的 copy/finish 上。
- 基于精确星位/模型语义，Stellarium 或其它成熟星图引擎在不可变 catalogue、时间变换、视野筛选、投影、标签、调度和资源生命周期方面还有哪些适用机制？
- worker/WASM、小几何窗口、改变原生显示路径等更大改动如果确有价值，应在哪个测量条件下才值得采用？说明平台支持、拷贝/序列化成本、包体/维护成本及迁移范围，不默认它们比现有 JS 快。
- 反复播放内存问题和拖动延迟如果最终分属两种机制，如何分别收口，不把一个“综合重构”当作所有问题的答案？

请给出优先顺序清楚的最小修复方案，以及有明确触发条件的下一层结构调整。每项说明落在哪个现有 owner、迁移哪些实际消费者、取消/隐藏/过期/失败/资源释放怎样保持、预期改善哪个已测指标、如何证伪。

## 11. 不可牺牲的结果与验收要求

- 不减少原本应该显示的星、实际加载 SAO、亮度/细节或点选准确性。
- 不用冻结画面、任意 FPS cap、强制 GC、周期重启、永久粗糙星位或错用旧时刻掩盖问题。
- 不把自然显示亮度阈值、保守视野剔除与人为缩减内容混淆。
- 不把请求的时刻数字当作已经实际呈现的时刻。
- 取消预览恢复已提交状态；只有显式 Apply 才提交；迟到结果不能覆盖新 Context/请求。
- 星点、地景、名称、选择、资源/来源必须在其声明范围内绑定同一 accepted frame。
- 支持实际 BSC+SAO 正常与失败/恢复路径，按不同机制选择代表场景，不做无边界组合矩阵。
- 最终回到完整普通候选，验证真实连续播放、实际时间轴拖动、六字段预览、暂停/取消/Apply、hide/返回及资源回收，不能用 synthetic 诊断通过替代。
- 保留相机手势性能：已有宽 camera 结果混合，修复后需针对该风险作有界同条件复核。
- 必须测真实结果和资源成本，不能只看源代码、测试数量、平均 CPU、某一层 p95 或编译成功。
- 可以挑战当前架构，但如果要更换引擎/平台或大范围重写，请单列必要证据、迁移成本和新授权边界；不要将它伪装成已经决定的小修复。
- 不添加付费服务、扩大数据权限、清账号状态或进行生产部署。

## 12. 仓库阅读导航与已用研究

如果可以读仓库，请优先按责任读这些文件；不要先通读全部代码或重做数据恢复：

| 责任 | 路径/入口 |
| --- | --- |
| 页面时间/准备/发布/实际消费者 | apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx |
| 公共时间语义/窗口使用 | 同目录 sky-observation-time.ts、sky-time-presentation.ts、use-sky-time-geometry.ts |
| Canvas 生命周期和 RAF | 同目录 sky-canvas-lifecycle.ts |
| 原生显示/文字/资源退休 | 同目录 sky-canvas-surface.ts |
| Scene 与 GPU | 同目录 sky-scene-render.ts、sky-gpu-renderer.ts |
| BSC/SAO | 同目录 sky-stellar-transform.ts、sky-stellar-scene.ts、sky-stellar-supplement-scene.ts、sky-stellar-tile-selection.ts；packages/astronomy-core 的 stellar-vectors |
| 名称/标签/状态 | 同目录 sky-name-layout.ts、sky-label-presentation.ts、sky-command-state.ts |
| 图像/地景生命周期 | 同目录 use-sky-artwork、sky-artwork-loader、sky-artwork-request、sky-landscape-* 等实际 imports |
| 后端 geometry / 权限 | workers/miniapp-api/src 中 sky geometry endpoint、time-model、Context/授权 owner，按路由及当前调用搜索 |
| 方案与证据索引 | .codex/work-items/sky-map-performance-2026-10-18/PLAN.md、INDEX.md；近期本地诊断不保证已推送 |

已有 Stellarium 研究不是零：

- 固定 revision 7d45c8fec393fbbabadcefa935794290fc39723d。
- observer.c：https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/observer.c
- stars.c：https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/stars.c
- 已研究 observer unchanged-work hash、fast/full update 区分、tile/亮度早剔除和成功投影后绘制等思路，且已有上述精确向量实现。
- 这不是采纳其商业 mobile App、原引擎或 GPL 源码依赖；不能凭项目名称推断目标微信兼容或许可已解决。请在已有成果基础上寻找真正缺失的机制，而不是再次只建议“参考 Stellarium”。

## 13. 希望你的最终输出

请先给出你对当前问题结构的判断，然后分别输出两条研究结论。至少包含：

1. **现有证据审计**：已知、仍不能推断、最关键缺口；指出任何你认为不成立或过强的当前结论。
2. **诊断工具能力表**：按当前 WEAPP/Android 条件可用、需验证、不可直接用分类，给官方依据与版本/权限边界。
3. **优先级最高的三个诊断动作和决策树**：每项能改变什么决策，如何快速确认工具/实验有效，何时停。
4. **推荐修复路线**：最小修复与条件性结构调整，关联现有 owner/消费者、资源生命周期和 correctness 风险；不要只有建议清单。
5. **最小但充分的验收**：哪些指标、工作量和正常产品旅程可以证明改善，怎样排除空窗口、错时刻、少内容、不同负载和 observer effect。
6. **可直接交给 Codex 的执行提示词**：包含实施顺序、文件入口、必要仪表、分支条件、完成标准，以及哪些结论必须等实际手机结果后再作决定。
7. **来源**：把官方文档/源码/issue 链接放在它支持的具体结论旁。区分微信普通小程序与小游戏、模拟器与真机、H5 Canvas 标准与微信实际实现、JS heap 与整个进程内存。引用经验/issue 时给适用版本和可复现条件，不能把猜测包装成官方保证。

请不要只重复背景，也不要在没有目标证据时给出确定的单一根因。我们希望得到的是一条比当前逐项试错更短、更有判别力的路线，以及可以真正落地并保持产品语义的性能修复方案。

