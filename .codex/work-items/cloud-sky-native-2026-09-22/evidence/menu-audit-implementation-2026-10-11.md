# 菜单与审计修复：阶段实施证据

2026-10-11用户在本对话明确恢复既有Goal／无预算，按保存提示词执行。本轮只在指定workspace／codex/remote-main-20260908分支实施既有PLAN，PLAN未修改；图像获取、像素加工、扩大供给及外网文本队列均未恢复。本记录是开发与自审证据，不是完整Goal、原生或独审通过。

## 实现与职责

- **AUD01／菜单**：`sky-disclosure-commands.ts`无自有状态，读取原时间／校准／选择refs；统一列表、时间、图层、校准、日期和资料的进入、关闭、切换及Back。日期→资料→列表／面板→离开，沿原owner取消预览／校准。独立close拒绝已切换面板的迟到关闭，busy／隐藏／旧Context不能借toggle取消当前编辑。原Settings路由只新增当前请求令牌，不复制模式store。
- **AUD02／共享Back**：辅助PageContainer活动时show=true新挂载，消费后卸载，仍活动且同代次才下一task重入；重复leave、迟到Promise、同步hide/show和卸载均有代次围栏。Map仍保前景容器及事件Modal子树，继续beforeleave与原延迟布防语义。合并公共命令生命周期后避免增加主包超限；没有把Map呈现强行套成辅助modal。
- **菜单直接改版**：底部探索／时间／图层／校准，上方方向与原显示Settings；同一标题／关闭、分组图层、完整来源折叠说明及数据／恢复意义保留。日期／资料在上层时隐藏底层菜单。全部新按钮复用SemanticIcon；实际编译读图发现Sky子包缺10个现有图标，已补同字节复制声明。样式核看修复列表缺测文字挤压、日间主题天空标签及时间尺低对比、红光返回借用彩色图标。没有更换Scene、真实图像、相机或新建状态框架。
- **AUD03／缓存**：CelestialObjectInformationService统一256项FIFO写入／淘汰及返回克隆，日月行星也受限。兼容旧客户端携带全局选择，但仅所属家族有效选择进入键；HR／SAO版本、月面coverage和深空精确出版保其语义。部分失败不缓存成完整成功。controller对光学出版使用现有完整M／NGC／IC身份合同，合法扩展深空目标不被仅M判断挡住。
- **AUD04／检查边界**：受改版影响的类名／私有回调检查迁到稳定命令、实际React18＋Taro renderer或窄语义props适配；原跨午夜、busy、Context替换、迟到及消费者差异断言保留。原ruler排队scroll／settlement不是删掉：现由完整原Taro页面实际ScrollView、真实原handler验证。
- **AUD05／文本collector**：实体获取采用create-only执行副本、producer依赖／声明／输入／运输回执的前后绑定；执行副本自身也参与绑定。公共curl元数据解析对缺失、截断和无效JSON留下失败回执；已完成独立结果保留，后续队列停止，maxlag仍最多三次及原退避。article collector拒绝绑定失败的发现结果，并复用同一运输解析。历史缺执行副本仍MISSING，不事后伪造；本轮所有collector检查使用注入的本地运输，外网请求0。

## 实际验证与边界

全部原始输出归[本轮证据目录](../../../../output/cloud-sky-menu-audit-2026-10-11-r1)。`before/`、初始pins／git状态及每次失败原文保留。

