/**
 * Fase 5 — Importação assistida (CSV / HTML / XLSX).
 * Wizard: upload → mapeamento → validação/duplicatas → confirmação → registro de lote.
 * Depende de helpers expostos por app.js (importPick, mapHonorarioRows, etc.).
 */
(function (global) {
  const PATIENT_FIELDS = [
    { id: 'Nome', label: 'Nome / Paciente', required: true, aliases: ['Nome', 'Paciente', 'Patient', 'Client'] },
    { id: 'Honorários', label: 'Honorários', required: false, aliases: ['Honorários', 'Honorarios', 'A receber', 'Valor honorário'] },
    { id: 'Valor', label: 'Valor praticado', required: false, aliases: ['Valor', 'Valor Procedimento', 'Valor procedimento', 'Praticado'] },
    { id: 'Data', label: 'Data', required: false, aliases: ['Data', 'Date'] },
    { id: 'Data da Cobrança', label: 'Data cobrança', required: false, aliases: ['Data da Cobrança', 'Data da Cobranca', 'Vencimento'] },
    { id: 'Financeiro', label: 'Status financeiro', required: false, aliases: ['Financeiro', 'Status financeiro', 'Status'] },
    { id: 'Progresso', label: 'Progresso clínico', required: false, aliases: ['Progresso', 'Etapa'] },
    { id: 'Observação', label: 'Observação', required: false, aliases: ['Observação', 'Observacao', 'Texto', 'Obs'] },
    { id: 'Tipo', label: 'Tipo / procedimento', required: false, aliases: ['Tipo', 'Procedimento'] },
    { id: 'Lab', label: 'Laboratório', required: false, aliases: ['Lab', 'Lab ', 'Laboratório', 'Laboratorio'] },
    { id: 'Componentes', label: 'Componentes', required: false, aliases: ['Componentes'] },
    { id: 'CC', label: 'Custo clínico', required: false, aliases: ['CC', 'CC ', 'Clinica', 'Clínica'] }
  ];

  const COST_FIELDS = [
    { id: 'Descrição', label: 'Descrição', required: true, aliases: ['Descrição', 'Descricao', 'Description'] },
    { id: 'Valor', label: 'Valor', required: false, aliases: ['Valor', 'Value', 'Amount'] },
    { id: 'Data', label: 'Data', required: false, aliases: ['Data', 'Date'] },
    { id: 'Vencimento', label: 'Vencimento', required: false, aliases: ['Vencimento', 'Due'] },
    { id: 'Tipo', label: 'Tipo', required: false, aliases: ['Tipo', 'Categoria'] },
    { id: 'CUSTOS', label: 'Centro / competência', required: false, aliases: ['CUSTOS', 'Centro', 'Centro de custo'] },
    { id: 'Forma de Pg', label: 'Forma de pagamento', required: false, aliases: ['Forma de Pg', 'Forma de Pagamento', 'Método', 'Method'] },
    { id: 'Status Pg', label: 'Status', required: false, aliases: ['Status Pg', 'Status'] },
    { id: 'NF-E', label: 'NF-e', required: false, aliases: ['NF-E', 'NF', 'NFe'] },
    { id: 'Texto', label: 'Texto / obs.', required: false, aliases: ['Texto', 'Obs', 'Observação'] }
  ];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function normHeader(h) {
    return String(h || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function autoMapFields(headers, fields) {
    const map = {};
    const used = new Set();
    fields.forEach((f) => {
      let hit = '';
      for (const alias of f.aliases) {
        const a = normHeader(alias);
        hit = headers.find((h) => !used.has(h) && normHeader(h) === a) || '';
        if (hit) break;
      }
      if (!hit) {
        for (const alias of f.aliases) {
          const a = normHeader(alias);
          hit = headers.find((h) => !used.has(h) && normHeader(h).includes(a)) || '';
          if (hit) break;
        }
      }
      if (hit) {
        map[f.id] = hit;
        used.add(hit);
      } else map[f.id] = '';
    });
    return map;
  }

  function applyColumnMap(rows, map) {
    return (rows || []).map((row) => {
      const out = { ...row };
      Object.entries(map || {}).forEach(([canonical, header]) => {
        if (!header) return;
        if (row[header] != null && String(row[header]).trim() !== '') out[canonical] = row[header];
      });
      return out;
    });
  }

  async function loadXlsxLib() {
    if (global.XLSX) return global.XLSX;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar leitor XLSX'));
      document.head.appendChild(s);
    });
    if (!global.XLSX) throw new Error('XLSX indisponível');
    return global.XLSX;
  }

  async function parseXlsxArrayBuffer(buf) {
    const XLSX = await loadXlsxLib();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!aoa.length) return { headers: [], rows: [] };
    const headers = (aoa[0] || []).map((h) => String(h || '').trim());
    const rows = aoa
      .slice(1)
      .filter((r) => (r || []).some((c) => String(c || '').trim()))
      .map((r) => {
        const o = {};
        headers.forEach((h, i) => {
          o[h] = r[i] ?? '';
        });
        return o;
      });
    return { headers, rows, sheetName };
  }

  function validateMapped(kind, mappedRows) {
    const errors = [];
    const warnings = [];
    const fields = kind === 'costs' ? COST_FIELDS : PATIENT_FIELDS;
    const required = fields.filter((f) => f.required).map((f) => f.id);
    let valid = 0;
    mappedRows.forEach((row, idx) => {
      const line = idx + 2;
      const missing = required.filter((id) => !String(row[id] || '').trim());
      if (missing.length) {
        errors.push({ line, message: `Campo obrigatório vazio: ${missing.join(', ')}` });
        return;
      }
      valid++;
      if (kind !== 'costs') {
        const honor = String(row['Honorários'] || row['Valor'] || '').trim();
        if (!honor) warnings.push({ line, message: 'Sem honorário/valor — será importado como 0' });
      }
    });
    return { errors, warnings, valid, total: mappedRows.length };
  }

  function classifyRecords(kind, data) {
    const state = global.state || {};
    const existing =
      kind === 'costs'
        ? new Set((state.costs || []).map((c) => c.importId).filter(Boolean))
        : new Set((state.patients || []).map((p) => p.importId).filter(Boolean));
    const neu = [];
    const dup = [];
    (data.records || []).forEach((rec) => {
      if (!rec?.importId) return;
      if (existing.has(rec.importId)) dup.push(rec);
      else neu.push(rec);
    });
    return { neu, dup };
  }

  function ensureImportBatches() {
    const state = global.state;
    if (!state) return [];
    if (!Array.isArray(state.importBatches)) state.importBatches = [];
    return state.importBatches;
  }

  function registerImportBatch(batch) {
    const list = ensureImportBatches();
    list.unshift(batch);
    if (list.length > 40) list.length = 40;
    return batch;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function mapSelectHtml(fields, headers, map) {
    const opts = [`<option value="">— ignorar —</option>`]
      .concat(headers.map((h) => `<option value="${esc(h)}">${esc(h)}</option>`))
      .join('');
    return `<div class="table-wrap"><table class="import-map-table">
      <thead><tr><th>Campo do sistema</th><th>Coluna do arquivo</th></tr></thead>
      <tbody>${fields
        .map((f) => {
          const cur = map[f.id] || '';
          const options = [`<option value="">— ignorar —</option>`]
            .concat(
              headers.map(
                (h) => `<option value="${esc(h)}" ${h === cur ? 'selected' : ''}>${esc(h)}</option>`
              )
            )
            .join('');
          return `<tr>
            <td><strong>${esc(f.label)}</strong>${f.required ? ' <span class="badge b-amber">obrigatório</span>' : ''}</td>
            <td><select class="select import-map-sel" data-field="${esc(f.id)}">${options}</select></td>
          </tr>`;
        })
        .join('')}</tbody></table></div>`;
  }

  function previewRowsHtml(headers, rows, limit = 5) {
    const cols = headers.slice(0, 8);
    if (!rows.length) return '<div class="empty">Arquivo sem linhas de dados.</div>';
    return `<div class="table-wrap"><table>
      <thead><tr>${cols.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows
        .slice(0, limit)
        .map(
          (r) =>
            `<tr>${cols.map((h) => `<td>${esc(String(r[h] ?? '').slice(0, 48))}</td>`).join('')}</tr>`
        )
        .join('')}</tbody></table></div>
      <p class="field-hint">Mostrando ${Math.min(limit, rows.length)} de ${rows.length} linha(s).</p>`;
  }

  function readMapFromDom() {
    const map = {};
    document.querySelectorAll('.import-map-sel').forEach((sel) => {
      map[sel.dataset.field] = sel.value || '';
    });
    return map;
  }

  function buildDraftFromWizard() {
    const wiz = global.__importWizard;
    if (!wiz?.parsed?.rows?.length) return null;
    const kind = wiz.kind === 'costs' ? 'costs' : 'patients';
    const map = wiz.map || {};
    const mappedRows = applyColumnMap(wiz.parsed.rows, map);
    const validation = validateMapped(kind, mappedRows);
    let data;
    if (kind === 'costs') {
      data = global.mapCustoRows(mappedRows, { source: wiz.filename });
    } else {
      const clinicId = wiz.clinicId;
      const clinic = global.clinic?.(clinicId) || { name: '' };
      const origin =
        /particular/i.test(clinic.name || '') || clinicId === 'particular' ? 'Particular' : 'Prestação';
      data = global.mapHonorarioRows(mappedRows, {
        clinicId,
        origin,
        prefix: String(clinicId || 'x').slice(0, 3),
        source: wiz.filename
      });
    }
    const split = classifyRecords(kind, data);
    return { kind, mappedRows, validation, data, split, map };
  }

  function setWizardStep(step) {
    const wiz = global.__importWizard;
    if (!wiz) return;
    wiz.step = step;
    renderWizardBody();
  }

  function renderWizardBody() {
    const wiz = global.__importWizard;
    const box = document.getElementById('importWizardBody');
    const saveBtn = document.getElementById('modalSave');
    if (!wiz || !box) return;
    const step = wiz.step || 1;
    const steps = ['Arquivo', 'Mapeamento', 'Revisão', 'Confirmar'];
    const stepper = `<div class="import-stepper">${steps
      .map(
        (label, i) =>
          `<span class="import-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}">${i + 1}. ${esc(label)}</span>`
      )
      .join('')}</div>`;

    if (step === 1) {
      if (saveBtn) {
        saveBtn.textContent = 'Continuar';
        saveBtn.style.display = '';
      }
      box.innerHTML = `${stepper}
        <div class="form-grid">
          <div class="field full"><label>Arquivo</label>
            <input id="importFile" type="file" class="input" accept=".csv,.html,.htm,.xlsx,.xls,text/csv,text/html,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel">
            <p class="field-hint">CSV, HTML (tabela) ou XLSX. Nada sobrescreve lançamentos existentes — duplicatas são reportadas.</p>
          </div>
          <div class="field"><label>Tipo</label>
            <select id="importKind" class="select">
              <option value="auto" ${wiz.kindMode === 'auto' ? 'selected' : ''}>Detectar automaticamente</option>
              <option value="patients" ${wiz.kindMode === 'patients' ? 'selected' : ''}>Honorários / pacientes</option>
              <option value="costs" ${wiz.kindMode === 'costs' ? 'selected' : ''}>Custos</option>
            </select>
          </div>
          <div class="field"><label>Clínica (honorários)</label>
            <select id="importClinic" class="select"><option value="">— selecione —</option>${(global.state?.clinics || [])
              .map(
                (c) =>
                  `<option value="${esc(c.id)}" ${wiz.clinicId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`
              )
              .join('')}</select>
          </div>
          <div class="field full"><label>Prévia</label><div id="importPreview">${wiz.parsed ? previewRowsHtml(wiz.parsed.headers, wiz.parsed.rows) : '<div class="empty">Nenhum arquivo ainda.</div>'}</div></div>
        </div>`;
      document.getElementById('importFile')?.addEventListener('change', onFilePicked);
      document.getElementById('importKind')?.addEventListener('change', () => {
        wiz.kindMode = document.getElementById('importKind').value;
      });
      document.getElementById('importClinic')?.addEventListener('change', () => {
        wiz.clinicId = document.getElementById('importClinic').value;
      });
      return;
    }

    if (step === 2) {
      if (saveBtn) saveBtn.textContent = 'Continuar';
      const fields = wiz.kind === 'costs' ? COST_FIELDS : PATIENT_FIELDS;
      box.innerHTML = `${stepper}
        <p class="field-hint">Mapeamento automático pelas colunas. Ajuste manualmente se necessário.</p>
        ${mapSelectHtml(fields, wiz.parsed.headers, wiz.map)}
        <div class="row-actions" style="margin-top:12px">
          <button type="button" class="btn" onclick="ChevalierImport.setStep(1)">Voltar</button>
        </div>`;
      return;
    }

    if (step === 3) {
      const draft = buildDraftFromWizard();
      wiz.draft = draft;
      if (saveBtn) saveBtn.textContent = 'Continuar';
      const v = draft.validation;
      const split = draft.split;
      box.innerHTML = `${stepper}
        <div class="grid kpi-grid" style="grid-template-columns:repeat(4,minmax(100px,1fr));margin-bottom:12px">
          <div class="kpi"><div class="label">Linhas</div><div class="value">${v.total}</div></div>
          <div class="kpi"><div class="label">Válidas</div><div class="value">${v.valid}</div></div>
          <div class="kpi"><div class="label">Novas</div><div class="value">${split.neu.length}</div></div>
          <div class="kpi"><div class="label">Duplicatas</div><div class="value">${split.dup.length}</div></div>
        </div>
        ${v.errors.length ? `<div class="warning-banner"><strong>${v.errors.length} erro(s)</strong><ul>${v.errors.slice(0, 8).map((e) => `<li>L${e.line}: ${esc(e.message)}</li>`).join('')}</ul></div>` : ''}
        ${v.warnings.length ? `<p class="field-hint">${v.warnings.length} aviso(s) — ex.: valores vazios.</p>` : ''}
        <p class="field-hint">Duplicatas (mesmo <code>importId</code>) serão ignoradas — nenhum registro existente será sobrescrito.</p>
        <div class="row-actions" style="margin-top:12px">
          <button type="button" class="btn" onclick="ChevalierImport.setStep(2)">Voltar</button>
          ${v.errors.length || split.neu.length === 0 ? '' : ''}
        </div>`;
      return;
    }

    // step 4 confirm
    const draft = wiz.draft || buildDraftFromWizard();
    wiz.draft = draft;
    if (saveBtn) saveBtn.textContent = 'Confirmar importação';
    box.innerHTML = `${stepper}
      <div class="detail-grid">
        <div><span>Arquivo</span><strong>${esc(wiz.filename || '—')}</strong></div>
        <div><span>Tipo</span><strong>${draft.kind === 'costs' ? 'Custos' : 'Honorários / pacientes'}</strong></div>
        <div><span>Novos</span><strong>${draft.split.neu.length}</strong></div>
        <div><span>Ignorados (duplicata)</span><strong>${draft.split.dup.length}</strong></div>
        <div><span>Erros de validação</span><strong>${draft.validation.errors.length}</strong></div>
        ${draft.kind !== 'costs' ? `<div><span>Clínica</span><strong>${esc(global.clinic?.(wiz.clinicId)?.name || wiz.clinicId || '—')}</strong></div>` : ''}
      </div>
      <p class="field-hint" style="margin-top:12px">Ao confirmar, o lote é registrado em Configurações → Importações. Operação idempotente e append-only.</p>
      <div class="row-actions" style="margin-top:12px">
        <button type="button" class="btn" onclick="ChevalierImport.setStep(3)">Voltar</button>
      </div>`;
  }

  async function onFilePicked() {
    const wiz = global.__importWizard;
    const fileEl = document.getElementById('importFile');
    const f = fileEl?.files?.[0];
    const box = document.getElementById('importPreview');
    if (!f || !wiz) {
      if (box) box.innerHTML = '<div class="empty">Nenhum arquivo ainda.</div>';
      return;
    }
    wiz.filename = f.name;
    wiz.kindMode = document.getElementById('importKind')?.value || 'auto';
    wiz.clinicId = document.getElementById('importClinic')?.value || '';
    try {
      const lower = f.name.toLowerCase();
      let parsed;
      if (/\.xlsx?$/.test(lower)) {
        if (box) box.innerHTML = '<div class="empty">Lendo planilha Excel…</div>';
        const buf = await f.arrayBuffer();
        const x = await parseXlsxArrayBuffer(buf);
        const kind = global.detectImportKind?.(x.headers) || 'unknown';
        parsed = { kind, headers: x.headers, rows: x.rows, format: 'xlsx', sheetName: x.sheetName };
      } else {
        const text = await f.text();
        parsed = global.parseImportFileContent?.(text, f.name) || { headers: [], rows: [], kind: 'unknown' };
        parsed.format = lower.endsWith('.html') || lower.endsWith('.htm') ? 'html' : 'csv';
      }
      let kind = wiz.kindMode;
      if (kind === 'auto') kind = parsed.kind;
      wiz.parsed = parsed;
      wiz.kind = kind === 'costs' ? 'costs' : kind === 'patients' ? 'patients' : parsed.kind;
      const fields = wiz.kind === 'costs' ? COST_FIELDS : PATIENT_FIELDS;
      wiz.map = autoMapFields(parsed.headers, fields);
      if (box) {
        box.innerHTML = `<p class="field-hint"><strong>${esc(f.name)}</strong> · ${parsed.rows.length} linha(s) · tipo: <strong>${esc(wiz.kind)}</strong>${parsed.sheetName ? ` · aba ${esc(parsed.sheetName)}` : ''}</p>${previewRowsHtml(parsed.headers, parsed.rows)}`;
      }
    } catch (e) {
      console.warn(e);
      if (box) box.innerHTML = `<div class="warning-banner">Falha ao ler arquivo: ${esc(e.message || e)}</div>`;
      wiz.parsed = null;
    }
  }

  function nextStepFromUi() {
    const wiz = global.__importWizard;
    if (!wiz) return;
    if (wiz.step === 1) {
      wiz.kindMode = document.getElementById('importKind')?.value || 'auto';
      wiz.clinicId = document.getElementById('importClinic')?.value || '';
      if (!wiz.parsed?.rows?.length) {
        global.toast?.('Selecione um arquivo válido.');
        return;
      }
      let kind = wiz.kindMode;
      if (kind === 'auto') kind = wiz.parsed.kind;
      if (kind === 'unknown' || !kind) {
        global.toast?.('Não reconheci o formato. Escolha Honorários ou Custos.');
        return;
      }
      wiz.kind = kind === 'costs' ? 'costs' : 'patients';
      if (wiz.kind === 'patients' && !wiz.clinicId) {
        global.toast?.('Selecione a clínica dos honorários.');
        return;
      }
      const fields = wiz.kind === 'costs' ? COST_FIELDS : PATIENT_FIELDS;
      if (!wiz.map) wiz.map = autoMapFields(wiz.parsed.headers, fields);
      setWizardStep(2);
      return;
    }
    if (wiz.step === 2) {
      wiz.map = { ...wiz.map, ...readMapFromDom() };
      const fields = wiz.kind === 'costs' ? COST_FIELDS : PATIENT_FIELDS;
      const missingReq = fields.filter((f) => f.required && !wiz.map[f.id]);
      if (missingReq.length) {
        global.toast?.(`Mapeie o campo obrigatório: ${missingReq.map((f) => f.label).join(', ')}`);
        return;
      }
      setWizardStep(3);
      return;
    }
    if (wiz.step === 3) {
      const draft = buildDraftFromWizard();
      wiz.draft = draft;
      if (!draft.split.neu.length) {
        global.toast?.('Nada novo para importar (tudo duplicado ou inválido).');
        // still allow confirm to download report
      }
      setWizardStep(4);
      return;
    }
    if (wiz.step === 4) {
      commitWizard();
    }
  }

  function commitWizard() {
    const wiz = global.__importWizard;
    const draft = wiz?.draft || buildDraftFromWizard();
    if (!draft) {
      global.toast?.('Nada para importar.');
      return;
    }
    // Only import NEW records — never overwrite
    const data = { ...draft.data, records: draft.split.neu };
    let patients = 0;
    let costs = 0;
    const errors = [...draft.validation.errors];
    try {
      if (draft.kind === 'costs') {
        costs = global.importHistoricoCosts?.(data, { sourceTag: 'assist-upload' }) || 0;
      } else {
        patients =
          global.importHistoricoPatients?.(data, {
            clinicId: wiz.clinicId,
            origin: data.origin,
            sourceTag: 'assist-upload:' + wiz.clinicId
          }) || 0;
      }
      // Vincular people[] e reparar relações
      const linked = global.ensurePeople?.() || 0;
      const batch = registerImportBatch({
        id: global.uid?.() || String(Date.now()),
        at: global.todayISO?.() || new Date().toISOString().slice(0, 10),
        filename: wiz.filename || '',
        kind: draft.kind,
        clinicId: wiz.clinicId || '',
        format: wiz.parsed?.format || 'csv',
        totalRows: draft.validation.total,
        valid: draft.validation.valid,
        added: patients + costs,
        skippedDup: draft.split.dup.length,
        errors: errors.length,
        peopleLinked: linked,
        map: draft.map
      });
      global.save?.();
      global.closeModal?.();
      global.renderAll?.();
      const report = [
        `Lote ${batch.id}`,
        `Arquivo: ${batch.filename}`,
        `Tipo: ${batch.kind}`,
        `Adicionados: ${batch.added}`,
        `Duplicatas ignoradas: ${batch.skippedDup}`,
        `Erros de validação: ${batch.errors}`,
        '',
        ...errors.map((e) => `L${e.line}: ${e.message}`),
        ...draft.split.dup.slice(0, 30).map((r) => `DUP ${r.importId} · ${r.name || r.desc || ''}`)
      ].join('\n');
      global.__lastImportReport = report;
      global.toast?.(
        batch.added
          ? `Importação: +${patients} casos, +${costs} custos · ${batch.skippedDup} duplicata(s) ignorada(s).`
          : `Nada novo. ${batch.skippedDup} duplicata(s) ignorada(s).`
      );
      // Offer report download lightly
      if (batch.skippedDup || batch.errors) {
        setTimeout(() => {
          if (global.confirm?.('Baixar relatório do lote (duplicatas/erros)?')) {
            downloadText(`import-lote-${batch.id}.txt`, report);
          }
        }, 350);
      }
    } catch (e) {
      console.error(e);
      global.toast?.('Falha na importação: ' + (e.message || e));
    }
  }

  function openWizard() {
    global.__importWizard = {
      step: 1,
      kindMode: 'auto',
      kind: 'patients',
      clinicId: '',
      parsed: null,
      map: null,
      draft: null,
      filename: ''
    };
    global.openModal?.(
      'Importação assistida',
      `<div id="importWizardBody"></div>`,
      () => nextStepFromUi()
    );
    document.getElementById('modalRoot')?.querySelector('.modal')?.classList.add('modal-wide');
    renderWizardBody();
  }

  function recentBatchesHtml() {
    const list = ensureImportBatches();
    if (!list.length) return '<div class="empty">Nenhum lote de importação assistida ainda.</div>';
    return `<div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Arquivo</th><th>Tipo</th><th>Novos</th><th>Duplicatas</th><th>Erros</th></tr></thead>
      <tbody>${list
        .slice(0, 15)
        .map(
          (b) => `<tr>
        <td>${esc(b.at || '')}</td>
        <td><strong>${esc(b.filename || '—')}</strong></td>
        <td>${esc(b.kind || '')}</td>
        <td>${Number(b.added) || 0}</td>
        <td>${Number(b.skippedDup) || 0}</td>
        <td>${Number(b.errors) || 0}</td>
      </tr>`
        )
        .join('')}</tbody></table></div>`;
  }

  global.ChevalierImport = {
    openWizard,
    setStep: setWizardStep,
    nextStepFromUi,
    recentBatchesHtml,
    ensureImportBatches,
    autoMapFields,
    applyColumnMap,
    validateMapped,
    classifyRecords,
    PATIENT_FIELDS,
    COST_FIELDS,
    downloadLastReport() {
      if (!global.__lastImportReport) {
        global.toast?.('Nenhum relatório de lote nesta sessão.');
        return;
      }
      downloadText('import-ultimo-lote.txt', global.__lastImportReport);
    }
  };
})(window);
