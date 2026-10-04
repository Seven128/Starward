# D 当前正式候选原始字节复核（2026-09-24）

本轮 C 光学 TRIAL 客户端门禁修复后，使用 `MINIAPP_ISOLATED_CHECK_BUILD=1` 与 slot `optical-gate-0924` 正式构建 WEAPP；构建前目录不存在，产物仅写 `apps/wechat-miniapp/dist/weapp-check-optical-gate-0924`。Taro/webpack 退出 0，原先 CSS 顺序及 244 KiB 推荐阈值相关共 3 类 warning。没有用用户的 Android、现用开发者工具、8787 服务或活动 dist 输出。

对该输出目录实际文件按相对首级目录分组，`sky`、`spot`、`content` 是分包，其余是主包；本地原始字节和文件数：

| 分组 | 文件数 | 原始字节 |
| --- | ---: | ---: |
| 主包（含工具配置） | 129 | 2,070,214 |
| sky | 22 | 904,580 |
| spot | 37 | 423,617 |
| content | 69 | 1,012,055 |
| **合计** | **257** | **4,410,466** |

主包相对 2 MiB 原始文件和仅余 26,938 B；这是当前独立候选的**文件和**，不等于微信上传/预览实际包体计量。与更早构建的直接差值混有期间多个模块改动，不能归因给此门禁修复。当前 `sky/detail/index.js` 302,818 B；官方包体、加载/内存/帧耗时仍归 P1/P4/V05。

另从工作区在用静态源直接求和：`workers/miniapp-api/assets` 的 `celestial-names`、`celestial-names-v2`、`constellations`、`deep-sky`、`jupiter`、`mars`、`mercury`、`moon`、`saturn`、`sao`、`sao-v2` 加 BSC v2/v3 JSON，共 **1,938 文件、125,921,895 B**。比 [此前库存](current-sky-byte-inventory-2026-09-24.md)多 2,903 B，正是本轮已接的 `saturn` 正式图/清单；排除项、云副本/备份/请求头/压缩/账单和未获准光学数据仍与前述库存同口径。该数只用于当前资源构成，不作为全天高清影像或月费上限。

下一项 D 需在不占用户环境的隔离正式服务中核当前发布路由、旧新版本/失败恢复和请求量，并分别记录可测资源与仍缺的云流量/Agent现金事实。只有实际微信包体、设备峰值与生产计费读数能关闭相应验收项。
