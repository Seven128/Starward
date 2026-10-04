# 公共压缩影像文件 owner：独立 API 与实际竞态审查

2026-10-02，任务局部证据。仅桌面 pure-JS 实际源码、已有发布字节及独立可控内存 FS/transport；零 HTTP、零 IDE/native/手机、零生产编辑。当前范围是共享文件 owner/runtime 与可选 request adapter，**尚未验证 hook/App/公共清缓存消费者接入**。不能由此声称上线已减少流量、微信跨启动已可用、32MiB 设备余量、native decode/GPU 或 200DAU 容量改善。

## 已读责任及最小 API

复用现有缓存审计、`sky-image-file-session.ts`、`use-sky-artwork.ts`、`sky-artwork-request.ts`、`sky-artwork-loader.ts`、原 `clearTemporaryApiCache` 和 response-cache owner。早期只读绑定见 `output/sky-public-file-cache-api-independent-1002-r1/result.json`（SHA256 `9318f42178671d838cd19a55486d7efc4602d5bc7d603326d22a6afb4869e7e1`）；它适用于可选 acquire 接入前源码，不追溯升级。

公共文件 owner 只负责获批环境下内容身份、压缩字节/文件、跨启动索引与校验、全局 pending dedup、租约、预算/LRU/清理和失败恢复。Canvas image decode、wanted/fallback、decoded RGBA 预算和 GPU 生命周期继续由既有 request/loader/renderer 管理。不能把压缩文件预算当 RGBA/GPU 预算，不能借两个 Canvas decode 槽限制全局文件 I/O。

实际 API 为可取消 acquisition → 独立 lease，lease 暴露 `filePath/isCurrent/onRetire/release`。每个持有者独立 exactly-once release；loader 的 retainFile 将 decoded handle 转成 cold 文件所有权，旧 decoded release 不得删除/释放已转移的租约。清理先同步提升 epoch、retire 已有文件；仍在解码的租约保住实际路径，通知消费者失效，直到释放后再删除。真实未完成原生 I/O 不能假装取消成功而提前释放槽或预算。

新 runtime 仅白名单同配置环境 immutable/hash URL 家族；environment 由配置 base 内容 hash 隔离。selected W3 可变兼容 URL 尚无预先内容身份，仍保旧请求责任，不能把其 publicationHash 当文件 SHA 或偷接永久缓存。新 owner 不依赖 React/api-client/账户数据，避免回环和竞争 cache。

原公共清理服务仍需完成 API cancellation、response-cache invalidation/flush 与 query cancel/remove，并保既有返回的 cancelled 数。文件 owner clear 必须在等待其它工作之前建立 epoch fence；partial/pending 反馈要沿既有服务暴露。这里的实际测试未认证该消费者迁移。

## 冻结源及真实输入

完整 probe 新代：`output/sky-public-file-cache-independent-1002-r4/review.json`，51588B，SHA256 `496457e361dd8a8e88d90174e9e875b92ddc8ce79402080bdac8b5f44bac70dd`。运行前后下列 source hash 相同；完整源码快照随该 generation 保存，审查实际执行这些快照，未借作者测试断言作 oracle。

|责任|源码 SHA256|
|---|---|
|sky-public-image-cache.ts|b30e1632679c0fabb26908750df4decc3e88dfcc9039a8f802e6dedaeb1c51a4|
|sky-image-bytes.ts|89a95f19613183dc82b26bb09c0267e83d351dbf29ee2d627110fe4a796c76b2|
|sky-artwork-request.ts|2f06ad71c33a70e4da651d1415f84740fdbf196503500d5fde97bd241e58d5cf|
|sky-public-image-runtime.ts|3d2f21ff0e714339a4186ab65c4bd03efd6b29e5f9becebb3da320d786735d73|
|shared content-hash helper|21621418e9d32d2c24255290ef7c6d4505cb405148434fd4199a3b2926658ef9|

唯一测试图为实际已发布 `workers/miniapp-api/assets/constellations/triangulum-australe.png`，3201B，SHA256 `c283ccbe27b730d65a0ba0092c45668fba9d17452eaf4ffa19d43366fb94d7fd`。实际 SHA 与 catalog/Node crypto/shared noble helper 一致。预算/并发例通过多个 environment 使用同一个真实 PNG，无伪造天体细节；这些 environment 是受控 fixture，不触发网络。

## 发现的真实 escaped defect 及修后同例

修前 cache `24ab20730725e9f9ca8631d61061d515d85f0edfe3074659a6ee135ee599fc31` 有确定 settlement/join 竞态：首个 `await acquire(A).promise` 返回后的继续体立即再次 acquire(A)，旧 job 已广播成功但 pending/current 与 waiters 到 finally 才清。新 waiter 加入已完成广播的 job，再被 finally 清掉，永久不 resolve/reject。

实际首次全探测在 active-corruption 场景触发 unsettled top-level await；原 r3 源码/脚本及 termination 记录保持。进一步独立有界复现不需要损坏图片：`output/sky-public-file-cache-settlement-independent-1002-r1/result.json`，1728B，SHA256 `72a827e33b81b6ca74f08adf4a0b46cb3a81540dbf3c871d9475e58d2afbb647`。1000 microtasks + 10ms 后 second 未 settled，但 pending=0/running=0、只一次 transfer；手动 cancel 才 reject。这是实际 owner 反例，不是 task mutation。

