# 新会话接手补丁

本交付仅由 handoff-input/README.md、manifest.json、其中引用的 B 第 2 轮实际 My/Map snapshot 和 PNG、两个机械 helper，以及相关当前 Context 得出。没有读取作者生成脚本、原会话或其他方向；没有操作 Figma。

## 真实结构与修改范围

- My root `1:5207`；Map root `1:4999`。实际 My 的 `Contribution` 是普通纵向 Auto Layout FRAME `1:5236`，不是组件实例。
- 其已有直接子节点只有 heading `1:5237`、草稿/待审核 `1:5244`、箭头 `1:5251`。真实 snapshot 与 PNG 都没有可替换的说明文字；因此最小修改是在标题与状态之间新增一个 Text，而不是把标题改成长说明。
- 说明使用输入建议原文，不插入硬换行。沿用实际已有辅助正文 `Preparation` `1:5232` 的 Noto Sans SC Regular、14px 字号、21px 行高、字距和颜色。可用宽度 326px，Text 自动增高。
- 保留现有 8px 组内间距、14px 上下 padding。只允许 Contribution、utility `1:5226`、My content `1:5209` 增高；状态组 `1:5244` 和下方入口 `1:5253` 随现有 Auto Layout 下移。草稿 `1 条`、待审核 `2 条`、箭头、今晚计划、后续入口内容、导航和全部组件/实例保持原值。
- 运行时先检查实际实例及 main component 身份；修改路径出现 INSTANCE/COMPONENT 时中止。对整个 My 指纹仅排除新增 Text 和上述必要几何字段，再与原指纹逐项等价比较，其他任何变化均失败。Map 完整原指纹在修改前后及导出后都必须相同。

## 执行

1. 主任务先在 Chrome 新鲜读取目标设计 URL 和文档身份。
2. 将允许的 `figma-helpers.js`、`scripter-export.js`、本目录 `patch.js` 依次加载到同一次 Scripter Plugin API 执行。
3. 调用 `await runStarwardHandoff({observedUrl: freshObservedUrl})`。`freshObservedUrl` 必须来自本次真实浏览器观察，不能以 manifest URL 冒充。函数首先调用 `attestBrowserFile`，然后匹配原始两 root 精确指纹。
4. 函数执行原生 `exportAsync` 和同轮节点 snapshot，并提供 ZIP 下载，包含 `handoff-my.png/json`、`handoff-map.png/json`、几何检查与实例策略报告、实际导出指纹。完整保存这些文件，再查看两张 PNG。

补丁嵌入的 `HANDOFF_EXPECTED` 直接来自 manifest 原始指纹，不依赖调用方手填。画布已经修改后再次执行会因原始指纹不符而拒绝，避免重复添加说明。可使用 `download:false` 让调用者接收原生 files 并自行保存；这不会跳过真实导出。

## 检查与限制

已实际完成：输入节点结构定位、原始两页 PNG 检视、脚本 `node --check` 语法检查。

补丁运行时检查：326px 自然换行、行高整数倍、说明/状态间距、容器增高、后续入口间隔和底栏至少 16px 空隙、原始状态文字、Map 全指纹与 My 限定 diff。几何不符合会尝试撤销新增说明并恢复原容器尺寸/模式，直接报错。

尚未实际完成：Figma 执行、同轮导出保存与修改后 PNG 视觉检查，由主任务完成。手机实际阅读、手势、其他 viewport 宽度、生产 WEAPP 行为均待测；静态设计及几何检查不证明这些结果。
