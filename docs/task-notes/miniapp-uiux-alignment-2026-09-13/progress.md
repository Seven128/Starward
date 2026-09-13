# 当前进展

更新时间：2026-09-13。**原完整完成结论撤回，产品交付仍有缺陷，UI修复暂停。** 用户真机指出新旧图标叠加、地图悬浮控件active时出现超出圆形表面的方块；源码已确认旧伪元素隐藏规则被覆盖、active背景施加到外层命中区。原Goal工具状态曾被误标complete，不能据此恢复完成结论。以下代码接入和检查事实保留，各自不证明整体符合设计。

## 已落地代码（不等于验收完成）

- **真实地形**：Copernicus DEM GLO-30八幅COG经SHA256绑定，WGS84采样并转GCJ-02，生成1536² hillshade/高程色带；BFF提供安全资产端点，客户端含查询缓存、取消和原生`MapContext.addGroundOverlay/updateGroundOverlay/removeGroundOverlay`。当前发布覆盖大湾区中心85km，约110.7m派生分辨率，有效99.34%，海洋缺瓦明确为缺测。点位文档新增“基本信息→地形→天文”，地形/光污染独立开关；主地图地形叠加与LIGHT/TOTAL_CLOUD互不冒充。
- **B批图标**：71份256×256 RGBA母版、2,216,122 bytes精确保持；构建按主包/子包消费者生成224px页面派生和192px原生Tab派生。`SemanticIcon`、地图四态marker、原生Tab及Map/Search/My/Plan/Event/Contribution/Feedback/Sky/Settings消费者已迁移。NIGHT/OBSERVATION继续使用已有合法主题。
- **共享Tab**：`SelectionTabs`统一13px基线、active视觉15px、220ms、文字独立缩放、44px命中和减少动态效果即时切换；已迁移点位章节、贡献/反馈章节和贡献记录等真正Tab消费者。
- **共享天文事件Modal**：`AstronomicalEventModal`统一固定外壳、list/detail内部切换、browse/select-one、临时单选、加载/错误/空态、查询取消与NativeBack。Map、计划编辑/只读和旧深链兼容宿主共用；服务端允许历史多关联原样读取，显式替换只接受0/1。
- **UIUX与Context对齐**：保留原Map/Search、点位三档/照片、计划完整字段、贡献反馈、Sky、设置账户等内容和owner；修复large媒体与图层shell几何、Map事件返回边界及预览缓存造成的旧候选误测；更新DESIGN、产品/架构Context和采用资源。

## 历史检查结果及适用范围

这些检查实际运行过，但此前的截图观察不足，未形成可信的全产品视觉验收。尤其“无诊断标记”只排除临时字母，不排除图标/容器缺陷；“4个UI探针”只是源码模式检查。多视口截图存在不能直接证明各视口符合采用资源。

- `npm run check:miniapp:fast`的各阶段均通过：contracts 24/24、API 176 passed + 2 skipped、frontend 443/443、workflow 137/137、图标54、语义资产24、生产UI探针4；设计系统校验通过。
- 最终WEAPP构建成功；官方开发者工具以唯一`dist/weapp`副本路径打包，TOTAL 4,017,091 bytes，main 2,006,254 bytes，content 921,344，sky 660,960，spot 428,533。
- 模拟器覆盖320/375/390/430及820平板视口、共享Modal两模式、Tab、地形章节、图层与关键页面回归。
- Android微信真调试覆盖：最终干净Map与真实原生地形叠加；事件list/detail两级系统Back（详情→列表→Map）；图层sheet系统Back；干净候选再次验证列表→Map且无诊断标记。

## 明确未验证/受限

- **已知失败**：B图标与旧绘制叠加、地图工具active视觉越出圆形表面。相关共享消费者须按渲染/覆盖机制重新检查；不能归入设备不足或一般未验证限制。
- 未做iOS/iPhone和物理平板真机；820仅开发者工具平板模拟器。
- Plan select-one、共享Tab快速反向、减少动态效果、Modal快速重开/前后台/读屏焦点恢复主要由源码、自动化与模拟器覆盖，未逐项物理设备观察。
- 当前真机fixture没有生产Postgres VIIRS格网，故光污染真实图层未在该候选视觉展示；服务端仅接纳真实grid的边界与测试已通过。
- 地形发布只覆盖大湾区中心85km；SRTM仍为备选数据源，没有实现自动fallback；全球覆盖不在当前发布包。
- 微信通知供应商真实投递、外部鉴权/生产数据、账户真实删除均依赖外部条件或具有破坏性，本轮只验证契约、状态与安全边界。
- 已完成第二遍逐项证据审查；本任务禁止启动子代理且没有外部人员参与，故没有第三方/独立执行者评审。

## 环境收口

- 手机`stay_on_while_plugged_in`已恢复为原值15，Windows代理已恢复为`ProxyEnable=0`并保留原服务器字符串；本轮LAN fixture/API已停止，无线调试配对保留。
- 微信开发者工具已从唯一预览副本切回`apps/wechat-miniapp`源码项目并置前。最终干净候选二维码、包体信息和真机截图留在证据目录。
