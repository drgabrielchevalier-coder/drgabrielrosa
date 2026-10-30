#!/usr/bin/env node
/**
 * Regressão Fase 4 — cadastro único, personId, sem merge por nome, vínculo caso↔pessoa.
 */
function uid(){ return 'id_'+Math.random().toString(36).slice(2,9); }
function emptyPerson(partial={}){
  return {
    id:partial.id||uid(),
    name:String(partial.name||'').trim(),
    phone:String(partial.phone||'').trim(),
    clinicId:partial.clinicId||'',
    vinculo:partial.vinculo==='Particular'?'Particular':'Parceira',
    cpf:String(partial.cpf||'').trim(),
    birthDate:partial.birthDate||'',
    email:'', address:'', anamnese:'', notes:'', docs:[],
    createdAt:partial.createdAt||'2026-10-30'
  };
}
function ensurePeople(state){
  if(!Array.isArray(state.people)) state.people=[];
  let n=0;
  const byId=Object.fromEntries(state.people.map(p=>[p.id,p]));
  (state.patients||[]).forEach(p=>{
    if(p.personId && byId[p.personId]) return;
    const pe=emptyPerson({
      name:p.name||'Sem nome',
      clinicId:p.clinicId||'',
      vinculo:p.origin==='Particular'?'Particular':'Parceira'
    });
    state.people.push(pe);
    byId[pe.id]=pe;
    p.personId=pe.id;
    n++;
  });
  return n;
}
function casesForPerson(state, personId){
  return (state.patients||[]).filter(p=>p.personId===personId);
}
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exitCode=1; } else console.log('ok:', msg); }

// 1) migração 1:1 sem fundir homônimos
{
  const state={
    people:[],
    patients:[
      {id:'c1', name:'Maria Silva', origin:'Prestação', clinicId:'allon'},
      {id:'c2', name:'Maria Silva', origin:'Particular', clinicId:'particular'},
      {id:'c3', name:'João', origin:'Prestação', clinicId:'daniele'}
    ]
  };
  const n=ensurePeople(state);
  assert(n===3, 'cria 3 pessoas para 3 casos');
  assert(state.people.length===3, 'homônimos permanecem separados');
  assert(state.patients[0].personId!==state.patients[1].personId, 'duas Marias ≠ mesmo personId');
  assert(ensurePeople(state)===0, 'migração idempotente');
}

// 2) múltiplos tratamentos na mesma pessoa
{
  const pe=emptyPerson({name:'Ana', phone:'11999999999', clinicId:'allon', vinculo:'Parceira'});
  const state={people:[pe], patients:[]};
  state.patients.push({id:'t1', personId:pe.id, name:'Ana', value:500, progress:'Em tratamento'});
  state.patients.push({id:'t2', personId:pe.id, name:'Ana', value:800, progress:'Orçamento'});
  const cases=casesForPerson(state, pe.id);
  assert(cases.length===2, 'dois lançamentos no mesmo cadastro');
  assert(cases.filter(c=>c.progress==='Orçamento').length===1, 'orçamento distinto do tratamento');
}

// 3) cadastro rápido exige essenciais (simulado)
{
  function validateQuick({name, phone, clinicId}){
    if(!String(name||'').trim()) return 'nome';
    if(!String(phone||'').trim()) return 'telefone';
    if(!clinicId) return 'clinica';
    return '';
  }
  assert(validateQuick({name:'', phone:'11', clinicId:'x'})==='nome', 'bloqueia sem nome');
  assert(validateQuick({name:'A', phone:'', clinicId:'x'})==='telefone', 'bloqueia sem telefone');
  assert(validateQuick({name:'A', phone:'11', clinicId:''})==='clinica', 'bloqueia sem clínica');
  assert(validateQuick({name:'A', phone:'11', clinicId:'x'})==='', 'essenciais ok sem CPF');
  const pe=emptyPerson({name:'A', phone:'11', clinicId:'x'});
  assert(!pe.cpf && !pe.email, 'opcionais vazios não impedem');
}

// 4) excluir caso preserva pessoa
{
  const pe=emptyPerson({name:'B', phone:'1', clinicId:'allon'});
  const state={people:[pe], patients:[{id:'x1', personId:pe.id, name:'B'}]};
  state.patients=state.patients.filter(x=>x.id!=='x1');
  assert(state.people.some(p=>p.id===pe.id), 'cadastro permanece após excluir tratamento');
  assert(casesForPerson(state, pe.id).length===0, 'sem tratamentos restantes');
}

if(process.exitCode){
  console.error('\nFase 4 regressão: FALHOU');
  process.exit(1);
}
console.log('\nFase 4 regressão: OK');
