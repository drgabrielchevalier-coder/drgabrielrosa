const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const todayISO = () => new Date().toISOString().slice(0,10);
const addDays = n => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const pastDays = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
const uid = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
// Expostos para planning-calendar.js (const/let não viram window.*)
Object.assign(window, { todayISO, addDays, pastDays, uid, brl });

const seed = {
  clinics:[
    {id:'allon',name:'Allon Roter',type:'Prestação de serviço',rule:'Honorário por procedimento',color:'AR'},
    {id:'daniele',name:'Daniele Belmiro',type:'Prestação de serviço',rule:'Honorário informado por caso',color:'DB'},
    {id:'gerlucia',name:'Gerlúcia',type:'Prestação de serviço',rule:'Valor menos laboratório/componentes',color:'GE'},
    {id:'particular',name:'Particular',type:'Próprio',rule:'Receita integral do paciente',color:'PT'}
  ],
  materials:[
    {id:'m1',name:'Implante CM 3.5',brand:'Dérig',type:'Implante — Fixação',supplier:'Dental fornecedor',pack:'1 un',price:158,unitCost:158,stock:8,min:3,barcode:'7891000000001',updated:todayISO()},
    {id:'m2',name:'Mini pilar CM',brand:'Neodent',type:'Implante — Componente',supplier:'Dental fornecedor',pack:'1 un',price:92,unitCost:92,stock:4,min:3,barcode:'7891000000002',updated:todayISO()},
    {id:'m3',name:'Biomaterial 0,5 g',brand:'Lumina Bone',type:'Implante — Biomaterial',supplier:'Dental fornecedor',pack:'1 un',price:198,unitCost:198,stock:2,min:2,barcode:'7891000000003',updated:pastDays(5)},
    {id:'m4',name:'Anestésico com vasoconstritor',brand:'DFL',type:'Comum — Anestésico',supplier:'Dental fornecedor',pack:'50 tubetes',price:200,unitCost:4,stock:31,min:10,barcode:'7891000000004',updated:pastDays(2)},
    {id:'m5',name:'Campo cirúrgico estéril',brand:'Genérico',type:'Cirurgia — Descartáveis',supplier:'Distribuidora',pack:'1 kit',price:35,unitCost:35,stock:5,min:3,barcode:'7891000000005',updated:pastDays(8)},
    {id:'m6',name:'Soro fisiológico 500 ml',brand:'Equiplex',type:'Cirurgia — Antisepsia',supplier:'Distribuidora',pack:'20 bolsas',price:279.90,unitCost:13.995,stock:12,min:5,barcode:'7891000000006',updated:pastDays(12)},
    {id:'m7',name:'Transfer HE 4.1',brand:'Implacil',type:'Implante — Transfer / análogo',supplier:'Dental fornecedor',pack:'1 un',price:30,unitCost:30,stock:2,min:2,barcode:'7891000000007',updated:pastDays(7)},
    {id:'m8',name:'Análogo de implante',brand:'Implacil',type:'Implante — Transfer / análogo',supplier:'Dental fornecedor',pack:'1 un',price:45,unitCost:45,stock:3,min:2,barcode:'7891000000008',updated:pastDays(7)}
  ],
  procedures:[
    {id:'p1',name:'Implante unitário (plantio)',specialty:'implante',kind:'cirurgico',price:1500,items:[{materialId:'m1',qty:1},{materialId:'m4',qty:4},{materialId:'m5',qty:1},{materialId:'m6',qty:1}],extra:44,clinicPrices:[
      {clinicId:'allon',practicedValue:1500,receiveMode:'fixed',receiveAmount:490,receivePercent:100},
      {clinicId:'daniele',practicedValue:1500,receiveMode:'fixed',receiveAmount:700,receivePercent:100},
      {clinicId:'gerlucia',practicedValue:1500,receiveMode:'percent',receiveAmount:0,receivePercent:40},
      {clinicId:'particular',practicedValue:1500,receiveMode:'fixed',receiveAmount:1500,receivePercent:100}
    ]},
    {id:'p2',name:'Implante + enxerto (pacote)',specialty:'implante',kind:'cirurgico',price:1700,items:[{materialId:'m1',qty:1},{materialId:'m3',qty:1},{materialId:'m4',qty:4},{materialId:'m5',qty:1},{materialId:'m6',qty:1}],extra:44,clinicPrices:[
      {clinicId:'allon',practicedValue:1700,receiveMode:'fixed',receiveAmount:490,receivePercent:100},
      {clinicId:'daniele',practicedValue:1700,receiveMode:'fixed',receiveAmount:750,receivePercent:100},
      {clinicId:'gerlucia',practicedValue:1700,receiveMode:'percent',receiveAmount:0,receivePercent:40},
      {clinicId:'particular',practicedValue:1700,receiveMode:'fixed',receiveAmount:1700,receivePercent:100}
    ]},
    {id:'p3',name:'Coroa sobre implante',specialty:'protese',kind:'clinico',price:1500,items:[{materialId:'m7',qty:1},{materialId:'m8',qty:1}],extra:450,clinicPrices:[
      {clinicId:'allon',practicedValue:1500,receiveMode:'fixed',receiveAmount:850,receivePercent:100},
      {clinicId:'daniele',practicedValue:1500,receiveMode:'fixed',receiveAmount:850,receivePercent:100},
      {clinicId:'gerlucia',practicedValue:1500,receiveMode:'fixed',receiveAmount:850,receivePercent:100},
      {clinicId:'particular',practicedValue:1500,receiveMode:'fixed',receiveAmount:1500,receivePercent:100}
    ]},
    {id:'p4',name:'Implante + coroa (pacote)',specialty:'protese',kind:'clinico',price:2400,items:[{materialId:'m1',qty:1},{materialId:'m4',qty:4},{materialId:'m5',qty:1},{materialId:'m6',qty:1},{materialId:'m7',qty:1},{materialId:'m8',qty:1}],extra:450,clinicPrices:[
      {clinicId:'allon',practicedValue:2400,receiveMode:'percent',receiveAmount:0,receivePercent:50},
      {clinicId:'daniele',practicedValue:2400,receiveMode:'percent',receiveAmount:0,receivePercent:50},
      {clinicId:'gerlucia',practicedValue:2400,receiveMode:'percent',receiveAmount:0,receivePercent:45},
      {clinicId:'particular',practicedValue:2400,receiveMode:'fixed',receiveAmount:2400,receivePercent:100}
    ]},
    {id:'p5',name:'Protocolo por arcada (cirurgia)',specialty:'implante',kind:'cirurgico',price:13000,items:[{materialId:'m1',qty:4},{materialId:'m4',qty:8},{materialId:'m5',qty:1},{materialId:'m6',qty:2},{materialId:'m2',qty:4}],extra:1900,clinicPrices:[
      {clinicId:'allon',practicedValue:13000,receiveMode:'percent',receiveAmount:0,receivePercent:35},
      {clinicId:'daniele',practicedValue:13000,receiveMode:'percent',receiveAmount:0,receivePercent:35},
      {clinicId:'gerlucia',practicedValue:13000,receiveMode:'percent',receiveAmount:0,receivePercent:30},
      {clinicId:'particular',practicedValue:13000,receiveMode:'fixed',receiveAmount:13000,receivePercent:100}
    ]},
    {id:'p6',name:'Restauração simples',specialty:'clinica',kind:'clinico',price:230,items:[],extra:32,clinicPrices:[
      {clinicId:'allon',practicedValue:230,receiveMode:'fixed',receiveAmount:150,receivePercent:100},
      {clinicId:'daniele',practicedValue:230,receiveMode:'fixed',receiveAmount:150,receivePercent:100},
      {clinicId:'gerlucia',practicedValue:230,receiveMode:'percent',receiveAmount:0,receivePercent:60},
      {clinicId:'particular',practicedValue:230,receiveMode:'fixed',receiveAmount:230,receivePercent:100}
    ]}
  ],
  patients:[
    {id:'pt1',name:'Paciente Exemplo 01',origin:'Prestação',clinicId:'allon',procedureId:'p1',lines:[{procedureId:'p1',qty:1,tooth:'26'}],date:pastDays(20),value:490,received:490,due:pastDays(10),status:'Faturado / Recebido',cost:224.86,lab:0,components:0,clinical:0,progress:'Alta'},
    {id:'pt2',name:'Paciente Exemplo 02',origin:'Prestação',clinicId:'allon',procedureId:'p1',lines:[{procedureId:'p1',qty:1,tooth:'36'},{procedureId:'proc-enxerto-osseo',qty:1,tooth:'36'}],date:pastDays(12),value:490,received:0,due:pastDays(2),status:'À receber',cost:323.86,lab:0,components:0,clinical:0,progress:'Aguardo pós Cirúrgico'},
    {id:'pt3',name:'Paciente Exemplo 03',origin:'Particular',clinicId:'particular',procedureId:'p1',lines:[{procedureId:'p1',qty:1,tooth:'15'},{procedureId:'p3',qty:1,tooth:'15'}],date:pastDays(18),value:2400,received:1200,due:addDays(12),status:'Recebido parcial',cost:224.86,lab:450,components:75,clinical:300,progress:'Enviado para Laboratório'},
    {id:'pt4',name:'Paciente Exemplo 04',origin:'Prestação',clinicId:'gerlucia',procedureId:'p3',lines:[{procedureId:'p3',qty:1,tooth:'16'}],date:pastDays(9),value:850,received:400,due:pastDays(1),status:'Recebido parcial',cost:0,lab:450,components:75,clinical:0,progress:'Aguardando Cimentação'},
    {id:'pt5',name:'Paciente Exemplo 05',origin:'Prestação',clinicId:'daniele',procedureId:'p1',lines:[{procedureId:'p1',qty:1,tooth:'46'}],date:pastDays(6),value:700,received:0,due:addDays(7),status:'Aguardando acerto',cost:224.86,lab:0,components:0,clinical:0,progress:'Em tratamento'}
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
  ],
  prostheses:[
    {id:'pr1',code:'GR0001',patientId:'pt3',type:'Coroa sobre implante',tooth:'26',lab:'Precisão Lab',cost:450,stage:1,labStatus:'Em produção',entry:pastDays(18),due:addDays(5),urgent:false,shade:'A2',notes:'Componente CM enviado junto.',events:[{date:pastDays(18),stage:0,note:'Trabalho cadastrado'},{date:pastDays(12),stage:1,note:'Enviado ao laboratório'}]},
    {id:'pr2',code:'GR0002',patientId:'pt4',type:'Coroa de zircônia',tooth:'16',lab:'Ateliê Dental',cost:450,stage:3,labStatus:'Recebido — aguardando agendamento',entry:pastDays(9),due:pastDays(1),urgent:true,shade:'A3',notes:'Aguardando cimentação.',events:[{date:pastDays(9),stage:0,note:'Moldagem registrada'},{date:pastDays(7),stage:1,note:'Enviado ao laboratório'},{date:pastDays(2),stage:2,note:'Prova realizada'},{date:pastDays(1),stage:3,note:'Peça pronta na clínica'}]},
    {id:'pr3',code:'GR0003',patientId:'pt1',type:'Protocolo superior',tooth:'Superior',lab:'OralLab',cost:1900,stage:4,labStatus:'Entregue / instalado',entry:pastDays(40),due:pastDays(10),urgent:false,shade:'BL3',notes:'Instalado e alta.',events:[{date:pastDays(40),stage:0,note:'Trabalho cadastrado'},{date:pastDays(28),stage:1,note:'Em produção'},{date:pastDays(14),stage:2,note:'Prova de dentes'},{date:pastDays(10),stage:4,note:'Instalado'}]},
    {id:'pr4',code:'GR0004',patientId:'pt5',type:'Faceta de porcelana',tooth:'11-21',lab:'Ateliê Dental',cost:620,stage:2,labStatus:'Prova / ajustes',entry:pastDays(6),due:addDays(4),urgent:false,shade:'A1',notes:'Ajuste de borda incisal.',events:[{date:pastDays(6),stage:0,note:'Trabalho cadastrado'},{date:pastDays(4),stage:1,note:'Enviado ao laboratório'},{date:pastDays(1),stage:2,note:'Prova em boca'}]}
  ],
  reminders:[],
  plans:[]
};

let state = JSON.parse(localStorage.getItem('chevalier_gestao_v1')||'null') || structuredClone(seed);
let persistReady = false;
let receivableFilter = '';
// planning-calendar.js lê window.state — `let` não cria propriedade global
function bindGlobalState(next){
  state = next;
  window.state = state;
  return state;
}
bindGlobalState(state);

