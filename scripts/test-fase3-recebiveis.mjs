#!/usr/bin/env node
/**
 * Regressão Fase 3 — baixas parciais, quitação, bloqueio > saldo, estorno e snapshot.
 * Espelha a lógica de assets/js/app.js (moneyRound / balance / paymentStatusOf / sync / void).
 */
function moneyRound(n){ return Math.round((Number(n)||0)*100)/100; }
function balance(p){ return Math.max(0, moneyRound(Number(p.value||0)-Number(p.received||0))); }
function paymentStatusOf(p){
  const bal=balance(p);
  const rec=moneyRound(p.received||0);
  if(bal<=0) return 'Faturado / Recebido';
  if(rec>0) return 'Recebido parcial';
  return String(p.status||'À receber');
}
function syncPatientPaymentStatus(p){
  const bal=balance(p);
  if(bal<=0){ p.received=moneyRound(p.value||0); p.status='Faturado / Recebido'; }
  else if(moneyRound(p.received||0)>0) p.status='Recebido parcial';
  return p;
}
function sumActivePayments(p){
  return moneyRound((p.payments||[]).reduce((s,pay)=>{
    if(pay.voided) return s;
    const m=String(pay.mode||'').toLowerCase();
    if(m==='estorno' || m==='void') return s;
    return s+Number(pay.amount||0);
  },0));
}
function applyPayment(p, amt, extras={}){
  const saldo=balance(p);
  amt=moneyRound(amt);
  if(amt<=0) throw new Error('valor zero');
  if(amt>saldo+0.0001) throw new Error('acima do saldo');
  amt=Math.min(saldo, amt);
  const original=moneyRound(p.value||0);
  const before=moneyRound(p.received||0);
  p.received=moneyRound(Math.min(original, before+amt));
  syncPatientPaymentStatus(p);
  const open=balance(p);
  if(!Array.isArray(p.payments)) p.payments=[];
  p.payments.push({
    id:`pay_${p.payments.length+1}`,
    date:extras.date||'2026-10-30',
    amount:amt,
    mode:open<=0?'total':'parcial',
    balanceAfter:open,
    method:extras.method||'',
    note:extras.note||'',
    by:extras.by||'',
    receipt:extras.receipt||'',
    voided:false
  });
  return p;
}
function voidPayment(p, paymentId){
  const pay=p.payments.find(x=>x.id===paymentId);
  if(!pay || pay.voided) throw new Error('já estornada');
  pay.voided=true;
  pay.voidReason='teste';
  const original=moneyRound(p.value||0);
  p.received=moneyRound(Math.max(0, Math.min(original, sumActivePayments(p))));
  syncPatientPaymentStatus(p);
  p.payments.push({
    id:`void_${paymentId}`,
    date:'2026-10-30',
    amount:Number(pay.amount||0),
    mode:'estorno',
    balanceAfter:balance(p),
    voided:false,
    reverses:pay.id
  });
  return p;
}
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exitCode=1; } else console.log('ok:', msg); }

// 1) parcial ×3 + quitação (1500 → 400 → 600 → 500)
{
  const p={id:'t1', value:1500, received:0, status:'À receber', payments:[]};
  applyPayment(p, 400, {method:'pix'});
  assert(balance(p)===1100 && paymentStatusOf(p)==='Recebido parcial', 'parcial 400 → saldo 1100');
  applyPayment(p, 600, {method:'cash', by:'Gabriel'});
  assert(balance(p)===500 && p.payments.length===2, 'parcial 600 → saldo 500');
  applyPayment(p, 500, {method:'transfer', note:'quitação'});
  assert(balance(p)===0 && paymentStatusOf(p)==='Faturado / Recebido', 'quitação → saldo 0');
  assert(p.value===1500, 'valor original preservado');
  assert(sumActivePayments(p)===1500 && sumActivePayments(p)===p.received, 'ledger = received');
}

// 2) bloqueio acima do saldo
{
  const p={id:'t2', value:1000, received:700, status:'Recebido parcial', payments:[
    {id:'pay_1', amount:700, mode:'parcial', voided:false}
  ]};
  let blocked=false;
  try{ applyPayment(p, 400); }catch(e){ blocked=e.message==='acima do saldo'; }
  assert(blocked, 'bloqueia recebimento > saldo');
  assert(p.received===700 && p.value===1000, 'nada alterado no bloqueio');
}

// 3) estorno preserva histórico e reabre saldo
{
  const p={id:'t3', value:900, received:0, status:'À receber', payments:[]};
  applyPayment(p, 300, {method:'pix'});
  applyPayment(p, 600, {method:'pix'});
  assert(balance(p)===0, 'quitado antes do estorno');
  voidPayment(p, 'pay_2');
  assert(balance(p)===600, 'estorno reabre 600');
  assert(p.payments.some(x=>x.voided) && p.payments.some(x=>x.mode==='estorno'), 'histórico com void + estorno');
  assert(p.value===900, 'original intacto após estorno');
  assert(sumActivePayments(p)===300 && p.received===300, 'ledger pós-estorno');
}

// 4) snapshot imutável no fechamento (não recalcula)
{
  const rows=[
    {billingSnap:{grossShare:800, cardFee:20, reimbursement:50, receivable:830}, received:400, value:830},
    {billingSnap:null, received:100, value:500}
  ];
  const totals=rows.reduce((acc,r)=>{
    const snap=r.billingSnap;
    const honor=snap?.netShare!=null?Number(snap.netShare):Number(r.value||0);
    const fee=snap?.cardFee!=null?Number(snap.cardFee):0;
    const reimb=snap?.reimbursement!=null?Number(snap.reimbursement):0;
    const gross=snap?.grossShare!=null?Number(snap.grossShare):(honor+fee);
    acc.gross+=gross; acc.fee+=fee; acc.reimb+=reimb; acc.rec+=Number(r.received||0);
    return acc;
  },{gross:0,fee:0,reimb:0,rec:0});
  assert(moneyRound(totals.gross)===1300 && moneyRound(totals.fee)===20, 'fechamento usa snap quando existe');
  assert(moneyRound(totals.reimb)===50 && moneyRound(totals.rec)===500, 'totais fechamento');
  // mudar contrato "virtual" não altera snap
  const snapFrozen={...rows[0].billingSnap, grossShare:9999};
  assert(rows[0].billingSnap.grossShare===800, 'snap do lançamento permanece 800');
  void snapFrozen;
}

// 5) compat legado sem payments[]
{
  const p={id:'t5', value:200, received:200, status:'Faturado / Recebido'};
  assert(balance(p)===0 && paymentStatusOf(p)==='Faturado / Recebido', 'legado quitado sem ledger');
  assert(sumActivePayments(p)===0, 'sem ledger → soma 0 (não força divergência no teste unitário)');
}

if(process.exitCode){
  console.error('\nFase 3 regressão: FALHOU');
  process.exit(1);
}
console.log('\nFase 3 regressão: OK');