| 责任 | 当前证据 |
| --- | --- |
| 类型 | App最终`typecheck-final-app-r3.log`、API `typecheck-final-api.log`、pipeline严格检查`typecheck-final-pipeline.log`通过。 |
| 原生返回的软件组件 | 真React18＋Taro4.2.1 renderer，受控原生PageContainer／page事件；最终7项生命周期＋2项调用者检查通过，包含Map、异常和快速hide/show。与最后Sky恢复检查合计24项见`last-ui-checks.log`。 |
| 缓存／来源兼容 | `cache-final.log`32项通过，257个无关参数请求只留一项，全部家族淘汰、克隆隔离、部分失败恢复、版本与实际HTTP来源恢复及扩展NGC入口均覆盖。此前另一组合34项日志保留，不混加计数。 |
| 文本 | `entity-execution-final.log`13项、`text-consumers-final.log`21项通过，均为本地已有输入及共同机制检查；不是239实体重试或46篇重译。 |
| 完整Mini suite | 最终广域检查1840项：1806通过／33失败／1跳过，见`miniapp-tests-final-r2.log`。33项失败与只读改前page回放的`unaffected-baseline-tests.log`名称集合完全相同；主要涉及未改owner的旧抽取依赖／既有断言。保FAILED及产品／harness待辨范围，不认证这些责任通过，也不启动无关全仓测试重构。最后仅改返回主题／时间尺样式，另以24项、完整页面及类型复核。 |
| 原完整页面 | [menu-actions r4](../../../../output/playwright/cloud-sky-menu-actions-1011-r4/result.json)：420前端实际输入，当前本机Nest真实controller／天文／静态资源，43次本机HTTP、380次Scene调用。当前Context／route保持；连续Back、日期返回父时间面板、旧ruler scroll／end／settlement不提交、播放Back取消、图层往返、手动校准Back、隐藏返回、DAY／NIGHT／OBSERVATION以及资源退休通过。公开事件受控，未认证wx物理输入；Settings导航不是实际设置页旅程。 |
| 样式核看 | [最终8状态](../../../../output/cloud-sky-menu-audit-2026-10-11-r1/style-preview-final-r2/result.json)来自同一当前Taro逻辑树／现软件天空像素及实际CI包WXSS／图标；390×844、DPR2。原生标签保留选择器，浏览器适配只用于排版和缺图检查；PageContainer不绘制、硬件安全区与WEAPP合成未验。前一适配器错误映射text/cover-image导致伪缺图／样式异常已纠正，旧输出保留。当前8状态及修改后的时间尺／红光返回已实际看图。 |
| 编译与包体 | [本地CI类候选r2](../../../../artifacts/miniapp/release/cloud-sky-menu-ci-20261011-r2.manifest.json)，284文件／4,860,311 B，指纹47866600e7c07dee6cd06184fefa1b4c65817df8d9a9ba9ffecb11fbadbcede0。main 2,096,961 B／2 MiB，仅余191 B；三条既有warning保留，实际candidate消费者3项通过。`.invalid`域名、dirty源码、ci-structural-nondeployable，不是qualified CI／OCI或部署资格。 |

最后完整运行前后frontend、backend、当前checkpoint和consumer绑定相符，原资源/surface/listener退休；该运行后仅更新文档／证据。所有实际运行的自有browser／临时API均关闭。软件图层、Canvas资源模型和构建字节不是物理GPU／进程内存或容量结论。

## 保留的失败与未闭项

1. 修前共享Back反例：真实renderer接通后的`native-back-before-r3.log`，辅助层未卸载／隐藏重入等失败保留。前两次分别为React18/根ReactDOM19不匹配与Taro宏缺失的harness失败。中间toggle对busy/Context的guard回归由6条失败发现并修复；不是全程一次通过。
2. 首plain包超限827 B；公共Back生命周期收敛后plain r2合格，最终CI仍只余191 B。图标缺包由真实编译文件读取失败发现，修后全部实际快照图片可读。一个构建命令误写slot环境变量，刷新了通用`apps/wechat-miniapp/dist/weapp-check`可再生目录；没有该目录改前副本，不能宣称它逐字节保留。命名历史包、已封存bundle、资源及未提交源码另按当前绑定核验；误写日志及通用目录保留，随后使用正确唯一slot和标准create-only bundle。
3. 官方wechatide本轮版本equal／登录有效，打开自有s0后欢迎页不证明运行；过早currentPage读取未返回，cell67终止，服务端取消UNKNOWN。正常simulator_open_page后`native-menu-r1.jpg`仍空白，console error为空，既不能证明新版页面加载，也不能判定产品与工具根因。自有窗口已关闭，确认归属的8794 API进程已停止；不重试旧SDK／z-index猜测。当前最终包未取得原生画面，原正常Canvas控件合成FAILED／UNKNOWN_PRODUCT_VS_DEVTOOLS继续保留，软件桥未采用。
4. Android／iOS手机不可用，不重复索要；真实系统Back／键盘、原生手势／姿态／合成、物理资源、对象存储/CDN/IAM/TLS/合法域名、合格CI/OCI、10/20冷暖与200DAU容量、off-host／live rollback及最终独审仍MISSING／UNVERIFIED。当前code_review能力仅能读PR CI，无本地独立审查；本轮自审不冒独审，未创建未授权子代理。
5. 图像v8／r17冻结、普通Prepared0、HiPS关闭、三个公共接入候选及全部已知视觉失败保原；无图真实显示不升级为照片覆盖。文本v74／297行、v1–v73、239未读实体／maxlag健康失败及旧例外保原。33项义务原行完整保留。

唯一PLAN与运行结果分责；当前完整绑定、原33行／资产／历史包核验见[阶段绑定](../../../../output/cloud-sky-menu-audit-2026-10-11-r1/current-binding.json)。按用户提示词，本阶段可独立修改与验证结束后交付并暂停完整Goal，不标complete；后续只由CONTINUE和用户新条件恢复。
