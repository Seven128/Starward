# R19 Sky 天体正文视口候选：独立审查

2026-10-22。独立子代理 `sky_body_layout_review`。只读审查当前候选代码、调用方、实际 gen7 图及相关采用合同；仅写本报告。未改生产源码、PLAN、HANDOFF、Context，未操作设备、IDE、服务，未运行构建或重复执行测试。

## 结论与资格

本次限定变更中**未发现可确认的新增 P1/P2**。普通 View 分配剩余高度、增强原生 ScrollView 绝对填满其明确视口，并将正文 padding 移入内容 View，形成了清楚的尺寸链；没有删改资料或把来源页的成功替代正文结果。可以进入根代理统一新候选的目标复验。

**gen7 天体正文空白 P2 仍未关闭。** 本次没有修复后 WEAPP 几何、WXML 或真机可见正文结果，不能证明旧百分比高度/测量组合是唯一根因。现有 renderer 检查只证明内容交接与节点连续性，不计算目标原生高度。

## 实际输入及采用边界

- 阅读当前交互 Skill、其文案/层级方法、`global.md`、Mini Program Screen Contract、`spot-and-sky.md` 的菜单/资料/来源合同及 `DESIGN.md` 对应小程序范围。当前采用源为 Stitch `7144519510537620825 / 5385664345158066168`，本修复不重新选稿、生成或改动其他设计范围。
- 实际通过 `view_image` 查看私有 gen7 `starward-device-test-bCQoHb` 的两张 1080×2376 原图：`screen-434c3899-4c0b-4b66-b221-00e034e064f6.png`（14:22:10.814Z，SHA `2c4fc30a1662169e5596b18cdf3edbe25db5674c321f74d77a9b820e48dfd9e8`）和 `screen-f9906b47-fbe1-44ac-9a94-13c52331b38e.png`（14:24:49.828Z，SHA `9e56cd607e80eac2b5d5fb9d0a45a7deb790afaa7571701cca4ed6dcbc268dc2`）。两图保 Alderamin / HR8162、三动作、北353.1°与高度49.3°，分隔线以下没有正常可读的资料正文，大部分为空；第二图局部淡文字也不构成可用正文。它们属于修复前候选。
- 当前会话未能重新实看现行 Stitch HTML/图片。定点核对 `menu-implementation-2026-10-17.md` 所记临时路径 `%TEMP%/starward-sky-menu-implementation-20261017`，实际不存在；未广扫 TEMP，未用已撤销的旧设计替代。已读历史采用/独审记录只用于找资源及理解责任，不冒当前视觉对照证据。本报告因此不认证像素还原。

## 代码责任审查

