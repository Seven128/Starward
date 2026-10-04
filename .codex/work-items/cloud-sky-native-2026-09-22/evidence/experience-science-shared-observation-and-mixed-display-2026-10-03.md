# 跨字段观测身份与共同混合显示

沿PLAN唯一下一依赖，复用现有真实frame/CAS、已独审的贡献flags、coadd/字段科学数组及冻结RGB，不下载科学源、不重建全幅重叠/PSF/flags矩阵、不改生产或出版。新增有界身份检查和真正混合coadd共同显示输出，增量独审MISSING、完整质量/native/普通采用UNVERIFIED。

## 共享观测身份与实际差异

[DR17成像说明](https://www.sdss4.org/dr17/imaging/imaging_basics/)说明每个run是连续漂移扫描，字段1489行，相邻重叠128行；[SDSS教学页](https://voyages.sdss.org/help/skyserver-navigate/fields/)明确这些重叠为重复数据。由此同run/camcol/band的相对CCD行索引可写作 `row + field*1361`，不同run或band不可合并。该定义只用相对行原点，不称绝对相机原始时间索引。rerun限定相同处理版本，不能因同一底层观测忽略不同处理状态。[DR17 Resolve](https://www.sdss4.org/dr17/algorithms/resolve/)的catalog primary裁边/唯一检测规则不授权直接裁去当前影像覆盖或把其当coadd噪声政策。

[实际身份脚本](../scripts/experience-science-shared-observation-2026-10-03.py)只查3699/99→100及3716/117→118两对的g/r/i，四个16²原生重叠块/带，以及两块已存在的33²目标需求。旧reader receipts逐对象相等，source/代码/六保护文件before-after hash保持。不是全幅扫描或又一轮配准拟合。

| 字段对/带 | 同目标需求共享原生索引数 | 目标坐标差B−A中位数 [列,统一行] px | 四块重建counts相关系数范围 |
| --- | --- | --- | --- |
| 3699/99→100 g | 1,184 | [−0.06829,+0.06869] | 0.98076–0.99791 |
| 3699/99→100 r | 1,189 | [+0.02197,−0.02522] | 0.99282–0.99581 |
| 3699/99→100 i | 1,184 | [+0.09735,+0.07964] | 0.99604–0.99671 |
| 3716/117→118 g | 1,176 | [−0.20066,+0.21274] | 0.98312–0.99857 |
| 3716/117→118 r | 1,184 | [−0.02871,+0.13098] | 0.99138–0.99759 |
| 3716/117→118 i | 1,184 | [+0.02176,+0.07409] | 0.99444–0.99825 |

四块/带每块256个实际native像素：同对gain/darkVariance相同，CALIB比值不等于1，反算counts及其方差也不逐字节相等。多块counts差p05/p95接近−1/+1，方差比p05/p95在g带约0.982–1.018；中位数近1不证明严格相等或完整协方差。各块未新增坏像素筛选，不称全部质量合格/空天。浮点/校准/sky/处理差异的具体因果没有由这些数据单独确定，不据此改gain或扣sky。官方[corrected-frame说明](https://www.sdss4.org/dr17/imaging/images/)有有损精度处理及线性头未含完整polynomial的边界，但没有据此将当前±1counts差异归因为压缩；已有缓存data model保持。

R1在读取首块后因误写返回字段名 `calib_nmgy_per_count` 而exit1，未取得量测记录；真实owner字段为 `calibration_nmgy_per_count`。保留失败脚本/输入与[失败记录](../../../../output/science-shared-observation-1003-r1/failed.json)，R2在新目录完成，不覆盖旧文件。[R2 result](../../../../output/science-shared-observation-1003-r2/result.json)133,200B/SHA `62f5348145b90a9f16605321fe31a389eb753eba366fb3e2eaf53bd86a2b5308`。该结果确立重复观测与映射差异边界，不宣称新的全幅精确天体测量或coadd协方差验收。

## 共同混合显示小路径

不能从不同字段的科学/方差非精确相同，反过来把它们当独立曝光，也不能给整个coadd用单字段σ。当前小路径复用成熟共同双边显示机制，在**实际混合coadd上只处理一次**，计算空间变化的实际字段权重与同字段共享native像素协方差；未知跨字段协方差保留，未指定为0或强行等于共享CCD的单一方差。

令每个字段对同一中心/邻点的贡献差为 `D_f=w_f(B)X_f(B)−w_f(A)X_f(A)`。在既有原生对角噪声模型下，由平方重采样系数和同字段共享native像素求每个 `Var(D_f)`；实际几何权重随位置变化，不将其当confidence。Cauchy–Schwarz给出 `Var(sum D_f) ≤ (sum sqrt(Var(D_f)))²`，无需先指定跨字段相关系数。这里是**以输入边际模型成立为条件的上界**，不含被模型遗漏的sky/系统/处理噪声，不是实际置信区间/完整科学不确定度界。缺边际模型保持未知，零贡献字段不增加方差。

[混合显示脚本](../scripts/experience-science-mixed-noise-display-2026-10-03.py)只处理真实 `[1952,1984,1985,2017]` 33²及2px halo。这是前轮只试单字段的外围区域，此轮首次使用实际两个字段的coadd科学值及共同noise边界。权重中位数约0.485584/0.514416，沿区域变化；第三至六字段实际权重均为0，不请求或采样其noise。全部三带旧coadd、字段科学、实际四邻贡献flags、固定recipe绑定；原RGB逐字节等于冻结参考，字段缓存样本与实际reader重采样逐字节一致。保存的float32权重重建coadd最大差仅7.45e−9，核其舍入边界，不修改原coadd。

固定同一5×5/空间σ1/rangeσ1，共同三带权重根据上述条件上界得出。该区域原先全部处理flags为0，此次全部1,089中心可处理；改变646个RGB像素。R−G标准差7.71394→5.39783，B−G 4.05077→2.80012，RGB均值[4.65565,1.88889,1.08724]→[3.23140,1.29385,0.75390]。非黑582→624是显示重分布，不是新科学覆盖；这块不是认证的无天体空天，标准差变化不能等同完整质量。右邻条件上界/错误独立字段方差和中位数g/r/i为1.96173/1.96138/1.96036。实际[混合区比较图](../../../../output/science-mixed-noise-display-1003-r2/comparison.png)已查看，色粒有所减轻但仍有残余，不能以该图验收星点/旋臂/边界质量。

有界代数控制覆盖ρ从−1至+1、错误独立相加反例、未知边际不填0及零贡献中性。kernel约0.02243s，仅本机33²计算，不含完整取源/准入/采样/I/O，不外推整图批量成本或设备性能。R1在kernel之后以浮点严格等式断言 `(sqrt(.2)+sqrt(0))²==.2` exit1；改控制为1e−15相对容差，未改过滤kernel/模型或降低实际像素条件。保存[失败记录](../../../../output/science-mixed-noise-display-1003-r1/failed.json)，R2独立目录取得[result](../../../../output/science-mixed-noise-display-1003-r2/result.json)11,153B/SHA `e7ebfca9c61bca8bc8b7757b34ed53ee89e8775eae71bb056df3029f1f5c4ac0`。两次失败均不得计作成功输入/质量证据。

## 当前决定

观测身份和条件边界足以继续**显式候选开发**，不要求先发明完整科学confidence图，也不能声称已得到它。共同混合处理有实际像素效果，不采用单fieldσ/字段独立噪声或分别过滤后硬切。这是一条可复用的离线显示责任，下一步接入明确共享owner的显式candidate，保科学原值/资格/三带共同权重、missing/zero-contribution/坏点/取消与有界内存；single/mosaic/partial消费同一规则后，按当前完整母图/LOD实际背景接缝、星点/弱结构、来源与加工成本核结果。不能把该33²块当普通采用上限或质量验收。

这轮未改生产reader/noise/display/writer、旧source/master/publication/default；原有生产检查未因任务脚本变化而重跑。全部输入/六保护文件保持，零科学获取/零完整矩阵。独审MISSING，普通science/Prepared仍空，照片M51矩形FAILED、M82 OV/MED不足、原生WXML/Canvas失败、实际page/Back/time/native/手机与200DAU整产品混合容量缺口保持。唯一下一依赖在PLAN顶部。
