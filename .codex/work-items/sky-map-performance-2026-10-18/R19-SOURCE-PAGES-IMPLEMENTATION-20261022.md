# R19 来源统一真实页面

用户2026-10-22最新明确指令覆盖旧来源内联展开/底部抽屉：来源统一真实页面，复用云观星的按钮、跳转与固定内容模板。普通实施复用已确认方向，没有重新生成或选稿；原完整Goal与顺序继续保留。

## 责任与实际实现

- `SourceButton` 是统一44Px来源图标按钮，复用SharedButton原生按压；`SourceEntry` 投影当前来源和结构化说明。`navigateToSource` 统一native navigateTo与在途保护，领域port保留原资格/失败恢复。图标直接复用已有Sky来源SVG形状并由通用资产owner提供，普通DAY与深色Sky按现有主题对比度处理。
- 普通阅读复用既有spot来源route的`reading=1`分支，通过该次native EventChannel交接。URL无正文/账号/位置；无全局文档registry、storage或长期缓存。数据按SourceSummary、text/facts/links/forecast固定模板验证并复制，仅完整相同记录去重，同ID异时段/许可等仍保留。
- `SourcePage` 共用CustomNav、主题、通知与单一ScrollView；`SourceDocumentContent` 共用完整Provenance阅读及媒体/资产权利说明模板。页面hide/身份变化/卸载释放并拒绝迟到交接；失效显示返回原入口重新打开，不从其它资料回填。
- Sky保留目录/可选影像、prepared、Body、HiPS/rights、target原版次查询和恢复。`openSkySources` 仍负责时间/Context、painted frame、校准、sourceReturn及Canvas保资源；共享导航不接管这些领域职责。W3仍是已有manifest/discovery资料资格，不扩大为已绘/固定hash验证。
- Map原面板和图层owner保档位/正文/时间；移除旧来源host、另一层sheet和Back接线。必要短署名、预警正文与防御指引、设施信息、公开分享notes保在原业务内容，完整来源迁页。全部调用/边界见[消费者核对](R19-SOURCE-PAGE-CONSUMERS-20261022.md)、[非Sky迁移](R19-SOURCE-CONSUMERS-MIGRATION-20261022.md)、[Sky迁移](R19-SKY-SOURCE-PAGES-20261022.md)。

## 检查与独审

- miniapp最终typecheck退出0。公共文档交接/身份/隐藏/失败及独立聚合来源15项、非Sky98项、Sky60项受影响检查通过；最后key/样式修正后的20项来源检查通过。各组有重叠，不用简单相加当新增覆盖。
- [公共核心独审](R19-SOURCE-CORE-REVIEW-20261022.md)无确认P1/P2；[全消费者独审](R19-SOURCE-CONSUMERS-REVIEW-20261022.md)发现Sky影像旁旧`button`选择器覆盖公共按钮P2，已修为只覆盖非SourceButton，保留pointer-events；审查者读回确认。未确认其余未修P1/P2。
- 最终完整Taro构建32.918s，10项既有CSS顺序/包体advisory。raw bundle `84e78119ef133ebead6b1fa44ea97875a32c5a73760df0e98989ae99fc832cb1`，350文件/5,012,447B；main2,023,444B，content1,041,492B，spot611,982B，sky1,335,529B。raw main比已成功预览的gen3小12,902B。raw预算不冒充官方包体或手机完整字节身份。
- `git diff --check`受影响文件无错误。新增文档测试使用实际React effects和原Taro renderer、native channel/store ports；这只提供生命周期行为证据，不代替微信真实页面栈/画面或物理内存。

## 原件与在途

旧SourceDisclosure/Sheet/Host及两份旧测试6件已逐件hash核验后归档到私有`r19-ui-20261022/superseded-source-sheet-20261022T121641425`并从生产退休。gen3整份feedback361件/18,577,441B已复制到私有`gen3-feedback-originals`并生成逐件manifest；gen1/失败gen2/全部冻结性能候选保留。无性能或私人数据上传。

