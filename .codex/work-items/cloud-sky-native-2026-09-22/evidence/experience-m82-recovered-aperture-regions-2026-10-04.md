# M82真实源孔径的有界增量显示

本代完成r81唯一下一依赖的小路径：既有恢复/source/noise/common-aperture责任接入真实恢复后sampling，五个128²支持窗口、112²目标内区实际运行；未重过滤整幅候选或科学coadd，没有下载、全图flags矩阵、新mask/猜sky/inpaint/默认采用。只修改云观星离线owner、相关回归、task/docs/Context，其他业务及六保护不动。

## 源码责任与开发验证

`sdss_display_recovery.py`内共享原RUN分组/MJD、实际投影资格/已知bad flags和供应选择。原whole recovery与新regional sampling使用同一责任；whole recovery仍立即释放单field native stencil，未引入全图保存stencil或新框架。原fixed-noise/current-adaptive/saved-rebase契约保持。

`project_current_recovery_region`验证实际科学、typed adaptive父与current-v3恢复的估计/诊断/版本、实际时刻、供应和值及非供应fallback；原始科学值与原始替代值构成独立display sampling view，不混用父已过滤估计。每目标实际选择RUN的原几何权重归一化，重新供应真正native ID/coefficients/SKY-camera variance。新view不成为科学coadd、coverage、confidence或来源许可。

`sdss_adaptive_display.adaptive_common_display_batched`增加明确目标选择，须有完整实源8像素halo。原无选择消费者保持；仅调用指定弱中心的原RADII1/2/4/8、sign-neutral ratio3与重复native-ID/Cauchy算法。返回未请求原始值仅供caller与已保存父组合，不能当已过滤候选。

`refine_current_recovery_display_region`从真实供应和最大圆依赖计算目标；对受影响弱中心执行共同孔径，输出typed regional result，真正不受影响值及原strong整色保持current-v3。源资格由真实native model重核，不由qualified|supply或计划需求提供。实际科学、joint availability、alpha、冻结recipe不变；区域外仍由完整候选caller负责，本代没有伪造完成全图。

新增`test_sdss_recovered_apertures.py`在旧owner先因缺少这条真实能力而失败。第一次新验证有三项失败：新test预期shape未显式broadcast；两条旧guard mutation仍指向已迁走的原函数，因mutation无效失败。只修预期shape并把mutation迁到真正责任（保同RUN/未知processing-ID逃逸反例），失败分代保存。补未知model、父policy与baseline processing version拒绝后，最后34项受影响检查通过；取消、缺供给、未知/同RUN、伪造供应/mean/hash/旧version、真实signed结构、原输出兼容和有界target均覆盖。新增policy guard在源投影前拒绝虚假版本/采用状态。

记录：`evidence/recovered-apertures-before-2026-10-04.txt`、`...after-2026-10-04.txt`、`...after-r2-2026-10-04.txt`、`...after-r3-2026-10-04.txt`、`...after-r4-2026-10-04.txt`。这是开发验证，不是WEAPP/手机或最终质量验收。

## 实际五窗口消费者

生产者`scripts/experience-m82-recovered-aperture-regions-2026-10-04.py`。原科学/current-v3、十八真实源、r81 raw sampling/有效权重已保存。本次每支持窗口的raw sampling/hash、有效field weights、qualified/strong map均精确实现r81真实前置；没有从task诊断复制一套生产资格。

实际[result.json](../../../../output/sdss-m82-recovered-aperture-regions-1004-r1/result.json)，SHA256 `c3882f888f439eaf96e4228d4fb7ba1b65af4a94345fdfd6bb941a09db075bea`。

| 窗口 | 受影响弱目标 | 估计改变 | 原recipe RGB改变 | owner调用秒 |
| --- | ---: | ---: | ---: | ---: |
| core | 0 | 0 | 0 | 0.721898 |
| background | 4029 | 2751 | 2721 | 2.574663 |
| diffuse | 0 | 0 | 0 | 0.660863 |
| field-transition | 0 | 0 | 0 | 0.694097 |
| qualification-edge | 5571 | 5008 | 4989 | 3.967798 |

806个原阻断中心不是需求上限；恢复供给会改变周围已有弱孔径的依赖，因此本次实际执行9600个目标。真正未受影响估计和原strong值保持，单RUN/无供给三窗口精确保持。全图原13096供给、原科学/recipe/旧候选/普通registry保持；本代只保存局部地域结果与检查PNG，没有把局部结果伪装完整出版。

