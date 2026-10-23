# R27 gen33 正常 Sky 目标观察

2026-10-23。沿同一 PLAN 的一个正常 Play 有界观察；不是产品修复、完整 UI、持续内存或 Goal 验收。gen32 拒包不重放，采用已独审的 gen33 分包恢复。未修改生产/UI/星表/观察上限或采样窗口，未启动新扫描、强制 GC 或相邻 disable 变体。

## 实际准入及动作

- 原 Stable 一次 `start --delivery auto` 已完成 success（Root tool session26570），官方诊断 `.official-process-24c0bf76-8823-4e77-bbff-ac346a0fee34.json`；先公共 USB 实看，再 bind。无 taskId/pending/重复推送。静态主包统计与这次实际平台准入分别成立。
- Root已独立解码保留官方诊断（schema `starward-miniapp-official-process-diagnostic-v1`、encoding base64、exit0，诊断SHA `1bef9dd62333d1a805faa28c0834daecbe2a2171d8c503f56e7eb109935f679c`）：原stdout的 `ok=true/tool=auto_preview/result.success=true`；`result.info.size.packages` 中 main.size 为 **2,095,323 B**，距2,097,152 B仅 **1,829 B**。这是本代实际准入余量，不能用本地2,036,467 B推导的60,685 B代替。未因此修改已冻结包或触发新构建；后续真实候选仍需实际准入。
- feedback `starward-device-feedback-RjcWcH`，prepared `generation-000001-VdVojT/project/weapp`，phone session `starward-device-test-VyGbcx`。source `ca679bcc8c924e01855b0e3ba956716401499595125c3351f7a0d2d60777c5dc`；完整 bundle `42db0d73b829e3fc611ad081dbf7ded7f84e90eeef2afac1e9d4135b1dfbae0d`，344 件/5,117,627 B。原冻结包/maps/完整源不重建。
- 原正式 TEST 点 medium → 底部原云观星 → 原 Sky 菜单的计量 → 准备全天空 → 再开计量 → wide-play 待命 → 原产品 Play，仅一次。每次输入均用当前公共 USB 新 capture、实际查看，再紧接下一个调用输入；未用截图文件猜选点，未触碰账户或计划重试。
- 实看 `6d98141b`（UTC05:20:18.710）显示本代标签及 WeakRef 可用；`d3eb8a9f`（05:20:46.293）显示264.4°非空全天空；`575b8daa`（05:22:40.787）显示正常六字段/Play；`2e459854`（05:24:17.166）显示20:18:58、预览及恢复的 Play 图标。星图构图不用于本轮 UI 重新设计或认证全部地景像素。
- phone runtime AppID/full-phone-bytes 仍未由独立运行时读回认证；证据模式为 development feedback。任务按钮标签、正常工作负载及返回 collector 的 generation/source 是本次关联，不把 bind 的操作员断言单独当运行身份。

## 实际保存与资格

memory run `r25-1-h1dpgx`；正常 metrics/terminal run `r17-1-aktnfswg98`。两者由同一实际产品 Play owner 启动，ID 可不同；源码接线和相符的 source/generation/实际窗口共同关联，不强迫改成同一 ID。6 个 checkpoint 均通过当前 R27 严格验证，metrics/terminal 及其 match 通过 `r17-normal-input-protocol.mjs`。

| checkpoint | relative ms | query callback 观察 |
| --- | ---: | --- |
| baseline | 0 | 尚未观察 |
| active-5 | 5,097 | 本次真实观察，5,097ms |
| active-15 | 15,187 | 继续携带 active-5 |
| paused | 20,187 | 继续携带 active-5 |
| drain-10 | 30,189 | 第二次真实观察，30,191ms |
| end | 90,007 | 继续携带 drain-10 |

Date.now wall-elapsed，未观测 invalid/backward/out-of-range，effective resolution unknown；不称 monotonic 高精度。正常 terminal actualPlay1、pauseAttempt1/true、pauseSuccess1/true，Pause success20,192ms。5ms口径差来自不同 recorder，不能把独立计时字段硬设为一致。metrics 在1,110ms开始、15,182ms seal，实际覆盖14,072ms；不是20秒全部绘制量，也不转成物理 FPS。

metrics 非空资格：FOV 恒264.3550889449854°，viewport384×796.800048828125；BSC8404、已加载SAO2842、selectedTiles105，BSC版本`bsc5p-bright-stars.v3`，SAO publication `97d581f282df7c627304980d14ac4a7a0f53754f5945b1d6ef6658b4712f2b10`。acceptedCopies253、acceptedBscObjects1,181,504、acceptedSaoObjects10,373，failedFrames0；不是仅资源 HTTP200或配置已开启。场景/原正常语义复用[本代准备](R27-GEN33-SKY-PACKAGE-PREPARATION-20261023.md)，不声称每帧全像素等价或整段物理性能通过。

120秒 readonly watcher 在 Play 前已启动，实际只见前5点，终态 ended:false/observed5；Play前界面操作耗时使其先于90秒终点结束。第6点随后从同一 collector **另行实际读回及验证**，不是补造watch日志；不再次watch/Play。6点均已保存，缺少的是第6点的即时到达见证，不是终点原件。

## 结果及限定解释

active-5 与 drain-10 的8个具体样本均同render关联、renderCompleted true，IDs1–8；无 outside-render/missing callback/missing Query/duplicate/invalid/lookup/reference/owner-read error，overflow false。

