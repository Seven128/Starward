# M82真实目标剖面、平面与残差诊断（2026-10-04，r90）

本代没有修改生产代码、影像候选或云观星以外的业务逻辑。原工作区/分支/HEAD、六项保护、原BFF/watch起时和staging0保持；无下载、提交、推送、部署、发布或删除。Goal active、无预算、未完成；普通Prepared空、完整图质/发布/设备/成本/独审及33项义务仍开放。

## 实际新消费者与方法含义

[新消费者](../scripts/experience-m82-target-profile-2026-10-04.py)只读已保存146位置的真实science/current、science unit和固定记录条件unit响应及真实CSR选样，复用原20目录星点/114中央provisional候选的402个native结果文件。12几何controls仍不是检测到的源。旧detector、native fit、variance、science/响应矩阵、孔径选择及coadd/filter均未重跑。

同一[任务级剖面责任](../scripts/sdss-descriptive-target-profile-2026-10-04.py)供science/current两消费者，使用已缓存NumPy SVD最小二乘，拟合unit幅度和局部仿射plane；另有plane-only基线。当前plane定义于已确定cohort后的raw display sampling视图，按实际CSR圆/strong排除取均值再拟合；不把目标中心x/y直接当孔径后plane位置。science项定义于实际目标坐标。常数、dx/12、dy/12只是拟合坐标条件化，12来自已声明诊断半径，不是新处理参数。

所有三带共计876个band-stage描述性投影完成。使用两阶段共同的qualified、实际数据finite、science模型finite及fixed模型已知支持；共2,059个通道目标出现未参与拟合，原科学数据/资格/coverage完全不变。预测在模板有限域显示，拟合指标只针对记录共同支持，其他位置不被升级为验证通过。源signed值、模型有限域unknown、非正幅度和原native非正/触边/扩展残差全部保。

这是无方差加权的描述性投影：不假设目标像素独立，不计算chi-square/置信度或配准精度，不优化目标中心，不校准总flux或新扣sky。幅度是nMgy/相对采样unit，不认证flux-conserving全量。残差可同时含noise、邻近/扩展结构、位置及模型误差。native结果沿用原权重/空间/支持；其原RMS只供上下文，不与目标RMS作直接质量比较。拟合plane不是实际source sky，也不写回science/current。

三项回归验证实际责任：非对称排除后plane须变换、signed非正幅度不得丢弃、rank/缺选样/非有限准入拒绝。合成fixture只核算术，不生成或展示虚构天体细节。

## 真实结果和形态

[生成结果](../../../../output/sdss-m82-target-profile-1004-r1/result.json) SHA256 `25cc3c9ad5f751406aad2f4a993d0e89e84b9870bda3e4a0a4470782301a78c7`。science有420正/18非正幅度，current有418正/20非正，全部原样保存；原native339条件fit/3非正无残差、60目录条件fit、触边及114非恒星状态没有被新描述性正幅度覆盖。实际16,530目标出现的mapped plane与目标中心plane不同。

所有g/r/i的[19页实际数据/模型/残差](../../../../output/sdss-m82-target-profile-1004-r1/actual-target-profiles-1.png)至第19页已查看。每band一行sixpanels共用实际nMgy signed尺度；橙正、蓝负、紫模型unknown、黑未取目标/零，属于诊断色彩而非出版RGB。目录孤立亮核残差较小，弱/邻近目录样本仍有结构颗粒；中央候选包含明显扩展、双结、星系脊/邻近源，单point+plane留大块正负结构。recorded孔径减轻部分颗粒，但没有消除此结构或验证全局matching kernel。

| 材料 / 阶段 | 描述性残差norm/拟合point norm 中位 | 范围 |
| --- | ---: | --- |
| 20目录 / science（60带） | 0.124411 | 0.021886–1.150258 |
| 20目录 / current（60带） | 0.102737 | 0.021643–1.139840 |
| 114 provisional / science（342带） | 0.608554 | 0.010745–58.665343 |
| 114 provisional / current（342带） | 0.542739 | 0.010697–58.665343 |

这些比值不能当质量阈值、SNR或改善验收；幅度接近零会令比值很大。几何controls不放进星点汇总：其中science14/current16非正，证明不能把全位置当恒星PSF群体。目录/中央样本数量不是品质或产品范围上限。完整条带暖底/弱结构、coverage和三级画质仍FAILED/UNVERIFIED；绝对或全场配准/PSF尚未认证。

## 保存读回与可检出的消费者错误

[原保存/QR读回](../../../../output/sdss-m82-target-profile-readback-1004-r1/result.json)不导入producer/profile helper或source processing，直接按原CSR和实际坐标，以math.fsum另序重建plane；最大差1.3322676295501878e−15在实际机器界内。所有source数据/unit/诊断support、保存系数→prediction/residual、plane-only/各半径RMS及402原native残差摘要精确。QR另解876投影，预测相对SVD最大差1.1723955140041653e−13 nMgy；按实际design条件数/data尺度推导64机器EPS界，最大占界0.003035。该界只核不同浮点算术，不放宽科学数据、图像比较或品质标准。

用错误未映射目标plane会在207个current带阶段造成超过该机器界的预测变化；把science unit误作current模型则239个带阶段可检出。两条真实消费者反例证明共有plane/条件响应责任有实际效果，不只是源码标签。558输入绑定前后精确，全部旧r89源/证据/保护保持；自算术验证不是独立审查。

## 实测资源、保留和下一依赖

生成18.346492s、CPU18.15625s，offline peak working set107,155,456B、peak pagefile495,947,776B；reader3.888756s、峰未测。不是端云/完整链峰或4GB/生产16GB容量验收。[两新目录分配](../../../../output/sdss-m82-target-profile-readback-1004-r1/allocation-and-observation.json)：测量前318文件（含执行源档）、19,687,619逻辑B、20,385,792 reported allocation B；318独立file IDs、maxlink1、前后稳定。排除测量/docs/logs/checkpoint、旧source/candidate/nativefit/工具、filesystem internals/snapshot，不能认证Linux180GB余量、实际版本保留或混合200DAU成本容量。全部文件保留。

原404源码/6,277证据/六保护本代生成/收口前精确，最终仅五个既有Sky文档/捕获入口及五个新任务源码，见r90 checkpoint/continuity；原r89 checkpoint及post-checkpoint continuity补pin。没有生产依赖或其他业务逻辑变动，Context validate只证结构，独立审查MISSING。

本轮证据不支持以中央扩展候选直接构造全局PSF匹配、用局部plane再扣sky或外推绝对shift。唯一下一依赖按PLAN维护：转向仍实际可见的未供斜条带、暖底和弱结构，复用全保存source/science/current/资格强结构/cohort/radius/三LOD及真实native轴/field边界，核它们在native→共同science→条件display→冻结RGB/LOD各层的同域来源和空间关联；只有新的具体因果后修对应共有责任。既有PSF/原帧/孔径/页面闭合矩阵不再重跑，完整商业权利/出版缓存SourcesBack、M51矩形/W3暗区、设备/保留成本容量及33项范围保持。
