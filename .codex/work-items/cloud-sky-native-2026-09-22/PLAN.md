# 云观星当前执行方案

2026-10-08 最新用户安排：只提交/推送暂停成果，见 [提交保存点](COMMIT-CHECKPOINT-2026-10-08.md)；主目标保持暂停。先在新对话完成 [图像工具效率测评](IMAGE-TOOLS-BENCHMARK-START-2026-10-08.md)，再等待用户明确恢复本计划。以下恢复队列保留，不在提交保存或独立测评中自动执行。

[2026-10-07 执行纠偏](evidence/execution-correction-2026-10-07.md)：用户已否决逐星扩写与逐批重复验证；图像供给和加工恢复优先，所有重复工作先批量化、仅例外逐项复核。v72及既有成果完整保留；Vindemiatrix三项仅已缓存核读，未生成v73或产品测试，停止该逐星计划。上一对话Goal最后读回paused、无预算、未完成；本次实时状态见下方续接段，未来仍先读回，不沿用历史状态。唯一执行顺序见PLAN当前段，历史摘要中的下一步均失效。

## 当前执行与收口（2026-10-08 画质与效率纠偏）

当前实时Goal（2026-10-08用户最新要求暂停云观星开发并保存状态）：get_goal与update_goal实际paused、无预算、未完成。开发已停止，代码/原图/失败和未提交成果原位保留，没有commit/push/stash/reset/clean/切分支。只有用户再次明确继续后才执行下方恢复队列；旧active只属于暂停前时态。

当前Q1批次已收口：[Legacy/ZTF连续区域筛查与决定](evidence/q1-legacy-region-batch-2026-10-07.md)。复用缓存MOC/TAN/HEALPix，一次52行104档名义覆盖筛查，76档采样中心全部落内；只取M87两档共8份原瓦片3,213,271B、零重试。两预览无透明/纯黑缺口，却有绿色底色块和穿过核心的紫色带；原始Norder4/Npix1735、Norder7/Npix111063直接确认同类异常，当前配置FAILED，停止扩批及无变化加工，不外推全源。唯一脚本/清单/失败原片保留，其余102档图质NOT_ASSESSED；MOC不是完整footprint、科学支持或图质通过，普通Prepared空/HiPS关、33项保持。

新独立成品ZTF DR7 color已沿同一script固定source preset核查：四主记录HTTP200，ODbL/public master clonableOnce及IRSA公共数据条款保研究/分发边界；52行104档名义筛查83档全中心落MOC，M87宽档54中心落外在下载前拒绝。M31两档9原瓦片5,330,389B、零重试，宽图色块/网格/缺口、细图青色交叉带穿核心，三原片直接确认。当前DR7 color配置FAILED停扩批/无变化加工，其余102档图质NOT_ASSESSED；properties/record覆盖比不一致，实际MOC只作名义空间筛查，科学UNKNOWN/未采用/33项保持。

当前独立P1实例见[原生窗口/供给/合成证据](evidence/p1-current-window-2026-10-07.md)。用户具体授权已到；同60066完整候选和自身公开Context已被实际DevTools消费，原生display manifest HTTP200。共享图标取顶层路由的escaped defect已修；新Canvas出口仅局部开发候选，实际Scene绘出但普通控件及已消费CoverView仍FAILED，停止扩展。官方SDK刷新仍UNKNOWN；公开automator曾恢复当前页，不能把CLI成功/源标记冒实际模块更新。原配置字节已恢复，所有失败和候选保留。

目标仍是完整原生交互星空，并按“较低分辨率广角＋合格目标/区域高清”交付真实影像。只有云观星及必要共享依赖在开发范围内；旧设计稿不核对，大字号暂停。路线仍为原生WEAPP Canvas/WebGL＋TWGL＋Astronomy Engine＋自有服务，成熟成品/算法/标准优先，原科学加工仅有明确补缺时启用。

当前代码在 `codex/remote-main-20260908`，本地HEAD与该授权分支的真实远端ref仍为 `e2136ebf59875f02f921bba393d1b11d7782f81e`。2026-10-07末段读回origin符号HEAD/main已为 `5cc6743ec9b9f3f2d2b8bd54be5882e18974f27b`，与授权分支不同；没有切换、拉取合并或修改main，不能宣称所有远端HEAD仍e213。原六项Settings/outbox已原样独立提交a4d9427a。上一轮审查归并/交接、既有未提交成果及本轮R1/R2/E1/Q2/E2/P1源码、检查与任务诊断完整保留，均无新提交推送。最早空Goal/创建和上一对话paused只属各自时态；该较早创建阶段Goal active只属历史；该阶段实际读回blocked；较早用户要求停下时已设paused、无预算、未完成；较早只纠偏后暂停已由最新继续授权结束；实时active见顶部，不能伪造状态。下次先get_goal，有Goal不重复创建，按实时读回与用户续接授权推进，不伪造状态。

[R1 Sources正式owner接线](evidence/r1-source-owner-integration-decision-2026-10-06.md)：原Canvas/page及图像家族显式paused已接，SAO沿原隐藏暂停，地景alpha/淡入停止隐藏工作。51检查/类型、61Scene101请求首RGBA差0/零null与Back acquire/context创建、后台及最终退休0；原watch仅detail JS/map、19产品原文一致。来源页21.5MB源等效/5.75MB纹理驻留保持，非物理峰/微信验收。图质FAILED、普通空/关及33项保持；该开发阶段收口，当前唯一下一依赖只按PLAN。

P1原供给增量见同一owner：60065 display404/旧2MASS、当前60066/PID23752及1,003,398B原PNG合同/SHA证据保留。原60065/PID24040、watch3432、IDE13736保持启动身份；本轮因实际源码变化原watch自然重编，不再声称当前输出全字节未变。当前60066原生消费与失败以顶部及P1最新段为准。

