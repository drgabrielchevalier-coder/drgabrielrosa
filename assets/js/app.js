const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const todayISO = () => new Date().toISOString().slice(0,10);
const addDays = n => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const pastDays = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
const uid = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);

const seed = {
  clinics:[
    {id:'allon',name:'Allon Roter',type:'Prestação de serviço',rule:'Honorário por procedimento',color:'AR'},
    {id:'daniele',name:'Daniele Belmiro',type:'Prestação de serviço',rule:'Honorário informado por caso',color:'DB'},
    {id:'gerlucia',name:'Gerlúcia',type:'Prestação de serviço',rule:'Valor menos laboratório/componentes',color:'GE'},
    {id:'particular',name:'Particular',type:'Próprio',rule:'Receita integral do paciente',color:'PT'}
  ],
  materials:[
    {id:'m1',name:'Implante CM 3.5',brand:'Dérig',type:'CM',supplier:'Dental fornecedor',pack:'1 un',price:158,unitCost:158,stock:8,min:3,updated:todayISO()},
    {id:'m2',name:'Mini pilar CM',brand:'Neodent',type:'Componente',supplier:'Dental fornecedor',pack:'1 un',price:92,unitCost:92,stock:4,min:3,updated:todayISO()},
    {id:'m3',name:'Biomaterial 0,5 g',brand:'Lumina Bone',type:'Osso',supplier:'Dental fornecedor',pack:'1 un',price:198,unitCost:198,stock:2,min:2,updated:pastDays(5)},
    {id:'m4',name:'Anestésico',brand:'DFL',type:'Insumo',supplier:'Dental fornecedor',pack:'50 tubetes',price:200,unitCost:4,stock:31,min:10,updated:pastDays(2)},
    {id:'m5',name:'Campo cirúrgico',brand:'Genérico',type:'Insumo',supplier:'Distribuidora',pack:'1 kit',price:35,unitCost:35,stock:5,min:3,updated:pastDays(8)},
    {id:'m6',name:'Soro fisiológico 500 ml',brand:'Equiplex',type:'Insumo',supplier:'Distribuidora',pack:'20 bolsas',price:279.90,unitCost:13.995,stock:12,min:5,updated:pastDays(12)},
    {id:'m7',name:'Transfer HE 4.1',brand:'Implacil',type:'Transfer',supplier:'Dental fornecedor',pack:'1 un',price:30,unitCost:30,stock:2,min:2,updated:pastDays(7)},
    {id:'m8',name:'Análogo',brand:'Implacil',type:'Análogo',supplier:'Dental fornecedor',pack:'1 un',price:45,unitCost:45,stock:3,min:2,updated:pastDays(7)}
  ],
  procedures:[
    {id:'p1',name:'Implante unitário',price:1500,items:[{materialId:'m1',qty:1},{materialId:'m4',qty:4},{materialId:'m5',qty:1},{materialId:'m6',qty:1}],extra:44},
    {id:'p2',name:'Implante + enxerto',price:1700,items:[{materialId:'m1',qty:1},{materialId:'m3',qty:1},{materialId:'m4',qty:4},{materialId:'m5',qty:1},{materialId:'m6',qty:1}],extra:44},
    {id:'p3',name:'Coroa sobre implante',price:1500,items:[{materialId:'m7',qty:1},{materialId:'m8',qty:1}],extra:450},
    {id:'p4',name:'Implante + coroa',price:2400,items:[{materialId:'m1',qty:1},{materialId:'m4',qty:4},{materialId:'m5',qty:1},{materialId:'m6',qty:1},{materialId:'m7',qty:1},{materialId:'m8',qty:1}],extra:450},
    {id:'p5',name:'Protocolo por arcada',price:13000,items:[{materialId:'m1',qty:4},{materialId:'m4',qty:8},{materialId:'m5',qty:1},{materialId:'m6',qty:2},{materialId:'m2',qty:4}],extra:1900},
    {id:'p6',name:'Restauração simples',price:230,items:[],extra:32}
  ],
  patients:[
    {id:'pt1',name:'Paciente Exemplo 01',origin:'Prestação',clinicId:'allon',procedureId:'p1',date:pastDays(20),value:490,received:490,due:pastDays(10),status:'Faturado / Recebido',cost:224.86,lab:0,components:0,clinical:0,progress:'Alta'},
    {id:'pt2',name:'Paciente Exemplo 02',origin:'Prestação',clinicId:'allon',procedureId:'p2',date:pastDays(12),value:490,received:0,due:pastDays(2),status:'À receber',cost:323.86,lab:0,components:0,clinical:0,progress:'Aguardo pós Cirúrgico'},
    {id:'pt3',name:'Paciente Exemplo 03',origin:'Particular',clinicId:'particular',procedureId:'p4',date:pastDays(18),value:2400,received:1200,due:addDays(12),status:'Recebido parcial',cost:224.86,lab:450,components:75,clinical:300,progress:'Enviado para Laboratório'},
    {id:'pt4',name:'Paciente Exemplo 04',origin:'Prestação',clinicId:'gerlucia',procedureId:'p3',date:pastDays(9),value:850,received:400,due:pastDays(1),status:'Recebido parcial',cost:0,lab:450,components:75,clinical:0,progress:'Aguardando Cimentação'},
    {id:'pt5',name:'Paciente Exemplo 05',origin:'Prestação',clinicId:'daniele',procedureId:'p1',date:pastDays(6),value:700,received:0,due:addDays(7),status:'Aguardando acerto',cost:224.86,lab:0,components:0,clinical:0,progress:'Em tratamento'}
  ],
  costs:[
    {id:'c1',desc:'Aluguel sala clínica',type:'ALUGUEL',center:'Particular',date:pastDays(5),due:pastDays(5),method:'PIX',value:300,status:'PAGO'},
    {id:'c2',desc:'Compra de implantes',type:'IMPLANTE',center:'Estoque',date:pastDays(14),due:pastDays(1),method:'BOLETO PARCELADO',value:632,status:'PARCELADO'},
    {id:'c3',desc:'Laboratório protético',type:'LAB',center:'Particular',date:pastDays(12),due:addDays(3),method:'PIX',value:450,status:'À PAGAR'},
    {id:'c4',desc:'Transporte clínica',type:'Transporte',center:'Allon Roter',date:pastDays(3),due:pastDays(3),method:'CRÉDITO',value:150,status:'PAGO'},
    {id:'c5',desc:'Componentes protéticos',type:'COMPONENTES',center:'Gerlúcia',date:pastDays(8),due:pastDays(8),method:'PIX',value:150,status:'PAGO'}
  ],
  payroll:[
    {id:'f1',name:'Auxiliar clínica',type:'Diária',period:'09/2026',center:'Particular',value:300,status:'Pago'},
    {id:'f2',name:'Apoio administrativo',type:'Fixo',period:'09/2026',center:'Geral',value:450,status:'A pagar'}
  ]
};

