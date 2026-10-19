# 时间尺首次原生定位独立审查

2026-10-19；审查者 `review_ruler_initial_native_admission`。范围是当前首次定位修复及其共享消费者的软件责任，未操作设备、IDE、ADB、feedback/session、服务、预览、构建或 Git 提交；未改 PLAN/HANDOFF、builder/probe 或冻结 r5 产物。

**结论：发现并修复一项 P2，当前审查范围未留其它已知 P1/P2。软件检查通过；新的完整候选、原生首显及动态效果尚未验证。** 原 11 文件实现独审与本审查者写的 P2 修补/自测分开理解，不将补丁自测称为第二位审查者复核。

## 依据及原实现评估

读取当前 AGENTS、development skill/完整 performance-investigation 方法、交互 skill、global/architecture/相关 feedback 边界、现行 PLAN/HANDOFF 和 Sky 合同，保持同一方案。用户已排除的无障碍专项未重新引入。读取采用 HTML `5385664345158066168` 的受影响时间/取消/应用与最终 motion 覆盖，核 SHA `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`，并实看原 `adopted-stitch-render.png`。未改资源或采用范围。

输入冻结证据 `tmp/r5-before-countercheck/verification.json` SHA `28b4cc901eb7843012ab8b6d8f980745db3bf526c4921912fa8e0ed25c7a3fb8`；原始失败由 R17-A1-R5-ENTRY-RESULT 拥有，未把其最终对齐 PNG 当入场成功。

独立追踪当前 page → time motion/layout → OrientationTimeRuler → native position/layout/settlement。移除 Sky 声明式 scrollLeft/scrollWithAnimation 后，程序定位归原 native owner；透明 unscaled 准备与 `.76 → 1` 中心 scale/fade 分开。读回准入检查实际 axis 宽度，早到但有效的旧 offset 保持 pending，缺 node/offset 有限重试/可恢复状态，六字段保留。目标变化、手势接管、closing/hide/unmount 的 revision/identity guards 继续退休回调。nextTick、native 返回、offset 与 transition 回调均未当作物理呈现时钟。

核对共享消费者：原 native move 的默认非动画语义与 settle 保持，MapTimeRuler 调用兼容；search/object/layers 的 motion 使用默认 prepared=true，原 closing reverse、inactive 资源边界与 outside-tap 责任保持。实际 Taro 4.2.1 `types/api/ui/scroll.d.ts` 声明 `scrollTo({left, animated})`，这里只核 API 形状，不从类型推定 Android 合成完成。

## P2：旧安装窗口能提前认证新 rows（已修）

新 rows 的 pendingAlignment 建立后，其 native update/move 仍排在下一 nextTick。旧 onScroll 若恰好报出相同索引的 offset，可触发一次真实 offset query；该查询仍可能读到旧安装窗口。原 observePosition 只核逻辑 row identity/revision，因两窗口同为 index33、相同 cadence/target，会把新 rows 提前设为 visible。快速 A→B→A 时，保留的 nativeRows=A 还会使 A 跳过其最新 child-update 边界。这不是把 onScroll 本身当完成；补一次读回仍缺原生安装窗口的关联。

已在 `spot-sky-page.tsx:803` 的 rowIdentity 变化处立即退休 nativeRows 标记；`observePosition:873` 与 `readPendingPosition:891` 均要求 pending.rows===nativeRows.current。root 随后复核指出 render→passive effect 之间同一缺口的分支：A→B→A 时旧 alignedRows 可能仍为 A。已独立确认仅前两条修复时仍会提前 visible，故 `ticksVisible:1029` 也直接要求 nativeRows===rowIdentity。原定位分派只有跨过当前 child-update 边界后才设置这个标记，后续仍须实际 offset 满足实测轴判据才能显示刻度。它不将 nextTick 当已绘，不新增时间 writer、offset 补偿、timer/polling 或逐帧查询。

只改上述生产文件与 `orientation-time-ruler-window.test.ts` 两份。新增真实 native/layout owner 回归：旧安装 offset 不得准入未安装替换；未安装 A→B→A 不得复用旧 A 安装；真实 component render 在 passive effects 之前也不能显示退休刻度。fixture 将一次 render 与 effects 分开供第三反例调用，没有执行伪造业务 handler。当前命令+offset 到达后仍能正常恢复，不把隐藏作为永久成功。

## 独立反例与检查

