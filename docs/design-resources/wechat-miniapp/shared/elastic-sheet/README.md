# 公共弹性抽屉 · 2026-09-22 待审交互资源

用户要求：上下端橡皮筋阻尼，松手按手势速度选择吸附高度。现有三档、连续文档、章节 Tab、固定动作与导航规则保留。

当前可编辑消费者：[观星点原型](../comfortable-scale-2026-09-22/preview/map-panel.html)。同一原型被地图、计划与记录中的正式点/提案容器复用；内容身份和可用操作仍由宿主决定。图层选择、筛选、新增/编辑表单原本不可拖动，不因本组件升级而获得手柄或多档。

`motion.js` 是所有原型消费者共用的无 DOM 运动单元；`comfortable-scale…/preview/panel-gestures.js` 是唯一观星点适配器。不是生产 Taro 组件。生产 `components/elastic-motion.ts` 与 `pages/map/panel-spring.ts` 已承接阻尼、越界回弹和三档选位，`pages/map/index.tsx` 的正式点位抽屉已使用；2026-09-24 模拟器抽查三档和原有动作。真机触摸/滚动竞争及本候选视觉仍待审，本记录不改变待审身份。

边界与规则：

- 中/大档只有实际可见的顶部带发起拖动；小档可从裁切内容发起。滚动、章节 Tab、照片、时间尺、动作按钮保持原职责；点按把手不换档。
- 正常范围跟手；越界采用渐进阻力，视觉位移渐近72逻辑px。下端可暂时压缩可见文档，不关闭面板，底部动作位置保持不动。文字本身不缩放变形。
- 释放用最近100ms物理样本估速；静止超过50ms清除惯性，速度限±3px/ms，投影180ms后选择最近有效锚点。
- 回弹沿用当前显示位置；越界原始速度乘阻力导数，避免松手突然加速。弹簧质量1/刚度420/阻尼34，按收敛停止、650ms兜底。原280ms统一硬上限不用于此候选的物理收敛。
- 重抓立即停止旧动画，使用逆阻尼还原起点，首帧连续；取消/第二触点恢复原目标，横向意图取消时恢复被打断的吸附。尺寸变化取消拖动并按新几何恢复档位。
- 减少动态效果仍直接跟手，松手即时吸附；键盘Up/Down/Home/End可选档。ARIA数值只在0—2范围内，不随视觉越界。

参考的是成熟交互原则而非移植运行库：[Gorhom Bottom Sheet](https://gorhom.dev/react-native-bottom-sheet/props) 的过度拖拽阻力和关闭独立配置、[use-gesture](https://use-gesture.netlify.app/docs/options/) 的rubberband/bounds，以及其[速度状态](https://use-gesture.netlify.app/docs/state/)。React Native/Web库不能直接充当WEAPP运行时。实际微信触摸滚动竞争与性能仍需目标端验证。

纯函数回归运行 `node --test docs/design-resources/wechat-miniapp/shared/elastic-sheet/motion.test.cjs`。这些测试覆盖速度选档、静止衰减、阻力增长、越界接管与释放连续性，不代替真机检查。
