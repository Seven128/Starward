# r7 正常 Sky 分配样本：路线已验证，B 归因仍未完成

本次独立文件分析确认已有官方普通真机调试 **Allocation sampling** 导出是非空、结构完整的实际 Sky 样本。它把 B 从工具资格推进到可用的分配来源；按已安装前端和官方协议默认值，应作为**存活分配的统计估计**解释，不能当作整个 Play 的总 churn、完整 JS 堆、对象引用图或 native/GPU 分配。机器结果见 [R17-NORMAL-R7-ALLOCATION-RESULT.json](R17-NORMAL-R7-ALLOCATION-RESULT.json)。

冻结候选为 r7 app `c9874bb3c40e0167be3f840577ac02cb9ec3a86ba8539830a74b3b946b1f3ae1`、source `528b3d8a99ca4c87958e10b01ac7af7040b031e5270e601e61bcf2b3949cf755`；后续工作树不是本次采样源码。复用 [r7 Play 独审](R17-A1-R7-PLAY-RESULT.md) 的真实非空手机标签、官方交付及同一 run 20.018 s 正常 Pause。root 的公开 Console 实际返回 android / sky/detail/index；Memory 的“(empty)”标签没有被当作空样本。runtime AppID 和手机整包字节仍未核验，范围仍是 development feedback。

原始 profile 为 192,220 B，SHA `d3d790a3fe622aa5651bc8017cfea3cb2b5c3775161e5e87fdba733c158e7a8c`。982 个节点 ID 唯一、625 个样本引用全部合法、无重复父节点；161 个非零 self 节点都有样本。文件只有 head/samples，样本只有 size/nodeId/ordinal。625 个 ordinal 唯一，范围 16–248142，导出顺序未排序；它只给先后顺序，无法换成时间或帧。

## 统计范围

root 观测 Start 请求 08:31:41.039Z，约 08:32:23 真实 Play；Stop 请求 08:34:16.716Z，08:34:57.596Z 仍为 Stopping，08:38:16.088Z 首次看到完成，08:41:14.426Z 请求保存。实际 target capture stop 未知，不能把这段等待当作有效采样时长或 GC 暂停，也不能把整个 profile 除以 14.004 s 的 active-window 计数。profile 没有可分离的 Play / drain 时间分箱。

已安装官方 `HeapProfilerModel.js`（5,016 B / SHA f76024cc…）只传 `samplingInterval: e || 16384`；`HeapProfileView.js`（13,538 B / SHA 8a8f0645…）确认 Allocation sampling 调用该入口，并等待 stopSampling 回包后才完成。未请求 major/minor GC 已回收对象。按 [官方协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json) 默认语义，这里是返回时仍 alive 的采样分配，包含采样期间观察器工作；不是完整历史分配或引用保留路径。手机 backend flags / V8 版本未另行抓取。

