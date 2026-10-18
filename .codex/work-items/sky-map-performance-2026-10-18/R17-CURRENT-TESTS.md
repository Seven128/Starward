# R17 当前 Miniapp 测试修复

2026-10-18。此记录限定于当前完整测试首轮发现的源码提取 fixture 漂移，不代表整项 Goal 或真机验收完成。

## 首轮事实

首轮完整 Miniapp `src` 测试结果为 **2,634 项：2,627 pass、6 fail、1 skip**，耗时 456,641 ms。原始日志保留于 [`tmp/r17-miniapp-current-tests.log`](tmp/r17-miniapp-current-tests.log)，没有改写或用后续通过覆盖首轮事实。

六个失败及原因：

- `sky-location-preview.test.ts`：`cross-midnight preview and cancel use the same report frame and local calendar date`。当前页面投影读取 `timeModel`、`timeGeometrySources` 和 `timeRows`，旧 VM fixture 未提供这些当前绑定，首先抛出 `timeModel is not defined`。
- `sky-page-action-ownership.test.ts`：`apply submits the live selected instant rather than the captured committed instant`。当前 Apply 成功分支读取 `timeGeometrySources`，旧 VM fixture 缺失该绑定，抛错进入恢复分支，导致测试看不到 Context write。
- 同文件：`current commit failure restores the last committed time, releases the lock, and permits a real retry`。
- 同文件：`a retired ruler cannot retract a new preview after return to the same Context`。
- 同文件：`a fresh render after return accepts new actions while the retired callback stays inert`。
- 同文件：`current callbacks still preview consecutively, locate below the horizon, track and recover after an unlock`。

后四项由旧 VM fixture 缺少当前 `timeRows` 绑定而抛出 `ReferenceError`。这些失败定位为提取消费者的环境缺失；没有据此修改生产路径。

## 修复范围

只改两份测试文件：跨午夜测试提取实际页面的 `timeRows` 声明，并调用既有 `skyTimeRulerRows`；动作所有权 fixture 提供当前 `timeRows` 与可缺省的几何来源绑定。所有原有时间、当地日期、写回、失败恢复、重试和生命周期断言保留。

同时将实际 `OrientationTimeRuler.onCommit` 回调接入动作 fixture，加入退出/过期回调隔离矩阵及一个行为用例：释放标尺只选择可取消的 `PREVIEW`，没有请求或 Context write；显式 Apply 才提交所选时刻并观察实际写回。没有恢复标尺释放自动公共提交。

## 修复后验证

在 `apps/wechat-miniapp` 工作目录运行，保留项目 `@/` alias 解析：

```text
node ../../tools/run-node.cjs --import tsx --test src/features/sky/sky-location-preview.test.ts src/features/sky/sky-page-action-ownership.test.ts src/features/sky/orientation-time-ruler.test.ts src/features/sky/sky-time-commit-continuity.test.ts src/features/sky/sky-overlay-motion.test.ts
npm run typecheck
```

结果：相关五个文件 **57/57 pass**，其中包含新增的 Apply 边界用例；Miniapp TypeScript 检查退出码 **0**。未重复完整 2,634 项测试；新完整 CI 由主任务在集成后处理。此次没有改动生产源码、共享 fixture、服务或设备状态，也没有提交、暂存或切换 Git 分支。
