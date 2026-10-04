from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'


def once(path,old,new):
    text=path.read_text(encoding='utf-8');assert text.count(old)==1,(path,old[:80])
    path.write_text(text.replace(old,new),encoding='utf-8',newline='\n')


runtime=ROOT/'project_context/architecture/runtime-and-domain.md'
once(runtime,'Current candidate receipts are not an adopted publication contract.',
    'The downstream `sdss_noise_display_provenance.py` now snapshots actual frame/native/CALIB-SKY/CAS/fpM/projected/weight inputs, code/library versions and model limitations under an explicit processing-provenance version. External pins and current-input comparison bind saved estimates, original fallback and exact level derivation without filtering/fitting. Master object/center/orientation is required: geometry and pixel hashes alone cannot authorize another object reference. A historical snapshot reconstructed from unchanged inputs retains the pinned original execution/code evidence and is explicitly labelled reconstruction. Full receipts remain offline; this development source-chain is not source-rights/quality admission, a mobile source route or an adopted runtime publication contract. See [actual processing/source-chain and identity regression](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-noise-display-provenance-2026-10-03.md).')
external=ROOT/'project_context/external-capabilities.md'
once(external,'候选收据尚非完整出版来源合同，颜色/弱结构/配准/批量加工成本与独审仍缺',
    '候选已有独立实际加工snapshot/source-chain开发，记录frame/CALIB-SKY/CAS/fpM/贡献权重与条件误差/原科学意义、外部pin及原fallback/真实三级推导；同像素候选对象改标在来源消费者明确拒绝。历史重建绑定旧实际输入/代码，不倒填为原执行当时已写出或rights认证，见[加工来源链](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-noise-display-provenance-2026-10-03.md)。仍非完整正式出版合同，颜色/弱结构/配准/批量加工成本与独审仍缺')
entry=TASK/'CONTINUE-CLOUD-SKY.md'
once(entry,'棕色底、标记边界/弱结构、完整配准/来源出版/成本/独审仍缺，唯一下一依赖见PLAN。',
    '新增[实际加工来源链](evidence/experience-noise-display-provenance-2026-10-03.md)已保存真实frame/CALIB-SKY/CAS/fpM/权重与模型/code边界，外部pin、原fallback、三级实际推导及母图身份核对成立；r1缺对象资格保留、r2修后链不重过滤。离线packet不冒正式出版/rights/图质。棕色底、标记边界/弱结构、完整配准/普通出版/成本/独审仍缺，唯一下一依赖见PLAN。')
text=entry.read_text(encoding='utf-8');assert 'current-execution-state-2026-10-03-r18.json' in text
entry.write_text(text.replace('current-execution-state-2026-10-03-r18.json','current-execution-state-2026-10-03-r19.json'),encoding='utf-8',newline='\n')
plan=TASK/'PLAN.md'
once(plan,'下一步处理现存色底/标记边界/弱结构与配准证据、完整版本加工来源/批量出版及成本',
    '实际加工snapshot/source-chain及保存输出已开发并修对象身份逃逸；下一步处理现存色底/标记边界/弱结构与配准，质量/来源权利信用审查后接正式版本/批量出版及成本')
