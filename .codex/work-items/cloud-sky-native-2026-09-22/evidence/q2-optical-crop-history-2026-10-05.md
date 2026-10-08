# Q2：原像素坐标与光学驻留裁窗历史

当前光学`artworkLevels`以原像素坐标重映射到驻留窗口，已经修复本轮有界实际GPU和原page复现的同源历史差。旧R2 35像素/最大1失败保FAILED：原运行没有捕获exact window/uniform，不能把本轮结果追认为其全部指令原因或改判旧代。其它galactic/artwork/SourceBack/hide严格失败不属于这次修复；完整图质、实际DevTools/手机/物理峰/独审未过，普通registry空。

## 可复用输入与有决定力的对照

复用原M82 v2 `output/prepared-progressive-publication-1005-r1/`三PNG/hash、旧R2 `.05°`已绘view及当前实际同地点/13:00观测矩阵；没有重新加工图或下载。当前观测投影到旧已绘目录目标的误差保存于`geometry.json`，须小于1/10000 logical pixel。这只准入此次几何重构；历史exact uniform仍缺，不能用该阈值放宽framebuffer逐字节相等。

`scripts/inspect-optical-crop-history-2026-10-05.mts`只执行现生产光学片元/纹理owner，在真实PNG decode、390×844软件GL上对照直接`.05→.5→.05`及插入`.0625`路径；绑定真实upload/copy、active uniform及逻辑分配/最终退休，source/资产前后hash相同，执行脚本/compiled JS保原。

| 本轮独立执行 | 直接暖回 | 中间视角暖回 | 同冷输入 | 光学逻辑纹理峰 |
| --- | --- | --- | --- | --- |
| 原实现 r2 | 差0 | 49像素/49通道、最大1，strict FAILED | 差0 | 9,469,952B |
| task-only原像素表示 r3 | 差0 | 差0 | 差0 | 9,469,952B |
| 已迁生产owner r4 | 差0 | 差0 | 差0 | 9,469,952B |

路径为 `output/playwright/cloud-sky-optical-crop-history-1005-q2-r{2,3,4}/`。r3明确保两编译源码override与原/执行SHA，不冒原生产代码。r2→r3冷像素本身有21像素/通道最大1差，是该浮点表示变化，未声称与旧图逐字节相同或生成新的观测信息。

原实现同冷/暖相机uniform相同，只有coarse/fine窗口系数变化：fine从x192,width640变x128,width768；归一化比例float32从1.6000000238变1.3333333731。coarse从(352,224,320,576)变(320,160,384,704)，ratio同样有非精确表示。原`(uv-origin)*ratio`让相同视角的采样依赖保留下来的窗口；task-only只替换为`(uv*sourceSize-windowOffset)/windowSize`，其它source、相机、缓存/纹理策略、LINEAR、alpha/选层/合成和5次采样不变，实测差消失。

生产变更只在`sky-artwork-level-composition.ts`及renderer配对uniform：`WindowOffset/WindowSize`为原格整数offset/真实extent，RGBA支持及RGB共用该映射。共享contribution片元复用同函数/同uniform；其它单幅artwork/galactic路径不改。没有为strict结果强制冷上传、缩小每次请求的缓存、全部整纹理、增加队列/缓存或改源图。上述峰为光学测试的逻辑分配，同场物理峰与性能仍未认证。

首个r1在GPU前被错误的“UV中心必须1e-9内等于.5”诊断挡住。该M82目录中心和出版中心实际相同，当前重构矩阵/逆平面的有限差约1e-8 UV；后改为对原已绘目录位置的真实屏幕投影准入并保存误差，没有改源配准、相机或strict pixel门槛。原r1脚本/log保留。

## 原完整Taro page反例

`output/playwright/cloud-sky-prepared-crop-history-1005-q2-r2/`执行原Map→Sky→公开搜索定位M82→原Canvas，使用当前原HTTP/cache/Hook/Scene/来源归因。固定`.05°细→.5°概览→.0625°中间→.05°细`，实际窗口/uniform逐帧读回：最终仍保更宽768/704窗口，严格RGBA差0；没有改缓存策略来获得相同窗口。

514 frontend source前后绑定，89请求、8,985,644B全部body、61 Scene；8暖回完成帧null0，最终活动decode/source RGBA/GPU texture-buffer模型均0。当前相机/来源和像素的检查分开，实际frame/uniform/PNG/RGBA/copy及retirement均保存。受控WEAPP端口、SCSS未合成、软件GL仍不供WXML/DevTools/手机或完整同一旅程验收。

该完整page首轮r1遗漏command-local API TSX tsconfig，decorator在页面执行前失败；保原log，随后使用现API tsconfig执行r2，未改产品代码来绕过。34项影响检查（纹理生命周期、共享contribution/availability、原科学Scene与native矩形Scene）全通过，Mini TS5.9.3类型通过。原输出见`tmp/q2-affected-optical-tests-2026-10-05.log`、`q2-miniapp-typecheck-2026-10-05.log`和本轮两actual owner/page logs。

当前修复只关闭本轮光学裁窗表示/有界原page反例的开发责任。Q2仍需冻结NGC253/区域的实际PNG/JPEG采样、颜色/弱结构/外沿与背景适用性；原旧35/2/9/25等FAILED和历史第三null UNKNOWN保各代。实际GPU厂商/设备、整场物理峰、完整发布/容量与修后独审继续由P1/E2/A1关闭，不能据差0普通采用。
