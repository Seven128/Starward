# Starward 跨电脑 / 新对话接手提示词

请接手Starward，沿最新PLAN/HANDOFF持续实施完整Goal。这是明确继续指令，原“改完方案先停下”已解除。测试手机由用户携走：优先完成不需要手机的工作；暂不连接/操作手机、不发预览或真机调试、不要求用户立即配合。手机依赖保持未验，待用户明确设备重新可用后再恢复。

仓库：`https://github.com/Seven128/Starward.git`；继续使用已有分支 `codex/remote-main-20260908`。用户粘贴的完整提交 SHA 是本次交接点；先核仓库身份、工作区改动和远端提交，再按普通 fetch / 快进取得它，不 force/reset/clean 或覆盖本地成果。交接点之后若已有提交，先核新增内容与任务归属，不机械退回旧版本。

原电脑工作区是 `E:/dev/worktrees/Starward/remote-main-20260908`，仍须保分支和全部成果、不切分支、不新建 worktree。接收电脑复用自己的合适 checkout；若没有仓库，可普通 clone 到本机约定的开发目录（Windows 默认 `E:/Dev/Starward`），直接选已有交接分支，不创建新的工作分支或 worktree。不把原电脑盘符、用户目录、已装工具路径照搬成本机事实。仓库内入口一律相对当前仓库根目录解析；GOAL 正文中的原绝对入口也按这个规则定位，完整目标正文不删减。

先get_goal。无Goal时按GOAL-OBJECTIVE.md“Goal 正文”全部创建，不设token预算；已有同目标则续用，核实际状态，不以摘要缩减义务或制造重复Goal。发送端最后实际状态为blocked、无预算、未完成；该状态和聊天记忆不假定跨电脑自动继承。本提示由用户在接收端明确要求执行即为继续授权，依赖未就绪的结果仍保留未验。完整读取最新INDEX、GOAL-OBJECTIVE、REQUIREMENTS、INHERITED-REQUIREMENTS、PLAN、HANDOFF，以及项目AGENTS、project_context/global.md和相关Context owner、最新小程序开发skill/performance-investigation。

沿同一方案，复用已完成研究、r10跨日真机结果和有效证据，不重做同轮方案审查。实际Git/CI/CD、候选、服务、IDE和在途操作只由HANDOFF拥有，先按那里核现场；不要沿历史PID、旧session或旧截图输入。

跨电脑恢复边界：

- 代码、项目skill/Context、唯一PLAN/完整Goal及脱敏任务证据已在Git。先确认交接提交及必要依赖，按需准备资源；不要为了开始读代码就下载所有LFS或17GB原始TIFF。
- 真实运行成品、EOG原始数据和有限Map静态包的版本及远端定位由 `data-pipelines/runtime-data/current.lock.json` 统一拥有，按其README和已有 `backend:data:*` 命令只恢复所需组。已核验的Drive镜像不等于接收机已下载；新收到的字节仍须走现有准入，但不重做原研究、不重产r6。普通开发不依赖重建源TIFF。
- 私有数据库和旧A/N原始材料沿 `.codex/work-items/data-handoff-20261018/RESTORE.txt`、同目录manifest及既有私有恢复owner恢复；仅在需要时使用新建自有数据库，不能覆盖已有账号/草稿。凭据、密钥、连接器登录态与手机本机N05不会随Git或文本迁移；缺少哪个授权入口就保留哪个缺口，继续独立工作，不输出或转贴密钥。
- 用户随后明确要求必要性能原件随Google Drive交接。先读 [CROSS-COMPUTER-TRANSFER.md](CROSS-COMPUTER-TRANSFER.md) 与其JSON回执，按实际上传/读回状态取得所列两片并运行已有接收脚本；原件选择、完整ZIP/逐文件hash和恢复入口随本提交绑定。包含r10普通/跨日原件和冻结构建、正常CPU及事件输入、r7分配与两层源码映射、r6/r8地形和r8手动时间/r9退休证据、H3必要源材料。沿原件身份复用审查，不重做资格/大矩阵，也不把传输成功当性能修复。原始归档仍保留，私有逐文件manifest不进Git；未取得的原件不能冒充亲自读过。
- 原电脑的IDE窗口、临时进程/端口、防火墙规则、提权缓存、ADB配对和服务健康都是原机现场；接收端只核自己的相关条件，不按原taskId/PID/路径操作另一台电脑，也不把原机收尾义务记成已完成。GitHub可达、云账号/Drive可用、数据库恢复及实际服务健康分别核验。

