# UX01–UX04：名称、星点过渡、地景与局部拖动

本轮由用户明确恢复实施并授权有限合并原PLAN B/E/F。完整原话沿REQUIREMENTS，33项、旧失败、图像冻结与红光暂缓保持。本记录不认证完整Goal或未改动旧旅程。

## 实现与软件证据

- 自动亮星名称只消费当前接受的实际星点/透明度/坐标，沿原名称倍率曲线渐淡；选择/定位/跟踪与深空名称保原责任。不再为每次相机重新扫描命名资格和求星点外观。
- 星点过渡归`sky-star-transition.ts`，BSC/SAO沿原Scene消费；每星目标变化从当前显示值开始160ms过渡。一个accepted显示状态、一个短退出集合，旧Context/出版/失效层即时撤回；换时刻只允许当前坐标，退出余影不进入拾取或自动名称。原单writer与按需timer负责后续帧，隐藏/退休清理，无常驻动画。
- 地景view alpha下限0.18，普通浏览退场混向灰色；原源alpha/投影不改，实际绘制与mask共用alpha，后方星空仍可点选。原完全fade到0的证据保持历史，不认证本效果。图片获取和像素没有改动。
- 手势起点先按实际视口/地景mask选策略；无可见地景时用原射线旋转实现屏幕平移，有地景时保原地平/宽视角行为。实际mask在有界24逻辑像素网格观察一次，不在每move重扫；这是可辨方向线索判断，不代替精确渲染/拾取遮罩或承诺每个亚像素轮廓。取消/跟随/缩放沿原事务。

初次28项中24通过；失败为旧全透明资源期望、OBSERVATION测试夹具错误传入普通高度衰减及新数值断言精度，已修。随后受影响91项90通过、1条旧0.5地景期望失败；更新新0.59半程/0.295恢复期望后，该恢复及实际page辅助/完成/失效3项定点通过。初次通过的未受后续源码改变部分不重跑。实际Scene新增检查证明真实星点进入有中间alpha、稳定后可选、退出仍绘但不可选、错时刻立即无残点；后续3项过渡与7项受影响手势/取消定点通过。当前Mini TS5.9检查通过。

独立只读`sky_ux_review`发现并复核空闲后跳变修复；它另指出全局最高树/alpha首行只是候选范围，不是真可见性。后者随后改为视口内实际mask采样，南向10°/2°的无地景反例已通过；该阶段尚未复审；后续第二、第三次独审结果见下文。代理已结束。无独审把源码/软件当手机通过。

真实8404行夜间星表、240视角的[CPU样本](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/ux-continuity-cpu.json)：静止启用/禁用过渡均无pending，命名/星点数相同；连续移动增加约0.08ms中位Scene CPU（1.661→1.744ms），p95 2.099→2.200ms。只供当前本机CPU开销，不含原生/GPU/图片/文字布局或FPS。移动时首次渐入的星点数变化是新显示过程，不能用此宣称减少真实目录/修复整体性能。

## 当前候选与实际操作

development_feedback普通r32／ux-continuity，当前dirty源码，既有v79 LOCAL/MEMORY_TEST/天气fixture API；无客户端fixture或临时反馈marker。build exit0，SHA `78d2b4b8faf0f9a1dc3ac5901cf23a29bbe0aba68b8b8f47ba1e7aca0a1a5b02`，284文件／4,867,665B，主包2,097,108B、Sky1,403,803B，预算通过（主包仍只余44B）。沿原output owner保存build/package，不覆盖r31及旧包。

恢复时官方Skill0.3.11 digest未变、不需reload；当前MCP登录有效/version equal。无线doctor一个device及一个旧offline；API19796仍为原启动进程。首次capture使用了遗漏feedback父路径的session，返回operation_failed，不是手机失败；改用feedback.json实际deviceSession后fresh capture成功，已查看旧r31真实星点/星座/菜单及常驻名称，未冒新代码验收。

## 实际原生观察与后续修复

r32官方auto_preview命令完成，bootstrap fresh capture见重新进入的真实页面，经可见手动入口进入后实见普通星空及较淡的Alderamin等自动名称，随后bind。一次中心附近横拖后仙王座整体主要向右位移，一次竖拖后内容按竖向位移；这些是前后静帧/真实输入结果，不认证手势过程无卡顿。继续原路径向地景侧浏览，实见灰色地景轮廓与后方星点/星座；点击Merak打开HR4295资料，真实高度−10.4°／地平线以下说明保留。此前一次估计的无名点点击无结果，未认证其是否命中星点，不把它当成功或产品失败。图片只留private runtime：ux-r32-local/horizontal/vertical/ground-edge/grey/grey-pick.png。

