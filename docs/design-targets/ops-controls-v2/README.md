# Starward《今晚去观星》运营端控件级开发设计稿 v2

状态：**unselected candidate Source**。本目录是一组可审查、可操作、机器可读的工程设计资源，不是生产实现，也不表示已写入 Context、`DESIGN.md`、生产代码或正式验收结论；Design Authority 是否采用仍需后续决策。

## 核心文件

- `index.html`：1440×900 优先、可响应的三栏交互图谱。左侧是范围与控件目录，中部是 12 个真实 specimen，右侧是 Visual / States / API & Logic / Motion / A11y / Assets / Acceptance 工程 inspector。
- `control-atlas-manifest.json`：冻结 coverage 到 v2 atlas 的精确 2 Outcome / 12 stable control 映射，包含 source locator、atlas locator、route、states、specimen key 与 implementation contract key。
- `implementation-contract.json`：唯一控件级开发契约权威，包含精确 token dictionary、component families、7 个 page assembly contracts、12 个 controls、traceability 与 verification。
- `README.md`：范围、使用方式、映射、权威边界与本次实际执行过的验证记录。

直接打开 `index.html` 可浏览设计稿。选择任一 stable control 后可切换它在 coverage 中声明的全部状态；右侧 inspector 会随选择和状态更新。完整 typed props、事件 payload、state machine、token 解析值、平台非适用说明、资产清单与 Given/When/Then 位于 `implementation-contract.json`。JSON Pointer 从 `#/controls/0` 到 `#/controls/11`，顺序与上游 coverage 完全相同。

## 冻结范围映射

| # | Outcome | Stable control | Route | 声明 states |
| ---: | --- | --- | --- | --- |
| 01 | `admin-data-operations` | `admin-spot-editor` | `data-operations` | `populated, conflict, disabled, saving, success, error, edge` |
| 02 | `admin-data-operations` | `moderation-queue` | `moderation` | `loading, empty, no-results, populated, disabled, saving, success, error, edge` |
| 03 | `admin-data-operations` | `data-source-dashboard` | `data-operations` | `loading, empty, no-results, fresh, stale, partial, degraded, error, disabled, edge` |
| 04 | `admin-data-operations` | `job-operations-console` | `data-operations` | `loading, empty, populated, partial, degraded, error, disabled, saving, success` |
| 05 | `admin-data-operations` | `recommendation-replay-console` | `recommendation` | `loading, empty, populated, partial, error, disabled, saving, success, edge` |
| 06 | `admin-data-operations` | `rule-release-control` | `recommendation` | `draft, precheck-blocked, owner-only, observing, promotion-disabled, saving, success, error` |
| 07 | `admin-data-operations` | `admin-access-audit` | `data-operations` | `loading, empty, no-results, populated, disabled, error, edge` |
| 08 | `quality-release-observability` | `release-promotion-gate` | `release-quality` | `draft, precheck-blocked, owner-only, observing, promotion-disabled, rollback-ready, saving, success, error` |
| 09 | `quality-release-observability` | `technical-observability-dashboard` | `release-quality` | `loading, empty, no-results, populated, stale, partial, degraded, error, disabled, edge` |
| 10 | `quality-release-observability` | `data-quality-dashboard` | `release-quality` | `loading, empty, no-results, populated, stale, partial, degraded, error, disabled, saving, success, edge` |
| 11 | `quality-release-observability` | `backup-restore-exercise` | `recovery` | `loading, empty, populated, failed-validation, disabled, saving, success, error, edge` |
| 12 | `quality-release-observability` | `product-metrics-dashboard` | `metrics` | `loading, empty, no-results, populated, stale, partial, degraded, error, disabled, edge` |

`share-projection` 仅是页面装配辅助投影，manifest 明确标记为 `stableControl: false`，不计入 12，也没有第 13 个 stable contract。

## REV-43 演示路径

