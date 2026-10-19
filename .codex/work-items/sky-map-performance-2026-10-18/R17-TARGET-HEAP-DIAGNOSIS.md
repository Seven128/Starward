# R17 真机 V8 堆诊断

状态：**初始快照分析完成；原生播放后导出未获得不同文件，播放后强引用增长未验证。** 本次有界诊断已结束。

实际输入为 root 在正常、已加载且暂停的宽视野 Sky 中通过原生 `Take Heap Snapshot` 得到的文件。外部私有文件为 `E:/Dev/Starward-data/verification/sky-map-20261018/heap-snapshots/sky-initial.phone-snapshot`，87,166,304 字节，SHA-256 `f67a008b33f2f5eab4cdc52db94c072370e3a87085b44b4fce8ff8cc84b9f599`。原始文件不进入 Git，也不输出其中的字符串、属性值、对象 ID、URL 或保留路径。

`scripts/diagnose-target-heap.mjs` 已核验 6 项节点步长、3 项边步长、1,126,865 个节点、4,245,198 条边，声明数量、节点边数求和与所有边目标的对齐及范围均一致。排除 121,016 条 weak 边后的记录图可达所有节点。总 `self_size` 为 **71,087,332 字节（67.79 MiB）**。

| 类型 | 节点数 | self_size 字节 |
| --- | ---: | ---: |
| string | 246,134 | 33,391,877 |
| code | 244,499 | 16,287,936 |
| array | 77,298 | 5,976,164 |
| object | 192,409 | 4,769,152 |
| native | 23 | 2,352,983 |

23 个 `system / JSArrayBufferData` 节点合计 2,352,983 字节；`ArrayBuffer` 对象 37 个，`Float32Array` 对象 3 个。15 个 self_size 至少 262,144 字节的字符串合计 25,485,652 字节。排除 synthetic、code 和 string 后，最大的单个对象/上下文图支配子树为 2,501,643 字节。名称只允许输出固定已知类型或代码名，其余折叠为 `other`。完整数值见相邻 JSON。

这些数值只描述初始快照包含的 V8 isolate。root 随后在同一宽视野正常播放约 29 秒，成功暂停于 `04:30:29`，未 Apply、未退出；暂停像素保存在外部 `heap-snapshots/sky-play-paused.png`。播放前原生面板显示调试关闭，性能面板始终开启。这些 UI 与内存事实由 root 采集，本子任务没有再次读取或独立核验这些文件。

root 的 `heap-before-play-1792335098892.ndjson`、`heap-play-1792335142373.ndjson` 记录：播放前后 Unknown 从 260,248 增至 657,048 KiB，暂停后为 656,896 KiB。它们支持进程内存变化的观察，不给出 V8 强保留量。原生第二次 `Take Heap Snapshot` 后，经过有界只读状态核验，唯一既有文件的 SHA-256、大小及 mtime `1792334941` 均保持原值，没有准入第二份实际快照。

第二次导出尝试后的 `heap-after-snapshot-attempt-1792335702895.ndjson` 由 root 报告：PSS 3,848,619 KiB、RSS 1,874,772 KiB、Swap 2,168,576 KiB、native heap PSS 1,259,803 KiB、native summary 896,436 KiB、Unknown 177,820 KiB；尝试前 native 约 486 MB、Unknown 656,896 KiB。采集期间 native/Swap 的大幅变化使 profiler 自身的分配或未结束工作成为实质观察干扰，具体原因仍不确定。既有原始文件未变化只证明它仍是原文件，不能代替播放后的快照。

因此本任务没有两快照比较，不能把初始对象数量当成播放后的数量，不能断言真机强引用平稳，也不能把 Android PSS/Unknown 当作 JS 堆或将交换计入物理 DRAM。本快照实验已停止，不叠加 Snapshot、GC 或播放。root 随后经实际原生菜单关闭性能面板，复用同代官方 auto-preview；23:15 已实看返回普通 Map、性能浮层与 vConsole 均消失。该恢复不表示内存缺陷已修复，初始快照手机原件仍保留至精确清理阶段。

记录图的非 weak 可达性/支配关系不完整表达宿主与 ephemeron 规则；快照会改变采集/回收时序。它不覆盖其他 VM、GPU、全部 native/external 分配或整个进程内存。只有实际独立播放后快照才能支持同一 isolate 的节点 ID 一致性、类型/字节变化和保留子树比较；本次该依赖不可用。当前不据此提出生产修复，也不把强制 GC 作为修复。现有 `submit` 每次非 quad `bufferData` 前分配 `Float32Array` 仍只是已排队的分配压力假设；初始仅存活 3 个实例不足以确立或排除播放时的该机制。

解析器通过三个固定图反例（多父节点菱形、强引用环、仅 weak 可达孤岛）及一个新增/删除/存活节点字节变化用例。它只修改任务内解析器与本证据，不触碰手机、服务、构建或生产源码。
