# R19 生产整合与目标运行观察

2026-10-22；当前为 `development_feedback`，不是完整 UI 或性能验收。沿原 PLAN，保持所有未撤销义务。未重选设计、提交、推送或上传性能/私有数据；后续用户明确来源页修订已更新同一PLAN对应责任。

**最新来源要求已覆盖本文旧Sheet部分：** 用户随后明确来源统一真实页面，已修订同一PLAN的来源责任；当前实现/目标结果归[来源页证据](R19-SOURCE-PAGES-IMPLEMENTATION-20261022.md)。本文gen1的Sheet开关/Back结果仅保历史适用范围，不能认证新页面。gen2日志恢复已执行，gen3普通预览成功，随后gen4来源页面已在真机查看；点位正文返回复位失败的软件修正在gen5，当前候选/在途/下一步归HANDOFF。下方旧“gen3尚未预览/先恢复gen2”的步骤已经完成，不再执行。

## 已实现的公共责任

- 搜索改为 Map 右侧竖排首项，顺序为搜索、定位、天象、添加、层叠；保留原 MapPanelChrome 动作时钟与按钮业务。My/删底栏/真实路由迁移仍等待导航取舍，不把目前底栏存在的候选叫作完成。
- 共享 Button 使用原生 hover-class，视觉面按压与命中范围分离，保留 disabled/loading/busy、原生事件、选中/收藏及 Sky 自有转场责任。见 [共享实现](R19-SHARED-PRESS-IMPLEMENTATION-20261022.md)。独审发现的 Sky transition 覆盖已修复，见 [代码审查](R19-UI-CODE-REVIEW-20261022.md)。
- 来源按钮、route-local 阅读 host、完整出处/许可，以及层叠、月相双栏、天气九格已整合。Map 阅读层复用唯一 NativeBackBoundary；正文/点位/账户身份及退出清理沿现有 owner。见 [紧凑信息实现](R19-COMPACT-INFORMATION-IMPLEMENTATION-20261022.md)。去重使用 `uniqueSourceRecords`，同 ID 不同覆盖记录保留；未改动的时区来源与复制动作已恢复原形式。
- DAY 添加图标从采用源已有运行衍生文件直接恢复，19,462 B / SHA `ceb9f101bd107eb2f09359738fa97a9fc80adf703d6ae994d28e3e74e2fcdb06`，无重新生成；通过 SemanticIcon 和现有 main bitmap declaration 分包。DAY 搜索/定位/添加/层叠图标按采用源 26Px；其余主题及天象原尺寸不变。这组修正尚未在 gen1 中。

## 目标与环境绑定

当前 checkout `codex/remote-main-20260908`、HEAD `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`；原 dirty、Harness、冻结 r22–r26、私有原件保留。

复用既有 USB 设备、8798 development bridge（指向 8799 API）、55441 PG。`/health/ready` API ready；bridge 的正确入口 `/__development_bridge_health` 返回 200 / upstream 200，scope 为 `current-postgres-public-products-sample-weather`，anonymousOnly=true、accountRoutesAvailable=false、reminderWorker=false。没有改变 VPN、端口映射、8791 账户环境或数据库。该 scope 的天气是 SAMPLE_DATA，不当作真实气象源验收；账户/计划相关失败不借此判生产回归。

现有 Stable 安装 `r22-stable-control-20261021/stable-app` 登录有效。PATH 的另一安装 CONNECT_ERROR 已定位。canonical 项目首次 lite/window welcome，公开 auto、项目导入、open_page、一次 close/reopen 后仍只有欢迎页；`simulator_refresh` 最终超时。已停止这条启动路径，未循环刷新、换版本或请求 Heap。工具 success 不代表应用已运行。

已有普通官方 auto-preview 路径可用，本轮推送与绑定成功。没有额外二维码/登录人类操作。

## UI gen1 与私有保全

