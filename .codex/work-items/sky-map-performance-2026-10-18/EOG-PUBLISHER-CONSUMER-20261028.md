# EOG 多 part 发布候选与现用 Service 边界

本轮接续唯一 PLAN P2，沿原 `publish_eog_viirs.py`、原科学校验及 `NightLightService` 责任实现代码与隔离 fixtures。未发布新的实际数据版本、写数据库、切配置、启动 API/worker、上传或部署；当前共享 API 不会因为这些非 watch 源码改动自动采用新实现。`PREPARED_ONLY` 与真实数据库 `PUBLISHED` 仍是不同事实；本轮不构成全国完整资格或完整 Goal 验收。

## 原发布器与共享科学责任

- `publish_eog_viirs.prepare_sharded(paths, index_path, index_sha256, node="node")` 接受显式完整 part manifest 集合与既有 `index.json` pin。先核 root、part 数量/原 manifest 原始字节 SHA 和共同年份、产品、acquiredAt、band、原件两 SHA、阈值；每个实际解析后的原件路径只做一次完整 SHA，不以同名/同声称 SHA 跳过另一个实际路径。原单 part 10° 限制保留，不把两 AOI 或一个 cell 证明当全国资格。
- `eog_sharded_inventory.validate_publication` 为原 sharded owner 的只读完整准入：复用 `read_inventory_with_proofs` 的原六 band/数值/源 PNG 规则，逐一核复制成品、contrast、proof 和 pin，重建预期原 shard/root 文档核完整声明。该方法不调用 `prepare_index`、producer 或复制入口；发布阶段完整批次检查不进入 API 请求路径。
- `prepare_display_eog.mts --validate-parts` 以一次有界 JSON stdin 接收全部 part，不每 part 起进程。复用原 source/proof 读者与 `validateNightLightContrastDisplay`，检查 PNG CRC、尺寸、完整身份和实际每像素 RGBA；与原 producer 共享同一 palette/contrast identity。验证入口不编码或写图，原 producer 的 style、proof 和 PNG 输出规则保持。
- `eog_raster.read_native_point_selection` 只向原 radiance/cf_cvg 各请求一次 masked、boundless 原生 3×3 小窗。`eog_fixed_publication.sample_source_point` 使用所有已声明原生 part footprint 的 union mask，在同一个九像元支持与完整物理面积分母上调用原 `fixed.aggregate`，保持 median/p10/p90、质量与真实零含义。跨 part 只统计一次；重复/重叠不重复面积，缺口不发布，不平均各 part 分位数，不使用投影地图像元替代 Spot。
- 原 `sample_point` 与新入口共用提取后的 `_spot_estimate`，既有 schema1/2 prepare/publish 语义保持。原 publisher 的 source registry、dataset、Spot current/overview/summary、append-only revision、Map snapshot invalidation 与 PUBLISHED 操作仍在同一 advisory lock/connection SQL 事务内。内部 `_publish_transaction` 支持一个 `EXISTS` union AOI 锁查询，重叠 part 不重复 Spot。
- 新 `ShardedSelection` 只表示已准入候选；保留原件/control manifest/root 的 stat 身份，检查准备前后及内部事务前/终态前的变化。它不是授权、ready authority 或实际 PUBLISHED 证明。

## 公共发布边界保持关闭

公共 `publish(...)` 收到 `ShardedSelection` 立即报 `nightlight_sharded_publication_not_ready`，发生在 DB 连接、锁和写之前。CLI 使用 `--sharded-index` 时，未指定 `--prepare-only` 同样在准备/DB 之前报 not-ready；`--prepare-only` 仅返回 schema3 candidate、`PREPARED_ONLY`、`databasePublication:false`、`formalReady:false`。不存在布尔 override、手工 PUBLISHED 文件、外部 receipt 格式或第二发布平台。

内部共享事务的隔离 oracle 只证明代码控制流、单次事务上下文和失败路径；没有运行 PostgreSQL，不能替代真实 SQL/并发/持久化读回。本次禁止实际 pilot 发布，因为原 publisher 会立即更新 Spot 当前投影，而 Map 选择仍来自 runtime 配置。正式静态映射/OSS 读回与全部现用消费者/配置同批切换资格未齐，公共 schema3 发布必须继续关闭。

## DB 权威选择 prepared root

