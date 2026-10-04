# M82 共同显示完整结果与实际资格边界

**既有共享 adaptive/真实 halo 已消费保存的 M82 科学母图，完整候选和三级数值读回通过；实际宽域颗粒减轻，但斜向资格颗粒条带、暖底和细档颗粒仍未通过完整图质。** 本代仅新增云观星任务、离线产物和对应文档/Context；无产品源码、其他业务逻辑、六保护、原服务/watch、原科学/素材/recipe/普通 registry 修改。Goal active、无预算、未完成。

## 完整执行与原值责任

直接复用 `output/sdss-m82-first-science-master-1004-r2/` 的原 2048² science、六共同 field/十八 gri 输入、已核 fpM/CAS、共同几何权重及冻结 Lupton 配方。使用当前共享 `sdss_adaptive_display` 的 1/2/4/8 共同孔径、条件绝对比值 3 和真实八像素支持；门槛不供应探测 confidence/测光或质量结论。没有源请求、科学重新投影/coadd、第二次 sky 扣除、新依赖、PSF 匹配或调参 sweep。

同一个任务执行完整过滤并先保存 `initial-candidate/` 和 `initial-result.json`，随后只处理四边 65,280 个目标，保存 `candidate/`。四个外窗实际都有 CCD 外侧支持，cached overlap 精确；内部估计和四项诊断保持父结果，61,647 个边缘目标估计发生变化，不再过滤完整母图。整个任务正常 exit 0，原 r78 的 359 源码、六保护和 3,869 证据及执行实际输入前后精确。

最终中心资格 4,108,719，强 signed 结构保护 1,014,673；3,052,885 个目标至少一带显示估计变化，1,141,419 保原。radius -1 有 126,213：包括未知/flags 排除及缺少完整合格孔径的位置，不能把所有未处理像素都称为缺测。共同门槛达到 1,135,307，不等于其余科学不可用。原科学、availability、负/零含义和原面积 alpha 保持；中央 INTERP 无伪造替代。

结果 `output/sdss-m82-shared-adaptive-display-1004-r1/result.json` SHA256 `eb37d6261592ca8c45d83a19d63316498ec28784e02f2dab14909624644a1a39`；最终 candidate SHA256 `6b58d081de4a210f5bb776dafe9a06c866334450281fa17ba418e1e9435d10bc`。

## 保存输出与实际图质

独立算术路径的任务读回确认：全部科学 C-order hash、radius/qualified/reached/protected 诊断、未知/排除/保护原值、内部父估计/诊断和仅边缘更新精确。三级从显示估计按真实 crop 求 float64 signed 均值、转 float32，再用同冻结 RGB 配方与原面积 alpha，完整 PNG 逐值精确；WCS、范围和图尺寸保持。此处是根 agent 自审，不是独立审查，也不是 WEAPP/native 运行时验收。

OVERVIEW/MEDIUM/DETAIL 分别有 210,489 / 98,851 / 355 个 RGB 像素较科学均值显示变化。已实际查看完整三层对照 `output/sdss-m82-shared-adaptive-readback-1004-r1/actual-full-lod-pairs.png` 和五处原图/候选成对输出 `actual-structure-and-boundary-pairs.png`。宽视场暗部颗粒减轻，但斜向保原颗粒与已处理暗部之间形成可见条带；暖色背景/颗粒仍在。核心及所选弥散块 RGB 不变；细档变化很少，不能宣称弱结构、颜色/PSF、接缝或真实配准已修复，也不能把保强结构作为细档图质通过。

## 五处真实供给/资格诊断

只读已保存五个 128² 区域的共同权重、原 primary FITS WCS 和十八 native flags，以既有 `PixelFlags.stencil` 投影实际四邻；原 PS_ID/identity/flags 回执/hash 关联保持。没有重建原 native flags 全矩阵、完整投影/过滤/coadd 或改变候选。结果在 `output/sdss-m82-display-boundary-flags-1004-r1/`，各 patch 保存原 eligibility、实际 reject flags、可能不同 RUN 贡献及 radius。

| 实际区域 | 原 source 未 qualified | 含 reject native flags | 其余原因未解决 | 存在另一 RUN clean gri flags 的可能位置 |
| --- | ---: | ---: | ---: | ---: |
| core | 444 | 444 | 0 | 0 |
| background | 968 | 511 | 457 | 503 |
| diffuse | 270 | 270 | 0 | 0 |
| field-transition | 375 | 375 | 0 | 0 |
| qualification-edge | 1,196 | 810 | 386 | 738 |

所有实际 reject contributing flags 均处于原未 qualified 区；不少来自 INTERP，也含 CR。核心/弥散只有 RUN 4264，字段过渡也没有另一 RUN 可能供应。background/qualification-edge 的 503/738 只是实际正共同权重且三带 reject flags 干净的另一 RUN 贡献；尚未核整个 RUN 所有正贡献、camera/SKY/native noise、完整共同支持与时刻不重叠，不能当可恢复像素。两 patch 部分重叠，不相加、不外推全图，也不据此证明全部条带成因。

实际现有 `recover_other_scan_display` 先调用 fixed noise-v1 的 `noise_display_pyramid`，不能直接把 M82 adaptive/halo 父图冒称 noise-v1；M82 此前没有执行 supply/recovery。必要适配须留在既有恢复及来源责任下，保原 baseline/version/hash/来源资格与取消规则，不伪造旧 M51 stage。只读来源差异记录在任务 `pending-m82-processing-source-binding-2026-10-04.json`；尚未实施或关闭完整来源链。

## 实测成本与边界

完整 filtering 1,321.940673 秒/CPU 1,317.515625 秒，边缘增量 29.363338 秒/CPU 29.265625 秒；保存到 final 1,358.585124 秒。该 Windows Python 进程 peak working set 1,185,062,912B、peak pagefile 1,075,302,400B，包括源、保存母图、估计和临时数组；不是客户端/BFF 或部署服务器容量。输入/旧证据 hash 前置时间另有开销，不能把 kernel 时间当整条工作工时。

本代 parent/final/readback 的 41 个真实文件 logical 140,407,373B、Windows reported allocation 按 distinct FileId 为 140,513,496B；41 distinct/maxlink1，前后稳定。后续 flags 诊断七文件另测 logical 67,375B、reported allocation 81,920B。两个范围各自排除随后创建的测量记录，原科学/旧产物/工具不重复扫描；不冒整个工作盘、Linux 180GB 物理可回收保留或全产品 200DAU 容量。没有删除。

## 唯一下一依赖与未完成范围

执行顺序只由 PLAN 顶部控制：复用此次 final/父图/真实源，先核新可见边界的实际不同 RUN 供应是否具有完整 native noise/共同支持/时刻资格；确有供应再沿现有恢复责任支持真实 adaptive 父图，保所有未 qualified、同 RUN、未知/无替代原值，完整比较实际恢复效果。不得重过滤/重建科学母图、套 SAT 恢复、凭局部供应设范围上限或新增 framework。processing 声明只反映真实执行；M82 实际测得天体/逐带配准仍缺，asTrans 元数据不是绝对误差。

普通 Prepared 仍 EMPTY/NOT_ADOPTED。完整图质、credit/rights/processing、API→registry→标准 static/cache→已绘 Sources Back、W3 暗区、strict Back FAILED、WXML Canvas FAILED、Android/iOS/newMoon、真实引用/物理 retention、全小程序 200DAU 混合成本容量和必要独审等原 33 项义务继续开放。原图与失败证据不改判；预期生产配置不等于部署或验收。
