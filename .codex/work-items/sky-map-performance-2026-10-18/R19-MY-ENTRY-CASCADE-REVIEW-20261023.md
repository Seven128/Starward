# R19 Map 左上 My 入口级联独立审查 — 2026-10-23

本次为父代理委托的窄独立审查，目标是 WEAPP；只新增本记录，未改生产源码、PLAN、Context、构建/生成目录、服务、IDE 或设备。私有原件保持原位。已使用当前 `uiux_design/SKILL.md`，读当前全局范围及 WEAPP/设计采用责任；无新选稿或资源生成。

## 结论

gen9 首张模拟器实图缺少采用稿明确要求的左上 My 入口，是已证实的当前候选差异。父代理提出并已落在当前工作区的窄修复，在源码级足以消除发现的级联原因；该结论不等于修后目标画面或点击/转场通过。

实际查看的原件：

- 私有 `r19-ui-20261022/gen9-simulator-first-20261023.png`：标题与右侧搜索、定位、天文、添加、图层入口可见，左上 My 不可见；底栏已不显示。
- 当前采用输入 `starward-design-20261022/implementation-input-20261022/review-images/map.png`：左上有原用户图标圆入口，右侧工具的上述顺序一致。两图地图位置、系统栏和视口不同，provider 底图不是采用 UI 的像素基准，本次不据此报告地图/全页尺度偏差。
- 同输入 `source/candidate-preserved/review.mjs` 的 `adaptMap`：`#revision-my` 明确使用原 `account-user`、left 16px、44×44px、z-index 30，子图 26×26px；右侧 rail 是独立 52px 命中单元/44px 可见面，不应把其几何套到 My。

## 级联证据与最小修复

`pages/map/index.tsx` 的 My 按钮同时具备 `map-tool map-my-entry`，且位于全高 `.native-map` 之后。原入口规则与后部 `.map-tool` 同为一个 class，后者的 `position: relative` 取代入口的绝对定位，最后的 52px 工具几何也覆盖原 44px；处于裁切的 `.map-stage` 正常流时，这与实图入口缺失相符。该判断来自实际调用结构、完整相关级联和首图，未将单一选择器标记当成渲染证明。

当前工作区已改为：

- `.map-page .map-my-entry` 保持 absolute/left 16px/top 原 safe-area owner/z-index 30，并显式 width、min-width、height、min-height 为 44Px。
- `.map-page .map-my-entry::before { inset: 0; }` 使独立 44px 入口的可见圆面不被右 rail 的 inset 4Px 缩成 36px。
- `.map-page .map-my-entry > .semantic-icon` 明确 26Px 宽高及 flex-basis；后部通用直系图标 22Px 不再覆盖它。

这些限定的 class specificity 高于后部通用 `.map-tool`，而且不匹配右侧工具，不改变其 52/44/26px 几何。当前主题规则只改相关材质/颜色，未发现更高优先级规则再次覆盖 My 的上述 placement/inset/icon 尺寸。`SharedButton` 的 icon/before 按压仍只改亮度、面阴影和图标 transform，没有移动命中框；本次无需新增按钮或按压实现。

精确 top 继续由 `nativeNavigationInsets()` → `--map-search-top` 提供实际系统/微信安全区，符合当前 owner，不应照抄示例 `top:100px` 到所有设备。`Px` 延用项目已有逻辑像素表达，未改全局转换。

## 剩余证据

本次未发现第二个有足够证据的同批具体源码问题；没有把这句话扩展成整页设计通过。原 gen9 截图早于该修复，不能复用为修后通过证据。父代理应在当前源码的完整新候选中，核对 My 圆面/图标实际显示且可点，并继续原 Map→My→Map 的左右方向、一次 Back、同一物理 Map 和状态保留路径。模拟器截图或源码级联本身不替代手机验收。
