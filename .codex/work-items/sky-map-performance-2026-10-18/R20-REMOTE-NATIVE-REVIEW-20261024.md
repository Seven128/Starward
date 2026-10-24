# R20 远端接力改动复核：原生 App 偏好与 Context

2026-10-24，审查范围为 `266df53ea48a65013b9a358cfc2ffeb28c274fcf..f9798d794d09332be6eac6ef8651ce50865e2d0b`。独立 reviewer `review_remote_native`，只写本报告与任务 tmp 探针，不改生产代码、PLAN、HANDOFF、依赖锁或用户数据。NightReport 由 root 单独审查，不包含在这里的通过结论中。

## 已确认发现

### P2：同一地点的新事实进入列表后，当前选中摘要、观察坐标及导航仍使用旧对象

位置：`apps/mobile/src/features/map/MapScreen.tsx:84–95,118,131`；`apps/mobile/src/state/use-decision-snapshot.ts:18`；`apps/mobile/src/features/map/map-selection-state.ts:12–14`。

选点由旧页面内按id从当前查询结果解析，改为 shell store 持有完整 `MapSpotSummary`，这是统一选择责任的正确方向。但当前只在点击标记/分配角色时更新该对象；同id列表的真实refetch没有把新事实交给选择owner，也没有把旧snapshot标为待核/过时。列表marker按新对象呈现、按id继续标为选中；摘要、route query、观察坐标与外部导航仍从旧对象读取。用户同一画面看到新旧名称，外部导航仍收到旧坐标。

**实际复现：** `tmp/r20-remote-native-selection-review.test.tsx` 挂载真实MapScreen、Zustand store、React Query和HTTP client；只替换RN/Expo显示与导航边界、网络响应。合成地点B先为31/121、旧名称，点击后真实路线请求使用它；随后invalidate `map-spots`，接口成功返回同id的32/122、新名称和closed状态。观测到列表新名称已呈现、选中摘要仍旧名称；store仍为旧坐标/旧recommended，route调用仍仅一次；点击真实导航按钮，native adapter收到旧坐标与旧名称。两种名称同时可见，测试1/1是**缺陷复现**，不是产品通过。

日志为 `tmp/r20-remote-native-selection-review.log`；结构化结果为 `tmp/r20-remote-native-selection-review-result.json`。测试没有操作设备或真实地点；closed只是允许的合成Map状态，用来区分新旧事实，不证明实际地点已关闭。

**合同依据与范围：** Source Plan `map-marker-density-surface`成功态要求选中态与摘要同步；`project_context/architecture.md`要求地点、路线、到达与风险是同一协调状态、事实变化传播到消费者。问题不是禁止保留已采用的不可变snapshot，而是当前新列表和未标过时的旧snapshot同时被当作同一当前选择。也不能为修这个问题，在选中地点暂时不在查询页时偷偷采用首项。

**建议写入原F07/Map选点owner的修复逻辑：** 保留选择id和用户角色/路线意图，给已验证的同id事实更新建立统一准入路径；按坐标、名称、状态/来源版本等实际相关字段决定更新当前snapshot及Context/route revision，或显式保留旧snapshot为待核状态并阻止其冒充当前事实。路线、天气/天文观察点、摘要和导航共同消费被接受的版本，处理旧响应、列表缺失和权限/近似坐标边界。不要另建store、在渲染时盲目改写选择，或把详情的低权限坐标自动采用成精确观察点。必要回归是同id更新后的实际marker/摘要/请求/导航一致，以及缺页/迟到结果不会替换用户选择；无需重跑整个F07矩阵。

## 应复用的已完成实现

| 责任 | 本轮判断与证据 |
| --- | --- |
| 偏好v2当前投影、责任回执、版本栅栏 | 已有完整实现，未发现必须重做的错误。读取完整runtime/state/JSON/CAS owner及实际mobile调用者；独立运行domain runtime文件20/20通过。历史receipt同时返回当前projection，退休key不自动重施，profile数量是用户数据而非LRU淘汰对象。 |
| SQLite CAS与v1归档迁移 | 条件INSERT/UPDATE是跨连接原子边界，旧字节内容寻址归档；坏schema不恢复empty。上述20项含实际SQLite多连接、重启、迁移、提交丢回复。无需重新列成“尚未开始CAS/v2”。 |
| Web原子性 | 当前已使用IndexedDB同事务get/compare/put并等oncomplete，旧Web Locks/localStorage比较写已退休。复用了已记录的实际双标签页证据，本轮没有重开浏览器重复同一试验。 |
| 实际偏好Facade/Store/Wizard | prepared key与完整候选保留、已确认不提交的first-stale可显式重试、未知退休命令不翻新、历史replay应用权威当前projection；当前profile冲突恢复和关闭/重开已存在。原生相关5文件27/27通过（runtime、storage、Wizard、decision-context、SpotScreen）。 |
| F07已解决的主链路 | 共享观星夜/精确moment、出发地与观察点区分、原子shell snapshot、动态详情id、404撤回缓存、摄影请求身份与稳定保存均已有实现及相应受控回归。此次发现只补同id事实刷新这一残余边界，不能把整组F07重新排为未实施。 |
| 私人API pending-owner | 已检查一实例in-flight、原命令持久保存、确认后readback及重试前解析拒绝的区分；本轮未运行全部通知/行程/现场HTTP持久化家族，不能据此宣称全家族独立验收。其server部分由其他reviewer负责。 |

执行命令（root完成锁定依赖安装后）：

```text
node tools/run-node.cjs --bin vitest vitest run --root packages/domain src/preferences/runtime.test.ts
20 passed

# apps/mobile cwd
node ../../tools/run-node.cjs --bin vitest vitest run src/state/preferences-runtime.test.ts src/state/preferences-storage.test.ts src/features/preferences/PreferenceWizard.test.tsx src/state/decision-context.test.ts src/features/spots/SpotScreen.test.tsx
5 files / 27 passed

# repo cwd; observation asserts the remaining defect
node tools/run-node.cjs --bin vitest vitest run .codex/work-items/sky-map-performance-2026-10-18/tmp/r20-remote-native-selection-review.test.tsx
1 passed
```

相应日志为任务tmp的`r20-remote-domain-review.log`与`r20-remote-native-affected-review.log`。广读输出发生过截断时改为定点源读取，没有把截断输出当完整源码证明。

## 保留条件，避免扩大本轮结论

- Web迁移后仍运行的旧版本页若继续写localStorage，不会自动合入IndexedDB；原证据已经明确此边界。本轮没有将其伪称跨版本兼容，也不因没有新的部署/旧页共存要求而重开已完成的当前版本CAS。若实际发布需要两版共存，应先明确旧writer退休/更新或恢复方案，再放行该部署。
- 本机React harness只证明生产组件/查询/状态和受控响应的连接。Android/iOS真实定位、导航、原生资源回收、视觉/操作效果和完整Goal仍保留；没有设备或运行服务操作。
- NightReport WIP、其它实体family完整业务与部署、未执行CI不受这里20/27通过覆盖。没有新增实现，也没有将Goal标完成。
