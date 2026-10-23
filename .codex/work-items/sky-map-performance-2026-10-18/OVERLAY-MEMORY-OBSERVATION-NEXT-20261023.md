# Map 叠层资源观察的最小下一动作

2026-10-23，准备及 Root 追加授权下的任务 helper 最小修订。只改原 `r17-sky-memory.mjs` 和原匹配 `r17-memory-watch-anchor.test.mjs`；未运行 watcher/checkpoint 真实入口、ADB、capture、meminfo、IDE、HTTP 或服务，未改生产代码、PLAN、Context 或 r25 原件。当前候选/手机所有权仍由 HANDOFF 和 Root 管理，本报告不授予输入权。

## 待决问题与已有答案

只问：普通 gen14 Map 的地形＋LIGHT 在原本必要的跨覆盖/有限连续 pan 后，关闭两层并静置，是否仍有同一进程实例内持续的资源压力信号，值得进入叠层资源 owner 归因？不要求为内存再重复手势、不制造冷缓存、不强制 GC、不进入 Sky/Heap/SDK 资格流程。刚切换静态地形成品是新的服务/数据条件，旧动态输入与新成品输入不能作为同条件性能对照。

- `scripts/r17-sky-memory.mjs` **可直接用于 Map**。它没有 Sky/Play、星表、页面注入或业务服务依赖；名字不限制目标。通过当前前台 Activity 的唯一 RESUMED ProcessRecord 选择 Appbrand，再核 MEMINFO 进程头，末尾复核前台。支持 `once|watch`、1–13 点、2–20 秒间隔及显式 `usb|wireless`，不发输入。
- 旧 r7 实际 Sky→Map watch 曾跨导航/Map 加载后下降，r20 暂停后 5 点仍处高位，r25 Map 前后样本包含较长准备/导航阶段。这些证据已证明路线可采资源数据，也已证明不能把总窗口差归给一个手势或 Play；不应为资格再采一次。见 [r7](R17-A1-R7-EXIT-RESULT.md)、[r20](R20-NORMAL-PLAY-DRAIN-RESULT.md)、[r25](R25-CHECKPOINT-PHONE-REVIEW-20261022.md)。

## 现有字段、强度和最小绑定差异

现有 r17 每点输出 `sampleStartElapsedMs` / `sampleEndElapsedMs`、`clock=host.performance.now`、状态、`foregroundOwnerVerified`，以及 KiB 的 `totalPss`、`totalRss`、`totalSwapPss`、Native/Dalvik/Unknown/GL/EGL/Other mmap/.so 分类与 summary 分类。字段实际后缀为 `KiB`；缺失为 null，有效 0 保留。采样是顺序 ADB 读取的主机 bracket，非一个设备瞬间；分类/summary 有重叠，不相加。

anchor 已有独立 watchId、工具源 SHA、首尾 host 读区间、成功行数/行流 SHA。它明确 `productRunId=null`、`productCandidateVerified=false`：仅工具绑定，不能自动绑定 gen14。实际运行时在现有私有证据 owner 的小回执中引用当前 feedback/generation/session、完整 bundle 指纹、普通预览/vConsole 条件、静态地形数据/服务版本和阶段观察；不改写 anchor 的 false，不把 watchId 当业务 runId。

**原 r17 的严格实例缺口已在本次任务 helper 内补齐，真实设备运行仍未验。** 原先仅比较 PID/name/activity；现在每次 meminfo 前后均读取 `/proc/PID/stat`，核 stat 自身 PID、comm 结束后字段 22 的 startTicks 和当前 watch 首次绑定值。startTicks 保持原十进制字符串，不转成可能损失精度的 Number；缺失/非数字/命令失败为 unavailable，原 PID 再用或读数中途改变为 changed，均丢弃当点内存字段并按原循环停止条件结束，不用 0 或旧值填充。成功点新增 `processInstanceVerified=true`。

复用 r25 已验证的 startTicks 读取/解析机制，不建立第二套 profiler。与原观察文件同目录的 `.process.private.ndjson` 用独占创建/追加保存 `starward-r17-memory-process-instance-v1`、watchId、从 0 开始的 sampleIndex、真实 PID/name/activity/startTicks、前后值和 host bracket。成功/unknown/changed 均保持其真实含义，公开日志只带验证布尔、固定状态和私有文件路径/行数，不输出原始身份。跨 watch 需实际读回这些私有 target 后全等核对，不能靠 slot0。新增每点两次有限 cat 读取，未改设备选择/前台/输入守卫、meminfo 解析、采样次数/间隔或期限；这些额外观察成本包含在原 host bracket 内。

r25 单点脚本本身可读取 Map，但固定旧四个标签与旧私有目录，不能把 `after-exit` 自动解释为本次关闭叠层。另有 `Number(value) || null` 会把有效 SwapPss=0 写成 null，原始 meminfo 仍保存。若复用其单点数据，应修正该解析或从原件保持 0/缺失区别；不要原样拿 null 做数值结论。其 startTicks 机制可以直接复用，不必复制整套旧试验。

## 一次有用的实际运行

Root 完成必要数据/画面准备、两层真实非空并记录当前阶段后，才附着唯一 watcher；不能让前面漫长的 UI 准备耗尽窗口。原定手势仍由唯一手机 owner 按 capture/foreground/单次输入守卫完成。尽量在一行采样结束后的等待段安排输入/录屏；若 ADB 读取与输入重叠，该点仍记为混合点，不假装精确同步或更改守卫。

可复用的原命令形状（这里只列命令，未执行）：