function csrfToken(){return String(window.CHEVALIER_CSRF||'');}
function csrfHeaders(extra={}){
  const h={...extra};
  const t=csrfToken();
  if(t) h['X-CSRF-TOKEN']=t;
  return h;
}
function applyCsrfFromResponse(data){
  if(data && typeof data.csrf==='string' && data.csrf) window.CHEVALIER_CSRF=data.csrf;
}
function defaultSettings(){
  return {autoMargin:true,alertOverdue:true,alertStock:true,allocateFixed:false};
}
function ensureSettings(){
  state.settings={...defaultSettings(),...(state.settings&&typeof state.settings==='object'?state.settings:{})};
  return state.settings;
}
function getSetting(key){
  return !!ensureSettings()[key];
}
function toggleSetting(key, el){
  ensureSettings();
  el.classList.toggle('on');
  const on=el.classList.contains('on');
  state.settings[key]=on;
  el.setAttribute('aria-checked', on?'true':'false');
  save();
  renderAll();
  toast('Preferência salva.');
}
function renderSettings(){
  ensureSettings();
  const map={setAutoMargin:'autoMargin',setAlertOverdue:'alertOverdue',setAlertStock:'alertStock',setAllocateFixed:'allocateFixed'};
  Object.entries(map).forEach(([id,key])=>{
    const el=document.getElementById(id);
    if(!el) return;
    const on=!!state.settings[key];
    el.classList.toggle('on',on);
    el.setAttribute('aria-checked', on?'true':'false');
  });
}
function updateNotifBadge(){
  const n=collectNotifications().length;
  const btn=document.getElementById('notifBtn');
  if(btn) btn.title=n?`Notificações (${n})`:'Notificações';
  if(btn) btn.dataset.count=String(n);
  btn?.classList.toggle('has-notif', n>0);
}
function collectNotifications(){
  const items=[];
  if(getSetting('alertOverdue')){
    state.patients.filter(isOverdue).forEach(p=>items.push({
      title:`Cobrança vencida · ${p.name}`,
      sub:`${clinic(p.clinicId).name} · venceu ${fmtDate(p.due)} · ${brl.format(balance(p))}`,
      go:'receber'
    }));
  }
  if(getSetting('alertStock')){
    state.materials.filter(m=>Number(m.stock)<=Number(m.min)).forEach(m=>items.push({
      title:`Estoque baixo · ${m.name}`,
      sub:`Saldo ${m.stock} · mínimo ${m.min}`,
      go:'estoque'
    }));
  }
  (state.reminders||[]).filter(r=>!r.done && r.date && r.date<=todayISO()).forEach(r=>items.push({
    title:`Lembrete · ${r.title}`,
    sub:`${fmtDate(r.date)}${r.time?' · '+r.time:''}${r.type?' · '+r.type:''}`,
    go:'calendario'
  }));
  (state.prostheses||[]).filter(w=>w.due && w.due<todayISO() && Number(w.stage)<4).forEach(w=>items.push({
    title:`Prótese atrasada · ${patientById(w.patientId).name}`,
    sub:`${w.type||'Trabalho'} · prazo ${fmtDate(w.due)}`,
    go:'entregas'
  }));
  return items;
}
function openNotifications(){
  const items=collectNotifications();
  const body=items.length
    ? `<div class="list">${items.slice(0,25).map(a=>`<button type="button" class="list-item" style="width:100%;text-align:left;border:0;background:transparent;cursor:pointer" onclick="closeModal();go('${esc(a.go)}')"><span class="dot amber"></span><div class="list-main"><strong>${esc(a.title)}</strong><span>${esc(a.sub)}</span></div></button>`).join('')}</div>`
    : '<div class="empty">Nenhuma notificação no momento.</div>';
  openModal('Notificações',body,()=>closeModal());
  const s=document.getElementById('modalSave');
  if(s) s.style.display='none';
}
function exportReportCsv(){
  const patients=state.patients.filter(p=>inPeriod(p.date));
  const rows=[['Paciente','Clínica','Procedimento','Data','Valor','Recebido','Saldo','Custos','Lucro','Status']];
  patients.forEach(p=>rows.push([
    p.name,
    clinic(p.clinicId).name,
    patientProcedureLabel(p),
    p.date||'',
    Number(p.value||0),
    Number(p.received||0),
    balance(p),
    patientCost(p),
    patientProfit(p),
    p.status||''
  ]));
  const csv=rows.map(r=>r.map(v=>{
    const s=String(v??'');
    return /[";\n,]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
  }).join(';')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`dr-gabriel-rosa-relatorio-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(patients.length?`CSV com ${patients.length} lançamento(s).`:'CSV exportado (sem lançamentos no período).');
}
function save(){
  localStorage.setItem('chevalier_gestao_v1',JSON.stringify(state));
  if(!persistReady) return;
  const payload={...state,csrf:csrfToken()};
  fetch('api/state.php',{
    method:'POST',
    headers:csrfHeaders({'Content-Type':'application/json'}),
    credentials:'same-origin',
    body:JSON.stringify(payload)
  }).then(async r=>{
    try{applyCsrfFromResponse(await r.json());}catch(_){}
    if(r.status===401) location.href='login.php';
  }).catch(()=>{});
}
function clinic(id){return state.clinics.find(x=>x.id===id)||{name:'—',color:'??'};}
function procedure(id){return state.procedures.find(x=>x.id===id)||{name:'—',price:0,items:[],extra:0,clinicPrices:[]};}
function material(id){return state.materials.find(x=>x.id===id)||{name:'—',unitCost:0};}
function normalizeClinicPrice(row={},fallbackPrice=0){
  const practiced=Number(row.practicedValue ?? fallbackPrice ?? 0);
  const mode=row.receiveMode==='percent'?'percent':'fixed';
  return {
    clinicId:String(row.clinicId||''),
    practicedValue:practiced,
    receiveMode:mode,
    receiveAmount:Number(row.receiveAmount ?? (mode==='fixed'?practiced:0)),
    receivePercent:Number(row.receivePercent ?? (mode==='percent'?50:100))
  };
}
function ensureClinicPrices(){
  (state.procedures||[]).forEach(p=>{
    const map=Object.fromEntries((p.clinicPrices||[]).filter(x=>x&&x.clinicId).map(x=>[x.clinicId,x]));
    p.clinicPrices=(state.clinics||[]).map(c=>normalizeClinicPrice({...(map[c.id]||{}),clinicId:c.id},p.price||0));
  });
}
function clinicPriceFor(procId,clinicId){
  const p=procedure(procId);
  const row=(p.clinicPrices||[]).find(x=>x.clinicId===clinicId);
  return row?normalizeClinicPrice(row,p.price||0):normalizeClinicPrice({clinicId,practicedValue:p.price||0,receiveMode:'fixed',receiveAmount:p.price||0,receivePercent:100},p.price||0);
}
function honorariumFromPrice(row){
  const r=normalizeClinicPrice(row);
  if(r.receiveMode==='percent') return Math.round((Number(r.practicedValue||0)*Number(r.receivePercent||0)/100)*100)/100;
  return Math.round(Number(r.receiveAmount||0)*100)/100;
}
function procedureHonorarium(procId,clinicId){
  return honorariumFromPrice(clinicPriceFor(procId,clinicId));
}
function clinicPriceLabel(row){
  const r=normalizeClinicPrice(row);
  if(r.receiveMode==='percent') return `${brl.format(r.practicedValue)} · ${r.receivePercent}% = ${brl.format(honorariumFromPrice(r))}`;
  return `${brl.format(r.practicedValue)} · fechado ${brl.format(r.receiveAmount)}`;
}
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
  return `<span class="badge ${cls}">${esc(status||'—')}</span>`;
}
function fmtDate(v){if(!v)return'—'; const [y,m,d]=v.split('-'); return `${d}/${m}/${y}`;}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function td(label,html){return `<td data-label="${esc(label)}">${html}</td>`}
function acts(edit,del){return `<div class="row-actions"><button class="btn small" onclick="${edit}">Editar</button><button class="btn small danger" onclick="${del}">Excluir</button></div>`}
let bancoTab='materiais';
const CATALOG_VERSION=Number(window.CHEVALIER_CATALOG_VERSION||2);
const DENTAL_CATALOG=Array.isArray(window.DENTAL_CATALOG)?window.DENTAL_CATALOG:[];
const DENTAL_SPECIALTIES=Array.isArray(window.DENTAL_SPECIALTIES)?window.DENTAL_SPECIALTIES:[];
const PROC_CATALOG_VERSION=Number(window.CHEVALIER_PROCEDURE_CATALOG_VERSION||1);
const DENTAL_PROCEDURE_CATALOG=Array.isArray(window.DENTAL_PROCEDURE_CATALOG)?window.DENTAL_PROCEDURE_CATALOG:[];
const DENTAL_PROCEDURE_SPECIALTIES=Array.isArray(window.DENTAL_PROCEDURE_SPECIALTIES)?window.DENTAL_PROCEDURE_SPECIALTIES:[];
let serviceClinicFilter='';
function specialtyName(id){
  return (DENTAL_PROCEDURE_SPECIALTIES.find(s=>s.id===id)||DENTAL_SPECIALTIES.find(s=>s.id===id)||{name:id||'—'}).name;
}
function catalogTypeOptions(selected=''){
  const fromSpec=DENTAL_SPECIALTIES.flatMap(s=>s.categories||[]);
  const fromMats=[...new Set((state.materials||[]).map(m=>m.type).filter(Boolean))];
  const types=[...new Set([...fromSpec,...fromMats])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  return types.map(t=>`<option value="${esc(t)}" ${t===selected?'selected':''}>${esc(t)}</option>`).join('');
}
function ensureCatalog(force=false){
  if(!Array.isArray(state.materials)) state.materials=[];
  const versionOk=Number(state.catalogVersion||0)===CATALOG_VERSION;
  if(state.catalogReady && versionOk && !force) return 0;
  const byId=Object.fromEntries(state.materials.map(m=>[m.id,m]));
  let added=0;
  DENTAL_CATALOG.forEach(([id,name,brand,type,pack,price,unitCost])=>{
    const existing=byId[id];
    if(existing){
      existing.type=type;
      if(!existing.name) existing.name=name;
      if(!existing.brand) existing.brand=brand;
      if(!existing.pack) existing.pack=pack;
      return;
    }
    const barcode='789'+String(String(id).replace(/\D/g,'')||'0').padStart(10,'0').slice(-10);
    const row={id,name,brand,type,supplier:'Catálogo odontológico',pack,price,unitCost,stock:0,min:1,barcode,updated:todayISO()};
    state.materials.push(row);
    byId[id]=row;
    added++;
  });
  state.materials.forEach(m=>{
    if(!m.barcode){
      m.barcode='789'+String(String(m.id).replace(/\D/g,'')||'0').padStart(10,'0').slice(-10);
    }
  });
  state.catalogVersion=CATALOG_VERSION;
  state.catalogReady=true;
  return added;
}

function ensureProcedureCatalog(force=false){
  if(!Array.isArray(state.procedures)) state.procedures=[];
  const versionOk=Number(state.procedureCatalogVersion||0)===PROC_CATALOG_VERSION;
  if(state.procedureCatalogReady && versionOk && !force) return 0;
  const byId=Object.fromEntries(state.procedures.map(p=>[p.id,p]));
  let added=0;
  DENTAL_PROCEDURE_CATALOG.forEach(([id,specialty,name,kind,price,extra,matIds])=>{
    const items=(matIds||[]).filter(mid=>state.materials.some(m=>m.id===mid)||DENTAL_CATALOG.some(t=>t[0]===mid)).map(mid=>({materialId:mid,qty:1}));
    const existing=byId[id];
    if(existing){
      existing.specialty=existing.specialty||specialty;
      existing.kind=existing.kind||kind;
      if(!existing.name) existing.name=name;
      // Não sobrescreve preços já definidos pelo usuário
      if(Number(existing.price||0)===0 && Number(price||0)>0) existing.price=price;
      if((!existing.items||!existing.items.length) && items.length) existing.items=items;
      if(Number(existing.extra||0)===0 && Number(extra||0)>0) existing.extra=extra;
      return;
    }
    const row={
      id,name,specialty,kind,
      price:Number(price||0),
      extra:Number(extra||0),
      items,
      clinicPrices:[]
    };
    state.procedures.push(row);
    byId[id]=row;
    added++;
  });
  state.procedureCatalogVersion=PROC_CATALOG_VERSION;
  state.procedureCatalogReady=true;
  ensureClinicPrices();
  return added;
}

function patientLines(p){
  if(!p) return [];
  if(Array.isArray(p.lines) && p.lines.length){
    return p.lines.filter(l=>l&&l.procedureId).map(l=>({
      procedureId:l.procedureId,
      qty:Number(l.qty||1)||1,
      tooth:l.tooth||'',
      honorarium:l.honorarium!=null?Number(l.honorarium):undefined,
      practicedValue:l.practicedValue!=null?Number(l.practicedValue):undefined
    }));
  }
  if(p.procedureId) return [{procedureId:p.procedureId,qty:1,tooth:''}];
  return [];
}
function patientProcedureLabel(p){
  const lines=patientLines(p);
  if(!lines.length) return procedure(p?.procedureId).name;
  const names=lines.map(l=>procedure(l.procedureId).name);
  return names.length<=2?names.join(' + '):`${names[0]} + ${names.length-1} outros`;
}
function patientProcedureSearchText(p){
  return patientLines(p).map(l=>procedure(l.procedureId).name).join(' ');
}
function combinedProcedureMaterials(lines){
  const map={};
  let lab=0;
  (lines||[]).forEach(l=>{
    const p=procedure(l.procedureId);
    lab+=Number(p.extra||0)*Number(l.qty||1);
    (p.items||[]).forEach(it=>{
      const key=it.materialId;
      if(!key) return;
      map[key]=(map[key]||0)+Number(it.qty||0)*Number(l.qty||1);
    });
  });
  const items=Object.entries(map).map(([materialId,qty])=>({materialId,qty}));
  let materials=0, components=0;
  items.forEach(it=>{
    const m=material(it.materialId);
    const total=Number(m.unitCost||0)*Number(it.qty||0);
    const t=`${m.name||''} ${m.type||''}`.toLowerCase();
    if(/componente|pilar|transfer|análogo|analogo|cicatrizador|multi-unit|parafuso/.test(t)) components+=total;
    else materials+=total;
  });
  return {items,materials,components,lab,total:materials+components+lab};
}
function honorariumForLines(lines,clinicId){
  return (lines||[]).reduce((s,l)=>{
    if(l.honorarium!=null && l.honorarium!=='') return s+Number(l.honorarium||0)*Number(l.qty||1);
    return s+procedureHonorarium(l.procedureId,clinicId)*Number(l.qty||1);
  },0);
}
function treatmentLineRow(line={}){
  const id=line.procedureId||'';
  const p=procedure(id);
  const kind=p.kind==='cirurgico'?'Cirúrgico':'Clínico';
  return `<div class="treat-line" data-proc="${esc(id)}">
    <div class="treat-line-main">
      <strong>${esc(p.name)}</strong>
      <span class="cell-sub">${esc(specialtyName(p.specialty))} · ${kind}</span>
    </div>
    <input class="input tl-tooth" placeholder="Dente / região" value="${esc(line.tooth||'')}">
    <button type="button" class="btn small icon-x" onclick="this.closest('.treat-line').remove();recalcTreatmentTotals()" title="Remover">×</button>
  </div>`;
}
function collectTreatmentLines(){
  return [...document.querySelectorAll('.treat-line')].map(row=>({
    procedureId:row.dataset.proc,
    qty:1,
    tooth:row.querySelector('.tl-tooth')?.value||''
  })).filter(x=>x.procedureId);
}
function addTreatmentLine(){
  const sel=document.getElementById('fAddProc');
  const id=sel?.value||'';
  if(!id) return toast('Escolha um procedimento para adicionar.');
  const box=document.getElementById('fTreatLines');
  if(!box) return;
  // Permite repetir o mesmo procedimento (ex.: plantio em dentes diferentes)
  box.insertAdjacentHTML('beforeend', treatmentLineRow({procedureId:id}));
  recalcTreatmentTotals();
}
function migratePatientLines(){
  let n=0;
  (state.patients||[]).forEach(p=>{
    if(!Array.isArray(p.lines) || !p.lines.length){
      if(p.procedureId){
        p.lines=[{procedureId:p.procedureId,qty:1,tooth:''}];
        n++;
      }
    }else if(!p.procedureId && p.lines[0]?.procedureId){
      p.procedureId=p.lines[0].procedureId;
      n++;
    }
  });
  return n;
}
function recalcTreatmentTotals(){
  const clinicId=getv('fClinic')||getv('rClinic')||'';
  const lines=collectTreatmentLines();
  const valueEl=document.getElementById('fValue')||document.getElementById('rValue');
  if(valueEl && clinicId){
    valueEl.value=String(Math.round(honorariumForLines(lines,clinicId)*100)/100);
  }
  const hint=document.getElementById('fHonorHint');
  if(hint){
    hint.textContent=lines.length
      ? `Composição: ${lines.length} procedimento(s) · honorário sugerido pela clínica.`
      : 'Adicione procedimentos para montar o tratamento.';
  }
  if(document.getElementById('fConsumeList')){
    fillConsumeFromLines(lines);
  }
}
function fillConsumeFromLines(lines){
  const bom=combinedProcedureMaterials(lines);
  const list=document.getElementById('fConsumeList');
  if(list){
    list.innerHTML=(bom.items.length?bom.items:[{}]).map(consumeRow).join('');
    refreshConsumeTotals();
  }
  const costEl=document.getElementById('fCost');
  const labEl=document.getElementById('fLab');
  const compEl=document.getElementById('fComponents');
  if(costEl) costEl.value=String(Math.round(bom.materials*100)/100);
  if(labEl) labEl.value=String(Math.round(bom.lab*100)/100);
  if(compEl) compEl.value=String(Math.round(bom.components*100)/100);
}
function procOptionsGrouped(selected=''){
  const groups={};
  state.procedures.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).forEach(p=>{
    const g=specialtyName(p.specialty||'clinica');
    if(!groups[g]) groups[g]=[];
    groups[g].push(p);
  });
  return Object.entries(groups).map(([g,arr])=>`<optgroup label="${esc(g)}">${arr.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)}${p.kind==='cirurgico'?' · cirúrgico':''}</option>`).join('')}</optgroup>`).join('');
}

