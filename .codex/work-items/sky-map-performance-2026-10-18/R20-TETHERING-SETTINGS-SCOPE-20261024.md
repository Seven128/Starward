# 授权手机热点设置的窄作用域

## Candidate identity

2026-10-24，接续main `61953dd1` 的环境恢复准备。用户已明确授权root操作电脑和USB手机恢复既有性能分析环境；本作者只修改现有设备工具，不操作实际手机、IDE、网络、API/PG服务或任何普通/冻结构建。本模块不是产品功能、手机已联网或性能通路已恢复的证明。

Root实际只读解析到的入口为 `com.android.settings/.Settings$TetherSettingsActivity`。标准 `WIFI_TETHER_SETTINGS` 在本机返回No activity found，未据此放行未知子Activity。新作用域只接受这个已知系统入口；不能变成通用Android Settings控制器。

## Invocation result

在现有 `device-test.mjs` / `device-adb.mjs` owner增加：

- `open-tethering-settings --session <原会话> --confirm authorized_network_setup`：USB-only；必须先有原Mini Program的60秒内、同设备、单次截图授权。先消费该授权，再验证原前台/焦点/尺寸、系统Settings包和明确未锁的状态，只派发固定 `android.settings.TETHER_SETTINGS` intent到固定组件。组件中的`$`按Android shell规则保护，不提供任意app/activity/command/path参数。
- `capture-tethering-settings --session <原会话>`：必须有该session实际发起的scope receipt和相同USB绑定。实际resumed Activity、主显示焦点、system包/codePath、focused窗口的 `ty=BASE_APPLICATION` 及KeyguardServiceDelegate的showing/inputRestricted/occluded三个明确false都通过后才捕获。未知格式、其它Settings/Launcher/账户Activity、锁屏及同Activity的APPLICATION/ATTACHED_DIALOG窗口都拒绝。
- 后续仍复用原 `capture → 实看 → tap/back`；不接受text/swipe/record或从该scope另开remote/inspect。每次输入单次消费，派发前再核60秒时效；返回原任一非热点owned截图后退休热点scope。默认Mini Program/原WeChat权限/location/picker规则保留。

本机windows dump没有mCurrentFocus，继续使用原displays fallback取主显示焦点，再按同一window id回原windows记录核mAttrs。锁屏解析只使用Root本次实读的KeyguardServiceDelegate段，不拿“预期Activity还在”或单一occluded值冒未锁资格。系统包仍要求SYSTEM标记和system/system_ext/product/apex代码路径；其它路径没有默认准入。

启动回复未知时保留该设备的原scope请求，允许随后用真实Settings捕获判断结果；原截图输入授权已消费，不能重放启动。启动前的拒绝则退休尚未派发的scope。恢复到Mini Program仍需新的实际截图；没有清理WeChat或业务数据。

## Observed product behavior

本作者没有手机观察或输入。合成驱动通过真实CLI/session/AdbDevice代码，只验证了一次固定intent、owned捕获和单次tap/Back的合同，不能证明本机Settings实际布局、热点开关已开启、密码/SSID不变、电脑能连接或API/真机调试端口可达。

## Verified

原件在任务 `tmp/tethering-settings-scope-20261024/`：

| 检查 | 实际结果 |
| --- | --- |
| 两个入口模块语法 | `node --check`各exit0 |
| device + record现有owner | **50/50**，0fail/skip，`device-current.log` |
| 既有 `npm run test:miniapp:device-tools` 总入口 | **82/82**，0fail/skip，`device-tools-current.log` |
| 限定diff检查 | exit0，只有既有LF/CRLF提示 |

两批有重叠，不相加为132项。新增6项有界行为检查覆盖固定Activity/明确授权/USB限制，原fresh授权消费与返回退休，过期/错误scope/系统包/锁屏拒绝，同Activity密码类dialog与未知policy拒绝，禁text/swipe/record及实际派发时过期拒绝，丢启动回复后的capture恢复和设备变化拒绝。原session、截图私有路径/hash/尺寸、旧权限/picker、输入、录制、反馈generation与清理检查保留。

冻结清单是**数组6项**：4份修改文件 `device-adb.mjs`、`device-test.mjs`、`device-test-fixtures.mjs`、`device-test.test.mjs`，以及未改的 `device-session.mjs` / `device-record.mjs` 两份控制。清单SHA `707f4d1fe9cc0962f0d5c355061db4ecf50892c0bd2712d0512a588202c01867`，归 `tmp/tethering-settings-scope-20261024/source-freeze.json`。Root须取得新独立审阅再用于真实手机；本作者冻结后停止源码/测试写入。

## Unverified

实际系统Settings包/codePath、Settings focused base window与布局、父页是否直接有热点开关，均由Root在目标上继续核对。如果父页跳到新的WifiTether子Activity，当前工具会拒绝；只能由Root先实读、确认必要作用域后再处理，不能为通过而允许全部Settings。密码/账户界面继续不准入。

本scope只打开/观察既有系统入口，不覆盖SSID/密码，不直接调用start-softap，不设置网络/安全权限，也不承诺防火墙、VPN/ICS、真实peer/TCP或Performance/Memory可用。热点与电脑WiFi的实际变更和恢复责任仍归Root的网络owner；正式2MiB、Native草稿原owner修复、采用UI/叠层/Sky/内存/OOM及全部Goal义务不被本工具检查关闭。

## Invalidated

启动scope会消费原Mini Program输入授权；热点截图每次授权只准下一次受限输入。错误设备、截图过期或已消费、实际前台/focus/窗口类型/锁状态不符都不提供可用输入权限。返回非热点owned截图后旧热点scope失效。没有重写旧证据、把ordinary反馈升级为验收，或改动先前Native26 / SDK15源码冻结。

## Cleanup

所有本作者检查已退出，测试只用注入驱动与自有临时目录，原件日志保留。无实际设备命令、网络变更、监听、数据库、服务、构建或Git写入。没有修改Skill、Context、PLAN、HANDOFF和他人报告。Root接续独审、实际手机/网络操作及最终收口。
