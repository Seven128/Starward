# 图像工具测评过程历史快照

归档于2026-10-09非PS阶段收尾。下文完整保存归档前计划／安装／外部依赖／实测／独审记录，其中“当前”“下一步”“未安装”“尚未实测”等为当时状态，不再用于调度。唯一当前要求、阶段结果与恢复点见同目录 `image-tool-full-comparison-2026-10-08.md`；最终非PS结果见 `image-tool-nonps-results-2026-10-08.md`。主Goal仍暂停。

## 归档前原文：五条图像处理方案质量优先补充实测

状态：本次独立Goal active。**最新用户要求“先跳过ps吧，把其他的做了，我去解决ps的问题”。PS授权由用户处理，agent不再继续试用/付款入口排查；当前完成非PS工具的实际测评和成果保存。**PS及插件已装好；SXT代表/保留样本/原生小批/Scene已实际测过。PS自身及PS+SXT插件两条留待用户解决可编辑授权后补测，不能据CLI结果冒称插件组合已测。此前获准的官方月付7天试用及测后立即取消仍有效，但没有开通订阅；若后续领取带续费试用，取消确认仍是该阶段完成条件。主云观星Goal继续暂停。

### 最新恢复点（优先于下文历史阻塞记录）

- 当前实际入口 `E:/CLI/rc-astro.exe`，CLI 2.6.9 build727 ga2033f5b；用户完成安装。SXT首次激活网络超时，普通重试成功（退出0）；未降低TLS校验或修改系统代理。授权返回30 days remaining，随后参数发现接口返回trial valid=true、daysLeft=32；仅记录两项观察，不推算精确到期日。
- 已安装模型 `C:/Users/777/AppData/Roaming/RC-Astro/StarXTerminator.11.onnx`，66478084 bytes、sha256 d15b0ea04e7b41d179b68316511a5bd08d2faaa459789baf3379d9a678076821；实际推理日志已确认RTX3060/DirectML，输出见下方运行索引。
- CLI和SXT参数说明存 `output/image-tool-full-comparison-2026-10-08/rc-astro-{cli-help,sxt-help,sxt-help-activated}.txt`；脱敏参数JSON `rc-astro-sxt-options.json`。不保存含account/email/computer/key的原始授权报告。PS插件已安装验签，实际调用待PS可编辑授权。
- Creative Cloud和Photoshop主程序均已安装，已实际打开NGC253原图。旧RC安装启动句柄33647已取消结束，不再等待UAC。账号已注册/登录，不再请用户重复领试用或操作整套安装；窗口句柄恢复必须重新list_windows。
- 用户明确授权agent自行操作官方PS安装、SXT试用领取，并提供了领取所需地址；随后又授权下条所列PS月付试用及测后立即取消，不再要求用户自行完成整套流程。
- **最新授权修正**：用户回复“授权月付方案试用，测后立即取消”。允许官方PS个人月付7天试用、US$34.99/mo无年约，不选年约/预付/CC Pro/Adobe Stock附加，不作额外购买；如缺支付资料，仅由用户在官方页面填写。完成加工/验证后立即取消并保存实际取消状态；不能仅退出程序或关闭卡片算取消。Goal目标文本不能通过工具编辑，本索引保存此新授权且应优先沿最新用户消息执行。
- 已进入Chrome官方Adobe Checkout（会话browser3、tab1362048147；恢复需查当前tabs）。**已选Monthly Subscription、购物车只含Photoshop 7-day free trial、无Stock；网页实际报价US$34.49/mo+tax（较获准US$34.99更低），Due now US$0.00，页面到期/扣费日Oct16,2026，试用内取消不收费。**支付卡号/有效期/姓名/邮编为空，无已有支付方式；此前handoff等待填写已被最新“不支持中国、核查免绑卡”要求取代。未点Agree and subscribe，未开通订阅；付款信息不读回、输出或保存，不虚填国家/地址，不绕过授权。无需重复询问已获准的试用授权。
- **免绑卡入口实际核查已完成**：官方2026-04-07个人版安装说明明确“输入您的付款信息，然后选择同意并订阅”（https://helpx.adobe.com/cn/download-install/apps/download-install-apps/creative-cloud-apps/download-install-trial.html，正文499–502行）。官方转换说明提及未提供支付信息的试用，但不能据此推断本账号可领取。中国Photoshop试用页/免费CC页实际重定向到 `/cn/creativecloud/roc/business.html`；“免费试用”只进入 `/download/creative-cloud/?locale=zh-Hans` 的CC下载页，CC已安装，不重复安装。旧官方中国摄影计划FAQ（2022）仍说可下载7天试用，但链接也进入相同商业页面。旧官方团队版PDF的14天免绑卡宣传未获现行入口证实；`/creativecloud/business/teams/free-trial-download.html` 在实际Chrome跳转 `/creativecloud/business/teams/plans.html?promoid=TBJRLG1V&mv=other`，只提供Buy now/年约付费卡片。中国下载页“查看应用程序”进入 `/apps/all/all-platforms`，PS仅下载/打开，更多菜单无独立免付款试用，打开实际进入 `photoshop.adobe.com` 网页版，无法替代桌面PS插件/批处理测评。2026-10-08 15:41:59 UTC读回个人Checkout仍有Agree and subscribe且无订单确认；未提交订阅。当前结论仅为“所查官方入口未找到适用免绑卡桌面PS试用”，不宣称所有地区/组织都不存在。先补齐M8实际HiPS消费者，PS两条保留外部授权依赖，不擅自改选年约/其他付费方案、不虚填地区/账单。
- Adobe账号免费会员已登录；PS实际路径 `C:/Program Files/Adobe/Adobe Photoshop 2026/Photoshop.exe`，文件版本27.11 (20260929.r.26 8c16e56)。已通过EXE文件参数打开同一NGC253 normalized original.png，编辑/图层控件置灰，侧栏明确需订阅。实际官方试用报价截图 `output/image-tool-full-comparison-2026-10-08/photoshop-trial-offer.jpg`：7天试用后月付US$34.99（无年约），默认年约月付US$22.99、有后续解约费用，另年付US$263.88。**未点击最终承诺/未提供支付资料/未开始订阅。**本轮所需是可用PS授权，不再是安装或领取SXT。
- PS插件2.6.9已用官方签名安装器经gsudo实际装到 `E:/RC-Astro-Photoshop/`，退出0，官方Common Files快捷方式指向此处RC-Astro.8bf。签名Valid，程序hash和完整入口见 `rc-astro-photoshop-installation.json`；与CLI共用已激活账号，实际PS调用仍未做。安装完成不算PS+SXT已测。
- PS首次启动初始化缓慢；COM New-Object两次CO_E_SERVER_EXEC_FAILURE，运行对象表不可用；不能据此断言PS不支持脚本。native插件能控制PS本体，但内嵌WebView文件/授权控件点击拒绝为non-target process；用原生标题栏关闭云文件选择器，再通过EXE参数实际打开本机PNG成功。PS编辑授权取得后先验证官方JSX/COM或File>Scripts路径及无改动往返，不复用旧过早快照/旧窗口标题过滤（打开图片后标题变为路径，应按返回app标识选窗口）。
- **SXT实际代表已完成**：`sxt-representative-r1.json` 两张默认 .2 overlap；NGC253 14.422s（首次本轮推理）、M8 4.052s。ML11、RTX3060/DirectML/onnxruntime1.23.2实际日志确认，星层与starless双文件、几何、ICC和输出hash核验；不是质量PASS。两receipt绑定旧runner625f5988…，后续增加2x和失败显式重试，不改写旧证据。
- `sxt-overlap-representative-r1.json`：NGC253 .5 overlap 7.302s；未见足以改变结构问题的改善，不比较首次14.422s与后次7.302s就宣称 .5 更快。`sxt-upsample-representative-r1.json`：完整图BICUBIC2x推理/LANCZOS回原尺寸，NGC253 10.124s、M8 5.369s；M8微星显著减少，蓝色亮星光晕仍有。保护区目前仍仅诊断，没有修补。
- `sxt-validation-batch-r1.json` 默认 .2 冻结后，NGC5128/M81-M82/M8邻瓦片三个真实新输入执行成功，6.073/5.639/3.845s。NGC5128亮星环仍有，M81紧凑红色结点进入星层；不能计作3件合格成品。下一步评估2x迁移/保护方案、native多文件CLI批处理的模型复用成本和真实Scene。
- 独审sxt_adapter_review只读核两默认代表18个绑定和图像，未见P1；发现P2失败缓存无恢复入口。已新增 `--retry-failed`：每次命令最多一次新attempt、同identity最多3次，原failure保留，成功attempt随后复用；真实原图恢复回归及脱敏/错误完成绑定回归共10条通过，`regressions-sxt-r2.txt`。旧reviewer已关闭；新修复未虚称再独审。
- **原生小批通过** `sxt-native-validation-r2.json`：相同NGC5128/M81-M82/M8邻瓦片2x输入，1次CLI实际推理9.043s、staging/hash0.295s，逐张工具墙钟合计17.227s（逐张完整流程合计24.932s另计，不能拿它直接比9.043s）。三张回原尺寸RGB与逐张结果maxDiff=0，不是输出缓存命中。上次r1模型处理成功但adapter猜错目录输出名，已标FAILED并保留，修为实际 `<input>-sxt.png`/`<input>-sxt-stars.png` 后真实r2通过；11条回归通过regressions-sxt-r3.txt。批处理不消除质量缺陷，人工/复核时间仍UNKNOWN。
- **本轮独审补充修复**：r2的三张final PNG与单张RGB相等但ICC缺失。新增 `write_sxt_native_final` 从已绑定normalized input恢复原sRGB ICC；`sxt-native-icc-repair-r1.json` 三张实际修复后与单张processed.png字节/hash/ICC完全相等，RGB对旧r2不变，无新推理，旧r2未改写；独审已核16个绑定，关闭该P2。共享准入校验还修了native入口绕过当前cluster/method/width配置：先核当前策略、完整receipt sample和metadata hash，再创建目录/stage；三种变更拒绝且不stage/infer的回归通过。13条测试最终 `regressions-sxt-r5.txt`；真实修复后 `sxt-native-validation-r3.json` 一次3图推理7.616s、maxRGBDiff=0且final显式ICC。独审已读回r3的51个绑定和真实日志、核13条回归及当前runner，两个P2均关闭；reviewer已结束并关闭。r2与r3是重复探索性读数，不承诺全库吞吐；r2色彩合同缺陷不能隐藏。
- **2x结构独审的当前判断**：NGC5128左上细丝ROI(285,350,370,440)明显变弱/消失并进入removed层，M81旋臂红结点ROI(140,205,195,275)成串被去除；两者自动整图去星结构门槛FAIL。NGC5128还留明显金色月牙/环。M8主要尘纹/低频颜色视觉上保留，蓝色弥散斑不都能认定为应擦除的恒星光晕；实际HiPS消费者未验，最终用途UNVERIFIED，禁止把整片真实反射/发射结构当作瑕疵擦掉。此结论优先于此前缩略图“细丝大体在”的初看。
- **默认与2x同ROI实际对照**：`sxt-structure-roi-comparison-r1.json` 绑定真实原图/default/2x及裁切；`ngc5128-sxt-structure-default-vs-2x-r1.png`、`m81-m82-sxt-structure-default-vs-2x-r1.png` 已实际查看。NGC5128蓝/红细丝和M81红旋臂结点在默认与2x中均明显丢失，不能简单退回默认就关闭结构FAIL。裁切仅作近邻4倍诊断展示，推理仍用完整图，不裁切改变视场。
- PS脚本准备核查：官方支持JSX/JS及File>Scripts>Browse；安装内置Image Processor示例有 `#target photoshop` 和保存/动作API。RC官方提供的分层动作下载至cache `RC Astro StarXTerminator Unscreen Stars.atn`（2418B、sha256920be60d566a8fc2ff1b7a339d4f76d3b15deed63bee5b12ce20829eb1315058）；官方ZIP hash1be1495949811ce0be9b09976713c5765ce58251baf6b8d93516857011c5eb9c，来源 https://www.rc-astro.com/starxterminator-usage-notes/ 。尚未载入/执行动作，不算PS实测，后续需核它与新统一插件2.6.9的实际兼容性。
- SXT NGC253真实Scene（original/default/2x、同相机wide/detail）在旧output根 `scene-sxt-r1/`。实际提交/像素贡献/资源释放通过，已经看图，三条均有矩形边界，SXT两条减少照片星点而未解决边缘；M8真实HiPS消费者仍未验，不冒TAN图片。

