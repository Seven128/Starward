# 当前交接

## 阶段、归属与恢复

2026-10-19用户在本接手对话明确要求执行NEXT-CHAT-PROMPT并继续完整Goal，随后再次说明手机可用、用户去睡觉、必要介入尽量后置。原实施前停止边界已被取代。get_goal最初为null，root按GOAL-OBJECTIVE“Goal正文”完整创建本对话01a15147-e0dd-7b60-b724-ad3cdcbc9d7d的Goal，无token预算、未完成。最近一次get_goal实际返回blocked（正文完整一致）；用户的续做指令仍有效，root正在继续有意义的实施，未另建或删减Goal，也未标complete。当前工具没有写active的入口，不能把文档文字当台账已恢复。原对话01a14ffc的paused只保历史意义。分支仍为codex/remote-main-20260908，本轮源码/工具/方法及149文件task证据归档已按组提交并正常推送至6804d9de，远端精确读回一致。截图c5ecfd2e、性能方法1e98623d、设备与曲尺Context f7de41ed均已包含；随后只有本交接/检查点与当前CLI/GUI边界事实的文档收口，不改变生产源码。精确最新HEAD仍按实际Git核对，不用旧HEAD回退。

唯一方案为PLAN.md；当前状态只由本HANDOFF拥有。REQUIREMENTS、INHERITED-REQUIREMENTS和GOAL-OBJECTIVE保留R1–R18/H1–H8、A01–A15/N01–N09全部未撤销义务。恢复后从待决问题、竞争解释和能改变下一动作的最小有效观察出发，分别推进A响应性和B持续播放/内存/退出；再进行有依据的定向修复和完整正常路径验收。gen22/23阴性复用，gen24保留暂停；不默认逐项disable，也不把某个profiler设为全部工作的统一前置门槛。

接手基线a36aebf8之后的合批成果与大量未提交诊断/研究/skill/Context更新继续保留。当前HEAD和候选如下，不切分支、不reset/clean。夜间拟物、100m/cm/物理尺寸、读屏和大文字排除；B04仅实际规模条件触发。

## 本对话接手后的当前现场