let state = JSON.parse(localStorage.getItem('chevalier_gestao_v1')||'null') || structuredClone(seed);
let persistReady = false;
let receivableFilter = '';

function save(){
  localStorage.setItem('chevalier_gestao_v1',JSON.stringify(state));
  if(!persistReady) return;
  fetch('api/state.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)}).catch(()=>{});
}
function clinic(id){return state.clinics.find(x=>x.id===id)||{name:'—',color:'??'};}
function procedure(id){return state.procedures.find(x=>x.id===id)||{name:'—',price:0,items:[],extra:0};}
function material(id){return state.materials.find(x=>x.id===id)||{name:'—',unitCost:0};}
function patientCost(p){return Number(p.cost||0)+Number(p.lab||0)+Number(p.components||0)+Number(p.clinical||0);}
function patientProfit(p){return Number(p.value||0)-patientCost(p);}
function balance(p){return Math.max(0,Number(p.value||0)-Number(p.received||0));}
function isOverdue(p){return balance(p)>0 && p.due && p.due<todayISO();}
function pct(a,b){return b?Math.round((a/b)*100):0}
function badge(status){
  const s=(status||'').toLowerCase();
  let cls='b-gray';
  if(s.includes('faturado')||s==='pago'||s.includes('alta')||s.includes('cimentado')) cls='b-green';
  else if(s.includes('recebido parcial')||s.includes('prova')) cls='b-amber';
  else if(s.includes('cobrar')||s.includes('à receber')||s.includes('atras')||s.includes('não vai')) cls='b-red';
  else if(s.includes('aguardando')||s.includes('moldagem')||s.includes('tratamento')) cls='b-blue';
  else if(s.includes('retrabalho')||s.includes('re-moldagem')) cls='b-purple';
  return `<span class="badge ${cls}">${status||'—'}</span>`;
}
function fmtDate(v){if(!v)return'—'; const [y,m,d]=v.split('-'); return `${d}/${m}/${y}`;}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function renderDashboard(){
  const fat=state.patients.reduce((s,p)=>s+Number(p.value||0),0);
  const rec=state.patients.reduce((s,p)=>s+Number(p.received||0),0);
  const receber=state.patients.reduce((s,p)=>s+balance(p),0);
  const custos=state.patients.reduce((s,p)=>s+patientCost(p),0);
  const lucro=rec-custos;
  const margem=pct(lucro,rec);
  const overdue=state.patients.filter(isOverdue);

  document.getElementById('kpiFaturamento').textContent=brl.format(fat);
  document.getElementById('kpiRecebido').textContent=brl.format(rec);
  document.getElementById('kpiReceber').textContent=brl.format(receber);
  document.getElementById('kpiCustos').textContent=brl.format(custos);
  document.getElementById('kpiLucro').textContent=brl.format(lucro);
  document.getElementById('kpiMargem').textContent=margem+'%';
  document.getElementById('heroResult').textContent=brl.format(lucro);
  document.getElementById('heroMargin').textContent='Margem '+margem+'%';
  document.getElementById('kpiVencidos').textContent=`${overdue.length} vencido${overdue.length===1?'':'s'}`;
  document.getElementById('badgeReceber').textContent=overdue.length;

  const attention=[];
  overdue.slice(0,3).forEach(p=>attention.push({kind:'red',title:`Cobrança vencida · ${p.name}`,sub:`${clinic(p.clinicId).name} · venceu ${fmtDate(p.due)}`,value:brl.format(balance(p))}));
  state.materials.filter(m=>Number(m.stock)<=Number(m.min)).slice(0,3).forEach(m=>attention.push({kind:'amber',title:`Estoque mínimo · ${m.name}`,sub:`Saldo ${m.stock} · mínimo ${m.min}`,value:m.brand}));
  document.getElementById('attentionCount').textContent=`${attention.length} itens`;
  document.getElementById('attentionList').innerHTML=attention.length?attention.map(a=>`
    <div class="list-item"><span class="dot ${a.kind}"></span><div class="list-main"><strong>${esc(a.title)}</strong><span>${esc(a.sub)}</span></div><div class="list-value">${esc(a.value)}</div></div>`).join(''):'<div class="empty">Nenhuma pendência crítica.</div>';

  const clinicSummary=state.clinics.map(c=>{
    const arr=state.patients.filter(p=>p.clinicId===c.id);
    const revenue=arr.reduce((s,p)=>s+Number(p.value||0),0);
    const costs=arr.reduce((s,p)=>s+patientCost(p),0);
    const profit=revenue-costs;
    const margin=pct(profit,revenue);
    return `<div class="card clinic-card">
      <div class="clinic-top"><div class="clinic-logo">${esc(c.color)}</div><div><div class="clinic-name">${esc(c.name)}</div><div class="clinic-sub">${esc(c.type)}</div></div></div>
      <div class="clinic-stats"><div class="clinic-stat"><small>Receita</small><strong>${brl.format(revenue)}</strong></div><div class="clinic-stat"><small>Custos</small><strong>${brl.format(costs)}</strong></div><div class="clinic-stat"><small>Margem</small><strong>${margin}%</strong></div></div>
      <div style="margin-top:13px"><div class="progress"><span style="width:${Math.max(0,Math.min(100,margin))}%"></span></div></div>
    </div>`;
  }).join('');
  document.getElementById('clinicSummary').innerHTML=clinicSummary;

  document.getElementById('dashboardPatients').innerHTML=[...state.patients].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(p=>`
    <tr><td class="name-cell"><strong>${esc(p.name)}</strong><span>${fmtDate(p.date)}</span></td><td>${esc(clinic(p.clinicId).name)}</td><td>${esc(procedure(p.procedureId).name)}</td><td>${badge(p.status)}</td><td><strong>${brl.format(patientProfit(p))}</strong></td></tr>
  `).join('');

  const costCats={};
  state.costs.forEach(c=>costCats[c.type]=(costCats[c.type]||0)+Number(c.value||0));
  const max=Math.max(1,...Object.values(costCats));
  document.getElementById('costDistribution').innerHTML=Object.entries(costCats).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`
    <div style="margin-bottom:13px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px"><span>${esc(k)}</span><strong>${brl.format(v)}</strong></div><div class="progress"><span style="width:${(v/max)*100}%"></span></div></div>`).join('');
}

