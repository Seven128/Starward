# Prepared optical publication independent review

2026-10-03，reviewer `/root/sphere_grid`，工作区 `E:/dev/worktrees/Starward/remote-main-20260908`，分支 `codex/remote-main-20260908`，HEAD `72e65cf309d700cb7d40c5b7afd53660fd39fa35`。与 Prepared TAN producer 独审分别记录。本次不改生产、旧产物、PLAN/Context、201素材或六保留项；不下载、解码真实源 JPEG、重新投影母图、生成LOD、启动服务/IDE/watch、运行GPU/native或注册普通默认。

结论：两个实质 finding 已修复并独立验证，当前 R4 的离线封包/公共 content hash 边界无剩余阻断。该结论只闭合已缓存 prepared encoded-RGB 的来源、几何产物与内容身份交接。结构准入或新hash不授权新来源，不认证原生、画质、科学有效性、可见署名或约5″配准精度。

完整实读 Python verifier/writer、TS packer、prepared schema/test、公共 hash/basic helpers、SDSS v1/v2受影响 source、共享导出与 SDSS writer新增common-owner绑定。当前 publisher `26beb0b058a5da5241665d8ee0a4d42788405bfaed777efa257068aff5ee5873`（23,363B）；prepared TS `80d1367abaf60783ce312a2215a61d0b160c52eac17a09fc265d848917bafcee`；packer `cf0c18600c1390ddf7038d683c53b1dadfb032c6f12188f6e63bd55c4baa880e`；common content `7036d2c117cf774356e879069175ef3f708796e7da4b361b0c8e27d4199ebf16`。公共单元只拥有 canonical JSON、内容SHA、基础结构与level顺序；prepared和science各自拥有物理单位/来源/recipe/mask约束及自己的transport字段剥离。v1继续原顺序hash，只将level常量变为alias，没有把prepared色图当gri science。

第一次 finding：R2 的 `master.rgba` 和 `levels.masterRgbaSha256` 实际指完整NPY容器，命名无法区分decoded payload和序列化文件。R3修正：raw RGBA明确16,777,216B/SHA `2c9790bb218556a3e2474a4101e0dad4a389c7d45c1ff441210df0678a3694a9`；`rgbaNpy`独立16,777,344B/SHA `cf086879a92021445163ca4ff9d6ccd80d4f46d77e071f57ecec1ef0f46556ee`，声明format=npy、shape=[2048,2048,4]、dtype=uint8、rowOrder=top-first；每level绑定raw SHA。当前TS约束这两种尺寸语义，不能把容器byte数当客户端decoded/GPU/native用量。

第二次 finding：R3 `pinned_json` 先hash文件、另一次read解析、再hash文件。实际小文件在parse-read临时替换并恢复后，返回未pin credit却仍携旧pin身份。独立反例 `output/prepared-optical-independent-1003-r1/pin-race-before.json` SHA `ed8e25d1527f2df0a2c97fd751611a31728ee7149aa8503de2415df3316b9acf`，完整旧owner `810cc689…`和执行script已保存；原任务文件复原，不改真实缓存。R4 `bound_bytes` 对受限读取的**实际buffer**核length/digest后供JSON/NPY/PNG解码，保读后文件fence；NPY先校magic/header/2048²uint8/C-order/精确payload大小，再调用np.load。

独立修后控制 `buffer-after.json` SHA `90f22dfb0185f3afe8b63f8007daa6424da20347da70a5844e2bb2043a93ee0c`（4,093B）：同旧/新owner的真实第2次rb-open，物理替换任务JSON为**同长度38B**后在close恢复；两版事件都触发，旧版返回未pin credit，新版拒绝 `prepared_optical_input_changed`。这没有沿用已不被调用的Path.read_bytes hook伪过。另4个小NPY头经实际 verify_cached入口及原source-admission关联：huge shape、float64 dtype、Fortran order、缺payload；旧owner均到np.load trap，当前均在任何np.load/真实大分配前拒绝。fixture是任务内诊断metadata/小header，不冒充真实通过的producer，也未解码源/生成图片。

