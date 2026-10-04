# 公共静态影像 owner 与现发布消费者：独立开发审查

2026-10-02，`/root/hst_registration_review`。本审查承接 `experience-sky-static-release-boundary-readonly-review-2026-10-02.md` 的待接入边界，实际检查接入后的源码与成品，不把旧审计的“尚未接入”状态当当前事实。独审者没有参与 production 实现，仅新增 task 脚本、独占输出和本文；没有改 production、PLAN/Context、旧输出、201 deep-sky 资产或六项保留设置/outbox 修改，没有 HTTP、下载、云部署、服务启动/停止、拉镜像、构建镜像、watch、IDE 或手机操作。最后另独立执行两项只读 Docker inventory 查询，核刚创建的 support image 与已清理的 operation-owned container。

结论是**当前静态 owner 和已知发布消费者的开发边界独审通过**。三个真实逃逸反例均已修复并按影响重放；既有 author checks 不是判断 oracle。源码实现、受控整链、小规模历史库存、作者执行的真实本地 TLS 与 support OCI 提取，分别保留各自证据范围。Goal、远端采用、完整版本旅程、200 DAU 性能、WEAPP/GPU 和完整体验最终验收均未关闭。

## 当前绑定与责任

| 当前 production owner | SHA-256 |
| --- | --- |
| `tools/deployment/sky-static-bundle.mjs` | `4eec01fee8b7482329ed4c2d8b7c759e62729a288697e57013fca262047df405` |
| `tools/deployment/sky-static-release.mjs` | `5b2a53f1d76bcc8dd1c357d775ad25144ba18b0fd9d9ea465f03e0991008b534` |
| `workers/miniapp-api/src/sky-public-asset-export.ts` | `62dc370b6ae35dd10cba1e5292bf8692755dd3d093c84b2c266fece21dfec858` |
| `infrastructure/deployment/miniapp-api.Dockerfile` | `a2f6bc03fcd7aa75b151ca6b1d4e658b861f6ce3aa46bd762cd6b22059ea38b0` |
| `tools/deployment/release.mjs` | `8151d15ebfeaefd005410eba678e5464d9adc54551bdba3ac32a044858ac268e` |
| `tools/deployment/operator-preview.mjs` | `94992eed52135cbff53414a5ee3558d271c869a276f4c14a17a350cbf67637d5` |
| `tools/deployment/validate-release-environment.mjs` | `c7315350deeb853258480468265aab87f8e09c66ad3cf4a218c56514e4c0194b` |

完整 current bindings/snapshots 含 shared type、headers/executor/TLS、candidate/request/promotion/qualification/check/readiness、两 Caddyfile、两 Compose 与空 fragment/logging；其余既有 remote/workflow 来源见前述只读审计。当前 exporter 只枚举原 publication owners 接受的公开资源，保原商业准入、explicit old Moon alias 与 LF-normalized constellation source；不遍历任意资产根，不采 remote 输入，不恢复被排除来源，不扩权到账号、天气、投稿、private 或 trial。新 Dockerfile 在 build 内经 compiled `--conditions=production` exporter 生成带 revision/index/fragment/publication 摘要的 seal，runtime 固定复制 sealed publication。seal 布局通过不等于来源准入；release 的新来源必须是 exact trusted OCI image 提取。

`STARWARD_SKY_STATIC_DIRECTORY` 是 optional stablebase 的 host absolute durable store root。无配置保持 API lane 与原 v1 request/receipt 行为；配置后缺 inventory/source/overlay 不静默退成“静态已通过”。validator 拒绝 broad/relative/control secret、receipt/backup overlap 和手填 `STARWARD_SKY_*` identity。request 保 strict v1 九字段；配置成功 receipt/qualification 才使用 v2 actual identity。当前 image publication 身份和 host 历史 union 身份分开，production/staging 可以有不同已验证历史并集。

## 独立反例、修复与重放

以下旧失败 generation 全部保持原字节，不追溯改成通过；`frozen/` 是实际源码原字节副本，模块算法和 imports 没有重写。真实 FS 小路径用既有已批准 TrA/Tel PNG 与 canonical routes，Docker/process/Fetch 外部结果受控，未声称真实容器或 TLS。