用户已明确要求每次提交把代码、Context、Harness与必要开发输入绑定为同一恢复点。遵守global入口链接的资源Context提交规则及开发skill：先识别本次消费者/未完调查所需输入；未变的合格远端对象复用，新增或变化的必要外部内容按既有LFS/私有Drive入口发布及读回，并把对应lock/manifest与代码同次提交。当前自动化只核已声明公共数据，不能假定Git/CI会自动同步任意Drive、数据库或ignored证据；缺必要绑定时不得宣称可恢复交付完成。

部署最新澄清：用户确认CDN尚未购买；这不构成现有后端恢复的前置条件。TCR100版本额度、主机9.7025GiB低于10GiB guard、最后实观API停止仍未解决；绿色发布且publish-and-deploy skipped不是部署成功。先读 `project_context/deployment.md` 及其pipeline/current-state/decisions节点；先推镜像后主机预检、缺容量准入/版本回收是明确的现有流程缺口，Context更新不代表代码已修或服务恢复。不因换电脑重试未变化的失败、降低guard、广泛prune、采购CDN或另造部署系统。

接手优先推进：

1. r10普通Play的离线解释已完成，先读R17-A1-R10-ORDINARY-OFFLINE-REVIEW，不重新录同一资格。两原片与metrics/第一terminal严格核对成立；第二片只到约15秒且终图仍播放。第二同watch有增长但缺absolute epoch/runId，不能把67秒称实际Play、算精确增长率或归因OOM。复用r7存活allocation/映射和r9退休；目前没有能离线选择具体修复的owner证据，完整B与正常路径尾段/Pause-drain/Cancel-Map保留未验。gen24继续暂停，不连续派生相邻disable。
2. ba4方法/99份task批次及后续4505a761通用关联方法/watch辅助/文档均已进入当前分支和main，精确main双CI success；ba4是完整产品路径，4505仅轻量scope且publish-and-deploy skipped。最终文档交付核实际Git与HANDOFF，不重复自引用提交。R17-MEMORY-WATCH-ANCHOR和独审已核5项fake host测试、语法与有限关联边界；通用规则归原performance skill，用“被测行为实际发生的区间”而非播放特例，不把runId/新采样变成统一门槛。复用生产69401的133/133、TS5.9.3、独审/完整r10绑定，只为新变更跑必要检查。
3. ba4发布的100标签额度失败保持；后续fde9049f的停止身份补齐已进入main，完整双CI/OCI success，root在镜像push/主机前取消该批自动发布39268074761，终态cancelled/skipped且CD/guard不改。一次新identity39269225549已实际取得唯一exited API的1ccd/de4b创建引用，原运行准入仍failure；仅核该revision旧发布36039611583，push/preflight成功、start-writers失败且digest吻合，具体停止原因/current receipt仍未知。先读STOPPED-API-IDENTITY-REMOTE、DELIVERY-RUN和quota审计，不回填旧run/重扫32条历史/重复同一identity。固定mode首版18c2cac1完整CI已通过；随后8d55e50e部分结果修复及窄独审已交付，两ref读回一致，run39277333313实读成功current262d/824b与停止1ccd/de4b，batch保持超预算unknown。host39277770300又实读disk低于10GiB guard，平台waiting已自然结束。8d55完整CI/OCI已success，原页面停顿推断已被API/完成日志否定；固定host-storage本批已实现/root44项及独审通过，后续完整CI和一次实际主机结果如下。新源码0a855654已到main，后续文档ba12713e已到当前分支；Product39281927954/Context39281928030完整success，Linux实际分支有HOST-STORAGE-CI实读；原host-storage39285085395/head0已completed/success，严格投影为HOST-STORAGE-REMOTE-20261020：available9.7025GiB、原guard差约304.65MiB；三根较小，daemon BuildCache7.51GB；STAGING-CACHE-RECOVERY-BOUNDARY已核物理/归属/精确能力：项目→完整ID缺失，history也不能补且可能Boot，不执行history或新建同类probe/cleaner。INBOX整根小于当次差额、具体旧传输未获保全资格，保cache/image/volume及全部引用；只有真实归属或合格退休/恢复证据出现再重开。新0自动release39286309198已实际cancelled，pub job无步骤，不重发。先按Handoff核原run及实际Git，事实文档已包含时不再重复交付；8自动release39280890796已completed/success、qualify success及publish-and-deploy实际skipped；cancel409未成功，不当取消。等待observer已结束，不沿旧PID/session操作。新0的完整CI及空间实读已完成，后续沿实际Git和下一归属责任推进，见RELEASE-REFERENCE-OBSERVATION、PARTIAL-REMOTE、CURRENT-HOST-PREFLIGHT及HANDOFF；不重复未变mode/identity/旧32历史，不提高枚举上限或回填首轮。OCI-OFFLINE-RECOVERY-CONTRACT-TRIAL已有实际ORAS小样本/root字节核对及必要证据补保，临时目录已回收，不重跑这组toy或沿旧tmp执行；私有桥与实际registry恢复仍未验。Console MFA不是既有SSH读取的必然前提，不要求用户立即配合。其余回滚/备份和精确OCI恢复仍须实际证据，不据单API不同或旧promote skipped删tag；无running目标时不跑runtime/provider，不付费/绕guard/导出凭据或借8791/SAMPLE_DATA。实际故障和额度修复后才按既有release owner部署，保其停启writer/备份恢复/迁移/供应smoke。
4. H3三件原始照片输入的归档缺项已补保并独立读回，见H3-H6-OFFLINE-READINESS及H3-PHONE-PREPARATION；复用原safe JPEG/模型/HTTP，不重产。H6原N05是本机未保存草稿，PLAN须原身份的真实保存对象；旧账户导出文件已清理，不能转发旧路径。接收身份未知，先按当前owner准备具体对象，必要人类动作集中后置，不擅选联系人。
5. 继续其它独立服务/数据/代码交付和精确资源收尾。旧r9实际feedback窗口已官方关闭，临时feedback26UyKk的381件/25,661,884B逐件匹配原归档；旧r8 cnbWtR原82件不覆盖整目录，已补完整407件/32,790,429B。两目录均核范围后已移入回收站，可恢复，不再沿旧临时路径运行；r10/gen26、原归档和新增完整归档保留，见LOCAL-RESOURCE-CLEANUP-20261019。r3移除仅查询一次仍pending，保HANDOFF原task，不连续轮询/重发。旧8798规则停用遇实际gsudo缓存不可用，尝试已取消、owned命令pending0、规则仍开；不反复提权或要求现在配合。管理员恢复后只停用这条、保定义，不动配对/VPN或其它规则。不要重开旧快照或杀共享IDE。手机恢复后的首要结果仍是三叠层交互到最终覆盖，以及基本播放/快速调整任意年月至秒字段的顺畅展示；CI、观察能力与文档不替代它们。

