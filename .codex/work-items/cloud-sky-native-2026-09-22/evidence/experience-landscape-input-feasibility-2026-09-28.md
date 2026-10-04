# B3整页地景输入、共享缓存与原生探路

本轮沿唯一PLAN的整体场景差距继续，没有改生产源码、当前候选或采用新的Sky设计稿。Goal active、无预算；真机暂不可用，不进行手机抓屏、输入、预览或设备轮询。原技术路线、商业排除、完整流程及交付义务不变。

## 实际差距与当前页面

重新实际查看[同条件参考](experience-landscape-outline-reference-matched-2026-09-28.png)、早前地景昼夜输出，以及当前clean-v5的[85°实际页面](experience-combined-clean-v5-scene-v5-night85-before-2026-09-28.png)。正式示例点、16:00Z、390.4×844的原生Canvas保持；参考采用短边40.78913364849271°，Mini为垂直85°。参考的地表、远处轮廓和近景形成更清楚的空间层次；现有程序模型仍简化。新图是DevTools开发观察，不能升级为手机或整页质量验收。

之后通过当前公共双指接口恢复25°。当前仍是16:00Z/09月29日00:00、手动Vega/天琴座、普通DAY、地景/星座开、W3广角关、无跟踪或面板；同一SDK9438，原257文件/4,450,215B指纹在原生试验前后核过且未变。本机8787/8788/8789和唯一开发者工具项目保留，没有新项目窗口、重建、部署、采购、发布、提交或推送。新月面不变，未推手机。

## 有界素材核查

