# Native 许可交接：最小 Activity 可见性信号（2026-10-25）

结论：现有 JS／Expo 生命周期接口不足以区分这两个分支。建议在现有 Expo Modules 边界增加一个很小的 **Android 生产 adapter**，复用 Android `Application.ActivityLifecycleCallbacks` 的实际 owner Activity `onActivityStopped`，一致发布单调停止 epoch；许可前后同步读回，不依赖 JS 事件先后。它是“该 Activity 确实停止”的信号，**不是用户意图或暂停原因识别器**。本手机正常许可 sheet 是否只 pause、不 stop，仍未取得实际 Native 信号，必须先做下述资格对照；当前不能声称该条件已成立。

本次仅本地源码／Context／官方公开资料核对。承接已确认的 [首次许可交接 P2](R20-NATIVE-PERMISSION-HANDOFF-DISCRIMINATION-20261025.md)，不重跑旧反例、不改产品／配置／Root PLAN／HANDOFF／Context／Git，不碰28个冻结输入、设备、ADB、构建、服务、网络主机或 Secret。当前 Root APK build 不能被本建议追认为已包含该能力。

## 已存在能力及归属

- `apps/mobile/modules/README.md` 已把该目录定义为平台能力 Expo Modules 实现边界，JS feature 经 `src/native` typed port 消费。当前 `orientation`／`sky-ar` 是 TS adapter；唯一现有本地 Kotlin module 是 `design-evidence`。后者按 `project_context/architecture/assurance-and-lifecycle.md` 仅为会话化诊断传输，**不能复用它作为生产许可业务或生命周期事实 owner**；可以另行观察生产信号，不能依赖其 evidence session 才使功能正确。
- 已安装 Expo57：`ModuleDefinitionBuilder.kt:129–150` 的 foreground/background 是 resume/pause；`AppContext.kt:302–325` 从 `onHostResume/onHostPause` 发布。`ReactActivityLifecycleListener.java` 无 start/stop。官方亦[明确说明没有 onStart/onStop 的原因](https://docs.expo.dev/modules/android-lifecycle-listeners/#why-there-are-no-onstart-and-onstop-activity-listeners)。换用这些后台回调仍是原歧义。
- 已安装 RN0.86 `ReactActivity.java:24` 继承 `AppCompatActivity`，AndroidX `LifecycleOwner` 已可用；Expo 自己在 `AppContextActivityResultRegistry.kt:160–214,358–371` 使用 `LifecycleEventObserver` 并统一移除。因此 `LifecycleOwner.ON_STOP` 也是成熟的同边界方案，**不需要新增库**，但当前没有它的生产 JS port，仍需窄 adapter。它的 observer 增删／currentState 必须在主线程，且 ON_RESUME 在 Activity.onResume 返回后发出，可能晚于 RN 在 onResume 内释放许可 callback；若采用它，必须等待原生 resumed，不能把这段时序判成离开。[Lifecycle](https://developer.android.com/reference/androidx/lifecycle/Lifecycle)、[DefaultLifecycleObserver](https://developer.android.com/reference/androidx/lifecycle/DefaultLifecycleObserver)
- 建议只实现一种：Application 的 callbacks。它不要求修改生成的 MainActivity、不引入应用级后台框架；对已捕获 Activity 过滤即可。官方 `onActivityStopped` 对应 `super.onStop`，`onActivityResumed` 对应 `super.onResume`；本地 `ReactActivity.java:69–76` 先 super、后 delegate，而 `ReactActivityDelegate.java:198–204,248–280` 在 delegate resume 中恢复 host 并释放缓存许可结果，故其 native resumed 事实可先发布。[ActivityLifecycleCallbacks](https://developer.android.com/reference/android/app/Application.ActivityLifecycleCallbacks)
- `ProcessLifecycleOwner` 聚合所有 Activities，pause/stop 有刻意延迟且掩盖配置重建，不适合当前窄交接与短暂离开的证据；不新增该机制。[官方语义](https://developer.android.com/reference/androidx/lifecycle/ProcessLifecycleOwner)
- `OnUserLeavesActivity`／`onUserLeaveHint`、RN blur、navigation focus 都不能未经本机资格便当作许可原因或独占 Home 信号；route focus／显式关闭仍各自保留取消责任。普通 Home／不透明应用切换通常使旧 Activity 不可见，但文档不保证某个 OEM 许可界面一定保持它可见。分屏中失焦但仍可见也不等于 stop；不能把本建议泛化为所有外部切换的完备识别。[Android pause 与 stop 的区别](https://developer.android.com/guide/components/activities/activity-lifecycle#onpause)

## 最小可执行 adapter

建议 `apps/mobile/modules/permission-handoff/`：`index.ts`、`package.json`、`expo-module.config.json`、`android/build.gradle`、`android/src/main/AndroidManifest.xml`、一个 Kotlin Module。复用现有本地 Expo module 脚手架／自动链接，不增加 npm 依赖，不改 `design-evidence`。业务 typed port 放 `apps/mobile/src/native/permissions/permission-handoff-gateway.ts`，原 `permission-gateway.ts` 保持唯一实际 permission Promise／去重 owner。

仅需以下 API／事实：

1. 主线程 `prepare()`：在真实系统许可调用前注册一次 callbacks，捕获 `appContext.currentActivity` 的弱引用与单调 `activityId`；主线程确认它未 finishing/destroyed 且 lifecycle 已 RESUMED。返回 `{ moduleId, activityId, stopEpoch, pauseEpoch, resumed, available }`，缺 Activity／模块失效则不可用，不能把 null 当 epoch0。可用已安装 Expo `AsyncFunction(...).runOnQueue(Queues.MAIN)`，避免从 JSI 线程读 AndroidX lifecycle。
2. 同步 `read()`：Expo `Function` 仅读取一个 `AtomicReference`／同一锁保护的**不可变快照**，不阻塞等待 UI、不直接跨线程访问 Activity／Lifecycle，不分别读取若干未协调字段。`moduleId` 隔离 JS/native 重建；同 module 的 epoch 不在每次 prepare 或恢复时清零。该[同步 Function](https://docs.expo.dev/modules/module-api/#function)已被当前本地诊断模块使用；本次只复用技术机制。
3. callbacks 只更新已捕获的那个实际 Activity：pause → `pauseEpoch++/resumed=false`；stop → `stopEpoch++/resumed=false`；resume → `resumed=true`；destroy → 失效／新 activity generation。不要按“任意 app Activity resumed”自动换 owner；全局活动计数会把 SDK Activity 和原 permission owner 混在一起。系统 PermissionController 属另一 Application，不会作为本 app 的 Activity 被该 Application callbacks 枚举，原 app 的 pause/stop 仍会被观察。
4. 一个变化事件用于及时唤醒 JS 退役读者，携带 generation/epoch 即可；事件是提示，最终准入始终同步 `read()`。不能在事件到达时才增加 epoch。JS 订阅随 selection／Screen owner 移除。正常 AppState 的旧 background 若在恢复后才送达，要复核 native snapshot，不能不加甄别地取消已经开始的定位。
5. module 销毁先一致发布 invalid/closed，注销**同一个保存的 Application／callback 实例**；需要切主线程时用可靠 main Handler 做有限清理，并以 closed 阻止排队 prepare 在销毁后重新注册，不能把清理放进即将取消的 AppContext coroutine scope。除当前 weak Activity 外不长期持有 Activity／ReactContext。配置重建产生 stop／destroy 或新 identity时旧 intent 退役，**不通过 isChangingConfigurations 跳过，也不把新 Activity 的0值当旧 token**；新界面可显式发起新任务。这是 owner 失效，不宣称用户 Home。

`pauseEpoch` 是防止“非许可阶段快速 pause→resume 后，JS 仍没消费 background”的一个小事实计数，避免用当前 resumed 擦除既发生的暂停。它不是新任务平台；正常许可完成时可明确接受本轮无 stop 的 pause 区间，后续新增 pause 仍按原规则退役。若省略它，只读当前 resumed 会改变原非许可阶段的取消含义。

## 接回原 owner，不重做定位／持久化

- `device-location-selection.ts` 区分查询权限与**确实进入本轮原生 permission Promise**。prepare 期间仍是普通可取消准备，完成后重查 current intent／screen ownership；只在真实请求调用前开启窄 handoff。不能按 UI 宽泛 `requesting` 全程豁免。
- 原 `permission-gateway.ts` 还会复用 `foregroundRequest`。handoff baseline 应绑定**实际原生 attempt**并与其 Promise 一起复用，不能让后来 logical reader 在 Home 后重采新 epoch，将仍在途旧 attempt 洗成安全新交接。当前 intent 仍有独立 token／AbortSignal／route 资格。
- 许可 Promise 返回后，在继续前同步比较 module/activity identity、stopEpoch、native resumed 和当前逻辑 owner；同 generation 且未 stop、确已 resumed 才继续原 `foreground-location-gateway`。若 native 尚未 resumed，等实际 resume 唤醒再查，不忙等、不开始定位。stop/销毁/显式取消/route离开一旦发生即不可由后来的 active 或 granted 恢复旧 intent。
- Android 原 AppState 事件改为送交该 owner。许可交接期间 pause 可暂缓，stop 始终退役；许可后接受正常交接的 pauseEpoch，后续 pause/stop仍退役。排队事件到达时用同步最新快照与已接受边界核对；旧许可 background 不再误杀恢复后的新阶段。只在 Promise 后检查 stopEpoch却继续保留无条件 background cancel，不足以解决这一竞态。
- getFix／save 前后保留原 current/AbortSignal 检查，并在获取后应用／写入前检查 Activity token；同步快照消除“已发生 stop 但 JS 通知未到”的漏洞，不等于与未来 OS 生命周期建立原子事务，更不等于物理取消 acknowledgement。已经派发的 durable write 仍按原 owner 完成，不撤销已提交事实。iOS维持原 inactive/background规则，不通过 Android adapter 重解释。
- 预计产品文件仅上述新 module/typed port、原 permission gateway、selection、Screen 的生命周期接线及其既有 owner／组件测试；具体接线须由 Root 在当前 QuickPrefs并发作者退出及28输入解冻后串行安排。本次没有修改这些文件。

## Root 独占的一次代表资格对照

同一新 APK／同一手机／同一路由，使用可重复的首次前台许可状态，保留用户数据，不 clear app data；仅记录 module/activity identity、pause/stop epoch、resumed、permission decision和实际 acquisition/save 次数，不采坐标。两个分支组成一个有区分力实验：

1. 正常点击系统“使用时允许”并返回：确认本轮实际 native attempt 的 owner Activity **无 stop**，同 identity 恢复；原 intent 进入单一 acquisition。若 fresh fix仍不返回，单独保留已知 provider gap，不把“没有保存”反推 handoff失败或声称 F05完成。
2. 新许可 attempt仍 pending时实际 Home／切到不透明其它 app，再回到原任务并使系统结果返回：确认旧 owner已 stop／失效，晚到 granted不开始 acquisition、不写位置；后续显式新任务可按当前授权重新发起。观察原生时间与最终 read，不按 JS事件顺序判分。

**资格判定**：正常许可若也 stop，或真实 Home没有可区分 stop/owner失效，则此信号在该目标上不能独立满足两条要求；保持 P2未解决，不放宽取消、编造暂停原因或把 OnUserLeaves当兜底。届时只针对实际缺口选择下一窄信号。本报告没有执行该实验，也没有证明手机 permission sheet 的 onStop行为。

已读取本任务相关 AGENTS/default Context、唯一 PLAN 的 Native继续／性能后置范围、Native Screen/许可 Source、最新 interaction Skill与Native mapping；重用定位／存储既有基础。没有新后台进程或需恢复资源。唯一写入为本报告。
