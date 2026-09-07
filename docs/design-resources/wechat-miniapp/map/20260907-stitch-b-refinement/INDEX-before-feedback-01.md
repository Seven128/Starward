# 地图页中档主稿 · Stitch B 延续

状态：**候选，尚未采用**。当前仅覆盖日间 / 390×844 / 已选正式点位 / medium / 无场地媒体的一张主稿，不代表整个地图页的全部状态设计已完成。

- [查看当前预览图](outputs/map-medium-preview.jpg)
- [当前可编辑 HTML：技术整理副本](outputs/technical-preview/code.html)
- [同视口对比页](review.html)；本机服务运行时可访问 http://127.0.0.1:4281/review.html 。服务停止后用普通静态服务器打开本目录即可。
- [Stitch 项目](https://stitch.withgoogle.com/projects/587088532668047776)，修复画板：`90e6e511c60741639114ea42871766f0`，标题「今晚去观星 - 连贯底抽屉主稿（390×844修复版）」。
- [Stitch 修复稿原始 ZIP](outputs/stitch-repaired-original.zip)、[原始 HTML](outputs/repaired-original/code.html)、[原始 PNG](outputs/repaired-original/screen.png)。
- [修复前原始 ZIP](outputs/stitch-original.zip)及 [修复前渲染](outputs/before-repair-comparison.jpg)保留，不能当成当前稿。
- [范围与来源](brief.md)、[拟议差异与采用前缺项](proposed-design-delta.md)、[实际尺寸检查](outputs/final-render-inspection.json)、[素材来源](assets/ATTRIBUTION.md)。

## 生成与技术整理

本轮在已选 B 方向上提交两次 Stitch 请求：一张主稿修订、一次发现布局缺陷后的修复。两份实际输出均保留，无额外风格探索、技术失败重试或其他页面生成。

第一份主稿在真实手机视口中出现底部空白和工具遮挡；Stitch 修复稿恢复了贴底结构并实际输出 390×844 画板。原始导出 PNG 为 487×1055，本地比较视口为390×844，浏览器实际截图为390×843 JPEG（底边少1像素，原样保留），不通过重采样图片冒充原导出。

Codex 随后只在独立 `technical-preview` 副本修复：搜索输入的默认边框及点击高度、地图署名遮挡、点标循环脉冲、辅助入口命中区；另将地图图片改为随包本地引用。没有重绘页面或修改原始导出。可用 Node 24+ 运行 `prepare-preview.mjs` 复现这些修改。它是资源整理脚本，不是生产代码生成器。

## 使用范围与实际检查

当前视觉资源保留：地点身份→概览/天文定位→路线与到达→设施事实→资料/来源/纠错入口→想去/分享/云观星。主导航只有地图/我的。页面状态和交互以当前 Screen Contract 为准：本静态 HTML 没有真实数据、地图投影、三档同文档状态机或导航行为，开发不能复制它来代替已有状态 owner。

已在本轮浏览器对真实 HTML 渲染检查：390×844 内容边界、贴底连续性、地图工具与署名可见性、导航单行、主要操作和三个辅助入口的44px命中高度、无循环动画。记录在 `outputs/final-render-inspection.json`；未做当前 WEAPP 或真机验证。

**仍有明确缺项，不能直接登记为最终采用稿：地图点位依旧落在参考图海面，不能作为地理位置或坐标基准；部分辅助文字偏淡；字体和图标需与生产 owner 对齐。** 其余屏宽、主题、地图页其他状态和真实交互均未验证。先确认本页布局与视觉方向，再处理拟议差异并补足相关覆盖，正式采用时才切换 Screen Contract 入口。

HTML 仍依赖 Tailwind 与 Font Awesome CDN；字体文件尚未完整离线打包，离线时可能退化。原始 HTML、资源 PNG、地图图片、样式快照与来源已保存，不声称这是离线可复现的最终开发资源包。生成用量和输入身份见 `run.json`；未修改生产页面或原有采用入口。