- `tmp/ruler-initial-admission-independent.mts` 使用既有 fixture 的 hook/native 边界模型和实际 component/native/layout/settlement；刺激及业务断言由本审查者另写，第三情形由 root 复核提出。`--before-review-fix` 仅在内存撤销本补丁，恢复后的 component normalized-LF SHA 严格等于冻结 `507d6534fa43c8904f442817e7499463e342f5b146c600d2e1ddcabdb30551c6`。三项均在业务断言失败（错误 visible、错误提前 node query）；当前三项通过。`--before-render-guard` 保留前两条修复、仅撤销 visibility gate，恢复 SHA 严格等于该中间源 `ca8b9f767e39c11b883ec466f323647c2f9978e2ee4d58bbd35cba77ab4c6de1`，前两项通过/第三项业务失败。没有用缺符号或 fixture 错误充当反例。
- 上述三项也进入正式 window 回归，window **19/19**。
- 当前 component/native/layout/motion 五组及 MapTimeRuler 代表消费者合计 **77/77**（原相关49+本次3+Map25），无 fail/skip。命令为 `node tools/run-node.cjs --import tsx --test` 加这六个 test 文件；最后日志 `tmp/ruler-initial-admission-final-tests.log`。
- 当前 miniapp TypeScript 5.9.3 strict/noEmit：exit0、0诊断；命令 `node tools/run-node.cjs apps/wechat-miniapp/node_modules/typescript/lib/tsc.js --noEmit -p apps/wechat-miniapp/tsconfig.json`，最后日志 `tmp/ruler-initial-admission-final-strict.log` 为0字节。
- 受影响文件 `git diff --check` exit0；spot TSX 原有 CRLF→LF 提示不当行为失败。未重跑全仓/完整产品套件。

以上是源码/受控异步模型证据，不替代 Taro 实际 setData、透明隐藏 ScrollView 的 native node/geometry 可读性、合成/物理帧或手感证据。

## 当前源码绑定

路径相对于 `apps/wechat-miniapp/src/`。SHA 均为原始字节；除 spot TSX 外，normalized-LF SHA 与原始 SHA 相同。与输入冻结相比仅 spot TSX/window test 两份改变，其余9份逐字一致。

| 文件 | 字节 | SHA256 |
| --- | ---: | --- |
| components/ruler-scroll-position.ts | 3245 | 1c1d714f3d8f8b4c7fc55003986050ca69141f94356e22126d09427c58266a56 |
| components/ruler-scroll-position.test.ts | 7347 | bd947585515ee6e988bab184cb0c37c34d3d0f28ca886afe99ce98379650f46d |
| features/sky/spot-sky-page.tsx | 244989 | 5daa33fe6139821a94ced24397a2798f1267e045797c787153497dd99ece6799 |
| features/sky/spot-sky-page.scss | 71121 | 8dc35babc64ed187b3cdb4bb57647c4032a4647d88f952ced28713e59deadd02 |
| features/sky/orientation-ruler-layout.ts | 3792 | c77be39c294f7b8af504aba4de179902053b433a3c7af2f18017cc621baba490 |
| features/sky/orientation-ruler-layout.test.ts | 4488 | 6fd4b4a2e8a39275dbaeeaa5e3a4348c02fa52fea2022cafdd370c49d794b714 |
| features/sky/orientation-time-ruler-window.test.ts | 31989 | 833a43c57f0f3db14477afb644512617dfcfca7cc727ce500f399c9ba3ec01c5 |
| features/sky/orientation-time-ruler.test.ts | 10254 | f595c9aa487e3c48268e4deba111202909d05f19352e6c822652666c95b3797d |
| features/sky/sky-overlay-motion.tsx | 6119 | 250c0d08ac0db4932ba6a3e90038f53573d43370462c244ce502c6fd638ea2e7 |
| features/sky/sky-overlay-motion.scss | 3087 | 58d9ffc35b88b55e45abc7b13d08edfb016953463bde73e8b7f8989619aa7fc7 |
| features/sky/sky-overlay-motion.test.ts | 19830 | d3e3c58f93eee1d4423fa103f9510d4ffedf7b38d581ca7a36966dae3e63d044 |

spot TSX normalized-LF SHA：`d4cd87283e34a54648afbae0db738ee6bea66f52b324fb4ab8a3fc624348ea39`。

## 剩余实际 native 义务

新完整候选需观察第一可见所选刻线及稳定尾段，核透明准备中真实 geometry/offset 能否工作、揭示时是否越轴；复核跨日/取消、手动慢拖/惯性/重抓及受影响 resize/隐藏恢复。r5 失败和 r4 跨日/取消有限改善各保原范围。复用共同机制与已有有效证据，不要求再采相同 r5 trace，也不将软件准入当完整设计一致性或物理性能通过。Android/iOS、A 手动 input→firstAccepted、B surviving allocation/paused drain/退出、Terrain 及完整 Goal 的其它未验义务均保留。
