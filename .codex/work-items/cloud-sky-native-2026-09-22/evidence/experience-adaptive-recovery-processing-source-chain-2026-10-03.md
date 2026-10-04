# 当前自适应/真实边缘/保存供应加工来源链

状态：**离线开发来源packet**；质量UNVERIFIED、独审MISSING、未普通采用、未发布运行时新版。仍是原工作区/分支/HEAD、Goal active无预算；没有改任何候选科学/估计/PNG、原recipe/权重、六保护、原registry或服务/watch。

## 同一来源owner的新处理角色

[sdss_noise_display_provenance.py](../../../../data-pipelines/deep-sky/sdss_noise_display_provenance.py)新增显式`sdss-adaptive-recovery-processing-source-chain-v1`消费者，不将旧noise-v1文档换名。固定角色是原科学master、冻结recipe/credit许可说明、adaptive-v1、real-halo-v2、原other-scan供应-v1、其原资格snapshot、当前恢复-v2与保存数值读回。各角色的目标/版本/原science/availability、共同recipe、父估计与四diagnostic、当前qualified/旧供应/execution canonical pin必须匹配。模型snapshot仍明确标`sdss-common-noise-display-candidate-v1`，只提供原native/CALIB-SKY/CAS/fpM/epoch/projected/weight identity，**不是新自适应算法声明**。

历史before/after、原script和每个输入逐字节验证；代码已演化时使用与原记录完全同hash/bytes的实际archive，科学/其他文件不能用代码archive替换。供应当时的旧`sdss_gri_tan.py`不再等于live版本，但既有完整adaptive/shared-noise archive保原实际字节；当前inspection owner另立身份，不冒任何旧执行当时用了后改代码。没有重做frame解析/投影/过滤、旧目录/PSF矩阵或三级RGB数值推导。完整保存读回作为明确外部pin的历史数值证据复用，所有其文件及每档PNG仍核字节；当前consumer不声称自己重跑数值或认可图质。

原科学是已校准/已扣sky的有符号nMgy/native-pixel；共同孔径和真实边缘及13323替代只是显示估计，不形成新测量或填science。原joint availability独立决定area alpha，有效0/负值/亮度/processable不制造coverage。Signed display mean先box，再用原冻结i/r/g Lupton；不冒photometry或统一surface brightness。原credit、CC BY4.0及source/policy/license链接从同一原science的冻结disclosure精确继承；附本代共同孔径、边缘和替代供应用途/epoch/PSF与处理差异。保遗漏sky/systematic/processing误差、primary TAN/full asTrans/DCR/绝对配准、中心/扩展/coadd PSF、棕底/绿晕/弱结构及独审不足。保存的模型支持单列[真实PSF证据](experience-measured-native-psf-support-2026-10-03.md)，不改处理父或认证真值。

这份含内部路径/receipt的packet不是公共source-route payload、TS publication hash或Prepared标准静态合同；仅已有来源信用文本精确保留，不冒新版完整权益/加工说明审查和来源Back验收。

## 真实消费及保存读回

[实际消费](../scripts/experience-adaptive-recovery-source-chain-2026-10-03.py)以r33外部checkpoint及已核原科学/冻结manifest身份为锚，保存全部显式pins和本代executed script/owner。产物：

| 产物 | 实际身份/含义 |
| --- | --- |
| [processing-source-chain.json](../../../../output/adaptive-recovery-source-chain-1003-r1/processing-source-chain.json) | 441,203B，文件SHA `ec04c42ff5fa7942479095efe7c5eb78c26b1858db1ef64fc2381cb74bc1292c`；canonical SHA `503e89b7f5f19566d48a1672bf65ad3d24974acddefa1b4f824512960db64ed9`；两种hash分开 |
| [external-pins.json](../../../../output/adaptive-recovery-source-chain-1003-r1/external-pins.json) | 10,818B，SHA `cedc691770fa75c66b27075262e6e4ea8606d312f455440f735a1de4c98e463c`；包括四历史执行/文件/archived code绑定，caller pins不是取源网络证明 |
| [实际result](../../../../output/adaptive-recovery-source-chain-1003-r1/result.json) | 1.714秒本机独立inspection；349个distinct文件有界字节核对；source/filter/projection/PNG derivation均0；非端云吞吐/总库存 |
| 当前候选 | 原17903B、SHA `e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235`保持，13323供应及其余当前父/53缺口/原alpha保持既有证据，不重加工 |

[独立root JSON/字节读回](../scripts/readback-adaptive-recovery-source-chain-r2-2026-10-03.py)不导入producer/新owner，流式hash真实361文件；核历史resolved-code与原记录/producer、产品数组/PNG与meta、current/父/supply/canonical snapshot、credit/许可/单独inspection角色及未采用状态。361与349范围不同：读回额外核packet/pins、当前inspector/producer及显式产品等，不拿差额冒新增科学资源。[r2 result](../../../../output/adaptive-recovery-source-chain-1003-r1/readback-r2/result.json) SHA `6d608d8354f5d40a5fa657c4b089d17e111eebdc2418e462a297245dc3dce6d7`。

首个readback任务把原noise处理version字面量猜错，失败在角色断言前；[原脚本/失败](../../../../output/adaptive-recovery-source-chain-1003-r1/readback/failed.json)保持。r2读取已有owner实际version后独占读回；没有改packet/历史/候选来迁就断言。

## 有界缺陷控制与验证

[八个新来源谱系回归](../../../../data-pipelines/deep-sky/test_sdss_adaptive_provenance.py)检查同几何不同object、父估计/diagnostic错接、重签旧snapshot仍不能掩扫描epoch改写、science availability与display/supply分开、原disclosure指向其他科学、缺/假alpha数值证据及旧version/采用flag冒认。扫描epoch控制通过删除唯一资格guard的内存AST mutation复现：其他目标/科学/保存读回/credit检查仍接受改写epoch；当前guard拒绝。fixture只测合同，不当真实科学/处理证据。

受影响`test_sdss_adaptive_provenance`、原`test_sdss_noise_display_provenance`与`test_sdss_saved_recovery`共19项通过；保原noise-v1的source/JSON/null/black/fallback/对象guard及当前saved-recovery语义。没有重跑整图质量或无变化完整母图来增加数量。Context/local-link/本轮scoped whitespace及六保护checkpoint另外核对。

## 当前唯一依赖

本代加工谱系开发packet已补；下一步回到当前完整候选仍失败/缺证的背景、弱结构/绿晕、覆盖及完整配准：沿现有真实源/模型/显示意义和已核成熟处理支持，只有足够材料才做新加工。中心/扩展/coadd PSF不足不批准全图matching/shift/扣sky，不能通过重复45fit/旧目录/孔径/九边/13k恢复或861秒母图填证据。质量、来源权利/信用/加工说明及必要独审可审查后，才接新正式版本/批量出版/static/API/client/source/Back与保留成本。普通registry仍空，HST矩形FAILED、M82输入不足、DevTools FAILED_DEVTOOLS、Android/iOS/新版月面/实际page组合、200DAU端云混合容量都保持未完成。
