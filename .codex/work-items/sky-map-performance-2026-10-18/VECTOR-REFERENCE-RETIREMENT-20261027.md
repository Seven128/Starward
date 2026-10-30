# 精确时刻星体变换：退休冗余原射线引用

本机继续D2的有界实现，产生于原始证据包尚未传齐阶段，沿当时当前源码核对。随后v2原件已在本机接收并复读，6018条结果与该实现方向一致；仍是历史结构分析，不冒本机实测手机字节或性能，不重新开发本修复。

## 责任与改动

`features/sky/sky-stellar-transform.ts`由BSC主目录和SAO选中tile的精确时刻frame共同消费。首次保守视口准入使用原始proper-motion射线；一旦`displayDirection`准备完成，角位置和prepared方向均已缓存，此后相机变化/points/光度读取不再需要该原射线。

在准备完成后将当前frame的`vectors[index]`置为undefined，释放这一条冗余强引用。没有修改/复用原对象，未知projector若已保留其不可变输入仍可使用；尚未进入视野的候选继续缓存原射线，不增加相机变化的proper-motion构造。公式、运算顺序、完整星数、时刻/供给身份、旧frame及显示/拾取消费者保持。

## 实际检查

- 新的责任层保留检查在修复前失败：活跃transform仍强持有已准备方向的原射线；修复后通过。
- 保留检查仅在隔离Node子进程显式GC，WeakRef观察原射线的强所有权，不修改产品GC策略、不当真机Heap或OOM证据。未准备的原射线仍活着，准备后可回收；原frame及位置/方向仍可读。
- 自定义projector保留输入、重复视口拒绝再进入、同刻相机复用和精确位置/光度身份检查通过。
- `sky-stellar-transform.test.ts`、`sky-full-sphere.test.ts`、`sky-view-projection.test.ts`共21项通过；覆盖BSC/SAO、完整下半球、实际Scene/拾取、过渡与原投影边界。

独立只读实现审阅已完成：未发现此向量退休路径必须修复项；BSC/SAO共用owner、未知projector输入不可变和暖相机复用均已复核。本机已与同批UI完成完整检查构建，身份见[UI证据](UI-INTEGRATION-20261027.md)；目标运行时验证仍缺。真机持续播放、全天跨字段、峰值/排空/退出、native/GPU与OOM按PLAN后置，仍未解决。此窄修不替代完整D2结果。
