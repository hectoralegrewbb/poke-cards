import json,re,sys
keys=json.load(open('tools/.uikeys.json',encoding='utf-8'))
en={}
for f in sys.argv[1:]:
    for ln in open(f,encoding='utf-8'):
        ln=ln.rstrip('\n')
        if ' ||| ' not in ln: continue
        a,b=ln.split(' ||| ',1)
        en[a.strip()]=b
out={};missing=[]
for k in keys:
    v=en.get(k.strip())
    if v is None: missing.append(k); continue
    lead=k[:len(k)-len(k.lstrip())]; trail=k[len(k.rstrip()):]
    out[k]=lead+v.strip()+trail
extra=[k for k in en if k not in {x.strip() for x in keys}]
json.dump(out,open('i18n/en.ui.json','w',encoding='utf-8'),ensure_ascii=False,indent=1); open('i18n/en.ui.json','a').write('\n')
print(len(out),'ok;',len(missing),'missing;',len(extra),'extra')
for m in missing: print('MISSING',repr(m))
for e in extra[:30]: print('EXTRA',repr(e))
