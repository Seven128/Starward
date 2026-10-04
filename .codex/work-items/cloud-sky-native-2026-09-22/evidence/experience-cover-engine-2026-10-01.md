# 当前模拟器交互与覆盖层边界

本轮复用同一开发者工具项目、SDK3.17.3、普通 watch 和任务 BFF；没有操作手机。完整输入、原图、安装源码片段、配置字节恢复和475条冻结事件见[绑定](experience-cover-engine-binding-2026-10-01.json)。这项试验没有改变产品源码，也没有解决当前合成缺陷。

用户询问是否只能打开和截图后，官方 SDK 向实际 Canvas 发送了视口坐标 touchstart/move/end。前后原图中仙王座及周围星区确实移动，页面仍为同一观测时刻/Context的 READY 手动场景。这证明目前可以通过 SDK 操作模拟器页面；不认证物理鼠标、真实多点手势或隐藏控件可见。随后配置编译已重新进入原 North45°，当前画面不再是演示后的平移视角。

普通控件的实际 SDK 几何可用：左下 dock 为(12,662)/88×148、display:flex、visibility:visible、opacity:1、z-index:12；返回和快速信息也有视口内几何。完整原图仍没有这些覆盖控件。已有节点和样式不能证明实际显示，也还不能确定根因。

本轮新增一个直接嵌在实际 Canvas 原生数据子树中的160×44诊断 CoverView，坐标(20,400)，高对比色。SDK读回相应几何，但原图没有它；随后仅清除本轮拥有的子节点，Canvas children恢复0。这是原生数据诊断，未迁移为经过验证的 React/Taro 产品控件。此前扁平 CoverView 和全尺寸离屏 WebGL→页面2D失败仍保原记录，不重放。

[安装源码证据](experience-cover-engine-installed-source-2026-10-01.json)表明该 Nightly 版本的项目配置解析器默认 `coverView:false`，并接受布尔覆盖声明；配置说明将其用于工具渲染器与基础库渲染器的选择。**现场实际生效的渲染器值仍未暴露。** [Taro官方说明](https://docs.taro.zone/docs/components/viewContainer/cover-view)支持原生 canvas 上的 CoverView，并给出原生父组件嵌套示例；它不证明本项目当前运行时合成有效。微信三条组件文档读取失败，未无依据重试。

这个新源码证据支持了一次新的有效配置试验：两个已有 common 配置临时显式声明 `coverView:true`，派发一次编译后立即取无等待截图；只有新原图出现真实应用后才读 SDK、复用原 Context 进入 Sky。普通控件及相同 Canvas-child 诊断仍未显示。随后删除拥有的诊断子节点，两个配置逐字节还原，派发恢复编译，同样经实际应用图像后才重入原场景。没有新增 private 配置、IDE/watch/BFF重启或基础库切换。

此有效试验状态为 **COMPLETED_DECLARATION_COMPILE_LIVE_APPLICATION_PROBE_UNADOPTED**，当前普通覆盖合成仍为 **FAILED_DEVTOOLS**，根因未定。此前过早 SDK/恢复编译的414事件试验仍是无有效结果；此次475事件证据不改写历史，也不证明现场引擎值。配置及88个原生产输入、6个无关修改、普通 bundle 在本试验绑定时保持；后续已绘帧修复另行绑定源码与原生代次。

恢复 checkpoint 为 North45°/4051颗BSC/两个目标/原2026-09-30T13:50:33.000Z，10个编码文件共1,789,615B；HTTP revision1、时刻与指纹一致，PUT0。文件字节不是decoded/GPU/OS内存。完整覆盖层、选择呼吸/名称、资料时间返回同页组合、Android/iOS、新月面、总资源/帧时/包体/费用和最终独立审查均未关闭。没有新机制证据时，停止重复覆盖层/启动试验，按唯一PLAN继续独立的同帧与组合责任。
