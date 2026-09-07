# 地图页反馈修订 01

状态：本次输出已由用户确认采用；正式入口见 [地图页当前采用资源](../../ADOPTED.md)。本目录保留生成与检查历史，仅日间、390×844、已选点位、中档面板。

- [当前预览](outputs/map-medium-preview.jpg)与[可编辑技术副本](outputs/technical-preview/code.html)。
- [Stitch 原件 ZIP](outputs/stitch-original.zip)、[HTML](outputs/original/code.html)、[PNG](outputs/original/screen.png)，原件未改动。
- [反馈范围](brief.md)、[提交提示](prompt.txt)、[来源及用量](run.json)。

按用户反馈恢复原 B 的 36px 胶囊搜索框、36px 白色圆形工具与原细线 SVG；9 个文字角色实际字号、字重、颜色与原 B 一致，三个缺失值使用原状态的12px与浅灰色。路线恢复平铺，导航移除可见文字，仅有方向箭头，保留 aria-label。

Stitch 原件未实际提供其回复声称的44px透明点击区。Codex 在独立技术副本补充，不改变可见尺寸；并补充地图工具/搜索名称、移除未经验证的地理准确性注释。运行 prepare-preview.mjs 可复现。

浏览器检查见 [尺寸与点击区](outputs/render-inspection.json)、[原 B 字体对比](outputs/font-comparison.json)。导航可见32px、透明44px，SVG一枚，可见文字为空。截图为浏览器原样输出390×843 JPEG，视口390×844。

这仍是静态资源：未实现真实导航、地图或面板行为，未验证 WEAPP；点标地理准确性未核实，保留原 B 地图和点标。HTML仍依赖远程地图与Tailwind CDN，未宣称离线可复现。生产文件未迁移；正式采用范围、资源依赖整理与未验证事项由上述采用入口记录。
