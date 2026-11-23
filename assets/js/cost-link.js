/**
 * Vínculo NF-e × boletos em Custos.
 *
 * Problema: a NF-e lançada no estoque gera um custo ("NF-e 123 — Fornecedor") e os boletos
 * da mesma compra (quase sempre parcelados) entram de novo em Custos → duplicidade.
 *
 * Regra: cada boleto pode apontar para a NF-e que ele paga (boleto.nfeCostId = id do custo da NF).
 * A NF-e passa a contar só o saldo ainda não coberto por boletos:
 *     valor efetivo da NF = max(0, valor da NF − soma dos boletos vinculados)
 * Os boletos contam pelo valor deles (com os vencimentos reais). Nada é apagado.
 *
 * Correlação (sugestão, sempre confirmada pelo usuário):
 *   - fornecedor: nome do beneficiário × emitente da NF (sem LTDA/S.A etc.) e apelidos
 *     aprendidos em vínculos anteriores (ex.: "Dental Cremer" → "LSI S.A");
 *   - valor: fecha o saldo, é total ÷ N (parcelas iguais) ou bate com a parcela "2/5" do boleto;
 *   - datas: vencimento depois da emissão da NF (até 180 dias);
 *   - conjunto: combinação de boletos que soma o total da NF.
 */
