# 三区域共存、并发加载与生命周期

2026-10-10，沿唯一PLAN的C/D与I06/V03责任，复用已有三份显示合格候选。没有新增来源、像素加工、候选版次或普通采用；r17库存、全部33项及历史FAILED/UNKNOWN/MISSING保持。本轮补真实集合加载和同一GPU生命周期的开发证据，不重判逐图FILE/最大缩放/昼暮/原生质量。

## 同一Canvas/GPU

[输入](../../../../output/prepared-region-collection-2026-10-10-r1/scene-input.json) SHA256 `4e03568843510cf972ffc560c041c2e7a18417ea7ded080aed35ed1422462048`。沿[原Scene入口](../scripts/benchmark-image-scene.mjs)新增 `region-collection-lifecycle-v1`，实际Prepared registry明确三份current，实际观测/视野选择、原Canvas/Scene/GPU、图像寿命与公共完成帧credit；默认current仍0。

[r3实际结果](../../../../output/prepared-scene-batch-2026-10-09/region-collection-lifecycle-1010-r3/result.json) runtime PASSED，DPR1/2合计20新帧、0旧帧复用、119个parsed源，输入/实现前后围栏通过。执行脚本与browser entry按当次字节保存。每个DPR保持同一renderer，经过全景→三个独立聚焦→全景→单源退休/重解码→区域需求空/返回。

| 当前组数 | DPR1辅助逻辑额度/B | DPR2辅助逻辑额度/B |
| --- | ---: | ---: |
| 3 | 4,038,360 | 16,151,144 |
| 2 | 2,721,720 | 10,884,584 |
| 1 | 1,405,080 | 5,618,024 |
| 0 | 0 | 0 |

三组全景均实际submitted/finePrepared；这些小场在全天穹比例下没有通过可见贡献门槛，completed regional credit为0，不能描述成三图同时可见。每个聚焦实际选择/供给/完成对应一份精确REGION/hash及公共credit，已查看DPR1三个实际PNG，真实影像有非零显示效果。视野往返、重解码及空需求返回的全景RGBA与基线严格相同，仅证明这些输入的恢复一致性。退出两次GPU的texture/framebuffer/renderbuffer/program/buffer计数全0，图像寿命归属0；需求空时保合法银河纹理。以上是逻辑额度和句柄/归属读回，不是手机、物理GPU/整机峰值或三图同时可见峰值。

[r1失败](../../../../output/prepared-scene-batch-2026-10-09/region-collection-lifecycle-1010-r1/failed.json)错误的手写相机方向；[r2失败](../../../../output/prepared-scene-batch-2026-10-09/region-collection-lifecycle-1010-r2/failed.json)缺Prepared入口的 `createSkyViewBasis` import。改用项目现有相机owner及正确import后r3通过，失败和执行快照保留。后续恢复了无关非Prepared入口的import；不重签旧回执、不重跑未改变的Prepared程序。

[当前连续性读回](../../../../output/prepared-region-collection-2026-10-10-r1/continuity-checks.json)确认当前 `runPreparedScene`完整函数与r3执行快照严格相同，React r5实际解析的270份源码字节仍匹配。文档链接和33项保留检查见[检查回执](../../../../output/prepared-region-collection-2026-10-10-r1/document-checks.json)；只证明导航与义务保留，不认证产品。

## 实际React/Taro公共加载链

[共享运行入口](../scripts/prepared-region-lifecycle.mts)调用项目已安装的React18.3.1、Taro4.2.1真实renderer/reconciler0.29.0及Query5.90.21，使用实际 `useSkyPreparedRegions` → `useSkyTargetOptical` → `useResourceQuery` → bare client/immutable publication resource → public encoded cache → native-image loader/frame。使用项目QueryClient原默认参数，未代替hook、Query或publication状态。Taro runtime编译常量沿当前MiniWebpackPlugin默认值。

请求交由受控Taro回调访问实际本机Nest/Fastify public controllers；三版次只在这个owned loopback声明current。文件系统为受控memory native callbacks，解码是实际HTMLImageElement从真实校验后文件lease创建的Blob；这是平台端口适配，不能代替WEAPP实际FS、Sources页面/手势、前后台或物理GC。

[r5结果](../../../../output/prepared-region-react-lifecycle-2026-10-10-r5/result.json) PASSED，13状态/38次实际React commit，283输入/源码pin、270 parsed源，前后字节一致。以下效果实际读回：

- 一份metadata回调持有时，另外两份独立解码交付实际非空帧；deactivate使已有图像归属0并abort持有请求。已收到的真实HTTP成功回调强制迟到，当前仍无帧/图像归属。
- 再进入取得三份精确版次和真实宽高。paused返回无帧但保三个归属，拒retry；resume复用相同三个image identity，无新请求。仅为hook暂停，不冒原生Sources整页Back。
- 对一张已就绪图像执行真实 `failedImage`，另外两张identity/帧保持；本源retry使用暖文件重新解码并只refetch自身metadata，不重传图片。
- 换Canvas/revision后旧image归属退休，三个新image交付；revision2的全部实际commit不含旧image，无新图片HTTP。
- 一份错误immutable hash实际404，Query原默认retry一次，总2个404；该区域失败，其他两份同identity可用。恢复合法声明后按合法版次恢复，不把当前合法hash替代错误hash。
- root卸载后图像归属0，QueryClient清空；真实cache clear返回 `complete`，受控FS只余26B `index-v2.json`、`{version:2,entries:[]}`，无图片payload。保索引不冒整机物理内存归零。

全过程图片HTTP只3次，合计708,615B，每份status/bytes/SHA256严格匹配原发布descriptor；暂停、retry、换Canvas、合法声明恢复均无重下载。其余为5次合法manifest、2次故意404及1次current目录。runtime page errors为空；两个浏览器网络console error均精确属于故意404的hash/URL，明确记录为预期网络诊断，不写成所有日志0。API天气/业务沿已有test factory，本轮只请求影像公开路径，没有live provider、外部部署或生产声明。

[退休读回](../../../../output/prepared-region-react-lifecycle-2026-10-10-r5/retirement.json)实际browser disconnected、HTTP listening false。旧8793/s1未操作。

[React r1](../../../../output/prepared-region-react-lifecycle-2026-10-10-r1/failed.json) esbuild Go regexp不支持`u`；[r2](../../../../output/prepared-region-react-lifecycle-2026-10-10-r2/failed.json)遗漏Taro runtime编译常量；[r3](../../../../output/prepared-region-react-lifecycle-2026-10-10-r3/failed.json)错误期待clear状态`completed`；[r4](../../../../output/prepared-region-react-lifecycle-2026-10-10-r4/failed.json)错误期待索引名`index.json`。后二者各13状态已取得真实独立效果，但结果只沿r5当前合同完整通过；失败与各次执行快照全部保留，不归为产品缺陷或倒填PASSED。

## 保留缺口

三候选原生权益仍PARTIAL，Sky返回/控件/credit官方截图仍FAILED_DEVTOOLS_OUTPUT、原因UNKNOWN_PRODUCT_VS_DEVTOOLS。普通Prepared采用/可分发仍0；没有第五份新增/替换输入或扩批。原55软件图质证据适用范围、五张原图预检FAILED及全部历史结果不变。本轮不关闭C06/I06/D01/K02/V03/V05/V06完整义务；设备/原生完整交互/物理峰/全引用与实际rollback、生产容量及独立审查MISSING继续归原owner。