1. **来源闭合失败。** 在 r1 已正常 prepared 的 task store，仅给 union 添加一个格式合法但所有 retained image sources 都没有的 canonical route/payload；同步重算 index/fragment/prepared pointer publication hash，所有 source index/seal/bytes 与 pointer.sources 保持。旧 `loadSkyStaticDelivery` 仍返回额外资源。superset 完整性不足以证明授权来源。当前 inventory 逐 source 验 bytes/SHA/headers，且验证 source routes 的并集与 union 精确同集；r2/r3/r4 拒绝该相同反例。这是持久状态闭合/损坏边界，未声称远端任意人能修改私有 store。
2. **自有资源清理失败。** r1 controlled Docker create 实际产生本次自有 stopped container 后丢失命令结果；旧 created flag 尚未置位，finally 不 remove，出现 orphan。当前先记录 attempted，invocation UUID label 与 exact name 共同 discover actual ID，再仅 remove 该 ID。r2/r3/r4 实际清掉 ambiguous success 的自有资源；foreign owner 不被移除，成功 empty list 与 daemon/list/noncanonical ID 失败区分，后者明确 cleanup_unverified，pointer 不发布且 lease 释放。close 又实际断言 AggregateError 同时保原 create-result-loss 与 cleanup-list-failure。真实 daemon 的 lost-result 故障未注入；scope 是 actual owner 控制流加受控外部 effect。
3. **HEAD 校验失败。** r2 GET 的全部 bytes/SHA/headers/marker 正确，HEAD status200/body0/marker 正确但 cache-control、content-type、nosniff 错，旧 verifier 仍 passed。当前代表 record 的 HEAD 同 GET 逐字段核 published headers；r3/r4 拒绝同反例。GET 仍核全部 union files，HEAD 是代表 record；不声称每个文件每种 method 都已独立接受。
4. **已知 image 的资源幂等。** 初版 rollback/retry 又 create/cp 一份未引用的成功 source。当前 exact immutable image/revision 已在 inventory 做全文件 readback 时，只 inspect image revision，复用现 union，不新增 source/copy。独审 r3/r4 在 old/new 两源、rollback、load 的真实 task store 断言只有两 source directories，旧 image 仅 create/cp 一次；identity 保旧 image publication 与包含新 URL 的同一 union。
5. **qualification 的 compose 义务。** sphere 保存了缺 `sky-static-compose-config` 仍 qualify 的修前反例。close 独立用自己的实际 `executeRelease` v2 success receipt 删该 step，分别运行 r3 frozen old validator 与 current validator：同一真实文件旧接受、新拒绝。原普通 v1 staging qualification 保持；配置 production 不能绕过 v2 同 image publication 和成功 static preparation/config/verification。

`output/sky-static-owner-independent-1002-r1/review.json` 13,915B SHA `ce0ed258db9967c7f2c33b8413cbbef063706aa0284dc11368b2f178f4ec197b`，绑定 86,129B SHA `1c56f2f0e2b6765d06b2cd456a15dc306a923b77c400fe04fcb0c863785c0ed5`，保来源/清理两个失败。

`output/sky-static-owner-independent-1002-r2/review.json` 22,222B SHA `c5b45e68d395c649c63a73873d6aa5d5fd3ade79de59963ce3073a97a191d9e7`，binding 86,131B SHA `885f050318af952ef6e31b71da407fbff54a6f481066a1f0d4759edadb8e3499`，保 HEAD 新失败。r3 为中间 owner+普通 consumer 合链，不追溯升级其旧 validator hash。

## 当前真实消费者合链

`scripts/experience-sky-static-owner-independent-v4-2026-10-02.mjs` 在独占 task output 内运行 actual production `executeRelease` 和 `operatePreview`，**不注入 shared prepare/load/verify 返回值**。因此 actual bundle/source admission/inventory/lease/overlay、实际 verifier、实际消费者 identity 检查、真实文件 receipt/current pointer 都参与。外部 Docker/compose、readiness TLS/certificate、backup 和 Fetch 仍受控，不能由此声称 cloud/process/native transport。

- 普通 staging release：immutable pull 后 actual prepare；生成 readonly overlay 在后，migration/converge/worker readiness 使用该 overlay；actual lease 在 verifier 调用时仍存在；实际 PNG bytes/SHA/headers/HEAD 通过后才写 v2 success receipt；文件读回与返回值一致，actual qualifier 接受完整 steps，missing static-compose 拒绝，finally lock 释放。
- protected preview：actual prepare 在 stop writers 前；base+preview+static overlays 的顺序保留，实际生成 overlay bytes 被读回，current pointer 在 actual verify 成功后发布并绑定 image/union。actual check 只 load 已有 inventory，不 inspect/create/cp/pull。再次 deploy 的坏字节在 actual verifier 失败，执行 failure-stop，旧 current pointer 原字节保持，无 successful qualification；static store 和 preview operation 两个 leases 释放。
- owner 小路径：unknown revision、seal/layout/canonical/冲突拒绝，prepared pointer 不被失败的新源覆盖；same API bytes 缺 static marker、unguarded preview、错误 headers/bytes 不能 qualify；no-config 不触 FS/Docker。close 增加实际 Windows junction 被 `readPlainSkyFile`/bundle 拒绝，未将 EPERM 或未执行情况算通过。

当前 r4 九个机制全部通过，`output/sky-static-owner-independent-1002-r4/review.json` 59,122B SHA `27abf19563d0b65b62113c81457e25c31010a9eeaa47853be808b0bcdd10f0ec`，binding 92,151B SHA `24d7086f251921270620197f18ea463dc09b8bf888af1499c86a073fea48a3c8`。这里逐机制说明实际 effect，测试数量本身不承担验收。

作者 consumer `experience-sky-static-deployment-integration-2026-10-02.md` 与 r2 输出包括旧/新配置、normal/preview 四个 actual Compose parser-only 结果及受影响 checks；独审已读 actual caller/config/checks 与 outputs。注入 shared结果的十个 consumer regressions仅支撑其相应控制路径；本审的上述真实 owner 合链补该依赖。新 qualifier 仅在另一次按影响 generation 修正，旧广矩阵的源码hash不升级。

