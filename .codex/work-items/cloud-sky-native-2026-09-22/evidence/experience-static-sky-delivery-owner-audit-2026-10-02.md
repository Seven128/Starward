# 同机静态影像出口：既有边界只读核，2026-10-02

这是唯一 PLAN 第3步、客户端文件迁移之后的服务端依赖记录；无新部署/选择、没有修改Caddy/Compose/API/资产或创建另一份计划。4GB测试/预期4核16GB生产、200DAU、12Mbps/2000GB月出流量与混合业务验收保持原owner。

实际读取 `infrastructure/deployment/Caddyfile`、`Caddyfile.operator-preview`、`compose.yml`、`sky-resource-logging.caddy`，及当前 `fixed-body-texture-publication.ts`、`constellation-publication.ts`/controller、`sdss-optical-imagery.ts`、既有宽场/地景/selected W3 URL组装。当前生产Caddy所有普通请求仍 `reverse_proxy api:8787`，无公共影像file_server/mounted publication目录；operator-preview仅在明确header授权handle内代理，余下404。这描述仓库配置，不证明远端live状态或授权变更。

现有publication owner已提供准入权利/元数据与文件hash绑定；普通图片路线有publication hash，服务端仍逐GET读文件/验证字节。固定行星/月面、银河、地景、宽场、SDSS、星座asset各有实际manifest/支持差异；保持这些owners作为出版事实源，无须再建一份手填来源表。selected W3兼容URL与response科学metadata另保。Constellation来源文本在Windows被Git转为CRLF时，现owner按原LF字节归一化再SHA校验；静态复制不能跳过这个真实publication字节规则。

下一条真实路径应从获准publication owner导出经过校验的不可变公开文件与route映射，离线成品进入独立、只读mount的version目录；HTTPS边缘匹配准入的hash-bound公开资源，未知/缺失路径维持原404/API兼容语义。**不能把repo/assets整个目录直接公开**：其中包含未采用optical trial、原始科学输入/退休素材及其他不同访问边界。原有旧版本URL与Moon已保持的旧hash→同字节兼容alias必须保留；媒体/账户/天气及其它业务API不迁进公开出口。

正常生产与operator-preview使用同一受校验成品，但preview静态路径必须留在其现授权handle内；不能旁路IP测试/环境边界。保Content-Type、immutable缓存、nosniff与实际消费者需要的来源/field/pixel/missing/display-support含义，不把Caddy成功/自动ETag当内容SHA或同合同证明。API仍管业务/权限上下文/current discovery/来源元数据，文件出口不实时重采样、拼接或转码。

现path-only egress logging分类已存在，不记录URL/query/headers/身份/位置；静态化仍沿同分类且分别量实际出bytes/请求及API延迟/RSS。需先在隔离本地Caddy实际验证正确文件/readback/hash/headers、缺文件/错误版本/旧URL、protected-preview隔离及API回退，再测冷暖真实HTTP/10与20冷进入混合场景。不能由客户端离线transfer0推导服务器已减载或16GB容量；也不由2000GB月额度推出首屏/尾延迟足够。

此只读核不触发远端订单/升级/域名、拉镜像/服务重启/部署/发布/手机；客户端正常迁移尚在进行，先闭合它的真实consumer与清理，再沿这些服务端边界继续。
