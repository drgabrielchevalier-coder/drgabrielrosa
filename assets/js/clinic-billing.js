/**
 * Modelo de cobrança por clínica — fórmulas configuráveis + resumo didático.
 * shareMode: procedure | percent | fixed
 * Card fee, reembolso de materiais/componentes/lab aplicados sobre o honorário base.
 */
(function (global) {
  const DEFAULT_BILLING = {
    version: 1,
    shareMode: 'procedure',
    professionalPercent: 50,
    fixedAmount: 0,
    cardFeeEnabled: false,
    cardFeePercent: 0,
    cardFeeOn: 'share',
    materialsPaidBy: 'doctor',
    reimburseComponents: false,
    reimburseMaterials: false,
    reimburseLab: false,
    notes: '',
    aiSummary: '',
    examplePracticed: 3000,
    exampleComponents: 200,
    exampleMaterials: 0,
    exampleLab: 0
  };

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function normalizeBilling(raw) {
    const b = { ...DEFAULT_BILLING, ...(raw && typeof raw === 'object' ? raw : {}) };
    const mode = ['procedure', 'percent', 'fixed'].includes(b.shareMode) ? b.shareMode : 'procedure';
    const paidBy = ['doctor', 'clinic'].includes(b.materialsPaidBy) ? b.materialsPaidBy : 'doctor';
    const feeOn = b.cardFeeOn === 'practiced' ? 'practiced' : 'share';
    return {
      version: 1,
      shareMode: mode,
      professionalPercent: Math.max(0, Math.min(100, Number(b.professionalPercent) || 0)),
      fixedAmount: Math.max(0, Number(b.fixedAmount) || 0),
      cardFeeEnabled: !!b.cardFeeEnabled,
      cardFeePercent: Math.max(0, Math.min(100, Number(b.cardFeePercent) || 0)),
      cardFeeOn: feeOn,
      materialsPaidBy: paidBy,
      reimburseComponents: !!b.reimburseComponents,
      reimburseMaterials: !!b.reimburseMaterials,
      reimburseLab: !!b.reimburseLab,
      notes: String(b.notes || ''),
      aiSummary: String(b.aiSummary || ''),
      examplePracticed: Math.max(0, Number(b.examplePracticed) || 0),
      exampleComponents: Math.max(0, Number(b.exampleComponents) || 0),
      exampleMaterials: Math.max(0, Number(b.exampleMaterials) || 0),
      exampleLab: Math.max(0, Number(b.exampleLab) || 0)
    };
  }

  function clinicBilling(clinic) {
    return normalizeBilling(clinic && clinic.billing);
  }

  /**
   * @param {object} opts
   * @param {number} opts.practiced - valor praticado na clínica
   * @param {number} opts.baseShare - honorário já calculado pelo clinicPrices do procedimento (quando shareMode=procedure)
   * @param {number} opts.components
   * @param {number} opts.materials
   * @param {number} opts.lab
   * @param {object} billing - normalized
   */
  function settleCase(opts, billing) {
    const b = normalizeBilling(billing);
    const practiced = round2(opts.practiced);
    const components = round2(opts.components);
    const materials = round2(opts.materials);
    const lab = round2(opts.lab);

    let grossShare = 0;
    if (b.shareMode === 'fixed') {
      grossShare = b.fixedAmount;
    } else if (b.shareMode === 'percent') {
      grossShare = practiced * (b.professionalPercent / 100);
    } else {
      grossShare = opts.baseShare != null ? Number(opts.baseShare) : practiced * (b.professionalPercent / 100);
    }
    grossShare = round2(grossShare);

    let cardFee = 0;
    if (b.cardFeeEnabled && b.cardFeePercent > 0) {
      const base = b.cardFeeOn === 'practiced' ? practiced : grossShare;
      cardFee = round2(base * (b.cardFeePercent / 100));
    }
    const netShare = round2(Math.max(0, grossShare - cardFee));

    const reimburse =
      (b.reimburseComponents ? components : 0) +
      (b.reimburseMaterials ? materials : 0) +
      (b.reimburseLab ? lab : 0);
    const reimbursement = round2(reimburse);

    const receivable = round2(netShare + reimbursement);

    // Custos que ficam com o profissional (reduzem lucro)
    let costMaterials = materials;
    let costComponents = components;
    let costLab = lab;
    if (b.materialsPaidBy === 'clinic' || b.reimburseMaterials) costMaterials = 0;
    if (b.reimburseComponents) costComponents = 0;
    if (b.reimburseLab) costLab = 0;
    // Se clínica paga materiais sem reembolso explícito, doctor cost = 0
    if (b.materialsPaidBy === 'clinic') {
      costMaterials = 0;
      if (!b.reimburseComponents) {
        // componentes também por conta da clínica se ela paga materiais
        costComponents = 0;
      }
    }

    return {
      practiced,
      grossShare,
      cardFee,
      netShare,
      reimbursement,
      receivable,
      costs: {
        materials: round2(costMaterials),
        components: round2(costComponents),
        lab: round2(costLab),
        total: round2(costMaterials + costComponents + costLab)
      },
      profit: round2(receivable - costMaterials - costComponents - costLab)
    };
  }

  function formulaLines(billing) {
    const b = normalizeBilling(billing);
    const lines = [];
    if (b.shareMode === 'fixed') {
      lines.push(`Honorário fixo: ${fmt(b.fixedAmount)}`);
    } else if (b.shareMode === 'percent') {
      lines.push(`${b.professionalPercent}% do valor praticado para você`);
    } else {
      lines.push('Parte do procedimento (valor fechado ou % por ficha)');
    }
    if (b.cardFeeEnabled && b.cardFeePercent > 0) {
      lines.push(
        b.cardFeeOn === 'practiced'
          ? `− ${b.cardFeePercent}% de cartão sobre o valor praticado`
          : `− ${b.cardFeePercent}% de cartão sobre a sua parte`
      );
    } else {
      lines.push('Sem desconto de taxa de cartão');
    }
    if (b.reimburseComponents) lines.push('+ Reembolso dos componentes');
    if (b.reimburseMaterials) lines.push('+ Reembolso dos materiais');
    if (b.reimburseLab) lines.push('+ Reembolso do laboratório');
    if (b.materialsPaidBy === 'clinic') {
      lines.push('Materiais por conta da clínica');
    } else if (!b.reimburseMaterials && !b.reimburseComponents) {
      lines.push('Materiais/componentes por sua conta');
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
    else chips.push('Por procedimento');
    chips.push(b.cardFeeEnabled && b.cardFeePercent > 0 ? `Cartão −${b.cardFeePercent}%` : 'Sem taxa cartão');
    if (b.reimburseComponents || b.reimburseMaterials) chips.push('Reembolsa material');
    else if (b.materialsPaidBy === 'clinic') chips.push('Clínica paga material');
    else chips.push('Você paga material');
    return chips;
  }

  /** Local NL → billing (fallback sem OpenAI). */
  function parseRuleLocal(text) {
    const t = String(text || '').toLowerCase();
    const b = normalizeBilling({});
    b.notes = String(text || '').trim();

    const pctMatch = t.match(/(\d{1,3})\s*%/);
    const pcts = [...t.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
    const cardMatch = t.match(/cart[aã]o[^0-9]{0,20}(\d{1,3})\s*%|taxa[^0-9]{0,12}(\d{1,3})\s*%|descont[oa][^0-9]{0,12}(\d{1,3})\s*%/);
    const fixedMatch = t.match(/(?:r\$\s*|recebo\s*)(\d+[.,]?\d*)/);

    if (/cinquenta|50\s*%\s*(?:pra|para|pro|para o)?\s*(?:mim|profissional|cirurgi[aã]o|voc[eê])/.test(t) || (pcts.includes(50) && /profissional|mim|eu recebo|pra mim/.test(t))) {
      b.shareMode = 'percent';
      b.professionalPercent = 50;
    } else if (pcts.length) {
      // Prefer percentage associated with professional
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

    if (/n[aã]o\s+descont|sem\s+taxa|n[aã]o\s+desconta\s+taxa|isento.*cart[aã]o/.test(t)) {
      b.cardFeeEnabled = false;
      b.cardFeePercent = 0;
    } else if (/cart[aã]o|taxa\s+de\s+cart|maquininha|credito|crédito/.test(t)) {
      b.cardFeeEnabled = true;
      const fee = Number(cardMatch?.[1] || cardMatch?.[2] || cardMatch?.[3] || 0);
      b.cardFeePercent = fee || (pcts.find((p) => p === 10) || 10);
      b.cardFeeOn = /sobre\s+o\s+valor\s+praticado|do\s+total/.test(t) ? 'practiced' : 'share';
    }

    if (/reembols|paga\s+(?:o\s+)?(?:material|componente)|devolve\s+(?:o\s+)?(?:material|componente)|cl[ií]nica\s+(?:ainda\s+)?(?:me\s+)?paga/.test(t)) {
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

    if (/por\s+procedimento|conforme\s+ficha|pre[cç]o\s+do\s+procedimento/.test(t) && b.shareMode !== 'fixed') {
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
        exampleComponents: 200
      }),
      closed: normalizeBilling({
        shareMode: 'procedure',
        cardFeeEnabled: false,
        materialsPaidBy: 'doctor',
        notes: 'Valor fechado ou % definidos em cada procedimento.'
      })
    };
  }

  global.ChevalierBilling = {
    DEFAULT_BILLING,
    normalizeBilling,
    clinicBilling,
    settleCase,
    formulaLines,
    humanSummary,
    chipLabels,
    parseRuleLocal,
    presets,
    fmt
  };
})(typeof window !== 'undefined' ? window : global);
