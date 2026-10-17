# StarNet 输出作为云观星素材：许可风险复核

**后续决定：用户已选择SXT，StarNet暂不考虑。**本记录保留研究证据；下方争取授权建议和询问信不再是当前任务，不发送、不继续申请。当前选择见[比较报告](image-tool-final-results-2026-10-09.md)。

2026-10-09。用户更偏向 StarNet，本轮只核查素材用途风险和可能的授权路径。实测质量/效率不重排，不重跑模型、不投产、不联系作者；主 Goal 继续暂停。现行实验与用户要求由[唯一当前计划](image-tool-full-comparison-2026-10-08.md)持有。

## 结论与适用场景

**StarNet 保留为用户优先候选，下一项依赖是素材用途授权。**当前所测 2.6.2 的许可明确限制将输出作为商业或非商业软件的产品素材；不能把“免费天文修图、允许商业处理/出售照片”理解为“允许用于任何软件产品”。旧版确有不同条款，但核实的两份旧包仍限制输出用于创建商业软件，尚未提供覆盖云观星未来商业用途的明确通路。

本次判断的场景是：离线处理有权使用的天文图片，将输出或其裁切、调色、缩放、瓦片等衍生图作为云观星 App/小程序的图像资源，经包内文件或 CDN 展示；不分发 StarNet 软件/模型，不训练模型。它与向摄影师提供修图服务、出售照片或展示摄影作品的用途不同。具体项目是否商业化尚未在本轮确认，不能替用户断言；争取许可时应明确同时覆盖未来可能的商业与非商业部署。

这是根据实际许可文本作出的用途风险判断。条款是否在特定司法辖区可执行、作者能否获赔及金额、实际发现/追责概率均未确定，不能从文本直接推成法院结论，也不能因图片属于我们就认为合同限制不存在。

## 版本、实际文本与证据强度

|版本|实际核实的限制|对云观星的含义|
|---|---|---|
|本次所测 2.6.2 build0242，许可修订 2026-09-07|第 2 节允许个人/教育/研究/商业天文修图和有条件的 CLI/插件集成；第 3 节不主张输入/输出所有权，但服从第 4、5 节；第 5 节明确包含商业及非商业产品素材、测试夹具、参考结果，修改后的输出亦在内|当前图像资产路径存在明确条款冲突；不应把“不分发模型、不训练 AI”当作已自动获得素材许可|
|官方旧包 2.5.4 build0214，列表日期 2026-07-22|Restrictions 2(a) 禁止软件、组件或输出用于创建任何商业软件，包括训练网络；未出现现版对非商业产品素材的明确措辞|不能声称限制与现版完全相同；但商业软件素材用途仍有明显风险，不能据此保证未来商用|
|官方 legacy Windows v2 包，官网推定为 2.0.0、列入 2022-03 旧版|StarNet 自身条款限制组件/输出用于创建任何商业软件；后附大量第三方许可证|真正非商业用途可能有不同空间，须按实际旧许可和项目事实判断；第三方 MIT/GPL 条款不替代 StarNet 自身条款|

本机证据根：[许可读回目录](../../../../output/image-tool-full-comparison-2026-10-08/starnet-license-risk-2026-10-09/)。

