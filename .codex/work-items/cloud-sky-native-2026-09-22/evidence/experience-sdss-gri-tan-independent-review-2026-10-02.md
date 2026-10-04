# SDSS 单字段科学帧与同主图彩色层级独立审查（2026-10-02）

审查者 `sphere_review` 独立于两个实现 owner。本轮只审 PLAN 第 2 项的一条实际小路径：M51 中心 CAS 返回 `301/3699/6/100` 的 g/r/i corrected frames、离线北向 TAN science/RGB 主图、三档 crop 与两种 task-only RGBA 方案。没有改生产、旧资产、PLAN/Context、服务、IDE、候选发布或手机，没有增加下载。本轮发现两处 source 准入错误并验证修复；这条有限实证可继续复用，**不能据此采用新画质/显示方案、宣称全视场、精确 polynomial 配准或原生体验通过**。

## 真实输入与两处已修发现

读取了实际 CAS request/response/receipt、三文件 acquisition、原 SDSS JPEG 清单、此前商业与科学帧研究、旧 18 星 CSV 和原配准证据，以及当前 source/science/display owners、Astropy 8.0.1 的 Lupton 实现和 task 脚本。只有一次中心字段、三个真实 SAS payload；CAS 中心命中不代表整幅方形视场覆盖。

初代 reader ready SHA `49bbe5815cfd33cace73685b59d579a0bea002a62447505aff405b9a4fa10189` 存在两处客观缺口，实际原数据正确也不能掩盖准入规则的错误：

| 发现 | 独立实际反例 | 修前 | 修后 |
| --- | --- | --- | --- |
| 非 ICRS 帧被当 ICRS 重投影 | 真实 g 原 payload 在内存改 `RADECSYS=FK4/EQUINOX=1950`，或 `RADESYS=FK5/EQUINOX=2000`，保原科学数组/asTrans 身份、重新压缩并绑定实际新 bytes/SHA | 返回结构接受，actual WCS 分别为 FK4/FK5；gri 将 ICRS ra/dec 裸传 source WCS | reader 拒绝 `sdss_frame_reference_frame_unsupported`；reproject 同样守 source/target ICRS |
| 来源 URL 与实际 identity 不一致 | 原 g bytes/SHA/identity 不变；sourceUrl 分别为空、第三方地址、官方路径 rerun302 而实际301 | 接受并照抄到 receipt | `sdss_frame_source_url_identity_mismatch` |

保存了真实修前源码 [before snapshot](experience-sdss-corrected-reader-before-2026-10-02.py.txt) 和 [五项实际修前输出](experience-sdss-corrected-reader-independent-before-2026-10-02.json)，不是事后猜测旧行为。当前独立检查重新生成相同两个 synthetic boundary payload（hash 相同），并复查另三项 metadata 反例，全部从真实 before 接受转为 after 拒绝。合成测试 payload 明确是内存边界反例，未冒称 SDSS 获取的新科学输入、未覆盖任何原文件。

修后 reader SHA `66eed21091c6d4c80d35c79d8bbb28467ba65ef90740342c727c13bbd812d17e` 要求精确 HTTPS 官方 DR17 SAS identity URL；CLI source-url 必填。此规则只核 acquisition receipt 提供的 URL 与 identity 一致，**URL 字面匹配不证明网络起源或独立许可**。当前三条实际官方获取记录仍为 provenance 的基础。

## 科学数组、单位和元数据实际读回

独立核 r2 source/script/tests/acquisition/report bindings、压缩源前后/current hash，并解压读取每个真实 FITS 的四 HDU。压缩共 9,134,078 bytes；每带解压 12,447,360 bytes、科学阵列 1489×2048 float32。三个 actual primary 数组与生产 reader 返回数据逐值全等，未二次乘 NMGY、未再次减 ALLSKY。

| band | actual BUNIT | 已应用 NMGY | 原 primary FRAME | actual asTrans FIELD | finite / zero / negative |
| --- | --- | --- | --- | --- | --- |
| g | nanomaggy | 0.00364695 | 108 | 100 | 3049472 / 0 / 725941 |
| r | nanomaggy | 0.00502803 | 100 | 100 | 3049472 / 1 / 733494 |
| i | nanomaggy | 0.00628516 | 102 | 100 | 3049472 / 2 / 764866 |

