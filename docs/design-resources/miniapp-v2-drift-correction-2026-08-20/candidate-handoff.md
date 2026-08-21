# 今晚去观星 Mini Program V2.0 设计资源候选交接

状态：unselected / rolling-review-snapshot / provider-succeeded / provider-current-byte-browser-QA-passed / outer-static-evidence-reviewed / non-production

本文件记录同一次 Design Resource Authoring“确认—挑问题—改需求—重生成资源”循环的当前 U33 快照。它不是正式选定交接、Design Authority adoption、最终完整 manifest、生产实现或产品验收；用户仍可继续评审并提出后发需求。

## 当前资源

- 可运行入口：`candidate/index.html`。
- 当前快照机器索引：`candidate/resource-manifest.json`。
- Provider 说明：`candidate/README.md`。
- Soft Instruments 绑定：`candidate/brand-spec.md`。
- 仓库侧 provenance / outer-QA companion：`candidate/index.html.artifact.json`。
- 全部需求变更、supersession 与恢复轨迹：`WORK_INDEX.md`、`open-design-commission.md`。

当前 manifest 是评审期滚动索引，只保持“候选字节—需求 disposition—locator—provider QA”同步。只有用户明确选择候选、一次性回写 S1/S2 并完成 UI Authority Closure 后，才生成正式不可变版本和 selected-design preflight 输入。

## Source、视觉与权威边界

- 产品 Source：`C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_V2.0_漂移纠偏与天象观测机会增强版.md`，SHA-256 `AF2D9B60C59B23D3040133974AB8C8AEA99DB43C566317AA3EDE4241C0786944`。
- 技术 Source：`C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_V2.0_漂移纠偏与天象观测机会增强版.md`，SHA-256 `82A281D1CD2D21556383876A24C62B7614CAB9531B7A98ED37535FC62041A98E`。
- Exact visual profile：`DESIGN.md#wechat-mini-program--soft-instruments-v1`；target `target.system.wechat-miniapp-soft-instruments-2026-08-05`。
- Open Design binding：`user:soft-instruments`；digest `5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`。
- S1/S2 在候选评审期间保持逐字节不变；后发用户决定进入 durable Context 与本候选记录，等待明确 selection 后一次性回写。
- 旧 selected v1、`DESIGN.md`、生产代码、测试和旧 selected-handoff 均未覆盖或改写。

## 本轮 U24–U33 已实现需求

U24–U32 继续保持：连续 SourceLift 恢复、聚焦 Search cue 去重、筛选 dirty actions、Detail 核心信息与 tab motion、全局隐藏纵向 scrollbar chrome、Settings-owned observation mode、共享 selected-star 和共享 Notification family。它们的完整逐项轨迹仍在 `WORK_INDEX.md` Sections 3.7–3.8 与 commission Sections 26–29。

U33 新增 `USER-MY-ACCOUNT-CENTER-001`：

- “我的”根页改成常规移动端账户中心：标题区只显示“我的”，不再显示“收藏、计划与显示偏好”副标题，也不再使用“我的/收藏/计划/设置”平铺 tabs。
- 顶部右侧使用安静的 Tier-A 齿轮图标，44px 命中区，避开微信胶囊；点击进入独立 `mySettings` 子路由。
- 根页只保留简洁 profile/login 摘要与普通分组列表；“观测计划”进入独立 `myPlan` 子路由，“显示与偏好”进入 Settings。
- “我的”不再重复展示收藏入口、数量、列表或独立 Favorites 页面。收藏关系仍由 Finder“想去”与 Detail Favorite 共用同一 `favoriteIds` 状态，静态身份与失败保留不变。
- Plan 与 Settings 使用真实历史子路由；显式返回、系统 Back 与键盘 Back 都恢复 My 根页精确 scrollTop 与逻辑 opener focus。
- Settings 继续是观测红模式唯一入口；Spot Night 仍无入口。切换模式不离开 Settings，退出恢复进入前的 day/night context。
- 原 My 侧 stale/provider 通知迁移到 Plan 的共享 inline Notification；Settings 的观测模式恢复反馈继续使用共享 floating Notification。
- 参考的是成熟移动端账户中心的通用信息层级，不复制京东、淘宝、天猫的品牌、配色、图标、商业模块或页面。

## Open Design provenance 与字节身份

