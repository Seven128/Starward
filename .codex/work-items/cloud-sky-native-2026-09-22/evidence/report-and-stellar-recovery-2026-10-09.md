# 报告与 SAO 当前恢复

沿 PLAN B 实施，未修订方案、改变采用或升级原生/设备/容量/图质验收。输出在 `output/cloud-sky-body-editions-2026-10-09`。

## 修前行为与责任

`stellar-recovery-before-2.log`8项/5通过/3失败：真实 SAO Hook 在隐藏的新 render 后、暂停 effect 前，旧 retry 刷新 index；新 delivered index capability 尚未交接时，旧 retry 再请求旧 tile；当前视野改变后、effect 前，retry 没有请求当前 tile。`-before-1.log`使用 fresh tile，未复现 capability 重试，后续改为真实 STALE_USABLE 回执。两份保原。

`context-request-before-1.log`在 selectedSpotId 已改变、observationContext 尚未更新时，原 Context session.begin 仍发起请求。修后同一纯 owner 同时核 selectedSpotId、mapResetVersion、spotOpenRequestVersion；仍允许同地点有效 Context 换版及已恢复 ID，沿原 pending/epoch 处理迟到。

`report-recovery-before-2.log`复现实际 retrySkyData 在 hide 后仍请求 report/catalog，以及已有 Context command 时仍请求旧 report。`-before-1.log`另外有 fixture 重复 const 声明错误，不算该项行为反例。最新 fixture 以独立 render closure 和持久 ref 运行真实页面声明，验证旧 callback 使用当前 Query callback；这项正向验证不冒修前失败证明。

## 实现与消费者

SAO Hook 的 loader ref 同时携 delivered publication；当前 retry scope 和 mounted lifetime 只调度该 CPU owner。当前匹配 capability 且已测量/选择有效时，先 update 当前 ids 再 retry。index 缺失或尺寸未测量仍能 refetch metadata，旧 owner 不获取 tile。原 ready view、3并行与6MiB预算、迟到取消、same-hash capability 退休保持；没有新增缓存或 GPU reset 语义。

Context session.canRequest 复用入口地点 tokens、当前 Context version、visible 和 pending，begin 使用同一判断。页面 reportRecoveryRef 携当前 Query/Context，canRetryReport 是同一无副作用检查，retryReport 才重置自动恢复 latch 并 refetch；retrySkyData 使用当前 catalog。全部七个原实际 JSX 报告消费者迁移：三个 selected-object、天气、状态、模拟地景和配准。组合调用在 gate 成功后才调 SAO 或 Canvas/draw；direct image 亦在 gate 前不重置 Canvas。Context lookup 使用自己 canLookup，不混入 report 请求锁。

## 有效检查及限制

`stellar-recovery-after-1.log`保一次实现中 null owner/state optional equality 漏判，修显式非空后 `-after-2.log`22通过；新增缺 index/未测量恢复检查保留。`report-recovery-after-1.log`29/26通过/3 fixture 缺依赖；`-after-2/-after-3.log`44通过。`report-consumers-1.log`4通过，含七个真实 JSX callback 配合真实 Context gate 的 dispatch 观察；不是 native tap。

`integration-10.log`完整当前 Sky/services 范围1046项/1045通过/0失败/1跳过，生产代码为本增量。其后仅增加七个 JSX consumer 的一项回归；该新增项在 report-consumers-1 及最终定向 report-recovery-after-4（45通过）执行，不把矩阵改报1047。`app-types-14.log`保新增测试 branded ContextId 类型错误；最终 `app-types-16.log`exit0。API/contracts 未改，保原各6/3类型证据。有限561输入为 source-bindings-r5.json，r1–r4保原；Context结构7/diff6 exit0，后者有原工作区LF/CRLF警告，不改变任何行尾。结构检查不核Markdown事实或替代行为。

本增量后 E 仅做只读项目身份调查：官方 project_list（miniprogram）functions.exec cell401 超五分钟无返回，本地等待终止；宿主结果与取消 UNKNOWN。`native-project-identity-2.json`记录当前监听及进程安全标记，不能确定活动项目/编译API origin。没有重新开窗/prepare/compile/导航/缓存清理/SDK连接或启动API。该独立环境记录不包含在软件561输入集合，不冒软件修复反例。

这只是软件行为、实际 Hook/页面 callback 与其合同边界，不能证明真实 WEAPP 控件、Android/iOS、图像配准、物理峰或独审。E 环境及旧控件不可见 FAILED 保原；普通 Prepared 0、质量 FAILED/STALE 与完整33项仍开放。全目标未完成，Goal active、无预算；无提交推送、清理、采购、部署、发布或外联。
