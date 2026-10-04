# C 模块：实际 Legacy TAN 原点与既有 W3 消费者

2026-09-25 的有界来源是 Legacy Surveys 官方 `ls-dr10` M104 256px g 波段 FITS/同中心 JPEG；URL、哈希、CRVAL/CRPIX/CD、真实 FITS/JPEG 像素方向对照见 [原样证据](legacy-surveys-tan-sample-2026-09-25.json)。其官方[图片条款](https://www.legacysurvey.org/acknowledgment/)只对自制图层给 CC BY 4.0 并要求随图可见署名；此试验不代表已采纳整个 DR10、取得持续供给容量或已履行产品署名。

同一 FITS 的 `CRPIX=(128.5,128.5)`，既有 CDS W3 TAN 图使用 `CRPIX=(128,128)`。以实际 M104 ICRS 中心与观察者时刻建立回归，原 `registerSkySurvey` 忽略来源原点时把中心投为 UV `(0.498046875,0.501953125)`，相对 JPEG 真中心 `(0.5,0.5)` 为每轴半个源像素；定向测试先失败。现由同一个 TAN 注册 owner 显式接受 one-based FITS CRPIX，W3 消费者传入 `N/2`，Legacy 样本传入 `128.5`。回归除中心外，用源 FITS CD 矩阵的独立反 TAN 公式检验三处离轴像素与原有观察者/时间旋转；无效 CRPIX 明确返回 null。W3 的 51 个中心、真实 M31 WCS 及既有影像失败/粗层保留路径继续通过。

修后定向影像/生命周期/场景检查 20/20，Mini 类型检查通过。隔离正式 WEAPP slot `sky-legacy-wcs-0925` 构建退出 0、257 文件；与上个 `sky-phone-zoom-0925` slot 比较只有 `common.js` 与 `sky/detail/index.js` 改变，仍有此前的 CSS 顺序及 webpack 体积/分包性能警告。没有把小样加入小程序、BFF 或正式光学 HiPS 出版物，没有改当前 Android 反馈代；手机对新原点分支没有像素证据，因为该分支尚无生产图像消费者。

此结果只关闭 **TAN 原点的代码前置差异**。Legacy cutout 仍需按真实商品形式建立独立光学出版/选择、可见署名与许可链接、缺覆盖/失败时 W3 独立保留、目标像素与成本证据；PS1/SkyMapper CDS 成品仍未通过商业准入，不能以此样本或绿色构建声称 C06 完成。
