# 电脑端官方 WEAPP 运行与 workflow 修复（2026-10-09）

## 本阶段结果与边界

当前官方 DevTools 2.02.2609232 / Skill 0.3.11 equal、登录有效；非默认安装 `E:/微信web开发者工具` 已由官方安装检查确认。复用已配置的 Codex MCP 凭证，通过任务本地私有读取包装器调用官方 scene，未保存凭证、账户字段或原始配置。没有重新安装、换账号、手机推送、发布或部署。

电脑上此前没有当前仓库 watch 进程；原 WEAPP 293 文件完整复制保留在 `output/cloud-sky-native-session-2026-10-09/previous-weapp`，再沿已有 `npm run dev:miniapp -- --no-open` 建立当前源码的 PostGIS/Redis/API/outbox/Taro watch。既有两开发容器健康，数据库/cache readiness 和迁移 022 已读回。一个父子 Node 运行链为 11388→17352，启动时间 00:43:48 UTC；终端 session 99080 是本次持续开发 owner，仍保留，不能因静默或旧指针再启动第二套。此为开发状态，不是部署、容量或完整恢复验收。

官方精确打开 `E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp`，初始完整构建 300 文件、13247488B、bundle hash `0c30c77ab458f02c2a69df653cf87b9377b4b15b9aaa3ee32bc3fb12229296a8`，源与 config 绑定见本机 `binding-before-open.json`。构建有既有 common stylesheet order 警告，不能写成无告警。后续 canonical 字节修复触发了原 watch 的必要增量；最终构建另有本机 result 的当前 fingerprint，不把两个 epoch 混用。

初始截图明确为 IDE Loading project all files，首 currentPage 超时保留；单次同路径官方 `cli auto` 恢复返回实际 autoPort 9420，有监听与当前项目 watcher，公开 SDK 读回 `pages/map/index`。自建观察 socket/launch receipt 已释放，IDE 和原开发服务保留。官方 scene 的 currentPage 与仅返回 primitive 的页面结构读取随后可用；36 个 Map 数据节点不证明实际可见和可操作。原正常场景的账户/存储身份未验证，没有清理或改写其存储/账户。

## 实际 native 消费者

官方 `simulator_screenshot --optimize false`、currentPage、实际元素点击与 compiler scene 执行，均只代表电脑 DevTools：

- Map 仍出现白色主体，仅系统栏/TabBar。搜索元素 tap 回执成功，但那次 route 没有成功变化；日志有官方桥接 `An object could not be cloned` 和 `routeDone with a webviewId ... is not found`。`fields/computedStyle`、原始 rectangle/text 等查询超时单独保留；回执、页面数据节点和已连接都不能改写这个失败。确切产品/原生 Map 合成/截图捕获归因尚 UNKNOWN。
- 一轮官方 cleanCompileCache/cleanProjectFileListCache＋refresh，未碰 storage/auth/session，没有恢复 Map 画面；停止同故障重试，没有盲重开或改基础库。
- 当前 `sky/detail/index.wxml` 官方局部编译 codeLength 305476；WXSS 2文件 totalCodeLength 200708。局部编译并非正常星空或控件通过。
- 对缺少参数的 `sky/detail/index`，实际深色页面、返回箭头、信息卡“观测信息不完整，请返回入口核对地点与时刻，再打开云观星”、返回入口按钮可见；真实点击 `.status-panel button` 后 currentPage 到 `pages/map/index`。这是缺输入 recovery/返回 route 的限定开发证据。原 Map 画面缺口不因此通过。
- 公共搜索原生画面可见“没有匹配的观星点”。按生产 repository 相同发布条件只读查询，26条记录全部 PUBLIC_EXACT，但 published/temporarily-closed 0、complete assessment 0、fresh assessment 0、当前合格公开记录0。没有改写或发布这些记录来绕过条件。
- 字节修复完成后，用同一官方窗口取得 `final-current-sky-missing-input.png`（479×1035）并读回当前 `sky/detail/index` pageId28/query空；已实际查看。此仍是缺参数路径，**正常 Canvas/WebGL/时间/日期/选择/跟随/来源Back/native控件尚 UNVERIFIED**。

初始项目列表在工具启动阶段读回0，之后重新读回3条历史 Starward import（weapp-check、20260924 standalone、source-shape）。这不是已清理或 canonical-only 证明；未核其完整 owner，不移除列表项，更未删磁盘。列表清理仍 UNVERIFIED，后续只按官方 project-manager 核实并处理 task-owned transient；不要从首次空列表推定历史 entries 不存在。

## 保存点四项 workflow 失败的有界修复

`workflow-conformance.test.mjs` 初始仍18/22，与保存点四失败一致，完整日志保留。不是四个新增产品缺陷：

1. Map source check 仍要求页面直接持有 PageContainer，实际已经由 `NativeBackBoundary` 唯一持有。检查现在覆盖共享 owner 的唯一 container/armed show/overlay false/禁止 slide-down/leave callback，以及 Map 的完整 active 条件、实际 Back handler、事件 subtree 和编辑离开守卫；不把共享封装当删除返回能力。
2. Sky source check 仍要求 next report/row 的 target frame，实际已采用完成绘帧 `paintedData?.targetFrames, paintedAt`。检查跟随已绘帧责任，保留其余安全区、显示与返回检查。源码 wiring 不冒传感器、时序行为或原生验收。
3. 对两个资产清单及 semantic generator 一次审计91项，16项 raw hash 不同，全部仅 CRLF→LF 后精确匹配已有预期 hash，无其他差异。原字节完整保留；依现有 `.gitattributes` 规则修复15 SVG＋generator；之后 geometry check 揭示其5个 parent SVG 同样 CRLF，确认其 LF 原图与三份已有模式成品/许可完全一致，再保留原字节并归一。没有改 manifest hash、图形、颜色、许可或设计采用，没有重新生成资源。

初始18/22、第一次21/22和最终22/22日志均保留；最终全部22通过。生产界面规则未放宽。源码检查维护和 hash 读回不替代完整 runtime/质量验收；独立审查仍 MISSING。

## 唯一下一依赖

沿已有隔离开发数据/生成 owner 提供明确绑定的有效公共 spot＋Context，再用当前官方 session 检查正常 WEAPP 星空、原生时间/日期/选择控件、互斥浮层和来源Back。隔离开发数据不能提升发布、科学/影像质量、手机、持久恢复或容量账；保持原 Postgres 26条状态和账户数据，不创建或发布假合格记录。保留现 warm watch 与所有失败，不重跑闭合软件矩阵或无变化图像加工；局部受阻继续其它电脑义务。最终手机/物理资源/独审和33项完整验收仍开放。

全部本机 receipts、原图、源/输出 pin、hash 审计、修复前字节、日志与最终 machine result 在 `output/cloud-sky-native-session-2026-10-09/`。资源和 byte snapshot 仍 ignored 本机，不是远端完整备份。源码和任务事实未提交；没有切分支、迁 main、merge、reset、stash、清成果、推送、采购、部署、发布或外联。原 PS/SXT/派生区域/背景各阶段结果、FAILED/UNKNOWN/MISSING 和33条 obligation 原值保持。
