# 叠层单覆盖替换与资源退休复核

2026-10-21，只读源码/官方资料与无设备的现有 owner 复现。未操作手机、IDE、服务、账号、VPN，未改产品代码、提交或上传。父代理独占设备。复用私有 `r16-native-region-review/REVIEW.md` 的零 `onUpdated`、实际边缘缺口及源缓存结论，不重做该实验。

**决策：同 ID `updateGroundOverlay` 值得做一次真实手机能力试验，但目前不能直接替代双 slot；另发现可复现的失败退休资源缺陷，需要在现有安装/Map 生命周期责任内处理。** 两项都不证明三类叠层的完整性能或无泄漏验收，也不解释 Sky 的 V8/native crash。

## 官方能力与现有选择

微信文档站三个精确 API URL 本次读取均返回 non-retryable，改读腾讯位置服务官方 `TencentLBS` 仓库的原始 API 文档：

- [updateGroundOverlay](https://raw.githubusercontent.com/TencentLBS/tencentmap-miniprogram-skill/main/references/mapContext_api/MapContext.updateGroundOverlay.md)：基础库 2.14.0 起支持，可按 ID 更新 `src`、`bounds`、`visible`、`zIndex`、`opacity`；说明工具侧暂不支持。
- [addGroundOverlay](https://raw.githubusercontent.com/TencentLBS/tencentmap-miniprogram-skill/main/references/mapContext_api/MapContext.addGroundOverlay.md) 与 [removeGroundOverlay](https://raw.githubusercontent.com/TencentLBS/tencentmap-miniprogram-skill/main/references/mapContext_api/MapContext.removeGroundOverlay.md) 也有 success/fail/complete。文档没有承诺无空帧、原子换图、旧纹理/GPU 释放时刻或多图层原子组。
- [Taro 的 MapContext 文档](https://docs.taro.zone/docs/apis/media/map/MapContext) 声明 update 的 id 为 number、返回 Promise；腾讯 update/remove 文档写 String，而 add 写 Number。保留当前已用数值 ID，通过实际目标调用判定，不为文档不一致另造 ID 适配。当前 coordinator 同时处理回调和实际 Promise，没有把 void 当成功。

源码 `pages/map/map-ground-overlay.ts:120–149` 明确只 add 另一 ID、等待确认、再 remove 原 ID；接口虽声明 update，执行路径从不调用。`map-native-compatibility.test.ts:58` 还以“不出现 update 调用”固化旧方案。它保护已有范围与失败回退，不是平台 update 不支持的证据；能力试验成功并采用方案后，该检查才应改为验证必要行为，不能为了试验直接删除保护。

`index.tsx:911–939` 的 `allowInitialPreview` 与 `use-map-raster-installation.ts:40` 的 `initialOnly` 两层限制共同阻止跨覆盖父图；后者也保护已排队的细图。移除其中一个布尔限制不会得到安全单覆盖替换。当前 RELIEF_OVERLAY 即使 opacity=1，图片内部仍有透明像素，父子叠加仍可能双着色。

## 可复现缺陷：退休安装器丢失失败清理责任

**P2，触发是原生 remove 失败/永不成功后 Map 换代或页面卸载。** 不把普通失败当成原生不存在。

1. `map-ground-overlay.ts:101,133` 从排队到原生 slot 持有文件 pin；只有 `remove` 的成功回执 `:76–82` 调用 `releaseFile`。失败时保留是正确的保守行为。
2. `dispose():156–162` 将实例标为 disposed，尝试两个 slot 的 remove，但吞掉失败，返回已完成 Promise。它没有返回剩余责任，也未注册后续重试。普通 `apply()` 在 disposed 后立即返回。
3. `use-map-raster-installation.ts:67–76` 随 mapId 更换 coordinator，effect cleanup 只调用一次 `void coordinator.dispose()`；卸载/换代后没有持有旧 coordinator 的恢复入口。旧结果又被 `nativeMap.isCurrent()` 阻断。因此一次终止性 remove fail 后，旧 pin 的 release closure 随旧 owner 失去可达的业务入口，模块单例仍保留 pins 数值和文件。
4. `raster-image-resources.ts:61,76–81,178–185` 不淘汰 pinned 文件，这是正确保护；但它不知道旧 Map 的退休。`close():200–205` 也不会越过 pin。`failedRemovals` 只表示文件 unlink 失败，不能检测这种原生清理失败；这次复现该值始终 0。

本次直接以 `node --import tsx --input-type=module` 导入当前真实 `createMapGroundOverlayCoordinator` 与 `createRasterImageResources`，平台 adapter 仅模拟文件和 native 回调，没有磁盘/设备副作用。按现有 `maximumFiles=8`，8 次独立图片执行 `acquire → add success → reader.release → dispose/remove fail`：

```json
{"entries":8,"readyBytes":800,"activeDownloads":0,"queued":0,"nativePins":8,"failedRemovals":0}
```

第 9 次 acquire 拒绝 `raster_image_budget_busy`；没有文件被删除；`close()` 返回 `retainedPinnedFiles:8`。100 B 是模拟文件值，不是实际图片或 native 内存测量。

对照：同样 8 轮 remove success 后 `nativePins=0`，第 9 次 acquire 正常、旧缓存按预算淘汰，close 无 pin。另保留一个失败 coordinator 的引用，等模拟通道恢复后再次调用其 `dispose()`，pin 从 1 回到 0。这把缺口定位到退休后的责任/恢复链，而不是 release 函数本身。正常换图、待定候选取消、成功隐藏清理没有在本次发现相同缺陷；现有晚到 add 与旧结果隔离仍需保留。

影响：地形/年度光害共享的文件名额会在失败退休后逐步不可用；同一路径的 pin 计数也可反复累积。文件预算仍阻止任意新增文件，不能把这项故障夸大为已证实的无限 GPU/PSS 增长。真实手机是否发生此失败分支，仍需当前候选清理回执/资源摘要；不以该 mock 证明现有 r13/r16 进程增长原因。

## 哪些信号允许释放，哪些不允许

| 事件 | 当前代码/文档能证明什么 | 文件 pin 处理边界 |
| --- | --- | --- |
| 该 slot remove success，包括 timeout 后的真实晚到 success | 原生指令已完成；现有平台合同的释放边界 | 现有代码可释放 |
| 普通 remove fail 或 timeout | 未能确认移除；timeout 不代表操作取消 | 保留 pin/ID，必须继续拥有恢复责任 |
| 页面 hide、`visible=false` | 页面不可见，Map 节点仍可能存在 | 不能作为 absence；尝试 suspend/remove |
| `nativeMap.isCurrent() === false`、generation 改变 | 仅 JS active/generation 失效（`native-map-recovery.ts:13–16,28`） | 不能自动 unpin |
| React cleanup、Map key 改变、`skyMapLifecycle.mapUnloaded()` | 当前都是 JS 生命周期记录；后者来自 Map effect cleanup（`index.tsx:270–274`） | 不是已读回的原生销毁确认 |
| 新 Map `onUpdated` | 新实例 ready（`native-map-recovery.ts:39–41`） | 不证明旧实例所有 native 工作结束 |
| 旧 Map 真正销毁、且不可能再消费路径 | 若取得可靠平台/组件退休确认，才有另一释放依据 | **当前没有已接入、已验证的该信号** |

[官方 Map 事件表](https://raw.githubusercontent.com/TencentLBS/tencentmap-miniprogram-skill/main/references/map_component_guide.md) 描述 updated 为渲染更新完成，未公开旧实例 destroyed/overlay-retirement 回执；不能将 updated 解释成释放 fence。本次未找到可直接采用的确认销毁信号。修复范围应是 `use-map-raster-installation` / `map-ground-overlay` 与现有 `native-map-recovery` 的清理责任交接：在原节点仍可操作时完成清理、失败责任保留并可恢复，或者取得真实退休确认后释放。不能只在 dispose catch/finally 中无条件 unpin，也不能扩大缓存绕过故障。最终具体退休资格要由真实路径验证；本报告未实施该修复。

## 三类叠层实际资源责任

- **地形、光害**：共同使用 `use-raster-image → map-raster-files → raster-image-resources` 和 `use-map-raster-installation → map-ground-overlay`。下载最后读者退出会 abort，晚到文件仍由资源 owner 回收；native pin 与 JS reader 独立。8 文件/16 MiB 是编码文件预算，不是 GPU 或进程预算。候选 source Map 上限 3，实际 native slot 每层 2。元数据/下载成功不能推进 presented source。
- **云层**：当前 `index.tsx:854–870,2497` 是声明式原生 `polygons`，不经过图片文件或 GroundOverlay。`use-map-cloud-presentation.ts:12–37` 仅保一个公共 acquisition；disable/scope 切换清空 previous，expiry timeout 有 cleanup。它也不累加历史 polygon 数组。React Query 的默认 `gcTime=30min`（`services/query-client.ts:18`）会保留近期请求数据，不能把该缓存期内的保留直接判为泄漏；本次未测其目标峰值/回收。Map hide 本身没有把 polygons 属性清空，旧 Map 仍可能保有当前 native polygon，Map→Sky 的真实卸载责任不能由文件 pin 计数代替。

## 下一次最小真实手机试验

先由父代理完成当前 Sky 候选，叠层仅排队，不抢手机。下一决策是“同一 ID 能否将图片和范围从旧细图 A 换为已验证父图 B、再换为细图 B，保持一个覆盖、不空白、不双着色”。

1. 沿现有 task candidate/Map 安装器准备有限开关，使用已有当前 Map 和原 file owner；不新增第二渲染器或任意 raw 连接。先取得 A 细图、B 的实际已发布父图与 B 细图三份完整/配准/哈希合格文件，保持 lease。预先就绪是为隔离原生 update 能力，不能用于宣称冷源等待已解决。
2. 在同一真实手机、同一实际相机窗口记录一次 A → parent B → fine B。仅 update 原 ID 的 src+bounds，保原 opacity/zIndex，串行等待真实回执；保留旧/新文件直到对应指令取得可信终态。timeout/失败视为不确定，不重用 ID、不释放仍可能消费的路径、不继续一串盲更新。
3. 实看回调前后和过渡录像中的地形地理特征、图界、旧覆盖细节变化及透明区域；至少让原有地形+光害组合存在，避免单独不透明色块掩盖双着色。随后按实际图层选择切云一次观察已有 polygon 次序。原生 callback、视频编码帧和物理 FPS 分开，不能只凭 success 通过。
4. 通过现有 suspend/remove/返回旅程读 `nativePins/entries/activeDownloads` 和当前 Map 代；有失败则记录精确指令终态及仍持有的路径数。逻辑 pin 回落不代表 GPU 已释放，更不能独立关闭持续移动/缩放后的无泄漏目标。

通过后才进入“当前真实可见范围超出旧细图且细图仍 pending”的有界父图准入；仍要求父图覆盖完整新请求、不扩大源范围、不冒充细图完成、细图先赢则父图退休。若同 ID 更新出现空白、错误范围或不确定回执，保现有保护，转 PLAN 已保留的非重叠显示单位/组合范围分支，不删 initialOnly、不用更长防抖或扩大缓存掩盖。

## 被审源码身份

相对 `apps/wechat-miniapp/src/`，本次读取 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `pages/map/map-ground-overlay.ts` | `425328b2f4e09a79eba79d27377ec92388b5504b67c7db15d0419c826c464f3b` |
| `pages/map/use-map-raster-installation.ts` | `82e9e0dea77f75e30229ef811f296ed7f6ef20b65729da3f94e927fb4faf012d` |
| `services/raster-image-resources.ts` | `2ae75bcb7233097f5d17783de3c692a848aeee26a3c409b28ec3330da4a5457e` |
| `pages/map/native-map-recovery.ts` | `2830d6403c97d10e8b65a2b7e60bbbf6814214c2aa18faacf538ed62a299c184` |
| `hooks/use-map-cloud-presentation.ts` | `fe55044bd77d1b82226ec0ceb57aacc4aff155d3380011edd9abd841d1587ca8` |

本报告仅一份 task-local 文本，无新增通用脚本/测试架构。后续实现如改变这些责任，复核受影响结论；本次没有完成叠层 latency/lifetime 目标验收。
