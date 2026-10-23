# R25 普通全天空内存路线与新 OOM 证据

2026-10-22（Asia/Shanghai）。本轮完成了普通预览中对象寿命的真实采集、导出和严格解析，取得第二次运行的 V8 OOM 日志，并在用户重新打开后取得包含实际页面退休的第三份观察。方法已经能提供用于缩小内存原因的信息；**尚未找到最终强引用根、修复 OOM 或完成全部资源退出回收验收**。不将可用工具等同于完整 Goal 完成。

## 候选与准备

复用当前 dirty checkout，未改生产代码。task-only r24/gen28 加入六个实际分配位置的弱见证：四类恒星变换数组、实际传给 `gl.bufferData` 的 Float32Array 和其 backing buffer。保持原数组大小、计算、提交、产品 Play/Pause 与状态发布。每位置最多保留首32及滚动32个 WeakRef，后续每16次创建选一个；固定计数和检查点，无强制GC、对象日志或强对象历史。

- source：`d42ea5e8b885927e00ac0ee71df78267d87dd4719b17fd0a7d9b005191cea9b4`。
- bundle：`c7ebcfd83650572dec468e1ce9e5b481b1abb237ab06b1e73aa9d1d6b3c8eea7`，337件、5,041,951B；主包2,008,533B，31份map在包外。
- 完整当前源码构建、0新增/0总type diagnostics、原正常路径夹具、完整包inspect和两份字节读回通过。
- [实现独审](R25-MEMORY-INTEGRATION-REVIEW-20261022.md)：23/23通过；原32KiB预算P2已修，独立保守上界31,721B，无新增P1/P2。
- 官方Stable普通auto-preview终态success；手机实看 `R17 正常Sky关联 A1 r24 USB` 和 `内存WeakRef:可用` 后绑定。该资格是 development_feedback，可见标签和本地绑定不等同于读取手机全包字节。
- 8798桥接器重启被自动审批拒绝，只返回 `blocked by policy`。root准备精确PID/创建时间/命令hash保护的脚本后，用户执行完成。root读回新进程、collector源码hash和健康200，账号路由及提醒仍关闭；8791、PG/API、VPN和配对未改。

## 第一轮：真实 Play、Pause 与静置

实际264.355°全天空和地景，BSC8,404行、已加载SAO2,842行；105个selected tile不是105个全部已加载tile。原正常Play启动后，60秒同次守护成功暂停。内存窗口内无Clock/ref错误、漏记、拒绝或溢出。

回执产品mode为 `DAY`，`enableDebug=true`，画面可见vConsole；本轮是没有真机调试连接的普通预览，不是关闭开发调试的纯生产基线。实际恒星提交非空，但不据mode字符串补造太阳光照条件或夜间模式验收。宿主调试及观察开销仍是运行条件。

| 数据 | 实际覆盖 |
| --- | --- |
| 普通输入/绘制回执 | 1,065ms开始计量，实际14,022ms；262次Scene/accepted，BSC/SAO实际提交和接受非零；零failedFrames |
| 内存Play事件 | 相对1ms |
| 实际Pause事件 | 相对60,061ms；终态回执pauseAttempt/pauseSuccess均true |
| 最后存活检查点 | 相对90,009ms，暂停后约29,948ms；90,011ms封存 |
| 内存检查点/导出 | 7个实际检查点；compact 18,439B，严格validator通过，实际本机文件34,928B |

| 实际分配位置 | Play内累计构造/数量（非保留堆） | 首32见证 | 暂停后固定recent32见证的最终状态 |
| --- | --- | --- | --- |
| vectors、positions、directions、transmissions，各自 | 各40,362数组、各7,321,146 slots | 32 alive，0 collected，约89.97秒龄 | 23 alive、9 collected |
| GPU上传view | 3,436个；累计419,856,216 byteLength | 5秒检查时已全部collected | 32全部collected |
| 同批backing | 与view相同且重叠，不能相加 | 同上 | 同上 |

首32恒星数组一共仅1,461 slots，小于单个BSC数组8,404，因此首队列只覆盖一批SAO小数组，不能声称所有旧BSC/SAO都不回收。确定性stride有槽位偏置，GPU recent恰为32×1,152B；不能外推整体保留字节/百分比。10,696个WeakRef的累计创建有观察开销，最多384个同时保存不等于零成本。

