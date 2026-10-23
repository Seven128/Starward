# R19 来源真实页：gen7目标输出独立审查

2026-10-22。独立子代理只读审查当前实现及既有私有原图，未参与来源实现，未操作手机、IDE、服务、构建或 Git；仅新增本报告。审查依据为用户本轮统一真实来源页/公共按钮/公共跳转/固定模板指令，根 AGENTS、当前交互 Skill、DESIGN 小程序相关范围、REQUIREMENTS、来源实施及消费者报告，以及 shared-state-and-recovery / spot-and-sky 的来源与恢复合同。复用已采用且本次未改变的 Sky 来源入口，不重新生成或选择设计资源。

## 结论与已确认差异

**gen7代表来源页的内容、按钮及最终返回局部有效，但当前来源交付尚有一项确认 P2；完整 Sky 资料 UI 另有确认输出缺口，不能据局部返回通过关闭 R19。** 下列优先级不把来源页局部失败升级为整套导航/内存失败。

### P2：已发布站内照片的原始出处复制被外链校验必然拒绝

- 实际 `e92f1da7-bf06-4356-b293-ba4d69dcf947` 权利页显示 `/v2/spots/spot%3Ajourney-20261006-a/media/upload%3Af86e3ae5-507a-43d2-886e-1d8c87c38711/image`，并提供“复制原始出处”。
- `apps/wechat-miniapp/src/content/article/detail/article-media.tsx:22` 将合法站内媒体相对 route 原样写入 links；`components/source-document-content.tsx:15` 交给 `validateExternalUrl`。后者在 `packages/miniapp-contracts/src/url-policy.ts:33` 直接 `new URL(raw)`，相对 route 没有 base，因此按钮不会调用复制 API。
- 本审查用现有合约函数只读执行该实际值，结果为 `ok:false / normalizedUrl:null / code:URL_PARSE`。未点击手机、未读剪贴板；此为实际输入加真实校验函数的代码边界确认，尚非本代理执行的原生复制验收。
- 已有 `utils/media-source.ts` 只认可产品发布的精确媒体 route，并为图片请求绑定当前 BFF；当前 ArticleMedia 仅将它用于 ReadingImage。应在既有窄媒体 owner 解决可信站内出处的地址/复制语义，不能放宽任意相对 URL、危险协议、凭据或外部私网输入。单纯补当前开发 API base 仍会被普通外链规则判为 `SSRF_PRIVATE_DESTINATION`，也不能靠改测试资料为假外链绕过。
- 修复后沿真实模板/按钮验证可信站内 route 的最终复制值和普通外链拒绝边界，再在受影响目标页确认可见反馈。照片 HTTP 失败/开发媒体注入是另一边界，恢复图片不自动修好本项。

### P2（更大 UI 范围开放项）：HR8162资料正文整块不可见

- `434c3899-4c0b-4b66-b221-00e034e064f6`、`f9906b47-fbe1-44ac-9a94-13c52331b38e` 均显示 Alderamin / HR8162、前置动作及方向/高度；分隔线以下大片区域完全没有介绍、详细事实或局部资料重试内容。
- 当前 `features/sky/spot-sky-page.tsx:650` 起声明 PARTIAL、介绍、详细资料及 facts，`features/sky/sky-object-dialog.tsx:52` 交给原生 ScrollView；布局 owner 为同文件及 `spot-sky-page.scss:1620`。不能仅靠源码存在认定真实正文已显示。
- 本审查没有当前 modal 查询回执/原生几何读回；来源页是独立可见生命周期，不能用它的有效 BSC 记录证明 modal 同次查询完整。故确认的是目标输出缺口，不认定唯一根因为 native 高度或数据，也不认定本轮来源改动引入。
- 归原 Sky 资料 UI owner 继续诊断并复验完整正常/部分资料正文，不把空白成功返回当完整资料通过。

## 实际查看的代表结果

原图根为当前私有 `starward-device-feedback-TAV3wm/starward-device-test-bCQoHb`，文件名均为 `screen-<完整ID>.png`。本代理通过 `view_image` 实际查看下列全部画面；没有把工具返回或他人文字当作实看。

