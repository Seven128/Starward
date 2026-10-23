# 接收机性能结果与六字段长按修复

这是当前正常路径的 `development_feedback`，不是完整 Goal 或最终设备验收。未变的 r7 分配、两层源码映射、gen22/23 阴性、r9 退休和 r10 跨日结果继续复用。原 gen26 及 legacy 推送 UNKNOWN 不升级。

## r16实际反馈与r17下一观察：2026-10-21

r16已由官方普通预览送达，手机唯一版本标识及原source/bundle绑定成立。日期回跳修复的第一段人工操作有8次intent，均取得首次accepted，42–176ms；间隔587–2954ms，不能称连续压力验收。用户报告该段无明显卡顿。后一段全天空264.355°夜间六字段记录15,047ms，67个intent、47个首次accepted（54–322ms）；20个未取得首次accepted，其中19个已被后续输入替代。draw中位30ms、p95 43ms、最大81ms；不能将内部accepted间隔当作物理FPS，也不能把scene.modes=DAY当作真实太阳状态。该15秒窗口只覆盖用户整段操作的一部分。

用户随后明确：是**按住箭头不松手，数字连续变，年月日星图松开后才明显跟上**。现有控件没有松手提交或人为等待松手的节流。root以同一r16、夜间全天空进行一次2秒日减长按，实际7.888522秒录像及独审显示：中途并非完全零更新，但星图明显落后，最后追上；未记录独立touchend时间，不能编造松手到画面的精确延迟。原件及判读位于私有`device-resume/r16-date-review`、`r16-hold-review`；此前仅据录像文件名推定录制开始/不重叠的理由撤销：文件名的Date.now发生在录制完成之后。实际帧内容仍保留各自证据范围。

同段独立前台进程watch的PSS从1,111,442升至1,749,248KiB，后一个watch在用户报告停止后从1,584,708降至1,526,672KiB。watch内部目标绑定有效，但两watch没有已核同PID连续性，且产品run未绑定；不合并成回落曲线、不折算每次输入成本、不据此判定泄漏根因。bridge末31条geometry成功返回为30–48ms，仅是host HTTP完成边界，不证明手机收到、验证、hook准入或绘制。B的强保留链问题仍未答。

r17沿原15秒manual-input收集器补充intent→逻辑client调用→abort/已验证Promise完成→现有hook赋值，128条有界数字事件、弱响应身份、32KiB既有导出预算；不改Query/Promise、调度、取消、输入或产品状态。20项fixture、严格类型检查及独立审查通过，当前完整source `91c9249d4ce1ba8b758f0aa372c90d03508945dbd3d6fa0324b116c9e21558dc`，bundle `0566c4edbbc0cadf3219a3825a579b03cc9811961e642998e98ce64ab94ac1e3`，337文件/5,016,764B，31份maps包外。21日03:49已实际见手机唯一r17标识并绑定；下一观察仍须恢复全天空/地景后从真实长按触发，区分连续取消、验证后未准入、准入后未显示。溢出/导出省略不能当作后续事件不存在。没有数据上传或Git提交。

本次空Memory timeline不是用户没有保存：当前安装前端先创建记录/显示Snapshotting，再等待目标回包，只有解析出实际snapshot才允许保存。r7的`(empty)`曾有203/87.9/92.1/130/142MB读数，因此该名字不是空目标证明；当前0B与消息计数也不证明内存数据有效。最先应确认当前Sky目标和变化的heap数据，不能重复空timeline。没有版本修复证据，不升级/降级或改网络作猜测。

## r16地形原生更新结果：2026-10-21

一次1800ms横拖的v2 receipt已完整返回，r16冻结源码、编译JS和WXML均核实真正接入onUpdated。begin→end的1789ms窗口内没有合格更新回调；mid503ms读到变化的视野，但buffered请求窗口仍等begin、end才变。因此不采纳onUpdated驱动预取，不以固定500ms轮询或扩大buffer补救。

实际4.830289秒录像中，3.850878和4.197389秒右缘仍有缺口，4.746911秒已填满。该窗口已热，metadata 3ms、asset 40ms，不能当作2.3秒冷源问题已修；host/手机/media clock尚无共享偏移，不拆算响应后出图时间。原冷源记录9块中6块同ID/SHA命中、3块新读取，现有SharedReadPool与完成源LRU在工作，未发现可直接修的缓存失效。

