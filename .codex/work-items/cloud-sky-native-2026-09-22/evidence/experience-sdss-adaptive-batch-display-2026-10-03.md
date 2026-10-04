# 共同孔径显示的批量等价与实测

沿唯一 PLAN B，在既有 [局部实际显示](experience-sdss-adaptive-local-display-2026-10-03.md)之后，新增有界 `adaptive_common_display_batched` 和 `batch_field_aperture_variance`。共享 owner 仍用原科学 coadd、同一三带支持、强结构排除、真实 native ID 聚合与跨 field Cauchy 条件上界；没有目标像素独立假设、再次扣 sky、颜色拟合、下载或新依赖。普通 registry/default 未采用，独审 MISSING。

每批默认64、允许1至256个目标，按 field/带逐次聚合，半径仍1/2/4/8。各行的原生贡献先按身份分组直接求和再平方；目标/field/band 不混组。零贡献未知中性、正贡献未知保未知，同一原生身份噪声不一致拒绝。保符号对称、强单带全色保护、完整几何支持不足停止扩大、最后有效均值与未达门槛 false、外8px保原、取消不返回半成品。门槛附近回用原标量算术，避免舍入改变尺度；不是新模型或科学置信保证。

## 发现与修复

首轮 [r1](../../../../output/sdss-adaptive-batch-1003-r1/result.json) 的四块实际输出一致，外围耗时0.57384秒，但后续自审发现累计总和相减会消去极小组的系数。新增实际执行的回归反例：两独立 native ID、系数1和1e-16、方差1和1e32，均值方差应为0.5，首轮返回0.25；9项孔径检查中1失败，exit1。r1仅保留该版在声明区域的历史等价证据，不认证当前生产实现或一般数值等价。

已改为 `np.add.reduceat` 对每组直接归约，避免不同身份的累计总和相减。反例修后通过；同时保留 unsigned 最大原生 ID，不把它误当未知哨兵。实际批量检查覆盖重复身份、空间权重、未知和无效支持、不一致噪声、极小贡献；adaptive检查覆盖批次1/7/64、字段组合、强结构、符号翻转、缺口、取消，以及确实触发的近门槛标量回退。受影响 display14项和 aperture9项通过。检查数量不代表图质完成。

## 当前实际消费

[最终消费脚本](../scripts/experience-sdss-adaptive-batch-final-2026-10-03.py)复用既有源准入/配准路径，读取缓存 frame/fpM/CAS、原 coadd/weights 和冻结 recipe；新机制是重复执行的理由，未重跑旧固定过滤、15孔径矩阵或下载。18frame/来源/科学/旧显示候选/旧出版/default/六项保护文件前后 pin 保持。旧局部结果和全部输出按已保存外部 pin 核对。

[r2 当前结果](../../../../output/sdss-adaptive-batch-1003-r2/result.json)，15,855B，SHA256 `4627aa06fd37bf047516a83efd122c189ef8e46ce2dfd84345d15917057d6966`。四块49²支持/33²结果的 estimates/radius/reached/protected/eligible/original-measurements 与旧标量输出逐值一致，冻结 RGB 逐像素一致。arm/diffuse/flagged 块保原；outer1077均值、769RGB改变、12强点保原，仍全部未到共同门槛，既有暖色/绿晕和完整质量缺口没有改善或升级。

| 当前实际同一区域 | 旧标量 kernel | 最终批量 kernel | 解释 |
| --- | ---: | ---: | --- |
| outer-mixed 1077低幅值中心 | 2.00327s | 0.49459s | 约4.05倍；一次本机同输入观测，不是统计尾延迟 |
| 其余三块几乎全部保原 | 约0.00025s各块 | 约0.00015至0.00018s | 不据此宣称完整处理加速 |

未测完整母图/批量总CPU、RSS、磁盘、服务或手机资源；有界批次不等于整场物理内存认证。原标量仍供近门槛及有界回归，未更改公开 VERSION 的候选政策；本次实际执行 owner 文件另行保存，不能倒填旧执行代码。

[保存原生贡献读回](../scripts/readback-sdss-adaptive-batch-2026-10-03.py)用此次保存的49² actual stencil，对三个已声明中心与半径1/4/8计算独立 dense H diag(V) Hᵀ，再核当前批量 field/band 方差和跨field上界，rtol2e-13/atol0通过。没有执行adaptive filter/重新取得frame；[结果](../../../../output/sdss-adaptive-batch-1003-r2/readback/result.json)，4,908B，SHA256 `f071d4a65744e897ddd780d9fd372cf26c21450b3ab77d2768e0ada2e7fb8305`。这是root另一算术路径，不是独立人员审查或遗漏误差认证。

## 下一依赖

批量算术资格已在当前范围闭合。接完整原coadd母图的有界真实halo/source准入消费者及数值LOD，测整体离线CPU/RSS/存储并查看真实各级背景、弱结构和接缝。不得滤旧估计、假设独立noise、循环调参或把更暗当弱结构保持。全部权利/加工来源/完整图质/配准和必要独审通过后才接正式发布采用链。原生 page/来源Back、FAILED_DEVTOOLS、Android/iOS、新月面及生产混合容量仍开放。
