# 全天球与地景恢复：独立审查（2026-10-02）

审查者：独立子任务 `/root/sphere_review`。审查时间：2026-10-02 04:19（Asia/Shanghai）。本记录属于当前唯一 PLAN 的全景可见性依赖，未建立第二计划，也不关闭 Goal。审查与实现由不同 agent 完成；审查未更改生产代码、工具会话或设备。

## 审查依据与范围

依据当前 `AGENTS.md`、`project_context/global.md`、`DESIGN.md`、`.codex/skills/uiux_design/SKILL.md` 及 `project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md` 的“全景浏览、影像质量与端云性能（2026-10-02）”。检查真实代码职责及调用，包括 BSC/SAO 精确帧、共享投影、天体盘面、星座、网格、HiPS 网格/请求资格、GPU shader、地景源 alpha/相机 fade、completed mask、点选/标签/选择、目录事实及共享 native image loader 的生命周期。

源码审查和独立生产函数复现，不等于实际微信 Canvas/驱动、身体手势、手机性能或完整产品验收。父任务报告的批量 type/unit PASS 未代替本审查；下列具体反例由审查者独立执行。

## 发现与修后核查

1. **HiPS antipode 折返错误：已修、开发范围通过。** 原生产 `projectSkyHipsTileMesh` 会让球面反侧三角形经投影无穷远错误覆盖视窗。identity EQ→ENU、`createSkyViewBasis(22,45,0)`、FOV45、390×844 时，中心真实 base face8，但 face2 triangle1 也覆盖中心，重心约 `.0227433155/.3249133450/.6523433394`。75 个相机组合（高度 −89/−45/0/45/89，方位 0/22/90/177/270，FOV45/85/270）独立复现修前 24 处错误覆盖、修后 0 处。新增球面 cap 排除在原 UV/共享相机下拒绝反侧单元，没有恢复地平线半球裁剪。软件 GPU 中 all faces 与 facing-only 完整 RGBA 相同；这不认证任意 FOV/视口或真实设备网格误差。

2. **最大全天比例手动方向被天顶覆盖：已修、开发范围通过。** 原 `pan(view,1)` 和随后 manual update 都把向下 forward 改成 `[0,0,1]`。修后明确 manual pan 的 path target 保持实际 displayed view；独立复现 p=1/.5/0 后续 update 保持请求方向，仅有浮点 ulp 差。首次缩到全天的既定天顶入口保留；实际 DevTools 最大全天拖动、取消、连续缩放/跟踪组合仍须父任务绑定观察。

3. **零需求回程交换程序树/照片：已修主要源码路径，完整恢复连续性未验。** 共享 loader 保留一个已成功的回程 bitmap，优先 overview，detail 先到时保留该有效 bitmap 与已进行的更优 overview 请求；不会启动新离屏下载。overview 完成后只保护其一，其他 decoded 可转 cold file，缺省消费者行为保持。它处于 landscape 原有 16MiB source-equivalent owner 账内（通常 2MiB overview、特殊 detail-first 最多 8MiB），并非新增全产品/native/GPU额度。检查 update/trim/suspend、IDs/hash、取消、晚到和 dispose，未发现无限请求或 emit 循环。隐藏、关闭及 Canvas/publication 代际更换仍释放 owner。

4. **detail-first 降档不能把 retained fine 当粗图绘制：已保持预算并修复暂换树。** 生产 selector 在请求 overview 时拒绝 retained detail 是既定预算语义。已知 source alpha、没有 eligible bitmap 的 pending 路径现在不画无关程序树，availability 为 null、completed landscape 为 null，不能把 alpha 当 opaque 成功；图片成功后 readiness 与相机 fade 相乘，同时进入实际 shader 与 committed mask。明确图片失败且当前没有恢复请求时仍允许实际程序模型回退并绑定其 mask/来源。待下载/decode 与失败没有互相冒充。

5. **readiness 的两个独立生命周期反例：已修、开发范围通过。** 原 reduced-motion true→false 在同一有效 bitmap 上输出 `[1,0]` 并重启 fade；现在只保留 `[1]`。原 canceled tick 在 false→true 新周期晚到后能发布 `.15625`、抢新 handle、使 dispose 后遗留一 callback；引入周期 generation 后，独立原反例得到 values=[]、仅一当前 callback、dispose 后零 callback。Canvas/hash/revision scope 与 page sameScene/frame/dependencies 已纳入 readiness/pending/failure。没有将 readiness clock 写作观测时刻。

6. **地下 solar 背景硬色阶：已修有限输出，完整环境质量未验。** 旧 `ray.z<=0` 直接退底色在已查看的 normal alt0/−5 图中形成明确横缝。当前只在地下把显示射线延拓到地平颜色，再于共享 15° display window 连续退底色；正高度保原公式，不外推地下物理 air mass。代码未见新 NaN 路径；新有限 PNG 中旧硬横缝已连续。其显示曲线不是已验收的天文阈值或当地光度模型。

