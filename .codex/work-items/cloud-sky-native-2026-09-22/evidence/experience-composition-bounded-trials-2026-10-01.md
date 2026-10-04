# 普通覆盖层的有界试验与原页面恢复

沿既有60065任务BFF、普通watch7287、唯一微信开发者工具项目、SDK3.17.3和同一PUBLIC_REFERENCE Context进行。观察帧仍为2026-09-30T13:50:33.000Z、手动45°、4051亮星目录对象和2目标。未使用手机，未重新解析Context或提交时间，未重启IDE/watch/BFF。这里补充[此前实际组合失败](experience-current-native-composition-2026-10-01.md)，不改写旧冻结证据。

## 拾取与输入的区分

临时包装当前页面原生事件dispatcher，仅记录公开触摸坐标并转发原始事件；finally恢复。已绘Alderamin标签位置约(96.02,342.62)。官方SDK selector触摸流的start有此坐标，但end实际为(0,0)，尽管输入文件给了changedTouches。换用官方SDK视口坐标tap，start/end都绑定该位置，生产拾取返回Alderamin/HR8162和SAO19309两项真实选择；公开点击Alderamin行后，选择及资料内容一致。

这纠正此前“亮点无身份”的输入证据，不证明物理手势，也没有产品拾取修改。资料/选中态已存在，实际[官方原图](experience-current-native-composition-known-frame-picker-selected-2026-10-01.png)仍没有对应WXML资料、标记和名称。

## 呈现路径试验

| 试验 | 实际结果 | 结论边界 |
| --- | --- | --- |
| 临时将Canvas设为visibility:hidden，再恢复 | SDK计算样式分别为hidden/visible，但两张原图相同；原style已恢复 | 没有证明画布实际隐藏，不能把这当作覆盖层揭示试验通过 |
| 画布内、外各一个扁平CoverView，加普通View颜色探针 | Taro模板/节点、152×40布局与预期一致；原图仍没有三个探针 | 此DevTools条件下没有建立可见覆盖；没有据此迁移整个产品UI为CoverView |
| 原生32×32离屏WebGL→离屏2D复制 | 4096通道全部为预期洋红，0差、GL0；两canvas尺寸归零并请求context loss | 只证明小幅复制API，不证明可见页面合成、全尺寸性能或GC |
| 同一生产WebGL renderer离屏绘制→页面typed 2D呈现 | 页面属性确为2D；14次1171×2532复制，JS提交累计4ms/最大1ms；官方原图仍只有星空 | 提交耗时不是GPU复制或帧耗时；没有解决普通覆盖层问题 |

全尺寸试验期间，实际微信窗口出现“模拟器长时间没有响应”提示，[提示原图](experience-composition-presenter-window-watchdog-2026-10-01.jpg)与[关闭后的原图](experience-composition-presenter-window-closed-2026-10-01.jpg)保留。只关闭提示，没有终止/暂停模拟器；关闭后仍只有星空。先前SDK READY与复制计数不认证整个呈现端健康。无直接因果证据，不能认定该提示由复制独自造成，也不能忽略该失败信号。

试验源码和patch分别冻结于任务tmp/evidence，没有采用。页面根、画布容器、返回层计算样式均为visible/opacity1，只排除这些已测祖先的隐藏，不证明全局样式或平台根因。一条祖先诊断曾误带完整路由，已移除该字段并记录routeUidOmitted；新诊断仅输出公开Canvas ID和样式，冻结前校验不含路由query。

## 恢复与当前依赖

两次源码试验均按保存的原始字节恢复。页面原始及当前SHA256为`c7e354a4b84ee84c986810c8682e7d51c18bd2608865b0eec110750823d8fea2`；扁平CoverView试验为`46dde1b5947e48c544505553e1c36fc962e2573faea77f1d560afc2f7415661d`，全尺寸离屏呈现试验为`7f1a72e2f08f19ab50e1e5bf081c1770acd520d1d93354112088f163c504d5d9`。当前普通watch完成后复用原Context公开手动进入；实际Canvas节点nn16/p2=webgl、公开ID spot-night-sky-scene、visible；没有临时dispatcher、presentation计数或探针。

[恢复后官方原图](experience-current-native-composition-presenter-trial-restored-2026-10-01.png)已查看，仍只显示星空，DevTools普通Canvas+WXML组合保持失败。6项设置/outbox保持原哈希，84生产源输入及3冻结候选由[新绑定](experience-composition-bounded-trials-binding-2026-10-01.json)复核。普通输出仍含原6项修改，不是干净交付候选。

下一依赖继续由唯一PLAN维护：整场辨认、marker/name/artwork/science texture/coverage的尺度与反向恢复。新[M42科学影像参考](experience-scientific-image-reference-2026-10-01.md)支持区分科学影像和识别辅助，不采用DSS素材或从参考像素推断本产品覆盖。没有新呈现机制或失效信号时，不重复这些失败试验或工具启动。完整合成、源质量、目标总资源/性能、手机及最终独立审查继续开放。
