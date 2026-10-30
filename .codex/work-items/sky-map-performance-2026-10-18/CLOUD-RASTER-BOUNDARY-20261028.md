# 云量栅格合同与只读成品边界（2026-10-28）

归唯一 PLAN P2 的既有能力接通；没有修改 PLAN、配置或发布指针。此结果只准入已存在的离线资产，不建立全国显示规格或正式地图可用性。`getMapCloud` 对新合同仍为明确503；数值 `ready-v1`、source-group UNKNOWN、formalReady false 保持。

## 共享责任与实现

- `packages/miniapp-contracts/src/cloud-display.ts`拥有既有 v1 display proof/inventory 的类型、身份构造和结构/时空准入；`prepare_tcc_display.mts`与只读reader实际共用同一构造/校验，不另写一套producer规则。source manifest/pub/run、原生bracket及数值端点hash、精确selectedAt、固定window/内部逐像素GCJ加工声明、style、图像hash/尺寸和有效/零/缺测数量均保留。
- 既有6份codeHashes的pilot仍按原身份只读；未来producer另外捕获新增共享合同与UTF-8完整性owner，共8份。新处理输出另得内容身份，不改旧proof、PNG或inventory。有限16 windows/289 times及768边长限制复用原producer边界，不能解释为全国LOD规格、服务容量或native像素预算。
- `MapCloudRaster`是独立百分比/ECMWF原生格网合同；`MapLayerData.cloudRaster`与年度夜光`raster`、旧九点`MapCloudSnapshot v1`分开。真实source run、240h覆盖deadline、selectedAt、bracket与图像身份不会借`weatherAt`或nW/cm²/sr表达。240h覆盖deadline不证明批次及时性、最新run或跨更正组资格。
- `workers/miniapp-api/src/cloud-display-publication.ts`绑定已准入numeric handle与调用方显式inventory SHA，只对所需固定window/精确时刻做有界索引、proof与已准备PNG的身份/header读取。单reader取消不会关闭其它reader；owner close退休自己的读者。没有GRIB、重新采样、配准、PNG解码编码、队列、缓存、指针、ready或URL生成。
- 不命中精确时刻/完整viewport/固定window返回NOT_READY，不借邻时图、不扩大未查询coverage；超时域为OUTSIDE_COVERAGE。有效零保留，整图源缺测为SOURCE_MISSING，有效与缺测并存为PARTIAL；损坏/错pin明确抛读入错误而非透明清空。复用Context的完整240h边界，until仍有效、+1ms过期，并在异步读取完成后再核，不能以I/O等待延长有效期。
- 当前reader只返回`PreparedMapCloudRaster`，刻意没有`imageUrl`。完整`MapCloudRaster`的URL仍须由后续正式静态发布owner在实际OSS读回后映射；本地文件存在不授权公开URL或新Context pin。

## 实际检查

`node tools/run-node.cjs --import tsx --test workers/miniapp-api/src/cloud-display-publication.test.ts`：最终 **4/4 pass**。夹具实际经过原离线producer及数值reader，覆盖原生/插值/相同instant不同offset、零与缺测、错pin/邻时/coverage、取消/close、until/+1及异步完成后expiry、文件损坏与错误几何/bracket。完整PNG CRC/decoded alpha数量在离线验证中读回，未把解码放入API reader。

`npm run typecheck --workspace @starward/miniapp-contracts`、`npm run typecheck --workspace @starward/miniapp-api`最终通过。首次typecheck发现本轮`unknown/null`与never/predicate控制流narrow问题，已窄修后复跑；没有构建、IDE或手机操作。

原真实pilot只读：

