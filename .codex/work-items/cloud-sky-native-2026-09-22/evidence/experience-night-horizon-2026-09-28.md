# B3 夜间低空层次与原生捕获代次纠正

本轮继续唯一PLAN的浏览/识别及模拟环境纵向链；没有重选技术、加工月面、推手机或部署。目标是缓解夜间局部浏览时天空到几何地平线的硬分界，不把一项色层修订当成完整地景。

## 实现与边界

`sky-gpu-renderer.ts`原在太阳高度≤−18°时不提交环境光pass，普通夜间只有平色底。现复用同一逆立体投影ENU射线、精确太阳row、GPU程序/缓冲及失败恢复owner：太阳散射仍随暮光衰减，夜间用便宜的uniform分支加入自有低空显示渐变，并在暮光中平滑退出。它不改变星点、标签、点选、几何地平或地景平面，也不代表当地实测气辉、光污染、天气/亮度。红光仍不提交该环境层。夜间多一次现有六顶点全屏pass，目标设备资源/帧耗时未测；不新增图片、纹理或下载。

Mini typecheck、受影响5项环境/失败合同检查及`git diff --check`退出0；没有为色值写镜像实现的测试。实际WEAPP独立构建退出0，[日志](experience-night-horizon-build-2026-09-28.log)保留三类既有CSS顺序/尺寸/webpack建议警告。NIGHT0928候选`sky/detail/index.js`为328793B，SHA256 `1da056833970e421c6a31b2d9fa831ee6d9e0fe752e1c68d46de8c5b13747232`；包含此前新月面和搜索保护，API为loopback，只能本机开发。

## 带代次的可比实际输出

官方CLI分别打开既有修前SEARCH0928于9429、新NIGHT0928于9428；SDK在每次操作/抓图前后读取Sky实际WXML中的唯一代次，核页面ID与项目配置。两者都通过Map搜索公开示例观星点→手动Sky→真实00:00时间tick→中文织女星搜索/定位→实际Canvas双点handler到85°。地点22.4826799N/114.5557147E、Asia/Shanghai，民用09月29日00:00/16:00Z，Canvas390.4×844，4121目录星；Vega标记两者同为(195.19999694824236,477.1700411168292)。截图197×423，都已查看。

| 结果 | 适用证据 |
| --- | --- |
| 夜间低空色层确实生效 | [修前SEARCH0928](experience-night-horizon-baseline-fenced-native-2026-09-28.png)，SHA `e34f8f76367ec45d11b3b8191de097c4ab9c7e2221d0da6d4e125bd005d7b8d6`；[新NIGHT0928](experience-night-horizon-85-fenced-native-2026-09-28.png)，SHA `b3b421224b53255fd69697f09c2c2de020c9907375a3b5d69f82b13d2cef9093`。[重跑像素记录](experience-night-horizon-pixels-2026-09-28.json)低空5487px均变化，平均RGB增量(5.763,5.709,7.868)；上空21240px完全相同，地面10089px中10088相同、均值不变。这是sRGB截图代码值，不是测光/手机屏幕读数 |
| 全天与局部可恢复 | [267.8°全天](experience-night-horizon-full-dome-native-2026-09-28.png)完整地平圆盘可见；[回85°](experience-night-horizon-return-native-2026-09-28.png)恢复同一手动方向、16Z/4121星。反向脚本从一位小数读数换算，因此不声称逐像素零差或物理手感 |
| 红光与普通返回使用正确模式 | 设置route实际选项已读回应用后Back；[红光已应用](experience-night-horizon-red-applied-native-2026-09-28.png)为黑底暖红，新增蓝色低空层不出现；[返回普通](experience-night-horizon-normal-restored-native-2026-09-28.png)恢复环境/银河。相机与00:00保留 |
| 随时间组合正常更新 | 同一手动方向、85°下[19:30](experience-night-horizon-late-dusk-applied-native-2026-09-28.png)已呈现11:30Z/4094星，[19:00](experience-night-horizon-dusk-native-2026-09-28.png)11Z/4084星且暗星渐隐，[12:00](experience-night-horizon-noon-native-2026-09-28.png)04Z/4146目录星、白天星点抑制和地表/天空亮度变化。目录计数不是肉眼可见数；这些离散帧不是完整连续过渡/设备帧时验收 |

参考Stellarium Web画面及已核视场换算仍见[地平对照](experience-horizon-comparison-2026-09-28.md)。当前新夜间色层只缓解低空辨认；前景/远近轮廓和完整地景质量仍明显不足，不能把这个平面候选称B3完成，也不把某种树/山或现场DEM加成普遍硬依赖。本轮到此结束地景色值投入，回到剩余组合、恢复及合并候选义务。

## 捕获连接与过早动作的纠正

- 首张`experience-night-horizon-85-native-2026-09-28.png`用了旧SDK9420。实际代次核查明确该端口为HORIZON0928，而exact-project工具读回为NIGHT0928；它**不是新候选证据**。只读取磁盘`project.config.json`、CLI退出0/`auto`返回或页面路径相同都不能绑定SDK端点到新候选。保留此图作为反例，正式前后图已在独立端口且前后核代次重收。
- 以往无代次读回的SDK图片/探针只保留为历史开发输出，不能仅凭固定端口/调用命令升级到另一个候选。exact-project工具、源码回归和构建证据分别保留其适用范围；不凭本次发现虚构过去每一连接状态。尤其上一轮极速搜索/异步键盘比较撤回，见[搜索记录纠正](experience-search-result-guard-2026-09-28.md)。
- `experience-night-horizon-red-native-2026-09-28.png`为设置动作未等待应用就返回的样本，不能作红光通过/生产缺陷依据；补实际选项应用读回后，`red-applied`才为该结果。`experience-night-horizon-late-dusk-native-2026-09-28.png`在时间脚本找不到尚未出现的panel后误接了截图，实际仍为00:00；不能凭文件名当19:30。脚本现等待panel、保存落定与已呈现帧；`late-dusk-applied`替代它。
- 当前脚本入口：[场景复现](../scripts/experience-night-horizon-scenario-2026-09-28.mjs)、[模式/时间/缩放](../scripts/experience-night-horizon-action-2026-09-28.mjs)、[带代次抓图](../scripts/experience-night-horizon-observe-2026-09-28.mjs)、[像素比较](../scripts/experience-night-horizon-pixels-2026-09-28.mjs)。极速搜索探针也改为必需代次与端口；新候选一次探针36ms样本旧行已撤，未执行旧行点击分支，不替代源码回归或手机极快输入证明。旧通用抓图helper已移除默认临时项目/9420；必须显式项目、端口，Sky还必须前后核候选标记，防止再次默取旧端点。

恢复时NIGHT0928/9428留00:00、85°、手动Vega方向、普通NIGHT、地景/星座开/W3关，所有面板关闭；[最终带代次恢复图](experience-night-horizon-final-fenced-native-2026-09-28.png)在抓图前后又核同一已呈现描述，SHA `cbf93e00b0ebe8d5df3f7546c6de223186117a9ce440a5fbeeb84303fd75e9e7`。SEARCH0928/9429仅为修前基线，同条件留档；旧9420为历史HORIZON，不用于当前源码。Context结构校验退出0（只核manifest/控制声明，不证实事实正确）。新月面手机、真实姿态/校准/后台、目标控件合成/性能/包体/iOS/费用/独立审查仍未验，Goal保持active、无预算。
