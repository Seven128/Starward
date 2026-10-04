import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const task=path.join(process.cwd(),".codex/work-items/cloud-sky-native-2026-09-22");
const moduleSummary="B1/B2/B3未分辨行星现复用已有精确帧太阳/低空星点显示规则，修复当前白天水星/火星/木星保留夜间亮点的问题；亮点、自然点选、自动名称按同一已绘帧显隐，不借通用圆点或旧名称露出。八条件真实软件GPU有修前失败/修后作用；红光查找、已分辨木星、缺几何的原入口完整RGBA保持，同版本夜间返回一致。实际页面提交/名称及component/列表/显式定位消费者已核；这些不是微信合成或完整旅程验收。详[昼暮夜行星点与辨认](evidence/experience-planet-points-2026-09-29.md)。clean-v24 prepared未打开，SHA f0ab05103aea676957d9ccd435606b59a1cbf43e95bb029936f991659cdcbd61、257文件/4484792 rawB、main2089538B；较v23 Sky/raw+585B、主包不变，v23指纹保持。8791来源模块/Context8789未替换，pass/pass/held0/active0/PUT0；无新DevTools窗/native RPC/取消提权重试/手机/云/Git动作。旧v12 Frame/Context/4B未知，完整旅程/WEAPP合成、B3/C质量/覆盖、姿态/校准/后台、Android/iOS、新月面本代手机、目标资源/官方包体/费用/独立审查继续开放。唯一接续见PLAN，Goal active、无预算、未完成。";
for(const name of ["PLAN.md","STATE.md","INDEX.md"]){
  let text=await fs.readFile(path.join(task,name),"utf8");
  const start=text.indexOf("**当前"),end=text.indexOf("\n\n",start);
  assert(start>=0&&end>start&&text.slice(start,end).includes("clean-v23"),`expected v23 checkpoint ${name}`);
  const prefix=name==="PLAN.md"?"**当前：Goal active、无预算；完整体验继续，真机不可用。** ":"**当前检查点：Goal active、无预算；完整体验继续，真机不可用。** ";
  text=text.slice(0,start)+prefix+moduleSummary+text.slice(end);
  if(name==="PLAN.md"){
    const replace=(old,value)=>{assert(text.includes(old),`expected plan anchor: ${old}`);text=text.replace(old,value);};
    replace("最新准备候选为尚未打开的clean-v23","最新准备候选为尚未打开的clean-v24");
    replace("当前v23见下方独立图层恢复","当前v24见下方昼暮夜点呈现");
    replace("一个最新准备候选（当前v23）","一个最新准备候选（当前v24）");
    replace("当前v23仍未打开（v21保留历史准备）","当前v24仍未打开（v21保留历史准备）");
    replace("再只开一个v23","再只开一个v24");
    replace("本代月面覆盖率/缺测/来源、对象差异和环影细节待目标验证；额外纹理不再独占主线",
      "未分辨点的昼暮夜/低空显隐已修且随同帧点选/名称提交，列表及主动定位保留；八条件软件GPU/实际消费者仅证本地边界。本代月面覆盖率/缺测/来源、对象差异和环影细节待目标验证；额外纹理不再独占主线");
    const next="   **接续顺序：**";
    assert(text.includes(next));
    text=text.replace(next,"   **B1/B2/B3昼暮夜的行星点与辨认已闭合本轮本地边界。** [当前显隐/消费者/恢复](evidence/experience-planet-points-2026-09-29.md)修实际未分辨点漏传太阳/自身高度，沿已有恒星显示owner，不重造行星引擎。成功已绘帧的主动抑制防通用圆点/自动名称重新露出，缺几何或失败盘面仍保原辅助；列表/主动定位未删除身份。八条件实际GPU及实际页面函数保正常金星、红光查找、已分辨盘面和夜间往返；不认证原生合成/资料Back或实测可见性。参考早前两个off/on文件实际都OFF，reload后另存真实ON并撤临时视口，不宣称精确时刻/相机逐像素对齐。v24 prepared未打开、Sky/raw+585B/主包不变，v23指纹保持；没有新窗、原生RPC/提权重试、服务替换或手机动作。\n\n"+next);
    replace("不重复已闭合图层恢复/来源故障/源下载/M51亚像素/profile",
      "不重复已闭合行星点显隐/软轮廓、图层恢复/来源故障/源下载/M51亚像素/profile");
  }
  if(name==="STATE.md")text=text.replace("历史准备（该轮v20、现v23，原v19未改）","历史准备（该轮v20、现v24，原v19未改）");
  await fs.writeFile(path.join(task,name),text);
}
const progress=path.join(task,"PROGRESS.md"),prior=await fs.readFile(progress,"utf8");
const heading="## 2026-09-29 B1/B2/B3昼暮夜行星亮点与同帧辨认";
assert(!prior.includes(heading));
await fs.appendFile(progress,"\n\n"+heading+"\n\n"+moduleSummary+"\n\n共享责任和故障/主动显隐区别写回两个Context owner；结构校验只证声明/路径。实际GPU反例、Node消费者、未打开候选及安全服务摘要保对应范围；未取得独立审查，参考恢复尝试的误命名已明确纠正，原证据未覆盖。唯一当前依赖仍在PLAN。\n");
console.log("Updated the unique plan/checkpoints and appended scoped module history; preserved prior obligations and evidence.");
