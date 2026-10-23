# R19 gen11：已知 medium → My → Map 的有限真机反馈

## Candidate identity

- 模式：`development_feedback`，原 USB Android 手机，普通官方预览；不是固定候选验收。
- feedback：`C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm`。
- generation：`generation-000011-oe7ZN2/project`。
- bundle SHA-256：`45fdc25522d5da8e72c8d5476da5be6445e983767a42f29dbf2e041f7e32e992`；本段只读 feedback 元数据，与 Root 交接一致。
- 当前 session：上述 feedback 下的 `starward-device-test-TggVwu`；旧 session 不用于本次反馈。
- Root 已完成该 generation 的官方 `auto_preview` success、原手机实看与 bind；本段复用，不重发、不重建。ADB capture 的 `runtimeAppIdVerified=false` 不能替代独立 AppID/字节读回。

## Invocation result

本段独占手机输入，完成资料读取后才开始 capture。只使用原公开 `tools/miniapp/device-test.mjs` 的 capture、tap、back；450px 审阅 wrapper 仅对原 capture 等比派生小图，原 PNG 和 receipt 保留，未改 60 秒、foreground、设备/显示及单次输入 guard。四张审阅小图均已实际查看。

1. 查看 Root 保留的已知 medium 稳定基线 `620587ca-9f5f-4092-8574-0dc3534f2fd2`。Root 在生产入口点选隔离测试 marker 后得到该图，再进入 My；本段没有重复该前置动作。
2. fresh capture `ed8124af-7d43-4624-96d7-1383ae2d65b3`，实看为 My，左上地图返回清楚可见；随后立即发送一次归一化 `tap (0.15, 0.07)`，命令 `actionSent=tap`。
3. fresh capture `0d8c96e0-8db1-4976-b8ed-efde12ea72f5`，实看已返回 Map，面板较基线明显变短；随后立即发送一次系统 `back`，命令 `actionSent=back`。
4. fresh capture `e12d85d7-8fba-40a8-b655-586ea2d32f99`，实看整个点位面板已关闭，仍在 Map。

两次输入均正常通过原 guard，无过期拒绝、绕过、重试或额外输入。每次 capture 都由现有 owner 检查 Mini Program foreground，实际图像也与 My/Map 对应；原图均为 1080×2376。

| 用途 | 原图 captureId | capturedAt UTC | 原图 SHA-256 |
| --- | --- | --- | --- |
| Root 已知 medium 基线，本段实看 | `620587ca-9f5f-4092-8574-0dc3534f2fd2` | `2026-10-22T21:05:49.371Z` | `809f677e0e371d996304aa2521c4c79c2e73c1309aee2a534431692ad284cd14` |
| 本段 My 输入前 | `ed8124af-7d43-4624-96d7-1383ae2d65b3` | `2026-10-22T21:11:16.113Z` | `d5badd18e6aec4a4b85348799935e23cd9a98bc889a8457eb026e3ff0e42330d` |
| 本段返回 Map、Back 前 | `0d8c96e0-8db1-4976-b8ed-efde12ea72f5` | `2026-10-22T21:11:31.752Z` | `d79888132fd3f422dfd7450f1e197a8a4094081181360105e1ba1cb36a375d62` |
| 本段 Back 后终态 | `e12d85d7-8fba-40a8-b655-586ea2d32f99` | `2026-10-22T21:11:49.718Z` | `dc96dd7897aad10a1a222cb2adb0e306bc08252123477c28b640547d53fbaa3b` |

各原图位于当前 session 的 `screen-<captureId>.png`，其 receipt 为 `.png.json`；实看文件为相邻 `screen-<captureId>.review-450.png`。这里只记录证据身份，不复制图片或披露地点、坐标、账号、接口内容。

## Observed product behavior

已知 medium 基线与 My 返回 Map 的画面中，固定底部动作区位置相近，而面板顶部约从全图 0.508 降至 0.595；这是外框变短，不能仅归为正文滚动。这两个数是 450×990 等比审阅图的目测比例，不是原生 CSS 或 ruler 测量。

返回后的一次系统 Back 使整个点位面板消失；没有出现保留面板、仅再缩一档的终态。最终画面为完整 Map、右侧工具与底图来源提示，面板关闭，无 My 或其他辅助任务覆盖。

现有 owner 的 `openDetail` 在 `apps/wechat-miniapp/src/pages/map/index.tsx:1445` 设 `medium`；Map 系统 Back 在同文件 `:2152` 使用 `previousPanelExtent(panelExtentRef.current)`，有前档则降档，无前档才关闭；`panel-snap.ts:28` 定义 medium→small、small→null。按这一规则，本次结果**支持已知 medium 经 My roundtrip 后变为 small**，单纯“档位仍为 medium、仅 content floor/高度变化”不足以解释此次一次 Back 的终态。

此结论仍是行为推断：没有直接读取 `panelExtent`，也没有 native Back 回调计数；不能排除一次系统按键在原生层触发异常重复消费。因此不据本结果锁定 producer，不把先前最小 React/Taro 调度中未见的 `active=false` 脉冲写成根因，不建议硬编码返回 medium。前置调查与竞争解释见 [几何独立调查](R19-MY-RETURN-PANEL-GEOMETRY-REVIEW-20261023.md)。

## Verified

- 当前 gen11/session 下 My 左上地图返回可达真实 Map。
- 与 Root 的已知 medium 基线相比，返回后的面板可见外框更短。
- 返回后仅发送一次系统 Back，实际终态为整个面板关闭。
- 本段小图审阅在原 60 秒窗口内完成，两次输入均受原单次 guard 约束。

## Unverified

- 进入 My 前后真实 extent、content floor、rulers、native actualHeight 与原生事件数量；尚未定位状态 producer 或几何变化根因。
- 深层正文阅读位置、完整 Map identity、相机精确一致性及 My 过渡逐帧行为。
- 其他手机/平台、完整 UI 符合度、性能、内存和固定候选验收。
- My 账号资料不可用是现有 `anonymousOnly/accountRoutes=false` 隔离条件；本段未登录、切账号或修改该条件，未验证真实账号数据能力。

## Invalidated

本段未使用旧 session、过期截图或重复输入 authority。两张输入前 capture 已由其各自单次输入消费，终态截图也不能在未来直接充当 fresh 输入授权。较早“返回前 extent 未知”的轮次不能冒充本次已知 medium 前置条件。

## Cleanup

没有修改源码、服务、网络、IDE、预览或构建，没有 Git/上传操作，没有读取聊天、相册、剪贴板或清除手机数据。只新增本记录及当前私有 session 内的原 capture/等比审阅派生物。当前反馈 run 和 session 仍由 Root 使用，不 stop 或删除。

手机输入已停止并归还 Root。最后有效原图：`C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/starward-device-test-TggVwu/screen-e12d85d7-8fba-40a8-b655-586ea2d32f99.png`；最后实际画面为 Map、点位面板关闭。下一次任何手机输入仍需重新 capture、实看。
