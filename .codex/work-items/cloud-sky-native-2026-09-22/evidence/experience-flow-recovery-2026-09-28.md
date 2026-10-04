# B4 前台跟随恢复与合并开发候选

沿唯一PLAN第3阶段处理组合恢复，保留完整交互体验、商业取舍及共享相机/校准/资源owner。没有改选型、重新加工月面、推手机或部署。

## 已修复的结果与适用证据

`sky-orientation-controller`原有两个确定的边界错误：连续两次`hide()`会把已有跟随意愿改写为false，之后`show()`不再连接；隐藏后调用`start()`仍会请求原生方向流。新的前台状态由同一姿态owner管理：重复hide/show不丢意愿或多开流；隐藏时重试只保留待恢复意愿，回前台才获取；显式手动选择仍取消待恢复。原生协调器继续串行获取/释放，校准冻结、最新原始姿态确认、断流失效和旧回调隔离保持。

真实生产controller的两项回归在修改前退出1，分别出现`false !== true`（重复隐藏后未恢复）及`true !== false`（隐藏重试启动了流）；其他既有controller检查通过。修改后两项均通过，还核旧回调不能让新参照ready、重连保留已绘校准方向、须新鲜参照校准、显式手动不重启。受影响姿态/原生协调/手势实际handler/绘制实际paint/相机/Canvas生命周期共63项退出0，Mini typecheck退出0。这是可复现开发检查，不证明手机实际收到重复事件，也不证明物理北向精度或手感。

检查命令：`node tools/run-node.cjs --import tsx --test`加`sky-orientation-controller.test.ts`、`compass-lifecycle.test.ts`、`direction-alignment.test.ts`、`sky-presentation-filter.test.ts`、`sky-manual-gesture.test.ts`、`sky-alignment-render.test.ts`、`sky-browsing-camera.test.ts`及`sky-canvas-lifecycle.test.ts`；类型为`npm run typecheck --workspace @starward/wechat-miniapp`。没有按总测试数量推算Goal完成度。

## 一个合并候选与实际恢复链

普通隔离WEAPP构建`weapp-check-sky-flow-recovery-0928`包含已有新月面、搜索提交保护、日月/行星共享链、模拟地景/夜间低空层和本次恢复修复，没有编入fixture或验收探针。开发代次FLOW0928，API为本机loopback8787；不是干净发布包或可推手机的LAN候选。构建退出0，[日志](experience-flow-recovery-build-2026-09-28.log)保留三类既有CSS顺序/大小/webpack建议警告。Sky JS 328905B，SHA256 `a39758f92466a63b17477d39bba07c69d58bc784a32cae47a9ab07f46f617eed`；只是本地产物字节，不是官方上传包体/运营成本。

官方CLI打开SDK9430之后，首次SDK currentPage超时；exact-project读回已为Map，再次有界连接实际进入。后续操作和抓图均核实际可见FLOW0928，不能凭CLI退出0或本地配置单独绑定端点。实际通过Map搜索公开示例点→云观星→手动→00:00时间tick→中文织女星搜索/定位→85°。地点22.4826799N/114.5557147E、Asia/Shanghai，民用09月29日00:00/16Z，390.4×844 Canvas，4121目录星。

此候选实际沿用应用普通DAY模式，没有预设它继承旧NIGHT候选主题。实际UI恢复路径：手动→跟随手机请求→模拟器仍无可用姿态、保留手动→设置页面→返回Sky→取消跟随。等待、返回和取消后，已呈现描述、真实时刻、85°、Vega定位身份/位置(195.19999694824236,477.1700411168292)及页面主题均与起点相同。动作调用完成后另外等待实际可见结果。

| 实际输出 | 结果 |
| --- | --- |
| [入口/搜索/定位后的手动原生图](experience-flow-recovery-manual-native-2026-09-28.png) | 197×423 PNG，SHA `d371015d76a1a3a623858844e858122f13a9e93eff397dee98e79524060883c1`，已实际查看 |
| [设置返回与取消跟随后的原生图](experience-flow-recovery-returned-native-2026-09-28.png) | 同尺寸PNG，SHA `fd8e24c0f1b2025b62516c275928ed95c402e37a667eada4612726609e1f1272`，前后代次/页面/已呈现描述一致，已实际查看 |
| [区域像素读回](experience-flow-recovery-pixels-2026-09-28.json) | 星图区54040px、地面区13510px均0变化；不比较系统时间区，不推断手机、物理精度或完整跟随 |

入口：[官方打开](../scripts/experience-open-flow-recovery-2026-09-28.mjs)、[同场景复现](../scripts/experience-night-horizon-scenario-2026-09-28.mjs)（FLOW0928、9430）、[恢复链](../scripts/experience-flow-recovery-2026-09-28.mjs)、[带代次截图](../scripts/experience-night-horizon-observe-2026-09-28.mjs)、[区域读回](../scripts/experience-flow-recovery-pixels-2026-09-28.mjs)。旧SDK9420仍不能抓当前候选；9428/NIGHT及9429/SEARCH仅保留历史适用范围。

## 无效试验、清理与未验证边界

曾尝试在官方wx API边界提供明确标注的确定姿态，用于开发者工具校准组合。SDK的callback调用同步`getDeviceInfo`超时，改用公开同步evaluate读回后，官方SDK明确拒绝`mock wx.onDeviceMotionChange`。试验止于这里，没有改写wx方法绕过限制，没有成功姿态流或任何校准结果。此前成功的getDeviceInfo mock和临时全局状态已恢复/清除；[残留状态/恢复helper](../scripts/experience-flow-pose-fixture-2026-09-28.mjs)只允许status/restore，读回installed=false。普通候选源码不包含试验。

恢复链首次脚本错误假设设置必为NIGHT，在实际DAY设置页提前终止；不算完整通过。修正为读实际主题，回Sky取消未完跟随请求后，上述完整链通过。没有把脚本假设失败说成产品缺陷。

真实手机姿态、全天固定朝向/返回最新姿态、完整旋转校准确认/取消/断流、OS后台、控件/标签合成仍未验。开发者工具Canvas覆盖普通WXML的既有差异仍可见，截图不能证明手机合成。新月面手机、本代M51质量/失败恢复、环境远近层次/完整质量、干净候选、性能/包体、iOS、实际费用和独立审查继续开放。

Context更新后`npm run context:validate`退出0，仅核manifest路径/控制源声明，不核事实或普通Markdown链接；`git diff --check`退出0，既有行尾提醒保留。没有按这些工具成功判定产品验收。

恢复时FLOW0928/9430留00:00/85°、手动Vega、普通DAY、地景/星座开/W3关、面板关闭、无临时API mock；源码与手机分代，旧D不升级。Goal工具最终回读active、无预算。下一依赖继续唯一PLAN的剩余组合及目标合并反馈，现场测量不变成模拟环境普遍前置。
