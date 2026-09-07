> **最新用户反馈（覆盖下文“新版偏好待答”的历史状态）**：用户已提供新版局部偏好：7d0651de地图观星点信息红框，以及789268fb／7d0651de／f946c266我的页计划与反馈组合红框“还不错”，未到特别好，其他一般般。未选定整套方案或排列优先级，未批准生产。用户要求只记录、先不继续。完整原话与四张原图见user-feedback-v2.json/md。

# 执行索引

用户授权：先完成设计资源 Skill 开发，再根据当前仓库调整并执行测试方案。创建 goal；完整保存源输入与必要执行信息，避免压缩丢失；不启动长程工作流自举。

## 完整输入（原文，非已完成声明）
- `docs/design-plans/Starward_Codex_执行提示词.md`：首先阅读；解释执行范围。
- `docs/design-plans/Starward_设计资源Skill_开发方案.md`：全部 13 节，P0–P3 本轮、P4 用户选定后。
- `docs/design-plans/Starward_地图与我的_UI重构_测试方案.md`：全部 11 节，T0–T4 本轮、T5 后续生产实施。

以上三份已从用户临时附件逐字复制；恢复时按相关章节读取原文，不能以本索引替代细项。

## 顺序与边界
1. P0：当前 HEAD/Context/设计/代码差异、模型与发现路径、工具和真实 Figma 探针。
2. P1：单一来源 Skill、引用、轻量脚本与坏样本工程测试，完成后开始第二份方案实测。
3. P2/P3：T0 实测；A/B 三方向各地图+我的、round-0 与最多两轮修订；初步有用后冻结并复验两次；全部候选匿名评审；推荐方向主题/状态/尺寸；交接修改。
4. 分层报告：工程、产品正确性、视觉与偏好、采用/生产状态。外部未验证明确标出；不伪造截图、模型、成本或通过。

默认不改生产页面、根 DESIGN 或已采用资源，不发布、不采购、不公开设计、不恢复 DRA/Long-Task。推荐不代表选定。凭证/字体不得进入产物。

## 当前事实与恢复位置
- **最新状态（优先于下方过程记录）**：Skill开发与本轮资源实验已收尾；设计方法v2三个独立成对样本experiment-2/3/4全部完成，84真实导出、72初稿/最终PNG独立评审SHA已核对，168冻结输入未变。B组视觉门槛0/3样本通过，不宣称稳定审美收益。新版偏好未收到；v1已全部拒绝。详见review.md、v2-summary.json/md、completion-status.json；最新匿名入口http://127.0.0.1:4277/v2-all/index.html，原生备份native/Starward-map-my-v2-all-trials.fig。旧T3覆盖/交接只属于v1；新版及手机未验证项如实列出，生产未改。
- 初始 HEAD：`d0c77b613ebc581ee0be9cf283d1edb631643b2c`，研究 HEAD：`424c971be1a27b0587c1789ba5e736f1a57aade2`。
- 初始工作区：未跟踪 `.codex/work-items/miniapp-integrated-2026-09-06/`，保留。
- 默认 Context：仅 `project_context/global.md`；manifest schema 5 的其他条目按需读取。
- 执行状态：Skill工程26+旧3测试通过，quick_validate和skills/list通过；T0闭环完成。T1 A/B各6初稿、各两轮修订真实保存并最终冻结；匿名review-site在127.0.0.1:4277（exec39915），旧阶段曾等待偏好，现已收到全部拒绝，见最新状态。独立盲评12最终图SHA吻合，两组均0/3方向达到两页均≥4；不宣称Skill视觉收益或稳定性。B覆盖24张已导出/逐图回看，具体430底图、320裁切、风险旧数据、观测图标和selected星问题正在最小修复；增强snapshot后统一补导到coverage/evidence-r1。独立coverage-check首次结果保留。handoff-output/export已实际执行成功，新增说明2行42px，Map前后PNG SHA完全相同。
- 用户新增要求（澄清后）：Skill跟随调用任务的模型和档位，不固定Astra/high，不自行切换。本轮宿主rollout确认gpt-6-astra/high，仅是本轮事实；后续A/B保持各组配置一致并记录真实来源。
- Chrome browser-client 26.901.51231已连接；专用Figma草稿key=tU01DsKBhSng9IHk1xlJQA，page0:1。Scripter官方插件已实际闭环；root1:58中文探针、1:71目标、1:40最小探针和重跑边界探针均保留。
- node_repl bindings：agent、browser(extension)、figmaTab1362040880、prototypeTab1362040892、mapRefTab（用tabs.list核对）；scripter/editor链可复用。编辑器全替换Ctrl+A/clipboard/Ctrl+V，Ctrl+Enter执行。下载用worker iframe普通link.click，再检查Downloads新增ZIP。Chrome坐标点击是tab.ax.click([x,y])，无tab.cua。
- 后续详细证据写入本目录 `run.json`、`current-source-audit.md`、`test-plan-current.md`、`execution-log.md`、`review.md`；未创建的文件不能视作存在或已验证。

每次阶段变化更新此索引与执行记录；保留实际失败、外部前提和下一步。