跨覆盖时，已有或排队细图确实使allowInitialPreview不发父图，安装owner另有initialOnly保护。下一有价值的候选是先验证现有原生接口能否单覆盖替换，再评估实际可见范围缺失时的父图填补；不能只删保护或接受双重透明染色，也不能未经核对就降低旧覆盖细节。完整判读及9件原件本机哈希保全见私有`device-resume/r16-native-region-review`。完整三叠层与A/B均未关闭。

## r14六字段反馈与r16回跳修复：2026-10-21

用户本次Memory timeline尝试在Stop后仍显示`Snapshotting…`，图与对象表为空，没有可验证导出；不是零分配，也不认证当前采集目标。用户报告未卡死：分钟流畅、小时略卡；日/月/年连续点减时数字减一又加一反跳。秒数字实际会变化，所谓“不动”是全天空下几分钟的星位变化肉眼不明显，不按秒控件失效处理。一次独立USB capture确认当前仍r14、264.4°全天空含地景，六字段和下方时间尺都显示14:18:38；该静止帧不证明之前每次输入都已绘制。

已复现产品原因：在同一Context内，先准入跨日窗口A，再回原报告窗口，随后请求尚无供给的B。`useSkyTimeGeometry`暂时返回保留A，model身份变化触发页面`observationTime.bind()`；旧分支因A不覆盖B，将最新意图重置为committedAt，控件随后照权威值回跳。修复只让同Context供给变更保留意图，覆盖不足继续暂停/阻止播放；Context替换、确认的新公共时刻、取消及现实当前时刻上限仍有效。没有修改供给权限、accepted准入、控件事件、相机或星数。

原代码新增回归3项失败；修后owner/geometry/输入/preview status/commit continuity共21项通过。独立审查另核owner/geometry/access共16项通过，无P1/P2，确认权限拒绝仍移除报告、停用资源并撤销已绘备用资格。未改的控件与r14冻结SHA相同；现有控件harness六字段各12次共72次touchStart/end/click严格递减，既有18项通过，仅为受控逻辑证据。当前miniapp typecheck及完整r16 prepare/build成功。

r16在原构建器合并这项修复与r15已准备的onUpdated常量空间观察，没有另建探针体系。source `9973b38ab56a4bcf1a62b816aedbe763f1569df84d7300fb17d4e0f7172ad56b`，bundle `13d103f011184798cdc1b36cdfd91fa334b229128a9633ce9890460f18c4a473`，337件/5,012,344B，main余量95,442B；31份maps共7,341,412B留包外。路径`tmp/r17-normal-a1-review-r16-usb`；用户后续确认旧快照始终无数据。原普通预览审批阻塞已在用户明确继续后解除，实际送达及后续结果见上节；该局部修复不关闭B。

必要截图与capture回执已复制到私有`device-resume/r14-six-field-feedback`并读回SHA，manifest持3件原件身份。手机PNG SHA `f5d40b7f41b59f956f4419ef45787b67108b305691169c66f9c7d34d7a4f689e`；用户桌面PNG SHA `368c3f8e097485dfc8a6b5665176e34a6d337cef5f999c9dde7fbfc9cc55e74d`。同目录一次foreground-owner限定内存观察为PSS1,580,596KiB、RSS1,894,196KiB、SwapPss65KiB，纯观察、无输入；没有配套前值或profile目标关联，不归为本轮增长量或Sky专属堆。所有原件留本机，无上传/提交。

## r14地形手势范围：2026-10-21补充观察

当前完整r14、已绑定USB设备会话和官方true-debug连接沿HANDOFF复用；此次实际VM执行位置尚未补核，不能将回调耗时升级为普通预览性能验收。未重启、推送或修改生产代码；原有地形缓存已热。

