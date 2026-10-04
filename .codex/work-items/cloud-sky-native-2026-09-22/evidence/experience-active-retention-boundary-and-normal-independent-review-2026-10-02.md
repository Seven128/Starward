# Active-retention：共享边界作者证据与正常矩阵独立读回

日期：2026-10-02。状态：**task-only / NOT ADOPTED**。此条记录的 agent 是 `/root/active_retention_boundary_probe`：没有编写 root 的候选纹理 owner 或 sphere_grid 的正常矩阵，独立检查这两者；本 agent 自己编写共享边界脚本，所以边界部分是作者证据，需 root 独立 review，不能用本条自审代替。没有修改生产、资产、PLAN、Context、预算、watch、服务或开发者工具。

## 冻结对象与职责

- 生产 `apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts`：`cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e`。
- root 候选 `output/active-texture-retention-candidate-1002-r2/candidate-owner.ts.txt`：`0201b42d5cbe371f1a3b45d2baba36b06a5a8dedc3585d1fc4111d167fa45448`。
- 独立阅读实际 `sky-gpu-renderer.ts` 的 `artworkLevels`：有效 coarse/fine sources 在同步 `withPinned` 内准备并共同提交；一 bitmap 在两 slot 时使用一个 full-source texture，避免准备第二个窗口时替换并删除第一个 sampler。fine upload 独立失败保持 coarse；返回 submitted/prepared 不等同可见 source credit。
- 实际 `sky-artwork-loader.ts` 的 weak lifetime registry 由 `registerSkyNativeImageLifetime` 登记，GPU begin/resident/new-upload 路径均检查 `skyNativeImageIsCurrent`。边界探针调用这些实际函数，没有 mock 掉 registry。
- 原 owner 的 upload/window/copy/failure、weak lifetime 和同步 pin 机制不改；候选仅改两处 allocation pressure guard（previous-frame → current-used，pins 保留）和 frame-end inactive-only retirement。**原 16 MiB frame-end 上限在候选中不再成立**。该值仅作为上传前压力目标，active working-set 的持续驻留可以超过它。

独立逐字重建上述机械 delta；实际正常矩阵 bundle 在 factory 外与原 r5 bundle 的每个字节相同，baseline factory 保留原 compiled prefix/object，active factory 保留候选 TS transpiled prefix/object，附加方法包装语句在两个策略中完全一致。没有新裁切、LOD、alpha 推断、源像素、shader、opacity 或图像合同。

候选仍带原注释 `Frame-end retention only`、`finish uses the normal budget`、`Single-image callers retain their existing eviction behavior`，与新持续政策不符；若以后采用必须同步纠正 API/注释和相应消费方预算表述。当前保存机械候选历史，不改 production 或候选原文件。

## 正常矩阵的独立读回（独立于 root/sphere 作者）

冻结输入：`output/playwright/cloud-sky-active-retention-gpu-ab-1002-r3/result.json`，12,993,432 B，SHA `72039d3c0d63d89339a91a7aa2afbf64c40d52974faff4159a900f84b7334e31`。正常矩阵的实际作者脚本、失败 r1/r2、baseline r2 复用与限定 nonce comparator 均保留。

独立脚本：`scripts/experience-active-retention-normal-independent-2026-10-02.mts`，17,075 B，SHA `4282aa6cba01aa663a85423bfa7aa35fe4ae84a6dd9fc0488f3774e923717c76`。

结果：`output/active-retention-normal-independent-1002-r1/result.json`，22,216 B，SHA `f8d042d5c8ac60af128c45b8c5dbfc4dff01e8d3edae79e61ae882e5082134aa`。绑定：同目录 `binding.json`，235,931 B，SHA `421b5b3ff666076e89c4699d014b29733dd26a768f5f2c6ae0ac0b9a4e0f9b4b`。

这次读回没有运行作者的 Pillow/ledger，也没有新 GPU run。独立实现 PNG chunk CRC、zlib inflate、5 种 row filter 和 RGBA 解码，26 张 390×844 screenshot 的全部像素与相应 bottom-up GL RGBA 完全一致；全部原始 RGBA 与原 r5 对应 full array 及同场景 peer 策略完全一致。不是抽样、hash-only 截图判定或部分区域。

独立维护实际 decoded source identity → allocation 的跨帧账本：每个 source-upload 绑定真实 byte offer SHA/dimensions，copy 时完整源和 crop 同时计入，delete 后才扣除；78 个 pass 的每个事件 `liveBytes`、source/copy bytes、peak、frame-end retained identity/bytes/alive count 重算一致。13 条每策略路径为 W3-off 5、W3-on 5、新月面 3，复用相同正常场景；**没有产生任何 pin-enter，也没有故障或 source retirement 注入**，需要下一部分作者边界证据补齐。

