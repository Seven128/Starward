# R20 检查与独立API消费者复核

复核人：本聊天root，独立于实现代理`r20_shared_checks`。范围为该代理16个源码/检查/CI文件及其实际验证输出；不是原生设备或远端CI验收。

- 查看AppID的真实扫描边界、当前身份owner和新增临时Git回归。历史Markdown不作为活跃配置身份；配置/可执行源码中的第二身份仍拒绝。未改当前AppID或历史文件。
- 对照当前app.config、native-chrome与primary navigation，旧tabBar字段确已退休。更新探针仍保窗口颜色、custom导航/文字和禁止旧栏回归；现有11项行为检查与4个source probe通过不冒目标视觉一致性。
- 初审发现CI把整个`tools/miniapp`排除跨产品消费者，而该目录包含管理命令与真实页面测试。实现已改为明确的WEAPP工具家族白名单，admin、operations browser、共享/未知工具仍触发；复读最终selector与13项反例/工作流检查结果。
- API实际`SkyQuery`支持五种目标，而原Gaia场景身份无法命中这些别名。读取新target adapter、Hipparcos/OpenNGC既有加载/投影owner及真实App `sky-client`、SkyScreen消费者。目标保持来源身份，轨迹使用同一时地输入；未改变Gaia场景源、WEAPP/BSC/SAO负载。
- 银河方向取项目原常量并使用既有observation frame/stellar projection，原night计算仅常量复用、数值不变；未知星等为null，方向代理不声称亮度或现场可见性。既有Hipparcos/OpenNGC投影均明确无折射，新响应标none，历史normal仍可消费。App没有将此magnitude作为必需数值的消费路径；其响应解析、所选目标显示/轨迹/保存入口继续沿原合同。
- 复读API 102项、native App 34项及各noEmit输出；来源资料v79的实际hash/536行恢复和原失败1/1对照归[实施证据](R20-SHARED-CHECKS-20261023.md)。补回锁定资料与篡改FRESH判据不同，本批没有修改发布资格。

纠正上述CI范围问题后未发现本批其余必须修复缺陷。保留独立API的POC/真实业务持久化义务、原生App完整Context/定位/恢复责任、远端CI和设备画面/交互验收；本复核不对它们作通过判断。Mini API整体新结果由root独立运行后记入CURRENT-VALIDATION，不使用本代理的代表用例通过替代整体检查。
