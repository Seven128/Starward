# R19 底栏资产退休独立审查 — 2026-10-23

结论：**本批最小变更未发现 P1/P2。** 六份已退休 Tab-only PNG 仅退出新主包复制，物理源图和历史声明保留；现用 Map 返回、我的入口、缺省头像及账户 default/selected 状态未被误删。新普通 gen18 已有实际官方准入结果，本审查也实看了其 Map→My→Map 三张手机截图。结论只覆盖本批资产/API 收口及这些实际观察，不认证整个 R19 或完整 Goal 完成。

## 范围与依据

审查代理独立读取了 AGENTS.md、交互设计 Skill、global Context、Mini Program Screen Contract 的当前采用与导航边界、DESIGN.md 对应图标/局部导航规则，以及 [底栏退休后的主包资产审计](R19-POST-TAB-ASSET-BUDGET-AUDIT-20261023.md)。实际查看当前采用增量的 `review-images/map.png` 和 `my.png`；它们来自已保留的临时增量输入，唯一采用节点仍为 `3995519477980461148`，未重新选稿或生成资源。采用范围要求去底栏、保留 My 返回地图及 Map 我的入口，并保持未涉及的图标、材质、配色、内容和既有交互。

本代理只读源码、保全包、构建/官方原件与已有手机图片，没有操作手机、DevTools、服务、构建、Git 或网络，没有委派，也没有改产品、PLAN、HANDOFF 或 INDEX。

