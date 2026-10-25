# R19 选点确认工具：独立审阅

2026-10-25。独立于实现者，只读审阅本批工具与既有守卫；仅新增此记录，未操作设备、IDE、共享服务、构建、网络、Git 状态或 App。审阅范围是新 `confirm-location-picker` 的限定输入边界，不是成功选点、GPS/精度或 Context 的产品验收。

## 结论

**本批未发现 must-fix，可由 Root 进入受控实际确认。** Root 仍须重新 `capture-location-picker`、实际查看当前选中地点和右上 `完成`，确认按钮包含支持区域后才派发；之后须取得返回小程序画面与状态。当前没有本审阅者的真实确认派发或选点成功证据。

- `device-test.mjs:74/96` 将新命令纳入现有参数 allowlist，并强制 `selected_location_reviewed`。命令不能携带其它动作或任意 shell 参数。
- `device-adb.mjs:330` 只接受 `location-picker` capture、有限坐标及 portrait 的 `x=.85..92 / y=.058..078`。它仅转换为一次原有归一化 `tap`；普通 picker `tap/text/swipe` 仍在原拒绝分支中，`back` 不变。
- `withSession` 保留输入前后 bundle/AppID 绑定和会话独占；`assertCapture` 保留设备绑定和 60 秒时效。main 在派发前消费 capture，失败、未知效果或成功均不能重放旧授权。
- 新命令复用原 `foreground`/`screenshot` 资格：精确 `SoSoProxyUI`、WeChat launcher、同 user/task 的 AppBrand 返回 owner、当前 focus、截图前后前台复查，以及与原 capture 一致的显示尺寸。没有扩大到其它 WeChat、permission 或系统窗口。
- `device-test.mjs:194` 为新确认附带派发前 `assertCapture`；`device-adb.mjs` 在实际 ADB 命令之前、完成相关 transport 检查后执行它。预检期间过期不会发送输入。
- Skill 和 Context 明确要求操作者看当前选中地点/按钮；支持区域是已观察布局的能力限制，不是自动识别按钮。其它布局若按钮不包含该区域，应停止而不是改坐标浏览；派发成功没有被写成成功选点或已提交 Context。

## 独立检查

`node tools/run-node.cjs --test tools/miniapp/device-test.test.mjs tools/miniapp/device-feedback.test.mjs tools/miniapp/device-feedback-preview.test.mjs tools/miniapp/device-feedback-boundaries.test.mjs`：**92/92 pass，0 skipped**。

实际断言包含显式审阅标记、唯一派发/拒绝重放、跨 scope、越界和非有限坐标、显示/前台变化、预检时截图过期零派发；既有设备、bundle、同 task owner、权限与记录边界仍通过。限定写集 `git diff --check` 退出 0。测试只使用注入驱动和隔离临时目录，没有调用实际 ADB。

## 审阅输入身份

基线为 Root 核定的 main `1bef1a09819b563fe44d6437a200210ff30606f7`；审阅对象为当前本地未提交增量。

| 文件 | SHA-256 |
| --- | --- |
| tools/miniapp/device-adb.mjs | 35b7f666ebffe2045c6ef46e8e1f50ae2f17ad1126291605cbfb75eb80b7208a |
| tools/miniapp/device-test.mjs | 15c10ed16ae42c5575f116720ddc668ee7d24b88fb15328d243a0977e40e53f3 |
| tools/miniapp/device-test.test.mjs | 8290fcaf68e69c6181fe66e95e769f3674a6f0e0af5385d6864c4e917e9c948c |
| .codex/skills/starward-wechat-device-verification/SKILL.md | a7ddd58f7acb640998aa999540b5962ed99026a07257620bb1a48f219953858e |
| project_context/areas/main/verification/wechat-device/settled-candidate.md | da2b2399707150b102d1668b3e88eaa1131890da21e1c5c57f4644ba404d6536 |

输入后续变化时按受影响差异重新判断本结论；本记录不认证实际手机 AppID、源码字节或完整 H5/P1 验收。
