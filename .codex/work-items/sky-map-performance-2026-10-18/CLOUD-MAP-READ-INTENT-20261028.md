# Map grid 只读时刻与数值时间支持

本轮执行唯一 PLAN P2，Root 只授权责任 A：跨端读时刻、显式数值 timeline/availability 与纯投影。第三 native 安装、下载 URL、队列/补图和正式 ready 未在本轮实施；当前新 grid 生产分支仍明确503，source-group UNKNOWN/formalReady false 保持。没有改 PLAN、HANDOFF、运行配置、DB、API进程或手机。

## 责任与语义

- `MapCloudRequest.selectedAt` 为可选精确只读参数，由 `mapCloudReadInstant` 共用严格UTC instant校验/规范化，保毫秒、不取整。client与controller复用该函数；省略参数的legacy响应保持原Context时刻表达。当前服务仍不给grid成功响应，合法参数到达后继续 `cloud_grid_provider_not_ready`；非法时间400，legacy显式preview在任何九点读取前400。没有用DEV URL、placeholder port或资格boolean开启成功路径。
- `map-cloud-grid-timeline.ts` 为共享DTO/纯投影owner，`MapCloudData`可独立携带`requestedAt`与`gridTimeline`，原`context`保持已提交对象。timeline明确是某个实际WGS84查询点的native scalar时间支持，复用 `CloudPointForecast`/`CloudPointSeries`/原采样；不是视野均值、全栅格空间覆盖、Spot信号或v1 cells。
- 数值可用、真实零、SOURCE_MISSING、READ_FAILED、OUTSIDE_COVERAGE、EXPIRED、UNAVAILABLE及未读取到该时刻的NOT_READ分开。有限已读series没有某日期的端点时，仍保完整pin的validFrom/validTo与240h截止，不把该次窗口缩成整个source的范围。可用interval只来自实际有资格的native端点，相邻缺测不跨越，孤立native瞬间保为零长区间。
- 纯模型的display为NOT_READY，独立于数值availability。没有该fixed window/精确时刻的PNG，不能据此抹去有效数值或宣称源缺测；一个查询点缺测也不等于整幅图缺测。原API成品/OSS/source-group权威仍未齐，本模型不创建imageUrl或ready。
- `mapCloudGridReadMatches`核独立requestedAt、原Context身份/版本/fingerprint/已提交时刻与pin；旧默认时刻响应、旧绑定或preview偷偷改context均不能匹配。该函数只核读结果身份，原时效投影和native可见回执仍各归其owner。
- Map仅new-contract lane的query key增加原pin和canonical读instant；ruler preview/cancel只变读intent，不PUT公共Context。legacy继续从原snapshot本地投影，不因拖动重发九点请求。原尺仍为半小时轴加额外已提交精确instant、单夜最多49点；原日期访问（过去7天/未来15天）与CAS不变，不能据49点/PNG集合或QWeather24h裁剪云量240h合同。此阶段不增加UI分钟控件、修改图层视觉或重写原时间交互。

## 实际检查

- API原workspace的最终聚焦 **19/19通过**：新模型4项（实际二进制reader/point-weather，含NaN+mask缺测与坏hash读失败）、原BFF组合12项、原HTTP3项。实际HTTP补核非法参数与legacy preview为400、没有增加provider调用或改Context；原省略参数成功响应继续相同，当前grid合法精确参数仍503。
- 小程序原workspace聚焦 **9/9通过**：实际Map/ruler callbacks→query key→api-client读取，preview后新lane精确时间入key及query、cancel回原key，Context对象未变；legacy key不变/不传selectedAt。原关闭时session待决/在途取消、两层独立和原图层/来源钟检查保持。
- contracts、API、小程序noEmit均通过；新合同图的原纯初始化审计通过。未生成SDK、完整构建、刷新IDE或推手机，均归Root统一操作。
- 初次测试从repo根启动前端/HTTP分别缺Taro路径映射与experimental-decorators，是harness cwd错误；改用各自原workspace后通过。第一轮两个新fixture把canonical native instant预期写成保`.000Z`，已改为既有规范形式；生产legacy省略参数刻意保原Context字符串。首次noEmit发现既有type-predicate在false分支将已PINNED变量narrow为never，改在判断前捕获截止；前端AST harness递归read补返回类型。没有放宽产品规则或断言。

执行入口：

