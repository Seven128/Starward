# SDSS primary TAN 与保留 asTrans：限定假设数值诊断

2026-10-02，root 只读审计。用于当前多字段母图的精度风险判断，不采用新变换、不修改 source reader/mosaic/旧图、没有 source 下载或新依赖。

[DR17 官方 astrometry](https://www.sdss4.org/dr17/algorithms/astrometry/)给出列坐标的三次光学畸变、band-specific 颜色 DCR、到扫描大圆的 affine 与 J2000 旋转公式。u/g 和 r/i/z 所用颜色不同，g 还分颜色阈值分支；官方特别指出 objc 行列的整数代表像素边缘。[当前 imaging 说明](https://www.sdss4.org/dr17/imaging/images/)明确 primary WCS 不含完整多项式。不能因保存31列 asTrans 或 TAN 自洽往返，称绝对配准已经通过。

[只读脚本](../scripts/experience-sdss-astrans-approximation-audit-2026-10-02.py)先用当前 reader 准入实际18帧，再在每帧17×13 source 列/行格点比较 primary 的真正 Astropy TAN 与 metadata 公式。SDSS 的公式 row=x/column=y 与 NumPy/FITS列x/行y显式转换；大圆旋转使用 atan2 保象限。

没有观测的逐像素颜色输入；分别保颜色0/1/2和 native origin offset0/.5/1 的全部结果。这些是明确假设，不是测得颜色/最终坐标选择。**不能从本诊断哪个 residual 更小来验证原点或修改生产 CRPIX。** 粗格点亦不能外推全像素最大误差。

声明 half-pixel、color0 的每band最大角距离（跨六fields/实际格点）如下：

| band | 最大角距 ″ | 各field median中的最大值 ″ |
| --- | ---: | ---: |
| g | 0.174241 | 0.047751 |
| r | 0.169721 | 0.037905 |
| i | 0.145277 | 0.031921 |

这是两种 metadata 变换的差异，**不是天体绝对定位误差或已测星点 residual**。当前 master 约0.4″/pixel，所以这个声明假设下的最大差约0.44 master pixel；不能写成完整精确配准，也没有由此认定小试路径失效。另两个原点假设的最大差约0.29″及0.43″，原报告保分band/颜色/field，不合并成新采用参数。带色 DCR 参数和原 MUERR/NUERR 都保存，但前者不是实际颜色、后者不是独立测得最终目标误差。

把 row/column 刻意交换的反例达到1,146.56″最大偏差，显示正确坐标责任有真实数值作用；它仍是错误公式反例，不是来源中实际存在的缺陷。full asTrans 原点、DCR对扩展天体的适用、分布星点和跨run相对/绝对配准仍需后续独立核，不能通过一颗局部亮星或 crop WCS 相等关闭。

`output/sdss-astrans-approximation-audit-1002/audit.json` SHA `75c0f2043c5bce595e5544525e41661c470d0103ef63138dec6b4e4cbb9c2f28`；script SHA `7df245b623fe012187b4f2ce8cd80124a72727834c26926d80e800c7a750ac10`。它绑定18源文件、原取得回执、shared reader和完整31列 row，拒绝覆盖已有代次。此诊断未改同母图科学值、任何 RGB/alpha、出版或客户端来源身份。
