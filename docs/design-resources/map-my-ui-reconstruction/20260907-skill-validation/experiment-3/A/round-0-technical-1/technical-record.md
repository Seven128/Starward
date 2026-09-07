# 初稿技术修正 1

实际 Figma 执行反馈：`in set_minHeight: minHeight cannot be set to 0, use null to unset`。本次未获得 PNG，不属于视觉修订。

保留上一级原始 design.js，仅本目录的副本修改横向 Auto Layout helper：`n.minHeight=min` 改为 `n.minHeight=min > 0 ? min : null`。默认无最小高度约束时使用 API 接受的 null，正数最小高度保持原值。没有调整视觉方向、字级、布局参数、内容或素材。

检查全部 minHeight/minWidth/maxHeight/maxWidth 赋值：另一个 minHeight 为合法正数 20，没有其他 0 最小尺寸赋值。

Node 24 绝对路径执行 `--check`，退出码 0。尚未重新执行 Figma，也未读取或操作浏览器；等待主任务核对失败执行是否留下 root，再由主任务执行此版本。
