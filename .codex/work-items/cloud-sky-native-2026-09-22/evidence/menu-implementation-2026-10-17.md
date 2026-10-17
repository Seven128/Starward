# 采用菜单的实施证据

同一完整无预算Goal。用户明确正式开始UI01–UI06，随后要求持续完成可独立工作、把人工介入后置；收到最小清单后明确批准仅Sky入口的Map转场例外及唯一PLAN对应修订，并持续授权代码独审。当前状态与唯一下一动作归CONTINUE；本文件只持有本批变更与证据，不新增方案。r377及更早记录按各自原范围保留，最新增量见本文件末节。

## 输入与责任

Stitch 项目 7144519510537620825 当前采用完整节点 5385664345158066168。只读取得提供方当前 HTML（166459 字节）和截图，实际查看截图与最终覆盖样式/交互；临时输入在本机 TEMP/starward-sky-menu-implementation-20261017，不在仓库重建设计镜像。没有重新准备、生成、选稿、资源同步或清理。

UI01 由 sky-overlay-motion 的共享 SkyDisclosureSurface 接管 search/object/time/layers 静态玻璃外壳、层级和外点/拖动边界，沿原 presence 与取消机制；没有增加天空 Canvas 或实时模糊。SkyObjectDialog 继续作为真实长正文有界 ScrollView owner；异步位置的布局状态经共享 Context 通知重测标题/核心区，普通坐标更新不查询布局，迟到/隐藏/卸载回调仍由原代次退休。

UI02/03 沿现 disclosure、selection、catalog 和 search owner 接三横/X、六图标轨道、左上地点时区、仅名/真实类型搜索、保挂载列表与搜索来源资料返回；资料核心事实/定位跟踪/来源动作前置。新增行有限动画结束撤回 class。关闭直接资料或搜索资料恢复展开菜单；只有搜索资料的小返回保列表。定位/跟踪关闭资料也恢复展开菜单，原相机联合导航继续有效。新转轮按钮避开旧校准卡片的同名样式；日间进入时搜索/返回/更多等均使用采用稿普通颜色，不借全局 DAY 深色图标。详情字号、核心动作留白与加载时来源按钮空间按采用源接入，实际像素/裁剪仍待目标对照。

UI04 沿公共 observation-time、Context、时区转换与原尺/播放接六字段/十二箭头，共用单 repeat。输入、公历跨月/午夜与现实现在上限集中在 Sky 边界，不更改 Map 未来规划。提交仍用原 Context 事务，跨夜 draft 在应用后由原公共请求重载。长按有限代次、兼容 click 消费与 hide/close 清理；原生移出判定用每次按住一次按钮边界查询。

UI05 的手指/眼睛转轮与校准侧钮沿现 orientation/calibration/camera owner，260ms 转场/300ms 有限兜底，立即锁与迟到事件隔离。切手动取消编辑并冻结当前实际显示方向。红光直接调用全局 enterObservation/exitObservation，保 Settings 同一模式。最初r372–r377只实现Sky自身整页220ms有限淡入；当时Map禁改、无公共转场入口，前页渐黑保MISSING，没有绕边界。后续用户已明确批准该必要Map入口例外，当前源码增量见末节；整段原生入场仍待目标证据。

## 本地检查与失败

