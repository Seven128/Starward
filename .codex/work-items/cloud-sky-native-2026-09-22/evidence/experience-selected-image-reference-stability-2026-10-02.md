# Selected 影像：报告条目更新保留相同天体的活动资源

2026-10-02，root 开发记录。当前源码、受影响检查、[独立实际 effect/生命周期与修后 GPU 读回](experience-selected-entry-dependency-fix-independent-review-2026-10-02.md)已闭合开发机制。云观星 Goal active、无预算、未完成。

## 发现与责任

[正常 selected / SDSS 作者实物](experience-selected-full-hook-resource-2026-10-02.md)和[独立读回](experience-selected-full-hook-independent-review-2026-10-02.md)绑定旧 page `a7138124b4bf0d712951792a8306f7d93d4da32430b38b508496475f19c4f172`。该受控路径每条件重新序列化同一 report：M51 .2°→.05° 的 selected W3 同为 DETAIL，同 owned 文件却重新解码 object0→4。它不证明稳定 Tanstack report 下纯缩放必然重解码。

实际 page 的 request、文件退休订阅、decode 三 effect 仅使用 selected entry 的 `objectRef`，却把整个 entry 对象列为 dependency。合法 report 替换可因此取消仍在获取/解码的同一资源、重解码已准备图片，或者隐式重试失败细图。时间投影当前保持 deep-sky catalog 引用，因此不宣称每次 16ms 时间 tick 都发生此开销；几何位置、标签、拾取及来源仍由当前 report / 已绘帧负责。

修复只把这三个 dependency 改为 `selectedDeepSkyEntry?.objectRef`，保留 asset 对象/level、visible、retry、Canvas revision、退休回调及全部业务逻辑。文件名相同不合并 metadata lease；新 asset/publication 仍更新解码。名字/坐标等 report 信息照常更新它们的真正消费者，不把旧 entry 当当前几何。通知 effect 继续使用完整 entry 展示当前名称。

没有提取第二个 native loader 或改已有共享公共文件/弱引用/GPU owner；现有 selected 文件/粗层恢复承担其已确认差异。没有新 source、图片处理、服务、IDE、手机、预算或出版变化。

## 当前实物与检查

- page `spot-sky-page.tsx`：207,244 B，SHA `0a6c31e6ffe9a91c6aa5cc51959e27d70e9e754108d966ad27bfde0b50c1f24a`。反向删除一条说明注释、恢复三条 dependency 后，原字节 SHA 精确回到旧 `a713…`。
- 实际页面 effect 回归 `deep-sky-image-lifecycle.test.ts`：22,669 B，SHA `91d92d357a807e22f097362f359b925851f18911eb18bdfe0917e349ad51ff91`。新增相同 reference 的 pending demand、pending/ready decode 及失败锁存三条反例，并在同测试核不同对象/显式 retry、新 metadata lease 同名文件仍有效更新。
- [修前日志](experience-selected-reference-before-2026-10-02.log)：21 项中旧 18 项过，三条新行为各真实失败，不用源码 marker 当行为证明。
- [受影响日志](experience-selected-reference-affected-2026-10-02.log)：49 项通过，覆盖 actual page lifecycle、selected request、公共 native consumer 和 native image owner；[小程序类型检查](experience-selected-reference-typecheck-2026-10-02.log) exit0。
- [源码逆向与保留文件读回](../../../../output/selected-reference-development-1002-r1/result.json)：仅三 dependency/一说明注释；六项设置/outbox SHA 全保持。receipt 当时状态为独审待定，不回写历史结果。

复用现有 Taro watch：15:18:11 日志报告本次编译完成（2.06s，保既有 CSS 顺序 warning），[生成 source map 读回](../../../../output/selected-reference-development-1002-r1/watch-readback.json)中的完整 page bytes 与当前 `0a6c31…` exact。旧 PTY session IDs 已不能读取，未新开 watch/IDE；读现有持久日志/生成映射补证。该事实只证明编译消费者，DevTools/WXML、手机及干净最终候选仍未通过。

## 修后实际链与独立闭合

[唯一一次同六条件新 r4](experience-selected-full-hook-repair-2026-10-02.md)绑定当前 page 和原 GPU owner，139 其他源字节保持；原 r3 仍属于旧 source。作者 result SHA `97e8638410d407d4ede3b16b42a8890253d300641982bd504de3ee5ebdc983d0`，新 bundle SHA `4f9b40143e49e3b497c52ce2adbb2b83f448ab9507afde754c59df234e8709ad`。root 完整阅读作者/独审原始结果，另执行[只读脚本](../scripts/experience-selected-reference-root-readback-2026-10-02.py)：[root 读回](../../../../output/selected-reference-root-readback-1002-r1/result.json)核140完整源码/快照、前后绑定、6正常 raw逐字节回旧r3、12主PNG全解码↔raw、实际final0及六保留修改，未重复渲染。

当前 M51 两档保同 bitmap0，第二档不新建 selected image；旧 r3 则 page decoded reference0→4。旧两张诊断 bitmap 的 weak-current 都仍为true（同有效lease/Canvas），不能称0当时已退休，也不以该诊断引用推断物理GC。新机制在这个相同信息重提交边界少一次512×512解码（source-equivalent工作1,048,576B），不是网络/GPU/native峰值/FPS收益；正常GPU成本及steady decoded模型未变。

实际已绘来源、六完整主图、暖帧 source upload0、hide/新Canvas/最终卸载均保持。hide current/GL0但恢复file lease1；新Canvas M31 bitmap8→9，原文件/出版相同、图片transfer0，地景alpha metadata仍74,167B；最终GPU纹理/bytes、lease/current0，8个encoded文件保留。独审还实际执行旧/新三个effect反例、八生命周期控制及删asset/generation dependency两个有作用变异；source/pub、不同对象/level、失败粗图/显式retry、clear/迟到及节点代次语义保持。

旧 r3 全像素/账本没有升级为修后运行；相应旧失败或receipt适配错误都保留。[weak-current 更正独立闭合](experience-selected-full-hook-weak-current-addendum-2026-10-02.md)另严格核旧note历史快照、修正记录及全683已绑定输入，原source/输出不改。当前下一依赖为连续同Canvas camera输入与端云总资源旅程，随后仍需整体质量/组合/目标运行时证据。

本改动不修 M51/M31 源图软化，不认证 native/GC/driver 总量、帧时、真实微信生命周期、全产品200 DAU容量或最终体验。