**当前唯一执行顺序（2026-10-08 画质与效率纠偏，恢复后执行）：先用已有合规高清材料完成可判断的实际画质代表路径，再按用途批量扩展；外围/连续背景与原生交互分别推进，最后联合验收。Q1/Q2/E1首先回答完整目标在预定视角是否清晰、坐标是否适用、加工/选档/渲染是否保留原有细节；不能以粗阶瓦片缩略图、测试数或来源接通代替这个结果。背景FAILED不自动否定局部高清，也不取消最终连续背景义务。P1及R/E/A在各自有独立输入时继续，手机/真实远端/物理容量/最终独审后置；仅有新证据才重开退出配置。**

**当前暂停点（2026-10-08）：Q2同源PNG几何优先已在原Scene/GPU/贡献owner接线，单RGBA＋depth工作目标整体source-over后复用A通道作来源贡献。8原图条件、12实际WebGL控制、完整Taro/HTTP/cache/Source Back/退休均通过限定开发范围；预算拒绝重复尝试的真实失败已保留并修为一组一次。两Back完整RGBA严格相同、额外光学body0；自建浏览器/API已退出。390×844原2MiB路径可用；780×1688原2MiB实际拒绝且独立画面严格保留。已有显式8MiB任务政策下两个2×原图帧亦通过，M8仅816像素最大1码、M61差0；这不是默认预算调整或物理/设备认证。原四画质帧/九正式条件/旧运行保持冻结epoch，不重渲无变化输入。当前appTS5.9.3与20影响检查通过；任务TS检查在89433B适配器epoch通过，后续DPR/scale补充尚未重新类型检查。**

暂停前完整素材、22原片/4索引的严格出版/rights、selector细10/5格、缓存坐标与透明边缘诊断继续保留，详见[同一图像owner的当前暂停点](evidence/q1-mature-hips-batch-2026-10-08.md)及同名JSON的pausedCheckpoint；不读旧聊天或递归历史交接。原PS1/Legacy/ZTF具体配置FAILED，绝对配准UNVERIFIED/科学UNKNOWN、照片外连续背景FAILED、微信WXML/控件FAILED、手机/物理峰/容量未验、独审MISSING和33项保持；普通Prepared空/HiPS关/v72不变。

**再次授权后的唯一下一依赖：先补当前task适配器类型检查，并解决或明确限定高DPR下共享贡献/资源政策，复用已有1×/2×结果，不静默增默认预算、不以无来源降级冒正常完成。外围背景、P1及其余R/E/A仍按各自明确新输入独立推进；手机等强依赖放末段。暂停期间不执行这些工作。**

### 恢复后的执行规则

| 责任 | 要先得到的实际结果 | 失败时怎样继续 |
| --- | --- | --- |
| 高清目标/区域：Q1＋Q2＋R2 | 以已核权利和坐标的原素材为参照，显示完整目标及弱外围；按实际画布尺寸、视场和源有效分辨率选档，直接检查细节、颜色、定位、取样与接缝。单独列出原图、加工后和当前渲染器的差异。 | 原素材问题、取图/解码、投影/选档和渲染问题分别定位；工程问题修现owner，不靠盲换照片。原生环境未验如实保留，软件开发结果不能冒手机通过。 |
| 外围与连续背景：Q1＋Q2 | 保留宽视图中的完整照片边界；说明实际覆盖和背景来源，并验证确有帮助的新供给或新机制。 | 当前照片外硬边界仍FAILED；不要求先解决全天背景才能研究合格局部高清，不以裁框/抠黑/遮边损弱结构或伪造细节交差，也不把局部合格当连续背景完成。 |
| 原生交互/恢复与交付：P1＋R/E/A | 用现会话和真实消费者关闭控件/Canvas/Back等独立缺口；图片规则稳定后沿原出版、缓存、故障恢复及资源owner联验。 | 设备/服务缺席只阻塞依赖它的验收；无新根因不循环SDK，无变化的已闭合矩阵不重跑。 |

1. **先证明用户能看到的结果。** 第一份对照覆盖完整目标和外沿，不只挑漂亮中心。展示时明确标注“完整素材参照／实际运行画面／覆盖诊断瓦片”；那四张粗阶边缘瓦片只证明局部几何和供给，其透明区、斜边和小块内容不能用于判断母图差或高清不可用。以画质改善、合格覆盖和交互问题减少衡量进度。
2. **分清开发准入与产品采用。** 原内容/成品分发权益、必要的坐标可信度、真实清晰度、范围和可复用处理规则满足声明用途后，可在该范围批量开发；背景、原生、生命周期/资源和最终独审的缺口继续列账，完整交付仍须联合通过。科学缺测、有效黑与alpha含义保真；展示图不额外默认要求逐像素测光或仪器/PSF工程，影响叠加和定位的实际误差须有针对性验证。现粗档guard不得靠填PASS绕过；若其阻断独立高清验证，恢复后先在原入口明确准入用途并保旧失败语义，本次不改脚本。
3. **验证规则后批量化。** 第一代表路径证明对应用途有效，再选一个覆盖不同风险的样本复核共享规则；同类素材随后走现参数化流水线，仅真实异常人工检查。新增数据按当前视口/完整对象范围和实测资源需求决定，不按每星、每三张或固定候选数复制版本、脚本、测试和交接；不重取可复用缓存、不无变化加工，不先建通用框架。
4. **调查必须改变决定。** 每次只补阻塞当下用途的事实；已核权利、成熟方案和有效旧结果直接复用。一次有决定力的代表失败先归因，再修机制、退出该具体输入或转独立项；不能继续相似照片/参数试验，也不能把“某照片无法充全天背景”推广成“没有高质量可商用资源”。新发现的公开资源须确实改变当前缺口才取数。
5. **质量与记录跟随风险。** 先看现owner/调用方，沿共享边界修复；新机制补必要反例、受影响消费者和资源释放检查，稳定后在里程碑批量验收，独审缺失保MISSING。普通Prepared空/HiPS关和v72不因局部成功自动改变。继续遵守资源治理：可复用代码/当前文档和许可沿普通Git，选定运行资产沿LFS，原图缓存/日志/帧和过程结果留ignored output；只维护一个当前结论和有限审查集合，不嵌套历史报告/复制源码树。

