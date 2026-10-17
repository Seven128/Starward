# Android 云观星开发反馈

用户明确手机已连接无线调试、与开发者工具同微信账号，授权推送并恢复同一无预算 Goal。沿 PLAN E/F，仅补首次可用手机条件下的原生开发反馈；不是固定干净候选的最终验收。图像获取／像素加工及已通过的软件检查均未重跑。

最新为r13普通版本的定点呈现反馈；r11用户已确认“有改善”，原历史卡顿不因此抹去或宣称零掉帧。完整性能范围见[整体性能证据](overall-performance-2026-10-12.md)。r8十字同步获用户实见确认，其73帧／JS75／绘52／拷1／桥157ms最大值保[原结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-direct-result.json)，不当FPS；静态reticle可见且点击仍打开M31，Back回Sky。

## Candidate identity

- 普通收尾r13：slot sky-phone-1012-r13，284文件／4,861,630 B／`f6aaf519b912074324b7ffaa5f2abfee2d26f324d19bc321bacac11a10bd4cd0`，无自加性能marker／计时层；既有v79本地API及同账号官方普通预览。见[候选](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-night-build.json)和[结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-night-result.json)。本地主包2,096,928 B在2MiB内，不冒正式上传计量。
- 当前分支 codex/remote-main-20260908、HEAD b73523f1c76bf50a3811fcff65f3e2d2f791373d；全部 dirty 成果保留。
- 无后端对照：同七份原生 app/page/surface 基线字节，因已有反馈 owner 要求独立 bundle root，仅准备 miniprogram 子目录配置；指纹 `38da33b80cd51eb0dd3075deb2382d33b522e5c17899e278f93703beb9d0aed5`。见 [phone-probe-result](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/phone-probe-result.json)。
- 完整产品：仅为手机可达的 API／资源 origin 作一次当前源码普通 WEAPP 编译，slot `sky-phone-1012-r1`；284文件／4,860,246 B，指纹 `f70b473a6c62be53d732979cb1a1c82440d06256854e195309f844ef96e6956f`。没有客户端 fixture、Sky feedback marker 或新 renderer。旧 CI／本地候选保留。见 [build](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-build.json)（其中初始启动路径保当时配置，已由实际编译清单纠正为 sky/detail/index）。
- 来源返回搜索词修复后，仅因相关生产源码变化隔离编译一次，slot `sky-phone-1012-r2`；284文件／4,860,319 B，指纹 `a195edc9734d951c58b3be1430594ee152860ff34368d39817a6ff22d15cd1a6`。复用API，正式推送后取得下表r2实际结果；r1包保留，不以旧画面认证新候选。见[修复候选](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-search-build.json)及[手机结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-search-result.json)。
- 日历选中项对比修复只改两份SCSS，相关差异检查与一次普通编译后，slot `sky-phone-1012-r3`；284文件／4,860,474 B，指纹 `595ea3ad9ea21926415022b236bce8f1e61a317d90a52110e31d0a7f72a11e46`，源项目与prepared代次同字节。正式推送完成；为恢复本地反馈状态，后来复用同一prepared字节推送一次，没有重建。见[候选](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-date-build.json)及[手机结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-date-result.json)。r2搜索逻辑未变，沿用已取得的证据，不重放。
- 缩放采样r6：284文件／4,862,302 B／`e295b85dba54412b30797aab822d352c1cb631982253d206fc782b728b23bd48`，PERF1012C，无客户端fixture，临时stage计量仅作诊断。修复候选r7：284文件／4,862,678 B／`496c4eee2d5be5e306b1be805e3fd1fd8439d06fb5da6386ab907d34258d0fae`，PERF1012D，编译及项目同字节准备后沿正式auto_preview推送，实际marker和同一M31可见，物理反馈已取得：改善但仍卡顿／十字迟到；均不是最终普通候选。见[r6](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-baseline-build.json)、[r7](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-fixed-build.json)及[区域重复提交检查](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/region-frame-stability-check.json)。r4／r5诊断缺陷和原源码／包保留，不升级其数值。
- 后端是当前 v79 编译 main、LOCAL／MEMORY_TEST／显式天气 fixture、禁用媒体，独立进程与端口；来源、星表及计算沿真实现 owner，不能冒真实天气、生产认证、持久化或云端容量。使用 PUBLIC_REFERENCE 示例点 Context，不读个人位置。
- 手机截图1080×2376，仓库外私有 session；本地指纹不提供手机字节 attestation。手机 runtime AppID／SDK 尚无独立官方读回，不能借桌面 SDK3.17.4补填。
- 后续通过同一guarded transport读回通用机型N2401、Android14、微信8.0.78，见[非唯一运行元数据](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/phone-runtime-metadata.json)。首次元数据探测tool_timeout保失败；修正只读命令后取得这些字段，未把它当产品／SDK通过。