### 安装/注册历史（当时状态，当前状态仅见上一节）

- Chrome旧下载按钮曾失败（Download 242 failed）；后续完整CC安装已解决，不能据旧下载失败重复领取或安装。
- 重新gsudo静默安装仍以“operation canceled”结束；用户说明未看到UAC。改为直接Start-Process官方Set-up.exe -Verb RunAs成功打开登录页，但提升权限窗口自动交互不响应。已用一次获准提升的pwsh辅助进程结束仅该未安装实例，再普通启动Set-up.exe；当前安装器进程26904，窗口Adobe Creative Cloud。身份验证及登录后已到“开始安装”，已点击；下一步读取进度。不得仅凭进程存在算安装完成。
- RC Astro：Chrome结算仅StarXTerminator Free trial、总价$0，已按用户提供资料提交。账号页明确“Thank you for your order”以及StarXTerminator Trial、0 of 2 activations used。下一步安装并通过官方Get Activation Code激活；未实际跑图。
- 新注册密码随机生成，长期只存Windows当前用户DPAPI密文，路径 `C:/Users/777/.cache/starward-image-tools/private/rc-astro-signup-password.dpapi`，目录ACL仅当前用户；短暂传递文件已立即删除。**不得输出密码/激活码/完整邮箱地址，不写入任务证据；需要凭据时只在本机内存和官方界面使用。**账号属于用户，可通过登记邮箱恢复。
- 官方账号页当前下载：`https://www.rc-astro-cdn.com/clients/2.6.9/rc-astro-cli-2.6.9-windows-x64.exe` 与 `https://www.rc-astro-cdn.com/clients/2.6.9/rc-astro-photoshop-2.6.9-windows-x64.exe`，均保存cache根。CLI SHA256 dc4e8e431bd5f289fa35e0dbeff4f43c0b81e7e3c6a6344a644d20c02e06cdf8，PS插件SHA256 31812a096a18bf0471ac2f9fa93107e4eba88c38c8e000d09c9d489d6821ebde。CLI签名RC Astro LLC Valid；插件签名核验待读取下载进程完成结果。旧官方开发公告0.9.8直链404，不采用旧版或猜测下载URL。
- RC Astro协议已重读：普通产品评论/比较允许；不提供为他人处理图像的服务、不分发程序/模型、不用输出复制模型/同类算法。当前试用用于本人的独立工具比较，不据此断言所有产品分发用途已获授权。来源 https://www.rc-astro.com/rc-astro-software-license-agreement/ 。Windows CLI官方说明可自动Direct3D12加速、支持PNG/TIF/FITS/XISF；实际版本/设备/时长仍以运行结果为准。
- 本轮是用户恢复后的新阻塞审计起点，已取得实质进展；不沿用下文旧3回合阻塞计数。继续补齐PS/SXT实际处理、小批量和质量审查；不能提前标complete。
- 后续实际状态：CC路径 `C:/Program Files/Adobe/Adobe Creative Cloud/ACC/Creative Cloud.exe` 已存在，Creative Cloud及Adobe Desktop Service进程运行，Chrome出现Adobe“准备就绪”登录完成页。CC窗口id394386（仅当前进程有效，恢复须重新list_windows）。RC CLI安装器已启动，当前Windows安全桌面显示发布者RC Astro LLC的UAC；安全桌面不出现在可控窗口清单，已异步请用户仅点“是”。exec安装启动句柄33647仍等待。不要针对CC窗口误点安全桌面。
- 两个RC 2.6.9安装包均RC Astro LLC Valid签名；没有运行旧0.9.8包。SXT账号授权已取得，但激活/实际推理仍未做。RC账号网页截图因UAC期间Page.captureScreenshot超时未保存，不能引用不存在的截图。浏览器读取隐藏row text会包含license key，**只能读可见状态或输出预先白名单化字段，不能输出原始row文本/完整DOM**。