gen4官方auto_preview终态success，诊断`generation-000004-nYLeq5/.official-process-e12a5bf0-603f-4830-b08a-cb0e2ad96664.json`；私有只读预绑定画面实看统一来源图标后，绑定`starward-device-test-3eDXqh`。ZfqQZm已失效。runtimeAppID/手机完整包字节未读回，只作development_feedback。

## gen4真实目标结果与修正

所有以下图片均在gen4 session实际查看，原名及metadata/hash随私有完整归档保留。

| 结果 | 原始screen ID | 判断 |
| --- | --- | --- |
| 地形图标/页面首屏 | `5764601b-9608-4ea5-9277-0ef27fb584ed` / `ada3944a-0cde-400f-8d15-7248618cd1be` | 44Px公共图标可见；独立全页、原生导航、完整Mapzen/USGS/NOAA声明、缺失时间与精度显示正确，无旧来源Sheet。 |
| 长文及复制 | `50a3f396-b622-407d-bfa5-75bd054f2679` / `e7d6227a-fb1f-4ce2-a641-32096b083ff2` | 可滚至版本/限制末尾，点击复制出处后显示成功反馈。没有读取系统剪贴板或宣称外部网页打开。 |
| 地图/层叠往返 | `f9628f5b-d1ce-4e71-b9da-50d71fb0212c` / `430de096-36ff-4331-98af-ff01dea6925b` / `6ddd81f1-3468-4d57-b0f2-a46ed31e8cc6` / `be3816b1-f1b4-45a6-a757-eca33334e7ed` | 系统Back回原地图；层叠来源页的页内Back保已启地形、云量与10/22 20:18时刻。 |
| 近期天气不可用资料 | `c950be89-2329-49c9-84d8-3864b5feb971` / `b6b9dedb-78f5-433e-97ef-047c8ad00887` | 从原重试和公共入口打开来源，保QWeather不可用状态、获取时间、邻近地区历史再分析/不含今天/非实测的含义。无Geo历史数据，不认证live成功内容。 |
| **点位正文返回失败** | `cf868d7e-3e71-4bc7-807c-f77ca7e60ee1` | 从近期天气返回后大档仍在、正文却回到照片开头；这是目标失败，不用前两条Back成功覆盖。 |

已在原`usePanelReturnPosition`修复该生命周期责任：hide冻结两轴、ready后恢复、epoch拒旧回调、每轴保目标至native确认或明确接管，触摸不撤native prop，章节请求显式接管；SpotPanel旧200ms本地恢复退役。源文档/DOM仍沿原owner，没有新router或全局缓存。回归先在旧实现失败（471.5不是913.4），修后26项相关检查通过、typecheck退出0，独审见[R19-SOURCE-RETURN-SCROLL-REVIEW](R19-SOURCE-RETURN-SCROLL-REVIEW-20261022.md)。gen4原件完整保全，gen5完整构建/目标复验进行中；不能仅据代码称滚动已在手机修好。

## gen5复验：部分通过，动态布局返回仍失败

完整构建29.934秒/10项既有advisory，350文件/5,013,260B，bundle `2ff0c01667882db9a874789f48ba49cef6f764f04f7f1a00606db182eeb9e331`。原auto_preview包装层120秒超时；官方日志135.684秒明确业务success，独立核验及一次标注provenance的task-local重建见[恢复独审](R19-GEN5-PREVIEW-RECOVERY-REVIEW-20261022.md)。原unknown/taskId:null/timeout诊断及352件冻结候选均私有保全；没有重发或削弱通用守卫。新session `starward-device-test-0uFldy`。后续仅把auto_preview的有界等待调为180秒，39项原诊断/预览/边界检查通过，不修改其它命令窗口。

