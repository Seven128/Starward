# Stable 对照终态与普通 r23 恢复

2026-10-21，沿原 PLAN 的一次有停止条件的同包对照；完整 Goal active、无预算、未完成。所有原件仅本机，外部私有根 `device-resume/r24-independent-20261021`。本记录不替代 HANDOFF 的当前执行状态。

## 同包对照在连接层停止

- Stable 2.02.2608080 的官方 Codex 授权和原微信账号扫码登录成功。安装 skill 0.3.11、agent 0.3.14，官方返回兼容的 agent_ahead；没有更换原账号、配对或 VPN/TUN。
- r22 冻结与 prepared 包再次读回一致：`7f600f5d87027d3f16914885fc8e6113d129d5c0bc9aa7cab43326450d7102df`，337 文件、5,034,956 B。官方模拟器与手机 Android 运行时读回成功。手机 wx.request 实测 8798 桥健康 HTTP 200，不能继续归因为 USB HTTP 不通。
- 用户完成真机调试扫码、随后将 Sky 缩到全天空。用户进一步明确：高内存云观星场景进入后，往返耗时升高，随后连接方式变为“未连接”，手机仍正常运行和操作。桌面 UIA 同样读到未连接，一次官方 currentPage 返回 `Remote debug connection lost`。手机最后截图是 264.4° 全天空和地景；没有据此证明手机崩溃或断连必由内存引起。CPU、调试流量、监控扰动和传输的具体因果仍未分开，ADB USB API 通路健康不能代替真机调试链路健康。
- **尚未请求 Heap Snapshot，未取得基线或导出。** 本次结论是连接先于基线失效，不是 Stable Heap 本身已尝试并失败。到此停止同类扫码、版本、Heap/Timeline 重试。存活强引用、正常 Play 内存增长和旧 native crash 义务继续未解。
- 手机出现过“暗星未加载”。主机 SAO 索引 200、826 tiles，抽取的一份声明 asset 字节与 SHA 相符；这不证明手机 SAO 已加载。
- 官方关闭 r22 项目及其真机调试子窗口；旧 session h1WN26 退休。9 份、4,921,332 B 必要设备原件逐件复制核对到 `stable-r22-device-originals`，原 Temp 和全部冻结包保留。

## 普通 r23 已推送且实际标识可见

- 沿既有 feedback owner，显式使用同一 Stable CLI 普通 auto preview；官方终态 success。feedback `starward-device-feedback-UaDLbz`，generation 1，prepared `generation-000001-kVLYyq/project`。没有重发未知结果或绕过配置绑定。
- 当前本地包 `a5da291529569ee0483765cb63f38e6afea890351e6816e09daad1b4a5182c1e`，337 文件、5,035,024 B；唯一新增前端生产修复仍是已审文件回收重试。夜光首读修复在隔离 API 8799，沿桥 8798 使用。
- 手机普通 Map 存在计划不可用提示，vConsole 窄读到 HTTP 403；桥主动禁止账号入口，公共 Context/Sky/叠层请求有 200。没有清账号、草稿、缓存或扩大桥权限。正常“云观星”入口已实际进入 Sky。
- 13:12 UTC 的实际截图读到 `R17 正常Sky关联 A1 r23 USB`，随后正式 feedback bind 成功。当前设备 session 为 feedback 内 `starward-device-test-jAHjoj`；prebinding p4m8QY 不再作为后续输入入口。此资格是可见版本加本地绑定，手机全包字节和产品验收仍未证明。
- 本次 vConsole 另见 `21 listeners ... WindowInfoChanged` 警告；[独立 owner 审查](R24-WINDOW-LISTENER-RETENTION-AUDIT-20261021.md)未找到重复注册或 cleanup 身份缺陷，具体平台 emitter 和成员未定位。事件警告本身不证明 21 份旧 Sky 或整条泄漏原因；不通过提高监听器阈值掩盖。

普通 r23 已通过既有“准备全天空”入口显示 264.4° 与地景；实际 SAO 负载及短长按净收益尚未准入。用户随后优先要求研究并实测替代性能工具，按更新后 PLAN 先完成这一有界工具决策，再继续六字段/正常 Play、三层最终覆盖和资源回落。当前没有在途官方推送或 Heap 请求，也没有无泄漏通过结论。最新进展只更新 HANDOFF 和本机回执。
