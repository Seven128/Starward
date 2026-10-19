# R17 normal baseline v3 preparation

2026-10-19。当前revision：**review-r2；已交付绑定gen25并取得目标样本，正常性能未验收**。本候选直接来自当前生产源码 HEAD `944a1d6c9ffed6ede39fa9e6c7b56ff2594d57d2`，没有从 gen24 或历史 sibling 链回放。`mode=normal`、`variant=baseline`、`buildGeneration=25`、`probeVersion=3`。

完整 source snapshot 有 **1573** 个文件，生产及必要 type/test-support 输入 **1569** 个均已逐项回读且未变；新增诊断文件 4 个。生产分支、源码、私有配置、手机、DevTools、feedback、服务/端口、账号、数据库、PLAN/HANDOFF/INDEX/Goal 均未由本准备工作修改。

## Binding and package

| 项目 | 值 |
| --- | --- |
| source manifest SHA-256 | `f87c10fb0b6ff0c24f3a979e99aa30cbde4ca1940af85805c5af56905642d0ba` |
| complete source snapshot SHA-256 | `1226932a842b2e83c63b4c24731fc15fbea9e0d70511dc6e9c6d46979f871674` |
| pre-build source/template binding | `10236f0e034ae96d9e31ed5e081a837a53f4cdd128e3f9ac34da6d588f151a4c` |
| both bundle copies SHA-256 | `d4ed31dfe62d4d0268eb3d415d932d0f958615ba6a9ac98e474edc7a13432819` |
| compiled physical-origin SHA-256 | `3b3d8a49ba867c009f2d2d289aeebfd0cf91c781e06f138ff10ee5dc89dabd77` |
| channel port | 8798（root 负责服务验证） |
| complete bundle | 338 files / 4,999,195 bytes |
| main | 2,016,773 bytes；余量 80,379 bytes |
| sky / content / spot | 1,342,731 / 1,041,370 / 598,321 bytes |

完整构建目录：`.codex/work-items/sky-map-performance-2026-10-18/tmp/r17-normal-baseline-v3-review-r2/source/apps/wechat-miniapp/dist/weapp-check-r17-normal-v3-r2`。完整候选项目目录：`.codex/work-items/sky-map-performance-2026-10-18/tmp/r17-normal-baseline-v3-review-r2/project`。以上是生成文件预算；官方编译/上传和实际手机行为仍由 root 后续核验。IP、appid、token 不写入此报告；origin 仅在内存从已有 runtime.apiOrigin 推导到 8798，编译后读取 3 个 JS 文件中的 7 个同源字面量，未发现其它 origin。

## Minimal source delta

保留原完整 renderer/GPU/native copy/caption、accepted React state/ref/setter/updater/equality、正常 Scene memo、时间单写者、BSC+SAO 全消费者、资源 demand/readiness/retirement 和数学。没有 freeze、synthetic、direct-action、scene-memo 所有权替换、删星、降精度、产品节流或新 writer。

复用 v3 runtime、现有 Page/upload observer、原 accepted-action controls 的 15 秒 metrics / 20 秒同 run guarded product Pause、固定 terminal 与有限显式同 bytes 重试。新增 normal observation 只在原调用点对成功返回的 native measureText/copy 累加数字，不替换原生方法，不缓存文字或 frame，不保 ctx/history 强引用；surface ready/retire 只记录布尔事实。未观测的 cache/Scene 字段导出 null；synthetic 计数为真实的零。Page 的延迟保留原 producer 时钟语义，不被 v3 clock 校准。

全部 17 个源差异（其中 config 只启用 hidden maps 和对应类型声明；`context!` 仅恢复 closure 类型窄化，不生成运行时行为）：

- `apps/wechat-miniapp/config/index.ts`
- `apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle.ts`
- `apps/wechat-miniapp/src/features/sky/sky-canvas-surface.ts`
- `apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts`
- `apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts`
- `apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts`
- `apps/wechat-miniapp/src/features/sky/sky-observation-time.ts`
- `apps/wechat-miniapp/src/features/sky/sky-scene-render.ts`
- `apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts`
- `apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts`
- `apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts`
- `apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts`
- `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`
- `apps/wechat-miniapp/src/features/sky/r17-phone-probe-runtime.ts`（新增）
- `apps/wechat-miniapp/src/features/sky/r17-phone-probe-controls.tsx`（新增）
- `apps/wechat-miniapp/src/features/sky/r17-page-bridge-observer.ts`（新增）
- `apps/wechat-miniapp/src/features/sky/r17-normal-observations.ts`（新增）

