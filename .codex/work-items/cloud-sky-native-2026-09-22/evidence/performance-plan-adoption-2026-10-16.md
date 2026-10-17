# 整体性能调研采用与交接裁决

2026-10-16。用户明确要求读取已完成的[调研云观星拖动性能](thread://01a144cf-8035-7ab0-91b3-c01af830b67b?hostId=local)，评估加入现有方案并交接到新对话；随后要求新对话遵循durable-goal。本轮只修改唯一PLAN、必要Context及现有恢复/证据入口，不实施产品，不另建任务或第二份方案。

## 实际核读

已调用read_thread，确认该研究turn completed、任务idle，并读取完整[研究报告](cloud-sky-performance-research-2026-10-16.md)及其[结果](drag-research-2026-10-16/mechanism-results.json)、[源码基线](drag-research-2026-10-16/source-baseline.json)、[最终核验](drag-research-2026-10-16/research-validation.json)。编辑前325个研究保护文件均无漂移，r368仍是未推普通候选，r322是最后实际手机包。报告SHA为79144b20c51652a32a76ae32626015cae02e7770dada126319eb42f46c8a39ca。没有重跑研究脚本、产品测试、浏览器/IDE/手机或构建。

本轮直接核当前源码：

- `sky-selection-reticle.ts`的paint(null)调用clear，而clear无条件清context并写width/height为0；`sky-canvas-surface.ts`每次present调用选中层paint。研究120帧240次setter是计数端口事实；非零backing但getContext失败仍需清理，不能把context=null等同已释放。
- `spot-sky-page.tsx`在导航动画后直接续原writer，其他camera/star/name/ready动画经setTimeout16后再请求；`sky-canvas-lifecycle.ts`零延迟入口已用display RAF、latest/dirty/busy/scheduled保持一个writer。虚拟60Hz差别仅证特定时序，密集输入反例仍重要，不冒当前拖动主因。
- 播放effect使用独立16ms interval，advanceSkyTime推进原observationTime并setTimeIntent，requestedAt进入presentSkyTime/MODEL和后续Scene准备。源码确认生产者独立，尚不证明每tick都有无用React render或整体收益；采用前需当前非空准备/接受计数。

## 纳入唯一PLAN的决定

| 研究项 | 裁决与归属 | 采用理由与限制 |
| --- | --- | --- |
| 当前多场景归因 | PF01／F | 统一输入/准备/提交/accepted/UI及资源事件的有限观察；有界、本地与物理分开，不把全套真机测量作为明确局部修复前置。 |
| C1选中层重复零尺寸 | PF02／B/E，首修 | 确定重复调用、局部可改；保lazy/失败释放/代次/触摸/静态fallback，收益不预报。 |
| C2有限动画timer→RAF | PF03／E/B，续约协调 | 原writer已有直接续约消费者；迁移其余有限动画并保deadline/fallback、取消及idle。纯动画模型不能证明密集drag提升。 |
| C3播放准备与显示准入 | PF04／E公共时刻+B帧准备，先小路径 | 本次明确细化责任与依赖，允许在原owner合并未显示时刻需求；保1x/精确时刻/coverage/Map提交/accepted，不造第二时钟，不接双RAF等待。满足非空正确性/成本条件才集成。 |
| C4/C5页面与SAO集合 | PF05／B/E/F，按热点 | 优先同内容稳定身份与必要UI字段，不节流权威回执；真实到达/失败/refresh仍发布，不延后首有效数据。 |
| C6/C7分配/动态VBO/字宽 | PF05条件细化 | 当前分配存在不等于GC主因；仅真实热点才做有界复用，不普遍池化或迁atlas。 |
| C8纹理准备defer | 原B/F条件保留 | 新负载有重评理由，但没有当前堆叠/占优证据前不实现新调度；保全部实际消费者与资源预算。 |
| C9/C10合成/进入返回 | PF01及四组验证覆盖 | 查真实重建/复制/合成责任；不因本次报告采用更多Canvas或永驻资源。 |
| Worker/WASM/GPU投影/atlas/新索引/低画质 | 未采用 | 保原证据/平台/兼容/权益前提；不列为新必交付项，不削星数、全名、图层或精度。 |

旧“先纹理准备再静态复用/筛选”顺序与“rAF已否定”的过时句已由同一PLAN节替换。已有RAF/空值/点线/矩形/弧/静态拓扑与BSC筛选等成果继续复用。多场景分为密集运动、自动/时间、进入返回/局部UI、稳态/持续使用四组；它们合并责任，不是每次改动新增全量矩阵。

## 阶段和真实缺口

本次新证据已经使此前“无可独立推进项、只能等外部条件”的调度过时；后续明确恢复先做PF02/PF03及所需PF01，再到PF04和证据触发项。当前没有手机、原模拟器合成失败且原因未知，不能关闭新交互/原生性能；原33、有效UX、M51/M8图质失败、5项正文缺口、3项公共接入、iOS/物理与实际云端/容量义务保持。

本轮按用户要求完成方案/交接后停在新对话开始前，不将准备或文档核验算产品实现。读取Goal仍为blocked、无预算；工具无active/正文更新接口，不重建同任务Goal或改数据库，也不新记paused。新对话明确恢复覆盖旧受阻/准备时态，若新线程确无Goal才按保存完整目标创建，不设预算。

本采用裁决是主代理自查，研究报告也仅作者自查，没有新增独立审查；旧批次审查不覆盖PF新增实现。当前没有启动子代理。后续按AGENTS第8条在核心共享交付节点取得适用独审，缺证保持；不因本次准备重跑旧产品测试。

修前12份文档原件保存在`output/cloud-sky-native-updated-ide-2026-10-12-r1/plan-adoption-2026-10-16/preimages.json`指向的同目录。最终文档/链接、原33与生产输入核对由该目录handoff-validation.json持有；它只认证交接保存与源码未改，不认证产品通过。
