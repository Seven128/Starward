# ECMWF 总云量：客户端共同消费与恢复

归唯一 PLAN P2。2026-10-28 用户明确恢复实施后，在当前 main 工作树原有成果上接入；未改 PLAN、HANDOFF、页面布局/样式、SDK生成器、Map native hooks 或发布配置。未启 API/worker、未操作手机、未构建/上传/提交。此记录只证明下列软件责任，不证明全国显示、正式 OSS/CDN、目标端或完整 Goal 完成。

## 已接责任

- `state/app-store.ts` 在原持久 Context 准入边界严格复制 `weatherView.totalCloud`。合法 PINNED/UNAVAILABLE 都保留，时间表示沿共享合同规范化；坏的新字段拒绝整个恢复提示，不能变成旧 QWeather。
- `services/api-client.ts` 的普通 resolve 是统一能力声明入口；声明 `ECMWF_IFS_TCC_V1`，实际是否配置/正式 ready 继续由服务端 owner 决定。本轮没有启用开发 numeric root，也没有启新 Map raster。
- 有效 legacy Context 只在共同 restore 边界通过现有 PUT CAS 明确采纳，返回新 Context 的 revision/fingerprint 才供调用者使用。未配置仍 legacy 时只保最近一个 `{contextId,revision}`，同一结果的 Map/Sky 往返不重复升 revision；失败不覆盖原已提交选择。普通编辑确认严格保 pin；只有明确刷新或 policy+refresh 采纳能确认新 pin。
- NOT_FOUND/STALE_REJECTED（含旧 weatherView schema 失效）与 retired-ID 新建恢复都把同一 `restoreTotalCloud` 公开身份提示交给服务端准入；路线原点与目标一起继承，不各选 current。客户端核返回 canonical binding 必须相等，旧 backend 忽略/换 pin 会失败。有效 GET 也不能抹掉新合同、同 revision 偷换 pin 或返回坏 binding；更高 revision 的服务端刷新可被采纳。
- `SESSION_PRECISE` 恢复的原点和目标都携带原绝对 `restoreExpiresAt`；已过期则不再发新建请求。返回降隐私类别或延长 deadline 被拒。原 private proposal、账号 ABA、发布映射和不确定写读回规则保留。
- Sky HTTP response cache 分组从 `spot-sky:v4:extended` 隔离到 `spot-sky:v5:total-cloud`；原编辑成功后的 Map/overview/Sky cache invalidation 保留。
- `forecast-presentation.ts` 以 compact evidence 的 exact selectedAt、来源/采样身份和 `validUntil` 资格投影云量，独立于 QWeather `weatherAt+1h`。和风小时结束清其它天气及依赖它的机会值，保仍有效的新云量；云量到界后自己失效，不能回和风。Map LESS_CLOUD 也不随和风 scope 结束误清；旧空结果范围到期语义保留。
- `sky-time-presentation.ts` 的 exact/continuous Play 从报告中唯一一份 `weatherEvidence.totalCloud.value` 原生序列精确投影。同一和风小时只要求其它和风字段一致，新云量可合法变化；旧源仍检查 cloud 冲突。缺端点、过期或显式新源缺失不回和风，cloud-only 保真实几何且其它天气为空。预览不写回 Query/report。
- `content/plan/detail/plan-reference-model.ts` 对新云量独立统计，不先要求 weatherAt；其它天气仍按真实和风小时统计。`weatherStarts` 继续只表达 QWeather 小时，不能伪造为 ECMWF 源时次。

上述实现复用 shared cloud-context/cloud-point-series 合同和原消息/来源组件；没有新增交互。已读 P2 消费者与接入次序、最新交接、真实云量批次证据、development/interaction skills 和 Selected Weather Evidence。已实看当前 `increment/review-images/weather.png` 的矩阵/来源布局；没有把设计图的数据身份作为生产事实。

## 实际验证

最终一次针对全部受影响 owner 的同批 Node 检查：**111/111 PASS，0 skip**。命令使用 `node tools/run-node.cjs --import tsx --test`，文件集合为：

- `state/app-store.test.ts`
- `services/forecast-presentation.test.ts`
- `services/observation-context-cloud-client.test.ts`
- `services/observation-context-recovery.test.ts`
- `services/observation-context-private.test.ts`
- `services/observation-context-restore.test.ts`
- `services/observation-context-update-recovery.test.ts`
- `content/plan/detail/plan-reference-model.test.ts`
- `hooks/use-forecast-query.test.ts`
- `features/sky/sky-time-cloud-presentation.test.ts`
- `features/sky/sky-time-commit-continuity.test.ts`
- `features/sky/use-sky-time-geometry.test.ts`

其中持久 store 运行实际完整 store 模块；API 恢复运行实际共同函数/CAS 路径（transport 为受控端口）；Sky 使用既有 BFF 产出的真实几何合同 fixture，未接网络、账号或设备。新测试覆盖 pin 保存/坏值、统一采纳/未配置不反复 CAS、读回/恢复错 pin、精确位置 deadline、source 独立失效、cloud-only、缺 native 端点、同和风小时变化和冲突、连续 Play 的精确插值及旧缓存隔离。已有取消、迟到、hide、几何窗口与连续性回归一并通过。

开发过程中一次旧 empty-filtered-scope 回归暴露，已在原 owner 修复；两次新测试的 UTC 文本表现差异改为合同规范化/同 instant 核验，没有降低时间精度或业务断言。

## 仍未证明及集成接口

- 本批尚未取得独立审查、Root typecheck/完整 WEAPP 或目标运行时证据；由 Root 在集成节点执行。自查与上述 Node 结果不替代独审/真机。
- Root 继续负责 Map timeframe/raster、现有 Source/coverage 组件和实际页面读取。原采用天气稿的“对应小时”只能解释和风字段，ECMWF run/brackets 沿现有来源/问号披露；`weatherStarts` 为空也不能被其它 UI 消费者当成新云量全空。
- 服务端正式 registry/ready、全国基础图、旧/新完整消费者切换和回滚、OSS/CDN、连续批次及容量、当前候选可见/手势/持续 Play/物理内存/OOM 仍属原未完义务。当前客户端代码不建立这些结论。
