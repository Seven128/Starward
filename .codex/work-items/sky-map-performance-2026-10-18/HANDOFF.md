# 当前交接

## 阶段、归属与恢复

2026-10-18，用户在新对话明确发送 NEXT-CHAT-PROMPT 的实施指令，本对话已接手并按 GOAL-OBJECTIVE 正文创建 active Goal（无 token 预算）。沿同一 PLAN 实施，当前先处理 R17，EOG 和全部未撤销 R/H 义务保留。旧聊天和已停止的“最新开发 (2)”不并行施工或操作手机。准备阶段已结束，不重新调研或等待准备确认。

唯一方案是 PLAN.md。先读 INDEX、REQUIREMENTS、INHERITED-REQUIREMENTS、PLAN，再按当前模块取证。原 A01–A15/N01–N09 映射和证据已恢复，定位见 INHERITED-REQUIREMENTS；复用 N01–N06。R17 新增地景拖动/背面灰层、上方时间选择器和时间轴性能，其余云观星内部仍归原任务。夜间拟物、100m/cm/屏幕物理尺寸、读屏、大文字排除；B04 只按真实规模决策触发。

旧聊天 Goal 的 blocked 状态不变；本对话先 get_goal 确认无现存 Goal 后创建执行 Goal，仍指向本 INDEX。整个产品 Goal 仍有必需工作，未标完成。接手基线 HEAD 为 a36aebf8b29da9e6054dc5ecda8c564c7d921291，工作树干净；8787、8791、8794 和隔离 PG/Redis 均仍监听。官方 skill 同步结果 current、无需 reload；runtime 1544 文件/234624578B 校验复用通过，未重做数据库恢复。

## Git、已完成模块与证据边界