实现方在通知 waiter 前封住已完成 job、条件删除旧 pending，finally 继续保新 job 身份。同一独立脚本对 r4 源运行：`output/sky-public-file-cache-settlement-independent-1002-r2/result.json`，1728B，SHA256 `69a9d9e85090e2eadd1fc72293aaf57d381c93a96f6919582223bab180d15f1d`。同条件 second settled、仍一次 transfer，bugDetected=false。没有为使 oracle 通过而改消费者或本审查 production。

## 独立实际观察

新 r4 十三条有限 probe 全部闭合：

- 同 SHA 两持有者合并一次传输，独立释放；重建新 session 后读实际索引/文件校验 warm 命中，无第二次传输。
- 旧库存三份真实 PNG、原预算12804B，重启政策6402B 时实际收敛至两份6402B。task-only 删除 boot room guard 后仍三份9603B，反例被检出；这是 guard mutation，不能称未保存的修前实际执行。
- 首次 list 明确失败后，下一 explicit acquisition 在 FS 恢复时重新初始化并成功；不靠重建 owner 掩盖失败。
- 初始化 list 未完成就 clear，旧库存不恢复；unabortable stage write 中 clear 返回 pending，旧结果拒绝，new same-SHA 使用独立 attempt path，旧 finally 不删除新图/索引。
- 同长度损坏文件的真实 SHA 不符；活跃旧租约立即 retired/发一次信号，新传输产出另一实际文件，旧路径在旧租约释放前保留，释放后才删除。
- 图片提交时 index rename 明确失败，不交出未提交 lease；重启不冒用孤儿文件，后续重新获取成功。
- 删除失败的 own-pattern orphan 计入字节；允许删除后 clear 确实回收，不能把失败垃圾当零。
- 六个 acquisition 中只有两份真实未 settled transfer 在途；取消前两份而 transport 忽略 cancel 时仍 running=2，不开始第三份。旧 promise 真正 settled 后才推进后续，末尾 reserved/running=0。
- request adapter 取得真实 lease、native image 尚未 onload 就 clear：retirement 触发 fail，保存的 late onload 不发布 ready，lease/retired 归零；不会让 consumer unlink 合法 cache path。
- 正常 ready → retainFile → cold decode 后，旧 decoded release 不提前释放租约；clear 时 cold decode 失败，旧 onload 被拒绝，cold 文件 owner release 后才回收。
- ready-only index write 卡住而 running=0 时，10ms injectable grace 后返回 pending（实际观测25ms），callback 未完成仍由 owner 保持 cleanup；放行后清理完成。生产 grace 为2s，不能把10ms fixture当目标 runtime 时序。

另六项资格/隔离核保存在 `output/sky-public-file-cache-qualification-independent-1002-r1/result.json`，4458B，SHA256 `71a5bbedf1d517cba833df84b975aac8230987dfea9057c0ca838c80469f60a8`，只使用同 r4 冻结源：

1. 同 SHA stored dimensions 冲突明确拒绝，原 lease/文件保持，零额外传输。
2. 无引用旧图被外部扩大至 N+8192B，stat 在 read 前拒绝，旧路径没有 FS read；实际新图恢复。
3. stat 后、read 回调期间文件扩大，FS 收到明确 length=N、仅返回 N；post-stat 拒绝该 TOCTOU，重取恢复。
4. 已有索引带额外 url/refs/retired/listeners 字段时，只恢复/再保存八个 known fields；没有重新发布额外字段或伪造活跃租约。
5. own-pattern 范围外的用户/旧 legacy/未知/nested 文件保持，不计作此 owner 的公共压缩库存。
6. 不可删除 orphan 占满当前 encoded 预算时，拒绝新获取且没有开始 transfer；后续删除恢复后 clear+acquire 成功。

上述十三/六是具体机制边界，仅支持这个 owner 的独立审查结论，不以数量认证完整产品。r4 记录中的历史 deep-sky 201 files（187图片+14metadata）及六项保留设置/outbox SHA 运行前后保持。

## 失败历史、预算与仍未验证

r1 task 启动采用了不存在的 aggregate sdss-optical manifest 路径，在探测前停止；记录/快照保留。r2 task VM 漏暴露新 setTimeout，第三项后停止；failed.json 及原脚本/源保持。r3 是上述真实竞态挂起。修 task 路径/VM 注入后仅新 generation，未覆盖失败或旧输出。

encoded bytesUsed/reserved 包括当前/retired 数据文件、写入保留和已知失败垃圾。正常 index-v1.json 和成功进行中的 index stage 不纳入这个 payload budget；源码另有256KiB index cap，正常峰值约两份索引。故32MiB应明确是压缩图 payload 政策加单独有限索引开销，不能写成所有磁盘字节严格≤32MiB。无限未知/用户文件也不属于这个 owner 的 quota。32MiB 与8MiB maxFile 是当前 measured policy，不是微信200MB全应用已留足余量的证明。

FS read 契约目前必须传 length；runtime 指定 position0/length，readExact 对 stat/返回长度/post-stat 均校验。实际 byte/hash 与 header dimensions qualification 不等于 native decode、文件语义科学正确、许可或图片质量。磁盘 readback/索引一致性这里由 controlled FS 验证，真实微信 rename/read/unlink、系统配额与跨真实启动持久性未验；parent 的本机 NodeFS 实物可补桌面机制，仍不能升级微信证据。

源码支持层可继续进入首个真实 consumer 集成。必须在之后独立核 hook/App launch/clear 服务真正调用、租约释放及 wanted/fallback、selected W3 不误迁移、clear 的 partial/pending 对外含义；当前审查不是那一步的通过证据。
