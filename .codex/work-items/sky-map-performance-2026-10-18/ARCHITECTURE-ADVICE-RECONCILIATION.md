# 外部架构建议与本仓库对照

2026-10-18，用户明确要求阅读“架构建议”、更新唯一 PLAN 并接着实施。来源：[指定对话](https://chatgpt.com/c/6ad3e58b-75b4-83e9-8f92-e6735f10d7f8)。read_thread 只返回前 20,000 字符且标记 truncated；已通过登录浏览器实际读取后续第十、十一节和完整实施顺序。没有把被截断摘要当作完整报告。页面附有 HTML 报告卡片，本次以可读对话正文为依据，未宣称下载附件。报告未访问本仓库，项目现状仍由当前源码及绑定证据裁定。

## 采用与复用

下表的“当前实际情况”是首次研究时的源码/环境基线，不是后续交付状态。恢复和静态解耦已推进，见文末当前衔接；采用方向继续由唯一PLAN控制。

| 建议 | 当前实际情况 | 本次决定 |
| --- | --- | --- |
| 静态图层与地点天气/天文解耦 | Terrain 已独立；miniapp-service.getMapScene 先逐批 computeDecision，再取 nightLight.layer；现客户端从该 Scene 获取夜光 | 优先做独立静态夜光读取并接入真正 Map 消费者；保留原 Scene/旧客户端合同与地点筛选业务 |
| 客户端提前使用固定空间身份 | useTerrainOverlay 的 key 仍是精确中心/bounds；服务端先 normalize 再转固定 window；已成功 coverage 滞回只覆盖返回后的情况 | 用共享坐标规则识别同一窗口，避免在未完成读取和回访时重复元数据工作；精度、原始 bounds、Spot 点/半径及错误状态不能合错 |
| 跨派生源与窗口 singleflight | SharedReadPool、Terrarium pending 共享、nightlight windowReads 及有界双窗口已实现 | 复用当前实现/测试与这次独审，不另建缓存或声称报告里的旧缺口仍在 |
| 云量有效格保留、小时序列复用 | 现 map-cloud-presentation、天气序列缓存和 receipt-clock 修复已有实现/受限真机证据 | 保留。固定采样锚点/间距仅在实际 key churn 证据下改；不可扩涂未查询区域或延长源有效期 |
| QWeather v7→v1 | weather-provider 当前已调用 /weather/v1/hourly/纬度/经度，解析 forecastTime、cloudCover 和 metadata；qweather-client 负责真实查询坐标 | 无需重做迁移。报告提醒作为核对，保留实际端点/CRS/量纲/时效的真实输入验证 |
| 自持基础覆盖、热点精细产品 | 本机缺原固定发布和 r6；现源冷路径仍会实时加工 | 先恢复既有产品，再按目标覆盖清单估算和预发布最终可显示产品；原始 DEM 已缓存不等于显示图已就绪；不授权全国/全球盲目全量下载 |
| 对象存储→CDN 直接分发 | 地图图片目前 API 路由；项目 Sky 有 OSS/ESA 密封发布及操作 owner，但其合同不能直接接收地形/夜光 | 复用部署责任和传输能力，按地图产品建立适配与版本/回滚语义；真实账号/域名/预算/远端校验成立后才切换，不采用报告的 COS 价格示例作为采购决定 |
| 固定 512px 中块替换整窗 | 现 256px 固定格组合整窗、双 overlay 槽；WEAPP 没有通用 XYZ/mask/原子成组切换保证 | 作为有条件的最小真机候选，先保持相同内容/范围/总像素对照。必须核 alpha、接缝、配准、原生内存和退役；失败则保留整窗或少量合成范围 |
| 预取、LOD 滞回、分阶段背压 | 部分已做覆盖滞回；没有完整可见优先/预取队列 | 在真实瓶颈与预算上渐进增加有限可撤销工作，不直接把文件数、并发和缓存扩大到报告示例值 |

## 外部事实复核与限度

- [TencentLBS 固定版 GroundOverlay 文档](https://github.com/TencentLBS/tencentmap-miniprogram-skill/blob/16bcc9210462c589e73c937af82a2ae91e6a1287/references/mapContext_api/MapContext.addGroundOverlay.md)确认基础库 2.14.0、图片路径/bounds/opacity 及调用回调。未给多图稳定数量、内存预算或逐资产真正可见保证，因此 Android/iOS 小试仍必要；不以 Taro 属性名推断 WEAPP 能力。
- [QWeather v1 小时预报](https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/)确认路径纬经顺序、默认 UTC、cloudCover 为 0–1；[停服清单](https://dev.qweather.com/docs/deprecated/)列旧城市/格点天气 2027-06-01。[词汇表](https://dev.qweather.com/docs/resource/glossary/)保国内 GCJ-02 约定，但泛用旧时间说明不能覆盖 v1 端点的明确 UTC 参数。现代码已走 v1，不能借此改源或重写时间。
- [GitHub LFS 计费](https://docs.github.com/en/billing/concepts/product-billing/git-lfs)说明存储按关联对象计、下载按周期计，零预算阻止超额；本地体积不能证明账号余量。跨机交接按资源 owner 选择存储，数据库/秘密不进 LFS。
- 报告的 30% 字节、25% p95 改善、32–64 文件、100–200 次重放、全国矩形容量与价格均为作者建议/变量示例。本任务不照搬为强制验收矩阵、平台上限、已获准花费或新产品覆盖承诺。先用能决定实现的代表路径，必要时才扩样；不足以估计分位数就报告单次样本/分布限制。

## 实施与完成证据

唯一方案仍为 PLAN.md。先移除确定的无关等待和重复身份，再恢复发布与分发环境，最后按冷源/已有成品/手机命中区分测量和决定渲染形态。Tfirst、应有覆盖、目标细节与真正可见空缺分别计量；“应有数据占视窗比例”一并说明，不能缩小分母隐藏缺失。源 HTTP、CPU、传输、解码/安装与 native 像素各自预算，200 DAU 不当并发数。保留真实天气、r6、配准、双指、iOS、分享接收及 N05 等原未验范围。

## 当前衔接（R18交接）

原研究时缺失的r6/固定地形、配套数据库与原任务映射现已完整隔离恢复；静态夜光独立API和真实Map消费者也已实现，经后续独审和581a5a9b全量CI检查，见ASSET-MIGRATION-STATUS、STATIC-LIGHT-ISOLATION、BACKEND-DATA-REVIEW和BACKEND-DATA-DELIVERY。不从恢复或静态解耦重新开发。

稳定客户端地形窗口身份、目标范围成品/细档、对象/CDN静态分发以及有依据的分块/预取仍待完成。恢复后的约4km细档请求首次3,926ms、重复6ms，所需z12不在7项已恢复地形资产内，见RESTORED-TERRAIN-SAMPLE；原报告方向仍有实际待解决的冷路径。用户新增R17不会挤掉这些义务。当前EOG官方原始获取仅进入计划，不是叠层正常运行或已发布成品使用的前置条件。

R14当时细化未要求改Goal正文；后来R17/R18新增范围的最新正文已在GOAL-OBJECTIVE准备好。旧工具仍返回blocked且不能编辑正文/设active，未假称已更新或完成。新对话恢复和明确实施授权按HANDOFF/NEXT-CHAT-PROMPT；本记录不是另一份执行计划。
