# R1 Sources-only Canvas与真实影像保留条件试验

决定：候选有值得继续验证的首画面收益，尚未采用。产品文件和当前300文件开发WEAPP没有改动，产品的Source Back可见空档仍FAILED。本试验不是原生节点或完整交互验收。

## 原因与可复现结果

现原光学来源和对象来源两入口均navigateTo；两个page hide Hook停止交互/时间并释放Canvas，pageVisible移除Canvas JSX，各native-image Hook active变false后释放ready图像。SAO原CPU owner已独立补有界ready交接，其修复不替代影像恢复。候选只改任务构建中的原page/Canvas lifecycle；保留同一已创建原owner集合，不缓存屏幕或增加资源预算。Source Back重新请求当前帧，并测量核原node、原WebGL context对象、尺寸及非lost；无效则原释放重建，旧绘制与迟到测量回调有epoch栅栏。后台与最终移除仍释放。

[完整结构化对照](native-source-retention-readback-2026-10-06.json)保三组实际page/Scene旅程，每组522原源码输入；原已退出SkyMapper缓存七PNG只是LOCAL/MEMORY_TEST机制fixture。

| 情况 | 正常Back影像来源 | 首RGBA与离开前 | 决定 |
| --- | --- | --- | --- |
| R1：现测试port每次测量返回不同node | 0/0/2/4/5/6/6 | 旧暗背景反例hash相同 | 校验失败按原重建；不能从现mock推断原生node持久性 |
| R2：按实际Taro逻辑Canvas节点复用测试port | 6/6 | 96个通道字节不同 | 保图收益成立，但direct deep-sky owner仍hide释放；同node未核原GL身份也有缺口 |
| R3：补完整图像owner范围及原GL身份 | 6（首个完成帧已齐） | 严格0字节差 | 有条件开发结果；未采用到产品 |

R3实际62 Scene/109总请求包含一次来源导航拒绝及额外来源页app后台/返回，不与旧108总请求作性能比较。正常Source Back零acquire/零Canvas创建，首完成帧是新Scene输出，原实时来源及相机/时刻一致，原RGBA严格等离开前和最终恢复；[首返回帧](../../../../output/playwright/native-source-retention-1006-r3/source-back-frame-55.png)。R2遗漏deep-sky图像family的96字节差已保原，不拿六HiPS来源替代全部当前消费者；R3首帧修正的图像输入和贡献资格仍由原Scene负责。该源矩形/底色/密度图质FAILED不升级，科学/绝对配准UNKNOWN。

## 成本与失败边界

来源页隐藏时，R3有8个native图像句柄、源RGBA等效8388608B、GPU上传模型8745112B及buffer模型15648B继续驻留。各组整场逻辑最大GPU11763712B、native9句柄/源RGBA等效14417920B、encoded6457019B/reserved1259862B/两工作槽相同；不同模型/时刻不可相加认证物理峰。来源页对比原hide释放增加驻留，原source等效/encoded压力未调整。尚未测全应用、长停留、生产物理资源或200DAU。

导航拒绝保持Sky与资源；app后台即使Sky已在来源页下方，也通过独立app-hide监听释放，Canvas DOM移除/活动native与GPU模型归零；返回新节点重建，最终Map返回/unload及encoded清理均归零。不同node/尺寸、同node换GL、延迟validation与旧draw回调的4项候选检查通过，原hide退休和同node新GL两个反例先失败后修。测试port按逻辑节点复用是受控假设，不是微信Canvas原生观测；生命周期来源只读本机已装Taro API类型，微信官网三页本次无法打开，没有推断原生保持保证。

隐藏在途下载/decode暂停与恢复、publication/capability/权限换代、对象来源入口共用导航范围尚未实现/实际验证。不能将keepReady全局用于普通hide，不能在隐藏期间继续新的资源泵，也不能绕过clear/retire/picking或生产贡献资格。实际WEAPP selector能否返回同一native node/GL及回调次序仍UNKNOWN。原DevTools SDK无可行动新根因，不重启/轮询。

## 保留与下一依赖

所有前阶段源码、任务证据、源图、失败与原服务保留；无新观测图下载/加工/普通出版、无产品源改动/WEAPP构建、无子代理、无提交推送部署采购外联。观察器readPixels/数组及额外旅程不同，不冒目标可见时长或公平吞吐比较。Context只登记未采用的生命周期条件，不改产品声明。全部33项验收账原样开放。

唯一下一依赖由[PLAN](../PLAN.md)维护：R1 来源页返回真实影像：原SAO有界ready交接保持已修，产品Canvas/图像仍按hide释放，首像素空档FAILED不升级。Sources-only任务候选已比较不同节点释放重建与同逻辑节点保留；原GL身份/尺寸/非lost再验证、旧回调栅栏、全部当前图像family保留后，actual62 Scene/109请求中正常Back首RGBA严格等离开前、六HiPS来源且Back零acquire/零Canvas新建，导航拒绝不释放，来源页app后台与最终离开归零。整场逻辑峰相同，隐藏驻留8句柄/源RGBA等效8MiB/GPU模型8745112B另计，不相加冒物理峰；该候选未采用。唯一下一补原image loader/Hook的Sources隐藏在途下载与decode取消/返回恢复、publication与同hash capability换代/权限丢失、对象来源入口共用导航范围的最小候选回归及实际page路径；不建新cache/通用框架、不扩预算、不保截图冒当前帧。实际WEAPP selector节点/GL存活与app/page回调次序、可见时长/物理峰仍UNKNOWN，P1无新根因不循环；条件小样不能当原生通过。Q1合格全天/区域成品适用性继续独立，不串行等所有优化。已退出SkyMapper只作机制fixture，不恢复采用/修色/PSF/生成或无界换源；已有SAO去重/ready、Prepared出口不重做。原300文件开发WEAPP不变，普通Prepared空/HiPS关；33项、完整交互、图质/科学UNKNOWN/绝对配准/公开发布、DevTools/Android-iOS/新版月面/物理200DAU/最终独审均开放。Goal active无预算，无提交推送采购部署外联。
