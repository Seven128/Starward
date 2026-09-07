# 共用实验输入

为《今晚去观星》微信小程序重构地图页和我的页。保留当前业务和交互逻辑，设计三个明显不同但适合这个产品的方向。我要精致、小巧、简约、有高级感，同时有效信息密度高，手机上的字不要太小。请自主完成专业设计判断，交付可编辑 Figma 图层，并查看实际结果后改进。

## 范围与事实
读取当前 AGENTS、project_context/global.md、根 DESIGN.md 小程序段、project_context/areas/main/screen-contracts/wechat-miniapp.md 及其 map-and-finder、surfaces-and-controls、spot-and-sky、information-design、shared-state-and-recovery；项目强制 .codex/skills/uiux_design/SKILL.md 同样适用。
当前 HEAD/输入哈希见 run.json；代码较研究版本前进295文件，当前身体正文15/22、次正文14/21、动作14/20、点名20/28、元数据12/18；44logical-px命中。标准字级320/375/390/430，200%已暂停。
主导航只有地图/我的；浮动搜索子页、定位和图层；正式marker首点medium。一份文档small/medium/large裁切，large才滚动。把手44px独占拖拽tap无动作，概览/天文是左对齐吸顶文档定位，不是隐藏另一章节的tab。操作想去/分享/云观星。三个现有图层互斥，LIGHT静态，时间真实离散切片。无面板星图/推荐窗口。
我的保留紧凑账户、单一gear设置；今晚计划、现场反馈与纠错、主页链接、内容导入；真实草稿/审核，禁止编造会员/次数/收藏夹。当前代码的账户卡+重复设置列表是此次可重组的已知偏差。

## 固定示例（非实时、非真实个人资料）
日期2026-09-07，时间21:00已选中；正式点spot:sz-astronomical-observatory，深圳市天文台，深圳 · 大鹏，22.4826799,114.5557147，来源packages/miniapp-contracts/src/catalog.ts。样例值：总云量24%，气温26°C，风速2.4m/s，月光影响较弱，更新时间20:40。停车/厕所/开放时间未知需明确待核实；不得声明允许夜间进入。无实景照片；地点资料保持客观。
账户标题账户与内容、当前微信身份；今晚计划2026-09-07 · 深圳市天文台 · 地点与出发准备；现场反馈与纠错1条草稿/2条待审核；主页链接2条已保存；导入自己的帖子并提交审核。所有计数仅任务fixture，不取用户私有信息。

## 共用素材与地图限制
assets/osm-reference.png 是本轮Chrome真实截图，公开OSM视口zoom13中心22.48268/114.55571，裁切自x829/y300/390×480。属于外部地图参考，绝非当前WEAPP截图或腾讯native地图验证；禁止自画地形再冒充地图。两组使用完全相同的未调色图片和固定裁切，marker相对参考中心195/209；画板需保留可读“© OpenStreetMap 贡献者”归属，在评审外壳链接 https://www.openstreetmap.org/copyright 并说明ODbL。此限制令native-map外观一致性仍待采用后验证。
图标仅现有apps/wechat-miniapp/src/assets/icons/*-day.svg及对应模式，ISC；中文Noto Sans SC Regular/Medium由Figma本机字体加载，不打包字体。不要使用探针合成色块作为场景照片。

## 执行接口
仅输出本组独立Figma脚本与方向说明；不操作浏览器，不读取另一组目录，不修改生产或Skill。脚本全局 async function buildDesign({root,page,direction,width,height,mode,state,fonts,icons,mapImageHash,fixture})，在已受控root下创建原生节点。direction=0/1/2；page=map/my；初步width390 height844 mode day state medium/normal。fonts.regular/medium是已加载fontName，icons为文件基础名(例如search-day)到SVG的映射；mapImageHash由同一PNG生成。公共StarwardFigma helper可用（仅底层机械API，两组一致）；独立设计布局不能依赖隐藏自定义API。Scripter标准Plugin API，reaction目标如需要必须顶层frame。避免在resize后被意外关闭AUTO sizing；文字需真实行高和重排。组件及实例原生可编辑；原组件只能在自有root外侧裁切区域，交付图不显示生成者说明。
各交互hit节点用StarwardFigma.control(node,key,codeOwner)，map核心keys=search,locate,layers,time,handle,overview,astronomy,favorite,share,sky,nav-map,nav-my；my= settings,plan,contribution,profile-links,import,nav-map,nav-my；所有44px，邻近区域不重叠。根顶部44px系统区+44px微信标题/胶囊区、底部34px安全区保留。既有组件owner采用真实仓库相对路径。
提交round-0后等待主任务返回本组真实PNG，最多两轮正式视觉修订。没有看过PNG不声明视觉验证。A/B量表与阈值预先见test-plan-current.md（不得下调）。

## 共同补充：实物资产核对（两组初稿前同步）
当前icons目录只有5类日间SVG，search-day示例并不存在。统一复用仓库docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/assets/icons中的既有Lucide1.33 ISC SVG几何和LICENSE-lucide.txt；不读取或恢复其旧布局/规范。icons接口提供basename-day/night/observation和basename，主题色由当前tokens替换currentColor；已有当前模式资产优先。语义star/avatar可用当前assets/semantic。同一文档medium下方裁切的time等不为检查器硬塞或另造卡片，按实际状态声明覆盖。

## 用户对上一轮的实际反馈（新版本共同输入，两组相同）
用户拒绝了全部旧方向，具体说明：“1和2都有，2尤其是有有一些内容跟标题差不多大...层级不明确，整体就偏大了，有效信息密度就低了，也不精致。3这么说也有吧”。数字1/2/3指普通缺辨识度、布局信息组织不清、整体风格不合意。新任务仍是上文的完整两页与相同数据职责。
请自主重新设计，解决标题与内容层级、整体可视尺度及有效密度；不要读取或沿用旧候选。根DESIGN的现行token是已实现的基线，原开发方案允许局部视觉探索；这次可提出更紧凑的候选字级、行高、图标及容器尺寸，写明实际差异和理由，不能改生产源。仍保留44logical-px点击下限、普通文字4.5:1、关键图形3:1、中文可读性和全部业务。禁止整页缩放、删除信息或编造内容来使密度数值变好。

## 共同运行字体补充（真实字体探针，首稿执行前）
Figma listAvailableFontsAsync实测Noto Sans SC可用Regular/Medium/Bold等，不存在SemiBold条目。运行接口提供fonts.regular、fonts.medium、fonts.bold，均真实loadFontAsync后传入。可按角色选用；不得把Medium或Bold自称精确600字重。候选与当前600规范的字重差异如有需诚实记录。证据retests/v2/font-probe/fonts-available.json。两组相同字体集合，不打包字体文件。
