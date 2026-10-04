# C：M51 官方星表对原始 JPEG 的像素配准窄核

本轮只做只读数据核对，没有改生产影像、渲染坐标或手机候选。此前官方 `opt=G` 网格能将请求中心定位到约第 256 列/行，但不能说明亚像素定义。本轮从 [SDSS DR17 SkyServer SQL](https://skyserver.sdss.org/dr17/en/tools/search/sql.aspx) 对正式 M51 中心周围 6 角分取 `PhotoPrimary` 与 `dbo.fGetNearbyObjEq` 匹配的恒星（`type=6, 12<=r<=22`），得到 18 行，查询：

```sql
SELECT TOP 100 p.objID, p.ra, p.dec, p.r
FROM PhotoPrimary AS p
JOIN dbo.fGetNearbyObjEq(202.469625,47.1951666667,6) AS n ON p.objID=n.objID
WHERE p.type=6 AND p.r BETWEEN 12 AND 22
ORDER BY p.r
```

原始 CSV 留在 ignored `artifacts/miniapp/cloud-sky-native/sdss-center-trial/m51-photo-primary.csv`，SHA-256 `b969c967184c1d41bfd1dce2db88f9254ded939c53daaf8c3828e9e04b5455d0`。用正式出版的、未经像素编辑的 512²/1.6″ `M-51-overview.jpg`（清单 SHA-256 `c98129d2ea984cf4106b14b325f355df149f36fe30c2c8ecbcdd0d3733ff81c6`），对赤经赤纬做精确 TAN 投影，在预期位置 ±4 像素搜局部峰、以环状中位背景扣除后对 3.5 像素半径求亮度重心。可重跑的本机分析脚本留在同一 ignored 目录。取七个峰值至少约 57、位置仍在图内的较亮恒星，绿色通道反推 JPEG 中请求中心的零基像素坐标：中位 `(255.664, 256.578)`，单星范围 x=`255.562..255.912`、y=`256.441..256.646`。更暗的邻近源和星系背景会明显污染匹配，未纳入中位。另把四颗星分别作为官方请求中心取得 0.4″/px 图，其中一颗还取 0.8/1.6″ 样本；目视中心星及局部重心也落在约 x=255.6–256.0、y=256.2–256.5。

这个一致的约 1 像素竖直差提示当前 `registerSkySurvey(..., 256.5)` 对 **SDSS JPEG** 的行原点可能并非最优；它不证明服务采用哪个精确 FITS `CRPIX`。SkyServer RGB JPEG 是按 g/r/i 帧仿射变换、重采样与压缩得到的成品，[官方处理说明](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/)仅保证请求坐标居中，不提供此 cutout 的精确 WCS 头。星点颜色/饱和、JPEG 压缩、旧成像星表与合成图的亚像素差及 `opt=G` 网格画线位置都影响这种反求。一个共同 `CRPIX` 标量也不能表示观测到的 x/y 差别。未经精确源 WCS 或目标微信实图配准前，不引入猜测性的轴向偏移，更不从该局部样本外推全图精度。当前正向 M51 图层仍受原有中心精度及 P1/C 目标画面核验约束。

补充核对 [SDSS Marvin 的 cutout 客户端实现](https://sdss-marvin.readthedocs.io/en/2.8.2/_modules/marvin/utils/general/bundle.html)：其 `_define_wcs` 明确称自己生成的是近似 WCS，512 像素图令 FITS `CRPIX=size_pix/2`。这是另一客户端对下载 JPEG 的便利估计，不是 SkyServer `ImgCutout` 服务端像素原点证明；它与本图七颗星反求的 x/y 不同向偏差也不能统一解释。维持精确配准未验证，不据此改正式渲染坐标。

另向同一官方 `getjpeg` 对相同中心、512²、1.6″/px 只取一张 `opt=P` 光度对象叠加图（本机 39,396 B，SHA-256 `6e3d00a652765267a11452c59db110d881f02c0115f8e3572207d9912e4c20c0`，ignored `m51-photo-overlay.jpg`）。与无叠加正式原图相比，蓝色光度对象圈主要密集分布在两侧，局部互相覆盖，JPEG 色阈值圆环重心对同一组星反推的原点离散达数像素；本机 `analyze-overlay.cjs` 可重跑。这种公开图层能证明服务在图上标出了对象，却不足以解出精确服务端像素原点；不以圆圈阈值替代 WCS，也不改生产图层。

本轮不依赖手机或远端账户权限。账单仍缺当前云账号可读凭证/请求轨迹，不能由静态样本计算真实月费；P1 同代高倍环、C 的微信光学合成/可见署名、P2 地景、P4 成本与资源、P5 独立审查、iOS 都保持开放。
