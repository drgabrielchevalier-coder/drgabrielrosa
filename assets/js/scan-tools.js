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
  let scanTimer = null;
  let zxingReader = null;

  function stopCamera() {
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }
  }

  function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  /** Fator de vencimento FEBRABAN (base 07/10/1997; novo ciclo 22/02/2025). */
  function dueFromFactor(factor) {
    const f = Number(factor);
    if (!Number.isFinite(f) || f <= 0) return '';
    const classic = new Date(1997, 9, 7);
    classic.setDate(classic.getDate() + f);
    const candidates = [classic];
    if (f >= 1000) {
      const neu = new Date(2025, 1, 22);
      neu.setDate(neu.getDate() + (f - 1000));
      candidates.push(neu);
    }
    const today = new Date();
    candidates.sort((a, b) => Math.abs(a - today) - Math.abs(b - today));
    return candidates[0].toISOString().slice(0, 10);
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
    return campo1 + String(mod10(campo1)) + campo2 + String(mod10(campo2)) + campo3 + String(mod10(campo3)) + dv + fatorValor;
  }

  function parseBankBoleto(digits) {
    let d = onlyDigits(digits);
    if (d.length === 47) d = linhaToBarcode(d);
    if (d.length !== 44) return null;
    const bank = d.slice(0, 3);
    const factor = d.slice(5, 9);
    const cents = d.slice(9, 19);
    const value = Number(cents) / 100;
    const due = dueFromFactor(Number(factor));
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
    const raw = d;
    let value = 0;
    if (raw.length >= 15) {
      const cents = raw.slice(4, 15);
      value = Number(cents) / 100;
    }
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
    // Aceita códigos longos com ruído — tenta extrair 44/47/48 consecutivos
    const m44 = d.match(/\d{44}/);
    const m47 = d.match(/\d{47}/);
    const m48 = d.match(/\d{48}/);
    if (m47) return parseBankBoleto(m47[0]);
    if (m44) return parseBankBoleto(m44[0]);
    if (m48) return parseConvenioBoleto(m48[0]);
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
      /(\d{5}[.\s]?\d{5}\s?\d{5}[.\s]?\d{6}\s?\d{5}[.\s]?\d{6}\s?\d\s?\d{14})|(\d{44,48})/
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

    const dueMatch =
      t.match(/(?:venc(?:imento)?|vencto)[^\d]{0,12}(\d{2}\/\d{2}\/\d{4})/i) ||
      t.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (dueMatch && !result.due) {
      const [dd, mm, yyyy] = dueMatch[1].split('/');
      result.due = `${yyyy}-${mm}-${dd}`;
    }

    const parc =
      t.match(/parcela\s*(\d{1,2})\s*\/\s*(\d{1,2})/i) ||
      t.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:parcela|prest)/i);
    if (parc) result.installment = `${parc[1]}/${parc[2]}`;

    const ben = t.match(/(?:benefici[aá]rio|cedente|favorecido)\s*[:\-]?\s*([^\n\r]{3,80})/i);
    if (ben) {
      result.beneficiary = ben[1].replace(/\s+/g, ' ').trim().slice(0, 80);
    }

    return result;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some((s) => s.src === src)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }

  async function loadTesseract() {
    if (global.Tesseract) return global.Tesseract;
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    return global.Tesseract;
  }

  async function loadZXing() {
    if (global.ZXing) return global.ZXing;
    await loadScript('https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js');
    return global.ZXing;
  }

  async function loadPdfJs() {
    if (global.pdfjsLib) return global.pdfjsLib;
    await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
    if (global.pdfjsLib) {
      global.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }
    return global.pdfjsLib;
  }

  async function ocrImage(source) {
    const Tesseract = await loadTesseract();
    const { data } = await Tesseract.recognize(source, 'por', { logger: () => {} });
    return data?.text || '';
  }

  /** Recorta a faixa retangular do guia (código de barras do boleto). */
  function cropGuideRegion(videoOrCanvas, guideEl, wrapEl) {
    const canvas = document.createElement('canvas');
    const w = videoOrCanvas.videoWidth || videoOrCanvas.width;
    const h = videoOrCanvas.videoHeight || videoOrCanvas.height;
    if (!w || !h) return null;

    let sx = 0;
    let sy = Math.floor(h * 0.28);
    let sw = w;
    let sh = Math.floor(h * 0.44);

    if (guideEl && wrapEl) {
      const wr = wrapEl.getBoundingClientRect();
      const gr = guideEl.getBoundingClientRect();
      if (wr.width && wr.height) {
        const scaleX = w / wr.width;
        const scaleY = h / wr.height;
        sx = Math.max(0, Math.floor((gr.left - wr.left) * scaleX));
        sy = Math.max(0, Math.floor((gr.top - wr.top) * scaleY));
        sw = Math.min(w - sx, Math.floor(gr.width * scaleX));
        sh = Math.min(h - sy, Math.floor(gr.height * scaleY));
      }
    }

    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoOrCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas;
  }

  async function detectWithBarcodeDetector(source) {
    if (!('BarcodeDetector' in global)) return [];
    let detector;
    try {
      detector = new global.BarcodeDetector({
        formats: ['itf', 'code_128', 'codabar', 'code_39'],
      });
    } catch {
      try {
        detector = new global.BarcodeDetector();
      } catch {
        return [];
      }
    }
    try {
      const codes = await detector.detect(source);
      return (codes || []).map((c) => ({ raw: c.rawValue, format: c.format || 'unknown' }));
    } catch {
      return [];
    }
  }

  async function detectWithZXing(canvas) {
    try {
      const ZXing = await loadZXing();
      if (!zxingReader) {
        const hints = new Map();
        const formats = [
          ZXing.BarcodeFormat.ITF,
          ZXing.BarcodeFormat.CODE_128,
          ZXing.BarcodeFormat.CODE_39,
          ZXing.BarcodeFormat.CODABAR,
        ];
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        zxingReader = new ZXing.BrowserMultiFormatReader(hints);
      }
      const result = await zxingReader.decodeFromCanvas(canvas);
      if (result?.getText) {
        return [{ raw: result.getText(), format: String(result.getBarcodeFormat?.() || 'zxing') }];
      }
    } catch {
      /* no code */
    }
    return [];
  }

  async function detectBarcodeFromSource(source, opts = {}) {
    const wrap = opts.wrapEl;
    const guide = opts.guideEl;
    const cropped = cropGuideRegion(source, guide, wrap) || (() => {
      const c = document.createElement('canvas');
      const w = source.videoWidth || source.width;
      const h = source.videoHeight || source.height;
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(source, 0, 0);
      return c;
    })();

    let codes = await detectWithBarcodeDetector(cropped);
    if (!codes.length) codes = await detectWithBarcodeDetector(source);
    if (!codes.length) codes = await detectWithZXing(cropped);
    if (!codes.length) {
      // tenta full frame com contraste
      const full = document.createElement('canvas');
      const w = source.videoWidth || source.width;
      const h = source.videoHeight || source.height;
      full.width = w;
      full.height = h;
      const ctx = full.getContext('2d');
      ctx.drawImage(source, 0, 0);
      const img = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const g = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11;
        const v = g > 140 ? 255 : 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      }
      ctx.putImageData(img, 0, 0);
      codes = await detectWithZXing(full);
    }
    return codes;
  }

  async function detectBarcodeFromVideo(video, opts) {
    if (!video || video.readyState < 2) return null;
    const codes = await detectBarcodeFromSource(video, opts || {});
    return codes.length ? codes : null;
  }

  async function detectBarcodeFromBlob(blob, opts) {
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext('2d').drawImage(bmp, 0, 0);
    bmp.close?.();
    return detectBarcodeFromSource(canvas, opts || {});
  }

  async function startCamera(videoEl, opts = {}) {
    stopCamera();
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: opts.wide ? 1920 : 1280 },
        height: { ideal: opts.wide ? 1080 : 720 },
        focusMode: { ideal: 'continuous' },
      },
    };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    activeStream = stream;
    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline', 'true');
    videoEl.muted = true;
    await videoEl.play();
    return stream;
  }

  async function pdfFirstPageToCanvas(file) {
    const pdfjsLib = await loadPdfJs();
    if (!pdfjsLib) throw new Error('Leitor de PDF indisponível.');
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas;
  }

  async function readBoletoFromFile(file, opts = {}) {
    const name = String(file.name || '').toLowerCase();
    const type = String(file.type || '');
    let canvas = null;
    let text = '';

    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      canvas = await pdfFirstPageToCanvas(file);
    } else {
      const bmp = await createImageBitmap(file);
      canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext('2d').drawImage(bmp, 0, 0);
      bmp.close?.();
    }

    let codes = await detectBarcodeFromSource(canvas, opts);
    for (const c of codes) {
      const parsed = parseBoletoDigits(c.raw);
      if (parsed) return { parsed, source: 'barcode', codes };
    }

    text = await ocrImage(canvas);
    const extracted = extractFromText(text);
    if (extracted.linha) {
      const parsed = parseBoletoDigits(extracted.linha);
      if (parsed) {
        return {
          parsed: {
            ...parsed,
            beneficiary: extracted.beneficiary || parsed.beneficiary,
            installment: extracted.installment || '',
            due: extracted.due || parsed.due,
            value: extracted.value ?? parsed.value,
          },
          source: 'ocr',
          text,
        };
      }
    }
    if (extracted.value != null || extracted.due || extracted.beneficiary) {
      return { parsed: extracted, source: 'ocr-partial', text };
    }
    return { parsed: null, source: 'none', text, codes };
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
      const dueClose = c.due && draft.due ? Math.abs(daysBetween(c.due, draft.due)) <= 3 : false;
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
    detectBarcodeFromBlob,
    detectBarcodeFromSource,
    startCamera,
    readBoletoFromFile,
    findCostConflicts,
    findMaterialByBarcode,
    BANK_NAMES,
  };
})(window);
