# Host-storage 固定聚合独立审查

2026-10-19。审查者：独立 agent `host_storage_independent_review`，未参与实现。本次只新增本记录，未改源码、Git、CI、服务或任何远端状态，未调用真实 Docker、SSH、IDE、手机或浏览器 mutation。

结论：冻结输入未发现尚存 P1/P2。实现、runner/workflow、Context 与[原观察边界](HOST-STORAGE-OBSERVATION-BOUNDARY.md)及[实现说明](HOST-STORAGE-OBSERVATION.md)相符，可进入原 CI 和一次固定主机观察。此结论不证明 Linux 原生执行成功、实际空间归属、主机 readiness、OCI 恢复、清理资格、服务恢复或手机性能。

## 范围与语义

全文核对本记录末表九份代码/Context 输入、新实现说明、[当次 host guard 失败](CURRENT-HOST-PREFLIGHT-20261019.json)、[发布引用 owner](RELEASE-REFERENCE-OBSERVATION.md)和[既有部分结果审查](RELEASE-REFERENCE-PARTIAL-REVIEW.md)。复用既有实际失败与成功指针，不重扫历史或重复远端观察。

`host-storage` 保留 main-only staging、固定 mode、四条受保护连接路径、原 SSH/known-hosts/临时凭据清理和 60 秒/64 KiB 界。前三条只作目录聚合；第四条仅核语法，既不 stat 也不打开。没有任意 selector、路径、命令或落点输入。生成程序没有文件载荷读写、DB、应用配置/日志读取、部署、保留维护或删除入口。

共享 factory 沿根到叶持有目录 FD，以父 FD 打开每段，保持 no-follow/nonblocking、root/当前 UID、禁止 group/world 写、前后 inode/device/mode 等核对与句柄关闭。`df`/`du` 子进程明确把 held FD 传为 child fd3，固定目标 `/proc/self/fd/3/.`。原发布引用的普通单链接文件检查、字节重核、固定链与历史批量的独立性及原预算未移入或削弱；实际调用者和生成模块均接入同一自包含 factory，未产生第二套路径 owner。

三组含义保持独立：`df` 是 release 文件系统 total/used/available，三根 `du -P -x -B1 -s` 是各自根同设备范围的分配空间，Docker 是 daemon 的分类计数与原生 rounded 字符串。没有分类相加、精确可删量、Compose 归属或复制 10 GiB guard。缺类/非法/超时仍为 unknown/null；局部失败保留其它合法结果。最终目录安全变化撤销相关数字，关闭异常保留 `observation=unknown`。恒定 `NON_ATOMIC`、`referenceCompleteness=UNVERIFIED`、`cleanupAuthorization=NONE`，成功函数只判聚合观察完成。

