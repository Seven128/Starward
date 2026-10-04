# Prepared transport / 公共缓存独立复核（2026-10-03）

本代限定范围内未发现阻断。独立执行实际 source methods / TS5.9.3 VM owners 与受控 MapFS、Taro callback，复核保存的真实 HTTP/static 文件；没有监听服务、网络获取、解码、TAN 重投影、出版重出、GPU、IDE 或原生操作。默认 Prepared registry 仍空，不能由本次显式 fixture 视为普通产品采用。

## 实际反例与恢复

唯一独立运行入口 `scripts/review-prepared-transport-cache-independent-2026-10-03.mts`，SHA `9dd8e1469f5574e05b3248822cb835099e2cd7fcef65a36fca8b6cd504ec1650`。实际 Node v24.16.0 / TS5.9.3 exit0，结果 `output/prepared-transport-cache-independent-1003-r2/result.json` 3,368 B / SHA `c582a8299aa03ec6c4a5d6b9a8fd3179057f9ceeee1d247151ac99e76c77299a`。153 个 source/data/tool 输入在控制前后逐字节相等，inventory SHA `f668a3622139ce9d1cd20cb30de7dd7767a98148371db13947b46a017188f20c`；包括六保留项。执行源码副本保存在同目录。绑定是本控制的源码/输入集合，不是所有 vendor 闭包、目标构建或原生可复现认证。

使用同一真实 R4 OVERVIEW PNG（181,742 B / `2462f47f20e444a2bf1a580a8891a57cd8ac4ea69a30288ed1413a60bcc413a4`）和完全相同的 FS 序列：阻住初次 index stage write，调用 clear，再释放实际 write。

- 原 cache 完整冻结 `escaped-cache-before.ts.txt` / `2db3353d5e16333d6696b0ab33f3e9c0e244c9ea6774a9e3c33dc96476ea8085`：旧 boot 与 clear 都拒绝 `sky_public_image_cancelled`，清理后没有成功的新空 index。后续显式 acquisition 仍能通过原 retry 恢复，不能描述为永久死锁。
- 当前 cache `b66cd31758fe559fddf4b6b81506e43759028d87f6e46217ea2b54667d1d659b`：旧 boot 正确 cancelled；clear complete，实际新 index entries=[]；后续 ready/acquire 成功，最后 release/clear entries、leased、bytes、reserved、running、pending、retired 均0。新 boot 指向有序 cleanup，后来的请求不能绕过正在清理的文件围栏。
- 单独令 index write 真正抛 I/O error，当前 ready 仍失败；下一显式 acquisition 才恢复。clear 不吞任意 I/O 异常。活跃 lease clear 是 partial、立即不 current，文件保留至最后 release；release 后实际 FS 移除。

完整实际事件 `boot-clear.json` 5,228 B / `1d81066414126a6035827b3a103bc883bf4b2d0b63b9000e7be6e207c56784e5`。本独审 R1 因 delivery 刚返回但 job 尚 running 时错误预期 partial，真实得到 pending；保留原执行副本/failed.json。R2 只增加等待真实 running=0，再核活跃 lease 的 partial；未改 owner、回调契约或断言意义。

## 版本、元数据和文件责任

`sky-publication-resource.ts` SHA `dd9980212244df4f24203015f0bef378128a9344305fd30d22e06a920a7a1d9a` 只承担共享取消/epoch/snapshot。Prepared client `6995a759bbdf226f24019a1f2829522a1cd5afa5997e1180dee63c2d8799d42c`、resource `71bc683757f1e12639f47299137ec729df24aab89ce08f7fc5aa5b9f504d937a` 各自准入来源与 hash；旧 SDSS client `360883a7ef6f08b450ebddaf71b69838629877c7c961496f5428be7a4177193a` 入口不被 Prepared 替代。

独立完整模块控制实际观察：pending metadata clear 立即拒绝，晚 success 不复活；显式 retry 得到 deep-frozen 外层/source；两个 Prepared image acquire 共用一次真实 PNG callback、独立 lease；释放一份不伤另一份；clear 同时退休 Prepared 与 SDSS science settled epoch stamps。最后 lease 释放后真实文件/计费归零。science manifest 冒充 Prepared、修改 credit 而保旧 pin均拒绝；跨 pin/非法路径在请求前拒绝。`resource.json` 1,726 B / `968978de8856caca585668043d1733d6d2f299e36aeb238df453d72692be365e`。这里是受控 image bytes transport，未执行 native decode。

