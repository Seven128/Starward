# 连续时间与昼夜环境

## r77：时间尺实际连续输入

修前实际页面把 native scroll 的浮点行位置 round，再通过 `setPreviewIndex` 选整供应行，底层已具连续模型却未用于尺拖动。现在 `skyRulerTime` 在已准入 model coverage 内按相邻实际时刻插值，兼容不等间隔与跨日；缺模型/范围不足保独立真实行，不插值天文坐标。页面仍由原 observationTime/presentSkyTime 产生太阳、天穹及其它现连续几何；控件读实际 presentedAt。拖动/惯性沿原 scroll settlement，临时暂停 fineTarget 查询，停下恢复现需求；松手吸附/离散提交、取消、hide/编辑锁不另建时刻状态机。

8个实际尺控件/取消/隐藏/惯性用例、2个真实模型太阳/观测矩阵与间隔覆盖检查、1个实际page preview和fineTarget绑定检查通过。`r77-typecheck-initial.log` actual0，后续合批 `r78-typecheck.log` actual0，`git diff --check`通过（只有CRLF提示）。前像 `r77-time-before-*` 和全部日志归原output。r77普通候选只构建/包体通过，未推送；r78包含时间和夜景联合候选，当前原生取证进行中。

修前普通r75手机受守卫两次上拖到北地平、开时间尺，一次record-swipe 19→15点。原media保private runtime `r77-time-before.mp4/.png`，metadata `output/cloud-sky-native-updated-ide-2026-10-12-r1/r77-time-before-video.json`：100原编码帧/549,625B，8抽帧已看003–006，见19:00→18:30→16:30→15:00，山地由夜至日。最大编码PTS间隔2476.4ms不当应用FPS；未在此样本看到四树，不冒缺陷消失。公开页面输入/录像不含新素材采用，private query/endpoint未写输出。

## r78：夜地面与天空侧地平

已实看用户原图1/2和保存原话，沿唯一PLAN UX12，在原 `sky-landscape` 两shader共同lighting降低正常夜间ambient；近地平正常视角保暗material，淡灰cue仅随向地下浏览进入。`sky-solar-light-shader` 收窄正常夜间地平微光，保同一公共太阳时刻；实际alpha、地景几何、遮挡/拾取与浏览透明度不变。未改图像字节、制造云层、增加shader pass/Canvas/缓存或重开红光功能。

32张实际Scene/GPU原图和源码hash见 `output/playwright/cloud-sky-night-light-1014-r78`，原1024地景PNG/alpha均核manifest SHA；受控太阳高度为-24/-15/-9/-3/+30度，正常/地平/地下/全天与两地景消费者。两消费者正常夜间地面读回更暗，地平photo场景地面均值31.35→6.67/255，day两端全RGBA相同。已看photo地平before/current、全天/地下/航海暮光current及procedural地平current原PNG。固定角度软件GL只证显示，不冒实际地点光度、native完整交互或物理性能。

联合普通r78 `night-light-clean` SHA `887144b63e9aa75c7859a267270257fe079c2ee6175ba7e8d34822b2b49f675a`，284文件/4,882,910B，main2,097,108B余44B/Sky1,419,048B；build/包体/official auto_preview actual0，已实看手动入口、两次上拖后的暗地面和19:00:00时间尺。private r78-night-horizon.png保实际暗地面。r78-time-after录像102帧/702,245B，已看7抽帧中的003–006，17:33:56→15:37:31→14:51:34实际连续时刻/天穹变化成立；最大编码PTS gap1647.978ms不当应用FPS。录屏尾截图仍PREVIEW，后续诊断见下节。原生普通包含r76 HiPS但仍关闭，不能借它认证HiPS。

## r79：地景粗档需求的有效细图保留

已确认一个独立寿命缺口：`useSkyLandscape`原native owner明确保“detail直到pending coarse成功”，而纯选择器在请求overview时完全拒绝已有detail，导致一张仍有本身alpha且已decode的图变成null。现在选择当前需求档优先，缺失时在原现有maps取另一有效档及它自己的alpha，不请求新图、不扩大native/GPU压力。没有resource仍无图；缺细档alpha不能借粗档alpha。此修复尚未宣称是四树闪现的唯一根因。

