# R20 / F09 — Sky 手动连续编辑与最终目标查询

## 范围与结论

沿唯一 PLAN 的 Refactor 3 time-policy 修复，以及 REVIEW-RECONCILIATION 的 F09。代码已把六字段长按与时间尺接入同一时间意图，合成隔离输入下的实际控件、页面查询表达式、生产 QueryClient/useResourceQuery 和 TanStack QueryObserver 行为已通过有界验证。首轮独审发现的跨Context长按/ABA草稿问题已修，新的独立复核未发现该范围未解决P1/P2。当前是软件行为证据；未执行微信开发者工具、真机、原生画面或性能验收。

这项修复不解释正常 Play OOM，不重开 R27，不改变星表、星等、几何算法、帧输入结构、Canvas 或影像供应。整体 Goal 和其他 Refactor 3 义务继续开放。

## 实际失败与修复

修前先加入 `sky-time-query.test.ts` 的行为反例，使用原 SkyTimeControls、原页面 fineTargetBinding/fineTarget 表达式及生产 QueryClient/useResourceQuery，运输端返回隔离合成目标。一次 5 步秒长按的 5 个精确预览分别触发：

```text
2026-10-16T12:00:01.123Z
2026-10-16T12:00:02.123Z
2026-10-16T12:00:03.123Z
2026-10-16T12:00:04.123Z
2026-10-16T12:00:05.123Z
```

`intermediate held steps are not settled target demand` 断言实际失败，exit 1。不是根据源码计数或外部“120 Query”推断。本机反例只建立这个请求机制，不建立手机耗时、保留内存或 OOM 因果。

修后相同反例保留全部 5 个带毫秒的预览，长按期间目标补充请求为 0，释放后只请求最后的 `.05.123Z`，并检查返回目标内容确实对应这个最后时刻。普通独立 click 仍只有一步，触摸产生的兼容 click 不重复执行。

## 责任与恢复

- `sky-observation-time.ts` 继续拥有唯一公开 Sky 时间意图。增加 `ruler | fields` 两类连续编辑来源，各自开始/结束，任何一个来源仍活跃就不产生 settled-target demand；一个控件的清理不能清除另一个控件。preview 保精确时刻；Context 重新绑定、cancel、hide、显式 Play 等原生命周期撤销连续编辑。
- `sky-time-controls.tsx` 在原有有限 repeat owner 开始前发布 fields 编辑状态；release、touchcancel、移出、hide、关闭、失效和 unmount 通过同一个 stop 结束。失败/到达未来时间边界也结束 repeat。手指取消仍沿既有“停止重复，保最后合法预览”语义；取消披露/公共预览仍由原页面取消事务恢复已提交时刻。
- `spot-sky-page.tsx` 将原 ruler settlement 与 fields 接到该时间 owner。保留既有 Context/current/retirable fence、Apply 与取消语义，不新增另一套时钟。实时读取所有权与 editing/at/Play intent，使排队在 React passive effect 后才安装的旧查询不能晚于新输入发出。
- `sky-time-target-query.ts` 是页面和 `sky/sources/target-sources.tsx` 的共同查询选项 owner；保留原 `skyTargetInstantQueryKey` 和 `getSkyTargetInstant`/响应验证责任。请求前核实时资格；已发出的同键工作由 Query signal 管生命周期，不能只因发起页面隐藏而取消仍被 Sources 使用的响应。隐藏或失效的消费者释放原 key 的订阅；不能仅 `enabled=false` 而把旧 key 永久作为 mounted observer 持有。
- Sources 在 native hide 当下撤销 visible ref，在实时 store 核 Context；重试继续复用原 source-recovery owner。未知或失效来源不显示成真实零值或另一目标。
- 几何供应、精确时间预览和原跨窗口恢复未改变；没有把中间目标补充查询的抑制扩张到 BSC、已加载 SAO 或几何请求。

## 局部保留策略及实测

沿既有 60 秒 staleTime，将这个 exact-instant family 的 inactive gcTime 同样设为 60 秒：已经不再新鲜的、没有任何 reader 的历史精确时刻不另保留 30 分钟。来源页真正挂载时由 Query 的 observer 生命周期继续持有当前结果，不以阅读耗时强制清空。全局 gcTime 保持原值。

