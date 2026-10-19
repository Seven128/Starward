# R17 页面生命周期边界检查

结论：未发现地景 `previous`、注册图像、accepted 状态或 Taro handler 缓存形成逐帧强引用历史。下一步保留 gen21 的真实 CPU Scene、React/Taro、图像和 RAF，只隔离重复 `surface.measureText`，有更清晰的因果区分。本报告选择诊断边界，不认定 allocator 或生产修复。

只读检查 PLAN R17、[CPU/page-only helper/build](R17-CPU-PAGE-ONLY-TRIAL.md)、[gen21 结果](R17-CPU-PAGE-ONLY-RESULT.json)、[gen20 Page 观察](R17-PAGE-BRIDGE-RESULT.md)、[目标堆边界](R17-TARGET-HEAP-DIAGNOSIS.md)及真实源码/安装依赖。没有操作手机、DevTools、feedback、879x、数据库或远端；没有改生产源码、PLAN、HANDOFF、INDEX 或构建。

## 当前证据

root 采集的 gen21 完整包 `cc40d6e5a80563bcb52d20c3cacef4b8781e5e09410b48c04e375d26467a78b5` 在首次 ready copy/publication 后冻结 native rendering。13,998 ms 窗口仍完成 490 次完整 Scene，BSC 8,404 行、SAO 6,519 行/19 tiles，GPU upload/accepted copy 为零；真实 Page 492/492 callback、pending 0/max 2。正常 Pause 被有界 timer 调用并实际显示约 19 秒，取消且未 Apply。Unknown 348,792→1,220,572 KiB，PSS 956,955→1,875,001 KiB，swap 40 KiB。这里复用 root 的记录，未独立复测。

这支持反复 GPU、renderer JS staging 和 native present 不是此次增长的必要条件。Unknown 不识别 JS/V8/native allocator；raw Page 回调全部返回不证明其他队列已经释放。只有一份初始 V8 快照，本地 Node Scene 也没有真实 React/native text/nonempty names，不能据此宣布完整页面强保留平稳。

## 剩余每帧工作与源码保留边界

以下路径均相对 `apps/wechat-miniapp/src/features/sky/`，行号指本次生产源码；gen21 插入任务计数后行号有偏移。

| 责任 | 具体位置及判断 |
| --- | --- |
| 原生文字测量 | page `:1611–1640` 为选中名、目标标题/高度、catalog 与星座名调用 `surface.measureText`；surface `:129–154` 每次 `save → font/alignment/baseline → native measureText → finally restore`，非零 spacing 时逐字测量。当前没有结果复用。bounds/避让/名称上限在参数求值以后检查（name-layout `:128–159`），所以少/零可见 caption 不证明无测量 |
| 名称和转场 | name-layout `:43–50,164–169` 新建 placements 后以一份 accepted 替换；star-transition `:27–34,76–82` 和 ready-presentation `:27–33,58–68` 同样替换当前集合，没有 append 帧历史。存在逐帧对象/Map/closure 分配，但不是由此证明泄漏 |
| 页面发布 | page `:1647–1728` 每帧提交 transitions/names、替换 painted snapshot、更新 presented state/camera。播放改变 frameAt，`:1680` 的同帧比较通常不能返回旧 state；真实 React/Taro 工作仍在。pending paint slot 仅围绕同步 done 存活并 finally 清空（`:1734–1736`） |
| writer/RAF | canvas-lifecycle `:46–99` 每次新建 run/cancel closure，正常完成设 live=false/nativePending=false 并取消 watchdog；`:133–158,176–193,219–267` 只留一份 latest、scheduled、deadline 和 busy attempt，hide/dispose 清 latest。未见应用层 RAF 列表积累；原生 callback record 是否释放未由源码证明 |
| 时间/query | page `:1958–1973` 一条 16 ms interval，effect 清旧 timer；播放中关闭 fine target instant query（`:1932–1948`）。use-sky-time-geometry `:24–46` 只留一个 admitted window；time-presentation `:129–133` 新建单时刻 report，共享原静态 catalogue，不指回前一 report |

17 个相关 surface、名称/转场、图像 hook/loader/request、time hook、command state 文件与 gen21 源文件逐个 SHA-256 相同；另外两个 lifecycle/time-presentation 文件完整差异仅原 paired probe import/计数/measure 包裹。page facade/publish 变更由现有 builder 精确替换声明绑定。

图像 owner 没有发现每帧重建/解码路径：use-sky-artwork `:32–60` effect 以 canvas/revision/hash/active/预算/retained IDs 为生命周期，wanted/resolve 用当前 ref；`:67–68` 按 id/hash 字符串更新需求。artwork-loader `:59–60,120–142` 按 SHA 定位 entries、ready 不再次 start，loading 并发 2；已有 source-pressure 预算、过期请求取消与 dispose。artwork-request `:44–50,70–90` 在 onload 后 detach 回调，release/unsubscribe/decode-id fences 负责退休。landscape mask/readiness 与 SAO owner 也按 canvas/publication 维持。实际 wanted 抖动仍可能产生 load/release，这里没有手机 start/decode 次数，不能宣告所有 native image 已释放。