function parsePackUnits(pack){
  const s=String(pack||'').toLowerCase();
  const m=s.match(/(\d+[.,]?\d*)\s*(un|unid|unidade|unidades|tubete|tubetes|par|pares|pct|pcts|envelope|envelopes|kit|kits|bolsa|bolsas|seringa|seringas|frasco|frascos|cx|caixa|caixas|g|ml|comp)?/);
  if(m){const n=Number(String(m[1]).replace(',','.')); return n>0?n:1;}
  return 1;
}
function unitCostFromPack(price,pack){
  const units=parsePackUnits(pack);
  return units>0?Math.round((Number(price||0)/units)*1000)/1000:Number(price||0);
}
function recalcAllUnitCosts(){
  let n=0;
  state.materials.forEach(m=>{
    const next=unitCostFromPack(m.price,m.pack);
    if(next>0 && Math.abs(next-Number(m.unitCost||0))>0.0005){m.unitCost=next;m.updated=todayISO();n++;}
  });
  save();renderAll();toast(n?`${n} custos unitários recalculados.`:'Nada a recalcular.');
}
function procedureMaterialsCost(procId){
  const p=procedure(procId);
  const materials=(p.items||[]).reduce((s,i)=>s+material(i.materialId).unitCost*Number(i.qty||0),0);
  return {materials:Math.round(materials*100)/100, lab:Number(p.extra||0), items:(p.items||[]).map(i=>({materialId:i.materialId,qty:Number(i.qty||0)}))};
}
const PROC_AI_RULES=[
  {match:/implante\s*\+\s*coroa|implante.*coroa/i, ids:['m1','m4','m5','m6','m7','m8','m16','m20']},
  {match:/implante.*enxerto|enxerto|levantamento|seio/i, ids:['m1','m3','m4','m5','m6','m15','m16','m85','m91']},
  {match:/implante/i, ids:['m1','m4','m5','m6','m16','m20','m11']},
  {match:/exodont|cirurg|extra[cç]/i, ids:['m4','m5','m16','m18','m19','m20','m102','m108','m127']},
  {match:/coroa|protético|ciment|faceta|pr[oó]tese/i, ids:['m7','m8','m26','m30','m31','m169']},
  {match:/protocolo/i, ids:['m1','m2','m4','m5','m6','m16','m56']},
  {match:/endo|tratament[o].*canal|obtura/i, ids:['m36','m189','m190','m205','m207','m214','m216','m217','m226']},
  {match:/restaura/i, ids:['m27','m28','m29','m37']},
];
function suggestMaterialsForProcedureName(name){
  const rule=PROC_AI_RULES.find(r=>r.match.test(String(name||'')));
  const ids=rule?rule.ids:[];
  return ids.filter(id=>state.materials.some(m=>m.id===id)).map(id=>({materialId:id,qty:1}));
}
function applySuggestedMaterialsToProcedureForm(){
  const name=getv('pName');
  const items=suggestMaterialsForProcedureName(name);
  if(!items.length) return toast('Não encontrei sugestão para este nome. Edite a ficha manualmente.');
  const box=document.getElementById('procItems');
  if(!box) return;
  box.innerHTML=items.map(procItemRow).join('');
  toast(`${items.length} materiais sugeridos — você pode editar.`);
}
function consumeRow(item={}){
  return `<div class="consume-row"><select class="select ci-mat">${materialSelect(item.materialId||'')}</select><input class="input ci-qty" type="number" min="0" step="0.01" value="${item.qty??1}" oninput="refreshConsumeTotals()"><input class="input ci-total" disabled value=""><button type="button" class="btn small icon-x" onclick="this.parentElement.remove();refreshConsumeTotals()">×</button></div>`;
}
function collectConsumeItems(){
  return [...document.querySelectorAll('.consume-row')].map(row=>({materialId:row.querySelector('.ci-mat')?.value,qty:Number(row.querySelector('.ci-qty')?.value||0)})).filter(x=>x.materialId&&x.qty>0);
}
function refreshConsumeTotals(){
  let materials=0, components=0;
  document.querySelectorAll('.consume-row').forEach(row=>{
    const id=row.querySelector('.ci-mat')?.value;
    const qty=Number(row.querySelector('.ci-qty')?.value||0);
    const m=material(id);
    const line=Number(m.unitCost||0)*qty;
    const totalEl=row.querySelector('.ci-total');
    if(totalEl) totalEl.value=brl.format(line);
    materials+=line;
    if(/componente|pilar|transfer|análogo|parafuso/i.test(String(m.type||'')+' '+String(m.name||''))) components+=line;
  });
  materials=Math.round(materials*100)/100;
  components=Math.round(components*100)/100;
  const pureMats=Math.round((materials-components)*100)/100;
  const costEl=document.getElementById('fCost');
  const compEl=document.getElementById('fComponents');
  if(costEl) costEl.value=pureMats;
  if(compEl && components>0) compEl.value=components;
  const tip=document.getElementById('fConsumeTotal');
  if(tip) tip.innerHTML=`Consumo calculado: <strong>${brl.format(materials)}</strong> (materiais ${brl.format(pureMats)} · componentes ${brl.format(components)})`;
}
function fillConsumeFromProcedure(procId){
  const box=document.getElementById('fConsumeList');
  if(!box) return;
  const data=procedureMaterialsCost(procId);
  const items=data.items.length?data.items:[{}];
  box.innerHTML=items.map(consumeRow).join('');
  const lab=document.getElementById('fLab');
  if(lab && !document.getElementById('fLab')?.dataset.locked) lab.value=data.lab;
  refreshConsumeTotals();
}
function applyStockConsumption(items, reverse=false){
  (items||[]).forEach(it=>{
    const m=state.materials.find(x=>x.id===it.materialId);
    if(!m) return;
    const q=Number(it.qty||0);
    m.stock=Math.max(0,Number(m.stock||0)+(reverse?q:-q));
  });
}
async function openPriceSyncModal(){
  const list=state.materials.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).slice(0,12);
  openModal('Assistente de preços',`<div class="empty">Consultando Dental Cremer, Dental Speed e Surya Dental…<br><small class="field-hint">Até ${list.length} materiais nesta rodada.</small></div>`,()=>closeModal());
  document.getElementById('modalSave').textContent='Fechar';
  document.getElementById('modalRoot')?.querySelector('.modal')?.classList.add('modal-wide');
  const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=ctrl?setTimeout(()=>ctrl.abort(),90000):null;
  try{
    const res=await fetch('api/price-sync.php',{method:'POST',headers:csrfHeaders({'Content-Type':'application/json','Accept':'application/json'}),credentials:'same-origin',signal:ctrl?.signal,body:JSON.stringify({materials:list.map(m=>({id:m.id,name:m.name,brand:m.brand,pack:m.pack,price:m.price})),csrf:csrfToken()})});
    const data=await res.json();
    applyCsrfFromResponse(data);
    if(!data.ok) throw new Error(data.error||'Falha na sincronização');
    const body=document.getElementById('modalBody');
    body.innerHTML=`<p class="field-hint">Selecione os preços sugeridos. O custo unitário é calculado pelo fracionamento da embalagem (ex.: 50 tubetes).</p>
      <div id="syncResults">${(data.results||[]).map(r=>{
        const units=parsePackUnits(r.pack);
        const best=r.bestPrice;
        const unit=best!=null?unitCostFromPack(best,r.pack):null;
        const offers=(r.offers||[]).map(o=>{
          let status;
          if(o.suggested!=null){
            status=brl.format(o.suggested)+(o.matchTitle?` · ${esc(o.matchTitle)}`:'');
          }else if(o.ok){
            status='sem resultado na busca';
          }else{
            status='indisponível'+(o.error?` (${esc(o.error)})`:'');
          }
          return `<div>${esc(o.supplier)}: ${status} · <a href="${esc(o.url||o.searchUrl||'#')}" target="_blank" rel="noopener">abrir busca</a></div>`;
        }).join('');
        return `<div class="sync-row" data-id="${esc(r.id)}">
          <div class="sync-row-head">
            <div><strong>${esc(r.name)}</strong><div class="cell-sub">${esc(r.brand||'—')} · embalagem ${esc(r.pack||'—')} (${units} un.) · atual ${brl.format(r.currentPrice||0)}</div></div>
            <label style="display:flex;gap:8px;align-items:center;font-size:12px"><input type="checkbox" class="sync-check" ${best!=null?'checked':''} ${best==null?'disabled':''}> aplicar</label>
          </div>
          <div class="form-grid" style="margin-top:8px">
            <div class="field"><label>Preço embalagem sugerido</label><input class="input sync-price" type="number" step="0.01" value="${best??''}"></div>
            <div class="field"><label>Custo unitário fracionado</label><input class="input sync-unit" type="number" step="0.001" value="${unit??''}"></div>
          </div>
          <div class="sync-offers">${offers||'<div>Sem ofertas retornadas — use os links para conferir.</div>'}</div>
        </div>`;
      }).join('')}</div>`;
    body.querySelectorAll('.sync-row').forEach(row=>{
      const price=row.querySelector('.sync-price');
      const unit=row.querySelector('.sync-unit');
      const pack=state.materials.find(m=>m.id===row.dataset.id)?.pack||'';
      price?.addEventListener('input',()=>{if(unit) unit.value=unitCostFromPack(Number(price.value||0),pack);});
    });
    document.getElementById('modalSave').textContent='Aplicar selecionados';
    document.getElementById('modalSave').onclick=()=>{
      let n=0;
      body.querySelectorAll('.sync-row').forEach(row=>{
        if(!row.querySelector('.sync-check')?.checked) return;
        const id=row.dataset.id;
        const m=state.materials.find(x=>x.id===id);
        if(!m) return;
        m.price=Number(row.querySelector('.sync-price')?.value||m.price||0);
        m.unitCost=Number(row.querySelector('.sync-unit')?.value||unitCostFromPack(m.price,m.pack));
        m.supplier=m.supplier||'Sincronizado';
        m.updated=todayISO();
        n++;
      });
      save();closeModal();renderAll();toast(n?`${n} materiais atualizados.`:'Nenhum item selecionado.');
    };
  }catch(err){
    const msg=err?.name==='AbortError'?'A consulta demorou demais — tente com menos materiais ou abra as buscas manuais.':(err.message||'Não foi possível sincronizar agora.');
    document.getElementById('modalBody').innerHTML=`<div class="empty">${esc(msg)}<br><br>Você ainda pode abrir as buscas manualmente e recalcular o fracionamento.</div>
      <div class="row-actions" style="margin-top:12px">
        <a class="btn" target="_blank" rel="noopener" href="https://www.dentalcremer.com.br/">Dental Cremer</a>
        <a class="btn" target="_blank" rel="noopener" href="https://www.dentalspeed.com/">Dental Speed</a>
        <a class="btn" target="_blank" rel="noopener" href="https://www.suryadental.com.br/">Surya Dental</a>
        <button class="btn primary" onclick="recalcAllUnitCosts();closeModal()">Recalcular fracionados</button>
      </div>`;
    document.getElementById('modalSave').textContent='Fechar';
    document.getElementById('modalSave').onclick=()=>closeModal();
  }finally{
    if(timer) clearTimeout(timer);
  }
}


