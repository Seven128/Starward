# R19 gen15 初次大档顶部裁切的有限归因

结论：真实手机帧确认同一次中档手柄展开后，图库和地点标题裁出上端；Root 随后的一次普通正文向下滚动恢复了三图相册、手柄及完整标题，大档和三动作保持。因此已确认是可恢复的文档裁剪，不能按顶部安全区不足修，也不能把初次展开帧作为未改基本信息区域的 UI 通过证据。具体由原生手势竞争、媒体展开时的布局保持还是其它 offset 变化导致，仍未独立归因；没有证据把它认定为本轮导航或新来源/阅读恢复造成的新 P2。下一责任是 Map 手柄操作与媒体展开/释放期间的正文位置连续性，不先加 catchMove 或每次切档强制清零。

## Candidate identity

只读审阅现有 `development_feedback` 普通 gen15：bundle `63893429b0f47be8284a944d08a34f9230ffa4b87315de1d361ff361a25087d3`，345 件、5,023,790 B，session `starward-device-test-IrTg0l`。手机完整字节/runtime AppID 未认证。分支 `codex/remote-main-20260908`，比较基准 HEAD `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`；本审阅不改变这些身份。

已读当前 HANDOFF、PLAN 的 R19、[天文批次](R19-GEN15-ASTRONOMY-WEATHER-PHONE-20261023.md)、[有值气象批次](R19-GEN15-WEATHER-VALUES-PHONE-20261023.md)、当前 UI Skill、global、Map/共享 Screen Context 及 DESIGN 的上端安全、单文档、手柄/正文滚动责任。本轮采用增量仍为 `3995519477980461148`，未改区域依赖完整源 `5205988829884632961`，不重新选稿。

实际查看了新增量 ADOPTION/README、同一完整源临时输入内 `map/ADOPTED.md` 所指舒适尺度 `review/large.png`，并读取当前完整宿主和增量 `candidate-preserved/panel-gestures.js`。临时输入根为 `C:/Users/momoooo/AppData/Local/Temp/starward-design-20261022/implementation-input-20261022`；原完整 ZIP 身份复用采用核验 `0189d1ab761078178f079fb0f5909dcc896be40dc145758b228cd22ed844c3e6`。当前 large 参考 SHA256 `26a845196f6258e231a6f544330ba1d7c13249678e05f040b0f1d163c17ea4a2`，本次只读回其局部文件，不声称重新认证完整 957 文件。旧 `map/adopted/spot-information/reference/large.jpg` 没有被用作当前整页基准；网页图也不代替 WEAPP。

## Invocation result

没有操作手机、IDE、服务、构建、feedback、浏览器或采集进程。按 sealed manifest 精确定位并实际查看下列原图及等比审阅图：

| 现有帧 | 观察 | 原图 SHA256 |
| --- | --- | --- |
| `858c8f9a-22b1-4cd6-9bf9-78cd8b011da2` | 中档，地点标题、手柄提示及地址完整 | `c3b2528c7f120e8e484fb3da84ccfd9fbc0ff445b45652f09cf2d6c633fe4f9a` |
| `de54b50b-6b73-44b6-a9b9-c8b61017ce5e` | 大档，地点标题/手柄未在可见区，地址仍可见，底部三动作保留 | `b6f68a4642217623598c36cea0429507ca8f14be21b04daf257b5c5cca3cf24a` |
| `3f324c25-70a1-49a9-b43d-c478b77248dd` | 前一批初次大档也见标题上部裁出；不是同一动作的中间帧 | `ee261067dc3cfcf396b46b8b08912f113960fc4ed0b027f5ddc9d1aac8b7c488` |

前两帧归 `gen15-weather-values-20261023-1044/manifest.private.json`（71 件/16,641,000 B，`fee23bfe1eb3a9fe6bd2a0cf01baee813f4643ce8e357f5b1601e42d4cddc7fa`）；第三帧归 `gen15-astronomy-weather-20261023/manifest.private.json`（46 件/16,186,928 B，`980e7c8c2f12eca20033b1104a50ada56c3ce6621967b07d07c8c02fe625a49f`）。两个 sealed manifest 均未修改。

