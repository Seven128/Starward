# A1 r8 时间交互与连续真实输入独立复核

2026-10-19；审查者 `review_r8_native_entry`；文件独审、`development_feedback_only`。**r8 的真实尺拖动能穿过准入 guard、更新非空Sky并收敛到10:00；前一日字段/尺窗/读数到18日10:00，取消后回19日04:30及夜Sky。未来日↑被明确拒绝，不算跨日成功。** 新manual样本补上连续尺输入中的9个未被替代的首次软件接受，24–70ms（p50 40、p95 70），末intent为30ms；全部37个首接受和28个已被替代者同时保留。结论为 **TARGETED_TIME_INTERACTIONS_AND_CONTINUOUS_INPUT_ASSOCIATION_VALIDATED_SCOPE_LIMITED**，不表示完整A、惯性/重抓、实际服务key身份或完整Goal已验收。

首次入场仍由 [R17-A1-R8-ENTRY-RESULT](R17-A1-R8-ENTRY-RESULT.md) 唯一拥有，本报告不扩大它的范围。复用r8构建与稳定表面独审，无重复方案审查、构建或全套测试。当前app为 `a4b55d3d876a65f731d0e044eb043e0961c05718a2d2a81c1f40aa502be8eb3e`，source为 `3362e2d0595b7871835b0232eb43f2ac233c5a5aa012f609c5eb40e04df4bcb0`；337文件/4,996,606B，review8/buildGeneration27/反馈generation1。当前feedback/session本地关联仍相同；runtime AppID与完整手机包字节没有由本报告读回。

## 实际交互

五段H.264原片均1080×2376、timebase1/90000。全部480编码帧按原PTS直接解码，无trim、补帧、PTS重置。实际查看90个明确列出的分布采样、5张独立终图及前一日标签原像素crop；没有声称逐帧实看全部480。请求15秒、容器时长、编码帧数及样本间距均不是物理FPS或完整连续呈现证据。PTS、手机Date.now和host时钟没有校准，不跨钟相减。

| 原动作 / 原片 / 编码帧 / 容器时长 | 实际像素与边界 |
| --- | --- |
| ruler swipe / `recording-1792402382467.mp4` /147 /10.914489s | 起始19日04:30。采样标签依次含04:33、05:02、06:09、07:33、09:03、09:56，末样本和09:33:02.467Z终图为19日10:00、`10:00:00 预览`、取消入口、中央刻线与轴一致。Sky实际由夜色进入非空日间画面。拖动过程中有诚实的“更新中”，不把目标值当作已绘结果。此实际尺输入建立准入后可交互，不仅是pointer-events源码声明。 |
| future day↑ / `recording-1792402479836.mp4` /14 /3.841022s | 所有14个编码样本和09:34:39.836Z终图保留19日10:00；完整终图明确有 **“不能晚于当前时间”**。不写成20日成功、未来供给成功或后端失败。 |
| previous day↓ / `recording-1792402548422.mp4` /58 /8.496111s | 字段到18日10:00。采样9–18（PTS3.291889–3.458744）当前星图标签为 **04:30:00 更新中**、Sky短暂夜色；采样22/3.574833已为10:00:00预览但刻度仍隐藏，恢复文案在另一行；采样31/5.009311起08:00/12:00新尺窗、轴线与10:00一致，后续采样及09:35:48.422Z终图保持18日10:00、10:00:00预览和非空日间Sky。保留这条真实过渡，不用末态替代全程语义；本报告不将其无条件认证为跨日时间连续性通过。 |
| cancel / `recording-1792402650588.mp4` /120 /8.574178s | 起始18日10:00预览。采样9/PTS3.347689回19日04:30，恢复文案与读数分行；采样27/3.948200起正确04:30尺窗，预览/取消文字消失；09:37:30.588Z终图仍19日04:30、夜Sky。证明这次可见取消恢复，不认证Apply或持久化。 |
| armed manual ruler swipe / `recording-1792402804637.mp4` /141 /15.036233s | 起始19日04:30，多个采样出现04:33:37、05:31:21、06:30:20、07:53:47、09:57:23，间有“更新中”和“预览”；采样103/PTS7.008767及后续样本到末14.544444、09:40:04.637Z终图为19日10:00、10:00:00预览、正确尺窗及非空日间Sky。没有用编码帧推导手指时延或惯性/重抓的独立结论。 |

