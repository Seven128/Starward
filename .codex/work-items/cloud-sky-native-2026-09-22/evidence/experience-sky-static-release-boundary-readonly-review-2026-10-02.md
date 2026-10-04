# 静态公共影像接入既有 release：只读边界审计

2026-10-02，`/root/hst_registration_review`。已完成 consumer 独审后，按 root 分派只读核现有发布链与新 exporter/fragment；暂未改 production、PLAN/Context、工作流、旧输出、201 deep-sky 资产或六项保留文件，未执行 Docker、HTTP、拉镜像、服务重启、云部署或手机操作。本文是后续接线建议及当前事实，**不是已接入、已发布或远端容量验收**。

读取 global/context manifest、architecture 和 deployment 的 release/environment、operator-preview、pipeline/host、data/operations owners；读取以下实际消费者源码：两 Caddyfile、两 Compose、compose executor、release、operator-preview/checks、environment validator、prepare candidate、promotion request/coordinator/staging qualification、public readiness、remote control-package shell、两个 release workflows、image Dockerfile/worker build config，以及当前 exporter/共用asset headers。复用已有静态出口 owner核、source/export独审与实际HTTP r4证据，没有重启选型/重新采集/复跑服务。

## 当前事实与实际成品读回

本审计r1冻结时，正式 Caddy仍全部 `reverse_proxy api:8787`；preview只在 `handle @operator`代理，余下404。两 profile均无generated delivery import。Compose无 `/srv/sky-public` mount；preview `volumes: !override`，不能只给base compose加volume就认为preview会继承。prepare仅写image reference/revision/digest/releasedAt四项candidate identity，validator不读static成品身份，request严格校验v1九个key，promotion/staging qualification只绑定image/revision及原8steps；health/readiness只核API JSON/TLS，均不证明静态交付。root/sphere在此冻结之后开始接线，后续改动另需current-source审查，不能追溯升级本r1。

新 `sky-public-asset-export.ts`实际CLI会产生fresh container内完成的 `publication`，逐文件通过原owners资格和readback，写index/fragment，再将building child rename为completed child。它不是release executor，当前index不含source revision、image digest或environment。generation独占与失败不rename保护有效；但它没有安装active release、合并旧版本库、绑定registryimage、只读mount或更新成功receipt。不能直接以export成功替代这些依赖。

离线独立脚本 `scripts/experience-sky-static-release-boundary-readonly-2026-10-02.mjs`保存23份当前source副本；实际读 `output/sky-static-approved-export-1002-r3/publication` 的index/fragment/全部物理文件，核其record长度/SHA及canonical实文件，核fragment的136个精确path与index完全同集、GET/HEAD/file-presence matcher同组，没有wildcard root。结果136files、22,954,411B；publication `4e07f34b96b37d7c89294ffca73ea89ce531dd0bd1cf0e8468426cd5f63e197a`，index SHA `cfb026f6ff4ce56dab43e4c5320f26853a0e6f8eeb6c4495e3f9039e2305a258`，fragment SHA `5bc9414692d5713358f61447af133649b7e00e9b7366781ae5dae39e856a6586`。这里验证既有获准成品，不将格式regex当任意外部index的授权oracle。

`output/sky-static-release-boundary-readonly-1002-r1/review.json` 96491B SHA `be9568325517b424513833e8509b26e3c7259766aa71a2684ba11185ccd9edb1`；binding 173320B SHA `54eee2f738cfb91a6fc937ebeaa9316c70885e0958774145c00c7f0d0a272ef0`。369个input运行前后保持：23source、138成品文件、201旧deep-sky、baseline JSON和六保留修改。输出明确 `RELEASE_INTEGRATION_PENDING`，不是一次新的HTTP执行。

已有本地HTTP r4为136GET/HEAD、preview三授权分支、缺文件API回退、非法路径404的受控实际证据；实际lab Caddyfile把fragment置于正式站点及preview授权handle内部，API均为同层fallback `handle`。其源码绑定旧exporter `a549…`，新 `a2c766936819f741ce27b8b4cb44a78e28929835c056ec45eca691c319eb6781`补canonical guard后的产物同字节资格由sphere独审另证。不能追溯改 r4hash，也不能把lab的local CA/localhost当远端public IP或filed domain验证。

## 最小正确集成路径

以下是边界建议，字段名与小文件名由 root沿现owner定，不是另一套已采用计划。

