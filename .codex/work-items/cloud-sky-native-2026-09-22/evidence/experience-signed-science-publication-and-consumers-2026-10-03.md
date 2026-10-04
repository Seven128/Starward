# Signed科学v3出版与消费者开发，未采用

2026-10-03，Goal active/无预算；固定worktree/分支/HEAD保持。承接[共享owner开发](experience-shared-signed-science-pyramid-development-2026-10-03.md)，复用已校验cached科学母图；不下载、解码FITS、重投影、二次扣sky或重跑旧闭合矩阵。

共享`sdss-science-optical-publication.ts`现在显式区分原encoded `science-optical-v2`与`signed science-optical-v3`：原v2保母RGB父图；v3每档绑定g/r/i科学数组与joint hash、signed均值单位、available/empty/partial计数及可用母样本数。结构校验约束共同面积上下界/嵌套crop、negative/zero范围、无每档拟合/改科学、参考RGB而非父图。修改参考RGB依旧改变immutable hash；新鲜hash不能准入错版本、单位、父图、面积、拟合或缺来源。结构标记不代替科学/PNG重现或独审。

`publish_sdss_science.py`复用现有验证母图/byte-bound inputs，两个版本共享实际receipt保存责任；显式`pyramid_kind`才选择新writer，新候选文件不冒充旧v2输入。新writer的固定全图reference RGB与signed三档通过同shared owner生成/readback，TS pack保唯一canonical hash。旧CLI/default仍v2，新入口以[实际任务脚本](../scripts/experience-signed-science-publication-2026-10-03.py)明确参数调用；全图fixed .5/Q10，不拟合。当前输入verifier仍只支持既有fixed母图，whole-master-zscale的新publication未验证。18份完整原receipt、原输入/array身份在生成前后保持，exclusive生成不覆盖失败或旧代。

真实出版`output/signed-science-publication-1003-r1/manifest.json`20,928B SHA256 `d64d9534d74457b9ea48f1dfd67cb46727e5040a6c2ccf3c79a58e13143c7572`，publication hash `dddc454058cd1dc464ab0f726b78d0af5df130d4a6c51c41d8a83e4bfcf5e2af`。writer receipt27,842B SHA256 `609a78c676119f2b796909e3641ff6e655129dca62c5454ce9c081fdc91da881`。三级PNG原pilot精确字节，合计1,557,725B；referenceRGB NPY12,583,040B仅离线，不新增手机科学数组下载。runtimeRegistered/qualityAdopted=false。

实际消费者新增v3判断：服务来源/PNG读取、ready frame、共同exact identity与完整family出屏判断。原Hook误把版本`science-optical-v2`当家族；真实v3实验取得metadata却发0图片请求，cold期望2实际0，四项失败。修成内部`sdss-science`家族与明确v2/v3 manifest判断；reference/hash/retired metadata/source-kind fence保持，旧Prepared不能混入。失败`output/signed-science-consumers-1003-r1/hook-failure-before.json`与原资源trace保存；修后真实v3 Hook七项通过，原v2 fixture七项通过。仅query key的内部家族名迁移；实际文件/出版版本仍依原hash。

真实v3通过完整resource/cache owner：8项有界MapFS/Taro callback检查通过，含冻结、cancel/clear epoch、迟到、暖文件、完整bytes/lease；trace在`output/signed-science-consumers-1003-r1/resource-traces.json`，其scope明确不是native FS/decode或HTTP。Scene/ready-frame20项用真实v3 envelope/原PNG通过，粗源/retirement/同帧身份保持；这些是实际模块与受控draw port，非native画质或完整page/Back UI验收。

另[HTTP脚本](../scripts/experience-signed-science-http-2026-10-03.mts)执行当前service、Nest/Fastify/controller和真实client准入声明（in-process injection，业务fixture，无新listener）。manifest/三个PNG 200、image/png及原bytes/hash；object information FRESH保原catalog/W3独立项与新版完整加工source，foreign reference拒绝。default JPEG原hash/bytes保持。referenceRGB/科学数组/receipt/其他对象file均404。结果`output/signed-science-http-1003-r1/result.json`19,391B SHA256 `f00e7aa709e40dfea2f72f4c8bf25db416ab39f996cdfa54698ed6d897f5c07d`。第一次调用未设worker TSX tsconfig，decorator transform前失败；设已有`TSX_TSCONFIG_PATH=workers/miniapp-api/tsconfig.json`后运行通过，不是BFF/DevTools故障或重启。当前常驻BFF未加载新源码的事实保持。

affected Python39、contracts/client9、旧service/HTTP6及contracts/App/worker TS5.9.3通过；新合同fixture首次referenceRGB变化误共享synthetic content对象、union fixture类型首次不相容，均修fixture/typing后通过，不冒图质修复。原candidate/旧出版保护仍以当前checkpoint和writer before/after为依据。原资源trace产生时Hook仍FAILED，修后Hook工具结果单独记录，不倒填trace为全套成功。

下一直接依赖：显式science publication owner→标准静态export/出口完整身份，新版冻结参数/有partial候选的完整出版资格与必要独审；然后实际层级/旋转/天背景/颜色/PSF/弱结构、已绘source/Back和完整成本。默认science/Prepared未登记。照片M51矩形FAILED、M82OV/MED不足、WXML FAILED_DEVTOOLS、手机/Android/iOS/新版月面未验、完整资源/200DAU容量及最终交付保持开放。本增量独审MISSING，自读回不能升级。
