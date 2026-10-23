# R19 已采用局部 UI 与既有真机输出独审

结论：确认一项 **P2：LIGHT 图例重复前缀和单位导致五行展开，未达到本次紧凑目标**。Root 已接收，修复及新结果另验。本批其余实际所见变更未确认新的 P1/P2；不能据此称全 UI 通过。

## Candidate identity

本独审只复用 `development_feedback` 原件：gen13 普通包 `3b466e1f303a7b291dac3f2ccfadb139573bcd6b7d16375451e91f7158ebe55d`、gen14 普通包 `0f76b93f5b8164baab27e34e2e34d61a0c390849601adfb586a2e2ad570cc1ee`。实际原图 1080×2376，已保全等比审阅图 450×990；有 vConsole 开发入口。不是手机完整字节/runtime AppID 认证，也不倒绑尚未激活的 gen32。

上游为当前 AGENTS、`uiux_design/SKILL.md`、DESIGN 小程序档案、Screen Contract 当前采用边界、Map/共享来源 owner、[My 采用与清理核查](../map-ui-design-2026-10-22/MY-ADOPTION-CLEANUP-20261023.md)。唯一增量仍为 [3995519477980461148](https://stitch.google.com/projects/7144519510537620825?node-id=3995519477980461148)，未改区域依赖完整源 `5205988829884632961`。原完整源身份/依赖复用已核记录，没有再下载957文件全包。

## Invocation result

当前注册工具无 Stitch 服务。仅用已缓存官方 `@google/stitch` 0.12.0 原生 CLI，先读 help/get schema，再只读 get 同项目及采用节点。返回节点身份、已采用标题正确；官方 download 的 gallery 为760575B，SHA256 `eab0df69c64c9ed3639b4695ff10c115d6c048f00f417440b30a782233974712`。其嵌入增量 ZIP 为281231B、SHA256 `bb173894c3322de750bd389f2caf355713249c3feb1272b7e5ae934f8414e804`；解出17项（包含 ADOPTION），9张审阅图逐张与既有采用哈希一致。

已实际查看全部9图，读取 README/ADOPTION 和增量 review.mjs/CSS；只保临时输入 `C:/Users/momoooo/AppData/Local/Temp/starward-r19-ui-capture-review-20261023-0915`，`readback-manifest.json` 记录精确成员。未启动设计原型服务器、生成、上传、删除或重试旧网页缺口。图库折叠说明的旧“候选/展开层”文字复用已有冲突记录，当前采用及用户后续真实来源页面要求优先。

实际输出复用 [gen13 My 返回](R19-GEN13-MY-BACK-NORMAL-PHONE-20261023.md)、[gen13 Search/来源](R19-GEN13-NAVIGATION-SOURCE-PHONE-20261023.md)、[gen14 Layer/LIGHT](R19-GEN14-LAYER-READING-PHONE-20261023.md) 的私有保全 owner。没有 capture、手机输入、IDE、推送、服务、账号或草稿操作。

## Observed product behavior

| 责任 | 已实看参考与实际输出 | 本次判断及边界 |
| --- | --- | --- |
| Map 工具与主导航 | adopted `map.png`；gen13 `777c81c6` | 左上 My；右侧搜索、定位、天文事件、添加、层叠顺序一致，无应用底栏。原地点信息/三动作仍在。真实底图、地理范围、系统栏与原型示意地图不同，不评价 provider 像素。 |
| My | adopted `my.png`；gen13 `fb5f2438` | 地图图标/文字返回、头像编辑/设置、淡色渐变、单张计划容器、计划回顾与创建/反馈骨架保留。实际为资料/计划不可用，不能把错误卡冒充正常玻璃计划列表，正常态细节和材料未验。My 没有新的待选方向。 |
| Search | adopted `search.png`；gen13 `edfe6f29` 及原视频派生帧 | 实际原查询、leading Back、图片结果、输入法/建议仍在。本图正处有焦点/键盘/建议状态，不能与无键盘筛选首屏直接做整图相等。entry 2.7/2.8/3秒、return 2秒样本已实看，支持右入与向右退出；中途可见原生白页面，不把它当已绘内容或精确耗时证据。 |
| 紧凑层叠 | adopted `layers-cloud.png`；gen14 `58afb963` | 标题/地形/公共来源同排、原两选项、日期和观测时刻保留，无旧关闭行。当前云量不可用保有效范围和恢复内容，因此与有数据示例的高度/时间尺状态不能机械相等；没有伪造实时云数据。右下 vConsole 遮挡局部，不认证底部全部可读。 |
| LIGHT | adopted `layers-light.png`；gen14 `a3b630d2` | 年度/不随时间变化、EOG短署名、原五档阈值及物理单位实际保留，时间区隐藏。五行重复图例形成下述P2。 |
| 公共来源 | gen14 `a22cba32`；gen13文章 `04fc28b2`/`c68a3887`、Sky `48bff642`/`ec052cec` | 实际同族 info 图标按钮；独立来源页复用原生导航与阅读样式。EOG、媒体权利、BSC的内容按独立模板/资料意义呈现，未知时间保“来源未提供”。这是用户后续统一 Sky 按钮/真页要求的实际变化，不能按旧 pill/Sheet 图判失败。 |
| 代表按压 | adopted `press.png`；gen14原片已有2.5/2.8/8.2秒派生帧 | 实见层叠圆面正常→稍暗压态→正常已选择终态，文字与面板几何未整块缩放。只支持该代表序列，不能推出完整释放曲线、取消/重复或物理80/140ms。 |

### 已确认 P2：LIGHT 图例的重复展示使紧凑布局退化

gen14 `a3b630d2` 中五档各占一行，均重复“年度夜光”和 `nW/cm²/sr`，图例明显拉高 LIGHT 内容区。原五档、颜色、阈值与单位意义必须保留，采用图片示意三档不授权删档。

审查时 `pages/map/index.tsx` 在同一 `nowrap` 文本拼接 `item.label · item.range`；`nightLightFixedLegend()` 的每项标签已带共同“年度夜光”，每项范围又带完整单位。`index.scss` 的 nowrap 加 `map-layer-selector.scss` 的12Px行列 gap，使这些较长条目在本次实际内容宽度下逐项换行。采用增量 review.mjs 第96行要求12px图例/gap12，并未要求五项必须五行；产品合同要求五档科学意义/颜色/单位/质量一致，也未要求每条重复共同文字。

责任归原地图图例布局。可将共同“年度夜光”和物理单位清楚分组一次，以结构化展示投影保留全部原阈值/颜色，保正常字级与内容语义；不改共享科学 policy，不盲裁未知标签/单位，不以缩字或删档凑高度。Root 已接收此差异；本报告固定修前证据，不把后续源码修改视为实际修好。

### 参考内部差异：层叠上缘

两张采用审阅静图上缘呈圆角；同增量 review.mjs 第96行明确 `#layer-panel { border-radius:0!important }`，DESIGN §5A.4及既有owner也明确全宽方角。gen14实际为方角。按明确源及上游继续保方角，已报Root；没有擅自把静图差异转换成圆角修复或再生成资源。

## Verified

本批独立实际查看了上述参考、真实捕获与原视频派生样本，支持表中限定结论；复用既有原件，不以子代理旧结论替代自己的实看。公共来源按钮生产 owner `SourceButton` 为同一44Px控件，当前 Moon/天气等消费者沿同一 `SourceEntry`；本次实看覆盖的图层、媒体及Sky入口确实呈同族按钮和真实页面。

Root 随后也实际查看了 Map/My/Cloud/LIGHT 四组参考及输出，已接收 LIGHT P2。未重跑已通过的软件测试或扩大手机矩阵。

## Unverified

- 本批 gen13/14 所选实际输出没有覆盖与 `astronomy.png`/`weather.png` 等同滚动及正常数据的完整月相/九格气象画面；只实看参考不能认证当前完整符合。既有部分目标结果继续沿原证据范围，不改成失败或通过。
- My 正常账户计划列表/玻璃材料、My左入左出连续运动、原生Picker、其他未覆盖消费者/状态、完整按压取消/长按重复、减少动态效果仍不由本批关闭。不为这些缺口制造新条件矩阵。
- 真实天气/云数据、完整SAO、精确时刻/Context/scroll字段、手机包字节、原生覆盖正确性/性能/内存不在此视觉结论内。孤立静图和稀疏seek样本不证明帧率、连续流畅或所有中间帧。
- LIGHT 修复须沿现有普通包实际结果复核；在那之前本P2仍为修前确认失败。

## Invalidated

旧来源Sheet静图/README的“展开层”表达已由用户后续真页要求覆盖；不是当前产品要求。匿名资料错误不能替代正常计划，代表值不冒实时预报，原始照片/星表/许可模板不互相借用。gen13与gen14保各自身份，旧截图不提供未来输入资格。

## Cleanup

本批只新增此报告及上述唯一临时读回目录。临时设计输入保留给Root完成实看与修复参考，后续由Root核精确身份后按既有回收规则清理，不建立永久本地设计镜像。全部手机/视频/私有原件保持原owner；未改生产、PLAN/HANDOFF/INDEX、冻结构建、N05/账号/R6、VPN，无提交或上传。本代理无在途设备/服务操作，工作完成后交Root关闭。
