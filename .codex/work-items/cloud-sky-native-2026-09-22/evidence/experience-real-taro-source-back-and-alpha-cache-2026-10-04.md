# 实际 Sources 页面 / Back / 地景 alpha 文件复用

2026-10-04。沿同一完整Taro page/Provider推进原PLAN的实际来源页依赖，没有重跑r11清缓存/503/retry矩阵。开始核r52的278 source与六保护、分支HEAD及原BFF24040/watch18132仍活；不换工作区/分支，不重启公共服务，不下载/加工/部署/提交。Goal active无预算。当前生产仅改Sky的 `sky-landscape-client.ts`、`sky-public-image-runtime.ts` 及对应现有 `sky-public-native-consumer.test.ts`；六Settings/outbox保护保持原字节，其他业务逻辑未改。

## 实际页面链

[修前r3](../../../../output/playwright/cloud-sky-real-taro-source-1004-r3/result.json)与[修后r5](../../../../output/playwright/cloud-sky-real-taro-source-1004-r5/result.json)均正常exit0。原SpotSkyPage完整JSX、实际context/report/forecast/resource Query/同一已装React-Query Provider/官方Taro page bridge继续执行；新bundle加入原 `sky/sources/index.tsx` 的完整JSX，401 frontend inputs。Actual Sources通过自己的 `useCelestialInformation` 及Provenance消费同一HR8162数据；不是只记录navigateTo、改label或替换来源状态。

实际画布touch/重叠选择进入Alderamin资料，等待真实information交付后，公开“来源与许可”tap执行原route URL。任务native导航端口维护两个实际Taro page instance，通过官方onHide/load/ready/show挂载Sources；Source公开CustomNav返回Button执行真实getCurrentPages→navigateBack分支，经onHide/unload移除Source root、onShow恢复原Sky实例。详[导航与生命周期](../../../../output/playwright/cloud-sky-real-taro-source-1004-r5/actual-navigation.json)、[页面阶段与来源正文](../../../../output/playwright/cloud-sky-real-taro-source-1004-r5/phases.json)。Sources真实逻辑正文包含HEASARC/BSC、IAU、Wikidata/CC0等原归因、许可及限制；呈现文本不重新采用来源或扩大权利。

Source可见时Sky withdraw已绘READY事实，GPU记录句柄0/encoded文件租约0，保合法公共encoded文件；回程重新申请/解析SAO并恢复943补充/8404基础目录，新Scene frame identity、同publication hash/相机/时刻与原选中HR8162。Source root确实移除、Sky同一instance、Alderamin选中marker与资料保留。Cold/返回390×844RGBA及PNG完全一致，仍是Canvas像素/逻辑页面证据；控件/标签CSS/WXML未合成，不认证微信真实导航栈、系统Back手势、全景/时间跟踪/校准或手机体验。

## 源与资源事实

前端401原输入前后绑定；实际服务显式imports的project dependency graph162文件也在启动前/结束后核同字节。`@starward`按本机worker真实exports解析，外部库保既有安装，graph不是每分支执行trace/全外部依赖认证。当前controller/service、独立test repository/确定性天气与实际Astronomy/BSC/assets仍是开发API，非生产或容量；原BFF新源是否加载不升级。

任务本进程在导入owner前观察原fs.promises公共asset读回，仅记录worker/assets路径/bytes/hash，finally还原。r3有31读/30distinct，r5有30读/30distinct，实际公共来源字节与结束磁盘逐项核；未碰配置/secret，未读原月面4.25GB全集。全链证明见[根保存输出读回](../../../../output/sky-real-taro-source-readback-1004-r1/result.json)，自审非独审。

修前r3：40请求/正文3,794,800B，Back阶段report304/0B、coarse alpha19943B/200重复、detail alpha54224B/200首次。本次冷阶段没有取得detail alpha，不能把54,224B算重复；暖图片和SAO encoded asset没有HTTP传输。当前较窄相机没有认证全部地景材质readiness或交付家族，不能用这两个PNG或稳定READY外推全家族。

## 已复现后的有界修复

