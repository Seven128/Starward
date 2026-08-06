# 微信小程序设计系统绑定快照

## 权威与范围

- 项目视觉权威：`C:/Dev/Starward/DESIGN.md`。
- 采用目标：`target.system.wechat-miniapp-soft-instruments-2026-08-05`。
- 采用章节：`DESIGN.md#wechat-mini-program--soft-instruments-v1`。
- Open Design 设计系统 ID：`user:soft-instruments`。
- 当前资源生成绑定摘要：`5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`。
- `DESIGN.md` 当前文件 SHA-256：`45DDFECF8AD3C9DA7EDC94312F15D3684D513603B5F317A91ADE1DE264E4CEB0`。
- `DESIGN.md` 记录的已采用 provider body SHA-256：`ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745`。

上面两个 provider/绑定摘要属于不同层次：`DESIGN.md` 记录已采用设计系统正文，当前资源生成绑定摘要记录本轮 Open Design 项目所绑定的设计系统身份。它们不互相替代，也不由本快照重新定义。

## 解释优先级

1. 两份 V2.0 方案与已接受的需求变更拥有产品、业务、数据、路由与能力边界。
2. `DESIGN.md` 的微信小程序章节拥有视觉语言、精确 token、组件外观、状态、动效与无障碍姿态。
3. 本资源包把前两者投影成可审查、可实现的页面/组件/状态资源。
4. 若资源与上游权威冲突，应修订 Open Design 上游并生成新的不可变候选；不得在运行时代码或本快照中私自改值。

## 本轮资源的设计系统覆盖

- APP-01—APP-08：页面族、详情、点位夜空、我的、共享组件、跨应用交互、响应式与语义资产。
- MAP-01—MAP-04：地图页原型、页面解剖、组件控件与交互/动效/无障碍。
- 所有精确 UI/UX 值保留在对应 HTML 资源及 `DESIGN.md` 中；本快照只固定血缘和解释边界，不建立第二套 token 真源。

## 可编辑上游

若需要改变小程序设计系统，应在 Open Design 项目 `ds-soft-instruments` 中修订 `user:soft-instruments`，审查新候选，明确采用新身份，再同步更新 `DESIGN.md`。本选定资源包一旦正式采用即保持不可变。
