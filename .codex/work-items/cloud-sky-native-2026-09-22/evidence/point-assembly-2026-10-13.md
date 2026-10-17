# 广角星点与图像成本

## 纹理内部调用与同帧操作

r68只扩原observer，计时限定active artwork lookup；原GL调用位点/次数/顺序、4处getError、参数/短路错误谓词、copy catch/finally、预算/pins/科学/质量/credit保原。以同Scene TOP绑定实际post-call upload/copy尝试、hit/miss/覆盖/copyreuse/淘汰与finish后整个Map名义RGBA；无per-star/arc/texel时钟、无新增GL query。首full/crop按对象身份的计数错误经独审指出，按坐标/尺寸修正；首scope/source及未推手机r68构建保原，修后类型实际exit0。修正只涉及诊断计数，不是产品优化。

r69/TEX68Q SHA c6e0e701f52ba7edf490f09f9fc77548e69a32646b06735cdf54251134813e71，284文件/4,888,190B，main余44B/Sky1,424,328B。2026-10-14 00:00一次暖90°/1000ms横拖，实际已绘首尾仍2026-10-13 19:00 UTC+8、太阳−14.961460984888506°、Canvas384×796.800048828125/center192,398.4000244140625；basis真实变化。115moves/192requests/72frames/74pages/span986，gap均14.67/p95 26/max28ms，body均7.68/max19。没有与r67精配中间视图，不能从差值宣称收益。

**TOP1 body19/artDraw14/a_texture12/t_uploadErr12：长lookup主要在原上传后getError的12ms调用墙钟。** 同TOP artwork hit12/miss1，upload尝试1、源1,048,576B、最终full1、endB20,774,912/15项；无正coverageMiss/reuseCopy，不能把它当已证实的反复裁片重建。upload与copy调用各显示0ms，priorError/copyError各max1；0ms受整数时钟限制，不是零GPU代价。t_drain为dash无样本，不写0。其余全部指标、TOP与实际PNG hash见output/r68-texture-steps-result.json。

finish后Map名义RGBA最大22,511,616B/均21,119,886.22B（约21.47MiB最大），是实际当前resident集合模型，可因既有当帧保护超过16MiB压力目标；并非物理VRAM/整机或upload/copy临时峰。操作是原调用返回后、错误检查前的尝试；未从舍入均值推总数。t_*与TOP a_*是同Scene合计，per-call指标是独立调用，嵌套量不相加；提前throw的step可缺末端计时，缺值不代表0。一般WebGL的[MDN指导](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)说明getError可能同步flush/round-trip并需保分配失败检测；本机微信原图仅证调用墙钟，不确证驱动/GPU内部因果。保原错误恢复，不以盲删检查或扩大预算换指标。

源码及两张完整1080×2376原图/所有可读转录、五源精确恢复/transition/helper退休、00:04普通原PNG均经sky_texture_steps_r68_review独审，修计数后无剩余源码/转录必修，结束即关闭。复用同r66 prepared官方回交实际0，无重建已过普通；星点/星座/完整Alderamin/四菜单/noTEX/reset可见，普通FOV/手机bytes/AppID/动画/整场性能仍未验。两个bootstrap stop0。诊断feedback的deviceSession已null，目录两stop均cleanup_pending，官方close失败；原owner无defer诊断证实EBUSY/rmdir project，持有者UNKNOWN、临时generation保原，**清理仍PENDING，不冒全部owner退出**。原33逐字保持，原失败和本轮过程在output/r68-texture-steps-{typecheck,scope,result,closure}.json及cleanup记录。Context/唯一PLAN未改；性能仍开放，按原B/E推进真实就绪后的独立渐显。

## 星座阶段的有界归因

r67只沿原r65 observer添加整调用观察：星座image loop/原line geometry/原segments queue，GPU artwork的parameter/flush/program/window/texture/raster/submit，以及原GL调用返回后的上传/copy计数。没有per-star/arc时钟或新GL/error查询，保原采样/过滤/质量/压力/pins/异常/信用/退休/同present后输入stamp。`c_art`包括attempted loop/失败回调；`a_*`是每GPU artwork调用，包含同owner的其它registered cutout可能，不能无条件全称星座。`c_segments`主要测顶点入队，也包括原kind-changing flush，原线提交仍可能在stars中。

