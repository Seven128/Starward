# 当前合成缺口的公开卸载边界与配置试验

沿既有官方项目／watch／60065，接[共享冷文件与解码](experience-cold-image-residency-2026-10-01.md)之后继续核普通控件实际缺失。此轮没有产品源码修改，不操作手机，不重开IDE／watch／BFF。[新绑定](experience-native-composition-boundary-binding-2026-10-01.json)冻结414事件，原380事件前缀保持，88源码输入、6保留修改与普通bundle均未变。

## 已建立的边界

公开“返回”后，真实SDK当前页为`pages/map/index`，render-tree Canvas数量和官方`canvas` selector数量均0，Sky文件0。[实际官方地图原图](experience-current-native-composition-unmount-map-2026-10-01.png)可见地图、搜索框、按钮及页签；原图已查看。随后原Context手动45°正常重进，[重进原图](experience-current-native-composition-unmount-final-restored-2026-10-01.png)仍只有星空。

因此这一有界公开退出已经退休页面Canvas并恢复地图普通内容，不能把当前Sky缺控件归为退出后星空残留遮挡。Canvas存在时的合成根因仍未证明，也没有推断所有生命周期或手机正确。当前源／编译WXML的Canvas type=webgl、子模板和普通层级与预期一致；这些结构不是可见合成证据。

## 未完成、未采用的配置试验

[微信官方示例配置](https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/project.config.json)显式声明`setting.coverView:true`，而本项目source／built两个common配置未声明；没有private覆盖文件。这只建立声明差异，不证明缺失字段默认为false或当前实际engine值。[官方CoverView例子](https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageComponent/pages/view/cover-view/cover-view.wxml)采用native组件内的树；该例不认证当前WebGL合成。官方项目配置文档一次打开不可恢复失败，没有重试或以它作已读依据。

按project-config Skill读取覆盖关系后，在两个现存common文件临时声明该字段，原字节先保存于任务tmp。源代码、其它字段和6项保留修改未动。一次编译dispatch后的[立即原图](experience-current-native-composition-cover-setting-trial-dispatched-2026-10-01.png)仍在初始化；此时错误地发出SDK currentPage，未取得状态。finally按原字节恢复配置，但又在未确立第一轮完成时过早派发恢复编译，[恢复dispatch原图](experience-current-native-composition-cover-setting-final-restored-dispatched-2026-10-01.png)显示JSON编译阶段，第二次SDK读取同样失败。两条失败记录的详细error为空，不补猜具体错误码。这是本轮harness编译分流错误，不是有效的字段否定试验或产品黑屏证据。

之后没有继续刷新／重开／清缓存／换库，也没有复制旧READY。待新[无等待原图](experience-current-native-composition-cover-setting-current-pending-2026-10-01.png)确实显示地图后，只读一次currentPage成功，沿原owned Context重进。当前[实际恢复原图](experience-current-native-composition-cover-setting-after-pending-restored-2026-10-01.png)为手动North45°READY／4051 BSC／2目标，无选中／跟踪／modal／preview，10文件／1,789,615B；普通Sky控件依然缺失。两份配置SHA逐字节恢复、private仍不存在，普通输出fingerprint与上一绑定相同。HTTP revision1／13:50:33UTC／fingerprint未变、PUT0和服务模块保持。

`coverView:true`的有效engine值与编译完成后的Sky画面均**未验证**，试验**未采用**。不把声明或dispatch成功写成渲染修复，不因字段缺失认定关闭。保留历史脚本和原始失败；不要重放`experience-native-composition-setting-2026-10-01.ps1`，其中无条件SDK读取不符合当前compiler分流。后续若新证据需要配置试验，必须先观察应用确已运行再接SDK，配置恢复也不在尚活跃的编译上盲目排队。

当前DevTools普通Canvas＋WXML合成保持实际失败，公开卸载／地图边界已证，配置原因未定。完整可见控制、资料／时间／返回、marker/name呼吸、整场辨认与科学影像质量仍保留；手机暂不可用、新月面未推手机、目标总资源／性能／包体／成本与最终独立审查继续未验。共享冷文件生产改动及其适用检查保持。唯一下一依赖归PLAN；Goal active、无预算、未完成。