- 受影响 11 个现有/新增检查文件最终 **103/103 通过**：output/cloud-sky-native-updated-ide-2026-10-12-r1/menu-implementation-2026-10-17/ui-affected-settled.log。范围含现 Page 命令、选择/导航/Context 退休、外点/拖动、转轮迟到、共享披露、公共时间和六字段实际事件。旧批失败全部保留；selection Canvas/假时钟/旧按钮和旧 Settings token 夹具已按真实消费者迁移，不以夹具失败冒产品故障。修后生命周期单独5/5亦保留。
- 完整当前 Taro/React/Query 页面和原生事件桥执行 **PASS**：output/playwright/sky-menu-20261017-r5/result.json。八个里程碑为首次加载到真实 Context/report、六字段、精确秒应用、跨夜草稿/显式应用、24→48真实目录追加、完整木星资料、保查询/同一滚动节点返回、五个共同开关。公共 Context HTTP 读回验证精确应用值；原24行和 switch thumb owner 的 sid 保持，红光回到进入前的确切 DAY 模式，hide/unload 后 pending native request 为0；42个真实本地请求、页面异常0。每轮使用独立 PUBLIC_REFERENCE MEMORY_TEST Context，后续不改 warm simulator 保存意图。端口/几何/传感器/Canvas 的受控边界和样式未合成事实明示，不冒 WEAPP/UI像素或物理性能。r1 的原生端口 .node 缺口与退休变量遗漏、r3 的旧绑定快速测试意图被拒，均保原失败；修复后r4/r5通过。旧React/query scaffold从未连接实际页面，仅复用其文件/图片回调端口。
- 类型检查通过（ui-typecheck-final.log），相关 Git diff --check 通过。新 ScrollView/输入行为继续沿原领域 owner，没有新播放时钟或双 RAF；PF02/PF03/PF05 与 PF04 裁决直接复用。
- 第一次新候选 r371 构建失败：此前已完成设计镜像清理后，config 仍引用已删除设计资源路径。没有重跑清理或恢复设计镜像；从指纹核对的普通 r370 构建恢复53份同字节产品图标到 runtime-assets/{b-icons,tabbar} 并修原复制 owner（menu-runtime-icons-recovery.json）。当前17个采用路径的两模式 SVG 共34份只进入 Sky 子包，含 source/cancel/Back 所需实际消费者；来源归 runtime-assets/README.md。红光白色仅 observation-observation.svg，Map 输入未变（r374-boundaries.json）。
- 普通候选 r372、r374 成功，最终 r375 / menu-final-current-clean 成功，SHA `9a21735f62ee234b753efa38c4756797d712ca2d51cfc12b648aa38e7f714a0f`；319文件4,935,104B。预算、接口与资源出口、源包/复制指纹、16项输入、34 SVG 逐字节和原33/PLAN身份归 r375-menu-readback.json。r375只在r374上微调来源按钮加载空间、前置动作留白和详情字号；没有另跑软件场景。当前实际构建/包体数值以该回执为准，手机未推。
- 官方 IDE skill 0.3.11 同步且无需 reload。r372 owned s0 开窗成功，但首次 runtime 读取未返回；省略等待截图实见欢迎页。一次官方 compiler 调用40s超时，之后仍同欢迎页；未冒编译失败或黑屏。r372 owned窗口已官方关闭，旧s3未动。r374另按既有 startup-recovery 走一次官方 cli auto，空闲54883端口/30s期限未建立 project-bound 监听，结果 automation_binding_timeout；原客户端/临时receipt清理后无该监听，截图工具返回 project window not found。没有队列重发、清用户storage、切账号或重启IDE；新包原生结果仍 MISSING，旧 r347/s3 控件合成 FAILED、手机最后 r322 均保持。
- 为本地验证恢复已停止的既有 MEMORY_TEST 服务：r373-api-recovery-result.json。复用 r286 v79编译字节 SHA `375e14f2fa8d8d08fa5e76964df085a3f199d5f20e09a402a07e8e1a9462fc14`，无后端重建/部署；当前 owned PID26788/8797，私有 Context/查询沿原 runtime owner 恢复，health200/PUBLIC_REFERENCE201。现入口仍 product-phone-runtime-pointer.json。旧warm不再被当在线；复用结束代理、手机或生产环境均未操作。

## UI04连续输入交接的后续修复

下一次同Goal continuation没有重复旧目标工具，而是在现代码查到具体公共时间交接问题。原r375控件的键盘草稿未被箭头/播放消费，迟到blur可撤回箭头或新播放；未编辑的应用以及箭头还会把公共瞬间小数秒截断。ui-time-edit-before.log在原源码上复现4个失败：11时再加一实际13时、原.750应用变.000、键盘05分播放仍用原00分、一步秒值丢小数。沿原UI04责任修复：原草稿先消费，只有仍未消费且值匹配的blur才能settle；播放依据公共预览是否被接受，不能在覆盖外草稿时误播旧时刻；没有字段编辑的应用/箭头保原小数秒。没有新时间producer或公共Context写入路径。

