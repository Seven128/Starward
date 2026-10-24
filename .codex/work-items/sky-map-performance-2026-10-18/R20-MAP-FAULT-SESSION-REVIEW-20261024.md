# R20 Map 故障 session 独立审阅（2026-10-24）

审阅者 `review_map_fault_session`。本次只读审查作者冻结的11份生产/正式测试及实际消费者，仅写本报告和自身task tmp。未改生产、正式测试、Context、PLAN/HANDOFF/INDEX、Git或依赖；未构建、操作IDE/手机/服务/网络/VPN、冻结代或上传。

## 结论与范围

**本批限定源码责任未发现未关闭的生产P1/P2。** 实际页面故障重试已经脱离同一失败节点的正常Sky清理许可；旧coordinator和文件仍留在原实例，实际迟到移除不触碰后继。整幅失败Native Map的未知状态与栅格文件债独立，真实overlay移除不能清掉前者。第一次故障允许一个后继，后续故障有明确可见的重启指引，不以timeout、JS卸载或后继updated伪造销毁确认。

这只支持本批首条故障/恢复源码路径；**不关闭目标WEAPP失败→替换→实际恢复、Native Map销毁/物理资源、完整反复故障能力或OOM义务**。本次没有取得平台销毁资格，也不从接口读不到或本地类型没有某方法推断平台永久不存在该能力。

## 独立代码核对

- 读取唯一PLAN Refactor1、F04原复现与本批实现证据、最新开发skill/performance方法、默认Context及相关Map/raster所有权。首尾两次独立核对11份冻结SHA，全部匹配；收尾原件 `tmp/map-fault-session-independent-review-20261024/source-freeze-verification.json`。
- `index.tsx::retryNativeMap` 不再调用 `suspendMapRasters`；原Sky清理、取消/恢复和已派发redirect保留原边界。My隐藏不创建新的Map session。相机、选择、Context、面板及阅读恢复没有迁入新的writer。
- `native-map-recovery` 按确切session对象及活性判断旧事件，Map使用唯一id/key；viewport/focus读者仍使用当前id。实际运行Harness三个固定id引用迁为已存在的 `.native-map`，没有重用旧native id去迁就选择器。
- session在安装effect之前注册coordinator；终结后保其原引用。coordinator只有terminal且所有实际slot文件经真实移除为空才完成 `retired`，queued-but-undispatched输入通过原generation/释放规则退出。旧context在原hook/coordinator闭包中，不能被后继同数字overlay id重新解释。
- 栅格债通知挂载读者后，仍按最新target重新安装并等本次ack才恢复来源；不会把新下载元数据当已显示结果。外部卸载后的重入不能绕过未知文件债继续扩张。整个失败Native Map的native-unknown即使没有文件、旧remove成功或页面重入也保留，只准一次故障后继；普通健康Sky路径不会额外制造这个fault状态。
- 原same-id-only透明父图规则、缺update API的既有兼容路径、valid overlap和独立层数据没有改变；未新增渲染器、router、相机writer、资源预算或伪确认接口。

## 本审阅者实际检查

| 检查 | 实际结果与含义 |
| --- | --- |
| 原作者五责任文件，加native event/viewport读者的独立批次 | **64通过、1个文件加载失败**。五责任主体60项及事件4项实际通过；额外 `terrain-viewport-read.test.ts` 从root cwd启动因 `@/services` 未选WEAPP tsconfig而在加载前失败，原件 `affected.log`。这不是65/65或生产断言失败。root另从WEAPP cwd已完成3消费者15/15，本审阅复用该修正条件结果而未重复整批。 |
| 本次独立两个真实owner分支 | **2/2通过**。见下方never-add/never-remove，原件 `late-native.test.ts` / `late-native.log`。 |
| 原63ee13b页面handler同回归入口 | **0/1失败**，实际断在 `fault retry cannot wait on the failed native cleanup`；stack为旧handler→suspendMapRasters→suspendForExit。通过既有只读preload在内存取精确旧源，不改checkout、不复制handler。当前源同用例在上述64项中通过。原件 `before-handler.log`。 |
| WEAPP工作区typecheck | **exit0**，原件 `types.log`。 |
| 冻结源/正式测试的限定diff检查 | 通过。实际编译和目标设备仍由root持有，未在本审阅运行。 |

上述自身原件统一位于 `tmp/map-fault-session-independent-review-20261024/`。根已完成workflow177/177及workspace消费者15/15，这些是可复用的其他owner结果，不冒成本审阅者新跑的独立全套。

### 额外两条有界反例

1. **首次add永不回调**：实际session注册实际coordinator、保一个非空文件；10秒原timeout后第一次fault successor可安装同overlay数字id的新文件。旧pin仍为1。迟到add只在旧context出现，然后原owner真实remove后旧pin归0；后继map仍显示自身新文件，pin为1。旧overlay清完不能准许第二次fault重建。
2. **remove永不回调**：实际add后正常suspend得到 `complete=false/remainingIds=[101]`；第一次fault后旧pin仍为1，后继同数字id安装非空内容。旧remove真实迟到完成只清旧map/旧pin，后继内容和pin不变，整个失败Map未知仍未清。

两个探针调用生产session/coordinator，控制的只有原生回调与文件retain端口；断言实际每个Map的内容和独立pin效果。结束时后继真实移除并释放其文件，所有测试进程结束，没有新服务/监听或设备状态。

## 文档与仍欠结果

Root新增的runtime-and-domain Map raster session段与本次实现一致。审阅期间另发现同文件旧段仍把所有explicit Map replacement写成先suspend；root已将其限定正常可取消Map→Sky，并把fault replacement明确交给session终端authority/有界unknown owner。收尾实际读回确认该文档冲突已关闭；外部teardown/native-GPU目标义务仍保留。本审阅没有修改该owner。

普通目标构建、真实按钮/方向/恢复、失败native节点实际替换和销毁资格、资源回落及再故障行为仍需相应目标证据；受控源码执行不能替代它们。正式2MiB、正常My/Picker、真实H4、三层持续交互、Sky六字段/正常Play和全部Goal义务均保留。
