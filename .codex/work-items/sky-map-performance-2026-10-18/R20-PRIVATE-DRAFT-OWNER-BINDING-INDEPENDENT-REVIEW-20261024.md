# R20 私人草稿原 owner 资格独审

结论：**发现 1 个 P2（两个 family 共用），当前冻结实现不能判通过。** 原 attempt 归属与未知提交修复可复用，但新的 private observation owner 在实际拒权后仍会被较早的成功列表重新确认。未修改生产源码、PLAN、HANDOFF、Context 或 Git；没有启动设备、IDE、build、网络、防火墙或共享服务操作。

## 范围与资格

读取适用 AGENTS、global/default manifest、architecture、验证与 Native Screen Contract、PLAN 的 Private command attempt authority，以及作者 checkpoint。对 Native React Native 的拒权／旧结果／表单投影使用现行 uiux_design Skill；本次不重开视觉设计或设备验收。

冻结清单 SHA256 为 `811c45593973adf3c6c80938f92739632647231c0f572c2981ebb00e38c7a155`。开始及结束均按 object.files 核对 **26/26 文件长度和 SHA256，一致**。审查的是这份源码，不把 main 61953 或作者局部通过外推为当前整体验收。

## P2：旧成功列表可以撤销后续真实拒权

位置：`apps/mobile/src/data/private-owner-observation.ts:17`、`:22`。`deny` 发布 denied 但未撤销已开始的 authority-read 资格；`accept` 对没有 requestedOwnerId 的首列表请求不检查 authority 对象已变化。当前代次仍相同时，较早成功响应可将 denied 重新置为 ready。

实际复现使用现有 `tests/fixtures/private-draft-http.ts`，执行当前真实 Itinerary／Field client → Fastify inject → 独立 SQLite。仅存储与 expo-crypto 两个原生适配器被内联替换，网络、API route、service、SQL、client authority 和生产解析均未替换。两个 family 分别执行：

1. 保存一个合成 A 草稿，正常 list 取得 ready A。
2. 再发首列表读取，服务端已实际以 A 完成查询并返回 200；在 fixture 的 after-response 处暂扣响应交给 client 的时机。
3. 将可信 resolver 撤权为 null，真实 client.get(saved.id) 得到 403，确认 authority 已变为 denied A。
4. 释放第 2 步的旧成功响应。

实测两条结果一致：状态顺序 `[200,200,403]`；第 3 步 `status=denied, ownerId=owner-A`，第 4 步恢复 `status=ready, ownerId=owner-A`；旧列表 `canPublishLibrary=true, items=1`。Itinerary 错误为 itinerary_owner_required，Field 为 field_report_owner_required。

这直接突破实际消费者使用的可显示资格。`ItineraryScreen.tsx:79`、`:98`、`:136` 和 `FieldReportsPanel.tsx:75`、`:102` 分别依赖 canPublishLibrary/canPublish 与 ready owner 来显示私有列表、旧详情和保留表单。拒权后本应隐藏的 A 数据会再次获得显示资格。**本次探针直接观测 client authority／私有数据资格，页面后果由当前真实消费者代码追踪；没有声称另做了渲染或真机复现。** 既有“同时所有查询都拒权”及“迟到 A 写入对 B”检查未覆盖该交错。

修复应留在现有 observation owner：使拒权后失效的读取不能重新取得当前资格，并允许拒权之后明确开始的新成功读取恢复；原 A retry 不撤当前 B、未知 pending 原字节保留及旧 API 不资格化等既有约束仍须保留。建议增加这一个机制的参数化两 family 回归，随后用新的独审核对，不扩成组合矩阵。

可复用探针（仓库根，Node 24 + 已安装 tsx；不需要新文件或 listener）：

```js
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
for (const [id, exports] of [
  ["@react-native-async-storage/async-storage", {}],
  ["expo-crypto", { randomUUID: () => "independent-test-key" }],
]) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
const { privateDraftHttp } = await import("./tests/fixtures/private-draft-http.ts");
for (const family of ["itinerary", "field"]) {
  const host = await privateDraftHttp();
  try {
    const saved = family === "itinerary" ? host.seedItinerary() : host.seedField();
    const client = family === "itinerary" ? host.itineraryClient() : host.fieldClient();
    await client.list();
    let release, readyResolve;
    const ready = new Promise(resolve => { readyResolve = resolve; });
    const held = new Promise(resolve => { release = resolve; });
    let hold = true;
    host.intercept(async (request, response) => {
      const listPath = family === "itinerary" ? "/v2/itineraries" : "/v2/field-reports";
      if (hold && request.method === "GET" && request.path === listPath && response.ok) {
        hold = false; readyResolve(); await held;
      }
      return response;
    });
    const oldList = client.list(); await ready;
    host.actor(family, null);
    try { await client.get(saved.id); } catch { /* actual 403 recorded by host */ }
    const afterDeny = client.authority();
    release(); const page = await oldList;
    console.log({ family, afterDeny, afterOldList: client.authority(),
      oldPageRepublished: client.canPublishLibrary(page), items: page.items.length });
  } finally { await host.close(); }
}
```

