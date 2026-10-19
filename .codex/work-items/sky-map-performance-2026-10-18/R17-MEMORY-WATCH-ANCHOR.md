# 内存 watch 私有主机锚点

2026-10-19。针对 [r10 普通播放离线审查](R17-A1-R10-ORDINARY-OFFLINE-REVIEW.md) 实际暴露的跨文件关联缺口，只修改 task-only `scripts/r17-sky-memory.mjs`，新增一个 `scripts/r17-memory-watch-anchor.mjs` 小辅助模块和纯 host 测试。未改产品逻辑、采样次数/间隔、ADB 操作、前台 ProcessRecord 绑定、PSS 解析或原停止条件。手机验证与完整 B 仍未验。

后续实际运行时，既有外部 `native-play-copy-trial` owner 内使用 `label-UUID.ndjson`，不再把 epoch 编入输出文件名；旁边的 `.anchor.private.ndjson` 保留 start/end 两条私有记录：

- `watchId`、采样文件名，以及 watcher、anchor helper、原 `device-adb.mjs` 的实际源字节 SHA-256。只绑定本次工具源；`productRunId=null`、`productCandidateVerified=false`，不声称已绑定当前产品候选或运行。
- 原 elapsed 起点 `startedMonotonicMs`，首尾各一次 `performance.now → Date.now → performance.now` 读区间。原采样 `sampleStartElapsedMs/sampleEndElapsedMs/elapsedMs` 与 `clock` 不变。
- 完成/失败状态、已成功写入行数和 `completedRowsSha256`。该 hash 是确认成功的行流；如果一次写入失败留下部分行，必须实际读回文件并核 hash，不能把不匹配文件当完整观察。缺 end 只代表未完整封存。

sidecar 固定写入上述外部 owner，使用独占创建及私有文件模式；不接收设备身份/任意元数据。stdout 继续只有原内存行、UUID evidence 路径和固定脱敏错误状态，不输出绝对 host 时刻、源哈希、PID、serial、activity、账号或端点；真实私有锚点不进入 Git。UUID 冲突不会覆盖原证据，失败的结束追加不会盲目重试。

这些是主机读区间，不能直接给出设备呈现或 Play 起点。`device-test.mjs` 的普通截图 `capturedAt` 在截图返回后由 `saveCapture` 取 host `Date.now`；record 路径在 `recordDevice*` 返回后取时，再保存视频与截图。它们不是设备端取样时刻或视频 PTS=0。此修复没有改 capture，也未实现自动跨文件校准。

`endpointOffsetChangeReadBracketMs` 只保留两端 wall−monotonic 读区间的差，不能约束中途时钟跳变/恢复、漂移、主机睡眠、ADB/截图延迟。两种时钟的有效分辨率保持未知；原 elapsed 仍为取整毫秒。非有限值、区间倒退、起点矛盾或端点 wall 倒退标记 `invalid_clock`，不归零、不假装校准成功。即使两端有效，也仅标 `host_endpoints_only`，不能外推或声称精确关联。没有补写任何历史 watch，旧文件名时间和新 watchId 都不作为产品 runId。

验证：`node --test .../scripts/r17-memory-watch-anchor.test.mjs` 5 项通过，覆盖私有文件/源/行流绑定、同刻不同身份、冲突保留、元数据白名单、非有限/倒退时钟及失败脱敏；只用 fake host clocks/fs，没有真实时钟取样或私有文件写入。`node --check .../scripts/r17-sky-memory.mjs` 通过。未运行或 import watcher 主入口，未连接手机、ADB、IDE、服务、preview 或 debug，未写 Git。当前没有新真机 watch 产物；实际写盘/设备运行关联仍待设备可用后的必要观察。独立审查由 root 后续执行。
