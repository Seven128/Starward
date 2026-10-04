# B2 土星环朝向缺失时保留有效行星

2026-09-24。C05 已有同刻日月/七行星位置、相位、角尺寸、土星主环与部分合法历史纹理，仍缺目标微信像素、外观上限及设备资源证据。审核当前 `validSkyPlanetGeometry`、缓存 projector、盘面、点选与 BFF 位置消费者时发现：土星的 `ringTiltDeg` 或 `ringPoleEnu` 单项缺失/损坏，会令整行七行星变成 `null`；有效的火星、金星等位置及土星本体也随之消失。这是可选外观朝向污染同刻独立位置的真实恢复差异。

新增正式 projector 回归先失败：损坏土星极轴后预期七颗仍在，实际为 `undefined`。修订共用合同为土星环 tilt/pole 要么一起有效，要么一起 `null`；单个有值仍拒绝。200/304/offline 共用 projector 仅在土星其它位置/相位字段合法时，把坏环字段成对撤回；整行错误仍撤回。可用的土星普通球面及其它行星继续沿同一精确帧绘制；环与扁球定向不伪造。即使上游本来就成对缺环，呈现状态也降为 PARTIAL、撤销离线完备声明并给恢复提示。合同、场景/盘面及 BFF 位置消费者均使用同一校验。

检查：修后 Mini projector/完整缓存路径/太阳系盘面 31/31；合同 6/6；BFF 精确位置/目录 14/14。Mini、contracts、API 三包 typecheck 退出0；正式隔离 WEAPP 构建 slot `sky-b2-ring-recovery-0924` 退出0，`app.json` 已产生，现有3条 webpack CSS顺序与体积建议见[构建日志](b2-ring-recovery-isolated-build-2026-09-24.log)。`context:validate` 退出0。未使用手机、现有 IDE、8787 或活动 WEAPP 输出。

此证据只覆盖损坏可选字段、合同与本地渲染消费。真实土星环阴影/光学厚度、其它适用纹理或物理外观、目标微信 Canvas 像素、整页峰值/流量、Android来源返回 Canvas 旧失败及独立审查仍开放。项目 Context 的产品 owner 已记录本次持久降级语义。