- numeric：`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/batch-2026102700-qualified`，manifest SHA `0569b5777aa8c6aef3f0ad61a9832902b1e47bb8ddddaebf39a33badd9bdc26c`。
- display：同cloud根的`display-pilot-current`；inventory SHA `e28cbf7b30292baf5ea3d708c936b9058fa50733d92dd6054289b3cda96723e0`，原inventory identity `cloud-display-inventory:87b93ad13a1abc53b942b1f15951b75e3afb9a1897ba1f40f01c59972aa8aa28`。
- 新owner已依次准入 **9/9** 实际资产，全部原文件SHA、proof身份、window、selectedAt与source bracket通过；每图另在离线核CRC、宽高与alpha有效数，总 **2,752,512** 像素全部有效，zero metadata **776,604**。3种fraction为0、0.5和3→6h过渡中的0.5833333333333334，未将精确时刻取整。
- 读回使用该批既有qualifiedAt `2026-10-27T18:50:00Z`作为明确历史时钟，不重写来源取得时刻；本轮现实时间仍可覆盖240h的布尔读回为true（2026-10-27 23:59 UTC附近）。这不建立持续批次或更正组资格。没有重产9图、获取新源、上传、切指针、启worker或改变API运行态。

## 下一依赖与保留缺口

后续 [Map只读时刻与数值timeline责任](CLOUD-MAP-READ-INTENT-20261028.md)、原静态 DEV 准备和第三 Map 消费者已分别完成其当前责任层检查；最新集成/构建与明确未验边界沿 [CLOUD-MAP-CONSUMER](CLOUD-MAP-CONSUMER-20261028.md) 及 HANDOFF，不把本阶段旧描述当当前待办。数值 timeline 与 display NOT_READY 分开，正式新grid生产仍503；没有借局部实现开放数据资格或正式URL。

本责任层的独立审阅只覆盖下方原范围。后续原静态owner保持 DEVELOPMENT_ONLY cloud family 和强制禁上传；共享客户端文件/安装owner已接通云量及最终EOG HTTPS语法和第三层生命周期，正式OSS/ESA、完整ready/current、全国规格、补图、三层实际合成/物理释放及容量仍未完成。不得把本地有界PNG hash/header读回冒请求容量，实际状态仍只归HANDOFF。

有限基础图画质、全国覆盖/边缘、必要补图、连续00/12/源修订、所有消费者切换/回滚、正式分发、混合容量、目标可见/资源回落仍欠；本检查不关闭P2、D1或完整Goal。

## 全新独立审阅（2026-10-28）

`review_cloud_raster_boundary`只读核P2、共享合同、数值pin/坐标owner、完整reader与离线producer的实际调用关系，独立复跑原聚焦4/4通过；未改生产代码、PLAN、HANDOFF、运行配置或服务。

独立重开原9张真实pilot及原数值manifest，通过新`CloudDisplayPublication`逐项返回：source publication/manifest/run、精确selectedAt、原生两端/fraction、window/完整viewport、PNG/proof SHA及尺寸一致，Prepared无imageUrl。离线PNG CRC/decoded alpha复核共2,752,512有效像素、missing=0，zero metadata合计776,604；fraction为0/0.5/0.5833333333333334。原inventory SHA仍`e28cbf7b30292baf5ea3d708c936b9058fa50733d92dd6054289b3cda96723e0`，旧6 codeHashes保持，4个本轮源码SHA仍与下表一致。读回明示使用历史时钟2026-10-27T18:50:00Z，不重产、不获取、不切ready/current、不提供正式URL；原source-group UNKNOWN/formalReady false不变。独立只读脚本与结果在同cloud根的`cloud-raster-independent-review-20261028.{mjs,json}`。

未发现本次1–3合同/本地成品准入的阻断。后续正常API接线仍须按原静态发布owner建立实际OSS读回与完整ready，不能将当前local admission中对完整PNG的有界hash/header读回当作已完成的请求路径、并发或容量资格；该reader不做PNG解码/编码，其存在不替代发布阶段的全量资格或目标端结果。本审阅复用仍适用的既有数值/配准证据，没有重新证明整个全国供给、源更正组或手机性能。

## 本轮源码身份

Root独立读回guard窄修时，进一步发现原`FILTER_OPTIONS.map`/`FILTER_GROUPS.map`名称例外不能继承给新增坐标owner；隔离真实guard反例在修前出现Missing expected exception。现将此例外和既有filters schema条件严格限原contracts/filters.ts，其它模块和坐标同样拒绝不确定调用。修后实际入口、隔离边界与真实webpack组3/3；未改原科学合同、依赖或guard公开签名。最终fresh独审同样3/3通过。Root完整重建46.8s退出0/10条既有warning，恢复完整337文件/5,120,462B、SHA`8458cfe2968442d6ae4f9bcbb4060a28d2c02bb3a2cc27278c3f588be91908ff`，main2,067,804B与c090相同、全部包体预算通过；canonical已官方refresh并取得Map实际帧。原C090当前receipt另保`ordinary-weapp-build-c090.json`，失败日志及INVALID_PARTIAL记录保持，不改为成功历史。新包未推手机，不代正式消费者、全国/OSS/目标验收。

