# 暖访问索引写回：有界候选采用；运行优化本项收口

采用原sky-public-image-cache内一个queued warmAccessWrite Promise，共享尚未开始的serialized快照；快照开始即清该引用，晚到last-access触发下一写回。没有timer、后台未提交租约、新cache、队列槽/预算/schema更改。每个warm hit仍完整文件尺寸/实际SHA验证，last立即更新并等待所属快照的原stage读回、原子rename、最终index读回后方交lease；membership冷写/移除/清理保持。

## 反例与恢复

修前六项中1FAIL：两个并发valid warm touch重写两个完整索引。候选六项PASS：并发一次提交/两last更新/原路径及重启恢复；快照开始后的晚touch必须第二次且在耐久前不交lease；held共享写期间clear拒绝两waiter、最终空inventory、同SHA新attempt不受旧回调影响；取消一人保另一；index write失败不交未提交更新、按原恢复重新取得有效文件；等长损坏仍SHA拒绝/修复。任务prototype与候选core21项通过。采用后在正式源码上core21+新回归6+原native consumer8，共35项PASS，WEAPP TS5.9完成exit0。没有复跑无影响发布/备份矩阵。

## 实际整页比较与采用绑定

原阶段lane output/playwright/hips-source-back-timing-native-page-1006-r1和候选output/playwright/hips-warm-index-candidate-native-page-1006-r1沿同完整Map marker→Sky空props/HR687搜索pan、8→45→.15→45、精确来源/复制URL/Back、Map返回及clear消费者。候选frontend521/backend174输入固定，118 Scene/152请求，任务browser/API已关闭。40个warm job仍验证，索引完整写回40→36，FS操作496→460（少4/36）；未缩wanted或实际43请求身份，local body始终43/5,492,230B，Back body0。终态同相机RGBA差0，GPU/decode/请求/encoded最终退休0。

软件show→首lease127.1→105.3ms，首onload339.8→295.1ms，首有来源完成595.8→541.5ms；两null仍在。只是该次受控轨迹，不承诺物理设备速度/可见空窗改善或连续显示通过。具体源RGBA/GPU/文件驻留及临时峰按各sample/maxima保在output/hips-warm-index-candidate-comparison-1006-r1/result.json；不同MAX不相加成物理RAM。收益是消除有实证的重复操作，改动仅8行，不继续扩压力值/暖框架。

先在task-only派生源码施加候选，没有先改生产；比较/恢复通过后，产品owner逐字等于测试candidate-product-text。post-adoption读回重新由原备份施加同变换，输出精确等于当前owner，证明被采用body和执行candidate相同；observer和import relocation不进产品。原runtime graph/source-bindings保持原执行输入时态，不能改写为采用后SHA；最终audit用原备份保那些输入，再单列当前owner与候选等价。原watch仅common.js/map两文件改变，当前owner全文在source map精确一致，非真实DevTools验收。

独立审查MISSING；旧完整验收、TRIAL PS1图质FAILED/科学UNKNOWN、普通Prepared空/HiPS关、Android-iOS/新版月面/实际DevTools/物理200DAU容量及公开合规不升级。当前不是全R1完成，只是本项运行比较收口；首图/设备时长与完整连续体验仍为P1/A1义务，不以局部优化无限串行阻塞合格成品供给。

## 唯一下一依赖

Q1 SkyMapper现成彩色HiPS有界适用性：R1暖索引比较已收口并采用原owner内仅queued concurrent touch共享耐久快照，35检查/WEAPP类型通过；完整候选page40→36索引写回、496→460文件操作，同43身份/5,492,230B/终态RGBA/退休保持，普通发布状态不变。两null/首图延迟/物理runtime仍开放，不继续扩缓存或造暖框架。下一先复用artifacts/miniapp/cloud-sky-native既有SkyMapper properties/MOC/order0及LMC、M104 order8原PNG，直接核具体产品、完整原像素/覆盖/权利与原已排除理由；只沿现HiPS/实际page最小合同，在有资格的有限真实区域小样做采用或退出决定。CDS成熟彩色成品与受限SIAP原TPV科学片分开，先看缓存，不重复下载/加工，不扫SIAP/全库，不回到逐图PSF。原图许可/ODbL/来源消费者/普通发布各自闭合，合格之前普通Prepared空/HiPS关。P1独立，SDK和SkyServer503无新根因不循环；科学UNKNOWN、完整广角区域/图质/Android-iOS/新版月面/容量/公开合规/独审及33项不缩减。Mellinger只守银河DISPLAY，旧粗Legacy/ESO直接UV/受保护Risinger及排除源不重开。Goal active无预算，不提交推送采购部署外联。

SkyMapper现成CDS i/r/g彩色HiPS是之前保留候选；新下一步先看已缓存order0/order8 PNG、properties及空间MOC，不重新处理M104原TPV g/r/i科学图。原SIAP单边<10′/禁止系统性扫取、需要联系全CCD的限制仍保留；CDS现成复制与原图/加工库ODbL/归因权分开。180GB全机共享/约6.34TB库估算不允许全镜像；小区域样本不是覆盖或需求上限。先具体原图/产品/服务权利，若有资格才按最小原owner扩消费者；缺证不造公开发布，不恢复排除源/旧失败UV/PSF。

前轮是PROGRESS：实际阶段证据改变了本轮比较选择。原照片/下载/输入/失败日志/用户未提交成果与六项保护项保留，全部33行义务不改。Goal active无预算，无提交推送采购部署外联。
