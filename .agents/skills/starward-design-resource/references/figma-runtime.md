# Figma 执行与边界

先实际发现工具和权限。优先已有 Scripter + Chrome 登录态闭环；无稳定执行/读回才考虑固定版本的本地 `southleft/figma-console-mcp` Desktop Bridge。已有 Full 且官方 `use_figma` 可满足图片/中文/导出时可复用，但调用前加载其强制 Skill。Starter/View 账号查询并不能单独证明草稿 Plugin API 不可写；也不能证明远程 `use_figma` 有权限。

首版只记录探针通过的主路径。不自建通用适配器/relay/MCP 平台，不采购或公开端口，不每轮让用户粘贴。没有通过的路径时标 `unverified`，仍可开发离线 helper/检查器；不得伪称原帖复现或已自动化。

## 主路径探针与运行记录

1. 在用户授权的独立草稿或明确节点区域核对文件 URL/key、root ID、可编辑能力；没有目标时为此任务创建专用草稿，不使用最近打开文件猜测。
2. 创建小原生 Frame、中文 Text、Auto Layout、现有 SVG 图标、本地组件实例；导入项目有权使用的普通图片，另建第二 Frame 配点击跳转。
3. 导出真实 PNG，读回节点、fontName、尺寸、文本和 reactions，在 Agent 端查看；实际点击原型，不能只看 reactions 存在。
4. 改长中文，重新读回/导出；重复更新检查不叠加根节点。保存 fontName 与 round/revision，不从拉丁字测试推断中文。
5. 断开运行器、错误文件/目标消失/只读、中途异常分别检查失败路径。恢复后读回；普通 Plugin API 没有事务回滚。清理仅限受控 staging ID。

`scripts/figma-helpers.js` 是可直接插入 Plugin 脚本的少量 helper。写入调用需传实际 expectedFileKey 和本次 owner；`beginCandidate` 比较上次结构指纹保护人工改动，`commitCandidate` 再核对后替换所属根。不能按名称清全页。

真实Scripter探针确认public plugin的 `figma.fileKey` 是undefined（[官方边界](https://developers.figma.com/docs/plugins/api/figma/#filekey)），不能把这误判为未登录。每次执行前，浏览器实际读URL并核对目标key/文件名，再调用 `attestBrowserFile({observedUrl,expectedFileKey,documentName,pageId})`；helper交叉核对Plugin读回documentName/pageId。该身份来源标为browser+plugin，不能谎称fileKey由Plugin读回。复制文件可能复制pluginData，故不能只用nonce或节点名判断文件，每次必须检查新鲜浏览器URL。不获取private API权限。

脚本源、节点快照、导出与错误保存在任务资源目录。Scripter 的 IndexedDB 不是源码仓库。可用它的显式下载/导出 UI 保存结构与 PNG；浏览器自动化需先读实际 DOM 与工具文档，不用未文档化页面内存接口。底层 exportAsync 的 Uint8Array 必须保存为实际 PNG bytes；不得本地重画近似图补证据。

所有快照字段由 Plugin API 读回，不手填通过标记。`controlKey` 可由创建时 pluginData 标注，但检查还应验证该节点类型、可见性、文本/子树、命中和 reactions。截屏并非层级/字体的替代。

## 已实测的 Scripter 注意点

浏览器工具用实际文档化接口。Monaco 全脚本替换用编辑器 Control+A、剪贴板 writeText、Control+V；不能用 fill 当作全量编辑（虚拟 textarea 可能只替换可见片段）。Control+Enter 执行、Control+Shift+Enter 停止。插件关闭后先确认缺失，恢复后重新核对文件和节点再写入。

公共 Scripter 的 createWindow 回调使用 async arrow；匿名/命名 function 的序列化曾失败。可复用 scripts/scripter-export.js，通过页面生成的普通下载链接保存真实PNG与JSON；不要把其内存预览误当已落盘。ZIP应验证可解压、文件非空、PNG实际回看。

基础跳转目标必须是同页另一顶层Frame。此Scripter的静态page访问可写 instance.reactions；错误的嵌套目标曾令setReactionsAsync挂起。脚本停止后检查部分写入。Auto Layout先resize再设primaryAxisSizingMode=AUTO，否则resize可能将容器锁成1px；仅节点存在不能证明内容可见。检查器会考虑祖先裁切，仍须查看真实导出。

图片创建后先等待 Image.getSizeAsync；成功不保证首次PNG已有像素。本次地图和照片均曾出现节点IMAGE正确而首次导出空白。排查期间临时保留失败图，核对同root指纹未变，再做一次同设计补导并回看，单记技术导出而不混为设计修订；定稿后按资源生命周期清理失败导出。SVG可能已有写死的fill/stroke，只替换currentColor不能保证主题正确；从实际向量读回颜色与选中填充。

快照保留实际overflowDirection、绝对边界和实例mainComponentId。视口外的控件不自动判缺失，也不能仅靠名为“scroll”的容器证明可达；区分完整可见、滚动后可达的结构条件、仍需真实运行验证。缩窄medium后若只露按钮残片，按同一文档合法裁切修复，不能缩字号或擅自启用正文滚动。

资料（按实际使用时复核）：[Scripter](https://github.com/rsms/scripter)、[Local Bridge](https://github.com/southleft/figma-console-mcp)、[Plugin exportAsync](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/)、[Plugin loadFontAsync](https://developers.figma.com/docs/plugins/api/properties/figma-loadfontasync/)。远程 `use_figma` 的特有便利 API/图片限制不复制到标准 Plugin API。
