# Starward / 今晚去观星 · 移动端控件级开发设计稿 v3

## 资源身份与边界

这是页面布局原型之外的控件级开发设计 Source，状态为 **ordinary Source / unselected candidate**。v3 从冻结 v2 四文件逐字节复制后，仅修复已经独立复现的 P0 运行时故障及动态验收发现的窄视口级联问题；12 个移动 Outcome、83 个 stable control、21 个 dedicated、A–F 与全部业务契约保持不变。

本资源不是生产 React Native/Expo 实现，不修改或替代 Context、`DESIGN.md`、Source Plan 或生产代码，也不宣称原生真机、传感器、触觉、性能、外部服务或安全验收已完成。

## 四个核心文件

- `index.html`：1440×900 优先的三栏交互图谱；左侧 7 章/83 控件，中部 390×844 specimen、状态对比和 A–F 流程，右侧十个工程 Inspector 分区。
- `control-atlas-manifest.json`：冻结 12/83 映射，保留 exact outcome/control order、route、source states、interaction、locators、specimen/contract key 与 dedicated/shared。
- `implementation-contract.json`：机器可读 token/icon/family/state/motion/haptic/page/control/traceability/verification 契约；每个控件都有 15 个必需一级字段。
- `README.md`：范围、使用、来源、映射、真实审计和明确未声明。

## 使用方式

1. 直接打开 `index.html`，无需构建、外部脚本、字体、图片或网络。
2. 左侧按 7 个 family/section 浏览，或输入 exact control ID 后回车。
3. 选择控件，在右侧 States 切换实际适用 rendition；变化作用于控件内容、值、动作与语义，不只是通用边框。
4. 在顶部切换 planning / night / red-light；手机结构与控件位置不变，外部审查画布始终为 `#F7F8FA`。
5. Logic & Data 中选择 A–F 流程；“成功下一步”“阻断/错误”“恢复”“取消”分别运行对应路径。
6. Component API、Motion、A11y、Platform、Content、Assets、Acceptance 分区直接读取当前控件的 resolved contract。

示例只读检查命令：

```powershell
Get-Content .\implementation-contract.json -Raw | ConvertFrom-Json |
  Select-Object -ExpandProperty controls
```

## v2 P0 根因与 v3 修复

v2 `index.html` 把 `flowKey` 初始化为不存在的 `map-sync`，而 `FLOW_DEFS` 只定义 `A`–`F`。脚本又在增强版 `renderFlow` / `flowApply` 与完整 click/change handlers 安装前执行首次 `renderFlow()`；它读取 `FLOW_DEFS[flowKey].label` 时抛出 `TypeError`，余下脚本终止，所以十个 Inspector tab 与 A–F 表面存在、实际不可操作。

v3 的修复保持在当前项目内：

- 初始流程改为真实存在的 `A`，并把首次 flow render 延后到增强版函数与全部 handlers 安装完成之后。
- flow select 先重置为 success 分支再应用；Next/Prev 按当前 success/block/recovery path 计算边界；Cancel 回到未提交前状态。
- 未知 flow、未知 branch、空 path、越界 step、无 ID step、未知 control 与缺失 specimen 都显示明确 defensive error state，并写入 console error，不吞掉故障或留下空白。
- Visual 直接渲染逐控件 contract 的精确几何、safe area/hitSlop、spacing、border/radius、resolved planning/night/red-light tokens、typography、icon registry、elevation/z-index、responsive/orientation/text scale；Component API 使用完整 typed props。
- 动态视口验收发现并修复 820px 根级水平溢出，以及 1024px Inspector 默认显示被后置样式覆盖的问题；不改变 v2 的视觉方向或业务语义。

拒绝的 v2 `index.html` SHA-256 为 `de7ff22088b1a0ab839ebd18c648d79191c5c1ce7bbe63e5c9117d7f2319c9f1`；当前 v3 `index.html` SHA-256 为 `c29beac7c41549478544beadef96810fb662487480032c15be5db6e536991b2a`。

## 覆盖映射