Root 另存实际展开命令的转录回执 `r19-ui-20261022/gen15-weather-values-expand-input.private.json`，SHA256 `4ebffd906d1c6fffec7f4520bda87ce62bef21047264fc3cd30891ecc7c3b655`：fresh/实看 `858c8f9a` 后，公共 USB swipe `(0.5, 0.522)→(0.5, 0.23)`、请求 700ms，exit 0 / `actionSent=swipe`；到 `de54b50b` 无其它输入。起点落在可见手柄提示附近。该回执是既有调用的转录，不是新动作；没有这一动作的录像、原生 `scrollTop` 或实际触摸归属读数。

## Owner trace 与合同判断

- DESIGN §5A.3 要求 large 位于真实顶部 chrome 与底部安全区之间，名称保持正常可读；同一文档的 header 可以在用户正文阅读时随内容滚出。它没有要求把 header 固定，也没有允许手柄展开本身顺带滚动正文。完整源当前 large 参考的名称在原生顶栏下完整；候选手势源也明确上端内容安全。保留“未改区域”不能把当前裁切反向采用成新基准。
- Map `openDetail`（`index.tsx:1441`）由普通 marker 选择进入 medium，再调用 `setBottomPresentation("spot-panel")`；该 setter（383）没有传入 position 时清空 `returnPosition`。所以本次普通重开不应承接上轮来源页的保存命令。
- `spot-panel.tsx:268` 把唯一正文 ScrollView、extent/layout 与 `usePanelReturnPosition` 相连；触摸调用 `takeOver`。后者（172）只退休 pending/ack/readingReturn 和旧测量，不下发新滚动命令。无 saved/pending restoration 的布局观察分支只记录 anchor；显式设 `returnTop`/`node.scrollTo` 的分支需要有效恢复状态（116–169）。因此从当前调用条件看，没有找到本次展开由新来源/阅读恢复主动上滚的路径；这不是对所有运行时事件的排除证明。
- `index.tsx:1658–1807` 的手柄 Start/Move/End 与 HEAD 对应三个函数逐段归一化比较完全相同。Start 即 `setPanelDragging(true)`，`panelDocumentScrollEnabled = extent !== "small" && !panelDragging`（416）；触摸释放、取消、身份/布局失效再释放 owner。当前 Context 已保留原生 ScrollView 竞争尚需真机核验的边界。React 守卫源码和既有模拟检查不能证明实际原生输入只被一个 owner 消费。
- `.spot-panel` 后部生效级联（`index.scss:2065` 起到 identity 规则）与 HEAD 逐段比较完全相同：large 以 `primary-page-height - map-search-top - 4Px` 为上限，Map 原生 insets 投射 `map-search-top`；手柄随文档滚动且 DAY 保原透明重叠构图。`primaryNavigationLayout` 本轮确实按要求移除了底栏占高，输入高度有变；没有这次真实 panel rect/scrollTop，不能据公式断言原生大档几何正确，也不能据两张图反推删底栏导致上端回归。
- 手柄本轮换用 `SharedButton pressVariant="none"`，其 touch props 直接传给同一个 NativeButton，无新 wrapper、React press state 或滚动命令；这不能单凭源码证明全部原生手势行为相同，但未发现由公共按压实现显式移动正文/整体缩放标题的代码。

源码核对时 `index.tsx` 为 `3f480ba695330866149e478f0ec07ac5cb4ef49596830f1a8a9b8e7d91c04aa7`，`spot-panel.tsx` 为 `fae98352fa958dda12124f3b3bc7c367eeb196ff9d338560aa2e38cc6ddae0bb`，`index.scss` 为 `8d8d1cf90920f1e6e4c13f45446460fc50ea85ea6b4717972dedc72d1aaa53fb`，位置 hook 为 `05c0d4e4471cd06eca82244cb94f383561e2a5a0e343d8514338c8786bdcff35`。比较的是当前脏工作区与 HEAD 的具体责任段，不把 HEAD 当完整最新成果。

## 有界区分已由 Root 完成

