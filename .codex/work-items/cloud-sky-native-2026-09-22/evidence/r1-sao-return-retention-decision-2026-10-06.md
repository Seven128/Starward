# R1 SAO返回数据恢复与影像首画面剩余缺口

当前决定：修复原SAO单当前视口CPU owner在隐藏后丢失ready瓦片及重新测量前交接的缺口；原Canvas/GPU/native-image释放不变。不能把数据恢复当可见空白修复。

原Hook以active为owner寿命，来源页hide就dispose，首Scene输入0点；现hide只pause并abort未完成请求，保原6MiB限制内已加载当前集合，返回重新按原wanted选择/当前观测几何解析。索引丢失/换代（包括同hash新file capability）或unmount仍dispose，失效及迟到回复不进入新owner。尺寸归零的Canvas重新测量阶段不清理ready集合或泵旧请求，已验证source rows经当前geometry转换，由原Scene当前投影、星等/晨昏及裁剪决定绘制；已测得的新视野先过滤当前selection，避免effect前沿旧视野瓦片。数据预算/请求数未增，无新cache、dedup、序列化或source/GPU资格绕过。

## 实际读回

[结构化读回](sao-back-retention-readback-2026-10-06.json)：原实际page/Scene/Source Back，62 Scene/108请求，首回程809点而上一代0，整次Back无SAO load；同原publication hash/相机/时刻。来源页保4瓦片809rows/118685B原JSON字节量；整场最大422236B/2891rows、最多3在途；最后CPU owner、encoded/租约/请求/native/GPU活动归零（逻辑FS仅26B空索引）。源字节/rows与GPU/encoded模型不是JS/native/driver物理内存，不能与不同时间MAX相加认证200DAU。

实际0.4°M104视野首帧disc提交0，仍只有暗背景和选中圆环：[首帧](../../../../output/playwright/sao-back-retention-1006-r3/source-back-frame-56.png)原RGBA与旧空白反例严格同hash。六个完成帧原RGBA/PNG现在全部存下，实际来源0/0/2/4/5/6（最终再6）；[首个完整影像帧](../../../../output/playwright/sao-back-retention-1006-r3/source-back-frame-61.png)。终态严格等离开前和上一代终态。原照片矩形/底色/完整图质FAILED不变，SkyMapper退出配置仅机制fixture。SAO宽视野真实可见收益尚缺，本窄视野用户可见首画面仍FAILED。观察器GL同步/数组及软件时间不冒目标运行时可见时长或公平性能比较。

## 检查与保留

两个原缺口的检查先失败；实际r1保住ready809却首Scene仍0，另补Canvas尺寸归零和effect不应update([])的失败前回归，最终15影响检查/项目自身TS类型通过。首次误用根目录TS6的baseUrl弃用错误保原，改用小程序自身TS5.9的既有命令后通过；未改编译配置。任务初sharp裸import在boot前失败保原，复用已装bundled sharp后实际两次旅程自然完成，无安装或因观察超时重启。r2仅构建，未运行；全部原错误/产物保留。

源码变化后一次plain WEAPP构建通过、产物275文件已保存；发现命令默认生产模式，于是一次任务owned开发watch首轮完成后立即结束，只恢复原开发配置。当前live WEAPP300文件，仅common.js、Sky detail JS/map和Sky sub-vendors四文件不同；既有watch3432/BFF24040/IDE13736保持同进程。编译不是DevTools页面或Android/iOS验收，SDK未知无循环重试。无新观测图下载/加工/源出版，无普通Prepared/HiPS采用，无提交推送部署采购外联。

当前唯一下一依赖只由[PLAN](../PLAN.md)维护：R1 来源页返回真实影像首画面：SAO原owner有界ready数据返回已补，当前62 Scene/108请求首帧809真实点、同hash/相机/时刻，来源页保4瓦片118685B且Back零SAO load/卸载归零；原6MiB/3请求不增。0.4°当前视野无SAO disc提交，首RGBA仍严格等旧空白，native图像输入[]，真实影像来源0/0/2/4/5/6/6，终态与离开前/上一代严格同像素，故用户可见空档FAILED未闭合。下一沿原Sources导航/Canvas DOM mounted及hide/show/create/release/native images scope，小真实路径比较只在来源页往返保有效Canvas/ready图像与原释放重建；先核当前native节点有效性/后台与系统hide/导航失败/换Context/取消迟到/最终退休，量整场驻留及同时临时峰，再选最简单有界方案，不留旧截图冒当前帧、不建平行缓存/框架、不扩预算或跳过贡献资格。SAO宽视野首帧可见收益尚缺，不冒本窄视野改善；既有SAO在途去重/ready交接不重做。Q1合格全天/区域成品和P1真实DevTools仍独立，有具体新证据再推进；已退出SkyMapper仅机制fixture，不恢复采用/修色/PSF/生成或无界换源，SDK无新根因不循环。开发WEAPP已按原模式恢复，普通Prepared空/HiPS关。全部33项及完整交互/科学UNKNOWN/绝对配准/公开发布/真实DevTools/Android-iOS/新版月面/全图质/物理200DAU/最终独审仍开放。Goal active无预算，无提交推送采购部署外联。
