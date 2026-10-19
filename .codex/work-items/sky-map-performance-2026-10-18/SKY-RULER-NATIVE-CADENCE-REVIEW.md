# Sky 原生刻度与动效边界独立审查

2026-10-19。本次为局部代码独审，沿现有 PLAN，不重做方案选择。仅写本审查文档；未改生产或测试、未构建或提交，也未访问手机、ADB、DevTools、SDK、服务或 feedback。

结论：前轮两项 P2 和本轮发现的三项 P2 均已有局部修复及软件证据，当前未发现尚未修复的 P1/P2。可继续纳入同一完整候选；离线通过不替代当前候选的原生目标验证，也不关闭原手机失败或完整 Goal。

## 范围与责任

审查 `orientation-ruler-layout.ts`、`OrientationTimeRuler`、`createSkyTimeRulerSettlement`、既有 scroll settlement/native position、`sky-overlay-motion.tsx/.scss`，以及四类 disclosure 消费者和受影响测试。遵循 development/UI skills、performance-investigation 方法、现有 Sky Screen Contract 与上次窗口恢复独审；本轮不变更采用资源和具体几何。

Sky 的实际 step 与零点偏移由同批 axis、tick 0/1 的中心和 native scroll offset 推导。programmatic left 与 drag fraction 共用该投影；页面继续拥有观测时刻、预览/取消和 Apply，原 settlement 继续拥有持拖与惯性。Map 使用另一明确几何，本次不将其并入 Sky 投影。

`useSkyOverlayLayoutReady` 等待 surface 自身的 transition end；`phase=open` 仅表示 CSS 过渡开始。time consumer 将 ready 与 children 的 live `active` 相与，避免退出保留内容沿用上一帧的 true。reduced-motion 分支即时就绪，不新增计时器或轮询。缺少有效节点最多再读一次，未取得有效投影时保留名义值，并在下一有意义边界恢复；这不是原生测量成功。

## 问题与修复证据

| 问题 | 审查结果 |
| --- | --- |
| 前轮 P2：`orientation-ruler-layout.test.ts` 的 `near` 调用第三参数引起 TS2554 | 当前 helper 已允许可选 message；本轮 miniapp strict noEmit 包含该文件，未再报此错。保留前轮失败事实，不把旧结果改写为通过。 |
| 前轮 P2：180ms `scale(.76) → 1` 期间 nextTick 的 viewport rect 被当作 native scroll 单位缓存 | 当前 production consumer 等待真实 surface endpoint，再允许同批测量。离线夹具验证 opening 不查节点，旧 endpoint/read 被退休后不能发布。实际 WEAPP transition 事件、native 单位及最终对齐仍由 root 在目标现场验证。 |
| 本轮 P2：`onTransitionEnd={callback-or-undefined}` 违反 exactOptionalPropertyTypes | 本轮首次 strict 实际报 TS2375，定位 `sky-overlay-motion.tsx` 的 View props；root 改为始终传函数、内部可选调用，独立复跑 strict exit 0。 |
| 本轮 P2：退出时保留的 children 闭包仍捕获 `timeLayout.ready=true` | 从实际 `SkyOverlayMotion` AST 提取组件并持久保留 useRef：open 的 children 捕获 true；closing 传入新 false 闭包，实际 retained 内容仍输出 `active=false / layoutReady=true`。root 改为 `layoutReady={active && timeLayout.ready}`；新增回归提取实际 parent JSX 表达式，与生产 retained component 合用，确认 closing 的 gate=false。不是只查源码字符串。 |
| 本轮 P2：resize 持拖松手时先清投影再换算当前 offset | 修前独立复现：`createSkyTimeRulerSettlement` 在 finish 时先通知 active=false，`interactionFinished` 因 `resetLayoutAfterDrag` 清空投影；随后 `onSettle` 用名义 17.68px 换算原先按实测 17px 得到的 offset。原样复用生产组件与 helper：hold → resize → scroll 565.750012，松手前 preview=33.25；release 150ms 后 preview=31.999435067873303、commits=[32]，应提交 round(33.25)=33。root 删除该 ref 和第二次 invalidate；resize 已经通过 `invalidate(true)` 标记 needsMeasure 并保留旧投影，interactionFinished 只触发既有异步 nextTick 测量。原投影保留至同步 final offset 转换完成。增强的当前生产组件回归明确断言 commits=[33]、最终 preview=33.25，再接受 resize 后 17.25px 的新测量并定位；独立复跑通过。 |

