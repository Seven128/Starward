# r25/gen29 普通预览性能与内存路线真机独审

2026-10-22。独立读取本轮原件、协议、源码边界、构建和实际屏幕证据；没有操作手机、IDE、服务、构建或生产代码，没有重跑压力或测试清单。本轮唯一写入是本报告。能力判断遵循[性能方法](../../skills/starward-miniapp-development/references/performance-investigation.md)、[实现独审](R25-CHECKPOINT-INTEGRATION-REVIEW-20261022.md)及用户“足够详细、能帮助排查、目标场景能正常使用”的要求，不增设必须取得某种快照格式的门槛。

## 结论与下一决策

**当前组合已通过云观星全天空、高进程内存条件下的针对性性能和内存调查资格验证。** 其价值不只是收到文件：本轮同时取得非空真实绘制的阶段成本、逻辑层具体对象的存活/回收、同一瓦片的实际缓存替换、旧聚合帧到旧缓存项的关系，并在播放仍进行时独立保存早期记录。可以把路线从“采集能力待确认”推进到“复用已验证路线，定位外层持有者并修复”。无需继续寻找一个无所不包的通用 profiler 才允许推进诊断。

这个结论的范围是当前 Android 普通预览诊断候选和这些已接入的责任边界。**外层强引用根、逻辑 V8 OOM 的完整根因及修复、全部 native/GPU 所有权和最终无泄漏验收仍未完成。** 这不是不足以开展内存排查，也不是把这些未完成结果改写成已解决。没有“所有性能问题都能由现有固定字段直接回答”的保证；新的具体归因问题需要在相同可用路线中选择其最小 owner 观察。

本次数据已经改变下一步：对所选八个瓦片，旧首项在其实际缓存值已多次替换后仍活着，且首个聚合帧明确包含这些旧项并仍存活。因此不能再把这些旧项的存活解释成“它们就是这八个瓦片尚未被替换的最新项”；应跟进旧聚合帧的外层引用。尚不支持因此直接修改 WeakMap、清空正常瓦片数据或盲改 Taro。

## 目标、构建与非空工作

- manifest、全部九个内存包和正常 Play 指标绑定一致：gen29，source `71e3a8c9af54c35124e1459f469d183184139522e9d608aa424c8ca5fa0153c6`。
- 独立重新计算冻结项目和反馈 prepared 项目的 WEAPP：两份均为 `96ff37ca9d10824983b9493146ab806539c5d19e805ca7a6a252b5ed7d8ecda3`，337文件、5,046,564B。实际 delta-typecheck 文件为 production/current 均0诊断。
- 官方反馈记录为 auto_preview 终态 success；另实看保存的 r25 标签、WeakRef 可用、20秒同次暂停文案、264.4°天空与地景，以及退出后 Map 画面。它们和运行回执共同建立本轮身份，不声称已经从手机读回完整包字节。
- `baseline-r17-1-8ckw6j5rsp.json` 与 terminal 均通过当前严格协议，terminal 与 metrics 关联通过。实际指标窗14,042ms，254次 Scene/accepted、12,192次 GL submission，failedFrames=0。BSC固定8,404行，已加载 SAO固定2,842行，选中105 tiles；亮星/暗星提交和接受数均非零。非空 SAO不等于105 tiles全部成功。
- FOV为264.3550889449854°，视口384×796.800048828125，记录的产品 mode为DAY。普通预览仍有 vConsole/开发状态；不能重新命名为完全关闭调试影响的发布基线。
- 正常控制回执 actualPlay=1次；pauseAttempt及pauseSuccess均为true，分别在20,053/20,055ms。内存 owner 记录实际 Pause=20,052ms，与源代码中同次产品 Pause 接线相符。该窗不是宿主录像时长或截图命令耗时。

本轮 draw 阶段254次均有有效墙钟时长，p50=42ms、p95=48ms，已知小计10,046ms；presentation、supplement、constellation、draw、copy、accepted以及绘制子阶段分别保留覆盖/未知值。这些足以指导责任分解，但属于 inclusive wall elapsed，不能当线程CPU或物理FPS。没有为这项资格审阅重新采集已验证的 CPU/Perfetto 路线。

## 提前保存与完整生命周期记录

原件为私有 collector 的 `baseline-r25-1-1l2go1-checkpoint-1.json` 至 `-9.json`。九份均通过新协议，source/generation一致，九份原件SHA-256均与采集期间的 arrival JSONL 一致。compact UTF-8为4,053–6,348B，低于每包32KiB上限；clock有效，ref/rejected/omitted/overflow均未报告错误。

| 序号 | 实际阶段 | 手机相对时间 ms | 宿主首次读到文件（UTC） |
| --- | --- | ---: | --- |
| 1 | baseline | 0 | 18:03:38.996 |
| 2 | active-5 | 5,092 | 18:03:43.961 |
| 3 | active-15 | 15,077 | 18:03:53.911 |
| 4 | paused | 20,052 | 18:03:58.912 |
| 5 | drain-10 | 30,054 | 18:04:08.901 |
| 6 | scope-ended | 71,540 | 18:04:50.306 |
| 7 | retired | 71,544 | 18:04:50.570 |
| 8 | drain-10 | 81,546 | 18:05:00.535 |
| 9 | end | 90,005 | 18:05:08.942 |

