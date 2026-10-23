# 地形跨覆盖父图候选实现

2026-10-21。承接 `R19-NATIVE-OVERLAY-PHONE-REVIEW.md` 的同 ID update 实测准入及右侧新露区域缺口。本次只实现已有 owner 的有限分支；未操作手机、IDE、服务、构建推送、提交或上传，也未修改 PLAN / HANDOFF / Context。

当前生产候选允许 **fine A → 覆盖新实际视窗的 parent B → fine B**。放大、抖动或请求缓冲边缘超出但实际视窗仍被 A 覆盖时，不额外读取或安装父图。该行为已通过源码/受控 native 回调检查，真实可见延迟、透明区域及持续资源表现仍待 root 的完整候选观察，不能记为性能或无泄漏验收完成。

## 实现与责任

- `useTerrainOverlay` 第四参数由 initial-only 布尔提示扩为布尔或当前 identity 的准入函数。可选 metadata/image 读取随实时准入取消，待原生实际 ack 后可准入同一未完成请求；已完成 fine 的 identity 不重新开启 parent。初次已有新鲜 fine metadata 仍只取 fine 图片。父图按当前请求调用既有 `terrainPreviewForRequest`，不把 parent 写入 fine coverage hysteresis。
- Map 调度和安装复用 `useMapRasterInstallation.canPreview`，使用 `nativeViewport.bounds`，细图请求仍用原 20% buffer。该判定读取真实 retained/queued target 的原范围：空表面允许初始父图；同 identity 父图允许文件恢复；当前 identity 的 fine 已排队即拒绝晚 parent；其他 parent 仅在实际可见范围有缺口、当前原生 slot 已确认且实际 context 存在 update 能力时可接替。
- Installation 的 `initialOnly` 参数改为可选 `preview: { viewport }`，在目标采用时重新检查同一规则，避免只依赖前一 render 的请求提示。原候选/来源上限与 presentedData 的真实 ack 责任保留；能力变化本身不重复派发相同 target。
- Coordinator 在真实 native command 使用 context 时记录能力，不以版本/类型名推断；`canReplace()` 在 pending、unknown、清理欠债及 disposal 时拒绝准入。跨覆盖 parent 携带 `same-id-only` replacement policy 到实际派发点；即使准入后 API 消失，也只回报原图仍为当前安装，不会改用两个半透明 ID。初始 parent 及其同 identity 文件恢复保留旧兼容路径，普通 fine 仍保留缺 update 时的两 slot 回退。
- 严格 replacement policy 随跨覆盖 parent 及其本地文件恢复保留；fine 接管后恢复普通策略。controlled exit 的 suspend/resume 使用最新目标及其策略，原生失败、超时、迟到、取消、双文件 pin 和实际 remove 回执责任不改变。

未修改 `terrain-overlay-coverage.ts` 的既有覆盖/层级/来源规则，没有新增缓存、轮询、预取或调度 owner。

## 实际检查

最终 92 项相关检查通过，覆盖以下 8 个既有入口：

`terrain-overlay-coverage.test.ts`、`use-terrain-overlay.test.ts`、`use-map-raster-installation.test.ts`、`terrain-ground-overlay.test.ts`、`map-native-compatibility.test.ts`、`terrain-map-presentation.test.ts`、`sky-entry-transition.test.ts`、`raster-image-resources.test.ts`。

新增/更新的关键检查包含：新覆盖 parent→fine、fine 已排队拒绝晚 parent、真实 viewport 与 buffered request 分离、同范围 finer 不降级、准入撤销取消父图但不取消 fine、缺 update 不请求/安装跨覆盖父图、准入后能力消失的派发保护、初始 parent 文件恢复兼容、parent update 失败与 pin/清理欠债、相同 ID 的实际 src/bounds 调用及最终 pin 归零。已有隐藏/晚响应/controlled exit/资源压力检查复用。

`npm run typecheck --workspace @starward/wechat-miniapp` 最终 exit 0。一次早期检查发现 `latest` 的 replacement 字符串被推宽，已修正并完整复查。所改文件 `git diff --check` exit 0。现有 `transformTerrainWaitSources` 在 6 个当前生产文件上仍通过全部精确 anchor；未改任务观察器。

## 独立审查绑定与剩余证据

以下 SHA-256 是本次完成时的完整当前生产文件，包含此前保留的未提交工作，不是仅此分支的 diff：

| 文件（相对 `apps/wechat-miniapp/src/`） | SHA-256 |
| --- | --- |
| `hooks/use-terrain-overlay.ts` | `c2a446c2e383b25da748cd134f51a805acdabbefeeed3324e6d945e10bec3438` |
| `pages/map/use-map-raster-installation.ts` | `ab0769adccbd331e1312b25e048b049ce3f6f092ac1279ec9e52d53aa49257ed` |
| `pages/map/map-ground-overlay.ts` | `1dc86c0af9c551a9de87175b7038bc3ed3cf8358742e0140e303669f6708e349` |
| `pages/map/index.tsx` | `9e62b429a15c8ded708be75f037ec9d14be619912875bb1779c7c9e1143cff1e` |

独审应核对实时 admission、实际派发 same-ID policy、fine/parent identity 和 retained source/pin 生命周期；本报告不是独立审查。完整构建及 root 的地形＋光害 actual A→parent B→fine B 缺口/透明区域/细节正确性观察仍未进行。云层、连续快速缩小/移动、外部非受控 Map teardown 的原生销毁围栏和目标 GPU/堆内存证据保持未完成；本机受控 pin 归零不证明真机无泄漏。
