# 换机继续：代码、数据和证据

仅复制提示词不能完整恢复本轮性能排查。代码/当前Goal/唯一PLAN/交接在Git；发布数据沿Git LFS及`data-pipelines/runtime-data/current.lock.json`恢复；本轮原始诊断和私有环境分别在交接包。Git推送不等于数据库、配置、手机Storage或原始采集已迁移。

## 当前真实状态

- 当前产品源码包含候选19：13缓存文件/索引修复，14地图接管/scale恢复，15稳定marker/可辨夜光/地形shader/Sky分配，16跨窗口按住供给和实际复制回执、地形冷格顺序，17/18星座及地形采样临时分配优化，19统一Sky披露层级以修复通知遮挡。
- 候选18已有Map/Sky、分钟/跨日按住、普通Play/Pause、返回Map/My的限定手机证据；45°下地景进入、淡灰背面、负高度天体点选和返回也有原片。候选19已构建、官方推送；用户要求换机时，19的遮挡目标回归尚未完成。不要把推送、软件检查或窄视野样本当全天/完整性能验收。
- `sky-transform-memory-analysis`只形成下一窄方案，**产品尚未修改**：`displayDirection`成功缓存后释放不再需要的`vectors[index]`引用。有效结果仅`results-v2.private.json`；v1受诊断序列化触发getter干扰已作废。宽视野样本可退休6018个冗余原射线，未减少首次构造，也没有手机heap字节/峰值/OOM结论。须先复核当前源码与实际消费者，不能当成已修项。
- 完整Goal仍未完成。全天跨字段、持续Play/内存/native-GPU/OOM、冷源到可见覆盖及P1–P6真实环境/账户/分享等义务都保留。App WIP此次随用户要求保全提交，不恢复App开发或冒其验收。
- 本机当前API为18后台，PG保留、无worker/提醒投递。官方remote曾错选VPN虚拟地址并失败，已正常结束；桌面窗口捕获也失败。普通预览debug已关闭。换机重新核实际环境，不能继承旧PID、截图授权、IP或“已连接”结论。

## 随交接恢复的内容

1. **Git代码。** 先检查接收机当前分支/dirty，再安全取得本次`origin/main`检查点；不要用reset/clean/force/stash覆盖原机工作，不切到旧`codex/remote-main-20260908`或另建worktree。产品代码检查点为`d7f808836ce11c1917a864b417487131069e09ee`，已推送/readback；后续交接文件提交保留同一产品源码19。
2. **已发布资源。** 使用现有Node运行器、lockfile和资源owner：`npm ci`（依赖确需安装时）、`npm run assets:prepare`、`npm run assets:verify`、`npm run backend:data:status`，仅缺料时`npm run backend:data:prepare`。既有r6及EOG原件的Drive备份/分片由current.lock指向；不为换机重产r6或重复上传下载全部全球TIFF。Git源ZIP中的LFS指针不是可用图片。
3. **性能证据包。** `Starward-performance-evidence-20261027.zip`包含原四份Performance/分配、后续Performance/三份Heap/Console及本批分析、必要冻结候选与实际手机原片。按下方传输步骤恢复，再解到仓库外的`Starward-data/verification/sky-map-20261018/`新目录，按包内`MANIFEST.json`校验。旧D盘/C用户目录仅是源机定位；诊断脚本需先适配接收机路径，不能整批执行旧启动/清理脚本。派生联系表可由原片重建。更早gen34仍受保护，不准用新编译替代原件。
4. **私有恢复包。** `Starward-private-recovery-20261027.zip`含当前任务库的自定义格式dump、清单和精确API私有配置。仅保密迁移，不进Git/LFS或公开共享。归档可列举不等于已完成接收机恢复；优先复用兼容的既有环境，必要时用`tools/miniapp/backup-restore.mjs`恢复到新的owned数据库并核对。按现有owner调整本机路径/地址，保会话与数据身份，不盲套源机配置，不自动迁移/启worker/重放提醒。

手机本地Storage和未保存草稿不在Git或数据库dump内；保原手机、AppID和N05，不清Storage，不重发R6。原机22GB未跟踪原始数据/数据库工具及旧锁文件原位保留，按仓库存储边界排除出Git；不是删除或丢失。两包身份及远端/本地状态由`HANDOFF-TRANSFER-20261027.json`记录，未上传就不能称远端可恢复。

## 加密传输与接收

