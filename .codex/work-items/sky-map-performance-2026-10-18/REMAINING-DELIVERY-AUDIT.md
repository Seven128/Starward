# 剩余仓库交付核对

2026-10-19。root 委派的有界只读核对；本文件是本代理唯一工作区写入。没有执行构建、模块入口或产品测试，没有访问设备、ADB、DevTools、SDK、服务、数据库、账号、Drive、网络或 Git 外私人原件；没有 stage、commit、push、分支切换或清理。复用既有 PLAN、研究、独审及 [当前共享验证](CURRENT-DELIVERY-VERIFICATION.md)，不重新审查已提交的 native / preview 实现。

**结论：未发现必须阻止以下仓库归档提交的凭据泄漏或缺失生产 owner。** 截图工具和方法文档可以按下面的完整责任组提交；历史 task scripts 与证据可以归档，但本次没有把它们全部升级为“当前源码已独审”，也没有赋予重新运行资格。H3 的 task-only 源文件仍只在 ignored tmp，须继续保全，Git 中的说明不构成 clean clone 可复现交付。

## 实际快照与验证覆盖

核对时分支仍为 `codex/remote-main-20260908`；本地 HEAD 与已有 `origin/codex/remote-main-20260908` 均为 `16e0c0456b8c5bd6d87dd8e1aa088d961df03d5a`。该 HEAD 包含 `a89721f8` native ruler、`3059ffe6` preview outcome 和 `16e0c045` warm-entry fixture 三个提交。没有 fetch；这里只报告本地 remote-tracking ref，不另行证明远端瞬时状态。

在新增本文件前，`git status --porcelain --untracked-files=all` 为 **17 个 tracked 修改、143 个非 ignored untracked 文件**，全部为文本，合计约 2.57 MB。除既有工具、Skill 和 Context 的明确修改外，新增文件均在本 Goal 的 work-item 下；没有发现跨任务实现或 Git 外原件混入清单。本文件随后作为一个新的 task 文档加入。

- `CURRENT-DELIVERY-VERIFICATION.md` 记录的是当前工作树实现的本地检查：Mini Program 2,649 passed / 1 skipped；修后 workflow 175/175；UI contract 4 项 pattern probes，产品符合性仍 unverified。它覆盖未提交的现有 device-test 回归，不能称为这些 dirty 文件已在当前 remote HEAD 跑过 CI。
- root 提供的当前工作树 `context:validate` 已通过，范围是 manifest/path 结构，不证明文档事实、全部链接或目标验收。本代理没有重复运行。
- 本地 remote HEAD 不含本轮待提交的 Skill、Context、device-test 和 task 文件。Product / Context 远端结果只能按各自 commit 和 workflow 记录解释；root 报告的 `39185535928`、`39185539969` 不由本只读代理重新查询或升级为剩余 dirty 的 CI 覆盖。后续状态仍由 HANDOFF / REMOTE-CI-CHECKPOINT 拥有。

## 具体提交分组

以下四组在该快照下合计 160 文件，计数不含本文。组之间可分别提交；不要求重跑大套测试，不要求改变原 PLAN。

### 1. 不可覆写截图与输入凭据（4 文件）

- `tools/miniapp/device-test.mjs`
- `tools/miniapp/device-test.test.mjs`
- `.codex/skills/starward-wechat-device-verification/SKILL.md`
- `project_context/areas/main/verification/wechat-device/settled-candidate.md`

已有 [DEVICE-H3-BOUNDARY-REVIEW](DEVICE-H3-BOUNDARY-REVIEW.md) 直接审过实际工具 diff、session / ADB / recording caller；CURRENT 的完整 workflow 覆盖其现有回归。实际 diff 保留 fresh capture、单次输入、binding、foreground 和 cleanup owner，仅改为每次返回独立图片与 receipt。四文件可作为一组提交。该审查文件可与第 4 组 task 归档一并提交，无需复制成新的工具审查。

本组不认证操作者已经查看截图，也不认证手机 bundle、runtime AppID 或任何产品结果。

