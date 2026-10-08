# Q1：PS1 NGC884 官方成品与相邻供给小样

**默认单 skycell 彩色成品配置退出，PS1 官方已处理邻片保留为具体候选。** 原图顶部 358 行全白，占显示图 34.96%，亮星也有明显彩色空心/晕圈。不能把这份图当完整连续区域接入。新坐标的相邻 i 波段、正权重及保零 mask 小样已有实际供给，允许继续一个有界同源接缝试验；尚无合格覆盖扩大或普通 Prepared 采用。唯一执行顺序见 [PLAN](../PLAN.md)。

## 实际输入和退出决定

复用缓存固定 OpenNGC 原 CSV，真实 `NGC0884` 是非 Messier 疏散星团，坐标 `02:22:32.10 / +57:08:38.8`，目录主轴 10.50′。该次官方请求中心为 ICRS `[35.63374999999999,57.14411111111111]`；没有改普通目录、搜索或对象身份。原来源 [获取收据](../../../../output/ps1-ngc884-source-1006-q1-r1/result.json)绑定目录原 SHA 和原行，不把 Caldwell 14 的双星团范围缩成一个对象。

| 原始文件 | 原 body / SHA-256 | 实际范围 |
| --- | --- | --- |
| 官方 skycell 2409.025 文件清单 | 1,695B / `709113876261863fc54e7b56fca34638871bbbf74f1b4cd9a80a17a058663d67` | g/r/i stack、权重、mask 共9行；发现不是质量资格 |
| 官方 i/r/g→红/绿/蓝 PNG | 930,379B / `6680741ae1c4ef8fc2e9cdc5f1437cc0d78746dd881e8cb1c541c2b33aca81e9` | 请求6000原像素、名义25′，显示1024²；无 ICC/sRGB 声明，转移编码 UNKNOWN |
| 同中心 i 波段 FITS | 23,040B / `5ba0ae6b05dd99a29c8af0dcf8750b4a86d1244711366f968d656c2089be775f` | 仅8×8原像素几何输入，不是整张 PNG 的 WCS/有效 footprint |

已查看完整 [原始 PNG](../../../../output/ps1-ngc884-source-1006-q1-r1/ngc884-gri-colour-6000-to-1024.png)。[只读检查](../../../../output/ps1-ngc884-readback-1006-q1-r1/result.json)读回顶部连续358行、366,592像素全为255，全部纯白368,003像素、纯黑234像素。它们只是字节描述，不能用颜色自动生成科学 mask，不能将有效黑当缺测、抠掉白区或星点，不能据此推断其它白像素的含义。亮星彩色空心/晕圈的机制未认证；mask参数对照没有证明修复它们。

本配置为 **FAILED_FINISHED_CUTOUT_INCOMPLETE_FOOTPRINT_AND_VISIBLE_COLOUR_ARTIFACTS_UNADOPTED**。不分三档、不建立假几何/alpha、不启动实际 page/Scene 消费不合格输入，不再取相同中心更大的默认 cutout。普通 registry、原 Mellinger 显示、NGC6752 原像素及 Q2 失败保持。6000是当前服务限制、1024是本次小样配置，均不成为产品需求上限，也不否决全部 PS1 数据。

## 官方产品、权益和供给边界