| Outcome | Route | Controls |
| --- | --- | ---: |
| `mobile-shell-and-preferences` | `/onboarding-preferences` | 4 |
| `tonight-decision` | `/tonight` | 6 |
| `forecast-and-astronomy` | `/forecast` | 5 |
| `map-route-discovery` | `/map` | 7 |
| `spot-detail-and-trust` | `/spot/qingshuihe` | 8 |
| `itinerary-and-collaboration` | `/trips` | 9 |
| `sky-orientation-ar` | `/sky` | 8 |
| `shooting-assistant` | `/shooting` | 6 |
| `field-offline-safety` | `/field` | 9 |
| `community-contribution` | `/contribute` | 6 |
| `notifications-and-toolbox` | `/toolbox` | 6 |
| `identity-profile-privacy` | `/me` | 9 |
| **合计** | — | **83** |

v1 的 21 个 `dedicated:true` 控件全部保留专用 specimen，并拥有独立 state machine、success/block/error/recovery acceptance 与可解析 transition ID。其余控件保留真实 specimen、声明状态 rendition 和完整工程契约。

## A–F 可执行高风险流程

- A Map：搜索/无结果、marker→卡/sheet/路线同步、25/55/90 拖动/反向/取消/吸附、主地点、route revision 与外部导航二次确认。
- B Trips：时间节点拖动/反向/取消、revision/share、协作 conflict/error/recovery。
- C Sky：19:30–04:30 连续 scrub、方向跟随、传感器降级、手动校准、AR unavailable/disabled、手势仲裁与 reduced motion。
- D Field：离线包 loading/partial/error/retry、三种同位模式、离线返车、安全停止二次确认、限时位置分享、三次失败错误 ID 与恢复。
- E Privacy：媒体隐私、游客合并预览/冲突/二次确认、会话撤销、导出/删除影响、error/recovery。
- F Decision：fresh/stale/degraded/unknown 分别改变结论、证据与主动作；未知值显示“—”，不伪造确定性。

## 冻结来源与候选状态

以下输入在生成与审计时完整读取并仅用于只读抽取；没有写入其目录：

- prototypeHtml: `21838ed2a28f218fb4b37a05827b1be1d6993b23a02fa97847e78fdaa0af4271` — `C:/Users/777/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/starward-system-mobile-20260722-v2/index.html`
- coverage: `6f99c5a965f167db39babacb853c984aa01e7805095dc9350b7126e36a1ed46f` — `C:/Users/777/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/starward-system-mobile-20260722-v2/coverage-manifest.json`
- prototypeReadme: `4c95723f217be83d22b0b3b86f34787a4d455408a3b3e863b817ca8cd4c53801` — `C:/Users/777/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/starward-system-mobile-20260722-v2/README.md`
- v1Html: `8bea023ca122fa64c3772c92bdca458be144e31932abfc9551fc42342264e3ff` — `C:/Users/777/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/starward-mobile-control-atlas-20260722-v1/index.html`
- v1Manifest: `1b9074e53db11969c31d7788b95ac5515d3cf1a8480c86ed1f84d015d40a54d7` — `C:/Users/777/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/starward-mobile-control-atlas-20260722-v1/control-atlas-manifest.json`
- v1Readme: `07eb7ac7346cba4e92cca4966200ab4ea90f1da401a6a4ad7a4e65ce7129d922` — `C:/Users/777/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/starward-mobile-control-atlas-20260722-v1/README.md`
- design: `3ccd7211333b48bdc10eb4ee77b34058f7433a8ff80aaacea212f547754a3836` — `C:/Dev/Starward/DESIGN.md`
- sourcePlan: `439dafc17a9a1b1aa4134df1789d40d5a75ed8ac651c2b97a57a79ce1631ca3a` — `C:/Dev/Starward/docs/source-plan.md`
- interactionSkill: `96fd6fbbc37d76ed6d0b2c3dd1520b9a514318887cd2d5d544dfcfa55b4ed6d9` — `C:/Dev/Starward/.codex/skills/uiux_design/SKILL.md`
- interactionReference: `328937755c99bc5e4dfa9d27031363dc1bb7463bbaea4bbdd801e946f1261a3c` — `C:/Dev/Starward/.codex/skills/uiux_design/references/react-native-interaction-contract.md`
- goalIndex: `c0c24ed737e839daaf85a929a4f0fb3c68a30e945bfc35b93cd58fed55d55f0c` — `C:/Users/777/AppData/Roaming/Open Design/namespaces/release-stable-win/data/starward-system-uiux-goal-index-20260722.md`