## 最新要求与必须保持的范围

- **当前阶段调整**：用户明确先跳过PS，由用户解决PS问题；agent完成其余工具/能力的代表样本、保留小批、真实消费者、代码质量与可重复路径，保存明确的阶段选型结论。PS两条保留待补项，不追问支付资料、不再研究或操作PS订阅，不把本阶段结论冒称完整五方案最终排名；主云观星Goal仍暂停。
- 用户纠正：目的不是证明现流程可保留，而是找出能让大量云观星星图图像**高质量且高效率完成**的工具/能力。质量是门槛，过关后才比较处理+修补+复核的总时间；不能把缓存复跑速度当新图生产效率。
- 必须以参考对话/截图的5条为主体：①PS自身；②PS+StarXTerminator；③StarNet2；④nox；⑤Siril+去星工具。既有Python/Photutils与原样仅对照，不替代五条主比较。Siril只是调用其他去星算法时，工具链和算法层分开记录。
- 用户授权再建独立Goal、缺PS就下载安装并实际测试；不能仅因尚未安装就把重要候选留在纸面。已说明使用官方包/合法试用，不寻找破解。付款/外部账号授权不足才记录真实依赖，同时推进其余可做项目。
- “合格成品直接复用”仅指输入经相同质量门槛证明已满足用途时可省步骤；现有未达标输入不以这句话排除加工需求。旧测评只有局部完成，不能代表完整选型。
- 用户要求的目标索引/压缩恢复规则延续：压缩后先读本文件；需求改变修改当前计划，记录代码/证据路径，不再另建竞争计划。
- 完整初始合同：`../IMAGE-TOOLS-BENCHMARK-START-2026-10-08.md`、`../IMAGE-PIPELINE-PROBLEM-2026-10-08.md`，已读。本次用户更新优先于旧合同少量候选即可收口的解释。其他范围边界继续有效：固定本工作区/分支，不提交推送/发布/部署，不恢复主Goal，不全量素材生产，不更改默认注册/预算，不上传本地素材在线加工。
- 参考Chrome对话 https://chatgpt.com/g/g-p-6a58948368b881919bf7b4a9bcdd4571-jin-wan-qu-guan-xing/c/6ac75e1a-cda4-83e9-8a45-512787fadb75 ，用户tab为browserId d5dbfe8b-c4dc-4331-8f7e-267fcbe8fe71 / tab1362048043。此前已读，今轮重新核后半段产品要求及五方案。

