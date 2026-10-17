# SXT采用与图像加工流程更新

2026-10-09，用户决定云观星用SXT，StarNet暂不考虑；选型背景简短进入Context，NXT领取免费试用，其他插件按当前需要判断。主Goal继续暂停，本轮不全库加工、不修改普通图像注册、不发布。唯一当前状态仍在[测评与追加工作索引](image-tool-full-comparison-2026-10-08.md)。

## 已确认的选择和职责

- SXT CLI为去星主入口，PS仅在需要交互或局部修复时使用；5张同参数输出RGB一致。原生3图2x推理7.616s、staging0.224s，逐图相同工具边界17.227s；这一效率证据不包括源下载/全部审核/出版，且不能泛化为任意分辨率吞吐。
- 选型原因是已证实的可批量化、同模型PS/CLI衔接和StarNet的产品素材用途限制，不宣称SXT所有图上画质最佳。此前StarNet优先/申请许可建议退役，不继续外联。
- NXT作为可选降噪，未做质量对照，不能成为每张必经步骤。BXT官方要求线性输入，本批主要为已拉伸RGB/JPEG，暂不开；GradientX用于可识别背景梯度，当前接缝/源缺口不等于背景梯度，暂不作为默认必要工具；StarShrink对本次分星路径也无新增必要性。[BXT手册](https://www.rc-astro.com/blurxterminator-technical-manual/)、[GXT说明](https://www.rc-astro.com/software/gxt/)。

## 采用的流程与节省工作的位置

1. **批量拉原图＋一次预检**：使用原来源owner及缓存，manifest带身份/hash/权利/credit/坐标/覆盖/颜色/状态；有限并发与重试，已绑定原图不重复下载。不是先手工修完一张再考虑下一张。
2. **同类样本冻结配方**：新来源或规则才选代表；星系、星云、密星/噪声情况分组，星团单独处理。普通去星先沿已测ML11/overlap0.2；只有相对质量改善值得新增成本时采用2x/更大overlap，不能把基准参数变为全部素材的永久标准。
3. **批量初处理**：本地GPU原生多文件调用，保原图、starless、stars、工具/model/config/hash与时间。工作图保完整视野及足够展示细节；先完整图/连贯区域处理，再裁LOD。现有HiPS邻片需单独检查接缝及边界上下文。
4. **自动检查＋集中逐图快审**：损坏、漏产物、错尺寸/ICC/身份等是机器可判失败；残星、结构误删和接缝是告警/视觉判断。统一整图和关键ROI的原图/处理图/星层对照，记录通过、待修、需换源。首批逐图快审是实际需要，不意味着逐图手工加工；自动指标未标定前不声称替代看审。
5. **异常队列处理**：先归因。公共参数/规则问题按组修正，局部缺陷才用PS/蒙版，有噪声才试NXT；缺原始覆盖/错误几何回到来源owner。只重跑依赖改变的项，缓存含输入、代码、模型和配方；修复再次进入同一审查。
6. **Scene批次复验＋出版**：照片自身合格还需看实际星图里的目录星重叠、相邻区域、边缘/LOD接续和来源说明。合格子批次走原封包/发布责任，其余保留异常，不逐张新造版本或冒称整个目标完成。

用户所述批量流程是主线；新增的代表定配方、脚本预筛和最终Scene复验，分别避免整批用错规则、无效人工检查和“单图看着好但进星图有接缝”。不恢复“工具必须零缺陷才可选择”的旧评判。

## 现有可运行入口与缺口

- [原生SXT批处理及命令](image-tool-nonps-results-2026-10-08.md)，脚本`benchmark-image-tools.py --native-sxt-batch-from`，已有真实3图与逐张一致证据。此路径当前要求已绑定normalized输入，并限制在基准output；不是任意目录的一键生产流水线。
- `data-pipelines/deep-sky/image_quality.py`已经拥有全解码、hash/尺寸、部分目录/几何准入与图像异常定位，不等于SXT结果的完整自动验收。现有图片、保护层/PS、Scene runner可复用，原数据出版owner不变。
- **后续实现缺口**：把已验证SXT adapter迁入生产pipeline并迁移实验调用者；用原质量owner实现统一可追溯的复核/异常队列，连通批量来源输入及批准后的既有出版入口。仅把CLI套上一个循环、或增加本说明，不算这些接线完成。本轮只采纳并更新开发流程，未新建第二套生产管线。

## 本轮交付与激活状态

已更新外部能力短选型、资源开发流程和深空README入口。NXT零元订单在用户确认许可后实际提交成功；`rc-astro license --activate nxt`返回成功并下载官方ML3.1模型。官网重载后显示NXT为Trial、1/2激活、剩余29天；首次CLI激活回执30天，后续CLI显示32天，计数差异原因UNKNOWN，不猜精确到期日。没有付费购买/续费订阅，没有保存邮箱、地址、密码或激活码。

在现有M8 SXT输出512² RGB上实际运行NXT ML3.1、denoise0.5、iterations1、GPU，exit0且RTX3060被选中；输出完整解码、尺寸保持，98559像素变化。[脱敏状态](../../../../output/image-tool-full-comparison-2026-10-08/tool-adoption-2026-10-09/nxt-smoke-status.json)、[模型/hash/像素读回](../../../../output/image-tool-full-comparison-2026-10-08/tool-adoption-2026-10-09/nxt-readback.json)。这只是激活后真实可用性smoke，不能推成该配方画质通过或NXT组合胜出。

**新发现：vendor NXT PNG丢失ICC（输入588B，输出0B）。**后续正式adapter需复用SXT已验证的颜色空间准入、受控嵌入原绑定ICC与保存后RGB/ICC读回；在确认输入/输出数值颜色含义后补标签，不能对未知颜色直接贴sRGB。保留vendor raw，本次smoke不作为可发布图片。未追加PS插件速度或质量试验。

本轮完成工具采用、流程文档和NXT激活/真实可用性验证；[官网已激活状态截图](../../../../output/image-tool-full-comparison-2026-10-08/tool-adoption-2026-10-09/rc-license-visible.png)不含激活码/账单信息。新增13个本地引用均可解析，[文档检查](../../../../output/image-tool-full-comparison-2026-10-08/tool-adoption-2026-10-09/document-check.json)和相关`git diff --check`通过。未修改原有`.gitignore`变更。通用生产队列、自动视觉验收、NXT质量配方及全库加工未实现/未验证，不能由本记录推为已完成。主Goal保持暂停。