原失败断言直接深比完整2MiB mask，报错格式化耗53.8秒后RangeError；尝试检查该进程时已无匹配PID，实际未kill。改为image/mask身份断言后修前明确失败（undefined），修后新反例及2个受影响原保粗检查通过，见 `r79-landscape-before[-r2].log` / `r79-landscape-after.log`。源码比手机r78领先这一个选择器修复，尚未交付/原生验收。本轮独审MISSING，四树/强黄白圈、整个UX09/12及物理性能未闭。

## r80–82：实际结束事件与Sky查询门控

普通r75/r78录屏末尾未见吸附，不能由此直接断言普通拖动结束损坏。临时r80只显示事件计数/settlement.active，不读取私密data；普通页前像、诊断源/hash/scope和候选都保原output，构建后已校验hash精确恢复普通源。r80 marker为R80TIME，候选SHA a41e1d25d9ce0d892024974e4514a9bed66a8bc76079d748c236c31a5d4f33d4，build/包体/官方预览0。

同一r80实际真机：中心y=.724普通swipe后start1/scroll44/touchEnd1/dragEnd1/hint1/settle1/active0，15:00:00已提交；底缘y=.756反向普通swipe后相应2/88/2/2/2/2/0，19:00:00已提交。随后同底缘record-swipe得到3/130/2/2/2/2/active1、14:54:37预览，另外fresh capture仍同状态。两普通输入证明有界原生结束/提交有效；录屏伴随结束事件缺失的根因UNKNOWN，不把它改写成已知产品主因，也未添加凭超时猜松手的逻辑。四原PNG和录像保private `r80-ruler-*`，诊断像素不冒普通包完整验收或性能。

实际检查同时发现新timeScrubbing门控在无scroll的tap/显式取消路径漏释放。先将通知收回原scroll owner，13受影响检查通过；r81主包因此增长71B到2,097,179B，超27B，包体FAILED。一个批工具未在读到该失败前停止后续prepare/auto_preview，调用实际completed，不能当包体通过；旧候选保留、未认证手机。修正为Sky内 `sky-time-ruler-settlement` 窄桥，只观察原controller真实active变化，含异步settle；原共享scroll源按前像逐字恢复，未复制计时器/手势规则。页面取消也撤销其Sky请求门控。r82实际10个ruler/page恢复检查及类型0，等待新普通包预算/回交；不重复未改共享3项、GL或图像批次。

## r94–96：已确认时间提交中的空白与有效资源保留

普通r92先从follow切手动；近天底拖动未得到所需地平，未据此修改相机/滤波。已保private `r94-near-nadir-manual.png`，通过正常Back→示例点→云观星→手动查看恢复北向45°默认视角；地景开启，网格在新入口回默认关。受守卫普通拖动将北地平放入可见区，时间面板内确认2026-10-13 21:00。该姿态恢复不是物理方向/绝对校准验收。

r94在普通r92记录同一尺的21→14点，x=.17→.81、y=.723、1800ms；private原片 `r94-horizon-time.mp4`、尾PNG和7个原抽帧保原，已看002–007。126编码帧/825,584B，PTS0–5.953956，最大间隔3322.733ms不当app FPS。原帧依次见20:50:38、19:11:59、16:57:47、15:13:37的秒级预览；5.475356s实际出现整片天空空白、“正在加载所选地点与时刻的天空”及空尺，尾截图稍后恢复14:00照片。不能据照片终态宣称整个提交正常，也没有认定四树的唯一根因。

根因在page共同资格：本页时间PUT经过原API完整确认并更新Context版本后，新报告Query暂空，rawReportData、nativeCanvasMounted及各图片资格一起撤销。新增 `sky-time-commit-continuity.ts` 只在这一次已确认的同夜时间编辑期间保留原回执及已准入的实际时间供给。仍用presentSkyTime产生所选精确瞬间，不替换来源Context、selected report advice或provider weatherAt，不写Query/响应缓存。新查询真实返回、失败/拒绝、归属变化、空闲结束或Context到期时退出；普通hide清空且A→B→A不能复活。等待期间封锁再次提交，暂停旧版fine-target及位置presentation请求；新报告接管后原互动恢复。原资源owner、publication/Canvas代次、就绪与绘制/来源边界保持。

