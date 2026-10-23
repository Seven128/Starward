# r21 normal Play 回执预算修复（2026-10-21）

本次修复任务计量的导出阻断，不改变生产绘制、播放或交互。手机 r20 正常播放 60 秒自动暂停已由 root 观察到，但 metrics 未发送；本地 fixture 复现了同一 32 KiB writer 拒绝边界。手机修复后的实际发送仍待新候选验证，不能据此宣称性能或内存问题完成。

## 已定位的失败

- 原 100 次绘制测试没有填入真实的 preparation → request → paint → accepted 关联，核心 `linkage` 因而偏小。
- 新 fixture 执行 400 个不同播放时刻，实际建立准备、请求、绘制、接受和 Page 关联，并记录非空 BSC/SAO、Scene、draw reasons/costs 和未知耗时覆盖。原完整回执为 **34,040 UTF-8 字节**，超过 32,768。
- 其中 `linkage` 为 19,148 字节、`aCorrelation` 为 2,224 字节、`drawReasons` 为 1,200 字节、`drawCosts` 为 3,272 字节。新增绘制成本汇总使完整包越界。正常 Play 没有 ruler/geometry 事件扩展；其已有局部 entries 裁剪无法处理核心准备样本。
- 修改前运行 `node --test --test-name-pattern 'r21 normal Play with populated' .../r17-normal-input.test.mjs` 得到该 34,040 字节断言失败；修改后同例通过。保留的对照还禁用最终裁剪，以相同 fake clock/workload 确认仅中部导出样本改变。

## 最终实现与协议

- 在现有 ruler helper 增加导出时的最终整包预算函数，r20/r21 draw-cost receipt 的所有扩展附加后才调用。没有每帧序列化，也不改 recorder ring。
- 沿 v3 已有合同裁减 `linkage.links` 中部样本；`linkLimit: 32` 仍是最大值，`linkSampleTruncated` 明确省略。固定保留最早 4 / 最后 4 条，使原 `aCorrelation` 8 条关联的 prepareToken 与验证方式完全保留。
- 所有 counters、retained/expired 数量、unknown 分类、耗时分布、draw 汇总、首尾关联信息及其他字段逐项与未裁剪对照相同。没有把 missing/unknown 改为 0。
- 实际复现结果为 **34,040 → 32,464 字节**，`linkage.links` **32 → 29**，400 次准备/接受和 8 条 A 关联仍完整计数。
- controls 的 metrics 和 terminal 限额均改用已有 UTF-8 byte counter，不能用 JavaScript 字符数替代实际字节。仍为 **32,768**；没有新增字段或修改 collector/validator/protocol。
- 原 15 秒 metrics、60 秒同 run Pause、sealed snapshot、503/424 显式重试及相同字节幂等均保留。

## 固定头边界保持拒绝

最大长度公共标识数组、长整数和完整 Page 元信息压力样本在 13 条 links 时为 **32,346** 字节，协议验证通过。进一步把多个统计字段推到历史通用合同的饱和值后，最小 8 条关联的完整包仍为 **32,927** 字节：这种固定头仍被 writer/collector 拒绝，未省略固定统计、公共标识或 A 关联来伪造成功。将该压力样本的通用 mode 标识集合换回产品的 `DAY`/`NIGHT` 后为 **31,637** 字节并通过相同 validator，确认前者的拒绝边界是总预算。并不据此承诺任意合法通用合同组合必然小于 32 KiB。

依 root 决定，本轮不为这一理论组合扩协议或新增压缩传输。若下一轮真实手机仍触发固定头超限，再按真实回执调整；当前实际播放反例已修复。

## 验证与范围

- 相关唯一检查共 49 个已执行通过：当前 normal-input 38 个（含 4 次当前源码严格 TypeScript materialization）、v3 10 个、collector 1 个。完整联合运行时当时的 37 个 normal-input 全部通过；随后新增固定头测试并重跑 5 个本次聚焦回归，全通过。
- 聚焦回归覆盖：非空正常播放预算；自动 15 秒导出与 60 秒 Pause；503/424 同字节重试；manual geometry 下各统计/关联保持；历史小回执字节不变；中文、代理对与孤立 surrogate 的 UTF-8 计数；固定头过大时明确拒绝。
- 额外读取的两个历史独立 suite 在 setup 失败：`r17-a-correlation.test.mjs` 未归一化 CRLF 导致旧文本替换边界不匹配；`r17-ruler-entry.test.mjs` 的旧 position revision 边界已与当前源码不一致。本次未改这些无关旧入口，未把它们记为通过。当前 materialization 与历史协议兼容检查在上述 normal-input/v3 中通过。
- 3 个修改文件 `git diff --check` 通过。原 r21 star draw preparation instrumentation 保留。
- 未修改 builder/revision、生产源码、任何 frozen 目录、手机、服务、数据库；未构建、推送、提交或上传。独立审阅由 root 接续；实际手机导出是下一条验证。

精确文件哈希见 [机器记录](R21-BOUNDED-NORMAL-EXPORT-REPAIR.json)。
