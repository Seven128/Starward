# 小程序当前所有者

先读取当前文件，不把本引用变成第二份合同：

| 内容 | 路径 |
| --- | --- |
| 主合同与子文档路由 | `project_context/areas/main/screen-contracts/wechat-miniapp.md` |
| 控件 inventory | 其 `wechat-miniapp/surfaces-and-controls.md` |
| 地图/我的与面板 | 其 `wechat-miniapp/map-and-finder.md` |
| 概览/天文、时间与云观星 | 其 `wechat-miniapp/spot-and-sky.md` |
| 可访问性、状态与恢复 | 其 `wechat-miniapp/shared-state-and-recovery.md` |
| 内容密度判断 | 其 `wechat-miniapp/information-design.md` |
| 精确视觉值 | `DESIGN.md` 小程序段 `miniapp-tokens:start` JSON；`tools/miniapp/generate-design-tokens.mjs` 派生 SCSS/TS |
| 地图组合与逻辑 | `apps/wechat-miniapp/src/pages/map/index.tsx`、`spot-panel.tsx`、`time-ruler.tsx` 及同目录状态 owner |
| 我的入口/内容/计划 | `apps/wechat-miniapp/src/pages/my/index.tsx`、`src/features/my/my-library-page.tsx`、`plan-entry.ts` |
| 图标/素材 | `apps/wechat-miniapp/src/components/semantic-asset.tsx`、`src/assets/icons/`、`src/assets/semantic/semantic-asset-manifest.json` |
| 原生尺度/导航 | `src/theme/native-metrics.ts`、`src/components/custom-nav.tsx`、`src/app.config.ts`（均位于小程序） |

地图只有 Map/My 主导航。Search 是子页；正式点首次选择打开 medium。hidden 是独立 visibility，small/medium/large 裁切同一有序文档，large 才滚动；把手独占档位拖拽，tap 无动作。媒体仅在 medium→large 拉出，无图不留空。概览/天文是身份下方吸顶定位文字；固定栏想去/分享/云观星完整保留。layer 与 panel 使用单一协调器互斥，图层三选项及真实时间切片不造新业务。LIGHT 不伪造小时变化。面板只呈现客观事实，星图只在带正式上下文的云观星。

我的保留紧凑账户、单一设置动作、计划/贡献与主页链接/导入真实状态；收藏留在 Search。读代码中的鉴权、初次加载、缓存旧值、刷新失败、无计划/草稿/审核/导航失败路径，区分当前实现偏差与应有职责，禁止假会员/统计/第二页签。

2026-09-07 核对：小程序已采用固定 logical-px 字级和 44px 命中下限，不能从旧 10–12px 或 88rpx 通用示例重新缩放。标准字号 320/375/390/430 与长中文是当前义务；200% 大字号被 owner 暂停，除非本轮明确恢复，只能单列候选探索。主题以 JSON 当前值为准，旧文字说明不构成第二套 tokens。

历史 Open Design、selected-design-bindings 和资源 hash 门禁已退出普通开发；本 Skill 的资源包仅服务用户明确要求的设计探索。不要恢复 `test:miniapp:design-bindings`。需要生产检查时读当前 `package.json` 和 `project_context/development-workflow.md`；Figma 静态导出不是 WEAPP。
