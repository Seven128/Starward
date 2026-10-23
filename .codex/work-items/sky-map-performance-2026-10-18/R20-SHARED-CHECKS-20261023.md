# R20 / H7 检查修复与代表失败归因

2026-10-23；checkout `codex/remote-main-20260908`，HEAD `4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0`。本轮操作源码检查入口、CI、native App 的 noEmit 类型检查配置，以及新检查暴露的独立 API Sky 目标消费者；未使用微信开发者工具、手机、ADB、运行中的服务或任何现用/冻结构建。它是本轮有限证据，不能覆盖 [CURRENT-VALIDATION](CURRENT-VALIDATION-20261023.md) 的其他失败与未验。

## 已修复的检查责任

- **AppID 当前身份与历史文档分离**：修复前运行实际 `wechat-app-id-migration.mjs check` 得到 `wechat_app_id_tracked_identity_ambiguous`。全仓 literal 扫描把两份历史 Markdown 与当前 project.config 同时计入身份；Context 的当前 source/DevTools 身份是 `apps/wechat-miniapp/project.config.json`。扫描现在排除 Markdown 文档，但继续检查所有非 Markdown tracked 文件中的 AppID literal，第二个配置/代码身份仍拒绝。NUL 分隔保留合法文件路径。未修改正式/私有 AppID 配置或历史证据；既有守护迁移的当前身份、private mismatch、原子写失败恢复检查保留。
- **原生 chrome 旧探针退休**：当前 `app.config.ts` 没有 tabBar；primary navigation 不再保留底栏，实际主题 owner 只发 navigation/background 写入。旧探针要求 `DAY.color/selectedColor` 的原生 tabBar 字段，实际命令修复前失败。探针保留 DAY canvas、custom navigation、可读的黑色窗口文字和旧色值禁止项，改为禁止重新引入 `tabBar:`。现有 native-chrome 行为测试继续检查各主题、Sky/照片/返回和迟到写入；没有改产品配色或导航。
- **实际消费者 CI**：Product CI 增加 `check:product:consumers`，执行现有 mobile typecheck/test、独立 API typecheck/test，以及新暴露的 admin-web noEmit typecheck 和管理代理新增的三项实际页面/会话/操作回归。原 Mini Program release-code 入口保持。既有 affected-checks 新增 consumers 输出：App/API/admin、共享 packages、依赖/CI/未知产品输入保守接通；单独 WEAPP 源码、已知专用工具家族、设计资源及原有纯 Context 路径不接通跨产品检查。Root 复核指出工具目录还包含管理消费者后，已改为明确的 WEAPP 工具家族白名单：`admin-*`、operations-browser、Docker Compose、共享 UI probes/workflow 检查以及未来未知工具都接通，并补反例。这个分组不声称精确模块级依赖图，也不把 typecheck 当运行时验收。
- **native App noEmit 配置**：新增消费者检查实测四条 TS5097，均来自 coordinate-system 的显式 `.ts` 导入。API/WEAPP/worker 的 noEmit 配置已有对应选项；mobile 补 `allowImportingTsExtensions` 后通过。没有关闭 strict、改共享导出或执行 native 构建。

## 实际运行结果

| 命令 | 结果与边界 |
| --- | --- |
| `node tools/run-node.cjs --test tools/miniapp/wechat-app-id-migration.test.mjs` | PASS，6/6。新增真实临时 Git index 回归：保留历史文档字节、当前身份通过、第二活跃配置拒绝。迁移写仅发生于测试临时目录。 |
| `node tools/run-node.cjs tools/miniapp/wechat-app-id-migration.mjs check` | PASS；唯一 tracked path 为当前 project.config，private matched。没有执行 migrate。 |
| `node tools/run-node.cjs tools/miniapp/verify-ui-contracts.mjs` | PASS，4 source probes；工具明确 `product_conformance=unverified`。 |
| `node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/theme/native-chrome.test.ts` | PASS，11/11；source/VM harness，不认证真实原生写或画面。 |
| `node tools/run-node.cjs --test tools/ci/affected-checks.test.mjs tools/deployment/workflow-contract.test.mjs` | PASS，13/13；选择器与工作流命令接线，不是远端 CI 运行。 |
| `npm run test:mobile:fast` | PASS：typecheck；19 test files / 34 tests。仍不认证原生定位或其它设备行为。 |
| `npm run typecheck --workspace @starward/api` | PASS。 |
| `npm run typecheck --workspace @starward/admin-web` | PASS，在管理代理文件稳定后执行。 |
| `npm run test --workspace @starward/api` | 修复前 FAIL：96 passed / 1 failed；修复后 PASS：26 test files / 102 tests。保留旧断言并增加支持目标/时地投影回归。 |
| `npm run typecheck --workspace @starward/astronomy-core` | PASS；未运行 release build 或写任何 dist。 |
| `git diff --check -- <本轮源码/配置文件>` | PASS。 |