1. **一次准备、一份不可变候选**：沿既有immutableimage准备路径运行该image内的compiled exporter，或等价地出具可核的source/image→export绑定；不从一个可变checkout导出后给另一个image贴标签。完成child、index、file bytes/headers、fragment和身份元数据组成一份fresh候选成品，未完成building、冲突、badreadback、unknown source或缺文件均不进入选定candidate。现image build配置已会产出 `dist/sky-public-asset-export.js`，runtime保其真实publication依赖/资产，能复用，不需另引container服务或部署平台。
2. **optional成品组，旧lane可运行**：未配置static时继续现API行为；一旦配置，实际path/hash/sourceimage身份作为同组require，partial或invalid产物拒绝，不能悄悄降成“成功但静态没装”。stablebase可以拥有环境的durable store root；per-release成品身份应从exactimage准备获得并绑定candidate/receipt，不往stablebase放过期hash。validator核绝对environment-owned范围，image-pull后的共享prepare核完成publication/regular files、index摘要、每record实际大小/SHA/headers与fragment，不仅查存在或用自动ETag代替内容SHA。不能允许assetroot/任意外部index/secret目录作为批准来源。
3. **沿现Compose装配，保授权与回退**：一个tracked empty delivery片段可作为未配置默认；同一固定import点由optionalstatic overlay替换为已验证fragment，同时将完成publication只读mount到 `/srv/sky-public`。默认empty必须被真实Caddy adapt/validate证明有效，不能假定不存在文件的import会成功。formal import置站点内，API改同层fallback handle；preview import只能在 `@operator`内部，留外层404及remove preview header规则。现executor已有overlayPaths；preview base+IPoverlay之后再组合staticoverlay，并核rendered结果，避免 `!override`把mount丢掉。不额外公开port/创建新服务，不改变证书、provider、数据库/Redis或private API边界。
4. **先预检，后按现release顺序收敛**：成品资格、renderedmount与Caddyconfig必须在writer stop/migration/activeedge切换前失败；使用既有独占候选和preview lock/步骤/receipt责任。只有该candidate的image、file库存、config与健康路径全部确认，才写success receipt/currentpointer。失败stage/failedreceipt保持，不换成旧image自动“成功”，不抹此前active selection/旧成品；原备份、迁移、source identity、public TLS和provider smoke照旧。应用或schema不兼容仍沿原rollback/forwardrepair边界。
5. **receipt与promotion绑定同一产物**：static配置时success receipt包含实际publication/index/fragment身份和sourceimage关联，staging qualification/prod request比较同一语义身份；生产不能沿同image字段偷偷换静态内容。host绝对path可以每环境不同，不能将staging path当production path；比较内容/来源绑定并分别核环境。旧无static的request/receipt保持兼容，仅在candidate要求static时缺static qualification应fail closed。preview receipt仍productionQualified=false，不能升级为formal staging证明。
6. **先实现旧版本责任再验收更新/回滚**：当前fresh export只有current136与特定旧Moon alias，不能叫全历史库。仍支持的已出版URL要从可信旧bundle/原publication receipt保留canonical route→bytes/SHA/headers，和本次export组成新的immutable并集；同route不一致应拒绝，不能overwrite。保持旧成品与receipt，不自动删除源图。rollback旧API时，仍应交付已让新客户端知道的新hash；只把mount/fragment一起切回旧bundle会让新URL丢失。最小可让回滚的兼容edge继续使用已验证的保留并集，同时回退business image/current discovery。pre-static旧controlpackage没有import，不能假定它自动兼容：需保兼容的edge/control配置或显式把该rollback依赖留未验。没有历史inventory与old/new旅程证据前，不关闭版本更新/回滚兼容义务；不擅定无限保留或删除期限。

## 必须消费同一责任的现有文件

