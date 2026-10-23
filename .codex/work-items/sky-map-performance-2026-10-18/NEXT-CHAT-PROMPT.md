# Starward 后续明确恢复实施的提示词（2026-10-23）

2026-10-23用户已在方案完善后明确恢复完整Goal并开始实施；本分叉已创建完整无预算Goal，当前状态须按HANDOFF及get_goal实读；用户中断后的继续指令不等于工具状态已自动恢复。最新限制是微信开发者工具与手机调试由另一对话占用，相关工作及共享服务/现用构建操作后置，不撤销任何验收义务。以下恢复模板须同时遵守最新HANDOFF，不能据旧提示抢占设备。

请接手 D:/dev/Starward，继续实施完整 Goal。这是我此后主动发出的明确继续指令，不是只阅读或总结；承接已批准的R20修订，全部未完成义务保留。父聊天paused与分叉聊天无Goal分别处理，不假称状态自动继承。

## 先恢复完整任务

1. 先 get_goal。已有同目标则续用并承接全部最新要求；无 Goal 时，用 .codex/work-items/sky-map-performance-2026-10-18/GOAL-OBJECTIVE.md 中“Goal 正文”全部创建，不设 token 预算。不要用本提示词摘要替代完整正文，不假称旧 paused 状态会自动跨对话恢复。
2. 完整读取该目录 INDEX.md、GOAL-OBJECTIVE.md、REQUIREMENTS.md、INHERITED-REQUIREMENTS.md、PLAN.md、HANDOFF.md、CURRENT-VALIDATION-20261023.md、REVIEW-RECONCILIATION-20261023.md，以及 .codex/work-items/map-ui-design-2026-10-22/HANDOFF.md。按入口读取相关证据；HANDOFF-HISTORY-20261023.md 只供定点查历史，旧“当前”和“下一步”不能覆盖最新 HANDOFF。外部报告的复现不等于本机/目标验收，未验证分支按PLAN条件先核再改。
3. 读取项目/全局 AGENTS、project_context/global.md 及 manifest 声明的默认 Context、DESIGN.md 的 WEAPP 规则与相关 Context owner。实施 UI 用最新 .codex/skills/uiux_design/SKILL.md；开发与性能用 .codex/skills/starward-miniapp-development/SKILL.md 及 references/performance-investigation.md。实际 DevTools/设备工作再加载对应最新官方与项目 skill，复用已确认会话。
4. 沿同一 PLAN 的最新R20与主备调试选型修订持续实施，不另起方案。另一对话正在更新同一PLAN，按当前文件实读；c953cdb6…为此前R20版，后续611322ec…/220b046b…为途中身份，d236f3b5…为R20之前基线，均不是回退目标。日常进度、下一步和失败写 HANDOFF/证据；不污染计划。最新版开发skill采用真机调试开发者工具主用，普通预览/Android观察备用，不再做逐项profiler准入矩阵。
5. 复用当前 checkout 和 codex/remote-main-20260908；跨机请执行[新电脑提示词](NEW-COMPUTER-PROMPT-20261023.md)，拉取包含本交接的最新分支。4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0是本批接力提交前基线，不是新机目标。Harness/冻结构建/私有原件和任务缓存仍本机保留，远端不包含全部资料。禁止reset/clean/force/stash，不另建worktree，不用远端覆盖本地，不整批git add临时目录/数据/图片。

## 优先级和产品约束

第一优先完成已确认 UI，严格依 Stitch 采用增量 https://stitch.google.com/projects/7144519510537620825?node-id=3995519477980461148 ，共同依赖原完整源 5205988829884632961，既有 Sky 5385664345158066168 保留。“我的”已经唯一采用，不再选候选；废案/旧稿按依赖精确清理，已完成清理复用。未涉及区域保原内容、数据语义、图标、材质、主题与 Sky 构图，不重生成。

Map 竖排工具、去底栏、My 左入左出/回地图、Search 等新页右入、原底部抽屉下入、统一按压、紧凑层叠/天气均按采用稿。来源统一公共按钮和跳转逻辑，打开真实页面，来源信息使用固定格式模板；确有不同内容机制时才分模板。同步真实导航/Back/生命周期/阅读恢复，不能只改外观。

第二优先叠层：地形、云层、光害从操作到最终正确显示的完整链路、持续拖缩、加载中接管、离页返回与内存。区分外部等待和本方成本，保正确覆盖/配准/时间/来源/质量；不虚填未查区域，不混缺测与零值，不无限缓存或请求。

第三优先 Sky：六字段快按/长按、时间轴与正常 Play 流畅度和内存/OOM。保最大/全天空带地景、BSC与实际所需 SAO 完整消费者、Play/Pause/drain/退出；不减星、不降细节/准确性、不用任意节流掩盖成本。

完整 R/H/A/N、Map/Sky 状态恢复、约 4km 聚焦、包体/CDN、山体/真实照片、真实分享/文件交接、数据/环境、CI及授权交付仍保留。顺序变化不取消其他义务；局部检查、构建成功、短时无退出或采集成功不等于产品完成。

