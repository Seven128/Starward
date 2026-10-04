# 连续浏览工作集、星座热路径与合并开发候选

本轮完成D的一个实测瓶颈修复，并在同一无诊断clean-v5中核连续缩放、图层切换、设置往返及资料/时间/跟踪组合。完整体验、目标内存/性能和最终验收仍未完成。用户最新指令“真机暂时无法使用，你先用微信开发者工具开发”已记录到[用户指令](../USER-UPDATES.md)，当前只继续开发者工具；不再操作、捕获或投递手机。

## 用户结果与责任

生产星座线owner原先先细分所有朝前且在地平上方的圆弧，最后才裁视口。实际676条出版圆弧在0.05°局部浏览时仍产生数万次不可见线段裁剪。现在复用`skyArtworkViewBounds`的视口球面帽，在每段圆弧细分前以中点及半径保守排除完全不相交部分。完整视口仍须处于前半球；保留地平/朝前裁剪、弧度误差、颜色与共享GPU提交。不能仅凭两端点在视口外排除弯曲穿越的星座线。

没有新引擎、逐星座补丁或第二份可见性数据源。图片仍由已有loader和GPU纹理owner按解码RGBA管理，恢复文件/原生bitmap区分沿用[clean-v4资源修复](experience-resource-ownership-combined-2026-09-28.md)。源码身份见[前后指纹](experience-constellation-cull-source-identities-2026-09-28.json)，旧源码快照只供修前反例，不参与运行。

## 实际数据与修前反例

当前正式示例点、UTC `2026-09-28T16:00:00.000Z`、Canvas390.3999938964844×844；用当前BFF观测帧和已出版`stellarium-modern-v24.4.v3`的676条圆弧。私有route/Context只在内存中用于读回，未输出或保存。

| 条件 | 旧/新叶级裁剪次数 | 旧/新主机CPU中位毫秒 | 可见结果 |
| --- | --- | --- | --- |
| 北向、25° | 822 / 28 | 2.2415 / 0.4053 | 同样15段 |
| 东向、5° | 1804 / 0 | 2.9055 / 0.2799 | 同样无可见段 |
| 北向、0.05° | 13517 / 0 | 22.2709 / 0.2019 | 同样无可见段 |
| 西向、0.05° | 12527 / 0 | 21.3586 / 0.1928 | 同样无可见段 |
| 偏移中心、0.05° | 22603 / 1 | 37.5698 / 0.2946 | 同样无可见段 |

每个时刻样本7次，仅计该CPU组件主机执行，不能推导微信整帧或手机倍速。[修前](experience-constellation-hot-path-before-2026-09-28.json)、[修后](experience-constellation-hot-path-after-2026-09-28.json)与[任务脚本](../scripts/experience-constellation-hot-path-2026-09-28.mts)保存条件和原始样本。

真实旧生产owner逐字节临时恢复时，针对完全视场外圆弧的回归以64次裁剪失败；`finally`恢复当前源码，未与构建并行。当前回归同时核两端都在视口外但弧线穿越视口的正向情况。[修前失败](experience-constellation-cull-before-regression-2026-09-28.log)、[受影响消费者22项](experience-constellation-cull-affected-2026-09-28.log)、[类型](experience-constellation-cull-typecheck-2026-09-28.log)均保留。没有添加机器速度阈值测试。

## 绘制保真与GPU边界

[实际观测帧矩阵](experience-constellation-hot-path-matrix-2026-09-28.json)含12朝向×3高度×5视场及4个偏移/73°旋转条件，共184项，其中92项真正有可见线。旧/新线段数组逐项相同，合计叶级裁剪840090→4675。[生产TWGL帧缓冲](../../../../output/playwright/cloud-sky-constellation-working-0928/result.json)在同尺寸安装版Chromium/SwiftShader中184项都是0差异像素；有可见像素的92项防止空图冒充通过。[实际线图](../../../../output/playwright/cloud-sky-constellation-working-0928/actual-lines.png)已查看。

该绘制组件实测创建/释放3个buffer、3个program、6个shader，最终各0，无GL错误。只证明生产线pass和组件释放；不证明整页WEAPP/native内存、GC、手机合成或帧时。相关运行责任已更新既有Context，[结构校验](experience-constellation-cull-context-2026-09-28.log)通过，不把结构成功当产品验收。

## clean-v5连续浏览与返回

[构建](experience-combined-clean-v5-build-2026-09-28.log)及[官方CLI准备](experience-combined-clean-v5-prepare-2026-09-28.log)产生独立无诊断候选`weapp-check-sky-combined-clean-v5-0928`，SDK9438、独立8789本机API。[候选指纹](experience-combined-clean-v5-candidate-2026-09-28.json)：SHA256 `0787c3e850bbf05f7e36965b0aada21f0f8cf923edbc9aa815b3fb3738116826`，257原文件、4,450,215B，比v4只在Sky增加152B。没有临时代次、vConsole、验收存储或mock；保留原三类构建警告。原始字节不是官方包体；loopback开发包不推手机。