| 实际过程 | 原screen ID | 判断 |
| --- | --- | --- |
| 近期天气原位返回 | `4b056962-7b6a-4119-adc8-e74382530b3c` → `4efb6ebb-f37a-4cf2-8001-dd8cb5f4fa68` → `a597e30f-6d8c-4fdf-82ed-d9815940b8d6` | 独立页页内Back保近期天气原阅读位置；天气不可用提示有正确范围，不当作live成功。 |
| 返回后继续滚动及章节 | `e5255b04-ae2f-468f-84b3-2b743aaa46bc` → `7a6037eb-673f-4987-83c2-1d4419357e24` | 继续手动滚至地形，再点天文，真实接管与章节跳转有效。 |
| 月相模板与第一次偏移 | `7a6037eb-673f-4987-83c2-1d4419357e24` → `ca869b32-c558-4ece-b11e-edb9218fd00c` → `2e6578f2-97da-4da3-be7f-9fba730546e4` | 来源真页保计算/许可/时段，系统Back后日期卡/月相/天气整体上移约440屏幕像素，**失败**。 |
| 排除仅首次章节跳转 | 稳定后`e0947916-005b-4658-befe-7681ab915774` → `179a6185-61d3-4ebd-be83-8cddb5c76853` → `d320aa35-f099-4f3c-a915-807b9aa8d881` | 中途无滚动/章节，再往返仍约150屏幕像素偏移。已停止同样循环；不是只修anchor即可认证。 |

代码核对：现ready只等detail/settling/extent，前置地形image/legend/署名及近期天气live-only状态在hide/show有异步几何变化。数字top的native ack不等于阅读位置保持；具体事件先后未采，不把静态机制当唯一实测根因。正在既有责任修复，所有图片实际查看，原件私有。

## gen6修复候选（尚待目标结果）

原共享位置owner现以实际来源入口ID与viewport相对offset恢复；离开前同批native scrollOffset/rect，show及真实布局revision有限校正，数值ack不关闭后续布局恢复。enhanced ScrollView的公开`scrollTo`处理同值prop，native node只在当前callback使用；触摸/章节立即接管。近期天气、地形/轮廓、AQ及计划/预警沿原owner报告几何变化，资源照常释放，不保live-only payload。独审发现并已修的章节接管延迟/旧timer竞争见[实现独审](R19-SOURCE-READING-FIX-REVIEW-20261022.md)；无确认仍未修P1/P2，但不认证native行为。

最终54项受影响检查及typecheck通过，首次两个夹具因新增无视觉class标记失配，已修为按class token判定，原地理参照/相邻文档断言保留；没有恢复旧生产结构。完整构建33.145秒，10项既有advisory；bundle `8bd0e15d9a0ad5f3ccde4d61eb9f7226c11903c6ee9b0b84120107ce578547fe`，350件/5,019,241B，main2,030,238B。raw预算通过，不当作官方压缩包或手机完整字节身份。最初一次fingerprint误选父`dist`后已停止只读命令，改由现有sourceBinding确定`dist/weapp`；未修改或清理任何历史候选。

gen5完整feedback已归档`r19-ui-20261022/gen5-feedback-originals`，378件/9,455,184B逐件hash一致，含恢复后的回执与当前手机原图；此前独立gen5冻结/原unknown档继续保留。

gen6包装层在180.031秒超时，原result仍unknown/taskId:null；官方日志随后在`2026-10-22T13:53:32.864Z`明确`toolName=auto_preview / toolStatus=fail / errorCode=10 / durationMs=310550`。L25489–25751同一调用窗口只有唯一`CLI_f108e3fcb6a446b6d0d3372a3345b610`、一条gen6 prepared关联、一个upload start和一个auto_preview终态，AppID内部相符，反推开始时间与generation差175ms。没有progressSuccess/成功送达，不按代码10猜网络或包体原因。

沿已核的同一日志关联规则，在原run锁内保全并核对354件原件、原feedback/diagnostic和原始日志片段；`gen6-official-failure-originals/manifest.private.json` SHA-256为`7fbd7d3b755520b3289d15aa7b68b49f589bd7748c8684104a1a7498f1a23c16`。一次task-local只将disposition记录为failed并新增日志resolution，**原structured unknown和taskId:null不变**，未调用task-result API、未改通用守卫、未绑定失败候选。缺公开handle与工具/传输成功不替代业务终态。

