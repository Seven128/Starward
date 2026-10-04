# M82实际记录分支的局部显示响应（2026-10-04，r89）

本代只新增云观星任务诊断、读回和相关文档，没有修改生产代码或云观星以外的业务逻辑。六项设置/outbox保护、原工作区/分支/HEAD、BFF/watch保持；无提交、推送、发布、部署或删除。Goal active、无预算、未完成；普通Prepared registry空、完整品质及原33项义务开放。

## 实际消费者

复用全部20目录星点、114中央provisional三带候选和12明确几何controls的146份science响应，不重跑检测、原native fit、全域variance、coadd/filter或孔径选择。146不是需求或品质样本上限。原恢复owner只为新消费者取得146个实际有界source/native系数窗口：目标radius12、最大记录孔径8的真实halo，完整raw/cohort/MJD/flags/noise、有效common-gri权重、native IDs、source q/strong和原保存radius/protect/reached/affected。不用已过滤估计冒新raw测量，不猜q|supply。

[固定记录响应helper](../scripts/sdss-fixed-recorded-display-response-2026-10-04.py)消费实际已记录条件，R1/2/4/8要求完整合格共同圆再排除strong邻点，弱中心保留；R0/−1消费原raw分支。真实raw均值按float64累计、float32终值与fullcandidate逐值精确。模型复用所有原crop响应，仅为24个field/band实际新外侧模型补7,146个正贡献采样；有限signed PSF域、原四邻和正贡献unknown保留。模型以已保存float32 native采样和float64有效系数/共同孔径计算相对unit响应，处于非线性RGB之前。

它只回答固定source cohort、资格、strong排除及半径条件下的数学响应，不重选variance/阈值/半径，不是量化导数、branch sensitivity、非线性adaptive全局PSF或可直接采用的matching kernel。目标边角crop和halo保持真实位置；原科学、coverage/alpha/WCS、recipe、候选和处理maps均未改。

五项边界回归通过：完整共同圆/强邻排除及signed均值、被排除unknown与被选unknown、资格孔洞不得搭桥、raw/strong保粗，以及错误分支/缺halo/不支持半径拒绝。[生成结果](../../../../output/sdss-m82-fixed-display-response-1004-r1/result.json) SHA256 `8ed550a755c070628f77565e0bc61192e08742e17da167ecd066dd1a9c94c27f`；全部146位置、64,486个核心目标出现（重叠窗口并非唯一全图像素）、570个响应通道目标unknown。

## 原帧读回与失败保留

[原FITS/保存算术读回r2](../../../../output/sdss-m82-fixed-display-response-readback-1004-r2/result.json)不导入producer/recovery/fixed helper/ImagePSF或sampler，只复用独立原FITS方差算术helper。原18帧、camera/flags、六psField实际basis及WCS、四邻native地址/系数、原CALIB-SKY条件方差、完整RUN/MJD、原供样资格/有效系数、source q/strong/current maps、CSR选样与原均值全部精确。24个新增外侧模型直接原kernel/row-first spline/显式四邻读回；最大native浮点差2.7755575615628914e−17处于实际kernel机器界内，最终采样/合成/孔径逐值精确，不放宽科学像素比较。错误包含strong邻点的有界反例改变15,792个目标unit响应均值，证明排除规则实际参与消费者；967供样是重叠窗口出现次数，不冒唯一全图Sup。

reader r1在第一块失败：原science算术是原始float32几何权重先累计float64分子、再除总权重；首版误用已归一float32权重重算，119/5,043标量不符、最大1.4901161e−8。原失败源档、failed.json和日志保持，r2只修reader算术顺序；RUN恢复仍按真实已归一权重累计，不强行统一两个不同算子。未改原source/candidate或重跑生成矩阵。

保存radius计数：R0=47,148、R1=196、R2=1,832、R4=5,286、R8=9,465、R−1=559。原339中央条件fit/3非正、触边/扩展残差及114未认定恒星状态保持。

## 同尺度形态与舍入区分

最初13页每panel各自stretch，仅用于查看；全页已读，不能把自动放大的delta当真实形态改善。新[保存形态分析](../../../../output/sdss-m82-fixed-response-shapes-1004-r1/result.json)只读本代NPZ，没有重投影/方差/fit/filter/coadd。分别比较同cohort raw float64→fixed float64，以及science float32→fixed显式float32；raw R0/−1在float64层逐值相同，无alternate的raw分支在float32层与science逐值相同。

| 差异含义（通道目标出现次数） | 数量 |
| --- | ---: |
| 原f64 fixed相对f32 science数值不同 | 72,635 |
| 其中仅f64/f32终值舍入 | 21,688 |
| science f32相对fixed f32不同 | 50,947 |
| 同cohort raw f64相对固定孔径f64不同 | 50,129 |
| raw alternate且共同已知的f32变化 | 818 |
| fixed未知 | 570 |

50,947分为50,129个孔径变化与818个raw alternate变化；分组alternate仅标目标中心，孔径可含alternate邻点。不能据数量推断flux/注册精度、核形态足够或实际图质通过。

[15页共同signed尺度](../../../../output/sdss-m82-fixed-response-shapes-1004-r1/common-signed-scales-1.png)至第15页全部查看：每行science/current共用实际nMgy尺度；science unit/fixed unit/delta共用相对单位尺度，delta不再独立放大。诊断橙正/蓝负/紫unknown、黑未取目标或零，不是出版天空RGB。强核心响应保持，弱翼及边缘真实孔径作用可见；实际扩展结构、邻近源、条带颗粒仍与点响应不同，尚无PSF适合性或画质验收。新图没有科学mask或填补。

## 实测资源与范围

生成109.959262s、CPU109.25s，offline peak working set1,295,425,536B、peak pagefile1,366,855,680B；最大单窗口retained stencil1,573,416B不是进程峰。reader33.752586s，形态分析1.179078s；后二者峰未测，不从文件时间补。上述均非客户端/服务器/全链峰或容量结论。

[文件分配及观察](../../../../output/sdss-m82-fixed-display-response-readback-1004-r2/allocation-and-observation.json)核四新输出目录478文件（包含失败reader/当前reader/执行源档）、50,379,122逻辑B、51,257,344 reported allocation B，478不同file IDs、maxlink1、前后稳定；排除测量/docs/logs/checkpoint、旧源/候选/依赖、filesystem internals/snapshot，不能认证Linux180GB余量、静态保留、端云成本或200DAU混合容量。全部保留未删。

原398源码/5,789旧证据/六保护在生产与收口前精确；最终只允许五个既有Sky文档/捕获入口改变和六个新任务源码，归属、服务起时及staging以r89 checkpoint/post-checkpoint continuity为准。原r88 checkpoint及其post-checkpoint continuity补入本代绑定。没有新增依赖/付费设施/下载、production business变更或采用。Context validate只证明结构；不同算术读回属于自验证，独立审查仍MISSING。

唯一下一依赖由PLAN顶部维护：用保存真实science/current、native拟合原残差及本代146份source/cohort/ID/系数/选样/unit模型进行目标局部形态、幅度/平面与残差适合性诊断。需要条件noise时按真实native重复ID合并系数、跨field保已有保守界，不假设目标像素独立或升级missing为零。实际证据再决定配准/PSF及完整矩形条带背景/弱结构/coverage/三级修复；完整权利、标准出版缓存SourcesBack、W3/设备/保留成本容量及原33义务保持。
