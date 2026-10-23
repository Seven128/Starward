# R20 F07 原生 App 选点详情身份修复

状态：按 ID 的详情生产链、Map 实际选择入口与共享日期/时刻消费者已整合，受控软件回归及独审完成。没有操作设备、开发者工具或共享服务，没有部署、上传或提交。本记录不关闭完整 F07、原生验收或独立 API 持久化义务。

## 合同与责任

- `docs/source-plan.md` 的 `global-obl-shared-decision-context`、`global-ac-context-atomicity`、`spot-detail-and-trust` 的身份、坐标可见性及各出口策略；`mobile/core-journeys.md` 要求 `/spot/:spotId` 与选中地点相同。
- 原生 App `DESIGN.md` profile、`.codex/skills/uiux_design/SKILL.md` 及 RN interaction reference：沿用现有证据分区，保失败恢复和旧请求隔离，不引入小程序 Context 或视觉资源。
- `R20-NATIVE-CONTEXT-TRACE-20261023.md` 已复现 Map B → 固定 `spot-a` → HTTP `current`；本轮接续该真实消费者缺陷。源代码还确认 POC 仓库固定深圳查询前20条的隐藏限制。

## 实施

1. `app/(map)/spot/[spotId].tsx` 替换固定 `spot-a.tsx` 路由；旧 `/spot/spot-a` URL 仍能匹配动态路由，但只会查它自己的真实 ID，不再转到任意候选。
2. `SpotScreen` 从 Expo route params 得到身份，query key 与 HTTP 使用同一 ID。缺失身份禁发请求并提供返回地图；404 与私有未授权采用同一不可用文案。晚到 A 不能作为 B 展示；同 ID 重新读取被拒绝时撤下旧内容。
3. `spot-client` 校验响应 ID 与请求 ID 相同，拒绝上游错误对象。没有加入 `current` 或默认 ID 替代。
4. `SpotIdentityProvider` 为现有来源增加窄的按 ID 读取接口。`OverpassSpotSearchSource.findById` 仅接受当前搜索本来生成的 `osm-<正整数>` node 身份，使用 `node(id);out;`，不查周边/固定前页、不把同号 way/relation 当 node。仍要求现有 tourism=viewpoint 或 amenity=observatory 标签，深链不扩成任意 OSM 对象查询。节点坐标及身份证明与搜索共用归一化责任；WGS84、范围和整数 ID 在外部边界验证。
5. 身份请求仅合并同时在途的相同 ID，不新增永久按 ID 缓存/历史；复用既有 allowlist、transport、35秒尝试边界与两个既有 endpoint。每次详情由仓库一次 `load` 返回同一个节点的身份、坐标、可见性与事实，消除原来两次 provider 查询；这不是新持久化数据库。
6. `SpotTrustService` 继续统一决定坐标、风险与行动许可，并拒绝仓库返回不同 ID。private 仅 owner/spot-admin 可读；hidden 对未授权读者不输出未经字段分类的详情，均与缺失返回相同404。invite_only/verified_only 的精确坐标仍分别受邀请/已核验身份控制；Source 明定的未受邀近似区域/申请路径保持。新增 HTTP case 验证 private 不泄露名称或坐标；现有未受邀出口回归继续验证所有非分享动作禁用且序列化不包含精确点。

## 同源用途与许可复核

此次继续使用已存在的原生 owner-only、非商业 POC Overpass 候选来源，增加的是同一已选节点按身份读取，并未引入新服务、真实运营配额、收费或生产流量。公开商业发布仍关闭。