既有普通预览授权内仅重试同一构建一次，gen7同一feedback在途；不重建/改码，预期bundle与gen6相同。根据实际官方调用310.550秒，只将auto_preview的本地有界窗口更新到360秒，以保住可能在官方5分钟边界返回的实际回执；39项诊断/预览/边界检查再次通过，其他操作及no-replay/no-bind规则不变。若本次仍失败，不继续同样循环。目标结果仍未验证，旧输入session不可用。

## gen7同包真实结果

唯一重试取得真正结构化success（exit0/errorCode:null），诊断 `.official-process-3662e054-0117-431a-8be6-c1d8f5f4f633.json`；`generation-000007-OyUYqD/project` 与gen6相同bundle。私有预绑定画面实际查看后沿原bind取得 `starward-device-test-bCQoHb`；旧session失效。没有新一轮日志重建、重编译或再次重发。仍为development_feedback，手机完整包字节/runtimeAppID未读回，不作settled-candidate认证。

| 实际过程 | gen7原screen ID | 判断 |
| --- | --- | --- |
| 月相原位返回 | `72e58a9b-8d18-4e3e-a246-2c5ac448f226` → `6b1732b1-3854-4935-a144-55ba21928dc5` → `4faea919-6174-4b88-9c32-07909a622cb4` | 原生来源页保Astronomy Engine/MIT/时段与限制；系统Back保月相和完整时间卡原阅读位置。 |
| 资源稳定与明确接管 | 73秒后的`0ddb3aeb-ec22-43b9-b499-1859d823a2b5`；手动滚动`a92b4b5b-6c63-44a6-b485-638baa2c7ec8`；地形章`8522b7c6-3773-40d9-956b-8487b0c1c904` | 无中间输入的延迟观察未再漂移；随后真实手势和章节跳转立即取得控制，不被旧来源锚点拉回。只关闭该已失败代表路径，不扩写全UI通过。 |
| Sky来源身份与恢复 | `434c3899-4c0b-4b66-b221-00e034e064f6` → `28c874ec-1bd4-477c-9aa2-1bb1bd00aee2` → `f9906b47-fbe1-44ac-9a94-13c52331b38e` | Alderamin/HR8162公共来源按钮进入真页，BSC5P第5版预备版/HEASARC、许可、URL、已知获取时间和限制正确，未知发布时间/适用时段不伪造。页内Back回同星体、相同方位高度及非空星图。 |

Sky原`recording-1792679089828.mp4`为5.982389秒/1080×2376；本机临时loopback同源服务器+已有Edge解码抽帧，浏览器/服务器均关闭，无安装或上传。已实际查看0/.2/.4/.6/.8/1/2/5秒：2秒原生右出途中左侧已有非空星图/星座图，5秒恢复原星体资料与背景。前段有record helper输入准备时间，不能当返回耗时；这些抽样不证明精确首解码像素或每一帧无空白。原图/metadata/视频与无改像素PNG留当前私有session及`r19-ui-20261022/gen7-source-return-review`。

Sky源页正确保留“部分资料未加载”与重试；星图曾提示暗星补充未完整加载。独立有效BSC结果被保留不等于全目录、介绍/科学量或所有SAO完整成功。当前局部来源验证不关闭这些性能/数据义务。

## gen7媒体模板与整帧独审

从Sky原返回按钮回Map后，第一张截到遮罩消退/正文重建途中（`b6e875cc-9fe7-4246-85be-4e8818b0aa52`），后续无输入的稳定图`a907e037-2bbb-4e2a-9f2d-2d76b01fe920`恢复原大档地形/5km，不把过渡中的顶部内容误记为最终复位失败。通过基本信息→查看攻略→阅读攻略进入真实文章，不用直接调用handler替代入口。

