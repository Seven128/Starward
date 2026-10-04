# PreparedRGB 同母图与独立出版：有限开发闭合（2026-10-03）

责任位于 `data-pipelines/deep-sky/prepared_rgb_tan.py`、`publish_prepared_optical.py` 和 `packages/miniapp-contracts/src/prepared-optical-publication.ts`。复用已准入的缓存 heic0506a，不取新源、不采用局部四点拟合为全场修正。源码实现、实际离线开发验证与独立审查成立；普通产品/原生/画质采用仍开放。

## 同一个母图与三个档位

`build_prepared_rgb_tan_master` 用源 owner 的全精度名义 ICRS/J2000 TAN，chunked 四邻采样及四偏移共同几何支持，建立不可变 2048² uint8 RGBA。`prepared_rgb_tan_products` 复用同一母图的 2048/1024/512 中心裁剪，通过整数 premultiplied box 4/2/1 生成三个 512² PNG。有效黑色保留；母图拒绝非二值 alpha、alpha0 隐藏 RGB 和虚假支持/黑色计数。PNG alpha 是离散源单元几何面积平均，科学有效性仍 UNKNOWN；它不认证连续 footprint、配准精度、可辨认度或探测器质量。

实际 fresh generation [R1](../../../../output/prepared-rgb-tan-generation-1003-r1/result.json) SHA `844ead5e726ed5af8f2fc6e46899c3dc06ef4e4ea8355a1fdd901f98de0c403f`；缓存验证 [R1](../../../../output/prepared-rgb-tan-cached-validation-1003-r1/result.json) SHA `794924fa3d190c8b9c6cc6d43084430f77878c245b6c37638daeb8dcd0f49021` 绑定当前 producer `6ab454989b401a2f99f1dfd8e258618cd1f3d979e9c72ec9c0040ee319a88194`，缓存代次真实源解码/重投影均 0。raw RGBA 16,777,216 B SHA `2c9790bb218556a3e2474a4101e0dad4a389c7d45c1ff441210df0678a3694a9`，NPY 16,777,344 B SHA `cf086879a92021445163ca4ff9d6ccd80d4f46d77e071f57ecec1ef0f46556ee`；它们是不同身份。完整母图/三 PNG 与旧名义候选逐字节保持。完整母图几何支持 1,425,463/4,194,304，源内真黑 0；OV/MED/DETAIL 的 opaque/partial/exterior 分别 88,625/934/172,585、253,400/387/8,357、262,144/0/0。

| 档位 | bytes | SHA-256 |
| --- | ---: | --- |
| OVERVIEW | 181742 | `2462f47f20e444a2bf1a580a8891a57cd8ac4ea69a30288ed1413a60bcc413a4` |
| MEDIUM | 529695 | `e523412f935e3b85e778c89ee60c33a05db616abe126d4d0efb8456c5c7bc4b5` |
| DETAIL | 603802 | `14d606b399481ea518ad5c22a0173c1d931e75c86892eac105dc0a9bada80a19` |

[TAN 独审](experience-prepared-rgb-tan-independent-review-2026-10-03.md) SHA `25c4b7729b71ba566f32c2b738fb106d90516882f9e64d3f29a09d273397afd0` 核完整 NPY、PNG CRC/filter/手工全阵列 box 和独立 3D TAN 四邻点，不以 producer 自证代替坐标/全字节核。旧 cache guard 接受四个坏母图、当前拒绝且合法黑色不变的有作用反例保在 [guard](../../../../output/prepared-rgb-tan-cache-guard-1003-r1/result.json)。

## 独立 prepared-optical-v1 出版

公共 canonical hash/基本内容身份已抽到 `optical-publication-content.ts`，保旧 SDSS v1/v2 hash 与 URL 语义。Prepared 专属合同绑定原 JPEG、raw/parser XMP、解码 RGB、源页/许可/完整 credit、颜色含义、原名义 AVM/resize/约5角秒提示、master raw/NPY 身份、实际裁剪/TAN/alpha 计数及 UNKNOWN science。新 hash 不授予源许可。只接受 pinned source 与 exact immutable 下载 URL。

`verify_cached_prepared_generation` 消费外部固定的 result/before/after hash、保存的实际执行 owner 与完整源/包/runtime 绑定、完整 NPY/PNG/metadata。`publish_verified_prepared_generation` 独占新输出，经 TS 共同 admission 再写三 PNG 与 manifest/receipt。它不覆写旧产物、不与输入重叠、不下载、不注册默认服务。

最终 [出版 R4](../../../../output/prepared-optical-publication-1003-r4/result.json) SHA `aff24f076c269af5eea6cb92799ae430f06e69c68d823f295d6c9577df98b5b1`；publication `8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802`；manifest 7,509 B SHA `23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1`；writer receipt 633,128 B SHA `ae96df5bf1c3321b50a3e794ac187c90bd0ac0845a077c01c076bd9915a3dfaa`。2,904 输入绑定、三个 PNG 共 1,315,239 B；当前 writer `26beb0b058a5da5241665d8ee0a4d42788405bfaed777efa257068aff5ee5873`。本次零真实源解码/重投影/网络。

[出版独审](experience-prepared-optical-publication-independent-review-2026-10-03.md) SHA `5effae4909f1364b93e954ad331cb825b7c434fbb281f20257014afb191c75a1` 已完整读取。两项真实发现均已修：raw RGBA 与 NPY 的身份混用；先 hash 后另读 JSON 时可在 restore 后返回未绑定 credit。后者由旧 `810cc…` 真正接受/当前拒绝的同长文件交换反例验证；现在解析只消费被 hash 的 bounded buffer，NPY header/shape/dtype/payload 在 allocation 前验证。合法 0 B runtime 包 marker 不再误拒绝。R1 失败/R2旧身份/R3竞态保原记录，不升级为修后。独审还核六个旧 v1 manifest/18 JPEG 和实际旧 v2 canonical SHA 兼容；8 个受影响合同检查及包 TS5.9.3 通过，不作为图质计分。

源原约5角秒是 publisher 的近似提示而非实测误差；四点局部拟合只覆盖 6.771% 原几何域。B/V/H-alpha+[NII]/I 是历史加工 RGB，非 calibrated gri/nanomaggies、自然肉眼或实时图。有限旋转矩形/背景/颜色/PSF、粗图回退、实际可见完整 credit、真实端云/WEAPP/手机与全旅程质量未通过。下一执行只由 [PLAN](../PLAN.md) 控制，传输与 shared cache 见 [后续记录](experience-prepared-optical-transport-development-2026-10-03.md)。