源码确认 `getSkyLandscapeAlpha` 原走requestBareSkyResource，source hide丢原decoded grid后，再进入会重新请求同immutable coarse JSON。沿已采用的单encoded owner解决：原manifest的alpha sha256/bytes及publication-bound精确文件名进入 `readPublishedSkyJson`；runtime仅新增两个现有panorama alpha-rle JSON的同源/同hash白名单，保192KiB准入上界、32MiB合并预算/two transfer queue/现有catalog disposable namespace、完整写入与UTF8后读hash、租约/取消迟到/清理失败恢复。没有独立parsed/decoded alpha缓存，没有提高文件预算/改天气或账户缓存/增加新服务。

原科学alpha codec继续核图像身份、完整RLE行/覆盖、解码SHA，不生成透明缺测；现有mask owner仍在hide释放网格，返回从验证后encoded字节重新decode新Uint8Array。恒星/地景的同帧遮挡职责没变。manifest、图片及publication版本未修改。

[有效发布路径的修前失败](../../../../output/playwright/cloud-sky-landscape-alpha-file-1004-r1/valid-fixture-before.txt)用归档原client/full新测试复现warm下载2而应1，没有临时回滚生产代码。[35受影响检查](../../../../output/playwright/cloud-sky-landscape-alpha-file-1004-r1/affected-checks-r2.txt)及随后[新增路线/SAO共享消费者12项](../../../../output/playwright/cloud-sky-landscape-alpha-file-1004-r1/affected-route-checks.txt)通过；后一批不是新增12测试或全部重跑。检查实际原Alpha文件/decoded hash、暖传输一次、grid新对象/字节保持、clear后明确重取、错误host/publication/非alpha路径/不匹配file拒绝、预先abort不发请求及现有SAO同清理消费者。最终[App类型检查](../../../../output/playwright/cloud-sky-landscape-alpha-file-1004-r1/app-typecheck-r3.txt)exit0。测试route补查晚于r5 page lane，只改测试，不冒r5本就执行这些断言。

修后r5：39请求/正文3,774,857B，Back阶段只report304/0及首次detail alpha54,224B，coarse没有重复HTTP，较r3少19,943B。没有宣称出口编码、时延、CPU/GC/真实网络收益或200DAU容量。Encoded冷27项/1,057,548B，返回28项/1,111,772B，alpha与其他图片/SAO共预算；Source hide8→0 lease，回程8。最终logical root/Query/native pending/GPU handle0，单encoded owner entries/leases/bytes/reserved/running/pending/retired0、epoch1、只剩26B空inventory。解析RLE、decoded alpha/native images、GPU/OS/临时峰仍分层待实测，诊断历史Image引用不认证释放/物理总峰。

## 保留失败与未完成

首次命令cwd错，用worker相对入口未启动；source r1任务杜撰至少13 imports而实际12，在API/browser前失败；r2信息刚显示modal但资料尚加载，来源按钮未出现，任务过早点击失败，r3改等待原data/button后通过。r4builder/runtime共用wx transition输出名而EEXIST，API/browser未起；r5分开收据名复用当前401bundle通过。原文件保留，未覆盖失败。

初轮alpha测试把存储manifest当含派生publicationHash，修后触发非法route；保原失败日志，按服务真实manifest字节SHA构造有效URL后，归档旧client仍失败2≠1，当前client通过。所有修正均在对应责任内，不借这些任务/fixture错误改其他业务。

实际Source route/公开Back的受控开发依赖已推进；完整公共拖动缩放→全景/地景渐隐、选中细化失败保粗、图层/连续时间跟踪及跨家族组合仍须在同一真实页面执行。原WXMLFAILED、Android/iOS新版Moon、全物理峰/200MB、旧新binary/保留引用、B完整背景/弱结构/配准/rights/批量出版、180GB/200DAU混合月成本流量及12Mbps10/20冷并发容量、独审仍开放。普通Prepared/science registry空/未采用，HST M51矩形FAILED/M82缺输入不升级。预期生产配置未部署/验收，Goal未完成。