[官方SDK实际输入和文件读回](experience-working-clean-v5-native-2026-09-28.json)经过公开正式点入口、手动/00:00、Vega搜索定位；三轮0.05°→1°→5°→25°→39.9°→85°→267.8°→W3开关→25°星座开关，再设置往返。34个公开已呈现状态都有同一16:00Z，无遗留资料/选择/列表面板。星座恢复仍识别天琴座；返回同页、同Canvas尺寸、同视场/定位/时间。[任务脚本](../scripts/experience-working-clean-v5-native-2026-09-28.mjs)只走公开控件及触摸，没有`setData`或方向mock。

| 实际本候选文件结果 | 文件数/编码字节 | 文件头推算RGBA字节 |
| --- | --- | --- |
| 缓存预热后25°及全天W3关 | 8 / 913737 | 14155776 |
| 全天W3开 | 19 / 888326 | 18350080 |
| 页面隐藏 | 0 / 0 | 0 |
| 返回、25° | 8 / 913737 | 14155776 |

第二/第三轮相应结果一致。164个既存历史/其它候选文件始终保留，未手工删除，也不算本候选泄漏。文件头尺寸无未知项；RGBA推算是已编码文件的尺寸总和，包含独立缓存，不能当活跃GPU纹理、native分配或峰值内存。观测器读取文件有自身成本，未从这段采集推导帧时。当前loader/GPU限额按RGBA而非编码字节，未人为放宽预算。

[原生截图](experience-working-clean-v5-vega25-2026-09-28.png)已查看，[绑定记录](experience-working-clean-v5-capture-2026-09-28.json)在截图前后核同页、已呈现条件及257文件未变。现停正式示例点09/29 00:00（UTC16:00Z）、25°手动Vega、天琴座，普通DAY、地景/星座开、广角W3关、无跟踪或面板。Canvas盖普通WXML仍是已知DevTools合成差异，未据此裁定手机效果。

[当前服务读回](experience-combined-clean-v5-service-readback-2026-09-28.json)证LOCAL/MEMORY_TEST/LOCAL_TEST中的16:00Z Context、W3 v2/51条未知覆盖及月面coverage-v2出版/PNG。仅本机fixture，不证明生产持久化、云运营或新月面送达手机。8787旧共享内存与v1缓存保留，8789 exec49882仍持有当前Context。

## 观察失败与未完成项

一次原生Canvas selector/GL查询超时，没有获得可靠GL或内存观测；没有据此重启服务或安装永久探针。MCP一次返回需登录，随后正式状态检查为`loginExpired:false`、版本相同；SDK仍能绑定同一候选截屏和读回。账号详情未保存，工具失败不当产品通过或真实登录阻塞。

用户指令前的只读设备检查曾见无线通道可达；用户随后明确暂不可用，故停止真机流程，未捕获、输入、预览、绑定或推送v5。旧D不能验收新月面或本轮修复。当前Goal active、无预算；未部署、采购、提交或推送。

下一依赖以唯一[PLAN](../PLAN.md)为准：沿同一候选处理B3/C整页实际差距及D剩余稳定性，已覆盖组合不重复；保留B3完整构成/质量、源图与配准差距。真实姿态/校准/OS后台、Android/iOS合成、首屏/帧时/GC/native内存/流量/官方包体、固定最终候选、独立审查和实际费用仍须相应证据，不由本轮局部性能与文件结果关闭。

## 后续恢复与窗口退役

恢复时官方SDK连接仍在，但应用页栈实际为空，MCP/SDK均无法取得page metadata；不是登录过期或BFF终止。用同一候选公开地图入口重进，明确手动并提交00:00、Vega定位/25°；本机服务未重启。随后用户要求关闲置窗口，已关闭12个历史项目窗口，已关闭v1的残留自动化进程退出；旧SDK端口已退，当前只用9438。构建/证据保留，本文此前的v4/v3/v2等恢复点仅为关闭前历史条件。

v1再次关闭的工具请求未返回，结束观测后确认残留进程仍属于已关闭9434候选、与当前9438分离；普通结束被拒，使用本机既有gsudo权限在同一身份守卫下结束该旧进程。未结束主程序或当前候选、未删除任何文件。本轮[截图探查](experience-combined-clean-v5-flow-capture-probe-2026-09-28.png)按项目MCP前后核同页/已呈现条件并已查看，实际星场/线/插画保留；仍是DevTools合成。首次组合脚本因官方SDK`App.captureScreenshot`的5秒观测期限退出，仅初始状态已完成；保留[失败尝试](experience-combined-clean-v5-flow-attempt-2026-09-28.json)，不能记作来源/跟踪通过。改用既有共享默认期限并独立记录下一次尝试，不改生产代码或目标预算。

