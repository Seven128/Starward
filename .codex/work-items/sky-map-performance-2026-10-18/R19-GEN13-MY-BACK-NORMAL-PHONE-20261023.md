## Candidate identity

- Mode: `development_feedback`，gen13 普通 WEAPP 修复包的限定 Android 返回反馈；不是 settled-candidate 或最终 UI 验收。
- 当前仓库 HEAD: `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`。既有 dirty/private/frozen 内容全部保留。
- Root 交接的完整 bundle: SHA-256 `3b466e1f303a7b291dac3f2ccfadb139573bcd6b7d16375451e91f7158ebe55d`，345 files，5,021,355 bytes；主包 2,032,992 bytes。候选为 `generation-000013-SkNq7c/project`。构建、双读回、普通官方自动预览、手机当前图确认及 bind 均由 Root 执行，本 agent 未重复这些操作。
- 原 `R19P` 面板探针已移除，本轮每张实际图均没有该 trace overlay；手机仍显示绿色 vConsole 入口，保留其开发条件。不是 true-debug 或 debug-off release 样本。
- 独立 USB 手机显示通道；9 张原图均为 1080 × 2376，审阅图为 450 × 990。公共命令返回 `runtimeAppIdVerified: false`、`acceptance: not_evaluated`，没有手机字节级 attestation。

## Invocation result

完整读取 AGENTS、真机 Skill、最新 development Skill 与性能方法、官方 `wechatide-skill` 0.3.14 root、相关 Context、公共 capture/input 实现及 gen12 trace/修复独审后，Root 才移交 gen13 已绑定 session 的唯一输入权。本轮全部手机操作通过 `tools/miniapp/device-test.mjs`；既有私有 `capture-owned-review-frame.mjs` 先执行公共 capture，再生成等比审阅图。

共 9 次成功 capture、5 次成功 tap、3 次成功系统 Back。每个输入前均实际查看该次 fresh 审阅图，并由公共命令执行 60 秒、同设备/foreground/尺寸、当前 bundle 和一次性 capture grant 守卫。没有失败输入或自动重放，没有原始 ADB input、swipe、拖档、通知关闭、天气/资料重试、账号操作、IDE/服务操作或构建/预览扩张。

两条机制执行完即停止输入、先保全原图及 receipts，再明确归还唯一输入权。Root 后续可继续复用同一普通包；本 agent 的历史截图不再提供后续输入授权。

## Observed product behavior

1. 正式 marker → My → My 左上「地图」：明确点同一正式 marker 后，面板处于较高的基线形态；My 正常展开，没有辅助 sheet。点左上地图返回后，面板外框、正文可见范围、固定三动作区和地图选点位置保持。随后一次合法 Android 系统 Back 只使面板变短，面板和选点仍存在，没有全关。
2. 再点同一正式 marker → My → 系统 Back：marker 使较短面板恢复原较高形态；进入没有辅助 sheet 的 My 后，一次合法系统 Back 退出 My，Map 面板仍保持该较高形态；再一次 Map 系统 Back 才使面板变短。

本轮没有直接读取 `panelExtent`。这里的 medium/small 命名依据当前正式 marker 的生产 open 意图、实际外框/内容形态，以及后继一次 Map Back 的可见降档行为，不是运行时字段读回。450 × 990 审阅图中，两条路径的 baseline/return 面板顶部均约 y=503，单次 Map Back 后约 y=588；底缘约 y=934，三动作区约 y=864–921。以上是图像读数，不是 native layout 测量或动画时序。

对两组原始 PNG 解码后的限定区域另作只读比较，未修改原图。路径1地图区域 `(0,225,1080,900)` 的 1,267 个差异像素仅落在 My 头像 glyph 内（x84–139/y277–327）；路径2同区域零差异。两组 panel 区域 `(0,1206,1080,1034)` 各有 113 个差异像素，全部落在中间云观星动作内部（x415–676/y2093–2191）；该区域其余像素一致。它补充了当前可见几何/投影连续性，不建立数值 camera、离屏内容、完整 Observation Context 或全部 UI 符合度。

My 资料与计划数据仍呈暂不可用状态；本轮没有操作其重试。Map 的固定三动作持续存在，vConsole 开发入口也持续存在。

## Verified

