# R1 当前交接修复与证据范围

本轮继续授权内的云观星开发；保原工作区/分支及上一轮未提交文档/脚本，未提交推送。执行入口仅[PLAN](../PLAN.md)，本文件记录证据，不建立第二份下一步。

## 当前代码与检查

`sky-artwork-loader`在原fallback责任内保护一个ready、非wanted的调用方指定备用图；去掉其必须小于保留压力值的资格条件。`use-sky-target-optical`传入当前publication的OVERVIEW/MEDIUM/DETAIL偏好，不新增不可见下载、缓存或状态机。2MiB仍用于一般非当前项淘汰；必要备用图可超过它。Canvas/publication/对象/出屏与原生退休继续由既有owner处理。

新增1024回归在修前明确失败：切到held overview后，medium为undefined；修后覆盖held decode、HTTP失败、GPU失败、重试、暖回及所有五个实际accepted image恰好一次释放。后续实际page暴露仅保bitmap仍会在首次概览上传失败时缺一帧，原公开GPU重试还会resize整个Canvas，清空有效中档；这两处已沿Scene/renderer/page原owner补齐。

Hook提供同publication中已ready、严格较细且真实身份不同的failure-only备用描述。frame/identity验证准确asset与fieldDegrees；只有主提交失败才在同帧、后续图层之前按备用自己的TAN/范围再提交，完成来源消费真实结果，不把中档改名概览、不扩其外沿。主层成功但空/未知不触发替换；已退休/错publication/错asset/错level备用拒绝。光学公开重试仅复位原可选光学shader失败latch、调度绘图并释放失败native bitmap，保原Canvas及有效图层。一般家族恢复不改。

最终8文件影响检查72项：71通过，1科学实际出版路径缺外部fixture条件跳过，0失败；Mini类型检查通过。含loader/文件、旧/科学/Prepared/display、同帧备用真实来源、无效描述/退休拒绝、对象/版本/出屏及公开原Canvas重试。旧两fixture补真实pixels和fallback参数转交；不放宽预期。初次fixture类型诊断与修复事实保留，不称首次通过。旧Pro咨询没有运行本轮修复，独审仍MISSING。

## 实际page/Scene与旧owner反例

复用原完整Taro JSX、React/Query/官方生命周期、当前HTTP、v2三PNG及受控native/software WebGL，仅增加只读时序/贡献/资源记录。新的task脚本在`scripts/build-prepared-handoff-2026-10-05.mts`和`experience-prepared-handoff-2026-10-05.mts`；原retention脚本及失败结果保留。源码与backend/public资产前后绑定读回；普通registry空。

- 修后`output/playwright/cloud-sky-prepared-handoff-1005-r2/`：511输入、89请求、57 Scene。概览暖回3帧与细档暖回3帧均有准确Prepared来源；回细先MEDIUM后DETAIL，最终GL/RGBA精确恢复。三PNG均仅首传。
- 固定e2136ebf的原loader/Hook作为两项明确task源码替换，未修改工作树或其余当前消费者：`output/playwright/cloud-sky-prepared-handoff-1005-before/`。同路径概览连续两次null，一帧仍带medium引用但没有完成资格、随后一帧无光学输入，首null回执到正来源回执约237.4ms。它是软件任务完成时序，不是手机或显示器scanout测量。历史回细档第三null此轮未复现，不能归并成已解释。
- `...-delay-r3/`完成：初始OV503保证fine端仅两张1024成功；公开概览重试后将原decode回调交付延迟约602.7ms。暖回继续用MEDIUM真实范围，概览ready后接替，再回细；warm source-null为0，最终退休通过。
- 保bitmap但尚未补Scene/重试的`...-gpu-before/`保失败反例。概览首次upload失败的首null至MEDIUM正来源约196.4ms；原公开GPU重试resize整Canvas后首null至OVERVIEW正来源约884.6ms。Scene输入有有效OV不等于实际提交/完成有来源；bitmap未释放也不证明同帧可绘。
- 最终`...-gpu-after-r3/`：511输入、92请求、56 Scene；精确主光学LINK_STATUS故障一次，公开重试原Canvas恢复；概览HTTP503一次；概览decode交付延迟611/607.4ms；OV texImage2D返回INVALID_OPERATION一次。该失败Scene先主提交失败、再以有效MEDIUM同帧成功并产生其确切来源；公开原Canvas重试不退休有效MEDIUM。11暖回完成帧均有Prepared来源，最终细档GL/RGBA精确恢复，最终native/GPU/lease活动资源均0。成功PNG各首次转移；重试未重传有效PNG。
- 全部失败控制保留：`...-r1`缺TSX backend config；`...-delay`初次fine-first仍经过粗档；`...-delay-r2`驱动误用列表按钮文字；`...-gpu-after`shader标识误击辅助contribution而非主shader；`...-gpu-after-r2`驱动重复HTTP重试提前消费已发生GPU失败、观察顺序错误。它们不冒成功，也不把修后的工具控制错误算产品缺陷；修正只在新exclusive运行目录验证。

