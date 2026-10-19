# generation23 accepted action 实际结果

2026-10-19。**同一完整 React state 下，把最终 action 从捕获闭包换为直接 object/null，仍有显著进程内存增长。** 不采用为修复；不能据此排除整个 React/publication 边界，也不关闭正常播放 B 或真实 input-to-accepted A。

沿 [原 publication 独审](R17-PUBLICATION-REVIEW.md) 和 [新构建独审](R17-V2-INDEPENDENT-REVIEW.md)，选中完整 direct/8797 项目，一次官方自动交付完成；实际查看手机独有 `accepted-action-direct` 标识后绑定 generation23。bundle 为 `25f4742bc30f46765a286788fb10db6e81439cc7940ca6ff676738f5736d389f`，338 文件 / 5,004,508 B。gen22 全部14份外部证据已核验，旧 source 和未选中8795准备包保留。没有修改生成 JS、生产源码或8791账号服务。

## 有效负载与实际控制

准备45°后使用原产品 Play；手机实际显示04:30:06播放中，原20秒 guarded Pause 成功停在04:30:20。之后取消预览，实际恢复04:30:00，没有 Apply、pick、Sources、GC、账号/微信重启、配对或VPN变更。

同次 metrics `candidate-r17-1-nwfjxxiocs.json` 与独立 `-terminal.json` 均经严格 v2 准入和相互匹配。binding 的 generation=23、mode=direct、build-source SHA 与构建一致；它的预构建 binding 不冒充最终 bundle bytes。metrics封存13996ms，terminal保留原metrics封存事实，实际Play结果true、Pause attempt恰好一次且返回true、success恰好一次。

| 观察 | 实际值与范围 |
| --- | --- |
| CPU Scene | 519次；8404 BSC、666实际SAO、16 tiles、45° |
| 星点提交 | BSC 94458、SAO 70584；完整CPU/消费者保留 |
| 名称缓存 | 106 hits，0 miss/nativeGlyphCalls/evictions；1/256 entries |
| Page | 562 submitted / 562 completed，pending0、maxPending2，failed0、debug=false；16份有界payload采样共17957B，max1255B |
| GPU/native copy | 窗内真实copy/GL上传为0；原initial ready copy保留。冻结合成发布不能当真实accepted |
| 关联身份 | 514次presentation memo，496已消费、18未消费；无mismatch/过期，真实accepted样本0 |

## 前台进程内存

新采样器只读取首次已核RESUMED owner；13份样本均为同一前台owner，每份保留host单调时钟的查询开始/结束界限。watch包含ready、实际Play、成功Pause和drain，**不是13996ms的metrics窗，不能除以该时长算增长率**。

| KiB | watch首份 | watch末份 | 差值 |
| --- | ---: | ---: | ---: |
| Total PSS | 3047297 | 3823409 | +776112 |
| Total RSS | 1788188 | 2565188 | +777000 |
| Unknown PSS | 658456 | 1380008 | +721552 |
| Swap PSS | 1601652 | 1600764 | -888 |

watch峰值PSS为4603981 KiB。稍后独立paused-drain仍为PSS3826085 / Unknown1380044 KiB。进程已携带既有分配及约1.6GiB swap；这是有效增长机制观察，不是fresh-process基线或gen22收益百分比。PSS/Unknown不能定位具体JS/native/GPU allocator。

## 决策边界

捕获闭包不是这次增长的必要条件；直接action仍把完整record交给React。Page未见回调积压，也不等于无React/native分配。旧CPU计量的publishAccepted合计51ms仅包同步dispatch边界，不能当完整异步publication成本。

本次运行没有可用的probe `performance.now` 接口。v2按设计将514个新preparation span、控制相对时间标为unknown，**没有记成零成本**。496/514消费比例是身份计数，不能证明值得改调度的CPU浪费。旧Date.now计量保留原有限意义。后续必要编辑才处理实际时钟能力，不为了补一个工具字段重复当前阴性试验。

下一步只选择一项有源码/负载依据的剩余分配或资源生命周期边界；不重走closure/copy/finish、空profile或失败重型snapshot，不无证据缩小state/迁移writer。正常renderer/copy/caption、长时稳定尾段、退出恢复、地景motion及全部原义务仍欠。

机器结果与9份外部证据的精确bytes/hash见 [R17-ACCEPTED-ACTION-RESULT.json](R17-ACCEPTED-ACTION-RESULT.json)。外部原始媒体和内存保持原owner，不进Git。
