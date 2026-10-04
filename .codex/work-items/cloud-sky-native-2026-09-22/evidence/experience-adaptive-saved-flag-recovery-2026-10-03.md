# 最新共同孔径候选复用有效扫描替代

沿[唯一PLAN](../PLAN.md)和[实际halo父候选](experience-real-halo-perimeter-refinement-2026-10-03.md)，本轮只将已qualified、已保存other-RUN替代接到最新父显示结果，未重复原跨run/13k恢复矩阵、861秒整幅过滤、源下载或拟合。普通registry/default/发布未采用；整体图质NOT_PASSED，独审MISSING。

## 共享恢复责任

`sdss_display_recovery.rebase_saved_other_scan_display`复用旧 `OtherScanDisplay`及保存执行snapshot，调用现有adaptive与recovery资格守卫而不重绘旧PNG；核外部pin、原源科学/availability/recipe、目标、供应数组和原执行report，再按规范JSON核当前source snapshot的实际frame/native/model/CALIB-SKY/fpM/epoch/projected/共同几何权重与原保存值精确。源码变化独立记录，不用当前code替换原执行证明。新入口没有源投影或filter。

只用旧已admitted supply且当前qualified=false的中心替换，保三带共同真实零/负/正值、当前已qualified/强结构及全部不相关结果。旧single/mosaic恢复入口仍保，数值LOD/守卫共用；取消返回无半成品、不变父数组。显式新版本`sdss-adaptive-other-scan-flag-display-recovery-candidate-v2`绑定当前baseline估计/四诊断、旧供应report和执行canonical pin、当前源输入hash/实现环境，区分旧供应扫描贡献/53拒绝和当前应用统计；不把旧processability、旧stencil峰值当新父或本次成本。

相同来源snapshot只核其数据责任，旧filter政策/旧code不伪装成当前adaptive算法；具体rights/信用/加工说明、完整出版packet和epoch/PSF/弱结构仍未认证。caller外部pin须来自已核执行证据，而非凭新生成pin授权任意供应。

## 实际失败与修复

首次完整[r1](../../../../output/shared-adaptive-flag-recovery-1003-r1/failed.json)在候选写入前因`source_inputs_changed`退出；当前内存相机identity元组与原保存JSON列表直接比较造成误拒绝。保[原执行代码](../../../../output/shared-adaptive-flag-recovery-1003-r1/executed-script.py)、源码snapshot和[解释](../../../../output/shared-adaptive-flag-recovery-1003-r1/failure-explanation.json)，不改判成功/不覆盖旧输出。改用现有canonical JSON责任，fixture实际保存/读回JSON后验证正常准入；真实日期、flags、原生模型或归一化但变化的几何权重仍拒旧供应。bounded guard-removal mutation复现日期变化仍应用过期供应，当前守卫拒绝。

受影响六套35项通过（saved recovery5、旧recovery8、provenance6、real halo5、adaptive master4、science pyramid7）；初次新测试误用`field_weights`、随后破归一化的异常预期不对，均修fixture，未改生产约束。开发检查不是独审或完整画质/设备验收。

## 完整实际消费与保存读回

[r2实际消费](../scripts/experience-adaptive-saved-recovery-r2-2026-10-03.py)复用18已缓存frames/fpM/CAS、2048²原science/共同weights及冻结recipe；外部pin核旧candidate/processing-inputs、当前real-halo候选和原18 actualPS_ID/recipe守卫收口。原source/native/epoch/weights精确后，13,323供应全部仍位于当前未qualified区域；无新投影、filter或请求。全部供应值与旧admitted数组精确，其余4,180,981目标逐带与最新父结果精确，53 native/SKY缺口继续保父，原science与六保护pin保持。旧5.6281%多扫描覆盖和53原资格分析不重跑，也不外推完整图。

[r2结果](../../../../output/shared-adaptive-flag-recovery-1003-r2/result.json)：3,961B，SHA256 `ecd3a6446bcdbb8a644dc9f6da7d18e160a339d0498e2336c1e659f262d88baa`。candidate SHA256 `e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235`。恢复wall 1.511s/CPU 1.516s；含缓存准备/资格/保存/校验wall 15.073s/CPU 14.984s。Windows Python峰值working set 1,315,782,656B含源、mmap页、父/旧供应/新数组与库；仅本机离线，不是客户端/服务或生产容量。不是重新推算全链/退休资源。

[独立数值路径读回](../scripts/readback-adaptive-saved-recovery-2026-10-03.py)仅消费保存数组/JSON，未导入生产filter/recovery helper或重新投影：canonical source/旧执行/当前父四诊断谱系精确，signed均值→冻结Astropy RGB三级PNG逐像素及原alpha精确。OVERVIEW/MEDIUM/DETAIL对当前父RGB改变1506/2061/629。[结果](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/result.json)：9,455B，SHA256 `9d3d304186cc015d1277a98cb5137dcfb4b66f277c1a9ecc35ca65b11e6744fd`。新候选8文件logical 56,006,499B，未新增物理库存扫描；比父少诊断文件不证明链磁盘节省。当前谱系仍引用父诊断、旧供应与源，不能据此删除旧版本或升级Linux180GB容量结论。

已查看[完整三级父/新对照](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/actual-full-lod-pairs.png)及[供应密集实际块](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/actual-supply-dense-pairs.png)，后者由固定128块中供应数量最多者决定，[512,768,640,896]内839已admitted，源/父/真实替代并列。实际多数中心暖底/绿色结构未改，替代也保观测颗粒，不宣称其他波段/曝光/PSF与时变完全等效、完整背景/弱结构或去绿通过。[root自审](../../../../output/shared-adaptive-flag-recovery-1003-r2/readback/visual-self-review.json)非独审。

## 当前下一依赖

共同孔径→真实外侧支持→有供应known-flags恢复现已在最新完整保存候选接通。下一项按PLAN核当前仍未解决的背景/弱结构/绿色晕圈及完整配准的实际来源支持，先复用已有源/PSF/处理资料找材料缺口和可用成熟责任，不能用颜色或恒星目录替代扩展源逐像素PSF/DCR/被扣模型。当前谱系进入完整加工来源packet、质量/信用/权利/加工说明和必要独审可审查后，才接正式批量出版。无需重做当前已闭数值/孔径/跨run/边缘矩阵，不拟无依据参数循环/全图去绿/新设施。

HST M51矩形FAILED、M82完整输入不足、普通registry空、DevTools WXML/Canvas FAILED_DEVTOOLS、手机/新版月面/Android-iOS、实际page/SourceBack及生产200DAU混合容量继续开放。原工作区/分支/HEAD、服务watch和六保护保持；没有提交/推送/云部署/发布。
