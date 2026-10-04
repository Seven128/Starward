# 局部观察边缘：只读语义前置

本记录只核当前 `sky-deep-sky-region.ts`（2ded6d…）、raw TAN registration、实际 stereographic ray 与既有 M51 writer/CPU 结果；未改生产、运行 GPU/测试、取源或采用 aid 阈值。根的 current-state/document-closeout 文档复核另已直接回报，无新 artifact 链。

既有独立 `output/catalog-region-independent-1002-r6/result.json` 保真实四个单位椭圆边界反例。理想 `(1,0)` 的实际坐标为 `[1.000000000000088,-2.3424595596566178e-12]`，理想 `(0,-1)` 为 `[1.7337242752546445e-12,-1.0000000000007288]`，旧 `q<=1` 均 false。旧 contains 是 CPU 点几何；它没有缺测、EMPTY、保守 raster 域或 GPU 精度证明。不能把这些舍入结果当排除对象样本的依据，也不能把这次最大差或固定 `1e-12` 当所有相机/矩阵/shader 的统一误差上限。

## 最小三态与正向分支

下一局部观察责任应分 `inside / outside / uncertain`，保旧 contains API 的既有职责。实际 ray 与 registration 必须同 frame/reference/发布/完成 token；坐标 null、未建立可用误差界、分母近零、正向 branch 无法确定或输入不合法均 uncertain，绝不填 0。

对当前 raw rows，令 `c_i=row_i·ray`、`S=Σc_i`、`P=2Σ(c_i·anchorU_i)−S`、`Q=2Σ(c_i·anchorV_i)−S`。椭圆的齐次式为 `F=P²+Q²−S²`，避免额外除法；但**必须先保原 `determinant/S>0` 的正向 TAN branch 及近零 guard**。平方不保留前后符号，不能让反天球因为 `F<=0` 被当 inside。

只有可用保守误差区间全部在负侧才 inside，全部在正侧才 outside；区间跨 0、closed boundary、正向分支不确定均 uncertain。边缘 uncertain 保留为候选域，不丢弃后宣称局部空。此为冻结数值模型的 CPU 分类方向，不要求现在实现一般化 GPU 区间框架，也不认证 shader 高精度。

## 屏幕格与 EMPTY 的充分条件

必须明示 observation 是 pixel-center 样本，还是面积/完整域判断。只数 pixel centers，可以报告这些实际点的观察；零点不证明一个小对象或边界 cell 没有显示支持。四角也不是 stereographic 曲面在 cell 内部的极值证明。

若需要排除整格，当前 inverse stereo 可用同 camera 的未归一齐次 ray `2u·right + 2v·up + (1−u²−v²)·forward`，公共正分母不改变 raw plane 比例。以该 backing pixel 的完整 footprint、实际 DPR/中心/scale 建保守界；全域确证同一分支、F 同侧才将 cell 全 inside/outside，其余 uncertain。这是可实施的 CPU 前置，未提供 native/shader uniform/float32 运算和 raster precision 误差证书。不得把 CPU 区间直接升级 GPU EMPTY。

局部 **eligible-sample EMPTY** 至少同时要求：实际 region/viewport 域有保守且完整的 cell 覆盖；边缘/branch/精度均没有遗漏 unknown；所有原 expected fields 在实际同 context/draw 成功 prepared；实际 fine-first/coarse-fallback 的 full source eligibility 在整个域确证为零。未 prepared fine、missing PA/中心、没有 inside centers、部分域未观测、UV 落边或任何 uncertain 都保持 UNKNOWN。普通 JPEG 没有 joint-area availability，不得据亮度或黑色认 missing。完整 availability 不等可见结构，细图 valid black 仍选 fine、排 coarse。

PNG 四个 LINEAR 邻居及 UV/floor/source edge 的不确定独立于 catalog ellipse：邻居变化需取保守支持集合，不能靠 catalog membership 免除源资格。实际正 component 可以记录为事实性局部 effect；RGBA8 0、弱衰减、uncertain 或全局正值不能授权 EMPTY/对象可辨认。已有全 buffer qualification/final provenance 仍由原 owner 管，局部观测不扩大它的 scope。

原参考要求与当前方向保持：对象名称/圆环随放大自然渐隐、缩小恢复，科学纹理自身不随 aid 渐隐。参考尺度语义、源参与、局部显示 effect、科学有效性和可辨认度分开；局部 no-effect/uncertain 的恢复护栏不得缩成永久显示 aid。一次真实 pre-aid 决策、accepted snapshot 共用 scalar、晚遮挡及 native retirement 只能经实际 replacement paint/accepted 恢复，不能由 DOM latest-source 反推。现已有 M51 三 PNG/390×844/2.8°、.18°、.05° CPU counts 可复用为后续最小输入，不补造新 threshold 矩阵或目标验收。
