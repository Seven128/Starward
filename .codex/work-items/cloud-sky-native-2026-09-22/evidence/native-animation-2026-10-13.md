# 四项体验的剩余原生动态证据

上一Goal turn是progress：r42同build地景误淘汰对比、r43普通交付和资源清理已改变权威事实，沿[上传归因](upload-family-2026-10-13.md)复用，不重做。当前仅补UX02/UX04真实动态范围，原33项、完整性能、图像冻结、红光暂缓和全部未提交成果保持。

## Candidate identity

现普通r43／landscape-pins-clean，SHA `aadcb3719d0da9d88deb74585988b76371ccee616549f45c5dd708edcf7e4f40`；当前同generation普通手机预览，LOCAL/MEMORY_TEST/v79/API19796开发lane，不是settled-candidate。09:36 fresh capture确认手动天空、星座图/线/名称和菜单；普通产品源码没有因工具改变重建。准确暖资源沿CONTINUE。

## Invocation result

原device-test只提供静帧、单指tap/swipe，尚无支持的双指host输入；不以普通swipe冒pinch。实际已配对无线守卫捕获成功，原session/头像/主焦点边界保持。只读screenrecord help首次stdout空（原runTool有意抑制stderr），有限把已知help的stderr并到stdout后确认设备内置v1.3及size/bit-rate/time-limit；没有把空输出推成设备不支持，没有扩收日志/存储。

