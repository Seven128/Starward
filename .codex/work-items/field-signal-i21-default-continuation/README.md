# Field Signal I21 默认工作流续接入口

用户于 2026-09-06 明确要求继续未完成开发、建立宿主 Goal、保存恢复索引，**不用 Long-Task，不自举**。本目录是该 Goal 的任务局部导航与执行笔记，不是 durable Context、第二产品规范、机器验收协议或完成证明。

1. 先读本文件和 `execution-plan.md`，恢复当前工作、证据时效、下一步及外部缺口。
2. `source-index.json` 记录完整原文件的路径、字节数、SHA-256、标题行段、全部 Source marker 行段和旧 Contract 一级段；按当前范围完整读取相关段及其引用，不只读标题。大 JSON 用解析器按对象读取，不整体输出数 MB。旧原文仍是要求来源；索引不改写、不抽样或删除要求。
3. `baseline.json` 记录本轮开始 HEAD、dirty 路径及文件摘要；所有原有修改保留。它只用于归属比对，不是回滚脚本。
4. `original-goal.md` 是外部附件原 Goal 的逐字节保全副本，避免附件失效。只读历史输入，工作流选择和当前设计版本以最新明确要求及当前绑定为准。
5. 原始交接全文与附录在 `../wechat-miniapp-field-signal-i21-remaining-work-handoff-2026-09-06.md`。该文件全部产品、数据、UI、科学、失败恢复和外部边界仍需处理；其第 1/2/10/11/13 节中的 Long-Task 启动、resume、protected revision、固定 worker profile、Final Gate 和机器终态指令本次不执行。不要因为 Git 仍留有旧 active record 自动切回 Long-Task，也不要手动篡改或删除记录。

实际目标是完整 5 Surfaces、9 主路由、62 Controls、10 固定夜空中国来源样本及所有适用条件的真实 WEAPP 实现与验证。默认工作流的风险比例决定执行深度，不授权缩减明确的产品/验证范围。真机正式验收暂放意味着相关结论未验证，不能把整个 Goal 标记完成。

当前设计入口是 `tools/miniapp/selected-design-bindings.json` 中 miniapp 条目，启动时为 R11，目标仍为 constraint。精确值归根 DESIGN.md 与 owning Screen Contract/selected resources；不回退到原 Goal 的旧 handoff。不可覆盖 immutable 资源；若实现绑定必须更新，使用设计资源的 immutable 新版本路线及默认 Context/Design 变更流程，不执行旧 Long-Task 修订仪式，也不单改哈希骗检查。

每个材料性实现批次开始前，将 Architecture Deliberation 放在可观察的任务笔记/更新中；需要 durable 变更先更新 owning Context。实现后按默认 Contract Conformance（含 Engineering Quality/Architecture/selected-design）与单独 Context drift 检查收束。当前候选证据随代码、配置、输入、环境变化失效，历史记录不可升级为本轮通过。

任务更新规则：在 `execution-plan.md` 就地更新该项，写实际改动、检查命令/结果/边界、下一步和新发现的上游定位。新材料加入索引；哈希变化先读 diff 解释，不把索引的旧摘要当作 authority lock。不要存密钥、token、Cookie、设备标识、私密坐标、QR 原始数据。恢复前重新观察服务/端口/IDE/数据，旧句柄和坐标不可复用。

当前终端 Node 默认命中 v16.13.1；已确认 `C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe` 存在。测试仅在当前进程前置该目录，不修改全局 PATH。正常项目入口继续使用现有 scripts 与 owners，不创建第二测试/状态实现。

Context: no durable fact change