已保留的当前事实：Rubin原完整预览具有可辨细节；四份order2边缘瓦片并非目标高清成品。上一批本地v2来源/细档失败保粗/退休及153输入读回只证明其限定机制，照片外连续背景仍FAILED；完整目标在预定显示尺寸的质量、平滑LOD、原生和物理容量未验。旧source/frame/check结果继续沿[图像owner](evidence/q1-mature-hips-batch-2026-10-08.md)，不倒改历史结论。原画布夹具16PASS/App类型PASS与其它已闭合检查不因本次文档纠偏重跑。


恢复执行后的停止条件（用户明确暂停优先）：可授权、可独立推进的项目均已完成，或逐项确有缺少设备/远端权限/真实材料等外部前提，才暂停并说明最小动作。代码缺陷、可继续调查的技术难点与旧Goal blocked不自动属于强卡点。不得以赶进度降低架构、数据含义、错误恢复、资源释放、类型和实际画面要求；不得默认采用失败候选、放宽断言、填补未知值或再复制平行流水线。最新用户要求取代此前串行等待E2真实引用输入的安排。

[离线source恢复](evidence/e2-offline-sky-source-2026-10-06.md)的原metadata/URL归档、GCM绑定及107检查保前阶段；原公开备份89/首次启用96/cached恢复102保各时态。[本轮原发布/current/旧digest消费者](evidence/e2-restored-release-consumers-2026-10-06.md)修正式release接受无认证绑定新component的实证反例，在Compose/迁移前认证原GCM；实际两PNG6,838B进入默认prepare/verify/receipt，旧digest用fresh认证backup保全URL，preview在验证后写current、失败保pointer，112影响检查。Docker/PG/挂载/TLS/HTTP均注入，fixture身份不冒生产；封存源和旧控制代次保留。live/off-host/全应用/真实引用/设备/独审/物理峰及容量仍未验，E2该阶段完成后已转入并完成Q1新输入决定，当前下一只以PLAN顶部为准。

| 工作 | 所需输入/依赖 | 当前状态与下一产出 | 收口/转向条件 |
| --- | --- | --- | --- |
| R1 换图交接 | 缓存v2三图、原loader/Hook、现page | HiPS Source Back已修重复body，首图阶段已拆清；暖索引有界合并已采用、两null仍在，设备/连续体验由P1/A1保开放；原Prepared开发边界闭合；71影响检查通过/1实际科学出版条件跳过、类型通过。合并故障路径11暖回完成帧均有Prepared来源，原Canvas重试/最终退休通过 | 历史第三null现已拆明并修ready交接；当前首实际暗图及SAO/native共同缺口已补证，来源页有界ready比较及公共图像暂停已补条件开发结果，direct deep在途/同hash代次及当前资料失效条件路径已补，真实权限/原生开放，Q1独立推进仅按顶部；设备恢复保FAILED/未验，修后独审/目标设备/物理峰由A1/P1/E2补，不冒全部验收通过 |
| R2 选档与资源 | R1机制稳定；真实图像/当前投影 | 开发边界已有65影响检查/类型通过，DPR/真实取整尺寸、滚转偏心/外围、同hash刷新和Canvas重置；实际page四次边界往返同中档/无新PNG，六暖回有来源/直接回细0像素差/退出退休 | 当前中间视角反例已由Q2原格修复，历史35像素代次仍FAILED；设备/物理峰/修后独审未验，不复跑闭合矩阵 |
| P1 实际DevTools | 当前构建/原官方会话、可行动新根因 | 本次原watch更新detail JS/map两文件，当前page原文在source map精确一致；旧构建epoch回执保留，不作DevTools运行通过。 原安装/指针/23977监听一致，心跳200；一次MCP初始化四秒无头/无session，根因及服务端动作UNKNOWN；SDK/工具/截图0，有限诊断已退出 | 无新根因/外部状态不再循环SDK，不重启服务；实际WXML/Canvas/控件/Back/hide及设备仍未验，Q1独立推进 |
| Q1 成品适用性 | 原供给及实际已绘消费者 | SkyMapper七PNG/v2/完整权利开发消费者保留；实际0.4°六格外围原成品暗矩形使order8显示FAILED退出，同源8°旧失败保持；Back两未ready null/三partial仍FAILED。NGC253有效同Scene编码/完整外沿已决定当前矩形合成退出；DES具体权利已收口退出；DECaPS2两原成品小样当前显示FAILED退出；HSC归档当前路径已退出；ESO成熟偏移不足全图采用；NGC5907及ESO NGC5128完整成品实际消费者已决定当前照片外沿FAILED退出；较大工作集原Sources候选首像素/驻留比较已补，正式owner接线已完成受控开发阶段、native及独审保开放，ESO公开6k原入口核查已退出当前扩展，A1返回授权/有效性仅按顶部，P1 IPC动态归属仍缺，独立供给不靠同类照片循环推进 | 普通Prepared空/HiPS关，逐瓦片科学支持、cold/show/new-wide、完整图质/商业发布/runtime/物理峰仍未过 |
| Q2 最小处理/合成 | Q1合格输入、实际page/Scene/source | 原格和PNG/JPEG开发结果保；条件J2000消费者后，具体PNG经单层/37位置/公开银河开关决定作低分辨率显示；普通版本/实际default page/同帧source与退出退休增量已闭合 | 原合成归因已更正：几何可用与显示贡献分开；新密星同Scene线性光对照仍矩形/密星断边，退出颜色小修路径。PS1原格供给与名义坐标已解释，亮星团完整显示仍FAILED，该输入退出且不扩大消费者；合格覆盖供给与P1分别推进；不以关星/抠黑/feather/PSF补缺，完整图质/runtime未验 |
| E1 合同与批量出版 | Q1真实非Messier/小区域、处理类型及R2 | 条件消费者开发边界闭合：独立native矩形TAN/region、真实NGC253目录版本、两实际page原缓存/source Back、旧51行及M82版本/URL兼容 | M87新region复用原TAN/三档及实际source Back/退休，条件三图90,368B另计；来源/有效性原样，普通registry空。图质/完整发布/保留/最终验收继续 |
| E2 出口/保留/容量 | 合格版本、实际消费者及真实引用输入 | 原12图HTTPS/46核算与Windows分配保原epoch；当前普通/旧2MASS两个发现入口4HTTPS与标准默认两图封存/headers通过，复用已有1741 mount；三项兼容/恢复反例先失败后修，当前API/出口12通过；当前manifest失效不牵连有效旧版；已绑定store公开备份v2/原lease/本地引用及隔离恢复89检查/两代PNG6,838B实跑保前阶段；首次静态启用96检查保原代；cached原OCI恢复102保原代；离线source/GCM107保原代；当前原release认证/current/旧digest真实文件消费者112检查通过 | 本机复制不是去重/生产采用；本机22缓存image/旧support及staging名称读回，production名称查询失败未验；完整trusted OCI/current/rollback/client/Sky备份引用、Linux全机盘/物理峰/混合200DAU仍缺，不复跑旧HTTP/分配；首次启用开发路径已补，真实Compose/PG/远端未运行；新component离线fresh prepared开发已补；原发布/current/旧digest开发消费者已补；真实live/off-host/全应用/current/全集未验；该开发阶段已退出，当前依赖只按PLAN顶部 |
| A1 完整验收 | 各责任有正常/失败恢复结果、固定候选 | Sources报告硬拒绝资格受控开发已补；拒绝含义已修，当前活动预览返回首输入亦修；仅按顶部推进当前完整交互。全部有效C/I/D/K/V仍未整体关闭 | DevTools与Android/iOS分别；真实全旅程/画质/帧时/物理资源/包体/独审，缺证不降格 |

