# Native 首次前台定位许可交接判别（2026-10-25）

结论：**确认一项 P2 责任缺口：把 Android 自有系统许可窗口的暂停一概当作用户放弃，会退役原定位意图；授权成功后原任务静默停在 idle。** 本次用安装包对应原 Screen 的实际组件／selector／gateway／store 交错严格复现，不是从截图直接推断。应先修许可交接的生命周期协调，复用已完成的一次原生定位与持久化 owner；没有理由重写采集方式、改用 last-known fallback或取消原有离开保护。

层叠／Sky Play 性能及相关 OOM继续后置。本次没有操作手机、ADB、IDE、构建、服务、provider、GH或远端，也没有修改产品、Root PLAN／HANDOFF／Context或 Git。

## 上游、输入与实看

已读适用 AGENTS／default Context、唯一 PLAN 的 Native／执行顺序、最新 HANDOFF、Native Screen Contract／定位 owner、Source `mobile-shell-and-preferences` 的权限要求／控制／正常与失败路径，以及既有 F05/F06 最终独审；按完整 Native interaction skill／mapping／wording和 DESIGN Native profile判别。Source `CTRL permission-step` 要求授权后显示范围并继续原任务，现 Context同时要求真正离开时退役逻辑读者；这两条都须保留，不能用取消策略的缺失替代正常工作能力。

Root提供当前安装包 APK `53960d39ea3d5e865306699e49497cd74919b996efeb6ab96a635079383cce1e`／input `3a91c623547020d7e2b8eb2a17ccd84f0f6528329e67666f274f924d86d8656a`。此 APK 的 `MobileShellScreen` 仍对应 main `b4d2654540e203ffa247e31b1cc21db70aeab4e9`；手工阶段／底栏变更没有修改本次定位处理。本代理没有重新查询设备来认证包或系统身份。

实际查看 Root 已采的三张原图，均保持在 private目录，未复制或嵌入 Git报告：

- `screen-8a29f92c-4f0f-46ae-b9b6-7bea15796001.png`：系统位置许可，可选精确／粗略、仅此次／使用时允许／拒绝。
- `screen-8c26d460-13d2-4f42-ace6-a096889e7755.png`：Root报告已选择使用时允许后的自有解释 Modal，仍无 loading／错误，仍显示允许按钮和未定位。
- `screen-748fe4da-f97e-4c62-a99e-0efb64ea79ed.png`：同候选第二次已授权点击后，按钮才进入 loading。