该原生观察又发现自动名称可以漂在不画星空的导航安全区、或被底部菜单截断。沿UX01已修：所有自动目录名称按现`viewportInsets`上/下边界淡出，右半屏名称向画面内排布；选择/跟踪身份不变。3条受影响名称/实际page辅助检查及TS通过。普通r33／ux-label-boundary build/预算通过、官方推送后实际初始及同向横拖观察：旧Deneb顶部、Polaris底部漂字退出，天空主体名称保留，随后bind；ux-r33-local/label-boundary.png保private。

第二次独立只读`sky_ux_final_review`核代码、上述r32/r33像素和Merak结果，确认前两问题修复；发现地景采样仍包括被控件遮住的Canvas边带。它的可复现反例为390×844、FOV8、南向5.5°且right/up反转，地景仅在y=0–12、topInset80后实际不可见，旧helper仍true。现采样限定原`skyVisibleViewport`，反投影仍用完整Canvas尺寸/中心；页面在手势开始传现insets，不在move改变策略。包含此反例的3项相关检查与TS通过；第三只独立代理`sky_visible_inset_review`只核该窄修复和实际调用后确认无问题。全部代理完成即结束，没有重跑旧套件或自审冒独审。

## Candidate identity

最终普通r34／ux-visible-pan，development_feedback，源码dirty且HEAD未变；源项目和三轮build/package/delivery回执仍归原output owner。SHA `c0b35fbbf799b497a9d4ab40f631b6640406a65a227459f294c8fa1c583964a7`，284文件／4,868,200B；主包2,097,108B、Sky1,404,338B，预算通过。r33仅增加名称边界，r34仅增加手势采样insets；没有因文档重建或重跑不受影响的r32灰层/旧手机旅程。旧包和所有原图/中间/output成果保留。

## Invocation result

r34官方auto_preview完成；fresh bootstrap捕获并查看，点可见手动入口后06:55实见当前普通天空/名称/菜单，已bind。MCP状态与project_list正常：4项均为早前项目，无本轮private项目，未删除未知历史项。实际手机字节/AppID/SDK未独立读回，不把正式命令和本地SHA等同phone字节验证。

## Verified

当前受影响软件行为、真实Scene帧/拾取、类型、分层独审、普通构建/包体及上述范围内手机可见/操作结果成立。Context已有耐久责任同步及`context:validate`通过；结构校验不认证产品。保存的原33条行未改，图像冻结和红光暂缓保持。

## Unverified

160ms淡入/淡出在真实手机的逐帧过程、放大/缩小连续切换时的完整手感、iOS、无障碍/物理资源和整机性能未由静帧或本机计时认证。没有让睡觉的用户重复双指/三轴/后台动作，也没有绕过守卫增加手机输入渠道。剩余长帧和原生文字跟随差距继续FAILED/UNVERIFIED，不能说彻底顺滑、除图像外全完成或完整Goal达成。后续沿原性能owner取决定性证据，不能因本批数量/局部CPU而加缓存、降质或重新跑旧矩阵。

## Invalidated

每次新推送均换bootstrap/绑定，旧session截图不用于新候选输入。r31/r32/r33及旧完全fade到0结论各保输入范围；r32不认证随后名称/采样修复，r34初始图也不冒未执行的动态条件。

## Cleanup

r31/r32反馈和r32/r33/r34 bootstrap已按owner停止，必要图片已create-only保留private runtime，源项目/全部旧包/手机数据不变。r33反馈停止返回cleanup_pending，针对其精确preparedProject的官方close_project_window返回CLOSE_PROJECT_WINDOW_FAILED，后续同owner仍pending，保留这个清理失败，不杀未知IDE进程或手工删除。当前暖r34及API19796仍供本Goal后续使用，准确路径只见CONTINUE；无待用户动作、活子代理或在途推送。


本UX批次后的性能增量继续见[拖动性能证据](drag-performance-2026-10-13.md)r35/r36；普通候选已由r34更新为r36，四项源码不重做。r34反馈已停，r33旧清理缺口在后续新项目交付后同owner停止成功，旧失败记录仍保留。唯一当前候选/暖资源/待清理项沿CONTINUE，不从本批历史路径恢复输入。
