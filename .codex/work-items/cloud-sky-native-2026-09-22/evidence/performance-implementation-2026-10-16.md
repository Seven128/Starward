# PF02/PF03 与证据触发 PF05 的本地实施

用户已在本对话正式恢复完整 Goal，并在一次主动中断后明确“继续”。唯一 PLAN 保持 SHA `c2ec8d4f8faa65cb5c2ba98a7892005a9eb3a20e53fa07a338d54d58b5e0c675`；原33行 SHA `d26d632c317699321250bed6ea91611b06ab6dfbb28575eca0200512cf6973d9`。本记录是实施/证据，不是第二方案。工具首次无Goal后创建无预算完整Goal成功；中断后一度读回paused，用户继续及授权独审后get_goal曾读回active、无预算，未重建或伪报完成。

材料归原 output owner 下的 [PF实施目录](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/pf-implementation-2026-10-16/)。`implementation-start.json`保存分支/HEAD、r368修改前15项输入一致与前像；本批未切分支、清理、提交、推送、手机操作、服务重启或外部部署。忽略output及全部旧成果保留。

## 已实施的责任

- **PF02：选中层幂等退休。** `sky-selection-reticle.clear`读取实际尺寸，只有非零backing才写0；不以context是否存在代替释放判断。surface的可选层退休同样避免重复零写，dispose退休context引用。实际surface计数端口中，120次无标记present由240次setter变0；激活→撤回→再次激活保三段当前几何，失败getContext留下的非零尺寸仍可释放。两条回归修前失败，修后surface 11/11（`pf02-before.log`、`pf02-after.log`）。这是减少确定调用，不是手机拖动/耗电收益。
- **PF03：有限续约进入原writer。** Page相机/星点/名称/就绪图片共用成功copy后的continuation请求，退出Page的timer16→RAF串行等待。原Canvas clock的`scheduleFrame`走同一display RAF；缺失/失败时保16ms动画fallback，实际deadline和初始准入不变。新输入/资源可替换待续约准入；latest、单writer、取消/retained Sources/resize/dispose与结束idle由原生命周期持有。真实ready-image owner在160ms受控时轴上以11次准入到达原0.5目标并回idle，只有watchdog timer；实际Page非导航camera回调也只在copy后续约、结束停止。owner 26/26、Page最终7/7（`pf03-owner.log`、`pf03-page-renewal.log`）；虚拟时轴不是手机帧率，不声称密集拖动翻倍。
- **PF05：当前SAO集合身份。** 先用当前真实v2供给、47片/2197点及实际loader/aggregation确认相同内容重复发布，再让loader稳定当前有序tile引用数组；完整状态未变不再发布。真实tile对象/顺序/视图或loading/failed变化照常立即发布，dispose释放该当前集合。无新timer、排序、预取、缓存或预算。修前初始48次发布含31次同内容重组，修后17次有效发布且0次同内容重组；取消三个在途请求并健康retry/pause/resume时，8次同内容重组变0，仍发布加载true/false两次状态。所有记录保持47片/2197点，首有效数据未推迟至停手。绝对CPU样本有顺序/主机噪声，未据其宣称整体CPU或物理改善。见`pf05-arrivals-before.json`、`pf05-arrivals-after.json`；回归修前失败、修后loader8/8及实际Hook/Query消费者通过。

## PF01/PF04 有界小路径的裁决

`observe-current-preparation.mts`复用现有私存公开fixture、实际transport准入BSC8404行、时间MODEL、星座、SAO选片/转换及生产Scene；无网络、GPU或重制UI。4组ABBA采用明确控制的16ms producer/32ms准入，每组32tick/16个准入；原time owner把所给elapsed参数按1x映射至512ms观测时间，这不是一次真实墙钟播放验收。coalesce将准备32→16，全部16个对应输出的精确at/身份/绘图命令hash完全相同；每帧1452星点、308线段、1198可拾取对象、47片，非空。

**本轮不采用播放生产/准备重接。** 准备计数可减不等于总收益：baseline总wall约280.8/283.5ms，candidate约373.6/289.6ms，未建立稳定整体成本收益；Scene计时包含命令序列化观察成本。MODEL单次约0.14–0.24ms，星座/SAO各有额外成本，但本试验未测真实Page的prepare/accepted比例，也未验证把公共time/查询/选择/跟踪/来源共享提交接回原writer时没有额外RAF等待。按PLAN“无收益或合同不能成立保原”的停止规则，保原interval、精确时刻、暂停/coverage、Map共享提交及恢复。`current-preparation.json`保全部非空结果/输入hash/源pin；不把控制时序推定为设备当前瓶颈。以后只有相应新证据才重开，不为这一计数反例做全仓状态重构。

PF01在本批回答当前实际owner的重复调用/集合及准备成本，不关闭native input-to-screen、GPU、copy/合成、热机或物理内存。当前没有纹理到达堆叠的新有效证据，原defer条件未满足，不重跑旧无收益upload实验；Page后续只采用下方实际热点，分配/atlas等候选未因表格而实施。

## PF01/PF05 追加：accepted守卫与搜索列表