首helper `typeof`初始化为null的变量被类型查询收窄，TS2322实际exit1；首scope/helper/generator和实际失败保原。仅改显式共用TextureCost|null后，Mini TS5.9实际exit0 chunk7264ad，空输出不当日志或成功证明，见output/r67-artwork-cost-typecheck.json。源码限定独审核五前像/六probe/current hash、原GL次数/顺序/错误消费和异常finally，无必修，才进入这次目标观察；没有重跑已过其它检查。

r67/ART67Q包SHA c4888ad0684d73ff1520728f6361f51dd4f2dfcae8f0e9e7eb9f18689e6e4cc6，284文件/4,887,207B。23:22一次暖90°、原归一化1000ms横拖，115moves/198requests/78frames/79pages/span981ms，gap均13.57/p95 21/max24ms；Scene均7.13/max20、body7.10/max20。实际已绘首尾均19:00 UTC+8、太阳−14.961460984888506°、FOV90/Canvas384×796.800048828125/center192,398.4000244140625，basis真实变化，四位显示不冒精确逐帧一致。

星座阶段artDraw最大16/均2.86ms，image loop `c_art`15/1.18，line geometry2/.92、segments queue2/.74；原676条lines，输出segments均221.58/max236，attempted images均14.00/max16，不是成功呈现数量。最长Scene body20ms中artDraw16、c_art15、a_texture合计14；单lookup a_texture最大13/均.02。其它per-call parameter/program0、window/raster/submit最大各1。**这次长尾在纹理取得调用，尚未区分原error读取、淘汰/释放、upload/copy或运行时停顿，不叫纯GPU或上传时间。** `a_draw`含原scissor/submit/颜色与uniform组装，不含finally或GPU完成。

logical per-lookup上传/copy最大各1，上传bytes最大1,048,576/均1200.29，copy最大983,040/均2850.70，返回单item resident最大1,048,576/均758,555.27B；这些是原调用返回后的名义量，不是成功传输、整个工作集或物理VRAM。TOP没有操作counter/源身份或未舍入总数，不能把单lookup13ms与这次upload/copy直接绑定、从均值.00猜总数。a_* TOP是同Scene相加、per-call max则是独立调用；嵌套量不重复相加。0ms有整数粒度，原180ms尾段与诊断开销保留；本批没有产品优化，不从均值或间隔变化宣称提速/FPS或完整验收，也不关闭少星或旧未知时刻。

两原PNG/输入/阶段全字段与hash在output/r67-artwork-cost-result.json。`sky_artwork_cost_review`实际看两张1080×2376原图、逐项核所有可读转录/TOP/logical/四位basis，无转录必修；核五ordinary源精确恢复、transition hash保持、helper归档退出及23:30普通原PNG，同样无必修，结束即关闭，没有改文件/重采/测试/操作手机。官方回交与三个owner stop使用root实际过程证据，不冒独审执行。

五普通源按r67 clean前像逐字恢复r66，保r65 canonical、r62快照等成果；复用同r66 prepared官方回交actualexit0，没有为取证重建已过普通。23:30 fresh画面有星点/星座/完整Alderamin/四菜单，无ART/reset；普通FOV与phone字节/AppID仍未独立读取，静帧不证明动画或完整性能。两个bootstrap/诊断feedback均owner stop0，新bind的普通/API保留，源/归档/原图hash及原33逐字guard见output/r67-artwork-cost-closure.json。Context/唯一PLAN未改，本批只有取证；下一有界问题在当前纹理owner内细分并关联同一长帧操作，不能盲推新驻留策略或弱化原错误检查。

## 银河固定采样窗与连续拖动

