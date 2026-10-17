# 弹窗、名称、星数与全天星座

本批对应唯一PLAN的UX20/21/22/24/25/26；UX23固定方向已由用户取消，未改变相机/拖动方法。完整原话及最新独立图层建议保REQUIREMENTS。本批起用户没有手机，r322仍是最后实际手机普通版；不推送、不请求动作。原无法复现接管卡顿退出主动追查，历史FAILED/UNKNOWN不关闭。

## 当前实现与实际检查

- UX20：搜索、报告/目录说明和重叠选择共用`SkyOverlayMotion`，180ms中心缩放加透明度，反向退出保遮挡/输入/Back；重开反转、hide/卸载取消旧回调。覆盖下的搜索保持原挂载/草稿，失活查询及动作停用。`SkyObjectDialog`外壳和阅读区高度稳定，长文在内部滚动。r324相关行为32/32，r339当前客户端类型0。**目标运行时的加载撑开、实际动效/触摸仍UNVERIFIED**，没有用浏览器替代WEAPP弹窗。
- UX22/25名称：普通目录、目标/选择名称在当前对象正上方居中；完整字框、真实前景、同copy命中及上限沿原owner。共同160ms时间包络处理资格进退与反向，退出文字不供点击，成功copy才提交。所有退出候选重新投影当前身份；已出屏、不能容纳全字或不再有有效数据时诚实撤回，不冻结旧坐标/钳边。**因此几何上已完全离屏或实际遮挡的文字不能保证完成可见的整段淡出**；这一限度保持未闭，不冒称所有出界观感完成。r327名称/过渡/星座/弹窗26/26；r329 Canvas/生命周期/名称及实际Page消费者61/61；r339额外消费者35/38，其中两个旧换侧/广角退场断言和一个旧VM缺绑定已修，r340对应17/17。
- UX25标记：左/右/下三段，没有上臂和围绕圆。独立透明同层2D Canvas由原成功copy同步绘位置，CSS `opacity`负责1800ms轻微呼吸；没有新JS时钟、空闲Scene重画或背景缓存。只在有标记时分配backing，隐藏/无标记释放；原Canvas owner负责代次/故障/退出。可选层不可用时控制台记安全错误并保主图静态三段，不给错误提示。r329包含独立层、失败copy不移动、隐藏退休及可选层失败降级检查。
- UX24：已准入插画和线不再在宽视野统一退出，近景插画/名称原淡出保持，近景线的既有识别能力保留。真实非空Scene试验发现旧连线函数仍因视口超出前半球返回空；已沿同球弧owner保全天可见后半球、原自适应细分及视口裁切。新检查保证投影反极点两端不被错误地跨屏直连，局部原快路径与不可变弱寿命复用保留。r337相关25/25。

以上日志/前像均在`output/cloud-sky-native-updated-ide-2026-10-12-r1`，未覆盖失败代或历史包。r328消费者旧退出断言失败、r331/332旧广角等值/首样本断言失败、r339夹具问题均保原，不改为产品已通过。r334/335试验第一次是publication字段假设错误、第二次观测口命名错误；r336实际非空检查揭示连线广角缺陷，三者都保原。

## 实际软件渲染输出

复用真实公开新加坡城市地点（非用户物理位置）、2026-10-13T12:34:31Z、现BSC/固定星座出版和原PNG，390×844、DPR3。`observe-interaction-refinements-r334.mts`是一个可复现机制试验，最终r338运行结果/图在`output/playwright/cloud-sky-interaction-refinements-r338/`。源图片批量核长度与SHA，无新获取/加工/采用；实际调用生产Scene、GL、2D显示、名称布局与SCSS编译值。

| 视野 | 实际提交插画 / 线段 | 当前选中名称 | 原固定资源成本 |
| --- | --- | --- | --- |
| 264.4° | 72 / 1972 | 按原远景名称尺度退场 | PNG1,796,129B，72源RGBA逻辑41,484,288B |
| 45° | 5 / 64 | HR224原目录名正上方居中 | PNG187,906B，源RGBA逻辑4,456,448B |
| 8° | 0 / 6 | 正上方，原近景插画已退出 | 插画0B |

