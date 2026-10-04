# 共享影像质量 owner：实施前只读核对

本记录沿唯一 PLAN 当前第2项，保完整质量/体验义务，不建立第二计划。当前实现、输入和历史结果分别核对；以下发现先于本轮共享 owner 实施。没有新下载、源选择、月面加工、服务/开发器启动、部署或 publication 修改。

## 现有责任

- `data-pipelines/deep-sky/publish_allwise_w3.py` 的 JPEG 检查只证明格式/尺寸和非恒定极值。`test_publish_allwise_w3.py` 保留真实饱和 JPEG 仍通过该检查的反例。科学 coverage 未知不能由这一步改成完整。
- `allwise_finite_tan.py` 已负责 hash/receipt 绑定、完整 FITS 数组、HiPS/TAN、三档 RGBA、编码后 alpha 回读和不可变迁移。M42 新 PNG 仅非有限采样透明；有效纯黑仍是有限数据，alpha 不认证伪影或曝光深度。
- SDSS 五目标 acquisition/publication 目前在任务脚本，合同 `sdss-optical-publication.ts` 统一绑定六出版 hash/尺度；BFF `sdss-optical-imagery.ts` 校目录中心和原 JPEG 字节，Mini 复用 native 图片、TAN、GPU、已绘来源。对象身份是数据，无需逐对象绘制函数。
- 当前不同范围的独立档位不是一张完整高分辨率母图的同色金字塔；M42 三档独立拉伸切点不同，重叠颜色连续性仍须实测。不能在缺少完整高阶全范围输入时声称构造了完整高清母图。

## 实际查看和未决

已查看本地原图 `workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-overview.jpg`，以及保存的实际生产软件 GPU `output/playwright/cloud-sky-wide-resource-composition-1002/optical-coarse.png`。后者是 M51、2026-09-30T04:00Z、0.25°，历史夜空黑底成品在蓝色太阳环境上仍呈明显有限矩形/过渡带。旧加法叠光、目标 W3/光学混色及硬边分别已修；现有 source-over/8%边缘淡出不能认证本代矩形相容性或质量完成。增加淡出会衰减真实外围，不得把显示 taper 当科学 mask。

M51 亚像素原点沿 `c-sdss-catalog-registration-2026-09-25.md` 未闭合：七颗星反求中位(255.664,256.578)，不提供精确服务端 WCS，不猜偏移。18张合法 SDSS JPEG仍是原成品，暂无配对原始g/r/i数组可供本轮无损多带重加工。

已查看 `output/playwright/cloud-sky-current-deep-field-effect-0930/M-82-3-0.05.png` 的暗斑。`output/allwise-w3-m82-source-0930/source-overlap.json` 保细档6源仅3个有效、157536有限/19非有限/104589输入未知；19非有限对应旧JPEG灰度242–255，不能把暗斑认作这些孔。`candidate-detail/candidate-result.json` 第4源504后停止，levels为空；3份数组完整、3154368B，末尾2624B padding不足与科学数组截断分开。不得发布猜测mask、补黑洞或用AI造结构。

## 本地完整路径和最小实施

可复用 `output/allwise-w3-hips-0929/candidate-axes-corrected/`：M42完整20源、21029120B，当前已出版4°256/2.25°512/0.9°512，PNG 41082/124865/145243B，非有限样本22/648/5095。当前51对象的150张W3 JPEG、3张M42 PNG以及18张SDSS JPEG一起消费公共报告；旧153JPEG和旧offer继续可读。六对象/51目录不作为需求上限。

新增公共离线质量报告与结构准入，接现有 publisher：绑定实际原字节、来源、对象、几何/场幅、像素、WCS和处理；完整输入/错hash/尺寸/范围有客观拒绝理由。亮暗、饱和、条带、边界、清晰度与目录范围只产可审查指标/异常，不把主观阈值包装成科学质量通过。未知输入与已知非有限、有效纯黑分开。用完整M42重建回读、新mask缺源拒绝以及全部现有成品批处理验证，保 publication/原图/旧客户端字节不变。

Python环境实查：本机 launcher仅注册3.10，非本次科学依赖运行时；复用Codex缓存CPython3.12.14及任务已有Pillow12.3.0/NumPy2.5.3/Astropy8.0.1，import实际成功，无联网install。原requirements保持。共享报告和结构通过不关闭清晰度、配准、M51/M82、普通原生/手机、整场资源/200DAU容量或最终验收。PS1/SkyMapper/DSS/ESA等现有商业排除保持。
