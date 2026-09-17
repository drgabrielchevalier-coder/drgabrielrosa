/**
 * Calendário / Lembretes + Planejamento (arquivos ICON/CBCT + IA).
 */
(function (global) {
  function S() {
    if (!global.state || typeof global.state !== 'object') {
      global.state = { reminders: [], plans: [], patients: [], materials: [], clinics: [], procedures: [], costs: [], payroll: [], prostheses: [] };
    }
    return global.state;
  }
  function ensureCollections() {
    const state = S();
    if (!Array.isArray(state.reminders)) state.reminders = [];
    if (!Array.isArray(state.plans)) state.plans = [];
  }

  function seedDefaults() {
    ensureCollections();
    const state = S();
    if (!state._calendarSeeded && state.reminders.length === 0) {
      const today = global.todayISO();
      const addDays = global.addDays;
      state.reminders = [
        { id: global.uid(), title: 'Reavaliar planejamento CBCT', date: addDays(2), time: '09:00', type: 'Planejamento', notes: 'Conferir canal mandibular e altura residual.', done: false, created: today },
        { id: global.uid(), title: 'Entrega protético / prova', date: addDays(5), time: '14:30', type: 'Prótese', notes: '', done: false, created: today },
        { id: global.uid(), title: 'Lembrete de retorno pós-cirúrgico', date: addDays(7), time: '10:00', type: 'Cirurgia', notes: 'Paciente protocolo.', done: false, created: today },
      ];
      state._calendarSeeded = true;
      return true;
    }
    return false;
  }

  function typeBadge(t) {
    const s = String(t || '').toLowerCase();
    let cls = 'b-gray';
    if (s.includes('cirurg') || s.includes('implante')) cls = 'b-red';
    else if (s.includes('prótese') || s.includes('protese')) cls = 'b-purple';
    else if (s.includes('planej') || s.includes('tomo')) cls = 'b-blue';
    else if (s.includes('finance') || s.includes('pago')) cls = 'b-amber';
    else if (s.includes('lembrete') || s.includes('geral')) cls = 'b-green';
    return `<span class="badge ${cls}">${global.esc(t || 'Lembrete')}</span>`;
  }

  function renderCalendario() {
    ensureCollections();
    seedDefaults();
    const root = document.getElementById('calendarList');
    const kpiOpen = document.getElementById('calOpen');
    const kpiToday = document.getElementById('calToday');
    const kpiWeek = document.getElementById('calWeek');
    if (!root) return;
    const state = S();
    const today = global.todayISO();
    const in7 = global.addDays(7);
    const q = (document.getElementById('calSearch')?.value || '').toLowerCase();
    const filter = document.getElementById('calFilter')?.value || 'open';
    let items = state.reminders.slice().sort((a, b) => String(a.date + (a.time || '')).localeCompare(String(b.date + (b.time || ''))));
    if (filter === 'open') items = items.filter((r) => !r.done);
    if (filter === 'done') items = items.filter((r) => r.done);
    if (filter === 'today') items = items.filter((r) => r.date === today);
    if (q) items = items.filter((r) => [r.title, r.notes, r.type, r.patient].some((v) => String(v || '').toLowerCase().includes(q)));

    const open = state.reminders.filter((r) => !r.done).length;
    const todayN = state.reminders.filter((r) => !r.done && r.date === today).length;
    const weekN = state.reminders.filter((r) => !r.done && r.date >= today && r.date <= in7).length;
    if (kpiOpen) kpiOpen.textContent = String(open);
    if (kpiToday) kpiToday.textContent = String(todayN);
    if (kpiWeek) kpiWeek.textContent = String(weekN);

    root.innerHTML = items.map((r) => {
      const overdue = !r.done && r.date && r.date < today;
      return `<article class="cal-card ${r.done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}">
        <div class="cal-card-main">
          <label class="cal-check"><input type="checkbox" ${r.done ? 'checked' : ''} onchange="ChevalierPlan.toggleReminder('${r.id}', this.checked)"><span></span></label>
          <div>
            <strong>${global.esc(r.title)}</strong>
            <div class="cell-sub">${global.fmtDate(r.date)}${r.time ? ' · ' + global.esc(r.time) : ''}${r.patient ? ' · ' + global.esc(r.patient) : ''}</div>
            ${r.notes ? `<p class="cal-notes">${global.esc(r.notes)}</p>` : ''}
          </div>
        </div>
        <div class="cal-card-side">
          ${typeBadge(r.type)}
          <div class="row-actions">
            <button class="btn small" onclick="ChevalierPlan.openReminderModal('${r.id}')">Editar</button>
            <button class="btn small danger" onclick="ChevalierPlan.deleteReminder('${r.id}')">Excluir</button>
          </div>
        </div>
      </article>`;
    }).join('') || '<div class="empty">Nenhum lembrete neste filtro. Crie o primeiro pelo botão ＋ Lembrete.</div>';
  }

  function openReminderModal(editId) {
    ensureCollections();
    const state = S();
    const r = state.reminders.find((x) => x.id === editId) || {};
    global.openModal(editId ? 'Editar lembrete' : 'Novo lembrete', `<div class="form-grid">
      <div class="field full"><label>Título</label><input id="rmTitle" class="input" value="${global.esc(r.title || '')}" placeholder="Ex.: Revisar CBCT / retorno"></div>
      <div class="field"><label>Data</label><input id="rmDate" type="date" class="input" value="${global.esc(r.date || global.todayISO())}"></div>
      <div class="field"><label>Horário</label><input id="rmTime" type="time" class="input" value="${global.esc(r.time || '')}"></div>
      <div class="field"><label>Tipo</label><select id="rmType" class="select">${['Lembrete','Planejamento','Cirurgia','Implante','Prótese','Endodontia','Financeiro','Geral'].map((t) => `<option ${t === (r.type || 'Lembrete') ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Paciente (opcional)</label><input id="rmPatient" class="input" value="${global.esc(r.patient || '')}"></div>
      <div class="field full"><label>Notas</label><textarea id="rmNotes" class="input" rows="3">${global.esc(r.notes || '')}</textarea></div>
    </div>`, () => {
      if (!global.getv('rmTitle')) return global.toast('Informe o título.');
      const obj = {
        id: editId || global.uid(),
        title: global.getv('rmTitle'),
        date: global.getv('rmDate') || global.todayISO(),
        time: global.getv('rmTime'),
        type: global.getv('rmType'),
        patient: global.getv('rmPatient'),
        notes: global.getv('rmNotes'),
        done: !!r.done,
        created: r.created || global.todayISO(),
      };
      if (editId) state.reminders = state.reminders.map((x) => (x.id === editId ? obj : x));
      else state.reminders.unshift(obj);
      global.save();
      global.closeModal();
      renderCalendario();
      global.toast('Lembrete salvo.');
    });
  }

  function toggleReminder(id, done) {
    ensureCollections();
    const r = S().reminders.find((x) => x.id === id);
    if (!r) return;
    r.done = !!done;
    global.save();
    renderCalendario();
  }

  function deleteReminder(id) {
    global.confirmDelete('Excluir este lembrete?', () => {
      S().reminders = S().reminders.filter((x) => x.id !== id);
    });
  }

  function renderPlanejamento() {
    ensureCollections();
    const list = document.getElementById('planList');
    const kpi = document.getElementById('planCount');
    const kpiAi = document.getElementById('planAiCount');
    if (!list) return;
    const state = S();
    const q = (document.getElementById('planSearch')?.value || '').toLowerCase();
    let plans = state.plans.slice().sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')));
    if (q) plans = plans.filter((p) => [p.title, p.patient, p.kind, p.name, p.notes].some((v) => String(v || '').toLowerCase().includes(q)));
    if (kpi) kpi.textContent = String(state.plans.length);
    if (kpiAi) kpiAi.textContent = String(state.plans.filter((p) => p.analysis).length);

    list.innerHTML = plans.map((p) => {
      const ai = p.analysis;
      return `<article class="plan-card">
        <div class="plan-card-top">
          <div>
            <strong>${global.esc(p.title || p.name || 'Arquivo')}</strong>
            <div class="cell-sub">${global.esc(p.kind || 'Planejamento')}${p.patient ? ' · ' + global.esc(p.patient) : ''} · ${p.uploadedAt ? global.esc(String(p.uploadedAt).slice(0, 10)) : '—'}</div>
          </div>
          <span class="badge ${ai ? 'b-green' : 'b-blue'}">${ai ? 'IA concluída' : 'Arquivo'}</span>
        </div>
        ${p.isImage ? `<div class="plan-thumb"><img src="${global.esc(p.url)}" alt="" loading="lazy"></div>` : `<div class="plan-file-pill">${global.esc((p.ext || 'file').toUpperCase())} · ${formatBytes(p.size || 0)}</div>`}
        ${ai ? `<div class="plan-ai-box"><strong>${global.esc(ai.summary || 'Análise')}</strong><div class="cell-sub">${global.esc(ai.provider || ai.mode || '')}</div></div>` : ''}
        <div class="row-actions plan-actions">
          <a class="btn small" href="${global.esc(p.url)}" target="_blank" rel="noopener">Abrir</a>
          <button class="btn small" onclick="ChevalierPlan.openAiModal('${p.id}')">IA tomografia</button>
          <button class="btn small" onclick="ChevalierPlan.openPlanMeta('${p.id}')">Editar</button>
          <button class="btn small danger" onclick="ChevalierPlan.deletePlan('${p.id}')">Excluir</button>
        </div>
      </article>`;
    }).join('') || '<div class="empty">Nenhum arquivo ainda. Envie exports ICON, fatias de CBCT, PDF ou STL.</div>';
  }

  function formatBytes(n) {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function uploadPlanFiles(fileList) {
    ensureCollections();
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const patient = document.getElementById('planPatient')?.value || '';
    const kind = document.getElementById('planKind')?.value || 'Planejamento ICON / CBCT';
    let ok = 0;
    global.toast(`Enviando ${files.length} arquivo(s)…`);
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('patient', patient);
      fd.append('kind', kind);
      fd.append('title', file.name.replace(/\.[^.]+$/, ''));
      if (typeof global.csrfToken === 'function') fd.append('csrf', global.csrfToken());
      try {
        const headers = typeof global.csrfHeaders === 'function' ? global.csrfHeaders() : {};
        const res = await fetch('api/planning-upload.php', { method: 'POST', body: fd, credentials: 'same-origin', headers });
        const data = await res.json();
        if (typeof global.applyCsrfFromResponse === 'function') global.applyCsrfFromResponse(data);
        if (!data.ok || !data.file) throw new Error(data.error || 'Falha no upload');
        S().plans.unshift({ ...data.file, analysis: null });
        ok++;
      } catch (e) {
        global.toast(e.message || 'Erro no upload');
      }
    }
    global.save();
    renderPlanejamento();
    if (ok) global.toast(`${ok} arquivo(s) salvos no planejamento.`);
  }

  function openPlanMeta(id) {
    const p = S().plans.find((x) => x.id === id);
    if (!p) return;
    global.openModal('Dados do planejamento', `<div class="form-grid">
      <div class="field full"><label>Título</label><input id="plTitle" class="input" value="${global.esc(p.title || '')}"></div>
      <div class="field"><label>Paciente</label><input id="plPatient" class="input" value="${global.esc(p.patient || '')}"></div>
      <div class="field"><label>Tipo</label><select id="plKind" class="select">${['Planejamento ICON / CBCT','Tomografia / fatia','Guia cirúrgico','STL / modelo','Relatório PDF','Outro'].map((t) => `<option ${t === p.kind ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field full"><label>Notas</label><textarea id="plNotes" class="input" rows="3">${global.esc(p.notes || '')}</textarea></div>
    </div>`, () => {
      p.title = global.getv('plTitle');
      p.patient = global.getv('plPatient');
      p.kind = global.getv('plKind');
      p.notes = global.getv('plNotes');
      global.save();
      global.closeModal();
      renderPlanejamento();
      global.toast('Planejamento atualizado.');
    });
  }

  function openAiModal(id) {
    const p = S().plans.find((x) => x.id === id);
    if (!p) return;
    global.openModal('IA · Tomografia de planejamento', `<div class="form-grid">
      <div class="field full"><p class="field-hint">A IA avalia o arquivo <strong>${global.esc(p.title || p.name)}</strong> com checklist de CBCT/implante${p.isImage ? ' e leitura visual da imagem' : ''}.</p></div>
      <div class="field"><label>Paciente</label><input id="aiPatient" class="input" value="${global.esc(p.patient || '')}"></div>
      <div class="field"><label>Região / sítio</label><input id="aiRegion" class="input" value="" placeholder="Ex.: 36 / seio esquerdo"></div>
      <div class="field full"><label>Objetivo</label><input id="aiGoal" class="input" value="Planejamento de implante" placeholder="Implante unitário, protocolo, enxerto…"></div>
      <div class="field full"><label>Notas clínicas</label><textarea id="aiNotes" class="input" rows="2">${global.esc(p.notes || '')}</textarea></div>
      <div class="field full" id="aiResultBox" hidden></div>
    </div>`, async () => {
      const btn = document.getElementById('modalSave');
      btn.textContent = 'Analisando…';
      btn.disabled = true;
      try {
        const res = await fetch('api/tomography-ai.php', {
          method: 'POST',
          headers: typeof global.csrfHeaders === 'function'
            ? global.csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' })
            : { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            fileId: p.id,
            patient: global.getv('aiPatient'),
            region: global.getv('aiRegion'),
            goal: global.getv('aiGoal'),
            notes: global.getv('aiNotes'),
            csrf: typeof global.csrfToken === 'function' ? global.csrfToken() : undefined,
          }),
        });
        const data = await res.json();
        if (typeof global.applyCsrfFromResponse === 'function') global.applyCsrfFromResponse(data);
        if (!data.ok || !data.analysis) throw new Error(data.error || 'Falha na IA');
        p.analysis = data.analysis;
        p.patient = global.getv('aiPatient') || p.patient;
        p.notes = global.getv('aiNotes') || p.notes;
        global.save();
        const a = data.analysis;
        const box = document.getElementById('aiResultBox');
        if (box) {
          box.hidden = false;
          box.innerHTML = `<div class="plan-ai-result">
            <strong>${global.esc(a.summary || '')}</strong>
            <p class="cell-sub">${global.esc(a.provider || '')} · ${global.esc(a.boneQuality || '')}</p>
            <h4>Achados</h4><ul>${(a.findings || []).map((x) => `<li>${global.esc(x)}</li>`).join('')}</ul>
            <h4>Riscos anatômicos</h4><ul>${(a.anatomicRisks || []).map((x) => `<li>${global.esc(x)}</li>`).join('')}</ul>
            <h4>Sugestões</h4><ul>${(a.implantSuggestions || []).map((x) => `<li>${global.esc(x)}</li>`).join('')}</ul>
            <p class="field-hint">${global.esc(a.disclaimer || '')}</p>
          </div>`;
        }
        btn.textContent = 'Fechar';
        btn.disabled = false;
        btn.onclick = () => { global.closeModal(); renderPlanejamento(); };
        global.toast('Análise de planejamento pronta.');
        renderPlanejamento();
      } catch (e) {
        btn.textContent = 'Analisar com IA';
        btn.disabled = false;
        global.toast(e.message || 'Erro na análise');
      }
    });
    const s = document.getElementById('modalSave');
    s.textContent = 'Analisar com IA';
  }

  function deletePlan(id) {
    global.confirmDelete('Excluir este arquivo de planejamento?', () => {
      S().plans = S().plans.filter((x) => x.id !== id);
      const headers = typeof global.csrfHeaders === 'function'
        ? global.csrfHeaders({ 'Content-Type': 'application/json' })
        : { 'Content-Type': 'application/json' };
      fetch('api/planning-upload.php', {
        method: 'DELETE',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ id, csrf: typeof global.csrfToken === 'function' ? global.csrfToken() : undefined }),
      }).then(async (res) => {
        try {
          const data = await res.json();
          if (typeof global.applyCsrfFromResponse === 'function') global.applyCsrfFromResponse(data);
        } catch (_) {}
      }).catch(() => {});
    });
  }

  function bindUi() {
    const input = document.getElementById('planFileInput');
    if (input && !input._bound) {
      input._bound = true;
      input.addEventListener('change', () => {
        uploadPlanFiles(input.files);
        input.value = '';
      });
    }
    const drop = document.getElementById('planDrop');
    if (drop && !drop._bound) {
      drop._bound = true;
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-drag'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('is-drag');
        uploadPlanFiles(e.dataTransfer?.files);
      });
    }
  }

  global.ChevalierPlan = {
    ensureCollections,
    seedDefaults,
    renderCalendario,
    renderPlanejamento,
    openReminderModal,
    toggleReminder,
    deleteReminder,
    openPlanMeta,
    openAiModal,
    deletePlan,
    uploadPlanFiles,
    bindUi,
  };
})(window);