function fillFilters(){
  const sel=document.getElementById('patientClinicFilter');
  const current=sel.value;
  sel.innerHTML='<option value="">Todas as clínicas</option>'+state.clinics.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  sel.value=current;
}
function renderPatients(){
  fillFilters();
  const q=(document.getElementById('patientSearch')?.value||'').toLowerCase();
  const cf=document.getElementById('patientClinicFilter')?.value||'';
  const sf=document.getElementById('patientStatusFilter')?.value||'';
  const rows=state.patients.filter(p=>(!q||p.name.toLowerCase().includes(q)||procedure(p.procedureId).name.toLowerCase().includes(q))&&(!cf||p.clinicId===cf)&&(!sf||p.status===sf));
  document.getElementById('patientsTable').innerHTML=rows.map(p=>`
    <tr>
      <td class="name-cell"><strong>${esc(p.name)}</strong><span>${esc(p.origin)}</span></td>
      <td>${esc(clinic(p.clinicId).name)}</td><td>${esc(procedure(p.procedureId).name)}</td><td>${fmtDate(p.date)}</td>
      <td>${brl.format(p.value)}</td><td>${brl.format(patientCost(p))}</td><td><strong>${brl.format(patientProfit(p))}</strong></td>
      <td>${badge(p.status)}</td><td><button class="btn small" onclick="editPatient('${p.id}')">Editar</button></td>
    </tr>`).join('')||'<tr><td colspan="9"><div class="empty">Nenhum paciente encontrado.</div></td></tr>';
}
function renderClinics(){
  document.getElementById('clinicsGrid').innerHTML=state.clinics.map(c=>{
    const arr=state.patients.filter(p=>p.clinicId===c.id), revenue=arr.reduce((s,p)=>s+Number(p.value||0),0), costs=arr.reduce((s,p)=>s+patientCost(p),0);
    return `<div class="card clinic-card">
      <div class="clinic-top"><div class="clinic-logo">${esc(c.color)}</div><div><div class="clinic-name">${esc(c.name)}</div><div class="clinic-sub">${esc(c.type)}</div></div><div style="margin-left:auto">${badge(pct(revenue-costs,revenue)+'% margem')}</div></div>
      <div class="clinic-stats"><div class="clinic-stat"><small>Casos</small><strong>${arr.length}</strong></div><div class="clinic-stat"><small>Receita</small><strong>${brl.format(revenue)}</strong></div><div class="clinic-stat"><small>Resultado</small><strong>${brl.format(revenue-costs)}</strong></div></div>
      <div style="margin-top:14px;padding-top:13px;border-top:1px solid var(--line);font-size:10px;color:var(--muted)">Regra financeira<br><strong style="display:block;color:var(--text);font-size:11px;margin-top:4px">${esc(c.rule)}</strong></div>
    </div>`;
  }).join('');
}
function procedureCost(p){return p.items.reduce((s,i)=>s+material(i.materialId).unitCost*Number(i.qty||0),0)+Number(p.extra||0)}
function renderProcedures(){
  document.getElementById('proceduresTable').innerHTML=state.procedures.map(p=>{
    const cost=procedureCost(p), m=pct(p.price-cost,p.price);
    return `<tr><td><strong>${esc(p.name)}</strong></td><td>${brl.format(p.price)}</td><td>${brl.format(cost)}</td><td>${badge(m+'%')}</td><td><button class="btn small" onclick="showCostSheet('${p.id}')">Ver ficha</button></td></tr>`;
  }).join('');
}
function showCostSheet(id){
  const p=procedure(id);
  document.getElementById('costSheetTitle').textContent=p.name;
  const cost=procedureCost(p);
  document.getElementById('costSheet').innerHTML=`
    <div class="cost-sheet">
      <div class="cost-row header"><div>Item</div><div>Qtd.</div><div>Unitário</div><div>Total</div></div>
      ${p.items.map(i=>{const m=material(i.materialId); return `<div class="cost-row"><div>${esc(m.name)}</div><div>${i.qty}</div><div>${brl.format(m.unitCost)}</div><div><strong>${brl.format(m.unitCost*i.qty)}</strong></div></div>`}).join('')}
      <div class="cost-row"><div>Laboratório / custos adicionais</div><div>1</div><div>${brl.format(p.extra)}</div><div><strong>${brl.format(p.extra)}</strong></div></div>
    </div>
    <div class="summary-bar"><div><small>Preço base</small><strong>${brl.format(p.price)}</strong></div><div><small>Custo previsto</small><strong>${brl.format(cost)}</strong></div><div><small>Lucro projetado</small><strong>${brl.format(p.price-cost)}</strong></div><div><small>Margem</small><strong>${pct(p.price-cost,p.price)}%</strong></div></div>`;
}
function renderService(){
  const arr=state.patients.filter(p=>p.origin==='Prestação');
  const total=arr.reduce((s,p)=>s+Number(p.value||0),0), rec=arr.reduce((s,p)=>s+Number(p.received||0),0), open=arr.reduce((s,p)=>s+balance(p),0), od=arr.filter(isOverdue).reduce((s,p)=>s+balance(p),0);
  document.getElementById('svcTotal').textContent=brl.format(total);document.getElementById('svcReceived').textContent=brl.format(rec);document.getElementById('svcOpen').textContent=brl.format(open);document.getElementById('svcOverdue').textContent=brl.format(od);
  document.getElementById('serviceTable').innerHTML=arr.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(clinic(p.clinicId).name)}</td><td>${esc(procedure(p.procedureId).name)}</td><td>${brl.format(p.value)}</td><td>${brl.format(p.received)}</td><td>${fmtDate(p.due)}</td><td>${badge(isOverdue(p)?'À receber':p.status)}</td><td><button class="btn small" onclick="markReceived('${p.id}')">Receber</button></td></tr>`).join('');
}
function renderPrivate(){
  const arr=state.patients.filter(p=>p.clinicId==='particular'||p.origin==='Particular');
  document.getElementById('privateTable').innerHTML=arr.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(procedure(p.procedureId).name)}</td><td>${brl.format(p.value)}</td><td>${brl.format(p.received)}</td><td>${brl.format(p.lab||0)}</td><td>${brl.format(p.components||0)}</td><td>${brl.format(p.clinical||0)}</td><td><strong>${brl.format(patientProfit(p))}</strong></td><td>${badge(p.progress)}</td></tr>`).join('')||'<tr><td colspan="9"><div class="empty">Sem casos particulares.</div></td></tr>';
}
function renderLab(){
  const stages=['Moldagem','Enviado para Laboratório','Aguardando Prova','Aguardando Cimentação','Alta'];
  document.getElementById('labColumns').innerHTML=stages.map(stage=>{
    const arr=state.patients.filter(p=>(p.progress||'').includes(stage.replace('Enviado para ','').replace('Aguardando ',''))||p.progress===stage);
    return `<div class="card"><div class="card-head"><h3>${stage}</h3><div class="right"><span class="badge b-gray">${arr.length}</span></div></div><div class="card-body list">${arr.length?arr.map(p=>`<div class="list-item"><div class="avatar">${esc(p.name.split(' ').map(x=>x[0]).join('').slice(0,2))}</div><div class="list-main"><strong>${esc(p.name)}</strong><span>${esc(procedure(p.procedureId).name)} · ${esc(clinic(p.clinicId).name)}</span></div><div class="list-value">${brl.format(p.lab||0)}</div></div>`).join(''):'<div class="empty">Nenhum trabalho.</div>'}</div></div>`;
  }).join('');
}
function setReceivableFilter(v,btn){
  receivableFilter=v;
  document.querySelectorAll('#page-recebiveis .filter-chip').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderReceivables();
}
function renderReceivables(){
  const arr=state.patients.filter(p=>!receivableFilter||p.status===receivableFilter);
  document.getElementById('receivablesTable').innerHTML=arr.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(clinic(p.clinicId).name)}</td><td>${brl.format(p.value)}</td><td>${brl.format(p.received)}</td><td><strong>${brl.format(balance(p))}</strong></td><td>${fmtDate(p.due)}</td><td>${badge(isOverdue(p)&&p.status!=='Faturado / Recebido'?'À receber':p.status)}</td><td><button class="btn small" onclick="markReceived('${p.id}')">Baixar</button></td></tr>`).join('');
}
function renderCosts(){
  const total=state.costs.reduce((s,c)=>s+Number(c.value||0),0), paid=state.costs.filter(c=>c.status==='PAGO').reduce((s,c)=>s+Number(c.value||0),0);
  const cats={};state.costs.forEach(c=>cats[c.type]=(cats[c.type]||0)+Number(c.value||0));const largest=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  document.getElementById('costTotal').textContent=brl.format(total);document.getElementById('costPaid').textContent=brl.format(paid);document.getElementById('costOpen').textContent=brl.format(total-paid);document.getElementById('costLargest').textContent=largest;
  document.getElementById('costsTable').innerHTML=state.costs.map(c=>`<tr><td><strong>${esc(c.desc)}</strong></td><td>${esc(c.type)}</td><td>${esc(c.center)}</td><td>${fmtDate(c.date)}</td><td>${fmtDate(c.due)}</td><td>${esc(c.method)}</td><td>${brl.format(c.value)}</td><td>${badge(c.status)}</td><td><button class="btn small" onclick="toggleCost('${c.id}')">${c.status==='PAGO'?'Reabrir':'Pagar'}</button></td></tr>`).join('');
}
function renderPayroll(){
  document.getElementById('payrollTable').innerHTML=state.payroll.map(f=>`<tr><td><strong>${esc(f.name)}</strong></td><td>${esc(f.type)}</td><td>${esc(f.period)}</td><td>${esc(f.center)}</td><td>${brl.format(f.value)}</td><td>${badge(f.status)}</td></tr>`).join('');
  const total=state.payroll.reduce((s,f)=>s+Number(f.value||0),0), paid=state.payroll.filter(f=>f.status==='Pago').reduce((s,f)=>s+Number(f.value||0),0);
  document.getElementById('payrollSummary').innerHTML=`<div class="report-grid" style="grid-template-columns:1fr 1fr"><div class="report-tile"><small>Total da competência</small><strong>${brl.format(total)}</strong></div><div class="report-tile"><small>Em aberto</small><strong>${brl.format(total-paid)}</strong></div></div><div style="margin-top:18px;font-size:11px;color:var(--muted);line-height:1.6">A etapa seguinte poderá ratear folha por centro de custo e relacionar remuneração variável diretamente à produção de cada profissional.</div>`;
}
function renderReports(){
  const clinics=state.clinics.map(c=>{const a=state.patients.filter(p=>p.clinicId===c.id),r=a.reduce((s,p)=>s+p.value,0),co=a.reduce((s,p)=>s+patientCost(p),0);return {name:c.name,revenue:r,cost:co,profit:r-co,margin:pct(r-co,r)}}).sort((a,b)=>b.margin-a.margin);
  const procs=state.procedures.map(pr=>{const a=state.patients.filter(p=>p.procedureId===pr.id),r=a.reduce((s,p)=>s+p.value,0),co=a.reduce((s,p)=>s+patientCost(p),0);return {name:pr.name,revenue:r,cost:co,profit:r-co,margin:pct(r-co,r),cases:a.length}}).filter(x=>x.cases).sort((a,b)=>b.profit-a.profit);
  const total=state.patients.reduce((s,p)=>s+p.value,0), costs=state.patients.reduce((s,p)=>s+patientCost(p),0);
  document.getElementById('reportBestClinic').textContent=clinics[0]?.name||'—';document.getElementById('reportBestProcedure').textContent=procs[0]?.name||'—';document.getElementById('reportTicket').textContent=brl.format(state.patients.length?total/state.patients.length:0);document.getElementById('reportAvgCost').textContent=brl.format(state.patients.length?costs/state.patients.length:0);
  document.getElementById('reportClinics').innerHTML=clinics.map(x=>`<div style="margin-bottom:15px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px"><span>${esc(x.name)}</span><strong>${x.margin}% · ${brl.format(x.profit)}</strong></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,x.margin))}%"></span></div></div>`).join('');
  const max=Math.max(1,...procs.map(x=>x.profit));document.getElementById('reportProcedures').innerHTML=procs.map(x=>`<div style="margin-bottom:15px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px"><span>${esc(x.name)}</span><strong>${brl.format(x.profit)}</strong></div><div class="progress"><span style="width:${Math.max(0,x.profit/max*100)}%"></span></div></div>`).join('');
}
function renderMaterials(){
  document.getElementById('materialsTable').innerHTML=state.materials.map(m=>`<tr><td><strong>${esc(m.name)}</strong></td><td>${esc(m.brand)}</td><td>${esc(m.type)}</td><td>${esc(m.supplier)}</td><td>${esc(m.pack)}</td><td>${brl.format(m.price)}</td><td><strong>${brl.format(m.unitCost)}</strong></td><td>${fmtDate(m.updated)}</td></tr>`).join('');
}
function renderStock(){
  const val=state.materials.reduce((s,m)=>s+m.stock*m.unitCost,0), low=state.materials.filter(m=>m.stock<=m.min);
  document.getElementById('stockValue').textContent=brl.format(val);document.getElementById('stockLow').textContent=low.length;document.getElementById('stockItems').textContent=state.materials.length;
  document.getElementById('stockTable').innerHTML=state.materials.map(m=>`<tr><td><strong>${esc(m.name)}</strong></td><td>${esc(m.brand)}</td><td>${esc(m.type)}</td><td>${m.stock}</td><td>${m.min}</td><td>${brl.format(m.unitCost)}</td><td>${brl.format(m.stock*m.unitCost)}</td><td>${m.stock<=m.min?'<span class="badge b-red">Reposição</span>':'<span class="badge b-green">OK</span>'}</td></tr>`).join('');
}
function renderAll(){renderDashboard();renderPatients();renderClinics();renderProcedures();renderService();renderPrivate();renderLab();renderReceivables();renderCosts();renderPayroll();renderReports();renderMaterials();renderStock();}

