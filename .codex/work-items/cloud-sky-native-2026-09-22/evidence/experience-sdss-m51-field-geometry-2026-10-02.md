# M51 实际多字段发现与完整目标像素几何

2026-10-02。承接 [只读来源审计](experience-sdss-m51-raw-path-audit-2026-10-02.md) 后 root 已取得中心实际 g/r/i，再作一次25点 CAS 发现及六份 r 几何实证；本记录只解释这些真实本地输入。本子任务没有联网查询或下载，未修改生产/PLAN/Context/旧 assets/公共 reader/gri owner，没有部署、开发器或设备行为。

## 输入与当前缺口

root 的中心查询实际得到 `301/3699/6/100` / fieldID `1237661362908561408`；原三个历史星表字段只能作附近种子，不改写它们为中心结果。实际中心三份压缩文件9,134,078B完整，经公共 `sdss_corrected_frame.py` 实际 admission 后科学质量仍 UNKNOWN。已有 `output/sdss-gri-tan-candidate-1002/candidate.json` 的2048²北向TAN、0.22755555555555557°显示目标，在相同 WCS/四有限邻域规则下，joint=2,031,591/4,194,304，即48.43690395%；medium83.36467743%，detail100%。完整源数组不等于目标母图覆盖。

一次25点请求的原字节 `output/sdss-corrected-m51-1002/target-field-response.csv` 283B / SHA-256 `fc31de1a78b3f950c9702e91274bc1ef757487bf94c22b948bb9cbaa8b99d4b0`，与HTTP200 receipt的bytes/hash一致。七个 fieldID 全部以Python整数/十进制字符串无损解码，rerun/run/camcol/field逐项相符，object低16bit=0；不通过JS Number。该请求 DISTINCT只有字段身份，未保存逐点→polygon关联，不给完整 footprint证书。实际返回7字段：

- `301/3699/6/99,100,101`
- `301/3716/5/117`
- `301/3716/6/116,117,118`

root只取六份新 r，一次各字段/no retry，实际新压缩18,477,945B；已有100 r复用。不是先给六个新字段补全部gri。本次 geometry实际读取中心gri与六新r，共9个科学帧，通过公共reader核raw hash、完整压缩流/数组、实际field/band身份、ICRS WCS；每个target像素都从真实Header映射到source，再核四邻域。所有 stencil内非有限邻域计数0，仅说明此实际有限采样，不认证fpM伪影、噪声/深度、photometric质量或完整 asTrans。

## 全目标几何结果

task-only [geometry脚本](../scripts/experience-sdss-m51-field-geometry-2026-10-02.py) 在64行chunk中计算整个2048² target，不以中心/四角/25点代替；north-first输出对应FITS y反序，所有WCS使用origin=0。合法四邻域需 `0<=x<2047, 0<=y<1488`且四个真实source样本有限。现有100的g/r/i footprint和joint availability与原candidate逐像素完全一致，故本次定位实际解释同一已生成候选。

100 r的target映射source x=471.924..2945.702，y=-466.056..2008.096。越过 x上界造成1,393,984像素，越过y两端分别494,194/606,556；这些计数可重叠，不能直接相加当总缺口。没有x下界或WCS非有限问题。实际source x上界在target为约(257.21,854.03)→(1693.75,528.08)的北部斜线；y两侧则是扫描方向两端。

3699/6相邻99与101各改变source y范围，能补东西侧扫描端，却仍各约139万target越过同一x上界；仅同run99/100/101 union还缺1,393,962像素。真实3716/6/116、117、118分别贡献NE角、北带、NW角，补足跨run位置；不是凭相邻编号猜填洞。

| 实际 r field | target四邻有限像素 | 本次作用 |
| --- | --- | --- |
| 3699/6/99 | 483819 | 扫描一侧，NE/SE |
| 3699/6/100 | 2048948 | 原中心与南部 |
| 3699/6/101 | 617306 | 扫描另一侧，NW/SW |
| 3716/5/117 | 0 | 全target x≥2356.65，真实四邻不相交 |
| 3716/6/116 | 172830 | NE角 |
| 3716/6/117 | 1133269 | 北带 |
| 3716/6/118 | 520970 | NW角 |

CAS返回的 `3716/5/117`实际r对target贡献0是重要反例：当前polygon DISTINCT结果是候选发现，不能直接当frame实际覆盖。没有据此推测/认证其polygon语义；实际source WCS已有决定性pixel事实，可排除它的下一g/i需求，不再为本轮重复CAS、拉全window_flist或请求额外Field metadata。

