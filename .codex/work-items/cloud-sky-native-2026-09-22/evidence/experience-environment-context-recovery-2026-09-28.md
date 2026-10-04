# B3/D：环境组合观察与共享时间提交恢复

**本轮保留整体体验主线：观察昼暮夜、局部/全天及普通/红光组合，再修复时间提交在弱网下失去响应和成功后残留旧错误的问题。** 商业范围、原生路线和原始完成义务不变。环境整体质量未通过；时间恢复证据分别绑定实际候选与传输条件，新月面仍未推手机。

## 环境结果与证据边界

clean-v8 的八次实际原生 Canvas 捕获覆盖公共示例点的午夜、18:00暮光、12:00白昼、85°局部与267.8°全天、普通/红光以及返回普通。时刻由公开时间尺提交，模式由 Settings 的已选状态确认。午夜返回与红光返回普通的实际图片比较：天空42,320像素中26个变化，地面20,792像素中4个变化，最大通道差均为1；这是缩小的192×413图片内的有界恢复观察，不是精确相机或零像素差证明。

详[本代原生状态与八幅图](experience-environment-native-v8-2026-09-28.json)、[逐文件/真实服务/图片及像素回读](experience-environment-v8-readback-2026-09-28.json)和[回读脚本](../scripts/experience-environment-v8-readback-2026-09-28.mjs)。最终该代位于午夜、Vega方向、85°普通DAY；时间变化已撤销未跟踪的定位标记，不沿用先前Rastaban或一直定位Vega的说法。地景出版及1K/2K资源仍是原哈希，2K已绘来源保留照片作者、CC BY-SA派生许可、原包及非现场限制。

现有照片固定的原始照明、地景空间层次、银河/影像及日夜整体辨认质量仍按实际影响评价。它们不能靠模型存在或免责声明判为通过，也不能自动扩成必须精确重做每个站位、天气或照片光照的硬依赖。缺现场数据只限制现场承诺；模拟地景/大气的原体验要求继续有效。

本轮参考浏览器只取得[不匹配截图与条件](experience-environment-reference-unmatched-2026-09-28.json)：参考实际时刻00:04:03、CSS视口986.4×956/DPR1.25，时间没有成功暂停；不能用URL中的16Z或同名Vega冒充同条件比较。保留[实际截图](experience-environment-reference-unmatched-2026-09-28.png)，临时视口已还原并交还页面。不重复这个未成功暂停的路径；后续质量比较须核实际地点、暂停时刻、投影视场定义、视口和图层。

只读 `wx.getPerformance` 能读到当前开发者工具的UI事件，三次stutter采样窗分别1929/1984/2314ms，stutter/jank/bigJank均为0；这些时长不是卡顿时长，frameData不是Canvas/WebGL GPU帧率。见[适用记录](experience-environment-v8-public-performance-2026-09-28.json)。手机首屏、整帧/峰值、流量和官方包体尚无本轮证明。

## 共享时间提交与恢复

真实本地HTTP反例：成功PUT响应被截断，服务器已经保存新时刻；原客户端把它判为失败，再次操作收到409。[修前](experience-context-response-loss-before-2026-09-28.json)与[修后](experience-context-response-loss-after-2026-09-28.json)使用同一生产域函数、真实BFF和流式HTTP；修后只调用一次应用写入，再用一次禁用应用响应缓存的同ID GET核对完整意图。这一脚本的传输是Node fetch，不能冒充原生结果。

`api-client.updateObservationContext`和`observation-context-recovery.confirmedObservationContextEdit`共同负责Map/Sky的时间、日期恢复：仅新鲜且更新的revision、可用Context指纹、同地点/路线原点/时区/档案/隐私/生命周期/算法，以及所请求时刻、夜晚边界、事件和规范化weatherView都匹配，才接受读回。其它用户意图、缺测/陈旧或不完整响应仍失败；取消、确定拒绝不再读回。没有另建时钟/store或客户端天文计算，也没有为不确定结果再调用PUT。明确过期/不存在的旧恢复仍重建同一产品输入，再提交一次。

原生clean-v9实测先得到200但响应丢失，随后传输又发出一次PUT并得到409，再GET确认新时刻；共2次HTTP PUT/1次GET、服务器revision只增加1。clean-v10在Vega跟踪中实测1次HTTP PUT/1次GET，响应实际丢失但Canvas与BFF都更新为01:30/17:30Z，HR7001资料与来源返回保留跟踪。两种条件分别见[v9实际记录](experience-context-native-v9-2026-09-28.json)、[v10实际记录](experience-context-native-v10-2026-09-28.json)及[绑定/像素/服务回读](experience-context-v10-binding-2026-09-28.json)。单次应用调用不能保证native传输只发一次HTTP；BFF当前不消费该幂等头，并发原子性/幂等审查仍开放，没有将本次恢复升级为服务端事务证明。

