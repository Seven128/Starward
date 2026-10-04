# Android 开发反馈，2026-09-22 18:26–18:30

## Candidate identity

development_feedback；generation 2；本地 SHA256 c06f2fd0c305b7cf3401e11ebda35393476c795de21a93b165aad4512c460266；256 files。源码 build lane 为 isolated fixture + LAN API，普通官方预览；地点/天气 MEMORY_TEST，恒星和天文 owner 使用真实数据。不是 settled candidate。

## Invocation result

官方 QR 已生成；用户明确回复已进入云观星、无线调试已开启。复用既有 TLS 配对，发现且选择唯一已授权无线 transport。现有 feedback bind 校验 generation 前后不变并创建设备 session；官方预览 QR 按 owner 清理。设备 session 是私有路径 `C:/Users/777/AppData/Local/Temp/starward-device-feedback-KrQYby/starward-device-test-ii1GXR`。每个输入之前用既有 capture 校验 Mini Program foreground、focus、设备绑定及 60 秒新鲜度；未看微信聊天、其他页面或原始设备标识。

## Observed product behavior

- 初始 1080×2376 实拍：星点、Mizar/Alioth 标签、地平线和 Back、星座、拖动模式及左下三个控件同时可见。vConsole 浮标可见；不是无调试条件证据。DevTools 隐藏普通控件的表现不适用于此帧 Android。
- 点左下天体列表：对象列表展开，目标木星345°/-50°、银河核心222°/23°、目录 M31/M33/M8 可见；缺失流星雨位置明确显示未提供。列表展开不是恒星画布点选或自动定位证据。
- 点击具体 M31 行：弹窗标题 M31/星系，中文说明、NGC224/Andromeda Galaxy、V3.44mag、长短轴177.8/69.7角分、位置角35°、ICRS J2000和可见性限制、OpenNGC来源文本可见。关闭回到原列表。来源底部被滚动区域裁切，尚未验证全文滚动和来源route。
- 在列表开启时点时间轴：列表收起，时间条显示09月22日21:00、UTC+8，左下互斥披露动作可见。
- 时间尺从归一化(0.75,0.71)向(0.45,0.71)滑动500ms。第一次后续capture报device_test_tool_failed；同一会话一次重取成功，未改连接/重启包。页面变为09月23日00:30预览，星点/标签分布改变，出现取消预览。
- 点击取消预览：日期/时刻恢复09月22日21:00，Mizar/Alioth和此前星场恢复。该观察覆盖跨午夜预览与取消的可见结果，不能替代帧计算精度、持久提交、其他观察上下文或性能检查。

## Verified

上述同一代普通开发预览的受保护手机画面与具体动作结果。私有 session 留有 sky-initial.png、sky-object-list.png、sky-m31-details.png、sky-time-open.png、sky-time-next-day-preview.png；当前screen.png为取消后画面。截图查看器将1080×2376缩到931×2048；所有输入按同一显示尺寸计算比例，没有混用原图像素。

## Unverified

手机实际bundle bytes/runtime AppID/SDK的独立读取、true-debug附着、debug-off、iOS、正式发布数据、所有数据层、缩放/点选精度、姿态校准、时间提交持久性、前后台/GPU恢复、性能内存流量、完整设计对照和独立审查。普通预览可见结果不升级为完整验收。

## Invalidated

DevTools画布遮挡不能称Android产品故障。一次失败capture不证明输入失败；旧capture不可继续用于输入。此前generation1超包二维码失败保持历史，不冒充当前状态。主包计量第一次绝对路径调用读0文件已另存invalid-absolute记录，不能作为当前包体证据。

## Cleanup

QR由bind owner清理。私有generation、设备session及warm API仍用于后续开发验证，暂保留；后续仅通过既有owner stop清理。未更改手机权限、配对、全局设置、VPN/防火墙，未发布/上传体验版。继续前须重新capture；当前取消后仍展开时间轴。

## 18:33–18:39 新证据与当前代次变更（覆盖上文当前session状态）

generation2画布Alioth点选实际得到HR4905资料，来源页可进入；系统Back返回保留资料，但Canvas失败且手动重试未恢复。此为明确未修复生命周期缺陷。源码尚未改修复，只制作固定白名单错误码modal诊断包：isolated构建18.985s/3既有warnings/exit0，临时源码try/finally恢复并实际搜索确认不存在Canvas诊断文本。generation3指纹及路径见evidence/android-feedback.json，官方QR已生成、待用户扫码答复。

现有feedback refresh销毁旧device session、撤销旧输入权；此前所有png先复制到私有feedbackRun/phone-evidence-generation2，旧session路径已失效，历史实拍从新私有目录恢复。未将截图复制到repo。generation3只为诊断，不含已宣称修复，尚未bind/手机验证。下一步扫码确认后新session按同一Alioth→来源→返回链复现，读取固定错误码再决定生产修复。
