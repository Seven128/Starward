# 本机依赖与公开数据核验（2026-10-23）

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

## 保留的边界与缺口

- 所需 npm 非 optional 依赖和上述公开数据组：本次未发现 MISSING；无需重复下载。
- Heap 原交接绝对路径 `D:/dev/sky-lan-fullview.heapsnapshot`：本机 `Test-Path` 为 false，故该声明路径为 **MISSING**。没有扫描私人目录来猜测替代副本；未取得替代副本的 hash 绑定，不声称 Heap 已恢复。
- 私有数据库、配置、媒体、原账户/N05/R6：本次未读取或恢复、未连接服务，兼容性与 PUBLISHED 绑定仍 **UNVERIFIED**。Git 与公开文件验证不提供这些事实。
- gen34/R28 等冻结构建、Harness/任务原件：本次未重建、刷新或验证，保留原恢复义务。
- optional Map static recovery 和全球 EOG rebuild 原始 TIFF：当前依赖准备未消费，未下载/导入；不能由 runtime 通过推断其本机恢复状态。
- 未操作微信开发者工具、ADB、手机、共享服务或数据库，未上传资料。当前 device、原生资源、OOM 及全部产品验收义务保持原状态。

依据：AGENTS、global Context、[资源 owner](../../../project_context/development-workflow/resources-and-artifacts.md)、[runtime-data owner](../../../data-pipelines/runtime-data/README.md)、development skill、现有 LFS policy、catalog/timezone/runtime-assets README。后续实际消费者若暴露新的必需输入，沿原 owner 定位、补齐、验证后重试；不将本记录扩张为全仓或产品全绿。
