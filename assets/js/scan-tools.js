/* Escaneamento de boletos e códigos de barras — Dr Gabriel Rosa */
(function (global) {
  'use strict';

  const BANK_NAMES = {
    '001': 'Banco do Brasil',
    '033': 'Santander',
    '104': 'Caixa Econômica',
    '237': 'Bradesco',
    '341': 'Itaú',
    '077': 'Inter',
    '260': 'Nubank',
    '336': 'C6 Bank',
    '212': 'Banco Original',
    '422': 'Safra',
    '748': 'Sicredi',
    '756': 'Sicoob',
    '041': 'Banrisul',
    '070': 'BRB',
    '136': 'Unicred',
  };

  let activeStream = null;
  let scanLoop = null;

  function stopCamera() {
    if (scanLoop) {
      cancelAnimationFrame(scanLoop);
      scanLoop = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }
  }

  function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  function pad(n, len) {
    return String(n).padStart(len, '0');
  }

  /** Fator de vencimento FEBRABAN (base 07/10/1997). */
  function dueFromFactor(factor) {
    const f = Number(factor);
    if (!Number.isFinite(f) || f <= 0) return '';
    const base = new Date(1997, 9, 7);
    base.setDate(base.getDate() + f);
    return base.toISOString().slice(0, 10);
  }

  function formatLinha(digits) {
    const d = onlyDigits(digits);
    if (d.length === 47) {
      return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
    }
    if (d.length === 48) {
      return `${d.slice(0, 11)}-${d.slice(11, 12)} ${d.slice(12, 23)}-${d.slice(23, 24)} ${d.slice(24, 35)}-${d.slice(35, 36)} ${d.slice(36, 47)}-${d.slice(47, 48)}`;
    }
    return d;
  }

  /** Converte linha digitável (47) → código de barras (44). */
  function linhaToBarcode(linha) {
    const d = onlyDigits(linha);
    if (d.length !== 47) return d.length === 44 ? d : '';
    return d.slice(0, 4) + d.slice(32, 33) + d.slice(33, 47) + d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31);
  }

  function barcodeToLinha(barcode) {
    const b = onlyDigits(barcode);
    if (b.length !== 44) return b.length === 47 ? b : '';
    const campo1 = b.slice(0, 4) + b.slice(19, 24);
    const campo2 = b.slice(24, 34);
    const campo3 = b.slice(34, 44);
    const dv = b.slice(4, 5);
    const fatorValor = b.slice(5, 19);
    const withDv = (campo) => campo; // DVs de campo omitidos na montagem simplificada a partir do barcode
    // Montagem completa exige DVs dos campos — reconstruímos a partir do barcode padrão
    function mod10(num) {
      let sum = 0;
      let mult = 2;
      for (let i = num.length - 1; i >= 0; i--) {
        let prod = Number(num[i]) * mult;
        if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
        sum += prod;
        mult = mult === 2 ? 1 : 2;
      }
      const r = sum % 10;
      return r === 0 ? 0 : 10 - r;
    }
    const f1 = campo1 + String(mod10(campo1));
    const f2 = campo2 + String(mod10(campo2));
    const f3 = campo3 + String(mod10(campo3));
    return f1 + f2 + f3 + dv + fatorValor;
  }

  function parseBankBoleto(digits) {
    let d = onlyDigits(digits);
    if (d.length === 47) d = linhaToBarcode(d);
    if (d.length !== 44) return null;
    const bank = d.slice(0, 3);
    const factor = d.slice(5, 9);
    const cents = d.slice(9, 19);
    const value = Number(cents) / 100;
    const due = dueFromFactor(factor);
    return {
      kind: 'bancario',
      bank,
      bankName: BANK_NAMES[bank] || `Banco ${bank}`,
      value: Math.round(value * 100) / 100,
      due,
      factor: Number(factor),
      barcode: d,
      linha: barcodeToLinha(d),
      beneficiary: BANK_NAMES[bank] || `Boleto bancário ${bank}`,
    };
  }

  function parseConvenioBoleto(digits) {
    const d = onlyDigits(digits);
    if (d.length !== 48 && d.length !== 44) return null;
    // Arrecadação: valor geralmente nos dígitos finais (últimos 11 do bloco) — heurística
    const raw = d.length === 48 ? d : d;
    const valueBlock = raw.slice(-11);
    const value = Number(valueBlock.slice(0, 9) + '.' + valueBlock.slice(9)) || Number(raw.slice(4, 15)) / 100;
    return {
      kind: 'arrecadacao',
      bank: raw.slice(0, 3),
      bankName: 'Convênio / arrecadação',
      value: Math.round((Number.isFinite(value) ? value : 0) * 100) / 100,
      due: '',
      barcode: raw.slice(0, 44),
      linha: raw,
      beneficiary: 'Convênio / concessionária',
    };
  }

  function parseBoletoDigits(raw) {
    const d = onlyDigits(raw);
    if (d.length === 47 || d.length === 44) return parseBankBoleto(d);
    if (d.length === 48) return parseConvenioBoleto(d);
    return null;
  }

  function extractFromText(text) {
    const t = String(text || '');
    const result = {
      linha: '',
      value: null,
      due: '',
      beneficiary: '',
      installment: '',
      bankName: '',
    };

    const linhaMatch = t.match(
      /(\d{5}[.\s]?\d{5}\s?\d{5}[.\s]?\d{6}\s?\d{5}[.\s]?\d{6}\s?\d\s?\d{14})|(\d{47,48})/
    );
    if (linhaMatch) {
      const digits = onlyDigits(linhaMatch[0]);
      result.linha = digits;
      const parsed = parseBoletoDigits(digits);
      if (parsed) {
        result.value = parsed.value;
        result.due = parsed.due;
        result.bankName = parsed.bankName;
        result.beneficiary = parsed.beneficiary;
        result.barcode = parsed.barcode;
        result.linha = parsed.linha || digits;
      }
    }

    const valMatch = t.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i);
    if (valMatch && (result.value == null || result.value === 0)) {
      result.value = Number(valMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    const dueMatch = t.match(/(?:venc(?:imento)?|vencto)[^\d]{0,12}(\d{2}\/\d{2}\/\d{4})/i)
      || t.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (dueMatch && !result.due) {
      const [dd, mm, yyyy] = dueMatch[1].split('/');
      result.due = `${yyyy}-${mm}-${dd}`;
    }

    const parc = t.match(/parcela\s*(\d{1,2})\s*\/\s*(\d{1,2})/i)
      || t.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:parcela|prest)/i);
    if (parc) result.installment = `${parc[1]}/${parc[2]}`;

    const ben = t.match(/(?:benefici[aá]rio|cedente|favorecido)\s*[:\-]?\s*([^\n\r]{3,80})/i);
    if (ben) {
      result.beneficiary = ben[1].replace(/\s+/g, ' ').trim().slice(0, 80);
    }

    return result;
  }

  async function loadTesseract() {
    if (global.Tesseract) return global.Tesseract;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Não foi possível carregar o OCR.'));
      document.head.appendChild(s);
    });
    return global.Tesseract;
  }

  async function ocrImage(source) {
    const Tesseract = await loadTesseract();
    const { data } = await Tesseract.recognize(source, 'por', {
      logger: () => {},
    });
    return data?.text || '';
  }

  async function detectBarcodeFromVideo(video) {
    if (!('BarcodeDetector' in global)) return null;
    const formats = ['itf', 'code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'data_matrix'];
    let detector;
    try {
      detector = new global.BarcodeDetector({ formats });
    } catch {
      detector = new global.BarcodeDetector();
    }
    const codes = await detector.detect(video);
    if (!codes?.length) return null;
    return codes.map((c) => ({ raw: c.rawValue, format: c.format }));
  }

  async function startCamera(videoEl) {
    stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    activeStream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  }

  function daysBetween(a, b) {
    const da = new Date(a + 'T12:00:00');
    const db = new Date(b + 'T12:00:00');
    return Math.round((da - db) / 86400000);
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function similar(a, b) {
    const na = norm(a);
    const nb = norm(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 0.85;
    const ta = new Set(na.split(' '));
    const tb = new Set(nb.split(' '));
    let inter = 0;
    ta.forEach((t) => {
      if (tb.has(t)) inter++;
    });
    return inter / Math.max(ta.size, tb.size);
  }

  function findCostConflicts(draft, costs) {
    const list = costs || [];
    return list.filter((c) => {
      if (draft.boletoLine && c.boletoLine && onlyDigits(c.boletoLine) === onlyDigits(draft.boletoLine)) return true;
      const sameValue = Math.abs(Number(c.value || 0) - Number(draft.value || 0)) < 0.02;
      if (!sameValue) return false;
      const dueClose =
        c.due && draft.due ? Math.abs(daysBetween(c.due, draft.due)) <= 3 : false;
      const descClose = similar(c.desc, draft.desc) >= 0.55 || similar(c.desc, draft.beneficiary) >= 0.55;
      return dueClose || descClose;
    });
  }

  function findMaterialByBarcode(code, materials) {
    const dig = onlyDigits(code);
    const raw = String(code || '').trim();
    return (materials || []).find((m) => {
      const b = String(m.barcode || '').trim();
      if (!b) return false;
      return b === raw || onlyDigits(b) === dig;
    });
  }

  global.ChevalierScan = {
    stopCamera,
    onlyDigits,
    formatLinha,
    parseBoletoDigits,
    extractFromText,
    ocrImage,
    detectBarcodeFromVideo,
    startCamera,
    findCostConflicts,
    findMaterialByBarcode,
    BANK_NAMES,
  };
})(window);