- **当前Git与检查：** 分支仍codex/remote-main-20260908，已按原R1授权提交并正常推送三组已审修复：a89721f8（Sky ruler窗口/原生布局）、3059ffe（官方preview结果保护）、16e0c045（warm-entry旧夹具）。这三组的完整checked head为16e0c0456b8c5bd6d87dd8e1aa088d961df03d5a，远端同分支已读回；main仍32ec61a4f5321e571d499be6430a09918d65242e，没有推main或部署。截图c5ecfd2e、方法1e98623d和Context f7de41ed已按独审分组提交；149文件证据档案6804d9de也已提交/推送并读回，全部授权成果保留。当前工作树完整miniapp2649 pass/1 publication-env skip/0 fail，workflow首轮174/175后修旧mock，最终175/175，UI source probes4/4，strict及diff通过；不能用它们认证产品。远端精确16e0c045的Context39185539969、Product39185535928均已success；Product实际完成release code、backend/WEAPP bundle、隔离基础设施和OCI构建，REMOTE-CI-CHECKPOINT已保存终态。这两条远端CI不覆盖其后的工具/方法/Context提交及本次task归档；这些有现有175项workflow、方法局部独审、JSON/语法/引用和最终本地context:validate范围。CI以来apps/workers/packages/data-pipelines树实际未变，不能外推目标验收。方法独审后仅去除EOF多余空行，当前SHA304b859ac1ccf014822c6c62ea6c49e3f9667350e90ca4a8f77d5809ab316b06；旧审查SHA保原范围。
- **gen26仍UNKNOWN：** H3原完整包fingerprint1ee545f004155d693e0d7384240da558b1de20a4a22cb67c300d2f9368d77941/341文件与选择一致，feedback deviceSession=null。原call_df1a8eb838d24a8bbf1a16e7d7cb0bf3/cell217只有包装completed，无原官方结果或taskId可恢复。用户“开发工具是地图页”不是原操作终态；本轮窗口枚举也未找回H3原结果。未重发预览、未bind/refresh gen26，不把缺图当失败/过期。
- **手机与证据：** 原gsrmZj salted binding与当前无线目标在内存匹配。新ietrgi仅capture，随后已审gen25 review-r2原包逐字复制到外部normal-existing-resume-20261019/project，新建G2RzCu观察会话；所有输入只在此新session fresh capture/view/60秒/一次规则下。实际菜单见“R17 正常Sky基线 v3”，不证明手机整包/AppID。五段灰层/反向、小时预览取消和后续跨日片段已按原证据owner审片；19→18→17实际改变天空，取消capture恢复19日04:30，HTTP geometry200/114ms不代可见延迟或完整供给权限。原手机刻度12–16时与04:30失配保失败，修后手机未验。新增Map恢复片段只使用已view前后capture，未冒称连续审片。五批外部archive依次44文件/17602727B、42/11761817B、14/4434615B、11/3233397B、22/9958565B，逐项SHA读回且不覆盖旧副本；最后一批为device-session-context-recovery-archive。当前手机停Map地形/云量面板，19日04:30，未Apply；全部旧截图输入授权过期。
- **服务当前owner：** 8799隔离公共诊断API exec94448；8798公共桥exec45300。API不再是56760；桥19072已因取消时Readable未处理AbortError实际退出。现任务桥用Node原生pipeline负责取消/流错误，同一PNG客户端取消后health仍200；旧19072不再是活跃owner。8799复用正式fastifyDeploymentOptions，将任务入口默认100字符参数上限导致110字符PNG414的问题修正；同一手工2km PNG200/206409B/SHA一致（非手机viewport）。PG55432/Redis56379保原；未恢复8791、未建账号/迁移/提醒/共享Redis写入，天气仍SAMPLE_DATA。桥保A1兼容collector、精确H3照片handler、公开搜索GET以及32项无身份/URL的HTTP ring，不能代painted时钟。缺Content-Length记unknown。防火墙Starward-R17-Normal-Profile-8798仍enabled，任务结束待精确清理。
- **Map/地形当前事实：** 漏放行places/search的准备403已修，正常入口搜索命中原隔离公开站位。API重启曾丢MemoryCache Context；同一PUBLIC_REFERENCE输入已在after-http-fix准备Context201及48-frame Sky200，不是账号恢复。随后手机“刷新观星点”实际Context GET200、overview200、Map scene200、Sky200，站位资料重新显示；该动作未见Context POST/PUT，不宣称它创建Context。健康桥+Context条件下只做一次terrain重试：01:26:00.894Z metadata200/6ms、PARTIAL envelope/terrain AVAILABLE/image156363B，无asset请求记录，capture仍不可用。file-cache/admission/native-viewport/安装阶段继续unknown，停止同条件重试。原08:23/08:48/08:53有各自不完整准备条件，不能混成性能前后对照。细目由TERRAIN-WAIT-OBSERVATION拥有；新observer未在手机运行，不选分块/预取/worker。
- **已审软件边界：** preview adapter/feedback消费保原stdout、taskId/type和严格terminal/pending/unknown；auth-ready不当业务完成，返回句柄在后验验证前保存。历史无原结果completed只读归UNKNOWN，bind/refresh/QR/清理仍拦截。40项原检查复用，完整workflow也覆盖。Sky A最小request/Page与terrain observer仍同一normal builder，原v1/v2/v3 bytes不改；原35项协议/collector结果按未变模板复用。实际A1 r1 collector HTTP424→200/幂等200/冲突409/terminal200保历史身份，合成文件已归档并精确移出有界store，不当r3/手机结果。
- **当前完整A1 r3：** tmp/r17-normal-a1-review-r3/project，buildSource f76630fe3c39180d81e272fcef1c2c785018dc530ab6051b81f605e1fc4db472，bundle a2839caade3245fb9ec2cfcec172ce23ad3995ab08b774c6d7d714e68c0c6445，338文件/5011516B、main余75015B。完整build/inspect、materialized20/20、strict生产0/候选0、31 maps/18关键sourcesContent及80 JS无maps/URL通过。当前原生修复六份source/test hash与独审逐项一致；最终41/41、无未修P1/P2，后续full miniapp覆盖。保完整normal renderer/15秒导出/20秒同次Pause，未feedback选中/预览/绑定。r1/r2/gen25旧包与maps保持，改builder前归档4595文件读回不变；准备owner已更新r3，不重建旧快照。
- **r2与新GUI/SDK边界：** r2包8db09ed...的公开SDK观察可复用：同一源的Map→Sky/menu/日期动作成立，稳态step17px/名义17.68px、tick33相对axis中心-21.7px促成修复；即刻未settled读数不单独判故障。r3官方open fullMode为s3，已对本次已审本地包继续运行，编辑器/调试器实际出现；一次有界CLI auto只到AppID权限选择，30秒客户端结束，stdout无autoPort、所请求端口未监听，服务端取消未知。之后空灰窗口，不当产品黑屏；只读status等待也无结果，已停止排队。后续关闭前核对1572仓库输入与1580候选文件全匹配，发现外层wrapper指纹0432b913...（339文件/5012424B）和嵌套weapp应用a2839caa...（338/5011516B）是不同对象，后者仍逐字匹配原完整构建。未给目录重组定因。原r3窗口已用一次针对该窗口的Alt+F4关闭并由新枚举确认，不是全局quit；关闭后一次官方只读status仍无结果并终止本地等待，服务端取消未知，未重开/再次auto。随后项目现有官方CLI只读status也在owner的40秒期限返回timeout_no_replay（exec19776已exit1），没有可用readiness或项目动作；两条路线停止相同状态重试。后续原生GUI坐标已能使用实际匹配前台的菜单/文件夹选择器，导入并选择同一已审r3外层项目（保原AppID、无微信云服务，项目列表2项含原canonical）。只请求一次“打开”，尚无可确认运行窗口/正常Sky，不重发；实际应用仍338/5011516B/a2839caa...，仓库源码未变。旧窗口的错图/缓存问题不当产品失败。公开SDK/真实surface endpoint/native对齐尚未建立。原r2官方精确close失败，fresh原生UIA Close两次均报element64缓存不可用，没有声称已关闭；旧memo/真机调试/无名窗口保原归属，禁止全局quit/杀IDE/清账号。细目R17-A1-RUNTIME-INTEGRATION。
- **源材料与归档：** 剩余仓库交付经REMAINING-DELIVERY-AUDIT分责任核对，历史scripts只按原证据归档，不自动准入重跑。H3必要源材料已在原外部h3-gen26-pre-delivery下保全1937文件/18989409B，逐文件SHA、1560输入/16 overlay与341文件原包读回成立，manifest SHA cb9b5ac33dfe909d75517cc79b22c3f070b0a39b5bd667a30c4188f42d1ddc62；原件未动，见H3-PHONE-PREPARATION。Git不含私有origin/原件，不把clone自身称为可复现包。独立整理后fresh r3仍无新目标或结果；后续按已核源码仅关闭原r3窗口，当前它已不在枚举中，未再次auto或操作产品。
- **下一责任：** 本批已审源码、方法和证据归档已commit/push并读回；只读最终API /health/live与桥/__development_bridge_health均200，服务仍归94448/45300，精确收尾义务保留。最新小文档收口不等于新的产品验收。不推main以绕过release/identity边界。r3构建、maps及独审已完成，不无变化重做；下一运行条件是恢复唯一明确官方scene/正常非空Sky，核实际surface结束事件/刻度/取消，再做A有界关联与B有效surviving allocation/paused drain/退出。新手机送达仍受gen26 UNKNOWN约束，原预览终态或明确的后续授权留必要人类动作，继续后置。保正常CPU、gen22/23阴性、Map历史工具资格，gen24暂停；不转私有CDP/native空采样或相邻disable。全部R/H/A/N剩余义务保留。

