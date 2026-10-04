# M82 来源固定显示范围：三级真实对照与 Atlas 前置

**完成一次共同固定显示对照，未采用；暗核心/完整图质未修。** 没有新的影像源获取、DETAIL 科学重采样、参数搜索、生产源码或外部业务修改。只复用 r71 两级与旧 DETAIL 保存科学网格，以及已缓存 Astropy 8.0.1；原 334 source/6 protected/3427 evidence 在各执行前后精确。

## 现有责任与成熟算法复用

现有 `allwise_finite_tan.finite_rgba` 对每一级的 finite 数组分别求 1/99.7 percentile，asinh scale .1/gray。当前 SDSS recipe 拥有多带校准与 signed contribution，不能拿它供应这组未知单位单带的物理校准。此次实验复用已安装 `astropy.visualization.ManualInterval` 和 `AsinhStretch`，实际库源码、版本和 hash 均绑定；无需新依赖或共享框架。

原 properties 的 `hips_pixel_cut=260 1000` 冻结为唯一 display range，原 .1 asinh 不变。原科学/availability 不变，只对私有 finite 取值做映射；finite alpha255、nonfinite alpha0。三张图消费同一保存 recipe/hash，没有逐级/局部拟合。该范围仅来源显示建议，**HiPS 原 BUNIT 缺失故单位依旧 UNKNOWN，不供应绝对表面亮度、PSF、背景扣除或科学质量**。三个原 field/WCS/source/hash 随 metadata 保留。

## 保存输出、实际查看与消费者读回

`output/allwise-w3-m82-fixed-common-display-1004-r1/` 保存 `recipe.json`、三张 PNG/metadata/QC、执行脚本、result/binding。一次约 10.234 秒本机离线执行，不是 runtime/容量测量。全部 PNG 完整 verify/load，RGBA 与实际映射输出精确；真实 alpha 等于原 availability/旧诊断 alpha。旧三张诊断图、科学数组、源与历史回执保持。

| 级别 | 固定范围 PNG 字节 | 有限 RGB0（旧独立 cuts） | 纯白像素（旧独立 cuts） | 非有限透明 |
|---|---:|---:|---:|---:|
| OVERVIEW | 23,614 | 0（697） | 12（199） | 0 |
| MEDIUM | 84,947 | 2（5,141） | 320（792） | 1 |
| DETAIL | 70,271 | 20（45,525） | 2,862（796） | 19 |

PNG SHA：OV `f54e7c0a14e8b835b34e8bb0fc86e75829a02280daf60d13341d0db74bc03537`；MED `5d1886325a6a477f0b6aa621d9050f581c53bb4a2b21c88fbb2fe3a5c559cb48`；DETAIL `125c752b014f3db7a77ef8aa8c0bb34d6aba3df17f3394929f9180661ea63fce`。旧17个暗核心坐标全部仍为原 finite positive/opaque，13个 RGB0 未修；19个 DETAIL nonfinite 仍独立透明。

三张实际查看：总体背景灰度更接近，DETAIL 中央白色区域明显扩大，黑色核心仍可见，柔软与真实弱结构没有修复。不同 field/order/采样之间的宽域 median 相似不是空间接缝/同坐标配准证明，不把 PNG 解码/QC 合格升级为画质通过。

Root 独立进程只读实际 PNG、保存科学/availability 和 recipe，不重跑 transfer/sampler：三份同 recipe、source/hash/alpha 精确；真实 source ≥1000 为 OV12、MED318、DETAIL2848 点，全映射纯白。DETAIL 上限外尚有 **2628 个不同原科学值**，现在显示压成白色；额外白值来自量化边界，不虚称源探测器饱和。保存值 1001.096–5862.578 的存在不能证明那部分物理质量。见 `output/allwise-w3-m82-fixed-common-readback-1004-r1/result.json`。这是 root 自审，独审 MISSING；共同固定范围未解决 source core 或完整质量，**NOT_ADOPTED**，不继续 sweep 范围/曲线。

## 官方质量边界与真实 Atlas 元数据

直接读取当前 [AllWISE 图像警告](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec4_4.html)：Atlas 的低覆盖、背景台阶、masked saturation 与低值的 unmasked saturation 是不同问题，亮度/finite 不能单独判别；产品背景也不保证跨 tile 连续。它只说明可发生的机制，不能诊断 M82 的这个核心。该原生 Atlas 的 DN 说明不能自动补上 HiPS BUNIT 或未知重采样谱系。

[原生产品/头合同](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec4_1b.html)和 [IBE 产品路径](https://irsa.ipac.caltech.edu/ibe/docs/wise/allwise/p3am_cdd/)供应 intensity/coverage/uncertainty 的核查路线；必须用实际返回 header/文件名和源身份，不照文档通用名猜压缩后缀。旧 M42 pair 只作可复用获取机制，不能诊断 M82、替代其 coverage 或外推 mask。

本次在原同巡天 IBE 路线上仅查询一次 M:82 当前 manifest 中心与 band=3。默认 CA/hostname、禁 redirect、25秒 socket/35秒全子进程、500001B 读界/无 retry。实际 HTTP200，**3106B** IPAC 表，SHA `976afb0d59f9f708148a5ad12e24288dbee7897dc6eaf6db8013cd459001d663`；一行 `1507p696_ac51`，返回输入坐标匹配当前 M82 中心。`numfrms=208` 是 tile 字段，不能供应核心覆盖/质量；`qa_status=Prelim` 原样保留，不当验收资格。见 `output/allwise-w3-m82-atlas-metadata-1004-r1/query-result.json` / 原表/binding/执行脚本。

仅元数据，不已取得新的 Atlas 科学 FITS，不认证其覆盖、暗点成因、配准或许可出版链。下一按 PLAN 核唯一 coadd 实际目录及缓存，只补同中心有界 intensity/coverage/uncertainty native cutout，读真实 header/WCS/单位/完整标量及与原 core 的同坐标资格，随后才决定源处理。不能手工补洞/删低值、猜 source mask/sky 或重开引擎选型。普通 Prepared 空，source/artifact validity、full quality、native/phone、strict Back 与原全部交付义务保持。
