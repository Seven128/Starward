# Q2：冻结NGC253 PNG/JPEG实际采样决定

具体决定：NGC253继续以现JPEG q92/4:4:4作为条件显示小样，原PNG保对照；本轮没有证据要求改成PNG三级或重新加工图片。该决定只为当前输入的开发试验，**不是**普通影像注册、全来源编码采用、最终图质或实际WEAPP颜色/性能通过。矩形外沿/外围底图仍未闭合，不能靠格式换大文件解决。

复用Q1全幅1024×928 PNG（949,252B，SHA c67f864449dff0d5bb6954a14a0c204aa30eea2b56b3046a77a53f8ade55d280）及E1精确复用JPEG（112,411B，SHA 79c63b61eee3a9a9c62c85430b822d56b4b714a8e1d939bc77e01bdfb36f4e21）。来源8285×7510 JPEG、原XMP/ICC、全幅LANCZOS/历史复合色和UNKNOWN准入已由[Q1](q1-real-candidate-decision-2026-10-05.md)/[E1](e1-native-optical-consumers-2026-10-05.md)拥有，没有新下载/重生成/PSF/投影或修改源图。当前PNG不是替换进已封包JPEG的manifest/HTTP/hash；这是显式独立格式对照。

`scripts/compare-native-encoded-sampling-2026-10-05.mts`使用现光学片元与原像素窗口、真实两格式Image decode、相同native TAN/实际观测及冻结相机basis/390×844尺寸、最高原格和一个固定近黑背景。每条单图draw后纹理退休，源码/输入前后hash绑定，执行脚本和compiled owner/PNG/RGBA保存。几何interior由原unproject/UV owner定义，剔除最外.002 UV；不把未画照片的背景稀释差值，也不把该几何mask冒曝光/科学有效性。

| 视角/原始记录 | 照片内有效统计像素 | 平均绝对RGB通道差 | p99 / 最大 |
| --- | --- | --- | --- |
| 2°完整旋转矩形，r2 | 48,046 | .66738 | 4 / 22 |
| 原page .609639°局部，r1 | 306,528 | .69470 | 4 / 21 |
| .253200°更近，r1 | 329,160 | .92657 | 5 / 28 |

保存目录 `output/playwright/cloud-sky-native-encoding-1005-q2-r1/` 与 `-r2/`。r1的“whole”1.354754°实际裁掉旋转矩形两个角，**不能**认证完整外沿；保原结果/脚本。只针对这个缺口补r2 2°whole-only，两格式及全部四个名义外角都在viewport内并保存`wholeCorners`；未重跑已完成的局部/近景。

已直接查看r1局部/近景及r2完整PNG/JPEG实际截图：当前DPR1下两格式保相同方向、星系核心/尘带/星点和外围结构，没有观察到决定性的PNG改善。差值非零、近景个别通道达28仍保，不能认证高DPR、弱结构完整性、PSF、科学流量、绝对配准、所有人眼/设备色彩或所有来源JPEG。JPEG约为该PNG的11.84% encoded bytes，不据此外推流量/容量或声称零损失。

两格式decode后同为1024×928、每幅source RGBA等效3,801,088B。r1 source-upload＋crop瞬间逻辑纹理峰4,980,736B，r2完整图无crop峰3,801,088B，最终纹理均退休；两格式bitmap共存、宿主/驱动/浏览器物理峰未测，不能把这些数相加冒全端容量。decode/draw是固定先PNG后JPEG的单次软件时耗，只保原值，不判断速度优势或native帧率。

真实外沿仍可见照片矩形及与裸背景的断层；Legacy区域的饱和/彩色点噪声、曝光/质量mask UNKNOWN及ESO6k直接UV/粗Legacy否决均不改判。下一依赖在PLAN：对完整native外沿/弱外围与合格广角/区域底图做有依据的组合决定；不得抠黑、feather、删外沿/晕或生成细节假闭合，不重启逐图PSF或通用巡天框架。普通Prepared registry仍空，合格普通覆盖增量0；P1/E2/A1未通过。
