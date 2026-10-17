# 当前构建公共原生消费者

本次沿已授权 PLAN E 支撑 C/D 的公共署名消费者，未改产品源码或方案。官方 DevTools/CLI 0.3.11 就绪；旧窗口先返回 PROJECT_WINDOW_NOT_FOUND，实际打开原 r5 后错误页可读 SKY1009R5。仅关闭自己新开的旧窗口，保留旧文件。历史构建身份 UNKNOWN 不改写；本轮新证据单列。

当前 plain WEAPP 构建 `apps/wechat-miniapp/dist/weapp-check-common-consumer-1010-r1`，marker SKY1010CP1；274 文件、4,631,020B、bundle SHA `5c0f31032d70ed5d672d0ebb8f0506ed6df632ea1c68d94fbe900b5b407ad1f4`。597 个源码输入和构建绑定在 `output/cloud-sky-native-consumer-2026-10-10-r1/build-binding.json`。正常 Taro 构建通过，原有三类 warning 保留；没有客户端 fixture、验收驱动、诊断或 operator token 注入。

自建 8793 API 使用当前 main factory/controllers、MEMORY_TEST 和显式本地地点/天气；不是持久化或部署。ready 48 行通过，正常 HTTP 创建 Context，报告/路由保存于同输出目录。初次 `.cmd` 导航把 `&` 参数拆开属于 harness 失败；改用安装的官方 Electron CLI `execFile` 参数数组后完整 URL、query、当前 root marker 均实际读回。没有清缓存、改账号或基础库。

## 当前结论

- 当前 DevTools 构建身份 PASSED：SKY1010CP1 出现在实际正常/错误页面文本；有效 Context 与 query 一致。
- 原生公共合成仍 FAILED：`current-sky.jpg` 中手动恢复提示、返回、设置、底部控件可见；真实点击“手动查看”后，`current-sky-manual.jpg` 的星空/星座已绘，而普通控件、返回与 marker 视觉消失，实际 WXML 文本仍存在。两张均实际看审。Canvas 实际 type=2d，Back 实际 CoverView；不以源码推断运行节点。
- 当前运行 platform=devtools、SDK 3.17.4、DPR3、window 390×762。不是手机画面。
- 只读追踪安装工具的截图入口：官方实现临时调整外层模拟器位置/缩放并冻结后捕获；未发现它显式把 Canvas 再覆盖到控件的证据。不能因此断言截图忠实反映所有原生合成，也不能把 DevTools 缺陷猜成产品根因。归因仍 UNKNOWN。
- 历史纯原生 75 行 2D 小样也隐藏普通 View/Button 和 CoverView，透明清除后恢复，见 [既有有界原生试验](p1-current-window-2026-10-07.md)。本轮不重复 z-index、canvasId、CoverView 或重建假设；不把普通样式修补扩到所有消费者。

精确回执 `output/cloud-sky-native-consumer-2026-10-10-r1/composition-observation.json` 绑定截图、运行读回及构建。当前图像专属 native credit/source-return 未闭；四份成品的公共 JSX 数据检查仍仅原软件范围。普通 Prepared 仍未采用，Android/iOS、独审和全部其余义务保留。该共同呈现失败不冻结独立获取、配准与集中图质复核。

## 基础库对照

有界对照副本 `weapp-check-common-consumer-1010-sdk3162` 的273个编译文件与上述构建完全相同，仅项目配置将基础库固定为3.16.2。实际systemInfo读回3.16.2、SKY1010CP1与相同本地Context；手动进入前控件可见，进入后仍被星空遮住，两张实际截图已看。`sdk3162-decision.json` 记录FAILED_NO_COMPOSITION_IMPROVEMENT，不能归因于3.17.4试用库。错误根选择器只记harness失败。自己新开的s2已官方关闭，原s1与产品配置未改；不继续轮换基础库。

## WebView组件框架对照

依据[微信官方适配指引](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/glass-easel/migration.html)，用既有最小原生小样的相同JS/WXML/WXSS，在任务输出中配置WebView、`componentFramework: glass-easel`和`glassEaselWebview: true`。原始官方文档、配置及文件绑定保存在`glass-easel-probe-binding.json`。实际截图仍只有不透明蓝色Canvas；console报告`无效的 app.json ["glassEaselWebview"]`和基础库3.17.4，SDK currentPage超时。因此结果是UNSUPPORTED_CONFIG_NO_IMPROVEMENT，运行时框架UNKNOWN，不能声称已验证glass-easel本身失败。`glass-easel-decision.json`保回执；自己新开的s3已官方关闭，不改产品配置、不继续猜测框架/z-index/版本。公共原生消费者仍FAILED，后续须新的实际环境证据；继续独立交付工作。
