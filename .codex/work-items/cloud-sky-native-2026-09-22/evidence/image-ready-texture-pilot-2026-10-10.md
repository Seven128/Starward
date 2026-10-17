# 成品纹理有界试点与既有合格图接入

沿唯一 PLAN 的 C/D 执行，未改方案、未增加任务目录。四份新输入用完本次新增/替换额度；本记录是试点证据，采用仍归原 `PreparedOpticalImageryService`，库存不批准候选。全量 Goal、33 项、商业排除及原生/手机/独审义务保持。

## 来源和共用适配

固定 [Stellarium 官方版本](https://github.com/Stellarium/stellarium/tree/67a8dcef2fedf4f7943ff9443392b6bcb9916b21)，复用其 `textures.json` 四角、原 PNG 和 CREDITS 4.19/4.60/4.98/4.101。四张共 399,990B：NGC3293 512²、NGC3621 512²、NGC7009 256²、NGC2022 256²。各具体图的 ESO 或 ESA/Hubble/NASA credit 与 CC BY 4.0 明确；机构公共政策、完整署名/链接、修改说明与不暗示背书的要求保持。未取程序代码、DSS、Gaia 或被排除的银河图。权益核对保存在 `output/stellarium-ready-supply-2026-10-10-r1/source-rights-review.json`，取得/失败也在同目录。

`prepared_publisher_corners.py` 只适配这类声明的单幅完整小场四角：固定来源/版本/尺寸、J2000、完整 UV、角距≤1°；Astropy 拟合到既有 TAN，并核四角转换误差≤0.5 原像素。四份实际最大误差分别 0.075714/0.230818/0.009070/0.005074 原像素。它不证明内部畸变、科学绝对精度或其它来源适用性。文件无 AVM 几何，不伪装 AVM。

原 publisher 新增 `stellarium-corners` 和独立 `prepared-native-ready-texture-v1`，沿同一源几何、三 LOD、hash、manifest/服务/出口；完整原像素保留，只做必要 palette→RGB 和两粗档。四份最细档解码 RGB 零差；不运行 SXT/NXT/PS，不默认再加工。上游具体加工 UNKNOWN 如实进入公共来源说明。四目标不在当前精简 OpenNGC 表内，使用真实 REGION 身份，不制造目录对象。

相关验证：Python 四角适配 3 项、已有 full-source 3 项；TS 19 项及 contracts/workers 类型检查通过。App 用自身 TS 5.9.3 类型检查通过；根 TS 入口的 TS5101 配置版本差异保留，未改产品配置绕过。一次批量出版约 3.48s；不把它当完整生产工时或吞吐。

## 集中 Scene 结果

所有 Scene 均沿实际生产投影/GPU、现 BFF 报告、BSC/SAO、Mellinger 背景。390×844 CSS、DPR1/2、完整 footprint/细节、三 LOD；细节到真实最小竖 FOV 0.05°，没有为了通过临时收窄范围。阳光和目标方向来自真实时间/明确的合成测试观察点，未伪造太阳高度。每组 contact 与实际细图均已看审。

| 候选 | 软件 Scene 结论 | 接续 |
| --- | --- | --- |
| Stellarium NGC3293 `09a536fa…` | FAILED：明显照片矩形/星场边缘，最大尺度细节不足 | 换源/缺口，不对星团默认去星 |
| Stellarium NGC3621 `0374748e…` | FAILED：照片星场边缘与低分辨率明显 | 换源/缺口，保完整成员 |
| Stellarium NGC7009 `c9a6a51e…` | PASSED：夜间、五光照、两 DPR/LOD 无明显问题 | 既有 ESO 735×746 原图更清晰；不为计数采用同目标低清版 |
| Stellarium NGC2022 `f2e5f3b3…` | PASSED：夜间及五光照无明显矩形/跳变 | 适用位置/权益交付分别保留，不自动采用 |
| 既有 ESO378 背景版 `196a5e3f…` | 新标准 PASSED：补齐 DPR2/最大缩放及五光照，弱蓝壳/北红壳/恢复核心保留 | 没有新模型/像素处理；历史矩形 FAILED 保原，当前配准/交付另验 |
| 既有 ESO NGC7009 原图 `3afb1bcf…` | 当前代码 PASSED：19 帧当前 Scene；同条件 15 帧与旧输出 PNG/RGBA 完全相同 | 原图直用，无 SXT/NXT/PS/背景；已有昼暮 16 帧明确复用 |

结果在 `output/prepared-scene-batch-2026-10-09/` 下的 `stellarium-southern-r1`、`stellarium-saturn-r1`、两组 `*-illumination-r4`、`eso378-quality-v1-maxzoom-r1`、`eso378-quality-v1-illumination-r1`、`eso-ngc7009-current-boundary-r1`。原图与各光照条件逐帧精确 pins 归 result/decision，不在此复制。

两个纹理光照初次执行各保留 16 帧有效输出。夜间复用验证先后暴露 PNG 上下行方向、PowerShell ISO 时间归一化、BFF 非视觉 retrievedAt/context UUID 的 harness 问题；r1/r2/r3 失败不删。原 runner 现核精确像素方向、日期、渲染输入，并用原冻结报告重新生成和核对程序身份；r4 各复用 20 帧、零重绘后通过。不以任意删除字段跳过视觉输入校验。

ESO 原图当前 parsed production 闭包 114 文件中只有 native publication admission/provenance owner 改变；113 个渲染/投影/背景 owner 未变。当前 11 张 DPR1 和 4 张 DPR2 夜间 PNG/RGBA 完全复现，旧 16 张昼暮保历史身份复用，不声称新执行。依据 `ngc7009-current-compatibility-readback.json`；新 Scene/位置决定在 `output/eso-quality-v1-reassessment-2026-10-10-r1/ngc7009-current-scene-and-registration-decisions.json`。

## 适用位置与公共署名

NGC7009 新增独立 [NASA Hubble 1996 WFPC2 参考](https://science.nasa.gov/image-detail/hubbles-planetary-nebula-gallery-a-view-of-ngc-7009/)；与 ESO MUSE 2014 为不同观测。官方 JPEG 187,778B，SHA `f813c920a9ca1c04c6c1fa558528d2de174c926f57d3b86aa3264e213effe756`。原 XMP 保留；仅复用现 AVM parser 的空 Notes 容错。HST 按其固定 ICRS TAN 投到原 ESO 天区作诊断，未拟合/居中/改源像素。实际查看中心、壳、两端 ansae 的方向、尺度和位置，无明显全局偏移；据最大实际显示尺度作 **REGISTRATION PASSED（显示范围）**。科学精度仍 UNKNOWN，不把手工大致核心标记冒质心/误差测量。Hubble CDN 403 失败保留；NASA 替代是同一参考，非第五张供给候选。

`reference-check/` 保存该参考、固定 WCS 比较、原始 metadata/失败与范围。既有精确 OpenNGC pinned 全表的 NED 坐标只作两份 PN 中心检查，不从缺失的精简表伪造对象，不使用其 Gaia 字段，不据中心点重定位或宣称整场精度。Stellarium NGC7009 与 ESO 对照还显示其细节更弱，因此优先 ESO 原图。

四份新 manifest 已批量走实际 `PreparedOpticalImageryService`→SourceSummary→可见完成帧 credit 映射→实际 JSX 组件和来源动作；完整 credit、许可 URL、处理说明、上游 UNKNOWN、精确 REGION/hash 均保留，错版次拒绝、图像退休后不留 credit。`common-credit-readback.json` 是一组公共消费者检查，无逐图人工来源页校对。它是受控 JSX/状态证据，不冒当前原生 WXML/手机或公开权益交付。

ESO378-1 与 NGC2022 的独立显示位置复核也已通过。批量取得 [CDS 2MASS J](https://alasky.cds.unistra.fr/2MASS/J/properties) 两份有限 FITS 共 1,321,920B，沿固定 ICRS WCS 比较完整原图；ESO378 另看中心及四周五个 0.05°/844 CSS 等显示尺度裁片，NGC2022 的完整对照不小于产品最大图像显示尺度。实际星场/壳与亮结结构无明显全局偏移、翻转或尺度错误，均作 REGISTRATION PASSED（显示范围）。2MASS 谱段、分辨率和年代差异保留，不拟合、不重新居中、不改产品像素，不称科学绝对精度通过。原始数据沿 [IRSA 公共数据条款](https://irsa.ipac.caltech.edu/data_use_terms.html)，CDS HiPS 的 ODbL-1.0、DOI 与 2MASS/UMass/IPAC-Caltech/NASA/NSF 署名绑定在独立参考目录；这些是诊断参考，不是新增供给候选或产品资产。

固定参考、完整/最大尺度对照与回执在 `reference-check/2mass-fixed-batch-r1/`；两项资格决定为 `output/stellarium-ready-candidates-2026-10-10-r1/independent-display-registration-decisions.json`。它们与 NGC7009 原图共三个不同目标拥有文件、软件 Scene、显示定位通过证据。公共原生合成的当前 FAILED 和原因 UNKNOWN 见 [当前消费者](native-common-consumer-2026-10-10.md)，不升级权益交付或普通采用。

## 当前库存、成本和未闭项

唯一当前输入：`output/stellarium-ready-candidates-2026-10-10-r1/current-inventory-v4-input.json`，SHA `209398bfcf75d0ce7fba1df5024aa231379a536cc4deec5f50f855c6fe0f29d3`；读回 `output/eso-image-supply-current-inventory-2026-10-10-r13.json`，exceptions 空。17 候选版次、2 对象/10 区域、48 独立图；payload 去重 59,564,762B，当前普通 Prepared/可分发仍 0。图像和显示位置合格不能冒实际采用。既有 51 目标 W3、重叠 SDSS 等另归原图库，不被该增量统计覆盖。

Context 非质量段变更曾使整个可变文件的旧证据 pin 失效；用编辑前**相同字节/hash**快照重发 frozen-evidence receipt，原决定和 r10 join 失败保留；没有重签已经改变的证据。r11/r12 继续由原只读库存核，不建立第二采用表。

这批仅证明低分辨率成品对部分紧致 PN 可直接用，不能推广到所有星系/星团或宣称成熟图库免复核。新来源数量为 4，历史像素解锁单列；人工/Agent 与机器总成本未完整逐阶段计量，完整吞吐仍 UNKNOWN。失败、公共适配、参考获取和复核均属成本；无采购、许可外联、部署或发布。扩批尚待适用资格和采用链闭合；当前公共原生呈现/来源返回恢复、目标设备、全机容量及独立审查分别保留，不重复相同模型/marker/刷新假设。
