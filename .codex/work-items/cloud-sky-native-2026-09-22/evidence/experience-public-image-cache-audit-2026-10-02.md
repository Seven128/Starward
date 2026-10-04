# 公共压缩影像持久缓存：只读依赖审计（2026-10-02）

**同日后续源码变化：** 本审计保留校验修改前的源码身份与“未校验收到字节”发现；最新 [共享下载内容身份](experience-sky-image-content-identity-2026-10-02.md) 已实现 manifest-bound response SHA256 并取得实际替换 JPEG 的独立反例证据。只有这项前置已修；selected W3 预先 discovery、写后/磁盘 readback、持久索引/租约/配额/清理及 target 验证仍按本审计的后续责任继续。旧 source hash 不追溯改为新代码。

本记录服务唯一 PLAN 第 3 步，是实现前审计，不是第二份 PLAN。只读源码、已锁依赖类型、已出版本地数据及既有报告；没有启动/刷新 DevTools、服务、下载、发布或手机操作，没有修改生产源码或 6 项保留设置/outbox 文件。当前仅保存本 evidence。源码/需求计算、开发验证、目标运行时及最终验收分别记录。

## 当前采用边界

依据 [唯一 PLAN](../PLAN.md)、[共享影像架构](../../../../project_context/architecture/runtime-and-domain.md#adopted-full-sphere-visibility-and-resource-direction-2026-10-02)、[部署容量](../../../../project_context/deployment/decisions-and-verification.md#current-capacity-target-200-dau-2026-10-02)：

- 三个生命周期：自有服务器不可变出版压缩文件；有界客户端持久编码文件；Canvas 解码/native/GPU。退出页面仍释放活动请求、解码引用及 GPU；合法公共编码文件可跨页面/跨启动保留。旧 hide 后文件归零不是新版目标，兼容迁移前仍保现清扫。
- 200 DAU 是全产品日活，非并发或全部用户都使用 Sky 的既成事实。生产单机 4核16GB/12Mbps/2000GB 月公网出流量/180GB SSD 是预期，4GB 测试服不变。此次读取不证明生产容量，也不授权部署。静态不可变文件、Caddy 同机直出为初期采用方向，CDN/对象存储不是 Sky 前置。
- 已确认微信用户文件/缓存文件额度 200MB 由整个小程序共享。不得默认占满、拿 temp 自动回收当可靠离线库、用编码字节代替 native/GPU 峰值；具体缓存额度/余量仍需实际资源与设备验证。本审计不新增固定额度或费用预算。
- 全部合规功能继续；当前 6 个 SDSS 对象、51 个 W3 对象、当前文件库存不是范围上限。账户、草稿、投稿、本地账号恢复和 QWeather/weather 的私有或禁止存储边界保持。

## 真实 owner 与迁移面

表内 features/services/state/app 的省略前缀路径以 apps/wechat-miniapp/src 为根；其余路径相对仓库根。

| 入口/owner | 当前真实行为 | 新责任必须保留 |
| --- | --- | --- |
| apps/wechat-miniapp/src/services/sky-image-file-session.ts | runtime session+sequence 唯一路径；App 启动只识别上一 runtime 的 sky-art/deep-sky 根目录文件并 unlink；无持久索引、全局去重、活跃租约或编码字节限制 | legacy 根目录清扫必须继续保守识别，不能清账户导出、投稿/头像、terrain 或任意 USER_DATA_PATH；新缓存放独立版本目录 |
| features/sky/use-sky-artwork.ts:13 / sky-artwork-request.ts | useSkyNativeImages 创建 Canvas/出版期 loader。每次 GET arraybuffer→长度/PNG/JPEG 尺寸→writeFile→Canvas createImage；目前字节 SHA 在服务端查，客户端没有完整文件 SHA 校验。ready/retainFile/release 将文件所有权绑 Canvas，dispose/重试/取消会删除 | 原始 request 对输入/编码/尺寸/取消校验仍生效；持久文件 acquisition 与 Canvas decode 拆开。文件 lease 引用计数真实 release，不能 release=no-op |
| features/sky/sky-artwork-loader.ts | hash 在单 loader 内去重；每 loader 最多 2 并行；decoded/cold 文件用 width×height×4 计预算；cold 在本 Canvas 生命周期内复用，publication/canvas/hide dispose 删除 | 保 decoded 生命周期、wanted/粗图回退、GPU失败恢复和代次检查。该 RGBA 模型不能改成“压缩文件 budget”；全局 file owner 控不同 loader 同一内容的请求/写入 |
| features/sky/deep-sky-image-request.ts:51 / spot-sky-page.tsx:1736 | 独立 selected W3 GET；由响应 headers 得 fieldDegrees/publicationHash/sourceId/pixelSize/missing/displaySupport，写 session 文件，页内 decode/retire release 删除 | 接同一 file owner，但科学/出版 metadata 验证仍由该 adapter；页面二次 decode、粗细级恢复、source/coverage/displaySupport 与已绘文件一致 |
| services/api-client.ts:484 / state/app-store.ts:713 | Settings 已调用 clearTemporaryApiCache()+clearLocalCache()；前者只清旅程 read-model/response/query，后者按账户 owner 清观察上下文等 KV。现在不清 Sky 文件 | 接原公共清理服务，不编辑 Settings/index.tsx；保原返回/异常和账户边界 |
| app.tsx:109 | useLaunch 调 skyImageFileSession.removePreviousFiles，一次 runtime 清扫旧 session；当前无新持久 cache boot | 同启动流程增加新目录恢复/孤儿扫描，保 legacy 扫描；不能以 startup 为理由清所有合法持久文件 |

useSkyNativeImages 已迁消费者完整覆盖：useSkyArtwork 的星座图片；useSkyFixedImage 的 galactic 2MASS、当前 moon coverage v2、Mercury、Mars、OPAL Jupiter/Saturn/Uranus/Neptune；useSkyWideFieldW3；useSkySdssOptical；useSkyLandscape 的 bitmap。useSkyOpticalHips 也走它，但只属开发 fixture trial，商业 bundle 当前不启用；持久化不得放宽其商业排除或跨环境提供该 trial 图片。

landscape alpha-RLE 是另一公共数据 owner：services/sky-landscape-client.ts→sky-landscape-resources.ts 的 masks，当前裸 JSON HTTP→验证/解码，未走 bitmap file request。重进仍可能请求它，即使 bitmap 命中。SAO/BSC/星座目录走 API envelope/query 及自身出版/working-set owner；它们不应被强塞成图片，也不把“bitmap 0 GET”称为“整场 0 网络”。

项目现有持久 owner 是 services/response-cache.ts 的 JSON API KV/chunk cache（有完整写入后索引提交、generation fence、孤儿回收/旧 schema 迁移）；它没有公共栅格 FS 责任。借用其模式，勿把 ArrayBuffer 图片塞该 KV，勿合并账户/weather 规则。其他文件使用主要为头像/投稿读取、账户导出、terrain temp 下载及 share poster；没有可直接复用的公共内容文件库。

## 先决缺口：selected W3 的身份发现

现真实保存报告的 sources 及 deepSky.catalog.sources 未提供 imagery 出版 hash；deepSky entries 是天体身份，不是图片资产清单。现 URL 是 /celestial-objects/{ref}/image?level=&imageVersion=source-finite-v3，出版 hash 直到响应 headers 才得到。它不能直接用可变 URL 或 reference+level 当跨启动不可变内容 key。

已有固定 manifest 路由 /v2/sky/deep-sky/{publicationHash}/manifest 与 api-client.deepSkyManifestUrl(sourceId) 可复用；服务端 deep-sky-imagery.ts 的 manifest 带每图 sha256/bytes/pixels/fieldDegrees/coverage/displaySupport/downloadUrl。迁移可以先让全部已 manifest 绑定的 useSkyNativeImages 接公共 file owner，selected W3 保兼容入口并继续补齐出版发现。若要求 selected 冷启动可直接当前出版 disk lookup，需要明确的小 current-publication discovery/manifest 边界，或明确校验/版本语义的 alias；不能假装报告已含该 hash、无条件永久缓存可变 alias、或以 publicationHash 代替 image content SHA。

热缓存仍要验证当前获准 publication/asset 契约。缓存保存字节可跨出版 hash 去重，但来源/权利/field/缺测/displaySupport 的映射各自保留，不能因为相同图片字节而沿用另一来源的科学语义。旧 published URL/来源和新旧 deployed client 兼容义务保留。

## 单一公共文件责任建议

在 services 层建立一份可注入 FS/transport 的公共压缩文件 owner；Taro runtime adapter 可独立薄文件，但不另建 competing cache。该 owner 不导入 React、Sky 页面或 api-client，避免 use-sky-artwork→api-client→file owner→Sky 的环。两个 request adapter 负责授权公共 asset descriptor/响应科学校验，共同 acquisition；Canvas loader/page 只持 lease 与自己 decode 回调。

1. **身份与边界。** 目录 schema/version + API origin/环境 namespace + content SHA256/format 命名；只能接已有验证公共出版 asset 的 descriptor，拒绝任意路径/远端 URL/账户媒体。content SHA 是字节身份；publication hash 是来源与合法使用映射，两者区分。descriptor 至少 bytes、尺寸、编码、内容 hash、publication/source 和 adapter 验证身份。
2. **完整写入/恢复。** 下载完整响应→adapter 验证→字节 SHA/length/编码/尺寸验证→独立 attempt/epoch staging path→FS write success→readback/stat 校验→rename 到内容路径→最后提交可恢复索引/descriptor。rename API 存在不等于已证明跨平台原子提交；索引未提交/内容未校验均不可作为 hit。重启扫描自己的 staging/orphan/index，限定本 namespace；坏/缺文件从可用索引退休，不能把空目录当完整离线库。
3. **去重与租约。** 一个全局 pending map 按环境+content key 合并网络/验证/写入。每订阅独立取消，最后 pending waiter 退出才 abort；不可取消 native write 仍占实际 slot 直到回调终结。lease 为 acquire→release 一次有效计数；活动 decode/冷文件待复用/当前 page 文件持不同有效 lease，evict 不删活跃文件。最后 release 可进入有限编码库存，或执行已标记 retired 删除；它真实减少计数、释放 pending watcher，不是空函数。
4. **epoch/迟到。** purge/bootstrap/版本替换使 epoch 递增；旧 request、SHA/readFile、write/rename、index commit 回调都须核 epoch/attempt/key。迟到 staging 仅清自己路径；不得 unlink 后继同 hash 已验证文件或发布旧 loaded 到新 Canvas。Canvas request generation/decode id 仍独立检查。取消不能让占用的 native I/O slot 提前假释放。
5. **容量与故障。** 同 owner 计成功编码文件、保留 descriptor/index、staging/在途实际占用；LRU 只是候选排序。容量不足只逐步清 inactive/retired 文件并一次有界重试，保已有独立有效图；活动租约不得被预算淘汰。仍不能写则报告缓存/加载失败或经明确验证的临时单次显示路径，不能用“写入成功”冒称已持久化。损坏/外部清理后有界重取；decode/GPU失败不得无依据判为 content 损坏或清其他有效内容；同源 hash/dimension失效则隔离并失败。
6. **预算来源。** 统一 policy 必须留全小程序其他文件余量，观察 USER_DATA_PATH/Sky 真实占用、失败/峰值/在途；本次仅提供测量依据，不采用 200MB 或任意新增固定数字作生产默认。可注入小阈值验证逐出/活跃租约/配额；测试阈值不是正式预算。具体生产额度与设备验证在唯一 PLAN 保开放。
7. **旧实现迁移。** 新目录名不命中 sky-art/session 与 deep-sky/session 根 regex；legacy startup 清扫继续。迁移只接公共内容，不搬旧无内容证明的 session 文件冒充新完整 hit。新 namespace 恢复与旧清扫独立结果、有限失败回执；版本不认识时只拒用/限域清理自己的旧目录。

## Settings 清缓存可实施路径（不改 6 项保留文件）

沿 Settings 已调用的 api-client.clearTemporaryApiCache() 接 singleton 公共 Sky owner clear。调用开始先同步递增 Sky epoch/撤出可用索引并取消旧 pending，和原 requests/response/query/state 清理职责并行或顺序等待；公共文件清理结果纳入原 Promise/异常边界。保持该函数已有 cancelled 返回值语义，必要 diagnostics 不冒充 API request count。

FS 清理限自己的持久 namespace 和明确 legacy 所有权文件，绝不能调用 clearStorage/删除所有 USER_DATA_PATH，不能改 private/weather cache-policy。当前 Settings 路由会令 Sky 隐藏并释放旧 Canvas；仍须覆盖活动 decode/不可取消写入在途的 race：mark retired、让实际 lease 退出后 unlink，epoch 拒绝迟到重写。可用 owner invalidation 通知连接现 adapter 清理；底层不能直接触碰 React/GPU。

clear 的“完成”必须读回索引无可用旧 entry、该清路径实际删除完成；失败或仍被活动 lease/写入持有要给 partial/pending 结果并沿现 local_cache_cleanup_incomplete 到 Settings 原部分失败反馈。后续 lease release/下一次清理执行有限补偿，不无限重试/等待或静默成功。重回 Sky 可由新 epoch 正常重取。logout/account-delete 自身 scope 不因公共 Sky owner 接入而扩大。

## 实际本地资产测量

逐一读取当前准入 manifest/catalog 中的图片引用，并比对实际文件 length 与 SHA256：**278 张，全部一致**。排除退休月面、旧 W3/JPEG publication、输入原包/科学 TIFF、terrain、trial 光学及未被当前资产 manifest 引用文件。此表是当前库存，不是预加载目标或需求上限。

| 当前准入组 | 图数 | 真实编码 bytes |
| --- | ---: | ---: |
| 85 星座 artwork（88 星座共享含组合 artwork） | 85 | 1,999,008 |
| 当前月面 coverage-v2 | 1 | 1,595,187 |
| Mercury / Mars | 2 | 184,395 |
| OPAL 四行星 bands | 4 | 2,977 |
| 银河 2MASS | 1 | 703,555 |
| 地景 overview + detail | 2 | 4,170,957 |
| 全天 W3 order0 | 12 | 678,144 |
| 6 SDSS × 3级 | 18 | 336,244 |
| 当前 51 selected W3 × 3级 | 153 | 4,563,738 |
| **图片库存合计** | **278** | **14,234,205（13.57 MiB）** |

landscape alpha-RLE 另 19,943+54,224=74,167 B，独立当前公共 JSON。各 manifest/catalog/来源/索引和 DB/API/其他业务流量没有纳入图片库存。

代表差异：Lyra 11,604 B→256² RGBA 262,144 B；Orion 41,095 B→512² 1,048,576 B；地景 overview 854,784 B→2,097,152 B，detail 3,316,173 B→8,388,608 B；当前月面 1,595,187 B→8,388,608 B；银河 703,555 B→8,388,608 B；每 W3 面 24,663–82,669 B→1,048,576 B；selected M42 三 PNG 41,082/124,865/145,243 B，各 256²/512²/512²，M51 JPEG三图15,342/23,374/13,161 B。OPAL 最小421 B也有16,384 B源RGBA。编码大小不能作为 native/GPU 峰值。

### 当前纯需求 owner 整场重放

复用原报告 tmp/current-native-report-2026-10-01.json，SHA c5f0dc230a53e6e296978604aa11bc7b3d7d4e38b1bd329e6b5097f3fb829b99，以及已绑定冻结 BFF catalog/constellation/landscape JSON与当前本地 manifest。真实 observer/time 固定 2026-09-30T13:50:33Z，Sun −50.6078°，390×844，普通模式、星座开启。经 Node/tsx 调当前 presentSkyTime/resolveConstellationFrame/artworkIntersectsView、完整球面 HiPS 需求、日月行星 disc、galactic eligibility、landscape source预算/真实 alpha需求 owner；没有渲染、运行 hook/网络或持久 cache。地景选已就绪状态，当前物理mask/渐隐仍参与。

| 代表相机 | 实际 wanted 图片数 | 编码图片 bytes | 源 RGBA需求模型 bytes |
| --- | ---: | ---: | ---: |
| az243.2016° / alt30° / FOV45 | 7（Aql/Oph/Sco/Sct/Sgr+银河+地景overview） | 1,724,604 | 14,942,208 |
| 同 az / alt−30° / roll27° / FOV85，center145,477 | 24，W3 faces6/7/9/10/11，地景无贡献 | 1,440,576 | 23,068,672 |
| 同 az / alt−45° / FOV139 | 36，W3 faces1/2/5/6/7/9/10/11，地景无贡献 | 1,792,832 | 31,326,208 |
| az0° / alt90° / FOV274.9 | 14（银河+12W3面+地景overview） | 2,236,483 | 23,068,672 |

前后两有地景行另有 overview alpha 19,943 B；未包含 metadata/API/catalog/Sao/用户选中图或失败重试开销。当前 image owner 冷启动若全成功要取所列图片，完全有效热文件理想情况可避免相同 bitmap GET；仍有 manifest/alpha/报告等请求与每新 Canvas 的 decode/GPU 工作，不能称所有请求/内存归零。这些是读取时当前源码的需求与字节量，不升级旧41/48/49场渲染证据，非原生峰值或性能结论。

只作情景：200人每天各一次上述当前冷图片集，30日图片出流量约10.35/8.64/10.76/13.42GB（十进制），未含公共其他业务/重试/metadata，非 DAU真实使用模型或容量证据。12Mbps 理论共享1.5MB/s，十个相同冷集约11.50/9.60/11.95/14.91秒的纯图片发送下界（忽略协议/争用）；不是单人首屏延迟，交互必须先可浏览再细化。持久命中主要减少重复出口和下载等待，不改变必须验证的 client总资源/服务CPU/RSS/DB/混合业务容量。

## 可执行下一小路径及证据

先用已内容绑定的 useSkyNativeImages 真路径建立一份 file owner，首个代表选当前地景 overview/detail（大字节、有粗图fallback、同Canvas渐隐与取消）或当前 moon coverage-v2（有真实 alpha覆盖，非旧手机图）。至少实际经过 acquire→完整验证/write→native decode→实际已绘→hide release native/GPU→合法编码保留→新Canvas/页返回命中→JS启动恢复命中。再迁全部既有公共bitmap消费者；selected W3补上述 identity discovery 后同owner acquisition，保 own metadata validation。alpha/Sao等公共JSON后续按现各owner有界复用，不混入第一张“图片缓存成功”声明。

开发回归要求围绕 escaped defects：同文件2 loader只1请求/写入，释放1lease另1仍可decode；取消写回调/clear迟到不复活旧缓存；同length损坏正确被SHA识别而非尺寸通过；staging/索引半提交重启不能命中；配额不足只清inactive且保有效粗图；原Settings动作清Sky可用索引/自己的文件、private/account/weather byte/state保持；外部清文件正确单次重取；旧session启动扫描保新persist。失败前/有界counterfactual应证明这些旧实现或错误迁移会失败。

测量冷暖 bitmap请求/字节、所有metadata请求、persist/在途峰值、lease数量、decode引用/逻辑GPU释放分别记录。目标实际WX FS重启/配额/最低SDK、native总内存/driver、设备存储清理、完整旅程与生产同等机器容量均未验；现手机不可用、新版月面未推、DevTools观察链故障仍由主任务保开放。此审计不扩大测试数或软件截图的验收范围。

## 读取时绑定与平台事实来源

Taro 已锁 4.2.1。真实本地类型 apps/wechat-miniapp/node_modules/@tarojs/taro/types/api/files/index.d.ts 提供 mkdir、readdir、stat、readFile（二进制 ArrayBuffer，可 position/length）、rename、unlink；getFileInfo.digestAlgorithm 只有 md5/sha1，不应调用不存在 native SHA256。现 packages/miniapp-contracts/src/sky-image-display-support.ts 已用 @noble/hashes/sha2.js，可复用 SHA256/增量流式机制，避免新依赖或整大文件常驻。类型存在不认证当前最低WX版本/真机全部行为。200MB沿已确认 [微信官方文件系统文档](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/file-system.html)，未重复研究，不对 rename 原子性、剩余空间 API 或平台回收时点新增未经证明的保证。

关键读取时 SHA256：

- services/sky-image-file-session.ts: 1950f44454703066702bf2d452e41d77d5925449a76391462f9caaa093ecfc7a
- features/sky/sky-artwork-request.ts: 9b7672439d080100b1bedeef1f5444a2175ab8a3cb5efc87b34ff77f8112fe14
- features/sky/sky-artwork-loader.ts: 05a9a6f6b380ec38c0674b771b9d37ef2c5917b167979d81a31bbd4f18ac7ffe
- features/sky/use-sky-artwork.ts: 69789bb336b7f083e1e5dddac6ba2eb202a029a24f8b3ae641c481c2f6b162fb
- features/sky/deep-sky-image-request.ts: e64073f411f220a1a852f9f4b24ce6ea86c7ebf1a2b52f42a94d030129f432f8
- services/api-client.ts: 1dae3b41c317f0fb66c369a3a58412af3e5f1f43373cdac59f1ffd5716ad2b89
- app.tsx: b49e27fc0338fc703f85d05d64bb97973e77d8b2862369ba0d14a90f228f0332
- features/sky/sky-artwork-visibility.ts: 861f46cb5d48d44b43baf6eb7a47bb642f38786ae4458ec9be0eabbf9397becb
- features/sky/sky-hips-tile-mesh.ts: c6b9f1b6830e2b9648a1abddbb58954abac860cc8bc3ea7ddda748f388bdbb7c
- features/sky/sky-landscape-resources.ts: 674b90768bb4ef98627f4e094625c80b9bab25bcc3e3ad71e2b46dd8cd3fa175

这些绑定只适用本次读取时状态；主任务并行后续修改需要自己的实际验证，不能因审计描述复用旧证据宣称完成。

