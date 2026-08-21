# 《今晚去观星》微信小程序 V2.1.1 · Long Task 输入说明

<!-- ty-source-item:start key=requirement-wechat-miniapp-v2-1-1-long-task-objective kind=requirement -->
在 `C:/Dev/Starward` 的真实生产 owner 中完成《今晚去观星》微信小程序 V2.1.1 的可运行、可验证 Demo：产品、技术、交互、数据与恢复语义必须覆盖最终 DRA 输入；不把审阅用 HTML 当生产代码，不把尚未验证的真实数据、微信原生能力或发布状态声明为已完成。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=control-wechat-miniapp-v2-1-1-authority-and-reconciliation kind=control -->
Long Task 必须先按本文件的权威顺序完成 Source、Context 与 selected-design 对账，再创建并收敛唯一 `delivery-contract.yaml`。现有 `docs/wechat-miniapp-v2-source.md` 是可复用的 marked Source/semantic manifest 骨架，但含旧需求，未经全面修订不得进入 Compile；旧 selected v1/v2 和原始 V2.0 只作不可变历史追溯。
<!-- ty-source-item:end -->

## 1. 交付目标与边界

- 目标：在现有仓库架构中实现 V2.1.1 完整 Demo，并以当前候选上的项目原生检查和冷启动旅程证明已声明范围。
- 输入定稿时 Git HEAD 为 `main@2c5af28d04f4876bc84e9254b9ce2fa97c153695`，工作树包含本轮 DRA/Context 的未提交改动；Long Task 必须在启动时重新取得真实快照与 provenance，不能把技术方案正文保留的早期实施基线当成当前候选。
- 产品形态：微信小程序；H5 仅作为可重复验证入口，不得反向定义微信端产品语义。
- 主要生产 owner：`apps/wechat-miniapp/**`、`workers/miniapp-api/**`、`packages/miniapp-contracts/**`。
- 支撑与验证 owner：`tools/miniapp/**`、`tests/acceptance/**`、`infra/miniapp/**`，以及确有持久事实变化时的 `project_context/**` / `DESIGN.md` canonical record。
- 不在本次完成声明内：生产发布、真实商用 Provider 凭据、真实地点/路线/光害/天气/天文事实的人工认证，以及没有当前可运行观察通道的外部确认。
- Long Task 自行决定 packet、实现顺序与 worker 编排；本输入不创建第二份计划、Contract、结果账本或生命周期状态。

## 2. 权威输入及优先级

发生冲突时按“产品含义 → 技术实现约束 → selected requirement/交互投影 → 精确视觉 Authority → 已对账 Context owner → 当前代码”解释；当前代码不能反向改写 Source。

1. 产品权威：`docs/design-resources/miniapp-v2-drift-correction-2026-08-20/reconciled/今晚去观星_微信小程序产品方案_V2.1.1_LongTask输入定稿版.md`  
   SHA-256 `EE158A18E81F0ED5CD8051FA8CD6CFC009EF4782EEDB7C17CE11674ACECAA42E`
2. 技术权威：`docs/design-resources/miniapp-v2-drift-correction-2026-08-20/reconciled/今晚去观星_微信小程序技术架构与技术实现方案_V2.1.1_LongTask输入定稿版.md`  
   SHA-256 `77A510C8A5FE32C425BEBB5D113028CCB275BA9443C3678EF7DC40EB9E6BE7DA`
3. 正式 selected-design constraint：`docs/design-resources/miniapp-selected-handoff-2026-08-22-v3/miniapp-drift-correction-selected-v3.md`  
   SHA-256 `F78DFF0DEB579EE8435EE32B8EF33A10BB97D8DCC7F4584D4C7579614455CF7A`
4. 需求处置账本：`docs/design-resources/miniapp-selected-source-2026-08-22-v3/selected-requirement-dispositions.json`  
   SHA-256 `D70651613570F9BEF7FD029AD05AA628E3BB22FB5A6F93822565477C25989D70`
5. canonical 审阅资源：`docs/design-resources/miniapp-selected-source-2026-08-22-v3/index.html`  
   SHA-256 `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`
