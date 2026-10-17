# 资源就绪后的渐显

## r73–75：IR 原生寿命、一次加法和实际来源

IR 已撤掉页面独立 file/decode/request，复用现 Query、publication epoch、encoded/native loader、压力内保留和恢复。光学与 IR 只共用 ready-level 选择，保各自声明；当前 wanted 才下载，不为渐显请求隐藏粗档。旧 bitmap 不在新 decode onload 即退休。IR 沿原 RGBA/亮度/边缘 display alpha，在一次加法中混合原显示贡献，不采用 exact 光学 availability。首零准备无来源，粗档回执不继承细档 missing facts；memo frame 和 accepted 来源随实际档位/版次/原生寿命更新。失败重试复用原 owner 和 shader reset，不 resize 整个 Canvas。

四项 IR native owner、三项受影响光学消费者及实际 page 来源/恢复/调度检查通过。旧 request 和无生产消费者的测试退出，请求参数移回 artwork request owner。旧 page fixture 缺 mode/zoom/landscape、一次错误 module import、首 optional property 和 test callback narrowing 类型失败保原，已修；最终 `r73-typecheck-final-r3.log` actual0。前像/全部日志保原 output `r73-*`，不冒原生寿命全验。

固定 M51 W3 OVERVIEW/DETAIL JPEG bytes 经 manifest SHA 核读，21个 actual Scene/GPU 输出保 `output/playwright/cloud-sky-ir-ready-1014-r73`：cold0/细0/同图0、half、full/拓宽0全像素等对应baseline或上一档，半/全差非空增强，settled等旧原 W3 输出。共享shader exact分支23个受影响GL回归保 `cloud-sky-ready-levels-1014-r73-regression`，有效黑/alpha254/准备零/加法/上传失败保粗通过。已看 IR 原PNG。这是受控配准软件GL，不证明科学配准、图质、native HTTP/copy或物理成本；无获取/加工/采用新图。

r73普通入口已观察，r74仅构建保留。最终IR普通r75 `ir-complete-clean` SHA `07622f3edcef3ae4aa68596823edd527017ebc6bd600097105d1dc6acfa3c4ef`，284文件/4,879,992B，main2,097,108B余44B/Sky1,416,130B；build/包体/官方auto_preview actual0。守卫capture→实看→手动查看→capture实看星点/星座/完整Alderamin/四菜单，无错误；private `r75-ordinary-entry.png` SHA `5ed7354a133f5c1f8439494c35323a3c64b874cd1631078e3c2175e2b926f8d9`。已绑定新反馈，两bootstrap与被替代r71/r73反馈owner stop0；旧r68 EBUSY保PENDING。选中IR原生换档/晚到HTTP、phone bytes/AppID、完整UX07/性能仍未验，本轮独审MISSING。

## r76：HiPS mesh 就绪与透明同源替换

原mesh shader/texture准备接同一accepted-copy clock；单片沿原alpha source-over，JPEG拓宽只在粗档成功绘制且进度1才撤retained fine。PNG同源在原有有界work target上按ready progress混合premultiplied RGBA，透明fine进度0不清粗、进度1仍按原规则替换；无新缓存或辅助预算。group拒绝不冒图片失败，原独立fallback、source身份/出版/几何、普通商业HiPS关闭保原。

首GL夹具手写observation format/basis错误，两次全空被非空断言拒绝；改取生产常量/factory后第三次发现真实透明父片direct/MSAA→group边缘跳变（最大41/255），没有放宽零进度断言。现在ready消费者连续PNG source自单片起即沿相同group，细片0与父片全像素相同；仍为原一个source group的有界target。相对旧单片direct边缘差保记录（5,311通道/总11,128/max41），是统一原group路径的取舍，不称全旧像素不变。

最终26张Scene/GPU输出、源hash和脚本保 `output/playwright/cloud-sky-hips-ready-1014-r76-r4`：cold0、fine0、同RGBA两档0/half/full、透明fine0及拓宽0全差0；各半/全程非空，透明fine逐步撤粗，settled group/JPEG拓宽等原输出。已看cold-half/detail-zero/detail-half/transparent-half/wide-half原PNG。前三次失败目录保留。13项新/旧Scene初次12过、一个optional参数fixture失败；修为无虚构group语义后该项过；统一单片group后5个受影响行为再过。Mini initial类型实际0（后续同类型条件/fixture改动，最终合批再核）。软件GL不认证原生HiPS/HTTP/性能，独审MISSING，不重开供给或普通采用。

