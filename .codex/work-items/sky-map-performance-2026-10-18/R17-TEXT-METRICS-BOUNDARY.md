# R17 text-metrics boundary

2026-10-18，任务内只读分析；未改生产、构建、手机、DevTools、服务或反馈入口。检查当前生产源码和 gen21 CPU/page-only 源快照；以下三个 owner 的 SHA-256 在两者完全相同：

| Owner | SHA-256 |
| --- | --- |
| `sky-canvas-surface.ts` | `89ab750a1b524c2455bba99242b5907f3be7c5e5482ff2221d5fc456ecde9140` |
| `sky-name-layout.ts` | `82db25bf6154718501c42979c4035abd58f64ed0cbbb1c0ba8171ffe616e11ba` |
| `sky-label-presentation.ts` | `2113967aec438fc90118f0658929bcd17baffe62753a186f24f5ef93ff1c5b5b` |

结论：**测量没有复用，但没有找到应用代码直接累积原生 TextMetrics 或未配对 save 状态的路径。** gen21 在去除后续 GL、copy、caption/reticle paint 和 renderer staging 后仍快速增长，使剩余文字测量边界值得单独区分；这不证明文字测量已是原因。

## 每帧实际调用规则

当前页 [spot-sky-page.tsx](../../../apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx:1600) 的普通 Scene 完成回调先投影候选，再测量，最后让 `nameLayout` 判完整边界和碰撞。度量不依赖名称最终可见、已经退出或被拒绝。

| 消费者 | 每帧 surface 调用 | 原生 `context.measureText` 调用 |
| --- | --- | --- |
| 有效 selected marker，1611 行 | 1；无 marker 则 0 | 1，完整名称含当前遮挡/低于地平线说明 |
| 每个 projected target，1615–1618 行 | 2 | 2；固定名称与 `方向 · 四舍五入高度°` 分开测量 |
| catalog 候选，1619–1623 行 | 每个尝试放置的候选 1 | 同 surface 次数；选中对象跳过 |
| constellation 候选，1632–1643 行 | 每个 projected candidate 1 | 该名称 `Array.from(text).length`，因为 spacing 非 0 |

因此，令 S 为 selected 的 0/1，T 为投影 target 数，C 为实际尝试的 catalog 数，L 为投影 constellation 数，则每帧 surface 调用是 **S + 2T + C + L**；底层原生调用是 **S + 2T + C + Σ constellation Unicode code-point 数**。每次 surface 调用还执行一次 save、font/textAlign/textBaseline 赋值和 finally restore。

`sky-label-presentation.ts:62` 的 `wholeLayout=true` 返回全部合格 catalog 候选，没有预先截断为 8。页面只在已成功放下 8 个时停止；如果候选因碰撞、边界、地景或 reveal 被拒绝，C 可以超过 8。`sky-constellation-labels.ts:47` 的 wholeLayout 同样返回全部合格候选；`sky-name-layout.ts:150` 的显示上限 6 在参数求值之后才检查，故不能把 6 当测量次数上限。target 也在测量后才做放置检查。

普通 `surface.present` 还会为了居中/手工字距重复测量最终 caption（surface 190、193 行）；**gen21 冻结后的帧不执行 present**，这部分不在本次待排除边界。现有 gen21 标量没有文字调用计数，不能从 V、K、J 或最终可见标签数反推出上述 S/T/C/L；本报告不虚构当前手机每帧的绝对次数。

## 保留与生命周期

- `sky-canvas-surface.ts:129–154` 的 native `TextMetrics` 只在当前调用的局部变量/临时 glyph 数组内，返回的是五个数值构成的新普通对象；原生对象未装入 name layout、Map、React state 或历史数组。
- `context.save()` 成功后，字体设置、非法 spacing、测量或校验发生异常均进入 finally restore。没有常规成功路径的未配对 push。save 本身抛错或 native restore 内部失效属于另一种 native 错误，不能从源码证明不存在，但本次成功帧无相应失败证据。
- `sky-name-layout.ts:43–49,164–168` 每次 prepare 建立当前 placements，commit 替换 accepted 并推进 revision；新 Placement 只存文本、当前布局和数值 ready 状态，没有指向旧 Map/旧 metrics 的历史链。reset 清当前 accepted。它缓存当前已接受的放置/reveal，**不缓存测量**。
- surface 绑定原 display/context、尺寸、DPR 和 native generation；尺寸/节点失效走 release/dispose（页面 1531–1543 行），不会跨 surface 复用。当前仅用 `12px sans-serif` 与 `600 14px sans-serif`；在 `apps/wechat-miniapp/src` 未找到 `loadFontFace` / `@font-face` 等动态字体加载。

