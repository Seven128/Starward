# R19 来源往返：阅读锚点与动态布局独立诊断

2026-10-22。独立只读诊断。只新增本报告；未操作手机、IDE、构建、预览、服务、Git 或生产代码，未改 PLAN/HANDOFF/Context。实际查看 gen5 原图，并读取当前滚动 owner、正式点布局及地形/近期天气生命周期。沿用 `starward-interaction-design` 与 `starward-miniapp-development` 的目标运行时和证据边界；Context 要求返回原正文位置，不能仅凭源码或模拟序列关闭。

## 结论

**仍有确认的 P2：来源页返回没有保住正式点文档的实际阅读位置。** gen5 普通近期天气来源往返通过、返回后手动滚动有效；这些有效结果保留。随后天文章节中的月相来源往返发生明显整体位移，稳定后不重新选章、不滚动的第二次相同往返仍继续位移。因此，不能把剩余问题限定为首次章节 anchor 的竞态，也不能将一次数值 scrollTop 确认当成阅读位置恢复完成。

代码可确认的缺口是：共享 owner 只保存绝对 top，而前置正文会在 hide/show 及异步资源恢复时改变布局；当前 `ready` 不含这些布局边界。**本报告未取得原生 scrollTop、矩形和事件顺序，尚不能证明某一个布局变化或 native 事件就是这两次偏移的唯一原因。** 不建议继续盲目重复来源往返。

## 实看原图

主代理确认候选为 gen5、bundle `2ff0c01667882db9a874789f48ba49cef6f764f04f7f1a00606db182eeb9e331`。原图仅留在私有 session：`C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/starward-device-test-0uFldy/`。本报告没有复制或上传原图。

| 原图 | 实看结果 |
| --- | --- |
| `screen-7a6037eb-673f-4987-83c2-1d4419357e24.png` | 天文选中；天文标题、日期时间卡、完整月相卡和气象标题依次可见。月相卡顶部约 y=955 physical px。 |
| `screen-ca869b32-c558-4ece-b11e-edb9218fd00c.png` | 独立“月相计算来源”页面；Astronomy Engine、许可、连续链接、获取及适用范围真实呈现。 |
| `screen-2e6578f2-97da-4da3-be7f-9fba730546e4.png` | Back 后天文仍选中；月相卡顶部约 y=513，日期时间卡与气象卡同量上移约 440 physical px。月相内部几何与数值未出现对应的缩小。 |
| `screen-e0947916-005b-4658-befe-7681ab915774.png` | 稳定后的第二次打开前；月相卡顶部仍约 y=513，浮动通知已退去。 |
| `screen-d320aa35-f099-4f3c-a915-807b9aa8d881.png` | 无新章节/手动滚动的同一来源往返后，月相卡顶部约 y=383；月相和气象又同量上移约 130 physical px。 |

以上是原图中的近似几何描述，不是 native 测量、时间指标或验收容差。浮动通知覆盖气象区域，但不解释日期时间/月相/气象共同上移；截图也不能排除视口之外的正文重排。

## 已确认的代码边界

1. `spot-panel.tsx:263` 给共享 owner 的 `ready` 仅是 `!detailPending && !settling && extent !== "small"`。章节矩形另由既有延迟测量维护；近期天气/地形资源的布局状态没有进入这次返回的准入或完成判定。
2. `use-panel-return-position.ts:38` 在 visible→hidden 时复制 `current`；`53–64` 在首个 ready/visible effect 中清空 pending、将保存的绝对 top 作为新命令和 current 发布。`76–83` 的确认只比较 scroll event 数字与目标是否相近，并未检查阅读元素在视口中的位置。数字相等也不能证明内容坐标系未变化。
3. `use-raster-image.ts` 在 `enabled=false` 时立即对消费者返回 `imagePath=null`，释放 lease；show 后通过 acquire Promise 重新交付路径。这是应保留的资源寿命，不能为滚动而停止释放。
4. `SpotTerrainOverview` 的 `terrainShown`/`lightShown` 依赖这些路径。hide/show 因而可能改变正文状态行、地形高程 legend、夜光加载行和实际绘制来源署名，而不只是停掉一张固定大小图片。`hasPicture=false` 的 StatusPanel 位于固定地图区域之外；这些节点对后面的天文章节坐标有实际影响。是否以及哪些节点在本次目标场景改变，仍需 native 观测确认。
5. `use-recent-weather-query.ts:15–29` 以 active/enabled 改变 query key 和资料资格，并在 hide 释放地区数据、复位失败；`RecentWeather:35/47` 切换加载/错误/结果及来源入口。它处在地形/天文之前。不得为了冻结正文而保留已停用 GeoAPI payload 或让旧结果继续冒充当前资料。
6. 章节跳转会主动接管返回命令、撤数值 prop、提交 `scrollIntoView`；hide 清旧 anchor。它确实是双定位责任的交界，但第二次无章节命令仍漂移，现有证据不足以只修这一处。
7. `SpotTerrainHorizon` 已保留 chart 外壳高度、状态层绝对覆盖，纯 canvas 重建不自动等于整块消失。应避免将所有 visible 子项一概认定为同一高度原因。

