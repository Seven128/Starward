# M82完整真实外侧孔径候选（2026-10-04，r85）

本代完成真实母图外供样参与的完整边缘孔径消费者，输出独立离线候选。实际三级图已查看，暖底和细档颗粒仍未通过；普通Prepared仍空，未采用、出版或部署。实测均值/条件noise停止成立不替代完整图质、恒星配准、PSF、权利与发布链验收。

## 责任及保存边界

现有 `sdss_noise_display._real_halo_regions` 统一四真实窗口/目标范围，原adaptive和新恢复路径共用。`sdss_display_recovery` 提取既有targeted raw孔径责任供内部旧入口和新 `refine_current_recovery_real_halo` 使用；未引入新框架。真实原帧字段/几何权重/native flags/noise/RUN/MJD/cohort及有效系数仍由已有source/recovery owner负责。

新 `sdss-current-recovered-source-aperture-real-halo-candidate-v2` 绑定保存内部候选、current-v3、原adaptive及源时刻/系数谱系。只更新实际受影响边目标和真实供样strong诊断；每窗stencil用后退休。完整内部估计、诊断和affected位置逐位保持；原strong、无供样/未知/sameRUN、真正无影响current值、原科学coverage/alpha/WCS及冻结recipe保持。旧候选不覆盖。有效fullcandidate准入与旧内部版不同，保存/export复用旧owner并拒绝错误父版本、hash、状态及recipe。

## 开发验证与实际输出

[缺接口前失败](recovered-complete-before-2026-10-04.txt)保留，五新回归覆盖真实外侧供样、原raw/native policy、父错绑、unknown/sameRUN保粗、取消及独占出口；[55项影响检查](recovered-complete-after-2026-10-04.txt)通过。原消费者几何/数值和既有回归保持。

[一次实际执行](../../../../output/sdss-m82-recovered-complete-1004-r1/result.json) SHA256 `8c056213a9abc4552eb664302181ccaf3467b7222dbd6331ceb014338dc18ea5`，只处理真实四窗，不重做科学coadd、全4M/内部过滤、source获取或recipe fit。

- 65,280外围目标各访问一次；120唯一母图外供样，1,262实际依赖中1,199合格弱目标。数字来自完整实际支持，不作为需求上限。
- top/left/right/bottom分别502/131/566/0弱目标，其中502/38/481/0估计改变，共1,021。
- full累计84,198 affected、53,897估计较current-v3改变；旧内部82,999 affected及所有内部值/诊断精确。
- full qualified 4,121,815、strong 1,019,968、reached 1,165,092；半径−1/0/1/2/4/8数量为107,132/1,019,968/44,844/209,054/621,365/2,191,941。

[保存输出读回](../../../../output/sdss-m82-recovered-complete-readback-1004-r1/result.json) SHA256 `eff7ebd5703b9535a1cd9c5ed112d2026c1cdad6c692182c67a0b14dc20f84ba`：全部1,199新弱孔径检查，1,167正共同raw均值精确、32原raw保粗精确；12分层见证直接原帧native ID/系数、合并后variance、跨field Cauchy条件noise、三带abs-ratio与半径停止/reached一致。原帧均值浮点差在实际贡献推导界内。该noise未覆盖sky/systematic/processing/PSF等未知误差，不冒测光置信。

真实源q/strong与r84四窗源材料一致；完整65280目标互不重叠，内部/无影响/原strong逐位保持。三级mean→f32→冻结RGB及原alpha/WCS精确，较内部candidate RGB位置变化为OV81/MED0/DETAIL0，后两PNG完整字节相同。

| 输出 | 字节 | SHA256 |
| --- | ---: | --- |
| OV | 517916 | 7164ac215334a8d4ae5c8191fdd6bee36690e27d4f2d24efb97ccb6408d746f6 |
| MED | 606423 | e8e8bd158d5ff802b1e61780cd9d963691b0e0a794165f2ce335c3373c619f22 |
| DETAIL | 546718 | 7e42783983a1639dc5d3a07d0d374ffdb4e9f83423e497d6ca88f707dce4fc69 |

[实际完整三级对照](../../../../output/sdss-m82-recovered-complete-readback-1004-r1/actual-full-lod-pairs.png)已查看，外侧更新肉眼变化很小；暖底/细档颗粒、剩余条带及完整质量保持失败/未验状态。不是新的WEAPP page/Scene或目标手机证据。

## 资源与授权边界

外围kernel8.073774s、CPU8.046875s；该离线Pythonpeak working set1,303,474,176B/pagefile1,018,789,888B。单窗有效stencil数组最多61,820,928B，排除其它数组/临时资源，不能当总峰。旧内部处理只作为保存父，未重新执行。

[新产物本机分配](../../../../output/sdss-m82-recovered-complete-readback-1004-r1/allocation.json)：测量前29文件、logical75,161,420B、reported unique allocation75,235,328B，29独立ID/maxlink1、前后稳定。排除测量自身/后续docs/checkpoint、旧源/候选、文件系统内部/snapshot；不是Linux物理retention、180GB余量、手机/服务内存或全小程序200DAU混合容量。

旧r84的382 currentSources中实际执行前仅三个Sky离线owner变化；4163旧证据与六设置/outbox保护文件逐项保持，旧源、科学、current-v3及内部候选前后hash精确。后续文档/捕获脚本更新单独归属；checkpoint连续性读回记录实际最终清单。原工作区/分支/HEAD、24040服务及18132 watch启时保持，staging0。未改云观星之外业务逻辑，未获取新源、重启服务watch、commit/push、采购、云部署或发布。

## 当前依赖及未闭合范围

唯一下一依赖归PLAN顶部：用实际M82原帧/已存新候选和六psField核真实恒星逐带配准与位置相关PSF，再据证据修完整质量。asTrans假设网格差及psField结构/关联不是逐星绝对配准真值；不能从暖/绿像素猜sky/noise或改WCS。

完整33项交付义务继续保留，包括真实page/Scene、strict SourcesBack失败、WXML Canvas失败、Android/iOS及新版月面手机证据、W3暗区、权利/加工谱系与完整出版链、标准静态出口、旧出版/回滚/暂存物理保留、端云成本及混合200DAU容量。独立审查仍缺，本代读回为自审，不冒独审。Goal active且无预算，未完成。