## 既有证据与代码入口

- [上一轮局部实验](image-tool-benchmark-2026-10-08.md)、同名json、`output/image-tool-benchmark-2026-10-08/`必须保留。原样/Photutils/Siril背景/nox已经真实测过，不能冒PS、SXT、StarNet或Siril去星测试。
- 现有共享 `../scripts/benchmark-image-tools.py`、`benchmark-image-scene.mjs`、`image-tool-benchmark-samples.json`、版本锁和test-image-tool-benchmark.py。扩展这些责任或加最小调用适配，避免每对象一份脚本；代码改动前读当前实现。
- 本机PS是否安装需实际核；Siril1.4.4、nox1.1.0位于 `C:/Users/777/.cache/starward-image-tools/`；隔离Python3.12.14在旧output/.venv。CPU i5-11400F、32GiB RAM、RTX3060 12GiB。不得把旧CPU单图结论推广模型全部最佳配置。
- 旧原图含NGC253（弱盘/稀疏背景）、NGC5128（弱晕/密星/细丝）、M81/M82（双目标）；需要弥漫星云代表原素材（优先既有M8原tiles及真实输入）和星团保护负例NGC6752；不能只对星系做去星然后宣称适用于星云/星团。
- 原图/权利/AVM/TAN准入沿原pipeline，几何alpha、显示权重、科学有效性不混用。当前Scene底色/矩形/覆盖问题不能只看单图“好看”；允许必要最小诊断适配，不制造外围观测。

