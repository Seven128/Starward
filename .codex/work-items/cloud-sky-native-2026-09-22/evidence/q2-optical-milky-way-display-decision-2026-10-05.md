# Q2/E2：低分辨率光学银河显示采用与发现兼容

采用固定 Stellarium 随包 Axel Mellinger PNG 作为普通开发路径的 `OPTICAL_MILKY_WAY_DISPLAY`。原像素不加工，独立星表与点选保留；不是一般区域、目标照片外沿或任意方向高清底图。Prepared registry 仍空。这里只闭合这个显示角色与新增版本消费者，不宣布全部画质、目标运行时或生产发布通过。

## 角色决定所据的实际输出

固定源为 Stellarium 提交 `608db95859f2393d5cc5067d90850ab2d7560c0c` 的 `textures/milkyway.png`，2048×1024 RGB，1,003,398B，SHA `95ca887ae2fd6811a202f83bccb1376819957d074eed92e4df17f9cbea83df97`。这个提交是第三方源身份，不是 Starward HEAD。原 [具体输入和授权依据](q2-mature-optical-bitmap-2026-10-05.md)保留：指定 CREDITS 的 Axel Mellinger 署名/修改再分发 grant 不等于程序 GPL，也不延伸至作者新版付费、高分辨率或 FITS 产品。没有新下载、采购、外联、复制引擎或生成细节。

`scripts/audit-optical-milky-way-layer-2026-10-05.mts` 复用已保存实际 M8/最大视域相机、原 PNG 与当前 GPU，只回放图片层。输出 `output/playwright/optical-milky-way-layer-audit-1005-q2-r1/`：两个 draw 各一个真实成功回执、GL error 0、最终纹理退休 0；原文件和源码前后身份相同。M8 和实际 267.875032927535°视域分别有 510/2316 个目录位置；只抽查其中 5/32 个亮星位置，共37个位置，含重叠双星，不能当37颗不同恒星或全天重复星点计数。

查看两张 image-only 与对应完整合成图，图片主要贡献尘埃/弥散结构。上述亮星位置半径3px的照片层局部最大亮度约 .14–23.86，而完整合成对应亮星约50–232.8；邻域也有相近弥散背景。这只是显示描述，既不做云/星自动分类，也不证明所有照片星点已去除、重复数0或科学流量。M8/M42等原照片结构保留。单层常驻逻辑纹理为1,556,480/8,388,608B，upload+copy逻辑峰9,945,088B；不据此判断宿主/驱动物理内存。

Browser 实际查看 `https://stellarium-web.org/` 的公开页面，使用公开深圳地点、暂停时钟、M8、关闭地景/大气和 DSS，在相同89.5°参考画面保存银河开/关对照。文件在 `output/optical-milky-way-reference-1005-q2-r1/`，包括 DOM/checkbox 状态和 `reference-observation.json`。它支持银河显示与目录/DSS独立的角色。最初120°/89.5°图仍开 DSS，不能冒银河单层参照。参考地点22.54457/114.05454、21:16:05、1280×720；软件小样22.4826799/114.5557147、21:00、390×844/90°。不同地点/时刻/投影/目录只作定性对照，不作逐像素或配准通过。没有取得或采用 DSS，当前 Web 银河 bitmap 身份/权益没有确定，临时标签页已关闭。

名义图片轴保持 J2000：`u=wrap(.25−RA/360)`、`v=.5−Dec/180`。制作方完整处理、科学有效性为 UNKNOWN，绝对配准 UNVERIFIED；黑像素不代表科学零值或缺测。原淡带回退仍用真实 Galactic 轴，图片不借 2MASS 的 point-source filter，不改独立目录。

## 普通出版与兼容反例

普通资产在 `workers/miniapp-api/assets/deep-sky/galactic-mellinger/`：schema `starward-mellinger-optical-milky-way-v1`、scope `DISPLAY`，publication hash `ea23d4b25c50f9b8012e9cfb9f6a5512af81606d30379263ae3d472cb467e174`。旧 TRIAL schema/scope 与条件版本 `5f609f20…` 原样保留，不改旧 manifest/hash。仅当前和固定历史 2MASS 由银河 owner 持有，不建任意目录 registry。

先复现再修复两个问题：

- 标准默认导出原来只带新 PNG，遗漏旧 2MASS URL。实际默认 enumerator 的新回归检查修前 `1 !== 2` 失败，完整源码副本/pins在 `tmp/ordinary-galactic-export-before-2026-10-05/`，失败日志为 `tmp/e2-ordinary-milky-way-retained-export-before-2026-10-05-r1.log`。修后 `publishedManifests()` 和标准 `galacticSkyPublicAssets()` 明确导出当前及固定旧版。
- 无版本入口直接改返新 schema 会让旧严格 2MASS 客户端失败。修前实际 controller 检查失败，完整副本/pins在 `tmp/ordinary-galactic-discovery-before-2026-10-05/`，日志为 `tmp/e2-ordinary-milky-way-legacy-discovery-before-2026-10-05-r1.log`。沿既有月面版本入口模式修复：`/v2/sky/galactic/manifest` 精确保留原2MASS元数据；`/v2/sky/galactic/display/manifest` 才发现当前显示图。

新客户端先请求 display 入口，仅404才回原入口，500/transport/无效200不掩盖为旧图成功。SDK登记这两个真实 bare-JSON metadata 接口；图片仍走原同源 URL/file/encoded/native/GPU owner。API/static 根据实际选中版本给来源头；旧 JPEG、bytes/hash/headers 均保留，错配 filename/hash 拒绝。页面机器清单链接随已绘 optical/infrared 身份切换。

