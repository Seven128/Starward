# 精确 OCI 保全路径独立核对

2026-10-19；源码基准 `8d55e50e04a043b60698fa4562246c92c0ec966b`。这是本次有界技术核对与建议，不是新 PLAN、已实现能力或可删除结论。

结论：复用现有 staging Actions 凭据读取一个固定 digest，再由原 owner-only Drive 接收，是合适的窄路线；**目前缺少 Actions 到该私有落点的可用传输能力**。当前 Drive tools 不提供 resumable session 签发入口，不能把本机连接器可上传文件说成 CI 已能上传。公开仓库 artifact 不能直接承载原 OCI；也不能默认为“公开密文”已经满足不扩共享。现有主机实际空间预检失败，不应默认用它中转。

## 本次范围与事实

- 仅读取仓库 owner、两个 GitHub metadata endpoint、已声明的唯一 Drive 数据 folder metadata，以及必要官方文档。未下载 OCI、读取 credential/旧交接 key/OAuth、查询其他账号、创建 session/file/Secret/artifact、改变分享、执行 Docker/SSH/服务/浏览器/IDE/ADB/手机操作或 Git 写入。
- `GET repos/Seven128/Starward` 的投影为 `private=false`、`visibility=public`、`archived=false`、默认分支 `main`。`GET .../actions/artifacts?per_page=1` 的 `total_count=0`；没有下载 artifact 内容。
- 只对 [原交接 manifest](../data-handoff-20261018/HANDOFF-MANIFEST.json) 已声明的数据 folder 调用 `google_drive_get_file_metadata`。返回 MIME 是 folder、permission metadata 可用，列表只有一个 `user/owner`；未列目录或读取文件。adapter 未返回请求的 `ownedByMe/canAddChildren`，因此本轮只确认其可读 metadata 和 owner-only 权限投影，不把它当实际写入资格/成功或剩余容量证明。
- 复用 [候选审计](REGISTRY-QUOTA-CANDIDATE-AUDIT-20261019.md) 的 f487 revision / `sha256:80d0dccb494a08c4e8f7f348fb650339f56ca2df50ceea201edb98e11ee6c909`、ORAS 1.3.5 研究、旧 32 条成功史与本机指定 registry helper 缺 entry 的结果，不重复扫描。复用 root 的 [最新固定链投影](RELEASE-REFERENCE-PARTIAL-REMOTE-20261019.json)：成功 current 为 262d/824b，停止 API 为 1ccd/de4b；历史失败回执 batch 仍超预算 unknown。
- [当前 host preflight](CURRENT-HOST-PREFLIGHT-20261019.json) 的 `39277770300` 已真实返回 `host_preflight_disk_below_10_gib`，没有具体可用字节。该结果使主机空间成为实际未决项，不能直接向 inbox/backup 目录追加 OCI 或以 prune 绕过 guard。

## 可复用的现有 owner 与不能混用的消费者

