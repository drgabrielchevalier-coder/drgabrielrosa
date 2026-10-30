/**
 * Motor de regras financeiras por clínica e procedimento (Fase 2).
 * Compatível com billing v1: shareMode procedure|percent|fixed + taxa cartão + reembolsos.
 * Novidades v2: mixed (fixo+%), regras por procedimento, feeSchedule por forma de pagamento,
 * vigência, memória de cálculo e snapshot imutável para novos lançamentos.
 */
(function (global) {
  const PAYMENT_METHODS = [
    { id: 'pix', label: 'Pix' },
    { id: 'cash', label: 'Dinheiro' },
    { id: 'transfer', label: 'Transferência' },
    { id: 'debit', label: 'Débito' },
    { id: 'credit', label: 'Crédito à vista' },
    { id: 'credit_installments', label: 'Crédito parcelado' },
    { id: 'boleto', label: 'Boleto' },
    { id: 'other', label: 'Outras' }
  ];

  const DEFAULT_FEE_SCHEDULE = [
    { method: 'pix', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor' },
    { method: 'cash', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor' },
    { method: 'transfer', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor' },
    { method: 'debit', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor' },
    { method: 'credit', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor' },
    { method: 'credit_installments', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor', installmentsMin: 2, installmentsMax: 12 },
    { method: 'boleto', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor' },
    { method: 'other', feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor' }
  ];

  const DEFAULT_PAYOUT = {
    mode: 'after_days',
    daysAfter: 30,
    fixedDay: 10,
    notes: ''
  };

  const DEFAULT_BILLING = {
    version: 2,
    shareMode: 'procedure',
    professionalPercent: 50,
    fixedAmount: 0,
    cardFeeEnabled: false,
    cardFeePercent: 0,
    cardFeeOn: 'share',
    cardFeePaidBy: 'doctor',
    materialsPaidBy: 'doctor',
    reimburseComponents: false,
    reimburseMaterials: false,
    reimburseLab: false,
    notes: '',
    aiSummary: '',
    examplePracticed: 3000,
    exampleComponents: 200,
    exampleMaterials: 0,
    exampleLab: 0,
    procedureRules: [],
    feeSchedule: DEFAULT_FEE_SCHEDULE.map((x) => ({ ...x })),
    payout: { ...DEFAULT_PAYOUT }
  };

  function round2(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 100) / 100;
  }

  function clampPct(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(100, x));
  }

  function clampMoney(n) {
    const x = Number(n);
    if (!Number.isFinite(x) || x < 0) return 0;
    return round2(x);
  }

  function normalizeFeeRow(row) {
    const r = row && typeof row === 'object' ? row : {};
    const method = PAYMENT_METHODS.some((m) => m.id === r.method) ? r.method : 'other';
    const feeBase = ['practiced', 'share', 'gross'].includes(r.feeBase) ? r.feeBase : 'share';
    const paidBy = ['doctor', 'clinic', 'split'].includes(r.paidBy) ? r.paidBy : 'doctor';
    return {
      method,
      feePercent: clampPct(r.feePercent),
      feeFixed: clampMoney(r.feeFixed),
      feeBase: feeBase === 'gross' ? 'share' : feeBase,
      paidBy,
      installmentsMin: Math.max(1, Number(r.installmentsMin) || 1),
      installmentsMax: Math.max(1, Number(r.installmentsMax) || 12)
    };
  }

  function normalizeFeeSchedule(list) {
    const incoming = Array.isArray(list) ? list : [];
    const map = Object.fromEntries(incoming.map((r) => [r.method, normalizeFeeRow(r)]));
    return DEFAULT_FEE_SCHEDULE.map((d) => map[d.method] || { ...d });
  }

  function normalizePayout(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const mode = ['after_days', 'weekly', 'biweekly', 'monthly', 'fixed_day', 'custom'].includes(p.mode)
      ? p.mode
      : 'after_days';
    return {
      mode,
      daysAfter: Math.max(0, Number(p.daysAfter) || 0),
      fixedDay: Math.min(28, Math.max(1, Number(p.fixedDay) || 10)),
      notes: String(p.notes || '')
    };
  }

  function normalizeProcedureRule(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const mode = ['procedure', 'percent', 'fixed', 'mixed'].includes(r.shareMode) ? r.shareMode : '';
    return {
      id: String(r.id || ''),
      procedureId: String(r.procedureId || ''),
      shareMode: mode || undefined,
      professionalPercent: r.professionalPercent != null ? clampPct(r.professionalPercent) : undefined,
      fixedAmount: r.fixedAmount != null ? clampMoney(r.fixedAmount) : undefined,
      cardFeeEnabled: r.cardFeeEnabled != null ? !!r.cardFeeEnabled : undefined,
      cardFeePercent: r.cardFeePercent != null ? clampPct(r.cardFeePercent) : undefined,
      cardFeeOn: r.cardFeeOn === 'practiced' || r.cardFeeOn === 'share' ? r.cardFeeOn : undefined,
      cardFeePaidBy: ['doctor', 'clinic', 'split'].includes(r.cardFeePaidBy) ? r.cardFeePaidBy : undefined,
      materialsPaidBy: ['doctor', 'clinic'].includes(r.materialsPaidBy) ? r.materialsPaidBy : undefined,
      reimburseComponents: r.reimburseComponents != null ? !!r.reimburseComponents : undefined,
      reimburseMaterials: r.reimburseMaterials != null ? !!r.reimburseMaterials : undefined,
      reimburseLab: r.reimburseLab != null ? !!r.reimburseLab : undefined,
      validFrom: String(r.validFrom || ''),
      validTo: String(r.validTo || ''),
      notes: String(r.notes || '')
    };
  }

  function normalizeBilling(raw) {
    const b = { ...DEFAULT_BILLING, ...(raw && typeof raw === 'object' ? raw : {}) };
    const mode = ['procedure', 'percent', 'fixed', 'mixed'].includes(b.shareMode) ? b.shareMode : 'procedure';
    const paidBy = ['doctor', 'clinic'].includes(b.materialsPaidBy) ? b.materialsPaidBy : 'doctor';
    const feeOn = b.cardFeeOn === 'practiced' ? 'practiced' : 'share';
    const feePaidBy = ['doctor', 'clinic', 'split'].includes(b.cardFeePaidBy) ? b.cardFeePaidBy : 'doctor';
    return {
      version: 2,
      shareMode: mode,
      professionalPercent: clampPct(b.professionalPercent),
      fixedAmount: clampMoney(b.fixedAmount),
      cardFeeEnabled: !!b.cardFeeEnabled,
      cardFeePercent: clampPct(b.cardFeePercent),
      cardFeeOn: feeOn,
      cardFeePaidBy: feePaidBy,
      materialsPaidBy: paidBy,
      reimburseComponents: !!b.reimburseComponents,
      reimburseMaterials: !!b.reimburseMaterials,
      reimburseLab: !!b.reimburseLab,
      notes: String(b.notes || ''),
      aiSummary: String(b.aiSummary || ''),
      examplePracticed: clampMoney(b.examplePracticed),
      exampleComponents: clampMoney(b.exampleComponents),
      exampleMaterials: clampMoney(b.exampleMaterials),
      exampleLab: clampMoney(b.exampleLab),
      procedureRules: Array.isArray(b.procedureRules)
        ? b.procedureRules.map(normalizeProcedureRule).filter((r) => r.procedureId)
        : [],
      feeSchedule: normalizeFeeSchedule(b.feeSchedule),
      payout: normalizePayout(b.payout)
    };
  }

  function clinicBilling(clinic) {
    return normalizeBilling(clinic && clinic.billing);
  }

  function dateInRange(asOf, from, to) {
    if (!asOf) return true;
    if (from && asOf < from) return false;
    if (to && asOf > to) return false;
    return true;
  }

  /**
   * Precedência: exceção do atendimento → regra do procedimento (vigente) → padrão da clínica.
   */
  function resolveEffectiveBilling(billing, opts = {}) {
    const base = normalizeBilling(billing);
    if (opts.exception && typeof opts.exception === 'object') {
      const merged = normalizeBilling({ ...base, ...opts.exception, procedureRules: base.procedureRules, feeSchedule: base.feeSchedule, payout: base.payout });
      return { billing: merged, ruleSource: 'exception', ruleRef: opts.exception };
    }
    const procedureId = String(opts.procedureId || '');
    if (procedureId) {
      const asOf = String(opts.asOf || '');
      const hit = (base.procedureRules || []).find(
        (r) => r.procedureId === procedureId && dateInRange(asOf, r.validFrom, r.validTo)
      );
      if (hit) {
        const overlay = {};
        [
          'shareMode',
          'professionalPercent',
          'fixedAmount',
          'cardFeeEnabled',
          'cardFeePercent',
          'cardFeeOn',
          'cardFeePaidBy',
          'materialsPaidBy',
          'reimburseComponents',
          'reimburseMaterials',
          'reimburseLab'
        ].forEach((k) => {
          if (hit[k] !== undefined) overlay[k] = hit[k];
        });
        const merged = normalizeBilling({ ...base, ...overlay });
        return { billing: merged, ruleSource: 'procedure', ruleRef: hit };
      }
    }
    return { billing: base, ruleSource: 'clinic', ruleRef: null };
  }

  function isCardLikeMethod(method) {
    return method === 'credit' || method === 'credit_installments' || method === 'debit';
  }

  function feeForPayment(billing, opts = {}) {
    const b = normalizeBilling(billing);
    const method = String(opts.paymentMethod || '');
    const installments = Math.max(1, Number(opts.installments) || 1);

    // Sem forma de pagamento: comportamento legado (cardFeeEnabled).
    if (!method) {
      if (!b.cardFeeEnabled || b.cardFeePercent <= 0) {
        return { feePercent: 0, feeFixed: 0, feeBase: b.cardFeeOn, paidBy: b.cardFeePaidBy, applied: false, reason: 'legacy_off' };
      }
      return {
        feePercent: b.cardFeePercent,
        feeFixed: 0,
        feeBase: b.cardFeeOn,
        paidBy: b.cardFeePaidBy,
        applied: true,
        reason: 'legacy_card'
      };
    }

    // Pix / dinheiro / transferência: nunca herdam taxa de cartão legado.
    if (method === 'pix' || method === 'cash' || method === 'transfer') {
      const row = (b.feeSchedule || []).find((f) => f.method === method) || { feePercent: 0, feeFixed: 0 };
      return {
        feePercent: clampPct(row.feePercent),
        feeFixed: clampMoney(row.feeFixed),
        feeBase: row.feeBase || 'share',
        paidBy: row.paidBy || 'doctor',
        applied: (row.feePercent || 0) > 0 || (row.feeFixed || 0) > 0,
        reason: 'method_schedule'
      };
    }

    const row =
      (b.feeSchedule || []).find((f) => {
        if (f.method !== method) return false;
        if (method === 'credit_installments') {
          return installments >= (f.installmentsMin || 2) && installments <= (f.installmentsMax || 12);
        }
        return true;
      }) || null;

    if (row && ((row.feePercent || 0) > 0 || (row.feeFixed || 0) > 0)) {
      return {
        feePercent: clampPct(row.feePercent),
        feeFixed: clampMoney(row.feeFixed),
        feeBase: row.feeBase || 'share',
        paidBy: row.paidBy || 'doctor',
        applied: true,
        reason: 'method_schedule'
      };
    }

    // Fallback legado só para métodos de cartão/débito
    if (isCardLikeMethod(method) && b.cardFeeEnabled && b.cardFeePercent > 0) {
      return {
        feePercent: b.cardFeePercent,
        feeFixed: 0,
        feeBase: b.cardFeeOn,
        paidBy: b.cardFeePaidBy,
        applied: true,
        reason: 'legacy_card_fallback'
      };
    }

    return { feePercent: 0, feeFixed: 0, feeBase: 'share', paidBy: 'doctor', applied: false, reason: 'none' };
  }

  function computeGrossShare(b, opts) {
    const practiced = clampMoney(opts.practiced);
    if (b.shareMode === 'fixed') return clampMoney(b.fixedAmount);
    if (b.shareMode === 'percent') return round2(practiced * (b.professionalPercent / 100));
    if (b.shareMode === 'mixed') {
      return round2(clampMoney(b.fixedAmount) + practiced * (b.professionalPercent / 100));
    }
    // procedure: usa baseShare já calculado pelas fichas clinicPrices
    if (opts.baseShare != null && Number.isFinite(Number(opts.baseShare))) {
      return clampMoney(opts.baseShare);
    }
    return round2(practiced * (b.professionalPercent / 100));
  }

  /**
   * @param {object} opts
   * @param {number} opts.practiced
   * @param {number} [opts.baseShare]
   * @param {number} [opts.components]
   * @param {number} [opts.materials]
   * @param {number} [opts.lab]
   * @param {string} [opts.paymentMethod]
   * @param {number} [opts.installments]
   * @param {string} [opts.procedureId]
   * @param {string} [opts.asOf]
   * @param {object} [opts.exception] — ajuste excepcional do atendimento (não altera o contrato)
   */
  function settleCase(opts, billing) {
    const resolved = resolveEffectiveBilling(billing, opts || {});
    const b = resolved.billing;
    const practiced = clampMoney(opts && opts.practiced);
    const components = clampMoney(opts && opts.components);
    const materials = clampMoney(opts && opts.materials);
    const lab = clampMoney(opts && opts.lab);
    const steps = [];

    const grossShare = computeGrossShare(b, { practiced, baseShare: opts && opts.baseShare });
    steps.push({
      code: 'gross',
      label:
        b.shareMode === 'fixed'
          ? `Honorário fixo ${fmt(b.fixedAmount)}`
          : b.shareMode === 'percent'
            ? `${b.professionalPercent}% de ${fmt(practiced)}`
            : b.shareMode === 'mixed'
              ? `Fixo ${fmt(b.fixedAmount)} + ${b.professionalPercent}% de ${fmt(practiced)}`
              : 'Honorário conforme ficha do procedimento',
      amount: grossShare
    });

    const feeCfg = feeForPayment(b, opts || {});
    let cardFee = 0;
    if (feeCfg.applied && (feeCfg.feePercent > 0 || feeCfg.feeFixed > 0)) {
      const base = feeCfg.feeBase === 'practiced' ? practiced : grossShare;
      cardFee = round2(base * (feeCfg.feePercent / 100) + feeCfg.feeFixed);
      if (feeCfg.paidBy === 'clinic') {
        steps.push({ code: 'fee_clinic', label: `Taxa ${feeCfg.feePercent}% (clínica assume)`, amount: 0, fee: cardFee });
        cardFee = 0;
      } else if (feeCfg.paidBy === 'split') {
        cardFee = round2(cardFee / 2);
        steps.push({
          code: 'fee_split',
          label: `Taxa ${feeCfg.feePercent}% rateada (50% profissional)`,
          amount: -cardFee
        });
      } else {
        steps.push({
          code: 'fee_doctor',
          label: `− Taxa ${feeCfg.feePercent}%${feeCfg.feeFixed ? ` + ${fmt(feeCfg.feeFixed)}` : ''} sobre ${feeCfg.feeBase === 'practiced' ? 'praticado' : 'honorário'}`,
          amount: -cardFee
        });
      }
    } else {
      steps.push({ code: 'fee_none', label: 'Sem taxa de pagamento nesta condição', amount: 0 });
    }

    const netShare = round2(Math.max(0, grossShare - cardFee));
    steps.push({ code: 'net', label: 'Honorário líquido', amount: netShare });

    const reimburse =
      (b.reimburseComponents ? components : 0) +
      (b.reimburseMaterials ? materials : 0) +
      (b.reimburseLab ? lab : 0);
    const reimbursement = round2(reimburse);
    if (reimbursement > 0) {
      steps.push({ code: 'reimburse', label: 'Reembolso de despesas', amount: reimbursement });
    }

    const receivable = round2(netShare + reimbursement);
    steps.push({ code: 'receivable', label: 'Total a receber', amount: receivable });

    let costMaterials = materials;
    let costComponents = components;
    let costLab = lab;
    if (b.materialsPaidBy === 'clinic' || b.reimburseMaterials) costMaterials = 0;
    if (b.reimburseComponents) costComponents = 0;
    if (b.reimburseLab) costLab = 0;
    if (b.materialsPaidBy === 'clinic') {
      costMaterials = 0;
      if (!b.reimburseComponents) costComponents = 0;
    }

    const costs = {
      materials: round2(costMaterials),
      components: round2(costComponents),
      lab: round2(costLab),
      total: round2(costMaterials + costComponents + costLab)
    };
    const profit = round2(receivable - costs.total);
    steps.push({ code: 'profit', label: 'Resultado operacional', amount: profit });

    const ruleSnap = {
      shareMode: b.shareMode,
      professionalPercent: b.professionalPercent,
      fixedAmount: b.fixedAmount,
      cardFeeEnabled: b.cardFeeEnabled,
      cardFeePercent: b.cardFeePercent,
      cardFeeOn: b.cardFeeOn,
      cardFeePaidBy: b.cardFeePaidBy,
      materialsPaidBy: b.materialsPaidBy,
      reimburseComponents: b.reimburseComponents,
      reimburseMaterials: b.reimburseMaterials,
      reimburseLab: b.reimburseLab,
      paymentMethod: String((opts && opts.paymentMethod) || ''),
      installments: Number((opts && opts.installments) || 0) || null,
      procedureId: String((opts && opts.procedureId) || ''),
      ruleSource: resolved.ruleSource
    };

    return {
      practiced,
      grossShare,
      honorariumGross: grossShare,
      cardFee,
      netShare,
      honorariumNet: netShare,
      reimbursement,
      receivable,
      costs,
      profit,
      fee: feeCfg,
      ruleSource: resolved.ruleSource,
      ruleSnap,
      calcSteps: steps
    };
  }

  function formulaLines(billing) {
    const b = normalizeBilling(billing);
    const lines = [];
    if (b.shareMode === 'fixed') {
      lines.push(`Honorário fixo: ${fmt(b.fixedAmount)}`);
    } else if (b.shareMode === 'percent') {
      lines.push(`${b.professionalPercent}% do valor praticado para você`);
    } else if (b.shareMode === 'mixed') {
      lines.push(`Fixo ${fmt(b.fixedAmount)} + ${b.professionalPercent}% do praticado`);
    } else {
      lines.push('Parte do procedimento (valor fechado ou % por ficha)');
    }
    if (b.cardFeeEnabled && b.cardFeePercent > 0) {
      lines.push(
        b.cardFeeOn === 'practiced'
          ? `− ${b.cardFeePercent}% de cartão sobre o valor praticado (${b.cardFeePaidBy === 'clinic' ? 'clínica' : b.cardFeePaidBy === 'split' ? 'rateado' : 'profissional'})`
          : `− ${b.cardFeePercent}% de cartão sobre a sua parte (${b.cardFeePaidBy === 'clinic' ? 'clínica' : b.cardFeePaidBy === 'split' ? 'rateado' : 'profissional'})`
      );
    } else {
      lines.push('Sem desconto de taxa de cartão (legado)');
    }
    const credit = (b.feeSchedule || []).find((f) => f.method === 'credit' && f.feePercent > 0);
    if (credit) lines.push(`Crédito à vista: ${credit.feePercent}%`);
    const inst = (b.feeSchedule || []).find((f) => f.method === 'credit_installments' && f.feePercent > 0);
    if (inst) lines.push(`Crédito parcelado: ${inst.feePercent}%`);
    if (b.reimburseComponents) lines.push('+ Reembolso dos componentes');
    if (b.reimburseMaterials) lines.push('+ Reembolso dos materiais');
    if (b.reimburseLab) lines.push('+ Reembolso do laboratório');
    if (b.materialsPaidBy === 'clinic') {
      lines.push('Materiais por conta da clínica');
    } else if (!b.reimburseMaterials && !b.reimburseComponents) {
      lines.push('Materiais/componentes por sua conta');
    }
    if ((b.procedureRules || []).length) {
      lines.push(`${b.procedureRules.length} regra(s) específica(s) por procedimento`);
    }
    return lines;
  }

  function fmt(n) {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
    } catch (_) {
      return 'R$ ' + (Number(n) || 0).toFixed(2);
    }
  }

  function humanSummary(billing, clinicName) {
    const b = normalizeBilling(billing);
    const name = clinicName || 'a clínica';
    const parts = formulaLines(b);
    const ex = settleCase(
      {
        practiced: b.examplePracticed || 3000,
        baseShare:
          b.shareMode === 'procedure'
            ? (b.examplePracticed || 3000) * ((b.professionalPercent || 50) / 100)
            : undefined,
        components: b.exampleComponents,
        materials: b.exampleMaterials,
        lab: b.exampleLab
      },
      b
    );
    return {
      title: `Modelo · ${name}`,
      bullets: parts,
      example: `Ex.: praticado ${fmt(ex.practiced)} → você recebe ${fmt(ex.receivable)} (líquido ${fmt(ex.netShare)} + reembolso ${fmt(ex.reimbursement)})`,
      settlement: ex
    };
  }

  function chipLabels(billing) {
    const b = normalizeBilling(billing);
    const chips = [];
    if (b.shareMode === 'percent') chips.push(`${b.professionalPercent}%`);
    else if (b.shareMode === 'fixed') chips.push('Valor fechado');
    else if (b.shareMode === 'mixed') chips.push(`Fixo+${b.professionalPercent}%`);
    else chips.push('Por procedimento');
    chips.push(b.cardFeeEnabled && b.cardFeePercent > 0 ? `Cartão −${b.cardFeePercent}%` : 'Sem taxa cartão');
    if (b.reimburseComponents || b.reimburseMaterials) chips.push('Reembolsa material');
    else if (b.materialsPaidBy === 'clinic') chips.push('Clínica paga material');
    else chips.push('Você paga material');
    if ((b.procedureRules || []).length) chips.push(`${b.procedureRules.length} regra(s)`);
    return chips;
  }

  function payoutLabel(billing) {
    const p = normalizeBilling(billing).payout;
    if (p.mode === 'weekly') return 'Fechamento semanal';
    if (p.mode === 'biweekly') return 'Fechamento quinzenal';
    if (p.mode === 'monthly') return 'Fechamento mensal';
    if (p.mode === 'fixed_day') return `Dia fixo ${p.fixedDay}`;
    if (p.mode === 'custom') return p.notes || 'Prazo personalizado';
    return `${p.daysAfter} dia(s) após o procedimento`;
  }

  /** Local NL → billing (fallback sem OpenAI). */
  function parseRuleLocal(text) {
    const t = String(text || '').toLowerCase();
    const b = normalizeBilling({});
    b.notes = String(text || '').trim();

    const pcts = [...t.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
    const cardMatch = t.match(/cart[aã]o[^0-9]{0,20}(\d{1,3})\s*%|taxa[^0-9]{0,12}(\d{1,3})\s*%|descont[oa][^0-9]{0,12}(\d{1,3})\s*%/);
    const fixedMatch = t.match(/(?:r\$\s*|recebo\s*)(\d+[.,]?\d*)/);

    if (
      /cinquenta|50\s*%\s*(?:pra|para|pro|para o)?\s*(?:mim|profissional|cirurgi[aã]o|voc[eê])/.test(t) ||
      (pcts.includes(50) && /profissional|mim|eu recebo|pra mim/.test(t))
    ) {
      b.shareMode = 'percent';
      b.professionalPercent = 50;
    } else if (pcts.length) {
      const pro = pcts.find((p) => p > 0 && p <= 100);
      if (pro != null && /%/.test(t)) {
        b.shareMode = 'percent';
        b.professionalPercent = pro;
      }
    }

    if (/valor fechado|honor[aá]rio fixo|recebo\s+r\$/.test(t) && fixedMatch) {
      b.shareMode = 'fixed';
      b.fixedAmount = Number(String(fixedMatch[1]).replace(',', '.'));
    }

    if (/fixo\s*\+|mais\s+\d+\s*%|r\$.*%/.test(t) && fixedMatch && pcts.length) {
      b.shareMode = 'mixed';
      b.fixedAmount = Number(String(fixedMatch[1]).replace(',', '.'));
      b.professionalPercent = pcts.find((p) => p > 0 && p < 100) || b.professionalPercent;
    }

    if (/n[aã]o\s+descont|sem\s+taxa|n[aã]o\s+desconta\s+taxa|isento.*cart[aã]o/.test(t)) {
      b.cardFeeEnabled = false;
      b.cardFeePercent = 0;
    } else if (/cart[aã]o|taxa\s+de\s+cart|maquininha|credito|crédito/.test(t)) {
      b.cardFeeEnabled = true;
      const fee = Number(cardMatch?.[1] || cardMatch?.[2] || cardMatch?.[3] || 0);
      b.cardFeePercent = fee || pcts.find((p) => p === 10) || 10;
      b.cardFeeOn = /sobre\s+o\s+valor\s+praticado|do\s+total/.test(t) ? 'practiced' : 'share';
      const creditRow = b.feeSchedule.find((f) => f.method === 'credit');
      if (creditRow) {
        creditRow.feePercent = b.cardFeePercent;
        creditRow.feeBase = b.cardFeeOn;
      }
    }

    if (
      /reembols|paga\s+(?:o\s+)?(?:material|componente)|devolve\s+(?:o\s+)?(?:material|componente)|cl[ií]nica\s+(?:ainda\s+)?(?:me\s+)?paga/.test(
        t
      )
    ) {
      b.reimburseComponents = /componente|implante|parafuso|pilar|transfer|tudo|material/.test(t) || true;
      if (/material|biomaterial|enxerto/.test(t)) b.reimburseMaterials = true;
      if (/lab|pr[oó]tese|laborat/.test(t)) b.reimburseLab = true;
      b.materialsPaidBy = 'clinic';
    } else if (/material\s+por\s+(?:minha|sua)\s+conta|eu\s+pago\s+o\s+material|n[aã]o\s+divide\s+material/.test(t)) {
      b.materialsPaidBy = 'doctor';
      b.reimburseComponents = false;
      b.reimburseMaterials = false;
    } else if (/divide\s+material|cl[ií]nica\s+paga\s+material|material\s+por\s+conta\s+da\s+cl[ií]nica/.test(t)) {
      b.materialsPaidBy = 'clinic';
    }

    if (/por\s+procedimento|conforme\s+ficha|pre[cç]o\s+do\s+procedimento/.test(t) && b.shareMode !== 'fixed' && b.shareMode !== 'mixed') {
      b.shareMode = 'procedure';
    }

    b.aiSummary = formulaLines(b).join(' · ');
    return b;
  }

  function presets() {
    return {
      particular: normalizeBilling({
        shareMode: 'percent',
        professionalPercent: 100,
        cardFeeEnabled: false,
        materialsPaidBy: 'doctor',
        notes: 'Receita integral — consultório próprio.'
      }),
      gerlucia: normalizeBilling({
        shareMode: 'percent',
        professionalPercent: 50,
        cardFeeEnabled: true,
        cardFeePercent: 10,
        cardFeeOn: 'share',
        materialsPaidBy: 'clinic',
        reimburseComponents: true,
        reimburseMaterials: false,
        notes: '50% profissional / 50% clínica; desconta 10% cartão da sua parte; clínica reembolsa componentes.',
        aiSummary: '50% − 10% cartão + reembolso de componentes',
        examplePracticed: 3000,
        exampleComponents: 200,
        feeSchedule: DEFAULT_FEE_SCHEDULE.map((f) =>
          f.method === 'credit' || f.method === 'credit_installments'
            ? { ...f, feePercent: 10, feeBase: 'share', paidBy: 'doctor' }
            : { ...f }
        )
      }),
      closed: normalizeBilling({
        shareMode: 'procedure',
        cardFeeEnabled: false,
        materialsPaidBy: 'doctor',
        notes: 'Valor fechado ou % definidos em cada procedimento.'
      }),
      mixed: normalizeBilling({
        shareMode: 'mixed',
        fixedAmount: 300,
        professionalPercent: 15,
        cardFeeEnabled: false,
        materialsPaidBy: 'doctor',
        notes: 'Exemplo ilustrativo: fixo + percentual (não é contrato real).',
        aiSummary: 'Fixo + % do praticado'
      })
    };
  }

  /** Snapshot imutável para anexar a novos lançamentos (não recalcular histórico). */
  function snapshotSettlement(settled) {
    if (!settled) return null;
    return {
      settledAt: new Date().toISOString().slice(0, 10),
      practiced: settled.practiced,
      grossShare: settled.grossShare,
      cardFee: settled.cardFee,
      netShare: settled.netShare,
      reimbursement: settled.reimbursement,
      receivable: settled.receivable,
      costs: settled.costs,
      profit: settled.profit,
      ruleSource: settled.ruleSource,
      ruleSnap: settled.ruleSnap,
      calcSteps: settled.calcSteps
    };
  }

  global.ChevalierBilling = {
    DEFAULT_BILLING,
    PAYMENT_METHODS,
    DEFAULT_FEE_SCHEDULE,
    normalizeBilling,
    clinicBilling,
    resolveEffectiveBilling,
    feeForPayment,
    settleCase,
    formulaLines,
    humanSummary,
    chipLabels,
    payoutLabel,
    parseRuleLocal,
    presets,
    snapshotSettlement,
    normalizeProcedureRule,
    normalizeFeeSchedule,
    normalizePayout,
    fmt,
    round2
  };
})(typeof window !== 'undefined' ? window : globalThis);
