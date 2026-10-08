# C07 已有中文供给的简繁检索修复

现行BSC v3有8404行，固定CC0 Wikidata中文出版覆盖3149个精确HR，另5255没有本项目采用的中文供给。SAO v2有246280行，中文/介绍不从HR推定。深空扩展52行中51 Messier/1 NGC，23行有原英文常用名，仅M31/M42有编辑中文别名/介绍；59个其余Messier编号未在当前目录，不把当前数量当要求上限。日月与七行星有中文检索名，介绍仍BASIC_ONLY；整个信息owner只有五条已审介绍，绝非最终覆盖。

真实已采用标签“參宿四”能找到HR2061，而大陆输入“参宿四”返回空。原搜索只做NFKC/大小写/空格归一化；两个必要回归在修前失败（其余10项通过）。沿既有search owner引入固定opencc-js 1.4.2的t2cn入口，只对含汉字的搜索key做通用t2s，不改显示别名、出版物、matchedAlias、星位、测光、分量或介绍。原索引仍一份normalizedAliases，不另建缓存/巡天/百科框架。简繁碰撞保不同身份、原alias与编号精确搜索；当前3149供给中1066个身份的标签转换key有变化，14个共享key仍列独立HR。传统/简体/混写、旧BSC版本、SAO两个HD联合编号及深空兼容在17项相关检查中通过，worker类型通过。

采用成熟纯JS实现，不依赖本地二进制或运行时字典下载，只由BFF使用，WEAPP未增加此库。npm实际lock仅增加worker依赖和opencc-js节点，固定完整性；MIT代码和Apache2字典许可、第三方声明由原npm分发包保留，当前生产容器npm ci必须保留这些文件。单向ESM入口109060字节。本机一次新Node导入3.30ms、构造后RSS相对起点约5.64MiB、heapUsed约2.48MiB，只是未强制GC的整进程观察，不能当保留分配/目标运行时或生产容量。一次当前真实query包含首索引352ms，随后本机约3–34ms，不冒生产延迟。

复用当前525输入原page无props/fixture关闭bundle，无新构建/WEAPP变更。HR2061由公开简体Input、结果按钮、定位、真实中心core tap打开资料；原BSC同授权目录几何重算当前13:00位置，与modal方位/高度及Context/hash相同，不要求冗余远端请求。资料显示原“參宿四”、BASIC_ONLY、null介绍；来源含固定Wikidata CC0/精确HR/社区标签限制。Sources Back保相同身份/资料/位置/时刻和Context，原Modal关闭后Back到Map，最终请求、encoded/decode/GPU及传感器逻辑模型0。成功33Scene/88请求；首两运行因任务误要求远端anchor、误要求Back跳过modal而失败，原记录/失败终态MISSING保留，捕获点分别30/81、33/82，完整失败总量UNKNOWN不借成功补零。两准备错误与原search遗漏pin的哈希恢复也保存，不冒无诊断成功。

一行为源码/一既有测试/两依赖清单改变，已有出版文件和300个WEAPP字节不变；原未提交审查/脚本、六设置提交及全部33账保。微信原生/设备、完整中文介绍与身份覆盖、全部图质/物理资源/200DAU/独审仍未验；普通Prepared空/HiPS关，Mellinger低分辨率、照片FAILED不变。Goal active无预算，无提交推送、服务重启、部署采购外联或子代理。

见[原缺口](chinese-coverage-initial-probe-2026-10-06.json)、[供给及转换覆盖](chinese-coverage-inventory-2026-10-06.json)、[当前链与边界](chinese-coverage-final-readback-2026-10-06.json)、[依赖与许可](chinese-coverage-dependency-2026-10-06.json)、[原消费者结果](../../../../output/playwright/chinese-coverage-1006-r3/chinese-coverage-result.json)。唯一下一依赖见[PLAN](../PLAN.md)。
