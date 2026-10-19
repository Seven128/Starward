# R17 scene memo 生命周期对照

当前决定：保留候选并暂停该对照，不作为默认下一试验。已完成完整构建与独立源码审查，并曾绑定generation24；本试验尚无有效Sky采样或内存结果，未采用为产品修复。后续先按[PLAN](PLAN.md)取得正常产品语义下的Sky归因样本，仅当新证据使memo归属对照能区分剩余解释时重新选择。当前设备/会话事实及用户暂停边界以[HANDOFF](HANDOFF.md)为准。

gen23在完整React state/direct action、非空BSC/SAO/名称且native measure为零时仍增长，见R17-ACCEPTED-ACTION-RESULT。连续时刻会创建新的local scene；原currentFrames为全局WeakMap，派生值含lazy transform/points及回到scene的closure。正常ephemeron应允许回收，这不是强保留或WeakMap缺陷证明。

对照仅给attachSkyCatalog刚创建的local scene挂私有、不可枚举Symbol cell，原get/set仍缓存该scene的当前frame；手工/legacy scene仍走原WeakMap fallback。不增加全局strong scene/frame引用、任意条目预算或历史；scene/frame普通cycle随其实际owner存活。原时刻/几何校验、完整数组/lazy accessors、消费者、完整accepted state、CPU Scene、资源需求/退休与RAF保持。

完整source以gen23封存manifest为直接parent，逐项核验1567源绑定，不重走历史sibling。source在tmp/r17-scene-memo-trial/source；4项delta是stellar memo入口、新helper、既有probe有限memo owner与controls。完整build bundle为c3298cd6904b308a49a44c1818131aa95106c4dfdfb349f94f2d94cd0952c763；预构建binding与bundle bytes仍分别记录。完成状态以tmp manifest result、R17-SCENE-OWNED-MEMO-INDEPENDENT-REVIEW及HANDOFF为准；早期PREPARATION顶层布尔值存在滞后，不覆盖这些实际证据。

有限本地契约整模块导入parent/candidate及各自原catalog client，复用原公开fixture准入8404行BSC。4组完整角数组逐值一致；实际frame-facts、live scene交错身份、invalid-time不侵害旧memo、冻结scene、JSON/Object.keys、clone/legacy A→B→A及observer冲突通过。完整4项delta的类型对照20→20、新增0，完整build与源读回已完成；独立审查未发现阻断有限诊断的源码缺陷。这些是既有软件/构建证据，没有GC、堆或目标内存结论，本次计划修订不重跑。

既有v2 collector接入白名单memo标量：scene创建/拒绝、owned/fallback读写及已有值读取、真正at-match复用、lifetime创建和reset。保first/last两份numeric capture，不保scene/frame。原三owner v2兼容，新mode要求memo owner；当时9项probe/collector及严格TS通过，旧gen23模板原字节保存在tmp/probe-v2-gen23-preserved。历史8797加载该协议后的原gen23 metrics/terminal重试200、非法memo字段400且19文件不增。后续v3软件修订、服务变化与8791不可达分别由当前方法记录和HANDOFF拥有；历史session不证明当前服务或账号就绪。

重新选择本对照的条件：新的实际归因证据指向该memo归属责任，并能说明保留与改变该边界会导向哪些不同的下一动作；准备完成或前一项阴性不足以满足该条件。若之后被重新选中，仍须核当前源/候选/目标绑定、真实非空负载、owner创建/写入、可解释fallback及same-at复用，并保产品guarded Pause及ready/play/drain分离。结果只回答该归属假说；任何修复都须回到完整正常renderer/copy/caption/accepted路径验收。R17 A/B及全部原义务保留。本次仅修改计划说明，完成后停在实施前。
