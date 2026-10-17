# 现有目录局部星数与显示阈值

## r87：实际同天区对照

复用既有参考研究，只完成原未验的UX13。旧browser-client实际bootstrap失败（agent未定义）后使用当前cua Browser接口，agent自建IAB标签现已关闭。参考官网UI搜索Delta Piscium，固定公开新加坡城市位置1.29290/103.85470（不是手机位置）、当地2026-10-13 20:34:31暂停，连续两次原UI缩放后DOM保留FOV10.8°。canvas为1280×720 CSS/1600×900 backing，DPR1.25；原官网截图保`output/playwright/cloud-sky-star-density-1014-r87/reference-original.png`。保持参考原大气/地景和照片背景，没有下载或采用新照片/目录。

本项目通过实际Astronomy Engine公共观测frame、固定BSC v3出版/SAO v2哈希与准入、真实select/resolve/Scene/GPU生成同天区。中心HR224在az81.692617°/alt31.922176°，太阳alt−25.853619°；原正常星等阈值8.562748。21个实际选片全部本地读回/校验，727,913B、8,404 BSC+5,083所选SAO输入，721在实际投影内、258提交、195达到原点选opacity≥.1。供给来自本地固定出版，未宣称本次完成手机HTTP完整加载。

实际产品投影位置与参考中的δ/ε Psc、20 Cet等星点吻合；16个亮星锚的3 CSS像素内峰值中位偏离2.27/最大2.84像素（亮核宽平台/抗锯齿会移动最大值）。因此本样本以实际身份位置验证角覆盖，而非仅比较两个FOV标签。差异采样使用各原图原像素，产品1600×900按DPR坐标取样，不改截图尺寸。排除工具栏/文字/土星区域后557个已供身份中，以峰值相对局部背景16/255为有界读数，544在参考可见，而产品只有143；其中360个因原阈值完全不提交，另外50个虽提交但未达同一读数。它是已知身份位置的有界像素对照，不是全部参考恒星数、肉眼统一阈值或摄影点的身份认证。

通过参考UI搜索SAO128842，实际返回HD3230与相同SAO身份，显示Magnitude9.31；本项目原SAO保visual9.0，不把不同测光改成同一V值。参考实际选中截图/DOM在`reference-sao-128842.png/.txt`。直接点canvas的两个暗点及中心亮星均无选择响应，原因未追；搜索成功不冒点选成功。未导入其Gaia别名或坐标/测光。原图的淡摄影点和未匹配点不计作项目可检索星数。

首次脚本.ts在输出目录被tsx按CJS处理而拒绝top-level await，保`r87-field-first.log`；改.mts并修准入调用后实际成功。脚本/完整结果/PNG和像素对照分别在r87目录；无生产代码变更的初始结果作为修前证据。

## r88：正常局部缩放采用已有深度

`sky-star-appearance`仅在45°以下正常局部视场加强连续放大对应的目录深度；45°及广角保持原曲线，上限仍11，缺失/星等/B-V/大气透射与单点连续核/晕沿原owner。explicit mode贯穿Scene、选片、Hook memo和页面候选，不借undefined太阳含义猜红光；OBSERVATION曲线保原，红光暂缓。没有新星库/随机点、额外缓存/并发/包内目录，原3并发和6MiB工作集不变。

同一真实场景新选片28/901,429B、6,290 SAO输入，876在视野/876提交、875点选。原已供的视觉9等身份从零贡献转为非零；新增7片+173,516B。共享无UI区域681个身份中，本项目681个达16/255，参考646个；还包含显示规则/原测光差异，不能声称两端像素相同或更深星表完整。原PNG已实看，弱星仍小点，颜色来自原B-V或SAO中性缺值，不改单位。现在不需扩表来修这项已证实的主要差距；其它深度缺口若存在保未验。

20项受影响appearance/选片/Hook生命周期检查、Mini类型actual0；包括9等进入/退出、连续zoom、天光、原模式选择。实际同源旧/新Scene/GPU对照中原OBSERVATION全RGBA差0。双鱼座样本30次软件GL提交中位2.4→3.7ms，p95 4.4→5.2ms；天鹅座Deneb较密样本27片/1,662,643B、11,769 SAO输入/2,411提交，中位3.3→6.2ms、p95 9.1→9.5ms。该测量包含当前Scene提交、浏览器软件driver，缺其他完整图层/物理设备，不当手机FPS或收益。首对照因tsx序列化__name辅助符缺失失败，保`r88-field-comparison.log`；局部评估器补函数元数据helper后r88-matched/r88-dense成功，非产品修复。

普通r88/local-star-depth-clean build和budget actual0，SHA`000b9cdc20ce8265c5cfa91a6db10324c4d8149fee8d3dcfee0738aae199c37f`，284文件/4,884,087B，main2,097,108（余44B），Sky1,420,225B。该普通包保存但未推送；随后先做下述原生成本观察，普通回交仍待完成。独审MISSING，原33和其它失败保原。

## r89：当前原生局部样本