API的完整编辑核验/一次readback仍由 `confirmedObservationContextEdit` 持有；新增 `ConfirmedObservationContextReply` 是其成功返回的类型证明，无wire/cache字段，两个相关service的去注释JavaScript逐字等前像（`r96-confirmed-receipt-code-equivalence.json`）。天气过期投影由 `useSkyForecastQuery.presentation` 复用原skyForecastPresentation，Sky owner只持一个源/目标及当前有效投影视图，无第二套天气规则或view trail。

48个相关行为用例分次收口：17 Context/session、21实际page命令、5拒绝/恢复、5新连续性。首轮缺旧r77夹具依赖及保存样本非canonical UTC/夜界格式的失败日志保原，按实际owner接线补齐夹具，未削原断言；最终新5项 `r96-continuity-tests.log` actual0，最后类型 `r96-typecheck.log` actual0。新检查以真实保存的model、来源及太阳差验证精确瞬间，覆盖确认/来源/时间错配、归属/失败/expiry/天气小时边界，并执行page实际原生挂载与资源资格表达式；清空transfer时确实退回原null/false，仍不是native替身。

r95首次普通构建成功但main2,097,263B，超111B，预算FAILED后未prepare/push。撤重复运行时核验器导出，改依赖原API确认回执的类型证明；纯天气投影从原查询入口取得。r96普通候选 `time-commit-continuity-bounded` SHA6c918741271a00880794041b90c854aa28e08cae4f44cbb4d458d434337b2f0e，284文件/4,886,148B，main2,097,124B余28B/Sky1,422,270B，构建/预算/prepare/官方auto_preview各actual0；旧失败包保留。手机fresh实看普通入口、14→21点普通恢复，然后在默认手动北向用原公开控件回到相近北地平，未设置诊断marker/helper或造pose。首次反向尺滑动起点命中vConsole浮钮，只移动浮钮、时间仍14；按实看避开起点后提交21，再把浮钮回右侧，没有读取console内容。

r96同一1800ms的21→14 record-swipe，private `r96-horizon-time*`保原；146编码帧/984,827B，PTS0–5.9845、最大间隔2984.767ms仍不当app FPS。已看003/005/007原帧，见19:59:09与16:00:48连续预览；5.6026s明确出现新增“观测时间已更新，正在刷新资料”，尺14:00保存中，天空与原照片仍实际显示。后续fresh终态14:00普通照片、无预览/保存中。该新提示亦说明新的产品分支已实际执行，不仅是官方命令completed。

`measure-time-continuity.py`仅流读原编码帧的固定物理RGB取样区(x0/y450/1080×550)，不写改图。126修前帧有2个近纯暗低变化候选（5.475356/5.953956s），已实看5.475356原空白；146修后帧无此候选，最小通道std5.785/255（修前.298/255）。仅这段取样区与原帧支持提交空白的有界修复，不认证整场FPS/driver、每种LOD、四树/强黄白圈或全部时间路径。首次数字decoder因子进程/管道停滞，根因UNKNOWN；核PID/父子/绝对工具路径后只停本次owned FFmpeg，保前像/失败，改受界超时、stderr drain和单线程decode后实际完成，不能把harness失败归产品。

当前本轮独审MISSING。完整UX09、四树/强黄白圈、冷/失败与全家族原生、物理性能/iOS、原33其余FAILED/UNKNOWN/MISSING保持；原33已核逐字不变。图像/字节/新供给未改，人工云取消/红光暂缓/无障碍不做/不Stitch及唯一PLAN保持。

## r97–98：全天暮光的方向分布