- 当前普通修复包的这两条返回机制均观察到上述预期结果；旧 gen12 中「没有系统 Back/拖动却从 medium 降档」的现象没有在本轮 My 左上返回中复现。
- My 系统 Back 在没有辅助 sheet 时只退出 My，没有同时使 Map 面板降档；两次返回之后的 Map 合法 Back 均可继续降一档。没有把“拒绝所有 Back”当作修复成功。
- 正式 marker 能在一次 Map Back 后的较短形态重新打开原较高形态，确保第二机制没有沿用未知前置档位。
- 原图、原始 JSON receipt、审阅图及派生说明共 36 个文件保全至既有私有 owner 的单一目录 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/gen13-my-back-normal-20261023`。9 份原图逐张重算 SHA-256，全部与原 receipt 一致；另有 `preservation.json`、`visible-region-comparison.json`、`visible-region-difference-bounds.json`。原图命名为 `screen-<captureId>.png`，审阅图为 `screen-<captureId>.review-450.png`。

| Stage | capturedAt (UTC) | captureId | Original PNG SHA-256 |
| --- | --- | --- | --- |
| Initial Map | 2026-10-22T21:50:21.846Z | `f5b7a8a3-bd8d-49e5-9448-1707d01d9e94` | `06a5856f27d8ef64093385a6073fd2856f70fb05ecf536584c9c64a231f971eb` |
| Path1 formal baseline | 2026-10-22T21:50:40.768Z | `8b66d379-e913-425e-b72b-6d4433f96252` | `2972d4ff0e2d70a2ae911ae721bfa545108518e98a54fbeb562d146edc7eb696` |
| Path1 My | 2026-10-22T21:50:57.998Z | `fb5f2438-5537-4611-8d3f-ed95fb66461c` | `038cdcc80384c8dcc5892cf657fff06a1d7a2e450aa3b39ab113c76617d3bb79` |
| Path1 UI return | 2026-10-22T21:51:15.582Z | `12fe1abb-bdaf-4e65-a799-89411e34cb78` | `962d9dd7e9a4a1f8a94b157babfb82d7808bfe39e232942c4d23c4ecfefb3cc7` |
| Path1 Map Back | 2026-10-22T21:51:37.177Z | `b8d65b19-4c0c-4531-b0a5-3959b3338478` | `16c6646b1b6266e94b3be2a64aff080fe2afaeb438c62b816c611169e8618e9b` |
| Path2 formal baseline | 2026-10-22T21:51:53.999Z | `8a398545-b323-42e7-9656-d5c6b00a6648` | `c3be6ab39b91047479b52db4ef62aac5210bd97bbdd008ec3b38cbf52f193724` |
| Path2 My | 2026-10-22T21:52:16.944Z | `77e32dbf-7e21-470d-80c1-dcde5b112146` | `dabeeb912698494c6098d65b8cd95a067829ee978f92612b54c400139c53a3fb` |
| Path2 My system Back return | 2026-10-22T21:52:36.695Z | `1dc53453-2d30-4fd9-8d7f-18f46a180eeb` | `5ca7cedb41679657fdf601f9fde44854db84533196ff375eea5aaa9c928069ab` |
| Path2 Map Back final | 2026-10-22T21:52:52.955Z | `92476559-63a5-4e29-97a9-43adf5dc4843` | `f5834d2b06b8b0aaad27b98a914eadd1cddb21e16a95d083ba461cae685bcd9f` |

## Unverified

没有读取普通包的 extent/native 事件序列，不能证明所有 native leave 的上游来源或更晚乱序均已解决。没有验证数值 camera、深层正文滚动恢复、完整 Observation Context、My 内编辑/照片/登录任务的 Back、连续转场帧率、内存、debug-off、iPhone 或设备群体。当前可见不可用数据没有被恢复；本轮不关闭其功能义务。采用资源的整页视觉符合度与整个 UI→叠层→Sky Goal 仍归各自 owner，不能由这两条 targeted development feedback 关闭。

## Invalidated

旧 generation/session 与 gen12 诊断 trace 不作为本轮普通包输入或修复完成证据。9 次截图各自只授权紧接的一次公共输入；当前保全图仅保留历史观察意义。普通预览、开发 vConsole、独立 ADB 屏幕通道、官方 runtime AppID 和手机字节身份仍是不同边界。没有将 probeAbsent、构建通过、独审通过或原图 hash 相同提升为产品验收。

## Cleanup

本 agent 已停止全部 capture/input 并将手机唯一输入权归还 Root；最后实际图停在 Map 较短面板。session 和普通 generation 按 Root 后续 UI 工作需要保留，本 agent 未调用 stop、关闭 IDE 或清理任何 Root 资源。原图/receipts 已先保全，未删除或上传。除本报告及上述私有证据副本/只读对照结果外，没有修改源码、Context、构建、服务、账号、VPN 或用户数据，没有提交、reset、clean、stash、worktree 或远端覆盖。
