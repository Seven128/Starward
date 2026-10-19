# Sky 时间刻度的原生布局换算

2026-10-19。沿同一 PLAN，接续窗口恢复修复；不改时间预览、取消、显式 Apply、星表或绘制语义。手机原先跨日取消后刻度错误仍保留为失败；本次修复尚未在手机验收。

## 决定性事实

root 在完整 A1 r2 的公开 SDK 稳态读到 windowWidth390、相邻 tick 中心间距17px。原代码按34rpx计算17.68px；当 activeIndex33，名义位置583.44，原生offset583.200012；tick33 left165/width17、axis left194.7/width1，中心偏差约-21.7px。prop、原生offset和真实布局是不同读数。此前即刻 cross-day/cancel 的未settled值不作为独立故障。

数值原件只在既有私有owner `resume-20261019/a1-r2-ruler-settled-followup.private.json`。本结论不把 SDK 读数当手机、物理 FPS 或完整视觉一致性证据。

## 当前责任

Sky 专用 `orientation-ruler-layout.ts` 同批读取 axis、tick0/1 rect 和 ScrollView 实际offset，推导实测step和content零点。programmatic定位和drag fraction共用它；Map自身明确几何不合并。测量缺失最多下一tick再试一次，之后保留名义fallback，在下一布局/交互边界恢复。正常同刻度Play不增加查询；未测成功不能称原生对齐通过。

现有 disclosure 有180ms的scale(.76)→1入场。`phase=open`开始过渡，不能用它认证布局单位。既有motion owner旁的 `useSkyOverlayLayoutReady` 由surface自己的transition end准入，不加猜测延时或轮询；reduced motion即时。time consumer将ready与retained children的live active相与，关闭缩放时不沿用旧闭包true。旧端点/读回在替换、隐藏或卸载后不得发布。

resize持拖沿旧投影换算至本次最终提交；resize已标记待测量，结束只请求既有nextTick读回，再替换投影，不在最终offset换算之前清空。原时间和settlement owner不变，窗口变化/取消继续跟随页面供应的真实时刻与rows。

## 验证与剩余

独立审查最终41/41、strict noEmit和diff检查通过，包含原窗口/48与49行恢复、取消、持拖/惯性、resize最终提交33、迟到回调/隐藏/卸载、真实parent JSX与retained component的closing gate，以及120次同刻度render零新增测量/命令。前两项和本轮三项P2的具体失败、修复和最终源码hash保存在 [独审](SKY-RULER-NATIVE-CADENCE-REVIEW.md)，不覆盖旧失败。

沿原完整normal builder生成A1 r3，保留原r1/r2/gen25包；具体候选身份由R17-NORMAL-A1-PREPARATION拥有。仍需当前完整候选的真实transition事件、同批native布局与稳态居中、跨日取消及相关实际操作。离线CSS假设、夹具和编译成功都不替代该验证；gen26 UNKNOWN、A/B与完整Goal义务保留。
