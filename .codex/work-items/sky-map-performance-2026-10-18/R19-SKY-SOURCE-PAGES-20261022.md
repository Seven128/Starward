# R19 Sky 来源统一真实页面

2026-10-22。依据用户本轮“来源统一用跳转页面、共用按钮与跳转逻辑、按固定模板渲染”的明确修订实施。范围为 Sky 消费者与既有 Sources 页；未操作设备、IDE、服务、Git 分支或提交，未改 PLAN/HANDOFF/Context。共用 core 由主代理维护。

## 实际变更

- `features/sky/spot-sky-page.tsx` 的目标及目录来源按钮改用公共 `SourceButton`。星座、暗星、太阳模型、地景、银河、W3、Body 影像的来源详情改为真实页面入口；旧五个来源展开状态与内联完整条款已退役。“天空说明”仍为原业务说明展开，保留实时/模拟/非现场的意义。
- `openSkySources` 仅把内部裸 `Taro.navigateTo` 换成公共 `navigateToSource`，允许带可序列化 `SourceDocument`；原当前时间/Context/校准资格、一次导航锁、Sources Return、Canvas 保留及失败释放/通知由原 Sky owner 承接。未从通用 `SourceEntry` 绕过领域生命周期。
- `currentPaintedSkySourceFrame` 从原光学来源动作提取同一资格条件，保留报告、时间、模式、native generation 与 Canvas 条件。地景入口还核同一 publication 和实际资源档；银河核当前同一 publication 与图像存活；Body 核原完成绑定的 reference/image/publication，并走既有精确 body hash route。原光学 painted credit 校验及其它来源版本路径不变。
- `sky-source-documents.ts` 仅作已选 metadata 到公共段落/事实/链接模板的适配，不查询、不获批数据、不持有图像。星座机器可读下载继续由原 catalog hash/允许成员 URL owner 生成；地景保原包/目录/派生的不同许可、完整署名、处理、限制、实际图片与原包；银河保光学/红外不同意义、授权及固定清单；太阳模型和 W3 保原始科学/权利文字。
- `SkySourceSummary` 只布局短署名和公共来源按钮；新按钮视觉不再由 Sky 私有实现。Sky DAY 的深色天空使用白色来源图标，公共 DAY 阅读页沿其暗色图标。原 `sky-source-link` 仅保布局，旧来源标题按钮样式退役。
- `sky/sources/index.tsx`、`hips-sources.tsx`、`target-sources.tsx` 共用 `SourcePage` 的真实导航、单一滚动正文、通知和主题。`body-image-sources.tsx` 继续嵌在原 Sources 页，避免嵌套页面/滚动容器。保留目录/可选影像、prepared、HiPS/rights、Body、target 原查询 owner、互斥解析、当前出版资格、部分/过期/失败/恢复含义。
- 来源记录统一 `Provenance presentation="reading"`。Body 原始来源/许可仍来自 `skyBodyImageSource`，图片与清单用共用链接模板；不把拍摄时间冒作获取时间。`target-sources` 用既有 `uniqueSourceRecords` 保同 ID 异完整记录，原活动说明仍保留。
- 无生产引用的 `sky-opal-bands-source.tsx` 兼容 façade 已退役，Body 来源由既有统一 owner 承接。需由主代理统一修正 `architecture/runtime-and-domain.md` 中旧 façade 描述。

## 验证

- `npm run typecheck --workspace @starward/wechat-miniapp`：最终退出 0。中间一次只因新最小测试 fixture 的显式类型转换不完整而失败，已修测试表达并回跑通过；没有改生产类型或数据校验来迁就 fixture。
- 10 个受影响来源/导航测试文件共 **60/60** 通过：Sources partial/metadata/target/HiPS recovery，Sky source-return/page-navigation-ownership/optical-credit/catalog-information-recovery，Body publication 与新 source-documents。
- 沿原回归继续覆盖 hide/return/unmount、Context/time/calibration、已绘/已退休/错误出版、导航失败与迟到完成、版本绑定、部分来源恢复和同 ID 异记录。新增限于新跨页责任：Body 与地景实际身份/资源拒旧、metadata 来源资格、资产模板复合许可/完整限制及固定下载、星座完整记录及机器可读成员。未扩设备/主题矩阵。
- `git diff --check` 对受影响目录退出 0；仅提示当前 SCSS 的 CRLF 在后续 Git 写入时会归一 LF。

## 仍需目标验证的边界

- 以上是代码、类型及受控行为证据，不认证实际 WEAPP 视觉、EventChannel 交付、系统 Back、Sources 往返首像素或物理内存。由主代理在完整构建后沿当前候选/官方预览链统一验证。
- W3 沿既有有效 manifest 资料资格与 discovery 清单，不将其扩大为“本轮已建立成功绘制回执”；已绘光学/银河/Body/地景有其原先不同的资格 owner。未改 W3 渲染回执、取图策略或光学供给。
- 必要短署名、现场/模拟意义仍在原天空说明/所绘图片附近；跳内部来源页不代表官网已打开、链接已下载、供应商超链接义务已关闭，亦不关闭完整 Goal 的其余设备、性能、内存及 UI 义务。

生产文件已静止，交由主代理统一构建/集成审查；本代理不重复全包构建或设备采集。
