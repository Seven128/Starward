# r10 普通 Play：离线审查完成，持续使用与增长归因仍未闭合

2026-10-19，独立离线审查。第二段原片可正常解码，确有正常非空 Sky 播放；终图仍为 **04:30:12／播放中**。它没有覆盖60秒、正常Pause、Map退出或非前台事件。同一watch的有效前台PSS先小降再上升，但没有可指向具体allocator、错误退休或无限缓存的新增证据。**当前不能据此离线选择产品修复；完整B继续未验。** 机器结果见 [JSON](R17-A1-R10-ORDINARY-OFFLINE-REVIEW.json)。

本次仅读取冻结原件、既有结论与匹配协议，使用已有FFmpeg解码；未操作手机、ADB、IDE、服务、preview、debug或Git，未改生产源码、PLAN、HANDOFF、INDEX。gen26 UNKNOWN、8791、N05、R6、配对与VPN未触碰。

## 原件与候选绑定

冻结档案为 `normal-existing-resume-20261019/r10-handoff-phone-away-20261019`；manifest SHA `5e5f746bcebcecb7588763a2a7e5ac8b33fa45d0524034a6ec2e95a7398f3b82` 与交接一致。选用的20份原片、PNG/sidecar、metrics/terminal和watch逐件匹配其字节及SHA，审查前后保持一致；另核完整build manifest，SHA `29993ae0f17a471b855620e8f96244238a5fb4d25fdca104b3f30a8e2c949d7b`。

继续绑定r10 app `077d3aeb3ffd874efabf9b2907cb7ef90b446305a9f029a64bf07400581c3094`、source `e7e558d27d1b0c1c0b748bfd7c8bf56e0b33aa8270e5bdcd15edb57b1ada480e`、337文件/5,003,601B。复用官方success及独有label后绑定；本次实际看过的12:30:39.976Z原PNG也含r10标签与第一run同次Pause已导出文字。仍为development feedback；runtime AppID/手机整包字节未读回。

使用原 `r17-normal-input-protocol.mjs` dispatcher：六个协议文件都与r10 templateBindings逐字匹配，**两份metrics、第一份terminal、metrics↔terminal匹配和两份source绑定全通过**，未删字段或放宽校验。第二run在冻结collector中只有metrics，无terminal。

## 实际查看范围

已有FFmpeg9.0.2解码两段H.264原片，1080×2376，timebase 1/90000；保留原PTS，不裁剪时间、不重置PTS、不补帧。共730个编码帧，仅选择12帧实际查看，另实际看6张原PNG；未声称逐帧审完或测得物理FPS。

| 原片 | 容器长度 / 帧数 | 实际查看帧索引及PTS秒 | 看到的结果 |
| --- | --- | --- | --- |
| recording-1792412648234.mp4 | 14.985700s / 414 | 0@0；1@3.139067；32@3.986600；171@8.009711；309@11.984944；413@14.949689 | 04:30:00 Play→播放中→04:30:04/08/11；片内未到Pause。 |
| recording-1792413111711.mp4 | 14.972356s / 316 | 0@0；1@2.315700；42@3.991244；162@8.076689；266@11.952733；315@14.938956 | 04:30:00 Play→播放中→04:30:04/08/11；片内未到Pause或离开前台。 |

两片开头分别有3.139067s、2.315700s编码PTS间隔；不能由此推断相同长度的产品卡顿。帧样本证明各自时刻的状态，不能补齐间隔内的物理显示。

6张原PNG的sidecar SHA、bytes、尺寸与miniapp范围均匹配：12:22:50.836Z为04:30:00/Play；12:24:08.234Z为04:30:13/播放中；12:28:06.015Z为04:31:00/预览/Play；12:30:39.976Z为r10计量面板和第一run同次Pause导出结果；12:31:21.473Z再次为04:30:00/Play；12:31:51.711Z为04:30:12/播放中。具体原名和派生帧路径均在JSON及外部绑定索引，足以复查代表帧。

## 软件计量与进程窗口

