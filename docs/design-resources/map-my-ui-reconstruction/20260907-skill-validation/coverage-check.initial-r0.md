# 覆盖资源工程与产品检查

实际PNG/JSON独立派生；未读取B生成源码。本报告不代替视觉盲评、真机或交互验收。

共 24 张：PNG完整解码 24；错误 1；需审阅 6；证据缺口 2。原生Component 197，Instance 189。

|资源|PNG|组件/实例|错误/审阅/缺口|
|---|---|---|---|
|themes/coverage-themes-map-day-medium-390.json|解码+SHA已记录|13/13|0/0/0|
|themes/coverage-themes-map-night-medium-390.json|解码+SHA已记录|13/13|0/0/0|
|themes/coverage-themes-map-observation-medium-390.json|解码+SHA已记录|13/13|0/0/0|
|themes/coverage-themes-my-day-normal-390.json|解码+SHA已记录|3/3|0/0/0|
|themes/coverage-themes-my-night-normal-390.json|解码+SHA已记录|3/3|0/0/0|
|themes/coverage-themes-my-observation-normal-390.json|解码+SHA已记录|3/3|1/0/0|
|map/coverage-map-map-day-large-no-photo-390.json|解码+SHA已记录|13/13|0/0/0|
|map/coverage-map-map-day-large-photo-390.json|解码+SHA已记录|13/13|0/2/1|
|map/coverage-map-map-day-layers-390.json|解码+SHA已记录|13/5|0/0/0|
|map/coverage-map-map-day-partial-stale-risk-390.json|解码+SHA已记录|14/14|0/1/1|
|map/coverage-map-map-day-small-390.json|解码+SHA已记录|13/13|0/0/0|
|my/coverage-my-my-day-empty-390.json|解码+SHA已记录|3/3|0/0/0|
|my/coverage-my-my-day-identity-recovery-390.json|解码+SHA已记录|4/4|0/0/0|
|my/coverage-my-my-day-loading-390.json|解码+SHA已记录|3/3|0/0/0|
|my/coverage-my-my-day-offline-390.json|解码+SHA已记录|4/4|0/0/0|
|sizes/coverage-sizes-map-day-long-text-320.json|解码+SHA已记录|13/13|0/3/0|
|sizes/coverage-sizes-map-day-medium-375.json|解码+SHA已记录|13/13|0/0/0|
|sizes/coverage-sizes-map-day-medium-430.json|解码+SHA已记录|13/13|0/0/0|
|sizes/coverage-sizes-my-day-long-text-320.json|解码+SHA已记录|3/3|0/0/0|
|sizes/coverage-sizes-my-day-normal-375.json|解码+SHA已记录|3/3|0/0/0|
|sizes/coverage-sizes-my-day-normal-430.json|解码+SHA已记录|3/3|0/0/0|
|components/coverage-components-components-day-component-states-390.json|解码+SHA已记录|7/7|0/0/0|
|components/coverage-components-components-night-component-states-390.json|解码+SHA已记录|7/7|0/0/0|
|components/coverage-components-components-observation-component-states-390.json|解码+SHA已记录|7/7|0/0/0|

## 确切节点发现

### coverage-themes-my-observation-normal-390.json

- **error / observation-palette** — node 1:6469: App-owned fills uses #282b29, outside the black/warm-red family.

### coverage-map-map-day-large-photo-390.json

- **evidence-gap / offscreen-control-scroll-unproven** — node 1:7028: Retained control is outside a clipping ancestor. No recorded scroll property establishes reachability; a node name is insufficient.
- **review / visible-text-crop** — node 1:7026: Visible text is cropped: "天文信息".
- **review / visible-text-crop** — node 1:7027: Visible text is cropped: "09-07 21:00".

### coverage-map-map-day-partial-stale-risk-390.json

- **evidence-gap / offscreen-control-scroll-unproven** — node 1:7452: Retained control is outside a clipping ancestor. No recorded scroll property establishes reachability; a node name is insufficient.
- **review / visible-text-crop** — node 1:7447: Visible text is cropped: "月光影响较弱".

### coverage-sizes-map-day-long-text-320.json

- **review / clipped-target** — node 1:8085: Currently visible target is 89.33×8.00; reachability after scrolling/extent change is separate.
- **review / clipped-target** — node 1:8089: Currently visible target is 89.33×8.00; reachability after scrolling/extent change is separate.
- **review / clipped-target** — node 1:8093: Currently visible target is 89.33×8.00; reachability after scrolling/extent change is separate.

## 判定与证据边界

- Every visible action has a disjoint target of at least 44 logical pixels in each dimension; clipping can reduce its currently usable target.
- Map has exactly two primary destinations. Small/medium/large preserve an ordered objective document; small/medium crop, only large scrolls. One snapshot does not demonstrate retention across transitions.
- Small need not expose section links/time. Medium must expose identity and section links, while later document evidence may be cropped. Large may place later controls below its scroll viewport only if scroll semantics and actual reachability are separately evidenced.
- Layers replace spot presentation; exactly three analytical choices, LIGHT static, and a single visible discrete time control. No panel star chart or recommendation window.
- My keeps one settings gear, plan, contribution, profile links, import. Recovery state exposes a real local recovery action; missing/loading/identity states must not present fixture counts as resolved facts.
- Day/night/observation preserve meaning. Observation app-owned geometry may use only black/warm-red; external map/image appearance is excluded from this palette assertion and does not prove a safe native transition.

- Static frames do not establish click, drag, tap-no-op, focus, screen-reader semantics, disabled behavior, data requests, LIGHT temporal stability, or production correctness.
- Snapshot sums/absolute bounds establish rectangles, not actual hit-slop or native event dispatch. Sibling occlusion is checked only for fully opaque rectangular surfaces; irregular masks/effects and partial occlusion remain unverified.
- Contrast below uses source SOLID colors against an opaque ancestor background. It is not a rendered-pixel contrast certification; image/gradient/transparency backgrounds remain unresolved.
- A clipped scroll child is not automatically inaccessible. When overflowDirection is missing, the report requests evidence instead of treating names/metadata as scroll proof. PNG visual review is separate.

首张large-photo白图属于已知技术失败；旧导出保留，技术重导出须绑定原节点与新PNG SHA。详细节点几何、可见文字、各文字对比度及组件owner均在coverage-check.json。
