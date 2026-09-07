# B2 推荐方向覆盖脚本

核心依据为已实际回看的 B2 round-1；独立 `design.js` 只接受 `direction:1`。使用同一 `buildDesign` 接口，返回 `metadata` 并写入 root 的 coverageMetadata。主任务独占 Figma 运行、PNG 和同轮 snapshot。当前语法检查通过，尚未执行覆盖稿，视觉状态全部 pending。

## 调用矩阵

- 390×844：map/medium 与 my/normal 各 day、night、observation。
- day 390 地图：small、large-no-photo、large-photo、layers、partial-stale-risk。
- day 390 我的：empty、loading、offline、identity-recovery。
- day 320 两页：long-text。
- day 375/430 两页：map/medium、my/normal。

共 21 张请求覆盖，不包含暂停的200%字号。`large-photo` 必须传 `fixture.photoImageHash`，缺失报错而不创建占位照片。

另支持 `page:'components', state:'component-states', direction:1, width:390, height:844`，day为最小一张；同一个状态板也支持另外两模式。状态板含想去的 default/pressed/selected/disabled/loading，以及设置的 default/pressed 原生组件实例，不属于新增产品页面或A/B样本。

metadata 的 controlVisibility 来自本次Plugin实际节点visible、absoluteTransform、尺寸和祖先clip交集；逐项包含 visible/fullyVisible/clipped/width/height，并给 notFullyVisibleControls。它不证明兄弟节点没有遮挡或视觉质量，导出回看仍必需。

## 事实与状态

已读取共同 coverage-fixture.json。时间轨道只绘制 timeFrames 中显式 20:00、21:00、22:00 的三个条目，不生成假半小时 minor slice；21:00 在节头/图层时间值处唯一标注。无帧时仅保留选中时间的只读刻度并标未验证。三帧均属于 task-local-non-live-fixture，dynamicLayer=null，因此图层显示“图层范围暂无数据”，不画假的空间覆盖，不把测试类型结构当在线 provider 验证。

layers 三项名称核对当前 map/index.tsx overlayLabels 与实际 choice owner，使用“光害 / 总云量 / 今晚观测条件”（LIGHT / TOTAL_CLOUD / OPPORTUNITY）。它们与部分 Context 概括用语不同，保留现有代码入口显示名。LIGHT 明确静态夜光估算，不渲染假的小时变化；第三项无数据，不写推荐窗口结论。一个底部 presentation，同一时刻只保留面板或图层，图层没有把手或新增关闭选项。

small/medium/large 构造同一 ordered doc，只改变 viewport。large 才启用内部滚动；媒体是明确例外，只在 large-photo 在身份前出现，把手叠在图片上，没有额外占位带。点击章节、面板拖动、按方向裁决和重新抓取由现有 owner 实施；静态层级与 scroll 属性不能证明真实连续手势。

partial-stale-risk 是获授权的任务局部状态样例，入口暂时关闭、天气旧值和云量缺失为 **synthetic coverage fixture**，不是该地点实况。该状态的路线按钮标 disabled 并显示原因，天气重试入口与上次记录一起保留。empty 只表示无今晚计划，不清除已有草稿/审核状态。loading/identity-recovery 不填真实账户计数；offline 只显示上次同步记录并给同步恢复入口。长文本也是任务局部长度压力样例，不是正式地点改名。

## 主题与素材边界

自有界面 palette 逐项取当前 DESIGN.md miniapp-tokens JSON：day、night、observation 对应表面、文本、边界、选择、风险和语义色。图标必须由调用方提供对应模式SVG；缺失报错，不退回 day 图标。观测模式自有界面保持黑/暖红，不声称已经验证白闪。

OSM原图始终同一390×480，不调色不自绘。375/320从中央裁切；430画布中央使用原图，额外边缘不伪造新地图数据。原生地图在观测模式下的保护行为没有当前代码支持，脚本没有新造隐藏、取消或返回模式流程。图像属于外部参考，自有UI闭合配色和外部地图未验证分开报告。large时地图完全被面板覆盖，归属也在同一不可见地图范围内；可见地图状态保留 © OpenStreetMap 贡献者。

large-photo 素材已实际用 view_image 查看：Charlie fong 的深圳市天文台2021年照片，来自 Wikimedia Commons，CC BY-SA4.0。原图960×640，本稿按比例缩放为文档宽度，无假现场合成。来源及版权完整记录在共同 assets/ATTRIBUTION.md，节点保留 attribution pluginData，评审外壳需继续展示署名/许可；照片不能证明当前开放状态。核心A/B仍保持原来的无照片fixture。

## 尚未验证

21张覆盖稿尚待实际Scripter执行与逐图回看；对比度和命中需从真实快照检查。截图无法替代原生地图、系统接管、真实身份隔离、手势/滚动/白闪、手机原始比例阅读、人工盲评或用户选择。无新增生产代码或DESIGN修改。
