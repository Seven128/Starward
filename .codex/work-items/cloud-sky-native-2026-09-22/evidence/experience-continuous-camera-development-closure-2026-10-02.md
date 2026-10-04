# 同 Canvas 转向、缩放与返回：本代开发读回

唯一 PLAN 的同 Canvas/稳定报告引用资源依赖已取得一条有限开发证据。原十二态在真实共享相机、完整十三个图片 Hook、公用压缩文件 owner 和同一组 HTMLImage→软件 WebGL 中执行；每态先等资源就绪再提交两帧，期间没有 consumer-null/control 插入。它不代表连续动画、手势、首屏延迟、帧率或目标 WEAPP 验收。

实际输出 [r1](../../../../output/playwright/cloud-sky-continuous-camera-resource-1002-r1/result.json) SHA `5c9aa0fd01e6ec24a94168b8183f08ef40f4a30e0df3e28e7dab1aca9f250cdc`，作者记录见[本代观察](experience-continuous-camera-resource-journey-2026-10-02.md)。[独立读回](experience-continuous-camera-resource-independent-review-2026-10-02.md)核完整 PNG/RGBA、实际纹理身份账本、准备/浏览器源码与真实输入、相机/渐隐/身份及最终释放；未发现该路径内需修复的生产问题。旧报告、其他路径和质量失败不升级。

Root 另自行解码十二张全幅 PNG 并比底向 RGBA，逐次重算二十四正常帧与最终退出的 texture-ID 分配/复制/删除，核源码/Node 准备快照及全部输入前后字节。实际 [root r2](../../../../output/continuous-camera-root-readback-1002-r2/result.json) 与 [绑定](../../../../output/continuous-camera-root-readback-1002-r2/binding.json)保原输入，未再运行渲染器/GPU。r1 reader 把六份保留回执误当含 bytes，实际在源读取阶段失败；原失败和脚本保留，r2按回执实际字段校验，无生产修改。

这一旅程的图片 payload 为 3,434,697 B，metadata 85,313 B；源上传 140,574,720 B，窗口复制 19,267,584 B，逻辑 GPU 峰值 30,212,096 B。十二态第二帧 source-upload 均为零；转向/回程首帧仍有重新解码/上传，return-160还取一张此前未用图。最后两个稳定锚点的整幅 RGBA 与起点完全相同且无新增请求/解码/上传。初始与最终相同像素下 source-RGBA 引用模型仍分别为 14,417,920/16,515,072 B；不是整段零成本或物理内存下降。

实际地平中心 view-opacity .5，地下及侧倾地下 0。139°/全天由共享相机捕获到 +24.53°/天顶，不能按原输入名称称为地下宽场。view-opacity、loader readiness和真正 painted-mask opacity分别保留；初始上仰锚点 readiness0/mask0，稳定返回 readiness1/mask0，没有把非零几何系数当照片贡献。W3宽场与银河按真实资格互斥；selected M31/SDSS/LOCAL因FOV≥45不活跃，活跃coarse/fine及地景遗漏SDSS coarse reservation没有在这条路径中覆盖。

退出后活动GPU/weak-current/lease/running/pending/reserved归零，61编码文件/3,434,697 B保留。诊断强持有85个图像对象，所以无GC/native物理归零结论。纹理绑定不是照片fragment贡献或完整来源UI。6项设置/outbox保留修改、旧出版与资源、生产源码/预算/窗口策略均不变。

当前可沿已有正常消费者审计推进独立、未采用的光学science-v2合同/离线writer，再接normal producer/Hook/完成帧来源与旧offer兼容；复用已独审的availability粗细选择能力，不重复pair试验或取源。同时保留端云整场成本/混合业务容量、实际连续输入、目标WXML/真机与新版月面、图质和全部有效交付义务。Goal active、无预算、未完成。