## 首个实际消费者

普通星座图案已接入共用`sky-ready-presentation.ts`和`sky-ready-artwork.ts`。资源就绪与当前缩放/几何目标分开：首帧只通过GPU原纹理owner准备，不产生图案像素或已绘来源；成功copy提交后开始160ms进度，显示alpha始终为当前目标乘进度。目标0.5时不先闪为1，继续缩放服从新目标，停止手势后由原按需writer结束，没有新常驻循环。失效/退出/reset拒过期提交，暂停不推进，减少运动直接服从当前目标；正常时间和pose变化不重启仍有效bitmap。红光沿既有路径暂缓。

GPU准备抽取原shader/window/纹理/错误/pins/压力责任；零像素PREPARED与真正PAINTED分开，失败仍由原caller处理。没有改图片、科学coverage、源alpha、缓存/下载或质量规则。其余注册图片与同源LOD仍未迁移，首路径不等于完整UX07。

## 实际开发检查

4条新状态/真实星座caller行为、2条受影响原consumer和最终Mini TypeScript实际exit0。真实产品浏览器GL用现有Cygnus PNG与受控有效registration，晚到首帧严格等waiting baseline；80ms产生非空图案、160ms增强，稳态同像且idle。撤回/重入、显式reset、未提交/retry、reduced当前目标成立；这是受控模型，不是实际PageHide验收。root已看late-zero/half/full原PNG，独审另看reduced。实际source hash、执行脚本、完整输出归[检查结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r70-ready-reveal-source-checks.json)，不重复已通过未受影响测试。

## 普通手机有界结果

r70普通候选SHA`9fbcee8d466b764fa1ccc598214cf3c0f735a2791927b35c7bf2305d3b0535b1`，284文件/4,880,372B；main2,097,108B仍余44B，Sky1,416,510B。build、预算/prepare、官方auto_preview和代理观察绑定实际成功；无诊断marker。这是普通预览交付，不是官方真机调试，也未独立读phone字节/AppID/FOV。

沿fresh截图守卫的一次可见手动入口record-tap，原PNG可见完整Alderamin、星点/线条/星座和四菜单。同一段168,652B手机录像有35个原编码帧；原尺寸1080×2376，SHA`6179b3a7796485535593582fbf61fc310f91d87a7b82dc700279cf1ad4778c4c`。先看n4/13/27后从同段补取n14/16/18/20/22/24/26：右侧人物在PTS3.565244无明显图案、3.697989微弱、3.830378增强、3.980467近稳态，所见星点/线条位置一致。root和独审分别看了对应原帧，无新采样。

FFmpeg实际exit0但有两条non-monotonic DTS警告，原输出保留；最大编码PTS间隔2698.611ms不当应用FPS。这些像素不证明下载完成时刻、精确160ms、真实快速缩放后的半目标迟到、完整恢复或整体性能。原媒体只留私有runtime；[原生记录](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r70-ready-reveal-native-result.json)持有hash与观测边界。

## 独审与收口

`sky_ready_reveal_r70_review`只读复核六前像/当前源、实际GL与四原PNG、普通原PNG及上述同段原帧，无阻塞发现，完成即关闭。它未操作手机或重跑检查。r70 bootstrap与被替代的r66 feedback按owner停止实际0，媒体已保全；当前r70 ordinary保持暖会话。r68诊断目录EBUSY/持有者UNKNOWN清理仍PENDING，不盲重复或宣称全部owner清完。

具体过程归[收口记录](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r70-ready-reveal-closure.json)。原33历史行逐字相同；图像冻结、红光暂缓、其它注册图片/同源LOD、完整UX07、时间/四树、跟随微抖和整场性能保持原失败/未验。完整Goal仍active、无预算、未完成，下一实施仅沿唯一PLAN和当前交接。

## 受影响页面检查补齐

