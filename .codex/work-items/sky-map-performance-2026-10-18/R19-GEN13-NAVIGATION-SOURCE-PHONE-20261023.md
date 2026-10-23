# R19 gen13 导航与来源目标反馈

2026-10-23。Root 正式交接同一普通 gen13 手机输入独占权后执行。仅为 `development_feedback`；复用当前普通预览、原 USB 守卫与公开 `tools/miniapp/device-test.mjs`，不启动 SDK/DevTools 会话，不改源码、构建、服务、账号或数据。

## Candidate identity

- 当前 prepared：`generation-000013-SkNq7c/project`；本机 bundle `3b466e1f303a7b291dac3f2ccfadb139573bcd6b7d16375451e91f7158ebe55d`，345 件、5,021,355 B。自动预览 success/bind 沿 Root 已核结果复用，没有重新推送或绑定。
- 私有 session：`C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/starward-device-test-tbscVR`。完整手机字节/runtime AppID 未读回；不作 settled-candidate 身份认证。

## Invocation result

- 每次通过现有 `capture-owned-review-frame.mjs` 调用公共 capture，保原始 1080×2376 图、私有 receipt 与 450px 等比 review；实际 view 后 60 秒内只发送一次输入。
- A 仅两次公开 `record-tap --seconds 6`，均 exit0；分别点击当前 Map 可见 Search 与 Search 可见页内 leading Back。A 没有发送系统 Back、文字或拖动。
- 私有视频均在上述 session：`recording-1792706148033.mp4`（进入 Search）、`recording-1792706172156.mp4`（页内 Back 返回 Map）。Root 已复用既有 helper 各解码 12 帧并实际查看；browser/server 均关闭，执行代理未另开解码浏览器。对应私有 `r19-ui-20261022/gen13-search-entry-review/frames.json` 与 `gen13-search-return-review/frames.json` 保留解码身份。
- Root 明确交付 B 媒体范围后，使用当前面板可见手柄上拉 large，经真实“查看攻略→阅读攻略”进入原文章，滚到有效 TEST 图并点其公共来源。单次复制后使用一次公共系统 Back。
- Root 随后明确交付唯一 Sky 正文范围：从文章正常 Back 经攻略回 Map，点原“云观星”，在已非空星图上点击可见 Alderamin 星点，按实际候选列表选择 HR8162；未使用搜索输入、Play、FOV、资料重试或压力采集。来源后单次系统 Back，再以一段公开 `record-swipe --seconds 6` 检查正文仍可滚，视频为同 session 的 `recording-1792706832722.mp4`。Root 已复用原 helper 解码，私有 `r19-ui-20261022/gen13-sky-body-scroll-review/frames.json` 保留身份，browser/server 已关闭。所有输入继续沿 fresh capture/实看/60 秒单次守卫。

## Observed product behavior

