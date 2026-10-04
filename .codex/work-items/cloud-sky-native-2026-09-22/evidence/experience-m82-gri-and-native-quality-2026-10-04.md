# M82 完整 gri 支持与实际 native 质量输入

**完整 gri 科学供应已取得，尚未作完整质量通过或普通出版。** 本代生产源码只改云观星离线 `sdss_frame_quality.py` 和对应测试；其他业务逻辑、六保护、原 BFF/watch、旧图、科学母图、recipe、registry 保持。Goal active、无预算、未完成。

## 完整范围与原源

复用八缓存 r 帧、既有有界 SAS 获取/原帧准入与原 M82 OV 母网格，只补六个实际参与字段的十二 g/i 源，各一次 GET/200，无重试/redirect，默认 TLS；新增压缩原帧 41,207,013B。每带原值、单位 nMgy/pixel、CALIB/SKY/asTrans/身份/WCS 保原。2048²完整四邻测量中，g/r/i 各 union 4,194,304，按同 field 三带相交后 union 也为 4,194,304。共同支持不是直接混合三带独立 union，也不认证科学质量/绝对配准。

|run/camcol/field（rerun301）|共同 gri 有限四邻目标像素|
|---|---:|
|4264/5/260|274,560|
|4264/5/261|2,005,852|
|4264/5/262|981,894|
|4294/6/236|772,981|
|4294/6/237|878,653|
|4294/6/238|22,398|

中央64²仍仅4264/5/261供应4,096像素，其他实际字段为0；多RUN总数不能当核心独立替代。两个 r 全域0字段的 g/i 未获取，若实际新需求暴露缺口才追加，六字段不是上限。

根复用已有直接原FITS/origin1/四地址读回算法，十二新带共50,331,648目标位置的 geometry/finite 逐位精确；原 r 保存mask及result字节精确，无旧 r 矩阵重跑。实际逐带 union、同字段三带 AND、共同 union/count读回成立。适配器 OR 两新带只用于结构校验；实际联合效果另存 `shared-support-effects.json`，不冒科学 coadd。来源为 `output/sdss-m82-gi-support-1004-r1/`、`...gi-support-reader-adapter-1004-r1/`、`...gi-support-readback-1004-r1/`。

## 原生质量材料与真实拒绝修复

沿既有 bounded quality IO 获取六 psField、十八 fpM，各一次；一次现有 CAS Field 查询得六匹配行/十八 g/r/i camera-noise 参数。质量原源与 CAS 共4,378,259B，保原带/field identity、处理 PS_ID 与未知事实。原 acquisition 只准入21项；三 fpM 被旧 coordinate guard 拒绝，原失败回执仍保留，不能倒填为已通过。

直接原FITS发现三份合法 NOTCHECKED 对象超出1489×2048 CCD：4264/r5/260 超出17个源span像素、4264/i5/260超出26、4264/g5/262超出41；完整bbox、npix、canonical span次序一致。已有缓存官方 [read_mask](https://classic.sdss.org/dr2/products/images/read_mask.php) 的 `phMaskSetFromObjmask` 会忽略画幅外行并将横向span与画幅相交。本次只参考缓存实现，不下载/编译/拷贝C代码或引入其依赖。

共享reader先验证完整对象 metadata，再 rasterize 实际native交集；保持 identity/hash/gzip/FITS/heap bounds、enum、canonical disjoint/order、完整npix/bbox、非零offset拒绝，不wrap/镜像/补科学零值。回执显式记录 frame-intersection 版本及画幅外源span统计。真实三份新准入和原十五份已准入的plane count/read-only flags保持；全部十八原源的独立vector栅格54,890,496像素逐位相同，六 psField也完成实际读回。

有意义的回归先在旧owner失败（coordinate_invalid），修复后受影响 `test_sdss_frame_quality.py` 十二检查通过。完整metadata腐败、错误顺序、npix/bbox、heap/identity/processing 等原拒绝继续有效；新回归含画幅外行及左右跨界，确认原18源span像素只与native相交6，画幅外12仍被如实记录。不修改科学值或显示mask。

原根读回在全部native比较及六PSF完成后，line79错误要求 r76 的 source diff 恰有owner/test；两文件当时未被r76 source selector覆盖，实际diff为空，所以收口失败。保存 `executed-reader.py`/`root-closeout-r1-failed.json`，新增 r2只读已保存flags/receipt/原源与旧3532证据，不重跑矩阵；逐plane实际数量、三恢复、旧347 source/六保护/所有gri输入精确。r77需补这两owner的源绑定，不谎称r76已证明它们保持。第二次中央诊断曾依赖不存在的 r1 result而失败，无科学/输出变更；修正指向r2后成功，非生产缺陷。

## 中央亮核的实际含义

中央64²原 nMgy/pixel 四邻flux全部有限：r min/max/median 3.3178/50.8181/9.8656，g 0.8639/15.4946/2.7729，i 4.8884/82.7628/15.5893。实际三带四邻 OR 中 SATUR/NOTCHECKED均0；g有79个 INTERP、r/i为0；OBJECT/BRIGHTOBJECT均4096。已保存每点原采样/native坐标/flags，并由四直接源地址 OR 核consumer效果。该64²不能外推完整bright core/全图，flags零不认证真实无伪影、背景、测光、PSF或配准，不能套真实SAT色比恢复抹去原JPEG平坦亮块。

材料在 `output/sdss-m82-quality-inputs-1004-r1/`、`output/sdss-m82-fpm-frame-intersection-1004-r1/`（`result-r2.json`、`central-source-flags.json`/NPZ、缓存参考及旧owner）。原质量输入acquisition三失败保持历史状态；当前修复后的准入另代绑定。

## 下一依赖与未完成

沿现有 shared source/coadd/noise/display/common LOD，先核实际frame/psField/fpM/CAS的处理批次、native noise、asTrans/配准与完整flags，再完成这批新材料的首次M82完整科学母图/共同显示候选及实际三级质量比较。复用成熟single/mosaic/partial和冻结来源，不另建框架、不重复旧M51过滤/PSF/矩阵/旧查询、不扫参数/猜sky/手修核心。中央g INTERP且无独立RUN备选保原，不从亮块推SAT。完整背景/接缝/弱结构/覆盖/配准/来源信用/出版API→registry→静态缓存→已绘来源Back通过才采用。

本代root自审不是独立审查。普通Prepared仍EMPTY/NOT_ADOPTED；W3历史12µm暗区、SDSS完整图质、strict Back、WXML Canvas、Android/iOS/newMoon、static真实引用与物理retention、全200DAU端云成本/混合容量/必要独审等原33义务保持开放。输入/结构/局部flags不代替目标体验或最终验收；期望生产4核16GB/12Mbps/2000GB月/180GB仍未部署、未容量通过。
