# 宽视野成品：补覆盖有效，背景融合仍失败

2026-10-04，按唯一PLAN的B推进。保持工作区、分支和HEAD；Goal active、无预算。只改云观星离线Prepared输入owner及其回归，未改其它业务、前端页面或普通registry，不核对旧设计稿。本文是本轮开发证据，不是最终验收或第二份计划。

## 实际新输入及权利

Browser实际读取NOIRLab两张图片页、使用政策和M51关联发布说明，再从各页Publication JPEG链接各下载一次。复制Downloads已有文件，没有再次请求图片；另保存四个200响应的HTML/长度/SHA回执，未绕过限制、联系机构或发布。原始文件、嵌入XMP与元数据在 `output/noirlab-prepared-wide-source-1004-r1/`。

|目标|真实观测源和原出版视野|本次JPEG身份|源含义|
|---|---|---|---|
|M82|[noao-m81m82](https://noirlab.edu/public/images/noao-m81m82/?lang=en)，Mosaic I/KPNO 0.9m，约58.87×32.87′，原参考8315×4642|4000×2233，1,163,247B；SHA `85f615d5d56c04e4528716e61320f2c503fdcb2a62af44347e3402aca9a53eda`|B蓝、V青、R绿、I橙、H-alpha红；历史编码RGB，不是Hubble配色、定标流量或实时天色|
|M51|[noao1309a](https://noirlab.edu/public/images/noao1309a/)，WIYN 3.5m ODI，2013年5月观测，约33.22×30.98′，原参考8000×7450|4000×3725，1,162,674B；SHA `57111359c5f7eb9e2aa79d794ca8b660686553cb8ca62d9064993077a7b29b97`|图片页波段空、AVM Bandpass为`None`；[关联发布](https://noirlab.edu/public/news/noao1309/)说明蓝/绿/红三滤镜合成，未给具体滤镜名称，不能改写为SDSS gri/BVR|

[NOIRLab政策](https://noirlab.edu/public/copyright/)与两图嵌入XMP均给CC BY 4.0，具体图片页未见例外；完整可见credit、许可和修改披露仍须由真实消费者履行，不暗示商业背书。政策不能外推到logo、代码、论文或无关网页文本。这是具体图片的候选输入判断，不是所有NOIRLab数据或独立法律意见。

完整credit分别为 `T.A. Rector (University of Alaska Anchorage) and NOIRLab/NSF/AURA/` 和 `K. Rhode, M. Young and WIYN/NOIRLab/NSF/AURA/`。网页内DSS2/2MASS交叉查看器不属于所下载照片，没有恢复排除的DSS来源。

## 发现及窄修复

首次真实PyAVM 0.9.9读取因空 `Spatial.Notes` 的rdf:Alt/x-default节点失败；原R1执行副本/源字节保留，[失败记录](noirlab-prepared-wide-acquisition-r1-2026-10-04.txt)。先只在任务parser副本去除该精确空可选节点作有界坐标试验，生产准入当时仍失败。

确认新图可补当前目标覆盖后，扩展既有 `prepared_rgb_observation.py` 的可选备注字节跨度校验，使同一责任处理Spectral.Notes和Spatial.Notes；只在parser副本删除已确认的空Alt/x-default节点，保原JPEG/XMP、有效备注、坐标、身份/大小/完整性、解码/几何/科学UNKNOWN约束。新增单独的Spatial删除事实，不冒充只改光谱备注。未新建解析/融合框架或改变publication v1同源母图语义。

修前副本在 `tmp/noirlab-empty-spatial-before-2026-10-04/`。回归R1的fixture替换未命中真实Alt结构，仅因缺字段失败，保留但不计escaped-defect证明；修正fixture后[修前R2](noirlab-empty-spatial-before-fix-r2-2026-10-04.txt)实际复现同一PyAVM TypeError。修后原输入/采样/母图共[12项受影响检查](noirlab-empty-spatial-affected-checks-2026-10-04.txt)通过，保有意义备注、禁止异常/重复节点、原字节与几何/RGB一致性。NumPy shape弃用提示不影响本次结果。

## 当前覆盖与细节限制

使用实际AVM的ReferencePixel，**没有把网页RA/Dec当照片中心，也未移坐标凑目标**。目录中心在原4000px照片的零起点FITS坐标分别为M82 `(3468.855806,1315.061019)`、M51 `(2069.174070,1521.354177)`；AVM“Full”仍是发布者标签，不是我们独立配准通过。

|目标|当前总览/中档/细档几何支持|三个512² PNG字节|细档原照片横跨采样数|
|---|---|---|---|
|M82 NOIRLab|三档均100%；总览仍13.653′|323,869 / 297,739 / 226,797；合848,405B|约232原像素跨512输出，明显软于Hubble，不能宣称新增高清细节|
|M51 NOIRLab|三档均100%；总览仍13.653′|314,138 / 436,619 / 400,556；合1,151,313B|约411原像素跨512输出；同样不是PSF/光学分辨率证明|

100%是四邻域/四采样的矩形几何支持，不是科学有效像素、无噪点或完整星系/全天覆盖。完整源图已查看：M51原ODI照片外围有拼接/背景痕迹；不能从几何支持推定无伪影。M82宽图配色与喷流显示也不同，不能线性匹配成Hubble或冒同一观测。

仅两张新源各做一次当前共享TAN母图试验；Hubble原图、母图和产品均复用、未重下载或重投影。`output/noirlab-prepared-wide-quality-1004-r1/`保存真实母图、三档、Hubble左/NOIRLab右无增益对比和覆盖/描述性编码色差。色差不是流量校准。

修后使用实际owner重新准入各源一次，无parser override；在 `output/noirlab-prepared-wide-validation-1004-r1/`核原样缓存母图/三级，再经已有writer与TypeScript契约生成标准本地候选：

- M82 hash `32e08658905b1015c138b43200f8be341ca3ade5d4b89bf5394a9c451c1e2b3e`，[manifest](../../../../output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82/manifest.json)。
- M51 hash `637dbae274076fb225a496004fe9ad1c3712eadda4ac78a924c936e851b3369e`，[manifest](../../../../output/noirlab-prepared-wide-publication-1004-r1/noao1309a/manifest.json)。

两者分别是一张真实源的同母图三级，不是NOIRLab+Hubble混合出版。打包不代表正式静态部署、服务/客户端新图完整链、Sources可见署名或默认采用。

## 实际Scene结论

只核新宽图质量问题，用同视角Hubble参照和NOIRLab夜间/暮光/白天：当前完整Scene、4张实际总览PNG解码、软件WebGL、受控报告/相机/星表不可用，沿已有固定辅助策略。未重跑页面/hide/图层/失败保粗等已闭合矩阵。

[运行结果](../../../../output/playwright/cloud-sky-noirlab-wide-quality-1004-r1/result.json)绑定实际解析源码，8帧机械执行通过、Prepared同帧参与回执成立、texture objects退休归零；[根agent保存输出读回](../../../../output/noirlab-prepared-wide-readback-1004-r2/result.json)核8组GL→PNG全像素精确、当前源码/来源/输出身份及母图复用。reader R1错误要求外部Node executable在工作区内，失败和原副本保留；只修reader路径判断，未重跑Scene。

**完整8幅实际PNG和新源细档已查看；图质仍FAILED。** 宽图修补了Hubble照片边界内的周边观测，但当前13.653′母图crop仍显方形背景：两夜帧参与边界 `[35,262,355,582]`，M82边界RGB相对真实baseline的中位差4/8/10个编码值，M51为2/2/0且带局部绿雾；暮光/白天仍有接缝。maxRGB显示贡献与source-over本来就在，不是漏开透明，也不能称加法完成融合。

宽图细档更模糊、配色/PSF与Hubble不同；尚无真实对应点配准、跨来源融合、兼容色域/背景验证，不能换掉所有高清档或伪称同源LOD。下一只看PLAN顶部：复用这些缓存先完成源特定真实对应点/弱结构与背景责任判断，再做有依据的共享显示融合小样；不剪暗/统一feather侵蚀真实旋臂、盘面或喷流，不先建跨来源/调度框架。

## 成本、范围及仍缺的证据

本轮五组保留文件的逻辑总量102,368,931B，分层为源/HTML2,712,643、质量36,599,494、准入验证35,647,661、标准本地候选2,067,932、Scene证据25,341,201B；不含reader目录和后续scope记录，不是全机实际SSD/RSS。两组目标PNG合1,999,718B，各RGBA三档3MiB；新原JPEG只各一次入流，不向终端下发。尚无新候选真实HTTP/wire、静态出口/保留规则应用或200DAU混合容量结果，不重复旧dry-run来充数，也不以免费图源推零工程成本。

本轮净生产变化仅Sky离线owner与回归；[范围核验](noirlab-prepared-wide-scope-verification-2026-10-04.json)核当前491个既存绑定源码、六保护、分支/HEAD/暂存与原BFF/watch。491清单不证明整个未跟踪仓库都已枚举；本轮新task/证据另列。前端/服务/旧Hubble产物不变。

普通Prepared registry仍空；WXML FAILED_DEVTOOLS、旧像素失败、新月面手机/Android/iOS、独立审查、完整批量发布/成本/容量及33项有效义务均保原状态。这里只是根agent自审开发证据，未独立审查、未目标运行时或最终验收。未提交、推送、采购、部署或对外发布；Goal仍未完成。
