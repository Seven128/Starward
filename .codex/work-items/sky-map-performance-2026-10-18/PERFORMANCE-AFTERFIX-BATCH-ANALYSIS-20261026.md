# 候选12后续性能与三份Heap分析（2026-10-26）

本报告记录候选12后续批的历史分析与原始证据。2026-10-26后续已实施的Map/Sky/Query修复、检查和候选13目标缺口见[D0–D2新节](D0-D2-REPAIR-20261026.md#cache-and-query-repair-c13)及[当前交接](HANDOFF.md)；下文“尚未修复/paused/仅分析”是当时状态，不是当前指令。

## 当时结论与下一步

现有1650test、Map Performance和三份Heap已经足够继续归因并准备针对性修复，**不再要求重录这批场景**。已独立复现Sky编码文件缓存的索引容量准入缺陷；热点函数与同一owner的索引序列化/字节转换高度吻合。Map的持续失效得到录制、完整Console导出和展开计数支持：8个缓存条目全部删除失败，阻断新的地形/夜光文件准入；不能套用Sky索引原因。

三份Heap中最大的保留数组已定位到微信`Trace → wxPerformanceProfiler._profileFrames`，另一大项是调试器`Network._resourcesData`。它们是真实记录到的工具占用，不能当成业务泄漏。业务残留与native/GPU/OOM仍未关闭。本轮仅新增离线分析、隔离反例和当前公开GET读回，**没有修复本节新发现的产品缺陷、重建/重连/清缓存或操作手机**。

最新get_goal实际返回paused；用户随后要求继续这轮分析、集中说明数据缺口。工具Goal状态未改，不标complete。唯一实施计划仍为[PLAN D0–D2](PLAN.md)，候选/环境状态归[HANDOFF](HANDOFF.md)。

## 原件、条件与时间

原件保留在`C:/Users/momoooo/Downloads/`。逐hash校验副本位于：

`D:/dev/Starward-data/verification/sky-map-20261018/performance-repair-20261026/user-batch-20261026/`

| 文件 | 字节 | SHA256 |
| --- | ---: | --- |
| map-layers-afterfix.json | 50,468,921 | 97d88d2f765fcca5b13d57c50a0a63f6e6ead9b9cd45e28e2545a6fb9d244d7c |
| sky-before.heapsnapshot | 158,236,060 | c7e713daff1a746af029fa7dbffd5f7780af94ea5847fb9c499c247f3667f4f8 |
| sky-paused.heapsnapshot | 140,828,813 | 0dca801b0b261aad2e1f14b97c8e561515dc7b04b5152e02a02a882ba2041112 |
| sky-map-return.heapsnapshot | 109,231,858 | 38b7c615622aa112b6b3e44b5f73271b0848ca8dd6e52895ef15a57d52ed0945 |

`manifest.private.json`记录用户说明：**Map开始录制前，用户已多次拖动，地形已经持续失效；本次记录覆盖失效后的状态与恢复尝试，不覆盖首次发生点。** 不要求为了首次发生点重录。

三份Heap按夜景稳定、正常Play/Pause后、返回Map命名。源文件保存时间分别为北京时间17:45:33.527、17:48:05.291、17:48:52.524；Map保存时间17:52:27.675。它们是文件保存时间，不冒实际操作/采集瞬间。用户使用候选12且已授权其测试副本开启大包支持；这一资格不能替代普通包体或发布资格。

1650test的原件/分析在本报告上一级repair根，SHA256为`2b0bb2a4a3d441d546439d883d0b945aa428de53c2eb96597a803c00a8b015e6`，既有完整记录见[D0–D2修复记录](D0-D2-REPAIR-20261026.md)。新分析不覆盖旧四份原采集。

## D2：索引容量缺陷与CPU归属

产品owner为`apps/wechat-miniapp/src/services/sky-public-image-cache.ts`，本次读回SHA256 `7182be4543e8d0bf12cad944ae31547dc81c42d6245c6500a2d8147b7b61b6eb`。

- 文件缓存总预算32MiB，索引上限256KiB；`room()`只按文件字节淘汰，`persist()`却会因索引变大拒绝提交。存在许多无租约旧条目时，新文件仍可反复因`sky_public_image_index_limit`失败。
- [隔离反例](scripts/reproduce-sky-index-capacity.mts)使用实际本地SAO文件并逐文件核hash，所有写入只在内存假文件系统。705条有效旧索引占261,976B，编码文件占22,225,158B，仍余11,329,274B（约10.8MiB），704条无租约、1条有效租约。两个新文件97,634/97,842B都因索引上限失败，未淘汰旧条目，持有租约未失效。这是缺陷复现，不是产品修复通过；实际手机索引大小没有读到。
- 反例回执`sky-index-capacity-reproduction.private.json`、log在repair根。三份Heap每份都记录到674个缓存entry形状（392 JSON、276 PNG、6 JPEG），跨6个environment hash；记录到索引上限诊断。数字值bytes/refs/last未在此导出格式中恢复，不能声称实际手机占用/租约数。
- 674条最小数字序列化下界为250,505B，接近上限，但这不是手机实际索引字节读回。
- `persist()`每次序列化整份索引；stage和commit两次读回分别把readback和原body转成字符串比较，共四次字节→字符数组→字符串。warm访问也等待索引写入，虽然并发touch已有有限合并。

1650test的稀疏CPU采样里，D自身8238.079ms、j自身7377.814ms，合计约占30058.985ms已采到活动区间的52%。不是76.697秒墙钟的52%，也不是逐输入延迟。候选12完整`common.js`有相邻压缩j/D，分别对应`Uint8Array.from(text, charCodeAt)`与`Array.from(new Uint8Array(bytes), fromCharCode).join`，函数内容/邻接关系支持映射到上述索引转换owner。用户界面跳转标签为common.js，导出包装帧为appservice.app.js；未取得完整运行时脚本字节，不能把本地候选匹配冒精确运行源码绑定，也不能混用UI选择区间数值与导出权重。

修复方向已经具备依据：由原文件缓存owner共同处理索引与编码文件的准入/LRU，尊重持有租约、在途工作、删除失败记账与原子提交；读回校验避免重复构建字符数组，保完整字节一致性。不能靠增大预算、清用户缓存、删SAO/图像内容或改科学精度绕过。先补这一机制的正常准入、持有租约及失败恢复回归，再统一构建目标候选。

## D2：Heap的实际保留责任

| 指标 | sky-before | sky-paused | sky-map-return |
| --- | ---: | ---: | ---: |
| 节点 | 2,484,462 | 2,169,087 | 1,526,767 |
| 总self字节 | 149,483,479 | 147,733,791 | 140,886,478 |
| string类型self字节 | 79,710,989 | 83,534,549 | 86,959,153 |
| supplementFrame形状 | 12 | 9 | 4 |
| stellarTransform形状 | 13 | 10 | 5 |
| skyReport形状 | 33 | 26 | 17 |
| 采集器_profileFrames元素 | 29,315 | 32,045 | 36,111 |
| 该数组retained字节 | 23,519,792 | 26,924,000 | 29,644,848 |
| 调试Network._resourcesData._entries retained字节 | 9,256,960 | 8,845,096 | 9,163,504 |

沿导出的非weak边和支配树，最大数组明确由`Trace → getter/closure context → wxPerformanceProfiler → _profileFrames`持有；Network大Map由`__inspectee__ → adapters.Network → _resourcesData._entries`持有。采集器字段`_started`为true仅是该对象的记录值，不自行等同UI录制按钮状态或认定用户同时录了两个Profiler。父子retained数字有包含关系，不相加。此结论来自历史导出图，未读/修改微信私有运行对象。

这些工具对象在返回Map后仍增长，因此“字符串上涨”不能直接归为Sky几何泄漏。总self下降也不能证明没有业务泄漏或OOM风险：剩余4个supplementFrame中仍见Query options/queryFn/closure context到frame的非weak路径；需要结合真实生命周期/时效审查，不能盲改Query GC。经过WeakMap的记录路径仍不能代替ephemeron/实际存活语义。没有重复R27实时弱探针。

堆内诊断形状数量（不是唯一错误事件数）：index_limit三份均85；stellar_tile_failed为1417→1523→1523；image_availability_failed为17→18→18。tileTransform形状未命中，不能单凭这一点推出全部SAO未加载，但不能把有暗星错误的采样冒完整正常负载验收。

ID比较中before→paused有4372个同ID变类型、paused→Map有2194个；不将其逐对象存活数字当成已证明的同isolate寿命结论。独立的总量、形状及各自持有路径仍有效。字符串导出最长1024字符，没有可导出的Script完整源码；不能拼截断字符串冒完整common.js。Heap只覆盖所选JS VM，未覆盖完整native/GPU/进程资源；OOM继续未解决。

分析入口：`inspect-sky-heap-owners.mjs`、`inspect-heap-script-evidence.mjs`、`inspect-heap-large-storage.mjs`。后者直接复用`diagnose-target-heap.mjs`导出的原有strongGraph算法；原脚本字节已保存在批次目录`diagnose-target-heap.pre-storage-analysis.mjs`。三份`*.retainers.private.json`为上述责任证据；早先未跑支配树的`map-return-large-storage.private.json`只是初探，最终数值以三份retainers为准。

## D1：持续地形失效、夜光与调试开销

Map trace共68.414286秒、27,889事件、219截图；CPU样本加权与FunctionCall均9857.409ms，无缺引用/逐段时间差。观测到87次request（74 success callback、13 fail callback），其中terrain/overlay 4次、preview 2次、night-light 20次。**callback没有响应内容、HTTP状态、errMsg或可配对请求ID**，不能将13个fail当作13个真实HTTP失败，也不能指定给地形/夜光。

17.359秒截图保留旧地形矩形，新视野未覆盖；34.394秒和56.503秒继续支持未覆盖新视野。录制有“正在更新地形”写入、17.294秒地形细节失败、2.814秒夜光失败，后续抽屉仍有不可用提示。不能把这些失效只解释成loading较慢。trace自身不足以定位文件/原生边界；后补Console已确认文件删除权限失败与名额阻塞，见下节。本批Heap早于Map录制，不能假定包含之后的Map错误；原生最终显示仍未验收。

Map中getStorage 7090、getStorageSync 1079、getStorageInfo 116；setStorage 21、setStorageSync 74、removeStorageSync 21合计116次变更。getFullStorage inclusive4294.481ms、sendToDevtools inclusive2700.188ms有嵌套，不能相加。频率和调用栈支持调试Storage同步的额外成本，但没有因此关闭Storage或改业务持久化。现有trace不量每次手势到有效像素的完整延迟。

沿本次最后的只读metadata请求、当前可信API指针做有界GET复核，结果保存于`current-map-metadata-readback.private.json`：北京时间20:27:56开始，地形HTTP200/PARTIAL且data.state=AVAILABLE，夜光HTTP200/FRESH。随后20:54:43用metadata公布的路径/bytes/SHA下载两张图片：

| 当前公开图片 | bytes/hash匹配 | 尺寸 | 非透明像素 |
| --- | --- | --- | ---: |
| terrain | 457,758B / 0341eabe… | 512×768 | 392,135 / 393,216 |
| night-light | 12,097B / 978bf233… | 512×768 | 393,216 / 393,216，alpha=102 |

`current-map-images/manifest.private.json`有完整时间/hash。两张当前图片不是空透明图；这只排除当前服务该输入缺图/坏hash/全透明，**不追认录制当时响应、手机下载、文件预算、native安装或可见覆盖成功**。没有重发POST/Context事务、提醒或图层安装，也未改API/DB/网络。

## Console补件已完成：Map持续失败的直接原因

用户已提交完整Console导出和展开的夜光budget对象，**不再索取本批日志、截图、common.js或任何重录**。截图已经是所需的Object完整展开，用户无需再找别的展开入口。原件和副本绑定见批次目录console-evidence.private.json：

- starward-console-afterfix.log：41,606B，SHA256 fc25ee1b23d89783c3480e2d55068c2d2e96fd836569de220e76973ecc3067f4。
- raster-budget-expanded.png：15,095B，SHA256 d8c9056299fce06709b61d9723df1ae805ed9d400c5eea5f8b3dbf9153f2d6ce。
- 日志有1076行、166条错误：144条raster_image_remove_failed（file_remove/map_raster，errno=1300013），22条raster_image_budget_busy（file_owner，其中terrain 8、night_light 14）。这是导出记录数，不冒独立文件或去重业务事故数。日志没有墙钟/请求ID，不精确拼接到trace的某一个拖动。
- Save as确实导出了多条Console错误，并非只有右键的一条；对象摘要仍有省略号，展开截图补齐了下列计数。

| 展开字段 | 值 |
| --- | ---: |
| entries | 8 |
| readyBytes | 2,815,991 |
| failedRemovals | 8 |
| physicalFiles | 8 |
| activeDownloads / queued | 0 / 0 |
| nativePins / activeReaders | 0 / 0 |

当前产品map-raster-files.ts限制为8文件/16MiB/2并发；上述时刻不是16MiB字节耗尽，也不是reader/native pin或下载队列占住，**是8个删除失败的条目占满文件名额**。makeRoom尝试删除闲置文件，平台unlink失败被保守保留，最终没有可释放条目而拒绝新文件。terrain和night_light共用这个owner，故都可受阻。保守记账本身不能改成假成功；不增上限、不清未知pin、不忽略权限错误。

源码链已核：createRasterFileAdapter返回downloadFile的tempFilePath；map-raster-files直接用FileSystemManager.unlink清理。仓库安装的官方miniprogram-api-typings中FileError明确1300013为permission denied；微信在线API页本轮抓取不可用。腾讯官方[文件系统说明](https://intl.cloud.tencent.com/ind/document/product/1219/61747)也区分临时文件只读与USER_DATA_PATH读写权限（此处不采用该页面的容量数字）。**数据确认删除权限失败；根因高度指向临时路径与删除方式的能力不匹配**，实际失败路径未输出，不能冒已完成真机路径验证。

下一实现沿现有Map文件adapter/owner处理可删除的自有文件生命周期及真实平台边界，复用同路径alias、reader/native pin、取消/迟到、hash/bytes验证和失败删除记账；先在该责任层补有判别力的回归，再统一候选做目标显示/连续拖动/My返回验证。原Sky索引缺陷是另一责任，仍按本报告上一节继续；完整普通负载、实际native退休和OOM未关闭。

此前Windows取证失败和用户需要保存日志都已经成为历史；不要再从“当前工具失败/等用户Console”恢复任务。本轮仅补充证据和源码分析，没有执行产品修复、重建/重连/手机动作或修改Goal状态。main及全部dirty/私有/冻结产物保留，未触发CI/部署。