| 这条有限 journey 的逻辑 GPU 量 | 原策略 | active 候选 |
|---|---:|---:|
| source-upload 总 bytes | 244,121,600 | 189,333,504 |
| copy 总 bytes | 26,566,656 | 26,566,656 |
| 78 pass 内各策略最高 peak bytes | 31,981,568 | 31,981,568 |
| 各策略最高 frame-end bytes | 16,777,216 | 31,981,568 |
| W3-off 139° 第三帧 source-upload bytes | 14,155,776 | 0 |
| W3-off 139° 第三帧 retained bytes | 16,777,216 | 30,932,992 |
| W3-on 139° 第三帧 source-upload bytes | 15,204,352 | 0 |
| W3-on 139° 第三帧 retained bytes | 16,777,216 | 31,981,568 |
| Moon 85° 第三帧 source-upload bytes | 2,621,440 | 0 |
| Moon 85° 第三帧 retained bytes | 16,318,464 | 18,939,904 |

代价明确：两个 139° 初帧各多 upload 8,912,896 B；W3-on dome 转场少 upload 8,388,608 B。净冷帧 upload 多 9,437,184 B，暖帧减少 64,225,280 B，总减少 54,788,096 B。W3-on 139° 初帧 peak 17,563,648 → 31,981,568 B，Moon 85° 初帧 peak 16,777,216 → 18,939,904 B；后续 dome/local 转场的初始存量也可较高。全矩阵 max peak 相同不能掩盖这些逐场景变化。以上是 GPU source-upload 的有限 journey 量，**不是服务出流量、DAU/FPS 或物理内存节约**。

138 个当前源码、r5 自己的 2 个源绑定、所有实际输入与复用 baseline artifacts、278 个历史 inventory 中的现有发布影像 bytes、保留的 6 个 settings/outbox 修改均一致。r4/r5 whole normalized AST 相等且当前源138一致，补证关联只发生在 r5 原运行之后，不能声称 r5 获得了事前 receipt。只对 `/controlled/sky-public-images-v1/<namespace SHA>-<source SHA>-<boot nonce>-<attempt>.png|jpg` 的 nonce 做等价；其他字段与全部原 path 保留。getWindow 的实际窗口直接观察；`get` 的内部 lexical getWindow 未被方法 tap 捕获。

active-final 实际独立读回：GPU texture ledger/retained/alive 为0、共享 core leases 为0。baseline r2 的原运行曾执行 dispose0 assertions，然后在 active 的 nonce fixture comparator 失败，但 raw final 未落盘；**baseline final raw readback 保持 GAP**，没有补造它。

实际查看 active W3-on 139° PNG，并与原全数组交叉；图像视觉质量、来源完整性、产品 default/full-sphere 义务未由此验收。

## 新共享边界实际软件 GL（本 agent 作者；独立 review 待 root）

最终脚本：`scripts/experience-active-retention-boundary-gpu-2026-10-02.mts`，23,444 B，SHA `1dbe3743781f1d3b1b3d487cf285b92dc79e518760531a0b2001551ebde502e6`。

最终实际运行：`output/playwright/cloud-sky-active-retention-boundary-1002-r5/result.json`，410,662 B，SHA `b08a200f32713f6dcb45e3c3564fac75faf178ea2bc6bd6a752bb846df2e1a30`。

输入前绑定 `inputs-before.json`：11,781 B，SHA `6185f4b1a017076b148a7d43cc87fee36f1cfc49606636ad3ce965c938b7ae42`；结果中实际源/input before/after 相同。实际观察在执行 post-run oracles 前先保存 `observations-before-oracles.json`：236,299 B，SHA `877717b685e21b8be508f5119f163d22bc7b782a86bc08064c6c2b49cf980c19`。全部 executed source、注入 owner、actual bundle、PNG、RGBA 原样保存。

复用 `cloud-sky-artwork-window-sampling-1001-r2` 的实际 M42 原始 PNG overview/detail 与其原报告派生 TAN registration/basis，没有网络下载或新几何拟合。源 alpha 只表示 nonfinite HiPS samples；没有修复、补画或把暗像素当缺失。图像旧质量缺陷仍在，本探针明确只检验资源/采样边界。

两策略都运行 7 个最小机制 case：coarse-only、不同身份 coarse/fine pair、同一 image 的两 slot、fine upload exception、optional copy exception、ready retirement/replacement、actual context loss；另跑一个 retirement mutant，总15 rows。每机制 owner 隔离。**显式 task 一字节压力目标**用于让双 sampler 的准备阶段必须保留 coarse，不代表生产预算、图像容量或16MiB上限。

