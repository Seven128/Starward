# 同 ID 叠层候选独立审查

2026-10-21；独立审查当前未提交源码。仅写本报告及相邻 JSON，没有操作手机、IDE、服务、构建、提交或上传。

结论：同一 coordinator 内的替换串行化、旧/新文件 pin、超时后迟到回调和无 update API 回退，未发现新增 P1/P2 缺陷；三个现有变更测试文件 **27/27 通过**。但既有 **P2 卸载后失败清理责任丢失仍未闭合**，不能据此通过资源生命周期或真机无泄漏验收。

## P2：退休 owner 的清理结果仍被丢弃

[use-map-raster-installation.ts](../../../apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts) 第 78 行仍为 `void coordinator.dispose()`。底层新返回 `{ complete, remainingIds }` 让结果可见，却没有调用者保存失败 coordinator 或承接其重试；Map 换代/卸载后，真实 remove fail 仍把 pin 留在模块资源 owner 中。该缺陷在上一份生命周期报告已存在，本候选没有将它修复，也没有宣称已修复。

对当前真实 coordinator 和 raster resource owner 做无设备、无磁盘的 adapter 复现：8 次 acquire → add success → dispose/remove fail 后，`entries=8, nativePins=8, readyBytes=800, failedRemovals=0`，每次 dispose 返回 `complete:false, remainingIds:[120]`；第 9 次 acquire 以 `raster_image_budget_busy` 失败。保留这 8 个 owner，在模拟原生通道恢复后重试 dispose，pin 全部归零，第 9 次 acquire 恢复，close 无遗留 pin。100 B 文件只是固定测试输入，不是手机内存观测。

应在现有 Map/安装生命周期边界保存准确旧实例的清理责任，直到有效移除或可靠销毁确认。不能在 JS cleanup、世代变化或失败 finally 中直接 unpin；不能仅扩大缓存。本报告不指定新的全局 registry 或轮询框架。

## 当前候选已核对的行为

- 已确认 slot 用原 ID 更新完整 src/bounds/opacity/zIndex；仅当 update 方法实际不存在时采用旧双 slot。调用失败不被误解为 API 缺席。
- update 发出时撤回来源身份，成功回执才发布实际候选。新、旧文件在确认之前同时保留；最新但尚未发出的候选替代旧排队候选时，其 pin 当场退出。
- 失败/超时保留 ID 和文件；重试先清理未知结果。迟到清理绑定当时的 File 对象，现有用例覆盖“先排最新请求，再到旧成功回调”，不会清掉重用 ID 上的新文件。
- dispose 后不再接收新 apply；迟到 success/fail 仍可完成旧 slot 的清理。反复 dispose 在移除恢复后可收敛。
- 原生回调、实际 Promise、隐藏时清理和显式重试路径都有本次通过的局部行为检查。

## 证据边界

同名 Map 重挂载后的原生 context 绑定不能由本地 mock 推导；JS `isCurrent` 只保护来源发布，不证明旧命令永不命中新节点。当前 hook 测试替换了 coordinator，而且 mock dispose 不返回剩余责任，因而没有覆盖上述 P2 接管。真机同 ID 图片/范围更新、过渡空白/双着色、旧纹理回收和持续移动/缩放资源曲线仍需实际候选。当前手机 r18 Sky Play 录像与这些未交付的 Map 源码不是同包证据。

来源：已读 AGENTS、global、PLAN、开发 skill 和性能分析方法、`OVERLAY-REPLACEMENT-LIFETIME-REVIEW-20261021.md`；核对实际 diff、Map 两个 raster 调用者、资源预算与 Map generation owner。旧报告的同 ID 能力建议是待测候选，不能用本次 mock 代替它要求的真实试验。

测试命令、复现结果和完整 SHA-256 在 [相邻 JSON](NATIVE-OVERLAY-REPLACEMENT-INDEPENDENT-REVIEW-20261021.json)。主要被审源码：

| 文件 | SHA-256 |
| --- | --- |
| `apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts` | `9582ec700deefd5125e431dc2d100742998a3f063eec61e1abace7d52db8680b` |
| `apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts` | `66817d51e51ed66caf24e17a777d32018d501035fcd2003d9b2d663e3d3c9912` |
| `apps/wechat-miniapp/src/pages/map/terrain-ground-overlay.test.ts` | `633396f2aa9f0bd70f0a22660751ae80aa64845a5a3606a6c5e3f53208e7d0b0` |
| `apps/wechat-miniapp/src/pages/map/use-map-raster-installation.test.ts` | `2bed31b2a6a059f80fa28f5a2f627d52a672dd7c53068da4d945a717577b3372` |
| `apps/wechat-miniapp/src/pages/map/map-native-compatibility.test.ts` | `76a2ce91011e067ce502de75fa0fa0b2f3f7d1e1c63512b1f9f1450b6a282f57` |
| `apps/wechat-miniapp/src/pages/map/terrain-ground-overlay.ts` | `057c6822f2d52e5947939c98f8dbd06157b75212fa2be5c60758137d9c018581` |
| `apps/wechat-miniapp/src/pages/map/native-map-recovery.ts` | `2830d6403c97d10e8b65a2b7e60bbbf6814214c2aa18faacf538ed62a299c184` |
| `apps/wechat-miniapp/src/pages/map/index.tsx` | `122fd9b6c05b2b72577ec84dbfb23c453f5c83fd332184107ff85a58faa49bd8` |
| `apps/wechat-miniapp/src/services/raster-image-resources.ts` | `2ae75bcb7233097f5d17783de3c692a848aeee26a3c409b28ec3330da4a5457e` |
| `apps/wechat-miniapp/src/services/map-raster-files.ts` | `d3ad99cc48e9a569efe1c9cd32a9a4bc361678448584360c89c17744f70e00d9` |