| aggregate IDs | aggregate 生命 | 对应 page callback | query wrapper | Query/cache | currentOptionMatches |
| --- | --- | --- | --- | --- | --- |
| 1,2,4,6,8 | alive | alive | collected | alive / true | null |
| 3,5,7 | collected | collected | collected | alive / true | null |

两次真正 callback 观察相同。end 中 aggregate 仍是5生3灭；end 携带的 callback 字段仍是30,191ms观察，不能声称到90秒又观察过 callback。第一 aggregate 含最初8 tile IDs，这些早期数据在本轮仍有弱存活证据；数组/数量不是heap字节。原 R26 首对象存活结论与此不同run，不能拼成一条内存曲线。

8条Query弱见证没有Query去重ID，播放时空binding可共用一个Query槽；表中不表示8个不同Query，不能据此推导缓存数量增长。

8个被采样的具体 **旧 Query wrapper 已收集**，因此它们不是仍存活样本当前的强持有者；不能把存活 QueryCache 直接判为通过这些旧 wrapper 持有旧 aggregate。page callback 与 aggregate 的相同生灭缩小到尚未知的函数/其他共同 owner，但**相关性不证明 callback→aggregate 强边或最终根**。optionMatches null 是 wrapper 已收集下不可比较，既非false也非阳性。不能据此改 Query GC、拆闭包、禁用相邻特性或宣布OOM修复。

独立审查已完成，报告SHA `78c2c81b6d57ee0cd0f64b769d040905f9cce55cbe570d9775b1624a2ecd4e3e`，未发现使8条关联失效的确认P1/P2。finishWithoutRender61/265来自首8满后begin计数但不建槽，以及Pause后finish仍按active记账；unmatchedPageCallbacks184是193个共享hook入口减9个精确匹配站点，并未混入这8条样本。它们不是零异常或失败render数。当前入口仍没有匹配幸存pageFn的真实强owner；R26两次扫描函数不透明482/数组截断，不补闭包边，见[完整独核及停止结论](R27-GEN33-TARGET-RESULT-REVIEW-20261023.md)。停止该R27同问分支，不循环弱寿命/扩大扫描或随意改Query GC。

正常关联附带事实：253 intents、187 first accepted，187全部已 superseded后才首次接受；2个未消费 preparation 的已知 subtotal2ms，187个消费项 subtotal110ms但84项低于分辨率未知。不是全部准备浪费或无成本证据，也不授权任意节流/发布结构修复。当前问题是保留owner，未因此重复A压测。

## 原件与退出义务

私有 owner：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/r27-packaging-recovery-20261023`。

- `gen33-phone-feedback-originals` 完整396件/24,664,784 B；manifest `gen33-phone-feedback-originals.private.json` SHA `3ca69078c5e053330dcc851126254aff2338ab8c3a8611a55afd90869bb8e4fa`，源/副本逐件完整hash读回。
- `gen33-checkpoint-originals` 保存6点、metrics、terminal及watch共9件/164,435 B；`preservation.private.json` SHA `a3ad8076d3dd503c7da0ee93e2ac4b6076a8005f89883dd6b1da9b8f55e0ab50`，包含各文件SHA，6点绑定/严格schema及metric-terminal match实核。collector旧19件未删除或替换，本轮不清容量。
- 普通gen16恢复前完整387件/25,659,028 B另保 `ordinary-gen16-before-restore-originals`，manifest SHA `f23cca23f4f8add142444646215374ec3b271c9a36dfa7a4d22c6ab763aa6c84`。恢复普通UI候选的当前进度/绑定只见 HANDOFF，不能将诊断菜单留作UI交付。

本轮无生产修复、PSS收益或无泄漏结论。已出现的真实V8 OOM、六字段快速点按/长按、完整正常Play/Pause/drain/退出、native/GPU回收及其他完整Goal义务保留。下一决策由结果独核后写入现有HANDOFF；不把本次运行日志写进PLAN或重放已拒失败清单。

## 普通UI恢复与临时入口退休

Root已在保全普通gen16完整387件后，使用原feedback一次refresh/auto：tool session32962 exit0、官方success/no taskId，prepared `generation-000017-t4tyDI/project/dist/weapp`，bundle仍51c72f…/345件。官方诊断 `.official-process-5ca1358a-133e-4dbb-a35a-f206018e0b89.json`。只读公共USB prebind capture UTC05:30:18.793实际显示正常Map medium后才bind `starward-device-test-BM9ipt`；两次必要Back逐级收起，最新 `b47a73fe-15cf-4ce8-af1b-6eaf6a681070`（UTC05:32:00.982）已实看完整Map/terrain/LIGHT。不是重做旧UI验收或整套退出性能验收，未再打开诊断Sky。

两处本轮Temp诊断feedback在字节级原件保全、绝对路径/归属核对及无在途后，公共stop均成功、phoneDataChanged:false：gen33 `starward-device-feedback-RjcWcH`；已解决终态的失败gen32 `starward-device-feedback-oqGaEc`。失败gen32最终完整347件/5,134,968 B另保 `gen32-resolved-feedback-originals`，manifest `eb37653dd8b0d314f45bcc655c2c8ab74bbe877ff90e7790a60a90d8e194efcd`，保留原unknown/forensic failed及原官方诊断。原冻结gen32/gen33源/project/maps、Harness、collector及私有原件均未删除。当前唯一有效手机session与后续输入权只归HANDOFF；旧VyGbcx/B6W0lu无输入资格。
