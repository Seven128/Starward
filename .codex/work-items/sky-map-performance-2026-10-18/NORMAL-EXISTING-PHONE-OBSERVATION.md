# 既有正常 Sky 手机样本与离线归档

本记录只保留已有正常 Sky 实例的开发反馈，不关闭 R17 A/B 或完整 Goal。对应结构化清单见 [NORMAL-EXISTING-PHONE-OBSERVATION.json](NORMAL-EXISTING-PHONE-OBSERVATION.json)。

## Candidate identity

模式为 `development_feedback`。root 将已审 gen25 review-r2 完整项目复制到外部 `normal-existing-resume-20261019/project`，建立全新 guarded 观察会话；没有向退役的 gen25 nested session 输入，也没有绑定 gen26。手机截图实际可读到“R17 正常Sky基线 v3”及“完整正常Sky；按正常Play开始计量，15秒导出，20秒同次正常暂停”。这能确认可见诊断标签，不能证明手机整包字节、runtime AppID 或所有正常执行责任。

已记录的 review-r2 构建身份仍由 R17-NORMAL-BASELINE-V3-PREPARATION/RESULT 拥有：buildSource `10236f0e034ae96d9e31ed5e081a837a53f4cdd128e3f9ac34da6d588f151a4c`，预期 bundle `d4ed31dfe62d4d0268eb3d415d932d0f958615ba6a9ac98e474edc7a13432819`。这些是项目候选身份，不是本次从手机读回的整包证明。gen26 官方终态继续 UNKNOWN；本记录未重发预览、修改 feedback 或提升绑定。

## Invocation result

root 的捕获、菜单操作及有界滑动来自新观察会话；本记录的整理者仅做离线复制、哈希核对、ffprobe 和联系表阅读，没有调用手机、ADB、DevTools、HTTP 或服务。

外部证据 owner 为 `E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019`。其中 `device-session-archive` 保存复制时完整的 44 文件、17,602,727 B：7 段视频、18 张截图及其 18 份 capture metadata、1 份原会话文件。复制前后源文件清单稳定，接收端逐文件 SHA256/长度全部一致。没有覆盖已有不同内容；会话原文件保留。`device-session-archive-manifest.private.json` 的 SHA256 为 `bacd299f44371df6f718bae3d55a8c848d4daaae97e77a817e40136a04929780`，任务 JSON 含有序非敏感文件名/长度/SHA 清单，不复制会话私有内容。

## Observed product behavior

复用已有五张地景联系表（6 次/秒、6×6）；另对两段时间视频生成并实际阅读低频联系表（2 次/秒、4×3）。顺序均为从左到右、从上到下；尾部未填充的黑格是联系表空位，不是产品空屏。完整原片留在外部 owner，本结论只覆盖这些采样帧。

| 样本 | 原片长度 / 编码帧数 | 可见结果 |
| --- | --- | --- |
| L1，天空朝地平移动 | 5.890567 s / 88 | 星点、星座线和图案随视角变化，接近地平区域。 |
| L2，继续跨地平 | 6.251933 s / 115 | 地平/黑色地景轮廓进入画面，天空内容仍可见。 |
| L3，继续朝背面 | 6.083 s / 110 | 较亮的低饱和灰层出现，灰层中的星点、星座线和图案仍可见。 |
| L4，反向移动 | 5.117789 s / 88 | 灰层减弱，回到较暗天空与地景轮廓的画面。 |
| L5，继续反向 | 5.345522 s / 102 | 再回到地平上方的天空，星点/星座内容保留。 |
| T1，小时预览 | 3.341878 s / 13 | 日期仍为 2026-10-19；04:30:00 变为 05:30:00 预览，星图位置随之变化。 |
| T2，取消预览 | 4.966011 s / 68 | 05:30:00 预览变回 04:30:00，原来星图位置恢复，预览提示消失。 |

上述地景采样中没有看到整页空白。原片编码帧数和时长只描述录像文件，不能据此计算产品物理 FPS。时间样本展示预览与取消；没有把它们视为 Apply、跨日供给或真实天气验证。

## Verified

已直接核对完整离线归档、七段视频的有限编码元数据、可见正常基线标签、五张已有地景联系表及两张新时间联系表。可见证据支持背面灰 cue 与星图内容并存，以及这一次 04:30→05:30→取消恢复的有界结果。

## Unverified

手机整包/runtime AppID、精确俯仰/完整极点覆盖、物理连续手势和双指、完整逐帧连续性/FPS、响应性 A、正常持续播放/分配/paused drain/退出 B、跨日数据供给、真实天气、iOS、完整正常路径与最终 R17/Goal 验收均未由本批补足。没有重录已充分的正常 CPU 或同一 Play 样本。后续只补能解决这些剩余不确定性的实际观察。

## Invalidated

归档截图/视频没有输入授权；重新操作仍须由 root 取得 fresh capture 并检查。gen26 refresh 后退役的旧 gen25 nested session 不可复用。当前文件清单只描述复制时的会话快照；之后增加的媒体需另行归档，不能由这份清单推定已保存。

## Cleanup

只新增外部副本、外部时间联系表/有限元数据和本任务两份安全记录；没有删除、停止或清理任何手机、会话、服务、feedback、账号、配对或 VPN 资源。原始媒体、私有 capture/session 内容留在外部，不进入 Git。root 继续拥有现场和最终清理；在任何 session 清理或 feedback refresh 前须保存本次快照之后新增的必要证据。
