# 云观星外部咨询精选证据

配合仓库 [完整咨询材料](../../../../../docs/cloud-sky-data-processing-display-consultation-2026-10-05.md) 阅读。这里复制的是已有实际输出，没有重加工图片、替换来源或补生成细节。原路径、字节与 SHA256 见 [copy-manifest.json](copy-manifest.json)。原始下载、完整数组、构建与其它 `output/` 产物仍在本地，不应假定远端可访问所有原记录里的链接。

## 当前图像和完整信用

以下 Hubble 图均为 M82 heic0604a 的投影/分级及实际软件 Canvas 输出。原始出处：[ESA/Hubble 图片页](https://esahubble.org/images/heic0604a/)，许可：[CC BY 4.0 / 具体条款](https://esahubble.org/copyright/)。加工说明、波段、网格、来源及不可变身份见 [progressive-manifest.json](progressive-manifest.json)。不是科研测光、实时天空或最终手机截图。

**NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: J. Gallagher (University of Wisconsin), M. Mountain (STScI) and P. Puxley (NSF).**

- [总览实际图](m82-overview.png)：2026-10-05T13:00Z、390×844；照片矩形/背景与有限覆盖仍失败，不能因成功加载升级质量。
- [细档实际图](m82-detail.png)：同代次 .05°，细图为1024；细节更清晰不证明外沿、弱结构、绝对配准或完整昼暮组合通过。
- [Hubble细粗边界，512父层](boundary-hubble-512.png)、[同源1024父层](boundary-hubble-1024.png)：前一日2026-10-04T13:00Z的必要平移条件。两个1024网格并非一幅新4096母图；当时任务图的最终新出版来源UNKNOWN，不能与新v2正常HTTP代次混写。

以下两个失败对照包含 Hubble 细图（信用同上）与 NOIRLab M82 粗层。NOIRLab 原信用：**T.A. Rector (University of Alaska Anchorage) and NOIRLab/NSF/AURA/**（保留原记录末尾斜杠）。原页、具体许可、波段及处理说明见 [noirlab-display-manifest.json](noirlab-display-manifest.json)；[NOIRLab 政策](https://noirlab.edu/public/copyright/)。raw 是原观测出版RGB重采样，display 是有记录的背景显示估计，都不是新科学测量，不暗示机构背书。

- [NOIRLab raw作为粗层](boundary-noirlab-raw.png)
- [NOIRLab display作为粗层](boundary-noirlab-display.png)

跨来源颜色/结构接续失败，不能用透明化抹去真实弱结构来宣布成功。该四帧原严格还原2RGB通道各差1/cause UNKNOWN和最终退休回执MISSING保留，见 [boundary-readback.json](boundary-readback.json)。

## 最新开发证据及其边界

- [出版结果](progressive-publication-result.json) 与 [v2 manifest](progressive-manifest.json)：三PNG总4,357,051B；复用缓存宽母/中档/细网格，新增原图下载/解码/投影/背景估计0；严格旧v1兼容身份保留。默认registry空。
- [原v2完整page读回](progressive-page-readback.json)：实际HTTP、细档503保中档/公开重试、来源Back/hide暖回及8组GL-PNG-GL、同代次像素恢复、最终活动退休；当时光学保留预算8MiB，是被后续纠正的代码代次，不冒当前版本。
- [完整来源页读回](source-page.json)：实际来源正文和路由。来源页存在不单独证明普通页面可见信用或外链义务已完整履行。
- [当前2MiB保留压力窄路径](retention-readback.json)：当前511前端/168后端解析输入，539当前源pin与6保护保持；3组GL-PNG-GL全值精确，细图→概览→细图最终0像素差，PNG仅首传4,357,051B，89请求body8,980,347B。当前Prepared native-RGBA等效8→1→8MiB；全部活动/退休最后0。各资源MAX分别保存，不相加为物理峰。
- **暖过渡仍有缺口：** 当前实际Scene暖缩回概览时一帧未带Prepared图，两次概览/一次回细档最终来源null；稳定恢复不证明全程无闪烁。可见时长/完整因果未闭合，必须保持OPEN。最初任务只因FOV末位严格比较失败，三个捕获像素0差；修task而非业务代码后复用同一bundle再核，原失败未覆盖。
- [标准静态导出](progressive-static-check.json)：真实v1+v2文件/header/hash与现有导出链兼容；未把新版本的Caddy/TLS/公网出口、部署、盘保留或容量记成通过。
- [相关开发检查](development-checks.json)：合同10项、provider/static/资料8项、App/worker/contracts TS5.9及SDK当前性通过。新类型初始失败及修正有原记录；不等于全部仓库测试、设备验收或独审。

所有截图来自实际软件 WebGL，native API 为受控端口，样式未组成完整WXML画面；不是目标微信真机验收。旧WXML FAILED_DEVTOOLS、Android/iOS、新月面手机、完整质量、独审及200DAU混合容量仍未完成。最新执行只看任务 `PLAN.md` 顶部；本包是可分享证据索引，不是第二份计划。
