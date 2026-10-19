# 截图凭据与 H3 手机准备的独立边界审查

2026-10-19。只读审查本轮两个小型工具边界；唯一新增文件为本文。没有启动或调用手机、ADB、DevTools、API、DB、网络、照片 handler 或外部配置，没有修改生产源码、候选、原回执或任务 authority。沿用既有 [H3 组件独立复核](H3-COMPONENT-FIXTURE-INDEPENDENT-REVIEW.md)，不重复组件矩阵、照片研究或全仓检查。

## 结论与待同步项

**本次未发现需要先修复的实质代码阻断。** 截图改动没有改变输入授权的负责方；H3 手机分支保留原隔离输入、正式资格拒绝、完整构建和真实山体恢复责任。当前可以由 root 沿既有反馈 owner 继续准备目标运行，不能据此宣布设备或 H3 验收通过。

有一项实际文档滞后需要 root 同步：`H3-PHONE-PREPARATION.md:3` 与 `H3-PHONE-PREPARATION.json:4,16–17` 仍表示尚未生成真实手机 revision；本次已直接读回 `tmp/h3-component-fixture/phone-revision/build-receipt.json` 与完整产物，确认手机 revision 已生成、尚未激活。请将当前身份更新为下文的 `1ee545f0…`，同时保留 `phone-validation` 的 dummy 构建为独立历史软件证据。不得让恢复者根据旧状态重新 prepare 到已有不可覆盖目录，或交付 dummy 包。本文不代替 root 更新这些 authority。

## 截图与输入边界

审查 `tools/miniapp/device-test.mjs` 与 `.test.mjs` 的实际 Git diff，并追踪未改变的 `device-session.mjs`、`device-adb.mjs` 和 `device-record.mjs` 调用方。

- `device-test.mjs:36–55` 每次以随机 UUID 建立独立 PNG 与 sidecar，两个文件均以 `wx` 写入，不覆盖历史图片；SHA-256 来自同一份 PNG bytes。sidecar 只含 capture ID、时间、文件 basename、哈希、字节数、尺寸和范围，不含原始设备身份、账号、位置或目录。相同 bytes 可以得到相同哈希，但 UUID 和 session 中当前 capture 仍是不同观察。
- `device-test.mjs:113–127` 在开始捕获前先持久化清空旧 capture，在发送输入或启动录像前先消费当前 capture。因此截图、写文件、录像或输入失败均不能重放上一份授权。部分写文件失败可能留下本次已写的私有文件，但不会发布成功结果或恢复授权；其资源仍归原 session/stop 收口。没有新增会话外副本。
- `device-session.mjs:50–68` 的 salted device binding、60 秒/禁止未来时间检查、会话锁和前后候选 bundle/AppID 检查未改。唯一截图路径和哈希没有成为额外输入通道，历史文件或相同图像哈希不能重新授予输入。
- `device-adb.mjs:255–301` 仍验证允许的 foreground/focus、截图前后 activity、当前截图尺寸、权限范围与输入动作；location picker 只允许 Back。录像仍由原 `device-record.mjs` 的有界时长、foreground 监视、唯一临时路径和 owned recorder 收尾负责。新录像末帧也调用同一 `saveCapture`，未复用 `screen.png`。

本轮没有重复 root 已执行的 34/34 用例。新增测试直接覆盖同一时间戳的三次捕获、不同/相同 PNG 哈希、历史 `screen.png` 不变、当前 capture 绑定、60 秒边界和 stop 清理；既有失败、一次性输入、设备/foreground/尺寸漂移测试仍与原调用关系相符。未发现需要额外 countercheck 才能裁决的失败。

工具不能自动证明操作者看过图片；“读取本次返回路径、实际查看后再输入”的行为义务继续成立。私有会话内的文件模式和原 session cleanup 不是远端隐私或候选产品验收。

## H3 参数、构建与 handler 边界