arrival原件为私有 performance-alternatives 下 `r25-checkpoint-arrivals-1792605796432.private.jsonl`。5秒、15秒文件在实际 Pause 和最终 end 文件之前已被独立读取并计算hash；“必须活到90秒才有内存结果”的采集缺陷在这条路径已经解决。宿主时间用于证明保存先后，不与手机时钟相减制造传输延迟。

本轮没有发生手机进程崩溃，因此不宣称做过一次新的 crash-injection 耐久试验。已保存到独立宿主的文件不再依赖手机VM继续存活；这不等于宿主突然断电、所有断网时机或任意桥故障的文件系统持久性保证。桥写入后本机读回已验证；手机是否显示每个ACK无需另起一轮压力。

surface 的 retired 钩子在 `disposed=true` 后、native teardown之前，故71,544ms是进入退休边界，不是所有native资源清理完成。到end距该入口18,461ms；Map像素证明产品已经返回，不能单凭返回画面扩大为所有资源回收。

## 逻辑内存信息与决策价值

两个实际源码钩子分别位于 `transformed.set(tile,cached)` 之后及返回真实 `resolved` 聚合帧之前。样本ID为诊断合成ID，不含原始瓦片、位置或用户数据。

1. 在5,092ms时，八个所选瓦片各有69次写入、68次替换；在15,077ms时各205/204；Pause时各273/272。八个首项与最后观察项的身份比较全部false，首项/首transform仍alive。
2. 聚合帧1的成员记录明确包含首项tile IDs 1–8。它从5秒到90秒一直alive；所选聚合帧2、4、6、7同样alive，3、5、8已在5秒记录中collected。这证明观察能区分真实对象的存活与回收，并非所有 WeakRef 一律报活或只输出总量。
3. 四种恒星数组各观察16,926次分配、3,070,158个累计array slots。首32见证均alive；recent在Pause时32alive，drain及end为24alive/8collected。选择覆盖有限，不能外推整个逻辑堆的存活率或保留字节。
4. GPU上传view/backing各观察1,436次分配、175,487,952累计byteLength。所选首队列和最终recent队列都collected；它们不能证明GL/native backing已释放，view/backing字节不能相加。

这些信息和已验证的分配/源码映射一起，提供了具体“分配点→所选对象寿命→实际缓存替换→聚合帧成员”的调查路径。它比PSS、容量或无对象身份的计数更细，并已经排除一个具体解释；但还没有“某个外层根→聚合帧1”的强引用边。记录中2/4/6/7的成员列表为空只表示未关联到首批八个entry，不代表这些聚合帧没有任何瓦片或没有占用内存。

Pause后新tracking停止，故 `latestObservedEntry` 始终只能称最后观察项，不能称暂停/退出后的当前缓存项。WeakRef观察不会报告全部堆，也没有证明每个old-generation对象经历了相同GC机会。探针有实际开销：本轮lifetime累计创建4,586个WeakRef，owner累计4,384个；保留上限有限不等于零分配或零扰动。不得据本轮单次结果计算优化收益。

## 高内存条件与未闭合的产品问题

三份进程绑定原件的PID、进程名、Activity和 `/proc/PID/stat` startTicks一致；三份meminfo原件hash均匹配回执。对外仅记数值，原始身份仍在私有目录：

| 读数阶段 | TOTAL PSS KiB | TOTAL RSS KiB | TOTAL SWAP PSS KiB |
| --- | ---: | ---: | ---: |
| 推送前Map | 1,901,266 | 2,199,352 | 34 |
| 推送后、进入Sky前Map | 2,085,400 | 2,396,440 | 34 |
| 退出后Map | 2,863,108 | 1,591,080 | 1,537,330 |

第二份文件名虽为before-play，它实际上位于进入Sky和准备全景之前；到退出后原件的设备Uptime/Realtime间隔为281,230ms，包含导航、加载、准备、20秒Play和静置。不能把总差值归一到20秒Play。TOTAL PSS、RSS和SwapPss须保留原始账户口径；RSS变小并不等于内存已经回收，也不能把TOTAL PSS直接称为物理驻留。

本轮是在已有历史占用的同一进程内完成，提供了高内存条件下仍可采集和保存的直接证据，不是新VM净增长对照。90秒内没有本轮退出/断连，最终返回Map；持续增长、既有V8 OOM和长期资源回落仍是失败或未验的产品义务。

## 与既有路线的组合边界

- 当前应用阶段记录与新对象关联：已在本轮完整正常Sky上运行，可用于性能责任和逻辑对象生命周期诊断。
- [既有MemoryInfra/GC独审](R25-MEMORY-INFRA-INDEPENDENT-REVIEW-20261021.md)：报告的是已绑定Blink renderer isolate及部分allocator/graphics类别，仍不能改称appservice堆。它的有用边界无需本轮重新采集。
- 定向Android退出/V8 fatal日志：此前已确认JSRuntimeLooper V8 OOM；本轮没有新OOM，不能制造新的OOM报告或用无崩溃覆盖既有失败。
- 所需外层根、具体native分配栈和全模块无泄漏证据仍需后续对应问题的观察。是否再使用对象图取决于那个具体问题，而非快照格式偏好。

没有发现使本轮“提前导出+实际owner关联”资格失效的P1/P2。建议将**已验证、可用于当前排查**的操作及解释写回现有性能方法，同时明确工具可用、根因定位、修复收益和最终验收是不同状态。下一步复用当前证据追踪外层持有，不重复相同20秒资格窗或历史失败Heap清单。
