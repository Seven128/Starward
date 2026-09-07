# 本轮实际检查

2026-09-08，Browser/IAB，390×844逻辑视口（浏览器内部有亚像素舍入），当前feedback07输出；不是WEAPP真机证明。

- 中档：白底黑图标；顶部padding21→10.5px，拖区仍44px；导航32px可见/44px命中，无边无底。截图 outputs/evidence/medium.jpg。
- 大档：panel与identity顶角计算值均0，顶部坐标88px；三按钮可见32px、扩展命中44px，按钮间10px，动作区48px；截图 large-basic.jpg。
- 天文：可见天文标题位于日期时间首卡；吸顶导航底128px，标题顶约139.7px，未被遮挡；只保留一个程序化章节标题。截图 astronomy.jpg。
- 多图：真实指针从(260,155)拖至(65,155)，相册scrollLeft约256.8px，viewer保持关闭且extent仍large；随后点击打开第二张，翻页到第三张。
- 查看器：总览图中心y约422.0px，左右箭头中心422px，说明起点531px位于图下；设施照片不同纵横比时中心仍422px，说明起点564.5px。截图 viewer-centered.jpg、facility-viewer.jpg。
- 查看器下拉(180,420)→(180,590)后关闭，panel仍large；关闭按钮亦有效。
- Stitch：本轮一次成功，无技术重试，新画板《地图·大档滚到天文·紧凑修订》，完整原稿及当前真实渲染独立保存。原稿有45分钟刻度（与文字说明不一致）、额外圆点/内色块、未经本轮计算的示意月相值；交互稿保留既有半小时刻度、计算月相和克制分组。
- node --check polish.js / gestures.js通过；npm run context:validate通过（只验证manifest与控制源声明）；git diff --check通过，仅既有换行转换提示。

未验证：生产WEAPP、手机实际触摸/系统Back、跨设备触感、无障碍完整流程及生产数据接入。本轮只修改资源与持久规则；不能以网页效果宣称生产已完成。
