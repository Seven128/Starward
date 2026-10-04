# M82 同巡天 Atlas 原生核心：强度、覆盖与不确定性

**实际三源已取得，原36坐标的有界支持事实成立；暗区/完整图质未修，未采用。** 没有 HiPS/DETAIL 重取或重采样、参数 sweep、科学 mask 改写、生产源码/外部业务改动、发布/部署或进程重启。原 r72 的337 source/6 protected/3448 evidence执行前后精确。

## 一次真实目录、三个实际文件

已有 IBE 元数据只含 M:82/band3 的 `1507p696_ac51`。实时缓存未找到该 coadd FITS 或 m82-native 三源；旧M42 pair仅复用实际获取机制。旧17 finite暗核心/19nonfinite坐标集中于原 DETAIL x250–266/y249–258，故请求同中心128 native pixel小切图供核心及附近核查，不取64MB全tile或冒完整0.25° DETAIL。

真实官方目录 GET200/16,203B，列 `1507p696_ac51-w3-int-3.fits` 与 `.fits.gz` 两种 intensity，以及 `-cov-3.fits.gz` / `-unc-3.fits.gz`。r1 任务假设每产品仅一名，目录已保存后 assertion/exit1，**无FITS请求、无完整after/final**；失败和原执行脚本在 `output/allwise-w3-m82-atlas-native-1004-r1/` 保留。

任务修正为从实际listing选已存在plain优先，否则已存在gz，不猜未列兄弟文件；r2对原目录raw/hash/URL/重新解析links核验后复用，**没有重复请求目录**。三项同中心、`size=128pix&gzip=false`，每项一次GET、禁止redirect、CA/hostname默认校验、25秒socket/35秒全子进程、250001B读界/250000B准入界、无retry。已传原始流先保存，失败/部分结果不作科学缺测。实际三200/CHECKED_NATIVE_ARRAY，各 **74,880B、129×129 float32**，合计224,640B；inclusive endpoint大小由原生返回head判，不硬改128数组。

实际 primary FITS/完整标量/填充均核：COADDID/band3相符，三源WCS全部相同，原 EQUINOX2000.0/SIN 与坐标责任保留。实际 intensity/uncertainty BUNIT=DN，coverage BUNIT=effective pixels，MAGZP18.0；单位来自这些native header，**仍不能给BUNIT缺的HiPS补DN或赋绝对表面亮度**。metadata `qa_status=Prelim`/tile `numfrms=208` 不当核心科学质量/帧覆盖。

见 `output/allwise-w3-m82-atlas-native-1004-r2/acquisition.json` / `request-plan.json` / 三FITS和request回执 / `binding.json`；旧目录回执/raw/执行字节绑定。r2正常exit0；只说明完整源输入，不是质量、目标runtime、手机或容量验收。

## 正确帧/行约定与原36坐标

新 task consumer 读三源实际FITS，以Astropy WCS解释 EQUINOX2000 为FK5/J2000；原保存TAN为ICRS。由原 `y down -> WCS row=pixels-1-y` 得36个ICRS中心，实际frame转换后映至native FITS row-up/origin0，读最近像素和实际四邻域，不插值输出科学数据。全部在129²内部；四邻域权重仅定位，不重现未知CDS/HiPS来源插值。

| 原已核分组 | 点数 | 最近finite intensity/unc | 最近COV=0 | 最近有效覆盖范围 | 四邻都finite I/UNC且COV>0 |
|---|---:|---:|---:|---|---:|
| 17 finite 暗核心 | 17 | 17/17 | 0 | 0.0331840515–0.3215026855 | 17 |
| 19 HiPS nonfinite | 19 | 0/0 | 14 | 0–0.0058798790 | 0 |

17点在native中仍为有限正值/有限unc/正coverage，**稀少有效支持不自动变missing或低于某阈值就抹黑/补洞**，也不认证探测器有效性或具体饱和/伪影原因。19点最近native强度及unc均非finite，其中5点coverage小正数，不能要求 `NaN iff COV==0`。精确每点world/nativeXY/原HiPS值/三个最近标量/四邻及其权重均保存于 `output/allwise-w3-m82-atlas-core-support-1004-r1/mapped-core-points.json`。

完整129² patch16641点：50 intensity非finite、50unc非finite、25 COV=0；另 **25个nonfinite intensity/unc处COV>0**，无finite intensity且COV=0。这提供真实 `coverage-only -> available` 逃逸反例；COV描述有效贡献量，不是frame整数/置信度/科学质量或独立噪声证据。

## 实际原生查看与根读回

只对这个新native patch复用已试验260–1000/asinh.1做来源检查PNG，未新拟合显示参数，finite alpha保真、50非finite透明。完整PNG加载后RGBA保真并已实际查看：核心暗区仍存在，固定范围压白还在，**不是改善后产品图**。没有Matplotlib则复用已缓存Astropy/Pillow作源检查，无新工具下载。原科学array/旧HiPS science/availability/PNG保持。

Root不同计算路径用FITS origin1及显式ICRS→原native frame→`all_world2pix`，不调用producer的 `skycoord_to_pixel`；36坐标差0、最近/四邻标量地址及值精确。直接读真实FITS/PNG/保存记录，25个COV-only反例、sourceAlpha/所有旧pins精确。见 `output/allwise-w3-m82-atlas-core-readback-1004-r1/result.json`。自审非独审；原生WCS相符不认证绝对天体测量真值或原CDS interpolation谱系。

## 下一责任与开放范围

不继续显示曲线、低亮阈值mask或手修M82。按PLAN，下一将**实际Atlas int/cov/unc共同源准入及支持语义**接入现有离线职责和本代真实消费者：先核 `image_quality.checked_source_files` 的完整集/hash责任及HiPS fixed-shape reader，复用FITS/WCS；为native triplet保输入完整性、identity/units/grid一致、原值/finite与正contribution/unc已知性分别建合同，以实际25反例验证不把COV>0或finite当质量。不把17稀少贡献判成缺测，不供直算SNR/独立noise/sky，不覆盖旧source/图像或将core patch扩成完整母图。不是新请求/队列/缓存框架；实测不支持有质量修复就保持不采用。

原暗核心的物理成因、HiPS/native确切谱系、PSF/弱结构/全背景接缝/完整配准、权利加工和普通完整出版/Prepared采用仍开放。更广数据须真实需求/缓存/来源资格，不被本36样本或当前实现封顶。strict Back、pending Map panel（外部业务不改）、WXML/SCSS/native/手机、新Moon、静态真实refs与物理保留、全200DAU成本/混合容量/180GB与独审等原33项继续保留；Goal active、无预算。
