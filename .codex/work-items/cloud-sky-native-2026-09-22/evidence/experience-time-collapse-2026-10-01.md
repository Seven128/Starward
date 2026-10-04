# 收起时间披露撤回未提交时刻

本轮沿唯一 PLAN 的整体时间／返回旅程修复隐藏的时间预览。Goal active、无预算、未完成。源码、原图、普通 watch、原服务和 1045 条冻结事件见[绑定](experience-time-collapse-binding-2026-10-01.json)；960 条历史前缀逐字节保持，不升级早前完整相机／有限像素结果。

修前当前模拟器从原 UTC13:50:33 播放，暂停后的已绘帧为13:50:37.947；点击公开“收起时间轴”后，时间披露消失，已绘帧仍为13:50:37.947。再次展开并点击公开“取消”才恢复13:50:33。两份原始 PNG 已实际查看；普通 WXML 控件仍未合成到图像，公开 SDK 事件和已绘 Canvas 事实只证明这条开发路径。

根因位于披露关闭边界：`OrientationTimeRuler` 卸载只取消活动拖动；播放／暂停及搜索定位预览没有这种拖动会话。页面原来收起时间轴仅关闭面板，切换列表仅暂停播放，未撤回这些未提交时刻。

`spot-sky-page.tsx` 现在在这两个关闭边界调用原 `setPreviewIndex(null)`，由既有 `sky-observation-time.ts` owner取消呈现意图。没有增加时间、Context或传感器来源。重新展开保当前意图；列表独立打开仍按原规则暂停当前阅读时刻；已提交时刻及在途时间提交仍归原Context owner，关闭面板不发起提交。编辑中原同步姿态状态守卫继续拒绝这些入口。

实际源码回归调用页面公开 dock callback、原页面时间委托及真实便携时钟。最终同一检查对冻结修前源有四个需求反例失败，修后通过；覆盖 UTC+8 午夜、活动／暂停播放、定位预览、迟到定时器、新提交Context、重新展开及编辑守卫。早期检查错误地把React setter当成同步修改当前闭包，导致两个列表用例失败；改为保当前render捕获值后，同一最终检查仍在原源上失败。原日志保留，产品修复没有随这个夹具纠正改变。

| 当前普通原生公开操作 | 已绘结果 |
| --- | --- |
| 播放→暂停→收起 | 从实际前进的帧回到原UTC13:50:33 |
| 播放中→收起 | 回原时刻，后续观察没有被旧播放恢复 |
| 播放中→天体列表 | 时间披露退出，回原时刻，列表入口保持 |
| 重新展开→收起 | 无隐藏“设为观测时间”预览，播放入口恢复，原时刻保持 |

一份源码批次复用普通 watch，20:31:13编译完成；只派发一次现有模拟器刷新，立即捕获并实际查看应用Map图后才用SDK重入原Context。七份原始PNG均已查看。末次已绘事实仍为手动45°／4051目录对象／两个目标／原时刻；动态公开树中部分自定义场景字段缺失，本批复用已有已绘accessibility label，没有重新做完整相机或像素配对。9个编码文件／934,831B及摘要、请求序号与上一原始检查点相同；不是decoded／GPU／OS内存测量。服务revision1／指纹／时刻保持，PUT0，实际模块175d2b11…未变。

受影响页面时间／尺子／Canvas时间检查及Mini类型、Context结构、Git whitespace检查通过。绑定脚本首次误选了与readback同名的PNG事件，已按实际事件结构选择原readback；没有重写trace或重放运行时。仅页面、现有Sky Context及新增回归变化；6项其它设置/outbox修改、两份配置、v53/v52/v51候选逐字节保持，无提交／推送／部署／新候选／手机／下载。

本轮初始只读合成研究：当前 `getSkylineInfo` 为isSupported=false、版本1.4.23、原因“a-b test not enabled”。[Taro官方配置说明](https://docs.taro.zone/docs/skyline)与[查询合同](https://docs.taro.zone/en/docs/apis/base/system/getSkylineInfo)不能证明本页WebGL合成可用；[微信官方WebGL例子](https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageComponent/pages/canvas/webgl/webgl.json)显式用WebView，而[2D例子](https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageComponent/pages/canvas/canvas-2d/canvas-2d.json)显式用Skyline。这只支持尚无已证WebGL路径的判断，不宣布Skyline普遍不支持WebGL。另一个 `canIUse` 键返回false不能否定已实际工作的当前WebGL。未修改框架／配置，未重放旧合成或不支持的姿态mock，也未重复启动排查。

完整暮光／整场参考质量、科学影像coverage与配准、可见控件／物理手势／完整旋转校准及前后台旅程、Android+iOS／新版月面、总资源／帧时／首屏／弱网／官方包体／费用和最终独立审查继续开放。普通Canvas＋WXML仍为FAILED_DEVTOOLS；本轮仅主agent自审，独立审查GAP。全部33项与商业排除不缩减，下一依赖只归唯一PLAN。
