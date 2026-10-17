# 日月行星影像的已绘帧交付（2026-10-09，限定开发与原生证据）

本责任承接native-body-fine-and-moon-source及native-midnight-drag-cancel之后的缺口，不重做图像加工或已核手势矩阵。目标是区分实际纹理提交、成功基础盘回退和无效/退休结果，并让来源披露与公开帧读回使用同一份已接受影像身份。

## 当前实施

sky-render-surface / sky-gpu-renderer 的 moon/planet 复用既有galactic imagePainted模式：只有paintBodyTexture成功提交当前u_image且GL无错误才交付原bitmap；红光、未解析、无图、上传/编译/提交失败和基础盘回退不交付影像。boolean仍保独立有效盘面/相位与拾取。

sky-scene-render收集同帧reference+bitmap，仅接受该天体传入的同一current bitmap，失败body不交付，finish后再次排除退休。该记录是成功纹理提交，不能冒未遮挡科学样本、正贡献量或物理资源。

sky-body-image-completion绑定当前validated hook的immutable publication与bitmap，接受帧从自身queued bindings匹配真实Scene记录，不借新hook元数据；错对象/换bitmap/重复/退休拒绝。spot-sky-page生命周期accepted completion才发布，sameScene含同一bindings，Sources/footer改取已接受publication；新增公开data-sky-painted-body-images只包含reference/publicationHash/imageSha256。七body共用一责任，Moon/水/火/OPAL不复制脚本、缓存或版本。

OPAL共享hook现在保留body→具体manifest的类型，不把四种publication擦成任意联合。来源展开含已绘影像immutable URL。现独立天体Sources route仍是静态资料/current资源查询，尚未扩展精确body publication选择；不称完整Sources版本绑定或最终验收。

## 当前检查与保留失败

native-body-binding-before.log与fixture-diagnostic.log相机手性错，不作产品修前反例；修正既有ENU手性后native-body-binding-valid-before.log为1PASS/1FAIL，实际u_image提交已成功但通知0，真实交付合同反例保留。

当前renderer/Scene/queued-accepted page五项新检查已通过，包括各六有图行星+Moon、基础盘回退、错误身份/编译/上传/GL错误、退休、另一frame/Canvas和publication错借；最终fallback分支也已通过（native-body-binding-page-fallback-current.log）。检查使用生产提交/Scene/接受回调与实际Moon资产清单，受控GL端口不认证GPU像素。

首次受影响29检查24PASS/5FAIL；修正已过时的直接paint夹具为现accepted回调owner、补新bindings，保原断言，现29/29PASS（native-body-binding-affected-current.log）。另七实际shared消费者首次46检查35PASS/10FAIL/1旧SKIP，修正缺少当前resourcePageVisible/skyGalacticImageBandAt、错误illustration paused参数；夜间细视场需先发现新光学schema，旧红外细视场仍不加载，新增实际ordinary optical细视场结果。现45PASS/1原SKIP/0FAIL（native-body-binding-shared-current.log）。这些夹具/历史期待失败不冒生产故障或原生质量修复；原日志保留。

App类型曾因OPAL被擦联合及测试闭包控制流报错，前者由共享hook泛型修，后者改反射状态的显式类型；最终当前检查通过（native-body-binding-final-current-typecheck.log，exit0）。git diff --check通过，既有行尾转换告警保留。

## 当前运行与下一依赖

上一274文件/4,623,924B/29ff54ea…构建完整复制pre-native-body-binding-weapp-fixture，fingerprint精确一致（native-body-binding-preservation.json）。必要新fixture构建exit0，41277ms/3原类warning；完成后才取fingerprint：274文件/4,627,594B/d6bf94b6e1bccda29aaf1e562fb6a33886b4d28fd3a9defe9cdec216f9a5a546（native-body-binding-built-binding.json）。canonical8787/watch99080和8791/API会话保持，未重启服务。

首次simulator_refresh返回Map，重新进入/定位后仍无新增帧属性或已绘URL；该代输出不能认证新代码，原因不作确定归因。一次cleanCompileCache后simulator_open_page重新编译，手动查看实际新增bodyImages=[]（automation_evaluate-1791519889166），新代码加载已确认；不是修复WXML组合或允许重复无变化SDK循环。

公开列表→土星→定位→三个完整双指操作，0.05°实际accepted bodyImages为PLANET:SATURN，publicationHash48343c…/imageSha25668da69…，与已核原OPAL同一成品完全一致（1791519950985）。展开披露1791519979768实际含该hash的已绘URL和原年代/许可/加工。此前native-body-binding-saturn.png实际看见云带与环，但处于尚未确认新代码的代次，不拿它单独证明新交付合同。

公开日历选10月02日00:30、列表Moon定位；Context HTTP读回rev7/selectedAt2026-10-01T16:30Z/localDate2026-10-01（native-body-binding-bright-context.json）。0.8749957624635967°实际accepted bodyImages为SOLAR:MOON，publicationHash89423a…/imageSha256ba7b9e…（1791520129993、1791520164610），与既有coverage-v2原成品完全一致。native-body-binding-moon.png已查看，显示实际历史纹理，盘缘侧裁切不冒完整质量/科学认证。

随后两个缩回手势得到197.84373135303974°，同一已绘时刻/所选Moon保留，bodyImages=[]（1791520189716）。纹理不参与的概览不继续声明旧影像来源；本条件不冒受控GPU上传失败、全部隐藏事件或物理退休。公开Source独立route的精确body版本选择仍待补；其旧/current资料不能认证此hash。

下一依赖是同一body身份的精确Sources路由与旧/错版本失效语义；复用现validated manifest客户端、独立资料、来源Back和暂停owner，不借用W3/光学hash字段。当前WXML FAILED/原因UNKNOWN、独审 MISSING、手机/物理/完整图质及33项原值保持，不公开采用或部署。
