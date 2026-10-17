# OSS/ESA本地准备包与HTTP合同

本阶段实现A/F固定资源分发适配；图像来源与像素工作继续冻结。没有采购、OSS上传、ESA配置、CI发布、手机预览/投递、镜像升级、普通Prepared采用或其它workspace修改。Goal保持active、无预算、33项未缩小；本地包不是来源/商业许可、可信OCI、真实云分发或完成证明。

## 实现与现owner

`tools/deployment/sky-object-store-package.mjs`消费唯一`sky-static-bundle`封存index及其真实文件。objectKey为公开route去掉前导斜杠，sourcePath仍由原owner的`skyStaticFilePath`持有，区分真实文件和对象存储键；没有第二采用清单、目录爬取、图片复制/重编码或自签云请求。输出独占新目录并在stage中写后核读，完成前再次核源文件，已有失败/准备包不覆盖。消费时以调用方明确选择的原bundle/hash/origin重推导核对，改key、响应头、字节、头映射阶段或禁止覆盖/来源资格不能靠重hash包自证。

标准content-type/cache-control/content-disposition原样放入上传声明；项目头放`x-oss-meta-*`，附真实SHA256元数据与Content-MD5。metadata采用官方8KiB上限（计入键/值及HTTP分隔的保守口径），固定集合最大4218B。保护不可变对象的前置条件为bucket从未启用版本控制；未来执行器还须读取真实bucket状态、通过成熟OSS客户端设置禁止覆盖，并对冲突精确核读，不能把本准备包字段当已实现/执行的上传保障。

ESA头还原声明放**源站到ESA**阶段，随后与资源一起缓存；公共域名及`/v2/sky/`限定范围，有元数据时才增加对应字段，未供应字段不捏造。固定集合产生9条规则输入（共享nosniff/交付marker加8类可选项目头），非逐对象配置。它们是控制台配置输入，**不是已经编译成功的ESA API请求**。动态表达式、响应字段presence行为、套餐可用功能及现有规则余量必须真实核对；不生成自建edge worker来回避条件。未调整旧W3来源清单的相对API下载含义。

`sky-object-store-verification.mjs`提供独立资源origin的只读HTTP合同检查。每个GET必须满足真实字节数/SHA、原响应头及oss交付marker，拒绝编码变换；按响应头存在集合和content-type合组核HEAD/单Range、精确长度/content-range/前缀字节。只发identity和必要Range，无客户端凭证/preview头、API回退或自动重试。终态再核本地包及源未漂移，成功结果明确不认证CDN命中率、容量、权益或原生显示。

共享`sky-static-http.mjs`接管原`sky-static-release`的有界字节请求；旧release/preview仍在其caller持有认证与信任判断。原15秒整请求＋socket不活动期限保留，新增不完整响应失败；受控fetch流也有大小检查和cancel/release。不是手机/native物理内存限额。原发布/备份/恢复/current/旧URL责任未迁入OSS准备包。

## 精确输入、产物与实际检查

复用上轮1785文件/104613871B union，publicationHash`7c00d901785918c5d038f594bd1e63f8adf12dded8cfea245e35ad6950143fb8`；全部旧1774地址/字节/头及11来源metadata原封保留。准备origin为受控`.invalid`绑定，非已配置真实域名。包hash`2517eba21e6a1e509d9e77fa45200b20835732120490744092ba40431238b8ac`；[准备包](../../../../output/cloud-sky-object-store-2026-10-10-r1/prepared/package/plan.json)约为声明数据，无新影像副本，实际准备回执见同目录`prepare.log`。

新增准备/公共HTTP/流资源检查最终**19/19**通过（包含参数化失败子项）；受影响的旧静态bundle/optical-prefix/release/consumer检查**50/50**通过，包含原真实文件恢复/旧版/HTTPS有界读取。失败原日志保留：r2为14/18、r3为18/19；修正了gzip夹具伪装未压缩字节、Range忽略先触发字节限额的断言口径，以及Node fetch在Range时附加identity token的HTTP语义。没有放宽必须失败、hash、凭证、metadata或目标结果检查。

复用同一[批量核读脚本](../scripts/check-object-store-package-2026-10-10.mjs)，实际本机Node HTTP＋文件服务按包中的对象键、OSS元数据和有界声明模型输出；生产verifier检查**1785 GET/104613871B、14组HEAD、14组Range/224B，共1813请求**，字节/头全部匹配，无preview/凭证。此为**本地provider模型合同**，不证明ESA规则编译或云端行为。[完整回执与8份代码pin](../../../../output/cloud-sky-object-store-2026-10-10-r1/fixed-package-http-result.json)、[请求轨迹](../../../../output/cloud-sky-object-store-2026-10-10-r1/fixed-package-http-trace.json)保存精确范围。首轮错误强制假定该固定集合已有`.tile`碰撞，实际为0，脚本断言失败保留；仅修库存假设后r2通过。真实tile0/index双路径机制由共享小文件fixture正反例证明，不借本集合没有碰撞的事实宣称实图碰撞验收。

## 调研依据与未闭条件

[OSS PutObject](https://help.aliyun.com/en/oss/developer-reference/putobject)确认标准下载头、自定义metadata/大小及版本控制对禁止覆盖头的限制；选择成熟客户端执行原始文件上传，未新增依赖或实现签名。[ESA入站头](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/modify-outbound-response-header)及[字段适用阶段](https://help.aliyun.com/en/edge-security-acceleration/esa/user-guide/phase-list)决定还原发生在cache前。[函数语法](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/function)、[规则大小](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/work-with-rules-engine/)和[套餐规则数量](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/conversion-rules-overview/)提供配置输入依据；9条落在公布基础版10条数量之内的算术不是实际账号/嵌套/函数/已有规则余量的资格结论。

真实账户、bucket versioning/权限、上传执行/冲突/部分失败恢复、ESA实时编译/头透传/禁变换/CDN回源、可信OCI/managed-store/live/旧版/rollback/备份、10/20冷进入混合业务和端云物理峰仍未验。正常Canvas控件仍FAILED；[无Canvas观察](native-wxml-observation-2026-10-10.md)只排除本次普遍WXML空白推论。无手机，Android/iOS未验；本次没有可覆盖新修改的独立审查，MISSING保留。此次本地合同通过不提升33项整项状态。