当前 runtime SHA `1a17d3abf84af05b51397c88935b2d30400d5ab82cfdd1446793a30839502fa4`；独立调用原 R1 runtime 完整副本 `83491915145eacfce6c84e8b62b879d1ec9c1ff514c5ff58b9bd93d48b2b6522`，同一 prepared URL 在 cache factory 前被拒绝，构成新 family 的真实 before/current 对照。generic compressed cache 可按相同环境/encoded SHA/format 复用完全相同文件；这不合并 publication/source/science 语义。后续 Hook 仍必须消费 metadata stamp 与 image lease 的 current fence，不能凭 descriptor 或 URI 宣称绘出。

## 服务/静态实物与旧入口

实读 Prepared owner `232e04c9699ac8a389d8da412e540bdb6086b8c17b5e6ca34268d04c45890d3a`，共同 file owner `128447f91f059e71508b133bbed7f98b79dd207141d31293360fcea9b45f218b`：只注入本地 exact ref/hash，复制 URL，失败不填 cache；manifest clone 不泄露可变内部 provenance；full read buffer 的长度、digest、PNG/JPEG 支持形式检查一致。未知 hash、别对象、receipt/raw/未列文件拒绝。共同文件检查不是 CRC/inflate 全解码或科学质量证明。实际调用旧 SDSS discovery 与 DETAIL getByFile仍返回原 v1 JPEG；Prepared hash 不能回落旧 SDSS。

两 controller prepared routes 保 bare manifest/binary 与 immutable headers；operation responseEnvelope:false 和生成 SDK 的 Prepared response 类型逐项相符。默认 MiniappService 仍构造空 Prepared owner。静态 family 只准 lower64 hash、M1–110、三个 exact PNG；manifest、NPY、JPEG、上级/编码路径/后缀拒绝；普通 approved exporter未自动采用 Prepared。

保存的真实 loopback HTTP `output/prepared-optical-transport-1003-r1/result.json` / `5781b89fe9c020762898e21deb6a00b6f8a984293b1560dbeff5cfefcba240a7` 中三 PNG与 R4原出版、HTTP保存文件、static disk文件逐字节一致，总1,315,239 B；exact field/source/cache/nosniff/type headers与共享 owner相等。实际 `validateSkyStaticBundle`核完整 index/files/fragment；bundle hash `3477c2a8664be3d959f40d7ca5cf6ea9ddcf50de28f84da79d77b3df8601c18f` 与 Prepared publication `8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802` 各自独立。source summary含完整 credit、许可、原 AVM notes、原色义与 UNKNOWN science，回读等同实际服务。

读回 `transport-readback.json` 3,711 B / `34ac64831c98d5db34b51cfdb65f73208b191d2200268e10bfcabe661f8d1975`。没有再次启动 HTTP/Caddy/TLS，不把磁盘 fragment 当实际部署。

## 历史范围和剩余边界

只读 supplement `saved-identity-readback.json` / `7df8c25b74025118477ff7d7ed89d9e3ae3ff2a7cce88e0121ee2efe5a20be3a`：transport R1的31项、client R2的32项 before/after及当前文件 exact；client R1保其真实历史，当前3个 source差异显式列明，不升级失败代次。作者 R2 trace `d9a186288a7b80d502451a651c72f7dd1cad0da62c73ab5d436dbaa155276a69` 实读18观察，最终计数与 listener释放相符；25/25是 Root 实际 tool receipt，本独审没有重跑其 suite。保存的 R1 trace不是完整失败 stdout，不能倒填为完整测试日志。

有界开发传输/cache责任成立。普通 Prepared Hook/frame/registration/selection、实际可见完整署名、合成边缘/矩形与图质、目标 WEAPP FS/decode/GC/GPU、云端 static/TLS/operator、网络尖峰和200DAU混合容量仍未验。encoded 32MiB是原文件政策，不是 decoded/native/driver/whole-app容量。本次没有改正式源码、主计划、Context、旧图或六保留项。
