# M51 已用字段的观测质量与源清晰度

2026-10-02，root 沿唯一 PLAN 核六个**已经用于 r2 母图**的字段元数据，没有重取科学帧、月面或扩大对象/来源选择。此项用来区分显示拉伸与源清晰度，不是新的影像质量验收。

## 实际获取与绑定

[获取脚本](../scripts/experience-sdss-m51-field-quality-2026-10-02.ps1)由旧 CAS 字符串 fieldID 与 r2 candidate 精确选六个字段，正常 TLS、每个不同 SQL 一次、40s deadline、无自动重试。1MiB 是接收后的准入检查，不声称流式传输限制。

首次 SQL 的不带 band `imageStatus` 不存在，HTTP500/203B，错误 SHA `fe8a42b03219165795f0457456f4857b0c6c8315032162155d0b9e9659569e93`；[原失败目录](../../../../output/sdss-m51-field-quality-1002-r1/receipt.json)与 executed-script 保留。缩为已确认列后，[r2 CSV](../../../../output/sdss-m51-field-quality-1002-r2/response.csv) HTTP200/509B、SHA `7e16f2c30f4a613afd1125145409e9271392f2fcaa2ea8d02157867e6bbd46ff`。两个中心 score=0 需要解释，因此进一步一次全六行字段元数据查询，[r3 CSV](../../../../output/sdss-m51-field-quality-1002-r3/response.csv) HTTP200/30,015B、SHA `9b0511b5f9e4f10600a8cb3bb867c866aee90d379eb2bf3406a1555f57f86987`。实际列名为 `imageStatus_g/r/i`。

各代 executed-script 都保快照；r2/r3 plan 中 SHA 与实际快照相同。r3 plan 沿用了早期 minimal 的 missingFlags 描述，实际全量 CSV 已包含 PSP/PHOTO/各 band flags；[分析脚本](../scripts/experience-sdss-m51-field-quality-analysis-2026-10-02.py)从真实 CSV 重新解析，核全部行等于已保存报告、全部 r2 列等于 r3、六字段身份等于冻结母图。[analysis.json](../../../../output/sdss-m51-field-quality-analysis-1002-r1/analysis.json) SHA `48b263466974a3853bd7a801c17bc9bba61233faf35a8b39baaa09f2008dab31`。未覆盖历史 plan/代次，当前获取脚本已修正 conditional flagScope 与有限日志；不再次查询。

## 清晰度与状态的含义

官方 [PSF 定义](https://www.sdss4.org/dr17/imaging/other_info/)将 psfWidth 定义为与所拟合双高斯具有相同噪声有效面积的单高斯等效 FWHM。它是字段尺度元数据，不能当成整幅每处的 PSF 核。实际值范围：

| run | g arcsec | r arcsec | i arcsec |
| --- | --- | --- | --- |
| 3699 | 1.585267–1.664929 | 1.519154–1.574994 | 1.472980–1.571834 |
| 3716 | 1.138636–1.176948 | 1.107411–1.170187 | 1.025780–1.080548 |

冻结母图与 DETAIL 在中心的 TAN 尺度同为约 `0.400000525786″/pixel`。这些源宽度约对应 2.56–4.16 个母图像素；这是元数据宽度与中心尺度的比较，**不是拼接后 PSF 的实测值**。两 run 的源清晰度确有差别。共同全局拉伸可以显露已有结构，放大/提亮不会恢复源 PSF、重采样或采样率所丢失的天体频率，不据此进行去卷积或伪造细节。

全部六字段 g/r/i 的 IMAGE_STATUS=1（CLEAR）、PSP_STATUS=0；CALIB_STATUS=24577 的置位为 PHOTOMETRIC、PS1_PCOMP_MODEL、PS1_LOW_RMS，按[官方 bit 定义](https://www.sdss4.org/dr17/algorithms/bitmasks/)记录。两个中心 3699/100、3716/117 的 PHOTO_STATUS=3（TOO_LONG）、quality=1、score=0，其余相邻字段 PHOTO_STATUS=0、quality=3、score≈0.838–0.931。

官方[质量状态说明](https://www.sdss4.org/dr17/algorithms/image_quality/)区分目录 reduction 与 corrected-frame 数据本身，PHOTO_STATUS 的失败不必意味着原帧 intrinsically bad；[resolve](https://www.sdss4.org/dr17/algorithms/resolve/)的 score 明确受 PHOTO_STATUS=0 的存在条件影响。因此保留实际中心 corrected frames，不用 score=0 删除星系，也不把 CLEAR/PSP_OK 升格为全图有效。完整 fpM、空间 PSF、饱和/坏像素、准确跨 run 配准与科学质量仍未知。

CAS calibration flags 属于关联字段/目录元数据。[图像文档](https://www.sdss4.org/dr17/imaging/images/)区分后期目录重标定和 corrected-frame 已有标定；没有再次应用 NMGY、PS1 calibration 或扣 sky。这里读出 PS1 比较相关标志不代表采用 PS1 影像或恢复其未闭合自托管/商业分发路线。

## 当前执行决定

继续用已冻结科学数组验证共享一次全母图 transfer；不按字段标量 FWHM 重设几何权重、PSF 匹配或锐化。源数据可取、字段质量 flags、科学 artifact mask、显示 alpha/颜色与原生画质分别保留。当前结果不替代明亮天空/窗口边缘、一次粗细贡献与失败回退、新版本/旧 offer/已绘来源、持久缓存、完整原生/手机旅程、总资源、200DAU 容量与最终验收。