Root 在本审阅期间只补了一次区分路径，不编译/刷新或注入：同 gen15 完整 Map `d0774135`（UTC 03:12:44）→同 marker→中档 `f8f062bd`（03:13:17.439）→相同手柄 swipe（700ms）→大档 `cdc93d4b-e512-4a16-ab11-54bddddbd3dc`（03:13:52.326）→明确非 handle 正文 `(0.58,0.35)→(0.58,0.72)`、700ms→`d8ce47d6-a73c-4d33-8b0c-b946d76ef8f4`（03:14:30.911）。本代理没有发送这些输入；已枚举当前 session 精确文件并 actual view 两张 1080×2376 原图。

`cdc93d4b` 复现原裁剪；`d8ce47d6` 恢复 TEST 三张现场图库（可见 `1/3` 及相邻图）、真实手柄、完整标题和地址，图库上端位于原生标题/胶囊下。固定三动作及 large 保持。两张原图 SHA256 分别为 `aa527a50c75d060bd7ce1647846683e663fcc9fa6299ab7c5ae3b0bc4db0a4ee` / `b02589db093b63206118b0d26c94adff18ab982e868e122897dd506564d07f95`；本代理只读现 session，原件保全由 Root 统一负责。

这关闭“标题是否因没有可用顶部而必然被切掉”的区分问题：同一个大档确有可读文档顶部，原先连整个有效图库都已离开视口，不是只有标题缺少少量 padding。它仍没有给出数值 `scrollTop=0`、途中 offset 或手势消费记录，故不据此判断具体 native 机制。Root 不需要再重复这条动作；静态恢复也不证明手柄拖动过程符合采用动效。

## 下一 owner 与停止边界

责任应收敛为 **accepted handle 操作及媒体展开/释放期间的正文位置连续性**，协作面仍只有现 Map extent owner、SpotInformationPanel 的唯一 ScrollView 与既有 document-position owner：

- `panelPresentationAtProgress`/CSS 释放轨迹把真实前置图库从 0 展开到 160 逻辑 px；该高度会改变同一正文的前置布局。这里与原生输入竞争是两个尚未分开的机制，不能只因一次 crop 就规定 catchMove 为修法。
- `onHandleTouchEnd` 在开始 `animatePanelExtent` 前清 `panelDragging`；随后 `panelSettling` 可以继续，正文 `scrollY` 只取 `!panelDragging`，没有包括 settling。当前无显式 `scrollAnchoring` / `overflow-anchor` 设置。以上只定位待处理时段，不断言微信在本设备必然执行某种默认 anchoring。
- `spot-panel.tsx` 的 `onScroll` 对所有有效 native offset 调用 `documentPosition.record`；它没有按本次 handle/媒体布局操作区分“用户主动正文阅读”与“布局或原生输入带来的位移”。新位置 hook 在无恢复命令时虽然不主动上滚，却仍可能记录并把已发生的位移传回父级。修复不能只忽略一次记录而不约束实际原生文档位置，也不能把普通来源返回或手动正文阅读全部清零。
- 本次调用条件没有 saved restoration；所以优先追原面板操作/位置边界，不把原因先写给新的来源导航、全局 safe-area 或主路由。涉及范围外的普通阅读、章节定位、来源返回和有用滚动保留仍沿各自合同。

若下一实现需要再区分具体 native 因果，应先复用现有位置/几何能力与正常输入边界。现有静帧不足时，待修复验证的单一代表过程可同时检查媒体先展开、操作期间正文位置及释放后终态；不要先重放多组速度/图片/主题矩阵，不重开旧 SDK 查询失败，不凭猜测新增诊断框架。本报告不选择未经验证的具体修法。

## Verified / Unverified / Cleanup

已确认症状、一次普通正文滚动可恢复图库/标题及其不符合“fresh 顶部可读状态”的对照缺口，已限定新恢复命令的可达条件；尚未确认数值原生 offset、瞬态过程、触摸双重消费、具体 anchoring 或变更引入时间。未声称 UI 大档通过、无需修复、已定位新 P2、已修复性能或完成 Goal。一次多读命令因多余右括号解析失败，没有执行；数次旧猜测路径不存在后改用实际 `rg --files` 入口。均为只读探索失败，不是产品结果。

只新增本报告；生产、PLAN/HANDOFF/INDEX、Context、设计资源及全部私有原件未改。本代理没有测试/构建/手机重放，未启动需清理的进程；上述新手机观察由 Root 独占执行并提供，本代理已独立实际查看。手机和后续动作仍归 Root。
