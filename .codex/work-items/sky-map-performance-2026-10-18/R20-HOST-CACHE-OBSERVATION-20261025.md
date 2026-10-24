# R20 固定 host-cache 只读观察入口（2026-10-25）

## Requested operation / candidate / authorization

本批沿既有 staging bounded diagnostics 补记录级 Engine build-cache 观察，未执行远端观察或清理。Root给定的源码基线为 main `b4d2654540e203ffa247e31b1cc21db70aeab4e9`；新增源码未提交，旧 Product／Context成功与staging磁盘失败不覆盖本批 WIP。用户后置层叠／Sky Play性能和OOM义务保持。

已读适用 AGENTS／default Context、唯一 PLAN 的当前执行／Checks／交付边界、最新 HANDOFF、完整 release Skill的staging分支、deployment／pipeline owner、runbook相关段落及前置两份容量／缓存准备报告。按Root委托未调用Git，也未读取连接值、Secret或私钥。没有把本机／手机授权当任意远端数据清理权。

## Executed owner / implementation

仅改五个文件：新增 `tools/deployment/host-cache-diagnostics.mjs`／测试，接入原 `run-host-diagnostics.mjs`／测试，并给原 `backend-diagnostics.yml` 增加固定 `host-cache` choice。没有第二SSH入口、任意命令／URL／路径参数、registry操作或新的运维平台。原protected connection、main-only staging job、pinned trust、临时SSH材料清理及60秒／64KiB外层限制均复用。

能力选择依据是 [Docker官方 API 版本历史](https://docs.docker.com/reference/api/engine/version-history/)及[官方v1.51 API规格](https://docs.docker.com/reference/api/engine/version/v1.51.yaml)：API1.42起支持 `system/df` 的type选择及cache Parents。没有解析版本易变的人类可读 `du --verbose` 表格，也没有调用可能访问其它builder的buildx入口。

- 用[官方 context inspect](https://docs.docker.com/reference/cli/docker/context/inspect/)的固定格式只取endpoint；子进程环境仅PATH／LC_ALL，不继承DOCKER_HOST／context／API override。仅接受两个固定普通Linux本地socket路径，检查socket类型、owner、mode；TCP、SSH、自定义socket与不安全对象均拒绝，不能连接未知daemon。
- 公共HTTP适配器仅支持本地Unix socket上的固定GET；先实读 `/version`，从server声称的min/max窗口协商已知 **1.42–1.51** selector。新server仍支持已知API时正常使用；无兼容窗口或字段非法时保留版本观察，不宽回退。只有随后选定API的 `info` 与 `system/df?type=build-cache` 可用，不读取完整OCI／容器／卷清单。
- 输出只保daemon／socket／storage-root哈希、已知版本／storage-driver标量，及cache的ID／parent／description哈希、已知type、in-use／shared、可得精确字节、纳秒RFC3339时间和usage count。路径、description、labels、registry／mirror／plugin原值与错误文本不输出。合法0和false保留；缺失／非法／不安全整数／无资料字段为null，不能补0。未知／重复ID或非空OCI分类表示filter／响应不合格，cache整组unknown；显式空数组才是已观察空记录。
- 只描述 **ENGINE_INTEGRATED_CACHE_ONLY**；具体buildx driver、活跃构建数、项目归属、完整引用始终未资格。cache inUse=false、年龄、名字或哈希不证明归属／可删。`hostCacheSucceeded`只表示这次固定cache观察完成；即使成功，filesystem关联可以独立unknown，也不能表示容量／健康／完整库存通过。
- 只在原release目录和固定普通Docker root都能通过现有held-directory owner时比较filesystem。自定义Root、权限不足或release身份变化保关联unknown，独立cache资料仍可保留；不跟随任意配置路径或读取文件payload。
- daemon／version／socket前后复核有变化或无法复核时撤去cache资格；快照仍为 **NON_ATOMIC**。每轮只有一次cache GET，无内部重试／逐cache请求。原GNU50秒外层与49秒内部deadline继续约束用户态；每请求另有时间／字节限制，HTTP成功、失败、超限、超时均明确关闭流。取消不冒称已取消daemon内部工作。

集合预算为最多2MiB响应／2048条处理、64条安全记录、每条4个parent哈希、48KiB净化结果；超过返回条数明确reported／returned／omitted，缺parent／被截断关系不得变成完整引用。预算只属于此诊断，不改变产品或发布格式。没有删除集、可保证释放字节或Apply入口，输出强制 `ownershipQualification=UNVERIFIED / referenceCompleteness=UNVERIFIED / cleanupAuthorization=NONE`。

## Verified / unverified

`tmp/host-cache-observation-20261025/final-privacy-and-entry-tests.log`：两文件 **25/25通过，0失败／0跳过**，包括新观察／HTTP／workflow检查及现有SSH路由回归。使用实际生产probe／sanitizer／HTTP adapter与原held-directory factory，但所有OS／daemon／SSH输入都是本地fake-driver；没有真实网络daemon、SSH、服务或业务数据。

检查覆盖新server协商已知selector、旧不支持窗口、外部／不安全endpoint、缺socket与缺工具的不同失败、空与缺测、重复ID／忽略type、逐字段unknown、真实0、纳秒／时差保留、记录／parent／输出预算、deadline、daemon／version／socket变化、独立filesystem失败、净化和伪造资格拒绝、成功及失败HTTP流关闭。生成远端程序只做语法编译；工作流实际main／staging／read-only／原Secret packet路由也已核对。五个改动文件另有本地空白检查，无Git操作。

**实际主机、工具／API支持、cache记录、builder、filesystem关联及磁盘恢复均未验；尚无独审。** 不能据这些本地检查认定现host支持本mode、cache可删或staging可部署。Root新独审后可沿同一受保护目标做一次固定观察，再依据实际资格决定后续动作；这不是重跑旧聚合、重试部署或清理的授权。

## Receipts / closure

`tmp/host-cache-observation-20261025/source-freeze.json`：**16项（5 write／11 unchanged-control）**，SHA256：

`1a5a0dfcd1719005b948a0c18fced426eea58b63ac89d10cfffab8558100399c`

所有16项当前原始字节在 `final-source-inputs/`逐件复制并核SHA；早期baseline及官方规格原文另存同任务目录。原baseline控制未变，Root的Native构建输入没有被本批修改。`completion.json`记录终态本地检查与未派发状态。

没有GH、SSH、Docker真实daemon、设备／IDE、构建、provider、服务、VPN／代理／防火墙、Secret、数据／阈值或Git动作；所有自有命令终态退出，未启动后台资源。Root后续在原pipeline Context及runbook补这个固定mode的能力／限制即可，不应把本次结果写成长期Context或新增第二计划。
