# SDSS 原生正文延迟、公开缩放取消与恢复

同一干净 v29 已取得本地开发证据：M63 细图响应头已到、正文未到时，页面保留中档影像；公开缩小倍率在 16,779.7ms 结束真实请求，未等到 30s 自动释放。再次放大后取得完整细图，native 文件摘要与原出版一致，实际画面有细层作用。自然点选、绑定来源和返回保持同一 M63、时刻和视角。

本轮没有修改产品代码、重新构建或新增来源。仅新增云观星任务验证脚本、原始证据并更新唯一 PLAN。v29 的生产输入、包指纹及其它分包保持；地图 CSS 仍为 SHA81283f7b…，v27 未采用。全部 33 项原义务、商业取舍和排除理由保留；大字号继续暂停。真机不可用，没有设备、预览、上传、云部署、Git 提交或新的 Agent 派发。

## 原生结果及证据限制

| 用户操作和结果 | 实际证据 |
| --- | --- |
| M81 搜索、资料、定位及三级影像 | 05:00 时方位22.6°/高度27.6°，M81/NGC3031。定位沿用当前0.05°，首先下载DETAIL；随后公开缩放进入MEDIUM/OVERVIEW，三个真实200分别为9,699/19,127/19,785B，native摘要及各自真实视场对应出版 |
| M81 退出再进入 | 1.4°退出SDSS后对应文件释放；再进0.46°/0.15°，native重新持有对应文件，但没有新的代理影像请求，属于运行时immutable HTTP缓存命中。不能用它认证网络取消，也没有人为清缓存或拼接cache-busting URL |
| M63 公开时间、搜索和中档 | 公开时间尺实际第15行19:00提交一次PUT200，civil/观测夜均09月29日，UTC11:00/revision3。实际M63/NGC5055高度15.8°/方位309.3°，0.15°中档真实200/20,559B，native MD5对应原出版 |
| M63 细图正文延迟 | 公开双指放大至0.05°；真实SDSS图片GET/200、声明18,522B，但正文0B/未完成，held1。中档文件仍在，细档文件尚不存在，SDSS已绘状态保留；原始捕获实际显示中档放大画面 |
| 公开缩小倍率取消 | 返回0.15°，真实请求结果为downstream-cancel/16,779.7ms，正文0B且未完成；held/active归零，中档和其它encoded文件集不变。回到中档的同候选星图区0像素差；不是任务控制释放、自动deadline、代理探针或隐藏应用 |
| 再次放大恢复 | 新的真实GET/200完成18,522B、field0.0568888889°；native MD5 dbc83e86…对应发布DETAIL，保中档。与同一0.05°延迟期间画面相比329,290像素改变，最大通道差41，证明细图进入真实绘制 |
| 自然点选、来源、Back | 官方SDK以实际Canvas size/offset测得中心195.2/422触控，得到M63/NGC5055/Sunflower Galaxy。来源为该对象SDSS出版，CC BY4.0/历史g/r/i/北上东左/有限中央视场及未测覆盖明确，实际标准字号来源原图已看。Back仍M63/revision3/19:00/0.05°，星图区0差，细档文件仍对应原发布 |

恰好一次细档延迟取消及一次新的公开恢复请求，没有自动重试循环。请求记录sequence174/175，取消前的中档为171；代理探针均标记，未计作原生请求。声明字节和HTTP200头不等于正文完成，取消后的upstreamEnded表示上游已退休，不表示收到完整图片。

像素比较只在同一v29/SDK3.17.4的427×919原图中取x4–423/y100–890，排除host时钟/胶囊/圆角，不缩放、不跨对象或时刻比较。全部8张原始捕获已由主Agent实际查看，属于自查。来源返回后隐藏页面的旧中档owner释放、细档按实际新owner保持；文件数不是GPU/native内存或性能指标。

M63中档在0.15°仍有可见的有限切图边界，不能凭本轮网络正常认定矩形/整场质量通过。M63总览的源红条带、M42有限条带/饱和、W3源块状条带及真实配准/覆盖/辨认义务保持。下一步先用已存原图、真实视场与共享显示owner区分源结构、有限覆盖边界和显示接缝，再决定必要修复；不以隐藏对象、伪造mask或扩大淡出冒充完成。

星空原生截图仍是Canvas-only，普通控件、名称和modal组合没有显示验收；WXML与公开SDK操作不能替代目标合成。独立来源页的实际标准字号显示另有原图。真机/OS后台/真实旋转校准、原生解码/GPU故障、目标首屏/资源/性能、官方包体/费用和最终必要独立审查仍未完成。本轮无新的耐久架构事实，不为运行检查点另增Context或竞争计划。

## 当前恢复点

唯一v29/PID25916，候选SHAe5e2baaf4feab03c82ad8dc8bd8faa657e995207fe38a338d744630b6bea75b5，257文件/4,486,805rawB，106生产输入哈希保持。正式公共示例点22.4826799N/114.5557147E，民用2026-09-29 19:00 Asia/Shanghai，观测夜09月29日，UTC2026-09-29T11:00Z/revision3，M63中心0.05°手动。DAY/标准字号；星座/地景/地平意愿ON，W3/赤道OFF，无跟踪/modal/list/timepanel。4082亮星目录对象/3目标不是当前绘制数。

Context ID摘要c5c224f7…及fingerprintc197391c…与本轮起始v29相同，公开时间由revision2/次日05:00变为revision3/当日19:00；不冒称保持原时刻。8791/PID4924/exec17379/controller64485、epoch2026-09-29T09:14:20.175Z保原8789 Context。当前epoch PUT2、statuses[200,200]，第二次是本轮19:00提交；旧epoch/v28记录仍分开。source/context/resource均pass、settled、held/active0、totalObserved180；共享服务未动。

[冻结验证](experience-sdss-cancel-native-validation-2026-09-29.json)、[固定候选](experience-combined-clean-v29-candidate-2026-09-29.json)与[前轮共享重试修复](experience-sdss-image-recovery-2026-09-29.md)为入口。新trace83事件，SHA4f9e480f851ce9fd36f6817ac603fea5d42f6d5dcef8551a1859927df881d333，已冻结，不再追加。此前v28/v29的48/75事件及17原图保持原范围。一次时间面读取误用选择器的工具失败已记录，随后按实际Sky时间层恢复；不伪装为产品故障或悄悄丢弃。

原始捕获：

- [M81总览](experience-v29-native-sdss-cancel-m81-overview-2026-09-29.png)
- [M81中档](experience-v29-native-sdss-cancel-m81-medium-before-2026-09-29.png)
- [M63中档基线](experience-v29-native-sdss-cancel-m63-medium-before-2026-09-29.png)
- [正文延迟时的中档放大](experience-v29-native-sdss-cancel-m63-held-detail-2026-09-29.png)
- [公开取消回到中档](experience-v29-native-sdss-cancel-m63-medium-after-2026-09-29.png)
- [细档恢复](experience-v29-native-sdss-cancel-m63-recovered-detail-2026-09-29.png)
- [绑定来源原生显示](experience-v29-native-sdss-cancel-m63-bound-source-2026-09-29.png)
- [来源返回](experience-v29-native-sdss-cancel-m63-source-back-2026-09-29.png)

Goal active、无预算、未完成，下一依赖只由[唯一PLAN](../PLAN.md)维护。