实际[冻结RGB对照](../../../../output/sdss-m82-recovered-aperture-regions-1004-r1/actual-regional-frozen-rgb-pairs.png)已查看：两处部分斜向细颗粒条带减轻，真实无供给条带仍保留；核心、暖底/弥散细颗粒及单RUN交界保持。不能以部分改善认证全图图质、弱结构、接缝、PSF或绝对配准。

## 保存值读回与当前guard收口

根reader`scripts/readback-m82-recovered-aperture-regions-2026-10-04.py`的[result.json](../../../../output/sdss-m82-recovered-aperture-regions-readback-1004-r1/result.json)，SHA256 `fdfe229022ee9709bd0fb68c5ead8f486ebd042ead344e714486ddf992c80fb2`：全部9289个实际正半径共同孔径的完整source support、选中raw signed mean及保存f32估计精确；其余受影响fallback与未受影响current保持。两处共7759估计/7710RGB改变。10个按坐标分布的实际新孔径直接回原帧WCS/native ID、实际系数及SKY-camera variance，独立按native ID合并后的Cauchy/原始mean及RADII停止/ratio/reached一致；不是目标独立variance或已过滤parent采样。全部十张before/after PNG完整解码、RGB冻结推导和原alpha精确。没有再过滤区域或投影全矩阵。

随后源码自审补上父状态policy和baseline版本精确绑定；没有变更sampling或filter算术。`scripts/close-m82-recovered-aperture-regions-2026-10-04.py`只通过当前准入owner核真实已保存科学/adaptive/current-v3父，并把实际区域执行owner留在原archive角色，不用后改源码改写先前执行。首版精确旧test重构受Windows文本写入CRLF转换而失败保留，未读取原帧；r2用原字节写入，重构旧test与原执行外部SHA/bytes精确，当前34项policy检查通过。成功[guard-close result.json](../../../../output/sdss-m82-recovered-aperture-regions-guard-close-1004-r2/result.json)，SHA256 `f442cff3ef2f1d3e486fdc9f8b0701284783b1ef7d1838ea1e658caa94254365`。无regional filter/projection/coadd重跑；guard-only当前代码和旧实际执行分别记录。

所有这些为root自审；本代独立审查仍MISSING。

## 实际整图剩余依赖与资源

[dependency-demand.json](../../../../output/sdss-m82-recovered-aperture-regions-guard-close-1004-r2/dependency-demand.json)仅从已保存13096供应及原最大8圆确定调度需求，不提供新source资格：内区96349中心（原qualified75320、原unqualified21029须真实native准入），排除46530原strong依赖。沿现有64行得到23个非空有界支持块。外侧1202是本次依赖影响位置，和旧752原qualified无孔径位置是不同集合，本代均不补造外部资格。不能把23块或这份需求当全图质量/供应通过。

五owner调用合计8.619318秒；执行内含保存RGB/输入读回与最后冻结核验总15.058340秒、CPU14.984375。Windows Python peak working set1027534848B、peak pagefile948604928B；source/master/库与输出在内，非客户端/BFF/云端容量测量。

第一份[allocation.json](../../../../output/sdss-m82-recovered-aperture-regions-readback-1004-r1/allocation.json)只测区域生产者/root readback34文件：logical2144265B、reported unique allocation2211840B。第二份[guard allocation](../../../../output/sdss-m82-recovered-aperture-regions-guard-close-1004-r2/allocation.json)只测guard收口/首失败9文件：logical146622B、reported allocation159800B；两范围各唯一identity/maxlink1/前后稳定。测量本身、task/docs/checkpoint排除；不认证Linux保留、180GB余量或200DAU混合容量，没有扫旧数据或删除。

旧4010证据/六保护精确，原BFF24040/watch18132启动时刻不变；生产修改仅Sky离线recovery/adaptive owners和其测试。没有其他业务修改、staging、提交推送、下载、服务重启、手机预览、部署发布或采用。普通Prepared空，WXML Canvas失败/手机newMoon/strictBack/W3暗区/完整图质配准PSF/权利processing及完整发布链/真实静态引用和保留/成本容量/独审等原33义务保持。

下一仅由PLAN顶部控制：对实际整图剩余依赖做有界增量，外侧只经既有真实halo/source责任；保持全部未受影响结果，完成numeric/frozenLOD和processing责任，按实际完整输出再评估品质，禁止重过滤整图或用局部成功收口目标。
