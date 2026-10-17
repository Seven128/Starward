# 派生区域合同：先验证坐标责任（2026-10-09）

当前连续区域M8/M61是真实HiPS native cell投影出的完整工作矩形，不是原照片AVM、companion FITS或重新测定的源天体坐标。显式加工成品不能沿用声明UNCHANGED字节的HiPS rights，也不能冒原whole-photo native的source/alpha合同。新版本合同与完整改动数据、实际原consumer接线仍MISSING；本段先关闭可能推翻这些工作的坐标小路径风险。

已从原native合同抽出`packages/miniapp-contracts/src/optical-tan-plane.ts`：只持有ICRS/TAN、矩形尺寸、FITS1-based reference pixel、CD矩阵及top-first UV平面，不声明来源、覆盖、配准或质量。原`PreparedNativeTanGeometry`仍严格限定原ICRS J2000及两种原照片accuracy，原producer/schema/hash/URLs不改变；派生区域即使换fresh hash或改frame也不能冒AVM。`packages/astronomy-core/src/tan-optical-geometry.ts`的原正反投影/宽度算法复用此共同平面，未改数值算法。现renderer/Prepared实际采用合同保持原样，不因有共同数学type自动采用新区域。

直接复用`output/continuous-hips-regions-2026-10-09-r4/result.json`的两份Astropy header，严格拒绝非ICRS、非二维TAN、distortion、其他pole；不重新下载/栅格化/模型/LOD。分别取完整矩形四角、中心、内部点及两个像素中心，Astropy世界坐标进入现共享TypeScript正反TAN责任：

| 工作平面 | probes | 最大UV读回误差 | 最大单位方向差 | 名义中行角宽 |
| --- | --- | --- | --- | --- |
| M8 621×1342 | 8 | 2.7460564204495608e-14 | 1.1619747090943176e-15 | 1.111130311828647° |
| M61 414×895 | 8 | 1.2391590705767932e-13 | 4.440892098500626e-16 | 0.18519402815368266° |

上述方向差是单位向量的Euclidean chord norm，机器trial的历史字段名`maximumDirectionRadians`不应解释成独立角测量。名义宽度是portrait区域中行宽，不借用旧camera的2.4°/0.4°垂直field作水平覆盖；真实source alpha和supplied mask保留，几何矩形不能证明科学有效性或源清晰度。当前source registration UNVERIFIED、science UNKNOWN、区域文件NEEDS_REPAIR/Scene MISSING均不改变。

机器读回为`output/derived-region-contract-2026-10-09/geometry-readback.json`，保存16探针数值、输入与现owner绑定；输入`geometry-input.json`33953B、sha256 `1684ab3469a72a62a7b26d5cd154b41d91f22b7175cc03263160c9ccb4fdc443`。任务trial脚本均保留在该output目录；原完整区域及加工成品未改变。9项影响检查通过（共享plane2、原native publication3、原TAN math2、真实native Scene registration/composition2）；contracts、astronomy-core、BFF和App实际TS5.9.3配置检查通过。误用仓库root TS6检查App会在已有baseUrl弃用处停止，该工具不匹配保留为失败，不改App配置以掩盖；随后使用App自身5.9.3完成检查。

当前出版方案继续沿原责任推进，不另造source/缓存/GPU系统：新增明确的派生region producer与坐标provenance、原HiPS source/selected native tile identities、未修改源metadata/授权与现加工proof、真实source alpha/供给meaning、完整去星master及三LOD/rights导出。原whole-photo/UNCHANGED版本保持严格兼容；开发异常候选不能普通采用，文件与Scene验收分开。

2026-10-09核读[ODbL原条文](https://opendatacommons.org/licenses/odbl/1-0/)§2.4、4.3–4.6：内容图片授权与数据库许可分别保留；公开加工结果的数据库来源通知和适用派生义务不能由CC BY代替。复用已采用4.6(b)完整改动数据/方法的路线，后续导出必须实际包含全部改动与新增内容的可读数据，不依赖用户能获得闭源模型，不能只给工具名字或参数。此方案是合同实施方向，未声称现本地文件已满足公开交付；普通开关/部署发布授权与质量未改变。既有Rubin具体内容/原HiPS ODbL通知仍沿原rights owner，不重开来源选型或要求母库全量镜像。

唯一下一依赖由PLAN控制：完整派生区域/provenance/content＋ODbL合同与本地出口，再接原Scene/source/Back，复用当前两区域和修复成果集中复核连续背景/目录星/相邻片。独审MISSING、原生平台/手机/物理峰未验及33项保持。