6. Observable Fact manifest：`docs/design-resources/miniapp-selected-source-2026-08-22-v3/fact-manifest.json`  
   SHA-256 `1718E207FEA167757453F558ADB9FA143103498F4EAAD369F4E927183E265605`
7. 精确视觉 Authority：`DESIGN.md` 的 `target.system.wechat-miniapp-soft-instruments-2026-08-05`  
   当前 SHA-256 `45DDFECF8AD3C9DA7EDC94312F15D3684D513603B5F317A91ADE1DE264E4CEB0`
8. 持久架构/表面/验证 owner：`project_context/global.md`、`project_context/architecture.md`、`project_context/context.toml`、`project_context/areas/main/**`。

`docs/design-resources/miniapp-selected-source-2026-08-22-v3/**` 是 handoff 的完整依赖闭包。不能只读 `index.html`，也不能把 preflight 的 Source 完整性结论误报为生产一致性。

## 3. 不可变历史与版本关系

- 原始产品 V2.0：`C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_V2.0_漂移纠偏与天象观测机会增强版.md`，SHA-256 `AF2D9B60C59B23D3040133974AB8C8AEA99DB43C566317AA3EDE4241C0786944`。
- 原始技术 V2.0：`C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_V2.0_漂移纠偏与天象观测机会增强版.md`，SHA-256 `82A281D1CD2D21556383876A24C62B7614CAB9531B7A98ED37535FC62041A98E`。
- V2.1.1 保留上述 V2.0 全文，并以文首 `0A` 规范性章节覆盖冲突历史；不得把正文中的旧投影重新激活。
- selected v3 保留 selected v2 的同一 U33 canonical HTML 字节和 97 项处置语义，只纠正方案版本、日期、状态与关联关系。
- selected v1、v2、v3 均不得覆盖；未来变化发布新 immutable 版本。

## 4. Compile 前必须处理的已知漂移

当前 `docs/wechat-miniapp-v2-source.md`（SHA-256 `43371183A5DD6FF65701F71AA4BF0F65AF6502F8121F127B55F94F6D5C904CAC`）不能原样复用。Long Task 必须以 V2.1.1 和 selected v3 为 Source，全面重做其 Census、atomic Facts、条件、Obligations 和 semantic-fact manifest，至少消除以下已知旧事实：

- `27` 个扁平筛选条件改为最终 `18` 项（10 个首层 + 8 个高级）。
- My/Favorites/Plan/Settings 四平级 tabs 改为常规“我的”账户中心；收藏不在 My 重复展示，Plan/Settings 为子页，Settings 是观测红模式唯一显式入口。
- Finder 统一搜索、筛选、收藏身份和点位列表；结果只定位地图/打开气泡，只有气泡有效激活进入 Detail。
- Map 默认展示正式观星点；分析是互斥叠加；没有“正式观星点/普通地图”同级 Tab、永久方向键或缩放按钮。
- Detail 的旧底部动作组改为名称旁 Favorite icon、路线行 `去这里 →` 和唯一 Spot Night 入口；地图不承载完整详情证据。
- 新增/统一 `SourceLiftFocusLayer`、`NotificationComponent`、Finder/Conditions 选中装饰、无可见纵向 scrollbar、Tab 动效与 reduced-motion 语义。
- 删除旧 selected v1 handoff 绑定，改为本文件第 2 节的 selected v3；不得只换路径而保留相互矛盾的旧 Fact。

这只是已知漂移清单，不是需求全集。完整闭包必须来自两份 V2.1.1、97 项 disposition 和 handoff v3，不能只修上面列出的例子。

## 5. UI Authority Closure 与 Context Delta

在 Contract Compile 前完成并验证：

