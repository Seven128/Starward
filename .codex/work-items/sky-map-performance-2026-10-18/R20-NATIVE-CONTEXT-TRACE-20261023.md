# R20 F07 native App Context 消费者核验（2026-10-23）

状态：**确认部分真实消费链路有缺陷；尚未修复，不代表设备验收通过。** 本轮只新增任务内探针和证据，没有修改生产代码、总 PLAN 或 HANDOFF，没有操作微信开发者工具、手机、ADB、构建或共享服务。

## 权威与验证范围

- `docs/source-plan.md` 的 `global-obl-shared-decision-context`、`global-ac-context-atomicity`：位置/观星夜/时刻/偏好/目标/选中地点等通过一个版本化决策 Context 原子更新，或明确标尚未重算；页面不能维持相互矛盾副本。
- 同文件 `ctrl-forecast-and-astronomy-hourly-matrix-success`：选中时间同步其它表面；`ctrl-forecast-and-astronomy-trend-calendar-success`：选择的未来日期可带入今晚报告/行程创建。
- `req-sky-orientation-ar-sky-time-control`、`ctrl-sky-orientation-ar-sky-time-scrubber-success`：有效时刻操作同步画布、轨迹、详情和摄影入口；`shooting-inputs` / `condition-aware-shooting` 保留同一地点、时刻和条件身份。
- `project_context/areas/main/screen-contracts/mobile.md`、`mobile/core-journeys.md`、`mobile/field-and-account.md`、`project_context/architecture.md`、native `DESIGN.md` 和 `.codex/skills/uiux_design/SKILL.md`：本任务属于原生 App，不能借用小程序 Observation Context/UI；浏览/手势呈现与已提交领域状态有不同责任。
- 复用当前 F05/F06 实现：启动恢复在 RuntimeRoot，真实位置成功后保存数值坐标与元数据。此次未重新采集定位或重跑其设备验收。

探针为 `scripts/r20-native-context-consumers-probe.test.tsx`，日志为 `tmp/r20-native-context-consumers-probe.log`。使用真实 React 组件、Zustand store、React Query 与 HTTP client；仅 RN/Expo 渲染/导航/存储以及外部 HTTP 边界替换。输入均为明确合成地点和时刻；没有访问真实网络、账户、数据库或私有资料。断言观察组件动作后实际到达 fetch 的请求及可见文字，不是复制 query 参数的孤立 helper 测试。

运行：

```powershell
node tools/run-node.cjs --bin vitest vitest run .codex/work-items/sky-map-performance-2026-10-18/scripts/r20-native-context-consumers-probe.test.tsx --reporter=verbose
```

4/4 **缺陷复现**通过。此临时 probe 对当前错误行为断言，不能加入产品通过门槛；修复时应转成相应的正确行为回归并退役当前缺陷期望。首轮 3/4：Sky→Shooting 的预期固定到 `.000Z`，而 `vi.waitFor` 推进 fake Date 100 ms；改为在 Shooting 真正挂载前记录当时的 now+6h 后通过。该首轮差异属于探针时间假设，不是新增产品缺陷。

## 已通过实际消费者确认

| 代表动作 | 观察到的真实请求/状态 | 判断 |
| --- | --- | --- |
| Tonight 点击“明晚”，随后进入 Forecast、Map；合成当前时刻 `2026-10-23T08:00:00Z` | Tonight POST `nightDate=2026-10-24`；全局 Context 为 `2026-10-24`。Forecast 和 Map GET 均为 `nightDate=2026-10-23`，Map 仍显示全局 `2026-10-24` 标签 | **已成立**：显示的共享版本与真正请求日期不一致。Forecast 不是从 Tonight 的已提交夜初始化；Map 的 query key 也没有观星夜，后续相同位置改夜无法使它按夜重算 |
| Tonight 自定义日期编辑为不完整的 `2026-` | 全局 Context 变成 `2026-`；HTTP 请求被 `dateValid` 禁止，页面同时显示日期无效 | **已成立**：未通过验证的编辑草稿覆盖了已提交 Context。请求层拦截并没有保护共享状态 |
| Sky 点击“目标最高”，待实际请求/可见时刻更新，再点击其“打开摄影助手” | Sky 请求并显示 `2026-10-24T18:45:12.000Z`；全局 Context 完全未变；导航只带 `/shooting`；Shooting 实际请求 `scheduledAt=2026-10-23T14:00:00.100Z`（本次挂载 now+6h），`nightDate=2026-10-23` | **已成立**：已选精确时刻没有传给摄影消费者。Sky 本页的精确请求确实改变，不能把该问题描述为 Sky 按钮无效 |
| Map 点击合成地点 B，再打开“当前选中地点详情” | `map-selection-store.selectedSpot.id=f07-spot-b`，地图路线请求目的地也为 B；导航却固定 `/spot/spot-a`，实际 Spot client GET `/v1/spots/current` | **已成立**：选择/路线与地点详情的身份不一致，不能以共享版本文字证明详情使用了 B |

