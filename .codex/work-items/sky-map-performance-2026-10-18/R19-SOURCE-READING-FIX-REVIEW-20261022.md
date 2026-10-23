# R19 来源阅读锚点修复独立审查

2026-10-22。独立代码审查，只新增本报告；未修改生产、测试、PLAN、HANDOFF 或 Context，未运行设备、IDE、服务、构建或预览。按 `starward-interaction-design`、`starward-miniapp-development` 及来源/单文档/返回位置的现行 Context 审查。原采用资源未改变，本次没有重新选稿或扩大页面视觉审查。

## 结论与证据边界

**下表最终源码未确认仍未修的 P1/P2，支持进入 gen6 实际目标验证。** 这只是代码与测试边界审查，不认证微信原生滚动、几何查询同帧性、命令实际接纳或最终阅读位置。gen5 月相来源往返的两次位移继续保留 FAILED；不能以本报告或既有软件检查关闭。

先完整读取了 [gen5 锚点诊断](R19-SOURCE-ANCHOR-RETURN-REVIEW-20261022.md) 和 [来源页面实现证据](R19-SOURCE-PAGES-IMPLEMENTATION-20261022.md)。本次实际查看私有 gen5 `screen-7a6037eb-673f-4987-83c2-1d4419357e24.png` 与 `screen-2e6578f2-97da-4da3-be7f-9fba730546e4.png`：天文仍选中，但日期/月相/气象整体上移，与原诊断一致。未取得额外 native 事件顺序，不将某个静态机制认定为唯一实测原因；原图未复制或上传。

## 代码核对

- 离开检查点在同一次 SelectorQuery 中取得 viewport、native scrollOffset、阅读块矩形和增强 ScrollViewContext；优先使用被点来源入口的实际 ID，保存其相对 viewport 的 offset。没有把旧 scroll event 数字拼接到新矩形；快照只增加 `id/offset`，不含查询 payload、React 闭包或原生 node。
- 返回以同批观察得到的块坐标与保存 offset 计算目标。show、ready 与真实布局 revision 触发有限观察；旧 revision 的 effect 清理取消观察，epoch/ticket 拒绝旧读回。native 数值 ack 后仍可在后续布局版本校正，不把它当作布局已稳定。普通 onScroll 只记录，停滚后才通知一次测量，不逐帧查询或重发命令。
- 相同 `scrollTop` prop 不能重新发布时，实际差值达到原有像素确认边界且 public node 可用才发 `ScrollViewContext.scrollTo({ top, animated:false })`；无虚假偏移，普通触摸不撤 prop。node 缺失或失败仍有 prop 后备，尚无目标运行时证据证明全部后备情形达到相同阅读位置。
- 触摸、新章节、隐藏及身份切换退休旧恢复意图；在途 query 有 1 秒上限，取消会清 timer 和 pendingReads。SourceButton 在等待前防重复，prepare 返回 false 时静默取消，结束等待后重核可见/挂载和账号、选点、Map reset、Context 身份，迟到准备不能继续导航。
- `RecentWeather` 的 active/data/failure/loading，AQ 的 envelope/failure/loading，地形实际显示/状态/legend，以及 Horizon 的数据、绘制/失败状态均通知布局 owner。预警展开/到期沿原通知；PlanEntry 用稳定回调同时通知阅读 owner 与原 Map 几何 owner。SpotPanel 的 detail/report/extent/字号/DAY 分支及 resize 继续使几何失效。地形 lease、Horizon canvas、地区 live-only 数据释放仍沿原 owner，没有为保位置而保活已停用数据。
- PendingProposalPanel 不传 layout，继续走共享 owner 的数值/照片两轴恢复；正式点阅读锚点没有强行进入其不同内容语义。Sky return state 只短暂持有既有面板位置与小锚点，原 scope/资格/订阅清理责任不变。

## 审查期间发现并已修正的 P2

