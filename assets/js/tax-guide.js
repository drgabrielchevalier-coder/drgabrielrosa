/* Leitura de documentos de pagamento — Dr Gabriel Rosa
 * Identifica o tipo do documento pelo texto (PDF digital ou OCR de foto) e extrai os dados
 * de guias de tributo (DAS do Simples Nacional, DARF) para lançar em Contas a pagar.
 * Lógica pura (sem DOM): testada em scripts/test-fase8-guias.mjs.
 */
(function (global) {
  'use strict';

  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MONTHS_ASCII = MONTHS.map((m) => m.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }
  function fold(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function money(s) {
    const t = String(s || '').replace(/[^\d.,-]/g, '');
    if (!t) return null;
    const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
  function isoDate(br) {
    const m = String(br || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }
  /** Primeira data dd/mm/aaaa que aparece até `span` caracteres depois do rótulo. */
  function dateAfter(text, labelRe, span = 120) {
    const m = labelRe.exec(text);
    if (!m) return '';
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + span);
    const d = tail.match(/(\d{2}\/\d{2}\/\d{4})(?!\s*\d{2}:\d{2})/);
    return d ? isoDate(d[1]) : '';
  }

  /** Tipo do documento: 'das' | 'darf' | 'gps' | 'fgts' | 'nfe' | 'boleto' | 'unknown'. */
  function detectDocType(text) {
    const t = fold(text);
    if (/documento de arrecadacao\s+do simples nacional|\bdas\b.{0,40}simples nacional|pgdas/.test(t)) return 'das';
    if (/documento de arrecadacao\s+de receitas federais|\bdarf\b/.test(t)) return 'darf';
    if (/guia da previdencia social|\bgps\b.{0,30}inss/.test(t)) return 'gps';
    if (/\bfgts\b.{0,60}(guia|recolhimento)|guia do fgts|\bgrf\b|\bgfd\b/.test(t)) return 'fgts';
    if (/\bdanfe\b|documento auxiliar da nota fiscal|chave de acesso/.test(t)) return 'nfe';
    if (/linha digitavel|benefici[aá]rio|cedente|ficha de compensa|pagavel em|local de pagamento/.test(t)) return 'boleto';
    if (/\d{5}[.\s]?\d{5}\s+\d{5}[.\s]?\d{6}\s+\d{5}[.\s]?\d{6}\s+\d\s+\d{14}/.test(t)) return 'boleto';
    return 'unknown';
  }

  /** Código de arrecadação (48 dígitos, começa com 8), em 4 blocos de 11 + DV, com ou sem espaços. */
  function findArrecadacaoLine(text) {
    const m = String(text || '').match(/\b(8\d{10})[\s-]?(\d)\s+(\d{11})[\s-]?(\d)\s+(\d{11})[\s-]?(\d)\s+(\d{11})[\s-]?(\d)\b/);
    if (m) return m.slice(1).join('');
    const d = String(text || '').match(/\b8\d{47}\b/);
    return d ? d[0] : '';
  }
  /** Valor contido no código de arrecadação (posições 5–15 dos 44 dígitos do código de barras). */
  function valueFromArrecadacao(line48) {
    const d = onlyDigits(line48);
    if (d.length !== 48 || d[0] !== '8') return null;
    const bar = d.slice(0, 11) + d.slice(12, 23) + d.slice(24, 35) + d.slice(36, 47);
    if (!/^[6-9]$/.test(bar[2])) return null; // 6/8 = valor efetivo em reais
    const v = Number(bar.slice(4, 15)) / 100;
    return Number.isFinite(v) ? v : null;
  }

  function periodFrom(text) {
    const t = fold(text);
    const re = new RegExp(`\\b(${MONTHS_ASCII.join('|')})\\s*/\\s*(\\d{4})`);
    const m = t.match(re);
    if (m) {
      const i = MONTHS_ASCII.indexOf(m[1]);
      return { label: `${SHORT[i]}/${m[2]}`, ym: `${m[2]}-${String(i + 1).padStart(2, '0')}` };
    }
    const pa = t.match(/\bpa[:\s]*(\d{2})\/(\d{4})/) || t.match(/periodo de apuracao[^\d]{0,40}(\d{2})\/(\d{4})/);
    if (pa) {
      const i = Number(pa[1]) - 1;
      if (i >= 0 && i < 12) return { label: `${SHORT[i]}/${pa[2]}`, ym: `${pa[2]}-${pa[1]}` };
    }
    return { label: '', ym: '' };
  }

  /** Linhas "código denominação principal multa juros total" da composição do documento. */
  function compositionFrom(text) {
    const items = [];
    const re = /(?:^|\n)\s*(\d{4})\s+([^\n]*?[A-Za-zÀ-ú][^\n]*?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?=\n|$)/g;
    let m;
    while ((m = re.exec(text))) {
      items.push({
        code: m[1],
        name: m[2].replace(/\s+/g, ' ').trim(),
        principal: money(m[3]),
        multa: money(m[4]),
        juros: money(m[5]),
        total: money(m[6]),
      });
    }
    let totals = null;
    const tm = String(text).match(/totais\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    if (tm) totals = { principal: money(tm[1]), multa: money(tm[2]), juros: money(tm[3]), total: money(tm[4]) };
    return { items, totals };
  }

  function shortName(name) {
    return String(name || '')
      .replace(/\s*-\s*SIMPLES NACIONAL/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase())
      .replace(/\b(irpj|csll|cofins|pis|inss|iss|cp|irrf)\b/gi, (w) => w.toUpperCase());
  }

  /**
   * Guia de tributo (DAS/DARF/GPS/FGTS) → dados para Contas a pagar.
   * `text` de preferência com uma linha por linha visual (ver ChevalierScan.pdfTextLines).
   */
  function parseTaxGuide(text, kindHint) {
    const raw = String(text || '');
    const kind = kindHint || detectDocType(raw);
    const line = findArrecadacaoLine(raw);
    const barValue = valueFromArrecadacao(line);
    const { items, totals } = compositionFrom(raw);
    const period = periodFrom(raw);

    const docNumber = (raw.match(/\b\d{2}\.\d{2}\.\d{5}\.\d{7}-\d\b/) || [])[0] || '';
    const cnpj = (raw.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/) || [])[0] || '';
    const originalDue =
      dateAfter(raw, /vencimento\s*:/i, 20) || dateAfter(raw, /data de vencimento/i, 400);
    // "Pagar até:" (bloco PIX/código) é o prazo do documento; sem ele, a data mais tardia (fora carimbo de emissão)
    const allDates = [...raw.matchAll(/(\d{2}\/\d{2}\/\d{4})(?!\s*\d{2}:\d{2})/g)].map((m) => isoDate(m[1])).sort();
    const payUntil = dateAfter(raw, /pagar\s+at[eé]\s*:/i, 40) || allDates[allDates.length - 1] || originalDue;

    let value = barValue;
    if (value == null && totals) value = totals.total;
    if (value == null) {
      const vm = raw.match(/valor(?: total do documento)?\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (vm) value = money(vm[1]);
    }

    const sum = (k) => (totals ? totals[k] : items.reduce((s, i) => s + (i[k] || 0), 0));
    const principal = sum('principal');
    const multa = sum('multa');
    const juros = sum('juros');

    const label = { das: 'DAS Simples Nacional', darf: 'DARF', gps: 'GPS / INSS', fgts: 'FGTS' }[kind] || 'Guia de tributo';
    let desc = label;
    if (kind === 'darf' && items[0]) desc += ` ${items[0].code} · ${shortName(items[0].name)}`;
    if (period.label) desc += ` · ${period.label}`;

    const lateFees = Math.round(((multa || 0) + (juros || 0)) * 100) / 100;
    const notes = [
      docNumber ? `Nº doc ${docNumber}` : '',
      period.label ? `Apuração ${period.label}` : '',
      originalDue && originalDue !== payUntil ? `venc. original ${originalDue.split('-').reverse().join('/')}` : '',
      lateFees > 0 ? `principal ${fmt(principal)} + multa ${fmt(multa)} + juros ${fmt(juros)}` : '',
      items.length && kind === 'das' ? items.map((i) => `${i.code} ${shortName(i.name)} ${fmt(i.total)}`).join('; ') : '',
    ].filter(Boolean).join(' · ');

    return {
      docType: kind,
      label,
      desc,
      value: value == null ? null : Math.round(value * 100) / 100,
      due: payUntil,
      originalDue,
      period: period.ym,
      periodLabel: period.label,
      docNumber,
      cnpj,
      linha: line,
      principal: Math.round((principal || 0) * 100) / 100,
      multa: Math.round((multa || 0) * 100) / 100,
      juros: Math.round((juros || 0) * 100) / 100,
      items,
      notes,
      ok: value != null && value > 0,
    };
  }

  function fmt(n) {
    return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',');
  }

  global.ChevalierTaxGuide = {
    detectDocType,
    parseTaxGuide,
    findArrecadacaoLine,
    valueFromArrecadacao,
    isTaxKind: (k) => ['das', 'darf', 'gps', 'fgts'].includes(k),
  };
})(typeof window !== 'undefined' ? window : globalThis);
