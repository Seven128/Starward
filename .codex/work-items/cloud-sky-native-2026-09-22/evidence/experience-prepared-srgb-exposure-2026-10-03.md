# M51 sRGB 显示曝光：候选不采用

结论：统一显示曝光比旧 W3 gain 保留更多弱显示贡献，但压暗核心且仍显照片底，不能解决共享背景矩形。没有采用 -2/-4 stops、8% 窗口或任何新黑点，也不重跑该无收益方向的 GPU/整场矩阵。普通 Prepared registry 仍空，M51 图质仍 FAILED。

复用已缓存原 JPEG、已出版三 PNG、名义 footprint 和旧 tone 结果，运行 [task-only 脚本](../scripts/experience-prepared-display-exposure-2026-10-03.py)。原 JPEG 仅读取容器/ICC 头，没有重新解码、重投影、生成母图或 LOD。4,060,187B 原 JPEG SHA256 `7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2`；嵌入 ICC 3,144B，SHA256 `2b3aa1645779a9e634744faf9b01e9102b0c9b88fd6deced7934df86b949af7e`，实际描述为 IEC 61966-2.1 Default RGB colour space - sRGB。这只确认这份图的编码，不能外推其他照片或把显示值解释为科学通量。

候选按 [W3C sRGB transfer 参考](https://www.w3.org/TR/2026/CRD-css-color-4-20260930/#color-conversion-code)把编码值转线性、统一乘 0.25/0.0625、转回编码值，随后使用当前 artwork 的贡献/编码帧缓冲混合。不是整个 Scene 的线性光合成。脚本检查 256 值回程误差、有效黑、正暗值与线性 RGB 比例；没有把亮度变为源有效性。照片 alpha 与 availability 不变，最终字节量化仍可丢弱贡献。

比较沿旧 8% common full-source/master 窗口仅保持可比性，该宽度依旧未采用。两个声明的合成背景是 `[3,7,16]` 与 `[32,40,56]`，没有冒称真实天空/原生输出。实际查看了两份三 LOD、五列比较图。OVERVIEW 在前一背景的既有 weak-encoded 集合有 46,094 像素；原图、边缘窗口、W3 gain、-2/-4 stops 分别剩 46,094 / 43,426 / 20,457 / 40,719 / 34,951 个可量化背景差，差值中位为 26 / 17 / 0 / 5 / 1。这个集合是显示诊断，不是科学弱结构识别或质量阈值；计数改善不能替代画质。

[实际结果](../../../../output/prepared-display-exposure-1003-r1/result.json) 16,412B，SHA256 `1d8200ac43b045455951bfc2a56fb4a9e871a7a3944ff5f6905ea32a32364a9c`。比较图 SHA256 为 `83bbadc374e71800f307b079566046131faa6e6f5805c4a7105b174b950a3e3a` 和 `ed5c141b18d315b89047828cf7d124e9b04d58cac8db4ae118a7401f5635d5f1`。源、出版、旧证据、执行脚本/运行模块和六项保护文件运行前后逐字节相同。生产代码没有本轮变化。

下一步转向原科学产品的有界可行性检查，见 [M51 科学头与原数组横条](experience-m51-science-source-bounded-2026-10-03.md)。它不是照片许可外推、数据采用或新选型。本增量独审、原生组合和完整质量仍缺。
