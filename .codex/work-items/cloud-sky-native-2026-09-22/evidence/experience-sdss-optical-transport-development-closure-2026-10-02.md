# 光学版本传输与独立来源身份：开发闭合

[正常消费者审计](experience-sdss-normal-level-integration-audit-2026-10-02.md)的第二项依赖已完成相应源码、真实产物传输与独立审查。`SdssOpticalImageryService` 的显式内部 descriptor 以 reference/expectedHash/local manifest 绑定未采用的 science-optical-v2；默认 descriptor 为空，六个旧 JPEG offer、默认 discovery、旧 hash 和静态 exporter 保持。新 client 独立按 optical hash 验证 v2，不复用 W3 hash，也不在错版本时回落。

独立 `opticalPublicationHash` 已贯通完成帧→资料 modal/来源 route→共享 information Hook/API cache/response validator→HTTP query/service cache→光学 source/download link。来源使用完成帧自己的版本，最新 loader 仅管刷新状态。未知、外对象或错光谱 hash 保留目录/W3 并返回 PARTIAL 和重试；不替换成当前旧/新光学来源。资料缓存和 query key 同时保各自 W3/光学版本；光学 envelope 与 data 的 source identity 也须一致。当前完成帧接线仍是普通 v1 的实际消费者，不能据此声称 v2 已绘或 pair 已采用。

一次真实 writer 产物的[实际传输 r2](../../../../output/sdss-science-optical-transport-1002-r2/result.json)经现有 Nest/Fastify HTTP injection（无 listener），三张 PNG 完整响应字节与原文件一致，总计 949,846 B，MIME/视场/immutable headers 正确。原默认 JPEG 和明确拒绝 NPY/receipt/外文件/未知 hash 均有保存结果。客户端使用实际摘取函数与 bare owner、受控 Taro bridge；取消/pin admission 有明确反例，但不是微信网络、native decode 或文件缓存实机证据。R1 因脚本猜错 validator 文件名在 preflight 失败，保留 failed/executed script，R2 只修路径与输出代次，不覆盖旧结果。详[作者记录](experience-sdss-science-optical-transport-2026-10-02.md)。

[独立审查](experience-sdss-optical-provenance-independent-review-2026-10-02.md)核作者 457 输入/完整响应，另运行 9 个有界真实来源 HTTP injection：PARTIAL 200→304仍再调用 source；恢复后200新 ETag、目录事实保持，随后完整缓存304；W3-as-optical/未知/外对象无回落，坏 hash/非深空400。实际 page predicate/props 的 latest-loader getter trap 为零读取，隐藏/退休/外对象不 pin；删除旧 manifest link 和 envelope identity guard 的两项当前源码变异均暴露缺口。没有需要修复的生产发现。

Root 另重算[457 当前输入与三完整 payload/来源响应](../../../../output/sdss-science-transport-root-readback-1002-r1/result.json)，保六项 Settings/outbox。Root 自己所写资料接线的自审不代替上述独立审查。受影响 app/client/资料/HTTP 检查及小程序 package TypeScript 通过；worker 全量仍是原七项跨端全局/计时器诊断，无新增，不称 worker 全量通过。检查数量不验收体验。

下一依赖已推进到显式 science Hook：先处理冷 metadata→public-file acquisition 的清理代次边界，复用既有 epoch/demand、Query cancellation、文件/native loader；保独立 reference/hash 与 exact PNG/field/pixels/CRPIX/availability/common-master 元数据及粗层回退。默认 v1 阈值保持。新 Hook 源码和恢复检查进行中，不能提升本代传输为该新生命周期闭合。

随后仍须实现普通 render-surface/scene 的一次粗细选择、有效黑色与实际非零贡献、foreground 后 surviving source、完整 callback/资料来源及失败恢复。Uploaded/submitted 或保守相交不作为照片署名证据；W3 光谱选择政策须明确。新科学图片、编码/颜色/PSF/背景/绝对 astrometry、目标 WEAPP/WXML、手机新版月面和完整旅程、整场总资源/性能/200DAU 容量及最终交付均开放。没有新源下载、FITS 重投影、GPU/IDE/watch 重跑或云部署；Goal active、无预算、未完成。
