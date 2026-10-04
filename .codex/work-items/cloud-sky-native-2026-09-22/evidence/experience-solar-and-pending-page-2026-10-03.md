# 同一文件 owner 的月面、行星与活动 page 迟到读取

本次产品源码不变；只增加任务验证脚本、证据及对应进度/Context。r47 起点246个当前源、六项保护字节、指定工作区/分支/HEAD精确；BFF24040、watch18132仍活，无重启。Goal active、无预算、未完成；没有其他业务逻辑、提交、推送、下载、源加工、重新静态导出或云部署。

## 真实消费者与保存结果

复用最终 page/API bundles、现有真实源与静态 artifact。r13 新增月面活动读取 hide、七行星各自相机、月面暖 hide 返回；它们是未覆盖家族的增量，不重旧宽场/全天/M51五段或原九条件矩阵。r14 只修受影响的首次 pending hide 后月面恢复提交，补1项；共41软件GPU帧。所有当前271个真实输入绑定、PNG/RGBA方向/字节、同帧 publication/时刻、唯一缓存对象及最终活动资源退休由根保存读回核实。

实际 astronomy-service/adapter 生成当前地点时刻的方位、高度、角径和 body frame；没有替换位置或添虚构天体细节。config 的 `test-astronomy` version 字面值、fixture地点/天气/仓库仍保留，不冒物理天文校准或生产报告验收。月球此刻高度为-27.826824616590105°，实际相机向该方向浏览，保真实高度而不无条件裁剪。

| 消费者 | 实际已就绪影像 | 实际绘制证据 |
| --- | --- | --- |
| 月面 | coverage-v2，2048×1024 PNG | 修正 pending 返回/暖返回均使用新解码身份，moon draw 绑定实际图像 |
| 水星 | 对应表面 PNG | planet draw 使用 mercuryTexture 已就绪身份 |
| 火星 | 对应表面 PNG | planet draw 使用 marsTexture 已就绪身份 |
| 木星/土星/天王星/海王星 | 各自历史 OPAL 轴对称纬度纹理 | 各自 planet draw 绑定对应 ready/hash，不当当前纵向天气 |
| 金星 | 无独立纹理 | 现有解析外观绘制成立，不将上一张纹理的残留 GL binding 当采样证据 |

月面暖返回使用新的 image identity，图片 HTTP 为0，读取旧有效压缩文件再解码；来源与完整性仍由现有实际消费者校验。全部7个影像家族及金星解析外观实际参与，不将这次分时参与当同帧全家族叠加峰值。W3/SDSS/插画/地景的此前证据仍是此前条件；Prepared/science普通 registry 仍空。

## 活动 SAO 读取 hide、取消及迟到

在真实 SAO 文件 readFile 已拿到 UTF8 结果、尚未送达原 callback 时，由任务仅扣住回调送达；before阶段有真实待处理 page loader/文件租约，再执行当前 page Hook和 Canvas 生命周期的 hide。当前图像/已绘 frame/旧SAO owner退休，只剩1个原生读取租约；回调送达后租约归0、旧loader无 pending/loaded、页面没有新增 accepted frame。

r13最先送达的是32084 B tile，r14为8684 B tile，网络回调次序不同；各自 source hash/index/原JSON文件字节精确核，不硬编码第一 tile 身份。此处验证完成读取的迟到送达，不声称模拟了公网弱网或实际微信调度。不能由这条证据替代活动 clear/generation 与完整 Query缓存恢复。

首次 r13 的 hide 后恢复，任务只调用 commit，未提交创建新 Canvas context 的绘制，等待条件又只看 loading。结果 Moon wanted 有真源、粗 moon draw 为true，ready 图片却0：**FAILED_TASK_RETURN_SUBMISSION_AND_IMAGE_READINESS**。保存失败事实后，r14只补 `pending-hide-return-before-ready` 提交及正向 Moon image readiness；实际5帧、8388608 B图像模型和对应纹理 draw 成立，没有重跑七行星。此前无图帧不改判为月面细节通过。

## 分层资源及流量

r13时间轴独立模型峰：owner/native已注册 RGBA10502144 B、pending decode8388608 B、MapFS含暂存库存7849435 B、租约8；GL texture8404992 B、buffer384 B分别记录。结束前共同文件缓存55项/7807911 B，远低于现有32MiB。r14 Moon对应模型/账本另存；不同运行、不同层、不同瞬间的峰值不求和冒总物理资源。parsed JS、native、driver、RSS/物理回收仍未知。两次 clear 最终数据文件项/租约/队列/退休项0、全部SAO loader及GL句柄退休，留下26 B空 v2 inventory。

两次最后 report/BSC/figures 均3×304。r13 86请求/80完成/6取消，成功接收编码7725520 B；匿名 Caddy记7820671 B，剩6条已记输出属于取消的未匹配集合，实际取消接收量未知。r14最后 `access.length===requests.length` **FAILED**：30请求中25完成、5取消，日志29条；完成接收2709950 B均匹配日志，日志2753635 B，留下4条取消已记输出和1项无日志取消。没有据无日志填零、把成功字节当全部公网成本，或为计量断言重复HTTP。

根首次错误要求第一held tile固定8684 B的失败保留，后改按实际hash/index源字节核；只是任务假设修正。r14失败runner epoch保持，根只读保存结果的通过不改判原总计量断言。

## 直接证据与下一依赖

- [根读回](../../../../output/playwright/cloud-sky-solar-pending-readback-1003-r2/result.json)：41帧、实际各纹理draw、源绑定、迟到、清理及出口分项。
- [r13结果](../../../../output/playwright/cloud-sky-live-mixed-1003-r13/result.json)、[首次月面无图失败事实](../../../../output/playwright/cloud-sky-live-mixed-1003-r13/pending-return-missing-image.json)、[r13保存任务](../../../../output/playwright/cloud-sky-live-mixed-1003-r13/executed-script.mts)。
- [r14修正单项结果](../../../../output/playwright/cloud-sky-live-mixed-1003-r14/solar-moon-pending-return-corrected.json)、[r14计量失败及请求记录](../../../../output/playwright/cloud-sky-live-mixed-1003-r14/live-failure.json)、[r14保存任务](../../../../output/playwright/cloud-sky-live-mixed-1003-r14/executed-script.mts)。
- [实际月面PNG](../../../../output/playwright/cloud-sky-live-mixed-1003-r13/solar-moon-warm-return-normal-settled.png)、[实际土星PNG](../../../../output/playwright/cloud-sky-live-mixed-1003-r13/solar-saturn-normal-settled.png)已查看，不因此通过完整图质、覆盖、手机或物理科学校准。

控制端口包括React/Taro/query/MapFS/native callback/clock与softwareGL；不是完整JSX、WXML、来源原生route、手势/公开时间/跟随校准或Android/iOS验收，自审不冒独审。共享BFF最新代码加载未知，DevTools已有WXML/Canvas失败仍保原。完整图质/弱结构/背景接缝/rights及批量出版、原生/物理总资源、旧二进制回滚/200MB、容量成本都未过。

下一项实际消费者是文件 clear/generation与Query缓存恢复：已直接读取当前 `clearTemporaryApiCache`、`cache-policy.ts` 与 `use-resource-query`，当前临时根表没有 `sao-index`。须以实际QueryClient/QueryObserver与当前page隐藏/再进入/显式重试路径复现影响，再作Sky范围修复；不要用本次受控query Map冒真实清理或猜测扩通用策略。保留其他业务逻辑和设置/outbox保护项。
