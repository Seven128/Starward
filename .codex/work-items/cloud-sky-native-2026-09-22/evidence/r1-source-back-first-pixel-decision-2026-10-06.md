# Source Back首个完成画面与多owner输入缺口

本轮先完成唯一HSC依赖：[官方PDR3 Data Access](https://hsc-release.mtk.nao.ac.jp/doc/index.php/data-access__pdr3/)要求注册并限归档非商业科研/教育，当前取数路径退出；[FAQ](https://hsc-release.mtk.nao.ac.jp/doc/index.php/faq__pdr3/)对网站素材/hscMap图片另有展示许可及NAOJ / HSC Collaboration credit，不能泛化所有HSC素材禁用，也不据其推导任意商业app自托管归档产品已授权。[具体权利收口](hsc-specific-rights-2026-10-06.json)明确仅退出当前无具体成品权利证据的路径，不建账号/取图/外联。独立R1仍可推进，停止每轮无界换成品候选。

复用此前已完成522-input current build，19文件精确复制；68源码/300WEAPP未变。同七缓存PNG、现v2/原完整Map→spot→Sky→M104→0.4/0.15/0.4→来源Back→Map退出，实际60 Scene、消费者107请求。SkyMapper order8显示FAILED保持，本次只用它作原机制fixture；无上游新图、加工、产品变化/普通注册或构建重跑。

原Scene每次完成后只readPixels，不重放其它Scene、不写组件状态/改source资格/调度。捕获首个完成帧至第一次六格齐；额外同步GPU读回及临时RGBA arrays改变软件时序/驻留，不能用作性能收益、原设备可见时长或公平模型峰比較。最终导出截图时诊断脚本引用作用域外sharp，runner exit1；已保存首个原RGBA，后续数组未在失败前落盘。Browser/API清理读回true，原服务未重启。原失败script/log和所有输出保留，**不把旅程已结束冒整个runner或导出PASS，也没有重跑页面**。

复用原Pillow仅编码已落盘RGBA到顶行优先[首个完成画面](../../../../output/playwright/source-back-pixels-1006-r1/source-back-first-empty-recovered.png)，对应实际原Scene55/sourceIndex54，原1,316,640B不变；这不是处理巡天图片、生成替代或质量修改。[终态实际画面](../../../../output/playwright/source-back-pixels-1006-r1/software-skymapper-source-back.png)与离开来源页前每个RGBA byte严格相等。[恢复读回](source-back-first-pixel-readback-2026-10-06.json)验证首画面与终态相机/时刻相同，但有894157 channels不同：首图直接可见暗背景与选中环，尚无真实照片/星点内容；此差分不是科学精度指标或通用视觉阈值。

新[实际owner输入](source-back-missing-owner-inputs-2026-10-06.json)进一步说明不是仅来源metadata空：首Scene native sourceImages=[]、SAO supplement.points=0；终态points=809，光学/deep图像current资格有效。原SAO publication hash、reportContext、相机/时刻均一致。来源数0/0/2/5/6/6，首源码时钟至首/完整有源281.6/498.4ms，仅额外观察器下的完成记录，不能归因为一种图像或冒原设备曝光时长。其它中间屏幕像素未落盘仍MISSING，最终完全恢复不洗掉首画面缺口。

原Canvas hide会reset/release并清latest；page release使Canvas generation变化、retireDeepSkyDecode/context.dispose，原show重建revision3。已ready即时读取修复仍正确，剩余初帧在ready之前，不再循环改React快照或取消真实GPU归因；SAO在途去重已有，不能从points=0重复实现它。下一先沿原lifecycle/数据与native owner评估来源页特定往返保持有效ready数据/资源或更好的释放重建；不同上下文、失败/中断、系统后台和最终退休必须一起验证。独立Source Back与合格供给/P1分别保留。

最终GPU/decoded/request/encoded owner全部0，空索引26B；完整合规/公开采用、科学/绝对配准、native排版/DevTools/Android-iOS/新版月面、物理峰/200DAU和独审未验，普通Prepared空/HiPS关。全部33项账不改。此增量PROGRESS：商业依赖收口并第一次补真实首空画面及SAO/native共同输入缺口，改变下一修复边界；没有新增合格普通图像覆盖。

R1 来源页返回首画面恢复：HSC PDR3归档注册/非商业限制已核、当前路径退出，网站素材FAQ许可另记不泛化禁用；不继续无界换源。当前同一cached SkyMapper/v2/实际page读回60 Scene/107请求，首个Source Back完成屏幕确为暗背景/选中环，SAO points 0→809且native图像输入[]→真实images，同相机/时刻/上下文/SAO hash；来源0/0/2/5/6/6、终态严格等离开前。首RGBA已恢复，导出sharp作用域失败原样保留，其余中间像素缺证、带观察器软件时钟不冒可见时长/设备性能。下一直接读原Sources导航、Canvas hide/show/create/release、SAO返回frame与native images scope，复用此首帧反例，比较原owner内有界保留同上下文ready数据/仅来源页往返保有效渲染资源与原释放重建的整场驻留/临时峰/失败或变Context/取消迟到/系统hide/最终退休，按实证选择最简单安全方案；先小真实路径，不建平行cache/框架、扩槽/预算或跳过当前source/GPU资格，不重做SAO在途去重/已ready快照交接。已退出源只作机制fixture，不重新采用或修色/PSF/生成；合格全天/区域供给与P1独立义务保留，有具体合格新输入再核，SDK无新根因不循环。普通Prepared空/HiPS关，全部33项、完整交互/科学UNKNOWN/绝对配准/公开发布/真实DevTools/Android-iOS/新版月面/全图质/物理200DAU/独审仍开放。Goal active无预算，无提交推送采购部署外联。
