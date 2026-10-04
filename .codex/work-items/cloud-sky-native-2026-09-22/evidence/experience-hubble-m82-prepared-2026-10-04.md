# Hubble M82 成品路径：实际出版和 Scene

2026-10-04。Goal工具已读回active、无预算，短目标已生效，未新建/完成Goal。工作区、分支、HEAD保持；本轮只改云观星契约、回归、任务记录及相关Context。用户再次明确仅云观星、暂不核对已落后的设计稿；本轮查看的是实际源图和当前渲染结果。

## 已完成和发现

新M82出版成品已通过现有Prepared adapter、同母图三级、共享离线writer和当前真实Scene。来源/覆盖/成本完整盘点见[当前表](prepared-imagery-source-coverage-cost-2026-10-04.md)。**完整图质仍失败/未通过，普通registry保持空。**

1. 官方页面/权利页/JPEG各一次成功取得；新JPEG SHA256 `a552168b5cad1f87fb552bed2637cedbd70fcae98bc5f2c7bcf27af95c9a1286`。来源保留B/V/H-alpha/I及原AVM，不加工科研色、不生成细节。
2. 原2048²投影和三级已保存，但producer最后报告字段误用 `bandpasses` 而失败。当前脚本修为 `spectral_bandpass`，原执行副本/失败日志保留，没有重投影。新保存输出读回逐像素验证三级与母图中心crop/整数box一致。
3. 新cached-validation重新准入一次缓存JPEG以保存完整source admission，复用原母图，验证三级字节；该读回有自己的前后回执，不冒原producer成功。首次共享打包真实失败：TypeScript契约额外要求两AVM源轴尺度绝对值相同，而Python源owner和footprint支持独立尺度。M82实际为−1.38805562484e−5/+1.38939775733e−5度。
4. 只在 `prepared-optical-publication.ts` 去掉错误的等尺度假设，保有限值、符号、逐轴CDELT/common-x缩放关系和hash等全部校验。新回归先3通过1失败，修后四个受影响文件14项通过，见[检查日志](hubble-m82-prepared-contract-checks-2026-10-04.txt)。没有调整AVM值凑准入。修前源码留 `tmp/m82-prepared-anisotropic-before-2026-10-04/`；首次writer失败保在r1。
5. 复用新cached-validation只重跑共享打包，r2成功：publication hash `c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c`；[manifest](../../../../output/hubble-m82-prepared-publication-1004-r2/manifest.json) SHA `3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca`。这是本地候选产物，不是对外发布或默认注册。

## 实际 Scene 和未完成

复用原可复现Playwright脚本机制，只运行新M82源的八个当前Scene条件；既有M51闭合矩阵不重跑。真实PNG由browser解码，当前Scene/GPU源码bundle执行，固定相机/报告、星表不可用、软件WebGL；不代表完整page/WEAPP/手机。

[结果](../../../../output/playwright/cloud-sky-hubble-m82-scene-1004-r1/result.json)与8幅完整PNG均保存并查看：总览、中档+粗层、旋转细档+中档、退休细档、同视角中档、暮光、白天、红光观察模式。机械执行通过：实际细节可见；退休细档与中档整幅RGBA精确一致；观察模式不画图片；各帧完成后所跟踪texture object为0。原脚本无辅助分配政策，因此来源completion均null/UNKNOWN，不能称已绘署名通过。

图质观察：新图尘埃和喷流比旧候选清楚；总览和中档仍显露旋转矩形，白天/暮光也有边界。`sky-artwork-level-composition.ts` 已用maxRGB导出显示contribution，source-over混合后的图像项保留RGB，因此不是简单漏开透明或未做加法。源边界包含真实扩展结构，不能通过剪暗/统一feather把图质失败隐藏。记录来源有限视野、光学背景和局部高清需求，尚未选定合格的无缝处理/更宽背景组合。

核当前page发现 `SpotSkyPage` 只有legacy/显式calibrated optical接入；`useSkyPreparedOptical`和Prepared Scene/来源能力存在，但尚无同page显式Prepared绑定。不得把此前calibrated完整页面结果当新Prepared完整页面证据。下一依赖由PLAN维护，需复用现有target-optical owner接通显式候选，保ordinary空，然后完成来源Back、生命周期/组合和跨家族总资源；不复制一套页面或客户端缓存。

实际统计仅源压缩/三级RGBA与软件texture对象计数。未测GPU物理内存/全部临时峰值、整场家族、端云全盘或200DAU容量；不能由三个PNG推断成本验收。绝对配准、源边缘/弱结构、批量完整链、独立审查、WXML FAILED和Android/iOS新版月面缺证保持原状态。

六项Settings/outbox、其它绑定源码、分支/HEAD/暂存和原BFF/watch最终核验见[范围核验](hubble-m82-prepared-scope-verification-2026-10-04.json)。本次新增原源获取/候选不改变旧科学数据、旧M51、旧r106未收口记录；不执行旧checkpoint捕获脚本。
