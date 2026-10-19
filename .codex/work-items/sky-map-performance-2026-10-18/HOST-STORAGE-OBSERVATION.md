# H4：固定主机空间聚合观察

2026-10-19。沿[已核边界](HOST-STORAGE-OBSERVATION-BOUNDARY.md)实施，复用[当前 host 失败](CURRENT-HOST-PREFLIGHT-20261019.json)与[固定发布引用](RELEASE-REFERENCE-PARTIAL-REMOTE-20261019.json)，不重复原 mode、旧 identity 或历史发布扫描。实施只解决下一责任的空间归属信息；不修改原 10 GiB guard，不构成清理、部署、镜像退休或服务验收。

`tools/deployment/host-storage-diagnostics.mjs` 由现有 main-only staging `backend-diagnostics.yml` 的固定 `host-storage` mode 执行，复用原 SSH、known-hosts、四条受保护路径和临时凭据清理。第四路径只核语法、不读取 base 内容。没有任意命令、selector、路径或网络落点输入，不读取部署文件载荷、数据库、备份或应用日志，不创建远端文件/lock/lease。

结果固定为 `HOST_STORAGE_AGGREGATES_ONLY` / `NON_ATOMIC` / `referenceCompleteness=UNVERIFIED` / `cleanupAuthorization=NONE`：

- release 文件系统的 `df -B1 --output=size,used,avail` 三个数字；不依赖完整 host preflight 成功。
- INBOX / RELEASE / CANDIDATE 各自一次 `du -P -x -B1 -s` 的分配字节及与 release 是否同设备。根可能重叠，跨根硬链接或共享块可能重计；不加总为文件系统占用。
- Docker 非 verbose `system df --format '{{json .}}'` 的四个固定 daemon 分类，保留严格校验过的 count 和原生四舍五入单位值；缺类为未知，不反算精确可删字节，不解释为 Compose 项目归属。
- 各组保留独立状态和有限错误码，未知数字为 null；末端 `observation` 承载路径最终重核和关闭失败。聚合完整成功不表示主机容量足够、服务健康、全引用已核或可以删除资源。

共同目录语义抽至 `protected-directory.mjs`，由两个实际生成程序嵌入同一自包含 factory；发布引用的普通文件读取/字节重核和预算仍由原 owner 负责。Linux 根到叶逐段无链接打开、held descriptor、owner/mode/inode 及最终重核保持。df/du 显式把 held fd 传入子进程 fd3，目标固定 `/proc/self/fd/3/.`，不能依赖 Node 自动继承。后代元数据仍可能并发变化，故不称原子快照。

原 SSH 60 秒 / 64 KiB 界不改。内部单调时间剩余预算、df 3 秒、每根 du 8 秒、Docker 15 秒、小 stdout/stderr 硬界及 GNU timeout 50 秒外壳限制这次用户态执行；不承诺取消所有内核 I/O 或 Docker daemon 工作。外壳工具缺失/总 deadline/其它失败只输出三个固定 `host_storage_*` 码，原 stderr 不回显。

作者与 root 本地合计 44/44 通过，涵盖实际生成程序 fake builtins、FD3 传递参数、非法/变化路径、独立局部失败、缺/重复 Docker 类、超时/输出界和严格 runner 投影。低于旧 guard 的 2 GB fixture 仍可完成聚合，显式区分观察与 readiness。Windows 只验证平台 fail-closed 和 fake 边界；Linux 原生 fd3/df/du/shell 分支已纳入测试，当前尚未实跑，不计作已通过的 Linux 或真实主机证据。没有调用实际 Docker、SSH、手机或服务。

[独立审查](HOST-STORAGE-INDEPENDENT-REVIEW.md)已完成，无尚存P1/P2，独立44项、4条精确生成程序反例与原runtime15项通过。已作为0a855654普通推当前分支/main、两ref精确读回；新Linux/完整CI和第一次实际主机结果仍待完成；以对应实际回执及[HANDOFF](HANDOFF.md)更新，不用本地成功替代。实际结果只用于选择一个有必要的下一 owner；具体退休仍要核该对象的消费者、保全与恢复条件，不进入全盘扫描或全局 prune。