反证：合成出发地 A 的数值 `31.23,121.47` 在上述 Tonight、Map、Sky、Shooting 请求中有真实传播，地图路线的 B 目的地也正确。因此“所有页面位置都固定”或“地图选择完全没有效果”不成立。这里不代表实际定位、跨时区定位或权限已经验收。

## 当前所有相关消费者的责任追踪

| 当前 owner / consumer | 实际实现与边界 |
| --- | --- |
| `state/decision-context.ts` | 只有 `revision/observingNight/origin: string/profileId/target`，没有精确 moment、时区或选中地点身份。`advanceDecisionContext` 只按字符串比较并递增，不负责输入合法性 |
| `shell-store.ts` | 保存全局 Context；当前 `commitDecisionContext` 的唯一生产调用者是 Tonight。真实位置与偏好已在 shell store 有 owner，不应再造另一套并行位置/偏好状态 |
| `TonightScreen.tsx:139–169` | 自己保存 `dateMode/customDate` 并以 effect 整包写 Context，查询却直接用本地变量。回到/重挂 Tonight 可能再次覆盖其它入口的提交；这后一种竞争尚未单独运行，不写成已复现 |
| `ForecastScreen.tsx:260–303,341–344` | `selectedNight` 初始 UTC 日期；`selectedHourIndex`、模型和图层均本地。进入默认证据丢失 Tonight 夜已复现。模型选择、图层透明度和滚动位置应保持本地浏览状态，不能为了“统一 Context”强制全部全局化 |
| `MapScreen.tsx:80–106,121` 与 `map-selection-store.ts` | shell location 是出发地；地图选中对象、角色、route revision 另有既有 owner，不能把“选择观测点”误当“覆盖用户出发地”。当前 Map 对共享选中对象只有写入，没有其它生产 reader；详情身份问题已复现 |
| `SpotScreen.tsx:40–50` 与 `app/(map)/spot/spot-a.tsx` | 路由目前只有固定 `spot-a` 文件；查询 key/请求为 `current`，与点击身份无关。共享 Context 仅由标签组件读取 |
| `SkyScreen.tsx:151–171,198` | shell location 数值被请求消费；`at` 自己初始化 now，“目标最高”只更新本地 at。`persistSkyResolution` 是结果持久化，不是共享决策时刻提交，两者不能混称。没有读取全局 target/night/moment |
| `ShootingScreen.tsx:283–322` | 读取位置和活动 profile 的焦段；scheduledAt 是挂载时 now+6h；没有读取 Sky/Context 时刻。保存既有拍摄版本的浏览不应被当前 Context 静默覆盖，新生成才应使用当前已提交输入 |
| `ItineraryScreen.tsx:319–332` / `data/itinerary-client.ts` | 查询 `['itinerary']`，命令体只有 `{command}`；Context 只作为文字标签。`generate/add-candidate` 等需要真实业务输入的动作，应与 R20 独立 API 业务持久化 owner 一起接入。已保存行程有自己的 id/revision，不能在切换页面时被浏览 Context 重写 |
| `FieldScreen.tsx:327–340` / `data/field-client.ts` | 读取 `/v1/field` 并发字符串命令，未携带选中行程 id/revision；它应消费被显式采用的行程/离线包，不是把用户临时浏览夜直接套进已经激活的现场包 |
| `CommunityScreen.tsx:222–245` | 查询 `['community']`、字符串命令，Context 标签不参与请求。投稿/实况/纠错的地点与证据时刻不能随浏览 Context 自动更改；需要在创建动作中显式取得目标身份，已提交/历史实体保原记录 |
| `MobileShellScreen` / `DecisionContextRevision.tsx` | 共享 Context 的其余实际 reader 都是展示标签。这些标签更新不证明任何业务请求或旧结果的资格已经更新 |