实际代次保留：R1因合法0B package markers被错拒而FAILED；R2 result `e8c41f16…` 只代表当时容器语义；R3 result `50384210…` 具raw/NPY区分但pin竞态仍开放。R4 `output/prepared-optical-publication-1003-r4/result.json` SHA `aff24f076c269af5eea6cb92799ae430f06e69c68d823f295d6c9577df98b5b1`、writer receipt `ae96df5bf1c3321b50a3e794ac187c90bd0ac0845a077c01c076bd9915a3dfaa`；manifest 7,509B/SHA `23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1`、publicationHash `8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802`。R4不回填R1/R2/R3源码或验收。

独立 saved-output reader `output/prepared-optical-independent-1003-r1/readback.json` SHA `5f8c62b0671582c511e6af8f27774a3147b17b2e894b9c9566176de75f441eb9`（7,347B），bindings SHA `1ae9119e4a7e581b10c60308bece60b1ed4d5aa6337a24d9e199fc6154178dc5`：每代2904实际input rows、implementation before/after、执行源码copy、CLI stdout=manifest/stderr空/Node exit0、writer记录的全部files核bytes/hash；R4的15个owner current零差。R2当前3个source差异、R3仅publisher差异明确保历史，不要求历史copy冒充current。独立2854实际唯一文件前后same，含201旧素材/六保留项及真实source/旧nominal/cache/package inventories；不声称Node/native系统依赖全图或可重建整个运行环境。

三PNG合计1,315,239B，逐byte回cached products和R2/R3；自写CRC/zlib/filter0–4整幅解码后的RGBA回原cached像素SHA。原center/orientation、完整credit、encoded colour意义、JPEG/raw XMP/parser XMP/decoded RGB身份、原Spatial.Notes及近似AVM、producer receipt、field/crop、几何support/alpha counts都与实际admission/master/products吻合。几何alpha不是科学mask；真实OV缺口/矩形仍保留，科学 availability/validity全为UNKNOWN。writer只exclusive创建输出，输入/源码重复fence，合同先于PNG写入，unsafe ref保failed generation且没有图片逃逸；既有output/输入目录重叠拒绝、不删除或覆盖旧代次。R4同-buffer资格也适用于NPY和PNG实际解析，不能仅靠读前hash供以后新读。

独立真实TS准入 `admission.json` SHA `71d14c327013050d8cecda19d5d3ed02c631c8978e9ee15b08db25c5d04e8725`：14个fresh-hash坏声明（raw/NPY尺寸/format/shape/dtype/行方向、level容器hash、science宣称、错误crop/partial-detail/科学mask/遍历/外对象）均拒；5种来源/credit/原Notes/receipt/rawmaster变化被旧expected pin拒。transport URL被hash剥离后仍由manifest独立exact-route约束，改URL不能越过pin admission。独立Nodecrypto按自写sorted canonical重算真实R3/R4内容与noble owner hash一致，没有通过新hash给source质量或rights盖章。

旧兼容 `compatibility.json` SHA `44e1c077cb77585cc80db971690399b528952ebc9e619fc877b1028b020f3449`：实际旧v2 manifest 18,078B/SHA `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5` 同时通过精确保存历史owner与当前提取owner，pin `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0` 不变；独立Nodecrypto也一致。source/recipe/frame三种内容变化的新hash在旧/新owner相同、不同于旧pin。六实际v1 manifest与18 JPEG逐身份验证，原固定offer/URL/hash算法保留；没有重新封包旧v2、重跑HTTP服务或执行旧GPU矩阵。

共享公开类型/index和SDSS writer common-binding修改是源码只读范围；其当前SHA分别index `f733a75e…`、index-types `c60afc22…`、SDSS writer `f64b1b2a…`，这些最终只读身份不倒填前述执行inventory。Root另报告受影响8合同checks及pkg/App/worker TS5.9.3通过，本独审没有重复整suite，自己的actual Node function/black-box Python/保存结果读回均exit0。

后续仍须独立实现/验证普通注册、公共API与immutable/static交付、客户端metadata/lease/Scene消费者、可见署名和目标runtime。原图5″说明是出版方近似说明，非Starward实测；三PNG一致、结构准入、完整credit元数据及退化策略都不替代完整图质/边缘/性能/设备验收。当前Goal未完成。
