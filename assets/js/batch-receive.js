/**
 * Baixa em lote (repasse da clínica): lista "data · paciente · valor abatido" → baixas nos
 * honorários a receber existentes.
 *
 * - parseRows: lê tabela colada (Markdown com |, tabulação, ; ou CSV simples). Datas dd/mm ou dd/mm/aaaa.
 * - planBatch: cruza cada linha com os tratamentos em aberto do paciente (nome abreviado ou com grafia
 *   diferente: "Rafael" ↔ "Raphael Souza"), distribui o valor do mais antigo para o mais novo,
 *   NUNCA acima do saldo, e devolve a revisão (ok / escolher / não encontrado / excede saldo / já lançado).
 * - Tratamento que já consta como recebido mas sem baixas no histórico (importado como "Faturado / Recebido"):
 *   a linha vira "conciliação" — registra a baixa no histórico sem alterar o total recebido.
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

  const MONEY_RE = /^(R\$\s*)?\d[\d.]*(,\d{1,2})?$/;

  /**
   * Linhas coladas → [{line, date, name, amount, raw}] (ignora cabeçalho e separadores).
   * Aceita: Markdown (|), tabulação, ";", texto separado só por espaços ("03/11 Ana Souza R$ 138,87")
   * e tabela copiada com uma célula por linha (data / nome / valor em linhas seguidas).
   */
  function parseRows(text, today) {
    const out = [];
    let buf = null; // formato "uma célula por linha"
    const emit = (line, date, name, amount, raw) => {
      name = String(name || '').replace(/\s+/g, ' ').trim();
      if (!name || !(amount > 0)) return;
      out.push({ line, date, name, amount, raw });
    };
    String(text || '').split(/\r?\n/).forEach((rawLine, i) => {
      const line = rawLine.replace(/\*/g, '').trim();
      if (!line || /^\|?\s*:?-{2,}/.test(line)) return;
      const delimited = /[|\t;]/.test(line);
      if (delimited) {
        const cells = line.split(/[|\t;]/).map((c) => c.trim()).filter((c) => c !== '');
        let date = '', amount = NaN;
        const nameParts = [];
        cells.forEach((c) => {
          if (!date && isoDate(c, today)) { date = isoDate(c, today); return; }
          if (Number.isNaN(amount) && MONEY_RE.test(c)) { amount = money(c); return; }
          if (/[A-Za-zÀ-ú]/.test(c)) nameParts.push(c);
        });
        if (!Number.isNaN(amount) && nameParts.length) { buf = null; emit(i + 1, date, nameParts.join(' '), amount, rawLine); }
        return;
      }
      // uma linha com tudo, separado por espaços: "03/11 Ana Souza R$ 138,87"
      const m = line.match(/^(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(.+?)\s+((?:R\$\s*)?\d[\d.]*(?:,\d{1,2})?)$/);
      if (m && isoDate(m[1], today) && /[A-Za-zÀ-ú]/.test(m[2])) {
        buf = null;
        emit(i + 1, isoDate(m[1], today), m[2], money(m[3]), rawLine);
        return;
      }
      // uma célula por linha: data → nome → valor
      if (isoDate(line, today)) { buf = { line: i + 1, date: isoDate(line, today), name: '', raw: [rawLine] }; return; }
      if (buf && MONEY_RE.test(line) && buf.name) {
        buf.raw.push(rawLine);
        emit(buf.line, buf.date, buf.name, money(line), buf.raw.join(' · '));
        buf = null;
        return;
      }
      if (buf && /[A-Za-zÀ-ú]/.test(line)) { buf.name = (buf.name ? buf.name + ' ' : '') + line; buf.raw.push(rawLine); }
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
      // undocumented: valor que já consta como recebido sem baixa no histórico (ex.: importado como "Faturado / Recebido")
      const undoc = round2(Math.max(0, Number(c.undocumented || 0)));
      if (!(Number(c.balance) > 0.009) && !(undoc > 0.009)) return;
      if (!persons.has(c.personKey)) persons.set(c.personKey, { key: c.personKey, name: c.name, cases: [], paid: [] });
      persons.get(c.personKey).cases.push({ ...c, left: round2(c.balance), undoc, docBase: round2(Number(c.value || 0) - Number(c.balance || 0) - undoc) });
    });
    // baixas que já existem (inclusive de tratamentos quitados) para não lançar em dobro
    (cases || []).forEach((c) => {
      (c.payments || []).forEach((pay) => {
        if (!persons.has(c.personKey)) persons.set(c.personKey, { key: c.personKey, name: c.name, cases: [], paid: [] });
        persons.get(c.personKey).paid.push({ date: pay.date, amount: round2(pay.amount), label: c.label || '' });
      });
    });
    persons.forEach((p) => p.cases.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id))));

    // ordem cronológica (mesma data: ordem colada) — saldos vão sendo consumidos
    const order = rows.map((r, i) => i).sort((a, b) => String(rows[a].date || '').localeCompare(String(rows[b].date || '')) || a - b);
    const result = rows.map((r) => ({ ...r }));
    const candidatePool = [...persons.values()].filter((p) => p.cases.length || p.paid.length);
    order.forEach((i) => {
      const r = result[i];
      const ov = overrides[i];
      const scored = candidatePool
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
      // já existe baixa ativa desse paciente com a mesma data e valor (ex.: lançada à mão) → não repete
      const dup = r.date && person.paid.find((x) => !x.used && x.date === r.date && Math.abs(x.amount - r.amount) < 0.011);
      if (dup) { dup.used = true; r.status = 'already'; r.leftover = 0; r.alreadyIn = dup.label || ''; return; }
      let left = r.amount;
      person.cases.forEach((c) => {
        // 1º documenta o que já constava como recebido (não muda o total recebido); 2º baixa o saldo em aberto
        if (left > 0.009 && c.undoc > 0.009) {
          const take = round2(Math.min(left, c.undoc));
          const value = Number(c.value || 0);
          const docBefore = round2(value - c.docBase);
          r.allocations.push({ caseId: c.id, label: c.label || '', date: c.date, amount: take, kind: 'reconcile', before: docBefore, after: round2(docBefore - take) });
          c.undoc = round2(c.undoc - take);
          c.docBase = round2(c.docBase + take);
          left = round2(left - take);
        }
        if (left <= 0.009 || c.left <= 0.009) return;
        const take = round2(Math.min(left, c.left));
        r.allocations.push({ caseId: c.id, label: c.label || '', date: c.date, amount: take, kind: 'pay', before: c.left, after: round2(c.left - take) });
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