媒体权利模板实际图 `80fb97a9-bb3e-4677-b51a-3e31b848346d` → `e92f1da7-bf06-4356-b293-ba4d69dcf947` → `d0987529-effb-42fb-a7b3-d6e8ec2711f5`：同一公共按钮打开真页，保摄影者、许可原文、拍摄时间未提供和现场归属，Back回原文章附近阅读区域；未把capturedAt伪装为retrievedAt。照片本身在viewer/攻略均读取失败，模板可读不等于媒体成功。

[独立整帧审查](R19-SOURCE-TARGET-REVIEW-20261022.md)确认两项P2，均保留而非用局部来源成功覆盖：媒体相对本站URL出现“复制原始出处”，却被外链校验拒绝；HR8162资料modal分隔线以下整块正文不可见（根因尚待分离查询资格/布局，来源页独立请求不能替它证明完整资料）。

媒体复制已在既有`media-source` owner抽出同一受限已发布媒体route投影，由当前BFF补完整地址；SourceLinks只对该route采用此可信地址，任意私网外链仍被原校验拒绝，外部URL和既有fixed-publication下载规则不变。真实模板的新回归先在旧实现失败（native写入为0），修后与原media-source检查2项通过；仍待独审与下一候选手机动作，不冒称gen7旧按钮已修。API照片失败另由[首边界调查](R19-MEDIA-READINESS-BOUNDARY-20261022.md)确认是task-only DisabledStore依赖，三份公开对象原件已核完整，正在恢复只读供给而保持上传关闭；不改产品数据或重产图片。

task-only媒体依赖已恢复，仍为三键只读/上传关闭，见[恢复记录](R19-READONLY-MEDIA-REPAIR-20261022.md)。gen7原文章中点击实际“重试照片”后 `0fb0f4ed-4f3c-4796-818f-a22890870075` 已实看蓝底TEST原隔离图及原版权/非真实场地说明，关闭该代表照片的HTTP/解码/呈现失败。不是实际现场摄影、全部媒体或复制修复通过。API重启改变volatile Context/cache，新旧不作性能对照。

媒体复制[独审](R19-SOURCE-MEDIA-COPY-REVIEW-20261022.md)未发现本改确认P1/P2；Sky正文[实现](R19-SKY-OBJECT-BODY-REPAIR-20261022.md)/[独审](R19-SKY-OBJECT-BODY-REVIEW-20261022.md)均明确native根因仍待目标验证。新正文用普通View分配剩余高度、ScrollView填满视口，内容/原padding保留，旧header测量及唯一回调退休；四项原检查/最终TS通过。新导航共同依赖也保各业务恢复，独审未确认回归。通知host旧夹具仍寻找路线内直接host，已沿真实`SourcePage`组合边界修复断言，生产未为夹具恢复旧结构。

完整gen8构建61.018秒/10项既有advisory，bundle `7772cb07c7b2e65d3df6832c6bbd81d64ffb3206cc23faaa9329ae089e1eee71`、350件/5,018,782B（main2,030,532B）。同run只调用一次refresh；auto_preview在304.559秒返回MCP_TOOL_ERROR terminated，官方L29041/311.059秒明确fail/code10，唯一CLI/项目/时段及AppID内部关联、utility销毁已核。原unknown/taskId:null保留，354件原件与日志窗口逐件hash保全后一次task-local failed disposition，manifest `9a9eddce8d95c89f8a5708bc3fe510fe89486cea0cc481dc0218e25c029f2b52`。不按code10猜包体/网络、不延长已足够wrapper或重复auto调用。

终态之后走现有普通二维码路径，同一prepared `generation-000008-fwdDQU/project`取得exit0和有效新QR；诊断`.official-process-275859ac-3fc3-4909-9398-2200728e938a.json`。QR文件标签排队到本任务右侧，已请求原手机扫码/信任并前台保持；没有新deviceSession，不把旧gen7当gen8。gen7整份429件/24,997,534B已私有逐件hash归档，manifest `e10cfe365e9d80c21b7ca13f00dd7b8ec3e4c4495f063f7dba67f9a109dad3e6`，旧输入资格失效。复制修复、Sky正文、精确首像素、80/140ms及完整UI/性能/内存仍未验收。
