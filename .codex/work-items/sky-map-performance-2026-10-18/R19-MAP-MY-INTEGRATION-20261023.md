# R19 Map/My 导航与有效前台整合 — 2026-10-23

本记录保留该批导航生产实现与本机检查，目标WEAPP交互尚未验收。PLAN继续同一版本；不重选稿、不改未涉及的原内容/数据/材质。当前[gen10普通QR已ready/未bind](R19-GEN10-DEVELOPMENT-FEEDBACK-20261023.md)，合并来源/正文、新导航及后续实际模拟器发现的[My入口级联修复](R19-MY-ENTRY-CASCADE-REPAIR-20261023.md)；旧gen8/9原件完整保全后退休，不再要求扫码。隔离check本身不能替代候选与目标证据。

实施前Root实际查看当前临时输入的`review-images/map.png`、`my.png`、`press.png`及editable`review.css`/`review.mjs`，范围沿原采用源；未重新生成或上传设计。My入口44px命中/26px原图标、返回‹/原地图图标与文字、240ms/cubic-bezier和减少动态效果沿该输入，像素/动画是否符合仍由目标画面对照决定。

## 责任与实现

[授权独审](R19-MY-NAVIGATION-AUTHORITY-AUDIT-20261023.md)纠正旧A/B待批前置：同一Map承载独立全屏My属于原PLAN委托的实际机制。`primary-navigation-controller`只持有closed/opening/open/closing、native Page identity、有效前台、activation和转场ticket；原生子页隐藏不等于主目的地切换。[owner实现](R19-PRIMARY-PRESENTATION-OWNER-20261023.md)及[My正文](R19-MY-PRESENTED-CONTENT-20261023.md)继续拥有其限定结果。

Map左上原用户图标入口打开保留的My表面；My以240ms、采用cubic-bezier左入左出，减少动态效果静态切换。My完全离场前不恢复Map交互。Map有效hide同步复用焦点、位置、日期、拖拽、编辑/导航退休与pageVisible查询/栅格边界；保同一Map节点、camera、panel/scroll及Context。My只一份正文，首次打开后保其独立ScrollView；直接`pages/my/index`包装、原生子页、来源页与Sky受控真卸载/返回继续走原owner。

公共`page-presentation`把有效前台、保留activation及辅助Back登记交给原导航/账户/登录/通知消费者。My子任务向唯一native Back owner登记，一次只关当前编辑/照片/登录，再由下一次Back离开My；没有第二PageContainer。共享通知仍是原队列和可见计时。用于My的稳定identity/getter factory只闭合小导航owner，不把整个Map render的数据捕获到子查询回调。

旧tabBar注册、专用组件/cover及占高已按[退休证据](R19-LEGACY-BAR-RETIREMENT-20261023.md)清除；13份原件98,013B私有逐件SHA读回一致。生产src无旧cover/getTabBar/custom-tab-bar/Taro.switchTab消费者，原图标字节、照片native chrome、模态Back与关闭恢复保留。

## 独立审查与产品修复

[有效前台独审](R19-PRESENTED-PAGE-INDEPENDENT-REVIEW-20261023.md)在完整实际React/Taro模块复现1个P2：My系统选图回调先于native didShow时，账户操作把前台失去误当保留identity改变。现以实际native Page和逻辑activation共同比对；begin仍要求有效前台，不放宽账户/reset/native-child围栏。同一复现修前失败、修后通过，独审最终6/6，未发现第二confirmed P1/P2。实际相册返回仍需手机。

## 本机检查

- owner/dispatcher局部20/20、My/CustomNav局部30/30及旧bar退休关联44/44保各自范围，不累加为全量。
- Root针对真实Map callback、实际controller/dispatcher和Back、有效hide、layer可用几何完成17/17。Map原生重试/旧identity/拖动意图、编辑离开取消仍检查；原fallback期待减去88px旧bar的断言改为已采用完整window，真实测得workspace仍优先。
- 正式workspace typecheck退出0（初次`my-navigation-typecheck-20261023T020535082.log`）；测试边界合批后由[hook修复](R19-PRESENTATION-HOOK-FIXTURE-REPAIR-20261023.md)再次执行相同正式5.9.3入口，工具会话80144退出0，未改tsconfig/依赖。
- 首次本批完整npm suite实际2780项/2711通过/68失败/1原输入条件skip，89,101.5224ms；原日志`my-navigation-miniapp-tests-20261023T020535072.log`完整私有保留。已定位共同的旧native switchTab/底栏高度/新有效前台端口缺失，以及bare React被authoring tsconfig解析到声明文件；在原测试owner合批完成[hook](R19-PRESENTATION-HOOK-FIXTURE-REPAIR-20261023.md)、[返回消费者](R19-PRIMARY-RETURN-FIXTURE-REPAIR-20261023.md)、[组件](R19-PRESENTED-COMPONENT-FIXTURE-REPAIR-20261023.md)及上述Map边界迁移，不恢复旧生产结构。
- **最终当前源码完整npm入口：2783项/2782通过/0失败/0取消/1同一原输入skip，81,045.4707ms、exit0。** 日志`my-navigation-miniapp-tests-repaired-20261023.log` SHA-256 `a99957d41b09222f18e2bba62e52dfb2fbd331b5753e49dee4e4f12d97090be6`。唯一skip仍为缺`CLOUD_SKY_SCIENCE_PUBLICATION_PATH`的既有真实输入条件；没有新增跳过或伪造输入。src及受影响Context diff check退出0，既有CRLF规范化提示不被当产品失败。