保护边界：

- H3原gen26 t6aywi/generation-000026-JYgy2m仍UNKNOWN、deviceSession=null。不重发、不bind、不向旧session输入。此前候选预览/必要调试统一授权仍在，但手机离开期间暂停这些设备动作；设备恢复后按新鲜实际画面与候选核验，不逐候选另问。
- 8791原账号、N05 UNKNOWN草稿/历史、已送达R6、原配对/VPN保留。不reseed/清账号/权限，不重发提醒、不扫描聊天/相册/账号存储。敏感原件只在外部私有owner。
- 本接手曾核8787/8791/8798/8799监听均0，这不证明PG卷或草稿丢失；不默认重建/重启。8798→8799历史恢复PG/r6/SAMPLE_DATA配置不是当前健康事实，恢复仍按既有owner和实际listener/health。
- EOG两精确原始文件、Drive远端读回/fresh receiver、r6与数据锁复用，不重哈希17GB、不重产r6、不扩共享或付费。

可新建agent处理不冲突的离线责任和必要独审，用完结束，不复用退休agent。root独占设备/IDE/构建/feedback/服务/Git写入。不向其他聊天或外部人发消息。全部R1–R18/H1–H8/A01–A15/N01–N09未撤销义务保留；手机A/B/地形连续覆盖/原生/iOS/真实微信接收等不能因设备离开删除。必要独审、真实用户结果、授权Git/main交付和精确清理完成前不得标complete。持续完成可执行工作，不停在确认能力或重复工具准备。