一次真实1800ms水平拖动已触发现有一次性native-region观察，记录通过严格schema读取，source为`c792f4511615e17daed8c5fbddc0e79f43ecac5e9c09873662e6cc1cf994f44e`。begin读在0ms发起、2ms返回；mid在500ms发起、502ms返回，真实bounds已改变；user end在1779ms，end读1823ms完成。没有无效/后退clock；这仅建立同一JS窗口内的事件/回调顺序与wall elapsed。

**决定下一动作的区别：** 中途bounds虽已改变，其buffered请求窗口仍等于begin窗口，且不同于end窗口。因此1277ms只是中途读领先end的间隔，不能称为有效预取提前量或等待收益。不采纳固定500ms预取，也不把native读取能力等同于地形修复。现有`onUpdated`是可复用的潜在事件来源，但当前观察器未记录它；其文档只保证渲染更新完成，不保证手势中持续触发。下一次必要候选只需补核它是否在真实begin/end之间到达及是否带来新的有效窗口，再决定事件驱动、单个可撤销且与最终查询共用identity的metadata预热；不先建轮询系统、独立fetch/cache或第二相机writer。

私有`device-resume/r14-native-region`已保存原记录、录像和前后截图，4件共5,476,006B逐件复制读回一致。记录SHA `5915393b113e81bbd71523fb1208dff52be6547bb54526315f40496ff9bd85a0`；录像SHA `3ff57160b0c3870712bfde04968c4d44e155171f4a1ab310819b4691e37a5feb`，实际4.874244s而非请求的6s。实看6个解码帧及最终截图：地图发生移动，结束后地点面板收起，最终地形覆盖仍在；这段不作为完整空白时长或配准验收。所有原件只在本机，没有上传/提交。此观察不回答Sky闪退的强保留链问题。

## r13结果：全天空失败与地形初始覆盖

已退休r13完整候选和设备会话见HANDOFF；下文r12段落保留其原始适用范围。用户要求已增加“全天空、包含地景”的最大视野。r13失败样本的用户相机为264.355°；r14重新进入后为45°，恢复同条件前不能称已保持原相机。45°“基本跟手”不关闭这一负载。

- 45°人工快速六字段：`baseline-r17-1-727wgsibha`有82intent、47firstAccepted、35在首帧前被替代，首帧23–290ms／p50 62／p95 166，最终requested−accepted为0；用户反馈基本跟手。对应录像结束在实际点按前，不能称已录到整段输入。
- 初次264.355°尺拖从未来Context开始，命中既有现实当前时间上限，72intent实际只变化约2.037秒；不是正常大跨度尺拖基准，不作为故障修改上限。之后经真实时间尺向过去移至20日20:30，像素与六字段同步。
- 完整正常Play `baseline-r17-3-ghzyqaf9fv`：14,042ms计量窗，249draw/native callback/accepted，189preparation中188已消费、1成本低于时钟分辨率；BSC8404、SAO2934／106tiles。draw p50 42ms／p95 50ms／max422ms，accepted gap p50 55ms／p95 69ms／max428ms，failed/invalidations为0。独立15,082ms标量窗有35,646次原生文字测量，不能混分母折算每帧。没有物理FPS结论。约15秒起始录像与独立20:31:00暂停像素、同run pauseSuccess=true存在；terminal相对Pause时间为null，不能只凭它声称精确60秒测量或全程无停顿。随后实际Apply并重开面板显示20日20:31:00，作为过去时刻测试起点。
- **最大视野快速六字段失败：** 用户报告非常卡顿并直接闪退。本次没有新的15秒metrics导出；自动record首先因截图过期未启动，随后capture因不在小程序前台拒绝，没有闪退视频，不伪造操作时序。22:29:04.628 Android ApplicationExitInfo记录appbrand0/PID4931为APP CRASH(NATIVE)、status6、前台importance100、PSS1.3GB/RSS1.6GB。22:29:04.577对应native栈为JSRuntimeLooper/libmmv8/SIGABRT，Abort message含两次Mark-Compact：1372.0→1359.1MB（1367.26ms），1370.1→1360.6MB（1623.48ms），均allocation failure。此为同时间窗微信小程序进程的V8存活堆/GC事实，支持内存分配压力导致长停顿及退出；未取得错误强保留链，也未直接读回该PID的整包identity。不能将整个堆归因于单一函数、文字测量或GPU。无全机日志/聊天采集，无重开/清缓存。
- 私有 `r13-runtime/exit-20261020/appbrand-exit.private.txt` SHA `b1b5bbd62fd0d41c61e459ff3d6c81cdb2cb6e7e9beae542f3af6350fd101ab7`；同目录 `native-crash.private.txt` SHA `5c72dbda369f4dc1a8d768ee61b61828aa48ed3e3ac309ad3f6c1c0be4a85106`。前者只保限定appbrand退出块，后者仅对应时间/PID的45行崩溃块。原GC记录不足以认证全Goal或找出retainer。