隔离WEAPP完整编译到`apps/wechat-miniapp/dist/weapp-check-r19-navigation-20261023`，首次目录不存在才写入；webpack30.903秒、exit0、10项既有CSS顺序/size advisory。两次全bundle读回一致：SHA-256 `a6daa76cfa7ef274030fbc60db0b6cbea48566976bd78db58a44438c2d73afe5`，345件/5,020,981B；main2,032,618、content1,041,539、spot612,072、sky1,334,752B，实际各包/总预算通过、maps0。生成app.json实际无tabBar、Map首路由、My直达保留。日志`my-navigation-check-build-20261023.log`及完整manifest`my-navigation-check-bundle-20261023.json`在私有`r19-ui-20261022`。这是loopback8798本机check，不准作手机候选或投递资格。

本机check阶段结束时只读`loadFeedbackRun`/`assertGenerationCurrent`，gen8仍为原`7772cb…`、qr_ready、QR存在、deviceSessionBound=false。无预览/bind/手机输入、服务reload、账号/数据库操作、上传或Git交付；所有本批子代理和构建/测试已结束，无官方操作在途。PLAN SHA仍`d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`。R27/gen31和旧gen8冻结目录没有被本批check覆盖，gen31仅保留原诊断快照，不能冒当前UI源码。

## 必留目标证据

本批全量收束后，将媒体复制/Sky正文、Picker及新导航合到同一下一代普通预览，替代先扫码旧gen8再扫码新包的执行次序；不改变PLAN或丢弃gen8证据。刷新前整份feedback再次私有保全355件/5,070,586B，逐件大小/SHA一致，manifest `a93947b76349b18906f4a3306fb5caccb16353e735fe11933a8990a1fceb667e`。官方流程允许新代后退休旧临时generation；所有旧原件/QR/终态仍保在私有归档，gen31不动。

投递准备中，task-local地址推导先错用仅匹配inline API常量的regex（实际编译已别名化），随后自加的全回环拒绝误排除了原任务明确采用的USB反向桥。以上均在编译/预览前停止，没有更改产品、项目守卫、网络或Goal。后续实际核对：普通dist与gen8 prepared均为原7772cb…，此前“普通dist已不同”的推断撤回；原`runtime-usb.private.json`明确usb-reverse/8798，实际唯一授权USB的反向映射仍在，gen8实际compiled纯地址owner五角色全true。两次有界toybox nc健康请求未取得输出，保unknown且停止，不归因产品或继续重试；本机API与bridge各ready200，手机内HTTP及微信请求需本批实看。没有把普通USB连接当自动转发，也没有为通过而移除phone guard。

按该原USB输入完整编译当前普通`dist/weapp`，webpack30.655秒/10项既有advisory/exit0。指纹、345件/5,020,981B、各包大小与前述隔离check完全相同，双读回及真实physical-bundle guard通过；重新执行compiled纯地址owner五角色全部true。私有`my-navigation-phone-build-20261023.log`、`my-navigation-phone-bundle-20261023.private.json`保存本批，区别于仅有loopback地址而未绑定显式USB条件的check。只发起一次普通`refresh --delivery qr`，结果/当前新代及在途状态归HANDOFF，不走旧auto_preview失败恢复。

普通Map→My→Map、Map→Search→Map须实看左/右方向、原生Map合成、一次Back、相同Map/Page及camera/panel/scroll、有效hide和返回需求；键盘先Back、My子页返回、动画中反向、系统选图、直接入口及既有Sky真卸载分别保原责任。未得到目标结果前不称UI完成，不进入以UI已通过为前提的叠层验收。gen8的媒体复制/Sky正文两项P2、Picker按压与最终UI比较仍独立未验。
