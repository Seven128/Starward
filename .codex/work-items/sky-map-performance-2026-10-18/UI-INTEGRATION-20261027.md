# 10-27采用UI接入与本地证据

本记录归唯一PLAN P1/P2；当前状态和下一步只归HANDOFF，不是第二份方案。采用入口及新旧Stitch节点沿[设计交接](../map-ui-design-2026-10-27/HANDOFF.md)。用户允许本对话直接实施、多agent，真机和需要用户的条件后置。

## 已接入责任

- 事件：Map上方5秒循环/横滑banner，目录与Plan共用同一个query key和6小时缓存；隐藏卸载轮播消费者。点击原事件路由进入整页，详情Back先回列表，列表返回原页面。Plan选择modal继续沿原确认/取消。多指手势取消，所有手指离开才恢复轮播，滑动不误触跳页。
- 导航：`PrimaryBookmark`共用Map左/My右的同高同尺寸；My设置左移保已确认避让。原导航、Map状态与Search转场不改。
- 视野列表：实际MapScene query、Context版本和当前native bounds共同准入，pending Context无新accepted结果，不另发Search查询或把旧数据改名为新视野。Search和列表共用`SpotIdentityCard`壳与原内容/样式，4项/页、最多20项/5页；点选真实Spot沿原openDetail/Context。只渲染当前4卡，隐藏释放结果/计时器，保小型页码身份。旧卡下到上离场完毕后新卡上到下入场；原生动画回执有代次，定时器仅缺回执的有界恢复。同视觉revision也接收完整新业务对象，避免坐标/海拔陈旧。
- 小屏适配：banner一次真实高度读回参与列表上边界；标题和分页不纵滚，仅卡区原生ScrollView收缩，保四项内容/字号，横纵手势锁定。新增列表占原左下区域时，完整短署名仅在该状态移至右侧剩余列，清除旧工具栏预留边距；其它状态仍用原位置。不是删来源或改变来源内容。
- 层叠：光害/云量第一行、地形第二行，独立开关含全关；`LIGHT_AND_CLOUD`仅客户端组合状态，旧保存值兼容，服务端不新增混合语义。地形/夜光/云各保自己的时刻、来源、错误、安装与原生退休；层序0/1/2，不增加缓存预算。仅云量开启显示时间。错误使用共享Info动作，显式重开层叠可重现仍失败图层的重试，不自动retry、不重置连续failure episode。
- 关闭云量/夜光改为离开活动Query key。真实QueryObserver、实际session requester与生产transport的待决session反例确认：只手动cancel transport时尚无槽位可取消，旧请求可迟发；现在Query signal在关闭时中止，待决session完成不发网络，已发请求同样退休，重开仍可正常成功。地形复用已修的inactive key边界。

本轮未改App代码、图标/照片原件或Search卡片SCSS。共用旧完整设计源957文件和10-22四文件适配层字节不变；这些源码/资产事实不能证明所有未改区域的目标像素已经一致。

## 独立审阅与检查

独立审阅覆盖事件/Plan及向量退休、层叠/Query/原生pin、视野列表/Search卡片和最终Map集成。已修各审阅提出的banner多指误翻、同视觉revision丢新业务对象、小屏列表遮挡/等待空白、关闭后的session迟发、信息条消失后无重试入口、右侧署名旧边距问题。最终集成审阅无剩余确定must-fix；不包含当前WEAPP实际画面/手势/合成验收。

- 聚焦新模块与Query取消23项通过；旧Map消费者和恢复72项通过；向量退休21项通过，原射线强引用回归修前失败/修后通过。
- 完整小程序套件实际执行2961项：2958通过、2失败、1原有skip。两处失败都是旧Map事件modal/新增fullPage绑定的夹具，已按真实整页合同修正；修后受影响事件通知/Back/Map恢复/Query等30项全通过。此为整轮结果加定向修后结果，不冒第二次全量运行。
- 小程序typecheck已通过；末批测试夹具类型也已修正后重新检查。Context结构检查与diff检查通过；这些检查不读取远端Stitch或判定目标画面。
- 完整WEAPP普通本地输出`apps/wechat-miniapp/dist/weapp`构建成功。337文件、5,097,431B，SHA-256 `03501c64b57625c140810ccc11d5efd31fae243cad7e73b49e41ccc8159a13c1`。主包2,047,413B；content1,067,241B、spot613,062B、sky1,369,715B，均低于2MiB，合计低于20MiB。现有production检查全通过。实际官方上传包仍以DevTools为准。
- 初次构建的新增postcss-calc解析警告已修复，最终构建无该警告；保留10条CSS公共导入顺序/webpack尺寸建议，不把建议阈值当平台包体限制。最终日志在任务tmp/ui-build-20261027.log，完整测试在tmp/ui-miniapp-suite-20261027.log；生成日志不进入Git。