修复过程另发现覆盖外草稿关闭/反向重开后，已恢复公共值但UI admission标记未复位；ui-time-reopen-before.log实际失败后补齐同一编辑寿命的reset。修后原控件/公共时间/生命周期19/19，最终11个受影响文件107/107（ui-time-editor-final.log）；整App类型0（ui-time-editor-typecheck-final.log）。此次类型检查也发现上一轮最后改动的生命周期夹具有两处索引类型遗漏：已有旧ui-typecheck-final.log的通过发生在该最后夹具迁移之前，不能扩张为之后状态。已给真实三种导航token精确tuple key和object|null类型，修前ui-time-edit-typecheck.log、修后0均保留，没有恢复已退休的Settings生产路径或削弱行为断言。

真实完整页面消费者更新为 output/playwright/sky-menu-20261017-r6/result.json：键盘秒10＋一个箭头＋兼容tap＋迟到blur，最终公共Context/HTTP读回精确为11秒；覆盖外日期未blur即点播放，仍保原公共时刻且未启动播放，随后显式应用到准确前一夜。其余原八个机制路径继续通过，38个真实本地请求、页面异常0。该轮仍是受控原生端口、样式未合成的软件证据。最后只新增active=false恢复标记，已由原控件恢复反例与107组覆盖，未为此重复完整页面场景。

普通r376仅为此修复中间包，最后普通候选r377 / menu-time-settled-clean，SHAcce4a1dd757ce5adcc48944ebdb925aa1081fa5930c9879aaa6a65e2032373df，319文件4,935,388B；main2,075,816/content1,012,709/spot354,045/sky1,492,818。预算、实际接口/资源出口、源复制指纹、16生产输入及34SVG逐字节归r377-menu-readback.json；唯一PLAN/原33仍同原hash。没有当前构建、输入、SDK或手机任务在途，没有重试r374同因失效的官方运行入口。原生/物理/完整Goal仍未通过。此前r375及其review-inputs保持历史，不覆盖当前源码身份。本轮属于新的实质产品progress，不计为无进展blocked审计。
## r377时的待决范围与审查（后续已获明确授权）

完整入场仍要求“前页应用内容渐黑→原导航→整页 Sky 淡入”，当前前页部分 MISSING。建议仅在用户明确授权后，让 Map 的云观星入口接入共同有限转场事务（正常、失败、取消和快速返回均恢复源页），允许必要入口接线/源页遮罩，保其他 Map 内容和导航不动，并相应修订唯一 PLAN 的 Map 禁改边界。这只是具体修改请求，不是第二方案，也不是当前执行依据；当前 Map 源 SHA `450b946c72a8505ff75623a72faa78a37725e2ad500f2a05a2cb85e2857b2d6d` 未变。

本批共享交付需要独审。现有结束代理不复用；需用户明确授权一个新只读审查子代理，核采用源、当前生产输入、r377构建和软件/真实失败证据，自审不能替代。无授权时该缺口继续 MISSING。真机、原生实际合成/正常速度和外部云端条件仍在其原 owner 下，不为本轮额外制造交付标准。

两项具体问题已通过异步输入提出，等用户醒后明确回复；默认选项/等待时间不构成授权。最新审查输入在 output/cloud-sky-native-updated-ide-2026-10-12-r1/menu-implementation-2026-10-17/r377-prepared-review-inputs.json，绑定实际采用 HTML 哈希、16生产输入、构建、9份必要结果/反例及r6软件证据的精确epoch；r375输入保历史。未启动代理或冒已审查。当前仍按原 PLAN 行事；r377之后连续3次依赖审计无进展后，工具已实际返回blocked，完整Goal未完成，方案/原33不变。

## r377时保留的验收边界

107 个软件检查和完整页面软件路径不证明 WEAPP 合成、手机实际交互/姿态、正常速度观感、完整红光或多场景物理性能。当前没有新独审授权，已有结束代理不复用；独审缺口保持。Android/iPhone、外部云端/CDN/IAM/TLS/容量/回滚以及原33项和所有 FAILED/UNKNOWN/MISSING 不减。图像新获取/加工/采用/扩批冻结；PF02/PF03/PF05 和 PF04 裁决直接复用。没有提交、推送、手机预览、上传、云部署、采购或外联。

## Map入口例外与独审修复后的当前增量

用户随后明确批准最小清单两项，并持续授权后续代码独审，无需逐次询问。唯一PLAN只在这个明确范围修订：Sky入口可增加必要Map接线/源页渐黑，其他Map业务、工具几何、导航与未来规划保持。最新PLAN SHA `b48d52590bf110486ad304390a4331c464d01d5403ff7e98831dcafb83c9ca06`；原33行仍为 `d26d632c317699321250bed6ea91611b06ab6dfbb28575eca0200512cf6973d9`。实际get_goal恢复为active、无预算，不另建Goal或改内部数据库；旧工具正文无编辑接口，Map禁改按REQUIREMENTS最新明确例外解释。