影响检查：最初API/出口11通过，客户端30通过；改测试数组类型标注后该出口文件5通过，API/miniapp/contracts类型均通过。随后独立恢复增量的当前API/出口12通过、API类型再通过；客户端和前端未改，不重跑。客户端检查覆盖新版成功、旧404兼容，以及transport/500/无效metadata不回退。它们不等于实际网络或手机资格。三个类型和各次失败/成功日志都保在 tmp。

复核还发现第三个恢复缺口：旧发现/图片选择先加载当前manifest，新manifest缺文件或scope无效会让有效旧2MASS也500。实际Nest/Fastify回归修前`500 !== 200`失败，完整owner/新增检查/pins保在 `tmp/ordinary-galactic-independent-failure-before-2026-10-05/`，日志 `tmp/e2-ordinary-galactic-independent-failure-before-2026-10-05-r1.log`。修后旧发现直接读取固定旧出版；图片选择在当前manifest加载失败时只允许请求身份精确匹配的有效旧版本。缺文件/无效scope两个场景各经真实controller dispatch验证旧metadata与JPEG为200/原hash/headers，而display metadata及光学URL仍500，不能把IR成功返回在optical URL。显式旧图corruption/恢复检查仍通过；没有更改两份正常metadata、PNG/JPEG、headers或静态配置。该增量晚于4HTTPS/软件page epoch，不能把旧图正常结果宣称为当时已测失效隔离。

## 当前实际消费者与出口

`output/playwright/ordinary-optical-milky-way-page-1005-q2-r2/` 是兼容修复后515输入绑定的完整原 Map→SpotSky 软件执行；普通 page props、普通银河 constructor、Prepared空registry。61请求/16 Scene调用；实际一次 display metadata 200和一次原PNG body 200，完成帧的publication/schema/image axes与该PNG一致，公共列表出现具体credit/grant/源和display机器清单链接。退出后逻辑纹理、buffer、decoded handles及源RGBA等效均0。冷45°当前帧391个目录位置，8 decoded handles、源RGBA等效13,369,344B、GPU纹理模型5,238,784B；不是物理峰或完整原生场景。只补新版发现增量，不复跑已经闭合的冷暖/M31/M8/hide/source-route矩阵；本次仅公共列表 inline 来源，不冒独立 Source route 最终验收。

`output/optical-milky-way-ordinary-static-https-1005-e2-r1/` 保其**修复前的源码时态**：新普通版本 PNG 与旧 JPEG 的 GET/API headers/bytes、新PNG HEAD/304/Range已有8HTTPS+2直接API结果；当时metadata入口已被后续兼容修复取代，不能当当前发现协议。sealed combined `e83f5ced…`仍1741文件/88,307,902逻辑payload B，新旧图片 immutable URL/bytes/headers没有变。该轮 delta+combined 复制额外89,311,300逻辑payload B，不能冒物理去重、Linux全盘或生产保留。

当前 `scripts/verify-ordinary-galactic-discovery-2026-10-05.mts` 及 `output/ordinary-galactic-discovery-1005-e2-r1/`：真正普通默认 enumerator 收出两份银河资产，经原writer/validator封成2文件/1,706,953B、bundle hash `2cb3cae848b645b15f99a98f1f53021e514108106e2e9155bc06fe08c0982ae4`；记录/bytes/headers与上述封存mount一致。复用这个readonly mount，没有复制/重扫1741 payload或重跑HEAD/304/Range。当前API通过本机可信TLS Caddy执行新版/旧版metadata及各自发现图片4GET，旧metadata完全相同，静态图API调用0、privacy日志body核算一致；184当前source pins前后一致，六保护项原样，临时API/Caddy退出。不是实际云部署、可信OCI/current/rollback/备份引用闭合或200DAU容量。

## 当前 WEAPP 构建与剩余责任

[当前watch只读产物](p1-current-watch-ordinary-readback-2026-10-05.json)绑定24个有限当前源和实际300文件/12,971,769逻辑B、tree `ce78bc30bf6a3db898efc13c738e0dbc0c8c82742cf4c769c0f7e620eaf72724`。日志全部成功时耗为16920/595.5/457.15/708.1/2690/5560/404.89/2760/2700/398.41ms；已知CSS顺序warning保。normal schema、新发现path、原格/TAN标记存在，只证明构建身份，不证明Canvas或BFF已更新。

reader最初错误要求编译文件含完整`/v2`字面路径，development输出保API-base拼接表达式/SDK path，断言失败。原脚本和r1日志保留，r2只改标记查找，未重编译/重启。watch3432、原BFF24040/60065和IDE13736原启动身份保留；BFF可能仍旧2MASS或迟载混合。官方截图35s的IDE侧完成仍 UNKNOWN，没有新增SDK动作，DevTools WXML/Canvas/控件/Back/hide、新月面Android/iOS及完整体验未验。

此显示角色的开发接入已完成，执行顺序只由 [PLAN](../PLAN.md)拥有。一般真实区域/目标弱外围与可见矩形仍FAILED/缺合格输入；旧第三source-null、各代strict失败、全图星点重复/绝对配准/完整图质、修后独审、生产引用/物理峰/全机盘/混合200DAU继续保留。37个位置、2048×1024和当前出版两版本都不是需求上限。没有提交、推送、发布或部署；Goal active、无预算、未完成，全部33项义务不改。
