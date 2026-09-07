# 工具探针实测

证据为本轮专用Figma草稿及probes目录；工程探针不是视觉候选。

| 编号 | 状态 | 实际证据/限制 |
|---|---|---|
| T0-01 | 通过 | skill-discovery.json唯一repo入口；独立B任务实际读取并调用，experiment-1/B/rationale.md记录了范围、原始输入与执行来源 |
| T0-02 | 通过 | browser URL/fileName与Plugin document/page交叉核对；草稿tU01DsKBhSng9IHk1xlJQA/0:1 |
| T0-03 | 通过 | 原生root1:58、中文1:61、stack1:59、component1:62、instance1:66、SVG；真实树见probe-long.json |
| T0-04 | 通过（普通图片） | 项目自生成699byte JPEG实际导入并FILL显示；该色块不是实景照片 |
| T0-05 | 通过 | 实际Present后ax点击打开下一页，prototype-click.png显示已到达第二页；destination1:71 |
| T0-06 | 修复后通过 | round-0真实空白导出未删除；发现stack高度1，修正后PNG含清晰中文/图标/图片；同轮snapshot |
| T0-07 | 通过 | 原1:61变成长文案，height54、stack250；probes/boundaries/probe-long.png |
| T0-08 | 通过 | 两次begin/commit更新独占根，仅保留1个rerun-probe；1:40未改变；实际events |
| T0-09 | 通过 | 关闭Scripter后editor.press(1000ms)明确失败；重新打开后原root指纹核对成功 |
| T0-10 | 通过（识别真实部分写入） | 首SVG失败曾泄漏未及时挂staging的component1:6，读回后按确切结构清理；修正先append，未宣称事务回滚 |
| T0-11 | 通过（错误file/目标变化） | 实际错误file拒绝；人工改名后旧fingerprint更新拒绝；未尝试他人只读文件或升级权限 |
| T0-12 | 当前通过 | preflight扫描无凭证/字体；源和资源只在任务目录，新Skill单独repo入口；最终还会核对git范围 |

Scripter经Chrome全自动贴入/运行/读回/普通下载，无用户手工粘贴，manualInterventions=0。耗时和失败保留；未承诺完全原帖复现。浏览器URL策略禁止chrome://downloads，未绕过，该页面非必要，普通下载后的本地文件已真实读取。
