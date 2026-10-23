# R19 My 返回后的 Map 面板几何独立调查 — 2026-10-23

## 结论与边界

**存在真实、持续的面板外框高度差，尚不能据现有证据确定是哪一个状态 producer 造成。** 进入 My 前的 Map 面板较高；My 左上地图返回后，整个面板顶部下降，固定动作仍在原底部。20:49 的稳定截图仍较短，不能把它解释为尚未完成的 240ms 转场。此差异不能作为“保留 panel/scroll 已通过”的证据，也不能从相机/marker 看似一致反推同一 native Page 或完整 Map identity。

当前采用增量仍为 `3995519477980461148`；本调查不重选稿、不改视觉要求，不更改任何源码、构建、IDE、手机、服务或冻结 R27。只写本记录。对待调查的 My 返回路径，原 PLAN 与 Screen Contract 要求保留选择、相机、面板档位/正文位置和 Observation Context；没有“进入 My 后自动收小档”的产品规则。

## 实际查看的目标证据

同一当前 gen11 已绑定手机 session `starward-device-test-TggVwu`，三张原始 PNG 均已由独审实际查看，分辨率 1080×2376：

- `screen-b86bb400-0bf0-4dde-b6cf-958376ad7605.png`，进入 My 前；sidecar capture `2026-10-22T20:46:16.969Z`，SHA-256 `47ea42813e011a9d1c30b3f27ee6071d80b473f2c6ccb308d37126a8bc2e2929`。
- `screen-81a3d429-e86a-403e-8211-ab914aeded73.png`，My 左上地图返回后。
- `screen-617d8f4d-0ecb-4b54-8af5-1943f2f254fb.png`，之后稳定画面，仍保持较短外框。

原件目录：`C:\Users\momoooo\AppData\Local\Temp\starward-device-feedback-TAV3wm\starward-device-test-TggVwu`。不复制/上传原件；此处不记录地点坐标、账号或接口内容。照片中可见面板身份区、计划恢复入口、路线区的构成近似一致；差异是外框可见高度，不能只归为正文滚动。顶部约从全图 0.508 变为 0.595 是观察估计，未当作 native CSS 像素测量。

Root 另报告：返回录像 2.5s 时 My 仅余左侧约 6%，露出的 Map 面板仍较高；3s 时已较短。该时序支持调查关闭完成/有效 show 边界，但录像帧本身不提供 panelExtent 或原生测量值。此条是 Root 的额外观察，不冒充独审已经逐帧复核。

## 真实 owner 与可解释链路

1. `pages/map/index.tsx:404` 唯一 React `panelExtent` state；正式/私人打开设 medium，图层返回恢复历史 extent，手柄/可访问档位控制使用 `onPanelExtent`，Map 系统 Back 使用 `previousPanelExtent`。My 的打开/关闭命令没有直接 `setPanelExtent`。
2. `index.tsx:546` 的有效 foreground hide 取消焦点、位置、日历、拖动、回弹与旧导航 authority，设 `pageVisible=false`；show 设 true。**它不清 `panelIdentityLayout`，也不重置 `panelExtent`。** `map-page--my-background` 在 `index.scss:21` 仅关 workspace pointer events，没有面板尺寸规则。
3. `index.tsx:1583` 的原生几何 effect 在 `pageVisible`、详情/Context/计划布局、文字模式等依赖变化时重跑。formal 的 floor 是同一个 ScrollView 文档内，从 handle 起点到 route 块末端的跨度，再加固定 action lane 和 8px；包含计划入口、恢复卡、间距。`panel-snap.ts:7` 的跨度中统一 scroll offset 会相消，不应仅因正文滚动改变 floor。hide 退出 effect 会使旧测量失效；return 允许新有效测量安装不同 floor。
4. `index.scss:2065` 的 small 使用内容 floor，medium 又由 `small + snapGap`、preferred medium 和可用高度共同 clamp。普通足够高的视口下 preferred 至少 368 logical px，窄屏另有已存在规则。**floor 重新变小可使 small 直接变短，也可使原来被大 floor 顶高的 medium 回到 preferred。** 因未取得当时 native viewport/extent/rulers，不能用照片估高倒推出进入前必为 medium，更不能排除它原本已是 small 而旧 floor 过大。
5. `use-panel-return-position.ts` 在 visible false 保存实际阅读位置，show 按稳定内容 anchor/实际几何恢复。此 owner 不改外框 extent；它与 floor 测量是不同责任。两张图的标题都在顶部，也不足以验证深层阅读位置保存。
6. `NativeBackBoundary` 的 Map owner 保留 native container，Map callback `index.tsx:2588` 在 My phase 非 closed 时优先处理 My；closed 后才进入 Map 的逐档 Back。若实际出现一条误消费的 Map Back，medium→small 正好能造成此种尺寸变化；**目前没有该事件证据，不将它写为根因。**