```powershell
$env:STARWARD_R17_MEMORY_ROOT = 'C:\Users\momoooo\.starward-private\sky-map-20261020\device-resume\r19-ui-20261022\gen14-overlay-memory-20261023'
node .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-sky-memory.mjs watch map-terrain-light 13 10000 usb
```

13 点/10 秒仅是现有有限观察上限内的一次窗口，不是产品预算或稳定性验收时长。每阶段只复用必要动作已有的私有回执作 anchor，不新增页面计时器或时钟框架：

1. `ready-pre-pan`：实际查看两层已就绪、非空的 fresh capture，记录其回执路径/实际 host capture bracket，与 watch 首个有效点的先后；不是冷启动基线。
2. `pan-active/mixed`：原本必要的跨覆盖和有限连续 pan 各复用自己的 guarded record-swipe 回执/视频。记录真实输入顺序；返回后命名的视频/截图时刻不是输入开始或 PTS=0，不给重叠样本强行贴纯 pan 标签。
3. `layers-off-observed`：正常 UI 关闭两层；实际查看开关均关及返回稳定 Map，引用这两个已有状态回执。只把 **读取开始晚于已观察 off 的主机边界**、且无后续输入的样本记作 off 后 idle；边界重叠样本仍为 mixed。
4. `idle-no-input`：不再输入，保留之后的有效样本和终态；无需为每点追加截图。末次必要状态查看只确认未离开 Map，不证明所有资源已退休。

这些 anchor 都保原 host read/capture 不确定性，不从录像 PTS 推导 meminfo 时刻；private watch anchor 的首尾 wall/monotonic bracket 也不能约束中间漂移。

若 off 发生得太晚，原 watch 没覆盖 idle，不重放负载补窗口；保留原样本，当前已关闭两层时可仅续有限 idle watch，并用真实 startTicks 绑定确认跨文件实例。没有该绑定则只分别报告，不拼回落曲线。至少 3 个已明确 off 后的非重叠样本才能描述一段方向；不把 3 点或 40 秒提升为无泄漏/长期平台期证明。有限窗口耗尽即停止，不为等到更漂亮回落延长压力。

结束后读回 ndjson/anchor/instance sidecar，核实际行数、完成状态、`completedRowsSha256`、字段非空和有序 bracket，核每个有效点与私有 instance 的 watchId/sampleIndex 对应且 target/startTicks 一致；保存原件到现有私有 owner。实际持续时长用样本 bracket，不能用配置值替代。

## 下一决策与停止条件

- **关闭后在有限窗口明显回落或停稳：** 这次没有新增“持续上升”的证据；继续完成原完整叠层交互/资源义务，不因此新增相邻压力轮次，也不宣称全部 JS/native/GPU 回收或无泄漏。
- **关闭后多个点仍持续上升/Swap 压力增加：** 停止继续输入，保留阶段与同实例绑定，进入原 ground-overlay/文件缓存/原生退休 owner 的最小 create/use/retire 归因。先复用已有 native command、slot、pin、retirement 机制；PSS 本身不选择具体 allocator，不自动重开 Heap/Perfetto 资格。
- **仅高位残留或一升一降：** 属于有限残留/波动，无法区分合法缓存、分配器保留和泄漏；不能据此盲清缓存、改 Map key 或禁层。
- **前台丢失、owner/startTicks 改变、MEMINFO 头/总量缺失、ADB/文件封存失败：** 结束该观察，不重启小程序/清数据。非前台行不填 0。若发生真实意外退出，才由 Root 沿既有定向退出证据 owner 处理，不继续施压。

所有结果是 `development_feedback`、整个宿主 Appbrand 进程的资源信号。Unknown/Private Other 不识别 JS isolate；Native Heap/graphics 分类平稳也不排除所有原生/GPU 驻留。PSS、RSS、SwapPss 不相加；不能把整 watch 增量除以短手势时长或数量，也不与旧会话数值拼增长/收益。

## 本机检查与未验

原 anchor 测试 owner 内新增两项针对实质边界的完整 watcher fake-I/O 测试：相同 PID/name/activity 但 startTicks 在两点之间或 meminfo 中途改变时拒绝；stat 截断/非数字/错误 PID/提供者失败以及上次成功后字段丢失时保持 unknown。另直接核 SwapPss=0 保留，带空格/右括号的 comm 不错位，私有实例字段不出现在公开记录。只在 VM 中加载实际 watcher 源并替换系统 I/O，不 import/执行真实采集入口。

`node --test .../scripts/r17-memory-watch-anchor.test.mjs` 7/7 通过；`node --check .../scripts/r17-sky-memory.mjs`、本次三文件 focused `git diff --check` 通过。真实 stat 可读性、设备开销、实际私有写盘/权限、Map 阶段/候选关联和资源结果仍待 Root 必要的一次设备观察；单测不升级为运行或产品验收。

修订后 watcher `0663a9f4cc297b00f17720564d917cc97e526e72c599121ea2f2ddfe8d9424e0`、测试 `dbfdc720cfe98275a956c7a5f25c0f301d7d60c84b464ff4fe0cb53b8faf7421`；修订前 watcher `b52414418dcc9bfe21c8bdbc4a22491bed00734a630ea96fa50c0360a6519ae2`。未改 anchor `87655eff96f51dc2667b69b514c05b966d22ffc0e2e13661e87709863fd9ad00`、r25 checkpoint `4633014c106c78c849fce793e775efc3192c15c79306f0574505b88191ea7aed`。实际执行时原 anchor 仍自动计算当时工具源绑定；本报告不是运行资格或产品身份。
