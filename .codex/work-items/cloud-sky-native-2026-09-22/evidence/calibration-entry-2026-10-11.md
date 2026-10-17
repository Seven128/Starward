# B/E：先恢复正常视角，再冻结校准

继续同一active、无预算Goal；指定worktree/分支及全部33项保留。此责任按原I03/C10/V02/V03实现既有校准语义，没有新增图像、采购、云写、平台外发、提交推送或外联。

## 实际缺口与改动

旧页面`beginSkyCalibration`先用已绘的总览／高倍率画面调用方向owner的`begin()`，再将FOV改为正常尺度。其完整旋转目标因此可能仍是总览天顶，虽然新的编辑帧已显示45°。原视图协调器能拒旧帧，却不能证明入口确实先绘出正常局部视角。代码前字节保在[源保存点](../../../../output/cloud-sky-calibration-entry-2026-10-10-r1/spot-sky-page.before.tsx)；第一轮测试夹具漏自动贡献ref失败保留，[修正夹具后的修前回归](../../../../output/cloud-sky-calibration-entry-2026-10-10-r1/regression-before-r2.log)9/9在“尚未接受正常帧就进入editing”断言失败，建立这处真实入口缺陷。

当前沿同一页面、方向、浏览相机和Canvas完成owner处理：有效正常局部帧直接冻结；其余先恢复正常尺度和最新局部方向，待实际页面的生命周期接受完成端口调用后才进入原完整旋转冻结。待完成页面动作只绑定Context对象、时刻、显示模式、方向参照和Canvas代次，不持有第二套姿态／校准。确认仍取最新未绘raw样本，保持已接受目标的完整ENU轴；矩阵乘法的检查仅允许双精度舍入误差，不是视觉或物理精度容差。

当前地点所有权／提交锁、公共时间owner的真实意图、手动或新手势／倍率、断流／过期、Canvas换代和披露变化阻止旧动作完成。hide、AppHide、卸载及绘制失败退休等待；列表／时间／资料／来源／返回及收起使用现入口同步取消，不能在React下一次提交前抢先冻结。打开校准的原点击可以先收到正常完成帧；不借仍未更新的面板标志误取消该意愿。加载／Context错误分支也安装最新完成回调和清理hook，保持React hook顺序。新增等待说明使用原panel和测量owner，实际控件合成仍未认证。

## 有界证据与原失败

[最终影响检查](../../../../output/cloud-sky-calibration-entry-2026-10-10-r1/affected-tests-final.log)172/172通过，覆盖实际页面入口／accepted paint和真实方向／相机／公共时间owner，正常、总览、高倍率、未完成绘制、最新三轴确认、隐藏／换Context／换时刻／手动／过期／Canvas／资料／手势／倍率／未渲染时间意图、排队dock和既有来源／返回／跟踪／手势／渲染围栏。[App类型](../../../../output/cloud-sky-calibration-entry-2026-10-10-r1/miniapp-types-final-r2.log)TS5.9.3通过。该完成端口与renderer／平台输入受控，未执行实际手机姿态或普通覆盖层旅程。

早期数值比较错误地要求完整旋转矩阵运算bitwise相等，Text的role写在错误平台元素、hook夹具缺新增取消回调，以及旧alignment画布夹具漏已有资源声明的失败日志保留。已修类型／夹具与共同测试adapter，不改原生产字段来满足测试，也不取消真实行为断言。自查发现的新清理hook位置在条件返回之后，在编译前已迁到所有分支之前，并加入相应顺序护栏；自查不称独审。

真实CLI构建通过，新[v3 CI类manifest](../../../../artifacts/miniapp/release/cloud-sky-calibration-ci-20261011-r1.manifest.json)绑定`bundles/e3829a85-eefb-4d10-a86c-179b2cce345a/weapp`，274文件／4646082B，fingerprint `049611134a9ea45208bb5a853b41b5f39fc5e7c9dc455782c27d77ffcbfc9c96`；main2096426B、仓库2MiB预算余726B。3项[实际候选检查](../../../../output/cloud-sky-calibration-entry-2026-10-10-r1/actual-built-candidate-r1.log)、11项inspect predicate和编译纯地址owner5角色通过。只是本地dirty工作树生成的nondeployable CI类产物，不是protected CI、正式域名或平台上传包资格。

[当前绑定](../../../../output/cloud-sky-calibration-entry-2026-10-10-r1/current-binding.json)核默认开发＋两份旧普通＋三份旧CI输出共六个目录完整fingerprint保原，v8/r17及源project.config不变，原F控制16 pins不变。212资源／WXML／WXSS全部未变；新行为位于变化的Sky JS中，编译等待正文以Unicode escape保存。核读r1误以为Taro通用WXML必变、r2误只查未转义中文而失败，原日志保留；r3在真实JS和完整旧资源读回上通过，不把模板相同误作产品不变或完成。旧图像结论、Prepared普通采用0及HiPS关闭保持。

本轮文档／源／产物／结果和33项身份的最终pin见[封存绑定](calibration-entry-final-binding-2026-10-11.json)。各历史pin保各自epoch，后续新开发可以改变当前源码和交接，不能用旧通过记录冒新代码资格。

## 剩余义务与下一入口

此处只闭合软件校准入口顺序和适用恢复围栏。正常Canvas返回／列表／时间／署名不可见仍FAILED，原因UNKNOWN_PRODUCT_VS_DEVTOOLS；不因上述逻辑正确宣称覆盖层或真实姿态校准可用。Android／iOS、完整原生交互、图像固定候选资格、真实OCI/OSS/ESA及请求域名、old/current/rollback/off-host、10/20并发与物理峰、修后独审各保原失败／未知／未验。全部33项完整义务不变，不标完整Goal完成。

下一入口继续B/E公共时间和搜索／定位／跟踪的当前实际消费者，重点核排队回调是否绕过隐藏、当前Context所有权及同步提交锁，并以真正在用的结果绑定验证失败／恢复；校准与时间仍沿同一owner，不重跑旧SDK/GPU/z-index/无端口连接。只有新的决定性原生运行信息才重开正常Canvas合成；手机不可用不再索要，图像获取／加工保持冻结。
