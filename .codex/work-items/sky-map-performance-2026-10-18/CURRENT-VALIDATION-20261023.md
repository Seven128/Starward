# 当前共享验证结果（2026-10-23，续检至2026-10-24）

这是完整Goal/H7的验证owner。下列批次针对4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0之后的R20工作区；用户现要求提交为跨机接力检查点，实际提交身份由Git/远端读回确定。下方先记新结果，再保留原失败及原件定位；新结果只覆盖实际执行范围，未验和跳过不能消失。

## R20本轮新结果

**管理端后续实际CI与依赖修复：** e468f9d8的[Context40046668094](https://github.com/Seven128/Starward/actions/runs/40046668094)success、[Product40046664661](https://github.com/Seven128/Starward/actions/runs/40046664661)生产audit failure及后续全skip保持历史事实。最小依赖修复已推送精确读回4dcf56d0；其[Product40048384492](https://github.com/Seven128/Starward/actions/runs/40048384492)与[Context40048388751](https://github.com/Seven128/Starward/actions/runs/40048388751)均实际success，两者head完全一致。Product在2026-10-24 01:18:34 UTC终态，job120735232250实际通过冷安装、audit、release-code、App/API/admin消费者、后端及非部署WEAPP构建/inspection、隔离infra与OCI。本机audit零漏洞、HTTP7/admin12/article25无skip及独审/官方包核验保原范围，不替代上述远端实跑；所有原失败和安装中间结果归[CI证据](R20-CI-INFRASTRUCTURE-20261024.md#管理端交付后的生产依赖审计)。尚未提交的地点命令不在4dc CI范围内。

**地点管理命令本批：** [实现证据](R20-ADMIN-LEGACY-IDEMPOTENCY-20261024.md)记录实际同键重复创建/修改、mixed-version旧写入及数组spotId入库失败，现已实现显式新路由、actor/key串行、revision CAS、原子receipt与CLI版本/效果核验。新独审独立PG/HTTP/CLI6/6、认证7/7、消费者15/15和类型通过；另发现匹配receipt缺请求字段仍确认的P2，root正式回归修前5pass/1fail，修后完整消费者15/15，独审原正负控制2/2+CLI6/6确认修复，均无skip、无遗留范围内P1/P2。Context/runner语法/限定diff通过；自有PG及listener已关、库卷保留。尚待本批提交与精确CI，4dc不覆盖；原no-key调用仍非幂等，部署与真实cache恢复未验。

**管理端 journal 本批：** [恢复证据](R20-ADMIN-RESTART-RECOVERY-20261024.md)记录原重开丢失、strict scalar receipt、独审只读身份误退休的真实失败及修复。真实Chrome完成正常重开/跨窗口6POST/2effects、sealed storage/确认清行；单次存储故障保认证读取，阻断与显式恢复0POST，再明确写入1POST/1effect。另查Case旧详情优先于新dashboard；按真实CHANGES_REQUESTED留队机制建立修前失败/修后刷新，浏览器同Case1POST/1effect与显示状态一致。最终root受影响12/12+admin类型通过；最新独审独立12/12、六readback6/6、只读原反例1/1，全部无fail/skip、无未闭合范围内P1/P2。Context/限定diff通过；已推送e468，其远端audit失败及后续skipped按开头实际结果保留，不冒前批CI覆盖。原probe误挂Queue的0/6、真实P2和中间截图资格分开保留。浏览器合成HTTP不证明部署/PG/Redis、公缓存、OS crash或完整Goal。

**F14私人现场草稿及后续合同整合：** [Field证据](R20-FIELD-STATE-20261024.md)接通实际表单→专用SQLite current/history/原子receipt→原键重试/当前读回，退役旧field假成功。正文完整保留、缺profile版本null；独审真实发现category数组落库P2，root修前回归失败后修复，并沿同机制实际复现/修复channel、transport、stage.kind数组。新修复独审HTTP25/25+clients23/23及实际三表无效果/旧合法scalar兼容通过；原生接入独审12项+两组各2项，无范围内P1/P2。root在全部正文/enum修复后的最终API类型+30文件135/135、mobile类型+36文件139/139、structured3/3均exit0且无skip。OpenAPI已对齐通知/行程真实v2与v1升级/兼容，root独审/实际DTO schema复验通过；Context结构与限定diff通过。原HTTP404、正文400及四条类型误收200均保留，完整family仍passes:false；在线私人草稿不等于设备SQLite-first队列/离线包、安全/分享或生产鉴权。

**后续远端检查点：** 验证修复已单独推送`ab47dc01b915ae11080acf4c0a5030e2def3f3dd`并精确远端读回；[Context40003317339](https://github.com/Seven128/Starward/actions/runs/40003317339)success，[Product40003311535](https://github.com/Seven128/Starward/actions/runs/40003311535)已实际success，包含release-code、App/API/admin、构建/inspection、infra/OCI。它包含通知父提交f41，不包含后续field/enum/OpenAPI；后者已推送并精确读回f2b255ae，Context40005868190、Product40005906382均实际success（Product终态19:00:35 UTC、job120593615372全部25步通过）。管理端restart新在途不在上述提交/CI内；原717失败继续保留。

**2026-10-24实际远端CI：** 含CI夹具与Sky具名帧的检查点 **8fdf9b6b8efe93a98ab2c798446ea057958e2310** 已推送并精确远端读回。[Context39993227368](https://github.com/Seven128/Starward/actions/runs/39993227368)与[Product39993219808](https://github.com/Seven128/Starward/actions/runs/39993219808)均 **success**；Product实际包含release-code、native App/API/admin消费者、后端及WEAPP构建/inspection、隔离基础设施和OCI构建。旧2c的[Product39985637469](https://github.com/Seven128/Starward/actions/runs/39985637469)仍为历史failure、当时OCI skipped；两个媒体夹具失败及真实隔离修复/独审见[CI证据](R20-CI-INFRASTRUCTURE-20261024.md)。后续资源家族和规则配置不在8f CI范围内；未执行扩展fast组合或设备验收不因CI通过消失。

**Sky资源与后续CI修复：** [资源全消费者](R20-SKY-SCENE-RESOURCES-20261024.md)已推送71703c95；其[Context39995771042](https://github.com/Seven128/Starward/actions/runs/39995771042)success，但[Product39995764825](https://github.com/Seven128/Starward/actions/runs/39995764825)实际failure（Miniapp2812通过/1失败/1skip），后续步骤skipped。原features/Sky1123/1123与资源独审47项只证明该模块。services来源fixture先复现再接真实共享liveness，5/5及新独审5/5；AppID缺省误判guard修前失败/修后7/7；真实science测试又发现误用历史源码保全，显式保全修复后当前数据9/9、旧清单严格拒绝，新独审无范围内P1/P2。全部原失败/skip与输入原件保留，未改production算法或数据pin。

**最终本机fast组合：** root完整`npm run check:miniapp:fast` **exit0**，AppID/SDK/三types、contracts88/88、MiniAPI1061项（993通过/0失败/**68条件跳过**）、完整Miniapp2814/2814（无skip）、design结构、workflow177/177、icons/semantic-assets与4项UI source-pattern通过。前两次组合失败未覆盖；完整日志/hash及各修复归[CI证据](R20-CI-INFRASTRUCTURE-20261024.md)。绑定既有science输入，独占子进程清空数据库/Redis连接；未连接共享服务。4项source-pattern不是采用稿、运行时或业务验收，68skip不算已验。新提交远端CI待实际运行，field新模块不在本批组合范围；目标像素、物理资源、六字段/Play性能与OOM未验。

**F14通知配置本批：** [真实规则定义/API/App消费者](R20-NOTIFICATION-RULE-CONFIGURATION-20261024.md)已完成创建/修改/定义启停、current/history/restart/replay及原itinerary共享事务/完整pending生命周期；Node/domain独审及旧模块真实落库兼容probe通过。native独审复现两client在未知重试遇输入parser拒绝时清pending的P2；root两条修前回归均失败，修后5文件24项通过，新独审原反例2/2与24项通过，无该修复未关闭P1/P2。root规则批API workspace **29文件125/125**，最终mobile fast **typecheck+34文件128/128**，各无失败；初始mobile126通过不冒已覆盖P2。最初缺规则404、Feb30滚日期及parser-retry失败保留。配置保存不代表评估/权限/排程/投递，整family仍passes:false；后续私人现场草稿及enum修复终态见开头，不在本通知125/128批次范围。

**前批具名帧与数据：** [具名帧](R20-SKY-FRAME-INPUTS-20261024.md)最终纯星座输入调整后与2c对照440帧、BSC8404/实际loadedSAO最高8565、数值0差；首轮1119项中64个旧fixture失败修后，该检查点整个Sky1121/1121、无失败/skip。两批新独审、完整Miniapp锁定TS5.9及Mini API workspace noEmit通过；Scene→body type误引Taro globals的修前失败保留，现pure profile修复。两TIFF/压缩传输当前本机hash与9项Drive私有metadata已核，旧远端完整读回复用，见[依赖记录](NEW-COMPUTER-DEPENDENCIES-20261023.md)；其余私有恢复不据此关闭。

**当时workspace整合检查（后续终态见上）：** root使用工作区入口运行`npm run test:mobile:fast`，mobile typecheck与32文件112项通过；独立API workspace typecheck及28文件116项通过。App首次整合因新增ItineraryScreen测试的createElement类型推断失败，改为显式JSX后整个mobile入口复验通过。API运行前后源码hash核对没有API变化；随后validator取消无依据字段上限的定向复验归行程证据。这是当时整合批次，替代根目录可能混入历史tmp的汇总统计；F09/F10和后续通知终态见上，不将不同批次相加，目标运行时不据此通过。

**F14/F10/F09本批独审纠错完成：** [真实行程草稿](R20-ITINERARY-DRAFT-PERSISTENCE-20261023.md)两项P2修后API21/App17/双typecheck通过，新独审实际HTTP6/App17通过，无该范围未解决P1/P2；首次超限可改重交，未知后重试拒绝仍保pending，观测类型不再用profileId。structured保持整family未通过，来源/路线/分享/协作不被草稿代表链关闭。[独立云量](R20-INDEPENDENT-CLOUD-DELIVERY-20261023.md)地点panel轴/旧覆盖retry及后续时间失败被Scene隐藏三项P2均已修，新的最终独审11项通过，无该范围未解决P1/P2。2026-10-24完整Map页面目录`src/pages/map/*.test.ts`回归448/448、0失败0skip，exit0，32,145.8ms；日志在任务tmp的`map-module-integration-20261024.log`。[F09](R20-SKY-TIME-QUERY-POLICY-20261023.md)跨Context旧hold/ABA草稿P2已修，新独审实际6文件66/66，无该范围未解决P1/P2。各批不能相加冒一次全套。全部目标设备/实际H4/原生性能/OOM仍未验；不以通过数覆盖失败。

**真实Web双标签页CAS已修复并复验：** [真实Chrome证据](R20-PREFERENCES-WEB-CAS-20261023.md)保留旧Web Locks/localStorage两base0均确认version1、刷新仅剩beta的失败。新IndexedDB事务适配通过真实Chrome155双页直接同expected CAS、命令竞争/显式重试、同intent回放、重载、回滚与旧字节迁移；最终DKYwBL证据及输入hash已核，独审无未关闭P1/P2，所建服务/浏览器已关闭。不外推真机/Expo或完整偏好产品验收。

**F07整合及最后恢复修复：** [消费者实现](R20-NATIVE-DECISION-CONSUMERS-20261023.md)共享快照/精确时刻与实际选点接线经独立7文件41项及route/verifier53项检查；真实Shooting组件+存储探针曾复现A已落盘、确认丢失后切B再重试覆盖A版本。root已修冻结attempt、精确读回、版本不可变/显式冲突另存；限定当前root的mobile4文件13项、domain1文件7项通过，新的独审2文件4项通过且无未关闭P1/P2。原根目录7文件34项含两份历史tmp副本，已纠正统计，不能冒当前全套。原失败保留，AsyncStorage跨进程/标签页原子性及设备结果未验。后续F14/F10/F09整合、typecheck及独审终态见上，原中间失败仍保留。

**新机偏好v2批次：** [实现/验证/独审](R20-PREFERENCES-V2-IMPLEMENTATION-20261023.md)已将下方接力失败修复：domain20/20、structured真实当前态/重启及两条反例3/3、真实双SQLite无已确认数据丢失。mobile曾完整27文件81项通过，随后独审三项P2修复的最终定向4文件33项及typecheck通过；独立复核实际2文件14/14。原失败记录保留为修前证据，不再称该偏好边界未实施。各批不能相加冒最终全套；Web真实结果见上，真实Expo/设备仍未验。F07原4项错误复现由生产消费者回归接替，修前及独审失败历史保留。

**跨机检查点原失败（偏好修后结果见上）：** `packages/domain/src/preferences/runtime.test.ts`新增`changed payload`回归1失败/1过滤skip：同键异内容被旧实现错误replay，当时生产尚未修。真实双SQLite实例探针同时确认version1但readback只剩一份；[合同核验](R20-PREFERENCES-CONTRACT-REVIEW-20261023.md)记录其条件。F07脚本4/4是对实际日期/时刻/详情错误的复现断言，不是产品通过，见[消费者核验](R20-NATIVE-CONTEXT-TRACE-20261023.md)。这些不能被下方较早通过覆盖，也没有为提交把失败改成skip。

最新续批见[精确账户媒体](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)及[原生App最终独审](R20-NATIVE-STATE-FINAL-REVIEW-20261023.md)。精确媒体原4项+两条真实丢回复6/6，终态夹具修正后另1/1；probe5/5，原恢复持久化8+普通MEDIA4合跑12/12，提醒15/15、API noEmit通过。App最终生产代码完整fast为25文件/67测试与typecheck通过，独审后增1回归并运行两文件13/13；不冒称一次68项全套。真实PG/Redis和实际React消费者harness各有边界；未跑设备/IDE/构建/整个Mini API/远端CI。最新专用PG/Redis已于20:44按owner停止。

此前媒体批次已完成对应开发检查/独审：[媒体生命周期](R20-MEDIA-LIFECYCLE-20261023.md)记录头像/私有写25/25、贡献含expiry消费者46/46、有限维护真实PG1/1、有效期替换真实PG1/1；[对账](R20-OUTBOX-RECOVERY-20261023.md)记录14/14和真实Redis进程重启、原提醒15/15；[锁序](R20-CONTRIBUTION-LOCK-ORDER-20261023.md)记录6/6及上传3/3、准入4/4；新增注销/ack反例修复后完整普通MEDIA文件4/4通过，见[独审](R20-QUEUE-LOCK-INDEPENDENT-REVIEW-20261023.md)。最后Mini API noEmit和定向diff检查通过。它们是不同有效范围/批次，不能相加冒一次全套；下方981通过属于更早批次。精确媒体最新范围见上，部署/长期运行和Goal其余缺口仍保留。

- **Mini API全本地套件：1023项，981通过、0失败、42跳过，exit0，424,147ms。** 命令为worker cwd下`node ../../tools/run-node.cjs --import tsx --test --test-concurrency=2 'src/**/*.test.ts'`。本进程所有DATABASE_URL/REDIS_URL类变量清空，未连接另一聊天服务；日志为`tmp/r20-miniapi-local-suite-20261023.log`。本轮先验证一项真实缺料失败及锁定正文hash，再材料化text-history并运行该完整套件；这提供旧354失败清单之后的新状态，不假设每个旧失败都有相同因果解释。
- 该完整套件后，独审发现的管理提交后缓存错误、跨重试历史未知状态均已修复并复验：后端HTTP7/7、实际React页面/会话/CLI7/7、Mini API/admin-web noEmit通过；新结果不冒称该较早全套已包含最后修复。
- **当时AppID实际check + 6项回归通过；UI contract 4 probes和native-chrome 11项通过。** 原歧义来自历史Markdown，原DAY color探针来自已退休tabBar；未修改正式AppID、历史证据或采用UI。当时未跑`check:miniapp:fast`组合入口；后续完整组合终态见开头，不能倒改旧批次范围。
- **原生App typecheck/34 tests、独立API typecheck/102 tests、astronomy-core typecheck、admin-web typecheck通过；CI选择器/接线13项通过。** 接通实际消费者后修复了独立API支持目标与Gaia身份不匹配，未改变WEAPP/BSC/SAO负载。管理页面/会话/CLI检查及后提交修复归同批管理证据。
- **头像安全批次：真实专用PG、本地文件及隔离行为18/18通过，无skip。** 包括旧对象退休失败/禁用恢复、真实COMMIT后丢回执、同键并发、旧回放、ACTIVE/CAS及既有私有写屏障；不证明BullMQ/Redis重启或完整删除/审核锁序。专用60709 cluster测试结束已停止，数据/owner记录保留，未触共享PG。
- **text-history MATERIALIZED：78件/32,931,704B。** v79实际1,323,326B、SHA-256 `ec640a1a5297edac7f8070474aa116d66aef75684b2d2c5ca605e9658703c059`，实际parser接受536行。没有篡改FRESH/PARTIAL资格、上传资料或覆盖未提交原件。

实现、实际命令及独审分别见[R20共享检查](R20-SHARED-CHECKS-20261023.md)、[独立消费者复核](R20-CONSUMERS-INDEPENDENT-REVIEW-20261023.md)、[头像安全/退休](R20-AVATAR-COMMIT-REPAIR-20261023.md)、[管理授权/恢复](R20-ADMIN-AUTH-VALIDATION-20261023.md)。上述为各历史批次范围；最新检查点的远端CI/基础设施及完整本机fast结果见开头。条件跳过、其余必要基础设施分支、真机/IDE及完整Goal仍未完成；复用仍适用的历史检查，不机械重跑。

## R20实施前结果（保留历史失败）

| 入口 | 结果 | 范围 |
| --- | --- | --- |
| npm run check:miniapp:fast | FAIL | 首步 wechat_app_id_tracked_identity_ambiguous；组合入口提前停止，不能称全套通过。其余必要检查另行运行如下。 |
| npm run check:miniapp:sdk | PASS | 原命令 exit0。 |
| 三工作区 typecheck | PASS | @starward/miniapp-contracts、@starward/miniapp-api、@starward/wechat-miniapp 均 exit0。 |
| miniapp-contracts test | PASS | 88 测试，88 通过。 |
| miniapp-api test | FAIL | 1010 测试：618 通过、354 失败、38 跳过。公共根因未定位。 |
| wechat-miniapp test | PASS（有跳过） | 2792 测试：2791 通过、0 失败、1 跳过；不把跳过当已验。 |
| npm run test:miniapp:workflow | PASS | 177 测试，177 通过。 |
| npm run design:system:verify | PASS | 结构检查，不代替采用稿/目标画面验收。 |
| npm run check:miniapp:icons | PASS | 图标检查。 |
| npm run check:miniapp:semantic-assets | PASS | 语义资产检查。 |
| npm run test:miniapp:ui-contracts | FAIL | field-signal-native-chrome: missing color: NATIVE_CHROME_THEME.DAY.color。 |
| npm run context:validate | PASS | Context 结构检查，不证明全部普通 Markdown 链接或事实正确。 |
| assets:verify -- catalogs | MATERIALIZED | 1656 文件 / 116,246,189 B。 |
| assets:verify -- images | MATERIALIZED | 285 文件 / 29,912,377 B。 |

MATERIALIZED 仅证明本地字节存在，来源哈希、许可、格式和发布准入仍由对应 owner 验证，不能扩写为所有数据/运行条件完成。

## 原失败定位入口（历史记录，已修范围见上）

1. AppID：tools/miniapp/wechat-app-id-migration.mjs 对所有 tracked 文本执行 wx 加 16 位十六进制匹配，当前命中两份历史证据和正式 project.config.json：
   - .codex/work-items/cloud-sky-native-2026-09-22/P1-TARGET-RISK-VERIFICATION.md
   - .codex/work-items/cloud-sky-native-2026-09-22/evidence/native-runtime-identity-2026-10-09.md
   - apps/wechat-miniapp/project.config.json

   原检查报歧义；不能据此自行改正式 AppID、删除或篡改历史证据来消警。先核 owner 的身份规则和真实现行配置，再决定必要修复。

2. UI contract：tools/miniapp/verify-ui-contracts.mjs:10:44 报 DAY color 缺失。先比较合同与实际 native chrome owner/消费者，区分实现缺失和测试边界失配，保采用设计语义。

3. API：失败集中在天体资料/缓存/搜索、中文说明与发布恢复、Prepared optical、日月供给/消费者。代表入口包括 celestial-information-cache.test.ts、celestial-object-information.test.ts、chinese-tianyue-publication.test.ts、prepared-optical-information.test.ts、sky-luminary-consumers.test.ts；多条为 PARTIAL 与 FRESH 不符，另有 0 与 1 不符。用日志与共同数据/运行 owner 先定位一个能区分解释的代表失败，再判断共享修复及受影响验证；不要把 354 项直接称 354 个产品 bug，也不要未经证据统一归因 Windows、数据、fixture 或既有问题。

失败与修复归原 H7 / 现有责任，遵守 UI→叠层→Sky 产品优先级及必要依赖。修复后运行足以验证该边界和受影响消费者的检查；没有新代码、失败或具体风险时不机械重跑整套。

## 原件定位

原始日志保持私有，目录：C:/Users/momoooo/.starward-private/code-review-snapshot-20261023/。这里只引用已存在的检查文件，不移动、重写或上传原件：

- check-miniapp-fast.log
- source-validation.log、source-validation-results.json
- remaining-validation.log、remaining-validation-results.json
- assets-catalogs-verify.log、assets-images-verify.log

本次交接已读回两份 results.json、测试汇总、两项具体报错和资产结果。日志正文可能包含本机路径或运行数据，按最小必要范围读取，不批量复制进 Git。
