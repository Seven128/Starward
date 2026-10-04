# Active-used 保留：只读采用边界审计

2026-10-02；独立审计 `/root/active_retention_boundary_probe`。审计最初对象是原 GPU owner `cbbe372034a2b49d0ed04af9c25eb4b986318842dd06b4fba931bb351e3c6b3e` 与候选 `0201b42d5cbe371f1a3b45d2baba36b06a5a8dedc3585d1fc4111d167fa45448`。闭包时 root 并行接入了当前 owner `a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3`；本审计 guard 实际拒绝将新源码冒充原freeze，随后只补读该现状。当前已改用 PRESSURE_BYTES/pressureBytes、移除候选不再参与保护的 previousFrame dead bookkeeping，澄清当前frame/pin/pressure注释；上传、copy、failure、weak lifetime和 active-used guard/finish方向与候选一致。地景当前资源选择owner为 `26d35fa3c635fe6ef478224d9457970c22f31c7a7a8098e8393308526fd49ff5`，仍相同16MiB数值选择目标，只重命名及澄清必需overview可以超目标。本 agent 只读实际 page / Hook / selection / scene / lifecycle，无新 GPU 矩阵、网络下载、服务、IDE或生产/PLAN编辑。读取绑定见 `output/active-retention-adoption-owner-audit-1002-r1/result.json`；它是闭包时源绑定，不是此前正常GPU矩阵的新运行receipt。

**判断：可以继续开发接入，没有发现资源身份或相机转向的具体机制阻止它。** 原16MiB不是有效当前帧所需纹理的物理上限；已有实际139°场景的不可约 working-set 超过它，原 finish 淘汰当前纹理会在稳定下一帧重传。候选的 active-used 保留与现有需求 owner、weak bitmap lifetime、帧/Canvas lifecycle兼容。开发采用应明确这是持续保留政策变化，修正旧预算注释和旧语义 assertions；native总内存、性能、组合上限与产品验收仍开放。真机不可用不自动成为所有源码接入的阻塞。

## 现有结构边界与31.98MiB样本的限度

| 实际消费者 | 当前代码有界规则 | 尚未成立的上限 |
|---|---|---|
| 星座插画 | page `visibleFigures` 和 scene 都用实际注册图/视口相交；开启且10°<FOV<140°；当前publication有85个identity，单个128/256/512方图。离开wanted转冷文件，不保无需求bitmap | 没有“最多28张”硬规则。85图库存原sourceRGBA共45,088,768B，43MiB，只是有限库存包络，不是同帧实际可见/内存。其他相机、宽高、offset/roll保守相交可能要求更多图，当前31.98MiB不能当global cap |
| W3广角 / 银河 | W3 selection order0/min0/max0、最多12张512²baseface（12MiB），还过滤实际mesh相交；Sun≤−12°且FOV≥60°、用户开启。page在这个开关+FOV条件下关闭银河；银河单张2048×1024（8MiB）、exact frame/FOV>12/Sun资格 | 不能把银河8MiB和12张W3任意加成默认同时wanted。12张base是该层上限，不能据此界定整场；其它比例/视口与copy回退尚可改变组合 |
| Moon / Mars / Mercury / 4个OPAL | 每个Hook一个fixed publication；实际disc在视口、surfaceOrientation、逻辑半径≥4（OPAL需oblate）；Moon8MiB、Mars/Mercury各2MiB、4个band各16KiB。不满足资格同步不返回image，随后suspendUnusedDecoded | 没有全页“最多一个body纹理”规则。真实方向/投影才决定同场资格；中心FOV、DPR或单个Moon旅程无法证其它body组合。固定源分辨率不随DPR增加，但framebuffer/程序/驱动成本会变化 |
| 地景 | mask/intersection/viewOpacity0决定wanted；每轮最多overview+detail2个decode候选，preferred返回fallback至多一个成功bitmap；scene只提交一个实际panorama source，模型过渡不引入第二张照片texture | `selectSkyLandscapeResource`按otherImages源RGBA及原16MiB目标选detail或overview，过量/pending保overview，不能从独立天体偷预算；overview仍是2MiB必需最低档，因此不是总量硬cap。page未把SDSS coarser放进otherImages；选择器不是完整GPU同时集 |
| 正常SDSS | 单个当前选中reference的publication；3个512²level，wanted至多最近2个；loader2MiB source-equivalent retention；scene至多真正coarser+fine两档，并再检查注册相交 | 全18张库存不进入同帧；但coarse/fine两个source可能均used。其2MiB loader目标控制旧资源，不替代整场预算或证明所有选择恢复路径 |
| selected W3 | 单个reference、FOV≤15依尺度选256²OV/512²MED/DETAIL；保请求及成功recovery文件，实际scene一次只用当前返回的一个decoded image；成功SDSS绘制优先，W3不会再submit | 文件/bitmap recovery可比GPU实际提交集多，不能将两个encoded lease当两个纹理，也不能将SDSS优先误写成W3解码从不并存 |
| LOCAL optical | `__MINIAPP_DEVELOPMENT_FIXTURE_MODE__`下才可启用；resolvePublishedOpticalTiles最多12个wanted512²tile；已有loader trim的16MiB source-equivalent inactive/coarse retention，scene也可提交retained粗图的有效mesh | 不是正常商业采用来源。wanted12和历史coarse fallback的实际交集另需量测；它与W3正常路径不是相同准入。不能用13正常矩阵把LOCAL恢复也验收 |

