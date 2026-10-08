# A1 活动时间预览与Sources返回

沿原公共时间尺、observationTime/contextSession、Sources和Canvas owner修复，未新增缓存或时间来源。旧PLAN“useDidHide取消时间预览”的概括不正确：时间owner隐藏只暂停播放；时间尺隐藏取消尚未完成的拖动。既有公共控件收起/取消回已提交时刻规则不变。

本次真实完整page公共拖动预览13:30（Context仍13:00）→Sources→Back确实取消回13:00，但修前首完成Scene图像输入为空，5个decoded handle仍驻留；来源0→OVERVIEW→OVERVIEW，首null到有来源221.3ms为软件完成时序，native可见时长UNKNOWN。返回原RGBA有7个像素最大单通道差1，视图与253对象快照严格一致；旧严格失败保留，未设容差。见[原产物读回](time-source-readback-r3-2026-10-06.json)和[差异/输入](time-source-differences-2026-10-06.json)。

排队读取器捕获旧paused=true；原native owner读取器现按currentScope的暂停状态取同owner已ready payload，仍核active、Canvas、revision、hash和owner身份。新回归先失败后通过。只修读取器的r3实际首帧仍空，证实还存在native onShow在可见React scope前启动Canvas的时序；原page现从pageVisible render effect恢复Canvas，仍复用既有量测、node/GL/DPR/失效与单Canvas writer。没有跳过实际空帧冒成功或恢复被排除数据。

[当前完整消费者读回](time-source-after-readback-r2-2026-10-06.json)：523构建输入、53Scene/100请求，活动预览明显改变288k级像素，返回同Context/相机/提交时刻，3个Back完成均有当前OVERVIEW来源；首Back原GL RGBA→终态、终态→离开前分别0差。253已绘点选通过，原Map入口返回保持。final decode/source等效/GPU纹理与buffer、encoded租约/队列及pending请求模型0，MapFS仍1个26B元数据，非全盘或物理内存0。

47影响检查、WEAPP类型与源map两产品原文通过，watch只改变detail JS/map。前两次复用完整当前bundle，无重编/源图加工；产品修复后仅按新失败依赖建r3/r4。首次诊断误用辅助标签超时，r2诊断误读pick返回结构，两个原reader分别查到NULL与RGBA差，r3只修reader未关闭实际NULL，均保原；r4执行器exit0。本次截图已查看，区域照片fixture仍图质FAILED、未普通采用，Prepared空/HiPS关，无下载/图像加工/DevTools重试/服务重启。

前序get-content/rg三次旧路径猜测失败与临时calls.filter形状错误保诊断记录，不作为源码/平台证据。真实微信时序、Android/iOS、新版月面、可见时长/物理峰、真实权限、200DAU及独审未验。当前活动拖动不证明paused/playing预览组合。全部33项保持。

唯一下一依赖：A1 1×播放的Sources暂停/返回：当前活动时间尺预览→Sources→Back已发现并修首空输入，原onShow提前恢复Canvas及旧paused读取器均沿现owner修复；47检查/类型、53Scene100请求，0 source-null、首/终态及原提交画面两RGBA差0、253已绘点选与同Context，最终模型退休0。旧221ms软件间隔/7像素差、脚本错误及只修读取器仍失败保原，非native/物理/独审验收。隐藏不是取消所有预览：活动拖动取消，1×播放仅暂停。下一只复用现时间owner/公开播放与Sources路由，核正在播放→隐藏暂停→返回保持暂停实际时刻（未自动提交/隐藏推进）、时间尺/已绘/拾取/来源同刻，以及公开取消或设为观测时间的当前Context效果；先读旧1×证据，不重跑已闭合活动拖动/固定Back/五拒绝矩阵，不改Map/投稿/计划或新增时间缓存。Q1仅新具体合格覆盖/几何/权益再开，ESO6k/失败照片退出保持，Mellinger仅低分辨率DISPLAY、普通Prepared空/HiPS关。P1仅新具体动态callback/window/rehydration证据再开，不重发initialize/SDK/日志扫描或重启服务。全部33项、Android/iOS/新版月面、全旅程、物理200DAU/完整发布开放；Goal active无预算，无提交推送采购部署发布外联。
