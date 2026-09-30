# C04 大气与适用地景：当前实现边界和下一步试验（2026-09-23）

**2026-09-28适用范围修正：** 下文现场DEM/站位/近物条件是特定现场注册方案的技术约束，不是用户对所有地景/大气模拟的前置要求。100m角差探针和模型局限继续保留，禁止伪称现场；不阻塞有合法来源、同相机/时间语义并经参考体验和目标验证的模拟环境。现行解释见[纠偏证据](evidence/experience-scope-correction-2026-09-28.md)，执行只看[PLAN](PLAN.md)。

这是任务内候选调查，不是完成证据。以下首段记录单次散射试验前的起点：当时 `sky-gpu-renderer.ts` 的 `solarLightFragment` 只用报告中真实太阳方向、高度生成暗适应晨昏提示；后来有界试验见文末。`spot-sky-page.tsx` 实际取 `Canvas type=webgl` / `getContext("webgl")`；候选必须在这个 WEAPP WebGL1 路径及现有 `skyRay`/ENU 相机、昼夜/红光模式、GPU失效恢复和资源预算下试验，不能只在桌面浏览器或 Three.js 场景跑通。

## 可复用模型

- [Preetham、Shirley、Smits 1999 原论文](https://doi.org/10.1145/311535.311545)是参数化日光天空模型。当前[Three.js 官方 Sky 文档](https://threejs.org/docs/pages/Sky.html)明确其 WebGL Sky 基于此类模型；[其实现源码](https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Sky.js)展示单层shader、Rayleigh/Mie参数，项目[MIT许可](https://github.com/mrdoob/three.js/blob/dev/LICENSE)允许改编与商业使用但须保存声明。此处仅确认算法/参考实现和条款候选，没有复制代码或新增 Three.js runtime。具体日落以下、曝光映射、星光遮盖及 WEAPP 性能未核；固定turbidity等若采用，只能明确为参考晴空参数，不能称当前点位天气。
- [Bruneton 官方预计算大气散射实现](https://github.com/ebruneton/precomputed_atmospheric_scattering)有 BSD 许可和测试，可作为更完整物理方案的参考。它使用预计算纹理/不同于当前简单全屏片元的资源路径；直接把原工程带入小程序会引入预计算、纹理格式/容量、WebGL1兼容与包体维护成本。当前不是已采用依赖。WebGL1受[规范](https://registry.khronos.org/webgl/specs/latest/1.0/)的 OpenGL ES 2.0 边界约束，不把 WebGL2 `texImage3D` 路径当现有可用能力。
- 下一步在不引入大依赖的前提下，用**固定太阳方向/报告帧、单层可逆 shader 试验**比较当前暗适应提示与模型在正午、日落、-6°/-12°/-18°、夜间的连续性和星点可读性；若使用上游实现，固定版本/许可证通知、量测小程序 shader 编译、真实像素、GPU帧时及红光分支。实际变更必须经过目标WebGL运行，不能凭官方浏览器示例宣布兼容。若模型不覆盖夜间/曙暮，仍需有界混合或更适合方案，不静默称完整大气。

## 地景/DEM

- 当前 `workers/miniapp-api/assets/terrain/publication.json`及 `data-pipelines/terrain/publish_copernicus_dem.py` 只发布大湾区中心85 km、1536² RGBA俯视 hillshade/色带，不发布任意地点的数值高程网格。`runtime-and-domain.md` 地形 owner 和产品Context相应章节也已移除 Map 的方向profile/遮挡角展示。**不能**从这张俯视PNG推天空遮挡，也不能在 Sky 中默默复活 Map 已撤销的方向分析。C04的适用地景仍需明确区域、可得数值高程、位置/海拔、方位profile/遮挡误差与缺失表示；纯几何地平线当前已独立成立。
- [Copernicus 数据空间产品页](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)仍写 GLO-30/90 免费许可及经改编后的来源通知；[GLO-30-F完整许可](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf)明确复制、分发、向公众传播和改编权，同时要求来源/改编/责任通知。[2026-07-17公告](https://dataspace.copernicus.eu/news/2026-7-17-copernicus-dem-30m-view-service-license-acceptance)从7月28日起收紧的是 CDSE **view service 的访问类别与注册要求**，不能将其直接等同于撤销已有GLO-30-F派生分发权；未来新数据获取路径仍须逐项核对其确切产品/实例和访问条件。此核对只证明既有选型的许可方向，不证明任意地点成本、覆盖或算法误差。

当前不采购、不部署、不触碰用户Android。C04仍缺完整大气及地景的可运行链路；范围决定不允许用旧ESA银河成品图或未核PS1/SkyMapper影像掩盖这些缺口。

## 2026-09-23 WebGL1 晴空散射试验结果

已在当前 `solarLightFragment` 中沿用同一报告太阳方向和 ENU 相机，将原暗适应方向提示替换为固定参数的 Rayleigh/Mie 单次散射近似、空气质量消光及太阳落地后至 -18° 的平滑衰减。未引入 Three.js runtime；固定参照版本 r146 的 MIT 声明在小程序源树及 WEAPP 构建资产中。页面资料说明固定晴空示意，不写成当前地点大气实测。

官方开发者工具同一示例点与手动45°视角，报告太阳高度依次 67.558°、3.441°、-3.493°、-10.416°、-17.311°、-37.561°；六张原始 WebGL 截图、同像素 RGB、权利通知 SHA 和检查详 `evidence/atmosphere-trial-2026-09-23.json`。12:00 蓝色晴空至19:30/21:00夜底渐变、夜间星场恢复，说明 shader 在当前开发者工具 WebGL1 路径实际编译绘制，尚不证明物理亮度或目标手机性能。特别是日落以下的混合和固定曝光是经验性显示映射；缺多次/光谱散射、地景、局部气象、朝太阳方向的系统视觉对照和 GPU 帧耗时，不能把 C04 标为完整交付。桌面 Canvas 仍遮住普通 WXML，手机合成另待验证。

## 2026-09-23 原始数值DEM地平线探针与准入边界

任务本地 `terrain-horizon-probe.py` 直接读取 Map 已有清单绑定的2021 GLO-30 WGS84 COG，仅作数值诊断，**不生成或发布Sky地景**，不改变Map撤销的方向滑块/profile界面。它核对实际所用N22E114、N22E115文件的字节数和SHA，取原30m级DSM像素、球面地理前向采样与地球曲率；从距点300m起每100m至50km，每1°方位一个采样射线，不做大气折射。示例地点22.4826799N、114.5557147E来自显式MEMORY_TEST夹具，不是已测量的实际观测位置。

这条夹具射线中354/360个方位在所取距离序列均有有效DEM样本，6个方位至少缺一个样本；缺测不作平地。DSM给夹具点海拔约199.865m，北0°已知最高夹角6.047°（4.4km），西270°为1.357°（5.3km），344°为7.807°（4.7km）；90°/135°/180°约-0.454°是模型几何值，不代表无近处障碍。将输入点约移动100m，DEM取到的观察者高程变为144.542–178.560m，0°方位最大已知角从6.047°变化至6.71–10.57°，全部360方位中的最大差达到4.713°。这里没有真值、位置误差模型或角误差界，不能把其中一条线当作现场遮挡。

当前`SpotSummary`仅有WGS84/GCJ02点和可空`altitudeM`，没有观测位置水平精度、海拔实测来源/精度或站位语义；这份夹具的`altitudeM`为空。天文计算的`altitudeM ?? 0`是位置输入缺省，不是足以给地景用的实测观察者高度。只有当前Spot/提案上下文能够证明实际站位与高度并经适用地形覆盖、近场与误差核查后，才可把DEM地平线接入Sky；否则保持几何地平线、地景未知，不应加一个看似精准的伪剪影。C04仍需真正数据/上下文/原生绘制链。原始五个360方位JSON在`evidence/terrain-horizon-probe-*-2026-09-23.json`（中心文件省略位置后缀）；Python语法检查退出0。

## 2026-09-23 深色画布后的近太阳复核

上文“18:00 低空偏亮”描述的是加入普通模式深色上限之前的画面，不能当成当前版本视觉结果。新以同一显式测试点、2026-09-22 当地18:00、太阳方位268.821°/高度3.441°，在正式WEAPP开发者工具用现有手动相机10次真实Canvas拖动对准太阳（模型中心268.470°/3.565°，角差0.372°）。当前427×920原生截图中太阳盘仍可见，水平几何地平线上方的近太阳天空为深蓝，近太阳(220,400) RGB(39,57,80)、低空(220,490) RGB(43,63,84)，旧浅黄大面积过亮未重现。原图SHA、手势计算、输入及限制在`evidence/atmosphere-dark-near-sun-2026-09-23.json`。旧图相机带roll，不能做逐像素前后对照；该单帧只确认当前深色观测图输出，不证明物理大气、真实地景、手机颜色或性能。C04仍开放。

## 2026-09-24 B3 现行责任复核

现行 `sky-scene-render.ts` 仅在普通/夜间模式且有与报告帧匹配的太阳几何时调用 `solarLight`；`sky-gpu-renderer.ts` 对输入与 WebGL 故障有平色天空回退，页面显示图层故障并提供重试。重试经 `sky-canvas-lifecycle.resize()` 释放旧 renderer、重建原生上下文；不能把单次重绘误判为已清除 shader 的实例级失败锁。无姿态/手动视角时根本不提交场景；报告缺太阳字段时也不应凭相邻时刻制造光照。

这一实现仍是固定晴空 Rayleigh/Mie 单次散射近似，加经验性暮光衰减、曝光和深色上限；页面已说明不代表当地透明度、天气或肉眼可见性。代码没有当地点位的大气气溶胶、云、可见度或多次散射输入，也没有地景近物/遮挡。原有桌面 WebGL1 截图只支持当前示意链，不证明用户所要求的完整适用大气与目标手机像素/帧耗时。B3 后续要先把“观星图可读的固定晴空示意”与“现场大气/天气”对照到原始 C04，确定可从现有公开合规数据/算法实际交付的细节和目标证据，再决定是否需扩 shader；不能仅因当前效果可看就结案。

P2 地景依赖未变：必须先有可证明的观测站位/水平精度、海拔来源/误差、对应数值 DEM 覆盖与近场遗漏/角误差边界，才可把具体山脊注册到同一相机。当前 Spot 的点和可空高度、Map 俯视 PNG 与夹具 100m 位移最多 4.713° 角差不足以成立。没有这些输入时保留几何地平线、明确未知；不能用失败回退冒充真实地景交付。

2026-09-25 再核相关消费者：`SpotSiteData` 的设施、媒体与证据字段不含观测站位；Map 的 `requestOneShotLocation` 是用户当前位置居中通道，当前还会丢弃平台返回的 `accuracy`，不能替代策划地点的实测站位。贡献提案的 WGS84 定位也尚无经审核的站位精度与海拔来源合同。故 P2 缺的是地点实体及其测量语义，不是把一次手机定位读数接到 DEM 就能解决；本轮不凭这些字段生成地景。
