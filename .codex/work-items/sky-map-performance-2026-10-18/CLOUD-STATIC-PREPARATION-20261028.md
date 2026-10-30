# 云量原静态owner接线：仅本地准备

归唯一 PLAN P2。Root 批准本地准备与强制禁上传边界；本轮没有修改 PLAN、HANDOFF、运行配置、DB、API、指针、worker、IDE或手机，也没有获取新源、重产9图或上传/部署。代码和真实输出待 Root 全新独审，本记录不关闭全国迁移或完整Goal。

## 同一owner中的变化

- `map-static-manifest.ts`新增独立cloud family、固定 `/v2/cloud/assets/<numericManifestSHA>/cloud-<identity>.png`及 `x-starward-cloud-publication`。cloud source的 **`admission: DEVELOPMENT_ONLY`** 与numeric manifest SHA进入严格源字段和封口hash；没有可填QUALIFIED的分支、boolean override或formal-ready文件。旧terrain/night-light源、URL、header与源identity做法保持。
- 原 `readMapPublication` 调用单一 `cloud-map-publication-input.mjs`，复用numeric manifest及共享cloud-display准入，绑定原inventory/proof/精确selectedAt/window/bracket/hash。只复制实际已存在的PNG和控制材料，不解码GRIB、重采样或重新出图。发布阶段逐图核PNG CRC、受限尺寸/格式和实际alpha的valid/missing数量；API不调用该离线adapter。
- 原 `prepareMapStaticBundle` / validate / isolated restore保cloud source原bytes与DEV身份。原source-manifest/inventory/proof只作控制材料，置于`publications/`，不进入public objects；不复制原生数值数组。**cloud不生成business-host Caddy route**，旧两层的fragment字节保持。这里只建立本地对象描述，没有API公开URL响应。
- 原OSS/ESA package生成精确的本地cloud object/header规则，并标 `DEVELOPMENT_ONLY_NOT_UPLOADABLE`、formal-ready false。`readMapObjectStorePackage`从重新准入的bundle派生实际sourceAdmissions，不信任plan展示字段。原upload入口针对cloud在任何journal、client或remote request前拒绝 `map_object_store_cloud_source_qualification_not_ready`；删展示字段只会`package_changed`，不形成另一包类型的旁路。没有新增上传平台或虚构资格权威。
- 原HTTP contract验证识别第三个family，保cloud header/GET/HEAD/Range/304的独立代表；带cloud时结果仍明确DEVELOPMENT_ONLY/formal-ready false。它验证传输契约，不证明OSS、源组或完整发布资格。

执行入口仍为 `tools/deployment/map-static-bundle.mjs`，本地cloud参数与禁上传边界已补原 `infrastructure/deployment/README.md#map-final-product-static-adapter`。没有新增计划或另一个发布流程。

## 必要检查

- 原static bundle文件 **4/4通过**：旧publication及window行为、cloud复制/联合/隔离恢复、旧record/header/fragment字节、错numeric pin、重哈伪QUALIFIED拒绝，以及重新构造合法hash后的坏CRC/alpha事实拒绝。后加source descriptor数组拒绝后，只复跑受影响cloud准备case **1/1通过**。
- 原object-store文件 **3/3通过**：原两层的实际锁定SDK/immutable恢复保持，新cloud本地package、三family HTTP协议及原upload无副作用拒绝。新case使用内存HTTP oracle，无外网请求；没有把oracle协议成功冒实际OSS/CDN。
- 首轮组合检查中，static4项已通过，object-store在测试入口前缺既有隔离`oss-runtime`的ali-oss，属于harness失败。沿原README和既有锁执行`npm ci --ignore-scripts --offline --prefix tools/deployment/oss-runtime --no-audit --no-fund`恢复89包后，单独重跑该失败文件3/3通过；没有改SDK版本/依赖声明或联网安装。
- `npm run typecheck --workspace @starward/miniapp-api`实际exit0。没有运行整仓测试或构建；统一构建和Git仍由Root负责。

## 原9张真实pilot读回与本地封口

原numeric manifest SHA `0569b5777aa8c6aef3f0ad61a9832902b1e47bb8ddddaebf39a33badd9bdc26c`，原display inventory SHA `e28cbf7b30292baf5ea3d708c936b9058fa50733d92dd6054289b3cda96723e0`。均来自原cloud目录；未重哈/重读原GRIB或137MB数值数组，未改旧proof/6个codeHashes/PNG。

