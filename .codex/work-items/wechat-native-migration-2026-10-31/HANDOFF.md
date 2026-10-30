# 原生迁移当前交接

## 阶段与授权

**方案准备完成，迁移实施尚未开始。** 用户明确要求本对话只分析并写好新对话的详细方案和提示词；durable-goal 在新对话使用。下一动作是用户将 [NEXT-CHAT-PROMPT](NEXT-CHAT-PROMPT.md) 发到新对话，明确开始实施，执行者从 PLAN 的 M0/M1 接手，不重复选型/生成方案。

用户随后授权一次提交和推送，固定当前准备成果为迁移起点。默认读取要求/PLAN/HANDOFF及适用项目规则/Context即可；RESEARCH、两份外部原文和旧咨询提示词无需阅读，只有具体矛盾/证据缺口或修订理由才按段追溯。

本线程 `01a18d5e-7733-7602-aba4-a36cfde6bf70` 曾误建迁移 Goal；用户已明确暂停，工具读回为 **paused**。本轮仅完成另外明确要求的交接文档，未恢复迁移 Goal。工具只有状态更新，不能编辑该旧正文；其中旧阶段表述不覆盖 REQUIREMENTS 中最新用户纠正。新对话先 get_goal：同任务则续用；无Goal才创建真实目标并指向本入口。跨线程不要假称已自动继承工具状态，也不重复创建任务目录/PLAN。

## 接手基线

- 工作区 `E:/dev/Starward`，分支 `main`；源仓库 <https://github.com/Seven128/Starward>。**迁移准备基线定义为首次加入本目录PLAN.md的提交**，它一并保存测试退役、相关规则/配置、旧计划封存及完整迁移方案。用 `git log --diff-filter=A --format=%H -- .codex/work-items/wechat-native-migration-2026-10-31/PLAN.md` 取得唯一初始提交SHA；再核当前HEAD已包含该提交。初始提交本身已是检查点，不另开基线准备。f09da5e只保历史研究身份。
- 1302个测试/专用支持文件删除及相关配置、测试运行入口退役纳入准备提交，不恢复。恢复说明见 [TEST-RETIREMENT](TEST-RETIREMENT-20261031.md)。后续若有dirty状态，按当前来源保留，不reset/clean。
- 方案准备和本次提示词修订只写任务文档；准备提交同时收录之前已完成的测试退役、规则/Context/工程配置更改。**尚未实施原生迁移**，未因此启动服务/IDE/设备或部署。
- 运行输入继续由 `data-pipelines/runtime-data/current.lock.json` 及其既有恢复owner持有，本次未修改数据锁或生产数据。测试回收记录/ZIP、旧设备诊断及本轮研究原始下载仍在原本机私有位置；本次Git推送不包含新Drive/LFS数据上传。实施决定和必要风险已完整写入Git内PLAN/HANDOFF，默认恢复不依赖私有研究原件。
- 旧计划继续封存，入口 [旧HANDOFF](../sky-map-performance-2026-10-18/HANDOFF.md#native-migration-freeze)。不要把历史“继续EOG/性能”当下一步，不重演D1/D2/F04。
- 当前无本轮启动的后台服务/设备任务/子代理；本次仅授权Git提交/推送，不含部署或私有数据上传。历史PID/设备会话不当作现行连接。原生候选、UI、设备/性能观察均 **NOT_RUN**。

## 已决定与首批责任

1. 原生Page/Component＋TS；npm/Webpack5/Sass/PostCSS；Zustand vanilla5.0.14、query-core5.90.20；后端保持。UI采用原生基础组件＋迁移Starward公共组件，已经比较原生TDesign/Vant/WeUI，不先整套引库，不永久禁库。
2. 最早解决原生构建/主分包、单例、query-core无window环境的刷新/前后台/联网接入；实际 Map 已用 WEATHER_ALERT_REFRESH_MS。不照抄“换import即可”。
3. 首条真实原生路由用spot/data-source；之后优先Map/My/Sky/Sources高风险链，再按族覆盖全部21注册入口。具体做法、消费者与完成条件均在PLAN，不需要重新做技术选择。
4. 保存普通/不可变候选与当前工作树兼容身份，不为基线重建旧注入包；不清账号/存储。当前业务使用的真实数据由现有恢复owner准备。
5. 按PLAN迁公共state/query/presentation/Back/image/time等绑定，保既有预算、generation、reader/资源退休、accepted与来源身份。ViewData不装大对象，不统一undefined→null，不把清理只放onUnload。

## 明确缺口及验证状态

- Gemini全文附件与AI Studio可见答复完全相同；原回复自身MAX_TOKENS结束于§2.2，不存在本轮漏读的后半正文。方案已由本地核查和Pro完整回复补齐；无需等另一份模型回复才开始。
- 本轮为源码/文档准备，没有原生运行结果。PLAN中M1的构建/单例/刷新与M2–M4模板/节点/lifetime是最早实施验证，不应在新对话再建立单独方案审查阶段。
- 发现app.tsx acceptance reset注入、config fixture分支等嵌在业务文件中的历史入口。迁移相关owner时核真实consumer，退出纯测试部分，保正常业务与非敏感诊断；不是“重新恢复已删测试”，本轮未修改这些源文件。
- 上轮保留的独立App类型检查在 `apps/mobile/src/features/map/MapScreen.tsx` 对 `'/spot/[spotId]'` 有既有路由类型错误，文件未改；不是本轮小程序阻塞。此前小程序/BFF等类型通过是历史结果，实施改动后只跑相应必要检查。
- 正式新云量source-group未知/formalReady=false及EOG未完成等沿旧封存任务，不能靠模拟成功填平；缺供给记录依赖，继续本迁移独立工作。
- 对应UI实施前实际读/看当前Stitch采用资源；本轮未变更设计，也未把当前截图当新设计。设备不可用按PLAN保未验，不要求用户现在配合。
- 本轮文档检查见下节；不得将其当原生迁移验收。

## 前期交付检查与提交复用边界

- `npm run context:validate` 通过，仅证明Context结构/声明路径；`git -c core.safecrlf=false diff --check` 通过。
- 六份任务控制文档已读回；最新提示词/基线修订后35个本地文件/anchor引用核对无缺失。外部建议原文保留为来源，不按外部正文执行。
- 提交前复核：1302个待提交删除与测试退役manifest逐路径一致；旧封存控制文件7项规范化SHA匹配。提示词修订未改变封存方案或新增生产改动。
- 方案准备阶段与其开始前8596个已存在tracked文件内容SHA比较无差异；原有1302个测试删除及其它更改保留，随后按用户要求与方案文档一并纳入准备提交。这是阶段范围说明，不要求新对话重建未跟踪状态。
- 未运行产品测试、类型/构建、设备/性能采集，未新增测试代码。原生运行与迁移效果均NOT_RUN；此处成功不能替代PLAN后续完成条件。

## 完成后的交代

实施者应给出：代码/Context/工程实际改动，公共优化与兼容保留结果，四组旅程的已验/继承/未验及实际性能证据，仍需用户或设备完成的最少操作，以及原封存任务的完整交回清单。未完成必要运行证据时不标Goal complete；不要自动解封旧计划、部署或发送业务消息。