r97只用原环境诊断按钮进入现手动相机，再由原clamp取得实际264.36°，forward[0,0,1]；没有模拟物理pinch或传感器姿态。SKY97ENV包07983ae933c90e0d3fc7522ea57914d21e21ee772c044f827005ed5f7abb5a11已官方推送、实看和bind，源已精确恢复普通r96。14→21:30同一公开时间尺原片89帧/901,272B、最大编码PTS间隔4273.656ms；原PNG002–005及原编码n20/25/30/35均已实看。太阳49.17/36.77/21.37/11.57/1.58°由页面连续时刻HUD读回；显示−7.13°的原帧实际出现几乎绕全天的亮黄白圈，显示−17.31/−47.82°时已暗。该HUD不是独立的已copy太阳uniform回执，快速预览中不认证逐帧时刻严格相同。照片地景的连续轮廓仍在，没有在所看帧认出四棵程序树；不外推全部帧、反向、冷加载或唯一四树根因。BSC8404只是输入目录数，预览期间HUD的?不是零星或实际提交数。

1800ms首次record-swipe被原6秒录制deadline守卫拒绝，未发输入；fresh capture后800ms同方向/范围实际成功。原媒体保private runtime r97-dome-time.mp4/-end.png、r97-dome-day.png及原抽帧；metadata为output/cloud-sky-native-updated-ide-2026-10-12-r1/r97-dome-time-video.json与r97-dome-twilight-frames.json。没有放宽守卫或把编码间隔当app FPS。r97返回现prepared普通r96的official0/实看无helper并bind；其旧feedback和两个bootstrap都按owner stop0。两次CLI错误参数未创建或发送动作，保失败日志，后按help纠正；r68未知持有者清理例外仍不碰。

