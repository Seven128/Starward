# 固定容器身份诊断：独立审查

审查范围为相对 `dcec3722` 的六个实现、测试、workflow 和 runbook 修改，以及 `RUNTIME-IDENTITY-DIAGNOSTIC.md`。已读取 AGENTS、release Skill、部署 Context 和既有 SSH connection parser。只读取 Git diff，运行本地聚焦测试及伪 Docker 依赖；没有连接远端、调度 workflow、执行 Docker、修改 Git 状态、操作手机、服务、Drive 或数据库。真实远端 identity、receipt 和 H4 仍未验证。

## 当前结论

一项 P2 已由 root 修复并通过本代理独立复核。当前审查范围内没有遗留的可复现问题；固定查询、受保护 SSH 及既有诊断模式的边界保持。本审查只写此记录，没有修改实现。真实远端正确性仍未建立。

### 已解决 P2：拒绝状态与 running 的矛盾，避免停止对象成为成功结果

初次审查位置：`tools/deployment/runtime-diagnostics.mjs:24`、`:68` 和 `tools/deployment/run-host-diagnostics.mjs:68`。

实际发出的 Node 程序在伪 Docker 返回一个固定标签、用户匹配的对象，`state="exited"`、`running=true` 时，仍产生 `matchingContainerCount=1`、`runningContainerCount=1`、`stateCounts.exited=1`、`stateCounts.running=0` 的观察。runner 的第二次过滤接受它，`diagnosticSucceeded` 返回 true。该夹具明确是矛盾输入，不是当前远端发生停止或 Docker 实际返回矛盾的证据。

修复位于 `tools/deployment/runtime-diagnostics.mjs:29`、`:68`、`:72` 和 `tools/deployment/run-host-diagnostics.mjs:68`：第一层拒绝状态/Running 矛盾，第二层将三种 active 状态计数与 runningContainerCount 绑定并校验选中状态；只有唯一 `state="running"`、运行标志和用户均匹配的已验证观察令命令成功。paused/restarting 保留有效观察但返回非成功。该对应关系与 [Moby v28 StateString](https://raw.githubusercontent.com/moby/moby/v28.0.0/container/state.go) 的 Running 分支和 SetRestarting 一致；本代理已直接读取该主源确认。

独立重跑实际 emitted Node 正文后，原矛盾输入现在只输出 `runtime_diagnostic_identity_response_invalid` 并以 65 退出，没有 JSON 成功输出；第二层另行拒绝伪造 aggregate。七种相反状态/Running 组合、paused/restarting 观察和正常 unique-running 路径均符合预期。

## 已完成检查

- 聚焦命令 `node tools/run-node.cjs --test tools/deployment/runtime-diagnostics.test.mjs tools/deployment/run-host-diagnostics.test.mjs tools/deployment/imagery-runtime-probe.test.mjs`：修复前 22 passed；修复后包含新增状态回归的 24 passed，0 failed，0 skipped。
- 直接取 `identityScript` 实际发出的 heredoc Node 正文，仅以伪依赖替换 `node:child_process` 的 import，在独立 VM 执行。14 个有效/故障用例通过：空集合、停止对象、多个运行对象、唯一运行对象、运行加停止对象、错误用户、列表变化、inspect 运行状态变化、空/错对象 inspect、label 错误、非法 ID、异常私有文字、非法 revision/镜像引用。验证 argv 固定、Docker 单次 10 秒/32 KiB 边界、成功输出过滤以及失败只输出固定码。另一个矛盾状态用例复现上面的 P2。
- 修复后独立运行共 27 项 emitted-program/过滤检查：上述 14 项仍通过；7 项状态/Running 矛盾被拒绝；paused/restarting 两项正常观察均非成功；4 项伪造 aggregate/选中状态在第二层被拒绝。没有替换生产投影或复制一个测试实现来产生报告。
- 已核对实际 inspect 模板仅选择 ID、状态、Running、固定 user/label 匹配布尔值、revision label 和镜像引用。原始 ID/仓库名仅留在进程内部；严格 hash 与固定字段投影移除其他字符串。没有读取 Config.Env、容器配置文件、SQL 或应用数据。
- identity 分支只发送固定 `ps`/`inspect`；没有 `docker exec`、应用启动、供应商请求、提醒、锁或部署操作。既有 runtime/providers/imagery 程序未改；对应聚焦测试保持通过。
- workflow 相对基线只增加 mode choice。手动触发、main-only、staging Environment、最小 contents 权限、独立 concurrency、SSH protected connection mirror、pinned host trust、临时密钥清理和已有超时均保持。
- 六个文件 `git diff --check` 通过，仅 README 的现有 CRLF/LF 提示。没有运行全套 CI 或重型 I/O。

Context 固定模式列表仍由 root 在集成时补齐；它不构成本次远端验证。该诊断是有界观察，不是原子 Docker 快照或后续持续监测；合法 revision/digest 也不能证明 current receipt、应用环境、readiness 或供应商能力。
