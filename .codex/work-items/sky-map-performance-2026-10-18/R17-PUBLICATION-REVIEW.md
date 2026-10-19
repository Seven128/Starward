# R17 accepted publication 独立边界审查

2026-10-19。只读复核当前 `944a1d6c9ffed6ede39fa9e6c7b56ff2594d57d2` 源码、当前 PLAN、`R17-TIME-PIPELINE-REASSESSMENT.md`、`R17-PAGE-LIFECYCLE-BOUNDARY.md`、相关架构与真实调用者。本文件是原 PLAN 的一个条件后继边界说明，不是新 PLAN；没有实施候选、运行构建、操作手机/DevTools/feedback/8791/8795/8796，也没有改产品源码、PLAN、HANDOFF、INDEX 或 durable Context。

## 结论与当前前提

可采用一项最小对照：**仅对 accepted frame 的 React mirror，把 `write(() => next)` 改为 `write(next)`。** 保留原来的完整 `useState`、原 updater 的立即求值、完整同步 ref、每次 dispatch、相等性与全部真实消费者。不要改变其它 `skyCommandStateSetter` 使用者。

这一对照只区分 React update action 中“捕获完整 accepted record 的函数”与“同一个完整 record 值”。它保留完整 record 在 React state/update queue 中的强引用，不能单独排除 accepted publication、React/Fiber、child props、Taro host/event 或其它 CPU/native 分配。如果变化无收益，应结束这个有限假说；不能据此宣布整个 React 边界无关。

root 在本审查过程中报告的有效 gen22 wide-play：478 次完整 Scene，BSC 8,404 行、实际 SAO 666 行/16 tiles；45°条件下名称工作非空；导出 `TM H104 U0 Y0 E1 O0`，Page 507/507、pending 0。PSS 2,546,106→3,050,866 KiB，Unknown 1,806,628→2,281,156 KiB，自动 Pause 实际到 04:30:20。这里仅引用 root 的当前结果，没有独立操作或复测。先前 narrow-play 的 `TM H/U/Y=0` 不作为排除 measurement 的证据；本后继依赖本轮非空名称与实际命中的有效结果。上述 Android 分类仍不能识别 allocator。

## 精确改动边界

生产源码路径均为 `apps/wechat-miniapp/src/features/sky/`；括号内为当前 gen22 source copy 的对应位置，构建插桩会偏移行号。

- `spot-sky-page.tsx:1394–1406`（gen22 `:1398–1410`）：完整 accepted type、`useState`、`presentedSkyFrameRef` 均保持原样；只替换该处 accepted setter 的最终 dispatch 实现。
- `sky-command-state.ts:7–10`：现有 helper 先计算 `next`，再写 `current.current`，最后 `write(() => next)`。对照需复制这几行的既有语义到任务专用 accepted adapter，唯一语义差别为最后 `write(next)`。共享 helper 本体和其它 command setters 不动。
- `spot-sky-page.tsx:1680–1720`（gen22 `:1687` 起）：原完整 functional updater 和所有比较/record 字段不动。不能把它直接交给 React 延迟求值，也不能只缓存其中 `data` 或图片字段。
- 原 `suspended`、`invalidated`、`failed` 的 `setPresentedSkyFrame(null)`（生产 `:1490,1827,1832`；gen22 `:1494,1840,1846`）仍经同一 adapter 立即清 ref 并发布 null。

下面只说明所审查的函数语义，不是已实施代码：

```ts
// 仅供 task-only accepted adapter；T 限定为完整 accepted record | null。
return update => {
  const next = typeof update === "function"
    ? update(current.current)
    : update;
  current.current = next;
  write(next); // 原 helper 此处为 write(() => next)
};
```

Accepted state 只有对象或 null，不会把函数本身作为合法 state，因此 React 的直接 value dispatch 不会误执行一个业务值。原 source 的 accepted setter 只有上述一个 functional publish 与三个 null 退休调用，没有逃逸给其它组件。原 updater 必须恰好执行一次，即使下一值等于原值也仍调用一次 React dispatch，交给原 React 相等性处理；不增加应用层节流/跳过。

React 18.3.1 / react-reconciler 0.29.0 的 `basicStateReducer`（安装依赖 `cjs/react-reconciler.development.js:7711`）对函数 action 求值，对其它 action 返回原值。两种 action 得到同一个 `next` 对象身份，因此不改变原 `Object.is` 结果、hook 数量、lane 选择入口或 accepted state 的消费方式。新候选应以当前已准入 gen22 为直接 parent，冻结 facade、metrics cache、Scene、GPU/copy抑制、clock、probe、controls、数据/资源 owner 均沿用其当前源码；不必重新构建历史 sibling 链。

## 必须保持的真实路径

