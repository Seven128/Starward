# Native permission Activity 事实端口独立审查（2026-10-25）

结论：**本轮新模块／typed port 的限定源码独审通过，未发现已证新增 P1/P2。** 独立执行的真实 TS 端口四条机制均通过。没有执行 Kotlin、Android 构建或目标手机流程；旧消费者尚未接线，首次许可 P2、normal/Home 信号资格、fresh GPS 与完整 Goal 均未关闭。

## 输入与范围

完整读取[作者报告](R20-NATIVE-PERMISSION-ACTIVITY-PORT-20261025.md)、[信号研究](R20-NATIVE-PERMISSION-VISIBILITY-SIGNAL-20261025.md)、[原首次许可反例](R20-NATIVE-PERMISSION-HANDOFF-DISCRIMINATION-20261025.md)，核对唯一 PLAN 的 Native foreground-permission handoff 条款、适用 AGENTS、global/default 路由、Native Screen／Source 的前台最小许可与授权后继续原任务要求、architecture assurance/lifecycle、Native interaction Skill／mapping及 DESIGN Native profile。最新性能后置与未完义务保留；不重开已选平台方案。

冻结为 `tmp/native-permission-activity-port-20261025/source-freeze.json`，**26项（8新写／18控制）**，manifest SHA256：

`dc5b8051a208afda8080ba8775c4635006f33d3ab0e43bd8abe9ab19642536f2`

开始和结束均逐件核长度／SHA一致。未改任何产品、旧调用者、偏好输入、Root PLAN／HANDOFF／Context或 Git；没有把并发偏好 Screen冒作本轮控制。

## 已核责任

- 已安装 Expo 的 `BaseAsyncFunctionComponent.runOnQueue(Queues.MAIN)` 与 `AsyncFunctionComponent` 实际转入 `appContext.mainQueue`；新 `prepare` 另检查主 Looper，只有真实当前 Activity未销毁／结束且 Lifecycle RESUMED才捕获。同步 `read` 仅读一个 `AtomicReference` 内不可变快照，不从 JSI线程直接查询 Activity／Lifecycle。
- 新 Kotlin 只跟随明确 prepare捕获的弱 Activity。pause／stop分别增加模块级计数，重复 prepare或新 Activity不重置；新 Activity获得新 id，其他 Activity的 resume不会认领旧 owner。destroy或无法资格化的 prepare清 weak owner并置 unavailable，之后旧 resume无法自动恢复该 owner。配置重建没有豁免分支。
- 快照更新与 closed／注册实例由同一锁协调；事件只提供唤醒。module销毁先发布 unavailable／closed，再通过独立 main Handler注销保存的同一 Application／callbacks并清引用，没有借用即将被 Expo `AppContext.onDestroy` 取消的 coroutine scope。main Looper拒绝 post的末端分支只执行 callback移除，不读取 Activity／Lifecycle；这些是源码边界核对，不是对目标 OEM清理行为的实际认证。
- 已安装 RN `ReactActivity` 继承 `AppCompatActivity`，其 onResume先 super再 delegate；当前 Expo 的 Module／Function／Map事件接口、可选模块加载和 EventSubscription.remove形状与新声明相符。Android module配置／namespace／package与既有 local Expo module脚手架对应。声明和本地源码对齐不等于已自动链接、编译或加载。
- gateway不存事件 payload为事实，也不缓存 prepare结果覆盖后来的 read；原生异常／非法身份计数保持 unavailable。返回快照冻结，非 Android或旧 binary缺模块不伪造身份／零 epoch。订阅移除先锁住本读者的 active，再移除原订阅；旧排队 closure亦受该锁存保护。

## 新的独立执行

证据在 `tmp/review-native-permission-activity-port-20261025/`。`port-independent.test.ts` 经真实 `modules/permission-handoff/index.ts`／`permission-handoff-gateway.ts`，只替换最底层 Expo native桥与 Platform。没有复制生产函数体、借作者17项总数代替独审或执行其冻结副本。

`independent-port.log`：**1文件4条通过，0失败**；`actual-port-observations.json`保存以下实际读回：

1. prepare仍 pending时原生事实先变为 stopped A，随后 prepare迟返旧 A基线：同步 read仍是 stopEpoch5／resumed=false；之后 native module更换为 unavailable B，旧 A基线不能覆盖新 module identity。
2. 使用带抛错 getter的旧事件 payload唤醒，只读到当前 stopped事实；退订后直接执行之前保存的排队 callback，读者不再被调用，实际 remove仅一次。这比仅在空 listener集合上发事件多验证了已排队 closure边界。
3. 实际可选模块 adapter的 native lookup／安装调用抛错，prepare／read／subscribe均不可用，没有从异常建立资格。
4. native返回带抛错字段 getter的失效对象，并且 emitter不可用，异常不逸出，三种端口结果均为 null。

命令：

```text
node tools/run-node.cjs --bin vitest vitest run --config .codex/work-items/sky-map-performance-2026-10-18/tmp/review-native-permission-activity-port-20261025/vitest.config.mjs
```

这是本地受控桥上的实际 TS端口检查；不执行 Kotlin，不证明 Android lifecycle、OS许可、真实定位、保存或物理资源退休。prepare基线允许是其执行时刻的事实；真实调用者仍必须在派发与异步边界同步 read，并比较原 module／Activity／stop／pause边界，不能把这条迟返检查误作自动业务协调已经完成。

## 保留接线与目标义务

实际 native permission Promise／去重 owner必须连同原 baseline复用，后来的逻辑读者不能通过重新 prepare洗掉旧 Home。get-status准备、显式取消、route departure、真实 stop及许可之后的新 pause继续退役；正常系统许可的排队旧 AppState事件不能误杀已恢复任务。以上仍由 Root后续串行集成及原严格反例／取消控制验证，不属于当前未接线模块的已实现结果。

Root仍需核 Android编译／自动链接／实际加载，以及同机同候选一次正常许可返回与一次实际 Home离开的区分力；若正常许可也 stop或 Home无可区分事实，保持 P2并只处理真实新缺口。无 fresh fix不能反推本信号失效，更不能被本次源码通过替换为定位成功。iOS与完整产品／Goal继续未验。

本轮仅写本报告和独审 tmp。测试命令已退出0，受控订阅已移除，无自有服务／端口／设备资源或待决外部动作；没有 Gradle／APK／ADB／手机／远端主机／Secret／Git操作，VPN和冻结代未动。`completion.json`记录终态26 pins一致及限定执行边界。
