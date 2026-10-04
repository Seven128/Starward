# 共同显示候选的实际加工来源与出口推导开发

状态：显式离线 development source-chain；quality **UNVERIFIED**、独审 **MISSING**、未普通采用或出版。Goal active、无预算、未完成。没有重新过滤母图、取得源、改科学/权重/recipe/旧writer/default、安装、工具重启、手机或云操作。

## 开发结果

[sdss_noise_display_provenance.py](../../../../data-pipelines/deep-sky/sdss_noise_display_provenance.py) 是当前共同显示 owner 的下游来源消费者。它复用 frame/CAS/fpM/source/coadd 资格、原 publisher 的有界路径/文件 pin 与噪声候选的真实 pyramid，不建立另一套噪声/来源准入或 Python runtime-publication hash。

`build_noise_display_provenance` 生成 `sdss-noise-display-processing-provenance-v1`：记录母图对象/中心/朝向、实际 target WCS、原科学和 joint 的 C-order identity、原 frozen recipe；逐 field/band 保存原完整 frame receipt、native science、实际 CALIB/ALLSKY/XINTERP/YINTERP 数组 identity、CAS fieldID/gain/darkVariance 与响应 URL/hash/bytes、实际 fpM receipt/flags/plane enum/PS_ID、projected science/footprint/finite 与 normalized geometric weight。还记录实际实现 hash、NumPy/Astropy/Pillow版本、固定公式与参数，以及遗漏 sky/systematic/processing/全 native off-diagonal 和滤后 uncertainty。

缺 metadata/camera/flags 用 null 保原，不补假支持；这些状态不消除有效科学或制造新 coverage。同 native covariance、未知跨 field Cauchy 条件上界、真实 halo 和边缘/取消策略明确保存。nMgy/native-pixel display estimates 不冒新测量/photometry/统一表面亮度；primary TAN 不冒完整 asTrans/DCR/PSF matching。源 URL 相等与 byte pin 不冒网络取源证明、rights 准入或完整质量认证。完整收据含内部路径，仅作离线证据，不发给手机，也不是正式 source-route payload。

`verify_noise_display_provenance` 要求调用方提供外部 expected SHA，不凭旁边新 JSON 的自洽 hash 信任旧输入；同时与当前原对象/数组/参数/code snapshot 核对。`bind_saved_noise_display` 将 pin 的候选、真实估计/processable 和三级 PNG 接到同一 packet：实际数组 shape/dtype/bytes/hash、保原值/外边界、原 coverage/source科学、当前母图身份和 recipe 均核对；真实三档 PNG 从已保存估计沿原 frozen 参数和面积 alpha 推导并要求字节与全部 derivation metadata 一致。filter/fit 次数为0。产物 `sdss-noise-display-source-chain-v1` 仍不是能普通采用的 runtime publication schema。

## 身份逃逸与回归

新消费者检查发现，同样中心/WCS/像素的低层候选 serializer 可以被提供另一 `objectRef`；几何和 PNG 校验无法证明目标名称。因此来源责任新增母图 `objectRef/center/orientation` 必需与候选相等；缺母图 identity 不猜值。

[test_sdss_noise_display_provenance.py](../../../../data-pipelines/deep-sky/test_sdss_noise_display_provenance.py) 以真实 source/master 构造与保存路径演示：M51 数据改标 M82 的 candidate 可以从低层 serialize 成功，去掉新 identity guard 的内存 mutation 也会产出错对象 source-chain；当前 consumer 明确拒绝。没有修改生产文件、旧像素或重新加工来制造失败。保留此边界；低层 serializer 不是独立 catalog/object 准入。

其余实际消费者检查涵盖真实 single/mosaic snapshot/JSON roundtrip、CAS大ID字符串、camera/CALIB/flags变化拒绝、external pin必需、metadata null与真实保原、partial/有效黑和透明area、encoded checksum自洽仍不能改fallback或错用粗PNG当细PNG。所有相关 owner/pyramid/publisher合计 **56 checks passed**；追加上述有界mutation后受影响 provenance/display **13 checks passed**。开发检查不升级整图质量、独审或目标runtime。

## 现有真实六字段与输出读回

[实际执行脚本](../scripts/experience-noise-display-provenance-2026-10-03.py) 复用上一轮[完整共同显示](experience-shared-noise-display-development-2026-10-03.md)的 immutable candidate/result、原 input-before/after 和执行源码快照，核当前全部记录输入及六项保护文件 exact，再通过既有 readers 读取同18 frame/18 fpM/CAS，不重复投影/过滤/PSF/flag/重叠矩阵。构造实际 source snapshot 与 source-chain，沿原估计重新推导三个输出，但不新 fit/filter。旧 science/default与既有server/watch未变。

最初 `output/noise-display-provenance-1003-r1/` exit0，但其 identity 资格尚缺。保留当时 snapshot/code/results，不用 r1升级后来修复；r2只是新来源/身份消费者验证，没有整图重加工。

当前 [r2 result.json](../../../../output/noise-display-provenance-1003-r2/result.json) 绑定：

| 实际产物/输入 | 身份与含义 |
| --- | --- |
| [processing-provenance.json](../../../../output/noise-display-provenance-1003-r2/processing-provenance.json) | 2,288,410B，普通文件SHA `685021971466e559024d6bd70c5a810603851ab626a54fd5429b99a60473c597`；canonical SHA `ee573238855c824326a5a16825e2ad335ee224620aa8209ee50c432cc8a05640`，两者分别标明，不能互换 |
| [source-chain.json](../../../../output/noise-display-provenance-1003-r2/source-chain.json) | 14,648B，SHA `2265af659763415f46dd54db7ca990728a236c9c1465b8e0c549d98ae4f62dd5` |
| 原完整 display candidate | 14,618B，SHA `0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5`，没有换像素或覆盖旧收据 |
| 字段/波段支持 | 6字段/18波段，实际camera/CALIB-SKY/fpM各18份；保大fieldID为string，不通过SQL浮点数转换 |
| 执行 | 14.990秒本机 wall（包括旧输入hash/reader/snapshot/推导与保存）；source requests=0、filter runs=0、full quality matrices=0 |

旧真实执行输入/后值和当前仍一致，执行script/owner快照与原输入代码 pin 对应。snapshot是从旧实际运行记录的未变对象重建，packet明确披露这一事实；不是倒填为原程序当时已写出 provenance，更不是认证旧质量。r2 source owner源码另保存；后续只是回归测试增加 mutation，r2保存的测试输入保持当时版本。

snapshot约2.18MiB与packet约14KiB均为离线开发 provenance，非手机图像包/生产库存。来源头/收据重复和共享CAS记录等成本保持可见，后续批量版本可复用同identity的immutable源receipt；目前没有无证据建新storage框架、扩大并发或删除旧版。上一轮55,974,816B candidate逻辑字节仍只是候选目录；原源、科学sidecars、历史/回滚/暂存和物理块需分别核算。

## 下一依赖与保留缺口

已补 actual processing/source association 开发 packet；它不能替代完整权利/信用/加工说明的正式出版合同、普通registry/API/static/client/source-route 的新版消费者。完整质量仍是前置：依据当前保存图处理棕色底、标记源/边界、弱结构/coverage/配准，必要的新机制才触发受影响加工；不再循环sigma或重做无变化全图矩阵。必要独审缺失，不采用新图/版号。实际page/router Back/公共时间UI/native、DevTools FAILED、手机新版月面/Android/iOS、生产引用/磁盘/全产品成本与混合容量均保持未完成。