### 2. 可复用性能方法与唯一指针（7 文件）

- `AGENTS.md`
- `.codex/skills/starward-miniapp-development/SKILL.md`
- `.codex/skills/starward-miniapp-development/agents/openai.yaml`
- `.codex/skills/starward-miniapp-development/references/performance-investigation.md`
- `project_context/context-maintenance.md`
- `project_context/context.toml`
- `project_context/development-workflow/development-feedback.md`

新 reference 目前为 untracked，是这些入口实际依赖的交付源文件，必须与引用方一起纳入；只提交 Skill / Context 链接会漏掉方法正文。旧 [forward review](PERFORMANCE-SKILL-FORWARD-REVIEW.md) 和 [METHOD-UPDATE](PERFORMANCE-METHOD-UPDATE.json) 的 hash 属于各自形成时版本，不能改写为本轮 hash。本代理按 root 追加授权对当前全文补做下面的局部独审，没有新增方案或研究。结论通过，七文件可以一组提交。

### 3. 已提交 native 实现的长期责任说明（1 文件）

`project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md` 的新增段落对应已提交的 `orientation-ruler-layout`、surface endpoint、live active、持拖 resize 与迟到结果退休责任，保留时间事务和目标结果未验证的边界。它可作为实现配套 Context 提交；复用 [native 独审](SKY-RULER-NATIVE-CADENCE-REVIEW.md)，不重复代码审查，不把新增文字本身当作原生对齐验收。

### 4. 本 Goal 的恢复入口、研究与证据归档（148 文件，加本文）

范围是 `.codex/work-items/sky-map-performance-2026-10-18/` 中本次 status 列出的全部非 ignored 文件：6 个 tracked 修改，以及 142 个 untracked task 文档、JSON、scripts。6 个 tracked 文件明确为 `GOAL-OBJECTIVE.md`、`HANDOFF.md`、`INDEX.md`、`NEXT-CHAT-PROMPT.md`、`PLAN.md`、`REMOTE-CI-CHECKPOINT.json`。

可以将这组作为研究、恢复和有范围的证据归档提交。应在提交当时由 root 将 HANDOFF / CI checkpoint 对齐其实际现场，不能用本文快照冻结正在变化的服务或远端状态。历史 trial、旧失败、被后续解除的 findings 和停止条件保留原发生范围，由当前 INDEX / HANDOFF 指向现行分支。

其中可以复用的既有软件审查链是：

- v2 runtime / protocol / collector 与 accepted-action：`R17-V2-INDEPENDENT-REVIEW.md`。
- scene-owned memo：`R17-SCENE-OWNED-MEMO-INDEPENDENT-REVIEW.md`；当前暂停，不因归档而恢复。
- normal baseline / controls：`R17-NORMAL-BASELINE-V3-INDEPENDENT-REVIEW.md` 与 `R17-NORMAL-BASELINE-V3-FIX-REVIEW.md`。
- A1 / terrain observer / preview：`A1-AND-PREVIEW-FIX-INDEPENDENT-REVIEW.md`，保留其 r1 实物身份；r3 当前完整构建和 materialized 20/20 由 preparation 拥有，不能把 r1 独立整包读回改称 r3。
- H3 组件与工具边界：`H3-COMPONENT-FIXTURE-INDEPENDENT-REVIEW.md`、`DEVICE-H3-BOUNDARY-REVIEW.md`、`H3-PREVIEW-BOUNDARY-REVIEW.md`。
- 窗口恢复与 native layout：各自 `SKY-RULER-*-REVIEW.md`。

**仍未在本轮独审、不能借本提交自动准入重跑的内容：** 历史 canvas-copy / native-copy-suppression / GPU-finish / CPU-page-only / CPU-text-metrics builder 与 controls、旧 heap / CPU analysis 入口及其它 task-only 研究脚本的完整当前实现。它们有各自历史结果、夹具或类型/构建记录；本轮只核语法、隐私和依赖归属，没有重审每一个算法、外部输入或运行副作用。可保存历史来源，不能称为新的生产修复或新的目标运行许可；如恢复使用，沿原方法核对那一次真正变化或未答的边界即可，勿重复整轮研究。

