# 既有图像库与新增加工库存核对

用户指出此前已有五十多组图像且进入LFS。实际本地核对确认：此前进度答复的17源只覆盖最近ESO/SXT/PS/整幅源加工批次，不能当全项目图像总量；普通Prepared采用0也不能表述为云观星全部图像接入0。

## 既有运行资源

| 范围 | 对象或分组 | 当前/保留图像文件 | 含义 |
| --- | --- | --- | --- |
| AllWISE W3目标切片 | 51个不同Messier对象 | 当前153张（三LOD），另保留M42旧JPEG三张 | 历史12微米红外巡天，不是新高清可见光照片；已有默认运行服务。 |
| SDSS DR17光学 | M51、M63、M64、M81、M82、M87六组 | 18张（三LOD） | 六对象均包含在上述51对象中；不能重复累加为57个不同目标。 |
| 广域W3 | order0十二块 | 12张 | 红外低阶背景，不计十二个目标。 |
| 银河 | 2MASS与Mellinger各一份 | 2张 | 近红外与光学DISPLAY分别保持原用途和资格。 |
| 月球及行星 | 月球两图、六行星各一图 | 8张 | 不计入深空目标去星批次。 |
| 星座插画 | 85个图片文件 | 85张 | 插画资源，不是85张天文实拍。 |
| 地景及地形 | 地景两图、地形一图 | 3张 | 辅助场景素材。 |

本地Git LFS当前图片合计284个文件、17,534,904字节；逐文件核大小及SHA-256与LFS oid全部匹配，checkout/downloaded全部true，无缺失。W3与六份SDSS当前清单的171个LOD文件声明也与LFS大小/oid全部匹配。另有一个12,377,473字节地景原作ZIP。现有`tools/resources/assets.mjs audit images`读回285个资源、29,912,377字节、285个不同内容对象，status=MATERIALIZED。只读本地；未下载、上传、核查远端LFS存储或重跑图像加工。

W3事实源为`workers/miniapp-api/assets/deep-sky/manifest.json`：schema `allwise-w3-deep-sky-publication-v3`，声明与实际entryCount均51；当前153个LOD文件共4,563,738字节（150 JPEG、3 PNG），256/512像素，清单SHA-256 `cacba21af333a11cfa1a36f638fdf057aceb918eba157b3418e580e6386d0f8b`。M42旧三JPEG另计50,292字节，保持兼容。SDSS六清单归各`assets/deep-sky/sdss-m*/manifest.json`；`deep-sky-imagery.ts`及`sdss-optical-imagery.ts`由`miniapp-service.ts`默认构造消费。此处确认库存、清单与代码接线，不冒当前设备呈现、完整质量或容量验收。

## 新增高清加工

`output/eso-image-supply-current-inventory-2026-10-10-r8.json`只持有其声明输入：17源/34阶段记录、9候选版次、24个不同候选图片文件51,141,123字节。17源已加工并复核，3源文件级通过（NGC246、NGC7009、ESO378-1）、14源需修；新的Prepared普通采用/可分发仍0。旧M104通过结论已被结构误删反证推翻，不能重新计入通过。

这些候选主要保存在忽略的`output/`，与既有LFS运行素材是不同集合；旧试验原图/中间产物也不能由这份17源库存代表。对象、来源、波段、LOD、版次分别计量，不能把51+6+17直接当去重目标数或合格高清数。继续沿[当前交接](../CONTINUE-CLOUD-SKY.md)扩合格供给，保全部既有资产与FAILED/UNKNOWN/MISSING。

核对入口：`git lfs ls-files --json`的`files`数组、各当前manifest、实际本地文件长度与SHA-256，以及`node tools/run-node.cjs tools/resources/assets.mjs audit images`。新的加工进度由原批次/库存派生，本记录不是第二份采用清单。
