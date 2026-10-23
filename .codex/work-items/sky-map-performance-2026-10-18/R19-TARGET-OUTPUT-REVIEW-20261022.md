# R19 来源、紧凑信息及按压：独立目标输出审查

日期：2026-10-22。审查者：独立子代理 `r19_target_output_review`。本次只读取现有资源、生产代码和真实手机截图并写本报告；没有修改生产、PLAN/HANDOFF，没有操作设备、IDE、构建、服务或 Git。

## 结论

发现 **1 项 P2：来源阅读壳固定为 76vh，短内容仍撑出大块空白，偏离采用源的内容驱动高度**。共享来源壳需要修正后，对短说明和长来源各复核一次。

已查看的月相二栏、天气九格、来源入口与返回结果未发现其他确认的 P1/P2。正常 SAMPLE_DATA 的单位和真实零值、过期状态均在手机输出中可见。此结论不认证完整 R19、按压连续动画、导航迁移或性能/内存。

## 身份与输入

- 采用范围：Stitch `7144519510537620825 / 3995519477980461148`；2026-10-22 局部增量，未改内容继续依赖原完整源 `5205988829884632961`。
- 实际读取和查看的临时输入根：`C:/Users/momoooo/AppData/Local/Temp/starward-design-20261022/implementation-input-20261022`。读取 `ADOPTION.md`、`source/candidate-preserved/review.html`、`review.css`、`review.mjs`，查看 `review-images/sources.png`、`astronomy.png`、`weather.png`、`layers-cloud.png`、`press.png`。原完整源的来源模块路径为 `source/docs/design-resources/wechat-miniapp/shared/comfortable-scale-2026-09-22/preview/source-ui.mjs`。
- 实际普通预览：`C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/feedback.json` 指向 generation 1，337 文件、4,980,480 bytes，bundle `7dad24c4cc7e2a5adb2f06106413f2e3858e3dae2cd5290bc4070102cf605055`。该文件记录 auto_preview success 及 operator_confirmed；它本身不证明手机安装字节或 runtime AppID。
- 下文所有手机文件均位于 `C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/starward-device-test-JNntkd/`。仅引用本地原件，没有上传。
- 已读约束：AGENTS、global/default Context、Mini Program Screen Contract 当前采用范围、Map/Spot/共享来源按压 owner、DESIGN 对应范围、interaction skill 及 interface-wording 方法、PLAN 的 R19 责任。字体/间距映射核到 Taro `designWidth:750` 与局部 `Px`；未按不同截图物理尺寸作整屏像素相减，也未把设计示例数据作为产品要求。

## P2：来源短内容仍固定占满 76vh

**实际结果。** `screen-d33050b3-a214-45f7-8ba7-f40c0dba78f3.png` 的天气来源仅有当前预报窗口及两句说明，正文已结束，白色阅读壳仍从约四分之一屏延伸到底部，保留大块空白。该现象与内容是否来自 SAMPLE_DATA 无关：任何短来源/说明都会受同一固定高度控制。

**采用依据。** `review.css` 的 `#sources` 使用 `max-height:76%; overflow:auto`，没有固定 height；其高度由真实内容决定，长内容才达到上限。`review.html:4` 将返回按钮、标题和正文全部置于同一个 `#sources` 滚动容器。当前采用范围明确包含来源披露，并要求未改内容保留。

**源码位置。** `apps/wechat-miniapp/src/components/source-disclosure.scss:46` 开始的壳样式在第 48 行使用 `height:76vh`；第 58 行将内部滚动区设为 `flex:1 1 0; height:0`，因此自然内容不能收紧壳高度。`apps/wechat-miniapp/src/components/source-reading-sheet.tsx:62`–`71` 又把返回/标题放到 ScrollView 外，仅正文滚动。

**相关已观察偏差。** 长来源从 `screen-790c5064-7a0a-413b-b7e3-a1e3f3f35369.png` 滚至 `screen-aa715148-e18b-45a9-b735-a22b25246663.png` 后，当前返回/标题仍固定；采用源的整个来源容器滚动。此处是结构和滚动责任差异，不是不同地图、数据长度或手机安全区导致的视觉差异。

**修复建议。** 在共享 `SourceReadingSheet` 责任内恢复自然内容高度，最多为实际可用视口的 76%，同时受 safeTop 上限约束；短内容收紧、长内容由唯一 ScrollView 承接。返回、标题与内容按采用源进入同一滚动内容。若 WEAPP 需要测量才能实现，只由共享壳拥有这一测量和失效处理，不给各来源卡新增独立高度状态。保持现有 route-local channel、NativeBack 及来源数据 owner。修后复用本次同一短说明和 Terrain Tiles 长文各做一次观察，并检查 Back 恢复；无需新增全主题/来源组合矩阵。

## 已实际确认的范围

