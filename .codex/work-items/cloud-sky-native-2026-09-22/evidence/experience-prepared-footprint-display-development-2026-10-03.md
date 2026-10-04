# Prepared RGB 共同源边界与显示候选

本代按唯一 PLAN 处理实际 overview 的照片矩形/背景接缝。仅复用本地已准入的 heic0506a 母图、三 PNG 与原名义 AVM，不重下载、解码原 JPEG、重投影或改变出版。这里只证明有界显示机制；未采用最终画质配方，未进入普通 page/default registry，未认证 native、真实天文精度或容量。

原观测照片 credit：**NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)**；[原照片与来源](https://esahubble.org/images/heic0506a/)、[来源许可说明](https://esahubble.org/copyright/)、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。原 metadata 链仍是 https://www.spacetelescope.org/images/heic0506a/ 。下述图为历史 encoded RGB 的显示实验，保留原 B/V/Halpha+[NII]/I 合成含义和约 5 arcsec 的发布者提示，不声称自然肉眼色、实时或校准 gri。

## 名义源/母图几何与 CPU 比较

脚本 [experience-prepared-footprint-display-2026-10-03.py](../scripts/experience-prepared-footprint-display-2026-10-03.py)，9282B SHA `02b543d09071ef2c38cf46f9e6b9a1d610c751d2b9c70ad39db34340dfadafc0`；[result](../../../../output/prepared-footprint-display-1003-r1/result.json)，3577B SHA `95f72b83ace5de05346f09a7e0414b3e8157f55f5593653d859f6468c6d77d83`。实际 Python 3.12.14 / Astropy 8.0.1；20 个选择输入前后精确一致，含六个保护文件、NPY 母图及三 PNG。

原数值 CRPIX/CDELT/CROTA/TAN 转为齐次 ray→source/mother UV，不把四点局部拟合当全场配准。全部 2048² 母图中心与原数值 WCS 比较，source residual ≤1.32434e-9 px、mother ≤4.9920e-10 px；1,425,463 个 opaque master 中心无原源 footprint 外部点。只属同一名义模型的代数读回，不提高原 AVM 实际精度，也不证明连续面积或 GPU 浮点误差。

比较复用既有 W3 `smoothstep(0,1,encoded luma)` 及归一化 8% 窗口，窗口统一在**原完整源照片和共同 TAN 母图**，避免每个 LOD 内框自行淡出。RGB、alpha、science UNKNOWN、出版和 fine-before-coarse 资格均未更改。[CPU 比较图](../../../../output/prepared-footprint-display-1003-r1/display-comparison.png)，SHA `61fcd140102ffcc3b631d23bc5a4a0f6b14721ca2d14a657d91903ab8467395c`；背景固定为 `[3,7,16]`，非实际整场。

CPU 公式为 `sourceRGB * weight + background * (1 - max(sourceRGB) * weight)`，另乘原 area-alpha 仅作预览。Root 已实际查看图：边框/矩形减轻，但弱外围结构明显压低；overview/medium/detail 的亮度权重中位数约 0.08823/0.12152/0.38835。因此当前曲线不能自动成为最终画质要求；降低背景并不证明结构、颜色/PSF、科学 coverage 或全对象质量完成。

## 实际 Scene/software GPU R1 的错误与 R2 修正

任务级 [display candidate driver](../scripts/experience-prepared-display-candidate-2026-10-03.mjs)只通过 esbuild onLoad 改写解析时的一个 `sky-artwork-level-composition.ts` buffer；生产文件未改。固定 report 的 `equatorialToEnu=identity` 与固定出版绑定，不适用于任意地点/时刻真实旋转。保留原 alpha 四邻资格、valid black 和 fine-before-coarse；未加辅助观测预算，因此六帧 optical completion 都为 null。

[R1 result](../../../../output/playwright/cloud-sky-prepared-display-candidate-1003-r1/result.json)，7194B SHA `9ac6cdf072d245fb4c9c3d3f7feab0ea522f38d97e6424a9ef96aa1736a1e59a`，是当时机制执行结果；**预期共同 RGB gain 语义 FAILED**。R1 只把 `contribution` 改为 `max(rgb)*weight`，随后仍用同一个 weighted contribution 归一化 straight RGB。未钳位时权重抵消，RGBA8 前通道钳位时失色/趋灰，不能与 CPU 图混作相同配方。Root/独审均实际看到了灰白偏移。保留其原 executed-script/transformed buffer、结果及六帧，不回写为通过。

R2 分离 `sourceContribution=max(rgb)` 与 `contribution=sourceContribution*weight`；straight 只除前者，最终 alpha 使用后者。脚本17393B SHA `ccba8539d42e3a841d561ca08a5e2038e806813314400384b5de14259dc21a62`；实际 transformed buffer9439B SHA `7c1b3295e7237a802abedb593c638ba13f55446bfe5f6f67e630061167b8ca38`；实际 bundle2085325B SHA `df7e30238d503ff94649c4fac4d130fefbb2b8983b71f7725ae886608392ea53`。原生产 composition 仍8298B SHA `7bf3b8d776597f69488dc7d218eaf64930928f8a4975295eb85495aa9e41fd86`。

[R2 result](../../../../output/playwright/cloud-sky-prepared-display-candidate-1003-r2/result.json)，7194B SHA `69e50917b0a555cf508f426dfd9a7fb1d7add7964eb6bd20817c87678ab000f7`，实际工具执行 exit0。97 个实际 parser buffers、16 个选择 host/tool/data 输入前后精确一致；三 PNG 实际浏览器 decode，六个固定场景 GL error0、done1、tracked texture objects 最后0。overview/medium/detail 相对背景实际 RGB delta 分别61242/243501/308528像素；retired fine 与独立 medium-only 全 RGBA 相同，wrong family 与背景全 RGBA 相同。

Root 已实际查看 [R2 overview](../../../../output/playwright/cloud-sky-prepared-display-candidate-1003-r2/overview.png) 和 [旋转 detail](../../../../output/playwright/cloud-sky-prepared-display-candidate-1003-r2/detail-parent-rotated.png)：红色结区/蓝色旋臂恢复，矩形减轻；弱外围衰减继续存在。纹理 handle 的 create/delete 不证明 FBO/buffer/program、native/GC 或客户端总内存。catalog UNAVAILABLE 的固定场景不替代正常满场与互动/来源组合。

[固定候选独审](experience-prepared-footprint-display-independent-review-2026-10-03.md)，9036B SHA `f046b92a918eb953c86e508aa56f261ab563284710adc766f270b44f56292f29`；最终 [result](../../../../output/prepared-footprint-display-independent-1003-r3/result.json)，18853B SHA `ef61f193fd052385cc104e506f7faacf43785fb4b9cfc8d19d3978801ab0913d`，保原失败候选与 reader 首代过度断言。Root 已全文读 note、结构/公式/像素/资源控制，实际重哈希 215 个 final.currentInputs 均精确，工具 `80808b`；另读 215 pre/post、实际四 DETAIL 公式样本与174952像素细档作用。这里只收口 R2 固定任务公式；8%/tone/default、弱外围及完整质量未采用。

## 共享几何 owner 与真实报告 uniform 消费

新增 [sky-prepared-optical-footprint.ts](../../../../apps/wechat-miniapp/src/features/sky/sky-prepared-optical-footprint.ts)，5967B SHA `d8fb21fd7521e9ac5a81e8576d73f6cb70113d16a44dfcd60e304b0951fe6036`，复用 exact target identity、共同 `registerSkyArtworkPlane` 与 admitted OVERVIEW TAN。源中心用原 nominal AVM，不借母图中心；原 FITS 一基 CRPIX/CDELT/CROTA、y-up→decoded top-first、首末 pixel-center 约定明确。先旋转 raw affine 点再求实际有限 report 逆，不逐角单位化，不把 ICRS 逆 rows 当 ENU。冻结 reference/hash/at/rotation 与两个三行齐次坐标；正分支及非有限/退化异常保不可用。owner 不含 brightness/feather/alpha、不改 availability 或科学精度。

[测试](../../../../apps/wechat-miniapp/src/features/sky/sky-prepared-optical-footprint.test.ts)，8441B SHA `04440e8a685b27c781debd3a6bebf257997ebcf9122763a78f5a6dfe8b672e41`；[portable fixture](../../../../apps/wechat-miniapp/src/features/sky/sky-prepared-optical-footprint.fixture.json)，13349B SHA `b79dad2fc1642ee4a1443b479d2ad38524d3e4f09c1ef33a57aa74a705811a92`，只拷已有完整出版/独核 nominal rows/原 Astropy 27 landmarks，未重算影像或原完整网格。

[registration driver](../scripts/experience-prepared-footprint-registration-2026-10-03.mjs)，4939B SHA `2646bc7213b95a5a78dae5d366a85480ac5dbc211d163276c90011583a5028a1`。实际 [R1 failed](../../../../output/prepared-footprint-registration-1003-r1/result.json)保留：master `0.22755555555555557` 与 OVERVIEW `0.2275555555555556` 最末 binary 位不同，literal equality 拒真实有效源；新 test 引入 core report TS 模块又暴露 App 严格编译错误。修复前者为出版合同原 1e-12 close，测试沿已有独立 Astronomy Engine frame 约定，未改 core report。实际 [R2](../../../../output/prepared-footprint-registration-1003-r2/result.json)，1090B SHA `31a3c41a98c72869c4abffe408249f1b65c6fcfd9da99ddabb2adedf736c6171`，工具 `b49010` exit0：新 owner/原 artwork/原 science-TAN 受影响12检查与 App TS5.9.3 通过，29选择输入前后精确；27已有 WCS 点在三真实时间/地点、identity和有限非正交矩阵中比较，fixed ICRS 实效反例保留。选择 hash 不冒称实际编译全闭包。

实际消费者 [report display driver](../scripts/experience-prepared-report-display-2026-10-03.mjs)，20815B SHA `4300872cc6d14533674a9140d7d34cf760e76fe01708f99a39d9e78b9e735df5`；[GPU result](../../../../output/playwright/cloud-sky-prepared-report-display-1003-r1/result.json)，25785B SHA `5177aade2564a403a6ae6ac1f13ce06a6c32274df5535adc86fbf11b208e7ddc`，工具 `3f31be` exit0。真实 Astronomy Engine 的22.54°/113.95°/50m、2026-10-03T13:00Z报告旋转，背景为受控 NIGHT、catalog UNAVAILABLE，不冒称真实完整天空。browser实际执行新owner，核same ref/hash/at/rotation，再向 task-only renderer/shader 的六个 data uniforms提交；原生产 renderer/composition 两文件不变，无正式 renderer API/default 采用。

98实际 parser buffers、19 host选择输入前后精确；只两个模块 task-transform，实际 composition9365B SHA `14d4cb1eaa4bb0a248c45e65470eaad020951885400c4482bfee1c5d9cae8582`、renderer61337B SHA `c6e5a31e0d56178637470f28d8f002ee35a5df3379848fc32fa38f464b31de35`。五个有效条件各6个 `gl.uniform3fv` supplied 对冻结rows精确，`gl.getUniform` readback 对 Float32(rows)精确；wrong family 0calls/0RGB作用。六帧GL error0、completion=null、dispose tracked textures0；retired fine与独立MED-only全RGBA一致。Root已实际查看 [overview](../../../../output/playwright/cloud-sky-prepared-report-display-1003-r1/overview.png) 与 [detail](../../../../output/playwright/cloud-sky-prepared-report-display-1003-r1/detail-parent-rotated.png)：真实姿态下颜色/旋转机制成立，仍不能以局部图认证边缘或全场质量。

[新增 owner/真实消费独审](experience-prepared-report-footprint-independent-review-2026-10-03.md)，6036B SHA `1053cd97b3ccbf1f8b28a6e45464a842a4c9699c2e0b6a4cee33f2d997790d4e`；[result](../../../../output/prepared-report-footprint-independent-1003-r2/result.json)，25112B SHA `2bf463c4c280d29a4579206f6a76d3a38bf78e0d82cc9e5279d72db179ed61d1`；200 pre/post/current选择身份及两 parser transforms/whole输出/30 uniform读回、原CD/CRPIX独立36 ray/12负例与恢复已在有界范围收口。Root全文读取note、独立actual-owner-controls的全部坐标/冻结/拒绝/有效mutation、像素/资源限制，实际重哈希final.current200项均exact（`108cbf`/`5d89c9`）。Node/browser double rows实际差7.293e-11、Float32同一，不冒称double逐字相等；reader首代该过度断言FAIL及执行脚本保留。原源码首代未完整冻结，不伪称独立重放旧owner；strict-equality另有真实有作用wrapper mutant。仅名义模型与任务消费独核，8%/tone、弱外围、原5″、完整credit/default/native/总资源与容量未采用或验收。

## 共同 encoded tone 参数研究

[tone comparison driver](../scripts/experience-prepared-tone-comparison-2026-10-03.py)与 [result](../../../../output/prepared-tone-comparison-1003-r1/result.json)，3223B SHA `8446ee5996d8bf2dd8b03d2d14baad51b9ee460251631fab55c48d1219756300`，工具 `2451ef` exit0。只三缓存PNG和原已绑定nominal rows，14选择输入前后精确；不decode原JPEG/master、不生成新源/掩码、不重影像投影。

研究将已有8%完整源/母图边缘内25,703个opaque encoded texels 的P95 `0.1923953725490193`仅作三个LOD共同显示尺度，并比较原始、原W3 gain、该尺度和只edges，在两声明flat背景。Root实际看 [暗背景图](../../../../output/prepared-tone-comparison-1003-r1/contrast-3-7-16.png) 与 [较亮背景图](../../../../output/prepared-tone-comparison-1003-r1/contrast-32-40-56.png)。更强保留弱外围同时保留更多照片底；该分位不代表真实天空背景、科学sky扣除或有效性。三档共用尺度且原alpha/hash保持，也不能据此验收画质或跨LOD tone。该研究尚未进GPU或生产配方；不继续重复当前六帧/完整网格来冒充新质量结果。

当前继续在共享几何/数据uniform基础上核有依据的共同背景与弱结构呈现；随后处理GPU参与观测资源政策、星图区关联完整可见credit、普通/default、整场/native及原全部有效义务。源码实现、开发验证、目标运行时、最终验收分开。
