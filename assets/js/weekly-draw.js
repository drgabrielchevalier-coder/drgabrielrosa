/* Retirada semanal (pró-labore) — Dr Gabriel Rosa
 * Separa o que entrou na semana em "envelopes":
 *   imposto (se o lançamento emite nota) → repor custos do caso → reserva (%) → livre para retirada.
 * Contas (boletos, guias reais e previstas) das próximas 4 semanas são provisionadas aos poucos nos fundos
 * (capital de giro e impostos); o que os fundos não cobrem sai do pró-labore. A sobra de cada semana acumula.
 * Lógica pura (sem DOM): testada em scripts/test-fase9-retirada.mjs.
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    taxRate: 6,         // % Simples Nacional sobre o faturamento com nota (Anexo III, faixa 1)
    reservePct: 10,     // % do que sobra depois de impostos e custos → reserva
    proLabore: 1521,    // pró-labore declarado (base do INSS/DARF)
    inssRate: 11,       // % INSS do sócio (DARF 1099)
    taxDueDay: 20,      // DAS e DARF vencem dia 20 do mês seguinte
    weekStart: 1,       // 1 = segunda-feira
    since: '2026-11-23', // início do controle (ISO)
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
   * Simula semana a semana desde o início do controle até a semana pedida:
   *   recebimentos → envelopes; fundos (giro, impostos) recebem a reposição/imposto e pagam as contas;
   *   cada conta em aberto das próximas 4 semanas é provisionada aos poucos (1/(semanas até vencer + 1));
   *   o que os fundos não cobrem sai do pró-labore; a sobra (ou falta) de cada semana acumula.
   * @param {{today:string, settings?:object, patients?:object[], costs?:object[], withdrawals?:object[], weekOffset?:number, effectiveValue?:(c:object)=>number}} input
   */
  function compute(input) {
    const cfg = settingsOf(input.settings);
    const baseToday = input.today;
    const today = input.weekOffset ? addDays(baseToday, 7 * input.weekOffset) : baseToday;
    const week = weekRange(today, cfg.weekStart);
    const since = cfg.since || weekRange(baseToday, cfg.weekStart).start;
    const firstWeek = weekRange(since, cfg.weekStart).start;
    const eff = typeof input.effectiveValue === 'function' ? input.effectiveValue : (c) => Number(c.value) || 0;
    const inRange = (d, a, b) => d && d >= a && d <= b;
    const HORIZON = 21; // dias depois do fim da semana (4 semanas no total)

    // recebimentos (desde o início do controle) já divididos nos envelopes
    const allReceipts = [];
    const invoicedByMonth = {};
    (input.patients || []).forEach((p) => {
      activePayments(p).forEach((pay) => {
        const d = String(pay.date).slice(0, 10);
        if (p.invoice) invoicedByMonth[ym(d)] = r2((invoicedByMonth[ym(d)] || 0) + Number(pay.amount));
        if (d < since) return;
        allReceipts.push({ patientId: p.id, name: p.name || '', clinicId: p.clinicId || '', date: d, amount: r2(pay.amount), invoice: !!p.invoice, ...splitReceipt(p, Number(pay.amount), cfg) });
      });
    });

    const inssMonthly = r2(cfg.proLabore * cfg.inssRate / 100);
    const inssWeekly = r2(inssMonthly * 12 / 52);

    // contas reais + guias previstas (DAS sobre notas do mês, DARF do pró-labore) ainda não lançadas
    const costs = (input.costs || []).filter((c) => c && !isNf(c));
    const realGuide = (docType, comp) => costs.some((c) => c.docType === docType && ym(c.period) === comp);
    const guides = [];
    const firstComp = ym(addDays(since, -31));
    const lastDay = addDays(week.end, HORIZON);
    const months = new Set(Object.keys(invoicedByMonth).filter((m) => m >= firstComp));
    for (let d = parse(firstComp + '-01'); iso(d) <= lastDay; d.setMonth(d.getMonth() + 1)) months.add(ym(iso(d)));
    [...months].sort().forEach((comp) => {
      const due = nextMonthDay(comp, cfg.taxDueDay);
      if (due < since) return;
      const base = invoicedByMonth[comp] || 0;
      if (base > 0) guides.push({ kind: 'das', label: `DAS previsto · ${monthLabel(comp)}`, competencia: comp, due, base, value: r2(base * cfg.taxRate / 100), real: realGuide('das', comp) });
      if (inssMonthly > 0 && comp >= ym(since)) guides.push({ kind: 'darf', label: `DARF INSS pró-labore · ${monthLabel(comp)}`, competencia: comp, due, base: cfg.proLabore, value: inssMonthly, real: realGuide('darf', comp) });
    });
    const bills = costs.map((c) => {
      const paid = String(c.status || '').toUpperCase() === 'PAGO';
      return { id: c.id, desc: c.desc || 'Custo', due: c.due || '', value: r2(eff(c)), tax: isTaxCost(c), estimated: false, paidAt: paid ? (paidDate(c) || c.due || since) : '' };
    }).filter((b) => b.due || b.paidAt);
    guides.filter((g) => !g.real).forEach((g) => bills.push({ id: `prev-${g.kind}-${g.competencia}`, desc: g.label, due: g.due, value: g.value, tax: true, estimated: true, paidAt: '' }));

    const weeksUntil = (due, wStart) => Math.max(0, Math.floor((parse(weekRange(due, cfg.weekStart).start) - parse(wStart)) / (7 * 86400000)));
    const withdrawalsAll = (input.withdrawals || []).map((x) => ({ ...x, date: String(x.date || '').slice(0, 10), value: Number(x.value) || 0 }));

    let giro = 0;
    let impostos = 0;
    let reserva = 0;
    let carry = 0;
    let out = null;
    for (let ws = firstWeek; ws <= week.start; ws = addDays(ws, 7)) {
      const we = addDays(ws, 6);
      const rec = allReceipts.filter((x) => inRange(x.date, ws, we));
      const t = {
        received: r2(rec.reduce((s2, x) => s2 + x.amount, 0)),
        tax: r2(rec.reduce((s2, x) => s2 + x.tax, 0)),
        costReserve: r2(rec.reduce((s2, x) => s2 + x.costReserve, 0)),
        reserve: r2(rec.reduce((s2, x) => s2 + x.reserve, 0)),
        free: r2(rec.reduce((s2, x) => s2 + x.free, 0)),
      };
      giro += t.costReserve;
      impostos += t.tax + inssWeekly;
      reserva += t.reserve;
      // pagamentos da semana saem dos fundos
      bills.forEach((b) => {
        if (!b.paidAt || !inRange(b.paidAt, ws, we) || b.paidAt < since) return;
        if (b.tax) impostos -= b.value; else giro -= b.value;
      });
      // contas em aberto no fim da semana, vencendo até 3 semanas depois (inclui atrasadas)
      const open = bills.filter((b) => b.due && b.due <= addDays(we, HORIZON) && !(b.paidAt && b.paidAt <= we) && !(b.paidAt && b.paidAt < since));
      let needOps = 0;
      let needTax = 0;
      open.forEach((b) => {
        const part = b.value / (weeksUntil(b.due, ws) + 1);
        if (b.tax) needTax += part; else needOps += part;
      });
      const contribOps = r2(Math.max(0, needOps - giro));
      const contribTax = r2(Math.max(0, needTax - impostos));
      giro += contribOps;
      impostos += contribTax;
      const weekResult = r2(t.free - inssWeekly - contribOps - contribTax);
      const wds = withdrawalsAll.filter((x) => inRange(x.date, ws, we));
      const withdrawn = r2(wds.reduce((s2, x) => s2 + x.value, 0));
      const carryIn = r2(carry);
      carry = r2(carry + weekResult - withdrawn);
      if (ws === week.start) {
        out = {
          receipts: rec.sort((a, b) => a.date.localeCompare(b.date)),
          totals: t,
          contribOps,
          contribTax,
          weekResult,
          carryIn,
          withdrawals: wds,
          withdrawn,
          bills: open.map((b) => ({ ...b, overdue: b.due < ws, thisWeek: b.due <= we, weeksLeft: weeksUntil(b.due, ws) })).sort((a, b) => a.due.localeCompare(b.due)),
        };
      }
    }
    if (!out) {
      // semana anterior ao início do controle
      out = { receipts: [], totals: { received: 0, tax: 0, costReserve: 0, reserve: 0, free: 0 }, contribOps: 0, contribTax: 0, weekResult: 0, carryIn: 0, withdrawals: [], withdrawn: 0, bills: [] };
      carry = 0;
    }
    const billsOps = r2(out.bills.filter((b) => !b.tax).reduce((s2, b) => s2 + b.value, 0));
    const billsTax = r2(out.bills.filter((b) => b.tax).reduce((s2, b) => s2 + b.value, 0));
    return {
      settings: cfg,
      since,
      week,
      beforeSince: week.start < firstWeek,
      ...out,
      inssWeekly,
      funds: { giro: r2(giro), impostos: r2(impostos), reserva: r2(reserva) },
      billsOps,
      billsTax,
      guides: guides.filter((g) => g.due >= week.start),
      available: r2(Math.max(0, carry)),
      shortfall: r2(Math.max(0, -carry)),
    };
  }

  global.ChevalierDraw = { DEFAULTS, weekRange, splitReceipt, compute, settingsOf };
})(typeof window !== 'undefined' ? window : globalThis);
