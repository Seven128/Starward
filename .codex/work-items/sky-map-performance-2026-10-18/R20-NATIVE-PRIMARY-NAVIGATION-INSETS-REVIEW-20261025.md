# Native 主导航安全区独立审查（2026-10-25）

结论：**本次冻结源码与 Root 提供的正常 Android 输出范围内通过，未发现新增 P1/P2。** 原底栏落入系统三键区域的差异，已在新 APK 的今晚、My及偏好页实际原图中消除。Root 负责的安装／输入回执与本审阅者对原图／源码的直接检查分别成立；不是 iOS、完整导航旅程、私有 API业务或完整 Native／Goal 验收。

## 输入与边界

已读适用 AGENTS、default／相关架构和 Native Screen Contract、唯一 PLAN 的当前顺序／Native责任、最新 HANDOFF、完整 Native UIUX Skill及 mapping／wording、DESIGN Native profile，以及 Source 的五入口、独立路由、`CTRL primary-tab-bar`、导航架构／验收与相关跨 Outcome 义务。global 已撤销无障碍专项，本轮未重新扩大范围。旧 page/control targets仅保语义，不是当前页面视觉约束；没有套用 WEAPP R19、重新设计或创建资源。两类性能继续后置，其他未完义务保留。

输入清单为 `tmp/native-primary-navigation-insets-20261025/source-freeze.json`：**9项（1 write／8 control）**，SHA256：

`d3da2068a87234e52275f5b2a05651359f24ee78c6f811293f9710b363ac7016`

开始和结束逐件长度／SHA均匹配。没有改产品、配置、Root文档／Context或 Git；没有操作设备／ADB、构建、服务、网络或 provider。

## 源码与真实消费者

- 唯一产品改动是 `PrimaryTabBar.tsx` 取得已有 `useSafeAreaInsets().bottom`，传给同一 bar样式的最小高度与底部 padding。它们是一个 border-box的约束，未在两层容器重复增加 inset；原 child最低56逻辑像素、横向布局、top padding和图标／文字保持，bottom为0时恢复原值。背景延续到保留区，内容留在其上。
- 实际 `app/_layout.tsx → RuntimeRoot → SafeAreaProvider → Tabs → PrimaryTabBar` 链存在。已按当前已安装 Expo Router 的实际 exports查到其 vendored `BottomTabView`，没有假设根目录另一个 React Navigation版本。custom bar在正常 column流中，screens为flex区域，父层没有固定64高度截断新 bar；其 `SafeAreaProviderCompat`在已有insets时直接复用上层Provider，没有再包一层 padding。
- `react-native-safe-area-context`实际Provider只在有效insets存在时呈现子树，原生insets更新会传到hook；没有第二份窗口状态或静态设备像素。原设计证据style未引入覆盖安全区的高度限制。
- 独立源码投影校对确认：撤回声明的import／hook／样式参数和两处bar值后，与作者保存的基线正文完全相同。五入口、tabPress取消、真实navigate、恢复提示保存、选中／theme／pressed逻辑未被本修复改动。该检查仅证明改动范围，**不是 Native布局测试**。证据为 `tmp/review-native-primary-navigation-insets-20261025/initial-scope-check.json`及末次`scope-check.json`；未增加镜像padding实现的产品测试。
- 复用作者的 mobile type终态与既有3文件12/12，不重跑已回答的路由案例；这些结果仍不代替设备布局或点击效果。

## 独立实看 Android 前后输出

原件均保留于 Root 的 private owner，未复制／嵌入报告。

- 基线旧 APK `b0715f39…`：`native-functional-ui/screen-4313d677-5cc1-43da-81f5-cec35e65185b.png`（SHA `ff601f5b427ab3fe2c83556466cce0aded81c9e5e9c20ac9ff4eeeee4edd46be`）及稍后不可用态 `screen-ec0cd7dc-48d6-4ba7-89a7-7871e757cc49.png`（SHA `6a3e2e3d887af0817c61d67285fcd6f44dc129c85248afcf4a6330b228256e3b`）均已实际查看。五个入口的图标／标签落入系统区域并被浅色层覆盖，非仅启动中内容差异。
- 新 APK：Root报告 input `3a91c623547020d7e2b8eb2a17ccd84f0f6528329e67666f274f924d86d8656a`，APK SHA `53960d39ea3d5e865306699e49497cd74919b996efeb6ab96a635079383cce1e`、38,346,811B，同证书／installed SHA已由Root读回。本审阅者没有自行查询设备来重证安装。
- 实看 `native-functional-ui-53960d39/screen-fd5774b0-63ee-42c0-b012-ef25aa86b6bb.png`：同1080×2376、portrait、planning、普通MainActivity今晚不可用态，五图标／标签／选中标记均完整位于三键栏之上。与基线匹配的chrome条件下，原遮挡已消除，原palette可读。其PNG SHA `cfb4b6a9a0f8b0d07ab65c97ab911440e5919d6bf4b6dcc539507663ecbf527a`与sidecar相符，sidecar绑定上述新APK／MainActivity。
- Root随后实际点击My再进入偏好；本审阅者直接查看 `screen-f0b002ae-603d-450a-8365-c63bb84ff96a.png`与`screen-289df83f-9482-4ac3-80f4-a0a500021d51.png`及sidecar，PNG hash均相符、均为同新APK／MainActivity。My内容与选中状态正确，偏好页仍保正常底栏。两张不同消费者输出没有重新出现遮挡；动作由Root执行，本审阅者未代操作。

上述private目录完整前缀：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/native-toolchain-20261025-192414098/`。

## 仍未验证与收尾

没有把这组普通 Android画面扩大为所有设备／横屏、iOS home indicator或全部触点／路由／键盘／模式接受。零inset仅有源码等价范围；完整五路切换／恢复和 Root仍在进行的真实定位／偏好持久化另有责任。私有手机 API、生产与完整 family仍未资格。既存 raw neutral／release-context文案属于原投影例外，未据此中断本次安全区修复，也未宣称修复。

所有本审查命令已终态退出，无listener、浏览器、设备连接或新后台资源；仅创建自有tmp解析／校对记录和本报告。9项源码末次仍与冻结一致。