地形初始父图修复已通过本地与独立源码检查及真机像素独审：fresh `terrain-cache-visible` 的一次启动，完整父图先显示，随后同请求细图替换；录像首次粗覆盖区间(3.744822,3.836322]s，细替换(6.884578,6.987256]s。父metadata99ms/asset96ms，fine2039ms/asset7ms，源读1855.75ms；不同clock不混成精确interaction latency。独审未见全幅空白或错位，天气提示部分遮文案，非全部文案验收。之后cloud+terrain pan右边仍有约12%缺口至少2.701s，fine2285ms/asset11ms／source约2095ms；这决定继续测试提前读取实际native移动窗口的能力。不能把初始父图成功当pan已解决，也不将父图叠在旧fine下造成双重着色。

LIGHT切换末两帧出现黄色覆盖（约2.294s）、cloud切换约2.194s已见蓝色覆盖；LIGHT pan采样保留黄色与地形，没有同类直边缺口。初次LIGHT asset计时因观察器路径匹配错误为unknown，后续已修复观察器但不回填。cloud为本地SAMPLE_DATA。详细像素/请求判读归私有 `r13-runtime/visible-review/REVIEW.md`、`overlay-interaction-review/REPORT.md`，不重做已答观察。

## 交付与当前候选

公开 `wechatide -c Codex auto_preview` 已取得真实结构化 success。r10 成功 run 为 `starward-device-feedback-UwDjUw` generation2；用户误按返回后明确要求重推，后续 r12 使用新 run `starward-device-feedback-YbNzac` generation1。手机实际菜单显示 `R17 正常Sky关联 A1 r12 USB`，fresh capture 后才绑定 session `starward-device-test-VLWnPh`。

- r12 source：`99246b31242408157015765dfc49090d7a7ec7169dce6befea09976fff5fc57e`。
- r12 完整包：`7a64f49ef07760a697b4351363c0cf41e27928e46d86a133e7825ce291d2fcb6`，337文件／5,003,888 B，main 1,993,932 B／余量103,220 B，31份map留包外。
- 普通预览、手机开发调试 ON／vConsole、USB reverse、本地只读r6与SAMPLE_DATA。没有当前true-debug Memory graph；官方runtime AppID及手机包字节仍未独立读回。
- r11 是独审期间的中间候选，未作本次手机产品结论；r12 同批包含短屏留白修正。

## 六字段：修复一个真实连续输入故障

修前r10录像中，秒长按期间出现“更新中”，底部固定的面板向上移动约26逻辑像素；手指原本位于箭头，随后落到原生Input，弹出数字键盘并打断长按。分钟有同类现象。秒1500ms最终只从00到04，分钟800ms从30到33。旧秒计量只有4个真实intent，firstAccepted32–41ms，不能把输入中断归因于昂贵星图计算。

修复在 `SkyTimeControls` 预留固定44px反馈行，共置原有状态文案及失败重试。未改六字段repeat、日期/当前时刻校验、播放、取消、Apply、数据或绘制owner。独审发现320/384×568时新增固定行挤压时间尺，已在窄矮屏仅压缩30px留白；保所有44px操作目标。采用稿HTML未在接收机已知路径找到，沿现有采用owner和修前真机画面修正；完整采用资源视觉对照仍未验。

33项已有时间/覆盖层/披露检查及完整构建通过。独审实际SCSS回放覆盖72个有界状态，原始短屏P2在等效留白修正下消除；该回放不代替原生小屏证据。

本次r12在相同USB手机、相同正常45°准备入口下执行：