当前实施顺序：以上述唯一执行队列为准。先完成已有合规高清材料的实际画质代表路径，背景和原生责任独立推进，批处理规则稳定后按用途扩批；C07正常供给走批处理，P1/手机按实际条件独立补证，不把较容易的文案计数作为持续目标的默认循环。

## R1已修机制与保留义务

- 原文件：[加载器](../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts)、[光学Hook](../../../apps/wechat-miniapp/src/features/sky/use-sky-target-optical.ts)、现useSkyNativeImages/Scene已绘owner；[可复用反例及源码绑定](evidence/prepared-transition-reproduction-2026-10-05.json)。
- 修前两1024 wanted逻辑8MiB受保护，换OV时trim先退休旧层；4MiB medium因2MiB被排除。旧owner重放的概览两null首回执至正来源约237.4ms。另一个修前GPU上传失败null约196.4ms、全Canvas重试null约884.6ms，均限软件完成时序；历史回细第三null无有效时戳/原生资格，仍UNKNOWN。
- 已采用原owner内“一个ready非wanted备用项”，当前光学源RGBA等效9→5→9MiB。不新增隐形请求或扩大通用缓存；2MiB继续作一般淘汰压力，wanted＋必要单备用可超过它。Scene只在主上传失败时同帧提交备用真实较细footprint，来源不改名、不扩覆盖；公开光学重试只复位原可选shader失败态，保Canvas与有效层。
- 整纹理/现裁窗A/B各一次，当前窗口驻留较低但full-upload＋copy临时峰较高；整场峰均由早先其他参与家族主导。两路径同相机/时刻却严格像素不同，整纹理候选不采用，未据单次软件时耗加缓存或重构。完整账见[对照](evidence/prepared-handoff-cost-ab-2026-10-05.json)。
- 同对象/publication/Canvas有效性、当前相机覆盖与实际GPU成功决定可用性。保留资源不保过期位置/拾取/来源快照；download/decode完成不等于已显示。
- 一条可读时序对齐wanted、ready/retained、retired、上传、Scene输入和completed source，并测可见空窗；正常、延迟/失败/重试、失效/离开及退休覆盖受影响边界。稳定终点0像素差不能证明中途连续。
- 实际参与家族同时间核encoded、解码/native、GPU纹理/FBO/copy、旧新共存和退休；逻辑RGBA与不同时间MAX不可相加成物理峰。影响检查通过后转R2/Q1，不复跑全部历史矩阵。

## Q1/Q2来源与处理决定

| 用途/试验 | 最小可决定输入与结果 | 保留限制 |
| --- | --- | --- |
| 光学广角 | ESO eso0932a公开6000×3000已缓存；三个Galactic UV anchor试验中可辨M31/M42偏离预计中心，当前直接UV接入不采用 | 历史行星/无源WCS、接缝极区与真实Scene未验；保原文件，明确publisher几何/有依据成熟配准或另一合格源才重开，不扩6k常驻 |
| 区域 | Legacy DR10观测griz/grz粗8.4arcsec/pixel两配置拖带失败；更细.8arcsec/pixel真实小区域/g FITS名义TAN与E1实际消费者开发边界已通过 | 小区域不补原大区/全天，未普通采用；饱和伪影及UNKNOWN质量mask保，model/resid不冒观测；512接口上限不是需求上限 |
| 高清目标 | 新真实非Messier ESO NGC253全幅JPEG/AVM已复用成熟库准入，名义直接TAN与原生平面通过；当前Hubble/NOIRLab/M82旧图质失败保 | 几何开发结果不是绝对配准或融合采用；完整矩形/旋转/弱外围及来源由E1/Q2消费，不重复旧PSF扫描 |
| 直接原坐标 | 一份适合线性TAN/AVM的成品对比现重采样 | 先A/B再扩合同；畸变/拼接仍用现WCS；不先造通用几何框架 |
| 编码与星点 | 同冻结图PNG/JPEG；核弱结构、星点、颜色、字节/decode/upload；识别照片/目录重复星 | 支持mask与有效黑独立；WebP条件试验；不整片删目录或抹照片恒星 |

三类图质各自收口：
1. 同源内部LOD：协调采样/像素中心；必要时只在双方有效重叠区验证过渡，先选RGB再一次背景合成，避免双重增亮。
2. 照片真实外沿：真实footprint/适用视域与合格广角/区域底图共同解决；不得藏外框后取消外围/总览要求。
3. 跨来源：默认同源粗细；不同波段/年代/显示处理明确切换与披露，NOIRLab直接充Hubble父层已否决。抠黑、feather、背景拟合不是通用解法。