## 质量门槛（先判定，后排效率）

同来源原字节、完整视场、同尺寸/色彩约定、同最终Scene曝光/相机比较：1）目标核心、暗纹、弱外围/细丝不出现可见删除或编造；2）星点分离不留明显暗洞/光晕/纹理，星团成员不误删；3）实际星空中底色/硬边/密度突变达到所测用途要求，不能只输出starless就判通过；4）坐标/尺度、缺测范围、来源可追溯；5）批量可复现、参数/手修可记录且异常隔离。每方案分别给PASS/FAIL/UNVERIFIED及具体画面依据，未达标不按秒数推荐。

保护区、蒙版、局部修补是工具能力的一部分，可以使用但必须计时记录；给每条相同的质量目标和有界调参机会，不能只给成熟工具一个随意默认参数便淘汰。先代表训练/调参样本，冻结recipe后再测不同风险保留样本；复杂度不能偷换为无限试验。

## 当前执行顺序与完成条件

|阶段|实际工作|完成证据|状态|
|---|---|---|---|
|A|重核参考、官方下载安装/试用入口与本机授权；固定样本和质量检查区|5条各有实际可执行入口或具体依赖|全部软件已装；SXT激活/真实GPU可用；指定PS月付试用已获准，但中国付款渠道不适用，所查官方入口未找到免绑卡桌面PS试用|
|B|五条同质量目标实测；Siril使用正确官方wrapper|原图/过程/输出/Scene与机器、人工成本|nox、StarNet、Siril+StarNet和SXT CLI已跑；PS自身和PS组合仍未加工|
|C|冻结recipe保留样本小批，核新输入与缓存分别成本|成功/质量/返工分母|可运行三方案12项完成，3×4；未判成品合格，另3项同参数Siril对照|
|D|独立审查代码+图像+结论、保存结果|完整5条不漏依赖|当前三方案/代码独审已开展并修复P2；整体仍未完成|

## 当前未解决依赖

PS本体及插件已安装，但当前账号只能打开查看；用户已授权官方个人月付7天试用、US$34.99/mo无年约及测后立即取消，随后报告不支持中国支付信息。指定US Checkout不能跳过支付资料；所查中国/团队/应用目录官方入口未取得免绑卡桌面编辑授权。可用PS授权仍为外部依赖，不能重复要求已获授权或用网页PS/CLI冒充桌面组合。SXT CLI已实测，尚无完整五条最终排名。继续独立的M8实际HiPS消费者核验，不扩展为其他订阅、额外购买或未授权联系厂商。