(function (global) {
  'use strict';

  const STOP = new Set([
    'ltda', 'sa', 's', 'a', 'me', 'epp', 'eireli', 'cia', 'comercio', 'com', 'industria', 'ind',
    'produtos', 'prod', 'odontologicos', 'odontologico', 'odonto', 'hospitalares', 'medicos',
    'distribuidora', 'importacao', 'exportacao', 'de', 'da', 'do', 'das', 'dos', 'e', 'em',
    'banco', 'pagamentos', 'boleto',
  ]);

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function normName(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\bs\s*[./]\s*a\b\.?/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t && t.length > 1 && !STOP.has(t))
      .join(' ');
  }

  function nameScore(a, b) {
    const A = normName(a), B = normName(b);
    if (!A || !B) return 0;
    if (A === B) return 1;
    if (A.includes(B) || B.includes(A)) return 0.85;
    const ta = new Set(A.split(' ')), tb = new Set(B.split(' '));
    let inter = 0;
    ta.forEach((t) => { if (tb.has(t)) inter++; });
    return inter / Math.max(ta.size, tb.size);
  }

  function isNfeCost(c) {
    if (!c) return false;
    if (c.nfeCostId) return false; // é boleto vinculado
    return c.nfeKey !== undefined || !!c.nfeNumber || /^NF-e\b/i.test(String(c.desc || ''));
  }

  function isBoletoCost(c) {
    if (!c || isNfeCost(c)) return false;
    return !!c.boletoLine || /boleto/i.test(String(c.type || '')) || /boleto/i.test(String(c.method || ''));
  }

  function nfeNumberOf(c) {
    if (c.nfeNumber) return String(c.nfeNumber);
    const m = String(c.desc || '').match(/NF-e\s+(\d+)/i);
    return m ? m[1] : '';
  }

  /** Fornecedor da NF: campo gravado, registro em nfImports ou o texto depois do "—". */
  function nfeSupplierOf(c, nfImports) {
    if (c.nfeSupplier) return String(c.nfeSupplier);
    const list = Array.isArray(nfImports) ? nfImports : [];
    const num = nfeNumberOf(c);
    const hit = list.find((n) => (c.nfeKey && n.key === c.nfeKey) || (num && String(n.number) === num));
    if (hit?.supplier) return String(hit.supplier);
    const parts = String(c.desc || '').split(/\s+[—-]\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  /** Soma dos boletos vinculados por NF (Map nfId → soma). */
  function linkIndex(costs) {
    const idx = new Map();
    (costs || []).forEach((c) => {
      if (!c || !c.nfeCostId) return;
      idx.set(c.nfeCostId, round2((idx.get(c.nfeCostId) || 0) + Number(c.value || 0)));
    });
    return idx;
  }

  function linkedBoletos(nf, costs) {
    return (costs || []).filter((c) => c && c.nfeCostId === nf.id);
  }

  function remainingOf(nf, idx) {
    return round2(Math.max(0, Number(nf.value || 0) - (idx.get(nf.id) || 0)));
  }

  /** Valor que entra nos totais: NF conta só o que os boletos ainda não cobrem. */
  function effectiveValue(c, idx) {
    if (!c) return 0;
    if (isNfeCost(c) && idx && idx.has(c.id)) return remainingOf(c, idx);
    return Number(c.value || 0);
  }

  function parseInstallment(s) {
    const m = String(s || '').match(/(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i);
    if (!m) return null;
    const n = Number(m[1]), of = Number(m[2]);
    return of >= 1 && n >= 1 && n <= of ? { n, of } : null;
  }

  function daysBetween(a, b) {
    const da = Date.parse(a), db = Date.parse(b);
    if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
    return Math.round((db - da) / 86400000);
  }

  function aliasHit(aliases, boletoName, supplier) {
    const k = normName(boletoName), v = normName(supplier);
    if (!k || !v || !aliases) return false;
    const list = aliases[k];
    return Array.isArray(list) ? list.includes(v) : list === v;
  }

  /** Aprende que este beneficiário de boleto pertence a este fornecedor de NF. */
  function learnAlias(settings, boletoName, supplier) {
    const k = normName(boletoName), v = normName(supplier);
    if (!settings || !k || !v || k === v) return false;
    if (!settings.supplierAliases || typeof settings.supplierAliases !== 'object') settings.supplierAliases = {};
    const cur = settings.supplierAliases[k];
    const list = Array.isArray(cur) ? cur : (cur ? [cur] : []);
    if (!list.includes(v)) list.push(v);
    settings.supplierAliases[k] = list;
    return true;
  }

  /**
   * Pontua o quanto um boleto parece pagar uma NF.
   * @returns {{score:number, reasons:string[], fits:boolean}}
   */
  function scorePair(boleto, nf, ctx = {}) {
    const idx = ctx.idx || linkIndex(ctx.costs || []);
    const supplier = nfeSupplierOf(nf, ctx.nfImports);
    const nfTotal = Number(nf.value || 0);
    const own = boleto.nfeCostId === nf.id ? Number(boleto.value || 0) : 0;
    const remaining = round2(remainingOf(nf, idx) + own);
    const v = Number(boleto.value || 0);
    const reasons = [];
    let score = 0;

    const tol = Math.max(1, nfTotal * 0.03); // juros/frete pequenos
    const fits = v > 0 && v <= remaining + tol;
    if (!fits) return { score: -100, reasons: ['valor maior que o saldo da NF'], fits: false };

    if (aliasHit(ctx.aliases, boleto.desc, supplier)) {
      score += 50; reasons.push('mesmo fornecedor de vínculos anteriores');
    } else {
      const ns = nameScore(boleto.desc, supplier);
      if (ns >= 0.5) { score += Math.round(40 * ns); reasons.push('fornecedor parecido'); }
    }

    const near = (a, b) => Math.abs(a - b) <= Math.max(0.05, b * 0.005);
    const inst = parseInstallment(boleto.installment);
    if (near(v, remaining)) {
      score += 30; reasons.push(remaining < nfTotal - 0.01 ? 'fecha o saldo da NF' : 'mesmo valor da NF');
    } else if (inst && inst.of > 1 && near(v, nfTotal / inst.of)) {
      score += 30; reasons.push(`parcela ${inst.n}/${inst.of} do total`);
    } else {
      for (let k = 2; k <= 12; k++) {
        if (near(v, nfTotal / k)) { score += 22; reasons.push(`total ÷ ${k} parcelas`); break; }
      }
    }
    if (inst && inst.of > 1 && !reasons.some((r) => r.startsWith('parcela'))) {
      score += 5; reasons.push(`boleto parcelado (${inst.n}/${inst.of})`);
    }

    const siblings = (ctx.costs || []).filter((c) => c.nfeCostId === nf.id && c.id !== boleto.id);
    if (siblings.some((s) => near(Number(s.value || 0), v))) { score += 10; reasons.push('igual às outras parcelas'); }

    const nfDate = nf.date || '';
    const due = boleto.due || '';
    const d = nfDate && due ? daysBetween(nfDate, due) : null;
    if (d !== null) {
      if (d >= -3 && d <= 180) { score += 15; reasons.push('vence depois da emissão'); }
      else if (d < -3) { score -= 30; reasons.push('vence antes da emissão da NF'); }
    }
    return { score, reasons, fits: true };
  }

  function ctxFrom(state) {
    const costs = Array.isArray(state?.costs) ? state.costs : [];
    return {
      costs,
      idx: linkIndex(costs),
      nfImports: state?.nfImports || [],
      aliases: state?.settings?.supplierAliases || {},
    };
  }

  /** NFs que podem receber este boleto, da mais provável para a menos. */
  function suggestNfeForBoleto(boleto, state) {
    const ctx = ctxFrom(state);
    return ctx.costs
      .filter((c) => isNfeCost(c))
      .map((nf) => ({ nf, ...scorePair(boleto, nf, ctx) }))
      .filter((x) => x.fits)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Boletos (ainda sem vínculo) que provavelmente pagam esta NF.
   * Procura primeiro um conjunto que some exatamente o saldo (parcelado); senão, os mais prováveis.
   */
  function suggestBoletosForNfe(nf, state, opts = {}) {
    const ctx = ctxFrom(state);
    const exclude = opts.exclude || new Set();
    const remaining = remainingOf(nf, ctx.idx);
    if (remaining <= 0.01) return { remaining, ids: [], exact: false, candidates: [] };
    const candidates = ctx.costs
      .filter((c) => isBoletoCost(c) && !c.nfeCostId && !exclude.has(c.id))
      .map((b) => ({ b, ...scorePair(b, nf, ctx) }))
      .filter((x) => x.fits && x.score >= 15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 16);

    // subconjunto que soma o saldo (até 16 candidatos → 65 mil combinações)
    let best = null;
    const n = candidates.length;
    const tol = Math.max(0.05, remaining * 0.002);
    for (let mask = 1; mask < (1 << n); mask++) {
      let sum = 0, score = 0, count = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) { sum += Number(candidates[i].b.value || 0); score += candidates[i].score; count++; }
      }
      if (Math.abs(sum - remaining) <= tol) {
        const avg = score / count;
        if (!best || avg > best.avg || (avg === best.avg && count < best.count)) best = { mask, avg, count };
      }
    }
    if (best && best.avg >= 30) {
      const ids = candidates.filter((_, i) => best.mask & (1 << i)).map((x) => x.b.id);
      return { remaining, ids, exact: true, candidates };
    }
    // sem fechamento exato: os boletos fortes que cabem no saldo
    const ids = [];
    let acc = 0;
    candidates.filter((x) => x.score >= 45).forEach((x) => {
      const v = Number(x.b.value || 0);
      if (acc + v <= remaining + Math.max(1, remaining * 0.03)) { ids.push(x.b.id); acc += v; }
    });
    return { remaining, ids, exact: false, candidates };
  }

  /** Proposta para todas as NFs em aberto, sem repetir boleto entre NFs. */
  function reconcileAll(state) {
    const used = new Set();
    const nfs = (state?.costs || []).filter(isNfeCost)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const out = [];
    nfs.forEach((nf) => {
      const s = suggestBoletosForNfe(nf, state, { exclude: used });
      if (!s.ids.length) return;
      s.ids.forEach((id) => used.add(id));
      const sum = round2(s.ids.reduce((acc, id) => acc + Number((state.costs.find((c) => c.id === id) || {}).value || 0), 0));
      out.push({ nfId: nf.id, boletoIds: s.ids, exact: s.exact, sum, remaining: s.remaining });
    });
    return out;
  }

  /** Vincula (ou desvincula, com nfId vazio) um boleto a uma NF e aprende o apelido do fornecedor. */
  function setLink(state, boletoId, nfId) {
    const b = (state.costs || []).find((c) => c.id === boletoId);
    if (!b || isNfeCost(b)) return false;
    if (!nfId) {
      delete b.nfeCostId;
      delete b.nfeLabel;
      return true;
    }
    const nf = (state.costs || []).find((c) => c.id === nfId && isNfeCost(c));
    if (!nf) return false;
    b.nfeCostId = nf.id;
    b.nfeLabel = String(nf.desc || '');
    if (!state.settings || typeof state.settings !== 'object') state.settings = {};
    learnAlias(state.settings, b.desc, nfeSupplierOf(nf, state.nfImports));
    return true;
  }

  /** Ao excluir uma NF, os boletos dela voltam a ficar sem vínculo. */
  function unlinkAllFrom(state, nfId) {
    (state.costs || []).forEach((c) => {
      if (c.nfeCostId === nfId) { delete c.nfeCostId; delete c.nfeLabel; }
    });
  }

  global.ChevalierCostLink = {
    normName,
    nameScore,
    isNfeCost,
    isBoletoCost,
    nfeSupplierOf,
    nfeNumberOf,
    linkIndex,
    linkedBoletos,
    remainingOf,
    effectiveValue,
    parseInstallment,
    learnAlias,
    scorePair,
    suggestNfeForBoleto,
    suggestBoletosForNfe,
    reconcileAll,
    setLink,
    unlinkAllFrom,
  };
})(typeof window !== 'undefined' ? window : globalThis);
