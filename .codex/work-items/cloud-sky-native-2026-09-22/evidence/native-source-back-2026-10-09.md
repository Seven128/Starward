# 实际 WEAPP 资料、来源与返回（2026-10-09）

Goal active、无预算、未完成；指定工作区/分支，沿现 canonical 8787/watch 与隔离 8791/DevTools warm，未启动新服务、编译、修改业务代码或发布。这里只核验一条当前原生公开交互路径，不提高 33 项最终验收状态。

## 实际路径与结果

1. 当前 19:00、45°手动星场，通过底部“天体列表”→M31资料→“定位到星空”；实际显示属性读回 M31 圆形选中标记中心 `(195.19999694824224,422.00000000000006)`，对应 390.3999938964844×844 CSS 视口。
2. 从已绘 M31 选中标记打开资料，再点“来源与许可”。页栈实际从 `sky/detail/index` 增加 `sky/sources/index?reference=M%3A31`；正式来源组件显示 M31、OpenNGC/CC-BY-SA-4.0、目录加工及限制，IRSA/AllWISE 历史红外来源也在信息来源列表。已实际查看截图。
3. 来源页自己的“返回”按钮回到原 Sky 实例，M31 资料保持，关闭资料后恢复原星场。已绘语义仍为 `2026-10-09T11:00:00.000Z`（北京时间19:00）、45°、8404目录输入；这不是8404可见星数。M31中心、仙女座名称和 Mirach/Almach/M33 的全部公开样式坐标精确相同。
4. 479×1035 官方截图除顶部102行系统区域外，446907像素 RGBA 严格相同，变动像素0/最大通道差0，RGBA SHA256 `9086e2f414a4cdbd9e083fd8cd2fca0d45e91c6ee414a53d63f505c5a18eccd9`。整幅407像素差位于系统区域（时钟已变化），不称整幅一致。

核心原始回执均在 `output/cloud-sky-native-session-2026-10-09`：定位后 `automation_evaluate-1791513953512.json`；已绘标记→资料 `1791513970367`；来源页 `1791513986795`；Back后 `1791514010676`；关闭资料后 `1791514073437`。三个实际截图为 `m31-located-before-source.png`、`m31-source-page.png`、`m31-returned-after-source.png`；像素对照 `source-back-pixels.json`。当前 `native-observe.mjs` 只读公开 Taro root/aria/样式/控件，不调用 handler、不写 Page data。

## 选择器与未验边界

原 data-od-id 选择器不匹配；SDK `button:nth-child(2)` 误读“重新校准”，没有点击该错误目标。一次官方 querySelectorAll 证明3按钮，随后读取实际 Taro sid 和当前 base.wxml 的 `id="{{i.uid||i.sid}}"`，使用 `#_BE` 先核对文本确为“天体列表”再点。后续每个元素从当前公开节点重新定位并核文本/aria-label，没有猜坐标、等待循环或重连。失败回执仍保存。生成 sid 会变，不能写死为产品或后续测试的稳定身份。

公开 dataSky 字段在部分普通重绘读回缺失，Back后一次实际可读 READY 与完整相机 basis；缺字段不解释为无帧。离开前完整 basis 未读到，保 `EXACT_BASIS_PAIR_UNVERIFIED`；实际呈现帧的时刻/角度/标记坐标及天空像素一致是本次限定证据。路由入口 options 仍是旧 selectedAt/rev2，不拿它冒实际已提交19:00/rev3。

星空截图仍看不到 WXML 按钮、标签、选择环/资料，来源独立页面则正常可见；保持 `FAILED_DEVTOOLS_COMPOSITION`，真实窗口原因 UNKNOWN，Computer Use 明确授权尚无答复、未执行。当前一次 `grep -i error` 返回空只是该 console 导出，不抹去旧 Canvas/clone/recursive-update 失败，不证明没有错误。

本次是目录信息来源路径，没有已绘 Prepared/HiPS 图像的出版 hash，不能冒光学已绘版本绑定、下载体积复用或资源物理峰通过；当前ordinary Prepared空/HiPS关、低分辨Mellinger DISPLAY及全部图质失败保持。数据仍为现内存测试点，不证明真实地点发布资格、持久恢复、权限、容量或 Android/iOS。正常可见交互、完整时序/故障恢复、物理资源及最终独审分别 FAILED/UNVERIFIED/MISSING。

下一沿同一 warm 公开入口批量核中文搜索→定位/跟踪→时间预览取消的责任；用原生输入与实际已绘结果，不重复这条无变化 Sources 往返，也不循环图像参数。