r65在原`createSkyGpuTextures`内采用`getPanoramaWindow`：源RGBA单独能落入既有16MiB压力目标时保完整texel作为canonical窗口；该选择只依immutable尺寸，不随其它resident或当帧headroom摇摆。较大源仍用原量化exact crop及相对copy；唯一真实galactic caller已迁，旧getExactWindow退出。原文件/解码/身份、当前frame pins和合法working set、错误/失败锁、退休/释放、shader/过滤/几何/资格/credit不改，没有新缓存、预算或质量降级。full源驻留比裁切大，该代价明确保留。

5个受影响owner行为（小源移动/压力/冷返回、失败锁/退休、context loss、大源相对copy/静止/冷返回、copy失败原坐标）通过；普通Mini TS5.9实际exit0。诊断临挂后另一次受影响类型actualexit0；5检查/类型真实command/chunk和三前像/当前hash见output/r65-panorama-source-checks.json，空输出不当日志，已过其它批次不重跑。

任务脚本将完整实际product renderer/texture和两前像通过esbuild+TWGL执行在配置SwiftShader的浏览器WebGL；实际renderer字段只有WebKit WebGL，不独立确认后端。两冻结bitmap逐字核manifest hash，没有下载/加工/采用新图。共同local/moved/seam/pole/filter/dome六视图保真实validBasis、实际图片credit、原GL错误和readPixels。移动后返回同local、hide后GPU冷重建均逐通道差0、隐藏/最终texture逻辑分配0；**不是重新解码、完整page或WEAPP/物理验收**。返回local后的旧上传/copy6/6、新1/0（六视图末旧为6/5），孤立逻辑临时峰11,010,048→8,388,608B，不冒整场/物理峰。新旧IR最多7、光学3个通道差1级，其余原字段保留，不能称新旧像素完全相同。实际四代表PNG经root/独审查看有原源内容，没有本批新增明显接缝；全图质未闭。

首脚本fixture错误地用right×up=forward，实际validBasis拒绝，图片尚未上传且没有有效输出；是harness失败，不冒产品/性能结果。首script/bundles/failed保output/playwright/cloud-sky-panorama-window-1013-r65，修正handedness并加实际前置后-r2通过。脚本及24PNG/result在output/playwright/cloud-sky-panorama-window-1013-r65-r2，shared规则两源批量执行，不扩旧矩阵。

22:46 r65/PAN65Q一次暖90°/原1000ms归一化横拖：已绘首尾19:00 UTC+8、太阳−14.961460984888506°、Canvas384×796.800048828125/center同r64，SAO0、eligible均172.28（r64 172.37）。first accepted四位basis略异、last四位同，中间不是逐帧精配。111moves/185requests/69frames/71pages、span982ms，gap均15.37/p95 34/max40ms。银河max2/均.42ms、texture显示0/0；暖移动期间上传/copy及名义bytes均0，resident固定8,388,608B，比r64裁切最大3,932,160多4,456,448B。SceneBody均7.42/max18（r64 9.52/max30）；仍artDraw14ms长尾。各一次顺序有界样本只支持此场景避免重建及银河调用长尾下降；整数0不是免费执行，计时含原180ms尾段/诊断开销，不证明FPS、统计置信、整场流畅/物理峰。原嵌套阶段不重复相加，少星问题及旧未知时刻不因这组暮光关闭。

全部原图hash/输入/阶段/逻辑量见output/r65-panorama-native-result.json。独审发现TOP3漏录landscape:1，已补，首JSON/record脚本保原，不重采。首次record strict字符串断言失败：root前用PowerShell改r64 review时ISO `.000Z`被序列化为`Z`；同瞬间归一化中间保原，按原PNG/first精确字符串恢复，时间未变，未重采或重跑类型。这个修复不回填其它历史样本。

