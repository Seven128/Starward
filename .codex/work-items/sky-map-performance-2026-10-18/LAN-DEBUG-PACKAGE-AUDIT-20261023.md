# LAN 真机调试包体入口独立核对 — 2026-10-23

## 结论

本次范围是跑通手机热点下的 LAN 真机调试；原完整 Goal 仍暂停。当前截图是 DevTools `2.02.2610192` 的真机调试编译拒绝：`main package source size 2066KB exceed max limit 2048KB`，尚未建立 LAN 调试连接。此错误本身不能用于判断热点、USB ADB、VPN 或 WebSocket 连通性。

本机官方 `wechatide-skill` `0.3.14` 已明确提供开发期 `setting.bigPackageSizeSupport`：**“预览 / 真机调试放宽主分包体积上限”**，且列在 **“可写 private（开发期偏好）”**。其 `skills/project-config/SKILL.md` 要求开发期偏好优先合并写入项目的 `project.private.config.json`，同名 private 字段覆盖 common。这个受支持的局部开发设置与本次任务相符；无需先拆产品模块、改采用 UI、删资源或修改压缩策略。

独立核对来源：

- `C:/Users/momoooo/.codex/skills/wechatide-skill/references/project-config-fields.md:9-16`。
- `C:/Users/momoooo/.codex/skills/wechatide-skill/skills/project-config/SKILL.md` 的“文件与生效规则”“工作流”及“移交”。
- 该字段表链接的[官方项目配置文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)仅作入口；本审计依据实际读取的本机官方包说明，不声称本轮已在线核验该网页。

## 当前精确项目与保留边界

目标项目为 `C:/Users/momoooo/AppData/Local/Temp/starward-device-feedback-TAV3wm/generation-000018-4Kvksw/project`，`miniprogramRoot` 为 `dist/weapp/`。本轮只读核对时，shared `project.config.json` 未声明 `bigPackageSizeSupport`，其 SHA-256 为 `f353db3094255b6b0e8c371b6c67605591134dc2e21bd3f41a1e4a14b57cd437`；同目录尚无 `project.private.config.json`。这是读取时点事实，Root 写入前仍需保留可能随后出现的 private 内容。

允许的最小后续动作仅是在**这个精确项目的本机 private 设置**中合并 `setting.bigPackageSizeSupport: true`，保留其他配置及 `dist/weapp/**` 全部原字节；不改仓库 common 项目配置、AppID、基础库、地址、编译压缩、`packOptions` 或 ignore 规则。该设置是 IDE 本机开发偏好，不是向冻结包写入新产品源码，也不需要重建 gen18/R28。

已复核历史包体 owner：`PACKAGE-AUDIT.md`、`R19-POST-TAB-ASSET-BUDGET-AUDIT-20261023.md`、`R19-POST-TAB-ASSET-RETIREMENT-IMPLEMENTATION-20261023.md`。普通 gen18 的本地文件和为 5,017,634 B，其中静态 main 2,029,271 B；原 Stable 官方普通预览 main 2,088,195 B。两种旧结果均不能覆盖当前 IDE 真机调试的 2066KB 拒绝，更不能将开启大包后的通过记成普通生产 2 MiB 准入。

## 必须保留的验证边界

1. 先保留精确项目配置并核对合并结果；只写一项本机偏好。依旧保持整个普通 gen18 `dist/weapp` 文件集与指纹，保护 Harness、冻结构建、私有原件和未提交源码。
2. 由当前官方入口进行一次必要真机调试重试并读取真实业务结果。字段文档没有承诺本 IDE/AppID 的精确新阈值，也没有证明当前运行窗口已读入设置；文件写入成功不能冒充大包准入成功。若仍拒绝，应保留实际错误并判断该边界，不循环重建或叠加文件排除。
3. 即使出现二维码，也只证明调试包已跨过本次包体门槛。LAN 模式仍须选真实热点 WLAN 地址，实际监听/手机可达、非零运行时交换和可见页面启动才建立调试通道；绿条或零收发不能通过。
4. 开发期放宽不消除原主包预算紧张，也不证明生产上传、UI 验收、性能改善、Heap 可采集或 OOM 解决。当前截图与后续调试结果分别记录；普通生产包仍由原 2 MiB 预算和官方普通入口结果约束。

本审计开始前已读项目规则、global、开发 skill、architecture 与当前配置/包体 owner。Root 找到上述更小的官方入口后即停止生产拆包方向；没有形成或实施产品改动建议，没有调用编译、IDE、设备、服务、Git、网络写操作或删除文件。本轮唯一写入是此任务证据文件。
