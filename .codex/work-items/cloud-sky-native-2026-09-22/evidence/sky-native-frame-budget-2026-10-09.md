# 原生像素合成额度与退休修复（2026-10-09）

完整Goal active、无预算，授权目录/codex/remote-main-20260908保持，未提交推送/发布。只关闭高DPR共享合成的受控开发增量；33项、微信/设备/画质/物理容量/独审仍开放。

## 改变与责任

原同源PNG工作图细→粗使用RGBA8+depth16。现由原Scene/GPU/贡献owner按粗→细覆盖样本：RGB以`SRC_ALPHA/ZERO`写为premultiplied，A以`ONE/ZERO`原样覆盖，透明细像素也占自己实际mesh；失败细格保已经完成的粗格。再整体source-over并复用A认证实际来源。未改原图、真实alpha、坐标、目录或科学UNKNOWN，未降低DPR，无depth或第二张全幅颜色图。

`skyArtworkContributionFrameBudget`在原贡献owner集中计算实际drawingBuffer尺寸×允许source groups的RGBA及共享4×4 MAX链。page保持显式opt-in/group数；未填固定bytes时每个新Canvas代按原生像素核算，显式bytes（含旧2MiB）仍固定并保拒绝。默认未opt-in无探针/普通HiPS仍关；该额度不是16MiB源纹理压力或物理设备上限。

实际DPR2双源检查暴露退休缺陷：旧renderer删除仍绑定的program，GL延迟删除后，新guard试图恢复已失效handle。原renderer dispose现在仅清自己的当前program绑定再删除，不清外部owner绑定。保存了两次FAILED（grouped-auto/r2），相同2/3 DPR条件修后通过；没有加额度来掩盖这项故障。

## 当前证据

- 原生390×844同源单组所需RGBA+MAX从2,063,400B降到1,405,080B；780×1688从8,251,304B降到5,618,024B，分别省去整帧depth16。当前8 Scene条件和12个实际WebGL控制通过：有效黑、透明细图、部分几何、跨源opaque/transparent/partial、旧target复用、resize/受控loss/retry、资源退休。分配拒绝和真正FBO失败严格保冻结独立像素，保持UNKNOWN/故障区别。
- 2份DPR2完整Scene在显式6MiB任务额度下通过：M8对冻结原图816像素最大差1码，M61全相同；alpha/来源/所有MAX层、纹理/FBO计数退休，depth创建0。这是改动后必要验证，不重渲旧闭合矩阵。
- 新自动额度控制使用实际780×1688和1170×2532，两source groups分别10,884,584B及24,491,728B；严格完整红RGBA和跨源来源`unknown/positive`均正确，全部texture/FBO/program/buffer退休，renderbuffer0。旧固定2MiB仍拒绝且整帧RGBA严格保原。仅软件GL，不能据此判断手机可承受这些空间。
- 完整当前Taro/实际HTTP/cache/公共Map进入/搜索定位/缩放/来源与Back，在新**DPR2自动额度**下执行523前端源、100已绘Scene、144请求。M8/M61的780×1688完整RGBA Source Back严格相同，每个Back有3个完成来源帧，额外光学body0；2D显示与GL规范RGBA逐字节同。最后回Map及退休：唯一离屏/显示backing均0、AppHide监听0；测试browser/API已关闭，原服务未重启。
- 实际查看当前两Source Back图：M8照片对角外沿仍显著，连续背景仍FAILED；M61原密星/光晕仍保留。本轮是资源/恢复修复，不把它们认证为图质通过。
- 当前App TS5.9.3按不变strict/noUnchecked/exactOptional配置通过；最新Scene适配器也通过历史strict端口配置（noUnchecked/exactOptional=false，范围明确）。18个影响检查通过。独立审查工具无本地能力且未授权子代理，独审仍MISSING；以上为开发检查和本agent核对。

机器读回`output/sky-dpr-integration-2026-10-09/evidence.json`：7,081B，SHA256 `8583df40428c44cc7ffd0b2e3df0c0e2f87b8373e773a6ae6d9223f9ab1fa916`，绑定当前3产品owner、测试和4实际task adapter、失败/类型/当前完整page。task adapters有既有ignored本机路径，不能只以Git status认其已保存。

完整page资源模型的不同采样MAX：纹理upload逻辑22,395,240B、源RGBA等效22,020,096B、21 decoded handles、文件逻辑14,175,882B。不能相加为同时间物理峰；真实设备/native/driver/浏览器诊断保留和完整家族物理退休未验，200DAU/4GB/Linux容量未认证。首可用/细节尾延迟/手机帧时不能由这些记录替代。

初次整页启动Node loader缺API experimentalDecorators配置，退出1、未进入browser；原目录/startup-failed.json保留。使用既有API tsconfig后成功，新目录r2不覆盖失败。没有更改项目编译设置或安装依赖。

## 下一依赖

高DPR资源/恢复已形成必要开发证据，暂不重跑。下一主依赖回到Q1/Q2/E1：完整来源准入/normalization、连续区域先于LOD、SXT异常修复及批准子批次到原publication/实际Scene。已接SXT队列1文件级通过/4待修、普通Prepared空/HiPS关、原FAILED/UNKNOWN/MISSING全部保持。原生控件和设备按独立可行动前提推进，手机后置。
