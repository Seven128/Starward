# OCI 本地复制契约试验

2026-10-20（Asia/Shanghai）；范围 `OFFLINE_TOY_LAYOUT_CONTRACT_ONLY`。承接 [既定路径审查](OCI-RECOVERY-PATH-REVIEW.md)，只验证已选 ORAS 1.3.5 的实际本地 CLI，不重新选型，不增加生产源码、依赖或 workflow。

结论：**正确识别为 image/index 的 toy 图复制到全新 layout，可以保留精确 root 与全部后继 blob bytes；普通 copy 的成功退出码不能替代完整图核验。** 本次双平台图的 7 个 blob、6,623 bytes 全部逐文件通过长度、SHA-256 与原始 bytes 比较，复制后的 layout 再复制到另一全新目录仍全部通过。缺 blob、同长度改 blob、缩短 blob、不存在 root digest 都实际失败。另两个反例明确了不能过度外推的边界。

## 固定工具与输入

从 [ORAS 官方 v1.3.5 release](https://github.com/oras-project/oras/releases/tag/v1.3.5) 下载固定 `oras_1.3.5_windows_amd64.zip` 和该 release 的 `checksums.txt`。本地 archive SHA-256 同时匹配官方 checksum 行及 GitHub asset digest；未做 PGP 签名验证。只放任务临时目录，没有安装 PATH 或改系统设置。

| 对象 | 身份 |
| --- | --- |
| CLI 实测 | `1.3.5`，`windows/amd64`，Go `go1.26.9`，commit `d6e7b583b9afc7fa3798de77181c53c94418d727`，tree clean |
| 官方 ZIP | 4,973,091 bytes；SHA-256 `3e72bf9f4361625d68dc96a10f485c4bf9973f9f9b170652ab78220a0bc7092c` |
| 官方 checksum 文件 | SHA-256 `bc682611bd982a0cef94a53bbae37ea09f271fb32c40c1373dfd81eb9aefa36e` |
| 解压 `oras.exe` | SHA-256 `d821f17729ba7b438435daed0838aa08022708c417e3c7dc1ffa1038f9d70d61` |
| 当次一次性 fixture recipe | SHA-256 `8447638e086b43c06d45764418eae43dcf48ef5bf7f5f8aa1dcd0c14b8cab3e7` |
| 当次完整 toy 结果 | SHA-256 `40d1fb1e61947c3132d90e811785191eea26135573776f9447d04e213241652a` |
| [保留的结构化证据](OCI-OFFLINE-RECOVERY-CONTRACT-TRIAL.json) | 仓库LF版SHA-256 `f2adf547df7c6ecb093cc259a800b3311821230a3c82e73c2306351de15bb673` |

fixture 只有自行构造的 OCI image index、`linux/amd64` 与 `linux/arm64` 两份 manifest/config/USTAR layer。两个子图均不同；manifest/index 使用有意保留的缩进、键顺序和末尾换行，验证比较原 bytes，而非重新序列化后的 JSON。没有可运行应用或私有原件。全部 7 个 descriptor 的 media type、size、digest 和每例逐 blob 结果见结构化证据；关键 root 为：

- index：`sha256:37df35eebde8b852f0bfbce052565907953c25f6b27380234e94e66ec87bf0e3`，851 bytes。
- amd64 image：`sha256:e89659236153bd671255e038c36b07b30ceddbbc1e57aed377dd16dcf049a457`，576 bytes。
- arm64 image：`sha256:76bd0d29f1ff7aaf98099ea0ec15429ec6372e30d0e416609259fba1e80e1d28`，576 bytes。

实际命令统一为下列形状；正例和故障源例的目标目录执行前均不存在。显式 source/destination 空认证配置和 task-owned cache 避免依赖本机既有身份；未访问 registry、Docker、SSH、Drive、账号、服务、浏览器、IDE 或手机。命令执行上限 15 秒，固定 concurrency 1，无平台筛选，无递归 referrer 参数。

```text
oras.exe cp --from-oci-layout --to-oci-layout --no-tty --concurrency 1
  --from-registry-config <task-owned-empty-auth> --to-registry-config <task-owned-empty-auth>
  <source>@<fixed-root-digest> <fresh-destination>:restored
```

## 实际结果

| 输入 / 条件 | CLI 退出码 | restored root | 独立逐 blob 核验与意义 |
| --- | --- | --- | --- |
| 源 layout index 明确登记的 standalone image → fresh | 0 | 有 | 3/3 原 bytes、size、digest 精确一致 |
| 双平台 index → fresh，无 `--platform` | 0 | 有 | 7/7 精确一致，两个平台均保留 |
| 上一结果 → 第二个 fresh layout | 0 | 有 | 7/7 精确一致 |
| 源少一份 arm64 layer | 1 | 无 | `source_blob_not_found`；不构成完整结果 |
| 同一 layer 文件名不变，内容同长度翻转一 byte | 1 | 无 | destination ingest `mismatched digest` |
| 同一 layer 缩短一 byte | 1 | 无 | destination ingest `unexpected EOF` |
| 请求不存在的 `sha256:ffff…ffff` root | 1 | 无 | requested root `not found` |
| child manifest digest 存在，但源 layout index 未登记其 image descriptor | 0 | 有 | **仅拷 root，3 个所需节点只有 1 个存在**；CLI 将 root 显示为 `application/octet-stream` |
| 目标已含 root，提前损坏一份现有 layer，再 ordinary copy | 0 | 有 | **损坏仍在**；成功复用不检查完整图 |

最后两例都是有意的负向对照，不计为完整恢复成功。standalone 登记对照只改变 layout 的顶层 descriptor 登记，原 manifest bytes 和 digest 相同；正确登记后完整图复制通过。这说明本地消费者必须保留/核对 intended root 的 descriptor/media type，不能只因某个 digest 文件存在就认定它被按 image/index 遍历。本次不据此推断实际 registry 的解析行为。

首轮构造“损坏已有目标”时，ORAS 输出 blob 的只读属性使测试副本写入报 EPERM；这是 harness 准备问题。随后只给自建副本该文件恢复写权限，并在新目录重跑完整有界组，未修改源工具或真实数据。此前 scratch 保留待 root 精确回收。

## 复制提供的验证与 owner 尚需承担的边界

[官方 copy 文档](https://oras.land/docs/commands/oras_cp/) 描述默认 index 复制包含全部 manifest，平台参数用于筛选；实际双平台结果与此一致。固定版本 CLI 使用 [oras-go v2.6.4](https://github.com/oras-project/oras/blob/v1.3.5/go.mod)。该版本 OCI [新 blob ingest](https://github.com/oras-project/oras-go/blob/v2.6.4/content/oci/storage.go) 通过 [VerifyReader 复制边界](https://github.com/oras-project/oras-go/blob/v2.6.4/internal/ioutil/io.go) 对预期长度与 digest 校验；同长度改 byte 和缩短输入的实际反例分别覆盖了这两项。本地已有 blob 的 [Exists 路径](https://github.com/oras-project/oras-go/blob/v2.6.4/content/oci/readonlystorage.go) 检查文件存在，不能视为全图内容审计；已有目标反例已实际证明这一差异。

因此后续原 owner 仍须将批准的精确目标与 root digest、media type、size、所有后继 descriptor 绑定，保持全部平台 bytes；接收后从 fresh layout 独立重读完整目标图的每个 blob 长度与 digest，并核 root bytes。失败 copy 可留下部分 blob，退出失败不表示目录事务回滚；不能沿用旧 root 的成功标记或把 partial 目录直接当完成品。此处没有新增通用框架、全世界无引用证明或额外 referrer 要求。

本次没有测试网络中断、强杀、断电、并发写入或大数据峰值，少一 byte 只证明短输入机制；也没有 registry 导出、加密、真实私有上传/下载、空间核算、同 digest registry 写回或原 release consumer 使用。ORAS 本地正例不能补齐私有传输接口，也不能证明真实备份、registry/application 恢复或授权清理任何 tag。实际对象和传输仍保持原 owner 未验义务。

## 临时目录交接

仅此 task-owned ignored 路径：`E:/dev/worktrees/Starward/remote-main-20260908/tmp/oci-recovery-contract-trial-20261020`。结束时为 **248 文件、115 子目录、17,735,296 bytes**；包含官方下载/解压工具、自建 fixture 三次 scratch、一次性 recipe、空认证 JSON、toy stdout/stderr 和原始结果。`git check-ignore` 已确认 recipe 被忽略。没有凭据、旧 key 或私有原件；没有删除操作。root 读取需要的证据后负责核验此精确路径并按项目规则回收。

## root 后续读回与精确回收

root完整读取recipe、报告与结构化结果，核工具/recipe/raw-result的冻结SHA，并直接核源7个descriptor及实际目标55条presence/size/digest/bytes检查、18份stdout/stderr的SHA，均与报告一致；没有重跑CLI。必要122文件/115,653B已按原件/副本/原件再读保存到既有外部verification owner，manifest SHA c8e9e71ae7660e89cadb278c4c5a9af464e1608c56d9068a7633f660f5fa9c5e。

随后核精确命名范围、无links、原248件/17,735,296B未变，整临时目录已通过Windows SendToRecycleBin移入回收站，源实际absent，可恢复；未永久删除。详[保全与回收读回](OCI-OFFLINE-TRIAL-PRESERVATION-20261020.json)。上方及原结构化文件的cleanupDone=false是作者结束时快照；当前清理由此后续读回拥有，不沿旧tmp路径执行。必要档案保留recipe、最终toy输入/结果、原stdout/stderr及官方metadata/checksum；未重复保全可再下载vendor二进制或已替代的准备scratch。

仓库结构化JSON仅将CRLF归一为LF，内容字段未变；作者Windows原始版SHA-256为`fb37b32b9ef17e138e42325a632c380a564c96f08ceca888eb5f755d1c0f0661`。上表绑定归一后的仓库字节；toy blob与CLI stdout/stderr原始字节没有归一，仍按原SHA保全。
