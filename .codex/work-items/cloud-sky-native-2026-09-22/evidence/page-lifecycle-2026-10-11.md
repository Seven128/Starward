# B/E 页面生命周期所有权 — 2026-10-11

继续既有Goal，无预算；唯一worktree和分支未变，全部未提交成果、旧产物和33项义务保留。已有图像收尾已冻结，本轮取图、加工、发布、云写、平台预览／上传、提交／推送均为0。此页记录实际page及共享owner的受控软件证据和独立编译，不声明微信／设备／物理／完整验收。

`spot-sky-page.tsx`原AppHide仅停Canvas，若先于PageHide到达，真实Context请求仍可接受、1×时钟及姿态监听仍活动。现`hideSkyPage`供AppHide、PageHide和卸载共用最新入口，先退休Context／viewport并隐藏姿态，再取消校准／手势、暂停时间、停浏览动画并沿原Canvas owner保留或释放。取消拖动恢复跟随只能在hidden controller保留意图，PageShow才取得新流；Canvas恢复继续等待可见React提交。来源页保留仍成立，后台须释放已隐藏父页的保留面，不加入全局AppShow激活父页。

来源和Back在任何副作用前检查当前可见周期及挂载；来源还核当前Context／提交锁／校准／时间绑定，图像caption读取实际accepted frame的来源、时间和原生代次。对象资料来源走独立适配，不以Canvas成功为前提。每次导航独立实例；返回／后台退休旧实例，迟到错误不得释放新实例的保留面、锁或发无关通知。当前失败可真实重试，隐藏Sources失败仍释放其保留面。Context错误Back可用，重复触发只发一次navigateBack，当前失败才尝试Map，Map失败被处理并可重试。

已绘快照及日期、资料、目标、候选、列表披露复用`sky-command-state.ts`的同步UI读回桥；所有写入包括函数更新沿同一setter，显示仍由React负责，领域Context／公共时间／相机／校准owner不新增。Back按实时披露依次收起日期、资料、候选和目标。手势保存Context版本、时间绑定、可见周期、原生代次和原检查点。移动／结束拒旧作用域，取消仅恢复自己的有效检查点，当前新作用域可丢弃旧手势而不回滚旧相机。同Context ID换版也隔离旧取消／settle，公共时间／Context改变触发现取消入口；手动入口和停止跟踪沿当前守卫。

证据目录为`output/cloud-sky-page-lifecycle-2026-10-11-r1/`，最终文件与控制、Goal读回、新包、旧目录完整fingerprint在`current-binding.json`；脚本为`../scripts/check-page-lifecycle-2026-10-11.mjs`。最初六份源／fixture副本及本轮r1 page保留，初始page／Context pin必须等于上一轮已绑定源码。脚本fresh核当前文件、19控制、10旧目录及33个原ID；普通Markdown链接与事实正确性不在Context CLI的认证范围。

| 检查 | 实际结果与范围 |
| --- | --- |
| 原page生命周期／导航反例 | `lifecycle-navigation-before-r4.log`：27中23断言失败、4通过；无ReferenceError／SyntaxError。正常来源保留、当前失败重试、校准禁入及共享setter成立。 |
| 原page手势反例 | `gesture-before-r1.log`：48中35断言失败、13通过；正常既有12行为及播放拖动成立。新同ID换版反例另沿r1源码，在`same-context-gesture-before-r1.log`为1/1断言失败。 |
| 最终受影响组合 | `affected-tests-final-r4.log`：实际29文件267/267；新增覆盖真实Context／公共时间／选择／跟踪／浏览相机／姿态与Canvas生命周期，控制React捕获值、native API／绘制端口、事件交付和时钟，不模拟微信像素。 |
| 类型 | App本地TS5.9.3，`types-final-r4.log`空输出、exit0；不使用根TS6替代。 |
| 实际CLI | r1和r2均成功，独占UUID目录和各自v3 manifest；三个既有CSS顺序／性能warnings保留。 |
| 实际最终候选 | 显式`MINIAPP_BUILT_CANDIDATE_MANIFEST`指r2，`actual-built-candidate-r3.log`为真实`built-candidate.test.mjs`的3/3；独立inspect、预算与五origin role读回由绑定脚本复核。 |
| Context／差分 | manifest路径和controlling-source验证、tracked diff及新文件空白检查；实际receipt由绑定脚本读取。 |
| 审查 | 已做源／反例／输出自检；可用Code Review工具仅PR CI查询，未获本地独审，不创建PR或委派新任务；独审仍MISSING。 |

当前r2 `artifacts/miniapp/release/cloud-sky-page-lifecycle-ci-20261011-r2.manifest.json`：UUID `29c25830-b543-4916-91ef-0078fd99df28`，274文件4,649,944B，SHA256 `7c5d9e0352e454820dabac3dd2ca5128b0e8557a4d1effa28619eafb23cbe39f`。main2,096,426B／2,097,152B，余726B。原开发、两普通、三F、校准、两公共动作包及本轮r1十目录保原完整fingerprint；r1 UUID `94536cf2-6638-422a-b5f1-8e02ce485440`、SHA `0680d13060b0bf9a4cb9bb59ee8a82f24f0053a0bb4a350d003c1096b54f2928`。新Sky JS改变，212 assets／WXML／WXSS应与上一轮精确一致并由脚本核实。两包都是dirty本地CI类`ci-structural-nondeployable`，不是protected CI、可部署包或当前native运行证据。

中间失败原样保留：生命周期初稿把sensor deadline误算为Canvas job、把暂停误期望FIXED，随后分开真实owner时钟并用公共时间PAUSED语义；导航反例初稿先await未交付的旧metadata导航，已结束自有session并改为先行为断言；Map fallback需等受控Promise跨VM完成。新依赖引起旧AST fixture缺`skyPageVisibleCurrent`／mounted／最新生命周期入口／Taro，修fixture责任边界并保原行为断言，不恢复旧生产结构；中间类型错误分别补void Promise回调、第三bind参数及exact optional URL类型。`actual-built-candidate-r2.log`虽exit0实际是generic builder的10条测试，环境参数不构成candidate读回；仅r3明确实际文件的3条才用于候选结论。相关先前失败不冒充产品修前反例。

正常Canvas只有星空无控件的FAILED、UNKNOWN_PRODUCT_VS_DEVTOOLS仍保留；本轮没有新决定性运行输入，不重开旧IDE、SDK、GPU、z-index试验。物理校准、Android／iOS、CPU／GPU／文件／峰值内存、冷暖清缓存完整旅程、科学／显示资格、真实云可达／权益／qualified OCI／12Mbps共享200DAU容量、旧／现版及回滚／异机读回均未新增验收。43延期与其它未闭资格不升级；本轮未做source-only或fixture拼接的完整Goal审计，也不将267/267替代全33义务。唯一下一入口仅在`CONTINUE-CLOUD-SKY.md`。