影像覆盖、有效清晰度、完整可浏览天球、对象/交互覆盖分别记。最低处理保完整解码、原图/权利身份、方向/AVM/WCS、颜色含义、有效黑/缺测、可解释重采样/降采样、全幅/边缘检查和可复现出版。精确PSF、协方差、CCD诊断只对已证明必要的问题恢复。

批量单位为处理类型：直接成品、必要WCS、巡天区域、不适用输入。统一异常原因（权利、覆盖、畸变/配准、条带/饱和、弱结构、跨源不兼容），实际批次统计通过/退出/待复核、加工时间和复核负担；样本数量不能外推全库异常率。

## R2与E2的实测约束

- LOD先用已知像素/角覆盖/真实投影屏幕占用及来源限制，广角斜视不套小视场线性近似；源未知精确分辨率不构成逐图PSF前置。
- GPU来源归因capture/重放/归约/1px回读及裁窗full-upload+copy分别量帧时/峰值；比较两1024完整驻留和窗口往返上传。没有瓶颈证据不大拆或新增缓存/调度器。
- SAO pending与ready缓存分离已实现；公共encoded owner已消费SAO原JSON。旧64项在途逐出问题不重复实现；客户端取消后重传、旧历史两200原因及混合容量仍分别保留。
- Prepared已进入标准导出/Caddy出口分类；本轮native＋M82 v1/v2实际本地HTTPS/旧URL有范围结果，真实云端仍待。已有retention dry-run、mounted/current/receipt核验继续复用，完整rollback/backup/支持客户端引用和清理规则未验，不按年龄删旧URL。
- 200DAU为全小程序；预期一台4核16GB、12Mbps、2000GB/月出流量、180GB共享SSD，测试4GB不变。先同机静态直出、离线出版、有界客户端；无实测不增付费设施。普通业务只纳入容量观察，不扩业务修改范围。
- 测首可用/细节完成/p95尾延迟/帧时、端上分层与物理资源、服务器CPU/RSS/DB/队列、实际出口/协议计量、包体和全机磁盘。旧逻辑文件/HTTP body不冒账单或物理容量，门槛在验证前按基线/体验确定。

## 最终收口与停损

[33项账](ACCEPTANCE-CURRENT.md)给每一功能/约束/数据/成本/验证的后续位置，C08按商业决定范围外，其余有效义务不删。手机暂不可用，只阻止设备通过结论；新版月面未推手机、旧图不能验新版。软件WebGL、受控native端口、DevTools、Android/iOS四层分别记录。不同设备像素不预设逐通道相等；旧严格失败不改判，新的视觉/配准门槛需事前有理由。

评估下一增量：用户可见体验是否改善、合格覆盖是否扩大、每增加一类资源的加工/复核负担是否下降。没有新假设、相同输入与同一失败机制就停止重复研究，换合格输入或推进独立工作。全部有效义务有相应证据才完成Goal；本次文档整理不完成Goal。

## 历史开发摘要（仅证据，不是执行顺序）

以下保留原阶段事实与失败；其中旧“下一步”均由本文件顶部覆盖，无需恢复时逐条重读。


[A1 SAO公开消费者](evidence/a1-sao-public-decision-2026-10-06.md)：真实19229核心/两项重叠/历史视觉5.20与缺值、当前位置/资料来源两复制/Back/公开定位通过，04:00锚点重算13:00方向差0、中心误差3.41e-13px。首Back两7×7差0/Canvas PNG相同，不冒选择十字WXML；两运行41Scene113请求含首锚点诊断FAILED保/该次终态模型MISSING，成功次模型0。产品测试WEAPP构建0改；下一选择语义/真空白取消只按PLAN，完整33/native/物理/独审保留。

[A1 星点到达稳定性](evidence/a1-star-arrival-decision-2026-10-06.md)：当前普通原bundle一次自然0→915，18Scene56请求；257HR/126SAO的4315身份/位置/外观比较不变、5002原disc/Float32提交匹配。16核心192组GPU小窗176严格0，16差与图像新就绪相关未逐源归因，不冒整幅/原生等价。产品测试WEAPP构建0改、最终模型0；公开SAO手势/资料来源下一只按PLAN，完整33/native/物理/独审保持。

[C03 尺度退休修复](evidence/c03-scale-retirement-decision-2026-10-06.md)：真实140°浮点残值保25图/516线已沿原可见性钳零，10边界同步；17.5/115半透明保、三往返RGBA严格0，昼Sun62.304°网格小样已补。2运行18视图253Scene265请求；1产品/1测试、15检查类型、2detail watch产物/1必要build。原窄PASS与退休FAILED保原；跨run地景LOD不同27116通道差不冒等价/物理，33/native/全88/完整昼暮/独审仍开放。

[C03/C09 图层与来源修复](evidence/c03-c09-public-layers-decision-2026-10-06.md)：普通/暖红两尺度与图/线/逻辑名/同帧拾取、九严格RGBA恢复及独立插画贡献已补；真实.fab披露崩溃沿URL owner修，四来源加工说明/10复制/两HTTP下载及ETag通过。2产品/2测试/2common watch产物，针对两回归先失败后通过、两端类型；仅1必要build，三完整记录204Scene240请求，r1总量/原cleanup MISSING但进程已无。33/native/88/昼暮/物理/独审仍开放。

[C05 前景大气修复](evidence/c05-body-atmosphere-decision-2026-10-06.md)：复用原大气计算，月/行星/解析回退/环只改RGB保实体遮挡，夜/红/失败/下一帧回归通过；Sun近白反例已纠正为原独立出口。3page/14视图224Scene322请求、当前opaque与四恢复差0；3既有+1新源码/2watch产物，40+3检查及类型，33/native/图质/物理/独审仍开放。

[C05 环境剩余消费者](evidence/c05-environment-remainder-decision-2026-10-06.md)：23视图206Scene156请求，自然地景上返/三时刻月面/来源Back、四mode-owner暖红→普通RGBA差0；0源码测试WEAPP/0构建。真实晨/昼暗月盘压住大气前景FAILED，六原GPU读回opaque差0确认，唯一下一修原合成；完整设置手势/33/native/物理/独审仍开放。

