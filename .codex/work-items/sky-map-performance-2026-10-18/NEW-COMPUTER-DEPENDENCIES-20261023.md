# 本机依赖与公开数据核验（2026-10-23）

2026-10-24后续生产audit补丁只改变主npm lock的六个条目：undici8.12.3、fast-uri3.1.9/4.2.3、Mini API两份Fastify5.12.7及workspace direct pin；实际五个安装路径版本已逐项读回一致，Node24仍适用。当前主lock SHA-256为`360037fb4ae0f02597607965e86817a885a0d0ac03ad33d03382c2f0e2135a2a`；[失败、安装边界与当前验证](R20-CI-INFRASTRUCTURE-20261024.md#管理端交付后的生产依赖审计)保留原件。下方2039包/旧lock核验是原时间的历史，不冒新lock的全文件校验；旧data/runtime/私有恢复状态不因npm patch变化或Git同步关闭。公开依赖可按新主lock的registry integrity恢复，无新私有数据包/原件上传。

核验时间：2026-10-23 21:55 +08:00。checkout 为 `E:/dev/worktrees/Starward/remote-main-20260908`，HEAD 为 `266df53ea48a65013b9a358cfc2ffeb28c274fcf`。本记录只绑定依赖与文件准备，不证明服务、数据库、设备或产品验收。

## 锁定依赖与 LFS

- 当前 Node 为 `24.16.0`，npm 为 `11.13.0`，二者来自 `C:/Users/777/AppData/Local/nvm/v24.16.0/`；满足根 package 的 Node `>=24`。
- `npm ls --depth=0` 退出 0。逐路径读取已安装 package.json，与 package-lock v3 比对的 2,039 个包版本均一致，非 optional 缺失为 0。207 个不适用平台 optional 包和 5 个 optional WASM 支持包未安装；没有由本次检查确认的必需缺项。该结果是安装版本核验，不是每个 npm 包全部文件的内容完整性认证。
- 复用现有安装，未运行 npm ci、改变依赖版本或改写 package-lock。package-lock SHA-256 为 `35e7efe79ea38a03c74a3f98f1cedcb108e033968b5ee690f2e28945f6fb48fe`。
- Git LFS 为 `3.7.1`，filter.lfs 已配置。共享 hooks 目录为 `E:/dev/Starward/.git/hooks`，没有 core.hooksPath 覆盖。`pre-push`、`post-checkout`、`post-commit`、`post-merge` 均为已有标准 Git LFS hook；未覆盖或新增 hook。pre-push SHA-256 为 `a52d0510d0f8c75e27852156ec6f7791f0d8ed65fc58fcc368dd1de0a60a1d74`。

## 当前消费者所需本地数据

读取了 runtime-data README 与完整 current.lock。锁文件 SHA-256 为 `046e9247fc4d0aff665ab9ad6b18b58a3862fc09b2810be7da4e1cb08facbdd7`；锁、package-lock 与 LFS policy 在核验时无本次改动。

| 现有命令 | 当前结果 | 本地文件 | 本地字节 |
| --- | --- | ---: | ---: |
| `npm run backend:data:status` | `LOCKED_PUBLIC_FILES_VERIFIED`；退出 0 | 1,544 | 234,624,578 |
| `npm run assets:verify -- catalogs` | `MATERIALIZED`；退出 0 | 1,656 | 116,246,189 |
| `npm run assets:verify -- images` | `MATERIALIZED`；退出 0 | 285 | 29,912,377 |
| `npm run assets:verify -- text-history` | `MATERIALIZED`；退出 0 | 78 | 32,931,704 |

以上所需公开组全部复用现有字节，共 3,563 文件 / 413,714,848 B，无需 prepare 或网络传输。backend status 已按锁核验 runtime 精确文件，绑定 `eog-vnl-v22-2025-gba-fixed-20261017-r6`。其 `databaseVerified` 为 `false`。assets 的 MATERIALIZED 只证明选定资源已存在、非空且非 LFS pointer；来源 hash、许可证、格式及消费者行为仍由各出版 owner 验证。

按 timezone README 的既有 publication 核验 `geo-tz 8.1.10` comprehensive 两个数据成员：index 938,298 B、geometry 30,196,840 B，大小及 SHA-256 均与原 manifest 一致。未生成或更新该数据集。

## 双 EOG 原件续核（2026-10-24）

按现 `data-pipelines/runtime-data/current.lock.json`（本次 SHA-256 `046e9247fc4d0aff665ab9ad6b18b58a3862fc09b2810be7da4e1cb08facbdd7`）核对既有本机副本，没有新下载、上传或重产 r6：

- `backend:data:verify -- --profile rebuild --cache-root E:/Dev/Starward-data/sources/eog-vnl-v22-2025-c202604011200` **exit0**；两 TIFF 共 **17,420,036,496 B**，各自大小/SHA与锁一致。
- 已接收的 median GZIP 与 8 个 CF 分片共 **2,264,285,772 B**，单次顺序流核每个分片和完整有序 GZIP，均与锁一致。只核指定成员，不把原始全球 TIFF 混入普通 runtime/LFS 下载。
- 9个原 Drive 对象的当前名称/大小/原 parent/仅所有者私有权限已核。归一化 metadata 没有提供 checksum，**本次没有新远端内容读回**；复用[原完整远端读回及 fresh 共享接收证据](EOG-SOURCE-RECOVERY.json)（2026-10-18，同 ID/传输，压缩和解压后全哈希通过），不重下同批约2.26GB。
- 现有 GZIP/有序分片 importer、数据锁与 README 已覆盖恢复链；本次没有新 fresh import，也没有修改该 rebuild 接收实现、锁或现用 publication。

本机原件/传输证据在任务 `tmp/eog-local-recovery-20261024/{recovery-receipt,transport-verification}.json`；主receipt SHA-256 `cc8ab50b511094038860bef8e5393d0463c6887aca9ee314390c4891b6b8f87c`。这些是本次实际数据核验，不能由 Git 同步代替，也不外推到私有 DB、Heap、冻结包或产品验收。

## 保留的边界与缺口

- 所需 npm 非 optional 依赖和上述公开数据组：本次未发现 MISSING；无需重复下载。
- Heap 原交接绝对路径 `D:/dev/sky-lan-fullview.heapsnapshot`：本机 `Test-Path` 为 false，故该声明路径为 **MISSING**。没有扫描私人目录来猜测替代副本；未取得替代副本的 hash 绑定，不声称 Heap 已恢复。
- 私有数据库、配置、媒体、原账户/N05/R6：本次未读取或恢复、未连接服务，兼容性与 PUBLISHED 绑定仍 **UNVERIFIED**。Git 与公开文件验证不提供这些事实。
- gen34/R28 等冻结构建、Harness/任务原件：本次未重建、刷新或验证，保留原恢复义务。
- optional Map static recovery：本次未导入；全球 EOG rebuild 原始 TIFF/压缩传输已由上述独立核验确认，旧远端完整字节/fresh import证据复用，不能外推其余私有恢复输入。
- 未操作微信开发者工具、ADB、手机、共享服务或数据库，未上传资料。当前 device、原生资源、OOM 及全部产品验收义务保持原状态。

依据：AGENTS、global Context、[资源 owner](../../../project_context/development-workflow/resources-and-artifacts.md)、[runtime-data owner](../../../data-pipelines/runtime-data/README.md)、development skill、现有 LFS policy、catalog/timezone/runtime-assets README。后续实际消费者若暴露新的必需输入，沿原 owner 定位、补齐、验证后重试；不将本记录扩张为全仓或产品全绿。
