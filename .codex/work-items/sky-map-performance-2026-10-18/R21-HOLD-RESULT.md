# r21 全天空跨日长按：局部绘制下降，整体响应仍未通过

2026-10-21，独立只读分析。**r21 没有证明极限长按更跟手。** 相同全天空夜间起点下，draw 中位数从 r20 的 30 降到 26 ms，但首次 accepted 中位数从 151 升到 174 ms，输入接受数从 15 个中的 9 个变为 17 个中的 7 个。续帧平均 draw 有下降，包含输入／资源 effect 的平均 draw 基本未变。不能选择局部好数字，把跨日供给和首帧等待标为已修好。

该结果也不能单独断言新缓存造成回退：两次实际输入数量、结束日期和 effect／续帧组成不同，完整请求缓存、进程调度条件未控制。新增工作集仍需普通 Play 不命中时的完整成本检查。B 的 retained graph／churn／native exit 原因继续未明，无泄漏未验。

本次只读取源码、冻结包和已有手机原件，复用既有离线视频解码入口。没有操作手机、IDE、服务，没有修改生产、工具、PLAN/HANDOFF，没有构建、推送、提交或上传。结构化结果、逐输入阶段和读回身份见 [JSON](R21-HOLD-RESULT.json)。

## 身份与有效工作

- 正常 r21：source `502d9d644785e33af7ce1537bc1899a738725cc752d42daefaf95d66baee3448`；完整本地 bundle `5a9f4b6bc8eb3e9c4dc8c3595467476d74e4664cd4db0c959a060ee0a83f99c1`，337 文件、5,034,239 B。manifest SHA `9ef149422a237a78c6469a61a87906d64121ef807bf5a9a758aad443bc60d9e5`。独立核对冻结 1,589 份源码、重算 source identity、完整 bundle 指纹及本地反馈 generation／手机 session 绑定，均匹配；手机唯一 r21 标签沿用 root 的实际核验。这不是从手机读回全部二进制或独立验证运行中 AppID。
- receipt 严格协议有效，compact **32,755 B**，收集窗口 **15.011 秒**；Date.now wall elapsed，无观察到倒退，无已确认的有效分辨率。低于分辨率读数继续 unknown。
- 实际 CSS 尺寸 384×796.800，FOV **264.355°**。原件可见全天空、夜间星点和地景边界。BSC 全 8,404 行、SAO 2,675–2,842 行及 103–105 tiles，与 r20 相同范围及 publication。模式字段 `DAY` 不代表白天无星负载。
- 两秒日减长按，显示日期 2026-10-21 → 10-04，时分秒保持 20:18:38；17 个 intent 从相对 1 至 1,987 ms。最终 intent 于 2,162 ms 首次 accepted，差 175 ms。7 个不同 instant 被接受，3 个已晚于下一 intent；10 个未接受。42 次 paint／native ready copy，真实提交 BSC 239,099 星点、SAO 3,721 星点；accepted pick 分别 198,952／1,782。未记录 failed frame／invalidation，不是空载或冻结路径。

## 同一计量边界的对比

|指标|r20|r21|
|---|---:|---:|
|intent／首次 accepted／其中已落后|15／9／4|17／7／3|
|首次 accepted elapsed，p50／p95|151／203 ms|174／252 ms|
|draw，p50／p95|30／40 ms|26／50 ms|
|包含 effect 的 paint 数／平均完整 draw|22／32.68 ms|15／32.20 ms|
|只有 continuation 的 paint 数／平均完整 draw|23／29.43 ms|27／25.04 ms|
|continuation 的 traversal 已知 subtotal／观测次数|355 ms／46|289 ms／54|

r21 draw 42 次均有有效 elapsed，17–58 ms，subtotal **1,159 ms**。两个 draw 计时边界本次恰好同值，不改写 r20 原有 1 ms 边界差异。星点 traversal 共 84 次，72 次有效、12 次低于分辨率；submit 1,970 次，108 次有效、1,862 次低于分辨率。全部 paint 已分类，没有 unbound 或 nested paint。submit 可能嵌于 traversal，均位于 draw 内，不能把三份 subtotal 相加成互斥 CPU 分解或物理 FPS。

续帧平均 draw 约下降 14.9%，其 traversal 已知 subtotal／paint 由 15.43 变为 10.70 ms，方向与当前精确视图准备的复用相容。但 effect 类不等于 cache miss，continuation 类也不等于 cache hit；没有新增命中率计数，不能倒推每帧命中。effect 平均值几乎不变、首次接受分布未改善，所以这只是局部观察，不能完成 A。

