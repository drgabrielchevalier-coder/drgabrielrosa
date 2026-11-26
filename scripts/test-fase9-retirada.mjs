#!/usr/bin/env node
/**
 * Regressão Fase 9 — retirada semanal / envelopes (assets/js/weekly-draw.js).
 * Nomes e valores FICTÍCIOS.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(root, 'assets/js/weekly-draw.js'), 'utf8'), ctx);
const D = ctx.ChevalierDraw;

let fail = 0;
const ok = (label, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + label); if (!cond) fail++; };
const near = (a, b) => Math.abs(a - b) < 0.011;

ok('padrões: 6% (Anexo III), reserva 10%, início 23/11/2026', D.DEFAULTS.taxRate === 6 && D.DEFAULTS.reservePct === 10 && D.DEFAULTS.since === '2026-11-23');

const w = D.weekRange('2026-11-26', 1);
ok('semana de segunda a domingo', w.start === '2026-11-23' && w.end === '2026-11-29');

// sem INSS para isolar as contas
const base = { taxRate: 6, reservePct: 10, proLabore: 0, inssRate: 11, since: '2026-11-23' };

const comNota = { id: 'a', name: 'Paciente A', clinicId: 'particular', origin: 'Particular', value: 1000, cost: 150, lab: 50, invoice: true,
  payments: [{ date: '2026-11-24', amount: 1000, mode: 'total' }] };
const semNota = { id: 'b', name: 'Paciente B', clinicId: 'allon', value: 400, components: 100, invoice: false,
  payments: [{ date: '2026-11-25', amount: 200, mode: 'parcial' }, { date: '2026-11-25', amount: 50, mode: 'parcial', voided: true }] };

const s1 = D.splitReceipt(comNota, 1000, D.settingsOf(base));
ok('com nota: imposto 6% = 60', near(s1.tax, 60));
ok('com nota: repor custo do caso = 200', near(s1.costReserve, 200));
ok('com nota: reserva 10% do resto = 74', near(s1.reserve, 74));
ok('com nota: livre = 666', near(s1.free, 666));
const s2 = D.splitReceipt(semNota, 200, D.settingsOf(base));
ok('sem nota: sem imposto e custo proporcional (50)', near(s2.tax, 0) && near(s2.costReserve, 50));

const r = D.compute({ today: '2026-11-26', settings: base, patients: [comNota, semNota], costs: [], withdrawals: [] });
ok('recebido na semana = 1.200 (ignora baixa anulada)', near(r.totals.received, 1200));
ok('sem contas: disponível = livre da semana', near(r.available, r.totals.free));

// boleto de 400 vencendo daqui a 3 semanas: provisiona 1/4 por semana (100), e o fundo de giro já tem 250 dos casos
const boleto = { id: 'c1', desc: 'Fornecedor X · 1/2', value: 400, due: '2026-12-16', status: 'À PAGAR', type: 'INSUMOS' };
const r2 = D.compute({ today: '2026-11-26', settings: base, patients: [comNota, semNota], costs: [boleto], withdrawals: [] });
ok('conta em 3 semanas: precisa de 100 nesta semana, coberta pelo giro (250) → nada sai da retirada', near(r2.contribOps, 0));
const r2b = D.compute({ today: '2026-11-26', settings: base, patients: [{ ...comNota, cost: 0, lab: 0 }], costs: [boleto], withdrawals: [] });
ok('sem fundo de giro: provisão gradual de 100 (não 400) sai do pró-labore', near(r2b.contribOps, 100));
ok('conta fora do horizonte de 4 semanas não pesa', D.compute({ today: '2026-11-26', settings: base, patients: [], costs: [{ ...boleto, due: '2027-01-30' }], withdrawals: [] }).bills.length === 0);

// conta vencendo nesta semana: provisão integral
const r3 = D.compute({ today: '2026-11-26', settings: base, patients: [{ ...comNota, cost: 0, lab: 0 }], costs: [{ ...boleto, due: '2026-11-27' }], withdrawals: [] });
ok('conta da própria semana: provisão integral (400)', near(r3.contribOps, 400));

// sobra acumula: semana 1 sobra, semana 2 sem recebimento → disponível = sobra da semana 1
const r4 = D.compute({ today: '2026-12-02', settings: base, patients: [comNota, semNota], costs: [], withdrawals: [{ date: '2026-11-25', value: 300 }] });
ok('semana seguinte: sobra da anterior entra no disponível', near(r4.carryIn, r.totals.free - 300) && near(r4.available, r.totals.free - 300));
const r5 = D.compute({ today: '2026-12-02', settings: base, patients: [comNota, semNota], costs: [], withdrawals: [{ date: '2026-11-25', value: 300 }, { date: '2026-12-01', value: 100 }] });
ok('retirada desta semana desconta do acumulado', near(r5.available, r.totals.free - 400) && near(r5.withdrawn, 100));

// pagamento sai do fundo de giro
const r6 = D.compute({ today: '2026-11-26', settings: base, patients: [comNota, semNota],
  costs: [{ id: 'p', desc: 'Lab', value: 120, due: '2026-11-24', status: 'PAGO', paidAt: '2026-11-24', type: 'LAB' }], withdrawals: [] });
ok('custo pago na semana reduz o fundo de giro (250 → 130)', near(r6.funds.giro, 130));
ok('conta paga antes do início do controle é ignorada', D.compute({ today: '2026-11-26', settings: base, patients: [], costs: [{ id: 'old', value: 999, due: '2026-11-10', status: 'PAGO', paidAt: '2026-11-10' }], withdrawals: [] }).bills.length === 0);

// atrasada ainda em aberto entra integral
const r7 = D.compute({ today: '2026-11-26', settings: base, patients: [], costs: [{ id: 'atr', desc: 'CRO', value: 88, due: '2026-10-23', status: 'À PAGAR', type: 'IMPOSTO E CRO' }], withdrawals: [] });
ok('conta atrasada em aberto: provisão integral no fundo de impostos', near(r7.contribTax, 88) && r7.bills[0].overdue);
ok('semana sem recebimento e com conta: falta aparece', near(r7.shortfall, 88) && near(r7.available, 0));

// guias previstas: DAS 6% das notas do mês, DARF INSS do pró-labore
const r8 = D.compute({ today: '2026-12-17', settings: { ...base, proLabore: 1000 }, patients: [comNota, semNota], costs: [], withdrawals: [] });
const das = r8.bills.find((b) => b.id === 'prev-das-2026-11');
ok('DAS previsto de nov/2026 = 6% das notas (60) vencendo 20/12', das && near(das.value, 60) && das.due === '2026-12-20');
ok('DARF INSS previsto = 11% do pró-labore (110)', r8.bills.some((b) => b.id === 'prev-darf-2026-11' && near(b.value, 110)));
ok('provisão semanal do INSS = 110 × 12/52', near(r8.inssWeekly, 110 * 12 / 52));
const r9 = D.compute({ today: '2026-12-17', settings: base, patients: [comNota], costs: [{ id: 'g', desc: 'DAS', docType: 'das', period: '2026-11', value: 60, due: '2026-12-20', status: 'À PAGAR', type: 'IMPOSTO E CRO' }], withdrawals: [] });
ok('DAS real lançado substitui o previsto', !r9.bills.some((b) => b.estimated && /DAS/.test(b.desc)) && r9.bills.some((b) => b.id === 'g'));
ok('imposto guardado na semana da nota cobre o DAS (nada sai da retirada)', near(r9.contribTax, 0));

// antes do início do controle
const prev = D.compute({ today: '2026-11-26', weekOffset: -1, settings: base, patients: [comNota, semNota], costs: [], withdrawals: [] });
ok('semana anterior ao início: zerada', prev.beforeSince && near(prev.totals.received, 0) && near(prev.available, 0));

if (fail) {
  console.error(`\n${fail} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('\nFase 9 (retirada semanal) OK');