- `phone-target.mjs:9–40` 只准入绝对 JSON 文件中的唯一 `apiOrigin`，限制文件大小和字符串长度，拒绝额外配置、URL 凭证、非 HTTP(S)、路径/query/fragment 及已知本地/保留地址。该检查没有 DNS、网卡或连通副作用，也没有宣称域名实际指向物理主机。仍须由 root 网络 owner 选择和验证目标；未读取本次私有配置。
- `phone-target.mjs:43–61` 将原 fixture、`phone-validation`、`phone-revision` 分到固定目录，拒绝两个 phone mode、缺失 origin、未知参数和手机模式 refresh。`prepare.mts:13,28–36` 使用新目录与 `wx` 输入；`build.mjs:17–29,144` 再绑定 prepare origin/mode/hash，并拒绝覆盖已有 source/手机 build receipt。失败后保留目录供诊断，原 sealed 分支没有被替换。
- `phone-target.mjs:64–69` 核对四份已独立审过的 fixture overlay；`build.mjs:45–57,68–98` 从当前完整源码复制、保留页面/分包、隔离 storage namespace，仅应用声明 overlay；API 与 Sky resource 使用同一 origin。`build.mjs:108–131` 在产物中核对源码稳定、页面图、编译 origin 与旧 fixture loopback 缺席，并保持列出的真实组件 owner 逐字一致。没有生成 JS 拼接路径。
- `phone-binding.mts:7–27` 在原 local-only adapter 上做窄媒体 URL 改接，保留真实正式拒绝与 MAP_POINT 解析。`prepare.mts:17–24` 实际断言 FORMAL_SPOT 拒绝、MAP_POINT、DATA_INSUFFICIENT、HORIZON_READ_FAILED 与 null model。静态组件 props 未转入普通正式选择链。
- `phone-binding.mts:32–39` 只匹配同 origin 的精确照片 pathname，拒绝 authorization/cookie/operator/reauth/idempotency headers，再委托原 adapter 的精确照片身份、GET/HEAD、query 与关闭规则。错 origin、其他媒体、terrain 和账号路径返回 null，必须由外层原 allowlist 决定后续处理。它没有提供账号保护替代品，也没有挂载 `/v2` route。
- 同点山体 URL 由 `phone-binding.mts:21–31` 的相同 GCJ02 站位按 7 位格式生成；handler 不拦截山体、不制造成功曲线。实际恢复仍依赖原 `getTerrainHorizon` 与真实 terrain owner。关闭委托原 adapter 的串行 cache 生命周期；模块本身不监听、不发网络请求。

## 独立产物读回

本次在内存中遍历现有本地产物及 snapshot，没有重建或改写回执：

- 实际手机 revision：341 文件、4,979,225 B，bundle SHA-256 `1ee545f004155d693e0d7384240da558b1de20a4a22cb67c300d2f9368d77941`，与当前 build receipt 完全一致。入口为 `pages/h3-component/index`。
- 1560/1560 当前仓库输入哈希匹配 snapshot；1560/1560 副本按原哈希或声明 overlay 匹配；16/16 overlay 实际哈希匹配。新 prepare/build/phone-target/phone-binding 的哈希与准备证据一致。
- 当前输入 origin 哈希为 `3b3d8a49ba867c009f2d2d289aeebfd0cf91c781e06f138ff10ee5dc89dabd77`，与 receipt 一致；两个 emitted JS 使用完整 origin，旧 `127.0.0.1:18795` JS 命中为 0。没有输出或读取外部私有配置的原值。
- 原 sealed bundle 仍为 `a282341a408821832d65284ab651e0431113092cce59f5b3e5754cc8f9ed2e66`。原 source snapshot、build/behavior/typecheck receipt 及归档的旧 prepare/build 全部匹配原报告。原 fixture-input 没有列入原报告文件表，本次改用已有 phone software receipt 的 preserved hash 比较，也一致；没有把缺少表项误报成文件改变。
- 手机输入读回仍为 MAP_POINT、DATA_INSUFFICIENT、`MAP_POINT_COMPONENT_ONLY_NOT_PUBLISHED`、HORIZON_READ_FAILED、model=null。此前 dummy validation 的哈希和字节数属于另一个目录，不能用于手机身份。

root 报告的 typecheck 和 34/34 测试仍是其实际检查，本次没有将它们改称独立重跑。handler 的软件用例已逐段复核，未通过重新执行 verifier 覆盖原证据。

## 仍未建立的结果

本次只支持上述工具/软件边界。H3 实际同源媒体可达、Android native 下载/解码、WEAPP 挂载、Map 与面板合成及失败期间持续可用、图库/正文/来源真实返回位置、真实同点山体成功响应与恢复重绘、普通正式业务资格/消费者和 iOS 继续开放。R17 当前候选与服务、8791 账号、N05、R6、配对和 VPN 均未由本审查操作或升级其证据。
