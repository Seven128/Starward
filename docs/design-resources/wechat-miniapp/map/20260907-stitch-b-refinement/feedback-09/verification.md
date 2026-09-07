# 当前实际验证

2026-09-08，Browser/IAB 390×844逻辑视口，当前feedback09输出。

- 主星容器与文字垂直中心同为750.2px；主星20×20，stage32×28，两颗副星6×6且分别在左上、右下，星体边界不交叠。active截图medium-favorite-active.jpg来自本轮点击完成态（拍摄后补充了设施去框，布局之外无变化）。
- 收藏动效源为720度/1000ms，初始和完成保持正立；浏览器实际点击已观察active。
- 月相内组、气象内组计算背景均rgb(250,250,251)，外border均0px且shadow none；设施卡片border0px、shadow none。天文/气象截图来自补充后的构建。
- 新定位图标在中档实际显示为黑色准星；可访问名称为当前位置。
- Stitch新原稿已实际查看并保存；它超范围改变点位数据、Tab与设施布局，未照搬。
- node --check polish.js通过，context:validate通过（manifest/控制源范围），git diff --check通过。

未验证生产WEAPP、真机触感、全无障碍流程；网页不代表生产完成。

补充：完整取消后aria-pressed=false，主星transform为单位矩阵，副星opacity均0；激活完成为scale(.92)无剩余倾角，transitionDuration为1s。设施无框截图facilities-borderless.jpg已补存。