| 责任 | 实际截图 | 可确认的结果与边界 |
| --- | --- | --- |
| 层叠来源入口与返回 | `screen-5e5e5de7-d90c-4294-898e-430f18c580c0.png`、`screen-790c5064-7a0a-413b-b7e3-a1e3f3f35369.png`、`screen-09dff8e8-7970-49b1-8c14-1cb854f1a357.png` | 标题行同时容纳层叠、地形开关、来源小入口。来源打开后能读到 Mapzen/Linux Foundation、USGS/NOAA、Terrain Tiles Terrarium/source pyramid z12 与责任说明。返回后仍是原云量选择、地形勾选和 10/20 20:18；可见地图位置一致。此为静态前后结果，不证明转场连续像素或所有内部状态。 |
| 长来源可滚读 | `screen-aa715148-e18b-45a9-b735-a22b25246663.png` | 后续责任声明、发布/获取/适用的“来源未提供”及精度说明已出现；没有以统一来源按钮把 Terrain Tiles 改成点位 Copernicus。未查看本文末尾，不能据此认证全部出处/许可按钮可达或复制成功。 |
| 月相紧凑组 | `screen-166ece2e-da0f-4e77-8b28-cadb9de034a7.png`，以及后续正常天气图上部 | 左侧相位图/名称/照明率，右侧月出/月落、月亮高度/夜间阶段保持清晰分组；来源入口处于同一标题行。未见文字、单位或日期被切断。科学计算和相位分类准确性不由布局截图证明。 |
| 过期天气九格 | `screen-dedcf46a-72b7-4e1a-83c1-5a2234ed17f2.png` | 九项仍占各自位置并明确“已过期”；顶部时刻/过期说明和“透明度、视宁度暂无独立数据”保持首层可读，没有藏入来源。不能用此图认证正常数值排版。 |
| 正常数值九格 | `screen-a92719ac-88ab-441f-ae7d-7052eca11ae7.png` | 通过当前“今天”选择后的 SAMPLE_DATA 显示 37%、24.7℃、66%、18.0℃、东南风 14.0 km/h、阵风 17.0 km/h、15.0 km、0.0 mm、0%；单位完整，零没有变成缺测，三列各行无确认的溢出。正常数值布局可确认，真实气象供应商数据及当前天气准确性不能据此认证。 |
| 正文来源返回 | `screen-a92719ac-88ab-441f-ae7d-7052eca11ae7.png` → `screen-d33050b3-a214-45f7-8ba7-f40c0dba78f3.png` → `screen-7731f036-548f-4b00-ba00-dae6f118eb61.png` | 来源关闭后返回同一月相/天气阅读位置，日期、选中时刻与九格值保持一致。短说明的大空白属于上述 P2。 |

当前正常天气来源只有预报窗口说明而无真实 SourceSummary 条目，属于本轮 SAMPLE_DATA 输入边界；不能冒充 QWeather 的实际来源/版权验证，也不能仅因设计图使用 QWeather 示例就判定本次布局迁移删除了真实记录。本审查没有扩查或改写旧来源数据 owner。

`spot-panel-compact-information.scss` 的 DAY 规则保留 100Px 月相摘要列、两列事实和三列天气矩阵，九格使用各自现有数据格式。截图支持这些已观察区域的可读性；未显示的夜光、目标和独立空气质量/警告区不作视觉通过声明。

## 按压证据边界

查看了采用 `press.png` 及 `review.mjs` 的按下、取消和释放实现，并读取生产 `shared-button-press.tsx/.scss`。生产通过原生 Button hover-class 驱动，80ms/140ms、brightness(.96)、图标 1Px/.94 与固定命中区的静态规则对应采用值；未引入按压 React state 或帧循环。源代码对应不等于目标帧已通过。

`recording-1792664990673.mp4` 原件存在，252,844 bytes。本审查未解码或播放该原片，没有安装工具。父任务报告的来源 pill 横滑出 700ms 后无误打开只能作为该次动作结果，不能代替本审查对按下/移出复位/释放动画的独立视觉结论。

按压连续外观、移出/滚动/取消时立即复位、快速重复、loading/disabled 和有独立长按责任的 Sky 时间控制仍须按已有 R19 责任取得对应有界证据；无需为每个按钮重跑相同行为。共享规则变更不应吞掉原选中/想去及 Sky sidecar/time-ruler 的独立动画，代码独立审查记录继续有效，但不升级为本批手机视觉通过。

## 保留的完成边界

- 修复并复核上述 P2。来源读取的连续进退、快速反向及真正隐藏/身份改变等未在这些静态图中建立证据；现有单元/代码证据应按各自范围使用。
- 完整真实来源记录的末尾原始出处/许可入口与复制结果尚未在本次截图中观察。仅复用现有可用真实来源验证必要入口，不用伪造样例来源补齐证据。
- My 方向及删 TabBar 仍待已发出的平台方案选择；旧底栏和占高不能被认定为最终交付。中档面板挡住第五工具已有 `R19-TOOLBAR-FIT` 记录，本次不重复开题。
- root 在 gen1 后新增的 DAY Add 位图、SemanticIcon/manifest 和 rail 26Px 改动尚未上机，本报告不将这些当前源码改动归入 gen1 截图。
- vConsole 浮动按钮遮住部分分享/下方内容，不认证遮挡区；它不构成本次新布局缺陷。手机系统栏、胶囊和 provider 地图与设计宿主不同，不作为自有像素错误。
- 无新增构建/测试/设备执行。本报告是已采集实际输出的独立审查，不是完整 R19、最终物理设备验收、性能、泄漏或完整 Goal 完成证明。