该结果排除了“这些已回收的JS上传对象被无限持有”，但不排除GL/driver资源；保留下来的SAO见证把下一调查指向旧aggregate/frame的外部持有与逻辑层收集行为。它不单独证明泄漏。

## 第二轮：计划退出前发生真实 V8 OOM

同一可见r24候选、相同全天空地景，第二次正常Play已产生另一份有效回执：2,868ms开始计量、实际12,544ms，66次Scene/accepted，BSC/SAO仍非空。root原计划在90秒封存前从产品出口离开，以区别页面存活和退休后的引用；实际出口尚未执行时，前台保护拒绝输入，随后只读OS元数据确认已回微信Launcher。

Android退出记录在00:23:05（本地时区）报告 `APP CRASH(NATIVE)`、status6，最近记录PSS约2.2GB、RSS约2.5GB。定向到该退出PID的crash/main/system缓冲分别保存179B及1,163B原件，PID/TID一致：

- `JSRuntimeLooper` 发生SIGABRT。
- V8 Scavenge：1360.2 (1407.2) →1353.3 (1406.8) MB，76.81ms，allocation failure。
- V8 Mark-Compact：1365.1 (1410.9) →1348.8 (1401.2) MB，2303.75ms，allocation failure。
- 随后 `API fatal error handler returned after process out of memory`。

这组直接日志支持**该逻辑线程中的V8内存耗尽**；OS“native crash”分类不能被解释成仅native/GPU分配器问题。日志的MB、GC前后及括号容量值保持原含义，不拿AndroidPSS相加。未识别全部保留对象或业务根，也没有证明这些数组占全部约1.35GB。

记录PID与先前r23 MemoryInfra相同，且存在此前工作负担；没有独立OS start-time/VM身份记录，不能把本轮宣称为全新进程基线或把全量增长归到新探针。第二轮没有90秒内存回执、Pause终态或真实退休见证。进程死亡不是collected证据。停止再播放、重连和Heap/GC尝试，不重复这一已失败的压力窗口。

## 第三轮：新进程中实际 Pause、退出与回收观察

用户从最近使用重新打开缓存的r24。root读回新的前台Appbrand，与已崩溃PID不同，并保存 `/proc/PID/stat` startTicks；观察后同一PID/startTicks仍在。地图像素、进入Sky后r24/WeakRef标签及全部现有bundle身份继续核对，未重推、改包、清缓存或强制GC。

原计划尽早返回，但宿主截图阅读/输入轮转带来额外时间。几次旧截图被60秒保护拒绝，未发输入；随后仅生成较小的检查用副本并实际查看，原PNG/保护规则保持，操作恢复。**6秒是录像长度，不是Play长度。** Android Back先关时间面板且实际暂停；随后点产品出口，转场后实看已回地图。实际回执：

| 事件/窗口 | 实际值 |
| --- | --- |
| 输入/绘制计量 | 14,015ms，256次Scene/accepted，8,404 BSC/2,842 SAO，264.355°，零failedFrames |
| Pause | 34,014ms |
| Scope结束 / surface退休边界 | 64,145 / 64,149ms |
| 退休后drain / 最后检查 | 74,149 / 90,002ms；退休至最后检查25,853ms |
| 封存 | 90,004ms；10检查点、无omission/clock/ref错误；compact26,095B |

60秒守护仍回报pauseAttempt=false/pauseSuccess=0，因为34秒已手动暂停；它不否定实际Pause事件，也不能写成自动暂停成功。正常surface退休事件证明该代码边界执行，不能直接认证所有GL/native驱动资源回收。

四类数组各构造26,660次、累计4,835,780 slots。首32小SAO见证到最后仍32 alive/0 collected；Pause时recent32为24 alive/8 collected，退休后为20 alive/12 collected，到90秒保持。GPU view/backing各2,284次、累计279,092,292重叠byteLength；其首批和recent见证均已collected。该样本因此真实区分了部分对象被收集与部分旧对象跨页面退休仍存活，尚无强引用根/适用完整GC证据，不能单凭存活判漏。

同进程的两次Map meminfo分别是此前进入Sky前及退出后：PSS971,430→2,095,725 KiB、RSS1,261,640→2,393,400 KiB。文件的设备Uptime/Realtime间隔861,862ms，约14分22秒，包含加载、静置、截图/菜单和播放，**不是34秒Play的独立内存增量**，未采连续峰值或全部静置曲线。Map已正常回显且进程仍在；当前停止继续施压。