## previous 地景和注册图像

page `:1763` 将已绘 snapshot 的 landscape 作为下一 Scene 的 previous，`:1657` 用新 snapshot 替换 ref。实际下游没有保留链：

- scene-render `:645` 对 previous 只调用 `skyLandscapeHasPaintedModel` 得到 boolean。`:678–681` 新 transition 使用新的 procedural background 加当前 paintedPhoto 的浅拷贝；`:724` snapshot.view 仅含本帧 mask，没有旧 snapshot。
- landscape-mask `:21–25` 的 transition children 固定为 procedural 与 panorama；`:35–37` WithOpacity 是平面 spread，共享原 publication/resource/alpha 数组，不加旧 mask 指针。landscape-resources `:39–53` panorama 最多附一层当前同 publication overview，没有递归 coarser。
- sdss-optical-frame `:78–141` 新建平面的 primary/coarser/fallback field；sdss-optical-completion `:46–106` 复制参与 field/receipt，无前一 receipt。prepared-region-frame `:13–26` 只筛当前合法 completion。
- deep-sky hook `:48–78` 的 IR frame 同样为平面字段。page `:1665` accepted IR 明确把 coarser/fallback 置 null；isCurrent 闭包持有本次 loader frame，其 current 检查只读当前 scope/resource，没有前一 presented frame。
- stellar-scene `:36–37,109–138` 是 scene-keyed WeakMap 的当前 resolved value，替换不指向旧 resolved。SAO supplement-scene `:21–22,36–56` 替换 tile 当前 transform；`:61–70` previousSpan 只缓存该 frame 内一个 tile 的查找，不是上一播放帧。

这排除了上述实现中可见的逐帧 previous 链，不证明目标 isolate 已回收当前替换下来的数组/位图。

## functional React setter 与 Taro 事件

`sky-command-state.ts:8` 当场执行 `setPresentedSkyFrame` 原 functional updater，`:9` 覆盖 ref，`:10` 实际入 React 的是 `write(() => next)`。没有把原 updater/previous 链存入 next。next 确实保留本次 report、SAO frame、image/isCurrent，直到状态/队列替换和回收；plain camera updater 使用该次 basis/FOV/center，size updater 使用 size，没有建立旧 report 链。

本机 React 18.3.1 / react-reconciler 0.29.0 的 `cjs/react-reconciler.development.js:7753–7775` 合并 pending 后置 `queue.pending=null`；`:7837–7859` 无 skipped update 时把 hook.baseQueue 置 null并保存最新 state。production.min.js `$e` 第 84–85 行有对应分支。skipped/interleaved update 会保留重放队列，因此这里只确认正常消费后的释放路径，不能由 Page ack=0 推断手机 React queue 为空。

实际 `@tarojs/react` 与 runtime 均为 4.2.1。每帧新 onTouch/timepicker handler 的具体缓存假设已核对：

| 实际依赖文件 | 机制 |
| --- | --- |
| `apps/wechat-miniapp/node_modules/@tarojs/react/dist/react.esm.js:381–411` | WEAPP setEvent 先 removeEventListener(oldValue)，再 add(newValue) |
| `node_modules/@tarojs/runtime/dist/dom/event-target.js:32–70` | 每次 add 有新 wrapper/oldHandler，但 remove 按 wrapper 自身或 oldHandler 匹配并 splice 旧项，正常替换不会累计所有 handler |
| `@tarojs/react/dist/react.esm.js:77–85,135–136,702–709` | randomKey 只在模块初始化生成；固定 `__reactProps$...` 属性覆盖 props，host commit 调用上述替换，没有每帧新增 props key |
| `node_modules/@tarojs/runtime/dist/dom/event-source.js:1–13`、`dom/node.js:20,262–264` | eventSource 按 node sid/uid 持有节点，移除子树会删除；不按 handler 分配新记录 |

检索本项目源码与 root/miniapp 的实际 @tarojs 安装位置，未发现 onAddEvent/modifyAddEventListener/modifyRemoveEventListener 的额外 handler 缓存注册。未见“每次换 handler 必然永久追加记录”的机制；节点数量、旧 Fiber/host 实际释放仍未在目标手机测量。

## 下一步与停止边界

当前推进的 metrics-only 构建应只复用真实测量值，key 包含 text/font/lineHeight/letterSpacing，以 surface generation 隔离，保存五个 plain 数值，不保留宿主 TextMetrics；继续原完整投影/避让/发布/RAF/图像。用请求、命中、真实原方法返回/抛错和缓存条目 scalar 确认多数 Scene 中重复原生调用确实消失。若计数未下降，此试验不能排除测量边界。

若内存仍增长且实际重复测量已停止，则此边界也不是该条件下增长的必要条件；若增长消失，也只定位到完整 measurement 调用边界，仍需正常 renderer/copy/accepted 路径验证。不能以冻结 synthetic 结果关闭 R17。本轮到此结束，不扩展 Snapshot/GC、RAF 替换或新研究；无新的性能/产品通过声明。