R20新增已核验问题与三组职责重构：Map实例/故障重建/资源退休，媒体提交/持久清理/队列对账和锁序，Sky具名帧输入/资源全消费者及accepted身份。相关管理principal与显式operation、稳定重试/会话、云量独立交付、连续调时settled查询、原生App定位/恢复/偏好/Context、独立API真实持久化和实际消费者CI均按PLAN承担。相关授权/已提交数据完整性问题在恢复或扩大其写入/发布前关闭；不同产品语义保持独立。只读或内存替代验证不冒真实HTTP/PG/Redis/Native通过。TypedArray、按需拾取、回调对照、分块/预取、缓存/库/引擎建议都有条件，不照搬外部容量、时长、次数、阈值或OOM归因；不因F09而重开R27已停的同问调查。

## 已完成进度与精确暂停点

- UI 主干及公共来源页已整合；My 返回误降档、来源正文/媒体地址/滚动、LayerSheet 阅读恢复、LIGHT 两行五档、手柄裁正文等已有对应手机结果与独审。普通候选最后为 gen18，官方主包 2,088,195 B、余量 8,957 B。正常账户 My、合法只读 Picker、真实天气/云及必要最终恢复验收仍未全部完成。自动推送授权有效，不等待用户手动推送。
- 叠层父图补边、共享读取/原生安装、历史完整 terrain 成品零取源接入与局部回收修复已完成。gen18 的 8 秒持续输入未取得可辨移动，唯一 1.8 秒对照可 pan；不再扫描时长，不冒持续跟手通过或产品锁图。真实 pending/输入重叠、原生双指、真实云与完整资源回落仍未验。
- R27 gen33 已完成正常全天空 Play、6 检查点和独审：8 旧 wrapper 全收集，但 5 个 aggregate/page callback 同活。强持有根与 pageFn→aggregate 边未知，V8 OOM 未修复；停止同问弱寿命/Query GC/相邻 disable/扩大不透明函数扫描。gen24 scene-memo 继续暂停。
- R28 是独立的首 accepted 成本关联观察，实现、必要检查、gen34 完整构建已完成并冻结。trial 为 .codex/work-items/sky-map-performance-2026-10-18/tmp/r17-normal-a1-review-r27-usb-first-accepted-costs；source 54ac8b00d2800843f2a3d70a50ce39923c3e9cc1419ef7dea2028675f366c6ae，bundle 6a61309d1e7a1b65d1a41bb610b3891fd5d4b474686805784140e349db92cb63。**最终独审未完成、未推送、未 bind、未采样、bridge 未 reload**；不得重建/refresh gen34 或其他冻结代，不把观察实现当产品修复。
- 最新共享检查归CURRENT-VALIDATION：旧618/354/38记录完整保留，锁定材料恢复后一次全Mini API本地套件981通过/0失败/42跳过；AppID历史文档误判和已退休tabBar探针已修。后续管理/媒体/App改动另有受影响检查与独审，不能冒那个较早全套已覆盖。组合fast、远端CI和跳过分支未完成，不假称全绿、不机械重跑已答清单。精确媒体续批与两处真实丢回复反例、本机原生定位/hydration已取得本批证据；部署/真实设备、偏好当前投影与F07继续按HANDOFF唯一下一步推进。
- 后续LAN分支已实际跑通高内存完整Sky连接与单次Heap导出/解析，成为已采用主用通路；差异已核为IDE新增25 B注释，原339件保持，当前340件prepared与新session身份见HANDOFF。正式2MiB预算、普通执行性能及OOM未因诊断通路成功而关闭；本聊天仍须遵守设备后置，不接管另一对话窗口/连接/临时网络规则。后续复用已得快照和通路，不重复网络/逐项功能准入。

## 后续收到明确实施指令后

先核当前源码、目标/会话与在途操作，再按HANDOFF的当时用户任务和PLAN依赖接续。保UI→叠层→Sky，独立责任不冒目标通过；LAN能力恢复不是管理/媒体等已确认正确性修复的统一门槛。真实条件仍缺时保留缺口并做原方案内独立工作；可续R28时先补最终独审，核冻结源的当前适用性、同一bridge/collector容量、新协议及完整实际SAO条件，再用现有冻结gen34做一次必要首响应观察。不得重建冻结包；后续生产修改须在新候选中验证，不能以旧包代表新源码。用同一真实first accepted身份成本决定性能机制，不拿续帧均值、SAO=0或unknown归因。

复用已完成研究和采集，不重复旧 Heap/Timeline/版本/扫码/压力、暖 pending 和失败清单。手机/服务/PID/截图只作历史定位，输入前按公共 USB owner 取得新截图并实看。保原账号/N05/私有配置；不以会写草稿的编辑器或投稿表单绕过 Picker 依赖。双指“继续”不等于用户已准备或已操作；必要人类动作后置，准备齐后一次最小清单。

保留 VPN/TUN、配对、gen26 UNKNOWN、8791 原账号、N05 草稿/历史及已送达 R6。私有原件、Harness、冻结包按原 owner 留存；只有我明确要求上传数据才上传。可按既有明确授权安排必要新代理，结束后立即关闭，不复用旧代理；设备/IDE/服务/构建/Git 写入保持单一 owner。持续实施原 PLAN 和完整 Goal，不停在阅读、总结或新的计划。