## Checks and their limits

- 实际 materialized source/control integration fixture 通过：原 setter 立即一次求值、完整状态/ref/equality、3 个 null retirement、A→B→A、异常、原 memo dependencies/result、fallback unbound、完整 request 字段和 draw dependencies、clone identity、真实 accepted/BSC/SAO、原 Play 守卫、15s/20s、hide/unmount/replacement-run、失败 POST / 424 同 bytes 重试、late acknowledgement retirement。v3 显式 Date fake 已接入；未知 elapsed 的实际 status 读回为 `elapsed未知/manual`。
- 严格 `noEmit` 类型：生产 **0**，候选 **0**，新增 **0**。第一次准备漏支持文件和 closure 窄化问题保留在 `tmp/r17-normal-baseline-v3-review-r2/preparation-attempt-1`；当时没有完成包。历史其它诊断候选的类型问题没有被重标为当前生产问题。
- v1/v2/v3/protocol/collector portable **23/23**。未触碰 live collector。
- 候选 native surface/lifecycle/time/ready/selection/page recovery 等 **53 项通过**。首轮另 6 项是抽取 fixture 缺诊断 imports / snapshot 缺 backend 公共资产，现已分别由实际候选 GPU 的原断言 **4/4** 和当前生产 SAO 消费者+真实发布资产 **13/13** 解决。GPU adapter 只把实际 probe/upload hooks 放入原 VM；未改断言。SAO owner 在候选与生产之间逐字相同；没有为检查复制两套各约 56MB 的 backend catalog。
- 完整 Taro production build、physical-device bundle guard、静态 inspection **11/11**、每包/总包预算、source readback 和两份 complete bundle fingerprint 均通过。不重跑全仓套件。
- 外部 hidden maps **31** 份，**7,181,793 bytes**，位于 `.codex/work-items/sky-map-performance-2026-10-18/tmp/r17-normal-baseline-v3-review-r2/source-maps`；两份手机包都没有 map 或 sourceMappingURL。`source-map-bindings.json` 绑定每份 map 与对应原 JS；spot page / stellar scene / scene render / surface / v3 runtime 五个关键源的 sourcesContent 与 materialized TS 全部逐字匹配，可给本次 profile 提供源码归因。

窗口边界：controls 在实际 Play 的相对 0 启动；normal text/copy 与原 Page/upload scalar 在 0 重置、0/15s 捕获，因此这些 scalar 增量包括 recorder 原 1s arm 区间；recorder 主要计数/elapsed 则覆盖约 1–15s。20s terminal 只增加 Pause 事件与结果，不制造 20s work total 或 drain 时间序列。导出后的 numeric lifetime 计数可继续，已封存的 15s metrics bytes 保持固定。

所有补充 check/log/map bindings 的 SHA 见同名 JSON 的 `softwareVerification`。原独审发现的timer与公共账号namespace阻断及env条件项已修复，修复独立复核通过，见 R17-NORMAL-BASELINE-V3-FIX-REVIEW.md。此前未变owner检查直接复用，r2实际focused fixture19/19；原构建/检查与报告在外部和原tmp目录保留，未重标为r2重跑。

## 当前目标结果与下一步

root已交付/绑定并取得真实正常完整Sky短样本，见 [结果](R17-NORMAL-BASELINE-V3-RESULT.json)。当前公共隔离lane的实际HTTP见 [就绪证据](R17-NORMAL-LANE-READINESS.json)，使用SAMPLE_DATA天气，不是账号恢复或真天气验收。原Play/Pause/取消语义保留，nativeGlyphCalls在本样本为0，不宣称非空文字度量。

CPU文件已停止并精确取回，按当前maps作归因；分配采样、A/B完整可持续播放/恢复和其他Goal义务仍欠。只按归因证据选择后续定向对照，gen24继续暂停。