没有再次整体执行 `check:product:consumers` 来重复上述已有结果；管理部分已接入 `node tools/run-node.cjs --test tools/miniapp/admin-page.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-operations-client.test.mjs`，复用管理代理刚完成的通过证据，测试细节归其记录。最终 CI 选择器/接线 13/13 再次通过。没有重跑 `check:miniapp:fast` 或原 354 项 Mini API 失败全清单；不得称整体全绿或远端 CI 已通过。

## 共享 Mini API 的一次代表失败

使用 worker cwd 执行：

`node ../../tools/run-node.cjs --import tsx --test --test-name-pattern='partial body prose' src/celestial-information-cache.test.ts`

真实结果：1 fail，恢复出版物后预期 FRESH 仍为 PARTIAL。初次误从 root cwd 运行触发 tsx decorator 转换错误，属于调用配置错误；切换实际 workspace cwd 后才取得上述业务断言结果，不能将二者混算。

随后在实际 publication parser/service 读取同一输入，未注入成功数据：

- `celestial-object-introductions.index.json`：8,230 B，SHA-256 `c9698a6051f32ecc721b3bf1fce5d39d2192df44d8ffdcd75e1623e8599565f5`，parser 接受，536 entries。
- `celestial-object-introductions.zh-cn.v79.json`：当次只有 132 B，是 Git LFS pointer，oid 为 `ec640a1a5297edac7f8070474aa116d66aef75684b2d2c5ca605e9658703c059`、size 为 1,323,326；pointer 文件本身 SHA-256 为 `503a7a1a9b3cf335af29698cc5ae5681776f0f295d0725274b818f61e10f26da`。
- parser 正确拒绝 `celestial_introduction_publication_hash_mismatch`；实际 SOLAR:SUN 服务返回 PARTIAL / `celestial_introduction_publication_unavailable`，独立数值来源仍 FRESH。
- 既有资源政策将该文件归 `text-history`；此前 catalogs/images 的 MATERIALIZED 不覆盖这一组。已交由 Root 使用已有资源恢复 owner 统一处理；本代理没有修改字节/资格或执行恢复，也未将这一项归因为全部 354 个失败。

Root 随后确认选定 text-history 无本地/暂存改动并通过既有恢复入口材料化；本代理在该改变之后只重复上述代表检查：v79 实测 1,323,326 B / SHA-256 `ec640a1a5297edac7f8070474aa116d66aef75684b2d2c5ca605e9658703c059`，parser 接受 536 rows；同一 `partial body prose` 用例 1/1 PASS。此对照确认该用例的缺料原因和恢复，不扩写为其余 API 全通过。

## 独立 API 目标合同修复

修复前 `apps/api/src/__tests__/sky-context.test.ts:22` 失败：支持的 `milky-way-core` 不在返回 objects 中。现行 `packages/contracts/src/sky.ts` 仍接受并默认该目标；`SkyContextService` 却用只返回 Gaia source IDs 的 `positionCatalog` 按旧 target 查找。相同身份错配也影响 sirius/vega/antares/m31，因此没有删除断言或删去目标。

在 Root 明确要求闭合实际消费者后，新增独立 API 的 `sky-target-positions` 适配：保持现有 Gaia 场景行，所选目标使用其自己的稳定身份与投影；三颗命名星沿已验证的 Hipparcos 行 HIP:32349/Sirius、HIP:91262/Vega、HIP:80763/Antares，M31 沿已验证 OpenNGC M:31/NGC224。数据 hash/格式验证与投影仍由现有 catalog owner 负责；读取失败不伪造对象。轨迹逐个实际时刻只投影选定目标，不再每次重新投影全 Gaia 后进行必然失配查找。

银河沿项目已有 Sagittarius A* 附近 J2000 方向常量，以共享 `observationHorizontalFrame`/stellar-vector 几何投到观察时刻。`milky-way-direction` 提供这一责任，原 night calculation 只改为引用相同数值常量，算法与原输出不改。它没有新的银河实测数据：方向代理的 magnitude 明确为 null，并保留“不代表银河亮度或摄影可见性”。所有该响应的现行投影实际无折射，因此合同兼容保留历史 normal、允许并返回 none；新算法组合版本为 sky-v2。sourceId 是兼容旧响应的可选字段，当前目标返回实际 HIP/M31/方向身份。native App 没有将 magnitude 当作必需数值的消费者，typecheck 与原测试再次通过。

回归保持旧要求，并覆盖五个支持目标的身份、97 个实际15分钟采样、选择与首采样一致、变化的时刻/观察者、未知现场地平线和银河未知星等；银河方向另与既有 Astronomy Engine 的 EQJ→EQD→Horizon 计算比较。API typecheck、26 files / 102 tests、astronomy-core typecheck，以及 native App typecheck / 34 tests 均通过。未改变 WEAPP、BSC/SAO 科学负载或冻结构建，也未取得手机/UI/外部部署验收。

当次完整日志在任务临时目录 `tmp/r20-shared-checks-20261023/`：`mobile-typecheck.log`（修复前）、`mobile-checks.log`（修复后）、`api-typecheck.log`、`api-tests-checks.log`。它们没有写入私有原件目录或覆盖旧证据。
