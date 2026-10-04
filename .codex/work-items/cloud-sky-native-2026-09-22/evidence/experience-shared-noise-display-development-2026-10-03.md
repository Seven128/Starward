# 共享条件噪声显示候选与完整母图开发

状态：显式离线开发候选，质量 **UNVERIFIED**，独审 **MISSING**，普通 registry 未采用。Goal active、无预算、未完成。原科学/几何权重/已解析 transfer、science-optical-v2/v3 writer 和默认路径保持。M51 Prepared 矩形 FAILED、M82 OV/MED 输入不足及原生/手机义务没有升级。

## 本轮结果与职责

沿 PLAN B 把已有局部共同显示算法接到实际共享离线 owner [sdss_noise_display.py](../../../../data-pipelines/deep-sky/sdss_noise_display.py)，而非再建立 task 内竞争实现。single 和 mosaic 使用同一 source/contributor 资格、原 coadd、一次固定 5×5 spatial/range sigma1 处理；三带共用权重。旧局部/混合脚本已消费同一 pair covariance、filter 和条件上界。不是按 field 各自平滑后硬拼。

输入由现有 corrected-frame/CAS/fpM owners 准入：精确 field/band、source receipt、PS_ID/尺寸、贡献 footprint/finite、权重集合与总和，以及实际 bilinear projected 值和 coadd 值逐层核对。实际 CALIB/SKY 仅用于已校准值的统计 variance；不再扣 sky、不改 gain/科学测量。平方插值系数和同 native ID 的 pair covariance 保留；跨 field 未知 covariance 用 Cauchy 条件上界，遗漏 sky/系统/加工误差不在该上界内。上界不是完整 confidence 或滤后误差认证。

缺 camera/SKY/flags/processing association 或处理拒绝 bits 0/1/8/9 的正贡献保持原值；零贡献的未知支持是中性项。NOTCHECKED/OBJECT/BRIGHTOBJECT/SUBTRACTED 不冒缺测或自动坏点，不恢复猜测的模型。science availability、processable 和 alpha 独立。真实 halo 跨 chunk 读取，不合成边缘；母图最外两行/列原值保持，取消不返回半成品候选。

[sdss_gri_tan.py](../../../../data-pipelines/deep-sky/sdss_gri_tan.py) 提取 `coherent_box_means` 数值职责供旧 scientific mean 与新 display-estimate mean 共同消费。新估计仍标明显示用途、原 nMgy/native-pixel 单位，不能当新测量、粗像素总通量或表面亮度。三个 PNG 保持原面积 alpha 与 frozen transfer，fit=0；新 serializer 为 `sdss-common-noise-display-candidate-v1` 独立候选，独占新目录，不接旧 publisher/default。当前候选收据保存源科学/availability 和估计 C-order hashes、recipe/几何/处理参数，实际获取/相机/flags 完整关联还在输入证据与原母图，不是可直接采用的完整出版来源合同。

## 检查与逃逸缺陷

[test_sdss_noise_display.py](../../../../data-pipelines/deep-sky/test_sdss_noise_display.py) 覆盖 single/one-field mosaic、不同 chunk exact output、真实 partial 和 source geometry 外界、有限黑/负值、未知/零贡献、处理 flags 保原、错误输入/权重/processing/coadd 拒绝、取消、强红蓝边、Cauchy 反例、serializer 和 source 修改拒绝。与受影响旧 Gri/science pyramid/publisher 一起运行 **50 checks passed**；这只证明开发机制。

初次 partial integration 暴露 `SourceStencil.x0/y0` 只含 geometry 内子集，不能 reshape 全目标 shape。owner 改为全 shape 的缺失 ID 并只填真实 geometry；内存中的旧错误实现 mutation 在实际外界 partial fixture 上重新触发 ValueError，修后输出保持 source missing。不是依据文件长度抽象或把 fixture 改成全覆盖。其它初次 fixture 错误（MappingProxy deepcopy、北向 y、错误预期拒绝层）已按实际对象/边界修正，未降低算法期望。

## 完整实际输入与输出

[完整执行脚本](../scripts/experience-shared-noise-display-2026-10-03.py) 复用 M51 六 field × gri 的 **18 份原 frame、18 份原 fpM、现有 CAS、原 projected arrays/normalized weights、2048² coadd 和 frozen recipe**。没有下载、重新构造母图、再跑旧全幅 PSF/flags/overlap 矩阵、安装或启动工具。完整运行 exit0。输入与六项 protected 文件逐个前后 hash 相同。完整输出中的已有 33² 实际混合区与原 r2 estimates **bit exact**，迁移算法未改变该区域结果。

