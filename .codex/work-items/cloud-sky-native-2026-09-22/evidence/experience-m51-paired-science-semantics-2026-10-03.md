# M51 成对科学源语义小路径（未采用）

本增量继续唯一 PLAN 的 B，复用[已有六主头及30条原数组横条](experience-m51-science-source-bounded-2026-10-03.md)，没有网络请求、完整 FITS 下载、源像素改写、RGB/母图/LOD、生产 adapter 或默认登记。普通 Prepared registry 仍空，M51 照片矩形仍 FAILED；这不是新成品的质量验收。

## 单位、贡献与成对网格

实际 SCI/WHT 每波段48条 drizzle 记录、1152个相关卡值完全相同，包含科学与权重输出文件名、输入 counts/输出 cps、同一输出网格、gaussian/.9及EXP/WTSC；受控改错权重 `D001OUDA` 的反例在三波段均被拒绝。权重头遗留原 detector WCS 不应独立重投影；本路径以成对输出记录核对同索引贡献，再按 SCI 输出网格诊断。它仍不证明完整数组逐像素配准或科学质量。

[ACS 官方校准说明](https://hst-docs.stsci.edu/acsdhb/chapter-3-acs-calibration-pipeline/3-4-calacs-processing-steps)与实际 README/输出 cps 记录一致：drizzled SCI 已是每秒电子，不能再除 EXPTIME 或 CCDGAIN。按各自 PHOTFLAM、PHOTPLAM，使用 Astropy spectral-density 等价转换得到 B/V/I 每原像素 cps 到 µJy 的系数分别为0.19531104591831627、0.18740853007924177、0.15324548663323548；保原符号和零。此值是各滤镜原像素通量密度，不是统一表面亮度或测光精度认证；与 SDSS 比较/合成仍须处理像素面积、PSF、滤镜通带和实际色义。校准定义见[ACS photometry](https://hst-docs.stsci.edu/acsdhb/chapter-5-acs-data-analysis/5-1-photometry)。EXP 是有效曝光贡献量，不是 inverse-variance 或科学置信度，见[Drizzle 产品检查](https://hst-docs.stsci.edu/drizzpac/chapter-7-data-quality-checks-and-trouble-shooting-problems/7-1-inspecting-the-drizzled-products-from-mast/)。

[STScI Drizzle FAQ](https://www.stsci.edu/scientific-community/software/drizzlepac/frequently-asked-questions)解释 WHT=0 无被接受的 good contribution，某些 fill 配置可留下非零 SCI；[旧 drizzle 接口](https://spacetelescope.github.io/drizzle/api/drizzle.dodrizzle.dodrizzle.html)也明确 INDEF 不设置 fill。实际旧头 FVAL=INDEF 与横条现象相容，但现代说明不认证2005所有实现细节。上一轮“保原值与UNKNOWN”继续成立；补充明确：保存这些字节不等于把它们当有效测量。不能仅凭 SCI finite 建立有效掩码，也不据此更改源值或直接生成 alpha。

task-only pilot 复用已有 `sdss_source_stencil.py` 的四邻几何/采样责任，另将“finite SCI”和“成对有限正 EXP 权重的四邻贡献资格”分开。九个真实横条案例证明仅 finite 的采样会返回零权重处非零数据，贡献资格正确拒绝；这是跨来源复用边界反例，不是现有 SDSS 生产缺陷。真实正权重负值保留，synthetic 有效黑值保可用；即使整数查询也要求其四邻，+1邻权重零则拒绝。探测器伪影、噪声质量和完整 coverage 仍 UNKNOWN。

## 实际元数据差异与失败保留

不能固定取 FILTER2：B 为 CLEAR1L/F435W，V/I 的观测滤镜位于另一轮。首次 R1 在 B 后因该假设失败；修为核实际双轮组合后 R2 离线通过，未重取源。EQUINOX=2000、缺 RADESYS 的实际 FITS 按 Astropy 标准解析为 FK5，并转 ICRS；中心误标 ICRS 的差约0.00094346″，不缩减望远镜绝对定位误差。遗留 SIP 只在诊断内存副本移除，源头保持；前轮 WCS 假设失败不被抹去。

[执行脚本](../scripts/experience-m51-paired-science-semantics-2026-10-03.py)及[R2结果](../../../../output/m51-paired-science-1003-r2/result.json)：12,521B，SHA256 `1c0d8f27bd38cd8439c108284bd06dfe46ea4d47f161a28636aefb1390a38d78`。完整输入/owner/保护文件前后字节一致，正常 MJD-OBS 推导警告保留。R1 失败输出保留；没有生产改动，因此不重复已闭合 TS/生产行为/GPU矩阵。

## 剩余依赖

本轮解释了单位、EXP贡献、配对网格和坐标框架的小路径；没有解决未扣 sky、背景矩形、弱结构、全场配准/PSF、原四滤镜颜色或此旧 HLSP 的具体权益记录。不能凭横条边缘拟合 sky、把贡献权重当 alpha、再扣已有 SDSS sky，或假定换科学源自然消除矩形。完整源/共同 recipe 的下一小路径必须有背景与有效贡献的物理解释、源权益和有界离线处理依据；无此依据不下载全套后盲调。完整图质/发布/来源链及必要独立审查仍缺，普通采用保持关闭。