8791账号与N05草稿仍UNKNOWN且受保护，已送达R6不重发，原配对/VPN不变。源码提交、工具恢复、静态构建和有限手机观察均不等于完整Goal完成。

## 暂停前最后确认的基线与现场

本轮仅核对已有证据和feedback保存的非敏感状态，未重新操作手机、DevTools、服务或预览。下述运行时观察是暂停前事实，不保证连接、进程或截图现在仍有效。恢复时只核对将使用的候选、在途操作和受影响入口。

方法优化Skill/reference、Context与v3/collector兼容成果直接复用；原分叉软件检查不冒充本轮手机结果。正常产品语义的完整基线已另行构建，源、候选、目标、实际负载与采样分别认证。

正常基线review-r2是既有gen25有效观察：当时一次官方auto交付、实际看到“正常Sky基线 v3”，绑定generation-000025-PXf9Z7及nested starward-device-test-NlN0nC，official=operator_confirmed；后续刷新gen26已使这个旧输入session失效，不可直接复用。bundle d4ed31dfe62d4d0268eb3d415d932d0f958615ba6a9ac98e474edc7a13432819，338文件/4,999,195B；buildSource10236f0e034ae96d9e31ed5e081a837a53f4cdd128e3f9ac34da6d588f151a4c。旧gen25原构建保留但未交付；r2修复19/19及独审通过，原完整产品语义保留。45°正常Play得到14,006ms/480Scene+480实际accepted，BSC8404+SAO666/16tiles，实际GPU/copy/Page发布，20,013ms原Pause成功1次；取消后回04:30:00，未Apply。见[R17-NORMAL-BASELINE-V3-RESULT](R17-NORMAL-BASELINE-V3-RESULT.json)。nativeGlyphCalls/lifetime为0，不能宣称非空文字度量覆盖。正常A/B仍未验收。

