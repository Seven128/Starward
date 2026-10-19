# Release-reference 部分结果修复独立审查

日期：2026-10-19。审查者：独立 agent `release_reference_partial_review`，未参与实现。基准为已交付 `18c2cac106aa84dc7fe8d9e93e6249d2311b610b`，仅审查本批 `release-reference-diagnostics.mjs`、其测试和 `pipeline-and-host.md` 增量；原完整审查见 [RELEASE-REFERENCE-INDEPENDENT-REVIEW.md](RELEASE-REFERENCE-INDEPENDENT-REVIEW.md)。本 agent 只新增此记录，未改实现、执行 Git 写操作或操作远端、服务、Docker、IDE、手机。

结论：审查发现的一项 P2 已修复并复核，最终冻结输入没有尚存 P1/P2。该结论支持进入既有 CI 和固定远端观察，不证明服务恢复、完整引用、镜像恢复能力、tag 删除权限或手机表现。

## 触发与审查范围

[实际远端报告](RELEASE-REFERENCE-REMOTE-20261019.json) 的 run `39274956661`、head `18c2cac106aa84dc7fe8d9e93e6249d2311b610b` 保留了有效 base/stopped metadata，但目录枚举超限使 current 与历史批量同时 `budget_exceeded`。本批将固定 base → current pointer → successful deploy receipt → candidate 链移到历史目录枚举之前，并在原总读取预算内预留固定依赖的最终 byte recheck 与 EOF 余量。

检查确认未提高 256 KiB 单文件、512 directory entries、128 receipts、8 MiB 实际读取预算。固定四路径、允许的文件位置、目录 FD/no-follow/nonblocking、普通单链接文件、所有权/权限、文件字节复核和 identity 前后复核保留。SSH、Docker、runner sanitizer、成功分类和 workflow 未在本批扩权；没有新路径、命令、健康结论或删除权限。Context 的新句与这种部分结果语义一致。

## 发现并关闭的问题

P2：中间实现将最终 `names(receiptDirectory)` 的所有失败仅归到历史批量。在第二次 `opendir` 时改变 receipt directory 的 mode 为 `0777`，或改变 inode，精确生成模块仍输出 `current.status=observed`，虽然 batch/observation 已为 `permissions_invalid` 或 `changed`。这使目录安全变化与无关名字集合变化混同。

独立复现对应中间 source SHA-256 为 `0047605ddd2adeaa431f6e9f626962310128bc75488d77a4f65c287658225dfd`。root 随后把共同目录的持有 FD/原路径 identity、ownership、mode 重核移到最终目录枚举之后，并加入两项回归子例。独立复跑相同精确生成模块场景，current 分别转为 `unknown/permissions_invalid` 和 `unknown/changed`；仅无关集合变化仍保留 current。本问题已关闭。

## 实际检查

使用本机 Node 24.16.0 执行：

```text
node --test --test-reporter=tap tools/deployment/release-reference-diagnostics.test.mjs tools/deployment/run-host-diagnostics.test.mjs tools/deployment/runtime-diagnostics.test.mjs
```

实际结果：43 tests、43 pass、0 fail、0 cancelled、0 skipped。受影响检查保留固定依赖文件变化、非法类型/权限/链接、部分失败、输出隐私、旧 identity 消费者和生成模块检查。

另将精确 `releaseReferenceScript` 中的完整 self-contained module 交给 VM 执行，复用已审阅的 fake filesystem/Docker oracle；模块链接仅允许声明的 fake builtins，未访问真实 Docker、SSH 或服务。

| 独立场景 | current | 历史批量 | 实际读取 bytes |
| --- | --- | --- | ---: |
| 512 个额外无关条目使枚举超限 | observed | unknown / budget_exceeded | 3,854 |
| 第二次枚举新增无关名字 | observed | unknown / changed | 5,754 |
| 历史文件耗尽原总读取预算 | observed | unknown / budget_exceeded | 8,388,608 |
| 第二次枚举时目录 mode 改为 0777 | unknown / permissions_invalid | unknown / permissions_invalid | 5,754 |
| 第二次枚举时目录 inode 改变 | unknown / changed | unknown / changed | 5,754 |

五项均保留 `matchingCount=null`，`releaseReferenceSucceeded=false`；总实际读取不超过 8 MiB。fake 成功打开与关闭的句柄计数一致；输出私密字段/文本排除断言通过。执行仍使用固定 metadata Docker oracle，验证了单次 timeout 10 秒、maxBuffer 32 KiB；未调用真实 Docker 进程。`NON_ATOMIC` 和 `referenceCompleteness=UNVERIFIED` 保留，部分 current 可观察没有变成完整诊断成功。

`git diff --check` 对三份最终输入通过。第一次本地汇总命令没有显式选 TAP，未显示计数；随后显式选 TAP 得到以上 43/43 结果，没有因此修改实现。

## 尚未验证

- 当前 Windows 本地执行仅验证不支持平台 fail closed，以及 fake Linux 边界。新 revision 的 Ubuntu/Node 24 CI 和真实 Linux 文件系统检查仍由既有 CI 提供，未在此审查中替代。
- 远端 run `39274956661` 属于旧实现；新实现的实际 fixed current 链、权限、预算与并发变化尚未重新观察，不把本地 partial case 当作远端结果。
- 历史批量仍可能因预算、缺失或变化而未知。固定链可观察不能证明完整 backup/rollback/OCI 引用、原 digest 可恢复、当前服务健康或 registry 清理条件。手机和性能验收不在此审查中。

## 最终审查输入 SHA-256

| 文件 | SHA-256 |
| --- | --- |
| `tools/deployment/release-reference-diagnostics.mjs` | `fd9fd43061d8a5ff05b1c8de9d9bbad69882c6fbb70141018313ae8cc97d3a25` |
| `tools/deployment/release-reference-diagnostics.test.mjs` | `1124c77f5d46211f43c6333bf8e36e2f413c4a529abaa58c384ae047e26b1d7b` |
| `project_context/deployment/pipeline-and-host.md` | `df1f01f092edfd7e900689ae2e492534f56a7a0c5737a25d7ef5fc7586d6415c` |