| 连续动作 | 终态 |
| --- | --- |
| 秒增加1500ms | 00 → 15 |
| 分增加800ms | 30 → 36 |
| 时增加800ms | 04 → 10，天空从夜间到白昼 |
| 日减少800ms | 19 → 12 |
| 月减少800ms | 10 → 03 |
| 年减少800ms | 2026 → 2019 |
| 取消预览 | 回到2026-10-19 04:30:00及原夜空 |

各动作均保原录像和独立最终PNG。私有 `r12-time-hold-review/REVIEW.md`（SHA `031011f461ad3e10d69520a0ebdbbcda6329f259aae6f7502b0898212642963f`）独审已查看粗/密序列：秒01–15、分30–36均可见，pending提示时目标保持原位，已检片段没有键盘；六字段采样尾部未追加步进，取消恢复。7份录像前后SHA不变。实际视频长3.949–8.298秒，不把命令“6秒”当成实际录制窗口或抽帧数当FPS；原生release回调和精确停止时延未录。

每个字段之间存在宿主操作间隔，不能冒充15秒内快速跨六字段切换。唯一15,011ms manual-input计量窗只覆盖秒：15个intent全部accepted，15次preparation全消费；firstAccepted25–79ms（p50 41、p95 79）。这些是意图至accepted的墙钟，不是显示FPS，也不转用到其他字段。完整BSC8404及SAO666/16 tiles实际非空；collector的scene.modes标为DAY但录像为夜空，不用该字符串声称白昼负载。跨日期时尺短暂“定位中”后恢复，全日期星位逐帧身份未独立证明。

## 正常Play：补齐终态，B仍未解决

接收机r10完整正常Play已实际触发同run 60秒Pause，之后Cancel恢复04:30:00并返回非空Map。录像只含开始约15秒，不能宣称整个60秒尾段的连续画面已审。Pause后约63秒的安静子窗仍有较大PSS；后续样本跨Cancel/menu，不能扩成126秒纯drain。Map读回约在返回截图后32秒。

Android TOTAL PSS与SwapPss按原口径保留，不能再相加；跨watch的slot0不自动证明同PID。新的普通路径终态不关闭内存增长原因或长时间使用结果。

离线独审重新核r7原profile和双级映射、gen23原件与r9退休，41件输入前后SHA相同。r7约16.8MB是surviving-allocation估计，没有retainer或总churn。gen23在真实GPU/copy为零仍增长，r9已证同surface退休；不再把GPU dispose子步骤作为B的主解释。当前下一决策是：过期exact-time scene/transform是否由实际强根错误保留。需要能展示实际对象代际及保留链的官方图；当前GUI捕获/导出尚未核，公开CLI未暴露该图操作。旧手机snapshot导出失败条件未改善，不重跑资格、相邻disable或gen24。

## 地形：定位到缺格，未将等待归因到CPU或I/O

实际metadata2748ms、asset8ms；与完整314570B窗口PNG和proof逐件绑定后确认：选中发布inventory有效，但exact window没有现成品，4个cell中2个于该次请求派生。same-coverage warm pan未新增metadata，已审序列未见整片覆盖消失或明显错位；1437ms native-ack相关总窗包含1400ms手势，不是松手后的1.4秒。

一次独立离线ready-cell回放调用当前TerrainService，输出与实际窗口SHA一致：总62.50ms、读取/组合/编码/验证55.11ms、写入含prune4.39ms，source fetch与cell派生均0。这不回填原2748ms，也不排除原时刻队列、I/O或CPU争用。

现有cell measured回调已能先区分源读与projection/sample/shade/encode；尚无该真实请求的内部阶段行。下一次原本必要的API准备使用现有TelemetryPort窄保存terrain事件，以自然缺格请求及proof关联；仅当cell阶段短而metadata仍长时补service等待/写入边界。不专为遥测重启、清缓存、重跑暖窗、扩大热点预产或重产r6。

云层/光害完整交互等待、跨覆盖/双指缩放配准、真实QWeather、原生/iOS、快速跨字段及完整A/B验收仍保留。服务恢复继续受registry额度、主机空间及停止API责任约束，与购买CDN无前置关系。

## 2026-10-21：r17供给对照与r18完整短窗候选