- A 前 `screen-777c81c6-aeb0-4ed7-9949-b0cca3737aee.png`：Map 原 formal marker、原相机位置及小档面板，隔离测试点标题、海拔 40m、计划暂不可用提示、正文和底部动作均可见。
- Search 稳态 `screen-edfe6f29-eee7-48df-b733-92d5e96691e6.png`：专用搜索页、原查询和对应结果可见，系统键盘已打开。直接点击可见页内返回，未先使用系统键盘 Back。
- A 后 `screen-05682070-c6f2-4265-8cbc-a19721fe8ddf.png`：已回同一点位/相机、小档面板，原标题、海拔、正文与底部动作仍在；未观察到返回导致面板降档或重定位。静态像素不能认证转场方向、精确耗时或所有中间帧。
- Root 对 A 实际帧复核：entry 的 2.7/2.8 秒样本为原生白页面从右覆盖 Map，3 秒样本已出现 Search 内容；return 的 2 秒样本为 Search 内容向右退出、Map 自左露出且键盘淡出，后续恢复原 small。由此支持进入与返回方向合同；文件采样时刻不作输入延迟、80/140ms 或精确转场耗时。
- B 媒体前 `screen-04fc28b2-be93-47cf-8f7f-8f43b1af3e55.png`：原文章、蓝底 TEST 图及非真实场地/使用授权说明实际可读。`screen-c68a3887-2ab8-4ccf-a4bd-0bb414f77f4d.png` 来源页保摄影者、许可、拍摄时间“来源未提供”、现场归属；原始出处已经是完整 `http://127.0.0.1:8798/v2/spots/…/media/…/image`，按行换行可读而非相对 route。精确已发布测试标识只留私有原图。
- 单次复制后 `screen-b37344a3-e864-4c32-ba2f-110b76a8bc3d.png` 实见“链接已复制，可在浏览器中查看。”以及系统“内容已复制”反馈；没有读系统剪贴板。一次系统 Back 后 `screen-85d1f7ec-73a0-4f1a-8f1f-a5e95b2a5249.png` 回到原文附近，同一 TEST 图保持有效呈现，版权、使用条件和周边正文仍可读。不宣称精确 scrollOffset 相同或真实现场摄影已验。
- Sky `screen-ecbfc4c1-f4b4-4a8e-ba25-9c3c0e62395b.png` 为加载后非空原星图；`screen-34217bef-e45c-46a0-9668-c4d6d9c7ce79.png` 实际候选列表中可辨 Alderamin / HR8162。打开后 `screen-48bff642-a306-4557-adab-d87d3fa7f23f.png` 分隔线以下实际可见“部分资料未加载，已保留其余资料”、重试、介绍未收录的明确说明、别名、V 波段 2.44 mag 和 B−V 0.220 mag，不再只有巨大空白。`screen-c50d9345-3ce7-4b42-8f43-f573124e48f9.png` 实际正文滚动后露出末条有效光谱型 A7V；身份与上方动作仍固定可见。
- `screen-ec052cec-a6e7-4a16-a728-16d906448d86.png` 为 HR8162 的真实来源页。一次系统 Back 后 `screen-699e8550-34f1-482a-ab3c-aa3283fc73ed.png` 回同一 Alderamin / HR8162、北 353.1° / 高度 49.3°及非空原星图；正文仍可见。再次正文滚动后 `screen-22c25771-7df6-42d5-a57a-82c29e581de6.png` 仍能露出 A7V。来源返回的“暗星未加载，亮星仍在”提示保其供给缺口，未重试或冒充全部 SAO 成功。Root 已实际查看上述五张正文/来源/返回关键图；另实看滚动视频 2.0/2.2/2.4 秒样本，2.4 秒右缘窄灰滚动条实际可见、正文到 A7V、核心身份及三个动作保持固定。不把采样时刻当手势延迟、帧率或滚动时长。
- 最后正常系统 Back 关闭资料，沿已核生产 `SkyNavigationMenu` 的 door/“返回”退出 Sky。`screen-793af1d8-258f-434c-9899-5d11206e57f6.png` 首帧为黑色内容过渡；已立即保图/报 Root 并停止输入。一次无输入稳定帧 `screen-8aa6da6b-2544-4339-b9f0-957d92c06060.png` 恢复进入 Sky 前原 Map large 的开放/设施/攻略阅读区域；不把过渡帧判作最终视口失败，不据两次采样宣称精确返回耗时。

## Verified

- 同一 gen13 普通预览中实际触发 Map→Search→页内 Back→Map；本次返回保留上述可见 Map 状态。
- A 右入与反向退出方向已有 Root 实际序列复核；两段具名动态证据及原始图片/receipt 已保存。
- 本次媒体代表路径在目标手机显示完整可信站内媒体地址、实际点击出现复制成功反馈，并经系统 Back 保原文附近与有效图片。由此关闭旧 gen7 相对地址无法复制 P2 的本条目标复验；不是公开生产 origin 资格、外部网页打开或全部媒体验收。
- Root 已实际查看媒体完整地址、页面/系统复制成功、Back 原文/图片三张关键图；Sky 五张关键图及滚动运动样本亦独立实看。HR8162 正文/明确恢复与事实实际可见，末条有效事实能滚入视口，细滚动条在本次运动样本实际可见，来源往返后仍可读可滚，最终回原 Map large 阅读区域。支持本条空白 P2 的修复后目标结果，不证明其历史唯一根因或全 UI 通过。
- 没有重复已答 My 返回、gen7 月相或章节路径。

## Unverified

- 原资料 partial、介绍未收录与暗星供给缺口保持；非空 BSC/星座图不作全部 SAO 或完整 Sky 验收。没有展开时间控件读回精确时刻，来源往返的连续观察保上述同星体、方位高度和星图。动态证据不认证精确输入延迟、物理帧率或无限持续稳定。
- 本次仅使用原开发映射条件，不认证该开发地址可从任意外部浏览器访问、公开发布资格或系统剪贴板内容。其它 Picker/按压、完整 UI/性能/内存义务均未关闭。

## Invalidated

- A/B 每次前一 capture 输入资格均按公共 owner 单次消费；历史 gen7/12 和先前代理旧截图不能授权新输入。当前 batch 无新候选或 session 漂移。

## Cleanup

- 本责任三视频、31 次原始 capture/receipt 与已有 review 均保留于当前私有 session；另逐件复制到私有 `r19-ui-20261022/gen13-navigation-source-originals`，121 件、31,476,107 B，逐件大小/SHA 与源核同，manifest SHA-256 为 `7488aca435bbaa477414d2aebf0735c524de065271eddb43cd5977e6cae8b522`。原 session 未清理；Root 的 A 解码帧仍保原私有 owner。
- 未改手机账号/存储，除授权复制外未操作剪贴板，未上传/提交，未启动/重连 IDE/SDK/服务或另开浏览器。最后手机为原 Map large 阅读区域；已停止所有 capture/input 并明确归还 Root，Root 已确认接管。该 batch 无在途操作；本子任务完成后关闭。