四普通源按r65 clean前像精确恢复新policy，transition hash保原、helper归档。r66/panorama-policy-clean build/预算/官方auto_preview实际成功：SHA586919c433b4c84ec0f61913683f1ffe90d38fd5c81dad819f1910d68ab3e0ac，284文件/4,878,828B，main2,097,108B余44/Sky1,414,966B。22:52 fresh普通PNG有星点/星座/完整Alderamin/菜单，无PAN/reset，普通FOV与phone字节/AppID未独立读取。两个bootstrap及旧r63 feedback stop0；r65 feedback首stop cleanup_pending保实际exit1，读回deviceSession已退出/清理pending后原owner第二stop0，根因UNKNOWN，不冒根除。新普通/API保留，详output/r65-panorama-closure.json。

`sky_panorama_window_review`只读核三前像/current、消费者/源码、scope、实际GL及原手机/普通PNG、修正转录和恢复，无剩余源码/输出必修，结束即关闭；清理结果由root真实收口而非独审执行。Context更新当前canonical规则/代价和重评条件，不复制这些样本数字。原33行逐字保持，无障碍已取消，图像冻结及全名称/迟到包络/连续时间/跟随/整体性能等原未闭不升级。

## 银河纹理路径的有界归因

r64/GAL64Q只在已接受的Page/Scene/GPU observer上加入银河parameter、flush、window、texture、setup、submit、error时钟，以及原上传/copy返回后的逻辑计数。Scene的实际frameAt/太阳/FOV/Canvas/basis/center只在present成功后接受；原GL次数/顺序、窗口、预算、资格、shader、credit与释放保持。生成首ReferenceError在任何生产写入前；首次类型新增lastInput重名的5错误保原，分离lastStamp后Mini TS5.9实际exit0。空输出未生成r2日志，以实际chunk335500为证明，不为补日志重跑，见output/r64-galactic-typecheck-result.json及scope/首失败。

22:09一次暖90°/1000ms(.25,.52→.68,.52)实际横拖，已绘首尾时刻均2026-10-13T11:00:00Z（19:00 UTC+8），太阳高度−14.961460984888506°；这是暮光输入，不回填r61/r62的未知时刻或以此关闭少星问题。Canvas384×796.800048828125、中心192/398.4000244140625及90°不变，basis实际变化，四位显示值不冒逐帧精确等价。原图112moves/177requests/60frames/60pages/span976ms、gap均18.37/p95 32/max38ms、Scene均9.57/max30、body9.52/max30、catalogLoop2.27/max4、eligible172.37/max178、SAO0。

银河最大24ms，其中getExactWindow调用最大24/均.78ms；窗口最大1ms、submit最大1ms。两个body30ms的TOP分别g_texture20/24ms，第三body19ms主要artDraw13ms。逻辑上传/copy单帧最大各1，名义上传字节最大8,388,608、copy/resident最大3,932,160；这些是原调用返回后、错误检查前的次数/字节，不能冒成功传输或物理VRAM。没有逐TOP操作次数或聚合总数，不从四舍五入均值推算。g_*嵌在galactic/flush内不重复相加；texture边界含查缓存、淘汰、错误读取、上传/复制和运行时停顿，**只定位调用耗时，不证明纯上传/驱动/GC因果或优化收益**。

全部阶段/输入/原图hash在output/r64-galactic-cost-result.json。独审原图发现native available updates首误录55，已修53，首版结果及record脚本保原，未重采。`sky_galactic_cost_review`独立核source/hash/GL语义、类型记录、两原图/修正转录、精确恢复和普通回交原PNG，无剩余必修，结束即关闭；不是整体性能验收。

四生产源精确恢复r63，星点新transition hash保原，helper归档退出；不撤销r58/r59/r62成果。复用r63 prepared官方回交实际exit0，22:23 fresh原图可见星点/星座/完整Alderamin/菜单，无GAL/reset；普通FOV与phone字节/AppID未独立读取，静帧不证明动画或帧时。两bootstrap与诊断feedback均owner stop exit0，新普通/API保持，见output/r64-galactic-cost-closure.json。原33行逐字核同，图像冻结及其它失败/未验保原。本批没有产品优化，不重做已过检查。

## 过渡快照的局部优化

