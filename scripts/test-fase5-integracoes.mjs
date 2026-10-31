#!/usr/bin/env node
/**
 * Regressão Fase 5 — mapeamento, validação, duplicatas, vínculos, guarda anti-wipe (lógica).
 */

function importHash(prefix, parts){
  const raw=parts.filter(Boolean).join('|');
  let h=0;
  for(let i=0;i<raw.length;i++){ h=((h<<5)-h)+raw.charCodeAt(i); h|=0; }
  return prefix+'-'+Math.abs(h).toString(16).padStart(8,'0')+raw.length.toString(16);
}

function normHeader(h){
  return String(h||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

function autoMapFields(headers, fields){
  const map={}; const used=new Set();
  fields.forEach(f=>{
    let hit='';
    for(const alias of f.aliases){
      const a=normHeader(alias);
      hit=headers.find(h=>!used.has(h)&&normHeader(h)===a)||'';
      if(hit) break;
    }
    if(!hit){
      for(const alias of f.aliases){
        const a=normHeader(alias);
        hit=headers.find(h=>!used.has(h)&&normHeader(h).includes(a))||'';
        if(hit) break;
      }
    }
    if(hit){ map[f.id]=hit; used.add(hit); } else map[f.id]='';
  });
  return map;
}

function applyColumnMap(rows, map){
  return rows.map(row=>{
    const out={...row};
    Object.entries(map).forEach(([canonical, header])=>{
      if(!header) return;
      if(row[header]!=null && String(row[header]).trim()!=='') out[canonical]=row[header];
    });
    return out;
  });
}

function validateMapped(kind, mappedRows, requiredIds){
  const errors=[];
  let valid=0;
  mappedRows.forEach((row, idx)=>{
    const missing=requiredIds.filter(id=>!String(row[id]||'').trim());
    if(missing.length){ errors.push({line:idx+2, message:missing.join(',')}); return; }
    valid++;
  });
  return {errors, valid, total:mappedRows.length};
}

function classifyRecords(records, existingIds){
  const neu=[], dup=[];
  records.forEach(rec=>{
    if(existingIds.has(rec.importId)) dup.push(rec);
    else neu.push(rec);
  });
  return {neu, dup};
}

function assert(cond, msg){
  if(!cond){ console.error('FAIL:', msg); process.exitCode=1; }
  else console.log('ok:', msg);
}

const PATIENT_FIELDS=[
  {id:'Nome', required:true, aliases:['Nome','Paciente']},
  {id:'Honorários', required:false, aliases:['Honorários','Honorarios','A receber']},
  {id:'Data', required:false, aliases:['Data']}
];

// 1) auto map + apply
{
  const headers=['Paciente','Honorarios','Data do caso'];
  const map=autoMapFields(headers, PATIENT_FIELDS);
  assert(map.Nome==='Paciente', 'mapeia Nome ← Paciente');
  assert(map['Honorários']==='Honorarios', 'mapeia Honorários');
  const rows=applyColumnMap([{Paciente:'Ana', Honorarios:'500', 'Data do caso':'01/01/2026'}], map);
  assert(rows[0].Nome==='Ana' && rows[0]['Honorários']==='500', 'aplica mapa canônico');
}

// 2) validação obrigatórios
{
  const mapped=[{Nome:'A'},{Nome:''},{Nome:'B'}];
  const v=validateMapped('patients', mapped, ['Nome']);
  assert(v.valid===2 && v.errors.length===1 && v.errors[0].line===3, 'erro na linha sem nome');
}

// 3) duplicatas idempotentes — sem overwrite
{
  const id1=importHash('all',['allon','Ana','2026-01-01',500,'']);
  const id2=importHash('all',['allon','Ana','2026-01-01',500,'']);
  const id3=importHash('all',['allon','Ana','2026-01-02',500,'']);
  assert(id1===id2, 'mesmo conteúdo → mesmo importId');
  assert(id1!==id3, 'conteúdo diferente → importId distinto');
  const existing=new Set([id1]);
  const split=classifyRecords([
    {importId:id1, name:'Ana'},
    {importId:id3, name:'Ana'}
  ], existing);
  assert(split.dup.length===1 && split.neu.length===1, 'duplicata ignorada, novo aceito');
}

// 4) lotes append-only
{
  const batches=[];
  function register(b){ batches.unshift(b); if(batches.length>40) batches.length=40; }
  register({id:'b1', added:3, skippedDup:2});
  register({id:'b2', added:1, skippedDup:0});
  assert(batches[0].id==='b2' && batches.length===2, 'registro de lote recent-first');
}

// 5) guarda anti-wipe (espelho da regra PHP)
{
  function wipeGuard(existing, incoming){
    const ex=existing.patients||[];
    const inP=Object.prototype.hasOwnProperty.call(incoming,'patients') ? incoming.patients : null;
    const inC=Object.prototype.hasOwnProperty.call(incoming,'clinics') ? incoming.clinics : null;
    if(ex.length>=3 && Array.isArray(inP) && inP.length===0) return 'empty_patients';
    if(ex.length>=1 && (inP===null || inC===null)) return 'missing_core';
    if((existing.clinics||[]).length>=1 && Array.isArray(inC) && inC.length===0) return 'wipe_clinics';
    return '';
  }
  assert(wipeGuard({patients:[1,2,3],clinics:[1]},{patients:[],clinics:[1]})==='empty_patients', 'bloqueia patients vazio');
  assert(wipeGuard({patients:[1],clinics:[1]},{foo:1})==='missing_core', 'bloqueia payload parcial');
  assert(wipeGuard({patients:[1,2],clinics:[1]},{patients:[1,2],clinics:[1]})==='', 'permite estado completo');
}

// 6) vínculos 1:1 sem merge por nome
{
  const people=[];
  const patients=[
    {id:'c1', name:'Maria', importId:'a'},
    {id:'c2', name:'Maria', importId:'b'}
  ];
  patients.forEach(p=>{
    const pe={id:'pe_'+p.id, name:p.name};
    people.push(pe);
    p.personId=pe.id;
  });
  assert(patients[0].personId!==patients[1].personId, 'homônimos importados sem fundir');
  assert(people.length===2, 'duas pessoas');
}

if(process.exitCode){
  console.error('\nFase 5 regressão: FALHOU');
  process.exit(1);
}
console.log('\nFase 5 regressão: OK');
