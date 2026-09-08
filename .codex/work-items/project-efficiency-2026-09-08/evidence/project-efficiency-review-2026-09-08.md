# Starward 整体效率审查：Context、Skill、Harness 与产品性能

本轮为审查，没有修改业务代码、项目规则或系统配置。新增内容仅为临时审查报告、基准脚本及测量日志。

用户已明确：设计资源正在通过新的 Skill 重构，新资源尚未全部实现。**新设计采用与生产实现之间的差异属于正常迁移状态，不作为本轮缺陷。** 当前采用入口 ADOPTED.md 也已明确记录“本次生产UI/接口尚未迁移”。下文规则问题仅指当前权威之间的范围/执行要求矛盾，不能把新旧设计差异混在其中。资源去重统计包含正在进行的新设计迭代，不是可立即删除清单；清理应等重构范围与依赖收敛后再决定。

最先值得处理的是会让 agent 做错、重复做、读取过多的入口与事实源；同时推进已实测的地图计算和客户端缓存问题。无需重新搭建一套 harness。

## 当前基线

| 对象 | 实测情况 | 如何理解 |
| --- | --- | --- |
| 默认 Context 正文 | 1 个文件，2,323 B | 已经轻量，保留这个方向 |
| 全部 Context 正文 | 47 个 Markdown，427,478 B | 其余按需读取，不是每次全量注入 |
| 根 DESIGN | 113,403 B | 包含两个产品的规则，应先按产品定位相关段落 |
| 原生 Source Plan | 599,234 B，6,953 行 | 不应该成为小程序任务的默认输入 |
| Mini Program immutable Source | 2,380,155 B，38,321 行 | 历史原文与机器展开数据，应按需回溯 |
| docs 工作树 | 528,825,126 B，3,483 个已跟踪文件 | 约 504 MiB；主要是设计资源与历史候选 |
| .codex 工作树 | 约 11.28 MB | 大部分体积来自 work-items，不是 Skill 本体 |
| .long-task 工作树 | 约 9.14 MB | 属于需要厘清存续依赖的历史材料 |
| 已跟踪设计资源中完全相同的大文件副本 | 重复 176,025,272 B | 仅统计单文件至少 100 KB；可优化工作树占用，不等于 Git 网络流量 |
| Git pack | 100.66 MiB | Git 已有压缩/对象去重，不能把工作树重复量直接当作 clone 节省量 |
| 项目 hooks / agents | hooks 为空，agents 目录为空 | 没有证据证明当前有沉重的自动 hook/角色编排 |