- `night-light-publication.ts` 新增显式 `ShardedNightLightDataset` / `shardedNightLightDataset(record)`，只接 schema3 严格字段、共同政策/source/year/单位及固定 `shardedIndex:{file:"index.json",bytes,sha256,indexVersion}`。DB 不能提供目录或任意相对文件。原 `fixedNightLightDataset` 保持 schema2-only；旧静态导出 caller 不会误把 schema3 root 当 flat inventory。
- 原 `night-light-sharded-publication.metadata()` 仅增加已读/已验证的 radiance/cf_cvg SHA、method/style/policy/最低观测阈值，不新增读取、扫描、URL 或资格升级。
- `NightLightService.release` 先取 repository 的真实 PUBLISHED 记录，再由既有受控 publication root + 严格 datasetVersion 选目录和 DB pin。逐项比对 DB↔root 的 source、原件两 SHA、policy/method/style/阈值、index 内容版本和覆盖语义；每次缓存命中也复核当前 DB 行，不能用旧缓存隐藏记录漂移。缺 DB 行不会激活本地 prepared 文件。
- schema3 只复用现有八 release cache 和两 active binary-read 预算，root discovery 不扩并发，不加载 flat MapStatic 全国 record 列表，不扫描所有 part inventory/proof。新增内部 `preparedWindow(version,key,signal)` 仅返回 prepared descriptor，没有 URL/图片 bytes；原投影 `pixel` 仍是地图诊断统计，无 Spot BFF 替代接线。
- schema3 `layer` 和有效文件名 `asset` 明确抛 `nightlight_sharded_static_delivery_capability_not_ready`，不能返回 null 后落回旧 polygon，也不会因本地 PNG 已存在便提供 API 图片出口。正式新图及 CDN 冷回源必须沿原静态 owner 落 OSS；坐标可解析的 contrast 旧 URL 语法可复用，但本轮未授予新 URL。现有 API exception 规则将 capability 错误归为 503/CAPABILITY_DISABLED，无需修改 controller。
- 原 r6/schema2、原 opaque URL 与 contrast URL 保持原 Service 路径。未来新的 runtime-data release 必须沿原 assemble/index 保全 r6；当前 lock、包、配置与 miniapp-service 构造接线均未修改。

## 实际检查

全部检查仅使用原公开合成 fixture/各自 TemporaryDirectory；未重哈获权的 17.42GB 两原件，未生成真实图、真实新 root 或新生产版本。

- Python **27/27**：`test_publish_eog_viirs`、`test_eog_fixed_publication`、`test_eog_sharded_inventory`、`test_eog_sharded_publication`。包含原 schema1/2 数值和发布准备、成品不可变重放、六 band/原图质量、原索引字节重放，以及新增跨 part 分位数、重叠/缺口/边界、实际两个 3×3 reader 请求、双原件各一次哈希、一次只读 display 批次、不改现有文件、单 union Spot 查询与两 revision、局部失败回滚、公用发布前置关闭和错 root/缺 part 早拒绝。
- Node **30/30**：原 window/display、chunk-proof 与新 schema3/Service **19/19**，原 prepared-window 与 Map HTTP **11/11**。新反例包括已重哈的错误 RGBA 仍拒绝、CRC 损坏拒绝、验证时禁用 PNG encoder 仍成功、透明像素 RGB/alpha 保持、旧 helper 拒绝 schema3、任意 root 路径拒绝、DB↔缓存 root 的原件 SHA/阈值/source 漂移拒绝、本地成品不能替代 DB 权威及新 layer/asset 明确 not-ready。原 schema2 准备窗口/URL/缺失恢复/取消/双 proof 并发 fixture 边界通过，未把合成 fixture 当作当前真实 r6 读回。
- `npm run typecheck -w @starward/miniapp-api -- --pretty false` **exit 0**。未运行任何产品 build 或接入共享 API。