1. **尺寸闭环。** `SkyDisclosureSurface` 的绝对定位外壳仍由真实 `--sky-controls-top` 与底部安全区限定可用高度，border-box、纵向 flex 与原材质不变。`SkyObjectDialog` 的满高纵向容器和 `min-height:0` 保留；Header `flex:0 0 auto` 依真实身份/优先动作内容占高。新 `__viewport` 以 `flex:1 1 0; min-height:0; position:relative` 接收余量；`__body` 用绝对定位及 `height:100%` 取得该视口，`__content` 自然伸长并承担原16Px padding。不存在继续以呈现缩放矩形推导正文高度的第二个 state 或 CSS 变量。外层 `overflow:hidden` 只限定视口，内部唯一 ScrollView 仍允许长正文滚动，不以裁掉内容冒滚动。
2. **身份、动作与全文。** Header 的原布局、身份居中、小返回箭头的条件、定位/跟踪/来源顺序及尺寸规则未变。公共来源按钮仍为44Px；原位置动作继续由自己的 query/suspended/retry owner 提供。`SkyTargetInformation` 的短说明、参考时段与限制，`SkyCatalogInformation` 的 pending、error/unavailable、stale、partial、介绍/别名/全部事实仍作为完整 children 进入同一个正文内容 View。新增包装不命中原事实行的直接子选择器，也不把优先区放进正文滚动。
3. **异步状态与恢复。** 位置从等待到成功、缺目录/失败/旧资料及重试可改变 Header 实际高度，新余量由同一布局重新分配，不需先取得可能经过 scale 的原生矩形。移除的 `SkyObjectPriorityLayout` 只有这一布局通知责任；全源码检索已无旧 hook、context 或 `--sky-modal-header-height` 消费者。位置/资料请求与取消、失效、重试没有被删改。
4. **动效、Back 与来源返回。** 父 `SkyOverlayMotion`、披露 surface/backdrop 的点击隔离、关闭 shield、中心缩放与迟到卸载防护不变；新正文仍在原 surface 内随同入退场，没有新增页面级手势。两类 caller 的 `active`/`pageVisible`、目录精确身份/出版、统一 `openSkySources` 与 sourceReturn/Canvas 生命周期保持。隐藏或来源返回时无需复活一个旧测量 ticket；没有增加定时器、订阅、缓存或资源常驻。此次不新增正文 scrollTop 的保存承诺，也没有修改现有关闭/恢复选择事务。
5. **resize 与安全区。** 高度链仍从同一原生 inset/可用页面区域取得约束，resize 可通过布局更新余量；没有固化某张手机图的像素高度或改 Canvas 几何。代码成立不证明实际短视口和原生合成结果，相关目标证据仍由统一候选取得，不扩成新的全主题/设备矩阵。

## 检查证据与剩余动作

已阅读执行方 `R19-SKY-OBJECT-BODY-REPAIR-20261022.md` 记录的4项受影响检查及 TypeScript exit0；本审查没有重跑。实际阅读新 `sky-object-dialog.test.ts`，它使用 React/Taro renderer，但把 Surface 和基础控件替为相应元素：可以证明 children 进入 scroll-view、状态更新替掉旧内容并保同一节点；不能证明 WXSS 生效、原生 viewport 非零、滚动到底或返回首帧。

根代理合批新候选只需围绕原失败及受影响责任复验：同一 HR8162 资料在分隔线下实际可读，真实长资料可滚至最后事实且原 Header/三动作可达，来源 Back 后仍为原对象/时刻与非空星图且正文可用。短报告目标作为另一个真实 caller 只需核其原短正文和参考信息，不逐对象复制循环。若新包仍空白，下一步应关联同次 query 输出、实际正文 child/WXML 与祖先/ScrollView 原生矩形，不能仅继续堆 CSS 或据来源页数据猜 modal 已有资料。

当前 `spot-and-sky.md` 菜单实现责任和资料段仍保留“异步位置状态经共享布局通知”“内容滚动与测量责任”等旧实现措辞。候选责任确定后应由根代理在原 owner 对齐为当前视口布局责任；这是同批集成收尾，不将 Context 文字变更当原生通过。

本次审查输入 SHA256：

| 文件 | SHA256 |
| --- | --- |
| `sky-object-dialog.tsx` | `1fae3228548e6da09564bd3c62f3dfae8fc9ca7f9b68a7fa16f4786c79f4492b` |
| `sky-object-position-action.tsx` | `b9a8c1bcf5abe2453d91a9d4bfc2d26383b302934ea1d53bc6a9f93430c6809e` |
| `spot-sky-page.scss` | `9baff6297290f5169d9c337002a0b4c0853f488e5908643b2d6a7c9b190c9c24` |
| `sky-overlay-motion.tsx` | `d49d805edb9249689419070722f53bb76fdfc36abf046b08ddf4be356ae7a292` |
| `sky-overlay-motion.scss` | `58d9ffc35b88b55e45abc7b13d08edfb016953463bde73e8b7f8989619aa7fc7` |
| `sky-object-dialog.test.ts` | `4b20de2429194304b1ccb21b646f3a3bb26a6d76e77be0f531c47b9b7744f4d1` |

报告完成；原空白 P2、资源重新实看缺口与目标验证资格均按上述边界保留。
