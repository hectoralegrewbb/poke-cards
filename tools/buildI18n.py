# Une los diccionarios de i18n/ en src/shared/en.js (módulo que carga el navegador cuando el idioma es inglés).
import json,glob
d={}
for f in ['i18n/en.ui.json','i18n/en.data.json','i18n/en.story.json']:
    part=json.load(open(f,encoding='utf-8'))
    for k,v in part.items():
        if k in d and d[k]!=v: print('CONFLICTO',repr(k),d[k],'|',v)
        d[k]=v
body=json.dumps(dict(sorted(d.items())),ensure_ascii=False,indent=1)
open('src/shared/en.js','w',encoding='utf-8').write('// Generado por tools/buildI18n.py a partir de i18n/*.json. No editar a mano.\nexport default '+body+';\n')
print(len(d),'entradas')
