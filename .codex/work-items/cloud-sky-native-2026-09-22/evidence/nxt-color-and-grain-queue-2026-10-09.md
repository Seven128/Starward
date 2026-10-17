# 按需NXT：颜色边界、整区粒度试验与现复核队列

复用已选RC CLI 2.6.9、NXT ML3.1及原SXT/区域/coverage输出，没有重新工具选型、SXT、PS、取图或出版。该开发阶段接到现`image_quality.py`复核/异常责任；尚无新的NXT生产加工/producer合同，普通采用false，全部33项不提高。

## 颜色与执行边界

已看旧M8 512² NXT0.5 smoke与同源SXT，粒度改善有限，不直接采用。旧输入有588B ICC、vendor PNG无ICC的事实保留。当前配对控制仅改变相同RGB8像素的ICC标签存在与否，在当前已绑定sRGB显示空间用一次真实原生批调用、两文件、denoise0.5/iterations1/GPU/ML3.1/overlap0.2/8U。两输出RGB逐通道差0，PNG字节/hash也一致，并与旧smoke完全一致；98559像素实际变化，不能以未生效的回传图证明颜色路径。当前tool/model/runtime与来源、两私有输入、实际事件和产物保留在`output/nxt-color-boundary-2026-10-09/`；旧smoke未绑定完整CLI执行二进制的缺口不倒填。

该实证只支持当前CLI/model及明确归一化sRGB RGB8的数值解释；不是其他profile、位深、alpha或科学色彩的通用保证。后续复用现RGB颜色encoder补回原绑定ICC，保存后按真实RGB及ICC逐字节读回；新review拒绝vendor非空且与原ICC冲突的标签，不能盲重贴。现代CLI支持PNG和批处理的[官方说明](https://www.rc-astro.com/stand-alone-rc-astro-tools-installation-instructions/)建议已拉伸数据优先16位；本试验沿已存在RGB8 SXT工作图，不称其为所有输入的最佳位深，不从8位图片造观测细节。最初猜测的CLI专门手册路径不可访问，未将其作已读依据。

## 一次有需要的完整区域试验

已缓存621×1342 M8区域的SXT后工作图为输入；原722800不透明/110582透明样本及独立供给0缺瓦片保持。只针对已观察粒度异常，不把M61残晕或NGC5128残环当降噪问题。denoise0.9/iterations1/ML3.1/GPU/overlap0.2/8U一次批调用、1文件；不裁图、缩放、重新SXT或生成LOD。原覆盖之外零padding只给模型上下文，最终隐藏RGB归零、原alpha逐像素差0、ICC精确保留。

实际变446114像素，final RGB PNG1,125,140B、covered PNG1,285,964B，SHA分别`faebb5c7f03d65df482d1a0086537d3c3f7d6836ab6ef3a565f7d7fca07ed4e6`与`5d39eae159feb4de288e562cb288480c271d5c384107c5d1e595c461cc6f2025`。native中间原始PNG、工作输入、三个实际执行源码快照及全部旧成品保留。root查看完整原图/SXT/NXT及三处160²的2x nearest局部：粒度明显减弱，中央主要暗结构仍可见，但密星区纹理趋平、残点非均匀。只记录粒度IMPROVED，文件仍NEEDS_REPAIR；不是全局细丝、科学、Scene、融合或独审通过。不继续同配方/参数循环。

颜色控制native wall3.160s、50ms进程树RSS采样下界419,979,264B；整区native wall2.741s、采样下界436,015,104B。shared页可重复计数，GPU物理峰UNKNOWN，不外推吞吐/净内存/全机容量。两次调用共三文件，原图/model获取0、SXT0、PS0、publication0。数据归一化/编码/看审及当前queue检查另计；没有编造审核时薪或全库异常率。

## 共用队列与合同保护

`nxt_review.py`只读验证已生成试验→原SXT receipt→实际post-SXT模型输入→NXT vendor→RGB/ICC final→原coverage链；不同row保留有效结果。它复用原source/颜色/SXT像素/coverage责任，当前只准入该显式有界试验形状，不新增NN实现或另一个看审系统。现`sxt_batch.py --review-from ... --decisions ... --output ...`直接进入同一`processing_review`；输出独立`nxt-review-queue-v1`和`MISSING_DISTINCT_NXT_CHAIN`，既有SXT-only/PS-restored/派生producer不能把这张图冒自己的加工合同。文件看审与出版准入分清，即使fixture人为file pass，旧publisher仍按schema拒绝。

加工key保存实际immutable trial/recipe/tool/输入依赖，当前import validator另记`processingValidator`，不得冒其为历史native执行或因守卫修订推理旧图。早期review用当前validator放入key的表示已纠正；同bytes/outputs的原NEEDS_REPAIR决定经显式`decisions-current.json`重绑定，原执行/pending/早期decision/review全部保留。当前`output/nxt-grain-exception-2026-10-09/current-queue/review.json`读回NEEDS_REPAIR1/HARD_CHECK_FAILED0；接线过程0新增模型/照片编码/出版，诊断review PNG随source/表示变化重新生成，不计为新图片加工成功。

首轮27检查覆盖新4/既有SXT15/coverage3/PS恢复5；新census、冲突ICC及validator身份边界后仅复跑NXT，最终7/7。不同检查共30项，旧源码epoch的日志不冒当前重新完整跑过。单像素fresh hash篡改、假alpha、错误stage输入、冲突颜色和错误调用count都拒绝，有效其他行保留；换validator标识不改native key。无模型、真实外部CLI或PS在单元fixture执行。actual native结果与测试夹具分开。

当前science UNKNOWN、绝对配准UNVERIFIED、完整结构/Scene/原生设备/物理/独审MISSING或FAILED继续保原。当前普通注册空、HiPS关、已发布候选的旧细档/manifest/URL未替换。本阶段收口后转独立原生来源/Back义务；重大共享修后独审缺口保MISSING，不冒工具测评旧独审覆盖新接线。