以上是本轮UI实现的loopback本地检查记录，未冒手机候选、实际推送或已部署。后续[完整资料接收](HANDOFF-RECEIVE-20261027.json)、[最新任务库独立恢复](LOCAL-SOURCE-RUNTIME-20261027.md)和[Sky图像Query修复及更新构建](SKY-IMAGE-QUERY-RETENTION-20261027.md)已完成，当前构建身份沿后者及主HANDOFF，不能继续沿用本节旧输出hash。源码仍有dirty、未推送；head CI不证明当前WIP。API启动与扫码阻塞随后已解除；最新服务和DevTools状态只沿主HANDOFF及LOCAL-SOURCE-RUNTIME-20261027.md，不重复旧授权或扫码。原19真机回归、实际页面/手势/图层、完整Play与OOM仍后置；不重索或整批重录旧资料。向量退休收益边界见[VECTOR证据](VECTOR-REFERENCE-RETIREMENT-20261027.md)。

## 2026-10-30 普通候选目标观察

### Candidate identity

沿[P3新普通候选](SKY-P3-DEVICE-20261030.md)复用 effa83c7/source binding 48026264、同一 NIO N2401/Android14/微信8.0.78及已连接LAN session；逻辑视口384×797。私有证据根 `E:/Dev/Starward-data/development/d1-d2-targeted-20261030/ui-target`，`operation.json`和`phone-evidence.json`绑定9张原始手机截图及回执。本轮没有新源码、构建或手机候选。

采用稿仍为原10-27资源。Root核对原HTML、ZIP及全部22个成员与当前本地展开件字节一致，再用现有只读预览入口实际查看Map、My、层叠和事件整页；原固定参考视口390×844，与目标安全区及高度分别记录，不冒同视口逐像素全检。来源按钮依当前[共享owner](../../../project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md)的44px图标规则；原型短文字不能覆盖该已采用规则。

### Invocation result

实际完成Map→My→Map、打开/关闭层叠、一次事件banner横滑、随后独立点击、事件列表→狮子座详情→列表→Map。真实输入和录像用现有guarded device-test；官方CLI只读当前几何/页面。为了露出banner，将微信自身的调试浮条从上方移到右下，未改产品布局。没有Profiler、Heap或新PSS。

### Observed

- Map左书签与My右书签均90×44px、top=97.1500；My设置48×48px，与右书签相距2px，没有重叠。My截图是正常空“未来24h计划”状态，不能代替有计划旅程。
- 层叠面板实际top=566/bottom=797；光污染和云量同排，地形独占第二排。当前光害/云关闭、地形开启，来源入口可见；这条只证明布局与当前状态。
- Map事件banner宽256px，当前视野列表同为256px，即384px视口的2/3；列表实际只有一个既有隔离正式地点，标题明确其测试身份，没有冒真实观星地点或填造多卡数据。
- 原录像 `recording-1793327815422.mp4` SHA `c22774c979d55c87da700046515b9bad6b0c31a2b841311c8b9a7aa9f63beb01`，实际11.629133秒/60视频帧（请求15秒不是实际时长或性能帧率）。2Hz抽帧可见九月英仙座→十月天龙座→猎户座，页面保持Map；随后独立真实点击进入11月锚点的事件整页，没有横滑误跳页。
- 狮子座详情显示原地点和2025-10-28公共观测日期，常年参考日与监测区间语义保留。Back后11月列表阅读位置与离开前一致；再Back回Map，原地形和视野地点可见。这里以实际截图判定内容；原生`currentPage`仍是list路由，因为详情由现有`EventModalHostPage`承载，不能将该路由读回误判为未打开详情。

