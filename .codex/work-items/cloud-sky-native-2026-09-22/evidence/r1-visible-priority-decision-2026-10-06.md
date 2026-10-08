# R1：中心格先加载，连续恢复与时耗收益未通过

原tile-selection owner新增15行左右的当前相机加载排序：成熟healpix-ts pix2VecNest与现EQJ/ENU矩阵、camera.forward计算tile中心距离；在原来源/粗细层组内优先近中心，不新增请求、裁掉cap格或扩大coverage。Hook在原resolve后调用，并稳定按原来源/层阶/pixel绘制，避免加载完成顺序影响合成。原覆盖选择、来源优先、保粗、两槽、20MiB源压力/32MiB encoded/GPU压力与native生命周期均未扩。仅现LOCAL HiPS试验行为保留；未推广为普通光学采用或经过验证的性能优化。

三个回归修前失败，包括真实M104当前相机中心应先于两个cap-only格；固定坐标/不可变身份/来源与粗阶分组及同资产随当前相机重排覆盖。改后28影响检查通过，覆盖原fallback coverage、试验/普通隔离、保细/保粗失败恢复、Scene来源与loader取消/退休。旧Hook抽取函数fixture漏新依赖的两失败保原，改为注入真实排序函数及有效矩阵；两次新测试tuple/observer类型失败保原，完整WEAPP类型r3退出0。没有改其它业务或源图。

## 完整实际页面与等结果

[当前actual page](../../../../output/playwright/skymapper-visible-priority-page-1006-r1/result.json)复用相同原七PNG/出版hash、地点、固定时刻和公共M104动作，522前端inputs、后端/任务helper/原资产前后绑定；60 Scene/106请求。Map→正式地点→天空→M104→0.15°/0.25°往返→完整来源/rightsURL→Back→Map退出。实际Taro React/Query/WEAPP桥与软件WebGL，文件/image回调受控，不能冒DevTools/手机或完整原生UI。

[有界比较](visible-priority-comparison-2026-10-06.json)五终态同相机/时刻各1,316,640 RGBA字节严格相等；全部binary 200 route/hash/bytes集合相同。七PNG仍4,357,637B各一次，Source Back无新PNG body；名义329,160视口像素仍需要3/4可见格且完成来源齐全，无新覆盖或删除弱外围。source pixels不变，不再次加工/下载。当前独立来源、原署名/ODbL/机器清单仍按实际已绘资格。

Source Back七格acquire实际次序为329/331/332/334/328/307/330；首native qualified也是可见中心329，原先先qualified两个视口外307/328的责任已改变。这证明加载优先顺序，不能单独证明用户更快看到完整影像。

## 仍失败的体验与拆分

当前三null完成帧、随后一partial（两可见格），首来源332.8ms/完整来源421.5ms；原r4四null/两partial、304.8ms/431.1ms。各一次软件运行，计数和时耗不作统计性能结论：首来源未改善，完整来源差约10ms也不证明体感收益。连续恢复仍KNOWN_FAILED。没有重跑原闭合矩阵或为了过数增并发/缓存、保隐藏旧bitmap。

首中心native qualified到Hook包含中心55.6ms，Hook至首有来源Scene开始50.7ms，native qualified至首有源Scene完成209ms；这些来自现同步时钟的原阶段/Hook/帧记录。需查状态发布/当前Canvas代次、latest frame queue/完成资格和受控回调成本，不能全归cache/warm index或直接调帧率。当前stage640、暖租约12包括其他影像家族。cache0新body不等于0decode/GPU上传；来源Back空窗不因终态差0而关闭。

源RGBA等效峰14,417,920B/9handle、GPU纹理模型峰11,763,712B/buffer28,308B、encoded峰6,457,019B及保留/两槽峰均与原相同。逻辑文件峰6,506,757B比原多128B，为变化warm时戳编码，不是新图或新缓存预算；绝不相加不同MAX作物理峰。退出decoded/GPU/request/encoded owner均0，26B空索引保留；原服务未重启、任务Browser/API已关闭。预算/真实设备物理峰/200DAU仍未验。

原SkyMapper 8°粗成品FAILED与区域条件候选分开保持；普通Prepared registry空/HiPS关闭，真实缺DOI v2兼容/来源开发闭合不冒全图质或公开采用。代码仍未提交。未独审，不宣稱最终生产/设备资格。

## 唯一下一依赖

R1 来源Back已就绪影像至实际已绘帧间隔：当前HiPS试验内保留原tile-selection/Hook的同源同阶中心优先加载与稳定数值绘制顺序；28影响检查/WEAPP类型及实际page有界比较通过等请求/覆盖/终态/峰/退休约束，首request/qualified为当前可见中心，但首来源304.8→332.8ms、完整来源431.1→421.5ms单次软件结果不证明时耗收益，连续恢复三null/一partial仍FAILED，不再反复调排序。复用当前r1三null及原r4、现loader/Hook/page/canvas lifecycle，核中心native qualified→Hook可用55.6ms→首有源Scene开始50.7ms→完成总209ms的具体状态发布/队列/快照/资格，区分React/受控回调与实际GPU/Canvas责任；在找到产品根因前不调帧率、不保过期句柄或扩缓存/槽，只有新机制才做必要失败前修复与受影响实际对照。普通Prepared空/HiPS关，中心排序只属当前试验开发行为，未普通采用或宣稱设备/性能通过。Q1合格广角/区域供给与P1独立开放；SkyMapper 8°order3及旧其它配置失败保原，有限M104/v2真实缺DOI/完整CC BY4.0-ANU/独立ODbL成果保留，新供给/元数据/成品证据才重开退出配置，不重取月面/七PNG或恢复TPV/PSF/全库框架。DevTools/Android-iOS/新版月面/完整图质交互/科学UNKNOWN/绝对配准/公开发布/物理200DAU容量/独审与全部33项保持；SDK无新根因不循环。Goal active无预算，无提交推送采购部署外联。

本增量为PROGRESS：真实请求/解码优先改变，原像素/完整来源/身份/资源无退化得到实际读回，并把剩余209ms明确到native/Hook/Scene节点；未缩减目标或把局部责任证明替代完整体验。全部33验收行不变；Goal active、无预算、未完成。