## Invocation result

r13正式auto_preview完成，00:35手机见新普通入口后bind，00:36手动夜空、00:37一次host平移已实际核看。初次device-test start多传transport被参数校验拒绝，纠正后正常捕获；不是产品失败。没有重复人工缩放、旧搜索／日期／三轴／后台路径。

无线 ADB doctor 及实际 guarded 截图／输入已工作，端点和设备身份未记录。官方自动预览、登录入口可用；同账号用户声明与实际目标画面共同确认推送到本手机。MCP transport closed 继续沿已允许的官方 CLI，可选 CLI 令牌模式，不读取或混用 MCP 令牌。完整产品调用正式 auto_preview，页面与 query 归 private descriptor；不是已附着真机调试或手机 Console／Network 的证明。

首次对照 start 在发推送前被 separate_bundle_root_required 拒绝，未放宽 guard。完整产品首次指定的路径不在实际 app.json 内，表现为白色空壳；随后纠正路径，真实 ContextError 又提示少 timezone／dataRevision。沿实际 Map onPanelCloud caller 和本次真实 context／overview inputDigest补完整 query，复用同一 prepared bytes 推送，没有为这些配置错误重建产品。两次现象归启动配置／harness，不冒产品渲染缺陷。

一次手写 ADB HTTP probe 有语法错误，正常执行后 HTTP400仅证明到达监听，未认证 readiness；不因它改防火墙或继续同样探测。实际产品随后通过现请求 owner 取得 Context、天空、目录搜索和资料，手机网络能力以这些下游结果限定，不冒公共域名／TLS资格。

## Observed product behavior