命令入口（EOG Python 为当前已有 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/.venv/Scripts/python.exe`）：

```text
# cwd: data-pipelines/dark-sky
python -m unittest test_publish_eog_viirs test_eog_fixed_publication test_eog_sharded_inventory test_eog_sharded_publication -v
# cwd: repo root
node tools/run-node.cjs --import tsx --test workers/miniapp-api/src/night-light-sharded-publication.test.ts workers/miniapp-api/src/night-light-window.test.ts workers/miniapp-api/src/night-light-chunk-proof.test.ts
# cwd: workers/miniapp-api (复用该 workspace 的 decorators 配置)
node ../../tools/run-node.cjs --import tsx --test src/night-light-prepared-window.test.ts src/map-night-light-http.test.ts
```

开发中修正了 read-only CLI 的一个括号语法错误与 PNG 库不稳定错误文本断言；最终以上检查均实际执行通过。曾从 repo root 直接执行依赖 Nest controller 的测试，因没有该 workspace decorators 配置而在加载前失败；改用既有 workspace cwd 后 11/11 通过，没有改 controller/config。原 Python 测试的 affine/合成图无地理参考 warning 不影响结果。

## 本轮文件与后续义务

增/扩接口分别位于 `data-pipelines/dark-sky/{eog_raster.py,eog_fixed_publication.py,eog_sharded_inventory.py,publish_eog_viirs.py,prepare_display_eog.mts,test_eog_sharded_publication.py}` 及 `workers/miniapp-api/src/{night-light-publication.ts,night-light-sharded-publication.ts,night-light-service.ts,night-light-display-image.ts,night-light-sharded-publication.test.ts,night-light-window.test.ts}`。未改唯一 PLAN/HANDOFF、contracts/api-shapes、client、Map query、miniapp-service、DB/repository/schema、build/lock/config 或设备。

本轮 fresh 独审已完成，结论与范围见下节。实际全国完整声明/原件与全成品质检、正式 OSS 映射/静态 URL 读回、真实 DB 单事务资格/持久化效果、Spot 与全部总云量/光害消费者同批配置切换、客户端目标实际显示与资源回落及原 Goal 其他义务仍未完成；prepared、fixtures 和软件检查通过不替代这些证据。

## Fresh 独立只读审查（2026-10-28）

审查由独立 agent `/root/review_eog_publisher_consumer` 执行，作者已释放后重新读取上述实现、原六 band/固定分级与 Spot 科学责任、相关 P2/Context 边界及实际 fixtures。没有发现阻断当前 `PREPARED_ONLY` 候选准入、受控 Service 绑定或公共关闭边界的问题；此结论不授予真实发布资格。

- 资格与完整性：核实每个解析后的原件路径分别完整哈希、同一路径跨 part 去重，未以相同声明 SHA 跳过另一路径；root 所声明的 part 数量、inventory ID、原 manifest 字节 SHA、共同源身份与 policy 均需一致。全批只读校验重建 root/shard，复用原数值/源 PNG 校验与单次 Node contrast 批次；Node 验证分支不调用 PNG encoder、producer、mkdir 或写入。
- 数学与边界：核实一次原生 3×3 读数、所有 part footprint 的布尔并集、原完整九像元物理面积分母及原分位数 owner；不平均 part 统计，不把未发布/缺测转为零。除原组外，在已有 synthetic 16×16 原件 fixture 上独立核 **12 个** west/north、east/south、精确 join、相邻 `nextafter` 与重复 union 案例；可接收案例与原完整 `sample_point` 结果逐项相等，east/south 外边界及越界拒绝，单 part join 属于右侧 footprint。所有读取仅发生于临时合成文件。
- 控制流与原路径：公共 `publish` 对新候选在 DB 连接/锁/写前拒绝；CLI 非 `--prepare-only` 还在候选准备前拒绝，没有 override。原 schema1/2 prepare、Spot 查询及 sample 路径保留。内部共享事务维持一连接、先 advisory lock、单次 union Spot 锁查询、revision 与终态同事务；局部失败不得抵达最终 PUBLISHED。真实锁、回滚和持久化语义仍只具有代码/oracle 证据。
- Service 与实际成品：核实 schema3 与原 schema2 parser 分离、受控 root + 严格 datasetVersion + 固定 index pin、路径/符号链接限制、DB↔root 源与两 SHA/政策/阈值绑定，每次 cache hit 重核当前 DB 身份；新 layer/合法 asset 明确 capability not-ready，不能 null 回退旧 polygon。未新增静态 URL、Map 接线或全国文件扫描。contrast 逐 RGBA 与身份核验共用原 palette，包含透明像素、真实零、已重哈错误 RGBA 和 CRC 反例。

独立实际执行：Python 原四组 **27/27**；Node window/chunk/schema3 **19/19**；在 API workspace cwd 执行 prepared-window/Map HTTP **11/11**；另有上述 native 边界 **12/12**。Python affine/合成图 warning 未影响结果。Map HTTP 仅为测试自身临时端口与 InMemoryTestRepository，不是共享 API 或真实数据库。

为核原有兼容责任，另只读既存 `r6-gba-20261017/nightlight/eog-vnl-v22-2025-gba-fixed-20261017-r6`：先核既有静态 export 内 `published-record.json` 的 bytes/SHA 与 `PUBLISHED` 包装，再将其 `record` 交原 schema2 parser，核 **509 项**清单及首/中/末 **3 组原 proof 与 PNG** 的真实字节/元数据；三张 PNG 分别 334、1648、712 bytes。没有读取源 TIFF、重产图片、写文件、读共享 DB 或生成新 PUBLISHED 记录。首次代表命令漏解 export 的 `{state,record}` 包装，得到 parser 的 schema 拒绝；按原格式解包后通过，属于一次检查脚本错误，不是产品故障。

本审查只补本 evidence owner；未改源码、PLAN/HANDOFF、Git、配置、数据库、共享 API/IDE/手机、构建或分发文件。未运行真实原件完整重哈、实际全国全成品质检、PostgreSQL、OSS/公网或目标客户端验收；这些义务仍按唯一 PLAN 推进。

## 原 PostgreSQL integration 入口的 schema3 准备

后续 agent `/root/eog_pg_transaction_validation` 复用 `test_publish_eog_viirs_integration.py`，未新建数据库发布入口或改 `publish_eog_viirs.py`。原 publisher 的 schema 检查明确引用 `public.*`，因此不用临时 schema/search_path 替代真实 public 表、外键和 append-only trigger。Root 单独拥有新建、迁移和执行隔离数据库的权限；该 agent 没有连接数据库、读取凭据、启动服务或写现用资料。

- 原 integration 类仍在整组开始时要求空 `spots`；新增 loopback、显式端口、安全 `starward_eog_test_*` 名称、实际 `current_database()/current_schema()` 身份守卫。Root 创建的独立 `starward_eog_test_20261028_fe98ac95b1` 可沿同一原类运行，不需删历史、放宽 trigger 或重建恢复任务库。
- 新增一项 `test_fixed_sharded_transaction_commit_rollback_and_idempotency`，使用两个实际准备/准入的相邻 source part、分界附近两个合成 Spot 及精确 east 外边界 Spot。先移除第二条 overview，让真实事务经过第一条 Spot/revision 写入后失败，再比较全部受影响表的持久状态；恢复 overview 后以同一候选提交，核 schema3 pin、两项 sample、Spot-current/完整 revision/Map 与收藏 summary、仅夜光 snapshot 退休及其它层保持。随后同版本重放须保持全部 JSON 与时间戳，不能退休更新后的夜光 snapshot。公共 schema3 `publish` 仍在连接前拒绝。
- 真实连接旁观器仅计数与转发 SQL，结果、提交和回滚都来自 PostgreSQL；不使用原 oracle 的合成返回值。Root 已实际执行并通过一次连接、一个 advisory lock、一条 `EXISTS` union Spot 锁查询、两条 revision 和一个版本终态等断言；执行与 fresh 证据审查见下节，不把准备或内部事务资格当正式发布。
- 仅为合成输入复用，`seed_spot` 增可选坐标，原 `prepare_fixture` 增可选 AOI；两者默认行为保持。离线实际准备已核两 part 在 114° 接合，两点各 9 个有效像元，median 分别 .5/50、p10=.5、p90=50，均完整面积分母。一次 console 的 GBK 编码错误仅发生于打印平方单位，改用 ASCII-safe JSON 后实际读回成功；没有改科学结果或产品路径。

准备 agent 已完成的本地检查：受影响原 `test_eog_fixed_publication` 与 `test_eog_sharded_publication` **12/12**、两份 Python 语法解析及 scoped diff-check 通过；该 agent 未连接 DB 或生产全国产品。Root 随后完成独立测试库的真实 PG **4/4**，Python 内部 17.741s、外部 wrapper 19.671s。执行时源码 SHA-256：integration `d874119a1bb9b8e4daef1c25e73d8f6f2ce4101fc94f8f4379cdd345a3ff29fc`，fixture `06a93cb2ed1b02b2e2348ce8ada51435da826626eacacdad4516b206a60b9d78`，原 publisher `4e496bf8c1f0bcd9660290b68ebec4fe9a3ba83293bf6d5eddcdbcffb0f0fe47`。之后仅测试目标守卫窄修，integration 当前 SHA 为 `052ffd87fcf1164a676dccd84ddc3f2e7e331d471d56798bae737855a51e67db`，publisher 未变。

Root 已在上述新且仅含原 26 迁移的空数据库上，将凭据仅以内存环境传入既有 EOG venv，cwd `data-pipelines/dark-sky`，执行 `python -W ignore -m unittest test_publish_eog_viirs_integration -v`，四项均为 `ok`、无 skip。未运行带 worker/其它业务的全量 infrastructure runner。安全回执与 stdout/stderr 位于 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/pg-transaction-20261028/`，隔离库已由 Root 在精确owned身份、零活动连接及受保护任务库OID核对后清理（无FORCE），cleanup.json与原执行证据均保留；不能以删历史强行重跑空库守卫，也不把内部事务资格当公共发布或正式切换授权。