复现均在临时 Node 进程内读源码并执行，没有改写生产、测试或候选。retained 闭包复现最初因提取片段保留 `export` 而发生 harness SyntaxError；去掉片段的 export 后成功复现，不将前一次脚本错误归为产品故障。

## 已执行的软件检查

修前独立执行的 40 项均通过，但遗漏 resize 的实际提交值；其后额外的定向复现实际失败，不能用旧测试通过覆盖它。root 修复并补齐回归后，本轮最终独立执行 **41 项，41 passed**：layout helper 4、跨 render ruler 8、既有 ruler 10、overlay/字段控制 14、native position 2、shared settlement 3。覆盖初次 opening gate、endpoint/旧回调、窗口恢复、精确时刻取消、48/49 行、持拖/惯性/迟到事件、hide/show/unmount、resize 后正确提交及重测、retained closing gate，以及 120 次同刻度 Play render 零新增测量/原生命令。

hook unmount 用例也已补为未 settled 的 endpoint：unmount 后调用旧 finish 仍 ready=false；不再仅在已经 ready=true 的状态下检查同一个值。

命令使用仓库的 `tools/run-node.cjs`，分别运行：

- 最终同一次 `--import tsx --test`：`orientation-ruler-layout.test.ts`、`orientation-time-ruler-window.test.ts`、`orientation-time-ruler.test.ts`、`sky-overlay-motion.test.ts`、`ruler-scroll-position.test.ts`、`scroll-settlement.test.ts`（41 项）。
- `apps/wechat-miniapp/node_modules/typescript/bin/tsc --noEmit -p apps/wechat-miniapp/tsconfig.json`：root 修正可选事件属性后 exit 0；配置启用 strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes。
- 受影响源码/测试 `git diff --check` exit 0；仅既有 CRLF 规范化提示。

没有重复正常 CPU 或 Play 采样；120 次 render 是离线组件夹具，不能据此称手机流畅、物理 FPS、零总成本或 A/B 完成。

最终复核文件的 normalized-LF SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `orientation-ruler-layout.ts` | `3a908f50ed967d68671c71240c9b4a71695b7e26cfe56579b8d4a4f224728e83` |
| `sky-overlay-motion.tsx` | `7bf65cf42ab593ead02eba0bc16e6296c5162fc0e5296b82e4ccee939524f372` |
| `spot-sky-page.tsx` | `7fef56907f471737fcce5dea5f967ad068ead2893f4298c122907492ea16f9f4` |
| `orientation-ruler-layout.test.ts` | `567e5838009867a236f363fdbd85122a37701e08e41aeb2872bad674e72f34d2` |
| `orientation-time-ruler-window.test.ts` | `250177784a1069498046fb6c8bb9f01685b6c8f153e7cdaada4d0bc4277bcfb8` |
| `sky-overlay-motion.test.ts` | `3ef4a64ee1e8fed29cd6b6a0f2c7cfb191bef8fe64f1f8bcbb137000dfcf575f` |

## 目标证据边界

复用 root 已确认的 public SDK 非敏感数值作为 helper fixture：windowWidth=390，native step=17px；名义 step=17.68px，native scrollLeft=583.200012 与 prop=583.44 不相同。这些历史数值只证明原测量机制的具体差异，不是本次候选的修后读数。

root 仍需在包含最终修复的完整候选上观察真实 surface endpoint、实际 scroll offset/tick center 和取消恢复，尤其是 transition 反转、保持手势的 resize 后真实提交与重测。离线 scale/readiness fixture 不运行 CSS、不产生真实 native transitionend，也不验证 Canvas/普通控件的合成、触控或手机结果。gen26 UNKNOWN、目标交付、Sky A/B、地形等待与完整 Goal 的其余义务均保持原状态。
