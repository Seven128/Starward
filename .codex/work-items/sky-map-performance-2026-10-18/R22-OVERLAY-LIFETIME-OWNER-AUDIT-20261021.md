# r22 三叠层资源 owner 离线审阅

2026-10-21。复用当前 dirty checkout、PLAN/HANDOFF、Map 叠层 Context、r20 跨覆盖实录结论以及同 ID／受控退休独审。本次只新增此分析文件；没有修改生产或测试，没有设备、IDE、服务、构建、Git 或上传操作。没有重复既有九轮 native remove 失败恢复反例。

**发现一个可以独立修复的 P2：空闲栅格文件的一次临时 unlink 失败被永久排除出预算回收候选，普通重试不能恢复这个缓存名额。** 它与原生 remove 未确认时应保留的 pin 是不同责任，不需要等待 Heap 对照。另确认永久 native pending 的恢复仍未闭合，但不能以 JS 超时或 Map 换代冒充原生退休。

## P2：删除接口恢复后，空闲失败文件仍不能参与预算回收

责任：[raster-image-resources.ts](../../../apps/wechat-miniapp/src/services/raster-image-resources.ts) 第 73、76–83、166 行；消费者是地形和年度光害共用的 `mapRasterFiles`，不是云量 polygons。

`remove()` 失败保留实际文件并置 `cleanupFailed=true`，这部分是正确的记账。问题是 `makeRoom()` 此后永久过滤该标记，既没有每次新申请的有限重试，也没有生产 UI 可调用的清理恢复入口。`useRasterImage.retryImage()` 只 invalidates 当前失败的 imageKey；若新图还没有取得预算，该 key 根本不在资源表中，无法处理此前空闲文件的失败。当前生产对 `mapRasterFiles` 的调用只有 acquire、invalidate 和 coordinator 的 retainPath，没有 close；已有单测的第二次 close 能删除旧文件，但 close 同时永久关闭 owner，不是持续使用中的恢复办法。

实际最小反例使用当前真实 `createRasterImageResources`，经 `node --import tsx --input-type=module` 运行；adapter 只处理内存字符串，无真实下载、文件读写或设备效果。用两项预算隔离一个失败空闲文件和一个合法 pin，文件均为合成 1 B：

1. A 下载就绪并释放 reader，成为空闲缓存。
2. B 下载就绪、取得 native pin 并释放 reader。
3. 新申请 C 需要一个名额；A 的 unlink 仅失败一次，C 返回 `raster_image_budget_busy`。
4. adapter 现已恢复正常，再申请 C；仍立即 busy，甚至没有再调用 unlink。
5. 释放 B 的 pin 后再申请 C，会删掉 B 而非恢复 A；A 的失败名额继续存在。

读回如下，`removals` 是 adapter 实际被调用次数，`nativePins` 来自真实 owner：

| 窗口 | entries | readyBytes | nativePins | failedRemovals | removals | 结果 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 一次 unlink 失败后 | 2 | 2 | 1 | 1 | 1 | C: budget_busy |
| 接口已恢复后的 C 重试 | 2 | 2 | 1 | 1 | 1 | C: budget_busy |
| 释放 B 并再申请 C | 2 | 2 | 0 | 1 | 2 | 只删 B，A 仍占位 |
| 实验结束 close | 0 | 0 | 0 | 0 | — | 全部回收 |

生产采用八文件／16 MiB ready 字节／两下载并发；本例缩小名额只隔离同一选择规则，没有改变原生语义。一次失败会损失一个可回收名额，重复独立失败可以耗尽可用名额；不能将此夸大为已证的无限 native/GPU 内存或本机闪退原因。尚无实际手机 unlink 失败记录，产品修复仍应与目标资源结果分开。

建议在**同一个 makeRoom owner**内修复：每次新的预算申请可有限重试以前失败、当前无 readers/pins、未在删除中的空闲条目；本次每条至多尝试一次，失败保实际文件、字节和责任，再考察其他可回收条目，耗尽后才返回 busy。保原串行 mutation、alias、pin 和读者保护，不扩大预算、不轮询、不把失败当删除成功，也不借 close 重启全局 owner。必要回归可直接取上述行为：修前恢复后的第二次申请仍失败，修后删除 A 后成功；持续 unlink 失败仍有界拒绝，B pin 始终保护文件。

## 已知 native pending 缺口被进一步定位

这不是另一个已被普通失败重试覆盖的案例：

- `map-ground-overlay.ts:56` 的十秒 timeout 只结束 Promise 等待；实际 callback 才会清除 `slot.operation`。
- 若 callback 永久不回，`:93` 的 `remove()` 在发送新原生命令前拒绝，保留原 ID 和文件，这是必要的保守保护。
- `suspend()` 因剩余文件返回 `complete:false`；`index.tsx:2004–2017` 的 `retryNativeMap()` 又要求 suspend complete 才执行 `nativeMap.retry()`。
- 因而当前“重新加载地图”在这条分支中不会实际重建 Map；重试只能等待原 callback 终于返回。普通 remove fail 会清除 operation，仍可重试，二者不可混称。

这是代码可见的恢复闭环缺口，未证明本次真实手机曾走到永久 pending。受控退出修复正确避免了丢弃未清完 owner，但没有建立“命令永不确认”时的安全销毁边界。不能简单 finally unpin、清空 operation、放行 reload 或重用 ID。先需要既有 Map owner 的真实实例退休资格和晚到命令隔离；`nativeMap.isCurrent=false`、React cleanup、新 Map onUpdated 都不单独证明旧 native 对象已不再消费文件。

