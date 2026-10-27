# Native 前台许可 Activity 事实端口（2026-10-25）

结论：已实现 **Android 小生产 Expo module 与 typed gateway 的新文件基础**；局部端口 17 项与三个新 TS 文件严格检查通过。**尚未接入实际 permission attempt／selection／Screen，未编译 Android，未进行目标手机 normal/Home 资格对照，因此首次授权 P2、fresh GPS 与完整 Goal 都未关闭。** 本报告是作者自审与限定执行记录，独立审查仍由 Root 后续安排。

## 责任与实现

承接同一 PLAN 的 Native foreground-permission handoff 条款及[已证反例](R20-NATIVE-PERMISSION-HANDOFF-DISCRIMINATION-20261025.md)，直接复用[已选窄信号研究](R20-NATIVE-PERMISSION-VISIBILITY-SIGNAL-20261025.md)。按适用 AGENTS、global/default 路由、Native Source permission-minimization／permission-step、Screen 定位合同、architecture assurance/lifecycle、Native interaction Skill／mapping及 DESIGN profile处理；本次没有新 UI、依赖、系统权限或业务持久化实现。

新文件仅在 `apps/mobile/modules/permission-handoff/**` 和 `apps/mobile/src/native/permissions/permission-handoff-gateway{,.test}.ts`，共8份产品／回归输入：

- Kotlin module 通过 `Application.ActivityLifecycleCallbacks` 观察 prepare 明确捕获的 Activity；只持弱 Activity 引用，不自动认领其它 Activity 的 resume。module UUID 与单调 activityId区分模块／Activity；pauseEpoch／stopEpoch在重复 prepare、新 Activity和恢复时都不清零。
- `prepare()` 使用已安装 Expo57 的 `AsyncFunction(...).runOnQueue(Queues.MAIN)`；仅在当前 Activity有效且 `LifecycleOwner` 已 RESUMED时资格化。不能确认时发布 unavailable、清除旧 weak owner；之后的 resume不自动重获该旧 owner，下一次明确 prepare取得新身份。
- 同步 `read()` 只读取 `AtomicReference` 中一个不可变 snapshot，再投影为 map；不在 JSI路径跨线程访问 Activity／Lifecycle。事实为 `{ moduleId, activityId, pauseEpoch, stopEpoch, resumed, available }`，未知 Activity保持 null，不使用 id0替代。
- pause／stop／resume／destroy在 callback发生时同步更新 snapshot；事件 `onActivityVisibility` 只唤醒 JS。端口不消费事件 payload更新任何事实，也不判定暂停原因。配置重建／销毁使旧 owner unavailable；新 prepare身份不同。
- OnDestroy先在同一锁内发布 closed／unavailable，使排队 prepare无法再次注册；经独立 main Handler注销保存的同一 Application／callback实例并清 weak ref。若主 Looper已退出、拒绝 post，仅同步执行 callback-list移除，不触碰 Activity／Lifecycle；[AOSP Android14 Application 实现](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android14-release/core/java/android/app/Application.java)的注册／注销列表均有同步保护。这不代替本机 OEM运行资格。
- JS gateway验证完整身份、boolean与非负安全整数计数，返回冻结对象；原生缺失、异常或畸形读回均为 null／unavailable。其它平台不合成 Android事实。订阅按 owner显式移除且幂等；旧排队事件在移除后不调用读者。

模块通过现有 Expo local-module目录结构自动链接声明，不修改 app.json、依赖清单或 lockfile；没有写生成 Android工程、design-evidence、已有 permission gateway、device-location-selection、MobileShellScreen、偏好或存储文件。此处同步事件机制独立于诊断会话，diagnostic transport不是生产业务 owner。

## Root 接线接口与边界

`expoPermissionActivityGateway`／`PermissionActivityGateway` 暴露：

```ts
prepare(): Promise<PermissionActivitySnapshot | null>;
read(): PermissionActivitySnapshot | null;
subscribe(wake: () => void): (() => void) | null;
```

