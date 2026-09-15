# 外部能力迁移暂停点 · 2026-09-16

用户要求提交全部当前变更、推送远端并暂停。此提交是进行中的保存点，整个 Goal 尚未完成；不要因为本文件、提交或历史测试通过而关闭 Goal。恢复开发等待用户明确继续。

## 恢复入口

- 本机唯一完整任务索引：`E:/Dev/Starward/output/provider-selection-and-repair/adoption-2026-09-14/INDEX.md`，先读其最新条目与 `sky-production-migration.md` 最末节。旧段落中的扫码等待、选型中、连接失败已被后续证据覆盖。
- 全部原要求、后续决定和逐场景范围：同目录 `requirements.md`、`scenarios.md`；完整16轮调研已提交在 `docs/research/miniapp-external-capabilities-2026-09-14/conversation.md`。
- 持久方案事实：`project_context/external-capabilities.md`；默认 Context 从 `project_context/global.md` 开始。
- 本机备份目录：`E:/Dev/Starward/artifacts/miniapp/backups/pause-2026-09-16/`。数据库、缓存、手机会话及完整任务资料留在 Git 排除的本地备份中，不能随源码上传。

## 当前工作

已在当前 main 源码接入 Android 完整姿态映射、会话内冻结校准、确认/取消、失效与后台恢复。研究 gen6 的冻结、确认连续、继续跟随、取消和后台恢复已有用户反馈；用户明确测试专用“恢复自动”删除不必重测。研究源入口已删除，已扫码手机快照仍保留旧按钮，未重发。

正式编译 WEAPP 已完成受控原生输入→实际生产 Canvas 六阶段观察；这不是手机传感器、绝对北向或整页合成验收。模拟器截图缺普通覆盖控件，仍需正式 Android 整页/对象命中/实际生命周期及 iOS 分支证据。最后生产修改后22项相关回归、类型检查、隔离构建及独立复核通过；之前全量587项通过不能覆盖所有后续变化。研究两份生成 bundle 都消费生产 owner，已有14项研究组合回归通过。

临时 wx 输入已停止、方法全部恢复，隔离 `weapp-check/app.js` 已按原备份逐字节恢复并关闭该项目。随后拟构建手机 LAN 包的命令在执行前被自动策略拒绝，未删除产物、未开始构建、未生成新的手机版本；不要将该尝试当作活跃构建或成功包。恢复时重新选择合适的构建清理方式。

最新已修正 Sky Context 中过时的“仍在选型”、Android compass 锚定和按幅度猜单位说法；采用资源入口及 README 已补冻结状态说明，HTML 预览的对应控件和整页构图仍待同步。旧预览不得成为第二套生产传感器实现。

仍须继续完整 Goal：实际供应商权益/天气范围、历史天气成功链路、真实 EOG 资产获取发布、原生平台选点与手动计划返回保存、地形/夜光真实配准、WISE 三级影像与 pinch、最终空状态/通知栈/辅助功能、大屏及所有适用真机场景。逐项以任务索引及 scenarios 的最新证据为准，不能只做星图或缩减原8条要求。

## 暂停保存与启动

- 本项目 Postgres 中12个 Starward 数据库已逐库导出 custom dump，全部经 pg_restore 目录读取；主库另外通过既有 backup-restore owner 恢复到独立临时数据库，schema/记录数/点位摘要一致，验证数据库随后已删除并确认不存在。
- Redis 已执行 SAVE，停止后复制完整 `/data`（RDB和AOF及manifest）。两个 `starward-miniapp-demo` 容器已正常停止，原命名卷保留。其他项目容器未操作。
- 已停止本任务开发服务/worker/watch/fixture，原8787/8789等监听已消失。临时 fixture 的内存 Context 不是持久生产数据，恢复后需通过原fixture生成器重建。
- 当前研究手机私有反馈根已复制到本机备份。旧绑定和截图不代表恢复后的输入权限；先运行 device feedback doctor，再按项目无线传输守卫获取新状态。暂停时无线可连接，但手机不在小程序前台。
- 恢复基础设施：`docker compose -f infra/miniapp/docker-compose.yml up -d`。原卷尚在时直接启动；不要先把 dump 恢复覆盖现有库。灾难恢复遵循 `tools/miniapp/backup-restore.mjs` 的新库校验方式。
- 日常开发使用现有 `npm run dev:miniapp`；需要任务测试数据时查原 fixture owner 与任务说明。重新核实端口、物理网络和构建内API地址，不复制旧LAN端点。
- IDE 只使用 `E:/微信web开发者工具` 当前新版及官方 Skill 0.3.10；旧 C 盘安装已回收，不能恢复旧窗口/旧代码。

源码保存提交使用 `[skip ci]`，避免暂停用提交自动串联部署；没有宣称新一轮全量验收或发布成功。
