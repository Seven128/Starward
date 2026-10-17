# 原生跨午夜拖动预览与取消（2026-10-09）

沿当前官方会话、8791隔离开发Context revision6 / selectedAtUtc2026-10-09T16:30:00Z / night localDate2026-10-09 / Asia/Shanghai，不新增产品代码、构建、素材或后台服务。前段00:30刻度提交与日期恢复仍保独立证据，本段只补未验的原生拖动/取消路径。

官方公开SDK读取时间尺ScrollView offset(12,512)、366.4×72 CSS尺寸，公共Taro生成节点uid sky-orientation-time-ruler-scroll、aria“拖动选择真实观测时刻”、当前00:30/第26真实时刻。回执1791517980695 /1791517981879 /1791517996400；SDK aria-valuetext attribute为空，公开节点有值，不能把前者当时间缺失。

官方 coordinate touchstart(180,548)→touchmove(250,548)，未结束手势。回执1791518020397 /1791518021717；实际ScrollView原生滚动产生预览，非trigger伪造scroll/detail或私有handler。已绘frame1791518022999 READY /2026-10-09T14:30:00Z /前一晚22:30，控制层显示“预览/取消预览”；时间从公历10月10日跨回10月9日。公开完整basis、center、scale、0.8749957624635967°保持，方向与时间独立。native-midnight-held-preview.png已查看，星点实际可见，WXML控件仍不可见FAILED；没有before配对截图，不声明像素效果量或精确RGBA恢复。

手势持有期间HTTP200 GET同Context，native-midnight-held-preview-context.json实读 revision6 /16:30Z /night localDate9，未把preview写入服务端。公开取消按钮_Abg先验证aria再tap（1791518055603），然后coordinate touchend(250,548)（1791518056797）。实际frame1791518058216恢复00:30 /16:30Z，view除frameAt外与preview相同，也与预览前1791517853430一致；native-midnight-drag-cancel-context.json同Context仍revision6 /16:30Z /localDate9。取消先于迟到touchend，现scroll-settlement.cancel阻止该release重新提交；只核这一实际事件顺序，不认证所有惯性、并发、断流、hide与平台组合。

源码责任保持OrientationTimeRuler /createScrollSettlement /contextSession：drag期间preview，release/quiet-settlement明确提交，cancel撤回未提交时刻。未更改共享时间尺、不用成功tick代替拖动、不用SDK成功代替实际Scene/Context读回。

当前Context rev6/00:30、FOV0.875°、手动方向仍为此前Moon定位方向；warm服务保持。33项义务原值不提高，WXMLFAILED/根因UNKNOWN、手机/物理/独审MISSING与全时序验收保留。

下一独立缺口：现moon/planet renderer返回boolean可包含基础盘回退，Scene未交付实际使用影像的同帧身份；hook publication不等于已绘publication。先沿现galactic imagePainted/accepted-completion机制核共享日月行星影像交付与回退边界，再决定必要产品改动，不按对象复制脚本或图像版本。
