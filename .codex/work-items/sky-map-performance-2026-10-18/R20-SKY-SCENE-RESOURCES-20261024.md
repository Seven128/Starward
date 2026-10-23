# R20 Sky 资源家族与真实消费者（2026-10-24）

范围：在已推送的具名帧检查点 `8fdf9b6b8efe93a98ab2c798446ea057958e2310` 上，收敛同次 Canvas 绘制的资源准入、Scene 输入、实际完成、比较和来源读取。沿用唯一 PLAN R20；不将职责整理当作目标运行时、性能或 OOM 修复。具体提交身份由包含本文的 Git 检查点及远端读回确定。

## 责任与实际接线

- 新 `sky-scene-resources.ts` 管 queued `SkyCanvasResourceFrame` 与 accepted `SkyCompletedSceneResources` 的协调。页面原 viewport guard 和 native generation 准入保留；IR 另保原 scope/generation，HiPS 仍只在原有效 generation 的 draw admission 调用已有 late getter。
- Scene ports 从同一已准入 frame 组装。科学、精确时刻、视图及 Canvas identity 仍由 `sky-scene-frame.ts` 管理，不混入候选 bitmap、Map、准备缓冲或资源缓存。
- 原 successful Canvas-copy writer 仍唯一发布 picking、名称和 accepted frame。完成聚合仅承认本次 Scene 实际报告、与输入及 publication/asset/bitmap 精确匹配的光学、Prepared-region、IR、银河、HiPS 和 Body 贡献；没有完成回执不借用当前 discovery。光学精确 join 由既有 completion owner 提供，Prepared-region 复用相同规则。
- queued/accepted 比较及可见 credit、实际 Sources action 都读取同一责任。已完成 A 在 B 准备期间保留；单个原生 bitmap 退休只影响其独立 live 投影，不改历史 accepted frame 或清掉其他有效家族。IR accepted 只保实际使用的 field 与原 scope 函数，不新增持有全部候选组的闭包。
- 各家族 hooks、获取、readiness、缓存、失败恢复和退休仍归原 owner；地景实际 mask 保原 snapshot 及绘制责任。没有第二 writer、renderer、通用资源注册表、额外缓存或 TypedArray 复用。

生产改动限新资源 owner、`spot-sky-page.tsx`、既有 optical completion 与 Prepared-region adapter；受影响测试共用现 `sky-optical-page-test-support.ts`。renderer 科学算法、BSC/SAO 数据和绘制细节未改。前批 440 帧科学等价证据归 [具名帧记录](R20-SKY-FRAME-INPUTS-20261024.md)，没有冒称本批重新采集目标像素或性能。

## 检查、失败与独审

实施者的两批受影响检查分别为 8 文件 **65/65**、9 文件 **66/66**，均无失败/skip；完整 miniapp 锁定 TS5.9 noEmit exit0。初次 surface 类型遗漏与三个 VM 作用域/IR 声明不完整的失败保留；改为原真实 surface port 和共享 fixture 注入，没有弱化原断言。

root 最终从 miniapp workspace 执行：

```powershell
$env:CLOUD_SKY_SCIENCE_PUBLICATION_PATH=(Resolve-Path ../../output/sdss-science-optical-writer-1002-r1/publication).Path
node ../../tools/run-node.cjs --import tsx --test --test-concurrency=2 'src/features/sky/*.test.ts'
```

实际 **1123/1123、0 failed/cancelled/skipped、exit0，91,186.527ms**。既有 science publication 显式绑定，manifest 18,078 B、SHA-256 `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5`；未下载、重新加工或替换图片。各批不能相加冒一次全套。

任务本地日志：

- `tmp/sky-resource-family-focused-20261024.log`。
- `tmp/sky-resource-family-lifetimes-20261024.log` 为初次失败；修后 `sky-resource-family-lifetimes-fixed-20261024.log`。
- `tmp/sky-resource-family-types-20261024.log` 为初次 exit2；后续 `types-fixed` / `types-final` 同前缀日志为修后检查。
- `tmp/sky-resource-family-module-integration-20261024.log` 为 root 完整模块终态，SHA-256 `9fe0e38709a67a76ec8c892b3435acf290d4f2021d0353f858b347e4b8a42c22`。

新的只读独立审查核对 11 文件、PLAN、原生产调用及初失败/修后证据；另外执行 resource owner、optical completion、source credit、page navigation 四文件 **47/47、无失败/skip、exit0**，science manifest hash 相同。未发现该范围 P1/P2。实施与审查代理均已结束，不复用。

## 保留义务

本批 Node/VM 回归和类型检查不认证 WEAPP 像素、原生资源物理释放、六字段/Play 的真实响应、持续内存与 OOM、Map session 重建或完整 Goal。没有使用 IDE、手机、ADB、共享服务、现用/冻结构建或私有数据。8fdf9b6b 的远端 CI 不覆盖本批后续改动；提交后的相应检查按真实身份另记。
