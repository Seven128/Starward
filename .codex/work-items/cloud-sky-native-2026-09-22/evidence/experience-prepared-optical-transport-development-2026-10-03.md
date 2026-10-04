# Prepared publication 的传输与公共缓存（2026-10-03）

源码已经实现，真实开发验证通过；[传输/cache独审](experience-prepared-optical-transport-cache-independent-review-2026-10-03.md) SHA `cb90bd6d0d41e0cf340a91b69a766cbcdf38a6a0e0aa6fb74446ce689cba40ad`已由Root完整读回，本限定范围无新阻断。默认 `PreparedOpticalImageryService` registry 为空；没有把 heic0506a、新 science PNG 或颜色/PSF 候选切入普通产品。

## 服务、合同与静态文件

`PreparedOpticalImageryService` 明确注入 objectRef/hash/本地 manifest descriptor，拒绝外来 identity/URL，入 cache 前执行公共 admission 与目录中心核。失败元数据可修复再读；返回 clone，保同一 source credit/许可/原色义/AVM 提示和 UNKNOWN science。它只提供三个 PNG，不返回母图、JPEG、receipt。`target-optical-image-file.ts` 是 SDSS/prepared 共同文件字节/容器边界，保持原 SDSS v1/v2 offer。它核真实 read buffer 的 bytes/SHA 与 JPEG/PNG 支持形式，不冒称全解码或源质量。

两个显式 immutable prepared API、操作定义、生成 SDK、独立二进制响应型及 shared headers 已实现；`sky-static-bundle.mjs` 只允许 exact prepared hash/M1–110/三个档位 PNG family。默认 approved exporter 仍保旧资产，不自动导出 Prepared。BFF 三组机制检查、原六个 SDSS/HTTP 检查、11 个合同检查以及包/App/worker 实际 TS5.9.3 通过；BFF 首代唯一失败是测试误认旧 M51 schema（实际 `m51-v1`），修正为实际合同后通过，原失败保留。旧五个 static 检查只覆盖旧 family。

[实际传输 R1](../../../../output/prepared-optical-transport-1003-r1/result.json) SHA `5781b89fe9c020762898e21deb6a00b6f8a984293b1560dbeff5cfefcba240a7` 为真实 loopback Nest/Fastify HTTP，直接注入 [离线 R4](experience-prepared-optical-publication-development-2026-10-03.md) manifest。读回全部三 PNG，共 1,315,239 B，逐字节与原出版一致；metadata immutable cache/header、hash/ref隔离和四种禁止文件404成立；旧SDSS默认hash保持。shared static writer 写入磁盘后验证三文件/index/Caddy fragment；bundle identity `3477c2a8664be3d959f40d7ca5cf6ea9ddcf50de28f84da79d77b3df8601c18f` 是 bundle hash，非 prepared publication hash。31 个输入 before/after exact、六个保留修改不变。源 summary 2,580 B SHA `22309d1a9abe8b3d42b43d61549756b065efcf89b21a091218df3db2e06b9869`，完整 credit 和原 notes 可读回。未启动真实 Caddy/TLS/云端或手机/IDE。

## 共同客户端与 clear/boot 恢复

`sky-publication-resource.ts` 负责 metadata epoch、取消/迟到 fence、deep-frozen snapshot、pending demand、监听释放；science/prepared wrapper 保各自合同/路径/错误标识。Prepared client 只准 exact immutable hash/manifest/三个 PNG；公共 native 文件 owner 增加同一严格 family，不允许 NPY/外域/跨 publication。source 意义在 prepared 合同中，不冒充 joint scientific availability。

资源集成 R1 真正暴露两处失败：公共缓存未准入新 family；初始化 index write 被 clear 取消后，clear 错误继承旧 boot 的 cancelled rejection，使新 ready 也失效。完整旧 cache 冻结在 `output/prepared-optical-resource-1003-r1/escaped-cache-before.ts.txt` SHA `2db3353d5e16333d6696b0ab33f3e9c0e244c9ea6774a9e3c33dc96476ea8085`。修后 clear 只吸收本代精确 cancellation，等待实际 cleanup/persist 的新 boot；其它 I/O 错误仍显式失败/可重试，正在进行的 native/file demand 仍有界。

实际 [R2 trace](../../../../output/prepared-optical-resource-1003-r2/resource-traces.json) 19,080 B SHA `d9a186288a7b80d502451a651c72f7dd1cad0da62c73ab5d436dbaa155276a69`：旧 science writer 与 Prepared R4 的完整模块、controlled MapFS/Taro/AbortController，受影响 25 项通过（真实命令工具 chunk `3ff40c` exit0）。32 源/输入 before/after exact（before SHA `150bfd4dd71adc88195ef85c2b7f62d9d32e231541cf6a6e415587705ab83c5f`）；snapshot deep freeze、wrong version/ref、clear/abortthrow/晚回调、失败恢复、同 encoded SHA 暖取额外 transfer0、退休lease至最后释放均被核。prepared overview 实际 SHA `2462f47f…`，最终 entries/leased/bytes/reserved/running/pending/retired/failures 均0；不会把请求 cancellation 变成新默认 offer。

这些是受控文件与 metadata 行为，不是微信 native decode/GC/GPU、Hook/Scene显示或完整可见署名。共享文件政策仍是初始 encoded payload 32MiB，不能由这组三 PNG 推断客户端总内存、12Mbps突发排队、200DAU混合业务容量或最终图质。[Prepared Hook/frame/共同TAN](experience-prepared-optical-consumer-development-2026-10-03.md)已有当前有限开发实现，另行独审中；actual Scene/一帧来源、实际边缘/粗层和可见完整 credit 继续由 [PLAN](../PLAN.md)控制。


独立实际结果 `output/prepared-transport-cache-independent-1003-r2/result.json` SHA `c582a8299aa03ec6c4a5d6b9a8fd3179057f9ceeee1d247151ac99e76c77299a`核153输入exact、boot-clear修前拒绝/当前complete、新空index、真I/O错误不吞、显式acquire与最后lease释放归零、旧runtime拒绝Prepared route/当前通过；真实三PNG/保存HTTP/static磁盘仍exact。旧boot虽使clear失败，后续acquire原有显式retry仍可恢复，不能称永久死锁。独审R1错误预期仍running的job为partial，实际pending正确，原失败保留；R2等running=0后核真实lease partial。没有再启动服务/解码/渲染/native。
