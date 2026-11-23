/**
 * Importação de NF-e (XML ou PDF/DANFE) → entrada de estoque + custo médio.
 * PDF: o texto (ou a imagem, se escaneado) vai para api/nfe-pdf-ai.php, que devolve
 * os itens no mesmo formato do parseNfeXml.
 * Regras de materiais controlados: implante, enxerto e componente.
 */
(function (global) {
  'use strict';

  const GATED_RE = /implante|fixa[cç][aã]o|enxerto|biomaterial|osso|membrana|lumin|componente|pilar|transfer|an[aá]logo|cicatrizador|multi-?unit|parafuso|heal(?:ing)?\s*abutment/i;
  const PROC_GATE_RE = /implante|enxerto|componente|pilar|plantio|pr[oó]tese sobre|coroa sobre implante|protocolo/i;

  function text(el, sel) {
    if (!el) return '';
    const n = sel ? el.querySelector(sel) : el;
    return (n?.textContent || '').trim();
  }

  function num(v) {
    const n = Number(String(v || '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function classifyMaterial(m) {
    const t = `${m?.type || ''} ${m?.name || ''} ${m?.brand || ''}`;
    if (/enxerto|biomaterial|osso|membrana|lumin/i.test(t)) return 'enxerto';
    if (/componente|pilar|transfer|an[aá]logo|cicatrizador|multi-?unit|parafuso/i.test(t)) return 'componente';
    if (/implante|fixa[cç][aã]o/i.test(t)) return 'implante';
    if (GATED_RE.test(t)) return 'controlado';
    return '';
  }

  function isGatedMaterial(m) {
    return !!classifyMaterial(m);
  }

  function procedureNeedsStockGate(p) {
    if (!p) return false;
    if (p.specialty === 'implante') return true;
    if (p.kind === 'cirurgico' && /implante|cirurgia/i.test(String(p.specialty || '') + ' ' + String(p.name || ''))) return true;
    return PROC_GATE_RE.test(String(p.name || ''));
  }

  function treatmentNeedsStockGate(lines, procedureFn) {
    return (lines || []).some((l) => procedureNeedsStockGate(procedureFn(l.procedureId)));
  }

  function inferTypeFromName(name) {
    const n = String(name || '');
    if (/enxerto|biomaterial|osso|membrana|bone|lumin/i.test(n)) return 'Implante — Biomaterial';
    if (/pilar|componente|transfer|an[aá]logo|cicatrizador|multi-?unit|parafuso|abutment/i.test(n)) return 'Implante — Componente';
    if (/implante|implant/i.test(n)) return 'Implante — Fixação';
    return 'Insumos — NF-e';
  }

  function normalizeBarcode(v) {
    const s = String(v || '').replace(/\D+/g, '');
    if (!s || /^0+$/.test(s) || s === 'SEM GTIN') return '';
    return s;
  }

  function parseNfeXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(xmlText || ''), 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('XML inválido — confira o arquivo ou envie o PDF (DANFE).');
    }
    const inf = doc.querySelector('infNFe') || doc.querySelector('NFe infNFe');
    if (!inf) throw new Error('Não encontrei a tag infNFe. Confirme que é XML de NF-e.');

    const ide = inf.querySelector('ide');
    const emit = inf.querySelector('emit');
    const total = inf.querySelector('total ICMSTot') || inf.querySelector('ICMSTot');
    const meta = {
      key: (inf.getAttribute('Id') || '').replace(/^NFe/i, ''),
      number: text(ide, 'nNF'),
      series: text(ide, 'serie'),
      date: (text(ide, 'dhEmi') || text(ide, 'dEmi') || '').slice(0, 10),
      supplier: text(emit, 'xNome'),
      supplierCnpj: text(emit, 'CNPJ') || text(emit, 'CPF'),
      total: num(text(total, 'vNF')),
    };

    const items = [...inf.querySelectorAll('det')].map((det, idx) => {
      const prod = det.querySelector('prod');
      const name = text(prod, 'xProd');
      const qty = num(text(prod, 'qCom')) || num(text(prod, 'qTrib'));
      const unitCost = num(text(prod, 'vUnCom')) || num(text(prod, 'vUnTrib'));
      const totalItem = num(text(prod, 'vProd')) || qty * unitCost;
      const unit = text(prod, 'uCom') || text(prod, 'uTrib') || 'UN';
      const barcode = normalizeBarcode(text(prod, 'cEAN')) || normalizeBarcode(text(prod, 'cEANTrib'));
      const sku = text(prod, 'cProd');
      return {
        idx: idx + 1,
        name,
        qty,
        unitCost,
        total: totalItem,
        unit,
        barcode,
        sku,
        ncm: text(prod, 'NCM'),
        selected: true,
        materialId: '',
        createNew: false,
      };
    }).filter((it) => it.name && it.qty > 0);

    if (!items.length) throw new Error('A NF-e não trouxe itens de produto.');
    return { meta, items };
  }

  function isPdfFile(file) {
    const name = String(file?.name || '').toLowerCase();
    return file?.type === 'application/pdf' || name.endsWith('.pdf');
  }

  async function loadPdfJs() {
    if (global.pdfjsLib) return global.pdfjsLib;
    if (global.ChevalierScan?.loadPdfJs) return global.ChevalierScan.loadPdfJs();
    throw new Error('Leitor de PDF indisponível. Recarregue a página.');
  }

  /**
   * Lê o DANFE no navegador: texto de todas as páginas (até 8) e, se o PDF for
   * escaneado (quase sem texto), as primeiras páginas como JPEG para a IA.
   */
  async function readPdfForAi(file) {
    const pdfjsLib = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages = Math.min(pdf.numPages, 8);
    const chunks = [];
    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // agrupa por linha (mesma altura) para manter a tabela de produtos legível
      const rows = new Map();
      content.items.forEach((it) => {
        const y = Math.round(it.transform[5]);
        const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push({ x: it.transform[4], s: it.str });
      });
      const lines = [...rows.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      chunks.push(`--- Página ${i} ---\n` + lines.join('\n'));
    }
    const text = chunks.join('\n\n');
    const letters = (text.match(/[A-Za-zÀ-ú0-9]/g) || []).length;
    const images = [];
    if (letters < 200) {
      for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.82));
      }
    }
    return { text: letters < 200 ? '' : text, images, pages: pdf.numPages };
  }

  /** Chave de acesso (44 dígitos) direto do texto do DANFE, mesmo com espaços. */
  function findAccessKey(textValue) {
    const m = String(textValue || '').match(/(?:\d[\s.]*){44}/g) || [];
    for (const cand of m) {
      const digits = cand.replace(/\D/g, '');
      if (digits.length === 44) return digits;
    }
    return '';
  }

  /** Resposta do api/nfe-pdf-ai.php → mesmo formato do parseNfeXml. */
  function draftFromAi(resp, pdfText) {
    const meta = { ...(resp?.meta || {}) };
    if (!meta.key) meta.key = findAccessKey(pdfText);
    const items = (Array.isArray(resp?.items) ? resp.items : []).map((it, idx) => ({
      idx: idx + 1,
      name: String(it.name || '').trim(),
      qty: num(it.qty),
      unitCost: num(it.unitCost),
      total: num(it.total) || num(it.qty) * num(it.unitCost),
      unit: it.unit || 'UN',
      barcode: normalizeBarcode(it.barcode),
      sku: it.sku || '',
      ncm: it.ncm || '',
      selected: true,
      materialId: '',
      createNew: false,
    })).filter((it) => it.name && it.qty > 0);
    if (!items.length) throw new Error('Não encontrei itens de produto nesse PDF.');
    return { meta, items, source: 'pdf' };
  }

  /** NF-e já importada antes (mesma chave, ou mesmo número + fornecedor). */
  function findDuplicateImport(state, meta) {
    const list = Array.isArray(state?.nfImports) ? state.nfImports : [];
    if (!meta) return null;
    return list.find((n) => (meta.key && n.key === meta.key)
      || (!meta.key && meta.number && n.number === meta.number
        && String(n.supplier || '').toLowerCase() === String(meta.supplier || '').toLowerCase())) || null;
  }

  function scoreMatch(item, m) {
    let score = 0;
    const bc = normalizeBarcode(m.barcode);
    if (item.barcode && bc && item.barcode === bc) score += 100;
    const a = String(item.name || '').toLowerCase();
    const b = `${m.name || ''} ${m.brand || ''}`.toLowerCase();
    if (!a || !b) return score;
    if (a === b) score += 80;
    const tokens = a.split(/[^a-z0-9áéíóúãõâêôç]+/i).filter((t) => t.length > 2);
    let hit = 0;
    tokens.forEach((t) => { if (b.includes(t)) hit++; });
    if (tokens.length) score += Math.round((hit / tokens.length) * 40);
    return score;
  }

  function matchMaterial(item, materials) {
    let best = null;
    let bestScore = 0;
    (materials || []).forEach((m) => {
      const s = scoreMatch(item, m);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    });
    if (bestScore >= 55) return { material: best, score: bestScore };
    return { material: null, score: bestScore };
  }

  function receiveStock(m, qty, unitCost, meta = {}) {
    const oldStock = Math.max(0, Number(m.stock || 0));
    const oldCost = Number(m.unitCost || 0);
    const q = Number(qty || 0);
    const uc = Number(unitCost || 0);
    if (q <= 0) return m;
    const newStock = oldStock + q;
    if (newStock > 0 && (uc > 0 || oldCost > 0)) {
      const incoming = uc > 0 ? uc : oldCost;
      m.unitCost = Math.round(((oldStock * oldCost + q * incoming) / newStock) * 1000) / 1000;
    }
    if (uc > 0) {
      // Embalagem unitária: preço acompanha o custo; senão atualiza preço da compra
      const packUnits = Math.max(1, Number(String(m.pack || '').match(/(\d+[.,]?\d*)/)?.[1]?.replace(',', '.') || 1));
      m.price = packUnits <= 1 ? m.unitCost : Math.round(m.unitCost * packUnits * 100) / 100;
    }
    m.stock = Math.round(newStock * 1000) / 1000;
    m.updated = (global.todayISO && todayISO()) || new Date().toISOString().slice(0, 10);
    if (meta.supplier) m.supplier = meta.supplier;
    if (meta.barcode && !m.barcode) m.barcode = meta.barcode;
    return m;
  }

  function applyImport(state, draft, opts = {}) {
    if (!state.materials) state.materials = [];
    if (!state.nfImports) state.nfImports = [];
    if (!state.stockLedger) state.stockLedger = [];
    const uidFn = opts.uid || global.uid || (() => Math.random().toString(36).slice(2, 9));
    const applied = [];
    const meta = draft.meta || {};

    (draft.items || []).forEach((it) => {
      if (it.selected === false) return;
      let m = it.materialId ? state.materials.find((x) => x.id === it.materialId) : null;
      if (!m && it.createNew) {
        m = {
          id: uidFn(),
          name: it.name,
          brand: '',
          type: inferTypeFromName(it.name),
          supplier: meta.supplier || 'NF-e',
          pack: `1 ${it.unit || 'un'}`,
          price: Number(it.unitCost || 0),
          unitCost: Number(it.unitCost || 0),
          stock: 0,
          min: 1,
          barcode: it.barcode || '',
          updated: (global.todayISO && todayISO()) || new Date().toISOString().slice(0, 10),
          fromNfe: true,
        };
        state.materials.push(m);
      }
      if (!m) {
        const hit = matchMaterial(it, state.materials);
        m = hit.material;
      }
      if (!m) return;
      receiveStock(m, it.qty, it.unitCost, { supplier: meta.supplier, barcode: it.barcode });
      const entry = {
        id: uidFn(),
        at: new Date().toISOString(),
        type: 'nfe_in',
        materialId: m.id,
        qty: Number(it.qty || 0),
        unitCost: Number(it.unitCost || 0),
        nfeKey: meta.key || '',
        nfeNumber: meta.number || '',
        name: m.name,
      };
      state.stockLedger.unshift(entry);
      applied.push(entry);
    });

    if (applied.length) {
      state.nfImports.unshift({
        id: uidFn(),
        at: new Date().toISOString(),
        key: meta.key || '',
        number: meta.number || '',
        series: meta.series || '',
        date: meta.date || '',
        supplier: meta.supplier || '',
        total: Number(meta.total || 0),
        items: applied.length,
        materialIds: applied.map((a) => a.materialId),
      });
      // Lançamento de custo de compra (auditoria financeira)
      if (!state.costs) state.costs = [];
      const sum = applied.reduce((s, a) => s + a.qty * a.unitCost, 0);
      if (sum > 0) {
        state.costs.unshift({
          id: uidFn(),
          desc: `NF-e ${meta.number || meta.key || ''} — ${meta.supplier || 'fornecedor'}`.trim(),
          type: 'INSUMOS',
          center: 'Estoque',
          date: meta.date || ((global.todayISO && todayISO()) || new Date().toISOString().slice(0, 10)),
          due: meta.date || ((global.todayISO && todayISO()) || new Date().toISOString().slice(0, 10)),
          method: 'BOLETO À VISTA',
          value: Math.round(sum * 100) / 100,
          status: 'PAGO',
          installment: '',
          boletoLine: '',
          nfeKey: meta.key || '',
        });
      }
    }
    return { applied, count: applied.length };
  }

  function validateConsumption(state, items, opts = {}) {
    const list = (items || []).filter((it) => it.materialId && Number(it.qty) > 0);
    const requireGated = !!opts.requireGated;
    if (requireGated) {
      const gated = list.filter((it) => isGatedMaterial(state.materials.find((m) => m.id === it.materialId)));
      if (!gated.length) {
        return {
          ok: false,
          error: 'Informe os materiais do estoque (implante, enxerto ou componente) usados neste caso.',
        };
      }
    }
    for (const it of list) {
      const m = state.materials.find((x) => x.id === it.materialId);
      if (!m) return { ok: false, error: 'Material não encontrado no estoque.' };
      const gated = isGatedMaterial(m);
      if (!gated && !opts.checkAll) continue;
      const stock = Number(m.stock || 0);
      const qty = Number(it.qty || 0);
      // Em edição, opts.credit devolve o consumo anterior do mesmo item
      const credit = Number(opts.credit?.[it.materialId] || 0);
      const available = stock + credit;
      if (qty > available + 1e-9) {
        return {
          ok: false,
          error: `Estoque insuficiente para “${m.name}”: saldo ${available}, pedido ${qty}. Importe a NF-e ou dê entrada antes de usar.`,
        };
      }
    }
    return { ok: true };
  }

  function autoMatchDraft(draft, materials) {
    (draft.items || []).forEach((it) => {
      const hit = matchMaterial(it, materials);
      if (hit.material) {
        it.materialId = hit.material.id;
        it.createNew = false;
        it.matchScore = hit.score;
      } else {
        it.materialId = '';
        it.createNew = true;
        it.matchScore = hit.score;
      }
    });
    return draft;
  }

  global.ChevalierNfe = {
    GATED_RE,
    parseNfeXml,
    isPdfFile,
    readPdfForAi,
    findAccessKey,
    draftFromAi,
    findDuplicateImport,
    matchMaterial,
    autoMatchDraft,
    applyImport,
    receiveStock,
    classifyMaterial,
    isGatedMaterial,
    procedureNeedsStockGate,
    treatmentNeedsStockGate,
    validateConsumption,
    inferTypeFromName,
  };
})(typeof window !== 'undefined' ? window : globalThis);
