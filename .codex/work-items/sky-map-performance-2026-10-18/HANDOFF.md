# 当前交接

## 阶段、归属与恢复

2026-10-18，按用户最后要求完成研究、同一方案更新及新对话交接，本聊天停在准备完成。用户已打开可下载的 EOG 页面，R18 将原始获取/备份重新纳入下一实施阶段。用户在新对话发送 NEXT-CHAT-PROMPT 的明确开始指令后，由新对话接手实施；本聊天和已停止的“最新开发 (2)”不并行施工或操作手机。不要重做研究，也不要因引用 durable-goal 再次停在准备阶段。

唯一方案是 PLAN.md。先读 INDEX、REQUIREMENTS、INHERITED-REQUIREMENTS、PLAN，再按当前模块取证。原 A01–A15/N01–N09 映射和证据已恢复，定位见 INHERITED-REQUIREMENTS；复用 N01–N06。R17 新增地景拖动/背面灰层、上方时间选择器和时间轴性能，其余云观星内部仍归原任务。夜间拟物、100m/cm/屏幕物理尺寸、读屏、大文字排除；B04 只按真实规模决策触发。

旧聊天 Goal 工具状态为 blocked，正文仍是较早范围；工具不能改正文或设 active，本次未宣称修改、暂停或完成。GOAL-OBJECTIVE.md 是最新可用正文。新对话先 get_goal：无未完 Goal 时，按用户粘贴的明确请求创建自己的执行 Goal，仍指向本 INDEX；同任务已有 Goal 则续用，不新建竞争计划。不改内部数据库，不伪造旧 Goal 完成。整个产品 Goal 仍有必需工作。

## Git、已完成模块与证据边界