此处没有发现需要第二份 Map、全局文档缓存、新 router 或放宽私有/来源身份检查的理由。

## 最小可行的修复方向

共享 owner 应恢复一个**有身份的阅读锚点和它在视口中的相对位置**，绝对 top 保留为无有效锚点时的原有后备。快照只需元素/章节 ID、相对位移和既有文档/照片身份及代次；不含查询/React 闭包、停用 payload，也不写 URL 或长期 storage。

可以复用当前章节 IDs/offset 先解决“章节之前的高度改变”。但不要直接使用 rail 的 `section` 意图当作已到达位置；onSelect 在原生 anchor 完成前就已选择。应来自同批有效的 native scrollOffset 与矩形/已有有效测量。

**仅章节锚点有明确反例：** astronomy 章内，月相之前的天气预警或日期时间卡改变高度时，章起点不变，按该章相对 top 恢复后月相仍会移动。更贴合“来源往返”的最小稳定锚点是当次来源按钮或它所在的语义块；可由面板局部返回 owner 向公共来源入口提供可选的离开前捕获责任，统一读取这次入口 ID 的矩形，而非给每个来源复制恢复代码。其他页面不因此增加 Map 专用状态。

具体责任可保持很小：

- 离开前捕获一次有效 native `scrollTop`、viewport 和当前阅读锚点矩形；用既有账号/选点/Context/visible 代次拒绝迟到读回。导航失败即丢弃这次离开检查点，不能带入别的来源。
- 返回在既有内容准入和提交后测量时机读取同一锚点。校正公式为 `targetTop = actualNativeTop + actualRelativeTop - savedRelativeTop`；同批 native 读数用于计算，不能将旧 event 数值与新矩形拼接。
- 返回会话在 show 和**确实影响正文几何的布局版本变化**时做校正，每个版本最多一项在途查询，合并重复通知并取消旧代次；不按 onScroll 帧查询，不用固定 80/200ms 当资源/布局完成条件。现有地形、近期天气等 owner 只需在相关状态使布局改变时通知一次，不要求把其 payload 上交。
- 数值 ack 只证明命令已被接纳；锚点相对位置符合才证明该次阅读位置达到。后续前置布局变化仍可能需要同会话校正。实际触摸、新章节请求、新身份或新导航立即退役此会话；保留已发 native prop 的现有防归零规则，触摸只退役保护和校正意图。
- 锚点被资料更新移除时，按明确的稳定父块/原有绝对 top 降级并保留未验证边界，不能重新执行旧章节选择或滚到另一个来源。查询失败使用原有位置和恢复路径，不新增无限 retry。

对主代理拟实施的“现有 owner + 少量非重叠稳定块 + nextTick/布局版本校正”方案，独审认为它与上述责任一致；实际实现仍需注意：离开前 scroll-rest 缓存只能在身份/布局版本仍有效时使用，不能拼接新旧坐标；新版本到达时应废弃旧 query 并确保最新版本仍得到一次调度；show 锚点恢复前的 0/旧读回不能提前改写快照。若算出的校正值恰等于上次 scrollTop prop，但 native 实际位置不符，相同 setState 不保证重新派发；不能用微小虚假偏移或普通触摸撤 prop 遮盖该边界。最终源码与真实候选另行审查，本文不将计划视为修复已完成。

