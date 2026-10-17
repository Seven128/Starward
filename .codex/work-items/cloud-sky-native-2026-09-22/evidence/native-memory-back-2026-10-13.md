# 当前进程资源观察与天空返回修复

沿原 PLAN E/F 及同一 active／无预算 Goal。图像冻结、红光暂缓、原 33 项及全部未提交成果保持。本轮由 r38 普通天空的实际资源读回进入，发现新的顶部返回无响应；这不是已通过旅程的例行重测。

## 资源读回范围

任务脚本 [measure-appbrand-memory.mjs](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/measure-appbrand-memory.mjs)复用现有 session／设备绑定／foreground guard，只读当前前景 AppBrand Activity 对应进程的 `dumpsys meminfo`。输出只含数值、非敏感列名、进程哈希及本地候选指纹；没有 raw dump、设备端点或账号字段。PSS/RSS/Swap PSS 单位为 KiB，沿 [Android dumpsys 文档](https://developer.android.com/tools/dumpsys#meminfo)解释。它不枚举完整小程序进程图，不证明 GPU driver 总量、峰值、Sky 独占资源或 200DAU 容量。

| 实际状态 | PSS | RSS | Swap PSS | EGL mtrack | GL mtrack |
| --- | ---: | ---: | ---: | ---: | ---: |
| r38 天空在场 | 2,759,490 | 1,619,796 | 1,399,499 | 407,912 | 41,168 |
| r38 点击返回后仍在天空 | 2,715,447 | 1,581,796 | 1,396,842 | 407,912 | 41,168 |
| r38 设置页，天空已隐藏 | 2,833,797 | 1,709,692 | 1,387,706 | 407,920 | 41,816 |
| r38 设置页后续快照 | 2,697,697 | 1,573,592 | 1,387,690 | 407,920 | 41,816 |
| r39 返回地图，天空已退出 | 2,892,955 | 1,787,280 | 1,368,354 | 432,804 | 44,996 |

原始结构化结果在同 output owner 的 `r38-steady`、`r38-after-sky-exit`、`r38-settings-hidden`、`r38-settings-settled`、`r39-map-after-sky-exit-appbrand-memory.json`。第二份文件名误称退出，实际截图仍为 Sky，因此明确 **不能作为退出释放证据**；保原文件不抹去失败。r39 与 r38 包不同，返回地图还引入 Map 资源，不能把跨状态或跨包差值归因于修复或泄漏。当前大进程快照值得保留，但具体来源未知；没有据此增加缓存、改预算、强停微信或清手机数据。原释放路径已经包含 renderer dispose、`WEBGL_lose_context` 和两个 backing store 归零；存在这些调用也不证明物理资源已释放。

## 修前实际失败

r38／drag-line-clean 指纹 `14f1bc98a9af67ddebc7d8c9aa7601e7bf1c67c9de8129564f6609fadc5fbf23`。fresh capture 后先点顶部返回中心，再点非图标的按钮区域，两个实际输入均未见页面变化。一份过期 capture 输入被守卫拒绝，未发送，单列为 harness 边界，不冒产品失败。

设置按钮正常打开 Settings，实际隐藏天空；设置页共享返回正常恢复 Sky。随后打开天空图层，再点顶部返回，面板仍在；同面板关闭按钮立即关闭。两个命令共用 `canClose`，因此未据猜测修改 Context、日期／校准锁或导航状态。顶部 CoverView 分支与普通 View／SoftButton 分支存在真实平台表现差异，但具体事件／CSS 平台根因未确立。Taro CoverView 支持内嵌 Button，不能声称该组合普遍不支持。

修前失败截图 `r38-layers-back-no-effect.png`、设置隐藏截图 `r38-settings-hidden.png` 保在 API private runtime 的证据目录。截图存放路径只由 CONTINUE 的当前资源记录导航，不公开原始手机图片。

## 修复与受影响验证

普通显示的 `OrientationQuietBack` 收回既有 View／SoftButton／SemanticIcon；仅 OBSERVATION 保原 nativeOverlay 分支，沿用户红光暂缓指令不作进一步开发／验证。唯一 `skyDisclosures.back`、返回优先级、代次／Context 守卫、导航去重和失败 Map fallback 均未改。没有新按钮、返回系统、资源或 renderer。

r39／back-shared 仅一行消费者选择变化。TS5.9 noEmit exit0、普通 build exit0／包预算通过，主包 2,097,108B（余44B），Sky 1,404,473B，总 4,868,335B／284文件，SHA `55f030c1d42039959767b3a8b658ff55534cdd41d11a41ef2f7fb0f19d7d82e8`。官方 auto_preview 完成；fresh bootstrap 实见普通入口和新箭头，进入手动天空后 bind。实际先打开图层，顶部返回关闭面板；下一次顶部返回进入 Map。这是修前失败到修后通过的真实反例，不把旧 source-callback 检查当作手机效果。两份当前结果截图保 private：`r39-layers-back-closed.png`、`r39-sky-back-map-visible.png`。

当前普通箭头实际出现 PNG 与旧共享 CSS fallback 笔画重叠。只在 Sky 夜间返回 icon 的两个伪元素设置 `content:none`，保同一已采用图像和触控范围；不改全局 SemanticIcon／其它页面或红光。未重复未受影响的搜索、日期、姿态、后台、图像批次或旧软件套件。

`sky_back_native_review` 已完成限定只读独审：比较当前源码及两个前像，核共享图标/CSS specificity、实际 Back 命令及三份手机结果图，没有阻断问题。它只认证消费者切换、未扩大共享／OBS 修改及证据范围，未操作手机／运行套件／验证物理资源；结束后已关闭。最终单箭头由主代理实际读回，不用 CSS 源码代替手机结果。

## r40 普通交付与收尾

Candidate identity：普通 r40／back-clean，development_feedback，原 v79 LOCAL／MEMORY_TEST／显式天气 fixture API。SHA `386c2104babc26133be328f56bbdc6366bca7d654329857ac921762f680e5d84`，284 文件／4,868,461B，主包 2,097,108B（余44B）、Sky 1,404,599B；仅 r39 基础加 Sky 局部重复笔画撤回。源项目及所有旧候选保留。

Invocation result：普通 build exit0、包预算通过；官方 auto_preview 完成，fresh bootstrap 08:19 实见普通入口，进入手动后 08:20 实见星空／星座图线名／菜单及单箭头，再按实见 bind。调用与本地 SHA 不冒手机字节或 AppID 独立读回。

Observed product behavior：新单箭头实际清楚可见。r39 顶部返回关闭面板／返回 Map 仍持自己的输入，不因仅图标绘制变化重跑同一功能旅程；没有把 r40 的静帧当作另一轮性能或完整设备验收。

Verified：实际修前失败／修后响应、TS5.9、两次有必要的普通 build/预算、图标原生修复及独审范围成立；产品 Context 更新、结构校验和受影响 diff 检查通过。没有新增测试框架或重跑旧软件套件。

Unverified：其它设备、完整原生验收、最终普通包全部功能／手机字节、整体 FPS／文字物理同帧、动态星点手感、完整进程图／GPU driver峰／Sky独占物理资源仍未闭。大进程快照是尚未归因的观察，不能宣称“已查到泄漏”或“释放通过”。

Invalidated：旧反馈与 bootstrap 输入权均已退出；误名退出样本、过期 capture 拒绝、r38 控件失败及 r39 双箭头保各自真实范围。旧 DevTools 合成失败仍保原，不由 Android 返回修复倒填。

Cleanup：r38/r39 截图先复制到私有 API runtime。旧反馈 stop 首次因额外 PNG 被 `device_feedback_run_cleanup_unknown_entry` 拒绝；四份原截图随后只在核过的 owner 间非递归移动并保存为 `retired-feedback-*`，同清理入口重试成功。r38/r39反馈及 r39/r40bootstrap均 stop，截图／源项目／旧包／手机数据保留。当前普通 r40暖反馈及 API 只由 CONTINUE 持有；无待用户动作、在途推送、活代理或 pending 清理。

整场物理内存、原生文字物理同步、逐帧淡入淡出、整体长帧／FPS、iOS及其它原义务仍 UNVERIFIED／FAILED。修前失败、误名样本和所有旧包保留。当前 Goal 属 progress，不满足 complete。

## r103 当前进程再观察（2026-10-14）

原measure-appbrand-memory仅增加r103采样标签，复用既有session/bundle/设备/前台校验，原数值单位及限制保持。当前ordinary r103/landscape-coarse-recovery-clean SHA679fdc308fd31ef44dbf5a28a01dbb8803502544368f0a94f412b282c3cd1b8d，经实际照片/已绘来源普通检查后作一个退出/重入窗口，无重启、强制GC或raw dump保存。

| 实际状态 | PSS KiB | RSS KiB | Swap PSS KiB | EGL mtrack KiB | GL mtrack KiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| ordinary北低空天空 | 2,716,611 | 1,768,196 | 1,295,479 | 301,652 | 56,752 |
| 实际返回地图入口 | 2,800,992 | 1,872,556 | 1,280,036 | 307,216 | 58,308 |
| 云观星→手动45°重新进入 | 2,868,807 | 1,918,888 | 1,297,636 | 355,516 | 63,464 |

三份processKey相同，原数值文件为r103-ordinary-landscape/r103-sky-exit-entry/r103-sky-reentry-appbrand-memory.json，汇总r103-memory-lifecycle-observation.json。返回Map与重新可见Sky均实际捕获/看缩略操作图，原PNG另保private r103-sky-exit-entry.png/reentry.png；没有把未响应输入叫退出。首次退出tap被60s守卫拒绝未发，fresh再取后captureAgeMs36,936的实际tap成功。后拟补第二次cycle的back又因age拒绝未发；未无限重复。图片操作工具low不支持、原图/缩略区别及其余guard拒绝由continuous-environment/r103结果保原。

这些仍是既有未归因的大进程观察：Map本身分配资源、两个Sky视图也不同，差值不直接归为泄漏/改进/释放，也不能把OS报告PSS当Sky独占实存。当前导航代码已navigateBack/失败switchTab，surface退休已有独立lose-context和两backing store归零；未凭存在这些调用宣称物理释放合格，也未猜测栈增长而改导航。r38/r39同类大快照与限制直接复用，不重跑旧性能suite或改缓存/预算/SDK滤波。完整进程图、native/driver总量和峰、反复退出/真实宽图成本、独审及整场Goal继续未验；进一步采样需新的明确归因问题。