- [现版完整许可](../../../../output/image-tool-full-comparison-2026-10-08/starnet-license-risk-2026-10-09/current-2.6.2-LICENSE.txt)及[来源校验](../../../../output/image-tool-full-comparison-2026-10-08/starnet-license-risk-2026-10-09/current-license-provenance.json)：已核本机缓存完整 ZIP 的 SHA256，与[官方 CLI 页面](https://starnetastro.com/cli-tools/starnet/)公布值一致；ZIP 内 LICENSE 与实际安装的 LICENSE 字节一致。完整 ZIP SHA256 为 `fbd5c7bdbbbee0cdbabf101b2c7ac2af3d33e3c477f9585f38f98b882f1551a0`。
- [2.5.4 许可](../../../../output/image-tool-full-comparison-2026-10-08/starnet-license-risk-2026-10-09/2.5.4-0214-LICENSE.txt)、[旧 v2 许可](../../../../output/image-tool-full-comparison-2026-10-08/starnet-license-risk-2026-10-09/legacy-2.0-inferred-LICENSE.txt)、[读取记录](../../../../output/image-tool-full-comparison-2026-10-08/starnet-license-risk-2026-10-09/archive-license-readback.json)：从[官方旧版列表](https://starnetastro.com/cli-tools/legacy/)所链接 ZIP 通过 HTTP Range 读取 LICENSE 并核 ZIP CRC；未下载完整旧包、未核整包 SHA256、未安装或执行旧模型。记录持有 URL、成员路径、字节数及文本 SHA256。
- legacy 包“2.0.0”来自官网推定，不冒充二进制自报版本。服务器当前 Last-Modified 为 2026-05-21，与官网历史日期不是同一事实，不能据此宣称整包自 2022 年从未改变。

现版第 8、9 节保留此前独立许可和强制法律权利，并明确新条款不追溯替换旧副本的许可。查旧许可是有效调查方向，但必须使用相应合法副本及其适用授权，不能把旧授权附到新版模型。旧版本的质量、速度和运行兼容性本轮未测，不能继承 2.6.2 的实验结果。

[作者 GitHub 原始项目 README](https://github.com/nekitmm/starnet/blob/master/README.md)也需区分：早期代码 MIT，模型权重 CC BY-NC-SA 4.0；不是“当前 StarNet2 整体 MIT”，也不是现成的商业用途替代授权。

## 作者解释与可争取的空间

作者 `nekitmm` 在 [2022-01-24 发布说明](https://www.cloudynights.com/forums/topic/808556-starnet-v2/)中主要担心别人利用其输出和训练劳动开发其他模型；[2022-01-29 澄清](https://www.cloudynights.com/forums/topic/808556-starnet-v2/page/2/)说明普通图像后处理本身可以做；[2022-02-05 更新](https://www.cloudynights.com/forums/topic/808556-starnet-v2/page/5/)又表示已允许非商业软件衍生用途。这与读到的旧版商业软件限制相符。

这些历史说明使“只做天文展示素材、不训练模型、不分发软件”的具体请求有沟通依据，但不能覆盖现版新增的明确产品素材条款。现版第 9 节提供申请额外书面许可的路径，[官方联系入口](https://starnetastro.com/contact/)可用；未确认授权会否获批、收费、期限或实际处理时间。

## 风险拆分与实际影响

|风险|当前能确认什么|尚不能确认什么|
|---|---|---|
|用途许可|现版明确覆盖产品素材，即便非商业或已修改；普通商业修图许可不能单独排除第 5 节|适用法律、法院对限制的效力认定、具体救济与金额|
|规模扩大后的返工|若依赖未经明确授权的输出建立大素材库，后续争议可能迫使暂停使用、替换素材或另行协商，造成批量重处理与发布成本|作者是否会主张权利、是否实际发生争议，不能给概率|
|旧版路径|旧版商业软件限制仍在；纯非商业事实需具体核对|免费发布是否在完整经营场景下属于非商业，以及未来转商用是否另获许可|
|版本维护|现版条款不追溯改写此前许可；不同版本需保存适用授权|未来新版模型/许可、作者是否继续维护以及额外授权是否跨版本|
|图像本身|工具声明不取得图片所有权；但原始素材许可/署名责任仍独立存在|不能用工具许可代替图片发布者授权或科学真实性验证|

现版第 7 节允许违约时按适用法律要求终止使用权；不要求删除原始图片/输出，但输出用途限制继续存在。因此“图片无需删除”不等于“可以继续作为产品素材使用”。技术上能运行、能批量、离线不联网，也不改变用途条件。

调色、裁切、再降噪、转换 PNG/WebP、先经 PS、改用 CDN 加载或把应用免费发布，都不能单凭这些操作消除现版明确限制。没有必要把这一问题扩大成“不允许修图或卖照片”，也不能缩小成“只禁止训练竞争模型”。第 2 节允许的集成例外针对按条件调用处理服务/工具，不是对任意产品图像资产的普遍豁免。

## 指纹/可发现性：补充与纠正

作者在上述 2022-01-24 原帖确实说过尝试引入研究中的技术性知识产权保护，但未公开具体机制。本轮没有证实隐藏水印、像素指纹、联网回传、当前 2.6.2 是否包含该机制或其有效性。不能保证“没有指纹/无法发现”，也不能据该发言声称一定有追踪。

此前只检查一组 M81/M82 文件：原始 StarNet PNG 仅常规 IHDR/IDAT/IEND，未见额外文本元数据；原图/最终图存在 ICC。这种检查不检测隐式像素标记。本段补正此前“未找到作者技术保护公开说明”的不完整研究，不进行规避或逆向。许可判断不以是否能被识别为依据。

## 当前建议及恢复依赖

尊重用户偏好，优先争取**现用 StarNet 2.6.2 针对云观星图像素材的明确书面许可**；现有技术结果不变，SXT 仍保留为未能获得合适许可时的替代候选。许可应明确最终图像/衍生瓦片、包内/CDN 分发、以这些素材开发验证显示功能、商业与非商业用途、适用版本、是否付费及已生成素材的持续使用权。申请结果不是必然成功，也不预设购买。

后续若获得授权，按实际条件保留许可、源图权利、工具/模型/参数/输出的绑定记录，并在用户明确恢复工作后接入。当前只保存研究，不放开 runner 的产品素材限制，不自动跑全库，不恢复主 Goal。

## 可审阅询问信草稿（未发送）

Subject: Permission request — StarNet2 outputs as astronomy imagery assets in Starward

Hello Mikita,

We are evaluating StarNet2 2.6.2 for Starward, an astronomy app and WeChat Mini Program. We would like to process properly licensed astronomical photographs offline and use the resulting raster images as sky-display assets. Users would view these images in the app; this would not be a hosted image-processing service.

The assets may be color-adjusted, resized, cropped or converted into image tiles and distributed within the app or through a CDN. We would not redistribute StarNet executables or model files, use its outputs to train or distill models, or develop a competing image-processing algorithm. Development and testing of our sky viewer would naturally use the resulting display assets.

We understand that section 5 of the 2026-09-07 license restricts outputs used as product assets. Would you grant written permission for this specific use, including both noncommercial and possible future commercial releases? If a separate license is available, please let us know its scope, conditions and cost, applicable versions, and whether generated assets may continue to be distributed after processing ends.

Thank you for considering this request.

发送前需补齐实际申请主体/署名并确认陈述。当前没有发送、没有取得许可、没有承诺费用；用户要求调查不等于授权外联。