- StarXTerminator：官方 https://www.rc-astro.com/software/sxt/ 的零元试用已由agent按用户提供资料领取成功；凭据与安装进度见文首最新恢复点。无需用户重复注册。接下来安装CLI和PS插件、激活授权，再做实际测图；独立CLI试用不替代PS组合验证。
- Adobe：winget官方CreativeCloud6.10.0.252.41安装退出24；随后从Adobe官方direct-links页获取完整包 https://ccmdls.adobe.com/AdobeProducts/StandaloneBuilds/ACCC/ESD/6.10.0/252.41/win64/ACCCx6_10_0_252_41.zip ，已解压cache/AdobeCC-6.10.0，Set-up.exe Adobe Inc.有效签名；已使用既有gsudo授权启动 `--silent` 安装，日志新output/adobe-direct-install.log。尚未证实PS安装或试用授权，不能误写已测PS。原winget失败日志保留adobe-install.log。
- StarNet2 2.6.2 build0242 ORT官方ZIP已下载并校验SHA256 fbd5c7bdbbbee0cdbabf101b2c7ac2af3d33e3c477f9585f38f98b882f1551a0。路径 `C:/Users/777/.cache/starward-image-tools/starnet-2.6.2/starnet2_win_2.6.2-0242_ORT_x64_cli/`，exe已实际运行，DirectML可用。包内LICENSE.txt revision2026-09-07：允许独立评论/比较；第5节明确限制软件产品素材、测试fixtures/reference results，即便非商用/已后处理。**本轮StarNet仅独立工具评论对照，输出不进入Starward renderer/产品/回归基准；正式采用需另获适用授权。**不得把该限制误写为“仅禁止商业处理”：商业照片处理本身获允许。没有外联索权授权。
- Siril1.4.4旧内置starnet命令不支持2.5+；使用官方脚本仓库StarNetAstro/StarNet.py 1.1.1（GitLab项目48435700），已下载cache/StarNet-Siril.py，源码GPL3+；pin文件新output/siril-starnet-script-pin.json，sha6073ae3d2f73eeeb972a57e364a6e741329fcda29e010d4f4d63b6d0e21ea33e。当前siril-smoke-r1通过pyscript调用，独立工具对照不作产品测试。首次初始化用户Local/siril/venv，安装费用/耗时另列，不混入稳定单图时长。
- nox官方README https://github.com/charvey2718/nox 明确代码**和训练权重**均MIT；上一轮“仅确认代码、权重待核”的不确定性已消除。

## 运行事实（随进展替换）

- 本次get_goal返回null，新Goal是这次补测独立目标。
- 当前已有上一轮未提交成果必须保留。新输出目录计划 `output/image-tool-full-comparison-2026-10-08/`，软件共用cache；本索引仅任务本地事实，不改主PLAN。
- 新manifest `../scripts/image-tool-full-comparison-samples.json`，扩展原共享runner，原始证据均保留。代表NGC253完整1024宽、M8原512瓦片Norder6/Npix28891；同邻域28892与NGC5128/M81保留样本待小批验证。M8原RGBA只准alpha全部255转RGB，原未标色彩的发布网页PNG显式声明sRGB显示解释；不做科学校准声明。未覆盖瓦片不得这样去alpha。
- `representative-review-r1.json` 已完成8项：原图/nox/StarNet默认/StarNet2x，各两样本。NGC253整图总时长1.075/25.306/5.064/5.973秒；M8为0.084/11.843/1.858/2.416秒。每项receipt有hash、处理日志、原图/processed/差异/removed和comparison.jpg。手修0，人工复核秒数UNKNOWN，不得编造总有效成品效率。
- 已看M8三组比较：nox默认大量细星残留；StarNet默认明显改善，2x进一步减密星，但蓝亮星附近仍残留扩展光斑，低频星云颜色大体在，细节需局部检查。NGC253默认/2x已看：星系主体保留、明显去星，尚不能据缩略图宣布微弱结构完全无损。不能只看去星成功就判最终合格。
- `nox-upsample-review-r1`已完成NGC253/M8，给nox同样有界2x采样机会。机器时间是单次本机探索性读数，不是独占硬件统计吞吐；安装/依赖/开发检查有后台活动，不能比较小数点差异或承诺全库速度。

### 最新执行点（覆盖上面已结束进程）

