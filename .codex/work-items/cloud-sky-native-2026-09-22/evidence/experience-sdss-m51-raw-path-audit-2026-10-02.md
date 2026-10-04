# M51：继续已采用 SDSS 来源的校准科学帧路径，只读审计

2026-10-02。本记录属于唯一 PLAN 第2项共享影像质量，非第二计划或源码实施完成证据。复用本任务 sources.json、OPTICAL-DATA-RESEARCH、成本研究和 SDSS 历史输入/配准证据；按当前产品契约保清晰度、完整范围、颜色、有限矩形和共享处理责任。未修改生产代码、原图、出版或预算；未下载 FITS/新图片、执行 CAS 查询、启动运行时、部署、联系或付费。附 [可复用输入与实际字段种子 JSON](experience-sdss-m51-raw-path-audit-2026-10-02.json)。

## 结论与真实输入边界

继续 SDSS 官方 corrected-frame g/r/i 是有实质改进能力的下一条路径；它是从当前已采用来源扩展到校准科学数组，不是重新选择巡天。现有512px JPEG没有足够信息重建完整高清母图、精确 WCS 或科学有效性。当前本地缺 M51 的完整三波段科学数组、源帧 WCS/astrometric metadata、完整所需视场的实际 footprint 和质量/背景资料。可以先用一次中心三波段小实证闭合读图/配准/颜色，再按真实 footprint 获取最小相邻字段，不能把一组中心帧冒称完整出版输入。

`rg --files -uu` 已按 artifacts、output、本任务 work-items、data-pipelines 和 published assets 搜索 FITS/科学帧候选，排除库/venv/site-packages 的 FITS 测试数据；本结论限这些授权项目数据根，不是整台机器全盘搜索。没有找到 SDSS M51 `frame-[gri]-*.fits(.bz2)` 或同类科学母图。M51 `.f32` 是 JPEG 解码派生，不是已校准的科学帧。查到的 `legacy-surveys-trial/m104-levels/ls-dr9-m51-center-native-512-invvar.fits` 是此前 Legacy 候选，已有缺波段/条带质量问题且不是 SDSS，不能混作母图；M42 完整 AllWISE W3 的20份 FITS 是另一目标/波段，M82 仍仅3/6源，也不补这个缺口。没有在既有已核输入中找到可直接替代 M51 的完整高质量光学母图。本次没有重开 DSS/PS1/SkyMapper/ESA 或据公开镜像推断使用权。

生产 `workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json` 是 `sdss-dr17-m51.v20260925` / `sdss-dr17-m51-optical-publication-v1`，RA=202.469625°、Dec=47.1951666667°，ICRS J2000。三档是原成品、不同范围的512² JPEG，总64,352B，并非一个母图的同色金字塔：

| 档 | 请求尺度 | 场幅 | 字节 | SHA-256 |
| --- | --- | --- | --- | --- |
| overview | 1.6″/px | 0.22755555555555557° | 20492 | c98129d2ea984cf4106b14b325f355df149f36fe30c2c8ecbcdd0d3733ff81c6 |
| medium | 0.8″/px | 0.11377777777777778° | 24076 | eee315a0e76c58d5ba67072764d54c7cfa7979c8f060cce8e548150aba497de0 |
| detail | 0.4″/px | 0.05688888888888889° | 19784 | a9f3884874773293589bedac159ac0d1d479f9cf8130e21c74ebcaf6a7cc9447 |

它们有不可逆 RGB 拉伸、重采样/压缩和潜在饱和，放大不能创造光学分辨率。原 [七星中心核对](c-sdss-catalog-registration-2026-09-25.md) 反求零基中位 (255.664,256.578) 仍不提供精确服务端 WCS，不能据此硬改 CRPIX。当前 `sky-scene-render.ts` / `sky-survey-registration.ts` 用512及256.5注册请求中心；`sky-gpu-renderer.ts` 对 optical 保原RGB/source-over及8%显示边缘淡出。M51 在已保存蓝天空实际软件图 `output/playwright/cloud-sky-wide-resource-composition-1002/optical-coarse.png` 的有限矩形问题仍开放。加大 taper 会衰减真实外围，不能认证修复。结构报告、当前6个光学目标/18 JPEG 和上述字节不证明全部光学质量或需求已满。

## 官方权利与获取边界