## 单一边界诊断的兼容要求

在 gen21 原 full-Scene/React publication、native RAF、image loaders 和 frozen facade 不变的前提下，**只对 surface.measureText 的成功数值结果做 surface 内有界精确复用**，可区分重复测量及其 save/font/restore 边界是否为增长的必要条件。root 已另行安排完整源码构建，本文不提供第二个实现。

1. disposed / native measurement capability 检查必须先于命中返回。命中前校验非法参数；异常、非法 native width、失败结果均不缓存。否则缓存可能将原本应该失败的调用改成成功。
2. key 包含精确 `font, text, lineHeight, letterSpacing`。lineHeight 参与 ascent/descent fallback，spacing 参与宽度和边界。保持原始 Unicode code-point 测量/合成规则，不改为整词、平均字宽或近似字形；仅存五个数值，不存 native TextMetrics。
3. 当前原生 font 赋值没有语法校验。非法 font 在某些 Canvas 实现可能被忽略而沿用之前字体；此时仅按输入 font 文本缓存不足以保证等价。当前合法固定调用不触发这个机制，不应据此宣称任意 font 的公共缓存已安全。
4. 缓存应随 surface dispose 释放，不跨 resize/context replacement。若以后引入字体加载/替换，或 language/direction/kerning/stretch 等影响 glyph shaping 的状态，需由该字体/文字状态 owner 失效或扩充 key。当前测量固定 left/middle；future caller 不得隐式依赖其它未入 key 的文本状态。
5. 256 项是此次诊断的有限边界，不是已证明的产品预算。记录 surface calls、hits、misses、evictions、native glyph calls、失败数和当前/峰值 entries；只在 menu/export 取样。频繁淘汰或持续新文本可能使大量 native 调用保留，不能把这种结果称为移除了测量边界。

## 解释范围与下一次判别

root 报告的 gen21 实际正常 Play/自动 Pause 约 20 秒：Unknown `348792→1220572 KiB`，PSS `956955→1875001 KiB`，Swap `40 KiB`；导出约 13998ms，V651/651/651、G0、首次 ready copy 1。这些是 root 提供的目标观察，本子任务未独立操作设备或复核原始内存文件。既有 [CPU/page-only trial](R17-CPU-PAGE-ONLY-TRIAL.md) 定义和仍未排除的 native RAF、image lifetimes、React/Taro 路径继续有效。

- 若精确 cache 下增长显著收敛，且 misses/native calls 在相同非空 Scene 中确实很少：说明移除**重复 native 测量及其状态操作整体**改变了结果。还不能仅归因于 measureText、字体赋值、save/restore 之一，也不能排除 cache 对执行成本/GC节奏的影响。应在普通 GPU/copy/caption 的真正候选内验证再决定生产修复；普通 present 的重复测量仍是独立实际消费者。
- 若增长仍在且原生测量接近零：重复 layout 测量不是必要条件。下一责任应回到实际 React/Taro publication、native RAF 或 image-loader/native-image 生命周期；本次无新 heap/GC 的证据，不应转写成纯 JS 已无泄漏。
- 若 misses/evictions 或 native calls 仍多、异常、Scene/数据数目变化：本次不能作上述排除，应先诊断该具体差异；不增加任意场景矩阵。

native 字形/font cache、Canvas 命令/状态跨 native 边界的保留都仍是**替代解释**，不是已定位缺陷。缓存命中会同时减少 native state 操作和短命 JS metrics/glyph-array 分配；Android Unknown 也不是 V8 heap 的别名。已有单张 target heap、局部 Node GC 和这些源码生命周期不能区分它们。

参考核查只补足 API 语义：[HTML Canvas 标准](https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-measuretext-dev) 将 measureText 定义为按文本准备结果返回新 TextMetrics；[Canvas 状态标准](https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-save-dev) 规定 save 压入状态、restore 弹出状态。这支持局部对象/配对状态的审查，**不证明微信 native 的实现或内存行为**。官方微信 Canvas2D 页面本次无法读取，未用搜索摘要、第三方缓存或浏览器实现替代目标证据。
