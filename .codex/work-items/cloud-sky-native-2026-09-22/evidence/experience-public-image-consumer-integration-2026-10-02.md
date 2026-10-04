# 已获批公共图：文件缓存消费者迁移

2026-10-02。本记录属于源码实现/桌面开发验证，尚待独立审查；不认证 WEAPP FS、手机、图质、GPU、总内存/性能、200DAU 或最终体验。

## 责任与行为

`useSkyNativeImages` 的已知 manifest 字节/尺寸/SHA 公共图片现在调用同一 `acquirePublishedSkyImage` singleton；request 只拿文件 lease 并 native-decode，loader 的 wanted、粗图保留、cold decode、重试、RGBA allowance 和 Canvas 生命周期不另建 owner。hide/Canvas 重建释放各自 lease，成功公共文件留给下一 owner；不再以每次请求的 `sky-art-*` 文件承担正常公共图缓存。

request 输入明确区分 acquisition 与 legacy request/write/remove。PUBLIC 分支没有 dummy native fallback。唯一既有 LOCAL optical trial 在 resolver 明确声明 `storage:"session"`；商用关闭规则不变，公有 route 拒绝不会偷偷回退到 session writer。selected W3 的发现/可变 URL 路径没有迁移，`deep-sky-image-request.ts` SHA 仍 `e64073f411f220a1a852f9f4b24ce6ea86c7ebf1a2b52f42a94d030129f432f8`。

App launch 保留旧 `skyImageFileSession.removePreviousFiles`，独立初始化公共文件目录。原 `clearTemporaryApiCache` 一开始同步调用该 singleton clear 建 epoch fence；即使一层失败，原 API cancellation、response invalidate、query cancel/remove 和 response flush 仍分别执行。公共 partial/pending/rejection 与原 cleanup 不完整均报既有 `local_cache_cleanup_incomplete`，成功仍返回原 cancelled API reads 数，不改 Settings UI 或其六项保留修改。

取消异常不能跳过 request release 或停止 loader disposal：PUBLIC acquisition cancel 用 catch/finally。实际 core/runtime 的外部 abort fencing 与真实 I/O settlement 修复由 root 负责，这里的受影响实际 hook 补核使用其最终 hash。

## 新代输出及当前绑定

首代 `output/sky-public-image-consumer-integration-1002-r1/result.json`，53926B，SHA256 `b6f25a68c539ef7b9bd71525c997e38246c1cd931808bc3a4ca8b5be52c1e954`。完整 hook/runtime/App module、actual cache/request/loader、实际公共 clear 函数执行；React 调度、Taro FS/transport/native image callback 可控。保存真实字节 readback、索引/路径、request/lease/状态 trace；没有 HTTP。

仅复用两张当前 M51 SDSS 已发布 JPEG：OVERVIEW 20492B SHA `c98129d2ea984cf4106b14b325f355df149f36fe30c2c8ecbcdd0d3733ff81c6`，DETAIL 19784B SHA `a9f3884874773293589bedac159ac0d1d479f9cf8130e21c74ebcaf6a7cc9447`；真实 manifest 的 shared publication hash 核为 `5c068fae55a47444724767777532ce6af1b6555c41ca2afdcceed9e9ae762eff`。两图只用于 cache/consumer 身份与层级回退机制，不能认证其画质或视野。

该 r1 五条实际路径证明：

- cold 初始化→真实 bytes/hash→受控 onload 才交出图；cold return 不再 transfer；hide、新 Canvas 和重建 runtime/索引后 warm 使用同一文件。
- 公共服务 clear 与该同 singleton 连接，原 API read cancelled=1；未 onload 的 lease 被 retire，late callback 不能重新发布；explicit retry 重新获取，最终 hide/clear 回收文件与 Hook state graph。
- 两个独立 Canvas 共享一次获取、两个 lease，分别释放，不能提前删除另一个正在用的文件。
- 实际同长度 fine payload 改字节，hash qualification 拒绝写入/native decode；coarse fallback 保留，失败不循环，explicit retry 用正确实际文件恢复。
- LOCAL session 分支保持旧 writer/清理；invalid PUBLIC route 无 session fallback。完整 App launch 同时执行 legacy 范围清理与公共初始化，不发图片 GET，保 unrelated 文件。

r1 的109受影响检查/TSC及旧 normal-hook session-path task mutation闭合：仅在 task 快照删去 acquire branch 后，normal actual hook 实际写入 legacy namespace，正常公共 namespace/owner断言失败。无 production mutation。它绑定 prior core `b30e1632…` 与旧 runtime，不能追溯升级为之后 abort 修复的当前 hash。

