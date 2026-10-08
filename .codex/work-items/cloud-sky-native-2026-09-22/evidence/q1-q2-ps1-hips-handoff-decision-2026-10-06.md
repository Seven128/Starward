# PS1原alpha、局部重试与有界保留决定（2026-10-06）

本阶段修复限定在已冻结的20原JPEG和原page/Scene，不代表普通采用。旧每光学tile的.8显示衰减不是已采用设计要求；本次改用原alpha（opacity=1）沿原coarse→fine/来源优先级绘制。opaque细图仅在自身实际mesh绘到处替代父图；细图缺失或上传失败时有效粗图仍在。有效黑、原PNG alpha和科学UNKNOWN分别保留，不能由JPEG小样宣称半透明科学mask已验。W3 .48及独立目录星场不改。退休上一代父UV裁切参数、shader discard和预上传 machinery，复用成熟原HEALPix mesh、纹理lease与单图提交；无新FBO、适应网格或通用巡天框架。

同一当前renderer/相机/report/三原细图的fine-only对照与父细共存0像素差，恢复0。真正绘新帧的旧.8负控改变288,077像素/max38，恢复0；它是当前原alpha基线的负控，不将旧.8 fine-only RGB冒同一显示基线。旧304,918反例、UV裁父代65负控/暖5像素及失败截图原样保历史。实际查看新.15/.8/.45°及HTTP失败图：旧失败黑细线未再见，失败细区仍有显著粗细分辨率边界，完整图质仍未通过；名义cell检查不是raster或科学支持验收。

现公开HiPS/W3重试只复位原mesh失败态并发起当前draw，沿原loader重取失败bitmap，不resize整Canvas。一次HTTP503及一次原GPU上传失败后3个实际完成重试帧名义coverage齐；粗层bitmap身份与Canvas revision不变，HTTP/GPU失败像素相同。可选program/buffer分配失败及真机恢复未在此lane实测，不据上传路径宣称全部GPU故障闭合。

真实20tile身份在未改的原loader中16/20MiB有界比较：9coarse→11fine→6coarse→11fine的新增读取分别9/11/2/1与9/11/0/0。仅光学native owner保留压力16→20MiB；未改通用loader、GPU或encoded预算，不新增隐形请求、retention组或缓存框架。20MiB为当前9粗+11细RGBA等值的实测压力，wanted集可超过它，512/order/样本数均不是产品上限或设备容量。相同实际page的暖.15→.8→.15为9完成帧、名义缺覆盖0、端点像素0、新body0。

完整实际Map→Sky/Hook/HTTP/Canvas/Scene受控软件路径114 Scene/140 loopback请求，515前端输入、173后端；当前70个≤1°测量完成帧仍11全null/19局部未齐。冷进入8帧约383.6ms、show 5帧约642.0ms、show后新wide 6帧约288.0ms，分别是首次/释放后重新取得及新视域，不改为暖保粗失败也不改判通过。软件完成间隔不是native compositor可见时长、SLA或最终验收；八度初始pan超有限供给范围未外推。

整场同时间采样模型：纹理峰14,680,064B时source RGBA20,971,520B、GPU buffer2,052B；source峰20,971,520B时texture11,534,336B。FS逻辑峰5,144,206B，encoded最大2,407,530B；各MAX不能相加成物理峰。旧运行故障/时序不同，不声称性能A/B优势。退出encoded/native/GPU活动owner均0；物理资源与200DAU容量未验。原20JPEG2,691,868B无下载加工，三原服务/有效watch不重启；自动Sky产物另记新epoch，无新SDK/auth/真实DevTools截图。

24影响检查/类型通过。首次测试VM缺top-level预算声明失败保原，修任务提取实际source声明后通过；首次readback误读capture.before不存在的hipsHook而失败保原，新r2直接用真实消费者facts核Canvas，未重放page或重加工。r2末尾沿用的“R1 invalid completion/mutation”说明指上一代LOD r1；本代r1是字段定位失败，须按此纠正回执解释，不混淆。

下一为HiPS完成帧身份/同帧来源、完整权益及原record链接、独立Sources route/Back和标准发布实际消费者。冷/show/新wide、科学支持/半透明alpha、完整图质/绝对配准/目标runtime/Android-iOS/新版月面/物理峰/独审及全部33项仍未完成。普通Prepared空/HiPS关，不以成功保粗替代完整体验。

证据：[实际page](../../../../output/playwright/ps1-hips-handoff-native-page-1006-q1-r1/result.json)、[逐帧读回](../../../../output/ps1-hips-handoff-page-readback-1006-q1-r2/result.json)、[原loader比较](../../../../output/ps1-hips-retention-1006-q1-r1/result.json)、[唯一PLAN](../PLAN.md)。