| 实际手机动作 | 观察结果与范围 |
| --- | --- |
| 全幅原生对照与可见 WebGL 按钮 | 普通文字、外部／Canvas子 CoverView、底部按钮同时可见；真实点击后 OFFSCREEN_WEBGL_PRESENTED，显示采样 `[128,20,20,255]`，控件保留。不是完整 Scene／性能验收。 |
| 完整 Sky 入页→手动查看 | 实际星点、名称、星座线及原有插画绘制后，顶部／底部菜单仍可见；本 Android 样本未复现 DevTools 菜单遮挡，没有因此更换框架或产品渲染代码。 |
| 时间面板与跨午夜拖动 | 21:00拖至00:30，日期变10月13日；最早捕获的刻度处于重定位中，后续稳定画面与00:30一致。未以瞬时画面制造零过渡要求，也未认证响应耗时。系统Back关面板且留在Sky。 |
| 搜索与键盘Back | 可见输入框输入公开查询Polaris，两个实际目录结果；系统Back先关键盘，保探索面板及搜索内容。 |
| Polaris资料→来源→系统Back | 当前HR424中文介绍、HIP／HD与光谱／测光事实可见；来源与许可页可读，Back返回该资料与Sky。返回后底层列表为默认列表，不把未核的搜索查询连续性算通过。 |
| 定位、星空点选及跟踪 | 定位后北极星出现在中心标记；直接点星空同一位置打开HR424资料；跟踪后Polaris／跟踪中及停止跟踪控件可见。未据此冒长期追踪／所有对象验证。 |
| 播放预览→系统Back | 播放中／取消预览／设为观测时间控件实际出现；Back关当前编辑面板，保目标与Sky。没有独立秒级时刻读回，不能扩成精确播放速率证明。 |
| 两套网格与面板切换 | 分别打开赤道、地平网格，两项状态及实际线条可见；切到校准后图层面板退出，保当前场景。 |
| 跟随手机、校准开始→Back | 当前设备方向进入后，跟踪退出、Sky变换；校准画面锁定且其它命令禁用，Back取消并返回跟随画面。未在室内虚假确认与真实星空对齐，绝对校准精度未验。 |
| 操作者实际左右转／上下倾／侧倾 | 用户完成该物理动作后明确回复“三个方向都能跟随”。归r1手机开发反馈的三轴跟随观察，不等于绝对方位精度、真实星空校准或运动性能量测。 |
| r2 Polaris→HR424→来源→两次系统Back | 真实输入Polaris及HR424／HR7228两个搜索结果保留，来源与资料仍按原Back返回。新修复的原生结果已观察，旧r1查询丢失不倒填。 |
| r2 日历取消／提交 | 系统Back取消保10月12日21:00；选择13日后实际Sky／时间面板为10月13日21:00。选中项当时浅色底与浅色文字低对比，保实际缺陷。 |
| r3 普通模式日历选中项 | 13日改用既有成对choice颜色，真实暗底、清晰标签／边框；没有新增日期状态或产品测试，未扩展主题×日期矩阵。 |
| r3 设置返回异常／后续普通返回 | 首次切换后Back曾显示“暂无数据／观测信息不完整”；此前设置提示偏好仅本机保存、同步失败。后端示例Context实际200／FRESH／revision2且未过期，不能据此证明客户端状态。走已有入口／我的恢复并复用同字节推送后，切回普通夜间、Back实际保Sky／菜单及10月13日21:00；根因仍UNKNOWN，没有猜改账号隔离或路由。 |
| r3 Home→最近任务返回 | 普通夜间时间面板下，用户实际离开约10秒再返回，明确“全部保留且可操作”；后续实际截图同星空、底部菜单及10月13日21:00。只证本次前后台恢复，不证进程被杀／冷启动、长时资源或FPS。 |
| r3 行星／深空代表 | 土星实际目录资料→定位到原星空星点→同星点打开PLANET SATURN资料；M31实际星系资料、目录尺寸／星等→定位到真实类型标记→标记打开同M31资料。缺图不补恒星，未验证放大盘面／全部家族。木星报告建议保负仰角−52°和同刻来源，报告提示不冒完整目录介绍。 |
| r3 真实双指宽视野→放大 | 用户确认缩放及菜单功能成立，但明确肉眼可见卡顿，快速缩放后选中十字迟到位移。性能与动态标记同步FAILED，具体瓶颈尚未量测，不把功能成立当性能通过。 |
| r4–r6 有界缩放诊断与r6实际采样 | r4数值被顶栏挡，r5每draw更新诊断文字会增加工作，相关数值不承载产品性能结论；r6改为松手后一次显示，没有个人位置／账号／日志。用户完成PERF1012C／M31快速缩小→放大并回复“好了”；21:58实际画面65帧、render-to-effect最大96ms、Scene最大77ms、同步copy最大1ms、publish→Taro.nextTick最大223ms，end0／最小FOV37.21°／当前55.6°。仅是该动作stage最大wall耗时，不是平均FPS或GPU完成；r6仍修前代码，诊断采样不算性能修复。见[r6结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-baseline-result.json)。 |
| r7 区域Hook修后一次快速缩放 | 用户明确明显更流畅且十字回得更快，但仍有卡顿及十字持续移动，两个结果仍FAILED。22:15实际PERF1012D为11帧、render-to-effect最大83ms、Scene最大67ms、同步copy最大0ms、publish→Taro.nextTick最大71ms，end0／最小FOV32.73°／当前165.3°。两轮手势和FOV范围不同，不作受控FPS或固定比例收益结论。见[r7结果](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/product-phone-performance-fixed-result.json)。 |
| r11纹理优化后单次真实缩放 | 用户确认“有改善，不错呀，还能继续优化吗”；00:14实际夜空、名称、星座、菜单保留。只确认相对F的肉眼改善，不认证零掉帧／固定FPS，宽视野范围与旧host样本不同。 |
| r13普通版进入及平移 | 颜色、星点、仙王座图案／线和Alderamin名称实际可见；一次650ms平移后星空及名称移动、菜单保留。自加性能计数消失，官方预览vConsole保留；非物理FPS测量。 |

