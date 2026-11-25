/**
 * Fase 5 — Importação assistida (CSV / HTML / XLSX + PDF/foto com IA).
 * Wizard: upload → mapeamento → revisão (linha a linha) → confirmação → registro de lote.
 * PDF, foto ou planilha fora do padrão: a IA (api/import-ai.php) transcreve a tabela e sugere
 * tipo, clínica e mapeamento — o usuário confere o mapeamento, revisa as linhas e confirma.
 * Depende de helpers expostos por app.js (importPick, mapHonorarioRows, etc.).
 */
(function (global) {
  const PATIENT_FIELDS = [
    { id: 'Nome', label: 'Nome / Paciente', required: true, aliases: ['Nome', 'Paciente', 'Patient', 'Client', 'Propriedade'] },
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
      .replace(/^\ufeff/, '')
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
    return { headers, rows, sheetName, aoa };
  }

  const AI_DOC_RE = /\.(pdf|jpe?g|png|webp)$/i;

  function isAiDocument(f) {
    return AI_DOC_RE.test(String(f?.name || '')) || /^(application\/pdf|image\/(jpeg|png|webp))$/.test(String(f?.type || ''));
  }

  /** Foto → JPEG em data URL, no máximo 2000 px no lado maior (legível para a IA, leve para enviar). */
  async function imageToDataUrl(file) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /** Conteúdo do arquivo para a IA: texto (PDF digital, planilha) ou imagens (foto, PDF escaneado). */
  async function readForAi(f) {
    const lower = String(f.name || '').toLowerCase();
    if (/\.pdf$/.test(lower) || f.type === 'application/pdf') {
      if (!global.ChevalierNfe?.readPdfForAi) throw new Error('Leitor de PDF indisponível. Recarregue a página.');
      const pdf = await global.ChevalierNfe.readPdfForAi(f);
      return { text: pdf.text, images: pdf.images };
    }
    if (/\.(jpe?g|png|webp)$/.test(lower) || /^image\//.test(f.type || '')) {
      return { text: '', images: [await imageToDataUrl(f)] };
    }
    if (/\.xlsx?$/.test(lower)) {
      const x = await parseXlsxArrayBuffer(await f.arrayBuffer());
      const tsv = (x.aoa || []).slice(0, 400).map((r) => (r || []).map((c) => String(c ?? '').replace(/\s+/g, ' ').trim()).join('\t')).join('\n');
      return { text: tsv, images: [] };
    }
    let text = await f.text();
    if (/\.html?$/.test(lower)) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = [...doc.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => td.textContent.replace(/\s+/g, ' ').trim()).join('\t')).join('\n') || doc.body.textContent;
    }
    return { text: text.slice(0, 150000), images: [] };
  }

  /** Clínica do documento (nome dito pela IA) → id cadastrado. */
  function matchClinicId(name) {
    const n = normHeader(name);
    if (!n) return '';
    const list = global.state?.clinics || [];
    const hit = list.find((c) => normHeader(c.name) === n)
      || list.find((c) => normHeader(c.name).includes(n) || n.includes(normHeader(c.name)));
    return hit ? hit.id : '';
  }

  async function parseWithAi(f, wiz) {
    const payload = await readForAi(f);
    const kindHint = wiz.kindMode === 'patients' || wiz.kindMode === 'costs' ? wiz.kindMode : '';
    const r = await fetch('api/import-ai.php', {
      method: 'POST',
      headers: global.csrfHeaders ? global.csrfHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        text: payload.text,
        images: payload.images,
        fileName: f.name,
        kindHint,
        clinics: (global.state?.clinics || []).map((c) => c.name),
        csrf: global.csrfToken ? global.csrfToken() : '',
      }),
    });
    let data = {};
    try { data = await r.json(); global.applyCsrfFromResponse?.(data); } catch (_) {}
    if (r.status === 401) { location.href = 'login.php'; throw new Error('Sessão expirada.'); }
    if (!r.ok || !data.ok) throw new Error(data.error || 'A IA não conseguiu ler o documento.');
    return data;
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

  /* ---------- Procedimentos escritos à mão → catálogo (IA) ---------- */
  function procKey(text) {
    return normHeader(text).replace(/\s+/g, ' ').trim();
  }
  function procName(id) {
    return (global.procedure ? global.procedure(id).name : id) || id;
  }
  function procMatchCache() {
    const st = global.state || {};
    if (!st.settings || typeof st.settings !== 'object') st.settings = {};
    if (!st.settings.procTextMap || typeof st.settings.procTextMap !== 'object') st.settings.procTextMap = {};
    return st.settings.procTextMap;
  }
  /** Uma entrada por descrição distinta (ex.: "Rasp c/ prof + Rest 24"), com quantas linhas a usam. */
  function procMatchEntries(draft) {
    const wiz = global.__importWizard;
    if (!wiz.pm) wiz.pm = { list: [], byKey: {}, state: 'idle', done: 0, error: '' };
    const pm = wiz.pm;
    const cache = procMatchCache();
    selectedNew(draft).concat(draft.split.neu).forEach((r) => {
      const text = String(r.observation || '').trim();
      const key = procKey(text);
      if (!key) return;
      if (!pm.byKey[key]) {
        const cached = cache[key];
        const entry = { key, text, count: 0, items: cached ? cached.map((x) => ({ ...x })) : null, source: cached ? 'aprendido' : '' };
        pm.byKey[key] = entry;
        pm.list.push(entry);
      }
    });
    pm.list.forEach((e) => { e.count = 0; });
    draft.split.neu.forEach((r) => { const e = pm.byKey[procKey(r.observation)]; if (e) e.count++; });
    pm.list.sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'pt-BR'));
    return pm;
  }
  async function runProcMatch() {
    const wiz = global.__importWizard;
    const pm = wiz?.pm;
    if (!pm || pm.state === 'running') return;
    const todo = pm.list.filter((e) => !e.items);
    if (!todo.length) { pm.state = 'done'; return; }
    pm.state = 'running'; pm.done = 0; pm.error = '';
    const catalog = (global.state?.procedures || []).map((p) => ({ id: p.id, name: p.name, specialty: global.specialtyName ? global.specialtyName(p.specialty || '') : (p.specialty || '') }));
    try {
      for (let i = 0; i < todo.length; i += 60) {
        const chunk = todo.slice(i, i + 60);
        const r = await fetch('api/procedure-match-ai.php', {
          method: 'POST',
          headers: global.csrfHeaders ? global.csrfHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ texts: chunk.map((e) => e.text), procedures: catalog, csrf: global.csrfToken ? global.csrfToken() : '' }),
        });
        let data = {};
        try { data = await r.json(); global.applyCsrfFromResponse?.(data); } catch (_) {}
        if (r.status === 401) { location.href = 'login.php'; return; }
        if (!r.ok || !data.ok) throw new Error(data.error || 'A IA não conseguiu interpretar os procedimentos.');
        chunk.forEach((e, j) => { e.items = (data.results?.[j] || []).map((x) => ({ ...x })); e.source = 'ia'; });
        pm.done += chunk.length;
        if (wiz.step === 3) rerenderKeepScroll();
      }
      pm.state = 'done';
    } catch (e) {
      pm.state = 'error';
      pm.error = e.message || String(e);
    }
    if (global.__importWizard === wiz && wiz.step === 3) rerenderKeepScroll();
  }
  function itemLabel(it) {
    return it.procedureId ? procName(it.procedureId) : `＋ novo: ${it.newName}`;
  }
  function entrySummary(e) {
    if (!e || !e.items) return '';
    if (!e.items.length) return 'Procedimento livre (sem correspondência)';
    return e.items.map((it) => itemLabel(it) + (it.tooth ? ` · ${it.tooth}` : '')).join(' + ');
  }
  function procMatchHtml(draft) {
    const pm = procMatchEntries(draft);
    if (!pm.list.length) return '';
    const pending = pm.list.filter((e) => !e.items).length;
    const head = pm.state === 'running'
      ? `<p class="field-hint"><strong>A IA está interpretando os procedimentos…</strong> ${pm.done} de ${pm.list.filter((e) => e.source !== 'aprendido').length} descrição(ões).</p>`
      : pm.state === 'error'
        ? `<div class="warning-banner">${esc(pm.error)} ${pending ? 'As descrições sem interpretação entram como estão hoje (procedimento estimado pelo texto).' : ''}</div>`
        : `<p class="field-hint">Cada descrição diferente aparece uma vez; o que você ajustar vale para todas as linhas com o mesmo texto e fica aprendido para as próximas importações.</p>`;
    const opts = (global.state?.procedures || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    const rows = pm.list.map((e, idx) => {
      const chips = !e.items
        ? '<span class="cell-sub">aguardando…</span>'
        : e.items.length
          ? e.items.map((it, j) => `<span class="pm-chip ${it.procedureId ? '' : 'is-new'}">${esc(itemLabel(it))}
              <input class="pm-tooth" data-e="${idx}" data-j="${j}" value="${esc(it.tooth || '')}" placeholder="dente" aria-label="Dente / região">
              <button type="button" class="pm-x" onclick="ChevalierImport.pmRemove(${idx},${j})" aria-label="Remover">×</button></span>`).join('')
          : '<span class="cell-sub">Sem correspondência: entra como procedimento livre</span>';
      return `<tr>
        <td><strong>${esc(e.text)}</strong><span class="cell-sub">${e.count} linha(s)${e.source === 'aprendido' ? ' · aprendido' : e.source === 'ia' ? ' · IA' : ''}</span></td>
        <td class="pm-cell">${chips}
          <select class="select pm-add" data-e="${idx}" aria-label="Adicionar procedimento"><option value="">＋ adicionar procedimento…</option>${opts}</select></td>
      </tr>`;
    }).join('');
    return `<h3 class="section-title" style="margin-top:14px">Procedimentos interpretados</h3>${head}
      <div class="table-wrap" style="max-height:320px;overflow:auto"><table class="pm-table">
        <thead><tr><th>Como está escrito</th><th>Procedimentos do sistema (dente)</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <p class="field-hint">“＋ novo” = procedimento que não existe no catálogo; ele é criado ao confirmar (valores zerados, para você precificar depois). Remova o chip se não quiser criar.</p>`;
  }
  /** Redesenha a etapa mantendo a rolagem (lista de procedimentos e janela). */
  function rerenderKeepScroll() {
    const list = document.querySelector('.pm-table')?.parentElement;
    const scroller = document.getElementById('importWizardBody')?.closest('.modal-body') || document.querySelector('#modalRoot .modal');
    const a = list ? list.scrollTop : 0;
    const b = scroller ? scroller.scrollTop : 0;
    renderWizardBody();
    const list2 = document.querySelector('.pm-table')?.parentElement;
    if (list2) list2.scrollTop = a;
    if (scroller) scroller.scrollTop = b;
  }
  function bindProcMatch(box) {
    const pm = global.__importWizard?.pm;
    if (!pm) return;
    box.querySelectorAll('.pm-tooth').forEach((el) => el.addEventListener('input', () => {
      const it = pm.list[Number(el.dataset.e)]?.items?.[Number(el.dataset.j)];
      if (it) it.tooth = el.value.trim();
    }));
    box.querySelectorAll('.pm-add').forEach((el) => el.addEventListener('change', () => {
      const e = pm.list[Number(el.dataset.e)];
      if (!el.value || !e) return;
      e.items = (e.items || []).concat([{ procedureId: el.value, tooth: '' }]);
      rerenderKeepScroll();
    }));
  }
  /** Ao confirmar: cria os procedimentos novos, grava o aprendizado e monta as linhas de cada lançamento. */
  function applyProcMatch(records) {
    const wiz = global.__importWizard;
    const pm = wiz?.pm;
    if (!pm || !pm.list.length) return { created: 0, linked: 0 };
    const st = global.state;
    const cache = procMatchCache();
    const byName = new Map((st.procedures || []).map((p) => [procKey(p.name), p.id]));
    let created = 0;
    const resolve = (it) => {
      if (it.procedureId) return it.procedureId;
      const k = procKey(it.newName);
      if (byName.has(k)) return byName.get(k);
      const id = 'proc-ia-' + (global.uid ? global.uid() : Date.now().toString(36));
      st.procedures.push({ id, name: it.newName, specialty: it.specialty || 'clinica', kind: it.kind || 'clinico', price: 0, extra: 0, items: [], clinicPrices: [], createdBy: 'import-ia' });
      byName.set(k, id);
      created++;
      return id;
    };
    pm.list.forEach((e) => {
      if (!e.items) return;
      e.items = e.items.map((it) => ({ procedureId: resolve(it), tooth: it.tooth || '' }));
      // só aprende o que teve vínculo: sem correspondência a IA tenta de novo na próxima (catálogo pode ter mudado)
      if (e.items.length) cache[e.key] = e.items.map((it) => ({ procedureId: it.procedureId, tooth: it.tooth }));
      else delete cache[e.key];
    });
    if (created) global.ensureClinicPrices?.();
    let linked = 0;
    records.forEach((r) => {
      const e = pm.byKey[procKey(r.observation)];
      if (!e || !e.items || !e.items.length) return;
      r.lines = e.items.map((it) => ({ procedureId: it.procedureId, tooth: it.tooth || '' }));
      r.procedureId = r.lines[0].procedureId;
      r.tooth = r.lines[0].tooth;
      linked++;
    });
    return { created, linked };
  }

  function existingPeopleMatches(records, clinicId) {
    const key = global.personNameKey || ((n) => normHeader(n));
    const counts = new Map();
    (global.state?.people || []).filter((pe) => pe.clinicId === clinicId).forEach((pe) => { const k = key(pe.name); counts.set(k, (counts.get(k) || 0) + 1); });
    return records.filter((r) => counts.get(key(r.name)) === 1).length;
  }

  function selectedNew(draft) {
    const ex = global.__importWizard?.excluded;
    return (draft?.split?.neu || []).filter((r) => !(ex && ex.has(r.importId)));
  }

  function fmtMoneyBR(v) {
    return global.brl ? global.brl.format(Number(v || 0)) : String(v ?? '');
  }

  function fmtDateBR(v) {
    const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || '—');
  }

  /** Revisão: cada lançamento novo com caixa para incluir ou tirar. */
  function reviewTableHtml(draft) {
    const wiz = global.__importWizard || {};
    const ex = wiz.excluded || new Set();
    const rows = draft.split.neu;
    if (!rows.length) return '<div class="empty">Nenhum lançamento novo para revisar.</div>';
    const isCost = draft.kind === 'costs';
    const head = isCost
      ? '<th>Descrição</th><th>Data</th><th>Venc.</th><th>Tipo</th><th>Valor</th><th>Status</th>'
      : '<th>Paciente</th><th>Data</th><th>Procedimento / obs.</th><th>Honorário</th><th>Recebido</th><th>Status</th>';
    const body = rows.slice(0, 300).map((r) => {
      const cells = isCost
        ? `<td><strong>${esc(r.desc)}</strong></td><td>${esc(fmtDateBR(r.date))}</td><td>${esc(fmtDateBR(r.due))}</td><td>${esc(r.type || '')}</td><td>${esc(fmtMoneyBR(r.value))}</td><td>${esc(r.status || '')}</td>`
        : `<td><strong>${esc(r.name)}</strong></td><td>${esc(fmtDateBR(r.date))}</td><td>${(() => { const e = wiz.pm?.byKey?.[procKey(r.observation)]; const sum = entrySummary(e); return sum ? `<strong>${esc(sum)}</strong><span class="cell-sub">${esc(String(r.observation || '').slice(0, 70))}</span>` : esc(String(r.observation || '').slice(0, 70)); })()}</td><td>${esc(fmtMoneyBR(r.value))}</td><td>${esc(fmtMoneyBR(r.received))}</td><td>${esc(r.status || '')}</td>`;
      return `<tr><td><input type="checkbox" class="import-row-sel" value="${esc(r.importId)}" ${ex.has(r.importId) ? '' : 'checked'} aria-label="Importar esta linha"></td>${cells}</tr>`;
    }).join('');
    const total = rows.filter((r) => !ex.has(r.importId)).reduce((s, r) => s + Number(r.value || 0), 0);
    return `<h3 class="section-title" style="margin-top:14px">Revise os lançamentos</h3>
      <p class="field-hint">Desmarque o que não deve entrar. <strong id="importSelCount">${rows.filter((r) => !ex.has(r.importId)).length}</strong> de ${rows.length} marcado(s) · total dos marcados: <strong id="importSelTotal">${esc(fmtMoneyBR(total))}</strong>.${rows.length > 300 ? ' Mostrando as 300 primeiras.' : ''}</p>
      <div class="table-wrap" style="max-height:360px;overflow:auto"><table>
        <thead><tr><th><input type="checkbox" id="importSelAll" ${ex.size ? '' : 'checked'} aria-label="Marcar todos"></th>${head}</tr></thead>
        <tbody>${body}</tbody></table></div>`;
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
            <input id="importFile" type="file" class="input" accept=".csv,.html,.htm,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,text/csv,text/html,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,image/jpeg,image/png,image/webp">
            <p class="field-hint">Planilha (CSV, XLSX, HTML) ou documento: PDF ou foto da folha de honorários. A IA lê o documento e sugere o mapeamento; você confere, revisa as linhas e confirma. Nada sobrescreve lançamentos existentes.</p>
          </div>
          <div class="field full"><label class="import-ai-toggle" style="display:flex;gap:8px;align-items:center;font-weight:500;cursor:pointer">
            <input type="checkbox" id="importUseAi" ${wiz.useAi ? 'checked' : ''}> Interpretar com IA também planilhas fora do padrão (título em cima, colunas com outros nomes)
          </label></div>
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
      document.getElementById('importUseAi')?.addEventListener('change', (ev) => {
        wiz.useAi = !!ev.target.checked;
        if (document.getElementById('importFile')?.files?.[0]) onFilePicked();
      });
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
      const ai = wiz.ai;
      box.innerHTML = `${stepper}
        ${ai ? `<div class="card" style="padding:12px;margin-bottom:12px"><strong>A IA leu o documento</strong>
          <span class="cell-sub">${esc(wiz.kind === 'costs' ? 'Custos' : 'Honorários / pacientes')} · ${wiz.parsed.rows.length} linha(s)${ai.clinic ? ` · clínica: ${esc(ai.clinic)}` : ''}${ai.period ? ` · período: ${esc(ai.period)}` : ''}</span>
          ${ai.notes ? `<p class="field-hint" style="margin:6px 0 0">${esc(ai.notes)}</p>` : ''}
          <p class="field-hint" style="margin:6px 0 0">Confira cada campo abaixo: a coluna sugerida pela IA já vem marcada.</p></div>` : ''}
        <p class="field-hint">${ai ? 'Mapeamento sugerido pela IA.' : 'Mapeamento automático pelas colunas.'} Ajuste manualmente se necessário.</p>
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
        ${draft.kind !== 'costs' ? procMatchHtml(draft) : ''}
        ${reviewTableHtml(draft)}
        <div class="row-actions" style="margin-top:12px">
          <button type="button" class="btn" onclick="ChevalierImport.setStep(2)">Voltar</button>
        </div>`;
      if (draft.kind !== 'costs') {
        bindProcMatch(box);
        if (wiz.pm && wiz.pm.state === 'idle') runProcMatch();
      }
      const refreshSel = () => {
        const sel = draft.split.neu.filter((r) => !wiz.excluded.has(r.importId));
        const cnt = document.getElementById('importSelCount');
        const tot = document.getElementById('importSelTotal');
        if (cnt) cnt.textContent = String(sel.length);
        if (tot) tot.textContent = fmtMoneyBR(sel.reduce((t, r) => t + Number(r.value || 0), 0));
      };
      box.querySelectorAll('.import-row-sel').forEach((el) => el.addEventListener('change', () => {
        if (!wiz.excluded) wiz.excluded = new Set();
        if (el.checked) wiz.excluded.delete(el.value); else wiz.excluded.add(el.value);
        refreshSel();
      }));
      box.querySelector('#importSelAll')?.addEventListener('change', (ev) => {
        const on = ev.target.checked;
        wiz.excluded = on ? new Set() : new Set(draft.split.neu.map((r) => r.importId));
        box.querySelectorAll('.import-row-sel').forEach((el) => { el.checked = on; });
        refreshSel();
      });
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
        <div><span>Novos (marcados)</span><strong>${selectedNew(draft).length}</strong></div>
        ${draft.split.neu.length - selectedNew(draft).length ? `<div><span>Desmarcados na revisão</span><strong>${draft.split.neu.length - selectedNew(draft).length}</strong></div>` : ''}
        <div><span>Ignorados (duplicata)</span><strong>${draft.split.dup.length}</strong></div>
        <div><span>Erros de validação</span><strong>${draft.validation.errors.length}</strong></div>
        ${draft.kind !== 'costs' ? `<div><span>Clínica</span><strong>${esc(global.clinic?.(wiz.clinicId)?.name || wiz.clinicId || '—')}</strong></div>` : ''}
        ${draft.kind !== 'costs' && wiz.pm?.list?.length ? `<div><span>Procedimentos interpretados</span><strong>${wiz.pm.list.filter((e) => e.items && e.items.length).length} de ${wiz.pm.list.length} descrições</strong></div>
        <div><span>Procedimentos novos a criar</span><strong>${new Set(wiz.pm.list.flatMap((e) => (e.items || []).filter((it) => !it.procedureId).map((it) => procKey(it.newName)))).size}</strong></div>` : ''}
        ${draft.kind !== 'costs' ? `<div><span>Lançamentos em cadastros existentes</span><strong>${existingPeopleMatches(selectedNew(draft), wiz.clinicId)}</strong></div>` : ''}
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
    wiz.ai = null;
    wiz.pm = null;
    wiz.excluded = new Set();
    try {
      const lower = f.name.toLowerCase();
      let parsed;
      if (isAiDocument(f) || wiz.useAi) {
        if (box) box.innerHTML = '<div class="empty">A IA está lendo o documento… pode levar alguns segundos.</div>';
        const saveBtn = document.getElementById('modalSave');
        if (saveBtn) saveBtn.disabled = true;
        try {
          const ai = await parseWithAi(f, wiz);
          parsed = { kind: ai.kind, headers: ai.headers, rows: ai.rows, format: /\.pdf$/.test(lower) ? 'pdf-ia' : /\.(jpe?g|png|webp)$/.test(lower) ? 'foto-ia' : 'planilha-ia' };
          wiz.ai = { notes: ai.notes || '', clinic: ai.clinic || '', period: ai.period || '', mapping: ai.mapping || {}, mode: ai.mode };
          const cid = matchClinicId(ai.clinic);
          if (cid && !wiz.clinicId) {
            wiz.clinicId = cid;
            const sel = document.getElementById('importClinic');
            if (sel) sel.value = cid;
          }
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      } else if (/\.xlsx?$/.test(lower)) {
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
      if (wiz.ai?.mapping) {
        // sugestão da IA tem prioridade; o automático cobre o que ela não mapeou
        Object.entries(wiz.ai.mapping).forEach(([field, col]) => {
          if (fields.some((x) => x.id === field) && parsed.headers.includes(col)) wiz.map[field] = col;
        });
      }
      if (box) {
        const aiInfo = wiz.ai
          ? ` · lido pela IA${wiz.ai.clinic ? ` · clínica: <strong>${esc(wiz.ai.clinic)}</strong>` : ''}${wiz.ai.period ? ` · período: ${esc(wiz.ai.period)}` : ''}`
          : '';
        const unknownHint = !wiz.ai && (!parsed.kind || parsed.kind === 'unknown')
          ? '<p class="field-hint" style="color:var(--red)">Não reconheci as colunas. Marque “Interpretar com IA” acima para a IA ler esta planilha.</p>'
          : '';
        box.innerHTML = `<p class="field-hint"><strong>${esc(f.name)}</strong> · ${parsed.rows.length} linha(s) · tipo: <strong>${esc(wiz.kind === 'costs' ? 'custos' : wiz.kind === 'patients' ? 'honorários / pacientes' : wiz.kind)}</strong>${parsed.sheetName ? ` · aba ${esc(parsed.sheetName)}` : ''}${aiInfo}</p>${wiz.ai?.notes ? `<p class="field-hint">${esc(wiz.ai.notes)}</p>` : ''}${unknownHint}${previewRowsHtml(parsed.headers, parsed.rows)}`;
      }
    } catch (e) {
      console.warn(e);
      if (box) box.innerHTML = `<div class="warning-banner">Falha ao ler arquivo: ${esc(e.message || e)}</div>`;
      wiz.ai = null;
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
    if (draft.kind !== 'costs' && wiz.pm?.state === 'running') {
      global.toast?.('Aguarde a IA terminar de interpretar os procedimentos.');
      return;
    }
    const data = { ...draft.data, records: selectedNew(draft).map((r) => ({ ...r })) };
    const pmResult = draft.kind !== 'costs' ? applyProcMatch(data.records) : { created: 0, linked: 0 };
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
            sourceTag: 'assist-upload:' + wiz.clinicId,
            linkPeople: true
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
        via: wiz.ai ? 'ia' : 'planilha',
        proceduresCreated: pmResult.created,
        proceduresLinked: pmResult.linked,
        excluded: draft.split.neu.length - data.records.length,
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
          ? `Importação: +${patients} casos, +${costs} custos${pmResult.created ? ` · ${pmResult.created} procedimento(s) novo(s) no catálogo` : ''} · ${batch.skippedDup} duplicata(s) ignorada(s).`
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

  function openWizard(opts = {}) {
    global.__importWizard = {
      step: 1,
      kindMode: opts.kind === 'costs' || opts.kind === 'patients' ? opts.kind : 'auto',
      kind: 'patients',
      clinicId: '',
      parsed: null,
      map: null,
      draft: null,
      filename: '',
      useAi: false,
      ai: null,
      excluded: new Set()
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
    pmRemove(e, j) {
      const entry = global.__importWizard?.pm?.list?.[e];
      if (!entry?.items) return;
      entry.items.splice(j, 1);
      rerenderKeepScroll();
    },
    openWizard,
    setStep: setWizardStep,
    nextStepFromUi,
    recentBatchesHtml,
    ensureImportBatches,
    autoMapFields,
    applyColumnMap,
    parseXlsxArrayBuffer,
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
