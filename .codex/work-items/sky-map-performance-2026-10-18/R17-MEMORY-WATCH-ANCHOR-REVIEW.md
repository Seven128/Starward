# 内存 watch 锚点独立审查

2026-10-19。独立于实现者的源码、差异与纯 host 测试审查。范围为 `r17-sky-memory.mjs`、新增 `r17-memory-watch-anchor.mjs` 及测试、[实现说明](R17-MEMORY-WATCH-ANCHOR.md)，以及性能方法的跨观测关联新增段落。**未发现需要阻止本次 task-only 修复的缺陷。** 本结论不补齐历史 r10 的精确关联，也不构成新 watcher 的实际写盘或设备运行验证。

## 已核对的责任

- 相对 Git HEAD 的 watcher 差异没有修改 `sample()`、ADB 命令、前台 Activity/ProcessRecord 绑定、进程替换退出、PSS/RSS 解析、次数/间隔限制或循环停止条件。新增工作限于读取工具源字节哈希、创建私有锚点、累计成功写入的行流哈希和封存状态。
- 新文件名使用独立 UUID，原观察行仍只有相对 host 时间与既有内存字段。stdout 的新增失败信息是固定状态；绝对 epoch、工具哈希只传入固定外部 owner 的 sidecar。sidecar 的元数据白名单未引入 serial、PID、activity、账号或任意输入对象。
- start 记录绑定观察文件名、observer UUID、起始相对时钟原点及三个工具文件 SHA；end 记录绑定成功写入行数及对应字节流 SHA。源码可见 hash 只在 `writeFile` 成功后更新。它不等于磁盘读回验证：部分写入失败或后续文件变化仍需实际读回并核 hash，说明文档已保留该边界。
- sidecar 首次写入与观察文件首次写入均独占创建，已有同名文件不会被覆盖。结束追加失败后不会盲目重试；缺 start/end、封存失败或 hash 不匹配均不能作为完整观察。这次实现没有改写历史 watch。
- `productRunId=null`、`productCandidateVerified=false` 与实现一致。工具源哈希只标识读取的工具源字节，不伪称已绑定当前产品候选；UUID 只标识本次 observer。
- clock 记录是首尾 host 读取区间；非有限值、读取倒退、原点矛盾或端点 wall 倒退保留 `invalid_clock`，不会归零冒充成功。有效端点也仅标 `host_endpoints_only`，无法约束中途跳变/恢复或据此推算设备呈现时刻。文档没有扩大该能力。
- 实际读取 `device-test.mjs` 的 `saveCapture` 与 record 分支后，确认实现说明对 `capturedAt` 的限定准确：普通截图为返回后的 host 时间，录屏分支为 record 返回后的 host 时间；二者均不等于设备取样时刻或视频 PTS=0。

## 通用方法边界

新增性能方法采用“被测行为实际发生的区间”与“各记录的覆盖范围”，条件是当前决策确实需要合并不同观测。它要求足够的操作/目标身份和事件或时钟关联，保留不确定性，并明确优先复用已有充分证据。没有把实际播放、Play/Pause 分段、新 runId、新时钟适配器或重新采样推广成所有调查的必需步骤；适合留在测量方法 Skill。r10 的缺口和新 watcher 的有限能力仍留在 task evidence，不写成产品 Context 的普遍要求。

## 本次验证与剩余范围

Node v24.16.0：`node --test .../scripts/r17-memory-watch-anchor.test.mjs` 的 5 项全部通过；watcher 与 helper 的 `node --check` 均通过；两个 tracked 差异的 `git diff --check` 通过（Git 仅提示既有 LF/CRLF 转换策略）。测试只 import 无设备依赖的 helper，使用 fake clocks 和内存 fake FS，未写私有证据目录。

没有运行或 import watcher 主入口，没有连接手机、ADB、IDE、服务、preview 或 debug；没有 Git 写操作。实际 NTFS 权限效果、文件写盘读回、设备样本与其它观察的实际关联仍未验；本审查不把 `mode: 0o600` 或 fake FS 测试当成这些运行结果。设备恢复后只在下一次有必要的观察中建立所需关联，不因此重复已有效的 r10 研究或提前追加设备动作。

审查输入 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `scripts/r17-sky-memory.mjs` | `ea56426eca19ba778334564a991863008238669723113aaf90643d00b188eb29` |
| `scripts/r17-memory-watch-anchor.mjs` | `2b0aa3f8786be4c09933ff0e3687132c7f0e2fc43fb8f6802188bbdcd06bef8e` |
| `scripts/r17-memory-watch-anchor.test.mjs` | `fb04a0d8d297bae7c58b8b4369745db13e9c8467bab456c868519c8a331b1d73` |
| `R17-MEMORY-WATCH-ANCHOR.md` | `0c3c27a7f3d1a11afb24f68d7254902225fa29a617ecfd61a3c7475b433a565e` |
| `performance-investigation.md` | `f54eee2840aa1fd1b4395e5859cb8aaa5ba6a6fd61c1ffa485e44843d85ba37a` |
