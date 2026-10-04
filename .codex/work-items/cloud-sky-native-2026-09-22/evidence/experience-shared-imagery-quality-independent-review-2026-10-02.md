# 共享离线影像质量 owner 独立审查（2026-10-02）

审查者：`sphere_review`，独立于实现者 `imagery_quality_owner_audit`。范围是唯一 PLAN 第 2 步中的共享离线结构准入与异常复核入口；未修改生产、现有影像、工具会话、候选、分支或手机。当前结论：本轮发现的三处客观准入缺口已经修复，r2 的实际输入、报告与既有文件身份核对通过；**影像画质、完整共享处理管线和最终体验仍未验收**。

## 控制来源与实际消费者

读取了当前 AGENTS.md、唯一 PLAN、`project_context/architecture/runtime-and-domain.md` 的 progressive imagery owner、`project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md` 的 2026-10-02 契约，以及 pipeline README。沿用商业边界、既有合规来源与原生路线，不重新选型、下载、生成补图、推手机或改动暂停的大字号。

复核生产 `image_quality.py`、`publish_allwise_w3.py`、`allwise_finite_tan.py`、相关回归和真实批脚本，并追到既有 BFF AllWISE/SDSS 图片验证、原生 SDSS loader/选择器和 `sky-survey-registration.ts`。QA 仅在离线出版/报告责任内；没有将诊断统计加入运行时，也没有改变 JPEG/PNG 的科学意义、三档消费者、旧 manifest、immutable URL 或来源说明。BFF 的 PNG 8-bit RGBA/IEND 与 JPEG EOI 契约和本轮准入一致；这项是源码边界核对，不是新原生/API 集成验收。

## 原始发现及修后反例

修前均使用真实已出版原图，在内存只改输入元数据或删除 PNG 尾部，通过生产函数独立实际观察；没有保存当时旧源码快照，因此不把这些会话观察伪称为完整历史源码绑定。当前另存 [独立检查 JSON](experience-shared-imagery-quality-independent-checks-2026-10-02.json)，以当前真实源码为基准，在内存有界移除新增守卫，重新证明旧错误行为能逃过其余检查，再核当前版本拒绝。没有改磁盘上的生产源码。

| 客观缺口 | 真实输入与最小变化 | 修前实际观察 / 当前有界 mutation | 当前结果 |
| --- | --- | --- | --- |
| WCS 真实变换与声明 north-up 不一致 | M42 DETAIL 原 PNG；分别加入 `PC1_1=-1`、`CUNIT1=rad`、RA 翻向的 CD 矩阵 | 全部曾被接纳；移除新增 transform guard 后三项再次被接纳 | `image_quality_wcs_transform_unsupported` |
| 直存 CDS JPEG 回执与实际 raw 不一致 | M82 DETAIL 原 JPEG；分别把 response SHA 改为 64 个 0、response bytes 加 1 | 两项曾被接纳；移除新增 receipt guard 后再次被接纳 | `image_quality_response_receipt_mismatch` |
| 可解码像素不代表 PNG 容器完整 | M42 OVERVIEW 原 PNG 删末 12 字节 IEND，同步 payload 自身 SHA/bytes | Pillow 仍能 load 全部像素，旧函数曾接纳；恢复旧 decode-only 函数后再次被接纳 | `image_quality_encoded_container_invalid` |

WCS 的有限支持现在验证 deg、单位 PC、相容 CD、零 CROTA、pole/axes 和不支持畸变；当前标签明确为已出版 header 几何一致性，**绝对天文配准未验证**。直接响应 hash/bytes 规则只用于未加工的 CDS JPEG，不拿派生 PNG 的来源 FITS tile hash 误比 PNG hash。容器检查同时核签名/格式/尺寸、PNG RGBA/IEND、verify CRC 与重新完整解码；JPEG 保 EOI 约束。当前 good 原图仍通过。

## r2 身份与实际输出独立核对

实际读取的代次是 `shared-imagery-quality-2026-10-02-r2/`，不是首代未完成报告。首代保留历史事实，不由新源码自动升级。