## 实际输出审查与绑定

已读真实 artifact：`output/playwright/cloud-sky-full-sphere-solar-1002/result.json`，审查时 SHA256 `3fab03dfe4ecf34d40ecd47a0ab041be68b7f1be5989e29dbddd16328cc1825c`，production bundle SHA256 `a2888594ccb078f860fbab7d436cf3d4e32439a585c188c68a318522bd294195`。审查时其中 85 个 source hash 与实时文件逐个匹配，无 mismatch；图片/报告来自已冻结真实输入，未新下载。

实际逐图查看该目录以下 PNG，而非仅凭 README/agent 摘要：

- `path-day-1-alt0`、`path-day-2-alt-5`；其 `day` 命名是 normal 路径，不能由名称声称白昼太阳条件。
- `landscape-ready-0`、`landscape-ready-0.5`、`landscape-ready-1`、`landscape-known-mask-pending-no-bitmap`：有真实图片逐步进入，pending 没有程序树；mask/shader alpha 的相符值为 0/.5/1。它们是手动输入 production scene/GPU 的静态 readiness 条件，不是 native 240ms timer 录像。
- `solar-probe-day-sunward`、`solar-probe-twilight-sunward`、`solar-probe-night-opposite`：局部太阳高度场景颜色在旧几何地平处连续。绑定 solar-only RGBA 比较在六个昼/暮/夜、向日/背日条件中正高度变化为零；地下变更属于显示延拓。
- `hips-antipode-only-opposite`、`moon-lower`、`m51-lower-optical`：Moon 与光学源能在负高度真实画出，HiPS 反面不再侵入中心；真实 source registration/phase/magnitude 不被改写。

旧 `output/playwright/cloud-sky-full-sphere-1002-2` 的四张已查看输出保留历史作用；其 solar 横缝不能升级为修后质量证据。软件报告中的 suppressed/legacy 对照具有明确内容作用，但不证明网络、native 解码或实际整帧峰值。

审查发现新报告 `landscape-known-mask-pending-no-bitmap` 的 `actualMask=null`、`landscapeCalls=0`，却将 `effectiveGroundOpacity` 缺 mask 默认记为 1。已交输出 owner 修正描述为 null/无 pass；不重渲未变化 PNG。本节 hash 记录的是审查当时快照，描述修正后的新 hash 应由父任务/输出 owner 另行绑定，不能将它当像素变化。

## 明确仍未验或未完成

- 实际微信 DevTools 的 timer 节奏、240ms 动态感受、快速反向与取消、source-alpha 出屏再回程、resource 降档/重试连续性。静态 0/.5/1 与单元时钟不能认证这些。
- **已显示有效程序回退后重试：** 04:19 快照发现 pending 暂退出有效模型；下文04:40补充已核修后源码及有界真实软件GPU恢复，采用上一实际 completed mask 的资格，未新增通用失败 latch。“保有效回退直到恢复”的 native 无闪变完整组合仍未观察，不能升级为目标运行时通过。
- native/GPU/OS/GC 总量、临时峰值、HTTP真实出口、冷暖首屏与帧时；本报告的 source-equivalent/SwiftShader数字不是这些测量。固定数据缓存/共享服务容量及正式16GB资源没有由本轮审查认证。
- 完整进入→全天/地下/局部→识别→搜索/资料→时间/跟踪→来源/退出/恢复旅程；普通/红光、失败与恢复、设备方向/校准及 Android+iOS 身体手势。手机不可用、新月面未推，旧手机证据不验新版。
- 整体画质与参考一致性：实际昼暮 PNG 中星座插图有很大明亮/低对比区域；本轮只证明旧地平硬缝的有限修复，不认证图层对比、亮度或 Stellarium 完整组合体验。M51 本代源仍可见有限清晰度/显示处理问题，M51/M82及公共影像质量链保持原义务，不能由“地下能画”关闭图质/范围/接缝/缺测/配准。
- ±15° camera/display window 与240ms readiness 是本代展示 tuning，需按参考和目标实际连续体验继续评价。现有 WXML FAILED_DEVTOOLS、最终干净固定候选、完整质量/性能/成本与交付验收仍开放。

独立结论：本轮发现的三个主要源代码路径已有有意义反例与修后复核，新增失败/取消边界经修正后未见进一步源码阻断。有限实际软件 GPU 输出支持真实负高度显示及消除原硬缝；不认证整体 Goal 完成，保留上述具体义务。

## 04:40 补充审查：有效模型重试、实际合成与零贡献来源

