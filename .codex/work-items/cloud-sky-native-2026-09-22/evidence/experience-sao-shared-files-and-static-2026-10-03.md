# SAO 静态文件与共用 encoded owner 开发结果

继续原工作区/分支/HEAD，Goal active、无预算、未完成。上轮确认为有效进展。本轮只改云观星服务、客户端 SAO 消费者和必要的 Sky 静态/文件共享依赖与测试、owner 文档；六保护项保持，未提交/推送/部署/发布或重启共享 BFF。通用响应缓存的业务政策/名额/预算没有改变。

## 标准静态出口：真实全部 SAO 成品

`SaoPublicationService.publishedAssets()` 从当前已验证 v2 index 逐个流出原始文件，复用 raw byte-length/SHA/scientific admission，不磁盘爬取、不一次驻留整包。标准 `approvedSkyPublicAssets()` 已纳入这 826 个合法已有成品；共享静态 route 白名单只新增 hash-bound SAO v2 assets 路径，header 白名单只新增 data-source，原 envelope/index 路由继续由 API 处理。现有 `catalog` 出口分类与独立 static/API 标记保持。

[标准完成成品](../../../../output/sky-sao-public-files-1003-r1/standard-export/publication/index.json)共 1727 项，其中 SAO 826 项、35314828B 原始编码数据；这不是每个客户端必下载量，也不是旧 201 项清单的上限。全 826 文件与源 SHA/byte length/内容、来源/cache-control/header、sealed image-artifact/index/fragment 实际读回。现有月面等原资产复用，普通 Prepared registry 仍为空。没有下载、影像重加工或候选采用。

首个新测试误读 exporter 容器父目录而非返回的 `publication` 完成子目录，保存[失败](../../../../output/sky-sao-public-files-1003-r1/static-test-failure.json)及执行测试源；修测试后复用同一已完成成品，未再生成一套静态包。随后类型检查发现原 `.d.mts` 缺既有 `validateSkyStaticBundle` 声明，补真实 return contract，未改该验证器运行行为。失败不当生产 exporter 失败，也不删除或重标旧成品。

## 一个文件 owner：图像与 JSON 共用原预算

现有 `createSkyPublicImageCache` 已扩展为一个 encoded 文件 owner，保原兼容 API 名称和所有图像调用；新增独立 JSON descriptor，无假尺寸、PNG 冒充或另一个缓存。key 仍绑定环境/content hash/格式；PNG/JPEG 保原 bytes/header/dimensions/hash，JSON 保完整源 bytes/hash，完整科学合同仍由 SAO 消费者每次 admission 验证。图片和 JSON 共用原目录、32MiB encoded cap、两 native transfer 槽、staging/reservation、租约、同 key coalescing、LRU/损坏回取、epoch、取消迟到与 clear。SAO runtime 路由仅允许当前环境/hash/tile 格式，最大 192KiB。

持久合同为 `index-v2.json`/version2；只从已知 v1 image 清单迁移，保旧图像文件，完成 v2 commit 后移除旧 pointer。v2 存在但无效时不回退旧 v1、不提升孤儿。已核 image v1→v2 暖迁移、JSON/image 共预算与租约、重启/hash corruption repair、clear。旧二进制回滚如何核算/回收其不识别的 JSON 库存，以及微信全小程序 200MB 合计与物理总峰仍未验，不声称所有版本回滚/手机磁盘保留已闭合。

`readPublishedSkyJson` 用原生 UTF8 读取已验证文件，重新核该次读取的完整 UTF8 byte length/hash，解析结果交回科学 publication owner；不要求 WEAPP 支持 browser TextDecoder。消费者取消立即拒绝，但已开始的原生读取保租约到实际 callback，clear 不能提前 unlink 活动文件。租约与 generation 检查拒绝迟到结果，实际 callback 后释放/退休。读取/解析/percent-encoding 临时分配尚未测为物理峰。

当前 `api-client` 的改动已与归档原源全文对比，仅在 Sky runtime import 与 SAO block；其他业务逻辑原样。index 仍走现有 operation/response-cache，瓦片走上述 raw file 路径，返回继续具有正确 source/科学身份的 envelope 形状。不会在文件错误时悄悄回旧通用 tile cache 掩盖问题；星图 loader 的独立/粗层及明确失败恢复义务保持。

