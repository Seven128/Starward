# R20 host-cache 固定观察增量独立审查

结论：**本批尚未通过独审：发现一项 P2 socket 路径身份资格缺口，外部观察应等待修复及新独审。** 这不是实际 staging 主机存在该布局、已发生泄密或任何清理效果的结论。Root 已收到反例并明确暂不派发外部观察；本审查不修改冻结源码。

## 范围与输入

已读适用 AGENTS、global/default Context路由、当前 PLAN 的 staging 容量恢复与交付责任、HANDOFF、完整 `starward-miniapp-release` 的 staging 检查分支、deployment／pipeline owner、相关 runbook及前置缓存准备／旧容量观察。用户后置层叠／Sky Play性能及其它完整 Goal义务保持；没有介入 Native构建或设备。

基线为作者给定 main `b4d2654540e203ffa247e31b1cc21db70aeab4e9` 上的 WIP；没有使用旧 Product／Context绿或staging失败认证本增量。开始及结束逐件核对 `tmp/host-cache-observation-20261025/source-freeze.json`：**16/16 长度／SHA一致**，manifest SHA256为：

`1a5a0dfcd1719005b948a0c18fced426eea58b63ac89d10cfffab8558100399c`

范围为5项write／11项control；未改产品／工具／配置／Root文档／Context／Git。证据仅写本报告及 `tmp/review-host-cache-observation-20261025/`。

## P2：固定 pathname 与最终 socket stat 没有资格化父目录

位置：`tools/deployment/host-cache-diagnostics.mjs:147` 的 `socket()`，`:197` 首次选择及 `:237` 末次复核。

当前只对 `/var/run/docker.sock` 或 `/run/docker.sock` 的**最终对象**做 lstat／socket类型／uid／world-write检查，并比较该对象前后身份。它没有规范化并资格化路径别名，也没有通过现有 held-directory owner持有／核对 socket父目录。已持有的目录仅属于 release及Docker storage-root责任，不能证明 socket路径的父级安全。

本地受控、可达的实际 `hostCacheProbe → sanitizeHostCacheReport → hostCacheSucceeded` 反例：

- 已配置 endpoint为允许的 `unix:///var/run/docker.sock`；`/var/run` 为指向 deploy-user可写 foreign目录的别名，最终仍是普通 uid-owned 0660 Unix socket，前后最终stat保持一致。
- 现生产probe从未询问该路径父级／canonical identity，`parentChecks=[]`；仍发出 `/version`、协商后的`info`、一次cache GET及末次version／info，共5个GET。
- 最终 endpoint／daemon／cache／observation全部`observed`，`hostCacheSucceeded=true`。严格要求拒绝这类未资格布局的反例 **0/1，相关断言失败**；所有已打开的目录句柄实际关闭。

证据：`socket-parent.test.mjs`、`socket-parent-v2.log`、`socket-parent-result-v2.json`。复用的是作者已冻结的 OS／daemon fake-driver前导，未提取或替换生产实现；父级metadata／realpath被独立指定，最终socket和生产判断均走原代码。第一版探针及日志保留，v2修正了虚拟symlink的mode表示，结果相同。

影响是**观察来源资格不成立却被呈为完成的固定本地daemon观察**。`NON_ATOMIC`不能代替静态父路径资格；下游仍必须保留UNVERIFIED／NONE，不能因本反例推断实际主机或删除权限。建议沿同一socket／protected-directory owner核对规范化的允许目标、持有安全父级并前后复核，保留正常`/var/run → /run`兼容；不扩任意socket／context，不改其它已通过机制。由新作者修复并以新独审关闭。

## 其余已核边界

- 实读生产probe、HTTP adapter、SSH二次sanitizer、固定program生成、`diagnoseHost`及connection parser、共享held-directory实现和workflow路由。四个配置路径仍经既有限制与shell引用；fixed mode不接受任意程序／URL／路径，主工作流仍是main-only staging、contents-read及原protected Secret packet／pinned trust／临时材料清理。
- [Docker官方版本历史](https://docs.docker.com/reference/api/engine/version-history/)确认API1.42的type选择及cache Parents；[官方v1.51接口](https://docs.docker.com/reference/api/engine/version/v1.51/)提供已知响应合同。按server min/max窗口选择已知selector的方式不把较新server本身当失败理由；不兼容／缺类别／filter未被尊重保持unknown，无完整OCI fallback。[context inspect](https://docs.docker.com/reference/cli/docker/context/inspect/)仅用于本地元数据发现；本轮未执行真实Docker命令。
- 原始description／路径／registry／plugin／labels／error不输出；白名单／hash投影、合法0与false、缺测、重复ID、版本／daemon／最终socket变化、记录／parent／输出预算和部分结果保留均已追至调用者。始终为`ENGINE_INTEGRATED_CACHE_ONLY`，builder driver／活跃构建／项目归属／完整引用未资格，`cleanupAuthorization=NONE`；没有删除集或可保证释放字节。
- `storage.sameFilesystemAsRelease`仅比较被持有的Docker root目录与release目录；它不证明全部cache字节或嵌套mount的实际位置。后续容量／退休决定仍需其真实责任证据，不能把该标量扩大解释。

## 实际检查及收尾

- 既有两文件owner检查：**25/25通过，0跳过**，见`owner-suite.log`。这份绿色没有捕获上面的独立P2。
- 新增 **3/3** 使用真正 Node HTTP server／client及Windows本地named pipe，生产`readDockerCacheJson`只在最底层transport重定向到本轮受控pipe：chunked 200读取、503未结束body拒绝、200未结束body期限拒绝均通过。每条实际连接释放，server在finally结束，见`http-stream.test.mjs`／`http-stream.log`。没有TCP listener、真实Docker daemon或远端调用；不把真实HTTP流测试冒Docker主机验证。
- socket父路径严格反例 **0/1失败**，已单列；没有与25／3相加形成验收总数。最终16pins仍一致，自有Node进程0；`review-completion.json`记录范围及资源。

未读取Secret值／私钥，未调用GH／SSH／真实daemon，未改网络／VPN／防火墙、服务、设备或构建。实际主机支持、cache记录／归属／filesystem关联、磁盘恢复、staging部署及完整Goal均未认证。本次作者／Root之外的独立审查已结束，保留失败交新修复责任继续。
