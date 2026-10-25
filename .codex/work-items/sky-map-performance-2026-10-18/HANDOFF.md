# 当前交接：仅微信小程序（2026-10-25）

## 用户最终决定与执行状态

当前及未来一段时间只做微信小程序。App已实现部分、未提交源码和中断增量全部保留，不再继续修复/扩展/验收；不卸载、不回滚、不清理以“纠偏”。已完成工作移出唯一PLAN，保留在[审查实施核对](REVIEW-IMPLEMENTATION-AUDIT-20261025.md)和原证据中。层叠性能、云观星播放/调时性能及相关内存/OOM继续后置，OOM未解决。

本聊天旧Goal实读 **paused**，其工具正文仍含App，不能作为新目标。此次只整理范围和交接；新对话收到[NEXT](NEXT-CHAT-PROMPT.md)明确继续指令后，按新[Goal正文](GOAL-OBJECTIVE.md)创建/续用范围一致的无预算目标。不要把旧Goal标complete来消除文本冲突；本次交接完成不等于产品完成。

**唯一下一步：恢复微信小程序正常功能核对入口。** 先核main源码/普通WEAPP候选、现有官方会话、USB目标和小程序实际API通路，切回微信而非继续App。首个阻塞仍在时只恢复该边界；不可自动完成的人类动作后置，转PLAN P4的管理body结构/错误分类有界HTTP判别等独立小程序工作。入口可用后按P1/P2/P3核采用UI、真实内容、选点/返回与时刻正确性。当前不恢复性能Profiler，不用App替代小程序。

## 源码与保全

- 工作目录D:/dev/Starward，分支main；另一电脑分支codex/remote-main-20260908不切换。范围整理前最新代码批次为 **3d23e3fad29e2e217fbf5195f14e58f22c17507f**，当时origin/main一致。本次文档交付/实际最新HEAD另见[交接验证](HANDOFF-VALIDATION-20261025.md)，新对话仍须实读。
- 285件已材料化LFS资产M、私有原件、task-notes/外部zip、冻结构建和所有未提交成果保留；不reset/clean/force/stash，不建worktree，不拿远端覆盖本地。不能为获得干净状态删除或提交无关成果。
- App保留范围包括已提交的App/独立API工作、近期未提交的共享偏好修复、permission-handoff模块，以及中断的新建预设wrapper/相关编辑。中断代码不保证可构建，不补做它的测试/修复；新聊天不要再派这些App任务。
- 文档改写前原字节和17项App源码保全指纹在 `tmp/miniapp-handoff-20261025/preservation-manifest.json`；原文档在同目录original。App生成工程/模块build、D:/swt和D:/StarwardTools工具链留存，不能夹带暂存。历史报告原位保留；旧“当前/active/下一步”仅属当时，不能覆盖本交接。

## 当前微信候选与手机

- 最近有效普通WEAPP：HGyEOG/gen1 AKYc0l，**339件/5,037,760B，SHA ef6eeee2bb44ef2af5c3ddde69961faa2650a7ce9c27ff6392a6ff39fd9c3cd1**；main2,025,876B。官方普通auto_preview成功，shared/private大包flag均false。该主包问题已关闭，不重做瘦身。源码/环境变更后重新资格当前普通候选，不能靠旧hash冒当前。
- 关联旧USB session：`%TEMP%/starward-device-feedback-HGyEOG/starward-device-test-G2HMxB`。旧截图/输入许可已过期；每次输入必须重新核目标、前台与新鲜单次画面。真实运行AppID/手机源字节的独立确认、正常业务API/完整UI验收仍欠。
- 已有小程序反馈只证明部分Map/My往返，以及[微信系统选点器打开/Back取消/查询保留/返回Map](R19-PICKER-READONLY-20261025.md)。成功选点提交、真实wx定位与精度、正常账户/My/H4和完整采用稿仍未验完。
- 最后一次手机操作是**独立Android App d4a6c9da…**内偏好页/r2。它是apps/mobile的运行结果，不是小程序或设计稿；其APK、定位授权、偏好数据和检查不得作微信证据。保留即可，新对话先按微信官方流程进入小程序，不继续App。
- 官方Skill上次为0.3.14；新对话读取现行skill并核实际环境。Root已在核微信15源pin/普通canonical同步后，官方关闭自有RTtHkV源码及debug窗口，当时只余项目列表。旧IDE副本a2012e72…的SDK补入WXSS/开发大包条件与普通ef6分开，不删除文件凑指纹或反写源码。

## 服务、网络与未完成条件

- 小程序API最近owner：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/network-topology-recovery-20261024/current-phone-api-hotspot-20261024T142546688Z/`。现用origin/目标/进程/条件恢复读同父目录 `selected-origin.hotspot.private.json`，不要抄旧IP。
- 原PG55441/原库22保留；只有任务副本迁至26。小程序API8806本机曾ready，**手机HTTP未通过**：已有Public Node Block覆盖8806，旧Allow作用域不匹配；真实WeChat/QWeather凭据和正式身份资格仍有缺口。LOCAL_TEST不是生产身份。
- 本次只读盘点仍见8806/PID19920、55441/PID18504监听；4318/PID21248是另一个App专用loopback API，保留但不用作小程序后端。PID/端口只是该次读数，操作前重新核exe/启动时间/owner，不全局kill或重启共享服务。
- 手机已有热点、PC已保存连接和Fixed成本profile及条件恢复原件仍保留；VPN/TUN和另一热点客户端不动。当前shell实读未提升；需要系统修改时按现行Windows规则检查真实token和最小操作，不假称已有管理员权限。
- 旧防火墙材料只是准备/只读结果；没有合格Apply/Restore入口，DevTools LAN端口/完整规则条件未齐。不可重放旧ICS/规则脚本、关防火墙或绕VPN。普通API连通与后置性能运输分别处理。

## CI、部署与证据停止边界

- 3d23代码批次：Product **40140729126 success**、Context **40140729111 success**；staging **40141832516 failure**，实际 `host_preflight_disk_below_10_gib`，镜像发布/部署skip。新文档提交的检查另记，不能把docs轻量成功当新产品/部署验收。
- host-cache **40140796151 success**已经回答一次有限记录观察：123条、返回64/省略59，storage permission_denied，归属/完整引用/builder未资格。没有合格可删集合、清理或容量恢复；不重跑同条件观察、不prune、不盲重试部署。见[真实记录](R20-HOST-CACHE-TARGET-OBSERVATION-20261025.md)。
- gen34禁止prepare/build/refresh；gen24 scene-memo暂停，R27同问题停止，gen26 UNKNOWN与全部原件保留。两类性能及Windows/Profiler环境不再是当前首步；必要时按已有方法和新条件恢复，不重复失败采集。
- 新确认的审查遗漏仅为P4管理输入结构的**待判别源码线索**；没有本轮HTTP复现，不写成已证漏洞。Node contracts旧存储未发现小程序消费者，退出本Goal；Taroify维持未采用，只澄清条件口径。

## 新对话读取顺序

INDEX → GOAL-OBJECTIVE → REQUIREMENTS/INHERITED → 唯一PLAN → 本HANDOFF → HANDOFF-VALIDATION → REVIEW-IMPLEMENTATION-AUDIT。然后按当前责任读取最新skill、global/相关Context和采用源。原CURRENT-VALIDATION、R20核验/独审和其它历史记录按需查证，不把所有历史文件全文当新待办，不默认读App的docs/source-plan.md。
