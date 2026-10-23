# R19 Map 工具列与中档净空核对

本记录只覆盖右侧五个工具在中档信息面板出现时的几何。状态：已定位旧底栏占高影响，未改生产布局；须随 R19 去底栏迁移重测。它不是新的实施计划，也不认证目标 UI 已通过。

## 当前证据

- 已实看普通预览 generation 1、bundle `7dad24c4cc7e2a5adb2f06106413f2e3858e3dae2cd5290bc4070102cf605055` 的两张原图：`screen-69accbdb-d489-4f04-a3b9-2cd1cabf6cf7.png` 为中档，层叠按钮被面板盖住；`screen-bdf96306-18f3-4f36-a0ab-7ee9fc2a08b4.png` 为浏览状态，搜索／定位／天文事件／添加／层叠五个可见。文件保留在本机 Temp 的 `starward-device-feedback-TAV3wm/starward-device-test-JNntkd`，尺寸均为 1080×2376；不上传原图。
- 已实看当前采用增量的 `review-images/map.png`，并阅读 `source/candidate-preserved/review.mjs` 的 `adaptMap` 和原完整宿主 `map.html`。增量规定同列顺序、52px 包装、44px 可见面、8px gap，移除原底栏；未增加 medium 专用移位、缩小或滚动工具列。临时恢复根为 `C:/Users/momoooo/AppData/Local/Temp/starward-design-20261022/implementation-input-20261022`，持久事实源仍为 Stitch `7144519510537620825 / 3995519477980461148` 及其原完整源依赖。
- 依据已读的 interaction skill、DESIGN §5A.0–5A.3、Map Screen Contract 和 `map-and-finder.md`：保持真实系统安全区、52px hit／44px face、原工具顺序、三档连续文档、完整身份与固定动作；删除底栏必须同时删除其占高。不得通过 medium 提前隐藏 chrome、缩字或裁掉路线解决问题。

## 几何责任与推导

当前 `pages/map/index.scss` 的有效级联为：

- `.map-top-tools` 起点为 `S + 44Px`，其中 S 来自 `theme/native-metrics.nativeNavigationInsets().safeTop`，经 Map 的 `--map-search-top` 传入。
- 每个工具命中高度 52Px，五项加四个 8Px gap，总高为 `5×52 + 4×8 = 292Px`，完整命中列底缘为 `S + 336Px`。可见圆面在命中盒内 inset 4Px；不能用可见圆面代替完整命中盒算净空。
- `navigation/primary-navigation.primaryNavigationLayout` 仍为 Map 扣去旧导航高度 `N = 1 + 7 + 46 + max(18, safeBottom)`，至少 72Px；`usePrimaryNavigation` 把 `W−N` 作为 `--primary-page-height`。此处 W 是当前原生 windowHeight，safeBottom 由当前原生指标计算。
- `.spot-panel` 和隐藏吸附标尺共用 medium 高度 M。其首选高为 `min(pageHeight−132Px, clamp(368Px,44vh,480Px))`，还受实际 small 内容下限、44Px 档间距及可用高度约束。中档顶缘是 `W−N−M`。
- 在 medium 没有因旧可用高度被夹紧的同一输入下，删除旧占高后中档顶缘变为 `W−M`，工具上方与工具尺寸均不动，净空增加 N。若平台因去除 tabBar 改变 windowHeight，也必须由同一原生几何 owner 重读，不能硬加一个示例高度。

这台手机两帧中，当前第五按钮被盖住的跨度小于旧底栏可见占高。结合当前中档显示和上述公式，**去底栏后同数据中档预计可容纳完整第五命中盒**。这是从当前输出和代码推导出的结论，不是已拍到无底栏的新结果；不得将其记为通过。

## 决定与未验边界

不加 `.map-page--panel-medium` 的临时 top／gap 覆盖，不移动 panel，不改变52／44尺寸和三档内容下限。本轮未改 `index.scss`、几何 owner 或 `index.tsx`；应先完成已经采用的去底栏责任，再复查同一中档与完整层叠命中。

这不保证任意短视口。仅用公式举例，若 W=667、S=68、M=368、N=0，则中档顶缘299、工具命中底缘404，仍有105px几何重叠；该例不是当前手机指标，也不是新目标验收证据。完整源未给出这种短视口下的新增工具重排规则。若最终候选在实际受支持的短视口出现此问题，须在原几何／设计责任内处理真实净空约束，不靠再次减小点击区或裁掉身份内容掩盖。

所需后续证据：去底栏最终候选的 browse→同点 medium、small→medium→large→medium 连续过程，以及受支持短视口的一次针对性读回；确认五个完整命中区、胶囊/标题安全区、面板固定动作与原 chrome fade 时序。静态 CSS 推导不能代替这些目标输出。

没有生产代码变更，因此本子任务未新建镜像测试或运行构建／设备／服务／Git 操作。生产候选、冻结原件和其他未提交工作保持原状。