## 已核对且未新增 P1/P2 的责任

- shared qualified command 复用原 pending owner：新 intent 先冻结输入／key，取得所属 family 的 server actor 资格，随后持久化，再发原 wire；retry 不从当前 owner 补造历史归属。qualification/requestedOwnerId 不进入 POST body。Rule 保留原 slot、schema 与 x-notification-owner，未强行把不同的 NightReport／Controls 协议并进来。
- Itinerary／Field 的 header 都在可信 resolver 之后限制 actor，不能由调用者授予身份；原单 owner loopback POC 与受控 A/B 测试未被包装成生产鉴权。服务 list 的空页也返回实际 owner 资格。
- 原 command wire、current/version/receipt 事务形状未改变；旧无资格／非法资格的 pending 不被重新解释或重发，原 A 确认不成为当前 B 的新观测，消费者带 owner 的缓存键与迟到写入保护保留。
- 作者单元 transport fixture 确实把资格取得替换成合成空列表，证据范围有限；新增 private-draft-http 与真实 React 消费者检查走实际 API／SQL 和生产 client，未用前一种 fixture 冒充这些结果。原 50/50／28/28 已有证据未为了安慰重复跑。

## 公开合同与实际终态检查

完整 JSON 内 **185 个内部 refs 均可解析**。八条所属 v2 operation 均引用 optional PrivateCommandOwnerHeader；ItineraryDraftLibrary／FieldReportLibrary 的新增资格与纯 contracts 导出一致。资格仍为 optional，是为明确容纳旧 API 形状；当前 client 对新派发要求实际资格，不因为 schema 允许旧响应就获得原 attempt 归属。

另用现有 Ajv2020 对实际 Fastify 响应做 **34 项检查（32 次请求与 2 次 replay 标志）全部通过**：两个 family 的空／非空 list、create、current read、历史 revision、同 body/key replay，以及 changed body/key 409、非法命令 400、缺记录 404、非法 revision 400、真实 body-limit 413、八条路径的 owner mismatch 403。还在测试实例的 service 边界注入一次存储异常核对 route 503 unknown；该项只证明错误映射，不冒充真实磁盘故障。成功 body 分别按已发布 Library／Readback／Result schema 校验，失败按 NativeCommandFailure 校验；private/no-store 和 restriction 的 Vary 同时核对。format 注解未重新资格化，不能据此新增时区／日期正确性结论。

公开合同仍有继承的描述范围差异：Field 失败响应多数只有 description，没有结构 schema；Field list 的 invalid cursor/storage 400/503 及 revision 路径 400 在本公开 operation responses 中未列。实际失败 envelope 符合 NativeCommandFailure；这些遗漏不是本次资格修复新产生的运行时缺陷，未计为新增 P2，也未把描述不完整报告成完整终态合同覆盖。

## 资源与剩余义务

所有内联验证进程已退出，fixture 的 API／SQLite 均由 finally 关闭，**没有打开 TCP listener**。两份反例合成 DB 目录后缀为 ClOLU4、5Iau6x，合同检查目录后缀为 pWV1A6，均在系统 TEMP、原件保留；没有删除或上传私有资料。最初两个内联 mock loader 写法在模块加载阶段失败，没有进入 fixture 或执行产品操作；换成 Node 的 require.cache 原生适配器替身后才得到上述真实结果，未把 harness 错误记作产品失败。

本次结束时 26 pins 仍一致。下一步由 root 在当前 observation owner 修复该 P2并取得新独审。Git／精确 CI、API-client 同版部署、production／混合版本／旧无资格可证恢复、真实 Native storage／键盘／系统 Back／生命周期与整族用户结果，继续保持未完成；不以本报告关闭完整行程、Field、通知 family 或 Goal。
