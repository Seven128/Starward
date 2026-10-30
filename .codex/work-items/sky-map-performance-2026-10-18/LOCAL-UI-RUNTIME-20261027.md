# 本机UI运行副本：R6历史备份，非最新私有恢复

本次仅为继续P1/P2目标界面准备，不重做P4已完成的隔离恢复验证，也不把LOCAL_TEST当正式微信身份。建立本副本时源机新私有包密钥与性能原件尚未传齐；随后已完整接收并核验解压，且另建[最新任务库副本](LOCAL-SOURCE-RUNTIME-20261027.md)。本历史UI副本保持不变，不再作为下一启动对象，不能认证最新账号、N05或已送达R6提醒。下文旧启动命令只保当时记录，当前命令沿新副本与HANDOFF。

## 实际准备

- 原本机R6恢复栈PG/Redis仍健康；三个旧runtime都指向同一个22迁移数据库。当前代码需26，原库直接check-db失败；未迁移原库、改原配置或重启基础设施。
- 既有`E:/Dev/Starward-data/restores/r6-20261018/private`经原restore owner完整校验49文件/1,783,041B；working-r6.dump及manifest匹配。通过`.codex/work-items/data-handoff-20261018/restore.mjs restore-db`恢复到全新`starward_restore_ui_20261027`，73表逐行hash核验通过、messagesSent=0。
- 运行副本归`E:/Dev/Starward-data/development/ui-20261027`；独立runtime.private.json、session secret、缓存前缀及媒体目录，8个媒体副本与原件字节相同。秘密仅在该私有配置，不进入Git/日志/本文。原配置与媒体不写。
- 只向新数据库显式执行现有migrate.ts，补023–026。随后`backend:data:check-db`实际通过：26迁移、PUBLISHED r6、inventory `d91fd8f7fcdd68d63f9a219df11fdad13673fefa2e1a99e313a148e29676c5bd`、1544公共文件/234,624,578B。
- 写后只读复核：原R6仍22迁移且PUBLISHED；新副本26且PUBLISHED。新配置LOCAL/POSTGRES/LOCAL_TEST，仅loopback `http://127.0.0.1:8787`，关闭自动迁移和提醒，不启动worker。既有QWeather凭据缺失，真实云量成功态仍欠。

## 当前执行边界

启动新的本机API进程被自动审批审查拒绝，工具只返回“blocked by policy”，未说明更具体原因；没有改用另一通道重试。执行未发生，实读8787没有listener。已请用户在仓库终端运行既有命令并保持窗口：

```powershell
npm run dev:miniapp:published -- --config E:/Dev/Starward-data/development/ui-20261027/runtime.private.json
```

该入口再次只读核schema/锁定发布文件，再仅启动API；不能换普通`dev:miniapp`，后者会迁移默认库、启动worker并替换普通构建输出。若启动失败先查该具体边界，不重跑restore-db或给同一名字覆盖恢复。后续以实际HTTP读回确定就绪，不能从命令或配置存在推定成功。

DevTools官方0.3.11可用但登录已过期；API就绪后进入官方initializer登录及唯一项目窗口流程，再核当前新UI。物理手机、完整Play/OOM、最新私有恢复及真实身份/分享继续未验。临时新库/媒体/cache仅归本UI开发任务，后续最新恢复须另行绑定真实输入，不能把历史副本覆盖到用户的原库或手机Storage。