继续原主循环的已定位责任，本批只改`sky-star-transition.ts`的retarget：将每点逐属性spread辅助复制改为运行端已有的原生`Object.assign({}, point)`，随后覆盖本帧opacity。真实Scene的catalog/supplement两处输入均为普通固定键对象；保持独立浅快照、可选magnitudeBand及缺值，保原160ms/实时反向、暂停、Context/层身份与精确时刻失效、revision/reject/reset、退出重新投影且不拾取，以及成功present后commit。没有直接保留/改写caller point，不加池、缓存、队列、节流或新loop，不改变科学/可见资格。普通Taro产物实际保留该Object.assign调用。

先在生产未改时做有界测量：AST/TS提取完整原owner及仅该替换proposal，经现object-spread Babel变换，在同一VM中计时；真实BSC8404行/明确非手机30°N120°E observer的一视图591非空可见点，输入在计时外构造。12步的显示输出、进入/退出/反向/移动/暂停/换时刻/减少运动及可选字段、输入修改后的快照隔离等价；17交替配对×32帧的本机暖过渡中位2.87199→.69658ms。只包含这个载体的transition处理，不冒完整Taro/GL/copy/手机/FPS。原型、前像、hash和实测原样保存于output/r62-star-snapshot-{before,proposal}.ts、r62-star-snapshot-measurement.json；不重跑已过组装/投影/文字或旧批次。

实际修改后3原transition owner检查及1受影响Scene退出/拾取检查通过，Mini TS5.9进程34634完成exit0，空输出不能单独作证明；准确进程/command/chunk保r62-star-snapshot-checks.json，不再编造日志路径。`sky_star_snapshot_review`只读核源码/两真实输入、接受/重置/退出消费者、前像与数据hash和同realm/非空测量，未见必修；拒绝/reset/失效沿原owner测试，测量未冒覆盖全部机制。代理完成即关闭。

## 本批Android单次观察与比较限制

r62/POINT62Q的Page/Scene/GPU/helper逐字复用刚完成的r61 observer，只有transition生产owner新改；包SHA0a35167ebe78edae5a1384d067b5ae418a7eecbcb6c49474911f5636406ad435、284文件/4,883,483B。21:13实际暖90.0°后，同归一化1000ms横拖输入已发送，原图为113moves/194requests/74frames/78pages、span976ms；Scene平均7.73/max29ms、body7.66/max29、主循环2.12/max4、银河.91/max23、artDraw2.76/max9、线/点flush.49/.07ms。全部原字段/两个私有PNG hash及输入命令证据定位保r62-snapshot-native-result.json，span与请求手势时长分别保留。

**这次与r61不能作收益比较。** 原主表输入仍8404，但当前eligible179/172.27、SAO input0，对照r61的654/638.28及479/416.04，原图天体位置/密度也明显不同。同query/page/API/reset90°已核，并不证明同实际时刻、太阳准入、视图与工作量；这些输入未捕获，原因保持UNKNOWN。eligible++在transition.point前，科学资格规则没有因本批copy替换而改变；不据此把未知写成时刻根因或宣称减少星点修好。拒绝将5.22→2.12或11.62→7.66当本批手机收益，不按点数线性校正，不重跑旧样本凑通过。整数call-wall/180ms尾段/嵌套线flush及观察开销仍不证明物理FPS；29ms body中的23ms银河长尾仍未闭。

`sky_star_snapshot_native_review`独立查看r61/r62四原图、核两个新PNG hash及全部转录、source恢复和helper归档，确认上述比较不合格，无新转录必修。1000ms仅来自root命令记录，不是独审看图证明；普通回交不在其复核范围。完成即关闭，没有改文件、重跑或操作手机。

