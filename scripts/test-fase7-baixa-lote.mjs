#!/usr/bin/env node
/**
 * Regressão Fase 7 — baixa em lote (assets/js/batch-receive.js).
 * Nomes FICTÍCIOS (nunca versionar nomes reais de pacientes).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(root, 'assets/js/batch-receive.js'), 'utf8'), ctx);
const B = ctx.ChevalierBatchReceive;

let fail = 0;
const ok = (label, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + label); if (!cond) fail++; };

const pasted = `| Data | Paciente | Valor abatido |
|---|---|---:|
| **03/11** | Lucia | R$ 138,87 |
| **03/11** | Roberto Alves | R$ 206,13 |
| **05/11** | Roberto Alves | R$ 277,00 |
| **06/11** | Roberto Alves | R$ 6,87 |
| **06/11** | Mariza | R$ 157,00 |
| **10/11** | Geferson | R$ 63,13 |
| **12/11** | Geferson | R$ 500,00 |
| **17/11** | Ana | R$ 10,00 |
| **18/11** | Fulano Inexistente | R$ 50,00 |`;

const rows = B.parseRows(pasted, '2026-11-24');
ok('lê 9 linhas (sem cabeçalho/separador)', rows.length === 9);
ok('data sem ano → ano corrente', rows[0].date === '2026-11-03');
ok('valor BR', rows[0].amount === 138.87 && rows[6].amount === 500);
ok('data futura sem ano → ano anterior', B.parseRows('| 28/12 | X | R$ 1,00 |', '2026-01-10')[0].date === '2025-12-28');
ok('tabulação também', B.parseRows('05/11\tRoberto\t277,00', '2026-11-24')[0].amount === 277);

ok('abreviação de primeiro nome', B.nameScore('Lucia', 'Lucia Maria Pereira') > 0);
ok('grafia diferente (1 letra)', B.nameScore('Geferson', 'Gefferson Rabelo') > 0);
ok('sobrenome tem de bater', B.nameScore('Roberto Alves', 'Roberto Souza') === 0);

const cases = [
  { id: 'c1', personKey: 'p1', name: 'Lucia Maria Pereira', date: '2026-10-01', balance: 490 },
  { id: 'c2', personKey: 'p2', name: 'Roberto Alves', date: '2026-10-02', balance: 490 },
  { id: 'c3', personKey: 'p3', name: 'Mariza Costa', date: '2026-10-03', balance: 157 },
  { id: 'c4', personKey: 'p4', name: 'Gefferson Rabelo', date: '2026-10-04', balance: 490 },
  { id: 'c5', personKey: 'p4', name: 'Gefferson Rabelo', date: '2026-10-20', balance: 490 },
  { id: 'c6', personKey: 'p5', name: 'Ana Souza', date: '2026-10-05', balance: 300 },
  { id: 'c7', personKey: 'p6', name: 'Ana Lima', date: '2026-10-06', balance: 300 },
  { id: 'c8', personKey: 'p7', name: 'Quitado da Silva', date: '2026-10-07', balance: 0 },
];
const plan = B.planBatch(rows, cases);
const st = plan.rows.map((r) => r.status).join(',');
ok('status por linha', st === 'ok,ok,ok,ok,ok,ok,ok,ambiguous,unmatched');
const rob = plan.rows.filter((r) => r.personKey === 'p2');
ok('3 baixas do mesmo paciente consomem o saldo em sequência (490 → 0)', rob.map((r) => r.allocations[0].after).join('|') === '283.87|6.87|0');
const gef = plan.rows[6];
ok('valor maior que um tratamento passa para o próximo (mais antigo primeiro)', gef.allocations.length === 2 && gef.allocations[0].caseId === 'c4' && gef.allocations[0].amount === 426.87 && gef.allocations[1].caseId === 'c5' && gef.allocations[1].amount === 73.13);
ok('nunca acima do saldo', plan.rows.every((r) => r.allocations.every((a) => a.amount <= a.before + 1e-9 && a.after >= 0)));
ok('ambíguo não lança nada', plan.rows[7].allocations.length === 0);
const plan2 = B.planBatch(rows, cases, { 7: 'p6', 8: '__skip' });
ok('escolha manual resolve o ambíguo', plan2.rows[7].status === 'ok' && plan2.rows[7].allocations[0].caseId === 'c7');
ok('ignorar linha', plan2.rows[8].status === 'skip');
const excess = B.planBatch(B.parseRows('| 01/11 | Mariza | R$ 200,00 |', '2026-11-24'), cases);
ok('excesso sobre o saldo fica pendente', excess.rows[0].status === 'excess' && excess.rows[0].leftover === 43 && excess.applied === 157);

process.exit(fail ? 1 : 0);