[C04 昼暮地景实际消费者](evidence/c04-solar-environment-decision-2026-10-06.md)：四公开时刻/17保存视图539Scene457请求，同刻GL光照、真实恒星遮挡拾取与八步地景fade、地下开关RGBA差0、来源Back/Map退休通过；产品测试WEAPP0改/0构建，4运行含3失败均保/退出。下一只补自然上返/昼暮月面/暖红，33/native/物理/独审仍开放。

[C05 月面采样修复](evidence/c05-lunar-sampling-decision-2026-10-06.md)：原quad UV高纬偏移已实测，原renderer改实际片元/backing scale坐标，max22.5135→0.50383；月缘真实solarLight下层max0.63473。105Scene141请求4当前普通视图/3日期提交恢复，37检查类型、七真实纹理body两backing14几何样本；仅1renderer/2watch产物，失败诊断全保。完整月面/native/物理/独审与33项仍开放，下一只按PLAN昼暮地平地景同帧。

[C05 月面真实公共消费者](evidence/c05-lunar-quality-decision-2026-10-06.md)：8保存视图/2照明日期/高倍率/真南极方向/来源Back与5日期提交恢复，186Scene271请求524输入；完整缺测中性灰误差<1，部分灰矩形保真实缺测。实际导航之外低倍率高纬残差max22.51及月缘下层归因仍OPEN，下一只核原shader采样/真实合成；r2边缘起点误诊/原分析保留，产品测试WEAPP0改/0构建，33/native/物理/独审未验。

[C05 普通天体时间运动](evidence/c05-solar-motion-decision-2026-10-06.md)：九种公共一小时预览/明确提交/恢复、2×FOV尺度变化与新时刻核心点选/资料/来源Back通过，月球/金星短1×暂停；507Scene279请求524输入、56同刻GPU/已采用星历对照、最终模型0。原build复用/产品测试WEAPP0改，r1误把滚动提交当预览失败保留；新版月面完整显示下一只按PLAN，33/native/物理/旧UNKNOWN保持。

[C05 普通日月七行星](evidence/c05-solar-bodies-decision-2026-10-06.md)：九种同刻实际光栅、角尺度/相位方向/七真实纹理GPU绑定、核心拾取/资料位置/来源Back通过，103Scene165请求524输入；原build复用，产品/测试/WEAPP0改。r1观察器phase gate漏合法旧帧已修，失败保；两运行退休/最终模型0。时间运动与完整图质仍开放，下一只按PLAN。

[A1 普通默认资格](evidence/a1-ordinary-path-decision-2026-10-06.md)：旧普通35输入已变、条件caller会影响贡献策略，故补一次当前真实无props入口/fixture关闭build及必要链；69Scene/82请求/524输入，中文实际点选、时间跟踪、天体来源Back及Map通过，全部帧无Prepared、首Back银河在、最终模型0。源码/测试/WEAPP0改，普通空/关、照片FAILED及33项保；下一普通日月七行星实际消费者只按PLAN。

[A1 冷暖主旅程](evidence/a1-main-journey-decision-2026-10-06.md)：同场两个原Sky实例完成动态总览/中文真实点选/时间跟踪/原来源Back/前后台/Map，362Scene/177请求；两恢复RGBA严格0差、隐藏Scene增量0、最终资源模型0。银河暖零下载，暖29body含3重复54,341B未全归因，不冒全部复用/物理帧时。产品/测试/WEAPP/构建0；下一普通默认链资格只按PLAN，条件夹具、33项及旧UNKNOWN保持。

[A1 跟踪＋公共时刻](evidence/a1-tracking-time-decision-2026-10-06.md)：预览30分钟方向实移7.20°仍居中，取消恢复原时刻/Context；1倍播放暂停实移0.0061°，同已绘帧拾取/来源/资料方位一致，明确提交同Context rev1→2及原Map通过。83Scene/94请求、最终模型0、产品/测试/WEAPP/构建0；下一冷暖完整主旅程里程碑只按PLAN，旧像素UNKNOWN/native/物理/33项保留。

[A1 动态总览旅程](evidence/a1-dynamic-overview-decision-2026-10-06.md)：公开动态总览往返保进入朝向/新完整姿态，总览RGBA严格差0；手动意图、中文天狼星检索定位、真实核心重叠选择/资料/跟踪及原Map同Context通过，163Scene/136请求、最终资源模型0。产品/测试/WEAPP/构建0，r1直接资料错误预期与诊断失败保留；软件开发通过，native/物理/33项及旧10像素UNKNOWN不变，下一只按PLAN跟踪与公共时刻组合。

[A1 冻结重绘最小修复](evidence/a1-redraw-dependencies-decision-2026-10-06.md)：原page精确视角复用与latest提交，静止/三轴窗口32/34→0/0 Scene、raw15/16继续；冻结/确认RGBA差0，正常跟随方向实移25.13°，166Scene/91请求及最终模型0。34检查/类型、两产品/两测试、仅detail JS/map；旧baseline对象相等/类型/测试夹具失败保原，不冒native/物理，下一整段动态相机旅程只按PLAN。

[A1 整场重复工作归因](evidence/a1-redraw-attribution-decision-2026-10-06.md)：只读三既有page，当前editing 1018帧仅1个记录签名，重复7126星座图/322706点绘制调用；wall包含代理与取证，原生/观察器成本UNKNOWN。原whole devicePose→draw身份为有依据的触发线索，其它依赖尚未逐项实测；无产品/WEAPP/新运行/构建，旧失败及完整33项保留，下一只按PLAN。

[A1 校准模式迟到动作收口](evidence/a1-calib-mode-decision-2026-10-06.md)：旧手动态跟随callback打断editing已实证并修；一个产品/一测试、30检查及类型，实际2285Scene/82请求，冻结严格RGBA差0，取消/确定后四次公开模式动作与同Context返回、最终模型0。初次following分支错误预期超时与旧UNKNOWN保原，W3名称纠正；编辑互斥组开发收口，整场重绘归因只按PLAN，不冒native/完整验收。

[A1 校准图层迟到动作修复](evidence/a1-calib-layer-decision-2026-10-06.md)：原editing仍被旧星座callback改变完整内容已修；一个产品/一新测试、27检查及类型，实际2578Scene86请求，五迟到动作保持状态/视角/Context、严格RGBA差0，取消/确定后十个正常动作恢复，最终模型0。修前179158像素差/五失败保原，不冒native/物理/完整验收；下一只按PLAN。