这是一项局部位置责任，而非通用布局框架。若采用更小的 chapter-only 首步，应如实限定其覆盖，并用下面的一次观测决定是否还需靠近来源的锚点。**单独把所有子查询的 ready 合并到门控不充分**：失败/重新加载仍有可用布局，不能等每项成功或永远冻结；而同一 ready 后还可能有 native 图片/内容重新排布。资源 owner 可以上报终态/布局版本，不能以“成功”取代几何。

## 一次最小原生判别与停止条件

不需要更多无诊断的往返。下一次必要候选可对同一月相来源进行一轮内部、局部、有限采样，复用既有原图/官方交付，不在产品上增加调试面板：

- 离开前一批 query：viewport rect、native scrollOffset、astronomy rect、moon/source-button rect；同时记共享 owner 的 current top、epoch 和布局版本。
- 返回命令时与该次最终相关布局版本各一批同字段；有限记录 show/hide、scroll event、target、ack/takeOver 与当前布局版本。只需可关联的顺序/单调序号；不采集账号、正文或来源原件。
- 若 native top 与保存值一致、astronomy 的文档坐标改变且月相相对 astronomy 不变，归因于章节之前重排；若 astronomy 坐标稳定而月相相对 astronomy 改变，归因于章内重排；若最终 native top 与发出/保存值不同，则先查命令、旧回调或 native 范围限制，不把它强解释为布局。
- 若最新 native top 与 owner current 在离开前已经不一致，优先修检查点语义，不继续增强错误快照的重复恢复。

一轮已能区分这些方向后，停止采样、完成局部修复并复验原路径及返回后触摸/章节接管。用源 hook 模拟序列可验证代次、取消和计算，但不能替代这次原生位置结果。gen5 普通近期天气成功继续保留，月相失败保留 FAILED，整个 Goal 其余 UI/叠层/Sky 性能和内存义务不因本诊断关闭。

## 审查输入身份

| 文件 | SHA-256 |
| --- | --- |
| `use-panel-return-position.ts` | `1b864457feee5584e8dbba68c7a541ca524dac6123d2f51652d0f28ab91f264b` |
| `spot-panel.tsx` | `9d96adde4d97408e0f2d71290be2517c917b7365a0fc36ebd31bcd8b38c29211` |
| `spot-terrain-overview.tsx` | `ce8aafb17a06dab9ca2615a0424787a7ef917cd0db81d5e0d2ad06b1433922c1` |
| `use-raster-image.ts` | `4ea85720104ad8ca98f8df04f2c05d2c67b10361ca5e1a52582fb4d9f369cde0` |
| `use-recent-weather-query.ts` | `1f375f968620e03da989e6baa6f47b81373e3c60fbd0362db2c5e16509d09ff5` |
| `recent-weather.tsx` | `90dfa5ef17a146abf52160550be04226e5ff197ec5707f3605f1c0df7ce38aaa` |

未重复运行既有软件检查；本报告没有生产变更。当前 source hash 与上一轮 gen5 代码独审一致，不冒称已获得尚不存在的修复候选或手机通过结果。

原图 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| screen-7a6037eb-673f-4987-83c2-1d4419357e24.png | 573150580ae6524d59f95b27bb085600240a96fbc3268bbb31cb65596a2e1580 |
| screen-ca869b32-c558-4ece-b11e-edb9218fd00c.png | 7043e362832ef1e444acaf0787a56474d06fdfff21ab7a87a16efed2bc8182af |
| screen-2e6578f2-97da-4da3-be7f-9fba730546e4.png | 9f805a1258e3826ceaae31cf1dbe533933fbd19764fe15f1087e9e543ec9d9e5 |
| screen-e0947916-005b-4658-befe-7681ab915774.png | 6170aa1e02b9258468ac1fc726ef0c4fc50bcbc84925e58c0a605c6b37f3e222 |
| screen-d320aa35-f099-4f3c-a915-807b9aa8d881.png | 4153b415bad076c93b4052bda5ca81ec5085795146a6b138da36a0efa6616422 |