## 补充索引（执行至交接完成）
- 核心候选：experiment-1/A、B下round-0/1/2；A/round-0-technical-1保留同设计补导。resources.json仅核心对比，覆盖不混入匿名方向。
- 独立评审：anonymous-assessment.json/md；旧版anonymous-assessment-before-last-fix.*；私有review-key.json仅用于分析。首轮用户已全部拒绝。
- 覆盖：experiment-1/B/coverage/themes、map、my、sizes、components原始24板。photo首次白图保留。修复脚本fix-readback.js由B编写中；refresh-evidence.js只读取/导出既有24root，必须在新鲜浏览器URL核对后运行。
- 新会话交接：handoff-input/README.md+manifest.json，handoff-output/patch.js+execute.js+export。原B2 My root1:5207已局部修改，核心盲评PNG是修改前冻结版本，不能冒充该节点现在截图；最新为handoff-my.json/png。Map root1:4999不变。
- 素材：assets/icon-sources.json和icons保存实际共用124SVG词库（不代表全部可见使用），OSM实截图与Charlie fong2021 CC BY-SA4.0实景见ATTRIBUTION.md。无字体文件。
- 历史子任务：baseline_a、skill_b、handoff_fresh所述覆盖/交接工作均已完成。当前v2_trial1_a/v2_trial1_b修订首个v2样本，blind_review准备新匿名评审。所有子任务依方案授权；模型/档位继承调用任务。
- 下载ZIP实际序号：(9)B2、(10)themes、(11)map、(12)my、(13)sizes、(14)components、(15)handoff。后续先核对Downloads最新文件，不盲猜。
- 上述收尾已完成：7root受限修复后，24板原节点补导到coverage/evidence-r1。独立复查8变更+16同SHA，0工程错误、3滚动边缘审阅项、0快照缺口；197组件、189实例关系有效，478处实色文字最低4.767:1。图源和完整映射见coverage-resources.json、actual-derived-tokens.json、controls-code-map.json。
- 真实native/Starward-map-my.fig由Figma Save local copy下载，ZIP内canvas.fig头fig-kiwi，1,001,800bytes；未重导入验证。native/skill-post-first-trial.zip归档最终Skill，skill-version.json逐文件哈希，非重复发现入口。
- 最终review.md包含T0/M/Y/D/主题尺寸/视觉分数/失败/成本未知/生产边界。final-checks.json记录29测试、preflight通过与全历史包保留4条初稿裁切导致退出1。原round2核心无该告警，但不替代视觉阈值。
- 最新ZIP：(16)覆盖7root修复审计，(17)24板增强证据。曾1.84MB传送断开native pipe，恢复后检查未执行，缩514KB七目标再运行，未盲重跑。
- 第一轮用户盲评已收到全部拒绝，不再等待旧问题答案。新v2样本与冻结版本路径见最新状态。后两次独立复验未完成，不得宣称稳定收益。




## v2 当前入口与复验
- `experiment-2/` = v2首个成对样本，A/round-2与B/round-1为最终；所有初稿与修订30次导出保留。A最终作者回看在A/round-2/final-readback.md，B在B/final-readback.md。匿名initial评审已落盘，最终评审进行中。
- `experiment-2/core-inspection.json`全历史，`final-core-inspection.json`12最终；7条通用严格告警保留，勿把0项任务局部几何结果叫全工程通过。A3 time可见358×71，完整358×78底7px裁切。四张未主动改的A稿重导有3–11个图标边缘像素差异，非逐像素相同，作者记录具体snapshot差异。
- `review-site/v2/index.html`、http://127.0.0.1:4277/v2/index.html 是用户新页；IAB runtime `v2ReviewBrowser` / `v2ReviewTab` id1。Figma Chrome `figmaTab` id1362040880仍保留，Scripter已关闭，需Actions→Scripter后重新绑定editor再运行。原生v2副本及结构检查在native/Starward-map-my-v2-trial1.fig/json。
- 当前活动生成子任务 `v2_retest_a`、`v2_retest_b` 各fork none在experiment-3/A、B做同冻结版独立复验。两组收到相同owner路径和冻结fixture路径澄清；不允许读旧稿或互读，A不读新设计Skill方法、B读frozen版本。后续运行node scripts/build-experiment.mjs <A|B> <0|1|2> 3（检查168冻结SHA），实际Figma六图回看再≤2轮。
- Downloads最新ZIP23是A final；下次先枚举最新文件名再解包，禁止盲猜。原生.fig下载已复制检查，未reimport。
- v2首轮独立评审已完成：experiment-2/anonymous-assessment.json/md、ab-result.json/md，24初稿/最终PNG SHA匹配；B0/3（要求2/3），A1/3。A初稿最低1.20/中位1.525→最终3.40/3.90；B3.20/3.45→3.55/3.80。最终作者质量与用户偏好不混用；用户尚未回复新页问题。readability可用但本样本视觉门槛失败，不能宣称Skill采用或稳定收益。
- 第二次复验A子任务v2_retest2_a已fork none开始experiment-4/A，B组待并行槽位；与experiment-3同冻结输入，未提供首轮新图或评审。168冻结文件复查未变。v2归档native/skill-design-method-v2.zip SHA256 c577a0f5cd849fd1c467672c3ac1867cc52f0261e6f4884bd39928a7570fb8e7。

