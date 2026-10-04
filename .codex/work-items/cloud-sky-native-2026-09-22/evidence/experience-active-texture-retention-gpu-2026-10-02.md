# 当前帧纹理保留：完整正常路径的 task-only GPU 对照

2026-10-02。只执行 root 授权的两个变体 × 原 13 个冻结条件，生产未采用。原 `skyArtworkTextureWindow`、source texels、shader、产品 opacity、注册/WCS、页面资格和解码 owner 全部保留；先前 source-plane 裁剪候选在 45/85 出现真实单字节差，已否决，不与本机制合并。

## 输入与单一机制

冻结候选 `output/active-texture-retention-candidate-1002-r2/candidate-owner.ts.txt` SHA `0201b42d5cbe371f1a3b45d2baba36b06a5a8dedc3585d1fc4111d167fa45448`，原 owner SHA `cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e`。候选只有两个 allocation guard 从保护上一帧身份变成保护当前帧已用身份（保留 paired pins），以及 finish 退休本帧未用身份、保留本帧实际工作集。原 16MiB 只在候选作为 allocation-pressure target，**持续 frame-end cap 已改变**；不是固定预算内的无成本优化。

真实执行器入口 `scripts/experience-active-texture-retention-gpu-ab-2026-10-02.mts`。用冻结 bundle 内唯一 `createSkyGpuTextures` 的函数 body 替换，body 外所有原字节保留。两个变体同加只读 method tap，返回值/this/异常照传，不增加 GL 查询/metadata 请求，记录 get/getWindow/begin/finish/withPinned。`get` 的内部 lexical getWindow 没有被声称截获：只记录它实际 texture/null 与 full 请求意义；`getWindow` 实际 rectangle/bytes 可见。

原 13 条来自 `output/playwright/cloud-sky-full-hook-resource-1002-r5/result.json` SHA `d7aee05722e0f3472ca89b25d818c486f4c19d530bc7f39f138701568946c5e1`：W3off 与 W3on 各 45→85→139→274.9→45，Moon 2.4→85→2.4。DAY 是普通配色标签，不推断真实观测时刻为白昼。selected reference 仍 null；真实页面正常 SDSS 与 LOCAL 光学 fixture gate 未 wanted，W3/银河资格沿 page 源。

r5 因进程 cwd 与 metafile 路径基准不一致、旧 harness 静默 catch，原 result 的 sourceBindings 实际只有 page/API-client 两项。没有改写或回溯升级 r5。新 receipt 使用 r4 原 138 项逐文件检查 current hash；完整 r4/r5 bundle 经 TypeScript printer 去 comment 的 **全部 AST 文本精确相等**，hash `c8fea7c94ee4136fce395a6ffb42171e6d08be2d1bfe168b7876c2ff88fbc97b`，两份规范化文本都保存。原三 diagnostics taps、四 executor、b3 冻结脚本及所有真实 offers/report/metadata 均严格绑定；r5 最初 5 条 RGBA 精确对应 r4。补证是新运行时的明确输入责任，不伪称 r5 运行前自产全依赖绑定。

## 实际输出与失败历史

`output/playwright/cloud-sky-active-retention-gpu-ab-1002-r3/result.json`，12,993,432B，SHA `72039d3c0d63d89339a91a7aa2afbf64c40d52974faff4159a900f84b7334e31`。26 个完整 rawRGBA 全部逐 byte 相等并回原 r5；actual owner calls/source identities/returned rectangles、13 个 Hooks wanted/ready/cold/lease 模型、scene references 与来源结果一致，78 实际 pass GL0，无 image failure。

r1 是任务只读 tap alias 与 lexical getWindow 重名造成语法失败，0 条实际场景，保留原 files/failed。r2 已跑完 baseline13 和 active 首条（像素 exact），严格 ready 比较因每次 cache boot 的合法唯一 attempt nonce 不同停止。r3 只重跑 active13，baseline13 的实际 PNG/RGBA/trace 原样复制并逐文件 `reusedInputs` 绑定。新比较仅将严格 owned `namespace-SHA-bootNonce-attempt.extension` 路径的 nonce 视为等价，namespace、SHA、attempt 序号、扩展、objectId 与所有其他字段不删除；完整原路径均保存，未靠忽略身份差异通过。

