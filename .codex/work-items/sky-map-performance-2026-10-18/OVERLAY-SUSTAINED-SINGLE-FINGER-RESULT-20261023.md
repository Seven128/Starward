# 持续单指观察：有限输入扩展与一次时长对照

2026-10-23。结论先行：8 秒请求没有取得可辨地图位移，不能验收持续跟手；同一 Map 状态、位置、方向仅改为 1.8 秒的一次对照取得真实位移，限制“当前 Map 完全不能拖动”的解释。长慢手势的投递/识别原因仍未知，不据此修改产品逻辑，也不继续扫描时长。原生双指、跨新覆盖、pending 接管/My/Sky、资源与内存义务均未关闭。

## Candidate identity

普通 `development_feedback` gen18，反馈 `starward-device-feedback-TAV3wm` / session `starward-device-test-mBiLUn`，prepared `generation-000018-4Kvksw/project/dist/weapp`，bundle `bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5`。沿已绑定普通 Map、terrain/LIGHT；本批未改产品源码、重建、refresh 或推送。公共回执仍明示 `runtimeAppIdVerified:false`、`acceptance:not_evaluated`，不提升为手机完整运行字节或最终验收。

## Invocation result

本批的有界问题是：持续未松开的单指输入期间，已有有效覆盖能否跟随 Map。既有 gen14 的 1.8 秒位移不覆盖这个问题；本批也不以此追查已回答的 region/onUpdated/预取资格。

公共工具的既有整数 swipe 上限由 2000ms 扩为 `MAX_SWIPE_DURATION_MS = 10000`，同一声明用于参数校验/help。坐标、USB/前台/显示尺寸、完整 bundle、session 排他、fresh-view 60 秒、单次授权及原 15 秒命令 deadline 保持；没有第二指针或任意 shell 输入。`device-record.mjs` 未改，仍按剩余录制窗口核 `gestureMs + 250`，不足则拒发。新增/扩展既有 duration 与 recorder owner 案例后，`device-test.test.mjs` + `device-record.test.mjs` **44/44** 通过（本线程 chunk `5b058c`、exit0）；没有独立原 log，不为补文件重跑。CLI help 与五文件 `git diff --check` 通过。独立源码/守卫审查未发现本批 P1/P2，详见[同一边界独审](OVERLAY-SUSTAINED-SWIPE-BOUNDARY-REVIEW-20261023.md)。参数范围不是平台每一时长实际移动能力的认证。

两次都从新 capture 实看后、下一次调用直接走公共 `record-swipe --transport usb`，相同归一化起终点 `(0.30,0.45) → (0.70,0.45)`、同请求 15 秒录像；第二次只改 duration，不改 Map、来源、层或缓存条件。

| 项目 | 8 秒首段 | 唯一 1.8 秒对照 |
| --- | --- | --- |
| before capture / UTC | `fb073518-8a20-4e20-993a-2310bbf27dd9` / 06:20:19.383 | `b4d5efd0-d849-486b-a73e-2d3726309fe8` / 06:32:27.064 |
| requested gesture / record | 8000ms / 15s | 1800ms / 15s |
| host 调用 epoch bracket | 1792736453037→1792736470961 | 1792737172058→1792737190181 |
| 公共结果 | exit0，`actionSent:swipe` | exit0，`actionSent:swipe` |
| 实际编码时长 / 尺寸 | 17.513478s / 1080×2376 | 13.402222s / 1080×2376 |
| after capture / UTC | `e7503eb7-ae9e-4f26-a9ba-d8e9b611c8d0` / 06:21:10.886 | `60a1c899-f2bd-4981-957a-c9b63c7c71ee` / 06:33:10.105 |
| raw video SHA-256 | `ebb29c24734859fbd06df17a70dc04ed96541ec8fa60a173c910f1608f9afd79` | `f39e38ea5ab41620e19bce6defb97b21d65f2e3d8a914c16b1e2c38980e0ee21` |

请求时长、host bracket 和编码 PTS 分列，不能互当物理 down/up 或精确显示时钟。第二段实际编码短于请求15秒，不能声称录足15秒；现有样本确含开始静止、3–5秒位移及后段稳定，足以回答本次对照，但不提供逐帧/FPS或完整物理触摸证据。

## Observed product behavior

Root 实看首段 15 个 PTS：`0,1,2,3,4,5,6,7,8,9,10,12,14,16,17.5` 及 before/after。地标、星形点与地形保持相同相对位置，没有可辨移动；系统钟有更新。独审另核 before/after 排除状态栏和系统导航后的 2,289,600 像素差异为零。终点相等本身不排除中间移动；本次中段结论受已看离散帧范围限制。

Root 实看对照 12 个 PTS：`0,1,2,3,4,5,6,7,8,10,12,13.392222` 与 after 原图；0–2秒基本相同，3/4/5秒地图地标逐步向右移动，后段采样稳定。已有地形与 LIGHT 在这些位移帧中保持可辨覆盖，没有看到整层突然清空或明显与底图分离。未据稀疏帧认证每时刻、最终地理配准或长持续跟手。

两名独立审阅者分别实看首段和对照；新对照审阅者没有复用已结束代理。独立结论及输入前守卫审查均归[同一报告](OVERLAY-SUSTAINED-SWIPE-BOUNDARY-REVIEW-20261023.md)，对照完成后 SHA `62192ed90e6242b37d6b0af7f5830fd21a247a701f6dcf413cb787cd924775ad`。Root 未把命令成功当产品通过。

## Verified

本次公共参数扩展及相关 fixture 检查通过；原守卫正常准入的两次输入均有实际原图、视频和调用回执。唯一短对照建立当前 Map 可以实际 pan，已有覆盖在所看短位移样本中保留。源码核查没有发现可直接解释首段静止的缺陷：Map scroll/zoom 由前台与编辑器 closing 控制，My hide 会 cancel 并将编辑器恢复 open；源码不是当前手机运行状态的完整证明。

## Unverified

8秒物理手势的实际投递/识别和持续移动未建立；不宣称 Map 锁住、公共 swipe 不可用或已找到产品缺陷。双指/连续跨新区域、真实云、最终细节、加载中再输入/My/Sky、native/GPU释放及持续内存仍未验。真实 pending 的必要关联与停止条件复用[普通 gen18 准备](OVERLAY-GEN18-PENDING-READINESS-20261023.md)，不把暖缓存往返重命名为 pending。用户双指时机答复仍待，不将“继续”当已操作。

## Invalidated

首段缺有效实际移动，不能用来验收持续跟手或据此改调度/预取/轮询。1.8秒对照不替代8秒要求。两次输入的 before grant 均已消费，after截图也不能过时回放；之后任何输入须重新 capture、实看和核验。

## Cleanup

原件私有 owner：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/overlay-sustained-single-finger-20261023`。修改前四文件清单及 record-test 补份继续保留；本次另将两原视频、四组原 PNG/回执和五份 source-after 共 **15件 / 11,594,591 B** 复制后逐件 SHA 读回。`preservation.private.json` SHA `1a2d0762602ec2977edb59948887b9d2d4468b9835dbddea5115542240e590f2`。衍生全尺寸帧、按比例 contacts、解码 metadata 与两调用私有回执同 owner 留存；未上传。

离线解码器的 owned Edge/HTTP 已 finally 退出；输入、录制均结束。两审阅代理已完成并结束，不复用。普通 gen18 反馈仍为唯一有效手机候选，未 stop 活跃反馈、删冻结代或改手机数据；当前完整 Map、terrain/LIGHT，面板/LayerSheet/诊断菜单均关。PLAN 哈希仍为 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`，无 commit/push/部署。