function monthKey(iso){return String(iso||'').slice(0,7)}
function monthLabel(key){
  const [y,m]=String(key).split('-');
  const names=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${names[Number(m)-1]||m}/${String(y).slice(2)}`;
}
function periodDays(){return Number(document.getElementById('periodSelect')?.value||90)}
function inPeriod(iso){
  if(!iso) return false;
  const d=new Date(iso+'T12:00:00');
  const cut=new Date(); cut.setDate(cut.getDate()-periodDays());
  return d>=cut;
}
function monthlySeries(count=6){
  const keys=[]; const now=new Date();
  for(let i=count-1;i>=0;i--){
    const d=new Date(now.getFullYear(), now.getMonth()-i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  return keys.map(k=>{
    const pts=state.patients.filter(p=>monthKey(p.date)===k);
    const revenue=pts.reduce((s,p)=>s+Number(p.received||0),0);
    const billed=pts.reduce((s,p)=>s+Number(p.value||0),0);
    const cost=pts.reduce((s,p)=>s+patientCost(p),0);
    const overhead=state.costs.filter(c=>monthKey(c.date)===k).reduce((s,c)=>s+Number(c.value||0),0);
    return {key:k,label:monthLabel(k),revenue,billed,cost,overhead,profit:revenue-cost,cases:pts.length};
  });
}
function renderDashboard(){
  const patients=state.patients.filter(p=>inPeriod(p.date));
  const costsPeriod=state.costs.filter(c=>inPeriod(c.date));
  const fat=patients.reduce((s,p)=>s+Number(p.value||0),0);
  const rec=patients.reduce((s,p)=>s+Number(p.received||0),0);
  const receber=patients.reduce((s,p)=>s+balance(p),0);
  const custos=patients.reduce((s,p)=>s+patientCost(p),0)+costsPeriod.reduce((s,c)=>s+Number(c.value||0),0);
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
  document.getElementById('heroMargin').textContent='Margem '+margem+'% · período selecionado';
  document.getElementById('kpiVencidos').textContent=`${overdue.length} vencido${overdue.length===1?'':'s'}`;
  document.getElementById('badgeReceber').textContent=overdue.length;

  const months=monthlySeries(periodDays()>=300?12:periodDays()>=150?8:6);
  const maxY=Math.max(1,...months.flatMap(m=>[m.profit,m.cost,m.overhead+m.cost]));
  const chart=document.getElementById('chartMonthly');
  if(chart){
    chart.innerHTML=months.map(m=>{
      const costTotal=m.cost+m.overhead;
      const ph=Math.max(4,Math.round((Math.max(0,m.profit)/maxY)*132));
      const ch=Math.max(4,Math.round((costTotal/maxY)*132));
      return `<div class="chart-col" title="${esc(m.label)}: lucro ${brl.format(m.profit)} · custos ${brl.format(costTotal)}">
        <div class="chart-bars"><span class="chart-bar profit" style="height:${ph}px"></span><span class="chart-bar cost" style="height:${ch}px"></span></div>
        <small>${esc(m.label)}</small>
      </div>`;
    }).join('');
  }
  const cash=document.getElementById('chartCash');
  if(cash){
    const open=receber, done=rec, total=Math.max(1,done+open);
    cash.innerHTML=`<div class="cash-meter">
      <div class="cash-row"><div><span>Recebido</span><strong>${brl.format(done)}</strong></div><div class="progress"><span style="width:${(done/total)*100}%"></span></div></div>
      <div class="cash-row"><div><span>A receber</span><strong>${brl.format(open)}</strong></div><div class="progress"><span style="width:${(open/total)*100}%;background:#b34c48"></span></div></div>
      <div class="cash-row"><div><span>Custos no período</span><strong>${brl.format(custos)}</strong></div><div class="progress"><span style="width:${Math.min(100,(custos/Math.max(total,1))*100)}%;background:#5c6662"></span></div></div>
    </div>`;
  }
  const top=document.getElementById('chartTopProcs');
  if(top){
    const map={};
    patients.forEach(p=>{
      const lines=patientLines(p);
      const share=lines.length?patientProfit(p)/lines.length:patientProfit(p);
      (lines.length?lines:[{procedureId:p.procedureId}]).forEach(l=>{
        const name=procedure(l.procedureId).name;
        if(!map[name]) map[name]={name,profit:0,cases:0};
        map[name].profit+=share; map[name].cases+=1;
      });
    });
    const rows=Object.values(map).sort((a,b)=>b.profit-a.profit).slice(0,5);
    const maxP=Math.max(1,...rows.map(r=>Math.abs(r.profit)));
    top.innerHTML=rows.length?rows.map(r=>`
      <div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px"><span>${esc(r.name)} · ${r.cases} caso(s)</span><strong>${brl.format(r.profit)}</strong></div><div class="progress"><span style="width:${Math.max(6,Math.abs(r.profit)/maxP*100)}%"></span></div></div>`).join(''):'<div class="empty">Sem lançamentos no período.</div>';
  }

  const attention=[];
  if(getSetting('alertOverdue')) overdue.slice(0,3).forEach(p=>attention.push({kind:'red',title:`Cobrança vencida · ${p.name}`,sub:`${clinic(p.clinicId).name} · venceu ${fmtDate(p.due)}`,value:brl.format(balance(p))}));
  if(getSetting('alertStock')) state.materials.filter(m=>Number(m.stock)<=Number(m.min)).slice(0,3).forEach(m=>attention.push({kind:'amber',title:`Estoque mínimo · ${m.name}`,sub:`Saldo ${m.stock} · mínimo ${m.min}`,value:m.brand}));
  (state.reminders||[]).filter(r=>!r.done && r.date && r.date<=todayISO()).slice(0,3).forEach(r=>attention.push({kind:'blue',title:`Lembrete · ${r.title}`,sub:`${fmtDate(r.date)}${r.time?' · '+r.time:''}`,value:r.type||'Agenda'}));
  document.getElementById('attentionCount').textContent=`${attention.length} itens`;
  document.getElementById('attentionList').innerHTML=attention.length?attention.map(a=>`
    <div class="list-item"><span class="dot ${a.kind}"></span><div class="list-main"><strong>${esc(a.title)}</strong><span>${esc(a.sub)}</span></div><div class="list-value">${esc(a.value)}</div></div>`).join(''):'<div class="empty">Nenhuma pendência crítica.</div>';

  const clinicSummary=state.clinics.map(c=>{
    const arr=patients.filter(p=>p.clinicId===c.id);
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

  document.getElementById('dashboardPatients').innerHTML=[...patients].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(p=>`
    <tr>${td('Paciente',`<strong>${esc(p.name)}</strong><span class="cell-sub">${fmtDate(p.date)}</span>`)}${td('Origem',esc(clinic(p.clinicId).name))}${td('Tratamento',esc(patientProcedureLabel(p)))}${td('Financeiro',badge(p.status))}${td('Resultado',`<strong>${brl.format(patientProfit(p))}</strong>`)}</tr>
  `).join('')||'<tr><td colspan="5"><div class="empty">Sem lançamentos no período.</div></td></tr>';

  const costCats={};
  costsPeriod.forEach(c=>costCats[c.type]=(costCats[c.type]||0)+Number(c.value||0));
  patients.forEach(p=>{
    costCats['Materiais casos']=(costCats['Materiais casos']||0)+Number(p.cost||0);
    costCats['Laboratório casos']=(costCats['Laboratório casos']||0)+Number(p.lab||0);
  });
  const max=Math.max(1,...Object.values(costCats));
  document.getElementById('costDistribution').innerHTML=Object.entries(costCats).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`
    <div style="margin-bottom:13px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px"><span>${esc(k)}</span><strong>${brl.format(v)}</strong></div><div class="progress"><span style="width:${(v/max)*100}%"></span></div></div>`).join('')||'<div class="empty">Sem custos no período.</div>';
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
  const rows=state.patients.filter(p=>(!q||p.name.toLowerCase().includes(q)||patientProcedureSearchText(p).toLowerCase().includes(q))&&(!cf||p.clinicId===cf)&&(!sf||p.status===sf));
  document.getElementById('patientsTable').innerHTML=rows.map(p=>`
    <tr>
      ${td('Paciente',`<strong>${esc(p.name)}</strong><span class="cell-sub">${esc(p.origin)}${p.progress==='Orçamento'?' · Orçamento':''}</span>`)}
      ${td('Clínica',esc(clinic(p.clinicId).name))}${td('Tratamento',`<strong>${esc(patientProcedureLabel(p))}</strong><span class="cell-sub">${patientLines(p).length} item(ns)</span>`)}${td('Data',fmtDate(p.date))}
      ${td('Valor',brl.format(p.value))}${td('Custos',brl.format(patientCost(p)))}${td('Lucro',`<strong>${brl.format(patientProfit(p))}</strong>`)}
      ${td('Status',badge(p.status))}<td class="actions-cell">${acts(`editPatient('${p.id}')`,`deletePatient('${p.id}')`)}</td>
    </tr>`).join('')||'<tr><td colspan="9"><div class="empty">Nenhum paciente encontrado.</div></td></tr>';
}
function renderClinics(){
  document.getElementById('clinicsGrid').innerHTML=state.clinics.map(c=>{
    const arr=state.patients.filter(p=>p.clinicId===c.id), revenue=arr.reduce((s,p)=>s+Number(p.value||0),0), costs=arr.reduce((s,p)=>s+patientCost(p),0);
    return `<div class="card clinic-card">
      <div class="clinic-top"><div class="clinic-logo">${esc(c.color)}</div><div><div class="clinic-name">${esc(c.name)}</div><div class="clinic-sub">${esc(c.type)}</div></div><div style="margin-left:auto">${badge(pct(revenue-costs,revenue)+'% margem')}</div></div>
      <div class="clinic-stats"><div class="clinic-stat"><small>Casos</small><strong>${arr.length}</strong></div><div class="clinic-stat"><small>Receita</small><strong>${brl.format(revenue)}</strong></div><div class="clinic-stat"><small>Resultado</small><strong>${brl.format(revenue-costs)}</strong></div></div>
      <div style="margin-top:14px;padding-top:13px;border-top:1px solid var(--line);font-size:10px;color:var(--muted)">Regra financeira<br><strong style="display:block;color:var(--text);font-size:11px;margin-top:4px">${esc(c.rule)}</strong></div>
      <div class="row-actions"><button class="btn small" onclick="openClinicModal('${c.id}')">Editar</button><button class="btn small danger" onclick="deleteClinic('${c.id}')">Excluir</button></div>
    </div>`;
  }).join('');
}
function procedureCost(p){return (p.items||[]).reduce((s,i)=>s+material(i.materialId).unitCost*Number(i.qty||0),0)+Number(p.extra||0)}
function renderProcedures(){
  const specSel=document.getElementById('procSpecialtyFilter');
  if(specSel && specSel.options.length<=1){
    specSel.innerHTML='<option value="">Todas as especialidades</option>'+DENTAL_PROCEDURE_SPECIALTIES.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  }
  const q=(document.getElementById('procSearch')?.value||'').toLowerCase();
  const sf=document.getElementById('procSpecialtyFilter')?.value||'';
  const kf=document.getElementById('procKindFilter')?.value||'';
  const rows=state.procedures.filter(p=>{
    if(q && !`${p.name} ${specialtyName(p.specialty)}`.toLowerCase().includes(q)) return false;
    if(sf && p.specialty!==sf) return false;
    if(kf && (p.kind||'clinico')!==kf) return false;
    return true;
  }).slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  document.getElementById('proceduresTable').innerHTML=rows.map(p=>{
    const cost=procedureCost(p), m=pct(p.price-cost,p.price);
    const kind=p.kind==='cirurgico'?'Cirúrgico':'Clínico';
    return `<tr>${td('Procedimento',`<strong>${esc(p.name)}</strong><span class="cell-sub">${esc(specialtyName(p.specialty))} · ${kind}</span>`)}${td('Preço',brl.format(p.price))}${td('Custo',brl.format(cost))}${td('Margem',badge(m+'%'))}<td class="actions-cell"><div class="row-actions"><button class="btn small" onclick="showCostSheet('${p.id}')">Ficha</button><button class="btn small" onclick="openProcedureModal('${p.id}')">Editar</button><button class="btn small danger" onclick="deleteProcedure('${p.id}')">Excluir</button></div></td></tr>`;
  }).join('')||'<tr><td colspan="5"><div class="empty">Nenhum procedimento neste filtro.</div></td></tr>';
}
function showCostSheet(id){
  const p=procedure(id);
  document.getElementById('costSheetTitle').textContent=p.name;
  const cost=procedureCost(p);
  const clinicRows=(p.clinicPrices||[]).map(row=>{
    const r=normalizeClinicPrice(row,p.price||0);
    const mode=r.receiveMode==='percent'?`Porcentagem · ${r.receivePercent}%`:'Valor fechado';
    return `<div class="cost-row"><div>${esc(clinic(r.clinicId).name)}</div><div>${brl.format(r.practicedValue)}</div><div>${esc(mode)}</div><div><strong>${brl.format(honorariumFromPrice(r))}</strong></div></div>`;
  }).join('')||'<div class="empty">Nenhuma clínica configurada. Edite o procedimento para definir valores.</div>';
  document.getElementById('costSheet').innerHTML=`
    <div class="cost-sheet">
      <div class="cost-row header"><div>Item</div><div>Qtd.</div><div>Unitário</div><div>Total</div></div>
      ${p.items?.length?p.items.map(i=>{const m=material(i.materialId); return `<div class="cost-row"><div>${esc(m.name)}</div><div>${i.qty}</div><div>${brl.format(m.unitCost)}</div><div><strong>${brl.format(m.unitCost*i.qty)}</strong></div></div>`}).join(''):'<div class="empty">Nenhum material nesta ficha. Edite o procedimento para incluir.</div>'}
      <div class="cost-row"><div>Laboratório / custos adicionais</div><div>1</div><div>${brl.format(p.extra)}</div><div><strong>${brl.format(p.extra)}</strong></div></div>
    </div>
    <div class="summary-bar"><div><small>Preço base</small><strong>${brl.format(p.price)}</strong></div><div><small>Custo previsto</small><strong>${brl.format(cost)}</strong></div><div><small>Lucro projetado</small><strong>${brl.format(p.price-cost)}</strong></div><div><small>Margem</small><strong>${pct(p.price-cost,p.price)}%</strong></div></div>
    <h4 class="sheet-subtitle">Valores por clínica</h4>
    <div class="cost-sheet">
      <div class="cost-row header"><div>Clínica</div><div>Praticado</div><div>Recebimento</div><div>Você recebe</div></div>
      ${clinicRows}
    </div>
    <div class="row-actions" style="margin-top:12px"><button class="btn small" onclick="openProcedureModal('${id}')">Editar procedimento</button></div>`;
}
function renderService(){
  const tabs=document.getElementById('serviceClinicTabs');
  if(tabs){
    const partnerClinics=state.clinics.filter(c=>c.id!=='particular' && c.type!=='Próprio');
    const list=[{id:'',name:'Todas'},...partnerClinics.map(c=>({id:c.id,name:c.name}))];
    tabs.innerHTML=list.map(c=>`<button type="button" class="subtab ${serviceClinicFilter===c.id?'active':''}" data-clinic="${esc(c.id)}" onclick="setServiceClinicFilter('${c.id}')">${esc(c.name)}</button>`).join('');
  }
  const arr=state.patients.filter(p=>p.origin==='Prestação' && (!serviceClinicFilter || p.clinicId===serviceClinicFilter));
  const total=arr.reduce((s,p)=>s+Number(p.value||0),0), rec=arr.reduce((s,p)=>s+Number(p.received||0),0), open=arr.reduce((s,p)=>s+balance(p),0), od=arr.filter(isOverdue).reduce((s,p)=>s+balance(p),0);
  document.getElementById('svcTotal').textContent=brl.format(total);document.getElementById('svcReceived').textContent=brl.format(rec);document.getElementById('svcOpen').textContent=brl.format(open);document.getElementById('svcOverdue').textContent=brl.format(od);
  document.getElementById('serviceTable').innerHTML=arr.map(p=>`<tr>${td('Paciente',`<strong>${esc(p.name)}</strong><span class="cell-sub">${p.progress==='Orçamento'?'Orçamento':esc(p.progress||'')}</span>`)}${td('Clínica',esc(clinic(p.clinicId).name))}${td('Tratamento',`<strong>${esc(patientProcedureLabel(p))}</strong><span class="cell-sub">${patientLines(p).length} procedimento(s)</span>`)}${td('Honorário',brl.format(p.value))}${td('Recebido',brl.format(p.received))}${td('Vencimento',fmtDate(p.due))}${td('Status',badge(isOverdue(p)?'À receber':p.status))}<td class="actions-cell"><div class="row-actions"><button class="btn small" onclick="markReceived('${p.id}')">Receber</button><button class="btn small" onclick="editPatient('${p.id}')">Editar</button><button class="btn small danger" onclick="deletePatient('${p.id}')">Excluir</button></div></td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">Nenhum lançamento nesta clínica.</div></td></tr>';
}
function setServiceClinicFilter(id){
  serviceClinicFilter=id||'';
  renderService();
}
function renderPrivate(){
  const arr=state.patients.filter(p=>p.clinicId==='particular'||p.origin==='Particular');
  document.getElementById('privateTable').innerHTML=arr.map(p=>`<tr>${td('Paciente',`<strong>${esc(p.name)}</strong>`)}${td('Tratamento',`<strong>${esc(patientProcedureLabel(p))}</strong><span class="cell-sub">${patientLines(p).length} item(ns)</span>`)}${td('Contratado',brl.format(p.value))}${td('Recebido',brl.format(p.received))}${td('Lab',brl.format(p.lab||0))}${td('Componentes',brl.format(p.components||0))}${td('Clínica',brl.format(p.clinical||0))}${td('Lucro',`<strong>${brl.format(patientProfit(p))}</strong>`)}${td('Progresso',badge(p.progress))}<td class="actions-cell">${acts(`editPatient('${p.id}')`,`deletePatient('${p.id}')`)}</td></tr>`).join('')||'<tr><td colspan="10"><div class="empty">Sem casos particulares.</div></td></tr>';
}
const PROSTH_STAGES=['Entrada','Laboratório','Prova','Pronto / entrega','Instalado'];
const LAB_STATUS=['Aguardando envio','Enviado ao laboratório','Em produção','Recebido — aguardando agendamento','Prova / ajustes','Retornado ao laboratório','Entregue / instalado'];

function patientById(id){return state.patients.find(x=>x.id===id)||{name:'Paciente não encontrado',id:''}}
function initials(name){return String(name||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function prosthLate(w){return Number(w.stage)<4 && w.due && w.due<todayISO()}
function prosthDeadlineBadge(w){
  if(Number(w.stage)===4) return '<span class="badge b-green">Concluído</span>';
  return prosthLate(w)?'<span class="badge b-red">Atrasado</span>':'<span class="badge b-green">No prazo</span>';
}
function prosthStageBadge(w){return badge(PROSTH_STAGES[Number(w.stage)]||'Etapa')}
function nextProsthCode(){
  const n=state.prostheses.map(w=>Number(String(w.code||'').replace(/\D/g,''))||0);
  return 'GR'+String(Math.max(0,...n)+1).padStart(4,'0');
}
function ensureProstheses(){
  if(!Array.isArray(state.prostheses)) state.prostheses=[];
  if(state.prostheses.length) return;
  const map={'Moldagem':0,'Enviado para Laboratório':1,'Aguardando Prova':2,'Aguardando Cimentação':3,'Alta':4};
  state.patients.filter(p=>map[p.progress]!=null || Number(p.lab)>0).forEach((p,i)=>{
    const stage=map[p.progress]??1;
    state.prostheses.push({
      id:uid(),code:'GR'+String(i+1).padStart(4,'0'),patientId:p.id,type:procedure(p.procedureId).name,tooth:'',lab:'Laboratório',
      cost:Number(p.lab||0),stage,labStatus:LAB_STATUS[Math.min(stage,LAB_STATUS.length-1)],entry:p.date,due:p.due||addDays(10),urgent:false,shade:'',notes:'',
      events:[{date:p.date||todayISO(),stage,note:'Importado do progresso clínico'}]
    });
  });
}
function filteredProstheses(){
  const q=(document.getElementById('prosthSearch')?.value||'').toLowerCase();
  const f=document.getElementById('prosthFilter')?.value||'all';
  return state.prostheses.filter(w=>{
    const pat=patientById(w.patientId);
    const hay=[pat.name,w.code,w.type,w.lab,w.tooth,w.shade].some(v=>String(v||'').toLowerCase().includes(q));
    const ok=f==='all'||f==='active'&&w.stage<4||f==='late'&&prosthLate(w)||f==='urgent'&&w.urgent||String(w.stage)===f;
    return hay&&ok;
  }).sort((a,b)=>(Number(b.urgent)-Number(a.urgent))||(Number(prosthLate(b))-Number(prosthLate(a)))||String(a.due).localeCompare(String(b.due)));
}
function renderTrabalhos(){
  const list=state.prostheses;
  const active=list.filter(w=>w.stage<4);
  document.getElementById('prosthActive').textContent=active.length;
  document.getElementById('prosthLab').textContent=list.filter(w=>w.stage===1).length;
  document.getElementById('prosthLate').textContent=active.filter(prosthLate).length;
  document.getElementById('prosthUrgent').textContent=active.filter(w=>w.urgent).length;
  const badgeEl=document.getElementById('badgeProtese');
  if(badgeEl) badgeEl.textContent=active.length;
  const rows=filteredProstheses();
  document.getElementById('prosthTable').innerHTML=rows.map(w=>{
    const pat=patientById(w.patientId);
    return `<tr class="${w.urgent?'urgent-row':''}">
      ${td('Paciente',`<button class="row-link" onclick="openProsthesisDetail('${w.id}')"><strong>${esc(pat.name)}</strong><span>${esc(w.code)} · ${esc(w.type)}${w.tooth?' · '+esc(w.tooth):''}</span></button>${w.urgent?' <span class="badge b-red">Urgente</span>':''}`)}
      ${td('Laboratório',`${esc(w.lab||'—')}<div class="cell-sub">${Number(w.cost)>0?brl.format(w.cost):'Custo não informado'}</div>`)}
      ${td('Previsão',fmtDate(w.due))}
      ${td('Prazo',prosthDeadlineBadge(w))}
      ${td('Etapa',`${prosthStageBadge(w)}<div class="cell-sub">${esc(w.labStatus||'')}</div>`)}
      <td class="actions-cell"><div class="row-actions"><button class="btn small" onclick="openProsthesisDetail('${w.id}')">Abrir</button><button class="btn small" onclick="openProsthesisModal('${w.id}')">Editar</button><button class="btn small danger" onclick="deleteProsthesis('${w.id}')">Excluir</button></div></td>
    </tr>`;
  }).join('')||'<tr><td colspan="6"><div class="empty">Nenhum trabalho protético encontrado.</div></td></tr>';
}
function renderLab(){
  document.getElementById('labColumns').innerHTML=PROSTH_STAGES.map((stage,i)=>{
    const arr=state.prostheses.filter(w=>Number(w.stage)===i);
    return `<div class="card"><div class="card-head"><h3>${stage}</h3><div class="right"><span class="badge b-gray">${arr.length}</span></div></div><div class="card-body list">${arr.length?arr.map(w=>{
      const pat=patientById(w.patientId);
      return `<button class="list-item kanban-item" onclick="openProsthesisDetail('${w.id}')"><div class="avatar">${esc(initials(pat.name))}</div><div class="list-main"><strong>${esc(pat.name)}</strong><span>${esc(w.type)} · ${esc(w.lab||'Lab')}</span></div><div class="list-value">${prosthLate(w)?'<span class="badge b-red">Atraso</span>':fmtDate(w.due)}</div></button>`;
    }).join(''):'<div class="empty">Nenhum trabalho.</div>'}</div></div>`;
  }).join('');
}
function renderEntregas(){
  const limit=addDays(14);
  const rows=state.prostheses.filter(w=>w.stage<4 && w.due && w.due<=limit).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
  document.getElementById('entregasTable').innerHTML=rows.map(w=>{
    const pat=patientById(w.patientId);
    return `<tr>${td('Quando',fmtDate(w.due))}${td('Paciente',`<strong>${esc(pat.name)}</strong>`)}${td('Trabalho',`${esc(w.type)}<div class="cell-sub">${esc(w.code)}</div>`)}${td('Laboratório',esc(w.lab||'—'))}${td('Etapa',prosthStageBadge(w))}${td('Prazo',prosthDeadlineBadge(w))}<td class="actions-cell"><div class="row-actions"><button class="btn small" onclick="openProsthesisDetail('${w.id}')">Abrir</button><button class="btn small danger" onclick="deleteProsthesis('${w.id}')">Excluir</button></div></td></tr>`;
  }).join('')||'<tr><td colspan="7"><div class="empty">Nenhuma entrega ou prova nos próximos 14 dias.</div></td></tr>';
}
function renderTimeline(){
  const events=state.prostheses.flatMap(w=>(w.events||[]).map(e=>({...e,w}))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  document.getElementById('prosthTimeline').innerHTML=events.length?`<div class="timeline">${events.map(e=>{
    const pat=patientById(e.w.patientId);
    return `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(pat.name)} · ${esc(e.w.type)}</strong><span>${fmtDate(e.date)} · ${esc(PROSTH_STAGES[e.stage]||'Movimentação')} · ${esc(e.w.code)}</span><p>${esc(e.note||'Etapa atualizada')}</p></div></div>`;
  }).join('')}</div>`:'<div class="empty">Ainda não há movimentações registradas.</div>';
}
function lookupProsthesis(){
  const raw=(document.getElementById('lookupCode')?.value||'').trim().toUpperCase();
  const box=document.getElementById('lookupResult');
  if(!raw){box.innerHTML='<div class="empty">Informe um código.</div>';return;}
  const w=state.prostheses.find(x=>String(x.code).toUpperCase()===raw||x.id===raw);
  if(!w){box.innerHTML='<div class="empty">Código não encontrado.</div>';return;}
  const pat=patientById(w.patientId);
  box.innerHTML=`<div class="lookup-card"><strong>${esc(pat.name)}</strong><span class="code">${esc(w.code)}</span><p>${esc(w.type)} · ${esc(w.lab||'Lab')} · ${esc(PROSTH_STAGES[w.stage])}</p><p>Previsão ${fmtDate(w.due)} · ${esc(w.labStatus||'')}</p><button class="btn primary" onclick="openProsthesisDetail('${w.id}')">Abrir ficha</button></div>`;
}
function openProsthesisModal(editId=''){
  if(!state.patients.length){toast('Cadastre um paciente antes.');return;}
  const w=state.prostheses.find(x=>x.id===editId)||{};
  openModal(editId?'Editar trabalho protético':'Novo trabalho protético',`
    <div class="form-grid">
      <div class="field full"><label>Paciente</label><select id="wPatient" class="select">${state.patients.map(p=>`<option value="${p.id}" ${p.id===(w.patientId||'')?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Tipo de trabalho</label><input id="wType" class="input" value="${esc(w.type||'')}" placeholder="Ex.: Coroa sobre implante"></div>
      <div class="field"><label>Dente / região</label><input id="wTooth" class="input" value="${esc(w.tooth||'')}" placeholder="Ex.: 16 ou arcada superior"></div>
      <div class="field"><label>Laboratório</label><input id="wLab" class="input" value="${esc(w.lab||'')}" placeholder="Nome do laboratório"></div>
      <div class="field"><label>Custo do laboratório (R$)</label><input id="wCost" type="number" step="0.01" class="input" value="${w.cost??''}"></div>
      <div class="field"><label>Cor / escala</label><input id="wShade" class="input" value="${esc(w.shade||'')}" placeholder="Ex.: A2"></div>
      <div class="field"><label>Etapa atual</label><select id="wStage" class="select">${PROSTH_STAGES.map((s,i)=>`<option value="${i}" ${Number(w.stage)===i?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Status laboratorial</label><select id="wLabStatus" class="select">${LAB_STATUS.map(s=>`<option ${s===(w.labStatus||'Aguardando envio')?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Início</label><input id="wEntry" type="date" class="input" value="${w.entry||todayISO()}"></div>
      <div class="field"><label>Previsão de entrega</label><input id="wDue" type="date" class="input" value="${w.due||addDays(14)}"></div>
      <div class="field full"><label class="check-row"><input type="checkbox" id="wUrgent" ${w.urgent?'checked':''}> <strong>URGENTE</strong> — prioriza este trabalho</label></div>
      <div class="field full"><label>Observações</label><textarea id="wNotes" class="textarea" rows="3">${esc(w.notes||'')}</textarea></div>
    </div>`,()=>{
      if(!getv('wType')) return toast('Informe o tipo de trabalho.');
      if(!getv('wLab')) return toast('Informe o laboratório.');
      const stage=Number(getv('wStage')||0);
      if(editId){
        const found=state.prostheses.find(x=>x.id===editId); if(!found)return;
        Object.assign(found,{patientId:getv('wPatient'),type:getv('wType'),tooth:getv('wTooth'),lab:getv('wLab'),cost:num('wCost'),shade:getv('wShade'),stage,labStatus:getv('wLabStatus'),entry:getv('wEntry'),due:getv('wDue'),urgent:document.getElementById('wUrgent').checked,notes:getv('wNotes')});
      }else{
        state.prostheses.unshift({id:uid(),code:nextProsthCode(),patientId:getv('wPatient'),type:getv('wType'),tooth:getv('wTooth'),lab:getv('wLab'),cost:num('wCost'),shade:getv('wShade'),stage,labStatus:getv('wLabStatus'),entry:getv('wEntry'),due:getv('wDue'),urgent:document.getElementById('wUrgent').checked,notes:getv('wNotes'),events:[{date:getv('wEntry')||todayISO(),stage,note:'Trabalho cadastrado'}]});
      }
      save();closeModal();renderAll();toast('Trabalho protético salvo.');
    });
}
function openProsthesisDetail(id){
  const w=state.prostheses.find(x=>x.id===id); if(!w)return;
  const pat=patientById(w.patientId);
  const flow=PROSTH_STAGES.map((s,i)=>`<div class="workflow-step ${Number(w.stage)===i?'current':''} ${i<Number(w.stage)?'done':''}"><span>${i+1}</span><div><strong>${s}</strong></div></div>`).join('');
  const hist=(w.events||[]).slice().reverse().map(e=>`<div class="detail-event"><span class="event-dot"></span><div><strong>${esc(PROSTH_STAGES[e.stage]||'Movimentação')}</strong><p>${fmtDate(e.date)}${e.note?' · '+esc(e.note):''}</p></div></div>`).join('');
  openModal('Ficha do trabalho',`
    <div class="detail-top"><div><h3 style="margin:0 0 4px">${esc(pat.name)}</h3><span class="code">${esc(w.code)}</span> ${w.urgent?'<span class="badge b-red">Urgente</span>':''} ${prosthDeadlineBadge(w)}</div></div>
    <div class="detail-grid">${[['Tipo',w.type],['Dente / região',w.tooth||'—'],['Laboratório',w.lab||'—'],['Cor',w.shade||'—'],['Custo',Number(w.cost)?brl.format(w.cost):'—'],['Etapa',PROSTH_STAGES[w.stage]],['Status lab',w.labStatus||'—'],['Previsão',fmtDate(w.due)]].map(([k,v])=>`<div><span>${k}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
    ${prosthLate(w)?'<div class="warning-banner">Este trabalho está atrasado. A previsão foi ultrapassada e o caso ainda não foi instalado.</div>':''}
    <h3 class="section-title">Fluxo protético</h3><div class="workflow-stepper">${flow}</div>
    ${w.notes?`<h3 class="section-title">Observações</h3><p class="note-text">${esc(w.notes)}</p>`:''}
    <h3 class="section-title">Histórico</h3><div class="detail-timeline">${hist||'<div class="empty">Sem movimentações.</div>'}</div>
    <div class="form-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
      <button class="btn" onclick="closeModal();openProsthesisModal('${w.id}')">Editar</button>
      <button class="btn primary" onclick="closeModal();openAdvanceProsthesis('${w.id}')">Registrar evolução</button>
      <button class="btn danger" onclick="closeModal();deleteProsthesis('${w.id}')">Excluir</button>
    </div>`,()=>closeModal());
  document.getElementById('modalSave').style.display='none';
}
function openAdvanceProsthesis(id){
  const w=state.prostheses.find(x=>x.id===id); if(!w)return;
  const next=Math.min(4,Number(w.stage)+1);
  openModal('Registrar evolução',`
    <div class="form-grid">
      <div class="field full"><label>Próxima etapa</label><select id="aStage" class="select">${PROSTH_STAGES.map((s,i)=>`<option value="${i}" ${i===next?'selected':''}>${i===Number(w.stage)?'Manter em · ':''}${s}</option>`).join('')}</select></div>
      <div class="field full"><label>Status laboratorial</label><select id="aLabStatus" class="select">${LAB_STATUS.map(s=>`<option ${s===w.labStatus?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Data</label><input id="aDate" type="date" class="input" value="${todayISO()}"></div>
      <div class="field full"><label>Observação</label><textarea id="aNote" class="textarea" rows="3" placeholder="Ex.: prova insatisfatória, alterar cor, retornar ao laboratório..."></textarea></div>
    </div>`,()=>{
      const stage=Number(getv('aStage')||0);
      w.stage=stage; w.labStatus=getv('aLabStatus');
      if(stage===4) w.labStatus='Entregue / instalado';
      w.events=w.events||[]; w.events.push({date:getv('aDate')||todayISO(),stage,note:getv('aNote')||'Etapa atualizada'});
      save();closeModal();renderAll();openProsthesisDetail(id);toast('Movimentação registrada.');
    });
}
function setReceivableFilter(v,btn){
  receivableFilter=v;
  document.querySelectorAll('#page-recebiveis .filter-chip').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderReceivables();
}
function renderReceivables(){
  const arr=state.patients.filter(p=>!receivableFilter||p.status===receivableFilter);
  document.getElementById('receivablesTable').innerHTML=arr.map(p=>`<tr>${td('Paciente',`<strong>${esc(p.name)}</strong>`)}${td('Origem',esc(clinic(p.clinicId).name))}${td('Valor',brl.format(p.value))}${td('Recebido',brl.format(p.received))}${td('Saldo',`<strong>${brl.format(balance(p))}</strong>`)}${td('Vencimento',fmtDate(p.due))}${td('Status',badge(isOverdue(p)&&p.status!=='Faturado / Recebido'?'À receber':p.status))}<td class="actions-cell"><div class="row-actions"><button class="btn small" onclick="markReceived('${p.id}')">Baixar</button><button class="btn small" onclick="editPatient('${p.id}')">Editar</button><button class="btn small danger" onclick="deletePatient('${p.id}')">Excluir</button></div></td></tr>`).join('');
}
function renderCosts(){
  const total=state.costs.reduce((s,c)=>s+Number(c.value||0),0), paid=state.costs.filter(c=>c.status==='PAGO').reduce((s,c)=>s+Number(c.value||0),0);
  const cats={};state.costs.forEach(c=>cats[c.type]=(cats[c.type]||0)+Number(c.value||0));const largest=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  document.getElementById('costTotal').textContent=brl.format(total);document.getElementById('costPaid').textContent=brl.format(paid);document.getElementById('costOpen').textContent=brl.format(total-paid);document.getElementById('costLargest').textContent=largest;
  document.getElementById('costsTable').innerHTML=state.costs.map(c=>{
    const sub=[c.installment?`Parcela ${c.installment}`:'',c.boletoLine?'Boleto escaneado':''].filter(Boolean).join(' · ');
    return `<tr>${td('Descrição',`<strong>${esc(c.desc)}</strong>${sub?`<span class="cell-sub">${esc(sub)}</span>`:''}`)}${td('Tipo',esc(c.type))}${td('Centro',esc(c.center))}${td('Data',fmtDate(c.date))}${td('Vencimento',fmtDate(c.due))}${td('Forma pg.',esc(c.method))}${td('Valor',brl.format(c.value))}${td('Status',badge(c.status))}<td class="actions-cell"><div class="row-actions"><button class="btn small" onclick="toggleCost('${c.id}')">${c.status==='PAGO'?'Reabrir':'Pagar'}</button><button class="btn small" onclick="openCostModal('${c.id}')">Editar</button><button class="btn small danger" onclick="deleteCost('${c.id}')">Excluir</button></div></td></tr>`;
  }).join('');
}
function renderPayroll(){
  document.getElementById('payrollTable').innerHTML=state.payroll.map(f=>`<tr>${td('Profissional',`<strong>${esc(f.name)}</strong>`)}${td('Tipo',esc(f.type))}${td('Competência',esc(f.period))}${td('Centro',esc(f.center))}${td('Valor',brl.format(f.value))}${td('Status',badge(f.status))}<td class="actions-cell">${acts(`openPayrollModal('${f.id}')`,`deletePayroll('${f.id}')`)}</td></tr>`).join('');
  const total=state.payroll.reduce((s,f)=>s+Number(f.value||0),0), paid=state.payroll.filter(f=>f.status==='Pago').reduce((s,f)=>s+Number(f.value||0),0);
  document.getElementById('payrollSummary').innerHTML=`<div class="report-grid" style="grid-template-columns:1fr 1fr"><div class="report-tile"><small>Total da competência</small><strong>${brl.format(total)}</strong></div><div class="report-tile"><small>Em aberto</small><strong>${brl.format(total-paid)}</strong></div></div><div style="margin-top:18px;font-size:11px;color:var(--muted);line-height:1.6">A etapa seguinte poderá ratear folha por centro de custo e relacionar remuneração variável diretamente à produção de cada profissional.</div>`;
}
function renderReports(){
  const clinics=state.clinics.map(c=>{const a=state.patients.filter(p=>p.clinicId===c.id),r=a.reduce((s,p)=>s+p.value,0),co=a.reduce((s,p)=>s+patientCost(p),0);return {name:c.name,revenue:r,cost:co,profit:r-co,margin:pct(r-co,r)}}).sort((a,b)=>b.margin-a.margin);
  const procMap={};
  state.patients.forEach(p=>{
    const lines=patientLines(p);
    const list=lines.length?lines:[{procedureId:p.procedureId,qty:1}];
    const shareV=Number(p.value||0)/list.length;
    const shareC=patientCost(p)/list.length;
    list.forEach(l=>{
      const id=l.procedureId; if(!id) return;
      if(!procMap[id]) procMap[id]={id,name:procedure(id).name,revenue:0,cost:0,cases:0};
      procMap[id].revenue+=shareV; procMap[id].cost+=shareC; procMap[id].cases+=1;
    });
  });
  const procs=Object.values(procMap).map(x=>({...x,profit:x.revenue-x.cost,margin:pct(x.revenue-x.cost,x.revenue)})).sort((a,b)=>b.profit-a.profit);
  const total=state.patients.reduce((s,p)=>s+p.value,0), costs=state.patients.reduce((s,p)=>s+patientCost(p),0);
  document.getElementById('reportBestClinic').textContent=clinics[0]?.name||'—';document.getElementById('reportBestProcedure').textContent=procs[0]?.name||'—';document.getElementById('reportTicket').textContent=brl.format(state.patients.length?total/state.patients.length:0);document.getElementById('reportAvgCost').textContent=brl.format(state.patients.length?costs/state.patients.length:0);
  document.getElementById('reportClinics').innerHTML=clinics.map(x=>`<div style="margin-bottom:15px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px"><span>${esc(x.name)}</span><strong>${x.margin}% · ${brl.format(x.profit)}</strong></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,x.margin))}%"></span></div></div>`).join('');
  const max=Math.max(1,...procs.map(x=>x.profit));document.getElementById('reportProcedures').innerHTML=procs.map(x=>`<div style="margin-bottom:15px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px"><span>${esc(x.name)}</span><strong>${brl.format(x.profit)}</strong></div><div class="progress"><span style="width:${Math.max(0,x.profit/max*100)}%"></span></div></div>`).join('');
}
function renderMaterials(){
  document.getElementById('materialsTable').innerHTML=state.materials.map(m=>`<tr>${td('Material',`<strong>${esc(m.name)}</strong>`)}${td('Código de barras',esc(m.barcode||'—'))}${td('Marca',esc(m.brand))}${td('Tipo',esc(m.type))}${td('Fornecedor',esc(m.supplier))}${td('Embalagem',esc(m.pack))}${td('Preço',brl.format(m.price))}${td('Custo unit.',`<strong>${brl.format(m.unitCost)}</strong>`)}${td('Atualizado',fmtDate(m.updated))}<td class="actions-cell">${acts(`openMaterialModal('${m.id}')`,`deleteMaterial('${m.id}')`)}</td></tr>`).join('');
}
function renderStock(){
  const val=state.materials.reduce((s,m)=>s+m.stock*m.unitCost,0), low=state.materials.filter(m=>m.stock<=m.min);
  document.getElementById('stockValue').textContent=brl.format(val);document.getElementById('stockLow').textContent=low.length;document.getElementById('stockItems').textContent=state.materials.length;
  document.getElementById('stockTable').innerHTML=state.materials.map(m=>`<tr>${td('Item',`<strong>${esc(m.name)}</strong>`)}${td('Marca',esc(m.brand))}${td('Tipo',esc(m.type))}${td('Atual',String(m.stock))}${td('Mínimo',String(m.min))}${td('Custo unit.',brl.format(m.unitCost))}${td('Valor',brl.format(m.stock*m.unitCost))}${td('Status',m.stock<=m.min?'<span class="badge b-red">Reposição</span>':'<span class="badge b-green">OK</span>')}<td class="actions-cell">${acts(`openMaterialModal('${m.id}')`,`deleteMaterial('${m.id}')`)}</td></tr>`).join('');
}
function renderAll(){
  ensureSettings();
  ensureProstheses();
  try{
    if(window.ChevalierPlan){ChevalierPlan.ensureCollections();ChevalierPlan.seedDefaults();ChevalierPlan.bindUi();}
  }catch(e){ console.warn('ChevalierPlan init', e); }
  renderDashboard();renderPatients();renderClinics();renderProcedures();renderService();renderPrivate();renderTrabalhos();renderLab();renderEntregas();renderTimeline();renderReceivables();renderCosts();renderPayroll();renderReports();renderMaterials();renderStock();renderBanco();renderSettings();
  try{
    if(window.ChevalierPlan){ChevalierPlan.renderCalendario();ChevalierPlan.renderPlanejamento();}
  }catch(e){ console.warn('ChevalierPlan render', e); }
  updateNotifBadge();
  syncMobileNav();
}

function syncMobileNav(page){
  const cur=page||document.querySelector('.page.active')?.id?.replace(/^page-/,'')||'dashboard';
  document.querySelectorAll('.mb-nav-btn[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===cur));
}

function go(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>{
    const on=b.dataset.page===page && (!b.dataset.tab || b.dataset.tab===bancoTab);
    b.classList.toggle('active',on);
  });
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.classList.remove('nav-open');
  syncMobileNav(page);
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{
  if(b.dataset.tab) bancoTab=b.dataset.tab;
  go(b.dataset.page);
  if(b.dataset.page==='banco') setBancoTab(bancoTab);
});
function openMobileNav(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  document.body.classList.add('nav-open');
}
function closeMobileNav(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  document.body.classList.remove('nav-open');
}
document.getElementById('mobileMenu').onclick=()=>openMobileNav();
document.getElementById('overlay').onclick=()=>closeMobileNav();
document.getElementById('mbMenuBtn')?.addEventListener('click',()=>openMobileNav());
document.querySelectorAll('.mb-nav-btn[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('modalRoot')?.classList.contains('open')) closeModal();
    else closeMobileNav();
  }
});

function openModal(title,body,onSave){
  const s=document.getElementById('modalSave');
  s.style.display='';s.textContent='Salvar';s.classList.remove('danger');s.disabled=false;
  document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;document.getElementById('modalRoot').classList.add('open');
  document.getElementById('modalRoot')?.querySelector('.modal')?.classList.remove('modal-wide');
  document.body.classList.add('modal-open');
  s.onclick=onSave;
}
function closeModal(){
  if(window.ChevalierScan) ChevalierScan.stopCamera();
  document.getElementById('bEditAgain')?.remove();
  document.getElementById('modalRoot').classList.remove('open');
  document.body.classList.remove('modal-open');
  const s=document.getElementById('modalSave');
  s.style.display='';s.textContent='Salvar';s.classList.remove('danger');s.disabled=false;
}
function confirmDelete(msg,fn){
  openModal('Excluir registro',`<p>${esc(msg)}</p><p class="cell-sub">Esta ação não pode ser desfeita.</p>`,()=>{fn();save();closeModal();renderAll();toast('Registro excluído.');});
  const s=document.getElementById('modalSave');s.textContent='Excluir';s.classList.add('danger');
}
function deletePatient(id){
  const linked=(state.prostheses||[]).filter(w=>w.patientId===id).length;
  confirmDelete(`Excluir este paciente${linked?` e ${linked} trabalho(s) protético(s) vinculado(s)`:''}?`,()=>{
    state.patients=state.patients.filter(x=>x.id!==id);
    state.prostheses=(state.prostheses||[]).filter(w=>w.patientId!==id);
  });
}
function deleteClinic(id){
  const n=state.patients.filter(p=>p.clinicId===id).length;
  if(n){toast('Há lançamentos nesta clínica. Transfira ou exclua os pacientes antes.');return;}
  confirmDelete('Excluir esta clínica?',()=>{
    state.clinics=state.clinics.filter(x=>x.id!==id);
    ensureClinicPrices();
  });
}
function deleteProcedure(id){
  const n=state.patients.filter(p=>p.procedureId===id).length;
  if(n){toast('Há pacientes usando este procedimento. Altere-os antes de excluir.');return;}
  confirmDelete('Excluir este procedimento e sua ficha de custo?',()=>{state.procedures=state.procedures.filter(x=>x.id!==id);});
}
function deleteCost(id){confirmDelete('Excluir este custo?',()=>{state.costs=state.costs.filter(x=>x.id!==id);});}
function deletePayroll(id){confirmDelete('Excluir este lançamento de folha?',()=>{state.payroll=state.payroll.filter(x=>x.id!==id);});}
function deleteMaterial(id){
  const used=state.procedures.some(p=>(p.items||[]).some(i=>i.materialId===id));
  if(used){toast('Este material está na ficha de um procedimento. Remova-o de lá antes.');return;}
  confirmDelete('Excluir este material do banco de custos?',()=>{state.materials=state.materials.filter(x=>x.id!==id);});
}
function deleteProsthesis(id){confirmDelete('Excluir este trabalho protético e o histórico?',()=>{state.prostheses=state.prostheses.filter(x=>x.id!==id);});}

function materialSelect(selected=''){
  return state.materials.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(m=>`<option value="${m.id}" ${m.id===selected?'selected':''}>${esc(m.name)} · ${brl.format(m.unitCost)}</option>`).join('');
}
function procItemRow(item={}){
  return `<div class="proc-item"><select class="select pi-mat">${materialSelect(item.materialId||'')}</select><input class="input pi-qty" type="number" min="0" step="0.01" value="${item.qty??1}"><button type="button" class="btn small icon-x" onclick="this.parentElement.remove()">×</button></div>`;
}
function collectProcItems(){
  return [...document.querySelectorAll('.proc-item')].map(row=>({materialId:row.querySelector('.pi-mat').value,qty:Number(row.querySelector('.pi-qty').value||0)})).filter(x=>x.materialId&&x.qty>0);
}
function setBancoTab(tab){
  bancoTab=tab||'materiais';
  document.querySelectorAll('.subtab').forEach(b=>b.classList.toggle('active',b.dataset.tab===bancoTab));
  const mat=document.getElementById('bancoMateriais'), proc=document.getElementById('bancoProcedimentos');
  if(mat) mat.hidden=bancoTab!=='materiais';
  if(proc) proc.hidden=bancoTab!=='procedimentos';
  const actions=document.getElementById('bancoActions');
  if(actions){
    actions.innerHTML=bancoTab==='materiais'
      ? `<button class="btn" onclick="openPriceSyncModal()">↻ Sincronizar preços</button><button class="btn" onclick="importDentalCatalog()">Importar catálogo</button><button class="btn primary" onclick="openMaterialModal()">＋ Material</button>`
      : `<button class="btn primary" onclick="openProcedureModal()">＋ Procedimento</button>`;
  }
  document.querySelectorAll('.nav-btn').forEach(b=>{
    const on=b.dataset.page==='banco' && b.dataset.tab===bancoTab;
    if(b.dataset.page==='banco') b.classList.toggle('active',on);
  });
  renderBanco();
}
function importDentalCatalog(){
  const before=state.materials.length;
  const added=ensureCatalog(true)||Math.max(0,state.materials.length-before);
  save();renderAll();
  const specs=DENTAL_SPECIALTIES.map(s=>s.name).filter(Boolean).join(', ');
  toast(added?`${added} materiais adicionados (${DENTAL_CATALOG.length} no catálogo${specs?` · ${specs}`:''}).`:'O catálogo já estava completo.');
}
function renderBanco(){
  if(!document.getElementById('bancoMaterialsTable')) return;
  const types=[...new Set([
    ...DENTAL_SPECIALTIES.flatMap(s=>s.categories||[]),
    ...state.materials.map(m=>m.type).filter(Boolean)
  ])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const typeSel=document.getElementById('matDbType');
  if(typeSel){
    const cur=typeSel.value;
    typeSel.innerHTML='<option value="">Todas as categorias</option>'+types.map(t=>`<option value="${esc(t)}" ${t===cur?'selected':''}>${esc(t)}</option>`).join('');
    typeSel.value=cur;
  }
  const q=(document.getElementById('matDbSearch')?.value||'').toLowerCase();
  const tf=document.getElementById('matDbType')?.value||'';
  const mats=state.materials.filter(m=>(!tf||m.type===tf)&&(!q||[m.name,m.brand,m.type,m.supplier].some(v=>String(v||'').toLowerCase().includes(q)))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  document.getElementById('bancoMaterialsTable').innerHTML=mats.map(m=>`<tr>${td('Material',`<strong>${esc(m.name)}</strong>`)}${td('Marca',esc(m.brand||'—'))}${td('Tipo',esc(m.type||'—'))}${td('Embalagem',esc(m.pack||'—'))}${td('Preço embalagem',brl.format(m.price||0))}${td('Custo unitário',`<strong>${brl.format(m.unitCost||0)}</strong>`)}${td('Estoque',String(m.stock??0))}<td class="actions-cell">${acts(`openMaterialModal('${m.id}')`,`deleteMaterial('${m.id}')`)}</td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">Nenhum material no banco.</div></td></tr>';
  const pq=(document.getElementById('procDbSearch')?.value||'').toLowerCase();
  const procs=state.procedures.filter(p=>!pq||p.name.toLowerCase().includes(pq));
  document.getElementById('bancoProcTable').innerHTML=procs.map(p=>{
    const cost=procedureCost(p), mats=(p.items||[]).length;
    const priced=(p.clinicPrices||[]).filter(x=>Number(x.practicedValue||0)>0).length;
    return `<tr>${td('Procedimento',`<strong>${esc(p.name)}</strong><span class="cell-sub">${priced} clínica(s) com valor</span>`)}${td('Preço',brl.format(p.price))}${td('Materiais',`${mats} item(ns)`)}${td('Lab / extra',brl.format(p.extra||0))}${td('Custo total',`<strong>${brl.format(cost)}</strong>`)}${td('Margem',badge(pct(p.price-cost,p.price)+'%'))}<td class="actions-cell"><div class="row-actions"><button class="btn small" onclick="showCostSheet('${p.id}');go('procedimentos')">Ficha</button><button class="btn small" onclick="openProcedureModal('${p.id}')">Editar</button><button class="btn small danger" onclick="deleteProcedure('${p.id}')">Excluir</button></div></td></tr>`;
  }).join('')||'<tr><td colspan="7"><div class="empty">Nenhum procedimento cadastrado.</div></td></tr>';
}
document.getElementById('modalRoot').addEventListener('click',e=>{if(e.target.id==='modalRoot')closeModal()});
function getv(id){return document.getElementById(id)?.value||''}
function num(id){return Number(getv(id)||0)}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2200)}

function clinicOptions(selected=''){return state.clinics.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('')}
function procOptions(selected=''){return state.procedures.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('')}
function statusOptions(selected='À receber'){return ['À receber','Recebido parcial','Faturado / Recebido','Aguardando acerto','Retrabalho','Não vai receber'].map(s=>`<option ${s===selected?'selected':''}>${s}</option>`).join('')}
function openPatientModal(origin='',editId=''){
  const p=state.patients.find(x=>x.id===editId)||{};
  const initialClinic=p.clinicId||(origin==='Particular'?'particular':'allon');
  const lines=patientLines(p);
  const seedLines=lines.length?lines:[{procedureId:state.procedures[0]?.id||'p1',qty:1}];
  const bom=combinedProcedureMaterials(seedLines);
  const suggested=editId?null:honorariumForLines(seedLines,initialClinic);
  const seedConsume=editId?(p.consumedItems||bom.items):bom.items;
  const seedCost=editId?(p.cost??0):bom.materials;
  const seedLab=editId?(p.lab??0):bom.lab;
  const seedComp=editId?(p.components??0):bom.components;
  openModal(editId?'Editar paciente / tratamento':'Novo paciente / tratamento',`
    <div class="form-grid">
      <div class="field full"><label>Nome do paciente</label><input id="fName" class="input" value="${esc(p.name||'')}" placeholder="Nome completo"></div>
      <div class="field"><label>Origem</label><select id="fOrigin" class="select"><option ${((p.origin||origin)==='Prestação')?'selected':''}>Prestação</option><option ${((p.origin||origin)==='Particular')?'selected':''}>Particular</option></select></div>
      <div class="field"><label>Clínica / centro de resultado</label><select id="fClinic" class="select" onchange="recalcTreatmentTotals()">${clinicOptions(initialClinic)}</select></div>
      <div class="field full"><label>Composição do tratamento</label>
        <p class="field-hint">Monte o caso somando procedimentos (ex.: plantio + enxerto + coroa). Os custos e o honorário são recalculados.</p>
        <div id="fTreatLines" class="treat-list">${seedLines.map(treatmentLineRow).join('')}</div>
        <div class="treat-add">
          <select id="fAddProc" class="select">${procOptionsGrouped('')}</select>
          <button type="button" class="btn small" onclick="addTreatmentLine()">＋ Adicionar procedimento</button>
        </div>
      </div>
      <div class="field"><label>Data</label><input id="fDate" type="date" class="input" value="${p.date||todayISO()}"></div>
      <div class="field"><label>Valor / honorário</label><input id="fValue" type="number" step="0.01" class="input" value="${p.value??suggested??''}"><small id="fHonorHint" class="field-hint">Soma dos procedimentos na clínica selecionada.</small></div>
      <div class="field"><label>Recebido</label><input id="fReceived" type="number" step="0.01" class="input" value="${p.received??0}"></div>
      <div class="field"><label>Vencimento</label><input id="fDue" type="date" class="input" value="${p.due||addDays(10)}"></div>
      <div class="field"><label>Status financeiro</label><select id="fStatus" class="select">${statusOptions(p.status)}</select></div>
      <div class="field full"><label>Consumo de materiais (calculado da composição)</label>
        <p class="field-hint">Soma das fichas dos procedimentos. Edite quantidades livremente.</p>
        <div id="fConsumeList" class="consume-list">${(seedConsume.length?seedConsume:[{}]).map(consumeRow).join('')}</div>
        <div class="row-actions" style="margin-top:8px"><button type="button" class="btn small" onclick="document.getElementById('fConsumeList').insertAdjacentHTML('beforeend', consumeRow())">＋ Item</button><button type="button" class="btn small" onclick="recalcTreatmentTotals()">Recalcular da composição</button></div>
        <div class="consume-total" id="fConsumeTotal"></div>
      </div>
      <div class="field"><label>Custo materiais</label><input id="fCost" type="number" step="0.01" class="input" value="${seedCost}"></div>
      <div class="field"><label>Laboratório</label><input id="fLab" type="number" step="0.01" class="input" value="${seedLab}"></div>
      <div class="field"><label>Componentes</label><input id="fComponents" type="number" step="0.01" class="input" value="${seedComp}"></div>
      <div class="field"><label>Custo clínico / sala</label><input id="fClinical" type="number" step="0.01" class="input" value="${p.clinical??0}"></div>
      <div class="field full"><label>Progresso clínico/protético</label><select id="fProgress" class="select">${['Orçamento','Em tratamento','Aguardo pós Cirúrgico','Moldagem','Enviado para Laboratório','Aguardando Prova','Aguardando Cimentação','Alta'].map(s=>`<option ${s===(p.progress||'Em tratamento')?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>`,()=>{
      if(!getv('fName')) return toast('Informe o nome do paciente.');
      const lines=collectTreatmentLines();
      if(!lines.length) return toast('Adicione ao menos um procedimento à composição.');
      refreshConsumeTotals();
      const consumed=collectConsumeItems();
      const obj={
        id:editId||uid(),
        name:getv('fName'),
        origin:getv('fOrigin'),
        clinicId:getv('fClinic'),
        procedureId:lines[0].procedureId,
        lines,
        date:getv('fDate'),
        value:num('fValue'),
        received:num('fReceived'),
        due:getv('fDue'),
        status:getv('fStatus'),
        cost:num('fCost'),
        lab:num('fLab'),
        components:num('fComponents'),
        clinical:num('fClinical'),
        progress:getv('fProgress'),
        consumedItems:consumed
      };
      if(editId){
        const prev=state.patients.find(x=>x.id===editId);
        if(prev?.consumedItems?.length) applyStockConsumption(prev.consumedItems,true);
        state.patients=state.patients.map(x=>x.id===editId?obj:x);
      }else state.patients.unshift(obj);
      applyStockConsumption(consumed,false);
      save();closeModal();renderAll();toast('Tratamento salvo.');
    });
  document.getElementById('modalRoot')?.querySelector('.modal')?.classList.add('modal-wide');
  document.getElementById('fConsumeList')?.addEventListener('change',e=>{if(e.target.classList.contains('ci-mat')) refreshConsumeTotals();});
  refreshConsumeTotals();
  if(!editId) recalcTreatmentTotals();
}
function editPatient(id){openPatientModal('',id)}
function openClinicModal(editId=''){
  const c=state.clinics.find(x=>x.id===editId)||{};
  openModal(editId?'Editar clínica':'Nova clínica',`<div class="form-grid"><div class="field full"><label>Nome</label><input id="cName" class="input" value="${esc(c.name||'')}"></div><div class="field"><label>Tipo</label><select id="cType" class="select"><option ${c.type!=='Próprio'?'selected':''}>Prestação de serviço</option><option ${c.type==='Próprio'?'selected':''}>Próprio</option></select></div><div class="field"><label>Sigla</label><input id="cColor" class="input" maxlength="3" value="${esc(c.color||'')}"></div><div class="field full"><label>Regra financeira</label><textarea id="cRule" class="textarea" rows="3" placeholder="Ex.: R$ 490 por implante; materiais por minha conta...">${esc(c.rule||'')}</textarea></div></div>`,()=>{
    if(!getv('cName'))return toast('Informe o nome da clínica.');
    const obj={id:editId||uid(),name:getv('cName'),type:getv('cType'),rule:getv('cRule')||'Regra não definida',color:(getv('cColor')||getv('cName').slice(0,2)).toUpperCase()};
    if(editId) state.clinics=state.clinics.map(x=>x.id===editId?obj:x); else state.clinics.push(obj);
    ensureClinicPrices();
    save();closeModal();renderAll();toast('Clínica salva.');
  })
}
function clinicPriceRow(row={},fallbackPrice=0){
  const r=normalizeClinicPrice(row,fallbackPrice);
  const c=clinic(r.clinicId);
  const isPercent=r.receiveMode==='percent';
  const receive=honorariumFromPrice(r);
  return `<div class="clinic-price-row" data-clinic-id="${esc(r.clinicId)}">
    <div class="clinic-price-head"><span class="clinic-logo mini">${esc(c.color||'??')}</span><div><strong>${esc(c.name)}</strong><small>${esc(c.type||'')}</small></div></div>
    <div class="clinic-price-grid">
      <div class="field"><label>Valor praticado na clínica</label><input class="input cp-practiced" type="number" step="0.01" min="0" value="${r.practicedValue||''}" oninput="refreshClinicPriceRow(this)"></div>
      <div class="field"><label>Como eu recebo</label><select class="select cp-mode" onchange="toggleClinicPriceMode(this)"><option value="fixed" ${!isPercent?'selected':''}>Valor fechado (integral)</option><option value="percent" ${isPercent?'selected':''}>Porcentagem</option></select></div>
      <div class="field cp-fixed-wrap" ${isPercent?'hidden':''}><label>Valor fechado que eu recebo</label><input class="input cp-amount" type="number" step="0.01" min="0" value="${r.receiveAmount||''}" oninput="refreshClinicPriceRow(this)"></div>
      <div class="field cp-percent-wrap" ${isPercent?'':'hidden'}><label>% que eu recebo</label><input class="input cp-percent" type="number" step="0.01" min="0" max="100" value="${r.receivePercent||''}" oninput="refreshClinicPriceRow(this)"></div>
    </div>
    <small class="cp-preview">Você recebe: <strong>${brl.format(receive)}</strong></small>
  </div>`;
}
function toggleClinicPriceMode(sel){
  const row=sel.closest('.clinic-price-row');
  if(!row)return;
  const percent=sel.value==='percent';
  row.querySelector('.cp-fixed-wrap').hidden=percent;
  row.querySelector('.cp-percent-wrap').hidden=!percent;
  refreshClinicPriceRow(sel);
}
function refreshClinicPriceRow(el){
  const row=el.closest?.('.clinic-price-row')||el;
  if(!row||!row.classList.contains('clinic-price-row'))return;
  const preview=row.querySelector('.cp-preview');
  if(!preview)return;
  const data={
    clinicId:row.dataset.clinicId,
    practicedValue:Number(row.querySelector('.cp-practiced')?.value||0),
    receiveMode:row.querySelector('.cp-mode')?.value||'fixed',
    receiveAmount:Number(row.querySelector('.cp-amount')?.value||0),
    receivePercent:Number(row.querySelector('.cp-percent')?.value||0)
  };
  preview.innerHTML=`Você recebe: <strong>${brl.format(honorariumFromPrice(data))}</strong>`;
}
function collectClinicPrices(){
  return [...document.querySelectorAll('.clinic-price-row')].map(row=>({
    clinicId:row.dataset.clinicId,
    practicedValue:Number(row.querySelector('.cp-practiced')?.value||0),
    receiveMode:row.querySelector('.cp-mode')?.value==='percent'?'percent':'fixed',
    receiveAmount:Number(row.querySelector('.cp-amount')?.value||0),
    receivePercent:Number(row.querySelector('.cp-percent')?.value||0)
  })).filter(x=>x.clinicId);
}
function openProcedureModal(editId=''){
  const p=state.procedures.find(x=>x.id===editId)||{items:[],extra:0,price:0,clinicPrices:[],specialty:'clinica',kind:'clinico'};
  const map=Object.fromEntries((p.clinicPrices||[]).map(x=>[x.clinicId,x]));
  const clinicRows=state.clinics.map(c=>clinicPriceRow(map[c.id]?{...map[c.id],clinicId:c.id}:{clinicId:c.id,practicedValue:p.price||0,receiveMode:'fixed',receiveAmount:p.price||0,receivePercent:100},p.price||0)).join('')
    ||'<div class="empty">Cadastre clínicas para definir valores por unidade.</div>';
  const rows=(p.items&&p.items.length?p.items:[{}]).map(procItemRow).join('');
  const specOpts=DENTAL_PROCEDURE_SPECIALTIES.map(s=>`<option value="${esc(s.id)}" ${s.id===(p.specialty||'clinica')?'selected':''}>${esc(s.name)}</option>`).join('');
  openModal(editId?'Editar procedimento':'Novo procedimento',`<div class="form-grid">
    <div class="field full"><label>Procedimento</label><input id="pName" class="input" value="${esc(p.name||'')}"></div>
    <div class="field"><label>Especialidade</label><select id="pSpecialty" class="select">${specOpts}</select></div>
    <div class="field"><label>Tipo</label><select id="pKind" class="select"><option value="clinico" ${(p.kind||'clinico')!=='cirurgico'?'selected':''}>Clínico</option><option value="cirurgico" ${p.kind==='cirurgico'?'selected':''}>Cirúrgico</option></select></div>
    <div class="field"><label>Preço base de referência</label><input id="pPrice" type="number" step="0.01" class="input" value="${p.price??''}"><small class="field-hint">Pode deixar 0 e precificar depois.</small></div>
    <div class="field"><label>Laboratório / extra</label><input id="pExtra" type="number" step="0.01" class="input" value="${p.extra??0}"></div>
    <div class="field full"><label>Valor praticado e recebimento por clínica</label>
      <p class="field-hint">Em cada clínica, informe o valor praticado e se você recebe valor fechado (integral) ou porcentagem desse valor.</p>
      <div id="clinicPrices" class="clinic-price-list">${clinicRows}</div>
    </div>
    <div class="field full"><label>Materiais utilizados (qtd. × custo unitário)</label><p class="field-hint">Use “Sugerir materiais” para preencher automaticamente conforme o nome do procedimento.</p><div id="procItems">${rows}</div><div class="row-actions"><button type="button" class="btn small" onclick="document.getElementById('procItems').insertAdjacentHTML('beforeend', procItemRow())">＋ Material</button><button type="button" class="btn small" onclick="applySuggestedMaterialsToProcedureForm()">✦ Sugerir materiais</button></div></div>
  </div>`,()=>{
    if(!getv('pName'))return toast('Informe o nome do procedimento.');
    const obj={id:editId||uid(),name:getv('pName'),specialty:getv('pSpecialty')||'clinica',kind:getv('pKind')||'clinico',price:num('pPrice'),extra:num('pExtra'),items:collectProcItems(),clinicPrices:collectClinicPrices()};
    if(editId) state.procedures=state.procedures.map(x=>x.id===editId?obj:x); else state.procedures.push(obj);
    save();closeModal();renderAll();if(editId) showCostSheet(editId);toast('Procedimento salvo.');
  });
  document.getElementById('modalRoot')?.querySelector('.modal')?.classList.add('modal-wide');
}
function syncPatientHonorarium(){
  const clinicEl=document.getElementById('fClinic')||document.getElementById('rClinic');
  const procEl=document.getElementById('fProc')||document.getElementById('rProc');
  const valueEl=document.getElementById('fValue')||document.getElementById('rValue');
  const hint=document.getElementById('fHonorHint')||document.getElementById('rHonorHint');
  if(!clinicEl||!procEl||!valueEl)return;
  const row=clinicPriceFor(procEl.value,clinicEl.value);
  const honor=honorariumFromPrice(row);
  valueEl.value=honor;
  if(hint){
    hint.textContent=row.receiveMode==='percent'
      ? `Sugerido: ${row.receivePercent}% de ${brl.format(row.practicedValue)} = ${brl.format(honor)}`
      : `Sugerido: valor fechado ${brl.format(honor)} (praticado ${brl.format(row.practicedValue)})`;
  }
}
function wireHonorariumAutosuggest(clinicId,procId){
  const clinicEl=document.getElementById(clinicId);
  const procEl=document.getElementById(procId);
  if(!clinicEl||!procEl)return;
  clinicEl.addEventListener('change',syncPatientHonorarium);
  procEl.addEventListener('change',syncPatientHonorarium);
}
function openCostModal(editId=''){
  const types=['IMPLANTE','LAB','BIOMATERIAL','INSUMOS','COMPONENTES','EQUIPAMENTO','ALUGUEL','Transporte','Alimentação','IMPOSTO E CRO','Consultoria','BOLETO'];
  const c=state.costs.find(x=>x.id===editId)||{};
  openModal(editId?'Editar custo':'Novo custo',`<div class="form-grid"><div class="field full"><label>Descrição / beneficiário</label><input id="xDesc" class="input" value="${esc(c.desc||'')}"></div><div class="field"><label>Tipo</label><select id="xType" class="select">${types.map(x=>`<option ${x===c.type?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Centro de custo</label><select id="xCenter" class="select"><option>Geral</option>${state.clinics.map(cl=>`<option ${cl.name===(c.center||'')?'selected':''}>${esc(cl.name)}</option>`).join('')}</select></div><div class="field"><label>Data</label><input id="xDate" type="date" class="input" value="${c.date||todayISO()}"></div><div class="field"><label>Vencimento</label><input id="xDue" type="date" class="input" value="${c.due||addDays(7)}"></div><div class="field"><label>Forma de pagamento</label><select id="xMethod" class="select">${['PIX','BOLETO À VISTA','BOLETO PARCELADO','CRÉDITO','DÉBITO','DINHEIRO'].map(x=>`<option ${x===c.method?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Valor</label><input id="xValue" type="number" step="0.01" class="input" value="${c.value??''}"></div><div class="field"><label>Parcela</label><input id="xInstallment" class="input" value="${esc(c.installment||'')}" placeholder="Ex.: 2/6"></div><div class="field"><label>Status</label><select id="xStatus" class="select">${['À PAGAR','PAGO','PARCELADO','ATRASADO'].map(x=>`<option ${x===c.status?'selected':''}>${x}</option>`).join('')}</select></div>${c.boletoLine?`<div class="field full"><label>Linha digitável</label><input class="input" value="${esc(c.boletoLine)}" disabled></div>`:''}</div>`,()=>{
    if(!getv('xDesc'))return toast('Informe a descrição.');
    const obj={id:editId||uid(),desc:getv('xDesc'),type:getv('xType'),center:getv('xCenter'),date:getv('xDate'),due:getv('xDue'),method:getv('xMethod'),value:num('xValue'),status:getv('xStatus'),installment:getv('xInstallment'),boletoLine:c.boletoLine||''};
    if(editId) state.costs=state.costs.map(x=>x.id===editId?obj:x); else state.costs.unshift(obj);
    save();closeModal();renderAll();toast('Custo salvo.');
  })
}
function openMaterialModal(editId=''){
  const m=state.materials.find(x=>x.id===editId)||{};
  const typeOpts=catalogTypeOptions(m.type||'');
  openModal(editId?'Editar material':'Novo material',`<div class="form-grid"><div class="field full"><label>Material</label><input id="mName" class="input" value="${esc(m.name||'')}"></div><div class="field"><label>Marca</label><input id="mBrand" class="input" value="${esc(m.brand||'')}"></div><div class="field"><label>Categoria</label><select id="mType" class="select"><option value="">Selecione…</option>${typeOpts}</select><small class="field-hint">Cirurgia, implante, prótese, endodontia e uso comum.</small></div><div class="field"><label>Fornecedor</label><input id="mSupplier" class="input" value="${esc(m.supplier||'')}"></div><div class="field full"><label>Código de barras (EAN / interno)</label><input id="mBarcode" class="input" value="${esc(m.barcode||'')}" placeholder="Escaneie ou digite o código"><small class="field-hint">Usado pelo leitor para localizar o material no estoque.</small></div><div class="field"><label>Embalagem</label><input id="mPack" class="input" value="${esc(m.pack||'')}" placeholder="Ex.: 50 tubetes" oninput="document.getElementById('mUnit').value=unitCostFromPack(Number(document.getElementById('mPrice').value||0),this.value)"></div><div class="field"><label>Preço total da embalagem</label><input id="mPrice" type="number" step="0.01" class="input" value="${m.price??''}" oninput="document.getElementById('mUnit').value=unitCostFromPack(Number(this.value||0),document.getElementById('mPack').value)"></div><div class="field"><label>Custo unitário fracionado</label><input id="mUnit" type="number" step="0.001" class="input" value="${m.unitCost??''}"><small class="field-hint">Calculado automaticamente: preço ÷ unidades da embalagem.</small></div><div class="field"><label>Quantidade atual</label><input id="mStock" type="number" class="input" value="${m.stock??0}"></div><div class="field"><label>Estoque mínimo</label><input id="mMin" type="number" class="input" value="${m.min??1}"></div></div>`,()=>{
    if(!getv('mName'))return toast('Informe o material.');
    const pack=getv('mPack'); const price=num('mPrice');
    const obj={id:editId||uid(),name:getv('mName'),brand:getv('mBrand'),type:getv('mType'),supplier:getv('mSupplier'),barcode:getv('mBarcode').trim(),pack,price,unitCost:num('mUnit')||unitCostFromPack(price,pack)||price,stock:num('mStock'),min:num('mMin'),updated:todayISO()};
    if(editId) state.materials=state.materials.map(x=>x.id===editId?obj:x); else state.materials.push(obj);
    save();closeModal();renderAll();toast('Material salvo.');
  })
}
function openPayrollModal(editId=''){
  const f=state.payroll.find(x=>x.id===editId)||{};
  openModal(editId?'Editar folha':'Novo lançamento de folha',`<div class="form-grid"><div class="field full"><label>Profissional</label><input id="fPayName" class="input" value="${esc(f.name||'')}"></div><div class="field"><label>Tipo</label><select id="fPayType" class="select">${['Fixo','Diária','Comissão','Produção'].map(x=>`<option ${x===f.type?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Competência</label><input id="fPayPeriod" class="input" value="${esc(f.period||'09/2026')}"></div><div class="field"><label>Centro</label><select id="fPayCenter" class="select"><option>Geral</option>${state.clinics.map(c=>`<option ${c.name===f.center?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>Valor</label><input id="fPayValue" type="number" class="input" value="${f.value??''}"></div><div class="field"><label>Status</label><select id="fPayStatus" class="select"><option ${f.status!=='Pago'?'selected':''}>A pagar</option><option ${f.status==='Pago'?'selected':''}>Pago</option></select></div></div>`,()=>{
    if(!getv('fPayName'))return toast('Informe o profissional.');
    const obj={id:editId||uid(),name:getv('fPayName'),type:getv('fPayType'),period:getv('fPayPeriod'),center:getv('fPayCenter'),value:num('fPayValue'),status:getv('fPayStatus')};
    if(editId) state.payroll=state.payroll.map(x=>x.id===editId?obj:x); else state.payroll.push(obj);
    save();closeModal();renderAll();toast('Folha salva.');
  })
}
function openReceivableModal(type=''){
  const initialClinic=type==='prestacao'?(serviceClinicFilter||'allon'):'particular';
  const seedProc=state.procedures.find(p=>p.id==='p1')?.id||state.procedures[0]?.id||'';
  openModal(type==='prestacao'?'Lançar honorário (prestação)':'Novo recebível',`<div class="form-grid">
    <div class="field full"><label>Paciente</label><input id="rName" class="input"></div>
    <div class="field full"><label>Clínica</label><select id="rClinic" class="select" onchange="recalcReceivableTotals()">${clinicOptions(initialClinic)}</select></div>
    <div class="field full"><label>Composição do tratamento</label>
      <p class="field-hint">Ex.: plantio + enxerto. Adicione quantos procedimentos precisar.</p>
      <div id="fTreatLines" class="treat-list">${seedProc?treatmentLineRow({procedureId:seedProc}):''}</div>
      <div class="treat-add">
        <select id="fAddProc" class="select">${procOptionsGrouped('')}</select>
        <button type="button" class="btn small" onclick="addTreatmentLine();recalcReceivableTotals()">＋ Adicionar</button>
      </div>
    </div>
    <div class="field"><label>Valor / honorário</label><input id="rValue" type="number" class="input"><small id="rHonorHint" class="field-hint">Soma dos procedimentos × clínica.</small></div>
    <div class="field"><label>Recebido</label><input id="rReceived" type="number" class="input" value="0"></div>
    <div class="field"><label>Vencimento</label><input id="rDue" type="date" class="input" value="${addDays(7)}"></div>
    <div class="field"><label>Status</label><select id="rStatus" class="select">${statusOptions()}</select></div>
    <div class="field full"><label>Progresso</label><select id="rProgress" class="select"><option>Orçamento</option><option selected>Em tratamento</option><option>Aguardo pós Cirúrgico</option><option>Alta</option></select></div>
  </div>`,()=>{
    if(!getv('rName'))return toast('Informe o paciente.');
    const lines=collectTreatmentLines();
    if(!lines.length) return toast('Adicione ao menos um procedimento.');
    const cl=getv('rClinic');
    const bom=combinedProcedureMaterials(lines);
    state.patients.unshift({
      id:uid(),name:getv('rName'),origin:cl==='particular'?'Particular':'Prestação',clinicId:cl,
      procedureId:lines[0].procedureId,lines,date:todayISO(),value:num('rValue'),received:num('rReceived'),due:getv('rDue'),status:getv('rStatus'),
      cost:bom.materials,lab:bom.lab,components:bom.components,clinical:0,progress:getv('rProgress')||'Em tratamento',consumedItems:bom.items
    });
    applyStockConsumption(bom.items,false);
    save();closeModal();renderAll();toast('Lançamento salvo com composição.');
  });
  document.getElementById('modalRoot')?.querySelector('.modal')?.classList.add('modal-wide');
  recalcReceivableTotals();
}
function recalcReceivableTotals(){
  const clinicId=getv('rClinic')||'';
  const lines=collectTreatmentLines();
  const valueEl=document.getElementById('rValue');
  const hint=document.getElementById('rHonorHint');
  if(valueEl && clinicId) valueEl.value=String(Math.round(honorariumForLines(lines,clinicId)*100)/100);
  if(hint) hint.textContent=lines.length?`${lines.length} procedimento(s) · honorário sugerido pela clínica.`:'Adicione procedimentos.';
}
function openStockModal(prefillId=''){
  const selected=prefillId||(state.materials[0]?.id||'');
  openModal('Movimentar estoque',`<div class="form-grid"><div class="field full"><label>Material</label><select id="sMaterial" class="select">${state.materials.map(m=>`<option value="${m.id}" ${m.id===selected?'selected':''}>${esc(m.name)} · saldo ${m.stock}${m.barcode?' · '+esc(m.barcode):''}</option>`).join('')}</select></div><div class="field"><label>Movimento</label><select id="sType" class="select"><option value="in">Entrada</option><option value="out">Saída / consumo</option></select></div><div class="field"><label>Quantidade</label><input id="sQty" type="number" class="input" value="1"></div></div>`,()=>{
    const m=state.materials.find(x=>x.id===getv('sMaterial'));if(!m)return;
    const q=num('sQty');m.stock=Math.max(0,Number(m.stock)+(getv('sType')==='in'?q:-q));save();closeModal();renderAll();toast('Estoque atualizado.');
  })
}

function boletoDraftFromFields(){
  if(!window.ChevalierScan) return null;
  const linha=ChevalierScan.onlyDigits(getv('bLinha'));
  const parsed=linha?ChevalierScan.parseBoletoDigits(linha):null;
  return {
    desc:getv('bBeneficiary')||parsed?.beneficiary||'Boleto',
    beneficiary:getv('bBeneficiary')||parsed?.beneficiary||'',
    value:num('bValue')||parsed?.value||0,
    due:getv('bDue')||parsed?.due||'',
    installment:getv('bInstallment'),
    boletoLine:parsed?.linha||linha,
    type:getv('bType')||'BOLETO',
    center:getv('bCenter')||'Geral',
    method:getv('bMethod')||'BOLETO À VISTA',
    status:getv('bStatus')||'À PAGAR',
    date:todayISO()
  };
}
function renderBoletoConflictBox(draft){
  const box=document.getElementById('bConflict');
  if(!box||!window.ChevalierScan) return [];
  const conflicts=ChevalierScan.findCostConflicts(draft,state.costs);
  if(!conflicts.length){
    box.hidden=true; box.innerHTML='';
    return [];
  }
  box.hidden=false;
  box.innerHTML=`<strong>Possível duplicata encontrada</strong>
    Já existe ${conflicts.length} lançamento(s) parecido(s) em Custos:
    <ul>${conflicts.slice(0,4).map(c=>`<li>${esc(c.desc)} · ${brl.format(c.value)} · venc. ${fmtDate(c.due)} · ${esc(c.status)}</li>`).join('')}</ul>
    Revise antes de continuar.`;
  return conflicts;
}
function fillBoletoForm(data){
  if(!data) return;
  if(data.linha||data.barcode){
    const line=data.linha||data.barcode;
    const el=document.getElementById('bLinha');
    if(el) el.value=ChevalierScan.formatLinha(line);
  }
  if(data.beneficiary!=null && document.getElementById('bBeneficiary')) document.getElementById('bBeneficiary').value=data.beneficiary;
  if(data.bankName && !data.beneficiary && document.getElementById('bBeneficiary')) document.getElementById('bBeneficiary').value=data.bankName;
  if(data.value!=null && document.getElementById('bValue')) document.getElementById('bValue').value=data.value;
  if(data.due && document.getElementById('bDue')) document.getElementById('bDue').value=data.due;
  if(data.installment && document.getElementById('bInstallment')) document.getElementById('bInstallment').value=data.installment;
  if(Number(data.value)>0 && data.installment){
    const method=document.getElementById('bMethod');
    if(method) method.value='BOLETO PARCELADO';
  }
  const st=document.getElementById('bScanStatus');
  if(st) st.textContent=`Lido: ${data.bankName||data.beneficiary||'boleto'} · ${brl.format(data.value||0)} · venc. ${data.due?fmtDate(data.due):'—'}`;
  renderBoletoConflictBox(boletoDraftFromFields());
}
async function applyBoletoDigits(raw){
  const parsed=ChevalierScan.parseBoletoDigits(raw);
  if(!parsed){ toast('Linha digitável inválida.'); return null; }
  fillBoletoForm(parsed);
  return parsed;
}
async function processBoletoDocument(file){
  const st=document.getElementById('bScanStatus');
  if(st) st.textContent='Lendo documento do boleto…';
  try{
    const wrap=document.querySelector('#boletoScan .scan-video-wrap');
    const guide=document.querySelector('#boletoScan .scan-frame');
    const result=await ChevalierScan.readBoletoFromFile(file,{wrapEl:wrap,guideEl:guide});
    if(result.parsed && (result.parsed.value!=null || result.parsed.linha || result.parsed.barcode)){
      fillBoletoForm(result.parsed);
      if(st) st.textContent='Dados identificados — confirme para lançar.';
      askBoletoProceed(result.parsed);
      return;
    }
    if(st) st.textContent='Não encontrei o código automaticamente. Cole a linha digitável ou tente outra foto/PDF.';
    toast('Não foi possível ler o boleto automaticamente.');
  }catch(err){
    if(st) st.textContent=err.message||'Falha na leitura.';
    toast(err.message||'Falha ao analisar o boleto.');
  }
}
function askBoletoProceed(parsed){
  if(!parsed) return;
  const draft=boletoDraftFromFields()||{
    desc:parsed.beneficiary||parsed.bankName||'Boleto',
    beneficiary:parsed.beneficiary||parsed.bankName||'',
    value:parsed.value||0,
    due:parsed.due||'',
    installment:parsed.installment||'',
    boletoLine:parsed.linha||parsed.barcode||'',
    type:'BOLETO',
    center:'Geral',
    method:parsed.installment?'BOLETO PARCELADO':'BOLETO À VISTA',
    status:parsed.installment?'PARCELADO':'À PAGAR',
    date:todayISO()
  };
  const conflicts=ChevalierScan.findCostConflicts(draft,state.costs);
  __boletoPendingDraft=draft;
  if(window.ChevalierScan) ChevalierScan.stopCamera();
  openModal('Boleto identificado — prosseguir?',`
    <div class="boleto-result">
      <h4>Dados lidos automaticamente</h4>
      <dl>
        <dt>Beneficiário</dt><dd>${esc(draft.desc||'—')}</dd>
        <dt>Valor</dt><dd>${brl.format(draft.value||0)}</dd>
        <dt>Vencimento</dt><dd>${draft.due?fmtDate(draft.due):'—'}</dd>
        <dt>Parcela</dt><dd>${esc(draft.installment||'—')}</dd>
        <dt>Linha</dt><dd style="font-weight:400;word-break:break-all">${esc(ChevalierScan.formatLinha(draft.boletoLine||'')||'—')}</dd>
      </dl>
    </div>
    ${conflicts.length?`<div class="conflict-box"><strong>Possível duplicata</strong><ul>${conflicts.slice(0,4).map(c=>`<li>${esc(c.desc)} · ${brl.format(c.value)} · venc. ${fmtDate(c.due)}</li>`).join('')}</ul></div>`:''}
    <p class="field-hint" style="margin-top:12px">Deseja lançar este boleto em Custos?</p>
  `,()=>saveBoletoAsCost(true));
  document.getElementById('modalSave').textContent=conflicts.length?'Prosseguir mesmo assim':'Prosseguir e lançar';
  const foot=document.querySelector('#modalRoot .modal-foot');
  if(foot && !document.getElementById('bEditAgain')){
    const edit=document.createElement('button');
    edit.id='bEditAgain';
    edit.className='btn';
    edit.type='button';
    edit.textContent='Revisar dados';
    edit.onclick=()=>{
      closeModal();
      openBoletoScanModal(draft);
    };
    foot.insertBefore(edit, foot.firstChild);
  }
}
let __boletoPendingDraft=null;
function saveBoletoAsCost(force=false){
  const draft=force && __boletoPendingDraft ? __boletoPendingDraft : boletoDraftFromFields();
  if(!draft) return toast('Ferramenta de leitura indisponível.');
  if(!draft.desc) return toast('Informe o beneficiário / descrição.');
  if(!(draft.value>0)) return toast('Informe o valor do boleto.');
  const conflicts=ChevalierScan.findCostConflicts(draft,state.costs);
  if(conflicts.length && !force){
    askBoletoProceed({
      beneficiary:draft.desc,
      bankName:draft.desc,
      value:draft.value,
      due:draft.due,
      installment:draft.installment,
      linha:draft.boletoLine
    });
    return;
  }
  const method=draft.installment?'BOLETO PARCELADO':(draft.method||'BOLETO À VISTA');
  const status=draft.installment?'PARCELADO':(draft.status||'À PAGAR');
  state.costs.unshift({
    id:uid(),
    desc:draft.desc,
    type:draft.type||'BOLETO',
    center:draft.center||'Geral',
    date:draft.date||todayISO(),
    due:draft.due||addDays(7),
    method,
    value:draft.value,
    status,
    installment:draft.installment||'',
    boletoLine:draft.boletoLine||''
  });
  __boletoPendingDraft=null;
  save();closeModal();renderAll();go('custos');
  toast('Boleto lançado em Custos.');
}
function openBoletoScanModal(prefill=null){
  if(!window.ChevalierScan) return toast('Ferramenta de leitura indisponível.');
  const types=['BOLETO','IMPLANTE','LAB','BIOMATERIAL','INSUMOS','COMPONENTES','EQUIPAMENTO','ALUGUEL','IMPOSTO E CRO','Consultoria'];
  openModal('Escanear boleto',`
    <div class="scan-stage" id="boletoScan">
      <div class="scan-video-wrap boleto-cam">
        <video id="bVideo" playsinline muted></video>
        <img id="bPreview" alt="Boleto" hidden>
        <div class="scan-frame" id="bGuide"></div>
        <div class="scan-guide-label">Alinhe o código de barras (faixa retangular)</div>
      </div>
      <div class="row-actions">
        <button type="button" class="btn primary" id="bStartCam">Abrir câmera</button>
        <label class="btn" style="cursor:pointer">Importar foto / PDF<input type="file" id="bFile" accept="image/*,application/pdf,.pdf" capture="environment" hidden></label>
        <button type="button" class="btn" id="bStopCam">Parar</button>
      </div>
      <p class="scan-status" id="bScanStatus">A leitura é automática: aponte a faixa retangular para o código de barras do boleto, ou importe foto/PDF.</p>
      <div id="bResultPreview" class="boleto-result" hidden></div>
      <div class="form-grid">
        <div class="field full"><label>Linha digitável</label><input id="bLinha" class="input" placeholder="00000.00000 00000.000000 ..."><div class="row-actions" style="margin-top:8px"><button type="button" class="btn small" id="bParseLinha">Ler linha</button></div></div>
        <div class="field full"><label>Beneficiário / entidade</label><input id="bBeneficiary" class="input" placeholder="Quem vai receber"></div>
        <div class="field"><label>Valor</label><input id="bValue" type="number" step="0.01" class="input"></div>
        <div class="field"><label>Vencimento</label><input id="bDue" type="date" class="input"></div>
        <div class="field"><label>Parcela</label><input id="bInstallment" class="input" placeholder="Ex.: 1/3"></div>
        <div class="field"><label>Tipo</label><select id="bType" class="select">${types.map(t=>`<option>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Centro</label><select id="bCenter" class="select"><option>Geral</option>${state.clinics.map(c=>`<option>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Forma</label><select id="bMethod" class="select"><option>BOLETO À VISTA</option><option>BOLETO PARCELADO</option><option>PIX</option></select></div>
        <div class="field"><label>Status</label><select id="bStatus" class="select"><option>À PAGAR</option><option>PARCELADO</option><option>PAGO</option></select></div>
      </div>
      <div class="conflict-box" id="bConflict" hidden></div>
    </div>
  `,()=>{
    const draft=boletoDraftFromFields();
    if(!draft?.value) return toast('Escaneie o boleto ou preencha o valor.');
    askBoletoProceed(draft);
  });
  document.getElementById('modalRoot')?.querySelector('.modal')?.classList.add('modal-wide');
  document.getElementById('modalSave').textContent='Confirmar leitura';

  if(prefill){
    fillBoletoForm({
      beneficiary:prefill.desc||prefill.beneficiary,
      bankName:prefill.desc||prefill.beneficiary,
      value:prefill.value,
      due:prefill.due,
      installment:prefill.installment,
      linha:prefill.boletoLine||prefill.linha
    });
  }

  let scanning=false;
  let busy=false;
  const scanOpts=()=>({
    wrapEl:document.querySelector('#boletoScan .scan-video-wrap'),
    guideEl:document.getElementById('bGuide')
  });

  const onCodeFound=(parsed)=>{
    if(!parsed) return;
    scanning=false;
    ChevalierScan.stopCamera();
    fillBoletoForm(parsed);
    const preview=document.getElementById('bResultPreview');
    if(preview){
      preview.hidden=false;
      preview.innerHTML=`<h4>Código lido</h4><dl>
        <dt>Beneficiário</dt><dd>${esc(parsed.beneficiary||parsed.bankName||'—')}</dd>
        <dt>Valor</dt><dd>${brl.format(parsed.value||0)}</dd>
        <dt>Vencimento</dt><dd>${parsed.due?fmtDate(parsed.due):'—'}</dd>
      </dl>`;
    }
    document.getElementById('bScanStatus').textContent='Código de barras identificado.';
    askBoletoProceed(parsed);
  };

  const loop=async()=>{
    if(!scanning) return;
    const video=document.getElementById('bVideo');
    if(video && video.readyState>=2 && !busy){
      busy=true;
      try{
        const codes=await ChevalierScan.detectBarcodeFromVideo(video,scanOpts());
        if(codes?.length){
          for(const c of codes){
            const parsed=ChevalierScan.parseBoletoDigits(c.raw);
            if(parsed){ onCodeFound(parsed); busy=false; return; }
          }
        }
      }catch(_){}
      busy=false;
    }
    setTimeout(loop, 280);
  };

  const startCam=async()=>{
    try{
      const video=document.getElementById('bVideo');
      const preview=document.getElementById('bPreview');
      if(preview) preview.hidden=true;
      if(video) video.hidden=false;
      await ChevalierScan.startCamera(video,{wide:true});
      scanning=true;
      document.getElementById('bScanStatus').textContent='Câmera ativa — alinhe a faixa retangular no código de barras.';
      loop();
    }catch(err){
      document.getElementById('bScanStatus').textContent='Sem acesso à câmera. Importe foto/PDF ou cole a linha digitável.';
      toast('Permita a câmera ou importe um documento.');
    }
  };

  document.getElementById('bStartCam')?.addEventListener('click',startCam);
  document.getElementById('bStopCam')?.addEventListener('click',()=>{
    scanning=false; ChevalierScan.stopCamera();
    document.getElementById('bScanStatus').textContent='Câmera parada.';
  });
  document.getElementById('bFile')?.addEventListener('change',async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    scanning=false; ChevalierScan.stopCamera();
    const isPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name);
    const wrap=document.querySelector('#boletoScan .scan-video-wrap');
    const video=document.getElementById('bVideo');
    const preview=document.getElementById('bPreview');
    if(!isPdf && wrap && video && preview){
      preview.src=URL.createObjectURL(file);
      preview.hidden=false;
      video.hidden=true;
    }else if(preview){
      preview.hidden=true;
    }
    await processBoletoDocument(file);
  });
  document.getElementById('bParseLinha')?.addEventListener('click',async()=>{
    const parsed=await applyBoletoDigits(getv('bLinha'));
    if(parsed) askBoletoProceed(parsed);
  });
  document.getElementById('bLinha')?.addEventListener('change',async()=>{
    const parsed=await applyBoletoDigits(getv('bLinha'));
    if(parsed) askBoletoProceed(parsed);
  });
  ['bBeneficiary','bValue','bDue'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input',()=>renderBoletoConflictBox(boletoDraftFromFields()));
  });

  // Auto-start camera for immediate rectangular barcode reading
  setTimeout(startCam, 200);
}

function handleBarcodeLookup(code){
  const raw=String(code||'').trim();
  if(!raw) return;
  const hit=ChevalierScan.findMaterialByBarcode(raw,state.materials);
  const box=document.getElementById('bcHit');
  const st=document.getElementById('bcStatus');
  if(hit){
    if(st) st.textContent=`Encontrado: ${hit.name}`;
    if(box){
      box.hidden=false;
      box.innerHTML=`<div><strong>${esc(hit.name)}</strong><div class="cell-sub">${esc(hit.brand||'')} · estoque ${hit.stock} · ${esc(hit.barcode||'')}</div></div>
        <div class="row-actions">
          <button type="button" class="btn small" onclick="closeModal();openMaterialModal('${hit.id}')">Editar</button>
          <button type="button" class="btn small primary" onclick="closeModal();openStockModal('${hit.id}')">Movimentar</button>
        </div>`;
    }
    document.getElementById('bcCode').value=raw;
    toast(`Material: ${hit.name}`);
  }else{
    if(st) st.textContent='Código não cadastrado.';
    if(box){
      box.hidden=false;
      box.innerHTML=`<div><strong>Nenhum material com este código</strong><div class="cell-sub">${esc(raw)}</div></div>
        <div class="row-actions">
          <button type="button" class="btn small primary" id="bcCreate">Cadastrar material</button>
        </div>`;
      document.getElementById('bcCreate')?.addEventListener('click',()=>{
        closeModal();
        openMaterialModal();
        setTimeout(()=>{ const el=document.getElementById('mBarcode'); if(el) el.value=raw; },0);
      });
    }
  }
}
function openBarcodeScanModal(){
  if(!window.ChevalierScan) return toast('Ferramenta de leitura indisponível.');
  openModal('Código de barras — estoque',`
    <div class="scan-stage">
      <div class="scan-video-wrap"><video id="bcVideo" playsinline muted></video><div class="scan-frame"></div></div>
      <div class="row-actions">
        <button type="button" class="btn" id="bcStartCam">Abrir câmera</button>
        <button type="button" class="btn" id="bcStopCam">Parar</button>
      </div>
      <p class="scan-status" id="bcStatus">Aponte para o EAN do produto ou use um leitor USB no campo abaixo.</p>
      <div class="field full"><label>Código</label><input id="bcCode" class="input" placeholder="Escaneie ou digite e pressione Enter" autofocus></div>
      <div class="barcode-hit" id="bcHit" hidden></div>
      <p class="field-hint">Dica: leitores USB funcionam como teclado — foque o campo e escaneie.</p>
    </div>
  `,()=>{
    const code=getv('bcCode');
    if(!code) return toast('Informe um código.');
    const hit=ChevalierScan.findMaterialByBarcode(code,state.materials);
    if(hit){ closeModal(); openStockModal(hit.id); }
    else handleBarcodeLookup(code);
  });
  document.getElementById('modalRoot')?.querySelector('.modal')?.classList.add('modal-wide');
  document.getElementById('modalSave').textContent='Abrir estoque';

  let scanning=false;
  const loop=async()=>{
    if(!scanning) return;
    const video=document.getElementById('bcVideo');
    if(video && video.readyState>=2){
      try{
        const codes=await ChevalierScan.detectBarcodeFromVideo(video);
        if(codes?.length){
          const code=codes[0].raw;
          document.getElementById('bcCode').value=code;
          handleBarcodeLookup(code);
          scanning=false;
          ChevalierScan.stopCamera();
        }
      }catch(_){}
    }
    requestAnimationFrame(loop);
  };
  document.getElementById('bcStartCam')?.addEventListener('click',async()=>{
    try{
      await ChevalierScan.startCamera(document.getElementById('bcVideo'));
      scanning=true;
      document.getElementById('bcStatus').textContent='Câmera ativa — alinhe o código de barras.';
      loop();
    }catch{
      document.getElementById('bcStatus').textContent='Sem câmera. Use leitor USB ou digite o código.';
      toast('Permita a câmera ou digite o código.');
    }
  });
  document.getElementById('bcStopCam')?.addEventListener('click',()=>{
    scanning=false; ChevalierScan.stopCamera();
    document.getElementById('bcStatus').textContent='Câmera parada.';
  });
  document.getElementById('bcCode')?.addEventListener('keydown',e=>{
    if(e.key==='Enter'){ e.preventDefault(); handleBarcodeLookup(getv('bcCode')); }
  });
  setTimeout(()=>document.getElementById('bcCode')?.focus(),50);
}

function openQuickModal(){
  openModal('Novo lançamento',`<div class="grid layout-3">
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();openPatientModal()">Paciente</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();go('calendario');ChevalierPlan.openReminderModal()">Lembrete</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();go('planejamento')">Planejamento</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();openProsthesisModal()">Trabalho protético</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();openReceivableModal()">Recebível</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();openCostModal()">Custo</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();openBoletoScanModal()">Escanear boleto</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();openBarcodeScanModal()">Código de barras</button>
    <button type="button" class="btn" style="height:80px;justify-content:center" onclick="closeModal();openMaterialModal()">Material</button>
  </div>`,()=>closeModal());
  const s=document.getElementById('modalSave');
  if(s) s.style.display='none';
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
  const work=state.prostheses.find(w=>String(w.code).toLowerCase().includes(q)||String(w.type).toLowerCase().includes(q)||patientById(w.patientId).name.toLowerCase().includes(q));
  if(work){go('trabalhos');const s=document.getElementById('prosthSearch');if(s)s.value=q;renderTrabalhos();return;}
  const p=state.patients.find(x=>x.name.toLowerCase().includes(q)||patientProcedureSearchText(x).toLowerCase().includes(q));
  if(p){go('pacientes');document.getElementById('patientSearch').value=q;renderPatients();}
});

const now=new Date();
document.getElementById('todayLabel').textContent=now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});

async function boot(){
  try{
    const r=await fetch('api/state.php',{cache:'no-store',credentials:'same-origin'});
    if(r.status===401){location.href='login.php';return;}
    if(r.ok){
      const data=await r.json();
      applyCsrfFromResponse(data);
      if(data.ok && data.state){
        bindGlobalState(data.state);
        persistReady=true;
        localStorage.setItem('chevalier_gestao_v1',JSON.stringify(state));
      }else if(data.ok && !data.state){
        persistReady=true;
        await fetch('api/state.php',{
          method:'POST',
          headers:csrfHeaders({'Content-Type':'application/json'}),
          credentials:'same-origin',
          body:JSON.stringify({...state,csrf:csrfToken()})
        }).then(async res=>{try{applyCsrfFromResponse(await res.json());}catch(_){}});
      }
    }
  }catch(e){ /* fallback localStorage */ }
  ensureSettings();
  const catalogAdded=ensureCatalog()||0;
  const procAdded=ensureProcedureCatalog()||0;
  const linesMigrated=migratePatientLines()||0;
  ensureProstheses();
  ensureClinicPrices();
  let seeded=false;
  try{
    if(window.ChevalierPlan){
      ChevalierPlan.ensureCollections();
      seeded=!!ChevalierPlan.seedDefaults();
    }
  }catch(e){ console.warn('ChevalierPlan boot', e); }
  if(seeded||catalogAdded||procAdded||linesMigrated) save();
  renderAll();
  setBancoTab(bancoTab);
}
boot();