function go(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>go(b.dataset.page));
document.getElementById('mobileMenu').onclick=()=>{document.getElementById('sidebar').classList.add('open');document.getElementById('overlay').classList.add('open')};
document.getElementById('overlay').onclick=()=>{document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open')};

function openModal(title,body,onSave){
  document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;document.getElementById('modalRoot').classList.add('open');
  document.getElementById('modalSave').onclick=onSave;
}
function closeModal(){document.getElementById('modalRoot').classList.remove('open')}
document.getElementById('modalRoot').addEventListener('click',e=>{if(e.target.id==='modalRoot')closeModal()});
function getv(id){return document.getElementById(id)?.value||''}
function num(id){return Number(getv(id)||0)}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2200)}

function clinicOptions(selected=''){return state.clinics.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('')}
function procOptions(selected=''){return state.procedures.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('')}
function statusOptions(selected='À receber'){return ['À receber','Recebido parcial','Faturado / Recebido','Aguardando acerto','Retrabalho','Não vai receber'].map(s=>`<option ${s===selected?'selected':''}>${s}</option>`).join('')}
function openPatientModal(origin='',editId=''){
  const p=state.patients.find(x=>x.id===editId)||{};
  openModal(editId?'Editar paciente':'Novo paciente',`
    <div class="form-grid">
      <div class="field full"><label>Nome do paciente</label><input id="fName" class="input" value="${esc(p.name||'')}" placeholder="Nome completo"></div>
      <div class="field"><label>Origem</label><select id="fOrigin" class="select"><option ${((p.origin||origin)==='Prestação')?'selected':''}>Prestação</option><option ${((p.origin||origin)==='Particular')?'selected':''}>Particular</option></select></div>
      <div class="field"><label>Clínica / centro de resultado</label><select id="fClinic" class="select">${clinicOptions(p.clinicId||(origin==='Particular'?'particular':'allon'))}</select></div>
      <div class="field"><label>Procedimento</label><select id="fProc" class="select">${procOptions(p.procedureId||'p1')}</select></div>
      <div class="field"><label>Data</label><input id="fDate" type="date" class="input" value="${p.date||todayISO()}"></div>
      <div class="field"><label>Valor / honorário</label><input id="fValue" type="number" step="0.01" class="input" value="${p.value??''}"></div>
      <div class="field"><label>Recebido</label><input id="fReceived" type="number" step="0.01" class="input" value="${p.received??0}"></div>
      <div class="field"><label>Vencimento</label><input id="fDue" type="date" class="input" value="${p.due||addDays(10)}"></div>
      <div class="field"><label>Status financeiro</label><select id="fStatus" class="select">${statusOptions(p.status)}</select></div>
      <div class="field"><label>Custo materiais</label><input id="fCost" type="number" step="0.01" class="input" value="${p.cost??0}"></div>
      <div class="field"><label>Laboratório</label><input id="fLab" type="number" step="0.01" class="input" value="${p.lab??0}"></div>
      <div class="field"><label>Componentes</label><input id="fComponents" type="number" step="0.01" class="input" value="${p.components??0}"></div>
      <div class="field"><label>Custo clínico / sala</label><input id="fClinical" type="number" step="0.01" class="input" value="${p.clinical??0}"></div>
      <div class="field full"><label>Progresso clínico/protético</label><select id="fProgress" class="select">${['Orçamento','Em tratamento','Aguardo pós Cirúrgico','Moldagem','Enviado para Laboratório','Aguardando Prova','Aguardando Cimentação','Alta'].map(s=>`<option ${s===(p.progress||'Em tratamento')?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>`,()=>{
      if(!getv('fName')) return toast('Informe o nome do paciente.');
      const obj={id:editId||uid(),name:getv('fName'),origin:getv('fOrigin'),clinicId:getv('fClinic'),procedureId:getv('fProc'),date:getv('fDate'),value:num('fValue'),received:num('fReceived'),due:getv('fDue'),status:getv('fStatus'),cost:num('fCost'),lab:num('fLab'),components:num('fComponents'),clinical:num('fClinical'),progress:getv('fProgress')};
      if(editId){state.patients=state.patients.map(x=>x.id===editId?obj:x)}else state.patients.unshift(obj);
      save();closeModal();renderAll();toast('Paciente salvo.');
    });
}
function editPatient(id){openPatientModal('',id)}
function openClinicModal(){
  openModal('Nova clínica',`<div class="form-grid"><div class="field full"><label>Nome</label><input id="cName" class="input"></div><div class="field"><label>Tipo</label><select id="cType" class="select"><option>Prestação de serviço</option><option>Próprio</option></select></div><div class="field"><label>Sigla</label><input id="cColor" class="input" maxlength="3"></div><div class="field full"><label>Regra financeira</label><textarea id="cRule" class="textarea" rows="3" placeholder="Ex.: R$ 490 por implante; materiais por minha conta..."></textarea></div></div>`,()=>{
    if(!getv('cName'))return toast('Informe o nome da clínica.');
    state.clinics.push({id:uid(),name:getv('cName'),type:getv('cType'),rule:getv('cRule')||'Regra não definida',color:(getv('cColor')||getv('cName').slice(0,2)).toUpperCase()});save();closeModal();renderAll();toast('Clínica adicionada.');
  })
}
function openProcedureModal(){
  openModal('Novo procedimento',`<div class="form-grid"><div class="field full"><label>Procedimento</label><input id="pName" class="input"></div><div class="field"><label>Preço base</label><input id="pPrice" type="number" class="input"></div><div class="field"><label>Custos adicionais padrão</label><input id="pExtra" type="number" class="input" value="0"></div><div class="field full"><label>Observação</label><textarea class="textarea" rows="3" placeholder="A ficha detalhada de materiais poderá ser configurada depois."></textarea></div></div>`,()=>{
    if(!getv('pName'))return toast('Informe o nome do procedimento.');
    state.procedures.push({id:uid(),name:getv('pName'),price:num('pPrice'),extra:num('pExtra'),items:[]});save();closeModal();renderAll();toast('Procedimento adicionado.');
  })
}
function openReceivableModal(type=''){
  openModal('Novo recebível',`<div class="form-grid"><div class="field full"><label>Paciente</label><input id="rName" class="input"></div><div class="field"><label>Clínica</label><select id="rClinic" class="select">${clinicOptions(type==='prestacao'?'allon':'particular')}</select></div><div class="field"><label>Procedimento</label><select id="rProc" class="select">${procOptions()}</select></div><div class="field"><label>Valor</label><input id="rValue" type="number" class="input"></div><div class="field"><label>Recebido</label><input id="rReceived" type="number" class="input" value="0"></div><div class="field"><label>Vencimento</label><input id="rDue" type="date" class="input" value="${addDays(7)}"></div><div class="field"><label>Status</label><select id="rStatus" class="select">${statusOptions()}</select></div></div>`,()=>{
    if(!getv('rName'))return toast('Informe o paciente.');
    const cl=getv('rClinic'); state.patients.unshift({id:uid(),name:getv('rName'),origin:cl==='particular'?'Particular':'Prestação',clinicId:cl,procedureId:getv('rProc'),date:todayISO(),value:num('rValue'),received:num('rReceived'),due:getv('rDue'),status:getv('rStatus'),cost:0,lab:0,components:0,clinical:0,progress:'Em tratamento'});save();closeModal();renderAll();toast('Recebível lançado.');
  })
}
function openCostModal(){
  const types=['IMPLANTE','LAB','BIOMATERIAL','INSUMOS','COMPONENTES','EQUIPAMENTO','ALUGUEL','Transporte','Alimentação','IMPOSTO E CRO','Consultoria'];
  openModal('Novo custo',`<div class="form-grid"><div class="field full"><label>Descrição</label><input id="xDesc" class="input"></div><div class="field"><label>Tipo</label><select id="xType" class="select">${types.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>Centro de custo</label><select id="xCenter" class="select"><option>Geral</option>${state.clinics.map(c=>`<option>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>Data</label><input id="xDate" type="date" class="input" value="${todayISO()}"></div><div class="field"><label>Vencimento</label><input id="xDue" type="date" class="input" value="${addDays(7)}"></div><div class="field"><label>Forma de pagamento</label><select id="xMethod" class="select"><option>PIX</option><option>BOLETO À VISTA</option><option>BOLETO PARCELADO</option><option>CRÉDITO</option><option>DÉBITO</option><option>DINHEIRO</option></select></div><div class="field"><label>Valor</label><input id="xValue" type="number" step="0.01" class="input"></div><div class="field"><label>Status</label><select id="xStatus" class="select"><option>À PAGAR</option><option>PAGO</option><option>PARCELADO</option><option>ATRASADO</option></select></div></div>`,()=>{
    if(!getv('xDesc'))return toast('Informe a descrição.');
    state.costs.unshift({id:uid(),desc:getv('xDesc'),type:getv('xType'),center:getv('xCenter'),date:getv('xDate'),due:getv('xDue'),method:getv('xMethod'),value:num('xValue'),status:getv('xStatus')});save();closeModal();renderAll();toast('Custo lançado.');
  })
}
function openMaterialModal(){
  openModal('Novo material',`<div class="form-grid"><div class="field full"><label>Material</label><input id="mName" class="input"></div><div class="field"><label>Marca</label><input id="mBrand" class="input"></div><div class="field"><label>Tipo</label><input id="mType" class="input"></div><div class="field"><label>Fornecedor</label><input id="mSupplier" class="input"></div><div class="field"><label>Embalagem</label><input id="mPack" class="input" placeholder="Ex.: 20 unidades"></div><div class="field"><label>Preço total</label><input id="mPrice" type="number" step="0.01" class="input"></div><div class="field"><label>Custo unitário</label><input id="mUnit" type="number" step="0.001" class="input"></div><div class="field"><label>Quantidade atual</label><input id="mStock" type="number" class="input"></div><div class="field"><label>Estoque mínimo</label><input id="mMin" type="number" class="input"></div></div>`,()=>{
    if(!getv('mName'))return toast('Informe o material.');
    state.materials.push({id:uid(),name:getv('mName'),brand:getv('mBrand'),type:getv('mType'),supplier:getv('mSupplier'),pack:getv('mPack'),price:num('mPrice'),unitCost:num('mUnit')||num('mPrice'),stock:num('mStock'),min:num('mMin'),updated:todayISO()});save();closeModal();renderAll();toast('Material cadastrado.');
  })
}
function openStockModal(){
  openModal('Movimentar estoque',`<div class="form-grid"><div class="field full"><label>Material</label><select id="sMaterial" class="select">${state.materials.map(m=>`<option value="${m.id}">${esc(m.name)} · saldo ${m.stock}</option>`).join('')}</select></div><div class="field"><label>Movimento</label><select id="sType" class="select"><option value="in">Entrada</option><option value="out">Saída / consumo</option></select></div><div class="field"><label>Quantidade</label><input id="sQty" type="number" class="input" value="1"></div></div>`,()=>{
    const m=state.materials.find(x=>x.id===getv('sMaterial'));if(!m)return;
    const q=num('sQty');m.stock=Math.max(0,Number(m.stock)+(getv('sType')==='in'?q:-q));save();closeModal();renderAll();toast('Estoque atualizado.');
  })
}
function openPayrollModal(){
  openModal('Novo lançamento de folha',`<div class="form-grid"><div class="field full"><label>Profissional</label><input id="fPayName" class="input"></div><div class="field"><label>Tipo</label><select id="fPayType" class="select"><option>Fixo</option><option>Diária</option><option>Comissão</option><option>Produção</option></select></div><div class="field"><label>Competência</label><input id="fPayPeriod" class="input" value="09/2026"></div><div class="field"><label>Centro</label><select id="fPayCenter" class="select"><option>Geral</option>${state.clinics.map(c=>`<option>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>Valor</label><input id="fPayValue" type="number" class="input"></div><div class="field"><label>Status</label><select id="fPayStatus" class="select"><option>A pagar</option><option>Pago</option></select></div></div>`,()=>{
    if(!getv('fPayName'))return toast('Informe o profissional.');
    state.payroll.push({id:uid(),name:getv('fPayName'),type:getv('fPayType'),period:getv('fPayPeriod'),center:getv('fPayCenter'),value:num('fPayValue'),status:getv('fPayStatus')});save();closeModal();renderAll();toast('Folha atualizada.');
  })
}
function openQuickModal(){
  openModal('Novo lançamento',`<div class="grid layout-3"><button class="btn" style="height:80px;justify-content:center" onclick="closeModal();openPatientModal()">Paciente</button><button class="btn" style="height:80px;justify-content:center" onclick="closeModal();openReceivableModal()">Recebível</button><button class="btn" style="height:80px;justify-content:center" onclick="closeModal();openCostModal()">Custo</button><button class="btn" style="height:80px;justify-content:center" onclick="closeModal();openMaterialModal()">Material</button><button class="btn" style="height:80px;justify-content:center" onclick="closeModal();openStockModal()">Estoque</button><button class="btn" style="height:80px;justify-content:center" onclick="closeModal();openPayrollModal()">Folha</button></div>`,()=>closeModal());
  document.getElementById('modalSave').style.display='none';
  setTimeout(()=>document.getElementById('modalSave').style.display='',0);
}
function markReceived(id){
  const p=state.patients.find(x=>x.id===id);if(!p)return;
  openModal('Baixar recebimento',`<div class="form-grid"><div class="field full"><label>Paciente</label><input class="input" value="${esc(p.name)}" disabled></div><div class="field"><label>Saldo atual</label><input class="input" value="${brl.format(balance(p))}" disabled></div><div class="field"><label>Valor recebido agora</label><input id="receiveAmount" type="number" class="input" value="${balance(p)}"></div></div>`,()=>{
    p.received=Math.min(p.value,Number(p.received||0)+num('receiveAmount'));p.status=p.received>=p.value?'Faturado / Recebido':'Recebido parcial';save();closeModal();renderAll();toast('Recebimento atualizado.');
  })
}
function toggleCost(id){const c=state.costs.find(x=>x.id===id);if(!c)return;c.status=c.status==='PAGO'?'À PAGAR':'PAGO';save();renderAll();toast('Status do custo atualizado.')}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='chevalier-gestao-backup.json';a.click();URL.revokeObjectURL(a.href);
}
document.getElementById('globalSearch').addEventListener('input',e=>{
  const q=e.target.value.toLowerCase().trim();if(!q)return;
  const p=state.patients.find(x=>x.name.toLowerCase().includes(q)||procedure(x.procedureId).name.toLowerCase().includes(q));
  if(p){go('pacientes');document.getElementById('patientSearch').value=q;renderPatients();}
});

const now=new Date();
document.getElementById('todayLabel').textContent=now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});

async function boot(){
  try{
    const r=await fetch('api/state.php',{cache:'no-store'});
    const data=await r.json();
    if(data.ok && data.state){
      state=data.state;
      persistReady=true;
      localStorage.setItem('chevalier_gestao_v1',JSON.stringify(state));
    }else if(data.ok && !data.state){
      persistReady=true;
      await fetch('api/state.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});
    }
  }catch(e){ /* fallback localStorage */ }
  renderAll();
}
boot();