## 最新接续状态（以此节覆盖旧运行中描述）
- v2首轮experiment-2：A2/B1 final全冻结；独立评审24图完成，B0/3；用户新页偏好仍待答。原生fig备份包含截至此样本，无后两复验节点。
- experiment-3：A原0运行minHeight=0失败，read-only owner audit ZIP24 records=[]；技术修正只0→null，首个实际PNG在A/round-0-technical-1（ZIP26）。B/round-0（ZIP25）。A/round-1（ZIP30）和B/round-1（ZIP29）全部6图主审实看；B作者已冻结round1，A作者正在最后实图回看。task check-core最终现12张0局部几何/实色文字问题。匿名初稿12图评审已完成，最终等待A冻结后更新review-site交blind_review。
- experiment-4：A/round-0 ZIP27、B/round-0 ZIP28，全部12PNG主审实看，匿名初稿包已生成。A/round-1执行中，下载窗口已待检查/保存；B作者v2_retest2_b在写round1。初稿A2地图暂无数据句、B2地图天文标题裁切各1，core-inspection.json记录。blind_review在独立评experiment-4初稿12PNG。
- 当前worker：v2_retest_a（E3A最终回看）、v2_retest2_b（E4B round1）、blind_review（E4初稿）；v2_retest_b已冻结E3B；v2_retest2_a的E4A1等待实际PNG后最后回看。活跃并行限含root4；给idle agent发消息也可能因thread limit失败，需等槽位，不算用户阻塞。一次给E4B send_message因限额失败，随后followup已成功传全部初稿与裁切信息。
- 当前Scripter已重开并绑定scripter/editor，正在E4A1下载window。下一步：查真实DOM ready→点击下载→枚举Downloads最新ZIP（目前已知30）→解包E4A/round-1并看6图；B4新稿准备好再build/run。E3A如冻结，更新index-retest3+build-review后通知blind_review最终图；E4亦同。技术包装器支持第5参数technical（如A 0 3 1），禁止重覆已有execute源和已提交owner。
- E3 A与B已全部冻结round1（A/round-1/final-readback.md，B/final-readback.md），共24真实导出+先前失败记录；index-retest3/build-review已更新最终，用户可访问review-site/v2-retest1/index.html。blind_review已完成E4初稿并正在E3最终12图评审。
- E4 A round1 ZIP31实际看完且作者冻结（A/final-readback.md）；B round1 ZIP32实际看完，六图0局部几何问题，作者正在最后回看第三方向My双栏标题错层是否修复。若B再修只剩round2。当前Scripter停留E4B1下载window，最后ZIP32，下一次不要重复下载旧window。


## 最终接续状态（覆盖上方所有运行中描述）

Skill开发与本轮资源实验已收尾；设计方法v2三个独立成对样本experiment-2/3/4全部完成，84真实导出、72初稿/最终PNG独立评审SHA已核对，168冻结输入未变。B组视觉门槛0/3样本通过，不宣称稳定审美收益。新版偏好未收到；v1已全部拒绝。详见review.md、v2-summary.json/md、completion-status.json；最新匿名入口http://127.0.0.1:4277/v2-all/index.html，原生备份native/Starward-map-my-v2-all-trials.fig。旧T3覆盖/交接只属于v1；新版及手机未验证项如实列出，生产未改。

- E3 final=A1/B1；E4 final=A1/B2，仅B3 My的最后修订变化，其他五图与B1 SHA相同。全部作者与独立评审已完成；无需继续等待生成任务。
- 根preflight保留false，两处为冻结测试第31行的已确认模拟值；fixture-scan-review.json给出精确路径/SHA，未改冻结文件或检测规则。
- review-v1.md为原报告历史快照；review.md为最新合并报告。finalize-evidence.mjs属于v1旧脚本，不可拿来重写最新状态。
- 新的用户偏好若到达，应按样本和匿名编号另记，不能覆盖历史拒绝或假设批准生产。当前没有选定方向，P4/T5未授权。

- completion-integrity.json：最终168冻结输入、17个live Skill文件与测试冻结版一致、72评审PNG、最新.fig SHA和报告本地链接已复核。


## 用户恢复：Stitch最小设计试验

最新范围与恢复索引：stitch-trial/INDEX.md。只使用已有成果；两初稿→用户一句反馈→选中一次修订→有明显价值再一张我的。不覆盖既有结果，非同模型实验，不迁移生产。旧“先不继续”已由本次明确恢复替代。

## 当前采用的生成路线（2026-09-07）

用户选中 Stitch B，并明确要求当前 Skill 默认使用 Stitch 生成/修改视觉稿。见 stitch-trial/user-decision.md、stitch-trial/run.json 及 stitch-trial/INDEX.md。旧 v2 冻结 Skill 与历史失败记录保持原样，live Skill 已有意更新，不再声称与冻结版一致。尚未迁移生产或修改 DESIGN.md，未做新一轮生成。
