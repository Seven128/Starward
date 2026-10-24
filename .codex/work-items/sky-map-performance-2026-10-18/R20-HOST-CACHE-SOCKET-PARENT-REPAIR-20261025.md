# R20 host-cache socket 父路径资格修复（2026-10-25）

本批仅收口[首次独审](R20-HOST-CACHE-OBSERVATION-REVIEW-20261025.md)已证的 P2：最终 socket stat 不能代替其父路径身份资格。源码修复与本地检查已完成，**等待新增量独审，尚未派发任何远端观察**。实际 staging 布局、Docker 支持与缓存归属仍未认证。

## 输入、责任与授权

沿现有 release Skill 的 staging 只读检查分支、唯一 PLAN 的 host capacity recovery、当前 HANDOFF、deployment／pipeline／protected-directory owner 实施；Root 提供的 main 基线为 `b4d2654540e203ffa247e31b1cc21db70aeab4e9`，本次没有调用 Git。用户后置层叠／Sky Play 性能和 OOM 未解决义务保持，不触 Native 构建输入、设备或其它产品。

开始逐件核对原 `tmp/host-cache-observation-20261025/source-freeze.json` 的16项长度／SHA，均与 manifest `1a5a0dfcd1719005b948a0c18fced426eea58b63ac89d10cfffab8558100399c` 一致；全部基线原字节保全到本批 `baseline-source-inputs/`，没有覆盖原失败和审查原件。

仅修改 `tools/deployment/host-cache-diagnostics.mjs` 与其测试。现有 `createProtectedDirectoryBoundary` 已支持 root／当前 uid、权限检查、逐层无链接打开、持有目录及前后复核，故未修改共享 helper、SSH／sanitizer 路由、workflow、连接／Secret、阈值或 Root 文档／Context。

## 修复后的边界

- 只接受固定 `/run/docker.sock`、普通 `/var/run/docker.sock`，以及正常 `/var/run → /run`（直接绝对或 `../run` 目标）。canonical 结果、原别名形状／owner 和安全祖先分别核对；foreign canonical 路径、非标准间接别名、可写／异主父目录、最终链接或非法 socket 在 daemon GET 前拒绝。
- socket 父目录与存储目录使用**同一个共享 factory 的独立实例**。这样 release／Docker storage-root 的独立失败仍只影响 filesystem 观察，socket 父级失效则撤销 endpoint／daemon／cache／整体观察资格。
- 取得 canonical parent 的持有 fd 后，实际 GET 通过 `/proc/self/fd/<fd>/docker.sock` 连接；原别名不再作为连接路径。每次 GET 前后、最终返回前复核持有祖先、原 alias／canonical 映射与原 socket 身份；一旦失效即锁存 unknown，本轮不重新取得资格或重试另一来源。
- HTTP adapter 仅额外接受固定 `docker.sock` 后缀的受限目录 fd 路径，并原样交给 `http.request`；不接任意 fd 后缀、URL、TCP 或请求方法。描述符方式复用项目原有 Linux 目录锚定责任；[Linux proc 文档](https://docs.kernel.org/filesystems/proc.html#proc-pid-fd-list-of-symlinks-to-open-files)说明 fd 目录对应进程持有文件，[Node HTTP 文档](https://nodejs.org/docs/latest-v24.x/api/http.html#httprequestoptions-callback)定义 Unix socket 的 `socketPath`。这些资料和本地替身检查不替代实际 Linux socket 验证。
- 所有出口分别关闭两组持有目录，HTTP 仍沿原成功／失败／超限／超时销毁流；socket-parent 关闭失败不能给出完成资格。endpoint hash 现在绑定 canonical socket 位置，不暴露目录 fd 或路径。

原 Engine 版本／type selector、daemon 身份、字段零值／缺测、记录／parent／输出／deadline 预算、隐私净化、单次 cache GET 和无内部重试保持。输出仍强制 `NON_ATOMIC / ENGINE_INTEGRATED_CACHE_ONLY / ownershipQualification=UNVERIFIED / referenceCompleteness=UNVERIFIED / cleanupAuthorization=NONE`，没有清理集合或可保证回收量。

## 实际检查

证据主目录：`tmp/host-cache-socket-parent-repair-20261025/`。

- **原严格反例：修前 1 失败，修后 1/1 通过。** 原 `socket-parent.test.mjs` 与 `review-fixture.mjs` 均按原字节复制到两个新的同层 before／after 目录，断言未改，原输出未覆盖。修后 production probe → sanitizer → completion predicate 返回 `endpoint_unsupported`／cache unknown、**0 GET**，全部已持有目录句柄关闭。日志 `original-counterexample-before.log`／`original-counterexample-after.log`；对应 JSON 保存在各 sibling 目录。
- **最终 owner／路由两文件 28/28 通过，0 跳过**，见 `final-reviewed-owner-suite.log`。新增机制覆盖固定普通／正常别名布局实际传递持有 fd、静态 unsafe parent／foreign canonical／非标准 alias 的零 GET、late parent／alias 替换撤资格、关闭失败不完成，以及 adapter 对 fd 路径的精确传递和越界拒绝。原字段／预算／净化／generated program／SSH／workflow 回归继续通过。
- **原独审真实本地 HTTP 流 3/3 通过**，见 `actual-http-original-after.log`。脚本原字节复制后仍走实际生产 adapter，只有底层 transport 重定向到本轮 Windows named pipe；chunked 200、503 未结束 body、200 期限三种机制均关闭实际连接和 server。这不是实际 Unix socket、Docker daemon、TCP 或 staging 验证。
- 限定两文件尾空白／EOF 检查通过。最后16项源码逐件复制后核对长度／SHA，另外14项控制原字节未变；未用旧 b4 CI或测试总数冒新 WIP／主机验收，各范围不相加形成新的整体通过数。

## 冻结与收尾

最终 `tmp/host-cache-socket-parent-repair-20261025/source-freeze.json` 为 **16项：2 repair-write／14 unchanged-control**，manifest SHA256：

`eedef3d9acb5a533a70fc55f770750acaa09beda0018d06ded488a5599a0367d`

全部当前原始字节位于同目录 `final-source-inputs/`，原 baseline manifest 和源字节另外保留。所有自有 Node 测试命令终态退出，受控目录句柄、HTTP named-pipe 连接／server 已关闭，没有后台服务或待决外部操作。

没有 GH／SSH／真实 daemon／主机／provider、设备／ADB／IDE、Native 构建、VPN／代理／防火墙或 Secret 操作，也未修改 Git、Root PLAN／HANDOFF／Context。后续由新独审核冻结增量，再由 Root 决定同受保护目标的一次固定只读观察；真实主机支持、实际 cache／归属、filesystem关联、磁盘恢复、staging部署和完整 Goal仍未完成。