- 工作区 `E:/dev/worktrees/Starward/remote-main-20260908`，当前分支 `codex/remote-main-20260908`。本次准备前 HEAD 为 `fc098d4bda73c7fb56942f0d1618fcd549954030`；其后的交接文档/数据定位元信息以实际 Git HEAD 为准。保留当前 worktree 与未提交成果，不切分支、reset 或回退源码。2026-10-18 远端 main 仍为 `32ec61a4f5321e571d499be6430a09918d65242e`；近期交付只推当前分支，最终 main 同步未完成。没有 PR、生产部署或在途 CI/构建/预览操作。
- 原合并 `32ec61a4`、957 份设计源与迁移包/Stitch 一致性、当前采用资源保留、两条合资格祖先分支删除已有证据；见 SOURCE-AND-MERGE-AUDIT 和原整合记录，不重复迁移/删除。DevTools 已移除旧入口，最新源码/必要窗口规则已落 AGENTS、Context 和 skill。
- Map/Sky 卸载返回、身份限定状态/阅读位置恢复、逆向整页转场已实现；generation4 的 DAY 进入/Back 退出独立复核通过。约 1.15s 入场至星点、1.11s 返回黑场等待是开发样本，没有支持必须加入云幕降级的证据。复用 PHONE-GEN4-REVIEW/MAP-LIFECYCLE；环境改变后只重评实际受影响项。
- 包体位图去重、Sky 专属 client 下沉、Wi-Fi 分包预载已做。覆盖滞回、共享源/窗口读取、有限前进窗口和云格 footprint/小时/时钟修复已做。稳定地形请求身份、静态分发、必要细档预发布和真实冷缺口改善尚未完成。
- 静态夜光独立 API 和真实 Map 消费者 `3b0d8916` 已完成；数据流程 `95aeb066`、Compose 端口身份修复 `8e86f862`、共享测试夹具修复 `581a5a9b` 已提交并检查。BACKEND-DATA-REVIEW 独审覆盖 `95aeb066` 与受影响 `3b0d8916`，唯一 P2 已修并做真实非默认端口隔离恢复。旧审查者已结束，不复用其身份或扩大结论。
- 当前最近全量绿灯是 `581a5a9b` 的 [Product CI 39108911384](https://github.com/Seven128/Starward/actions/runs/39108911384) 和 [Context 39108915196](https://github.com/Seven128/Starward/actions/runs/39108915196)。BACKEND-DATA-DELIVERY.json 持有详细结果：资源 11、部署 248、合同 84、API 962 pass/38 skip、小程序 2617 pass/1 skip、发布/平台 53、候选 6，以及构建/隔离设施/备份恢复/OCI。39 个 skip 不是产品通过。旧 52 失败和后续已修的 7 个夹具失败不再是当前未分类缺口；新生产变化需对应新检查。

## 当前运行环境：先读回身份再使用

| 资源 | 最后确认状态与边界 |
| --- | --- |
| canonical watch/API | 8787，保留必要服务；不要为造测试状态而清理用户进程 |
| 原手机 API | 8791，旧代码、MEMORY_TEST、fixture weather、真实地形；有内存账号状态且无完整快照/恢复 owner，不能为 benchmark 重启或假称它已运行新后端 |
| 恢复后 API | 127.0.0.1:8794，当前数据恢复服务；loopback，不能直接当手机可达服务或真实天气验收。启动身份/配置用现有 published launcher 读回 |
| 隔离设施 | Compose `starward-r6-recovery-20261018`，PostgreSQL 17 `127.0.0.1:55432`，Redis `127.0.0.1:56379`；数据库 `starward_restore_r6_20261018` |
| 外部恢复目录 | `E:/Dev/Starward-data/restores/r6-20261018/`；`runtime.private.json`、`infra.private.json` 含接收端配置，仅按需本机使用，不输出内容 |
| 手机候选 | generation9，`C:/Users/777/AppData/Local/Temp/starward-device-feedback-t6aywi/generation-000009-6i4r76/project`；SHA `29351b4197e64b6e3fe2365b19e01b85e2700795fbc592f44d61c3b6cc4fb732`，338 文件/4,949,193B，主包 2,012,475B/余量 84,677B |
| 手机反馈 owner | `C:/Users/777/AppData/Local/Temp/starward-device-feedback-t6aywi/feedback.json`；device session 为同根 `starward-device-test-mCmFmC`，最后 operator_confirmed。重新确认无线连接、前台及新鲜像素后才能输入，不用旧授权/截图直接点击 |
| 新静态夜光本地候选 | `apps/wechat-miniapp/dist/weapp-check-overlay-static`，SHA `649874f95fe478cacd4c44a29b2065f22af1235feee11f1f35e37aeb9db4f62e`，主包 2,013,644B/余量 83,508B；STATIC-LIGHT-CANDIDATE.json 持有字节。它没有绑定手机，不能与 generation9 混称 |

2026-10-18 监听 8787/8791/8794 和隔离 PG/Redis 仍在。临时路径、PID、配对、会话不能当下次仍就绪的保证。普通自动预览和 guarded ADB 曾可用，旧 SDK/MCP remote-debug 失败不是永久不可用结论；按项目 development/device skill 从当前最小观察恢复。默认只保留一个必要项目窗口，仓库→完整构建→工具/手机，关闭前核对最新同步，不将产物反写源码。

原 r6 的 runtime/private 文件全部核验，公共运行组 1544 文件/234,624,578B；1025 LFS 指针及 519 原始 JSON，937 个唯一 LFS 对象已推。73 张表完整行/hash、22 项迁移、准确 r6 PUBLISHED 绑定已核；对照用了原证明的 Asia/Shanghai session 格式，没有改数据库时刻。当前 HTTP 光害/原图 hash/固定地形已通过，见 ASSET-MIGRATION-STATUS、RESTORED-DATABASE-CHECK、RESTORED-API-CHECK。r6 为有限大湾区 509 格/z7–11，地形仅 7 项，不是全国或所有细档。

复用 `backend:data:status/prepare/verify/check-db`、`dev:miniapp:published -- --config <external-private-config>` 和既有 Compose owner。恢复环境保持 `MINIAPP_AUTO_MIGRATE=false`、`WECHAT_REMINDER_DELIVERY_ENABLED=false`，不启动提醒 worker。旧 `dev:miniapp` 默认库/worker 不能误接此恢复库。手机号、坐标、凭据和私有资料只在外部私有 owner，不写入交接/Git。

## 已有真机结果与仍欠缺内容

- H1：generation5/6 的真实中面板、3,394×3,148m、0.0/0.7 logical-px 居中及拖动接管可复用。更细视角、快速改选/布局/私有/提交入口、连续双指，以及历史桌面差异仍未整体关闭。
- H2/H4：真实持续配准、缩放后山脊/坡面、手持连续双指、必要恢复和前后性能仍欠。恢复后约 4km 地形请求首次 **3,926ms**、重复 **6ms**，z12 不在已恢复 z11 资产内；9ms 粗档响应不代表细档。见 RESTORED-TERRAIN-SAMPLE。云格/时间/拖动局部手机证据用 SAMPLE_DATA，不是实际 QWeather 验收；原始 r6 新接口/版本/颜色与当前手机整条链还需集成。
- H3：真北/360 方向/20km、真实 COG 接口和 generation6 Canvas/来源/完整许可可读已有证据。缺测/失败不侵害独立地图照片、合格真实照片的时间/方位正值与 iOS 仍欠，禁止编元数据。
- H5：generation7 一次定位、拒绝后手动浏览、恢复原“使用小程序时允许”、再定位不抢相机已有证据，没有权限更改待撤销。精度、首次允许、系统定位恢复、原生选址、必要触摸/窄屏和 iOS 明确缺口保留。
- H6：generation9 实际 SPOT 海报显示并保存相册一次已通过；自然 PLAN/SPOT 分享的真实接收身份/公开访问/失效，以及导出文件实际交接未完成。手机相册仅有一张本任务测试海报待该旅程后精确清理，不能扫相册或擅选联系人。
- **N05 保护：** 原手机计划列表最后为空且没出现一般草稿续写入口，未扫描存储，草稿身份仍 UNKNOWN，不等于已删除。N05 不在 PostgreSQL dump，不能宣称恢复或重置账号来重建。原账号/草稿/历史/VPN/配对继续保护；R6 提醒已真实送达，绝不重发。

## 后续执行顺序与研究结论

1. **EOG 原始源及同步（可独立推进）：** 用户已说明可下载，本聊天实际读到 [官方 2025/v22 目录](https://eogdata.mines.edu/nighttime_light/annual/v22/2025/) 的两个精确文件。`median_masked.dat.tif.gz` 标示约 238M，`cf_cvg.dat.tif.gz` 约 1.9G；都是界面舍入的压缩传输量。锁定解压 TIFF 共 17,420,036,496B，运行成品约 235MB，三者不同。源码/日期/文件名已写 `current.lock.json` 的 `officialSource`；状态仍 LISTED_NOT_DOWNLOADED_OR_HASH_VERIFIED，原 TIFF 未下载/复核、Drive 未备份。用户拥有的 Chrome EOG 标签仍打开，请保留。按 PLAN 的 EOG 模块获取、流式解压校验、优先存原 GZIP 到既有私有 Drive、远端读回及同锁记录，补齐共享导入/验证。旧 RAW-SOURCE-UPLOAD-PROMPT 只是同 hash 原机副本的备用路径，不再要求等待原机。
2. **R17 优先实施：** SKY-INTERACTION-RESEARCH 和 CPU/vector/drag/window JSON 已完成研究，生产修复尚未实施。选择器预览出报告时段被页面拒绝，显式 Apply 才更新；需只读几何供给和统一时刻/取消/应用语义。地景模式近极点 clamp/re-grab 有数值异常，普通过地平线未证明都异常；灰层公式存在但混合后很暗，不能直接宣称代码缺层。按 PLAN 修真实运动和合成效果。
3. **R17 性能：** BSC 基础 8,404；SAO v2 发布 246,280/826 tiles，不是每帧全部加载。实际 10.8° 样本加载 24 tiles/最多 8,565 SAO，完整准备 CPU median12.14/p9518.94ms（不含 React/GPU/照片）。精确向量早剔除试验将窄视野局部 kernel 8.39→3.46ms，尚未集成/真机验证。复用固定 Stellarium 源码研究，不移植引擎/GPL代码、不减星/任意限帧；共享消费者及 full-path 对照后才采用。geometry 默认现有观察窗口，缩窗须证明实际传输收益并补齐相邻窗口/ruler/注册锚点。
4. **地形/云量/光害持续优化：** Web GPT Pro 建议仍在 PLAN 的 overlay 模块和 ARCHITECTURE-ADVICE-RECONCILIATION，未被 R17 替换。继续稳定客户端窗口身份、有效旧覆盖、目标范围成品/细档和静态对象/CDN分发；测冷源→生成→下载→解码/安装→可见覆盖。必要时才试同数据/总像素的一张1024²与四张512²、有限可取消预取；保半透明父子叠色、配准/接缝/时效/资源退役。真实数据缺失、0与未发布明确区分；不重做已完成 QWeather v1 迁移，不照搬报告预算/组合矩阵。
5. **H1–H8 和交付收口：** 集成一批再生成手机候选；有依赖则先推进不需人工的工作，真实接收/合格素材/iOS/手持判断集中后置，缺项保未验。做必要行为检查、模块独审、最终包体/版本绑定及受影响 CI；核对所有 R/H 义务后按已授权 Git 流程同步分支/main，精确清理任务资源。部署生产、新付费或删除未知私人数据不在当前授权内。

LFS 已获免费使用/$0 意向授权，但账号无付款方式，界面未成功建立 $0 预算；现为无付款方式的免费额度阻断，不得称已设预算。若将来添加付款方式，先落实 $0 超额阻断。Drive 曾读到 5TB 容量/390.2MB 使用，是当时快照。原交接密钥曾意外进入工具输出并已告知用户；不要重复读取/输出或复用作长期备份密钥。Drive 下载应使用原始文件且 `include_base64:false`，只打印必要非敏感元信息，不输出完整载荷/带凭据下载链接。

本轮只改计划、交接和 EOG 导航元信息，没有下载大源、生产修复、构建刷新或新手机操作。具体执行方案的默认值、允许模型决定的少数分支和重评条件都在 PLAN 的 delegated decisions；这份状态不另起方案。

准备核验：Context validation、Git diff whitespace 检查、修改文档中80个本地链接目标存在性均通过；数据锁逐字段比较确认仅新增官方定位/观察回执，原TIFF哈希/大小、未备份状态及运行/私有分组均未变。文档修改未重跑全产品测试，既有CI适用范围仍如上。
