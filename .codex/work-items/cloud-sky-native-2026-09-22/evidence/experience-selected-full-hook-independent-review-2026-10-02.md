# 正常 selected W3 / SDSS 消费路径：独立实物读回

2026-10-02，sphere 独立审查。没有重新运行浏览器/GPU、请求数据、改生产或已有输出，也未运行 19 项测试/TSC。仅新增 task 脚本、独立输出和本记录；唯一 PLAN / Context 由 root 维护。

作者冻结输入为 `output/playwright/cloud-sky-selected-full-hook-1002-r3/result.json`，663,423 B，SHA `10922aff9d1d6543f036709acc1705f9ce942472f301c9c282fe3ea4d78898cf`。已全文读作者 note（SHA `4fb5e4c922483e80eeb44dcd92dd21f650e924f5cf074cb2f44179e4acfae07a`）。独审没有调用作者的 PNG 或 ledger helper，也没有以作者 summary 代替原始输出。

## 可复核入口

- [独立脚本](../scripts/experience-selected-full-hook-independent-2026-10-02.mts)：仅 Node/TypeScript AST、SHA、zlib 和自行实现 PNG CRC/过滤反演，复核冻结输出。
- [独立 result](../../../../output/selected-full-hook-independent-1002-r5/result.json)，16,000 B，SHA `2e2f4b421448d64016e09a493fb470fb7a8837831cb0de0dc522fc0a3eceb3d8`。
- [完整 binding](../../../../output/selected-full-hook-independent-1002-r5/binding.json)，278,053 B，SHA `6615958bd090cd92b29329464ebc51b373006874807d783ac42b808515aaf7df`。所有读入字节前后相同。

结论：这条小型真实数据到桌面软件 GPU 的开发路径 PASS，没有发现需生产修复的具体阻断。它不完成云观星 Goal、目标运行时或画质验收。

## 实际复核

当前 page 的 selected declarations、三个 effect、卸载 cleanup、releaseContext、13 个 Hook 初始化器及 SDSS frame / credit 初始化器，与作者冻结文本逐个 AST/source-text 对照一致。三个诊断 owner 反向删除唯一只读 tap 后，完整原源码字节一致。140 个真实 source bindings 中 138 是实际 metafile inputs，另外绑定 page / URL owner；五个虚拟 input 是明确的四个 target adapter 加 extracted entry。非虚拟输入均解析到当前 ROOT，实际 source snapshots、完整 bundle SHA、before/after receipt、116 个原编码图片 offer 均核对。已有 278 张图和上次独审保存的 281 个出版目录文件（含元数据）及六项保留修改 SHA 相同；未编辑它们。

W3 discovery 用 raw current publication 重算 publication hash，逐 reference / center / orientation / level / immutable URL / bytes / SHA 核对。SDSS manifest 与实际 raw M51 publication 对照，三档 exact file / field / scale / SHA 吻合。M31/M51 六个 W3 descriptor 都是 JPEG、`validFraction=null`、`coverageState=NOT_MEASURED`，没有科学 missing mask 或 display-support mask；v3 名称不增加其科学覆盖证据。

最初 `.04°` 被独审指出低于实际 page `.05°` 缩放下限，作者新 r3 修为可达 `.05°`，仍选 DETAIL。旧作者 r1/r2 的 failed receipt 保留，不能升级正常页面资格或缺失 final 输出。

六张正常 PNG 与五张 consumer-null PNG 全部独立逐 chunk CRC、inflate、五种 row filter 反演后，对照完整 390×844 bottom-up 实际 RGBA，11 张全数组 exact；另五个 restored RGBA 与各正常主图全数组 exact。原 `*.actual-observations.json` / `*.actual-oracle-observations.json` 中 base64 与对应实际文件一致。

