# Native Prepared静态清单与隔离恢复

2026-10-09，完整无预算Goal active，指定工作区与`codex/remote-main-20260908`不变。当前结果仅为既有文件的标准出口及本机隔离恢复；全部33项产品义务、图质FAILED、科学UNKNOWN、配准UNVERIFIED、手机/物理/live/独审MISSING保持。

## 实际缺口与责任

`prepared-optical-client.ts#getPreparedOpticalManifest`先经`bare-sky-resource.ts`读取`/v2/sky/prepared-optical/<hash>/manifest`，通过reference/hash及完整合同后才发LOD请求。`getSkyPublicationResource`负责取消、代次、冻结快照，不会生成缺失清单。原`PreparedOpticalImageryService.publishedMetadata`只枚举派生区域，native照片标准出口仅图片。backup source sidecar归档已入index的原index/fragment/artifact，不能据三图补造API manifest。

沿同一owner补已显式注册`prepared-native-optical-v1`的裸清单，不发现目录或新增普通注册。原完整RGB、SXT-only与PS组合共享该imageVersion，各自producer/复核、来源、名义TAN/coverage、科学UNKNOWN完整保留。旧固定方形照片API-only政策不变。原派生区域的静态JSON及三头合同精确保持，API原有attachment不更改。

`preparedOpticalManifestHeaders`提取API既有文件命名与响应头；新native静态清单共用。标准writer/reader仅在Prepared manifest URL接收`attachment; filename="<规范publicationId>-prepared-optical-manifest.json"`，拒绝其他路径、inline、非约定文件名、穿越、环境插值和换行。Caddy片段仍由原writer生成/转义和完整hash读回。新header依赖更新后的工具；旧二进制读取新包、真实supported-client/rollback兼容仍未证明，不能以开发出口代回滚采用。新读者能读取旧图片/派生区域记录，旧包不含native清单的事实保留。

## 有效检查

新回归先在原owner失败：两代native只6图记录，要求两份清单后应8条，实际`6 !== 8`。日志保留在`output/native-static-metadata-2026-10-09/failing-before.log`。新增头最初被原writer拒绝`sky_static_header_invalid`；该失败日志亦保留，随后固定边界修复。最初从仓库根运行Nest测试没有选worker的experimentalDecorators配置，已沿worker cwd更正；不冒产品错误。测试联合5/5、writer8/8、API TS5.9.3类型检查通过。测试初始union未收窄的类型错误已修，旧日志保留。没有重跑关闭的Scene、图像工具或设备矩阵。

实际参数化批次复用五份已有出版：原NGC253全幅、NGC253 SXT、M81/M82 PS组合、两份派生区域。使用当前标准`exportSkyPublicAssets`，非另建出口。限定Nest/Fastify真实controller注入读回五份裸JSON及15份LOD：200、精确body/hash、当前静态头与API一致；派生区域保留原静态三头、API额外attachment的明确差异。未知hash404。完整默认家族随标准枚举进入同一bundle；本次没有证明其应用完整性或设备呈现。

原PS静态三图和派生区域12条记录逐条与既有index比较，URL/bytes/hash/headers完全一致；五份原publication JSON最终hash不变。三份新增native metadata共16,489B。Prepared共24条，完整标准bundle为1,752条、89,147,665 payload B，hash `980e4e4bc78e382830214f1af1c0fae0ab7ccb513a077bee873a4f87fa10a36f`。

复用`createSkyStaticBackup`/`readSkyStaticBackup`/`restoreSkyStaticBackup`：source-capable组件v2保存原index/fragment/artifact；再次capture复用同一payload pool；fresh isolated restore hash及五份manifest、十五LOD精确读回，清单再过现客户端合同验证。`runtimeApplied=false`。inventory source目录/revision/digest是明确开发fixture，未经过OCI供应链准入；未演练GCM密钥认证、DB恢复、managed/live cutover、远端/off-host或完整引用。现有live开发会话保持warm，未触发发布/Compose/数据库动作。

## 实测成本与限制

同次helper wall60,867ms，CPU60,812ms；只属于本机开发枚举/哈希/API注入/复制/验证成本，不推算Linux容量或Agent现金。导出含sidecar逻辑90,604,013B；backup含inventory/source archive逻辑92,546,216B；isolated restore逻辑90,603,630B；合计273,753,859B。全部输出保留，没有清理旧成果。89,147,665B是整个标准枚举的payload，并非本次新增下载或新增图像加工量；native清单16,489B才是这三份条件出版的新增payload。新图像加工、模型调用、PS调用和图像编码均0。物理分配、全机盘、生产暂存/旧版/回滚/client引用全集、shared主机费用、200DAU/混合冷进入容量未知，不填0。

机器结果和实际输出见`output/native-static-metadata-2026-10-09/verification.json`、`standard-export/publication`、`backup`、`restored/publication`，复核脚本`verify.mts`仅此新缺口的批量证据，产品逻辑在既有owner/测试。没有新采购、部署、公开发布、提交推送或外联。普通Prepared空、HiPS关闭、低分辨Mellinger DISPLAY及v72不改；独审MISSING，不扩依赖采用。

## 下一责任

此开发机制已取得限定证据，不再重跑相同静态批次或无变化图像。当前唯一计划先只读归因A1三份暖重复body与现缓存owner。C05原晨昼反例已有后续当前shader及实际修复证据，本次误选旧反例的方向已撤回，0该范围新代码/构建/重渲；历史失败保原。原生真实窗口检查方式仍待明确授权，未经回答不使用Computer Use。手机、真实容量/全引用、回滚与最终独审分别保留，不能用本段关闭产品验收。
