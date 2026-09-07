# 当前检查

2026-09-08，Browser/IAB 390×844，feedback10。

- 默认场景截图day.jpg：简洁蓝天白云、雾紫分享、夜空云观星；三个按钮computed border均0。
- 点击开始：progress约.00055、nightReady=false、两副星opacity0；完成：progress1、nightReady=true、两副星opacity1。night.jpg为完成态。
- 标签z-index4，星星前景层2；背景在裁切层0，按钮本身不裁掉44px命中区。
- 两夜空各八个星位，坐标列表不同。云观星同一星点两次实际opacity为.663725和.767371，存在持续亮度变化。
- 快速反转三次后最终pressed=false、progress0、nightReady=false、副星opacity均0，未留下夜景/副星。
- 设施卡片：border0px、shadow none、outline-style none；当前非focus-visible，观察到的细暗边不是CSS描边。照片边缘保留。
- Stitch原稿已渲染检查，与交互稿分开保存；其旧业务/结构偏差未采用。
- node --check scenes.js通过，context:validate与git diff --check通过。最后增加不可见/后台暂停逻辑及默认未选夜星暂停，语法重查通过。

边界：生产WEAPP/真机触感、完整无障碍及系统减少动态效果实机未验证。减少动态效果与不可见暂停有源码处理，不宣称手机验收完成。
