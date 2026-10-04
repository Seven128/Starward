# C02 命名亮星发布目录与实际夜间帧（2026-09-23）

`workers/miniapp-api/src/bsc5p-http.test.ts` 的既有端到端路径从 `MEMORY_TEST` 已发表观星点取得真实 HTTP SkyReport，再拉取版本/哈希绑定的 BSC5P v2 目录，由小程序实际 `attachSkyCatalog` 和 `resolveSkySceneFrame` 展开逐时帧。本次新增当前产品合同点名的三颗亮星断言：Sirius/HR:2491、Vega/HR:7001、Polaris/HR:424 各自有正确身份、英文名、亮星量级，在该夜至少一个几何地平线以上的精确时刻出现在帧中，且方向可由现有原生天空相机投到画面中心。与原先只检查8404总行数/匿名首帧相比，这能检出命名亮星在发布物或帧中被遗漏。

从 `workers/miniapp-api` 工作目录执行 `node ../../tools/run-node.cjs --import tsx --test src/bsc5p-http.test.ts`：2/2通过；工作区根目录执行 `npm run typecheck --workspace @starward/miniapp-api`：退出0；`git diff --check`：退出0，仅既有换行风格警告。测试初稿把压缩发布帧误当点数组而报错，现使用客户端真实帧解析 owner，最终重跑全绿。

这是测试中示例点/夜间与已发布目录的端到端覆盖证据；中心投影断言不是原生 Canvas 像素或手机视觉证据，也未证明所有重要亮星、任意地点/时间、目录完整度或生产部署。没有触碰 Android、ADB、二维码、8787 共享服务或发布。C02、手机组合和整体 goal 继续开放。