Map正式点与本人审核中提案共用 `pages/map/sky-entry-transition.ts`。同步准备锁在提案resolve前建立，准备期间不黑屏；只有仍属当前账号/Map/选择/Context的响应可写公共Context并绑定新scope，随后显示220ms源页黑场，再走原Taro导航和Sky整页淡入。动画终点与252ms桥接兜底共享一次提交，原生请求10s不结束则释放本地遮罩及记录安全错误。快速重复不双发，准备中Back、隐藏/AppHide、卸载和身份失效退休待发动作；失败/超时/返回恢复源页。过期prepare不锁新身份，旧finally/旧动画/迟到SDK结果不清新遮罩。原生navigateTo发出后没有取消API，本地代次隔离不证明系统迟到导航绝不发生；不以全局路由拦截或新事实源绕平台边界。

两轮新只读[独立审查](menu-independent-review-2026-10-17.md)发现并修复：固定搜索输入不能随列表滚走；结果/default/天空说明保同一个ScrollView，换query发原生顶部锚点命令，追加和资料Back不重置；补Sky普通/红光开关四态、on-primary及跟踪按钮的玻璃材质，局部保既有减少运动行为；把提案准备期/重复/Back和过期锁归同一入口事务。两轮代理已结束，最终当前源码局部复核无未处理确定缺陷，4个审查pin与最终18个构建输入一致。r377中既有私有面板返回条件未在本轮修改，不将相对HEAD的历史dirty diff冒成本次扩大范围。

- 当前受影响17文件 **133/133 PASS**：`menu-entry-reviewed-settled-tests.log`；类型检查 `menu-entry-reviewed-typecheck.log` 实际exit0。新行为包括真实正式/提案命令、重复、准备期Back、AppHide订阅解绑、换身份、失败/超时/迟到、其他Map路由保持即时及搜索滚动意图。首轮128项中127通过、1项旧Back整段regex因新增Sky阶段失败，原始 `menu-entry-review-fixes-tests.log` 保留；改为实际active表达式的可见性/各呈现真值检查后通过，没有反向削弱生产。全库diff --check发现3个未触碰旧文件末尾空行，未扩大清理；本次相关生产文件diff --check通过。
- 完整当前Taro/React/Query Page **r8 PASS**：`output/playwright/sky-menu-20261017-r8/result.json`，8个里程碑/39个真实本地HTTP请求/异常0。复用原精确公共时间读回、跨夜、24→48稳定追加、木星完整资料、原输入及滚动节点返回、五共同开关和红光/退休；新增确认固定输入不在结果滚动子树内，换query改变native scrollIntoView锚点，追加/Back不发新命令。r7为首次固定输入修复、尚未补查询复位的历史PASS（40请求）；r8对应最终查询复位代码。此脚本没有挂Map，Map入口的软件证据由实际命令＋真实转场owner的本地检查和独立countercheck承担。CSS未合成、原生端口/Canvas/几何/传感器受控，均不冒目标像素、滚动或正常速度交互。
- 最终普通候选 **r378 / menu-entry-reviewed-clean**，build exit0，SHA `879833bc9d37b73d797c2a3a6b4d68598081c94e5ae998c11f4cd8b15fdce6cd`，319文件4,940,887B；main2,079,989/content1,012,709/spot354,045/sky1,494,144。`r378-menu-readback.json`核源包/复制指纹、编译API及资源出口、分包/总包限额、18生产输入、34SVG逐字节、最新授权PLAN与原33。项目为 `output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-menu-entry-reviewed-clean-project`；未打开目标或推手机，旧候选保留。

软件/源码与适用独审已经足够推进该节点，不重复足证检查。UI06仍缺当前目标原生遮罩/滚动/正常速度转场与受影响成本；r372/r374官方入口失败无新条件不重试，旧r347/s3合成FAILED、最后实际手机r322保持。没有新设备、真实云端、冻结图质/3待采用源/5正文源条件；不重新获取加工采用图片，不推送手机或部署发布，不借本次局部完成关闭完整Goal。当前状态及下一动作只见CONTINUE。