| 责任与消费者 | 本对照必须保留的事实 |
| --- | --- |
| 时间 intent：page `:1306–1314,1916–1968,2472–2476` | 同一 observation-time owner、16 ms 生产者、1x elapsed、preview/Play/Pause/cancel/Apply 及 Context/window 身份；不移动 preparation admission。 |
| 完整 Scene 与接受发布：`:1580–1746,1800–1821` | 原全部 Scene 输入、选择/名称/来源处理、pending attempt、surface/accepted fence和现有 synthetic 条件。`starTransitionFrame.commit`、ready/name commit、painted snapshot、camera/FOV、有限续帧与校准接受不动。synthetic publication 仍不计为真实 accepted copy。 |
| 即时操作与防串帧：`:2461–2469,2655–2668,2805,3175,3310,3337` | Sources、定位、calibration/picking/name action 继续读完整同步 `presentedSkyFrameRef.current`，保留 Context/time/run/mode/Canvas generation 检查；不以 requested frame 替代。 |
| React UI：`:2744–2783,2959–2994,3074–3082,3722–3733` | 原 `presentedSkyFrame` state 继续提供实际时钟、painted report/row、地景、名称、body/IR/optical/Prepared/HiPS credit、constellation 等完整事实；原 memo 依赖和 WXML/组件树不动。 |
| 选择反馈：`:1343–1346,1583–1588,3508–3528`；`sky-selected-object.tsx:46–51` | 保留 `SkySelectedObject` 的 position query/effect，即使 `visualName=false`；其 `onPosition` 继续立即写 ref并请求原 draw。`position.report === frame.data` 及精确 Context/time/catalog 检查不动。 |
| 相机与图像需求：`:1722–1723,2067–2175,2708–2729` | `presentedCamera`、FOV、accepted view 以及所有 SAO/artwork/landscape/body/IR/optical/HiPS demand、retry与退休保持原 owner；不冻结 camera、关闭 family、替换空数组或跳过资源 hook。 |
| hide/失败/退休：page上述 null调用、`sky-canvas-lifecycle.ts:252–267`、`use-sky-artwork.ts:32–68` | 原最新帧清空、surface生命周期、资源清理和请求取消仍发生；替换 React action 不能增加永久 accepted history或让已失效 image重新有效。 |

## 有效性与有限结论

准备阶段只需针对这个 adapter 的语义检查：functional updater 立即执行一次且使用当前 ref；ref先于 React dispatch更新；直接 value action与 ref为同一对象；同 identity仍dispatch；null立即退休；A→B→A的命令依序求值；抛错不写入或dispatch。再检查完整 source delta、受影响类型与当前 bundle identity。这里的 A→B→A 是 setter调用顺序检查，不能代替 intent/prepare/first accepted 的关联测量。

手机对照沿用 root 已确认的有效名称视角、数据/资源、Play/Pause controls和分离的 ready-paused/playing/paused-drain 观察。必须读到实际非空 Scene与名称，以及命中后的 native measurement消除状态；保留真实 BSC/SAO/tile与已执行 Scene计数、时间变化、Page callback/pending、原 guarded Pause和窗口时长。因为正常执行速率会受性能影响，不要求两轮 Scene数逐个相等；但不能以更少时间推进、遗漏Scene参与者、停止选择/资源回调或增加暂停来解释更低内存。

新增诊断如确有需要，只在原探针收集有界 scalar：accepted setter调用/立即updater求值/dispatch/nonnull替换/null退休计数；不要保留每帧 record、closure、report、image或JSON历史。原窄边界不要求另一套 profiler。

若同等有效执行下增长仍发生，本次只排除“accepted React action 的捕获闭包是该条件下增长的必要条件”；完整 accepted record仍在React队列/state中，不能扩大到整个publication边界。若增长显著改变，只定位到action形状及伴随的闭包分配/保留和GC行为，仍须复核同样负载与normal renderer/copy/caption/accepted路径。冻结诊断不能完成R17 A或B，也不能完成选中/Source/图像质量或长期内存验收。

## 不采用的近邻替代

裸的“React state改为序号，render读完整ref”不是这次最小对照。本机 `@tarojs/plugin-framework-react/dist/runtime.js:303–305` 对React 18调用`createRoot`；`@tarojs/react/dist/react.esm.js:846–864` 创建ConcurrentRoot。mutable ref可能领先该次render消费的序号，不能未经一致性保护就保证UI snapshot和时间/选择/资源消费者仍对应同一次接受。单调序号还会改变null→record→null等批处理中原有相等性行为。

`useSyncExternalStore`可提供独立snapshot一致性机制，但它新增订阅并由当前reconciler的`forceStoreRerender`（`:8146`）走SyncLane，已超出只改变accepted action形状的变量范围。不能把它和本次对照一起实施，也不能悄悄切LegacyRoot。若后续确有publication成本证据，再单独评估这些架构变化。

## 审查范围与停止

本次读取相关Context、完整当前PLAN和两份指定R17审查；核对当前page的所有accepted setter与主要state/ref消费者、command helper、selected-object、Canvas生命周期和artwork生命周期，以及安装的React/Taro root/reducer入口。读取gen21/gen22 builder与text-metrics说明仅为确定直接parent和原诊断边界，没有重新做外部能力研究或历史验证。没有运行产品测试：本次没有产品改动；运行时因果仍由root下一次有限对照建立。完成本文件后结束此子任务，不继续实施。
