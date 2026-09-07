# 本轮验证

## 实際完成

浏览器插件 browser-client，390×844 逻辑视口；实际 JPEG 根据设备像素舍入会为390×843。Stitch 原稿与Codex可交互资源分开查看并保存截图。

- 无媒体顶部白色，header命中宽390、高44；从左侧x30拖动，medium→large成功。正文滚到464px后，header底边已离开视口；从可视区顶端再向下拖动，面板仍为large且scroll464，未误退档。
- 大档中段 Escape（桌面Back等价预览）回medium，doc回顶部。浏览器same-page history用于模拟；未执行手机原生系统返回测试。
- 场地单图：1枚宽366px图，容器390；多图3枚有露边、横向滚动和准确计数。顶部拖区在照片之后，随文档滚动。
- 设施相册1/2→2/2：下一张按钮及横向拖动均到对应Stitch照片，计数/标题/来源可见。轻拉30px后保持open并回到transform:none；明显下拉160px后关闭，恢复同一facility焦点、large和原scroll。
- 场地相册分页后X关闭成功，返回对应缩略图的横向位置，保留doc scroll0/large。
- 更多场地信息展开高度96px；数据来源展开时采到内容中间高度8.59px和旋转矩阵，反向点击后open=false，未留下空白。两处共用实现。
- 日期按钮中心195.2与尺中心195.2对齐；选中刻度时间文本y201.8，月相y225.8，月相在下；computed font-weight400。
- 保留正常/部分资料/无记录情景、23日期与现有月相样例；本轮未重新检验全部上轮数据范围。
- node --check覆盖输出preview.js/content.js/gestures.js；构建成功。Context manifest/path结构验证通过；git diff --check通过（只有既有CRLF提示）。

## 修正与限制

在真实截图中发现旧照片层--reveal使相册计数与来源透明，已修复并重看。最终证据在evidence/basic.jpg、gallery.jpg、astronomy.jpg；Stitch原稿图在outputs/stitch-original/rendered.jpg。

这是日间HTML设计伴随原型，不是WEAPP生产还原/真机触感证明。未验证原生系统Back竞争、夜间/观测模式、大字号、图片pinch缩放、失败/极慢解码和高频多指中断。共享Context明确缩放与下拉竞争、reduced motion和失败恢复需求；原型提供单指分页/下拉及短淡化，但不声称完整原生图片查看库已完成。