依据：[TanStack Query 官方 useQuery 语义](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useQuery)说明不同消费者的同一 query 采用最长 gcTime，因此只改 Sky 不足够。实际安装版本为 `5.90.21`，本轮使用真实 QueryClient/QueryObserver 验证，而非仅套用文档。

有界控制结果：

| 机制 | 实际结果 |
| --- | --- |
| Page 完成 → 卸载订阅 → 30 秒后 Sources | 同一 query 的完整结果复用，无重复请求；Sources 不能把 gcTime 提升回全局值 |
| Sources 已打开后再经过 90 秒 | 当前结果仍在，不因 inactive 保留期限删除正在阅读的数据 |
| 最后 reader 离开后 59,999 / 60,000 ms | 前者保留，后者真实 Query cache 中消失 |
| 过期后重开同一来源 | 新请求取得该精确时刻的新目标内容 |
| Page 发起 → Sources 同键加入 → Page 退休 | 单一在途工作保持，Sources 读到最终结果 |
| 最后 reader 取消、迟到返回 | 原 signal abort，迟到结果不进入已退休 query |
| 原 A observer effect 排队 → B 意图 → A | 旧 effect 不发 A，新 A 可以正常请求；权限/Context 失效与手动 retry 走相同 live fence |

这些 30 秒/90 秒是验证导航间隙和长期挂载两种机制的合成时钟点，不是产品测得的典型阅读时长或新性能阈值。实际无 observer 的期限由既有查询新鲜度确定。

## 已执行验证

从仓库根目录执行的 12 个相关测试文件先得到 97 个通过和 2 个文件启动失败；失败是根目录 tsx 未装载小程序 `@/` 路径映射（`@/utils` 无法解析），不是业务断言失败。按小程序现有脚本工作目录重跑这两个文件，33/33 通过。12 文件的有效行为结果共 130 个通过，启动失败历史不删除。

```powershell
# 工作目录：apps/wechat-miniapp
node ../../tools/run-node.cjs --import tsx --test `
  src/features/sky/sky-time-query.test.ts `
  src/features/sky/sky-time-input.test.ts `
  src/features/sky/sky-observation-time.test.ts `
  src/features/sky/sky-overlay-motion.test.ts `
  src/features/sky/orientation-time-ruler.test.ts `
  src/features/sky/orientation-time-ruler-window.test.ts `
  src/features/sky/use-sky-time-geometry.test.ts `
  src/features/sky/sky-page-action-ownership.test.ts `
  src/features/sky/sky-time-commit-continuity.test.ts `
  src/features/sky/sky-route-date-recovery.test.ts `
  src/features/sky/sky-time-frame.test.ts `
  src/sky/sources/target-sources.test.ts
```

上面列的是正确工作目录下可复现的完整文件集；本轮实际拆为首次根目录批次和两个失败入口的定向恢复，未为凑“一次全绿”重跑已经通过的文件。

复用既有 `sky-stellar-query.test.ts`、`sky-full-sphere.test.ts`、`sky-star-draw-preparation.test.ts` 再通过 16 个测试。其中最后一组实际载入完整出版 BSC（8,404 行）和当前 SAO 文件（准入超过 100 个 tile、2,000 行），在原 Scene/精确时刻/拾取/来源到达责任验证，不用空星图替代工作负载；这些是软件回归，未测本轮原生性能。

`node ../../tools/run-node.cjs ./node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json` 最终 exit 0。新增测试的一个 `exactOptionalPropertyTypes` signal 声明错误曾使检查失败，已修正；没有放宽 tsconfig。`git diff --check` exit 0。

所有测试以隔离合成时间/Context 和现有已准备目录文件为输入，未触碰私有数据库、Heap、手机、IDE、共享 API/PG/bridge/VPN 或冻结 gen34；未上传数据。

## 未验与资源读取缺口

- 阅读了 Mini Program/UI skill、性能方法、当前 PLAN/REVIEW F09、相关时间与来源 Context 和 DESIGN profile。当前采用资源指向 Stitch `5385664345158066168`。工具发现未暴露 Stitch 读取操作；只读 Chrome 打开准确节点后持续仅有空 main/iframe，截图为应用空壳，未能读取真实采用画面/完整交互源。临时页已关闭；未重建仓库设计镜像。此次没有布局/样式改动，也不将文字合同当成已看过画面。
- 尚未执行物理长按、原生 scroll/Back/触摸取消、Sources 真实导航、帧一致性与完整星图真机性能比较；软件控件/Query 通过不能代替这些证据。
- 正常 Play OOM、已停止 R27 调查、其余 Sky frame/resource 重构与完整 Goal 均未完成或重新验证。

