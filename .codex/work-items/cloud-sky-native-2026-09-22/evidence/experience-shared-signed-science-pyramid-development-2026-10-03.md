# 共享校准科学金字塔开发，未采用

2026-10-03，固定工作区/分支/HEAD保持。Goal active、无预算、未完成。沿唯一PLAN的B依赖推进；无新下载、FITS解码/重投影、sky扣除、全图曝光拟合或旧候选改写。

`sdss_gri_tan.py`新增显式`science_mean_pyramid`和`save_candidate(..., pyramid_kind=SCIENCE_PYRAMID_KIND)`，默认仍encoded RGB box。共享资格要求float32科学样本、三带同字段集合的完整校准/已扣sky receipts、相同共同几何/finite资格，以及当前Astropy实际解析recipe。未知区的NaN/Inf/亮值不进入均值；有效区非finite失败。可用样本signed float64平均后转float32映射，不零填未知区参与除数。共同有效面积单独量化alpha，有效黑/negative不当缺测；空细档透明，整个共同源为空则失败。

固定和whole-master-zscale都只复用母图已解析stretch/Q；新档不拟合、不改科学值、不声称sky/PSF修复。quantity是原nanomaggies/native-pixel的目标样本均值，不是粗像素总通量或统一表面亮度。颜色仍i/r/g历史通带映射。候选独立版本`sdss-signed-science-pyramid-candidate-v1`与method`signed-coherent-science-mean-before-fixed-lupton-v1`绑定科学/joint/recipe；旧RGB母图只作reference，不作新LOD父图。QC来源/报告版本已相应区分。新候选不保存未使用的全图display-contribution NPY；每档encoded显示分解与面积alpha仍非科学置信度。

旧`publish_sdss_science.verify_cached_candidate`显式拒绝新method/pyramidRecipe/version，包括像素未变但报告重新绑定的情形，不能偷换science-optical-v2的RGB母图合同。新版immutable publication、客户端/服务端/静态/cache消费者尚未实施；普通Prepared registry仍空。

实际读回脚本：[verify-shared-science-pyramid-2026-10-03.py](../scripts/verify-shared-science-pyramid-2026-10-03.py)。结果`output/science-pyramid-development-1003-r1/readback-r2/result.json`，14,579B，SHA256 `c729c020c97844d51e8f65e4dfd256fee784bdfeb80fc7b702ac871fc30e0ee9`。旧固定5/Q8候选pin `73e65a69…`/binding `bc2af0aa…`原18份receipt/41文件绑定和3PNG重现通过。复用真实2048²科学母图、同.5/Q10参考RGB；新owner3PNG与已有task pilot字节完全相同：OV527637B `9a1402e9…`，MED542002B `eb1497e4…`，DETAIL488086B `7c63d656…`。不再跑无变化视觉矩阵，实际对照与未通过颜色/PSF范围保持[上轮证据](experience-signed-science-lod-and-background-2026-10-03.md)。首次脚本因Windows斜杠表示的完整dict比较失败，已保留`readback/observed-failure.json`；R2以原路径解析并核bytes/SHA，不是像素错误修复。

受影响`test_sdss_science_pyramid`、`test_sdss_gri_tan`、`test_publish_sdss_science`共39检查通过（bundled Python3.12/缓存Astropy8.0.1）。实际single/mosaic builders共同消费者验证，包括正常显式save的六份QC和来源语义；测试只用小受控数组，不称真实全部候选发布。balanced ±.03噪声控制signed均值0仍opaque可用，弱常量.02保持非零，partial两样本/16面积alpha32、空fine透明、全negative可用黑；wholemaster fit在新LOD被阻断而已解析参数保持。

有界mutation只在Python namespace把新函数替换为旧`pyramid`：同一控制正常通过，替换后唯一断言`(actual[:,:,:3]==0).all()`失败、errors0；日志在`readback-r2/normal-regression.log`和`rgb-first-mutation.log`。未改生产文件；这是有效escaped-order regression，合成控制不是生成天体或真实噪声模型。

开发自读回不是独审。新增量独审MISSING，完整背景/颜色/PSF/弱结构、HST空天及权益、M82覆盖、完整Scene/native/手机、资源/容量与最终验收均未升级。下一直接依赖：新版出版重现与兼容消费者边界，以及实际LOD质量/必要独审；不能把当前候选顺序或测试数当质量通过。原已知M51照片矩形FAILED保持。