root继续独占现场责任。暂停前最后确认8798公共诊断桥→8799当前源码/恢复PG/r6+已有SAMPLE_DATA天气；Context在外部r17-normal-profile/public-fixture-context-reviewed.private.json。HTTP已核48帧Sky、health、真实me/auth/admin/share拒绝及strip私有headers，手机8798 HTTP200。API exec36704/bridge17528（仅桥为H3精确照片路由重启；旧68344已停止，原Context保留）；迁移/提醒关闭，独立MemoryCache、无共享Redis写入；exact firewall Starward-R17-Normal-Profile-8798待结束移除。8796最后由exec59581保留；历史表中的47733不再是当前owner。8791最后确认不监听且无账号检查点，N05 UNKNOWN，不reseed、不重发R6。本轮未启动、停止或重测这些资源。

gen24 nested必要证据已归档到外部normal-v3-r2-pre-delivery；gen25回执/内存/profile/截图已归档并持hash，刷新gen26前又保存到外部h3-gen26-pre-delivery/gen25-device-session。CPU已停止、精确pull并完成归因，见[R17-NORMAL-CPU-ATTRIBUTION](R17-NORMAL-CPU-ATTRIBUTION.md)：9182nodes/737165samples；投影子树21006、微信updateValues24303，8561个负timeDelta，不能声称精确14秒同窗或直接将再打包坐标套Taro map。已有样本足以支持A的下一责任定位，无需重录相同CPU；它未解释B，不自动触发相邻disable/gen24。warm同一watch前台PSS3812705→峰4832573/尾4670489KiB，Unknown288772→1275032/1102596；非JS/native/GPU归因。产品退出后实际Map绘出并恢复旧区域/搜索，跨one-off内存的PID连续性未留，不宣称释放通过。

暂停前无线连接已恢复：doctor实际detected1/device/transportReady=true，mDNS connect1，与历史prebinding的salted binding精确匹配；fresh capture e823c67f-9325-4ad4-966c-6f803327810e当时已view，显示gen25退出后的Map、空搜索query，确认原Back结果。原无线阻塞当时解除，不得继续沿用此前blocked计数；本轮Goal的paused来自用户停止边界。之后H3预览调用后手机仍显示旧页面，胶囊重新进入后仍是旧Sky，未建立H3可见身份。所有旧截图均不提供新的输入授权；恢复先按既有设备owner取得当前观察，保原配对/VPN。

H3完整包已经选中并发起过一次官方auto_preview，不能再写作“未选中/未调用”。保存的feedback为generation26，目录generation-000026-JYgy2m，preparedProject为`C:/Users/777/AppData/Local/Temp/starward-device-feedback-t6aywi/generation-000026-JYgy2m/project`，nextGeneration=27、deviceSession=null、staleGenerationCleanupPending=true；本轮只读元数据与[H3-PHONE-SELECTION](H3-PHONE-SELECTION.json)相符。bundle 1ee545f004155d693e0d7384240da558b1de20a4a22cb67c300d2f9368d77941（341文件/4,979,225B），strict TS及组件/工具边界独审已通过。保存的official=completed只代表包装回调返回，实际官方终态UNKNOWN、手机送达未验证，既不能判定pending，也不能判定成功。

[H3-PREVIEW-BOUNDARY-REVIEW](H3-PREVIEW-BOUNDARY-REVIEW.md)确认auto_preview允许pending+taskId；task回调未return结果，feedback consumer也把任意resolve写成completed，原结果/任务句柄未保留。源码包、默认H3页面及参数未见错位。临时prebinding starward-device-test-gsrmZj不是H3已绑定session。后续先查原调用已有可恢复结果；取得原taskId才按官方规则查询原任务。找不到则保留UNKNOWN，不凭completed重复推送或bind。未来任何新预览前需修复两层结果保留/分类；本轮不实施这个修复或重新交付。

H3同点数据/HTTP准备继续复用：H3-PHONE-TERRAIN-PREFLIGHT记录HTTP200/FRESH/AVAILABLE，前端原站位+真北360×1°/20km校验通过，首次7068ms；8798精确照片handler的9项HTTP和3,038,007B精确SHA通过，见H3-PHONE-MEDIA-READINESS，当时8799原R17 Context200保持。实际origin仅外部h3-phone/api-origin.private.json，不使用dummy包。HTTP准备不等于native照片/Map/返回位置/恢复重绘通过；正式资格与iOS仍欠，组件隔离输入不冒充FORMAL_SPOT或发布验收。H3准备记录的历史未交付/设备不可达摘要不覆盖上述gen26状态。