- 对 `project_context/areas/main/screen-contracts.md`、`project_context/areas/main/verification/acceptance-runtime.md` 及所有命中的 selected-design locator 做 bounded search；把仍指向旧 selected v1/v2 的当前 canonical 记录更新到 v3，旧资源本身保留。
- 复核 `project_context/areas/main/product-surface-contract.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 是否完整表达最终 Map/My、Finder、Conditions、Detail/Sky、My/Settings、Notification 与恢复责任。
- 持久产品/技术 owner 变化先写回 owning Context，再写生产代码；精确视觉值只在 `DESIGN.md` 已有 target 或新不可变 target 中拥有。
- 运行 `ty-context design-resource preflight docs/design-resources/miniapp-selected-handoff-2026-08-22-v3/miniapp-drift-correction-selected-v3.md`，并把 handoff 作为 `task.source_paths` 中的 formal design Source。

## 6. Build / Reuse / Buy 与禁止捷径

- 先复用仓库已有组件、icon、state/store、contract、adapter 和 Design token owner；成熟、轻量、微信兼容且许可证可接受的 UI 库可以经 adapter 使用；稳定概念才新增共享抽象。
- 禁止复制 inline SVG 成第二套 icon 真源，禁止为了少量 primitive 引入整套重型 UI 系统，禁止让组件库默认 token 覆盖 Soft Instruments。
- 禁止第二地图、第二 selectedAt/overlay/filter/favorite 真源、页面私有状态副本、双挂载 SourceLift、假逐小时光害、hover-only 说明、color-only 选中状态。
- 禁止把 candidate HTML/H5 specimen 当生产微信小程序实现或机器验收依据。
- 禁止由项目 wrapper/self-report 字段伪造 Harness Actual、pass、verdict 或 runtime evidence；只使用 Long Task package admitted 的当前 Actual channel。
- 禁止覆盖 selected v1/v2/v3、原始 V2.0、用户已有无关工作树改动，或绕过 Context/Source/Contract owner。

## 7. 外部确认与诚实证明边界

- Design-resource preflight 只证明选定 Source 的完整性与完整 Census，不证明生产 UI、微信原生 map/canvas/sensor、真实 Provider、真实地点/路线/天气/光害/天文数据、像素、动效或无障碍已经符合。
- 可由当前项目检查/WeChat DevTools/受控 H5 journey 直接观察的行为，应在最终候选上执行并纳入 Contract。
- 需要真实账号、凭据、外部网络事实、设备能力或人工视觉判断而当前环境不能建立 admitted Actual 的义务，必须保持 Blocking External Confirmation；不得降格为静态结构证明。
- 不因外部确认仍待完成而声称 production-ready；只对已声明且已证明的 Demo 范围作结论。

## 8. 已知项目检查入口

Long Task 应从仓库事实中选择并在唯一 Contract 中精确绑定当前需要的检查，而不是机械复制本清单：

- `npx --no-install ty-context design-resource preflight <v3-handoff>`
- `make validate-context`
- `make validate-harness`
- `npm run design:lint`
- `npm run design:system:verify`
- `npm run design:targets:verify`
- `npm run check:miniapp:fast`
- `npm run test:miniapp:h5`
- `npm run test:miniapp:native`
- `npm run test:miniapp:current`

最终相关代码、配置、Context、Source 或 selected binding 变化后，必须在同一当前候选上重跑受影响检查和最终冷启动旅程；历史日志、DRA 浏览器 QA 或 pre-fix 结果不能作为最终证据。

## 9. Long Task 启动与停止点

1. 显式加载 `$long-task-workflow`，完整读取其 `SKILL.md` 和当前阶段引用。
2. 读取本输入、`INPUT_MANIFEST.json`、两份 V2.1.1、selected handoff v3 的完整依赖闭包、`DESIGN.md`、相关 Context 和当前代码。
3. 先执行 design-resource preflight、Source/Context 对账与 Architecture Deliberation。
4. 创建或修订恰好一个 canonical `delivery-contract.yaml`；不要创建并行计划、第二 Contract 或第二事实账本。
5. 在 Source 与 Contract 可预检后完成第一次 Authority Lock。
6. 若 `execution_model_checkpoint.required: true`，严格停在 Skill 要求的终端回合，不做产品实现、构建或测试；等待用户按 Skill 的精确短语解除卡点。
7. 卡点解除后按 Skill 的 packet-first、当前快照与唯一 Final Gate 规则持续实施，直到达到可诚实声明的终态。