两项实际page恢复检查初始失败于测试夹具缺新增`readyImages`，修共享绑定后又暴露旧partial Canvas view缺`occlusionInsets`；改用真实`resolveSkyCanvasView`与明确零遮挡后，一项旧立即名期望仍不符合首copy渐显。恢复测试使用已有的即时呈现输入，继续严格验证非空内容、来源、FOV/高度、隐藏/resize/remount/异常与accepted替换；最终两项actual exit0。普通渐显时序由上文状态/真实caller、实际GL/手机原帧持有，不将即时测试冒普通时序通过。前三次失败、修复与source hash保[页面跟进记录](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r70-ready-page-followup.json)，不改生产行为以迁就夹具。Context结构校验actual0只核manifest路径和控制声明，不认证产品。

后续注册图片迁移已有明确边界：IR旧bitmap在decode成功替换时退休，逐图从零会撤粗空闪；exact光学同源组先选一次有效样本，再合成与记录真实贡献，不能把细/粗各自乘alpha叠加。下一在原native寿命与composition owner完成一次真实细档保粗/来源链后批量适配同类，不逐对象复制开发流程。图像、额外软件套件和r70普通手机包本次不再重复。

## 同源两档实际消费者

r71已把明确意图的exact Prepared/science/display和独立REGION调用接回同一进度/原GPU preparation与composition责任。GPU在原pinned纹理准备后提供可在当前视口采样的字段资格；共享clock proposal只有该字段实际准备/绘制成立才接受，首成功copy提交定起点。已有parent不因新fine到达重启；片元以同源显示权重生成一个颜色，再作一次原source-over或线性加法。有效黑仍排除coarse，原四邻完整alpha、科学资格和原native wanted/两档/保粗/版次/Canvas退休不改。准备态无来源信用；实际完成回执分别记录显示的fine/coarse组件。

独审发现第一版将“全部离屏”与“可见首帧零进度”合并，可能错误压住更宽红外图层。已修为离屏继续原实际draw/完整EMPTY资格，且不接受clock；可见零准备保自己的谱系而不借另一谱系闪入。新的实际Scene回归和同批产品GL均确认区别。首新夹具的静态draw引用不符动态receipt、完成空receipt误期望null，以及host检查中错误entry-prefix/PowerShell日期解析保真实失败；按实际原spawn修正，API同PID/创建时刻/仓库/listener与ready200，未重启。tap actual0不返回截图，首次包装器尝试undefined view失败后按命令契约fresh capture，没有重复输入或放宽守卫。

新增3个真实Scene边界、3个受影响既有准备/回退边界、4个受影响共用clock/星座行为及最后Mini类型实际通过。23帧实际before/current产品GL采用16²受控RGBA及有效登记平面，没有加工或采用天文图：late0等baseline、半/全非空增强；detail0全像素等parent，随后细节增强，稳态等原渲染；同图两档三阶段全像素不变；有效黑资格fine.has/coarse.empty且无图片贡献，254alpha保粗；全部离屏实际三EMPTY且idle；半目标进度0.5等原目标0.25；线性加法同源不双亮，独立fine上传异常保coarse。主代理与独审均查看原PNG，绑定代码、前像和执行脚本。该试验不供应科学/天文配准、实际HTTP、WEAPP或物理性能证据。具体source、首失败及checks归[r71检查结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r71-ready-levels-source-checks.json)。

r71普通包SHA`d66de7e2a783899cd5ea0105778e620b4f862ba8b495e44122e0ea718aa2f9d5`，284文件/4,882,387B；main2,097,108B仍余44B、Sky1,418,525B，build/预算/官方auto_preview实际成功。01:39普通原PNG显示星点/星座/完整Alderamin/四菜单，无错误或marker，独审查看一致；绑定只记录代理观察，不独立验证phone字节/AppID/FOV。普通Prepared仍空、HiPS关，入口静帧不能认证手机同源两档、迟到HTTP、动画时长或整场提速。具体[普通原生结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r71-ready-levels-native-result.json)持有私有PNG hash与边界。

`sky_ready_levels_r71_review`核源/九前像/实际GL/7原PNG及普通构建指纹和原手机图，除上述已修离屏问题，无剩余源码阻断，完成即关闭。它未测试/构建或操作手机。bootstrap和被替代r70 feedback按owner退出actual0，当前r71 ordinary保持暖会话；旧r68 EBUSY目录仍PENDING，不宣称全部owner清完。IR/legacy cutout、HiPS、完整UX07与性能仍OPEN，原33历史行逐字保持；继续同一active/no-budget Goal，不重做本批。

