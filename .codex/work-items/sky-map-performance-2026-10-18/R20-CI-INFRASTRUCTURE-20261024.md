# R20 实际 CI 与基础设施夹具修复（2026-10-24）

检查点 `2c4bb23574fb4a731725e4fa4fad31c2383a35a3` 已提交并从目标远端分支读回相同 SHA；没有改 main 或使用 force。现 workflow 只自动接 main/PR，故用其已有 workflow_dispatch 手动检查该目标分支。没有部署、上传原始数据或替换冻结候选。

## 远端实际结果

- [Context structure 39985646890](https://github.com/Seven128/Starward/actions/runs/39985646890)：**success**。
- [Product CI 39985637469](https://github.com/Seven128/Starward/actions/runs/39985637469)：**failure**，job `120523964492` 的 `Run isolated infrastructure checks` 失败。
- 此前的 release-code（SDK、三个 Miniapp workspace 类型与各完整测试）、native App/独立 API/admin 消费者、后端 release build、WEAPP release/platform owner、非部署 CI bundle 与 built-candidate inspection 均已通过。OCI 构建因前一步失败 **skipped**，不算通过。
- 构建存在 CSS 顺序 warning，但本次实际失败来自基础设施 assertion。`check:miniapp:release-code` 不等于扩展的 `check:miniapp:fast`；后者仍不据此冒称执行。

旧 run 的失败状态不被本机修后结果覆盖。含下述修复的新检查点 `8fdf9b6b8efe93a98ab2c798446ea057958e2310` 已推送并精确远端读回：

- [Context structure 39993227368](https://github.com/Seven128/Starward/actions/runs/39993227368)：**success**。
- [Product CI 39993219808](https://github.com/Seven128/Starward/actions/runs/39993219808)：**success**，head SHA精确为上述8fdf9b6b；2026-10-23 17:23:27 UTC终态。job120550014445实际通过release-code、native App/API/admin消费者、后端构建、非部署WEAPP包/inspection、此前失败的隔离基础设施及OCI构建。
- 后续Sky资源家族及规则配置新改动不在8f提交/CI范围内。

Sky资源家族随后单独提交推送为 `71703c95c665ca61911d4a2a13d3a8894b510e80`，目标分支远端精确读回、ahead/behind 0/0；没有混入在途API/App规则改动。[Context39995771042](https://github.com/Seven128/Starward/actions/runs/39995771042)success；[Product39995764825](https://github.com/Seven128/Starward/actions/runs/39995764825)**failure**，job120558757521在release-code的完整Miniapp套件失败：2814项，2812通过/1失败/1skip，155,731.888ms。后续消费者、构建、infra/OCI均skipped，不能沿用8f的通过当717终态。

唯一失败为`src/services/galactic-image-client.test.ts`的真实Sky来源入口：退休图片后旧credit不应导航，actual2/expected1。真实页面已沿共享`liveSkySceneResources`过滤，旧VM fixture却直接提供未过滤getter，并注入已不在handler内的局部liveness函数。本机首先同样复现5项中4通过/1失败。修复只改该服务消费者测试：提取真实page reader和action，执行真实共享projection，并在相同module graph上真实注册/退休bitmap；保留完整来源/processing/limitations、精确版本URL、实际复制按钮、另一版本拒绝和原退休严格断言，accepted原对象不变。修后5/5、miniapp TS5.9 exit0；新独审独立5/5、无范围内P1/P2。原件位于**仓库根**`tmp/sky-service-consumer-ci-repair-20261024-99134e75/{before.log,after.log,typecheck.log,receipt.json}`，不是任务tmp。生产代码未改，跨services/Sky搜索未发现另一处同机制getter。

## 新机 fast 组合入口

root实际运行`npm run check:miniapp:fast`，首次在AppID检查失败为`wechat_app_id_private_identity_mismatch`。本机私有配置实际没有`appid`，不是存在冲突值。按已安装`project-config` skill及字段说明，private只覆盖其已有同名字段；未写AppID应继承正式共享值。guard现仅在private拥有该字段且不一致时拒绝，仍保真正冲突/另一个活跃tracked身份的原拒绝。新增实际文件回归修前失败、修后整个7/7；真实check通过，并读回确认shared/private配置字节均未改变。

任务日志`app-id-private-inherit-{before,after}-20261024.log`；首次组合失败保留在`miniapp-fast-final-20261024.log`。修后组合`miniapp-fast-private-fixed-20261024.log`实际通过AppID、SDK、三workspace类型、contracts88/88及MiniAPI1061项（993通过/0失败/**68条件跳过**）；随后Miniapp2806项2805通过/1失败/0skip，133,136.4416ms，组合exit1。不能称fast通过，后续design/workflow/icons/UI checks尚未执行。只在该子进程清空DATABASE/REDIS连接环境，没有连接共享数据库或运行IDE/手机/现用候选。

第二次组合失败在`sdss-science-optical-resource.test.ts` bootstrap：绑定有效real science publication时，该历史测试还强制读2026-10-01的六项无关源码保全hash；其中四项已随授权UI/媒体修改改变，两项仍同。失败不是manifest/PNG完整性失败；原数据pin已在前段严格通过。

修复只改该测试：历史保全清单由必要的显式测试输入`CLOUD_SKY_SCIENCE_RESOURCE_PRESERVATION_PATH`指定，空/非法/不匹配清单严格拒绝并绑定清单本身；普通真实数据仍保全部manifest/publication/PNG/rights断言与实际执行源码/数据before-after不可变。没有改production或历史脚本。作者真实publication9/9、合成9/9；显式原历史清单仍exit1拒绝已改源码。每轮26项执行输入before/after及外层12项真实输入均同；原清单1007B/SHA-256 `6043b31db7584911f660874a636fb239baf44b0a7c419f85be7d3e11858453cd`不变。证据在任务`tmp/science-resource-binding-20261024/repair-receipt.json`及同目录失败/成功/负例日志。新只读独审独立真实数据9/9、显式旧清单仍拒绝、12输入字节同，查实际调用后无范围内P1/P2；作者/审查owner均结束。

## 最终本机组合终态

root第三次运行`npm run check:miniapp:fast` **exit0**，任务日志`tmp/miniapp-fast-integrated-20261024.log`，SHA-256 `539a20ce43403373afa8302fd0e9964981bfdc954bda0063c7e7a1ca4fc05b56`。显式绑定同一既有真实science输入，未要求旧历史保全；DATABASE/REDIS类连接只在子进程清空。

- AppID check、SDK check、三个Miniapp workspace noEmit通过。
- contracts **88/88**；Mini API **1061项，993通过/0失败/68条件跳过**，238,443.1039ms。68项不算已验，较早42skip保留为旧批次事实。
- 完整Miniapp **2814/2814、0失败/skip**，138,869.5218ms；既有真实publication消除了本机相应条件缺输入，但不代原生像素或图质。
- design结构验证、workflow **177/177**、icons/semantic-assets检查均通过。
- UI contracts只提供4项source-pattern通过，明确`product_conformance: unverified`，不冒采用稿/运行时或业务验收。

前两次组合失败、717远端失败及每次边界修复均保留。此完整组合不包括原生设备、真实H4、部署或长期运行，也不覆盖在途field新模块。含本批修复的新远端CI须按后续实际提交运行，不能沿用8f结果称新提交全绿。

## 后续 workflow 检查点

上述验证修复已单独提交推送为 `ab47dc01b915ae11080acf4c0a5030e2def3f3dd`，目标分支远端精确读回、ahead/behind0/0。该提交包含父提交f41的通知配置，但排除在途field模块及后续enum修复。

- [Context40003317339](https://github.com/Seven128/Starward/actions/runs/40003317339)：head精确为ab47dc01，**success**。
- [Product40003311535](https://github.com/Seven128/Starward/actions/runs/40003311535)：head精确为ab47dc01，**success**，终态2026-10-23 18:41:57 UTC；job120584760197实际通过release-code、App/API/admin消费者、后端及非部署WEAPP构建/inspection、隔离infra与OCI构建。未运行时保留的pending记录不冒通过；此处按实际终态更新，717原失败不变。

Field/四处enum修复/实际OpenAPI随后已独立提交推送`f2b255ae5d0a686b677094cd1e34f8c5b4002c28`，精确远端读回、ahead/behind0/0，排除新在途admin restart。其[Context40005868190](https://github.com/Seven128/Starward/actions/runs/40005868190)**success**；[Product40005906382](https://github.com/Seven128/Starward/actions/runs/40005906382)**success**，终态2026-10-23 19:00:35 UTC，job120593615372全部25步成功，包括实际App/API/admin消费者、后端、非部署WEAPP构建/inspection和隔离infra/OCI。按本run实际终态记录，未借用ab47结果；等前一Product终态后才启动，未触发concurrency取消旧run。各本地scope归[F14证据](R20-FIELD-STATE-20261024.md)，不关闭设备/原生资源/性能，也不覆盖尚未提交的admin journal。

## 管理端交付后的生产依赖审计

管理端journal/实际消费者及文档已提交推送`e468f9d8ef9f2127bdbbf133c9fcc6445e7d36e8`，目标分支精确远端读回、ahead/behind0/0。[Context40046668094](https://github.com/Seven128/Starward/actions/runs/40046668094)**success**；[Product40046664661](https://github.com/Seven128/Starward/actions/runs/40046664661)**failure**（job120729857029，2026-10-24 00:48:10 UTC终态），在step9 `npm audit --omit=dev --workspace @starward/miniapp-api --audit-level=high`失败。此前checkout/资源准备/npm安装/公开数据验证通过；后续release-code、App/API/admin消费者、构建、infra/OCI全skipped，不借f2成功或本机admin检查补填。失败审计段保留于`tmp/ci-e468-audit-step-20261024.log`。

新审计实际报undici高危及fast-uri、Fastify较低级问题。root核对官方一手记录：[undici excessive-content-encoding](https://github.com/advisories/GHSA-xjj6-f33q-929c)、[EventSource状态边界](https://github.com/advisories/GHSA-4qv8-2p9j-2685)、[SRI算法标记](https://github.com/advisories/GHSA-f72v-6w45-q472)、[fast-uri host canonicalization](https://github.com/advisories/GHSA-wjr9-j795-jxcr)、[Fastify header propertyNames](https://github.com/advisories/GHSA-389g-gv7q-r4x8)。这解释当前audit边界，不据advisory假称本产品已遭攻击；也不归因到journal代码。

最小补丁的主lock语义仅六条变化：undici8.10.2→8.12.3、fast-uri3.1.8→3.1.9与4.2.2→4.2.3、Mini API direct与Nest adapter下两份Fastify5.12.5→5.12.7，以及该workspace的direct pin。保原Nest父override形状，独立API的root Fastify5.10.0及其他依赖版本不变；没有major更新、关闭audit、forcefix或改源码协议。undici要求的Node>=22.19未变，root/CI Node24满足。

准备过程保留真实失败：初次lock-only更新使生成的`node_modules/.package-lock.json`声称新版本，实际package.json仍旧；普通install因此假定up-to-date。root仅将该生成缓存文件移到任务tmp留证，再以实际已加载package.json逐路径读回。一次workspace `npm update fastify`又使Nest pin回落5.11.3并引入high，未接受该中间结果；临时global override尝试也未交付。最终恢复原父override，按npm registry的5.12.7确切tarball/integrity/dependency metadata对齐两目标lock条目，归档失效生成缓存后实际安装，未手改vendor源码。首次物理安装已更新目标，但写主lock遇一次UNKNOWN/-4094；日志保留，正常install重试exit0。不是npm ci删除重装，也未操作服务/冻结产物。

最终主lock与全部五个受影响实际安装路径一致；主lock SHA-256 `360037fb4ae0f02597607965e86817a885a0d0ac03ad33d03382c2f0e2135a2a`。之前2039包一致的记录保留原时间/lock边界，本次不将旧整组核验冒称新lock的全文件认证。registry公开依赖按新主lock恢复即可；没有新数据包/私有上传或将代码拉取冒数据库恢复。

root本机结果：最终同一生产audit **exit0/零漏洞**（`tmp/admin-ci-audit-final-verified-20261024.json`）；真实Nest/Fastify auth/operations **7/7**（`admin-audit-http-baseline-20261024.log`），实际admin恢复消费者 **12/12**（`admin-audit-consumers-20261024.log`），JSDOM相关文章DNS/提取/传输 **25/25**（`admin-audit-article-consumers-20261024.log`），均零fail/skip。`npm ci --ignore-scripts --dry-run --no-audit --no-fund` exit0只验证锁准入，先核本机ci.js的`!dryRun`删除分支，未真实清node_modules；不冒完整CI或冷安装通过。第一次差额比较脚本有多余右括号而失败，修正脚本后实际六条差额如上，未影响已完成install。

新只读独审`/root/production_dependency_patch_review_20261024`已完成，无这三文件新增P1/P2；独立audit exit0/零漏洞，四份官方tarball的integrity/metadata及五处实际包全部普通文件逐件一致。其首次检查因`npm ls`的Nest→Fastify INVALID前提而exit1，失败保留；对HEAD/final全部workspace manifest+lock分别用同源Arborist loadVirtual/buildIdealTree只读对照，旧5.12.5和新5.12.7均有同一INVALID，最终ideal tree不回落，因此不把既有npm11.13图诊断当本补丁新增缺陷。真实CI用Node24.21/npm11.19，与本机24.16/npm11.13不同；冷安装/完整pipeline仍以精确新head实际CI为准，不扩大工具矩阵。报告`tmp/production-dependency-patch-review-20261024/review.md` SHA-256 `440400762a7a13b0c826198e343ddf06ba822f11f12dce728c6b6e260039f376`；三文件前后hash一致，reviewer已结束。

本补丁已提交推送`4dcf56d0a2e54c468be7438397add429685166be`并精确远端读回、ahead/behind0/0；[Product40048384492](https://github.com/Seven128/Starward/actions/runs/40048384492)**success**（2026-10-24 01:18:34 UTC终态），[Context40048388751](https://github.com/Seven128/Starward/actions/runs/40048388751)**success**，两者head均精确为4dcf56d0。Product job120735232250实际通过冷安装、生产audit、release-code、App/API/admin消费者、后端及非部署WEAPP构建/inspection、隔离infra与OCI构建；原e468失败保持不变。CI Node24.21.0/npm11.19.0的冷安装已成立，不把此前本机dry-run冒成该结果。并行legacy命令源码不在此依赖批次或CI范围内。所有npm install中间日志、原主lock、生成缓存原件及registry metadata保留任务tmp；没有Git reset/clean/force/stash或新worktree。

## 两个同责任的夹具假设

1. `miniapp-infrastructure.test.ts` 前阶段将三项 PENDING upload 到期，却没有确认其删除。当前生产契约在对象写入回执丢失时仍沿稳定 object key 保留耐久退休意图，后续 formal expiry 必须能再次发现它们。旧断言只期望一项新 key，真实结果是四项，已在新隔离环境复现。

   修复只在测试补齐责任：写入三份非空合成字节，精确核三项到期 key；确认另一项删除时不能误清这三项；由既有 cleanup owner 真实删文件并读回 null，之后保留 formal `[新 key]` / `[]` 严格断言。没有改生产删除逻辑或将断言降为 includes。

2. 完整入口继续执行后，PNG/JPEG harness 将 HTTP remove 的持久退休回执当成物理文件已经删除。当前 MEDIA worker 才拥有物理删除与确认责任。

   修复统一两种格式的实际链路：HTTP 后在 PG 精确读回 EXPIRED/稳定 key，原字节仍完整；使用已有 OutboxWorkerRuntime 处理本次随机 queue；检查 key 已确认成 null、每个原 remove 事件 COMPLETE 且 effect 数为一，最后核两个实际路径均 ENOENT。没有新增运营/天象任务或把删除移回同步 HTTP 副作用。

改动仅在上述测试和 `tools/miniapp/run-infrastructure-check.mjs`。没有放宽未知提交、幂等、字节删除或持久确认语义。

## 本地真实验证与资源

实际目录：任务 `tmp/ci-infra-repair-20261024/`。

- `before.log`：原失败复现，3 项 integration 中 2 通过/1 失败，actual 4 / expected 1。
- `after.log`：原失败修复后通过并暴露 HTTP 后立即删除的第二条旧断言；保留失败，不当全绿。
- `after-worker.log`：完整 `npm run test:miniapp:infrastructure` **exit0**，run `verify_31fccd6a5d854a89`。实际包含 PG/PostGIS/Redis 重启、备份恢复指纹一致、HTTP、真实 MEDIA worker/effect/删除确认、管理 receipt/replay/RBAC 与成本读回。
- 两文件 diff 检查及 runner `node --check` 通过。此前 worker typecheck 被并发 Sky alias/旧位置参数阻断，日志保留，不冒称当时通过。后续在新 Scene 的纯类型边界修复后，完整 Mini API workspace noEmit **exit0**；修前/后入口归 [Sky证据](R20-SKY-FRAME-INPUTS-20261024.md)。

只使用自建 compose `starward-ci-repair-20261024-d1873e` 的 127.0.0.1:60729/59479、合成随机库/queue。结束已停止且无监听；容器/卷保留，未删除。原共享 Docker 55432/56379 未操作。没有 IDE、手机、ADB、共享 API/桥/队列、VPN 或现用/冻结构建操作。

独立审查已完整核对两文件 diff、生产退休/worker owner及四份失败/修后日志，另行执行 runner 语法和限定 diff 检查，均通过；未发现该范围未解决的 P1/P2。审阅者没有修改文件或重启服务。含修复的远端CI终态见上；本地通过不关闭目标运行时、部署/长期运行或完整Goal。
