# 冷暖返回的解码像素与实际纹理窗口对照

2026-10-04，Goal active、无预算。严格r60全部300选定源/六保护，实时分支与HEAD保持。仅云观星任务诊断、计划及两个Sky Context更新，产品源码/其他业务/六保护不变，原BFF/watch未重启，无提交推送、下载加工、手机、部署或发布。

不重跑上轮整周、混合手势或已闭合W3/M51链。本次只用完整原page/installed Taro/React/Query、公开pinch45→99.589→较窄视场，再以原page hide/show恢复。实际前端401输入与上轮相同，162服务project、50公共read及r60源执行前后绑定。原getWindow函数体不替换；任务构建在出口记录实际source、requested/effective/resident窗口及bytes/available。只有明确标记的counterfactual才请求原合法旧窗口，普通路径的请求/返回逻辑保持。SCSS只绑定、native API/几何/MapFS/HTMLImage callbacks受控，softwareGL非WEAPP/WXML/手机。

15个实际Scene图像（银河、13星座插画、地景）经HTMLImage→实际2D drawImage/getImageData→原contracts SHA读回完整RGBA hash，四态均相同；原paint对象快照、相机、时刻、网格状态及编码SHA/尺寸相同。2D临时canvas/hash属于诊断开销，不纳入产品/native物理资源论证。

原getWindow允许已驻留窗口包含当前wanted时继续复用较大的partial resident。本视场的实际变化是：

| 实际源 | hide前resident | fresh返回resident |
| --- | --- | --- |
| 银河2048×1024 | x128/y160/672×640 | x160/y192/544×544 |
| 一张256×256星座插画 | x0/y0/256×224 | x0/y0/256×160 |

其他已记录纹理窗口保持；地景通过原get(full)而非本次getWindow出口记录，解码hash仍核相同，不补造其窗口事实。银河/插画shader按resident origin/scale映射原source UV，改变窗口会改变这组归一化采样参数。新小路径普通返回7像素、7个RGB通道各差1，alpha保持；不是来源bitmap改变或paint相机漂移。

任务counterfactual按原encoded SHA将原getWindow请求限定到已记录合法旧resident窗口，以公开地平网格on/off触发真实draw。结果所有实际记录窗口恢复旧集合，所有source decode hash仍同；counterfactual保存raw与hide前逐字节相同。删除任务override并再次原hide/show后，普通fresh窗口恢复，raw与第一次普通返回逐字节相同。五组单次GL-before→PNG→GL-after严格一致；普通前/后图片已实际查看。窗口集合差异能产生/消除此小路径输出变化已被直接对照支持；具体shader浮点插值/舍入位置未逐运算测量，不把推断当新的科学配准真值或普遍1LSB上界。

这项对照未采用为产品策略；没有强制旧较大窗口、扩大缓存/预算、禁用裁剪或另建暖纹理框架，也没有新容差。仅为严格RGBA字节恢复断言的边界提供实际机制事实。上一整周r1的**9个RGB通道各差1/精确相等FAILED继续保持**：旧运行没记录resident，当前小视场不能倒填那9个像素的窗口因果或改判其失败。完整视觉/原生返回验收仍开放；不能以7像素机制或counterfactual哈希相等代替全部体验。

r1任务将getImageData的Uint8ClampedArray直接传原SHA实现被类型校验拒绝，失败/退出1保留，非产品请求/渲染故障。r2修任务为同一buffer的零复制Uint8Array视图，复用同bundle/构建，正常退出0。没有换数据/算法/原hash实现。最终所有native登记、编码lease/entries/bytes/reserved/running/pending/retired、GL活动退休，文件26B空库存；仍非物理GC。65HTTP接收6,900,151B，fixture weather/test repository与真实astronomy/assets隔离服务，非公网/生产计费。模型峰值含明确counterfactual，2D/hash transient另未测，不作普通性能、整场物理总峰或200DAU容量。

根保存source/byte/window/pixel读回为自审，独审MISSING。下一依赖按PLAN推进实际跨午夜/公共时间尺预览取消提交与播放跟踪、跟随完整校准/全部家族；严格字节历史失败和必要原生/物理/图质/出版/Prepared空/成本容量义务保留。不循环重整周或穷举舍入参数，不以迫使哈希相等替代产品结果。

直接入口：[r2实际结果](../../../../output/playwright/cloud-sky-real-taro-texture-window-return-1004-r2/result.json)、[根机制对照](../../../../output/sky-real-taro-texture-window-return-readback-1004-r1/result.json)、[hide前解码/窗口](../../../../output/playwright/cloud-sky-real-taro-texture-window-return-1004-r2/natural-before-hide-decoded-windows.json)、[fresh返回](../../../../output/playwright/cloud-sky-real-taro-texture-window-return-1004-r2/natural-return-fresh-decoded-windows.json)、[任务旧窗口对照](../../../../output/playwright/cloud-sky-real-taro-texture-window-return-1004-r2/counterfactual-old-windows-decoded-windows.json)、[普通策略恢复](../../../../output/playwright/cloud-sky-real-taro-texture-window-return-1004-r2/natural-restored-fresh-decoded-windows.json)、[r1任务类型失败](../../../../output/playwright/cloud-sky-real-taro-texture-window-return-1004-r1/failed.json)、[上一9像素失败](../../../../output/sky-real-taro-horizontal-interruption-readback-1004-r1/failed.json)。
