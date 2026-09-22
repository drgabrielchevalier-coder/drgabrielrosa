<?php
declare(strict_types=1);
require_once __DIR__ . '/api/auth-lib.php';
require_once __DIR__ . '/api/app-version-lib.php';
chevalier_auth_require();
chevalier_security_headers();
$chevalierBuild = chevalier_app_build(__DIR__);
$chevalierUser = chevalier_auth_user();
$chevalierCsrf = chevalier_csrf_token();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Dr Gabriel Rosa — Gestão</title>
<meta name="theme-color" content="#171816">
<meta name="description" content="Dr Gabriel Rosa — reabilitação oral e estética. Gestão clínica, financeira, pacientes, custos e próteses.">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" type="image/svg+xml" href="<?= chevalier_asset_url('assets/img/favicon.svg') ?>">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/app.css') ?>">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/update.css') ?>">
<script>
window.CHEVALIER_BUILD=<?= json_encode($chevalierBuild, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;
window.CHEVALIER_USER=<?= json_encode($chevalierUser, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;
window.CHEVALIER_CSRF=<?= json_encode($chevalierCsrf, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;
</script>
</head>
<body>
<div id="update-root" aria-live="polite"></div>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <button type="button" class="brand-link" onclick="go('dashboard')" title="Ir ao dashboard">
        <img class="brand-mark-img" src="<?= chevalier_asset_url('assets/img/logo-mark-sidebar.png') ?>" alt="">
        <span class="brand-text">
          <strong>Dr Gabriel Rosa</strong>
          <small>Reabilitação oral &amp; estética</small>
        </span>
      </button>
    </div>

    <nav class="sidebar-nav" id="sidebarNav" aria-label="Menu principal">
      <div class="nav-group" data-nav-group="inicio">
        <button type="button" class="nav-label" aria-expanded="true" onclick="toggleNavGroup(this)">
          <span>Início</span><span class="nav-chevron" aria-hidden="true"></span>
        </button>
        <div class="nav-items">
          <button class="nav-btn active" data-page="dashboard"><span class="nav-icon">◫</span>Dashboard</button>
          <button class="nav-btn" data-page="calendario"><span class="nav-icon">◷</span>Calendário</button>
          <button class="nav-btn" data-page="planejamento"><span class="nav-icon">⌖</span>Planejamento</button>
        </div>
      </div>

      <div class="nav-group" data-nav-group="cadastros">
        <button type="button" class="nav-label" aria-expanded="true" onclick="toggleNavGroup(this)">
          <span>Cadastros</span><span class="nav-chevron" aria-hidden="true"></span>
        </button>
        <div class="nav-items">
          <button class="nav-btn" data-page="pacientes"><span class="nav-icon">◉</span>Pacientes</button>
          <button class="nav-btn" data-page="clinicas"><span class="nav-icon">⌂</span>Clínicas</button>
          <button class="nav-btn" data-page="procedimentos"><span class="nav-icon">✦</span>Procedimentos</button>
        </div>
      </div>

      <div class="nav-group" data-nav-group="atendimento">
        <button type="button" class="nav-label" aria-expanded="true" onclick="toggleNavGroup(this)">
          <span>Atendimento</span><span class="nav-chevron" aria-hidden="true"></span>
        </button>
        <div class="nav-items">
          <button class="nav-btn" data-page="orcamento"><span class="nav-icon">▣</span>Orçamento</button>
          <button class="nav-btn" data-page="prestacao"><span class="nav-icon">↗</span>Prestação de serviço <span class="nav-badge" id="badgeReceber">0</span></button>
          <button class="nav-btn" data-page="particular"><span class="nav-icon">◇</span>Particular</button>
        </div>
      </div>

      <div class="nav-group" data-nav-group="producao">
        <button type="button" class="nav-label" aria-expanded="true" onclick="toggleNavGroup(this)">
          <span>Produção</span><span class="nav-chevron" aria-hidden="true"></span>
        </button>
        <div class="nav-items">
          <button class="nav-btn" data-page="protese"><span class="nav-icon">⌁</span>Fluxo de produção</button>
          <button class="nav-btn" data-page="trabalhos"><span class="nav-icon">♙</span>Trabalhos <span class="nav-badge" id="badgeProtese">0</span></button>
          <button class="nav-btn" data-page="entregas"><span class="nav-icon">◷</span>Agenda de entregas</button>
          <button class="nav-btn" data-page="timeline"><span class="nav-icon">≋</span>Timeline</button>
          <button class="nav-btn" data-page="consulta"><span class="nav-icon">⌕</span>Consultar código</button>
        </div>
      </div>

      <div class="nav-group" data-nav-group="financeiro">
        <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">
          <span>Financeiro</span><span class="nav-chevron" aria-hidden="true"></span>
        </button>
        <div class="nav-items">
          <button class="nav-btn" data-page="recebiveis"><span class="nav-icon">◌</span>Recebíveis</button>
          <button class="nav-btn" data-page="custos"><span class="nav-icon">↓</span>Custos</button>
          <button class="nav-btn" data-page="folha"><span class="nav-icon">₿</span>Folha</button>
          <button class="nav-btn" data-page="relatorios"><span class="nav-icon">▤</span>Relatórios</button>
        </div>
      </div>

      <div class="nav-group" data-nav-group="estoque">
        <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">
          <span>Estoque &amp; preços</span><span class="nav-chevron" aria-hidden="true"></span>
        </button>
        <div class="nav-items">
          <button class="nav-btn" data-page="materiais"><span class="nav-icon">⬡</span>Materiais</button>
          <button class="nav-btn" data-page="estoque"><span class="nav-icon">▦</span>Estoque</button>
          <button class="nav-btn" data-page="banco" data-tab="materiais"><span class="nav-icon">▣</span>Custos de materiais</button>
          <button class="nav-btn" data-page="banco" data-tab="procedimentos"><span class="nav-icon">☰</span>Banco de procedimentos</button>
        </div>
      </div>

      <div class="nav-group" data-nav-group="sistema">
        <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">
          <span>Sistema</span><span class="nav-chevron" aria-hidden="true"></span>
        </button>
        <div class="nav-items">
          <button class="nav-btn" data-page="config"><span class="nav-icon">⚙</span>Configurações</button>
        </div>
      </div>
    </nav>

    <div class="sidebar-foot">
      <strong>Dr Gabriel Rosa</strong>
      <p>Conectado como <span id="sidebarUser"><?= htmlspecialchars($chevalierUser, ENT_QUOTES, 'UTF-8') ?></span>.</p>
      <p><a href="api/auth.php?action=logout" class="sidebar-logout">Sair da conta</a></p>
    </div>
  </aside>

  <div class="mobile-overlay" id="overlay"></div>

  <main class="main">
    <header class="topbar">
      <button class="icon-btn mobile-menu" id="mobileMenu">☰</button>
      <div class="search">
        <span>⌕</span>
        <input id="globalSearch" placeholder="Buscar paciente, clínica, procedimento...">
      </div>
      <div class="spacer"></div>
      <div class="top-date" id="todayLabel"></div>
      <button class="icon-btn" title="Notificações" onclick="openNotifications()" id="notifBtn">♧</button>
      <button class="btn primary top-new" onclick="openQuickModal()">＋ Novo</button>
    </header>

    <div class="content">
      <!-- DASHBOARD -->
      <section class="page active" id="page-dashboard">
        <div class="page-head">
          <div>
            <h2>Dashboard</h2>
            <p>Visão consolidada da sua produção, custos e rentabilidade.</p>
          </div>
          <div class="page-actions">
            <select class="select" id="periodSelect" onchange="renderAll()">
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">6 meses</option>
              <option value="365">1 ano</option>
            </select>
            <button class="btn" onclick="exportReportCsv()">⇩ Exportar CSV</button>
          </div>
        </div>

        <div class="hero-note">
          <div>
            <h3>Resultado operacional</h3>
            <p>Receita recebida menos custos diretamente atribuíveis aos casos lançados no período.</p>
          </div>
          <div class="hero-kpi">
            <strong id="heroResult">R$ 0,00</strong>
            <small id="heroMargin">Margem 0%</small>
          </div>
        </div>

        <div class="grid kpi-grid">
          <div class="kpi"><div class="label">Faturamento</div><div class="value" id="kpiFaturamento">R$ 0</div><div class="meta up">↑ Produção contratada</div></div>
          <div class="kpi"><div class="label">Recebido</div><div class="value" id="kpiRecebido">R$ 0</div><div class="meta">Caixa realizado</div></div>
          <div class="kpi"><div class="label">A receber</div><div class="value" id="kpiReceber">R$ 0</div><div class="meta down" id="kpiVencidos">0 vencidos</div></div>
          <div class="kpi"><div class="label">Custos diretos</div><div class="value" id="kpiCustos">R$ 0</div><div class="meta">Materiais + lab + clínica</div></div>
          <div class="kpi"><div class="label">Lucro operacional</div><div class="value" id="kpiLucro">R$ 0</div><div class="meta up">Resultado dos casos</div></div>
          <div class="kpi"><div class="label">Margem média</div><div class="value" id="kpiMargem">0%</div><div class="meta">Sobre receita recebida</div></div>
        </div>

        <div class="grid layout-2">
          <div class="card">
            <div class="card-head">
              <div><h3>Lucro bruto × custos</h3><small>Evolução mensal dos casos lançados</small></div>
              <div class="right legend chart-legend">
                <span class="leg leg-profit">Lucro bruto</span>
                <span class="leg leg-cost">Custos</span>
              </div>
            </div>
            <div class="card-body chart-wrap">
              <div id="chartMonthly" class="chart-monthly" aria-label="Gráfico mensal de lucro e custos"></div>
              <div class="chart-axis" id="chartMonthlyLabels"></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Atenção hoje</h3><div class="right"><span class="badge b-red" id="attentionCount">0 itens</span></div></div>
            <div class="card-body list" id="attentionList"></div>
          </div>
        </div>

        <div class="grid layout-2" style="margin-top:16px">
          <div class="card">
            <div class="card-head"><div><h3>Recebido × a receber</h3><small>Caixa do período selecionado</small></div></div>
            <div class="card-body" id="chartCash"></div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Top procedimentos</h3><small>Lucro por tipo de procedimento</small></div></div>
            <div class="card-body" id="chartTopProcs"></div>
          </div>
        </div>

        <div class="section-title">Resultado por centro</div>
        <div class="grid layout-3" id="clinicSummary"></div>

        <div class="grid layout-2">
          <div class="card">
            <div class="card-head"><h3>Últimos pacientes / lançamentos</h3><div class="right"><button class="btn small" onclick="go('pacientes')">Ver todos</button></div></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Paciente</th><th>Origem</th><th>Tratamento</th><th>Financeiro</th><th>Resultado</th></tr></thead>
                <tbody id="dashboardPatients"></tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Distribuição de custos</h3></div>
            <div class="card-body" id="costDistribution"></div>
          </div>
        </div>
      </section>

      <!-- PACIENTES -->
      <section class="page" id="page-pacientes">
        <div class="page-head">
          <div><h2>Pacientes</h2><p>Cadastro único, origem, clínica, tratamento e resultado de cada caso.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openPatientModal()">＋ Novo paciente</button></div>
        </div>
        <div class="toolbar">
          <input class="input" id="patientSearch" placeholder="Buscar paciente..." oninput="renderPatients()">
          <select class="select" id="patientClinicFilter" onchange="renderPatients()">
            <option value="">Todas as clínicas</option>
          </select>
          <select class="select" id="patientStatusFilter" onchange="renderPatients()">
            <option value="">Todos os status</option>
            <option>À receber</option>
            <option>Recebido parcial</option>
            <option>Faturado / Recebido</option>
            <option>Aguardando acerto</option>
            <option>Retrabalho</option>
          </select>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Paciente</th><th>Origem / Clínica</th><th>Tratamento</th><th>Data</th><th>Valor</th><th>Custos</th><th>Lucro</th><th>Status</th><th></th></tr></thead>
              <tbody id="patientsTable"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- CLINICAS -->
      <section class="page" id="page-clinicas">
        <div class="page-head">
          <div><h2>Clínicas e cobrança</h2><p>Cadastre clínicas e, em cada uma, o modelo de cobrança: %, cartão, materiais e reembolso — com simulação e IA.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openClinicModal()">＋ Nova clínica</button></div>
        </div>
        <div class="grid layout-3" id="clinicsGrid"></div>
      </section>

      <!-- PROCEDIMENTOS -->
      <section class="page" id="page-procedimentos">
        <div class="page-head">
          <div><h2>Procedimentos</h2><p>Catálogo clínico e cirúrgico — custo fracionado (g/ml/un) e uma IA para recalcular a ficha.</p></div>
          <div class="page-actions">
            <button class="btn" onclick="atualizarCustosDaTabela(window.__costSheetId)">↻ Atualizar tabela</button>
            <button class="btn primary" onclick="openProcedureModal()">＋ Novo procedimento</button>
          </div>
        </div>
        <div class="toolbar">
          <input class="input" id="procSearch" placeholder="Buscar procedimento..." oninput="renderProcedures()">
          <select class="select" id="procSpecialtyFilter" onchange="renderProcedures()">
            <option value="">Todas as especialidades</option>
          </select>
          <select class="select" id="procKindFilter" onchange="renderProcedures()">
            <option value="">Clínicos e cirúrgicos</option>
            <option value="clinico">Só clínicos</option>
            <option value="cirurgico">Só cirúrgicos</option>
          </select>
        </div>
        <div class="grid layout-2">
          <div class="card">
            <div class="card-head"><h3>Catálogo</h3></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Procedimento</th><th>Preço base</th><th>Custo padrão</th><th>Margem proj.</th><th></th></tr></thead>
                <tbody id="proceduresTable"></tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Ficha de custo</h3><small id="costSheetTitle">Selecione um procedimento</small></div></div>
            <div class="card-body" id="costSheet"><div class="empty">Clique em “Ver ficha” em um procedimento.</div></div>
          </div>
        </div>
      </section>

      <!-- ORÇAMENTO -->
      <section class="page" id="page-orcamento">
        <div class="page-head">
          <div><h2>Orçamento de pacientes</h2><p>Monte o tratamento por clínica — honorário, materiais, lab e margem calculam sozinhos pelo modelo de cobrança.</p></div>
          <div class="page-actions">
            <button class="btn" type="button" onclick="clearOrcamento()">Limpar</button>
            <button class="btn" type="button" onclick="printOrcamento()">Imprimir</button>
            <button class="btn primary" type="button" onclick="saveOrcamentoAsPatient()">Salvar orçamento</button>
          </div>
        </div>
        <div class="orcamento-layout">
          <div class="card orcamento-builder">
            <div class="form-grid">
              <div class="field full"><label>Paciente</label><input id="oName" class="input" placeholder="Nome do paciente" oninput="recalcOrcamento()"></div>
              <div class="field"><label>Clínica</label><select id="oClinic" class="select" onchange="recalcOrcamento()"></select></div>
              <div class="field"><label>Origem</label>
                <select id="oOrigin" class="select" onchange="onOrcamentoOriginChange()">
                  <option>Prestação</option>
                  <option>Particular</option>
                </select>
              </div>
              <div class="field full"><label>Composição do tratamento</label>
                <p class="field-hint">Adicione procedimentos e quantidades. O cálculo usa preço por clínica + modelo de cobrança.</p>
                <div id="oTreatLines" class="treat-list orc-treat-list"></div>
                <div class="treat-add">
                  <select id="oAddProc" class="select"></select>
                  <input id="oAddQty" class="input" type="number" min="1" step="1" value="1" title="Quantidade" style="width:72px">
                  <button type="button" class="btn small" onclick="addOrcamentoLine()">＋ Adicionar</button>
                </div>
              </div>
              <div class="field full"><label>Observações</label><textarea id="oNotes" class="textarea" rows="2" placeholder="Opcional — aparece no orçamento salvo"></textarea></div>
            </div>
            <input type="hidden" id="oEditId" value="">
          </div>
          <div class="card orcamento-summary" id="orcamentoSummary">
            <h3>Cálculo automático</h3>
            <p class="field-hint" id="oBillingChips">Selecione a clínica e os procedimentos.</p>
            <div class="orc-kpi-grid">
              <div class="orc-kpi"><small>Praticado (clínica)</small><strong id="oPracticed">R$ 0</strong></div>
              <div class="orc-kpi accent"><small>Você recebe</small><strong id="oReceivable">R$ 0</strong></div>
              <div class="orc-kpi"><small>Materiais</small><strong id="oMatCost">R$ 0</strong></div>
              <div class="orc-kpi"><small>Componentes</small><strong id="oCompCost">R$ 0</strong></div>
              <div class="orc-kpi"><small>Laboratório</small><strong id="oLabCost">R$ 0</strong></div>
              <div class="orc-kpi"><small>Custo total (seu)</small><strong id="oCostTotal">R$ 0</strong></div>
              <div class="orc-kpi"><small>Margem projetada</small><strong id="oProfit">R$ 0</strong></div>
              <div class="orc-kpi"><small>Taxa cartão</small><strong id="oCardFee">R$ 0</strong></div>
            </div>
            <div class="orc-breakdown" id="oBreakdown"></div>
            <div class="orc-bom" id="oBom"></div>
          </div>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="card-head"><h3>Orçamentos salvos</h3><div class="right"><input class="input" id="oSearch" placeholder="Buscar paciente…" oninput="renderOrcamento()" style="min-width:200px"></div></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Paciente</th><th>Clínica</th><th>Tratamento</th><th>Praticado</th><th>Você recebe</th><th>Custos</th><th>Margem</th><th>Data</th><th></th></tr></thead>
            <tbody id="orcamentoTable"></tbody>
          </table></div>
        </div>
      </section>

      <section class="page" id="page-prestacao">
        <div class="page-head">
          <div><h2>Prestação de serviço</h2><p>Honorários por clínica parceira — componha tratamentos (plantio + enxerto + prótese) e cobre por centro.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openReceivableModal('prestacao')">＋ Lançar honorário</button></div>
        </div>
        <div class="subtabs" id="serviceClinicTabs" role="tablist" aria-label="Clínica"></div>
        <div class="svc-filter-row">
          <span class="svc-filter-label">Período</span>
          <div class="subtabs svc-period-tabs" id="servicePeriodTabs" role="tablist" aria-label="Período dos totais"></div>
        </div>
        <div class="grid kpi-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi"><div class="label">Honorários lançados <span class="kpi-hint" id="svcPeriodHint">30d</span></div><div class="value" id="svcTotal">R$ 0</div></div>
          <div class="kpi"><div class="label">Recebidos</div><div class="value" id="svcReceived">R$ 0</div></div>
          <div class="kpi"><div class="label">Em aberto</div><div class="value" id="svcOpen">R$ 0</div></div>
          <div class="kpi"><div class="label">Vencidos</div><div class="value" id="svcOverdue">R$ 0</div></div>
        </div>
        <div class="svc-filter-row svc-status-row">
          <span class="svc-filter-label">Lançamentos</span>
          <div class="subtabs svc-status-tabs" id="serviceStatusTabs" role="tablist" aria-label="Status dos lançamentos"></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Paciente</th><th>Clínica</th><th>Tratamento</th><th>Honorário</th><th>Recebido</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
          <tbody id="serviceTable"></tbody>
        </table></div></div>
      </section>

      <!-- PARTICULAR -->
      <section class="page" id="page-particular">
        <div class="page-head">
          <div><h2>Pacientes particulares</h2><p>Componha o tratamento (plantio + enxerto + prótese), com receita, laboratório, componentes e margem por caso.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openPatientModal('Particular')">＋ Novo caso particular</button></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Paciente</th><th>Tratamento</th><th>Contratado</th><th>Recebido</th><th>Lab</th><th>Componentes</th><th>Clínica</th><th>Lucro proj.</th><th>Progresso</th><th></th></tr></thead>
          <tbody id="privateTable"></tbody>
        </table></div></div>
      </section>

      <!-- TRABALHOS PROTÉTICOS -->
      <section class="page" id="page-trabalhos">
        <div class="page-head">
          <div><h2>Trabalhos</h2><p>Casos protéticos e cirúrgicos — paciente, etapa, prazo e fluxo.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openProsthesisModal()">＋ Novo trabalho</button></div>
        </div>
        <div class="grid kpi-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi"><div class="label">Em acompanhamento</div><div class="value" id="prosthActive">0</div></div>
          <div class="kpi"><div class="label">No laboratório</div><div class="value" id="prosthLab">0</div></div>
          <div class="kpi"><div class="label">Atrasados</div><div class="value" id="prosthLate">0</div></div>
          <div class="kpi"><div class="label">Urgentes</div><div class="value" id="prosthUrgent">0</div></div>
        </div>
        <div class="toolbar">
          <input class="input" id="prosthSearch" placeholder="Buscar paciente, código, lab..." oninput="renderTrabalhos()">
          <select class="select" id="prosthFilter" onchange="renderTrabalhos()">
            <option value="all">Todos</option>
            <option value="protetico">Só protéticos</option>
            <option value="cirurgico">Só cirúrgicos</option>
            <option value="active">Em andamento</option>
            <option value="late">Atrasados</option>
            <option value="urgent">Urgentes</option>
          </select>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Paciente / trabalho</th><th>Laboratório</th><th>Previsão</th><th>Prazo</th><th>Etapa atual</th><th></th></tr></thead>
          <tbody id="prosthTable"></tbody>
        </table></div></div>
      </section>

      <!-- FLUXO DE PRODUÇÃO -->
      <section class="page" id="page-protese">
        <div class="page-head">
          <div>
            <h2>Fluxo de produção</h2>
            <p id="flowSubtitle">Acompanhe casos protéticos e cirúrgicos em quadros separados.</p>
          </div>
          <div class="page-actions"><button class="btn primary" onclick="openProsthesisModal()">＋ Novo trabalho</button></div>
        </div>
        <div class="flow-tabs" role="tablist" aria-label="Tipo de fluxo">
          <button type="button" class="flow-tab active" data-flow="protetico" onclick="setProductionFlow('protetico',this)">Fluxo protético</button>
          <button type="button" class="flow-tab" data-flow="cirurgico" onclick="setProductionFlow('cirurgico',this)">Fluxo cirúrgico</button>
          <button type="button" class="flow-tab" data-flow="todos" onclick="setProductionFlow('todos',this)">Todos</button>
        </div>
        <div id="labColumns"></div>
      </section>

      <!-- ENTREGAS -->
      <section class="page" id="page-entregas">
        <div class="page-head">
          <div><h2>Agenda de entregas</h2><p>Trabalhos prontos, provas e prazos dos próximos 14 dias.</p></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Quando</th><th>Paciente</th><th>Trabalho</th><th>Laboratório</th><th>Etapa</th><th>Prazo</th><th></th></tr></thead>
          <tbody id="entregasTable"></tbody>
        </table></div></div>
      </section>

      <!-- TIMELINE -->
      <section class="page" id="page-timeline">
        <div class="page-head">
          <div><h2>Timeline</h2><p>Histórico visual de cada movimentação protética.</p></div>
        </div>
        <div class="card"><div class="card-body" id="prosthTimeline"></div></div>
      </section>

      <!-- CONSULTAR CÓDIGO -->
      <section class="page" id="page-consulta">
        <div class="page-head">
          <div><h2>Consultar código</h2><p>Localize um trabalho pelo código impresso na ficha ou na etiqueta.</p></div>
        </div>
        <div class="grid layout-2">
          <div class="card">
            <div class="card-head"><h3>Consultar pelo código</h3></div>
            <div class="card-body">
              <p class="lookup-lead">Digite o código do trabalho (ex.: GR0001) para abrir a ficha completa.</p>
              <div class="lookup-row">
                <input class="input" id="lookupCode" placeholder="Ex.: GR0001" maxlength="40" onkeydown="if(event.key==='Enter')lookupProsthesis()">
                <button class="btn primary" onclick="lookupProsthesis()">Consultar</button>
              </div>
              <div id="lookupResult" class="lookup-result"></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Do código ao cuidado</h3></div>
            <div class="card-body">
              <ol class="lookup-steps">
                <li><strong>Cadastre o trabalho.</strong><span>Cada caso recebe um código exclusivo.</span></li>
                <li><strong>Acompanhe a etapa.</strong><span>Laboratório, prova, prazo e urgência ficam na ficha.</span></li>
                <li><strong>Consulte quando precisar.</strong><span>Use o código para achar o paciente e o histórico.</span></li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <!-- RECEBIVEIS -->
      <section class="page" id="page-recebiveis">
        <div class="page-head">
          <div><h2>Recebíveis</h2><p>Valores contratados, recebimentos parciais, cobranças e vencimentos.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openReceivableModal()">＋ Novo recebível</button></div>
        </div>
        <div class="toolbar">
          <button class="filter-chip active" onclick="setReceivableFilter('',this)">Todos</button>
          <button class="filter-chip" onclick="setReceivableFilter('À receber',this)">À receber</button>
          <button class="filter-chip" onclick="setReceivableFilter('Recebido parcial',this)">Parcial</button>
          <button class="filter-chip" onclick="setReceivableFilter('Faturado / Recebido',this)">Recebidos</button>
          <button class="filter-chip" onclick="setReceivableFilter('Aguardando acerto',this)">Aguardando acerto</button>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Paciente</th><th>Origem</th><th>Valor</th><th>Recebido</th><th>Saldo</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
          <tbody id="receivablesTable"></tbody>
        </table></div></div>
      </section>

      <!-- CUSTOS -->
      <section class="page" id="page-custos">
        <div class="page-head">
          <div><h2>Custos</h2><p>Despesas operacionais por categoria, vencimento e centro de custo.</p></div>
          <div class="page-actions">
            <button class="btn" onclick="openBoletoScanModal()">⎙ Escanear boleto</button>
            <button class="btn primary" onclick="openCostModal()">＋ Novo custo</button>
          </div>
        </div>
          <div class="ai-banner scan-banner">
            <div>
              <strong>Leitor de boletos</strong>
              <p>Leitura automática do código de barras (faixa retangular). Importe foto ou PDF, confira os dados e confirme para lançar em Custos — com alerta se já existir lançamento parecido.</p>
            </div>
            <button class="btn primary" onclick="openBoletoScanModal()">Escanear agora</button>
          </div>
        <div class="grid kpi-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi"><div class="label">Total lançado</div><div class="value" id="costTotal">R$ 0</div></div>
          <div class="kpi"><div class="label">Pago</div><div class="value" id="costPaid">R$ 0</div></div>
          <div class="kpi"><div class="label">A pagar</div><div class="value" id="costOpen">R$ 0</div></div>
          <div class="kpi"><div class="label">Maior categoria</div><div class="value" id="costLargest">—</div></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Descrição</th><th>Tipo</th><th>Centro</th><th>Data</th><th>Vencimento</th><th>Forma pg.</th><th>Valor</th><th>Status</th><th></th></tr></thead>
          <tbody id="costsTable"></tbody>
        </table></div></div>
      </section>

      <!-- FOLHA -->
      <section class="page" id="page-folha">
        <div class="page-head">
          <div><h2>Folha de pagamento</h2><p>Fixos, diárias, comissões e remuneração por produção.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openPayrollModal()">＋ Novo lançamento</button></div>
        </div>
        <div class="grid layout-2">
          <div class="card"><div class="card-head"><h3>Lançamentos</h3></div><div class="table-wrap"><table>
            <thead><tr><th>Profissional</th><th>Tipo</th><th>Competência</th><th>Centro</th><th>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody id="payrollTable"></tbody>
          </table></div></div>
          <div class="card"><div class="card-head"><h3>Resumo</h3></div><div class="card-body" id="payrollSummary"></div></div>
        </div>
      </section>

      <!-- RELATORIOS -->
      <section class="page" id="page-relatorios">
        <div class="page-head">
          <div><h2>Relatórios</h2><p>Análises gerenciais para identificar onde sua margem cresce ou se perde.</p></div>
          <div class="page-actions"><button class="btn" onclick="exportReportCsv()">⇩ Exportar CSV</button></div>
        </div>
        <div class="report-grid">
          <div class="report-tile"><small>Melhor clínica por margem</small><strong id="reportBestClinic">—</strong></div>
          <div class="report-tile"><small>Procedimento mais rentável</small><strong id="reportBestProcedure">—</strong></div>
          <div class="report-tile"><small>Ticket médio</small><strong id="reportTicket">R$ 0</strong></div>
          <div class="report-tile"><small>Custo médio por caso</small><strong id="reportAvgCost">R$ 0</strong></div>
        </div>
        <div class="grid layout-2">
          <div class="card"><div class="card-head"><h3>Rentabilidade por clínica</h3></div><div class="card-body" id="reportClinics"></div></div>
          <div class="card"><div class="card-head"><h3>Rentabilidade por procedimento</h3></div><div class="card-body" id="reportProcedures"></div></div>
        </div>
      </section>

      <!-- MATERIAIS -->
      <section class="page" id="page-materiais">
        <div class="page-head">
          <div><h2>Materiais e banco de preços</h2><p>Marca, fornecedor, embalagem, preço atual e histórico de compra.</p></div>
          <div class="page-actions">
            <button class="btn" onclick="openBarcodeScanModal()">▮▮ Escanear código</button>
            <button class="btn primary" onclick="openMaterialModal()">＋ Novo material</button>
          </div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Material</th><th>Código de barras</th><th>Marca</th><th>Tipo</th><th>Fornecedor</th><th>Embalagem</th><th>Preço atual</th><th>Custo unit.</th><th>Atualizado</th><th></th></tr></thead>
          <tbody id="materialsTable"></tbody>
        </table></div></div>
      </section>

      <!-- ESTOQUE -->
      <section class="page" id="page-estoque">
        <div class="page-head">
          <div><h2>Estoque</h2><p>Saldo, estoque mínimo e valor financeiro imobilizado em materiais.</p></div>
          <div class="page-actions">
            <button class="btn" onclick="openBarcodeScanModal()">▮▮ Escanear código</button>
            <button class="btn primary" onclick="openStockModal()">＋ Movimentar estoque</button>
          </div>
        </div>
        <div class="ai-banner scan-banner">
          <div>
            <strong>Leitor de código de barras</strong>
            <p>Use a câmera do celular ou um leitor USB. O código busca o material cadastrado e abre a movimentação de estoque.</p>
          </div>
          <button class="btn primary" onclick="openBarcodeScanModal()">Escanear material</button>
        </div>
        <div class="grid kpi-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="kpi"><div class="label">Valor em estoque</div><div class="value" id="stockValue">R$ 0</div></div>
          <div class="kpi"><div class="label">Itens abaixo do mínimo</div><div class="value" id="stockLow">0</div></div>
          <div class="kpi"><div class="label">Itens cadastrados</div><div class="value" id="stockItems">0</div></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Item</th><th>Marca</th><th>Tipo</th><th>Atual</th><th>Mínimo</th><th>Custo unit.</th><th>Valor estoque</th><th>Status</th><th></th></tr></thead>
          <tbody id="stockTable"></tbody>
        </table></div></div>
      </section>

      <!-- BANCO DE DADOS -->
      <section class="page" id="page-banco">
        <div class="page-head">
          <div><h2>Banco de dados</h2><p>Custos unitários, sincronização com fornecedores e ficha de consumo de cada procedimento.</p></div>
          <div class="page-actions" id="bancoActions"></div>
        </div>
        <div class="subtabs" role="tablist">
          <button class="subtab active" data-tab="materiais" onclick="setBancoTab('materiais')">Materiais</button>
          <button class="subtab" data-tab="procedimentos" onclick="setBancoTab('procedimentos')">Procedimentos</button>
        </div>
        <div id="bancoMateriais">
          <div class="ai-banner">
            <div>
              <strong>Assistente de preços</strong>
              <p>Busca Dental Cremer, Dental Speed e Surya Dental, calcula consumo fracionado da embalagem e sugere custo unitário.</p>
            </div>
            <button class="btn primary" onclick="openPriceSyncModal()">↻ Sincronizar preços</button>
          </div>
          <div class="toolbar">
            <input class="input" id="matDbSearch" placeholder="Buscar material, marca, tipo..." oninput="renderBanco()">
            <select class="select" id="matDbType" onchange="renderBanco()"><option value="">Todas as categorias</option></select>
            <button class="btn" onclick="recalcAllUnitCosts()">Recalcular fracionados</button>
          </div>
          <div class="card"><div class="table-wrap"><table>
            <thead><tr><th>Material</th><th>Marca</th><th>Tipo</th><th>Embalagem</th><th>Preço embalagem</th><th>Custo unitário</th><th>Estoque</th><th></th></tr></thead>
            <tbody id="bancoMaterialsTable"></tbody>
          </table></div></div>
        </div>
        <div id="bancoProcedimentos" hidden>
          <div class="ai-banner">
            <div>
              <strong>Custo fracionado</strong>
              <p>Atualize a tabela (g/ml/un) sem IA. Na ficha do procedimento, “Recalcular com IA” faz materiais + fracionamento + análise numa só chamada.</p>
            </div>
            <button class="btn primary" onclick="go('procedimentos')">Abrir procedimentos</button>
          </div>
          <div class="toolbar">
            <input class="input" id="procDbSearch" placeholder="Buscar procedimento..." oninput="renderBanco()">
          </div>
          <div class="card"><div class="table-wrap"><table>
            <thead><tr><th>Procedimento</th><th>Preço</th><th>Materiais</th><th>Lab / extra</th><th>Custo total</th><th>Margem</th><th></th></tr></thead>
            <tbody id="bancoProcTable"></tbody>
          </table></div></div>
        </div>
      </section>

      <!-- CALENDÁRIO -->
      <section class="page" id="page-calendario">
        <div class="page-head">
          <div>
            <h2>Calendário / Lembretes</h2>
            <p>Compromissos clínicos, retornos, revisões de planejamento e alertas do dia.</p>
          </div>
          <div class="page-actions">
            <button class="btn primary" onclick="ChevalierPlan.openReminderModal()">＋ Lembrete</button>
          </div>
        </div>
        <div class="kpi-grid cal-kpis">
          <div class="kpi"><div class="label">Em aberto</div><div class="value" id="calOpen">0</div></div>
          <div class="kpi"><div class="label">Hoje</div><div class="value" id="calToday">0</div></div>
          <div class="kpi"><div class="label">Próximos 7 dias</div><div class="value" id="calWeek">0</div></div>
        </div>
        <div class="toolbar">
          <input class="input" id="calSearch" placeholder="Buscar lembrete, paciente, tipo…" oninput="ChevalierPlan.renderCalendario()">
          <select class="select" id="calFilter" onchange="ChevalierPlan.renderCalendario()">
            <option value="open">Em aberto</option>
            <option value="today">Hoje</option>
            <option value="all">Todos</option>
            <option value="done">Concluídos</option>
          </select>
        </div>
        <div id="calendarList" class="cal-list"></div>
      </section>

      <!-- PLANEJAMENTO -->
      <section class="page" id="page-planejamento">
        <div class="page-head">
          <div>
            <h2>Planejamento</h2>
            <p>Arquivos ICON, CBCT, guias e avaliação por IA da tomografia de planejamento.</p>
          </div>
          <div class="page-actions">
            <label class="btn primary" for="planFileInput">＋ Enviar arquivo</label>
            <input type="file" id="planFileInput" hidden multiple accept="image/*,.pdf,.dcm,.dicom,.stl,.ply,.zip,.icon,.json,.xml,application/pdf">
          </div>
        </div>
        <div class="kpi-grid cal-kpis">
          <div class="kpi"><div class="label">Arquivos</div><div class="value" id="planCount">0</div></div>
          <div class="kpi"><div class="label">Com análise IA</div><div class="value" id="planAiCount">0</div></div>
        </div>
        <div class="ai-banner">
          <div>
            <strong>IA de tomografia odontológica</strong>
            <p>Envie fatias de CBCT, exports ICON ou PDFs de planejamento. A IA monta achados, riscos anatômicos e sugestões de implante.</p>
          </div>
        </div>
        <div class="plan-upload-bar">
          <input class="input" id="planPatient" placeholder="Paciente (opcional)">
          <select class="select" id="planKind">
            <option>Planejamento ICON / CBCT</option>
            <option>Tomografia / fatia</option>
            <option>Guia cirúrgico</option>
            <option>STL / modelo</option>
            <option>Relatório PDF</option>
            <option>Outro</option>
          </select>
        </div>
        <div class="plan-drop" id="planDrop">
          <strong>Solte arquivos aqui</strong>
          <span>PNG, JPG, PDF, DICOM, STL, ZIP ou export ICON — até 40 MB</span>
        </div>
        <div class="toolbar">
          <input class="input" id="planSearch" placeholder="Buscar planejamento…" oninput="ChevalierPlan.renderPlanejamento()">
        </div>
        <div id="planList" class="plan-list"></div>
      </section>

      <!-- CONFIG -->
      <section class="page" id="page-config">
        <div class="page-head">
          <div><h2>Configurações</h2><p>Preferências financeiras, automações e integrações futuras.</p></div>
        </div>
        <div class="grid layout-2">
          <div class="card">
            <div class="card-head"><h3>Motor financeiro</h3></div>
            <div class="card-body">
              <div class="settings-row"><div class="desc"><strong>Calcular margem automaticamente</strong><span>Atualiza lucro e margem sempre que custos ou recebimentos mudarem.</span></div><div class="toggle on" id="setAutoMargin" role="switch" aria-checked="true" onclick="toggleSetting('autoMargin', this)"></div></div>
              <div class="settings-row"><div class="desc"><strong>Alertar recebíveis vencidos</strong><span>Destaca cobranças com vencimento anterior à data atual.</span></div><div class="toggle on" id="setAlertOverdue" role="switch" aria-checked="true" onclick="toggleSetting('alertOverdue', this)"></div></div>
              <div class="settings-row"><div class="desc"><strong>Alertar estoque mínimo</strong><span>Sinaliza materiais cujo saldo atingiu o mínimo configurado.</span></div><div class="toggle on" id="setAlertStock" role="switch" aria-checked="true" onclick="toggleSetting('alertStock', this)"></div></div>
              <div class="settings-row"><div class="desc"><strong>Ratear custos fixos</strong><span>Preparado para cálculo de lucro líquido por centro de resultado.</span></div><div class="toggle" id="setAllocateFixed" role="switch" aria-checked="false" onclick="toggleSetting('allocateFixed', this)"></div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>OpenAI (API real)</h3></div>
            <div class="card-body">
              <p class="field-hint" id="openaiStatusHint">Carregando status da chave…</p>
              <div class="form-grid" style="margin-top:10px">
                <div class="field full"><label>Chave da API (sk-…)</label><input id="openaiKeyInput" class="input" type="password" autocomplete="off" placeholder="Cole sua chave OpenAI"></div>
                <div class="field"><label>Modelo chat</label><input id="openaiChatModel" class="input" placeholder="gpt-4o-mini"></div>
                <div class="field"><label>Modelo visão</label><input id="openaiVisionModel" class="input" placeholder="gpt-4o-mini"></div>
              </div>
              <div class="row-actions" style="margin-top:10px">
                <button type="button" class="btn primary" onclick="saveOpenAiSettings()">Salvar chave</button>
                <button type="button" class="btn" onclick="testOpenAiSettings()">Testar conexão</button>
              </div>
              <div class="settings-row" style="margin-top:14px"><div class="desc"><strong>IA de custos</strong><span>Analisa ficha, sincroniza materiais e fraciona embalagens (microbrush 100 un, etc.).</span></div><span class="badge b-green">OpenAI</span></div>
              <div class="settings-row"><div class="desc"><strong>IA de cobrança</strong><span>Interpreta regra da clínica em texto.</span></div><span class="badge b-green">OpenAI</span></div>
              <div class="settings-row"><div class="desc"><strong>IA de tomografia</strong><span>Vision + chat no planejamento.</span></div><span class="badge b-green">OpenAI</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Integrações</h3></div>
            <div class="card-body">
              <div class="settings-row"><div class="desc"><strong>Importar planilha</strong><span>Padrão CSV (ou HTML com tabela). Honorários por clínica ou Controle de Custos — detecta colunas e não duplica.</span></div>
                <button type="button" class="btn small" onclick="openImportSpreadsheetModal()">Escolher arquivo</button>
              </div>
              <div class="settings-row"><div class="desc"><strong>Históricos já carregados</strong><span>Allon, Daniele, Gerlúcia, Particular e Custos entram sozinhos na abertura do sistema (sem vínculo a uma clínica só).</span></div><span class="badge b-green">Automático</span></div>
              <div class="settings-row"><div class="desc"><strong>Banco de preços</strong><span>Assistente busca Dental Cremer, Dental Speed e Surya Dental e calcula custo fracionado.</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>Consumo automático</strong><span>Ao lançar procedimento, materiais da ficha preenchem o custo (editável).</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>Leitor de boletos</strong><span>Escaneia boleto (câmera/arquivo/linha digitável), lança em Custos e alerta duplicatas.</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>Código de barras</strong><span>Lê EAN/código do material para localizar e movimentar estoque.</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>IA gerencial</strong><span>Consultas como “qual clínica me deu maior lucro nos últimos 90 dias?”.</span></div><span class="badge b-blue">Fase 5</span></div>
              <div class="settings-row"><div class="desc"><strong>Backup local</strong><span>Baixe os dados do protótipo em JSON.</span></div><button class="btn small" onclick="exportData()">Exportar JSON</button></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</div>

<nav class="mobile-bottom-nav" id="mobileBottomNav" aria-label="Navegação principal">
  <button type="button" class="mb-nav-btn active" data-page="dashboard"><span>◫</span>Início</button>
  <button type="button" class="mb-nav-btn" data-page="calendario"><span>◷</span>Agenda</button>
  <button type="button" class="mb-nav-btn" data-page="planejamento"><span>⌖</span>Plano</button>
  <button type="button" class="mb-nav-btn" data-page="pacientes"><span>◉</span>Pacientes</button>
  <button type="button" class="mb-nav-btn" id="mbMenuBtn"><span>☰</span>Menu</button>
</nav>

<div class="modal-backdrop" id="modalRoot">
  <div class="modal">
    <div class="modal-head"><h3 id="modalTitle">Novo lançamento</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body" id="modalBody"></div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" id="modalSave">Salvar</button></div>
  </div>
</div>
<div class="toast" id="toast"></div>

<script src="<?= chevalier_asset_url('assets/js/scan-tools.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/dental-catalog.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/procedure-catalog.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/clinic-billing.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/planning-calendar.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/app.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/update-manager.js') ?>" defer></script>
</body>
</html>