/* Retirada semanal (pró-labore) — Dr Gabriel Rosa
 * Separa o que entrou na semana em "envelopes":
 *   imposto (se o lançamento emite nota) → repor custos do caso → reserva (%) → livre para retirada.
 * Depois desconta as contas da semana (boletos, guias reais e previstas) que os fundos acumulados
 * (capital de giro e impostos) não cobrem, e as retiradas já feitas. Cada semana começa do zero.
 * Lógica pura (sem DOM): testada em scripts/test-fase9-retirada.mjs.
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    taxRate: 15.5,      // % Simples Nacional sobre o faturamento com nota (Anexo V, faixa 1)
    reservePct: 10,     // % do que sobra depois de impostos e custos → reserva
    proLabore: 1521,    // pró-labore declarado (base do INSS/DARF)
    inssRate: 11,       // % INSS do sócio (DARF 1099)
    taxDueDay: 20,      // DAS e DARF vencem dia 20 do mês seguinte
    weekStart: 1,       // 1 = segunda-feira
    since: '',          // início do controle (ISO); vazio = início da semana atual
  };

  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12);
  };
  const addDays = (s, n) => {
    const d = parse(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  function weekRange(today, weekStart = 1) {
    const d = parse(today);
    const diff = (d.getDay() - weekStart + 7) % 7;
    const start = addDays(today, -diff);
    return { start, end: addDays(start, 6) };
  }

  function settingsOf(s) {
    const o = { ...DEFAULTS, ...(s || {}) };
    ['taxRate', 'reservePct', 'proLabore', 'inssRate', 'taxDueDay', 'weekStart'].forEach((k) => {
      o[k] = Number(o[k]);
      if (!Number.isFinite(o[k])) o[k] = DEFAULTS[k];
    });
    return o;
  }

  function activePayments(p) {
    return (Array.isArray(p && p.payments) ? p.payments : []).filter((pay) => {
      if (!pay || pay.voided) return false;
      const m = String(pay.mode || '').toLowerCase();
      return m !== 'estorno' && m !== 'void' && Number(pay.amount) > 0 && pay.date;
    });
  }

  /** Custo a repor por real recebido: materiais + laboratório + componentes (+ taxa de cartão no particular). */
  function caseCost(p) {
    const base = Number(p.cost || 0) + Number(p.lab || 0) + Number(p.components || 0);
    const card = /particular/i.test(String(p.origin || p.clinicId || '')) ? Number(p.clinical || 0) : 0;
    return Math.max(0, base + card);
  }

  /** Divide um recebimento nos envelopes. */
  function splitReceipt(p, amount, cfg) {
    const value = Number(p.value) || 0;
    const tax = p.invoice ? r2(amount * cfg.taxRate / 100) : 0;
    const share = value > 0 ? Math.min(1, amount / value) : 1;
    const costReserve = r2(Math.min(Math.max(0, amount - tax), caseCost(p) * share));
    const rest = Math.max(0, amount - tax - costReserve);
    const reserve = r2(rest * cfg.reservePct / 100);
    const free = r2(rest - reserve);
    return { tax, costReserve, reserve, free };
  }

  const isTaxCost = (c) => /imposto|tribut|das\b|darf|gps|fgts/i.test(`${c.type || ''} ${c.docType || ''}`) || ['das', 'darf', 'gps', 'fgts'].includes(c.docType);
  const isNf = (c) => c && (c.kind === 'nfe');
  const paidDate = (c) => c.paidAt || (String(c.status || '').toUpperCase() === 'PAGO' ? (c.due || c.date || '') : '');
  const ym = (s) => String(s || '').slice(0, 7);
  const nextMonthDay = (yyyymm, day) => {
    const [y, m] = yyyymm.split('-').map(Number);
    const d = new Date(y, m, Math.min(day, 28), 12); // m (0-based) = mês seguinte
    return iso(d);
  };
  const monthLabel = (yyyymm) => {
    const n = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [y, m] = yyyymm.split('-').map(Number);
    return `${n[m - 1]}/${y}`;
  };

  /**
   * @param {{today:string, settings?:object, patients?:object[], costs?:object[], withdrawals?:object[], weekOffset?:number, effectiveValue?:(c:object)=>number}} input
   */
  function compute(input) {
    const cfg = settingsOf(input.settings);
    const baseToday = input.today;
    const today = input.weekOffset ? addDays(baseToday, 7 * input.weekOffset) : baseToday;
    const week = weekRange(today, cfg.weekStart);
    const since = cfg.since || weekRange(baseToday, cfg.weekStart).start;
    const eff = typeof input.effectiveValue === 'function' ? input.effectiveValue : (c) => Number(c.value) || 0;
    const inRange = (d, a, b) => d && d >= a && d <= b;

    // 1) Recebimentos: semana e acumulado desde o início do controle
    const receipts = [];
    const acc = { tax: 0, costReserve: 0, reserve: 0 };
    const invoicedByMonth = {};
    (input.patients || []).forEach((p) => {
      activePayments(p).forEach((pay) => {
        const d = String(pay.date).slice(0, 10);
        const parts = splitReceipt(p, Number(pay.amount), cfg);
        if (p.invoice) invoicedByMonth[ym(d)] = r2((invoicedByMonth[ym(d)] || 0) + Number(pay.amount));
        if (inRange(d, since, week.end)) {
          acc.tax += parts.tax;
          acc.costReserve += parts.costReserve;
          acc.reserve += parts.reserve;
        }
        if (inRange(d, week.start, week.end)) {
          receipts.push({ patientId: p.id, name: p.name || '', clinicId: p.clinicId || '', date: d, amount: r2(pay.amount), invoice: !!p.invoice, ...parts });
        }
      });
    });
    receipts.sort((a, b) => a.date.localeCompare(b.date));
    const sum = (k) => r2(receipts.reduce((s, x) => s + x[k], 0));
    const totals = { received: sum('amount'), tax: sum('tax'), costReserve: sum('costReserve'), reserve: sum('reserve'), free: sum('free') };

    // 2) Provisão semanal do INSS do pró-labore (DARF mensal fixo ÷ semanas do mês)
    const inssMonthly = r2(cfg.proLabore * cfg.inssRate / 100);
    const inssWeekly = r2(inssMonthly * 12 / 52);
    const weeksElapsed = Math.max(1, Math.round((parse(week.end) - parse(since)) / (7 * 86400000)));

    // 3) Pagamentos feitos desde o início (saem dos fundos)
    const costs = (input.costs || []).filter((c) => c && !isNf(c));
    let paidOps = 0;
    let paidTax = 0;
    costs.forEach((c) => {
      const pd = paidDate(c);
      if (!inRange(pd, since, week.end) || String(c.status || '').toUpperCase() !== 'PAGO') return;
      if (isTaxCost(c)) paidTax += eff(c);
      else paidOps += eff(c);
    });

    const funds = {
      giro: r2(acc.costReserve - paidOps),
      impostos: r2(acc.tax + inssWeekly * weeksElapsed - paidTax),
      reserva: r2(acc.reserve),
    };

    // 4) Contas da semana: em aberto com vencimento até o fim da semana (inclui atrasadas)
    const bills = [];
    costs.forEach((c) => {
      if (String(c.status || '').toUpperCase() === 'PAGO' || !c.due || c.due > week.end) return;
      bills.push({ id: c.id, desc: c.desc || 'Custo', due: c.due, value: r2(eff(c)), tax: isTaxCost(c), overdue: c.due < week.start, estimated: false });
    });

    // 5) Guias previstas (DAS sobre notas do mês + DARF do pró-labore) que vencem até o fim da semana
    const guides = [];
    const realGuide = (docType, comp) => costs.some((c) => c.docType === docType && ym(c.period) === comp);
    const firstComp = ym(addDays(since, -31));
    const months = new Set(Object.keys(invoicedByMonth));
    for (let d = parse(firstComp + '-01'); iso(d) <= week.end; d.setMonth(d.getMonth() + 1)) months.add(ym(iso(d)));
    [...months].sort().forEach((comp) => {
      if (comp < firstComp) return;
      const due = nextMonthDay(comp, cfg.taxDueDay);
      const base = invoicedByMonth[comp] || 0;
      if (base > 0) guides.push({ kind: 'das', label: `DAS previsto · ${monthLabel(comp)}`, competencia: comp, due, base, value: r2(base * cfg.taxRate / 100), real: realGuide('das', comp) });
      if (inssMonthly > 0 && comp >= ym(since)) guides.push({ kind: 'darf', label: `DARF INSS pró-labore · ${monthLabel(comp)}`, competencia: comp, due, base: cfg.proLabore, value: inssMonthly, real: realGuide('darf', comp) });
    });
    guides.forEach((g) => {
      if (!g.real && g.due <= week.end && g.due >= since) bills.push({ id: `prev-${g.kind}-${g.competencia}`, desc: g.label, due: g.due, value: g.value, tax: true, overdue: g.due < week.start, estimated: true });
    });
    bills.sort((a, b) => a.due.localeCompare(b.due));
    const billsOps = r2(bills.filter((b) => !b.tax).reduce((s, b) => s + b.value, 0));
    const billsTax = r2(bills.filter((b) => b.tax).reduce((s, b) => s + b.value, 0));

    // 5) O que os fundos não cobrem sai da retirada
    const deficitOps = r2(Math.max(0, billsOps - Math.max(0, funds.giro)));
    const deficitTax = r2(Math.max(0, billsTax - Math.max(0, funds.impostos)));

    const withdrawals = (input.withdrawals || []).filter((w) => inRange(String(w.date || '').slice(0, 10), week.start, week.end));
    const withdrawn = r2(withdrawals.reduce((s, w) => s + (Number(w.value) || 0), 0));
    const beforeWithdrawals = r2(totals.free - inssWeekly - deficitOps - deficitTax);
    const available = r2(Math.max(0, beforeWithdrawals - withdrawn));

    return {
      settings: cfg,
      since,
      week,
      receipts,
      totals,
      inssWeekly,
      funds,
      bills,
      billsOps,
      billsTax,
      deficitOps,
      deficitTax,
      guides: guides.filter((g) => g.due >= week.start),
      withdrawals,
      withdrawn,
      beforeWithdrawals,
      available,
      shortfall: r2(Math.max(0, -beforeWithdrawals)),
    };
  }

  global.ChevalierDraw = { DEFAULTS, weekRange, splitReceipt, compute, settingsOf };
})(typeof window !== 'undefined' ? window : globalThis);