## 当前性能方法的局部独审

本代理未编写方法正文。完整读取当前 development Skill、performance reference，以及 development-feedback 的对应入口，复用已采用的 Goal / PLAN 和历史研究，按 root 指定的语义范围核对。未取得旧全文快照作逐行比较；以下结论来自当前全文，旧 hash 证据没有升级。

本次实际 SHA-256：

| 源文件 | 当前 SHA-256 |
| --- | --- |
| `.codex/skills/starward-miniapp-development/SKILL.md` | `fcd017d8b94986bd97f0b263ef1754c35d32d6d664d53c3b6e52b7301a9d8b6d` |
| `references/performance-investigation.md`（同 Skill 下） | `3e81d52e406b490e50e5129b10d7051329345367f9ba76fa50f0f9e67a8e0061` |
| `project_context/development-workflow/development-feedback.md` | `78fca85a19a5105139b5616a3255153a856f99441e3537a42365adf4779aaae8` |

**局部结论：未发现 root 指定范围内的阻断。**

| 核对责任 | 当前文字的实际约束 |
| --- | --- |
| A / B 结果分开 | interaction delay、process growth、later exit 明确是不同观察；一项成功不关闭其它。input → admitted preparation → first accepted 按序号关联，另保 superseded / failed / duplicate。 |
| 最小有区分力观察 | 从待决问题、竞争解释和能改变下一步的结果选观察；便宜 counter / control 只有回答同一问题才可替代，补充证据不冒充必要观察。 |
| 有效目标与非空负载 | target / layer / source / workload / actual calls 分开核对；工具命名、菜单、零样本或另一上下文不构成有效 profile；冻结诊断回到完整路径才可采用修复。 |
| 时钟与窗口 | source / units / resolution、实际 start/stop、混时钟/回拨/亚分辨率 unknown、counter reset 和 watch 区间明确；不将整体进程增量除以较短工作帧数。 |
| 分配语义 | surviving sampling 与 total churn / retention graph / native ownership 明确分开；统计权重不等于整个进程字节，paused 后仍高不独立证明泄漏。 |
| 首个失败边界与恢复 | transport、target、capture、export、interpretation 逐界判定；timeout 不等于取消；只恢复受影响 readiness，不在未变状态重试，不以独立工作关闭缺口。 |
| 无私有 CDP 或相邻 disable 链 | 不为复现可用官方 GUI 创建 raw CDP / private bridge；阴性结果不自动授权相邻 feature disable，必须重回剩余未知。 |
| 完整验收与停止 | 修复回完整 affected product path；复用有效证据，样本时长/次数不自动成为 gate；保显式义务，不引入统一 profiler 前置、审批、整套新框架或缩减 Goal。 |

适用范围与操作所有权仍分清：Skill/reference 拥有方法，Context 保长期产品/平台事实，task 保现场/读数，device owner 保输入与验收，release owner 保环境交付。本次不是目标 profiler 或方法包运行加载验收。

## 定向隐私核对

仅扫描本次将入 Git 的 160 个文本文件；从 Git 候选路径读入，没有跟随 external / `.private` 引用或读取 raw profile、截图、媒体、账号。高置信凭据形态、URL userinfo、base64 媒体、设备地址形态未命中。关键词命中按实际字段形状和现有声明区分，未发现需要从本次 Git 清单移出的私人原件。此结论是定向检查，不声称能证明任意未来变更无敏感内容。

