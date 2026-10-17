# 图像批次修复与实际Scene（2026-10-09至10-10）

本轮继续正式实施，目标与唯一PLAN未改变；全部33项保持。工作区/分支为当前交接指定值。新材料均在 `output/eso-image-supply-2026-10-09-r1`；原结果/失败及修改前五份文档保于 `maintenance-before-r2`。本记录是实际结果，不是新方案或产品完成证书。

## 共享责任与批量结果

`photoshop_original_restore.py` 增加实际图像多边形、附加ROI、精确绑定同网格L8 frozenMask及原生PNG保存；COM前验证身份/歧义/几何，执行代码同字节保存，结束再次核输入。核心原图、外部SXT、羽化量化及实际重开PSD是共享硬检查；它们不批准图质。相关16项检查分阶段通过：16项整组日志15通过、1个异常类型断言失败；只修该测试的预期异常后，影响项单独通过，原错误日志保留，未冒整个新epoch。实际PS验证见下述回执。

- 三张4096工作图星系轮廓恢复：两个PS批调用、0模型，3份可编辑PSD重新打开，像素不变量0差。实际整图/ROI有纹理/恒星密度岛，三个均NEEDS_REPAIR；`galaxy-outline-restoration/group-0-reviewed` 与 `group-1-reviewed`。
- 两张星云亮星恢复：一个PS批调用、0模型；完整层/蒙版/文档拥有权及像素保持通过。实际局部原图岛、残留/邻近结构仍不合格，两个NEEDS_REPAIR；`nebula-bright-star-restoration/products-r2` 与 `reviewed-r2`。首蒙版预检拒绝保留。
- 原始分辨率三星系：复用精确原JPEG/page/XMP，无新下载；工作网格7603²、5312×4472、10027×10105，两个真实SXT GPU组。`native-grid-r1/processed/group-0` 52.879s/采样进程树RSS6,243,188,736B，group-1 59.175s/10,665,189,376B；50ms采样下界且共享页可重复计，GPU峰UNKNOWN，不冒Linux或全机容量。初读无ROI被纠正后，`roi-readback` 无新模型/成品编码读回全图与每项10个原始分辨率ROI。实际NGC300已分辨纹理仍误移；NGC6744红色紧凑结构仍误删；NGC1232结构改善但亮星残痕。三个均NEEDS_REPAIR，`decided-review/review.json`。
- 两张原始分辨率局部PS：第一颜色mask实际漏淡红结构，COM前拒绝；修正gate、复用另一mask后同一PS调用，0模型。`native-grid-r1/local-restoration-products-r2` 两份PSD实际重开3层/1mask，10027×10105原生PNG完整输出；文档before/after均0。核心/外部/羽化0差，实际改变990492/67470像素。host60.099s，100msPS进程RSS采样峰7,873,527,808B（含app基线、下界、GPUUNKNOWN），PSD291,011,495/1,125,656,624B。实际红结构/主亮星改善，NGC6744空心星环仍在；NGC1232另一边角ROI2也有未保护星环。两项NEEDS_REPAIR，`local-restoration-decided-r2/review.json`。不以局部纠正发布整图，不循环同输入/半径。

## 整批准入与实际融合

当前 `current-stage-queues-r1/input.json`（SHA e64c463e73a89fe0758281f00526fa5f23e41afdb45f6615a1f6627d344b760b）由原 `publish_native_batch` 生成3份纯metadata阶段队列，0模型/PS/图像编码。`inventory.json`用原 `prepared_inventory.mts` 全量读回8条加工epoch、6个唯一来源，0准入异常。NGC246是1候选、3独立图与metadata共5,326,845B；普通采用和可分发均0，另外7条epoch为质量异常。重复加工epoch/LOD不计新图或新覆盖。

task `benchmark-image-scene.mjs` prepared模式复用原库存、BFF/BSC8404/当前SAO v2、Scene/GPU/native lifetime。一次只保当前SAO选区、默认银河和一个照片LOD，不累积所有图/星行。原eso-r1错误BSC版次FAILED保留；eso-r2/r3实际目标八帧RGBA一致，宽目录控制另有37像素最大28码差UNKNOWN，不能冒全部逐像素相同或照片/星协调（细视场实际0目录星）。

真实默认银河输入原来未加载：新profile `prepared-native-current-galactic-wide-detail-v1` 从真实 `GalacticImagePublicationService` 读取当前Mellinger及bytes/hash，同帧绘制并核真实完成身份。`output/prepared-scene-batch-2026-10-09/eso-r5-current-galactic` 11帧运行准入通过、GL错误0/退出GPU计数0；宽目录关闭实际3912像素差、银河关闭55像素差。八张目标宽/细照片帧与之前孤立试验逐RGBA相同，实际已查看contact仍有明显照片矩形边界：Scene FAILED_VISIBLE_RECTANGLE。低分辨默认背景不能补照片外围；不靠抠黑/裁边隐藏弱结构。实际细视场0绘制目录星，恒星协调与绝对配准仍未验证。

决定绑定实际manifest、当前生产代码/背景版次及输出。旧孤立试验失败继续留存，新背景范围只验证一次；`eso-r6-current-reuse` 真实同范围复用：0帧/renderer NOT_STARTED、5文件异常继续排队、0库存异常。Scene当前FAILED，registrationUNVERIFIED、scienceUNKNOWN、最终权益/采用/出口资格未完成。

## 有效负向回归与未验范围

整批无效pin变异：仅把NGC1232批次绑定declared bytes加1；旧保留runner仍exit0且渲染10帧，新owner exit2且0新帧、5独立库存行保留。`whole-batch-readback-r1/negative-result.json`实际PASS；原错误/输出保持。

默认背景遗漏变异：当前runner仅移除真实银河image/publication实参（搬移脚本的root/动态import做等价适配），`eso-background-negative-r1`实际exit1/current_galactic_not_painted；真实positive有银河完成身份/非零效果，旧孤立runtime通过无该输入。`background-guard-result.json`绑定控制/正负输出与同范围0帧复用。不是新的产品图像或页面旅程。

一次漏publicationHash的Scene决定被原库存拒为orphan，`inventory-r4-current-background.json`/日志及原输入保留；补完整身份的新独立决定/输入由当前库存读回0异常。没放宽准入。

真实文件、软件Scene、原生运行、物理资源、独立审查和最终采用分别保持。上述源码/批次结果只补C/D/V06相关开发证据；没有新增普通采用，33项不提高。独审MISSING（可见工具只有PR CI读取），手机、完整消费者恢复、全机容量、静态兼容/保留仍保既有缺口。下一按真实结构/背景共性原因推进，独立适用来源继续，不形成逐对象完整E2E循环。