外部无条件 teardown 的既有 P2 也仍在：`use-map-raster-installation.ts:108` 丢弃 dispose 返回的 remainingIds，无法用当前受控路径证据关闭。`useNativeMapRecovery` 每次页面挂载的初始 ID 都是 `spot-map`，同名重挂载后的旧 context／迟到命令是否绑定原实例还没有目标证据。唯一实例 ID 可以减少同名混淆，但它自身不提供原生销毁回执，也不应被单独包装成无泄漏修复。

## 当前有界责任与不能混用的证据

- 地形／光害：coordinator 每层固定两个 slot；同 ID update 期间保旧新两个文件，真实 ack 后才释放旧文件。尚未派发的新候选替换前一个 queued pin；Hook 的候选来源 Map 上限三份。下载最后 reader 退休会 abort，晚到文件回交原 owner。原生未确认与文件 unlink 失败都会保真实责任，不能用编码预算声称整个进程有界。
- 云量：`useMapCloudPresentation` 只有一份保留 acquisition，scope／disable 清空，expiry timer 清理；声明式 polygons 不经过 raster pin，零 pin 不认证其 native 回收。
- 三者元数据仍经过 Query。`map-scene` 与 `map-night-light` 的 key 包含视窗，Query 默认 GC 为三十分钟；文件八项上限不是这些响应、queryFn 或原生 polygon 的上限。该保留策略本身不证明泄漏，也没有当前峰值证据支持立即改 GC。
- r20 仍只证明一次西移中父图比细图提前约 1.91 秒可见，未证明三层快速连续缩小／移动、最终细节或持续资源回落。无需重跑旧“父图为什么没有出现”准备动作。

## 下一步

先合批处理上述明确的文件预算恢复缺陷，维持当前同 ID、父图、pin 和受控退出语义。父代理继续工具对照和设备主线；无需等完整 Heap 才做此独立修复。

下一次本来就需要的三层实际连续操作可只增加相关 owner 的有限汇总：操作前、停止并到最终覆盖后、成功关闭图层／受控离开后的 `entries/readyBytes/activeDownloads/queued/nativePins/failedRemovals`，以及实际 add/update/remove 发起与回调／timeout 数和当前 Map 代。无需路径、坐标或逐帧对象历史。该观察能区分文件预算失败、未决 native 指令与正常缓存保留；若这些都回落而进程仍增长，再沿当前 attribution 查不同 owner，不能据计数/PSS关闭泄漏。云量应单独保当前查询／polygon数量与实际覆盖意义，不能由 raster计数代验。

## 原生销毁恢复的公开能力边界（接收端补核）

2026-10-21接收端在r23完整构建后复核当前coordinator、Hook cleanup、`useNativeMapRecovery`及`retryNativeMap`。普通remove失败与永不回调仍是不同机制；本次没有重跑既有九轮反例、改动生产、创建新的native退休队列或放行未确认文件。当前Stable工具仍无可操作正文，未执行设备侧的实例销毁试验。

本次实际读取的[createMapContext官方文档](https://developers.weixin.qq.com/miniprogram/dev/api/media/map/wx.createMapContext.html)按map组件id/组件实例定位，并建议通过selector取得context；当前Taro声明也保留可选组件实例参数。这可以定位后续待验证的实例绑定入口，但文档没有保证旧context在同名重挂载后的行为。不能仅凭id重复断言旧命令一定会作用于新Map，也不能据方法签名证明它必定隔离。

实际读取的[MapContext接口表](https://developers.weixin.qq.com/miniprogram/dev/api/media/map/MapContext.html)提供图层add/update/remove，未列MapContext.destroy或旧实例销毁完成回执。[map组件文档](https://developers.weixin.qq.com/miniprogram/dev/component/map.html)将updated定义为渲染更新完成，没有把它定义为旧组件/native资源的退休确认。因此用新Map的updated解除旧文件pin没有公开契约依据；selector绑定、唯一id或JS cleanup也不能单独填补这一缺口。此结论只限定所读公开接口，不宣称平台永远无法回收资源。

三个官方HTML及解析正文保存在本轮私有`r22-stable-control-20261021/map-lifetime-docs`，分别为448,509／470,788／111,590B；主机HTTPS读取成功，网页工具的不可打开结果不是官网不可达。接收端只复用这些明确边界，后续需在工具恢复后的同一实际Map实例上确认命令/退休/回落，不以本次文档核对认证无泄漏或重复派生无证据的重建方案。

## 被审字节

相对仓库根；后续改动须重评受影响结论。

| 文件 | SHA-256 |
| --- | --- |
| `apps/wechat-miniapp/src/services/raster-image-resources.ts` | `2ae75bcb7233097f5d17783de3c692a848aeee26a3c409b28ec3330da4a5457e` |
| `apps/wechat-miniapp/src/services/map-raster-files.ts` | `d3ad99cc48e9a569efe1c9cd32a9a4bc361678448584360c89c17744f70e00d9` |
| `apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts` | `1dc86c0af9c551a9de87175b7038bc3ed3cf8358742e0140e303669f6708e349` |
| `apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts` | `ab0769adccbd331e1312b25e048b049ce3f6f092ac1279ec9e52d53aa49257ed` |
| `apps/wechat-miniapp/src/pages/map/native-map-recovery.ts` | `2830d6403c97d10e8b65a2b7e60bbbf6814214c2aa18faacf538ed62a299c184` |
| `apps/wechat-miniapp/src/pages/map/index.tsx` | `9e62b429a15c8ded708be75f037ec9d14be619912875bb1779c7c9e1143cff1e` |
| `apps/wechat-miniapp/src/hooks/use-map-cloud-presentation.ts` | `fe55044bd77d1b82226ec0ceb57aacc4aff155d3380011edd9abd841d1587ca8` |
| `apps/wechat-miniapp/src/hooks/use-map-night-light.ts` | `b4375f5fededbc908d4ac5558bb94613968981a6af6f5aca412a580f88f5f0a6` |