[官方获取入口](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812239/How+to+retrieve+and+use+PS1+data)提供已处理 stack/warp、彩色成品和 FITS；本轮未重建原 CCD、PSF或去噪流程。[STScI 管理的 PS1 数据授予](https://registry.opendata.aws/mast-panstarrs/)提供免版税使用、复制和公开显示的依据，不列 NC 条件；non-transferable 不被改写成禁止本项目商业自有展示。具体官方数据、服务生成成品、第三方 CDS 图像/数据库分别处理。本轮未取得 CDS 派生像素、未外联或发布。通用 [MAST 数据政策](https://archive.stsci.edu/publishing/data-use)不会解除 DSS/GSC 的独立限制。

原获取收据中历史 acknowledgement URL 当前读取不可用；通用 mission acknowledgements 页没有本轮所需 PS1 专属段。发布前具体署名/链接及服务成品身份仍须在实际来源消费者落实，不能假称本次已通过完整发布条件；这不抹掉已核官方原数据授予，也不阻止授权内小样。

[官方 cutout 说明](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812251/PS1+Image+Cutout+Service)明确点查询只选一个最远离边缘的 skycell，越界填空白，邻片填补仍列为未来能力。FITS cutout 已将 stack asinh 逆变换回线性值，不能再做一次逆变换；彩色 FITS须分别取通道。批量位置查询和同源供给可复用，不能把现成接口可调用等同连续区域已经存在。

[官方 tessellation](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812317/PS1+Sky+tessellation+patterns)提供同一 projection cell 的共用 TAN 网格、`0yx`邻接和边缘重叠依据。因此只查北邻 `2409.035`，未扫全天或镜像巡天。两父片实际 getWCS 均为6278×6311，CRVAL `[36,58]`、同 CD，CRPIX y 相差5831原像素，即480原像素总重叠；几何元数据不证明整幅观测/颜色/接缝质量。

## 相邻实际供给与失败保留

新北侧点 `[35.63374999999999,57.29411111111111]`（原中心向北9′）作一次具体对照：

- 原片 2409.025 的8×8请求实际返回 **HTTP 400 fitscut error**，不是64个零或 NaN。失败、URL及任务中断保存在 [R1](../../../../output/ps1-ngc884-neighbour-supply-1006-q1-r1/failed.json)，没有重试该请求。成功邻片清单1,704B复用于后续。
- 邻片同点 i 波段64个有限值、权重64个有限正值，但默认 mask 为64个 NaN。原 FITS和 [R2日志](../tmp/ps1-ngc884-neighbour-supply-2026-10-06-r2.log)保留。R2描述 JSON输出了裸 `NaN`，属于 **FAILED_NON_STANDARD_JSON_NAN_PRESERVED**，不能给 JS 消费者当标准 JSON；不覆盖旧结果或将 NaN 改零。
- [fitscut 官方参数](https://hla.stsci.edu/fitscutcgi_interface.html)规定 Badvalue 默认零。仅在该 mask 的新请求显式设 `badvalue=-1e30`（超出32位整数 mask 取值域）、`badpix=no`，结果64个有限零值；同小样中心与原 i/权重一致。此为原值保留对照，不是填补数组或星点修复；所有 mask 位语义和全幅科学有效性仍 UNKNOWN。
- [R3标准 JSON读回](../../../../output/ps1-ngc884-neighbour-supply-1006-q1-r3/result.json)绑定全部原输入与 R1/R2失败，复用既存 science/weight/清单，只新增一个保零 mask 和两父片 getWCS 元数据。没有再取原彩色图、science、weight或清单，没有组成新照片、母图或出版物。

全部任务数据端请求共11次：10个200 body合计 **1,058,066B**，一个400的 error body未取得、不计成0；网页调研另计，不冒HTTP账单。没有 full skycell/全库下载、新服务器、开发构建或 SDK动作。现有 Python/Astropy/Pillow/NumPy 环境复用；离线机器峰、生产处理/分发费用未测，不填零。

## 几何与下一最小路径

原8×8 FITS是 RA/Dec TAN、旧 PC 关键字、RADESYS=FK5、EQUINOX未给、TIMESYS=TAI；49个局部 nominal 往返最大误差 `5.35389510503137e-10`原像素，仅认证库能解释该小头。实际 cutout中心有取整偏移，不把请求坐标伪作精确像素中心。父片 getWCS 却返回 refframe=ICRS及各自epoch；官方说明 full FITS缺RADESYS。这处实际标签差异必须按真正原头/成熟 frame转换解释后再消费，不能无条件改标J2000/ICRS或外推 PNG整幅WCS。stack跨多个年代，不把头中某日期当所有恒星的实时观测。

下一只做同源已处理邻片的有界原格接缝样本，先绑定原头坐标系/整数网格及原 mask保零规则，以已有库和供给做一个真实多通道覆盖/颜色与成本决定，再进入现 Prepared消费者。无需逐图PSF或通用巡天框架；若新输入仍不适用，保留明确失败并退出该配置。全幅/弱外围、较宽连续区域、绝对配准/科学资格、Source/Back/标准发布/恢复/资源和真实 DevTools/Android/iOS均未验。本轮产品源码0变化，33项整体不关闭，Goal active无预算，无提交推送、部署、采购、外联或发布。