## 修复方向与必须保留的条件

1. 在现有 `decision-context` / shell state 责任内建立有效的已提交夜、精确 UTC moment、地点时区、观测目标与必要的选中地点身份；复用现有位置/偏好/选点 owner，而不是增加平行 store 或导入小程序 Context。出发地、观测点、浏览中心、已保存行程是不同含义，明确它们的引用和更新关系。
2. Tonight 不能在挂载或本地 effect 中无条件整包覆盖共享快照。有效日期选择才提交；不完整/无效草稿留在编辑器，取消恢复已提交值。各实际 query key 与 queryFn 从同一已提交快照派生；tab 已挂载时也能随 revision 更新，不能只把 `useState` 初值改成 Context 后继续分叉。
3. Sky 的合法离散跳时刻/手势释放与 Forecast 的明确时间选择提交同一 moment，连续呈现/比较可保本地预览。读取其它模型、滚动小时表、选择图层并不天然是“应用业务时刻”。现有 Source 明确要求选定时刻同步；若需要增加明确 Apply，则应记录为交互设计决定而非悄悄改变其含义。
4. Shooting 从当前被采用的观察地点、moment、timezone、target 请求条件，保持当前 profile 和拍摄版本 owner。改变来源身份后，未重算结果要拒绝冒充当前；旧条件可保留且明确 stale，不以“新标题+旧 payload”交付。
5. Spot 修复必须贯通真正地点 id 的路由、查询 key、API 权限和读取 owner。**只把 client 的 `current` 换成 B 还不够**：当前 `apps/api/src/modules/spots/poc-spot-trust-repository.ts:11–14` 在固定深圳 center 查一页再找 id，`current` 才回首项；跨区域 B 可能查不到。该 API 结果尚未在本探针真实运行，记录为已核源码限制和后续必须验证的边界。应按实际地点身份取得受权限控制的事实，不能从另一区域首项补齐。
6. 当前地点 IANA 时区均硬编码 `Asia/Shanghai`，位置存储也尚无可用时区来源；不要仅从经纬度猜一个时区。恢复/迁移保持旧缺失为 unknown 或已有明确产品默认；跨时区修复的前提是可验证的地点时区来源。UTC 日历片段不能代当地观星夜，观星夜与民用日期也不能不经规则等同。
7. Itinerary/Field/Community 等留在各实体的实际业务 owner：`apps/api/src/feature-routes.ts:20–35` 只消费 command，当前 `ItineraryWorkflowService` 的生成输入/时间线是固定模板；源代码证明它还不是共享 Context 的业务消费者，但本轮没有对持久库/重启运行验收。R20 的独立 API 真实业务持久化义务继续保留，不能用前端传参或当前 probe 宣布关闭。

修复后优先把上面共享夜链、精确时刻→摄影、选点→真实详情三个不同机制转换为正确结果回归；输入无效/取消/迟到结果/重新进入用负责它们的 owner 做必要检查。无需逐页复制组合矩阵，也无需重做当前已通过 F05/F06 的定位/启动套件。原生页面、真实导航/定位、设备性能和持久化验收仍未完成；此研究不占用它们，也不替代它们。

## 本轮源码身份

HEAD 沿主任务同 checkout；以下被观察的生产文件没有由本探针修改：

```text
decision-context.ts 6C6B47F74C23A9C837C97724E1EE6E19665D6DFA5E0E1D8FC414DC51D3C9881B
TonightScreen.tsx A18030EF0C06C5B4791763E3DB0B26B209231A5AB231734ADAAEB48F16D15234
ForecastScreen.tsx 6B75EB27BFF6E05BC017F4DC7A78E8BF2697000DFF9F4113E00234AAFA96F9BA
MapScreen.tsx D0BFFE662E22CC0E8548BE96C0DF1CC5A10945F13BFCC0D35D5AC487AE582879
SkyScreen.tsx ECB46954663E709EB05313237171384F102105FE81782F72E4F29BB35A44CBD8
ShootingScreen.tsx BE3D41E20DB04145B4DEBCB968E16452CD195AD20FA9194D20E5EF16F881E978
SpotScreen.tsx 01DE2B99ACA466DB5E5DDC56ADA446A86038C1DC25B21A4BA7D2EFEAE82A4CAB
```
