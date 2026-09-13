const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root='docs/design-resources/wechat-miniapp',rev='revisions/three-requirements-2026-09-13/preview',shared=`${root}/shared/astronomical-event-modal`;
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s),change=(p,fn)=>write(p,fn(read(p)));
const ctx='project_context/areas/main/screen-contracts/wechat-miniapp';
change(ctx+'.md',s=>s.replace('2026-09-13本轮需求扩展的owner导航：','2026-09-13本轮是一个完整需求，包含地形、B行图标和天文事件Modal三个变更点，产品/技术Context与对应资源必须同时保持一致。变更基于现有采用页面增量完成：地图完整基本信息、三档拖动/单文档/照片查看、原天文内容，以及计划完整地点/观测时间/出发路线/提醒清单/备注/保存与返回不因局部改动而重构或删减。简化宿主不能替代完整页面作为当前资源；新视觉仍需用户审阅，浏览器验证不代表生产完成。统一审阅及修改范围见[完整资源入口](../../../..//docs/design-resources/wechat-miniapp/shared/astronomical-event-modal/README.md)。\n\n本轮owner导航：').replace('../../../..//docs/','../../../../docs/'));
// The screen contract is four directories below repository root (project_context/areas/main/screen-contracts).
change(`${ctx}/shared-state-and-recovery.md`,s=>s.replace('四态运行时切换尚未验收，收到不等于已采用。','四态已完成静态资源采用，生产运行时切换尚未验收。').replace('Basic-information/astronomy use one lightweight chapter navigation that appears only at the astronomy boundary','Basic-information/terrain/astronomy use one lightweight chapter navigation that appears at the terrain boundary'));
change(`${ctx}/map-and-finder.md`,s=>s.replace('## 观星计划：出行与观测的组织职责','本轮地图增量的完整可编辑消费者由[当前Map资源入口](../../../../../docs/design-resources/wechat-miniapp/map/ADOPTED.md)导航。地形插入原基本信息之后、天文之前，不压缩或删去开放/合法进入/安全、路线、设施照片、联系方式、来源和更多场地信息；沿用原同一信息组件及三档拖动。流星工具遵循现有地图工具的extent/编辑互斥规则，不为使其常驻而重构工具栏。\n\n## 观星计划：出行与观测的组织职责'));
change(`${ctx}/spot-and-sky.md`,s=>s.replace('图形和信息变化不产生新标签页、路线或滚动owner。','图形和信息变化不产生新标签页、路线或滚动owner。原基本信息与天文区完整内容、现场/设施照片及查看器、三档高度与拖动热区、底部动作和时间尺保持原有责任；新增地形不能把原页面替换成仅供地形演示的空壳。'));
change('project_context/architecture/runtime-and-domain.md',s=>s.replace('### Mini Program terrain and directional-light evidence',`### Mini Program B-matte icon integration boundary

2026-09-13图标是本轮完整需求的第二部分，采用范围及语义责任见[共享图标owner](../areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md#shared-icon-resource)。当前生产\`semantic-asset.tsx\`仍使用旧的PNG/SVG/CSS资产映射；本轮只更新资源和实施合同，不宣称生产已替换。

- 沿用该SemanticIcon/Asset入口及当前marker资源责任，按71份采用manifest建立语义/状态映射并迁移真实消费者；新增meteor/terrain等语义在唯一入口扩展，页面不能自行引入第二套素材目录。PNG由本地构建打包，交付前核对主包/分包实际归属与重复拷贝，不能把整套高清母版或图集放进小程序。
- 普通UI采用256×256透明PNG；高清源留在设计资源来源位置。现有派生是Lanczos3缩小、全彩PNG无损编码，避免再次量化/抠图或逐枚自动裁边。图片256px是源分辨率，不是控件布局尺寸；沿用原可见尺寸、内边距、至少44px命中区域与程序化标签。
- 地图四态统一画布、主体位置及原marker锚点；default/selected切换不以整体包围盒重新居中。draft/pending身份语义独立于正式点选中。想去保留既有一圈旋转/进入退出/可中断与减少动态效果，星头、尾迹、卫星分件由原动画owner分别驱动；PNG支持透明度、平移、缩放、旋转/交叉渐隐，不声称单张图可任意路径变形。
- day资源采用不扩展到night/observation。严格暖红主题继续使用原合法资产/呈现直到有合规变体，不能直接套彩色PNG或整屏滤镜；真实月相、数据图形及地图供应商标识也不由装饰性图标替换。
- 代表性验证覆盖小尺寸清晰度、透明边缘、导航非颜色状态、四态锚点、想去反复中断、不同消费者/主题以及实际打包体积。静态71份约2.11MiB的清单不等于最终主包大小；Web替换和素材像素检查不证明WEAPP渲染、动效或真机质量。

### Mini Program terrain and directional-light evidence`));
change('project_context/architecture.md',s=>s.replace('这两项为已确认需求的实施边界，尚未完成生产迁移。','以及[B行256px图标接入](architecture/runtime-and-domain.md#mini-program-b-matte-icon-integration-boundary)。三项属于同一完整需求的实施边界，尚未完成生产迁移。'));
change('DESIGN.md',s=>s+'\n2026-09-13完整需求修订边界：地形、B行图标与事件Modal基于现有采用页面增量更新。沿用完整观星点文档和三档拖动/照片/底部动作、完整计划表单及提醒流程；不得以展示新增功能为由换成删减的宿主。新增地形章节和事件承载之外不重构信息架构，图标只替换材质与对应状态。产品及资源入口见[本轮Screen Contract](project_context/areas/main/screen-contracts/wechat-miniapp.md#design-and-implementation-boundary)。\n');
// Current review must not expose the rejected simplified hosts through older links.
write(`${shared}/preview.html`,`<!doctype html><meta charset="utf-8"><title>完整增量设计预览</title><script>const q=new URLSearchParams(location.search),view=q.get('view')||'map',state=q.get('state')||'available';location.replace(view==='plan'?'../../plan/${rev}/index.html?view=edit&id=p1&state='+state:view==='terrain'?'../../map/${rev}/panel.html?extent=large&section=terrain':view==='layers'?'../../map/${rev}/layers.html':'../../map/${rev}/index.html?map=1&browse=1&state='+state);</script><p><a href="review.html">打开完整设计预览</a></p>`);
write(`${shared}/README.md`,`# 地形、B行图标与天文事件 · 完整增量修订

[统一交互审阅](review.html) · [完整地图](../../map/${rev}/index.html?map=1&browse=1) · [完整观星点组件](../../map/${rev}/index.html?map=1) · [完整计划编辑](../../plan/${rev}/index.html?view=edit&id=p1)

这是一个包含三个变更点的需求。2026-09-13用户明确要求基于原页面增量修改：此前preview.mjs的简化地图/计划宿主被否定，已退出当前入口；旧preview.html链接转入完整资源。新修订供用户审阅，71份B行日间图标已采用。没有修改生产页面、实施真实DEM接入或完成WEAPP验收。

| 需求点 | 产品与技术责任 | 当前设计资源 |
| --- | --- | --- |
| 地形同级章节、方向地平线/夜光、独立地形叠加 | [地形产品](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#地形以可获得数据为边界)、[数据与实现](../../../../../project_context/architecture/runtime-and-domain.md#mini-program-terrain-and-directional-light-evidence) | [完整Map修订](../../map/${rev}/../README.md)、[数据研究/图形说明](../../map/terrain-2026-09-13/README.md) |
| 最新B行、256px透明资源与原动效 | [共享图标](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md#shared-icon-resource)、[接入边界](../../../../../project_context/architecture/runtime-and-domain.md#mini-program-b-matte-icon-integration-boundary) | [71份采用包及可编辑来源](../icons/ADOPTED.md)；Map/Plan/Modal在原控件上消费 |
| 地图浏览、计划单选的大Modal | [共享语义](../../../../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md#shared-astronomical-event-modal)、[架构/迁移](../../../../../project_context/architecture/runtime-and-domain.md#shared-astronomical-event-modal-implementation-boundary) | 共享[modal.mjs](modal.mjs)/[modal.css](modal.css)，[完整Plan消费者](../../plan/${rev}/../README.md) |

## 增量范围

完整地图以2026-09-09当前采用源为基线，保留地图移动/缩放、点位身份、完整基本信息、三档拖动、设施照片查看器、原天文/月相/时间尺、底部动作与新增/反馈编辑。地形插在基本信息之后，扩展同一章节导航。地图工具沿用原显示时机；关闭点位面板后可见新增小流星。原光污染/云量卡片和时间控件保留，地形另设复选。图层颜色与曲线是隔离的设计示例，未代表真实地形或光照结果。

计划以同日当前采用源为基线，保留列表、详情、地点/起止/出发/交通表单、到达冲突、提醒清单/状态、备注、保存/取消/返回。只把事件入口改成共享Modal。编辑时独立radio单选，确认回填草稿，保存才写入预览会话；关闭丢弃临时选择。只读计划浏览已关联事件，无改选动作。浏览与选取共用一个组件，消费方不复制弹窗。

事件列表/详情保留月份、活动期、日期精度、日期条、当地条件缺测及来源。卡片主体查看，详情同壳向左切入；返回保留列表位置。选择模式固定计划地点/日期，浏览只更改modal内的副本。Map无私人关联状态/计划写操作。当前目录fixture仍为已核对六条流星雨，日月食等生产已支持类型不能因此裁掉。期望状态及生产失败/取消/账户边界以Context为准。

## 来源与核对

原Map/Plan源保持不变，新修订包各有source-diff.json记录文件及哈希；未改源文件和依赖继续直接复用。HTML演示的iframe及复制文件仅用于独立审阅，不是生产组件拆分方案。共享日期/图标/事件模块仍从一个源导入。

Stitch[原项目](https://stitch.withgoogle.com/projects/1643718854829580633)及[导出记录](provenance.json)、[生成输入](stitch-prompt.md)仅保留新增Modal探索来源。简化宿主不再作为完整页面依据；本轮修复复用既有完整源，没有重新生成整页。

当前检查：[结果](verification.json)、[地图大档](reference/map-large.png)、[地形](reference/terrain.png)、[计划完整编辑](reference/plan-editor.png)、[计划单选](reference/plan-single.png)、[事件详情](reference/detail.png)。脚本为.codex/work-items/three-requirements-2026-09-13/check-repair.cjs，覆盖完整基线内容对照、实际指针三档拖动、三章节、照片、浏览/单选、草稿及提醒保存、320/390/768布局。它只验证浏览器设计原型；真实服务、历史多关联迁移、原生Map合成/系统Back、iOS/Android动效仍需生产实施时核对。
`);
for(const area of ['map','plan']){const dir=`${root}/${area}/revisions/three-requirements-2026-09-13`;write(`${dir}/README.md`,area==='map'?`# 完整地图增量修订\n\n[地图入口](preview/index.html?map=1&browse=1) · [观星点信息](preview/index.html?map=1) · [统一审阅](../../../shared/astronomical-event-modal/review.html)\n\n基线为[2026-09-09当前采用源](../../candidates/context-audit-2026-09-09/CURRENT.md)。保持原Map与完整信息组件、手势、照片、天文内容、表单及底栏，在原owner中增加地形章节和三项导航、独立地形checkbox、meteor入口及对应B图标。preview/panel-gestures.js保持基线原文；preview/chapters.js扩展原章节导航，terrain.js只持有新增图形。layers.html保留原完整图层源与时间控件。\n\n新视觉供审阅；地图图层、角度和灯光为设计fixture。原生合成、真实DEM及精度尚未实现。源差异见[source-diff.json](source-diff.json)。\n`:`# 完整观星计划增量修订\n\n[编辑](preview/index.html?view=edit&id=p1) · [详情](preview/index.html?id=p1) · [列表](preview/index.html) · [统一审阅](../../../shared/astronomical-event-modal/review.html)\n\n基线为[2026-09-09当前采用源](../../candidates/context-audit-2026-09-09/CURRENT.md)。完整表单、出行、到达冲突、提醒/清单及保存/返回复用原源，只把事件入口改为共享Modal并替换对应语义图标；浏览已关联项直接打开同Modal详情。eventOccurrenceIds单项及历史记录迁移属于Context的生产要求，浏览器模拟保存不证明数据库迁移。新视觉供审阅，源差异见[source-diff.json](source-diff.json)。\n`);const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const base=`${root}/${area}/candidates/context-audit-2026-09-09/preview`;const files=fs.readdirSync(`${dir}/preview`).map(file=>{const orig=`${base}/${file}`;return{file,baseline:fs.existsSync(orig)?orig:null,baselineSha256:fs.existsSync(orig)?hash(orig):null,currentSha256:hash(`${dir}/preview/${file}`),change:!fs.existsSync(orig)?'added':hash(orig)===hash(`${dir}/preview/${file}`)?'unchanged':'modified'}});write(`${dir}/source-diff.json`,JSON.stringify({status:'review-revision',baseline:base,files},null,2));}
change(`${root}/map/terrain-2026-09-13/README.md`,s=>s.replace('[直接查看地形](../../shared/astronomical-event-modal/preview.html?view=terrain)',`[完整观星点中的地形](../${rev}/panel.html?extent=large&section=terrain)`).replace('本地可编辑消费者与本次事件modal预览共享宿主','本地可编辑消费者为[原完整地图的增量修订](../revisions/three-requirements-2026-09-13/README.md)，复用原组件、三档拖动、全部基本信息及天文区').replace('Codex局部精修恢复地图/我的双导航、共享信息文档、无推荐结论、真实B图标及独立图层状态','最新修订在原完整地图源上增量接入地形章节、真实B图标及独立图层状态，之前简化宿主被用户否定，已退出当前入口'));
change(`${root}/plan/event-modal-2026-09-13/README.md`,s=>s.replace('[交互单选预览](../../shared/astronomical-event-modal/preview.html?view=plan)',`[完整计划编辑与单选](../${rev}/index.html?view=edit&id=p1)`).replace('演示背景是范围受限的计划编辑宿主，只用于检查上述输入保留和回填；原计划完整编辑/行程冲突/提醒清单等继续使用既有采用资源。','当前[完整增量消费者](../revisions/three-requirements-2026-09-13/README.md)直接保留原计划完整编辑/行程冲突/提醒清单、列表/详情/保存返回，仅替换事件承载；之前范围受限的简化宿主被用户否定，已退出当前入口。'));
for(const area of ['map','plan'])change(`${root}/${area}/ADOPTED.md`,s=>s+`\n## 本轮完整增量资源\n\n[2026-09-13完整${area==='map'?'地图与观星点组件':'观星计划'}修订](revisions/three-requirements-2026-09-13/README.md)基于上方2026-09-09采用源增量修改，保留原完整布局和交互。原简化宿主被用户否定，不可再作为当前页面依据；新修订待用户视觉审阅，产品三项需求与71份图标采用不变，生产迁移未实施。\n`);
change(`${root}/events/ADOPTED.md`,s=>s+'\n当前整合入口为[完整Map/Plan中的共享Modal](../shared/astronomical-event-modal/review.html)，保留原事件活动期、日期条、来源和当地条件边界。简化Map/Plan宿主已退出当前资源，不以其缺失功能缩减原页面义务。\n');