目录为 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/native-toolchain-20261025-192414098/native-functional-ui-53960d39/`。Root的实际系统包／same-user/task／launcher关联、FINE/COARSE granted且非 one-time读回归 Root evidence；本报告不把图片中的普通位置图标当作取得定位的证明，没有读或记录真实坐标。

## 实际责任链与竞争解释

1. 安装包对应的 b4 `MobileShellScreen.tsx:326–328` 在任意 `AppState.change(background)` 上直接 `locationSelection.cancel()`，只注释排除了 iOS `inactive`；正常 OS许可交接没有单独身份。
2. `createDeviceLocationSelection.cancel()` 清空 active、abort原 signal并把 phase置 idle。许可 Promise resolve 后 `device-location-selection.ts:46` 的 `current()` 因此为 false，在更新 permission、调用 location provider或 save之前直接返回。没有错误发生，所以画面也不会显示 provider／storage错误；后续 active不会恢复已删的意图。
3. 已安装 `expo-location@57.0.5` 的 `LocationModule.kt:173–183` 通过 permissions manager请求 FINE／COARSE，再读取权限状态。`PermissionsService.kt:296–303` 委托实际 `PermissionAwareActivity.requestPermissions`；同文件说明系统许可 dialog会使 app进入 background、返回 resume后 promise才完成。
4. 已安装 RN `ReactActivityDelegate.java:194–203,248–280`：pause交给 host；若许可结果到达时未 RESUMED，会缓存 callback，并在 onResume先恢复 host再释放 callback。`ReactDelegate.kt:152–160` 继续传递到 ReactHost／ReactInstanceManager。`AppStateModule.kt:41–49` 将 host pause发为 background、resume发为 active。Expo delegate wrapper也转发这条 pause/resume链。

[RN 0.86 AppState文档](https://reactnative.dev/docs/0.86/appstate)明确 Android background还包括自有或系统启动的临时 Activity；它不是“用户已放弃”的同义词。[Android生命周期文档](https://developer.android.com/guide/components/activities/activity-lifecycle)也区分失去前台、部分可见和完全停止。这里使用安装依赖源码决定具体回调顺序，而没有将更新版本网站推荐替换进当前项目。

因此“预期许可暂停被全局 cancel误判”在现责任上已成立。组件判别中第一轮 provider未被调用，故 provider不可用／保存失败不能解释该轮 idle。屏幕 blur、显式取消等也能合法退役请求，但 Root的这次已提供流程没有这些用户操作；现有导航 focus与 AppState仍须分别协调。**本代理没有直接抓取手机那一刻的 JS AppState／native调用 trace；不能把组件计数冒称手机调用计数。** 已安装回调链、系统窗口及同形结果足以定位本次首个修复责任，修后仍需 Root在新候选重走正常许可交接。

## 最小实际组件反例及控制

证据在 `tmp/native-permission-handoff-discrimination-20261025/`：

- 从 b4固定原 Screen及 `profile-save-attempt` 原始字节，保存 baseline与 SHA；只把相对模块绑定改到原绝对 owner／固定 snapshot，没有改业务函数体。测试复用原 `shell-startup.integration` 的 Native primitives／Expo／storage适配边界，运行真实 RuntimeRoot、Screen、permission gateway、selection、location gateway和 store。
- `component-counter-and-controls.log` 实际 **4条：1失败、3通过**。唯一失败为严格正常结果：原 permission Promise pending → background → active → granted，同一个原意图应取得／保存位置，但实际 provider **0**、location writes **0**。`component-observations.json` 还实际读到 idle允许按钮可见、没有 provider错误，和 Root帧相符。
- 三条控制分别通过：同 provider在已授权流调用并保存一次；定位获取期间真正 background退役后，迟到 fix不写；许可 Promise期间显式取消后，迟到 granted不开始定位或写入。没有让旧取消要求“为了修正常流”变为通过无效果的断言。
- 这只是合成数据／DOM替身上的真实组件接线证据，不能代替 Native像素、系统活动、GPS精度、Android/iOS资源行为或完整产品验收。

固定命令：

```text
node tools/run-node.cjs --bin vitest vitest run --config .codex/work-items/sky-map-performance-2026-10-18/tmp/native-permission-handoff-discrimination-20261025/vitest.config.mjs
```

原严格失败保留，不改产品以制造修后结果。首次运行即执行到4条真实测试；esbuild被当前 oxc取代的提示不是产品失败。所有 React／listeners在 afterEach关闭并断言清空，命令终态退出，无 listener、真实 provider或后台服务。

## 最小同 owner 修复建议与保留边界

- 在现 `device-location-selection`／permission gateway责任内区分**查询权限**和**确实等待本轮原生许可 Promise的交接**，让 Screen转交生命周期信息，而不是把任何 background直接等同 cancel。UI的宽泛 requesting目前覆盖两种阶段，不能把它整体作为豁免依据。
- 原许可交接正常恢复后，只有**当前意图仍有效、当前屏幕仍拥有任务、app已 active**才可继续同一次定位／保存；暂停期间不得开始／应用 fix。复用已有单一 native acquisition／AbortSignal读者、原始时间／精度／mock资格与原持久化规则。
- 显式关闭、手动替换、Tab／route离开、权限查询中真实后台、定位／保存阶段真实后台继续退役逻辑读者；已派发的持久写入仍按原 owner完成并保留实际结果，不能撤销已经提交的状态或冒物理请求被取消。
- **许可窗口期间的真正 Home／切其它 app是尚需明确的窄平台判别。** AppState.change本身没有背景原因；盲目“只要 requesting就永不取消”会吞掉真正离开，单独增加 active检查也不证明离开后的旧意图已被退役。安装依赖的 after-resume callback顺序可作为正常交接依据，但不能单凭它声称识别了 Home。若当前 JS owner无法区分，沿现 Native权限／Activity生命周期能力补最小有归属信号并验证；不要未经资格就拿 blur或 `OnUserLeavesActivity` 当独有原因，也不要另造通用后台／任务框架。
- 新实现至少要让原严格反例通过并保持三个控制；再补“许可交接时 Home／离开后迟到结果不得写”的一个区分性案例和正常 OS交接实机复测，所选信号先经目标平台确认。真实定位 provider能否取得样本仍是独立下一边界，不以取消策略修好冒 GPS或完整 F05完成。

直接相关文件为 `MobileShellScreen.tsx`、`device-location-selection.ts`及其既有组件／owner测试；若需交接能力由现 `native/permissions/permission-gateway.ts`窄扩展。`foreground-location-gateway`的一次原生请求寿命策略是已验证基础，不因该首个调用前缺口重做。当前另一个偏好作者正在写 Screen／preferences，Root须串行协调同文件，不能并发覆盖。

## 源输入与收尾

`baseline-source-identity.json` 保存 b4原 Screen（SHA `eebae78ba7b5ae2a7223952b454487757c3b29f3879963640b7f21206e4e4128`）／原测试／save-attempt的完整原字节身份。`control-source-identity.json`另保存11份实际 location/runtime／安装SDK源码原字节；5个产品control与 b4比较最初仅因 CRLF/LF raw不同，后续 `control-normalized-comparison.json`确认**仅换行规范化后5/5相等**，原记录和字节均保留，没有改写原失败为成功。并发偏好作者的当前 Screen不被假称冻结；判别使用独立固定 b4行为。

本次唯一写入是该任务 tmp与本报告，产品源码／Context／Root任务状态／Git均未改。没有设备、系统权限、网络服务或其它聊天资源需恢复；没有新存活子进程。全部未完义务、用户性能后置和 Native／完整Goal未完成保持。
