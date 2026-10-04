# M82 显式显示版本：共享 API 与标准静态出口开发

本代 r97 只推进云观星公开合同、SDSS 服务和相应检查/任务文档。工作区、分支、HEAD 保持指定身份。未提交、推送、部署、发布或重启原 BFF/watch；六项设置/outbox 保护和原 r96 的 6,871 项证据保持。候选没有普通采用。这里没有客户端 Hook/Scene、实际来源 Back、原生或设备验收结论。

## 责任与版本含义

新增 `sdss-calibrated-optical-publication` 是既有 SDSS transport 家族的严格版本分派：science-v2/v3 与 sdss-display-optical-v1 分别调用原各自合同。旧 science-only 断言、descriptor 输入继续拒绝 display，JPEG 默认发现与 Prepared 语义保持。新显示合同和该家族合同由既有 miniapp-contracts index 公开。

既有 `SdssOpticalImageryService` 接受独立、显式的 `calibratedPublications` 输入；新旧 descriptor 共用同一 hash 所有权、元数据缓存、catalog 注册检查、URL 复制和重复拒绝。显示版本复用 `readTargetOpticalImageFile` 的 PNG 结构、精确长度和哈希守卫，以及原 `publishedAssets` → 标准静态出口。没有另一套取图、缓存或发布服务。两个 PNG 版本与原 JPEG 的默认注册均未扩展；此处新注册只发生在隔离本地开发服务。

SDSS 来源保留 `optical-imagery:<publicationId>:<hash>` 身份、原权利/配色/coverage 说明，并明确显示估计不是新科学测量，原 SCI 母图、共同样本可用度和冻结 recipe 保持。完整图质与配准没有验收。来源 API 的 identity/readback 不是当前已绘 source packet 或来源 Back 通过。

## 原实际封包 → HTTP → 静态

复用 r95 已存的 26,384 B manifest，SHA256 `398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a`，publication hash `74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab`。未下载天文材料或重新运行源投影、coadd、noise、共同孔径、拟合/检测矩阵或出版封包。

[actual runner](../scripts/experience-m82-display-api-static-2026-10-04.mts) 通过原 MiniappController/MiniappService 注入该唯一 opt-in owner，监听本机随机端口，实际 13 次 HTTP。manifest、三个 PNG GET/HEAD、原 M82 JPEG 发现、celestial information 来源通过；科学 NPY、加工收据及 admission 子路径的图片路由均 404。三个 PNG 的 HTTP 内容/长度/hash/fieldDegrees/header 与原实际 publication 精确；HEAD 正确零 body 与原 Content-Length。

| 层级 | PNG 字节 | SHA256 |
| --- | ---: | --- |
| OVERVIEW | 516,783 | c308589737a08d0cb25bd51990f06f860cbb96bfb90581f2dfdd64e4f561bc24 |
| MEDIUM | 606,174 | b8461757639a3f03be70e50f10b7a4eb090f7bccaf7b4dbad9b5531b83aa0e41 |
| DETAIL | 546,719 | 13a30cee346713059e18ccc8eaf08658eeb0df81cdea397de42e7b45fbe16b52 |

`exportSkyPublicAssets` 的完整标准输出为 1,730 个当前 admitted 资源、82,235,809 B，其中新显示仅三个 PNG、1,669,676 B；SDSS 全部为原 18 JPEG 加该 3 PNG。整体静态 hash `9aa8664262897bcb8eba13ff0f269591dd23d06e4ed21a0b9b57554efdb4d787`。receipt、NPY、master、manifest 未作为新静态图片导出。既有标准 sealed bundle 校验和保存 reader 再读所有 1,730 文件；三个新增静态文件与真实 HTTP/原 publication 同字节/header。该输出仍本地离线文件，没有 Caddy 实际服务、部署、出口性能或远端持久保留结论。

实际成功 runner 阶段耗时 5.8491919 s，包含局部 HTTP 与完整标准导出；不含进程 bootstrap，未测 CPU/peak memory，不供客户端、服务容量或收费流量结论。具体真实内容与输入 pin 见 `output/sdss-m82-display-api-static-1004-r1/result.json`，15364 B、SHA256 `0ef98281673bf36eee2eb605d3225cc74de474b339d3ac15b6a7acda95ba5cc7`。

## 检查、失败与证据边界

11 项受影响合同检查通过，覆盖新 display 与原 v2/v3、六 JPEG、Prepared；worker 8 项受影响检查通过，包括默认与严格旧入口、显式三个层级、来源隔离、错误元数据不缓存、caller mutation、防篡改 PNG 与恢复重试、原 v2/v3 标准静态出口。contract/worker TypeScript 均通过。

[saved reader](../scripts/readback-m82-display-api-static-2026-10-04.mts) 在原字节 archive 上运行之前的真实 service class，旧 owner 无法注册新 calibrated descriptor，旧 science-only 路径严格拒绝新版本；对应新路径已实际成功。该有界 failing-before 保留了逃逸版本缺口，不是独立审查。原 display contract 的合成 fixture 移至 worker 共用测试 helper，未把合成数据当真实天文或画质证据。

首次 worker TS 检查有两处 TS2339：mutable 嵌套 value 的 const 判别未保持类型收窄；用稳定本地 imageVersion 修复，没有压制检查。`m82-display-api-types-r1` 摘要写 exit2，但工具 wrapper 实际返回 exit1，保留摘要并在此纠正，不修改历史工具结果。reader r1 的 archived-class VM 不能解析 import.meta；原 HTTP/static 成功不受影响，原执行源码和失败保留，r2 仅由任务注入原 owner URL 修复 bootstrap，未重跑 HTTP/导出或改生产代码。

四个本代输出目录实际 1,750 files、84,771,366 logical B、88,283,424 Windows reported allocation B，1,750 unique file identities、max links 1，测量前后稳定。包含整个标准 bundle 与 before archives/失败 reader/执行 closure；不含随后 allocation document/log/checkpoint/continuity、旧科学/候选/依赖、FS internals/Linux实际保留/client native/GPU资源。不能冒全产品磁盘、180GB 或 200DAU 容量。

现有 `packages/miniapp-contracts/src/index.ts` 此前不在 r96 的 440 source 绑定中；本次编辑前有实际完整 byte archive，现加入 current source，不能声称它受旧 checkpoint pin。其余本代修改的既有 source 对旧 checkpoint 和 before archive 保持精确关系。

## 唯一后续责任

继续原 target-optical transport/resource/Hook/frame/identity/Scene/completion/source-credit 实际消费者迁移；区分 display 与 science kind/当前已绘 packet。复用原 metadata epoch、同队列/租约/粗回退/取消迟到/退休，交付实际 opt-in page 三级与来源 Back，记录家族总资源/临时峰值/退休。不得以本次 API/static 成功替代那些结果或完整质量。

普通 Prepared/science/display registry 空且未采用。暖核/颗粒/绿色结构/其他条带、弱结构/星体/配准/跨级完整图质、M51矩形、strictBack 25 RGB delta1 FAILED、WXML、Android/iOS/newMoon、真实 retention/端云成本/200DAU混合容量与独立审查 MISSING 和原 33 项义务保持。