## 剩余时间花在哪里

geometry recorder 共观察到 67 个事件，导出 61 个，**末尾 6 个明确省略以维持 32 KiB 协议上限**。摘要计数为 17 请求、停止时 0 pending；导出的前缀包含 16 call、7 validated、8 abort、8 reject、6 current hook assignment。不能从已接受最终日期补造 request 17 的 call／validation／admission 时间，也不能将 7 个导出 validated 当成全运行总数。

下表来自同一 receipt 的实际 intent／request／preparation／accepted 关联。单位均为 ms，空缺表示未导出；`<分辨率` 不是零。这里的 paint→accepted 是现有消费者入口到首次 accepted 的区间，不是独立 CPU 或物理像素呈现。

|intent|输入→call|call→validated|validated→hook|presentation 准备|准备完成→paint|paint→accepted|总计|
|---|---:|---:|---:|---:|---:|---:|---:|
|1|13|155|4|3|24|53|252|
|2|17|38|3|<分辨率|30|47|135|
|6|18|40|4|1|45|43|151|
|7|42|66|27|1|13|35|184|
|12|18|34|2|1|44|40|139|
|13|28|68|26|1|18|33|174|
|17|—|—|—|1|33|58|175|

因此不能把残余等待仅归为 GPU、RAF 或请求网络。已完整关联的六个接受输入，在 geometry 准入前花了 54–172 ms，准入后的准备、排程和 paint→accepted 仍花 49–89 ms；logical call→validated 包含客户端请求与校验，并非网络／后端耗时分解。现有 A correlation 的全部七个有效样本给出准备→request p50 13 ms、request→paint p50 17 ms；无需再造同层级 probe。

另外，intent **3、8、14** 的 logical request 分别到输入后 **105、106、105 ms** 才启动，此时下一个 intent 已到，随后均被取消而未消费。r20 也有两个类似过期启动，因此不能说它是新缓存引入。导出前缀中的一个已 validated 结果也未取得 current hook assignment。这将下一段排查指向现有 **geometry current-demand／Query 启动和准入责任**，不是继续改星点元组或删动画帧。

24 份 presentation 准备里只有 7 份被消费，但另外 17 份的已知成本合计仅 **1 ms**，其余 16 份低于分辨率。现有数据不支持因“未消费次数多”搬迁 preparation owner。50 次 Page 更新全部回调完成、最大 pending 3、callback max 110 ms，也不足以单独归罪于 setData 或建立新的写入者。

## 实际画面与下一决策

原片请求录 10 秒，实际仅 **4.849589 秒**。独立查看前后全幅及六个有效媒体样本：媒体时间 0.373344、2.457756、2.899222、3.464911、3.997667、4.796878 秒分别显示请求日 21、20、15、10、06、04。星图有中间位置变化，15／10／06 日样本仍显示“更新中”，末尾 04 日进入预览。下方 accepted 反馈只显示时分秒，不能凭该字样识别正在画哪一天。视频媒体时钟未硬配 collector 时钟，稀疏样本不认证流畅或物理 FPS；最终追上也不代表每次长按输入及时呈现。

下一步保留当前候选为**待验证**：先完成普通 Play 的精确时刻持续变化检查，关注新增列表／包装无命中时的完整 draw 和分配成本；本证据没有完整匹配的 Play 前基线，不能把长按续帧收益外推为播放收益。同时沿已有 geometry owner 审查过期启动与准入滞后：复用当前 Query、取消和最新意图事实，保留最后有效画面及最终准确时刻，不另建供给／accepted writer。若进一步决定请求侧优化，先把所需的请求内部证据和关联边界说明白；本次 logical elapsed 尚未区分后端、传输与客户端校验。不要凭这些计数添加任意防抖、压低更新率或再补一次总体成本录制。

**B 未关闭。** 这次没有 heap／retainer 原件，没有解释 r13 allocation failure，也没有普通播放 steady tail／drain 和完整生命周期结论。当前单份准备工作集的逻辑上限不能当作全页面 retained heap 上限或无泄漏证明。六字段完整极限场景、正常 Play、三层叠层及完整 Goal 仍未验收。

四份必要原件共 **2,410,687 B** 已存入私有 `device-resume/r21-hold/review`，逐份 SHA-256 读回匹配。冻结 r21 源码复用原目录；派生图片与分析脚本留本机。无上传。