**暂停状态：** 用户要求立即停传、另一台先开发，源机晚点续传。当前性能证据 8/19 分片已上传并逐份读回；私有恢复包已读回，密钥尚未上传。完整证据包暂不能从远端恢复。源机原ZIP、加密分片、密钥及续传清单均保留；续传前先查下一文件是否已完成在途上传，不能重复上传已核验部分。

传输状态以`HANDOFF-TRANSFER-20261027.json`为准。下载其中`packages[].parts[].transport`列出的文件，保持其`path`文件名，全部放在仓库外的同一下载目录。源归档不变：性能包314065531字节，私有恢复包693458字节。大包使用19个至多16MiB明文的加密分片，小包使用1个加密分片；沿既有`verified-backup.mjs`加密和旧交接`restore.mjs assemble`拼接，不替换旧r6恢复资料。

- 数据目录：[Starward 数据交接 2026-10-18](https://drive.google.com/drive/folders/1tA2Ue4oSAVXG7VIYvUMDz0tlen293pjz)。连接器返回的`.bin`后缀是传输命名，落盘时按manifest的`transport.path`命名。使用当前Git清单列出的文件，不从同名历史资料推测。
- 独立密钥目录：[Starward 恢复密钥 2026-10-18](https://drive.google.com/drive/folders/1kGXJFw2UP6Gm8gep5jR1H3q8fJughgBl)，取`Starward-performance-handoff-20261027.key`。密钥和下载材料保存在仓库外，不能写进Git、聊天正文或日志；Unix接收机把密钥权限设为0600。
- 在仓库根执行下列命令，把三个占位绝对路径替换为接收机实际位置；输出目录必须不存在、其父目录须已存在。脚本验证远端密文身份、GCM认证、每片明文及最终ZIP哈希，仅生成归档，不解压、不恢复数据库、不启动服务。

```powershell
node .codex/work-items/sky-map-performance-2026-10-18/scripts/restore-cross-machine-handoff.mjs --manifest .codex/work-items/sky-map-performance-2026-10-18/HANDOFF-TRANSFER-20261027.json --directory '<外部下载目录>' --key-file '<私有密钥文件>' --output '<全新恢复输出目录>'
```

恢复完成的ZIP分别解入新外部目录。性能包的旧`phone/NEXT-USER-CHECK.md`是候选18历史清单；当前候选、缺口和操作顺序以Git最新HANDOFF/PLAN为准。私有包只含当前任务库和配置，接收机必须按实际基础设施及原owner恢复，不能直接执行旧r6专用`restore-db`命令或照抄源机地址。

检查点CI实况：Context通过；Product的小程序发布代码检查通过，保全的App WIP测试因Expo `__DEV__`未定义而7项失败，其后后台/WEAPP/OCI构建均跳过。staging40456535666整体skipped，未部署。后续仅交接文件的轻量CI通过也不能替代该产品检查；不在此处扩大App开发范围或隐藏失败。

## 给下一台助手的提示词

在本机实际仓库路径的main接手《今晚去观星》微信小程序剩余Goal。先get_goal，完整读取`.codex/work-items/sky-map-performance-2026-10-18/NEXT-CHAT-PROMPT.md`，再按入口读Goal正文、要求、唯一PLAN、HANDOFF、本换机说明和最新性能证据。无Goal时用GOAL-OBJECTIVE的“Goal正文”全文创建、不设token预算；已有范围一致才续用，路径按本机位置适配，不能缩减目标。

先核代码检查点、dirty、LFS/锁定运行数据、接收的证据/私有恢复包及实际服务。源码才是事实源；不要重做已完成项、原工具选型、整批采集或索要已收到的Console/common.js。仍优先地图层叠与云观星时间模块的实际性能、内存驻留/分配/峰值和可能泄漏，OOM未解决。候选19遮挡回归和未实施的vector引用退休方案按本说明区分，继续真实分析、修复、优化，不只总结。

保main及所有本地/私有原件、冻结构建、N05和R6；不reset/clean/force/stash、另建worktree、覆盖旧电脑dirty或关闭VPN/TUN，gen34不重建。只做微信小程序及实际依赖，App WIP仅保留。允许subagent，Root统一构建/Git/共享服务和设备。用户睡觉续办期间曾明确委托推送与手机调试；恢复时先核实际目标与当前操作分工，用户采集时不并发。需要人类时先完成独立准备，再给一份最小清单。核真实CI及部署执行/跳过，不把检查、候选或交接完成冒整个Goal完成。
