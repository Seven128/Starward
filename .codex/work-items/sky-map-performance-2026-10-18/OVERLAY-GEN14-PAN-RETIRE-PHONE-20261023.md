# Gen14 Map 跨覆盖与栅格叠层退出：手机开发反馈

## Candidate identity

- 模式：`development_feedback`，既有普通自动预览、USB、可见 vConsole；不是固定候选验收或诊断注入构建。
- checkout `codex/remote-main-20260908`，HEAD `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`。复用 Root 已交付的 `generation-000014-hKkGNE/project` 和当前 `starward-device-test-3agABg`；执行后只读 session binding 的完整 bundle SHA 确认仍为 `0f76b93f5b8164baab27e34e2e34d61a0c390849601adfb586a2e2ad570cc1ee`、345 文件。5,021,505 B 为 Root 准备回执值，本代理未重新计算完整构建字节总数。
- 地形服务在本批前已由 Root 切到 17 项静态成品；这是服务/数据条件改变，不能与旧动态输入比较同条件收益。首屏地形阴影实际可见，后续层叠页显示“已读取当前地图视窗，有效地形100%”及 2025 年度夜光估算，terrain 与 LIGHT 均被选中。手机运行字节和 runtime AppID 未直接读取。

## Invocation result

先完整读取当前 AGENTS、设备/开发 Skill、性能方法、官方 root Skill、本轮 `OVERLAY-MEMORY-OBSERVATION-NEXT-20261023.md` 及实际 capture/input wrapper；复用已确认会话，不调用 IDE、不构建、不刷新、不预览、不探测服务或存储。独占手机 capture/input；Root 独立运行只读同实例 PSS watcher，ADB 可能重叠，不能把相应采样当纯手势点。

准备 fresh capture 实际查看并发出 READY 后，收到 Root 明确 `WATCH_STARTED` 首有效点才开始输入。执行恰好两次 `record-swipe`（1,800 ms、各录屏 6 秒），三次普通 tap（开层叠、关地形、选择云量退出 LIGHT）和一次 Back 关闭层叠。每次输入均使用前一步 fresh capture 的实际查看结果与原有 60 秒、前台、单次消费守卫；无 raw ADB input、改 wrapper 或重放。

本地只读发现曾把通配符放进 Windows `rg` 路径，报路径语法错误；改为发现后的确切文件读取，未影响手机操作。首批合并规则输出截断，后续分段完整补读，不把截断当完整读取。全部限定手机命令成功，无输入重试。

## Observed product behavior

1. 初始 Map 为中档地点正文，地图阴影和叠层底色可见。第一次横向跨覆盖后，地图地标位置明显改变，地点正文实际收起，Map 保持前台；没有先假恢复面板。
2. 第二次反向横向操作后，终点截图与第一次后的地标位置未见明显差异。保留完整录像交 Root 核对，不宣称回访已完成，也不补手势。两个松手后终点不能证明“加载中再次手势”或“持续未松手”的完整体验。
3. 正常打开层叠时，terrain checked、LIGHT selected；显示当前视窗地形100%及已读取的年度夜光图例。关地形后 checkbox 为空，地图阴影消失，LIGHT 仍 selected。
4. 选择云量后，terrain 与 LIGHT 均未选中，CLOUD selected。页面明确显示“所选日期暂无云量预报”“暂无可用预报时段”，当前 Map 没有可见云多边形。没有改日期、Context 或重试。
5. 一次正常 Back 关闭 LayerSheet，稳定 Map 地标保留，地形阴影和 LIGHT 底色不再显示。手机交还 Root 并停止所有 capture/input，作为之后静置观察的边界。此状态仅称 **terrain/LIGHT raster-pair off**；云量仍被选择，不能称全部图层关闭。

## Verified

本批实际建立了普通候选下非空地形/年度夜光的界面状态、一次必要的跨覆盖结果、正常图层开关退出与最终稳定 Map。未见前台丢失、意外退出或新明显错误。两段完整原始 MP4、10 张原始 capture 及其回执、8 张等比 review 与派生回执已精确复制并逐文件读回 SHA 核验：38 个文件、22,841,746 B。

私有 owner：`C:\Users\momoooo\.starward-private\sky-map-20261020\device-resume\r19-ui-20261022\gen14-overlay-pan-retire-20261023`。`preservation-manifest.private.json` SHA 为 `f32dff585c00dc4bff28c0280412607d296426b9ff6ccea753fccdcd3965752d`。`phase-anchors.private.ndjson` 有 20 行，记录 host 调用前/后、capture 回执及实际查看后的保守边界；时间来自主机 `DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()`（Unix epoch wall ms），不是设备输入时刻或单调时钟。命令返回后的录像文件名、capture time 和视频 PTS 均不作为内存采样时间。最终 off 后已观察边界为主机 epoch ms `1792712621552`；早于该边界或与任何动作/采集 bracket 重叠的点不能自动归为 off 后纯 idle。

## Unverified

- Root 尚需用既有 helper 解码并实际查看两段 MP4；本代理没有打开新的浏览器或解码栈。第二次反向操作是否产生中间位移、是否被目标运行时接受，保持未验。
- 本批不建立物理输入延迟、帧率、连续未松手、二次加载中手势、全覆盖无留白、云量非空路径或跨设备结论。
- 同实例 PSS/RSS/Swap、分类变化及实际 off 后 idle 范围由 Root 读取 watcher 原件裁定。本代理未读取或推断内存结果；高基线不是本批产生的证明。最终像素消失不能证明所有文件 pin、JS/native/GPU 资源已退休，也不能证明无泄漏。
- 账号、草稿、Picker、来源、Sky、Play、FOV、原会话和私有数据均未操作。

## Invalidated

准备时 READY capture 仅证明当时状态，开始输入前重新 capture；后续每次输入消费其 authority，不复用已消费授权。第二次操作的终点没有支持回访成功的证据，不把 actionSent 当产品结果。旧动态地形样本不用于当前静态成品的直接性能对照；本轮录像 PTS 与 PSS 点之间没有设备时钟关联，不拼接伪精确时间线。

## Cleanup

限定输入完成后立即将手机所有权交还 Root，无后续手机读取或输入。必要私有原件均保留，源 session/普通候选继续归 Root 使用，未 stop/删 session 或冻结构建。未创建浏览器、服务、IDE 窗口、子代理或新构建；未删除私有原件、草稿、旧冻结候选或任何用户文件。Root 后续只读 watcher/idle 封存与最终解释仍待完成。
