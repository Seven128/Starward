# 单指拖动掉帧排查

用户新报：“拖动的时候卡顿很明显，以及星星的名字拖动感很明显”；随后明确是“星点和文字一起卡顿”。这是真实新增失败，不因前次缩放改善或本地CPU优化而关闭。用户询问请求/绘制异步及高频节流，已明确“好，你继续”。沿原PLAN B/E/F，不改方案、图像冻结、红光暂缓，不重跑无关已通过检查。

修复前定位：网络/图像请求异步且由现owner取消/有界并发；Canvas有latest-frame和单在途调度。单指move仍setManualBasis→整页React→effect→draw，而pinch已直接更新zoomRef并请求writer。paint读取当前manualBasisRef，但draw的资格仍读旧state闭包，不能只删除setState。星名memo对每个接受相机扫描全frame.points，固定displayName/magnitude筛选可按当前catalog/精确时刻复用，投影/地景/排序/避碰仍逐实际相机计算。

`cloud_sky_drag_audit`有界只读独审确认这两处候选，没有证据支持替换原生标签。保持首进手动/停止跟随、程序定位/跟踪、结束/取消/viewport settlement、Context/time/Canvas-generation fence及accepted-frame身份。审查未运行检查/手机或改文件，完成已结束。

原生Canvas帧调度可沿[官方Taro Canvas API](https://docs.taro.zone/docs/3.x/apis/canvas/)的requestAnimationFrame/cancelAnimationFrame评估；文档支持2D/WebGL，不把离屏实例当展示节点，不把API存在当当前手机节奏已经验证。当前先核两处现有owner内的多余工作；不在输入/请求/渲染各加独立固定间隔，不把async函数标记当CPU离线程。

修前源码create-only保存在output同owner的drag-before-spot-sky-page.tsx。当前状态由CONTINUE控制；局部修复及软件范围如下，手机手感仍未验。

## 当前局部修复与必要证据

生产只改`spot-sky-page.tsx`：draw资格和帧输入用当前manualBasisRef，raw drag首次仍走enterManualView，后续只更新ref并请求原writer；结束和viewport settlement同步最终manual state，取消仍恢复原事务checkpoint。星名固定displayName/magnitude资格按已接受scene/精确时刻memo，外层仍依实际FOV、太阳/星高、相机、地景、深空辅助决定计算排序/避碰及8名额。没有替换原生标签、降画质、增缓存服务或固定间隔节流。

新direct drag案例修前明确3次state写入而应只保1次模式转换失败；修后相关7项通过，范围为raw提交/松手、播放中拖动、跟随取消、第二指取消、viewport结算、普通星名遮挡及深空辅助资格。测试抽取适配增加当前memo声明，原行为断言保留；TS首跑发现fixture重复projector键，删除该新增重复后，受影响2项及TS5.9通过。viewport原案例补单指结算读回，不扩主题/设备/对象矩阵。

[profile-sky-labels.mts](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/profile-sky-labels.mts)复用实际8404行出版和明确太阳高度−21.8934°的时刻，执行当前生产页面声明与真实投影/可见性函数，按真实memo依赖变化600次相机。489视角有标签，总1743项；两侧全序列标签内容/坐标/顺序hash均`688923307c9c6a7015aa454ba5c1fde3645021d0063ed8bccd86730bfaf7f7d4`。暖560样本中位1.4354→0.1285ms、p95 2.0351→0.2643ms，单冷样本3.0665→2.3917ms；见[修前](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-labels-before.json)和[修后](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-labels-after.json)。只证明本机星名选择CPU及该数据/视角结果一致，不含原生layout、GPU、手机FPS或完整页面耗时。

`cloud_sky_drag_change_review`独审本轮preimage、实际状态/Canvas/星表owner及针对性测试，无阻塞：首进手动、结束/viewport结算、取消checkpoint、Context/time/generation/旧回调隔离及缓存失效边界保持。未运行检查/构建/手机，完成立即结束。未据局部结果关闭用户的实际掉帧反馈。

## Candidate identity

`development_feedback` r19／drag-direct，当前dirty worktree，同一v79 LOCAL／MEMORY_TEST／天气fixture API。SHA `2b020f0e63706953f53feb8d06c966c93e5051e58ff25c4cfc88aa4aa8364ed7`，284文件／4,862,291 B；主包2,097,108 B仍余44 B，Sky1,398,429 B，现预算通过。无临时探针/marker，旧包保持；[构建](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-drag-direct-build.json)、[包体](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-drag-direct-package.json)。

## Invocation result

官方auto_preview已完成；fresh bootstrap实际看到重进的普通页面，再按可见手动入口进入星空。03:06 guarded截图见星点、星座图/线/名称、原生底部菜单与设置；观察后bind，截图`drag-r19-initial.png`留private runtime。[调用回执](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-drag-direct-delivery.json)只供本地generation/命令身份，不冒phone字节读回。

## Observed product behavior

新普通版原生画面可见，尚未取得实际拖动流畅度结论。已向用户仅请求一次单指左右拖动，agent暂停手机输入；不重做缩放/搜索/姿态/后台等已过旅程。

## Verified

本轮受影响源行为、同一实际标签数据/视角CPU与输出、类型、独审、普通编译/预算及手机初始实际显示取得相应有界结果。Context性能owner同步raw pan直达writer及固定星名候选的寿命/失效条件，具体数字仅在本证据。

## Unverified

这版手机拖动手感仍待用户反馈；没有新GPU完成时长、物理FPS、完整冷启动/整场资源、iOS或正式候选验收。未实施原生RAF调度或其它新节流，不把当前setTimeout任务合并声称为已验证的vsync对齐。

## Invalidated

r19推送后不复用r18截图/输入权；旧r18缩放与静态画面不能关闭这次单指失败。修前源失败、fixture重复键类型失败及全部旧结果保留。

## Cleanup

当前反馈代次仍保留供必要的同一次用户拖动反馈，临时session与源项目分别管理；准确当前路径及旧owner清理结果由CONTINUE持有。无图像加工、红光工作、云发布或其它设备输入。


## r19实际反馈与下一诊断边界

用户反馈："好了一点，星点好多了，但依然有明显的卡顿感，或者说拖动的时候整体帧率都低，文字依然是卡顿加拖动感明显"。记PARTIAL_IMPROVEMENT_JANK_STILL_FAILED，解除前述主观等待。用户附近星点候选/空闲预取建议有合理用途，但当前未证明资源等待是瓶颈；不预先加缓存框架。临时r20诊断只用于本次新增失败，松手后一次显示；正常r19源码已create-only保存用于探针退出。

## r20分段实测与受影响星点工作

r20 DRAG1013A是同一r19生产行为加有界探针。auto_preview实际完成，fresh guarded截图确认代次和普通星空后绑定；1006ms host单指拖动100次move，29次接受帧（含短结算尾），活跃拖动接受间隔均38.5ms／p95 56ms。页面CPU均6.5ms、Scene16.5ms，其中星点9.2ms、星座3.5ms、背景2.2ms；copy均0ms（毫秒时钟），没有纹理上传。实际2D display提供RAF/cancelRAF方法，尚未采用。公开update listener的时间戳单位未独立校准，不作GPU/FPS证据。完整有界数字见[单次实测](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/drag-r20-host-result.json)。原生文字类无left/top动画，app.scss的soft-button仅颜色过渡，不能把文字滞后归因于CSS位置缓动。

在现Scene/appearance/projector owner内先共用精确星等上限，廉价排除无显示资格的星，再精确投影/裁剪，最后计算可见星的外观、透射和颜色；SAO同规则，保原pointIndex和拾取顺序。投影器在屏幕外返回前不分配点对象，原公式、边缘容差和unclipped接口保留。未加数量上限、空间索引、预取队列或额外节流。用户建议中的局部候选方向据此采用最小实现；资源预取需另有等待证据才重评。

[Scene实际负载profile](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/profile-sky-drag-scene.mts)使用8404行、45°/390×844、240个变化相机，共55,843次星点绘制；绘制命令和拾取全序列hash两侧均`6d3b8e38aab3adf7d8ad2a24fb9baddf69816620c96fc356adad9877ded894d5`。暖220样本中位2.1761→1.8376ms、p95 3.1615→3.0073ms；单冷样本12.5264→7.1732ms。见[修前](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-drag-scene-before.json)、[修后](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/sky-drag-scene-after.json)。仅本机CPU，未包含原生GPU/图像/文字布局，不冒手机收益。8项受影响既有appearance/projection检查及TS5.9通过；只读`cloud_sky_star_filter_review`核便宜筛选与原fade等价、无效输入/裁剪/拾取/透射索引及无缓存fallback，无阻塞，完成后结束。未新增测试矩阵。

## r21结果及方向复用候选

r21 DRAG1013B构建/预算/官方auto_preview成功，实际marker和普通天空确认后同一host单拖动；[实际数字](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/drag-r21-host-result.json)保存。星点均9.2→7.5ms，但Scene16.6ms、帧间隔41.1ms，整帧未改善，不能关闭卡顿。出现“重试模拟地景图片”原生按钮，确切原因未证；被其遮挡的copy/inputAge字段标null，不猜数。没有图像获取/加工，也未重跑其它手机旅程。

用户新建议简化高频大规模计算，现源码确认同一精确时刻拖动反复做每颗星的三角函数和临时向量。候选在原current-frame内懒准备不可变方向，投影共享原公式、裁剪和拾取；时刻替换由原owner处理，无新全局缓存。真实240视角完整输出hash保持相同，但本机中位1.8594ms／p95 3.1290ms未优于r21，不认证收益。7项受影响既有检查及TS通过；还需同一有界手机瓶颈样本判断是否保留，未写作Context采用决定。

## r22采用判断与普通版收口

r22 DRAG1013C的[实际单次手机样本](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/drag-r22-host-result.json)显示星点均5.1ms、Scene12.9ms、页面6.4ms、接受帧间隔均35.9ms／p95 60ms，纹理上传0。对照r21星点7.5ms、Scene16.6ms，方向复用在本机Android实际热路径有收益，保留。均值下降但p95未下降，仍不认证物理FPS、GPU完成或用户主观顺滑，也不关闭r19真实卡顿。绘制、星名、星座线/图及原生菜单实际可见；r21地景重试这次未出现，不据此关闭那次失败。

`cloud_sky_direction_review`只读核同一投影/裁剪、唯一工厂调用、当前精确时刻生命周期、索引与拾取，不见阻塞；指出初次分配/冻结成本真实存在，不能从本机无收益推手机收益。实际手机后据窄范围收益保留，完成立即结束。星等候选及方向复用仍沿原owner，没有变更天文公式、阈值、画质或对象数；方向只从原角度精确转换，静态星表参数与地点/时刻相关方向分开。

用户追问首备开销能否移至打包或初进加载：打包只可处理固定星表事实；水平坐标依地点/时刻，当前方向在首次需要的精确时刻帧中懒准备，此后拖动复用，换时刻重新准备。没有证据要求阻塞首次入页做额外全量预计算，也未引入空闲邻域队列。电脑单冷样本额外约3ms不作稳定首屏回归结论；后续若目标端首屏/换时刻出现实际失败，沿现owner重新定位。

临时page/Scene/feedback探针已归档到同output owner，源码退出全部探针，page精确恢复保r19生产修复的preimage，Scene仅删计时钩子保星点优化。r23 drag-clean普通构建exit0／预算通过，SHA `5807a4b99a147969b754f25bcb0dd8a0ff554e6ca1e2c36826404f5581aaa012`／284文件／4,862,974 B；主包2,097,108 B（余44 B）、Sky1,399,112 B。实际生成包中诊断marker/计时字符串为0，源码临时模块已退出。官方auto_preview命令完成；fresh capture返回`device_test_wechat_miniapp_foreground_required`，普通版实际显示未确认，未bind或绕过guard。未重跑已过7项、全套旅程或再请用户重复拖动。Context性能owner同步采用理由和寿命边界，具体数字留本证据。

r19/r20/r21及各bootstrap已同owner stop成功。r22 bootstrap及r23未观测bootstrap均stop；r22、r23 feedback各一次stop返回cleanup_pending，保为实际清理缺口，不无依据循环或关闭未知IDE进程。源码项目、历次构建、原图及所有历史失败保留；当前资源精确路径见CONTINUE。当前33义务、图像冻结、红光暂缓及整体拖动失败状态均未升级。

## 用户要求重推后的实际显示

2026-10-13用户明确“你再推送一次”。原r23 prepared generation校验仍完整，直接复用SHA `5807a4b99a147969b754f25bcb0dd8a0ff554e6ca1e2c36826404f5581aaa012`官方auto_preview，未重建/换generation/重跑测试。调用完成；04:12 fresh guarded capture见无诊断字的普通入口，按可见手动入口进入后实见星点、Alderamin/Polaris星名、仙王座图/线/名称及底部原生菜单。实际图drag-r23-repush-initial.png留private；随后bind，bootstrap已stop，当前暖会话归CONTINUE。只解除r23实际显示未确认，不认证拖动流畅度、功能旅程或phone字节读回；旧前台失败与cleanup_pending保历史。

## r23新反馈与页面分段

用户实用r23确认“看起来好了一些了，但还是有卡顿，还有办法优化吗”，仍为部分改善。限定只读`cloud_sky_page_cost_audit`核出每次页面render的路由/时区和时间格式化，以及每幅星座图重复视口准备；无证据支持CSS位置动画或无条件Canvas反馈循环，审查完成已结束。

r24 DRAG1013D仅加路由、时间与visibleFigures分段，生产仍r23；[单次host样本](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/drag-r24-host-result.json)page3.4ms，其中route0.1、time0.1、figures1.3；Scene6.8ms，接受间隔均17.0/p95 25ms。未改生产就比旧r22快，运行条件有波动，不能冒新优化收益/FPS；只作本轮对照。开始时无线断开、mDNS无连接地址，USB虽然device但scoped调用失败；用户恢复后唯一已配对TLS发现/连接/有界shell及fresh画面成立。断网后的天气预警/银河刷新提示分别经当前控件显式重试撤去，影像目录失败仍可见。私有phone nc健康探测400、主机两origin健康200均保实际边界，不把nc400当业务失败或随意改防火墙。

现局部改动：路由资格按原route对象memo，rowTime/civilDate按精确时刻/时区/Context资格memo，保持原共享日期与Android fallback；星座请求/绘制批次在原visibility owner共享同一视口准备和lazy hull，每图原raster/cap/保守边界照旧，page memo含全部相机/中心/尺寸/层开关及frame。没有全局Intl/cache、改时区规则、近似图像范围或修改像素。

本机[当前页面时间声明](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/profile-sky-page-time.mts)400render（含时刻跨午夜及时区变更）输出hash两侧`5037feb410f84fa72251040250789fe0ef95b75eca92ab826d2eb48770bf3077`；Intl构造2400→14，中位.4611→.0056ms。首个执行缺TSX项目alias的工具失败已纠正到现tsconfig，不是产品失败。[实际85图/180视角](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/profile-sky-figure-culling.mts)选择3045项，hash两侧`c81d30292367abb1342582f0b0ef687be269f04c398be6bd2a0841d5fa6f20b6`，中位.4894→.2788ms、p95 .8735→.6136ms；均为本机CPU，不含手机呈现。13项受影响真实行为及TS5.9通过；另一个未匹配文件的runner成功不计行为，实际portrait绘制案例已单独运行。未重跑旧星点、全旅程或套件。

`cloud_sky_page_work_review`只读独审实际增量和消费者/fixture，确认memo依赖及hooks位置完整、恢复/跨午夜语义保原，factory复制相机并按原规则惰性准备hull，绘制只在有现图片时准备；无阻塞。未运行检查或手机，完成已结束，不冒设备收益。r25 DRAG1013E的构建/现包体检查通过；同源源码只改上述局部，诊断在最终普通版退出。Context仅同步复用边界，不写本轮数字。

r25官方推送后fresh scoped画面确认marker和普通天空，一次同向host拖动的[实际结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/drag-r25-host-result.json)：page均3.4→2.5ms、figures1.3→.3ms、route/time读数接近毫秒时钟0；Scene6.8→6.9ms，接受帧间隔均17.0→16.6ms、p95 25→26ms。采纳局部CPU收益，但不把整帧近似不变、单次最大值下降或无新通知等同主观顺滑/稳定性通过。当前用户卡顿仍未闭，也没有实际FPS或GPU完成数据。软件与目标收益范围已足，不重跑旧内容或再请求同一人工拖动。

临时probe已归档至output同owner `drag-r25-with-probe-spot-sky-page.tsx`、`drag-r25-with-probe-sky-scene-render.ts`与`drag-r25-sky-drag-feedback.tsx`；page仅删probe保路由/时间memo及新批量筛选，Scene读回与r23生产preimage完全相同。清理脚本首个说明flag误写false，后续真实文件hash读回为true，差异核实只余预期生产修改。不据临时flag伪报产品失败，不因纯探针撤除重跑行为套件。

普通r26 drag-page-clean构建exit0／预算通过：SHA `424a8d4b6bc2d1b080465c095d31b402e614e7ac781f3c874d3da8698d371044`，284文件／4,863,437 B，主包2,097,108 B、Sky1,399,575 B；实际生成包诊断marker/计时字符串0。官方auto_preview完成，04:53 fresh guarded画面在手动入口后显示星点、名字、仙王座图/线/名、原生底部菜单，无临时诊断文字；`drag-r26-initial.png`保存于private。实际观察后bind；bootstrap已stop，当前暖会话和API保留供同Goal继续，精确路径由CONTINUE持有。r24/r25及bootstrap、此前r22/r23清理缺口已同owner成功收尾，历史失败不删除。未新增主观拖动请求；普通版显示不认证动态顺滑，33义务及图像/红光边界保原。

## 同版本原生调度对照：准备（2026-10-13）

用户问“能彻底解决吗”，现无法保证或关闭真实卡顿。只读 cloud_sky_frame_schedule_review 指出当前setTimeout(0)只合并JS提交，原生文字在copy后经React/native更新，均未证明物理同帧；同build/相同时刻和初始相机的timer/Canvas RAF对照能辨别提交节奏，但不证明GPU完成或物理FPS。试验仅临时注入原clock port，不改lifecycle/renderer/标签owner；正延迟timer保原，RAF句柄捕获原display、live取消栅栏和5s有界fallback（任何fallback均不作RAF成功）。审查完成即结束。生产/Scene清理归档与r26当前源逐字标准化一致后才恢复旧探针，新增切换并复位的临时控件。TS5.9通过，不运行旧测试。r27编译中，只有可解释的真机收益才能进入生产。

前置capture再次因无线offline失败，mDNS0且USB同为offline；用户明确恢复后发现唯一mDNS服务对应同一设备的directIP及mDNS双连接。一次拼接别名匹配未命中、一次探针错误调用不存在shell方法均属工具问题，不算产品失败；断开本轮自建directIP连接后现有mDNS唯一选择、bounded shell及guarded capture成功。未重新配对、不修改device guard、未读聊天或记录地址/身份。旧r26当前phone画面完整，未将它当新性能证据。

### r27对照结果：不采用RAF

r27/DRAG1013F同build两次同一1000ms主机拖动（初始45°/同星空）：timer接受间隔均14.8ms、p95 24、max28；RAF均17.7、p95 25、max29。page均均2.4、Scene6.2→6.3，最新输入年龄6.5→5.5，调度等待6.8→9.6；原生更新delta2.4→3.0（单位独立校准仍缺）。都0纹理上传和0RAF fallback。未见整体收益，不采用；临时clock与切换源码已归档，生产lifecycle从未修改。完整读屏数值见output/.../drag-r27-schedule-comparison.json，两张截图留private。用户不需重复手测。

原生gfxinfo在精确当前AppBrand进程范围可读；before/after按旧最大IntendedVsync筛新增。两边均72行有效flag0，HWUI totalFrame均3.00/2.81ms，但FrameInterval返回timestamp量级，FrameDeadline映射也未独立确认；不使用该字段均值/零deadlineMisses证明刷新率、GPU完成或流畅度。原始已生成数值文件保留，异常不掩盖。这里只确认取证通道可用及范围，不能等同Canvas/display compositor的实际FPS。

下一有界问题来自r26重连实际宽视野（同屏仙后/仙女/飞马/双鱼）与以往45°单仙王诊断负载不同。r28临时探针将用原setVerticalFovDeg/enterManualView设90°同一初始方向，再单次主机拖动，分离星点/星座/页面/呈现开销。不把宽视野自动等同更多星点（原FOV星等规则保留），不扩大主题、对象或设备组合。

### r28宽视野实际重复上传

90°首段host1000ms：接受间隔均25.1/p9547/max47，Scene均11.1/max47、星座均5.0/max36、星点均3.1；27次texImage/texSubImage(max15ms)。复位同一视角后仅一次暖段用于区分首次加载与重复驻留：均21.5/p9540/max65，Scene11.8/max54、星座5.8/max31、星点3.1；67次上传(max18ms)。支持持续重复上传这一窄瓶颈，不能从此宣称全部文字延迟根因。数值见drag-r28-wide-comparison.json，两张截图留private。

只读cloud_sky_wide_drag_review核星名/星座名候选已有有界处理，建议星座线递归端点复用，但本轮首先调查更突出的上传；未为微观节省扩大生产修改。只读cloud_sky_texture_pressure_review确认普通cached窗口检查晚于full-preference预算选择，存在因预算起伏的无效升降级；另有提前淘汰本帧尚未get来源的风险，不能直接当实际原因。建议先让ordinary按实际requested命中，exact panorama保原；当前可见full驻留可能增加须测量，不能声称内存不变。若第二机制被证实，沿既有withPinned保护真实当前提交源而非保留历史视野。两只均完成即结束。

r29/DRAG1013H仅加上述原因的计数及每帧finish驻留MiB，尚未改生产策略；继续同一90°路径，旨在确定修复入口，不重跑已通过旅程。r27全部feedback/bootstrap及旧r26反馈已由各owner stop，截图/源码/包成果仍保留；r28仍暖，API19796保留。

### r29原因及frame admission修复

r29/DRAG1013H，90°同动作：27uploads/26miss/1exact/20pressureEvict，仅2unused；0ordinaryReplace/0copy/0policyOnly。finish驻留max约17、均14.8MiB（不含瞬态source/copy/driver/native memory）。Scene均10.5/max45，接受间隔23.6/p9536/max54。由该实际证据选择修提前淘汰，不改普通window preference或exact策略。完整数值见drag-r29-texture-cause-result.json。

当前frame pin修复：Scene按当前at/basis/viewport/layer筛出同一ready可绘星座图列表，在任何背景分配前经原Surface/GPU begin传给纹理owner；实际绘制使用同列表。framePins仅阻止本帧未提交前被压力淘汰，不计used、不上载、不授来源，finish仍清退未实际使用源并清pin；begin和dispose无跨帧保留。原16MiB分配压力数值、失败锁存、原生失效、exact panorama以及普通裁窗策略原样。先分配C再提交仍可见B的新回归在旧代码真实失败（B纹理已被删），修后通过；7项必要受影响行为含actual Scene早声明/仅选择可绘图、图层淡出、退役/普通重叠/嵌套pins/失败粗图保留通过，TS5.9通过；没跑旧全套。cloud_sky_frame_pins_review只读无阻塞且已结束，明确瞬态驻留仍需区别于finish统计。r30/DRAG1013J构建中，目标收益待同宽视野一次对照，不能先记性能PASS。

r30/DRAG1013J已build/预算通过、官方auto_preview完成；本轮不是运行新逻辑测试。首次guarded capture又出现单无线不可用，唯一mDNS发现0，故尚未测量修后收益。已问用户恢复并保持解锁，不重复索要拖动。新feedback8J14dL/generation1it4ab、bootstrap91RPFm未bind/未输入；旧r28/r29反馈与bootstrap均由owner stop，源项目和private已保截图仍留。

### r30真机范围内收益与普通版清理

用户明确“已恢复并保持解锁”，唯一现mDNS transport、bounded shell及fresh capture恢复；未重构建/重推同一r30。实际DRAG1013J进入同90°视野，first上传27→8、压力淘汰20→2、Scene max45→33ms；frame gap均23.6→24.4/p9536→41并未整体改善，不能用上传减少冒顺滑。same-view warm的已知重复上传失败专项对照，r28 67次→r30 14次，gap均仍21.5、p9540→34/max65→51；新warm仍3次policyOnly/5evict、上传max22ms，余量未闭。finish纹理驻留max四舍五入均约17MiB，first均14.8→14.7、r30 warm15.9；不是瞬态GPU/native/driver/整机峰值证明。预筛从const阶段移至begin之前，细分stage数字不可假装同边界，Scene整体计时包含这项工作。完整r30数值见drag-r30-frame-pins-result.json，截图两张留private。保有证据的frame pin修复，没有采用未证明收益的RAF、line微优化或ordinary窗口策略修改。

临时page/Scene/GPU/probe全部create-only归档后清理：page标准化字节等于r26干净页；Scene只保frame-pin import/准备/传递/同列表绘制变化，逐字对照预期成立；GPU等于独审/TS时的clean修后快照；probe移入已核工作区output。源码诊断字符串退出；不因这次清理或Context文档重跑测试。普通r31/drag-frame-pins-clean正构建，后续普通实际呈现只认证交付，不重复拖动验收。Context只记录单帧预声明的owner/理由/寿命/不授信用与内存边界，不塞试验数字和版本日志。

普通r31已构建及包预算通过：SHA0ed876a3aa5d08536e951a85bbf9b2401ee2e509a39b658bcc2633cfbd62d09c／284文件／4,864,146 B，main2,097,108（余44）、Sky1,400,284；普通bundle诊断标记/控件/计数器文本搜索0，源码diff检查无空白错误（仅仓库已有换行规范提示）。正在官方推送该唯一普通候选，不再跑已过行为测试。

### Candidate identity

普通r31 drag-frame-pins-clean，development_feedback；固定本地fingerprint `0ed876a3aa5d08536e951a85bbf9b2401ee2e509a39b658bcc2633cfbd62d09c`，generation1，仍本worktree/branch和v79 LOCAL/MEMORY_TEST天气fixture。

### Invocation result

官方auto_preview completed；唯一已配对无线transport fresh capture，agent实际见普通入口后只进入手动查看，05:58星空/菜单显示，按实见bind。不重复拖动或旧旅程。

### Observed product behavior

普通星空、Alderamin/Polaris、仙王图/线/名及原生菜单实际可见；无临时性能文字或90°控件。仅认证这次交付可见，不推断整体性能通过。

### Verified

受改动的七项行为、类型、独审、构建/预算/诊断退出、官方调用与当前手机可见的范围成立；真机重复上传显著减少沿上述r30条件。

### Unverified

整体顺滑/原生标签物理同帧、剩余长帧、真实GPU完成、瞬态/native/driver峰值、整场内存、手机实际包字节、iOS及原33义务剩余均不被升级；主包余量仍44B。

### Invalidated

所有旧候选输入权保旧范围，旧反馈已停；r31仅普通可见观察，不继承诊断数字为当前普通物理FPS。

### Cleanup

所有临时探针源码已移出src并保归档，r30及更早feedback/bootstrap均stop；r31 bootstrap2TTqfz已stop并先保private屏图。当前JefPOx/FaBjQm及owned API19796保暖继续Goal，未清手机数据、无在途命令或待用户动作；全部源/中间/旧证据保留。

## r35普通resident覆盖对照（2026-10-13）

UX01–UX04普通r34完成后，继续原r30已测的warm三次policyOnly及长帧。当前有界问题：budget余量增加时，已经覆盖实际requestedWindow的普通resident是否被仅因full preference升级。新行为回归在原源码真实失败（应保同一texture却被替换）；修复仅在原full可容纳分支优先保已覆盖的resident/window，真实coverage miss仍选原full/裁窗。exact、受压full缩裁、当前帧pin、fail latch、源退休与16MiB目标不改。受影响纹理owner14项通过，TS5.9通过；sky_texture_coverage_review只读核实际artwork/artworkLevels UV及双采样消费者无阻断，完成即结束。

r35限时探针复用旧drag反馈和GL计数，在同一build/当前UX输入内切换BASELINE/RESIDENT并复位同90°。只采同一约1000ms主机单拖的首次/暖段，用实际上传、policyOnly、驻留及接受间隔决定是否保留；没有收益则退出该候选，不将本机检查冒手机FPS。可解释的上传降低仅认证该窄成本，整体长帧/原生文字仍须保真实范围。本轮Scene不插细分stage探针，page总耗时和paint→present边界及GL调用负责对照，旧r30分段字段不直接拼比。干净page/候选texture源已create-only保存；探针需退出后再交付普通版。手机r34 fresh capture仍在线，不需用户重复物理动作；其它已过旅程不重跑。


### r35实际结果与采用范围

官方auto_preview完成，fresh捕获实见DRAG1013K及普通星空后绑定。同build按可见控件复位90°，依次BASELINE first、BASELINE warm、RESIDENT warm三段；原生截图只留private runtime。完整读屏数字见[同版本对照](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/drag-r35-resident-comparison.json)。暖段ordinaryReplace3→0、copy2→0、policyOnly3→0，上传14→13；frame-end驻留按显示精度max/mean均17/16MiB。平均接受间隔23.7→23.8ms、max均47ms，p9545→37只是一段样本，不认证整体FPS/稳定改善。Scene均15.3→15.1ms，原生更新时间戳仍没有独立单位校准。首段6上传、0policyOnly单独保留，不与暖段混算。当前输入含新UX，不把旧r30不同边界/输入拼成一次证据。

采用这处有界共享owner修复的依据是实际无效替换/复制消除、一个上传减少与生命周期回归/真实UV调用独审；不宣布整体卡顿解决。没有改变纹理压力目标、图像分辨率、科学输入、缓存历史或普通/精确采样责任。当前page和纹理文件的临时探针已create-only归档并逐字恢复干净page/受审候选texture，probe模块移到同output owner。普通r36 drag-resident-clean build/预算通过，SHA c6fe49e0aa463b796b1b6d68ea5d2f9c4682eea54b4bdc1313960ddddbe65012，284文件／4,868,257B；主包2,097,108B（余44B）、Sky1,404,395B。没有因探针退出/Context文档重跑旧行为套件。普通交付可见及清理由后续实际回执确定。


### r36普通交付与收尾

Candidate identity：development_feedback普通r36，指纹/包体见上段，原v79本地fixture API不变。Invocation result：官方auto_preview完成；fresh bootstrap实见普通入口，按可见手动入口进入后07:13看到星点、星座图/线/名、原生菜单及倍率淡化自动名称，随后bind。Observed product behavior只认证该普通交付可见；没有重复性能拖动和已过其它旅程。Verified：必要行为/类型/独审、r35有界原生对照、r36构建/预算/探针字符串0与普通可见，Context结构校验及diff检查通过。Unverified：整体长帧、原生文字物理同步、动态淡入淡出、手机实际包字节/iOS/物理峰值/完整Goal仍未闭。Invalidated：旧r34/r35输入权均不用于r36；临时probe不留普通src。Cleanup：r34反馈和r35/r36 bootstrap已stop；新project交付后r33旧pending同owner成功收尾。r35反馈停止仍cleanup_pending，官方精确项目close_project_window失败，未杀未知进程或手工强删；project_list四项都是历史项目，无本轮private项目。当前r36及API暖资源只由CONTINUE持有，无待用户动作或在途命令。

## r37原生标签位置对照：准备

上一轮属于progress：UX实现与纹理覆盖owner已改变权威源码且取得有界软件/手机证据。本轮原get_goal仍active/无预算，唯一分支和r36源码已核；手机fresh capture正常。剩余文字跟随差距的有界问题：保持同一accepted投影、原生Text/Button、字号/侧向锚点/opacity/命中与生命周期，只把高频left/top改为translate3d加现锚点，是否减少原生更新和接受帧开销。当前试验仅借原page/probe与同build BASELINE/TRANSFORM切换，不改Canvas、相机、科学、选择或资源owner；没有引入位置缓动/节流。

先在45°同一静止画面切换，实看自动星名/星座名锚点及点击；若偏差先退出修正，不以源码公式认证像素。随后同90°单次BASELINE与TRANSFORM主机1000ms路径分离时序收益。只有可解释收益且实际显示/交互保持才保留；否则还原r36，证据用于排除方向而非扩试。源码干净preimage已create-only保存。WX官方WXSS/performance两页web读取均non-retryable不可访问；Taro官方Animation文档只确认平台平移能力，不提供当前CSS性能结论，不据它宣称收益。TS5.9通过，不重跑未影响旧套件。最终探针需退出，普通交付不含诊断state/flag。

### r37结果：不采用transform-only标签

同build真实45°静帧实见名称锚点不变，点击变换后的Alderamin文字打开HR8162资料；两个暖态性能样本均保同一HR8162选择，选中标签自身未改。BASELINE先一段首动用于区分6次首次上传与后续暖态，不混比。完整数字见[标签位置对照](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/drag-r37-label-comparison.json)：同90°约1000ms暖段平均接受间隔25.1→24.8、max50→57ms，Scene15.5→15.6ms，native update delta均2.8→3.3（单位未独立校准）。p9548→36不是稳定收益证明；帧数/上传12→15随采样变化，不能将全部差值归于CSS。default Python无PIL，数值像素比较未执行；只保实际查看的视觉与点击结果，不冒pixel equality。

没有决定性收益，候选和临时probe全部create-only归档退出，page逐字还原r36；未改SCSS/其它业务或采用transform。复用原r36 prepared generation及完整SHA官方重推，未重建/重跑旧测试。fresh捕获普通入口→手动，07:30实见原普通星空/文字/菜单后重bind，bootstrap已stop。r37反馈停止cleanup_pending保留；新项目交付后r35旧pending已同owner成功收尾。图像冻结、红光暂缓及33项未验原义务保持。

### 星座线投影复用：局部结果

沿原真实676线、原大圆/forward hemisphere/viewport cap、同误差/步长/深度和剪裁，递归子节点只复用父节点已算的端点/中点投影；复用只在当前同步调用栈，无跨帧/身份缓存。现[本机对照](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/constellation-lines-projection-comparison.json)使用实际stellarium-modern-v24.4.v3与保存真实report geometry，90/45/6°各240相机、720完整输出前后hash/线段顺序相同，90°累计59,824段，中位0.9058→0.6261ms，45°0.3723→0.2904，6°0.1416→0.1394。basis.right读取量分别670,167→291,347／212,457→95,481／11,400→7,660，用于确定计算确实减少，不作为物理性能证据。current完整生产函数与有界编译副本结果逐次一致。4项受影响既有几何/Scene行为及TS5.9通过；局部独审正在核前后源码和实际结果。尚未认证手机整体卡顿或native文字同步。


sky_line_projection_review完成只读独审，确认端点/中点与同步view稳定、真实Scene消费者、完整坐标/顺序比较及现前后SHA一致，无新增问题。它明确只支持局部CPU与输出等价，不认证手机整体收益；代理已结束。采用该最小调用栈复用，不新增Map/cache/框架或改变原科学几何。Context只同步此耐久规则及未采用transform-only的原因。当前source为原r36 page/全部既有UX加4行投影复用，正在普通r38交付；不因文档再跑行为测试。


### r38普通交付与本轮收尾

Candidate identity：development_feedback普通r38／drag-line-clean，SHA14f1bc98a9af67ddebc7d8c9aa7601e7bf1c67c9de8129564f6609fadc5fbf23，284文件／4,868,315B，主包2,097,108B（余44）、Sky1,404,453B；仅r36基础加星座线调用栈复用，原API/fixture lane不变。Invocation result：build/预算通过；官方auto_preview完成，fresh bootstrap手动入口后07:40实见普通天空/星座图与线/名字/菜单，实际观察后bind。Observed product behavior仅认证普通交付可见，不重复性能/已过其它旅程。Verified：4项受影响行为、TS5.9、真实全线三FOV输出/本机CPU、独立源码/结果复核、普通构建/预算/诊断字符串0，Context结构及diff检查通过。Unverified：本修手机整体收益、原生文字物理同步、动态星点手感、GPU/driver/整机峰值、手机字节/iOS/外部完整义务仍未闭。Invalidated：r37试验已退出普通src，旧候选输入权不用于r38；普通page与r36 preimage逐字一致。Cleanup：r36反馈及全部本轮bootstrap已stop；r35与r37旧pending在新项目交付后同owner成功收尾，失败记录保留。官方project_list仍4项历史项目，无本轮private项目，未删未知项。当前r38及API暖资源只见CONTINUE，无待用户动作、在途命令或活代理。Goal继续active/无预算，本轮为progress，未通过完整完成审计。
