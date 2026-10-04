# D：连续浏览组合绘制与共享投影

完整体验主线和商业取舍不变。本轮在原生会话尚不能安全恢复、手机明确不可用时，完成当前PLAN的独立项：将实际恒星、星座、两类坐标网格、合法W3广角、新M42源缺测切图和照片地景放在同一生产绘制路径，核局部／全天／细看／红光／换时和往返。没有新平台、独立渲染器或逐天体精修。

## 实际输入与观察范围

- 示例观星点：22.4826799°N／114.5557147°E，Asia/Shanghai；390.4×844逻辑视口，390×844实际Canvas。主要时刻2026-09-28T20:00Z，换时21:00Z；朝向分别为真实M42与全天天顶。25°／85°／267.8°／0.54°均为Mini垂直FOV，不把相同数字当参考网页的相同视场。
- 当前8791真实本地报告、BSC-v3、88星座与哈希出版影像；W3实际选择85°的8个／全天的12个order-0格，新M42三档PNG按当前v3身份获取。资源和报告从现有BFF owner读取；没有重复获取外部科学原始数据。
- 现有整场脚本 `scripts/experience-environment-whole-scene-2026-09-28.mts` 调用生产 `drawSkyScene`、TWGL/GPU缓存、投影、网格和地景选择owner。桌面Playwright／Chromium SwiftShader仅作可复现诊断，不能证明Taro控件合成、实际触摸、姿态或目标设备性能。不是微信WebView实现。
- 已实际查看广角、全天、细看和红光图。宽域格带、源条纹与M42非有限缺口仍明显；没有用填洞、隐藏对象、改WCS或声明科学有效率掩盖它们。整体质量未通过。

## 测到的责任与实现

首轮CPU调用栈出现大量逐点 `validBasis` 和 `skyProjectionScale`。相同相机的校验、基向量读取和尺度在恒星、网格采样及HiPS顶点中重复；与该帧内不变的view责任不符。`skyHorizontalDirection`本身仍需逐方向计算，没有替换公式或跳过方向合法性。

`sky-view-projection.ts`新增 `createSkyDirectionProjector`，一次同步绘制／几何任务接受并复制相机基、中心、视口和尺度。`sky-scene-render.ts`的目录点、`sky-hips-tile-mesh.ts`的一个投影mesh、`sky-grid-projection.ts`的一次自适应trace复用该owner。每个新任务接受当前view，不持有跨帧缓存或第二相机。单方向API仍通过同一公式兼容现有消费者。

保留角度有限性／范围、归一化、立体投影分母、反点拒绝、视口容差和全部裁切／曲率／地平规则。没有移除GPU错误检查，也没有改变已绘帧、点选、图片来源或资源预算。星座曲线原已有自己的接受view与真实球面弧责任，本轮没有仅因外观相似强制改写它。

## 实际输出与因果比较

修改前保留bundle SHA256 `75755a9bc579dbb7b17959a806f42fc11a19b99dda8981ae1db0d100d4af8193`，修改后 `14ea55ad3c6eb9b6b69426818ebf432f4620119f8a8497b53e0dd2298b3c88ea`。两bundle和输入SHA实际核验；生产输入只变上述四个owner。

分开运行的八场景PNG字节、点选对象、来源和数据hash完全相同，见[输出比较](experience-view-projection-output-2026-09-29.json)。但广角／全天分开运行的耗时变差；保留原记录，不以较好的局部数字宣称普遍提速。因此补同一个页面／GL上下文／解码影像的交替比较：两个独立生产renderer各自贯穿八场景，12组交替暖绘、30组AB／BA测量，关闭CPU profiler，每次显式排空。所有实际RGBA读回、点选对象、来源、成功地景与帧时刻完全相同；16组网格的完整几何也相同。

以下是**桌面JS／GL提交墙钟**中位数，不是纯CPU、目标FPS或完整帧时。同步GL调用可能已等待软件GPU；显式`finish`的剩余排空时间不能反推GPU成本为零。

| 场景 | 修改前ms | 修改后ms | 限制 |
| --- | ---: | ---: | --- |
| 25°识别 | 9.50 | 7.65 | 当前软件组合样本 |
| 85°广角 | 24.30 | 16.25 | 分开运行曾变差，不能由单批外推 |
| 267.8°全天 | 13.60 | 17.15 | 本批仍变慢；性能未闭合 |
| 0.54°细看 | 9.20 | 7.15 | 当前软件组合样本 |
| 0.54°红光 | 8.35 | 6.40 | 无影像署名 |
| 0.54°普通返回 | 9.15 | 7.10 | 当前软件组合样本 |
| 21:00Z换时25° | 9.80 | 7.95 | 尾延迟仍波动，p95由30.50到37.70ms |
| 20:00Z识别返回 | 9.80 | 7.75 | 当前软件组合样本 |

不含GL的交替网格几何计算下降且输出相同：识别水平2.50→1.80ms／赤道3.50→2.80ms；广角2.60→1.80ms／3.40→2.85ms；全天1.30→1.00ms／1.80→1.50ms。其它细看／换时组合也下降。网格全离屏时得到零段是该条件下真实结果，不能单独拿它证明绘制；相同批次另有局部交叉、广角和全天实际非空几何与软件像素。

结论只到“共享不变view的重复工作已移除、当前几何及实际输出保持”。全天整场提交变慢及尾延迟留为未解决性能证据，不宣称全部场景提速。下一性能结论须依目标原生组合测量；不通过删除GL错误检查或另造FPS阈值取得通过。

