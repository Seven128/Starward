# 授权热点设置作用域独审

2026-10-24，独立审阅者`review_authorized_tethering_settings_scope`。只审[本批工具变化](R20-TETHERING-SETTINGS-SCOPE-20261024.md)，没有修改生产或正式测试、Skill、Context、PLAN、HANDOFF、Git，没有操作实际手机、网络、IDE、构建或服务。

**结论：未发现本次范围内未闭合P1/P2。** 源码和独立行为检查支持Root使用这条限定入口进行实际设备反馈。它不证明当前Settings布局、热点开关、PC连接、API/调试TCP或Performance/Memory已可用。

## 冻结和原责任

入口和收尾均逐件核对数组6项，全部匹配：4份变化为`device-adb.mjs`、`device-test.mjs`、共享合成fixture及其现有测试；`device-session.mjs`、`device-record.mjs`两控制未改。原manifest SHA为`707f4d1fe9cc0962f0d5c355061db4ecf50892c0bd2712d0512a588202c01867`。独审实读实际diff、完整CLI/session/record owner及新旧守卫，没有复制作者测试汇总作为独审结果。

- 新入口要求USB、明确`authorized_network_setup`、原Mini Program同设备60秒内截图及captureId。启动前消费输入授权，完整前台/焦点/尺寸与系统包/明确未锁预检后，只派发固定action与已实证组件；组件中的`$`受到Android shell引用保护，不提供任意目标参数。
- 后续capture/input还要求本session的原启动receipt、原盐化设备身份。只接受已实读TetherSettingsActivity、真实主显示focused window及其同window id的BASE_APPLICATION属性、系统包/代码路径和KeyguardDelegate三个明确false。其它Settings/Launcher/账户Activity、同Activity dialog、未知窗口/锁状态不会借该入口进入。
- 复用旧私有截图、尺寸、60秒与单次消费。新scope只允许tap/Back，text/swipe/record仍在原owner拒绝；remote/inspect不能跨活跃热点scope启动。新scope没有扩大默认Mini Program或原WeChat权限/location/picker。
- 启动结果未知保原请求scope供实际捕获恢复，已消费输入不能重放；未派发前的拒绝退休该scope。实际返回其它owned捕获后退休热点scope，恢复仍需新截图。没有清理业务数据或创建网络配置。

## 独立实际检查

使用生产`main`、持久session和`AdbDevice`，仅注入一个不可能启动真实ADB的合成transport；复用原共享PNG/Activity fixture。四条检查分别判断不同责任，最终**4/4、0fail/skip**：

| 检查 | 实际效果 |
| --- | --- |
| 固定启动→owned capture→单次tap/Back→返回 | 一次固定am调用、两次实际input边界调用；已消费输入不可重放；返回新Mini Program捕获后scope退休 |
| 启动预检期间越过60秒 | 最后派发检查拒绝，am调用0；原capture消费，未派发scope退休 |
| 已查看捕获后同Activity出现dialog | 真实input前的窗口资格拒绝，input调用0；原capture消费 |
| 其它窗口是BASE、实际焦点是dialog | 使用displays焦点关联windows同id，拒绝借其它窗口资格；没有新screencap或input |

首轮3/4的唯一失败来自独审fixture对既有归一化坐标端点的错误固定期望（1782）；核对原0..1→0..height-1合同后改为1781，生产和正式测试未改，原失败log保留。最终仍核具体实际tap参数，没有把断言改成只检查函数返回或非零调用。

限定diff-check通过，只有既有换行提示。原件位于任务`tmp/tethering-settings-scope-review-20261024/`：独立probe、首轮/最终log、`observed.json`及收尾六份源hash。测试只创建自有合成外部project/session，按已解析绝对临时目录范围清理；无设备进程、监听或句柄遗留。

## Root继续资格

实际系统包/codePath、BASE窗口、锁状态、完整phone pixels和目标控件仍必须通过新入口读回并实看。不能从合成PNG、Activity resolve或本报告推热点已打开。当前仅准TetherSettingsActivity，任何WifiTether子Activity尚未准入；若真实父页需要进入子页，先保留实际边界，再按同owner最小资格处理，不放开全部Settings。未知确认/密码/账户界面仍停止。

作者82项总入口和50项device/record结果保持各自范围；本独审未机械重跑整组或扩展全仓。正常产品UI、正式包体、真实LAN/业务API、防火墙/共享、性能及完整Goal继续由Root和原证据owner判断。