- nox2x代表测试已结束：NGC253 67.704秒，M8 24.318秒；M8细星去除比默认明显改善，但仍比StarNet2x有更多密星残留。2x不是无收益，不能继续沿用旧“nox默认失败就全淘汰”的推断。均未手修；不能算合格成品。
- Adobe gsudo安装调用最终返回 **The operation was canceled by the user**。`gsudo status`明确管理员缓存当前0且不可用，未发现Adobe安装后目录/窗口。已异步请求用户响应UAC，并说明真实依赖。未重新尝试提权，等待回复。PS/SXT还未实测，Goal不能完整完成。
- Siril smoke r1/r2实际失败：--masks参数错误但Siril退出0并保存原图。新增quality-status.json标FAILED。r3/r4虽然实际推理，但8-bit PNG导入保留0..255的uint16，官方wrapper除65535，输入亮度缩小257倍，画面错误；set32bits未解决。都保留，不计质量成功。
- **siril-smoke-r5成功打通正确数据路径**：原RGB8逐像素乘257为RGB16 TIFF，保留原sRGB ICC；不拉伸、不线性化，官方pyscript --masks starnet-mask，PNG8导出。导入导出roundtrip maxDiff=0/meanDiff=0。去星输入归一化范围与原图一致，DirectML真实执行；5.809秒（不含首次依赖下载）。已看输出。Siril官方wrapper没有另一个模型，不承诺比StarNet同参数质量更高。
- Siril隔离venv依赖目前sirilpy1.0.25、numpy2.5.3、PyQt6 6.11.0、tifffile2026.9.20、imagecodecs2026.8.16、astropy8.0.1；官方脚本首次自动装依赖约189秒且该轮处理失败。共享benchmark venv仅增加tifffile2026.9.20，锁文件已更新。
- 共享runner已添加siril-starnet、独立StarNet默认/2x、nox2x、显式RGBA全不透明/未标ICC显示输入支持；缓存含工具模型/官方wrapper/config/venv包版本；Siril严格检查推理日志和roundtrip像素；50ms进程树RSS抽样，显存峰值UNKNOWN。7条回归通过，日志新output/regressions-r1.txt。未更改产品代码。
- `validation-batch-r1`已结束：NGC5128、M81/M82、M8邻瓦片28892，原图+nox2x+StarNet2x+Siril/StarNet默认，共12项全部机器执行完成，**不是12件成品合格**。174.946秒；warm-r1 6.317秒、12/12hash核验命中。后来独审加固了Siril成功判定，runner哈希已变，旧warm仍是当时真实证据；新runner第一次旧命令会合理重建缓存，不承诺旧缓存持续命中。
- `paired-siril-comparison-r1.json`另补同参数StarNet默认3样本，防止拿Siril默认与StarNet2x当成完全相同算法配置。Siril精确16bit转换会让模型量化路径不同：最终RGB与直接8bit均值绝对差0.528–1.139，最大38–45；不宣称逐像素一致。完整数值新output/metrics-summary.json。
- NGC253 nox2x实际Scene已通过共享runner生成并实际查看：旧output根 `output/image-tool-benchmark-2026-10-08/scene-nox-upsample-r3/`，原样/nox2x同相机宽视/细节共6帧；GPU提交、真实像素贡献、资源释放通过。两者矩形边界仍可见，nox亮星环在细节视图明显。M8是HEALPix、没有TAN模板，显式SKIPPED_UNSUPPORTED_GEOMETRY；不能冒充已验M8当前Scene。所有StarNet派生显式SKIPPED_LICENSE不接入产品Scene。r2初次未筛选M8抛错，保留未覆盖。
- 独审发现并修复P2：模型Done后wrapper仍可能失败而Siril退出0。现在必须看到导回后的FILTER=Starless和Saved Starmask日志，并读实际FITS mask的尺寸/有限值/非空，最终已知密星样本RGB不得无变化；新增“模型完成但wrapper失败”的回归。guard-r2因额外要求mask header FILTER而误拒绝，独审指出官方产物实际上无该header；已移除这一无依据约束。失败仍保留。**最终真实guard-r3完成，7.614秒，roundtrip相等且推理/导回/蒙版检查通过**。7测试最终通过（regressions-r3.txt）。

### 独立审查记录

独立reviewer full_comparison_review于本次补测只读核22条已有receipt输出hash/bytes/尺寸/changedPixels，并实际看代表图和NGC253 Scene。无P1；两项P2为同一成功判定责任：先修模型Done后wrapper失败误通过，再修无mask FILTER字段误拒绝，以上都有保留失败和实际复验。reviewer已完成并关闭；最后移除多余header条件的真实复验由主agent执行，不虚称另获一次独立审查。审查明确同意不能把运行成功当质量PASS，nox破坏目标结点与亮星环、矩形边界必须保留失败。PS/SXT、M8完整HiPS消费者、目录星叠加、星团实际加工保护、真机、总有效成品吞吐仍未验。抽样内存不得当物理峰值或据Siril较低数值宣称省内存。

## 当前判断与可重复路径（不是最终五方案选型）

