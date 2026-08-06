# 需求变更与方案对账索引

## 最终方案

| 方案 | 新文件 | SHA-256 | 原始文件状态 |
|---|---|---|---|
| 产品方案 V2.0 | `C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_Demo基线与商用增强版_V2.0.md` | `602592E4143050FF93987DA3259833F4E642830B85E885C0E28D30162CA69058` | 原始产品方案保持不变，SHA-256 `641F11B9BC000278040D35CC895FBBF5B45F85194E4566E0B9F05081EBBE0BF2` |
| 技术方案 V2.0 | `C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_Demo基线与商用增强版_V2.0.md` | `BD15C4159C9B72CA31BE3418816EFBC6619B0C4AE9DED552A2BBEF82BD35E190` | 原始技术方案保持不变，SHA-256 `7D48822A49A2FD1E93344F1FE31D9B144F4D0C79D9E42C47435E16FAF220F122` |

## 变更闭环

| 变更族 | 需求真值与审计记录 | 设计资源投影 | V2.0 方案落点 |
|---|---|---|---|
| MAP-R01 | `../miniapp-map-page-2026-08-05/review-delta-001-filter-hierarchy.md` | MAP-01—MAP-04 | 观星条件/观测点/场地信息；27 个精确标签；单选/多选语义；草稿、应用、取消、重置、空结果 |
| MAP-R02 | `../miniapp-complete-product-2026-08-05/review-delta-004-map-filter-entry-flat-options.md` | MAP-01—MAP-04、APP-05—APP-07 | Tier-A“筛选”入口与已应用计数；选项常显分组平铺；无下拉、无手风琴 |
| SPOT-R01 | `../miniapp-complete-product-2026-08-05/review-delta-002-spot-detail-night-merge.md` | APP-01—APP-03、APP-05—APP-08 | 概览首位真实代表媒体；攻略为第二项且有图片位；详情顺序“概览/攻略/场地/夜空” |
| NIGHT-R01 | 同上 | APP-01—APP-03、APP-05—APP-08 | 删除独立“今夜与星空”页面族；夜空只存在于正式观星点详情且需要 `spot_id`；今晚推荐目标与天文计算边界 |
| MY-R01 | `../miniapp-complete-product-2026-08-05/review-delta-003-my-profile-content-import.md` | APP-01、APP-04—APP-08 | 四标签无滚动条和大字号 2×2；删除首页摘要卡/示例文章；主页链接；外部帖子导入、编辑、点位关联/提案、审核 |

## 选择与解释规则

- 本索引记录的是已经通过“审计设计资源 → 暂存需求变更 → 重新生成/修复设计资源 → 再审计”循环确认的最终差异；两份 V2.0 文件已将差异吸收为新的完整方案，不再依赖聊天上下文才能理解。
- Open Design 资源和两份 V2.0 方案互相校验：方案拥有产品/技术语义，资源拥有选定 UI/UX 投影；任一方不能静默重定义另一方。
- 设计系统权威仍是 `DESIGN.md` 的微信小程序 Soft Instruments 章节。
- 第三方平台深链/解析能力、实时天文结果、真实点位事实、微信原生运行时表现仍需实现阶段的能力探测、数据源与生产验证；资源中的示例不升级为这些事实。
