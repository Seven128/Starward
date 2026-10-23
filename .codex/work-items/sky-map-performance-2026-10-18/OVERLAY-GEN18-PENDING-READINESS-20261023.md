# 普通 gen18：加载中接管与离页的可执行性核查

2026-10-23。仅做有界只读准备；未操作手机、DevTools、ADB、HTTP、服务、Git，未创建候选、诊断或脚本，未改生产代码、PLAN、HANDOFF。实际候选和设备所有权沿 [HANDOFF](HANDOFF.md) 顶部：普通 gen18 / `starward-device-test-mBiLUn`，bundle `bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5`。这是 Root 已建立的身份，不是本代理重新核验手机运行字节。

## 结论

**当前没有已具备准入条件、可以直接执行并回答“上一轮仍在加载或安装时接管”的单次动作。首个缺口是可和第二次输入关联的真实 pending 窗口，而不是缺少单指输入命令。** 不能把普通暖缓存 My 往返或一次新的 pan 改名为加载中断验收，也不为补这一条制造冷缓存、失效数据或新的诊断构建。

三种机制中，**My 隐藏是以后自然出现合格 pending 时的最小单指选择**：只需一个 My 输入便到达与 Map 显示权不同的 foreground；不需要双指、不先改变正式点/Context，也没有 Sky 安全清理与准备状态这一额外前提。此选择是执行准备，尚未完成目标观察。

## 本次核明的实际边界

| 责任 | 当前代码或已有结果 | 对本次可执行性的限制 |
| --- | --- | --- |
| 原生 region 与新手势 | `index.tsx:1849` 的用户 begin 取消选点聚焦，end 发布真实相机并安排 Context 解析；Map 的 scroll/zoom 资格见 `2613`，不依赖地形 loading。`use-native-map-region` 读取、校验当前 Map/camera 身份，不提供普通包的外部 pending 读口。 | 能发送单指不等于已经跨出旧覆盖或触发新读。既有 [gen14 两次有效位移](OVERLAY-GEN14-CLEAR-MAP-PAN-PHONE-20261023.md) 没有新 terrain metadata/asset 请求；不能重复同暖窗来补加载中接管。r14/r16/getRegion/onUpdated/预取资格直接复用。 |
| retained Map → My | `primary-navigation-controller.ts:43` 的 `openMy` 发布新的 primary foreground；`index.tsx:548–570` 的同一订阅同步触发 Map hide，停止页面意图并把 `pageVisible` 置 false。不是旧 TabBar 的 `switchTab` 路径。 | My 是真实可触达的不同退休机制，但正常打开/返回已观察，不再重验普通往返。必须另证明打开那次输入与尚未完成的叠层工作重叠。源码中的 hide 不能代替这个目标结果。 |
| 原生安装 | `use-map-raster-installation.ts:82–137` 由原生结果更新 installed/presented；`pending = Boolean(target) && installed !== desiredKey`。`map-ground-overlay.ts:74–175` 的 slot operation、generation、ack 都在现有 owner 内。 | HTTP 完成后仍可能下载/校验或原生安装；普通 USB 工具不能读这些 hook/slot 状态。10 秒 native timeout 是失败边界，不能制造为观察窗口或当作释放证明。 |
| Map → Sky | `index.tsx:995` 的 `suspendMapRasters` 为两层各取得退出票；`openSkyPage:2299–2336` 等待 `cleanup.ready`，再核原 entry/cleanup 身份才 redirect；失败恢复当前 intent。 | Sky 点击后发生的 remove pending 是受控清理自身，不等于“点击前旧加载未完”。当前完整 Map 还需正式点/可用 Sky 入口准备；这个准备可能已经改变或结束旧需求。不能从最终成功进 Sky 倒填先前加载状态。等待必要的 native 清理也不能直接归为不当网络阻塞。 |
| 当前桥观察 | `tmp/r17-normal-phone-bridge.mjs:63–69` 只在 `res.once('finish')` 时追加最多 32 条 `publicRequestBoundaries`，含 rounded elapsed/returnedAt；health 在 `95–100` 返回该完成列表。取消走 `close`/abort，未完成的请求没有独立 live-pending 项。terrain identity receipt 带版本/key/asset hash，但没有手机原生安装 ack。 | 两次 health 差分可说明完成了哪些公开请求、哪份 metadata/asset；不能直接确认此刻仍有哪项 pending。没有新增完成条目也不等于没有进行中/已取消请求。不能把 `returnedAt - elapsedMs` 拼作无误差的设备输入/原生安装时间。 |
| 画面 loading | `index.tsx:978–980` 把真实 bounds、query/fetch、image 及 installation pending 合成 `mapTerrainLoading`；`2736–2737` 显示“正在加载地形/正在更新地形/已显示临时地形，正在加载细节”。 | 它可证明所拍那一帧的产品聚合 loading，不区分哪一阶段，也不证明 fresh capture/view 后下一条输入时还在 loading。看图及公共工具往返期间工作可能已完成。 |

现有 `use-raster-image` 在 enabled/descriptor 变化时退出读 lease；安装 owner 在不可见时发 suspend 并保原生 pin 到真实 remove。以上仅明确应该验证的责任，不声称目标端已完成取消、共享读保留或 native/GPU 回收。真实云供给继续保 H4 条件缺口；本次没有用 SAMPLE_DATA/fixture 替代。