A的单一恒星scalar成本核验已结束且不采用，见R17-STELLAR-SCALAR-COST-CHECK：169216方向/507648分量Object.is一致，18边界/8执行顺序通过，host中位3–5%正向但未过同源自比噪音筛选。生产源码未变，不扩展第二变体，不把本地主机检查当作手机A提升或B分配归因。

## 当前实施的责任顺序

1. **现场与在途身份：** 先续用原Goal并核实际状态，保当前分支/未提交成果。反馈保存的是未绑定H3 gen26，不能当正常Sky基线；先处理上面的官方返回UNKNOWN边界，不重发、不使用旧输入授权。正常Sky后续观察按既有完整build/设备owner重建必要绑定，不因读到旧路径就假定当前运行版本。
2. **A响应性：** 复用正常CPU证据，下一问题是输入到首个accepted的等待落在准备、调度/合并还是下游数据更新责任。先读已有intent/preparation/accepted关联，只补能区分这些解释的缺口；精确脚本映射仅在影响修复选择时补。热点排名、host小内核差异或setter返回快均不等于响应性已解释。
3. **B增长：** 当前首选仍是正常Sky有效分配采样，问题是正常Play及paused drain中哪些JS owner有可归因的存活分配。集中到owner则调查其create/use/retire；有效但不足以解释增长则保留churn、目标覆盖及非JS责任未知；空/错target/无法归因先修观察边界。Map采样资格是历史条件，研究SDK54148连接已失效；当前尚缺正常Sky目标的有效捕获/导出/解释，官方GUI操作还缺可用控制入口。恢复时先核首个受影响边界，能通过现有授权路线恢复才继续；若确需人类，最小动作是当前正确目标上的采样Start/Stop/导出，待目标就绪后给具体操作。不得以“没有自动化方法”宣称平台不支持，也不重复未变条件下的失败。更便宜的观察只有能区分同一问题时才替代；A、H3或其他独立工作不关闭B。
4. **地形残余等待：** 复用stable-window、共享源读取和有限细档成品。按明确候选/缓存条件选一个代表手机动作，先关联相关响应/数据就绪与首个有效覆盖，区分请求等待和响应后等待，再只细分被证据指向的一侧；关联本身不成立则补观察，不能选修复。3,926ms/6ms HTTP及约1–2ms本地metadata不替代手机等待。全链路指标是可选证据，不要求一次全采；缺时间戳保留unknown，不清账号缓存制造冷样本。分块、预取、cloud anchors、worker仍是条件分支，真实配准/细节/天气和完整验收义务保留。

当前PLAN/方法直接复用，沿上述责任继续实施；本对话已获用户继续授权，不再执行原对话的准备后停下边界。具体现场以本文件开头的新观察记录为准，以下历史结果保留各自范围。

## Git、已完成模块与证据边界