## Verified

上述 scoped Android development_feedback 的可见与输入结果，以及同源全幅 Canvas 的 DevTools／手机差异。它们允许停止同一模拟器分支猜测，不证明精确根因、iOS或完整原生验收。

手机来源Back后底层探索列表恢复默认的实际现象已定位到搜索词生命周期：`SkyObjectSearch`在pageVisible=false时卸载，原局部query随其销毁。现由同一`SpotSkyPage`会话保存query，以受控props返回原搜索组件；仍隐藏卸载并取消debounce／查询订阅，不新增持久化、查询服务或状态机。新回归使用既有搜索fixture，首次仅执行该案例exit1，返回的输入为`''`而非`Polaris`；修复后同组件5项行为检查exit0，涵盖返回恢复、原native确认、清空、debounce取消及迟到旧结果拒绝。小程序typecheck exit0，相关差异检查通过。r2实际搜索恢复成立，已停止重复这条路径；只因CSS修复构建的r3不使搜索证据失效。日历取消／提交、普通选中项对比、普通设置Back及本次Home返回取得上述真实结果，不冒全部设备／主题或性能。

## Unverified

`useSkyPreparedRegions`等价footprint包装对象的重复提交修复及原检查保留，r7当时性能／十字动态FAILED不倒填。后续同Hook共享稳定空可绘列表，修前真实FOV变化仍空时2次提交／应1；raw pinch修前每move写整页，两个move实际2次／应0，现先进入原zoomRef／Canvas writer，接受帧才发布页面FOV。静态选择图形沿原位置查询／报告绑定及投影／角尺寸／盘面避让并入同一接受显示复制，原生按钮／名称／辅助语义／重试保留。11项相关组件检查、8项手势代表及本地TS5.9通过，首次fixture GALAXY字面量扩大为string的类型失败已修，未重跑行为检查。见[该批检查](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/direct-pinch-frame-check.json)；r8后续用户确认十字同步、r11确认性能改善，但完整目标性能和r13物理FPS仍未验。原误用根TS6报baseUrl废弃的调用失败仍保，未改编译选项。

用户已完成三轴及上述Home返回动作，不再等待／索要同动作。2026-10-12最新指令“你别管红光模式，你先把其他的做好”，停止进一步红光开发和验收；已有红光日历观察不认证完整红光旅程。设置返回的先前异常根因仍UNKNOWN，后续成功不抹掉FAILED。方向绝对精度、真实星空校准确认、进程冷启动／完整生命周期／物理资源，以及固定候选／iOS／云端义务仍按原范围未验。C07五身份缺口、图像冻结与33项全部保留。

## Invalidated

过期 screenshot authority 被 project guard 拒绝时未发送输入，重新截图并核看后才继续；不改变60秒 guard。一次输入后的 capture 尚在运行时显示的是旧文件，终态收取后重新查看新画面才进行下一动作，旧图不当新结果。推送改了启动条件后，旧 route／screen 证据不承载新运行结论；bundle未改变，实际结果分别记范围。

## Cleanup

r11旧feedback、r13 bootstrap已stop；r13 nested设备session已停止，临时generation目录仍cleanup_pending，原owner两次删除失败、官方精确project close失败均保记录，不重启整套IDE／强删未知资源。当前路径及后续清理条件只见CONTINUE。v79本地API保留供已交付的普通手机预览使用；源项目、全部候选包、必要私有截图和手机数据不变。r1–r10旧feedback及各bootstrap已按owner收尾；r4初次cleanup_pending及后来成功保原。旧owned s1已官方关闭。无采购、部署、上传体验版或发布。
