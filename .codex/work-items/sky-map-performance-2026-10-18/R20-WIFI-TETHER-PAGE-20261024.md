# 已核定 Wi-Fi 热点页的限定导航

## Candidate identity

2026-10-24，接续[初始热点设置作用域](R20-TETHERING-SETTINGS-SCOPE-20261024.md)及其[独审](R20-TETHERING-SETTINGS-SCOPE-REVIEW-20261024.md)。用户已授权root操作电脑与USB手机恢复环境。本作者只扩展现有工具及合成测试，没有接实际设备、改网络、IDE、服务、构建或Git，也未修改Skill、Context、PLAN、HANDOFF、Native26/SDK15冻结源码。

Root已经实看首入口为“更多共享设置”，没有Wi-Fi热点开关；随后真实系统包resolver声明为 `com.android.settings.WIFI_TETHER_SETTINGS → com.android.settings/.Settings$WifiTetherSettingsActivity`。它与先前无匹配的`android.settings.WIFI_TETHER_SETTINGS`前缀不同。本批只准这个已读固定入口，不据此放行其它Settings。

初版数组6项及原源码已逐件保全于 `tmp/tethering-settings-scope-20261024/initial-freeze/`，原manifest SHA `707f4d1f…`不改。当前新数组6项归 `tmp/wifi-tether-page-20261024/source-freeze.json`，SHA `479379f1d6932d783f4435968cd6edd841c3f49782c6826a2a4b4c286b2905da`。

## Invocation result

沿原命令增加闭合页选择，默认`more`保持旧行为：

```text
miniapp:device -- open-tethering-settings --session <原会话> --confirm authorized_network_setup --page wifi
miniapp:device -- capture-tethering-settings --session <原会话> --page wifi
```

Wi-Fi导航仅从原Mini Program或当前owned“更多共享”页的同USB、60秒内、单次截图出发。明确confirm和固定page才会派发上述action与固定、受shell引用保护的component；不提供任意目标字段。普通More入口仍仅从Mini Program进入。

现有原owner/设备身份保留；新Wi-Fi导航增加版本化`wifiNavigation`，记录本次原captureId及请求时刻。旧More receipt缺这份明确记录时，Wi-Fi捕获在screencap前拒绝，不能静默获得新页资格。新捕获标记为独立`wifi-tethering-settings`，只接受WifiTetherSettingsActivity；More scope仍只接受原TetherSettingsActivity。

两页共用原system-package/codePath、实际主显示焦点及同window id的BASE_APPLICATION、KeyguardDelegate三个明确false、尺寸与输入时效守卫。只准tap/Back，text/swipe/record及其它系统/密码dialog仍拒绝。没有新设备身份框架或USB重枚举处理。

启动前消费截图；若导航预检过期且尚未派发，恢复原More owner而不遗失已有有效scope，截图仍已消费。已派发丢回复则保本次明确导航记录供真实捕获判断，不保输入重放。Back到More可重新捕获原页；回Mini Program新捕获后退休整个网络scope。

## Observed product behavior

本作者没有新的手机画面、输入或网络效果。目标Wi-Fi页布局、原SSID/安全类型/热点switch均待root新独审后实际捕获并实看；没有打开热点、修改SSID/密码或声称LAN恢复。

## Verified

原件归 `tmp/wifi-tether-page-20261024/`：

| 检查 | 结果 |
| --- | --- |
| device + record既有owner | 56/56，0fail/skip，`device-current.log` |
| 原`test:miniapp:device-tools`总入口 | 88/88，0fail/skip，`device-tools-current.log` |
| driver/CLI/test语法 | 全部exit0 |
| 初版archive与新source freeze | 各6项逐件读回 |

两批重叠，不相加为144项。新增6条沿现有Main/session/AdbDevice和共享fixture验证：固定两页与任意page拒绝；旧More记录不能授权Wi-Fi、明确导航保原owner及两页/小程序返回；Mini Program可直接导航而其它permission source拒绝、非法导航版本拒绝；派发前过期恢复旧More；已提交导航丢回复后无重放且可捕获；Wi-Fi的system/base-window/unlocked边界。原默认scope和初始全部守卫回归保持，没有削弱原断言。

## Unverified

新独立审阅、实际WifiTetherSettingsActivity画面/控件、保原配置的真实热点操作、电脑匹配profile/peer/API与真机调试端口、Performance/Memory仍未由本批通过。未观察的其它OEM子页继续拒绝，不用一般Settings作为替代。正式主包、Native私人草稿与完整Goal义务全部保留。

## Invalidated

导航与每次输入都消费原截图授权；过期、不同设备、错误活动/focus/window type、未知锁状态不会产生可用输入。旧More记录不自动升级Wi-Fi；本次新源码不能用初版独审覆盖，须新独审后才由root操作设备。初版源码/证据不被新版本覆盖。

## Cleanup

本作者全部检查已退出；只用原合成transport与自有临时project/session，无真实设备、监听或服务。源码已停止写入并冻结，报告之外不再开新检查。没有更改网络、凭据、VPN、手机数据、任何普通/冻结构建或Git。