| 正常条件 | 同帧实际 source credit | GPU frame-end 模型 | 暖帧上传 |
|---|---|---:|---:|
| M51 .2° | SDSS OVERVIEW；W3 ready 无 credit | 9,437,184 B | 0 |
| M51 .05° | SDSS DETAIL / 实际 MEDIUM coarser | 9,846,784 B | 0 |
| M31 8° | W3 OVERVIEW | 262,144 B | 0 |
| M31 1° | W3 DETAIL | 393,216 B | 0 |
| M31 hide | 无当前位图或 credit；有效文件 lease 1 | 0 | 不绘帧 |
| M31 新 Canvas 1° | 新 W3 DETAIL HTMLImage | 393,216 B | 0 |

源 SHA / path / decoded objectId 在 upload、copy、retained、draw 及 scene callback 中对应同一 HTMLImage。M51 SDSS 实际主图 credit identity 正确，selected W3 虽 ready / decoded 却没有上传或获 credit；细档 Hook wanted 是 DETAIL + MEDIUM，未伪造 OVERVIEW 父链。M31 无 SDSS 资格，实际 callback / page credit 为其 W3。draw 的最后纹理绑定可遗留在不采样该纹理的其它 primitive 上，因此独审没有拿全部 draw-bound IDs 当照片信用。

独立按 identity 跨帧重建 10 个 normal、10 个 oracle allocation/delete ledger，包含 full+copy 同时存活的峰值。normal 上传合计 **22,282,240 B**、copy **1,196,032 B**、最大 peak / frame-end **9,846,784 B**；consumer-null / restore 上传 **5,505,024 B**、copy **1,196,032 B**，另列且不混 normal。控制删除和恢复改变后续真实驻留状态；本组不代表无 oracle 干预的连续用户时序成本。

consumer-null 的整幅变化分别为 M51 两条件各 329,160 像素（最大通道差 196）、M31 OVERVIEW 72,858（148）、DETAIL / 新 Canvas 各 288,284（148）；恢复差异 0。该控制同时改变 scene 的 catalogue core cue suppression，只证明这条 consumer 路径有真实像素作用，不能作纯照片逐像素因果或科学 / 高清认证。

实际 hide raw：current bitmap 0、decoded reference model 0、GL logical bytes / count 0、credit 0，但保恢复文件 lease 1。新 Canvas 的 selected **9→10** 是新 HTMLImage，原 SHA / leased path 相同，全部正常 RGBA exact 回原 DETAIL；encoded image transfer 0，另有两条地景 alpha metadata **74,167 B**，并非全部请求为 0。actual final raw 在后置 oracle 前持久化且独立读回：GL bytes / count 0、lease 0、running / reserved / pending 0、current bitmap 0；8 个 encoded cache 文件 / 4,304,077 B 保留，不称文件缓存清空。

## 范围和未验

已实际查看 M51 DETAIL、M31 OVERVIEW / DETAIL 完整 PNG。M51 当前仍为原 SDSS 512px 有限 DETAIL（`.0568889°`），主核 / 螺臂放大软化、偏棕明显；不继承尚未采用的 SDSS 科学 mosaic 或 HST 图质结果。M31 为 W3 12µm 灰度红外，细档也软；不是自然色光学验收。frozen report 中 M51 中心 **-6.559261763°**，属于合法 360 显示方向，不是当前地面可观测；M31 为 **51.943472334°**。

实际 credit 初始化器的 `presentedSceneCurrent/nativeCanvasMounted=pageVisible`、`canvasError=null` 是受控条件。React / query / MapFS、摘取的 lifecycle callback 及 HTMLImage / 软件 WebGL 无法认证完整 Taro 页面、WEAPP callback / FS / decode、真机隐藏恢复、native / driver / GC 总内存、FPS、200 DAU 或全程完整体验。每条件报告被重新序列化为新 browser object，使 M51 selected DETAIL 0→4 再解码但不再请求图片；不能当稳定 Tanstack 对象下的纯 zoom 开销。强持的诊断图像及 weak-current 0 不意味着物理 GC 或内存归零。

独审 r1/r2/r3 是读回脚本自己的 receipt-shape、tap 反向名字、持久化 offer 无 base64 三处适配错误，均保 `failed.json` 和执行快照；没有生产故障或重新渲染。r4 已通过，r5 仅追加已有出版库存和作者 note 的完整绑定；原输出不覆盖。
