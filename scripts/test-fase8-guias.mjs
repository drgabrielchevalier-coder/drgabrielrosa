#!/usr/bin/env node
/**
 * Regressão Fase 8 — Escanear documento: tipo + dados de DAS/DARF (assets/js/tax-guide.js).
 * Dados FICTÍCIOS (CNPJ, razão social e códigos inventados).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(root, 'assets/js/tax-guide.js'), 'utf8'), ctx);
const T = ctx.ChevalierTaxGuide;

let fail = 0;
const ok = (label, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + label); if (!cond) fail++; };

// Texto como o painel remonta do PDF (uma linha por linha visual).
const das = `Documento de Arrecadação
do Simples Nacional
CNPJ Razão Social
11.222.333/0001-81 CLINICA EXEMPLO LTDA
Período de Apuração Data de Vencimento Número do Documento Pagar este documento até
setembro/2026 20/10/2026 07.20.11111.2222222-3
Observações 25/11/2026
Valor Total do Documento
12,34
Composição do Documento de Arrecadação
Código Denominação Principal Multa Juros Total
1001 IRPJ - SIMPLES NACIONAL 4,00 0,40 0,04 4,44
09/2026
1010 ISS - SIMPLES NACIONAL 7,00 0,80 0,10 7,90
RIO DE JANEIRO (RJ) - 09/2026
Totais 11,00 1,20 0,14 12,34
SENDA (Versão:1.8.0) Página: 1/1 24/11/2026 08:15:51
85830000000 9 12340328263 5 29072026328 8 49710174731 2 AUTENTICAÇÃO MECÂNICA
Documento de Arrecadação do Simples Nacional Pague com o PIX
CNPJ: 11.222.333/0001-81
Número: 07.20.11111.2222222-3
Pagar até: 25/11/2026
Valor: 12,34`;

const darf = `Documento de Arrecadação
de Receitas Federais
CNPJ Razão Social
11.222.333/0001-81 CLINICA EXEMPLO LTDA
Período de Apuração Data de Vencimento Número do Documento Pagar este documento até
setembro/2026 20/10/2026 07.16.11111.3333333-4
Observações 25/11/2026
Valor Total do Documento
50,00
Código Denominação Principal Multa Juros Total
1099 CP DESCONTADA SEGURADO - CONTRIB INDIVIDUAL 44,00 5,00 1,00 50,00
PA:09/2026 Vencimento:20/10/2026
Totais 44,00 5,00 1,00 50,00
85800000000 1 50000385263 0 29071626328 7 49832109749 8
Pagar até: 25/11/2026
Valor: 50,00`;

// 1) tipo do documento
ok('DAS identificado', T.detectDocType(das) === 'das');
ok('DARF identificado', T.detectDocType(darf) === 'darf');
ok('NF-e (DANFE) identificada', T.detectDocType('DANFE Documento Auxiliar da Nota Fiscal Eletrônica Chave de acesso 3326...') === 'nfe');
ok('boleto identificado', T.detectDocType('Beneficiário: Fornecedor X  Linha digitável 34191.79001 01043.510047 91020.150008 1 96610000012345') === 'boleto');
ok('texto qualquer = unknown', T.detectDocType('lista de compras') === 'unknown');

// 2) DAS
const g = T.parseTaxGuide(das);
ok('DAS: valor pelo código de arrecadação (12,34)', g.value === 12.34);
ok('DAS: pagar até 25/11/2026', g.due === '2026-11-25');
ok('DAS: vencimento original 20/10/2026', g.originalDue === '2026-10-20');
ok('DAS: apuração 2026-09 (set/2026)', g.period === '2026-09' && g.periodLabel === 'set/2026');
ok('DAS: número do documento', g.docNumber === '07.20.11111.2222222-3');
ok('DAS: composição com 2 tributos', g.items.length === 2 && g.items[1].code === '1010');
ok('DAS: principal + multa + juros dos totais', g.principal === 11 && g.multa === 1.2 && g.juros === 0.14);
ok('DAS: descrição "DAS Simples Nacional · set/2026"', g.desc === 'DAS Simples Nacional · set/2026');
ok('DAS: linha de 48 dígitos guardada (detecta duplicata)', g.linha.length === 48 && g.linha.startsWith('858'));
ok('DAS: CNPJ', g.cnpj === '11.222.333/0001-81');

// 3) DARF
const d = T.parseTaxGuide(darf);
ok('DARF: valor 50,00', d.value === 50);
ok('DARF: descrição com código e tributo', /^DARF 1099 · CP descontada segurado/.test(d.desc) && /set\/2026$/.test(d.desc));
ok('DARF: vencimento original pelo "Vencimento:"', d.originalDue === '2026-10-20');
ok('DARF: pagar até', d.due === '2026-11-25');
ok('DARF: multa e juros nas observações', /multa R\$ 5,00/.test(d.notes) && /juros R\$ 1,00/.test(d.notes));

// 4) sem "Pagar até:" → data mais tardia (ignora carimbo de emissão com hora)
const semPrazo = T.parseTaxGuide(das.replace(/Pagar até: 25\/11\/2026/, ''));
ok('sem "Pagar até:" usa a data mais tardia', semPrazo.due === '2026-11-25');

// 5) código de arrecadação lido pela câmera (sem texto)
const linha = '858300000009123403282635290720263288497101747312';
ok('valor do código de arrecadação', T.valueFromArrecadacao(linha) === 12.34);
const cam = T.parseTaxGuide(linha.replace(/(\d{12})/g, '$1 '), 'tributo');
ok('só o código → guia com valor', cam.ok && cam.value === 12.34 && cam.label === 'Guia de tributo');
ok('código de boleto bancário não é arrecadação', T.valueFromArrecadacao('34191790010104351004791020150008196610000012345') === null);

if (fail) {
  console.error(`\n${fail} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('\nFase 8 (escanear documento: DAS/DARF) OK');
