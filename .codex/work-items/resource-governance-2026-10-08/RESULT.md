# 本地资源与任务记录治理结果

后续状态：2026-10-08 用户已另行授权提交/推送，检查与免费 LFS 条件见 [提交保存点](../cloud-sky-native-2026-09-22/COMMIT-CHECKPOINT-2026-10-08.md)。下文未提交/未上传、hook 未安装等是本治理结束时的历史事实；实际上传成功仍以 Git/远端对象读回为准。

本轮授权：使用 GitHub Free，治理重复记录/静态资源并沉淀规则。仅操作 `codex/remote-main-20260908`；HEAD 保持 `e2136ebf59875f02f921bba393d1b11d7782f81e`。未提交、推送、采购、部署、发布、变更账户计费设置或恢复云观星实现任务。本聊天 `get_goal` 返回空，没有新建 Goal。

## 已执行

- 在改变跟踪前，将原先 Git 可见的整个云观星任务归档：72,102 个文件，原始 4,728,706,707 bytes；逐成员与现有源文件校验后才开始治理。相同内容只有 13,067 份，说明大量体积来自重复副本。
- 原文件均保留原路径。4,593 个历史脚本、原始记录/截图、临时副本已从 Git 索引移除；当前任务入口、需求、验收账、简明结论和两个当前批处理脚本仍保留。没有删除工作文件，没有改写 Git 历史，因此历史仓库体积不会立即缩小。
- 固定测试/发布输入明确豁免忽略规则，包括文字批处理样本的 17 个直接字节依赖。新增回归检查保证这些依赖不会被清理规则隐藏；不以“本机文件还在”代替可跟踪依赖。
- 2,012 个已选资源转为 LFS 指针：实际 171,170,429 bytes，索引指针合计 261,458 bytes。所有资源工作文件、指针中的 SHA-256/大小及本地 LFS 对象逐一相符。当前 v72 文案、元数据、许可、来源说明仍为普通 Git 文本。旧资源版本与 URL 没有删除。
- 新增 `assets:prepare` / `assets:verify` / `assets:audit` / `assets:rules`；当前已准备资源的调用不发起网络请求。CI 根据资源输入缓存 LFS 对象并在构建前准备；开发和发布入口拒绝缺失/空文件/未还原指针。Docker 排除全部 `output/`，避免把图像加工缓存和归档加入构建上下文。
- 固化于 [资源与记录 Context](../../../project_context/development-workflow/resources-and-artifacts.md)，并接入默认导航和 manifest；继续使用已有批处理 owner，不另建 Skill 或平台。

## 恢复入口

- 归档：`output/resource-governance-2026-10-08/cloud-sky-task.tar.gz`，1,258,125,058 bytes。
- SHA-256：`85010f2df1e81aeed53163a5c605cb44e6e3b5708e4123bbba9f0ca03573d633`。
- 小型收据：同目录 `cloud-sky-task.tar.gz.receipt.json`；迁移身份核查：`migration-verification.json`；一次性原始资源哈希表：`asset-identity.json`。
- 恢复时先验证归档 SHA-256，再用标准 `tar -xzf <archive> -C <empty-recovery-directory>` 解压至空目录，按需取回。不要覆盖当前工作目录。验收账及一个 23 MB 累计快照已实际恢复，恢复文件与原文件哈希一致，见 `restore-check.json`。
- 这是同盘可恢复归档，**不是异地备份**。没有上传云端，没有回收原文件，所以没有释放磁盘空间。不要清理本目录或原始输入，直到有经过验证的替代恢复来源。

## 核查与边界

- 资源回归 5/5 通过；工作流、镜像和 CI 范围既有检查 14/14 通过；Context 路由验证通过（该检查不验证事实正确性）。
- 实际 `npm run build:miniapp:release` 通过。首次运行揭示契约包发布编译误纳测试文件、引入 API 测试夹具而越过 rootDir；按相邻包既有模式给发布 tsconfig 排除 `*.test.ts` 后通过。普通 typecheck 配置及测试入口未缩减，契约包 typecheck 通过。
- 额外固定输入/契约/画布检查 27/28 通过。保留 **FAILED**：`sky-canvas-time.test.ts` 的 `production frame requests preserve exact data/time and clear expired or untrusted input` 因测试 VM 中 `readHipsTiles` 未定义而失败。治理未改动该测试或产品画布源码；首个使用保留原始 report 的场景通过。此缺陷排入云观星后续检查，不把本轮治理扩展为恢复产品任务。
- 原 REVIEW-CURRENT 的 74 个引用全部仍与工作文件一致；验收账、v72 和公开项目配置的哈希均未变，原 FAILED / UNKNOWN / MISSING 未被覆盖。独立复核 **MISSING**，本轮只有自检；目标设备与云端 CI 未验证。
- 大量删除行是一次性的 Git 退出跟踪与 LFS 转换差异，**不表示源文件被删除**。初始未跟踪文件约 67,000 个，治理后约 320 个（收尾暂存会继续降低）；剩余包括之前的有效产品成果，不作一刀切隐藏。

## 下一次使用

本机继续开发前通常无需重新下载；需要时运行 `npm run assets:prepare`，小范围工作可附加 `-- images` / `-- catalogs`。新增资源沿用策略文件、内容哈希和现有流水线；重复加工/验证按批次执行，结果不递归复制历史。

本次 LFS 转换及退出跟踪已经暂存以形成实际索引状态，所有更改仍未提交。**首次授权推送前**核实 GitHub 账户剩余 LFS 存储/周期下载额度以及零付费预算，检查/安装 LFS pre-push hook（当前未安装；linked worktree 的 hook 可能属于共享 Git 目录），完成资源上传与另一份工作副本的拉取校验。当前未核实远端额度，未修改共享 hook；不能声称“已存到 GitHub”。不要购买 Team，不做历史重写或 `fetch --all`。