| 文件 | SHA-256 |
| --- | --- |
| `packages/miniapp-contracts/src/cloud-display.ts` | `a144194568cf0482f6bf72713009598287337274cd4327b96fab2cfaf770a3e9` |
| `workers/miniapp-api/src/cloud-display-publication.ts` | `02523825c4a33bf529d37191627401437a185b856a1a7ac202b172bfed45a374` |
| `workers/miniapp-api/src/cloud-display-publication.test.ts` | `a37c535e2d9e441b5b4d7098ab27c6c90e4265dde26acfc47c4b30591efe8ea1` |
| `data-pipelines/cloud/prepare_tcc_display.mts` | `df87c04e443428576bc42bd5581e01a46ca54a07c47eca25801ea578eb26bf08` |

## WEAPP 纯初始化接线窄修

Root随后完整WEAPP构建实际触发 `miniapp_contract_initialization_requires_review`：新的 `cloud-display.ts` 首次从合同barrel传递运行时坐标import，原guard只会递归contracts本地文件及原两项noble入口。`@starward/coordinate-system` 本来就是contracts已声明的依赖，坐标包没有反向contracts依赖；此失败不需要复制几何或新增依赖，也不能关掉guard或只给包名免审。

fresh `fix_contract_coordinate_audit` 在修改前运行原 `tools/miniapp/contracts-reexports.test.mjs`，实际entry项按同一visit边界失败，原真实webpack分包/初始化项通过。仅窄改 `apps/wechat-miniapp/config/contracts-reexports.cjs` 与该原测试：只有仓库布局中确定的真实 `packages/miniapp-contracts/src/index.ts` 能把精确包名映射到同仓坐标源码入口，随后以同一AST规则递归坐标本地依赖。每一owner保自己的路径范围，坐标不获得noble或其它外部入口，未知依赖、全局/注册/I/O初始化及跨root引用继续拒绝。Windows路径仅按实际平台做大小写等价；没有调用方可传的root、免审标志或Node ambient package fallback。公开签名/声明、合同、数值加工和已有proof身份未改。

修后原守卫组 **3/3通过**：实际当前合同入口、隔离仓库布局中的纯坐标传递与拒绝反例、原真实webpack行为。隔离布局直接求值实际guard源码，核传递global/register、node:fs、未知包、坐标未声明的noble、跨回contracts、任意入口及包子路径拒绝，未修改真实共享源码；Windows同一入口改大小写也通过。仅使用受控临时文件并按既有受限路径核验后清理。没有在本agent运行完整WEAPP构建、API、IDE或设备；代码已释放，Root独立读回与完整重建才能恢复实际coherent候选，此守卫检查不代替产品或手机验收。

### 守卫接线最终版独立窄审

fresh `review_contract_coordinate_audit` 完整读回最终两个文件、坐标包实际三份源码依赖及contracts已有依赖声明，独立复跑原守卫组 **3/3通过**。精确workspace入口绑定后仍逐文件执行同一AST准入；路径比较、seen身份与owner根界限一起按Windows大小写等价工作，未采用Node ambient resolution或包名免审。坐标owner不能取得原contracts的noble入口、filters名字例外或反向跨根引用。

Root追加的真实隔离反例也在独立复跑中生效：坐标文件定义伪`FILTER_OPTIONS.map`并把全局赋值藏在其函数体内，仍被拒绝；允许名字映射的例外只留在contracts自身filters责任。原实际filters准入及真实webpack的main初始化/sky-only分包行为保持。未发现本轮最终差异的阻断；没有修改生产源码、PLAN、HANDOFF，未运行完整WEAPP构建或操作API/IDE/设备。完整生成目录恢复、包体和当前页面读回仍由Root完成，三项守卫检查不代替这些结果。
