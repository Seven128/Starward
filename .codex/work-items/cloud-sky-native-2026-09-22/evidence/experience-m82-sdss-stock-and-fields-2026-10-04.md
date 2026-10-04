# M82 已有光学图与原始 field 供应

**已有SDSS三层JPEG已复用/查看；一次官方查询有8个候选field，尚无这些原始帧，不采用新图片。** 云观星之外业务逻辑、小程序/worker、六保护、旧源/科学/成品及原进程未改；只新增task与进度。没有重取旧JPEG/HiPS、加工母图、调显示、发布或部署。

## 已有成品与质量边界

原 `workers/miniapp-api/assets/deep-sky/sdss-m82/manifest.json` 为 `sdss-dr17-m82.v20260929`，原SkyServer DR17 RGB合成、CC BY4.0/原credit及修改披露保持。三张JPEG总62,314B，各512²，原hash/bytes/full decode精确。Root实际使用view_image查看完整overview、medium、detail：光学盘及尘带可见，detail中央仍有大片近乎平坦的亮色区，周围颜色/弱结构不能靠现图认证。这里的显示平坦不诊断真实CCD饱和、噪声或具体绿结构身份。

现OV真实视场0.2275555556°、MED0.1137777778°、DETAIL0.0568888889°，细档中央视场不冒整银河。无新许可用途/第三方选型，继续既定SDSS科学帧适配与共享gri/WCS/质量/批量出版链；与W3历史12µm不同，光学不能认证W3暗区修复。当前六对象/三图与样本数量不封顶。

## 一次真实字段查询与库存

复用原M51已执行的CAS primary-field query，按共享 `target_tan` 构造M82已有OV完整范围的2048²母网格，只用25个均匀位置找候选field；不请求JPEG或科学数组。一次默认CA/hostname TLS、无redirect/retry、25秒socket/35秒wholechild、500001B读界/500000B准入界；官方SQL200/319B/1.438秒。数据来源为 `dbo.fPolygonsContainingPointEq` → Region/sdssPolygons/Field，整数fieldID保真，不经过float64。

实际候选全部rerun301：run4264/camcol5/field260–263；run4294/camcol5/field237，camcol6/field236–238。这些是25采样点供应的primary fields，不能证明完整方形、所有波段/像素或其他RUN供应。`output`含ignored的全部 `frame-*.fits.bz2`文件名库存已核，对8个身份g/r/i共24种原帧均无对应文件名。文件名匹配仍只是库存发现，不代替实际header/WCS/bytes/receipt准入；现有M51 frame不能借给M82。

见 `output/sdss-m82-stock-and-fields-1004-r1/` 的inventory/request-plan/query-receipt/原始field-response.csv/result与executed-script。唯一请求后原r74的344源/六保护/3489证据字节精确，无图片下载或源处理。

## 根读回与失败保留

Root直接parse原CSV读回全部8 identity、原JPEG/manifest/hash/full decode、现有库存路径及原checkpoint全部字节。用保存WCS origin1核25原采样位置；初轮要求serialized header与live WCS逐字节浮点相等失败，r1失败明确保留。`to_header`中心148.96970833333333→148.96970833333造成最大3.325340003e-12°差异，与actual serialized centre损失相同；r2按已有128epsilon×180°算术界核，不是图像容差或绝对配准，通过。没有重新请求或倒改producer/旧事实。见 `root-readback-r1-failed.json`、`root-readback-r2.json`；root自审非独审。

## 唯一下一依赖

按PLAN从真实8候选身份复用已有官方SAS机制，一次取必要r corrected frames并经现有reader核实际WCS、共同母网格footprint/核心与边界供应；再仅补实际参与字段的g/i及必要质量/噪声/astrometry输入。真实完整供应才能进入共享single/mosaic/partial加工，未知/坏输入保原/不冒零，不把25位置或field数量当完整覆盖。还须核源flag/亮核/背景/弱结构/共同LOD/配准及来源信用/完整发布/成本，普通registry仍空；旧W3暗区、SDSS完整质量、WXML/手机、strict Back、static真实引用物理保留、全200DAU混合容量及独审等原33义务不变。Goal active、无预算、未完成。