```text
# cwd workers/miniapp-api
node ../../tools/run-node.cjs --import tsx --test src/map-cloud-grid-timeline.test.ts src/cloud-weather-composition.test.ts src/map-cloud-delivery-http.test.ts
# cwd apps/wechat-miniapp
node ../../tools/run-node.cjs --import tsx --test src/pages/map/cloud-map-consumer.test.ts src/pages/map/map-layer-query-retirement.test.ts
```

## 原真实数值只读接线

同cloud根下 `map-grid-read-model-20261028.readback.mts` 与 `map-grid-read-model-20261028/readback.json`；receipt SHA **`aab808fa8acb4f1b41f566f14d0bf8b17f2a4e85baf11843740cc08bc936774e`**。原manifest SHA仍`0569b5777aa8c6aef3f0ad61a9832902b1e47bb8ddddaebf39a33badd9bdc26c`，显式历史时钟沿原qualifiedAt `2026-10-27T18:50:00Z`，不改取得时刻或Source原件。

三个不同机制的真实代表路径（内陆有效零、沿海插值、144→150h间隔）均经原numeric owner/CloudPointWeather→新纯模型，selected数值AVAILABLE且内陆为真0。分别请求比已有PNG时刻晚7分12.345秒的精确instant，数值仍AVAILABLE、原CloudDisplayPublication实际返回NOT_READY；未借邻时图、重采样或重产。读模型保完整validTo与supports240HoursUntil，当前点series之外的另一天为NOT_READ。只有有限frame数值读取，没有获取GRIB、扫描全部图片或构造正式URL；原PNG/inventory/proof不变。五份相关源码在读回前后SHA一致。

此结果证明数值时间支持/读intent与显示未就绪可以真实分开，不证明HTTP地图成功、全国画质/规格、持续批次/更正组、OSS/CDN、三层native合成/像素预算或资源物理回落。Mask缺测与坏hash机制来自明确隔离fixture，未把它们冒真实批次观测。

## 源码读回身份

| 文件 | SHA-256 |
| --- | --- |
| `packages/miniapp-contracts/src/map-cloud-grid-timeline.ts` | `7c219dd9199daa4776eed3f0fd10de7e46de61e5450dcd31260a34912ce5bd8b` |
| `packages/miniapp-contracts/src/api-shapes.ts` | `540557bf3abb096f2a330e53a9669efa27ce7d7785525dd268308de92e8d5700` |
| `apps/wechat-miniapp/src/pages/map/index.tsx` | `20f928305c8f93102bb0c99d9bbe58ae72790bbf13eeefd62f0015d5538a20fa` |
| `apps/wechat-miniapp/src/services/api-client.ts` | `cec854ae3320ba8cd70b744d4a407e75c3124be5e043a40cd0185c70c920d77c` |
| `workers/miniapp-api/src/controller.ts` | `dff04eddd6ad534da5a301afde552dfece8c3be166aaeb37ae23d6fefdc7244c` |
| `workers/miniapp-api/src/miniapp-service.ts` | `27c44f483540c503d8ce7262c43e1a966c05cf4f34c25f595294b535eff09c4c` |

Root须fresh独审后再依赖扩展。数值timeline到实际Map呈现、正式图片映射和第三安装/共享退役仍未接；任意合法精确时刻未预制时仍需原有界补图责任，不能以NOT_READY永久代能力完成。完整Goal保持active。

## Fresh 独立审阅：全部源缺测的语义尚未闭合

独立读回当前共享timeline、原point-series/采样、controller/service/API client、Map query与原preview/cancel回调；独立在各自原workspace执行 API **19/19**、小程序 **9/9**，均通过。另复制原只读读回脚本到新的owned输出目录，实际重开原numeric/三个窗口及精确+7分12.345秒路径：数值均AVAILABLE、有效零为0，原display均NOT_READY，Context写入/URL/新源均为0。独立receipt为 `E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/review-map-grid-read-model-20261028/readback.json`，内容SHA仍为 `aab808fa8acb4f1b41f566f14d0bf8b17f2a4e85baf11843740cc08bc936774e`；原receipt没有覆盖。这个确定性内容hash相同不意味着省略了独立执行，也不升级正式资格。

**发现一项扩展前须修的具体差异。** 原 `CloudPointWeather.getForecast` 在整个请求窗口没有任何AVAILABLE endpoint时，返回 `value:null / state:UNAVAILABLE`，丢弃已读native帧的MISSING质量。新 `mapCloudGridAvailabilityAt`只能沿该结果投为UNAVAILABLE。因此“全部endpoint都为源缺测”无法按新合同投成SOURCE_MISSING；现有中间一帧缺测case仍有其他AVAILABLE帧，不能覆盖此路径。

