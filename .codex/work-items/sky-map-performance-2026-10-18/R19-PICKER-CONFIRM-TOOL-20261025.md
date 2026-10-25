# R19 微信系统选点器：有界确认入口

2026-10-25。仅实现既有设备诊断 owner 的窄工具入口，没有操作实际设备、IDE、共享服务、网络、Git 或 App。Root 已从实际授权小程序搜索流程打开并观察 `SoSoProxyUI`；本记录不把该历史观察或本次注入测试写成成功选点结果。

## 改动与边界

- 现有 `capture-location-picker` 保留同设备、bundle、WeChat launcher、同 user/task 的 AppBrand 返回 owner、前台/focus/display 资格和 60 秒单次截图授权。
- 新入口为 `confirm-location-picker --session <directory> --x <normalized-x> --y <normalized-y> --confirm selected_location_reviewed [--transport usb|wireless]`。操作者必须实际查看当前截图中的选中地点和右上 `完成`；标记表示该次审阅，不代表已成功提交。
- 只允许 portrait 中保守的 `x=0.85..0.92`、`y=0.058..0.078`。该区域落在 Root 观察到的 1080×2376 画面右上完成按钮内部，避开状态栏、取消、地图、搜索和结果列表。其它布局若不包含此区域，不准点击；须另外观察和收口支持范围。
- 普通 `tap`、`text`、`swipe` 在 picker 中仍拒绝，取消仍走 `back`。确认不能用于其它 permission scope，不能附带浏览地图或选择其它结果。
- 确认沿原 `AdbDevice.input` 复用前台/owner/focus/截图/旋转重查和既有归一化坐标换算，最终只发一个 `input tap`；main 在派发前再次检查原截图是否仍新鲜。授权先消费，失败或未知效果不得直接重放。
- 更新现有设备 Context 与项目 Skill 的命令入口说明，没有另建执行平台或扩大其它系统窗口权限。

## 实际检查

`node tools/run-node.cjs --test tools/miniapp/device-test.test.mjs tools/miniapp/device-feedback.test.mjs tools/miniapp/device-feedback-preview.test.mjs tools/miniapp/device-feedback-boundaries.test.mjs`：**92/92 pass，0 skipped**。

新增注入断言覆盖显式 review、唯一成功派发/拒绝重放、其它 scope、区域/非有限坐标、display 与 foreground 改变，以及预检过程中截图过期时零派发。既有同 user/task owner、device/bundle、输入/记录边界测试继续通过。首轮只有成功测试里的像素期望按旧 owner 的 `width-1` 转换差 1 像素，已修正测试期望；没有因此改生产坐标规则。

尚需 Root 独立审阅，然后对当前实际 picker 重新 capture/查看，再调用确认并取得返回小程序画面和状态。当前没有真实确认派发、GPS/精度、Context commit 或完整 H5 验收结论。没有改产品源码、WEAPP 构建或冻结候选。