### Verified

本次有界目标结果支持左右书签尺寸/设置避让、两行层叠布局、banner横滑序列及独立点击、事件整页往返和列表阅读位置保留。已查看范围没有新增采用差异；源码责任层及原有效测试直接复用。

### Unverified

后续正常选点、四卡滚动与四卡→单卡替换结果见下文。跨页横滑/最多5页、三层均有有效图像的真实合成、重叠相机事件和其它未覆盖原P1/P2旅程仍未验。没有由这些局部截图宣布完整采用稿、P1或整Goal通过。

### Invalidated

私有`my-bookmark.json`曾选到隐藏Map节点，已排除；可见My结论仅用`my-visible-bookmark.json`及实际画面。最初归档表达式未复制元数据，随后按原文件补齐并逐文件hash核对9份回执；不是产品失败，原件保持。

### Cleanup

参考预览server18867已按PID及完整入口身份停止，监听为0；preview-only.sqlite前后SHA相同，未提交设计fixture。IAB任务标签均关闭、视口覆盖已reset。全部原视频/截图/回执保留，当前有效微信项目与手机会话继续复用；无数据库、提醒、公开发布或账户修改。

### 同一候选的正常选点与剩余地图居中

随后从当前视野的真实隔离地点卡点击同一正式点。实际中档面板高368px、top=429，原生地图384×797、top=0；原生`toScreenLocation`返回该点地理锚点(192,215)，剩余地图几何中心(192,214.5)，偏差(0,0.5)逻辑像素。marker图像本身底锚点为1，不能以图标中心替代地理位置。原相机scale14保持。

用此次实际`getRegion`范围和面板实测值调用共享生产`spotNeighborhoodGroundRange`，可见宽3382.775m、高3779.514m，较长边约3.78km，满足原约4km范围且未再缩小更细视角。原图`screen-a5eeedc1-3763-47b4-bd86-9726c0c671e2.png`及`spot-focus-layout/native/result.json`归上述私有根，归档截图总数现为10。这个正常选点结果不证明粗视野多次校准、用户手势与迟到end重叠或快速换点的目标时序；已有责任层检查继续复用，不补写未跑变体。

### 四张现有卡片、纵向滚动与视野替换

使用原公开搜索入口将临时条件改为“深圳”，当前API真实返回8个既有隔离正式地点；没有新造地点、改库或把这些测试地点冒充资料资格。地图一次向东拖动后，当前范围内4卡进入同页。第一次拖动仍只有1卡，是原搜索条件仍限定“隔离测试·月湾营地”，不是丢失其余点的产品故障。

384px视口中卡区宽256px，标题保持top269/高28；纵向滑动后scrollTop83.911px、scrollHeight524px，第四张可读，地图相机仍22.609463/114.09431、scale14。此结果证明小屏原生纵滚与地图手势隔离，不证明横向分页或20项上限。

随后仅一次地图返回拖动，真实视野从4卡改为1卡。`recording-1793331893447.mp4` SHA `3900491216077a4e359af839ecbfe20517ed3837013959713e39be1b27249b22`，实际11.646933秒/141视频帧；请求15秒不当实际时长或渲染帧率。Root查看原录像派生的2Hz概览及9.0–10.55秒20Hz抽帧：旧卡从最下方开始逐张向左淡出，之后新单卡向右淡入；未见新旧卡同时叠在同一结果列表，最终卡片top297与列表顶部一致。20Hz是检查抽样频率，不是原生动画性能测量；本次只有1张新卡，不能据此证明多张新卡的逐项入场顺序。

`viewport-evidence.json`绑定6张原图/回执及2段既有录像，`four-card-scroll.json`、`viewport-return-readback.txt`保存实际几何。最后经Search恢复原完整搜索条件并选择原地点，`final-restored-layout.json`与`screen-fea3933c-0cef-411e-9d88-52a1fcc0fdf1.png`确认相机22.602785/114.085133、scale14、中面板top429/高368、原地点与地形；没有改变公共观测时刻、账户、提醒或N05。一次只读查询误用了SelectorQuery不存在的dataset方法，返回无有效读回；修正为fields后取得上述结果，不算产品失败。
