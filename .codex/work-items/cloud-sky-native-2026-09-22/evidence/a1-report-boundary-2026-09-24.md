# A1 报告边界的独立失败与恢复

2026-09-24。属于 PLAN 的 A 公共底座；不新增产品范围，不宣称整个 A 已完成。

## 责任与缺陷

实际入口 `api-client.ts:getSkyReport` 经过既有 transport/cache 后调用 `projectAdoptedSkyCatalog` 及各字段 projector。网络200、缓存304和离线读都经过此链。外层响应通过不代表可选数组元素有效。

- `sky-report-planets.ts` 在几何校验之前读取每项 `body`，七项中的 null 会使整份报告抛错。改为先保留坏项给既有校验拒绝，只撤回坏行星几何；有效日月、恒星和深空仍保留。
- `sky-report-targets.ts` 在投影前读取每帧 `targets`，null 帧同样抛错。现在只过滤无对象形状的帧，保留合法目标帧及独立天层。

两处都修在现有 owner，不新增校验/缓存体系或持久格式。其它日月可选字段的 null 防护已阅读；未声称所有顶层必填形状或全部未知损坏输入已经覆盖。

## 有效反例与检查

现有 `sky-report-catalog.test.ts` transport/cache harness 调用实际 `getSkyReport` facade。新增三个行星用例和一个遍历三种响应的目标帧用例：验证独立内容非空并保持原结果、PARTIAL/STALE_USABLE状态、警告与离线准备撤回、缓存原表示不被改写；随后新完整响应恢复 FRESH/几何并清掉对应警告。

- 行星修前：3项失败，读取 null 的 body；[日志](a1-planet-boundary-before-2026-09-24.log)。
- 目标帧修前：读取 null 的 targets 失败；[日志](a1-target-boundary-before-2026-09-24.log)。
- 两处修后：catalog、planets、auth及planet-disc定向组28/28通过；[最终日志](a1-boundary-final-2026-09-24.log)。
- Mini TypeScript检查通过；[最终日志](a1-typecheck-final-2026-09-24.log)。

命令在 `apps/wechat-miniapp`：通过 `node ../../tools/run-node.cjs --import tsx --test` 运行上述既有测试文件；修前分别用 `--test-name-pattern` 筛选 `null planetary record` / `null target frame`。类型命令为 `npm run typecheck`。

## 边界

这是应用调用方/传输缓存接口替身下的行为证据，不能替代真实远端数据质量、微信原生像素、触摸/姿态或设备资源验收。本轮未构建或操作手机、用户当前IDE、共享8787、活动WEAPP输出。独立审查仍未取得。下一项仅以 PLAN 的 A2 为准。
