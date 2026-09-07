# 限定控件准入验证：NutUI React Taro

日期：2026-09-06。结论：`@nutui/nutui-react-taro@3.0.23-cpp` 不准入当前 Starward 生产依赖。保留现有 Taro 控件与 Starward owner；不升级 React/Taro，不修改地图手势。

## 检查对象与证据

附件二 §6.3 要求限定两个实际需要的复杂通用控件，本次选择计划/反馈日期时间字段的 DatePicker，以及主页/反馈含错误状态的 Form + FormItem + Input 组合。

- 官方 npm 查询的 latest 是 `3.0.23-cpp`；React peer 为 `^16.8.0 || ^17.0.0 || ^18.0.0`，许可 MIT。没有 Taro peer 声明，不能据此证明 Taro 4.2.1 兼容。
- 原始包与完整 manifest：`artifacts/miniapp/nutui-spike/package/`；pack 元数据/完整性值：同目录上级 `package-pack.json`。压缩包 2,515,522 字节，解包 12,502,252 字节；这是发布包大小，不是小程序运行包增量。
- 可重复检查：`node .codex/work-items/miniapp-integrated-2026-09-06/inspect-nutui-package.mjs`；输出 `artifacts/miniapp/nutui-spike/dependency-inspection.json`。
- 仅下载并解包检查，使用 `npm pack --ignore-scripts`，没有安装依赖、执行 postinstall、修改项目 package.json/lockfile。

## 两个控件的具体结果

| 候选 | 检查到的静态依赖路径 | 准入结论 |
| --- | --- | --- |
| DatePicker | DatePicker → Picker → Popup → `@nutui/icons-react-taro` 的 Close | 与唯一图标依赖约束冲突 |
| Form + FormItem + Input | Input 直接 import `@nutui/icons-react-taro` 的 MaskClose | 与唯一图标依赖约束冲突 |

DatePicker 相对 JS 依赖图包含 62 个本包模块；表单组合为 26 个。检查器追踪静态 import/export，不模拟 tree-shaking，也不把模块数冒充产物大小。

Input 的 `clearIcon`、Popup 的 `closeIcon` 可定制渲染，但静态 import 和 package.json 的强依赖仍然存在。包还声明了另一套 `@nutui/jdesign-icons-react-taro`。DESIGN.md §4.5 明确“所有 glyph 仍通过现有 SemanticIcon，不得安装第二 icon family”。未通过这一先决条件，不向项目安装该包，不用私有代码补丁、模块伪装或移除依赖声明来制造兼容。

另记录适配成本而非独立判退理由：Input SCSS 存在固定 38px 容器高度、14px icon 和硬编码 placeholder 色；使用当前 750 设计宽度时不能直接套入而假定尺寸正确。Form 的 useForm 是独立字段状态存储，需要受控适配，不能取代现有业务草稿 owner。

## 验证边界

本次为两个控件的源码/依赖准入失败结论，不是实际 WEAPP 构建、包体、三主题、大字、IME、安全区、触控或读屏通过结论。因上游明确禁止的依赖准入失败，未继续安装并运行候选；这些库运行维度未验证，不记录为通过。当前生产控件自身的实际交互/视觉验证仍按总方案继续。

不继续无限搜索版本或第二套库。本次没有试验依赖需要卸载；下载包留作任务内证据，不属于运行源码或第三方图标安装。