| 已有能力 | 此次可复用部分 | 不能据此声称 |
| --- | --- | --- |
| [backend-staging.yml](../../../.github/workflows/backend-staging.yml) | 受保护 staging Environment 中已有 registry password；批准 host/repository/username 由原 Variables 绑定；main 的现有可归属执行面及临时登录清理 | 本机能读回该 password，或必须调用 build/push/promote 才能读取 registry |
| [pipeline-and-host](../../../project_context/deployment/pipeline-and-host.md) | 同一批准 TCR 为唯一发布源；固定诊断与发布职责分开 | 新建第二 registry、发布控制面、自动同步/清理任务或放宽 CD/host guard |
| [verified-backup.mjs](../../../tools/deployment/verified-backup.mjs) | 已有 AES-256-GCM envelope、单独 key custody 和完整性验证经验；`encryptBackup/decryptBackup` 接受 Buffer，原交接已用它封装 ZIP | DB `createVerifiedBackup` 会备份 OCI；旧 DB/Sky manifest、七天 DB retention 或成功 DB restore 能恢复原 image digest。当前 Buffer 接口也不是已验证的流式大文件能力 |
| [data-handoff restore](../data-handoff-20261018/restore.mjs) / [RESTORE](../data-handoff-20261018/RESTORE.txt) | 原名 byte parts 的逐段/整包校验、fresh 目录、原 private Drive 落点、独立 key 交付、实际下载后再校验的机制 | 该恢复器会解析/恢复任意 OCI，或允许复用曾输出过的旧交接 key；它的 ZIP 内容与 DB 消费者有明确原范围 |
| [runtime-data README](../../../data-pipelines/runtime-data/README.md) / [resource owner](../../../project_context/development-workflow/resources-and-artifacts.md) | 连接器身份、原私有 folder、不可变对象 ID/size/hash/readback、必要时有序 byte parts | 已有无人值守 Drive/CI 认证。文档明确没有此能力；公开 runtime importer 只接纳其锁定数据，不应塞入 image backup |
| [数据库恢复/回滚](../../../infrastructure/deployment/README.md#failure-and-rollback-boundary) | 应用回滚依赖 retained prior image、配置/schema/新写入兼容，并走原 release owner | Git commit/source rebuild 等于同一 OCI bytes；current 的 backup-manifest 声明等于该 manifest 或 OCI 已读/可恢复 |

因此只需补一个部署工具责任内的精确保全/验证边界和一条私有传输桥；不建立第二数据索引、迁移全部 secrets、改现有备份格式或给每个 tag 复制一套流程。

## Actions artifact 的实际私有性

GitHub 官方规定登录且具有 repository read access 的用户可下载 workflow artifacts；当前仓库是 public，staging Environment 的保护不将产物变成独立私有空间。直接上传原 OCI layout/tar、配置、认证文件或 key 会扩大访问面。[GitHub 下载权限](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)、[artifact REST 权限](https://docs.github.com/en/rest/actions/artifacts)

端到端加密可以保护内容，但 artifact 名称、大小、时间及密文仍进入公开仓库产物访问面，不能偷偷把这称为原私有 Drive 路线。此次不采用公开 artifact、cache、release asset、日志/base64 作为传输替代，也没有上传试探物。

## 单对象 Drive resumable capability：协议可行，现有入口缺失

官方 Drive v3 流程由 OAuth 端初始化 `files.create` 的 resumable upload，并取响应 `Location`；后续示例通过该 session URI 直接 PUT 内容，不再传 OAuth。从这一协议示例推得的待验证路线，是把授权端留在原 Drive owner，仅向固定 Actions job 交付一个对象的上传 capability，避免交付全账户 OAuth。它仍是敏感 bearer 能力，必须私下交付，且不是由 digest 自动约束的签名承诺；本次没有实际验证跨进程交付。[Drive v3 上传协议](https://developers.google.com/workspace/drive/api/guides/manage-uploads#perform_a_resumable_upload)

本次工具 metadata 核对：

- `google_drive_upload_file` 只接 `file_uri`、文件名、MIME、parent folder；`google_drive_update_file` 可以替换现有 raw bytes。它们执行完整上传，不提供“只初始化”、返回 upload `Location` 或原始授权 HTTP 的参数。
- 未暴露 init-resumable、upload-session cancel 或 OAuth 提取入口；不尝试未知参数、从浏览器/连接器底层提取认证，或把本机路径误传为 runner 可读路径。
- 官方 session 时效是一周，不能称可自定十分钟 TTL。当前 Drive v3 指南未给出即时撤销保证；旧 GData 指南明确提醒协议并不完全相同，其 DELETE 不能直接当作已验证的 Drive v3 撤销能力。[旧协议差异说明](https://developers.google.com/gdata/docs/resumable_upload)

所以，**只靠当前暴露工具不能签发这条桥**。后续若原 Drive owner 增加该窄能力，应固定原 folder 和单个新对象，只允许生成这次上传所需 capability，不传 OAuth/refresh token。先核父目录权限及可写资格，再按上传完成后读回的 file ID/parents/permissions/size/hash 建立保全记录。session 本身不保证内容 SHA、job identity 或更短 TTL；这些由固定 job 和接收验证绑定。

临时 Environment Secret 可作为 capability 的原有保护载体，但只有 capability 已由授权 owner 产生后才有输入可传；此处不是已创建 Secret 的事实。它不得进 dispatch 普通 input、GITHUB_OUTPUT、命令行、artifact 或日志，也不应跟随任意重定向。完成/失败后清理 job 临时认证文件和临时 Secret；**清理副本不等于撤销 provider session**。若短期撤销是必需条件，须先由 v3 的可验证能力解决，不做承诺。

## 最小保全路线与可独立准备的下一动作

推荐保留一个单次、main-only、受 staging Environment 保护的固定保全入口，仍由 `tools/deployment` 与现有 workflow/control owner 管理。它不调用 build、tag delete、release、Compose、数据库或服务，不触发自动发布；不接受任意 repo、command、路径或网络落点。

1. **先把有限输入和离线验证做实。** 输入固定批准 repository、候选完整 digest/原 tag、批准传输对象绑定与 fresh 输出位置。复用已选 [ORAS copy](https://oras.land/docs/commands/oras_cp/) 的 registry ↔ OCI image layout 能力，钉住已研究版本/官方校验和。用本地构造的 image/index、缺 blob、改 blob、错误 digest 和中断传输，验证生成与 fresh-layout 再读；不重新选型或制造生产测试数据。这个准备不依赖 phone、主机空间或读取现有 secret。
2. **执行前先有真实私有接收能力及空间边界。** 首选上述原 Drive owner 签发的单对象 resumable capability；当前该接口缺失，不能启动一个最终只能把 bytes 留在 runner 的“备份”。若以后有实际可用的本机 registry 读取身份，可省去 Actions 传输桥，直接在外部私有目录 ORAS 拉取，再用原连接器上传 Drive；当前 helper 缺 entry，不重置个人版密码或导出现有 Actions password 来造这条路。
3. **固定导出一次。** 现有 Environment registry 凭据仅在该 runner 内按原 password-stdin 机制消费，私有临时认证目录/最终清理，不读回或输出。先读目标 descriptor 图，核 root digest；按唯一 blob 与必要子 manifest 的实际长度计算 layout、archive、加密和接收副本峰值，给这次操作有界空间/超时，不能用控制台四舍五入的 119 MB 作为容量证明。image index 保留全部子 manifest/config/layers；不以本机平台裁剪或重新序列化旧 manifest。额外签名/referrer 只按已确认的恢复消费者纳入，不扩成扫描所有 tag 的任务。
4. **仅私有传输，并做独立接收验证。** 原 OCI bytes 不出现在公共产物；若需要加密，沿原 separate-key custody 使用新独立 key，绝不重新读取/复用旧已输出 key。现有 AES Buffer envelope 只有在实测规模/峰值适用时复用；需要 sender 不持解密 key 或流式处理时，可评估成熟 [age 公钥加密 CLI](https://github.com/FiloSottile/age/blob/main/README.md)，只给 Actions 公钥，私钥留原私有 key owner；本次未安装、采纳或试跑 age。接收方从原 Drive 新下载，核 archive/ciphertext 身份、完成认证解密，再在 fresh 目录核 root manifest 与完整 descriptor/blob 图；记录原目标、工具版本、archive identity、remote object ID 和 readback，不能只有一个 ZIP hash。

当前**下一条最小可实施动作是第 1 步的固定 owner/离线恢复契约准备，并保留第 2 步接口缺口**；不是立即创建公开中转、添加长效 Google credential、购买服务，或向空间预检失败的主机复制。若原 Drive owner 不能提供窄 session 能力，就将外部传输保持未就绪，转做原 Goal 其他独立责任；不把缺口扩成必须让用户立刻登录/配合的要求。

## 如何判定进展与后续单个目标处置

以下结果逐层区分，不能由前一层自动推后一层：

- 本地生成/fake 流程通过：实现准备证据。
- registry 精确导出且所有目标图 bytes 校验通过：本轮导出证据。
- 原私有 Drive 新对象、权限、完整下载、认证与 fresh layout 完整再读通过：该精确归档的实际私有保全/离线内容恢复证据。
- 原批准 registry 的同 digest 再入与读回、原 release consumer 能使用：registry/application 恢复证据；不由 OCI 文档、源代码重建或 local layout 单独宣告。实际写回需仍走原授权 owner，不能因本审查而执行。

该候选先前 push 成功、当次 promotion skipped，且已观察 current/停止 API 使用其他 digest，这些事实已复用。后续引用处理限定在此明确目标的同内容 tag、已知部署消费者/current/停止对象及显式保留的 rollback/backup 责任；不为准备备份追加“证明世界上没有任何引用”的无限门槛。未知批量回执保留 unknown，不能当零；也不能由本文件授权删 tag、绕过主机空间 guard、改变 CD 或宣告 H4 可用。

本次未建立 OCI 备份或恢复承诺。现有的 registry tag cap、主机空间失败、私有传输接口缺口及目标恢复未验，分别留在各自 owner；没有手机操作、付费或分享变更。