节点 selfSize 合计 **16,778,484 B**，samples.size 合计 **16,677,760 B**，差 100,724 B，涉及 19 个节点。保留两种估计，未配平或补样本。V8 的 [采样源码](https://raw.githubusercontent.com/v8/v8/main/src/profiler/sampling-heap-profiler.cc) 对每种对象大小的节点总计与单个 sample 分别缩放、取整；最大两个 Do 差异与该算术一致。引用完整性通过，不能要求两种加总恒等。

## 实际分配来源

下表按实际 scriptId 分组；数值是带权估计，不是整进程驻留字节。

| 运行时脚本 | selfSize B | samples.size B | self 占比 |
| --- | ---: | ---: | ---: |
| 51: chunk_0.appservice.js | 8,620,176 | 8,518,680 | 51.38% |
| 0: built-ins / no URL | 2,653,460 | 2,653,532 | 15.81% |
| 42: appservice.app.js | 2,520,808 | 2,520,828 | 15.02% |
| 38: WARemoteDebug.js | 1,811,200 | 1,811,200 | 10.79% |
| 26: WASubContext.js | 952,568 | 953,248 | 5.68% |
| 41: common.app.js | 136,680 | 136,680 | 0.81% |
| 15: WAServiceMainContext.js | 67,000 | 67,000 | 0.4% |
| 46: appservice.app.js | 16,592 | 16,592 | 0.1% |

同一完整 callFrame 跨调用上下文合并后，`ma` self 为 **4,531,968 B / 27.01%**（6 个节点、276 个样本），最大单支 4,121,424 B。其实际父链包含 `paint → … → forEachProjected → forEachProjected → ma`。对所有 `forEachProjected` 子树按唯一节点去重，self 为 **6,102,436 B / 36.37%**；`paint` 子树为 **6,539,644 B / 38.98%**；两者重叠，不能相加。

这使共享恒星变换及 BSC/SAO 适配成为有实际分配证据的调查 owner。冻结源码的变换拥有 exact-time 的 vectors/positions/directions/transmissions 缓存，正常投影父调用关系相符；但分配栈不是 retaining root，也没有证明缓存寿命错误。`motionAt` 和 `mayProjectVector` 没有存活采样节点，不等于未执行、零分配或零 CPU。

观察器成本没有隐藏：具名任务 `prepareStarted` self 131,824 B；`WARemoteDebug.addResource` self 1,811,200 B。另有 appservice `set` 同为 1,811,200 B，现已通过官方双级 map 确认为 `createResponseCache > set`，父链为 API request success / finish；同样大小不证明它与调试资源是同一对象。内建 join 合计 1,930,520 B，来自微信回调父链，仍不能直接归入产品状态。

## 精确映射和下一行动

root 通过现有官方 Sources 精确选择并保存两份实际运行时脚本，没有新建连接。Sky runtime 2,335,108 B / SHA `babed6d0f863c65a7d949af11c1b145600802c39bbdbb782c000956815917bad`，唯一 inline map 1,305,102 B / SHA `758ab34a5d856fa0bb9fdae061f164abb38bf50b0974b586440782d74d8ec0f3`；其中 authored index.js 595,974 B / SHA `25a659943f6dab0d348dcf10667e45443d414e6c48f3f95c0e34427f5aea3d4a` 与冻结 r7 逐字相同。main runtime 3,324,817 B / SHA `0d682fa821dec18e6ebe1dad81a01ee7a9bbde9a2064a99e584cddd53f7ca996`，inline map 1,774,528 B / SHA `9717c1fc0c207cac906e38cabe359d97a0092e2e070184581e72ae94ca08bcce`；其 common/runtime/taro/vendors/app/custom-tab-bar index 六份 authored 内容全部逐字匹配冻结 r7 及原 Taro maps。

[r7 map 独审](R17-NORMAL-R7-BUILD-REVIEW.md) 的 report SHA `127036c4b2f1be50df11e33735d13ddf0da4e324227489797d4df3b3a6bcf9cb` 继续有效。本次把两份 runtime 的 653 个 profile frame 经过官方 runtime map，再经过原 Taro map；所有可唯一匹配的 tracked original source 都实际读回 frozen manifest。

| 已测帧 | 双级 map 确认的责任 | self 估计 B |
| --- | --- | ---: |
| ma | astronomy-core / rotateStellarDirection | 4,531,968 |
| Do | sky-stellar-transform / createSkyStellarTransform | 856,000 |
| va | astronomy-core / normalized | 640,368 |
| cn | sky-scene-render / paintCatalogPoint | 336,200 |
| set | response-cache / createResponseCache > set | 1,811,200 |

机器行列全部为零基，例如 ma runtime `(62,78442)` → authored `(1,78139)` → stellar-vectors.ts `(38,16)`；另列 GUI 一基对照为 Line 2 / Column 78140。这是函数创建调用栈／语义 owner 的映射，不是每个对象的精确分配语句，更不是引用保留链。没有使用固定偏移或当前 dirty 工作树替代采样源码。

覆盖缺口明确保留：Sky 231 帧中 4 个零 self 帧未映射到原源位置；main 422 帧中 91 帧 / 131,212 B self 未映射到原源位置。其它宿主／内建脚本只保留当前 basename/function 归属；map 中的依赖源与 tracked source manifest 绑定范围分别记录。关键 ma / set 归因已闭合，无需扩大宿主脚本导出。

已检查实际 create/use/retire 边界：共享 transform 创建四个 exact-time 数组并惰性填充；BSC 的 currentFrames 是 scene 弱键到最近时间 frame，SAO 的 transformed 是 tile 弱键到最近 geometry transform。这里未找到强键历史累积表，也没有运行时 retaining edges 证明键或旧 frame 被错误保留。任务关联 recorder 的 aFinishedValue/aRequestValue/aPaintValue 只是数值时间戳，未在这些行保留完整产品 report/frame/payload。

response-cache 的 `set` 真实执行 JSON.stringify，再交给已有 memory/dirty/persist 责任；24 项、6 MiB memory／3 MiB disk 等是**序列化内容预算，不能当作 retained JS heap 上限**。缓存有意跨单页存活，现有 replacement/freshness/invalidation/request fence 仍是退休 owner；两个加权样本没有给出具体 endpoint，也没有证明 eviction 失效。没有读取账号或缓存内容。

**B 下一必要观察是原已承诺的实际退出／资源退休和同 owner 的资源、进程回落。** 当前已经定位创建 owner，但没有可直接修的错误寿命；等该结果后，只有仍能改变修复选择的 JS 引用问题才值得做目标图／计数观察。gen24 scene-memo 继续暂停，不因 4.5 MiB 排名直接运行变体或优化。已有 CPU 和 gen22/23 负证据保留原范围，不需重复 CPU 或 allocation 资格采集。

[r7 同一 watch](R17-A1-R7-PLAY-RESULT.md) 8 行跨 85.158 s：末次相对首行 PSS +262,183 KiB、Unknown +275,080 KiB；波动后仍高。它与本 profile 既不同单位/对象范围，也没有对齐起止；不能扣去约 16 MiB 后把余数称 native/GPU 泄漏。当前 bounded Pause 已成立，精确 drain、实际退出、持续正常使用和完整 B 仍未验；较早 r2/r3 的不同 warm footprint 也不能作为匹配的性能收益比较。

原始 profile、完整 runtime URL/位置、安装源只读摘取和完整派生统计均在任务既有外部 evidence 目录；Git 结果只保留非敏感统计及来源 hash。没有操作设备、ADB、IDE、服务、预览、账号或修改产品源码、PLAN、HANDOFF、preparation；没有提交。