baseline r2 disposal 的 liveBytes0/aliveTextures0 断言确实执行后才进入 active，但 raw final 原本仅在内存，后失败未写出；r3 如实记录该 gap，没有造 final snapshot。active r3 `active-final.json` 完整保存，真实 ledger 重算至 0 logical bytes、0 textures，全部 file lease/running/reserved 清零。

`scripts/experience-active-retention-gpu-readback-2026-10-02.py` 的只读输出 `output/active-retention-gpu-readback-1002-r2/result.json`，788,487B，SHA `bcb68e2d385ffc4f8fc704f9a860525839d99eae27e0e5de0d7978adcbdbb3f0`。26 PNG 实际解码、Yflip 后逐 byte 对 rawRGBA；78 个 source upload/copy/deletion ledger 逐事件重算 peak/end 并与真实 encoded source SHA/尺寸核对；原 138 个依赖、201 旧资产与 6 保留文件 hash 不变。readback r1 因 bound report record 无 transport 字段的 parser KeyError 未完成，原失败保留，修 .get 后只读 r2，没有重渲/改原结果。

## 收益与持续驻留代价

下表 warm 指第三次 pass，upload 是 native-source→GPU，**不是 encoded 网络传输**。

| 原条件 | baseline warm upload B → active | baseline warm end B → active | baseline 全3pass peak B → active |
|---|---:|---:|---:|
| W3off139 | 14,155,776 → 0 | 16,777,216 → 30,932,992 | 30,932,992 → 30,932,992 |
| W3on139 | 15,204,352 → 0 | 16,777,216 → 31,981,568 | 31,981,568 → 31,981,568 |
| Moon85 | 2,621,440 → 0 | 16,318,464 → 18,939,904 | 18,939,904 → 18,939,904 |

W3off→dome 的 condition peak 18,874,368→30,932,992；W3on→dome 16,777,216→31,981,568；Moon→局部返回 16,318,464→18,939,904。包含高驻留的转场起始峰值是实际成本，不能因为整个矩阵的最大值没更大就声称免费。

39 帧总 actual source-upload：244,121,600→189,333,504B，净少 54,788,096B；copy 两者都是 26,566,656B。暖帧共少 64,225,280B，但 first pass 额外 9,437,184B：两个首139各多 8,912,896B，W3on dome 少 8,388,608B，其他首帧相同。全部 logical peak maximum 两者 31,981,568B，**frame-end maximum 16,777,216→31,981,568B**。本机制可消除这一组场景中当前工作集被 finish 剪掉后的暖重新上传，不能承诺所有移动/窗口变更或错误路径都无上传。

encoded transfer/metadata/new decode/文件与 decoded source references 正常模型相同；缓存/Hook ownership 没有因 task GPU retention 改变。`draws.source` 是原 GL 当前绑定纹理，不等于每个 primitive 采样该图或拥有照片 source credit；比较的是 actual scene 返回的来源结果，selected/SDSS 均 null，不虚构采用 credit。

## 采用边界

已实际查看 Moon 局部、W3on139 等整场 PNG；image/interaction/画质没有因此认证。软件片元 HIGH_FLOAT precision23/range127，RGB8、alphaBits0（opaque raw alpha255）。所有 actual normal pin scopes=0，无主动注入故障；paired pin/exception/copy-failure/retirement 等由另一独立边界 probe 核，不把 normal pixel pass升级覆盖它们。

MapFS、React/query/native callback 调度受控，实际 desktop HTMLImage 解码并提交 real SwiftShader GL。人为强持 probe 图片对象，不认证 GC。logical GL / file / decoded reference 模型不包含 native/driver/backbuffer/OS 物理总内存，不认证 WEAPP 总内存、时序、fps、200DAU 或最终组合体验。当前 **task-only 候选未采用**；等待独立正常输出读回和共享失败/生命周期边界后，由原资源 owner 决定是否以可接受持续驻留代价修改生产，不能仅据净上传量降低就采用。
