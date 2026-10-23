# R20 / F10 独立云量交付：开发实施证据

2026-10-23。本项依照唯一 [PLAN](PLAN.md#independent-cloud-delivery-and-cross-workspace-corrective-outcomes) 执行不依赖微信工具和手机的工作。独审发现的地点面板时间轴、保留覆盖重试及时间失败投影三项P2均已修复并经新独立复核；目标 Map 实机、真实 H4 供应尚待完成。不能据此关闭完整 Goal、叠层性能或设备验收。

## 原缺陷与反证

生产 `MiniappService.getMapScene` 已提前启动九点云量读取，但返回仍先等待全部地点 Context / detail / decision 四项批次；Map 也只从该 Scene 取云量。新测试 `workers/miniapp-api/src/map-cloud-delivery-http.test.ts` 经实际 Nest controller、service、Context owner、现有确定性天气适配器执行，只有无关 `computeDecision` 被有界屏障暂停：九个云量读已完成，旧 Scene HTTP 仍未返回。首次运行新接口断言得到 **404 !== 200**；这是修复前记录，不改写成通过。

修后同一对照在释放屏障之前收到独立云量 HTTP 200，九个所选小时的真实零值、后续小时 80%、实际采样 footprint、来源及 snapshot 均存在；无 spot 结果伪装。最后释放屏障，原 `/map/scene?layer=CLOUD` 仍正常 HTTP 200，保留旧受支持客户端。所有测试用自有随机 loopback 端口，完成后关闭 app/service；未接共享 API/PG、真实供应商、开发工具或手机。

最初从仓库根运行 worker 测试遇 tsx 未加载 worker decorator 配置，是 harness 入口错误；改在 `workers/miniapp-api` 运行后得到上述实际 404 反证。未把启动失败计作产品反证。

## 责任与实际消费者

- 新增兼容只读操作 `GET /v2/map/cloud`，`MapCloudRequest` 只接 Context 与真实 viewport/bounds，`MapCloudData` 为原有 Context、layer、hourly frames、forecastValidUntil、cloudSnapshot 的窄投影。生成 SDK 由现有 operation manifest 生成，保留旧 Scene 形状与路由。
- 复用现有 `map-cloud-forecast`、QWeather v1 adapter / provider cache、观测夜小时轴、原始取得时间、source-age、实际点位和缺测/零值规则。没有新供应商、付费能力、额外预取/采样预算、provider cache 或气象源回退。独立响应在异步授权检查后投影，不能因等待延长 source 有效期。
- Map 当前源文件实际调用独立 cloud query，key 不受 marker 搜索/筛选/preferences 影响；marker Scene 请求 NORMAL，仍独立计算 marker/filter/地点天气。地理云量与地点读数分别使用各自精确时刻帧，云量未返回不能伪用地点云量填图，独立云量帧也不能抹掉已取得的地点月相/天气。
- 复用 forecast-query 的 receipt clock 与过期计时，新增窄 cloud presentation policy；Map 保留的单份公开采样仍只占原 footprint，离线过期、新缺测替换、账号/reset/夜晚/图层退出退役规则保持。保留图层的 `validAt` 对齐当前选择时刻。无图形、样式或组件重设计。
- 时间尺 loading/error/重试、来源与覆盖提示改由 cloud query 负责。重试云量不等待 Scene。旧“云量 sheet 可隐藏 Scene 错误”的分支及仅断言该旧 helper 的测试被退役，实际 Map recovery 回归改为证明独立 cloud/light 不隐藏 marker Scene 恢复。
- 原请求注册表继续只管传输。新 Map cloud 使用独立 `map-cloud` 请求槽，图层关闭/页面隐藏或卸载结束该槽，Query signal 和 supersession 沿既有传输取消；清理临时发现缓存也覆盖该查询根。
- controller 沿既有 reply-close/AbortController 责任向新 cloud 和旧 Scene 传递取消；cloud 的 deadline wait 接收父 signal；旧 Scene 在 Context/detail/decision 批次边界检查并向 astronomy 传递 signal，因此取消后不开始后续批次。未把消费者取消传给共享 QWeather source 本体。

## 已执行检查

在相应 workspace 下执行 `node ../../tools/run-node.cjs --import tsx --test ...`：

1. Worker 六个文件 **17/17**：`map-cloud-delivery-http`、`map-cloud-forecast`、`map-exact-time-http`、`map-night-light-http`、`weather-source-cache`、`api-contract-route`。
   - 新增双真实 HTTP 调用，经实际 QWeather composite/cache、合成 fetch 响应共用九个上游源请求；取消一个 HTTP 后，另一个仍取得九格零值，第二读者显示九次 reuse / 零次新增 request attempt；共享上游 signal 均未取消。
   - 九地点旧 Scene 的第一批四个 decision 被暂停，取消后 reject，余下五个不会启动。
   - 既有缺测、过期、partial、坐标边界 alias、off-cadence selected instant、静态夜光隔离保持通过。
2. Mini Program 九个文件 **68/68**：`pages/map/cloud-map-consumer`、`hooks/use-forecast-query`、`services/map-cloud-presentation`、`pages/map/night-light-map-presentation`、`pages/map/map-layer-selection`、`pages/map/map-data-recovery`、`components/resource-error-notification`、`services/request-lifecycle`、`services/cache-policy`。
   - 新消费者测试提取并执行实际 Map query、API facade、投影与时间尺/重试 JSX：Scene pending 时零值和另一所选小时 80% 可用，地点读数仍为其自己的 42%；cloud query 持有自身 receipt clock，marker filters 不改 cloud key；hide/retry 到 cloud owner。
   - 这些是实际源码消费者的有界模拟，**不是完整 React/Taro 渲染或原生可见画面证据**。既有 hooks 的 server-clock 对齐、离线过期、保留 footprint/new-missing replacement 回归通过。真实 Query/Taro 传输取消回归仍使用已有测试端口。
3. `workers/miniapp-api`、`apps/wechat-miniapp`、`packages/miniapp-contracts` 的 `npm run typecheck` 均 exit 0。新 consumer test 初次 typecheck 的六处数组可能 undefined 诊断已修复后重跑通过。
4. `generate-miniapp-sdk.mjs --check` 输出 `miniapp_generated_sdk_current`；本模块 `git diff --check` 无错误（生成文件仅 Git 的 LF/CRLF 提示）。

最后两处断言强化（实际 Map cloud hook 纳入共享 forecast owner 清单、保留图层 validAt）按受影响两文件补跑 **15/15**，exit 0；不将重复数量累加成新的覆盖范围。

## 独审发现与消费者修复

首轮独审核实际worker17/17、Miniapp51/51通过，仍发现两项实际消费者P2。原源码与结果保留于仓库`tmp/r20-independent-cloud-review-20261023/consumer-probe.mjs`、`result.json`：云量pending但Scene已就绪时地点面板收到空帧且非loading/error；云量返回后其空moonPhase替代原天文帧。另保留有效旧云量时refresh失败，原`cloudFailed && !cloudTimeChoices.length`条件使唯一云重试按钮消失。

root将地点面板时间轴固定到Scene，将云量轴保在cloud owner；两者preview/commit一律传实际UTC时刻，不把一个数组的索引交给另一个数组。地图多边形与地点读数各自在其自己的帧集中按该时刻查找；缺精确帧保持缺测，不借邻近时刻。预览保存时刻身份，响应换序不改已预览时刻；已有MapTimeRuler仍在轴/Context变化时取消在途手势。时间失败重试保持原时刻和现有Context有效性检查。日期提交成功清除预览，不再留旧索引。

云量refresh失败总提供cloud.refetch入口；仍有有效覆盖时明确显示保留旧覆盖，缺数据时明确不可选时间，均不等待marker Scene。没有改布局/样式或采样/时效规则。

最终限定回归在`apps/wechat-miniapp`：cloud-map-consumer、time-context-race、time-ruler、map-time-frame、use-forecast-query、map-cloud-presentation共60/60，最后加强日期成功无失败反馈后time-context-race6/6；miniapp typecheck通过。首次typecheck指出日期提交残留旧setter，已修并复验；该中间失败不隐去。新回归执行实际Panel props/事件、cloud query/投影/重试源码，覆盖Scene先到保月相、两条不同长度/顺序轴按时刻提交和旧覆盖重试。仍是有界源执行与组件端口，非真实Taro/原生画面。

新独审核原两项修复与60项回归后又确认一项P2：`visibleTemporalFailure`仍仅按Scene帧成员资格显示云时间提交失败，云量已到而Scene pending时失败被隐藏、不能重试。root先加实际commit→failure投影→retry回归，修前确实得到null而失败；再移除无关Scene依赖，只保原Context/选择/请求代/reset和合法时刻的资格。修后两文件11/11及miniapp typecheck通过，证实第二次请求携带原精确时刻，成功撤下错误，换选择仍退休错误。未降低日期的既有合法选项资格。新的最终独审再次执行11/11并核实际资格/可见/重试路径，限定范围内未发现未解决P1/P2。三轮reviewer均已停止，没有设备或共享服务操作。

## 保留义务

- 当前开发范围及发现的消费者问题已有独立审查与修复后复核；后续目标运行时/H4及性能仍需各自实际结果，不能由代码独审替代。
- 新原生 Map 云量来源、所选小时、实际可见 coverage、native 取消/返回、loading/error 与重试的完整 target 旅程未执行。这里没有构建/刷新冻结候选，也没有将源码测试称作 UI 通过。
- 真实 QWeather 授权、实际 H4 供应/小时覆盖和设备上的请求/可见延迟保持未验。QWeather adapter 真实代码 + 合成 fetch 响应不等同真实天气供给。
- 公开缓存仍按现有 provider deadline 存活；取消单一消费者不取消其他消费者需要的读，未新建“所有 waiter 退出即强行销毁公共请求”的制度。没有改变既有 quota/TTL/采样上限。
- 该项不关闭 Map session 故障恢复、R19 真机对照、完整叠层资源/内存或 Sky time/OOM，也不关闭 F14/API 其它家族与全局 CI/交付。