- r2 `binding.json` SHA256：`e3ce2b96acb056f8a3beca40686c2201feb11f7702252e309904acb40c2c3db5`。
- `image_quality.py`：`b69389f2961949ddb96a2248cbb4f7e866e653a78e710efb87fdfde88660fcff`；publisher：`be12b0806b3ecdacbd39085824cb0255ff17971a04f4076ffd6741383a57d2ee`；finite renderer：`6ce051e687cb2a66da3de0390c6b16015b5f44eb0f34457ff874142dd5edc354`。
- 逐一重算 7 个生产/测试/README/requirements 文件、实际批脚本和 5 个报告的 bytes/SHA；共 13 个 binding 项一致。另核目录中的 **201 个**现有深空文件：首代 initial、r2 before、r2 after 和当前实际路径/字节/SHA 全一致，合计 7,182,848 bytes。包含旧 offers、notices 和 manifest，未仅抽查当前图片。
- 重算当前 7 个 publication 的消费者所用 JSON.stringify 身份；全部与 r2 binding 一致。当前 manifest 与报告逐图绑定的 raw payload 也逐一核对，非仅信任顶层 `assetsUnchanged`。
- 批报告实际涵盖 **171 张 TAN 图片**：150 张 W3 JPEG、3 张 M42 PNG、18 张 SDSS JPEG。每项为 `STRUCTURE_ACCEPTED_QUALITY_UNVERIFIED`，171 项 scientificValidity 均 UNKNOWN；168 张 JPEG sampleAvailability 为 UNKNOWN。普通批内 M42 3 项只为 `DECLARED_NONFINITE_SAMPLES_ONLY`，未冒作本批重建了来源数组。**不包含宽场 NESTED W3 12 张**。
- 完整 M42 重建另有真实报告与脚本：读取既有 20 FITS / 21,029,120 bytes，实际三档 TAN lookup 的全集在造 mask 前由 source-set owner 核验；旧 plan 无 `tiles` 字段也不会以描述字段代替几何需求。报告脚本比较实际生成 PNG 与当前已出版 raw bytes 全等。独立核了全部 20 个 FITS 的当前 raw hash、plan/result/properties 输入 hash，以及当前三个实际 PNG 的 pixel alpha/count；本审查未再跑一遍全 20 源渲染。
- 当前 M42 真实 PNG 的 alpha0 为 22 / 648 / 5095，opaque RGB0 为 1095 / 4016 / 4206，三档无中间 alpha；与实际重建报告一致。有效纯黑仍有 alpha255，不能删成透明。重建报告只声明完整来源选中样本的 finite/nonfinite 对应，scientificValidity 仍 UNKNOWN。
- 独立调用生产 FITS reader：同一真实 FITS 缺 2624 bytes end padding 仍接受完整数组；再删末尾一个科学 float 即因 `buffer is too small for requested array` 拒绝。文件读取完整性与科学非有限值不同，不把端部 padding warning 归成缺样 mask。
- M82 的既有真实 plan 要求 6 tiles，仅 3 CHECKED，receipt 无已渲染 levels。独立核实际失败报告所引三个输入 hash；共享 source-set owner 拒绝 `image_quality_source_set_incomplete`，production finite renderer 拒绝 `allwise_candidate_input_set_invalid`。没有从尚未获得的输入生成 NoData 证明，更没有由 JPEG 黑洞推断 mask。

独立检查 JSON SHA256：`a9ae9546543e4e59b26a0e18568e68e9a8c9a262ee7fc2d7a6688830bb0cbbd7`。其中留存六项 mutation 的输入/变更、内存 source hash、错误接纳与当前拒绝、实际资产与来源核对结果。

## 原图、目录范围与诊断语义

实际观看了 M51 普通宽场 coarse/fine-with-coarse 完整合成、原 SDSS M51 OVERVIEW、原 W3 M82 DETAIL、原 SDSS M63 OVERVIEW/M81 DETAIL、历史 M82 实际渲染，以及当前 M42 三档原 PNG。M51 蓝天中的有限矩形、M82 黑区域/来源不全和 M42 明显的中心源缺样仍可见；本轮未修像素或证明画质达标。不会把重建与原出版 bytes 全等写成新画质改善。

独立直接从原 SDSS M63 RGB 重算 `[320,64,384,128]` 与邻格 `[256,64,320,128]` 的 redChromaMean，分别为 25.4754638671875 与 8.028564453125；与报告相同，能定位已见条带待人工复核，不能由此确定条带原因、删颜色或宣称科学覆盖。Laplacian、明暗分位数、边缘跳变与 8×8 cell 同样只诊断，不证明真实源分辨率、饱和原因、缺波段、photometry 或配准通过。

目录轴界限检查针对当前 catalogue extent 的几何包含：OVERVIEW 必须包含相应 bound；MEDIUM/DETAIL 允许有意窄场 refinement，实际 M81 DETAIL 等留 `REFINEMENT_FIELD_CROPS_CATALOG_EXTENT`。catalogue isophotal ellipse 并不是该 survey band 的实际测量 footprint；这不能关闭外围/跨档完整组合义务。SDSS 当前没有 precise WCS，报告明确保留未知；自有 TAN header 数值一致也不等于实际绝对天文配准已验。

## 尚需推进的范围

本轮入口可在其有限 scope 内继续复用，未发现剩余阻断当前共享准入的已证错误。PLAN 第 2 步并未完成：实际来源质量、精确配准/footprint、合理拼接/背景/颜色、真分辨率与层级组合、自动异常规则及 representative actual rendering 仍须按责任推进。M51 finite rectangle/precise WCS、M82 不完整来源和黑区域原因、M63 条带及其它源 artifacts/饱和/波段边界仍为已知未关闭事项，不能用质量诊断报告代替修复或验收。

13.57 MiB 既有源库存是另一只读 inventory 范围；本报告的现有 201 文件字节也不是客户端 resident/native/GPU 峰值或缓存固定预算。未新增实际服务容量、200 DAU、4 核16G/12Mbps成本、总体资源、微信原生完整旅程、240 ms 原生 timer 或当前手机验收证据。先前 full-sphere/GPU 49 场的有限结论保原代次，未由本轮离线 QA 升级。