不能把原 CCD FRAME 当字段号；实际 field 身份由完整 asTrans 的 RUN/RERUN/CAMCOL/FILTER/FIELD 核验。原 primary/asTrans header cards SHA 与 receipt 一致；actual asTrans 全 31 列的 row 值逐一与报告相符。原卡片中的 RADECSYS/观测时间以及 Astropy fixes/warnings 保留。完整 polynomial/DCR 参数是保存了、尚未施用，不能因 metadata 能读或 TAN roundtrip 有限便称绝对配准通过。

三个原数组当前全 finite，保留真实 zero/negative；这不证明 artifact-free、fpM、noise/PSF、confidence 或完整目标 footprint。reader/source validity 和整场科学质量都仍 UNKNOWN。

## 主图、重采样和三档输出

实际 candidate 位于 `output/sdss-gri-tan-candidate-1002/`。读取 source/science owner、报告、完整 `.npy` sidecars 和六张 PNG；独立核 34 个实际绑定项，旧 **201** 个资产 before/after/current 路径/bytes/SHA 全相同。没有改旧默认 JPEG 或 v1 contract。

- gri owner SHA：`330fcdea3d61b488f6138038d1f1f576eab212a351379a220411244775b95848`。
- candidate JSON SHA：`86596c0d7e4fa0709ec516ae96a37e07b2d41fd981dc46488ca57bdf48d315e4`；binding SHA：`344cb3392d104ed65dca2a77e723b249f2eba83fa098d2a798a6aac5286a3c02`。
- 同一 2048² 北向 TAN 中心主图，FITS CRPIX=(1024.5,1024.5)，图像行对应 target FITS y 的反序。按实际 rotated source CD 做 world→source pixel，四邻必须都在 frame 且 finite；未知/缺邻保 NaN，geometry footprint 和非有限邻点另存。
- 从实际 primary 科学值独立计算三带各 147 个分布点的 bilinear 值/footprint，与已存 science 值最大差 **0**。另外零值、负值、非有限邻点和越界的小反例保零/负测量，后两者为不可用，未成为零通量。
- 三带 joint 可用 2,031,591 / 4,194,304 = **48.4369%**；master/full-target=false。MEDIUM crop **83.3647%**，DETAIL 的小 crop 100%。后者不证明 overview 或目标全范围完成。
- Lupton i/r/g、vmin0、stretch5、Q8 只在共同 science master 上做一次。实读成熟 Astropy 实现：这里固定 vmin，Lupton 不用每带 vmax 独立伸缩；三档不重新拉伸。该默认曝光/颜色仍是未采用的试验。
- 三档从同一 master crop2048/1024/512，premultiplied integer box 到512²。独立实现 box 对六张 RGBA 的**全部像素**全等；实际 crop 中心/角/内部点 WCS 与 master 对应点之差 <1e-10°。MEDIUM/DETAIL 场幅通过 TAN 的 atan 计算，分别0.11377788994540003°和0.056888958993683895°，不能简单将主图 field 除2/4作精确几何。
- 第一方案 alpha 为联合可用 master 样本面积比例，不是 HIPS binary finite mask。第二方案在 master 一次做 encoded RGB contribution 分解，再 premultiplied box；在 byte round 后重合成黑底与 RGB master 全等。有效纯黑在科学 sidecar 仍可用，第二方案 display alpha0 仅代表没有当前编码显示贡献。两方案都不测科学覆盖、线性 radiance 或坏像素，也都未采用。

## 18 星和实际共位的有限证据

沿用原 cached CSV SHA `b969c967184c1d41bfd1dce2db88f9254ded939c53daaf8c3828e9e04b5455d0`，没有拟合 offset 或修改 CRPIX。18 星实际 source stencil 内 g6/r5/i5，共同5；master/overview5，MEDIUM/DETAIL **0**。报告中的此数只是预测/availability，并不是18颗实际峰点全部匹配。