前一日终图在完整图缩放时初读漏看current label；直接原像素crop已明确读到 **10:00:00 预览**。这项审查读图误差已纠正，不作为产品缺陷或UNKNOWN遗留。

既有匿名bridge的32项有限ring有唯一该动作附近 `sky-geometry / GET /200 /118ms /returnedAt09:35:34.618Z`，位于前一日终图之前；原health SHA `fe7516f81ce2262ea6f115ad177c049dd4136050de79506a7a25a8777b92220c` 已冻结。它支持服务参与，**没有请求key、日期/供给内容或消费指纹**，不能仅靠时序认证逐请求完整身份、24小时真实供给或物理latency。未为此重录、开新连接、扫描存储或借8791认证。

## 连续尺输入：A的新证据

新receipt `baseline-r17-2-qet4x71ebh.json` 为44,347B，compact29,260B，SHA `90816e8d7a5cd62211637f6dec62dca2a68a8d2634ce3943e79c5d9fea0155f7`。冻结的实际dispatcher及全依赖strict通过32KiB上限；schema `starward-r17-phone-probe-v3-manual-input`、case manual-input、trigger2。它从实际合法ruler `onPreview` guards之后、原意图发布之前开始，startDelay0/window2；arm不等于开始，起点晚于物理触摸和平台派发。

Date.now为ms/wall-elapsed、非单调保证；名义1ms、有效分辨率未知，1,868次读取无invalid/backward。elapsed15,009ms，自动export15,007、seal15,009；旧reason=manual不表示在该时刻手动停止。actualPlay、pauseAttempt、pauseSuccess、terminalExport全部0；manual本来没有Play terminal。

49个真实intent，38个完整presentation preparation，80次request；52次paint attempt/native callback/accepted/Scene finish。37个独立intent首次接受、15次同intent重复接受。40个在首次接受前被替代，其中28个后来首次接受、12个未接受；12个未接受全部是superseded，没有未接受的最新intent。unknown lookup、identity rotation、mismatch、expiry、synthetic、容量溢出均无。本窗没有制造冻结画面或伪接受。

| 首次软件接受分类 | 完整样本 / 范围 / p50 / p95 |
| --- | --- |
| 全部firstAccepted | 37 /24–149ms /53ms /132ms |
| 接受前未superseded | **9 /24–70ms /40ms /70ms** |
| 接受前已superseded | 28 /25–149ms /65ms /132ms |

“未superseded”是接受时仍为最新的条件分类，不能用它替换完整37个或称为所有输入的无偏分布。实际生成producer只将**尚未接受的前一intent**标记superseded；已经接受者不会因将来新intent而重分类。本次全49intent/38preparation未发生容量过期，但linkage只导出首16/尾16准备值（32/38），A1仅首4/尾4（8/38），均不是随机样本。上述9条全在导出中，独立按seq17/18/19/32/36/44/46/47/49重算 **24/28/53/70/40/56/45/35/30ms**，合381ms，排序后p50/p95与完整aggregate一致；其它总体分位数复用producer完整统计，未从32条假装重算全部。

末intent49/token38的同窗序列为：**intent1579 → preparation1585/1585 → request1593 → firstPaint1607 → firstAccepted1609ms**，因此首次接受30ms。preparation同读数为belowResolution/elapsed未知，不能写0成本；完成至request8ms、request至firstPaint14ms、paint至软件accepted2ms。terminal未被替代，有3次request、2次paint、1次重复呈现。seal时lastRequestedMinusAccepted=0是**天文时刻一致**，并与实际终图10:00相符，不是零输入latency；`time.*RelativeMs`及最大requested-minus-accepted1,920,003ms也都是天文时刻差，不是32分钟软件等待。

38个准备值中37个消费、仅token35未消费（已superseded、2次request、无paint、准备耗时低于分辨率）。消费准备成本known25ms/24valid，13个belowResolution未知；未消费known0/1unknown，不是“浪费0ms”。完整Scene仍执行constellations38次、known146ms（2–28，p503/p9510）、draw52次known224ms、nativePaintOwner52次known227ms；二者嵌套，不相加成帧成本。base/selection/supplement/displayCopy/publishAccepted含大量低分辨率未知，完整覆盖留在JSON。