1. 章节点击原先等被 settling 门控的 effect 才 takeOver；在途阅读校正可能先移动。最终 `onSelect` 已同步 takeOver、退休旧章节请求，然后设置新目标和 extent，effect 只继续原 native 章节命令。
2. 原章节 80ms timer 不依赖 visible，来源准备/隐藏未同步退休，可能在检查点后再次发布旧 `scrollIntoView`。最终用 sectionTimer ref 同步取消，来源 prepare 和 hidden 清请求/anchor，章节 effect 也受 visible 门控。这关闭了可确认的两个命令竞争缺口，不据此宣称 gen5 的唯一原生根因已经证明。

二者均由主代理修复，本审查者没有改生产。最终读回以上处理及 false 静默取消协议，无保留的同类确认缺口。

## 检查说明与下一次必要验证

读取了 owner 的 6 个位置行为用例和新增 3 个 SourceButton 用例。它们覆盖同批 native 检查点、来源入口随前置布局变化、同值 prop 的 public command、旧布局/触摸取消、隐藏/身份切换后的不导航，以及无 provider 的普通入口。位置用例使用生产源码与受控 hook/native ports；SourceButton 使用真实 React/Taro renderer，但替换 native 导航/生命周期 ports，不能当作实际按钮触摸或微信页面栈证明。

主代理报告受影响的 14 项位置检查与 51 项来源/消费者组通过，组间重叠不相加；本次没有为重复确认另跑整组。最终 typecheck 由主代理持有结果，不把审查时仍在运行的命令记成已通过。

gen6 至少应复核原失败的同一月相入口往返、相关前置资源恢复后的位置，以及返回后触摸/章节确实接管；复用已通过的近期天气与其它来源证据，不重开无诊断循环。原始采用 UI、Sky 来源首像素、叠层与六字段性能/内存等完整 Goal 义务均不因本局部审查关闭。

## 最终源码身份

以下路径相对 `apps/wechat-miniapp/src/`；本报告结论仅对应这些 hash。

| 文件 | SHA-256 |
| --- | --- |
| `pages/map/use-panel-return-position.ts` | `684258ada237bb2a38a335cf1f900c969aba97818732a7f0b6a3214fef6e7a4b` |
| `pages/map/use-panel-return-position.test.ts` | `93a779b319a95762db9ede794b4d4b789f5ab25705ff11b1f33f8f9de25218c2` |
| `pages/map/spot-panel.tsx` | `fae98352fa958dda12124f3b3bc7c367eeb196ff9d338560aa2e38cc6ddae0bb` |
| `components/source-button.tsx` | `e5c345bd8e19be027a24ef0b1434f9d4b77f212e60ce4a352789fbd06c0142ee` |
| `components/source-button.test.ts` | `7d08def911825f1926dc54a1dbf6c5e3f883fd0d04d1cabf90fddfba84a2c85d` |
| `components/recent-weather.tsx` | `c7dee24c067930b8688b3d1a3de85cc41b8786b57061010f3c2f37794e4f15ec` |
| `components/air-quality.tsx` | `ddcf9043b4be89f263a330e2a181ed48538e18c2d9d6aa7463e9201811d8e3a3` |
| `pages/map/spot-terrain-overview.tsx` | `6dbd2e7e8df42e60c971adf5f7a9fe222d75a44ff2b923f6cb45c0cfba602a8d` |
| `pages/map/spot-terrain-horizon.tsx` | `a139bac701e04b5748cfca40e30b8d135f6858f82c8732d91e503307947707f5` |
| `pages/map/sky-return-state.ts` | `9a13ddee38bab7847abf53ae42ab4b6e9913b198f266a7ed5bf88359d3700f69` |
| `features/spot/spot-plan-entry.tsx` | `a43cad193908ba6c5848f3221fd22bcfd19ee394728634a94ab8d1db2d94c28d` |
| `components/weather-alerts.tsx` | `6aa3af8e5808d4db0311693ba204debe448382814fa74d1ed8f40acdae921a0b` |