r17相同source/bundle的普通预览日减2秒、264.355°夜间含地景：原通道24intent/24client calls、19取消、5完整验证、2个不同时间准入；只给现有开发桥的geometry JSON启用gzip后，同包新日期22/22、13取消、9验证、3准入。实际手机响应为gzip/200，raw-wire读回227491B→56958B，模型/etag/源身份相同（每次retrievedAt除外），但两段像素独审仍见长时间落后及终态跳变。压缩对照已回答问题，不能继续称仅等待开关生效或视为流畅。原件、8件哈希读回及完整判读归私有`r17-hold-review`、`r17-geometry-review`。

r18保持完整BSC/已加载SAO、地景、精度及输入节奏，新增明确TWO_HOURS预览合同（5个原30分钟精度knots），旧请求仍49；时间尺保留整日域，Play由当前意图等待完整NIGHT后启动。共享/API/client局部检查及[独审](R17-SHORT-GEOMETRY-REVIEW.md)通过，task观察适配20项通过。完整source `0de49244030276c9f5601ba6a358657654fac0fa22bd75b48e0f7b941a8ce907`，bundle `b31e7bd92be6a6a3f6284c42caf970d22b70b71f3acdeb86a56200459bf7dd28`，337件/5,019,360B，main2,002,042B；31份maps在包外。隔离API为加载配套源码已重启，PG只读和既有terrain缓存保持；live合同5/49读回成立。API进程缓存已改变，不能把对照称严格全缓存同条件。

官方普通预览实际送达并看见唯一r18标签后绑定；同2秒日减从2022-12-20 20:18:38到12-05。`baseline-r17-1-w124uwnvuv`为15intent/15calls、3取消、12验证、7准入及7个不同accepted时间；128环未溢出/省略/无invalid。录像多次中途推进，但不同accepted时间间隔183–442ms，7次首次接受中5次已落后后续输入，repeat中位114ms（r17 gzip为71ms）。逻辑call前11–155ms、验证32–96ms、验证到准入2–50ms、准入到accepted46–101ms；这些是有各自身份和覆盖的墙钟段，不能相加成CPU或physical FPS。私有`r18-short-geometry/hold-review`保全4件/2,360,430B并独立看图；结论是部分供给改善、持续流畅仍失败。

窗内分钟+同2秒，2022-12-20 20:18:38→20:34:38，仍264.355°夜间含地景。`baseline-r17-2-fdrgvluhyu`为0个geometry请求、16/16首次accepted，均早于下一输入，53–109ms；72次实际draw为16–56ms（p50 21）。[消费成本复核](R18-CONSUMPTION-COST-REVIEW.md)指出星点/名称/图片有真实渐变continuation，不能用72−16直接删帧；日减未消费preparation的已知成本仅4ms，不能据此搬迁准备owner、重开暂停gen24或任意节流。下一修复需区分实际draw原因及跨窗等待，复用已有CPU/分配研究。

从原报告前一日的短窗（2022-12-19 20:18:38）实际点击Play，完整NIGHT准入后启动；`baseline-r17-3-6gma9adk9h`记录实际Play一次，14,044ms计量内322intent/300不同accepted时间，真实非空场景和视野保持。独立terminal确认同次60秒Pause成功一次，最终PNG为20:19:38预览。起始录像`recording-1792531428910.mp4`只覆盖前段，未看完整60秒画面，不能作整段流畅/无泄漏验收。首次record-tap被新鲜截图门禁在输入前拒绝，刷新截图后才发送真实动作，没有双启动。

内存观察继续归B：同一watch内部已绑定前台owner，但`r18-play-full-window`开始得早，受前述未发出的动作影响，实际只覆盖较长idle和Play前段，不能把108秒watch当60秒Play+drain，也不按全watch增量除以14秒样本。TOTAL PSS/RSS/SwapPss维持原口径，不相加或指认为V8。当前普通Play没有退出不否定原r13 native allocation failure。新r18主窗的UIA已能读取，但WGC仍timeout、实际click返回`coordinate input geometry is unavailable`、一次Tab未改变焦点；不能完成所需官方选中Sky编译条件与Memory图采集。精确阻塞及最小恢复动作保留在HANDOFF，用户休息期间不重复空timeline、不换版本/网络猜修。

