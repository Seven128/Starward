# A入口日期与无效上下文恢复

本轮D启动清理后SDK失去响应，停止该已绑定SDK的提权被取消。未重复该动作，也未新开多个窗口。按唯一Goal的稳定性/输入失败恢复责任，继续处理本轮验证脚本暴露的A缺口。

首次脚本直接打开天空页时遗漏时区/观测时刻等参数，随后重复编码时区；这些错误输入不是正常公共入口验收条件。实际console却暴露已有问题：路由不完整时，应由既有ContextError提供返回入口，页面却在这之前派生民用日期/日期选项，`Intl.DateTimeFormat`抛出RangeError，无法显示恢复内容。这是已有输入失败边界，不是新增功能或更精细的时间要求。

`SpotSkyPage`保留原contextComplete校验及共享日期owner。仅在该上下文完整时调用`civilDateForInstant`与`observationDateOptions`；否则保留空的不可用派生状态，显示既有恢复内容。memo依赖加入contextComplete，避免查询完成但时区未变时锁住空日期列表。未增加默认时区、第二时钟/身份、日期范围或新UI组件。

新增检查执行生产页面这两段日期派生，修前实际因无效时区RangeError失败；修后缺失/错误/重复编码时区、上下文待确认、同区查询完成刷新、时区改变、跨午夜与预览取消通过。有效上下文仍使用原共享日期范围和实际当地日期。见[修前/修后及类型检查](experience-route-date-recovery-checks-2026-09-28.json)。这些检查不等于原生恢复画面验收。

已制备[clean-v13](experience-combined-clean-v13-candidate-2026-09-28.json)：SHA256 `8ead104e31b41f6ab015d1e543069dda6c2acca5df86694676208401fae9915f`，257文件/4,472,491 rawB，raw main2,084,432B、content1,012,055B、spot423,617B、sky952,387B。包含共享文件启动owner和本次日期守卫。无临时代次、诊断、vConsole或source maps，客户端fixture关闭，loopback8791不推手机；raw统计不是官方包体。构建通过，保留既有CSS顺序及webpack资产建议告警。v13**尚未打开**，没有挤出第二个活动工具窗口。

[最终绑定核对](experience-route-date-bind-check-2026-09-28.json)确认v12/v13目录指纹未变，差异仅项目名称配置与Sky生产页面bundle；原生enter/seed/readback记录仍全部绑定v12。唯一PLAN保留一个当前执行依赖，已核297个本地链接。[Context与差异检查](experience-route-date-close-checks-2026-09-28.json)通过；它只验证清单/显式控制源和空白差异，不认证事实、实际原生恢复或整体质量。

原生仍是失去响应的v12/9445，不拿v12截图或文件清理结果升级为v13的原生画面/恢复证据。原v12的文件owner实现和原生小路径保其范围，见[共享文件责任](experience-image-files-session-2026-09-28.md)及[证据绑定](experience-image-files-bind-check-2026-09-28.json)。未知4B夹具释放和当前活动Context也仍未确认。

当前依赖：已有会话可恢复时先安全退休失效v12，再打开一个v13，核实际无效上下文恢复、正常Context/日期和重解码/来源/Frame，释放经内容核实的受控夹具。原生工具仍不可用时，继续独立B3/C同条件生产输出与参考整页质量，保留这些原生未验项。全部商业排除/理由、自主路线、目标性能/设备/成本/独立审查及新版月面手机义务保持，Goal active、无预算且未完成。