这些是当前准入publication和owner规则。更新source/catalog/resolution属于预算重新评估条件；类型存在和图片encoded byte cap也不是巨型native bitmap的普遍容量证明。本审计不把不同物理时间、不同FOV、different visibility资格或库存全相加，制造一个“可达到的最坏同帧”数值。

## 转向、旧纹理与生命周期

- Hook选择不等于GPU保留集。renderer只有确实调用 `get/getWindow` 才标记used；scene对注册图、实际mesh、地景opacity/mask和body disc再检查。一个loader暂时保留的旧decoded fallback，没有这轮提交就不会被候选finish保留为texture。
- 候选begin仍同步清理weak lifetime已退休的resident，再清空上一轮used。新upload需要room时，两轮压力淘汰只保护本轮已used和短同步pins，旧上一帧但尚未本轮used的texture可被淘汰；finish无条件淘汰本轮unused。**不会沿相机每次转向永久保留历史合集。** 较早的新source也可能淘汰稍后才提交的未来current source，造成转场重传；这是已记录冷帧代价，不能承诺所有转场0upload。
- copy临时完整源+crop、同identity扩窗、copy失败whole fallback仍可能产生额外瞬时/持续成本；候选没有修复或者隐藏这些既有路径。current used set本身超过压力目标时必须留下；没有新的全局硬memory cap。
- artwork/W3/fixed层 `suspendUnusedDecoded` 经真实 `retainFile` 退休旧bitmap，weak registry使排队/旧GPU get拒绝；SDSS/LOCAL保留的有效coarse是产品恢复需求，不能因old身份直接drop掉它。GPU以真实submission决定是否保texture，与file core lease职责分开。
- 实际 canvas lifecycle是一代一个context、一个outstanding draw；正常draw末尾finish。异常/超时走fail→reset→releaseContext，hide/resize/unmount/dispose也reset。page releaseContext调用实际renderer.dispose，同时native generation与Hook owner清理阻止旧decoded穿代。候选没有加入新的跨renderer/跨Canvas缓存。

## 开发接入的必要小条件

1. 将16MiB明确表述为allocation pressure target，active working-set按实际当前submit保留；既有foreground选择继续以此保守目标选档，不能称其总量上限。原机械候选需要修正frame-end cap / single-image原eviction / finish normal budget旧注释；闭包补读的新current owner已纠正这些表述，数值未抬高。原只验证旧淘汰合同的测试应迁移为新需求不变量；本条不审计或重复运行root当前测试。
2. 建议仅补一条owner回归：小压力目标下，frame A={A,B}成功且高于目标；下一frame={B,C}，先reuse B再需要C，必须在pressure时释放仍current但本帧不用的A、保住已used的B；finish留下恰好B/C，之后empty/dispose0。这个交叠转向case应覆盖“新一帧没有source退休，也未切Canvas”的inactive release，防止把weak-retirement或全dispose当正常转向证据。现有同像素13矩阵+pair/failure/context-loss证据继续复用，毋须新大矩阵。
3. 继续记录已确认的转场upload/peak、active持续驻留和未测source组合；native总资源与最终交互验收保留，而不把该缺口误宣称是实现所需的先验批准。

此判断允许继续形成可review的开发改动，不自行批准生产发布、云部署、source采用、native容量或最终Goal完成。
