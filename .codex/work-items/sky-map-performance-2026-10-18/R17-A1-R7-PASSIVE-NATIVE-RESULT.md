# r7 被动 native 读数：保留错窗的实际位置已错误

一次公开 selector batch 已读到当前错窗的 scrollLeft=0，选中 tick33 的中心753.5px，比轴线192px向右偏561.5px；与真实手机上04:30:20预览却显示12/14/16点尺相符。这把“后续当前位置真的错误”从旧 scroll 事件推测变成了有几何读数的事实。它没有确定最初失位时点、native重建或微信内部原因；r7入场 FAILED 继续保留。机器结果见 [R17-A1-R7-PASSIVE-NATIVE-RESULT.json](R17-A1-R7-PASSIVE-NATIVE-RESULT.json)。

同一冻结 r7 app `c9874bb3c40e0167be3f840577ac02cb9ec3a86ba8539830a74b3b946b1f3ae1` / source `528b3d8a99ca4c87958e10b01ac7af7040b031e5270e601e61bcf2b3949cf755`，Y554SA，development feedback；没有采用后来候选的数据。复用 [native 边界调查](NATIVE-RULER-VISIBILITY-BOUNDARY.md)、[实际 Play](R17-A1-R7-PLAY-RESULT.md)和[已资格的 allocation 样本](R17-NORMAL-R7-ALLOCATION-RESULT.md)，不重新开展原轮研究。

## 唯一读取的范围

root 对既有普通真机调试 Console 发送一次 wx.createSelectorQuery 公开 NodesRef batch：host issued08:57:53.091Z、observed08:58:35.464Z，route实际为sky/detail/index，5节点全found。该42.373s只是主机发出/看到返回的包络，不能叫 native 查询耗时；本批字段也不认证同一个物理帧。读取不写入、不重定位、不轮询、不增连接。

这是 Play 自动暂停后仍保留的错误窗口。它距离旧入场1597ms事件已很久，不能当作该事件同一时间的fresh读或把最初回零准确时刻补出来。两张独立原图08:56:02.309 / 08:58:39.032均已实际view，显示相同04:30:20预览、Play三角及noon尺。

| 公开节点 / 读数 | 实际值（viewport px） |
| --- | --- |
| ScrollView offset / rect | scrollLeft0；left20.711111、width342.577789、height76 |
| axis中心 | 192 |
| selected tick33 | left745、width17、center753.5 |
| selected center − axis center | +561.5，等于原owner的定位目标561.5 |
| track | left20.711111、width1142.577759、height76 |
| ScrollView / track / surface | visibility=visible、opacity=1；display分别block/flex/flex |
| surface transform | identity matrix(1,0,0,1,0,0) |

5节点仅导出datasetKeys=[sid]，没有sid值；公开id或相同React rows不认证底层native实例。axis本身的−0.5px transform只是当前读数的一部分。当前fresh offset与selected几何一起错误，不能用“只有旧0事件、当前位置一直正确”解释这份后续状态；同样，纯“query一直正确但只有compositor错”不描述这份当前读数。旧1597ms事件是否迟到、何时真的失位仍未知。

没有st/cn更新轨迹、native实例token或remount回执，因此尚不能断言visibility必然重挂载，也不能确定 sibling cn、祖先transition或其它native行为谁是唯一原因。它支持已经收敛的稳定ScrollView本体/同级结构方向，不增延时、第二writer、相邻样式试验或额外profiler。后续修复仍要由其真实首次可见与终态结果验证。

09:00:49.334 的真实Cancel后截图也已查看：当前label回04:30:00，尺回早晨对应范围；大字段仍有裁切。这是有限恢复，不抵消r7入场失败，也不通过跨日、每帧、iOS或settled acceptance。

共用 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/a1-r7-exit-native-passive-20261019` 的56件 / 9,999,046 B冻结归档，manifest SHA `5084ec6acefcacd06b871cdcc2c564fc7bd7218e4ed6b32571f90fe9dbe02343`。原batch文件3073B及所有PNG/sidecar/身份/协议在copy前后逐字核对，报告前再次验copy；raw和敏感身份留在外部owner。未操作设备/IDE/服务/feedback/预览/账号，未改产品源码和其它owner，未commit。
