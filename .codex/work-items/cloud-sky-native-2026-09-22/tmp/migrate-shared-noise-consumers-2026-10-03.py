import ast
from pathlib import Path

root=Path(__file__).resolve().parents[4];task=root/'.codex/work-items/cloud-sky-native-2026-09-22'
for filename,names,imports in (
    ('experience-science-noise-bilateral-2026-10-03.py',{'covariance_difference','filter_shared'},
     'from sdss_noise_display import pair_difference_variance as covariance_difference, filter_shared\n'),
    ('experience-science-mixed-noise-display-2026-10-03.py',{'conditional_upper'},
     'from sdss_noise_display import conditional_variance_upper as conditional_upper\n')):
    path=task/'scripts'/filename;text=path.read_text(encoding='utf-8');lines=text.splitlines(keepends=True)
    functions=[n for n in ast.parse(text).body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert {n.name for n in functions}==names
    for n in sorted(functions,key=lambda n:n.lineno,reverse=True):del lines[n.lineno-1:n.end_lineno]
    text=''.join(lines);marker='from sdss_gri_tan import target_tan\n';assert text.count(marker)==1
    text=text.replace(marker,marker+imports)
    path.write_text(text,encoding='utf-8',newline='')
print('task consumers now use shared owner; old executed artifacts unchanged')
