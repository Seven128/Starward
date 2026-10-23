## Candidate identity

`development_feedback`，normal gen13 普通预览、原授权 Android 手机、USB，保留可见 vConsole 开发条件。沿用 root 已完成的官方自动送达、实际手机查看和 bind；本批没有重新送达或建立另一个候选。父任务说明本代无 R19P 探针，本批未调用探针。

本批读取的当前 session 与 feedback 的绑定一致，bundle SHA-256 为 `3b466e1f303a7b291dac3f2ccfadb139573bcd6b7d16375451e91f7158ebe55d`，345 件、5,021,355 B。公共命令对每次操作执行现有 bundle/session/设备/前台/尺寸检查；这不提供手机字节证明或 runtime AppID 认证。

范围沿 [公共按压采用与实现](R19-SHARED-PRESS-IMPLEMENTATION-20261022.md)；已读 [Picker 边界](R19-PICKER-PRESS-IMPLEMENTATION-20261023.md)，本批不进入 Picker。实际查看当前采用包的 `press.png`、`layers-cloud.png` 及按压源。精确参数来自采用源，不由本次手机静态输出反推。

## Invocation result

手机输入独占期间只复用现有 `capture-owned-review-frame.mjs` 和公共 `tools/miniapp/device-test.mjs`。四次 fresh capture 均返回 1080×2376 的普通 Mini Program scope，按现有 wrapper 比例生成 450×990 审阅图并实际查看；另有录像 owner 生成的独立最终截图。所有命令 exit 0，无 guard 拒绝、超时或重复手势。

实际输入顺序为：大档正文后一次系统 Back；从 fresh 中档审阅图读出右侧层叠 glyph 中心 `(405,463)`，按同一 450×990 坐标系归一化后，一次 `record-swipe` 起止同点、`ms=300`、`seconds=6`；fresh 层叠审阅后一次系统 Back。每次输入消费自己的 60 秒内单次截图授权，没有额外 tap、开关操作、数据重试或原始 ADB input。

录像已保存。root 以现有 `extract-owned-video-frames.cjs` 解码后，本 agent 只读 metadata 并实际查看 2.6、2.8、3.0 秒三张原尺寸帧；本 agent 未另开 browser 或解码脚本。编码覆盖实际为 3.744611 秒、1080×2376，不能将请求的6秒写为实际覆盖，也不能由编码时间推导物理触摸时长。

## Observed product behavior

1. 首次实际画面为大档正文的开放/设施/攻略附近。一次系统 Back 后地图恢复占据上半屏，点位面板降为中档，正文仍从开放信息附近显示，没有整体关闭面板或退出 Mini Program。
2. 300 ms 同点手势后层叠正常打开，不需 fallback tap。层叠显示标题行的地形勾选与来源信息图标、夜光未选、云量已选，日期/时间尺、历史时段说明及可用时段。所见默认状态是本次继承的当前状态，未重置或切换。层叠从标题至底部可用时段均在一屏内；右下 vConsole 仍覆盖局部内容，不能据此认证整屏无遮挡。
3. 来源入口图标可见，本批未打开来源页；不能凭入口存在认证来源正文或完整归因。云量画面显示历史时段及有效范围提示，没有通过重试或换时间制造可用结果。
4. 层叠一次系统 Back 后关闭，地图、原点位标记及同一点中档面板仍在；面板现在从身份/地址文档头显示，和打开前的开放信息滚动位置不同。正文位置保持存在可见差异，交 root 在其状态 owner 判断和修复，不能写成全量恢复通过。
5. 关闭后的实际画面出现近期天气数据异常及可在近期天气中重试的通知。本批没有重试，未将该产品/环境症状解释为设备通道故障。
6. 实际查看的录像中，2.6秒仍为原中档画面；2.8秒层叠圆面比2.6秒稍暗，图标出现轻压的可见差异，按钮和正文布局保持原位；3.0秒已进入层叠呈现。该样本支持此圆按钮有触按外观变化，方向与采用示意一致；释放后即切入层叠，三张采样没有直接展开同一按钮的完整释放恢复过程，不能认证完整动态符合。

## Verified

- 本批公共 USB capture/input/recording 通道按现有 guard 完成；每个输入前实际查看最新450比例图，单次输入后检查结果。
- 当前候选的大档正文经一次系统 Back 降为中档；原正文位置在该步可见保留。
- 当前层叠圆按钮的同点300 ms手势能够打开层叠；随后系统 Back 关闭层叠且同一点中档仍在。
- 原尺寸关键帧提供圆按钮变暗/轻压的有限目标运行时证据；未见因这段反馈而将正文或按钮整体布局缩放。
- 本批没有改变地形、云量、夜光选择，没有触发 Sky Play、Picker 或私有 API。
- 必要原件已复制至既有私有 owner 下唯一目录 `gen13-shared-press-layer-20261023`，包括五份原截图及回执、四份450审阅图及派生说明、一份原录像和哈希清单。录像 SHA-256 为 `0cd27dcca4fa5630d169adf4639981475804d1425aaea1ad29b172f03f59852d`。

## Unverified

- 关键帧仅建立上述有限按下变化；完整按下到释放的连续性及释放恢复过程未被这三张采样直接建立，不能写为全部按压状态通过。300 ms 是请求的输入参数，不是物理触摸时长实测；实际编码3.744611秒也不是请求6秒的完整覆盖。
- 80/140 ms、图标 .94/1px、逐帧时序、触觉、滑出/滚动接管/touchcancel、隐藏恢复、禁用/loading、快速重复、其他共享消费者及 native Picker 均未在本批认证。
- 层叠关闭后的正文位置恢复存在上述差异；本批不改源码、不扩路径确认原因。来源阅读、实时数据成功、完整短署名、vConsole 遮挡区域及全量 UI 符合也未认证。
- Sky 返回 Map 的先前步骤由 root 持有证据，本批仅从其交接后的 Map 开始；没有重新进入 Sky。其他主题、设备、iPhone、进程冷启、真实定位/传感器、runtime AppID、完整产品验收仍未验证。

## Invalidated

未观察到本批 bundle/session/display 漂移；未复用旧图输入授权、旧坐标或旧代按压证据。历史 gen3 录像及其他代结果不转绑本代。最终截图仅记录本次终态，授权到期后必须重新 capture/view；不能作为后续输入凭证。

## Cleanup

规定输入结束后立即归还 root 唯一手机输入权，不再 capture/input。当前手机停在同一点 Map 中档，层叠关闭，vConsole 未触碰；无待重试手势。必要原件保存在 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/gen13-shared-press-layer-20261023`，原 session 继续由 root 持有，本批不 stop/删除它。

未修改源码、服务、构建、IDE/预览、账号、存储、冻结候选、VPN 或现有私有原件；未提交、上传或创建新浏览器/解码脚本。仅新增本报告并归档本批必要证据；root 现有解码结果另由 `gen13-shared-press-layer-video-review` 持有，本 agent 只查看指定关键帧。有限按压观察不能据此结束 R19 或提升为 settled-candidate acceptance。