当前仅重核取消/清理受影响组合：`output/sky-public-image-consumer-integration-1002-r2/result.json`，52934B，SHA256 `1c272e34b03cf351e955bd6aa69a8c55728ce7d25f5517ac9d44121883674dbc`；两实际 hook tests + 当前 miniapp TSC 通过，三份实际前/后 trace保存。源码运行前后保持：

|责任|当前 SHA256|
|---|---|
|use-sky-artwork.ts|8662e7522f21acfc5e65b7b7f109e95107cc47a1701966861f7b8e55de190385|
|use-sky-optical-hips.ts|90b1df1c26eb9552447fb8a6da6e5a04d8e771fc429fa04397077989a80130ba|
|sky-artwork-request.ts|bb9fa5d61d10c844560cf2c1c135bc58930238947d07bffe4c30343ee4be3a31|
|App|a978497fb4e398c1441742ab96ce832f3d202993d35bcee45c8ec861119e7aff|
|api-client.ts|427095636955e0147b67a487bf5cf489f49a78f7a58966ee3433b639de590d7d|
|root 最终 cache core|221e1979747c12bc8edcc6c7f2d592dc80a039740d107658c03a106c709874fe|
|root 最终 runtime|becf4c367fe8949e6218c5a6714b624508e4ee1c82d067ce7b78a50b14bbc5ea|

## 真实失败前例与 fixture 维护

`output/sky-public-consumer-cancel-before-1002-r1/result.json`，1799B SHA256 `4e97385327ff1ff5c9a016fbfab9ce4593a5420ed2ba35d6f547d5150c222ea6` 保存两个真实失败、四份源码快照和 actual traces：

1. 两个已经通过真实 cache/Promise 获取文件、仍在 native-decode 的租约，外部 acquisition.cancel 抛错会在第一 drop 停止，两个租约/图回调残留。request catch/finally 修后，两 cancel 均被调用，两个 lease 归零、state graph 清掉，旧 onload 被挡住，后续文件清理 complete。
2. 原 runtime 在 native.abort 抛错且真实 callback 尚未回时人为 reject 包装 promise，导致 core running/reserved=0，但底层 callback 仍 pending。root runtime 改为仅发 abort、等 actual success/fail。相同完整 hook/服务 clear 例修后 running=1、reserved=19784B 保持，live 已绘 coarse 文件正确 retired，不 falsely complete；放行真实晚 success 后不发布新图，槽/保留归零，hide 后最终清理 complete。没有用立即人工 Promise 来假装 native 请求结束。

原 `sky-native-image-owner.test.ts` 迁成明确的 synchronous acquisition/lease completion mock，只核各实际 consumer 的资格、decode/graph 和租约所有权。原删除文件的断言改为独立 lease release，cold retry/Canvas replacement 可以使用同一个 immutable path，独立释放 token 仍 exactly-once；这些 mock 不认证磁盘删除、传输次数或 native 实物。真实 Promise/core/FS path 由上述完整模块测试另证。

legacy real-byte chain tests 保持行为，仅把类型取成 union 的 legacy 分支；persistent adapter fixture去掉 dummy legacy writer/transport。旧 App launch fixture显式注入公共 initializer，保 available 警告0、legacy unavailable、公共初始化失败及两者独立失败的意义。新 clear-service fixture改成真正符合 ApiEnvelope 的缓存 envelope，修复总批 TSC 暴露的 missing validAt/literal 类型，未用 cast 掩盖。

child launch/clear 的旧实现记录 SHA `a862326a…` 保原时点；这里 r1/r2 保存 current fixtures，不能把其49历史检查/旧 test hash 当作本轮全 scope 通过。

## 修改与待验

本迁移生产文件为 hook、唯一 trial resolver、request adapter、App、api clear 入口。相关 fixture/test 为 native owner、legacy chain、persistent adapter、new full-module consumer、api transport support、新 api clear、session launch。core/runtime 的新取消修复由 root 编写；loader、selected W3、六个 Settings/outbox保留改动和旧201 deep-sky assets没有由本迁移编辑，r1/r2哈希核仍相同。没有部署/下载/启动IDE/手动刷新，未提交。

共享正常索引开销仍另受256KiB上限，32MiB是 encoded payload+reservation/failed garbage政策，不是所有磁盘字节或设备200MB余量认证。native onload在这里是受控回调，JPEG实际字节通过hash/header，不等于手机native decode/成像或GPU。真实 WEAPP startup/hide/re-entry/Settings反馈、跨真实应用启动保留、native rename/读写/配额/abort callback、旧/新客户端兼容旅程及整体端云性能继续开放。当前独立审核入口为两代 immutable result/source snapshots/consumer-traces 和本 note。