| 现owner/消费者 | 接线必须处理的事实 |
| --- | --- |
| `sky-public-asset-export.ts` + release image/Dockerfile | 保原owner准入、fresh失败不promote；增加或由共享release glue绑定image/source，可信旧库存并集另沿同责任，不扫描assetsroot |
| `prepare-release-candidate.mjs` + `validate-release-environment.mjs` + deploy env example | per-candidate optional成品组、旧base兼容、绝对环境范围、完成资格和hash；有配置时failclosed |
| `promotion-request.mjs` | 当前严格v1key集合；新选择仅stablebase rootdir时可保原request字段，domain/preview均由validator和prepare消费此合法选项。若以后增加per-release字段才需要显式旧新schema兼容；不能靠未校验env侧通道 |
| `compose-runtime.mjs`调用者 + 两Compose + 两Caddyfile | optional同一readonlymount/fragment，preview override与授权位置，真正fallback；保旧无bundle行为 |
| `operator-preview-checks.mjs` | 除现image/ports/data volume，核实际选中publication与fragmentmount及readonly；不能只看到Caddyfile名就算装好 |
| `release.mjs` / `operator-preview.mjs` | 资格/装配步骤的失败和实际边缘readback，receipt/currentpointer绑定；APIready与staticready区分，private/backup/provider规则保持 |
| `promote-release-candidate.mjs` / staging qualification | 同image+同export内容身份、要求static时必须有相应successstep；旧无staticreceipt不被误标为staticqualified |
| 两backend workflows + `run-remote-promotion.sh` | controlpackage现只带tools/infra，未带staticbundle；须明确image内导出或经hash校验交付成品，不临时checkout扫描；生产同digest不重建；原trustedmain与外部门槛保持 |
| `public-readiness.mjs` / preview readiness | 现仅APIhealth/TLS；配置static时另核真实已知asset bytes/hash/headers、unauthorizedpreview404与缺失/业务API回退。成功同字节响应也可能由API提供，需真实路由/边缘归因证明static效果 |
| `sky-resource-logging.caddy` | 当前漏 `/v2/sky/landscape/*`；补该已存在publication消费类并能分static/API交付的固定非敏感归因，保request/respheaders删除。完整accounting不由family类别或部分bytes声称 |
| 受影响 tests | 覆盖旧无static descriptor/request、配置组缺项/错image/坏index/file/fragment、override丢mount/preview旁路、失败不写successpointer、旧URL并集冲突、APIrollback新URL仍有效；真实Caddy结果承担routingclaim |

不是所有表格项都必须在一次提交完成，但它们是这条同一发布责任的具体已知消费者，不能以只改Caddy/Compose两文件宣布闭合。先做小的shared candidate/成品身份验证并在两个现release入口接一条真实路径，随后按这些依赖迁移，保持唯一PLAN。

## 收口时 root 选定的接线边界

Root在只读r1完成后明确选定 optional stablebase `STARWARD_SKY_STATIC_DIRECTORY`，是host绝对durable store root；未配置保持旧API回退，生产不接受手工磁盘bundle作批准来源。root负责shared canonical/index/bytes/fragment/history union、Dockerfile内approved artifact及 exactimage提取/准备/核验 `tools/deployment/sky-static-release.mjs`；sphere负责candidate/validator/Compose/Caddy/release/preview/qualification传播。新API为 `prepareSkyStaticDelivery({validation,deploy,execute})`，image-pull后、writer stop前返回readonly overlayPaths+identity；`verifySkyStaticDelivery({delivery,validation,deploy,fetchImpl})`在converge后核exact bytes/headers及protected preview。这是分工/接口决定，尚不是源码或运行通过。

该来源选择可保持promotion-request原v1字段和旧request语义，static root经base→candidate→validator→sharedprepare闭合；无需为了artifact强行改v2。必须进一步在receipt/qualification区分**当前image内approved artifact身份**和**环境保留union身份**：staging与production历史库存可不同，不能要求两环境unionHash相等；须核同image当前artifact相同，并各自verifiedunion不丢仍支持URL。当前preview已inspect exactimage OCI revision label；formal release仅pull/环境health identity，后续image/artifact owner应共享exactimage source核，health可注入的release字段本身不证明binary来源。旧pre-static image可能没有built artifact/exportCLI，旧control也没有static import，回滚需兼容edge/保留inventory实证，不得凭新接口名称认定闭合。

## 接线之后的验证边界

部署前可用现本地成品与isolated真正Caddy验证no-bundle旧配置、configured正常/preview、fresh invalid成品不收敛、当前/旧库存和回滚组合；不需要再采素材或新部署工具。readiness体积限制目前针对64KiBJSON，不应直接复用为12MiB地景ZIP检验或启动download清单；选择合同内小实物、保持bounded bytes/timeout并记录范围。

静态文件准入/bundlehash不认证科学质量/来源许可的新扩权；current discovery与业务/账号/天气/投稿、trial、selected可变W3仍各归原owner。静态只减API文件传输处理，不减少同一服务器公网outbytes；本地HTTP0API、末尾Caddy17.1MiB和fresh22.95MiB库存均不证明4GB/16GB、12Mbps/2000GB、200DAU或10/20冷进入混合负载。目标WEAPP、远端正式/preview装配、兼容旅程与完整端云性能继续开放。