## 实际 HTTP 压力与取消迟到：按执行 epoch 记录

[r10](../../../../output/playwright/cloud-sky-live-mixed-1003-r10/result.json)重建完整 API 和实际新文件 owner，复用 native-port scaffold，**没有执行 page/Scene bundle**。控制 Taro storage/MapFS/原生 UTF8 callback，运行隔离真实 Nest/Fastify + 缓存本地 Caddy及上述 sealed static mount；业务/report/weather/test-astronomy fixture 含义保持，无真实供应商或生产容量声明。

与旧原因实验相同的 22 个真实 tileId：全部通过 Caddy static，真实源文件 raw bytes/hash 对应，23 个 static 响应（含清理后重取）均为 `catalog/static`。泛业务响应缓存仍 5 项，report/BSC/figures 保 fresh；基线及压力后三项都 304/零正文，未出现旧 count25 淘汰。Sky 文件库 22 项、122453B，SAO 暖文件取用无 HTTP。仅证此有界压力输入，不等于完整较大旅程、所有目录规模或容量完成。

受控 hold 的**原生文件读取**不是 HTTP 弱网：abort 拒绝结果但保 leased1，实际 callback 后 leased0；clear 返回 partial/files1，held leased1/retired1/6581B，迟到读取不交付，callback 后 entries/leased/bytes/reserved/running/pending/retired 全零；旧 index generation 拒绝，新需求经 API index304 与 static raw200 恢复真实行数。没有把逻辑回收当设备物理内存。

后续审查抓到另一个缺陷：response-cache 重用同一 index 对象时，另一观察者刷新可覆写旧 capability 的 generation。补测试得到[明确修前失败](../../../../output/sky-sao-public-files-1003-r1/generation-failing-before.json)，最初无界 stub rejection 测试卡住的 owned 进程已停止并记录，改立即 identity 断言后实际失败；修为每次交付独立小 publication/envelope wrapper，共享完整 immutable index，旧观察者不被复活。实际消费者修后通过：科学/source 保持、旧能力拒绝、late tile/late index 拒绝、新能力恢复、原 Query structuralSharing 行为保持。r10 是这个最终浅 wrapper 修复**之前**的执行，150 源在当时精确/前后不变；当前 149 源仍精确，另 1 归档旧源并核只有该确切修复，不把 r10 倒填成最终源码全路径验收。

[根读回](../../../../output/sky-sao-public-files-1003-r1/readback-result.json)核全部 SAO static bytes、HTTP gzip/decoded hash/size 与 privacy logs/status multiset、三暖304/no eviction、文件租约/清理结果、150 执行源及最终修复 epoch、API 全文范围。该读回是自审，独立审查仍缺。

## 影响检查和剩余依赖

在 miniapp 跑 cache/native full consumer/stellar Query 24 项通过、类型通过；最终 metadata-generation 修复后 3 个实际 stellar consumer 检查和类型通过。在 worker 跑 raw GET/HEAD/304、coalescing、byte mutation、65-key burst 4 项通过；标准 static826读回 1 项、route/header 2 项、类型检查通过。两个 native consumer 初次仍断言旧 index 文件名，和新测试的 unchecked-index 类型错误保存在[失败记录](../../../../output/sky-sao-public-files-1003-r1/affected-test-failures.json)，修测试后受影响 checks 通过。以上不当独审或真机验收。静态原始 JSON 的真实 HEAD/conditional 行为仍需与完整静态出口/客户端组合一并核，不借 API HEAD/304 自动升级。

唯一下一依赖：把最终 API/文件消费者接入实际 page/Scene 端口，保证 task API 与 image Hook 共用**同一个** encoded owner，不能双 bundle 各立32MiB预算冒真实总量。只以当前变化所需的有界冷暖/返回、来源Back/hide/clear/取消迟到组合验证所有实际参与家族、同帧和退休，再决定是否优化 queue/decode/缓存。完整 UI/跟随校准/公共时间、静态 HEAD/304、旧二进制回滚库存、WXML FAILED_DEVTOOLS、Android/iOS/new Moon、Prepared/science 图质/背景接缝/弱结构/配准/覆盖/出版/独审、物理端云总峰/成本/180GB保留及生产同等混合容量继续开放。Goal 不结束。