Skill 也是先加载名字、描述等元数据，选择后才读正文；已安装数量不等于所有 Skill 正文同时进入上下文。应优化触发条件和实际读取路径，而非为减体积盲目卸载。依据：[OpenAI 官方技能文档](https://learn.chatgpt.com/docs/build-skills)。实际 token 数还受宿主注入、工具输出、对话历史和分词影响，本报告没有将文件字节数冒充 token 消耗。

## 优先修复：规则一致性与读取入口

### 1. 现行要求互相矛盾，会制造额外开发与验收

- [Product Surface 第56行](../project_context/areas/main/product-surfaces/wechat-miniapp.md:56) 仍要求 200% 字号可操作；[Screen 第25行](../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md:25)、DESIGN 与 acceptance-runtime 则明确用户已暂停大字号工作。
- [acceptance-runtime 第20行](../project_context/areas/main/verification/acceptance-runtime.md:20) 宣布旧 Harness snapshot/wrapper 不再是执行路径；紧接着第21行又要求 physical snapshot / Harness-declared environment。[implementation-index 第28行](../project_context/areas/main/implementation-index.md:28) 与 [runner 第496行](../tools/miniapp/run-wechat-devtools-session.mjs:496) 仍保留该路径。
- [原生计划第74行](../docs/source-plan.md:74) 仍称已退休的 context_surface_contract、context_uiux_design、design-resource-authoring、long-task-workflow 为“当前”权威；文件顶部与 AGENTS 已取消这些阶段。

建议：由现有职责 owner 收敛当前范围，其余文件只指向它；把确需保留的旧来源显式标成历史。snapshot 的代码是否继续保留，应和现行工作流一起明确，不能只改一句文档。不要通过删除产品要求掩盖未完成工作。

收益：减少无谓实现、反复查资料、错误阻塞和重复解释。改动范围小，应先于大规模目录整理。

### 2. 交互 Skill 应先区分原生 App 与小程序

[交互 Skill 第13行](../.codex/skills/uiux_design/SKILL.md:13) 对 planned delivery 固定指向 `docs/source-plan.md` 的 Outcome/义务/验收；但该计划明确属于原生 App，小程序有独立 Screen/Source，architecture 也不允许混用。

建议把平台选择移到读取要求之前：原生 App 读原生计划的相关 Outcome，小程序直接读对应 Screen、采用资源和相关 Source key；DESIGN 先按产品段落定位。不是增加新 Skill 或复制一套需求。

收益：省去错误进入 599 KB 计划再回退的过程，也减少跨产品规则误用。当前 Skill 说读相关 Outcome，并不要求每次把 599 KB 全读完；问题是路由对象本身不匹配。

### 3. 发布 Skill 触发过宽，并误把授权限于“当前一条请求”

[发布 Skill 描述](../.codex/skills/starward-miniapp-release/SKILL.md:3) 包括泛指的 build；[第11行](../.codex/skills/starward-miniapp-release/SKILL.md:11) 先要求读取部署、开发、README、package 和执行脚本，其中部署 README 本身为 40,649 B。普通本地检查构建也可能先走完发布入口。

[第40行](../.codex/skills/starward-miniapp-release/SKILL.md:40) 将外部操作授权限定为 `current request`，与持续会话中已授权工作应继续执行的规则不一致，容易反复要求用户确认。

建议：先分流本地构建、预览、上传、部署，再读相应 owner；承认整个会话里已经确立的授权。保留环境、准确目标、发布与回滚的必要边界，仅在真的缺少决定或外部权限时询问。

## 接着处理：历史资源、检索和验证成本

### 4. 旧设计包确实较多；资源整理放到当前重构收敛之后

同一个 2,936,710 B 的 `parking.jpg` 在设计反馈/交付目录出现 **44 份**，仅额外副本占用 126,278,530 B。全部扫描到的相同大资源重复占用约 **176 MB**。

这些副本不少来自新的 Skill 正在推进的反馈轮次，不能据此判定浪费或过时。与之不同，较早的 `miniapp-field-signal-i21-selected-2026-09-03`、`miniapp-field-signal-i21-binding-2026-09-04` 及 r2–r6 共7个包约 **182.5 MB**；其中 Markdown/JSON/YAML/TXT 约 **181.1 MB**，大头是事实清单、绑定和验证元数据，而不只是图片。8月的 selected-source、handoff、design-system 包也仍保留。

当前先区分四类：新 Skill 正在迭代的候选；新近采用但待迁移的资源；仍被生产实现/必要工具消费的旧资源；只作历史追溯的旧包和说明。按这四类记录状态与入口就足够，不为过渡期额外建立新流程。

重构收敛后可评估工作态复用不可变原素材，迭代保存改动与引用；需要独立交付包时再复制完整依赖。保留当前采用包完整性，只把不再参与当前决策的候选/日志在确认依赖后移出活跃工作树，历史仍从 Git 或专门的归档获取。不要直接删除采用资源，也不应为了空间清理重写 Git 历史。

这改善检出、文件遍历、索引和人工浏览。是否改善远端下载需要另测，不能按 176 MB 直接承诺。

### 5. 给历史 Source 和巨大单行记录明确的检索边界

[小程序 immutable Source](../docs/wechat-miniapp-v2-1-1-source.md:1) 有 460 个 ty-source block，没有 Markdown 标题，并保留已被现行 Screen 替代的 draft/apply/revert、旧 Finder 和 detail 路径。Screen 已声明 supersession，主要问题是普通搜索容易先命中具体但过时的历史文字。

`.codex/work-items/wechat-miniapp-field-signal-i21-long-task-input.md` 为 9.44 MB，`.long-task/delivery-contract.yaml` 为 9.10 MB。本轮一次范围过宽的 rg 已产生数 MB 原始输出并被截断；这是检索噪声的实际例子，不能把工具报告的原始输出 token 估计当成模型计费量。

建议常规检索先限定 `apps/packages/workers` 或现行 Context/Skill；只有查出处时再进入历史文件，并限制输出行长与范围。复用现有 implementation-index/Screen 路由，在必要位置增加 requirement-key 到当前 owner/历史出处的短映射。原始 Source 与哈希保留，不把它重新总结成第二套需求。

历史目录还被 [legacy-verifier-diagnostic](../tools/miniapp/legacy-verifier-diagnostic.mjs:19) 等诊断消费，因此需要先清楚地区分现行执行、可选诊断和归档，再迁移，不可一刀删除。

### 6. Context-only 修改不应无差别跑完整产品 CI

[harness.yml](../.github/workflows/harness.yml:4) 每次 PR/main push 执行全仓 `npm ci --ignore-scripts`，没有 npm cache 与取消旧运行的 concurrency；[product-ci.yml](../.github/workflows/product-ci.yml:4) 同样没有改动路径分流，会继续跑完整产品检查、WEAPP 构建、基础设施和 Docker。

建议在保留必需检查状态的前提下按受影响路径决定 job/步骤：纯文字、Context、Skill 跑相关结构/引用/行为检查；源码、公共契约、依赖锁和 workflow 改动仍触发对应产品检查。采用资源、tokens、会影响构建的设计文件不应被误归类为普通文档。Context job 可复用安装，或用锁定且足够的最小依赖集。

本轮未拉取 CI 运行时长，暂不量化节省分钟数。安装成本大于轻量校验的判断来自实际 job 内容，不是 CI 墙钟测量。

### 7. 把锁定代码写法的测试改为必要行为检查

[workflow-conformance 第281行](../tools/miniapp/workflow-conformance.test.mjs:281) 用正则固定 `useDidShow(() => setPageVisible(true))` 的具体空格。只在内存把箭头两侧改为双空格，语义不变，匹配就从 true 变为 false。

部分原子选择逻辑已有 [实际调用测试](../tools/miniapp/run-wechat-devtools-session.test.mjs:114)，却又被 workflow-conformance 锁定函数名、for 解构和重试次数的源码形式。应该保留真正有意义的架构/资源约束，将重复的写法检查退掉，行为缺口补在现有 owner 测试里。

本轮相关 19 项测试全部通过，测试报告约 207 ms；这不是显著的测试执行瓶颈，主要优化价值是避免等价重构引发误报和重复维护。

### 8. 去掉已确定的重复验证调用

[package.json 第40行](../package.json:40) 的 final-candidate 先跑 check:miniapp:fast，随后再次跑 design:system:verify；fast 本来已包含它。[workflow-conformance 第1205行](../tools/miniapp/workflow-conformance.test.mjs:1205) 还要求顶层命令出现重复的文字。

建议把检查归属收敛到一个调用位置，组合命令引用它；测试验证覆盖是否存在，而非强迫顶层重复列出命令。只在输入发生变化或存在独立验证意义时重复执行。

## 产品运行侧仍值得同时推进

详细代码位置、基准和边界见 [运行性能审查](./performance-review-2026-09-08.md)。

| 优先项 | 实际发现 | 改进方向 |
| --- | --- | --- |
| 地图重复计算 | 8 测试点冷查询约 0.96–1.08 秒；切云层约 0.80–0.88 秒，再次调用 8 次天气、投影 160 帧 | 复用现有计算 owner 的缓存、合并相同请求，按需生成星场 |
| 星空缓存不匹配 | 完整响应约 707 KB、680,798 字符，超过 300,000 字符阈值，进不了客户端持久响应缓存 | 大数据分块、总字节预算、异步写入；保留时效和账号隔离 |
| 上游长尾等待 | 天气三路组合没有在当前调用链建立应用级 provider deadline | 有界等待与取消，沿现有降级规则返回 |
| 地图数据库读取 | 先拉全部点位，再空间查询并求交 | 直接视口查询、批量事实读取，保留发布与可见性门槛 |
| 星空画布 | 每次 pose 更新都重测布局、创建 context | 缓存尺寸/context，合并高频绘制；真机验证 |
| 小程序体积 | 总产物 1.49 MiB；三张照片占主包约39% | 缩略图和大图分级，按消费者安排资源 |
| Android/容器构建 | release 裁剪默认关闭；Docker先COPY全部再安装依赖 | 正式release裁剪/ABI策略；调整依赖缓存层 |
| 本机运行时 | 默认node指向微信工具的Node16，首次构建失败 | 固定项目Node24/npm匹配；本次已用进程级PATH跑通 |

建议推进顺序：先处理与设计迁移无关的旧工作流规则和 Skill 错误路由；并行处理地图计算、客户端缓存；之后做 CI 分流。当前设计重构继续沿用新 Skill，新设计与旧实现之间的差异留在迁移状态；资源清理和依赖新布局的前端性能建议等迁移范围稳定后再复核。Context 的短默认入口、现有专业 Skill、必要安全与真实性规则应保留。

## 实际检查与限制

- 当前 `context:validate`、`context:doctor` 通过，默认列表仅 global.md。CLI 已明确：结构通过不验证事实正确性。
- 对62份选定 Markdown 检查64个本地 Markdown 链接目标，未发现缺失文件。这不包含全仓所有链接、anchor、代码片段中的历史名字或业务语义。
- 项目 Skill/workflow 的19项测试通过；BFF星表/天气10项测试通过；Node24小程序生产检查构建及产物静态检查通过。
- 未执行真机性能/离线恢复、完整原生runner、生产数据库或CI墙钟测量；本报告不能证明这些范围已通过。
- 统计原始结果：[体积统计](./harness-audit-stats.json)、[链接和重复资源统计](./harness-audit-links.json)。检查期间已有的其他任务文件未修改。