独审结束后继续核尚未归因的Page责任，沿相同真实BSC8404行、47片/2197 SAO点及实际Scene，执行当前Page的paint/presented与实际catalogFrameObjects声明。49次非空绘制均完成受控copy；同输入16帧的7类UI setter都保持0次值变化，说明现有同值守卫已有效，不能把setter次数冒React额外渲染。相机改变时相机/名称发布，精确时刻变化时data/frameAt/星表/星座等发布，未节流权威命中和来源refs。这些是实际回调加受控平台端口的本地证据，未测React提交、Taro setData、原生copy或像素。

搜索列表的不同结果是同输入80次派生反复扫描排序4115项，79对值完全相同却无同一数组；本机排除前8次的中位10.65ms/P9515.07ms。Page仅将原IIFE改为useMemo，依赖原开关、精确row/report、补充星表frame、basis、FOV、宽高/中心及mode；不改列表算法、排序、来源、当前帧发布或运动路径。修改后80次派生只计算1次、79对复用同一数组，中位0.030ms/P950.051ms；全部80份值/顺序hash与修改前一致。绝对耗时受主机和VM影响，可靠结论是消除未变输入的重复工作，不能冒手机搜索延迟或整体帧率收益。原始结果为`page-accepted-observation.json`及`page-accepted-memo-observation.json`；前脚本和r369生产前像保存于`r369-page-list-preimages`。

针对性回归先因同输入不复用真实失败，修改后验证同输入及全部实际依赖失效、关闭跳过/重开和原日月绑定/搜索运输共3/3。首次修后一次失败是新增夹具给了不合法的reportData={}，已改为保持skyScene结构的缺星表输入，不改生产准入或断言；全部修前/修后日志保留（`pf05-page-list-before.log`、`pf05-page-list-after.log`、`pf05-page-list-after-r2.log`）。最终App类型exit0。该局部memo由root核对，不把先前r369独审扩为r370新增差异的独审。

## 检查、夹具失败与当前普通包

- PF03相关Page/手势/校准/ready/本体/标签初跑161项，157通过、4失败；同一份旧Page前像复核仍有相同4个`browsingCamera.accept`缺口。共享测试adapter现在为局部camera端口补齐已有accept/current默认值；不改行为断言或生产相机。受影响6项修后通过，新加实际Page续约后最终7/7。其余155项未在没有新风险时重复全跑。
- PF05实际Hook/缓存清理/恢复检查初跑17项，14通过，3个旧触控夹具缺`paintedSkyObjectsRef`/`navigationRequestRef`。触控handler在本批未改；补两个当前端口后该文件6/6。初跑日志、前像和修后日志全部保留。实际SAO Hook/Query的11项已过，不把夹具失败写成产品回归或删断言。
- App类型在PF02/PF03后及PF05后各真实exit0；Context校验exit0只证明manifest及声明结构。未跑整仓套件、无新mutation/原生/物理验收。
- **r369 `finite-frame-current-clean`** 本地普通WEAPP build0，SHA `6d37d62c30b68addc9b286e5d4b45f198627d97fa12d57b1f9c13c3106826ede`，285文件/4,917,509B；main2,075,616、content1,012,709、spot354,045、sky1,475,139B。预算、编译origin、源/复制包fingerprint及16项源码pin通过，详原owner的`r369-interaction-readback.json`。无HUD/慢放/observer，未打开IDE或推手机；r368保留，手机最后仍r322。源码与本地包已有新一代，旧手机/模拟器不代验。
- **当前r370 `finite-frame-list-current-clean`** 在r369上仅增加上述列表memo。本地普通WEAPP build0，SHA `feb8a6ce68de936dacbf440065a3a40b8c039b43b704a3179a454a586f3401a6`，285文件/4,917,585B；main2,075,616、content1,012,709、spot354,045、sky1,475,215B。较r369增加76B，主包不变。`r370-interaction-readback.json`核预算、编译origin、源/复制包及16项源码pin，PLAN与原33 hash不变；旧候选全部保留。无HUD/慢放/observer、IDE、preview或手机操作。build session92563已收exit0；手机最后仍r322。

最终[current-r370-source-preservation.json](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/pf-implementation-2026-10-16/current-r370-source-preservation.json)再次核当前16pins、分支/HEAD、唯一PLAN及原33一致；相对r369独审仅Page局部memo改变，其余15pins不变。完整本批差异归`current-r370-change.diff`，旧`current-change.diff`仍保独审r369输入，不覆盖原前像/回执。

## 验收边界

用户已明确“允许新建只读审查子代理”，本批新建`/root/pf_runtime_review`已独立核对要求、差异、消费者、实际结果及r369的16项源码pin，未发现本批PF02/PF03/PF05确定可行动缺陷，PF04保原裁决亦符合PLAN。其原文与范围归[只读审查回执](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/pf-implementation-2026-10-16/pf-runtime-independent-review.json)；代理已结束，未修改、运行测试/构建或操作任何UI/设备/服务，不复用。旧独审范围不扩张。

新原生帧节奏/透明层合成/持续成本、实际React/WEAPP连续运行、Android/iOS和物理资源保持UNVERIFIED。已知模拟器合成FAILED无新平台条件，不重试旧失效入口。原33及全部有效UX、M51/M8图质FAILED、5正文源缺口、3公共接入、真实云端/容量与其它FAILED/UNKNOWN/MISSING均保原。图像冻结、无障碍取消、红光暂缓、Stitch不用等边界保持。完整Goal未完成。
