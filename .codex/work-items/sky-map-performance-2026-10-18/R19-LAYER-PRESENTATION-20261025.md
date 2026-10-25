# 手机采用转场核对与层叠视觉存续窄修

## 已观察的差异与采用来源

当前采用源仍为3995519477980461148及完整依赖。本轮实际查看My、layers-light、sources原图，并读取当前`review.mjs/review.css`；未改稿、重生成或重新选择。当前增量CSS的`.layers`明确为`translateY(100%)↔0`，240ms、`cubic-bezier(.2,.7,.2,1)`；本批沿此采用值，不把DESIGN历史Layer recipe的220/180ms混入本批。

普通手机gen2 `77b8`的Map↔My两段原始录像，经Root及新独立审阅实际看中间帧，My从左进入、向左退出。Search两段原始录像显示右入右出（返回1.95s原帧为Map在左、Search移向右）；没有方向修复需要。返回后地图地标、左上My、竖排工具和无底栏保持。该结果只关闭本次方向观察，不冒正常账户、选择/Context/正文恢复、精确时长、流畅性、反向中断或完整P1。

层叠原关闭录像在编码2.00s仍完整，2.05s已消失；源码`bottomPresentation === layer-sheet`直接条件卸载，只有内部height过渡，没有退出存续/位移。原打开录像中的高度增长也不能证明完整下入。独立审阅确认该缺口属于当前采用转场，不是新设计需求。

## 实现责任与不变量

- 从现有Sky overlay提取唯一`hooks/use-overlay-presence`，只负责视觉present/active/phase、退出退休和旧timer/native tick失效。Sky原wrapper、180ms、prepared分支、样式、时间/资源消费者保持原行为。
- Map本地`MapLayerPresentation`复用该owner，按当前采用240ms下入/下出；关闭保留最后实际children，shield挡住退出内容的输入。重开接管live CSS位移，旧退出不能移除新层；页面隐藏立即退休，卸载取消回调。
- Map原`setBottomPresentation`、layer→spot/editor恢复、选择、数据查询、原面板阅读位置和业务回调时点未延迟。视觉退休没有业务commit；没有第二个Map/路由平台、未改面板内容/布局/颜色/图标/数据含义。

## 实际检查与新候选

35项定向检查通过，涵盖现有Sky准备/180ms/恢复、导航生命周期及Map层叠协调；补充隐藏前pending native tick的实际hook回归后，Map3项通过。WEAPP类型检查通过；完整普通编译exit0，保留原10 warnings。包体/地址/AppID准入通过。

当前手机完整包SHA `1576576c36c7628332f9c9b03e62cbbc840d3cbe78b1a7efde5d5c2ebce9390d`，339件/5,038,377B，主包2,027,585B。`szzwZq/gen3 NUlAjG`官方auto_preview terminal success，Root实际观察新行为后绑定`tEShJz`。编译的四个改变文件为common.js、Map JS/WXSS、Sky JS；没有删内容降包体。

唯一IDE项目仍为`dist/weapp-check-sky-4086cb4f36b44324`。源自同一本批源码的8807完整编译SHA `1aab8b3ad33f2701ec5cb0f02b38f7e7958c9e7c23a2a2a94892411cb4c0b135`，339件/5,038,352B，主包2,027,560B；完整同步后官方refresh返回0。手机canonical已完整恢复1576576c。原5e实际full SHA从当前字节及已保护77b8逐文件验证，差异仅两处API origin后才同步，旧原件已归档；首个误填完整SHA的私有guard拒绝时未写产物。未从生成产物反写源码，未重启8807或丢其内存Context。IDE刷新触发不等于完整UI通过，旧Sky控件不可见的缺口保持。

## 手机修后结果与证据范围

私有root从[当前手机API入口](R20-PHONE-CURRENT-API-20261025.md)的pointer取得。原Map/My、Search、层叠录像及`phone-navigation-action-frames`、`phone-search-navigation-frames`、`phone-layer-navigation-frames`保留。修后原片为`recording-1792933659240.mp4`和`recording-1792933715671.mp4`，解码身份/帧归`phone-layer-motion-after-frames/manifest.private.json`。

Root实际查看修后入场2.20→2.40s和退出2.05→2.15s的连续原帧：抽屉从下方移入，退出内容向下移动到视口外，随后Map恢复完整可见。与修前直接消失形成实际目标反例/修后对照，当前差异已修。最终地图无新选择或业务提交。

解码只用现有Edge/Playwright读取原始手机MP4，没有渲染另一个产品页面。请求录6秒与实际编码时长不同；编码帧和PTS不作物理FPS、准确240ms或性能结论。API仍不通，显示的是明确失败状态，正常层叠覆盖、来源/时刻/完整UI验收未通过；此次不会关闭它们或OOM。

## 独立审阅

`phone_navigation_recorded_review`实际核采用源/原片SHA/中间原帧，确认My方向；`phone_search_drawer_motion_review`确认Search方向及原层叠缺失退出、当前采用值和窄提取边界；`map_layer_presence_code_review`独审源码与真实消费者，无确定阻断项。最终新`phone_current_delivery_evidence_review`实际看修后7个原帧、核两段MP4 SHA、gen3设备/截图/10 pins、canonical/IDE及当前manifest回执，确认下入/向下退出，无新增阻断。均只读、未操作设备/服务或Git写，完成即结束，未复用旧agent。正常API、正式身份、完整P1、精确时长/流畅性和本批CI没有被独审升级；本次提交/CI以HANDOFF为准。