核对[Docker 官方命令说明](https://docs.docker.com/reference/cli/docker/system/df/)及[CLI v29.5.3 formatter](https://raw.githubusercontent.com/docker/cli/v29.5.3/cli/command/formatter/disk_usage.go)：非 verbose 固定分类、TotalCount/Active 十进制字符串及 HumanSize/Reclaimable 形状与解析器一致；这没有验证主机的实际 Docker 输出。[GNU du 源](https://raw.githubusercontent.com/coreutils/coreutils/master/src/du.c)区分分配量与 apparent size，[df 源](https://raw.githubusercontent.com/coreutils/coreutils/master/src/df.c)支持所选列，[timeout 源](https://raw.githubusercontent.com/coreutils/coreutils/master/src/timeout.c)支持独立进程组和 124/137 分类。GNU 手册页面本次抓取超时，以上用官方源码核对，不把最新源码当主机已安装版本的运行证据。

49 秒单调剩余预算、每次 df 3 秒/du 8 秒/Docker 15 秒及小 stdout/stderr 界受固定 GNU timeout 50 秒外壳约束。固定环境、shell-free 子调用和严格二次投影不回显原错误、目录、设备、仓库、ID、名称或任意额外字段。外壳只归类三个固定码。这里是用户态执行预算，未声称取消全部内核 I/O 或已提交的 Docker daemon 工作。

## 实际检查

本机 Windows、Node 24.16.0，执行：

```text
node --test --test-reporter=tap tools/deployment/host-storage-diagnostics.test.mjs tools/deployment/release-reference-diagnostics.test.mjs tools/deployment/run-host-diagnostics.test.mjs
```

实际 44 tests、44 pass、0 fail、0 cancelled、0 skipped。覆盖新模式、发布引用旧调用者、原 SSH/投影边界和精确生成模块 fake builtins。另复核原 `runtime-diagnostics.test.mjs` 为 15/15，未改变其代码。`git diff --check` 对九份输入通过。

注意：零 skipped 不表示 Linux 分支执行过。Windows 的 native Linux df/du 与 shell 用例在分支内只验证平台 fail-closed/给出限制说明；Linux 的真实 FD 继承、内核权限、GNU df/du 数值和 shell 退出码仍必须由后续 Linux CI 建立。本次所有 Docker 结果均来自 fake，未执行真实 Docker。

另以精确 `hostStorageScript` 的完整 self-contained module 运行四个有区分力的反例。只链接允许的 fake builtins，保持固定命令、继承 FD 和原预算，全部通过；每项句柄均关闭，输出私有文本排除断言通过。

| 反例 | 实际保留/失效结果 |
| --- | --- |
| release 的 du 超 stdout 界 | RELEASE allocation unknown/output_exceeded，已观测 df、另两根、Docker 保留 |
| INBOX du 期间共同祖先变为可写 | df 与三根相关结果 unknown/permissions_invalid、同设备比较 null；独立 Docker observed |
| Docker 期间 release 根被替换 | df/RELEASE unknown/changed、全部同设备比较 null；另两根 allocation 与 Docker observed |
| 迟到重复 Docker 类且字段非法 | Images unknown/output_invalid、数字 null；Containers 等独立类和 df 保留 |

四项均使 `hostStorageSucceeded=false`，未把 partial observation 当作完整成功。没有为无变化责任继续扩组合。

## 仍未验证

- 新 revision 的 Linux 原生 CI、固定主机第一次实际 `host-storage` 观察，以及主机各工具的真实可用性/形状。
- 数字对应的具体对象归属、消费者/回滚引用、私有保全和原样恢复能力；聚合不授权 prune、删 tag/volume/backup 或降低 guard。
- 原 TCR 额度、停止 API、服务恢复及完整 Goal 的产品/手机义务；本审查不改变其状态。

## 冻结输入原始 SHA-256

| 文件 | SHA-256 |
| --- | --- |
| `tools/deployment/host-storage-diagnostics.mjs` | `c1eeed0035a76838fa120923ac5c0282a9999f0d08c6b159b747595fa9d4a5e0` |
| `tools/deployment/host-storage-diagnostics.test.mjs` | `2fe35e1c867998d1a510b277ab12c94f74b916e5b9dcf74a2d74bbcf6c8a816f` |
| `tools/deployment/protected-directory.mjs` | `1294816e93b0a2f6312b0d4f31805b3469a9e7df1dd4f8cad79c43a6b97a1dbf` |
| `tools/deployment/release-reference-diagnostics.mjs` | `c85892a85d06464b466d558953a9bda20c7b69a88eebe02b9cdb73f9b05a0635` |
| `tools/deployment/release-reference-diagnostics.test.mjs` | `a39683ce1ad87c5d87e197993c2e45caf24b886d806d619c362d66083673787b` |
| `tools/deployment/run-host-diagnostics.mjs` | `34d39cc95cd15d6ef93d2af59fbfd3aad039354344f3cf984343d31a603f97f7` |
| `tools/deployment/run-host-diagnostics.test.mjs` | `0e08feaa41c57dfa6e9750d3f8907f6f482d5e4e035ed20dc9cdb5e31c2ab35e` |
| `.github/workflows/backend-diagnostics.yml` | `f9c30f87a54c02fff18d7db8f3f5113681ecf68b77c93b37d652d08a91769f62` |
| `project_context/deployment/pipeline-and-host.md` | `22895638213527b4370a99db4c2beed8a5067b6145ab088b819171f23a415e7d` |

另核 `HOST-STORAGE-OBSERVATION.md` 原始 SHA-256 为 `0500c13bd116e856ff2bb04c5754f8e2c024c16c25ea30b3c2cf022919754ea2`；实现说明的后续证据状态更新由原 owner 负责，不改变以上代码审查效力。