| 输入 | 权利与来源 | 实际内容、格式及处置 |
| --- | --- | --- |
| Poly Haven实际资产 | [资产许可](https://polyhaven.com/license)为CC0；网页示例图、文本等不因此获权。[API条款](https://raw.githubusercontent.com/Poly-Haven/Public-API/master/ToS.md)单列服务使用条件 | 只读核查noon_grass/meadow。不是可直接使用的透明天空地景；未下载其资产、未用网站预览充当素材，也未接实时API |
| Uvalno / Ivo Burdik | [官方目录](https://stellarium.org/landscapes-europe.html)及实际包内readme/info为CC BY 3.0 | 原ZIP 2,802,864B，SHA256 `9cf5b2423b3216d45dfabd15d424214fa829ba2070ec8f7b8201afe47dfa6080`；4×1024×512侧图和512×512地表。实际查看发现明显拉伸；旧式ini亦含拼接错误和缺失雾纹理引用。此输入淘汰，不为它另建修复/转换框架。淘汰的本地素材按回收站规则处理，记录保留来源、校验和拒绝理由 |
| Stara Lesna Meadows / Lubomir Hambalek | [实际原包](https://github.com/Stellarium/stellarium-data/releases/download/landscapes/stara_lesna.zip)readme/info写CC BY 4.0；目录/图标另示BY-SA。两者实际允许的商业复制加工与分发仍需分别保留声明，若继续采用应履行较严格的署名/许可/派生共享条件，不将素材义务扩大到自有引擎代码 | 实际4096×2048透明PNG，12,365,293B，SHA256 `6591d5da60b77df296b06de930edf3c598868006cca476ff6a122617f0118226`。原ZIP 12,377,473B，SHA256 `a91d6eb884be3433258c8821d57d63aaad3c03e9922b51ba2627f18fbbba006d`。实际查看有连贯草甸、远景和透空高空；仍只是技术候选，没有采用/出版/接入声明 |

原包、readme、ini、info和当前候选PNG保在`landscape-input-trial-2026-09-28/stara_lesna/`。不同许可标签的证据不覆盖或删改；原文件不换署名。仅需公开标准许可的署名/派生条件，不提出逐项付费授权或供应方联络。本轮没有重启引擎选型。

照片用于通用模拟场景时，不能冒充所选观星点实景或现场山体/近物遮挡。当前探路明确把原图接缝注册为模拟ENU北、顶点为天顶；**没有验证摄影地真北或把作者ini的270°当成选点地理注册**。照片的固定光照/阴影和昼间内容也不等于当前时刻现场观测。

## 已完成的投影与缓存试验

[脚本](../scripts/experience-landscape-panorama-trial-2026-09-28.mts)直接读取生产`artworkVertex`/`skyRay`、相机和`createSkyGpuTextures`，不是复制另一个引擎。原包在本地只下载一次。以可重复的Chromium软件WebGL实际上传、绘制、读回，涵盖四朝向/45°与85°、昼暮夜/红光、全天、接缝细景和旋转，共28张实际输出。原始[结果](../../../../output/playwright/cloud-sky-landscape-panorama-trial-0928/result.json)与图像保留。

| 纹理 | 单张RGBA | 三帧共享缓存实际结果 |
| --- | --- | --- |
| 4096×2048 | 33,554,432B | 16MiB owner每帧结束释放；3次创建/3次删除，下一帧重新上传，不适合作为当前常驻原图 |
| 2048×1024 | 8,388,608B | 1次创建、最终1次删除，三帧同一纹理 |
| 1024×512 | 2,097,152B | 同上 |
| 512×256 | 524,288B | 同上 |

天空高区未抽出不透明像素，低地表未抽出完全透明像素。软件GPU与对应源alpha的双线性采样没有不透明/完全透明内部错误；最大alpha量化差约0.499365/255。红光试验无绿/蓝输出。所有缓存试验无GL错误且dispose释放本轮纹理。这只是该输入/相机/软件GL的可行性；没有测整帧/native峰值/手机性能，也没有与其它同时绘制图层闭合资源预算。

实际查看[1024夜间85°](../../../../output/playwright/cloud-sky-landscape-panorama-trial-0928/1024-night-0-85.png)、[2048夜间85°](../../../../output/playwright/cloud-sky-landscape-panorama-trial-0928/2048-night-0-85.png)、[2048昼间85°](../../../../output/playwright/cloud-sky-landscape-panorama-trial-0928/2048-day-north-85.png)及[全天](../../../../output/playwright/cloud-sky-landscape-panorama-trial-0928/1024-night-all-sky.png)。地表比当前噪声模型有更多连贯细节；昼间轮廓仍有可见亮/蓝边，夜间曝光尚未与实际大气背景收敛。仅描画地景、固定背景和显示曝光，不是假造完整星空或当前照明；这些实际质量差距不能由许可/模型披露抹掉。

转换为1024与2048的本地候选分别854,784B与3,316,173B，SHA256见原生结果的assetFacts；源alpha数量与已测纹理相同。直接从Image缩放及默认GPU后端与已测两级Canvas路径的边界数量不同，前两次严格失败保留；最终沿用原路径和SwiftShader，不改期望凑通过。转换是工程输入候选，不是新素材生成或采用稿。

## 与PNG同哈希绑定的透明度输入

原生离屏读取/SDK Canvas对象不是普遍硬依赖。采用[独立输入脚本](../scripts/experience-landscape-alpha-input-2026-09-28.mjs)从最终PNG逐像素提取alpha，形成行程编码的版本1候选；[实际结果](landscape-input-trial-2026-09-28/native/alpha-input-result.json)和两个文件保留。1024×512的524,288个alpha压缩为19,943B，2048×1024的2,097,152个alpha压缩为54,224B；独立解码后每个值与原PNG相同。错误PNG哈希及短缺行被拒绝；把真实透空行改为不透明会使原图一致性检查失败。没有从颜色推断缺测，也不把透明度称为现场地形/科学有效性。

这是可供既有发布/合同owner继续接入的本地数据候选，未向BFF出版，未连接生产消费者。渲染与点选可以用同一源hash、尺寸、透明度和已绘LOD，不要求在每次手机绘制或SDK内另读整张离屏图片。后续仍须验证实际PNG解码、GPU采样、部分透明边缘、完整图遮挡及同帧消费；压缩字节不是峰值内存，展开的0.5/2MiB与同时保留图层要计入owner成本。

## 微信开发者工具的实际证据与失败

当前clean-v5公开`wx.createOffscreenCanvas({type:'2d'})`可创建图片、画图、取像素；4×4实测空alpha为0、红像素RGBA为255/0/0/255。这个小测试不能证明实际全景解码或主Canvas互通。

[原生探路脚本](../scripts/experience-landscape-panorama-native-input-2026-09-28.mts)保留三类不通过结果：

- 首次长调用遭automator响应超时，阶段未充分记录；没有原生渲染成功声明。
- [r2](landscape-input-trial-2026-09-28/native/result.json)、[r3](landscape-input-trial-2026-09-28/native/result-r3.json)：两份实际`wx.downloadFile` HTTP200，r3原生文件字节也与输入相同；SDK作用域获取当前Canvas node超时，尚未执行解码/GL绘制。临时`http://tmp`文件可读但unlinkSync明确被平台拒绝；不能声称手工释放，不能把它们误作Starward自有缓存文件。
- [r4](landscape-input-trial-2026-09-28/native/result-r4.json)：改为生产`startSkyArtworkRequest`和新离屏WebGL Canvas接口的探路。运行器在请求阶段报最大调用栈，HTTP服务未收到请求；没有图片/alpha/GPU成功证据。新离屏GL资源已走释放，自有`sky-trial-panorama-`文件实际读回为0。该结果不证明生产Taro请求路径失败；它也不能替代在正常页面沿原owner接入的验证。

原native JSON的`finished`只表示尝试结束，**不是pass**。r2/r3临时文件由WeChat框架管理，当前没有证明它们已被平台回收；不清空整个项目缓存或删除未知用户文件来掩盖它。现有正式图片链实际使用`Taro.request<ArrayBuffer> → USER_DATA_PATH/唯一sky-art文件 → Canvas.createImage`，带字节/尺寸校验、取消和release；不是上述`wx.downloadFile`临时目录。下一步复用这个正常生产路径。没有加入wx mock、私有状态写入或长期诊断；运行器/本机临时HTTP服务均结束，所有尝试前后当前页面与候选指纹相同。

## 唯一PLAN的下一依赖

本轮完成了有限来源核查、真实输入/投影与共享缓存约束，原生全景链仍未通过。下一步是B3输入准入与正常页面小路径：保留全部许可/原图和派生说明，限制真实纹理尺寸与同时图层成本；复用版本化发布和原图片/Canvas/GPU owner。选用照片时，点选/定位/来源必须绑定同一已成功绘制的alpha/LOD/相机/代次，不能继续拿旧程序树木几何遮挡新照片；GPU失败则由实际退回模型提供对应mask，不能抢先报告图像已显示。整幅影像遮挡仍需保守证明，不凭中心或任意四角隐藏来源。

正常Taro运行路径验证优先于重复SDK Canvas node/同一调用栈错误。照片亮边、曝光和层次在实际大气/恒星/图层组合中一起评价；没有通过前不采用为默认交付，也不把当前程序模型当需求上限。若该输入不适用，记录模块原因并继续PLAN独立差距，不使整体目标挂在摄影素材上。当前没有新增正式产品/架构决定，因此不把研究进度写入耐久Context。

实际成本仅可报告本轮两个ZIP的15,180,337B和已记录的局部HTTP载荷/本地派生字节；首次超时载荷、Agent有效付费工时、平台临时回收、native内存、手机帧时/流量、官方包体和现金费用仍未知。未知不写零。源版权、代码权利、交付服务和数据分享义务分别核；Android/iOS、姿态/校准/OS后台、完整组合质量与独立审查仍保留。