- 工作区 `E:/dev/worktrees/Starward/remote-main-20260908`，当前分支 `codex/remote-main-20260908`。本次准备前 HEAD 为 `fc098d4bda73c7fb56942f0d1618fcd549954030`；其后的交接文档/数据定位元信息以实际 Git HEAD 为准。保留当前 worktree 与未提交成果，不切分支、reset 或回退源码。2026-10-18 远端 main 仍为 `32ec61a4f5321e571d499be6430a09918d65242e`；近期交付只推当前分支，最终 main 同步未完成。没有 PR、生产部署或在途 CI/构建/预览操作。
- 原合并 `32ec61a4`、957 份设计源与迁移包/Stitch 一致性、当前采用资源保留、两条合资格祖先分支删除已有证据；见 SOURCE-AND-MERGE-AUDIT 和原整合记录，不重复迁移/删除。DevTools 已移除旧入口，最新源码/必要窗口规则已落 AGENTS、Context 和 skill。
- Map/Sky 卸载返回、身份限定状态/阅读位置恢复、逆向整页转场已实现；generation4 的 DAY 进入/Back 退出独立复核通过。约 1.15s 入场至星点、1.11s 返回黑场等待是开发样本，没有支持必须加入云幕降级的证据。复用 PHONE-GEN4-REVIEW/MAP-LIFECYCLE；环境改变后只重评实际受影响项。
- 包体位图去重、Sky 专属 client 下沉、Wi-Fi 分包预载已做。覆盖滞回、共享源/窗口读取、有限前进窗口和云格 footprint/小时/时钟修复已做。稳定地形请求身份已实现并独审；静态分发、必要细档预发布和真实冷缺口改善继续实施，不能用代码检查替代手机等待改善。
- 静态夜光独立 API 和真实 Map 消费者 `3b0d8916` 已完成；数据流程 `95aeb066`、Compose 端口身份修复 `8e86f862`、共享测试夹具修复 `581a5a9b` 已提交并检查。BACKEND-DATA-REVIEW 独审覆盖 `95aeb066` 与受影响 `3b0d8916`，唯一 P2 已修并做真实非默认端口隔离恢复。旧审查者已结束，不复用其身份或扩大结论。
- 当前最近全量绿灯是 `581a5a9b` 的 [Product CI 39108911384](https://github.com/Seven128/Starward/actions/runs/39108911384) 和 [Context 39108915196](https://github.com/Seven128/Starward/actions/runs/39108915196)。BACKEND-DATA-DELIVERY.json 持有详细结果：资源 11、部署 248、合同 84、API 962 pass/38 skip、小程序 2617 pass/1 skip、发布/平台 53、候选 6，以及构建/隔离设施/备份恢复/OCI。39 个 skip 不是产品通过。旧 52 失败和后续已修的 7 个夹具失败不再是当前未分类缺口；新生产变化需对应新检查。

## 当前运行环境：先读回身份再使用

| 资源 | 最后确认状态与边界 |
| --- | --- |
| canonical watch/API | 8787，保留必要服务；不要为造测试状态而清理用户进程 |
| 原手机 API | 8791，旧代码、MEMORY_TEST、fixture weather、真实地形；有内存账号状态且无完整快照/恢复 owner，不能为 benchmark 重启或假称它已运行新后端 |
| R17临时开发桥 | 物理LAN8795，exec session70503；`tmp/r17-phone-bridge.mts`。保留8791账号/Context，公共Map/terrain读取当前8796，formal-only geometry调用当前源码；没有worker/新账号。诊断collector已加载45秒协议，严格白名单/32项/串行准入，不导出账号或绝对时间。不得当完整当前后端、真实天气或私有提案验收。关闭只停此owned进程 |
| 当前Map产品API | 127.0.0.1:8796，exec session47733，`tmp/start-r17-map-api.mjs`；当前源码+原恢复PG/r6+新有限地形发布+prepared light root/hash，迁移/提醒关闭，fixture weather。已修临时launcher遗漏：通过既有backendDataEnvironment映射原r6，再显式选新地形；四目标8项HTTP metadata/图片及headers通过。私有配置副本在外部development/r17-phone-map，原恢复配置不变 |
| 恢复后 API | 127.0.0.1:8794，当前数据恢复服务；loopback，不能直接当手机可达服务或真实天气验收。启动身份/配置用现有 published launcher 读回 |
| 隔离设施 | Compose `starward-r6-recovery-20261018`，PostgreSQL 17 `127.0.0.1:55432`，Redis `127.0.0.1:56379`；数据库 `starward_restore_r6_20261018` |
| 外部恢复目录 | `E:/Dev/Starward-data/restores/r6-20261018/`；`runtime.private.json`、`infra.private.json` 含接收端配置，仅按需本机使用，不输出内容 |
| 手机候选 | generation16，当前feedback持有精确随机目录；SHA `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf`，338文件，主包2,016,773B/余量80,379B。当前UI/geometry/preview-only ruler+优化stellar的45秒诊断CANDIDATE；原实现baseline SHA `61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5`。不是最终普通候选，BUILD持有完整源码/产物绑定 |
| 手机反馈 owner | `C:/Users/777/AppData/Local/Temp/starward-device-feedback-t6aywi/feedback.json`；device session 为同根 `starward-device-test-PVPhGl`，operator_confirmed，实际candidate45秒菜单已见。现在`android_r17_comparison`独占手机/DevTools/feedback，root不得并行输入或refresh；正式公共测试Context04:30未被测量提交。旧session/输入/截图已由refresh owner退役，不能再使用。所有操作仍需新鲜像素 |
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

1. **EOG同步：** 两个精确GZIP及17,420,036,496B TIFF身份均与原锁一致，r6未重产。原owner-only Drive已完成selected9对象2,264,285,772B实际下载/校验；cf受实际连接器256MiB限制采用8有序分片。共享receiver从真实远端bytes向新receiver-tiffs目录完成第二次解包准入（installed2/compressed2），不是复用原TIFF。fresh `eog_delivery_review`独审通过并独立10/10，代码/锁/说明/evidence已提交e6a68d22。大IO结束；不重哈希17GB。额外未选中cf整包待精确回收，不扩共享。
2. **R17生产修复已合批：** 地景极点反解/背面灰cue、共享BSC/SAO精确向量早剔除/惰性角数组、只读geometry窗口、统一时间选择器/ruler/播放、跨日注册锚点和取消/显式应用连续性已接入。独审的legacy私有Context重检与“ready不等于painted”两个P2已修并验证。详见R17-LANDSCAPE-REPAIR、SKY-STELLAR-INTEGRATION/CPU-COMPARISON和R17-INDEPENDENT-REVIEW。CPU结果不等于真机帧率。
3. **当前手机与下一动作：** generation10跨日期/小时预览/取消、generation14 preview-only ruler与显式Apply实际结果保留。12秒probe首样本全0，INVALID_EMPTY_WINDOW；同一两侧诊断扩大45秒后已取得baseline四个有效camera/time样本，wide-camera271prepared/84accepted/0fail、真实SAO，wide-time57intent/68accepted/0fail且取消回04:30。baseline两次play后退WeChat Launcher，Android退出原因相对时间对应SIGABRT/status6与SIGSEGV/status11，仍未定位因果；不能当play通过。手机代理已换generation16，完成对应candidate样本并区分播放异常，不盲重跑。raw证据刷新前归档。全量API963pass/38skip；小程序2627pass/6个夹具fail/1skip，六项已修且相关57/57通过，见R17-CURRENT-TESTS。正常候选/地景motion与剩余目标验收继续保留。
4. **地形/云量/光害：** stable-window60检查和独审通过；有限地形13PNG/4窗口保旧URL/像素，publisher路径保护P2已修独审。Map seal524PNG/2,546,488B保原522URL，hash89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0；55部署检查通过，最后524GET+HEAD/Range/304实际Caddy通过，首轮15s失败保留。own容器已退役/62514无监听。prepared consumer27/27+API类型通过，真实2PNG读回及fresh独审通过；8796四目标8项运行HTTP已核。原3.926s基线仍有效，不把2.1ms暖metadata当手机冷缺口改善。Chrome OSS当前无登录会话/无已确认target，未写远端或采购。H4固定只读runtime workflow39126102107因唯一staging容器身份未成立失败，仍未验真天气；不以fixture补足。
5. **H1–H8和Git收口：** 所有未撤销结果继续，不重做N01–N06。H3已取得Commons同源真实东坝地面照片及原EXIF时间/真北方向，见H3-PHOTO-INPUT-READINESS；尚未进入产品，不冒充深圳现场/正式点，iOS等边界保留。H4-REAL-WEATHER-READINESS保当前运行身份失败。自然PLAN/SPOT真实接收人和文件交接仍欠，必要人类动作后置。保护N05、原账号/提醒/配对/VPN；R6不重发。相册那1张任务海报待精确清理。EOG已commit，其他实现与当前CI/最终push/main同步仍在收口；最终逐项比较R/H，不能标整体完成。

LFS 已获免费使用/$0 意向授权，但账号无付款方式，界面未成功建立 $0 预算；现为无付款方式的免费额度阻断，不得称已设预算。若将来添加付款方式，先落实 $0 超额阻断。Drive 曾读到 5TB 容量/390.2MB 使用，是当时快照。原交接密钥曾意外进入工具输出并已告知用户；不要重复读取/输出或复用作长期备份密钥。Drive 下载应使用原始文件且 `include_base64:false`，只打印必要非敏感元信息，不输出完整载荷/带凭据下载链接。

当前并行归属：android_r17_comparison独占手机/DevTools/feedback，root独占8795/8796服务和INDEX/HANDOFF/PLAN。Map/data/诊断构建/天气/照片准备及fresh reviews代理均已结束，不复用。root只做小型API/文档/Git，不运行大IO或重启受保护8791。

私有原始视频/截图应在每次feedback refresh之前复制到外部任务证据owner，刷新会删除旧nested device session。generation9原私有session及其未保留原片已随此次刷新退役；历史观察结论保持历史范围，不能称本次重新审片。当前generation的新证据在刷新前须先归档。