[A1 校准来源互斥修复](evidence/a1-calib-source-decision-2026-10-06.md)：原可见来源在editing仍跳页并停止采样的反例已修；两产品/两测试、23检查及类型，实际1463Scene108请求，当前/排队回调阻断、三轴继续采样/冻结、取消最新姿态/确定及条件来源恢复、最终模型0。0/0/0像素差分别保原，不冒native/物理/完整验收；原失败与10像素UNKNOWN保留，下一只按PLAN。

[A1 播放来源暂停与公开提交](evidence/a1-play-source-decision-2026-10-06.md)：复用当前完整bundle，无产品/WEAPP/重建变化；实际76Scene104请求，1×隐藏保持未提交暂停时刻/Back不续播，时间尺/253已绘点选/来源同刻，首/暂停态RGBA差0、0source-null；公开提交revision1→2保同地点时刻与Map返回，最终模型0。提交前后10像素单通道1差仍未归因，不称严格相同；非微信/物理/独审，全部33项保持，下一只按PLAN。

[A1 时间预览来源返回修复](evidence/a1-time-source-decision-2026-10-06.md)：活动拖动隐藏取消回提交时刻，普通播放隐藏仅暂停，纠正旧PLAN混同。复用原native owner当前暂停状态，并在可见render恢复Canvas；47检查/类型、53Scene100请求，首有来源/0 source-null、两RGBA差0、253已绘点选、同Context/相机及最终模型0。两产品/一测试、watch仅detail JS/map；原首NULL/221ms/7像素差及各失败保原，不冒微信/物理/独审/完整33项通过，下一只按PLAN。

[A1 拒绝恢复提示修复](evidence/a1-source-recovery-decision-2026-10-06.md)：原通知/StatusPanel共用权限、失效Context与临时失败含义，拒绝后“重新核验”不承诺网络恢复。46检查/类型、实际58Scene99请求一个403→公开恢复、同地点时刻、两终态RGBA差0、最终模型退休0；两产品/一测试、原watch仅detail JS/map。首次测试类型失败保原，修后通过；非真实权限/native/物理/独审，普通空/关及33项保持，下一只按PLAN。

[A1 Sources报告资格修复](evidence/a1-source-access-decision-2026-10-06.md)：明确拒绝从cached refreshError撤销本页report，原Canvas/资源/来源共退；44检查/类型、75Scene117请求四拒绝0/临时失败保内容/七终态RGBA差0，最终租约/decode/GPU模型0。旧末段首Back诊断FAILED保原，仅原产物读回，无新首帧/native/真实权限资格。拒绝恢复提示已由顶部当前证据修复，下一只按PLAN；普通空/关、失败图质与33项保持。

[Q1 ESO原入口决定](evidence/q1-eso-authoritative-geometry-decision-2026-10-06.md)：原项目实际跳eso0936b宣传合成，完整作者页仅银河坐标/Autopano拼接，未给完整映射或明确配准成品。当前公开6k扩展退出，原directUV/成熟偏移反例与所有源保留；零新图像/加工、产品/WEAPP/page变化，两个任务tab已关闭。低分辨率Mellinger、普通空/关及33项保持，高清供给缺口未关闭；当前唯一下一依赖只按PLAN。

[上一代Source Back首画面与多owner缺口](evidence/r1-source-back-first-pixel-decision-2026-10-06.md)：HSC归档注册/非商业当前路径退出；actual60 Scene/107请求首次取得Back暗背景/选中环RGBA，SAO 0→809且native输入[]→有效图像，同context/camera/at/hash，source0/0/2/5/6/6、终态严格等离开前。导出诊断sharp失败保原，首图已只从原RGBA恢复、其它中间像素MISSING，无runtime重跑/新构建/源图下载/产品变化。下一按PLAN比较来源页释放/重建与有界ready/资源保留；普通关/Prepared空/完整33项保留。

[DES权利与DECaPS2原成品决定](evidence/q1-des-rights-decaps-decision-2026-10-06.md)：DES官方商业需许可/成品unclonable，无许可路径退出且未取图；DECaPS2自制层CC BY4明确，两个真实NGC3532原JPEG共396357B、无新加工，细图饱和彩星/水平紫拖带使当前显示FAILED退出。未出版/接page，原成果保留；HSC当前归档路径已退出，下一独立Source Back首画面恢复只按PLAN，普通关/Prepared空/完整33项保留。

[NGC253有效编码与合成决定](evidence/q1-ngc253-encoding-decision-2026-10-06.md)：当前实际58 Scene/101请求，PNG/JPEG两等尺寸同Scene真实完成来源齐、原page replay/Back像素一致、退出退休通过；两编码共有明显照片外沿/内外星点密度差，当前完整矩形连续星空合成FAILED退出，原成品/TAN保留。r2无效PNG/初构造失败保原；无产品/WEAPP、新图像/加工/普通注册。DES具体权利已收口退出；DECaPS2小样已按新证据退出，当前下一只按PLAN；33项、设备/物理/独审保留。

[Q1 M104完整外围决定](evidence/q1-m104-periphery-decision-2026-10-06.md)：七缓存图/原v2和实际58 Scene/106请求，0.4°六格、0.15°三格名义视口原来源齐；四对终态RGBA差0、binary/模型峰/退休保持。但0.4°实际与原401331均有暗紫矩形/斜边，当前有限order8显示FAILED退出；Back两未ready null/三partial仍FAILED。无产品/WEAPP、新下载/出版变化；NGC253同Scene编码/照片外沿已按最新证据决定，下一只按PLAN；普通关/Prepared空/33项保留。

[R1就绪快照交接修复](evidence/r1-ready-handoff-decision-2026-10-06.md)：原native Hook/光学/Canvas/page共享一次当前scope读取，五失败前/58影响检查/WEAPP类型、actual62 Scene/107请求通过；已ready旧空帧真实两格完成，五终态差0、等binary/峰/退休。剩余两未ready null/一partial仍FAILED，普通关/Prepared空/33项保留；该外围实际小样已按最新证据退出，下一只按PLAN，不让全部运行优化串行阻塞供给。

