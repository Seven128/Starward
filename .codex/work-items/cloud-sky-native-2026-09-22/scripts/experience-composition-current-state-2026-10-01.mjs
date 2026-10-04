import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const edit=async(file,changes)=>{let text=await fs.readFile(file,'utf8');for(const [from,to]of changes){assert(text.includes(from),from.slice(0,90));text=text.replace(from,to);}await fs.writeFile(file,text);};
await edit(task+'/PLAN.md',[
 ['普通覆盖层合成和目标质量未验。当前下一依赖是整场识别、辅助/科学纹理尺度与返回组合，不能重新循环旧启动或无收益LRU调参。','当前已在实际工具窗口确认普通覆盖层合成失败，目标手机未验，见[组合失败](evidence/experience-current-native-composition-2026-10-01.md)。整场识别、辅助/科学纹理尺度与返回组合继续保留；因这一实际平台缺口，当前独立推进责任1的新银河源像素局部GPU驻留小路径，先证暖帧/重裁/广角/原质量/失败恢复，再决定接入。不能循环旧启动或无收益LRU参数。'],
 ['官方Canvas截图仍缺WXML合成，保实际缺口，不猜根因或重复旧启动排查。','SDK坐标tap到真实列表状态后，官方原图和实际微信工具窗口均无普通WXML覆盖，当前DevTools合成为失败，手机未验。相关微信团队2D示例只支持平台限制推断；不证明本WebGL根因或手机正确，不重复旧启动。详[组合证据及绑定](evidence/experience-current-native-composition-2026-10-01.md)。'],
 ['当前Canvas+WXML合成、完整目标旅程/整场质量仍未认证；','当前DevTools Canvas+WXML合成实际失败；手机合成、完整目标旅程/整场质量仍未认证；'],
 ['此次有限改善后转下列组合依赖，不循环同一参数试验。','本轮实际窗口组合失败后，独立推进同owner的源像素局部GPU复制试验；这是新采样/驻留机制，先证整场像素、暖帧、冷/重裁峰值、宽/接缝/极点和恢复，不循环同一LRU参数。'],
 ['本轮普通Canvas截图缺WXML覆盖，呼吸/完整层叠/真实手势姿态/校准、GPU/OS恢复与新月面手机均未验。','本轮官方原图及实际工具窗口均缺WXML覆盖，DevTools组合为实际失败；呼吸/完整层叠/真实手势姿态/校准、GPU/OS恢复与新月面手机均未验。'],
 ['本轮有限修复已闭合开发反例/恢复，当前转责任3的整场组合。保留资源义务：','本轮有限修复已闭合开发反例/恢复。责任3的实际DevTools窗口合成失败后，当前独立推进新的银河局部GPU驻留试验；尚未采用。保留资源义务：'],
 ['普通覆盖层合成仍未闭合 |','普通覆盖层已在实际DevTools窗口确认失败、手机未验 |'],
 ['Canvas截图限制保未验，不由节点/SDK动作认证普通覆盖；','DevTools普通覆盖为实际失败，手机仍未验；不由节点/SDK动作认证普通覆盖；'],
 ['当前SDK/Sky已运行，普通Canvas+WXML合成仍未确认，不能写成两者均未知或均通过。','当前SDK/Sky已运行，DevTools普通Canvas+WXML合成已确认实际失败，手机仍未验；不能写成仅截图未知或两者均通过。'],
]);
const existing='Cardinal labels remain native overlays projected from the same presented basis/FOV/center. `sky-scene-projection.ts` excludes below-horizon targets/labels from the visible sky while the information list retains its factual objects.';
const context='Current ordinary WebGL + WXML composition fails visibly in the actual DevTools 2.02.260932 Nightly project window with SDK 3.17.3: Canvas renders while ordinary labels, dock and the opened list are absent, despite measured layout and coordinate SDK actions reaching their state. This is an observed development-tool failure, not merely a screenshot limitation and not proof of phone behavior. The WeChat team’s [2D Canvas component](https://github.com/wechat-miniprogram/miniprogram-barrage) documents a related ordinary-view overlay limitation in DevTools; its phone statement does not certify this WebGL page or establish the root cause. Target composition and physical interaction remain unverified. Preserve native interaction, accessibility, scrolling and input responsibilities when assessing a supported adapter; SDK nodes and actions alone cannot close the composition obligation.';
const file='project_context/architecture/runtime-and-domain.md';
const text=await fs.readFile(file,'utf8'),eol=text.includes('\r\n')?'\r\n':'\n';
await edit(file,[[existing,existing+eol+eol+context]]);
for(const name of ['STATE.md','INDEX.md'])await edit(task+'/'+name,[
 ['普通覆盖层合成、物理手势和完整目标验收未证。','后续[实际窗口组合证据](evidence/experience-current-native-composition-2026-10-01.md)已确认DevTools普通覆盖层失败，手机/物理手势和完整目标验收未证。'],
 ['当前下一依赖见PLAN责任3：整场识别、辅助/科学面状尺度和反向恢复；资源剩余责任保持，不循环旧启动、失败来源或无收益缓存重排。','当前下一依赖见PLAN：责任3整场识别、辅助/科学面状尺度和反向恢复保留；实际DevTools组合失败后独立推进责任1的新银河源像素局部GPU驻留小路径，未采用。先证资源/质量/恢复，保目标义务；不循环旧启动、失败来源或无收益缓存重排。'],
]);
await fs.appendFile(task+'/PROGRESS.md','\n## 2026-10-01 实际DevTools组合失败与独立资源小路径\n\n沿现有普通watch/SDK/Context，测得dock布局后官方SDK坐标tap使列表打开；官方原图及实际微信工具项目窗口都只有Canvas，普通WXML合成从此前未验升级为DevTools实际失败。82事件冻结、原始窗口JPEG及官方PNG、83源码hash和6项保留文件已绑定；未重启/手机/改UI。微信团队2D例子仅为平台限制相关资料，WebGL根因/手机仍未验。详experience-current-native-composition-2026-10-01.md。\n\n复用现有帧/圆帽投影/GPU纹理owner，建立任务内未采用的源像素窗口与WebGL1 FBO复制试验，生产/watch未动。不缩源/不改科学coverage/不加缓存预算。初轮试验替换错了另一个同名调用、出现preparedTexture未定义，随后CRLF接线断言失败；保输出，属于试验脚本接线问题，未执行有效裁图，不归产品/平台失效。修正唯一galactic调用与换行后常用DPR3暖帧8MiB→0，42/11,849,760通道差1/255；广角暖帧反而13,631,488→16,838,656B，当前不采用。继续验证新源/驻留成本差异的保留顺序与冷/重裁峰值、接缝/极点/回退，不能以常用改善关闭资源义务。\n');
console.log(JSON.stringify({plan:'updated current dependency',composition:'FAILED_DEVTOOLS',trial:'UNADOPTED',goal:'active unfinished'}));