已先确认不存在并独占的新根：`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/static-preparation-20261028`。外层脚本为同cloud根的`static-preparation-20261028.prepare.mjs`；在作用前记录PID、input/code hashes和STARTED，终态归`result.json`，进程已exit0，勿因起始记录再运行。

- sealed输出：`static-export/publication`；Map hash **`92fd159dd56fb7ba3ea37dfdfc636a0c54f67c2b053d2a0aa58b5408e7bdb868`**，9个PNG / **583,085 B**，一个DEVELOPMENT_ONLY cloud source，business-host cloud route数量0。
- 本地OSS计划：`oss-preparation/package`，package SHA **`b07fbf4a63c998634e36dd987c6215a7859099ebde0c5dbe4f3bc1361c98227d`**。origin仅为`https://map-assets.example.test`的离线示例，**不是已配置服务/域名或正式URL**。
- 原9份PNG/proof、原inventory及source manifest共20份文件的SHA/字节前后相同；实际通过原publish adapter的CRC/尺寸/alpha校验，2,752,512有效像素，zero metadata合计776,604。zero metadata不是从PNG反推数值，也不建立云量精度/全国质量。
- 对该真实sealed source实际调用原upload资格入口，固定拒绝在client前：**clientCalls0 / journalCreated=false / remoteRequests0**。没有提供真实凭据、创建对象或访问示例origin。
- `result.json` SHA **`7603989b3d3b344eb5a1961bfe9d31033c53a1e3aa16f5d7a5427a8e21c6a543`**。随后补source descriptor数组拒绝，未重新复制/封口；`post-edit-readback.json`用当前owner重新验证原sealed artifact/package，身份同上、原20份source未变，记录当前adapter SHA `8aab1f9517673942aff2afab125496dbf19818e517daf50b0cc731e8e1115cba`。原result中的code hash保持其真实运行时身份，没有改写历史结果。

## 仍未建立的资格

上述是有限本地静态准备，source-group **UNKNOWN** / formalReady **false** / runtimeActivated **false** 不变。真实连续源批次、更正组权威、全国基础图/画质与必要补图、正式对象上传读回、完整ready/current、客户端第三层安装/预算、整组回滚、容量及目标可见/资源回落仍沿原PLAN未完成。不能以该local package、拒绝前置或fixture/协议通过代替它们。

## 全新独立只读审阅

`review_cloud_static_preparation`已沿当前合同、原静态/对象存储owner及真实输出完成独审，未发现本次本地准备范围的阻断。独立复跑原两个文件共 **7/7通过**，覆盖旧两层的route/header/fragment/恢复、DEV封口与重哈伪QUALIFIED、PNG CRC/alpha反例及上传前置拒绝。复用现有已恢复SDK runtime，没有安装、构建、凭据或外网操作。

独立重开原9图sealed输出与本地OSS package，publication/package SHA均与上文相同，9 PNG共583,085 B；原numeric manifest、display inventory及9对PNG/proof共20个来源文件与封口副本逐字节一致，读取前后原件未变。原准入owner再次执行实际CRC/尺寸/alpha检查；business-host cloud route为0，控制JSON不在public objects。未读取原GRIB或137MB数值数组，也未重新生产。

对真实sealed source独立调用原upload入口，得到精确 `map_object_store_cloud_source_qualification_not_ready`，clientCalls=0、journalCreated=false、externalCalls=0；用同一真实Map bundle/package调用原Sky package读回也以 `sky_static_index_invalid`拒绝，没有跨包类型旁路。DEV来源来自bundle重新准入，不依赖调用方或可删计划展示字段。

独立读回：同新根`independent-review-readback.json`，SHA `1f1f1e04261d8bc23a118106245d1b42d1461be7cc2d8ee69e307371e52c2725`。本代理只追加此证据与该只读receipt，未改生产代码、PLAN/HANDOFF或运行状态；source-group UNKNOWN、formalReady/runtimeActivated=false保持。此独审不关闭正式源组/全国/OSS/CDN/完整ready/客户端/容量/目标端义务。
