# M82实际恒星逐带配准与原生PSF（2026-10-04，r86）

本代仅新增云观星任务脚本/文档及耐久Context，没有生产或其他业务源码变化。保存科学、current/fullcandidate与原三级输出未改；普通Prepared空，完整质量、采用/发布和独立审查均未完成。

## 输入、成熟责任与范围

复用十八原帧、六psField、完整fpM flags、camera CALIB/SKY参数和原科学/当前候选。现有retained-asTrans与aperture moment机制、NumPy条件线性诊断及缓存Photutils ImagePSF/Astropy Planar2D/TRFLSQFitter直接用于本次实际M82；当前PSF owner入口为 `PsfField.reconstruct`，不是历史task中的旧 `kernel` 名。库为NumPy2.5.3/Astropy8.0.1/SciPy1.17.1/Photutils3.0.0，未安装或新增生产依赖。

[一次目录获取](../../../../output/sdss-m82-registration-stars-1004-r1/receipt.json)：按六真实field的type6/mode1-2查询，保clean/nChild/mag/flags/误差全部字段，不用旧14..20/clean筛选冒完整供应。实际200/421072B/2.129s，SHA256 `f17eecefb601ab1c653548f44c890cce6c9468ca9383af846975f72a33c13269`；1341行小于获取guard5001，未重试。获取guard不是需求上限，未来截断须处理完整供应。

各field检测为4264/5/260:273、261:0、262:224；4294/6/236:345、237:247、238:252。完整母图内261条；38精确clean/nChild0检测经过实际target core/annulus资格、完整原帧/目标cut和目录邻近检测检查，20具完整支持。全部1341记录和排除原因保留。重复扫描不是独立恒星样本，未查询的星系/暗邻近源不视为不存在。

## 实际读回与影响

[实际一次执行r4](../../../../output/sdss-m82-measured-stars-1004-r4/result.json) SHA256 `a9c4fa41f8dc6878133066cb86e270e8f7e1a976c6c5bc354512f214c7309c54`：20真实星点、60逐带原帧剖面。位置相关signed PSF不重标原科学数据；原生radius12条件variance权重的PSF幅度/局部plane/centroid诊断，中心±.5原帧像素、max100，不扫shape/origin/参数。局部plane不从科学或整图扣除。

[原帧保存结果读回r3](../../../../output/sdss-m82-measured-stars-readback-1004-r3/result.json) SHA256 `8ecc1533acfc0cff9c59152d1bde7ff495797b71a9dbd7fac8a909bf52b05ff7`：所有60原帧raw/flags/原CALIB-SKY条件variance精确（最大variance差0）；直接FITS basis和位置多项式精确；独立row-first cubic spline模板、固定normal equations、保存位移模型/残差/conditional chi和target science/current moments/relative位置一致。故意转置kernel使模型最大差5.30300688，验证实际轴向错误会被识别。未重拟合/过滤候选。

| 实际指标（20检测） | g相对r | i相对r |
| --- | ---: | ---: |
| 原帧PSF诊断位置差中位（arcsec） | .054405 | .059408 |
| 原帧PSF诊断位置差最大（arcsec） | .114566 | .109987 |
| 原科学moment位置差中位（target像素） | .121043 | .123796 |
| 当前候选moment位置差中位（target像素） | .096035 | .124891 |

所有60局部fit收敛、未触中心bounds，radius3未排除native样本；conditional chi约.88–6.59。全部60目标带的moment中心有实际变化，变化并不证明true位置变准。catalog/frame共上游解，原帧拟合/局部moment仍含sky/model/PSF/blend/systematic误差；统计值不是绝对配准或测光置信。真实extended-source DCR、投影/coadd targetPSF及完整星系质量仍未验。

[10个实际分布对照](../../../../output/sdss-m82-measured-stars-1004-r4/actual-distributed-stellar-comparison.png)已查看：当前局部噪声较低，暖/彩色颗粒仍在；至少一个星点邻近扩展源在native残差中显著存在，stellar-only目录邻近判据不覆盖它。不删除该失败/不人工mask，不把fit收敛当完整品质通过。

## 失败记录与中央缺口

producer r1错误引用camera为model，r2错误引用target为wcs，r3用历史kernel名而非当前reconstruct，均task前置失败；原archive/failed/log保留。r3只产生一个target cut，r4该科学/current输出与原候选未改，不重做coadd/全域过滤。

reader r1用序列化FITS header再造target，十进制card丢失原标量精度而约1e-8pix不等；r2重建保留的原grid标量恢复精确，但FITS variable heap未在关闭前materialize失败；r3只修保存数据读取，未重新fit。原scalar grid位置严格读回，header差最大1.0590611e-8pix单独记录，没有放宽条件或改生产输出。

[原Field处理事实与资源](../../../../output/sdss-m82-measured-stars-readback-1004-r3/field-processing-and-allocation.json)：中央4264/5/261的photoStatus3、PSP_STATUS0、nStars21、psfNStar g/r/i31/47/57，与本次目录零行分开保留。复用既有官方[Field质量研究](experience-sdss-field-quality-independent-review-2026-10-02.md)：PHOTO_STATUS3为TOO_LONG，属于catalog reduction风险，不能单独判原帧坏或唯一缺行原因。PSF模型拟合星数/结构/处理关联也不替代实际中央星点。外围20样本不外推中央，不重复目录查询或旧M51矩阵。

## 资源、保护及当前依赖

实际r4总执行26.052198s、CPU 25.90625 s，含load/目录算术/局部fits/保存/hash核验；该离线Python峰working set513355776B/pagefile1276919808B，非手机/服务容量。reader未另测进程峰，保持未知。

测量前105新文件（含获取/失败任务档/实际诊断及读回）：logical9561193B/reported unique allocation9774544B，105独立ID/maxlink1、前后稳定。排除测量/docs/checkpoint、旧源/候选/工具、文件系统内部/snapshot/Linux保留；不是180GB余量、真实物理retention或全小程序200DAU混合容量。

原r85的386 currentSources、4202旧证据和六设置/outbox保护前后hash精确。原工作区/分支/HEAD、服务24040/watch18132启时保持，staging0；之后只更新Sky docs/capture与新task脚本并由r86连续性单独核。没有其他业务改动、影像获取、全域/内部/外围过滤、science/coadd/recipefit、服务重启、commit/push、采购部署或采用发布。

唯一下一由PLAN顶部控制：直接原帧成熟点源检测、跨带对应和nativePSF补中央证据；构建实际位置几何权重参与的投影/coadd targetPSF消费者后，再据证据决定必要质量处理。不得把匿名亮峰冒确证恒星、相对fit冒绝对精度，或使用泛化固定kernel/sky猜测。

原33交付义务、strictBack/WXML Canvas失败、Android/iOS与newMoon手机未验、W3暗区、完整权利/来源出版/普通static出口/物理retention/端云混合成本容量及独审缺口保。Goal active无预算，未完成。
