# 覆盖资源工程与产品检查

实际PNG/JSON独立派生；未读取B生成源码。本报告不代替视觉盲评、真机或交互验收。

共 24 张：PNG完整解码 24；错误 0；需审阅 3；证据缺口 0。原生Component 197，Instance 189。

|资源|PNG|组件/实例|错误/审阅/缺口|
|---|---|---|---|
|evidence-r1/coverage-themes-map-day-medium-390.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-themes-map-night-medium-390.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-themes-map-observation-medium-390.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-themes-my-day-normal-390.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-themes-my-night-normal-390.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-themes-my-observation-normal-390.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-map-map-day-large-no-photo-390.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-map-map-day-large-photo-390.json|解码+SHA已记录|13/13|0/2/0|
|evidence-r1/coverage-map-map-day-layers-390.json|解码+SHA已记录|13/5|0/0/0|
|evidence-r1/coverage-map-map-day-partial-stale-risk-390.json|解码+SHA已记录|14/14|0/1/0|
|evidence-r1/coverage-map-map-day-small-390.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-my-my-day-empty-390.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-my-my-day-identity-recovery-390.json|解码+SHA已记录|4/4|0/0/0|
|evidence-r1/coverage-my-my-day-loading-390.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-my-my-day-offline-390.json|解码+SHA已记录|4/4|0/0/0|
|evidence-r1/coverage-sizes-map-day-long-text-320.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-sizes-map-day-medium-375.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-sizes-map-day-medium-430.json|解码+SHA已记录|13/13|0/0/0|
|evidence-r1/coverage-sizes-my-day-long-text-320.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-sizes-my-day-normal-375.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-sizes-my-day-normal-430.json|解码+SHA已记录|3/3|0/0/0|
|evidence-r1/coverage-components-components-day-component-states-390.json|解码+SHA已记录|7/7|0/0/0|
|evidence-r1/coverage-components-components-night-component-states-390.json|解码+SHA已记录|7/7|0/0/0|
|evidence-r1/coverage-components-components-observation-component-states-390.json|解码+SHA已记录|7/7|0/0/0|

## 确切节点发现

### coverage-map-map-day-large-photo-390.json

- **review / scroll-edge-text-crop** — node 1:7026: Visible text is cropped: "天文信息".
- **review / scroll-edge-text-crop** — node 1:7027: Visible text is cropped: "09-07 21:00".

### coverage-map-map-day-partial-stale-risk-390.json

- **review / scroll-edge-text-crop** — node 1:7447: Visible text is cropped: "月光影响较弱".

## 实际图片与静态文档

原始五批24张PNG均已逐图用view_image审阅。PNG复核仅用于发现具体内容/裁切/状态问题，不进行用户审美代评。small/medium/large两种媒体条件的完整文字顺序比较：相同；这不证明运行时是一份文档。缺失组件关联字段的实例数：0。

- Original large-photo visible blank region matches independent PNG nearly-white sampling.
- Original 320 map displays an 8px action-surface fragment; JSON geometry locates route/field/sources clipping.
- Original 430 map has white side gutters around fixed-width external reference; native provider result remains outside this resource evidence.
- Selected favorite uses outline star in all three original component boards; exact vector IDs recorded.
- Recovery/loading/identity/empty My copy was visually inspected against expected fixture meaning; runtime transitions remain unverified.

## evidence-r1 最终复核

24张均使用增强快照；8张SHA变化的PNG已逐图复看，其余16张与已查看的原图SHA一致。197个原生组件、189个实例及其mainComponentId均有原生属性证据；组件关联不是实际编辑传播测试。实测文字颜色组合478处，最低4.767:1（solid祖先法）。全部控件具备44px声明几何；没有新增命中交叠错误。

- Photo is now visible in the same original root; original blank evidence and image-node issue remain in history.
- Observed My contribution icon now uses warm red. Three component selected stars now visibly filled and still consist of native vector nodes.
- 320 map has no partial action-surface fragment; controls remain below medium crop, not deleted. 430 map external-reference gutters no longer visible.
- Risk labels explicitly identify cached temperature/wind; entry closure remains visible.
- Remaining three text crops occur at a native VERTICAL scroll viewport edge. They are retained as review notes; actual scroll reachability still requires interaction verification.

large-photo时间尺1:7028的裁切祖先1:6981、risk天气恢复1:7452的祖先1:7383均实际记录overflowDirection=VERTICAL；因此不能将初始不可见直接判作不可达。仍未实际滚动/点击、测手势及系统返回；所有24板记录的reaction为空，静态状态不是功能原型完成证明。

## 判定与证据边界

- Every visible action has a disjoint target of at least 44 logical pixels in each dimension; clipping can reduce its currently usable target.
- Map has exactly two primary destinations. Small/medium/large preserve an ordered objective document; small/medium crop, only large scrolls. One snapshot does not demonstrate retention across transitions.
- Small need not expose section links/time. Medium must expose identity and section links, while later document evidence may be cropped. Large may place later controls below its scroll viewport only if scroll semantics and actual reachability are separately evidenced.
- Layers replace spot presentation; exactly three analytical choices, LIGHT static, and a single visible discrete time control. No panel star chart or recommendation window.
- My keeps one settings gear, plan, contribution, profile links, import. Recovery state exposes a real local recovery action; missing/loading/identity states must not present fixture counts as resolved facts.
- Day/night/observation preserve meaning. Observation app-owned geometry may use only black/warm-red; external map/image appearance is excluded from this palette assertion and does not prove a safe native transition.

- Static frames do not establish click, drag, tap-no-op, focus, screen-reader semantics, disabled behavior, data requests, LIGHT temporal stability, or production correctness.
- Snapshot sums/absolute bounds establish rectangles, not actual hit-slop or native event dispatch. Sibling paint occlusion, irregular masks and effects are not simulated by this checker. Rectangle intersection is an ancestor-clip measure, not an assertion that every pixel is unobscured.
- Contrast below uses source SOLID colors against an opaque ancestor background. It is not a rendered-pixel contrast certification; image/gradient/transparency backgrounds remain unresolved.
- A clipped scroll child is not automatically inaccessible. When overflowDirection is missing, the report requests evidence instead of treating names/metadata as scroll proof. PNG visual review is separate.

首张large-photo白图属于已知技术失败；旧导出保留，技术重导出须绑定原节点与新PNG SHA。详细节点几何、可见文字、各文字对比度及组件owner均在coverage-check.json。
