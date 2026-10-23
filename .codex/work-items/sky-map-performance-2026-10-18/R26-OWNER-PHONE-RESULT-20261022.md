# r26：有限持有关系观察的真机结果

2026-10-22交接时从既有本机原件核对。本次整理没有重新操作手机、录制、构建或修改产品。执行状态与下一步归 [HANDOFF](HANDOFF.md)，方案仍归原 [PLAN](PLAN.md)。

## 结论及范围

r26/gen30已完成完整构建、官方普通预览和实际手机采集，不再是“仅prepare、尚未上手机”。实际对象使用关联及两个已知Sky Canvas的框架入口均取得非空数据；旧aggregate的最终外层持有者仍未找到。

8个被观察的aggregate均曾进入实际accepted路径，其中3、6已回收而1、2、4、5、7、8仍存活，因此“曾被accepted”本身不能解释存活差异。8个旧tile entry/transform在各自缓存被替换275次后仍存活，aggregate 1确实包含这些首项。它们不能仅以“仍是该tile缓存最后一项”解释，但这不是完整强引用根或泄漏判定。

两次框架扫描均为`no-match-in-covered-fields`。数组检查达到既定32项上限，函数内部闭包不在覆盖范围；host-linked/alternate也不等于已识别当前提交树。**这是有限覆盖的阴性结果，不是“框架没有保留”或“已经无泄漏”。** 增大样本/扫描次数不会自动取得不可访问的引用关系。

## 身份与保存

| 项目 | 已核记录 |
| --- | --- |
| 冻结候选 | `tmp/r17-normal-a1-review-r26-usb/project` |
| generation / source | 30 / `0ea8e7ed28acf55ba0ab6e7a1978e5cc6965f0dfa56eb2a8e43abe6691074bc8` |
| bundle | `094f961aca3e7c06cb8523f7265d49f9410b37adf47a1be1b051e95eade5d043`；336文件、5,056,823 B |
| main / maps | main 2,009,199 B；31份source map留包外 |
| 手机feedback | `C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-o7dyNi`；已绑定session `starward-device-test-xiUiRL` |
| prepared | feedback下`generation-000001-5PA3YA/project`；记录中的bundle与冻结候选一致 |
| 观察记录 | memory run `r25-1-1g31tz4`，schema为`starward-r26-memory-checkpoint-v1`；normal run `r17-1-6caqd2mxh0` |
| 私有原件 | `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r24-independent-20261021/r26-owner-originals` |

`manifest.private.json`列48件、13,259,027 B；交接再次逐件核对大小及SHA-256，全部一致。包含6份memory checkpoint、normal metrics/terminal、候选/feedback/会话及既有截图与进程记录；6份memory文件均通过现有`validateR26MemoryCheckpoint`严格校验。没有上传数据。`R17-NORMAL-A1-PREPARATION.json`的`UNACTIVATED_PHONE_UNVERIFIED`为准备阶段状态，不覆盖后来的feedback及实际采集；不改写冻结原件去倒填状态。

准备记录确认完整两份bundle读回一致，生产/候选TS诊断均为0；既有[实现独审](R26-OWNER-INTEGRATION-REVIEW-20261022.md)的15项检查及30个完整生成源码事实保留。实现审查不自动等于真机结果独审或产品通过。

## 实际观察窗口

| 检查点 | 实际相对时间 ms | 框架扫描 |
| --- | ---: | --- |
| baseline | 0 | 未扫描 |
| active-5 | 5,073 | 两个入口可用，耗时33 ms，未匹配 |
| active-15 | 15,068 | 沿用5,073 ms的扫描，非新扫描 |
| paused | 20,079 | 沿用第一份扫描 |
| drain-10 | 30,081 | 新扫描的观察时间30,084 ms，耗时116 ms，未匹配 |
| end | 90,008 | 沿用30,084 ms的扫描，非新扫描 |

上述时间是墙钟经过时间，不是CPU耗时。normal terminal独立记录Play在3 ms、Pause成功在20,084 ms。6份文件保留检查点身份；本次交接没有重新证明每份文件在手机执行期间的首次到达时刻，提前落盘能力的实际验证沿用[r25结果](R25-CHECKPOINT-PHONE-RESULT-20261022.md)。

本轮memory记录内只有Play/Pause事件，没有scope-ended或surface-retired检查点。实际退出Map发生在本轮记录结束后，不能把r25的退休观察或后续Map截图填进r26的90秒窗口，更不能称本轮已经测过退出回收。

normal metrics覆盖13,965 ms，254次Scene finish/accepted，failedFrames为0；视野264.355°，BSC 8,404、实际加载SAO 2,842，DAY模式。它证明非空最大视野工作，不代表全SAO加载、夜间最终验收、发布态基准或修复净收益。带地景的现场判断沿原会话截图；本次只核原件身份，没有新增设备观察。

## 数据解释与继续使用

- 3个已观察槽位在末点为：`lifecycle-latest`和`accepted-command`指向未被选中的新对象，`draw-preparation`为空；这只描述这些槽位的观察，不是全堆排除。
- 首个及末尾弱引用样本不是总体抽样估计。array slots不是heap bytes；GPU view/backing的byteLength重叠。所选JS上传对象回收不证明原生/GPU资源已释放。
- 当前组合是Perfetto/ADB与普通预览中的定制业务诊断代码；PerfDog只调研过、未实际采用。系统/渲染层数据不自动覆盖逻辑层完整堆图。
- 已测通的是实际高负载采集及部分归因能力。完整引用链、闭包内部、全部native/GPU持有关系仍有缺口，不能说“足以解决两项问题已确认”。已有真实V8 OOM与两项产品义务保持未关闭。
- 下一步复用本轮原件，围绕旧aggregate的外层持有及已知扫描遗漏选择能改变修复决策的最小观察；不要重复相同两次扫描、只抬高上限或盲改缓存/框架。若现有观察无法区分关键原因，明确补足对应采集能力；完整堆图不是无条件格式门槛，采集成功也不是根因/修复/产品验收完成。
