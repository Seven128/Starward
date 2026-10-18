# 固定 staging 容器身份诊断补齐

本轮在既有诊断 owner 中加入显式 `identity` 模式，供 root 后续审查、集成和运行。仅完成本地实现与限定测试；没有调度 workflow、连接远端、运行 Docker、进入应用容器、读取配置/数据库/供应商或执行部署。H4 的当前运行身份和真实供应验收仍未验证。

现有 H4 失败 `runtime_diagnostic_container_ambiguous` 同时覆盖零个和多个运行对象。新模式复用原 staging Environment 连接包、SSH 私钥临时文件与 pinned-known-hosts，不新增连接输入或传输路径。工作流仍为手动、main-only，独立 concurrency group 与所有发布/CD 条件不变。

## 观察语义

- 固定查询 `com.docker.compose.project=starward-staging` / `com.docker.compose.service=api`；只执行 `docker ps --all --quiet --no-trunc`、`docker ps --quiet --no-trunc` 和固定字段 `docker inspect --format`，没有任意命令、路径、容器选择器或 SQL 输入。
- 返回固定 `STAGING_CONTAINER_IDENTITY_ONLY` scope、匹配总数、运行匹配数和七种固定 Docker 状态计数。两个列表和 inspect 的集合/运行标志存在已检测不一致时返回 `runtime_diagnostic_identity_changed`，不自动重试。它是有界快照，不是原子事务或后续持续监测。
- 仅当运行匹配数为一时返回该对象的运行状态、`node` 用户和固定 label 匹配布尔值。原始 ID 和实际 user/label 字符串不输出；label 不匹配直接固定失败。
- 仅投影 OCI revision label 中严格合法的 40 位小写 hex，以及容器镜像引用中严格合法的 `sha256:` digest。缺失或无效值为 null；不读取 `Config.Env`，不输出镜像仓库名。这些字段是容器标签/配置引用元数据，不能证明镜像供应链、运行环境、readiness 或 current receipt 一致。
- 零个、只有停止对象、多个运行对象、或唯一对象 user 不匹配时保留有效计数报告但命令不成功。成功仅表示该次唯一运行对象及用户匹配；不越过原 runtime/providers/imagery 的身份、readiness、配置和 DB 保护。
- 所有 Docker 子命令都不超过 10 秒、各捕获输出不超过 32 KiB，沿用 runner 的 60 秒与 64 KiB 总体边界。异常内容仅留在进程内存，远端只输出固定错误码，runner 再验证状态/布尔值/hash/计数并丢弃额外字段。

未加入 current pointer/receipt 读取：当前 owner 的 receipt 目录来自已验证私有部署配置，单为本次第一失败边界增加配置路径解析/文件读取不必要。计数先区分当前歧义；receipt 仍由既有 release/preview owner 管理，保持未验。

## 实际检查

最后一次源代码相关改动后执行：

```text
node tools/run-node.cjs --test tools/deployment/runtime-diagnostics.test.mjs tools/deployment/run-host-diagnostics.test.mjs tools/deployment/imagery-runtime-probe.test.mjs
22 passed, 0 failed, 0 skipped
```

新测试用既有可注入 transport 和固定 Docker fixture 覆盖：空集合、单个停止对象、多个运行对象、一个运行加一个停止对象、用户不匹配、缺失/无效 revision/digest、集合/运行状态变化、label 不匹配、未知状态、无效 ID、runner 私有字符串与数组伪装 hash 拒绝、额外字段剔除、固定 SSH 程序选择及临时密钥清理。远端模块正文通过 Node 语法检查；原 runtime 只读事务、provider lane 与 imagery 受影响测试保持通过。

`git diff --check -- <六个修改文件>` 通过，仅原 README 的 CRLF/LF 提示。没有运行全套 CI 或把 fixture 结果改写为当前远端正确性。

独审发现状态与 `Running` 标志不一致仍可成功的P2后，root新增两项聚焦回归，修前均失败，修后本组24/24通过。第一投影与runner白名单现在都校验状态/标志及active状态计数；成功还须状态精确为`running`。Docker对paused/restarting保`Running=true`的语义依据是[Moby StateString实现](https://raw.githubusercontent.com/moby/moby/v28.0.0/container/state.go)；这两种状态保有效观察而不报API可用。列表/inspect运行标志竞争仍保原固定changed错误。独审修复复核由RUNTIME-IDENTITY-INDEPENDENT-REVIEW记录，实际远端仍未运行。

## 修改文件与交接

- `tools/deployment/runtime-diagnostics.mjs`：固定 host identity probe、脚本和第二层输出校验。
- `tools/deployment/run-host-diagnostics.mjs`：固定模式准入、失败码/输出路由、仅 identity 观察的成功条件。
- `tools/deployment/runtime-diagnostics.test.mjs`、`tools/deployment/run-host-diagnostics.test.mjs`：限定机制与脱敏回归。
- `.github/workflows/backend-diagnostics.yml`：现有 choice 增加 `identity`。
- `infrastructure/deployment/README.md`：现有日常操作 owner 说明新模式及停止条件。

原实现代理未改H4、INDEX、HANDOFF、PLAN、应用、手机、DevTools、服务、DB、Drive或Git。root随后同步既有`pipeline-and-host.md`的固定模式责任、更新H4并完成独审修复复核；Context结构检查通过。main-only及现有自动staging CD触发边界保持，真实远端仍未运行。任何本地通过都不关闭当前身份、receipt、天气v1时效、Map或手机义务。
