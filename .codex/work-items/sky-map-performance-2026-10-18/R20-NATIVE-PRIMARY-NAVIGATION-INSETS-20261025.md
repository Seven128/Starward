# Native 主导航底部安全区修复（2026-10-25）

本批仅修复原生 React Native 五入口底栏的安全区责任，源码完成、等待新独审及 Root 的新 APK／手机前后比较。不是 WEAPP 的 R19 导航改动，不关闭完整 Native／Goal；层叠与 Sky Play 性能、相关内存／OOM保持后置未完成。

## 实际输入与责任

已读适用 AGENTS、default／相关架构和 Native Screen Contract、当前 PLAN 的执行顺序／Native owner及 HANDOFF、完整 Native interaction Skill／mapping／wording、DESIGN Native profile，以及 Source `mobile-shell-and-preferences` 的产品要求、主导航控制、技术／验收／风险和跨 Outcome 约束。无障碍专项按最新 global 范围撤销；正常文字、触控和平台安全区仍保留。

Source `CTRL primary-tab-bar`、当前 Screen Contract及 DESIGN 明确五入口在底部安全区内，保独立路由／共享上下文。历史 mobile page/control targets只保语义，不是当前页面视觉约束；本批沿当前 Native profile／tokens和已有组合，不重新采用或生成资源。

Root给定基线为 main `b4d2654540e203ffa247e31b1cc21db70aeab4e9` 加已独审手工阶段 WIP。Root给定 APK input `45135b72…`／SHA `b0715f391021ecf4a2559964f781aca1c1d82cd9b15afdeaa418e72207b2e6f6` 已安装，本代理没有自行查询设备或 Git来认证这些外部状态。

已实际查看 Root 原始 **1080×2376** Native 帧：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/native-toolchain-20261025-192414098/native-functional-ui/screen-4313d677-5cc1-43da-81f5-cec35e65185b.png`

原帧 SHA256：`ff601f5b427ab3fe2c83556466cce0aded81c9e5e9c20ac9ff4eeeee4edd46be`。五个底部入口与 Android 三键系统导航栏区域重叠，图标／标签被浅色系统层覆盖。源码 `PrimaryTabBar` 原 bar仅固定 minimum 64／padding，未消费 bottom inset；实际上游 `RuntimeRoot` 已有 `SafeAreaProvider`。原件保持 private，没有复制或嵌入到报告。

## 改动与自审

只改 `apps/mobile/src/shell/PrimaryTabBar.tsx`：复用已安装的 `useSafeAreaInsets().bottom`，bar 的 `paddingBottom` 在原 spacing之上加 bottom，外层 `minHeight` 在原64之上加同一 bottom。背景覆盖系统栏保留区域，按钮／文字的内容区域向上保留；未关 edge-to-edge，也没有硬编码本机物理像素。

这是同一外层 box的最小高度与内边距约束，不是在两个嵌套容器重复加 inset。现有 child `minHeight:56`、最小触点、top／horizontal padding、图标／标签／选择标记、palette和按压均保持；bottom为0时两项恢复原值。inset更新随现 hook订阅重算，不保存第二份窗口状态。五个目标、tabPress／navigate、恢复提示保存与当前选中逻辑原字节保持，没有扩展权限、状态或其它壳层。

## 本地验证与冻结

- mobile TypeScript：exit **0**，日志 `tmp/native-primary-navigation-insets-20261025/mobile-typecheck.log`。
- 既有 `application-route`、`native-route-store`、`shell-startup.integration`：**3文件12/12通过**，日志 `existing-shell-consumers.log`。这些有界证据核对已有路由／初始化消费者，**没有实际测量 Native 布局**，也没有以 Source padding镜像断言冒实机效果。未新增此类重复测试。
- 修改文件无尾随空白；8项关键 controls与基线 SHA不变。9项基线／终态原始字节在对应 `baseline-source-inputs/`／`final-source-inputs/`逐件复制并核对。

最终 `tmp/native-primary-navigation-insets-20261025/source-freeze.json`：**9项（1 write／8 unchanged-control）**，SHA256：

`d3da2068a87234e52275f5b2a05651359f24ee78c6f811293f9710b363ac7016`

产品文件 SHA256：`59c51ba9f5698a8d89aad7282736fe9a8ae1c65d2ddd65fa210e869a8e9a1264`。所有自有类型／测试命令终态退出，没有新服务、listener或后台资源；未操作设备／ADB／IDE／构建、网络／VPN／防火墙、供应商、Root 文档／Context或 Git。

## 剩余资格

Root需在新完整 APK和目标身份核对后，比较同条件正常 Native 帧，确认五入口的完整图标／标签／触点在系统导航区域之上、实际点击仍切换正确独立路由。Android修复后画面与实际交互、iOS home indicator／0 inset平台结果及其它 Native／业务／恢复义务仍未验证；源码和本地12项不关闭这些缺口。新独审由 Root另派，本文自审不是独立审查。
