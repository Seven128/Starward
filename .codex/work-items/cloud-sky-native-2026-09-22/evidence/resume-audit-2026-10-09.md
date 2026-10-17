# 恢复会话全范围审计与方案复核

范围：完整要求/33项义务、默认及相关Context、共享责任和实际消费者；不读旧聊天或递归历史交接。本记录是结构性自审和开发基线，不是全部源码穷尽审查、独立审查或最终验收。未修改生产源码/测试、未重新加工/采用图像、未操作设备或部署。按用户最新要求，只完成前期工作后暂停。

工作区 E:/dev/worktrees/Starward/remote-main-20260908，分支 codex/remote-main-20260908，HEAD b73523f1c76bf50a3811fcff65f3e2d2f791373d。初始dirty清单和开发检查保存在 [audit output](../../../../output/cloud-sky-audit-2026-10-09/)；222个状态项只表示该时点路径数，不代表本轮修改量。已有全部未提交成果保留。

前期文档核对见 [preparation-check.json](../../../../output/cloud-sky-audit-2026-10-09/preparation-check.json)：46个本地链接可解析、33个义务ID均在审计覆盖记录中、相关文档git diff --check通过。这仅检查资料一致性，不认证任何产品结果。

## 新的开发基线

| 项目 | 当前结果及限制 |
| --- | --- |
| miniapp-contracts TypeScript | exit 0，contracts-types.log；只证明当前静态类型。 |
| miniapp-api TypeScript | exit 0，api-types.log；不证明HTTP/静态出口或旧版次链路。 |
| wechat-miniapp TypeScript | exit 2，app-types.log。sky-body-image-publication.test.ts:39的可选字段显式undefined与exactOptionalPropertyTypes冲突；保失败，未修。 |
| App Sky/来源基线 | app-sky-tests.log：816项，737通过、78失败、1跳过，exit 1。命令范围为features/sky/*.test.ts、services/sky*.test.ts、services/*publication*.test.ts、services/celestial-information*.test.ts；不是全应用测试。 |
| 新构建/DevTools/Android/iOS/物理资源/容量 | 本轮均未执行。既有截图、软件场景和类型结果不能升级为当前实际原生结果。 |

检查使用项目 tools/run-node.cjs 与已装TypeScript/tsx。合同/API/App类型分别在原包运行 `tsc --noEmit -p tsconfig.json`；App行为基线用 `node --import tsx --test` 经同wrapper调用。日志保原失败。所有本轮检查进程已结束，无需恢复或重复启动。

失败至少覆盖三类：隔离环境漏入新依赖（例如17项EXTENDED_DEEP_SKY_CATALOG_VERSION、canvasSurfaceRef/resourcePageVisible/skyBodyImageBitmap）；旧结构探针与已迁移consumer不符；真实预期不一致（包括来源参数、盘面拾取、遮挡/已绘呈现断言及manifest错误码）。这里只初步归类，尚未证明每个失败仅是harness问题。恢复实施应批量按责任修复、保有效行为断言，再运行受影响范围；不得直接改预期凑通过。

## 当前实现、缺口和未验证范围

下表覆盖全部33个ID。原要求及原验收细节仍由ACCEPTANCE-CURRENT持有；这里仅说明本次审计怎样覆盖，全部最终状态不升级。

| 范围 | 已有责任/能力 | 未实现或尚未成立的结果 |
| --- | --- | --- |
| C01 / I02 | browsing-camera、投影/viewport及全天地景显露路径已有；页面依赖同一相机。 | 原生控件/显示组合失败；全景进入、连续往返和最新姿态组合的当前目标证据缺失。 |
| C02 / I04 | BSC/SAO目录、固定身份和观测帧、star-appearance与已绘拾取已有；不得随机补星。 | 当前完整链真实性/样式/密度稳定与真机结果未整体复核，78项基线失败不能整体忽略。 |
| C03 | 88星座目录、图线/插画/名称与尺度消费者已有。 | 当前原生组合、遮挡、实际开关/点选与设备性能未闭合。 |
| C04 | 合规Mellinger DISPLAY、模拟地景/晨昏、细视场背景机制已有；历史软件恢复证据保留。 | 连续背景与目标/区域照片的边界/色彩/弱外围仍FAILED；实际设备/物理资源缺证。 |
| C05 | Astronomy Engine几何、同刻日月七行星、coverage/纬带/环适配已有；七类共享草稿在位。 | 共享草稿未完成消费者/恢复/旧版链交付；真实全部外观、时变及目标平台最终验证缺失。 |
| C06 | TAN、目标/region、同源LOD、Prepared和编码/native/GPU owner已有；有效黑/alpha/科学UNKNOWN分离。 | 普通Prepared registry为空；批次采用链缺联结；矩形边界/部分伪影FAILED，配准与有效细节不能由名义TAN代证。 |
| C07 / I07 | v72中文检索、资料、模态与来源返回消费者已有；来源开始支持精确版次请求。 | 来源互斥参数与保留版次未贯穿；当前完整原生长文/关闭/Back/身份一致性未验。停止逐星开发保持。 |
| C08 | 用户明确暂缓动态卫星/彗星小行星能力。 | 保暂缓，不标完成、不作为当前Goal阻塞。 |
| C09 | 网格、辅助线、红光等现有显示/控制入口。 | 当前页面控件组合与其它状态独立性未闭合，存在相关页面探针失败。 |
| C10 / I01 / I03 / I05 | Context-session、公共地点时刻、observation-time、orientation-controller/完整旋转、页面披露已有owner。 | 授权/原入口、校准冻结与取消/确认/断流、时间预览取消提交跨午夜等组合须在当前真实消费者验证；原生问题未解。 |
| I06 / I09 | encoded持久文件、native加载、GPU、accepted-frame各有责任；共享Hook/反馈正在迁移。 | 迟到/取消/局部失败/代次/暖回等现有测试部分失效；不能把所有重试变为全Canvas重建，当前全链集成未验。 |
| I08 | 当前用户方向及有效共享组件规则保留，旧Sky设计不作为本轮审图要求。 | 软件桥和历史图不替代当前原生交互；大字号按暂停保留。 |
| D01 / D02 | 来源/许可/变更说明由固定合同和流程持有；排除源、真实谱段及候选范围未改变。 | 技术候选/可访问不等于合格采用；新增供给仍须按具体产品闭合适用权益和分发条件，本轮未新增法律结论。 |
| D03 / D04 | 原生WEAPP+TWGL+Astronomy Engine、自有服务、SXT/PS/NXT现选择及重评条件保留。 | 无证据重开整套引擎/工具选型；原生组合应先作有界实际验证，再判断受影响方案。 |
| K01 / K02 | 原加工收据、静态export/retention、层资源owner可复用。 | 缺贯穿复核/采用/出口的可分发库存和可靠成本；180GB共享盘、旧版/备份/暂存/非Sky引用与真实容量未闭合。 |
| V01 / V02 / V03 | 数值/owner/软件及历史原生证据各有原范围，新基线保留失败。 | 没有本轮全路径成功证据；软件结果和静态类型不能替代实际目录→HTTP→当前页→已绘交互及完整恢复。 |
| V04 / V05 | 已明确手机与同配置容量的目标条件，无需重新发明阈值。 | Android/iOS、官方包体、首可用/细节/尾延迟、帧时、物理内存与10/20冷进入加普通混合业务均未闭合。200DAU非并发。 |
| V06 | 新基线暴露现有失效，owner与真实消费者入口已定位。 | 未修复且未做新的修前/修后回归；737通过不覆盖78失败的义务。 |
| V07 | 既有Pro审查保持其原范围，本轮是自审。 | 当前共享修复及最终独审MISSING；未用自审或旧pins冒独审。 |
| V08 | 本次方案和适用架构owner已修订，入口/交接同步当前停止边界。 | 结构核对不证明产品正确；后续耐久变化仍需落原owner。 |

## 决定方案修订的直接证据

- body-image-publication声明和校验只固定current；fixed-body-texture-publication虽有retained，但具体七类owner不完整传递保留声明；controller图片路由仍取当前或硬编码文件名。selected-hash endpoint不等于真实历史供应，旧月面JPEG别名不能生成虚构历史metadata。
- Sources构造参数仍允许独立可选image/optical/body hash，家庭/对象/版次应共同校验；公共URL路径语义还分别列在client、controller、static-bundle中。origin/文件/采用规则必须各留其信任边界。
- sxt_batch和image_quality已有共享处理/复核；publish_native_batch收据明确sceneAcceptance=UNVERIFIED、ordinaryAdoption=false；Prepared服务默认registry空。缺口是严格内容关联及合格采用，而非再造图像处理器或新数据库。
- use-sky-body-image(s)/feedback/completion已收敛一部分状态；spot-sky-page仍重复可用/暂停输入及不同重试行为。sky-artwork-loader/GPU各自持有生命周期，16MiB GPU值是允许活动集合超出的压力目标，不是物理上限。
- sky-canvas-surface当前为offscreen WebGL→2D展示候选；必须核实际控件、可操作性、展示失败隔离与新增成本，不能仅从代码结构认定解决同层问题。

本轮实际打开并查看了三个既有结果：`output/playwright/ps-restored-pair-2026-10-09-r1/prepared-reviewed-medium.png`、`output/playwright/derived-regions-2026-10-09-lagoon-r3/prepared-reviewed-medium.png`、`output/cloud-sky-native-session-2026-10-09/body-source-moon-before.png`。前两图仍见明显照片外沿，后者只见星空/月面而缺页面控件。它们支持保持原FAILED，均早于本轮审计，不能当当前源码运行截图。

## 新 Skill 与本轮边界

重读本机durable-goal/SKILL.md及technical-implementation.md后，确认新增明确约束为“既有方案只有用户明确要求修改才能更改”。本次用户明确要求按需审计修改，已据此修改唯一PLAN；本次授权不持续授权以后改方案。新版Skill没有要求重新创建Goal、第二套工程体系或额外审批普通局部实现。

已有Goal正文有具体结果、关键边界、完成条件、绝对索引和恢复指令，无需提供替换文本；工具正文未改。当前用户明确要求前期工作完成后停止，实际暂停结果归CONTINUE-CLOUD-SKY。所有FAILED/UNKNOWN/MISSING与33项验收原账保持，源码实现及目标验收尚未完成。