进一步分离场景owner的计算：`--projection-cpu-owner`在同一页面交替调用两个保留的生产`drawSkyScene`，用相同的“成功提交”边界fixture代替surface。它**不渲染、不做GL提交，也不证明GPU成功**。12组交替暖算／30组测量，记录命令在计时外；每场真实非空的全部命令序列、数量、点选对象与来源相同。全天生成2053个星点命令、10组实际投影mesh及同一月盘／地景，不用空输出获得耗时下降。结果在 `output/playwright/cloud-sky-view-projection-cpu-owner-0929/result.json`：

| 场景计算边界 | 修改前中位ms | 修改后中位ms |
| --- | ---: | ---: |
| 25°识别 | 8.50 | 6.70 |
| 85°广角 | 9.65 | 7.30 |
| 267.8°全天 | 7.45 | 5.80 |
| 0.54°细看 | 8.90 | 6.40 |
| 0.54°红光 | 8.10 | 6.20 |
| 0.54°普通返回 | 8.75 | 6.80 |
| 21:00Z换时25° | 8.85 | 6.80 |
| 20:00Z识别返回 | 8.70 | 6.75 |

这证明本次场景计算owner没有靠少算／空图取得下降；不覆盖renderer内部CPU工作、GL等待、真实GPU或控件。CPU fixture与真实GL是不同批次／边界，不能相减推算GPU耗时，也不能因此撤回实际全天提交变慢记录。无需再生成候选或重复同条件profile；当前v19生产输入未变，目标组合性能仍须实际取证。

诊断元数据也已校正：旧环境脚本的Vega／16:00Z／参考14秒差不能套在新M42／20:00Z场景；CPU fixture记录不能称有两个GPU renderer。四份原result保留于各目录 `result.before-scope-correction.json`，当前result明确M42局部参考／各行相机覆盖、历史参考非匹配及CPU-only边界。[元数据修正记录](experience-view-projection-metadata-correction-2026-09-29.json)核所有测量样本、图像／点选hash、输入和几何完全未改；这是修正证据含义，不是重新捕获参考或获得质量通过。

两个单代整场profile各自一个GPU owner，稳定30次重绘没有重复纹理上传，退出32创建／32释放。同页交替比较为两个owner，稳定期也无新上传，退出64创建／64释放。这是桌面GPU纹理归属／释放观察，不是原生解码位图或GPU总峰值。

实际文件：

- `output/playwright/cloud-sky-combined-browse-profile-0929-before/`：原始result、CPU profile、8PNG、retirement、保留production.js。
- `output/playwright/cloud-sky-combined-browse-profile-0929-after/`：修改后同项，保留production.js。
- `output/playwright/cloud-sky-view-projection-causal-0929/`：交替result、8PNG、retirement。完整原始样本／p95和RGBA／点选hash在result。

## 反例、消费者检查与候选

真实HiPS三角投影的getter计量回归在修改前失败：细分2读相机54次，细分16读1734次；增加源细分不应重复固定view的工作。修改后该工作与细分无关，且仍绘出非空真实三角。修前日志保留于 `experience-view-projection-before-2026-09-29.log`，不是只检源码标记。

受影响投影／HiPS／网格／场景／点选／星座名称与曲线消费者批量25检查通过；原几何、反点、裁切、星座真实弧和遮挡拾取检查保留。新增固定view检查覆盖接受后原对象变化不改旧结果、下一任务接受新view及非法输入。首轮typecheck发现测试将readonly向量转换为可变数组的类型错误，已改为测试自有可变tuple；保留失败日志，Mini typecheck重试和9个投影检查通过。没有以`unknown`转换绕过生产类型。证据为 `experience-view-projection-consumers-2026-09-29.log`、`experience-view-projection-typecheck[-retry]-2026-09-29.log` 和 `experience-view-projection-owner-retry-2026-09-29.log`。

clean-v19已通过原plain production隔离slot构建，无诊断／mock／代次／vConsole／map；尚未打开，也未推手机。SHA256 `ea976e39811d93d13eb7b9fc48a38aea81c73eb55199bec5aa777681fbae990a`，257文件／4,479,916 rawB；主包2,085,621、content1,012,055、sky958,623、spot423,617B。相对v18，仅projectname配置和sky/detail/index.js变更；sky增加577B，主包不变。这些是本地原始字节，不能替代官方包体。

[候选记录](experience-combined-clean-v19-candidate-2026-09-29.json)绑定四个当前生产输入hash；v18历史指纹原样保留，不冒充含本次投影复用。Taro构建成功仍有原有CSS顺序和Webpack尺寸建议，共3警告；没有把软件构建当原生启动或实际操作。

共享投影的耐久责任已归原architecture owner，Context结构校验通过；只校路径／声明，不认证事实或体验。最后[开发检查点](experience-view-projection-close-2026-09-29.json)重新核当前生产输入hash、v19完整指纹和未变v18；8791当前Context／resource均pass、held／active0及实际v3出版hash与本轮输入一致。原生恢复、目标性能、手机和独立审查仍未验。

## 剩余义务与恢复

必要本地服务保留，没有新常驻服务、原生RPC／已取消提权重试或新DevTools窗口。旧v12真实Frame／Context／4B夹具仍未知。可安全恢复时，先核旧归属并退休旧会话，再只打开当前v19，实际核版本／接受Context／已绘帧及完整组合；loopback候选不推手机。

完整旅程、B3/C环境与来源质量／其它配准／合法覆盖、真实姿态／完整校准／OS后台、Android/iOS、首屏／资源与性能／官方包体／实际流量费用及独立审查均保留。独立审查未发生，自审不替代；本轮不能关闭高影响共享复用或完整交付的审查义务。新月面没有本代手机验收，Goal继续active、无预算。