三临时生产源按scope逐字恢复，诊断helper已归档/退出，新transition保持。普通r63/star-snapshot-clean build/预算/官方auto_preview完成，SHA daa57b9e2af8c971989226f6d9c721d42c92d6e75e41f5d5214c0a9d3e4fa22e、284文件/4,878,747B，main2,097,108B余44B/Sky1,414,885B。21:27初始和21:32横拖后原图实见星点/星座/完整名称/菜单，无POINT诊断控件；普通FOV、phone bytes/AppID未独立读取，静帧不证明160ms动画或完整性能。两次普通横拖因capture过期在发送前拒绝，安全字段readback为age60218ms/非未来；随后将capture与实际查看合于一exec减少间隔，在原60秒守卫下成功发送/捕获，未放宽规则，延迟根因不冒根除。两bootstrap、r62诊断feedback和旧r59feedback均owner stop exit0，保存四新原图于原私有API owner，新普通/API保留，具体见r62-star-snapshot-closure.json，当前会话只见CONTINUE。

原33行逐字核对未改，PLAN未改，无障碍功能按最新用户撤销，图像冻结/红光暂缓及所有历史失败未验保留。手机收益、银河/插画长尾、其它UX05–10和完整Goal保持未闭；下一实际性能观察须绑定真实绘制输入，不能把某query当同一天空。

## 固定字段组装

沿r56已经定位的原主星表循环继续排查，不重做星座文字四样本、原RAF/CSS尝试、已过图像或不受影响的检查。当前普通Mini编译产物实际显示：每个可见星点的Scene对象使用object-spread helper，GPU disc顶点使用push.apply/concat及array-spread helper；这些临时组装属于原8ms循环的一部分。具体它们占手机多少时间尚未分离，不能把整个8ms归给它们。

本批仅将catalog/supplement的已知radiusPx/opacity直接写入原星点对象；paintStar按原真实可选magnitudeBand赋值，缺值仍缺；GPU disc在原use(points)之后读取同一颜色缓存，把原9字段直接push。原星表遍历/坐标/视场/亮度/大气/星点过渡、来源、退出不可拾取、profile/着色器、Float32布局、GL批次/flush/错误顺序不改，不新增缓存或降低图质。前像及现源码hash见output/r59-point-source-scope.json与测量记录。普通新build实际已编译成9固定值push，不再在disc中构造spread参数数组。

任务提取器AST读取实际保存前像与现catalog/supplement/painter/disc/颜色代码，经本机已安装的object/array-spread Babel插件隔离组装。真实BSC v3/8404原对象行，由明确非手机的30°N/120°E observer生成方向；3个视图实际226/591/2576组装、pickable226/499/2039，Float32顶点/对象/名字深等和不显示/拾取阈值/波段缺值/两profile/颜色失败等共3430次比较成立。首运行错把原BSC对象当wire tuple，3视图空且仍退出0；该结果为**无效性能证据**，原JSON/log保留，修为真实字段及每视图非空前置后才采样。

r2在不同VM realm中接受宿主对象，只支持该提取器的机制对照；sky_point_assembly_review指出跨realm会放大旧helper开销，不能外推Taro/手机。随后仅改测量载体，使两个实现与计时输入共用一个VM realm并在计时前创建输入，r3保持3430等价：17交替配对×16组装帧，本机local中位1.3492→0.0853ms、wide3.1539→0.2208、dome13.5743→1.1167。此为隔离组装CPU，不包含扫描/投影、transition、完整Taro、GL/flush、copy/页面和物理资源，不能报成手机倍率或整帧收益。r2/空结果与其条件保原，不混同比较；r3载体调整在上述独审后由root完成，未新增独审背书。

普通Mini TS5.9实际进程exit0、受影响diff通过。sky_point_assembly_review只读核两前像/现源码hash、缺值和消费字段、色缓存/9顶点/错误批次顺序、3430比较计数及上述证据界限，无生产必修项，完成即关闭；未操作手机、改文件或重跑旧套件。

普通r59/point-assembly-clean，SHA f0fb8d3e3530c7a30d89f9ba8b3b25af717f38e8ea46c40d3ff19d13d237ec7c，284文件/4,878,745B，main2,097,108B余44B/Sky1,414,883B；普通build/预算/同账号官方auto_preview完成，无诊断marker/helper，合并r58名称结果。20:05–20:06 fresh逐次实看并进入手动45°初始和一次1000ms横拖，真实星点/星座/完整名称及菜单有可见结果，无新空画布或诊断控件；这两静帧不能证明广角性能。原PNG保private runtime，operator bind不冒phone bytes/AppID。当前普通会话及旧owner退休只见CONTINUE，具体回执output/r59-point-delivery-result.json。

