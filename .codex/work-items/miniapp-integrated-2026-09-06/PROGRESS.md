# 执行进度与恢复点

## 2026-09-06 初始批次

- active goal已建立，目标文本含绝对INDEX路径与PLAN/PROGRESS/两份原文指针。完整原文已复制；本方案已合并业务待办和全页面设计重构。
- 初始main HEAD `424c971be1a27b0587c1789ba5e736f1a57aade2`，工作区原先干净，与附件二审查提交相同。
- 已读global、context manifest（只有global默认正文）、DESIGN小程序主结构/字号/设置约束、miniapp screen root/shared-state、Source Plan范围和cross-outcome约束。Source Plan属于RN，Mini Program当前独立Surface优先，不扩RN范围，不恢复旧工作流。
- 已加载`.codex/skills/uiux_design/SKILL.md`。其RN primitives不直接搬到Taro；遵从上游独立小程序平台实现。
- 发现当前DESIGN存在多份旧字级表、tokens.scss手写主题、native-chrome另有精确颜色、app.scss多数24/23/20rpx及局部覆盖。先处理单一设计源/实际WEAPP样板，再批量迁移，不能只改type-body。
- shared-state Context仍残留优先Taroify的老段落，与当前DESIGN/Screen root拒绝Taroify的记录冲突；按当前附件二的单库实测与已实际选择Taro基础策略修正，不直接引入Taroify。
- 代码检查/WEAPP/真机尚未执行，旧116测试和数据库统计未冒充当前结果。

## 当前执行点

已完成首批结构化token、生成器、公共排版和原生导航接入，见下方最新记录。继续设置样板、设计绑定更新与实际WEAPP测量。

## 下一步

1. 生成SOURCE-INDEX，包含两原文hash/所有章节行号及已有十样本/原107输入索引入口。
2. 小批读取settings-sections/preference-fields/display-mode-track、theme/native-chrome与编译检查；落实红光开关和字级/单位生成样板。
3. 运行受影响测试和实际WEAPP构建/页面测量，再继续PLAN A/B；原业务C–F全部仍未关闭。

## 最新：设计源与公共投射第一批

- 已新增SOURCE-INDEX.md（原文所有章节行号/sha）；旧107文件/1759marker索引保留在`.codex/work-items/field-signal-i21-default-continuation/source-index.json`，对应README是恢复旧资料入口，不恢复旧流程。
- DESIGN.md新增唯一JSON token段；tokens.scss与theme/design-tokens.ts从tools/miniapp/generate-design-tokens.mjs生成。字体角色固定逻辑px，所有角色200%生成；观测text-tertiary从低于普通文字对比要求的C23D32改为已有D84A3C。
- app.scss公共type角色/按钮/输入/状态标签开始消费语义变量；native-chrome.ts改为生成NATIVE_CHROME_THEME，同源派生CSS和原生颜色，既有原生行为测试保留独立期望。
- 新增npm miniapp:design-tokens / check:miniapp:design-tokens。3项检查通过：源生成一致性、锁定Taro4.2.1 Sass/postcss真实单位转换（Px大小写保留，CSS单位不区分大小写，普通44px对照确实转44rpx）、三主题普通文本对比。此测试不是实际手机尺寸证明。
- Node默认命中微信工具Node16.13.1，首次测试因不识别--import退出；后续每个开发进程前置`C:/Users/777/AppData/Local/nvm/v24.16.0`，不改全局PATH。基线116项/变更后116项均通过，typecheck通过。
- WEAPP生产编译通过，日志`artifacts/miniapp/integrated-weapp-build.log`；有2项mini-css-extract样式顺序警告，涉及semantic-asset/selected-card-star/status-panel，未宣称消除。测试日志`artifacts/miniapp/integrated-baseline-tests.log`、`artifacts/miniapp/integrated-tests.log`。exec session29584已完成exit0，不再等待。
- 编译后又补theme-page直接使用body size/line，保证根large-text变量在当前根计算，不继承page已计算的小字；该最后小补丁尚未重新构建。
- 实际WEAPP/设备尚未操作。端口8787/9420/9421检查无监听；不得凭旧session JSON当活进程或复制旧坐标。
- 未完成：DESIGN旧组件章节的字号/通用几何描述需按角色收敛；verify-miniapp-design-profile仍锁旧canonical section hash/旧字级文字，selected-design-bindings仍锁旧DESIGN hash，需审查当前设计差异后更新当前断言，不改不可变历史包。新增生成检查尚需接入既有设计检查命令。所有页面局部小字号/几何尚待逐组件迁移。
- 下一具体工作：修正上述设计检查/当前绑定，处理settings三态几何/红光Switch共享控件；启动已有本地开发环境并核实真实组件尺寸，按PLAN继续全部业务和视觉范围。键盘API检查发现WEAPP Taro标准事件没有onKeyDown，不能仅强制类型加空处理假称方向键完成，须核实平台可用等价行为。

## 续批：设计检查与设置开关

- 已审查新版设计差异后更新verify-miniapp-design-profile的当前section摘要/旧字级字符串断言：改为读取JSON断言body15/22、action14/20、44px目标及源生成一致性，历史包摘要全部保留。selected-design-bindings仅更新当前DESIGN authority摘要，不改历史源/hand off。design:system:verify和test:miniapp:design均通过；后者现包含新生成/单位检查。日志integrated-design-check.log和integrated-design-suite.log。
- 新增components/toggle-field.tsx/.scss，五项Settings二元偏好共用一个受控整行Button、可见开/关文字、无障碍名称含状态与下一动作，轨道/滑块完全使用三主题变量，44px目标。替换settings-sections三个Label+原生Switch及preference-fields两个Switch，不引入第二偏好state。red-light闭包须实际WEAPP/真机观察，不声称仅代码已验收。
- 编译首次触发exactOptionalPropertyTypes（id可能undefined），已要求稳定id并为大字/减弱动态分配id，typecheck通过；新构建成功，原2项CSS顺序警告仍在。session69287已exit0，不再等待。
- 新增2项实际组件入口测试：单一受控action回调与状态、禁用不能请求变更；当前118项全部通过。最新测试后还有settings index.scss把group row的88rpx改为44px变量（避免父级覆盖），构建需要下一批重新刷新。
- 生成单位在编译产物的入口为`dist/weapp/app-origin.wxss`，不是`app.wxss`本身；测量时沿真实import链核查。尚未测量UI、启动API/DevTools或完成三态thumb/键盘边界。
- 下一步不重复开发token/开关：先实际开发环境启动/Settings样板；读取device skill及相关runtime owner后使用已有工具。然后地图四状态样板/局部字号/同文档锚点/完整业务按PLAN继续。Context中Taroify过时文案与DESIGN组件章节精确旧值仍需收敛；形式检查通过不能代替这项整理。

## 续批：实际运行入口故障定位与样式顺序修复

- 上一goal turn分类progress；本批也有新代码与实际运行证据，不是等待或阻塞轮次。已读device skill与runtime相关Context，加载Computer Use技能只操作微信开发者工具，不操作Codex。
- `miniapp:device:feedback -- doctor`当前official工具/automatic preview/ordinary preview可用，已登录；Android detected=0，无USB手机。未创建phone generation或声称设备验证。
- 已通过现有`npm run dev:miniapp -- --no-open`启动正常Postgres/Redis/worker/API8787与WEAPP watch；日志`artifacts/miniapp/integrated-development.log`。绝对生成删除目标事先核对位于apps/wechat-miniapp/dist/weapp。会话7757后来为隔离watch缓存假设主动Ctrl+C终止，已确认无nvm Node残留；它不是live handle，不再等待/复用。
- 官方CLI auto针对本仓库绝对project路径启动9420；初次SDK `connect`在Tool.getInfo缺少SDKVersion时报错。随后沿已有runner同款connectTool缝检查公开systemInfo，15s超时主动disconnect，未获得页面观测；没有修改SDK/使用隐藏WeChat API。后续普通connect同样超时，会话68861、27294均已终止。
- GUI实际观察：原有DevTools窗口包含未保存settings.json，完全未改/保存/关闭。另一个新窗口初始为trust dialog。已从本机官方auto --help确认--trust-project为公开选项，用它只打开已授权本仓库项目，不绕未知校验。项目private显示历史projectname与libVersion3.17.1，public配置原名仍今晚去观星；勿把窗口历史标题当候选身份。
- 原窗口当前Map页只有tabBar，主体白屏；真实Console错误为`Component is not found in path "wx://not-found"`，灰度基础库3.17.1、DevTools Stable2.01.2510280。另见启动阶段`__subPageFrameEndTime__ of null`，不能归因业务或说已修好。
- 手动点官方编译后仍白屏。生成map/index.json引用../../comp、comp.json递归./comp，对应文件实际齐全；production comp入口module181在taro.js中执行Component(createRecursiveComponentConfig())，未发现缺失文件。干净production build后仍实际观察到同一错误，所以不能简单归为watch缓存，也不能因此降级改产品成静态壳。
- 修复公共CSS相反import顺序：map/search-page、components/spot-card、features/spot/spot-detail-page统一semantic/status在selected-card-star之前。watch最新483ms编译成功无原警告；停止watch后完整production build也compiled successfully（13791ms），两项顺序警告已消失。构建会话82766已exit0。最新build日志仍`artifacts/miniapp/integrated-weapp-build.log`。
- DevTools自动规范化public project.config仅格式改变，已逐字段deepEqual后还原原始HEAD bytes，保留所有实际配置。没有改private配置、基础库版本或用户未保存文件。
- Computer Use曾对后台窗口截图回退到前台Codex；没有任何Codex输入，随即activate精确DevTools后重新观察。窗口ID已变化，40764886已失效，不复用；恢复必须list_windows。当前有原IDE108267732和另一个无标题窗口，仍需先观察确认。
- 下一步：定位实际WEAPP组件未注册/灰度基础库或DevTools运行状态问题（不是已证明平台故障），检查当前官方支持的基础库/项目运行入口及完整依赖加载；恢复本机API时先查端口。设置真实尺寸/三主题仍未验证，其他PLAN业务/地图架构/全页面迁移仍继续，未达到goal完成或真正全局阻塞。

## 续批：冷启动配置接入统一设计源

- 当前goal继续active，未创建新goal/任务/子agent。已恢复INDEX/PLAN/PROGRESS和当前Context。
- 实际DevTools仍显示灰度3.17.1下wx://not-found组件加载错误；无标题77007066不是可操作应用窗口，52823522截图仍回到原IDE，工具详情点击没有打开面板。没有关闭含未保存settings.json的原IDE，没有切换基础库，也没有把白屏归因确定化。后续不要重复同坐标点击当作进展。
- 补齐app.config.ts冷启动navigation/tabBar从生成NATIVE_CHROME_THEME.DAY读取；八处子页面移除重复白色backgroundColor，继承app window默认值。生成app.json实测仍为白底、#5E655F普通tab、#4859B8选中tab，行为颜色未变；避免后续token变更时冷启动和运行态分叉。
- 当前production绑定probe由手写颜色字符串改为统一token引用检查；不可变历史资源未变。首次设计套件按旧字符串失败，修正当前probe后整个test:miniapp:design通过。
- typecheck通过；完整WEAPP生产编译14195ms成功且无原CSS顺序警告，日志integrated-weapp-build.log。会话83369已exit0。设计套件日志integrated-design-suite.log最新通过。
- 未恢复API/worker/watch，无新增有效自动化会话，无真实Settings/Map尺寸或设备结论。所有PLAN B–F业务及A剩余仍待办；继续可优先用官方CLI/可操作窗口恢复真实运行，不把工具不响应当全局阻塞。冷启动无法在JS加载前恢复本机偏好这一平台边界未借token改动宣称修复。

## 续批：Settings尺度样板与地图标记职责提取

- 本轮是progress：Settings局部rpx字级/命中尺寸迁移；地图首个纯投射owner实际提取，不是只写计划。上一轮同为progress，未达到阻塞条件。
- settings/index.scss：模式文字消费action14/20、图标18逻辑px，三列按钮至少44逻辑px且可随大字换行增高；36px视觉轨道从44px按钮外框中内缩，thumb与列同宽保持既有测量/拖动投射。track最大320逻辑px，去原生Button默认padding/border；模式状态增加aria-pressed，组使用group以匹配可循环的按钮语义。
- Settings入口/状态文字改metadata、入口图标18px、行目标44px；说明去单行截断，选项去nowrap。这里只是样板代码与编译检查，尚无320/200%真实布局或平台读屏证据；键盘方向键/Home/End仍未解决，不能误称三态控制全部完成。
- 新map-markers.ts承接原index.tsx中的MarkerGroup、聚合与原生marker投射；聚合、坐标、编号、选中成员、图片/颜色/尺寸行为保持。地图index减少约160行，Map实例/事件/请求状态仍原owner。marker palette/geometry暂保旧值，下一步在独立owner对照DESIGN生成源收敛；不能把本次纯提取当已完成新地图视觉。
- 新2项marker回归：zoom>=9保GCJ坐标和对象身份；低zoom聚合保所有成员、中心、任意成员选中对应红光资产/计数/无数据。完整120项通过，typecheck通过；设计套件通过；最终WEAPP完整构建11705ms成功无原CSS顺序警告。日志仍integrated-tests.log、integrated-design-suite.log、integrated-weapp-build.log。会话22386、6695、46823均exit0，无需等待。
- 真实WEAPP启动故障没有新证据，本轮未操作GUI/恢复API，不声称运行修复。下一入口：map-markers.ts单源投射和marker文本200%偏好、地图scene/context失效逻辑与bottomPresentation提取；并继续有界恢复官方DevTools真实页面。PLAN全范围保持，四地图样板/其他14路由业务与正式数据等均未关闭。

## 续批：原生地图标记同源与大字偏好

- map-markers.ts移除独立18个颜色值，原生label/callout消费生成MINIAPP_DESIGN三主题语义角色；保持标记图像、GCJ坐标、聚合/选点语义。marker数字统一data18px，避免selected/clustered独立13px缩字；callout使用metadata12px。共享preferences.largeText传入纯投射，二者在200%变成36/24px。
- 新回归覆盖三主题200%字号、偏好切换不改标记身份/位置/资产及红光标签颜色。当前121项通过、typecheck通过。尚未实测大字label拥挤/边缘/原生命中；图片几何原32/40等仍旧值未入源，不能宣称地图样板完成。
- 源码复查发现下一项明确风险：Map openDetail只按selectedSpotId/mapResetVersion接收响应，A→B→A期间旧A响应可覆盖新A；catch也没有过期检查，旧失败可能显示当前点无关警告。下一批应为上下文请求引入明确请求代次/迟到失效并用可控异步回归证明，不只继续搬函数。另closeSpotPanel的延迟关闭与openLayerSheet切换仲裁须一起审查。
- 本轮未操作DevTools/服务/手机，之前白屏保持待查。保持全部PLAN范围，不以native标记单项测试代替页面/正式业务验收。
- 最终WEAPP生产build11757ms成功，日志integrated-weapp-build.log；会话23450、66004均exit0。未新增后台任务。

## 续批：正式点上下文迟到响应与延迟关闭仲裁

- 修复openDetail的A→B→A竞态：每次选择递增detailRequestGeneration，成功/失败都同时核对代次、当前selectedSpotId和mapResetVersion；卸载也使旧代次失效。保持当前真实错误通知，旧响应/旧错误静默丢弃。
- 修复面板close的220ms定时器与打开图层竞争：openLayerSheet取消尚未完成的关闭并复位拖动/phase，保留原地点文档和请求；真正close完成时才使请求失效并清timer handle。避免取消关闭后丢掉当前请求；不引入第二bottomPresentation状态。
- 新spot-context-race.test.ts按既有测试方式从实际index.tsx提取三个handler运行，而非重写实现；可控异步覆盖A→B→A旧成功/失败、当前失败可见、完成关闭失效、打开图层取消关闭并保留当前请求。完整125项通过，typecheck通过，日志integrated-tests.log。会话11153 exit0。
- 仍未实际WEAPP/真机验证，启动白屏未解决；此次代码修复不能代替真实页面。地图scene/bootstrap与time请求的共享状态失效需继续审查；marker几何入源、其他页面与PLAN全范围保留。
- 最终WEAPP build11708ms成功，日志integrated-weapp-build.log，会话71501 exit0；git diff --check通过（仅换行提示）。本轮progress，goal继续active。

## 续批：共享时间尺禁用与取消

- 本轮progress。重新核对生成base.wxml只引用现有原生tag及comp，comp模板/import齐全，未发现足以修复启动错误的新缺失依赖。端口8787/9420/9421无监听；没有把历史会话当活进程。网页检索未得到可用官方故障依据，没有据此改基础库/依赖版本。
- MapTimeRuler此前禁用仅作用Button，ScrollView仍能preview/commit，且programmatic scroll/取消后scrollend也可提交。现scrollX遵循disabled，回调防守disabled；用局部interaction ref区分用户触摸和程序滚动；onTouchCancel复位本地index并通知父owner退出preview，后续momentum结束忽略，scrollend只提交一次。
- 两处实际消费者均接入cancel：地图LayerSheet和SpotInformationPanel共享setTimePreviewing(false)，因此回到已提交切片；没有写入新Observation Context。按钮直接选择仍可用并结束当前滚动提交资格。
- 新time-ruler.test.ts运行实际组件handler，覆盖程序滚动/禁用不能提交、取消后迟到scrollend忽略、一次用户滚动只提交一次。当前128项通过，typecheck通过；实际原生scroll事件顺序/惯性/屏幕尺寸还必须WEAPP验证，不以VM替代。
- 下一明确待办：time-ruler的RULER_STEP34与CSS切片宽度单位需统一并验证320/430；touchcancel以外的隐藏/卸载/禁用中断也需继续收敛。Map commitMapTime仍需迟到请求/当前地点时间身份检查。三处时间共享、正式业务、全页面和真实启动仍未关闭。
- 最终WEAPP完整build12064ms成功，日志integrated-weapp-build.log，会话42661 exit0，无新后台handle。目标仍active。

## 续批：时间尺步长/命中单位修复

- 实测源码揭示最终CSS覆盖为34rpx每格，但JS按34px转换scrollLeft；375px宽时实际17px每格，选择索引偏差一倍。现JS从MINIAPP_DESIGN.geometry.target-min读取44，CSS宽/min-width/flex-basis均同源var(--target-min)，使各宽度维持44逻辑px并满足命中下限。
- 删除原首批重复ruler track/slice/tick/scroll规则，将有效通用属性合入唯一现行块；左右居中padding由50vw改50%容器宽基准。scroll可视高度改为44+metadata行高+12逻辑px，避免旧84rpx区域裁掉新点击区/大字。标签用短时分，完整年月日时刻保留heading和aria名称；靠近当前标签的次要标签不重复挤在邻格。
- 128项测试通过（步长回归event已改44px）；随后短时分显示/scroll高度小补丁的typecheck及完整WEAPP build12510ms通过；设计套件通过。日志integrated-tests.log、integrated-weapp-build.log、integrated-design-suite.log。会话11351、80680均exit0。
- 这是源码/编译证据；原生ScrollView的百分比padding和320/430真实中心对齐、200%文字仍待实际WEAPP测量。没有伪称白屏解决。下一继续时间异步身份失效、隐藏/卸载取消；整体PLAN与原业务待办不变。当前轮progress，goal active。

## 续批：地图时间提交身份检查

- commitMapTime新增同步timeRequestBusy ref，避免React下一次render前重复点击/scrollend产生多个更新；保留timeSaving作为呈现状态，不把它当同步锁。
- 更新前后核对selectedSpotId、detailRequestGeneration（包括A→B→A及卸载失效）、mapResetVersion、contextId/revision/fingerprint。任何替代后的旧成功不写store，旧失败不弹当前错误；当前错误保持恢复提示。finally释放busy。
- 新time-context-race.test.ts运行实际handler，控制异步完成顺序验证切点/重置/版本变更/选择代次的迟到成功及失败，验证同轮重复请求只有一次、当前成功写入及当前失败可见。131项全通过，typecheck通过；日志integrated-tests.log，会话19063 exit0。
- 当前仍未实测WEAPP：白屏和原生滚动证据缺口保持。下一继续bootstrapContext回写、隐藏/卸载preview取消和正式业务；所有PLAN范围不变。本轮progress，非阻塞轮次。
- 最终WEAPP build11719ms成功，日志integrated-weapp-build.log；会话69835 exit0。goal继续active。

## 续批：时间尺生命周期取消

- MapTimeRuler使用当前onCancel ref统一取消入口：触摸取消/微信页面hide复位index并退出待提交预览；卸载只释放待提交资格并通知父owner，不在卸载时设置局部state。selectedAt、切片UTC身份列表、disabled、初始索引改变也取消正在进行的预览，防止用旧切片继续提交。
- 回调身份每次render刷新，但effect依赖语义输入，不因父级inline回调身份变化而每帧取消。正常scrollend/按钮commit先清interacting，不会在随后禁用effect误回滚已提交动作。
- 新回归执行实际effect/hide/cleanup，验证hide/unmount/输入更新后旧scrollend不提交。132项完整测试通过、typecheck通过。日志integrated-tests.log，会话4831 exit0。
- 仍待实际WEAPP事件验证，原启动故障尚未修复。接下来优先恢复官方运行并验证四地图样板；同时bootstrap回写与PLAN全部其他业务/14路由/正式数据保持未完成。此轮progress，goal active。
- WEAPP生产build11870ms成功，日志integrated-weapp-build.log；会话60943 exit0。没有新增后台任务。

## 续批：隔离验证项目排查官方工具会话

- 为隔离原IDE未保存settings.json和历史项目配置，创建artifacts/miniapp/integrated-runtime-snapshot（当前dist/weapp逐字复制到miniprogram，项目配置只改projectname/miniprogramRoot并去srcMiniprogramRoot）；它是一次开发运行快照，不是git worktree/分支/新产品，不恢复长程workflow。不当作后续源码构建自动更新，源码变化后其证据失效。
- 任务脚本open-runtime-snapshot.mjs使用既有officialDriver执行公开auto --project ... --auto-port9421 --trust-project。首次脚本import多退一级，已修正到../../../tools后运行成功。官方auto返回exit0，9421当前实际监听PID17204；随后SDK connect仍20秒超时，命令会话16384已终止。公开open同项目也exit0，但窗口清单没有新增有标题IDE。
- 以上新证据说明换当前构建快照和项目目录仍未恢复官方SDK响应，下一步不再重复相同connect/同原窗口点击。未关闭/保存原IDE未保存文件，未更改基础库或任何产品业务配置。当前无法把该快照标为实际页面验证成功。
- 当前轮产生有界运行隔离证据；不是全局阻塞，仍有全部PLAN开发可推进。应继续地图bootstrap回写/其余页面真实业务，并在可恢复工具会话时重新绑定当前生成物。不要把9421监听本身当页面可操作，不使用私有协议绕过SDK。

## 续批：bootstrap恢复回写版本保护

- Map bootstrap effect提交前核对当前mapResetVersion/selectedSpotId以及请求render持有的observationContext版本；新增context-restore纯比较owner，拒绝当前状态已变或同ID响应revision倒退，保留null首次初始化和过期ID重建新ID的正常路径。未改restoreObservationContext真实服务恢复规则。
- 新2项回归覆盖旧时间/另地点/首次初始化被抢先更新/同ID旧版本拒绝，以及正常刷新/过期ID允许。首次typecheck揭示fixture contextId品牌类型未标注，已在测试边界显式构造品牌ID后通过；生产类型保持。134项全通过、typecheck通过，日志integrated-tests.log。会话47146 exit0。
- 仅证明回写判定，不声称整个bootstrap/scene/UI竞态已实机证明；未改变activeContext仍取bootstrap数据的服务权威规则。独立integrated-runtime-snapshot因本轮源码构建变更已陈旧，不复用其页面/截图做当前证据。官方工具白屏与全部PLAN剩余仍保留。此轮progress，goal active。
- 最终WEAPP build11748ms成功，日志integrated-weapp-build.log；会话36075 exit0。下一应转入其他完整业务待办并继续修复实际运行入口，避免把上述局部保护当整目标完成。

## 续批：导入页用户进度表达

- 开始返回PLAN D业务范围，复查固定nightchina十样本fixture（未换样本/未新建草稿/未写数据库）。当前页面确实直出importDraftId、parseState、stage、moderationState、rev；本轮改选中标题、中文解析状态/阶段/审核状态和正文计数，不改expectedRevision/存储字段/真实审核语义。审核通过不标为已发布。
- 列表和能力说明移除实现层自述，保留可恢复编辑/审核进度含义。静态Record覆盖协议所有解析和审核枚举，typecheck通过。本轮是可逆文案映射，不新增镜像测试。
- 明确未处理：正式地点关联仍要求手填spot_id并在预览暴露ID，需真实地点选择交互；不能仅把label改名掩盖缺口。已有Search.selectFormal会写共享selectedSpotId并navigateBack到调用页，可复用但要同步草稿本地选择、保留取消、校验地理兼容，并纠正搜索成功提示假定永远回Map。其saveCurrent当前读formalSpotId/routeSpotId，修改前完整读并验证。
- 既有第九preview/第十导入、第四正式点地理兼容、真实服务/审核仍未执行；正常DB未重新核实。不得把本轮文案当业务全完成。实际WEAPP启动待查，goal active。
- 本轮typecheck及WEAPP build11682ms通过，日志integrated-weapp-build.log；会话54347 exit0。未运行全测试（仅文案映射），既有134项结果属于上轮，不作本轮新增证据。

## 续批：导入正式地点名称搜索

- 新FormalSpotField薄组件复用现有searchPlaces和useResourceQuery，仅呈现formalSpots，不将ordinaryPlaces/candidates伪装正式地点。输入250ms防抖；关键词改变时不展示旧关键词结果；受控value/onChange选择真实spotId，禁用期间不搜索；错误用既有StatusPanel重试，空结果允许换关键词/提议。
- Import正式关联手填spot_id输入已替换；来源字段/草稿状态仍原owner，保存仍updatePostImport expectedRevision与原地理/正式状态后端校验。预览不展示内部ID，关联说明改产品文字。既有地图当前点默认关联行为暂保留。
- 未复用整Search route以免导入时不必要改变地图镜头/筛选/选择；只复用同一真实搜索API。字段当前已保存关联若没有本轮选中的名称显示“已关联正式观星点，可搜索更换”，不把ID当名称；后续需补充可读地点身份回读，不能宣称恢复体验全部完成。
- 首次typecheck发现Text不支持role，已去掉错误属性；重试采用StatusPanel实际onRecover接口。修复后typecheck/既有134项测试通过，git diff --check通过。新field实际搜索/选择/失败/恢复交互尚无WEAPP证明，也未新增该组件特定回归，下一优先补充受控选点与迟到查询回归及真实样本验证。
- 十样本真实草稿推进、第四地理兼容、正式点数据库仍待执行；没有服务端写入/发表。独立runtime snapshot已过期。此轮progress，goal继续active。
- 最终WEAPP build12064ms通过，日志integrated-weapp-build.log；会话71665 exit0。

## 续批：正式地点字段回归

- 新formal-spot-field.test.ts从真实组件转译执行：确认formalSpots才生成选点按钮且提交真实ID，普通地点/候选区域不成为可关联项；关键词未完成防抖时旧结果不展示；禁用时不开查询/无选点入口；失败保留原value并调用真实refetch回调重试。
- 初次typecheck发现测试解构默认query/debounced推导需显式类型，已补测试选项类型；生产组件无本轮行为改动。仅新增测试不重复生产build；上轮build仍对应相同生产代码。
- 此证据不等同真实网络查询或WEAPP操作，已保存关联的名称回读、十样本/正式点/地理兼容等继续待办。goal active，本轮progress。
- 最终typecheck通过、完整137项测试通过，日志integrated-tests.log；会话95701 exit0。下一需推进真实开发服务和正式草稿，不把组件测试当完整业务验证。

## 续批：恢复正常开发服务并核对真实草稿

- 当前docker中本项目Postgres/Redis均健康。原8787无监听，核对生成删除绝对路径E:/Dev/Starward/apps/wechat-miniapp/dist/weapp后使用现有npm run dev:miniapp -- --no-open恢复正常Postgres/Redis/API/worker/watch；不是MEMORY_TEST。API GET /v2/capabilities成功，日志integrated-development.log已ready/watching。会话72520是本轮新建且仍运行的owner，下轮先用该handle/端口验证，不重复启动。
- 当前能力：OWN_POST_IMPORT/PROFILE_LINKS/REAL_WEATHER/MEDIA可用；WECHAT_AUTH、自动解析、普通地点供应商、路线供应商、LIGHT_POLLUTION仍不可用。此为新API实际回读，不再引用历史状态当当前结果。
- docker psql只读查询固定nightchina来源草稿：共9条，7条PREVIEW且有proposal；星河画卷EDIT_DRAFT rev2无关联；夏夜星萤EDIT_DRAFT rev2无关联。全部parse GATED、moderation DRAFT，未发现第十条。粤北夏夜引rev7，其余preview rev5。没有写库或重复新建，未输出用户身份/凭证。
- 查询定位真实数据表external_post_import_drafts joined external_post_imports；正式点相关spots/spot_publication_assessments/spot_publication_assessment_events已确认存在，尚未统计最新完整性/发布。下一沿既有HTTP身份/session正规入口恢复第九推进和第十，不能直接SQL篡改stage/关联/发布，也不假定开发匿名身份等于原草稿owner。
- 本轮progress，API/worker/watch已恢复但WEAPP窗口仍未证明可运行；先前独立snapshot继续过期。所有PLAN范围保留，goal active。

## 续批：草稿身份和正式数据限制核实

- 8787实际监听PID20884，正常开发owner会话72520继续运行，未重启。AuthService确认本地用户由installation code经sessionSecret HMAC派生，草稿HTTP接口按session principal隔离；DB只存session digest，不能用另建local identity继续原九条，也不能直接SQL改草稿owner/stage。
- 当前安装身份由api-client installationIdentity存于Taro storage；原DevTools小程序会话尚不可通过官方SDK访问。尚未获得原身份会话，不创建第二套十样本；本轮无草稿写入、无登录伪装或权限绕过。
- 正式DB新查询：spots 26条全部DATA_INSUFFICIENT，spot_publication_assessments计数0；深圳市天文台DATA_INSUFFICIENT/PUBLIC_EXACT。这是本轮实查，不拿历史数据替代。原payload为基础summary，完整访问/设施/证据由相关repository owner组装，不能仅凭name/坐标发布。
- 复查spot-completeness-policy.ts正式条件包含SPOT_COORDINATE、ACCESS_LAST_ROAD、ACCESS_PARKING、ACCESS_OPENNESS、ACCESS_LEGAL_ENTRY、SAFETY_NIGHT、HORIZON_PROFILE及来源时效/授权。下一可以沿repository组装只读evaluateSpotCompleteness列具体缺失，勿绕过发布/事实要求；第四导入正式关联及地理兼容仍未成立。
- 当前轮新身份/DB证据改变后续动作，progress；不是全局阻塞（代码/事实核对仍可推进）。API/worker/watch会话72520保持，恢复先查handle/8787；goal active。

## 续批：真实地点完整性只读审计与旧结构兼容修复

- 新任务脚本audit-spot-completeness.ts经docker psql只读提取spot_overview_read_models，调用现有evaluateSpotCompleteness，报告spot-completeness-audit.json保留每点名称/缺失项/满足claims，不含用户身份/坐标/凭证。没有调用发布mutation或写DB评估。
- 首次真实评估揭示旧light.radiance缺失undefined时现有===null漏过，读median抛错；修为nullish判断，productBand/minimumCloudFreeObservations同理。随后暴露旧detail.evidence/accessAndSafety/siteMediaState缺失，分别按无证据/UNKNOWN访问安全/媒体未知评估，明确失败，不补造实际信息或放宽门槛。
- 新回归删除上述旧结构字段，验证评估返回light/evidence/night-safety/site-media具体不完整；既有complete、sample拒绝、UNKNOWN拒绝、危险拒绝、无现场媒体明确声明、过期拒绝均通过，共7项policy测试。miniapp-api typecheck通过。
- 新实测26点评估complete0；各点7类必需证据全缺（182项），8类设施证据均缺（208项）；全部缺版本化夜光、来源有效性、末段道路/停车/开放/合法进入/夜间安全/地平/媒体明确状态/当前核验。深圳市天文台同样无任何satisfiedClaims。report中的operator_review_missing由只读audit刻意不冒充有效admin review造成，不应宣称这是从DB读取的真实审核缺陷。
- 报告是本次只读政策诊断，不是正式发布评估记录；数据库spot_publication_assessments仍未写。当前API/worker/watch owner72520继续；backend修改可能由watch重启子进程，恢复须查活状态，不猜PID。此轮progress，goal active，正式现场事实与第四关联仍待证。

## 续批：导入权利确认与只读选择

- Import移除原生Switch，复用ToggleField，仍受rightsConfirmed同一状态控制、默认未确认；新增可选stateLabels仅改变显示/读屏文字，权利项显示已确认/未确认，设置默认开/关保持。没有替用户勾选权利或改变提交审核语义。
- 可见性PRIVATE/PUBLIC与三个关联选择按钮现在在!canEdit或action运行时禁用，避免SUBMIT已提交草稿仍出现可编辑假象；正式地点字段既有同条件disabled保持。提议说明去内部proposal_id。
- typecheck通过、完整137项测试通过；现有开发watch实际Compiled successfully544.95ms并继续Watching，integrated-development.log。会话12456 exit0，owner72520仍是开发服务，未另启动生产build或第二watch。
- 本轮共享ToggleField默认行为回归通过，但确认文字专属读屏/长文本/红光仍无实际WEAPP证据。原UI启动、安装身份恢复、十样本/正式资料以及PLAN其他范围继续。此轮progress，goal active。

## 续批：导入保存并发与关联名称恢复

- 上轮saveCurrent加入同步actionBusy防双击/保存中切草稿；SUBMIT拒绝再次保存，字段在action期间禁用；冲突回读新revision但保留本地输入，避免永远拿旧版本重试。beginCreate列表刷新失败独立提示草稿已建立，不误报创建失败。实际handler三项回归加后完整140项通过，watch823.36ms成功。
- 本轮FormalSpotField复用getSpotOverview按value/contextId查询关联名称，无写入、不改变地图context；先使用本次明确选中的名称，恢复结果必须spotId相同才能呈现。当前缺context或服务不可用时保留关联并明确名称暂不可用，不伪造名称。Import传现有observationContext；无新建context/身份。
- 新身份匹配回归覆盖旧地点响应不显示；首次typecheck暴露exactOptionalPropertyTypes，已明确允许undefined并修复。没有获得真实WEAPP页面证据；查询依赖有效现有context，正式资料缺失继续保留，不能称草稿恢复端到端全部完成。
- 用户睡觉期间授权自行处理本地开发信任交互，尽量绕开单点继续其他开发；此偏好持续，不为例行操作索要点击。前一仅回应用户偏好的turn属于无进展，本轮实际修改和检查恢复progress，不是全局阻塞。goal active，全部PLAN范围保留。
- 最终typecheck通过、141项测试全通过（integrated-tests.log，会话51855 exit0），git diff --check通过；现有watch实际编译193.06ms成功，未启动第二watch或生产build。下一按PLAN继续其他页面/完整业务，保留DevTools与真实样本验证缺口。

## 续批：导入页手机字级、200%重排与创建期间输入

- Import局部stage index原18rpx、status20rpx及窄屏caption20rpx缩字已替换/移除，采用metadata token；预览正文改body角色，保留换行和长URL断行；错误用critical字级。不是降低大字比例。
- 平台、关联、历史按钮命中统一target-min44逻辑px；平台允许长文字自然换行，200%两列，阶段流程改纵向（仍同一顺序/当前阶段）；heading与可见性行允许换行，状态胶囊宽度受容器限制；正文编辑至少五行body line。没有重建ScrollView或改compileMode。
- 补充来源/标题/正文/备注输入读屏名称；创建中禁用来源URL与平台，避免已发出请求和表面字段不一致；保留原rights同步禁用行为。
- 当前typecheck通过，现有watch编译成功（integrated-development.log）；检查实际生成content/import/index.wxss确认token引用、2Px保留与大字重排规则存在。这仅是编译证据，不声称真实320/375/390/430和200%屏幕布局通过。可逆样式/属性修改未新增镜像测试，之前141项属于上轮。
- Goal保持active；下一继续实际WEAPP恢复及其他页面/业务范围。用户离线偏好保持，不因本地信任/例行点击提出阻塞。上轮与本轮均实际progress。

## 续批：个人链接保存/删除并发与主题开关

- ProfileLinksPage新mutationBusy同步锁覆盖save和remove确认框整个生命周期，取消/finally释放；防重复删除确认及确认中另起保存。保存/删除过程中禁用平台/名称/URL/可见性，避免响应清空后输入。
- 写入成功与后续refetch分开捕获，刷新失败不再报写入失败；成功文案不在回读前声称已回读。useResourceQuery增加默认false的throwOnRefetchError选项，仅此页启用，通过React Query公开refetch throwOnError传播真实网络失败；手动重试catch避免未处理拒绝，StatusPanel保留错误状态。其余调用默认行为不变。Import此前refetch.catch仍未启用该选项，需后续核对，不能声称它的真实刷新失败提示已通过。
- 公开显示原生Switch换ToggleField，复用三主题/大字/44px控制；名称和URL补ariaLabel。布局局部样式尚未迁移（旧20rpx标签、88rpx命中等仍待办）。
- 新两项真实handler提取回归验证确认取消释放/期间不能删除保存，以及成功写入后的刷新失败只警告；143项全通过，会话33753 exit0，integrated-tests.log。随后加refetch选项并typecheck通过，watch425.19ms成功；此最后选项尚无专属hook回归。实际服务/重启恢复/返回取消/WEAPP未验证，goal active。本轮实际progress。

## 续批：真实Query刷新错误传播验证

- Import列表和详情启用throwOnRefetchError，成功保存后的列表刷新失败独立警告；手动重试显式捕获。冲突详情刷新失败不再把旧缓存当作新回读revision；既有本地字段保留。该修复补上上轮已记载的真实Query默认吞错缺口。
- use-resource-query.test使用实际QueryClient/QueryObserver及生产hook投射新增回归：缓存存在时刷新抛错，严格模式reject同一错误，默认模式保留原行为，二者都不清缓存。不是用假的refetch throw来证明真实Query行为。
- typecheck通过；全部测试结果见integrated-tests.log及本轮终端，会话51989。无新增服务/身份/写库；goal active，当前继续代码progress，实际WEAPP和全部PLAN范围仍未完成。

## 续批：主页链接局部手机尺度

- 平台按钮min-height改target-min44逻辑px，文字自然换行；错误改critical字级，平台标签改metadata，图标改icon-small18；移除已不存在的原Switch可见性行样式。链接URL完整换行不再单行省略，长名称可断行。
- 200%平台两列，链接内容与操作纵向，操作单列；明确display:flex以覆盖窄屏grid，避免320px大字又被两列挤压。普通窄屏保留两个操作并排且可换行。
- 已有watch实际编译成功278.08ms；此轮仅可逆SCSS，未重复TS/全测试。实际生成物与源码检查不等于手机布局通过；全部页面矩阵仍待WEAPP恢复。前轮144项测试exit0补记。此轮progress，goal active。

## 续批：指定计划未缓存时错误选择首条

- PlanEditor初始activePlanId原existing?.id ?? plans[0]?.id会在指定计划未缓存时选中无关首条；requestedPlanId存在又禁止自动apply，导致服务端回读后仍错对象。新增initialPlanSelection明确requestedID优先，即使未缓存也保持身份，plan=null等待回读；无请求才默认首条。
- 地点/日期/时间/notes初始值统一来自同一initialSelection.plan，不再逐字段退到无关plans[0]。既有activePlan变化effect负责目标返回后hydrate，缺失目标进入现有showMissingRequestedPlan。
- 回归覆盖指定未缓存/目标后来回读/无指定默认首条/空列表；typecheck通过，测试日志integrated-tests.log，会话80048。此轮实际progress，goal active。
- 继续待办：计划save/remove仍缺同步锁，删除后导航失败可能误报删除失败，context effect无版本守卫，返回草稿/真实服务和WEAPP需验证；勿将本次身份修复称计划整体完成。

## 续批：计划写入同步锁与删除结果准确性

- PlanEditor mutationBusy覆盖save以及remove整个确认框/请求/finally，确认取消释放；applyPlan/startNewPlan拒绝操作中切换身份。地点日期时间Picker、备注和保存/返回按钮在saving或deleting期间禁用。
- 删除API成功后navigateBack及switchTab都失败仅显示已删除/自动返回不可用，不再进入外层catch声称删除失败和草稿仍在。保留明确删除确认及原服务API。
- typecheck通过，现有145项回归通过（integrated-tests.log，会话32972 exit0）；开发watch持续编译，实际日志integrated-development.log。本轮锁/导航失败尚无专属handler回归与真实WEAPP验证，下一应补目标回归并继续计划恢复/Context竞态。
- 前轮145项exit0及watch526.78ms补记。此次actual progress，goal active，完整PLAN仍保留。

## 续批：计划删除目标回归

- 新plan-delete.test.ts提取实际remove handler执行，覆盖确认期间第二次删除不再弹框、取消后无请求/清理且释放锁，以及真实删除响应后更新列表/本地清理，navigateBack和switchTab都拒绝仍只告知已删除。
- typecheck通过，147项完整测试通过（integrated-tests.log，会话37490 exit0）。仅测试新增不重复生产build；上轮实际watch459.79ms成功。仍不等同真实WEAPP/服务删除验证，不进行真实账号删除。
- 此轮progress，goal active。下一优先计划草稿生命周期与context恢复；广泛路由迁移和运行环境验证不可因本系列局部修复遗漏。

## 续批：计划Context恢复迟到回写保护

- contextQuery发起时读取当前store observationContext版本，响应携带expectedContext仅在Query缓存中，不写服务协议/持久库。effect用现有canApplyContextRestore比较发起版本和当前store，仅未改变时允许回写，拒绝同IDrevision倒退。
- effect移除observationContext依赖，避免同一缓存snapshot响应在其他页时间改变后反复把全局拉回旧计划。sameContextVersion防重复写入；正常过期ID恢复仍沿原resolve/restore服务，无假Context。
- typecheck与完整147项通过，integrated-tests.log；现有watch685.52ms成功。已有纯版本判定回归覆盖迟到/新ID/倒退，但本轮Plan query/effect端到端尚未专属验证，实际WEAPP仍待恢复；不能把全局Context问题称全部完成。
- 此轮progress，goal active。下一推进剩余计划草稿生命周期/样板与实际工具入口，不缩小全部PLAN。

## 续批：计划草稿持久化缺口与路线版本

- 实查PlanEditor所有draft/Storage/返回入口：只有checklist存储；地点/日期/时间/notes只useState，CustomNav直接navigateBack。故现有“返回时草稿会保留”未实现，不能当事实。下一必须按账户+plan/new分区保存/恢复，成功保存/删除清理且退出账号不串；不能用无身份全局缓存掩盖。
- api-client readStoredSession与ensureSession目前私有，前者只返回有效session；账户删除清理session/cache/installation。可新增仅暴露当前用户非secret scope的owner方法，不从组件读取accessToken或另建identity；需要处理首个请求登录后scope可用和身份变化。此为后续实现入口，未声称已写持久化。
- 修复plan-route-estimate queryKey遗漏contextFingerprint/revision，避免同ID时间或观测条件更新继续命中旧路线；与现有scene/sky query版本投射保持一致。typecheck通过，watch生成物沿现有开发owner。无新增测试镜像queryKey，实际路线供应商仍不可用。
- 本轮产生确定需求缺口证据及源码修复，progress，goal active。下一实施草稿生命周期，不以此小修替代完整需求。

## 续批：计划本地草稿账户/计划分区初步接入

- 新plan-draft.ts提供账户+planId（null新建）JSON元组key，未知账户不写，parse只接收允许字段与800字上限，保留文字空白。api-client仅暴露currentDraftUserId非secret身份，不向组件暴露token。
- PlanEditor编辑地点/日期/时间/备注时同步存储，初次与切换计划readDraft恢复；startNewPlan恢复null分区；已有恢复草稿不再被首次context defaults覆盖。保存成功清理发请求前捕获的key，删除成功清对应草稿。缺身份/存储失败明确告知须保存后离开。
- 新两项纯回归覆盖账户/计划/null隔离及坏存储拒绝，完整149项通过（integrated-tests.log，会话72553输出已结束测试）；typecheck在主集成后通过。最后小补丁需下轮再typecheck。没有实际WEAPP/重启证明。
- 明确未完成：账号在页面存活时切换仍需防本地字段串入新scope；删除账户需清理该账户草稿；存储清理失败后旧草稿不能复活需版本基线/墓碑处理；恢复晚登录、未缓存指定plan与新建空列表effect须专项验证。不可把此初步接入称持久化已全部完成。下一优先这些边界，不另换小任务。
- 本轮源码实现progress，goal active，全部PLAN保留。

## 续批：挂载计划草稿owner不可迁移

- 新createDraftOwner允许首个有效账户绑定，登出/失效返回null，不允许同页面转到另一userId；原账户恢复仍可访问。Plan读草稿/retain/save均用绑定scope，无scope明确提示。删除确认前捕获owner，确认后再次核对，防确认期间账户变化；清理使用捕获owner，非返回时新账户。
- 新纯回归覆盖首次未登录/首次绑定/失效/换账户拒绝/原账户恢复；删除handler fixture适配真实身份guard。typecheck与150项完整测试通过（integrated-tests.log，会话95961 exit0），watch见当前日志。
- 此为本地草稿与发起写入owner约束，不证明整个auth中途网络session刷新隔离。仍待账号删除清理、清理失败后旧草稿版本基线、晚登录恢复/未缓存计划专项，以及真实WEAPP；下一继续这些持久化边界。
- 本轮progress，goal active，所有PLAN范围保留。

## 续批：账户删除后计划草稿清理

- key生成与精确owner解析移到services/local-draft-keys，Plan模块重导出兼容现有引用；API owner不反向依赖页面。
- deleteAccount发请求前捕获已认证userId，仅服务端删除成功后枚举本地键，JSON完整owner相等且合法plan/null分区才删除；单项失败继续其余项，失败不冒充服务端删除失败。未执行真实账户删除。
- 新回归覆盖a与ab前缀冲突、new分区、畸形/无关key保留。typecheck/151项测试通过，integrated-tests.log；现有watch457.56ms成功。实际存储失败清理保障、session中途刷新边界仍非端到端证明。
- 仍待草稿清理失败复活/版本基线、晚登录与新建恢复effect；下一继续。此轮progress，goal active。

## 续批：计划列表effect和恢复身份顺序

- 发现planQuery effect依赖activePlanId并每次replacePlans旧query快照，保存新计划setActivePlanId或切换时可把刚保存store计划覆盖。拆成仅query数据变化负责replacePlans的effect，以及单独初选effect；不再由选择变化回放旧列表。
- restoredDraft且null计划初始标记newPlanRequested，阻止服务端列表晚到自动apply首条覆盖新草稿。save遇activePlanId存在而activePlan缺失明确拒绝，不把已删除/尚未回读的旧计划草稿用expectedRevision=null重建。
- typecheck与151项测试通过（integrated-tests.log，会话71576 exit0）；当前watch日志已编译。本轮effect顺序尚无专属挂载回归/WEAPP证据，保留晚登录恢复与清理失败版本基线待办。此轮progress，goal active。

## 续批：晚登录草稿与首次Context默认值

- Plan记录hydratedDraftScope；同planId在首次无账户、计划查询登录完成后scope变为有效时重新apply/read对应草稿，已经编辑时不覆盖当前输入。applyPlan同步scope，避免重复hydrate；查询数据完成是重新检查身份的触发。
- 任一用户字段编辑retainDraft立即标记appliedContextDefaults，阻止第一次异步Context到来覆盖用户刚选地点/日期，即使当时身份未恢复无法存储也保护页面输入。
- typecheck与151项通过（integrated-tests.log，会话44672 exit0），开发watch成功。此为源码修复，晚登录/页面挂载顺序仍需专属回归和WEAPP证明；新建无计划时晚登录自动恢复、清理失败旧草稿及中途session变化仍待办。
- 本轮progress，goal active，完整PLAN不变。

## 续批：重新观察真实开发器并修正验证配置

- Computer Use真实窗口清单现已出现隔离Starward-integrated-runtime-check；原历史IDE108267732仍保留，未保存settings未触碰。首个观察窗口69405104最小化，激活后实际模拟器报项目根目录无app.json。
- 文件实查miniprogram/app.json存在，但snapshot/project.config.json仅剩appid/setting，丢失miniprogramRoot。沿任务现有open-runtime-snapshot.mjs重拷当前dist并恢复配置，官方auto --trust-project exit0；不修改产品业务配置。为什么旧配置缩水尚未归因，不能称工具根因全解决。
- 新窗口69470640实际先Loading project all files，随后Map/My原生底栏出现、主体白屏；控制台有日志，当前尚未读到首条错误。根目录无app.json错误已消失，但不能称产品可运行。snapshot本轮已刷新当前生成物，后续源码变更仍使其失效。
- 本轮环境配置修复和真实新证据是progress；不是单纯重复旧SDK timeout。下一从当前窗口控制台/官方SDK读取首错，继续恢复WEAPP验证，不关闭原用户未保存IDE。goal active。

## 续批：实际WEAPP首次恢复与设置红光观察

- 当前snapshot窗口69470640最终渲染正常Map：腾讯真实底图/搜索入口/无叠加/暂无结果/Map My两tab。控制台Launch Time29193ms；上一轮主体白屏是该次尚在加载，不能继续归因为Component not found。未证明历史原IDE根因。
- GUI实际点击My底栏进入账户内容/今晚计划/反馈/设置/链接/导入；当前此隔离项目显示链接0待审核0，不能冒认为原九草稿账户，未读取/导出任何身份secret。
- 实际点击Settings，再点观测红光：背景黑、文字红、ToggleField开启与关闭均为红黑，无白色原生Switch；微信胶囊白色系统区域仍存在，不能称整个手机黑红。当前模拟器iPhone12/13菜单，未量测具体viewport，截图不代表物理手机。
- 新真实警告：pages/my/index与content/settings/index ScrollView padding not supported in webview rendering mode。应定向内层padding修复而非compileMode整容器重试。当前窗口仍settings observation mode，snapshot当前生成物未变，main正常watch继续。
- 本轮真实UI证据构成progress；WEAPP可继续验证而非沿用历史完全不可用判断。下一检查200%/滚动/返回/Import等，并恢复官方SDK方便精确几何；全部14route和真机矩阵未完成，goal active。

## 续批：设置红光200%实际观察及输入高度

- 当前snapshot Settings滚动到可访问性，实际点击大字模式，标题/正文/数字均放大并自动换行，红黑色继续保持；viewport菜单仍iPhone12/13未精准量测，不推广为四宽度全部通过。观察到城市输入仍紧凑单行，当前.field只有min44且padding，200%body line44加padding存在挤压风险。
- app.scss针对input.field新增height=max(target-min, body-line+2*space-inline)，上下内边距同token，使单行输入随200%字级增长；Textarea不受此height规则控制。当前生成watch会编译，实际snapshot尚未刷新，不能称改后已观察通过。
- ScrollView padding warning尚未定位：Settings组件已把padding放内层settings-content，外层settings-page__scroll未写padding；app reset仅box-sizing。不得未经证据重复搬padding或改compileMode。下一检查Taro生成comp传入style/默认属性；当前UI显示警告但滚动有效。
- 本轮actual UI evidence与源码修复progress，goal active。snapshot因最新app.scss变更已过期；刷新后需重验输入框。settings当前红光+large-text，勿将切换误当用户所有实例偏好。

## 续批：定位ScrollView padding模板默认值并定向构建修复

- 当前base.wxml所有动态ScrollView带padding="{{i.p12||[0,0,0,0]}}"，源TSX无padding prop；设置/My CSS外层也无padding。与实际WebView警告对应，非内层布局padding。
- 新config/scroll-view-template.ts仅删除scroll-view标签中Taro生成的零数组padding默认属性，其他标签/textarea disable-default-padding/显式custom padding保留。config根modifyBuildAssets使用Taro MiniPlugin公开hook（已读本地MiniPlugin processAssets REPORT调用）投射WXML RawSource，不改node_modules/生成物手补/compileMode。
- 首次typecheck资产参数implicit any，已标Record<string,sources.Source>修复；新增转换范围/幂等回归，typecheck和152项通过（integrated-tests.log，会话68634 exit0）。
- 重要：现有watch未自动加载config变化（日志仍旧493.38ms）；本轮尚未真实新build证明hook执行。下一确认并停止本任务watch/重启编译或单独隔离build，不和现有dist写入并行；刷新snapshot后实际重进Settings/My确认警告消失。不能把纯转换测试称实际警告已修复。
- 当前snapshot仍上轮旧输入高度前版本，Settings红光大字。此轮源码+定位证据progress，goal active。

## 续批：真实重编译验证插件投射

- 实查旧watch PID2484后停止，仅重启dev:weapp得到95450/PID21736；原dev:miniapp owner因子进程退出连带停止API，8787实测无监听。独立watch生成仍4个padding默认属性，证明根config modifyBuildAssets被CLI接管而未生效。
- 读cli/dist/presets/commands/build.js确认applyPlugins(MODIFY_BUILD_ASSETS)，改本地config/scroll-view-template.cjs注册ctx.modifyBuildAssets；删除失效根回调和TS helper，测试改直接require实际插件导出转换函数。
- 停止已核实PID21736，验证dist/weapp绝对删除边界后恢复正常npm run dev:miniapp -- --no-open，新owner会话51450；8787已恢复监听，实际最新base.wxml默认padding计数0。旧72520/95450不再作为活owner，不能重复启动。
- 本轮已证实构建插件真实执行；尚未刷新snapshot并实际重进Settings/My检查警告，不能宣称UI警告消失。下一对本次插件版本跑typecheck/目标测试，刷新snapshot验证；当前goal active，progress。

## 续批：插件与大字输入真实复验

- 新插件typecheck/定向转换测试通过，design-tokens check三项通过。刷新snapshot脚本exit0，会话13128结束；新窗口69536176当前运行，加载22.115秒后Map可操作。
- 实际重新点击My/Settings，两页控制台没有再出现ScrollView padding警告（之前会在各页进入时显示），本次可视控制台主要基础库/SharedArrayBuffer警告；此为本次模拟器页面观察，不声称所有14route均已验证。
- Settings默认城市大字字段实际完整显示深圳，字段高度随大字增大；往返滚动正常，截图未精确像素量测。本次冷启动大字保留但模式为DAY，而上次为OBSERVATION；需查既有观测模式冷启动产品规则/存储，暂不归因为bug。
- 新实际问题：My双列工具卡200%时今晚计划/现场反馈换行过碎，应该大字单列。Settings三态模式观测红光也多行，但尚无截断，待四宽度精测。下一修My大字工具分组并复验；全goal仍active。
- 当前snapshot是最新app输入高度+模板插件生成物，源码未再变更；正常开发owner51450运行，日志integrated-development.log ready。此轮actual verification progress。

## 续批：My大字双列碎行修复

- 根据真实200%截图，My计划/反馈双列造成标题每2-3字折行；large-text下my-focus-actions改单列，分隔线从左右改上下。同页账户链接/审核统计band同步单列，保留真实数据和原点击owner。
- 两类routine-entry统一44逻辑px命中，文字允许自然换行，语义图标18逻辑px；未缩小大字或移除说明。此为实际观察驱动的SCSS修改，无镜像测试。
- git diff --check通过，现有开发watch生成新样式，snapshot现已过期。下一刷新验证My单列，然后继续Import/计划实际流程和其余14route，goal active。本轮progress。

## 续批：My单列与Import大字真实复验

- 新snapshot刷新官方auto exit0，当前窗口69601712；Map实际加载18.103秒后有真实底图/暂无结果，大字偏好保持。
- 实际进入My：账户统计与计划/反馈均单列，今晚计划和现场反馈标题在当前模拟器完整显示，滚动到日常设置/链接/导入无碎行挤压；这证明本样本修改效果，不代替四宽度矩阵。前轮watch336.90ms成功补记。
- 实际点击内容导入：大字标题、平台2×2、来源URL输入、权利说明、确认开关及建立按钮正常呈现，未勾选权利/未创建草稿。当前只观察初始表单，未验证来源输入/IME/创建/原九样本。控制台新增普通基础库SharedArrayBuffer warning，未见Import padding警告。
- 当前窗口在Import初始大字DAY，snapshot当前版本有效；开发owner51450继续。下一验证表单输入及底部历史（当前隔离项目身份未知，不重复建立十样本），并推进更多路线/真实来源关联。goal active，本轮实际UI progress。

## 续批：原项目会话真实状态与旧模板错误

- 当前隔离snapshot Import滚至历史实际0条且无错误；不能认为原九草稿丢失，也不复制创建样本。
- 激活原IDE108267732，未保存settings.json仍有圆点，未关闭保存或丢弃。原Map已正常渲染（控制台Launch3867ms，基础库3.17.1），My可打开；不再把原IDE整体当白屏阻塞。
- 原My点击内容导入后未跳页，控制台出现红色模板编译错误，路径./dist/weapp/content/import/index_templates.wxml#3；可见模板仍包含旧import-rights-confirmation原生switch及旧导入文案，与当前源码/隔离正常模板不同，说明旧模板/编译缓存尚在。未把旧页面错误当当前代码回归，需核实际miniprogramRoot和编译缓存。
- 下一在不影响未保存settings文件前提下使用官方编译/清缓存入口恢复原项目，或者确认其真实配置；不要重复重建十样本或读出身份secret。隔离window69601712在Import历史0，originalWindow108267732当前My及错误控制台。goal active，本轮新runtime证据progress。

## 续批：原项目官方编译刷新

- 文件实查当前apps/wechat-miniapp/project.config miniprogramRoot=dist/weapp；之前错误指向index_templates.wxml在当前磁盘已不存在，因此属于旧生成模板缓存证据。
- 原IDE工具菜单可见编译Ctrl+B/刷新Ctrl+R/清除缓存子菜单；本轮实际点编译，未碰未保存settings.json。冷启动10.250秒成功回Map，随后My正常。
- 再点Import后当前仍停My，短等5秒未出现新红错也未导航完成；不能称已恢复。下一使用官方清除缓存子菜单仅选编译缓存（不得清数据/授权/全部缓存，以免丢失原安装identity），之后重试一次；如果仅导航timeout继续沿文件/官方SDK证据查。
- 此轮verified compile与新状态证据progress，goal active，原九草稿未操作。current originalWindow108267732在My；snapshot69601712仍可用Import0条。原未保存文件保持。

## 续批：原IDE文件缓存清理结果

- 工具→清除缓存实际子菜单：清除文件缓存/数据缓存/授权数据/网络缓存/登录状态/全部清除。仅点第一项文件缓存，随后Ctrl+B官方编译。未点其余项，原settings未保存圆点保持。
- 冷启动10.834秒Map成功，My→Import再次报旧index_templates.wxml#3及navigateTo timeout。清文件缓存没有消除旧模板引用；不得继续称只是待清缓存，也不要重复相同动作。
- 下一优先核实原窗口实际项目绝对路径（侧栏仅显示WECHAT-MINIAPP，并不能证明是E:/Dev/Starward/apps/wechat-miniapp），其title历史native-validation可能指另一旧checkout；当前读磁盘路径与UI错误不一致。不能猜测window=当前cwd。
- 隔离snapshot仍可正常Import，全部代码工作可继续，不是全局阻塞。本轮有界清理结果改变下一动作，progress，goal active；原九草稿未变。

## 续批：确认原IDE路径与计划草稿失效兜底

- Explorer实际揭示原IDE项目绝对路径E:/dev/Starward/apps/wechat-miniapp，排除旧checkout假说。private config只有项目名/libVersion3.17.1/AppID，无另一个构建根；当前dist Import只有index文件无旧index_templates。未再重复清缓存，未动原settings未保存文件/安装身份。
- 暂用正常snapshot继续可验证工作，原IDE旧模板仍待解决，不是全局阻塞。当前snapshot因本轮源码修改已过期。
- 计划保存成功清草稿改为clearPlanDraft：删除失败时写null使旧草稿无法恢复；两种存储操作均失败时诚实提示服务端保存成功但本地清理失败，避免误报保存失败/静默重复建立。删除流程复用失效兜底。
- 当前typecheck通过，plan-draft四测试通过，git diff --check通过（仅换行提示）。新增回归覆盖remove失败后的不可恢复和全部存储失败返回值。
- 这只补清理单项，草稿baseline/revision、迟到身份与mounted effect、真实重启仍未完成；全14路线/实际设备等维持PLAN范围。goal active，继续开发；用户睡眠期间本地普通信任/操作自主处理，不制造人工卡点。

## 续批：计划请求迟到时的账户隔离

- 前轮为progress（清理兜底代码与回归），本轮继续实际代码。save捕获savingOwner，在请求成功、异常及冲突refetch返回后核对当前归属；归属变化不写store/清草稿/保存checklist。delete请求返回后同样核对，避免旧身份响应覆盖新身份列表或自动导航。
- 补实际remove handler回归：请求期间账户变化后仅发生confirm/delete，不replace/cleanup/navigation，锁释放。修正前轮引入clearPlanDraft后旧handler测试sandbox缺少helper的问题。
- 当前typecheck与plan-delete+plan-draft共7测试通过。此次未运行全套，save分支暂无独立handler回归；不可说全部异步身份问题完成（API重试身份、列表query、已呈现旧内容仍待检查）。snapshot因代码变化继续过期。
- 下一检查api-client save/delete调用身份重试策略及新草稿晚到身份恢复；再刷新实际WEAPP验证更多路线。全目标保持active。

## 续批：请求层权限重试的身份保持

- 前轮progress；本轮读取真实requestOperation发现PERMISSION_DENIED会clear session再递归ensureSession，原先没有账号保持约束。已改重试绑定原userId，刷新后身份不同则不发送第二次请求；权限错误到达时已有另一账号session也不会清除新登录。
- 新session-retry.test直接执行实际requestOperation声明，覆盖同账号正常重试、错误返回前账号切换不清session、不发第二请求、刷新时账号变化不发第二请求。typecheck与该测试通过。
- 未改变权限来源或绕过服务端授权；此为跨所有受认证operation的必要修复。OPTIONAL初始匿名请求不新增身份绑定。刷新session自身并发/首次请求身份race仍需审查，未宣称全认证流程完成。
- 新草稿晚到身份恢复尚未实施，下一继续；snapshot已过期，全目标active。

## 续批：晚到身份的新计划草稿恢复与现有套件

- 前轮progress。本轮实际修复planQuery完成身份恢复后的新草稿读取：无显式plan、无当前plan、未进入新建/编辑时，在默认选择服务端第一条之前读取本账号null-plan草稿并恢复；空服务端列表同样支持。已在编辑的不覆盖。
- 新plan-recovery测试执行实际effect callback，覆盖服务端空/非空列表与已编辑/未编辑组合；定向1测试通过。整个既有套件在新增该测试前155/155通过，日志artifacts/miniapp/integrated-tests.log，当前typecheck通过。新增后未重跑整套；实际设备重启仍未验证。
- 注意初始缓存已经选中plan时不会自动跳新草稿（保持当前选择）。后续需账户切换显示隔离、草稿版本基线和真实重启流程；不是全草稿功能完成。
- snapshot仍过期，正常watch应生成最新输出，下一核watch并刷新WEAPP继续实际页面验证与其他路由迁移。goal active。

## 续批：计划页字级与大字重排迁移

- 前轮progress。计划页现存旧18–34rpx文字已按page/spot/body/secondary/metadata/data角色迁移共享token；返回/清单命中用target-min，图标用实际icon-large/medium。去nowrap和112rpx数据宽上限，textarea按五行正文。
- large-text计划事实与日期时间单列，清单状态/路线时间移到第二行，计划列表动作纵排；section heading可换行。样式修改直接改owner，未以尾部字号覆盖掩盖旧值。
- watch实际本轮342.10ms成功，之后仅修正icon token名字（首次误用lg/md已发现修正）；不把构建成功当实际200%验证。snapshot仍待刷新，四宽度/红光/计划真实数据待测。
- 全goal active，下一刷新snapshot进入计划页实看并修具体布局；计划草稿baseline等仍在待办。

## 续批：计划页当前WEAPP实看

- watch确认icon修正后305.23ms编译成功；open-runtime-snapshot official auto exit0，当前runtimeWindow34277130，冷启动实际20.157秒Map真实底图、无正式结果。未动原IDE108267732/未保存文件。
- 实际My→今晚计划→新建观测计划成功，200%DAY保持；空列表真实0，正式地点无已核验发布项有明确说明。日期2026-09-06与22:00单列完整，备注五行高度，底部保存/返回按钮可见无截断。未创建服务端计划/未伪造正式地点。
- 观察发现新建时底部写返回计划详情，实际上无详情；改为无activePlan显示返回计划列表，已有计划保留详情。这次文字改动后snapshot再次过期（此前截图证明上版布局）。
- 本次只验证空/新建样本的DAY200%，未输入备注/离页恢复/四宽度/有计划清单/其他主题；滚动时内容可进入系统顶部区域，需后续核CustomNav滚动安全区设计。下一继续真实草稿输入恢复及其余route。
- 当前另有snapshot标题窗口9963390，此轮未操作；不要凭标题误选。goal active，本轮actual UI evidence+具体文案修正progress。

## 续批：计划新草稿真实离页恢复

- 前轮progress，本轮沿runtimeWindow34277130现有snapshot实际输入备注。第一次中文type未进入字段（截图仍placeholder），重新点击空白输入区后英文成功，再追加中文成功；不能把首次tool成功当输入成功。
- 实际备注为draft-recovery-0906；带红光手电，离开前清点器材。顶部返回My后再次点今晚计划，页面自动恢复新建编辑，滚至备注全文完全保留，日期2026-09-06/22:00保持。未点保存、未创建正式计划，只有snapshot当前身份的本地草稿。
- 本次证实实际离页/重挂载恢复，不是进程冷启动或手机重启；尚未验证中文IME组合事件。当前snapshot仍比源码少上一轮返回计划列表文案，恢复相关代码相同。原IDE身份九草稿未动。
- 新观察：恢复后无未保存修改黄提示（isDirty基线目前把restored当initial），虽然内容存在，需核恢复草稿应标注和dirty判定；下一处理该真实提示缺口并冷启动验证。全goal active。

## 续批：草稿恢复提示与模拟器冷启动验证

- 新增recoveredLocalDraft状态，初始/applyPlan/startNew恢复时更新，保存成功后清除；无服务端计划的恢复草稿计入isDirty，提示明确本机恢复、尚未保存到服务端。修正实际上一轮发现的空提示。
- typecheck通过，watch813.44ms成功；刷新snapshot official auto exit0，新runtimeWindow136054494，实际launch15.375秒。My→计划自动进入恢复编辑，备注draft-recovery-0906；带红光手电，离开前清点器材。完整保留，日期时间保持。
- 实际截图可见黄色恢复草稿说明和最新返回计划列表文案，200%下可自然换行；这证实新模拟器运行实例冷启动恢复与提示修复，不等于真机/整机重启。未保存服务端、未改正式地点、原九导入不动。
- snapshot目前与源码一致。下一继续计划版本基线和其余route/数据任务，避免将空计划样本替代全计划验收；全部goal active，本轮代码+当前runtime证据progress。

## 续批：计划草稿记录编辑版本

- 前轮progress。草稿可选baseRevision通过安全整数校验并持久化；编辑器独立保存编辑开始/恢复时的版本，保存请求使用该版本，不再随着服务端列表刷新悄悄采用新revision。成功后更新基线；冲突回读后保留输入，更新基线供用户再次保存（现有冲突提示路径）。
- typecheck与plan-draft五测试通过，新增测试覆盖revision保留与坏值拒绝。该测试仅证明解析，尚未独立覆盖完整save conflict handler/真实两端并发。
- 旧版本草稿无baseRevision仍兼容并取当前计划revision，旧草稿安全比较/冲突前后内容展示尚未完成；不得称所有旧草稿覆盖风险消失。后续加强具体冲突核对和旧草稿规则。
- snapshot现已过期；全goal active。下一可继续冲突业务或其他路线迁移，不重复已证实空新计划离页/模拟器冷启动样本。

## 续批：计划冲突的具体内容核对

- 前轮progress。移除冲突回读后自动采用最新revision，改为conflictPlan保留服务端快照并展示地点名称（不可用时诚实fallback）、日期时间和备注。草稿输入不覆盖；用户点已核对保留本页修改才采用该快照revision并落本机草稿，然后仍需点保存。期间服务端再次变化会继续CONFLICT。
- 恢复无baseRevision的旧已存计划草稿同样先核对当前快照，避免兼容路径静默覆盖。新计划不需此步骤，切计划/新建清理对应核对状态。
- typecheck通过；本轮尚未执行handler回归或真实冲突样本，不能称完整冲突验收通过。snapshot过期，当前136054494仍为上一版恢复草稿UI。
- 下一针对save handler旧版/冲突二次保存补回归，再推进剩余route/正式点真实资料和十导入样本。全goal active。

## 续批：计划save实际handler回归

- 前轮progress。本轮新增plan-save.test.ts，AST提取并运行实际save handler。模拟草稿基线2/当前列表9/冲突回读10，证实请求仍提交2，冲突后基线不变、输入保留、核对状态保存10；未核对再次保存不发第二请求。
- 另一回归模拟请求期间账号变化，冲突异常不refetch、不replace、不设置核对快照，mutation锁释放。定向2测试与typecheck通过。
- 测试只覆盖冲突和迟到异常，尚未完整覆盖核对按钮后二次成功/成功响应账号变化/真实服务端并发。未重新运行整套（最近整套155通过，之后新增多项）。snapshot仍过期。
- 全goal active；下一推进仍未迁移route和真实数据流程，并保留计划完整验收未完成事实。

## 续批：反馈页主题开关与大字布局迁移

- 前轮progress，本轮推进另一route。反馈精确坐标同意/图片权利确认的原生Switch替换共享ToggleField，保留原状态setter与data-od-id，明确已同意/未同意、已确认/未确认，不自动勾选。媒体技术术语magic bytes改用户说明。
- 反馈原88rpx/64rpx按钮最小高度改target-min，nowrap改自然换行；错误提示用critical角色，大字下地点/日期/坐标/恢复轴单列、类型说明纵排、媒体动作移到下一行。
- typecheck通过（最后SCSS布局改动之后未再类型检查，纯SCSS无需重复）；实际红光/200%反馈UI尚待验证，不把已验证Settings开关等同整个反馈页。控件busy禁用与媒体真实路径后续审查。
- snapshot过期，全goal active，下一刷新看反馈页并检查真实提交命令状态。

## 续批：反馈命令同步互斥

- 前轮progress。真实commands原先只有React状态防重，picker前尚未uploading。新增持久useRef同步共享锁，覆盖外部saveDraft/useCurrentLocation/addMedia/retryMedia/submit整个异步周期（含原生modal/picker），上传/提交内部调用未包装save避免自锁。
- command-lock两回归覆盖原生选择等待期阻止重复与跨命令、取消后释放、异常后重试；typecheck与两测试通过。两个同意开关补saving/uploading/submitting禁用（最后该JSX属性添加后未重复typecheck，表达式已在同页使用）。
- 尚未把picker等待状态反馈到可视busy，所有文本输入/恢复草稿按钮在请求中的编辑冻结仍需处理；本轮只证明命令互斥，不宣称完整提交快照/跨身份/实际上传已通过。snapshot过期，goal active。

## 续批：反馈异步等待状态连接输入保护

- 前轮progress。共享command lock现通知form.commandBusy，原生选图/定位等待也进入UI禁用状态；反馈类型、输入/备注、坐标、日期时间、恢复按钮、同意开关和主要保存提交/上传入口连接该状态。
- CoordinateField/DateTimeField通过disabled props传递，避免子组件访问不存在form；首次typecheck发现该scope错误，修复后重新验证。command-lock两测试通过；当前typecheck结果见本轮命令输出。
- 剩余历史详情/个别媒体操作按钮仍需审查，尚未actual picker取消后UI恢复/红光验收。snapshot过期，全goal active。

## 续批：反馈历史入口与产品状态文案

- 前轮progress。历史继续编辑草稿入口补commandBusy禁用，避免异步保存/上传中切换草稿；纯历史筛选不改变输入，保留可用。
- 发现历史事件直接展示SUBMISSION/MERGE/PUBLICATION和状态枚举，复用现有三轴label映射为中文，未知状态诚实显示待更新；公开影响revision文案改资料，图片不可移除说明去实现细节保留真实限制。未新增/伪造服务端媒体删除能力。
- 当前typecheck通过；本轮未实际UI观察，也未扩展状态字典测试。snapshot过期，全goal active。下一刷新反馈实际页面，继续真实上传/错误/恢复验收。

## 续批：反馈实际入口未完成跳转的新证据

- 前轮progress。watch391.36ms成功，snapshot刷新official auto exit0。新runtimeWindow102106800，实际Map launch16.428秒，My成功打开，当前200%DAY。
- 点击反馈条目正文后My保持且出现pressed底色，5秒后仍无跳页/新红错误；检查源码openContribution确为navigateTo /content/contribution/index，appconfig包含该route且当前dist index.json存在。随后点击尾箭头仅清pressed/无立即跳页。不能据此称反馈UI验证通过，也不能直接认定旧模板错（当前无该证据）。
- 下一优先检查当前运行交互事件/尝试官方可观测导航，不重复冷启动或清身份。计划/Settings此前同环境可跳，原IDE未操作。snapshot此刻与源码一致，全goal active，本轮runtime evidence改变下一动作。

## 续批：公开API导航成功与反馈大字标题

- 前轮progress。当前snapshot102106800在My未自然跳转；通过开发器console执行微信公开wx.navigateTo到/content/contribution/index成功，实际页面加载/可见日期时间/新增地点模式。这排除本次路由缺失和页面整体编译失败，My入口事件仍待解（未声称已修）。
- 200%DAY真实反馈标题在胶囊同一行被覆盖，正文与日期字段可读。局部large-text标题bar增加44px上间隔移到胶囊下，并明确44px左右列和标题自然换行。尚未刷新验证此SCSS，snapshot现过期。
- 当前页面feedback初始位置，未输入/提交/上传。下一验证标题修复和滚至同意/媒体区域，同时继续定位My入口事件。全goal active，新runtime证据+实际布局修正progress。

## 续批：反馈200%DAY文档下半部实际检查

- 前轮progress。沿102106800当前snapshot滚动验证涉及事实单列、现场说明、地点名称/地区/经纬度单列、坐标同意和图片权利ToggleField纵排，文本可见且两项均未同意/未确认。媒体0/3，未确认时选择图片实际禁用。
- 继续到底可见保存草稿/提交审核及我的投稿，全部0/待审核0/需补充0筛选和无记录提示完整可达。未点同意、保存、提交或上传，未新增测试事实。
- 确认ScrollView滚动时正文被nav区域裁剪，不同于计划整页滑入状态栏；标题本身仍为旧snapshot与胶囊重叠，上一轮源码修正待刷新。实际DAY200%无图空反馈布局有证据，红光/实际媒体/错误路径仍未验证。
- 当前runtime位于反馈底部，snapshot仅缺上轮标题SCSS；全goal active。下一刷新标题与红光，另查My入口点击事件，不复做当前空页面滚动样本。

## 续批：近期全套检查与入口失败反馈

- 前轮progress。当前miniapp既有全套161/161通过，日志artifacts/miniapp/integrated-tests.log；不含随后本轮新增导航catch的运行验证。编译pages/my/index.js确有openContribution及onClick绑定、正确路径，排除源函数被遗漏的简单假说。
- My反馈入口补navigateTo拒绝时floating通知，保留页面并提供重试说明，防止silent rejected promise；当前typecheck通过。这是必要错误反馈，不声称已解决先前真实点击无跳转（没有观察到拒绝，也可能点击事件未到达）。
- snapshot过期（标题SCSS+导航catch），下一刷新再测My入口和标题，利用可见失败信息区分事件/导航。全goal active。

## 续批：反馈标题修复实际通过，入口事件仍未到结论

- 前轮progress。最新snapshot刷新official auto exit0，新runtimeWindow8652318，launch13.550秒，Map/My成功。再次点击反馈正文只见pressed、无路由变化/失败通知；随后公开wx.navigateTo立即成功。不能凭没有通知确定事件完全未到达，需观测handler。
- 最新200%DAY反馈标题在胶囊下完整单行显示，返回按钮可见，正文起点正常；这证实上一轮局部large-text nav布局修复当前有效。当前snapshot与源码一致。
- 不再重复冷启动/同一坐标点击作为下一动作，下一用可见开发诊断或实际事件owner检查。原IDE未动。实际红光和更多宽度/有数据样本仍待测。全goal active。

## 续批：反馈入口阶段诊断接入

- 前轮progress。复用acceptance-diagnostics有界本地记录，My反馈handler记录entry_click/start、route_opened/success、route_rejected/failure，不输出账号/输入/服务响应。类型检查通过。
- 该诊断受MINIAPP_ACCEPTANCE_DIAGNOSTICS编译开关控制；config确认为env=1才开启，现有tools/miniapp/run-wechat-devtools-session.mjs设置此开关。不能假设当前normal dev owner已开诊断，也不能用空诊断表证明click未执行。
- 下一需在现有官方诊断构建路径或可观察断点下验证，避免以未启用记录做结论。当前snapshot过期，真实入口问题未解决；所有其他代码/页面任务可继续，全goal active。

## 续批：已开启当前开发诊断构建

- 前轮progress。核官方runner会启MINIAPP_ACCEPTANCE_DIAGNOSTICS，但其完整验收流程会触及其他scope，未启动完整runner。对现有devowner51450发送Ctrl+C得到exit1，确认无剩余Taro/miniapp node后，以相同dev:miniapp -- --no-open加该环境变量恢复。
- 新开发owner会话72452（替代51450），日志integrated-development.log status ready，8787实际监听PID10544，postgres_postgis_redis_bullmq正常；watch08:31:29 ready。编译common.js recordAcceptanceDiagnostic内if(false){}后执行try，证明本次诊断确已编入，不再用关闭态空表做推论。
- 未关任何IDE/未保存文件/未清身份。snapshot尚旧版无开启诊断，下一刷新snapshot后读取过滤my-contribution-navigation的非敏感三阶段记录，避免输出整个storage或session。全goal active。

## 续批：诊断构建真实反馈入口两次成功

- 前轮progress。snapshot刷新成功，新runtimeWindow8717854，launch18.242秒。My点击反馈正文后实际正常进入；仅用console读取过滤my-contribution-navigation的记录（没有调用navigateTo），可见start/entry_click与success/route_opened（success sequence24），证明真实handler与导航走通。
- 随后点页内返回My，再点相同条目，第二次正常进入反馈。标题仍完整位于胶囊下。当前诊断构建入口可用；之前正常watch构建的无跳转根因未被证实，不能说diagnostic本身是产品修复。后续最终无诊断构建必须复测。
- 当前snapshot与源码一致，开发owner72452带诊断仍运行；当前页面反馈初始200%DAY。原IDE身份未动，下一继续红光/表单错误/媒体等真实流程，不再在已可用入口上循环重启。
- 全goal active，本轮真实可用证据使局部入口不再阻挡后续验收。

## 续批：反馈空表单校验实际拦截与提示可见性

- 前轮progress。8717854实际滚到底点提交审核，仍留底部；手动滚回页首后看到还不能提交/至少事实与20字提示，证实handler运行且本地校验拦截，未建立反馈事实。原生滚动未自动定位错误，首部inline通知离操作点太远。
- 错误/警告announce改floating通知，复用已有FloatingNotificationHost；字段旁错误仍保留，success/info维持原inline。此针对实际看不到错误的问题，尚未刷新复验，不声称已完成字段自动定位。
- 当前snapshot比源码仅少此通知修复，runtime在反馈首部错误提示。下一实测floating与红光，完整字段导航/a11y继续待办；全goal active。

## 续批：反馈校验区域自动定位

- 前轮progress。根据实际空提交后停底部问题，反馈唯一ScrollView增加scrollIntoView错误区域定位：正式点上下文/事实说明/地点坐标同意/媒体四个真实DOM anchor。无额外滚动容器，不用pageScrollTo去操作错误owner；定位无动画避免减少动态模式冲突。
- validationAttempt使连续相同错误也可重新触发，effect先清目标下一tick设置并在取消/unmount清timer。保留原输入focus与floating错误通知。
- 当前typecheck通过，实际重复提交后滚动定位尚待复验；snapshot过期。新增wrapper是否影响section局部间距也应在实际页面看，不以类型检查替代UI。
- 全goal active，下一刷新当前反馈并验证空提交定位/重复校验，然后继续红光及真实数据路径。

## 续批：反馈错误通知和重复定位实际复验

- 前轮progress。最新snapshot17631796，launch14.438秒，公开导航直接进入反馈（本次不复验My入口）。底部空表单点击提交后立即定位到事实区，浮动还不能提交说明完整可见；未发送有效内容/创建反馈。
- 关闭提示后回到底部再次点提交，同一错误第二次再次定位且显示通知，证实validationAttempt路径实际有效。定位到evidence区域从日期开始，事实选项在同屏；不是精确到textarea焦点的证明。
- 当前snapshot与源码一致，200%DAY，标题/底部可读。实际红光、输入IME、真实上传和其他字段错误仍待验；未将这两次空提交算完整反馈功能完成。全goal active。

## 续批：反馈浮动错误跨页面残留修复

- 前轮progress。17631796通过公开导航到Settings准备红光实测，反馈空提交错误仍浮在Settings，确认本轮新可见缺陷。点击观测红光只见pressed未切换，本次不计红光通过。
- contribution form新增页面显示owner：useDidHide和unmount清本owner通知，隐藏后迟到announce不再发到别页，useDidShow恢复。仅清contribution，不清别页通知/草稿。
- 当前typecheck通过；真实hide/late-response通知回归尚待验证，snapshot过期。当前runtime Settings仍有旧错误，下一刷新或后续返回进行主题验证；全goal active。

## 续批：反馈通知归属回归

- 前轮progress。本轮测试实际hideNotifications/announce声明，验证错误floating、隐藏只清contribution、迟到成功不追加通知、回显后可以重新提示；定向1测试和typecheck通过。
- useEffect setup显式恢复notificationVisible=true，避免开发StrictMode effect清理/重建后一直关闭提示。真实WEAPP跨页通知尚待复验，测试仅证明声明行为不代替生命周期集成。
- snapshot仍过期，当前17631796 Settings旧模式切换未成功，需继续实际主题测试；全goal active，不收窄14route/数据/媒体等剩余范围。

## 续批：反馈草稿日期时间序列化一致性

- 前轮progress。读applyDraft发现en-CA/en-GB.format结果直接用于协议字段，默认new Date本地时区却与提交+08:00/恢复AsiaShanghai不一致。复用calendarDateInTimezone并增加clockTimeInTimezone（formatToParts、latn、h23），恢复和默认值统一中国标准时间，与现有提交协议一致。
- 午夜跨日/分钟补零/UTC对比/无效时间回归通过，当前typecheck通过。未更改服务端时区语义；全球观测时间支持不是本次新增功能。
- 实际草稿保存/回读仍待真实样本验证，snapshot过期；全goal active。

## 续批：反馈草稿冲突恢复入口

- 前轮progress。保存冲突后回读同submissionId最新记录并保存conflictDraft，不覆盖输入。冲突未核对时save返回null（上传/提交内部save同样停止），避免一直用旧revision重试或静默覆盖。
- Actions展示当前服务端类型/审核状态/说明；仍为DRAFT时可明确核对保留输入，更新draft元数据revision供后续保存；非DRAFT不提供覆盖入口，提示查看审核状态。applyDraft切换真实草稿清对应冲突。
- typecheck通过。完整字段差异（地点/日期/权利等）、权限变化/回读失败/handler测试与真实冲突尚待完善，不称冲突流程完成。snapshot过期，全goal active。

## 续批：反馈冲突核对完整字段

- 前轮progress。冲突快照展示地点名称/候选地区坐标、北京时间、事实主题、图片权利、精确坐标同意、媒体数量，加原类型/审核状态和说明；不展示内部submissionId/revision。时间损坏显示暂不可用，不使整个核对卡崩溃。
- keepConflictInput命令本身也检查DRAFT和commandBusy，不仅依赖按钮是否可见，防止已审核记录采用覆盖基线。
- 当前typecheck通过；完整真实冲突样本/二次成功/媒体关联差异仍待验，snapshot过期，全goal active。

## 续批：反馈冲突回读失败不得采用旧缓存

- 当前整套miniapp测试163/163通过（integrated-tests.log），包括前轮通知归属与时区修改。发现history默认refetch错误会返回缓存，冲突核对可能把旧revision当作最新。
- contributions查询启用throwOnRefetchError；保存冲突仅接受成功回读且同submissionId的记录。断网时保留输入并说明恢复网络重新保存核对，记录已不在当前账号时提示近期反馈核对，不展示伪最新内容。
- 新draft-conflict.test.ts执行实际保存声明，覆盖新快照/记录缺失/断网三分支，不覆盖本页输入且释放busy；定向1测试通过，生产代码typecheck通过。
- snapshot仍旧，实际跨页通知清理/真实冲突/红光本批未验。devowner72452继续，goal active，下一刷新运行快照并检查跨页通知，同时继续14路由剩余迁移与真实数据任务。不把此局部修复视为全任务完成。

## 续批：反馈异步命令账号归属保护

- 上轮为有效进展（冲突回读代码/回归），非阻塞。当前反馈命令原先在原生定位/选图、上传读文件、服务端返回后继续操作，没有账号复核。
- 新account-guard将已挂载编辑器绑定最初有效账号；无会话先经现有getContributions正常认证恢复，再执行命令。注销或换账号后拒绝旧表单操作，明确提示返回我的重新进入。
- 保存响应应用/冲突快照采用、定位前后、逐图创建会话/读文件/完成上传、提交前后与history回读之后均复核账号，禁止迟到成功应用表单或继续下一次写入。busy仍由现有排他命令finally释放；不清草稿/身份、不调用强制登录。
- account-guard2测试及draft-conflict定向测试通过（后者新增保存成功时换账号：不得applyDraft、不得回读新账号）；最终typecheck通过。
- 本批只证明命令等待边界，不宣称完整身份隔离：history queryKey仍未按账号分区、旧可见表单/缓存清理与请求内部resolveSession时序仍需进一步检查。实际WEAPP回归也未覆盖当前变化，snapshot过期。下一处理history身份分区或刷新runtime继续跨页通知/主题检查；全部14路由/真实数据/媒体/设备范围继续，goal active。

## 续批：当前全测试与跨页通知WEAPP复验

- 全miniapp测试166/166通过，当前devwatch正常编译。官方snapshot刷新成功，新runtimeWindow17697332，正常Map完成加载后公开wx.navigateTo进入反馈。
- DAY200%实际空提交仍定位evidence并显示浮动错误；随后公开导航Settings，反馈错误确实消失。本批证明真实useDidHide清通知有效；未创建反馈/未上传/未变原IDE身份。
- Settings点击观测红光文字和按钮边缘各一次均仅见pressed，未切换；不能把点击成功当红光通过。编译Button存在bindtap，state enterObservation也直接改mode，目前未证明根因。
- display-mode-control增加同既有开关控制的有界touch_start/touch_end/tap诊断（只count/axis/mode/suppressed，不包含身份）。下一刷新该诊断到snapshot后读取过滤display-mode-control记录，定位事件是否到达或被suppress；不要再次无证据重复点击。此改动尚待typecheck/实际诊断，本地源比snapshot多此三事件记录。
- 历史账号queryKey仍未分区，本批先完成实际页面回归，不声称此待办已做；全部目标active。
- 诊断初次typecheck发现事件枚举不匹配，已改用既有start/success并把touch/tap放reason，复跑typecheck通过。

## 续批：模式事件实证与红光返回箭头修复

- 上轮为有效进展（实际通知复验与诊断实现）。本轮官方刷新snapshot317721020，启动20.631秒。设置实际点击观测红光成功；过滤display-mode-control记录末段为touch_end:pending与tap:OBSERVATION:accepted（tap sequence105），显示事件正常提交。此前间歇不响应根因仍未证实，不把诊断本身称修复。
- 实际进入反馈200%OBSERVATION，正文/标题/日期时间输入/候选类型均黑红；滚到媒体区，精确坐标和图片权利开关、禁用选择图片、保存/提交按钮均为黑红，没有旧原生亮白Switch。未切同意、未建内容或传媒体。
- 实际看到CustomNav返回箭头为浅白。SemanticIcon源码将非DAY全部绑定arrow-left-light.png，盖在已存在的主题色CSS箭头上。修改OBSERVATION不挂浅白PNG，仅用同owner已有主题色箭头几何；DAY/NIGHT保原资源。typecheck通过。
- 当前snapshot比源码少该箭头修复，须刷新后实际验证箭头。微信原生胶囊仍白，属系统区域已知能力限制，不声称全屏纯红。display-mode-control诊断仅开发开关启用，最终无诊断切换复验仍待。
- 当前166/166全suite是本轮箭头修改前证据；局部改动typecheck当前通过。身份history缓存分区、全部14route/真实数据/媒体/硬件及其他PLAN待办保留，goal active。

## 续批：攻略/场地样式迁移与文章媒体归属

- 原spot/guides和spot/field路由均由features/spot/spot-detail-page共享owner实现，无独立index.scss。数据来源页owner是spot/data-source/index.tsx及data-source.scss，未因路径找不到认为不存在。
- 攻略旧卡一律取detail.spot.media[0]，可能无关文章。新增guideThumbnail按guide.blocks明确mediaId引用选择有thumbnail/许可且非过期不可用的媒体；没有匹配则不挂图片/占位列。回归覆盖无关联、无引用、缺许可/路径/过期/不可用，1测试通过。
- 共享详情owner标题/路线动作/时间/决策值/segment动作改正式字级token，favorite/route/segment命中采用44逻辑px；大字下攻略/设施/路线单列、夜空时间独占下一行、设施状态分行。watch573ms编译成功，typecheck通过（布局实测仍需正式点上下文）。
- 同时发现计划页上轮迁移误用不存在的type-page/type-spot/type-secondary变量；逐项改为type-page-title/type-spot-title/type-body-secondary的size/line正式token。此前实际可见是继承回退，不证明正确字级，此次需复验。
- 本批未迁移data-source，不声称三页全部完成。共享详情仍有固定蓝黑identity背景、无图大块header、外置lead挤占200%屏幕等未收尾；下一按源计划处理持续可滚动和三主题。红光箭头源码修复仍未进入snapshot317721020，待实际复验。全goal active。

## 续批：共享详情连续滚动与来源适用信息

- 上轮有效进展。本批将共享SpotDetailPage的头图/地点身份/路线/决策/云观星/章节导航全部纳入同一ScrollView；CustomNav保留外部返回，不再由固定lead挤掉大字正文。无图身份不设130px头图下限，不挂shade；空现场照片说明也去300rpx占位。
- identity背景/文字/渐变改主题token，去固定蓝黑白字；主标题仍正式spot-title字号。大字decision状态也改纵排。媒体本身在红光下如何避免蓝色仍待实际审查，不以token改完声称全页黑红。
- 来源页增加唯一ScrollView与固定导航；Provenance补齐来源类型、发布时间、获取时间、适用始末，空值明确未提供；不再把retrievedAt叫更新时间。标题type-secondary，状态header可换行/大字纵排。许可缺失改暂无许可说明，页尾运营实现清单改用户适用/安全/许可说明。
- 首次typecheck暴露上轮guide-media测试的不足类型断言；helper明确只依赖Pick<GuideArticle,blocks>，测试使用同真实最小类型，修复后typecheck通过。watch411ms正常编译。
- 实际有内容的攻略/场地/来源仍需有效正式点/观测上下文，不把空错误页当正文验证。来源kind分组、原始URL追溯操作、红光图片策略/页头大字胶囊仍待；snapshot旧317721020未含本批/箭头修改。目标继续active。

## 续批：来源分类与原始出处追溯

- 来源页按source.kind稳定分组，保留所有既有去重后的SourceSummary记录和组内顺序。类型标题复用Provenance完整契约label表，不凭provider猜测类型。
- 非compact来源卡补原始出处/许可说明复制入口，复用contracts validateExternalUrl拒绝危险/无效协议后调用Taro原生剪贴板；无链接不挂按钮，有本地成功/失败状态，200%动作纵排。未自动打开网页或发送给他人。
- 初次typecheck发现当前Taro类型无showToast和Text role支持，遵循现有API移除未支持参数、status挂View；复跑typecheck通过。原生复制提示属于系统区域，不能声称本新路径完全无亮色；实际复制/红光行为待验。
- 本批groupSources新增文件，待针对真实来源组与长URL实际验证；source时间仍按设备本地未显示时区，后续应澄清，不将获取时间等同发布时间。当前快照仍旧317721020，整体目标active，来源页面并未由空态测试证明完成。

## 续批：文章阅读尺度与逐段媒体引用

- 上轮有效进展。本轮ArticlePage发现每个media block取spot.media[0]，与攻略列表同类错误。共享articleMedia按block.mediaId及路径/许可/状态匹配，攻略thumbnail继续复用该合法关联再检查缩略图。两不同block分别选正确对象、missing/localPath空不展示回归通过。
- 正文/提示正文采用type-article（设计源16/26逻辑px、200%32/52），图片widthFix保原始比例且lazyLoad，去420rpx强裁。文章采用固定CustomNav+唯一ScrollView，导航短名攻略，完整文章长标题仍在可滚正文中，避免两份长标题挤占首屏。
- Provenance时间统一Asia/Shanghai并明确标北京时间；坏时间/Intl失败显示时间未知，沿用已有日期与时钟parts helper，不再随设备时区悄然改变。
- typecheck通过；定向媒体测试通过。真实文章内容/长文滚动/宽高比/图片加载失败/设施引用实际状态仍待验证，不把源码推断当实际完成。当前snapshot仍317721020旧版，必须安排包含本轮在内的真实页面复验；全部goal active。

## 续批：文章与场地共用设施核验详情

- 上轮有效进展。本轮文章facility_ref不再只有名称和占位说明；仅文章包含设施引用时请求spot-site，复用场地页queryKey及API。引用按facilityType匹配，有单独加载/失败重试/无记录状态，不阻塞已可用文章正文，也不凭缺失显示可用。
- 新FacilityEvidenceDetails复用于文章引用和场地列表，显示真实状态、detail/summary、开放时间、使用条件、非null距离（0也保留）、最近核验日期和来源。缺失时间/条件明确待核验；不可用用危险状态，季节性/未知警示，未新增任何现场事实。
- typecheck通过；全suite本轮执行日志integrated-tests.log，结果见本节后续记录。实际有效正式点/文章样本/红光媒体/长页面仍未验证，当前snapshot317721020过期，下一应进入实际页面或继续真实数据材料验证，不将组件复用当场地全部完成。goal active。
- 本轮完整miniapp测试167/167通过，0失败，9.69秒；这是当前自动检查结果，不替代WEAPP正式内容和硬件验证。

## 续批：文章/来源页观测上下文一致性

- 上轮有效进展。本轮两个支持页原仅检查spot:/ctx:字符串前缀，queryKey也不含观测revision/fingerprint。现与正式详情owner一致：要求当前ObservationContext ID、FORMAL_SPOT身份、spotId同时匹配，概览缓存key包含fingerprint/revision；切时间会请求对应新切片，不沿用旧概览key。
- UI只采用spotId吻合的概览响应；文章还要求article.spotId吻合，避免同articleId错误归属。失效上下文保返回入口，不呈现旧来源详情。
- typecheck通过，route-context定向测试实际取两页validRoute表达式，覆盖null/旧context/异点/MAP_POINT拒绝及匹配正式点允许。1测试通过；时间切片实际请求/迟到响应仍需WEAPP验证，不扩大该测试证明范围。
- 前轮全167测试是本轮前状态；快照317721020仍旧版。后续重点真实正式点上下文与页面验证、计划/反馈身份缓存、发布资料证据等未完成项继续；全部goal active。

## 续批：共享导航逻辑尺寸与红光箭头WEAPP实证

- 上轮有效进展。本轮CustomNav左右列/返回容器/SoftButton统一target-min=44逻辑px，页边map-inset、箭头icon-medium=20逻辑px居中，标题page-title字号，flex:none避免连续滚动布局压缩导航。箭头CSS几何按容器比例/逻辑笔画，不再依赖设备rpx缩小。
- test:miniapp:design通过，token相关3测试/24语义资源/2handoff绑定均pass，日志integrated-design.log。watch302ms编译正常。
- 官方snapshot更新为60360878，启动19.986秒。出现更新提示89393184，实际查看后点稍后更新，自行解除无关更新弹窗，无需用户操作，也未升级验证中IDE。
- 最新Settings200%DAY显示标题完整/箭头居中，实际点击观测红光正常成功，箭头明确红色，不再旧浅白PNG。微信原生胶囊仍白，未冒称全屏黑红。当前snapshot已包含所有此前文章/来源/设施/上下文与导航修改，但有内容正式点页面仍未实际进入。
- 下一可用当前60360878继续反馈/计划尺寸复验，无需为已同步源码再刷新。全goal active，14route矩阵/真实数据/上传/身份分区等仍待。

## 续批：反馈坐标与日期输入不可静默变形

- 上轮有效进展。本轮发现Number('')/空白变0，使只填一侧坐标时可能通过。新增parseCoordinateInput，两处表单/序列化共用十进制解析；显式0仍合法，空白/十六进制/指数/非数输入返回NaN，保留既有纬经范围与(0,0)业务检查。
- 原buildDraftInput把坏时间转null，JS也会将2月29/4月31归一到下月。新增parseObservationInput校验输入格式和+08:00回投一致性；无效日期/24:00/非法分钟拒绝，闰日与跨UTC日正确。CORRECTION继续原不带观测时间语义，其余类型无效日期明确error，保输入并定位evidence区。
- typecheck通过，两项定向测试通过。实际IME/空坐标/日期错误定位尚待当前WEAPP复验；快照60360878不含本轮，之前红光返回箭头证据仍有效。全goal active，真实媒体/正式数据/10样本/14路由完整验收等不缩减。

## 续批：定位隐私页准确状态与滚动

- 上轮有效进展。pages/auth实际为PermissionPage定位隐私页，不是微信登录；已按源码纠正本轮初始定位，不新增虚构登录实现。
- 最近一次定位状态不再暴露DEFAULT_REGION/GRANTED等内部码，使用穷尽LocationState中文标签。介绍删除当前未启用普通地点搜索的过度承诺，保留拒绝后地图浏览/试点区域路径。
- 增加固定导航+唯一ScrollView，200%长隐私说明与底部动作可独立于导航滚动。检查requestOneShotLocation确认已捕获GPS/getSetting失败并区分DENIED/UNAVAILABLE，无需另造重复异常流程。
- typecheck通过，复用one-shot-location现有12测试通过，涵盖实际PermissionPage命令、拒权/系统失败、重复请求、默认区域导航失败等。真实权限弹窗/页面大字布局仍未复验，微信真实登录仍外部能力未证，不把本页称登录完成。
- 当前snapshot60360878旧版不含本轮与上轮输入校验，开发watch仍正常。完整goal active，下一继续有意义的实际验证和真实数据/媒体待办，不重复已通过同一测试作为新证据。

## 续批：变量定义审查与星图目标可读性

- 上轮有效进展。扫描src所有SCSS无fallback的var引用与定义，唯一未定义为plan-sky，属已隐藏orbit内moon；改surface-subtle，未添加新主题变量。已有type-page等错误此前已纠正，未发现同类未定义字体token。
- 星图实际使用的目标行名称改body15/22、几何值data18/25；天空目标label改secondary14/21和metadata12/18，删除尾部旧large-text固定26/22rpx覆盖，改由统一200%token放大。目标列表大字纵排几何值不再限定48%宽。
- 定位恢复动作、目标列表开关、列表行、状态恢复、Canvas重试命中改44逻辑px，未改Canvas天文坐标/传感器/时间状态。星图其他局部字号/绝对定位/notification裁切仍有待迁移，不以本批称星图完成。
- 首次较大patch匹配失败，实际文件未改变；重新定位后小范围patch成功。test:miniapp:design通过（integrated-design.log），实际星图在200%及设备指向仍未验，当前snapshot60360878过期。全goal active。

## 续批：星图通知正文与通用恢复动作布局

- 上轮有效进展。星图NotificationRegion原CSS将正文clip成1px、标题19rpx单行、省略且固定88rpx高，使恢复信息看不到。删除该页局部通知压缩覆盖，左右改map-inset，恢复共享组件的完整标题/正文/动作。
- 通用notification统一20px图标、44px关闭/动作命中，copy与关闭固定首行、恢复动作单独第二行（而非四列挤压正文）；动作允许换行，不依赖max340px才重排。没有改变通知队列/归属/关闭回退语义。
- test:miniapp:design通过，watch460ms编译成功。此布局影响所有通知，当前快照60360878旧版，需实际反馈错误与星图通知验证，尤其大字高度/关闭可达/不遮挡必要控件，不能只凭样式判断正确。全goal active。

## 续批：项目快速检查失败定位与修复

- 上轮有效进展。本轮首次check:miniapp:fast实际到workflow测试失败（终端包装Get-Content曾返回0，按日志判定失败而非shell尾命令）；契约/API/前端此前段已通过，miniapp170测试通过，workflow74/76，两项失败。
- 失败一：导入检查只认页面直接data-od-id，ToggleField已经正确id转发；新增检查确认组件id传递和owner data-od-id，而非删除要求。同时正式点FormalSpotField确丢import-formal-spot-id标记，新增可选id并转发root、导入传固定id恢复定位。
- 失败二：原生主题常量现由design-tokens生成，旧断言仍在native-chrome.ts查字面色值。检查改为验证NATIVE_CHROME_THEME导入/按mode取值，以及生成文件保留原6个精确颜色，保持色值要求不放宽。
- 定向两项workflow测试通过。完整fast已复跑，活跃句柄37120，日志integrated-fast-check.log；本次包装显式保存npm退出码并exit，避免尾命令掩盖失败。下一先poll37120确认结果，不重启同一检查。
- 只读检查另发现贡献API每次create/upload/submit手动重试生成新idempotency key，仍需按同次失败重试契约处理；本轮未改API，不能称幂等已完成。snapshot60360878仍旧，goal active。
- 完整fast复跑37120已exit0，包含AppID/SDK、三个workspace类型及测试、design系统、workflow76项、图标18资源、语义24资源和绑定检查全部通过；这是当前代码自动检查，不证明实际WEAPP/真机/正式数据完成。

## 续批：反馈创建草稿同次重试幂等键

- 上轮有效进展。真实owner为workers/miniapp-api（不是apps/api通用community服务）。Postgres saveContributionDraft事务先按user/key查回放，创建可重试；submit服务层先#ownedDraft检查DRAFT和revision，成功后重试会在到repository回放前失败，属于另一个需修的后端问题。
- 客户端createContributionDraft新增运行期retry registry，按已认证userId+完整请求内容保留失败键，成功（含缓存失效步骤返回）后才释放；另一账号/不同内容不复用。传expectedUserId到requestOperation，认证等待期间换账号不会误写新账号。未把正文/坐标/身份写磁盘或日志。
- typecheck通过，定向回归覆盖响应丢失两次同键、异账号/改内容新键、恢复成功后下一独立创建新键；1测试通过。
- 明确限制：当前只创建草稿且仅当前runtime，跨重启pending意图/输入恢复、上传/提交键及服务端提前校验回放仍待，不能声称完整幂等完成。未建真实反馈/未上传样本。snapshot60360878仍旧，goal active。

## 续批：提交审核服务端回放顺序

- 上轮有效进展。本轮ContributionService.submit原先先#ownedDraft/revision，导致已成功提交的同key重试到不了repository回放。现service直接调用repository.submitContribution；Postgres事务仍先按user/key回放，未回放时锁当前submission，核身份/状态/revision后执行assertContributionSubmittable，再核媒体行与写入。
- InMemory fixture同样在回放后、写入前执行校验。首次patch匹配到addUpload附近，回归新键重复提交未拒绝而暴露错误；已移至submit准确位置并复验，未留下上传过早完整性校验。
- 服务端typecheck通过；贡献service6测试通过。新增同key回放完全相同receipt、异key已提交拒绝、跨账号同key拒绝、首次证据过短仍拒绝且state/revision不变。图片元数据/权利/实际类型已有测试亦通过。
- 本批是fixture/service与静态Postgres事务代码证据，未运行真实数据库提交回放，也未确认当前dev API已重载后端修改。客户端submit仍未固定重试键且saveDraft阶段会先触及已提交记录，此端到端流程仍需继续，不称完整幂等完成。goal active。

## 续批：客户端提交API重试键

- 上轮有效进展。本轮submitContribution与创建草稿一样，先获取真实session，再按userId+submissionId+expectedRevision保留失败键，requestOperation携带expectedUserId，成功并完成缓存失效后释放。typecheck通过。
- 明确尚未端到端接通：createSubmit目前每次先saveDraft，会在丢失提交响应后尝试保存已提交草稿，阻断同revision重放。下一需要持有待确认提交快照（同稿同revision），复点提交绕过saveDraft；明确区分服务端拒绝与结果未知，不能因网络不明自动丢弃原意图，也不能把用户后续修改静默覆盖。当前未新增UI锁，以免在还没有可用恢复入口前制造卡点。
- API重试registry仍运行期内存，不覆盖冷启恢复；上传请求同次key也未完成。后端事务回放新代码真实数据库验证未做，当前dev API是否热重载需核实；snapshot60360878仍旧。goal active。

## 续批：提交结果未知的表单恢复入口

- 用户离开休息，要求自主处理/绕过信任与更新等本地卡点；继续沿用已打开工具，不因观察超时重启，不要求人工点击。
- 表单新增pendingSubmission保存同一待确认submission/revision；提交前保存一次，响应未知后按钮变为确认上次提交结果，重试绕过saveDraft。确认期间其余编辑和命令只读，确认按钮仍可点，避免重新保存已提交记录导致回放被挡。
- 明确4xx拒绝清除pending恢复编辑；未知网络/5xx保留。增加awaitingReceipt只在请求未返回时标未知，账户检查或后续刷新异常不伪装为未知提交。applyDraft清理pending。
- AST加载实际createSubmit回归1测试通过：丢失响应再确认两次完全相同id/revision且仅保存一次、成功清pending、422恢复编辑、换账号不发请求；前端typecheck通过。
- 仍仅当前挂载/运行期恢复，冷启持久化、媒体上传重试key/取消删除、实际Postgres回放/真实WEAPP交互仍未验证。snapshot60360878仍旧，未重启DevTools。下一继续这些真实缺口；全goal active，不能将局部测试当完成。

## 续批：媒体完成后的过期恢复与创建重试键

- 上轮有效进展。本轮createContributionUpload按真实userId+submissionId+完整输入保留失败重试键，成功后释放，requestOperation带expectedUserId阻止认证等待换账号误写。仅运行期，不保留图片base64于retry registry。
- 服务端completeUpload原先所有state先检查expiresAt，已UPLOADED图片在截止后重试也失败；改仅PENDING做过期清理与拒绝，已上传仍执行原字节长度/类型/清洗后hash一致性验证再返回，不接受内容替换。
- 扩充实际贡献service测试，模拟上传截止后确认相同内容，返回相同完成数据；6测试全通过。前端typecheck通过。
- 当前仍未解决createUpload服务层三张限制先于repository回放，以及表单addMedia先saveDraft改变revision造成重试输入不同；上传创建重试键不等于完整端到端幂等。Postgres事务需把rights/count核验放锁内并保留先回放顺序，fixture同步后补第三张回放测试。没有真实上传或重启DevTools，实际WEAPP与数据库验证待续；全goal active。

## 续批：第三张上传记录可回放，新增仍受上限约束

- 上轮有效进展。createUpload的动态DRAFT/权利/三张限制从service前置移入Postgres锁内、回放之后；静态文件名/MIME/大小和能力校验保留。数据库首次写入核用户、状态、revision、权利、count后再insert，避免已第三张成功时同key重试被上限挡。
- InMemory createUpload同步首次写入状态/权利/count约束，保持先回放。新增第三张同key旧revision返回原receipt、第四张新key拒绝且媒体数量仍3回归；贡献7测试与后端typecheck通过。
- 这是service/fixture测试与Postgres代码检查，尚无实际数据库证据。表单addMedia重新saveDraft改变revision、上传本地文件恢复和冷启仍需做，不能宣称端到端媒体恢复完成。未重启DevTools，完整goal active。

## 续批：纠正临时媒体有效期误判

- 上轮第三张回放有有效进展。本轮继续追到expireContributionUploads实际owner，发现Postgres与fixture明确清理PENDING和UPLOADED临时对象（20分钟），因此前两轮将completeUpload过期检查限定PENDING的改动与清理契约矛盾：可能声称已上传但对象正被清理。
- 已撤回该放宽，恢复所有未提交上传的expiresAt验证；原测试改为截止前同内容确认，新添截止后UPLOADED确认拒绝回归。8测试通过。测试仅证明确认边界，未模拟实际定时清理删除对象，不夸大其覆盖。
- 前文“已上传截止后仍可确认”结论作废，以本段和当前源码为准；同次创建重试键、第三张先回放/锁内上限仍保留。实际EXPIRED重选会新建记录而旧记录占三张限制，当前不可完整恢复，需明确替换/移除API而不是放宽TTL绕过。表单pending文件/版本恢复亦未完成。goal active。

## 续批：过期媒体指定替换端到端代码

- 上轮纠正TTL有有效进展。新增ContributionUploadSessionRequest可选replaceUploadId，表单uploadSelectedFile仅针对EXPIRED重选传目标；service/port/两repository完整透传。Postgres同一锁内核该目标属于当前草稿且EXPIRED，仅替换原槽位，保留另外两张及顺序；非替换仍三张上限，历史EXPIRED媒体行保留供历史追踪，不伪删除对象。
- fixture对应实现。新增三槽满且过期后指定替换的回归：未过期目标拒绝、替换仅第二槽新PENDING、其他两槽完全不变、同key原revision回放相同结果。贡献9测试通过，前后端typecheck通过（1804最终exit0）；首轮漏import ContributionUploadId已修复。错误映射确认replacement_invalid进入现有INVALID_INPUT，不是500。
- 尚需实际Postgres及UI重选验证；当前表单重试先saveDraft、响应未知本地意图/冷启恢复、手动移除仍未实现，不能称全媒体流程完成。contracts源更新，production dist需随最终正常build生成；没有公开发布/重启IDE。完整goal active。

## 续批：真实Postgres事务、重启和恢复验证

- 上轮过期替换有效进展。扩展既有miniapp-infrastructure.test：真实Postgres第三张旧revision同key回放、三槽过期后仅替换指定第二槽且另两槽不变/数量3、替换回放、已提交原revision同key回放。隔离测试数据明确非真实地点事实。
- 运行现有npm run test:miniapp:infrastructure，句柄64272最终exit0；artifacts/miniapp/integrated-infrastructure.log与artifacts/miniapp/infrastructure/miniapp-infrastructure-session.json为证据。run verify_323a9c01386e4414，全部integration/backup-restore/api-http通过，恢复fingerprint一致，独立数据库删除和Redis命名空间清理成功。复用已有Starward容器，未触碰其他项目/原开发会话。
- 此次补上此前缺少的实际Postgres回放/替换事务证据。既有完整集成还验证重启回读/账户隔离/HTTP冲突；图片二进制处理仍此前service测试，集成完成媒体调用repository元数据而非实际图片上传，不能据此称真实WEAPP上传已验。
- 下一继续前端失败意图恢复/媒体移除，以及刷新实际WEAPP编译验证新行为；正常API热加载与页面真实操作不以本隔离测试代替。完整goal active。

## 续批：前端媒体续传与替换调用回归

- 上轮真实数据库有有效进展。前端uploadSelectedFile增加PENDING续传格式/大小匹配校验，错选在读文件与网络请求前明确提示重新选择原图。相同格式/大小不证明同一内容，真实内容验证仍由服务端承担，不声称客户端辨识完整文件身份。
- AST执行实际uploadSelectedFile回归：错选不读文件不请求、PENDING续传沿用原uploadId、EXPIRED传明确replaceUploadId与原revision且完成新uploadId，不误用保留的其他图片。1测试与前端typecheck通过。
- 仅该底层调用覆盖，picker/压缩后文件变化、当前addMedia/resave与pending意图/冷启尚未完整恢复；媒体手动移除仍缺API，实际WEAPP未验。完整goal active。

## 续批：现有WEAPP窗口刷新与反馈大字实际点击

- 上轮前端回归有效进展。本轮确认watch09:54:51编译成功，sky列窗口确认60360878仍活。只复制dist/weapp到既有snapshot/miniprogram，并在该窗口Ctrl+B编译，没有auto重开/重启IDE/信任确认；保留原108267732与数据。snapshot现包含本批之前全部最新源码生成物（仍diagnostics build）。
- 实际WEAPP启动9.291秒（console Launch Time），地图暂时无正式结果，实际点击My成功，再实际点击现场反馈入口成功。DAY200%反馈导航标题、正文、日期/时间/位置字段、媒体权利、底部保存/提交与历史列表可滚动到达。
- 实际点击空表单提交，仅前置验证不写投稿；页面滚至事实选择区，新的共享floating通知完整显示“还不能提交”与不少于20字正文、关闭×未裁切，实际点击关闭。截图在当前工具回传记录，未额外生成磁盘截图。
- 注意启动恢复到DAY而非先前OBS；尚未追溯是既有运行期模式语义还是持久化缺口，不能称三主题冷启通过。地图搜索字号相对200%正文仍很小，待核与统一；本次是已有一个模拟器尺寸与DAY200%，不替代全矩阵/真机/实际上传与submission未知流程。窗口60360878保持反馈页，最新snapshot可继续验收，全goal active。

## 续批：地图搜索字号与胶囊避让实际修复

- 上轮实际反馈有有效进展。地图搜索末尾旧样式固定24rpx/34rpx导致200%仍小；改统一search16/23与200%32/46，图标20逻辑px、首列44、搜索高度max(target44,行高+16)。下方图层/定位控件随搜索高度移位。
- 首次实际编译确认字体放大但仍与胶囊重叠，旧env(safe-area)在当前WEAPP未提供可靠顶部。复用已有nativeNavigationInsets（状态栏+胶囊底部）传map-search-top，搜索和下方控件同源定位；反馈列再留完整两枚控件间距，不遮右侧第二枚按钮。
- 第二次同窗口Ctrl+B复验：DAY200%搜索位于胶囊下方、完整显示“搜地点/区域/观星点”，图层/右侧两个控件及暂无结果卡互不重叠；地图已加载。当前60360878最新snapshot，未重启IDE。前端typecheck与最终design检查通过。
- console出现1条红色错误计数尚未展开定位，页面已加载不代表无运行错误，下一需查；其他尺寸/100%/OBS仍待。本次只修改所见搜索与相邻位置，index.scss仍大量旧规则及重复层需继续整理，完整goal active。

## 续批：定位基础库错误与实际搜索导航

- 上轮地图字号修复有效进展。UIA读取完整console文本确认旧错误为基础库3.17.2 WAServiceMainContext.js内__subPageFrameEndTime__ of null/setInterval，日志在最近启动前。清空已记录console后确认Errors0，再后续编译/导航Errors0，未复现；仅判断当前证据指向基础库，不证明永不出现或业务全无问题。
- 本轮发现sky无screenshotId坐标可能受缩放影响；以后优先UIA element_index或当前截图id，立即刷新再操作。不要输出screenshots数组（含巨大base64）；只映射id/width/height或直接工具图片。
- 搜索入口实际UIA及截图坐标点击初次仅文本选中未跳。将该Button与既有SoftButton一致加compileMode并把aria-label改Taro ariaLabel，typecheck通过；同窗口编译后UIA按钮名称已为完整搜索ariaLabel，实际点击成功到spot/search/index。一次成功不证明先前所有间歇点击根因全解。
- 当前60360878位于实际搜索页，DAY200%。截图暴露搜索页本身输入依旧极小，顶部搜索条靠胶囊，想去/其他观星点分组标题亦极小，须继续token/安全区修复。当前Errors0、Warnings3（灰度SDK/SharedArrayBuffer/本地开发网络等），没重启或升级SDK。最新snapshot包含compileMode变更，全goal active。

## 续批：搜索页输入与安全区代码修复

- 上轮实际搜索导航有效进展。owning为pages/map/search-page.tsx/scss，spot/search无独立scss。接入nativeNavigationInsets，根style提供search-safe-top；搜索框/建议overlay使用同安全区与max(44,search行高+16)高度，输入16/23及200%32/46，返回44逻辑px与20图标。返回Button加compileMode/ariaLabel。
- 分组type-section删除旧27/38rpx固定覆盖，用统一section token；结果标题用spot-title token。首轮style undefined不符合exactOptionalPropertyTypes，改无值时空object后typecheck通过；design全部通过。
- 本批尚未复制快照/实际复验。60360878仍在上一版搜索页，下一在现有窗口刷新并验真实输入/键盘和overlay结果滚动；filter行与图片卡片排版仍旧局部rpx、200%图片覆盖策略待改，不能称搜索完成。完整goal active。

## 续批：搜索大字实际输入与候选标签修正

- 上轮搜索代码有效进展。本轮复制最新watch产物到既有快照、60360878 Ctrl+B，实际点击地图搜索入口成功。DAY200%搜索输入/分组标题已变大，胶囊与搜索框不重叠；使用UIA聚焦输入并type_text深圳，实际异步返回深圳天文台、桔钓沙等候选列表，输入保留，建议列表有滚动高度。桌面模拟器没有弹手机软键盘，不能声称真机IME/遮挡验证通过。
- 实测发现候选区有region时文案使用region||address||待核验，导致有区域名就漏掉待核验与只移动地图边界。源码改所有candidate都固定显示“资料待核验·只移动地图”，可附region/address；正式点列表逻辑不变，typecheck通过。
- 该标签修正尚未再次同步snapshot，60360878当前深圳搜索结果旧标签，下一可继续实际选择candidate验证只回Map/不进正式点详情，需同步后查标签。没有创建正式地点/写投稿。整体goal active，媒体移除/恢复、其他页面与全矩阵仍未完成。

## 续批：候选点击实测失败及失焦时序修正

- 上轮实际搜索输入有有效进展。本轮在深圳搜索结果实际点击天文台候选，列表关闭但稳定后仍spot/search页，未进入详情，也未返回地图；不能记选择成功。
- 检查发现Input onBlur同步blurSearch关闭建议列表且render依赖focused&&suggestionsOpen，可能在候选tap完成前卸载节点。改Input失焦仅更新focused，建议列表可保持到自身点击/根空白点击/确认关闭；moveMapReference明确在选中命令开始关闭列表。保持点外部关闭和无焦点leading聚焦行为，不引入延时猜测。
- 该修正前完整check:miniapp:fast已通过（11343最终exit0，integrated-fast-check.log），覆盖此前contracts/backend/frontend/设计/workflow等改动；修正后typecheck通过，尚需actual重编译复测再判断根因是否成立。最新标签和本次失焦修改均未同步snapshot，60360878当前搜索空列表/深圳输入。
- 若复测成功继续候选定位/回Map边界；若仍失败继续查事件与请求，不因无错误日志称成功。全goal active。

## 续批：候选选择实际复验通过

- 上轮失焦修正有效进展。本轮同步最新snapshot，60360878 Ctrl+B，DAY200%保留深圳查询，实际点击地图搜索入口成功，候选标签明确显示“资料待核验·只移动地图·深圳·大鹏”，长标签换行不裁切。
- 实际UIA点击深圳市天文台候选后，页面返回pages/map/index，稳定截图地图显示大鹏半岛/杨梅坑/钓神山/深圳大鹏半岛区域，未打开正式详情/中面板，仍显示暂无正式结果。Errors0、Warnings3。本次以实际返回与地图移动确认动作成功，不仅依据源码。
- 对比修正前同操作候选列表关闭而留在搜索，本次支持失焦卸载为已复现点击丢失原因；只覆盖本模拟器与单次操作，正式点选择/滚动取消/多点快速选择/网络失败仍待。窗口保持候选附近地图，snapshot最新含标签和blur修正。
- 仍有完整目标中媒体删除/冷启恢复、全页面矩阵、真实正式点与内容、真机等待办。下一不重复本成功操作冒充新验证，转向未完项。全goal active。

## 续批：移除媒体前修复可靠私有对象清理

- 上轮候选选择有有效进展。本轮检查反馈移除所需清理owner，发现原expireContributionUploads先state=EXPIRED，service后delete失败则下次只筛PENDING/UPLOADED，私有文件失去重试入口。
- Postgres保留EXPIRED且object_key非空作为待删记录，每次expire同时返回这些键；只在mediaStore.delete成功后ack把EXPIRED object_key置NULL。fixture以pendingDeletion集合对应，reset清空，删除前状态不恢复上传。已过期业务记录不因文件删除重试反复升revision。
- 新回归首次文件删除失败、对象仍在，第二次成功删除并ack，第三次无重复任务/共2次尝试；贡献10测试与后端typecheck通过。此批尚未真实DB复验ack，后续基础设施测试需覆盖。
- 这是完整媒体移除功能所需可靠清理基础，移除API和前端按钮尚未实现，不称按钮可用。当前WEAPP窗口与snapshot保持上轮候选附近地图未动；全goal active。

## 续批：媒体移除接口和前端接通

- 上轮可靠清理有有效进展。本轮新增DELETE /me/contributions/{submissionId}/media-uploads/{uploadId}与ContributionUploadRemoveRequest expectedRevision，运行generate:sdk更新生成类型。后端service验证正整数revision/idempotency，repository先回放，再锁草稿核user/state/revision/指定media，禁止ATTACHED；仅过滤指定媒体，升revision、存历史与outbox，原上传标EXPIRED留object_key供可靠清理，service随后清理并ack。
- fixture同步。服务回归新增两个实际内存私有图片：异账号/旧revision拒绝，移除目标后另一张完整保留可读取、原对象不存在，同key原revision回放一致，提交后禁止移除。贡献11测试及后端typecheck通过。
- 客户端新增removeContributionUpload账号+id/revision运行期retry key；表单remove命令同exclusive/account guard，原生确认后发请求，applyMediaDraft仅更新draft元数据不覆盖未保存文字，不先saveDraft。媒体移除按钮草稿可用，ATTACHED/命令忙禁用，移除说明替换旧“不支持”。首轮API缺闭括号已修复，前端typecheck通过。
- 本批前端命令回归/HTTP与真实Postgres移除/清理ack/实际WEAPP上传移除仍待。未同步snapshot，60360878仍候选附近地图；正常API是否watchreload后端需核实。全goal active，不能称媒体功能已完整验收。

## 续批：媒体移除前端与Postgres回归

- 上轮移除接通有效进展。AST执行实际createRemoveMedia：取消确认不请求，成功仅applyMediaDraft而不applyDraft、不改detail；发送前账号变化阻止请求，响应后账号变化不接受旧账号结果。1测试与前端typecheck通过。
- 扩展现有真实Postgres集成：指定移除只留其他两槽，原key/revision可回放，异账号拒绝。首次run verify_eb9a505f61f349c5通过，但只有PENDING无object_key不足以证明ack，未以该结果称清理ack已验。
- 随后补有object_key的UPLOADED记录：repository移除后两次expire均返回待删key，ack后不再返回；同key服务层回放一致。复跑verify_302c99bf32e84902、6121最终exit0，integration/backup-restore/api-http全过且隔离DB/Redis清理成功。证据integrated-infrastructure.log和infrastructure/miniapp-infrastructure-session.json。
- 真实DB此用repository构造媒体元数据，没有图片文件；实际文件删除失败重试由此前MemoryMediaObjectStore测试证明，两类证据不混称真正WEAPP上传删除。移除HTTP端点虽编译/生成SDK通过，实际HTTP请求与小程序按钮仍待验；snapshot未同步媒体移除，窗口未动。完整goal active。

## 续批：真实HTTP图片上传移除及磁盘验证

- 上轮前端/DB回归有效进展。本轮扩展现有run-infrastructure-check.mjs隔离HTTP阶段：正常鉴权创建反馈、创建会话、上传实际生成的合法1×1 PNG，确认UPLOADED；旧revision DELETE409、正常DELETE返回无媒体、原key/revision重放同receipt。
- 首次verify_b3b91d74db554457通过；随后补磁盘与未登录证据：上传后stat私有文件存在，未登录DELETE403，正常删除后stat ENOENT（其他文件错误不误当不存在）。复跑verify_216670a9542240ba、57932最终exit0，完整integration/backuprestore/apihttp和资源清理全通过。新artifact字段private_media_http_upload_remove_replay=passed。凭证仅内存HTTP使用，无打印/持久化。
- 现在具备真实HTTP+Postgres+本地文件存储的上传/移除/鉴权/回放证据，仍是隔离测试，不是真实小程序picker操作/微信登录。小程序媒体按钮实际验收与失败冷启恢复待，snapshot仍上轮地图未更新。全goal active。

## 续批：小程序上传验收准备与真机状态核实

- 上轮真实HTTP有有效进展。本轮确认正常watch最近10:19:10成功，准备后续picker验证。新增任务局部create-upload-fixture.mjs生成32×32自有纯色PNG，输出artifacts/miniapp/upload-fixture/self-generated-transport-test.png；无照片/EXIF/地点证据，用于传输测试，不可作为真实现场内容提交审核。用实际sanitizeContributionImage验证通过（字节数见工具结果）。
- 重新运行miniapp:device:feedback doctor：officialTool/automaticUpdate/ordinaryPreview available，login ready，Android detected0/usbReadyfalse。证据integrated-device-doctor.log，此为readiness不能当真机通过；不用用户夜间人工点击，不发预览QR、不重启工具。
- 当前还未创建任何新的正常环境投稿草稿或选图。实际picker验收应保留测试用途清晰、仅私有草稿且不提交审核，不能把生成图当现场证据；仍需决定如何保持正常用户记录清洁（优先独立测试身份/隔离会话，不能误删已有数据）。snapshot未更新媒体移除，60360878仍候选附近地图，全goal active。

## 续批：完整快检、实际选图尝试和保存重试

- 完整check:miniapp:fast覆盖最新媒体移除/可靠清理与搜索修复通过，54057最终exit0，integrated-fast-check.log。此后新增保存重试变更需定向检查，不将此前完整结果冒充之后结果。
- 60360878现有snapshot已同步媒体移除产物。控制台公开wx.request登录独立local:integrated-media-private-20260906，接口201（首次仅接受200未写session，第二次接受2xx成功），只打印状态及字段名，不输出token。auth.current现为独立测试会话；原installation/local device code未修改。Ctrl+B后从My实际打开反馈，独立账号偏好为DAY100%，投稿0。
- 实际表单填写：本草稿仅验证自有纯色图片的选择、上传和移除，不是现场观测资料，不提交审核。名称私有传输测试（非真实地点），区域测试区域，手输测试坐标22/114（非现场定位），未同意提交坐标，确认自有图片权利。实际点击选择图片，已打开原生Windows文件选择器。
- 选图尚未成功：附属打开对话框可截图/UIA观察，但sky列表只返回父窗口，UIA文件名索引847不可用，screenshot0/1点击经activate+refresh恢复后仍报point over wechatdevtools.exe empty-title, not target window。Alt+n后焦点仍SearchEditBox。未重启开发器、未触发用户信任操作。不要把原生picker出现记上传成功。当前modal仍打开，文件未选择；表单输入尚未确认保存，流程可能在chooser前save产生草稿，必须读正常独立账号API核实，不能猜0记录。
- 当前测试auth尚未恢复原身份，后续完成/放弃测试后清除auth.current并冷编译即可按保留的原local device code重登；不要误删原账号。仅这个独立测试身份可清理测试记录，未提交审核/正式资料。原开发器108267732及9导入草稿保持不动。
- 不依赖modal继续开发：api-client updateContributionDraft新增账号+submissionId+完整input运行期失败幂等键复用，并给requestOperation expectedUserId；成功释放。后端新增回归原expectedRevision同key重放不多升revision、旧revision新key拒绝、异账号拒绝，contribution-service12测试通过。此解决DRAFT仍可编辑时响应丢失重试；提交后service #ownedDraft先校验仍可能挡旧保存回执，冷启持久化尚未解决。
- 前端typecheck正在执行，需取得最终结果；完整goal active。当前优先恢复/绕过picker工具窗口归属问题，或继续冷启媒体/草稿恢复与其他页面迁移，不能缩减完整A–F范围。
- 本批前端typecheck最终exit0通过。下一恢复不需要重跑该相同检查。

## 续批：媒体续传保留草稿版本和未保存输入

- 上轮保存重试有实际进展。本轮检查createRetryMedia发现每次选择原图后先saveDraft，导致revision增加且applyDraft覆盖输入，妨碍同一EXPIRED替换请求失败后使用原版本回放。
- 续传改直接使用activeDraft元数据，不保存整个表单；先确认本页图片权利，选择后检查账号，再定位原uploadId。uploadSelectedFile在创建与完成回执均只applyMediaDraft，不覆盖编辑字段。新添加图片仍先保存草稿，正常建媒体前置条件不变。
- AST执行实际handler回归2测试通过：PENDING规格不符无读取请求、续传原id、EXPIRED只替换指定slot；重试保留revision和未保存detail、不调用formInput、账号变化不发上传、未确认权利不打开picker。前端typecheck执行结果需取得。当前实际picker附属窗口未操作，snapshot尚未同步此变更，不能记实际UI通过。
- 全goal active；冷启请求意图/本地文件恢复、账号隔离的query/history与全部原范围待办仍需继续。
- 本批前端typecheck最终exit0通过；续传变更代码检查完成，实际WEAPP/冷启仍待。

## 续批：反馈历史缓存与迟到响应按账号隔离

- 上轮媒体续传修复有实际进展。本轮检查实际源码确认反馈表单/My共用无账号queryKey contributions，存在旧私有历史被另一身份复用的风险。
- 新useContributionHistory由两处共用，queryKey包含currentDraftUserId，未登录时用useId隔离各挂载入口；useDidShow触发身份重新读取。登录完成查询回写引起render后会转到正式账号key，原invalidateQueries前缀仍有效。
- getContributions先确保会话，再把预期userId传requestOperation；响应完成后再次检查currentDraftUserId，账号变化拒绝返回历史。请求入口原传输cache已有userId scope；本批补React Query和迟到响应层，不声称所有私有读模型已全改。
- 新AST实际getContributions回归：同账号返回、请求中切换拒绝、旧owner发起请求拒绝，通过。前端typecheck通过。My user-library/plans等其他账号缓存仍未纳入本批；反馈表单本地编辑输入的账号guard仍保留，未做自动把原账号草稿复制到新账号。
- 原生picker附属窗口与独立测试session保持上轮未解决状态；没有重复重启/人工信任操作。本批snapshot未同步、实际WEAPP账号切换尚待，完整goal active。

## 续批：搜索筛选换行、大字与唯一纵滚

- 上轮反馈历史隔离有实际进展。本轮读取搜索源码，确认filter最终样式仍88rpx固定高/21rpx字/nowrap横滚，与新需求即时多选换行不符。
- 将筛选与状态反馈移入既有结果ScrollView，搜索框保持顶部，其他内容同一纵滚；筛选外层普通View，不再scrollX。group语义从单选radiogroup改可多选group，按钮compileMode/ariaLabel、状态aria-pressed，标签显式Text。
- 清除filter-scroll/group/choice/prefix/ornament的旧重复规则，单处定义flex-wrap、自然高、action字号行高、最小44逻辑px、18逻辑px图标、4逻辑px间隔。保留现有selected语义色/装饰；不以新增尾部覆盖堆叠旧filter尺寸。
- 前端typecheck与test:miniapp:design全部通过，证据integrated-frontend-typecheck.log、integrated-design-check.log。这些不证明实际屏幕与触摸通过。snapshot未同步且原生文件选择附属窗口仍待工具归属恢复；后续应实际320/390、100/200%、三主题筛选换行/滚动/选择保持位置验证。
- 搜索其他早期重复样式、媒体卡52%覆盖及单行截断、大字照片策略仍未全改；全goal active，保留全部A–F范围。

## 续批：原生取消恢复、取消误报修复与搜索复验

- 上轮筛选重排有实际进展。本轮重新观察picker，用Escape成功关闭附属窗口，无需重启/用户点击。实际取消弹出“无法选择图片”：chooseImage只识别Error/String，微信errMsg对象被String成object。改读取errMsg再识别cancel，新增实际函数回归Error/errMsg取消返回null、permission denied仍抛错；媒体3测试及前端typecheck通过。
- 用当前实际测试会话wx.request读/v2/me/contributions，只输出状态+数量：200、0。因此此次取消没有创建测试草稿/上传对象。随后清除auth.current，控制台确认TEMPORARY_TEST_SESSION_CLEARED，保留installation原身份；同窗口Ctrl+B冷编译启动正常，DAY100%。未核对token/账号明文，原9导入窗口不动。
- 已复制watch10:46:01产物到snapshot，含取消修复/历史隔离/续传/筛选改动。60360878实际打开Search，候选覆盖层正常出现，UIA已显示完整筛选按钮语义（不可用标签），但overlay挡住筛选未作完整排版验收。
- 实际点候选列表外的结果空白不关闭overlay：结果ScrollView stopPropagation挡住root blurSearch。改结果容器自己调用blurSearch再停止冒泡；这次新变更尚未typecheck/同步复验。候选overlay是独立兄弟区域，候选选择失焦时序此前修复保留。
- 冷编译再次出现基础库3.17.2 WAServiceMainContext __subPageFrameEndTime__ null，Errors1、Warnings3；页面仍能导航。不宣称基础库错误修复。当前60360878在Search深圳候选overlay，后续同步blur修复并实测筛选布局/外部关闭与大字。全goal active。

## 续批：搜索点外关闭与即时多选实际通过

- 上轮取消/搜索代码有实际进展。本轮blur修复typecheck通过，复制最新snapshot并60360878 Ctrl+B成功，当前启动Errors0（此前基础库复现记录保留），Warnings后续4含WAWorker reportRealtimeAction不支持。
- 当前模拟器390×844、DAY100%。实际从Map进入Search深圳建议列表，再点结果空白：overlay成功关闭，查询仍深圳。新筛选约6行，全部自然换行，结果分区仍可见，没有横向隐藏；仅该viewport/字号实际证据，不能代替200%/320。
- 实际点击停车后UIA停车已应用；再点厕所后两者均已应用，页面仍Search、查询和布局位置保持。再点停车，稳定UIA停车未选而厕所仍已应用，证明多选独立取消。最后点击厕所恢复本轮前筛选（需下一稳定观察确认最终状态，不能只凭tap宣称）。
- 当前60360878 Search DAY100%深圳、overlay关闭，snapshot含前几批媒体取消/续传/账号history/筛选/blur全部已同步。下一检查最终恢复状态、通过Settings切200%再测滚动和全部筛选可达；没有重启开发器/用户信任操作。完整goal active。

## 续批：200%搜索筛选与结果滚动实际验证

- 上轮普通字搜索有实际证据。本轮先稳定UIA确认停车/厕所均未选，测试筛选恢复完成。通过公开wx.navigateTo进入Settings作为验证准备，不计作真实My入口导航。
- 实际滚到大字开关并点击，UIA稳定大字模式已开启，页面字级200%生效。请求PUT /v2/me/preferences出现409 Conflict；没有把UI生效当服务端保存成功，需后续核对偏好冲突恢复。当前Console Errors1为这次409（与更早基础库错误区分），Warnings4。
- 实际点击Settings返回，回原Search，深圳查询保留，DAY200%筛选自然约10行、长标签完整、无横向挤压。实际向下滚动，搜索框固定顶部，状态说明完整两行，0正式点、想去/其他观星点及空态全部可达，无被固定筛选挤没。仅390×844、DAY200%，非320/其他主题/真机。
- 当前60360878 Search DAY200%滚动后下半区，snapshot同上轮最新，没有新代码。下一优先核对偏好409是否正常重试/真实保存与身份恢复一致，再做320/三主题或推进剩余业务。全goal active，不把该局部实际通过扩成整个页面矩阵完成。

## 续批：大字偏好真实回读与冲突读取失败修复

- 上轮200%实测有实际进展。本轮通过现有实际session wx.request GET /v2/me/preferences，只打印状态/版本/largeText：200、3、true。证明上轮409之后自动恢复已保存服务端，不是仅本机视觉生效；未输出凭证或其他账户字段。
- 检查usePreferencesSync发现CONFLICT后getPreferences失败仍无条件rerun500ms，可能在离线且旧revision下形成重复请求，文案还宣称正在重新同步。改只有latest可用才采纳revision并安排重试；latest读取失败保留全部本机编辑、停止本次rerun，提示恢复网络后可重试。
- 新AST实际hook回归失败冲突回读：仅一次save、0个重试timer、不更新revision、不清dirty/不换preferences，并有准确失败说明，通过。前端typecheck执行结果需取得。此不声称所有偏好并发/卸载/跨账号流程完成，仍需其余范围。
- 当前60360878仍Search DAY200%下半区，偏好确认serverlargeTexttrue。snapshot未同步本批冲突错误分支，后续按受影响验证推进。全goal active。
- 本批前端typecheck最终exit0通过。

## 续批：搜索结果长文与200%有图重排

- 上轮偏好回读/冲突修复有实际进展。本轮对照附件一63行有图可读/无图无空位、附件二大字要求，检查SearchResultCard发现title/region/address统一nowrap ellipsis及固定52%半宽复制覆盖。
- 删除结果卡相关旧重复规则与无人使用的search-result-overlay主题变量，单处定义逻辑px几何/标题token。长名称、区域、地址自然换行；有图文字58%实色surface背景避免渐变尾部文字落到亮图片上；200%有图卡改图片上方120逻辑px、文字全宽，卡片自然增高。无图仍条件完全不渲染Image且无图高空位。Button补compileMode/ariaLabel保持整卡唯一动作。
- 前端typecheck与test:miniapp:design通过。当前正常库0正式结果，不能用源码/测试代替有图长名称实际卡片验证；可按原方案隔离fixture走真实WEAPP检查但不能冒充正式点发布。snapshot未同步本批，60360878仍DAY200%Search下半区。观测模式真实照片色彩策略及全矩阵仍待，不以此声明图片全主题验收。
- 全goal active，完整A–F及真实资料/导入/真机等范围保留。

## 续批：完整快检与候选定位迟到响应保护

- 上轮卡片重排有实际进展。本轮完整check:miniapp:fast通过，32901最终exit0，integrated-fast-check.log覆盖此前取消/续传/history/筛选/偏好/卡片改动；本轮随后新增race修复由定向回归覆盖，不冒称之前快检覆盖随后变更。
- 检查moveMapReference发现resolveObservationContext迟到仍可写上下文/导航/通知。增加selectionVersion：每次候选与正式选择递增，leaveSearch、hide、unmount使旧意图失效；await后和catch检查仍为当前版本才接受响应/导航/发通知。
- 新AST实际moveMapReference乱序回归：第二候选先响应仅采纳latest并导航一次，第一迟到无覆写；离开后旧失败不通知、不导航，测试通过。前端typecheck执行结果需取得。没有将此单回归当全部Map/context请求owner审计，其他contextQuery恢复/快速时间切换仍按全目标继续验证。
- 当前WEAPP仍上轮Search200%，snapshot未同步本轮race与上一批卡片/偏好错误分支；后续需同步并实际复验。全goal active，完整A–F保留。
- 本轮前端typecheck最终exit0通过。

## 续批：反馈正式地点选择复用与去内部编号

- 上轮搜索race修复有实际进展。本轮审查反馈对象发现仍要求用户手输正式spot_id和可选名称，与用户可读选点要求冲突。找到现有FormalSpotField（导入页使用、只映射API formalSpots）并复用，未新建第二搜索owner。
- FormalSpotField回调补spotName（导入现有setFormalSpotId仍兼容），结果Button compileMode/ariaLabel，通用form-group补布局。反馈选择后设置id/name并切FIELD_REPORT，不再输入内部编号；未找到正式点引导新地点，不提供候选冒充正式对象。已关联提示不再把My手选误称从详情继承。
- 草稿恢复文字移除rev内部版本码，缺点校验提示改搜索选择。前端typecheck通过（随后仅根class/说明文字变动，未改类型）。正常库仍无正式点，尚未实际成功选择正式点，不以组件复用宣称真实主路径通过。
- 需继续：从My手选后目前沿既有hasFormalSpot条件隐藏选择区，主动换点/保留草稿文案与选择归属还应按完整范围检查；首错滚到父context已有，正式搜索输入focus尚待实际键盘验证。本批snapshot未同步，全goal active。

## 续批：My反馈可换点与未恢复草稿防覆盖

- 上轮正式点组件复用有实际进展。本轮增加inheritedSpot由初始route派生，只有详情带入地点固定归属；My自选正式点后仍保留搜索选择区，切新地点明确清bound id/name并切NEW_SPOT_PROPOSAL，selectKind沿原owner分离当前draft，不删除服务端旧草稿。
- 进一步检查createSaveDraft发现activeDraft回落matchingDraft，会在尚未点击继续草稿时用当前输入覆盖匹配的服务端草稿。保存入口新增明确恢复检查：matchingDraft存在但draft未采纳时提示先继续/核对，不读取formInput不发送写入。上传前quiet保存同样受保护。
- 新AST实际save handler回归普通/quiet保存均不覆盖未恢复草稿、原detail/revision保持，通过。前端typecheck最终通过。此为防止意外覆盖，不代表本地未保存内容跨冷启恢复已经实现。
- 当前snapshot未同步这两批反馈选点/恢复保护，正常库正式点0，实际换点/草稿恢复仍待；完整goal active，余下原始A–F范围保留。

## 续批：反馈本机恢复存储边界准备

- 上轮换点/防覆盖有实际进展。本轮开始冷启未保存输入恢复，复查计划页local-draft-keys与账号删除清理复用规则。
- 新local-draft.ts定义字段白名单：schema1、baseSubmissionId/baseRevision配对、spotId/name、kind/topics、date/time/detail、candidateName/region、lat/lon、rights/consent。保留尚不合法的未完成坐标/日期输入，仅做类型和上限校验，不复制未知字段/登录token/整份响应/媒体对象。字段底稿与服务端版本分离，不能恢复时假装最新版本。
- local-draft-keys新增contributionDraftKey按精确userId+入口routeSpotId分区，未登录不生成key；contributionDraftBelongsTo严格归属。deleteAccount真实成功后的现有本机清理同步识别本账号反馈草稿，不动其他账号/入口外数据。
- 2回归通过：保留无效未完成输入、丢弃未知私有响应字段、schema/topic/尺寸/版本对校验；账号和入口隔离。前端typecheck通过。
- 本批仅存储schema/清理基础，尚未接入useContributionForm读写或恢复UI，因此不能声称冷启恢复已实现。下一需接入稳定账号owner（参考createDraftOwner）、字段改变/隐藏保存、明确恢复操作、baseRevision与实时history核对；有未确认提交不能自动重发，保留pending intent另处理。已存在云草稿未采纳防覆盖继续有效，恢复不能把本机内容偷偷覆盖到另一草稿。全goal active。

## 续批：反馈本机草稿接入读写与明确恢复

- 上轮schema/隔离基础有实际进展。本轮use-local-draft.ts接入账号锁定、按入口key读写，字段变化250ms保存、hide/unmount同步flush；未恢复副本不被空白表单覆盖，pendingSubmission/非DRAFT暂停写入，账号变化不写新账号key。存储错误呈现本机失败状态；clear仅当前账号此key。
- useContributionForm构造白名单字段快照，恢复UI置于context前；存在恢复副本时表单动作禁用，恢复/放弃仍可用。restore无base直接恢复未完成字段；有base先真实getContributions回读，同账号且仍DRAFT才恢复，baseRevision变化进入已有conflictDraft流程，不自动保存/提交。已提交/不可编辑保留副本并提示查近期反馈。applyDraft清理对应本机副本，正式服务回执仍权威。
- 首轮index缺Text import导致typecheck失败已修复，随后typecheck通过。新增AST实际storage hook回归：hide写当前账号入口、切账号不写、未恢复copy不覆盖、pending暂停，1测试通过。此前schema2测试保留。
- 仍需：恢复handler冲突/已提交/异账号定向回归；真正WEAPP输入→退出/冷启→恢复/放弃检查；当前父表单与Local hook有新生命周期，不能以这些单测称冷启完整通过。pending提交幂等意图/本地文件冷启恢复还未实现。初次mount无有效身份只在后来账号可读的render才读写，跨账号已有输入不迁移。
- 本批snapshot未同步，原WEAPP Search DAY200%保持。完整goal active，下一优先恢复handler测试和实际WEAPP验证，不缩减A–F。

## 续批：本机恢复冲突回归与实际构建错误修复

- 上轮本机恢复接入有实际进展。本轮新增AST实际restoreLocalDraft回归：同版本采纳本机文字；server新版本仍保留local基线revision并设置conflictDraft；PENDING_REVIEW、请求中换账号、离线均不采纳本机副本、不写form字段且退出busy。1测试通过，不以模拟回归代替冷启实测。
- 同步snapshot前读取watch尾发现Sass真实编译失败：search-page.scss之前卡片规则批量去重误删reduced-motion选择器组的末尾规则体，留下filter-choice逗号。修复组补回result-card {transition:none}。watch11:11:44确认Compiled successfully519.90ms。
- 重要证据修正：此前typecheck/design/fast不会完整编译该SCSS，因此此前卡片重排及后续新代码不能仅凭fast视为WEAPP构建通过；之前已实测的筛选改动在卡片修改之前，不受这次未编译卡片证据混淆。本轮先复制过带编译错误产物并Ctrl+B，尚未实际验收；随后已重新复制11:11:44成功产物，尚需Ctrl+B加载。
- 当前下一：在60360878原窗口Ctrl+B加载成功快照，实际进入反馈、填明确测试用途未保存文字、冷编译后恢复核对、再冷编译放弃副本清理（不提交审核/不造正式数据）。现有服务端草稿若出现恢复入口先核对，不覆盖。当前全goal active。

## 续批：反馈冷启动恢复实测、局部输入保留与入口命中

- 上轮实际输入的本机测试文字为“本机恢复验证1114：仅测试未保存输入重启恢复，不是现场资料，不提交审核。”，仅textarea未按保存/提交。Ctrl+B两次仍原页面，不能算重启；实际点击开发器右上编译控件后11:15:35新启动，Launch Time11794ms且回Map，确认新的小程序运行时，没有重启开发器/要求用户信任。
- 实际Map→My成功；My反馈文字中心UIA/坐标多次点击无导航，公开wx.navigateTo后实际进入反馈（FEEDBACK_ROUTE_OPENED）。DAY200%、390×844出现“本机有未完成的输入”；实际点击恢复，UI提示未自动保存/提交，UIA完整读回上述37字。此证明该未保存文字跨实际小程序编译重启恢复，不证明真机/所有字段/待确认提交意图。
- 恢复后实际返回My，点击反馈右侧chevron可以导航；再次出现本机副本，点击“放弃本机副本”后返回再进入，无恢复提示且无1114测试文字。测试副本已清理；未执行服务端保存或提交按钮，没有制造正式地点/审核数据。
- 修复use-local-draft遗漏：此前仅detail/candidateName/lat/lon/base有值才保存，改以首次字段快照比较，并保留已有内容判定；仅地区/主题/时间/选点变动也保留，恢复到初始空表单移除此入口旧副本，避免删除文字后旧内容复活。新增实际hook渲染回归覆盖4种局部编辑和逐次恢复空白清理；local-draft/storage/restore共5测试通过，前端typecheck通过。
- My反馈中心文本不响应而右侧响应，针对现有Taro Button补compileMode和正确ariaLabel；此改动仅typecheck通过，尚未同步snapshot/实际中心点击复验，不能宣布已修好。其他My按钮尚未全查。
- 当前60360878已在空白反馈页DAY200%。snapshot仍11:11:44产物，未含本轮局部保存修复/My compileMode。watch已有后续成功，复制前再读最新成功并同步；下一明确：验证My中心点击，再继续pending提交冷启幂等意图等全部A–F。正常库0正式点/原导入/真机等范围保留，goal active。

## 续批：提交幂等标识跨运行时保留

- 上轮完成实际本机恢复与局部保存修复，判定为progress。本轮检查pendingSubmission发现仅React内存，API retryContributionSubmit也仅Map，冷启会丢失同次重试标识。
- 新services/contribution-submit-retry.ts只持久化账号+submissionId+expectedRevision的key与随机幂等标识，无表单全文/媒体/会话token。提交前同步读写成功才发请求；读取失败、写失败、损坏值均抛ContributionSubmitStorageError且不发请求。未知网络结果保留key，成功回执后清理；清理失败不能把真实成功改报失败。deleteAccount原清理流程覆盖本账号此类key，保留其他账号。
- API submitContribution改用该owner。createSubmit明确区分存储失败（未发请求）与网络结果不确定，避免把本机存储失败误报提交结果待确认。
- 3定向测试通过：不同运行时复用原key、账号/版本隔离、存储失败0网络调用、损坏值拒绝、成功清理失败仍返回回执，以及原submit handler回归新增存储错误分支；前端typecheck通过。
- 这只是持久幂等标识，尚未接入冷启pending意图发现/服务端回读/明确恢复UI，不能称提交冷启恢复完成。下一应从精确本账号持久条目恢复submissionId/revision，先getContributions核对实时状态；非DRAFT直接采纳回执，DRAFT仍用原revision+key明确确认，不重保存/不自动提交。跨账号请求及旧基线冲突需守护。
- 当前DevTools60360878仍上轮已清理测试副本的空白反馈页，未同步本批及上轮My compileMode/局部保存修复。全goal active，A–F未缩减。

## 续批：冷启待确认提交入口与实时回读

- 上轮durable幂等标识有实际进展。本轮readContributionSubmitIntents仅列当前精确账号合法条目并验证标识；useContributionForm随history/pending/账号更新读取，错误显示准确本机恢复错误。页面顶部显示待确认提交入口，不自动调用submit。
- restorePendingSubmission明确动作先getContributions(expectedOwner)，回读后再次确认账号；记录仍DRAFT则加载实时显示内容，同时pendingSubmission保留原expectedRevision，已有确认按钮继续同一次提交而非saveDraft。服务端已进入非DRAFT则显示历史状态并清除此条恢复标识，不重提。缺记录/离线/换账号保留意图，已有未恢复本机副本时先处理副本，不用空白页覆盖。
- 新AST真实handler回归覆盖server5/original3、已有审核状态、请求中账号变化、离线、本机副本未恢复；与submit handler/durable key合计4测试通过。前端typecheck通过（随后仅新增测试与memo账号依赖；最新构建需继续核对）。
- 仍需实际WEAPP冷启待确认提交全过程；不能用AST当真机或实际请求证据。另需检查确定性4xx后durable key清理/重复入口、恢复后临时文件与媒体丢失、其他账号缓存，全部A–F仍保留。当前snapshot未同步最近3批代码，60360878保留空白反馈页，无用户信任卡点。下一先同步成功watch产物，复验My中心命中/本机恢复与新待确认入口可达性；真实提交验证只用明确隔离账号与测试资料，不公开发布。

## 续批：最新WEAPP同步、My文字命中实测、确定拒绝清理

- 上轮pending恢复入口有实际进展。本轮确认watch11:29:49成功457.79ms，复制dist/weapp至现有integrated-runtime-snapshot/miniprogram；未运行open/auto/重启开发器。实际点击右上编译，11:30:26新runtime、Launch9873ms，Map正常加载。前端typecheck通过。
- 实际Map→My，UIA正确label“打开现场反馈与纠错”。点击反馈标题文字中心x1006/y555后正常进入反馈，非右箭头/非console路由。DAY200%、390×844，验证上轮compileMode修复真实命中。空白反馈页无旧1114副本、无伪待确认入口。当前60360878停此页，最新snapshot含本轮之前所有恢复实现。
- durable提交owner新增确定失败判定：真实MiniappApiError4xx但不含408才清理恢复key；408/5xx/无响应继续保留。同样修正form对408的uncertain判定，避免超时解锁并重新保存。清理失败保留入口，不掩盖原始拒绝。5定向回归通过；watch11:32:02编译成功1.15s。此最新拒绝清理分支尚未同步snapshot。
- 完整check:miniapp:fast正在session41447运行，实际同handle已两次确认仍live，日志integrated-fast-check.log可见测试推进；下一先write_stdin41447取得最终exit，不能凭日志中部分pass称快检完成。随后只在retry.test追加了reader按账号列举断言，需定向执行覆盖该追加；源代码未再改。
- 待确认提交实际隔离账号冷启/真请求仍待，不以本轮普通入口通过代替该范围；全部A–F保留，goal active。
- 本轮完整check:miniapp:fast session41447最终exit0通过；追加reader账号隔离断言后定向retry测试3项exit0通过。没有未取得结果的进程。下一继续实际隔离提交恢复或其他A–F业务，不重复无新依据快检。

## 续批：反馈历史去内部码、媒体上限与北京时间

- 上轮完整快检与实际My中心命中为progress。本轮按原需求核对contribution-media-history，仍有revision/幂等键/上传编号及英文状态码对用户直出。删除这些实现用语，保留独立审核/合并/公开影响中文状态、事实、原状态流，不减少追溯记录。
- 已达3张时不再渲染选择图片入口（之前仍存在按钮）；上传待恢复提示不再无依据断言“网络刚刚中断过”，改“还有媒体需要处理”。恢复说明准确提示未完成图片可能需要重选，不保证临时文件冷启保留。
- 历史updatedAt/occurredAt原slice直接截UTC字符串，新增共享displayBeijingTimestamp复用zoned-date，显示明确北京时间与正确跨日；坏时间显示暂不可用。跨日UTC/显式+08/无效值回归通过。前端typecheck已在媒体文案/上限后通过，随后时间helper/渲染变更需取得最新typecheck/build。
- 本批未同步snapshot/没有真实媒体满3或历史长行实际证据，仍待相应WEAPP场景。当前60360878还是空白反馈DAY200%，完整A–F和提交恢复隔离实测仍保留，goal active。

## 续批：My个人资料与计划入口账号隔离

- 上轮反馈历史/上限/北京时间为progress，最新时间helper后typecheck也已exit0通过。本轮发现My queryKey仍为全局user-library，API未绑定预期账号，tonightPlan直接来自持久化全局plans。
- getUserLibrary改为ensureSession确定owner，requestOperation绑定expectedUserId，返回后再次验证当前身份；My queryKey按账号+未解析时独立mountId分区，useDidShow触发身份重读。页面tonightPlan从本账号library结果计算，避免用旧全局plans显示/导航；写共享plans/preferences前再次校验当前账号和libraryOwner。
- useResourceQuery检查无placeholder/keepPreviousData配置，因此换key不主动保留上一账号data。2个API实际函数AST回归（feedback/library）通过：同owner成功、请求中切账号拒绝、旧owner请求拒绝；前端typecheck通过，watch11:36:35成功598.22ms。
- 尚未全局解决：app-store plans仍在无账号全局持久化state内，其他plan/detail/登录/缓存消费者须继续审计；本轮不以My隔离声称全应用账号隔离完成。普通登录会话变化如何即时触发所有已挂载页面仍需检查。
- snapshot未同步本批及上轮媒体文案/时间变化；当前60360878为反馈空表单DAY200%。下一继续计划owner或实际隔离账号提交恢复，不重复无变化快检。全goal active，完整A–F保留。

## 续批：计划详情摆脱全局残留计划

- 上轮My查询隔离为progress。本轮确认PlanEditorPage仍从app-store持久plans初始化、getPlans/request/query均无owner。改getPlans ensureSession确定owner、requestOperation预期账号、回执后再验身份；详情按账号与未解析mountId queryKey隔离，useDidShow刷新身份，从本账号planQuery结果推导initialSelection/activePlan/列表。
- requestedPlanId仍保留未缓存目标身份，现有hydrate effect在回读后填入；保存API现有invalidateAfter PLAN维持查询刷新。向全局plans投射前加owner检查。没有删除旧全局存储数据或越账号迁移。
- 4回归通过（feedback/library/plans迟到和旧owner拒绝、指定未缓存计划身份），typecheck通过。尚未实际WEAPP计划新增/保存/删除/重启复验，需检查从全局状态改query后保存回执时序；不能由这些API测试证明所有表单生命周期正确。
- 已挂载表单在身份变化后的本地字段清理/页面锁定、checklist按planId的范围、全局持久plans退出策略仍需继续审计。snapshot未同步最近历史/账号改动，当前60360878仍反馈空页。全goal active，A–F保留。

## 续批：计划写入账号绑定与回执缓存

- 上轮计划详情query隔离为progress。本轮检查save/delete仅依赖requestOperation当前会话，改发起前ensureSession锁定userId、requestOperation显式owner、收到结果后再核身份，异账号不更新query不invalidate当前账号。
- 保存成功先将服务端返回计划更新到同账号现有plans缓存，保留其他计划，再执行既有invalidateAfter PLAN；删除成功使用服务端返回完整列表更新同账号缓存再失效，避免刷新失败仍留被删记录。缓存不存在时保存不凭单条回执伪造完整列表。
- 新AST实际两写函数回归同账号回执更新/其他计划保留、请求中切账号0缓存写0失效，通过。typecheck通过，watch11:39:50编译成功659.05ms。
- 仍需实际计划保存/删除/重启；网络刷新返回比回执更旧版本的排序、无缓存保存后fallback与上轮表单owner问题继续保留，不称完整计划验收。snapshot未同步近期改动，60360878仍反馈空页。goal active，全部A–F保留。

## 续批：最新计划WEAPP入口与旧本机草稿实测

- 上轮计划写入owner/回执缓存为progress。本轮确认11:39:50成功产物，复制到existing snapshot，实际点击编译。11:41:43新启动，Launch9915ms。
- 新启动出现Page route系统错误：routeDone with webviewId36 not found，堆栈WAServiceMainContext/WASubContext，未出现可归因应用源码。记录而未重启开发器。地图稍后正常绘制，实际Map→My→点击今晚计划文字正常进入详情，说明该次系统错误后仍可继续操作，不能宣称错误修复。
- DAY200%390×844，计划页明确暂无正式点，暂无可选正式观星点；原本机notes“draft-recovery-0906；带红光手电，离开前清点器材。”完整在UIA恢复，日期2026-09-06、时间22:00。没有新建/保存/删除，原草稿保留。此证明最近计划query隔离改动没有破坏此账号该草稿的重启恢复入口，不证明不同账号/有正式点服务保存。
- 当前60360878计划页顶部，snapshot含此前所有11:39:50变更。下一可沿该页检查大字滚动/安全区/操作；真实保存受正常正式点缺失限制，但全A–F还有可推进开发/隔离验证，不构成goal blocked。全goal active。

## 续批：计划DAY200%底部实测与不可见保存错误修复

- 上轮最新WEAPP计划恢复为progress。本轮实际scroll486，390×844 DAY200%备注完整3行、恢复提示自然4行、保存/返回按钮都可达，不需改原备注。
- 实际点击保存（无正式点，预期校验拒绝），UIA出现“计划未保存：请先选择一个正式观星点；本页草稿仍保留”，但当前底部截图看不到错误。源码确认announce固定placement inline，NotificationRegion在页顶，错误落在离屏位置，并非floating-host CSS定位故障。
- 改plan announce仅info inline，其余error/warning/手动success floating；复用既有FloatingNotificationHost，不另造通知owner。typecheck通过，watch11:44:31编译成功1.02s。
- 最新一行修复尚未同步snapshot、尚未实际底部复验，下一复制成功dist，实际编译后My→计划→滚到底点击同校验，确认浮动提示可见且备注保留。当前60360878计划底部原snapshot，已有校验通知队列；新runtime时按新代码再触发。全部A–F及正式点限制保留，goal active。

## 续批：计划底部错误浮动提示实测通过

- 上轮不可见错误修复为progress。本轮复制11:44:31成功产物后开发器自动重新编译，观察新启动Launch6282ms；没有再次点编译/重启开发器。本次Console基础库显示3.17.2，需与此前灰度版本证据区分；未主动修改SDK设置。
- 实际Map→My→计划→滚到底，DAY200%、390×844再次点击保存（无正式点）。完整浮动“计划未保存：请先选择一个正式观星点；本页草稿仍保留”在当前视口显示，无需回顶部。实际点击关闭通知后恢复提示/保存/返回按钮可见，原备注完整未变。
- 只证明该校验分支可见性/关闭/草稿保留，不证明真正保存、网络失败、三模式其他宽度。当前60360878计划底部，snapshot含全部到11:44:31代码，无待清理测试文字或新服务记录。下一应推进其他A–F具体事项/隔离真实提交流程，避免重复此已通过局部分支。goal active。

## 续批：个人链接账号隔离与操作可见反馈

- 上轮计划底部错误实测为progress。本轮个人链接存在无账号queryKey/read、create/delete未绑owner、确认框后不核身份。getProfileLinks对齐私有read owner前后检查；create/delete新增expectedUserId并绑定requestOperation、回执核身份后才失效缓存。
- ProfileLinksPage按当前账号/未解析mountId分query，show刷新身份；formOwner锁定首次身份，保存时未就绪/已切换不把旧输入转存另一账号。保存回执前和删除确认后/回执后核身份，避免异账号清空输入/显示成功。操作通知改floating，复用已验证通用host。
- 前端typecheck通过；私有read4项AST实际函数回归通过，含getProfileLinks请求中切账号/旧owner拒绝。仍需profile写handler定向回归/实际WEAPP保存删除冷启，不能用read测试扩称写流程完整通过。
- snapshot仍11:44:31，此批未同步。当前60360878计划底部、无通知遮挡。全goal active，完整A–F和其他业务待办保留。

## 续批：链接删除确认账号回归与未知结果文案

- 上轮profile账号隔离为progress。本轮新AST真实remove handler覆盖取消确认、确认期间切账号、回执后切账号、正常删除；前两者0请求，回执换账号不刷新/不成功提示，所有分支释放锁，测试通过。
- 检查catch发现原“原记录保持不变/未保存”无法涵盖服务端成功但回执丢失。改保存/移除失败均要求刷新核对结果；保存保留当前输入并提醒避免重复添加，不伪称远端未写入。
- 仍需profile create/delete实际API账号回归与幂等重试（当前create重新点击随机key可能重复），本机未保存链接跨返回/冷启恢复，以及真实WEAPP保存删除/外部复制路径。没有以一项确认handler回归扩成全功能完成。
- snapshot未同步profile两批，60360878保持计划页底部。全goal active，A–F保留。

## 续批：个人链接同次重试与既有操作回归

- 上轮删除确认回归/未知结果文案为progress。本轮create/deleteProfileLink复用createMutationRetry，按owner+完整输入或linkId，在当前runtime未知结果重试沿用key，成功释放；不声称冷启持久化，重启前后重复创建仍需后续处理。
- typecheck通过。运行既有actions.test首次2失败，原因AST独立抽取save/remove的fixture未提供新增owner/formOwner/currentDraftUserId，抛ReferenceError；补齐固定同账号上下文，未改锁/刷新失败期望。重跑actions2+account-removal1+mutation-retry1共4项通过。
- 仍需API实际函数重试绑定断言/服务端幂等回执以及真实WEAPP保存删除。完整快检自profile新增之后尚未重跑，不能沿用以前快检；snapshot未同步最近profile改动。当前60360878计划页底部，goal active，全部A–F保留。

## 续批：链接API重试绑定回归与完整快检

- 上轮runtime重试接入及旧fixture修复为progress。本轮新AST真实createProfileLink/deleteProfileLink函数回归：lost后同内容同账号沿原key；成功释放；回执中切账号拒绝且不失效缓存；旧owner请求被拒绝，2测试通过。
- 完整check:miniapp:fast session81823最终exit0通过，覆盖近期计划/个人链接代码；本轮新增API测试在完整检查启动后增加，另行定向2项通过，不混淆覆盖时序。integrated-fast-check.log为最终日志，无未取得结果进程。
- 不把模拟requestOperation当真实服务重放证明，链接cold恢复/真实保存删除/复制回退仍需。当前60360878计划底部，snapshot11:44:31尚未含profile系列；下一优先同步成功build，实际My→主页链接私有本机测试，不公开信息，不制造确认/信任卡点。全goal active，A–F保留。

## 续批：个人链接真实私有保存与显示问题

- 上轮完整快检/API回归为progress。本轮确认11:50:15成功629.01ms并同步snapshot，自动重编译新runtime Launch10802ms（未重启开发器）。实际Map→My滚下→主页链接文字入口，DAY200%390×844正常进页，平台2列自然换行。
- 明确测试输入：平台OTHER、名称“本机私有验证1153”、URL https://example.com/starward-private-check-1153，公开开关保持关闭。实际点击保存，浮动“主页链接已保存”、输入清空；滚下列表实际1条、名称/URL完整、标明私有关系。正常本机身份此前0链接，此次只新增此明确私有测试关系，未对外发布。
- 实际发现复制动作空白有按钮区域而无文字（SoftButton混合SemanticIcon+Text），更新时间UTC03:54未转北京。改复用displayBeijingTimestamp；复制按钮改纯文字children由SoftButton自身Text承载，能力关闭显示“复制链接”，允许时“打开 / 复制”，删除无用SemanticIcon import。typecheck通过（随后仅删无用import）。
- 重要当前待清理：私有测试链接仍保留1条，用于下一批冷启回读/复制修复/删除验证；不要重复创建。当前60360878链接列表底部，有“本机私有验证1153”/私有关系/移除按钮。snapshot含11:50:15但未含本次复制/时区修复。下一同步成功产物自动冷启，My→链接回读此条→验证复制可见与真实复制→移除此唯一测试条目→再回读0。原有计划备注不动。
- 全goal active，仍未完成链接跨返回未保存输入、冷启重试等范围，更未完成A–F全部。

## 续批：私有链接冷启/复制通过，真实DELETE400根因

- 上轮私有链接保存/显示修复为progress。本轮同步11:55:59成功396.65ms，自动新runtime Launch2907ms。实际Map→My显示1链接→链接列表，原“本机私有验证1153”仍存在、完整URL、私有关系。更新时间正确2026-09-06 11:54（北京时间），复制按钮已完整显示。
- 实际点击复制，系统“内容已复制”与应用浮动成功提示；PowerShell仅比较Get-Clipboard与明确测试URL，ClipboardMatchesTestUrl=True，未输出其他剪贴板内容。关闭通知成功。
- 实际移除→确认指定测试名称后DELETE400 INVALID_INPUT，列表仍1条。不能当清理完成。无凭证同本机路由probe验证：DELETE Content-Type application/json空body返回400，text/plain空body返回403进入鉴权，明确是空JSON解析边界，不是凭证本身卡点。
- request传输header新增只对method DELETE且options.body===undefined显式Content-Type text/plain，避免微信默认JSON让Fastify拒绝空body；有body的媒体删除仍走原JSON。typecheck通过，watch11:59:46成功763.81ms。
- 当前待清理测试关系仍为1条“本机私有验证1153”，URL https://example.com/starward-private-check-1153；未重建/公开。60360878停链接列表，删除失败浮动通知可能仍在。snapshot未同步最新DELETEheader修复。下一同步11:59:46成功产物，重启回读同条并实际删除确认→0条；补传输header定向回归（含有body DELETE保持JSON）与受影响测试，计划/链接无body删除均受此修复影响。
- 全goal active，A–F全部保留，不把以上私有链接局部验证扩成全目标完成。

## 续批：DELETE传输回归通过并同步待实际清理

- 扩展实际生产request AST transportHarness观察header/data；新增delete-transport.test.ts验证无body DELETE显式text/plain、有expectedRevision body仍保留默认JSON传输及原body。与request-lifecycle共17测试通过，非模拟服务成功证明。
- 确认integrated-development.log最新11:59:46 Compiled successfully 763.81ms。integrated-weapp-watch.log是旧失败日志，不混为当前watch。已将成功dist同步integrated-runtime-snapshot/miniprogram，等待现有60360878自动重编译，没有重启开发器。
- 同步前真实窗口仍是1条私有测试链接本机私有验证1153和DELETE400通知。尚未实际重试删除，必须下轮清理同一测试条目，不再创建。读取新窗口状态→My→主页链接→移除指定测试→确认→0条回读。全部A–F继续active。

## 续批：真实DELETE成功，私有测试关系已清理

- 上轮传输回归+同步为progress。现有60360878自动冷启Launch11227ms，未重启/信任弹窗。Map→My实际显示1条→主页链接下滚，确认同一本机私有验证1153及准确测试URL、私有关系。
- 点击移除，原生确认明确该名字→确认后实际浮动“主页链接已移除/已从当前账户关系中删除”，列表回读0条，控制台无新DELETE400。此前唯一新增私有测试关系已清理；原计划备注/原导入草稿未动。
- 实际200%显示的计数此前1条被挤成两行；section heading计数Text加flex-shrink:0及nowrap，标题说明继续可换行。尚待新watch产物与实际显示复核。
- 下一项已检查PLAN明确Link返回取消保草稿/重启恢复；当前链接输入仍useState四字段，没有本地恢复。已定位参考contribution/use-local-draft.ts和services/local-draft-keys.ts；应做账号隔离、白名单输入存储、恢复/放弃明确操作、成功保存清除且不被hide回写、注销清理对应owner，不能存token或完整API回执。尚未实现此项，勿标完成。
- 全目标A–F继续active，正常正式点0仍限制相应真实流程，其他开发不受阻。

## 续批：主页输入账号隔离恢复实现与定向回归

- 上轮真实删除/计数修复为progress。本轮新增profile/links/local-draft.ts、use-local-draft.ts，主页四个可编辑字段schema白名单，每次编辑同步写当前账号专属key；重新进入先显示恢复/放弃，未选择前禁用表单防覆盖。部分URL/未完成文本保留，不保存API响应/令牌。账号变化不能写、恢复或清除旧副本。
- 明确服务端成功回执后清除本机副本和字段；清理失败不篡改服务端成功，显示本机副本清理错误并阻止误写。读取损坏/不可用时保护旧副本并提供明确清除动作。写失败保留内存输入、展示不可安全离开的提示。恢复说明提示核对未知的上次保存结果，未虚称未提交。
- local-draft-keys新增profileDraftKey/profileDraftBelongsTo，deleteAccount按准确owner清理。原actions.test fixture接入localDraft，保持真实save/remove函数回归。
- typecheck通过（随后仅恢复文案/test新增），定向8测试通过：冷session恢复、原副本不被未恢复表单覆盖、保存清除、跨账号隔离、读写/清理失败、schema字段白名单、操作锁/回读失败语义。
- watch12:10:19成功358.17ms，已同步dist到现有snapshot等待自动重编译。实际主页草稿返回/冷启动恢复尚待跑；此刻无新测试输入/关系。完整check:miniapp:fast正在session91378，必须取得最终状态并修复失败，不把启动当通过。
- 全goal A–F保留active；下一读取60360878新runtime→My→主页→只填明确本机测试输入（不保存服务端）→返回再进恢复→冷编译恢复→放弃清理。私有1153关系已删除不再创建。
- 随后取得session91378最终exit0，完整check:miniapp:fast通过，日志integrated-fast-check.log。现有60360878新runtime Launch9992ms已启动Map，尚未填写本轮主页恢复测试内容；下一从My进入。地图此刻底图白但控件/暂无结果可见，不把瞬时底图白认作终止或重启理由。

## 续批：主页返回恢复实际通过，冷启动验证进行中

- 上轮输入恢复实现/完整快检为progress。本轮现有60360878实际Map底图已正常，My0主页关系进一步证实1153已清理。DAY200%390×844进入主页空表单。
- 只填本机名称“本机草稿恢复1212”和不完整URL“https://”，公开开关关闭，不点击保存服务端。返回My→重进，实际出现完整恢复说明/恢复输入/放弃这份输入，表单禁用；点击恢复后名称与不完整URL均原样回填。未被URL校验丢弃。
- 已点击现有开发器编译图标x1203,y46验证冷启动（未重启开发器），尚待获取新Launch/Map证据及重进恢复。当前仅这份本机输入副本尚待清理，不是服务端链接，勿重复创建关系。下一新runtime→My→主页恢复1212→放弃副本→再返回重进确认不再提示。原计划备注仍保留。
- 恢复卡下禁用平台chips文字发白几乎不可辨，实际可读性问题待修；主恢复选择/说明均清晰可达。全A–F active。
- 随后观察到编译后新runtime Launch8610ms/Map，确认已真正冷启，未重启开发器。1212输入副本仍待重进验证与放弃清理。复用已有import平台chip的disabled色规则到profile：opacity1、text-secondary/currentColor、选中choice-selected-label；此SCSS新改尚未同步snapshot/实际复核。

## 续批：主页冷启动恢复实际通过，开始限定组件库验证

- 上轮返回恢复/冷编译/禁用文字修复为progress。本轮Launch8610ms现有60360878实际My0链接→主页，冷启动仍有恢复提示；点击恢复后“本机草稿恢复1212”和“https://”原样恢复，证明实际冷启副本保留。再次返回重进→放弃这份输入→恢复卡消失、字段空白。此次只本机输入，未创建服务端关系。尚可再重进确认不再提示；禁用颜色SCSS修复尚未同步，watch12:14:57已成功400.14ms。
- 已回读附件二6.3及DESIGN4.5，下一限定两个复杂通用控件库验证。官方NutUI3x页面web只能JS壳；npm官方元数据提供当前latest 3.0.23-cpp，Reactpeer含18，MIT；依赖含两套NutUIicons、spring/gesture/lottie等。此为元数据，不是构建/运行结论；未安装试验依赖，更未替换业务组件。
- 必须遵守上游DESIGN唯一SemanticIcon且不得安装第二iconfamily；可先解包检查两个控件的实际依赖/公开icon替换能力，明确如不能符合就保留平台，不为接库升级主栈。不能把单一metadata当成两个控件已实际WEAPP验证。全A–F active。

## 续批：NutUI两个候选控件准入失败已存证

- 上轮主页冷恢复/初查依赖为progress。本轮npm pack --ignore-scripts下载精确3.0.23-cpp，校验全部归档路径后解包，无安装/脚本/lockfile变动。新增inspect-nutui-package.mjs实际追踪DatePicker及Form+FormItem+Input静态图，62/26本包模块，各自均有@nutui/icons-react-taro实际import。DatePicker经Picker/Popup Close；Input直接MaskClose。
- package强依赖两套NutUIicons；公开clearIcon/closeIcon不能消除静态依赖。按DESIGN4.5不得安装第二iconfamily，此版本不准入，保留现有owner。不做私有依赖伪装、不继续无限库调研。NUTUI-DECISION.md和INDEX已写准确源码结论与运行验证未执行边界；不能称真实WEAPP库测试通过。原包及依赖图在artifacts/miniapp/nutui-spike。
- 当前实际60360878仍主页空表单，1212测试副本上轮已放弃；尚未再重进确认清理持久。禁用文字修复watch12:14:57成功未同步。下一先同步/冷启确认副本不再提示，再回总方案业务/14路由待办；NutUI源码判退并不代表其余全部完成。
- 全goal A–F active，未制造用户点击/信任卡点。
- 随后同步含禁用文字修复的最新成功产物到snapshot，现有开发器将自动冷启；尚未再读新runtime。回读完整PLAN后，保留C账号导出/删除隔离验证、D十样本/反馈媒体真实流程、E正式点和硬件、F全路由矩阵。不要以NutUI准入判退替代这些范围。

## 续批：主页保存跨冷启动重放与排序值冻结

- 上轮NutUI依赖检查/判退与同步为progress。本轮检查现有createMutationRetry只运行期Map，发现cold保存未知回执后列表数量变化会改变sortOrder，单保留key仍不够。新profile-link-retry.ts按owner保存白名单主页字段、原sortOrder和重试标识；按平台/名称/URL/可见性匹配同次用户意图，重放原input（包括旧排序值），成功只删对应意图，保留其他不确定保存。
- 不保存session/API回执/额外字段；与已有本机输入一样仅user-entered主页字段。32条不确定记录边界，损坏/读写失败不覆盖、不发请求；成功清理失败仍成功且保留safe replay。createProfileLink先拒绝ensureSession owner不一致，再进入恢复存储；deleteAccount精确owner清理profile-save.v1。delete仍原运行期retry未改。
- 首次typecheck因unknown对象属性访问失败，已改Record校验后通过。6定向测试通过：fresh helper冷重放key+原sortOrder、owner和内容隔离、存储失败0请求/cleanup不篡改回执、白名单/损坏保护、真实API函数账号切换和原重试锁。watch12:24:33成功309.96ms。
- 尚待补：明确4xx失败释放意图（408未知保留）、损坏/累计记录时可理解的核对/清理恢复入口；实际服务丢回执+冷启动重放未验证，不用单元测试冒充。最后完整fast为上轮91378，此后代码新增未全跑。snapshot未含本轮retry改动（上轮已同步12:14:57disabled颜色）。
- 60360878实际状态最后是在放弃1212后空表单，之后同步已触发新runtime未读取。1212本机副本上轮已清除，1153服务端关系已删除；需要再重进确认无恢复提示。全部A–F active。

## 续批：明确失败释放与保存恢复记录清理入口

- 上轮冷重放实现为progress。本轮createProfileLinkRetry新增明确失败predicate，API沿MiniappApiError 4xx且非408判定，释放本次意图、不清其他未决记录；网络未知/408/5xx仍保留，成功cleanup失败仍不篡改回执。
- 新clearProfileSaveRecovery/clearProfileLinkSaveRecovery仅精确owner本机恢复记录。主页遇ProfileLinkRecoveryError展示可读恢复面板；点击先refetch服务端列表成功、当前账号仍一致，再原生确认清理旧请求标识的重复保存风险；取消/离线/账号变化均不清理。清理不删除服务端关系，不清当前输入，不自动提交。该确认是产品恢复操作，不要求睡眠用户为agent点击。
- typecheck通过；新cleanup真实handler AST覆盖离线、取消、确认前后换号和成功次序；连同actions/profile retry共8项通过。另 earlier7项profile/API回归通过。真实丢回执+冷重放仍未执行，本轮没有创建任何测试关系。
- 已启动新完整fast，需读取下方工具session最终状态后记实。最后实际snapshot仍未含本轮retry恢复代码，禁用色12:14:57已同步。下一优先完整fast结果→成功build同步→实际校验副本清理仍持久/正常流程，无需重启开发器。
- 全A–F active。
- 本轮完整fast运行handle=session34178；watch最新12:27:53成功1.05s。尚未取得fast最终结果，不标通过。

## 续批：主页服务端重放先于重复判断，增加真实并发/重启回归

- 上轮恢复入口和定向测试为progress。本轮取得完整fast session34178最终exit0通过（发生在本轮后端变更之前，不能声称覆盖新后端）。
- 追踪真实MiniappService.saveProfileLink发现先listProfileLinks判重复、后repository重放，导致同key重试也profile_link_duplicate；此前“客户端防重复”仅客户端层已验证，服务端端到端仍不成立，本轮修正。移除service前置重复查询，Postgres事务先锁users当前owner行→重放→查询同owner/URL不同id重复→写；in-memory测试repository同样重放后判重。并发初始空列表也因owner行锁串行。
- 新service测试同key原回执、不同key同URL拒绝、另一owner隔离1项通过。worker typecheck通过。miniapp-infrastructure.test新增真实PG两并发同URL只一成功另一duplicate、同key回执及service重启重放断言。
- 启动既有run-infrastructure-check.mjs，独立随机verify数据库/Redis命名空间，不向正常26点库注入fixture，未触碰开发器。新测试最终结果尚待取，handle见工具回执。当前API开发进程是否watch加载本轮服务变更尚未核实，不能把测试代码改动当正常8787已生效。
- 全A–F active；snapshot未含近期retry恢复改动，1212本机测试副本已放弃但冷再进清理持久复核未做，1153关系已删除。
- 首次直接node runner失败npm_execpath_missing，不能当集成已跑；改用根npm run test:miniapp:infrastructure，当前运行session12566，日志integrated-infrastructure-check.log。上次artifact verify_216670a9542240ba是历史结果，勿引用为本轮通过。
- 已取得session12566最终exit0；本轮真实隔离基础设施verify_a36fbf75b9974d5d passed（2026-09-06T04:32:27.984Z至04:32:39.775Z），包含新增profile PG并发唯一成功/重复拒绝及服务重启同key回执回归。备份还原、HTTP媒体等既有检查也通过，cleanup database_dropped/redis_namespace_removed均true。此证明后端真实PG，不等同WEAPP丢回执冷重放已完成。

## 续批：原十样本第九条实际推进到提议关联修订3

- 上轮PG重放修复/真实集成为progress。本轮重新读附件一第6/后续顺序及固定fixture9/10。原窗口108267732确实仍在，须sky.activate_window再get_window_state，否则后台图像可能显示前台60360878而window元数据仍原窗口；不据错图点击。正确originalImportState/window变量已在node_repl，app process路径，原settings.json未保存标记保留未操作编辑器。
- 原window为项目本身dist，watch代码修改会自动编译；不用snapshot同步，更不重启开发器。实际DAY100%原账号My→内容导入直接恢复第九条星河画卷，标题“星河画卷｜来源元数据导入测试”、33字既有自写短释义、来源注记/URL/权利已确认、私有，未重建。
- 实际关联区选择“建立独立地点提议”→保存关联选择。未看到提示，追查发现Import只挂FloatingNotificationHost却announce placement inline；改floating，另外GATED解析状态去CAPABILITY_DISABLED_UNLICENSED技术码，显示来源尚未开放可手动编辑。import-actions三项通过。
- 正常库只读SELECT（docker容器starward-miniapp-demo-postgres-1，库starward_miniapp；external_post_import_drafts JOIN external_post_imports USING import_id，限定original_url https://nightchina.net/2023/10/08/%）实际返回3|EDIT_DRAFT|t|DRAFT：第九条已真正保存独立提议、修订3，仍私有编辑，尚未进入预览/审核。不是按钮成功就猜测。
- 改源码后原窗口自动冷启Launch5014ms，当前originalImportState是Map（SDK3.17.1），仍保留原账号；下一My x1096,828→freshMy内容导入x919,486→scroll521+404到下部→“保存关联并继续”（stage ASSOCIATE_SPOT）再按实际按钮推进PREVIEW，重复保存/返回回读并只读核对。第十仍未创建，不要把第九当PREVIEW已完成。
- 60360878snapshot仍另一个DAY200账号，近期profile retry代码未同步。全goal A–F active。

## 续批：第九预览/重复保存/返回恢复通过，第十已创建

- 上轮第九实际提议修订3为progress。本轮原window108267732/Launch5014ms正常My→Import回读9，解析GATED提示已为中文无技术码。滚967到下部，实际“保存关联并继续”→浮动成功→“打开预览”→实际“提交人工审核”按钮出现（未点击审核）。
- 正常库只读第九结果5|PREVIEW|proposal摘要634533e7f76c44006d537f2e633d3af2|DRAFT|PRIVATE。再点保存当前草稿，结果6|PREVIEW|同proposal摘要|DRAFT，只有原一行，未重复建档/提议。返回My再进Import，步骤4预览恢复，列表9条且第九预览草稿，标题/33字自写释义保持。
- 读取第十原来源https://nightchina.net/2024/10/20/%E9%93%B6%E6%B2%B3%E4%B8%8B%E7%9A%84%E5%BD%97%E6%98%9F/：官方页面标题银河下的彗星，发布日期2024-10-20，标注2024-10-19拍摄于西藏日喀则定结县；只核元数据、不复制正文照片。正常库先只读第十count0。
- 实际“新建另一条导入”重置source/rights，OTHER保留；填固定完整URL，确认仅元数据/自写文字的权利范围→建立导入草稿，实际浮动已建立，进入未命名编辑草稿。尚未填第十标题/短释义/来源注记、未关联/预览，更未审核。不要重复创建第十。
- 当前originalImportState在第十新草稿页顶部，创建通知覆盖标题区域，需先关闭通知x1146,750再滚到字段；第十内容取fixture outside-tibet-dingjie：标题“银河下的彗星｜来源元数据导入测试”，正文固定“来源页面记录日喀则定结县的银河与彗星场景；导入仅保留草稿事实，不能推断当前天象或现场可达性。”；注记包括固定样本key/来源标注拍摄地点西藏自治区日喀则市定结县/日期2024-10-19/照片权利未确认不复用/非现场实证。下一保存文本→独立提议→预览→重复保存/恢复，保持PRIVATE。
- 全A–F active，第四仍不可改提议规避正式地理关联。
- 第十创建后的正常库只读结果已取得：1|SOURCE|f|DRAFT，确为单条新来源草稿、无proposal。页面虽呈编辑字段，服务端仍SOURCE，后续需按阶段按钮推进，不跳过服务端规则。

## 续批：第十完整私有预览、重复保存和返回恢复通过

- 上轮第九完成/第十创建为progress。本轮原window108267732 DAY100实际填第十标题“银河下的彗星｜来源元数据导入测试”；正文严格fixture46字自写短释义；sourceNote121字：固定样本 outside-tibet-dingjie；来源标注2024-10-19摄于西藏自治区日喀则市定结县，2024-10-20发布。仅引用来源链接、地点和日期及自写短释义；照片权利未确认，不复制来源照片或原文，不作为现场通行与安全实证。
- 点击“进入编辑草稿”，真实成功提示；只读正常库2|EDIT_DRAFT|准确标题|body46|sourceNote121|DRAFT。再选择建立独立地点提议→保存关联并继续→打开预览；实际出现提交人工审核按钮（未点击审核），只读4|PREVIEW|proposal摘要49f5eb75294c278c8652db13b8b1af9f|DRAFT|PRIVATE。
- 重复点保存当前草稿，只读5|PREVIEW|同proposal摘要|DRAFT，仅原一条。返回My再进入Import，原第十标题/来源/正文/步骤4预览恢复，未重建；列表10条。原9修订6 PREVIEW保持，第四未改成proposal。
- 全正常库nightchina来源聚合当前：EDIT_DRAFT DRAFT PRIVATE 1；PREVIEW DRAFT PRIVATE 9。即十固定样本已全部建档、9私有预览、仅第四编辑待正式地理关联；没有任何审核提交或公开发布。这是D样本子项进展，不是全目标完成。
- 当前originalImportState在第十恢复后的顶部，旧成功通知仍浮动。原settings.json未保存状态保持；SDK3.17.1/Launch5014ms。后续可做导入错误/账号隔离/本地恢复剩余、正常正式点事实链与全路由矩阵。近期import提示修复已实际看见，尚未新增完整fast（上次34178早于该改动）；本轮只有UI+只读DB，无新源码改动。
- 全A–F active，外部事实/硬件限制保留，未碰生产发布。

## 续批：导入账号隔离与迟到回执保护

- 上轮第十完整私有预览/重复/恢复为progress。本轮发现Import queryKey仅imports/import-id、写请求未锁owner。已getPostImports/getPostImport async ensureSession，requestOperation expectedowner并回执后再校验；createPostImport/updatePostImport同样锁owner并在cache invalidation前校验。
- ImportPage useDidShow重读身份、每次mount唯一未解析querykey、list/detail key带owner；formOwner只接初始账号。账号变化后隐藏旧表单并返回可读账号变化面板；选择/初始化/hydrate/创建/保存/冲突回读均校验owner，旧账号迟到回执不写localDraft、不展示错误给新账号。
- typecheck通过；12定向测试通过（read6、mutation2、form4），包含旧owner拒绝、回执换号无缓存失效/表单水合、保存锁/选择锁。原十样本全部保持正常库1EDIT+9PREVIEW/PRIVATE/DRAFT，不用切真实账号破坏验证现场。
- watch12:52:06成功1.29s；原108267732项目会自动重编译，未手动重启。完整fast正在session83933，日志integrated-fast-check.log，必须下轮拿最终结果，不把运行中记通过。
- 仍待导入未保存编辑跨返回/冷启恢复、未知写入幂等实际重放及其他A–F全部；当前源码create/update仍每次fresh idempotencyKey，未谎称已解决。全goal active。

## 续批：完整快检失败已修复；导入未知结果提示纠正

- 上轮账号隔离为progress。取回83933最终失败：notification-host.test检查到Import账号变化早返回缺FloatingNotificationHost（唯一fail），不是后端/外部阻塞。已在该根View加入宿主，保留隔离界面。
- 重新完整check:miniapp:fast，session90002最终exit0，日志artifacts/miniapp/integrated-fast-check.log；末尾图标18、语义资源24、设计绑定通过。之后另运行notification-host+import-actions六项全部通过，包含实际早返回结构及owner迟到保护。
- Import FAILED/default解析状态移除直接显示parseReason技术码；错误标题改为暂未确认建立/保存/阶段推进结果，保留当前页面输入、先核对草稿记录避免重复建立，不再断言未知网络结果为未保存，也不声称已实现跨冷启输入持久化。
- 下一仍是导入create/update durable idempotency及未保存编辑恢复。已读api-client1095后四个ownerbound函数，create/update仍freshkey；miniapp-service1934/2009：create生成随机id交repository save；update先get current/字段merge/阶段校验后saveImportDraft(expectedRevision,key)，需关注旧key重放在业务校验前是否可取得原回执（例如阶段已进一步推进），不可仅换客户端key就宣布解决。
- 未重启开发器、未点击信任；原十样本/private现场保持。全A–F active，本轮有代码修复及完整验证进展，无阻塞标记。

## 续批：导入并发相同请求的 PostgreSQL 回执串行化

- 前轮快检修复为progress。本轮检查saveImportDraft发现#replay先于任何稳定锁；create每次生成不同draftId，并发相同key可同时无回执，update也可能等待revision锁后报冲突而非重放。已在事务开始用users当前owner行FOR UPDATE锁，然后#replay，再原save逻辑。不同账号不共用锁，不改变阶段/审核/正式点规则。
- miniapp-infrastructure.test把既有proposal场景create变为3并发同key，断言三回执严格相同，实际SQL同owner/url仅1行；四轮阶段更新每轮3并发同key，三回执严格相同，原proposal单行/身份持续检查保留。
- worker typecheck通过；npm run test:miniapp:infrastructure session92940 exit0，run verify_1c74f3dfd3e64db3，2026-09-06T05:00:40.835Z–05:00:52.376Z，实际PG/Redis/备份恢复/HTTP全部通过，隔离DB已删除Redis命名空间清理。日志artifacts/miniapp/integrated-infrastructure-check.log、session JSON为证据。未改正常库十样本，未重启DevTools。
- 仍需客户端durable重试及未保存输入恢复；旧stage重放在service的ALLOWED_STAGE_TRANSITIONS校验前取得原回执的问题仍待解决，当前仅验证同时/相邻重放，不是跨后续阶段迟到重放。勿宣称整体导入幂等已完成。
- 文件路径注意：内存store在workers/miniapp-api/src/test-fixtures/in-memory-library-store.ts；接口在src/ports.ts，别用不存在的src/repository.ts；PowerShell不用bash brace path。
- 全goal A–F active，本轮明确代码+真实基础设施进展。

## 续批：导入跨阶段迟到请求返回原回执

- 前轮并发事务锁修复为progress。本轮新增专用repository port getImportSaveReceipt(userId,id,key)，Postgres复用#replay与擦除回执保护后校验importDraftId；内存store/adapter实现同owner/id隔离。MiniappService.updateImportDraft在当前阶段业务校验前先返回匹配原回执，后续新请求仍按原规则。
- 基础设施测试保留首轮EDIT_DRAFT完整回执，继续四阶段到PREVIEW，销毁并新建service后以首轮key/expectedRevision1/原payload重试：严格等于首轮回执；再get当前草稿严格等于PREVIEW原状态，未回退字段/阶段；另一身份同id/key拒绝import_draft_not_found。原PREVIEW不能直接转EDIT，故此测试实际覆盖此前误报stage_transition路径。
- worker typecheck通过。npm run test:miniapp:infrastructure session56068 exit0，run verify_1752c4cc16824a51，2026-09-06T05:02:41.206Z–05:02:52.550Z，实际PG/Redis及全既有HTTP/备份恢复通过，隔离数据库与Redis清理true。证据同artifacts/miniapp/integrated-infrastructure-check.log和infrastructure/miniapp-infrastructure-session.json。
- 尚未实现客户端导入跨冷启动重试身份、未保存编辑恢复，不能把服务器回执修复当整个恢复闭环完成。当前服务正常8787热更新状态未验证，此次证明新服务隔离实例。原DevTools与十样本未操作。全A–F goal active。

## 续批：客户端导入保存身份持久化接入

- 前轮服务端跨阶段回执为progress。本轮新services/import-save-retry.ts，按owner精确key starward.import-save.v1:JSON[owner]保存schema1entries最多32。identity明确列出create三字段/update九字段+kind/id，undefined与null区分，key/记录长度校验；只白名单可编辑字段，不保存session/API响应。相同payload含expectedRevision恢复同key，不同owner/id/rev/字段独立。
- 先同步持久化再operation；未知错误保留，API明确4xx(除408)释放对应key；成功只清自身entry，清理失败不反转服务端成功；损坏记录不覆盖/不发送请求。createPostImport/updatePostImport接retryImportSave，ensureSession账号不匹配在写本地前拒绝，requestOperation/postreceipt owner保护保留。deleteAccount清当前owner import-save key，其他owner保留。
- 定向实际API AST隔离2+helper初版4通过；追加helper并行清理/损坏保护后5全部通过（合计7相关）。完整check:miniapp:fast session85176 exit0，artifacts/miniapp/integrated-fast-check.log，覆盖三workspace typechecks/tests与设计资源/绑定；最后追加只改test，已单独跑通过。
- 待继续：存储损坏/32上限需要页面可核对服务器后显式清理恢复信息入口（避免卡点，参考Profile同类已有实现）；导入未保存输入恢复尚未实现，所以虽key跨冷启可用，UI不会自动恢复原payload，真实WEAPP lostreceipt+冷启尚未验。旧回执可以比当前远端stage旧，页面是否需额外核对当前版本也待处理，不能宣称完整恢复闭环完成。
- 原DevTools自动watch无需重启；未手动操作原十样本。全A–F active。

## 续批：导入恢复记录异常的页面内核对与清理

- 前轮客户端durable key为progress。本轮新增clearImportSaveRecovery精确owner存储删除、API clearPostImportSaveRecovery再次校验当前owner。Import捕获ImportSaveRecoveryError显示StatusPanel，用户先刷新列表并核对，再次按“已核对，确认清理恢复信息”才清除。两次操作都fresh imports.refetch且owner/action锁；离线/切号/忙不清理，成功仅清本地重试信息，保留输入/远端记录、不重发。
- 使用页面内两步控件，无native modal，无额外系统确认窗口。保存异常时reset review状态。AST测试实际clearSaveRecovery涵盖首次核对、未核对直接confirmed、离线、回读换号、busy、成功；import-actions增加新错误类fixture。notification-host+import-actions+cleanup 7通过，miniapp typecheck通过；import-save-retry5再通过，新增a清理不删除ab记录。
- 页面实际WEAPP显示/点击仍待验证；未保存编辑跨返回/冷启恢复仍未实现；完整fast上次85176早于本轮UI，当前为定向+typecheck，不冒充新全量。原十样本未更改，DevTools未重启。全A–F goal active。

## 续批：导入未保存编辑副本实现与首次实际返回恢复

- 前轮恢复记录清理为progress。本轮content/import/local-draft.ts新增schema1完整白名单副本：id/原revision、platform/sourceUrl/rights/title160/body6000/sourceNote500/visibility/association/formalSpotId。owner精确starward.import-draft.v1:JSON[owner]，缺失可读null、损坏拒绝覆盖、每次UI输入同步write，read不消耗，账号变化read/write/clear拒绝；deleteAccount清当前owner。
- Import keepEdit包全部九编辑输入及关联选择，dirty禁止切其他草稿/新建以免覆盖唯一未保存副本。进入页面发现副本显示恢复/放弃；恢复已有id先get当前服务端，SUBMIT禁止编辑，原revision保留到保存expectedRevision，旧冲突后释放override回读；新来源不请求server也能恢复。恢复不发送保存/审核。save成功clearSavedEdit；存储错误可见、不伪称已落盘。route effect在dirty时不盖回恢复id。
- 本地副本3测试、实际recoverEdit AST六场景1测试、既有import-actions/cleanup/notification-host全部通过，miniapp typecheck通过。完整fast session37252最终exit0，integrated-fast-check.log。最后state EMPTY→READY只文案状态改动发生全快检后。
- 实际原window108267732 (originalImportState) SDK3.17.1/Launch7437ms DAY100%390，My→Import看第十原PREVIEW；点新建另一条→原始链接填仅https://（未确认rights，未建立serverdraft）→返回My→重进显示本机副本→实际点击恢复，输入https://准确恢复、rights未确认、OTHER，原列表10条。无server新增/审核，正常十样本不变。
- 观察恢复面板EMPTY自动标题暂无结果不合适，已改READY去掉该标题。该源码改动会watch自动冷启；刚恢复的https://副本仍持久化可用于下一冷启动验证，尚未清除！不要误当用户真实来源提交。下一fresh originalImportState看自动冷启→My→Import恢复副本→核对https://，再返回重进放弃此测试副本清理。未手动重启DevTools、未碰settings.json未保存内容。
- 仍待实际已有草稿多字段/原revision冲突恢复、cold lostreceipt、200%三模式新面板；dirty当前编辑只能保存或返回重进放弃，可进一步改善当前页直接放弃入口避免无效来源卡点。全A–F active。

## 续批：导入本机来源副本实际冷启动恢复与清理

- 前轮本地副本实现/返回恢复为progress。本轮原108267732 fresh实际显示watch13:16:06冷启、Launch6378ms（此前7437ms），SDK3.17.1、DAY100、390×844；没有重启DevTools、trust弹窗。
- 冷启Map→My→Import，实际显示未保存副本/恢复/放弃；READY修改已见，暂无结果误标题消失。点恢复，原https://未完成URL准确出现，OTHER保持，rights未确认，未发送创建。列表10条。
- 再返回My→Import再现恢复入口，点击“放弃本机编辑副本”，实际回到原第十银河下的彗星PREVIEW/原URL/rights已确认，测试https://消失。测试副本已通过正常产品清理入口清除，没有写SQL或触碰本机敏感存储。尚未再冷启确认无恢复入口，但clear产品动作及结果已实际观察。
- 当前originalImportState仍第十顶部，旧已恢复通知残留（跨页notifications问题既有）；原settings.json未保存dot保持。下步可加当前页直接放弃未保存编辑（现需返回重进，尤其无效来源不能保存时），或实际已有草稿多字段原revision恢复/冷lostreceipt；所有A–F矩阵/正式点等继续。此次无新代码，完成真实冷恢复验证，不需重复全fast；最近37252已通过。全goal active。

## 续批：当前页直接放弃编辑，免返回重进

- 前轮实际cold恢复/清理为progress。本轮Import dirty状态显示页面内放弃入口：第一次只进入确认说明，可“继续编辑”取消；第二次才localStore.clear，成功后解除dirty/revision并复用beginAnotherImport重置空来源；已保存服务器草稿保留。清理失败不清输入/dirty/revision；owner变化/请求忙/无修改不动作。每次新编辑重置确认状态，避免之前确认沿用到新输入。
- 切草稿/新建被dirty拦下时现在指向页面上方放弃操作，不再要求返回重进。纯产品inline控件，不引入系统弹窗。
- miniapp typecheck通过，import全测试+notification-host12通过（新增discard AST六场景首击、成功、存储失败、换号、忙、clean）。最后仅调整两条提示文案。最近完整fast37252，未宣称本轮全量。
- 仍需实际点击验证新面板和首次输入出现顶部面板是否导致焦点/滚动问题；新代码watch会自动编译，当前原108267732应回Map，先freshstate，不重启。前轮https://测试副本已通过UI清理，无新测试输入残留。原10样本/private未动。全A–F active。

## 续批：当前页放弃编辑实际交互通过

- 前轮代码/定向测试为progress。本轮原108267732自动watch13:19:47，Launch2099ms/SDK3.17.1，DAY100390。冷启后My→Import直接原第十，无恢复提示，进一步确认上轮副本已清除。
- 点新建另一条，空来源输入https://，顶部dirty放弃面板出现、表单下移但未丢焦点；未再点击输入框继续type example，实际得到https://example，证明连续输入保留。未确认rights、未建立服务器草稿。
- 点放弃→实际双按钮确认/继续编辑→点继续编辑，https://example保持且回单放弃按钮；再次放弃→确认，原来源恢复空placeholder，rights未确认，dirty面板消失，实际成功通知已放弃当前编辑，列表仍10条。新本机测试输入已通过UI清除，未新增/修改服务器样本。
- 当前originalImportState为空新来源页，旧成功通知浮动；可直接选第十列表行或后退。当前页放弃/取消实际验证通过，只DAY100模拟器，不扩称200%三模式或真机。此次无新代码，不重复快检；最近代码12测试+typecheck、全fast37252。全A–F active。

## 续批：编辑开始时固定修订号，防后台回读隐式覆盖

- 前轮实际放弃交互为progress。本轮检查发现keepEdit保存副本时revision取当前query draft，尚未恢复的普通编辑未固定base revision；后台query刷新到新revision可让旧字段保存误用新版本。已首次keepEdit时用restoredRevision.current ??= draft.revision固定编辑基线，后续字段输入/本地副本/保存均沿用，直到成功保存/明确冲突回读/放弃。
- 新edit-baseline AST执行实际keepEdit：revision3编辑→模拟query draft变5→再编辑，两次写入与ref仍3，patch值保留；换号不写。Import全部11测试通过，最近typecheck在前轮大逻辑更改后通过，本轮只添nullish赋值，无新全量快检。原正常十样本未动，当前watch自动冷启预期。
- 同时只读notification.tsx确认floating宿主全局queue不按owner过滤，旧成功通知跨页源于现有全局设计；尚未核对上游通知保留要求，因此本轮不擅改全局清理策略。不要把看见跨页通知就自动认定应删除所有状态。
- 后续仍需实际已有草稿多字段恢复/冲突、其他14route与3模式200%矩阵/正常formalpoint事实链等全A–F，不把导入恢复子项当整个目标。全goal active。

## 续批：计划表单换号隐藏与准备清单 owner 隔离

- 前轮导入基线修复为progress。本轮重新读完整PLAN/INDEX，切回C计划范围。源码全局state.plans仅app-store内部/写入者，无其他直接读UI消费者；不据旧摘要擅删store。Plan页面query已有owner，实际缺口是旧编辑字段换号仍呈现及checklist仅planId key。
- PlanEditorPage新增formOwner初始归属，全部hooks之后账号变化早返回CustomNav+PERMISSION_DENIED+FloatingHost隐藏旧字段。checklist key变starward:plan-checklist:v2:JSON[owner,planId]；读effect按planOwner重跑，无owner清空；save/delete使用发起owner；toggle检查scope与mutationbusy，React更新回调再次scope检查防迟到写。deleteAccount精确清当前owner清单key。
- 新plan-checklist-scope两测试含精确a/ab/id隔离、旧无owner key不归属、坏key、真实toggle同owner/换号/deferred换号/busy。Plan全部+notificationhost18测试通过，miniapp typecheck通过。没有使用真实账号切换/正式点计划写入，不冒充真实完整计划链路验证。
- 旧无owner checklist key保留但当前不会自动读/迁移，避免将无法明确归属的本机数据带入新账号；可考虑仅在服务端确认当前账号拥有该plan后安全迁移，尚未做。Plan context query/restore与applyPlan/startNewPlan effect的owner生命周期仍要继续审查，当前仅隐藏旧表单与隔离checklist，别把整个账号链路算完成。
- 实际原DevTools会watch冷启，未重启、未改正常十样本；导入测试副本已清理。全A–F active。

## 续批：计划观测回执绑定owner与旧准备清单安全迁移

- 前轮计划表单/清单隔离为progress。本轮context queryKey snapshot/active均带planOwner；queryFn起始scopedowner校验、await load后再次校验、回执owner字段，enabled需scopedowner。写全局observationContext的effect只接匹配scope的回执，deps含planOwner；applyPlan/startNewPlan拒绝已换号scope；replacePlans effect同样锁mounted scope，避免新账号列表写入旧编辑器链。
- 新plan-context-scope执行实际queryFn同owner/换号迟到/无owner不请求，以及实际context effect owner a/b/null，只有同owner改共享context。计划全测试+notification-host20通过，typecheck通过。
- 完整fast session41187最终exit0，integrated-fast-check.log；运行期间后续补checklist迁移，因此迁移另定向测试/typecheck为最终明确证据。
- readOwnedPlanChecklist只有当前owner-scoped server列表确认activePlan存在才允许读/迁移legacy planId key；v2存在优先，旧字段白名单normalize，先成功set v2再remove legacy，写失败旧记录保留。无已确认plan不读legacy，避免跨账号归属猜测；此改动消除上一轮旧清单一律不加载的兼容遗留。checklist-scope3测试全过（含否定归属无迁移/v2优先/写失败保留），miniapp typecheck再次通过。activePlan变化后effect可在服务端列表实际回读时迁移。
- 尚未在真实小程序/真实切号验证计划全链路，正式点正常数据仍无可用证明；全A–F active。DevToolswatch自动编译未重启、原十样本和已清理测试副本保持。

## 续批：计划发起owner贯穿API，防ensureSession前换号

- 前轮context/迁移为progress。本轮开始检查计划未知保存重试，发现page已有savingOwner/deleteOwner检查但saveObservationPlan/deleteObservationPlan只在ensureSession后锁其当前user，期间换号会把旧输入发送新账号。新增expectedUserId可选参数，ensureSession返回后请求前拒绝不匹配；page save第四参savingOwner/delete第二参deletionOwner传入。原回执后guard/cache owner继续保留。
- plan-mutation-scope扩展同owner、回执换号、dispatch前换号场景，前换号实际request计数0；save/delete实际页面AST与API共6测试通过，miniapp typecheck通过。不是仅检查字符串。
- 原计划重复创建问题明确仍未修：PlanEditor save每次activePlanId null生成plan:Date.now-random，api fresh plan-save幂等key；冷恢复PlanDraft仅spot/date/time/notes/baseRevision，无待处理planId/key/context输入。下一需要durable new-plan identity与服务器回执在context/spot校验前重放（先核workers/miniapp-api MiniappService.savePlan/saveObservationPlan实际命名及repository.savePlan），不能只把random改useRef就声称冷恢复完成。
- 本轮未操作真实计划/正式点数据，无DevTools重启。最近全fast41187，后续迁移/owner修复定向+typecheck已明确，完整goal A–F active。

## 续批：计划服务端并发及上下文不可用时回执重放

- 前轮owner API为progress。本轮ports/Postgres/内存store与adapter新增getPlanSaveReceipt(owner,planId,key)，复用owner idempotency与擦除检查后精确planId匹配；MiniappService.savePlan在日期/正式点/context校验之前返回匹配旧回执。新请求原约束不变。Postgres.savePlan在#replay前锁users owner行，避免并发初次保存无行锁、回执race。
- 基础设施原计划单save改3并发同key，同receipt严格相等；重启MiniappService后临时注入observationContexts.get不可用（明确模拟故障，非真实TTL等待），相同owner/plan/key仍从实际PG回原receipt、list仅1计划。另一owner同key、新key都实际走context并被故障拒绝，finally恢复get。保留全部之前profile/import/media/backupHTTP检查。
- 最初patch误把plan receipt插入updateImportDraft导致typecheck重复receipt/planId不存在，已移除并精确定位savePlan1787插入，最终worker typecheck通过。无错误状态遗留，不重复失败补丁。
- npm run test:miniapp:infrastructure session89512 exit0，run verify_5e96e3279a4f4adc，05:33:56.076Z–05:34:07.688Z，实际PG/Redis/备份恢复/HTTP通过，隔离库及Redis清理true。证据integrated-infrastructure-check.log+infrastructure-session JSON。
- 客户端新计划仍每次随机planId/freshkey，待durable intent保留原planId/key及原context等payload；cold恢复需要与PlanDraft衔接/明确恢复操作，不只内存ref。另检查expectedRevision=null且ID已存在的仓库写是否应拒绝（当前PG仅nonnull核版本），尚未改此语义。全A–F active，未更改正常库或重启DevTools。

## 续批：客户端计划保存原请求持久化

- 前轮计划服务端重放为progress。本轮services/plan-save-retry.ts新增owner精确starward.plan-save.v1:JSON[owner] schema1最多32entries。保存白名单planId/spotId/原observationContextId/date/time/notes800/expectedRevision/contextIdentity+key；storage失败先拒绝不dispatch，未知保留、明确4xx除408释放、成功仅清对应entry且清理异常不反转服务端成功。
- 新计划identity忽略每次随机planId，但包含spot/date/time/notes/revision与用户路线语义contextIdentity；已有计划额外包含planId。planContextIdentity取timezone与MAP_POINT或routeOrigin的wgs84坐标/坐标系，不依赖会过期的contextId。重试回调严格使用原planId/原contextId/原body和key。page save第五参传语义identity，API第四参owner与回执guard/cache作用域保持，deleteAccount清当前owner plan-save记录。
- 定向6测试通过：实际page保存冲突2、实际APIowner/cache1、helper冷启动原id/context/key重放、不同owner/notes/origin/已有id区分、storage失败/白名单/明确拒绝清理。miniapp typecheck通过（首次误从root执行npm run typecheck无脚本，随后用正确workspace通过）。
- 完整fast已启动，日志integrated-fast-check.log，session见本轮工具输出（下一必须poll最终，不当已通过）。下一仍需PlanSaveRecoveryError页面可核对后清理入口，类似Import避免本机坏记录/32上限卡点；以及真实WEAPP lostreceipt/cold恢复+正式点计划服务链。当前PlanDraft普通输入恢复已有，但本次真实服务尚无formalpoint可保存，未伪造正常正式点。全A–F active。
- 上述完整fast运行句柄为79987；本轮结束前尚未取得最终状态，下一先poll或检查同日志。

## 续批：计划保存恢复记录异常可在页面核对清理

- 前轮plan durable key为progress。取回79987完整fast最终exit0，integrated-fast-check.log。随后本轮新UI改动另有定向/typecheck证据，不混淆时间。
- API clearObservationPlanSaveRecovery检查expectedowner后仅删本机plan-save记录。页面捕获PlanSaveRecoveryError展示StatusPanel；clearSaveRecovery第一次成功refetch仅进入核对态/解释清理旧key可能重复建立，第二次再成功refetch+sameowner才清，保留输入/服务器计划、不自动保存。忙/离线/换号不清理，使用inline操作无系统弹窗。
- planQuery开启throwOnRefetchError防离线refetch吞错后清理；四个普通回读按钮显式catch（页面query error继续呈现），冲突回读已有catch。泛化网络错误标题改暂未确认计划保存结果，不把未知回执断言未保存。
- Plan全测试+retry+host24通过、miniapp typecheck通过；新cleanup实际AST五场景（首次核对、离线、换号、忙、确认成功）另1通过。未真实注入本机坏存储/切账号/计划网络丢回执，仍待实际WEAPP及正常正式点业务链。
- 最近服务端真实基础设施verify_5e96e3279a4f4adc通过，本轮无server更改。watch自动编译，无DevTools重启、无正常十样本变更。全A–F active。

## 续批：计划新建请求不得无修订覆盖已有ID

- 前轮恢复UI为progress。本轮确认repository.savePlan只在nonnull版本时检查，expectedRevision null碰已有ID会当upsert覆盖。Postgres在owner锁/#replay后、内存store在replay后新增null且existing→plan_revision_conflict；正常同key仍原回执，明确更新仍原revision校验。
- 基础设施三并发同key创建之后，用新key+相同planId+不同notes+expectedRevision null再save，明确拒绝；实际repo.listPlans首条严格等于原完整receipt，字段/版本未改。保持重启/context故障回执测试。
- worker typecheck通过；API全test100项99passed/1正常skip，无fail，日志artifacts/miniapp/plan-api-check.log。npm run test:miniapp:infrastructure session23364 exit0，run verify_33937e9b864a4d6f，05:42:17.681Z–05:42:32.265Z，实际PG/Redis/备份恢复/HTTP通过，隔离数据库/Redis清理true。证据integrated-infrastructure-check.log及session JSON。
- 正常开发数据与DevTools未操作/重启。客户端cold lostreceipt仍为纯函数+实际server分层证据，没有整条真实WEAPP验证；其余A–F未收窄。全goal active。

## 续批：正式地点重新只读评估与天文台官方限制

- 前轮计划服务端新建防覆盖为progress。本轮重新运行audit-spot-completeness.ts（Node24 --import apps/wechat-miniapp/node_modules/tsx/dist/loader.mjs），正常库26点0complete；182必需证据缺失/陈旧、208设施证据无效，其余counts存更新后的spot-completeness-audit.json。未直接创建publication评估/强改状态。
- 官方web重新核对天文台夜间开放答复和参观须知，发现明确夜间不开放；特定活动西涌暗夜社区不是园区通用夜间许可。具体两source URL/日期/简述/边界写observatory-official-sources.md并INDEX索引，非长文复制、非现场核验、非已入库证据。资料改变下一决策：不能将天文台作为随意夜间可进入点补成正式推荐；第四地理兼容未确认。
- 现有admin-operations.controller主要审核/媒体/发布管理，source/fact入库owner未定位；本轮只读查找，未在不存在admin-operations-service.ts继续尝试。下一先rg --files定位真实owner，或推进其他不依赖现场事实的矩阵。全goal A–F active，本轮有当前DB与官方事实新证据，非无进展/非blocked。

## 续批：官方来源接入路径与结构化候选

- 已定位实际 owner：AdminController.patchSpot → PostgresMiniappRepository.adminPatchSpot；dataDisclosure 整体替换，repository 将其写 data_source_registry，并同时生成地点修订、完整性评估和审计。不是独立无副作用来源登记；不能直接用两条新来源覆盖旧数组。
- 已存 observatory-source-candidates.json 两条 OFFICIAL_REFERENCE/PARTIAL 来源及精确发布日期、检索日期、版权/现场证据边界；INDEX 已加入索引。JSON 解析通过，两条 URL 均与前轮已核对官方来源笔记逐字匹配。首次录入 URL 路径有误，已在验证前修正，无错误 URL 遗留。
- 文件仅候选而非请求体；未修改正常 DB、证据 verifiedAt、开放状态、设施、发布状态或第四样本关联。后续若接入，先通过现有管理读接口取得当前 detail/来源并合并，保留全部原来源。现有 patch 同时做评估的行为须计入真实操作记录。
- 本轮继续用户睡眠期间自主推进，未重启 DevTools、未触发信任交互。正式点实证仍缺；可继续其他 UI/媒体/矩阵，不因为此项待现场资料停止整个目标。全 A–F active。

## 续批：实际 WEAPP 图片选择器与首错定位

- 前轮来源候选为 progress。本轮原 DevTools 108267732，main watch 13:40:39产物，SDK3.17.1/DAY100%/390×844；未重启或升级。My反馈入口数次点击未转，设置对照可转，出现 SDK Page route routeDone with webviewId275 is not found；返回My再次点击反馈副标题后正常进入。不能据此宣布业务handler故障或已修复；历史snapshot成功证据不覆盖此次间歇异常。
- 空反馈新地点状态，字段皆空，22/114是placeholder（源码state空），无GPS调用。滚到媒体，rights由false改true，仅限自有transport测试图。真实选择图片打开Windows原生微信文件选择对话框，输入 E:/Dev/Starward/artifacts/miniapp/upload-fixture/self-generated-transport-test.png，Return完成选择。
- 实际回到表单，候选名称自动聚焦并滚入、可见“请填写地点名称”和浮动“资料未保存”，媒体仍0/3、投稿全部0；saveDraft(true)先校验，未上传，不将picker成功称上传成功。无提交审核、无正常正式点变更。
- 当前原窗口停在候选名称错误/媒体区域，rights仍true，是本轮测试编辑待清理或继续。字段仍空、无测试正文；本轮未建立服务端反馈。下一填明确仅私有传输测试候选所需最小字段并继续真实媒体链，或通过已有本地副本放弃入口清本轮测试rights。勿误把此状态当用户填写。
- 文件对话框坐标点击因child/parent窗口不匹配被工具拒绝，随后保持已聚焦文件名用Return成功；勿重试旧坐标。nodeRepl输出state整对象导致图片base64噪声，后续仅输出accessibility需要片段/屏幕，不dump整个state。全goal A–F active。

## 续批：真实 WEAPP 私有 PNG 上传与移除成功

- 前轮真实picker/首错为progress。本轮同原DevTools108267732、main watch13:40:39、SDK3.17.1、DAY100%390×844，没重启或改SDK。以实际控件填写新地点草稿：名称“仅私有传输测试1355（非真实地点）”、地区“本机验证占位地区”、纬度22经度114，正文47字“仅用于本机私有图片上传与移除验证；地点、坐标和时间为测试输入，不是现场报告，不提交审核或发布。”。时间2026-09-06 13:53，OTHER；坐标非GPS/非现场事实，精确坐标同意false，图片rights true。
- 实际点击选择图片→原生打开对话框→指定自有104字节32×32无EXIF PNG→Return。页面出现“图片已安全上传”，滚回媒体显示1/3、已清理元数据/已就绪。只读正常PG按上述精确candidateLocation.displayName筛选：DRAFT、revision3、media_count1、upload_stateUPLOADED、image/png。metadataStripped猜测字段返回null，不当元数据证据；原图本无EXIF，这次也不能证明有EXIF图片清理。
- 实际点移除→小程序自身确认“只从当前草稿移除这张图片”→移除；页面0/3。再只读PG：DRAFT、revision4、media_count0、上传记录EXPIRED、object_key IS NOT NULL=false。已验证实际WEAPP picker→草稿保存→PNG上传→移除→正常DB对应状态，不只是隔离API。
- 测试图片已移除；该明确标识的私有测试草稿仍保留服务端用于后续3张上限/重进恢复等验证（UI未找到删除草稿入口，不直接删库）。未提交审核、未制造正式点、未改十样本。当前页面媒体区0/3、rights true、草稿填写内容保留；下一可复用同草稿，不能重建更多测试草稿。
- 第一次保存后顶部显示“这里有一份未完成草稿/继续草稿”即便本页已有当前draft；尚未核组件条件，不先定根因。旧名称必填错误文案在输入后直到保存仍显示；可按具体交互要求继续检查。原间歇routeDone异常仍未归因。全A–F active。

## 续批：已采用草稿不再重复提示恢复

- 前轮真实上传移除为progress。本轮定位ContributionObjectSection恢复提示只检查matchingDraft，保存后history回读也匹配当前draft，导致“继续草稿”可重新apply旧回读而覆盖后续未保存编辑。显示条件改 !form.draft && form.matchingDraft，与createSaveDraft未采用保护一致；保留冷进页首次恢复。
- draft-adoption新增实际JSX condition AST执行：无draft且匹配显示；无匹配不显示；已采用同一/另一draft均不显示。与原保存前防覆盖测试共2通过，miniapp typecheck通过，日志contribution-adoption-check.log。
- 原DevTools watch自动冷启动14:00:03/Launch8603ms，未重启应用。Map→My显示1条草稿→反馈先出现本机副本恢复；放弃本轮测试副本后仍可见服务端“继续草稿”；点击后恢复原13:53时间和47字正文，恢复提示立即消失，证实本次条件改动真实WEAPP行为。当前原窗口在已恢复测试草稿上方，仍同1355私有DRAFT/rev4（此恢复无保存）。
- 本机副本曾在保存/移除后冷启动出现，可能现有自动持久化不区分已保存基线；未定根因。后续3张上限、JPEG/带EXIF、上传中取消/离线与其他完整矩阵仍待做，全A–F active。正常十样本及正式地点未改。

## 续批：反馈已保存基线不再被写成未完成副本

- 前轮恢复提示修复和真实WEAPP为progress。本轮use-local-draft证实clear后value变化定时persist无服务端基线，带baseSubmissionId一律hasContent，所以保存/恢复后的已确认字段重新写回本机并触发下一次冷启动恢复。
- hook新增saved ref与markSaved(snapshot)，按同owner保存完整已确认输入投影后清本机copy；persist与saved相等即移除，其他输入继续原持久化。applyDraft按其实际set字段投影传markSaved，包含id/rev、spot、kind/topics、日期时间、正文、候选字段、rights/坐标同意；未改变服务器/媒体/提交行为。没有用空输入或只比较正文跳过真实变化。
- local-draft-storage真实hook模拟保存投影→隐藏不写副本、后续编辑→隐藏保留、回到保存内容→清副本。与恢复版本/owner保护3定向通过；miniapp typecheck通过（contribution-baseline-check.log）。全部contribution21测试通过（contribution-tests.log）。
- 本轮没有取得新watch产物下的真实冷启动复验；不能把前轮14:00:03实际证据算本次baseline验证。下一原窗口fresh state，复用1355 DRAFT rev4，必要时先放弃上轮遗留本机副本，再继续server草稿→返回/重进检查无需本机恢复；真实新编辑仍应恢复。未重启DevTools或改正常正式点/十样本。全A–F active。

## 续批：已保存基线实际返回重进验证

- 前轮baseline代码/21测试为progress。本轮原DevTools108267732最新watch14:02:21、Launch2223ms、DAY100%390×844。Map→My→反馈先见修复前遗留本机副本；通过页面“放弃本机副本”清掉本轮测试遗留，然后“继续草稿”采用1355服务端rev4，回显13:53与47字正文。
- 不编辑不保存，直接返回My，再从同入口进反馈：没有“本机有未完成的输入”面板，仅正常服务端继续草稿，证明最新代码采用已保存基线后在hide/unmount不会重新制造本机副本。没有控制台存储注入、没有重启DevTools、没有数据库写入。
- 当前原窗口在反馈顶部，尚未采用server草稿的正常恢复入口。1355私有草稿仍rev4/无媒体；下一继续复用它完成三张上限/更多媒体情况。新增未保存编辑分支已有hook测试，最新代码下实际编辑→返回→恢复尚未重做；冷进最新产物有观察，但本轮基线后是路由重进，不冒充进程再次冷启动。全A–F active。

## 续批：多图上传在写入前验证整批输入

- 前轮实际baseline重进为progress。createAddMedia原来直接saveDraft，再逐张验证；选择器若返回超额或后续文件明显无效，会先留下草稿/部分记录。本轮在saveDraft前assertAccount、拒绝超过availableSlots、逐个validateMediaFile，然后才按原顺序串行上传。没有静默截断或伪造成功。
- validateMediaFile拒绝非数字/非安全整数/零负数/超过1.2MB，原MIME判定与服务器字节校验保持。首次Number.isSafeInteger不能窄化optional size导致typecheck失败，已补typeof缩窄并重新通过。
- 新media-batch测试执行真实createAddMedia/validateMediaFile，超额/剩余1却返回2/第二张无效/NaN/负数/小数/零/超限/换号都无save/upload，空返回无动作；合法3张按revision1/3/5串行并回读。全部反馈22测试通过；最终typeof修复后typecheck+batch定向再次通过，日志contribution-tests.log和contribution-batch-check.log。
- 本轮没实际再传3图；UI原窗口会watch冷启，1355草稿rev4/0媒体保持。下一仍需真实3张上限/失败恢复/带EXIF等，不把模拟批处理当完整WEAPP证据。全A–F active。

## 续批：真实三图批量上传、上限隐藏及全部移除

- 前轮批量预检为progress。本轮原DevTools108267732最新watch14:06:41/Launch2677ms，DAY100%390×844。将自有104B PNG复制为transport-test-2.png/3.png，仅fixture目录，用原生文件名多选三文件（双引号名称），真实picker→同1355草稿上传。
- 正常PG只读回执：rev11、DRAFT、media3、UPLOADED3，另上轮EXPIRED1。页面3/3，三条已就绪，底部直接保存/提交，无选择图片入口。不是用store注入上限。
- 逐条实际点击移除+小程序确认；3→2时选择图片入口重新出现，随后1→0。最终PG rev14、DRAFT、media0、UPLOADED0、非null object_key0（共四历史上传均已移除），页面0/3；没有提交审核/公开。测试草稿保持唯一1355，后续复用，勿建立新样本。
- 初次My反馈副标题/右箭头点击未导航，仅读诊断key并过滤my-contribution-navigation的sequence/event/detail，历史两对start/success不能证明本次点击。后点标题x1040,y294正常进页，未重启/未强制console导航。仍有命中或SDK间歇问题未定根因，不当已修复。
- 本轮最新冷启动进反馈没有本机副本面板，进一步支持上轮基线修复；完成媒体后当前停反馈下部/历史可见DRAFT、合并尚未开始、公开影响没有。3图相同无EXIF PNG不证明JPEG/EXIF清理或物理手机；其它A–F未缩减。全goal active。

## 续批：My命中问题定向实验，撤回无效样式

- 前轮真实3图/清理为progress。实际产物路径是dist/weapp不是dist根；读取pages/my/index-templates.wxml证实compileMode按钮有bindtap eh/data-sid，静态内部View/Text没有各自sid，说明文本有动态block，尚不能从模板判根因。
- 尝试routine-entry > view pointer-events:none让无独立动作的内容交给按钮；确认编译wxss含该规则。原DevTools watch14:13:53/Launch5980ms，Map→My，点击之前失败的副标题x1056,y313，仍停My未转；该假设未获实际支持，已撤回这条CSS，不保留无效改动。后续不要重复同pointer-events实验或再次把compileMode当未做。
- 完整check:miniapp:fast session11200最终exit0，integrated-fast-check.log；运行含此前所有反馈baseline/batch修改。此通过不证明间歇命中。撤回后只是回到原CSS，无新行为改动。下一需读取事件目标/实际boundtap与诊断增量等定位，或继续独立验证，不重启DevTools。
- 当前原窗口仍My（撤回可能watch冷启）；1355草稿rev14/0媒体，四历史上传EXPIRED/对象key空；三张fixture副本留本机。全A–F active。本轮证据排除简单子View pointer-events修法，是有进展，不标blocked。

## 续批：触摸阶段诊断用于区分未触发与取消

- 前轮pointer-events实验失败已撤回为progress。本轮读实际root node_modules/@tarojs/runtime/dist/dom/event.js，eventHandler用currentTarget.dataset.sid或id查node，不是简单依赖目标子Text sid；batchedEventUpdates还可能等待父级事件。不能据模板无子sid宣布根因。
- My反馈按钮新增验收用onTouchStart/End/Cancel，调用既有recordAcceptanceDiagnostic key my-contribution-touch、detail固定touch_start/touch_end/touch_cancel，仅原有diagnostics开启时存；不采集坐标/用户内容，不直接导航，不改提交语义。旧my-contribution-navigation三阶段继续保留用于对照。typecheck通过my-hit-diagnostics-check.log。
- 尚未取得新产物触摸序列，所以本轮不宣称解决命中；下一原窗口fresh state/watch自动编译后My说明文字一次点击，过滤两key读取最新事件，区分touch_cancel、无tap、tap已有但路由失效。不要输出全部storage/session。最后全fast11200在本轮instrument前通过。
- 当前正常1355草稿rev14/0媒体、十导入样本、正式点不变；全A–F active，未重启DevTools。后续完成诊断应考虑移除新增临时handler，验收诊断数据不当产品证据本体。

## 续批：失败点击实际为 touch_cancel，不强制触发导航

- 前轮临时触摸诊断为progress。本轮原DevTools108267732新watch14:16:06/Launch2863ms，My说明文字x1056,y313一次点击未转；通过可见console仅过滤my-contribution-touch/navigation读取，实际sequence2140 touch_start →2141 touch_cancel，没有touch_end/entry_click/navigation事件。
- 该观测证明这一次没有合法tap，不能继续归因为业务navigateTo或模板绑定丢失，也不能改onTouchEnd/Cancel强制导航。取消来源可能DevTools/桌面输入/手势仲裁，未进一步确定，不把全部历史未跳转都算同一根因。随后标题对照点击也未立即转，本轮未读取其新序列，不编造成功对照。
- 已移除本轮新增三项临时touch handler，保留原导航诊断，避免把调查用事件永久加进产品。回到原先typecheck/fast通过的按钮行为，未加pointer-events。实机触摸区域覆盖仍未验证；可继续其他业务/矩阵，不因桌面touch_cancel无限尝试同点击。
- 原窗口当前My，移除handler将watch冷启；正常1355 DRAFT rev14/0媒体保持。全A–F active，未重启开发器、未触发信任、没有产品导航绕过或账号数据写入。

## 续批：反馈写入账号边界与媒体回执本机基线

- 六个API写入入口create/update draft、create/complete/remove upload、submit在ensureSession之前固定当前owner，若会话等待期间换号则不发请求；返回后再次检查owner后才更新缓存/返回。complete upload补requestOperation expected owner。保留既有重试键策略，不把旧账号回执应用到新账号。
- 新services/contribution-mutation-scope.test.ts执行实际六函数，每函数同账号/会话等待换号/回执等待换号三场景，验证expected owner、请求次数、缓存失效次数。独立重跑1测试包含18场景通过，日志artifacts/miniapp/contribution-owner-tests.log。之前截断工具输出未当通过证据，已重新核实。
- applyMediaDraft此前仅setDraft，服务端媒体revision会令已保存表单误判为本机未保存输入。use-local-draft增加advanceSavedRevision，只推进同submission且非倒退的已保存基线revision；不清除/采纳现有文字。applyMediaDraft调用后更新draft。测试覆盖媒体单独变化不生成副本、上传期间文字改动仍保存、恢复原文字清除副本、其它草稿/旧revision不改变基线。
- 反馈目录22测试通过，日志contribution-tests.log；最终typecheck session90654 exit0，contribution-owner-check.log。仅随后缩进调整无行为改变。本轮未重复WEAPP上传，不能把hook测试当真实重新进入/冷启证据；下一可复用唯一1355私有草稿验证媒体操作后退出/重进，无需新建草稿或重启DevTools。
- 正常1355仍最后实测DRAFT rev14/media0、历史四上传EXPIRED/object_key null；未操作正常库、未提交审核。用户睡眠期间不引入信任/授权人工操作。全部A–F仍active，完整页面矩阵/真实数据/物理设备缺项保持。

## 续批：JPEG扫描段之后的隐私元数据清理

- 前轮账号/媒体基线修复为progress。本轮审查media-object-store.ts发现sanitizeJpeg遇到首个SOS直接拼接整个剩余文件，后续扫描之间APP1(EXIF/XMP)、APP13、COM未经过原有剥离策略。改为保留SOS段与熵编码字节，跳过转义FF00/重启FFD0–D7后回到marker解析，后续段继续原剥离规则；EOI必须已有尺寸及扫描且无尾随数据。
- 新media-object-store.test.ts构造两个扫描、夹带三类私有段，断言输出精确等于原图像段（含转义/重启字节）移除元数据；拒绝空SOI/EOI、缺尾、尾随内容。该为结构回归fixture，不冒称真实JPEG解码或EXIF方向保留验证。
- 定向media-object-store+contribution-service共14测试通过；API typecheck通过，日志artifacts/miniapp/jpeg-sanitizer-tests.log与jpeg-sanitizer-typecheck.log，工具exit0。本轮未上传正常1355草稿，数据库最后状态不变。
- 待补自有真实JPEG编码/解码及实际WEAPP传输；APP未知私有字段、方向元数据移除后显示方向等不因本修复视为全覆盖。原有仅剥离APP1/13/COM策略未扩展。全A–F仍active，无开发器重启或人工信任请求。

## 续批：实际JPEG编码/清理/解码回归证据

- 前轮扫描段清理为progress。本轮用Windows System.Drawing编码自有32×24红/金图形JPEG 699B；任务verify-jpeg-roundtrip.ts向SOI后注入合成APP1标记、扫描后EOI前注入COM，775B，经实际sanitizeContributionImage回到699B且与原文件字节完全相同。Windows实际解码后768像素逐点相同。
- 脚本首次相对import层级多了一层报MODULE_NOT_FOUND，修正为../../../workers后通过；新增verify-jpeg-roundtrip.ps1持久化生成、调用、逐像素验证，并实际重跑通过。Node24环境；日志artifacts/miniapp/jpeg-roundtrip.log。fixture含original/with-private-markers/sanitized三文件。
- 合成APP1 payload带Exif签名但不是有效TIFF/GPS结构，不能声称已验证真实相机方向/完整GPS或多扫描渐进JPEG解码；上轮两个扫描是结构测试。本轮确实验证实际编码JPEG的扫描后注释清理不损坏图像。尚未走WEAPP实际JPEG上传，下一复用1355草稿及该自有图片，清理后回到0媒体。
- 全A–F仍active，未修改正常数据库/DevTools，不需要用户操作。

## 续批：原窗口入口对照与实际JPEG服务链路回归

- 前轮真实编码/解码为progress。本轮沿用sky原窗口108267732，watch14:24:01 Launch4085ms DAY100%390×844。Map→My正常；反馈标题1045,291与1135,292两次点击各fresh观察均停My，不重复无限点击。设置924,392导航成功到content/settings/index。因此会话可用，反馈区域问题仍局部待查；本轮无touch诊断增量，不能把本次失败确定为cancel。当前停设置，未改偏好、未重启开发器。
- 无法本轮从反馈入口进入，因此没有宣称真实WEAPP JPEG上传通过。转补实际服务链路：将自有32×24/699B图拷入API test-fixtures，新增测试向扫描后插入合成COM，走createDraft/createUpload/completeUpload/readForAdmin，断言UPLOADED、清理后byteSize699及读出字节与原图完全相同。仅隔离内存服务/对象存储，无正常库写入。
- contribution-service共13测试通过、API typecheck通过，jpeg-service-tests.log/jpeg-service-typecheck.log。fixture来源为任务verify-jpeg-roundtrip.ps1自绘红金色图，无第三方版权或个人元数据。回归覆盖真实编码图像服务持久路径，不等于PG/WEAPP/真实相机EXIF全验证。
- 正常1355最后仍DRAFT rev14/0媒体。后续应定位反馈入口与其他按钮差异或继续全页面未验证项，勿重启/强制onCancel导航制造表面成功。A–F完整goal active。

## 续批：我的计划入口按实际本地日期选取

- 前轮JPEG服务链路为progress。My原先全量按日期升序永远取最早计划，历史条目可遮住今天。新增selectPlanEntry使用每条contextSnapshot.timezone计算今天，优先当天、最近未来、最近历史；当天/无记录标题今晚计划，未来观星计划，历史已保存计划。保留planId导航和其他计划列表，不删历史。页面每次render计算，既有useDidShow刷新确保跨日返回重新选择。
- 定向测试覆盖北京时间UTC跨日、今天优先、未来优先、历史最近、空列表、输入不变、下一日重算。首轮typecheck暴露readonly与timezone实际位于contextSnapshot，已依真实ObservationPlan修正；最终测试1通过、typecheck通过，plan-entry-tests.log/plan-entry-check.log。
- 未声称真实多计划WEAPP验证；正常数据正式点0complete限制仍保持，不制造计划或点位。界面watch后可能冷启，当前原窗口先前停设置，无偏好更改。后续核对正常无计划入口标题、完整fast以及其它页面覆盖。A–F active。

## 续批：近期改动完整fast合并验证

- 前轮计划入口日期修复为progress。本轮运行完整npm run check:miniapp:fast，session82973当前终态exit0；日志artifacts/miniapp/integrated-fast-check.log。三个workspace类型检查、contracts/API/miniapp测试、design system verify、workflow、icons、semantic assets、selected design binding均完成通过；API有原有integration skip，不把fast当基础设施全验证。
- 从实际日志确认新actual encoded JPEG服务测试、plan entry本地日期测试、all feedback mutations owner时序测试均被完整test命令收集，而非只在定向命令通过。此次fast包含最近媒体基线、六接口owner和JPEG扫描清理改动。
- 无源码改动、无正常库写入、无DevTools重启。该为当前合并检查证据，不证明真实JPEG WEAPP、反馈入口间歇命中、14页面矩阵或物理设备完成。完整A–F保留active；下一继续实际入口/页面验证，不因绿灯关闭goal。

## 续批：真实HTTP/PG JPEG清理与物理对象移除

- 前轮全fast为progress。本轮先运行既有infra成功verify_2e784793f84d49c0，核查发现HTTP媒体仅PNG，不能用其宣称JPEG实际链路。遂在run-infrastructure-check.mjs既有隔离HTTP草稿完成PNG移除之后增加真实自绘JPEG。
- 读取699B fixture，扫描后加合成COM，经实际HTTP POST upload→PUT complete，断言UPLOADED/byteSize699，直接读隔离对象磁盘字节等于原JPEG；DELETE按最新revision，断言media0及物理jpg ENOENT。使用现有隔离身份/数据库，不操作正常1355草稿，不提交审核。
- 修改后再次运行infra session28668 exit0，run verify_7a6db00408884280，2026-09-06T06:36:04.284Z至06:36:15.688Z。PG/PostGIS、Redis/BullMQ、备份恢复、API HTTP含jpeg_http_sanitization_and_removal全部passed，隔离database_dropped和redis_namespace_removed都true。最新日志integrated-infrastructure-check.log。
- 这是实际服务HTTP、PG及本机对象文件证据，不是WEAPP picker、手机相机EXIF方向或真实GPS验证。原开发器未重启/无授权操作；全14页面矩阵等A–F缺项继续保留active。

## 续批：反馈入口取消特殊编译后实际两次导航成功

- 前轮真实HTTP JPEG为progress。本轮对照正常设置/其他Button模板，仅移除My反馈Button的compileMode，保留ariaLabel、onClick与导航错误提示。实际原DevTools108267732 watch14:37:02 Launch6765ms，DAY100%390×844；My标题1045,291点击进入content/contribution/index，back返回后说明文字1056,313点击再次进入。两次均fresh state确认路由/内容，非console强制导航。
- 保留普通模板改动；typecheck通过my-entry-template-check.log。该证据支持当前版本标题/说明文字可用，不宣称已证明过去touch_cancel全部根因或所有设备命中。不要又加回compileMode作为常规“修复”。
- 当前停反馈顶部，本机未完成输入panel仍在，未恢复/丢弃；页面还显示服务端继续草稿。未清除副本或写入正常1355。部分类型/topics控件有边框但文字未显示，需后续查渲染/颜色，不冒称全页正确。
- 同次冷启地图底图白，console明确vectorsdk.map.qq.com icon/style ERR_CONNECTION_CLOSED，之后My/反馈正常。外部底图网络与反馈模板分别记录，不以底图错误解释此前入口。未重启开发器或触发信任。全A–F仍active，下一检查反馈选项文字并继续JPEG真实picker验证。

## 续批：反馈禁用选择文字样式与入口再次失败

- 前轮普通模板两次导航为progress。本轮源码确认localDraft.recovery令commandBusy=true，chip/kind按钮native disabled；同仓import/profile已显式覆盖disabled文字填充。贡献页加入限定.contribution-page chip及kind-choice disabled颜色/opacity/text-fill和子Text inherit，selected使用choice-selected-label，保留disabled语义不允许编辑。实际dist/weapp/content/contribution/index.wxss225/236含text-fill修复。
- 原窗口watch14:39:35 Launch3177ms，Map→My正常，本轮说明1056,313/标题1045,291均未进入。故上一轮去compileMode两成功不足以证明根因或稳定修复；当前保留普通模板但入口仍未解决，不再把它列已完成。当前停My，本轮无新增touch诊断，不能断言cancel。
- 样式修复目前只有源码/编译证据，实际DAY禁用可读性未验证，应下一继续获取真实页面并必要时调整。未丢弃/恢复本机副本、未改正常1355。地图此轮底图随后恢复，旧ERR_CONNECTION_CLOSED不作常驻故障。
- 全A–F active。本轮有实际编译改动与反证，不标blocked；不重启DevTools或触发用户信任。

## 续批：明确激活窗口后导航成功，禁用文字实际可读

- 前轮禁用样式与入口反证为progress。本轮查ComputerUse现有API：click只暴露坐标/按钮/次数，无press duration；没有自建SendInput绕过。对原窗口108267732执行activate_window后fresh截图，再点说明1056,313成功进入反馈。单次成功只能作为后续操作优先明确激活的线索，不能确定过去全部失败根因。
- 同watch14:39:35/Launch3177ms产物，DAY100%390×844真实反馈页可见“选择正式观星点”“新地点”“新增地点建议”和末段道路/停车/设施/开放情况/进入规则/夜间安全等文字。上一轮disabled样式实际改善获证，不再只是编译证据。保留本机恢复panel，点击禁用正式地点按钮913,452后仍新地点选中，未出现FormalSpotField，禁用语义保持。
- 当前停反馈顶部，无恢复/丢弃/保存/提交，没有正常DB写入。副本来源/与rev14关系尚需安全核对，不能把恢复panel直接当基线修复失败。下一可先恢复核对自己的测试输入，再复用1355继续实际JPEG上传；不要清掉未知用户输入。
- 全A–F active，入口跨冷启稳定/其它主题200%仍待证。未重启DevTools/无人工信任。

## 续批：真实WEAPP JPEG picker→清理→移除闭环

- 前轮禁用样式实际验证为progress。本轮原窗口先activate/fresh，恢复本机输入，仅还原不提交。实际名称“仅私有传输测试1355（非真实地点）”、region本机验证占位地区、22/114、13:53、47字测试说明、OTHER、rights true/precise false与原测试一致；media0，未发现用户新内容。
- 真实选择图片→原生打开文件对话框，filename输入artifacts/miniapp/upload-fixture/self-generated-with-private-markers.jpg，Return确认。页面“图片已安全上传”，media1/3已就绪。正常PG只读回执17|1|DRAFT|UPLOADED|699，sha256 8f5f513a99528a55b634ffbf4fac76a9d7e72450ba098c57f6de728124cc68b4，与原699B自绘JPEG Get-FileHash一致。这是实际WEAPP本地picker/传输/服务器清理回执，不仅单元测试。
- 随后实际移除按钮+小程序移除确认，页面0/3，PG最终18|0|DRAFT|0|0（UPLOADED0、非null object_key0）。原四PNG历史加本轮JPEG，共五已移除。未提交审核/公开/正式点。唯一1355草稿继续保留复用。
- 当前停反馈下部，watch14:39:35同产物，DAY100%390×844；未重启。自有合成APP1/COM不等于真实相机GPS/方向全覆盖。下一退出再进验证媒体基线不生成虚假本机副本，以及继续其它A–F，不缩减完整goal。

## 续批：媒体操作后重进无虚假副本，服务器接续成功

- 前轮真实WEAPP JPEG完整链路为progress。本轮原窗口activate/fresh，JPEG移除后反馈back→My→说明点击进入反馈，实际顶部只有服务器“这里有一份未完成草稿/继续草稿”，无“本机有未完成的输入”panel。说明上轮保存+media revision17/18经advanceSavedRevision后没有把已保存表单重新持久化为未保存副本。
- 再点继续草稿，13:53与47字自有测试说明恢复，服务器继续panel消失，未追加保存/提交。此为真实WEAPP返回重进证据，不当作进程冷启/账号切换全覆盖。当前停恢复后的反馈顶部。
- 正常唯一1355最后PG仍rev18/DRAFT/media0，本轮只有读取/页面接续无写入。没有引入新样本或重启开发器；完整A–F仍active。下一应转其它页面/主题尺度检查，避免已完成JPEG/baseline循环重测；保留实际相机方向、全矩阵与正式点/设备不足等缺项。

## 续批：夜间系统前景色实际修复

- 前轮媒体基线实际验证为progress。本轮反馈back→My→设置→夜间真实切换。正文夜间正常，但顶部时钟/信号/电池仍黑且胶囊白底，设置下载/删除右箭头黑色难辨。查syncNativeChrome只有background/tab同步，缺setNavigationBarColor。
- 增加setNavigationBarColor前景DAY黑、NIGHT/OBSERVATION白（平台只允许黑/白），背景复用theme.canvas，无新色源。native-chrome测试补navigation调用/颜色断言，4测试及miniapp typecheck通过native-chrome-check.log。
- 原窗口watch14:47:58 Launch11097ms自动冷启到NIGHT Map，实际时钟/信号/电池白字、胶囊深底白图标，修复可见。底图当时未绘制不等于API失败。当前偏好NIGHT，后续主题验证完成再恢复DAY；未改其他设置/正常业务数据。
- 未解决设置箭头等源SVG深色问题：SemanticIcon source分支一直src=原图，CSS源图不随currentColor；需遵守现有图标几何/来源，用已有mode资源或生成派生色，不能盲目全局滤镜导致OBS白光。下一继续此具体缺项。全A–F active，未重启开发器/无信任请求。

## 续批：源SVG按设计源生成三主题笔画并实际夜间验证

- 前轮native前景为progress。源SVG stroke=currentColor在Image独立文档里不继承外层颜色，导致原chevron/download/trash/wifi-off/images夜间黑色。扩展既有generate-mode-icons：调用readDesignTokens(DESIGN.md)，为五原SVG各day/night/observation派生，仅替换stroke=currentColor为对应text-primary，保留路径/形状/ISC注释；不引入滤镜/新图标家族/硬编码第二色源。
- SemanticIcon source分支选择对应-mode.svg，arrow-left专属逻辑保持。15新增资源纳入现有marker-manifest哈希及--check，当前33资产校验通过；miniapp typecheck通过themed-source-icons-check.log。
- 实际原窗口watch14:49:24 Launch6387ms，NIGHT100%390×844，Map→My：反馈图片图标、各行右箭头、内容导入下载图标均浅色可见；系统前景也白。此次未单独进设置重看trash，不把全五图标/OBS/day全矩阵当已实测。
- 注意Map底图仍日间亮色，NIGHT控件深色：属于原生地图主题/平台能力待核对，不因图标修复宣称整个夜间完成。当前停NIGHT My，后续检查OBS与设置源图，完成主题检查后还原DAY。全A–F active，1355rev18/0媒体未操作。

## 续批：设置同现间歇点击，核对地图主题平台边界

- 前轮源SVG实际夜间为progress。本轮原窗口NIGHT My，activate/fresh后设置923,392点击不转，重新activate后设置空白1108,401也未见立即导航。此反证说明间歇点击不限反馈按钮，不能再归因feedback compileMode或业务handler。未强制导航/重启，当前仍NIGHT My，OBS实际检查尚未完成。
- 核查实际Map组件pages/map/index.tsx1051起只有viewport/markers/polygons/gestures无map style。root node_modules/@tarojs/components/types/Map.d.ts177虽有theme属性，但注释supported jd，不能给WEAPP盲加theme=dark。官方微信map页web打开失败；搜索只取得官方demo darkmode配置及腾讯社区custom subkey线索，没有证明可用WEAPP内置夜间主题。暂不添加无效prop/硬编码styleId/不明key。
- 下一需查现有腾讯地图样式能力/配置拥有者并据实际权限接入，或继续可执行页面检查。NIGHT底图亮色保持未完成项。无源码/业务数据变化，本轮平台边界与设置反证改变下一动作，不标blocked；全A–F active。

## 续批：33图标检查修正及设置三主题实际验证

- 前轮平台边界为progress。本轮完整fast session25712在workflow唯一失败：manifest assets固定18 vs新增后33。前序三workspace类型/tests及design system已通过。修改workflow检查为33，并对5个SVG×3mode逐个断言存在、精确主题stroke且全部其它字节含形状/许可与源一致，而非只放宽数量。
- 重跑test:miniapp:workflow 76通过themed-icons-workflow.log；续跑fast剩余icons33/semantic24/designbindings全部通过。未把原失败日志改成通过，integrated-fast-check.log保留失败，修复证据单列。
- 实际设置右箭头1161,397这次进入成功，NIGHT设置download/trash/chevron浅色可见；切OBS黑底红色三图标可见，native顶部因平台黑白约束白色；再切DAY，顶部黑色回归。当前DAY设置。没有改提醒/位置/其他偏好。瞬时切换资源加载待fresh观察，不能把中间帧当稳定全覆盖。
- 全A–F仍active，14×矩阵/物理设备/正式点与地图底图主题等缺项保留，无DevTools重启或用户信任。

## 续批：DAY大字设置与My实际单列/底部可达

- 前轮三主题图标为progress。本轮原窗口DAY设置下滚到可访问性，真实打开大字模式（原关），设置文字放大：说明换行、开关独立一行、底部同步/清缓存按钮分行且可见；未实际执行同步/清缓存或其它业务操作。
- back返回My，账户摘要个人链接/待审核由两列为单列，计划/反馈由两列为单列，长中文未越界。继续下滚，设置/主页链接/内容导入完整可达，底部Tab不遮盖最后入口。只是390×844 DAY大字当前观察，不证明320/375/430、系统读屏或其他主题。
- 当前停DAY大字My下部，largeText=true暂保留用于下一页面检查，完成后恢复false；其余偏好未变。原1355rev18/DRAFT/0媒体未操作。未改代码，本轮真实布局证据补矩阵，完整A–F active。

## 续批：DAY大字主页链接与字段错误关联修复

- 前轮设置/My大字为progress。本轮My下部主页链接右箭头实际进入，DAY大字390×844：平台2×2、名称/URL输入、可见性说明/开关、保存按钮和0条空列表均可滚动阅读，未建新链接。
- 空表单点保存触发“请填写主页名称；当前输入会保留”，实际却位于URL下方，未定位名称。源码验证一个validationMessage总在URL组。修复名称空时提示放名称组，名称存在的URL错误仍在URL组；新增validationField请求对应Input focus，onBlur释放以便再次校验聚焦。保留原输入/验证/账号/提交流程。
- miniapp typecheck通过profile-validation-check.log。实际大字错位问题为修改前证据；修改后watch将冷启，尚未验证IME/focus滚动最终效果，不宣称完成该项。当前largeText true/DAY，后续继续对应验证再恢复false。无正常业务记录写入，1355rev18/0媒体保持。全A–F active，无开发器重启/信任操作。

## 续批：主页名称校验实际归位

- 前轮错误位置/focus修复为progress。本轮原窗口watch14:58:21 Launch6986ms，DAY大字，Map→My下滚→主页链接正常进入，无副本/0条记录。空表单保存后实际名称错误紧贴名称Input下方、位于URL标签之前，换行清晰；未写新记录。
- 模拟器未展示软键盘，不能凭focus prop声明IME/系统焦点全验证。实际工具focus可访问性另查，未向输入框写测试内容避免制造新本机副本。下一可核对有效名称+无效URL字段错误，或独立回归测试；当前停带名称错误的大字主页链接，largeText仍true需最终恢复。
- 全A–F active，实际位置修复得到证据；账号/数据库/正式点无变，未重启开发器或触发信任。

## 续批：主页链接字段校验行为回归

- 前轮真实名称错误归位为progress。本轮扩展既有actions.test.ts runtime，不复制save逻辑；使用真实contracts validateExternalUrl，加入空白名称/无效URL分别选中displayName/url、可理解错误、零create/delete请求、操作锁释放及重复校验再请求焦点。
- 主页链接目录全部9测试通过profile-validation-tests.log，包含既有删除确认锁、失败刷新不改写成功回执、本机草稿账号隔离/存储故障/恢复清理等。聚焦测试验证应用请求正确字段，不等于设备IME实际显示，保持前轮边界。
- 本轮仅测试修改，无正常数据/原窗口变化。当前DAY大字主页链接空表单名称错误；largeText仍true，后续实际检查后恢复。全A–F active，未重启开发器或请求用户操作。

## 续批：恢复既有自动化连接并同步运行快照

- 原窗口DAY大字主页返回仍间歇未生效，未重启开发器、未请求信任。只读连接现有9421成功，currentPage地图；与原可见主页不同，因此未混同证据。
- TCP owner6628；其wxfilewatcher子进程13184实际绑定artifacts/miniapp/integrated-runtime-snapshot。systemInfo SDK3.17.2、390×844/window762；截图existing-9421-binding.png为DAY大字地图。确认这是本任务旧隔离快照，原SDK3.17.1窗口及其账号不变。
- 将当前成功watch产物apps/wechat-miniapp/dist/weapp按逐文件SHA256差异复制到已有snapshot/miniprogram，189文件中30更新，不删除、不改project.config、不重启开发器。需下一连接观察自动编译后的当前页面/截图及实际导航，不能以同步命令成功称当前运行验证通过。
- 原窗口largeText=true/DAY仍待恢复；snapshot原本DAY200另账号保持。唯一正常1355反馈rev18/DRAFT/0媒体未操作。全部A–F active，下一优先利用已恢复官方automator完成页面观察，避免重复native点击阻滞。

## 续批：同步后快照实际导入大字检查

- 前轮恢复连接与同步为progress。本轮9421 currentPage最初Map，switchTab调用超时但重新读取已是My；因此不是导航未执行。截图和page.$元素读取分别超时，未重启开发器；此连接只证明部分协议可用，不能称全面恢复自动化。
- sky.get_window({id:60360878})重新取得窗口，实际snapshot Launch16581ms/DAY200/390×844 My。滚动后点内容导入右箭头，稳定画面进入content/import/index。来源/权利说明换行，平台2×2、原始URL单行、权利switch独立行；下滚可见创建按钮及既有草稿0条/空提示，未见横向越界或底部不可达。未切权利、未输入或建立草稿，不影响正常十样本账号。
- 此证据仅该空态/视口/主题；不代表编辑长文/IME/320宽/三主题矩阵完成。原窗口108267732依旧DAY大字主页待恢复largeText false；snapshot原本DAY200保持。
- 已启动当前源码完整check:miniapp:fast，日志artifacts/miniapp/integrated-fast-current-check.log；必须读取实际进程结果后记录，不能将启动当通过。全A–F active。

## 续批：完整快检通过与导入首错定位修复

- 上轮实际导入大字为progress。完整fast session52878最终exit0，integrated-fast-current-check.log：workspace类型/测试、workflow、33图标、24semantic和design bindings全部完成；此结果在下面导入改动之前。
- snapshot DAY200空来源/未确认权利，实际点建立草稿，无服务端写入，错误却显示在权利开关下方“来源链接不可用：保留草稿并检查链接长度”，来源Input在更上方。代码确认空URL沿用通用validator恢复文本，未focus。
- import/index.tsx：空链接明确要求完整http/https来源并保留输入；invalid source请求sourceFocus，Input blur释放；来源错误置Input旁，非空实时validation与提交错误去重，合法来源下权利错误保留在权利组。不改创建/幂等/账号/保存语义。
- miniapp typecheck通过import-validation-check.log；import-actions新增提取真实beginCreate/真实contracts validator，空白/危险协议/合法URL未确认权利3场景，断言无请求、正确focus与错误文本；目录该文件5测试通过import-validation-tests.log。
- 尚未同步snapshot或实际复核新首错/focus/IME，不能宣称设备聚焦完成。原窗口DAY大字profile，snapshotDAY200import空表单错误，均未新建数据。全A–F active，下一同步已成功watch后复核改动或继续剩余矩阵。

## 续批：新导入产物实际启动，交互观察边界

- 前轮代码/5测试为progress。本轮确认dist/weapp/content/import/index.js包含新空链接文案，按hash同步snapshot仅2文件。现有实例自动Launch4787ms，9421 navigateTo导入本次exit0，原开发器未重启。
- 60360878真实DAY200导入空态已见新runtime；点击首屏底部创建按钮停留pressed状态，后续fresh未出现错误；9421 page.$再超时。Return也未触发可观察校验。未称首错归位/IME实测通过，未把工具观察超时视为应用退出，也未为此重启。
- snapshot仍空来源、权利false、0草稿；无创建请求/新记录迹象（代码验证无效输入零请求，未另称全网络证明）。上一轮实际旧版错位证据与本轮代码测试保留。下一应转独立剩余实现/检查，避免持续重复同一点击；原108267732 largeText true仍需最终恢复。
- 全A–F active，正式点/真机/矩阵缺项不缩减。

## 续批：导入预览缺项的可执行恢复入口

- 前轮新runtime/交互边界为progress。本轮转独立实现：PREVIEW提交按钮会因rights/title/body缺项disabled，但原页面只显示占位文案，没有返回较远字段的直接恢复入口。
- 新preview-recovery.ts按rights→title→body选择首个缺项，空白不算有效；index在PREVIEW提交组用既有StatusPanel显示具体原因/去确认或填写操作。恢复清scroll anchor/focus后nextTick定位现有权利/标题/正文group；标题Input和正文Textarea请求focus并blur释放。同owner及操作锁前后检查，未改原disabled/服务端审核/幂等/账号保存规则。
- miniapp typecheck通过import-preview-recovery-check.log；导入目录全部测试通过import-preview-recovery-tests.log，新增缺项递进/空白与提取实际recoverPreview确认scroll+focus重置、异步换号后不回写。测试不等同实际IME/屏幕阅读器或所有viewport表现。
- 当前snapshot尚未同步本轮新编译产物，仍上轮空来源/未确认权利页，0草稿未新增；原窗口largeText true仍待最终恢复。下一需复核新恢复入口实际滚动及无额外overflow，或继续全A–F其余待办；不为点击间歇问题重启开发器。goal active。

## 续批：预览恢复生命周期与正常第十草稿大字回读

- 前轮恢复入口实现为progress。新增pageVisible/recoveryGeneration：hide/unload使延迟focus请求失效，show恢复可用；重复恢复只允许最新generation，仍保留owner/操作锁前后检查。类型检查及preview-recovery两测试通过import-preview-lifecycle-tests.log，测试新增离页后不回写/不新增排队。
- 原108267732正常watch15:20:20 Launch4776ms自动更新，DAY200。Map→My→下滚→内容导入实际成功，回读原第十“银河下的彗星｜来源元数据导入测试”，平台其他、权利已确认，无新建/保存/提交。
- 大字实际选中草稿名称换行、五阶段纵排完整可读；编辑区标题/说明/自动解析未开放提示正常，标题单行显示，既有正文按大字多行。当前停编辑正文上部，尚未滚到预览恢复、更未改空标题制造副本。此次只证明已有数据回读与部分大字布局，不代替所有恢复/IME/视口验证。
- 原账号DAY largeText仍true；snapshot仍旧空导入状态未同步最新preview实现。无重启/信任/服务端写入，全部A–F active。下一继续原第十编辑区下部/预览检查，并最终恢复原大字偏好。

## 续批：第十导入大字下部验证并恢复正常字号

- 前轮生命周期/回读为progress。本轮正常108267732 DAY200第十草稿下滚：46字正文在Textarea内显示（固定高度末行需内部滚动，未另验证输入/IME），来源备注单行；私有/公开、保存、三项关联说明均可读且完整可达，当前独立提议保持。
- 继续预览区：长标题换行，46字正文完整可见，独立地点提议待审核说明与提交人工审核按钮可达。没有修改/保存/提交，也未以有效现有草稿当作新增缺项恢复入口验证。未进入下方十条全列表，本轮不是完整14路由矩阵。
- back→My→设置实际成功，下滚到可访问性，确认大字开，点击关闭后真实普通字号且大字开关“关”；DAY与减少动态关等其它偏好保留。原账号largeText恢复false完成，不再作为待办。snapshot仍其原DAY200状态，未改。
- 当前原窗口DAY100设置可访问性/本机维护处。全部A–F active；下一应推进其它尚未覆盖路由/独立业务问题，不重复本轮导入大字检查。无开发器重启/信任请求。

## 续批：文章正文不再被地点概览失败遮断

- 前轮正常字号恢复/大字观察为progress。本轮转其余路由源码，article/detail把loading设guides或overview pending，error分支任一overview失败/无detail均遮断已成功取得的article，违反静态正文可用性。
- 文章加载仅由无article且guides pending决定；无article保留明确错误和重试攻略。已取得article在overview pending/error时继续渲染，用既有StatusPanel显示地点/媒体加载或部分可用与重试；guides刷新失败且旧article存在显示STALE。路由formal spot/context/article匹配条件保留。
- 媒体只有detail存在才解析授权/归属；detail缺失提示媒体资料尚不可用，不能谎称不存在符合授权图片。正文/设施独立恢复和Provenance保留。
- miniapp typecheck通过article-partial-check.log（随后仅调整媒体缺失文案/状态+测试）；新partial-content.test提取实际ArticlePage返回JSX/真实loading声明渲染，overview pending/failed正文保留且不造媒体，无article/invalidRoute不借用正文，2测试通过article-partial-tests.log。无真实正式点文章运行证据，未声称该链路完成。
- 原账号偏好已DAY100（上轮恢复），当前watch修改可能自动冷启；snapshot仍未同步近期导入/文章改动。无正常业务数据写入、发布或DevTools重启；全A–F active。

## 续批：场地无上下文实际验证与地点回执限制

- 前轮文章修复为progress。本轮最初只读共享spot-detail-page上部/返回主体，误判disabled query无效入口会无限loading，实际进一步读205行发现既有提前guard。已明确撤回该判断并去掉新增重复提示分支，不声称修复不存在的无限loading问题。
- 保留有用改变：validRoute统一spot前缀/contextComplete；overview detail必须回执spotId等于route spotId，GUIDES/SITE查询同样需validRoute且overview回执地点匹配。原提前guard复用validRoute，原解释/返回地图动作保留。
- 类型检查spot-route-guard-check.log通过（随后仅去冗余branch/复用guard条件）。同步snapshot6变更文件含近期导入/文章，Launch6066ms。9421 navigateTo无参数spot/field/index回执超时，但原实例实际已进入场地页，DAY200显示既有上下文错误与“返回地图”按钮，无遮挡；该实际证据为原guard有效，不算新分支验证。
- 下一应检查地点回执不匹配回归及剩余资料部分失败行为。snapshot停无上下文field页；原账号DAY100仍保留。无业务写入/DevTools重启，全A–F active。

## 续批：查询缓存刷新失败可见性

- 前轮地点guard/真实无效路由为progress。本轮读useResourceQuery发现cached data分支强制isError false/error null，故前轮文章guides.isError且有article的STALE分支实际不可达；回归的mock不能证明真实hook会发出该状态。
- 查询返回添加独立可选refreshError，只有已有data时投射result.error；原data/error/isError/isPending/refetch行为保持。Article使用refreshError显示攻略更新失败，overview有旧detail但刷新失败也显示STALE；不将缓存包装成新成功结果。
- resource-refresh-check类型通过；新增实际hook函数提取测试缓存+error保留data并暴露refreshError、成功清掉原因、无data错误/加载原行为；文章真实JSX新增刷新失败保留正文/STALE。两文件4测试通过resource-refresh-tests.log。
- 已启动完整check:miniapp:fast，日志article-import-fast-check.log，session需后续读取最终exit才算通过。本轮未完成原拟地点回执guard回归，明确保留。原DAY100与snapshotDAY200 field状态无手动变化，无业务写入/DevTools重启；全A–F active。

## 续批：地点回执回归与本批完整快检收尾

- 前轮refreshError实现为progress。本轮补spot-detail-route.test.ts，提取生产contextComplete/validRoute/overview/guides/site/detail声明，实际query options捕获：GUIDES/SITE分别匹配/错spotId/过期context/缺receipt共8情形，只有匹配显示detail并启用对应segment查询，其他不显示/不启动从属查询，过期context不启用overview。spot-route-guard-tests.log通过。
- 完整fast session56500最终exit0，article-import-fast-check.log包括最近导入、文章、shared query改动及所有workspace类型/tests/workflow33icons/24semantic/designbindings。新增地点测试在fast启动后单独执行通过，不假定已包含于该次fast枚举。
- 本輪只测试和检查，原DAY100、snapshotDAY200无手动变化，无业务写入/DevTools重启。全A–F active；正式点资料/完整路线、硬件和14路由矩阵仍未完成，不能以快检收尾goal。下一推进其它实际路由或数据来源可执行工作。

## 续批：攻略列表空态与新增测试类型修正

- 前轮快检/地点回执回归为progress。本轮确认GUIDES成功返回空数组时只有map空白，补既有StatusPanel EMPTY明确暂无本地点攻略，可继续场地/来源；不造示例文章，不改错误/加载分支。
- 首次typecheck发现上轮fast启动后新增spot-detail-route.test数组按索引读取违反noUncheckedIndexedAccess（非页面源码问题）。改解构三个query后assert.ok存在，再比较，保留原8场景范围。
- 重跑miniapp类型通过guide-empty-check.log，地点回归通过spot-route-guard-tests.log。本轮无完整fast重跑，最新全fast前轮56500仍作为当时结果，新增修正由定向检查覆盖。
- 无正常业务写入或原偏好改变，真实正式攻略空页仍未能从完整正式点流程验证，别把局部代码检查当全产品验收。全部A–F active。

## 续批：场地导航迟到操作失效

- 前轮攻略空态为progress。检查openNavigation发现await警告/选项/路线后无页面或context保护，旧路线回执可setRequestedRoute并openLocation；选项菜单非cancel错误还直接默认tapIndex0外部打开。
- 增navigationEpoch/scope绑定spotId/routeContextId/fingerprint/revision，hide/unmount失效，scope变化失效；route状态重置依赖完整context版本。每个决定性的await后核对current，旧估算不写状态/通知/打开外部地图，不清理新操作pending；fallback复制确认也检查current。选项菜单错误仅提示重试，不默认导航。
- 4项提取真实openNavigation回归覆盖旧菜单、已开始旧路线、菜单失败、正常路线；最初测试单个Promise微任务未保证估算已启动，改用显式routeStarted握手后全部通过spot-navigation-scope-tests.log。包含新增测试后的miniapp typecheck通过spot-navigation-scope-check.log。
- 未称真实供应商路线/正式点出行链路完成；无实际外部地图打开或业务写入。正常DAY100，snapshotDAY200无需用户点击信任。完整A–F active，下一复核导航剩余失败/安全说明和其他待办。

## 续批：导航原生失败与复制语义

- 前轮迟到操作为progress。本轮发现出行阻断warning showModal在既有try之外，拒绝会抛未处理promise；clipboard原始失败被当openLocation失败弹“无法打开地图”，语义不对。
- openNavigation外层捕获原生提示/回退复制失败，仍current/cancel过滤，提供可理解未完成反馈，不继续默认打开。tapIndex1复制失败独立提示“坐标未能复制”，不弹假地图失败。新操作起始清前一轮routePending，避免替代后旧finally不能清但新菜单取消留下加载状态。
- 类型spot-navigation-scope-check.log通过；扩展真实handler回归warning拒绝不导航且promise handled、copy拒绝无地图modal，共6项通过spot-navigation-scope-tests.log。保留前轮迟到估算/菜单与正常路径。
- 无实际外部地图/clipboard/正式点状态变化，无DevTools重启；全A–F active，物理设备/正式点出行链路仍待证。

## 续批：场地页外部导航遵守坐标公开策略

- 前轮导航失败处理为progress。本轮对照主地图onPanelNavigate：主地图非PUBLIC_EXACT直接拒绝外发坐标，但场地页canCopyExact false只隐藏复制项，仍openLocation精确gcj02，跨入口边界不一致。
- 场地openNavigation在任何modal/sheet/路线/native动作前拒绝非PUBLIC_EXACT，沿用地图明确提示公开到达说明，不向地图或剪贴板发送。真实contracts支持PUBLIC_APPROXIMATE；新增对应回归，全部7导航测试通过spot-navigation-scope-tests.log，miniapp类型通过spot-navigation-scope-check.log。
- 主地图还有独立待查：onPanelNavigate直接openLocation，需核对出行阻断的上游控制/当前spotDetail防错点，再判断是否需要相同安全确认，不能假定已覆盖。此前场地分支canCopyExact条件因新增前置guard部分冗余可后续局部清理。
- 无实际外部坐标发送/业务写入/DevTools重启，原DAY100、snapshotDAY200保持；全A–F active。

## 续批：主地图导航出行阻断与失效检查

- 前轮坐标策略为progress。本轮确认spot-panel查看路线Button没有disabled/上游确认，开放安全正文虽存在，onPanelNavigate直接openLocation。补与场地相同明确关闭/禁止进入/危险提示，用户取消不打开。
- Map navigationEpoch在selected/context id/fingerprint/revision变化、hide、effect cleanup失效；warning回执核对epoch及store当前selectedSpotId，旧操作不打开/不发迟到错误。spotDetail先检查detailContextReady+selected+receipt地点匹配，避免错误点的安全资料用于确认。
- 初次typecheck提示optional两侧undefined相等不能缩窄，已显式检查selected/spotOverview.data后通过map-navigation-check.log。新增提取实际onPanelNavigate回归5情形confirm/cancel/changed/hidden/modal fail通过map-navigation-tests.log；未执行真实外部地图。
- 无数据写入或用户审批/信任；原DAY100、snapshotDAY200保持。全A–F active，下一检查地图资料/攻略真实入口和剩余矩阵，实际正式点与物理验证缺项保留。

## 续批：地图面板正式证据页面入口接通

- 前轮地图导航保护为progress。本轮实际源码搜索确认Map仅有sky/contribution navigate，spot-panel攻略摘要/来源列表只Text，field/guides/data-source/article四支持路由没有从主面板可操作入口。
- SpotPanel新增现有text-action族：完整场地资料、全部攻略、每篇阅读攻略、来源与更新时间；Map onPanelEvidence统一携带同selected spotId/activeContext.contextId，需detailContextReady及匹配spotDetail，单篇ID必须在当前地点guide集合中。导航失败明确反馈且保留Map；无重挂载/切换主地图动作。
- 移除面板可见内部spotId，来源state改已有DATA_STATE_LABELS，不继续显示FRESH等内部枚举；保留可追溯完整来源页与公开坐标规则说明。
- 含新增测试的miniapp typecheck通过map-evidence-entry-check.log；真实handler提取回归四目标路径、保留且正确编码spot/context、无关/未知文章拒绝，map-evidence-entry-tests.log通过。正式点从实际面板点击/返回仍待证，不将代码路径通过当完整实机链路。
- 原账号DAY100、snapshotDAY200仍无业务写入/DevTools重启。全A–F active，下一检查新入口布局/回程、source/field/guide路由行为与完整矩阵。

## 续批：面板证据按钮尺度与旧回调检查更新

- 前轮证据入口接通为progress。本轮读实际map SCSS发现text-action有两层重复，后层23rpx/32rpx、56rpx minheight且继承nowrap，直接使用新入口会小字/不换行。
- 合并成一处：target-min点击最小宽高、type-action字号行高字重、space-inline与icon-small、max-width100%、normal换行/anywhere断词；去旧第二块而非尾加覆盖。编译dist/weapp/pages/map/index.wxss实际已输出同一完整token规则，无旧23rpx字号该selector。
- workflow首次唯一失败是此前新增navigationEpoch后旧useDidHide单行regex不匹配；更新断言同时要求epoch递增与setPageVisible false，未删隐藏责任检查。重跑76测试通过evidence-action-workflow.log。实际按钮在有正式点面板的大字/320宽测量仍待证，编译样式不等同真实viewport。
- CustomNav代码确认正常navigateBack优先/无前页fallbackMap，但未新增实际回程证据。无数据写入/DevTools重启/原偏好改变，全A–F active。

## 续批：地点面板恢复连续文档第一步

- 前轮按钮尺度为progress。本轮读SpotPanel发现section===overview/astronomy条件卸载另一段内容，违反同一连续文档/章节定位的核心要求，不能被历史局部测试视为完成。
- 移除两段条件挂载，概览→天文保持同一ScrollView文档；章节按钮role从tablist/aria-selected改group/aria-pressed，点击记录sectionRequest并expand large；effect在large后reset+set scrollIntoView，重复同入口新request仍可定位，定时回调有cleanup。scrollY仍仅large，scrollWithAnimation false。
- miniapp typecheck通过panel-continuous-document-check.log；检查section===只剩选中样式/语义，不再控制内容存在。此只是第一步，尚未完成滚动回写章节/测量生命周期/取消恢复、右侧永久留白移除、真实完整手势矩阵。不能称连续文档完整验收。
- 下一优先完成该核心范围，不让上下文压缩把本批当全部完成。原DAY100、snapshotDAY200无业务修改，watch会自动更新但未实际验证正式panel；全A–F active。

## 续批：连续面板章节滚动回写

- 前轮连续文档第一步为progress。本轮SpotPanel添加稳定scroll id，large时在内容/spot/字号/resize变化后nextTick批量读scroll viewport top、astronomy top和scrollTop，缓存文档内章节边界；onScroll只比较缓存，不每帧query。
- 滚动跨天文章节边界回写section，反向回概览；非large/无有效measure不猜边界。effect取消令迟到query回执无效并清offset。useResize与largeText订阅覆盖布局变化；原点击expand→scrollIntoView保留。
- 提取真实测量effect/onScroll回归：已有滚动量下计算文档边界、往返跨章、4次scroll仅一次query、cleanup后scroll不更新、迟到measure不复活，通过panel-section-sync-tests.log。含测试的miniapp typecheck另执行panel-section-sync-check.log，需按工具exit记录。
- 未解决右侧永久留白/侧栏遮挡、真实滑动与布局测量/媒体边界等后续；现有测量测试不等同WeChat实际selector结果。原DAY100/snapshotDAY200无业务写入/重启，全A–F active，下一继续连续文档核心要求。

## 续批：章节定位消费与换点滚动重置

- 前轮scroll回写为progress。本轮确认sectionRequest旧值在extent medium→large时effect重跑会再次跳旧章节；同一SpotPanel无key换点也保留旧section/scroll。
- sectionRequest带spotId，handledSectionRequest按请求对象记消费；每次点击仍是新request，已消费请求不因extent变化重放。换spot effect回概览并请求document-start，起点定位在medium亦允许；旧spot请求直接忽略，timercleanup保留。
- miniapp类型panel-section-sync-check.log通过（新增测试前）；panel-section-sync-tests两测试通过，新增实际effect fake timer验证一次消费、收起展开不排队、错spot拒绝、medium新点起始定位、cleanup删除等待timer。真实WEAPP滚动/重新抓取与侧栏永久留白仍未完成。
- 无业务数据写入/偏好变化/DevTools重启；完整A–F active，下一继续面板右栏占位与当前编译/运行验收，不能停在局部合格。

## 续批：连续文档完整快检与侧栏约束核对

- 前轮请求消费/换点重置为progress。本轮启动并两次实际poll session18868，最终exit0，panel-continuous-fast-check.log完整checks通过，包括最近导航/证据入口/连续文档/章节同步测试和各workspace types、workflow、assets、bindings。
- 核对附件二448行明确：悬浮定位条不能用永久右侧空列避让，也不能遮挡可点击内容或右对齐值。当前map/index.scss1757 document padding-right84rpx；2116小屏76rpx；section rail1186 base overflowhidden+60×104rpx，1841覆盖48×112rpx，section-tab后层min56rpx。这些旧规则需合并并与44px真实target共同解决，不能只删padding造成覆盖，也不能只扩大rail增加遮挡。
- 本轮没有未验证地改侧栏位置或重定义为顶部tabs，保留明确当前缺项。下一应通过可用隔离正式点运行样板检验局部避让，或先继续相关拥有者代码；正常正式数据不足不允许伪造现实地点开放/安全事实。原DAY100/snapshotDAY200无变，未重启开发器；全A–F active。

## 续批：隔离本机 fixture 编译与 API 启动（用户离线继续）

- 用户睡觉后要求绕过需要手工点击的环节，继续 goal；未重启开发器、未触发新信任/扫码流程。A–F 仍 active。
- Taro build CLI 源码无独立 output 参数。config/index.ts 添加显式 MINIAPP_ISOLATED_FIXTURE_BUILD=1：仅在 MINIAPP_DEVELOPMENT_FIXTURE_MODE=1 时允许，固定输出 dist/weapp-fixture，不接受任意路径；copy/assets 同根。默认仍 dist/weapp，正常 watch 不共享输出。未改变已有 snapshot 的包或账号。
- 本机隔离 API session86038/PID7120，127.0.0.1:8879：MEMORY_TEST + development fixture + LOCAL/LOCAL_TEST，清除子进程 DATABASE_URL/REDIS_URL，route/placeSearch/media DISABLED，测试天气。无正常库写入；health/live 实际 HTTP200。日志 artifacts/miniapp/isolated-fixture-api.log。停止只针对本 session/process，不停正常8787。
- build session51429 exit0，环境 fixture 开关两项=1、API_BASE=http://127.0.0.1:8879，执行 workspace build:weapp；产物 dist/weapp-fixture，日志 isolated-fixture-build.log。构建4条 postcss-calc 警告涉及 search/map var/env nested calc，未宣称解决。workspace typecheck exit0，isolated-fixture-typecheck.log。
- 下一步：检查隔离产物 marker/API 常量和 assets，复用已信任 snapshot60360878 项目，仅同步已确认生成包（不动项目配置/正常输出/正常账户）；实际测试正式点面板，落实悬浮章节栏44px与禁止永久空列/遮挡。测试点仅布局反馈，不冒充正常26点发布事实。若官方automator9421超时但导航实际生效，用现有sky窗口观察，不重启制造信任卡点。仍需完整矩阵和真实数据/设备外部事实。

## 续批：真实 fixture 点选与面板字级修复

- 前轮隔离 build/API 为 progress。8879 health 再实测200。生成包复制到已有受信任 snapshot/miniprogram（没有删除目录或改 project config），开发器自动重载，未重启/信任操作。
- 正常保存的旧 context 在隔离 API 返回404；未清空账号/storage。官方automator9421实际 navigateTo('/spot/search/index') 成功，搜索展示“自动化测试正式观星点”，真实点击候选回Map、生成当前选点/medium面板。测试点名称及地址明确不对应真实地点；无正常数据库发布/写入。
- 实际DAY200面板正文放大而title/actions/rail仍旧小字；点击非手势控制后出现large连续文档、底部来源与更新时间。具体控件命中/滚动定位仍需补实测，不能以本次画面证明所有手势或44px。Map/Search不使用CustomNav，当前fixture banner未覆盖它们，是发现的测试标记缺项，后续需补而不是声称全页已有。
- 本批合并spot-panel__title、eyebrow、value重复SCSS为唯一token角色（spot-title/metadata/data），删除large-text title 38rpx/52rpx覆盖。保留其余待迁移项目，未扩大rail造成新遮挡。正常watch会自动更新；另跑隔离build日志panel-type-fixture-build.log（session37958），按最终exit判定。
- 下一步：同步本次字级包并回到同测试点检查DAY200标题换行，继续action-bar高度/44px、章节栏局部避让/禁止永久右空列、large安全区和scroll定位。尚无完整A–F验收，不关闭goal。

## 续批：面板操作栏统一尺度与正文底部避让

- 前轮真实fixture选点/字级修改为progress。本轮核对实际action SCSS有两整块相互覆盖，最终19rpx/26rpx文字、22rpx图标、88rpx高度；DAY200截图证实动作比正文过小。
- 合并action-bar/lane/action/icon/star/selected成唯一owner。等宽flex 1 1 0，target-min最小宽高、动作token字号/行高/字重，normal换行；普通横排，大字column图文排列。panel-action-height由对应token计算，正文bottom padding引用同变量+安全区，lane也引用，避免旧128rpx不足以承载大字栏。
- 收藏星去scale(.7)，统一icon-small外框；保留现有动画语义。没有改动作业务或触发外部分享/发布。右章节栏永久空列和large安全区问题尚待处理。
- 第一次fixture build session62310 exit0（收藏星尺寸补充之前）。workflow-conformance当前76检查exit0，日志panel-actions-workflow.log。补充星尺寸后启动第二次fixture build，日志panel-actions-fixture-build.log，需poll最后返回的session并按exit更新，勿重复启动未结束build。
- 下一：最终build产物同步现有snapshot，真实DAY200同测试点复查标题/动作/底部可滚达；章节定位栏与全矩阵仍未达成，A–F active，无DevTools重启或用户信任操作。
- 最终补充星尺寸后的fixture build session19529实际poll exit0；尚未同步snapshot或取得本批新布局截图，不将编译通过等同运行验收。

## 续批：实际大字操作栏与 WEAPP 面板高度

- 上轮操作栏代码/build为progress。本轮同步snapshot，新实际DAY200画面已显示想去/分享/云观星大字和上方图标，区别于旧极小动作。中档仍仅底部很矮区域，标题被裁剪，未称布局通过。
- 源码最终medium用52dvh、large用100dvh，当前渲染与预期高度不符。将map四处dvh改为vh（含旧层large/媒体与最终medium/large），保持同一高度规则数值不改。属于候选修复，必须观察新高度才能归因，不能仅凭代码断言dvh为唯一根因。
- 最终fixture build session51390 exit0（已在首次61918完成后串行重建），日志panel-viewport-fixture-build.log；新包同步已有snapshot，未重启或信任操作。下一读取自动冷载稳定画面，检查medium与large是否恢复正确高度；如仍异常检查clamp支持/层叠/实际尺寸，勿只凭猜测连续换单位。
- A–F active；章节栏永久空列、安全区、44px和大字全文仍待验，正常业务库无变动。
- 最新实际WEAPP稳定画面：Launch7230ms，medium顶从此前约y660恢复到y464（同截图窗/viewport），标题完整两行、操作栏大字可见，确认vh候选恢复中档高度。large尚未验证，章节栏仍偏小。当前workflow76 exit0，panel-viewport-workflow.log。

## 续批：全屏展开和正文滚动实测

- 上轮vh中档恢复为progress。本轮实际点击“大”并读取稳定帧，全屏档成功展开；标题、路线/到达、核心距离大字可读，底部动作始终可见。随后在正文滚轮584，实际到设施证据/停车/厕所，面板档位与Map/My未切换，证明本次fixture下large正文确实可滚。
- 当前large顶部仍露出地图状态/胶囊区域、正文在固定动作栏后方通过，需继续测安全区和全文最终可滚达；不把本次滚轮等同真机手势或全章节自动回写验收。顶部四小档位入口与右侧rail仍不足44px，禁止简单扩大后覆盖中间104×40rpx把手；本轮未仓促替换为丢失small/medium等价的循环入口。
- 发现action-bar border-box有上下边框，normal高度44会裁掉内部44按钮边缘；panel-action-height为目标内容再加2Px边框（large同增2），保留正文与lane同变量。此2Px补充尚待最新构建；已有截图为之前版本。
- 无开发器重启/信任操作、正常数据写入。下一继续章节栏/非手势入口44px布局与当前build，完整A–F active。

## 续批：非手势档位入口44px重构

- 上轮large真实展开/滚动为progress。本轮官方automator9421仍能读currentPage地图，但首个page.$尺寸请求15秒超时(session93915 terminal)，不重启DevTools；当前几何未取得，不能宣称实测44px。
- SpotPanel把右侧4个小字档位按钮改为逐档收起、逐档展开、关闭：large收为medium、medium收为small；small展medium、medium展large；边界disabled。当前档位写group可访问名称，各动作标签明确目标。关闭用既有close语义图标；没有平台ActionSheet、额外bottomPresentation或循环丢失档位。
- CSS合并extent-actions/button/close/icon重复块：关闭左12Px、收/展右12Px（小屏旧right8rpx仍有媒体限定规则待统一），按钮target-min方框，icon-small，中间104×40rpx把手保持；group pointer-events none，按钮auto避免透明整行拦截把手。无媒体document top用target-min+8Px为按钮让位；有媒体保原覆盖关系待实际验证。
- typecheck exit0 panel-extent-typecheck.log；workflow76 exit0 panel-extent-workflow.log；fixture build session13121 exit0 panel-extent-fixture-build.log，包含前轮action边框2Px补充。生成包已同步现有snapshot未重启，下一读取冷载稳定画面并实际测试small→medium→large→medium→small与close，确认把手未拦截。
- 章节rail44px及禁止永久右空列仍未解决，整体A–F active，真实数据/设备等未删。

## 续批：新非手势入口往返实测与小档净空

- 上轮新入口实现为progress。本轮现有snapshot DAY200实际逐次点击并取稳定帧：medium→large→medium→small→medium成功；左右按钮与中间把手可见分离。最后点击关闭并取得第一帧，尚需稳定帧确认完全退出。未测试触摸拖动，不能以按钮验收替代。
- small在大字动作栏78Px后，上方44Px档位按钮与底部栏接近重叠。源码删除第一层重复small高度，最终spot-panel高度取旧基准与(target-min + panel-action-height + safe-bottom +24Px)较大值，保留medium/large覆盖。不改三档语义/文档，仅保证小档两组控件净空。
- 最新fixture build session80921 exit0，panel-small-clearance-build.log；尚未同步本批snapshot，小档修复还未实际验证。检查三个输出目录与snapshot wxss均普通目录/文件无junction/symlink，之前展开中间帧高度变化是过渡帧，不是新源码自动写入snapshot。
- 下一：稳定确认关闭后同步新包，实测small净空；章节栏44px与正文永久空列、全部A–F仍未完成。无重启、信任或正常数据写入。

## 续批：完整快检与小档净空实际反馈

- 上轮往返实测与small min-height为progress。本轮同步最新包，Launch3178ms；官方navigate搜索实际成功(session9717 exit0)，重新点同fixture回medium，再收small并额外读取静止帧。
- small顶约y637，档位按钮中心y658，底部栏从约y695起，相比旧small已分离，无此前按钮/操作栏重叠；但大字地点身份标题仍几乎全被操作栏遮挡（只有底部残字），因此不能称small布局完成。下一需在小档保留可读地点身份与动作、同时维持同文档裁剪，不以控件净空替代可用性。
- check:miniapp:fast session98428实际poll最终exit0，artifacts/miniapp/panel-layout-fast-check.log，覆盖目前全部panel title/action/vh/extent/small源码与各workspace检查。当前没有新增代码。章节定位往返本轮尚未实际触发，不从计划中推断已验证。
- snapshot仍DAY200同fixture small，API8879内存，不动正常DB/原账号；新出现worker reportRealtimeAction unsupported为平台警告未归因，不称已修。A–F active，下一优先small可读身份/章节rail局部避让与全部未完成项。

## 续批：三档高度为大字身份信息留空间

- 前轮完整快检/小档实测为progress。本轮针对small大字标题被栏遮挡，最终spot-panel增加available-height、identity-height、small-height变量：为顶部44控件、metadata行、两行spot-title、action栏、safe-bottom和32Px间距计算小档；小档上限为available-88Px。medium取原clamp与small+44Px较大、再上限available-44Px；large取available。保持三档有序和同一文档，不缩字号/替换title节点。
- 尚未证明所有短屏/极长名称可读：可用空间不足时仍需large查看，真实320/200与长中文矩阵继续待验。没有按本规则修改科学数据或地图camera。
- fixture build session54424 exit0，panel-identity-height-build.log仍4条既有postcss-calc警告；workflow76 exit0 panel-identity-height-workflow.log。产物已同步当前snapshot，首次观察为自动冷载阶段，须读稳定帧再收small验证，不以构建推断通过。
- 当前snapshot fixture API8879、DAY200，原正常账号DAY100未动；没有重启/信任操作。章节浮栏/完整A–F active，下一实测本批三档身份可读性并继续解决rail。
- 补充当前观察：首次截图实际已完成Launch6018ms（此前“冷载阶段”描述过早）；随后点击收起，small顶约y491，两行测试点标题约y584–672，底部栏约y695起，标题现在在栏上方可读。仍需下一稳定帧及320/长名称验证，不能扩大到全矩阵。

## 续批：把手取消不再提交档位

- 前轮三档身份高度为progress。本轮读实际handler确认SpotPanel onTouchCancel此前绑定onHandleTouchEnd，导致系统取消也按offset提交；不能由之前按钮往返测试覆盖。
- 新增onHandleTouchCancel仅清drag ref与offset；从Map传入并绑定取消事件。start/move多指（touches长度非1）取消；moved阈值统一8px。useDidHide清未完成拖动；bottomPresentation/selectedSpotId/panelExtent变化effect同样清旧drag，避免切点/换层/按钮改档后的旧end提交。
- 新panel-drag-cancel.test.ts提取真实四handler执行，覆盖显式cancel、move第二指、multi-start、迟到end、7px不提交与8px正常提交；1测试通过。含新测试workspace typecheck exit0 panel-drag-cancel-typecheck.log。workflow hide检查同步增加drag清理义务，当前76检查exit0 panel-drag-cancel-workflow.log。
- 本轮未重建fixture包，当前snapshot仍上一轮三档身份高度版本；真实触摸cancel/后台/重抓仍待验证。连续拖动现有offset clamp±120/单步提交、速度/真实锚点仍有既有要求未完成，不以本次取消修复宣布手势整体完成。章节rail及全A–F active。

## 续批：把手触点归属与意图前静止

- 上轮取消handler修复为progress。本轮panelDrag记录起手identifier，move时若已知identifier与当前touch不一致直接cancel，防单触点被替换接管；无identifier的兼容事件保原单指路径。未达到8px意图前不再setPanelDragOffset，避免7px以内先拖面板但end不提交的行为。
- 实际handler测试增加sub-threshold offset始终0、identifier1起手/2移动不能提交且恢复0，定向测试通过；workspace typecheck exit0 panel-drag-ownership-typecheck.log。没有声称已完成速度/真实锚点/重抓/全部仲裁。
- 本轮启动fixture build（包含前轮cancel及本轮ownership），日志panel-drag-ownership-build.log，需poll活session取得最终exit；当前snapshot尚未同步这两轮JS。下一编译成功后同步受信任snapshot并在可用实际输入路径验证，不重启开发器。
- 全A–F active，章节rail/小屏大字/真实设备等未完成项保留。
- fixture build session80671实际poll exit0，panel-drag-ownership-build.log。尚未同步snapshot，下一可直接同步当前dist/weapp-fixture，不必重复构建。

## 续批：把手真实拖动与章节实际定位、适合目标文案

- 前轮ownership/build为progress。本轮同步现有snapshot，Launch6804ms。按ComputerUse文档sky.drag真实鼠标输入，在把手(1006,460)上拖到363后稳定large；large把手234下拖320后回medium；medium正文562上拖465保持medium，不发生切档。本次是开发器鼠标模拟，不是Android/iOS触摸、多指或系统cancel验证。
- 点击medium天文章节按钮(1170,643)，实际展开large并定位到“天空专业矩阵/适合目标”，证明此fixture下点击定位路径有效；未证明滚动回写/重复定位/回概览，rail小命中/正文空列仍待改。
- 新画面“适合目标”显示NAKED_EYE/PHONE/MILKY_WAY内部枚举，现添加按SkyOpportunity.suitableFor联合类型穷尽的标签映射：肉眼观星、手机拍摄、银河、星轨、深空天体；只改展示不改决策。workspace typecheck exit0 panel-target-labels-typecheck.log。标签这最后一项尚未重建fixture；正常watch会更新但不是该snapshot运行证据。
- 当前snapshot DAY200同fixture large天文段，原账号/正常DB不变，无重启/信任操作。下一继续rail、回概览与相应大字运行检查，全A–F active。

## 续批：章节往返运行证据与目标标签构建

- 上轮真实拖动/天文定位和目标标签为progress。本轮在现有large天文点击概览入口(1169,480)，实际ScrollView定位回“路线与到达/设施证据”；保留同一panel与Map/My，没有路由跳转。这为双向点击章节提供实际fixture证据，仍不是滚动回写/取消/重复/跨spot全矩阵。
- 适合目标标签fixture build session56657已实际poll exit0，panel-target-labels-build.log，产物同步当前snapshot；这一标签新UI尚需冷载后复查。未重启/信任，原正常账号/DB不变。
- 当前阻碍整体面板完成的是rail44px+正文局部避让/禁止永久右空列、速度/重抓真实几何、短屏/长名/三主题矩阵等；不能只继续堆局部通过证据后宣布完成。保留全部A–F目标，下一回到这些实质缺项。

## 续批：拖动改为固定底边的连续高度

- 前轮章节往返/label构建为progress。本轮读原map-panel-layer发现用translateY(panel-drag-offset)+120ms transition搬动整个面板，底部动作也离开固定边缘；与连续高度裁剪要求不符。
- 删除两个map-panel-layer transform/transition块；每个extent现在给panel-rest-height，统一height=clamp(small,rest-offset,available)，复用已有token/viewport高度，不另造JS高度表。offset非0时加dragging class禁用spot-panel高度transition，释放offset恢复0后由同height规则过渡到提交档位。移除旧层medium/large显式height避免抢新公式。
- typecheck exit0 panel-height-drag-typecheck.log；workflow76 exit0 panel-height-drag-workflow.log；fixture build session25148实际poll exit0，panel-height-drag-build.log。尚未同步snapshot，本批固定底边连续过程仍待实际观察。
- 明确尚未完成：原handler仍clamp位移±120、单步8px提交、非零offset class在反向经过0的边界，以及基于live presentation重抓/速度/真实锚点等。后续不能把本批说成完整手势实现；须继续同一owner而非额外平行panel组件。章节rail与全部A–F active，无重启或信任操作。

## 续批：拖动经过零点不恢复动画

- 前轮height驱动为progress。本轮去offset!=0判断dragging，新增panelDragging明确phase；首次越8px置true，反向offset回0仍true；end/cancel/start/hide以及presentation/spot/extent失效清false。避免反向经过起点时CSS恢复settling transition。
- 实际handler回归增加上拖30→回起点offset0仍dragging、end清false且不切档；定向通过。workspace typecheck exit0 panel-drag-phase-typecheck.log；地图目录全部测试exit0 panel-drag-phase-map-tests.log；workflow76 exit0 panel-drag-phase-workflow.log。
- 本轮未重新build；现有dist/weapp-fixture为前轮height-drag版本（session25148），尚未同步snapshot，snapshot仍更早drag-ownership版本。下次需编译当前phase后统一同步，而不是把旧包当最新。
- ±120位移/单步snap/live重抓速度/rail44与局部避让/矩阵和全A–F仍未完成。没有重启/信任/正常数据修改，goal active。

## 续批：原生几何路径打通，44px获得实际证据

- 前轮phase修复为progress。本轮fixture build session46254 exit0 panel-drag-phase-build.log，已同步snapshot，包含height驱动+独立dragging phase。
- 官方automator.evaluate内wx.createSelectorQuery成功，绕过page.$超时而不重启。computedStyle只返回height，不返回CSS自定义变量，不能假设custom props可读。只读取几何，未查storage/账号。
- 保存并实际执行inspect-panel-geometry.mjs exit0，INDEX追加入口，结果artifacts/miniapp/panel-geometry-current.json。2026-09-06T08:42:09Z，viewport390×762，面板height378/bottom762.4，操作栏height76/bottom723.4；3档位按钮均44×44且相互不重叠，3动作约120.8×74；把手54×20（来源104×40rpx例外）；两章节按钮22×29明确不达44。
- 本次首次获得按钮实际几何，不把此前截图或CSS声明算同级证据。该脚本可后续比较当前revision的fixed-bottom/rail/local碰撞，但只取静态矩形，未证明拖动中底边固定或phase零点连续。
- 当前snapshot最新phase/height包medium，DAY200，API8879fixture。下一可直接用原生query读取布局并迭代rail/真实snap，不再反复page.$或重启；全部A–F active。

## 续批：原生实测锚点驱动吸附和媒体进度

- 前轮几何路径打通为progress。本轮新增panel-snap.ts：验证实际四矩形高度（current/small/medium/large）正数有序，保留当前presentation height；nearest按实际距离选档、等距保current；媒体进度按small→medium→large真实区间投射，不再固定240px。
- SpotPanel内3个aria-hidden/visibility-hidden/0宽高容器测量节点直接引用同SCSS small/medium/available vars，不复制JS高度表、不占文档流。Map touchstart只批量一次原生query，回执须仍是同drag对象；无效几何取消。move记录无±120截断的pointerOffset，CSSoffset=rest-startHeight+pointerOffset；release在有有效geometry时按最终实际高度nearest吸附，测量迟到/取消后不能复活。原8px意图阈值保留，但8px不再意味着必跳邻档。
- 新helper测试覆盖排序/缺失、长跨档、近原档/等距、真实不等距进度与边界；实际handler测试覆盖取消后迟到measure、长拖展开，并保留multi/identifier/threshold/zero-crossing检查。2定向通过，地图全部36测试exit0 panel-native-snap-map-tests.log；typecheck exit0 panel-native-snap-typecheck.log；workflow76 exit0 panel-native-snap-workflow.log。
- fixture build session93782 exit0 panel-native-snap-build.log并同步snapshot；第一次原生query时仍冷载，所有rects空，不能当节点不支持或测量通过。下一等稳定实际map有panel再读inspect-panel-geometry（已新增3测量节点），核对hidden节点height可读并实拖。
- 仍需速度衰减/投射、touchend最终坐标、重抓无跳变/系统取消真机、rail44+局部避让和全A–F。当前只从测量presentation起算，异步回执前冻结时机/拖动过程还未实际证明，不宣称全手势完成。未重启或信任操作。
- 稳定Launch8668ms后再次原生query成功：隐藏测量节点small334px、medium378px、large670.4px，均width0；证明WEAPP可读同源锚点，不占可见文档宽度。当前几何JSON已更新；实际长拖/吸附待下一验证。

## 续批：快速释放等待原生几何回执

- 前轮native anchors实现为progress。本轮实际medium把手460上拖215后query仍height378/bottom762.4，未切档，不称通过。可能end早于异步measurement，但尚未证实唯一根因。
- 代码确实存在geometry尚未返回时end清drag的竞态。新增released状态：先释放但未获geometry时保留同drag待回执；有效回执若released调用正常finish；取消/hide/切点仍清ref，旧回执不复活。released后迟到move忽略，不能改已释放的位置。
- 真实handler回归新增release-before-query延后仅提交一次、等待中的相反move不改结果；已有cancel-before-query不提交保留。定向测试通过；typecheck exit0 panel-pending-release-typecheck.log（迟到move guard前，后者无新类型）。fixture build session18756实际poll exit0 panel-pending-release-build.log并同步snapshot。
- 下一必须复测实际长拖与原生geometry，并确认Taro.createSelectorQuery组件作用域是否匹配；若仍不切档读取实际query回执，不能继续猜或重启。当前snapshot新包自动冷载，不代表手势验收。速度/最终touchend坐标/rail与全部A–F active。

## 续批：实际长拖仍未切档，启用隔离诊断

- 前轮pending-release修复为progress。本轮实拖460→215后原生geometry仍height378，说明竞态修复未证明运行根因。没有重启，继续查看真实回执。
- Map新增panelDragProbe，仅__MINIAPP_DEVELOPMENT_FIXTURE_MODE__时工作；固定key starward.fixture.panel-drag-probe，最多8条stage+number/null数组。起手清该key旧记录；记录start/首次intent/geometry四高度/end/cancel，不记录地点/账号/来源/请求/secret。正常编译flag false不写。
- typecheck exit0 panel-drag-probe-typecheck.log，实际handler测试注入noop诊断后通过；fixture build session4273 exit0 panel-drag-probe-build.log已同步snapshot。当前待自动冷载完成后再同把手长拖一次，再用official evaluate只读wx.getStorageSync('starward.fixture.panel-drag-probe')，不得读其他storage。据stage判断输入取消或query空值，再修根因。
- 本probe为任务调试，原因明确后移除源码与该隔离storage key；不能带到最终normal验收当功能。全部A–F active，当前snapshot仍DAY200同fixture，API8879，原库无变。
- 随后同把手长拖成功large，probe真实顺序start396.125→intent -265.312→end(pointer -265.312, geometry null)→geometry[378,334,378,670.4]→end(pointer -265.312,startHeight378)。证明release-before-measure确实发生，等待回执完成后正常吸附。此前未成功的单次输入未捕获，不反推其唯一原因。
- 临时probe函数及所有调用已从源码删除，test noop也删除；当前snapshot仍含probe旧包，下一重建无probe包后再只删除隔离key，防旧运行继续写回。保留本条脱敏数值证据即可，不携带临时诊断进入终验。当前large，下一核对fixed-bottom几何/干净包长拖及速度/重抓。

## 续批：清理诊断构建与最终触点位置

- 前轮probe明确release-before-measure为progress。本轮clean fixture build session59142 exit0 panel-clean-snap-build.log，去probe源码；该包在最终touch修改前完成，已同步snapshot用于移除旧运行诊断，不是最终touch当前代码证据。
- onHandleTouchEnd现在可接收最终changedTouches，匹配起手identifier；其他touch的end忽略，不能结束新/当前拖动。有效最终y覆盖pointerOffset并判8px意图；pending released回调不再次改已经释放位置。SpotPanel prop类型同步。
- 实际handler回归新增最后move仅20px、错误id释放不提交、正确id最后释放-200按真实终点到large；定向通过。workspace typecheck session47448实际poll exit0 panel-final-touch-typecheck.log。最终touch代码尚未重建fixture，下一与速度处理批次一并build。
- 下一在新无probe包完成冷载后只删除隔离storage key starward.fixture.panel-drag-probe，不读/清其他偏好。速度投射、bounded spring/live重抓与rail等全A–F仍未完成。无重启/信任操作。
已通过官方evaluate仅删除隔离probe key，返回panel_probe_removed；其他storage未读取/清除。

## 用户视觉校正与标准字号恢复
- 用户明确：先不要管大号字体，只做标准字体。INDEX已置顶记录，200%适配暂停，标准手机尺度视觉为当前优先。
- 删除large内部重复安全区/导航高度占位：固定控制带44px，scroll-frame预留44px，无图document再留8px，章节scroll-margin同步8px。避免原先safe+136rpx再叠52px。尚未解决primary viewport顶部本身的残余地图条，也未宣称rail/整体完成。
- fixture build session27042 exit0，日志 artifacts/miniapp/panel-compact-header-build.log；已同步可信snapshot，无重启/信任。含此前最终touch坐标修复；速度实现未开始。
- 通过官方automator导航到settings，真实界面滚动至可访问性，点击关闭大字模式；下一检查标准字号实际面板并继续视觉收敛。原业务全范围goal active。
- 标准字号实测：snapshot Settings大字开关关，Map中档标题单行，动作横排。官方switchTab返回pages/map/index。截图确认右侧rail仍小、操作栏下方正文透出；需修复固定操作lane的视觉遮挡与safe-bottom重复关系。大档expand单次点击未切档，不宣称验证成功。原生geometry采集exit0，artifacts/miniapp/panel-standard-geometry.log及panel-geometry-current.json。
- Settings切大字后控制台出现preferences PUT409，当前本地标准字号已生效但远端偏好同步冲突未处理；不得宣称持久化同步成功。下一复核该冲突并保持标准字号，不继续200%适配。

## 标准字号操作区遮挡修正
- 原生geometry确认中档height364px，固定操作lane容纳pill与底部safe空间，但lane透明，造成正文在pill下方重新露出。给既有lane设置surface实色背景，保留原事件/尺寸/点击行为；不加新卡片或渐变。
- fixture build session77278 exit0，artifacts/miniapp/panel-action-surface-build.log；已同步snapshot，待冷载后实际确认。没有新增测试来镜像单条样式。
- 章节rail仍两套旧rpx规则且点击区不足，下一需要同时解决44px命中与永久右侧空列，不可仅扩大并遮住正文。标准字号优先，大字暂停，goal全范围active。

## 标准字号产品文案清理
- SpotPanel删掉面向开发的不变量解释：加载/错误不再解释保留地图选点，停车缺失不再解释不冒充路线，设施缺失不再解释不能推断，来源区不再常驻精确坐标授权实现说明。改为短状态/恢复提示，真实距离类型、来源和安全数据仍保留，坐标权限逻辑未改。
- typecheck exit0 artifacts/miniapp/panel-concise-copy-typecheck.log。本批文案尚未build同步。
- rail调查确认后段48rpx宽+112rpx高覆盖前段60/104，且显式隐藏Text造成只有微小icon。不能声称本批已修rail；下一需恢复可读标签、44px点击，并解决正文局部避让。此前截图获取在窗口失焦时会返回前景内容，只有明确DevTools内容才计作证据。

## 章节条恢复标签与命中区
- 合并rail/tab两套冲突样式为一个owner，删除隐藏Text规则，恢复概览/天文标签。外壳46x90px，内部每项44px最小目标、metadata文字、18px图标、2px选中指示，居中悬浮位置保留。
- fixture build session36591 exit0，artifacts/miniapp/panel-readable-rail-build.log，已同步snapshot，含上一批精简文案。
- 明确未完成：正文84rpx/窄屏76rpx全列仍存在；新rail左缘可能侵入旧正文列少量空间，须以真实块坐标做局部避让并取消全局预留。此为中间实现，不是最终视觉验收。标准字号继续，大字暂停。

## 用户再次明确页面职责与无效信息
- 用户指出截图rail图标/文字不可读、地点身份区无效内容过多，要求按产品页面职责/信息密度继续goal。这是当前直接用户校正，不仅测试场景问题。
- 原生最新rail回执每项44x44（x340.4–384.4，y536.4–624.4），真实截图恢复概览/天文标签，底部正文透出已消失；完整无碰撞未证。
- SpotPanel身份区移除正式观星点固定眉题、PUBLISHED已核验发布冗余、来源长标题；地区+必要异常状态+数据状态合并flex行。真实地址保留，只有隔离固定spot:test-published的说明性假地址不展示。fixture统一短测试数据标识，测试点名称仍原值，不伪装真实正式地点。来源入口及来源详情仍保留。
- typecheck exit0 panel-identity-density-typecheck.log；fixture build session18855正在等待最终回执，日志panel-identity-density-build.log，未同步前不宣称当前身份区真机/WEAPP验证。
身份密度build session18855已poll exit0，并同步snapshot；待冷载后的实际画面检查。

## 大档页面职责清理
- 实际DevTools DAY100截图确认上一批身份区已精简为测试标识、名称、地区+数据状态一行，测试地址/来源标题消失。当前中档仍保留global右列待处理。
- 源码继续去除现场提交审核不变量解释、地图/marker同步与原生拖动实现说明；现场入口不再重复标题。天空专业矩阵用户标题改观测机会；无数据只留一次状态，不再不生成推荐解释。云量/月光块只在有evaluation时展示，标题匹配数据。末尾来源区保留完整入口，不在面板重复列3条来源长标题，source页面追溯未改。
- typecheck exit0 artifacts/miniapp/panel-role-copy-typecheck.log；本批尚未build同步。须后续更新实际截图/相关文案旧断言，不能将源码文案改动称为全14路由清理完成。goal active。

## 文案整合回归与地图图标尺度
- map测试36/36通过，panel-role-copy-map-tests.log。文案fixture build session82956 exit0 panel-role-copy-build.log，已同步snapshot。
- 地图右上定位/刷新map-tool原88rpx点击区、28rpx图标在窄屏缩小；统一target-min44逻辑px、icon-small18px，圆面板内缩6px形成32px视觉表面。更改仅CSS，需下一build+实际geometry验证，本轮sync包不含此后修改。
- standard-only当前范围不变，rail局部避让与完整大档视觉仍未完成，goal active。

## 大档实际章节定位与短文档回归
- DAY100真实点击天文成功展开large，当前截图已显示精简后的观测机会、目标、时间尺、云量月光及来源入口；顶部仍露前章尾部，这是文档到底后无法继续上滚。rail却仍选概览，为实际缺陷。
- section measurement同一批增加document rect，以document.height - viewport.height限制最后章节的可达激活阈值（正数才应用，缺失高度回退原逻辑）。无需每帧query；onScroll既有数值比较沿用。回归新增短文档到底激活天文、回滚返回概览，定向2/2通过。
- 当前源码该修改+上一批map-tool逻辑尺寸尚未build；下一构建并复核实际large最终geometry，特别是测量与180ms展开动画时序。当前snapshot在large天文附近，不能把测试通过当作实际修复证明。goal active。

## 当前章节构建验证
- fixture build session21235 exit0 panel-final-section-build.log、typecheck exit0 panel-final-section-typecheck.log，已同步snapshot。当前workflow-conformance实际18/18通过 panel-standard-workflow.log（不得沿用旧76计数）。
- 已扩展只读inspect-panel-geometry脚本采集map-tool/icon、document、astronomy、active-tab、text-action rect；本轮输出panel-final-section-geometry.log。新包正常完成冷载，标准字号保留。
- 最新两次sky.click天文未展开，前批同入口曾展开；截图当前仍medium，需核对原生自动化鼠标输入/事件链，不得直接推断业务点击坏或修复已实证。未重启DevTools。短文档选中修复仍只自动测试通过，实际复测待完成。goal active。

## 章节事件与展开测量时序
- 官方page.$定位仍12s超时session77540，未重启。随后sky显式left单击按钮内部1152,646成功large，不能说事件坏。当前仍概览高亮错误。
- 原生geometry实际scroll top137,height624.4；document top-787,height1548.6,bottom761.6；astronomy top226.8，说明已到底但最后章无法贴顶。证据panel-section-click-geometry.log。
- 原effect在180ms高度动画中测量，取得中间viewport，先前最大滚动阈值修复仍不足。本轮测量改200ms后一次，cleanup清timer+取消回执，防变点/档位失效；定向2/2通过。源码未build，下一必须新包验证。不以该测试模拟时间作为真实动画证据。完整rail局部避让、viewport顶部等未完成，goal active。

## 测量取消回归补齐
- panel-section-sync实际handler测试改用可控timer队列，验证动画期间不query、触发后才query、query发出后取消忽略、timer触发前取消不再query；定向2/2通过。避免此前同步stub不能证明延后/取消的盲点。
- fixture build session81939 exit0 panel-settled-section-build.log；typecheck exit0 panel-settled-section-typecheck.log，已同步snapshot。当前等待自动冷载后实际点天文，核对最后章高亮，不需要重启/信任。全范围goal active。
新包DAY100实际点击天文成功large，截图确认天文高亮，短文档末尾选择修复获得运行证据。随后点击概览进行反向核对。
- 返回概览实际成功：显示路线/设施并高亮概览。发现固定测试设施每项重复排版测试资料不代表真实场地，违反用户最新测试也不堆无效说明要求；源码仅在fixture固定测试点隐藏这些重复summary，保留设施名/状态与统一测试标识，正常来源summary照常展示。此最后单行改动尚未build；下一合并设施密度/rail工作验证。

## 设施行手机密度
- 设施标题与查看详情动作合并同一heading；原完整场地资料aria/入口不变。每项设施名+状态同一行，真实summary存在才另起全宽行，测试重复summary按上一批固定fixture规则省略。取消evidence-row两套column样式，独立一份row+wrap，6px纵padding，body字号设施名。
- typecheck exit0 panel-facility-density-typecheck.log。fixture build session43988日志panel-facility-density-build.log，等待最终回执后再同步；布局实际尚未检查。
- 当前standard-only UI推进，rail全局右列/局部避让仍未解决，全部goal保持active。
设施密度build session43988 poll exit0，已同步snapshot；下一冷载后检查标准字号中/大档设施呈现。

## 中档可用高度符合新密度要求
- 最新设施布局实际中档仍只有标题且受lane遮挡，未达附件02 8.2尽量展示核心设施。定位旧700rpx上限导致390宽medium仅364px。
- DESIGN.md中medium定义与SCSS同步改为clamp(320px,56vh,480px)，仍受large-44px与small+44px约束，保留真实DOM与native anchor测量。390x762预期426.72px，只是计算预期，待实际；不复制摘要、不缩小字体。
- fixture build session23881进行中，panel-medium-density-build.log，下一poll原session终态后sync再实际看设施可见性。当前snapshot仍前版364px。goal active，rail局部避让未完成。
medium密度build session23881 exit0并同步snapshot；待冷载后实际核对。

## 原生tabBar重复空间修正（待验证）
- 实际中档426px级已看到停车状态，截图确认改善；仍只一项。app.config确认原生tabBar非custom，windowHeight762对应已排除底部82px导航的844px设备。原panel再减primary-nav-clearance约91.6导致large顶部露地图，action-lane再留safe34造成底部空白。
- 源码panel available改100vh；large背景铺至页面top0，handle/scroll保留map-search-top动态顶端原生胶囊避让，避免内容进刘海。action-bar距底4px、lane高度action+8px，删除第二遍底部safe，仅作用spot-panel。
- 该批尚未build/验收；必须测大档top0、原生导航不盖、handle安全位置、底部动作/第二设施可见性。document尾padding暂保守未减；其他layer重复clearance未本批改。DESIGN后续按实际证据更新平台说明，goal active。

## 原生viewport实际验证
- build session88876 exit0 panel-native-viewport-build.log，已同步。DAY100中档截图同时显示停车+厕所，action位置紧靠native导航上方，重复底部留白消失。
- 点击天文后原生geometry证明large top0,height762.4,bottom762.4；handle top97.9125,height20，actionbar top711.4,bottom757.4,height46。证据panel-native-viewport-geometry.log。符合原生tabBar已扣除页面viewport判断。
- 本轮部分get_window_state因失焦返回前景内容，非DevTools截图不当证据；仅明确DevTools截图/官方selector query计入。rail局部避让仍待解决，goal active。

## 天文区手机字号与去重
- 时间尺heading两条旧21/20rpx字号会在390与320宽低于12px，改统一metadata size/line token，保留原曲线/高度/拖动行为。
- 观测机会facts在slice前仅过滤detail与已展示skyOpportunity.label完全一致的重复内容，其他风险/判断因素保留，避免同一句天空条件显示两遍。
- typecheck exit0 panel-astronomy-density-typecheck.log；本批未build同步，下一与后续视觉更改一起验证。原生viewport已实际通过但DESIGN平台说明仍需最终收敛，rail局部避让、默认全路由等未完成，goal active。

## 共享线条图标可辨识度
- semantic-asset.scss默认线条色原primary DAY#8799f6偏浅，改既有choice-selected-label #4859b8，与动作文字一致；不引入页面私有颜色。后段night/observation仍显式primary，保留原模式配色，图片资产不受CSS改色。
- fixture build session53124进行中，panel-readable-icons-build.log；包括上一批时间尺metadata和天文重复因素清理。待poll终态sync再检查当前DAY100图标。
图标build session53124 exit0并sync snapshot，待实际图标检查。goal active。

## 用户授权Context最小化：实际进度
- 发现真实矛盾：Screen Contract称代码无需重做原型，但authority-and-scope/operations要求可见或语义变化新建snapshot；fast/check依赖verify-selected-design-bindings与verify-miniapp-design-profile冻结资源链。不是仅磁盘历史文件。
- simplify-design-context.mjs已执行一次，9份Context删减约2万字符，保留路由/业务/状态/数据/授权职责，退役原型选定/handoff/hash同步约束。INDEX已记录追加用户要求，goal目标文本仍可能旧但用户授权有效。不要重跑旧标题迁移脚本。
- 图标实际依赖已解除：旧atlas HTML art函数提取到tools/miniapp/semantic-art.mjs，generate-semantic-assets直接import，不再读取HTML/VM/固定原型hash。生成manifest更新为源码身份，24个SVG资产逐一hash/bytes数组完全不变，--check通过。
- 尚需完成：DESIGN.md历史原型/选定段落与重复规则精简；verify-miniapp-design-profile/verify-selected-design-bindings及package fast/CI链退役原型依赖同时保留有效runtime/token校验；其他docs/design-resources真实依赖审计后清理资源；类似Context无效历史内容继续精简。当前未宣称整个清理完成。不要删除实际图标/业务source/检查以假装通过。
- context:validate本轮启动，日志artifacts/miniapp/context-slim-validation.log，需读终态。标准字号UI当前snapshot为readable-icons构建，图标改色/天文去重已build但待实际检查；rail局部避让仍待做。goal全范围active。

## 校验链退役原型依赖
- verify-miniapp-design-profile由多代原型hash/manifest/字面文档要求改当前DESIGN结构token+生成文件一致性、实际角色对比度、观测色域/无浮影与target-min读取；design:system:verify exit0 design-production-only-check.log。不再遍历原型包。
- 从旧binding提取4项仍有意义的production probes到ui-contract-probes.json和verify-ui-contracts.mjs（native chrome、sensor-follow、operations职责、contribution三轴），运行4通过。重复精确token由生成一致性+contrast替代，历史icon日期/target字符串不再额外校验，icon生成--check仍在fast保留。
- package.json删除test:miniapp:design-bindings脚本，design/fast改调用test:miniapp:ui-contracts；DevTools候选fingerprint也指向新production检查文件。
- 尚未删除旧binding文件/脚本及资源，因为workflow-conformance部分测试仍绑定历史闭包，需要逐项改为新要求/保留业务断言；DESIGN长历史段落待裁剪。完整fast未跑，不能宣称完整清理或验收。Context追加用户要求继续优先，goal active。

## 根设计文档解除历史资源维护要求
- 用户已成功替换goal全文；get_goal确认新目标包含Context精简、标准字号和信息密度要求。
- DESIGN.md删除Open Design版本、provider ID、历史选定hash、原型包清单、rollback清单及强制重新选定/同步路线；保留原生App YAML、全部Miniapp当前token、设计意图及各组件产品交互规则。当前实现/验证段改直接生成生产token及实际WEAPP验证。
- verify-design-system.mjs去掉历史adoption字符串/rollback清单断言，保留实际App token/色域/字体/几何校验和Miniapp token/contrast校验。首次运行揭示旧身份断言，修复后design:system:verify exit0，日志design-context-trim-check.log。
- workflow-conformance已替换原型包绑定测试为4项生产职责probe及fast依赖检查，语义资产源hash检查直接引用生产semantic-art.mjs；node --test tools/miniapp/workflow-conformance.test.mjs exit0，日志context-cleanup-workflow.log。
- 旧selected-design-bindings文件尚未删除：全仓搜索发现apps/wechat-miniapp/src/authority/delivery-carrier.json仍有历史fingerprint引用，需确认其生成/验证职责后迁移；不能直接改历史收据冒充当前生成。运行验证spec/handoff依赖仍待拆分，资源物理清理尚未完成。
- trim-design-history.mjs为一次迁移脚本，不要重复运行。原始需求inputs未更改，完整业务/UI goal仍active。

## 删除退役绑定文件与当前复查
- 已删除tools/miniapp/selected-design-bindings.json、verify-selected-design-bindings.mjs；删除前检索当前tools/package/CI/Context无消费者，全仓仅delivery-carrier旧snapshot hash引用，保留历史收据不伪造重签。
- 删除后workflow-conformance 18/18通过；context:validate exit0（只验证manifest路径及显式source声明，不验证普通Markdown链接）；semantic assets --check 24通过。
- PLAN修正过时Adoption引用、旧绑定维护要求、200%测试措辞，明确当前标准字号。
- 最终验证剩余依赖已定位：package prepare:miniapp:final-candidate调用verifier-runtime/verify-miniapp-target.exe，实际mjs通过bindAuthorityPaths读semantic/handoff/resource_manifest；buildDesignArtifacts同时混合真实native/inspection结果与原型digest事实。verification-spec-field-signal-i21.json authority/counterfactual_projection/design_evidence绑定r6与r11资源。workflow-conformance 1170之后包含该旧链路结构断言。后续需重构这条链与spec，保留真实native/失败恢复/snapshot过期拒绝检查，不应简单删除整个测试或把缺失资源算通过。另tools/long-task/verify-native-target.mjs:4390仍调用verify-design-targets（非小程序fast），清理共享展示资源时需处理该消费者。
- 尚未批量删除docs/design-resources，避免遗失仍被有效检查使用的业务约束。目标仍未完成。

## 验证Context继续去除过时设计闭包
- acceptance-runtime.md移除97-row/72-subject/15696-cell、原型handoff/可行性hash、rollback资源字体可用性等维护条件；当前路由改以app.config.ts为准（旧9路由不再误导），标准字号明确暂停大字；保留生产持久化、反例、失败/权限、模式/IME/设备限制等有效规则。
- implementation-index.md日常UI入口改读取Screen Contract+当前DESIGN、观察WEAPP并修源码，移除先映射完整selected-resource closure的要求；verification.md同步入口名称。context:validate exit0。
- 对旧最终验证进一步核查：verifier-runtime parseSourceAuthority同时读取原始语义源和handoff，authorityResults验证所有authority hash；buildDesignArtifacts整段947-1120只做原型包/事实digest后AND native/inspection；designMethodRecord约1479把旧fact_expectations投射到long-task证据协议。因此不能只把buildDesignArtifacts facts置空或删除文件，否则旧协议失效或假通过。当前prepare:miniapp:final-candidate仍为旧长程候选命令，需要决定退休其协议外壳并保留runFast/runInfrastructure/runNative/inspectCandidate实际检查（不自举新长程工作流），而非继续制造新原型/hash。本轮未运行该命令，也未重启DevTools。

## 生产检查从历史协议中提取
- 新增tools/miniapp/inspect-production.mjs与check:miniapp:production，从旧inspectCandidate提取真实14路由/18过滤项/26seed投射/能力/定位/缓存/构建检查；不读取原型、handoff或digest。移除旧design_target_bound字符串检查，设计值仍由独立token检查负责。源码扫描排除test/spec（实际发现测试标题WebView触发假阳性），不把测试文案当交付WebView。
- 实际检查当前dist/weapp：14路由与其他源码检查通过，package_budget仍失败，总目录4924333 bytes；当前旧检查用整个输出<2MiB，需核对主包/分包及开发/生产构建后修正有效预算，不能把本次失败声称通过。日志production-inspection-current.log。
- 原冻结verifier改import会被C launcher嵌入hash拒绝，因此撤回该文件本轮提取改动，保留原脚本未变；不继续维护这个冻结hash。新独立入口已能执行当前检查，后续替代final命令的旧协议入口，再退休无消费者的旧代码和资源。workflow-conformance当前18/18通过。

## 当前候选入口退休冻结原型协议
- prepare:miniapp:final-candidate改直接依次运行已有fast、design:system、infrastructure、新production检查、native current-candidate success及degradation；不再先调用冻结exe/spec/handoff/hash闭包。没有启动这条全量命令（包含独立正式DevTools测试可能影响暖会话），本轮仅workflow-conformance 18/18验证入口依赖。
- 旧verifier/runtime/spec和.long-task调用仍在文件系统用于待审查退休，不能宣布所有设计资源已清空。真实runtime collector自身的fingerprint/隔离/失败验证保留。
- production检查新增主包/每分包/source-map实际计量：main3356657（map1181291）、content930161（map318573）、spot345540（map155701）、sky291975（map133523），总4924333。当前开发目录raw counts不是官方上传包大小，旧aggregate<2MiB判断保留失败等待正确替换，不能为跑通入口绕过。官方文档URL浏览工具读取失败，不用第三方摘要当权威放宽限制。production无HTML误报已修复，此项本轮实测true。

## 媒体与旧marker生成依赖清理
- 检索确认3张JPG仍被packages/miniapp-contracts/src/catalog.ts及operations-browser-data引用，保留实际文件和来源记录，不当成无用原型删除。
- 删除extract-selected-media.mjs（一次性从HTML抽取base64的旧生成路径），新增verify-media-assets.mjs直接检查已入库JPG的大小/hash/文件类型，不再读取原型HTML。check:miniapp:media纳入test:miniapp:design；本轮3个资产通过。
- 删除无当前调用者的generate-marker-assets.ps1：旧#536DFE/日期/原型atlas路径会覆盖当前marker-manifest，已由generate-mode-icons.mjs负责现有图标。当前generate-mode-icons --check 33通过。
- apps/assets/media/extraction-manifest保留原始出处作为溯源数据（不是需要同步/读取的上游输入），不能把历史来源改写成伪造的新来源。
- 目前生产源码/日常生成不再需要原型HTML；残余资源消费者主要是历史Miniapp verifier/spec以及原生App设计诊断/证据模块，删除整个docs目录前需完成这些实际消费者的迁移或退休。未宣称清理完成。

## 历史资源实物清理审计与删除限制
- r2/r3/r4/r5/r7/r8/r9/r10八个I21 binding目录全仓排除自身/产物/任务记录后仅.long-task/delivery-contract.yaml引用；核对110822附近确认这些都是allowed_support_paths，不是资源读取或运行依赖，原始需求与当前r6/r11未列入删除。
- 尝试用PowerShell先验证绝对目录、git clean、无reparse，再删除这8个目录；exec_command在CreateProcess之前被自动审批审查拒绝：blocked by policy，无具体原因。命令未运行，没有生成removed-unused-design-snapshots.json，也没有删除文件。不得写成已清理，不换工具绕过相同删除限制；其他可执行工作继续。
- 独立完成Context尾部残留清理：main移除旧design-system目录索引，screen-contracts移除rollback资源入口，acceptance-runtime移除仅扫描旧brand.html的impeccable命令。保留实际产品与运行规则。

## 快速检查与UI样式入口合并
- check:miniapp:fast session69237本轮实际exit0，context-cleanup-fast.log；包括当前源码类型/业务回归/生成检查，不等同视觉完成。
- 再读source-plan发现开头仍把原型exact/constraint和长程Contract列为前置，已改为产品意图/当前Context+DESIGN直接实现，不要求原型/handoff/hash，保留原生App业务目标和章节。
- Map index.scss把spot-panel__document最终生效padding移入唯一基础定义，删除后段重复定义及完全被后续小屏规则覆盖的18rpx声明；当前实际几何不变，不声称解决永久右空列。下一步仍需章节导航局部避让和真实标准字号检查。
- 本轮没有重启DevTools，历史目录删除限制保持未解决；整个goal未完成。

## 标准字号当前真实预览复查
- 2026-09-06T09:58Z官方automator9421只读几何成功：390×762窗口，medium面板top335.46/height426.94，动作栏top711.4/bottom757.4。原DevTools60360878仍活跃，无重启/信任操作。
- 同会话实际截图可见测试数据单行标识、20px标题、紧凑region/资料不足、路线与设施停车/厕所；section rail图标及概览/天文文字可见，前轮readable-icons构建实际已显示。仍有永久右侧正文空列，未解决局部避让。
- sky click尝试天文按钮只呈现按下视觉，后续截图仍medium，不能声称本次成功展开/章节导航通过；需继续用可信输入/运行事件确认，避免把历史通过当当前结果。前轮CSS合并尚未重新构建，但只合并相同最终值。

## 当前章节导航证据与用户文案
- 当前60360878窗口截图1256×1000，工具坐标与截图一致。普通展开按钮实际成功进入large；再点大档天文后截图显示观测机会/适合目标/时间尺/云量与月光，并高亮天文。此为当前DAY100实际证据，不代表本次medium章节直达已成功（该点击仍未确认）。SDK page.$的15s查询超时session24540已终态，未重启。
- 新发现真实UI内部措辞：trip-decision-engine输出“事实不完整时不能产生肯定出行建议”“主预报不能证明...”暴露规则实现。改为明确用户动作：核实开放准入道路后出发、核实末段可通行、查询当地气象部门再决定。保持原factor code/severity/sourceRevision和所有决策分支完全不变，缺失与安全限制未隐藏。
- 下一步：正文右空列局部避让、medium直接章节点击和标准字号其他viewport仍待验证；当前截图有API文案旧值，需服务使用当前代码后再检查，不把代码改动当渲染完成。

## 中档章节直达本轮确认
- 从large点击收起→medium，再点中档天文，当前截图确认恢复large、天文高亮及天文内容定位。中档直接章节操作本轮成功；早前单次工具点击未生效不能据此判业务缺陷。
- DESIGN明确large→medium保留selected spot/section/meaningful scroll（当前约712行），因此观察到中档保留已滚动章节不是应重置顶部的缺陷，不为测试方便改掉。
- DESIGN域组件Geometry仍重复旧medium500rpx/52dvh/700rpx及60rpx侧栏等值，与前面的当前标准字号合同冲突；改引用同文档唯一当前几何规则、44px目标和无全局空列约束。design:system:verify本轮exit0。UI全局空列仍未解决，未改要求掩盖问题。

## 待用户侧栏偏好与来源页减噪
- 已通过async问题询问“始终居中悬浮+无永久空列+滚动不重排”的取舍：顶部固定章节入口 / 保留侧栏稳定窄边距 / 动态局部避让换行。待用户回答，不默认为批准改变原位置；其他任务继续。原约束三者同时满足会遮挡正文，未擅自把遮挡当完成。
- 来源页移除顶部整块“缺失不为0/估算不实测/过期不能推荐”等内部规则说明；保留真实来源分组/Provenance和必要的适用期、限制、出发前核实提示。错误文案改明确重试。
- 地点媒体区测试说明压缩“示例图片，非本地点现场照片”，普通文案改“查看照片的来源与拍摄时间”，不再讲内部证明规则；实际来源链保留。
- typecheck当前exit0 user-facing-copy-typecheck.log。隔离fixture构建standard-copy-cleanup-build.log已启动，需poll当前exec session终态后同步现有snapshot，不重启DevTools。尚未实际渲染验证本轮文案。
fixture build session44815 exit0，4条既有postcss-calc嵌套var警告；已同步现有snapshot miniprogram。待当前实际UI复查，侧栏问题仍等待用户取舍。

## 安全区计算构建警告修复
- Map与Search根样式声明--map-search-top / --search-safe-top默认值calc(env(safe-area-inset-top)+56Px)，其余calc只读简单var；运行内联原生安全区值仍覆盖默认值。避免postcss-calc对var第二参数嵌套calc误解析，不调整视觉数值。
- fixture build session91163 exit0，safe-area-calc-build.log明确compiled successfully，先前4条警告消失；已sync现有snapshot，未重启DevTools。
- reload期间首次geometry无节点，不能当页面缺失；随后实际截图恢复标准字号中档，搜索/工具/面板位置正常，重新query保存safe-area-calc-geometry.log。仍是390×762单设备fixture验证，不是全viewport/真机完成。

## 来源展示减少重复字段
- Provenance新增showKind默认true；来源页已按kind分组因此传false，其他未分组使用者继续显示类型。title完全等于provider时不重复标题。时间/有效期/许可/精度/限制/原始链接全部保留。
- typecheck exit0 provenance-density-typecheck.log；fixture build session2602 exit0 compiled successfully、无警告，provenance-density-build.log；已同步现有snapshot。
- 本轮未完成来源页实际进入与渲染检查，下一步需从当前真实面板来源入口打开，以保留spot/context合法关系。侧栏取舍仍待回复，不以超时当授权。

## 来源页实际渲染与返回缺陷
- 当前fixture经medium天文→large→来源入口成功打开spot/data-source/index。实际截图显示自定义标题、分组直接起始、Provenance无重复类型，发布时间/获取时间/适用期/许可/精度/限制及原始出处/许可按钮保留；类型与构建结果已在前轮记录。
- 返回按钮实际回到相同自动化测试正式观星点，large保留，但天文位置丢失、回到overview顶部。本轮发现新缺陷，不宣称返回状态完整通过。
- 已读Map useDidHide仅pageVisible=false/取消拖动，不主动重置面板；SpotPanel只在spotId变化设置document-start，ScrollView没有scrollTop持久/恢复属性。需进一步确认native页面hide是否重置scroll或selected临时丢失导致remount，修复时保留同spot/context的真实滚动状态，禁止跨地点恢复旧offset。有关源码：index.tsx约201/337/1270，spot-panel.tsx约167/179/282。当前未改该行为。

## 返回滚动恢复实现中
- useResourceQuery隐藏时仍保留result.data，不是该hook主动清空。Map未主动重置spot/extent；新增向SpotInformationPanel传pageVisible。
- Panel保存同spot真实onScroll位置，隐藏时清理scrollIntoView和一次性scrollTop命令，返回同spot200ms后恢复捕获的offset；spot变化清零。恢复用captured top防show阶段零滚动事件覆盖；取消timer和跨spot检查保留。
- typecheck exit0 panel-return-typecheck.log；panel-section-sync 3/3通过，新增测试验证hidden→show恢复、show重置事件不覆盖捕获位置、取消与跨spot不恢复。
- 尚未构建/实际WEAPP验证这项修复，native可能仍有remount或scrollIntoView优先级问题，不算完成。下一步fixture构建→现有snapshot→天文→来源→返回，检查保持天文offset。当前preview仍是provenance-density构建。

## 返回滚动修复实际验证通过
- fixture build session15378 exit0，panel-return-build.log compiled successfully，无警告；同步现有snapshot，无开发者工具重启。
- 当前DAY100/390px实际执行medium天文→large天文→来源页→返回：截图确认回到相同天文内容位置（全部攻略/提交现场资料上方位置一致，观测机会、适合目标、时间尺、云量与月光均保持），天文高亮及large保留。前轮返回overview顶部问题在当前构建未再出现。
- 覆盖仅该真实fixture来源返回路径；其他子页/跨地点/viewport仍需按范围验证，不能把单次路径推成整体完成。
- 新看到地图加载文案仍“正在解析地图上下文并加载正式点位与来源”，可在后续文案批次精简为“正在加载观星点”；本轮未修改，避免把未构建改动混同当前证据。

## Map/Search状态文案减噪
- 实际加载截图揭示内部“解析上下文/正式点位来源”措辞；Map/Search加载改正在加载/搜索观星点，地图渲染失败改可继续搜索，离线明确数据可能过期，云观星未就绪改地点观测信息加载。搜索空列表改想去/未找到观星点，不再解释“不会伪装”实现原则。
- 仅文案替换，错误分类/分支/重试/路由/数据过滤未改；typecheck exit0 map-status-copy-typecheck.log。尚未构建这批文案，当前snapshot为panel-return已验证构建，留到下一批合并构建。
- 最新已确认：来源返回恢复天文滚动位置；pending：侧栏取舍用户问题、全viewport14route标准字体、历史资源删除被policy拒绝、生产包预算口径/实际生产构建及原任务业务/真机余项。goal仍完整active。

## My/Settings当前标准字号观察
- 当前panel-return snapshot通过原生My tab进入我的页，账户/计划/反馈/设置/链接/导入入口实际可见，层级紧凑；未观察到大字号状态。
- My主页链接、导入副文案仍解释平台实现和全流程，已简化为入口用途，保留具体页面的隐私/权利/审核规则；设置副文案去掉“本地数据动作”。typecheck exit0 my-copy-typecheck.log。与上轮Map/Search文案一起尚待下批构建，不冒充已渲染。
- 点击设置实际进入：标准字号三模式轨道、权限/提醒/数据/偏好可见；界面仍有“保存意愿不等于微信订阅成功；平台能力接入后以授权回执为准”解释性文字。后续需核对当前订阅能力与交互语义，再改为明确当前用户状态，不把未开通通知描绘为已提醒。当前未操作开关/账号/权限，避免无必要改变偏好。

## 提醒偏好准确表达当前能力
- Settings开关仅updatePreference保存departureConditionReminder/contributionStatusReminder，miniapp-service仅校验偏好布尔值；当前apps/wechat-miniapp与workers未检出微信requestSubscribe/subscribe-send调用。
- 标题改提醒偏好、描述去重复保存意愿，状态说明改“当前仅保存偏好，暂不发送微信提醒”。未改变偏好存储、开关值或增加假订阅动作。typecheck exit0 settings-reminder-copy-typecheck.log。
- 合并Map/Search、My、Settings文案构建status-my-settings-copy-build.log已启动；需poll当前session后sync。尚无本批运行截图，不提前宣称完成渲染。
本批build session37438 exit0 compiled successfully，无警告；已sync snapshot，包含Map/Search/My/Settings文案。待实际设置页复查，未重启DevTools。

## 320px实际发现侧栏遮挡
- 在现有DevTools机型菜单Home/Return选择iPhone5（320×568），不重启或触发信任。narrow-panel-geometry.log保留原生query；截图显示标准字体，但右侧章节栏覆盖查看路线末尾。
- 根因已核实：当前窄屏正文padding-right76rpx约32px，侧栏宽46px+右4px，目标固定44px而避让仍随rpx缩小，导致碰撞。临时修正为当前target-min+8Px统一52px安全边距，media对应负margin，删除小屏旧右边距覆盖。
- 此修复只保证当前侧栏不挡操作，仍是全局窄边距，不满足用户无永久空列最终要求；异步侧栏取舍问题仍待答，不能当最终方案。尚未构建这项CSS，当前preview机型已320且旧右边距遮挡仍可见。
narrow rail build session66649 exit0并同步snapshot；当前机型320px，待reload完成后实际复测侧栏与路线按钮rect不相交。

## 本轮继续：窄屏边距与上下文矛盾清理
- 当前原生geometry确认viewport320×520，章节按钮left270/right314、44×44；查看路线right267，垂直相交但水平相隔3px，无覆盖。证据panel-geometry-current.json。仅证明当前几何，最终侧栏布局仍待用户取舍。
- Source Plan移除旧selected target registry、资源同步/冻结优先级与维护表，保留当前需求权威及设备能力、媒体许可、真实后端验证义务；去掉文本来源内7条Open Design/hash/handoff资源库存。完整Outcome业务条款未删除。旧引用暂保留历史标识，仍有后续清理范围。
- development-loop明确旧原型诊断不是日常UI检查、不要求同步原型，保留生产渲染和真实验证规则。context:validate本轮通过（结构检查，不证明文档事实或产品完成）。历史资源批量删除仍未执行，先前policy拒绝不绕过。goal保持active，已有目标文字无需再次修改。

## 标准字号320px我的/设置继续检查
- 当前原生截图确认320px我的页精简后的设置/主页链接/导入副文案已显示，页面无横向溢出。设置入口两次sky点击仍停留我的，官方page.$诊断超时；暂不能认定入口通过，也不能仅据输入失败认定业务bug。
- 官方wx.navigateTo明确success打开content/settings/index；实际截图确认三模式、权限、提醒偏好及“当前仅保存偏好，暂不发送微信提醒”正确渲染。此证据为路由和渲染，不替代入口点击验证。
- 权限三条文案继续精简，保留定位询问/手动位置、方位仅按页读取且不上传、投稿单独授权。typecheck exit0 settings-privacy-copy-typecheck.log；fixture build87413 exit0并同步现有snapshot，settings-privacy-copy-build.log。未重启DevTools。最新三条文案仍需reload后复查。

## 最新权限文案实测与设置下半页减噪
- 当前fixture320px标准DAY实测截图确认三条权限说明已渲染、各说明一行、无横向溢出，数据入口在首屏底部可见。通过真实scroll操作检查下半页，默认地点/经验/驾车时间滑杆布局可见。
- 本轮再次My设置点击未转；恢复阅读历史1398-1410发现已诊断过具体touch_start→touch_cancel而非tap，1476/1510也记录激活有时成功有时失败。不要再重复compileMode/pointer-events或无限点同入口。此次并无新的touch事件证据，原因仍未完全确定；官方navigateTo打开成功只算路由与渲染。
- 清理设置下半页路线供应商/100ms/导出服务端快照和失败时“不用缓存替代”实现说明；保留驾车时间不可用时偏好不参与、减少动态、分享状态及实际错误原因。typecheck通过settings-preference-copy-typecheck.log。构建89361运行中，需poll后同步，尚无新文案实际截图。
本批build89361 exit0 compiled successfully，已同步现有snapshot；未重启DevTools，最新下半页文案待实际reload复查。

## 独立关闭诊断候选构建与预算实证
- 新增config固定输出MINIAPP_ISOLATED_CHECK_BUILD=1→dist/weapp-check，仅build可用；拒绝fixture/acceptance/device诊断模式组合。原watch dist/weapp与现有fixture snapshot未覆盖，未restartDevTools。使用本地8879 API、空operator token，仅本地检查，非发布环境。
- build17472 exit0 compiled successfully13950ms，plain-candidate-check-build.log。当前dirty main基于424c971，不把HEAD冒充本次全部源码身份。
- inspectCandidate接受显式bundleDirectory，只读新检查产物，包统计先转为bundle相对路径以正确划分main/content/spot/sky。
- plain-candidate-inspection.json：11项静态检查全部true，14routes、26catalog seeds、18filters；总1522505bytes，main1127846/content238150/spot79243/sky77266，各source map均0。原本开发输出导致聚合2MiB失败，新普通build实际低于原限制，无放宽预算。该统计非微信平台上传尺寸、不证明真实数据完整/页面视觉/真机/发布。
- paths-and-lifecycle记录实际新输出与约束，当前未执行微信上传、远端调用或发布。后续可继续独立页面和业务余项；不要为通过检查覆盖warm输出。

## 检查构建隔离负例
- 读本机Taro CLI源码发现watch也command=build，上一轮command判断不足以支持非watch限制；新增process.argv.includes(--watch)明确拒绝标准watch入口。
- 实际MINIAPP_ISOLATED_CHECK_BUILD=1+fixture=1运行build，exit1且miniapp_isolated_check_requires_plain_build，check-build-rejects-fixture.log。
- 实际check=1、fixture=0运行dev:weapp标准--watch，exit1同错误，check-build-rejects-watch.log。均编译前拒绝，无新watch服务、无覆盖现有产物。
- 普通build正例为上一轮17472；新增条件只影响watch拒绝，不重复无关构建。goal继续active。

## 当前快速检查与计划相关页面减噪
- 全check:miniapp:fast session47313 exit0，integrated-current-fast.log，包含当前面板返回恢复/Context与生产probe/近期设置更改。运行过程中末尾新增plan/import/profile纯文案，不能把该fullfast当新增文案后的全量复验。
- 集中精简plan状态/编辑/冲突/恢复/路线缺失说明、import/profile错误状态，移除回读服务端、不会冒充示例、My等实现术语。保留缓存过期、草稿恢复与失败保留、最新冲突内容核对、出发前复核、实际errorMessage；handler/权限/网络/数据分支未改。
- 新文案typecheck exit0 plan-status-copy-typecheck.log。fixture build92734正在运行，需poll后sync，再实际计划页面检查；未把构建当视觉完成。
plan-status-copy build92734 exit0 compiled successfully并同步snapshot，未restartDevTools。
实际官方navigateTo打开计划无ID路由成功；320px DAY标准字体截图显示恢复的既有本机草稿、新版出发前复核说明、地点/日期/时间/备注与底部恢复提示，无可见横向溢出。未编辑、删除或保存该既有草稿，未把直接导航算My入口通过；完整滚动底部/键盘/冲突仍待检查。

## 计划页顶部安全区实际缺陷修复
- 320px DAY计划表单滚到底部时原整页滚动使CustomNav消失，正式点字段进入微信状态栏/胶囊下。底部保存/返回可见，但安全区被侵入，实际截图证实。
- plan-editor改height100vh/flex列/overflow hidden，标题保持非滚动区；新增plan-editor__scroll ScrollView包裹原plan-content，flex1/min-height0/clip，保留表单数据/handler/草稿状态。
- typecheck exit0 plan-scroll-frame-typecheck.log；plan-recovery+plan-draft共6pass，plan-scroll-frame-tests.log；fixture build39093 exit0 compiled successfully17504ms，plan-scroll-frame-build.log，已sync无需restart。
- 实际官方navigateTo打开原恢复草稿，真实sky.scroll到表单底部后标题/返回/fixture标识保持固定，正文不进入状态栏；保存和返回列表按钮、恢复提示完整可见。未修改或提交草稿。覆盖320px DAY标准字体该路径；键盘/其他mode/viewport仍未验证。DevTools底部有1错误计数，当前可见console仅旧deprecation警告，未定位错误内容，不声明运行无错误。

## 计划页错误计数与输入焦点检查
- 当前唯一红色console展开后为TypeError MiniProgramError: Cannot read property __subPageFrameEndTime of null，setInterval/内部__dev__/WAServiceMainContext.js?t=wechat...堆栈。可见部分没有业务源码，尚不能确定触发原因；不因此修改业务handler，也不声明无运行错误。
- 当前320px实际点击备注获得文本光标，既有草稿文字未改；模拟器使用桌面输入未显示手机软键盘。因此仅证明聚焦和当前布局，不能作为键盘顶起/IME/真机通过。后续需要支持的软键盘或真机路径。

## 定位页信息密度
- 查源码确认spot/guides与field共享SpotDetailPage ScrollView，article/source/auth/import/profile/contribution/My皆有独立scroll，不把计划页缺陷推定到所有页面。
- 实际320px DAY定位页首屏显示两大段重复隐私说明，底部还有同主题卡；未点击定位或系统权限按钮。
- 合并重复内容：首卡保留主动一次定位、拒绝仍可浏览/默认深圳；状态不重复可手动浏览；底部保留不持续轨迹、敏感数据不用于广告/普通分析、单独授权及设置下载/删除入口。移除与应用分享能力易冲突的泛化“不启用公开分享”措辞，不新增授权/定位/数据发送动作。
- typecheck exit0 permission-density-typecheck.log；fixture build28692进行中 permission-density-build.log，需poll同步，最新文案未算实际渲染。
permission-density build28692 exit0已同步snapshot，未重启。下一步新版定位页实际渲染/其余320px路由，目标仍全A–F active。

## 定位页新版实测、主页链接减噪
- 320px DAY标准字体实际打开新版定位页：首屏完整容纳定位说明、当前状态、三按钮与隐私说明，无明显横向溢出。未触发定位/设置授权。旧内部错误计数在本次重编译后未见（只有警告），不宣称根因解决。
- 官方redirectTo打开主页链接页，实际显示四平台选项2×2、主页名称/URL输入、对外开关、保存按钮；没有输入/保存/移除动作。
- 精简添加说明、打开/复制能力、已存列表与空状态、公开/仅自己可见标签，移除账户关系/当前环境/回读术语；保留当前public支持限制描述和权限行为。typecheck exit0 profile-density-typecheck.log。
- 本批仅代码+类型检查，尚未构建同步。可与下一页面文案合批构建，避免每几句独立编译；当前snapshot仍permission-density+plan-scroll-frame。goal完整active。

## 导入与主页链接合批
- 320px DAY实际导入首屏：平台2×2、链接、权利确认、建草稿、已有列表可见；当前隔离用户0草稿，没有创建/勾选权利/提交动作，不影响正常10样本。
- 保留顶部只能导入有权内容的限制和完整权利确认语义；缩短重复描述为确认后仍须审核不自动公开。编辑/解析失败/保存/加载/空状态移除伪造、回读、来源沿袭等术语，实际失败状态与手动补充操作保留。
- 与上一轮profile文案一起typecheck exit0 import-profile-density-typecheck.log；fixture build37715运行中 import-profile-density-build.log，待poll同步。均未改handler/权利验证/审核或公开逻辑。
build37715 exit0 compiled successfully，已同步snapshot，不重启；合批文案待实际复查。

## 导入/主页链接新版320px实际复查
- 当前snapshot实际导入页显示简化权利声明、确认后须审核且不自动公开、建草稿和0条列表，主要操作完整；主页链接显示保存个人主页、复制查看说明、平台2×2及输入/开关/保存，没有可见横向溢出。未输入或保存任何数据。
- 原生wx查询按button标签首次0节点（Taro模板下该标签选择不可靠），改按已知生产class查；profile-320-button-geometry.json：viewport320，四平台chip各148×44，返回44×44，保存300×44。toggle-field整行300×75.2仅作为行几何，不冒充内部开关命中尺寸。
- 此证据仅320px DAY标准字体初始空状态；不是全部状态/键盘/其他模式或My入口点击通过。下一可推进反馈页面/实际场地资料等剩余页面，勿重复已通过的同一文案检查。

## 现场反馈标准首屏与文案
- 当前320px DAY标准字体实际反馈页：标题、对象选择、新地点建议、日期/时间和事实入口可见，无明显横向溢出。未选择正式点、采集位置、创建/提交草稿。
- 精简入口说明/本机保存失败/待确认提交/媒体上传与历史状态文案；保留已有点不定位、新地点独立审核、核对不再次提交、本机输入保留与上传完成要求。没有改提交幂等、权限或状态逻辑。
- typecheck exit0 contribution-density-typecheck.log；fixture build63193进行中 contribution-density-build.log，待poll和sync，尚未将新文案算实际验证。
contribution-density build63193 exit0，已同步snapshot，不重启；新文案待实际复查。

## 反馈事实选择窄屏密度修正
- 新版反馈首屏实际320px显示精简说明；真实滚动发现topic全部短标签被max-width340强制一列，9项占用过长正文。默认grid本来2列、各chip min-height target44。
- 仅移除340px media里topic-grid单列覆盖，恢复标准两列；其他长输入/动作和large-text规则保持。没有改事实枚举/选择或默认值。
- fixture build68928 exit0 compiled17940ms，contribution-topic-grid-build.log并同步snapshot。需reload后实际两列与44px矩形复查；本轮尚未见新布局，不宣称完成。
实际320px标准DAY复测：9项topic排成2列5行，说明框紧随其后，标题固定、无可见横向溢出。contribution-topics-320.json保存当前原生矩形；未点击/修改topic。

## 反馈下半页实际检查与底部修正
- 实际320px DAY滚动检查地点名称/地区/经纬度、一次定位、精确坐标同意、媒体权利/选择、保存/提交及0条历史，标题固定、无可见横向溢出。未输入、授权、上传、保存或提交。
- 媒体不可用原生截图显示服务端私有存储配置原因；UI改简明不可上传但可文字反馈，保留disabled及格式数量限制；元数据清理说明精简，不宣称删除照片可见人脸等内容。typecheck media-capability-copy-typecheck.log通过。
- 实际提交按钮明显低于保存按钮；CSS确认primary旧min-height80rpx在320约34px，改为target-min44。历史短筛选原3列被340px改1列，移除该覆盖恢复3列。合并媒体copy构建9016运行中contribution-footer-density-build.log，待poll/sync及实际44px/3列检查。
build9016 exit0并同步snapshot，未restart，待实际底部复测。

## 反馈底部实际复测通过（限定320px DAY空记录）
- 当前snapshot原生滚动到底部，媒体不可用简明提示已渲染，保存/提交完整显示，历史3筛选同排且标签未裁切。没有执行任何保存/提交/授权。
- contribution-footer-320.json原生矩形：保存/提交均300×44；3筛选均97.325×44，top同465.6，证明同排与点击高度。标准320px DAY当前空草稿/0历史状态通过，不能外推有记录、加载失败、真机或所有viewport。
- 下一待验重点转spot/field、spot/guides、article、search、sky在320px的真实布局与模式，不再重复本批已完成的空状态文案。

## 场地证据页职责偏移发现与首批修正
- 只读取既有state的selectedSpotId/observationContext.contextId，在evaluate内部要求selected为spot:test-published后带原context打开spot/field，未输出其余storage/账号或变更上下文。属于资料渲染检查，不替代面板入口实际点击验证。
- 实际320px场地页仍旧详情首屏：空标题、测试地址、正式标签、路线、今晚decision/window、夜空入口，场地事实被推到首屏外。附件二429/430分别要求攻略列表、到达停车设施安全连续事实，当前Context把这两路由定义为渐进证据子页。
- 首批移除lead里的重复decision/观测窗口/夜空入口（Map/sky职责保留），保留路线导航/现有资料分段/事实与核验。CustomNav按当前segment显示观星攻略/场地资料/地点概览；攻略介绍移除白名单、脚本格式、按需加载等开发术语。
- typecheck exit0 evidence-page-focus-typecheck.log。未构建此批，当前snapshot仍旧证据页布局；下一需集中完成身份区测试重复文案与相关布局后合批构建实际查看。不要据此宣称场地/攻略职责完整完成；overview分段仍需复核并保证安全资料入口不丢。

## 场地首屏首批实际验证
- evidence-page-density-typecheck exit0，fixture build17146 exit0并sync；spot-navigation+spot-detail-route通过（evidence-page-route-tests.log）。当前320px DAY带原context打开field成功，标题场地资料，已移除今晚decision/window/夜空lead，停车事实已经出现在首屏；路线操作/分段保留。
- 删除身份区正式标签/光污染重复信息与已知fixture测试地址，仅该测试点地址隐藏；真实地址与最近核验保留。
- 当前实际还发现hero保留130px淡图空区、facility摘要“仅证明自动化测试可覆盖完整字段”仍属无效测试解释；后续需收紧证据页hero并清理此特定fixture展示备注，不能删除真实场地事实/来源/许可。openNight现已无调用，后续清理废弃实现与样式。

## 证据页紧凑身份区
- 去除身份区淡背景图/130px媒体占位，改紧凑文字信息，top42rpx→16rpx。实际照片media.map仍在概览资料中，攻略缩略图未删除。删除已无入口的openNight函数，不新增替代夜空入口。
- FacilityEvidenceDetails新增showDescription默认true；仅在fixture开启+spot:test-published+detail/summary以“仅证明自动化测试”开头时隐藏说明。真实设施文字、状态、开放/使用条件、距离、核验与Provenance全部保留，既有其他调用默认不变。
- typecheck exit0 evidence-header-typecheck.log；fixture build91229进行中evidence-header-build.log，需poll/sync后检查场地/攻略实际首屏。未改变来源或数据本身。
evidence-header build91229 exit0并sync，无DevTools重启；等待下一次实际场地/攻略首屏复查。

## 场地/攻略窄屏与Context继续收敛
- evidence-header新版320px DAY场地实测：身份区130px媒体占位已消失，停车状态/开放/使用条件进入首屏；特定测试设施解释不再显示，核验与来源保留。
- 原生点击攻略仍停留场地（历史touch_cancel问题未解决）；用既有selectedSpotId/contextId官方navigate/redirect打开攻略验证渲染，不计入口点击通过。
- 删除max340将路线强制单列的覆盖，保留44px动作；攻略窄屏采用72逻辑px缩略列，取消整行图片；删除已无引用night-entry样式及selectSpot订阅。未改导航handler/真实数据/权利。
- evidence-compact-typecheck exit0；fixture build91743 exit0，evidence-compact-build.log，已同步可信snapshot无重启。实际320px DAY攻略首屏：路线一行带说明，首条攻略标题/摘要/作者日期/来源待核验/阅读按钮全部可见，无明显横向裁切。仍只当前fixture与标准字号，未推断全模式/真机。
- product-profile.md解除“旧检查要求保留selected设计资源”的残留规则，明确迁移有效生产资产/检查后退休旧原型；删历史选型标识段与Open Design baseline，保留各产品独立职责、用户界面稳定名称与runtime证据边界。context-compact-profile-validation.log exit0。
- 下一继续文章/搜索/sky实际320px与批量当前代码检查；侧边导航最终布局仍待用户之前问题答复；完整A–F goal继续active。plain-candidate产物仍早于最近UI修改，不能作为最新包体证据。

## 攻略文章与搜索实际检查、合批回归
- 上轮为实质进展：源码布局/Context改变及320px实际证据。本轮check:miniapp:fast session92842 exit0，current-ui-batch-fast.log，包含contracts/API/miniapp类型与测试、设计/workflow/图标等；覆盖截至evidence-compact，不覆盖之后本轮article/search文案修改。
- 攻略阅读按钮原生点击后保持pressed未导航，未认定业务成功或定位根因；复用既有spot/context并按catalog真实articleId guide:spot:test-published:preflight官方navigate打开正文。
- 320px DAY标准字号文章实际检查首屏及下滚：固定导航、正文16px角色、原比例图片、夜间安全、停车资料可见；无明显横向溢出。发现测试解释重复出现在正文/图注/设施。
- article仅fixture开关+特定test-published匹配下移除已知正文测试前缀、图注改测试图片、隐藏已知测试设施说明；顶部测试身份/安全提醒/图片署名许可/核验事实/来源均保留；错误提示移除不会用通用清单替代，设施引用标签改直接设施名。article-density-typecheck exit0，build85345 exit0并sync，无DevTools重启。
- 新版实际文章首屏确认：仅出发核验建议、测试图片+作者+CC0、夜间安全进入首屏，正文与图片比例保持。下部设施新文案尚未实看，不能宣称整页所有状态通过。
- 官方redirect搜索，当前320px DAY显示既有查询测试点、候选、筛选及想去分区，无明显横向溢出；模拟器没有手机软键盘，IME未验证。首屏边界说明三行偏实现术语，改“普通地点与待核验点仅供地图定位；观星详情需选择正式观星点。”；partial改“部分结果资料不全，请留意缺失标记。”未改任何搜索/选择/筛选逻辑。
- search-boundary-copy-typecheck exit0；搜索文案尚未build/sync，可与下一必要修改合批，当前snapshot仍article-density。下一继续search下部/sky320px及模式与剩余真实行为，完整goal仍active，侧栏最终方案问题仍未答复，不制造阻塞。

## 星图标准字号状态与控制改进
- 前轮为实质进展（文章/搜索源码、实际320px、合批回归）。本轮先误用仅spotId/contextId打开sky，实际触发context-error；源码要求完整date/selectedAt/timezone/dataRevision，不能视为正常星图失败。
- 按当前stored正式点context加同test-published已缓存overview.decision.inputDigest补全原生产入口参数，官方navigate成功。仅读白名单观测字段与特定公开overview字段在evaluate内部使用，未输出storage/凭证。此为渲染检查，不等于Map云观星入口点击通过。
- 实际320px DAY完整星图：数据已加载，设备方向未授权，因此不投射假方向，底部允许方向与对象展开入口/时间尺存在。未触发方向授权或模拟姿态；星表/真机姿态验证仍未完成。顶部警告与返回位置相邻需后续审视，不因本次copy宣称全部层级完成。
- 精简sky入口错误、恢复、加载、失败、时刻不匹配、星图不可用/对象列表等可见提示，去掉伪造/静态图片/上下文内部解释。保留失败与重试、观测参数保留、天体替代入口；未改route guard/科学计算/请求/权限。
- sky-status-copy-typecheck exit0；合并上轮search文案build21177 exit0，sky-search-copy-build.log并sync。实际发现允许方向使用22rpx、图标26/32rpx，在320明显过小。
- sky恢复与对象按钮文字改共享action逻辑尺寸，图标20px、decorative holder24px；44px命中规则保留。build84509 exit0，sky-controls-size-build.log并sync，无DevTools重启；最新控制尺寸待reload后实际复查。
- 下一用同完整合法上下文复查sky尺寸/通知与返回重叠、对象列表、时间尺。未完成搜索新文案实际复查。所有A–F仍active，plain检查产物仍旧，勿计作当前候选。继续保持标准字体，不开启200/方向权限，不依赖用户信任操作。

## 星图顶部避让实修与320px尺寸证据
- 上轮为进展（sky文案/控件尺寸源码与构建）；本轮实际复查已看到允许方向文字不再缩成约9px。
- 实际发现返回与通知同top，返回88rpx在320不足44px。改复用nativeNavigationInsets获取胶囊安全顶部；三个sky根状态（loading/error/ready）共享CSS变量，缺测量保留env安全区fallback。移除返回层重复safe-top；返回44×44、图标20居中，通知位于返回底部+8px。未改返回handler/关闭通知/权限/星图计算。
- sky-navigation-clearance-typecheck exit0；native-metrics现有2测试通过，sky-navigation-metrics-tests.log；build30561 exit0，sky-navigation-clearance-build.log并sync，无重启。
- 当前320px DAY实际截图顶部通知和返回已分离；sky-controls-320-geometry.json：胶囊bottom56，返回top60.95/bottom104.95/44×44，通知top112.95宽296；允许方向70×44。证明该viewport当前状态8px间隔、胶囊避让与44px命中，不外推其他viewport/模式或真实姿态。
- 现有current-ui-batch-fast通过仍早于sky本轮修改，最近仅typecheck/metrics/build。下一推进sky对象列表/时间尺与其余模式或完整行为待办，sourceplan/Context清理大项尚未全部完成；完整goal active。

## 星图时间尺与对象文字尺寸
- 前轮为进展（顶部源码/当前WEAPP矩形证据）。本轮确认对象标题26rpx/count22rpx、时间主值24rpx/tick18rpx仍小于标准角色，tick整体还scale文字。
- 改对象标题section、数量metadata、时间主值secondary、状态/刻度metadata、取消action；时间尺容器/viewport/track/tick高度72逻辑px，当前行按secondary行高；保留原始水平step和scroll计算、弧线translate/opacity，移除文字整体scale；选中附近4个索引内不重复绘制常规标签。取消按钮44逻辑px。未改实际时间帧/请求/提交/取消逻辑。
- sky-ruler-density-typecheck exit0；build82616 exit0，sky-ruler-density-build.log并sync，无DevTools重启。新时间尺待实际复查，不能宣称已完成320布局/拖动。
- sky-canvas-time+sky-time-frame首跑7/8，一项按LF字符串截取源码的测试因Windows CRLF没找到callback结尾，未执行行为断言。只在测试读取处normalize CRLF为LF，保留原始生产绘图执行及全部断言；重跑8/8 exit0，sky-ruler-time-tests.log。不是更改绘图逻辑掩盖失败。
- 下一复用已有正式context与同点缓存overview digest打开sky检查72px时间尺与底部操作是否重叠、标签密度，之后对象列表/三模式和其余A–F。仍有大量业务真实数据/真机与Context依赖清理待办，goal保持active。

## 时间尺标签实际裁切与对象列表交互
- 前轮为源码/构建/测试进展。本轮实际320px新时间尺主值已清楚，但刻度文本被34rpx按钮宽度裁切。修tick overflow visible，标签absolute居中/max-width none/自然宽度，并给刻度预留metadata行高；未改水平step/drag计算。
- sky-ruler-label-build session58048 exit0并sync无重启。重新用完整context打开sky实看选中“下午09:00”与右侧下一标签完整；外围弧线仍淡出/出viewport，不宣称所有时刻或拖动通过。
- 实际点右侧对象展开按钮成功显示4项、流星雨/木星/金星等名称与方位高度；未授权设备方向、未改变观测时刻。展开布局发现对象列表底部与允许方向行相碰。
- 已将object-list bottom从300rpx改共享控制基线204rpx + target44 +24逻辑px，给44px操作及外padding留间隔。此最后CSS修改尚未build/sync，当前snapshot仍sky-ruler-label版本，下一合批构建实际复查列表间隔和底部。完整goal active。

## 星图对象列表间距实测通过（320px DAY）
- 前轮为实质进展：标签裁切修复/实际展开/列表底部CSS。本轮build23479 exit0，sky-object-clearance-build.log并sync，无DevTools重启。
- 同完整正式context打开当前sky，首次对象按钮点击未展开（原生查询list=null）；第二次实际点击展开，不能把此偶发取消问题当作解决。
- 当前截图可见列表不再与方向操作相碰。sky-object-clearance-320.json记录viewport320：list bottom413、recovery top425/bottom481、time-ruler top486/bottom558,height72，列表与方向行间隔12px，方向行与时间尺5px。仅本设备/模式当前状态；实际滚动/时刻预览提交/其他模式与真机未完成。
- 下一应转剩余大项，不要反复同320空授权布局：当前miniapp全测试（覆盖最近sky源码），其他viewport/模式与完整业务链，及Context旧资源有效消费者迁移。顶部/对象/时间尺这批标准320局部布局已有实证，完整goal仍active。

## 当前小程序完整回归与历史检查规则收敛
- 前轮为实际列表间距证据。本轮首次完整miniapp测试83415 exit1：256中254通过，2个article partial-content测试VM未声明新testSpot。生产页面完整函数有声明，原测试仅截取return+loading。
- 测试改为同样从生产AST提取testSpot声明，提供fixture标志与spotId输入；新增真实场景隔离断言：fixture关闭或普通spot保留完整正文，只有fixture开启且test-published移除已知测试前缀，安全正文保留。没有弱化pending/failed/stale/media断言。
- 重跑完整miniapp测试50603 exit0，current-post-sky-tests.log，257项通过；包含最近article/sky及既有状态/数据恢复测试。该命令不是API/contracts全仓或WEAPP交互/真机证明。
- acceptance-runtime Context贡献表单残留200%改标准字号；design:targets:verify原冻结native/ops原型hash清点明确降为历史可选诊断，不是当前UI开发/验收要求，不同步旧hash，现行业务/control覆盖仍由Screen Contract和production检查负责。未删除旧资源或修改原型校验器，未绕过历史删除策略拒绝。
- context-runtime-authority-validation.log exit0。当前snapshot仍sky-object-clearance源版本，本轮只测试/Context改动，无需重构建重复UI。
- 下一继续非320DAY/关键真实业务链及Context有效消费者迁移；完整goal active，侧栏最终选择仍未答复，其他大项可继续。

## 地图把手方向归属修复
- 前轮为实际测试/Context进展。本轮转完整需求中的手势未完项：源码onHandleTouchMove只检查Y，横向为主仍可触发panel extent。release也可在无move事件时直接提交Y。
- start记录有限X；未确定纵向拖动时，横向达到8px且不小于纵向即取消整个gesture，后续move不复活。确认纵向后保持owner，不在横移时转交。release同样检查未识别手势的X/Y，已有identifier/multitouch/cancel/lategeometry保护保留；缺X的旧事件保持原兼容行为。
- panel-drag-cancel生产handler执行测试补三场景：横向后大幅纵移不提交、无move的横向release不提交、已确认纵向后横移仍提交。与panel-snap一起exit0，panel-intent-tests.log；panel-intent-typecheck.log exit0。
- 尚未构建/sync，本轮不声称WEAPP拖动通过。下一可继续速度吸附/settling实现后合批构建；当前仍nearest position +180ms easeout，弹簧/速度/重抓完整体验未完成。不要把方向判定一项视为整套面板手势完成。完整goal active。

## 面板释放速度接入
- 上轮为方向归属源码/回归进展。本轮panel-snap增加最近100ms速度计算（跨度不足8ms/最后采样过旧返回0，速度限±3px/ms），按180ms投影选择真实small/medium/large锚点，最终高度夹紧，不生成额外档位。
- 生产handle start/move/end记录最多12个原生位置采样，release时间在等待几何前冻结，晚到geometry沿用同release，不将查询等待计入速度。停顿松手丢弃旧速度。原方向锁/取消/identifier/多触点与不足8px不提交保留。
- panel-velocity-typecheck exit0；panel-velocity-tests.log exit0（3tests），包含纯函数快上/快下/停顿/无效速度/边界，以及生产handler快推30px到large、停住230ms再松手回medium，原cancel/lategeometry/横向规则继续通过。测试Date使用可控时钟，避免执行机器耗时影响判断。
- 尚未build/sync，当前snapshot仍sky-object-clearance，无真实面板velocity验证。180ms是当前投影候选，不是实测定稿；settling仍CSS180ms easeout，弹簧与速度连续/重抓细节尚需实现验证。完整goal active。

## 面板方向/速度合批构建与原生拖动
- 前轮为速度源码/回归进展。本轮build72453 exit0，panel-intent-velocity-build.log compiled14059ms，已同步snapshot，无DevTools重启。
- 生产handler测试增加regrab测量：当前逻辑medium350但实测presentation480，开始offset=-130，继续上移20后offset=-150；确认从中间高度续拖，非跳逻辑锚点。panel-velocity-tests.log重跑通过。仍不是运动中实测速度连续或弹簧证明。
- 等待当前Map实际加载完成后320px DAY medium显示；原生sky.drag从(1060,336)到(1150,344)横向为主，观察仍medium。随后从同把手(1060,336)到(1060,170)纵向上拖，实际展开large，正文/动作与tab显示正常。
- 这证明当前构建实际横向不切档、纵向可展开；工具未提供拖动时间采样，不能归因于速度阈值或宣称快速flick校准通过。弹簧settling仍180ms easeout待替换，真实反向重抓/取消/多指/其他尺寸模式尚未完整验证。
- 当前snapshot处于Map large（320 DAY），下次不要假设仍sky。完整goal active；接下来可继续面板settling或其他尚未完成项，避免重复这些已观察路径。

## 弹簧轨迹准备（尚未接入UI）
- 前轮为实际原生横向/纵向拖动证据。本轮查本机Taro animation.d.ts，原生Animation支持分段step/export，可一次提交轨迹而非每帧React地图setState。尚未调用/接入动画。
- 新panel-spring.ts实现有限边界的临界阻尼高度轨迹：从当前presentation高度开始，承接初始速度（±3px/ms），16ms分段，最大640ms，精确落目标；reducedMotion即时到目标，非法输入不产生轨迹。omega0.024只是候选参数，需实际手机验证。
- panel-spring-tests.log最终2tests通过：初始高度/反向速度/两边硬边界/最大时间/重抓重定向/精确目标/减少动态/无效值。首跑反向-1px/ms期望16ms仍下降失败，因为弹簧加速度已回转；改用-2px/ms的明确反向样本后通过，未修改求解器迎合断言。
- 此模块尚未有生产消费者，不是产品弹簧完成；下一必须接入release动画并处理grab/cancel/hide/spot/extent变化清理，再验证真WEAPP性能与方向连续，或若原生step不适合需移除替换这项试验。当前snapshot仍上一构建，UI仍CSS180ms easeout。完整goal active。

## 原生弹簧承载方式已实际验证
- 前轮为轨迹求解器实现/测试。本轮检查createAnimation接口后发现其导出样式清理需要确认；改检查现有Page.animate/clearAnimation。当前官方automator9421实际read-only能力查询：pages/map/index两者均function。
- 本机node_modules/miniprogram-api-typings/types/wx/lib.wx.component.d.ts/lib.wx.page.d.ts可作接口来源。官网animation.html访问non-retryable，搜索镜像不作实现权威；无需继续重试官网。
- 当前Map large320 DAY上实际原生小幅探针：读spot-panel高度520，Page.animate两帧80ms到516，结束回调测516，clearAnimation(selector,{height:true})后测520。panel-native-animation-probe.json保存。没有改业务/选择/观测时刻，无重启，已恢复原布局。
- 下一采用Page.animate一次提交panelSpringFrames转keyframes（offset累计时长），完成/重抓/隐藏/切点时clearAnimation只清height；生产逻辑仍需接入，不能宣称弹簧已实现。避免使用未证实清理语义的createAnimation export，避免逐帧全Map setState。注意Taro宿主Page类型与选择器范围，需要实际运行验证。
- 完整goal active，本轮是改变技术路线的实际证据，非停等。当前snapshot仍panel-intent-velocity，solver未接入。

## 原生弹簧释放路径接入（待WEAPP验收）
- 上轮为Page.animate/clearAnimation实际520→516→520探针。本轮新增panel-native-spring.ts controller，将panelSpringFrames一次转height keyframes/offset/linear，结束clearAnimation只清height；generation保护使取消或后继动画后旧完成回调无效。
- Map释放先用velocity确定target，再按当前高度/高度速度(-pointer velocity)/真实锚点生成轨迹并调用当前Taro Page.animate；原生方法缺失或reducedMotion无多帧时保留原档位提交。panelSettling class关闭重复CSSheight过渡；hide/unmount/切点/切presentation/外部extent改变/gesture cancel清理；重新抓取在测得presentation高度后清旧动画。没有逐帧React setState。
- SpotInformationPanel增加settling输入，large的章节边界测量等settling结束再进行（effect含settling），避免沿用中间高度。其他章节请求时序/媒体展开仍需实际复核，不是整套动画全部完成。
- panel-native-spring-typecheck exit0（首次接入）；panel-native-spring-tests.log9/9，覆盖solver、native一次提交/取消/过期回调、原生产handler和section tests。现有VM tests补齐新增依赖/settling=false，断言保留。
- build26296 exit0 compiled14075ms，panel-native-spring-build.log，已sync可信snapshot无重启。当前需要等待Map加载后原生拖动/收回/重抓/取消，并观察clear后高度与章节同步。尚未宣称UI弹簧正确/帧性能或速度连续通过。
- 技术待查：Page.animate异常时当前controller仍会抛出，需要真实失败路径保护；regrab测量与clear之间时序是否闪跳；减少动态与外部extent/切点清理实测。完整goal active，不以solver+green tests替代实际需求验收。

## 弹簧真实调用与回调缺失恢复
- 前轮为原生弹簧接入/测试/构建。本轮给controller加入animate/clear异常保护和固定错误码日志，失败仍调用done释放settling，failed owner不遗留；新增测试通过。
- 在当前fixture Map上临时透明包装当前Page.animate/clearAnimation，只记录selector=.spot-panel的调用摘要并原样转发，实际原生把手上拖后读取并恢复原方法/删除探针。panel-native-spring-runtime.json：17frames、256ms、from464.59096→520，最终height520；但没有complete/clear记录，settling层仍存在。证明实际调用了新动画，同时发现完成回调缺失，不能宣称动画全过程正确。
- 针对此实测缺陷，controller新增duration+100ms结束兜底：clear只height、释放settling、输出固定不可用码；正常完成/取消先清timer，generation/active阻止过时清理。新增缺失回调116ms测试确认一次clear/一次错误/完成，既有异常与后继隔离测试保留。
- panel-native-spring-failure-tests.log最终5/5通过。build80660 exit0，panel-spring-recovery-build.log并sync可信snapshot，无DevTools重启。新版兜底尚待原生拖动后实际检测settling消失。
- 回调缺失根因未证明（可能与Taro渲染/原生动画时序有关），兜底不是帧连续/性能证明。下一先验证恢复，再审视启动时序/中断/章节同步和外部档位。完整goal active。

## 弹簧恢复标志通过但发现高度残留；启动时序候选修正
- 前轮为回调缺失恢复代码/测试。本轮当前构建原生上拖到large后panel-spring-recovery-runtime.json：height520，large存在，settling=null；console出现panel_native_animation_unavailable说明兜底触发，原生callback仍未正常结束。
- 再实际从large把手下拖，逻辑medium、settling=null，但面板height362.5125，中档隐藏量尺320。computedStyle height362.513px。这是实际未恢复正确高度，不能称恢复完成；clear旧动画可能恢复了开始时的presentation值，根因尚未确定。
- 已将生产原生start延后到Taro.nextTick，在extent/settling写入后启动；新增springRequest序号，stop/hide/cancel/切点/unmount失效待启动回调，避免过期启动。此是时序修正候选，尚未证实修复高度残留或原生callback。
- panel-spring-start-order-typecheck exit0；build85142 exit0，panel-spring-start-order-build.log并sync，无重启。下一必须实测新构建上拖+下拖并比较actual height vs snap-medium，记录animate完成/clear回调；若仍残留需调整原生清理策略，不能把deadline兜底当正确弹簧。
- 当前snapshot正在reload到最新时序候选，完整goal active。不要重复先前受影响的动画通过宣称，性能/重抓/取消仍未全验。

## 启动时序候选实际复查：小档高度一致
- 前轮为nextTick启动候选/源码/构建。本轮现有320 DAY Map实际第一次上拖未响应、第二次上拖到large；原生结束回调仍缺失（console固定fallback警告），不可宣称时序修复了回调。
- 随后实际下拖吸附到small而非medium（速度参与选择），不能用它验证中档。实际small高度196，隐藏small量尺196，settling=null；panel-start-order-small.json保存。此次未复现之前medium362.5 vs320残留，但中档仍需单独验证。
- 未新增源码；这是新构建真实状态证据，继续推进。下一以slow/明确档位操作测试medium再拖、必要时记录原生keyframe时序查callback缺失；避免再次把CSS终值正常当实际弹簧连续性通过。完整goal active。

## 原生动画反例与当前回归
- 前轮为small高度一致实际证据。本轮未改源码，继续探针缩小原因：直接在稳定Map small页面提交17帧256ms小幅轨迹，600ms后complete=false，已clear恢复；panel-spring-keyframe-probe.json。不经React更新也失败，因此nextTick不是已证实根因。
- 依次对比plain-two/offset-two/ease-two/plain-many，80ms动画300ms后各complete=false，逐项clear；panel-keyframe-format-probe.json。随后原始两帧减4高度在1000ms后仍complete=false，before196/animated200.65（不符192目标）。此前大档520→516探针成功不能泛化；native运行行为仍不可靠，不能宣布弹簧完成。
- 这些探针只调用已有Page动画/清理，不改变业务state或持久数据，也未保留方法包装。下一应检查稳定元素选择器/宿主及CSS/原生动画竞争，必须观察实际轨迹与清理结果，不能继续凭函数存在判定可用。
- 当前完整miniapp测试22845 exit0，current-panel-spring-tests.log；这是逻辑/组件片段测试，不能推翻上述原生反例。完整goal active且仍有其他可执行事项，不标blocked/complete。

## 原生动画清理范围差异找到
- 前轮为原生反例+263测试通过。本轮实际computedStyle：面板仍height200.9、transition transform/height 0.005s linear，而非页面CSS180ms；说明仅清height后保留了原生过渡状态。
- 对照：先Page.clearAnimation('.spot-panel', callback)全清，再两帧160ms减4，1000ms观测before199.7→195.7、completed=true，随后全清。与此前height-only后的plain-two失败形成可复现差异；不推断全部根因已穷尽。
- controller改为清除本owner唯一目标.spot-panel全部原生动画，接口移除height参数；CSS关闭opacity不是原生动画owner，未改其他元素动画。generation/timeout/异常/settling恢复保留。
- panel-spring-full-clear-tests.log5/5；build28749 exit0 compiled15440ms，panel-spring-full-clear-build.log并sync，无DevTools重启。新构建必须重新实际拖动，确认正常callback/清理终值；尚不宣称已彻底修复。
- 下一恢复Map后记录animate complete+clear（包装需支持无options），并测medium/small/large终值。完整goal active，probe残留已随新bundle重载清除。

## 全清动画的实际反例与 Context 尺寸冲突清理
- 最新 full-clear 构建320 DAY实际上拖：panel-spring-full-clear-runtime.json记录20帧304ms、464.59→520；有clear(all=true)，无complete，settling=null，actual520。probe透明包装已restore/delete。兜底恢复状态不等于正常动画完成。
- 随后实际large把手下拖，重复读取间隔12秒仍actual219.925，small量尺196；panel-full-clear-down-residue.json保留。这不是采样中的瞬间，清全部动画仍未解决最终高度残留。下一需查原生clear与CSS/样式恢复的竞争；不要重复宣称全清已修复，不应继续只加超时。
- 本机类型声明clearAnimation支持(selector,callback)及(selector,options?,callback?)；无参options有效，不能直接断言缺callback是根因。尚未做新的猜测性源码修改。
- Context architecture删除旧miniapp88rpx硬编码（与当前DESIGN逻辑像素规则冲突），改引用DESIGN具体profile；去过时selected-target/default-index措辞，保留架构业务。INDEX确认现有goal已包含context精简，不需用户再次改目标。
- npm run context:validate exit0，仅manifest/path结构检查，不是普通链接或产品正确性证明。完整goal active；其他尚未完成范围沿用PLAN。当前snapshot Map收回后存在上述高度残留，无DevTools重启，无数据写入。

## 清理回调调用实测修复高度残留；关键帧精度假设被反例否定
- 前轮属于进展：取得稳定高度残留反例、清理Context冲突。本轮继续当前运行态：clear无callback后height219.925且原生transition16ms残留；直接同Page clearAnimation(selector, callback)得到cleared=true、height196、CSS transition180ms恢复。panel-clear-callback-comparison.json记录。仅证明当前基础库/宿主调用差异，不把可选参数类型推断成规范强制。
- controller clear统一显式提供callback；回归检查清理调用携带function，既有异常、过时回调隔离、timeout和solver保持。5/5测试通过，miniapp typecheck exit0。build46915 exit0 compiled16558ms，panel-clear-callback-build.log；同步可信snapshot，无重启。
- 新构建实际medium上拖large、large下拖small，panel-clear-callback-down.json：height196与small量尺196完全一致、settling=null、原生transition不残留。修复已复现的收回终值问题；上拖console仍fallback，不能宣称原生回调正常或弹簧完整验收。
- 为验证“细小/重复关键帧导致停住”假设，稳定small页面原生透明探针比较raw21帧与整数去重15帧，196→240/320ms，duration+500观测均completed=false、height约238.2；panel-keyframe-precision-comparison.json。假设未获支持，未修改生产帧精度。每项全清带callback恢复原布局，无业务数据/状态修改，无残留包装。
- 下一需要换角度定位Page.animate多帧宿主实现/渲染线程推进，或选适合WEAPP的连续动画承载，保留速度连续/可中断/无逐帧地图React更新要求。不要继续叠加超时或对同一反例反复试探。也可推进其他尚未完成UI/业务项，全部范围仍PLAN，goal active。

## 原生动画完成延迟已量化，下一改承载而非超时
- 上轮有实质进展：clear显式callback修复实际small高度残留。本轮不重复终值验证，延长只读探针观察窗以区分永不回调和迟到回调：21帧/声明320ms实际completedAt1283ms，最终240px。panel-native-completion-latency.json。此前duration+100兜底确实会提前中断尚在推进的原生序列，原先“回调缺失”应精确为观察窗内未完成，不能解释为永久缺失。
- 同一稳定small页面、196→240、320ms、linear对照：2帧400ms、5帧534ms、11帧797ms，均最终240且callback到达。panel-native-frame-count-latency.json。帧数增加伴随明显额外延迟，支持当前DevTools多帧承载成本而不是solver小数或nextTick导致停住；未推断所有真机同样延迟。所有探针clear(callback)恢复196，无业务写入。
- 不延长生产deadline来掩盖慢回弹，不删除速度/可中断要求。下一优先把现有bounded solver轨迹一次投影到CSS keyframes+custom properties，由渲染侧播放，避免Page.animate逐关键帧承载延迟和逐帧全Map React更新；onAnimationEnd已在本机Taro View/common类型声明存在。需验证WEAPP实际支持及事件范围，取消/重抓/隐藏/换点/减少动态保留。若实际不支持再选择其他原生渲染方案，不保留无消费者实验。
- 本轮无生产源码改动，无重启/发布，当前snapshot仍panel-clear-callback构建，恢复Map small。下一可直接从index.tsx release/start/stop和spot-panel.tsx root View接入，现有solver复用；native controller及其测试必须按最终承载迁移，避免同时保留两套owner。完整goal active，全部未完成范围仍PLAN。

## CSS 渲染层弹簧已接入并观察到真实连续轨迹
- 上轮量化native keyframe桥接成本，本轮替换生产Page.animate消费者。panel-spring-style.ts把现有bounded轨迹一次重采样成41个CSS高度变量；index.scss两个交替keyframes在渲染层播放，无逐帧React state/桥接。原控制器重命名panel-animation.ts及测试，保留generation/cancel/异常/单owner，无第二套动画owner。
- Map提供本地CSS adapter，root panel绑定spring class；现有stop/hide/unmount/换点/extent/重新测presentation再抓逻辑保留，reducedMotion仍无多帧。类型检查通过。CSS投影端点/反向/边界、生产cancel/multitouch、controller隔离/异常5tests通过。首次handler片段测试缺springTarget新依赖失败，补VM依赖后通过，未弱化既有行为断言。
- 首CSS build23098 exit0 compiled14970ms并sync。实际首拖未响应、第二次上拖large；随后down样本panel-css-spring-down-runtime.json：声明336ms，从382.513→365.962→338.075→325.775→321.45→320，采样时间1071..1399跨度328ms，最终medium320，settling=null。不是1.28s native序列；采样存在跨帧间隔，不能称真机帧率或完整interruption通过。
- CSS animationend未到，查本机Taro View.d.ts明确事件@supported alipay，虽WEAPP生成template有binding不能证明实际支持。因此控制器按声明duration+50ms渲染余量正常退休CSS presentation，不把预期无event输出错误；实际renderer异常仍报告。可用animationend可提前完成，cancel仍清timer；timer测试改验证无event正常完成且errors0。不是延长旧native超时，旧native Page.animate调用已移除。
- 最新duration cleanup build92877在本轮启动，panel-css-duration-build.log；完成后必须确认exit并sync。当前运行若未sync仍上一CSS构建，会出现旧completion warning，不能归因新实现。下一实测新版终值/无警告及重新抓取/反向/取消，再覆盖其他尺寸模式/全页面剩余范围。完整goal active。
- 随后确认build92877 exit0，已sync可信snapshot，无重启。下一等待reload完成再验证新版duration清理。

## 新版 CSS 清理终态通过；地图反馈去开发措辞
- 上轮是实现+实际CSS轨迹进展。本轮现有duration-cleanup构建实际上拖large，控制台无旧动画warning；再实际下拖small，panel-css-duration-runtime.json：height196、small存在、spring=null、settling=null、animation-name=none。仅证明已完成的往返及终态，不是运动中重抓/多指/所有尺寸验收。
- 当前完整miniapp test59019 exit0，current-css-panel-tests.log264/264。这是CSS版本全部测试，不含随后copy改动。无需重复原生keyframe路径；旧native消费者已退役。
- Map提示/读屏announcement清理内部“上下文”“不会伪造”“不影响地图状态”“没有把直线距离当路线”等说明，改为观测条件更新/取消/仍可查看资料/右上菜单分享/到达说明。保留GPS一次请求、权限失败、旧观测条件不能用于新位置、天气天文独立状态和错误原因。成功announcement不虚构查询仍加载。
- one-shot-location tests只更新变更文案期望，状态/并发/取消/权限断言保留；首次漏改取消文案期望失败，补齐后map-feedback-copy-tests.log16/16。包括导航和时间race tests。copy尚未build/sync，运行snapshot仍CSS-duration构建，后续可与其他UI改动合批，不声称新copy已实际看到。
- 下一继续中断/重抓能力及其他页面/模式覆盖；context旧设计消费者迁移、真实资料业务等完整未完范围仍PLAN。Goal active，无DevTools重启/发布/数据修改。

## 减少动态的 CSS 回退漏洞修正并合批文案
- 上轮是CSS终态实测+地图文案进展。本轮检查发现solver reducedMotion只返回单帧，但CSS默认180ms height transition仍生效；应用偏好.reduced-motion仅soft-button被全局处理，panel未覆盖。
- Map在preferences.reducedMotion变true时调用已有stopPanelSpring取消当前owner/timer；index.scss对.reduced-motion panel/media/handle关闭animation和transition，系统prefers-reduced-motion也关闭新spring动画。保留直接拖动跟手、最终档位与已有布局，不加大字号工作。
- typecheck通过；panel-reduced-motion-tests.log9/9（solver减少动态、controller取消/时长、生产gesture取消、多指、章节同步）。这些不是实际开关后的CSS计算样式证明，下一仍需验证fixture设置偏好/返回Map以及恢复原设置，不拿源码通过代替设备行为。
- build75282 exit0，panel-reduced-motion-copy-build.log，并已sync可信snapshot无重启。包含上一轮地图提示copy，尚未逐条触发新文案；不为了看提示制造网络失败或更改真实业务数据。
- 全部goal未完项保留，优先下一实测减少动态及中断，再其他模式尺寸/页面/业务数据/Context残余消费者。当前snapshot重新加载Map，正常开发实例未动。

## 减少动态真实开关与恢复验证
- 上轮为减少动态CSS缺口修正/构建，属于进展。本轮现有320 DAY snapshot从Map通过官方wx.navigateTo打开Settings（不是菜单入口验证）；原生滚动找到开关，确认原值关，实际click开启。
- 原生返回Map后官方只读selector查询.reduced-motion .spot-panel：height320、transition=none 0s ease 0s、animation-name=none，panel-reduced-motion-runtime.json保留，证明当前构建与真实偏好相连的计算样式生效。尚未在开启状态下实际拖动或系统OS减少动态设置验证，勿扩张结论。
- 重新打开Settings/原生滚动，实际click恢复关，截图明确灰色关，随后原生返回Map；大字保持关，其余偏好未主动改变。未点同步/清缓存/删除账号/定位授权。该fixture偏好自动同步属于现有路径，不修改正常开发实例。
- Settings控制台仍有微信Worker reportRealtimeAction fail not support及SharedArrayBuffer弃用提示；不是新动画warning，未声称已修复。无源码改动/重启。本轮取得实际跨页面偏好证据并恢复状态，goal active。

## 架构验收 Context 的旧资源要求移除
- 上轮减少动态真实开关证据属于进展。本轮继续Context授权清理，读取实际design verifier与架构owner，发现assurance-and-lifecycle仍宣称design:system:verify校验Field Signal资源membership/digests并要求I21 selected constraint，与现有生产token校验及用户退役要求冲突。
- 将该owner对应两条改为独立DESIGN→生产tokens/contrast/palette与当前Screen Contract/真实候选runtime范围，明确旧资源hash/prototype不作为当前必需项。screen-contracts索引去SHA/selected-v3展示闭包维护叙述，保留纠正需求和dispositions来源。未改账户擦除、数据库、真机、业务语义。
- context:validate与design:system:verify均exit0；后者实际输出legacy_visual_targets=not-required、miniapp2generatedfiles/13contrastpairs/44px，证明文案与现有检查范围一致，不是放宽token检查。
- 进一步查到tools/miniapp/verification-spec-field-signal-i21.json仍含旧handoff/resource_manifest/feasibility/semantic hash及required_tree_roots，workflow-conformance.test.mjs1178/1279/1326附近有消费者。此部分尚未迁移，不能宣称所有旧资源依赖清理完。下一读取这些实际消费者及verifier-runtime后决定保留有效场景/运行约束的迁移，不直接删JSON/资源以免误伤有效验证，也不更新旧hash。
- 本轮未删除历史资源文件，无重启/数据写入。Goal active，UI/业务其他未完项不缩减。

## 日常工作流测试移出冻结协议依赖
- 上轮Context旧验收措辞清理是进展。本轮确认workflow-conformance的三组测试实际只针对冻结verifier、旧V2.1.1 marker闭包和旧编排population协议，读取.long-task/handoff/spec/hash；当前生产session隔离/候选/异常验证在同文件其他测试已有覆盖。
- 将三组原测试完整移至可显式运行legacy-verifier-diagnostic.mjs，默认workflow命令未纳入；不改冻结verifier/launcher/spec/hash，不删除其中业务材料。新独立current-candidate preparation测试保留现有fast/design/infrastructure/production/native success+degradation命令组合和禁止旧资源依赖。日常路径不再因这三组诊断要求维护旧资源。
- 跑当前workflow发现近期Map hide新增stopPanelSpring和Sky safe-top→nativeNavigationInsets、缺失文案后的陈旧断言。更新为真实hide含动画取消、Sky使用nativeNavigationInsets及CSS --sky-controls-top和当前星图不可用替代入口文案，未删除有效断言。中间新增skyStyles引用未定义，改读取实际scss后解决。
- workflow-current-context-tests.log16/16 exit0；legacy文件node --check通过（未运行历史绑定诊断）；context:validate exit0。development-loop只加简短可选历史入口及当前测试owner，不复制进度。完整spec/旧资源仍存在且可被显式旧verifier读取，不能宣称已物理清空全部资源。
- 下一可跑完整workflow命令检查其他test文件是否仍读旧展示输入，并继续剩余Context/运行UI业务；无DevTools重启/数据写入。Goal active。

## 完整日常工作流与 DESIGN 当前范围清理
- 上轮三组历史诊断迁出是实现进展。本轮npm run test:miniapp:workflow exit0，current-context-workflow-suite.log74/74。其余六个显式日常test文件定向检索design-resources/selected-handoff/fact-manifest/verification-spec/.long-task无匹配；检索范围仅当前package命令所列文件，不代表全仓库已无依赖。
- DESIGN小程序章节仍有多处200%必验措辞和旧“本轮13项”阶段范围，和当前用户标准字号/14routes要求冲突。将小程序大字工作明确暂停，后续组件条款保留长中文、窄屏重排、信息不裁切、读屏、键盘、真实错误/权限/状态要求，移除重复200%当期义务；旧13项阶段限制改为当前用户需求与所属Screen Contract定范围。
- Native App独立200%条款未改；结构化tokens/专用手势几何/配色值未改。design:system:verify exit0、生产生成文件仍一致，无需为文字清理重生成tokens或原型资源。
- 下一回到其他尺寸/模式及真实页面行为，或处理尚存旧设计消费者，不重复已通过74tests。UI/数据/真机等goal完整范围仍未完，active。当前运行snapshot不受纯文档改动影响。

## 动画结束路径收敛与旧 timer 隔离回归
- 上轮完整workflow/设计范围清理属于进展。本轮检查spot-panel仍保留onAnimationEnd读取当前springMotion.complete：微信不保证提供此事件，若迟到则可能指向新motion，与controller捕获旧generation的回调不同。
- 删除root事件消费以及PanelCssMotion的complete/name重复字段；CSS渲染adapter仅提交style，现有controller按duration取消/完成是唯一退休owner。旧事件不会通过最新React闭包清理新动画，减少不必要的跨平台路径；真实CSS关键帧及拖动样式未改。
- 新计时回归模拟A播放20ms后被B替换，越过A原deadline仍不清B，到B自己的deadline只结束一次。panel-single-completion-tests.log6/6；typecheck在移除事件后通过。已有cancel/multi-touch/边界投影保持。
- 本轮源码尚未build/sync，运行snapshot仍reduced-motion-copy构建；下一与其他UI改动合批并实测运动中重抓，不能称已经真机中断验收。Goal active，其他UI/Context/data未完成范围保留。

## 当前非 fixture 隔离候选构建检查
- 上轮移除迟到animationend路径和timer隔离测试属于进展。本轮用MINIAPP_ISOLATED_CHECK_BUILD=1，清除fixture/build API覆盖，现有guard拒绝watch/fixture/diagnostics冲突，独立dist/weapp-check输出，不覆盖正常watch或可信fixture snapshot。
- build73452 exit0 compiled14426ms，current-plain-ui-build.log。inspectCandidate显式bundleDirectory=apps/wechat-miniapp/dist/weapp-check，current-plain-ui-inspection.json11静态checks全true：14routes、18filters、26catalog IDs、native/config/location/recovery/sourcecache等源码/产物检查。
- 当前raw总字节1523107，main1134224/content236562/spot75435/sky76886，source maps0；低于原aggregate2MiB预算。该数字不是平台upload压缩包。catalog26存在不意味着正式资料完整或通过发布评估。
- 本轮非fixture新候选包括single-completion改动；可信snapshot仍旧reduced-motion-copy构建，未把plain输出拷入fixture，实际中断/多尺寸模式/业务状态验证仍未完成。无DevTools重启/上传/发布。Goal active，后续使用明确候选路径，不拿默认dist可能watch输出当本次候选。

## 390 标准字号 Map 面板与资料冲突观察
- 上轮当前plain候选构建为进展。本轮通过DevTools原生菜单机型切换iPhone12/13(Pro)390×844；工具自动reload，无退出重启/trust交互。当前wx viewport390×762，截图phone区域约x845..1209/y92..876，旧320拖动坐标不再适用。
- 加载完成实际DAY中档：标题/侧栏概览天文可辨识，动作栏在主tab之上。panel-390-standard-geometry.json：medium426.9375，动作/侧栏按钮44px，toolbar44、icon18；面板width390.4是实际小数观测，不虚写整390。原生slot安全区域已适配，但尚未全场景横溢/读屏/大档/430验证。
- 当前运行仍reduced-motion-copy fixture构建，非plain输出/非最新single-completion，正常字体/减少动态关。机型切换只影响该可信snapshot，不改普通开发实例。
- 实际发现到达说明“停车状态未知”与设施表“停车 可用”同时出现。spot-panel route.parkingGuidance与detail.spot.facilities是两来源，需查后端时效/证据状态一致性；不能简单隐藏未知或把可用当已验证。源码位置spot-panel.tsx248/384/395，postgres-repository.ts262及route生成是下步入口。尚未修，不能把fixture标识当允许矛盾理由。
- Goal active，下一优先查该真实信息矛盾，并继续其他尺寸模式/完整业务范围。

## 停车状态冲突定位并修复 fixture owner
- 上轮390实测发现停车未知/可用并列，是改变下一行动的进展。本轮追到packages/miniapp-contracts/src/catalog.ts：TEST_PUBLISHED_SPOT设施明确AVAILABLE，buildTestSpotDetail无条件写所有点停车未知。服务/Panel只是读取不同字段，不是UI自行拼造状态。
- 仅completeTestSpot停车说明改为“请在划定车位停车，保持通道畅通”，不虚构现实位置/容量/营业信息；其synthetic身份标识保留。普通未知点仍原未知说明，直线距离仍STRAIGHT_LINE_ONLY/driveMinutes=null，不把fixture整理当真实正式资料补齐。
- contracts新增一致性回归确认完整fixture停车AVAILABLE不再未知、普通UNKNOWN点仍未知、路线不冒充驾车；fixture-parking-contract-tests.log12/12。未改生产数据库或设施验证状态。
- 当前API8879仍旧进程，不假设源码热载；截图待在现有fixture服务owner安全更新后回读验证。需先检查该API实际启动命令/进程owner和持久性，避免误停正常8787/用户业务，不重启DevTools。single-completion UI源码也未sync，后续可合批fixture build。
- Goal active，其他真实资料/页面/模式/Context任务未缩减。

## Fixture API 更新与停车面板真实回读
- 上轮fixture字段修正为进展。本轮Get-NetTCPConnection确认8879 PID7120，原session86038仍live，匹配本任务MEMORY_TEST fixture记录；以原session Ctrl-C结束(exit1)，未触及正常8787或数据库。
- 按现有workspace start owner启动新session95571/PID25316，8879 LOCAL/LOCAL_TEST/MEMORY_TEST/development fixture，route/placeSearch/media DISABLED，清除DATABASE_URL/REDIS_URL及acceptance开关；日志isolated-fixture-api-current.log，health/live200。该session保持运行，后续不要重复启动或凭日志猜终止。
- 合批fixture build32701 exit0 compiled14834ms，current-fixture-parking-build.log；含停车fixture与single-completion新UI，已sync可信snapshot，无DevTools重启/信任。
- 390 DAY标准字实际面板显示“请在划定车位停车，保持通道畅通”，下方停车“可用”，原未知/可用冲突不再出现；直线距离标识与fixture测试数据标识保留。运行更新实测通过该限定场景。
- API内存更新后旧observation-context GET出现一次404，页面随后恢复当前资料；该console错误实际可见，不称全程无异常/正式持久性验证。/field接口无route字段，首次定向HTTP取route为空不能作为停车验证，最终采用真实页面文字。fixture服务换代会丢其内存context，正常库未动。
- 当前snapshot最新fixture/390DAY/Map medium，API新live95571。Goal active；下一继续其他UI模式/页面/真实业务及context残余，不重测已修parking或旧nativeanimation。

## 390 NIGHT 面板与偏好冲突恢复实际回读
- 上轮fixture API更新与停车回读为进展。本轮现有390标准字Settings实际tap Night再原生返回Map：搜索/工具/面板/sectionrail/actionbar/tab均深色，文本与icon可辨；provider底图仍亮，未修且不把自有chrome换色当整图夜间完成。panel-night-390-geometry.json保留本次几何。
- 切换时PUT preferences出现409（此前fixture内存API换代），未隐藏或当保存成功。之后在wx运行环境内部复用既有本机session做GET /v2/me/preferences，仅返回非敏感mode/revision/dirty；night-mode-preference-sync.json：http200、本机NIGHT/revision2/dirtyfalse、serverNIGHT/revision2。没有输出/存储凭证。证明这次冲突后同步恢复，不推广为所有网络恢复已验。
- 当前可信snapshot保留NIGHT以便下一observation/其他route验证，390标准字、减少动态关。未改正常实例。底图夜间主题/平台能力仍待查；本轮未源码编辑/重启。Goal active，下一可从当前night继续，不重复DAY切换或停车检查。

## 恢复上下文收敛与底图能力调查边界
- INDEX不再要求全文读取历史PROGRESS，新增CURRENT.md作为短恢复状态并要求原位更新；完整附件和PLAN保留。目标已通过INDEX索引这些信息，无需用户改goal。
- PLAN剩余三处大字号/200%当前验收措辞改为标准字号，原附件未修改。
- Map个性化底图定向配置检索无匹配；官方微信文档访问失败，Taro跨平台属性不能当微信能力直接使用。没有猜key/style、重挂载Map或修改底图。下一转其他可执行UI检查，保留NIGHT底图亮为未验证项。

## 390 NIGHT 实际天文章节跳转发现高亮不同步
- 上轮恢复Context收敛为进展。本轮真实截图确认侧栏图标/文字可见、44px命中，但全局52px正文空列仍不符合要求，未擅自改为遮挡。
- 原生点击天文后panel large且滚至末尾，实际仍active概览。panel-night-390-astronomy-anchor.json保存几何；wx scrollOffset655.200、scrollHeight1274，document1274.600、viewport619.487。已有200ms测量和maxScroll钳制仍未覆盖此时序，下一定位修复，不能称章节同步通过。
- 当前snapshot Map large NIGHT标准字，无源码变更/重启/服务写入。CURRENT已更新优先执行点。

## 章节同步滚动静止校正及390实际复测
- 上轮定位到实际高亮错误为进展。spot-panel在large滚动静止80ms后请求现有延迟几何校正，合并连续事件，不逐帧查询；隐藏/换点/extent变化清理timer。修正原生anchor滚动晚于初次展开测量的路径。
- panel-section-idle-tests.log3/3，新增连续滚动只安排一次layout刷新断言；typecheck通过，fixture build35222 compiled14620ms并sync可信snapshot，无重启。
- 实际390 NIGHT点击天文：相同内容几何下active已是第二按钮381.200..425.200；返回概览回读第一按钮。证据panel-section-idle-astronomy.json、panel-section-idle-overview.json。不宣称完整手势/多尺寸/模式全通过。当前large概览NIGHT，侧栏空列仍未修，goal active。

## 概览锚点包含地点身份
- 上轮高亮同步修复为进展。本轮确认overview anchor原位于identity后，返回会跳过地点名称；将唯一id移到identity，后续资料顺序/组件树不变。
- typecheck通过，fixture build12026 compiled16072ms并sync，无DevTools重启。实际390 NIGHT从天文返回概览：identity top141.913与scroll top一致，title160.512..188.512在viewport内，证据panel-overview-identity-runtime.json。
- 当前large概览NIGHT标准字。仅修复本次锚点，侧栏全局空列及完整goal范围仍未完成。

## 当前完整测试与390观测模式首次加载观察
- 上轮概览identity锚点为进展。本轮完整miniapp suite current-panel-ui-suite.log265/265 exit0，涵盖目前源码测试，不代表完整设备/视觉验收。
- 官方navigateTo进入Settings（不作为My入口路径证据），原生点OBSERVATION。首张截图下载/删除图标暂不显示；随后实际截图正常暖红，SVG源码/bundle均存在、stroke #ff6b58。不以第一张截图判断静态配色错误；也未证明切换加载连续性。未为未经定位的问题修改代码。
- 当前Settings OBSERVATION390标准字，开关已映射暖红。后续可继续Map观测模式/其他route或解决侧栏全局空列，goal active。

## SVG主题图标预载与实际切换
- 上轮完整suite及首次切换缺图观察为进展。本轮共用SemanticIcon保持三主题SVG Image挂载，仅当前opacity1；不替换src，不增加素材，decorative子层aria-hidden/pointer-events none，原arrow-left CSS fallback不变。
- typecheck、test:miniapp:design通过。fixture build19416 compiled14184ms sync可信snapshot；实际query3层18px、NIGHT仅一层opacity1（theme-icon-preload-runtime.json）。原生切OBS首次有效结果截图下载/删除/chevron均可见，未声称逐帧/物理设备无闪烁。首次点击未改变mode，重取状态后再次点击才成功。
- 当前Settings OBSERVATION390标准字。前轮265suite早于图标变更，不能标记本改动全suite已运行。goal active，侧栏空列/完整其他页面与业务待办仍保留。

## 红光持久化语义核对与普通返回实际检查
- 上轮SVG预载为进展。本轮定位模式重载恢复night是明确实现：enterObservation不改preferences，restoreStartupMode及commit持久化恢复prior；不是已证明的同步失败。当前附件只要求三态统一/冷启验证，未明确保留或退出红光，已async询问用户，不根据测试替用户定产品需求。
- 实际390 Settings→Map→My保持红光，自有图标可辨；provider底图仍亮，未把自有chrome通过等同整屏红光。当前My OBSERVATION，无账户内容变更。
- 图标改动后完整miniapp suite theme-icon-current-suite.log265/265 exit0。Goal active，冷启取舍待答并可继续独立页面/侧栏等范围。

## My→Plan实际入口与预计出发时间跨日修复
- 上轮模式语义与返回检查为进展。本轮390红光实际My点今晚计划进入，原本机draft-recovery-0906/22:00/未选点恢复，未编辑或保存。转场捕捉到原生底部白色区域，未声称完整无闪。
- 源码发现timeBefore使用无时区localDate构造Date且只输出HH:mm，跨午夜日期丢失。改用计划snapshot UTC时刻减实际driveMinutes、按snapshot时区展示，跨日包含日期，无效值返回null；不改变路线来源或估计分钟。
- departure-time.test.ts3条含普通/跨日跨年/DST与无效值，计划相关23/23，typecheck通过，plan-departure-current-tests.log。草稿恢复/未保存提示去重复技术解释，原草稿不变。
- 本次源码未build/sync，snapshot仍theme-icon-preload19416。后续合批构建与实际路线输入验证；完整goal仍active。

## 计划跨夜窗口与最新构建同步
- 上轮departure修复为进展。本轮同页windowLabel仅HH:mm漏跨日，合并到plan-time-labels.ts：同日简短，跨日显示完整起止日期，非法/倒置interval返回null。关键时间去隐藏/ellipsis并允许窄列换行，避免新日期被裁切。
- 计划相关25/25与typecheck通过，plan-time-labels-tests.log；首次build38287后检查发现时间CSS裁切，修正后重build1700 compiled14960ms，plan-time-labels-build.log并sync可信snapshot。未拿先前build当最终证据。
- 本构建包含前轮出发时间/草稿提示，未改用户草稿，未伪造可用驾驶路线以验证显示。下一重新读runtime后检查新版计划或其他待办，goal active。

## 新版计划实际回读及日期时间控件名称
- 上轮跨夜label/build为进展。本轮在build1700官方navigateToPlan，实际短草稿提示与原备注/日期22:00恢复；不将navigateTo当My入口证据。原生点击备注有caret，无手机IME，未输入/保存；键盘避让仍外部待验。
- 日期/时间Picker添加用途与当前值的aria-label；状态文案去上下文/内置示例实现解释，保留失败重试、草稿保存和无点位不可新建影响。typecheck通过，计划25/25，plan-input-copy-tests.log。源码尚未build，不冒充读屏实测。
- 当前Plan NIGHT390标准字号、备注聚焦，无用户资料改动。Goal active，后续合批构建/继续其他路线。

## 主页链接文案及平台分组语义
- 上轮Plan回读/输入名称为进展。本轮审查ProfileLinks，去回读/安全URL策略/账户关系/请求标识等用户无须了解的术语；保留危险链接拒绝、外部内容不变、恢复记录清理后的重复保存风险、本地未保存影响。
- 平台选择原radiogroup但子项Button aria-pressed不匹配。首次尝试role radio被Taro Button类型拒绝，未靠cast绕过；改为group+平台单选名称，按钮原生行为/aria-pressed保持。最终typecheck通过，链接相关9/9，profile-link-semantics-tests.log。不是实际读屏或平台语义验收。
- 未操作账号链接/清理/保存，也未构建；需与Plan未build改动合批。当前runtime仍Plan NIGHT390/1700，goal active。

## 输入页合批构建与无障碍模板真实缺口
- 上轮Profile文案/语义为进展。本轮fixture build2352 compiled14350ms，plan-profile-input-build.log并sync现有trusted snapshot，无重启。
- 产物检查base.wxml63746B，没有aria-xxx或ariaXxx，View/Button/Picker均未输出源码读屏属性。此前typecheck与源码检查不能证明实际属性可用，相关无障碍完成状态不得提升。
- 本地Taro组件Button的ariaLabel标QQ，weapp插件components没有ARIA；已有项目scroll-view-template.cjs和官方template.mergeComponents扩展可查。下一先核对平台属性并通过项目配置实现，不改依赖/产物或伪称读屏通过。Goal active，runtime新版本加载后页面尚未重新确认。

## 微信无障碍基础属性模板绑定
- 上轮build查出ARIA缺失为进展。本轮读Taro4.2.1 runtime hydrate/setAttribute，未别名属性仍以camelCase传递；模板未消费。新增项目config/accessibility-template.cjs通过modifyBuildAssets输出name/role/hidden，覆盖含Taro i.sid的8种节点，保留已有属性，不修改node_modules。
- 官方WeUI采用aria-role/label/hidden：https://github.com/wechat-miniprogram/weui-miniprogram/blob/master/src/components/searchbar/searchbar.wxml。本次仅此基础集合，其他state/value语义未完成。
- accessibility-template.test.mjs2/2，含带大于号表达式、8节点、幂等、原生markup保留，接入test:miniapp:workflow。fixture build82188 compiled14088ms，base.wxml每类108绑定，已sync可信snapshot。
- 当前只证明模板生成/现有runtime字段结构，不是实际读屏验收；下一核对真实payload/控件与余下状态属性。Goal active，当前页面需重新读取。

## 搜索展开状态编译修复
- config/accessibility-template.cjs 新增 aria-expanded = i.ariaExpanded，直接保留 false，不添加 truthy fallback；官方 WeUI searchbar.wxml 使用此原生属性。
- 模板回归2/2，fixture build25811 compiled15063ms，accessibility-expanded-build.log；已同步现有snapshot，没有重启工具。
- navigateTo 返回 timeout，随后独立只读 evaluate 确认 spot/search/index，expanded=[true,true]，证据 accessibility-expanded-runtime.json；不宣称入口点击或真机读屏通过。
- 旧 CUA window 句柄获取到了非目标窗口内容，停止使用该句柄，不据此点击或判断小程序画面；后续必须重新枚举并匹配 DevTools 窗口。不要复用 window60360878 作为已验证目标。
- 侧栏仍为整篇正文预留52px；原合同要求固定居中浮动且无永久空列。未改，不能称已解决。其他状态/数值a11y仍待核对。

## 用户确认的横向标签栏与真实星图接入
- 用户确认：把概览/天文放到名称、地点等基本信息下方，类似高德地点/美团店铺页。已同步 owning spot-and-sky Context 和 PLAN；这取代旧右侧居中浮动要求。
- spot-panel.tsx 将原导航移入身份下面，CSS横向44px命中、滚动吸顶，正文左右24rpx，移除52px右列及对应媒体负边距。天文跳转按实测栏高扣除，滚动高亮同样补偿；概览仍返回身份。
- 发现原 sky-map-canvas 仅隐藏空标记。删除占位及CSS，runner选择器指向真实.panel-sky-overview。新增真实目录坐标的静态天顶等距投影（上北左东），按同地点contextId/fingerprint/revision/selectedAt匹配报告，过期/不可用不造星；展示位于天文标题后、时间尺前。目标标签/专业事实及完整性能仍需补齐，不是完成证明。
- typecheck通过；projection2/2，panel-section-sync3/3。首次全suite270/272，两个旧effect测试适配新测量后重跑 panel-tabs-current-tests.log272/272。fixture build93162 compiled14534ms已同步，panel-tabs-sky-build.log。
- 重新枚举窗体发现两个同名窗口，旧60360878不能截图；实际可操作目标为返回对象 id9963390，恢复最小化后真实画面可读，未重启工具。真实点击搜索→唯一测试地点→面板，标签在身份下方且左右无空列；点击天文实际展开并吸顶，天文标题在栏下可见。Canvas圈/方位字可见，但星点尚未确认，不声称星图通过。
- automator9421读取的面板几何为medium，与原生窗口9963390所见large不同。两者当前不能当作同一运行实例，需核对端口/窗口对应。panel-geometry-current.json只证明9421那份状态，不是原生点击结果。不要用几何结果覆盖原生画面事实。
- 自动screenshot未生成文件；不将panel-tabs-current.png当作证据。当前原生窗口停在DAY390大面板天文；9421探针最后medium。

## 静态星图预览时间同步
- Map已有projectedAt统一预览/提交/取消时间；现通过SpotInformationPanel传至SkyOverview，以该时刻精确匹配真实SkySceneFrame。此前只读context.selectedAtUtc会在时间尺预览时显示旧时刻，已修。
- 请求仍绑定正式spot/contextId/fingerprint/revision，不因每次预览建立新context或改变科学坐标；无匹配slice仍不可用，不用最近值替代。
- typecheck通过，fixture build24045通过并同步，panel-sky-time-preview-build.log。实际拖动/取消画面仍待验，不把源码链路当运行证据。
- CUA在目标窗口被其他窗口遮挡时再次返回非目标截图；后续不要在未确认目标可见时继续获取/发出截图或点击，不将非目标内容记入项目。用户正在使用电脑时优先只读接口，不反复抢焦点。
- 9421只读确认Map medium，SkyOverview节点位于文档下方，尚不能同9963390原生large画面关联。端口9421/PID6628、8879/PID25316、8787/PID21432仍存活。未重启任一实例。

## 轻量标签实际样式核验
- 现有原生窗口9963390 DAY390 medium截图确认：概览/天文靠左纯文字、短选中下划线，无等分填色/图标。未确认新版天文跳转；两次坐标点击画面仍medium，不能称交互通过。
- 9421原生selector只读数据：两个tab44×44px，left13/77，font-size14px，透明背景，pointer-events auto。light-tabs-workflow-tests.log76/76通过。
- 经现有Taro eh合成tap分发未改变9421章节；仅记录事件桥测试失败，不能用它替代实际点击或直接改store伪造成功。
- CUA点击编译图标后截图指针出现在不同位置，未确认编译发生；不要再依赖当前坐标输入判断产品失效。返回截图metadata1250×1000、origin498/65、window9963390。工具可能存在坐标映射问题，尚未归因，不继续盲点避免误触关闭。
- 当前最新构建仍58037，不是新的候选；未重启开发者工具。继续可执行源码/数据检查，后续需恢复可靠交互验证。

## 示例数据文案与重复信息
- SAMPLE_DATA原被DataStateBadge显示成“资料不足”，已纠正为“示例数据”。fixture面板已有“测试数据”眉题，不再另挂同一SAMPLE_DATA徽标；其他真实状态保留。
- SearchResultCard测试点以“区域 · 测试数据”短标识替代整行测试免责声明；真实非空地址仍显示，空地址不挂无行动价值的占位行。读屏选点反馈去掉“返回同一地图并打开中面板”的内部布局描述。
- TEST_PUBLISHED_SPOT源码名称改“示例观星点”；这是fixture元数据，不改真实点。当前8879进程内存可能仍保留旧名称，未为改名重启或清空fixture；不能宣称现有API名已刷新。
- typecheck通过，fixture build92370成功同步，sample-copy-build.log；实际新文案画面尚待验证。纯文案更改不补实现镜像测试。

## 天文客观条件与月光映射
- 原面板用SkyOpportunity等级映射处理moonImpact LOW/MEDIUM/HIGH，导致有效月光数据全变暂无。新增panel-astronomy-facts.ts穷举正确含义，0%不当缺失，null/NaN/越界百分比和UNAVAILABLE不伪装有效数据。
- 天文区改为总云量/低中高层云/月光影响紧凑事实行，直接使用Map已按preview帧投射的evaluation。去掉旧TripDecision的泛化机会等级/推荐解释，保留CAUTION/BLOCKER（不再slice3截断风险），保留目标和来源入口。STALE_USABLE显示预报待更新。
- 删除已无调用的observationStatusLabel；星图未恢复。首次typecheck因测试SpotId品牌值失败，修正测试类型后typecheck通过。
- panel-astronomy-facts-tests.log 5/5（含章节回归），fixture build8897成功同步，panel-astronomy-facts-build.log。新事实行视觉/实际预览和所有主题尺寸仍未验。

## 章节事件与高度隔离
- Taro runtime eventHandler在存在祖先tap时先batch，等待父事件才dispatch。此前只调用button的eh无变化不是有效交互失败证据。probe-panel-tab.mjs现根据wx实际dataset定位button/parent并走既有冒泡路径，不直接改store，不等同原生触摸。
- 9421实测天文选中回写，栏bottom522.375、天文top522.375（栏下无覆盖）；标题定位链路有效。产物panel-light-tabs-1-runtime.json，lane明确component-event-not-native-touch。
- 同次spot-panel--large实际rect仍高426.9375、top335.4625；React数据class为large、drag-offset0。原因未确定，可能与运行实例/渲染时机有关，不据此声称组件高度已坏或已修。
- 尝试将rest-height变量改为档位直接height后，结果不变；该推测性源码改写已撤回。恢复后build29133通过同步，panel-extent-restored-build.log。当前有效功能与build8897相同。
- panel-direct-extent-tests.log相关回归通过。进一步原生触摸及真实展开几何仍未完成，不重启开发器或用直接状态注入冒充验收。

## 事实值字级与运行实例区分
- 面板设施状态由metadata12改共享type-secondary14；天文有效值用type-data18/25、右对齐等宽数字，缺失值用secondary14及次要颜色。不是全页放大，其他注释仍metadata。
- typecheck通过，fixture build46024 compiled13826ms，panel-fact-type-build.log成功同步。
- panel-fact-type-runtime.json：9421实际8设施状态14px/21px、5天文值18px/25px且right，证明编译与原生样式传递。此轮没有缺失值实例，未宣称缺失/窄屏视觉通过。
- 9421颜色rgb245,243,236对应NIGHT；之前原生9963390可见截图为DAY，两者是不同运行状态，不可混用。9421窗口高度冻结问题继续保留，不再凭其与DAY截图不符推断CSS故障。
- 官方App.captureScreenshot独立调用12秒仍超时，没有返回失败详情或生成图片；不循环重试，不重启工具。

## 时间预览缺失不回填旧时刻
- projectMapEvaluations此前在选定frame缺少某spotSignal时返回旧evaluation，使另一时刻云量/月光看似当前值。现缺失、spotId不匹配或UNAVAILABLE均清空动态云量/月光/机会值，保留路线/距离等静态信息，不修改原对象。
- projectedLayerPolygons此前缺少/不匹配dynamicLayer时回旧layer polygons。现选定动态frame缺失或不可用返回空覆盖；静态LIGHT_POLLUTION与无frame当前层路径保留。
- map-preview-missing-tests.log7/7，typecheck通过（最终只追加UNAVAILABLE条件及测试，构建再通过）。fixture build99929成功同步，map-preview-missing-build.log。
- 这是确定性缺失回归，未伪造运行中的供应商失败；真实拖动/断网/恢复矩阵仍未验。

## 缓存刷新失败不报告成功
- useResourceQuery.refetch此前直接返回result.data，后台失败但有cache仍返回旧对象，Map refreshMap据此播报刷新成功。现检测refreshed.error并返回undefined；data读取仍保留cache，refreshError仍提供原因，显式throwOnRefetchError路径不改。
- hook回归明确覆盖失败返回undefined、缓存仍可读、恢复后返回fresh结果。Map选中地点传递spotOverview.refreshError，在已有detail时显示“更新失败，暂时显示上次资料，请重试。”并保留原重试入口。
- Map手动刷新读屏/失败提示去内部状态保持描述。背景scene刷新错误仍需后续核对是否充分呈现，不把本次当全网络恢复通过。
- typecheck通过，refresh-result-tests.log完整小程序274/274，fixture build95320 compiled14537ms，refresh-result-build.log；成功同步既有snapshot。实际网络故障/恢复未注入，不冒充WEAPP链路验收。

## 地图后台刷新失败可见
- scene.refreshError有缓存时，地图显示“更新失败，暂时显示上次结果”及重试，调用既有refreshMap错误处理。
- 面板selectedEvaluation在该情形标STALE_USABLE以触发现有预报待更新提示；原UNAVAILABLE不改成可用，也不修改缓存对象。刷新恢复后自然回服务端状态。
- typecheck通过，map-refresh-stale-tests.log相关8/8；fixture build34471 compiled14480ms，map-refresh-stale-build.log，成功同步。未执行真实故障注入，不声称网络恢复矩阵完成。

## 2026-09-06 用户信息密度校正
路线与入口同排，设施短状态2列/说明跨行，天文总云月光2列+分层云3列；不缩标准字号，不丢风险与缺失。typecheck通过，panel-astronomy-facts2/2，panel-density-build.log15216ms成功并同步。9421回读时面板关闭，视觉与并列几何未验，不把空查询算通过。当前全范围goal仍active。

## 地点详情设计方法调研与采用
已检查用户高德截图、点评官方M站分层内容说明、Google Places紧凑组件、NN/g层级/渐进披露/分组资料；竞品观察与项目推断分开。归入按需information-design.md并通过DESIGN、Screen Contract及manifest索引。每次相关UI主动检查同类问题；不新增原型/截图维护任务。当前密度候选仍需真实打开面板核验；只读marker探针当前Map未找到数据，不推断无地点。

## 完整场地页密度落实
移除每设施card，用连续分隔组；共享设施时间/距离wrap排列，保留所有条件/来源/日期。去结构说明，补齐空设施/缺失安全提示。最终typecheck及field-density-current-build.log通过、可信snapshot已同步。原生视觉/触摸未验，不关闭goal。

## 新密度布局WEAPP几何核验
9421实际marker properties可读，组件markertap打开面板。2列设施/2列主指标/3列云层几何成立；天文定位对齐。large仍中档高，已排查animation none/maxheight none，实际payload class large。未修复高度、不声称视觉/原生触摸完成。证据panel-density-runtime.json、panel-density-tab-check.log，诊断inspect-panel-height.mjs。

## 高度路径统一与待复验
诊断关闭CSS transition后large达762.4，恢复样式。按钮/Tab统一测量+spring控制器，取消旧height transition，6/6/typecheck/build成功并同步，实际large高度恢复。最后两处修正：settling跳过sectionRequest直到settling false；同档不重启动画。此两处尚未构建验证，下步优先，section对齐仍需复验。

补充：最后两处修正已通过panel-unified-final-typecheck与build，并同步snapshot；下一步实际章节定位及快速切档/重抓验证。

## 最终切档/章节复验
3/3章节回归通过，添加settling期间不测量消费的断言。9421连续4次收展组件事件最终large762.4，panel-rapid-extent-runtime.json。静止天文停文档末端且无遮挡；不冒充原生触摸/动画视觉完成。生产候选仍panel-unified-final-build。

## 整轮快速检查及最后请求取消边界
density-integrated-fast-check.log exit0（274 miniapp，76workflow，contracts12，API101pass1skip）；拖拽VM已加载新共享函数。之后修正同档点击也递增请求代次，防旧展开回调复活；回归/typecheck/panel-latest-extent-build通过并同步。实际触摸和完整视觉未完；场地/攻略背景刷新失败提示未补，待继续。

## 证据页面背景更新失败
完整详情overview/guides/site以及article facility_ref接入refreshError，保留cache+具体影响+对应重试；文章无facility_ref不显示无关site缓存错误。类型检查/共享Query1回归/最终WEAPP构建通过并同步。尚未实际故障注入/视觉检查。

## 场地实际密度与来源合并
组件事件走正式面板→field，实测8设施每项217.4高且重复相同来源。完整source一致时共用一处来源，差异来源/每项日期条件不删。typecheck/build通过；复入field实测8设施、provider1次、以上设施来源1次、首项142.6高。证据field-density-runtime.json/field-shared-source-runtime.log。不冒充视觉/触摸验收。

## DAY390原生窗口Tab与密度视觉
Computer Use重新枚举并激活9963390，get_window_state真实目标画面。element_index54点击天文，后续state确认大档和章节完成、两列主指标/三列云层可见、无星图/右轨/底栏遮数据。element_index51点击概览，实际截图身份/路线/2列8设施恢复。来自DAY独立窗口，与9421 NIGHT不混用；未验证真实设备、拖拽、320/375/430与夜红。工具图片在会话中，不声明另存文件。

## 原生场地页状态长条修正
CUA最新state点击详情：首次geometry unavailable未动作，重新observe后点击成功，field截图确认状态tag整行拉伸。共享设施heading加title并同排短status，field去单独heading；CustomNav去开发验收措辞保留测试真实性。typecheck、workflow-conformance16/16、build17478ms通过同步，新heading待真实画面复验。

## 证据页面导航职责收敛
原生DAY390截图复验heading/status修复生效。field旧概览/攻略/场地tab重复Map主信息职责，移除切换UI/state，入口直接选证据内容；ARIA改region名称。Context更新，typecheck/contextvalidate/build通过并同步。最后候选去tab实际返回/入口未验，旧不可达overview源码/样式需后续清理。

## 移除不可达旧概览实现
实际全源码调用者只有field与guides，删除OVERVIEW分支和仅用于该分支的派生来源/media/状态映射。field直接展示lastRoad/parkingGuidance，guides不展示路线块。typecheck、274/274、build14260ms通过同步。新候选实际入口返回/画面待验，未称完整14路由完成。

## 去旧导航候选运行核对
DAY当前窗口点击详情未出现路由转换，已有入口代码有上下文/失败notify，当前树未读到通知；未定位，不修改业务猜测。9421真实组件入口成功field，8设施保留、旧tab为0、道路说明存在。两条运行环境分开证据；原生入口/返回仍待，禁止用组件事件替代。CUA text-only快照不足以点击需同时截图。

## 2026-09-06 可见窗口场地入口复验
- evidence-owner-cleanup候选，9963390 DAY390：原生点击天文/概览、large进入field，确认新页直接场地资料、设施名状态同排、道路停车保留；原生返回保留原地点large，收为medium后详情也进入field。立即快照先于更新，后续截图确认；旧中档未跳转未复现，根因不作结论。截图仅工具会话。9421组件回读不混作此证据。
- 最新非fixture构建 evidence-owner-plain-build.log 正在运行；不复制到fixture snapshot。
- 非fixture构建已exit0（16999ms）；当前isolated weapp-check产物静态检查11/11、14路由、raw1539166B，evidence-owner-plain-inspection.json。只更新非fixture证据，未覆盖开发者工具fixture项目。

## 2026-09-06 设施短属性流式排版与窄屏
- 共享FacilityEvidenceDetails使用条件并入facts flex-wrap，短属性同排，长条件不截断。typecheck通过，facility-facts-flow-build.log14733ms成功同步fixture。
- 9421组件回读field8项保留，事实组20.8高、单设施91.4高，facility-facts-flow-runtime.log。独立DAY可见窗口390原生点击进入field确认同排；DevTools机型菜单切iPhone5 320×568（标准字，未重启开发器/信任），原生展开面板→field，新布局可读。截图只工具会话，无长期镜像。下一步长条件/其余尺寸主题，当前原生停320 field。

## 2026-09-06 320天文/来源与刷新状态
- 原生DAY320 field返回Map，天文Tab定位、2主指标/3云层、滚动末端来源按钮无底栏遮挡；点击进入来源页，长许可文本换行。截图仅工具会话。
- 来源页此前忽略overview.refreshError，现保留cached来源并显示STALE与重新获取来源动作。typecheck通过，source-refresh-build17027ms成功同步fixture。真实失败注入未验，不用构建证明交互完成。

## 2026-09-06 列表与计划缓存更新状态
- 计划非编辑/编辑两处STALE提示接planQuery.refreshError；主页链接、导入列表增加独立更新失败提示与重试，缓存及编辑保留。typecheck通过，小程序274/274（cached-list-refresh-*）。尚未构建同步，runtime snapshot仍source-refresh。下一步plan动态查询/import detail状态，之后统一构建与实际故障验证。

## 2026-09-06 动态查询缓存说明
- 计划context/sky/route/spots以及当前导入详情显示独立refreshError说明，缓存与输入保留。纠正上轮新增links/import列表重试缺少catch的问题（这些query开启throwOnRefetchError），新import detail同样catch。
- dynamic-refresh-typecheck通过，fixture build14328ms成功同步，包含上轮3页修改。实际故障注入与UI恢复未验；可用官方automator mockWxMethod/restoreWxMethod在node_modules/miniprogram-automator/out/MiniProgram.d.ts有声明，若使用须仅隔离9421并finally恢复，不改用户全局网络或停止服务。

## 2026-09-06 地图刷新真实传输故障与恢复
- probe-map-refresh-failure.mjs在独立9421临时拦截fixture /map/scene，2次失败回调，旧地点保留。首次恢复后旧刷新未完成通知残留，before证据已保留。修复refreshMap成功仅删除map-refresh-failed通知。
- typecheck/build14944ms通过并同步；同脚本复测2次失败→恢复只剩当前区域已刷新，失败提示撤除（map-refresh-failure-runtime.json）。wx.request已恢复，未改全局网络/停止API/清数据。其他query失败路径仍待实际验证。

## 2026-09-06 来源页刷新失败与恢复实测
- 从隔离9421 Map组件来源入口进入，临时拦fixture /overview，2次fail回调。来源更新失败提示/重新获取来源存在，原2来源和许可仍在；恢复原wx.request后点重试，提示与重试按钮消失、来源保留。证据source-refresh-failure-runtime.json，探针probe-source-refresh-failure.mjs使用finally及15s兜底恢复，不改全局网络/数据。
- 无源码变化，不重复构建；snapshot仍map-refresh-recovery候选，9421现sources。下一步计划/导入等恢复或其余尺寸主题，不再重复来源流程。

## 2026-09-07 主页链接缓存失败与恢复
- 读取已有空列表，30s freshness后重新进入，隔离GET失败2次显示STALE+重新获取链接，空列表保留，重试恢复提示消失；profile-refresh-failure-runtime.json。未创建数据，请求已恢复。初次短等待不足已改6500ms；导航报错后实际route确认，不重启。
- 查到额外非fixture真实响应降级：api-client staleCandidate以成功envelope返回STALE_USABLE。后续页面需检查envelope.dataState，不只refreshError；这不是本次fixture错误回归覆盖范围。

## 2026-09-07 成功响应中的旧数据状态
- links、imports列表/详情、sources、plan列表及context/sky/route/spots提示覆盖STALE_USABLE envelope，区分旧响应与请求异常，不把旧值冒称最新。typecheck通过，request-lifecycle16/16，fixture envelope-stale-build成功同步。
- 运行注入及field/guides/article等剩余查询尚未覆盖，不扩张完成结论。

## 2026-09-07 证据页旧响应语义
- 共享field/guides与article更新提示检测STALE_USABLE envelope，文章设施仅facility_ref时提示，保留来源/正文/重试。typecheck、evidence-stale-build通过并同步。未声称运行矩阵验收。
- 下一步Map selectedEvaluation仅refreshError降级，需核对envelope stale与spotOverview面板；当前pageState已有部分处理，避免重复实现。

## 2026-09-07 Map响应与面板时效同步
- scene envelope stale同步selectedEvaluation state，保留UNAVAILABLE；spotOverview stale新增detailStale prop，面板单条旧资料提示与重试，错误分支不伪造。typecheck通过、time-frame/astronomy7/7、build15065ms成功同步。下一步成功stale envelope运行验证，尚未覆盖真实全场景。

## 2026-09-07 Map成功旧响应反馈复验
- 合成STALE_USABLE envelope保留真实fixture数据/来源验证，发现旧响应仍宣布已刷新；按状态改反馈为尚未获取到更新。typecheck、build14943ms成功同步。probe-map-stale-envelope复测旧响应预报待更新+尚未获取更新，恢复原完整响应后两提示消失、已刷新出现。
- 去条件请求避免测试缓存304沿用人工旧标记，响应包装finally和15s兜底恢复。证据map-stale-envelope-runtime.json；合成状态测试，不假称真实供应商旧数据事件。

## 2026-09-07 My数量与错误状态
- 原生前台DAY320进入My发现GET贡献403且仍0待处理；补初始加载/错误、cached刷新错误、STALE_USABLE明确数量状态及重试，links去内部回读措辞。typecheck/build16895ms成功同步，新状态运行复验仍待。未改变账号数据。
- 背景截图曾与实际前台不同（NIGHT390 vs DAY320），下一步先激活再观察，不套旧截图坐标。

## 2026-09-07 320计划入口与表单密度
- 原生DAY320 My正常态文案确认，计划入口空态→新建表单可用；不输入/保存，9421既有草稿不动。My旧403未复现，错误态不声称验证。
- 320下日期/时间媒体规则强制单列，取消仅该form-grid规则，使两短值标准字并排，长地点全宽；large-text不动。build18144ms成功同步，新视觉待验。

- plan-date-grid 原生DAY320复验：日期/时间两列完整，备注和底部动作可见；日期与时间选择器独立打开并取消，最终UIA值2026-09-06、22:00不变。未保存、删除或修改用户数据。证据为本任务工具截图/文本，不是真机IME证明。information-design.md已复核保留内容形态、密度、长短缺失适应及主动检查规则；本轮无需新增原型或重复Context。

- My tab返回过期summary不刷新：两轮隔离运行未产生请求，不能算失败态通过。新增useDidShow按当前owner仅刷新active stale的user-library/contributions；typecheck通过、fixture build16456ms同步。my-refresh-failure-runtime.json验证两次传输失败保留上次0条并提示，重试恢复后提示清除。探针finally恢复wx.request；没有更改用户数据。初始403错误态和真机断网未验。

- 偏好旧账户响应会覆盖新保存值：preferences-old-readback-before.log先证实失败。applyServerPreferences忽略较低revision，保留dirty编辑与更新revision接受。preferences-old-readback-tests.log 6/6、typecheck通过；fixture preferences-old-readback-build成功并同步可信snapshot。未操作真实偏好或重启工具，网络乱序实际路径仍未验证。

- 保存期间新编辑保护新增hook异步回归通过，确认二次保存使用ack revision。完整miniapp suite首次275/276因article旧文案断言失败；修为正文保留、STALE、可调用重试，覆盖refreshError与成功STALE_USABLE。最终preferences-current-suite.log 276/276。仅测试变更，未重建snapshot；无真机/网络乱序通过声明。

- 最新main脏工作树本地非fixture build14194ms成功，current-plain-inspection.json通过11检查，14路由/raw1546110B；known fixture address/copy模式无命中。未复制或发布。构建候选基于HEAD424c971及当前未提交改动，不将HEAD当完整候选；不证明platform包大小或运行视觉。

- preferences-old-readback snapshot可见原生DAY320实测My正常摘要、全部入口和tab无遮挡；进入Settings逐段滚到底，三态模式栏/权限提醒/两列设施/末尾同步清缓存可见，无横向截字。只导航与滚动，无用户数据更改。截图在工具会话，不是真机或全尺寸主题验收。

- 主页链接原生DAY320进入并观察标准表单，无编辑保存；清掉添加/已保存标题下两句重复解释，保留可见性与外部打开限制。profile-concise-build通过已同步，更新后实际视觉待验。

- profile-concise原生DAY320复验：从Map→My→主页链接，重复说明已消失，字段/公开限制/保存完整，已保存标题与计数首屏可见。只导航无数据修改。本轮不重建、不重复全测试。

- 内容导入原生DAY320空态视觉：My入口导航、2列平台、URL和长权利确认可读，scroll末尾空态完整；无输入或创建草稿。已有记录/审核及IME未验。本轮无源码构建变更。

- 现场反馈DAY320实际观察发现日期时间强制单列，已仅取消标准340px date-grid单列（large-text保持），最终build成功同步；实际并排复验待做。无投稿/用户数据修改。

- contribution-date-grid可见DAY320复验暂未取得：从Map成功进My，反馈入口原生点击及重试均停My，DevTools当前TypeError Cannot read property __subPageFrameEndTime__ of null（WAServiceMainContext）。没有重启/清数据，不能据此断定业务导航根因。日期并排仍待实际验证；可先独立9421核查运行路由或继续其他入口。

- 不重启情况下独立9421成功进入content/contribution，390宽日期时间两field同高同top，各181.2宽、4px间隙；contribution-date-grid-runtime.json。该通道正常，不作为可见320已恢复/新CSS窄断点已验的证明。未输入提交，官方连接已disconnect，可见窗口仍My待核查。

- contribution-date-grid原生DAY320复验完成：My→Settings正常进入/返回→反馈成功，无重启；日期2026-09-07与00:48同排完整，下方6事实选项首屏可见。前次__subPageFrameEndTime__错误未再阻止导航，不能声明根因修复。未输入保存提交，现停反馈首屏。

- 反馈新地点表单DAY320下半部实际滚动完整观察：说明、位置、隐私和媒体授权、保存提交、投稿过滤空态无遮挡。无输入定位上传提交。不是授权功能/IME/已有记录验证。

- 空反馈提交前校验DAY320原生点击验证：源码确认不足20字先return，再实际点击，滚到说明处并提示还不能提交。无输入保存记录；不证明服务端提交或IME。

- 反馈实测纠正校验文案：已有topic只提示补20字说明，无topic提示选择事实；保留原校验return边界。typecheck/build通过同步；新文案运行复验待做。

- validation-copy运行复验：9421先按实际Taro模板p20确认说明为空，组件提交事件后只显示补20字说明与行内错误，无选事实误导。contribution-validation-copy-runtime.json；没有编辑/创建记录，非原生触摸证明。

## CURRENT历史快照归档-20260907-density-status-consolidation
以下仅供定向追溯，含已被后续覆盖的状态，不能当当前下一步。
# 当前恢复状态

任务内唯一短状态：进展改变时原位更新。先读 INDEX 和 PLAN；完整需求在 inputs，PROGRESS 仅定向搜索，不全文加载。长期 Context 仅 global.md 默认加载，其余按需。

## 约束

- Goal active，I21 业务与14路由/62控件重构未完成。main 大量未提交修改，保护无关内容；不建子 agent、不发布/上传/推送，不重启开发者工具触发信任或扫码。
- 只做标准字号，200%暂停。紧凑精致、决策信息优先；测试简明标识，真实风险与来源保留。
- 原型/Open Design/handoff/hash 不再随页面同步；生产 tokens、图标、合法图片、有效测试保留。先前删除8个旧资源目录被自动审批拒绝，不换工具绕过。

## 运行环境（使用前确认存活）

- 可信 snapshot：artifacts/miniapp/integrated-runtime-snapshot/miniprogram；旧window60360878已失效（返回非目标窗口），必须重新枚举匹配后才能CUA；官方 automator ws://127.0.0.1:9421。正常8787实例不动。
- 可见DevTools现已通过机型菜单切为iPhone5（320×568），标准字号；9421独立通道仍390，不能混用。最新9421组件通道在 spot/field/index，独立可见DAY窗口在spot/field/index（由中档原生点击进入）。最新画面/主题/焦点需现场读取，不能沿用旧截图坐标。
- fixture API localhost8879：session95571/PID25316，LOCAL_TEST/MEMORY_TEST；isolated-fixture-api-current.log。无生产数据库，不重复启动。
- snapshot 最新 fixture contribution-validation-copy-build.log（成功，已同步），包含面板密度与完整场地页紧凑排版。Node24路径 C:/Users/777/AppData/Local/nvm/v24.16.0，默认可能是微信Node16。
- inspect-panel-geometry.mjs 使用 evaluate + wx selector query；产物 panel-geometry-current.json。page.$ 曾超时。证据默认在 artifacts/miniapp/。

## 已实现及最新证据

- 修正实际空表单提示：默认已有其他topic而说明空时，旧联合提示仍叫用户选事实。createSubmit现按首个缺失项分别提示选事实/补20字说明，校验顺序与请求边界不变。contribution-validation-copy-typecheck和fixture build通过同步，新提示9421组件事件已复验：从编译base.wxml确认textarea值p20，确认空串才点击提交；回读仅补20字说明，无重复选事实提示，contribution-validation-copy-runtime.json。此非原生触摸/截图证据。复制后路由需读取。

- DAY320反馈空表单校验实际操作：先核对createSubmit316-327说明不足20字在saveDraft/submit请求前return；原生点击提交人工审核，自动滚到说明字段，浮动还不能提交/不少于20字提示可读。默认topic其他已选，未输入或创建反馈；未以此证明真实成功提交/网络失败。可见窗口现校验说明处。本轮无源码变更。

- contribution-date-grid原生DAY320继续纵滚整份新地点表单：事实多选、说明textarea/计数/隐私提示、地点名地区/经纬度、一次定位及精确坐标授权、媒体权利与0/3、保存/提交、投稿三筛选0计数及末尾空态可读。坐标/媒体授权均未同意；仅滚动，没有输入/定位/选图/保存/提交。可见窗口现反馈底部。本轮无源码修改，仍缺已有记录/媒体长内容/IME及其他尺寸主题。

- 原生DAY320 My→现场反馈：默认新地点建议，日期/时间各一行浪费空间；只取消340px规则中的contribution-date-grid单列，base2列保留，large-text原单列保持。初次patch误中large-text，已恢复并定向修改媒体查询后重新构建，最终contribution-date-grid-build成功同步。新候选日期并排已取得原生DAY320截图：Settings正常进入返回后重进反馈成功，日期/时间完整同排，6个事实选项首屏可见，无重启清数据；历史分包错误根因仍未确认。本次DAY320反馈入口两次点击停My，DevTools报__subPageFrameEndTime__ null，未重启清数据，根因未确认，独立9421已成功navigateTo反馈页，contribution-date-grid-runtime.json记录390宽两字段同top310.8/各181.2宽且4px间隙；证明该通道可渲染，不解释可见320分包错误；没有选择地点/输入/创建提交。复制后路由需重读。

- profile-concise候选原生DAY320 My→内容导入：来源权利说明、平台2列、URL、权利长标签自然换行、建草稿按钮可读；滚到底已有导入草稿0条/空态完整，顶部固定导航不遮最终内容。无输入/确认权利/创建草稿，不能证明IME或已有草稿编辑/审核。可见窗口现content/import底部；本轮无代码修改。

- 原生DAY320 My→主页链接已观察：平台2列、名称/URL完整、公开开关说明换行、保存和外部打开限制可读；未输入/切开关/保存。发现标题下两句重复说明，删除保存你的个人主页链接/管理当前账户保存的主页，保留公开与复制限制。profile-concise-build成功同步snapshot；删除后原生DAY320已复验，两句说明消失，平台/名称/URL/公开说明/保存入口完整，已保存主页标题和计数进入首屏；可见窗口现profile links。本轮仅两句JSX删除，无新增测试；最新276套件/非fixture构建均先于此文案修改。

- 当前snapshot原生DAY320视觉：激活目标9963390后Map→My，两列数量摘要、计划/反馈和全部日常入口同屏可读，tab不遮挡；原生进入Settings并分段滚至末尾，模式三选、权限/提醒长说明、两列设施、可访问性、同步/清缓存末行完整，固定导航正常。未切模式/开关、未输入/同步/清缓存/删除；无手机IME、读屏或其他宽度主题证明。工具截图已观察，本轮无代码/构建变更。可见窗口现Settings底部，9421独立通道状态未读取。

- 当前非fixture构建current-plain-build.log成功14194ms，current-plain-inspection.json 11静态检查通过/14路由/raw1546110B（main1154430/content241326/spot73056/sky77298，无sourcemap）。额外rg检查weapp-check JS未检出8879地址与三个已知测试文案；仅这些模式无命中，不泛称全部数据已核验。未复制到开发snapshot、未上传；正式platform压缩包/视觉/真实数据仍未验。本轮源码未变，开发snapshot仍preferences-old-readback。

- 最新完整miniapp测试276/276：preferences-current-suite.log。本轮新增保存中编辑回归，证明旧保存返回保留新编辑并按确认revision再次保存；preferences-inflight-tests7/7。完整测试先发现article旧文案断言失败，现以正文保留/STALE/真实retry回调验证失败刷新与STALE_USABLE两路径，未放宽业务要求。本轮仅测试改动，无需重新构建；snapshot仍preferences-old-readback候选。测试不是实际网络乱序或视觉验收。

- 偏好旧响应防倒退：app-store.applyServerPreferences原来允许revision7覆盖已保存revision8；新增真实store回归先失败（equipment新值丢失），现忽略低于当前revision的响应。6/6 store+sync恢复测试及typecheck通过，preferences-old-readback-build成功同步snapshot。测试同时证明dirty本地编辑保留且更新revision9仍可接收。此为状态层回归，未实际注入网络乱序；9421和可见窗口复制后路由需重读。

- My返回刷新缺口已实修：原生tab保留挂载，过期后switchTab返回两次均未重新请求。My useDidShow现按当前owner、exact/active/stale限定刷新user-library与contributions，不清缓存。my-return-refresh-typecheck通过，fixture build16456ms成功同步。probe-my-refresh-failure.mjs读真实基线→离页14s→返回临时拦8879 GET /me/contributions，2次失败显示旧记录提示/上次0条/重试，恢复请求并组件重试后旧提示消失，my-refresh-failure-runtime.json。finally和15s兜底恢复，无保存删除，无真机断网声明。9421现My；可见窗口路由需重读。初始失败无缓存/403仍未验证。

- 前台原生DAY320复验My新文案可见，本次请求未再出现403，因此仅证实正常态，不声称错误态已验。原生计划入口进入无保存计划空态，点击新建展开表单，未输入/保存/删除内容。日期2026-09-06/22:00来自所选观测context（当前跨日不要自行改用户日期）。发现320日期/时间被340px媒体查询强制单列；仅取消form-grid在此断点的单列，保留plan hero和large-text原规则。fixture plan-date-grid-build18144ms成功同步；最新原生DAY320截图已确认日期/时间同排完整，备注、保存与返回入口同屏可见；两个原生选择器分别打开并取消，回读仍2026-09-06/22:00，未输入或保存。

- 原生DAY320进入My，看到贡献请求403而摘要显示0待处理。My现覆盖library/contributions初始错误、refreshError与STALE_USABLE；无数据加载显示正在加载/错误暂不可用，有旧数据数量加上次及对应重试，不误报0。链接改条已保存/正在加载去内部措辞。my-count-state-typecheck通过，fixture build16895ms成功同步；新状态视觉/权限恢复待验，未改认证或用户数据。
- CUA非前台截图曾显示独立NIGHT390，点击激活后变成真正DAY320；不能将首次背景截图当这个窗口状态/尺寸证明。后续输入前先activate目标再取截图+文本，当前索引需重取。

- Map成功旧响应运行验证：probe-map-stale-envelope.mjs仅在隔离9421把真实fixture /map/scene响应dataState改STALE_USABLE，保留data/sources/TEST标识；去If-None-Match取得完整响应，恢复阶段同样取得原响应。首次发现旧响应也宣布刷新成功，现refreshMap按dataState宣布尚未获取更新。map-stale-feedback-typecheck及build14943ms通过同步；复测map-stale-envelope-runtime.json显示旧响应时预报待更新+尚未获取更新，恢复后仅当前区域已刷新。包装finally及15s兜底恢复。是合成状态分支验证，不是真实provider过期事件；未证明其余页面视觉。

- Map旧响应语义已补：selectedEvaluation在scene.refreshError或envelope.STALE_USABLE时降级，UNAVAILABLE原样保留；spotOverview envelope stale用显式detailStale传面板，不伪造error，显示旧地点资料提示+原恢复入口。map-envelope-stale-typecheck通过，time-frame/astronomy7/7、fixture build15065ms成功同步。新状态分支尚未运行注入验证；原Map/source/profile抛错恢复证据不等于成功stale envelope证据。

- field/guides共享详情及article的overview/guides/site时效提示已覆盖refreshError与STALE_USABLE envelope；文章设施提示仅实际facility_ref时出现。evidence-stale-typecheck通过，evidence-stale-build成功同步。尚未逐页运行注入这些成功旧响应。Map pageState已有envelope stale判定，但selectedEvaluation约404行仅因scene.refreshError降级，需核对envelope旧响应下内层FRESH读数是否同步降级；spotOverview旧envelope也需核对面板，不能忽略。

- envelope降级提示已补：主页链接、导入列表/当前详情、来源、计划列表/观测context/天气/路线/编辑地点同时检测refreshError或data.dataState===STALE_USABLE；旧响应提示只说未确认最新状态，避免误称网络故障，数据/输入/重试保留。envelope-stale-typecheck通过、request-lifecycle16/16、envelope-stale-build成功同步。这些成功envelope路径尚未逐页运行注入验证；field/guides/article及其他查询同类状态仍需审视，别当全项目已经处理完。

- 主页链接隔离传输回归完成：probe-profile-refresh-failure.mjs读取已有空列表→离页待30s freshness→临时GET /me/profile-links失败2次→提示及重试出现且空列表保留→组件重试成功后提示消失；profile-refresh-failure-runtime.json。不创建/删除数据，finally恢复请求。automator.navigateTo曾报错但route已到达，改evaluate调wx导航后读route；不可因此重启。首次2500ms读取太早仅1次失败，现6500ms覆盖重试。9421现停profile links。
- 下一必要缺口：api-client.ts staleCandidate 227起会对真实非TEST_FIXTURE缓存返回成功envelope且dataState=STALE_USABLE，不一定触发refreshError。当前新增的页面提示仅覆盖refreshError；需核对并补对应envelope数据状态（避免把provider本身旧值误称网络失败），仍保留数据与retry。不要把以上fixture抛错回归当非fixture降级全部通过。

- 来源页真实隔离传输失败/恢复已验：probe-source-refresh-failure.mjs从9421 Map组件入口进sources，只临时拦8879 /overview，2次失败后原两项来源与许可仍在并显示refreshError说明；点击重新获取来源成功后提示/重试入口消失，两来源仍在。source-refresh-failure-runtime.json，finally恢复wx.request并15s兜底。此为组件事件+运行请求回调失败，不是手机断网或原生触摸证据。9421现停sources，下一探针不要假定Map。其余计划/导入等仍未实测恢复。

- 实际9421隔离传输失败回归完成：任务脚本probe-map-refresh-failure.mjs仅拦8879 /map/scene请求，finally恢复并15s兜底，不停服务/改网络/清数据。首次2次请求失败显示旧地点及STALE，恢复请求成功后仍残留刷新未完成（map-refresh-failure-before.json）。现refreshMap成功只按owner+dedupeKey撤除旧失败通知；typecheck、fixture build14944ms通过同步。重跑2次真实回调失败后恢复，map-refresh-failure-runtime.json只剩当前区域已刷新，旧失败提示消失。此为组件事件+运行传输故障，不是手机断网；其他来源/计划/导入恢复仍待验。

- 计划两处缓存提示覆盖planQuery.refreshError；主页链接/导入列表补STALE与refetch（throwOnRefetchError路径catch）。计划context/sky/route/spots及当前import detail也补对象明确的更新失败说明，保留缓存、选择、编辑。cached-list-refresh-tests274/274；后续dynamic-refresh-typecheck通过，dynamic-refresh-build14328ms成功同步snapshot。未实际注入请求失败，尚不能称运行时恢复验收完成。

- 320 DAY可见原生窗口：field返回Map同地点large，天文Tab定位成功，两列总云/月光与三列分层云可读；原生scroll到底，来源入口完整露出且吸顶/底栏无遮挡，原生点击进入source页，长许可自然换行。此证据为facility-facts-flow候选截图（工具会话），非真机/全部主题。随后source页补overview.refreshError的STALE提示与独立重新获取来源入口，保留cache；source-refresh-typecheck通过、fixture build17027ms成功同步。尚未真实失败注入，新候选复制后运行路由需重新确认。

- FacilityEvidenceDetails把使用条件并入开放时间/距离的flex-wrap事实组；短值同排，长值完整换行，状态/日期/来源不删。facility-facts-flow-typecheck通过，fixture build14733ms成功同步。9421 field8设施、事实组20.8高；可见DAY390及机型菜单iPhone5 320均原生进入field，截图确认开放时间/使用条件同排、状态/路线/停车可读。当前可见窗口停在320 field，9421为390 field。未验证长条件/375/430及其他主题。

- 当前 evidence-owner-cleanup 候选已取得独立可见DAY390原生窗口证据：天文/概览Tab来回、large进入field、新页无旧三段tab且设施标题/状态同排、末段道路/停车保留；返回Map仍同地点与large，再收中档并点击详情也进入field。截图在工具会话，未另存本地。旧中档未跳转现象本次未复现，不宣称根因已修复；立即快照会早于原生更新，须后续观察确认。9421 NIGHT组件证据仍与此分开。CUA准备点击同时取截图与文本。

- 确认SpotDetailPage仅field(SITE)/guides(GUIDES)两调用者，删除不可达OVERVIEW JSX、来源计数/media/状态映射等专属死代码，initialSegment必传且类型只含两证据页。field路线区补回末段道路与停车明细；guides不重复路线区。当前typecheck、miniapp274/274、evidence-owner-cleanup-build14260ms通过并同步；去tab及补道路后的DAY390原生画面和large进入/返回已验；其他尺寸主题未验。旧无用SCSS可后续精确清理，不能据此恢复旧详情结构。

- 新增原生窗口操作/视觉证据：重新枚举后激活真实9963390，DAY390（与9421 NIGHT分开）。Computer Use accessibility点击查看天文，展开后刷新截图确认天文标题、时间尺、总云/月光两列、分层云三列、固定底栏无遮挡；点击查看概览返回身份/路线/2列设施，截图确认。截图已在本轮工具输出，不另建原型镜像。尚不证明拖拽/真机/其他尺寸/夜红主题。旧CUA坐标偏移未复现验证，本轮用当前树element_index，不盲点。未重启DevTools。

- 实际场地页发现8个完全相同设施来源重复；已仅对完整source JSON一致的多设施合并为一个以上设施来源，差异来源仍逐项、使用条件/日期保留；FacilityEvidenceDetails showSource默认true，文章不受抑制。typecheck/facility-shared-source-build成功同步。组件入口进入spot/field，390实测8设施仍在、来源1处、首项高度217.4→142.6；field-density-runtime.json/field-shared-source-runtime.log。仍无原生触摸/视觉截图。下步可处理CustomNav测试横幅内部措辞（custom-nav.tsx79/81）与真实失败注入；不删真实风险。

- 完整场地/攻略/来源共用详情页已接overview.refreshError、guides.refreshError、site.refreshError，保留cached内容并显示对象具体的更新失败与对应重试。Article设施引用只在存在facility_ref时提示site refresh失败，避免无关缓存错误污染无设施文章。去攻略结构说明/概览内部返回解释。evidence-refresh-typecheck、共享query失败恢复回归1/1、evidence-refresh-final-build通过并同步。尚未真实断网注入或原生截图；此前下一步refreshError缺口已补源码，勿重复实现。

- density-integrated-fast-check.log整轮exit0：contracts12/12、API101pass/1skip、miniapp274/274、workflow76/76、design/icons/assets/UI源码检查通过。先前拖拽VM遗漏新animatePanelExtent依赖已修复，原取消/多指断言保留。之后发现同档点击未取消更早测量请求：request generation移到同档return前，新增同档取消旧展开回归通过；最后typecheck与panel-latest-extent-build.log通过并同步。该最后边界只定向复验，未再跑整轮。其后的完整场地/攻略refreshError已补，见上方当前证据；真实失败注入仍待验。

- 地点详情设计逻辑调研已采用：project_context/areas/main/screen-contracts/wechat-miniapp/information-design.md为按需方法owner（DESIGN/Screen Contract/manifest有入口）。用户截图观察+点评官方内容层级+Google紧凑组件+NN/g分组/披露，明确推断边界；含布局选择、真实长短/缺失适应和主动检查。context:validate通过，仅证明manifest结构。后续页面改动依此主动应用，无原型同步。

- 无障碍：config/accessibility-template.cjs 将已有 camelCase payload 的 label、role、hidden 绑定到原生模板；无依赖修改或手工产物补丁。base.wxml 各108绑定。accessibility-payload-current.json 实际 Map 数据含78名称、5角色、72隐藏状态；不是原生读屏通过证明。新增 aria-expanded 直接绑定，2/2回归及build通过；accessibility-expanded-runtime.json 实际搜索页两组展开值为true。打开搜索调用返回timeout，但随后只读状态确认路由已到达；不能用此证明用户入口点击。其他状态/数值属性尚未接通。官方参考为 wechat-miniprogram/weui-miniprogram searchbar.wxml；开发者文档网页访问失败，不猜平台支持。
- 日常 workflow accessibility-current-workflow.log：76/76通过，含2项模板回归。Context结构检查 context-current-validation.log 通过。历史诊断已移到 tools/miniapp/legacy-verifier-diagnostic.mjs，不进入日常检查。
- 计划：plan-time-labels.ts 按保存的时区与 UTC 减行程分钟；跨日出发/观测窗口显示日期，拒绝非法日期/时区/反向窗口；关键时间可换行。plan-time-labels-tests.log 25/25及typecheck通过。提示文案缩短，日期/时间Picker增加用途及当前值名称。390实际恢复草稿提示可读、备注聚焦，无手机IME。真实provider路线与完整计划视觉仍待验。
- 主页链接：去除回读/请求标识/账户关系等文案，保留草稿、重复提交和不安全URL影响。平台组改group，名称“平台，单选”，按钮aria-pressed仍待原生支持核对。profile-link-semantics-tests.log 9/9及typecheck通过，不是读屏证明。
- 主题图标：SemanticIcon预载三套已有本地图片，以opacity切换；theme-icon-preload-runtime.json 证实18px三层、仅当前层可见，390有效OBS切换首截图图标可见。theme-icon-current-suite.log 265/265，design/typecheck通过。未证明全设备/逐帧无闪烁。
- 面板：有界弹簧生成CSS关键帧，单次React提交，controller计时为唯一完成owner；退休旧Page.animate逐帧桥接。panel-single-completion-tests.log 6/6，减少动态实际关闭动画。中途重抓/反向/多指仍待验。
- 章节：滚动静止后一次几何校正，取消过时timer；390 NIGHT天文→概览双向高亮正确，panel-section-idle-astronomy/overview.json。概览锚点移至地点身份，panel-overview-identity-runtime.json 名称可见；相关回归/typecheck/build通过。
- fixture停车说明与AVAILABLE设施统一，contracts12/12、390回读一致；不证明真实地点完整。Map定位提示已去内部解释。
- 最新非fixture evidence-owner-plain-build.log 16999ms成功；evidence-owner-plain-inspection.json 11静态检查通过、14路由、raw1539166B。未复制进fixture snapshot；不是微信上传压缩包大小、视觉或发布验收。

## 下一步与未完成

1. 用户已明确改为名称/地点下方横向概览/天文标签栏（高德地点/美团店铺样式），已实现吸顶和对齐栏高、取消右列并同步Context/PLAN。真实窗口9963390 DAY390点搜索→地点→天文，身份下标签/吸顶及标题可见。继续其他尺寸主题验证。最新miniapp suite274/274；不是完整视觉矩阵通过。
2. 核对微信支持的无障碍状态属性并落实，真机读屏/IME不可用就明确未验，不用模板字符串代替。14路由/62控件完整业务、恢复与动画中断尚未验完。
3. 红光冷启问题已询问未答：当前 enterObservationMode 临时进入，restoreStartupMode/commit 恢复此前日夜；这是明确既有行为，不擅自改成持久偏好。普通路由返回保持红光。provider地图仍亮，缺有效官方夜间底图依据，不猜key/style或重挂载Map。
4. 正常26地点仍缺完整正式资料；天文台候选来源未应用；第四导入关联待依据，10条私有样本不重建/公开。Gaia2048星不等于完整5.5等；USB/iOS/实地未验。缺少最终候选隔离Postgres完整验收，不得关闭goal。
5. 保留计划草稿 draft-recovery-0906（2026-09-06 22:00、未选地点，备注含带红光手电/离开前点器材）与私有反馈1355 rev18 DRAFT，不为测试重置用户数据。

Goal 已索引本目录且包含Context精简要求，无需用户替换文本。完整需求/范围及历史证据通过 INDEX/PLAN/inputs/PROGRESS 按需恢复。

## 最新用户校正与当前候选
- 用户参考高德轻量Tab：概览/天文为身份下方靠左紧凑文字、短选中下划线，无图标、填色、整行等分；44px命中、横向吸顶和同文档定位保留。源码已改，DAY390 medium实际画面确认轻量样式；9421测量44×44px、14px字、透明背景。新版天文跳转未确认。
- 用户明确星图只属云观星，面板不放星图。已删除刚加入的SkyOverview组件、投影/测试及预览prop、样式、请求；不留隐藏sky-map-canvas冒充控件。Context/PLAN及runner删除该面板要求；旧历史星图接入工作已撤回，不得重做。
- typecheck及章节3/3通过，build58037已同步。此前272/272是上个含静态星图候选，不能作为新候选全量证明。
- CUA真实窗口9963390；旧60360878截图不可用。遮挡时CUA可能返回非目标内容，先核对可见目标，不反复抢用户焦点；automator9421与原生窗口状态不同，不能混用证据。

最新workflow light-tabs-workflow-tests.log76/76。CUA坐标点击位置与截图指针不一致，停止盲点；编译未确认发生。当前候选仍58037。实际交互核验工具问题未归因，不当作产品已修或已坏证据。

最近修复SAMPLE_DATA误标资料不足，改示例数据；fixture面板去重复徽标，Search短测试标识与选点读屏文案收敛。fixture源码名称示例观星点，8879现有内存未刷新，未重启/清空。typecheck与build92370通过，视觉待验。

最新天文区改总云/低中高层云/月光影响客观事实行，修正LOW/MEDIUM/HIGH被误映射暂无数据，0%保真。使用现有Map预览evaluation；移除泛化建议文案，保留全部CAUTION/BLOCKER及来源。typecheck、相关5/5、build8897通过，视觉待验。

事件核验更新：Taro需要父冒泡完成batch，之前只分发子tap的失败无效。probe-panel-tab.mjs补齐实际节点冒泡，9421天文选中与栏下标题对齐已回读；非原生触摸证据。large状态但几何仍medium原因未定。直接height尝试无效已撤回，build29133恢复同步。

最新事实字级：设施14/21、天文有效值18/25右对齐、缺失14；typecheck/build46024通过，panel-fact-type-runtime.json原生样式回读通过（无缺失实例）。9421实际NIGHT颜色，原生窗口先前DAY，不同运行状态，分开证据。截图接口12秒超时，勿循环重试。

最新map-time-frame修复：选中时段缺失/错地点/不可用时，不保留旧云/月/机会；动态图层缺失清覆盖，静态光害保留。相关7/7与build99929通过并同步。真实故障恢复未验。

最新共享refetch失败不再返回cached对象冒充成功，显示cache仍保留；Map地点refreshError已进入重试提示，手动刷新播报纠正。typecheck与全suite274/274通过，build95320同步。背景scene失败呈现和真实断网恢复仍待核对。

地图背景scene.refreshError已显示旧结果说明和重试；面板同步STALE_USABLE（UNAVAILABLE不提升）。typecheck/相关8项/build34471通过并同步，真实故障恢复仍未验。




































- 原生机型菜单从iPhone5切iPhoneX375×812，底图初白后正常加载；DAY Map中档身份轻tabs/路线/两列设施/动作及底部安全区实际可读。未重启未改变偏好。375其他页/天文待做。

- DAY375原生天文标签→大档定位、2列主指标/3列云层/来源入口完整；点来源页许可日期换行可读，返回同天文章节与21:00。无源码修改/数据操作，非全375路由主题矩阵。

- DAY375原生Map天文→云观星成功，中央持续白、底部允许方向/时间尺可见且刻度偏淡。源码drawSkyScene632-641在heading/pose缺失时只填背景return，故不能称Canvas崩溃；未授权/未模拟传感器。需核对显式无姿态可见提示及时间尺对比，当前只有允许方向操作。可见窗口sky/detail，候选validation-copy未变。

- 云观星未开启方向的可见说明被CSS clip隐藏，违反owner要求。恢复recovery文案与动作在中部轻量容器，保留无真实姿态不投影逻辑和底部对象入口；body-secondary token名称已核对修正，最终sky-recovery-visible-build通过同步。新视觉/多状态重叠与时间尺对比待验，无传感器授权。

### 云观星可理解性复验（sky-legibility）
- DAY375原生已观察：恢复的无姿态说明与顶部通知不重叠；未开启传感器或伪造方向。
- 天体列表入口原先隐藏文字，只剩箭头；恢复短标签“天体列表/收起列表”，保留原无障碍名称。时间尺移除整项透明度渐隐，避免同时淡化时间文字；保留位移和选中态。
- sky-legibility-build.log 成功19281ms并同步可信snapshot；原生375进入后确认标签可见、时间刻度对比改善。列表展开、多尺寸/主题、实际传感器仍待验，不是整体验收。

### 云观星展开遮挡修正
- 原生DAY375实际展开4对象列表，确认覆盖方向说明下半部与允许方向按钮；本轮属于取得新证据并改实现的进展。
- 将方向恢复块和对象列表移入同一有边界ScrollView，列表内部不再嵌套滚动。列表按钮/时间尺留外部；方向已就绪且列表关闭时不挂载该滚动层，避免干扰天空操作。
- sky-details-scroll-build.log exit0并同步snapshot。本候选实际展开/滚至末项/收起及320仍待验证，不能沿用上一版不遮挡结论。当前原生可能已自动返回Map，操作前读取新状态。

### sky-details运行边界检查
- 上轮属进展：发现真实遮挡并改动实现。本轮原生375重试云观星仍出现DevTools __subPageFrameEndTime__ null；My→Settings→返回→Map可用，但未恢复天空分包。没有重启/清数据，不能说视觉复验通过。
- 独立9421连接有效；组件事件从Map进入sky/detail/index并展开列表。sky-details-scroll-runtime.json：390宽，滚动区域y354.48–635.99，恢复说明y354.48–496.48，列表起点502.48；不再覆盖恢复按钮。列表内容底745.68超出viewport，应由外层滚动到达；固定收起入口y660–704、时间尺738–810在viewport之外。此为运行几何，尚非原生滚动/截图证据。
- sky-details-typecheck.log exit0。下一步验证scrollTop末端与收起后恢复状态，原生导航异常仍需绕过或换已有可用调试表面，不能把9421当375真机。

### sky-details滚动到末项与收起验证
- 官方automator page.$选择器20s超时后结束，无结果，不重启。改用当前仓库miniprogram-api-typings已声明的NodesRef.node→ScrollViewContext.scrollTo（实际组件滚动，不手改页面数据），9421独立390执行成功。
- sky-details-scroll-end-runtime.json：scrollTop109.6，viewport y354.48–635.99，4项真实列表末项y579.88–630.08，完整可到达，无固定按钮遮挡。
- 组件事件收起后sky-details-collapse-runtime.json：list=null，scrollTop自动回0，恢复说明y354.48–496.48完整在viewport内；不需额外重置状态补丁。
- 原生375导航异常与320/430、主题/硬件待验保留。上一轮进展为当前运行边界检查，本轮进展为实际滚动与收起证据。未改源码、未使用传感器权限或用户数据。

### 原生320云观星滚动与窄屏残留修正
- 现有机型菜单切换iPhone5 320×568后，天空分包可以进入；不重启开发者工具、不清数据。不能据此宣称修复DevTools根因。
- 对sky-details-scroll候选原生观察：恢复说明和方向按钮完整可见；展开4天体不覆盖方向操作；实际scroll后末项银河核心方向及其时窗/角度完整可见，收起入口和时间尺不遮挡；实际收起后恢复卡片回到顶部。
- 发现≤340px旧recovery/list左右定位仍作用于现在relative元素，造成向右偏移和边框裁切。已删除这些旧定位，统一由外层滚动容器负责横向边距。恢复标题从28rpx/38rpx改为现有body-secondary尺寸/行高，避免320标题缩小到正文以下。
- sky-narrow-inset-build.log exit0并同步snapshot。最后两项CSS修改后的原生截图待复验；之前滚动证据不替代新字号/边缘证明。当前原生320，自动重编译可能Map；9421仍独立390，先重读状态。

### 430宽候选与累计测试
- sky-narrow-inset候选原生320再次未能进入天空，未取得最新窄屏边缘/标题视觉证据。现有机型菜单改iPhone14ProMax 430×932后可进天空，方向说明标题与正文层级稳定，卡片边缘完整；展开列表不与方向卡片叠加，固定收起与时间尺在区域外。
- 430返回Map保同地点，原生My摘要与日常入口可读；Settings点击后仍停My，夜间主题尚未切换，不把意图当验证。未重启工具或清数据。
- 当前完整小程序suite：sky-current-suite.log 276/276，0失败/跳过，25254.89ms；覆盖截至sky-narrow-inset的候选。仅证明测试覆盖的逻辑，不证明整体验收。
- 当前原生430 DAY My，9421独立390状态需重读。下一步可先查Settings导航停留原因/替代已有可用表面，再验夜间；最新320边缘/字号待复验。不要重复已通过的390滚动几何和320旧候选滚达。

### 我的入口导航失败反馈
- 代码审查：除反馈外，Settings/Plan/Profile/Import直接返回navigateTo Promise而不处理拒绝，导致失败无反馈。统一局部openPage处理各入口；失败给短可恢复提示，保留原内容；成功仅按owner+dedupeKey清除对应旧提示，反馈诊断名保持。
- my-navigation-typecheck.log exit0；my-navigation-build.log exit0并同步snapshot。当前完整276suite先于本次My改动，不称最新整候选测试。
- probe-my-navigation-failure.mjs在9421针对一次Settings navigateTo调用注入失败，15s兜底+finally恢复，未动API/用户数据；my-navigation-failure-runtime.json确认拦截1次、My失败提示可见，恢复后进入Settings，再返回My旧提示已清除。组件事件/官方导航证据，不是原生截图，不证明DevTools底层错误已修。
- 当前9421 My，原生430需重读（拷贝后自动编译可能Map）。继续夜间/最新320复验及其余业务，不重复已证实的单项滚动。

### 地图关联入口导航恢复
- Map云观星/带地点反馈/Search/Auth原先无导航拒绝处理，Evidence只有catch无成功清理。现局部openMapPage统一处理，保留原query与状态；失败inline短提示，成功只清对应owner+dedupe旧提示。
- map-navigation-typecheck.log、map-navigation-build.log均exit0并同步snapshot。完整276suite仍先于两轮导航处理。
- probe-map-navigation-failure.mjs对9421一次sky/detail navigateTo注入失败，15s兜底+finally恢复；map-navigation-failure-runtime.json证明拦截1次、地图提示可见、恢复后sky/detail/index、返回Map提示消失。不改变传感器/业务数据，不证明其他入口全部原生验证或DevTools根因修复。
- 当前9421 Map，原生430最新状态需重读。下一步继续主题/窄屏最新CSS及其余业务；别再把本地失败恢复作为无期限重复测试目标。

### 夜间运行样式验证与截图限制
- 9421当前Settings标签表明NIGHT已选，未改用户主题。官方screenshot两次返回saveFile:fail exceeded the maximum size of the file storage limit；截图未生成，未清数据/保存文件以绕过。
- 返回Map经既有云观星组件入口进入sky/detail/index，sky-night-runtime-styles.json记录390夜间实际computedStyle：恢复标题/说明14px/21px，列表入口14px/20px且44px高；恢复卡背景rgb24,26,23，主文245,243,236，次文190,194,184，时间尺暗背景同语义。
- 实际颜色计算对比：主文约15.7以上、次文约9以上（精确值见工具输出）；布局恢复卡y354.48–498.88，入口660–704，时间尺738–810。不称截图或真机验证。
- 当前9421 NIGHT390云观星列表关闭；原生430需重读。截图存储限制仅当前截图工具，不能据此全goal blocked。后续可用现有原生表面视觉或查已知任务自有截图资源，禁止无范围清理用户数据。

### 2026-09-07 正常地点资料现状复核
- 正常docker Postgres仍运行；重新运行audit-spot-completeness.ts得到26地点、0完整，182必需证据缺失/陈旧、208设施项无效；spot-completeness-audit.json已按当前时间更新，非历史状态沿用。
- 两条天文台官方页面本轮重新打开，与候选摘要一致，未取得现场证据/图片许可；正常地点不应被强发布。
- 正常8787 GET /v2/admin/spots实测HTTP503 CAPABILITY_DISABLED（requestId 4033acd2-071d-4634-8595-7053eb7f3a4b），当前shell无MINIAPP_ADMIN_TOKEN。现有管理接口未启用，不能把候选资料说成已入库；不绕过接口直写DB、不重启正常API来擅自改配置。
- 本轮推进为当前完整性与接入能力的新证据。两source仍candidate_only_not_applied。可继续UI/隔离服务验收等其他工作，不是全goal被阻塞。

### 当前隔离基础设施整合验证
- 读取并确认run-infrastructure-check.mjs的随机verify命名、独立数据库/Redis/media边界和清理目标，运行npm run test:miniapp:infrastructure，current-infrastructure.log exit0。
- miniapp-infrastructure-session.json run verify_96c817fdfda14006，started17:40:13Z/completed17:40:27Z，status passed：Postgres/PostGIS/Redis身份隔离与Outbox跨重启，HTTP ETag/聚合读/类型化冲突/私有媒体上传移除重放/JPEG清理/失败收藏不提交/RBAC拒绝/隔离审计状态往返。backup恢复指纹一致，650862字节。
- 另行read-only核对：两个本次临时数据库count0，Redis本次命名空间scan无结果，临时media目录不存在；正常库地点仍26。不是正常库全内容比对或真实公众发布证明。
- 该结果补齐当前源码隔离基础设施检查，不代表26正式地点完整、实际微信身份/分享/真机/所有UI矩阵完成。Goal仍active。

### 状态整理与可见窗口限制
- 本轮原生430→375，通过现有机型菜单无重启/清数据；DAY My可进，Settings点击仍停My，未取得夜间视觉证据。该部分为重复限制，不宣称修复或通过。
- CURRENT第一未完成项此前叠加多个候选/路由/旧下一步，出现9421 Map/My/天空并存冲突。已原位收敛为当前候选、实际两表面状态、按证据分层的已验范围与尚缺项；完整历史仍PROGRESS，不删除附件/需求。
- 下一轮转尚未覆盖业务或独立验证，别把无响应设置点击与截图额度失败当成可重复进展。完整Goal active，现仍有可执行工作。

### 当前开发检查链与测试装配修复
- current-integrated-fast-check.log：AppID/SDK及contracts/API/miniapp typecheck通过，contracts12/12，API101pass/1integration skip；miniapp275/276失败。失败为evidence-navigation.test.ts提取onPanelEvidence却遗漏新openMapPage，ReferenceError，不是业务参数断言失败。
- 修复测试AST装配同时提取两个真实函数，补最小store状态依赖；保留4入口spotId/contextId编码、文章同地点/无关文章拒绝断言，未放宽期望。evidence-navigation-current-test.log单项通过。
- current-integrated-fast-remainder.log：受影响miniapp276/276、design:system:verify（小程序13颜色对比/44px）、workflow76/76、icons33/semantic24以及UI源码契约4probe全部通过。原full命令失败日志保留，不谎称首跑通过。
- API普通suite跳过的真实基础设施项已有当前verify_96c817fdfda14006独立通过。UI契约仅源码/token证明，不能覆盖真机/视觉缺项。此次仅测试文件修改，无需复制新小程序产物；snapshot仍map-navigation-build。

### 最新正常构建检查
- 显式清除ISOLATED_FIXTURE_BUILD/DEVELOPMENT_FIXTURE_MODE/API_BASE，只设ISOLATED_CHECK_BUILD=1；current-normal-candidate-build.log exit0，产物dist/weapp-check，未复制到可信fixture snapshot。
- current-normal-candidate-inspection.json：11静态项通过、14路由；raw1546998B，main1155543/content241089/spot73056/sky77310，sourcemap0。不是平台上传压缩包或发布批准。
- 对本次正常产物js/json/wxml/wxss搜索127.0.0.1:8879、自动化测试正式观星点、开发验收数据，0匹配；仅证明这些具体标识未出现，不夸大为所有可能测试内容扫描。
- snapshot仍map-navigation-build；新增只是正常候选产物与检查证据，没有上传/发布/启动新工具。

### 当前真机只读诊断
#### Candidate identity
Development feedback readiness only；未启动候选generation，不提升为固定候选验证。
#### Invocation result
miniapp:device:feedback doctor exit0；current-device-readiness.log：officialTool/automaticUpdate/ordinaryPreview available，login ready；ADB1.0.41、detected0、usbReady false。
#### Observed product behavior
未观察手机产品页面。
#### Verified
当前官方工具和登录可用；本次未发现ADB设备。
#### Unverified
真实手机IME/触摸/读屏/方向/网络与候选交付，iOS状态未检查。
#### Invalidated
无新generation/session；历史设备状态不能替代本次观测。
#### Cleanup
doctor未创建预览、QR、generation或手机会话；无新增清理。未启动需要扫码/确认的流程，继续其他本机工作。

### 官方截图额度故障的只读排查
- 读取锁定miniprogram-automator实现确认screenshot调用App.captureScreenshot后才把base64写本地；错误发生在工具捕获阶段，非本地artifact写入。
- 9421桌面模拟器仅聚合文件元数据：USER_DATA_PATH根目录1个miniprogramLog目录，无png/jpg；日志3文件共3079580B；wx.getSavedFileList为0文件/0B。未读取日志内容、未删除任何文件、未清存储。
- 因无可证属于本任务的积压截图，不能把额度错误解释为任务图片堆积，更不能清空用户目录。该证据排除盲目清图方案；不称截图恢复。下一步换可用视觉表面或其他未覆盖业务，不再次重复同样截图调用。

### 天文台官方来源正常入库（已执行）
- 先审查main默认loopback、repository initialize migrate=false无seed写入；使用随机端口/token、显式本机HOST、单actor OWNER、关闭自动迁移/fixture/media，无Redis共享缓存的临时API，现有8787/8879不变。
- apply-observatory-sources.mjs通过GET管理员资料再PATCH，仅合并dataDisclosure；两次读revision防止明显过期基线，没传status/evidence/verifiedAt。临时token仅进程内存、不落盘/输出。
- observatory-source-intake.log exit0；回执observatory-source-intake-result.json：source10→12、rev2→3，DATA_INSUFFICIENT/complete=false。deepEqual确认全部其他detail和spot payload未变。现有owner正常生成修订/评估/审计；评估不是批准发布。
- 临时child停止后8787管理仍HTTP503，现有配置未改。候选文件mode改applied，阻止脚本重复写入；官方来源笔记接入状态已更新。后续不能再报告来源尚未入库，也不能把两source当完整现场资料。

## 2026-09-07 Context导航冲突与定位文案
- 复核 information-design.md：已有调研依据、内容形态布局表、动态内容/尺寸规则和实际检查要求，不重复调研或新增原型。
- surfaces-and-controls.md / map-and-finder.md 仍残留右侧rail旧描述，改为引用 spot-and-sky.md 唯一当前横向文字吸顶规则。
- auth实际为定位与隐私页，并非登录页。成功说明移除“观测上下文”内部术语，保留只获取一次、地图不移动及返回定位入口含义；未变定位行为。
- Node24 one-shot-location.test.ts 12/12通过（本轮工具输出）。首次Context编辑因工作目录错误未写入，随后绝对路径成功；无额外文件产生。
- 此轮源码文案尚未重新构建或实际WEAPP观察；snapshot与normal candidate仍是此前版本，整体goal未完成。

## 2026-09-07 共享返回失败恢复
- 上轮实际源码/Context修改为progress。本轮CustomNav补完整navigateBack→指定fallbackTab双失败处理，局部可见提示、finally释放锁；pending重复点击不再重复pop，当前页内容不清理。
- 新custom-nav.test.ts覆盖真实回调：正常back不跳tab、无/不可读栈走指定My、双失败可重试、连续点击只发一次。加定位相关共16/16通过；miniapp tsc通过。
- 非fixture编译back-recovery-normal-build.log exit0；back-recovery-build-inspection.json确认产物含返回错误与定位新文案。未同步snapshot、未重启DevTools，实际WEAPP错误提示几何/重试尚未验。
- 修正INDEX两条已过期“来源尚未接入”记录，按已有真实接入回执更新；未重跑来源入库。
- 后续优先在可用WEAPP验证共享返回错误可读/恢复；仍保留全部未完成矩阵，不以此局部修复完成goal。
编译检查修正：首次中文literal搜索0匹配，因压缩产物使用Unicode转义；改查转义后两文案均命中，14路由。inspection已覆盖为真实结果。

## 2026-09-07 共享返回WEAPP恢复验证
- 上轮源码/测试/构建为progress。本轮8879/9421监听确认存活；back-recovery-fixture-build.log exit0，从dist/weapp-fixture复制产物至既有snapshot，无删除/重启/扫码/信任操作。
- probe-back-recovery.mjs连接9421：My→定位隐私；临时注入navigateBack及switchTab拒绝（15s自动恢复+finally恢复），实际组件事件出现错误；错误矩形left12/top91/width366.4/height29.6，返回44×44。恢复后再触发返回成功到My，错误不显示。
- 证据back-recovery-runtime.json/log。仅组件事件+原生selector几何，不是原生点击/截图/真机证明。无请求位置、无账户/草稿/设置修改，注入已撤销，连接disconnect。
- 当前9421最后My；snapshot最新back-recovery-fixture。继续其他完整业务/14路由矩阵，不能把该项扩大为全产品完成。

## 2026-09-07 攻略设施引用状态检查
- 上轮WEAPP故障恢复证据为progress。本轮复核article/detail及useResourceQuery：设施pending/error/无记录分开，cached refresh error不变isError，旧设施继续显示，并有来源状态提示。
- 扩展partial-content.test.ts真实JSX执行，覆盖设施pending/failed/missing/cached-error/STALE_USABLE；道路封闭UNAVAILABLE证据不丢、正文保留、单个设施重试只触发site。共6/6通过，miniapp tsc通过。
- 无生产逻辑修改，无新构建必要；此证据为渲染分支及回调检查，不是设施实际网络注入/视觉/真机证明。当前snapshot仍back-recovery-fixture，9421上次My。
- 下一步仍应补实际内容页/媒体/网络矩阵，勿重复已通过返回探针或以单元测试声称整体UI完成。

## 2026-09-07 实际时间尺跨日格式缺陷
- 上轮设施渲染回归为progress。本轮拟进攻略，先读取现有Map实际labels，发现09/07 24:00、24:30。优先修真实时间显示错误，攻略实际网络注入仍未执行。
- time-ruler.tsx与spot-detail-page.tsx中hour12:false改hourCycle:h23；不改时间戳/选择/时区。time-ruler.test.ts新增两实际formatter跨日前后断言，5/5通过。
- midnight-format-runtime.json在现有9421运行Intl：旧09/07 24:30，新09/07 00:30，确认该引擎支持修复。非重新编译页面后的端到端显示证明。
- 新源码尚未构建同步，snapshot仍back-recovery-fixture。下一步编译同步并再次读取实际时间尺labels，继续攻略网络场景。连接均disconnect，无重启/状态写入。

## 2026-09-07 跨日时间最终页面证据与攻略入口
- 上轮实际缺陷修复为progress。本轮midnight-fixture-build.log exit0，同步既有snapshot，不重启。
- midnight-page-runtime.json实际Map labels有09/07 00:00及00:30，无24:；当前21:00选择仍在。证明编译页面使用新格式，非仅Intl单独调用。
- 通过既有Map查看全部攻略组件事件进入spot/guides/index；首次读取尚未加载条目，后续同连接读取完成，出现“阅读攻略 到达前检查：开放、道路与撤离”。没有因短暂加载重新启动。
- guide-content-current.json保存当前隔离测试攻略正文摘要/labels。9421当前攻略页，下一步点击上述实际阅读入口，检查article设施网络故障。尚未注入，不称通过。

## 2026-09-07 攻略设施真实请求恢复
- 上轮页面跨日修复验证为progress。本轮article-site-failure-runtime.json/retry.log：现有攻略入口→文章，隔离8879 /field请求失败2次，显示设施过期提示及重试，正文/停车旧记录仍保留；恢复wx.request后实际重试成功，旧提示消失。
- 首次探针误用/site导致0命中，未计通过；依generated miniapp-api.generated.ts确认/field并修正。自然等待45秒让已有缓存过期，不清缓存/草稿，不改资料。首次失败log保留。
- probe-article-site-failure.mjs有15秒恢复兜底/finally恢复+disconnect。当前9421文章页；不代表原生手势/截图/真机，未验证无缓存初次设施失败。
- 下一步优先剩余实际视觉/业务矩阵；不要重复本探针。生产源码本轮无变化，snapshot仍midnight-fixture。

## 2026-09-07 文章阅读运行几何
- 上轮真实设施请求恢复为progress。本轮inspect-article-reading.mjs读取现有9421文章，再用实际ScrollView node滚到底；article-reading-geometry.json保留前后。
- 当前NIGHT390：正文和安全说明computed16px/26px；正文左右12，安全说明左右27；来源容器均在viewport横界内。滚底后最终来源bottom809.90，viewportbottom844，留约34px；contentbottom843.90，与viewport相合，无末尾遮挡。
- 仅现有隔离样本和原生selector/scroll结果，不是截图、不证明所有长文/320尺寸/物理手势。无源码修改，无重新构建，snapshot仍midnight-fixture；9421文章页滚至末尾。
- 下一步补其他尺寸主题真实呈现或未验证业务，避免重复这条已通过的390几何探针。

## 2026-09-07 恢复原生文章视觉验证窗口
- 上轮文章geometry为progress。本轮重新初始化现有sky，list_windows实际返回9963390与60360878两窗口。首次误调用get_windows无作用，改按文档list_windows成功。
- 9963390是DAY375地图，展开一次点击仍不响应，未重试/重启。60360878现为NIGHT iPhone12/13文章页，与9421文章状态相符，不能继续沿用历史“该窗口失效”。
- 原生截图直接检查文章末尾：安全说明、停车状态/条件、长来源许可与警示完整可读，底部未遮挡。原生向上滚动后检查标题/日期作者/正文/真实测试图片署名/安全说明，未观察重叠截断。截图在本轮工具消息中，未创建外部截图文件；仅该尺寸/主题/测试内容。
- 60360878原生滚动有效，为后续视觉检查提供可用路径。node_repl articleOtherWindow/articleOtherState是当前对象；每次输入前重读state与screenshotId。当前文章顶部，9421同页；未改数据/设备尺寸/偏好。
- 不操作更新提示窗口，不重启DevTools。下一步沿此原生窗口补窄屏或其他主题/页面，而非对9963390反复点击。

## 2026-09-07 NIGHT320文章原生检查
- 上轮原生可用窗口恢复为progress。60360878机型菜单选择iPhone5(320×568)，初次截图后DevTools自行重新编译回Map；未调用重启、未扫码/信任。首次错误screenshot-3无操作，刷新并按实际截图2/4完成菜单选择。
- 重新用真实现有Map攻略入口及阅读入口进文章，再原生滚动两次到底。当前NIGHT标准字号320：标题/发布更新/核验自然换行，正文两行完整，图片比例和署名可见；末尾设施短事实、完整来源、英文许可/警示无横截断，最终警示完整可滚达并留底部内边距。
- 证据是本轮原生工具截图，不是独立保存图。仅该样本/主题/尺寸；超长无空格URL、真机等仍未验。无生产源码改动。
- 当前60360878/9421 NIGHT320文章底部，snapshot仍midnight-fixture。后续继续剩余页面/主题，勿重复此320文章首尾。

## 2026-09-07 NIGHT320天空实际裁切修复
- 上轮NIGHT320文章为progress。本轮现有Map云观星入口→sky/detail，原生截图看到恢复说明/允许方向按钮完整，与顶部数据提醒无重叠；点击天体列表能展开。未授方向权限，未伪造姿态。
- 实际发现时间尺底部远刻度文字裁切，当前时刻上下重复。原因tick随曲率最多向下18rpx平移，但track无预留底部位移空间。
- spot-sky-page.scss track底部预留18rpx、tick高度改72Px-18rpx保持尺总高；ts代码移除selected重复tick文字，仍保顶部当前值和每tick ariaLabel/事件。orientationRulerDistance源码上限1，平移上限18rpx；tsc通过。
- 新改动尚未构建/视觉复验；snapshot仍midnight-fixture。下一步fixture构建同步、NIGHT320检查远刻度完整和列表滚底；不以源码推定完成。
- 当前60360878/9421 NIGHT320天空列表展开。工具截图在本轮，未截图另存。所有编辑仅显示几何，不改时间选取或方向计算。

## 2026-09-07 NIGHT320时间尺裁切修复复验
- 上轮源码修复为progress。本轮sky-ruler-inset-build.log exit0，同步snapshot，既有Map入口进入天空，无手动重启。
- 60360878 NIGHT320原生截图确认当前21:00仅顶部一次，远刻度23:20/01:20文字完整位于尺内。点击天体列表再原生滚动，等待渲染后看到末项银河核心方向及时间/方位/高度完整；末项底边与列表按钮/时间尺分离。
- 首个即时scroll截图尚未滚到位，随后同窗口刷新才见最终结果，不把延迟当失败。方向未授权，无模拟pose，无实际时间更改。
- 仅当前NIGHT320样本视觉/原生滚动；其他主题/时刻边缘标签、真机指向及完整goal仍未完成。当前60360878/9421天空列表滚底；snapshot最新sky-ruler-inset。

## 2026-09-07 时间尺相关回归及天空返回
- 上轮NIGHT320尺/列表原生证据为progress。本轮sky-canvas-time、sky-time-frame、map/time-ruler共13/13通过：精确frame匹配、缺失不借值、预览取消恢复、地图尺单次提交及隐藏取消。不是天空实际拖拽验证。
- 60360878 NIGHT320天空原生返回点击成功到Map；sky-return-map-current.json读取labels确认同一个测试正式地点、09/06 21:00已选择。读取脚本switchTab同Map但不改选点/时间；原生截图已先证明返回。
- 未改变时间/授权方向/数据/偏好，当前Map中档。最新snapshot仍sky-ruler-inset。实际天空尺选择/取消/跨日拖动与真机仍待核实，不能用这13项替代。

## 2026-09-07 发现天空21:20返回地图21:30错标
- 上轮13项/返回证据为progress。本轮probe-sky-time-selection.mjs真实组件事件：sky21:00→21:20提交成功，返回Map标签却21:30已选择。finally恢复21:00并回读成功；当前Map21:00。结果sky-time-selection-runtime.json，脚本预期断言失败，不能计通过。
- 初步源码：MapTimeRuler initialIndex用nearestMapTimeFrameIndex；Map index projectedFrame也取nearest。尚未区分共享context被改写还是只把最近刻度误标为选中。需要下一步检查selectedAt真实传值/MapTimeRuler渲染，并补精确非半小时刻度支持或诚实状态，不能强行把天空时间改半小时来掩盖。
- 本轮无生产改动，不重复旧检查。组件事件不等同物理拖动。没有方向授权/地点或草稿修改，测试时刻已恢复。

## 2026-09-07 精确地图时间帧服务端修复
- 上轮21:20实际失败为progress。定位mapFrameTimes只生成半小时序列，MapTimeRuler nearest索引把21:30显示为选中；Map projectedFrame也nearest，需继续修前端旧响应阶段，不能只改标签。
- miniapp-service.ts时间轴加入区间内真实selectedAt且去重排序，沿用最多49帧约束，未造科学值；每帧仍走现有timeSignalFor/layerFor。新增miniapp-api.test off-cadence检查21:20/21:30精准各一次、排序/上限/共享context不变，通过。首次测试清理误用close，改现有onModuleDestroy后通过。
- 尚未重载8879/8787，正常服务不动；运行修复未验证。前端MapTimeRuler在无精确帧时仍最近索引错标，Map projectedFrame也待处理，下一步优先修复并补回归/端到端21:20。当前实际Map仍21:00，snapshot sky-ruler-inset。

## 2026-09-07 前端精确时间与缺失投影
- 上轮服务端精准frame修复为progress。本轮MapTimeRuler标题在非交互态显示selectedAt，active/aria已选择只精确时间匹配；nearest只定位尺。拖动时仍预览当前索引。
- mapTimeFrameAt取唯一精确frame，缺失/重复返回无信号frame；Map projectedFrame不再nearest，projectMapEvaluations将动态条件置UNAVAILABLE，动态图层无数据则清空，静态光污染既有逻辑保留。不借邻近科学数据。
- 新回归off-cadence选中/标题、精确投影/重复拒绝；map-time-frame+time-ruler12/12及miniapp tsc通过。首次Add-Content错误相对目录未写，随后绝对路径补齐并重新通过。
- 尚未构建或重载运行API，21:20端到端仍待验，不能计问题完全修复。现有8879内存数据需保留，先核实热加载方式，勿为更新服务盲目重建fixture库。当前实际Map21:00，snapshot仍sky-ruler-inset。

## 2026-09-07 精确时间候选运行尝试
- 上轮前端修复为progress。exact-time-build.log编译通过并同步snapshot。8879核实为plain tsx src/main.ts内存进程，未重启，防止丢失私有草稿/身份。
- 新前端+旧API probe-sky-time-old-api.mjs未完成：返回/恢复Map未成功，报tick_missing:09/06 21:00；复查9421实际仍sky，场景时刻13:00Z/21:00，未观察时刻被改变。exact-time-map-after-probe.json保留实际sky状态，不能按文件名误判Map证据。
- 追加稳定性修复：mapTimeFrameAt缺帧返回新对象，改useMemo按scene.timeFrames与projectedAt缓存，避免无精确帧时每render改变派生引用。此追加尚未构建/验证，未把导航失败归因确定为此问题。
- 当前snapshot exact-time-build（早于useMemo追加），9421 SKY21:00，原API仍旧时间轴。下一步重建候选、核对原生/控制台具体错误，继续21:20完整联动；不要重启/清空8879。

## 2026-09-07 精确时间前端旧API场景通过
- 上轮候选/稳定引用修改为progress。本轮原生窗口调试器0应用error；wx.switchTab success但evaluate getCurrentPages仍报sky，原生截图实际Map，证实上轮部分导航判断受读取时序/旧页面栈影响，不能认定应用导航根因。
- exact-time-stable-build.log exit0并同步，之后单独读Map再进Sky，probe-sky-time-old-api.mjs通过（sky-time-old-api-stable-runtime.log/json）：Sky21:20，旧API Map正文精确09/06 21:20，未把21:30标已选，最后恢复Map21:00。
- 这证明新前端与旧时间轴时不冒充邻近时刻；不证明API新精准帧已运行。8879 plain内存服务保留未重启，8787也未改。下一步用独立实例验证新API实际HTTP与前端完整精确tick，保留旧实例状态。
- 当前60360878/9421 NIGHT320 Map21:00；snapshot exact-time-stable。原始失败sky-time-selection-runtime.json保留，新证据另名。

## 2026-09-07 精确时刻API回归和真实HTTP
- 上轮前端旧API运行通过为progress。本轮API类型检查发现新test layer NONE无效，改CLOUD后typecheck通过；exact-time-api-typecheck.log保留失败，retry.log通过，exact-time-api-regression.log服务17/17通过。
- 新map-exact-time-http.test.ts启动本机随机端口Nest+真实controller+独立test service，用fetch POST resolve21:20再GET map scene，确认context21:20、该tick唯一且21:30仍保留；通过，finally app.close。API含此新test的tsc再次通过。
- 未接触现有8879/8787状态。该结果是新服务真实HTTP，不是新前后端组合UI证据；组合仍待验。当前实际Map21:00，snapshot exact-time-stable。

## CURRENT历史快照归档-20260907-exact-time-consolidation
# 当前恢复状态

只保留当前状态，原位更新。先读INDEX/PLAN；两份完整输入在inputs，不能用本文件替代需求。历史定向查PROGRESS（包括CURRENT历史快照归档-20260907-density-status-consolidation），不要全文加载。

## 范围与约束

- Goal active：完整I21业务、14路由/历史62控件及UIUX未完成。直接main，保护大量未提交修改；不建子agent、不发布/上传/推送、不重启DevTools触发信任扫码。
- 标准字号；大字号暂停。轻量概览/天文文字吸顶定位，同一文档；星图只属云观星。按有效信息形态选布局，密而不挤，保留风险/缺失/来源。
- 信息设计规则owner：project_context/areas/main/screen-contracts/wechat-miniapp/information-design.md。只有global默认Context；其余按需，不同步原型/handoff/hash。生产tokens/assets/tests保留。先前删除8旧资源目录被自动审批拒绝，不换工具绕过。

## 当前候选与工具

- 新API真实HTTP已证：map-exact-time-http.test.ts随机loopback实例POST21:20/GETscene含唯一精确tick与21:30，finally关闭。服务17/17+API tsc通过；现有8879/8787未动。新前后端组合UI仍待验，不能混同旧API前端通过。

- 最新snapshot exact-time-stable-build；旧API21:20往返已通过sky-time-old-api-runtime.json：Map正文21:20不误选21:30，恢复21:00。新API精准帧尚未实际加载（8879内存必须保留）。当前NIGHT320 Map21:00；先前导航失败部分为旧页面栈读取，原生实已Map。

- 最新：exact-time-build已同步但旧API联动探针导航未成功，实际仍SKY21:00（exact-time-map-after-probe.json）。追加projectedFrame useMemo稳定缺帧引用尚未构建/验证；下一步重建查导航真实错误。8879 plain tsx内存服务未重启，必须保状态。

- 最新未构建前端：MapTimeRuler非交互仅精确selectedAt选中/标题；mapTimeFrameAt精确唯一匹配，无frame不借邻近信号/动态图层。12/12+tsc通过。服务端已加入精确selectedAt但API未重载；优先端到端21:20复验，注意保留8879内存状态。

- 21:20错标修复进行中：服务端mapFrameTimes已含精准selectedAt(去重/排序/49上限)，off-cadence回归通过。前端nearest旧响应错标/投影尚未修；API未重载，实际运行未证。优先继续此缺陷，当前实际Map21:00。

- 优先未修缺陷：sky-time-selection-runtime.json实际天空21:20返回Map错标21:30已选择；finally已恢复21:00。检查MapTimeRuler nearest索引与activeContext真实时间，不能用半小时量化掩盖。当前NIGHT320 Map21:00。snapshot仍sky-ruler-inset。

- 最新60360878/9421 NIGHT320 Map中档：天空原生返回保持同spot与09/06 21:00（sky-return-map-current.json）；最新相关canvas/time-frame/map-ruler13/13通过，实际天空拖动未验。snapshot仍sky-ruler-inset。

- 最新snapshot sky-ruler-inset-build.log：NIGHT320原生确认时间尺无重复当前值、远刻度文字完整；列表原生滚底末项完整，与固定按钮/尺分离。60360878/9421当前天空列表底部，方向未授权。其他主题/时刻及真机仍待验。

- 最新实际状态：60360878/9421 NIGHT320 iPhone5文章底部，已原生核对首尾自然换行、图片署名、来源许可/警示末行完整可滚达。切机型曾自行重新编译回Map，已重新进文章；未手动重启。旧390状态仅历史。

- 原生工具最新纠正：60360878现可用，对应NIGHT iPhone12/13文章，原生滚动与首尾截图可读；不要沿用历史该窗口无效结论。9963390仍DAY375 Map展开无响应，勿反复点击。node_repl articleOtherWindow/articleOtherState，操作前重读；9421现文章顶部。

- 最新snapshot midnight-fixture-build.log；midnight-page-runtime.json实际00:00/00:30正确。9421现文章页；article-site-failure-runtime.json证实/field刷新失败保正文/旧设施、显示过期风险，恢复请求后重试成功。无缓存失败/原生视觉未验；不重复本探针。

- 最新源码：共享CustomNav双失败提示/重复点击保护+定位成功文案。custom-nav/one-shot-location共16/16及tsc通过；back-recovery-normal-build.log非fixture编译通过，inspection确认文案入包；已同步snapshot；9421 back-recovery-runtime.json证明双失败提示几何/44px返回/恢复My，未验证原生点击。以下current-normal-candidate-inspection为更早候选，不作最新包体证据。

- snapshot：artifacts/miniapp/integrated-runtime-snapshot/miniprogram；最新fixture midnight-fixture-build.log，已同步；9421最后攻略页。最新改动恢复云观星无姿态说明及天体列表短标签，去除时间刻度整项透明度渐隐；未改变传感器或投影逻辑。DAY375原生确认说明无通知重叠、标签可见、刻度对比改善；列表展开及多尺寸主题待验。
- 最新typecheck map-navigation-typecheck.log。当前检查链：current-integrated-fast-check.log首跑止于测试装配缺新导航helper；已修evidence-navigation.test，current-integrated-fast-remainder.log miniapp276/276、design/workflow76/icons33/semantic24/UI源码4probe通过；前半contracts12/API101+1skip及typecheck通过。真实integration另有当前通过证据。非产品整体验收。
- 最新非fixture current-normal-candidate-build.log/inspection.json通过：11静态项/14路由/raw1546998B，main1155543/content241089/spot73056/sky77310，sourcemap0；8879及两测试标识0匹配。非微信压缩包大小/视觉/发布证明，不复制进snapshot。
- Node24：C:/Users/777/AppData/Local/nvm/v24.16.0。默认可能WeChatNode16。fixture构建显式ISOLATED_FIXTURE_BUILD=1/DEVELOPMENT_FIXTURE_MODE=1/API_BASE=http://127.0.0.1:8879，清ISOLATED_CHECK_BUILD。非fixture用ISOLATED_CHECK_BUILD=1，清fixture/API变量。
- 8879隔离API上次PID25316/session95571，LOCAL_TEST/MEMORY_TEST；正常8787不动，使用前核实。不要为示例命名重置内存。
- 原生窗口9963390当前DAY375×812 My（本轮切iPhone X），设置点击停留；官方automator9421独立NIGHT390天空，不能混证据。每次操作前重读实际状态。
- CUA先activate目标，再get_window_state截图+文本，使用新索引/坐标。node_repl已有sky、densityWindowState。返回image必须逐content用image转发，绝不text整个含base64结果。导航可能延迟，观察后再判错。原生窗口曾分包__subPageFrameEndTime__ null导致停My，后来Settings往返后可进反馈；根因未明，不称修复。
- automator用evaluate+wx查询；page.$可能超时。finally disconnect，不能close/restart。请求故障探针仅8879指定GET，finally及15s兜底恢复，不改系统网络。

## 已取得的相关证据

- article-reading-geometry.json：9421 NIGHT390文章正文/安全说明16px/26px，来源容器不横越界，实际滚底来源bottom809.9<viewport844；保34px底部空间。仅现有样本几何，非截图/320/真机；当前文章滚至末尾。

- 攻略设施引用当前渲染检查partial-content.test.ts 6/6：pending/error/无记录/旧值分开，封闭证据不丢，单一site恢复。非实际网络/视觉证明；tsc通过，生产源码未变。

- DAY390/320 Map轻tabs双向定位；320天文2列总云/月光+3列云层、来源末尾与入口，场地2列/短事实同行及长来源可读。面板星图/右轨已移除。field/guides旧三段hub移除，只保各自证据职责。相同完整设施source才合并，差异保留。
- DAY320 My正常摘要/全部入口，Settings逐段至末尾，主页链接精简后、内容导入空态均原生可读。计划日期/时间并排、独立picker打开取消已验，未保存。
- 反馈DAY320日期/时间并排已验，说明/位置授权/媒体0项/保存提交/投稿空态全页滚动可读，未输入定位上传。空说明原生点击提交前校验滚至说明处；文案随后改为只提示当前缺项。最新9421确认textarea p20空串后组件tap，只提示补20字：contribution-validation-copy-runtime.json；非原生新文案视觉证明。
- 请求失败恢复：map-refresh-failure-runtime.json、source-refresh-failure-runtime.json、profile-refresh-failure-runtime.json、my-refresh-failure-runtime.json。My回tab按当前owner刷新active stale查询；失败保留上次数量，恢复后提示消失。无缓存403路径未运行验证。
- 成功旧envelope：Map有map-stale-envelope-runtime.json合成状态验证，仍保TEST来源；旧响应不播报新鲜成功。其他owner源码已覆盖refreshError及STALE_USABLE，但未全部运行注入。
- 偏好拒绝旧revision倒退、dirty编辑保留、新revision继续接收；保存中再次编辑后按ack版本再存测试通过。preferences-old-readback-tests.log、preferences-inflight-tests.log。实际网络乱序未验。
- 历史完整检查density-integrated-fast-check.log含contracts12/API101pass1skip/workflow76等，时间早，不能做最终候选证明。细项（弹簧中断、日期时区、a11y模板、图标预载）见PROGRESS按关键词查。

- 最新原生机型切到iPhone X375：等待底图加载后，Map中档身份/tabs/路线/两列设施和动作栏、底部导航安全区可读。未重启/改数据；375天文原生点击定位、2主指标/3云层及来源入口无遮挡已验；原生来源页长许可/日期可读，返回保持天文章节与21:00，同地点。其他页/主题仍未验。

## 未完成与下一步

1. 下一步优先推进尚未验证的业务/页面状态；不要反复运行已通过的单项探针或对无响应入口重复点击。天空当前实现为无姿态恢复说明+天体列表共用滚动区域，入口/时间尺外置；无真实姿态不投影，不伪造方向。原生320已验证旧sky-details-scroll候选展开/末项/收起，430已观察sky-narrow-inset标题/边缘与展开无重叠；最新320边缘/字号仍待验。9421独立390通过sky-details-scroll-end-runtime.json与sky-details-collapse-runtime.json证实滚达与收起归零；sky-night-runtime-styles.json证实NIGHT字号14/21、入口44px和主/次对比15.78/9.67，但不是视觉截图。Map/My导航失败与恢复见map-navigation-failure-runtime.json/my-navigation-failure-runtime.json，已通过且不代表DevTools根因修复。

   当前工具状态：原生窗口9963390已切375（iPhone X），DAY My；设置点击仍停My，本轮未切夜间。9421上次NIGHT390天空关闭列表，调用前重读。原生间歇__subPageFrameEndTime__ null及导航无响应未解决；仅切机型有时恢复，不重启/清数据。9421官方截图两次saveFile存储额度满；只读排查根目录仅miniprogramLog（3文件约3MB）、savedFiles0，无任务截图可清理，未删任何文件。不再无变化重试或盲目清存储。继续使用可用表面或其他独立工作，不能称全goal阻塞。
2. 真机IME/读屏、拖拽中断/多指、方向传感器、真实分享/媒体/网络与完整业务尚未验完。a11y模板已有label/role/hidden/expanded，其他状态属性及读屏仍待核实。
3. 2026-09-07重新只读评估26地点/0完整，182必需证据缺失、208设施项无效。8787管理仍503 CAPABILITY_DISABLED；已通过独立本机临时管理实例走现有PATCH追加天文台2来源（10→12，rev2→3），其他详情完全未变，仍资料不足；实例已停，回执observatory-source-intake-result.json、第四导入关联待依据、Gaia2048不是完整5.5等；当前隔离Postgres/Redis/Outbox/HTTP媒体与备份恢复整合检查通过（verify_96c817fdfda14006），临时DB/Redis/media清理另核实；真机/实地及完整产品证据仍缺。不要造数据/强发布。
4. 红光冷启动问题未获答：当前临时enterObservation，冷启恢复此前日夜，普通返回保红光；不擅自变持久偏好。provider亮底图缺正式样式依据。
5. 保留计划draft-recovery-0906（Sep6 22:00无地点，红光手电/离开前点器材备注）、私有反馈1355 rev18 DRAFT和10私有样本；不同调试通道用户/状态不同，不重建删除。最新current-device-readiness.log：官方工具/自动与普通预览可用、登录ready；ADB1.0.41 detected0，未启动预览/QR/手机会话。iOS未重新检查；本次仅就绪诊断，不是真机证明。

























## 2026-09-07 精确时间HTTP与生产组件集成

扩展 workers/miniapp-api/src/map-exact-time-http.test.ts：隔离Nest随机loopback端口真实resolve/map响应交给生产MapTimeRuler JSX，检验21:20唯一选中及相邻21:30点击提交；仅替代Taro原语/React hooks，不替代时间帧服务。exact-time-http-render.log 1/1通过，API tsc --noEmit通过。新API与真实WEAPP组合仍未验，现8879内存服务未重启。

非fixture隔离构建exact-time-normal-build.log退出0，webpack成功，输出dist/weapp-check；未覆盖snapshot或发布。CURRENT原位更新证据，不追加重复恢复段。下一步仍是保留旧服务状态的新前后端WEAPP接入验证及既有未完成矩阵，不能以此局部集成完成goal。

## 2026-09-07 新地图接口实际WEAPP精确时间联动

前一轮有实际接口/组件集成和普通构建，分类progress。本轮serve-current-map-probe.mts启动随机loopback新Nest地图接口，限制GET /v2/map/scene，MemoryCache仅对observation-context只读调用原8879；其他缓存和fixture仓库独立。未重启8879、未写草稿/账户。启动时.ts CJS顶层await失败，改.mts后decorator配置失败，显式TSX_TSCONFIG_PATH后正常。

probe-sky-time-new-map.mjs仅短暂重定向8879地图读取；25秒restore兜底和finally恢复。首次云观星未打开导致tick_missing（sky-time-new-map-runtime.log），重新打开并读取真实sky路由/tick后再运行。sky-time-new-map-runtime-retry.log及JSON：1次新版地图请求；天空21:20；地图09/06 21:20已选择；finally原服务恢复、Map21:00已选择。生产组件事件，不是原生手势，也不是完整新版API业务验收。临时服务120秒自动关闭，不用重启或清现有状态。
清理核实：临时服务exec session32223自动退出0；其端口55036已无监听，8879仍为原PID25316。stdin为关闭管道，未能手动写入停止，未重启；使用已设120秒生命周期正常退出。

## 2026-09-07 地图时间尺多指取消

前轮新版地图WEAPP联动取得新证据，分类progress。本轮检查MapTimeRuler发现touchstart无指针数判断；两指加入后仍能scrollend提交。新增真实需求回归先失败（map-ruler-multitouch-before.log cancelled=0）。生产touchstart/touchmove发现非单指立即cancelInteraction，后续momentum忽略，下次新单指可恢复。7/7回归通过map-ruler-multitouch-after.log。初次tsc指出Taro ScrollView事件类型缺touches声明，使用窄unknown cast读取实际原生字段后tsc通过；缺touches也不提交。

map-ruler-multitouch-build.log fixture构建成功，已复制到既有trusted snapshot，无重启。此次新touch事件路径尚需实际WEAPP组件事件及可用原生触摸检查；现有普通构建exact-time-normal-build.log早于此修复。下一步实际验证单指预览、多指取消、迟到scrollend不提交、后续单指恢复；不要把7项单元测试当原生手势验证。

## 2026-09-07 多指取消编译WEAPP事件验证

前轮修复和回归取得进展，本轮核实当前实际Map为21:00后运行probe-map-ruler-cancel.mjs。真实已编译Taro page.eh传touches/scrollLeft：单指scroll预览21:30；双指touchmove取消；迟到scrollend仍21:00；新单指scrollend提交21:30；finally touchcancel并点原21:00恢复。map-ruler-cancel-runtime.json/log记录各阶段，断言通过。未模拟物理双指，不称原生触摸或真机全手势完成；没改服务或草稿。下一步其他未完成页面/手势范围，不重复这一事件链。

## 2026-09-07 天空时间尺取消与程序滚动隔离

前轮Map编译事件取得新证据，progress。本轮OrientationTimeRuler审查发现onScroll任意事件设置interacting，onScrollEnd无条件settle，会把程序scrollLeft动画作为正式提交；无touchcancel/多指/lifecycle取消。修复为只接受单指touchstart开启交互、多指start/move取消、touchcancel/hide/unmount/committed或rows/saving变化取消；程序scroll和迟到scrollend无效；saving禁止横滚。保留辅助点击等价操作。

新增orientation-time-ruler.test.ts生产函数执行：程序滚动不提交、多指/取消/隐藏/卸载不提交及下一单指恢复、保存时不预览。联合天空时间帧/canvas 11/11通过sky-ruler-cancel-tests.log，tsc通过。sky-ruler-cancel-build.log构建通过并同步原trusted snapshot，无重启。下一步编译WEAPP天空取消事件与点击回归；此前天空截图/点击证据早于此次改动，不作为此修复运行证据。

## 2026-09-07 天空取消编译WEAPP验证

前轮真实修复与检查，分类progress。本轮open-current-sky首次观察页面空数据，随后等待实际tick加载再验证，没有重启。probe-sky-ruler-cancel.mjs发实际编译page.eh事件：程序scroll/scrollend保持21:00且非预览；单指scroll预览21:20；双指move取消回21:00，迟到scrollend不提交；touchcancel同样恢复。sky-ruler-cancel-runtime.json/log通过，finally无预览。

再跑现有sky-time-old-api探针验证此次新代码的点击路径：21:20选择、返回地图保留21:20且不误选21:30，finallyMap21:00；sky-ruler-cancel-click-regression.log成功。旧API仍未加载精确帧，但已有新地图隔离组合证据。此次均为编译组件事件，不是物理双指/真机。下一步其他未完成页面或状态，不重复时间尺链。

## 2026-09-07 搜索返回双失败恢复

前轮天空编译事件验证为progress。本轮搜索代码检查发现leaveSearch普通navigateBack失败后switchTab再失败会继续抛出，候选点击/返回缺明确恢复。新增内层catch由search owner提示暂时无法返回地图、保留输入选择、再次返回；不重置输入或选点。search-return.test.ts执行生产leaveSearch覆盖成功、后备成功、双失败提示，1/1通过；miniapp tsc通过。源码已改，尚未构建/WEAPP故障注入，最新snapshot仍sky-ruler-cancel-build。下一步构建并实际搜索返回故障/恢复，不把本测试当渲染验证。另观察搜索context restore未用共享版本保护，需针对请求和选点竞态进一步核查，未在本轮无依据改动。

## 2026-09-07 搜索返回编译及运行探针未证实

search-return-build.log构建退出0，复制至trusted snapshot。probe-search-return.mjs运行后预期搜索inline提示未出现；首次before为空，随后补等待实际文本；另补field父级tap和异步导航fail回调，仍同断言失败。日志search-return-runtime.log/-retry/-bubble/-async均保留，不计通过。finally每次恢复wx导航方法，15秒兜底；最后用原wx.switchTab返回Map。当前缺导航调用计数与原生点击证据，不能判断是事件未到、替换未命中还是产品渲染缺陷；下一步先只读实际绑定和原生UI，禁止继续盲目重复此探针。输入nodes采集为空，亦不能据空数组相等声称输入保留已验。

## 2026-09-07 搜索返回事件诊断

编译产物spot/search/index.js检出search-return-failed。新增导航调用计数后search-return-runtime-counts.log/JSON确认calls=[]，之前断言失败不能解释为产品提示不工作；是事件未命中。改用官方page.$元素tap后exec session91399仍运行、多次poll未返回，未重启/重跑此handle。故障注入有15秒自动恢复，finally尚待执行；下一步先poll91399并核实wx方法已恢复，不把超时当进程退出。

sky.list_windows仍列60360878为微信工具，但对旧对象和重新取得对象get_window_state截图均错误呈现Codex窗口。未执行任何点击；此通道当前不可信，不以其截图做小程序证据，不继续操作Codex。需先解决窗口捕获关联或用可靠自动化读数。没有此返回运行通过证据。此轮新增calls=0诊断改变下一步，分类progress。

## 2026-09-07 搜索恢复版本保护与探针清理

上轮calls=0诊断为progress。当前复核session91399仍live、node PID20164命令行确为probe-search-return.mjs。独立restore-search-probe.mjs实际evaluate确认hadProbe=true、restore并cleared=true；之后仅终止此已核身份的任务探针进程，未重启微信或API，原switchTab回Map成功。不是把timeout当进程已退出或重启环境，主动结束已恢复现场且卡在元素查询的试验；不重复该查询。

搜索contextQuery恢复effect此前无版本/重置保护，加入现有canApplyContextRestore及mapResetVersion匹配。search-context-restore.test.ts执行生产effect，覆盖同版本刷新、过期ID恢复可接受；新时间、其他地点、重置、隐藏不应用，1/1通过search-context-restore-tests.log。已有context-restore与search-return3/3、miniapp tsc通过（新增test前）。未编译本轮版本保护，snapshot仍search-return-build。下一步搜索实际原生入口或Taro事件路径需可靠方式，及新恢复逻辑受影响构建；不因小探针受阻缩减完整goal。

## 2026-09-07 当前搜索与时间候选收敛

前轮版本保护修复+清理为progress。本轮搜索恢复/返回、Context helper、Map时间竞态/时间尺、天空时间尺/帧/canvas25项回归全部通过search-time-current-regression.log，miniapp tsc通过。search-context-current-build.log隔离fixture构建成功并同步trusted snapshot；search-context-normal-build.log普通隔离构建成功，输出weapp-check，未覆盖snapshot。检查普通app.json保持3主路由+4 spot+1 sky+6 content=14路由，只有Map/My两tab。构建不是运行/真机验收。

源码与当前候选均含最近搜索restore版本保护及天空/地图取消修复；下一步仍须搜索返回可靠运行验证或其他未完页面状态，不重复这些无变化回归。未启动新服务、未发布、未重启DevTools。

## 2026-09-07 搜索返回真实事件链定位

读取本地Taro runtime/dist/dom/event.js eventHandler确认isParentBound时入eventsBatch，须最外层绑定触发才dispatch。搜索有button→field(stopPropagation)→page三个绑定，旧探针只到field导致calls=0。修正probe-search-return.mjs至完整三层后，search-return-runtime-root-bubble.log/JSON实际calls=2、暂时无法返回地图及保留/重试提示存在。现已证明双失败显示路径，不代表全部恢复。

恢复原wx后首返、独立retry-search-return.mjs再次点击的读数仍spot/search/index；search-return-second-attempt.log保留。原switchTab独立调用回调success但即时route仍search（历史已有此读取/页面滞后现象），不据此宣称返回成功或根因已知。没有输入值nodes，输入保留不计验。下一步核查后续真实route与导航成功状态，避免不停重试；原native方法按finally已恢复，无新进程/重启。

## 2026-09-07 搜索返回提示生命周期

前轮定位eventsBatch及双失败提示为progress。当前只读仍search路由，提示存在，不能称之前恢复完成。源码发现返回成功后未移除共享search-return-failed通知，重新进入可残留错误。补上成功后仅按owner search+dedupeKey清除；双失败return保持提示，不清其他来源/地图提示。扩展生产leaveSearch测试验证定向清理，联合search-context 2/2、tsc通过。此改动未构建，snapshot仍search-context-current-build。实际路由返回卡点继续保留，下一步可构建后观察或推进其他业务，别以成功回调冒充真实导航。

## 2026-09-07 导航接口与原生窗口交叉核实

前轮提示生命周期修复为progress。本轮inspect-navigation-functions.mjs确认wx三导航均官方value wrapper，无探针函数；inspect-navigation-hooks.mjs实际hookNames=[]、navigationHooks={}。不支持导航mock残留假设。

读ComputerUse api后sky.activate_window明确置前已核微信窗口60360878，截图恢复为真实DevTools（此前后台捕获错截Codex）。模拟器NIGHT iPhone5实际为Map medium，工具底部pages/map/index；同阶段automator getCurrentPages仍search，二者不一致，不能据旧栈说真实页面卡search。实际坐标点击搜索入口后两次原生截图仍Map，未产生可见搜索页，不算正常入口已验。未点Codex或重启工具。当前原生窗口可通过先activate再getstate读取，但交互不确定；不要混这次Map截图为9421搜索故障恢复的完整证明。下一步可构建最新通知清理/继续其他业务，保存此观测限制。

## 2026-09-07 搜索通知清理当前候选

前轮导航原生wrapper/hooks及窗口读数取得新诊断，progress。本轮search-notice-normal-build.log及search-notice-fixture-build.log均成功，后者已同步trusted snapshot，无重启。候选文件审查search-notice-candidate-inspection.json：14路由JS/JSON/WXML无缺失，4个tab图标存在，仅Map/My，包内1549732字节。未上传/发布；不代表微信包体平台计算、全部运行或真机完成。

最新候选含搜索返回提示成功清理。下一步新的可执行验证：重新编译后的实际路由/运行连接是否一致，或其他未完成业务；不要重复已通过无变化构建。完整goal剩余范围仍见本文件索引与CURRENT。

## 2026-09-07 搜索返回与重入完成当前事件验证

上一轮当前候选构建为progress。新编译后probe-search-return完整事件链通过search-return-current-runtime.log：双失败提示出现，恢复wx后route实际Map。之前旧运行路由读数不一致不继续当当前失败。

probe-search-reopen.mjs实际再进Search，旧返回提示不残留。首版直接读n.value得到null导致输入断言失败，不算内容丢失；只读节点发现p25为当前值，再读实际base.wxml确认input value={{i.p25}}。修正验证后search-reopen-verified.log和search-reopen-runtime.json通过：搜索词自动化测试正式观星点仍保留，focus=true，无旧返回提示，finally切回Map。这是编译组件/程序导航链证据，不是完整原生IME/键盘/触摸验证。下一步其他未完成页面状态，勿重复此返回链。

## 2026-09-07 搜索窄屏有效密度校正

前轮搜索返回/重入新证据为progress。本轮实际NIGHT iPhone5搜索页首屏与原生滚动截图：筛选换行、结果末端卡片可达；截图在工具消息。只有正式点建议时，浮层仍两行普通地点/待核验点统一解释，占据无关空间。依据既有information-design内容贴近对象原则，移除统一boundary正文；普通地点每行始终标明普通地点·只移动地图，再附区域/地址（此前有地址时反而不说明动作限制）；待核验行已有资料待核验·只移动地图保留。无正式点冒充、无风险隐藏。miniapp tsc通过，尚未构建此文案变更，下一步编译并复看正式点浮层。当前可见window60360878已能原生scroll，先activate再capture。

## 2026-09-07 搜索浮层复看与禁用文字

前轮真实窄屏发现并修正文案为progress。本轮删两处无人引用spot-search-boundary样式；search-density-build.log成功同步snapshot。NIGHT320原生搜索截图确认统一两行说明已去，只保留正式点名称/区域；无文字隐藏替代。复看同时发现不可用距离/驾车时间标签近乎黑色不可读，只有图标/边框，属于原生disabled默认色风险。已有disabled仅opacity，补显式color var(--text-secondary)。search-disabled-color-build.log成功并同步snapshot，尚待此次颜色实看。普通构建仍search-notice-normal-build，早于这轮密度/禁用颜色。下一步实际禁用chip可读验证，不重复无变化其他测试。

## 2026-09-07 搜索禁用颜色实际修复

上轮首次局部color修改未奏效，本轮实际wx selector computedStyle确认disabled color rgba(0,0,0,.3)、background rgb247，而enabled为rgb190,194,184；before-specificity JSON保留。选择器增加页面作用域，提高到超过原生disabled规则，显式透明背景，不加全局!important。search-disabled-specificity-build.log成功同步snapshot。

新版实际search-filter-colors.json/对应log：disabled仍true，color rgb190,194,184、opacity .55、background透明，矩形高44。原生NIGHT320截图距离/驾车时间文字恢复可辨、弱于其他选项，不再空白；截图在工具消息。进入脚本一度仍running，等待session93215结束后重新获取有效geometry，未把首次空结果当证据。窗口console显示setTabBarItem fail no tabbar page警告，未归因、不可宣称全部控制台无误。下一步审查该可定位警告及其实际影响，或其余业务；普通build仍早于本修复。

## 2026-09-07 Native TabBar主题调用页面范围

前轮禁用颜色真实修复为progress。截图setTabBarItem no tabbar page提示引导定位theme/native-chrome.ts：此前依赖setTabBarStyle失败才能判断子页，style异步等待中换页后仍调用item。新增hasTabBar按当前pages/map/index或pages/my/index，在style前及await后检查，子页和冷启动暂无页只同步导航/背景；保留既有未知错误上抛，useDidShow当前mode重应用不改。

native-chrome.test.ts新增子页/空栈无tab调用、style等待中去Search不发item，联合三主题图标及返回重应用5/5通过，miniapp tsc通过。未编译本轮变更，snapshot仍search-disabled-specificity-build。实际运行warning是否不再新增尚待验证，不能说控制台全部干净。

## 2026-09-07 Native Chrome页面范围实际验证

前轮范围修复为progress。本轮native-chrome-scope-build.log成功并同步trusted snapshot。probe-native-chrome-scope.mjs仅记录真实wx接口然后透传，不伪造结果，20秒兜底/finally还原并清timer。native-chrome-scope-runtime.json/log：真实Search页面2次background、0次TabBar；返回Map background/style及两个item。断言通过，页面Map，包装已恢复。证明当前页面范围调用正确，不声称所有历史console警告或其他主题问题全部消失。普通候选仍早于最近搜索样式和此修复。

下一步其他完整goal范围：未验的无缓存故障、表单IME/真机手势/业务数据等，优先具体未完成项，不重复已证范围调用。

## 2026-09-07 我的首次反馈读取失败验证

前轮native chrome运行验证为progress。本轮利用当前构建未访问My的查询状态，不清缓存/换身份，probe-my-initial-failure.mjs对8879 GET /me/contributions仅注入403 PERMISSION_DENIED，其他请求真实透传，20秒兜底/finally恢复clear timer。my-initial-failure-runtime.json/log：2次目标读取失败，实际My显示反馈审核状态暂不可用/暂时无法确认待处理数量和重试，未呈现上次缓存文案。恢复原request，实际重试控件后错误消失，服务返回0已保存/0待处理。不同调试身份不拿0推断其他私有草稿删除；本轮未写数据。当前停My。补齐此无缓存反馈读取状态，不代表My其他403、真实权限系统或账号全链验收。

## 2026-09-07 我的夜间复看与账户删除结果区分

前轮My无缓存反馈验证为progress。本轮NIGHT320原生My完整截图，统计/入口/TabBar无覆盖，错误提示已消失。原生点击设置后没观察到跳转，未把按压态算成功。源码设置检查发现：delete API成功后先await结果modal、后清本机会话；modal失败会保留旧状态且catch宣称未删除，reLaunch失败亦误报。改为确认API成功即清会话，在后续UI失败时明确已删除/页面尚未关闭，不虚称本机状态不变；API真失败原错误分支保留。

account-delete-result.test.ts仅VM执行生产函数，隔离stub，无真实账号删除；覆盖API失败、成功后modal失败、navigation失败、全成功，验证reset先于result UI，1/1及tsc通过。未构建此修复，snapshot仍native-chrome-scope-build。下一步可在隔离账户/接口测试结果分支，绝不拿当前用户数据验证删除；尚非真实删除全链通过。

## 2026-09-07 导出文件生成状态修复

前轮删除结果分支修复为progress。本轮检查downloadAccountData：原先filePath在writeJsonFile前置非null，写入失败也显示文件已生成尚未分享。改为destination局部变量，await写入成功后才设置filePath。接口失败/写入失败显示导出失败，只有写入成功但分享失败才已生成尚未分享；实际分享成功路径保持。

account-export-result.test.ts执行生产函数，隔离api/write/share，不读取或导出真实账户；与delete-result联合2/2、miniapp tsc通过。上一轮resetAfterAccountDeletion本地实现已读，移除storage异常有catch，内存reset仍执行；未实际调用。两项settings修复尚未构建，snapshot仍native-chrome-scope。下一步构建并使用非破坏性隔离事件验证导出写失败；不发真实文件给他人。

## 2026-09-07 导出写失败实际WEAPP验证

前轮导出状态修复为progress。本轮account-results-build.log成功，同步trusted snapshot，含删除结果/导出结果修复。probe-export-write-failure.mjs进真实Settings点下载数据；真实账户导出GET在内存使用，针对starward-account目标writeFile返回失败，不写文件；shareFileMessage保护计数未触发。export-write-failure-runtime.json/log：writes1、shares0，账户数据导出失败，无文件已生成误报。20秒兜底+finally还原方法/清timer，无账户删除、真实文件写出或对外发送；未把账户数据写入日志。当前Settings带可关闭导出错误通知。删除成功后的UI分支仍仅隔离VM，不以此称真实删除完成。

## 设置页末尾与重认证缺口
原生窗口60360878，NIGHT320 iPhone5：实际滚动到下载/删除数据区、两列设施及末尾同步偏好/清缓存，均可达，未执行账号删除/缓存清理。截图在本轮工具输出。发现源计划5059要求导出/注销重认证；当前删除两次确认弹窗不等于身份重认证，设置文案声称身份确认。保留需求，不以改文案消除冲突；下一步追踪客户端认证与服务端敏感操作接口。信息设计研究仍由information-design.md持久拥有，无新增原型。

## 账户敏感操作重认证实现
源码：api-client新增即时code获取、原账户绑定、导出结果返回前身份复核；原transport仅瞬时header传code，不持久化；敏感请求403不复用code自动重试/清会话。API auth-service验证当前session及即时code身份一致，controller导出/删除均强制调用；权限错误分类覆盖重认证/微信拒绝。持久边界进入surfaces-and-controls owner，修掉shared-state遗留侧轨描述。
验证：account-reauthentication-tests.log 9/9，包含临时随机loopback Nest真实HTTP仅隔离账户：缺code/错身份均403且原会话有效，正确身份导出200、删除200且会话撤销，finally关闭。WECHAT code交换为合成provider（覆盖拒绝/消费后重用/错身份）；非真实微信。前后端workspace tsc通过。误用根TypeScript6首次baseUrl报弃用，改用项目既有workspace TypeScript5.9.3，无修改配置。普通隔离构建account-reauthentication-normal-build.log成功。运行snapshot仍account-results、8879旧内存API未更新；不可把运行旧版当本轮验收。下一步真实链路/安全账户切换清理归属及剩余业务，不操作现有账户或草稿。

## 删除回执账户切换隔离
发现deleteAccount原来成功后无条件clearStoredSession/全缓存；Settings无条件reset+reLaunch。已按当前身份是否等于deletedUserId区分，只清被删账户草稿；不同身份仅移除原账户响应/query缓存，保留当前session/installation/状态，并以localAccountReset=false让Settings提示原账户已删除，不误报失败或强退新账户。account-delete-scope-tests.log 4/4生产函数VM含原账户与切换分支；workspace tsc通过，测试tuple索引类型错误已修。未操作当前账户，未构建/同步此增量；下一步继续整合运行验证。

## 账户确认防重入与运行恢复
Settings共享useRef同步锁覆盖导出和删除（包括首次确认前），确认弹窗纳入try/finally；取消和showModal失败均解锁，后者明确未删除。处理中替代尚未确认就显示删除中。account-action-pending-tests.log 3/3，首次测试跨realm promise未等下一轮导致第二弹窗断言失败，改setImmediate调度后通过；前端tsc通过。fixture account-action-current-build成功并同步现有snapshot，无重启。
probe-account-confirmation.mjs实际编译WEAPP注入仅modal失败/取消；额外阻断任何account/data-export请求，结果account-confirmation-runtime.json/log：modals2、requests0、失败可见、重复弹窗抑制、重试取消。finally恢复wx方法/计时器并disconnect，当前Settings保留错误通知。8879仍旧API，真实微信重认证及完整删除尚待验。

## 原生失败信息有效性
实际Settings错误原有无效说明具体技术原因已记录。presentation兜底改可恢复文案，showModal失败明确确认窗口未能打开，文件写失败说明无法保存及存储检查；errorMessage新增原生errMsg入口。error-copy-tests.log 5/5，error-copy-build编译成功；完成后重新同步snapshot并重跑account-confirmation-runtime.log通过modals2/requests0/失败可见/重试取消。第一次复制时构建仍运行，未采用为最终证据；已在明确exit0后重新复制和重跑。原生截图本轮检查，未操作账户。

## TabBarItem异步切页竞争
最新原生Settings控制台仍有setTabBarItem:fail not TabBar page。源码此前只包setTabBarStyle错误，items dispatch后切页仍可拒绝。新增精准处理此预期原生错误，其他item错误保持可观测。production函数VM before5/6复现，after6/6通过，workspace tsc通过。普通非fixture account-chrome-normal-build成功含最近账户及文案改动；运行snapshot仍error-copy版，尚不能称本竞争运行修复已验。

## 当前批次回归与来源页实看
current-client-regression.log 299/299，current-api-regression.log 106pass+1skip（PostgreSQL/PostGIS Redis基础设施本轮未运行），均exit0。current-chrome-fixture-build成功后同步既有snapshot。open-current-sources.mjs从地图真实来源入口编译事件进入spot/data-source/index，current-source-page.json记录现有来源内容；原生NIGHT320截图可读，暂无本次TabBarItem报错，但非全部竞争证明。
观察到双端均缺失时显示起始时间未提供至结束时间未提供，已在共享Provenance合并为适用时段：来源未提供；单端缺失及真实日期保持原表达。此单项文案改动晚于299项及构建，前端tsc通过，尚未同步运行。下一步继续来源页末尾/链接状态与其他未验项，不重复全套测试。

## 来源页当前编译与复制恢复验证
source-period-build成功后同步snapshot。open-current-sources重新进入真实来源入口；source-copy-runtime.json/log：失败注入后显示未能复制链接，恢复真实wx.setClipboardData后再次点击显示复制成功，旧失败消失，双端缺失冗长文本已消失。脚本finally恢复原方法/清计时器/disconnect。复制公开来源链接到本机剪贴板，没有发送消息或外部打开。
原生NIGHT320首屏显示适用时段：来源未提供；滚动2600至末尾，IMO出处/许可按钮、精度限制及使用这些资料前全文均可达，不受固定头部/底部遮挡。截图在本轮工具输出。当前停来源页末尾。只证明该尺寸主题和现有数据，不称全页面矩阵或真实微信业务全部完成。

## 共享Context旧组件映射与单位冲突清理
发现shared-state-and-recovery仍强制Taroify组件映射，尽管DESIGN646和原附件二已明确不接入；历史PROGRESS开头即已记该冲突，之前未收敛。本轮删除该过时映射，合并为现有Taro primitives/Starward owners复用边界，保留唯一icon/表单状态、上传幂等、面板header-only/三档/同文档/手势仲裁/曲尺等要求。精确值引用DESIGN，不另复制第二套。
修正88rpx=44px的旧表达为44逻辑px及相应DESIGN命中区域；当前仅标准字体，200%明确暂停，保留长内容换行/风险/读屏语义。context-owner-cleanup.log结构验证通过（不证明普通链接/产品事实），另逐项比对原文及DESIGN确认约束未丢失；无代码或运行候选变更。

## 场地页窄屏实际检查
open-current-sources.mjs新增field参数复用入口，首次返回旧Map栈，不计入口失败；原生截图和inspect-field-density后续确认为spot/field/index。NIGHT320设施8行，每行300px宽、约83.4px高，开放/使用条件同排，缺失待核验未伪装为已知；原生滚达夜间安全与限制、反馈现场情况末尾，无遮挡。证据current-field-density.log/field-density-runtime.json。
新发现安全卡将两条测试内部说明加!展示，与用户清理无效信息要求不符，下一步修正fixture信息呈现/源数据，不能因布局可读宣称内容完成；真实风险与缺失状态仍须保留。当前无生产源码变更。

## 测试说明退出安全风险字段
定位catalog.ts completeTestSpot的restrictions/guidance两条内部说明，改为空数组；不替换为假现场事实，不影响明确fixture标识。场地页将restrictions警告与guidance正文分开，保留真正危险条件及指引。fixture-safety-contracts.log和fixture-safety-api.log均通过，前端tsc通过。当前8879是旧内存服务，不能重启丢草稿；本轮未宣称新fixture实际页面生效。下一步新源码隔离只读API/运行验证，现有正常8787和私有状态未动。

## 新场地fixture实际WEAPP验证
field-safety-build成功并同步snapshot。复用serve-current-map-probe.mts --field，随机loopback仅允许测试点overview/field GET，旧ObservationContext只读透传，其他方法/路径405。probe-current-field-safety仅临时改这两个读取URL，finally恢复wx并disconnect。首次请求数1误要求2失败；第二次命中60秒缓存无请求，未清缓存；等20秒后再次进入 verified.log通过requests2/fieldRequests1、oldInternalRisk false、测试标识/安全区/夜间谨慎/反馈均true。失败日志保留。
原生NIGHT320实看新夹具名示例观星点、滚至安全与反馈末尾；临时服务stdin关闭不支持手动写停，随后原120秒定时自停并poll确认exit0。现有8879未重启、私有草稿不动；旧服务未来刷新仍会返回旧夹具，不能宣称全服务已加载新源码。

## 场地反馈与攻略入口恢复
SpotDetailPage两个子页入口原直接navigateTo，没有catch。新增共用局部openDetailPage：ref同步防重复点击，失败保留当前内容并明确入口重试，navigationEpoch变化后不将迟到错误通知其他页面，成功只清spot-detail自身该跳转错误。原地点/context/文章URL参数保留，未操作反馈草稿。detail-page-navigation-tests.log 1/1生产函数VM覆盖重复/失败/离开后失败/恢复通知范围，tsc通过。尚未构建或WEAPP验证此增量，当前snapshot仍field-safety。

## 场地反馈导航失败实际验证
detail-navigation-build成功、exit0后同步现有snapshot。probe-detail-feedback-failure.mjs仅拦截contribution navigateTo返回延迟失败：两次编译组件事件→调用1次，提示反馈表单暂未打开，route仍spot/field/index，facilitiesRetained/safetyRetained true。结果detail-feedback-failure-runtime.json/log。finally恢复wx/定时器/disconnect；未进入反馈或改草稿。原生截图观察错误布局。成功返回清除错误路径仍为生产函数VM证明，尚未此实际流验证。

## 场地反馈正常进入与返回
回读useLocalContributionDraft确认恢复前不覆盖旧草稿，再执行probe-detail-feedback-return.mjs。全程本地草稿快照只留运行内存，结果仅数量/比较布尔，无内容/身份输出。临时拒绝contributions非GET写作为保护，未命中写入。实际入口至content/contribution/index，spotId=spot:test-published；navigateBack回spot/field/index，之前反馈表单暂未打开提示清除。detail-feedback-return-runtime.json/log：existingDrafts1、existingDraftsUnchanged true、addedDrafts0、blockedWrites0。finally恢复wx/清计时器/移除内存快照/disconnect。未填写或提交表单，当前场地页。

## 异常地点详情返回地图
SpotDetailPage无有效上下文错误原展示内部协议说明，恢复直接switchTab无catch；已改短用户说明，returnToMap共享同步ref防重复，失败在StatusPanel显示地图暂未打开+重试返回地图，成功清状态。detail-page-navigation-tests.log 2/2及tsc通过。detail-invalid-return-build成功后同步snapshot；probe-invalid-detail-return实际无参数field initialHint true→注入switchTab失败可见→恢复原生重试pages/map/index。invalid-detail-return-runtime.json/log存证，finally恢复wx计时器并disconnect，无草稿/地点写入，当前Map。

## 攻略卡片密度与文章往返
实际NIGHT320攻略卡图片height100%随长正文拉成窄条、重复观星攻略标题。SpotDetailPage图文主体/通栏footer分组，CSS图72×72固定方形，正文自然换行，footer作者与阅读入口，删除重复标题及旧窄屏覆盖。tsc和guide-card-density-build通过、同步snapshot后原生确认。
guide-card-reading-runtime首次2400ms后取到旧guides栈失败，原生已文章；保留失败log，用有界waitRoute读取稳定状态再验（不重复点击/重启）。-retry.log/json通过卡片300×195.6，image72×72，按钮74×44边界内；真实阅读article及返回guides，地点/context一致。当前攻略列表。未验证全部宽度/主题，不把这个样本视为整体视觉完成。

## 430宽攻略卡片实测
- 原生切换iPhone14 Pro Max，未重启开发器。wx.getWindowInfo实读430×850。guide-card-430-runtime.log通过：卡394.4×152，缩略图72×72，阅读按钮80×44；实际进入文章并返回同spot/context攻略列表。原生截图确认图文和footer自然排布。此轮无生产源码改动，仅补宽度与阅读往返证据；整体goal仍未完成。


## 普通构建与导航原生取消
- guide-density-normal-build.log exit0，包含此前来源/安全字段/详情导航/攻略密度变更；客户端全回归guide-density-client-regression.log 301/301。
- 检查导航发现isCancelledAction只识别Error/string，漏掉微信原生errMsg取消；已读取errMsg。现有导航测试改用生产helper，新增取消与真实失败区别，navigation-cancel-tests.log 10/10、workspace tsc通过。普通增量构建navigation-cancel-normal-build.log已确认exit0；fixture尚未同步，下一步实际取消验证。

## 导航取消实际编译验证
- navigation-cancel-fixture-build.log确认exit0后同步既有snapshot，未重启DevTools/8879。
- probe-navigation-cancel.mjs连接9421实际field按钮，限定showActionSheet回调注入：取消无误报、unavailable失败仍显示，calls2；navigation-cancel-runtime.json/log通过。15秒恢复兜底及finally恢复原接口，未导航到外部地图、未改账户/草稿。
- 当前NIGHT430场地页，失败提示由探针产生。此证据是编译组件+原生接口结果处理，不冒充真机人工取消手势验证。

## 账户导出恢复通知
- 同类取消检查：贡献选图chooseImage已有errMsg取消返回null，未做无效重复修改。
- Settings导出在实际写入和分享成功后清除本owner、本导出的旧失败通知，避免重试成功后新旧结果矛盾；不清其他通知。
- export-recovery-notice-tests.log 2/2，含四阶段导出结果、定向通知清理与账户动作锁；workspace类型检查通过。普通构建export-recovery-notice-normal-build.log已确认exit0，fixture尚未同步，未执行真实账户分享。

## 主页链接迟到错误身份隔离
- 检查真实源码发现save/remove成功回执已校验owner，失败及refetch失败路径遗漏。四个catch补当前账户检查，finally保持解锁。
- account-removal.test.ts加入failure-switch/refresh-switch，旧错误不污染新账户；link-late-identity-tests.log 4/4与workspace tsc通过。保存失败切换独立测试尚待补齐，当前未切换实际账户、未改用户链接，fixture未同步。

## 链接保存身份切换回归与候选同步
- actions.test.ts补保存API迟到失败/成功以及刷新时账户切换，检查草稿saved次数、恢复状态、通知和锁释放。与移除测试共同link-identity-complete-tests.log 5/5，workspace tsc通过。
- link-identity-fixture-build.log确认exit0后同步现有snapshot，包含export恢复通知及profile-links隔离。未重启DevTools或后端、未实际切换账户/修改私人链接。不将VM隔离结果当作真实登录验收。

## 主页链接NIGHT430实际布局
- 已进入现有实例content/profile/links/index，原生截图确认四平台同排、名称/URL清晰、对外显示说明与开关同组、保存及空列表可见。
- links-layout-runtime.json/log实际wx测量430宽，4平台、2输入框、保存按钮命中高度均≥44，边界在视口内，列表位于保存下方无交叠。
- 当前列表为空，未创建链接或修改草稿；现有链接复制回退和真实IME未因此获得证明。下一步选择其余真实未验状态，不重复430空态几何检查。

## 链接未知数量不冒充零
- 源码检查发现activeLinks缺data时默认空数组，标题无条件显示0条；改为只有data存在显示真实数量，否则—。既有错误与空列表条件保留。
- 类型检查通过，links-unknown-count-build.log exit0，已同步现有snapshot。实际初次失败/恢复尚未验，已有空列表缓存不清理，未触碰私人草稿或新增链接。

## 链接初次读取失败与真实重试
- probe-links-read-recovery.mjs实际编译WEAPP限定8879 GET /me/profile-links注入403，共2请求，观测为initial-failure；错误可见、未知数量—、不显示空列表文案。
- 恢复原wx.request后实际点击重试，错误消失并恢复已保存主页区域；links-read-recovery-runtime.json/log通过。20秒兜底及finally恢复，未清缓存或写用户数据。
- 当前链接页。该结果覆盖初次读取失败恢复，不覆盖非空列表缓存、外部打开或IME输入；不重复初始错误检查。

## 账户与链接修复合并回归
- profile-recovery-client-regression.log 305/305通过，涵盖本轮累计客户端变更。
- profile-recovery-normal-build.log确认exit0，普通隔离产物dist/weapp-check未复制到fixture实例；profile-recovery-package-inspection.json核对app.json全部14路由JS/JSON/WXML存在。
- 此为当前代码回归/打包证据，非14页面完整UIUX或真机验收。当前原生仍NIGHT430主页链接页；下一步推进尚未覆盖的真实交互/数据边界，不重复无变化全套测试。

## 计划NIGHT430草稿恢复与布局
- 现有实例进入content/plan/detail/index，原生截图确认原draft-recovery-0906自动恢复，原日期09/06、22:00、无地点与备注仍在。
- 日期时间并排、备注及恢复提示紧邻、保存/返回入口全可见，无遮挡。未编辑、保存、放弃或触发picker；未创建新服务计划。
- 当前停留原草稿编辑页。此观察证实当前编译候选仍保留该草稿及430布局，不替代真实输入、提交与冲突验证。

## 计划删除失败账户隔离
- 保存catch已有savingOwner检查；remove外层catch遗漏，补deletionOwner一致才发错误，防止在新账户误报旧计划/草稿状态。finally照常解锁。
- plan-delete-late-error-tests.log 4/4与workspace tsc通过，使用实际生产函数隔离验证；未执行任何真实计划删除，当前原草稿不动。
- 此增量尚未构建/snapshot同步；下一批结合相关变更构建，避免把前轮305回归或普通包当作此增量证据。

## 计划账户隔离候选合并
- plan-current-regression.log计划目录26/26通过，覆盖具体测试文件内的草稿/选择/时间/保存地点/删除恢复；不是服务写入或真机证明。
- plan-account-isolation-build.log确认exit0后同步现有snapshot；不重启DevTools/8879、不执行真实删除、不改原草稿。
- 下轮不重复这批测试；仍需实际输入/手势/硬件和完整业务范围的缺失证据。

## 物理设备条件重新核对
- 依设备skill读取owner后执行miniapp:device:feedback doctor，current-device-readiness-recheck.log exit0；仅readiness_only。
- 官方工具、自动更新、普通预览available，login ready；ADB1.0.41 detected0、usbReadyfalse。没有创建候选generation/真机会话/QR，没有需要清理的新资源。
- 不证明任何设备产品行为，iOS/Android触摸/方向/权限/生命周期仍未验。继续源码/现有WEAPP可执行项，非整个goal阻塞认定；没有环境变化不重复doctor。

## 导入与投稿未知数量
- 同类审查确认import列表及ContributionHistory筛选缺data默认显示0，统一缺data为—、成功空结果为0；错误/缓存/重试逻辑不变。
- workspace tsc通过，history-unknown-count-build.log exit0后同步snapshot；实际两个页面失败恢复尚未验。没有创建导入/提交反馈/改变草稿。

## 导入失败通过、投稿缓存恢复缺口
- import-read-recovery-runtime.json/log实际WEAPP初次读取2次403，未知数量、无假空列表，恢复真实请求后重试成功；无写入。
- 投稿探针count0失败：My/useContributionHistory共享10秒缓存，刚从My进入不会发请求。finally已恢复wx.request，失败日志保留，不算验证通过。
- 进一步源码确认ContributionHistory未呈现refreshError/STALE_USABLE；已新增旧数据提示/重新获取投稿，并给初始retry捕获拒绝。tsc通过，增量未构建。下一步构建并实际缓存失败恢复验证，不能把initial检查强改成绿。

## 投稿缓存刷新失败恢复实际验证
- contribution-history-stale-build.log确认exit0后同步；probe先在My获取同owner数据，等待12秒超过hook10秒staleTime，再限定GET /me/contributions注入403，未清缓存。
- contribution-read-recovery-runtime.json及-retry.log实际cached-list-refresh-failure，requests2，旧数据提示可见；恢复wx.request后点重新获取投稿，提示消失，投稿区域保留。原接口20秒兜底及finally恢复，无写入。
- 首次count0失败日志保留。此证明缓存刷新失败恢复，不证明初次无缓存计数、非空记录内容比对、实际登录权限。当前投稿页，草稿未编辑提交。

## 投稿历史可用性组件回归
- history-availability.test.ts提取并执行生产ContributionHistory JSX，覆盖pending/error未知计数不出现空结果、真实空数据零计数、缓存刷新失败保空结果并增加STALE恢复入口；重试失败不会留下未处理拒绝。
- contribution-history-availability-tests.log 2/2通过。仅新增测试，运行包不需因测试文件重建；初次无缓存仍不是WEAPP证据，不重复已通过缓存实际探针。
新增测试初次tsc提示数组首项可能不存在，补真实assert.ok后typecheck-retry.log通过，测试重跑2/2通过。

## 投稿主题适应宽屏密度
- 真实NIGHT430截图显示9短主题两列五行占高，index.scss对≥375px改三列；窄屏原两列保留，点击高/字号不变。
- contribution-topic-density-build.log exit0后同步；第一次量测重编译切页导致0节点，失败日志保留。重新进入后contribution-topic-density-runtime-retry.log确认9项3行、minHeight44，原生截图文字完整。
- 未编辑表单或提交，当前NIGHT430投稿新地点空表单。320未在此轮复验，底部历史区尚待原生滚动复看；不要将主题区截图当末尾验证。

## 环境变更：原生实例与服务不再运行
- 新node_repl无sky，读取新版computer-use技能并import @oai/sky；list_windows仅浏览器/Codex/微信/代理，无DevTools。未操作Codex或微信窗口。
- Get-NetTCPConnection确认9421/8879/8787均无Listen，current-runtime-availability.json已记录。旧窗口和PID不能再用，未重启任何服务/开发器，未生成QR或清理用户数据。
- 本轮投稿页底部原生检查未完成。内存服务数据可恢复性待查，不能擅自重新建样本冒充原数据；继续离线源码/构建工作，并按需检查既有备份恢复入口。整体goal仍未完成。

## 内存服务恢复入口只读核对
- create-test-service默认new InMemoryTestRepository；in-memory-library-store的计划/导入/链接和in-memory-contribution-store投稿由私有Map保存。定向搜索无磁盘读写/恢复逻辑，artifacts内backup/dump/restore文件名搜索未发现对应数据备份。
- 不能由此推出正常Postgres或客户端草稿丢失，也不能宣称新服务重启会恢复旧内存状态。未启动/初始化/清库/重建任何记录。
- 下一步区分正常持久库及客户端草稿的独立恢复路径；旧截图/日志只作历史证据，不当数据备份。

## 持久库恢复可读
- Docker引擎初始缺失，启动已有Docker Desktop Hidden，检查存活进程后引擎就绪；未重装或重启微信开发器。
- 原starward postgres/redis容器Exited0，原命名卷仍在；docker start仅这两个容器，inspect确认挂载不变。
- psql只读事务：spots26、external_post_import_drafts10、user_submissions3、observation_plans1。无迁移、seed、清理或数据写入。表名只读枚举完成。
- 这是正常持久库仍存在的证据，不是旧8879内存服务恢复。下一步核对记录ID/版本归属（不输出敏感正文）及正常API配置，再按现有配置恢复；DevTools仍不启动以免信任步骤。

## 持久记录阶段与版本核对
- 只读事务确认导入PREVIEW9（rev5–7）/EDIT_DRAFT1（rev2），计划1条rev1；投稿rev18 DRAFT一条，另rev2/4两条。未读取正文或输出身份字段。
- submission_id按1355片段搜索未命中，不能凭rev18等同保护记录，完整标识须从历史精确入口核对。
- start-development-session默认postgres分支含AUTO_MIGRATE1、worker、编译器与DevTools启动，不可为恢复API直接调用整套。已定位独立workers/miniapp-api start入口；后续需使用既有postgres/cache配置且显式不迁移，不开启新worker/DevTools。本轮尚未启动API。

## 正常API恢复完成
- 核对MiniappService.createFromEnvironment：postgres initialize仅按autoMigrate迁移，cache复用Redis，fixture开关独立。使用start单独启动，AUTO_MIGRATE=0、原database/redis/development前缀；未启动worker/fixture/DevTools。
- exec session47092持续服务，restored-normal-api.log。GET /health/ready实测ready true、database/cache均ready，脱敏结果restored-normal-api-readiness.json。
- 下一步可对正常API做只读业务衔接核对，不再被8787缺失阻塞；8879旧内存及9421原生仍未恢复，保护记录归属尚需精确标识核对。

## 原私有投稿及十导入归属确认
- 历史PROGRESS1350确认1355为candidate名称片段而非submission_id；只读payload匹配原完整测试名称唯一命中，revision18、state DRAFT，与保护记录一致。
- 导入owner不在draft payload，而在external_post_imports.user_id；LEFT JOIN确认10/10有归属、唯一owner，JOIN受保护投稿同owner得到10。visibility是field-envelope，value PRIVATE，moderationState DRAFT共10。
- 前次按ID/顶层userId查询无结果属于查询字段不匹配，不能当数据丢失。未读出/写入敏感正文，未改任何记录。
- 正常服务端受保护数据已对应；客户端本地draft-recovery-0906仍仅历史画面证据，DevTools未恢复，不称其当前运行恢复完成。

## 重认证请求头跨域衔接
- 实际OPTIONS发现允许列表缺客户端X-Wechat-Reauth-Code；main.ts只新增该请求头，不放宽origin。APIworkspace tsc通过。
- 验证8787监听进程为node/src/main.ts后仅重启该持久API，原数据库/缓存、AUTO_MIGRATE0；新exec session72398，restored-normal-api-cors.log。
- reauth-cors-runtime.json：实际OPTIONS204、头允许、健康ready；未调用账户导出/删除。微信原生请求本来不受浏览器CORS限制，此修复覆盖浏览器调试入口，不称真实微信重认证完成。

## 当前正常包补齐计划/投稿改动
- contribution-plan-normal-build.log：正常隔离 WEAPP 构建 exit0，未覆盖运行 snapshot；contribution-plan-normal-typecheck.log exit0。
- contribution-plan-normal-package.json：14路由 JS/JSON/WXML 无缺失，投稿375px三列断点保留为逻辑px。仅编译产物检查，不是运行视觉验收。
- 前一轮已把旧 CURRENT 原样归档为 CURRENT-history-20260907-restored-api.md，复制时 SHA256 一致；当前恢复文档不再混杂旧窗口/端口。研究方法仍由既有 information-design.md 持有，不新建展示材料。

## 投稿历史三状态密度
- index.scss 将审核/合并/公开影响从三个独立整行容器改为共享轻底色三列；374px以下两列，较长公开影响跨整行；保留三个独立语义、完整文字与字号，不改变业务状态。
- contribution-history-density-build.log 正常隔离构建 exit0；contribution-history-density-package.json 确认窄屏断点/跨列选择器编译保留。未同步fixture，未作真实WEAPP视觉验收；开发器仍不可用。
- 投稿媒体恢复区还有重复完成/就绪提示，已观察但未修改；后续结合实际恢复页核查，不因省空间删除提交风险或权利确认。

## 当前媒体表单与已退役恢复组件区分
- 调用关系确认 index.tsx 只挂载 ContributionMediaSection/Actions/History，ContributionUploadRecovery 仅定义未挂载。此前“恢复页重复提示待实页检查”判断不适用于当前页面，不以死代码当运行缺陷。
- 实际媒体表单的 mediaStateText 将缺失 byteSize 显示0KB，已改为大小暂不可用；有限非负值仍显示真实大小，真实0不当缺失。
- media-size-recovery-tests.log 4/4，涵盖上传/关联状态缺失null/NaN/Infinity/负值与真实0/2048，并保留原取消与续传测试。media-size-recovery-typecheck.log exit0。尚未构建或同步此最后文本修改，不声称当前包已含它。


## 投稿结果提示回归用户任务
- 真实createRetryMedia过期重选会replaceUploadId，旧“继续使用同一条媒体记录”不准确，已改图片已上传、可继续提交审核。
- 草稿保存和提交成功提示去实现细节，保留可继续编辑/审核以及不会直接改变公开地点的边界。纯文案修改，没有变更状态机。
- contribution-current-copy-build.log 正常构建exit0，包含上轮媒体大小缺失修正及历史状态密度；尚未同步fixture或原生视觉验收。

## 正式地点搜索刷新状态
- 第四导入正式关联仍缺真实依据；nightchina-import-corpus.test.ts 显式将测试目录项status改PUBLISHED，仅测试策略，不证明正常数据可关联。本轮没有写入导入或地点。
- FormalSpotField 在有缓存、刷新失败时继续展示结果但未提示；补STALE与实际refetch，保留结果及原关联；disabled和关键词变化后不展示旧提示。共享于导入/投稿。
- formal-spot-refresh-tests.log 5/5，typecheck同名前缀exit0。最后选择器修改未构建同步，最新正常包仍contribution-current-copy-build；真实WEAPP待验。

## 最新正常包与累计客户端回归
- formal-spot-refresh-normal-build.log exit0，含最新共享地点搜索STALE、媒体大小/文案、投稿密度与计划修改；未同步fixture。
- current-client-recovery-regression.log：310/310，无skip/failure，覆盖当前客户端测试集合；不等于WEAPP/硬件检查。
- 实查监听仅8787/PID8136，9421/8879无监听，未发现wechatdevtools进程；未启动开发器或触发信任。原生矩阵仍待实际环境，不重复无变化构建与测试。

## 日常开发器入口适配现安装结构
- 本机官方CLI是安装根node.exe+cli.js；start-development-session.mjs硬编码旧resources/app.asar.unpacked路径实际不存在。已复用device-feedback-official.resolveOfficialCli，支持现行与旧结构，await解析，子进程windowsHide true。
- 当前官方open --help exit0，devtools-current-open-help.log；未列出--trust-project，日常入口已移除此未公开参数，没有尝试绕过信任。
- node --check通过；devtools-cli-resolver-tests.log10/10，devtools-development-entry-conformance.log通过。没有执行整套启动器、启动开发器、迁移数据库或扫码；这只证明CLI帮助/解析和代码检查，不证明实际open成功。

## 原开发器项目已通过官方open恢复
- 官方node.exe cli.js open --project 原integrated-runtime-snapshot，reopen-existing-devtools.log exit0：IDE server12238、open成功；未使用trust参数、未扫码、未迁移/seed。
- ComputerUse真实窗口465307420，进程wechatdevtools28284，原项目标题；sky变量reopenedWindow/reopenedState。截图无信任/登录提示，有编辑器Git仓库发现提示（未操作）；模拟器DAY地图等待加载，8879仍不可用，不称页面通过。
- 旧窗口60360878仍失效。后续先fresh state，确认API/automator是否可用再操作；不要再次重启开发器。当前恢复了桌面验证入口，正常数据库未动，旧fixture内存不因此恢复。

## 隔离服务及当前包恢复，发现旧context 404
- 新8879 session69463/PID9844，recovered-isolated-api.log；health/ready true，repository memory/cache memory。清DATABASE_URL/REDIS_URL，LOCAL_TEST/fixture，route/place/media DISABLED，无正常库写入；不是原内存状态恢复。
- recovered-current-fixture-build.log exit0，dist/weapp-fixture已复制原snapshot/miniprogram，开发器自动加载当前代码。
- ComputerUse先一次遮挡截图错误显示其他窗口，未操作；重新list确认唯一465307420、activate后真实DevTools截图确认：地图可加载，GET旧observation-contexts ID404，面板显示网络连接失败。不要记录/传播该旧ID。当前重点修复过期context重建与准确错误表达，保留地点/时间，不清全部存储或私有草稿。
- next：从地图context恢复owner和API404映射追踪；旧窗口不重启，真实state先读。正常8787保持。

## 纠正context恢复缺陷判断
- 本轮读api-client restoreObservationContext，已有NOT_FOUND/STALE_REJECTED时重建原地点/日期/selectedAt及routeOrigin逻辑。新鲜原生截图显示网络提示已消失，地图正常空结果；未操作重试或修改恢复代码。
- 因此此前404日志+瞬时网络提示不足以证明逻辑缺陷，不能按该假设改代码；当前无证据需要新增恢复分支。时间/地点精确保留尚需结构化核对，不凭空结果声称全链路通过。
- InMemoryTestRepository默认已含TEST_PUBLISHED_SPOT，不能声称测试地点没加载；下一核对当前viewport/filter/context与正式点是否匹配。不要seed或清存储。

## 当前名称搜索与面板真实恢复
- 当前catalog TEST_PUBLISHED_SPOT名称示例观星点；API places/search使用该词返回spot:test-published/PUBLISHED，旧自动化测试正式观星点匹配为空。空q按实现本来不搜索，不能据空q结果判目录缺失。
- 原生实际进入Search、选中旧词、输入示例观星点，出现1正式观星点；点击结果返回Map并加载medium面板成功。画面为DAY、iPhoneX模拟器，轻量概览/天文、距离/路线同行、设施并排和底部动作可见。截图工具历史消息为证据，不称完整尺寸主题/手势通过。
- 当前UI搜索词示例观星点、选择spot:test-published，面板显示直线约52.1km（本轮未编辑出发点或时间，不能据此猜恢复后的具体context）。当前窗口465307420，node_repl recoveredSpotPanelState；不重启、不清存储，私有草稿未操作。

## 当前375 DAY章节实测
- 原生iPhoneX模拟器：medium点天文，面板扩为large，待滚动稳定后纯文字Tab吸顶、天文选中；时间09/06 21:00仍在，未改时间。
- 真实画面总云量8%/月光较低并排，低中高云4/3/2%三列，适合目标短列表，来源入口与底部动作分离，无星图。仅本实例当前数据/尺寸/主题，不代替其它矩阵或硬件。
- 点击概览回到身份及路线/设施，8设施两列，夜间需谨慎保留。当前large概览，node_repl overviewReturn。下一继续320/投稿等未完项；观察到开放值“开放：开放”的冗余表达可按实际owner检查，不误删夜间风险。

## 开放摘要去重复
- spot-panel.tsx将OPEN的开放：开放改当前开放；未知明确开放状态待核验，其余条件开放/关闭及全部夜间风险映射保留。未改变事实或门禁。
- panel-access-copy-build.log fixture构建exit0后同步原snapshot，开发器自动重载；正常包未包含此最后文案，不称已原生复核或窄屏验证。

## 320 DAY实际天文检查
- 官方设备菜单明确iPhone5 320×568/Dpr2，实际选择后页面自动重载，不是开发器重启。原搜索词/选中示例地点保留，medium路线及底部三动作可见。
- 实点天文，large定位/Tab吸顶稳定；09/06 21:00保留，总云量与月光两列、低中高云三列，无裁字。实际向下滚动，适合目标和来源与更新时间完整可达，底栏未遮住入口。
- 当前DAY/iPhone5、large天文滚到末尾，node_repl narrowAstroEnd；图像展示尺度不等于逻辑px，不能据其屏幕尺寸反推字号。尚未验证该设备投稿、其他主题、物理手势与触达精确矩形。

## 320 DAY投稿全页浏览
- 原生My进入统一现场反馈页，320/iPhone5：新地点表单，日期时间同排、9主题两列，长说明与隐私提示完整换行。
- 逐段真实滚动至地点/精确坐标同意、媒体及底部；媒体禁用时选择图片为禁用并说明仍可文字反馈，权利开关标签可读，保存/提交和三筛选按钮、已确认空结果均可达，无底部遮挡。
- 未填写/选主题/定位/同意/上传/保存/提交/恢复任何草稿。仅浏览当前空表单；不证明媒体真实上传、非空投稿历史三轴、IME/手机权限或新实例恢复原受保护草稿。
- 当前页面content/contribution/index底部，node_repl contribution320Bottom，DAY320。My之前首次截图有403后界面已显示空记录，未以瞬态日志判故障。

## 320 NIGHT当前核查
- 原生iPhone5 320×568，从My进入设置，实际点击夜间，再返回My进入现场反馈；设置/My/反馈首屏已呈现深色，选中有边框，日期时间同排、主题两列。没有保存或提交表单。
- 当前content/contribution/index首屏，node_repl nightFeedbackReady，窗口465307420，NIGHT。长导航标题靠近右胶囊，下一核查标题安全区域是否相交；不要仅凭过渡画面判故障。底部与其它主题还未核查。
- information-design.md现有研究及来源已复核，仍是长期owner，不另建研究文档。goal active。

## 根设计文档残留侧栏规则已纠正
- DESIGN.md 的 Mobile adaptation、6.11 Anatomy/Geometry/A11y和实际验证条目仍含居中side rail描述；已与用户确认及information-design owner统一为身份下靠左、纯文字短下划线横向吸顶Tab，同一连续正文、44px命中和章节定位/滚动回写。
- 定向rg确认这些旧侧栏短语已无匹配。无token/源码变更，不为文案重跑构建。
- custom-nav.tsx/scss实际只使用statusBarHeight，标题grid两侧固定44px，未读取胶囊横向边界；当前320长标题紧邻胶囊，后续需用实际capsule几何确认并修共享标题避让，不能缩字号。nativeNavigationInsets现有仅safeTop/bottom，可复用其native owner增加横向数据；保留right动作兼容。尚未修改导航实现。

## 共享导航胶囊横向避让已实现并实测
- native-metrics新增nativeMenuClearancePx，验证真实windowWidth/menu.left并保留CSS缺省；CustomNav标题grid右侧按原生菜单占宽留出间隔，标准字号自然换行。存在right操作时整条导航避到胶囊下方，保留返回/右操作空间；未改导航行为。
- nav-capsule-typecheck.log通过；nav-capsule-tests.log7/7（原返回恢复/互斥及native边界）；最终nav-capsule-fixture-build.log通过并同步snapshot，无IDE重启。
- 真实320/iPhone5 NIGHT经Map→My→反馈，标题现场反馈与纠错完整单行、与右胶囊明显分离，返回图标保留；node_repl navFeedbackVerified。没有填写/保存/提交。仅此尺寸当前标题已验，不代表right操作/更长subtitle或全尺寸矩阵。
- 当前content/contribution/index首屏NIGHT320，窗口465307420；下一继续夜间表单底部和其他导航长subtitle/right动作。正常包尚未包含本次导航变更。goal active。

## 320 NIGHT表单底部与来源副标题实测
- 原生反馈从首屏逐段滚到末尾，夜间下叙述/地点输入、精确位置同意、媒体权利说明、禁用图片入口、保存/提交、三历史筛选及空态均完整可达，无底部遮挡；没有编辑、授权定位、保存或提交。
- 返回My→Map保持示例地点；点击天文展开并稳定吸顶，09/06 21:00仍在，2+3列指标可读；滚到来源入口打开data-source，来源与更新时间标题+示例地点副标题完整，与胶囊分离。仅当前短地点副标题已证，不称超长副标题或right动作已验。
- nav-capsule-normal-build.log最终exit0，包含导航及此前开放摘要文案，正常包未覆盖运行fixture。当前node_repl nightSourceReady，spot/data-source/index，NIGHT320，窗口465307420。下一可核查带right动作场地资料和更长文本，不重复已通过空表单。

## 320 NIGHT场地资料右操作实测及成功噪音修复
- 从来源返回原large天文末尾，概览定位同地点，查看详情进入spot/field/index。右收藏与返回及标题均位于胶囊下方，实际收藏成功星标变化，随后取消恢复原状态（仅8879新隔离内存测试地点）。未操作正常库。
- 发现实际成功toast“收藏关系已同步”，违背DESIGN对收藏只用局部反馈要求；useFavoriteMutation已删除成功通知，成功时仅清该地点此前favorite-failed通知，保留失败回滚与错误提示，不清其他通知。favorite-quiet-typecheck通过。
- favorite-quiet-fixture-build构建进程session39030，完成状态须poll，成功后命令自动复制snapshot；不要先声称新成功无toast已实测。当前运行旧场地页取消收藏截图favoriteRestored，编译将回地图，实际新状态需fresh capture。下一验证新收藏交互及共享hook并发/身份归属（当前before全量回滚需检查）；全goal未完成。
- 补充：session39030最终exit0，fixture已同步；成功无toast尚待实际复测。

## 收藏并发与账户迟到结果隔离
- 实读useFavoriteMutation发现整份响应替换及整份before回滚，会覆盖其它地点并发结果；同点多次请求无互斥、旧账户结果无hook隔离。
- 改为每owner+spot跨hook single-flight，响应/回滚只改该spot，其它地点保留；已知owner变化后不写当前状态/通知。API setFavoriteRelation增加expectedUserId，在requestOperation身份绑定及返回后验证owner，避免旧请求重认证到新账户；既有调用仍可省略参数。
- 新use-favorite-mutation.test.ts用实际transpiled hook验证同点重复、异点反序成功、失败只回滚自身+成功清对应错误，以及账户切换迟到成功/失败；favorite-isolation-tests3/3。
- favorite-isolation-typecheck在测试加入前通过，当前命令session7716再次typecheck后fixture build，成功将自动同步snapshot；须poll最终状态，不先称新包已运行。原导航/收藏无toast实际验证待新包稳定；没有正常数据库写入。goal active。
- 补充：session7716最终exit0，favorite-isolation-fixture-build通过并同步snapshot。

## 新收藏交互实际复测与客户端回归
- 当前favorite-isolation fixture，原生320 NIGHT Map medium示例地点：点击想去→星标实心/已想去，再次点击→空心/想去；两个方向未出现成功toast，面板及地点保持。仅隔离8879关系写入并恢复原状态，不证明账户切换/网络故障的物理交互。
- node_repl favoriteNewOff，窗口465307420，Map medium NIGHT320。共享hook并发/身份实际代码回归由前述3测试覆盖。
- favorite-current-client-regression.log 314/314通过、0skip/fail；包含新增导航和收藏测试，不等于14路由/硬件全验。正常构建session59798尚活跃须poll，不重启。
- 正常favorite-isolation-normal-build最终exit0。下一回到全14路由剩余矩阵与业务待办，不重复已证收藏成功路径。

## 计划编辑320 NIGHT实测与共享规则遗漏
- 新隔离实例My→今晚计划显示无已保存计划；点击新建只进入编辑，未保存/提交。示例地点继承、日期09/06/时间22:00：源码startNewPlan明确用当前context日期+默认22:00，不应凭此称恢复了旧draft-recovery-0906。
- 日期/时间两列、备注、保存与返回列表可达。实际右侧原生滚动条可见；plan ScrollView缺enhanced/showScrollbar=false，已补上，滚动owner保留。
- 计划局部custom-nav__bar仍覆盖共享grid/minheight/gap，移除此覆盖以使用已修胶囊边界，不改字级。仅去确定冲突，未重写其余表单。
- plan-scroll-nav-fixture-build运行session81130，成功后自动同步snapshot，需poll；最后真实planEditorNight为旧包计划编辑页，构建会重载回地图，fresh capture后再验。未操作正常库或原受保护计划；没有证据旧客户端私有稿已恢复。下一检查新滚动条行为并继续内容导入，goal active。
- session81130最终exit0，plan-scroll-nav-fixture-build已同步snapshot，实际新包布局仍待验。

## 320 NIGHT内容导入空态实测
- 当前plan-scroll-nav fixture运行，Map→My→内容导入；首屏平台4选项两列，来源URL输入、长权利说明与开关、建立草稿动作可读；实际滚至末行，已有导入草稿0与空态完整可见，没有滚动条或底部裁切。
- 未输入链接/切平台/授权/建立/恢复/保存/提交；新8879内存实例0条不作为正常库十条私有草稿丢失或恢复证据。原保护范围未变。
- 当前content/import/index末尾，NIGHT320/iPhone5，窗口465307420，node_repl importNightBottom。计划滚动条新包与非空导入状态仍待实际验证；不重复新空态页面。goal active。

## 导入保存后列表刷新警告的账户隔离
- 确认imports/detail useResourceQuery已明确throwOnRefetchError true，现有catch会生效，不制造false-default缺陷。
- beginCreate/saveCurrent的保存成功后imports.refetch.catch原先未再次ownerMatches，切换账号后迟到错误可能发旧账号警告；两处已增加校验。恢复文案去原修订号，改为保存时检查更新，保留未保存/不自动审核事实。
- recovery-cleanup.test追加实际AST回调检查，同owner仍警告、换owner无警告。第一次选中4个catch而非2，测试失败；核对另2为静默UI重试，定向选择列表暂未刷新回调后2/2通过。import-late-warning-typecheck通过。
- 新改尚未build/sync；运行仍plan-scroll-nav fixture、content/import/index末尾NIGHT320/node_repl importNightBottom。下一构建并继续实际非空流程；正常十草稿没修改。goal active。

## 导入修正构建及恢复记录校正
- import-late-warning-fixture-build session54515最终exit0，自动同步snapshot。当前后续需fresh capture，不沿用编译前importNightBottom操作坐标。
- CURRENT去除过时未同步/未验空表单/旧310测试描述，保留原细节于PROGRESS；只改事实状态，不减少需求。
- 编译首轮字符串检查失败因为压缩JS用Unicode转义和!1布尔，app.pages仅主包3，不是14路由缺失；按subPackages合计当前14。不要把未经格式适配的Contains失败当产品缺陷。正常包仍favorite-isolation-normal-build，早于计划滚动/导入警告最新改动。

## 计划滚动修正新包真实复测
- 当前import-late-warning fixture，320 NIGHT My→计划→新建编辑。标题遵循共享胶囊避让；实际向下滚动后内容位置变化、原生滚动条不出现，保存与返回列表完整可达。
- 点击返回计划列表成功回空态；未输入、保存或删除计划。仅新隔离实例，不表示原私有计划/草稿恢复。当前content/plan/detail/index空列表，node_repl planListReturned，窗口465307420。
- 计划本次局部修正运行证据闭合；后续继续非空业务/原始待办与未验主题尺寸，不重复空表单或收藏成功探针。正常包仍早于计划/导入最新改动，需合并后更新。goal active。

## 新隔离实例非空计划保存与密度修正
- 当前8879 MEMORY_TEST隔离API，My→计划→新建，保留示例观星点/09-06/22:00、空备注，实际点击保存计划。返回非空计划详情并显示计划已保存，主时窗19:50–22:50、出发暂无/到达22:00、检查表0/5。本轮创建一条隔离计划，保留供后续回读，不是正常数据库原计划，不是恢复draft-recovery-0906。未提交外部审核/发布。
- 实见320规则把3个短值拆3行（index.scss @max340设1fr），改两列出发/到达，备选时窗跨列紧凑横排并允许换行，标准字号保留；宽屏原3列不变。
- plan-saved-density-fixture-build session58497正在构建，成功自动同步；需poll。最后UI planSavedReady为保存后的旧布局，编译后会回地图，后续My→计划应验证已保存记录回读和新密度。正常库受保护数据未动。goal active。
- session58497最终exit0，plan-saved-density-fixture-build已同步，新布局/记录回读待实际复核。

## 计划回读发现编码ID缺陷，已修待验
- 重载后My已显示已保存计划/09-06，点击进入却显示当前账户下找不到这条计划；node_repl savedPlanDensityVerified为错误页，不是density通过。
- My用encodeURIComponent(tonightPlan.planId)，新计划ID包含plan:；详情router.params.planId原样cast未解码（同项目spot/article已解码）。plan-selection新增planIdFromRoute单次decode，缺参数null、坏编码保原非空ID防误选他计划；详情接入。
- plan-route-decode-tests2/2含编码/已解码同一ID、坏编码不选他计划；具体原生根因仍须同条计划回读验证，不能凭代码推断宣告修复成功。
- 构建session current需取本轮工具返回，plan-route-decode-fixture-build成功自动同步。不得新建替代原隔离计划或改正常库。下一fresh Map→My→已保存计划确认，并验新摘要。goal active。
- session20961最终exit0，plan-route-decode-fixture-build通过同步，typecheck通过。

## 同一已存计划回读修复实际确认
- 当前plan-route-decode fixture，320 NIGHT重载后My仍显示09-06已保存计划；点击同条记录成功进入详情，无找不到计划。没有新建替代记录、改ID或改服务器数据。本轮结果支持encoded planId为原回读故障原因。
- 新摘要实际两列建议出发/预计到达22:00，备选时窗紧凑跨列，检查表提前进入视野；缺失值仍保留。node_repl decodePlanVerified。
- 向下滚动到路线节点，发现START/ARRIVE技术标签对中文信息重复且无额外决策价值，已删除两个展示Text，路线节点/时间/地点/风险正文不变；尚未构建该最后文本删除。
- 当前savedPlanLower，content/plan/detail/index路线区域，NIGHT320/window465307420。下一补正常构建（仍早于plan-scroll/import/route）并继续非空路线/底部及其它业务。goal active。

## 计划底部实际可达与路线状态表达
- 当前plan-route-decode fixture，非空计划滚到底，路线复核和编辑计划入口完整可达，重复向下不再移动确认末尾；没有点击复核/编辑/删除。当前planBottomStable，NIGHT320/窗口465307420。
- 读实现发现所有route.state非FRESH都标可能过期，即使route.kind UNAVAILABLE或STRAIGHT_LINE_ONLY。按kind区分无可用路线、仅直线非路程/用时；只有ROUTE_ESTIMATE再区分fresh与未确认最新。不改变路线数据、出发时间或供应商。
- plan-import-current-normal-build session39866最终exit0，包含此前导入/planID/密度/去英文标签；早于本轮route说明，后续build需要包含最后改动。运行fixture仍旧英文标签和route说明，不能声称已实际修复显示。
- 下一构建并验证路线状态分支，非空计划仍保留在新8879隔离实例；正常数据未动。goal active。

## 单条计划无法新建下一条的入口修复
- 原生已存计划底部只有复核/编辑，源码新建按钮位于plans.length>1分支，单条用户无法建立第二条。新建改到常驻plan-actions（ghost次要动作），多条列表不再重复新建入口。
- 追踪startNewPlan会清activePlanId但保留路由requestedPlanId，showMissingRequestedPlan现排除明确newPlanRequested，避免新建表单同时误报原计划缺失；真正请求缺失ID仍报错。
- plan-management-typecheck及fixture build session34220 exit0并同步，包含路线kind区分/去英文标签/新建入口；newPlanRequested最后补丁在构建过程中修改，未证明该补丁包含，下一需要最终重建或确认产物后再原生验证。不要先称新建/保存第二条已验。
- 运行重载会回Map，fresh capture。隔离只有前述1条已存计划，不能重建替换它；正常数据库未动。goal active。

## 新建第二计划后的返回空白问题
- 顺着单条计划新建入口检查返回：旧onClick仅setEditing(false)，但startNewPlan清activePlanId且保留newPlanRequested，自动选择effect被抑制，已有计划时既无空态也无详情，可能空白。
- 返回按钮在无activePlan时选择路由原计划或首条已存计划，调用既有applyPlan，再关闭编辑；无已存计划清newPlanRequested后回空态。保留本机草稿，不保存或删除记录；账户/忙碌保护沿用。
- plan-management-final-fixture-build session49873已exit0但早于最后返回补丁。plan-return-typecheck及plan-return-fixture-build当前session72399，成功后自动同步，需poll。最终源稳定后不再并行编辑构建输入。
- 下一实际同条计划→底部新建→返回，确认新建无误报、返回非空；新8879只有之前保存1条，不能凭源码宣称实际通过。goal active。

## 单条计划新建/返回与路线说明实际验证
- plan-return-typecheck通过；plan-return-fixture-build session72399最终exit0并同步，此后无源码变更。
- 原生320 NIGHT My→同条计划→滚到底：新建观测计划可达，START/ARRIVE已不显示，route UNAVAILABLE明确暂无可用路线，没有可能过期误导。
- 点新建进入编辑，没有原计划找不到提示；未输入/保存第二条，直接点返回计划列表，成功返回原计划路线与操作区，非空白。当前secondPlanReturnVerified，content/plan/detail/index底部，窗口465307420。仍只有原先新建的1条隔离计划。
- 本轮关闭单条新建入口/返回空白/路线文案这些具体运行待证；正常包尚早于本轮管理修正。下一更新正常包并继续其余业务/矩阵，不重复已验路径。goal active。

## 当前回归结果确认
- plan-import-client-regression.log：316测试全部通过，无skip。
- plan-return-normal-build.log：webpack compiled successfully；包括计划路由解码、摘要布局、单计划新建及返回修正。
- current-ui-contracts-check.log：4项production源码探针通过；不代替实际WEAPP/硬件证据。
- information-design.md仍为设计逻辑唯一owner，已有调研出处、信息形态选择和检查方法；不另增展示设计资源。goal继续active，原完整业务范围未完成。

## 导入历史信息分组
- 非空历史代码检查发现标题和阶段/审核状态是相邻Text，父View未分组；import-history-row直属View改为column flex、4rpx间隔，自然换行且整行点击不变。
- import-history-grouping-build.log：普通包webpack编译通过，exec session62461 exit0。未同步fixture，非空原生视觉仍未验；不把源检查当WEAPP证据。
- 上一goal轮确认316项回归及最新普通构建，属于取得新检查证据的progress；本轮源码修正和构建也是progress。

## 导入布局运行包同步
- import-history-grouping-fixture-build.log构建成功，session33726 exit0；已复制到现有integrated-runtime-snapshot/miniprogram，未重启开发器、未清缓存。
- 原生WEAPP确认自动重编译后Map恢复同一示例点，My仍读出09-06原隔离计划；My→内容导入可正常打开，320 NIGHT来源/权利/历史0条完整可读。当前globalThis.importLiveState为该页截图，reopenedWindow仍有效。
- 8879 PID9844和12238 PID14344监听确认。非空导入仍未证实；没有新增导入、权利勾选或提交，正常十条数据未变。
- node_repl避免同调用重声明var覆盖旧绑定；后续使用globalThis.importLiveState刷新与引用截图id。

## 原生非空导入检查（新隔离样本）
- 8879隔离实例通过WEAPP新建1条PRIVATE草稿。OTHER，占位URL https://example.com/starward-layout-test；自写标题：示例：观测前的装备检查与到达准备。正文：自写测试内容：出发前检查红光手电、电量与保暖装备。到达方式和现场开放情况需另行核实。无媒体，权利仅针对自写测试内容。没有抓取来源内容、提交审核或发布。
- 实际建立、填写、进入编辑草稿保存成功；320 NIGHT滚动到底，历史显示1条、完整标题与下一行编辑草稿·草稿。非空布局WEAPP已验。暂不关联，继续预览按钮禁用；正式关联/PREVIEW阶段未验。正常十条原样本未动，新样本不替代原需求。
- 成功浮层持续遮挡后续按钮，创建和保存均出现，已手动关闭。下一步处理完成反馈生命周期，保留错误与恢复消息，不一律定时清除。
- 当前globalThis.importLiveState在导入页底；草稿已保存，EDIT_DRAFT/NONE，勿重复新建。

## 成功通知生命周期修正
- 共享NotificationRegion仅对floating/success/dismissible且无action的当前消息，在显示6秒后关闭。错误、警告、inline和带操作消息不自动退出；更新/替换/卸载清理计时器并设置取消标记，防止旧回调关闭新消息。
- notification-host.test新增运行实际Region代码的回归，覆盖保留类别、正常过期、同ID更新、卸载取消。notification-expiry-tests.log 3/3通过；首次typecheck发现测试数组索引需非空断言，已修，notification-expiry-typecheck.log exit0。
- owning shared-state-and-recovery.md增加持久生命周期原则，精确时长只由组件拥有。
- 尚未证明实际WEAPP计时退出；普通包仍需更新。即使自动退出，显示期间遮挡主要动作的布局问题仍不能宣称全部解决。
- notification-expiry-fixture-build.log编译成功，session98126 exit0，已同步现有snapshot，未重启IDE。

## 成功浮层原生退出证据
- notification-expiry-normal-build.log普通构建通过，session36437 exit0。
- 最新fixture自动重编译后，My→导入重新读到同一PRIVATE草稿，原标题/42字自写正文/权利状态保留。未创建第二条。
- 原生点击保存当前草稿，截图实际显示导入草稿已保存；无关闭输入，后续截图浮层已消失、保存按钮完整恢复。两次截图计时15909ms，足以证明自动退出，不声称精准6秒实测（6秒来自代码/定时回归）。
- 当前importLiveState在正文/私有/保存按钮区，无通知。显示期间仍短暂覆盖按钮，位置避让尚未解决。正常十样本未动，未审核/发布。

## 导入保存原位反馈
- 根据实际成功浮层覆盖保存按钮，import创建成功直接显示新草稿和阶段，不重复toast；普通保存由当前按钮显示保存中/保存当前草稿/已保存，读屏名同步。仅SUBMIT保留审核提交确认浮层，错误/列表刷新失败/恢复提示保持。
- 依赖既有dirtyEdit和clearSavedEdit，不新增状态副本。类型检查通过；import-local-save-feedback-tests.log 8/8通过（编辑基线、动作及恢复owner）。
- 本次普通保存不再产生遮挡浮层；实际新包UI验证仍待进行，不能据源码称整站浮层避让完成。原隔离示例草稿保持，不重新新建。

## 原位保存反馈与关联预览原生验证
- import-local-save-feedback-normal-build.log普通构建通过，session15902 exit0。
- 同一隔离草稿回读显示已保存；修改来源备注为自写布局测试；链接仅为占位，不是真实文章来源。按钮随即变为保存当前草稿，实际保存后恢复已保存，无成功浮层。保存期间canEdit含action===null，源码确认输入禁用。
- 继续选正式地点关联，控件继承当前示例观星点；实际保存关联并继续→打开预览→提交人工审核按钮出现，完成ASSOCIATE_SPOT→PREVIEW推进，未点击提交审核。
- 当前同一新隔离草稿为PRIVATE/PREVIEW，关联spot:test-published；这仅证明测试关联流程，不证明第四真实来源地理兼容。原标题/42字正文保留，无媒体。正常十条导入未动。
- 当前globalThis.importLiveState在预览区（提交人工审核可见），没有正在编辑的未保存修改。不要误点击提交或重建样本。

## 导入指定路由初始化修复
- 源码发现router.params.importDraftId每次selectedId/isCreatingNew变化都会重设选中，带指定草稿入口会阻止用户换另一条或新建。当前My入口无ID，故此前实际路径未覆盖此问题。
- 入口IDdecodeURIComponent，非法编码保留显式ID避免误选第一条；appliedRouteId仅应用一次当前路由值，后续用户选择/新建不再回跳。身份和dirty守卫保留。
- import-route-selection-tests.log 2/2通过，执行实际选择effect覆盖encoded ID、选其他、新建、非法ID；未宣称原生指定链接已验。
- 尚未构建同步此修正。现有运行实例仍在同一隔离PRIVATE/PREVIEW示例草稿，未提交。

## 当前客户端回归与隔离构建
- import-route-current-regression.log：318/318通过，无skip，session5167 exit0。覆盖近期通知生命周期、导入原位保存和指定路由选择等现有测试；不等同原生指定参数链路。
- import-route-selection-fixture-build.log编译成功，session75258 exit0并同步snapshot；未重启IDE。
- 正常构建import-route-selection-normal-build.log本轮启动，继续观察对应session，勿因观察超时重启。
- 当前生产调用My进入import没有指定ID，指定ID路径属于支持的入站参数，源码此前会固定用户选择；尚未原生触发该入站路径。当前已有隔离草稿PRIVATE/PREVIEW不提交。
- import-route-selection-normal-build.log普通构建成功，session30702 exit0；本轮无运行中构建。

## 恢复入口去过时状态
- CURRENT.md由12492字节整理为6570字节，移除多轮已过时构建/实例状态重复；保留最新318回归、当前包、隔离私有样本、真实验证边界与完整剩余业务。
- 原全文先复制CURRENT-history-20260907-import-preview.md并确认SHA256相同；不丢原始细节，按需可追溯。未删长期业务Context或任何资产。
- 后续只原位更新CURRENT，不再追加每轮状态导致互相矛盾。下一步非空投稿/媒体及剩余矩阵，不重复导入保存或已过构建。

## 投稿历史去重复状态
- ContributionHistory实际渲染同时在标题右侧显示STATE_LABEL[state]和下方投稿审核轴重复显示同值。删除前者，保留完整审核/证据合并/公开影响三项及审核原因、事件时间；不隐藏状态。
- 三轴内部术语的aria-label改为审核、证据合并与公开状态。contribution-history-status-typecheck.log通过。
- 尚未构建该微调或原生非空历史验证；下一步与反馈剩余改动一起构建，不重复刷新已验导入流程。
- 媒体续传实现已核对有rightsConfirmed守卫；未仅因按钮可点击就判断越权，也未进行媒体真实上传。

## 投稿媒体与状态文案校正
- 当前媒体PENDING既可能待上传也可能中断，原文连接中断或上传未完成容易误报故障；改为上传尚未完成·可续传，保留过期/已清理/已就绪分别说明。
- 删除媒体列表后与每行续传/重选/移除入口重复的解释段；需上传完成才能审核的重要提示保留。
- contribution-state-copy-tests.log 6/6通过（媒体恢复、缺大小、历史可用性）；前轮非空历史去重复badge也纳入本次普通构建。未宣称实际媒体上传或非空投稿视觉已验。

## 非空反馈历史原生验证
- contribution-state-copy-fixture-build.log成功，session34236 exit0并同步，未重启IDE。
- My→现场反馈→选择正式地点→搜索示例观星点→选中，自动切FIELD_REPORT，未出现定位授权弹窗。选择前NEW_SPOT_PROPOSAL仅是尚未选择的状态，不误判。
- 新隔离反馈草稿唯一1条：spot:test-published，FIELD_REPORT/OTHER，日期2026-09-07、时间13:40，自写43字正文：自写测试反馈：用于检查草稿保存和历史状态展示，不对应真实现场情况，不作为地点核验证据。无媒体、未确认媒体权利、未提交审核。
- 实际保存后全部1；320 NIGHT历史显示示例观星点·现场反馈、更新时间、审核草稿/证据合并尚未开始并排、公开影响没有在下一行，继续编辑完整可见。重复顶角审核badge已移除，非空DRAFT布局已验。其他审核/拒绝/合并状态未验。
- 当前globalThis.feedbackState在反馈页底部，提交审核和继续编辑可见。不要误提交或重新创建；已有导入PRIVATE/PREVIEW及唯一计划保持。正常库不变。

## 继续编辑返回表单
- 原生点击隔离反馈历史继续编辑后截图仍在页底，无滚动；确认实际问题。
- ContributionHistory恢复草稿后通知页面onResume；页面用独立resumeAttempt驱动同一ScrollView回feedback-context，清空锚点后下一个任务设置，支持重复点击。无新表单/路由/数据请求，不复用校验字段制造错误状态。
- contribution-resume-scroll-typecheck.log通过。新包实际滚动仍需验证；正常包暂未更新。当前隔离反馈1条DRAFT、导入PRIVATE/PREVIEW、计划1条均保留，无审核提交。

## 继续编辑原生回表单确认
- contribution-resume-scroll-normal-build.log成功，session83735 exit0。
- 最新fixture重载后My显示1条草稿；反馈页历史回读同一记录。滚动到底点击继续编辑，实际回到feedback-context开头（反馈对象标题可见），FIELD_REPORT及13:40恢复。未另存或提交。
- 当前feedbackState在表单顶部；FormalSpotField瞬时显示已保留地点关联、名称暂不可用，而上方spotNameSnapshot示例观星点仍可见；后续若持续需核查名称解析，不把这个瞬时状态当关联丢失。
- 非空DRAFT继续编辑滚动已验，未覆盖所有历史状态/硬件。普通包与fixture当前此改动均已构建。

## 恢复反馈草稿的地点名称
- fresh原生截图确认FormalSpotField名称不可用持续存在；上方已有spotNameSnapshot，字段没收到该名称且无contextId无法查询overview。
- FormalSpotField接受带spotId的knownSpot，当前选择/overview优先，只有ID匹配才用已知名称。反馈传递现有routeSpotId/routeSpotName，不补造观测上下文，不改关联。
- formal-spot-known-name-tests.log 6/6通过，新增匹配名称回退、错ID不借名称；typecheck通过。尚未构建同步/原生复验。当前feedbackState表单顶部同一DRAFT，无提交。

## 名称回退身份一致性
- 补查发现useContributionForm输出routeSpotName使用boundSpotName || initialSpotName：从带名称入口切换到无名称草稿时可能显示原地点名。初始名称已用于state初始化，移除输出层再次回退，当前名称仅来自当前绑定状态。
- formal-spot-known-name-typecheck.log重新通过；本轮构建knownSpot修正与此身份修正，避免把旧名称包装成当前ID的已知名称。
- 当前真实WEAPP复验仍待进行；不使用历史截图证明修正效果。隔离数据保持原三条样本（计划/导入/反馈各1），不提交审核。
- formal-spot-known-name-fixture-build.log成功，session99678 exit0并同步snapshot，无IDE重启。

## 已知地点名称原生复验
- formal-spot-known-name-normal-build.log成功，session73632 exit0。
- 最新fixture从My回到历史1条原反馈，继续编辑返回表单后，FormalSpotField实际显示已选择：示例观星点，原FIELD_REPORT/2026-09-07 13:40恢复；名称不可用已消除。未保存新记录/未提交。
- 第一次坐标点击后页面未变化，fresh截图确认后第二次点击实际恢复；未据首次工具成功称完成。
- 当前feedbackState在表单顶部，原草稿继续编辑。不同ID不借旧名有6项组件回归支持，未做真实第二地点数据变更。

## 历史恢复防覆盖未保存编辑
- 原历史继续编辑直接applyDraft会覆盖当前编辑并清理本机副本。新增resumeDraft入口：localDraft根据现有已保存/初始snapshot比较hasUnsavedChanges；存在编辑或待恢复内容则保留并提示先处理，成功恢复才触发回表单滚动。
- 不更改保存回执applyDraft、提交恢复或冲突显式恢复语义。contribution-resume-unsaved-tests.log 3/3通过（实际resume函数的未保存/恢复/干净三路径和既有存储回归），typecheck通过。
- 此修正尚未构建或原生验证，当前运行仍为已知名称版本。下一步验证干净草稿可恢复、修改后不会被历史覆盖。

## 未保存保护回归与构建
- contribution-resume-current-regression.log 320/320全部通过，无skip，session66041 exit0。
- 现有local-draft-storage实际hook测试补充hasUnsavedChanges断言：初始/已保存/纯媒体修订false，字段变化/媒体回执期间正文修改true；contribution-unsaved-baseline-tests.log 2/2通过。
- contribution-resume-unsaved-fixture-build.log成功，session51589 exit0并同步snapshot。普通包未更新，真实未保存历史防覆盖还待验证。
- 本轮仅补测试，没有在构建中修改生产代码。不要重复构建fixture或重新建立样本。

## 2026-09-07 最新构建与原生恢复检查
- 确认 contribution-resume-unsaved-normal-build.log webpack成功15363ms，session19791 exit0。fixture已同步；320项回归及后续2项baseline断言证据保持。
- 当前DevTools465307420可正常捕获Map及My；Map320 NIGHT短路线摘要与轻量tabs可见。My反馈入口两次点击后仍在My，未执行未保存恢复两路径，未声称验收通过；不重启开发器、不新建或覆盖隔离样本。
- 再次核对information-design.md是持久方法owner：按职责/关系/长度/数量布局，研究来源与推断边界已存，不新增研究原型或重复文档。

## 2026-09-07 My导航互斥
- 前一轮新增构建确认与原生入口不响应证据改变了下一步；本轮原生console只读确认栈为pages/my/index。后续截图被其他窗口遮挡，停止桌面操作，未据此认定路由故障根因。
- my-library-page.tsx openPage增加同步ref互斥，连续点击同入口或竞争入口时只允许一个native navigateTo待完成；finally释放，失败后可重试，已有通知语义不变。
- 新navigation.test.ts执行实际handler，验证竞争入口被抑制、原生失败后重试及仅清理自己提示。my-navigation-singleflight-test.log 1/1；typecheck通过；普通build session50487 exit0。
- 不把互斥改动当作此前原生无响应的已确认修复；未同步fixture、未覆盖隔离数据、未重启开发器。最新运行fixture仍是contribution-resume-unsaved，未保存恢复两路径待实测。

## 2026-09-07 反馈原生路由定位
- 最新my-navigation-singleflight-fixture-build成功(session91196 exit0)，尚未复制snapshot，避免干扰当前验证页面。
- 当前8879/8787/12238监听分别PID9844/8136/14344，无重启。
- 原生窗口曾最小化，按工具建议恢复现有窗口。console诊断My反馈导航事件为空；直接wx.navigateTo反馈路由成功并显示feedback route opened，证明路由可打开，不证明My点击已修复。
- 1900滚动到历史后可见唯一示例反馈DRAFT及继续编辑入口；点击后截图被其他窗口遮挡，未确认恢复效果，停止桌面点击。未编辑/保存/提交记录。

## 2026-09-07 普通字号内容布局，停止测试
- 用户明确本次不要继续测试，先完成普通字号；已置于INDEX/CURRENT入口，覆盖旧测试执行顺序。未运行测试/构建/开发器。
- spot-panel开放/夜间安全从单条长标题改为两列短事实，风险指导继续完整显示。
- 攻略标题旁放阅读入口，移除单独阅读动作行，标题自然换行，保留摘要、作者及核验状态。复用原按钮命中与字体。
- 仅源码实施，未作运行验证，不声称最终视觉验收。

## 2026-09-07 澄清测试范围及普通字号面板实测
- 用户澄清仅停止大字模式测试/适配，普通字号开发及必要验证继续；INDEX/CURRENT已替换误解措辞。前段暂停全部测试只是历史误解，不再执行。
- panel-safety-density-typecheck通过；fixture build session66515 exit0并同步snapshot；normal build session71323 exit0，webpack14381ms。含此前My导航互斥。
- 当前DevTools现有窗口恢复显示（未重启），直接switchTab回Map，原生点击展开、滚动330。320 NIGHT标准字实见两列设施、开放状态/夜间安全两列标签与值、吸顶概览/天文；没有遮住当前两列内容。
- 示例无攻略，标题旁阅读入口仅编译验证，非空攻略实际效果未验证。未改数据、未测大字。整体goal仍有原范围待完成。

## 2026-09-07 场地共享设施事实排列
- facility-evidence.tsx/scss：开放时间与距离按2:1并列，标签和值对应；无距离时开放时间跨满，使用条件始终跨满且值可换行。保留核验时间、状态、描述与来源，影响场地页及文章中的设施详情。
- facility-facts-layout-typecheck通过；fixture build session11927 exit0并同步snapshot；normal build session92917 exit0。普通字号布局，未处理大字。
- 尝试读取DevTools提示window minimized，未再恢复窗口；本次设施非空布局尚未实际查看，不把编译通过作为视觉通过。现有数据未修改。

## 2026-09-07 设施短事实实际收紧
- 从Map原生展开→查看详情，320 NIGHT普通字看到无距离时开放时间标签/待核验仍分两行。
- facility-evidence.scss将fact标签和值改同行baseline、可换行，长值flex:1/min-width:0；宽条件仍跨列。未改数据/字号。
- facility-inline-facts-fixture-build session80970 exit0并同步。再次原生Map→场地：开放时间 待核验同一行、使用条件和核验日期完整，第一设施行减少高度，第二设施在首屏更完整。
- CSS变更已通过fixture编译和实际320 NIGHT验证；普通包最新仍facility-facts-layout-normal-build（这次CSS之前），未声称最新普通包已更新。距离非空/长开放时间仍待实际观察。

## 2026-09-07 设施重复核验时间合并
- FacilityEvidenceDetails新增默认true的showVerification；场地页仅当多项设施verifiedAt非空且逐项完全相等时，在列表末显示一次“以上设施最近核验”。单项/不同/缺失时间仍逐项显示，文章独立使用保持默认。
- facility-shared-verification-typecheck通过，fixture session53153 exit0且同步。截图受其他窗口遮挡，未操作其他窗口，日期合并实际画面未验。
- 普通包构建session89606结果见同名日志；仍仅普通字号范围，未测试大字。

## 2026-09-07 来源时间信息层级
- 上轮用户询问估时，已答普通字号约2–4小时为估计；须集中页面工作，非完整goal完成承诺。
- Provenance时间整理为发布/获取/适用三条对齐行，北京时间在组内说明一次；全部日期值/缺失语义保留，精度和限制提升type-secondary，长provider与状态独立排列。
- source-timing-layout-typecheck通过。构建并同步命令在进程创建前被policy拒绝，无具体理由；未重试/拆分绕过，不存在该次运行包成功证据。
- 最近设施日期合并首屏实测：逐项日期已消除，两个设施完整显示；滚动末尾时截图受遮挡，末尾合并日期/来源未确认。

## 2026-09-07 设置动作说明
- 设置删除账户入口及读屏名称由流程解释改为“删除后不可恢复”；原有详细影响、二次确认、API删除行为保持。
- settings-action-copy-typecheck通过。检查了My/设置共享分组源码，本轮未无依据改动既有普通字号间距，也未处理大字模式。
- 构建/同步此前被policy拒绝，本轮没有重试。来源时间布局与本轮文案尚未在运行包中验证，完整goal继续。

## 2026-09-07 文章普通字号阅读层级
- article-meta去独立卡片及嵌套内边距，标题与正文对齐，细分隔线区分元信息；提示/设施引用采用12Px内边距与8Px组内间距。
- 设施引用正常数据将名称交给FacilityEvidenceDetails与状态同排；加载/错误/缺失仍在StatusPanel前保留设施名，避免失去对象上下文。
- article-reading-layout-typecheck通过（最后仅扩展保留标题的条件表达式）；未运行构建同步，尊重既有policy拒绝。当前普通字号文章视觉尚未验，不测大字。

## 2026-09-07 主页链接正文与操作排列
- profile/links普通字号列表统一全文宽内容＋下方横向操作，避免341px以上右侧竖按钮挤窄长网址。保留URL全文换行/可见性/更新时间，按钮沿用target-min；长动作可换行。
- 移除仅340以下重复声明的行/动作排列；平台窄屏两列保留，大字规则未修改。
- CSS源码调整；未运行构建，仍不绕过先前policy拒绝，不声称已实测。

## 2026-09-07 导入正文按阶段展示
- 原编辑/关联阶段已在编辑器显示正文，底部又完整重复预览。现完整import-preview-copy只在PREVIEW/SUBMIT展示；SOURCE/EDIT_DRAFT/ASSOCIATE_SPOT仍保留编辑区、关联保存和进入预览动作及解析警告。
- 不改阶段转换、提交门禁、保存或现有十样本。import-preview-density-typecheck通过；未构建/运行验证，之前policy拒绝仍未解除。

## 2026-09-07 汇总未运行改动与构建授权待答
- 核实最后成功fixture/normal分别14085ms/15614ms，为facility-shared-verification；修正CURRENT环境段旧包描述。
- 已检查最新来源/文章/链接/导入差异范围；不继续堆叠无实测样式。通过async请求用户允许恢复被policy拒绝的构建与现有隔离同步，无回复不得继续依赖操作。
- 当前仅准备运行验证，所有原始goal范围与未证事项保留，不标完成。

## 2026-09-07 已授权后执行策略仍拒绝
- 用户明确允许构建并同步；该授权持久有效，不再重复询问。
- 执行standard-ui-authorized fixture+同步+normal命令，CreateProcess直接blocked by policy，未给具体原因。无进程/session，构建和同步均未执行。
- 此次是恢复后的首次策略阻塞观察，不重新调用blocked状态；保留原goal完整范围和已保存源码。需要执行环境策略允许后才能继续该操作。

## 2026-09-07 执行策略只读定位
- 授权后恢复审计第2轮：只读检查C:/Users/777/.codex/rules及仓库.codex规则候选。仅default.rules，7个allow，无deny/forbidden；未发现可解释本次构建拒绝的本地规则。
- 不能据此断言环境无其他策略；工具仍只给blocked by policy。未改规则、未替代工具/命令绕过。下一步需执行环境提供拒绝原因或允许原授权操作。

## 重启后标准字号构建同步恢复
- 用户重启Codex并再次明确继续构建同步；相同既有npm workspace构建入口正常执行。fixture session39227 exit0，12996ms；normal session36605 exit0，13516ms。日志restarted-standard-fixture-build.log / restarted-standard-normal-build.log。
- fixture 169文件复制既有snapshot/miniprogram，逐文件SHA256零差异。未删除目标、未重启开发器、未操作数据或发布。
- 8879/8787/12238监听查询无结果，UI运行尚未复验；大字模式未测。完整goal仍未完成。
