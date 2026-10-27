# Native 偏好冷恢复与共享草稿实机回归（2026-10-25）

Root已更新并核对真实 Android APK，**原有效 r2 冷启动正确显示行星／不步行**；同次未保存银河草稿在 Quick→完整视图→Android Back之间保留，随后明确冷启放弃本轮临时草稿，回到 r2行星／不步行。没有重新保存偏好覆盖原 r2证据，没有点击“新建完整预设”或请求定位。本范围是开发反馈，全部 Native／UI／family／Goal仍未完成。

## 源码、审查、构建与目标

- 跨视图确认修复28pins：`b7fbf6c562163418e1f0ac86cef7bdd88e291295ac4ab63a222e053c0b0417ca`；[新源码独审](R20-NATIVE-CROSS-VIEW-PROFILE-CONFIRMATION-FINAL-REVIEW-20261025.md)独立12/12及末核28项通过。前四P2和新增跨视图确认的有效结果复用，所有失败原件保留。
- Root最终 mobile fast类型＋47文件232/232通过；没有重跑未改API或把局部／历史总数相加。日志 `tmp/mobile-fast-profile-editor-integration-20261025.log`。
- 联合79项原字节冻结 `tmp/native-cross-view-confirmation-build-20261025/source-freeze.json`，SHA `6a8855919cab5d451373025c12c32035b7429ada160df0de30bcd34b8c07c2b3`。ABI arm64-v8a，input `430b1d7aeebf0ac041a3f1e9dd3f956a274cbd2c6e13010beed11d4a8bdc8dff`。
- 实际Release编译2m40s，generated Gradle恢复；APK `d4a6c9da3475601103cc575b8675bddaa1f9184ec40d74d631309b69230b3bf4`、38,354,591B。实际aapt包／Activity、签名／旧自有证书、HBC自有API及完整input核对成立。
- 新独审通过后，Root仅一次USB `install -r`更新原539候选，原目标硬件绑定、Android34／user0／arm64及旧自有base.apk SHA再次核对；无timeout／transport／readback错误，实际installed base.apk SHA等于d4。未clear／uninstall／换设备／改系统或其它包。旧eb5／7fcc未安装阴性候选和所有缓存保留。

## 实际用户路径

以下原PNG和绑定元数据位于 task private owner的 `native-functional-ui-d4a6c9da/`，每次输入前核当前包／MainActivity／解锁／新鲜一次性截图，输入后重新捕获和实看；不以坐标派发代替实际结果。

| 真实节点 | Capture ID与已看结果 |
| --- | --- |
| 新包首次启动→今晚→我的→偏好 | `48e90bb3-048f-40f0-a175-af277d8d3ebc`／`4df0b976-df70-406e-8755-9bc22e29b80d`／`6ff87d8f-5d97-4b35-baf4-3aec3211d445`：原r2，正在编辑行星优先，已填目标行星、不步行，完整条件说明已更新。 |
| 只修改本轮临时草稿，不保存 | `b7e54c61-651e-4d80-85f4-d169c690c87f`：Quick已填银河，r2未变。 |
| 从该Quick卡进入完整编辑 | `9056fecd-1614-4b10-b788-0dc73f949754`：同一原名称／原目视与自驾；实际滚动至目标后的`1252e1c3-e8e2-4166-9214-40084d8e1c23`明确选中银河。没有另开“新建”任务。 |
| Android硬件Back关闭完整视图 | `fc0e0c94-8603-4789-b5be-bae55060fe1d`：返回Quick仍银河／不步行，r2，未点击任何保存。 |
| 明确冷启，放弃本轮未保存临时草稿 | `566b4e31-f06b-4688-8915-624d4e9dbb80`为银河前态；唯一restart intent/result读回新PID、`clearData=false`，没有早读失败或重复restart。 |
| 冷启后今晚→我的→偏好 | `f075f006-9f47-4232-b500-3c13f4774fe6`／`9291d405-e4e6-4ff1-8355-b9fd250f923d`／`105d170b-bc40-4792-a442-a96afa49e13d`：仍r2行星／不步行，未保存的银河没有成为持久偏好。 |

本轮没有读取手机私有SQL或宣称服务器零写；结论来自真实UI、安装／重启读回及一次性输入轨迹，与原生产SQL适配的合成独审证据分别成立。旧539的冷启r2错误投影见[R20先前反馈](R20-NATIVE-FUNCTIONAL-DEVICE-FEEDBACK-20261025.md)，不得将其历史失败覆盖为成功。

## 未完与例外

- 独立判别已证“新建完整预设”沿当前id写回原A，归F06新建身份责任；未在手机扩大该写入，不能称完整偏好family通过。
- Full Modal浅色顶部的系统状态栏文字为白色、对比不足；今晚raw observer enum与我的release-context技术行仍属已见投影／系统栏例外。上述冷恢复／共享草稿有效，不构成整页视觉全部通过。
- 本次没打开键盘、没模拟丢提交确认，也没验真实Android跨视图未知确认／新建或多预设写入；源端真实组件／生产SQL适配独审不能替代这些尚需的目标资格。
- Activity模块已编译／随包安装、未接实际permission消费者／未prepare或读module快照；同机normal/Home仍欠，fresh GPS未取得。原精确前台许可保留，未重试provider。
- Native API仍仅回环ready，手机私有业务UNQUALIFIED；原生API输出／iOS／完整导航及其它Goal义务保留。层叠与云观星播放性能、相关内存/OOM继续后置，OOM未解决。

目前手机为d4、MainActivity内偏好页，原r2／行星／不步行，无本轮未保存草稿。必要源修复与下一APK／目标观察沿唯一HANDOFF推进，Root独占设备、Git、构建与服务。