- Provider：Open Design `0.16.1`；project `starward-miniapp-v2-drift-correction-2026-08-20`；conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`。
- 本轮 run：`08dc6555-0032-4350-a8fc-e03b7104da1f`。
- 请求与实际启动：`gpt-5.6-sol / xhigh / user:soft-instruments`。
- 结果：`succeeded` / exit `0` / `endedWithUnfinishedWork=false`。
- 最终 provider/repository canonical 文件逐字节一致：
  - `index.html`：`9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`。
  - `README.md`：`DD6699CFC4D28EC88AD82B473B196F7911244C70652ACE4D8DB4FE8B04F40409`。
  - `resource-manifest.json`：`754AE81EE957EA672AD9199C1CDEA09737A74AC00632AD8A8E675A92BAC2582F`。
  - `brand-spec.md`：`C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1`，逐字节不变。

## 当前需求集合

滚动 manifest 当前枚举 97 个唯一 ID：

- `covered`：73。
- `covered-active-remainder`：1，仅 `USER-NIGHT-TIME-FOCUS-001` 的 formal Spot Night 局部时间交互仍活动。
- `partial`：3。
- `excluded`：1。
- `inactive-superseded`：19。
- `decision-required`：0；active dispositions 共 78。

U24–U33 均为 `covered` 并有 current locator。更早的 accepted、superseded、inactive 与 unresolved 变化仍在同一 `WORK_INDEX.md`、commission 和 rolling manifest 中，没有另建第二份需求。

## 当前字节 QA

Provider current-byte Browser QA 绑定最终 `candidate/index.html` SHA-256 `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`：

- 320×800、375×900、430×932，day/night/observation × normal/large × normal/candidate-reduced 共 36 个 My 组合通过。
- My 根页旧 subtitle、peer tabs 与 Favorite 元素为 0；齿轮 44px、Plan 行 60px；横向 overflow、重复 runtime ID、未命名可见动作与可见纵向 scrollbar chrome 均为 0。
- Plan 与 Settings 独立路由通过；显式、system history 与 keyboard Back 均恢复根页 scroll 与逻辑 opener focus。
- Settings 的 observation entry 恰一，Spot Night 为 0；Finder Wanted 与 Detail Favorite 仍在；Plan inline 与 Settings floating 均实际复用同一 Notification component。
- U24–U32 的 Finder/Filter、SourceLift、Conditions、Detail、Night、Notification、selection、scroll 与 reduced-motion 回归在同一最终字节通过。
- application console warning/error、外部 runtime、缺失 locator、重复 authored ID 均为 0；97 个 disposition 与哈希对齐。

仓库外层完成了四个 canonical 文件 byte identity、JSON/inline-script 解析、97-row ledger/locator、旧文案与旧 My 元素归零、Context/authority 边界和 Provider 最终截图/结构化结果复核。外层尝试接管用户已打开的本地 `file://` 候选做独立浏览器重跑，但 Browser URL policy 拒绝该页面并禁止 workaround 或切换替代浏览器表面；因此本快照不声明“U33 独立浏览器重执行通过”。这不阻止它作为未选定评审候选继续供用户检查，但正式 selection 前仍应在允许的同字节浏览器/原生入口补齐该证据。

Provider README/manifest 中的 `independent = NOT RUN` 只描述 Provider 边界。本 handoff 的外层结论限于 byte/static/provenance 与已记录浏览器证据复核；不证明 native 微信小程序、真实 Provider/路线/天气/光害/设施/安全/账号、生产实现或产品验收。

## 选择与一次性需求回写

- S1/S2 不按每轮候选反馈反复改写。只有用户明确选择候选后，才把全部评审结论一次性对账回产品/技术方案。
- 之后才执行 UI Authority Closure、新 immutable selected version、正式 handoff 与 production conformance。
- 未选择前不运行 selected-handoff preflight，不覆盖旧 selected v1，也不据此直接改生产代码。

## Engineering Quality Conformance

- Architecture Conformance：Product Surface / Screen Contract 拥有 My/Finder/Detail/Plan/Settings 持久责任；`DESIGN.md` 拥有 exact visuals；Open Design 只拥有未选候选字节。
- Correctness / reliability：一个 My root、两个真实 child routes、一个 favorite relation、一个 display-mode store、一个 Notification renderer；Back/focus/scroll、mode restore 与 clean terminal state 均在 Provider current-byte 浏览器证据闭合。
- Maintainability / changeability：不复制 Favorites owner，不建立平行 tabs state，不复制电商页面；使用既有 shell、Tier-A icons、普通 list rows 与 Notification family。
- Accessibility：44px、命名动作、focus return、大字、reduced motion 与 hidden-chrome scroll 已覆盖；native WeChat/device 行为仍未验证。
- 无生产依赖锁定、无 authority adoption、无未记录 scope escape。

Context: updated `project_context/architecture.md`, `project_context/areas/main/product-surface-contract.md` and `project_context/areas/main/screen-contracts/wechat-miniapp.md`