所有时长仅限受控软件Scene/完成回执时间，非WEAPP手机、显示器scanout或物理测量。最初历史`prepared-progressive-retention-1005-r2`回细第三null没有performance时戳/native-current/retiredAt；旧owner新重放未再出现该第三null。其“同OV引用而无optical call”与旧trim/React交接风险相符，仍不足认证历史原因/可见时长，保UNKNOWN。当前新回归及全部暖回连续证据不追认过去。

## 同时间资源与方案取舍

当前测定光学bitmap源RGBA等效为9→5→9MiB；旧为8→1→8MiB。细档多保已ready概览1MiB；概览多保最近适用中档4MiB，以允许概览upload失败时恢复。只保护一个非wanted备用项，不把所有旧active保住。相对常驻请求OV的方案，这不启动第三个隐形请求；相对仅暂留旧项直到decode完成，这保留GPU失败恢复资格。后续真机总峰/帧时仍须判断取舍。

修后本路径整场GPU texture/upload/copy逻辑峰11,800,576B、native源RGBA等效峰13,369,344B，与旧retention基线同量级；不同层MAX不得相加成物理峰，逻辑copy账与source-RGBA不是driver/OS容量。最终Map/clear native登记、GPU句柄与租约退休通过；持久encoded文件保留与活动退休分开。

一次有界整纹理/现窗口比较只替换task build内的光学texture-window表达式，其余生产owner/素材/时刻/相机一致，工作树不采用候选。原始运行`...-whole-ab`与`...-window-ab`及[绑定归约](prepared-handoff-cost-ab-2026-10-05.json)保留：

| 软件场景指标 | 整光学纹理候选 | 当前窗口 |
| --- | --- | --- |
| 首次DETAIL稳定Scene入口全部纹理模型 | 9,793,688B | 6,385,816B |
| 首次DETAIL同时间upload/copy临时纹理模型峰 | 9,793,688B | 11,235,480B |
| 暖回DETAIL两次实际光学full upload | 8,388,608B | 8,388,608B |
| 暖回DETAIL phase所有copy（observer未绑定源texture，不能全冒光学） | 0B | 3,358,720B |
| 暖回DETAIL单次软件Scene时耗中位/最大 | 66.1/71ms | 68/69.9ms |
| 整场纹理模型峰（两者由更早其他家族主导） | 11,800,576B | 11,800,576B |
| 光学native源RGBA等效fine→OV→fine | 9→5→9MiB | 9→5→9MiB |

两路径暖回均无null、最终活动资源0；同相机/时刻全GL读回细档13通道差/最大1，概览309通道差/105像素/最大23，严格像素等价FAILED。不能只看稳定驻留忽略窗口full-upload＋copy临时峰；也不能凭一次软件时耗或较少copy改成整场常驻。暂保现窗口、候选不采用，没有加缓存/调度框架；对应物理/帧时及像素差原因仍保验收与后续具体瓶颈边界。

## 独立依赖与保留义务

原WEAPP watch PID18132仍有效并对源码变化成功编译；不是当前DevTools画面证据。一次官方`check_wechatide_status --skill-version 0.3.11`经工具内重发现/认证后返回`MCP_INIT_ERROR / This operation was aborted`，无成功登录/页面回读；没有人为循环重开/刷新或新设备调用。

ESO eso0932a公开JPEG已单次获取到`output/eso0932a-source-1005-r1/eso0932a.jpg`，6000×3000、8,228,817B、SHA256 `60400c92c54b7c1bd12299c69e83b16e5b6256e7dabacc478c021758ecd28179`，实际全图已查看。仍是候选；metadata含原creator/credit/CC BY4.0、仅尺寸，无完整WCS。方向/投影/极区与历史行星仍待决定，未加工或接普通registry。

修后独审MISSING、WEAPP/WXML当前未验、Android/iOS及新版月面手机未验；图质/科学UNKNOWN/普通registry空及全部33项有效义务保持。自检或旧Pro咨询不认证本轮修复。