- 完整 Taro build 62.317s，通过原有 physical-device bundle guard；10 项 CSS order / bundle-size advisories，不是编译失败。
- Bundle `7dad24c4cc7e2a5adb2f06106413f2e3858e3dae2cd5290bc4070102cf605055`，337 文件 / 4,980,480 B；main 2,019,687、content 1,040,852、spot 597,802、sky 1,322,139 B，既有包预算通过。
- feedback `C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm`，generation 1，prepared `generation-000001-1N653I/project`；device session `starward-device-test-JNntkd`。官方 auto-preview 终态成功；独立手机图先看到新竖排/旧长搜索消失，再 bind。
- `runtimeAppID` 和手机完整包字节没有读回，仍为开发候选关联；不能用本地 bundle hash 代替手机完整身份。
- 本轮私有根 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022`。gen1 feedback/候选/截屏/录像整份复制为 `gen1-feedback-originals`，388 件 / 25,708,416 B；旁边 `gen1-feedback-originals.manifest.private.json` 记录逐件大小/SHA。原始 Temp 副本与旧 r26 保留。

## 已实际查看的有限结果

以下图片原路径为 gen1 的 device session，私有归档内保留同名。全部实际查看；没有以 capture 命令成功代替图像判断。

| 观察 | 原始文件标识 | 结论与边界 |
| --- | --- | --- |
| Map browse / medium 工具列 | `screen-bdf96306-18f3-4f36-a0ab-7ee9fc2a08b4.png` / `screen-69accbdb-d489-4f04-a3b9-2cd1cabf6cf7.png` | browse 五项齐；medium 遮第五项。旧底栏仍占至少72Px，去栏后本机预计恢复净空；没有做临时挤压，待新导航候选实测。见 [几何调查](R19-TOOLBAR-FIT-20261022.md)。 |
| 层叠 | `screen-5e5e5de7-d90c-4294-898e-430f18c580c0.png` | 紧凑标题/地形/来源及云量、光害选择可见；当前历史时段无云数据保原语义。 |
| 来源覆盖原生 Map、长内容滚动 | `screen-790c5064-7a0a-413b-b7e3-a1e3f3f35369.png` / `screen-aa715148-e18b-45a9-b735-a22b25246663.png` | 实际署名、链接、许可、精度和来源未提供状态可读；可滚动。尚未执行复制动作。 |
| 系统 Back 顺序 | `screen-09dff8e8-7970-49b1-8c14-1cb854f1a357.png` / `screen-6c70d27f-ce9e-45eb-860e-0bb101f2e2b7.png` | 第一次仅关来源，仍在原层叠；第二次关层叠返回同地图位置。 |
| 来源 pill 横向滑出 | `recording-1792664990673.mp4` / `screen-80256a29-5473-4904-ab00-f15ebef48c92.png` | 700ms滑出后未误打开来源。终态已看；原片未解码，不宣称80/140ms及连续按压画面通过。 |
| 月相 | `screen-166ece2e-da0f-4e77-8b28-cadb9de034a7.png` | 双栏、月出落日期/时刻、月亮高度、阶段及来源按钮可见。 |
| 历史天气 | `screen-dedcf46a-72b7-4e1a-83c1-5a2234ed17f2.png` | 10/20历史时段九格显示已过期，没有填零。 |
| 当前 SAMPLE_DATA 天气 | `screen-a92719ac-88ab-441f-ae7d-7052eca11ae7.png` | 使用原“今天”按钮进入10/22 20:18，九格单位、37%/24.7°C/66%/18.0°C/14.0km/h/17.0km/h/15.0km/0.0mm/0%可见，没有改DB/数据。 |
| 短来源与正文复位 | `recording-1792665858592.mp4` / `screen-d33050b3-a214-45f7-8ba7-f40c0dba78f3.png` / `screen-7731f036-548f-4b00-ba00-dae6f118eb61.png` | 阅读显示当前预报范围说明；Back 回到同一九格及相同滚动位置。sample源未给第三方来源记录，未伪造署名。短说明固定高度空白见下项。 |

[独立目标输出审查](R19-TARGET-OUTPUT-REVIEW-20261022.md)发现一项P2：来源壳固定76vh，不符采用源内容驱动、最多76%的高度，并把标题固定在正文之外。现已改为同一 ScrollView 承载标题与全文、内容驱动高度/最大高度上限；先验证公开 CSS 约束在目标 WebView 的实际滚动能力，不先增每卡测量机制。此修复未借 gen1 图片标通过。

两份gen1原片已在仅绑定127.0.0.1的本机浏览器实际解码查看，临时页/服务已关闭，输入及查看器留私有`video-review`。浏览器回调只留下滑出3个、打开6个不同按钮区域样本；未得到足以判断80/140ms连续反馈的样本，不能标按压动画通过。后续需要的是一个有持续接触的代表观察，不是重复瞬时ADB tap录像或扩全页面矩阵。

## gen2 官方失败与 gen3 修正

gen2完整Taro build通过（37.585s、10 warnings），338件/5,000,289B，bundle `367e107a214b32807fab76bd90f9feac4e5e4915c22f0e413911268bf40ee3b7`。沿同一feedback刷新，prepared为`generation-000002-v5347l/project`。原操作session已失效，不能继续旧session输入。

包装层返回`error / status:unknown / taskId:null`，因此没有重发或bind。只读官方运行日志随后恢复到明确失败：主包source size **2050KB > 2048KB**，唯一对应的`auto_preview`在18:57:02.178记录`toolStatus=fail/errorCode=10`。独立复核与原始片段hash见[R19失败审查](R19-PREVIEW-FAILURE-REVIEW-20261022.md)。这不是VPN/网络修复任务；外层“网络请求错误”不覆盖实际包体限制。

按原owner的一次task-local恢复已完成，完整保留原unknown结构化记录、taskId:null及其hash，仅以单独官方日志resolution确认业务failed，gen2未绑定。私有`recover-gen2-official-failure.mjs`不得重跑。共享runner有界私有receipt已完成且39项检查通过，no-replay/no-bind守卫未改。

实际包体修正是精确退休无生产消费者的长搜索框样式，压缩CSS减少3,329B；全部有效selector/declaration/顺序及几何变量严格一致，12项现有Map检查通过。见[退休证据](R19-SEARCH-RETIREMENT-20261022.md)。原Harness对已退休长框及被覆盖top规则的源码断言已移除，保留真实语义控件/恢复/安全区检查；对应现有safe-area test通过。gen3完整Taro build通过（36.404s、10 warnings），随后普通auto-preview实际成功并绑定；DAY蓝色添加与26Px四图标、长来源滚动已实看。后续新来源页结果见本文顶部入口。

## 软件检查与下一步

原整合的 scoped Map / source / shared press / Sky recovery 检查与代码独审见各责任报告。图标补齐后现有 semantic asset 三项测试通过；阅读壳修正后 source disclosure/host 六项通过；两批 miniapp TypeScript 均通过，diff check 无空白错误。未新增仅镜像实现的测试。

当前步骤只以HANDOFF为准：上述gen2恢复/receipt与gen3推送均已完成，旧Sheet验证已被用户真实来源页修订替代。来源页目标结果、已观察失败及修正归R19-SOURCE-PAGES-IMPLEMENTATION；原导航取舍与全部未撤销UI/叠层/Sky义务继续保留。