两张264.4°/45°实际图已各查看一次，非空星座、上方全名、三段无圈可见。CSS周期采样opacity为0.8/0.66/0.52/0.8；CSS变化期间主图像素不变，隐藏/退出两个显示backing均读回0。选中层DPR3全屏逻辑RGBA额外11,849,760B，只在选中时持有。**它比小View多一个显示backing，是保持高频位置绕过WXML而与copy同步的代价；不是零内存方案。**这些是浏览器软件GL/2D和CSS的实际输出/逻辑字节，未测目标原生合成、驱动物理峰值或能耗；16MiB现图片/GPU压力目标和3并发等原政策没有扩大，不能把压力目标冒硬上限或已验容量。

## UX21宽视野星数

先复用r87–r91已完成的10.8°同天区对照，不重跑未改变的局部曲线。已有BSC8404行、去重SAO254684行，总263088个真实目录身份；[Stellarium桌面官方介绍](https://stellarium.org/en_CA/)的默认目录大于60万，只说明总目录深度，不能推断当前在线版或同屏可见数量。尚无本次宽视野与在线Stellarium的同条件数量比值，不声称已达到同样多。

当前宽视野另一个明确差距是原5.8等显示下限：115°仅到5.8985等，尚未到现亮星目录6.5等深度。普通模式将宽视野下限保到6.5，45°和更局部原曲线不变；红光原5.8/局部深度保持，暮光、真实高度及原星点过渡继续负责实际可见性。没有引入新目录、虚构星点、许可付费或新商业条件。

复用`measure-star-density-r87.mts`的同一公开输入、HR224中心、1280×720/DPR1.25/115°；r330修前与r331修后在`output/playwright/cloud-sky-star-density-1014-r330-wide`和`...r331-wide`。修后实际图已查看一次。

| 统计 | 修前 | 修后 |
| --- | --- | --- |
| 原真实SAO候选分片 | 8 / 54,313B | 73 / 505,341B |
| 实际星点提交 | 1588 | 3002 |
| 同帧星点可点选快照 | 1292 | 2452 |

r331同一次30暖帧对照中，旧/新提交中位约1.4/2.9ms，p95约3.6/5.6ms，max约3.9/7.5ms；软件GL、固定视角、局部调用计时，仅证明新增真实点有对应开销，不是手机FPS或快速拖动验收。红光RGBA差0。全目录minMagnitude<6.5的候选上界115格/774,660B，仍小于原6MiB工作集；原loader3请求并发未改。r333星等/选档/过渡/点选19/19。**新增原生快速拖动成本、完整页面含银河/地景/其它纹理的总资源仍UNVERIFIED**。

## UX26源码对照

固定研究版`7d45c8fec393fbbabadcefa935794290fc39723d`，已有只读checkout复用，无新源码采用：

- [movements.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/movements.c)：拖动把屏幕射线反投影至mount坐标，球面方位/高度差更新yaw/pitch，pitch限制在±π/2。未见专门固定轴的天空/地景翻转模式。
- [landscape.c](https://github.com/Stellarium/stellarium-web-engine/blob/7d45c8fec393fbbabadcefa935794290fc39723d/src/modules/landscape.c)：同一地景随视线高度和FOV调透明度，朝地面以下看时变淡；不是另换一张“背面”图或专门翻转动画。投影、相机朝向与地景透明度共同形成参考效果。
- 本项目现`sky-landscape-visibility`也从当前画面中心射线取得真实高度，+15°至−15°平滑到0.18；参考在0至−45°变化到约一半，另有近景FOV项。具体参数/投影定义不同，不据静态图抄数值或承诺完全一样。**本批没有改相机/地景参数**；用户撤回的固定方向不复活。若后续实际新差异需要调整，按原owner与唯一PLAN的修订边界处理。

## 当前候选与未闭证据

r341普通本地未推送候选`interaction-refinements-current-clean`，slot`sky-phone-1012-r341`，SHA`6bd62564853300769dd8afb0a527176bafb6cb749e82d0d4a7b4339ff1015f44`，285文件4,916,849B；主包2,075,616B，sky1,474,479B，其余包不变，均过原包体限制。当前类型/构建/包体/编译origin/复制hash均通过；15项客户端当前输入与PLAN/原33读回归`r341-interaction-readback.json`。r341没有推手机、没有上传体验版/发布或部署，不能覆盖r322历史手机结果。

当时官方DevTools Skill同步current0.3.11，无reload；只读状态返回`loginExpired:true`，未进行业务调用或反复打开/登录。后续登录恢复后的有界模拟器结果见下节，不能从这一历史状态继续宣称IDE仍未登录。当前没有手机，iPhone仍缺。**本批独立审查已完成，范围和root最后夹具处置见[独审记录](interaction-refinements-independent-review-2026-10-16.md)**，本次已获得新的明确授权；审查发现的边缘提前消耗alpha已修并被只读确认，最后旧取点夹具由root修复、r346手势57/57，未冒独立复审。原33行LF无尾换行SHA仍为`d26d632c317699321250bed6ea91611b06ab6dfbb28575eca0200512cf6973d9`，FAILED/UNKNOWN/MISSING与图像冻结、未上线/容量依赖全部保留；本批不是完整Goal完成。


### 独审收口与修后当前包

名称字框的原16px带与ordinary wholeLayout point原边缘带均改为0/1资格，由160ms包络承担可见退场，保原阈值、当前坐标/尺度与退出不可点；红光旧point ramp不变。r343边缘回归修前fail，修后共同测试仅一个受新边缘带影响的旧scale夹具失败，r344将该夹具移到非边缘后9/9。r345名称/控制/目标/星座/手势96/97，唯一失败是旧侧向取点夹具；r346按当前全字框修取点并实际确认nameReference后57/57，其余40项结果复用。新选择层复用原四个手势handler，作为有限原生兼容保护，仍不认证触摸透传。

r347修后普通包interaction-refinements-reviewed-clean，slot sky-phone-1012-r347，SHA6a41b4c90dd23ea2161fed496845ed4b33b79b2c49c47d8ad29257086957d740，285files4,917,047B；main2,075,616B/content1,012,709B/spot354,045B/sky1,474,677B，原包体预算通过。最终类型/构建0，origin及构建原件/复制件hash一致。15项当前源码及现PLAN/原33归r347-interaction-readback.json；r341保修前。修后改变的是名称边缘及选择层事件接入，r338居中名称/标记和全天星座实际图对应未受影响的几何/样式结果，直接复用，不把旧图冒修后边缘或原生效果。没有新推送/部署/体验版上传。

当前唯一PLAN SHA35b9449db1c20b7ba8724524fb5ff01d169fb63ae3939a782ff7e800b7036ab2；仅在用户已授权本轮更新范围中消除旧“边缘可换侧”与UX25正上方的冲突，非按每次测试改方案。完整Goal仍有原生/物理/iOS、冻结图质/权益与真实外部环境缺证，不complete。

## r349–r361官方模拟器有界核对

官方CLI当前0.3.11/equal、`loginExpired:false`、CLI无需token；复用Codex客户端和已安装IDE。MCP一次project_list返回Bad Request，随后只用可用官方CLI，未重试失败传输。r347冻结项目在winId s3新开，15项源pin与复制包重新核实。r349 Map已实际显示，首个SDK启动timeout在截图后一次重读恢复；未重启IDE、清缓存或新开automation端口。

首次从Map导航时，Windows官方`wechatide.cmd`把URL的`&`拆成多个命令，实际只进入带spotId的错误页；命令exit1与部分成功保留。先读回当前页，才经现observer同样的官方Electron/skill-index结构化参数调用redirectTo，六个查询字段齐全且产品正常查询已把原PUBLIC_REFERENCE公共Context写回。该异常导航页仍显示不完整；随后正常navigateBack至Map再完整navigateTo，Sky实际启动。没有手动改storage、伪造登录/数据或重建API；没有新建Context。异常redirect后的未恢复只保该次观察，原因UNKNOWN，不宣称修复。

当前真实WEAPP Canvas显示星点、星座线和固定插画，但普通菜单/搜索/天体说明在截图中不可见，WXML却有有效几何和点击后的状态变化。r354菜单44×44、展开后aria-expanded=true；r355搜索面板366.4×580，left12/top152.9125；r357木星说明panel303×405、top208.5，body高347.025、header58，正文与“此刻位置／来源”实际进入WXML。这些仅证明实际布局/内容及部分动作，不证明视觉可用或加载前后稳定。r353/r354/r355/r357原图已实际查看，当前**simulator control composition FAILED，原因UNKNOWN**；它与旧记录现象相同，不能据此认定同一根因或排除新增图层。

动效采样原r356/r358的Promise结果被官方evaluate拒绝`An object could not be cloned`，r356点击已生效并进入木星，未重放该点击。r359改为有界临时getApp诊断，读取不到任何selector callback样本；随后明确清timer/移除自有key，r361读回key不存在。没有把0样本、工具success或class=open当180ms实际动效证据。r359关闭调用返回success，r361仍有1个木星说明、object phase=open，因此关闭实际结果**UNCONFIRMED**，不虚报已收起；未盲改产品关闭逻辑或重放输入。

一次保存的r322普通包对照先核SHA03eb616554d5a95568b7c3589cf763b59af82e61e923508235d6fbad6bd82004/285files，才打开自有winId s4。其启动图先为编译app.js、后白底tab；SDK两次报`getPageMetaByWebviewId`为null，限定error日志也只有该观察通道错误。没有得到同条件Sky，因此**NOT_COMPARABLE**，不能推断新增层没有引入问题。停止该轮并官方关闭s4成功，保全部旧包和失败；未进行CSS/渲染器排列重试。

最终[r361读回](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r361-simulator-closure.json)保存16张本轮实际已看PNG的SHA、15项当前源pin、r347包SHA、原33及PLAN不变、诊断清理和当前s3/page9。r347普通包仍未推手机，当前Sky是原公共2026-10-13 19:00、木星说明仍开且截图被遮，不能作为可用原生模态。本轮产品源码修改/产品测试/构建/素材加工均0，新增仅任务局部观测脚本和证据；旧有限软件/Android结果按原条件复用。**加载撑开、进退动效、选中层合成/手势、真实快速拖动与物理内存仍UNVERIFIED**；没有手机，停止重复不能消除该依赖的模拟器截图/脚本尝试。完整Goal保持未完成。

r362文档读回确认PLAN/原33不变、当前交接及r361链接可解析。本轮所改任务文档的`git diff --check`为0；全工作区检查exit1，报告本轮未编辑的`stellar-page-recovery.test.ts:183`、`deep-sky-image-client.ts:20`和`settled-candidate.md:34`尾空行，另有CRLF转换warning。保留这些文件及原dirty成果，没有为文档收口扩大产品修补或声称全库检查通过。

## r364–r368：宽视野暮光显示差距

依唯一PLAN UX21/13的“当前门槛、天光/地平/摄影点”责任继续补同条件宽视野证据。r359关闭未确认后只读核现disclosure/canClose/同Context owner，未找到足以归因的明确代码缺陷，没有重放输入或改关闭语义。手机/模拟器合成缺口不掩盖仍可独立完成的星数比较。

公开Stellarium官网由Browser现有插件开启自有IAB tab2，无账号登录。旧bootstrap误认为设置globals会产生agent；实际`setupBrowserRuntime()`返回Agent，应保存返回值后`agent.browsers.get('iab')`。本轮先用当前cua Browser创建页，随后改由正常browser-client操作同一tab，不另起浏览器/Playwright网页会话。没有读用户其它标签或个人位置；页面城市面板明示Near Singapore 1.29290/103.85470。暂停UI时刻2026-10-16 19:42:41（UTC+8），搜索Delta Piscium显示HR224/SAO109474；保持原120°，Canvas1280×720 CSS/1600×900 backing、DPR1.25。只作网页正常UI读取/点击，不调用隐藏engine/store、抽取外部目录或采用照片。地点面板Escape输入未执行成功，后点击当前同一公开地点的Use this location收起，失败保留，不猜为生效。

参考原图`r364-reference-wide-original.png`、坐标图/所选身份图及controls读回在原output owner，均已实际查看。目标软件Scene复用`measure-star-density-r87.mts`和真实固定BSC/SAO，用显式公开新输入`r365-reference-input.json`；新增countsOnly分支只画当前版，不重复旧30帧计时/红光像素测量。原观测脚本前像保留，所有新结果归`output/playwright/cloud-sky-star-density-1014-r365-wide`和`...r366-wide`。只读原PNG，没有重采样或加工产品素材；系统python缺PIL失败后复用已装workspace Python，未安装包。

生产Astronomy Engine的HR224 az82.182989°/alt21.986238°；参考UI为82°10′50.3″/+22°01′21.7″（参考折射/表达不同）。共同清空区取alt>20°、y75–440，排除工具栏/地景/刻字及Vesta；26个≤3.5等亮星位置峰值偏离median0.6937/max1.0599 CSS px，横向移20px的对照绝大多数只余低背景对比。这支持实际角覆盖匹配，而非只比较120°标签。共同ROI1046个已有目录身份的原像素局部对比（3px内峰值减5–8px环形背景），16/255阈值下参考329、修前108；其中224个参考可见身份因旧appearance门槛完全未提交。该统计仍可能含邻星/摄影信号，不是所有参考星点数量或新外部身份资格。

该时刻太阳alt−13.175699°，原暮光limit4.489875，导致已供4.x星直接被取消；不是星库数量不足。沿原共享appearance仅把普通航海暮光端点4→5.5，为既有四等星保原0.65等渐显带，后续仍连续到原FOV深夜门槛。红光仍4，日间/民用暮光和深夜边界、坐标/星等/B-V/高度透射、星点核/晕、缓存/并发不变；不把显示常数称物理肉眼星等模型。没有增加星库或许可/素材成本，没有改唯一PLAN。

新owner回归在修前8项7过1失败（4.9等点为null），`r366-before-regression.json`如实记录原终端未redirect，source/test前像完整。修后appearance8/8、选档/过渡7/7、Mini类型0。r366同场实际Scene提交317→1350、点选255→1088；SAO选片0→5/34,267B，threshold5.695950，原3并发/6MiB仍保持。共同1046身份16/255下本项目108→417、参考329；其中4.00–4.99的141身份，参考141、本项目35→141。新增107个ROI身份单独统计，不用修后1153分母冒修前1046。修后原PNG已看，弱星仍小点，未增新晕/摄影点。

参考不同测光/亮度和其余未匹配点仍保限度，不声称完整相同或更深；当前真实供给已能修这一主要显示缺口，停止扩目录。暮光阶段增加点数/请求不是零成本，完整Sky/真实手机快速拖动与物理资源仍未验，countsOnly没有新增FPS/CPU收益结论。旧夜间/红光/其它相同输入结果仅按未改变公式条件复用。新参数和实际输出由root核对，前次独审结束于r347，未冒已独立审查；当前普通包构建/身份与继续条件只见CONTINUE。

r368普通候选late-twilight-stars-clean已本地构建，SHA9cd39cba475e504a54e5298714e4d8e05a5fb79c8eff3945e9e1e4d7e9694ecd、285files4,917,077B；main2,075,616/content1,012,709/spot354,045/sky1,474,707B。类型/构建/预算/编译origin/复制hash和15项当前源pin由r368-interaction-readback.json读回，PLAN/原33 SHA不变，phonePushed=false。r347旧包和s3不覆盖新源码；没有在已失败的模拟器重试新源，也没有推送手机/上传/发布或新OCI。自建参考tab2已关闭，r368-reference-tab-cleanup.json持实际关闭回执。

用户随后明确允许本批只读审查。`twilight_display_review` 实际查看参考/修前/修后原图，只读联结共同1046身份，核共享规则、消费者、已有日志、源码及r368编译表达式，**未发现确定缺陷**；已结束且不复用，详[独立原结论](late-twilight-independent-review-2026-10-16.md)。独审不执行检查/构建/设备操作，因此原日志、r368及其形成时态回执不改写；本轮没有因独审无缺陷而重复测试或构建。该新结论补齐本次显示修复的适用独审，不覆盖原生动效/合成、实际快速拖动或完整Goal。
