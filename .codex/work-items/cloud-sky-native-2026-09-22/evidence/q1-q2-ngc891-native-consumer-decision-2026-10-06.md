# Q1/Q2：NGC891完整成品的实际page/Scene决定

**当前整幅配置不采用。** 已缓存 NOIRLab `iotw2023a` 可以沿现有读取、分级、HTTP/file/cache/Hook/Scene 和来源返回消费；实际概览仍有明显倾斜照片边框与照片星点密度断层，连续背景及完整外围要求 FAILED。普通 Prepared registry 仍空，合格覆盖增量为 0；未进入正式静态发布消费者，不以来源/退休成功代替图质。

上一阶段[原供给决定](q1-ngc891-source-route-decision-2026-10-06.md)保原：PS1 已发现 057/067 两单父片各裁掉已知目标，彩图未取、图质未验。此次仅消费已完整取得的同目标 NOIRLab 成品，没有重取 PS1、旧源或月面，没有改源像素、生成 alpha、抠黑、feather、调色、删星、PSF 或巡天框架。唯一下一依赖由[PLAN](../PLAN.md)控制。

## 冻结来源及最小处理

复用[原 JPEG](../../../../output/noirlab-ngc891-finished-readback-1006-q1-r1/iotw2023a-publication.jpg)，4000×3154、3,570,760B，SHA `d8781cb70d187ffa1baf80304f379658bb785a2d1806c62893ba9ce5d0491fcb`；原 XMP 9,457B、ICC 3,144B 均保持。ICC 名称读回为 IEC 61966-2.1 Default RGB colour space - sRGB；未作色域转换。具体[NOIRLab 来源](https://noirlab.edu/public/images/iotw2023a/)及[政策](https://noirlab.edu/public/copyright/)与原嵌入完整信用保持，CC BY 4.0、历史 U/B/R/H-alpha 编码复合含义如实披露，不冒定标 RGB、实时肉眼外观或别的机构资产权利。

现 `prepared_rgb_observation.py` 与 `publish_prepared_native.py` 不变。先对冻结原图作一次完整准入，再由现 producer 完整解码一次并作整幅 Lanczos JPEG q92/4:4:4 分级，保 ICC；不重复科学重投影。检查/producer 总约 1.071s，其中 producer 约 .529s，只是本机该次离线时间。旧 NGC6752 writer 报告 KeyError 不重现或覆盖；此次直接从真实生成 manifest 读回 levels。

|档|整幅尺寸|JPEG 字节|
|---|---|---|
|OVERVIEW|512×404|87,988|
|MEDIUM|1024×807|266,277|
|DETAIL|2048×1615|939,443|

三图合 1,293,708B，条件 publication hash `fa0dbe86242e866151bea9fa8299e43b3e5c5a77b19a4e05f5eb3e3cf8a5bc35`。2048 是本次配置，不是原图或需求上限。独立 `REGION:noirlab-ngc891-field` 保整个照片矩形，不伪装已加入普通 NGC891 天体检索。49 个含外像素边界的方向，成熟名义 WCS 逆回最大 2.690e-10 源像素，现 native plane UV 误差最大 1.604e-12、方向差 0；这些不认证绝对配准、科学支持、曝光质量或完整星系外边界。

输入、处理和读回见[inspection](../../../../output/prepared-ngc891-inspection-1006-q1-r1/publication-result.json)、[producer receipt](../../../../output/prepared-native-ngc891-1006-q1-r1-generation/producer-receipt.json)、[名义平面](../../../../output/prepared-ngc891-readback-1006-q1-r1/nominal-plane-result.json)。本轮新增外网取图为 0。

## 完整现page路径及实际画面

复用上一条件消费者的任务副本，只替换冻结 profile/checkpoint/import。现完整 Map → 正式 spot → 云观星的 Taro/React/Query/官方 WEAPP 逻辑 JSX、现 backend 173 源码和 frontend 515 源码绑定前后均相同，产品源码 0 修改。只建一次该新输入的软件 page 图，**不是原 WEAPP watch 构建**。原 IDE/watch/BFF 未重启；本次隔离 loopback fixture backend 和软件浏览器在退出中关闭。

真实 v3 BSC 的最近星 HR 687（5.82 V 等，距名义 NGC891 中心约 .954°）经公共检索定位，再用现 Canvas touch drag 对准区域；不是设置相机或伪造星系身份。三档公开缩放视场约 .750886°/.375443°/.168949°。98 次 loopback 请求、61 次实际 Scene；每档图像只收到一个完整 200 body，并与现服务实际字节/hash一致。暖概览→细档无新增 encoded body，7 个已完成暖帧全部持真实 Prepared 来源、null 0；回细像素差 0，来源 Back 像素差也为 0。原始双精度 FOV 差 2.776e-17 另保，不能拿 float32 相等改判历史 strict 失败。

实际保存的 390×844 软件 GL 图已查看：

- [概览](../../../../output/playwright/prepared-native-ngc891-page-1006-q1-r1/software-native-overview.png)中照片四边及密星边界十分明显；盘端、尘埃带和照片内的弱晕结构可见，但照片外是稀疏模型星空。
- [中档](../../../../output/playwright/prepared-native-ngc891-page-1006-q1-r1/software-native-medium.png)仍有上、下照片边界。
- [细档](../../../../output/playwright/prepared-native-ngc891-page-1006-q1-r1/software-native-detail.png)保有盘、尘埃与背景星；视口进入照片不能认证完整外围或消除概览失败。

三次已绘 catalogue 对象分别 1/0/0，概览的 SAO 38001 位于照片外，照片内重叠对象 0。该事实只限这些真实已绘帧，**一般照片/目录星重复仍未验**，不授权删照片星或关目录星。三帧 Galactic display 提交为 false、filterStrength 0；低分辨率 Mellinger 角色不补该窄视场的观测外围。原几何 alpha、有效黑、编码 RGB 最大通道显示贡献及科学 UNKNOWN 分开，照片边框不能误归“不透明覆盖”。完整字段见[实际照片与目录边界](../../../../output/prepared-ngc891-readback-1006-q1-r1/actual-photo-stellar-boundary.json)。

公共来源页显示完整原 credit、具体许可/政策链接、历史波段、处理与 nominal TAN/science UNKNOWN；来源 Back 回原页面/同相机、无再取三图。最终地图返回保原 spot；最后 encoded entries/leased/bytes/reserved/running/pending/retired、请求、活动 decode、GPU texture/buffer 模型均 0。来源文字、暖时序及退出原回执保在[完整 page 输出](../../../../output/playwright/prepared-native-ngc891-page-1006-q1-r1/result.json)。

## 退出与剩余义务

[最终读回](../../../../output/prepared-ngc891-readback-1006-q1-r1/result.json)记录 `FAILED_PHOTO_RECTANGLE_AND_STELLAR_DENSITY_BOUNDARY_UNADOPTED`。本次较暗延展星系再次证实孤立整幅照片配置的同类断层，不再靠另一孤立照片、同图颜色小修或 viewport 裁框重复该机制。下一沿已有 PS1/SkyMapper/CDS 候选，优先核具体成熟观测彩色 HiPS 的合法供给、几何与一份连贯区域小样；候选与采用仍严格区分，不先建通用框架或开启生产。

软件资源模型 GPU texture 峰 21,339,288B、decoded RGBA 等效峰 18,194,432B，来自各自时刻；不能相加成物理峰、手机性能或 200DAU 容量。源磁盘保存量、loopback body 与公网账单也分别保。原 33 项、历史第三 source-null、strict 失败、完整弱外围、绝对配准、科学支持、Android/iOS、新月面、独审 MISSING、真实部署引用与全机物理容量未关闭。本轮 SDK/DevTools 截图/外网下载/正式静态导出/提交/推送/部署/采购/发布/外联均 0，Goal active 无预算。
