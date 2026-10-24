# R20 手工阶段时间与输入语义独立审查

结论：**本次冻结源码和受控实际消费者范围内通过，未发现新增 P1/P2。** 新的负半小时时差跨午夜、半小时夏令时及旧选择失效检查均走实际 Screen → client → Fastify inject／parser／domain → SQLite。它们不认证 Native 输入／布局、完整行程能力或 Goal 完成；命令权限／未知结果由配对新审阅者负责。

## 范围与责任

已读取适用 AGENTS、default／相关架构与 verification Context、当前 REQUIREMENTS 和唯一 PLAN 的手工阶段／精确时刻／既有恢复责任、Native Screen Contract、完整 UIUX Skill 与 Native mapping／wording、DESIGN Native profile，以及 Source 行程的阶段编辑、版本、时间与跨午夜要求、技术／验收和风险边界。当前旧 mobile page／control 资源仅保语义，不是本次页面的视觉依据。用户后置层叠／Sky Play 性能的顺序及其它未完义务保持，未恢复性能环境或无障碍专项。

输入为作者的 `tmp/itinerary-manual-stage-editor-20261025/source-freeze.json`，object.files **24 项（4 write／20 control）**，manifest SHA256：

`1f185853c8285f4c81c02a122eed4060770e265e88d4bbaa83f2fc348d5db4a4`

开始及结束逐件长度／SHA 全部匹配；没有改产品源码、合同、配置、PLAN／HANDOFF／Context 或 Git。原历史恢复、pending、私有 owner、UTC 和事务边界保持其已交付实现，不重做相同矩阵。

## 源码链核对

- `manual-stage-edit.ts` 是本 feature 的当地时钟适配与精确阅读 owner，依赖既有 `normalizeUtcMoment`／`validateTimeline`。所有 UTC anchor 都有明确 `Z`；IANA 格式化不依赖主机本地时区。候选 offset 来自该当地日期两侧和原瞬间，最终逐个做完整当地 roundtrip，不能把不存在的时刻向后修正为另一个瞬间。
- 已存阶段输入保留 canonical 原瞬间与完整秒／毫秒；重复小时的两个实际候选按 UTC 排序，普通单值自动确定。`MomentFields` 修改日期或时间会清旧 `selectedInstant`，只有用户新的明确选择才能提交新的歧义时刻。
- 单一 Screen 草稿经原 `patch-draft`、frozen base／key／owner 保存；`按时排序` 只重排原 domain 给出的有效阶段，不移动时刻。实际时间线和历史差异使用同一 `stageComparisonTime`，保当地摘要及完整 UTC。未增加路线／天文事实、第二时间或事务 owner。

## 三条新增独立实际旅程

检查使用原 `privateDraftHttp`，以合成行程仅准备前置状态；用户操作由原 Screen／client 发到实际 parser／service／SQLite。Native 原语、shell 初值与 storage／crypto 只沿既有测试适配边界替换。**主机 TZ 明确设为并断言 `Pacific/Honolulu`**，与被编辑的两种 IANA 时区都不同。

1. **负半小时时差与跨午夜。** `America/St_Johns` 的当地 `2026-07-02 00:45:40.004` 实际保存为 `03:15:40.004Z`；另一阶段跨当地午夜，原 `01:00:01.007Z`、结束精度均保持。用户按时排序后实际 wire／SQL 顺序一致，一次 POST 产生 revision 3，旧 revision 2 不变，实际时间线读出相同完整 UTC。
2. **半小时 DST fold 与过期选择。** `Australia/Lord_Howe` 的 `2026-04-05 01:50:20.008` 有 `UTC+11:00`／`UTC+10:30` 两次。先前选择在改时刻后失效，未重新选择时零 POST；明确第二次后实际保存 `2026-04-04T15:20:20.008Z`。重开仍选第二次，随后只改标题不携 stages，原精确瞬间保持。没有把所有 DST 变化假定为一小时。
3. **半小时 spring gap。** 同时区 `2026-10-04 02:15:00.001` 被留在本地并阻止 POST／revision 变化；明确改为真实存在的 `02:30:00.001` 后实际保存 `2026-10-03T15:30:00.001Z`，未静默平移输入，原结束时刻不变，实际阅读消费者显示完整保存值。

实际结果 **1 文件 3/3 通过**，独立于作者 26 项，不合并成产品验收计数。证据位于 `tmp/review-itinerary-stage-time-20261025/`：`time-consumers.test.tsx`、`vitest.config.mjs`、`time-consumers-v2.log` 和 `review-completion.json`。

首次临时配置因 Windows include 路径未规范化而发现零测试，原 `time-consumers.log` 保留；修正本审查临时配置后才得到上述实际执行。终态工具另有 esbuild／oxc 选择提示，未改变产品实现或断言，不将 harness 初次失败当产品缺陷。

## 收尾与仍欠

每条测试都 await unmount、Query cache 清理和实际 API／SQLite close；测试命令终态 exit 0，无 TCP listener、真实 provider 请求或遗留本审查 Node 任务。未操作手机／ADB、IDE、构建、网络、共享服务、防火墙或 VPN。

真实 Native 时区实现、输入键盘／安全区／像素和生命周期，直接拖拽、真实路线／天文窗口生成及联动，部署和完整 itinerary family 仍未验。上述纯手工阶段不是 Source `AC astronomy-timeline`、路线可执行性或完整 Goal 的替代验收；这些义务不因本次通过而取消。