[SDSS Image Use Policy](https://www.sdss.org/collaboration/image-use-policy/) 区分网站图像的 CC-BY/署名和公开 data release 数据的 public-domain 声明，并禁止借使用暗示背书。因此，从官方 SAS 指定公开 DR17 数据获取 corrected frames 并加工/自托管/再分发，有官方数据权利依据；新产品仍须记录真实 release、原输入、作者/来源信用和处理。当前 JPEG 的已采用清单/CC BY 4.0 不自动成为新 raw 产品的许可清单；第三方镜像、软件、插件和附带其他来源不能继承这个判断。这里的 raw 路径指校准科学帧，不称未处理相机原始曝光。

[当前官方 imaging tools](https://www.sdss.org/dr18/imaging/tools/) 说明图像/CAS/SAS仍可用；旧 `dr17.sdss.org/imaging/{coverage,field/search,mosaics}` webapp 已在2024-08弃用，不能再当实际入口。沿 CAS 查询字段，再用 [DR17 官方 bulk imaging 路径](https://www.sdss4.org/dr17/data_access/bulk/) 精确读取 `data.sdss.org/sas/dr17/eboss/photoObj/frames/…`。本审计没有取 frame，也未验证拟构造 URL 的实时 HTTP 状态/字节。官方公开数据与免采购，不等于运营网络/离线加工零成本。

## 已缓存 CAS 身份与最小可执行定位

缓存 `artifacts/miniapp/cloud-sky-native/sdss-center-trial/m51-photo-primary.csv` 1152B / SHA-256 `b969c967184c1d41bfd1dce2db88f9254ded939c53daaf8c3828e9e04b5455d0` 是此前中心6角分、12≤r≤22、type=6的18颗星实际查询结果。按 [官方 PhotoObjID bit masks](https://www.skyserver.sdss.org/dr7/en/help/docs/algorithm.asp?key=objID) 用 BigInt 无损解码，得到下列字段种子；objID/fieldID保十进制字符串，不能经 JS Number 丢精度。

| rerun/run/camcol/field | fieldID | 已缓存星数 | 示例 objID |
| --- | --- | --- | --- |
| 301 / 3699 / 6 / 99 | 1237661362908495872 | 7 | 1237661362908496524 |
| 301 / 3699 / 6 / 101 | 1237661362908626944 | 5 | 1237661362908626965 |
| 301 / 3716 / 6 / 118 | 1237661435924185088 | 6 | 1237661435924185091 |

这些是附近真实历史对象所用字段，不是本次中心最佳字段、全图覆盖或当前 SAS 可取性断言。无需重新取得同一18星CSV。下次先对官方 [DR17 SQL UI](https://skyserver.sdss.org/dr17/en/tools/search/sql.aspx) 作一次只读中心定位，使用当前 tools 推荐的 polygon→primary field 关系，补正文档漏写的 `AS p` 并取 rerun：

```sql
SELECT DISTINCT f.fieldID, f.rerun, f.run, f.camcol, f.field
FROM dbo.fPolygonsContainingPointEq(202.469625,47.1951666667,0.01) AS p
JOIN Region AS r ON r.regionID=p.regionID
JOIN sdssPolygons AS s ON r.id=s.sdssPolygonID
JOIN Field AS f ON f.fieldID=s.primaryFieldID
```

API 候选构造入口为 `https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch`，`cmd` 为上述 SQL 的 URL 转义，`format=csv`；完整构造 URI 在附 JSON。本轮 web extractor 对无 query 的动态 SQL/UI 入口都不可读，仅记录这次事实，未重复启动/请求；不能把构造 URI 当实际运行成功。若需回核三个缓存字段，SQL只读 `Field WHERE fieldID IN (1237661362908495872,1237661362908626944,1237661435924185088)` 并核 rerun/run/camcol/field，保持旧 objID 版本身份。

SAS 官方构造式：

```text
https://data.sdss.org/sas/dr17/eboss/photoObj/frames/{rerun}/{run}/{camcol}/frame-{band}-{run:06d}-{camcol}-{field:04d}.fits.bz2
band = g, r, i
```

实际缓存种子 `301/3699/6/101` 的三条 URL 为：

- https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/3699/6/frame-g-003699-6-0101.fits.bz2
- https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/3699/6/frame-r-003699-6-0101.fits.bz2
- https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/3699/6/frame-i-003699-6-0101.fits.bz2

附 JSON列完三个种子的9条构造 URL。它们尚未 HEAD/GET、未核中心相交；应优先按新 CAS 中心回值决定一次三波段 trial，不盲目下载全部9条。官方 bulk 示例的 `2505/3/38` 仅说明命名，不能误当 M51。

## 科学输入和明确共享机制

[SDSS corrected-frame 说明](https://www.sdss4.org/dr17/imaging/images/) 与 [frame datamodel](https://data.sdss.org/datamodel/files/BOSS_PHOTOOBJ/frames/RERUN/RUN/CAMCOL/frame.html) 给出了2048×1489 float32、已校准/已减 sky 的 nanomaggies，HDU0 TAN Header、HDU1 calib、HDU2 global sky 与 HDU3完整 astrometric transform。不能再次乘已施用 calib 或减已扣除 ALLSKY。简单 Header WCS 不含所有多项式项；先用已有 Astropy 读头/数组，再按官方 full transform与独立星表误差核配准，不把 reader 能打开当精确 WCS 已闭合。native sampling约0.396″/px和实际PSF/饱和限制了可获得细节，不能承诺超出真实采样。

当前 overview 的13.6533′方形若以0.396″采样，约2069×2069输出；一个2048×1489源帧面积不足以覆盖整个方形，且源扫描方向不等于北向TAN。因此 center g/r/i trial 只够验证适配器，完整 mother 的所需字段数、可用率和压缩字节当前 UNKNOWN。后续按真实源 WCS/field polygon与目标范围逐一求交，用完整母图所需最小字段及一定有依据的 sky margin；不能仅查中心/四角然后宣称任意内部无缝全覆盖。

建议沿现有 `data-pipelines/deep-sky` 公共 offline quality/publisher 责任增加 SDSS source adapter，复用 `image_quality.py` 的真实解码/hash/几何/报告，复用已有 NumPy/Astropy/Pillow 环境，不逐对象函数、不重新安装 runtime。adapter持真正 source field/band/unit/变换及每带 validity；共享 processing 持完整母图、同一北向TAN注册、跨带配准/有限 footprint、统一颜色/显示规则，publication/客户端继续持不可变版本、原图兼容、按需粗细与实际来源。

先在科学域保留三带含负值的真实数组与 mask，分开有限样本、已知非有限、像素/质量标志、未知/缺源。非有限之外的仪器坏像素不能只靠 `isfinite` 宣称正常；必要 flags/noise/PSF 资料按字段实际读取后才解释。HDU2只是已减 background 的记录，不是独立 coverage/质量 mask。[官方 sky 算法](https://www.sdss4.org/dr17/algorithms/sky/) 本身明确大星系外围容易被错误背景估计扣掉，global sky仍可有残差；仅当真实 off-source样本足够并排除 M51/伴星系/星点后，才能估残差背景/噪声，不能用黑阈值或边角亮度猜科学孔，也不能把星系盘面拟成 sky。

基于同一完整校准母图，固定一次 g→B/r→G/i→R 的 color balance/零点和零通量保持的连续 asinh/Lupton显示映射，再从母图派生不同范围/采样档位；粗图必须保整个范围，细化不能退休可见外围，档位不能各自自适应拉伸造成颜色跳变。高分辨率母图只用于离线；先仍出版有界512纹理+精确各档WCS/同母图关联，客户端不会每 DAU 收三份 FITS。当前 decoder/GPU边界不能因母图更大而默认扩大；2069² RGBA约16.3MiB仅一张已解码数组的模型，不是 native 总内存。将来若要同范围更细分辨率，需另据真实像素收益测有界多级切片，不能先发布大图再靠额度兜住。

矩形的真实机制是从校准 sky-subtracted 科学 flux 建连续显示贡献，并将 display alpha与科学有效性分离，而非从当前 JPEG 猜黑色。一个可作小实证的 source-over 分解是：共同映射所得线性显示 RGB为 c、alpha=max(c)，RGB=c/alpha（alpha0时显示贡献0，科学有限黑/负值仍保 valid）；其 premultiplied贡献恰为 c，黑背景回读保持该映射，彩色天空按同一 source-over 显示。这里 alpha是明确显示解释，不是探测阈值/coverage，需保存实际 mapping参数、色彩空间和独立 validity 并核已绘来源，不能沿用 M42 `nonfinite-only` 意义冒充这个新产品。公式是待真实三带验证的候选，未采用生产参数/新合同；不得把编码sRGB直接加到天空或猜 JPEG黑mask，亦不得扩大8%taper。

校准 flux/native分辨率改善源能力，仍不承诺矩形自动消失。有限 footprint外没有数据，噪声/残差在边缘仍可能有可见贡献；不能制造无限背景/天体或用大渐隐擦除真外围。display alpha也不可能同时保证任意彩色天空下完全相同的摄影外观与零背景遮蔽；应实际比较夜/蓝天/暮光、粗细共同区域、真实 faint外围和有限边缘，保持来源及说明。若该分解降低外围/颜色或残余不合格，应据实际母图修公共显示映射/背景处理，而不是宣称颜色/边缘已解决。

## 下一次最小实证与反例

后续 owner 先一次 CAS 中心读取、按回值一次官方 g/r/i 三帧及必要字段元数据获取：新独特 task output、每个 URL/HTTP/压缩字节/SHA/decompress/HDU/数组长度记录，任一带失败留 UNKNOWN并停止出版，不反复换 mirror或把失败填0。datamodel约3MB/frame只是文档数量级，不是本目标实际字节；真实预算读回后再记。随后核单位/scale、源重叠/center、HDU3与Header差异、三带同星共位，以已缓存星表独立匹配（留出验证星，不按同组拟合误差自证），保存真实科学范围图/颜色图/validity及背景样本；这一步没有全域 mother就不出版。不做手机/服务部署/最终验收。

必须有意义地检验：有效0/负科学像素不变科学missing；缺一带/文件截断/错hash/错field拒绝；源frame rotations/CRPIX/畸变偏移不能静默用请求中心替代；同母图两档重叠颜色与实际像素，独立拉伸旧方案作反例；低亮度真实外围不能因alpha阈值/更大taper消失；曝光饱和不能声称后处理恢复；同一输入夜/蓝天全scene贡献和来源真实一致。只有真实样本与组合图能决定上述候选的清晰度、外围/颜色/边缘收益，报告数量和可打开FITS不能替代。M82缺源与本轮之外目标保持各自未知，不外推 M51 试验。native组合、客户端总资源/时序、200DAU容量和完整交付保持原 PLAN 开放。

## 本轮审计源码/资源绑定

以下仅固定所读生产owner，非新 bundle运行验证：

| owner | SHA-256 |
| --- | --- |
| sdss-m51/manifest.json | d7632b5244c9b7f93ca0cb58b19b39b9f123cba49181ecdbe84e7c942f6cac92 |
| data-pipelines/deep-sky/image_quality.py | b69389f2961949ddb96a2248cbb4f7e866e653a78e710efb87fdfde88660fcff |
| data-pipelines/deep-sky/allwise_finite_tan.py | 6ce051e687cb2a66da3de0390c6b16015b5f44eb0f34457ff874142dd5edc354 |
| apps/wechat-miniapp/src/features/sky/sky-survey-registration.ts | 6c4af33d77ce8aad30dd101ad389b336267e4b5aa2b3be9dd24ec2ba9b9dcf8f |
| apps/wechat-miniapp/src/features/sky/sky-scene-render.ts | ea1b50bbfb4bdbdc9774ff537dc259e53d407a513a29ae0ce70bd739fec3808c |
| apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts | af28d3e14de225de0c42d6e7ea48772b9ec20b9b5a3bc8d06b885b69b363947b |
| packages/miniapp-contracts/src/sdss-optical-publication.ts | 0fd5f2c3b7e29cc478ef04dd9b9af7516916b71993a34aba2645852fcd3daa38 |
| workers/miniapp-api/src/sdss-optical-imagery.ts | 585c2f2b59ad57f472a1a85dad4e67bf99a2ee1b3ac5feb43d00e788a1e1521d |

当前 rights/docs核对、缓存18星field解码、资源hash/尺寸只是只读研究实证；未认证 corrected-frame可得/精确配准/背景alpha产品/完整清晰度与颜色。后续实际读取若发现不同帧/缺带/残差，应更新本任务证据与既有 owner，不修改需求或消除未验。