沿Android[公开录屏说明](https://developer.android.com/tools/adb#screenrecord)和[AOSP实现](https://android.googlesource.com/platform/frameworks/av/+/refs/heads/main/cmds/screenrecord/screenrecord.cpp)确认MP4/时限/实际encoder行为，采用现AdbDevice中的短录屏，不安装手机agent或改变系统设置。固定6秒、原截图尺寸、8Mbps；PID和原媒体只在内存及私有会话，标准CLI记录而非任何微信隐藏API。用exec-out保二进制；唯一私有临时目录、native时限和shell退出/信号trap持有清理，成功在传输前unlink；失败/断线实际仍需证据，不能由trap源码冒全部物理释放。已核C++的format-change只是日志ALOG，不借它伪造stdout ready事件。

本机无ffmpeg/解码包入口，选已维护imageio-ffmpeg0.6.0的Windows二进制轮子，仅装到既有output的video-tool-deps/cache以读检查视频，不加产品依赖或修改全局Python/系统；[上游包](https://pypi.org/project/imageio-ffmpeg/0.6.0/)与[项目](https://github.com/imageio/imageio-ffmpeg)支持该范围。实际下载/安装exit0，FFmpeg7.1在该output；未获取/处理新的天文图像。

新增record-tap/record-swipe只组合原已审截图后的一个输入与6秒私有视频；仍由withSession核新旧bundle、串行锁、设备绑定、60秒single-use capture和AdbDevice.input的前台/实际尺寸核验持有。普通Mini Program范围，权限/系统/账号窗口不增加录屏许可；采样中前台变化丢弃媒体并仅停唯一路径匹配的本次screenrecord。最后重新取得原范围截图与尺寸，录像存nested私有session，反馈root不增额外文件。它是有界动态开发反馈，不是FPS/峰值计时器或新验证框架。

## Observed product behavior

10:15实际普通r43横拖录像已取得，末帧实际天空/星座图线/名称/菜单保持，原明亮参照点由native x274/y911移到x662/y910。原MP4 524,835B、1080×2376，65个原始编码帧；[帧PTS读回](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r43-native-horizontal-video.json)首0／末4.437411秒。请求的6秒不是已编码序列长度；静态开始到动作前有2.781789秒无新编码帧，不把它当应用卡住或物理FPS。全幅代表帧及4×nearest局部查看只保private runtime。

[局部像素跟踪](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r43-native-entry-tracks.json)track5在全点已进入x15后（4.127144秒）峰46／背景32，经过68/94/117/135/157/168/200到216；4.276878秒起保持216和同x65/y624，取样跨度约149.7ms。track14全点x15（4.0274秒）峰42／背景25，经过70/84/138/162/173，4.171267秒已达207，随后约205并在位置变化后稳定；4.188122秒的160.7ms只表示所选取样跨度，不能称精确渐变时长。ROI实际四帧可见单点逐渐变亮；前者在位置已停止后仍增加后稳定，不能仅用边缘截断解释。它支持当前手动普通场景进入视口的渐入，仍非逐星目录身份或全部160ms规格、渐出/连续pinch验收。

跟踪起初因20px参照窗漏掉实际一次25px位移而失败，不是产品星点消失；初次与带诊断r2真实异常保留，r2日志在native-entry-tracking-r2.log。扩大有范围参照搜索后同一原录像/65帧完成，native-entry-tracking-r3.log；未重新采录像或添加插帧。只使用原RGB max/局部背景差，压缩/子像素影响保真，不反算准确物理alpha。PNG局部image2导出出现non-monotonic DTS warning但exit0；原MP4及读回PTS未改，不能把重设PNG时基作原始时刻。sky_native_fade_in_review限定只读独审实际查看3张全帧/4张ROI，独立解码65帧，按原51/53/56/59帧及同YUV crop/nearest流程核四张ROI逐通道相同、0差异，故这四张没有错序或换帧；确认track5位置停止后继续增亮、未跳到其它点，支持本场景渐入。其对track14精确时长的限制已采纳；代理已结束关闭。此前r32–r34静帧/软件范围不升级完整验收。

## Verified

新helper首次测试被fixture的模板字符串octal escape拒绝，属于新测试语法失败、未触手机；改成明确NUL分隔argv后5项检查通过。原日志native-record-behavior-r1.log/r2.log保留。4项受影响CLI/单次授权及权限守卫通过，native-record-existing-guards-r1.log；没有重跑产品大套件。首次patch因预期import顺序不符被原子拒绝，核当前三个文件确认0修改后按实际import应用，保失败事实。

exec-out修订后5项helper通过，native-record-behavior-r3.log。sky_record_guard_review限定只读独审发现P2：输入owner较慢的前台/截图检查结束时，录像或scope已失效，原临时入口仍可能送动作/返回旧媒体。代理已关闭。真实input owner的针对性回归修前失败（native-record-late-input-before.log），没有放宽断言。

现同步取消检查沿input.beforeSend→command.beforeInvoke，运输核验之后且实际invoke之前不再await；临时录制结束/scopeError即时拒绝，monotonic时限按发起native命令前的最早可能结束点保手势+250ms尾部，不以PID行冒首编码帧。6项helper修后通过（native-record-behavior-r4.log），6项CLI/尺寸/single-use/无线派发守卫按实际受影响路径通过（native-record-final-dispatch-guards.log）。sky_record_final_dispatch_review已限定复核无新增问题，两名源审查代理均已结束关闭。

首次实际record返回device_test_tool_output_invalid，启动PID行未成立、未发送输入/保存媒体；两种无输入printf探针确认exec-out自己保argv，多包single quotes反而把整段当命令名。去掉额外层后6项helper通过（native-record-exec-argument-guards.log），fresh capture查看同r43后同一1000ms路径成功录制。原失败不改通过。前后两次只读自身临时前缀计数均0；前次尚未启动，后次正常路径清退成立，无删除未知目录，没有故意断线验清理。

## r44 淡出定点

为排除“退出画面边缘”而观察仍在画面内部的淡出，只临时在现页添加45↔90°按钮，沿既有setVerticalFovDeg与相机/时刻/Scene，不注入双指事件、不建立新的产品缩放控件。r44/star-fade-video/STAR1013P，SHA `2efdd824ba0bf4b60137e6ea6c272945fea156516a62f4713b90f70315d90a4c`；284文件/4,869,135B、main2,097,108B（余44B）/Sky1,405,273B。受改页Mini TS5.9与该诊断build/预算通过，不重跑未变生产行为套件。11:02官方auto_preview完成，fresh capture实见标记/手动入口，随后实见正常手动天空才bind；11:03经新鲜已查看截图record-tap实见变成90°视场/45°目标按钮，私有录屏/末帧保存，scope仍development_feedback，未认证手机独立字节/AppID。

[原帧metadata](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r44-native-zoom-out-video.json)：231,399B/1080×2376、27原编码帧，首0/末5.627311秒；原初静态编码间隔2.612767秒不等应用长帧。第2帧3.458811秒已新Canvas投影、旧DOM名称尚在，首像素筛选混入字形而保[未判定r1](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r44-native-exit-tracks.json)，没有当星点渐出证明。n3已更新文字后同原27帧改按固定内部紧凑点筛选、排按钮/console与延展文字/线，background变化界限只作像素读回候选筛选，不作产品新规格；[r2](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r44-native-exit-tracks-r2.json)/native-exit-tracking-r2.log保独立结果，原r1未改。

r2 track2固定native x652/y1647，n3/4/5/6/7/8峰207/195/125/93/29/27，背景27/27/27/27/26/25，最后n26局部contrast0。实际查看3全帧与4×nearest的n3/5/6/8局部：内部中心点从亮变暗至背景，下方另一点保持；没有移动到屏幕边缘。峰受H264压缩影响，不能反算精确alpha或逐星目录身份，取样跨度不称精确160ms。7局部PNG由原n3/4/5/6/7/8/26经YUV crop100:100:602:1596/nearest400导出；image2 DTS警告exit0，原MP4/PTS保原。sky_native_fade_out_review限定只读独审独立解码27帧、SHA/PTS/逐帧校验一致，同YUV流程核7ROI逐通道0差异，实际看3全帧/全部7ROI；确认n3–n6峰位置不变并逐步降至背景，n26峰/背景均25、contrast0，下方另一点保持可见，支持本step局部淡出。压缩contrast积分不每帧严格单调，不冒精确alpha/时长；代理已结束关闭。

临时页前像/probe/manifest归既有output的r44-star-fade-page-*及r44-star-fade-probe-source.json。页已按归档前像SHA `9e1345a8861c6ac8a3250095f5069bec6feef3e30791b60d7c1e8504898e0962`逐字恢复；原r43同generation/reuse-prepared官方auto_preview完成，未重建原生产包，11:15 fresh capture进入手动实见原星图/名称/菜单/单箭头、无临时按钮并重新bind。录像/PNG已复制private API runtime，所有真实失败/未判定结果保留。r44 feedback/bootstrap与r43 return-bootstrap均stop，原r43旧nested因repush失效并清退，新暖nested为starward-device-test-Y72UQj；实际本次手机临时录屏目录只读计数0，未删除未知目录/停止用户微信。诊断视场step不能替代连续物理pinch手感，未升级UX04或普通候选完整验收。

## Unverified

实际MP4编码、当前普通横拖渐入及临时FOV step内部点淡出已有有范围像素/独审证据；编码负担、全范围/精确160ms、连续pinch切换、物理FPS、iOS、整场native/driver/OS峰、断线清理及手机独立字节/AppID仍未认证。未要求正在睡觉的用户重复双指/三轴/后台动作，不绕原守卫注入其它手机输入。具体点的可见变化和独审界限沿上方，整体性能仍FAILED/UNVERIFIED。

## Invalidated

新增工具没有改变r43产品bundle。每个新输入仍须fresh capture并查看；本轮09:36截图过期后不能再用作动作授权。录像只能覆盖它实际记录/评判的过程，模拟fixture不能证明实际原生动画。

## Cleanup

普通r43和既有API保持暖，录像/PNG已复制到既有private API runtime；旧nested/r44的临时原录像由各session owner在清退时处理，private原MP4副本保留，反馈root未增文件。正常手机临时前缀数0，不停用户微信/未知进程。安装包、原MP4/帧、数字读回、真实测试与平台失败保原；准确下一输入/资源沿CONTINUE。