|方案|已实测内容|质量判断与当前用途|新输入总机器时间（秒）|
|---|---|---|---|
|PS自身|CC6.10及PS27.11已安装，原图可查看；正领取已获用户授权的月付7天试用|编辑/质量UNVERIFIED；不能称无用或排除|未测|
|PS+StarXTerminator|SXT零元试用已领取激活，ML11/CLI2.6.9代表及小批已实测；PS插件2.6.9已安装|组合路径UNVERIFIED；SXT CLI仍有结构结点/光晕/硬边问题，不能用CLI替代PS组合结论|SXT2x单张3保留样本11.20/8.58/5.35；原生批工具9.043（边界不同，非合格成品总时间）|
|nox默认/2x|两代表+三保留，NGC253真实Scene|2x改善细星，但NGC253/NGC5128仍亮星残环；M81旋臂红色结点明显被压掉，NGC253内部亮结点也被删除。**自动原样成品质量FAIL**；需要保护/修补后重新计质量和人工成本，不能当主批处理获胜者|2x：NGC253 67.70，NGC5128 65.44，M81/M82 38.38，M8两片24.32/30.28|
|StarNet默认/2x|两个代表+三个保留，DirectML实际运行|M8细星分离明显好于nox默认，2x进一步改善；M81保留更多红结点。NGC5128亮星仍有环，完整弱结构无损UNVERIFIED。正式项目资产用途受包内许可限制，不能目前采用|2x：NGC253 5.97，NGC5128 5.50，M81/M82 4.29，M8两片2.42/2.46；默认保留3片3.21/2.96/1.83|
|Siril+StarNet|正确16bit交接+官方1.1.1脚本，3保留输入|可重复调用已经打通；它增加操作/格式组织，没有证据产生独立质量优势。StarNet许可同样适用；不采用作产品产物路径|NGC5128 9.37，M81/M82 10.57，M8 7.28；M8 smoke5.81；首次依赖初始化约189秒另列|

所有机器时间包含所用runner的输入读取/hash、格式转换、推理、编码与诊断输出；处理细分见receipt/metrics。不是人工总时长。手工修补0次/0秒；人工看图与编排时间没有可靠逐阶段计时，仍UNKNOWN，因此不能给“每小时合格成品数”。自动成品质量通过率尚未建立；不得把运行成功率当质量通过率。星团通用去星各方法均在载入工具前拒绝，旧NGC6752负例保留，未把星团成员删除冒充去星成功。

可复跑同一批（每次--run使用新名字；输出从不覆盖）：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-tools.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --output 'output/image-tool-full-comparison-2026-10-08' --run validation-next `
  --samples ngc5128 m81-m82 m8-tile-28892 `
  --methods original nox-upsample starnet-upsample siril-starnet
```

StarNet两路径仅限上述独立工具比较许可范围。正式路径暂不选它；不能以快于nox跳过质量/用途门槛。当前最有价值的结论是：**完整图像任务需要星点分离、目标结构保护、底色/边缘融合这几个独立能力；纯去星并未自动完成后两项。**已有来源/坐标/哈希/清单/格式交接应复用；像素步骤仍等PS与SXT实测后决定，不能现在预定现有代码或nox获胜。

当前下一步：PS由用户处理，先完成非PS工具M8实际HiPS消费者及有界结构保护/修补可行性判断，汇总已有代表与保留小批、独审代码/图像/结论，保存当前可重复路径与质量优先阶段选型后停下。之后用户取得PS授权再补PS自身与PS插件SXT：验证无改动往返，用同样原图测蒙版/曲线/分层动作及可观察操作时间，冻结recipe后3保留样本，若开通带续费试用，测后立即取消并保存确认。当前不操作订阅、不找破解、不外联、不额外购买、不恢复主Goal。

## 历史外部依赖审计（用户“你操作呀”恢复前，已被文首新进展更新）

- 2026-10-08，连续第3个Goal回合遇到同一依赖（计入原用户触发回合）。原回合为progress：实际补测、修复、独审与落盘均完成；后两次续跑为no progress，未重复实验。当前再次核验Adobe安装目录为空、进程为空、gsudo缓存0不可用，官方完整安装器仍就绪。
- 现态：未发现Photoshop/Creative Cloud安装目录或运行进程；gsudo管理员缓存0且当前不可用；先前安装句柄已终止而不是仍在下载。官方完整安装器仍在cache可恢复使用，未因自动续跑再次发起已被取消的提权。
- 先前Chrome RC Astro检查标签句柄已不存在，不将旧“未登录”快照当新登录状态；尚未收到用户完成试用领取的消息或可用授权凭据，SXT实测仍缺依赖。
- 连续3回合相同阻塞且独立可做工作已保存，按Goal规则将本补测Goal标blocked，停止自动空转；未标complete。需要用户提供实际可用的Photoshop安装/授权和RC Astro试用账号条件后再继续。之后用户恢复时重新计阻塞审计；不沿用本次3回合计数。主Goal仍暂停。