[R1 native/Hook/Canvas阶段归因](evidence/r1-native-pipeline-decision-2026-10-06.md)：两次实际page中心ready→dispatch即时；第三null为React新结果前的原空输入队列快照，非代次/完成拒绝。首有源Scene93.2ms含raw GL84.5ms/贡献1×1读回48.8ms，仅软件同步证据，保真实贡献资格；十终態RGBA差0/等binary与峰/退休，三null一partial仍FAILED。该最小交接已按顶部证据修复，下一只按当前PLAN；普通关、全部33项保留。

[R1中心优先有界比较](evidence/r1-visible-priority-decision-2026-10-06.md)：28影响检查/WEAPP类型、actual60 Scene/106请求，中心先acquire/qualified；五终态RGBA差0、等binary body/资源峰/退休。单次首来源未改善，三null/一partial仍FAILED；排序仅现试验行为，不冒普通采用/性能通过。该间隔已按顶部最新阶段证据拆清，下一只按当前PLAN，全部33项/独立Q1-P1保留。

[SkyMapper宽域原成品退出](evidence/q1-skymapper-wide-original-decision-2026-10-06.md)：四必要order3原PNG/1,931,916B，8°色块与斜向拼接痕FAILED；当时0.4°六缓存格仅条件预览；现实际完整外围原底色FAILED退出。无产品/出版/新page变化。复用原r4查明两个视口外格先decode的新顺序线索，首可见格比较现已补，当前下一只按顶部PLAN；完整恢复/图质与33项保留。

[SkyMapper有限原生消费者](evidence/q1-skymapper-native-consumer-decision-2026-10-06.md)：真实缺加工DOI的v2身份/完整来源、七原PNG/4,357,637B、本机HTTP/标准静态、实际M104/来源Back/退休已补；13影响检查及前后端类型通过。0.15°/0.25°名义视口原格和同帧来源齐，终态差0；Back四null/两partial保FAILED。当时有限条件候选保留；现完整外围原底色使该order8配置退出，同源宽域旧失败保持，当前下一只按顶部PLAN，普通HiPS关/Prepared空/全部33项保留。

[SkyMapper M104原成品小样](evidence/q1-skymapper-m104-region-decision-2026-10-06.md)：七原PNG/4,357,637B，正确轴完整区域预览支持继续有限native试验；未普通采用。LMC旧失败保原，初次转置诊断已纠正/保存。该最小合同及实际消费者已补，当前下一只按顶部PLAN；原DR4/ODbL及全部33项保留。

[暖索引写回比较采用](evidence/r1-warm-index-coalescing-decision-2026-10-06.md)：仅并发queued touch共享耐久快照，35检查/类型通过；完整page索引40→36、文件操作496→460，同图片/终态/退休保持，两null仍未闭合。本项运行优化收口；后续SkyMapper有限源预览已补，当前下一只按顶部PLAN；普通HiPS关/Prepared空，33项不缩减。

[Source Back阶段证据](evidence/r1-hips-source-back-stage-timing-decision-2026-10-06.md)：当前完整page读回40个暖job/40次全索引写回，首lease127.1ms、onload339.8ms、首有来源完成595.8ms；两null保留，无产品优化采用。后续有界比较已采用，当前执行只按顶部PLAN，保完整验证/耐久及33项。

[HiPS来源返回缓存修复](evidence/r1-hips-source-back-encoded-cache-decision-2026-10-06.md)：临时session改复用原immutable encoded owner，仅试验有效。实际同43身份本地body70→43/少3,756,098B，Source Back12→0；三null保留、首图时间未改善。后续阶段已拆清，有界比较已收口，下一只按顶部PLAN；预算未扩、完整33项与普通关闭状态保持。

[SDSS9区域原图退出与恢复链继续](evidence/q1-sdss9-region-sample-decision-2026-10-06.md)：八图923,498B仍有彩条；官方不同配色对照一次503、像素未得。原图与503结果保留；后续已查明缓存原因并修复重复body，首图剩余依赖只按顶部PLAN；不扩缓存，不把TRIAL机制结果冒普通图质采用，33项及合格供给义务保留。

[SDSS9原样粗阶配置退出](evidence/q1-sdss9-wide-sample-decision-2026-10-06.md)：9原JPEG/429,709B有重复彩条/扫描痕；实际MOC为空间UNIQ，45°名义覆盖98.77%仍不证明像素图质。无出版/产品/page变化；后续8°区域也已退出，当前执行只按顶部唯一依赖，广角及完整体验义务保留。

[Legacy广角原成品退出](evidence/q1-legacy-wide-sample-decision-2026-10-06.md)：12原PNG/1,401,148B有大片透明缺测/色块；当前45°名义MOC仅6.35%视口，当前配置在出版前退出。无产品/构建/实际page变化，旧成果保留；后续SDSS原样小样已分别决定，当前执行只按顶部唯一依赖，不冒全天/科学/设备/完整验收。

[PS1广角退出与静态冲突修复](evidence/q1-ps1-wide-region-decision-2026-10-06.md)：12原低阶JPEG/约1.45MB小样完成；110 Scene/179请求、精确来源Back/同相机终态差0/退休通过，图质FAILED退出当前广角配置。暖回45°三partial/340.1ms与Back三null/八partial/1149.4ms保留。原静态owner路径冲突修复、46检查及本机HTTPS/64文件归档恢复通过；该Legacy配置现已退出，下一只按PLAN，普通入口关/完整验收开放。

本文件是唯一执行计划。当前恢复见[CONTINUE](CONTINUE-CLOUD-SKY.md)，目标见[GOAL-CURRENT](GOAL-CURRENT.md)，全量义务见[ACCEPTANCE-CURRENT](ACCEPTANCE-CURRENT.md)。2026-10-05依据 Pro 两轮审查及当前代码归并；[审查决定/证据边界](evidence/pro-review-reconciliation-2026-10-05.md)解释理由。旧过程留原证据/PROGRESS和固定提交Git历史，不再堆在当前计划里。
