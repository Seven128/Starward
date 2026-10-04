# 两批已有 SDSS 源的真实三带覆盖

2026-10-02，root 只读既有冻结 M51 r2 的 per-field 三带 footprint/finite-neighbor masks、normalized weights 与实际 master crops。没有下载、重投影、改变科学值/权重/颜色、生成新图片或改出版。

[脚本](../scripts/experience-sdss-m51-run-support-2026-10-02.py) 对每个 field 核全部六个 mask 的真实 bytes/SHA、shape/dtype，并要求 normalized-weight>0 与同 field 三带共同可取逐像素一致。然后按 run 作 union；全部六 field 的联合仍为原母图 4,194,304 个像素全部可取。不是以 r 单带、中心/角点或 CAS footprint 猜三带覆盖。[实际结果](../../../../output/sdss-m51-run-support-1002-r1/result.json) SHA `1fae7c2a8a8aca2b1f8c553c720a8eace1f86497b839af6d7805f672dbafe8a7` 绑定全部读取文件，执行前后身份不变。

| 实际母图区域 | 区域样本 | run3699 三带共同可取 | run3716 三带共同可取 |
| --- | ---: | ---: | ---: |
| OVERVIEW 2048² | 4,194,304 | 2,796,831 | 1,633,534 |
| MEDIUM 中心1024² | 1,048,576 | 874,142 | 292,498 |
| DETAIL 中心512² | 262,144 | 262,144 | 16,964 |

[字段源质量](experience-sdss-m51-field-quality-2026-10-02.md) 表明 run3716 的字段尺度 noise-effective PSF width 较小，但这批源仅覆盖 DETAIL 的很小部分，不能直接替换完整主星系/母图。两个 run 的 overview 和 medium 单独均不完整；run3699 的 detail 可取不等于其空间 PSF、坏像素、配准或视觉质量通过。

前轮 [实际几何](experience-sdss-m51-field-geometry-2026-10-02.md) 已说明第七 CAS 候选 run3716/camcol5/field117 的 r 对整个 target 贡献0，故没有为它取得 g/i。此次发现不重新拉该字段或重复 source/CAS；source 发现列表不能越过实际图像覆盖边界。

继续保完整源、有效黑色/负科学值和一次全母图处理，核查颜色/配准/有限边缘与源分辨率。自动提亮、插值、删掉较宽 PSF 的 field、用 scalar PSF 改权重或生成细节，都不能据本覆盖结果宣称共享高清修复。[独立复核](experience-sdss-m51-run-support-independent-review-2026-10-02.md)已用此前独立 source membership bitmaps、r-only geometry 与实际三带 masks/正权重全像素对照，计数与身份/crops均相符。此处只有支持范围结论；实际空间 PSF/完整图质、native 与全场资源验收继续开放。
