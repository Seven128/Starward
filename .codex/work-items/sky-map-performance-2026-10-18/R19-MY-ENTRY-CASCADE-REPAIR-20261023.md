# R19 My入口级联修复 — 2026-10-23

本记录属于同一PLAN的UI开发进度，未重选稿、未改资源或其他主题/内容；不替代手机验收。原2783项全量/正式类型证据继续保其范围；本次仅修改Map入口SCSS，没有重跑不相关的全量或新增镜像测试。

## 实际差异与修复

原Stable对gen9精确prepared项目实际打开s2。首次runtime没有对应runtime，开窗后读取timeout；随后官方`simulator_screenshot`不带等待取得353×762实图，实际Map/右侧五工具/无底栏可见，但左上My入口缺失。该状态属于“应用可见、自动化未就绪”，不能从timeout推断产品黑屏。

Root实际查看原图`r19-ui-20261022/gen9-simulator-first-20261023.png`、当前采用`implementation-input-20261022/review-images/map.png`及`review.mjs`的adaptMap；再核原编译WXSS和真实按钮调用。My同时带`map-tool map-my-entry`，原入口一个class的absolute/44px/26px被后部同优先级通用工具规则覆盖为relative/52px/22px；全高原生Map之后的普通流入口被stage裁切。这是当前候选P2，不把地图位置或不同安全区当采用稿偏差。

`pages/map/index.scss`改为限定`.map-page .map-my-entry`：保原safe-area top/left16/z30，显式width/min-width/height/min-height为44Px；独立入口伪元素inset0保44px可见圆面，直系图标26Px。右侧工具仍用原52px命中/44px圆面及既有图标，SharedButton按压/业务及My导航owner不变。[独立审查](R19-MY-ENTRY-CASCADE-REVIEW-20261023.md)确认该限定足以消除级联原因，未发现第二个可证实的相关问题；修后实际结果另外判断。

## 同源新构建与实际回看

完整普通`dist/weapp`构建exit0，webpack66.692秒、10项原有CSS/size advisory。原显式USB runtime输入复用，未改服务、映射、VPN或全局CLI。双份bundle读回一致：`45fdc25522d5da8e72c8d5476da5be6445e983767a42f29dbf2e041f7e32e992`，345件/5,021,074B；main2,032,711、content1,041,539、spot612,072、sky1,334,752B，maps0、各包/总预算通过。实际app.json无tabBar、Map首路由、My直达仍在；compiled纯地址owner五角色全true。完整结果归私有`my-entry-cascade-bundle-20261023.private.json`、`my-entry-cascade-compiled-origin-20261023.private.json`及build log。

最新源编译后精确关闭gen9窗口s2；反馈owner创建gen10并正常退休旧临时generation。gen10 `generation-000010-ZeLw4b/project`显式原Stable新开s3；第一张即时截图为启动黑帧，有限异常词过滤无匹配不构成“无错误”结论。后续不带等待截图`gen10-simulator-map-ready-20261023.png`实际显示完整Map、左上用户图标圆面、右侧原五工具及无底栏；Root已实际查看。该实图关闭本批“入口缺失”的模拟器差异，不能证明命中/按压/左右转场、My正文、Map状态和手机合成已通过。应用可见后只发一次currentPage资格读取，终态与未完成交互以[当前反馈](R19-GEN10-DEVELOPMENT-FEEDBACK-20261023.md)为准。

## 保全与剩余义务

gen9完整反馈350件/5,073,446B逐件大小/SHA保全到私有`gen9-before-entry-repair-originals-20261023`，manifest`ee2878251f387a81bcf86c4aea069330e6e9893cd4cac85757059dab4a3eec69`；旧QR/unknown/成功回执及原件均不倒改。gen9只读手机图为共同攻略/隔离TEST照片页，不能识别本代；没有绑定或输入。新二维码及其终态另保，不读微信聊天/相册/剪贴板。

继续原有限路径：Map→My→Map、Map→Search→Map，实看方向/原生Map合成、一次Back、相同Map/Page与camera/panel/scroll/Context、有效hide；来源两项P2、Picker原生开/选/取消/按压与最终资源比较仍未验收。模拟器发现并修复问题不改变“UI后叠层后Sky”顺序；原完整Goal、R27冻结/原性能缺口和所有未撤销义务保留。