共同只有一颗 r<20 亮星 `1237661362908626965`。独立在各 raw frame 和已存 master 对预测位置取未拟合局部重心（背景环7..10px、正权重半径4.5px），当前 master 预测(483.9978588,1654.2803926)，g/r/i 实际重心分别约(483.9330,1654.1946)、(484.0039,1654.3861)、(484.0854,1654.3797)。三带在这一点局部共位，但只有一亮星、非 held-out，不能作为全图/各档/绝对或完整 polynomial 精度证明。反例省去 y 反序时，预测落到对应错误行392.7196，此处三带实际 science 都不可用；当前方向核查有真实信号，不能由空数据也通过。

## 原图和真实 software GPU 组合

独立观看全部六张候选 PNG、旧 M51 DETAIL JPEG，以及同场完整 GPU `day-overview-legacy/signal-over` 和 `night-medium-legacy/signal-over`。availability 原图的上侧斜切口明显，overview 缺伴星系，默认新 RGB 更暗偏棕；原 JPEG 更亮且处理不同。直视 contribution PNG 的 straight RGB 并不等于最终混合像素，应以其 alpha 和实际背景组合判断。实际 day signal 减轻原黑色矩形的呈现，但剩余斜切边/缺失和色彩问题清楚，**不能称矩形全面修复或整体图质改善**。新增信号方案未被采用。

实际软件 GPU 代次 `output/playwright/cloud-sky-sdss-corrected-candidate-1002-r1/result.json` SHA `e784cc33e12dc3f24535565701189d371f70335cb1f5257d87158070c450dba9`，reported bundle SHA `f2e7c4eb07059a48961015578bd9cf0267b4602b17e02c792497f48b85a06087`。独立核84个 production-source hash、全部92个 PNG/fullRGBA artifact hash 与 harness/inputs；36组真实 RGBA 的 changed/darkened/maxDelta 全部另算一致，46场 GL error 与结束 texture/logical counters 为0。差异是背景 counterfactual 指标，不是亮度物理测量或画质通过。

该脚本显式在已解码图像层注入 task-only candidate，旁路正式 v1 validation/download/loader/source UI，并改 artwork blend 做候选对比。baseline suppression 返回 true，所以 sceneReportedPaintedImage 仍会存在；实际 trace 中 suppressed=true 且无 optical upload，这个 marker **不是实际来源贡献证据**。renderer 静态图逻辑资源/释放成功也不代表 native/OS/GPU 峰值、解码生命期或真实客户端旅程。没有将试验接成正式产品、选项或权限后门。

## 资源权衡与未完成范围

实际三档 availability PNG 为 **802,353B**，contribution PNG 为 **1,529,742B**；旧三档 JPEG **64,352B**，分别约12.47×/23.77×。这两个 family 是互斥、未采用候选，不能把六图总和当已部署用户传输。都512²可比较逻辑纹理尺寸，却不证明 PNG native decode 峰值/耗时相同。原9.13MB compressed FITS 是离线输入，未给客户端下载；服务容量、200 DAU、月流量/峰值带宽和总资源没有因此被验证。新出版前仍需基于实际画质/alpha/压缩/粗细组合优化字节，不以试验输出作为固定预算。

后续真实依赖：完整目标所需最小邻字段与 footprint/mosaic、完整 astrometry/DCR 的适用与独立核、artifact/PSF/背景/颜色/真分辨率、跨档外围及实际昼暮组合质量；之后才是新 contract/旧 offer 兼容、source attribution、真实 loader/cache/scene integration、总体成本/资源与目标平台验收。M82 旧缺源和其它光学源问题未由 M51 小路径关闭。Goal 仍未完成。

本轮只读独立脚本 [checks.py](experience-sdss-gri-tan-independent-checks-2026-10-02.py) 以 exclusive 路径保存 [checks.json](experience-sdss-gri-tan-independent-checks-2026-10-02.json)，该 JSON SHA `bce391713445780415754c940b4cd2d24e85a52ca703cceefe38d3e2ebc2b5a9`。保留实际 before/after、当前 source/output 绑定、原数组语义、全像素与世界坐标、亮星有限共位和 GPU counterfactual读回；没有改其它 owner 的文件。现有结果不可覆盖，若相关输入改变需选新代次路径再运行。