叠层[只读复核](OVERLAY-REPLACEMENT-LIFETIME-REVIEW-20261021.md)找到受控卸载的实际恢复缺口：remove失败后hook丢弃旧coordinator，8个pin可阻塞下一文件。当前同ID候选27项局部检查、资源/恢复11项及类型检查通过，[独审](NATIVE-OVERLAY-REPLACEMENT-INDEPENDENT-REVIEW-20261021.md)未发现同一coordinator内新P1/P2，但明确P2尚未由调用者接回。受控退出/重建清理正在修，实际原子呈现、快速缩放/移动和资源回落仍未验；不把此文件预算故障归因成Sky崩溃。

## 2026-10-21：r19实际绘制原因与叠层单覆盖

r19完整source `ba176fb416984bf3b2a05c40c2038c08dd477c0abc93b49994e7dd84219be155`、bundle `20bbc94bcbda9269ae134e34bd0fd75bc4386d814ec4b9d4564188da5d4b10e4`，337件/5,026,503B；手机唯一标签实看后绑定。生产Sky沿r18；Map包含同ID更新及受控离开/重建清理，任务计量只补真实draw原因。退出修复[独审](CONTROLLED-MAP-RETIREMENT-INDEPENDENT-REVIEW-20261021.md)复核47项及9轮失败/重试pin回零；实际Map→Sky进入非空夜空并返回Map。仍未证明外部无条件卸载、永久pending或持续原生资源全部回落。

264.355°夜间地景下，r19分钟长按从2022-12-20 20:18:38到20:32:38，14/14首次accepted均早于下一输入（73–139ms、p50 109），0geometry调用；录像有连续中间时间和星图变化。57次paint中37次仅由实际星点/名称/图像渐变续帧触发，不能直接删减。实际画星投影/顶点打包在惰性模型返回之后执行，旧base计时不足以归因；下一必要候选只补这两处inclusive成本，不相加嵌套段、不恢复gen24。4件原件2,393,302B在私有`r19-native-update/draw-review`读回；详细[绘制原因独审](R19-DRAW-REASON-RESULT.md)。

terrain+LIGHT向左拖动1400ms：已覆盖区域保留，录像未见整片清空、明显错位或双重压暗；新露右侧约五分之一仍缺，media4.144100s尚在，4.193833s已补齐。4.210700s明确见`TW7 native_pending A5 1849ms`，随后成功回执，冻结源码唯一pending分支确认地形实际执行同ID update；LIGHT方法及numeric id没有导出。末尾2054ms不是首次可见耗时。MP4实际4.542667s，不能用请求10秒当录像覆盖。5件原件5,944,397B在`r19-native-update/pan-review`读回，见[手机换图独审](R19-NATIVE-OVERLAY-PHONE-REVIEW.md)。这允许沿PLAN进入受控父图跨覆盖实现，不关闭完整快速移动/缩放或内存验收。

另一次云量+地形拖动已走正常产品路径；2022日期无云量，实际通过“今天”选到2026-10-21、面板20:18后才出现SAMPLE_DATA格网。其4件原件6,855,682B在`r19-native-update/cloud-partial`读回；旧TerrainWait已sealed，不能沿用旧2054ms归因这次动作，也不把样例当真实天气。新r19桌面窗口的普通编译点击仍报`coordinate input geometry is unavailable`，刷新树未改变；没有新Memory图或无泄漏证据，必要人工恢复后置。

## 2026-10-21：r20实际成本、父图补边与下一候选边界

r20冻结source `85fe0ba21c869c109581015a77fea4b641fc316de6ace548781ff0fdfb921bd2`、bundle `d0e1a4500635629d1bfb631fd48fa089f50a66dded829ae065ba127b380a767e`，337件/5,030,591B；实际普通预览和唯一标签绑定成立。Sky仍沿r18生产，任务计量只补原完整draw中的实际星点遍历与renderer submit；Map包含已独审的跨覆盖父图准入。

