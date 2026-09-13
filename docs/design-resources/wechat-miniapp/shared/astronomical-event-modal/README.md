# 地形、B行图标与天文事件 · 完整增量修订

[统一交互审阅](review.html) · [完整地图](../../map/revisions/three-requirements-2026-09-13/preview/index.html?map=1&browse=1) · [完整观星点组件](../../map/revisions/three-requirements-2026-09-13/preview/index.html?map=1) · [完整计划编辑](../../plan/revisions/three-requirements-2026-09-13/preview/index.html?view=edit&id=p1)

本轮最终增量设计已于2026-09-13由用户确认采用。完整需求包括三个功能变更点，以及整体UIUX校验、Context对齐与补开发，见[开发说明](../../../../requirements/miniapp-uiux-alignment-2026-09-13.md)。此前被否定的简化地图/计划宿主退出当前资源，旧preview.html只转入完整资源。生产页面已接入共享事件Modal、真实DEM链路、B批图标与公共Tab；WEAPP模拟器及Android真机的实际证据和仍未验证条件由本轮任务记录维护。

| 需求点 | 产品与技术责任 | 当前设计资源 |
| --- | --- | --- |
| 地形同级章节、俯视地形/光污染、独立地形叠加 | [地形产品](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#地形以可获得数据为边界)、[数据与实现](../../../../../project_context/architecture/runtime-and-domain.md#mini-program-terrain-and-directional-light-evidence) | [完整Map修订](../../map/revisions/three-requirements-2026-09-13/preview/../README.md)、[数据研究/图形说明](../../map/terrain-2026-09-13/README.md) |
| 最新B行、256px透明资源与原动效 | [共享图标](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md#shared-icon-resource)、[接入边界](../../../../../project_context/architecture/runtime-and-domain.md#mini-program-b-matte-icon-integration-boundary) | [71份采用包及可编辑来源](../icons/ADOPTED.md)；Map/Plan/Modal在原控件上消费 |
| 地图浏览、计划单选的大Modal | [共享语义](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md#shared-astronomical-event-modal)、[架构/迁移](../../../../../project_context/architecture/runtime-and-domain.md#shared-astronomical-event-modal-implementation-boundary) | 共享[modal.mjs](modal.mjs)/[modal.css](modal.css)，[完整Plan消费者](../../plan/revisions/three-requirements-2026-09-13/preview/../README.md) |

## 增量范围

完整地图以2026-09-09当前采用源为基线，保留地图移动/缩放、点位身份、完整基本信息、三档拖动、设施照片查看器、原天文/月相/时间尺、底部动作与新增/反馈编辑。地形插在基本信息之后，扩展同一章节导航。地图工具沿用原显示时机；关闭点位面板后可见新增小流星。原光污染/云量卡片和时间控件保留，地形另设复选。地形形状、图层颜色与夜光格网是隔离的设计示例，未代表真实地形或光照结果。

计划以同日当前采用源为基线，保留列表、详情、地点/起止/出发/交通表单、到达冲突、提醒清单/状态、备注、保存/取消/返回。只把事件入口改成共享Modal。编辑时独立radio单选，确认回填草稿，保存才写入预览会话；关闭丢弃临时选择。只读计划浏览已关联事件，无改选动作。浏览与选取共用一个组件，消费方不复制弹窗。

事件列表/详情保留月份、活动期、日期精度、日期条、当地条件缺测及来源。卡片主体查看，详情同壳向左切入；返回保留列表位置。选择模式固定计划地点/日期，浏览只更改modal内的副本。Map无私人关联状态/计划写操作。当前目录fixture仍为已核对六条流星雨，日月食等生产已支持类型不能因此裁掉。期望状态及生产失败/取消/账户边界以Context为准。

## 来源与核对

原Map/Plan源保持不变，新修订包各有source-diff.json记录文件及哈希；未改源文件和依赖继续直接复用。HTML演示的iframe及复制文件仅用于独立审阅，不是生产组件拆分方案。共享日期/图标/事件模块仍从一个源导入。

Stitch已同步当前精确参考及规则说明，状态、节点与清理范围见[同步记录](stitch-sync.md)。当前可编辑交互由本目录及完整Map/Plan源持有；Stitch截图索引不冒充可执行共享组件。未采用的生成原稿和简化宿主在定稿时清理，当前[来源记录](provenance.json)保留必要来源说明。

设计检查：[结果](verification.json)、[地图大档](reference/map-large.png)、[地形](reference/terrain.png)、[计划完整编辑](reference/plan-editor.png)、[计划单选](reference/plan-single.png)、[事件详情](reference/detail.png)。脚本为`.codex/work-items/three-requirements-2026-09-13/check-repair.cjs`，只证明浏览器设计原型。生产另有服务端历史多关联回归、WEAPP browse/select-one/list-detail交互、非透明RootPortal外壳回归及Android原生Map地形合成证据；Android物理系统Back已实测详情→列表→地图两级返回。焦点恢复的无障碍读屏结果、快速重开、前后台、减少动态效果、iOS和物理平板仍需单列验证。

本轮反馈修订：观星点large各身份、有图/无图均全宽方角；图层sheet单一方角外壳。地形为北向上方形地理图（外圈半径默认5 km，2–50 km刻度轴拖动）；按用户最新反馈移除方向/角度分析，地形和光污染为精修后的独立图标多选项。共享Modal进入240ms淡入+.97→1轻放大，退出180ms反向，遮罩同步；关闭完成后才释放焦点/模态拦截，快速重开取消旧关闭，减少动态效果即时呈现。上述设计规则已映射到生产组件，运行证据仍按实际观察范围陈述。

公共Tab激活反馈按用户要求集中在[共享Tabs](../tabs/README.md)，当前完整观星点与地图表单章节复用；激活项轻微放大、失活缩回，相邻锚点稳定。天文及其他本轮消费者的图标漏项和保留的数据图形见[应用检查](../icons/application-review.md)。
