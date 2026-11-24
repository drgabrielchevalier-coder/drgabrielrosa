/**
 * Baixa em lote (repasse da clínica): lista "data · paciente · valor abatido" → baixas nos
 * honorários a receber existentes.
 *
 * - parseRows: lê tabela colada (Markdown com |, tabulação, ; ou CSV simples). Datas dd/mm ou dd/mm/aaaa.
 * - planBatch: cruza cada linha com os tratamentos em aberto do paciente (nome abreviado ou com grafia
 *   diferente: "Rafael" ↔ "Raphael Souza"), distribui o valor do mais antigo para o mais novo,
 *   NUNCA acima do saldo, e devolve a revisão (ok / escolher / não encontrado / excede saldo).
 * Funções puras: quem grava as baixas é o app (applyReceivablePayment), após confirmação do usuário.
 */
(function (global) {
  'use strict';

  const PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokens(s) { return norm(s).split(' ').filter((t) => t && !PARTICLES.has(t)); }

  function money(v) {
    let s = String(v || '').replace(/R\$\s?/gi, '').replace(/\s/g, '').replace(/\*/g, '');
    if (!s) return NaN;
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? round2(n) : NaN;
  }

  function isoDate(v, today) {
    const m = String(v || '').replace(/\*/g, '').trim().match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
    if (!m) return '';
    const d = Number(m[1]), mo = Number(m[2]);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return '';
    const t = today || new Date().toISOString().slice(0, 10);
    let y = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : Number(t.slice(0, 4));
    let iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    // sem ano: data "no futuro" é do ano anterior (ex.: lançar em janeiro os repasses de dezembro)
    if (!m[3] && iso > t) iso = `${y - 1}${iso.slice(4)}`;
    return iso;
  }

  /** Linhas coladas → [{line, date, name, amount, raw}] (ignora cabeçalho e separadores). */
  function parseRows(text, today) {
    const out = [];
    String(text || '').split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      if (!line || /^\|?\s*:?-{2,}/.test(line)) return;
      let cells = line.includes('|') ? line.split('|') : line.includes('\t') ? line.split('\t') : line.split(/;|,(?=\s*[A-Za-zÀ-ú])|,(?=\s*R\$)/);
      cells = cells.map((c) => c.replace(/\*/g, '').trim()).filter((c) => c !== '');
      if (cells.length < 2) return;
      let date = '', amount = NaN;
      const nameParts = [];
      cells.forEach((c) => {
        if (!date && isoDate(c, today)) { date = isoDate(c, today); return; }
        if (Number.isNaN(amount) && /^(R\$\s*)?\d[\d.]*(,\d{1,2})?$/.test(c)) { amount = money(c); return; }
        if (/[A-Za-zÀ-ú]/.test(c)) nameParts.push(c);
      });
      const name = nameParts.join(' ').trim();
      if (!name || Number.isNaN(amount) || amount <= 0) return; // cabeçalho ("Data | Paciente | Valor") cai aqui
      out.push({ line: i + 1, date, name, amount, raw: line });
    });
    return out;
  }

  function editDistance(a, b, max = 2) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diag = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
        diag = tmp;
      }
    }
    return prev[b.length];
  }

  function tokenMatch(q, t) {
    if (q === t) return 1;
    if (q.length >= 3 && t.startsWith(q)) return 0.85; // abreviação: "Gab" → "Gabriela"
    if (q.length >= 5 && editDistance(q, t) <= (q.length >= 8 ? 2 : 1)) return 0.8; // "rafael" ↔ "rafaell" (uma letra)
    return 0;
  }

  /**
   * Quanto o nome digitado combina com o nome completo: todos os termos digitados precisam aparecer
   * (na ordem relativa do nome não importa). 0 = não combina.
   */
  function nameScore(query, fullName) {
    const q = tokens(query), f = tokens(fullName);
    if (!q.length || !f.length) return 0;
    let total = 0;
    const used = new Set();
    for (const qt of q) {
      let best = 0, bestIdx = -1;
      f.forEach((ft, idx) => {
        if (used.has(idx)) return;
        const s = tokenMatch(qt, ft);
        if (s > best) { best = s; bestIdx = idx; }
      });
      if (!best) return 0;
      used.add(bestIdx);
      total += best;
    }
    let score = total / q.length;
    if (tokenMatch(q[0], f[0])) score += 0.1; // primeiro nome confere
    if (q.length === f.length) score += 0.05;
    return round2(score);
  }

  /**
   * @param rows   parseRows()
   * @param cases  [{id, personKey, name, date, balance, label}] tratamentos com saldo em aberto
   * @param overrides { [rowIndex]: personKey | '__skip' }
   */
  function planBatch(rows, cases, overrides = {}) {
    const persons = new Map();
    (cases || []).forEach((c) => {
      if (!(Number(c.balance) > 0.009)) return;
      if (!persons.has(c.personKey)) persons.set(c.personKey, { key: c.personKey, name: c.name, cases: [] });
      persons.get(c.personKey).cases.push({ ...c, left: round2(c.balance) });
    });
    persons.forEach((p) => p.cases.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id))));

    // ordem cronológica (mesma data: ordem colada) — saldos vão sendo consumidos
    const order = rows.map((r, i) => i).sort((a, b) => String(rows[a].date || '').localeCompare(String(rows[b].date || '')) || a - b);
    const result = rows.map((r) => ({ ...r }));
    order.forEach((i) => {
      const r = result[i];
      const ov = overrides[i];
      const scored = [...persons.values()]
        .map((p) => ({ key: p.key, name: p.name, score: nameScore(r.name, p.name), open: round2(p.cases.reduce((s, c) => s + c.left, 0)) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || b.open - a.open);
      r.candidates = scored.slice(0, 8);
      r.allocations = [];
      r.leftover = r.amount;
      if (ov === '__skip') { r.status = 'skip'; return; }
      let key = ov || '';
      if (!key) {
        const top = scored[0];
        const tied = scored.filter((x) => top && x.score >= top.score - 0.05);
        if (top && tied.length === 1) key = top.key;
        else if (top) { r.status = 'ambiguous'; return; }
        else { r.status = 'unmatched'; return; }
      }
      const person = persons.get(key);
      if (!person) { r.status = 'unmatched'; return; }
      r.personKey = key;
      r.personName = person.name;
      let left = r.amount;
      person.cases.forEach((c) => {
        if (left <= 0.009 || c.left <= 0.009) return;
        const take = round2(Math.min(left, c.left));
        r.allocations.push({ caseId: c.id, label: c.label || '', date: c.date, amount: take, before: c.left, after: round2(c.left - take) });
        c.left = round2(c.left - take);
        left = round2(left - take);
      });
      r.leftover = round2(left);
      r.status = r.allocations.length ? (r.leftover > 0.009 ? 'excess' : 'ok') : 'nobalance';
    });
    const applied = round2(result.reduce((s, r) => s + r.allocations.reduce((t, a) => t + a.amount, 0), 0));
    const total = round2(result.reduce((s, r) => s + r.amount, 0));
    return { rows: result, total, applied, pending: round2(total - applied) };
  }

  global.ChevalierBatchReceive = { parseRows, nameScore, planBatch, money, isoDate, norm };
})(typeof window !== 'undefined' ? window : globalThis);
