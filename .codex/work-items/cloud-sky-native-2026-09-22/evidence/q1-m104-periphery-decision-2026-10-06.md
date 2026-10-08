# Q1 M104完整有限外围：原成品显示配置退出

复用七张order8原PNG、当前v2身份和实际完整page/Scene/Sources，在公开Map→正式spot→Sky→ground off→检索M104→定位后缩放至0.4°、0.15°细化、回0.4°、同FOV幂等检查及来源Back/Map退出。本轮没有产品源码/WEAPP变化、外部图像下载、新出版、原图重加工或缓存/并发扩张。原本普通45°进入保持；不是直接以小视域启动，也不将两次同0.4°检查计成两个不同档。

## 实际原格与来源

[实际page](../../../../output/playwright/skymapper-m104-periphery-page-1006-r1/result.json) 522 frontend inputs、58 Scene、106请求，七本地PNG body共4,357,637B。保当前publication hash24097ad218df3f817f9d5d92747d78025dbfb00584c9d33aa01468c0786f6028、完整真实缺DOI/IVOA身份、CC BY4.0/ANU署名与独立CDS ODbL来源消费者。原静态/HTTP出口证据继续复用，没有再跑无变化出版矩阵。

[每名义像素读回](m104-periphery-page-readback-2026-10-06.json)：390×844的329,160视口像素中心，0.4°必要原格[401328,401329,401330,401331,401332,401334]，0.15°[401329,401331,401332]；五终态当前完成GPU来源与每视图必要原格精确一致，缺原供给像素0。保守cap十二格中的六个视口外格没有另取。该覆盖只是几何地址与真实GPU来源，不是science mask、可观测性或绝对配准。

固定公共spot22.4826799/114.5557147、2026-10-06T13:00Z；M104在地平以下，ground off是360°浏览，不能称肉眼可见。原真实React/Query/WEAPP桥、loader/Scene及软件GL参与，FS/image/native回调受控；样式没有完整native合成，不能冒真实DevTools/Android/iOS/最终验收。

## 原像素决定

直接查看[实际0.4°](../../../../output/playwright/skymapper-m104-periphery-page-1006-r1/software-skymapper-first.png)、[实际0.15°](../../../../output/playwright/skymapper-m104-periphery-page-1006-r1/software-skymapper-0.15-2.png)、[来源返回](../../../../output/playwright/skymapper-m104-periphery-page-1006-r1/software-skymapper-source-back.png)、已有[0.4°完整原像素预览](../../../../output/skymapper-m104-wide-inspection-1006-q1-r2/view-0.4-nearest-original.png)和原401329/401331/401332/401334全幅PNG。0.4°星系下方有明显暗紫色矩形及斜边底色；原[401331](../../../../output/skymapper-m104-region-source-1006-q1-r2/Norder8-Npix401331.png)左侧内部已包含同类暗斑/边缘，原alpha全255。不是Scene新造的黑洞，也不能因不透明/MOC有覆盖而认定科学有效；成因未定位到观测/加工环节，保UNKNOWN。

0.15°明显放大紫色底噪。完整核/暗带、弱外围与周围恒星保留，不靠缩小裁框藏原成品问题。以前小视域的条件保留没有认证完整外围，现在新外围证据使当前SkyMapper M104 order8有限显示配置FAILED/EXIT；同源8°order3旧FAILED不变。不泛化成整库禁用，不重新处理原科学图或盲取order9/10，希望更高分辨率不能代替质量证据。

## 恢复、驻留与隔离

[同输入比较](m104-periphery-comparison-2026-10-06.json)：初0.4°→回0.4°、幂等0.4°、Back及此前同0.15°共四对严格RGBA全相等；同地点/时刻/basis/center，保raw FOV末位差。成功binary route/hash/bytes集合与上轮相同，Back PNG body0。原ready交接保持，中心qualified之后null完成帧0；两首图未ready null和三partial仍在，连续恢复FAILED，不能把等终态冒无空窗。首完成至首/六格完成219.3/454.0ms仅一次软件样本，不宣称时耗收益/设备帧率。

encoded6,457,019B、source RGBA等效14,417,920B/9handle、GPU纹理11,763,712B/buffer28,308B、reserved1,259,862B/两running槽与上轮各对应模型峰相等。FS逻辑峰6,506,757B，比上轮多128B为可变索引时间戳编码，非图像/物理内存退化；不同MAX不相加。最终decode/GPU/request/encoded owner均0，空索引26B；临时Browser/API关闭，原BFF/watch/IDE未重启。产品68pins/WEAPP300pins按当前输入保持，已有未提交成果保全。

任务reader初稿的继承helper名在执行前纠正到实际新consumer，r2读回通过，初稿保存未执行；比较初稿多一个括号导致parse失败，未执行比较/产品，原脚本与失败log保留，r2仅修语法/报告字段，没有重跑页面。未改验证门槛、source资格或原像素。

普通Prepared空/HiPS关；完整33项原验收行保持，science UNKNOWN、绝对配准/完整图质/公开发布/目标runtime/物理200DAU/独审未验。合格普通覆盖增量仍0。本轮PROGRESS是完成有限外围真实消费者并明确退出不合格输入，停止无效扩张；不是产品图质交付。

## 唯一下一依赖

Q1/Q2 缓存ESO NGC253完整成品的原生图质准入：SkyMapper M104 order8的0.4°完整外围在原PNG与实际page均见暗紫矩形/斜边，当前有限显示配置FAILED退出；不以裁框、抠黑、feather、生成或升阶掩盖，不重复下载/出版/运行已退出输入。下一复用ESO eso0902c已缓存8285×7510全源、原AVM/TAN、现三级JPEG和1024×928 PNG对照、原非Messier目录/实际page/Scene/Sources，以同一公共相机/地点时刻核全照片与弱外围、真实外沿、照片/目录星、PNG/JPEG实际采样颜色及驻留/临时峰，快速作有限目标保留或退出决定；先核已有原像素和消费者证据，只补未执行的同Scene编码/图质比较，不重复无变化加工或闭合HTTP/合同矩阵，不以照片目标冒连续全天背景。R1当前ready交接保持，本轮0.4°Back两未ready null/三partial仍FAILED，不据单次软件时钟扩缓存/槽或循环运行优化。合格全天背景、其它真实区域与P1独立继续，8°order3/其它旧失败保持，有新成品/可信几何才重开。普通Prepared空/HiPS关，完整33项、science UNKNOWN/绝对配准/公开发布、真实DevTools/Android-iOS/新版月面、全图质交互/物理200DAU/独审均保留；SDK无新根因不循环。Goal active无预算，无提交推送采购部署外联。