## 待决问题与可改变的修复

只保一个最小问题：**有真实叠层 pending 时进入 My，是否立即交出 Map 的页面发布权，且返回后只按当前需求恢复，不被旧结果恢复旧来源/范围或相机？**

| 有效实际结果 | 下一动作 |
| --- | --- |
| 已确认 pending 与 My 输入重叠，My 正常出现，返回保当前相机/选择/来源，旧工作不能抢回展示 | 关闭这一种 hide 中断的已观察范围，继续原 PLAN 的不同机制；不追加相同暖往返，也不认证完整 native 释放/无泄漏。 |
| My 必须等无关数据请求完成才出现，且观察已排除缺失的 pending/input 关联 | 沿 primary foreground 到 Map hide/页面 demand 的实际耦合修复；不先改 map 引擎、prefetch 或 Query GC。 |
| My 已出现或返回后旧来源/范围/相机夺回 | 沿实际迟到结果的 admission/current identity 与页面 hide/return owner 追责；保原相机和共享有效数据，不能靠清缓存/重挂 Map 掩盖。 |
| 只看到之前的 loading、之后的 My；完成日志不能确认输入重叠，或加载在输入前已结束 | 此次不能回答该问题；原件保 unknown，停止，不再重复暖路径找更好看的结果。 |

## 将来恢复这一观察的最小条件与停止点

仅当**本来必要的真实需求**在当前已准入成品/服务上自然留下可确认的 pending 时，Root 才能选择 My 这一例。最少要求是：当前有效普通包、真实有效层与来源；fresh capture 实看后沿公共 `record-tap` 进入 My，并在实际视频中辨认输入反馈/转场与同一层 loading 的相邻帧或同帧关联。若输入前最后可辨帧已无 loading，只能记普通导航，不能借早先截图补齐。请求侧只能引用同次已完成的真实身份记录；不能把它当安装或物理呈现确认。

如果 Root 已在必要的下一次操作中遇到这种合格窗口，一次 My 输入、结果实看、一次正常返回及当前状态实看足够；不需并行 PSS watcher、附加负载、重复输入或新的缓存条件。当前并没有已观察到的上述窗口，因此本报告不安排这次手机动作。公共 USB、fresh-view/单次授权及 Root 独占规则保持。

无合格 pending、前台/目标变化、native 错误、来源失配或输入被守卫拒绝即停止该条，不重放动作、不扩大成组合矩阵。一次新的普通加载只在确实有必要需求且能回答本问题时使用；不为“制造一次 pending”额外跨区域取源、换日期或切供应。

## Root 后续提出的持续单指观察

Root 另行提出仅把现有公共 swipe 明示上限从 2 秒扩到 10 秒，保所有原守卫，用一次 8 秒 `record-swipe` / 15 秒录制回答持续未松手期间的画面问题。本代理只独立核查，不改工具，也不操作手机。

**这是与 pending 离页不同、当前可以推进的机制观察。** 既有 1.8 秒位移及松手后画面未覆盖较长持续输入；一次 8 秒单次手势可检查持续移动中既有有效地形/LIGHT 是否跟随、错位、突然清空或阻止相机。相同空间距离即可观察这条责任，不必额外跨区域、取源或追加多笔手势。命令请求时长和稀疏视频帧不能建立物理精确 down/up、FPS 或逐帧无问题；须实际查看录像中段移动和覆盖。它不关闭双指、加载中接管/My/Sky、渐进新覆盖、最终细节或资源回收。

本代理读取时 `device-adb.mjs:148–153` 的 2 秒是本地参数限制，未建立平台最长能力；input 的原命令 timeout 为 15 秒。`device-record.mjs:21–23,58–59,105–109` 已限制录制 6–15 秒，按真实参数 `gestureMs + 250` 在发送前核剩余录制时间，保同前台、当前截图尺寸及单次输入授权。8 秒输入与 15 秒录制在此现有合同内有可行窗口；传输/实看过慢则必须沿原守卫拒绝，不放宽或把拒绝当地图故障。这是源码上的可行性，不是实际工具已改、手机已运行或有效视频已取得；Root 后续真实修改/运行另归其证据。

完整 Map 已有真实 bounds 时，`onUpdated` 调 `readTerrainViewport(!mapTerrainBounds)` 实际为 false；`use-native-map-region:23–26` 对同 cameraKey 已成功读取会直接返回。begin 本身不新发区域读取，用户 end 才更新 store 相机。故不能从持续手势中可能存在的 updated 推断必定重读、新取源或安装；也不能从桥没有新增完成项推断手势中没请求。原 r14/r16 的能力与收益结论继续复用。仅凭此次普通录像和桥前后快照，不新增预取、轮询或调度修复；没有可关联的发起/安装事件，时段仍记 unknown。

本次没有新目标画面或计时，也没有完成任何未验旅程。真正的新准备事实是：现有完成请求列表、聚合 loading 画面和隐藏/受控卸载的源码保护分别能说明什么，以及它们目前缺少哪条实际输入重叠关联。持续单指可独立推进，不取代这些缺口；全部原义务继续保留。
