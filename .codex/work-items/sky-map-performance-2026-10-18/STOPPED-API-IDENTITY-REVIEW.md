# 唯一停止 API 身份观察：独立审查

2026-10-19；审查基准 `95b73d612c8ab7d937a0d44b363de507f4a642a2`，对象为当前未提交的四个实现/测试/Context 文件及作者说明。审查者未参与实现，仅新增本报告。

结论：未发现需修复的 P1/P2 问题。此改动适合以原有 main 交付路径发布后，执行一次固定 identity 观察；本地审查不证明远端停止对象的实际身份、服务恢复、registry 候选无引用或可以删除 tag。

## 已核边界

- `apiIdentityProbe` 仍只通过固定 `starward-staging` / `api` 标签执行两次 `docker ps`，并对这些结果中的完整合法 ID 执行原有固定 `inspect --format`。没有新增命令、配置/环境字段、任意路径、远端文件读取、容器执行、DB、receipt 或发布操作。生成程序只依赖主机 Node 内置 `node:child_process`，不加载旧 control 或应用代码。
- `singleMatchingContainer` 只有整个匹配集合恰为一个对象时才有值；零个或多个均为 null。它保留状态、Running、三个匹配布尔值、严格合法的 revision 和配置镜像引用中的 digest。原始 ID、名字、镜像仓库、额外字段与非法元数据均不会输出；非法元数据在 probe 中为 null，runner 对伪造的非法投影拒绝接受。
- `selectedContainer` 仍来自唯一 Running 标志对象；其原先写死的 true 改为已交叉验证的 `row.running`，并没有放宽语义。`run-host-diagnostics.mjs` 与 workflow 相对基准均未改变。停止对象保持 `selectedContainer:null`，`diagnosticSucceeded` 仍为 false；paused/restarting 保留观察但不通过可用性判定。runtime/provider 的独立入口及 guard 不受新字段驱动。
- sanitizer 校验总数、Running 总数、状态计数、状态与标志一致性；有新字段且总数为一时，校验其存在及 Running 数一致性，存在 selected 时要求两份规范投影完全相同。多对象不能伪造 single 投影。旧报告缺字段时仍缺失，不补写历史 unknown；额外字段不会穿过输出白名单。
- Context 与上述窄能力一致。作者说明正确保留了 current pointer、worker/migrate、其他对象/主机、回滚、备份及精确 OCI 恢复等剩余未知，没有据此解除 quota/CD guard 或给出删 tag 授权。

## 实际验证

独立执行 `node --test tools/deployment/runtime-diagnostics.test.mjs tools/deployment/run-host-diagnostics.test.mjs`：22/22 通过，0 失败/跳过。测试使用假 SSH、假数据库/请求边界；临时 SSH 输入按既有测试清理。作者所述修前失败未在本审查中重复执行；基准 diff 确认旧 probe 确实没有停止对象的返回投影。

另从实际 `identityScript` 原样提取 heredoc 内的完整模块，通过 Node VM 模块链接把唯一的 `node:child_process` 导入替换为假 `execFileSync`，执行了 single-exited、single-running、multiple-matching-one-running、single-paused、failed-command 五种有区分力的情况：5/5 通过。假边界逐项断言 Docker 命令、标签、inspect 格式、超时、输出上限和 stdio；成功输出与模块 probe 的规范结果相同，错误仅输出固定错误码且 exitCode=65。没有真实执行 Docker/SSH，也没有改写生成程序去跳过边界。

四个受审改动文件的 `git diff --check` 通过。未运行 workflow、服务、ADB、IDE 或浏览器；未执行 Git 写操作。没有为本审查新增测试文件或诊断入口。

## 证据边界及源码 SHA-256

新字段观察的是配置元数据，digest 不等于当前 receipt、实际拉取/部署成功或全局无引用证明。实际远端观察仍须受审源码进入 main 后运行，缺失或失败保持 unknown。现有 registry 额度及服务恢复义务不由这组本地测试关闭。

| 文件 | SHA-256 |
| --- | --- |
| `tools/deployment/runtime-diagnostics.mjs` | `37ebd6c5f4bdc80ab24afe05c588263661dbb5dc6698ede5f445401613b680b3` |
| `tools/deployment/runtime-diagnostics.test.mjs` | `dc0125fb787b03007f77940f1a398bb54dee693df80411b50309f6dc5025843b` |
| `tools/deployment/run-host-diagnostics.mjs`（未改） | `7a8f6dd67664c9f235204441f2ea27cb7cdec8471275b1cc1e0f8163c8afa129` |
| `tools/deployment/run-host-diagnostics.test.mjs` | `d9f4eac0d3862550fd172b4638e92938f7ed80ca2eb219317343f70d59025556` |
| `project_context/deployment/pipeline-and-host.md` | `ac31aacdd679955f751af9aa7594a289f87aa3ce345c8f11c4bc64f532e357c7` |
| `STOPPED-API-IDENTITY-OBSERVATION.md` | `cef571c390fb19c33bad4fe02034703ff885fbbe24071a60554ecd4d5101231c` |