根因有界定位到共享sky-solar-light-shader：原地影高度只乘视线高度梯度，twilight间接光统一乘11，Rayleigh对称角分布仍让背太阳侧也过亮。沿现已采用的[Özlem论文](https://www.researchgate.net/publication/380396923_Fast_Sky_Rendering_for_Daylight_Twilight)3.14重新核原数学的角地影边界，r98只原创适配这个方向因子，朝太阳归一化保旧solar-side显示，以smoothstep柔化边界并保固定很弱的间接光。不是导入代码、完整多次散射、现场辐射/地形、动态气象或新引擎。原曝光/同刻太阳/星等资格/地景alpha与源字节不变；day与astronomical-night分支实际RGBA保持。

复用check-night-light-r78.mjs的同一Scene/两地景消费者，增加本机制有界direction配置。首次实际输出发现clamp地影边界偏硬，同时程序树被照片mask错误计入天空取样，初次断言失败保原；改smoothstep并让每地景消费自己的真实遮挡。第二次12个条件/24个before-current软件WebGL帧通过；−7.13°无遮挡3–10°太阳侧编码RGB均值：照片159.164→158.676、程序166.229→165.757；背太阳侧照片196.481→71.306、程序196.957→71.553。两地景day和normal-night全部像素差0。已实看修前、修后照片与程序暮光原PNG，硬边已消失。此取样不作物理光度；只是保太阳側而消整圈过亮的开发证据。3个原太阳owner检查与类型0。前像、初次失败、executed-script和输入hash均保output；新原生全天/身体前景合成及宽视场成本仍待核，独审MISSING。

r98 SKY98DIR官方推送/实看/bind后，同264.36°/forward[0,0,1]、2026-10-13公开尺14→21:30、同(.665,.723→.025,.723)/800ms原片83帧699,508B；最大编码间隔4353.978ms。复用原inspect-native-video，仅增加有界原编码运动段抽帧，未插值/改图；已看006–013与尾图。暮光暖侧和较暗对侧可见，但快速HUD与Canvas可能先后更新，单帧不作精确太阳绑定/前后像素误差。随后原公共尺落到19:00，再一次0.5小时短拖实际提交18:30；停稳原PNG r98-dome-1830-settled.png实见太阳−8.04°、相同FOV/forward、照片连续輪廓，落日侧暖色保留/对侧暗，不再整圈发白。仍非每个时刻/迟到失败/四树根除、物理FPS或全部身体前景合成。

r99普通directional-twilight-clean无marker/helper，SHA426111a04774d3730c91463c5ed8040aeec574a4533a0f3b9b2bcd7dfd42ec77；284文件4,886,730B、main2,097,124余28B/Sky1,422,852B，build/budget/prepare/官方0。已fresh实看入口和普通手动天空并bind；初始普通PNG另保private r99-ordinary-initial.png，不把18:30初始少星当完整名称或星数通过。r98两原媒体及停稳图先保private，随后旧r98 feedback/其bootstrap/r99bootstrap和r96旧feedback均按owner stop0。一次bootstrap grant超60秒拒绝未发tap，fresh实看后成功；不放宽守卫。新source与旧失败/候选保原；当前独审MISSING，完整Goal active无预算，原33保持。

## r103：照片细档绘制失败的有效粗图恢复（2026-10-14）

当前Scene存在一条独立可达路径：fine panorama传给GPU后返回false，即直接绘procedural；资源选择只返回首选图，没有把原native owner已保留的有效overview带入这次绘制。真实Scene反例在修前实际得到[detail,model]，要求[detail,overview]，见r103-landscape-coarse-before.log；不把它冒作已经确认手机四树全部/唯一根因。原程序模型仍是两档都不可用时的已采用显式恢复，不能为了消树删除该恢复或伪装图片成功。

沿原selector/Canvas代次/native maps声明一个已decoded、同publication且自身alpha的overview coarser字段（单层、无递归历史），不新增图片请求、缓存、texture压力预算或外部图像。Scene首先试当前图，不可绘时才试同源有效粗图，保原ready/display opacity和source-over模型恢复；成功receipt里的mask/resource/alpha必须属于真正成功的档位，已绘来源/遮挡/命中/名称的现消费者继续读它。粗图真实零贡献可凭本身alpha证书跳过GPU，但opacity0不能授图片credit；模型初次未绘成的零前景同样保真实0。两档真失败仍提供实际模型与公开retry，不将它叫照片已显示。

20受影响resource/真实Scene/Hook检查与Mini类型进程0：反例已通过，并批量核同源alpha、细图失败粗图可用、原0.5恢复合成、粗图alpha真零/失败模型与两档皆失败。既有“粗需求拒绝有效细图”的测试fixture已与早已采用r79规则协调：现在该pending case确实无可用bitmap，原无图不可造树/terminal真实恢复断言仍保留；未为旧fixture回改生产。

共享check-night-light-r78新增--landscape-recovery，用同已出版原PNG/两档alpha/hash、实际Scene/GPU/texture owner及不可upload的fine bitmap失败夹具。四条件（夜间地平、264.36°夜/暮、原模型→图0.5）修前分别有36,805/224,651/355,782/244,912 RGBA组件不同于独立coarse-only输出，且提交procedural；当前四条件RGBA逐组件差0、提交overview或原transition。已实看原whole-dusk before/current和model-to-photo current PNG。它是软件GL有界恢复证据：fine失败是注入夹具，不是手机普通运行根因证明；无真机failure/完整UX09、物理资源/FPS或独审。结果output/playwright/cloud-sky-landscape-recovery-1014-r103/result.json，未重跑未影响的r78夜光/r98方向套件。
r103普通landscape-coarse-recovery-clean build/budget/prepare/official0，SHA679fdc308fd31ef44dbf5a28a01dbb8803502544368f0a94f412b282c3cd1b8d，284文件4,900,043B、main2,097,124余28B/Sky1,436,165B，无marker/helper。实际普通手动入口已看完整Alderamin，两个1000ms上拖后的北低空原PNG有Polaris完整名与底部暗地景；开启的地景层及原来源展开显示Stara Lesna Meadows/Lubomir Hambalek，收起后暗边界仍在。普通照片可用路径有限成立，不读回档位或认证native注入失败/四树全部、全倍率/性能/独审。当前公共19:00仅复用上一普通Context，本批无重录连续时间或夜光套件。

原媒体r103-ordinary-initial/horizon/lower-view.png、layer-status.png、source-panel/lower/expanded及after-source-close.png保private；名称为artifact标签，source-page.png实际仍同页inline展开，不是独立route旅程。三次recent_capture_required未发输入，image detail low被工具拒绝未实看。操作辅助capture-operator-preview.ps1只把原PNG转360px宽预览供控件识别，原文件不改、60s/单次原grant不变；之后输入成功，像素/字形细证另看原图。bootstrap Dxkp87及旧r102/H7LrYP owner stop0，媒体先另保；当前ordinary Zzsm9M/7IFXxG已bind，bytes/AppID未独立读回，原r68 cleanup例外保原。