subscribe返回 null表示无法订阅，不能冒作完整监视成立。prepare返回值只是其执行时捕获的 baseline；真正 native permission调用前以及异步结果／定位／应用边界必须同步 read核对，不把 Promise传回 JS之前发生的 stop漏掉。

原 `permission-gateway.ts` 仍是唯一实际权限 Promise／去重 owner。Root后续接线必须让**实际原生 attempt与原 baseline一起共享**；新逻辑 reader不能重采 baseline洗掉旧 attempt已发生的 Home。当前 intent／AbortSignal／route资格、get-status准备阶段取消、明确关闭、真实 stop以及许可之后的新 pause均仍由原 owner处理。此端口没有实现这些消费政策，没有资格让所有 requesting背景一律豁免。

正常许可 sheet是否仅 pause而不 stop，是本能力的目标前提。Root同一手机／同一路由的一次 normal返回与一次实际 Home离开对照仍必需；若两条没有区分力，保持 P2并只选择实际新缺口的窄信号。无 fresh fix不能反推本信号失效，也不能冒称定位成功。

## 检查与原件

本轮 freeze为 `tmp/native-permission-activity-port-20261025/source-freeze.json`，**26项（8新写／18 unchanged-control）**，SHA256：

`dc5b8051a208afda8080ba8775c4635006f33d3ab0e43bd8abe9ab19642536f2`

逐件保存 raw字节、长度与SHA；controls包括既有模块脚手架／permission／selection／location与相关安装 Expo API源码，没有把并发偏好作者的 Screen／28pins冒作本轮冻结控制。

- `gateway-focused-source-only.log`：原 `apps/mobile/src/native/permissions/permission-handoff-gateway.test.ts` **1文件17项通过**。覆盖事实不重置／不可变读回、事件只唤醒且旧 payload不覆盖当前事实、订阅移除、缺失／非法身份与计数、native异常以及非 Android不可用。Native桥是最底层合成替身；它不执行 Kotlin、不证明 Android生命周期或真实许可／GPS业务。
- `gateway-typecheck-final.log`：三个新 TS文件，使用现有TypeScript、strict、bundler resolution、skipLibCheck，**退出0**。这是局部检查，不是全 mobile类型通过。
- 原 `gateway-typecheck.log` 退出2保留：安装 Expo57所导出的 `NativeModule<T>` 实际是构造器别名，不能直接作 instance事件接口；已按其 documented runtime形状定义窄结构接口，不使用 ts-ignore／改第三方文件。现有 design-evidence亦通过独立结构投影接事件，此次没有改它。
- `gateway-focused-final.log` 在raw副本落地后被 Vitest filter同时发现原测试和冻结副本，执行2文件34项；它只是一条重复发现记录，**不计作额外覆盖或相加总数**。随后加 `--exclude '**/.codex/**'`，上述原路径1文件17项成立，旧日志保留。

固定源文件命令：

```text
node tools/run-node.cjs --bin vitest vitest run apps/mobile/src/native/permissions/permission-handoff-gateway.test.ts --exclude '**/.codex/**'
node tools/run-node.cjs --bin typescript tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --skipLibCheck --esModuleInterop --jsx react-jsx --types node,react --ignoreConfig apps/mobile/modules/permission-handoff/index.ts apps/mobile/src/native/permissions/permission-handoff-gateway.ts apps/mobile/src/native/permissions/permission-handoff-gateway.test.ts
```

没有启动服务／设备／ADB／构建／provider／远端／Secret／Git操作，VPN／防火墙和性能冻结代未动。测试进程均已退出；所有测试订阅已移除。实际 Android编译／自动链接、正常授权与 Home资格、旧消费者接线与原反例／取消控制、fresh位置与保存、iOS和完整 Goal仍未完成。Root后续依真实结果决定准入；本基础不改变两类性能后置。