## 已执行审计

| 检查 | 结果 | 真实结果 |
| --- | --- | --- |
| JSON / inline scripts | **通过** | 当前两份 JSON parse；两段 inline scripts 实际 parse。 |
| frozen-inputs-unchanged | **通过** | v2 四文件、最终页面三文件、DESIGN / Source Plan / interaction Skill / goal index 均保持冻结哈希，只读未修改。 |
| frozen-exact-order | **通过** | 12 Outcome / 83 control 的 exact order、route、states、interaction 同时匹配 v2 manifest 与最终 coverage。 |
| html-specimens / contract | **通过** | 83 unique DOM specimens、83 unique specimen keys、83 contract records × exact 15 fields、12 page assembly contracts。 |
| references / guards | **通过** | family/icon/motion/haptic/transition/acceptance refs 全解析；unique IDs、no external deps、no CSS filter、44px、focus-visible、reduced motion 通过。 |
| red-light-contrast | **通过** | 冻结契约仍为 text 6.90:1、graphic 3.28:1。 |
| 首次 raw HTTP 载入 | **通过** | 当前 v3 初始 `flowSelect=A`，console error=0，runtime error=0，`83 / 83 · RUNTIME 0`。 |
| 10 Inspector tabs | **通过** | 逐一真实点击 Visual / States / Component API / Logic & Data / Motion / A11y / Platform / Content / Assets / Acceptance；每次恰好一个 `aria-selected=true`，对应 tabpanel 唯一可见且内容非空。 |
| selected-spot-sheet | **通过** | Visual 精确显示 25/55/90、44px hitSlop、safe area、12/8 spacing、1/24 border-radius、resolved 三模式 tokens、type/icon/elevation/z-index/responsive/text scale；API 与 Motion 精确值通过。 |
| A 流程 | **通过** | success 实际到达 25/55/90；block、recovery、cancel 均同步 specimen/state/detent/Inspector。 |
| C / D / E 抽查 | **通过** | C 19:30→04:30 scrub、sensor degraded/recovery；D offline loading、red-light、download error；E merge conflict、delete blocked/error 均通过。 |
| Mode / text / motion | **通过** | planning、night、red-light；Text 200%；reduced motion 均由真实控件操作并同步状态，零 console error。 |
| 多视口 | **通过** | 1440×900、1024×768、820×900 均以 live DOM geometry 验证无页面水平溢出、无主区域重叠；1024 Inspector drawer 与 820 stacked layout 通过。 |
| 键盘 focus | **通过** | Inspector tab `ArrowRight` 同步焦点/选中/panel 且 focus-visible；1024 drawer `Escape` 关闭并把可见焦点返回 Inspector。 |

## 已知未决与未声明

- 代表性 iPhone/Android 真机的 spring/velocity、系统返回竞争、VoiceOver/TalkBack、触觉、60fps/高刷新、低功耗和暗环境亮度仍需 downstream 原生验收。
- AR、相机、方向传感器、系统通知、真实地图/路线/天气/天文、账号、协作、同步、位置分享、导出和删除均未连接真实服务。
- 地点、时间、数值、错误 ID、人物、设备与媒体均为设计样例；不提供实时性、路线可达或人身安全保证。
- `spot-media-gallery` 只有明确标为 replacementRequired 的候选占位，不声称生产媒体许可。
- token、icon、family、motion/haptic 和 transition 是 candidate contract；只有 downstream adoption 后才成为实现 Authority。