本节更新 04:19 快照中“已画程序回退重试仍暂退出”的源码缺口；上述真实 native 连续体验未验范围继续保留。生产 scene 现在只从同一 live Canvas 上一实际 completed mask 获取非零程序模型恢复资格，page 不制造图片失败 latch。`resize/hide/fail/setMounted` 的 lifecycle reset 经 `invalidated` 清除 `paintedSkyObjectsRef`，旧 Canvas 资格不能跨代移入；禁用、无有效帧及当前零贡献也不制造照片成功。

readiness<1 的恢复分支记录实际模型、照片两次成功 source-over 的 transition mask，点选使用同一合成 alpha，整幅覆盖证书保持保守。照片失败时只补缺失 alpha：view=.5、r=.5 的已画模型=.25，补画 `(view-prior)/(1-prior)=1/3`，合成=.5；补画也失败时只发布原已成功模型=.25。独立直接调用生产 scene 的 24 个成功/失败组合（r=0/.5/1、photo、第一模型及补画各成功/失败）逐次累计成功 pass，全部与 committed `skyLandscapeMaskAlpha` 相符。它验证 scene 合约，未模拟真实 GL 驱动失败的部分写入。

审查新增发现并独立复现：当前视窗已由真实 source alpha 证明零贡献、无 bitmap/pass 时，旧分支仍发布 panorama opacity=1，来源 helper 因而把请求照片标为“当前图片”。全透明8×8、alt20 的生产调用修前输出 `{landscapeCalls:0,opacity:1,claimsPhoto:true}`；修后 `{landscapeCalls:0,opacity:0,claimsPhoto:false,availability:true,alphaIdentity:true}`。valid zero 与原发布/alpha 身份保留，零贡献不再冒充已画来源。outer opacity=0 的模型/照片 helper 也返回 false/null；独立 `.999×.999=.998001<254.5/255` 反例确认整幅覆盖返回 false。页面恢复期间说明实际模型与照片过渡，纯模型 caption 改由同一非零模型 helper 判断。

实际另读 `output/playwright/cloud-sky-landscape-retry-1002/result.json`，审查时 SHA256 `caccb93750a132d7eadb2e6613ae964e183dc083139722f83d95a77e29b603a6`，bundle SHA256 `111d30db03dcede46e3d996f373732a72f67b6676671dca5907d4e239814b69a`。85 项 source hash 与全部列出的 PNG/RGBA/bundle artifact hash 逐项实时核对，无 mismatch；旧41/48及上一 solar artifact 不由本节升级。当前最后 page caption/import 修改没有在这个 renderer bundle 的85项源码内；本次已独立读其实际 JSX，page 文件 SHA256 `315a5a49959d31adc8d82cf359e0a4fcf962c74d1d0d4f4fef43bb40530836ad`，没有以软件 GPU 代替实际来源 UI。

实际查看四个普通/红光、viewOpacity1/.5 组合的 fallback、retry-pending、r0/r.5/r1 完整 PNG，以及失败补画、旧补画反事实、仅保 partial model、仅 photo 成功、两层均失败、初次 known-mask pending、true-zero-source 和 zero-opacity 的完整 PNG（28张）。照片轮廓实际出现、半透明恢复保留独立天空；pending/r0 保留原模型图，r1 为纯照片，不凭摘要认定。普通分组名 `DAY` 仅表示普通配色，太阳仍绑定原报告时刻，不能据此声称白昼观察。

独立重新读取原始整幅 RGBA 比较：四个组合中 fallback→pending/r0、fallback→第二次retry-pending、r1→纯照片/再次r1 全部逐字节一致。当前半程照片失败与旧强补画反事实差180463像素、最大通道差32；与完整模型差100040像素但最大仅1，符合8-bit混合量化。报告非反事实 alpha 采样最大差 `.00294117647`，小于1.1/255；4060个真实负高度对象点选检查独立复核未见阈值不一致。true zero 与零相机opacity均 trace空、mask.opacity0、photoCredit null；partial成功且补画失败发布=.25，双失败mask=null/availability=false，初次pending mask=null/availability=null。全部49场GL错误0，末尾已记录纹理/帧缓冲逻辑释放为零。

这组输出的失败控制在真实 GPU pass 前明确返回 false，readiness 为手动离散输入，图片预先解码，资源统计只覆盖逻辑纹理。它支持当前有界 live-Canvas 恢复合成、实际 mask/pick/source 与回程一致性；不认证 native 240ms 计时、快速反向/取消、真实下载/decode/GPU失效恢复、整机总资源或完整组合旅程。M51画质、昼暮插图对比、公共影像质量及端云性能的原义务继续开放。修后源码及本组实际输出未见进一步阻断该依赖收尾的问题。