实际反例使用原binary fixture及numeric owner，设置本次0/3/6h三个endpoint全部mask=0与NaN，文件摘要/声明在该独占临时fixture内一致，未改真实批次。实际owner输出 `value:null / UNAVAILABLE / errorCode:null`，新模型为UNAVAILABLE；期待SOURCE_MISSING的断言实跑 **FAILED**。同一owner对crop之外的点也输出完全相同三元组，所以不能把null+无errorCode一律猜成缺测。反例脚本/结果在同cloud根的 `review-map-grid-availability-mechanisms-20261028.mts` 与同名 `.json`；临时fixture在finally退休，原数据/代码/DB/API/配置/设备均未改。

修复须在原point-forecast边界保留结构化不可用原因或等价的native质量事实，再由新模型区分；保旧消费者兼容，不以新fallback、零值或图片NOT_READY代源缺测。当前grid生产仍503，所以没有在本轮激活有问题的地图路径；但该责任A在此差异修正/针对性复核前不标完整通过，后续native/正式接入应保该缺口。已有通过检查与真实读取结果仍按各自范围有效。Root的SDK/build、运行HTTP及目标端验收仍未由本独审代办。

## 全窗口不可用语义修复与回归

本节是上述独审差异的源码修复证据，尚待Root fresh独立复核。未改PLAN、既有BFF/Source/UI/请求key或部署资格；当前grid生产503、display NOT_READY和后续完整Goal义务仍保留。

`CloudPointForecast`在原`value/state/source/errorCode`之外增加可选`unavailability`。有空间/时间知识的原`CloudPointWeather`分别保留`OUTSIDE_SPATIAL_COVERAGE`与`OUTSIDE_TIME_COVERAGE`及同pin/point；整个窗口没有AVAILABLE endpoint时保留`NATIVE_POINTS_UNAVAILABLE`下同次实际已读的`CloudPointSeries`标量质量事实。该分支仍返回`value:null / state:UNAVAILABLE`；纯mask缺测仍无errorCode，真实读失败仍保原errorCode。没有复制数值格网、增加读取窗口、延长TTL或改变原天气可用/fallback策略。

新Map投影沿这些已读endpoint的实际bracket区分SOURCE_MISSING与READ_FAILED，不用整个forecast的errorCode覆盖独立missing endpoint。源pin之内但不在本次已读series内的另一日期保持NOT_READ；源时间范围外、原crop外与过期分别保持OUTSIDE_COVERAGE/EXPIRED。只有旧null+无errorCode的未知结果仍为UNAVAILABLE，不推断缺测。retained facts同样校验pin/point身份，不能把另一个查询点的缺测或crop事实用于当前点。

原空间采样资格判断窄提取到`cloud-grid.ts`的共享predicate，原point-weather复用采样自身的**1e-9 grid-index边界**，避免旧1e-7度保守包络把裁剪外点误归缺测。原坐标换算、snap、双线性权重、mask/零值、时间算法和采样version未改；采样热路没有新增逐像元对象或重复坐标换算。原真实manifest/proof/PNG/inventory与取得时刻均未改写；本节源码身份独立于前面的历史读回快照，未来重新加工仍须按当次源码建立新epoch。

实际验证：

- 同一actual numeric owner回归在修复前实跑：旧4项通过，新增3项分别因全源缺测误投UNAVAILABLE、crop外误投UNAVAILABLE、混合缺测/读取失败窗口的独立缺测endpoint误投READ_FAILED而失败；修复后**7/7通过**。补核原采样容差内有效edge仍为真零、容差外近edge为OUTSIDE_COVERAGE，源240h日期未读仍NOT_READ，时间外/过期不复活。
- 原独审counter保留FAILED历史，不覆盖。只替换write-once输出路径的同脚本在修复后实跑通过：`review-map-grid-availability-mechanisms-repaired-20261028.mts`与同名`.json`，均位于`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/`。结果仍为`ownerState:UNAVAILABLE / hasSeries:false / errorCode:null`，但crop外为OUTSIDE_COVERAGE、全mask缺测为SOURCE_MISSING、display仍NOT_READY。修复后receipt SHA-256为`3c016122e688e597c0b6c96ee61df327512213892599243b3898a074bfe9e63e`。原反例receipt SHA仍`7491e2affa3186bc375d05946b4eaacc491faca445a717a29fcb757a091e9b99`。
- 实际受影响窄组：timeline **7**、原天气组合 **12**、原numeric publication **6**，合计**25/25通过**；原共享cloud-grid采样组**4/4通过**。原天气组覆盖独立QWeather完成、peer deadline/取消、共享队列、部分结果、expiry与不fallback等既有机制。最后补入retained facts的point身份断言后，timeline再次**7/7通过**。contracts/API noEmit通过。没有跑全量suite、生成SDK、build、启停API/DB/worker、刷新IDE、推手机或重产真实PNG。

