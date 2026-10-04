# A3 正式 BSC/SAO 数据链（非手机开发检查）

2026-09-24。按 PLAN 核已有 owner 与真实消费者，不新建目录、时钟、投影或缓存体系。

## 当前代码责任

- 当前 Mini 对 SkyReport、搜索、详情显式请求 BSC v3；旧客户端省略版本仍由 BFF 读取 v2。当前 Mini 对 SAO 请求独立 v2 index/tile，index 的基底 BSC v3 版本及哈希必须匹配报告场景。错误基底拒绝补星而保留亮星。`sky-stellar-tile-selection.ts` 使用当前精确几何、视角和同一太阳高度绘制条件；`sky-stellar-tile-loader.ts` 对请求数、工作集字节、取消/晚响应、STALE_USABLE及显式重试单独负责。
- `sky-report-catalog.ts` 对网络200、304与离线报告同样校验帧；退休或损坏的星场只撤回星层，独立日月、目标及深空保留。静态目录客户端按版本/哈希验证，损坏缓存失效；场景 `attachSkyCatalog` 不把8404行扩展数据写回报告缓存。A1 两处可选字段修复也经这一路径。
- 旧 v2、新 v3 BSC 与 SAO v1/v2 均保留独立出版物/HTTP；正式资源及旧新兼容细节见 INDEX 已存的 Acrux/BSC/SAO 证据。未发现此次需要推倒既有代码边界的反例。

## 本轮检查

- 本地 Nest HTTP 报告→实际 BSC目录→Mini场景/绘制/点选及生产导入排除旧Gaia/Hipparcos，3/3：[API日志](a3-api-star-chain-2026-09-24.log)。
- BSC旧新版本同 Observation Context 隔离、正式v3报告+正式目录+SAO v2瓦片、旧SAO拒绝、实际HTTP index/tile、条件304、错误哈希/出版物及恢复，23/23：[版本组合日志](a3-versioned-star-composition-2026-09-24.log)。
- Mini目录缓存、报告200/304/offline降级、当前视角请求取消与恢复，28/28：[客户端日志](a3-mini-star-boundary-2026-09-24.log)。上述现有测试覆盖对应责任，不把数量视为全范围验收。
- 用专属未存在 slot `dist/weapp-check-sky-a3-0924` 完成当前源码正式WEAPP构建，退出0，3条既有CSS/包大小warning；Sky分包22文件原始894228B：[构建日志](a3-isolated-weapp-build-2026-09-24.log)。这是隔离编译层证据，不等于微信实际计量或原生画面。未写活动 `dist/weapp` / `dist/weapp-check`，未占用户IDE、手机或共享8787。

## 状态与后续

A 的三条代表链已具备非手机开发检查：报告边界 A1、图片生命周期 A2、正式星表 A3。A 的目标运行时 P1 仍开放：已知Android来源返回Canvas故障、画布与控件合成、真实手势/姿态；设备当前不可占用。整页CPU/GPU峰值与云/设备容量 P4 仍待量测。此处只允许进入不依赖手机的 B1 开发，不宣称 A 全部目标验收，更不宣称 Goal 完成。下一项以 PLAN 为准。
