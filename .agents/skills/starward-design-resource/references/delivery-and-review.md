# 交付契约与评审

本文件保留 Codex/Figma 原生资源契约及旧 A/B 测试方法，仅在采用该路径或用户明确要求复验时使用。默认 Stitch 路线见 [stitch-route.md](stitch-route.md)，不要求把 Stitch HTML 伪装为 Figma 节点，也不自动启动下述全部实验/状态矩阵。

一个 run 目录包含 brief、run.json、resources.json、review.md、proposed-design-delta.md、implementation-map.md，以及真实 figures、snapshots、scripts、assets。未完成实验可交付明确未完成的记录，不能创建空 PNG 或假原生文件。`check-resources` 拒绝空候选集；`preflight` 可在导出前运行。

## JSON 契约（schema 1）

`run.json`：`schema:1`、`runId`、`repository`（绝对路径）、`researchHead`、`executionHead`、`startedAt`、`model:{id,effort,source}`、`versions:{codex,node,runtime}`、`runtime:{path,status,fileKey}`、`usage:{inputTokens,outputTokens,reason}`、`sourceFiles:[{path,sha256}]`（仓库相对）、`failures:[]`、`manualInterventions`（不可取得时 null）。不采集密码/cookie/账号私人内容。

`resources.json`：`schema:1`、`assets:[{id,path,sha256,source,license}]`、`boards:[]`。
每个 board：`id, candidateId, page(map|my|probe|components), state, mode(day|night|observation), width,height, scale(1|2), round(0|1|2), revision, fileKey,nodeId, screenshot:{path,sha256,revision}, snapshot:{path,sha256,revision}, controls:[key], assetIds:[], codeOwners:[仓库相对路径]`。原始图 round=0 永久保留；最终轮由候选 page/state/mode/width 的最高 round 派生。

真实快照：`{schema:1, origin:'figma-plugin-api', fileKey, revision, capturedAt, root:{id,type,name,width,height,visible,children,...}}`。节点包括 `x,y,characters,fontName,fontSize,layoutMode,controlKey,codeOwner,reactions`（存在时）。产品检查要求按 `resources.json` 同级的 `requirements.json` 条件规则定义 `page/state/mode` 对应必需 controls，不能靠作者随意省略 board.controls 通过。规则是测试输入，需从当前合同预先冻结；不证明静态所画行为已在 WEAPP 执行。

修改后递增 revision，同轮更新结构/PNG，旧文件留在原 round。hash 证明本地文件一致，不证明外部真实性；实际工具运行日志与回看仍是必要证据。修改共享组件需报告受影响实例；仅改我的文案时核对地图导出/节点未变。无 `.fig` 则明确未导出。

## 比较页

`build-review.mjs` 先校验资源，再输出独立 `review-site/`：复制 PNG 为无分组含义文件名、固定匿名随机编号，同候选两页配对、round-0/final 分开；不内嵌 A/B、模型/工具、自评分或作者说明。私有解码表放 `review-key.json`，不复制到评审站。候选 ID 只在内部 JSON 使用，不进入图片产品画面。页面提供每页原始逻辑尺寸查看，窄屏允许横向查看画板，评审网页自身不是 H5 产品。

## 首次 A/B 实验

共同输入必须固定模型/effort、当前产品 owner、必须的项目 Skill、素材、fixture、数量、最多两轮修订和底层 helper。A 不读新设计方法，B 不看 A 图；输入清单与 hashes 记录。独立会话/子任务只有在获准委派时使用，否则注明污染，不捏造因果。第一阶段每组3方向×2页；初步有用后冻结 Skill/输入，另两次独立成对试验。修 Skill 则另起版本，失败不合并抹除。

见用户测试方案的原始 T0–T4 细目。第一次看图前固定视觉量表/权重与阈值：每次 B 至少2方向两页产品正确、视觉各≥4且无单项<3；报告全部候选最低/中位/达标率；至少1方向由用户明确认为值得继续；三次满足才称当前任务初步可重复。未人工盲评/手机检查不得代填，不把模型自报或生成者自评分作通过证明。视觉无增益但人力成本降低可以如实讨论，A强且B仅增加成本则精简。

## 推荐与交接

推荐未选定方向补两页390×844三模式；地图small、large有/无图、layer、实际部分/旧值/风险；我的无计划、加载、离线/同步失败和支持的身份恢复；320长中文，375/430主要布局，组件状态板。200%须服从当前 owner 暂停范围，另记探索不能计生产完成。检查普通文本4.5:1、关键图形3:1、44logical-px与命中不相交，素材来源和观测自有UI闭合调色板。原生地图/OS/白闪/连续手势留给后续真实运行。

交接普通修改句例：“我的保留方向，把现场反馈与纠错的说明改长，其他地方不要重做。”只给包即可定位、改文本、重排和导出；读回验证地图未动。报告工程/产品/视觉偏好/采用生产四层；用户未选不更新根 DESIGN，生产未改不运行无关全仓重型测试。
