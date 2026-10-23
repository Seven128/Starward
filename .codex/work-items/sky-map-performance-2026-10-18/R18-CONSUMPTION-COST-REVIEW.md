# r18 连续调时：消费与绘制责任复核

2026-10-21，只读复核现有日减原件、随后取得的窗内分钟 receipt、实际生产源码和既有正常 CPU 结论。没有改产品、手机、IDE、服务、提交或上传；没有重做采集资格、gen22/23 阴性对照或启用 gen24。

**当前没有足够证据选定“删除重复绘制／搬迁 scene preparation”修复。** 新分钟样本把问题分开了：无 geometry 请求时全部 16 个输入都在下一输入之前首次 accepted；日减仍只有 7/15，其中 5 个首次 accepted 已晚于下一输入。两者都有显著的 native paint 工作。保留短窗候选，下一责任是跨窗供给与已有绘制工作的争用；不能把 72 次 copy 减成 16 次当作修复目标。

## 决定性证据

|同一 r18、264.355°夜空含地景|日减|窗内分钟增加|
|---|---:|---:|
|geometry 调用／完整验证／hook 准入|15 / 12 / 7|0 / 0 / 0|
|输入／首次 accepted／晚于下一输入才 accepted|15 / 7 / 5|16 / 16 / 0|
|排除首次等待后的 repeat 中位数|114 ms|113 ms（94–126）|
|准备／未消费准备|22 / 15|16 / 0|
|未消费准备已知 subtotal|4 ms，11 次低于分辨率|0|
|nativePaintOwner|40 次，23–57 ms，已知 1,207 ms|72 次，16–56 ms，已知 1,623 ms|
|Page 提交／完成／maxPending|44 / 44 / 2|53 / 53 / 2|

分钟 16 个首次 accepted 为 53–109 ms（p50 90），prepare→request 13–43 ms、request→paint 5–31 ms；其首输入有 14 次 paint，末输入有 11 次，其他大多 3–4 次。分布均保原 wall-clock elapsed 口径，nativePaintOwner 与 draw 嵌套，不相加。Page callback 不是物理呈现；重复 intent 呈现不是重复 frame 身份。本复核没有独立观看分钟视频，不新增“像素流畅”结论。

日减沿私有 `r18-short-geometry/hold-review/REVIEW.md` 与 `ANALYSIS.json`。分钟原件 `collector/baseline-r17-2-fdrgvluhyu.json`，SHA-256 `fb894eed6c7a47d93c9eed323d893b3cea63c7592ecbc6138592f851bcc34589`；normal / generation 27 / source `0de49244030276c9f5601ba6a358657654fac0fa22bd75b48e0f7b941a8ce907`，15,014 ms，geometry trace 无丢失／无效／遗漏。BSC 8,404、SAO 3,086–3,147、103–104 tiles，真实 native copy 72，非空负载。原始 Context/位置仍在私有 owner。

## 实际调用链与能否删掉

1. `use-sky-time-geometry.ts` 的 Query 回包只有经当前 binding 准入才供 `presentSkyTime`。page 的 `selectSkyTimePresentation` 在下一窗未到时保留最近有效 accepted 输入；请求中的数字没有被冒充成已绘制天空。`sky-canvas-lifecycle.ts` 已经只有一个 latest frame、一个 admission 和一个 native writer；没有发现另一个并发画图队列可直接删除。
2. `spot-sky-page.tsx:1900` accepted 回写同时给名称／选取、Sources、时间反馈及资源需求使用；`1948` 的 continuation 明确来自 camera、星点、名字、ready image 的实际动画。`sky-star-transition.ts:41` 在目标 opacity 改变时重定向 160 ms 包络，时间变化的高度透射会改变目标。名字和图像也有独立 160 ms 包络。它们会在同一时刻重新画全景，不能仅据时间相同称为无效工作。生命周期已经处理 hide/dispose、generation 失效和迟到 completion；未发现已证明的退休遗漏。
3. 有一个**真实但未证当前主成本**的候选链：`spot-sky-page.tsx:2171` 的 fineTarget 在箭头长按时仍可能启用（`timeScrubbing` 是时间尺状态）；匹配的同 at target 回包会重建 geometryReport，再由 `attachSkyCatalog` 重建 skyScene，`resolveSkySceneFrame` 的 scene-keyed memo 因此失效。日减在原 night 之外，fineTarget 本来不启用，所以这条链不解释本轮日减主失败；当前分钟 receipt 也没有 target 回包与 draw 的直接关联。不能据此启动新的 scene-memo 变体或限制必要 target 更新。
4. 既有正常 CPU 中 stellar projection 与数据／模板更新都有成本，但它的 45°、旧 source 和窗口边界不提供 r18 每个 draw 的成本分解。当前 preparation 的少量未消费 elapsed 不足以支持搬到 RAF owner；setter 自身很短也不能排除 React／模板后续工作。

## 最小下一分叉

先合并 root 正在进行的完整 NIGHT 准备／真实 Play 检查。若没有出现另一个更明确的行为缺陷，下一次必要候选只在**现有** `draw`／accepted observer 记有限的请求原因：输入／资源 effect 与 continuation 分开，continuation 用 camera / stars / names / images 四位标记；把原因随现有 frame 身份带到实际 paint，保留合并原因。无需新 profiler、脚本系统、全帧 JSON 或更多播放变体。

该读数会决定不同修复：若真实输入期间大量同一 geometry 的全景 paint 仅为 opacity 续帧，才评估在现有 writer 内复用不变的准备／上传，完整保留可见渐变、端点、名称选取和 resource feedback；若 effect 重复请求来自实际无变化的输入身份，则只修那个 owner 的失效条件；若大多数都是必要新内容，继续定位当前 native draw 的实际成本，不删内容或改慢 repeat。所有方案仍须比较首次有效更新、最终正确终态以及资源退休，不能只看请求／copy 数下降。

本轮没有 Memory graph 或同窗 process watch，不解释 r13 native crash，不证明无泄漏，也不改变独立 B 的下一观察或被阻塞边界。
