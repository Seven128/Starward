## Candidate identity

- Mode: `development_feedback`，task-only gen12 panel trace；不是最终 UI 验收或普通包性能样本。
- Repository HEAD: `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`，工作区含大量既有未提交改动，全部保留。
- Root 交接的完整诊断 bundle: SHA-256 `d3777f640382740f9dd87e8aa1d8b4d3b3e8ef47dc748003cd0e616c7845ed5a`，345 files，5,022,405 bytes。Root 已完成 official automatic preview、查看手机当前探针并绑定新 session；本 agent 没有构建、推送或 bind。
- Probe label: `R19P tag e/p/f`。Root 交接语义：`ST` 是现有 render 的 extent/phase/floor 变化，`NB` 是实际 NativeBack `onBack` 入口，`BE` 是 Back 降档 setter，`FO` 是正式点打开 medium，`AN` 是共用动画 setter。Phase `c/i/o/x` 分别为 closed/opening/open/closing；extent `m/s/l` 分别为 medium/small/large。`AN` 不能当作拖动证据。
- 独立 USB 手机显示通道；所有截图均为 1080 × 2376。公共命令明确返回 `runtimeAppIdVerified: false`、`acceptance: not_evaluated`，没有字节级手机 attestation。

## Invocation result

读取完整真机 Skill、开发 Skill、性能测量方法、官方 `wechatide-skill` 0.3.14 root 及相关 Context/公共命令后，Root 把已绑定 gen12 session 的唯一输入权交给本 agent。手机操作仅经 `tools/miniapp/device-test.mjs`；capture 使用既有私有 wrapper，先调用公共 capture，再生成 450 px 等比审阅图。

共 7 次成功 capture、4 次成功 tap：正式 marker → 关闭遮挡 My 的无 action 通知白卡 → My 头像 → My 左上 Map。每次 tap 前均查看对应 fresh 图，沿用公共 60 秒、设备/foreground/尺寸和一次性 capture grant 守卫。没有系统 Back、swipe、拖动、天气重试、账号切换、IDE/服务操作或跨页面扩展测试。白卡关闭前先停止操作，由 Root 核对通知 owner 的公开 `onDismiss` 语义，再重新独占输入继续同一目标。

## Observed product behavior

首次正式 marker tap 后面板可见；基线 trace 为 `1:ST m/c/0 → 2:FO m/c/0 → 3:ST m/c/295`。顶部错误通知持续遮挡 My 头像；正常点击关闭该白卡后，My 头像重新可见。打开 My 后，trace 已增加 `4:ST m/i/295`、`5:ST m/o/295`。

按 My 左上 Map 返回后，面板实际变短。最终原图逐字读回的完整 10 条 trace：

```text
1:ST m/c/0
2:FO m/c/0
3:ST m/c/295
4:ST m/i/295
5:ST m/o/295
6:ST m/x/295
7:ST m/c/295
8:NB m/c/295
9:BE m/c/295
10:ST s/c/295
```

实际观察到的是 My → Map 返回期间 `ST m/x → ST m/c → NB → BE → ST s/c`，并伴随可见面板变短。本轮没有发送 Android 系统 Back，10 条记录中没有 `AN`。这把降档路径定位到已声明的 NativeBack 入口及 Back setter；它没有直接解释 NativeBack 入口的上游触发原因。基线中面板可见而 phase 字段为 `c` 也是原样读回事实，不据此推断渲染或生命周期机制。

## Verified

- 既定正式点 medium → My → Map 路径已执行；最终可见面板较基线缩短，extent trace 从 `m` 变为 `s`。
- 该返回过程实际出现 `NB` 后紧接 `BE`，然后出现 `ST s/c/295`；探针缓冲上限为 24，而本轮只有 10 条可见记录，当前画面没有达到该上限。
- 原图、原始 JSON receipt、450 px 审阅图及其派生说明共 28 个文件，已复制到既有私有 owner 下的 `gen12-panel-trace-20261023`；7 份原图逐一重新计算 SHA-256，全部与 receipt 一致。稳定私有根为 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/gen12-panel-trace-20261023`。原图文件名为 `screen-<captureId>.png`，receipt 为同名加 `.json`。

| Stage | capturedAt (UTC) | captureId | Original PNG SHA-256 |
| --- | --- | --- | --- |
| Initial Map | 2026-10-22T21:35:08.766Z | `3ab690c6-e3b6-4cab-8d6c-49add4a52b00` | `4f6a37f79db4912acf3c22141d89d9c23e8990605fdca73ffe4cdd9816158ab1` |
| Formal baseline | 2026-10-22T21:35:30.205Z | `679708d7-1a53-4b37-823f-7d5ed7457658` | `8d6b7036eb047a841e15cf72658303ff7eb3eb5822384d674ab36238e57a7ebe` |
| Obstruction inspection | 2026-10-22T21:35:47.719Z | `bcf25aab-d4a7-47fc-9185-15d4fe4e734a` | `c38dd6e85e5a4569dd132f539baf538a715f9b34a3def199e8b78d754fc14449` |
| Before public dismissal | 2026-10-22T21:37:48.853Z | `528d2777-4ede-405d-8da2-babb08156ddd` | `3fb8b3db8ed117cc9ee418d3e4070697ed24628b5edaf5f85bccf7b52e5b8250` |
| My control revealed | 2026-10-22T21:38:07.506Z | `3f3db44d-5206-4440-9f2d-80dc3c7d8043` | `6a2b553aff922b2a077492007d603b6f922cdd1e7ca35f8d21bde60afb0482bc` |
| My | 2026-10-22T21:38:24.707Z | `f7fd2f2b-ec4d-41b5-97d5-c8161ff8d8f4` | `225cd3274241d48008ee81230d5eccf022b771004e17f2a0669ddc326266216d` |
| Returned Map, decisive trace | 2026-10-22T21:38:49.356Z | `f9f725ec-8724-4211-818f-3a1408addbbc` | `9ba453263b6b24c61b0a83f165b14946abddd18e150595c2dc284c90118e9c64` |

## Unverified

NativeBack 入口上游的实际平台信号/回调来源、普通无探针包的修复效果、最终 UI 对照及完整产品验收仍未验证。没有测量事件间耗时、动画帧率、内存、真实天气/账号数据、iPhone 或设备群体行为。trace 行顺序不是物理呈现时间线；一次已定位的路径不证明所有返回机制。

## Invalidated

先前 generation/session 不用于本轮证据；Root 已退休旧 session。各次旧截图仅保留历史观察意义，不再充当输入授权。诊断包与其可能的观察效应不能替代普通包；`AN` 的缺席及本 agent 没有拖动，不能证明所有手势路径。既有 gen11 普通包结果保持独立。

## Cleanup

取得决定性 trace 后立即停止 capture/input，将唯一输入权正式归还 Root。原图与 receipts 已先保全至私有稳定 owner；临时 session、generation、IDE 及其最终清理由 Root 原 owner 负责，本 agent 没有调用 `stop` 或关闭其资源。除本报告及上述私有证据副本外，没有修改代码、Context、其他文档或用户数据，没有提交/上传/重置/清理工作区。