| run | 有效active metrics窗 | accepted/paint/Scene finish | 实际控制回执 |
| --- | ---: | ---: | --- |
| r17-1-594bozykj3 | 14,008ms，recording1018→seal15026 | 各474；GL submissions5688 | actualPlay1；匹配terminal pauseAttempt1/pauseSuccess1，均true；晚到Pause时间仍null。 |
| r17-2-dt880drq69 | 14,768ms，recording1013→seal15781 | 各319；GL submissions3828 | actualPlay1；metrics封存时pause0；没有后续terminal。 |

两轮都含BSC8404行、已载SAO666行/16tiles、45°视角，实际星点提交非零、failedFrames0；计量和实图支持完整正常路径实际执行。`Date.now`是wall-elapsed、非单调、有效分辨率未知；读取分别17445/11622次，未记录invalid/backward。15秒附近metrics不能扩成60秒全窗；调用计数不是物理FPS。第一轮原有60秒自身Pause结果与此次原件相符，但不能从null补造精确Pause时刻。

| watch | 有效前台行 / host窗 | PSS首→尾KiB | 允许的解释 |
| --- | --- | ---: | --- |
| ordinary-60s-play | 13 / 120.057s | 1,469,753→1,448,909 | 依既有调用顺序在第一轮Play前结束，只属准备/idle。 |
| ordinary-active-drain | 13 / 120.569s | 2,673,278→2,654,354 | 依既有调用顺序在第一轮Pause后开始，只属高位暂停观察。 |
| ordinary-matched-play-drain | 4有效+1非前台 / 67.018s | 2,621,654→2,870,073 | 同一watch末有效行较首行+248,419KiB；不能写成67秒实际Play。 |

第三watch的前台bracket为0–1689、16698–18436、33445–35182、50187–51817ms，PSS依次2,621,654、2,614,003、2,759,813、2,870,073KiB；各有效行均一个绑定前台owner、slot0，host bracket有序。66820–67018ms仅为`miniapp_not_foreground`且processes空，不填0或延续上次值。它只把最后确认前台与下一次非前台限制在相邻采样之间，不给出精确离开时间/原因。

**原watch没有绝对epoch、tap或runId锚点；视频是PTS，PNG为host capturedAt，metrics是另一相对wall窗。** 本次复用既有同次调用关系，但这些字段不足以做精确跨时钟/逐样本Play对齐。文件名日期不是采样/输入事件，67.018s是watch范围。第一轮跨文件slot0也不独立证明同PID，不能两watch相减作播放增长；不能用14秒计数除整watch内存变化。PSS/RSS/Swap和分类保持各自口径，不相加；Unknown不命名为JS/native/GPU，也不扣去r7分配估计后给余数归因。

## 决策与保留义务

复用 [r7分配及双级映射](R17-NORMAL-R7-ALLOCATION-RESULT.md)：它已指向恒星变换/BSC/SAO创建owner，已有源码审阅未发现强键历史累积或已证错误缓存寿命；response-cache序列化预算也不等于retained heap上限。复用 [r9实际退休](R17-A1-R9-PLAY-EXIT-RESULT.md)：同surface已完成尺寸1×1/selection移除，但不证明全部renderer子步骤或物理GPU释放。这里是复用既有源码及运行证据，不冒充本次重新审了所有生产生命周期。

r10普通预览提供了无desktop remote/CPU/Allocation profiler条件下的新正常Play与同watch占用变化，排除了“只剩调试资格未建立”的旧行动理由；仍不能将增长全归产品、确定retaining roots或宣称崩溃/OOM。第二原片没有发生离开前台的画面，终态缺失不能支持正常60秒完成或异常退出中的任一解释。

当前不恢复gen24、不做相邻disable、不重采CPU/Allocation资格，不据排名改缓存/退休。无需手机的交付和服务工作可继续。完整普通路径的可评估持续尾段、匹配Pause/drain、实际Cancel/Map与资源回落仍待设备可用；只有新的具体cleanup失败或会改变修复选择的保留事实才支持进一步窄观察。用户带走设备本身也不被当成这次非前台的已证原因。

外部派生目录：`E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r10-ordinary-offline-review-20261019`。`review-input-bindings.private.json`记录每个实际查看原件/帧及SHA，`receipt-validation.private.json`记录协议绑定；原片/像素/原始指标只在外部。未删除原件，没有追加设备动作或要求用户当前配合。