执行结果 [result.json](../../../../output/shared-noise-display-1003-r1/result.json)：29,993B，SHA256 `6428c50750f6f592e378abe30c3f9c01bb9c49cc689b6965957a2a8e9c2ee76e`。
显式收据 [candidate.json](../../../../output/shared-noise-display-1003-r1/candidate/candidate.json)：14,618B，SHA256 `0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5`。

| 实际执行量 | 结果与含义 |
| --- | --- |
| 科学有效母图样本 | 4,194,304（完整 joint；不外推其它对象 coverage） |
| 可处理 / 保原 | 4,095,911 / 98,393；保原包含外两圈与模型/处理资格不完整 |
| 实際 chunk | 64；32 rows，真实 2-pixel halo，最多同时 5 field |
| 处理 / 含三级保存时间 | 205.242 / 206.786 秒；本机 wall，源读取前置不含，不是 server CPU-time 或批量吞吐认证 |
| 所有持有 stencil 数组峰值 | 115,015,680B；不含 caller source/master/output、临时采样、库和 RSS |
| Windows Python peak working set | 1,065,402,368B；包括持有 FITS/flags、mmap、输出和库；约 1,016 MiB |
| peak PagefileUsage / 最终 private commit | 1,035,358,208 / 867,127,296B；不与 working set 相加为内存峰值 |

这是当前本机 **离线加工进程**，不是 WEAPP/手机/线上 BFF 或预期 4核16GB/4GB 测试服容量证据。不能按母图数简单线性外推全部对象或并行加工；时间、宽度、有效 field、进程持有源和并行准入都影响峰值。当前有界 chunk 不授权无界批量并发。

原 mean consumer 使用受影响数值 helper 得到的真实 OV/MED/DETAIL PNG SHA 分别保持旧 publication 的 `db0de119…a2547`、`681b5449…595`、`fe339181…e801`。没有重新 fit recipe；v3 旧路径未变。

## 保存读回、实际视觉与成本边界

[只读回脚本](../scripts/readback-shared-noise-display-2026-10-03.py) 不重跑 filter/fit，只核保存数组与 PNG。结果 [readback/result.json](../../../../output/shared-noise-display-1003-r1/readback/result.json)：9,032B，SHA256 `05bb4eb51a137e580648cfcdb8190bd775249ab8cfdfe3029d9f4aba5e34b3e9`。98,393 保原值逐带 exact，joint 内值有限。4,093,001 estimate 像素、3,624,666 母图 RGB 像素变化不是科学新覆盖；三级 alpha 与旧 PNG 全部 exact。OV/MED/DETAIL 改变 RGB 像素分别 152,671 / 207,192 / 217,547。

当前实际 OV/MED/DETAIL 的新旧六 PNG 已查看；另实际查看 [旋臂/弱臂/标记源/field 交界/资格边界对照](../../../../output/shared-noise-display-1003-r1/readback/actual-boundary-and-structure-pairs.png)，每侧 128² 实际母图显示按 nearest 放大 2 倍，无生成细节。两个边界 patch 根据实际边界处最大 RGB delta 选取，并记录 bounds，不能代表全体样本随机质量通过。色粒减轻、紧凑源原有色圈/标记外观仍在，棕色底和完整弱结构/配准/背景仍未解决。不能用“有变化”或部分看起来更平滑作为采用依据。

真实 chunk join 行原梯度均值 5.116、候选 3.268，左右相邻行候选约 3.260/3.273；描述值没有显著整行跳变，不是完整 seam/registration 通过。自然结构每行不同，不以这组均值建立合格阈值。chunk 等价开发 fixture 与真实 halo 是机制依据，完整母图有效覆盖/场间配准和 pixel质量义务保留。

新候选目录实际逻辑字节 **55,974,816B（约53.4MiB）**：三个 float32 estimates 共50,332,032B，processable 4,194,432B，三级 PNG 共1,433,734B，收据14,618B。PNG 分别485,084 / 500,819 / 447,831B。源获取、原科学/侧车、原 baseline、诊断、旧版/回滚/暂存并不包含在该值；逻辑字节不作物理分配/云端 SSD 保留成本。没有把估计数组发给手机或静态正式出口。

## 当前直接依赖

继续 B 的完整候选质量与出版来源责任：依据上述保存结果处理尚存色底/标记边界/弱结构/coverage与配准证据，把实际 frame/CAS/fpM 关联和模型限制保到新的版本加工来源合同，再接可审查的批量出版与出口链。完整 quality/source/cost 和必要独审前不普通采用。仅在新机制/缺陷/输入变化需要时重跑受影响加工，不再循环 sigma、同一局部或无变化全幅矩阵。A 实际 page/router Back/公共时间 UI/native 和 D 实际生产引用/磁盘/全产品混合容量独立开放；DevTools FAILED 和手机不可用没有升级。
