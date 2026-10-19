# r6 正常 Sky 观察链独立审查

2026-10-19，审查者 `review_r6_normal_observation`。**本次受审软件范围通过，未发现 P1/P2，没有修改受审代码。** 这不证明 r6 原生行为或 A/B 性能已通过。

审查输入为 `tmp/r17-normal-r6-codechecks-20261019/verification.json`，原始 SHA256 `ae3a7c50a1c9599f9752ffb7d199f142831f07bf14226dec01105aa8c3a1a5d1`。其记录的检查时 HEAD 为 `fb99d0ddd7d45e7d77b96b6d3d48051714718380`；本次读回 HEAD 为 `526d00ec2b9333951f7b63f1ab40081e22d9584f`。独立读回确认全部 8 个脚本、4 个生产读源、冻结 r5 manifest/maps owner 与输入记录逐字相同。提交身份变化没有代替源码核对，也没有触发无关重测。完整绑定及审查附件见 [JSON 回执](R17-NORMAL-R6-OBSERVATION-REVIEW.json)。

## 范围与依据

读取 AGENTS、global/Context manifest、架构入口、development skill、完整 performance-investigation 方法、开发测量边界和现行 PLAN 的 A/B。复用当前正常 CPU、旧工具资格及 r3/r4/r5 的失败或有限证据；没有重开方案审查。生产首次定位修复的独审由 [SKY-RULER-INITIAL-NATIVE-ADMISSION-REVIEW](SKY-RULER-INITIAL-NATIVE-ADMISSION-REVIEW.md) 拥有，本次只沿真实消费者核对诊断接入，不替代其生产审查。

只使用本地源码、纯变换和受控 VM/文件 fixture。未操作手机、IDE、ADB、feedback/session、服务、预览、实际产品构建、Git 提交或 PLAN/HANDOFF/准备 owner。未更改冻结候选、原 gen26 UNKNOWN、账号、N05/R6、配对或 VPN。

## 观察链与兼容结论

`--review-r6 --observe-a1` 是同一 builder 下的有限入口，绑定新的脚本和语义。manual-input 待命只有数字 owner 标记，没有 run、导出 timer 或产品时间写入。现有六字段与 ruler 的合法 `onPreview` 经过原 guards 后，同步进入原 `beginMeasurement` 和 `r17Probe.start`，再调用原 `observationTime.preview`；原 observation-time publish 记录意图，原 memo/preparation/request/accepted 路径关联同一 recorder。没有新时间 writer、数据来源、精度近似或调度替代。

新 `starward-r17-phone-probe-v3-manual-input` 明确 `startDelayMs=0`；`recordingStartRelativeMs` 只接受 0 或未知，使用同一个 Date.now/epoch/window，保留毫秒分辨率、回拨和不可用的未知意义。15 秒导出仍为原 owner；manual 没有 Play terminal。hide/unmount 和 Context owner/binding/committed/revision 变化会退休待命及已开始的 manual 观察。正常 Play 仍由真实产品按钮启动，保留原 15 秒 metrics、20 秒同次守卫 Pause/terminal，未让 host/model 决定停止。

ruler v2 观察当前唯一 native 定位、实际 offset 读回和准入，删除已不再存在的声明式定位事件，不额外发 selector 或 polling。pending、nextTick、query、retry 及 native move 各沿启动 window 传递；诊断退休只拒绝旧窗口日志，不阻断原产品回调、receiver 或 `scrollTo({ left, animated })`。ring 仅在 wide-time 启用，容量 128，保留 dropped/overflow/exportOmitted/rejectedWindowEvents；manual/Play 不启用该 ring。回传仍为请求与 offset 事实，不是物理呈现完成。

collector 只把严格 dispatcher 的 import 转到新 owner，路径、串行写入、32 KiB、32 文件、不可变同名 body 和精确重试规则保留。manual、ruler v2、旧 v1/v2/v3/A1/r5 各按明确 schema 分流；manual 不接 terminal，错误版本、私有扩展、非法路径和冲突不写入。新协议内部为复用旧标量验证而构造的旧 schema 副本只用于校验，不输出或保存为历史延迟采样。