保全入口：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/post-tab-package-retirement-20261023`。

- `before.private.json` 实际 SHA-256：`22fee09844e3246a2f5a17aba63c8d3f95e8fe0ed7c659ffc0c4c6342da1171f`。
- `build-result.private.json` 实际 SHA-256：`9eb103292a150e8115c5c2eb4d1b89e6b802b7958c72c21004c5dd0b28b6778f`。
- 对 `source-before` 五份文件重新计算 bytes/hash，全部与 before manifest 一致；读取其完整文本并逐份比较当前源码。对 `ordinary-before` 345 份文件和当前 canonical `dist/weapp` 339 份文件重新计算全部 bytes/hash，分别与 before/build-result 对应表逐件一致。原 before manifest 的 Windows 路径分隔符经规范化后比较，没有将路径格式差异当作文件损坏。

## 源码与实际消费者

| 文件 | 独立确认的完整变更 |
| --- | --- |
| `config/index.ts` | 只从 `retainedLegacyIconFiles` 移出下述六项；其余复制声明和打包逻辑不变。 |
| `navigation/primary-navigation.ts` | 删除旧 `PrimaryNavigationIcon` 类型和 `primaryNavigationIconPath(icon, mode, selected)`；以仅收 mode 的 `primaryMapIconPath(mode)` 表达现存 Map 返回职责。`PRIMARY_NAVIGATION_ITEMS`、Map/My 路由、路由判断、布局函数均保留原值。 |
| `components/semantic-asset.tsx` | 仅替换导入与 `name="map"` 分支的调用。原调用已固定 `("primary-map", mode, false)`，新函数在 DAY/NIGHT/OBSERVATION 输出同一原路径；该分支本来不使用传入 state。其它图标、账户路径与状态解析没有修改。 |
| `components/semantic-asset-test-support.ts` | 同步真实导入与 VM runtime port 名称，继续加载真实 SemanticIcon 和真实导航解析器，没有以伪造路径替代实现。 |
| `components/semantic-asset.test.ts` | 在已有行为测试中增加三个主题 Map 实际渲染 src 与“地图”名称、主包 account-user default/selected 路径断言；原断言未删减。 |

对 `apps/`、`packages/`、`tools/` 的受控源码检索未发现旧函数/类型的未迁调用。实际链为 `MyLibraryPage` 的 `CustomNav backPresentation="map"` → `SemanticIcon name="map"` → 新解析器；Map 我的入口和 My 缺省头像仍通过 `SemanticIcon name="account-user"`。未因路径含 `tabbar` 就退休仍有职责的资产。`app.config.ts` 与实际 `app.json` 均无 TabBar；没有残留编译 `custom-tab-bar/` 目录。

继续保留并核对了以下路径与旧包逐字节一致：

- DAY Map：`assets/b-icons/weapp-tabbar/map--day--default.png`。
- NIGHT/OBSERVATION Map：`assets/icons/tab-map-night.png`、`tab-map-observation.png`。
- 主包账户：`assets/b-icons/weapp-tabbar/account-user--day--default.png`、`account-user--day--selected.png`。
- 账户其它主题：`assets/icons/account-user-night.svg`、`account-user-observation.svg`。

DAY 导航声明 hash 仍为 `554c8883091067305da4de6793d3d5b346b19ff382699e21571345a18d20e89c`；main B 声明仍为 `f3ba1d2a347d3c8ab862c988c8b28b4f6340c5dd41c135d543b45241baf323bb`。账户 selected 仍由原 `adoptedBIconPath` 动态生成，不能因 minified JS 中没有完整 selected 文件名 literal 就认定无效。

## 完整构建与保留边界

独立计算的旧/新包差异仅为：

- 移出 `tab-map-selected-night.png`、`tab-map-selected-observation.png`、`tab-my-night.png`、`tab-my-observation.png`、`tab-my-selected-night.png`、`tab-my-selected-observation.png`，共 **5,833 B**。
- `common.js` 减少 **349 B**；实际编译 Map 路径分支仅按 mode 解析，未保留 `tab-my` 或 `tab-map-selected` 输出。
- 无新增文件。所有其它保留输出逐字节一致，包括 **24 份 WXML、32 份 WXSS、32 份 JSON** 和全部保留资产。六份物理源 PNG 仍存在，bytes/hash 同旧包，也同历史 `delivery-carrier.json` 的 source snapshot，不是从磁盘删除原件。

旧包为 345 文件 / **5,023,816 B**；新包为 339 文件 / **5,017,634 B**，文件和减少 **6,182 B**。新包实际主包 **2,029,271 B**，content **1,041,539 B**、spot **612,072 B**、sky **1,334,752 B**；无 source maps。新 gen18 prepared `generation-000018-4Kvksw/project/dist/weapp` 的全部 339 文件也与当前 canonical/build-result 逐件一致。

构建记录 `normal-build.private.log` 实际 SHA-256 为 `407876bd9bfbdf3cd87ac6fd7df16ee46e44602cd7bf3fe2b8eceb09edc5adfc`；读取其完成行，webpack 29,853 ms / 10 warnings。build-result 的 11 项 production checks 均为 true，physical guard 与 compiled origin 结果保留。本代理没有重跑构建或测试；Root 报告的 23 项相关检查、最终 semantic 3 项重叠检查及 typecheck 0，不被本审查扩写为独立重跑结果。测试代码层面的检查已如上完成。

## 官方结果与手机实际观察

直接读取新 gen18 `.official-process-959121f9-e984-41a5-9aba-28fedfc7f33a.json`，hash 为 `60da46435a4847a6e4e0873667d47f3697128987b2453011e3f59d6ac5faf4ca`：exit 0、未截断；解码 stdout 得到 `ok:true` / `tool:auto_preview` / `success:true`，不是从退出码单独推断成功。

同时读取私有 `ordinary-gen17-originals/generation-000017-t4tyDI/.official-process-5ca1358a-133e-4dbb-a35a-f206018e0b89.json`，hash 为 `8b7e535cbd4af5143c5c031333a938be816729a9f4eeac679e61b3f7b201aec0`，确认旧官方口径。新官方 main **2,088,195 B**，较旧 **2,094,369 B** 减少 **6,174 B**，距 2 MiB **8,957 B**；新 TOTAL **5,010,117 B**，content **990,324 B**、sky **1,317,135 B**、spot **614,463 B** 不变。这些是实际两次官方结果，不是用本地减法冒充准入，也不是未来修改的包体保证。

Root 操作的普通 gen18 手机 session 为 `starward-device-test-mBiLUn`。本代理实际查看三张比例缩放审阅图，逐一读取其来源元数据并重新核对 1080×2376 原 PNG bytes/hash：

| captureId / UTC | 实际可见结果 |
| --- | --- |
| `4ca801a2-8209-4d3d-8518-20abd9d21c0b` / 05:56:31.245 | 完整 Map，左上我的头像图标和同族工具可见，无底栏；原地形/光污染来源显示仍在。 |
| `d5f1ce9f-6198-4511-ac41-e30e00ff7a0e` / 05:57:10.909 | My 左上地图图标+文字与缺省头像可见，原渐变、卡片结构和现有图标保持；仍显示匿名条件下“资料暂不可用/账户资料暂未取得”。 |
| `79041b5b-d220-457c-9574-97eefe6c97b7` / 05:57:49.616 | 返回完整原 Map，左上我的图标、工具、所见地图/叠层及来源保持。 |

三份原图 hash 依次为 `c3318038b2a5db5d590414a21120d52d3c3320fd54b0fd5e4b72fae334adc73a`、`74b800a43ed7dacceb4acbd570eeef543b84513bd6891f4782b67ef358c7cb73`、`05dc81d9b855b3c2a8bc9b18be883e9c43d4d811d5cf06204691dbb052a85b59`。活动原件位于 `C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/starward-device-test-mBiLUn`；Root 承接本批私有封存。审阅图只做等比缩放，不把浏览器设计资源当手机画面。

本批没有发现缺图、错图或因 API 收口造成的可见布局变化。My 正常账户和有效计划内容仍受原依赖限制；此次没有尝试重试账户或伪造数据。静态三帧不证明新转场时长/物理流畅度，DAY 观察不代替 NIGHT/OBSERVATION 手机验收，runtime AppID/最终候选完整验收也没有由这些截图建立。原有未验义务继续保留。
