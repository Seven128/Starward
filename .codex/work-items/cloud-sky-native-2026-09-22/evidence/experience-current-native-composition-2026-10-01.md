# 当前开发者工具普通覆盖层合成失败

本记录补充[当前普通原生组合](experience-current-native-2026-10-01.md)，不改写其冻结75事件及原图。沿同一普通watch、PUBLIC_REFERENCE正式点Context、SDK 3.17.3、390×844/DPR3和已绘45°帧继续检查，未重启项目/watch/服务，未操作手机。源码未因本次观察改变。

官方SDK测得Canvas位于(0,0)、390.4×844；控件dock位于(12,662)、88×148，display:flex、z-index:12。使用官方SDK的视口坐标tap(56,736)，没有selector、React handler或state注入，天体列表从关闭变成打开；Canvas仍是4051目录对象、2目标、13:50:33 UTC、仙王座、手动45°。这证明该模拟器坐标路径能触发控件，但不证明可见性或物理触摸体验。公开SDK element样式代替一次已失败的selectorQuery样式调用；失败没有触发另开窗口或重启。

[该状态官方截图](experience-current-native-composition-coordinate-list-2026-10-01.png)仍只呈现Canvas。为区分截图漏层和实际工具窗口合成，使用已安装Computer Use的`@oai/sky`，从实际返回的唯一微信工具项目窗口“今晚去观星”恢复最小化窗口并取得原始窗口截图。只操作该窗口，不自动化Codex。实际窗口也只显示星场，没有本应打开的列表、dock、名称等普通覆盖层，见[原始窗口JPEG](experience-current-native-composition-window-2026-10-01.jpg)，1200×948、78,633B、SHA256 `f3894951e7ff9957be3dba6afd852907544fffefdbfca1b9244a7bf935a0972c`。未裁切或编辑；窗口显示DevTools 2.02.260932 Nightly、SDK 3.17.3。

因此当前DevTools的**普通Canvas＋WXML组合为实际失败**，不能继续仅记成“官方截图未验证”。目标手机仍未验证；此观察不证明普通WXML在手机正确，也不能外推到所有渲染器/版本。节点、点击和来源页正常不能替代Sky的组合验收。

[微信团队的Canvas弹幕组件说明](https://github.com/wechat-miniprogram/miniprogram-barrage)记录了类似的开发者工具普通view覆盖限制，并区分真机普通view支持。它的用例是2D Canvas；这是平台限制的相关原始资料，**不是本WebGL页面或新版手机已正确的证明**。当前实际失败与该资料相符是推断，尚无直接根因证据。未盲目改CSS，也未把交互/滚动/输入改造成受限cover-view树来掩盖问题。

[绑定](experience-current-native-composition-binding-2026-10-01.json)保本次trace快照、两份原图、上一轮原生绑定、当前源码与6项保留文件hash。普通watch包含那6项其它业务未提交修改，不是干净Sky交付候选。既有SDK正常旅程仍保其适用证据，呼吸/层叠/拥挤和完整组合质量未由此闭合。当前独立工作转共享银河源像素局部驻留的有界试验；唯一PLAN保所有33项、商业边界、手机/性能/最终审查义务。