执行入口：

```text
# cwd workers/miniapp-api
node ../../tools/run-node.cjs --import tsx --test src/map-cloud-grid-timeline.test.ts src/cloud-weather-composition.test.ts src/cloud-publication.test.ts
node ../../tools/run-node.cjs --import tsx E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/review-map-grid-availability-mechanisms-repaired-20261028.mts
# counter输出为write-once；已存在时不要重复执行覆盖，fresh审查使用自己的独占receipt路径
# cwd packages/miniapp-contracts
node ../../tools/run-node.cjs --import tsx --test src/cloud-grid.test.ts
```

修复源码身份：

| 文件 | SHA-256 |
| --- | --- |
| `packages/miniapp-contracts/src/cloud-grid.ts` | `b422aceb0a155764018b1344ea5a55717a193a9fe1d75daddba8aaea54634106` |
| `packages/miniapp-contracts/src/cloud-point-series.ts` | `96e0f852ec1c5400f835fd1c7b4b3a32698dc9dbc52c18c699431ec60cd131bb` |
| `packages/miniapp-contracts/src/map-cloud-grid-timeline.ts` | `48a13b902c968eef01398f7363a401e0aacee6b037025ca366d40dcbd71bfd47` |
| `workers/miniapp-api/src/cloud-point-weather.ts` | `11786470abaafb28a535c75117156de8d8e3663de28fd6a8e2a2f23d3b8b90ca` |
| `workers/miniapp-api/src/map-cloud-grid-timeline.test.ts` | `7929e2088b75812970d50081acb0358a3d458aab5e7745ba63d9a8243b2debed` |

## Fresh 独立窄审：全窗口不可用修复

独立审阅原失败/修后counter、当前point-weather、共享forecast类型、timeline与采样覆盖predicate，并复核原天气组合消费者。未发现本次修复需阻断后续集成的差异：原`value/state/source/errorCode`语义保持，只有同次已读native标量质量保留于可选事实；未知null仍为UNAVAILABLE，真实零仍为0，混合窗口按所选实际bracket区分缺测/读失败，未读日期不冒作缺测。原crop知识、源pin时间范围和expiry各自界定；采样热路复用原1e-9索引覆盖规则，无新增逐像元对象/重复坐标换算或采样version变更。

fresh实际执行原受影响API三组 **25/25通过**、原共享cloud-grid组 **4/4通过**。其中原天气组继续覆盖独立QWeather完成、peer取消/截止、共享队列、部分结果、缓存生命周期与expiry、不fallback。未重复全量suite或noEmit；沿用上一节针对同五份源码身份已通过的contracts/API noEmit，不把静态检查或本窄审视为目标端验收。

另将原修后counter仅替换write-once输出路径，独立重开隔离binary fixture及原numeric owner：crop外OUTSIDE_COVERAGE、全部mask=0/NaN为SOURCE_MISSING，旧owner三元组仍`UNAVAILABLE / value:null / errorCode:null`，display仍NOT_READY。独占脚本/receipt为同cloud根的`fresh-review-map-grid-availability-mechanisms-20261028.mts`/`.json`，receipt SHA-256为`3c016122e688e597c0b6c96ee61df327512213892599243b3898a074bfe9e63e`；原FAILED与修后receipt摘要均保持，五份源码hash与上一节完全相同。此次实际重执行的确定性内容相同不代替原失败历史。

仅补本证据，未改生产代码、真实数据/旧PNG/manifest、配置、DB/API、IDE/手机或PLAN/HANDOFF。当前新grid生产分支仍`cloud_grid_provider_not_ready`的503；正式下载/补图/native呈现、性能和完整Goal的既有未验义务继续保留。本结论只闭合上述全窗口不可用语义修复，不宣称责任A全部产品验收或完整Goal完成。
