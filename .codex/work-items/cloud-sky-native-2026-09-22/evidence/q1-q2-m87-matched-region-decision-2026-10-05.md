# Q1/Q2：匹配M87的真实区域小样决定

当前Legacy配置不采用为连续背景或完整照片外围。真实M87中心、返回TAN与条件消费者均成立，但当前实际概览/细档有清楚的照片矩形，原图亮星彩色饱和伪影和核心截顶也保留。名义几何成功不能关闭图质；不抠黑、feather、删弱结构、生成细节或扩大同配置加工来掩盖这一结果。普通Prepared registry仍空，现有SDSS/M82、NGC253、旧细Legacy及光学银河DISPLAY各自结论不变。

## 实际产品、权益与获取

- 直接读取[DR10取图说明](https://www.legacysurvey.org/dr10/description/)与[具体自制图层条款](https://www.legacysurvey.org/acknowledgment/)，浏览器读回保存在 `output/prepared-m87-region-source-1005-q1-r1/official-docs.json`。`ls-dr10-grz`是观测g/r/z显示合成，不是model/residual；M87位于DR10南侧。当前文档cutout尺寸上限512只是本次接口条件，不是需求或弱外围上限。
- 自制Legacy Surveys图层CC BY 4.0，完整 `Legacy Surveys / D. Lang (Perimeter Institute)` 应清晰、随图可见，在线链接有效；不泛化到同站第三方叠层，不暗示背书。原URL、政策、许可、处理色与改动声明沿既有manifest/来源owner保留。条件软件page的文本和公共来源route已读回，但没有微信原生可见性/外链验收。
- 原缓存细区域仍是RA187.3°/Dec12.3°、宽6.827′，距M87中心24.412′，不能供应该目标现有视野。新请求由现OpenNGC M:87和普通SDSS OV推导：RA187.70591666666667°/Dec12.39111111111111°、512×512、1.6arcsec/pixel，名义宽13.6533333333′。这是与现OV匹配的最小比较，不是完整真实halo界限，也不把Legacy充SDSS/Hubble同母父层。
- 只新增两次公开GET，各200，无redirect/retry。JPEG **59,253B / 9aaec5cdba3c4b9f7ed1afd0cca3abe8247f8ef0784c702d23d79cbc6e937876**；同配置g FITS **1,054,080B / 80fb11f25b98bd50bcf41825a3122684a63a0daca919b1a5b195f220c37f9be2**。原始总body1,113,333B；不是协议计费、月量或物理存储。请求及完整原字节独立封存，未再下载月面、旧候选或依赖。
- `scripts/acquire-m87-region-sample-2026-10-05.py`直接复用原有有界acquirer，仅导入并选择这两个新输入，未执行旧批次。复用现有Python/Astropy/Pillow环境，不安装新库，不运行PSF/噪声工程。

## 名义覆盖、图质与最小处理

实际返回512×512、线性RA/Dec TAN，无distortion。header未声明RADESYS/EQUINOX，Astropy默认ICRS只是未独立核实的解释。中心/CRPIX/CD与现SDSS公开显示几何匹配，9个边/角/中心读回最大误差 **8.051301847444847e-10 pixel**；现SDSS JPEG没有由此获得独立科学WCS。g FITS共262,144有限像素/0零值，也不是RGB逐波段曝光、科学有效性或绝对配准证明。

复用既有四轴翻转诊断，不拟合PSF或修改原像素；g FITS bottom→JPEG top相关0.8572321，其余三方向约−0.0081至0.0110。既有原生平面owner在新输入49个方向样本上最大UV误差 **4.057865155004947e-13**。具体来源/返回header/原图像素/脚本前后pins在 `output/prepared-m87-region-inspection-1005-q1-r1/`。这只支持名义方向/新输入消费者，科学与绝对准确性继续UNKNOWN/UNVERIFIED。

完整原JPEG已实际查看：M87亮核心/外围、邻近天体和星点均保留；上方亮星有明显彩色水平饱和伪影，M87核心截顶，背景有明显纹理/噪点。未把黑、编码255或g的零值用作科学mask/覆盖阈值。未加工或移除这些像素。

现 `publish_prepared_native.py`按同母全幅生成128/256两档，512 DETAIL直接复用新原JPEG字节；没有master重投影、再编码DETAIL、重新获取或另建出版框架。三档保完整矩形/TAN/region身份，来源声明独立观测显示色、非自然真彩/实时，科学有效性及源分辨率UNKNOWN。固定recipe/producer/writer receipt分别在 `output/prepared-native-m87-recipe-1005-q1-r1/`、`output/prepared-native-m87-1005-e1-generation/` 与 `output/prepared-native-m87-1005-e1/`。

条件publication **f1f25b0e19e3812a9a82abeaebbbe2377c81bdd22b4992dc2ad10410d599e284**；完整manifest字节sha **5ccb9749639ba611c9b47c00e21003774d6919f7dcb68c2851ac0d221e5d9485**。身份 `REGION:m87-center-dr10-grz-1p6` 为独立区域，不能被搜索/点选为另一个天体；实际M87目录定位使区域中心落到视图中心，没有相机setter伪造结果。

## 新输入条件消费者与退出决定

`output/playwright/prepared-native-m87-page-1005-q1-r1/`复用原完整Taro/React/Query/Map→Sky executor、真实HTTP/file/cache/Hook/Scene及软件WebGL。这是新输入小样，不复跑旧R1/R2/两旧E1矩阵；历史executed脚本/pins保原epoch。本次仅扩task profile和匹配中心检查，产品源码零变化，539项上一实际page基线及六项保护文件精确不变。

- 当前frontend515、backend173输入全量前后及事后读回相同；实际104请求/54Scene调用，三图分别6,866/24,249/59,253B，仅一次body，共 **90,368B**。未增加普通过程注册/正常请求候选输入。
- 三个画面FOV约2.2506637°/1.1253319°/0.5063993°；每档同帧来源为真实region/hash/已绘asset。新三档源RGBA逻辑驻留65,536→327,680→1,376,256B；这些不是整端物理峰或扩大缓存依据。
- 五个暖回完成帧均有本publication来源、null0、无新body，回到DETAIL原RGBA严格差0。双精度FOV差1.11e-16仍如实记录，并非原双精度值完全相等，也不修订历史strict失败。
- 实际公共来源route保完整署名/许可/政策/覆盖/修改；Back回原Sky实例、时刻/相机/图字节，最后退出Map，GPU纹理/Buffer、活动native图像句柄、源RGBA等效均0。软件owner读回不冒GC/driver物理结果。
- 已实际查看 `software-native-overview.png` 和 `software-native-detail.png`：概览小菱形照片、细档大矩形边界明显，不能充连续背景。新软件画面也保亮星彩色伪影；**该配置对连续背景/完整外围FAIL/不采用**，其独立区域/来源/恢复开发成功不洗掉这一失败。
- 仅以已有Prepared枚举/headers/标准bundle writer封存条件三图 **90,368B**，未重复制1741库存、跑TLS容器、生产部署或消费普通enum。事后读回 `output/prepared-m87-region-readback-1005-q1-r1/result.json` 确认原DETAIL字节、当前源epoch、实际body及来源、退休和普通Prepared枚举0图。条件导出可供以后新机制验证，但不是发布消费者全部通过或采用决定。

## 后续边界

这一匹配输入/最小处理/当前消费者决定已闭合，停止同配置下载、PSF和未改变输入的重加工。一般区域/完整外围仍FAILED；之后只在明确新成品/更完整实际覆盖或可复用可信几何/显示处理依据下重开Q1/Q2，不因免责声明、成功降级或银河图而关闭要求。

下一执行只由[PLAN顶部](../PLAN.md)控制。E2完整trusted current/rollback、支持客户端、Sky备份引用及全机容量是独立未闭合项，先取得真实引用输入，不按年龄或task输出清理。不重启现BFF/watch/IDE，不循环SDK；原生DevTools、Android/iOS、完整交互、月面、实际物理峰/200DAU和修后/最终独审仍未验，全部33项保留。没有提交推送、云部署、发布、采购或外联；Goal active、无预算。
