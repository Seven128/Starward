# I01 本人候选点资料、位置与公共时间的实际缺陷修复

复用当前普通525输入与原Map/Sky/资料/来源route。直接检查client位置绑定、presentation/SAO锚点、controller及候选投影。首完整page真实本人位置HTTP200，客户端拒绝celestial_position_binding_invalid，无法定位/跟踪；17Scene54请求，终态资源MISSING保留，任务browser/API已关闭。正式spot的通过证据不覆盖这个候选消费者。

候选投影每次new Date产生不同来源retrievedAt，进入计算semanticKey后改变dataRevision；位置再次计算的版本不同于已绘报告。沿候选Sky owner改为submission.updatedAt，与现投稿来源规则一致；相同提交证据保持版本，实际提交/Context变化仍有版本边界。未放松严格位置绑定、未改正式点或投稿/地图业务。新增实际service/controller→现client validator回归，修前binding_invalid失败；修后覆盖两次读取、明确时间更新及旧位置拒绝。相关9检查和服务端类型通过。

修后原SAO19229检索→跟踪→资料→时间尺13:00Z→14:00Z预览取消→再预览明确提交→资料/来源Back→原Map，一次50Scene68请求。八回执均保MAP_POINT、精确候选坐标、contribution身份；明确提交才同Context rev1→2。两私有位置HTTP锚点04:00Z与当前report全部身份/来源字段匹配，04:00不是最终已绘13/14时刻。原资料13时刻356.4°/43.8°、14时刻349.4°/42.1°，来源Back保后者，与同跟踪中心ray一位小数一致，非独立星历精度认证。

原Map/最新Context及Sky root退休通过，encoded/decode/GPU/请求逻辑模型0；候选面板仍FAILED，未重开marker冒恢复。1产品源、1新测试、WEAPP构建0改；无负权限HTTP重跑/下载加工/服务重启/提交推送。隔离合成投稿不冒真实账号；普通Prepared空、HiPS关、Mellinger低分辨率DISPLAY，完整33及原生/新版月面两手机/物理200DAU/独审保持开放。

见[修后与失败读回](proposal-shared-readback-2026-10-06.json)、[原公共消费者](../../../../output/playwright/proposal-shared-1006-r2/proposal-shared-result.json)、[针对检查](../tmp/proposal-shared-checks-receipt-2026-10-06.json)。下一全88星座先核当前真实覆盖，唯一顺序见[PLAN](../PLAN.md)。
