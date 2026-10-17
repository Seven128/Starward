# 图像批次验证与身份接入

用户指出加工后又逐图完整页面验证，明确要求改正并继续。PLAN、图像流程Context及深空README现分开全量自动数据检查、集中内容/融合复核、共享机制代表消费者验证；`prepare-reviewed-page-profile.py`仅为机制诊断工具，不再是新增影像的后续入口。未增加第二套审批或采用记录，完整Goal正文无需改写。

## 已有实际图像成果

`output/eso-image-supply-2026-10-09-r1/`保完整6幅ESO来源（NGC300/6744/1232、NGC246/7293/2359）、原JPEG/XMP/来源页/许可页、全幅工作图、3次SXT GPU批调用及集中整图/ROI复核。六个baseline均NEEDS_REPAIR，原星系纹理/HII误删、残环或局部背景异常保留。NGC246经`photoshop_original_restore.py`原图中心局部恢复，实际PSD重新打开，核心/外部通道差0、羽化差0；整图/7ROI组合文件复核通过。`ps-nucleus-r1/result.json`与`ps-nucleus-reviewed/review.json`为对应owner。

现native批次生成`output/eso-image-supply-candidates-2026-10-09-r2/result.json`，NGC246三档本地候选hash `c36029b1b8aedf64dec0d37db12ace6f4eb4cac919491ba63d48635bcdd2e49a`，细档1665×1686原已审PNG精确复用。工作尺寸不作生产上限；先前输出路径重叠拒绝、来源超时/credit失败、缺依赖及所有修复前结果保留。

## 撤回逐图页面循环

`output/playwright/eso-reviewed-page-2026-10-09-r1`因启动配置缺decorator支持失败；r2已terminal exit1，停在NGC246搜索等待，未形成共享消费者通过。未继续该对象的page profile/build/run循环，也未删除其输出。

`output/eso-image-supply-2026-10-09-r1/batch-validation-correction/shared-consumer-evidence-readback.json`保已有PS组合代表旅程及其实际前后端绑定读回。共享实现已有变化，旧通过不能冒当前通过；登记一项“受影响共享机制在批次节点复验”，不展开为每图旅程。当前Scene/物理资源/WEAPP/独审仍未验。

## 实际批次准入缺陷与修复

同目录`inventory.json`通过现只读批次入口直接暴露`prepared_optical_catalog_registration_invalid`。实际旧扩展OpenNGC只有NGC253，新增六目标均未进入运行目录；不依赖完整UI即可定位，未放宽catalog/footprint准入守卫。

沿`data-pipelines/src/opengc-messier-deep-sky-catalog.ts`一次读取已有固定OpenNGC CSV（SHA `840fe0c9ee1332e551b2e722a0e92726cd7b157914a3d2177602832aadd3aa9e`），从同源生成整批新增身份的新不可变版次。`packages/astronomy-core/data/opengc-deep-sky.v3.json`为58行，hash `64df9f8e0aaaa50ed46cf61d2332dfc84748d462348b23e9ffeebd441b849383`；原默认51行和原扩展52行及hash/文件保留，新旧请求索引继续隔离。保OpenNGC CC BY-SA4.0来源、署名、加工说明；没有下载、重新加工影像或将catalogue坐标冒独立配准。

共享合同版本、astronomy目录loader、Mini请求、资料来源消费已接同一当前版次。新批次搜索/资料/报告位置参数化核验通过；旧默认及旧扩展查询不泄漏新对象。`inventory-after.json`读回三PNG和公共metadata共5,326,845B，0关联异常；普通采用和合格可分发仍0，Scene MISSING、配准/权益独立决定UNVERIFIED，不因数据读回升级图质。

`catalog-before.log`保修复前真实NGC246找不到的失败；`catalog-after.log`3通过。`catalog-consumers.log`28通过，含整批六身份和原搜索/资料/报告兼容；`app-catalog-request.log`2通过。App类型检查通过；API初次仅新增测试缺null断言失败，修正后`api-types-r2.log`与进程exit0通过。没有为每个对象新增测试文件或完整E2E轮次。独立审查仍MISSING；本证据不关闭全部C/D或33项。

## 原结构保护预检

新增目录映射后，使用现有PS路径蒙版格式，按同一固定catalogue轴径/角度与原AVM为三幅星系计算保护候选；整批查看`galaxy-protection/*-mask-preview.png`即发现均漏可见外围/HII或伴星系结构。`preflight-decision.json`已标REJECTED_BEFORE_PHOTOSHOP_DISPATCH；两份组manifest只保诊断，不可执行，新增PS/模型/出版均0。目录尺寸不是完整真实结构footprint；不在已知缺陷上继续加工，也不盲目扩半径。原文件质量失败保留。
