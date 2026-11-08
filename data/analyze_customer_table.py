"""Проверка гипотез H-02 и H-03 на таблице заказчика (запуск: python data/analyze_customer_table.py <путь к xlsx>)."""
import openpyxl, re, statistics as st, collections, glob, json
import sys
f=sys.argv[1] if len(sys.argv)>1 else (glob.glob('data/private/*.xlsx') or [''])[0]
wb=openpyxl.load_workbook(f,data_only=True)
J=re.compile(r'JUDGE_\d+')
def ratings(name):
    ws=wb[name]; d={}
    for row in ws.iter_rows(min_row=2,values_only=True):
        if row[0] and J.search(str(row[0])):
            jid=J.search(str(row[0])).group(); vals=row[1:5]
            if any(v is not None for v in vals): d[jid]=[float(v) if v is not None else None for v in vals]
    return d
OS=ratings('Оценки ОС'); KS=ratings('Оценки КС')
print('ratings OS',len(OS),'KS',len(KS),'both',len(set(OS)&set(KS)))
# agreement
diffs=[];same=0;tot=0;big=0
for j in set(OS)&set(KS):
    for i in range(3):
        a,b=OS[j][i],KS[j][i]
        if a is None or b is None: continue
        tot+=1; same+= a==b; diffs.append(abs(a-b)); big+= abs(a-b)>=2
print('agree exact %.0f%% (%d/%d), diff>=2: %d, mean abs diff %.2f'%(100*same/tot,same,tot,big,st.mean(diffs)))
def avg(j,i):
    v=[x[j][i] for x in (OS,KS) if j in x and x[j][i] is not None]
    return st.mean(v) if v else None
# tournaments
tour=[s for s in wb.sheetnames if not s.startswith(('Ответы','Оценки'))]
allj=set(); stats=[]
cols={'классика':'GHI','коман':'GHI'}
assign=[]  # (judge, col idx)
duels_full=0; duels=0; reserve=0
for s in tour:
    ws=wb[s]; js=set()
    for row in ws.iter_rows():
        for c in row:
            if c.value and isinstance(c.value,str):
                for m in J.findall(c.value): js.add(m)
    allj|=js
    cov=len([j for j in js if j in OS or j in KS])
    stats.append((s,len(js),cov))
    # collegium columns: find header rows with 'Нанимающиеся'
    hdr=None
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value,str) and c.value.startswith('Нанимающ'):
                hdr=c.column; break
        if hdr: break
    if not hdr: continue
    # duel blocks: rows starting with time in col A followed by judge rows
    rows=list(ws.iter_rows(values_only=True))
    i=0
    while i<len(rows):
        a=rows[i][0]
        if isinstance(a,str) and re.match(r'\d\d:\d\d',a) and rows[i][hdr-1] and J.search(str(rows[i][hdr-1])):
            duels+=1; n=0
            for k in range(3):
                r=rows[i+k] if i+k<len(rows) else None
                if not r: break
                for ci in range(3):
                    v=r[hdr-1+ci]
                    if v and J.search(str(v)):
                        n+=1; assign.append((J.search(str(v)).group(),ci))
            r=rows[i+3] if i+3<len(rows) else None
            if r and r[hdr-1] and J.search(str(r[hdr-1])): reserve+=1
            duels_full+= n==9
            i+=4; continue
        i+=1
print('tournaments:'); [print('  ',s,'judges',n,'with ratings',c) for s,n,c in stats]
print('unique judges in tournaments',len(allj),'covered by ratings',len([j for j in allj if j in OS or j in KS]))
print('duels with collegia',duels,'full 9',duels_full,'with reserve row',reserve)
# assignment quality
sc=[];best=0;n=0;low=0;rand=[]
for j,ci in assign:
    a=avg(j,ci)
    if a is None: continue
    others=[avg(j,k) for k in range(3) if avg(j,k) is not None]
    n+=1; sc.append(a); best+= a>=max(others); low+= a<1.5; rand.append(st.mean(others))
print('assignments rated',n,'of',len(assign),'mean score in assigned collegium %.2f vs mean over 3 collegia %.2f; in best-rated collegium %.0f%%; score<1.5: %.0f%%'%(st.mean(sc),st.mean(rand),100*best/n,100*low/n))
# availability parse
tot=0;ok=0;notp=0;blocks=collections.Counter()
for s in wb.sheetnames:
    if not s.startswith('Ответы'): continue
    ws=wb[s]; hdr=[c.value for c in ws[1]]
    av=[i for i,h in enumerate(hdr) if h and 'зарегистрировать меня' in str(h)]
    for row in ws.iter_rows(min_row=2,values_only=True):
        if not row[2]: continue
        for i in av:
            v=row[i]
            if v is None: continue
            tot+=1; t=str(v)
            if 'Не участвую' in t: notp+=1; ok+=1; continue
            parts=[p.strip() for p in t.split(',') if p.strip()]
            good=all(re.match(r'\d\d:\d\d\s*-\s*\d\d:\d\d',p) for p in parts)
            ok+=good
            for p in parts: blocks[p]+=1
print('availability answers',tot,'machine-parseable',ok,'not participating',notp,'distinct blocks',len(blocks))