## 实际 sealed bytes、TLS 与 OCI evidence 的独立读回

close 实际重读 sealed publication 136 files/22,954,411B，核每个 record bytes/SHA、canonical path、fragment、seal revision/index/fragment hash。publication `4e07f34b96b37d7c89294ffca73ea89ce531dd0bd1cf0e8468426cd5f63e197a`，index `cfb026f6ff4ce56dab43e4c5320f26853a0e6f8eeb6c4495e3f9039e2305a258`，新 fragment `3656bcd169917933a604a59eb625bbefe6f57ac8b5ae88def5085c8d6f43ca06`。source seal synthetic revision 为 40 个 `1`；它是已 compiled approved exporter 成品，不是 clean source production OCI。

作者 actual TLS r2：`output/sky-static-release-http-1002-r2/result.json` 6,846B SHA `c604e56293a822bec8ed0e74ef74298370dbd51a3dc5ef176ab9a5cf6220182f`，binding 88,285B SHA `3ea8907bcbbbc2475358dad0013e08ecc27d7b2e756c5edd96192d6e35486b51`。独审读完整 executed script、actual adapted Caddyfile/validation/config/logs/result/binding，与 current source 接点核对。真实 verified local private-CA TLS 的 136 GET、warm/代表 HEAD、missing/wrong/valid preview token、missing-file API fallback、empty-import旧lane、非法/元文件/wrongmethod 和 actual verifier missing-marker rejection 都有 actual effect。

其 normal/preview source routing/header/auth/fallback 保留，listener/issuer/upstream/health fixture 改为 local；合并 lab 采用 ordinary global block，preview 的独立 global `auto_https disable_redirects/default_sni/protocols h1 h2` 不进入该 lab（日志实际启 h3），因此不称完整 preview TLS 配置相同。current actual verifier 通过注入的已 verified TLS adapter，normal public-PKI default transport/远端 publicIPissuer 未运行。close 解析实际 426 access records，其中 413 static（重复 verified reads，不是 413 独立资源），landscape 有固定归类，所有 access logs 均无 request/resp_headers。末尾 stats 是一时刻快照，不是 memory peak/容量测试。旧 TLS r1 不追溯升级为 HEAD 修复后证据。

作者 actual support OCI extraction：`output/sky-static-oci-extraction-1002-r1/result.json` 3,234B SHA `48a328cf9890d5d8edc6f55c1e392f00e856cccf4fb6f9c033bb6909ff22a8b8`，binding 5,023B SHA `f90e694c38eabc9ac9529f193b7d0dab957b01dbdf4f98bffc77252337bee2c8`。独审逐实际 retained source 与 union 读回，和 sealed 136 records 精确一致，lease 已清，retry create1、load extraDocker0。另只读 exact image inspect 确认真实 Id/RepoDigest 为 `sha256:ec6205338c845d63d3b81f79d7fdf8db9da8e3a305051c5aff21a33ec389c0e0` 与 synthetic revision，exact own name+label container list 空。Dockerfile support 层从已缓存旧 pinned API image COPY 已验证136sealed，证明 no-start fixedpath提取/own cleanup/real digest/control过程，不证明新 production Dockerfile clean build或那个 synthetic revision 的真实源码。

`output/sky-static-owner-independent-close-1002-r1/review.json` 11,205B SHA `1d8596bb9120b77336f17a719a7c7ee58f560000d0a38aeef60e0871487f2a21`，binding 806,257B SHA `393161a4e9b9446c88f3f05dd5f0dd1ffdc9f729c9a5b73fe87effc00b96d9ab`，1458 input files before/after 恒等，包括 actual sources、上述 immutable outputs、sealed/OCI/HTTP physical bytes、201 old deep-sky 与六保留文件。read-only Docker raw tool stdout 保在该 generation；没有把 independently inspected labels 当 source-clean 发布证明。

## 留给唯一 PLAN 的义务

可记为 implemented + independently development-verified：shared canonical/sealed/image-bound source owner、exact retained union closure/conflict、safe own cleanup与known-image reuse、optional empty fallback、two current release consumers/lease/receipt/qualification、有限真实 OCI extraction与本地 route/bytes/auth/static归因。

仍保留 changed production Dockerfile 的 clean CI exact-source image、远端 normal/protected adoption/public-PKI verifier、当前/旧客户端完整 version旅程与 pre-static image/control package rollback。小路径 old/new 两个真实 PNG 的可复用 union 和 support image current136，是有限机制证据；不能叫全历史产品库或 universal rollback。后续新 full136 history/process evidence 必须另按其实际内容审查，不能借本文升级为目标旅程。

静态 offload 降低 API 文件处理，不减少同一台服务器公网出 bytes；服务器4GB测试/4核16GB、12Mbps、2000GB月出流量、200DAU的 mixed cold/warm load/accounting、真机 native filesystem/quota/cache/总内存/GPU 和完整组合体验继续开放。旧手机证据不验新版月面；大字号仍暂停。当前开发检查不替代这些交付义务。
