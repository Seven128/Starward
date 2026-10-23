# R27 当前 UI 提前落盘接线

2026-10-23。只修复已有 `r25-watch-checkpoint-arrivals.mjs` 对当前 R27/gen32 的具体接线缺口，不新增采集框架。手机仍是普通 gen14，正在等待用户配合原生双指的时机；没有运行 watcher、Play、真实 collector 写入、服务重启或新预览。

## 责任与变更

原脚本仅接受无参 / `--review-r26`，会漏掉当前 R27。现保留这两个入口，并增加有限 `--review-r27` 及其可选 `--current-ui`：分别读取原冻结 gen31 与当前 UI gen32 的固定 manifest。重复、冲突、未知参数和缺少 R27 的 current-ui 在任何文件操作前拒绝，没有通用目录覆盖。

继续使用原 R25/R26/R27 严格 protocol，在实际文件读回时校验 generation、source 和 schema，并核文件名与包内 runId/sequence 一致。并发未写完的 JSON 留到下一 tick；其他 generation 跳过，同 generation 的错误来源/协议直接失败。R27 仅补 `callbackPhase`、`callbackCapability` 和有限样本数，完整判断仍读取原 checkpoint。基线可为空，不能凭基线把回调关联认证为可用。

原 120 秒 host 观察上限、250ms tick、私有 append-only JSONL、包大小/严格 validator、collector 的 32 文件限额、不可变重送及产品内 15/20/90 秒责任均保持。watcher 只读已有 collector；没有改变产品状态或候选模板。仅为隔离测试把原记录解析与有限参数解析从同一脚本导出，直接 CLI 入口仍执行原 watch 循环。

## 已执行的有限检查

- Root 运行现有 `r27-memory-checkpoint.test.mjs` 中新增的单条 `arrival watcher` consumer 检查，1/1 通过。使用原 memory-checkpoint harness 的 gen32 baseline 和非空 active-5，检验 end 前已有真实结构数据、原 R26 兼容、错误来源/文件身份/协议、旧 generation 及并发半文件；不写真实 collector。
- `node --check` 通过。新旧参数选择由上述同一检查覆盖，没有运行真实的两分钟 watcher，也没有重跑宽资格集。
- 独立审查另行直接检查代码、隔离测试与冻结 manifest，结论见[审查记录](R27-CURRENT-UI-ARRIVAL-WATCHER-REVIEW-20261023.md)。构建时冻结的旧测试字节与新增 host consumer 测试不同；未改写任何冻结文件。

修改前原 watcher 与原测试共 2 件 / 13,679 B 已逐件复制并校验 SHA，私有 owner 为 `r19-ui-20261022/r27-current-ui-arrivals-20261023`，记录在 `before.private.json`。原 `appendFile` 的换行本来就是一个合法 `\n` 转义、文件名正则也只有一个反斜线，没有把 JSON 显示转义误判成历史缺陷。

## 真机观察的下一边界

[原桥接恢复准备](R27-LIVE-COLLECTOR-RESUME-PREPARATION-20261023.md)已定位真实 runtime 与原 collector；当前 19/32，仅是一次只读快照。先结束当前人类手势窗口，再重核当时实例和目录，沿原 owner 恢复服务并复用已冻结 gen32，不重建候选或扩大限额。

必要实际窗口才运行：

```powershell
node .codex/work-items/sky-map-performance-2026-10-18/scripts/r25-watch-checkpoint-arrivals.mjs --review-r27 --current-ui
```

这条命令**尚未执行**。运行前须确认原目录没有此前 gen32/R27 文件，保存前清单、手机 session 与新 baseline 绑定。脚本不锁定唯一新 run，可能读到同 generation/source 的启动前文件，其 end 也可结束 watch；因此 `watching` / `finished` / 文件 mtime 不能独立认证新数据或提前到达。保留旧 `currentEndAlreadyPresent` 字段的 phase 含义，它不是启动时目录清单。

第一份新、有效 R27 baseline 仅证明来源与传输；active-5 原 aggregate / callback 的非空关联、实际生命周期及选项占位才回答本轮问题。正常 metrics 与 memory 的 runId 不同，不强行相等；后续携带的旧观察不冒新扫描。真正回调到 aggregate 的闭包强边、OOM 根因、观察成本、六字段流畅度和完整 Play/退出结果均未由本次 host 修复关闭。

PLAN、生产与冻结 gen31/gen32 均未修改；未操作手机、账号、N05/R6、数据库或 VPN，未提交、推送或外传。
