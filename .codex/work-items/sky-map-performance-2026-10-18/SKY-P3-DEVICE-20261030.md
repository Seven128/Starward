# P3 地景与时间提交的真实手机反馈

## Candidate identity

本轮复用 F04 已连接候选 fd17ed2b（341 文件/5,218,621B），源 960d5f1d；其注入仅在 Map，Sky 源码与普通 1de 候选一致。证据属于 development feedback，不是普通正式候选验收。NIO N2401 / Android 14 / 微信 8.0.78 / SDK 3.17.5，逻辑视口 384×796.8000488，DPR 2.8125。实际业务 API health 200/ready；LAN 调试传输模式未独立认证。

私有根 `E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-preparation`，手机 session `starward-device-test-YkTalT`。官方工具复用原真机运行时，物理手势、截图和录像走既有 guarded device-test；没有新 Profiler、Heap、PSS 或 collector。

## Invocation result

从 Map 的搜索实际输入“月湾”，选既有隔离正式地点，再点可见“云观星”。没有新建地点、恢复库或改生产输入。先拖到地平线，随后一次向下越过地平线，再一次反向回到天空。一次 6 秒录制因录制在输入前结束，被 `device_test_recording_ended_before_input` 拒绝且没有发送手势；沿实际入口改用 15 秒录制后成功，不属于产品失败。

时间操作沿真实按钮：打开时间面板，分钟加一，取消；秒加一，明确应用；重新打开确认已提交值，再点击无变化取消。取消按钮恢复预览，不等于关闭面板；实际外部关闭另在下文新普通候选核对。公共 Context 在 Redis 通过原 key owner 只读核对，只保存选定时刻、revision 和 localDate，未输出账号或凭据。

## Observed

- 地平线上方是原暗地景；越过后星体仍可见，地景变淡灰方向提示；反向后恢复暗地景及原北极星附近构图。原始录像 `recording-1793322676690.mp4` 实际 10.697100 秒/95 帧，反向 `recording-1793322825957.mp4` 实际 17.078478 秒/103 帧；请求秒数不冒实际时长或帧率性能。
- Root 实看原始截图 `screen-683b88b2-fe4b-44c1-943d-1d126fe0137d.png`、`screen-8d32d828-5758-41e9-a8ac-b30143364d49.png`、`screen-d02b5891-b61e-48d9-99ae-f98995db2b7a.png`，以及私有根的 `sky-cross-horizon-1hz.jpg`、关键转换 4Hz 的 `sky-cross-horizon-4hz.jpg` 和 `sky-return-horizon-1hz.jpg`；这是有界抽帧观察，不冒逐帧全检。
- 分钟预览的真实 accepted 时刻由 13:00:00Z 到 13:01:00Z；此时公共 Context 仍 13:00:00Z/revision 2。取消后 accepted 返回 13:00:00Z，字段返回本地 21:00:00。
- 秒预览 accepted 为 13:00:01Z；明确应用后 Context 为 13:00:01Z/revision 3，面板关闭。重新打开实际六字段是 2025-10-28 21:00:01，accepted READY/13:00:01Z。读回归 `sky-time-runtime-01a18a43.json`、`sky-time-context-preview.json`、`sky-time-context-applied.json`。
- 384px 屏宽触发现有小于 390px 的三行时间布局，面板过高。采用稿是六字段同排、中间双按钮纵列，没有采用三行的独立决定。问题图 `screen-b58e2ab6-f14b-466b-8994-da279d359295.png` 已实看；该实际差异触发下面窄修。

## Verified

本轮代表路径支持地平线/背面方向提示可见并可逆，且时间预览不提交、取消回滚、明确应用提交和重新打开一致。六字段跨年、Play/Pause、实际 SAO 与普通退出复用 D2 既有证据，不再另跑时长或字段排列。

## Unverified

原地景/时间观察不证明真实逐树逐楼遮挡、全部科学对象/来源及完整 P3 完成。传感器实体转动已由下方本日后续用户操作核验；真实山体遮挡验收已按用户要求取消。独立天气错误仍显示为天气不可用，没有被天空成功掩盖。Map 注入候选不升级为正式产品验收；物理 GPU/native 释放与容量仍未知，但已退出本轮D2完成门槛。

## Invalidated

后续时间布局 CSS 变化只使旧截图不能证明新布局；以上地景、时间事务与已有共享逻辑证据仍按未变化责任复用。没有把未运行的变体记实测通过。

## Cleanup

原录像、截图、回执、候选和 session 保留用于证据绑定；无新账户、提醒、上传或正式发布。旧 F04 一次性观察已终态，禁止重新 arm。

## 384px 时间布局修复与新候选

只调整 `spot-sky-page.scss` 的窄屏横向留白：374–390px 每侧 4–12px，384px 时 9px；小于 374px 才保留三行 fallback。324px 控件空间、44px 触点、44px 固定反馈行、曲尺和取消语义保持。没有新 CSS 镜像测试或时间逻辑改动。

