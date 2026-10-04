# M51 官方科学输入有界检查：来源候选未采用

## 决定及权利边界

显示曝光不能消除照片底后，检查同一 M51 观测的 [MAST HST/ACS HLSP](https://archive.stsci.edu/prepds/m51/)；没有恢复 DSS、Gaia/ESA 银河、PS1/SkyMapper 或重启运行时选型。官网产品表中的 DSS 背景示意图不在取得/加工范围。原 heic0506a 的 ESA/Hubble CC BY 4.0 许可不自动覆盖 FITS。

[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)区分公开数据、部分 CC BY 4.0 HLSP 与受限制的 DSS/GSC。这里据官方公开政策进行有界研究，并保作者/MAST 来源；M51 旧产品页/README 未单独标注具体许可桶。公开政策没有把它列为 DSS/GSC，但“多数数据”不是所有数据逐项许可证明，不能虚填这一产品已绑定 public-domain 或 CC BY 的确定身份。商业加工/成品展示分发的具体记录和完整署名仍须在采用前闭合，无外部联络、采购、公开发布或默认登记。

## 真实元数据和模型差异

复用缓存依赖 Astropy 8.0.1；没有安装新库。[元数据脚本](../scripts/inspect-m51-science-metadata-2026-10-03.py)取得一次官方 [README](https://archive.stsci.edu/pub/hlsp/m51/h_m51_v1_rdm.txt)、政策和产品表，并读取六份 B/V/I 科学/权重 FITS 前 28,800B。初界内均未发现 END，保存不完整失败状态。[R1 结果](../../../../output/m51-science-metadata-1003-r1/result.json) SHA256 `076cdb4adf7d53d686c9bd1aae5235babf716267bfef796f31433612d87c7e8b`。一次初始缺 Astropy 的启动失败发生在输出建立前，随后复用已缓存依赖，不重复环境安装排查。

[补头脚本](../scripts/complete-m51-science-headers-2026-10-03.py)复用这些前缀，只请求剩余区间；强 ETag / If-Range、206、精确 Content-Range 全部一致，按 2880B 块在 END 所在块停止。实际新增 648,000B，六个主头完整；科学头 141,120B、权重头 132,480B。没有数组下载。R1 随后的“六头同 WCS”假设断言失败并保留 records/headers，不称整体成功。

[缓存头离线分析](../scripts/analyze-m51-cached-headers-2026-10-03.py)没有网络，逐字节复用完整头，得到 [R2](../../../../output/m51-science-headers-1003-r2/result.json) 19,695B，SHA256 `8f8a9ca6d5ec22776be2f4e1f929d357225b608f2a247471774d891b8109d244`：

- 六数组都是 8600×12200、BITPIX=-32，比例约 0.05″/px；科学头保留未带 `-SIP` 后缀的 SIP 项。按 [Astropy 官方说明](https://docs.astropy.org/en/stable/wcs/note_sip.html)对已校正 drizzle 产品做内存副本去 SIP 的诊断，不改源头或采用修正。五点抽查中，直接应用遗留 SIP 与纯 TAN 相差最多 B 76.791″、V 77.461″、I 69.898″。
- 纯 TAN 同像素抽查：V/I 相对 B 最大 0.078576″ / 0.052210″；三权重头相对 B 科学头最大 1002.287″。这是头模型差异，不是实测星点误差；不能独立按权重头重投影，也不能假设整数组同索引配准已通过。
- README 明确未扣 sky、内部相对配准且未绑定外部天体测量标准；当前背景不得视作已清除。科学头 BUNIT 写 ELECTRONS，而 drizzle 输出记录全部 `cps`，README 对输出另说明每秒电子；不能仅凭 BUNIT 再除一次曝光。权重参数为 EXP，不能从叙述中的 inverse variance 外推其最终值为置信度。保留完整原说明/头，采用前还需正确单位、配准与权重语义。

检查六头无 BSCALE/BZERO/BLANK，NAXIS=2、NEXTEND=0，故本次横条按原 big-endian float32 字节读取；不把有限值当科学质量完整。低分辨率 block-average 产品在原说明中用于 quick-look/教育，不作为科学分析输入。

## 原数组横条及恢复

[横条脚本](../scripts/sample-m51-science-strips-2026-10-03.py)在六个原分辨率数组分别读取零起点 y=0/1536/6092/10648/12184、各16行整宽。通过已绑定完整头计算数组偏移，强 ETag / 206 / 精确范围和长度限定每条 550,400B。总计 16,512,000B，仅各文件80/12200行，约0.656%；完整数组/全文件 SHA 未取得，不能宣称完整科学源准入。

R1 的29条通过、一条 I science 尾部横条发生 TLS EOF，保留原 receipts 与 exit1；[R2](../../../../output/m51-science-strips-1003-r2/result.json)先核29条缓存身份/范围/hash，只有该失败条新增一次请求，550,400B，未重复下载成功条。R2 79,879B，SHA256 `3f99e67d8819a138f128a1ba76e6c78a2b57618ab832a44a909e8cc22c4bb744`；原/旧证据、六头、脚本/运行模块和保护文件前后同字节。

外侧两横条在所有波段权重/科学值均零；三个内部横条每条约129k正权重样本，在该集合没有非有限科学值，有13个负科学值。零权重位置合计有573个非零有限科学值，不能自动抹掉或把权重直接变 alpha。各波段实际支持边缘不同，内侧边缘科学中位仍为正且随位置变化：B约0.0185–0.0223、V约0.0326–0.0425、I约0.0643–0.0804（单位解释仍沿前述冲突限制）。这些不是 sky 估计，可能含真实天体/噪声；不据此建立常量黑点、空间背景模型、颜色或有效掩码。

实际字节可复核的例子：B 科学 y=6092、x=243 值0.023603493，而同索引 weight=0；下一像素 science=0.012739807 / weight=0.560358226，再下一像素 weight=338.378265。中部横条另有连续2–3个零权重非零科学边缘。这个现象不是仅由 float 精度近零的统计判断，不据此猜是 writer/配准/核扩展中的哪一种原因；原值和UNKNOWN保留。

## 成本、下一依赖及未验

六完整文件由 Content-Range 得到合计2,518,914,240B；单个 float32 完整数组419,680,000B，六数组2,518,080,000B，尚不含 mask/reprojection/RGB/临时存储。当前只花约16.5MB数组载荷及少量头/文本；它不等于实际网络计费、RSS或产物容量。没有下载全套、重加工旧母图/LOD、部署服务或改默认。后续若完整取得，须先明确共享 recipe 如何解释上述单位/权重/几何、如何保真实暗结构/边缘和有界离线处理，避免先取得2.52GB再盲调。

本次只查B/V/I科学输入，原 heic0506a 合成还含Hα+[NII]。B/V/I不等于复原原照片的颜色/结构全部贡献；若共同处理实际需要第四滤镜，其额外源与权重、处理及资源另计，不把三波段试查当需求上限。

本次否决“换 science 即自然解决背景”“各头可直接同 WCS/各自投影权重”“EXP即inverse variance”“零权重即透明”的无依据捷径。B 后续沿实际共享源准入/配准/覆盖边界推进，按需要选择有证据的完整源小路径或复用现有已校准源；无源解释不采用新 mask/扣 sky，不再循环旧显示矩阵。已有 SDSS、Prepared 发布/缓存/失败保粗仍保持。普通 Prepared registry空，M51矩形FAILED、M82 OV/MED不足、原生/WXML/新版月面/Android+iOS/独审及200DAU整场成本容量均未闭合。

更新来源 Context/唯一 PLAN 后，`npm run context:validate` 通过，仅核 manifest 路径/声明，不能认证 Markdown/科学事实。影响范围 `git diff --check` 通过（既有 CRLF 提示保留），分支/HEAD仍为指定身份；源码未变，不重复 TS/生产回归/整场GPU矩阵。恢复检查点另绑定本代证据、任务脚本、六项保护文件及当前进程，保缺独审/目标证据；不以本轮分析成功结束 Goal。
