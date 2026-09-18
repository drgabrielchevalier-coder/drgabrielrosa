#!/usr/bin/env node
/**
 * Converte CSVs Notion (padrão do app) → JSON em assets/data/*-historico.json
 * Uso: node scripts/build-historico-from-csv.mjs
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMPORTS = path.join(ROOT, 'assets/data/imports');
const OUT = path.join(ROOT, 'assets/data');

function parseCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    const n = raw[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { cur += '"'; i++; continue; }
      if (c === '"') { inQ = false; continue; }
      cur += c;
      continue;
    }
    if (c === '"') { inQ = true; continue; }
    if (c === ',') { row.push(cur); cur = ''; continue; }
    if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; continue; }
    if (c === '\r') continue;
    cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map(h => String(h || '').trim());
  const records = rows.slice(1).filter(r => r.some(c => String(c || '').trim())).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] ?? ''; });
    return o;
  });
  return { headers, records };
}

function money(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/R\$\s?/gi, '').replace(/\s/g, '').trim();
  if (!s || /^não$/i.test(s)) return 0;
  // 1.268,44 or 1268.44
  if (/\d,\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function dateBR(v) {
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function monthRef(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.split('(')[0].trim();
}

function hashId(prefix, parts) {
  const h = crypto.createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 12);
  return `${prefix}-${h}`;
}

function normStatus(fin, honor) {
  const f = String(fin || '');
  if (/faturado|recebido/i.test(f) && !/parcial|não recebeu|nao recebeu/i.test(f)) {
    return { status: 'Faturado / Recebido', received: honor };
  }
  if (/parcial/i.test(f)) return { status: 'Recebido parcial', received: honor * 0.5 };
  if (/acordo/i.test(f)) return { status: 'Acordo', received: honor };
  if (/aguardando acerto/i.test(f)) return { status: 'Aguardando acerto', received: 0 };
  if (/não recebeu|nao recebeu/i.test(f)) return { status: 'À receber', received: 0 };
  return { status: 'À receber', received: 0 };
}

function toothFromObs(obs) {
  const m = String(obs || '').match(/\b([1-4]\d)\b/);
  return m ? m[1] : '';
}

function guessProcedure(obs, tipo) {
  const t = `${obs || ''} ${tipo || ''}`.toLowerCase();
  if (/endodontia|endo /.test(t)) {
    const tooth = toothFromObs(obs);
    if (/[36]6|[36]7|[36]8|[1-4]6|[1-4]7|[1-4]8/.test(tooth) || /multi/.test(t)) return 'proc-endo-multi';
    return 'proc-endo-uni';
  }
  if (/protocolo/.test(t)) return 'p5';
  if (/coroa/.test(t) && /implante/.test(t)) return 'p3';
  if (/implante/.test(t) && /enxerto/.test(t)) return 'p2';
  if (/implante/.test(t) && /coroa/.test(t)) return 'p4';
  if (/implante|plantio|cirurgia/.test(t)) return 'p1';
  if (/restaura/.test(t)) return 'p6';
  if (/exodont|raspagem|profilax|bloco|particular/.test(t)) return 'proc-historico-livre';
  return 'proc-historico-livre';
}

function syncFlowFromProgress(progress, obs) {
  const t = `${progress || ''} ${obs || ''}`.toLowerCase();
  return /prova|moldagem|laborat|ciment|protese|prótese|coroa/.test(t);
}

function pick(row, names) {
  for (const n of names) {
    if (row[n] != null && String(row[n]).trim() !== '') return row[n];
    const key = Object.keys(row).find(k => k.trim().toLowerCase() === n.trim().toLowerCase());
    if (key && String(row[key]).trim() !== '') return row[key];
  }
  // fuzzy contains
  for (const n of names) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(n.toLowerCase()));
    if (key && String(row[key]).trim() !== '') return row[key];
  }
  return '';
}

function convertHonorarios(csvPath, meta) {
  const { records } = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const out = [];
  for (const row of records) {
    const name = String(pick(row, ['Nome', 'Paciente'])).trim();
    if (!name) continue;
    const honor = money(pick(row, ['Honorários', 'Honorarios'])) || money(pick(row, ['A receber']));
    const practiced = money(pick(row, ['Valor', 'Valor Procedimento', 'Valor procedimento'])) || honor;
    const labRaw = pick(row, ['Lab', 'Lab ', 'Laboratório']);
    const lab = /^não$/i.test(String(labRaw || '').trim()) ? 0 : money(labRaw);
    const components = money(pick(row, ['Componentes']));
    const cc = money(pick(row, ['CC', 'CC ']));
    const clinical = cc || money(pick(row, ['Clinica', 'Clínica']));
    const date = dateBR(pick(row, ['Data']));
    const due = dateBR(pick(row, ['Data da Cobrança', 'Data da Cobranca'])) || date;
    const fin = pick(row, ['Financeiro']);
    const obs = String(pick(row, ['Observação', 'Observacao', 'Texto'])).trim();
    const progress = String(pick(row, ['Progresso']) || 'Em tratamento').trim() || 'Em tratamento';
    const tipo = pick(row, ['Tipo']);
    const mref = monthRef(pick(row, ['Mês Referencia novo', 'Mes Referencia novo', 'Resumo Financeiro', '💲 Resumo Financeiro']));
    const { status, received } = normStatus(fin, honor);
    const procedureId = guessProcedure(obs, tipo);
    const tooth = toothFromObs(obs);
    const importId = hashId(meta.prefix, [meta.clinicId, name, date, honor, obs, practiced]);
    out.push({
      importId,
      name,
      date: date || '2026-01-01',
      due: due || date || '2026-01-01',
      status,
      progress,
      value: honor,
      received: status === 'Faturado / Recebido' ? honor : received,
      practicedValue: practiced,
      observation: obs,
      notes: mref ? `${obs} [${mref}]`.trim() : obs,
      monthRef: mref,
      procedureId,
      tooth,
      lab,
      components,
      clinical: cc || clinical,
      syncFlow: syncFlowFromProgress(progress, obs),
      labFlag: String(pick(row, ['Lab', 'Lab '])).trim() === 'Não' ? 'Não' : ''
    });
  }
  return {
    version: 1,
    source: meta.source,
    clinicId: meta.clinicId,
    origin: meta.origin,
    kind: 'patients',
    count: out.length,
    records: out
  };
}

function convertCustos(csvPath) {
  const { records } = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const out = [];
  let idx = 0;
  for (const row of records) {
    idx++;
    const desc = String(pick(row, ['Descrição', 'Descricao'])).trim();
    if (!desc) continue;
    const value = money(pick(row, ['Valor']));
    const date = dateBR(pick(row, ['Data']));
    const due = dateBR(pick(row, ['Vencimento'])) || date;
    const type = String(pick(row, ['Tipo']) || 'OUTROS').trim() || 'OUTROS';
    const center = monthRef(pick(row, ['CUSTOS', 'Centro', 'Centro de custo']));
    const method = String(pick(row, ['Forma de Pg', 'Forma de Pagamento', 'Método']) || 'PIX').trim() || 'PIX';
    const status = String(pick(row, ['Status Pg', 'Status']) || 'À PAGAR').trim().toUpperCase() || 'À PAGAR';
    const nf = String(pick(row, ['NF-E', 'NF', 'NFe'])).trim();
    const texto = String(pick(row, ['Texto'])).trim();
    const notes = [nf ? `NF: ${nf}` : '', center ? `Ref ${center}` : '', texto].filter(Boolean).join(' · ');
    const importId = hashId('cost', [String(idx), desc, date, value, type, due, nf, method, texto]);
    out.push({
      importId,
      desc,
      type,
      center: center || 'Geral',
      date: date || '2026-01-01',
      due: due || date || '2026-01-01',
      method,
      value,
      status: /PAGO|QUITADO/.test(status) ? 'PAGO' : (/PARCELADO|PARCEL/.test(status) ? 'PARCELADO' : 'À PAGAR'),
      notes,
      monthRef: center
    });
  }
  return {
    version: 1,
    source: 'Controle de Custos (Notion)',
    kind: 'costs',
    count: out.length,
    records: out
  };
}

const jobs = [
  {
    csv: 'allon-honorarios.csv',
    out: 'allon-historico.json',
    meta: { prefix: 'allon', clinicId: 'allon', origin: 'Prestação', source: 'Allon Roter - Controle de Honorários (export Notion)' }
  },
  {
    csv: 'daniele-honorarios.csv',
    out: 'daniele-historico.json',
    meta: { prefix: 'dan', clinicId: 'daniele', origin: 'Prestação', source: 'Daniele Belmiro - Controle de Honorários (Notion)' }
  },
  {
    csv: 'gerlucia-honorarios.csv',
    out: 'gerlucia-historico.json',
    meta: { prefix: 'ger', clinicId: 'gerlucia', origin: 'Prestação', source: 'Gerlúcia - Controle de Honorários (Notion)' }
  },
  {
    csv: 'particular-honorarios.csv',
    out: 'particular-historico.json',
    meta: { prefix: 'par', clinicId: 'particular', origin: 'Particular', source: 'Particular - Controle de Honorários (Notion)' }
  }
];

const summary = [];
for (const job of jobs) {
  const data = convertHonorarios(path.join(IMPORTS, job.csv), job.meta);
  fs.writeFileSync(path.join(OUT, job.out), JSON.stringify(data, null, 2) + '\n');
  summary.push({ file: job.out, count: data.count });
}
const custos = convertCustos(path.join(IMPORTS, 'custos.csv'));
fs.writeFileSync(path.join(OUT, 'custos-historico.json'), JSON.stringify(custos, null, 2) + '\n');
summary.push({ file: 'custos-historico.json', count: custos.count });

const manifest = {
  version: 1,
  format: 'csv',
  importsDir: 'assets/data/imports',
  sources: [
    { id: 'allon', file: 'allon-historico.json', csv: 'imports/allon-honorarios.csv', flag: 'allonHistoricoV1', label: 'Allon Roter (honorários)', kind: 'patients', clinicId: 'allon' },
    { id: 'daniele', file: 'daniele-historico.json', csv: 'imports/daniele-honorarios.csv', flag: 'danieleHistoricoV1', label: 'Daniele Belmiro (honorários)', kind: 'patients', clinicId: 'daniele' },
    { id: 'gerlucia', file: 'gerlucia-historico.json', csv: 'imports/gerlucia-honorarios.csv', flag: 'gerluciaHistoricoV1', label: 'Gerlúcia (honorários)', kind: 'patients', clinicId: 'gerlucia' },
    { id: 'particular', file: 'particular-historico.json', csv: 'imports/particular-honorarios.csv', flag: 'particularHistoricoV1', label: 'Particular (honorários)', kind: 'patients', clinicId: 'particular' },
    { id: 'custos', file: 'custos-historico.json', csv: 'imports/custos.csv', flag: 'custosHistoricoV1', label: 'Controle de custos', kind: 'costs' }
  ]
};
fs.writeFileSync(path.join(OUT, 'historico-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
