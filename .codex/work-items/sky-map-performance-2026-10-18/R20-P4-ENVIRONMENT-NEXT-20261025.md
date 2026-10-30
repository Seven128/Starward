# P4 当前真实环境边界：有界源码核对

2026-10-25。仅只读当前小程序媒体、队列、管理与相关 owner；未连接 PG/Redis/API、读取私有凭据值、操作设备/IDE/Git/构建/服务或 App。本文是证据补充，不是第二份计划。

## 当前实现与采用范围

- `workers/miniapp-api/src/ports.ts:210` 的用户媒体 port 只有 `memory | local-filesystem | disabled`；`media-object-store.ts:254–352` 的实现及 factory 也只有这三类，配置工厂不选择云对象存储。API 的 `miniapp-service.ts:800` 与 worker 的 `outbox-worker.ts:144` 共用该 factory，不能只给其中一端补环境变量。
- `runtime-config.ts:18/164–171/247–248` 只接受 `LOCAL_FILESYSTEM | DISABLED`，非 LOCAL profile 明确拒绝本地文件存储。当前确无 COS/OSS/S3 用户媒体 adapter 或其配置准入；不是仅缺凭据即可闭环。
- `config/data-sources/production-integration.json:163–172` 的“staging MinIO；production one approved mainland OSS or COS”是声明及准入条件，未绑定具体用户媒体 provider/region/bucket。它要求独立 prefix/lifecycle、服务端身份、加密、删除及恢复资格。
- `project_context/external-capabilities.md:164` 与 `deployment/decisions-and-verification.md:29/41/55` 的阿里 OSS＋ESA选择明确属于云观星/静态图片分发，并明确保留贡献媒体的独立对象存储义务。所查 owner 未将这项选择扩展成用户头像/投稿私有媒体的具体供应商采用。已有 Map/Sky 静态 OSS上传和读回入口不能代替用户媒体 put/read/delete、权限与删除恢复。

## 已有证据直接复用

头像写入意图、未知提交保护、有限清理、账户退休续批、锁序、Redis明确absence及旧/新job恢复已有实现；沿 [媒体证据](R20-MEDIA-LIFECYCLE-20261023.md)、[Outbox证据](R20-OUTBOX-RECOVERY-20261023.md)和[续批证据](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)复用。它们包含真实隔离 PG/Redis/文件与重启、丢回复反例，不能改名为未做或无条件重跑。

Root本轮提供的现用服务只读结果为 PG已登记023–026、POSTGRES/LOCAL_TEST/media DISABLED；本代理未复查运行服务。该状态既不能证明所有DDL/trigger，也不能证明云存储、正式身份或长期运行。

## 当前最小可执行边界

不依赖手机通路的现有入口是管理 CLI `session`（`tools/miniapp/admin-operations.mjs`），它只调用 `GET /v2/admin/session`。Root若已有该环境授权凭据，可仅在内存/现有私有 owner 中复用，核服务器 principal/operations、API release身份及 `commandContracts` 的精确 version/method/path；无需切当前媒体模式、造OWNER或发送写命令。凭据是否实际存在仍未由本代理查证，不能从一个环境文件未列字段推定整个运行进程不存在凭据。

真正云媒体闭环的下一必要准备是沿既有 owner 明确用户媒体目标、隐私/合规和地域、bucket/prefix、最小IAM、加密、删除/恢复与成本条件，再核当前账户实际权益和可用服务端访问方式；供应商目标未明确时不另起采购或adapter实现。之后才可能沿现有 port 进行合格窄适配及真实读写/清理恢复，现有 LOCAL_FILESYSTEM或 MEMORY 不能冒其结果。

`worker.ts --once` 和 `--replay`不是只读资格探针：`runOutboxOnce`会 enqueue operational/event/reminder sweeps、派发并等待实际工作，replay会恢复指定死信。不要在现用共享库/队列用它们“看是否可用”，也不以手机API阻塞为由启动第二套同条件本地复验。真实长期环境资格仍归唯一PLAN P4。

## 2026-10-28 当前恢复 API 的管理入口读回

Root 沿当前已恢复的 observed-batch 配置核对：8787唯一listener仍为17496、只绑定127.0.0.1。指定私有 runtime 的键中没有管理配置，当前终端也没有 `MINIAPP_ADMIN_TOKEN`；这两项不被推成所有账号或服务环境均无凭据。随后只读 `GET /v2/admin/session`，2026-10-28T11:26:40Z 实际HTTP **503**、`CAPABILITY_DISABLED`、`retryable=false`，未取得principal/operations/commandContracts。

首次读回错误地从嵌套 `error` 取字段，输出null只属读回脚本不匹配真实顶层错误形状；第二次只读请求正确取顶层字段得到上述结果，没有更改服务或制造身份。当前不能沿该环境完成真实管理凭据/API-client配对，不新造OWNER、启用能力、执行写命令或worker。当前未选定的用户媒体云目标和正式环境资格继续保留，既有隔离恢复证据不重跑。
