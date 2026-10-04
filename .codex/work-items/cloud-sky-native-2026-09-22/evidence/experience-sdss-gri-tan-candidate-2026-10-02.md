# SDSS 单 field gri → 同 master TAN：真实离线 candidate（2026-10-02）

唯一 PLAN 第 2 步的最小真实输入路径。新增 `data-pipelines/deep-sky/sdss_gri_tan.py` 及其行为回归；这是离线可复用 owner，不是已出版产品。旧 SDSS/AllWISE 文件、原 hash/offers、contracts、BFF、Mini runtime、README、PLAN、Context 均未由本子任务修改；没有下载、依赖安装、IDE 或远端操作。共享 source reader 由 `sdss_corrected_frame.py` 独立负责。本报告不把数据取得、结构检查、软件显示或测试数量当最终质量/目标验收。

## 实际输入与采用的最小工具

调用 root 已实取的 `output/sdss-corrected-m51-1002/frame-acquisition.json` 与 sources 内三帧：DR17 rerun301/run3699/camcol6/field100，实际 compressed **9,134,078 B**。g/r/i 的真实 header/asTrans、科学数组/校准完整性与原字节由 reader r2 重核；使用稳定 reader SHA-256 `66eed21091c6d4c80d35c79d8bbb28467ba65ef90740342c727c13bbd812d17e`。完整来源准入另见 `sdss-corrected-frame-2026-10-02-r2/`；此前 reference-frame 漏检的旧 reader 代次不冒称当前准入。

来源 primary 1489×2048 float32 已是 nanomaggies/pixel、已应用 NMGY 且已扣 sky；没有再次校准或扣背景。source adapter 保留完整 asTrans，但此 trial 只应用 primary 的旋转 CD/TAN **线性近似**，不宣称 polynomial/DCR 解已应用或绝对配准已验。

本机已缓存 Astropy 8.0.1、NumPy 和 Pillow 可用；同解释器 `importlib.util.find_spec('reproject')` 实测 false，没有安装新 reproject 依赖。选用 Astropy 真 WCS 变换及按128行有界 NumPy bilinear，职责仅单 field；未实现通用 mosaic/新框架。所有4邻源样本必须在实际 frame stencil 内且 finite，包括整数位置零权重的邻点；有限0/负数保留，不跨孔洞补值。ICRS输入前提在 reader 和 TAN入口分别守住。

## 当前真实产物入口

机器读入口 `output/sdss-gri-tan-candidate-1002/candidate.json`，SHA-256 **`86596c0d7e4fa0709ec516ae96a37e07b2d41fd981dc46488ca57bdf48d315e4`**；其中 `harnessInput` 有 root 后续 task-only composition 所需 reference/orientation/center 和各档 file/bytes/SHA/pixels/fieldDegrees/CRPIX，以及 alternative displayContribution 身份。直接读取这个 candidate，不调用既有 v1 JPEG manifest validator 冒充兼容。

`binding.json` SHA-256 **`344cb3392d104ed65dca2a77e723b249f2eba83fa098d2a798a6aac5286a3c02`**，绑定 source/reader/quality/test/script、真实 acquisition/current M51 manifest/catalog/raw、cached Lupton源码及实际输出。包括既有201 deep-sky assets before/after，所有字节/哈希完全不变。candidate、quality、星坐标及科学数组保持各自身份；后续其它软件场景不能追溯改变本代输出。

2048²目标中心取现 OpenNGC/M51 manifest，north-up/east-left ICRS TAN，CRPIX=(1024.5,1024.5)，全 field=.22755555555555557°；实际 step=0.00011111125716279°，CDELT=(-step,+step)。目标零基 FITS y 用 `2047-imageRow`，源仍按真实 FITS rows/WCS。每波段 float master、几何 footprint、finite-neighbor mask，以及 joint availability、RGB master、alternative display master 各存独立 no-pickle NPY、dtype/shape/bytes/SHA。out-of-frame array NaN 有独立几何状态，不能被标为天文 nonfinite 缺测。

仅算一次 Astropy `make_lupton_rgb(i,r,g, ManualInterval(vmin=0), stretch=5, Q=8)`：这是官方实现的固定默认参数试验，不做每档 percentile，也不承诺已采用的色彩/曝光质量。原 science arrays/负数不因显示 clip 改写。display 字节和 science validity 分开；后者仍 UNKNOWN。

| 档位 | master crop（右/下界排除）→512 | 精确 TAN field ° | availability PNG B | alternative PNG B |
| --- | --- | ---: | ---: | ---: |
| OVERVIEW | [0,0,2048,2048]，box4 | .2275555555555556 | 141,738 | 391,091 |
| MEDIUM | [512,512,1536,1536]，box2 | .11377788994540003 | 292,519 | 576,353 |
| DETAIL | [768,768,1280,1280]，box1 | .056888958993683895 | 368,096 | 562,298 |