## Fresh PostgreSQL 证据独审（2026-10-28）

`/root/review_eog_pg_transaction_evidence` 独立读取当前 P2/Context、测试与其 fixture、实际 publisher、Root 的 `database.json`、`integration.{stdout,stderr}.log` 和 `committed-readback.json`。本审查未连接任何数据库、重跑真实 PG 或修改产品代码；真实 SQL 由 Root 执行，审查只复核执行证据及其能支持的结论。未发现阻断本次内部事务证据的剩余问题。

- 测试目标为 Root 新建的 `starward_eog_test_20261028_fe98ac95b1`，26 项原迁移后 `spots=0`；旁观器捕获原 `psycopg.connect`，`execute`、`__enter__`、`__exit__` 均转发实际连接，没有合成查询返回或替代 commit/rollback。成功与失败后的断言分别使用新连接读回，不靠尚未提交的事务内结果。
- 后置 `spot_overview_missing` 发生在第一条 Spot 的更新、完整 revision/active revision 和 summary 语句之后；实际 revision insert 数为一，异常来源排除“第一条 SQL 未成功便退出”的假通过。随后比较全部 11 个受影响表的有序 `to_jsonb`，包括已有内容和时间戳，确认整组回滚。恢复 overview 后同一候选提交，两 part 用一条 `EXISTS`/`FOR UPDATE OF s` 选点，两个有效 Spot 恰好两份 sample/revision，精确 east 外边界 Spot 保持 version 1。
- 成功读回核 schema3 pin/payload 和 PUBLISHED 状态落入原两份发布记录、样本 .5/50 与实际九像元完整面积、current/overview/active revision/Map 与收藏 summary 同步。旧 revisions 逐项保持，只退休夜光 snapshot，地形 snapshot 不变；再插入较新的夜光 snapshot 后幂等重放，所有表及时间戳仍与成功快照完全一致。
- Root 在 Python 进程退出后另开 READ ONLY 事务读取同一库：26 migrations、7 spots、14 revisions、7 samples、4 PUBLISHED（其中 schema3 为 1），current↔active revision/overview mismatch 为 0。该回执补足真实提交后的持久化效果；不构成当前任务库或全国资料已发布。
- 审查发现并实际以 `psycopg.conninfo.conninfo_to_dict` 无网络复现隔离 guard 缺口：URI 表面为 localhost，但 `?host=203.0.113.1` / `?hostaddr=203.0.113.1` 可改变 libpq 的实际目标。Root 在同一既有测试入口拒绝非空 query/fragment 及 `PGHOSTADDR`、`PGSERVICE`、`PGSERVICEFILE` 环境重定向；原 7 个反例修前失败、修后通过。审查独立执行唯一无 DB 的 `EogDatabaseTargetGuardTest`：一个方法 / 7 case 通过（0.026s），逐例核 `connect.assert_not_called()`。`target-guard-regression.json` 记录本次真实 DSN query/fragment 均空、三项环境覆盖均未生效；当前真实 PG 证据不因此作废，也未重复四项 DB 测试。

本结论只建立合成两 part 在原 PostgreSQL schema 上的内部单事务提交、失败回滚、持久化和幂等行为；单次 advisory lock 调用不证明真实并发锁竞争、死锁/容量或全国批次性能。后续离线 display validator 的另模块修改不由本次旧执行日志背书，事务文件本身保持上述 SHA。公共 schema3 `publish` 与 CLI 仍在 DB 前拒绝，未改 producer、现用任务库、API 配置、worker、OSS 或客户端；全国全成品质检、静态对象读回、整组切换、正式环境及目标端义务仍欠。


Root清理读回：`pg-transaction-20261028/cleanup.json`确认仅删除可重建独立测试库 `starward_eog_test_20261028_fe98ac95b1`，owner相符、活动连接0、未强制终止连接，恢复任务库OID保持。`database.json`终态为 `TEST_PASSED_CLEANED`，真实四项结果、进程退出后的持久化读回及guard反例均原位保留；没有重跑PG、恢复任务库、启动worker或删除业务历史。