新增原件：memory `baseline-r25-1-1tnmz6u.json` 49,527B / SHA `f4e09a3f3fb4722afd2bc7eb4984a7b8ef6cf017466b8c52ec996e32f34413ba`；metrics `baseline-r17-1-i90z4s1bbu.json` 52,154B / SHA `9fe7c15d0901cbcd3f534309ce21d9daf6f48912a702afd6e2643957d46172e5`；terminal 1,581B / SHA `32280897d2f15864b3186c5c191033d28c312fdfe451f6c9adf3a909f711fd4d`。三者严格协议通过，全部留本机。

## 归因与方法结果

此前[MemoryInfra/GC](R25-MEMORY-INFRA-INDEPENDENT-REVIEW-20261021.md)已经验证渲染侧分类和GC，但不覆盖这条逻辑线程。新对象寿命与fatal日志补上了不同的诊断信息，不能反向把Blink数据扩大成逻辑堆统计。

[真实owner机制实验](R25-STELLAR-RETENTION-INVESTIGATION-20261022.md)复用实际32个SAO瓦片和三个A→B→C时刻：有意持有A aggregate时首批数组存活，释放A后全部被本地GC收集；最新缓存随tile键释放而回收。它验证了实际替换机制与观察器能区分有意强根，未复现resolver自身历史链；不覆盖React/Taro/native或手机自然GC。

可复用采集组合已回写现有[开发skill](../../skills/starward-miniapp-development/SKILL.md)的[性能方法](../../skills/starward-miniapp-development/references/performance-investigation.md#memory-attribution-without-the-remote-debug-channel)：按待决问题组合普通输入关联、目标绑定MemoryInfra/GC、已知分配owner弱寿命和定向退出/错误日志。已测通的是这些明确范围的采集与解释，未宣称通用retainer或全模块内存安全。

第三轮补齐了一次真实surface退休后的同批对象观察，首批SAO仍存活。下一条能改变修复的缺失关系是旧SAO aggregate/tile与当前缓存实际替换，以及外层持有；不重复已经取得的退休窗口。考虑崩溃前封存并保留BSC首队列未覆盖、完整SAO未加载、观察负担、前两轮跨VM/PID历史和整机资源退出缺口。[外层两处调查](R25-OUTER-RETENTION-BOUNDARY-20261022.md)找到Taro children-only更新可保留旧props，但尚未关联本次对象，也未证明无界历史，故未盲改框架/依赖。未引入未经归因的缓存重写、任意节流或相邻disable变体。

## 原件与恢复

原件仅在本机私有目录，未上传。当前回执hash：

| 文件 | SHA-256 |
| --- | --- |
| baseline-r25-1-hz1xe0.json | `030ebd021f01ddfca0891a0877634d5542edc12a2a4223958d198be23cb2138e` |
| baseline-r17-1-rabtbaij77.json | `eb6dcf48de5a6941ca31ee7651b64c6ce84e83e91d0e7ef4249b9071842ee7c9` |
| baseline-r17-1-rabtbaij77-terminal.json | `357ee4ed7b3210e2ad14ec7085a9f980192475843a36165b7f2161ba6fe08196` |
| baseline-r17-2-hcf0utwzcp.json | `baa2d4c715326c689b77e6f5815215b4d13e9de978c92392c3da38ce9288468a` |

首两轮42份原件/元数据共17,983,275B已复制并逐件hash读回到既有私有根 `r24-independent-20261021/r25-phone-originals`；第三轮新增41份/20,062,668B在 `r25-retirement-originals`，同样逐件核验。检查用缩小图片可由原PNG再生，不列为原始截图。崩溃日志、退出记录和本地owner实验本就在同一私有performance-alternatives目录。冻结r23/r24、prepared、旧原件和dirty源码均保留；接收容量状态以下段为准。

当前feedback为 `starward-device-feedback-ZQBGjP`，prepared为 `generation-000001-57ft3z/project`，device session为 `starward-device-test-dpyCSM`。用户已重新打开，第三轮已回Map；所有输入仍需新鲜截图，prebinding `WzPwsC` 与旧r23 session不再用于输入。第三轮前将已完成的r23一对metrics/terminal逐字节校验备份后原件迁移到私有 `r25-phone-originals/archived-collector`，保留relocation清单；未增32文件上限。第三轮之后collector32/32，后续采集必须先保全/整理确切完成原件。未声称已清理冻结构建或窗口。