后续观察器失败分别保留：[r2](experience-combined-clean-v5-flow-attempt-r2-2026-09-28.json)错误要求来源正文含数字7001；实际route为HR:7001、资料HR7001、来源标题Vega及BSC5P/HEASARC已经加载，改为核实际身份链。[r3](experience-combined-clean-v5-flow-attempt-r3-2026-09-28.json)在新时间尺挂载前读取tick；随后实际48项包含01:00，改为有界等待目标控件。[r4](experience-combined-clean-v5-flow-attempt-r4-2026-09-28.json)只注入scroll事件，没有移动原生滚动条，其后真实原位置事件将预览带回00:00；该尝试不能认证01:00绘制。用官方SDK移动实际ScrollView后已看到17:00Z/4145星及跟踪预览，并用公开时间按钮取消回16:00Z。这些属于任务观测路径纠正，不是生产修复或手机手势证明；后续完整结果单独记录。

## 同一候选组合结果与精确倍率核查

[组合及公开复位](experience-combined-clean-v5-flow-r5-restore-2026-09-28.json)记录同一不可变候选的Vega/HR7001资料→BSC5P/HEASARC来源→返回，跟踪00:00→真实ScrollView预览01:00/17:00Z→收起取消16:00Z→提交00:30/16:30Z→来源返回→完整全天→局部→单指拖动停止→重新跟踪。实际本机Context在预览期间仍为16:00Z，提交后16:30Z；夜晚localDate仍09/28，民用已09/29，符合原合同。拖动后的标记从中心移至230.255/447.023逻辑像素，再跟踪回195.2/422。仅官方SDK输入、公开控件和LOCAL/MEMORY_TEST/LOCAL_TEST读回，不证明物理手势/姿态/后台或手机合成。

[r5主链](experience-combined-clean-v5-flow-attempt-r5-2026-09-28.json)在最后复位错误要求停止跟踪且改时刻后仍存在旧定位标记而退出；实际owner按时刻校验撤回过时定位，不能沿旧位置点选。没有重复前面已完成的组合：`r5-restore`只从其已完成事件继续，用当前时刻公开搜索Vega→HR7001资料→定位，恢复16:00Z/25°手动、地景/星座开、W3广角关、无跟踪和面板，Context也实际读回16:00Z。[脚本](../scripts/experience-combined-clean-v5-flow-2026-09-28.mjs)保留有界尝试和该纠正，不把r5原始exit1写成整次脚本通过。原257文件始终逐文件核哈希未变。[最终图](experience-combined-clean-v5-flow-r5-restore-final-restored-2026-09-28.png)和跟踪来源返回图均已查看。

[第一轮像素记录](experience-combined-clean-v5-flow-native-pixels-2026-09-28.json)的两次来源返回星图区均0差异；使用取整ARIA视场求倍率的全天往返有差异，不能据读数相同宣称精确尺度还原。因此仅补一次[精确倍率实际往返](experience-combined-clean-v5-exact-zoom-2026-09-28.json)：公开宽视场定位将视场规范为45°，按其实际倍率到25°；用实际Canvas/控件测量求完整圆盘267.79041465577143°，到全天后按完整数值回25°。时刻、中心、跟踪状态与真实星场保留；[前](experience-combined-clean-v5-exact-zoom-before-2026-09-28.png)、[全天](experience-combined-clean-v5-exact-zoom-all-sky-2026-09-28.png)、[后](experience-combined-clean-v5-exact-zoom-after-2026-09-28.png)保留，后图已查看。

精确往返的SDK截图是488×1057，早前组合截图是197×423，均不是Canvas逻辑尺寸变化。固定物理像素边距混入高分辨率截图的圆角和底部手势区，严格零差异断言以314px/最大144灰阶失败，[原日志](experience-combined-clean-v5-exact-zoom-2026-09-28.log)与原记录保留。按[实际safeArea](experience-combined-clean-v5-exact-capture-bounds-2026-09-28.json)和每图比例、统一8逻辑像素边界重新计算：[核查](experience-combined-clean-v5-exact-pixels-bounds-2026-09-28.json)的精确往返星图区为7px各差1灰阶，两次来源返回仍0。零差异没有通过，不追改生产代码来凑零，不凭这几个像素扩大普遍完成条件；也不把该结果称手机精度或整体质量验收。取整倍率的旧往返差异仍保留，不升级为精确证据。

当前仍只有clean-v5/9438，16:00Z、规范后的25°手动Vega/天琴座、普通DAY、地景/星座开、W3广角关，无跟踪或面板。没有新生产修改、构建、手机投递或部署；下一依赖按唯一PLAN转向已有B3/C整页实际差距及D剩余稳定性，不重复已覆盖的组合。
