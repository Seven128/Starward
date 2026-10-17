# 菜单实现独立源码审查

用户明确批准本批只读独审并持续授权后续代码审查，无需逐次询问。审查结果只说明实际输入范围，不代替WEAPP合成、手机、物理姿态/红光或完整Goal验收。旧代理均未复用。

## r377菜单实现（已结束）

新只读代理 `/root/menu_implementation_review` 完成。输入为当前采用PNG/HTML、UI01–UI06、相关要求/Context、r377 prepared manifest及实际源/证据；15个非Map生产输入与manifest全部匹配。此轮不审当时正在实施的Map入口，未改文件、未启动IDE/手机或重跑套件。原报告如下：

> 发现两项 P2，建议在后续扩展前修复：
>
> 1. 搜索框会随结果列表滚走。spot-sky-page.tsx:3527 将包含输入框的 SkyObjectSearch 整体置于 ScrollView。采用 HTML 第 3339 行明确分离固定输入框与结果滚动区。长列表滚动后无法保持搜索入口；应在共享搜索 owner 固定输入，仅滚动结果，并保留返回后的滚动节点。
> 2. 部分控件仍继承旧蓝色及不完整开关配色。spot-sky-page.scss:2223 让开关 thumb 始终使用主文字色，关闭轨道仍继承旧 border-strong；采用源要求普通开启态为紫轨道＋深色 thumb，红光开启态为红轨道＋黑色 thumb。另外第1394行将资料跟踪按钮覆盖为旧蓝色 surface-subtle，覆盖了已实现的玻璃材质。r377编译WXSS保留这些差异。应局部补全Sky控件状态颜色，保留其他消费者。
>
> 未发现时间事务、取消、身份守卫的新确定缺陷。只读完成。Map新转场不属本次审查，原生合成、物理交互及性能仍未获证。

两项均在现采用要求内修复：SkyObjectSearch固定输入、结果/default/footer沿同一保留ScrollView；Sky局部补普通/红光开关四态、on-primary及跟踪动作玻璃。实际复核及后续Map独审结果由本文件和菜单实施证据续接，修代码本身不冒原生通过。

## Map入口及菜单修复（已结束）

新只读代理 `/root/sky_entry_and_menu_fix_review` 核最新明确授权、UI05/Context、采用源、真实Map正式/提案命令、转场owner和菜单两项修复。发现提案resolve准备期尚未纳入入口锁，重复请求可使第一fade的scope失效而第二start被拒，导致0路由；准备中Back也不能退休晚到导航。独立只读countercheck均复现。随后补查过期准备锁会暂挡新身份、查询改变缺少顶部复位，以及Sky局部thumb规则覆盖既有减少运动设置。

上述差异均在原要求和本次入口例外内修复并集中复核。以下为最终原报告：

> 本轮只读独审完成，修复后未发现范围内尚未处理的确定缺陷。
>
> 提案准备期现已同步占入口锁。准备中和渐黑中重复触发均只执行一次resolve、一次Context写入、一次导航。准备中Back会退休意图；迟到响应不写Context、不导航。身份改变可立即建立新意图；旧token的finally不清除新遮罩。AppHide只退休本Sky入口，卸载解绑；有限兜底、失败、迟到与返回清理保持。
>
> 搜索输入独立固定，结果、默认目录和来源共用稳定ScrollView。新query改变滚动锚点；追加和说明返回不重置节点。开关四态颜色及跟踪按钮玻璃值与采用源一致；新增局部规则已恢复既有减少动态效果行为。
>
> 独立真实命令提取＋真实转场owner局部结果：准备中重复resolve=1/Context写入=1/导航=1；准备中Back为1/0/0；渐黑中重复为1/1/1；身份变化新意图立即进入，旧finally不清新遮罩。
>
> 撤回把!selectedProposal面板保留条件归为本轮越界改动的意见：它已存在于r377基线，不能用相对HEAD的历史dirty diff判断本轮新增。
>
> 未运行IDE、手机、云或大套件。已发出的原生navigateTo没有取消API；本地退休不能证明系统迟到导航绝不发生。原生遮罩合成、正常速度转场、真实滚动与物理表现仍未验，原33及所有FAILED/UNKNOWN/MISSING保持。

最终源码SHA256：transition `86abc3191519c177f1d3e505e676311b921135a9543695e5dfb0105525c93fe3`，Map `fad4783a85c4b0ecc94df458f9e054f279fd10bd81e91317f15fbaed344bddff`，search `87fb14a66b5636a828afb8ca8b203ea31e04d43f57bf69ded9c4bf74dda75ca6`，Sky SCSS `94f89ff3acf59d4215f4b0fb1327b11f816b18f8e6e97fe9365cf938f9c3843c`。代理已结束，不复用。
