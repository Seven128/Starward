# 实际页面公开手势、全景渐隐与来源回程开发证据（2026-10-04）

本次完成当前完整 Sky/Sources 页面的一条新组合：双指从局部进入数值全景，公开拖动跨地平并使地景渐隐，反向、取消和缩回局部，然后公开选中资料→Sources→原返回按钮。未改生产代码或云观星外业务逻辑。这里的执行是官方 Taro React 页面/Query 生命周期和原 Canvas 事件入口，在受控 native API 与真实软件 WebGL 上运行；不是 WEAPP WXML、手机完整体验或最终验收。

## 实际输入与执行

沿 [PLAN](../PLAN.md) 当前 A/D，使用 [r53](current-execution-state-2026-10-04-r53.json)。不重跑旧清理/503/Retry矩阵、旧来源冷样本、加工或DevTools启动排查。新[builder](../scripts/build-real-taro-gesture-journey-2026-10-04.mts)与[runner](../scripts/experience-real-taro-gesture-journey-2026-10-04.mts)严格要求旧284 currentSources和六保护精确，允许transitions为空。复用已装React18.3/Taro4.2/Query5.90、真实完整JSX及同Provider/Sources实例；构建401输入和实际后端project图162前后保持，实际fs read的53公共科学资产精确。后端图不是所有执行分支/外部依赖trace，测试repository/weather不是生产容量。

本次builder诊断只保存最新原snapshot引用，避免历史structuredClone重复持有mask；不修改生产snapshot或effect/手势/相机/Provider。受控MapFS、几何和native Image callbacks沿原端口。SCSS只绑定，未合成；历史Image诊断仍持有引用，因此不能凭native对象诊断证GC或decoded退休/物理总峰。

实际命令均通过已装tsx，从workers/miniapp-api运行；原BFF24040/watch18132创建时间仍为10月1日，不重启。r1全景已达到267.875°，但测试按光轴forward高度误认为视觉中心已完全进淡出区，有限422→97拖动仍mask opacity0.358224，断言失败：[原失败](../../../../output/playwright/cloud-sky-real-taro-gesture-1004-r1/failed.json)及executed-script保持。产品按屏幕中心ray，不按光轴；r2只改task手势650→400，并保视觉中心算术读回，未改生产阈值。一次root cwd误用worker相对run-node路径，MODULE_NOT_FOUND且未启动r2 lane，改正确cwd后执行；此工具失败不冒产品回归。

[r2结果](../../../../output/playwright/cloud-sky-real-taro-gesture-1004-r2/result.json)正常exit0，browser/backend在finally关闭；31原公开touch事件，139 Scene调用不是验收数量。公共双指距离280→120→60→30→10对应45→99.589499→171.477000→246.764647→267.875033°；不是旧标称全景实际45°。原浏览相机forward进入zenith，Viewport有效中心从422变为448。

## 实际同帧结果

公开竖向拖动中实际视觉中心高度经保存相机/中心和独立stereographic算术读回：10.987851°时mask0.951126，-4.901113°时0.263665，-20.247822°时0。此前mask1，反向逐位置相机/mask精确恢复；原touchcancel恢复进入手势前camera checkpoint，再反向双指回45°保原局部相机。

- [全景软件画面](../../../../output/playwright/cloud-sky-real-taro-gesture-1004-r2/software-full-sphere.png)：实际地景合成围绕已绘天空。
- [地景淡出后](../../../../output/playwright/cloud-sky-real-taro-gesture-1004-r2/software-below-horizon.png)：真实星点/星系辅助等继续显露，未用空白/伪生成细节替代。整张已查看；SCSS/普通标签控件不在该软件canvas图内。
- [反向恢复](../../../../output/playwright/cloud-sky-real-taro-gesture-1004-r2/software-reversed-home.png)及完整原RGBA与宽场相同。

淡出完成snapshot中2363个可用已绘对象按自己坐标/相同frameAt/catalog身份经原pick owner均可拾取，其中1533射线在数学地平以下；保存身份和选择集合，不把浏览透视说成现场肉眼可见。此次对淡出后2363对象只执行原pick owner函数，真正公开Canvas点选在局部恢复后，不能冒每个对象均通过实际触摸/弹窗。公开选HR8162/SAO重叠列表→Alderamin资料→原Sources实际内容/Query→原CustomNav Back后，同Sky实例、相机、时刻、选中marker/modal保持，Source root卸载。实际Source/Back在本次手势之后，不是把上一条来源冷样本记录拼接为组合。

六组390×844 PNG/RGBA全部由[根保存读回](../scripts/readback-real-taro-gesture-journey-2026-10-04.py)核翻转和hash：冷/局部恢复/Source回程相同，宽场/反向home相同，跨地平图与宽场不同。根输出为[readback result](../../../../output/sky-real-taro-gesture-readback-1004-r1/result.json)，自审非独立审查。

## 资源与代价事实

原同一32MiB encoded owner，完成阶段样本：冷27项1,057,548B；全景51项5,653,467B；局部恢复仍22文件租约，Source hide0，返回8；最终unload/明确清缓存 entries/leased/bytes/reserved/running/pending/retired全0、root/Query/native pending/GPU句柄0，MapFS仅26B空inventory。宽场2 texture→完全淡出1→反向2，Source hide和最终GPU句柄全部0。完整阶段账本在根readback ledger；settled采样只供应这些时点，不供应转移staging/临时峰/峰值帧时。

文件租约不等于decoded bitmap：原createSkyArtworkLoader.suspendUnusedDecoded通过retainFile保有界冷文件、删除decoded handle，原source-equivalent16MiB约束冷/热entries，共用32MiB encoded owner；不能把22lease算成22活动纹理或判为必然泄漏。mask为overview524,288B/detail2,097,152B的Uint8模型；完全淡出选overview mask，反向回detail。这里仅当前成功mask数值，不供所有parsed/native/GPU总内存或GC。其他家族当前供应/未供应与临时总峰仍要按实际owner补核，未把JSON压缩字节和RGBA相加冒物理内存。

63 HTTP正文8,316,552B，Source回程正文0B（report304/缓存），不是计费出口/200DAU或10/20人混合容量。全部53public reads与当前project源前后绑定，不重新下载外部原源或加工。没有新的生产TypeScript改动，所以不重复上一轮已通过的35/12回归与App TS；本次只跑新实际路径和保存读回，Context结构/链接另核。

## 未完成义务与下一依赖

一条竖向全景路径不证明所有水平全天、release/cancel/edge竞争、姿态校准、连续时间/跟踪、选中细化失败保粗或全部图层组合。下一受影响整页路径继续这些用户任务及实际家族资源/staging/退休，Source hide/Back加入新时刻与图层输入；不重跑本条相同手势矩阵。WEAPP WXML FAILED、Android/iOS新版Moon/手机、SCSS完整合成、native物理总峰/全家族readiness/200MB旧新binary、图质/完整发布链/空普通Prepared registry、真实retention refs/200DAU成本混合容量与独审缺口保持原状态。未提交、推送、采购、部署、发布或普通采用。Goal active无预算。