在 `admin-spot-editor` 选择 `conflict`，依次执行结构化 diff、校验阻断、校验确认、影响预览、影响确认和精确文本确认。只有完全一致的 `REV-43` 才会启用提交；错误字符串保持提交禁用。提交后使用确定性“完成请求（样例）”或“模拟请求错误”演示异步分支：错误路径保留 `idem_REV43_SAMPLE` 并可用同一幂等键重试；成功路径生成 `AUD-REV-43`；恢复 revision 42 后显示 `AUD-REV-43-RECOVERY`。全过程只修改本地设计样例状态，不调用真实 API。

## 权威边界

- stable identity、顺序、route 与声明 states：上游 `coverage-manifest.json`。
- 产品语义与运营约束：冻结 Source Plan。
- 颜色、排版与布局 token：Open Design `user:design-md` 与冻结 `C:\Dev\Starward\DESIGN.md`。
- 控件级开发契约：本目录 `implementation-contract.json`，不在 HTML 中建立第二份权威。
- `index.html`：契约的可操作视觉投影；不是生产代码。

所有冻结输入均按只读方式消费，未修改上游页面原型、coverage、说明、v1 图谱、项目 `DESIGN.md`、Source Plan 或资源审计契约。

## 本次实际执行的验证

验证日期：2026-07-22（Asia/Shanghai）。以下只描述本地候选资源实际执行过的检查，不外推到生产系统：

- JSON parse：`control-atlas-manifest.json` 与 `implementation-contract.json` 均成功解析。
- JS parse：`index.html` 唯一内联脚本通过 JavaScript 解析；无外部脚本、字体、图片、CDN 或网络依赖。
- 静态契约检查共 68 项通过：精确 2/12、control ID 唯一、顺序 / Outcome / route / states / interactions 与冻结 coverage 一致；12 个静态 DOM specimen 按顺序存在；share projection 被排除；所有必需控件字段存在；所有 token 引用可解析；每控件 acceptanceScenarios 为 2–5 条；所有声明状态为 applicable，其余状态均含 `not-applicable` 与 reason；静态 DOM ID 唯一；CSS/HTML hex 仅使用注册色板；7 个 inspector 分区与 REV-43 静态入口存在。
- 浏览器逐状态检查：除 REV-43 专项控件外的 11 个控件共 102 个声明状态逐一切换成功，每次更新控件本体状态；每个控件完成后 inspector 同步并恢复初始状态。
- REV-43 交互检查：实际走通 diff → validation blocker → checkbox gate → impact gate → 错误 `REV-4x` 阻断 → 精确 `REV-43` 启用 → saving / `idem_REV43_SAMPLE` → 模拟错误 → 同键重试 → success / `AUD-REV-43` → recovery / `AUD-REV-43-RECOVERY`。
- 键盘与焦点：状态组方向键移动焦点、Enter 切换并恢复状态；inspector tab 方向键切换到 API & Logic；键盘焦点计算样式为蓝色实线轮廓；820px drawer 打开后焦点进入首个 tab，Escape 关闭并返回“工程 Inspector”触发器。
- Reduced motion：实际模拟 `prefers-reduced-motion: reduce`；匹配为 true 时 specimen `animation-name: none`、动画与 transition 时长为 `0s`、transform 为 `none`；随后恢复 no-preference。
- 响应式溢出：在 1920、1440、1366、1024、820、768、600、430、390、360px 宽度逐一检查，页面与主内容均无水平溢出；1440×900 保持三栏，1024px 以下 inspector 改为 drawer，900px 以下目录改为顶部导航。
- 触控目标：修正后实际检查 134 个可见 button、24 个两侧导航链接、2 个文本输入与 3 个可见 checkbox label 目标，均不小于 44×44px。
- 运行时 DOM 与控制台：12 个 specimen 的运行时顺序与 coverage 一致，109 个声明 state button 存在，运行时 DOM ID 无重复，最终交互检查控制台 error 为 0。

这些结果仅说明本地候选设计资源在上述范围内通过自测；未验证真实认证、权限、Provider、数据库、遥测、发布、备份、恢复、质量结果或生产 API。