七 r并集实际全4,194,304 target像素可取（100%）。保持已取得100后，枚举其余6字段的所有子集，以真实mask求union，最少新增5字段；唯一全覆盖集合为100加99/101及3716/6/116/117/118。同一结果也在额外source XY边界余量[5,15]时成立。余量来自已有100在全target测得g/r/i对r最大坐标偏移取ceil+2，只用于r集合筛选的保守试验；它不证明不同field的g/i畸变/位移，也不认证完整asTrans。当前结果限实际linear TAN和这个有限target采样格。

已经生成 `output/sdss-m51-field-geometry-1002/selected-gi-plan.json`：仅补上述5新field各g/i，共10份，复用已有100 gri与全部r原文件。未知新g/i压缩字节为null，不从文档估值填0。root已读计划并负责后续有界取得；本记录不称其已取得或已认证三带target。

## 有实际差异的省字段反例

[omission脚本](../scripts/experience-sdss-m51-field-minimality-2026-10-02.py) 只读已保存全目标mask，各删一个选中field后，actual stencil即留下真实目标采样缺口，无需依赖额外guard：

| 省略字段 | 缺少 target 像素 |
| --- | --- |
| 3699/6/100 | 1559849 |
| 3699/6/99 | 249849 |
| 3699/6/101 | 430022 |
| 3716/6/116 | 82462 |
| 3716/6/117 | 800427 |
| 3716/6/118 | 346224 |

证明不是全场空图/原结果/只有数量断言。省field的mask黑色表示没有该采样供给，不能解释为实测黑色天空；没有将缺源填进科学flux。

已实际查看 `center-actual-stencil-coverage.png`：中心图北部及两侧不可取，边缘RGB细带明确三带footprint差异（R=i/G=r/B=g、白=三带可取）。`same-run-99-100-101-stencil.png`保留北部缺口；`selected-r-first-available-field-map.png`为实际六字段的pixel供给诊断色，不是天体图或科学mosaic优先规则；`actual-r-union.png`是全可取白mask，不能当星空质量截图。

## 下一责任与保留边界

本子任务只给真实g/i获取依赖。完整mother仍需每个g/r/i实际frame admission、各自source WCS、完整target每像素四邻有限/未知状态和重叠表，不能用r几何或任意中心/边角全覆盖代替。多field共同颜色应在科学flux拼接之后一次变换，再从同母图出版有界粗细；缺一band/frame拒绝完整产品而保独立已知结果。重叠、不同run校准/天空残差、权重、颜色、M51真外围/伴星系范围与接缝质量仍需实际像素；有限footprint不能外推无限背景。当前primary Header是线性近似，HDU3 polynomial/DCR保留未施用；读回 roundtrip自洽不认证绝对配准。

完整gri/科学质量/WCS绝对精度/显示alpha与矩形/客户端资源、native连续操作、最终验收和200DAU成本仍开放。实际压缩输入字节只说明本次offline获取量，不能用它估每DAU流量或native总内存；offline科学帧不进入客户端逐次下载。没有本子任务新增云采购/服务部署。

## 可复现绑定

- `experience-sdss-m51-field-geometry-2026-10-02.py` SHA-256 `8eed2f79976719319252afea8dc0810c66c9dc72c7f35ea8892b7dfd8bb149a1`。
- geometry运行前后公共reader hash相同：`66eed21091c6d4c80d35c79d8bbb28467ba65ef90740342c727c13bbd812d17e`；没有修改它或gri owner。
- `output/sdss-m51-field-geometry-1002/geometry.json` SHA-256 `dd287f074e37237dcac387cbea1366a37c04f2e71880e6f06c577c39dc2ffc7c`，含各raw输入/field/header/hash、源角→target、边界计数、每区域、r枚举、next-input计划。
- `bounded-omission-evidence.json`绑定两脚本、actual masks、PNG和 selected计划；包含各省field首个真实缺口坐标/RA/Dec和缺口bounds，保原报告/候选不覆盖。

复用 CPython3.12及任务已有Astropy/NumPy/Pillow，无新安装。命令：

```powershell
& 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-m51-field-geometry-2026-10-02.py' --r-acquisition 'output/sdss-corrected-m51-1002/field-r-acquisition.json' --output 'output/sdss-m51-field-geometry-1002'
& 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-m51-field-minimality-2026-10-02.py'
```

两个输出均拒绝覆盖现有generation；复现选择新路径或保留既有证据，只复核变动影响。本轮没有以全面重测/重复取数据替代下一责任。
