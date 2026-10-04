# 原始目录中心：报告与兼容边界

本阶段始于2026-10-02，跨日继续。它只补齐唯一PLAN要求的对象区域几何输入，不认证科学影像质量、局部可辨认度或目标运行时。

`DeepSkySceneCatalogEntry.icrsCenter`保存原目录ICRS J2000的RA/Dec，数值直接来自已经核hash的OpenNGC row；不从四舍五入后的水平样本、科学出版中心或图像UV反推。新provider全部51行均携带原值，既有长短轴/PA和独立水平样本不改变。M51原值为RA202.46962499999998°、Dec47.195166666666665°；数值接近某科学出版中心也不合并两者来源责任。

字段可缺省或为null，旧缓存仍保对象事实；缺少中心不得构造精确区域。合同拒绝半个中心、字符串/数组、非有限数值和越界坐标。服务端报告cache key独立增加`catalog-icrs-center-v1`形状版本，避免在原目录/投影cache key下持续返回旧形状；目录字节未变，其hash仍为`f54b6225799d57a7fb73571cde2d38bbcb34651983ac71f3a176c2399aa8d8c5`。不是新目录出版，也不表示当前本地服务、云端或旧候选已运行新形状。

当前51行保6个缺短轴、12个缺PA，只有39个同时具备两轴和方向；M42的PA仍为null。目录维度不是当前SDSS谱带分割或科学有效mask，不能用完整几何证明图像已清晰。目录数量不限制最终要求。

实际开发记录在[第二代读回](../../../../output/catalog-center-boundary-1002-r2/result.json)。14个显式输入在执行前后保持，行为检查和合同全量类型检查通过，本次provider及其test的strict类型检查通过。删除provider中心字段的task-local变异实际失败，原生产未被变异。这里只绑定列出的关键输入/工具，不宣称完整Node传递依赖库存。

服务端全量类型检查为FAILED：7条剩余诊断在本轮未改的`sky-public-image-runtime.ts`平台全局声明/unknown c及`event-article-extraction.ts`、`worker.ts`计时器类型路径。新test最初的TS7022已修。独立限定provider检查通过不替代全量检查；原始[全量日志](../../../../output/catalog-center-boundary-1002-r2/provider-typecheck.log)和退出码2完整保留，后续构建质量义务仍开放。

目录entries的JSON由10,057B增至13,538B，即增加3,481B。此数仅是当前51条entries的序列化增量，不是整页传输、缓存峰值、服务器容量或200DAU成本；继续遵循既有报告大小和端云预算。

第一代task脚本在子检查之后、结果落盘之前，误将Windows绝对路径直接作为ESM import而失败。保留[原脚本](../../../../output/catalog-center-boundary-1002-r1/failed-script.mjs.txt)、[失败记录](../../../../output/catalog-center-boundary-1002-r1/failure.json)与日志，不追填当时未持久化的退出回执。第二代只修`pathToFileURL`和回执落盘，并在修正新test类型后重跑有界检查；第二代整体`pass=false`继续真实体现服务端全量类型检查失败，`changedBoundaryPass=true`只说明本次限定边界。

源码：[合同类型](../../../../packages/miniapp-contracts/src/types.ts)、[合同校验](../../../../packages/miniapp-contracts/src/sky-scene.ts)、[报告provider](../../../../workers/miniapp-api/src/deep-sky-scene-provider.ts)。独立几何审查与完整区域消费证据由本阶段的对象区域闭合记录统一承接；本记录不单独宣称整体采用或完成Goal。