## 有界 React/Taro 反证检查

使用现有 `navigation/page-presentation-test-support.ts` 的实际已安装 React 18.3.1 / Taro renderer、未改的 `usePrimaryNavigation` 与完整 `NativeBackBoundary`；从真实 Map AST 提取实际 foregroundLife、show/hide、订阅 effect 与 NativeBack `active` 表达式。仅 native PageContainer 换为记录 props 的观察端口，其他无关业务回调用空端口。不改源文件，不写临时脚本，不构建/操作 IDE 或手机。

需要排除的具体假说：My finishTransition 先给 phase=closed，pageVisible 晚一帧仍 false，导致 `active=false` 程序退出，被误消费一次 Map Back。

两种调用条件均得到以下 commit 序列：

| phase | pageVisible | active | PageContainer.show |
| --- | --- | --- | --- |
| opening | false | true | true |
| open | false | true | true |
| closing | false | true | true |
| closed | true | true | true |

一种沿已有 fixture 的 flushSync timer 入口；另一种直接执行受控的实际 timer callback 后等待 renderer settle。**两者均未出现 active=false 的中间提交。** 因而这份最小实际调度检查不能证实该假说，不应据它预先修改 Back owner；它也不证明真实 native PageContainer 的全部事件时序。已有 native Back lifecycle tests 覆盖 retained-child、hide/show、旧 callback 和 leave/rearm，未覆盖此次完整真机 My→Map 的所有数据/几何状态。

首次运行仅因 fixture 未提供相对导入 `./use-reduced-motion` 的叶子端口失败（到 `zustand` 的非授权加载边界），修正观察端口后上述两种条件均 exit 0；这不是产品失败，也没有安装/更改依赖。读取所有 extent 写入和编译 gen11 WXSS 后，未发现一条明确 My-return→extent-reset 的源代码命令。编译样式仍包含上述 small/medium/large 同组变量。

## 下一项最小观察与修复判据

**先复用当前已守卫手机的系统 Back 一次，不必先加新日志。** 在已确认无更高辅助任务、Map 有效前台的条件下：现 owner 的 small→close 会关闭面板；medium→small 会保留面板。结果能识别“返回后”的当前逻辑档位；不能单独证明进入前后 extent 改变，因为进入前的 state 未采。

若仍需严格区分这两个竞争解释，只需要同一次有限 My roundtrip 的前后各一条非敏感几何样本：`{ extent, contentFloor, actualHeight, smallRuler, mediumRuler, largeRuler }`，来自 **现有 Map 原生几何 effect 的同一批 selector 结果**，并以已存在的 page/visibility 取消围栏拒绝迟到结果。前一条在打开 My 前稳定状态，后一条在关闭完成且当轮 floor 安装并稳定后。不要另开 SDK、混用模拟器值、改变 collector，或记录账号/地点/Context/网络响应。现 `acceptance-diagnostics` 仅已有请求/导航事件和 Sky inspection，没有可直接读取的 panel 字段；冻结 R27 不是当前 gen11 的合法测量入口。需要增加观察时优先在这个已有诊断 owner 内作单个有界、可撤回的本机诊断，并先确保其当前真机读回通道存在。

- **extent 前后不同**：继续定位真实 producer（Map Back、手柄/档位命令及其原生事件），修复对应状态转换的 authority，保留合法 Back 逐档语义；不能硬编码返回 medium。
- **extent 相同、floor/rulers 改变**：核对原生同批 prefix span 与真实内容变化；如是合法异步恢复内容，按现有 content floor/阅读恢复规则判断预期，否则修复漏失效/错误测量处。不能冻结旧大 floor 来掩盖问题。
- **extent 与 floor/rulers 相同但 actualHeight 改变**：调查这一组实际编译样式/原生高度或未退休动画；不要改业务导航来补偿。

当前没有足够证据推荐某个生产补丁。保留这项为 UI 未验收的具体疑点；不扩大成全页重建、相机丢失、性能或内存根因。
