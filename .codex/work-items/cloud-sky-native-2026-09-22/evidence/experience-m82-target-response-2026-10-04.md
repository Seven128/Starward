# M82实际native单位PSF到科学coadd响应（2026-10-04，r88）

本代只修改云观星任务脚本、相关进度/Context文档，没有生产或其他业务逻辑修改。六项受保护设置/outbox、原工作区/分支/HEAD与BFF/watch保持；无提交、推送、发布或部署。普通Prepared registry空，原33义务开放。

## 实际消费者和责任

复用18原帧、六psField、原science/fullcandidate，全部20已核目录星点和114中央provisional三带候选。另取12声明几何位置：对象中心、六field各一个实际正到零权重覆盖transition、最大共同field overlap及四target角；它们不是检测到的恒星。146位置是本代实际材料全集与机制控制，不是质量样本或产品覆盖上限。

[共同任务helper](../scripts/sdss-native-unit-response-2026-10-04.py)提取原成熟机制，供[新M82消费者](../scripts/experience-m82-target-response-2026-10-04.py)及两个历史M51 runner。旧入口原字节分别保存于本代executed-previous-target-response-1/2.py；旧M51矩阵没有重跑，原源/图像/证据保持。新helper采用已有缓存Photutils3 ImagePSF及既有science bilinear owner，无生产依赖或requirements改变。

每位置仅一个common sky anchor，经真实source WCS到原帧zero-index坐标，按位置重建signed51×51相对PSF；只为单位模型归一其有限kernel sum，绝不重新校准科学flux。实际integer原帧采样、all-four-neighbor float32科学双线性和已保存common-gri几何权重合成。field形状/足迹/finite与归一权重按原公式读回；跨RUN/同RUN混合不提供独立曝光假设。有限模型域、画幅外anchor或正权重不支持保unknown，即使非有限邻点插值系数为零也不擅自补零。原science/current/maps/coverage/alpha/frozenrecipe不动。

五个边界回归涵盖signed整数和subpixel、有限域含zero-weight未知邻点、CCD/非有限坐标、空几何/外anchor和无效kernel拒绝；unknown→zero的有界反例会误准入两项。历史入口迁移后未执行旧M51矩阵，不作其新品质/消费者矩阵证据；共同helper已由M82真实路径执行。

## 实际保存结果与不同算术路径

[生成结果](../../../../output/sdss-m82-target-response-1004-r1/result.json) SHA256 `cf86aedf8017e7868c09a0b1c393395dba9b09fccf0b188b3bffec12900e37bb`；[原FITS/保存算术读回](../../../../output/sdss-m82-target-response-readback-1004-r1/result.json)直接取原psField basis/declared-order多项式与source FITS WCS，不导入producer/shared helper/ImagePSF或科学sampler。原scalar target TAN网格保精确，不拿序列化header圆整值改坐标。

146份原kernel/WCS坐标、science/current/五处理maps、源足迹/真实权重、all-four-finite sampling与coadd精确。独立row-first SciPy spline与ImagePSF traversal最大native差 `6.938893903907228e-17`，在actual normalized kernel推导的16机器EPS界内；显式四邻以已核保存native模型作输入，最终f32 response/coadd逐值精确，不用科学/像素容差掩盖差异。错axis反例最大unit模型差 `.01836461183881954`。

| 已保存事实 | 本代实数 |
| --- | ---: |
| 位置中单RUN/双RUN | 128 / 18 |
| 一/二/三正field位置 | 113 / 26 / 7 |
| response未知band pixels | 36,385 |
| 诊断radius12内未知band pixels | 416 |
| 正权重anchor不支持pixels | 3,753 |
| signed负模型pixels | 283,581 |
| radius12 within-field重复native邻点出现 | 644,320 |

这些是模型/算子事实：未知不代表原科学missing，负值不丢弃；重复次数不认证跨field独立/噪声或physical duplicate exposure。单位PSF/target patch sum也不是校准总flux，双线性reprojection不被声称flux conserving。upstream模型与primary WCS均非独立天体/绝对配准真值。

[13页完整实际对照](../../../../output/sdss-m82-target-response-1004-r1/actual-science-current-unit-response-1.png)至第13页全部查看，展示保存science r/current r和数学unit gri；各panel独立inspection stretch，不能flux比较或作residual。可见紧致源、邻近源、扩展星系结构和条带/颗粒；边目标crop按实际尺寸、common anchor可在非中央位置。既有339条件fit/3非正幅度、触边、结构残差以及114 provisional状态保，不升为恒星或PSF品质。完整图质仍FAILED/UNVERIFIED。

## 范围、资源和保留

生成实际26.9835802秒、CPU26.78125秒；单次offline工作集峰810,070,016B、peak pagefile1,402,372,096B。包含该进程加载源及保存诊断，非全链/手机/服务峰或200DAU容量。reader峰未测，不从文件时间推断。[新文件分配](../../../../output/sdss-m82-target-response-readback-1004-r1/allocation-and-observation.json)测量前168文件、41,593,660逻辑B、41,971,712 reported allocation B，实际独立file IDs/maxlink1、前后稳定；排除测量/doc/checkpoint、旧source/candidate/tools、filesystem internals/snapshot，不能当Linux180GB余量/retention或混合成本容量。未删任何资源。

原393source仅两历史Sky task入口本代必要迁移（旧字节档保持）；5612旧evidence/6保护在生成前后和分配收口精确。最终完整docs/源归属/进程/staging以r88 checkpoint和post-checkpoint continuity为准；后者下一轮补pin。本代无detector/variance/fit重跑、whole filter/coadd/source下载或catalog查询，没有修改当前候选或发布采用。已有缓存成熟库，未新增付费设施。Context validate只证结构，自审不是独立审查。

唯一下一依赖由PLAN顶部控制：消费raw/cohort/native有效系数和保存source q/strong/实际radii/分支，取得固定记录条件的显示局部响应；本代science response不能代替它，也不能把固定分支响应当非线性adaptive全局PSF。缺失/有限域保持，比较实际形态后再据证修完整配准/PSF与背景弱结构图质，所有来源/完整发布/设备/成本/独审义务原状态保持。