各档 CRPIX=256.5，field 从 master tangent scale/crop 算出，非直接用角度除2/4近似。同一 RGB master 裁切后，按 availability/premultiplied 权重有界整数 box 降采样，避免未取得的黑/彩像素污染有效颜色。未观测范围不填新结构；bilinear 不是 flux-conserving 光度算法。6PNG合计 **2,332,095 B**，其中 availability三图802,353B、alternative三图1,529,742B；这是未出版候选体积，不是单DAU、包体、云出口或性能结论。含未压缩科学sidecars/报告的本地generation总量绑定为111,682,874B（不含binding自身）。

现有 `image_quality.inspect_image` 对6PNG作真实 bytes/hash/完整decode/尺寸/TAN/目录/diagnostics，全部仍 `STRUCTURE_ACCEPTED_QUALITY_UNVERIFIED`，见 `candidate-quality.json`。没有传假 `NONFINITE_HIPS_SAMPLES`、没有用 PNG alpha 冒认已核 science finite mask。

## 完整 acquisition 的实际 footprint 不足

真实 source 数组每波段都完整且 finite，不代表完整目标 field；本代实际统计：

| 范围 | joint available / 总master样本 | 比例 | full范围成立 |
| --- | ---: | ---: | --- |
| 2048 master / overview crop | 2,031,591 / 4,194,304 | 48.4369% | false |
| medium crop | 874,142 / 1,048,576 | 83.3647% | false |
| detail crop | 262,144 / 262,144 | 100% | 仅这个更小field成立 |

单波段 footprint g/r/i 分别2,050,753/2,048,948/2,047,007；in-footprint 非finite邻点本次均0，out-of-field仍独立保留。重投影后的有限负值 g/r/i 分别236,697/224,673/249,860，继续是实测样本。没有因亮度生成 science mask。

实际打开 overview 与 detail PNG：overview 的倾斜北边界明显截掉星系外围，完整伴星系/外围不成立；detail 展示核心和局部旋臂，其较小field的100%不能顶替完整目标。单 field 原生 seeing/源尺度、默认Lupton暖色/动态范围、饱和/细节和整场色彩都待验证，不能以 PNG 更大或源非JPEG宣布高清完整修复。后续范围需真实相邻输入/有依据拼接或明确保现有完整独立产品，不扩大taper剪外围，也不填空/AI补细节。

下一数据依赖应先把整个目标 TAN 边界及实际缺口映射到 SDSS field footprint，再查实际相交的 field/primary 身份，不猜 `field100±1` 就覆盖北边界（可能需跨camcol或重叠run）。将完整gri输入集合明确成计划，复用已取得3帧，每个新增必要文件有界取得一次，仍由shared reader准入。足够真实输入成立后才扩本owner的明确 overlap/mosaic规则，保每band有效来源/边界/缺样及全局一次transfer，并在新generation检查完整范围、星点共位、接缝和色彩；当前generation不重调RGB/覆盖写入。未核asTrans的精确配准也继续保留，不能用当前唯一亮星offset拟合替代。

## 显示背景替代产品只作比较

availability三档 alpha 仅为 joint可用样本面积比例；有效黑仍可为opaque。另由同一个RGB master一次计算 alternative：`a=max(encoded RGB)/255 × jointAvailability`，`straightRGB=encoded RGB/max(encoded RGB)`，然后按同一 crop/premult box生成三级。实际8bit master通道重构误差 **0 bytes**；各档额外量化/背景混合须由真实GPU组合核对。

这只是当前显示编码下的贡献分解，**不称物理线性radiance**，不把 `a=0` 称科学缺测，不二次扣sky或猜噪声阈值。alternative中的有限纯黑alpha0仍能在独立science sidecars查到available。source-over、additive和这个显示分解的整場比较由root后续task脚本负责，当前未采用生产方案、未宣称无矩形/正确外围或quality PASS。

## 验证与实际证据范围

`experience-sdss-gri-tan-tests-2026-10-02.txt` 记录8项有效行为回归通过：异band原点的同一天球星WCS共位（直接索引stack反例超过3px）、north/top/偶数中心、4邻缺样不填0并保有限0/负、同master各档颜色与世界crop映射、premult不混不可用彩色邻点/有效黑、一次display贡献重构，以及缺band、跨field和非ICRS拒绝。这些合成边界回归不冒充真实 source 输出。

`experience-sdss-gri-tan-render-2026-10-02.txt` 另记录完整实际 reader→2048三band重投影→一次RGB→两套三级/sidecars/质量报告，用时6.454秒；是本机离线路径，不是客户端帧时或4GB测试服/16GB容量。

旧已实取 SDSS PhotoPrimary CSV18坐标（原SHA `b969c967184c1d41bfd1dce2db88f9254ded939c53daaf8c3828e9e04b5455d0`）读取后仅作 actual raw/target WCS位置与取样资格，写 `catalog-star-projections.json` SHA **`6e7c5e31cec97187a94cde31e6bb33ffe625620b8f7724fc048f1c84310aa0e8`**。真实source g6/r5/i5，共同5；master/overview5、medium/detail0。共同星中仅1颗r<20，不能说18星全部配准已验，未拟合/回写offset。独立峰值/颜色/WCS与实际输出审查正在由 `/root/sphere_review` 进行；其完成前不写独立审查通过。精确全polynomial、科学有效性、展示质量/完整范围、普通新schema consumer、native/phone、性能/费用和完整体验均保持开放。
