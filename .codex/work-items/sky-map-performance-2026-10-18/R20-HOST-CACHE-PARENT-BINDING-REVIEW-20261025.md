# R20 host-cache 父目录与 fd 绑定增量独审

结论：**本次冻结源码与受控生成调用链的增量审查通过，未发现新增 P1/P2。** 原父路径未资格化却返回观察成功的 P2，已由 canonical parent／held-directory／实际 fd 连接及失败撤资格闭合其本地源码责任。真实 Linux Unix socket、staging 主机、Docker 支持、cache 归属、磁盘恢复和部署仍未认证。

## 范围与输入

已读适用 AGENTS、global/default 路由、唯一 PLAN 的 staging capacity recovery、当前 HANDOFF、[release Skill](../../skills/starward-miniapp-release/SKILL.md) 的 staging 只读分支、deployment／pipeline owner、相关 runbook、[原独审 P2](R20-HOST-CACHE-OBSERVATION-REVIEW-20261025.md)与[父路径修复报告](R20-HOST-CACHE-SOCKET-PARENT-REPAIR-20261025.md)。用户后置两类性能及保留其它完整 Goal 义务继续有效。本次不介入 Root 的 Native APK、设备或服务。

绑定 `tmp/host-cache-socket-parent-repair-20261025/source-freeze.json`，**16项：2 repair-write／14 control**；manifest SHA256：

`eedef3d9acb5a533a70fc55f770750acaa09beda0018d06ded488a5599a0367d`

开始和结束均逐件校验16项长度／SHA一致，没有修改产品／工具／配置、Root 文档／Context 或 Git。Root给定的 main `b4d26545` 基线、旧 CI及其它代理结果不代替本次冻结资格。

## 已核对的责任效果

- `hostCacheProbe` 只接受两个固定 Unix endpoint；canonical socket必须属于固定布局。普通 `/var/run` 和标准 `/var/run → /run` 分别处理，foreign／间接别名与不安全祖先不能借最终 socket stat 取得资格。
- socket parent与storage持有职责分开，但均复用未改的 `createProtectedDirectoryBoundary`。安全祖先逐层检查并经已有目录 fd 无链接打开，持有对象／原路径前后核对；合法 socket最终身份也独立复核。
- 实际 `get` 把持有父目录的 `/proc/self/fd/<fd>/docker.sock` 交给**生产 HTTP adapter**，没有在检查父级后仍经可变alias连接。每次 GET 前后及最终返回复核，失效锁存 unknown，不重新取得资格或切换来源。
- adapter的新增 fd 形式仍固定 `docker.sock` 后缀、有限整数fd与固定GET路由；外部接口仍只有既有 fixed mode／四条受限deployment路径，没有可提供任意fd、socket、URL、请求方法或程序的CLI入口。[Node HTTP文档](https://nodejs.org/docs/latest-v24.x/api/http.html#httprequestoptions-callback)将 `socketPath` 定义为 Unix socket选项；[Linux proc文档](https://docs.kernel.org/filesystems/proc.html#proc-pid-fd-list-of-symlinks-to-open-files)说明该进程的 fd 链接对应其持有对象。这些资料不能替代实际 Linux 连接证据。
- 两组持有目录分别在所有出口关闭；父级关闭失败会撤 endpoint／daemon／cache及完成资格。原 HTTP成功／失败／超限／期限释放、49秒内部／50秒外层／SSH60秒64KiB预算继续复用。
- 实读 `hostCacheScript` 生成正文、原 `diagnoseHost` 二次净化／完成判断与workflow：同一固定程序、main-only staging、原protected packet／pinned trust／临时材料清理保持。结果仍强制 `NON_ATOMIC / ENGINE_INTEGRATED_CACHE_ONLY / ownershipQualification=UNVERIFIED / referenceCompleteness=UNVERIFIED / cleanupAuthorization=NONE`，不能由 in-use、年龄、名字或hash推出归属、无并发build、完整引用或可删除。

## 新的独立执行

证据在 `tmp/review-host-cache-parent-binding-20261025/`，没有真实 daemon／SSH／主机调用。

1. **原严格counter 1/1通过。** 原 `socket-parent.test.mjs`／`review-fixture.mjs` 原字节复制到新的同层目录，断言未改，未覆盖先前失败产出。实际 production probe → sanitizer → completion predicate 对 foreign／writable parent 返回 unknown／`endpoint_unsupported`，**0 GET**，全部受控目录句柄关闭；见 `original-counter-current.log`／`socket-parent-result-v2.json`。
2. **四条生成链检查 4/4通过。** `generated-chain.test.mjs` 执行 `hostCacheScript` 中**未改的完整生成 Node正文**，不是只做语法检查。正文 SHA256 为 `4e3839521fef165ab14dd6cf818f09c727483a95da1131e6ad075aeac7654eac`。仅以受控Linux FS／daemon response及最底层 `http.request` factory隔离外部；`hostCacheProbe`、`readDockerCacheJson`、共享目录factory、生成sanitizer与原 `diagnoseHost` 二次净化均走生产实现。原SSH执行器只替换成受控回执，不创建真实连接。
   - 标准alias与普通安全 `/var/run` 各完成5个GET；每个实际adapter请求的 `socketPath` 都是同一个仍开放的父fd锚，未向原alias／裸socket路径连接。非空cache记录及原净化结果经真实runner返回，完成判断成立。
   - 首次HTTP读取后替换alias，或替换被持有父目录的pathname身份：两条均只发 **1个GET**，随后 endpoint／cache unknown、code `changed`，runner完成判断失败；不继续请求或恢复资格。
   - 四条均确认全部受控目录句柄关闭、生产adapter创建的request／response对象销毁、原runner的合成SSH临时材料目录为空，且净化结果无原路径／description／合成敏感marker。

第一轮VM测试因跨realm数组与fixture严格argv断言不兼容而4条未进入HTTP；已只在本地测试桥把容器转回同realm再比较原值，未改正文／生产断言。`generated-chain-first.log`、原测试源及第一轮结果保留；终态为 `generated-chain-current.log`／`generated-chain-results.json`。原counter结果与四条检查分别成立，不与作者28项或既有实际HTTP流3项相加为新的整体验收总数。

## 收尾与未验

终态 `completion.json`：16 pins一致、自有任务Node进程0；所有测试命令已退出。只写本报告和自有tmp，没有读取真实Secret／私钥，未调用GH／SSH／真实daemon／网络主机／设备、构建、共享服务或修改VPN／防火墙。公开官方文档查证与本地request-factory执行不建立真实Unix socket或远端资格。

本增量没有清理集合、可保证回收字节、Apply或部署效果。Root仍须按现有候选／授权边界决定下一次同目标只读观察；真实工具／API支持、cache记录与归属、filesystem关联、容量恢复及完整Goal保持未验。新增mode与限制的长期Context／runbook回写仍归Root，不能把本次通过写成远端已恢复。