- different-identity pair：实际 `artworkLevels` 的 pin scope内准备两张 source，coarse crop 16,384 B、fine crop 65,536 B；实际 common shader submission 与 full output有效。baseline/active 所有保存 frame full RGBA exact。候选保持81,920B active crop，baseline原一字节 frame-end cap删除后下帧重传；实际首帧 full+crop peak1,130,496B，纳入记录。
- same bitmap 两 slot：不同注册仍使用同一 256×256 full source，requested window=null、返回同一 full window，无 copy。baseline因原一字节帧后cap共 upload3次；active共1次。两策略实际每帧 full pixels exact。没有把原重传3误报成 candidate defect。
- fine upload 在实际 texImage2D 边界抛 exception：实际 coarsePrepared=true/finePrepared=false，3帧 all full RGBA exact independent coarse-only；失败 callback与attempt各1，identity latch有效。新 HTML decoded identity（原fine bytes）恢复实际 full pixels exact正常pair，旧失败身份不复活。这是资源身份重建，不是页面 native retry UI。
- optional copy 在实际 copyTexImage2D 抛 exception：一次触发，后续该 owner whole-source fallback，不再copy，source有效且不回调imageFailed。实际返回 overview256/detail512全窗口，两策略 full pixels exact同一失败条件。active sustained full bytes1,310,720明确在原一字节目标上方，没有把fallback当cap证明。
- retirement：先有非空 actual source frame，关闭并执行 weak lifetime retire callback；frame外 direct `owner.getWindow` 不可复用或重传，返回 texture=null/bytes0；下帧 actual level submission不可用，fullRGBA exact该背景 empty frame。新 decoded/coarse identity fullRGBA exact原 ready。没有退化为只检查Null对象。
- actual `WEBGL_lose_context` 在 copy 时触发，然后抛对应异常：先保存实际非空 full source before-loss frame；实际 `gl.isContextLost=true`、`sky_gpu_context_lost`，不误报 imageFailed。after-loss pixel内容不解释。finally实际 pin-exit 仍发生；所有登记身份（coarse、fine、实际replacement）在 owner退出时都调用真实 retire function，registry current=false，direct GPU owner stale gets均null/0；双renderer.dispose后 texture/framebuffer/buffer/program所有owned logical ledger0。这是实际桌面GLcontext loss与受控weak-owner退出，并未模拟完整Taro public file cache/Canvas teardown。
- 正常每case empty frame 后原策略/候选 owned textures/bytes0，再双 dispose；没有依赖GC清理逻辑资源。
- bounded retirement mutation只绕过候选两个 weak current fence，保留原bytes/相机/shader。旧 resident能被重用，retired frame与ready fullRGBA exact，却比正确 empty frame多106,048 pixels、max byte delta162；这个oracle确实能检出有作用的失效身份。不是生产选择或完整真实clear defect重演。

实际查看 pair和fine-failure PNG。48项比较遍历全部 full RGBA，不用只截一个区域或把同一sourceHash当成输出证明。

失败/中间历史保留：r1 tap alias与原lexical getWindow重名，编译前停0case；r2 context-loss before-loss artwork缺显式tint，fixture报invalid_color；r3全部actual rows完成但 same-source 原一字节baseline本就upload3次，post-run oracle错误expected1；r4修正后PASS，r5进一步补全fine/replacement在所有异常退出时的weak-owner退休，作为最终证据。没有改生产以迎合这些fixture错误，也没有runtime启动循环。

## 当前结论与仍未覆盖

独立正常矩阵读回支持：在已记录场景，候选保留相同图像意义、source/window与完整输出，并消除三个特定暖帧重复上传。作者边界实际输出支持同样 source/fallback/退休与退出机制；这部分独立验证还待 root。两者均**不能批准生产采用**。

持续 active working-set 不受16MiB hard cap约束；全矩阵31,981,568B也不是所有视野/源组合/DPR/消费方的global上限。较高驻留和转场峰值必须以真实目标平台总内存/交互表现评估，不能由软件logical texture bytes推断。临时 copy、native bitmap、framebuffer/backbuffer、TWGL program/buffer、driver deferred deletion/allocator、HTML retained诊断数组、GPU/OS/GC成本均与logicalledger有不同边界。

13正常场景不是整个页面端到端；本边界也没有网络、公用文件 core clear、微信 Canvas generation、隐藏/恢复、新Canvas、双renderer同core、原生浏览/捏合、native context restoration、真机或目标 WEAPP 内存/FPS/200DAU性能证据。候选原注释和预算合同还需修订才能形成可review的生产提案。新版月面/全部33项体验质量与最终验收义务继续开放，大字号暂停、手机不可用，均未在本条关闭。
