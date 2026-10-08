# 连续区域批量筛查与代表小样决定（Legacy / ZTF）

当前 DR10/DR9 color 的 M87 两档小样 **FAILED，停止该配置扩批**。连续巡天内部区域消除了这两份预览中的透明缺口和孤立照片外沿，但原始瓦片已有明显底色块、条带，不能靠再次采样或调色解决。

复用缓存 MOC、固定 OpenNGC 目录、现有 TAN 与 HEALPix owner；[唯一批处理入口](../scripts/inspect-legacy-regions.py)一次筛查52行的0.4°/4°视口，共104档，76档所有65536个采样中心均落在名义 MOC 内。该统计仅供选择小样，不证明完整 footprint、图质、科学支持或发布资格。上一轮 NGC891/45°配置不重开。

只取代表 M87 两档共8份原始 PNG，HTTP200、零重试，合计3,213,271字节。两份512²预览按现有 HEALPix 像素原样采样，没有调色、抠黑、feather或生成细节；alphaZero/opaqueBlack均0。4°图仍有明显绿色矩形底色块；0.4°图有紫色横带经过目标核心。直接查看原始 Norder4/Npix1735 和 Norder7/Npix111063，分别确认已有底色条带/斑块和同一紫色条带，因此不能归因成新的 TAN 采样器缺陷。

输入、图像、原瓦片、收据与验收账的字节绑定，以及最终决定在 [批次决定](../../../../output/legacy-region-batch-2026-10-07/batch-decision.json)。处理时初始 JSON 的 PENDING_VISUAL_REVIEW 只表示加工当时尚未目检；本决定是本批最终图质结论。原文件、失败收据和入口全部保留，其余102档图质 NOT_ASSESSED，不将单样本失败外推全源。没有发布、普通采用或扩批。

当前缺口是合格连续背景和高清供给本身。没有能改变该失败的新输入或方法时，不重下、重加工或换同类矩形照片；按唯一 PLAN 转独立 P1 实际窗口验收。普通 Prepared 空、HiPS 关、低分辨率 Mellinger DISPLAY、科学 UNKNOWN，以及全部33项和既有 FAILED/UNKNOWN/MISSING 保持。

## 新独立输入 ZTF DR7 color，已停扩批

发现此前未评估的成熟彩色巡天：CDS/P/ZTF/DR7/color，官方[服务记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FZTF%2FDR7%2Fcolor&fmt=html&get=record)声明ODbL-1.0、CNRS/Unistra、public master clonableOnce，RGB分别ZTF i/r/g；[IRSA公共数据条款](https://irsa.ipac.caltech.edu/data_use_terms.html)公共数据无使用限制、DSS例外。此次仅有界研究取样；数据/成品数据库/API权限、原ZTF/IRSA署名和ODbL加工分发义务仍分开，不从网页公开泛化其它产品或宣布发布资格。四份具体properties/MOC/record/terms实际HTTP200并保存，未全库镜像、外联或采购。

复用唯一script，增加两个固定source preset，不建立任意URL框架或新版本脚本；legacy输入和全部原失败图不动。ZTF一次52行104档名义筛查，83档65536中心均落MOC内，20.135s。直接properties比例0.7226、record0.7332不同；实际MOC面积约0.7332134，仅按实际空间MOC计算，不把任一声明当完整footprint/三色band/science/图质。M87宽档54中心落外，入口在下载前拒绝，零M87图；选择两个档均名义覆盖的M31作为弱外围/连续区域代表，未降低覆盖guard。

两档共9原瓦片 **5,330,389B**，HTTP200、零重试；原HEALPix/TAN原像素采样，未调色/遮边/PSF扫描或生成细节。宽档10.656s、alphaZero4427/opaqueBlack1815；细档12.626s、alphaZero21/opaqueBlack34，黑与alpha不改名成科学缺测。实际宽图明显矩形亮度/色块、网格缺口穿过M31；细图青色宽交叉带穿核心、白色显示核心及色阶跳变。直接查看原Norder4/Npix166、Norder7/Npix10495、Npix10836确认同类色块/青带和核心显示异常，未归因成新重采样缺陷。

**FAILED_SOURCE_MOSAIC_GAPS_COLOUR_AND_CORE_STRIPES_STOP_EXPANSION**：当前DR7彩色配置不扩批、不出版、不采用、不重复无变化加工；其余102档图质NOT_ASSESSED，不外推全ZTF或不同版本。输入/原片/加工时PENDING/最终决定及不变33项账在 [ZTF批次决定](../../../../output/ztf-region-batch-2026-10-07/batch-decision.json)。新source选择往返有一次离线检查，正确恢复原Legacy固定输入；没有重跑原Legacy加工/矩阵。完整连续背景和高清供给缺口保持；下一只按PLAN，有新决定性输入才重开。

同一sample入口现增加最终FAILED决定guard：两source均在lookup/transport前拒绝，离线检查零网络/零图像加工，见 `output/ztf-region-batch-2026-10-07/closed-source-guard.json`。当前脚本与当时决定脚本pin分别保留；不重写历史PENDING/失败图，只有新的决定性输入才另作当前输入决定。