| 机制 | 实看原件 | 审查判断 |
| --- | --- | --- |
| 月相入口/系统Back/稳定后 | `72e58a9b-8d18-4e3e-a246-2c5ac448f226`、`4faea919-6174-4b88-9c32-07909a622cb4`、`0ddb3aeb-ec22-43b9-b499-1859d823a2b5` | 完整日期/时间卡、月相卡及下方天气标题在相同阅读位置；即时返回的近期天气/AQ失败通知覆盖正文但没有把正文推移，后续图通知消失仍原位。本代理未测 native scrollOffset，不声称像素级全页同一。报告所记无中间输入73秒间隔来自采集记录，静态图本身不证明计时。 |
| 普通来源记录模板 | `6b1732b1-3854-4935-a144-55ba21928dc5` | 独立来源阅读页呈 Astronomy Engine / MIT、原始 URL、获取时间、真实观测夜范围、精度与限制；未知发布时间明确“来源未提供”，下方仍有另一选时月相计算记录。首屏不证明全文已滚至末尾或全部复制成功。 |
| Sky身份/来源/最终Back | `434c3899-4c0b-4b66-b221-00e034e064f6`、`28c874ec-1bd4-477c-9aa2-1bb1bd00aee2`、`f9906b47-fbe1-44ac-9a94-13c52331b38e` | 同一 Alderamin / HR8162，返回保北353.1°、高度49.3°与非空原星图。源页保 BSC5P第五版预备版/HEASARC、来源专用使用说明、可换行完整 URL、已知获取时间；未知发布/适用不补造，精度/测光系统限制仍在。明确“部分资料未加载”与重试保留，不认证全资料/全部SAO成功。 |
| 媒体权利模板/原文Back | `80fb97a9-bb3e-4677-b51a-3e31b848346d`、`e92f1da7-bf06-4356-b293-ba4d69dcf947`、`d0987529-effb-42fb-a7b3-d6e8ec2711f5` | 原文保设施条件和核验、照片短署名、许可及本次隔离资料的非真实现场说明。独立“照片来源与许可”页保作者、许可、现场归属和未知拍摄时间，无伪造获取时间。Back仍在同一文章设施/照片段；两图存在轻微纵向位移，缺原生offset/稳定边界证据，不认证精确阅读坐标，也不凭此判定新的大幅恢复缺陷。照片本身均失败占位，不能认证图片/查看器成功。原始出处复制存在上列P2。 |

同时实际查看私有 `r19-ui-20261022/gen7-source-return-review/frame-2.png`、`frame-5.png`：2秒样本在源页向右退出中已露出非空星图/星座画，5秒样本恢复原 HR8162 modal，暗星失败通知保亮星可用含义。2秒样本原 modal 尚未恢复；这些有限抽样不认证首解码像素、所有中间帧无空白、精确转场耗时或完整 modal 连续性。视频前段有采集助手输入准备，不能拿文件时间直接作交互延迟。

## 共用责任与数据核对

- 月相、文章媒体与 Sky 使用同一 i 图标、44Px圆角方形入口结构；实际画面呈现同一几何家族，普通 DAY 深色图标和 Sky 白色图标按既有主题对比度变化。代码 `SourceButton` 统一 SharedButton、重复/失败保护，Sky旧 `.sky-image-status button` 覆盖已排除 `.source-button`。这些图不测量44逻辑像素或80/140ms，也不认证按压取消/长按/全部消费者。
- `navigateToSource` 统一 native navigateTo、串行与事件交接；普通内容走 `spot/data-source/index?reading=1`，Sky仍走原精确版次 route/领域资格适配。真实截图是完整页面并具独立页头/Back，无旧内联长来源或来源Sheet。本代理只审既有证据，未独立观察完整原生页面栈。
- `SourceDocument` 复用完整 SourceSummary 与 text/facts/links/forecast；`SourceDocumentContent` 共用阅读骨架及固定媒体事实/权利链接模板。ArticleMedia 只以 capturedAt呈“拍摄时间”，没有把它变成 retrievedAt。来源未知字段没有为模板完整而填当前时刻。
- `uniqueSourceRecords` 按全记录判等：同ID不同获取/发布/适用/状态/许可/署名不会合并；普通交接验证并复制当前记录，TEST_FIXTURE过滤没有把SAMPLE_DATA改写成真实数据。本次没有在手机构造同ID异版输入，故该项为代码已核，不是目标组合验收。
- SourceDocumentReadingPage 按账号、Map reset、选点与Context ID/revision/fingerprint校验，hide/身份变更/卸载清正文、退休并拒迟到交接；没有正文URL/storage/全局registry。Map锚点/两轴及Sky保Canvas/精确来源资格仍归原owner。实看支持本次月相与Sky最终恢复，不能由此关闭所有生命周期或内存义务。
- 必要短署名、预警业务正文、设施与分享说明继续归原内容。媒体原图实际保短署名；其他消费者的源码迁移已有前序独审，本报告不把未实看的全部场景写成目标通过。

## 资格与后续边界

当前按实施记录为 gen7同包成功绑定的 **development_feedback**，bundle `8bd0e15d9a0ad5f3ccde4d61eb9f7226c11903c6ee9b0b84120107ce578547fe`。本代理未读回手机完整包字节或runtimeAppID，不授予 settled-candidate资格。没有重复既有构建、全套测试、官方预览或设备操作；唯一新执行的行为边界检查为上列实际URL的现有validator结果。

来源模板内容/最终返回的局部有效，不关闭已确认P2、照片HTTP实际成功、精确首帧/按压时序、全部主题/设备/消费者、最终Map/My导航、叠层连续性能/内存或Sky六字段/播放/内存。My方向选择及既有完整Goal剩余项仍由HANDOFF持有，不由本报告代选或取消。
