#!/usr/bin/env node
/**
 * Regressão Fase 6 — vínculo NF-e × boletos (assets/js/cost-link.js).
 * Garante: NF é só agrupadora (nunca soma nos custos), parcelas são sugeridas, apelido de fornecedor é aprendido.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(root, 'assets/js/cost-link.js'), 'utf8'), ctx);
const L = ctx.ChevalierCostLink;

let fail = 0;
const ok = (label, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + label); if (!cond) fail++; };
const total = (state) => {
  const idx = L.linkIndex(state.costs);
  return Math.round(state.costs.reduce((s, c) => s + L.effectiveValue(c, idx), 0) * 100) / 100;
};

// NF parcelada em 3 boletos iguais + 1 boleto de outra compra
const state = {
  settings: {},
  nfImports: [{ key: 'K1', number: '3086154', supplier: 'LSI S.A', total: 810.88, date: '2026-11-13' }],
  costs: [
    { id: 'nf1', desc: 'NF-e 3086154 — LSI S.A', type: 'INSUMOS', center: 'Estoque', date: '2026-11-13', due: '2026-11-13', value: 810.88, status: 'À PAGAR', nfeKey: 'K1' },
    { id: 'nf2', desc: 'NF-e 3074256 — LSI S.A', type: 'INSUMOS', center: 'Estoque', date: '2026-11-11', due: '2026-11-11', value: 359.06, status: 'PAGO', nfeKey: '' },
    { id: 'b1', desc: 'Dental Cremer', type: 'BOLETO', date: '2026-11-23', due: '2026-12-13', value: 270.29, installment: '1/3', boletoLine: '1' },
    { id: 'b2', desc: 'Dental Cremer', type: 'BOLETO', date: '2026-11-23', due: '2027-01-12', value: 270.29, installment: '2/3', boletoLine: '2' },
    { id: 'b3', desc: 'Dental Cremer', type: 'BOLETO', date: '2026-11-23', due: '2027-02-11', value: 270.30, installment: '3/3', boletoLine: '3' },
    { id: 'b4', desc: 'Aluguel sala', type: 'ALUGUEL', method: 'PIX', date: '2026-11-05', due: '2026-11-10', value: 1500 },
  ],
};

ok('identifica NF', L.isNfeCost(state.costs[0]) && L.isNfeCost(state.costs[1]));
ok('identifica boleto', L.isBoletoCost(state.costs[2]) && !L.isBoletoCost(state.costs[5]));
ok('nome sem S.A', L.normName('LSI S.A') === 'lsi' && L.normName('Dental Cremer Produtos Odontológicos S/A') === 'dental cremer');
ok('fornecedor da NF', L.nfeSupplierOf(state.costs[1], state.nfImports) === 'LSI S.A');
ok('parcela 2/3', JSON.stringify(L.parseInstallment('2/3')) === JSON.stringify({ n: 2, of: 3 }));

const before = total(state);
ok('NF nunca soma: só boletos e pagamentos', before === Math.round((810.88 + 1500) * 100) / 100);

const sug = L.suggestBoletosForNfe(state.costs[0], state);
ok('sugere as 3 parcelas que fecham a NF', sug.exact && ['b1', 'b2', 'b3'].every((id) => sug.ids.includes(id)) && sug.ids.length === 3);

sug.ids.forEach((id) => L.setLink(state, id, 'nf1'));
ok('vincular não muda o total (NF já não somava)', total(state) === before);
ok('saldo da NF zerado', L.remainingOf(state.costs[0], L.linkIndex(state.costs)) === 0);
ok('aprendeu apelido Dental Cremer → LSI', (state.settings.supplierAliases['dental cremer'] || []).includes('lsi'));

// novo boleto do mesmo fornecedor, valor da outra NF → sugerida pela correlação aprendida
const novo = { id: 'b5', desc: 'DENTAL CREMER', type: 'BOLETO', date: '2026-11-24', due: '2026-12-11', value: 359.06, boletoLine: '5' };
state.costs.push(novo);
const top = L.suggestNfeForBoleto(novo, state)[0];
ok('boleto novo → sugere NF 3074256', top && top.nf.id === 'nf2' && top.score >= 60);
ok('NF já coberta não recebe mais boleto', !L.suggestNfeForBoleto(novo, state).some((x) => x.nf.id === 'nf1'));

// parcial: só 1 de 2 parcelas lançada → o restante continua contando pela NF
L.setLink(state, 'b5', '');
const nf3 = { id: 'nf3', desc: 'NF-e 999 — Surya Dental', type: 'INSUMOS', center: 'Estoque', date: '2026-11-20', value: 600, nfeKey: '' };
const p1 = { id: 'p1', desc: 'Surya Dental Ltda', type: 'BOLETO', due: '2026-12-20', value: 300, installment: '1/2', boletoLine: 'x' };
state.costs.push(nf3, p1);
ok('parcela 1/2 sugerida', L.suggestNfeForBoleto(p1, state)[0]?.nf.id === 'nf3');
L.setLink(state, 'p1', 'nf3');
const idx = L.linkIndex(state.costs);
ok('parcial: NF continua 0 nos custos', L.effectiveValue(nf3, idx) === 0);
ok('parcial: saldo sem boleto informado (300)', L.remainingOf(nf3, idx) === 300);

// reconciliar tudo não reaproveita boleto
const plan = L.reconcileAll(state);
const all = plan.flatMap((p) => p.boletoIds);
ok('reconciliação sem boleto repetido', all.length === new Set(all).size);
ok('reconciliação propõe b5 para NF 3074256', plan.some((p) => p.nfId === 'nf2' && p.boletoIds.includes('b5')));

// excluir NF libera os boletos
L.unlinkAllFrom(state, 'nf1');
ok('excluir NF libera boletos', !state.costs.some((c) => c.nfeCostId === 'nf1'));

process.exit(fail ? 1 : 0);