## 独审 P2：跨 Context 长按退休修复（2026-10-24）

独审发现一个实际失败顺序：Context 1 按住秒箭头后，时间 owner 已绑定 Context 2 并清空 `editing`；控件重新渲染仍为 active，旧 380 ms repeat 随后从 `live.current` 取得 Context 2 的 `current/onPreview`，在没有新触摸时推进新时刻，并可能产生中间 settled-target 查询。旧 stop 也从 live ref 取 cleanup，不能证明清理的是原交互。

先将该顺序加入真实 `SkyTimeControls` 控件 harness、生产页面字段回调和真实 `createSkyObservationTime` 的回归，修前实际 exit 1：预期 Context 2 保持 `2026-10-16T12:00:20.123Z`，实际成为 `2026-10-16T12:00:21.123Z`。这不是历史 tmp 输出或源码计数。修复后的同一回归覆盖先 bind / 新 render / 旧 timer、A→B→A、React 尚未看到 ABA 就触发的旧 timer、cancel、hide 和权限失效；恢复资格不会复活旧长按，新的触摸仍能正常前进一步并取消。

修复责任：

- 时间 owner 的 `editingGeneration` 随 Context/已提交时刻替换、cancel、活动编辑 hide 和显式 Play 退休。合法精确预览、同 Context 几何供给更新及另一编辑来源的普通结束不改变代次，不另建时间或 Context owner。
- 一次 hold 捕获原始 `current`、专用 `editingCurrent`、预览与编辑清理回调；新 render、每次 repeat 和迟到测量都核对原归属。stop 只调用原回调，页面再核原编辑代次，旧 cleanup 无权撤回替换 Context 或 ABA 后的新编辑。
- 同一代次也约束控件草稿。补验曾实际发现：ABA 后外部 `at` 字符串相同，旧局部草稿仍保留先前一步，新触摸结果为 `.02.123Z` 而非 `.01.123Z`。现按编辑代次清理草稿，不能只依赖 `at` 的值变化。连续编辑资格与普通 Play/Pause 的当前态分开，Play 后 React 尚未重渲染时第二次点击仍可暂停。
- 没有布局、样式、Canvas、renderer、星表或 OOM 诊断变更。复用既有采用资源与上文资源读取缺口，不将软件检查写成原生外观通过。

验证途中一次相关 7 文件批次为 83/85：最初让无编辑的 hide 也替换 snapshot，破坏两项既有固定/预览态幂等断言。已恢复无活动编辑时的原行为，未弱化断言；后续相关 3 文件 45/45。新增 ABA 新触摸断言也保留，其初次失败已按上面草稿问题修复。

最终在当前 workspace 的 `apps/wechat-miniapp` 执行以下 6 文件，**66/66 通过，exit 0**（包含真实 QueryClient/QueryObserver 的最终目标及 Sources 共享/退休交接，不叠加重复批次充当更多验收）：

```powershell
node ../../tools/run-node.cjs --import tsx --test `
  src/features/sky/sky-time-query.test.ts `
  src/features/sky/sky-time-input.test.ts `
  src/features/sky/sky-observation-time.test.ts `
  src/features/sky/sky-overlay-motion.test.ts `
  src/features/sky/sky-page-action-ownership.test.ts `
  src/features/sky/sky-route-date-recovery.test.ts
```

完整小程序 `tsc --noEmit -p tsconfig.json` exit 0。新建独立reviewer实际复跑上述6文件66/66，确认旧timer与cleanup不能推进或结束新编辑、ABA后新触摸正常一步、普通快速Play/Pause保持，限定范围未发现未解决P1/P2；实现与复核代理均已结束。当前只关闭上述软件反例及代码审查，不将采用资源实际画面/完整源、原生触摸/scroll/Back、设备、完整星图性能或正常 Play OOM 标为通过。未操作 IDE、手机、ADB、共享 API/PG/bridge/VPN 或冻结构建，未上传数据，未重开 R27。