真正写入失败也有真实503对照：代理在到达BFF前拒绝一次PUT，BFF/Canvas保00:30和原revision，页面公开树保留“观测时间未更新”；再次公开提交成功后达到01:00。v9仍保旧错误，是新的逃逸问题；`app-store.setObservationContext`现把Context和旧Map/Sky inline时间/日期错误的解除作为一次状态转换，`notification.resolveObservationContextNotifications`只解除这四类已失效错误，图片、导航、其它owner或floating恢复保留。不自动清除真正失败的当前恢复。v10的重试后旧错误已消失；实际whole-store修前反例、修后41项受影响检查、Mini类型通过。补查缺失/空Context指纹也得到修前失败、修后拒绝，不接受一个缺少必要身份字段的成功外观。

v10跟踪时间变化的缩小原生Canvas比较区63,112像素中62,453变化，来源返回同一区0变化；仅说明该代实际输出有变化/恢复。通知、时间尺及资料文字检查来自公开组件树；这些捕获不能认证完整控件合成、手机触摸/姿态或精确相机。返回Map后的native durable Context仍是revision4/17:30Z，公开原地点重进Sky也保持该时刻；Map时间尺包含所有钟点，不以包含“01:30”的列表文字证明选中时间。

受影响检查、两个逃逸反例、最后类型/编译、Context结构和普通本地Markdown目的地检查见[开发检查记录](experience-environment-context-recovery-checks-2026-09-28.json)。最后41项组合检查在补指纹合同前运行；补合同后只重跑受影响7项和Mini类型/编译，避免重复扩大检查。329个本地目的地存在只证明链接可达，Context工具和链接检查均不认证事实、锚点或产品完成；独立审查尚未取得。

## 最终活动开发候选

最终唯一活动项目为 `weapp-check-sky-combined-clean-v11-0928` / SDK9444、PID34128，SHA256 `99c50222cb3d64fc2201470c754d6e135c60b51b9711f8918b52f93469cc47db`，257文件/4,469,986B；raw main2,081,604B、sky952,710B，不是官方包体。无诊断/mock/临时代次/vConsole/sourceMaps；源码中缺指纹拒绝也已进入编译产物，构建通过，三类旧warning不变。见[候选](experience-combined-clean-v11-candidate-2026-09-28.json)、[构建](experience-combined-clean-v11-build-2026-09-28.log)、[正常原生记录](experience-context-native-v11-2026-09-28.json)及[最终逐文件/实际服务绑定](experience-context-v11-binding-2026-09-28.json)。

经公开Map搜索示例点进入Sky、切手动、提交00:00、搜索定位Vega、缩放85°。当前普通DAY、地景/星座开、W3关、无跟踪/面板/旧时间错误，BFF与Canvas同16Z/revision2，展开的已绘图片来源指向原出版2K PNG和原包。捕获前后状态一致，实际193×413，不与v8/v10的192×413作逐像素质量对照。本代正常路径不能自动升级v10故障、控件合成或手机验收。

核新代正常后关闭v10，之前v8/v9也已替换关闭；9441/9442/9443无监听，当前9444。8791 PID12252/exec34149是当前候选必要的任务本地转发，已还原pass；8789 PID14388/exec22711及原出版保持，共享8787/8788未动。初次v11入口操作曾出现SDK响应超时，实际页面仍Map；读回当前页面后重试正常，该工具异常不当产品通过或失败依据。

## 当前交付边界与下一依赖

无手机输入、抓屏、预览、扫描或轮询；没有云部署、提交/推送。历史环境、故障和恢复证据保各自字节、截图尺度与传输条件，不自动提升为新代验收。最终活动候选及恢复点以唯一PLAN/STATE顶部和本记录的最终候选段为准。

按唯一PLAN先有界核对D Context服务端并发revision提交路径，再继续C真实影像组合/复杂遮挡/其它配准与D可用开发性能测量；B3整页辨认质量继续开放，不重复本轮无变化的环境开关和时间动作，不无限精修纹理。真实姿态/完整旋转校准、OS后台、Android/iOS、目标首屏/整帧/峰值/流量/官方包体、必要独立审查和实际费用均保留。当前参考条件不匹配和native证据范围已明确；缺现场输入或一项精修不阻塞整个Goal。Goal保持active、无预算。
