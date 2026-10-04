# 共享光学 science-v2 合同与离线发布链：开发闭合

当前[正常消费者审计](experience-sdss-normal-level-integration-audit-2026-10-02.md)的第一项依赖已闭合：共享 TS 合同、同一合同驱动的 Node 包装 CLI，以及复用缓存科学母图的 Python 离线 writer。它是未采用的、显式 opt-in 试验出版；六个旧 JPEG offer、M51 默认 discovery、旧 hash 路由和所有旧资产保持。正常页面/完成帧来源、画质与目标运行时仍是后续义务。

`packages/miniapp-contracts/src/sdss-science-optical-publication.ts` 是 publication canonical/hash 和传输准入的唯一生产 owner。新合同绑定校准 science/joint/RGB 完整 NPY 字节、18 个实际源身份及完整 receipt 字节身份、一次全母图实际 transfer、精确 TAN/CRPIX/居中裁切、整数 box 4/2/1 和三档 PNG 字节；下载 URL/hash 本身是传输 envelope。有效黑色、joint-area availability、显示贡献和科学质量各自保留语义。配方不得凭新 hash 自证有效；fixed/zscale 的实际参数、统计范围、样本和单次 fit 义务经过校验。WEAPP 传输校验不依赖浏览器 URL global。

`data-pipelines/deep-sky/publish_sdss_science.py` 校验 caller-pinned 的旧 candidate/binding、实际科学与覆盖数组、源回执三处关联和原始压缩源身份；当前实际 fixed 配方重放一次完整 RGB 母图，再核现有 pyramid 的完整 PNG/几何。它保存新完整 receipt sidecar，通过 `pack_sdss_science_publication.mts` 调用共享 TS owner，禁止覆盖输出，并保留失败代次。输出路径在 TS 准入前受 containment 检查。当前 cached writer 只支持 fixed；TS 的 zscale 合同能力不表示 zscale 产物已经生成。没有 FITS 重读/解压/重投影、重新获取、逐档 fit 或来源选型。

一次[真实 writer r1](../../../../output/sdss-science-optical-writer-1002-r1/result.json)绑定的新[manifest](../../../../output/sdss-science-optical-writer-1002-r1/publication/manifest.json)为 18,078 B，文件 SHA `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5`；光学 publication hash 为 `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0`，二者不同。新源码实际绑定 TS `e3fba071…`、writer `ea3a9db…`、CLI `7ac3ebcd…`。它复现原 r2 RGB/三 PNG；旧 r2 recipe 文本保持，新记录明确是当前 owner 的实际重放结果。

[独立审查](experience-sdss-science-publication-independent-review-2026-10-02.md)读真实输入并独立 canonical/Node crypto、实际 CLI、18 receipt/raw bytes、全幅手算 RGB 与三档 RGBA/box/TAN，覆盖 fresh-hash 无效配方/来源/覆盖/混母图和实际写入路径反例。跳过当前 recipe guard 的明确有界变异暴露负 stretch 缺口，不冒称未保存的历史源码。旧六 manifest/18 JPEG 实际字节与两个真实 Nest/Fastify HTTP 检查通过；91 缓存/201 旧资产/6 保留修改前后相同。未重复旧 pair/GPU 矩阵。

Root 另读实际 metadata/receipt/源码及保存的 before/after，重算 363 文件身份；三档完整 PNG 独立整数均值与 RGBA 全字节一致，详[root 读回](../../../../output/sdss-science-publication-root-readback-1002-r1/result.json)。实际 2048² joint 全可用，g/r/i 保 681,586/650,374/707,834 负值、无精确零；本实物不证明 partial 输入，partial/有效黑色只归各自有界反例。源质量、颜色、PSF、完整 astrometry 等继续 UNKNOWN/未采用。

五个受影响合同检查、contracts/小程序 TSC 通过。额外 worker 全量 TSC 有七项跨端全局声明/计时器类型错误；只在内存移除本次新增 barrel export 后七项完全相同，见[边界读回](../../../../output/sdss-science-worker-typecheck-boundary-1002-r1/result.json)。未修改源文件做 baseline，未修 unrelated 设置/outbox，也不称 worker 全量类型检查通过。

本代三 PNG 合计 **949,846 B**，旧 M51 三 JPEG 为 **64,352 B**；几何、来源和编码不同，不能把 PNG 出版可靠性称流量/画质收益。实际正常请求将复用两档加载、校验、持久文件和生命周期 owner；同机 12Mbps 出口、整场冷暖、普通混合业务、200DAU 与最终编码/画质选择仍需实际成本验证。完整 receipt/NPY 是离线 provenance，不是手机新增下载。

下一依赖是保默认/旧 hash 的显式 opt-in BFF/client hash 传输与独立光学来源身份，再沿真实 Hook/scene/完成帧来源闭合粗细选择/可见贡献及恢复。不得把 uploaded/submitted、保守 field/support 相交或黑色有效样本当可见照片来源，也不得把 W3 的 imagePublicationHash 当光学 hash。测试服、目标 WEAPP/WXML、真机/新版月面、连续输入和整体图质/性能/容量/最终交付保持开放；Goal active、无预算、未完成。
