# Prepared RGB → TAN producer independent review

2026-10-03，独立 reviewer `/root/sphere_grid`。工作区 `E:/dev/worktrees/Starward/remote-main-20260908`，分支 `codex/remote-main-20260908`，HEAD `72e65cf309d700cb7d40c5b7afd53660fd39fa35`。本次不修改生产、原产物、普通默认、合同、PLAN/Context、201旧资源或六保留项；无下载、GPU、IDE/watch、原生或服务操作。

限定结论：当前 `prepared_rgb_tan.py` 没有发现需要阻止此离线 producer/cache-guard 开发收口的缺陷。共同四偏移完整四邻取交集、FITS y 与 JPEG 行方向、同母图整数 box、有效黑与几何 alpha、只读 bytes backing、失败资格及真实保存产物相符。该结论不采用候选影像，也不认证近似 AVM 的物理精度、科学有效性、连续纹理边缘、自然颜色、客户端成本或原生质量。

实际执行代次保持独立：fresh `output/prepared-rgb-tan-generation-1003-r1/result.json` SHA `844ead5e726ed5af8f2fc6e46899c3dc06ef4e4ea8355a1fdd901f98de0c403f` 绑定原 owner `c29a0b5a46de3fdbf8ec918ccfd6cfd6c52e261959f56e37d9991d2abb3943d7`，33 checks/host exit0；current cached-validation `794924fa3d190c8b9c6cc6d43084430f77878c245b6c37638daeb8dcd0f49021` 绑定 `6ab454989b401a2f99f1dfd8e258618cd1f3d979e9c72ec9c0040ee319a88194`，34 checks/exit0。实读两个完整 checks.log、对应 host result/raw.log、两个完整 executed driver、执行源码副本和新旧 producer 差异。cached driver确实从已保存 NPY/hash/metadata构建不可变 master，没有再次读取、解码或投影真实源；其 unit checks 的小型 admitted JPEG fixture 是另一范围。fresh inventory当前三处变化（driver、producer、test）明确保存，不能称fresh执行了后来新增的缓存 guard。十份执行副本均回原 execution inventory 的 bytes/hash。

有作用反例 `output/prepared-rgb-tan-cache-guard-1003-r1/result.json` SHA `f84dcf69e46f0c8be99b348a2fffd111ffc04afa4d9f0e45b20192c1f7298c7e`，其原 script、frozen-before owner、host exit0/raw与实际当前源码一致。只投影原8×8 fixture一次：alpha128、缺几何处隐藏RGB、支持数不符、有效黑数不符，在 c29a均进入三档出版，当前均在公用产品入口拒绝；合格黑像素 alpha255 三档 bytes不变。它验证缓存几何资格，不验证科学缺测或外部 publication 的身份信任。当前 test SHA `b1faecfcda7a632a1c2d446b740bfe3c0ec2e9809a9568ee62b0f7ede1e0c1a6` 还保原 row-flip/AND→OR实际像素检测、sample_native禁止逐档重投影、非法/无支持输入、chunk等价和不可重新置writeable的回归；本次没有重复执行作者 suite。

我独立执行只读 `scripts/readback-prepared-rgb-tan-independent-2026-10-03.py` SHA `a90b629c00d78a3ab01a423889d980966c2816baaadb6bb4a8c933ab203d0b6e`，host exit0。结果 `output/prepared-rgb-tan-independent-1003-r1/result.json` 68,622B，SHA `d960965deeda86225d64681e431bfeea044d59cce0d1de25c001b851e2349b81`；`bindings.json` SHA `9a4b018c637e04e57dc13f026839c6f01a0b41315f31364d81be62b51bbdd9fb`，2733个实际唯一文件前后相同，包含既有 package inventories、执行副本/receipt、实际201旧素材与六保留项。cached/guard inventory current零差；fresh三处历史差异逐项明示，不回填历史。此绑定不声称整个 Python/native DLL/系统库可重建。

独立 oracle 不调用新 producer 的 build/products、共享 box或source sampler来证明自身。保存的2048² uint8 NPY整文件与旧 nominal NPY及cached NPY逐字节相同，raw SHA `2c9790bb218556a3e2474a4101e0dad4a389c7d45c1ff441210df0678a3694a9`；全幅 alpha仅0/255，unsupported RGB全0，支持1,425,463/4,194,304，有效黑0（真实源没有提供黑反例，黑语义由上述 admitted fixture保留）。三PNG自写CRC/chunk/zlib/五种filter解码，整幅手算整数box的alpha加权RGB与alpha平均、crop/field/CDELT/count/hashes均吻合；每档 encoded bytes也精确回旧 nominal及current cache。

| Level | 同2048母图裁切 / box | 512² opaque / partial / zero |
| --- | --- | --- |
| OVERVIEW | [0,0,2048,2048] / 4 | 88625 / 934 / 172585 |
| MEDIUM | [512,512,1536,1536] / 2 | 253400 / 387 / 8357 |
| DETAIL | [768,768,1280,1280] / 1 | 262144 / 0 / 0 |

有限 native oracle只为读回解码一次既有4000×2776 JPEG，其RGB SHA回原 source receipt。直接由原数字 AVM reference/scale/rotation 构造三维TAN切平面和CD逆变换，不使用producer WCS或sampler；独立四邻权重和float32样本→四偏移均值核49个真实target cells。5个边界cell存在“部分偏移支持、部分不支持”，共同AND后的alpha0/RGB0与保存母图精确一致，其余合法/缺口和行方向也全字节一致。这是有界坐标/像素实证，不是重新投影整母图、一般边缘连续性证明或配准实测。

source credit/encoded published composite、原始 Spatial.Notes（约5″差异的出版方说明）、`UNVERIFIED_APPROXIMATE_PUBLISHER_AVM` 和 scientific availability/validity `UNKNOWN` 未被几何可取或bytes相等提升。box alpha是离散binary-cell支持的平均；不等于连续源footprint面积、曝光/科学mask或像素可读性。OV实际缺口与矩形仍存在，DETAIL全几何可取不证明物理/色彩/PSF质量。source/publication的独立封包身份、共享客户端接入与普通默认仍是后续责任，本次不审尚未冻结的合同/packer。
