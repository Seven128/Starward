# 2026-10-28交接与计划清理核对

用户要求新对话续办、移出确已完成的计划实施项，并清理废弃临时计划。只修改任务文档和明确废弃文件，不修改产品代码、不构建/推送/部署、不启动服务。

## 去向判定

| 活跃计划的旧表述 | 本次处理及证据 |
| --- | --- |
| P1四项新UI继续实施；P2三图层兼容迁移 | 已有真实接入、责任层检查、独审和普通构建，改为剩余WEAPP目标验收/差异修复；依据UI-INTEGRATION-20261027.md。保全部采用要求、像素/手势/原生生命周期。 |
| D0缓存/取消/提示、D1色标/marker/地形CPU、D2时刻/按住/顶点缓冲等重复实现要求 | 沿D0-D2-REPAIR-20261026.md及CANDIDATE18-CONTINUATION-20261027.md收敛为目标回归；持续交互、失败恢复、内存/平台释放及19回归仍保留。 |
| Query捕获、vector退休及管理输入判别/资料接收/库恢复 | 实施已完成，证据由HANDOFF集中导航；不得重复开发或恢复。真实环境及最终设备结果仍未完成。 |
| 云量/光害全国迁移 | 仅方案/Context采用，PLAN该节原字节保留；不因文档完成而删实施、全国生产、分发或容量验收。 |

新建只读独立审计agent已对PLAN、UI/Query/vector/D0–D2/18证据及相关源码核对，支持上述完成/未验区分；已关闭。P1–P6、D0–D2、OOM及新全国迁移不整节删除。

## 可恢复清理范围

仓库4455份Markdown/JSON/TOML经过相对链接及完整路径引用检查；下列7份文件无保留文件的当前引用，唯一相互引用是旧10-23→10-24提示词，两者共同退役。实际设计源、验证/结果记录、App历史和仍被Context引用的旧计划不删除。

- sky-map-performance-2026-10-18/NEW-COMPUTER-PROMPT-20261023.md
- sky-map-performance-2026-10-18/NEW-COMPUTER-PROMPT-20261024.md
- sky-map-performance-2026-10-18/RAW-SOURCE-UPLOAD-PROMPT.md
- sky-map-performance-2026-10-18/OTHER-COMPUTER-DATA-HANDOFF-PROMPT.md
- map-ui-design-2026-10-27/PLAN.md
- main-integration-2026-10-17/PLAN.md
- resource-governance-2026-10-08/PLAN.md

以上路径相对.codex/work-items。前四份的换机/上传任务已由最新入口、接收及原件回执取代；设计阶段与合并/本地资源治理方案已有HANDOFF/VERIFICATION/RESULT接管。7份共23,406B均已通过Windows API移入回收站，原路径不存在；回收站中7份内容的SHA-256与整理前快照逐项相同，可恢复。未永久删除。

整理前14份被编辑/清理文件的原字节已复制到仓库外：
`E:/Dev/Starward-data/verification/handoff-cleanup-20261028-8b0623da`
逐文件SHA-256与副本一致，manifest.json保存路径/大小/身份。可从回收站或该目录恢复，不能覆盖新计划而重新启用旧指令。

## 当前事实与检查边界

HEAD和本地origin/main引用均1fd25800；main、原dirty及索引状态保持，本轮未fetch/commit/push。10-28实际8787无监听、health不可达，已修正HANDOFF/INDEX及运行记录；未启动API或DevTools。当前Goal仍paused，后续恢复由新对话用户提示表达。

收尾已通过Context结构校验、限定文档diff检查及92个本地链接/锚点核对；P1–P6/D0–D2九项责任保留，新增全国迁移段与整理前快照逐字节相同。另一名新建只读agent对最终计划/交接/提示词/Goal独立复核，未发现误删未完义务，已关闭；其服务状态措辞建议已采纳，只断言端口/健康观测。7份回收内容已核hash。未重跑产品套件，不将历史CI/构建当当前dirty部署证据。