## r72：legacy JPEG 原source-over消费者

实际Scene分支迁入同一drawSkyReadyArtwork。与exact PNG的availability/一次组合不同，旧JPEG原opaque source-over本已覆盖parent，故保其原pass/edge/source alpha，不新写renderer或加法分组。coarse消费原bitmap时钟；冷图PREPARED阻断短暂W3却不获得来源；拓宽新parent有非零半透明也不能撤已绘fine fallback，待parent进度1才退出旧fine。注册/视口/native current/后景地景/finish与accepted copy来源责任保持。

新增3实际Scene行为在改前957a06实际失败3/3；修后8c7658实际0，合计新3+受影响旧5。首次Mini类型139b92真实exit1，是assert.deepEqual空数组使新test类型缩成never；改等义length断言后4dd5a4实际0，生产未迁就fixture。共享clock/GPU/exact组未改变，不重跑旧r70/r71或其他未受影响检查。

实际Scene/GPU脚本b89735实际0，output/playwright/cloud-sky-legacy-ready-1014-r72保存实际脚本、before/current bundle、结果与21原PNG。512方形opaque生成夹具只验证显示机制，不是新天文图像或测地配准。旧冷图相对baseline非空4,059,464通道总差；新冷0差0，half2,029,748/full4,059,464。细0等parent，half1,628,708/full3,257,384；settled等旧r71原全亮像素。相同RGB两档zero/half/full全差0，不双亮。拓宽zero保原fine，half扩外部且原fine保绘，full等旧原widen全亮；所有相关W3来源null，cold0没有optical来源。root实看九原PNG，独审实看八；不作实际HTTP、原生copy、质量/FPS/物理性能推论。

sky_legacy_ready_r72_review限定核源/实际GL后无阻断，已关闭，没有运行测试/手机；类型当时仍在途，最终成功由root真实过程记录。当前普通手机仍r71，生产源比候选前进一步。用户此时明确转四点调研/唯一方案修订/交接，未开始下一实施批或外部推送。legacy原生/迟到HTTP以及IR兼容owner的decode提前退休、HiPS、完整UX07和整体性能仍OPEN。source-checks/closure与所有首失败保output/r72-legacy-ready-*.json，原33行逐字未改。

## r91：选中M51的既有W3原生首显示（2026-10-14）

沿已绑定r91诊断候选的现有10.8°视场，只走公共探索输入M51、资料与定位；没有新增图像或更改其源像素/供应。实际中文资料、M51/NGC5194身份与地平以下提示可见；按同屏“定位到星空”按钮录6秒，方位327.7°/高度−6.6°、真实目标视角进入。根读终态原PNG，M51 W3图的亮核与下侧低亮结构实际非零，同时有NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像说明。光学层明确显示“M51光学影像不可用 · 重试”，失败不因红外可用升级通过。

原媒体只在private runtime：r91-ir-locate.mp4（68编码帧/341,037B）和r91-ir-locate-settled.png；元数据见output/cloud-sky-native-updated-ide-2026-10-12-r1/r91-ir-locate-video.json。已实看原抽帧003/004/009/011/014/015，以及另从同原视频抽出的实际n14/n17/n20（3.721022/3.810989/3.910011s），最终4.002156s原帧。当前字段从正在载入/空目标环到弱非零，再至较亮核及扩展结构，支持该既有M51首显示的有界native渐显；没有量化完整alpha轨迹、全部帧、迟到HTTP或粗细换档。最初编码PTS缺口3,010.9664ms不当app长帧/FPS。HUD留的是先前恒星拖动统计，不作为IR成本；诊断遮挡上半屏也不当普通组合验收。

候选为STAR91MEMO，源已在构建后精确恢复普通r90；这不是ordinary-preview全路径、原生物理pinch或完整IR/HiPS图片族验收。HiPS普通仍关、来源权利/质量/剩余native等原义务保持；独审MISSING。下一普通回交归当前CONTINUE，不重跑已成立的共享GL/类型批次。