## 同一观察器的有界Android配对

r60/POINT60Q与r61/POINT61Q的Page/helper逐字一致，仍用r56原分段及flush聚合边界。before Scene/GPU为已保r56 observer，after只替换本批真实固定字段组装；两包SHA分别e49992889bf4e32b3d06d665b8d8de5dbed453ada23446f4ebbf01fa7f053c88与3cd77eb8d3998f25b38a22315c1464adda5a502fc29ca2f3e90c257bb233ffc1，284文件/4,883,457与4,883,481B。暖场实际90.0°，同预览参数、1080×2376，一次各1000ms(.25,.52→.68,.52)横拖；四原图及source/hash/count/阶段全集见output/r60-point-pair-result.json。

| 原观察边界 | before | after |
| --- | --- | --- |
| 主星表循环平均/最大ms | 7.09 / 27 | 5.22 / 8 |
| SceneBody平均/最大ms | 13.59 / 37 | 11.62 / 32 |
| 银河平均/最大ms | 1.25 / 25 | 1.28 / 19 |
| 插画draw平均/最大ms | 2.66 / 6 | 2.64 / 6 |
| 线flush平均/最大ms | .39 / 1 | .48 / 2 |
| 点flush平均/最大ms | .39 / 1 | .24 / 2 |
| 已绘聚合帧/输入moves/跨度ms | 44 / 114 / 990 | 50 / 115 / 997 |

这组仅支持当前主循环及Scene同步call-wall有限下降，不证明物理FPS、统计置信、整场流畅或所有手机。原整数Date.now/诊断开销/180ms输入后尾段保留；调度使中间接受姿态和eligible不同，不作逐帧精确匹配。主星表每帧8404输入，before eligible平均最后一位原图读不清，保null与可见前缀638.6，after638.28；不猜补。catalogLoop包含待提交星座线flush，不重复相加或叫纯CPU。after最长body32ms中银河19ms/主循环6ms，银河平均没有下降，不能将它归作组装修复收益。

`sky_point_pair_native_review`独立看四原图，核两本地包hash/marker、同Page/helper、Scene/GPU差异及三生产源精确恢复，无计时/消费者必修；after artDraw最大误录7经原图核为6，脚本和结果已修，原JSON保r60-point-pair-result-first.json。类型r2当时root实际进程exit0，但所写r60-point-pair-typecheck-r2.log不在所指owner，独审无法据此复核；结果已明确缺日志/独立重核缺口，未重跑已过类型检查。审查结束即关闭，未认证普通回交或完整性能。

首准备归档同名EEXIST发生在生产写入前；改成独立probe名并守前像hash后恢复。首退休误用scope.name发生在四诊断hash核后、恢复/移动helper前；改取source basename后沿原退休成功。原失败分别保r60-prepare-first-failure.json/r60-retire-first-failure.json。before因WeChat Launcher focus为空被foreground守卫拒绝，原无线/display ON、keyguard不在显示；仅确认该状态后恢复已授权Launcher焦点并复用同prepared官方预览一次，不重建、不唤醒/输入凭证、不保原始系统/聊天元数据。

普通三源按r60 scope恢复到含r59优化的前像，helper归档且生产不存在，五PNG hash与原33行已读回核对。复用同r59 prepared官方回交，20:49原图实际手动45°初始星点/星座/完整名称/菜单可见且无POINT控件；root实际观察，只属有界普通回交，phone bytes/AppID未独立读取。所有临时owner停止和最终记录见output/r60-point-pair-closure.json，现会话只见CONTINUE。剩余银河/插画长尾及整个滚动/缩放/跟随手感仍未闭；不重做此次已解配对、旧文字四样本或无关检查。原33及全部历史FAILED/UNVERIFIED保持，图像冻结、红光暂缓、无障碍明确取消和同一未完成Goal不变。