复用旧bounded drag observer，以诊断按钮把当前手动视角固定10.8°；不是物理双指。没有改变生产显示/星表/资源规则。首次stage脚本嵌套模板字符串语法失败，尚未改产品源；修后两源码前像/hash与诊断产物保存，类型/构建/预算actual0。r89/local-star-depth-probe SHA`ce8b563eadd053553298eff8b27896b45a1b34098ad2cd4d780b40c05a28c7a6`，284文件/4,888,821B，主包保持；构建后两源码按hash精确恢复、临时helper归档，33原行仍逐字一致。

首次official auto_preview completed但capture被前台guard拒绝，最小只读诊断确认无线可用/awake、WeChat Launcher（没有读聊天）。同一prepared包仅重试一次auto_preview后，实际capture见STAR89DENS并进入正常手动星空。实际10.8°/2026-10-13T13:00Z/太阳−42.59°，初始ENU forward[0,.7071,.7071]。一次x.25→.65/y.58/1000ms普通横拖，root实看warm及终态原PNG，当前新增真实星点可见。

完整转录/hash见`output/cloud-sky-native-updated-ide-2026-10-12-r1/r89-native-local-depth-result.json`：112 moves、63 presented frames、66 pages、998ms输入段；Scene max15/mean8.59ms，body15/8.27，stars8/5.44，BSC loop4/1.86、SAO loop5/3.44。BSC input8,404/eligible最大24均20.87，SAO input最大8,793均8,773.57/eligible最大527均506.97。native update56，gap max43/mean17.13/p95 30ms。request/flush未在这次窄诊断中接入，HUD零不表示零调用；未细分的原phase显示“-”。这是Date.now调用墙钟与native更新回调，不是物理FPS/driver峰或整场证书。未另读SAO loading状态，不冒完整HTTP就绪；与公开新加坡参考不是同地点/画布，不能混为同一数量比较。

原PNG只在private runtime `r89-local-depth-warm.png`/`r89-local-depth-drag.png`。已bind r89并owner stop旧r86和bootstrap。当前该样本把重复SAO投影定位为可单独处理的CPU责任；没有过去同场景native对照，不能冒性能改善。后续可沿原当前frame/geometry寿命复用纯方向/传输，保持位置/光度/点选及退出，相关改动另以相同条件验证；普通回交/独审仍未闭。Context结构校验actual0只证明声明结构。

## r90：SAO相机无关计算复用

沿现ResolvedStellarSupplementFrame增加与BSC同约定的可选displayDirection/displayTransmission，纯转换仍用原prepareSkyDirection/skyStarDisplayTransmission；懒memo只属于当前geometry/所选point数组，换时刻/换星集重建，无全局历史view缓存。Scene直接用原prepared projector，保无accessor受控旧frame的即时路径；没有改任何真实坐标/单位、资格、样式、pick阈值、供给或资源预算。前像r90-sao-before-*。

受影响SAO下半球/换时刻与实际Scene memo有无对照、既有地平后绘制拾取2项通过；类型actual0。r90-matched对相同Deneb27片/1,662,643B/11,769 SAO输入与2,411已绘identity，旧/新实际GPU正常和原OBSERVATION全RGBA差0，已看新原PNG。30次软件GL Scene提交中位6.4→3.8ms、p95 12.7→6.4ms；该有界同输入结果不替代实际手机/物理成本。

r91复用r89同诊断入口/观测器，只让底层采用r90规则，包SHA6d13164456a59bb1c9e0804bac960e845cdc2bdb08f6cd9785f2688c8973a9e6、284文件/4,889,256B，build/budget0。构建后已用同脚本retire r91精确恢复两普通源码/归档helper。

实际r91 warm/drag原PNG已根读，record-local-depth-r89.mjs的同一入口记录r91结果：同一private query/API/page、已见10.8°/时刻/太阳、相同按钮重置初始forward及相同swipe和终态rounded forward；SAO input最大同8,793、均8,774.00，eligible最大526/均507.66（采样帧数与r89不同）。SAO loop均3.44→2.59ms，Scene均8.59→8.04ms；Scene max15→22ms，SAO max5→11，较大帧同时BSC7/SAO11，根因UNKNOWN，不归咎GC或认定完整峰值改善。113 moves/68frames/71pages/987ms，gap max34/mean15.73/p95 29，native updates60；所有明细与hash见r91-native-local-depth-result.json。这是控制条件匹配的有限样本，不是假设逐帧输入相同的FPS证据。

普通r92/local-star-memo-clean包含r88深度和r90复用，已build/budget/prepare0，SHA`b2554e86229bc889b4459d41c0d4e7c6a371fe8c0516a5ac7826755c390d052f`，284文件/4,884,521B，main2,097,108余44B/Sky1,420,659B；普通推送/绑定状态见CONTINUE，不拿诊断版本当普通。r91顺带对当前10.8°选中M51既有W3的native结果归ready-reveal证据，不扩大星数性能样本或采用新素材。

普通r92随后official auto_preview完成，fresh实看入口与手动仙王座夜空，无STAR诊断/复位按钮；已bind，bootstrap与旧r91反馈会话owner stop0。普通原PNG保private r92-ordinary-sky.png，SHA80c3c3c29e3062c8e28ac8b92c7266700c0ecbf592550bb5de24a81603fb209a。源码不存在cost helper/marker且两源精确恢复。该普通回交不新增双指/全场/物理峰证据；整个Goal与原33仍未完成，继续未闭模块。
