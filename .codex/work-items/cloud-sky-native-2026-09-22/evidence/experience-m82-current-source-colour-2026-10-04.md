# M82 当前 noise-v2 与真实源扫描的有界对照

2026-10-04，r104。Goal 实时 active、无预算、未完成；保持原工作区、`codex/remote-main-20260908` 与 HEAD `72e65cf309d700cb7d40c5b7afd53660fd39fa35`。本轮只新增三个 Sky 任务脚本及更新四份对应文档，没有修改 production code 或云观星以外业务逻辑。六项 Settings/outbox 受保护修改保持原字节。

## 结果与边界

按唯一 PLAN，对 r103 仍可见绿色条带/颗粒比较真实来源与当前恢复模型。复用 r91 保存的真实 native-stage samples/flags/normalized geometric weights/field 身份，原 SCI 和当前 noise-v2；没有使用旧 noise 资格来选择当前模型。没有下载、重新读取 native frame、投影、重做完整 coadd、variance/PSF/146 响应拟合、恢复估计或 tone trial。新增 per-RUN grouping 只是同坐标诊断均值，不是重新出版科学母图或背景估计。

| 原坐标窗（128×128） | 当前 qualified / protected | r 波段占优 / 其中 protected | q 且非 protected、radius=8 未 reached | 两 RUN 均有供给且 native flags clear |
| --- | ---: | ---: | ---: | ---: |
| outer-stripe，384,128 | 15566 / 312 | 4721 / 61 | 7812 | 6242 |
| upper-stripe，1152,640 | 15537 / 12605 | 8635 / 6991 | 1 | 5197 |
| lower-galaxy-stripe，1152,1152 | 15331 / 15331 | 3 / 3 | 0 | 0 |
| warm-core，960,960 | 15940 / 15940 | 0 / 0 | 0 | 0 |

`r > max(g,i)` 仅描述输入波段关系（r 映射显示绿色），不是背景/伪影/噪声显著性分类。上方窗口约 81% 的 r 占优点被当前模型保留为强信号；单纯扩大现有弱信号恢复半径不会处理这些点。外围另有大量当前恢复未达目标点，不能混为同一原因。旧 qualification 与当前 v2 在外围/上方分别有 612/583 个差异，protected 分别有 9/519 个差异；旧数组不能冒充当前资格。

上方两 RUN、flags-clear 同坐标 5197 点的 `RUN4294 − RUN4264` g/r/i 中位数为 0.0058105513 / 0.0101102069 / −0.0015650652 nMgy/native pixel。按当前 r 占优再选择的 2406 点，其中位数为 0.0064339191 / 0.0181346200 / −0.0217404999。这证明保存的源样本确有波段差异；后者是颜色条件选择，不能当无偏背景偏移、更不能证明显著性或差异原因。各 RUN 覆盖不同，不能直接比较各自整个窗口均值来估背景。

暖核/下方完整 16384 点当前 display estimates 与原 signed SCI 三带精确相同；只有 RUN4264/field261，无 RUN4294，第二扫描与差值均保持 NaN。暖核实际 g/r/i 均值 2.2356230007 / 6.9026904238 / 11.0259440356；下方 0.2526623013 / 0.5696594690 / 0.9279252981，均保原 i>r>g。不能把这类真实暖信号当背景扣掉，也不能把缺少另一 RUN 表述为零值对照。

完整四份实际诊断页已看：[外围](../../../../output/sdss-m82-current-source-colour-1004-r1/outer-stripe-actual-source-v2-comparison.png)、[上方](../../../../output/sdss-m82-current-source-colour-1004-r1/upper-stripe-actual-source-v2-comparison.png)、[下方](../../../../output/sdss-m82-current-source-colour-1004-r1/lower-galaxy-stripe-actual-source-v2-comparison.png)、[暖核](../../../../output/sdss-m82-current-source-colour-1004-r1/warm-core-actual-source-v2-comparison.png)。正负采用逐带共同 max-absolute 标度，粉色表示缺少 RUN，底部记录当前模型 masks。它们不是自然彩色成品；星体决定标度时暗处不证明 sky=0。局部坐标是已有残留/控制点，不是范围或质量样本上限。

## 开发读回与资源

[执行脚本](../scripts/experience-m82-current-source-colour-2026-10-04.py)保存四份 comparison NPZ、逐窗结果、图页及 [完整结果](../../../../output/sdss-m82-current-source-colour-1004-r1/result.json)，结果 152683B、SHA256 `970e76b07d1eccad45d5e5d3ac020754da3cfb8bee8549b4db5d83e2bad8d4ab`。实际用时 10.870334s、CPU 10.8125s，offline peak working set 115900416B、peak pagefile 448569344B；非客户端/服务/native 总峰。

[独立算术读回脚本](../scripts/readback-m82-current-source-colour-2026-10-04.py)没有导入或重跑 producer，用逐点 scalar 求和重新核 231771 个真实 RUN 值及 161445 个缺失 NaN；全部字段、权重、availability、native reject、原 SCI/current-v2 图、差值、mask/count 与保存 NPZ 精确。逐 RUN 均值采用 math.fsum，允许仅机器算术求和差，不给原数组或图像容差。三个 producer 边界检查通过：零权重非有限值为无观测、缺失 RUN 不作零或差值、正权重非有限源拒绝。读回 0.555032s，[结果](../../../../output/sdss-m82-current-source-colour-readback-1004-r1/result.json)。这是根代理自审，不是独立 scientific review 或目标运行时验收。

编辑前四个 owner 文档按 r103 绑定原字节封存；493 个旧源中其余不改、9349 个旧证据及六保护精确。三新 Windows development/diagnostic/readback 目录实测 22 files、5239507 logical bytes、5287936 reported allocation bytes，distinct identities 22、maximum links 1、前后稳定。[分配事实](../../../../output/sdss-m82-current-source-colour-readback-1004-r1/allocation-and-observation.json)。排除后续文档/log/checkpoint/continuity、旧源与依赖、FS 内部和真实 Linux retention/端云容量。原 BFF/watch 不重启；实时最终清单及边界见 [r104 checkpoint](current-execution-state-2026-10-04-r104.json) 和其随后保存的 continuity，禁止倒填为早期运行事实。

## 唯一下一依赖

依据本次差异，B 下一步核共享来源/背景责任能否用真实 native 身份、保留的已应用 SKY 和当前有效 variance/供给区分源背景/跨 field 差异与真实发射、强信号保护及弱信号恢复未达目标。先读已有 owner/直接研究和合法成熟处理路径，形成有依据的修复对象后改对应共享责任。当前源差值/颜色条件中位数不够授权背景扣除；不能局部抠色、改 r/i 比例、再次调亮度藏色带、把 galaxy 当 sky 或 alpha 隐藏缺测。保持原 SCI/alpha/WCS、r103 有限区间高亮肩部、冻结 recipe/出版版本。

不重跑已闭合 variance/PSF/146 source 响应、完整 coadd fit、旧矩阵、无变化 API/static/page 组合或旧曲线。候选不变；图质、来源、完整批量出版和成本未过，普通 registries 仍空。高 DPR 正常完整来源/default budget、native 物理总峰、M51 矩形 FAILED、W3 覆盖、strictBack 历史失败、WXML FAILED、手机不可用/新版月面未推、实际 retention 与混合 200DAU 容量、独审 MISSING 和原 33 项义务保持。没有提交、推送、部署或发布；Goal 不完成、不暂停。