| 文件或范围 | 风险类别与处理 |
| --- | --- |
| `H3-SAME-SITE-ISOLATED-INPUT.json` / `.md` | 精确地理字段；现有 owner 明确为公开照片机位与公开来源元数据。本报告不抄坐标，不把它解释为用户当前位置。 |
| `R17-STELLAR-SCALAR-COST-CHECK.json` / 对应 script | 数值夹具地理字段；来源声明为仓库 stellar-vectors 四站点夹具。本报告不抄数值。 |
| `PERFORMANCE-TOOL-QUALIFICATION.json`、`R17-NORMAL-CPU-ATTRIBUTION.json`、各 `*-RESULT.json` | profile 字段名称命中；实际为计数、分桶、命名热点或有限结果，不是 raw V8 node/string graph、traceEvents 或采样原件。 |
| `HANDOFF.md`、`R17-A1-RUNTIME-INTEGRATION.md`、normal/cross-day/terrain 观察、H3 preparation、native cadence 及 analysis scripts | 私有 owner 路径与 receipt 引用；引用不是原件，未包含配置内容、Context/query、SDK 端口、设备原始绑定或下载凭据。外部原件继续排除。 |
| Skill、Context、PLAN、review 与 collector/builder 中的 auth/cookie/token 等词 | 接口、拒绝规则或测试占位；未发现实际凭据值。 |
| `spot-and-sky.md` 现存带 query 的资源链接 | 既有公开采用资源引用；本次新增 native 段没有新增带凭据的 URL。 |

## 引用与交付源保全

1. 当前性能方法正文真实存在但未 tracked；第 2 组必须完整提交。development Skill、device Skill、AGENTS、development-feedback 和 guarded recording 的关键相对指针均存在。
2. task 模板的 `./sky-canvas-surface`、`./sky-gpu-renderer`、`./sky-canvas-lifecycle`、`./sky-artwork-level-composition` 及 runtime-error 在其 materialized Sky 目录的既有 owner 均存在；不能按 scripts 原目录直接把模板 import 报为缺生产源。它们继续由原 builder 复制/变换，不成为直接运行的生产模块。
3. `R17-TEXT-METRICS-BOUNDARY.md` 的源码链接带历史行号；去除行号后实际源文件存在，本次不把它报为缺源。普通本地 Markdown 文件目标没有发现另一项缺失；本核对不是完整锚点或所有动态路径的 validator。
4. H3 `prepare.mts`、`build.mjs`、`verify.mts` 和 isolated adapter 当前路径存在且为 ignored tmp。本次没有读其私人输入或把 tmp 纳入 Git。**保全缺口：** task 文档的 Git 提交只保存描述与 hash，不能令新 clone 自动取得这些运行源、完整 source snapshot 或媒体。原 owner 在任何 tmp / session 清理前须保留必要源与回执到其授权外部归档，或另作脱敏的窄源交付；这是未来恢复与清理责任，不要求将整块 tmp force-add，也不阻止前述普通工具/方法提交。

## 本次实际小检查及提交前边界

- 41 个待提交 JSON 全部直接解析成功；没有改写文件。
- 用仓库现有 YAML parser 解析 development Skill frontmatter 与 `agents/openai.yaml`，两份有效；没有安装依赖。
- 32 个待提交 `.mjs` 执行 `node --check`，32/32 通过；只作语法检查，没有执行 module。TS 模板不冒称经过本轮完整类型/运行检查。
- 关键方法/recording 相对引用与模板目标 owner 存在；git ignore 仍保护 tmp。
- `git diff --check` exit 0，仅现有换行规范化提示；不是产品检查。

root 完成分组 stage 后只需核对 staged 路径没有 tmp / Git 外原件，并按最终文本跑必要的 diff/结构检查；implementation 未变不需要再跑 2,650 + 175。以后新提交的远端 CI 必须按它的 commit 读回，不能挪用 `16e0c045` 的结果。本文没有授予 main 推送/部署，也不解除现有 main-only release 身份与环境约束。

gen26 原官方结果仍 UNKNOWN，不得借 repository commit、旧 completed 或普通继续指令重发/绑定。A1 r3 实际送达、native endpoint / tick / scroll 与取消恢复、Sky A/B、terrain file-ready/可见覆盖、H3/H4、R/H/A/N 及其余完整 Goal 义务保持各 owner 的未验证状态。8791、N05、已送达 R6、配对与 VPN 的保护边界未变。
