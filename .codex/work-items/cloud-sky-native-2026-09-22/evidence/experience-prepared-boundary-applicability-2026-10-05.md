# 实际细粗边界、来源适用性与中档采样（2026-10-05收口）

本代只修改云观星任务脚本、证据和四项归属文档；生产源码/其他业务逻辑修改0。沿既有510前端/167后端、正式Map→实际Sky page、原Hook/Scene/renderer补一个必要公开平移条件，不核旧设计稿、不重跑已闭合组合。实际生成目录仍以1004命名；本文件是北京时间2026-10-05的收口，不改变其运行代次。原source、母图、出版及六项Settings/outbox保持原字节，独审MISSING、普通Prepared registry空。

## 真实结果与限制

复用前代1024 Hubble细图及原三张512 Hubble PNG，在同390×844、.05°、2026-10-04T13:00:00Z视场执行公开触摸平移，显露细图边界。四帧依次为Hubble原粗层、NOIRLab raw中档、NOIRLab display中档、还原Hubble粗层。实际细层/粗层均参与，原GPU资格函数执行；新细/粗小样未被旧v1合同支持，最终来源完成仍为null/UNKNOWN，旧descriptor只供归一化名义几何。

完整输出已检查：原512 Hubble中档在细图之外明显模糊；直接换NOIRLab粗层有更明显的颜色、结构断层。raw/display都不能直接作Hubble高清的合格父层。这不排除NOIRLab宽场候选的独立用途，不支持全图校色、重拟合坐标或用透明度掩盖缺陷。

四帧运行在严格还原断言失败处退出，[原failed.json](../../../../output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/failed.json)保留，未生成成功result/资格数组/最终逻辑退休回执。保存的完整GL像素读回确认：两个RGB通道、两个像素各差1，位置为top-first(234,600)/(359,810)，成因UNKNOWN。相机/时刻相同不能解释差异；浏览器/服务关闭不能填成原代次native句柄、文件租约或GPU逻辑退休通过。后续成功不倒填这项FAILED；前代中心还原0差也只保其原条件。

## 有依据的中档改动

原Hubble中档来自冻结2048母图的1024×1024中心裁片，再box2成512；原细层512来自512裁片。前代新细网格1024来自同原JPEG/AVM的细域新采样，本代不重复它。

只将既有1024中档裁片原样导出：[缓存母图中档结果](../../../../output/prepared-hubble-medium-sampling-1004-r1/result.json)。共用现有premultiplied box factor1，无源RGB解码/投影/背景估计/颜色拟合/锐化/feather；全RGBA、二值几何alpha、有效黑色和缺测隐藏RGB与母图裁片精确。PNG1886809B，SHA256为54f5e457eeca1a9d7c41b9fea0a54ca76a7380ef4ff14421b8af26b57aa38aec；RGBA4194304B，约0.206s。旧raw/display v1的512身份和不可变hash不放宽。

在同实际page只新增这一高分辨率父层条件，[当前运行result](../../../../output/playwright/cloud-sky-prepared-boundary-medium-1004-r1/result.json)及[当帧资格/资源](../../../../output/playwright/cloud-sky-prepared-boundary-medium-1004-r1/boundary-comparisons.json)保存原GPU查询真实positive/has及完整图。父层结构更清晰，采样落差减小；没有新混合或边缘遮蔽。边界/完整弱结构、绝对配准、真实照片外沿、昼暮偏白仍未通过，不以局部清晰证明整张合格。

## 名义覆盖与读回

[本代名义几何](../../../../output/prepared-boundary-geometry-1004-r1/result.json)沿生产registerSkyTanOpticalField/unprojectSkyPoint/skyArtworkUvAtDirection，用当前代次实际观察矩阵和完整390×844像素中心射线；无图片重处理。名义域both220266、coarse-only108894、fine-only0、neither0。431对相邻边界像素仅排除y<60的已知顶部保留区域，四个粗层条件对应的源alpha邻域均255。它证明这一名义域内有几何支持，不证明科学覆盖、GPU Float32逐像素mask相等或绝对天文精度，不倒填失败代次的观察/退休事实。

[保存数据读回](../../../../output/prepared-boundary-readback-1004-r1/result.json)首轮通过：五份GL→PNG→GL全值精确、共同view/time相同、全中档母图crop及PNG/Npy精确、原失败与缺证保留、本代资格及最终退休成立。四邻输出的最大RGB跳变中位/p90/max分别为原Hubble512 7/15/51、同源1024中档6/15/52、NOIR raw12/30/68、NOIR display14/32/69。这些值含真实星点/结构和采样差异，只是描述性诊断；没有图质阈值、PSF或仪器接缝归类，不能说所有统计均改善或质量通过。

## 总资源、出口与退休

失败四帧代次同时登记原三512、细1024、两个NOIR512，共6图/9MiB native-RGBA等效；原代次最终逻辑退休MISSING。

新同源1024父层代次同时登记原三512及两个1024，共5图/11MiB等效，不冒理论替换后的9MiB。完成帧GPU纹理4194456B、buffer9540B；该阶段保存的纹理copy观察最大9830552B。完整旅程952观察各自最大纹理11800576B、buffer26112B、native-RGBAeq13369344B、FS3019252B、encoded2977051B/reserve703555B。各MAX不相加为物理总峰；临时copy/旧新共存和退休分层。该代次hide→释放额外注册→原unload/query/file-cache清理后native/纹理/buffer/文件租约及活动/退休记录最终0，仅验证当前代次。

新代次89请求、body5776962B；旧Hubble三PNG仅首传1152395B。新1024图使用任务dataURL，未经过新版本实际HTTP/static/cache/lease链，不能用此body/旧URL证明新出版出口。两次实际page复用同五份bundle，前端构建0。四主输出组逻辑35494523B（失败矩阵19094085、母图中档6089017、新父层page9848651、几何462770），不含reader/scope/docs，含副本与GL诊断；不是生产库存、wire、180GB全机余量或200DAU容量。无源下载/付费设施/采购/部署/发布。

## 归属决定与下一依赖

已测得细档及中档1024收益，不能继续把统一512当需求上限；低采样NOIRLab也不能靠加像素冒高清。冻结宽母2048与新细网格1024来自同源/同近似AVM，但不是一幅新4096母图，不得把两者标为旧v1同母三级。下一依赖只由[当前PLAN](../PLAN.md)维护：沿现有来源/TAN/多级/严格出版与消费者，核实可复用的同源多网格身份/几何与最小必要新版本，先闭合正常出版、静态/HTTP与实际消费者的一条路径；只有真实不足才扩大投影网格，不无变化重处理原片或盲做整幅4096。完整质量/配准/覆盖、旧版回滚暂存保留/全机成本及混合容量继续开放，普通registry不采用。

WEAPP WXML FAILED_DEVTOOLS、Android/iOS、新月面手机、独审和全部原33项义务原样保留。当前证据是源码之外的实际软件page开发验证，不是目标运行时或最终验收；Goal仍active、无预算、未完成。