另以当前共享 clock helper、r5 参数及冻结 buildSource 重新生成 runtime/controls，直接比较冻结 r5 文件的全部字节，均完全相同：runtime SHA `cf239bb89ad90548705691fe8ac864ee591fe76d0d2ef80ae0c3d7c256679ecb`；controls SHA `cfbb13d10fcc8af3ea11189f83f0182f8eaa751eecc50edb1fdd5324ce94cd67`。原 r5 原生生产形状与当前不同，未尝试用当前生产源码重建旧 r5。

## 独立反例与检查

新增独立脚本 `tmp/review-r6-observation-independent.mjs`，没有调用既有新测试的 environment/helper。它复用纯变换和真实生产 owner/handler 的源，在受控异步边界另写刺激及业务断言。最终 **8/8**、零 fail/skip；日志 `tmp/review-r6-observation-independent.log`。

- 对输入记录、全部 8 脚本、4 生产读源及冻结 owner 逐份读回 SHA；另独立重新生成并逐字比较旧 r5 runtime/controls。
- 真实 observation-time owner 与实际六字段 page callback 完成 A→B→A，三个不同意图、两个 superseded 接受、一个 latest 首次接受正确区分；重复 frame 不再计为首次接受，相同 A 时间不能合并身份，也不导出 fixture payload。
- 同毫秒、回拨分别使关联延迟保持 belowResolution/clockDiscontinuity；首次接受事实仍可成立，不能转换为零成本。
- 新 Context render 后延迟执行旧 scope cleanup，不得清掉新 arm 或新 measurement；新 scope cleanup 必须退休其本身。
- native offset 首次缺失、排队 retry 跨 recorder window 后读回，原 callback/receiver/options 保留；新 ring 不混入旧 read 日志。
- layout 首次无 geometry、retry 跨 window 后有效返回，原投影与定位语义保持，onResolved 仍携原 window，新 ring 不伪记旧投影。
- manual 与旧 schema 共用 collector 发生同 runId 冲突、旧 terminal 别名、非法路径、超限/私有输入及容量满后的精确重试时，分别保留原不可变与 32 文件语义。

首轮独立 fixture 的容量测试误用了超过既有 12 字符限制的 runId 后缀，收到正确的 400；已修正 fixture，未改 validator。该次日志单独保留 `tmp/review-r6-observation-independent-attempt1.log`，不能当产品失败或修复证据。

输入记录中的新 11 项/strict 0 和旧 17 项兼容检查按精确源绑定复用，没有宣称由本审查者重跑或视为独审。受审 tracked scripts 的 `git diff --check` exit0；Git 仅提示既有 LF/CRLF 转换。没有重跑整个产品套件。

## 仍未建立的结果

此处只能确认软件观察链、旧输出兼容与受控异步行为。合法 onPreview 边界晚于物理手指输入；数据更新、native offset、scrollTo return 和 nextTick 均不等于物理呈现。观察启动和状态计数本身有开销；不从软件反例推定真实手机延迟、CPU 或内存。

本审查没有建立 r6 完整产品包、官方编译预算/预览、live collector 已加载新 validator、真实最新意图首个 accepted 样本或首显 motion。完整正常 Scene/BSC/loaded SAO/native copy/caption/资源反馈、A 的真实输入关联、B 的有效 surviving allocation/paused drain/持续正常使用与退出，以及 Terrain、Android/iOS 和其它完整 Goal 义务均保留。下一执行直接按原 owner 准备一致候选和必要目标观察，无需重做本轮方案审查。

自动审批复核拒绝了本审查产生的三个合成 fixture 目录的递归清理。`exec_command` 在 CreateProcess 阶段返回 `rejected: blocked by policy`，没有更具体原因；整条 PowerShell 命令未执行，计划中 `Remove-Item -LiteralPath $resolved -Recurse -Force` 及其后附的测试重跑均未执行。未通过其它途径删除，harness 已恢复最后 8/8 对应源；此项不是审查门槛，不需现在人为介入。

以下三个精确 owned 目录保留供后续资源收口，内容都是本次受控 VM 产生的合成 metrics/容量 fixture，使用虚拟 endpoint 及全 a 的 source binding，没有私有 phone 数据。它们位于本任务 `tmp/`，没有服务进程：

- `tmp/r6-independent-collector-Eh6eO3`
- `tmp/r6-independent-collector-fiiHh2`
- `tmp/r6-independent-collector-x4U1x1`
