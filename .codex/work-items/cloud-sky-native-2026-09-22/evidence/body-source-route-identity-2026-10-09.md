# 日月行星独立Sources的版本选择（2026-10-09，进行中）

承接native-body-painted-binding，不重做原图/模型/PS/LOD或已闭合原生矩阵。静态Sources过去没有实际已绘body版本选择，当前以独立bodyImagePublicationHash承接accepted帧；不借W3或光学hash字段。

## 当前责任

services/sky-body-image-publication拥有七种reference→实际validated manifest客户端的映射、严格selected hash校验和版本来源呈现；body completion仅type-import该公共类型，依赖单向，不引入第二图像/出版/GPU缓存。现fixed服务仅供应当前manifest：旧、未知或另一对象版本明确不可用，不以新current替换、不宣称历史版本库存已完备。

SkyCatalogInformation把当前accepted且仍有效的body身份交给原celestialInformationSourceRoute和原Sources/暂停/Back owner。Source route拒绝非法body/reference/hash和与W3/optical/prepared/HiPS混用；静态资料的旧default图像署名由已选validated publication替换，其它shape/position/editorial/open-data保留。Sources查询按reference+hash独立分区，只有同一hash可呈现；metadata失败可重试，同版stale保留，不下载新影像。独立静态资料与影像来源分别呈现，任一失败不抹去另一项。

## 检查与当前运行

初始测试失败分别为VM未移除带注释的export及测试素材路径层数错，原日志保留，不冒产品修前反例。修夹具后四项新检查通过；补移除实际hash守卫的bounded mutation，与W3/光学/新body accepted帧受影响消费者合并，现18PASS/0FAIL/0SKIP（body-source-route-affected-tests.log）。新检查复用七份实际资产清单、原hash/来源/加工/缺测；manifest传输在受控客户端，不能冒原生HTTP或GPU。

App类型初次仅optional prop显式undefined报错，修正该真实prop语义后body-source-route-typecheck-current.log通过。受影响Git whitespace检查通过。旧274文件/4,627,594B/d6bf94b6…构建完整复制到pre-body-source-route-weapp-fixture，fingerprint精确（body-source-route-preservation.json）。必要新fixture build正在exec32490，body-source-route-build.log；完成前不取新绑定。canonical8787/watch99080与8791 API保持，未启动或重启服务。

下一核新产物并沿官方会话检查新增route参数、Moon/OPAL同版披露、不可用版本及Back。当前隔离Context rev7/10月02日00:30，Moon概览197.84°；原生WXML FAILED/原因UNKNOWN、物理/手机未验、独审MISSING、全部33项原值保持。无公开采用、部署、提交或外联。