- 工作区 `E:/dev/worktrees/Starward/remote-main-20260908`，当前分支 `codex/remote-main-20260908`。实施与数据成果已提交并推送 `e6a68d22`、`124217e1`；新Map可选恢复组及独审已commit/push `dcec3722`；固定只读远端identity诊断已独审、修复P2并commit/push `944a1d6c`（当前HEAD）。保留当前 worktree 与未提交成果，不切分支、reset 或回退源码。2026-10-18 远端 main 仍为 `32ec61a4f5321e571d499be6430a09918d65242e`；最终 main 同步未完成，没有 PR 或生产部署。main 的 staging CD 变量当前为 true，后续 main 推送须遵循既有发布 owner，不能把当前分支 CI 当部署。
- 原合并 `32ec61a4`、957 份设计源与迁移包/Stitch 一致性、当前采用资源保留、两条合资格祖先分支删除已有证据；见 SOURCE-AND-MERGE-AUDIT 和原整合记录，不重复迁移/删除。DevTools 已移除旧入口，最新源码/必要窗口规则已落 AGENTS、Context 和 skill。
- Map/Sky 卸载返回、身份限定状态/阅读位置恢复、逆向整页转场已实现；generation4 的 DAY 进入/Back 退出独立复核通过。约 1.15s 入场至星点、1.11s 返回黑场等待是开发样本，没有支持必须加入云幕降级的证据。复用 PHONE-GEN4-REVIEW/MAP-LIFECYCLE；环境改变后只重评实际受影响项。
- 包体位图去重、Sky 专属 client 下沉、Wi-Fi 分包预载已做。覆盖滞回、共享源/窗口读取、有限前进窗口和云格 footprint/小时/时钟修复已做。稳定地形请求身份已实现并独审；静态分发、必要细档预发布和真实冷缺口改善继续实施，不能用代码检查替代手机等待改善。
- 静态夜光独立 API 和真实 Map 消费者 `3b0d8916` 已完成；数据流程 `95aeb066`、Compose 端口身份修复 `8e86f862`、共享测试夹具修复 `581a5a9b` 已提交并检查。BACKEND-DATA-REVIEW 独审覆盖 `95aeb066` 与受影响 `3b0d8916`，唯一 P2 已修并做真实非默认端口隔离恢复。旧审查者已结束，不复用其身份或扩大结论。
- 生产合批 `124217e1` 的 [Product CI 39128679090](https://github.com/Seven128/Starward/actions/runs/39128679090) 和 [Context 39128711873](https://github.com/Seven128/Starward/actions/runs/39128711873) 均已成功。历史 `581a5a9b` 全量细目由 BACKEND-DATA-DELIVERY.json 保留；环境 skip 不代表产品通过。当前 R17 六个小程序源码提取夹具失败已修并完成57项受影响检查，新 CI 通过；后续生产变化仍需对应检查。当前944a1d6c的Product CI39134890734和Context39135210409均已成功；后者实际workflow为harness.yml。固定identity实现及24/27项检查、main-only远端边界见RUNTIME-IDENTITY-DIAGNOSTIC和独审；未运行真实新identity。

## 历史运行环境记录：不作为当前输入授权

下表仅保留更早实施的服务/候选历史，包含失效PID、session及gen23状态；最新保存的gen26、失去的官方结果与暂停边界由本文件前文拥有。表内“当前/本轮”均是当时记录，不能据此重启账号、重发预览或向旧session输入。

| 资源 | 最后确认状态与边界 |
| --- | --- |
| canonical watch/API | 8787，保留必要服务；不要为造测试状态而清理用户进程 |
| 原手机 API | 8791，旧代码、MEMORY_TEST、fixture weather、真实地形；有内存账号状态且无完整快照/恢复 owner，不能为 benchmark 重启或假称它已运行新后端 |
| R17临时开发桥 | 物理LAN8797，当前受管TTY exec session21165；原本对话39102已由该session Ctrl-C停止再重启加载optional memo协议。tmp/r17-phone-bridge.mts，原gen23 metrics/terminal重试均200、非法memo字段400且19文件不增，见R17-COLLECTOR-V2-INTEGRATION。原8791账号/Context、8796公共Map/terrain和formal-only当前geometry保留，无worker/新账号。v1/v2/独立terminal兼容，白名单/32文件/串行、terminal匹配已存metrics。旧8795/PID17660仍保回退，原exec70503失效；早前关闭替换组合命令自动审批拒绝且未执行，没有换kill绕过。后继整包仍用8797，旧8795包未选中；均不当完整新后端/真天气/私有提案验收 |
| 当前Map产品API | 127.0.0.1:8796，exec session47733，`tmp/start-r17-map-api.mjs`；当前源码+原恢复PG/r6+新有限地形发布+prepared light root/hash，迁移/提醒关闭，fixture weather。已修临时launcher遗漏：通过既有backendDataEnvironment映射原r6，再显式选新地形；四目标8项HTTP metadata/图片及headers通过。私有配置副本在外部development/r17-phone-map，原恢复配置不变 |
| 恢复后 API | 127.0.0.1:8794，当前数据恢复服务；loopback，不能直接当手机可达服务或真实天气验收。启动身份/配置用现有 published launcher 读回 |
| 隔离设施 | Compose `starward-r6-recovery-20261018`，PostgreSQL 17 `127.0.0.1:55432`，Redis `127.0.0.1:56379`；数据库 `starward_restore_r6_20261018` |
| 外部恢复目录 | `E:/Dev/Starward-data/restores/r6-20261018/`；`runtime.private.json`、`infra.private.json` 含接收端配置，仅按需本机使用，不输出内容 |
| 手机候选 | generation23，CPU/text-cache frozen/synthetic accepted-action-direct，bundle `25f4742bc30f46765a286788fb10db6e81439cc7940ca6ff676738f5736d389f`，338文件/5,004,508B，主包余量80,299B。独审后一次官方auto完成，实际看到独有direct label再绑定；完整bundle/config读回一致。45°有效trial仍显著增长、20秒原Pause成功，两份v2回执匹配，见R17-ACCEPTED-ACTION-RESULT；当前已取消到committed04:30:00，不是正常产品通过。旧gen22有效阴性结果保留，非空名称/native measure零仍增长 |
| 手机反馈 owner | `C:/Users/777/AppData/Local/Temp/starward-device-feedback-t6aywi/feedback.json`；root独占手机/DevTools/feedback及8795/8797/8796。generation目录`generation-000023-MjFy34`，当前nested session `starward-device-test-dE4HOo`，official=operator_confirmed。gen23临时prebinding session S9Jfce所需图已归档并由原owner停止；旧gen22/OfdjHE及g7RC1E均不可输入。staleGenerationCleanupPending=true，暂未另作删除。gen22全部14份外部证据在refresh前核验；gen23四图、三内存、metrics/terminal共9份证据已归档且RESULT持hash。gen17–21/初始heap等仍保原owner。每次输入前重新capture/view，旧图授权会过期 |
| 新静态夜光本地候选 | `apps/wechat-miniapp/dist/weapp-check-overlay-static`，SHA `649874f95fe478cacd4c44a29b2065f22af1235feee11f1f35e37aeb9db4f62e`，主包 2,013,644B/余量 83,508B；STATIC-LIGHT-CANDIDATE.json 持有字节。它没有绑定手机，不能与 generation9 混称 |

2026-10-19交接当次实际确认8787、8791、8794、8795、8796、55432、56379均监听；本轮新增8797且确认8791仍原PID29800。端口不自动证明服务代码/数据身份。官方project_list本轮只读返回1项canonical `apps/wechat-miniapp`，没有把临时generation登记为新的长期入口；这个列表不认证窗口数。临时路径、PID、配对、会话不能当下次仍就绪的保证。普通自动预览和guarded ADB本轮已实际使用；旧SDK/MCP remote-debug失败不是永久不可用结论。默认只保留一个必要项目窗口，仓库→完整构建→工具/手机，关闭前核对最新同步，不将产物反写源码。

原 r6 的 runtime/private 文件全部核验，公共运行组 1544 文件/234,624,578B；1025 LFS 指针及 519 原始 JSON，937 个唯一 LFS 对象已推。73 张表完整行/hash、22 项迁移、准确 r6 PUBLISHED 绑定已核；对照用了原证明的 Asia/Shanghai session 格式，没有改数据库时刻。当前 HTTP 光害/原图 hash/固定地形已通过，见 ASSET-MIGRATION-STATUS、RESTORED-DATABASE-CHECK、RESTORED-API-CHECK。r6 为有限大湾区 509 格/z7–11，地形仅 7 项，不是全国或所有细档。

复用 `backend:data:status/prepare/verify/check-db`、`dev:miniapp:published -- --config <external-private-config>` 和既有 Compose owner。恢复环境保持 `MINIAPP_AUTO_MIGRATE=false`、`WECHAT_REMINDER_DELIVERY_ENABLED=false`，不启动提醒 worker。旧 `dev:miniapp` 默认库/worker 不能误接此恢复库。手机号、坐标、凭据和私有资料只在外部私有 owner，不写入交接/Git。

## 已有真机结果与仍欠缺内容

- H1：generation5/6 的真实中面板、3,394×3,148m、0.0/0.7 logical-px 居中及拖动接管可复用。更细视角、快速改选/布局/私有/提交入口、连续双指，以及历史桌面差异仍未整体关闭。
- H2/H4：真实持续配准、缩放后山脊/坡面、手持连续双指、必要恢复和前后性能仍欠。恢复后约 4km 地形请求首次 **3,926ms**、重复 **6ms**，z12 不在已恢复 z11 资产内；9ms 粗档响应不代表细档。见 RESTORED-TERRAIN-SAMPLE。云格/时间/拖动局部手机证据用 SAMPLE_DATA，不是实际 QWeather 验收；原始 r6 新接口/版本/颜色与当前手机整条链还需集成。
- H3：真北/360 方向/20km、真实 COG 接口和 generation6 Canvas/来源/完整许可可读已有证据。缺测/失败不侵害独立地图照片、合格真实照片的时间/方位正值与 iOS 仍欠，禁止编元数据。
- H5：generation7 一次定位、拒绝后手动浏览、恢复原“使用小程序时允许”、再定位不抢相机已有证据，没有权限更改待撤销。精度、首次允许、系统定位恢复、原生选址、必要触摸/窄屏和 iOS 明确缺口保留。
- H6：generation9 实际 SPOT 海报显示并保存相册一次已通过；自然 PLAN/SPOT 分享的真实接收身份/公开访问/失效，以及导出文件实际交接未完成。手机相册仅有一张本任务测试海报待该旅程后精确清理，不能扫相册或擅选联系人。
- **N05 保护：** 原手机计划列表最后为空且没出现一般草稿续写入口，未扫描存储，草稿身份仍 UNKNOWN，不等于已删除。N05 不在 PostgreSQL dump，不能宣称恢复或重置账号来重建。原账号/草稿/历史/VPN/配对继续保护；R6 提醒已真实送达，绝不重发。

## 保留的模块状态与后续义务

1. **EOG同步：** 两个精确GZIP及17,420,036,496B TIFF身份均与原锁一致，r6未重产。原owner-only Drive已完成selected9对象2,264,285,772B实际下载/校验；cf受实际连接器256MiB限制采用8有序分片。共享receiver从真实远端bytes向新receiver-tiffs目录完成第二次解包准入（installed2/compressed2），不是复用原TIFF。fresh `eog_delivery_review`独审通过并独立10/10，代码/锁/说明/evidence已提交e6a68d22。大IO结束；不重哈希17GB。唯一未选中cf整包已按精确ID移入Drive回收站并观察同ID，可恢复；8分片与median保留，不扩共享。
2. **R17生产修复已合批：** 地景极点反解/背面灰cue、共享BSC/SAO精确向量早剔除/惰性角数组、只读geometry窗口、统一时间选择器/ruler/播放、跨日注册锚点和取消/显式应用连续性已接入。独审的legacy私有Context重检与“ready不等于painted”两个P2已修并验证。详见R17-LANDSCAPE-REPAIR、SKY-STELLAR-INTEGRATION/CPU-COMPARISON和R17-INDEPENDENT-REVIEW。CPU结果不等于真机帧率。
3. **性能方法当前范围：** 历史Map分配/CPU资格与正常gen25 CPU归因分别复用。gen22/23阴性保留，gen23不排除完整React publication；gen24继续暂停，不把WeakMap值回指key当泄漏证明。A按实际输入/准备/accepted与数据更新责任继续；B的必要分配问题、当前观察阻塞和结果分支见上文。A/B、完整renderer/copy/caption、稳定尾段与恢复仍未验收，不再把取得已完成的正常CPU样本列作下一动作。
4. **地形/云量/光害：** stable-window60检查和独审通过；有限地形13PNG/4窗口保旧URL/像素，publisher路径保护P2已修独审。Map seal524PNG/2,546,488B保原522URL，hash89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0；55部署检查通过，最后524GET+HEAD/Range/304实际Caddy通过，首轮15s失败保留。own容器已退役/62514无监听。prepared consumer27/27+API类型通过，真实2PNG读回及fresh独审通过；8796四目标8项运行HTTP已核。原3.926s基线仍有效，不把2.1ms暖metadata当手机冷缺口改善。Chrome OSS当前无登录会话/无已确认target，未写远端或采购。H4固定只读runtime workflow39126102107因唯一staging容器身份未成立失败，仍未验真天气；不以fixture补足。
5. **H1–H8和Git收口：** 所有未撤销结果继续保留，不重做N01–N06。H3已取得Commons同源真实东坝地面照片及原EXIF时间/真北方向，同点安全副本/窄adapter和组件检查保留；实际owner拒绝DATA_INSUFFICIENT→FORMAL_SPOT。独立MAP_POINT组件包gen26已选中并调用预览，但官方终态UNKNOWN、手机未绑定，不能冒充正式发布或原正常产品验收；iOS等边界保留。H4-REAL-WEATHER-READINESS保当前运行身份失败。自然PLAN/SPOT真实接收人和文件交接仍欠，必要人类动作后置。保护N05、原账号/提醒/配对/VPN；R6不重发。相册那1张任务海报待精确清理。EOG已commit，其他实现与当前CI/最终push/main同步仍待收口；最终逐项比较R/H，不能标整体完成。

LFS 已获免费使用/$0 意向授权，但账号无付款方式，界面未成功建立 $0 预算；现为无付款方式的免费额度阻断，不得称已设预算。若将来添加付款方式，先落实 $0 超额阻断。Drive 曾读到 5TB 容量/390.2MB 使用，是当时快照。原交接密钥曾意外进入工具输出并已告知用户；不要重复读取/输出或复用作长期备份密钥。Drive 下载应使用原始文件且 `include_base64:false`，只打印必要非敏感元信息，不输出完整载荷/带凭据下载链接。

研究资格副本starward-profiler-research-xWUPcm/project基于gen24，其WAN/SDK54148/guarded session whpMJ2曾通过工具资格，当前结构连接已失效。8791无监听/账号检查点，未reseed；N05 UNKNOWN。旧gen23/gen24和研究副本的预览、Storage、调试条件不可混用，旧截图不提供输入授权。当前现场以上述段为准，保留历史证据。

私有原始视频/截图应在每次feedback refresh之前复制到外部任务证据owner，刷新会删除旧nested device session。generation9原私有session及其未保留原片已随此次刷新退役；历史观察结论保持历史范围，不能称本次重新审片。当前generation的新证据在刷新前须先归档。