- [OSM Copyright](https://www.openstreetmap.org/copyright)：使用 ODbL 数据须保 OpenStreetMap contributors 归因、说明许可；修改/构建数据库后公开使用须履行适用同许可条件。
- [ODbL 摘要与完整条款入口](https://opendatacommons.org/licenses/odbl/summary/)：使用、创建、改作许可与归因、同许可、开放义务分别保留，不把服务免费等同于无条件商用。
- [Overpass 官方按 type/id 查询](https://dev.overpass-api.de/overpass-doc/en/criteria/misc_criteria.html)：`node(id); out;` 是原生支持的精确身份读取；现有生产搜索只查 node，因此不扩 way/relation 身份。
- [Overpass 公共实例使用边界](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)：公共实例有配额/拒绝服务保护，百万级逐对象抓取与广泛 App 依赖公共实例为后端属于问题使用；这里只承接已有低频个人试用。规模或公开用途变化须重新选择合格供应，而不能据本轮代码认定生产保障。

来源标签、OSM node URL、ODbL-1.0 与抓取时间沿现有 facts 返回；POI 只作候选、近似坐标、未现场核验、导航阻断仍保留。受控输入不证明真实 OSM 在目标地区有合格数据。

## 验证

2026-10-23 同 checkout：

```powershell
node tools/run-node.cjs --bin vitest vitest run apps/api/src/__tests__/spot-trust-service.test.ts apps/api/src/__tests__/poc-spot-trust-repository.test.ts apps/api/src/__tests__/spot-identity-http.test.ts apps/api/src/__tests__/map-http-integration.test.ts apps/mobile/src/data/spot-client.test.ts apps/mobile/src/features/spots/SpotScreen.test.tsx --reporter=verbose
npm run typecheck --workspace @starward/api
npm run typecheck --workspace @starward/mobile
```

上述首次运行22/22通过，两端类型检查通过。随后增加同 ID 权限撤回后撤下旧内容的必要回归，单独重跑 `SpotScreen.test.tsx` 3/3通过；原来的其余20条仍有效，共23条相关通过。最终 API 单时钟快照改动重新跑仓库、HTTP与服务检查，12/12通过；相关 `git diff --check` 通过。没有运行或宣称完整产品套件全绿。

- 新 `spot-identity-http.test.ts` 实际监听随机 `127.0.0.1` 端口，真实 fetch → Fastify route → handler → SpotTrustService → PocSpotTrustRepository → Overpass adapter。只有外部 OSM transport 与受控私有输入被替换；跨区域 B 身份、近似坐标和来源成立，即使 upstream 首项是 A。缺失/旧current/private均404；来源不可用仍503；另验同号 way/越界坐标/非法 ID、零坐标及在途合并。
- `SpotScreen.test.tsx` 从真实动态 route module 导入组件，使用真实 React、React Query 和 HTTP client；RN/Expo/HTTP外部边界为fixture。验证 A→B 的 query/request/可见身份、晚到 A、缺失/404恢复，以及同 ID 已可读→404后的内容撤下。
- `spot-trust-service` 检查 private/hidden/owner/admin/verified/invite 权限、来源错 ID、安全冲突与关闭地点；`map-http-integration` 复用原搜索缓存、来源和 failover 兼容回归。

## 后续独立审查与修复

新独立reviewer查到三条实际边界问题，root已在同owner修复并复验：

- Overpass JSON 的node类型必须明确；缺`type`只存在于旧fixture。现search/按ID读共用严格`type === node`及viewpoint/observatory资格，修正旧fixture输入而非放宽来源。[官方输出合同](https://dev.overpass-api.de/output_formats.html)说明type/id恒存在。
- HTTP 200仍可能带运行错误`remark`和部分/空elements；缺elements也不能当不存在。现公共传输解包边界检查shape/remark并走原备用endpoint，均失败503，合法空数组才按未找到处理。[官方输出实现](https://raw.githubusercontent.com/drolbr/Overpass-API/master/src/overpass_api/output_formats/output_json.cc)持有该错误字段含义。
- 真实组件复现200→404→503使旧受保护地点复活。现404作为无可读详情替换Query缓存为null；后续请求/临时失败保持撤下，只有同ID重新成功才恢复。生产回归覆盖cache读回与新成功，不只是看最后一个error字段。

最终root受影响API4文件20/20、mobile Spot/client2文件6/6通过。reviewer独立取得26项同生产范围和4项任务探针通过；tmp副本不重复计作新的完整验收。该reviewer已结束，未编辑生产；上述三发现均修复并独立复核。

另两条验收接线问题由root处理：UI/native route改为同一个`/spot/[spotId]`真实输入解析；Android冷启root/restoration先点准备ID的真实Map marker再开详情；共享case准备解析主route及cross_surfaces后交Android/iOS，remote iOS转递同一配置。route/verifier 53/53通过，只是本地逻辑检查，没有操作设备。准备ID本身不建立数据或权限，仍须实际可见可读的环境。

深链B与已选观察地点A的区别已由F07 Context显示；不自动把受限/近似地点采纳为精确观察点。真实React消费者覆盖深链B保留A，最终实际消费者结果及整合独审归[R20 F07](R20-NATIVE-DECISION-CONSUMERS-20261023.md)。

## 仍未验证

- `start.ts` 当前真实 App API actor resolver 仍为匿名。owner/admin 正向策略由受控输入验证，尚无实际登录/私有资料供应链证明；没有新增可伪造身份头或冒充生产授权。
- 原生路由/按压/返回/画面与实际设备定位、性能未验。jsdom 和 loopback HTTP 不替代目标验收。
- 正式地点、已保存行程、现场包、投稿仍由各自实体/存储 owner 管理；本轮没有把浏览 Context 写入它们，也未完成独立 API 持久化。
- 原F07错误成立probe已由生产消费者回归接替，native/UI acceptance路由已更新并经新独审；这些是非设备证据，实际Android/iOS导航与准备数据资格仍未验。
