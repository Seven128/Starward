# 共享影像支持边界诊断：开发增量，图质未采用

共同离线 owner `data-pipelines/deep-sky/image_quality.py` 的 v2 报告现在接受既有 AllWISE、SDSS 与 Prepared 成品，区分栅格裁切边、透明边距内部的显示支持边界和有效支持像素。原整幅统计保留；新增只在 alpha>0 内统计亮度，有效黑色仍计入。Prepared PNG 字节/容器/几何检查复用原路径，额外核实际 opaque/partial/zero 数量、几何 alpha 声明与透明 RGB=0；不把它解释为科学缺测、原母图配准或来源准入。

新增回归在修前分别因不存在内部边界诊断、Prepared schema 不被批量 adapter 接受而失败；修后覆盖透明边距内旋转照片、黑色仍受支持、错误 alpha 声明拒绝以及原实际 SDSS/AllWISE/科学 mask/完整容器/几何/颜色异常消费者。受影响 Python 检查通过。报告只定位待审区域，没有自动画质阈值、羽化宽度、黑点或背景扣除政策。

[实际批量结果](../../../../output/shared-quality-boundaries-1003-r1/result.json) SHA256 `34caa4dae2d4452f2122d41fd75c7c84d9f0aaf1512d1a7b27b9aa9f36317747`，共同完整报告 SHA256 `01e052476dddae9a3d21fca4e90e0cd4031d1ecb02c31100fbb32d7b74db4316`。复用八份既有出版、174 个成品 LOD；只是这批输入，不是需求或库规模上限。catalog、manifest、成品、执行 owner/script、运行模块入口与六项保护文件均逐字节绑定，运行前后相同。没有网络、原始 JPEG/FITS/母图重加工或重新出版。

Prepared M51 overview 栅格裁切边受支持像素为 0，内部支持边界却有 1,212 像素，alpha 加权 encoded luma 的中位 6.5495、P95 25.5772。原只看整张图片四边会漏掉这类照片边界。medium 内部边界 741、裁切边支持 1,270；detail 内部边界 0，但裁切边支持 2,044、中位贡献 86.5754。不同 LOD 的来源支持与裁切不相同，不能据此假设统一黑底或完全覆盖。数值是编码后显示诊断，既不证明接缝缺陷的全部原因，也不证明可安全减去天背景。

R1 执行快照的解释曾使用 “Pinned level”；其实际保证只是 manifest 自身字节绑定、PNG 声明计数核对，不是外部 source/master 认证。当前源码已改为 “Byte-bound level” 并明确 adapter 不是来源准入；只改报告措辞，未重跑无变化图像批量，旧执行快照保持。实际 Prepared manifest 另被任务脚本固定 SHA256，既有完整出版合同/许可审查仍独立控制采用。

M51 矩形/背景仍 FAILED，M82 完整 OV/MED 科学源仍不足，弱结构、颜色、PSF、绝对配准、旋转/天背景/回退的完整质量仍未验。科学有效性/样本可得性 UNKNOWN 保持；Prepared 默认 registry 仍空。需要有依据的处理候选与实际组合输出才能采用，新增诊断与检查成功不替代该义务。本增量独立审查仍缺。