264.355°夜间含地景日减2秒，2026-10-21→10-06 20:18:38，15intent/9首次accepted/4late，首次accepted118–203ms（p50 151）。45次paint的已知draw累计1397ms与另一独立聚合1396ms有1ms量化差；effect的starTraversal404ms、continuation355ms，submit嵌在其中，不能再相加。90个traversal中85个有效、5个低于时钟分辨率；大量submit低于分辨率不等于零成本。4件原件2,401,071B已本机读回，详[成本独审](R20-DRAW-COST-RESULT.md)。局部完整BSC/SAO、transition、pick/name和Float32输出等价的48帧对照，以及“新时刻+4续帧”12组主机中位约26.04%下降，只支持一个候选方向，不是新时刻首算或真机提速。

沿此证据实现`sky-star-draw-preparation`：每个Page/Canvas只保当前精确视图的BSC、SAO两份独立准备，源资格、完整键和生命周期围栏保留，每次paint仍做渐变、退出星、点选/名称、遮挡、提交和原成功copy接受。[实现](EXACT-STAR-DRAW-PREPARATION-IMPLEMENTATION-20261021.md)的102项相关用例、末次23项与类型检查通过；[独审](EXACT-STAR-DRAW-PREPARATION-REVIEW-20261021.md)另核9项，未发现P1/P2。普通Play每次换精确时刻无法复用，新增Point包装、数组及当前工作集可能增加成本；因此匹配正常Play与长按的目标结果仍须比较，也不关闭B。[r21观测适配](R21-DRAW-COST-ADAPTATION.md)已让span覆盖lookup/build/replay及SAO exits，复用r20严格schema/32KiB/15秒metrics/60秒Pause，无需重启桥；准备、完整构建和手机实际身份分别由HANDOFF记录。

r20匹配正常Play已从2026-10-20 20:18:38到20:19:39自动Pause，同次13×10秒进程watch完成并覆盖播放和约60秒drain；原件尚待分析。metrics先显示“同次Pause回执待metrics导出，可重试”，一次受控stop重试明确报“数据超过上限”。这是当前观测导出边界失败，不是产品零工作或性能通过；尚不能从缺失receipt给新旧draw对照结论。保留已有watch/录像，现有32KiB上限继续有效，修复和新候选状态由HANDOFF持有。

地形一次真实1400ms西移已由[像素及字节独审](R20-CROSS-COVERAGE-PHONE-RESULT.md)确认旧细图→父图补新区域→新细图。父图可见边界(4.368989,4.385511]秒，细图边界(6.278933,6.296256]秒，提前约1.91秒；不是HTTP200或状态文字推断，也不是精确松手→呈现延迟。相同request的父metadata164ms/asset5ms、新细图1972ms/asset10ms及实际PNG SHA相符。11件原件6,945,604B及6条有限API事件在`r20-cross-coverage/west-pan-review`读回。旧TW3已sealed不归本次，更早未跨实际覆盖的准备pan不算父图失败。父图前仍有局部缺口，完整连续缩放/移动、云/光害、最终细节等待与资源回落仍未验。

Search返回Map时曾出现地形异常toast；随后图层面板实际显示100%有效覆盖，现场截图`screen-739a4f16-0583-4880-ac9d-48e418a89836.png`保在r20设备会话。该有限恢复结果既不证明持续故障，也不抹去短暂错误；若复发，沿现有数据/安装owner关联当次请求，不重启已答父图研究。云量仍为SAMPLE_DATA，不能当真实天气验收。Memory的direct Sky编译条件/非空动态heap及GUI坐标失败缺口不因本次普通预览或PSS观察而关闭。

## 原件与恢复（持续）

私有原件位于 `%USERPROFILE%/.starward-private/sky-map-20261020/device-resume`，本轮必要新增数据、当前完整r12源码/构建/maps、修前后录像、计量、memory及独审均保留本机。用户最新要求只有其主动提出时才上传，降低提交频率、优先两项性能；本轮 [本地保存草案](RECEIVER-PERFORMANCE-TRANSFER-20261020.json) 不是已完成的远端恢复回执。原9234件包、r10完整构建包、运行数据lock、Map静态包和私有数据库继续按各自未变owner复用，不复制凭据、数据库、手机存储、活动日志、二维码或浏览器profile。
