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

// semana: quinta 26/11/2026 → segunda 23/11 a domingo 29/11
const w = D.weekRange('2026-11-26', 1);
ok('semana de segunda a domingo', w.start === '2026-11-23' && w.end === '2026-11-29');

const settings = { taxRate: 15.5, reservePct: 10, proLabore: 0, inssRate: 11, since: '2026-11-23' };

// caso com nota (honorário 1.000, custo 200) recebido inteiro na semana
const comNota = { id: 'a', name: 'Paciente A', clinicId: 'particular', origin: 'Particular', value: 1000, cost: 150, lab: 50, invoice: true,
  payments: [{ date: '2026-11-24', amount: 1000, mode: 'total' }] };
// caso sem nota, recebido pela metade na semana (custo proporcional)
const semNota = { id: 'b', name: 'Paciente B', clinicId: 'allon', value: 400, components: 100, invoice: false,
  payments: [{ date: '2026-11-25', amount: 200, mode: 'parcial' }, { date: '2026-11-10', amount: 50, mode: 'parcial', voided: true }] };

const s1 = D.splitReceipt(comNota, 1000, D.settingsOf(settings));
ok('com nota: imposto 15,5% = 155', near(s1.tax, 155));
ok('com nota: repor custo do caso = 200', near(s1.costReserve, 200));
ok('com nota: reserva 10% do resto = 64,50', near(s1.reserve, 64.5));
ok('com nota: livre = 580,50', near(s1.free, 580.5));

const r = D.compute({ today: '2026-11-26', settings, patients: [comNota, semNota], costs: [], withdrawals: [] });
ok('recebido na semana = 1.200 (ignora baixa anulada)', near(r.totals.received, 1200));
ok('sem nota: sem imposto, custo proporcional 50 (metade de 100)', near(r.receipts.find((x) => x.patientId === 'b').costReserve, 50));
ok('disponível sem contas = livre total', near(r.available, r.totals.free));
ok('fundo de giro acumula a reposição de custos', near(r.funds.giro, 250));

// contas da semana: boleto de 300 (fundo de giro 250 → faltam 50) e retirada já feita de 100
const costs = [
  { id: 'c1', desc: 'Fornecedor X · parcela 1/3', value: 300, due: '2026-11-27', status: 'À PAGAR', type: 'INSUMOS' },
  { id: 'c2', desc: 'Fornecedor X · parcela 2/3', value: 300, due: '2026-12-27', status: 'À PAGAR', type: 'INSUMOS' },
  { id: 'nf', kind: 'nfe', desc: 'NF agrupadora', value: 900, due: '2026-11-25', status: 'À PAGAR' },
];
const r2 = D.compute({ today: '2026-11-26', settings, patients: [comNota, semNota], costs, withdrawals: [{ date: '2026-11-24', value: 100 }, { date: '2026-11-20', value: 999 }] });
ok('só contas que vencem até domingo (ignora parcela de dezembro e a NF agrupadora)', r2.bills.length === 1 && r2.bills[0].id === 'c1');
ok('falta no capital de giro (300 − 250 = 50) sai da retirada', near(r2.deficitOps, 50));
ok('retiradas da semana: só as desta semana (100)', near(r2.withdrawn, 100));
ok('disponível = livre − falta − retirado', near(r2.available, r.totals.free - 50 - 100));

// pago com paidAt na semana sai do fundo
const r3 = D.compute({ today: '2026-11-26', settings, patients: [comNota, semNota],
  costs: [{ id: 'p', desc: 'Lab', value: 120, due: '2026-11-24', status: 'PAGO', paidAt: '2026-11-24', type: 'LAB' }], withdrawals: [] });
ok('custo pago desde o início do controle reduz o fundo de giro', near(r3.funds.giro, 130));

// guias previstas: DAS do mês com nota vence dia 20 do mês seguinte
const r4 = D.compute({ today: '2026-12-17', settings: { ...settings, proLabore: 1000 }, patients: [comNota, semNota], costs: [], withdrawals: [] });
const das = r4.bills.find((b) => b.id === 'prev-das-2026-11');
ok('DAS previsto de nov/2026 = 15,5% das notas (155) vencendo 20/12', das && near(das.value, 155) && das.due === '2026-12-20');
const darf = r4.bills.find((b) => b.id === 'prev-darf-2026-11');
ok('DARF INSS previsto = 11% do pró-labore (110)', darf && near(darf.value, 110));
ok('provisão semanal do INSS descontada da semana', near(r4.inssWeekly, 110 * 12 / 52));
// guia real já lançada substitui a prevista
const r5 = D.compute({ today: '2026-12-17', settings, patients: [comNota], costs: [{ id: 'g', desc: 'DAS', docType: 'das', period: '2026-11', value: 155, due: '2026-12-20', status: 'À PAGAR', type: 'IMPOSTO E CRO' }], withdrawals: [] });
ok('DAS real lançado substitui o previsto (sem contar duas vezes)', r5.bills.filter((b) => /DAS/.test(b.desc)).length === 1 && !r5.bills.some((b) => b.estimated && /DAS/.test(b.desc)));
ok('imposto reservado na semana da nota cobre o DAS (sem falta de impostos)', near(r5.deficitTax, 0));

// semana anterior (navegação) zera a contagem
const prev = D.compute({ today: '2026-11-26', weekOffset: -1, settings, patients: [comNota, semNota], costs: [], withdrawals: [] });
ok('semana anterior começa do zero', prev.week.start === '2026-11-16' && near(prev.totals.received, 0));

if (fail) {
  console.error(`\n${fail} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('\nFase 9 (retirada semanal) OK');
