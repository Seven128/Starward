# Release-reference 独立审查

日期：2026-10-19。审查者：独立 agent `release_reference_review`，未参与本批实现。审查基线为 `2874b80af30f207b02046d365f5cbeb8d6fa19c0` 上的本批工作区增量；文件 SHA-256 见下表。仅新增本记录；没有修改实现、执行 Git 写操作或操作远端、服务、IDE、手机。

结论：在受影响责任内未发现 P1/P2 问题。本结论允许进入既有 CI 和经授权的固定远端观察，不证明远端结果、服务恢复、完整镜像引用或手机表现。

## 审查边界与结果

- 对照 `operator-preview.mjs` 的 current pointer 和 v1/v2 receipt 生产者，核对 staging base → 固定 receipt directory → successful deploy receipt → candidate descriptor 的链。四个位置来自既有受保护 connection packet；pointer 的候选必须位于 protected candidate root，receipt 必须为同目录固定 UUID 文件名，sourceRoot 必须是 protected release root 下的 `control/revision`。不加载旧 control 代码、lane secret 或 backup manifest。
- 对照 `deployment-connection.mjs` 和 `apiIdentityProbe`：只增加固定 `release-reference` 模式。旧模式、唯一 running `selectedContainer` 和 additive stopped metadata 的含义保留；无任意命令、路径、SQL 或 provider 输入。未知模式、原型属性名和非字符串模式在执行前拒绝。
- 逐层检查 Linux 目录 FD 锚定的 `/proc/self/fd` 访问、`O_NOFOLLOW`/`O_DIRECTORY`/`O_NONBLOCK`、普通单链接文件、root/当前 UID 所有权、不可 group/world 写、fstat/path stat/bytes 复核，以及最终 receipt directory 和 identity 复核。缺失、异常、变化、预算不足保留 unknown；正常结果保留其独立边界，没有 prepared-candidate fallback。
- 核对 256 KiB 单文件、512 directory entries、128 selected receipts、8 MiB 实际读取（含复核）预算。既有 SSH wrapper 保持 60 秒/64 KiB，单次 Docker 调用保持 10 秒/32 KiB；SSH 超时不是已证实的远端取消。文件/目录句柄 finally 回收，SSH 私钥和 known-hosts 临时目录由既有 owner 回收。
- 生产者和独立 runner sanitizer 均仅输出固定分类、枚举、哈希与验证身份；拒绝矛盾报告，丢弃私密扩展字段。未发现原始配置、错误、连接值、路径、container ID、operator 或 repository 输出路径。stderr fatal 只有固定 `release_reference_failed`。
- `parseEnvironmentText` 仅把原有私有 helper 收入函数体，以便同一 parser 自含嵌入；引用、转义、export、重复 key、错误语义和返回对象冻结语义保留，没有新 parser。
- 核对 workflow 继续 main-only、staging Environment、独立 concurrency、固定依赖 pin；没有新增 secret 或权限。`pipeline-and-host.md` 正确区分 identity 不读文件与新固定引用观察；`NON_ATOMIC`、`referenceCompleteness=UNVERIFIED` 始终存在。删除陈旧“trusted-main publication unexercised”句不以 enrolment 或历史结果代替精确 workflow receipt。

## 实际检查

使用本机 Node 24.16.0 执行：

```text
node --test tools/deployment/release-reference-diagnostics.test.mjs tools/deployment/run-host-diagnostics.test.mjs tools/deployment/runtime-diagnostics.test.mjs
```

43/43 通过。覆盖生成模块的实际语法检查和 VM 执行、成功与部分结果、异常文件类型/权限/链接、读取/目录/身份变化、预算、隐私与旧 identity 消费者。Windows native case 明确只证明不受支持平台 fail closed，没有宣称 Linux 文件系统已验。

另对精确 `releaseReferenceScript` 中的完整 self-contained module 做了独立 VM 执行。链接只允许所声明的 fake builtins，Docker 仅固定 metadata oracle；复用并审阅测试的 fake filesystem，另加以下场景，所测 probe 不访问实际文件系统、Docker 或 SSH：

| 场景 | 实际结果 |
| --- | --- |
| 128 个 selected receipt，其中 1 个 current success、127 个 matching failure | current、stopped、matching 均 observed；127 条输出 38,597 bytes，低于 64 KiB |
| Docker 抛出带私密文本的异常 | stopped 为 `identity_failed`，current 独立 observed；无异常原文输出，整体不成功 |
| candidate 非法 UTF-8 | current 为 `text_invalid`；stopped 与 1 条有效 matching receipt 保留，整体不成功 |
| 已打开目录在 close 时抛异常 | observation 为 `read_failed`，current/匹配结果保留，整体不成功 |

以上四项全部通过。第一次附加 harness 的 fixture 误删 pointer，且隐私正则过宽匹配合法枚举；修正 harness 后重跑通过，未因此改生产实现。

`git diff --check` 对本批已跟踪源/测试/workflow/Context 通过。

## 尚需实际运行的边界

- Product CI 为 Ubuntu/Node 24；`Test deployment owners` → `npm run test:deployment` → `tools/deployment/*.test.mjs` 会收录新测试，并进入真实 Linux native filesystem smoke 分支。尚未在本审查进程执行该分支；以本批精确 revision 的 CI 结果为准。
- 远端 Linux 的保护路径、实际 base/receipt/candidate 的存在/大小/权限、Docker 可用性与 non-atomic 期间变化仍须既有 main-only 固定 workflow 实际观察。预算超出或缺失可产生有效的部分 unknown 报告，并不授权扩大搜索。
- 成功只表示这次有界引用观察各部分被观察到；不建立服务健康、failed deploy 的停止原因、backup/rollback/OCI 全部引用、原 digest 可恢复性或 registry tag 删除权限。未触及手机验收和性能结论。

## 审查输入 SHA-256

| 文件 | SHA-256 |
| --- | --- |
| `tools/deployment/release-reference-diagnostics.mjs` | `3cb5e29a18a1f386592f6f8b9f914a255b48bd43cb4fb215fc2a08062923184b` |
| `tools/deployment/release-reference-diagnostics.test.mjs` | `ab85ae6bc29b60767925ed928abbc89b56f6b903a67f0f9f93fb2f7927b78522` |
| `tools/deployment/env-file.mjs` | `5c3456aa135f881b1fb8f669444fed40b705884a300662cdefa1470ab5d0f1af` |
| `tools/deployment/run-host-diagnostics.mjs` | `fa9fec09907a23b48e6158e1c01d3ac24139d890cd9a7e6f6fe3379060a25e48` |
| `tools/deployment/run-host-diagnostics.test.mjs` | `23e8a7c68591a075b07ce81b7b053b5ac7300134161b6db5cf4f693baea8a722` |
| `.github/workflows/backend-diagnostics.yml` | `97b74758bd02c719ac422bc8f9d4fb44d110ac5aa5725a34ec2dc08cc81e273d` |
| `project_context/deployment/pipeline-and-host.md` | `3ad7d8772b321d72fc355502a617ffd55a44eb608d2918d73975488f3bada345` |