Scene确实非空：BSC8,404行、SAO0–666行、selected tiles0–17；GL提交464、BSC/SAO提交1,110/708、accepted对象累计1,110/549，failed/invalidation0，native copy/ready copy52/52、synthetic0、frozen false。SAO/tile随实际需求变化，不假定固定载荷；DAY是DisplayMode，不单凭它推太阳高度。nativeGlyphCalls本窗372，命中/条目/容量为null，不能宣布无文字工作、cache收益或由此打开gen24。

全38条准备完成→首次request为7–58ms、p5018/p9553，38valid；request→首次paint为1–63ms、p5017/p9556，37valid及1个notObserved。它们是两个完整覆盖的独立分布，不能把p95相加，8条首尾关联也不改成38条完整轨迹。

Page observer为66submitted/66completed、pending0、maxPending3，已记失败0；16个有界序列化样本27,830B，不是全部payload量。A1的8条Page `[submitted,completed,pending]`关联均保留：末token38的finish/request为[62,61,1]，paint为[64,62,2]；最初token1为[0,0,0]→[1,0,1]→[1,1,0]。这些建立时间重叠，**不证明等待由Page、React、bridge、某payload或CPU造成**。Page latencyTotal2004/max87沿旧performance.now/fallback生产者，未与本窗Date.now校准，也不能拿callback完成当物理呈现。legacy intentToAcceptedWallMs另有17次条件/重复接受，不替代37个firstAccepted。

这次填补了连续真实尺输入中“最新未替代首接受为零样本”的缺口，且末态收敛；**当前不支持因昂贵未消费准备而改调度，也不能只凭Page重叠选择桥/发布改写。** 维持现有owner，复用这些有效关联与先前CPU/完整B调查，转向既定剩余产品义务。它不是A整体验收，也不扩张为新的研究/测试矩阵。

## 冻结与剩余范围

原件完整保留，冻结时逐份原读/复制/原再次读SHA相同，报告前全部副本再次核验。5份PNG的sidecar时间、尺寸、字节、SHA均匹配；3份实际生成runtime与已冻结r8 Sky map sourcesContent逐字一致。没有重用旧session输入或改变现场。

| 外部owner / 组 | 文件 / 字节 | manifest SHA256 |
| --- | --- | --- |
| [time-interaction](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r8-time-interaction-20261019) 原始关联 |20 /3,580,139 | `1c24fae0f1d971f1ce75ef76df91ba0bb8b8a67c0139292d25a5f5c6eab78db7` |
| 同owner 原PTS全帧/选取样本/关联 |420 /124,337,886 | `1319921d0e7dccb32e6d1b4ce5741b7ecb1823fddf3e1a5f701d0ad9f6562028` |
| 同owner 服务有限ring |1 /4,012 | `8903e4f4683e0feeef4434691b08724d0f39e3ea3649646a8f1824e8e842ddc4` |
| [manual-ruler](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r8-manual-ruler-20261019) 原始关联 |12 /1,476,502 | `791c1a189121228b8cb5a6acdeb04019d4c443ef6f1c346024f66b98e033c3df` |
| 同owner 原PTS全帧/选取样本/关联 |172 /49,998,091 | `2c443526a49fd69b9755c69df18b0b9ad29f873275b62ce23915eb71f1b84ceb` |
| 同owner 实际runtime语义 |3 /53,871 | `902d992b114610d55a3a4c1d410238dd6bb6c3fd0c3a818883ea4bd1a68c7cab` |

各owner另有同一有限复核工具manifest，4文件/17,704B，SHA `1fdf1fd3fbb452e00a77454cc112aa940a32cc968e46e7037d9f7e1fb5f74745`。完整投影见 [JSON](R17-A1-R8-TIME-INTERACTION-RESULT.json)。首次entry原件及manifest没有扩大或替换。

仍不认证惯性/反向/重抓的独立物理语义、失败retry、必要hide/resize、Apply/持久化、iOS、所有跨日供给与过渡连续性、最终普通包或完整A/B/Terrain/Goal。只读文件、有限collector目录及root给定health；未操作设备、ADB、IDE、服务、feedback/session、生产源码、构建/预览、Git或coordinator文档；没有安装依赖、新增人类动作或重新审方案。原8791/N05/R6消息/gen26 UNKNOWN及配对/VPN均未触碰。
