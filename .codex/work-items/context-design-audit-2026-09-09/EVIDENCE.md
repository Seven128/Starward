# 证据与工作入口

## 权威/读取
- AGENTS用户最新提供版优先；不启动长程工作流。
- project_context/global.md；context.toml仅global默认。product-profile.md、areas/main.md、areas/main/product-surface-contract.md及product-surfaces/wechat-miniapp.md。
- architecture.md、architecture/runtime-and-domain.md、architecture/maintenance-boundaries.md（实际涉及责任时）。
- areas/main/screen-contracts/wechat-miniapp.md及其map-and-finder.md、spot-and-sky.md、shared-state-and-recovery.md、surfaces-and-controls.md。
- DESIGN.md小程序档案；context-maintenance.md资源/持续校准节。
- 技能已读：.agents/skills/starward-design-resource/SKILL.md；references/design-method.md、stitch-route.md、starward-miniapp.md；node_modules/project-tiny-context-harness/assets/skills/design-resource/SKILL.md及references/stitch.md、adoption.md；.codex/skills/uiux_design/SKILL.md。
- 注意skill references/starward-miniapp.md含旧三图层/正式点限定/主页链接等残留，明确以当前Context owner上游为准，不把这次任务扩大为skill重写。

## 采用资源
docs/design-resources/wechat-miniapp/{search,my,plan,sky,map,feedback,contributions,events}/ADOPTED.md。
- Search adopted/search-page/README.md, review.html, preview/{index.html,styles.css,interactions.mjs}, reference/filters.png。已查看filters图。Stitch历史项目5585184579244766246，最终本地修订包优先，不能直接用历史screen替代。
- My adopted/my-page/README.md, review.html, preview/index.html, plan-selection.mjs；reference/adopted-plan-glass.png已查看。
- Plan adopted/plan-page/README.md, review.html；reference/adopted-editor.png已查看。
- Sky adopted/cloud-stargazing/README.md, review.html；reference/interactive-a.png已查看。Stitch项目13823253487989500123。原预览额外Vega fixture不是生产覆盖。
- Map ADOPTED映射spot-information、layer-selector、add-spot；add-spot复用feedback/adopted/spot-feedback统一表单。

## 审计事实（同HEAD）
- 原web意见附件 C:/Users/777/.codex/attachments/a80cd5b7-32d9-4cee-97a9-3ef22404c1a7/pasted-text.txt。
- 用户随后粘贴web回复认同复核：两报告合并分类，不追加全量改造；下面完整保留需要执行的结论。
- workers/miniapp-api/src/miniapp-service.ts:363 matchesFilters；1133附近anyWeather/anyEvents能力误判；1758 savePlan依据input地点/时间重新解析，sourceContext主要恢复origin。
- packages/miniapp-contracts/src/filters.ts filterSpots未发现小程序/BFF调用；types.ts:96仅FORMAL_SPOT/MAP_POINT；不把计划被地图覆盖或天气限制远期计划当已证实bug。
- apps/wechat-miniapp/src/pages/map/index.tsx:105三态；plan/detail的局部草稿/回执/账户保护已有实现。
- Gaia包2048条，minG1.9425238/maxG5.007534；query TOP2048 where G<=5.5。对应fixtures坐标最近角距：Sirius2.304389°、Vega0.913187°、Polaris2.906496°，均一角分内无记录。只证明包覆盖，不是最终WEAPP逐帧验收。
- packages/astronomy-core/src/gaia-catalog.test.ts:205明确fixture不进入生产包。已运行相关星表、plan-context-scope、plan-save、plan-save-spot共13测试全部过；这不是本轮新验收。
- 预算global/product-profile200；product-surface-contract相邻200与小程序独立300，来源小程序300；现用户350覆盖小程序。

## 最新价格核查与回答边界
- 2026-09-09 https://dev.qweather.com/docs/finance/pricing/：基础服务价格组每月前50000免费，接下来950000为0.0007元/次；10万=35元、30万=175元仅此SKU组算例，不含其他成本。
- https://open-meteo.com/en/pricing：免费非商业，10000/day、300000/month、无uptime保证，变量/时间/模型/地点加权；不可把网络可达或免费资格当已验证。
- https://lbs.amap.com/api/webservice/guide/tools/flowlevel：配额需平台价格表及账户控制台。没有测远端或实际账单。
- ESA https://www.cosmos.esa.int/web/gaia/dr3 支持亮端约G3与重要亮星不足风险；不需为本轮重新星表选型。

## My本轮资源证据
- 生成来源、原稿与集成边界：docs/design-resources/wechat-miniapp/my/candidates/context-audit-2026-09-09/README.md。
- 实测尺寸/状态/截图及限制：同目录verification.md。任务check-my-selection.mjs与check-my-browser.js保存实际可复现检查。
- 已重新实际查看采用adopted-plan-glass.png、Stitch完整生成画面、最终四宽度及长名称/错误截图；不把原稿视觉偏离自动采用。

## Plan本轮资源证据
- plan/candidates/context-audit-2026-09-09/README.md和verification.md说明Stitch两轮原稿与Codex集成边界、实际截图和验证限制。
- 浏览器本轮四宽度/到达/保存/提醒/事件/清单上限由任务check-plan-browser.js和check-plan-limits.js覆盖；My桥接实际两条身份返回通过。没有生产通知、路线或天气验证。

## 最终审查入口与核对
- 五组统一审查页docs/design-resources/wechat-miniapp/context-audit-2026-09-09.html。
- 本轮范围核对见DELIVERY-AUDIT.md；两类本地链接检查、结构验证与范围diff均已实际执行。
- Map与Sky新增pending身份刷新回归已过；未把任何候选自动采用。