Root 从 canonical `E:/dev/Starward` 完整编译普通开发候选，1679 输入只该 SCSS 相对 960d5f1d 改变；当前 binding SHA `48026264dd78f59f4bb42a99c39f9e2ac6def529650482e4753db1e3c3e45825`。输出 `apps/wechat-miniapp/dist/weapp-check-sky-time-compact-20261030`，准备入口 `E:/Dev/Starward-data/development/d1-d2-targeted-20261030/sky-time-compact/source-project`，SHA `effa83c72d72d83270bb4454756193b8c6aed641912d7b3740c73db7b5e7bf0e`，341 文件/5,212,592B。完整编译、12 项 inspector、物理设备 fixture guard、origin 及包体预算通过。

新候选已实际到同一手机。旧项目关闭后出现“请先结束其他真机调试”，且手机要求结束确认；确认后旧窗口均消失，但IDE仍占用。Root按当前唯一自有项目做一次官方正常quit/重开，保源码、storage和共享API；CLI重新读回登录有效/0.3.14相同/无需CLI token。MCP重启后Bad Request，仅此通路不可用，转已授权官方CLI，没有换账号或取MCP凭据。新自动Android面板默认198.18.0.1，启动前切192.168.31.26并实读；一次自动调试后，独立窗口Wi-Fi/服务正常，手机当前页可读，主机8001/DevTools PID38728到同手机192.168.31.203持续连接，业务8787连接独立存在。运行时SDK报告3.17.5，调试面板报告3.17.6 [1663]，两者分别保存，不抹平差异。没有启动任何Profiler。

目标结果：六字段共同top=520.0889px，各44×132px；12步进按钮均44×44px；反馈行44px，controls高200px。Root实看 `screen-f03fd659-886f-4e36-abf3-55a90505c65b.png`，六字段同排、apply/play中列、时间尺及底部边界与采用稿对应；预览图 `screen-40e591a1-d593-4cbc-a21a-73db399aedf1.png` 中取消入口完整可见。未缩操作目标或更改科学内容。

另核原P3独立“外部关闭”事务：一分钟预览accepted为13:01:01Z，实际点击面板外天空后面板关闭、菜单恢复展开，重新打开字段21:00:01。Taro native root的自定义data字段在后续整节点更新时不再暴露，未把缺属性冒产品未绘；沿同一生产owner的可访问标签读到“已呈现…场景时刻2025-10-28T13:00:01.000Z”，busy=false。公共Context当前仍选该时刻，revision=4；重开普通候选后、这次外部关闭前没有读取revision，故不能宣称它全程保持3或此次没有任何版本变化。选定时刻/已绘/重新打开相符的结论成立。

新session `C:/Users/777/AppData/Local/Temp/starward-device-test-qd63uF`；已完成截图/回执及session快照复制到新候选私有根 `phone-observation`，hash清单与尺寸归 `layout-observation.json`，终态归 `operation.json`。`preview-before-outside.json`、`after-outside-accessibility.json`、`context-after-outside.json`保实际读回。旧fd17/1de及证据原样保留；新effa只替换当前开发窗口/手机工作入口，不冒完整P3或整Goal验收。

<a id="physical-direction-user-verification"></a>
## 本日后续：手机实体转动由用户操作确认

**Candidate identity / Invocation result：** 复用上述effa普通开发候选、当前Android真机调试及qd63uF会话，没有重建、重新连接、mock方向或采集Profiler。每次项目capture/input的assertFresh前后核341文件指纹仍为effa83c7；官方CLI读到当前Map，实际手机像素在前台。Root由生产“云观星”入口进入并开启“随手机”，初次截图显示方向精度偏低。

**Observed / Verified：** 用户按明确步骤远离磁性物体、不用手指拖星空，左右转身、抬头、低头并回到起始朝向，回复原文“连续随动，方向正常，回位大致一致”。这是用户实体操作确认通过，不是Root独立录到完整连续过程。Root实看操作前/后的不同天空画面；后图仍在随手机模式、低精度提示已不再显示。随后经生产返回按钮回到Map，原隔离地点面板和地形实际可见。

**Unverified / Invalidated：** 没有独立测绝对真北误差、每帧延迟或全设备兼容；静态截图不能单独证明运动方向与连续性。初始低精度提示不改写为从未发生；独立官方预警仍提示不可用，不以方向通过宣称天气合格。旧“实体转动后置/未验证”已由此用户确认结果取代；完整P3及完整Goal尚未完成。

**Cleanup / Evidence：** 已结束本次手机操作并回到Map，保留当前有效项目/调试会话。4张原始截图及对应元数据已复制并逐一校验到私有 `sky-time-compact/phone-observation/rotation-20261030`；`observation.json` SHA为 `55f4b4e3563594afd0d146c8335ac935e47d412853ebbe61ac204360071de505`。无录像、Heap、collector或重新发布。
