# Prepared progressive Hook / ready frame / TAN（2026-10-03）

本段已实现共同源码并完成有界开发验证，[独立审查](experience-prepared-optical-consumer-independent-review-2026-10-03.md)已收口，无阻断发现。Prepared 尚未交给 Scene/普通页面/默认选图，不把本段称为新图已显示、可见完整署名或图质验收。

## 责任与消费者

`use-sky-target-optical.ts` 是实际 legacy JPEG、science-v2 与 Prepared v1 的共同渐进 owner。两个 source wrapper只表达既有 legacy/science intent 或显式 Prepared hash。Source-kind、objectRef、hash在 retained query→render→actual acquire 三处关系中保明确；错误版本即使同ref/hash也不能转成另一来源。Metadata仍使用各自合同、路径与共享epoch stamp，不进入普通发现。

共同 loader保持原两图预算、nearest coarse失败/等待回退、细图就绪细档+实际父档、变更publication取消/释放/迟到 fence、显式retry保有效图与原GPU reset返回。Prepared使用自己的namespace、format png、实际crop/geometry/master和geometric-source-area/UNKNOWN science，不冒充 joint-area-alpha。Angular policy复用原fine/coarse阈值及actual field，未增加 photograph fills viewport 条件，也未认证 Prepared 质量/尺度校准。

`skyTargetOpticalFrame` 一次冻结实际ready descriptor/level及有效独立parent，使用明确 imageVersion literal分辨 Prepared/science；未知版本拒绝。Source-specific frame wrapper拒绝错误来源，即使调用者未typed。Prepared frame保完整原source/credit/近似AVM/颜色与母图身份，legacy/source与science consumer不借asset shape误判。Frame不是paint或source credit。

`sky-tan-optical-registration.ts` 是原science的exact linear TAN/raw affine plane/report rotation owner；`registerSkyScienceOpticalField`只委托。Prepared的actual admitted中心、field与CRPIX可以使用同一几何责任，不据目录rounded中心重建。外来descriptor、无/非法report rotation保持unavailable，角点不各自normalize，源approximation/UNKNOWN科学含义不变。

## 实际开发证据

[consumer R1](../../../../output/prepared-optical-consumer-1003-r1/result.json) 2,267 B / SHA `a5a0db5d66ac7ae3d0a49e13486f817f67dace84c3cb3bad8feb554ec49d7823`，Node24.16.0、实际App TS5.9.3；55受影响检查与完整App types分别exit0，55个选定source/data/runtime/protected绑定before/after exact。完整执行feature源码与stdout/stderr存同generation，不是全vendor闭包/干净WEAPP候选。旧source/science原测试仍保原粗层/失败/寿命/错误语义，实际 Prepared R4与science writer输入经过各自admission；没有新fixture绕开真实publication。不以检查数量验体验。

测试仍使用 controlled React/query/loader callback；其中既有legacy测试提取函数声明，已迁移为真实common函数+实际wrapper，相关accepted page/Scene既有消费者也随职责迁移，不能称完整React/native旅程。新增Prepared用相同实际common模块核cold metadata、detail失败medium存活/显式retry、actual descriptor、render/effect退休、hash/ref/kind变更和最后释放。首轮完整App类型检查暴露generic indexed asset参数不兼容，修正为共同Loaded资产union与source-specificpublication fence；原工具exit1保存 `earlier-frame-types-failure.json`，未删除断言或放松source identity。

独立坐标fixture由缓存Astropy 8.0.1按实际R4 metadata生成，不读取/解码/重投影源图片。27个TAN UV/ICRS点在三个真实observer/time rotation（81点）与原science的既有Astropy坐标分别核；raw plane /非法rotation旧控制保持。fixture SHA `9edd295faa6cf21a9926b4a4e72cb62a8c776a913f80eab3bfd7b3aa56008009`，生成入口 `scripts/experience-prepared-optical-wcs-fixture-2026-10-03.py`，不是从新注册实现导出期望。它核名义TAN数值而非HST原5asec实测精度、源点对应、摄影coverage或完整图质。真实源decode/reprojection/network/GPU/IDE/phone均0。

## 本代源码绑定

| Owner | bytes | SHA-256 |
| --- | ---: | --- |
| `apps/wechat-miniapp/src/features/sky/use-sky-target-optical.ts` | 7310 | `fc96335b4281484b267005f817be11c12538d89778d2c9f9a6ad81fb36aa4d60` |
| `apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.ts` | 580 | `262ef4adb366f4f9602fbd3df1af8b084a648c81b91c00e62481a7f58fac1e06` |
| `apps/wechat-miniapp/src/features/sky/use-sky-prepared-optical.ts` | 515 | `9bf81867dddadaa235b1ece34ddae999d95ae1eb4ee782988739b267cdfb1673` |
| `apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts` | 2481 | `ec2d224ecf9167dc5b4e6cdb5076a467f0f184ad81db89b335450187de136930` |
| `apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts` | 5022 | `922c02231d725d942656b932d078dfd8e83d23fe234f7ac1197b5745057a9695` |
| `apps/wechat-miniapp/src/features/sky/sky-tan-optical-registration.ts` | 2917 | `6b8b1e25fdf6819e6af0a08b4d31a137e7e9c4eb15d9afa93278f3ea1198621f` |
| `apps/wechat-miniapp/src/features/sky/sky-sdss-science-registration.ts` | 515 | `83a7ae93b9024c67e020cf93354ede55243608eabea4858a972085cc6b9b1392` |


[传输/cache独审](experience-prepared-optical-transport-cache-independent-review-2026-10-03.md)先前已收口；本段独审实际结果为 `output/prepared-consumer-independent-1003-r2/result.json` / SHA `d708d9b4368147ca5e4f51afe6f09e54ae77dfa37e6033994d1618fb4379b4a8`，64绑定before/after/current exact。独立执行完整共同Hook/Frame/TAN源码，覆盖失败保粗层、lease退休/最后释放、metadata/acquire及source-kind fence；三项有界mutation均暴露预期缺陷。旧science九组注册与当前委托exact，Prepared三个实际observer的81个Astropy名义点最大差 `1.0281725776518602e-8` 像素。受控React/query/lease/callback不是实际React/native缓存或Canvas/GPU，名义TAN不是物理精度或图质。独审R1错误推断legacy acquisition缺format，实际JPEG；R2只修该期望，旧失败保留。不得借旧独审或旧GPU像素验新Scene。下一依赖只由 [PLAN](../PLAN.md)控制：显式Prepared actual Scene的一次fine/coarse贡献、原expected/current及accepted paint/source/recovery、关联可见完整credit，然后真实矩形/背景/边缘与普通/default采用条件、完整资源/性能/200DAU混合容量与目标平台质量。原生/手机暂停边界保持。
