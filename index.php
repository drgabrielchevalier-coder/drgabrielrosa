<?php
declare(strict_types=1);
require_once __DIR__ . '/api/auth-lib.php';
require_once __DIR__ . '/api/app-version-lib.php';
chevalier_auth_require();
$chevalierBuild = chevalier_app_build(__DIR__);
$chevalierUser = chevalier_auth_user();
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
<link rel="icon" type="image/svg+xml" href="<?= chevalier_asset_url('assets/img/favicon.svg') ?>">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/app.css') ?>">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/update.css') ?>">
<script>
window.CHEVALIER_BUILD=<?= json_encode($chevalierBuild, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;
window.CHEVALIER_USER=<?= json_encode($chevalierUser, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;
</script>
</head>
<body>
<div id="update-root" aria-live="polite"></div>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <img class="brand-logo" src="<?= chevalier_asset_url('assets/img/logo-gabriel-rosa-wide.png') ?>" alt="Dr Gabriel Rosa">
    </div>

    <div class="nav-group">
      <div class="nav-label">Visão geral</div>
      <button class="nav-btn active" data-page="dashboard"><span class="nav-icon">◫</span>Dashboard</button>
      <button class="nav-btn" data-page="calendario"><span class="nav-icon">◷</span>Calendário / Lembretes</button>
      <button class="nav-btn" data-page="planejamento"><span class="nav-icon">⌖</span>Planejamento</button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Clínica</div>
      <button class="nav-btn" data-page="pacientes"><span class="nav-icon">◉</span>Pacientes</button>
      <button class="nav-btn" data-page="clinicas"><span class="nav-icon">⌂</span>Clínicas</button>
      <button class="nav-btn" data-page="procedimentos"><span class="nav-icon">✦</span>Procedimentos</button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Operação</div>
      <button class="nav-btn" data-page="prestacao"><span class="nav-icon">↗</span>Prestação de serviço <span class="nav-badge" id="badgeReceber">0</span></button>
      <button class="nav-btn" data-page="particular"><span class="nav-icon">◇</span>Particular</button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Acompanhamento protético</div>
      <button class="nav-btn" data-page="trabalhos"><span class="nav-icon">♙</span>Trabalhos <span class="nav-badge" id="badgeProtese">0</span></button>
      <button class="nav-btn" data-page="protese"><span class="nav-icon">⌁</span>Fluxo</button>
      <button class="nav-btn" data-page="entregas"><span class="nav-icon">◷</span>Agenda de entregas</button>
      <button class="nav-btn" data-page="timeline"><span class="nav-icon">≋</span>Timeline</button>
      <button class="nav-btn" data-page="consulta"><span class="nav-icon">⌕</span>Consultar código</button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Financeiro</div>
      <button class="nav-btn" data-page="recebiveis"><span class="nav-icon">◌</span>Recebíveis</button>
      <button class="nav-btn" data-page="custos"><span class="nav-icon">↓</span>Custos</button>
      <button class="nav-btn" data-page="folha"><span class="nav-icon">♙</span>Folha</button>
      <button class="nav-btn" data-page="relatorios"><span class="nav-icon">▤</span>Relatórios</button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Materiais</div>
      <button class="nav-btn" data-page="materiais"><span class="nav-icon">⬡</span>Materiais</button>
      <button class="nav-btn" data-page="estoque"><span class="nav-icon">▦</span>Estoque</button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Banco de dados</div>
      <button class="nav-btn" data-page="banco" data-tab="materiais"><span class="nav-icon">▣</span>Custos de materiais</button>
      <button class="nav-btn" data-page="banco" data-tab="procedimentos"><span class="nav-icon">✦</span>Procedimentos</button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Sistema</div>
      <button class="nav-btn" data-page="config"><span class="nav-icon">⚙</span>Configurações</button>
    </div>

    <div class="sidebar-foot">
      <strong>Dr Gabriel Rosa</strong>
      <p>Conectado como <span id="sidebarUser"><?= htmlspecialchars($chevalierUser, ENT_QUOTES, 'UTF-8') ?></span>.</p>
      <p><a href="api/auth.php?action=logout" style="color:#c4b086;text-decoration:none">Sair da conta</a></p>
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
      <button class="icon-btn" title="Notificações">♧</button>
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
            <button class="btn" onclick="toast('Relatório preparado para exportação.')">⇩ Exportar</button>
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
                <thead><tr><th>Paciente</th><th>Origem</th><th>Procedimento</th><th>Financeiro</th><th>Resultado</th></tr></thead>
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
              <thead><tr><th>Paciente</th><th>Origem / Clínica</th><th>Procedimento</th><th>Data</th><th>Valor</th><th>Custos</th><th>Lucro</th><th>Status</th><th></th></tr></thead>
              <tbody id="patientsTable"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- CLINICAS -->
      <section class="page" id="page-clinicas">
        <div class="page-head">
          <div><h2>Clínicas e centros de resultado</h2><p>Cada clínica mantém suas próprias regras de honorários, custos e cobrança.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openClinicModal()">＋ Nova clínica</button></div>
        </div>
        <div class="grid layout-3" id="clinicsGrid"></div>
      </section>

      <!-- PROCEDIMENTOS -->
      <section class="page" id="page-procedimentos">
        <div class="page-head">
          <div><h2>Procedimentos</h2><p>Catálogo clínico com preço por clínica, forma de recebimento (valor fechado ou %) e ficha de custo.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openProcedureModal()">＋ Novo procedimento</button></div>
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

      <!-- PRESTACAO -->
      <section class="page" id="page-prestacao">
        <div class="page-head">
          <div><h2>Prestação de serviço</h2><p>Honorários a receber de clínicas parceiras com cobrança e saldo automático.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openReceivableModal('prestacao')">＋ Lançar honorário</button></div>
        </div>
        <div class="grid kpi-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi"><div class="label">Honorários lançados</div><div class="value" id="svcTotal">R$ 0</div></div>
          <div class="kpi"><div class="label">Recebidos</div><div class="value" id="svcReceived">R$ 0</div></div>
          <div class="kpi"><div class="label">Em aberto</div><div class="value" id="svcOpen">R$ 0</div></div>
          <div class="kpi"><div class="label">Vencidos</div><div class="value" id="svcOverdue">R$ 0</div></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Paciente</th><th>Clínica</th><th>Procedimento</th><th>Honorário</th><th>Recebido</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
          <tbody id="serviceTable"></tbody>
        </table></div></div>
      </section>

      <!-- PARTICULAR -->
      <section class="page" id="page-particular">
        <div class="page-head">
          <div><h2>Pacientes particulares</h2><p>Receita contratada, laboratório, componentes, custo clínico e margem por caso.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openPatientModal('Particular')">＋ Novo caso particular</button></div>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Paciente</th><th>Procedimento</th><th>Contratado</th><th>Recebido</th><th>Lab</th><th>Componentes</th><th>Clínica</th><th>Lucro proj.</th><th>Progresso</th><th></th></tr></thead>
          <tbody id="privateTable"></tbody>
        </table></div></div>
      </section>

      <!-- TRABALHOS PROTÉTICOS -->
      <section class="page" id="page-trabalhos">
        <div class="page-head">
          <div><h2>Trabalhos protéticos</h2><p>Paciente, tipo, laboratório, prazo e etapa — no mesmo fluxo do Prótea.</p></div>
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
            <option value="active">Em andamento</option>
            <option value="late">Atrasados</option>
            <option value="urgent">Urgentes</option>
            <option value="0">Entrada</option>
            <option value="1">Laboratório</option>
            <option value="2">Prova</option>
            <option value="3">Pronto / entrega</option>
            <option value="4">Instalado</option>
          </select>
        </div>
        <div class="card"><div class="table-wrap"><table>
          <thead><tr><th>Paciente / trabalho</th><th>Laboratório</th><th>Previsão</th><th>Prazo</th><th>Etapa atual</th><th></th></tr></thead>
          <tbody id="prosthTable"></tbody>
        </table></div></div>
      </section>

      <!-- PROTESE FLUXO -->
      <section class="page" id="page-protese">
        <div class="page-head">
          <div><h2>Fluxo de produção</h2><p>Do cadastro à instalação: entrada, laboratório, prova, entrega e alta.</p></div>
          <div class="page-actions"><button class="btn primary" onclick="openProsthesisModal()">＋ Novo trabalho</button></div>
        </div>
        <div class="lab-board" id="labColumns"></div>
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
          <div class="page-actions"><button class="btn" onclick="toast('Exportação de relatório simulada neste protótipo.')">⇩ Exportar PDF</button></div>
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
          <div class="toolbar">
            <input class="input" id="procDbSearch" placeholder="Buscar procedimento..." oninput="renderBanco()">
          </div>
          <div class="card"><div class="table-wrap"><table>
            <thead><tr><th>Procedimento</th><th>Preço</th><th>Materiais</th><th>Lab / extra</th><th>Custo total</th><th>Margem</th><th></th></tr></thead>
            <tbody id="bancoProcTable"></tbody>
          </table></div></div>
        </div>
      </section>

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
              <div class="settings-row"><div class="desc"><strong>Calcular margem automaticamente</strong><span>Atualiza lucro e margem sempre que custos ou recebimentos mudarem.</span></div><div class="toggle on" onclick="this.classList.toggle('on')"></div></div>
              <div class="settings-row"><div class="desc"><strong>Alertar recebíveis vencidos</strong><span>Destaca cobranças com vencimento anterior à data atual.</span></div><div class="toggle on" onclick="this.classList.toggle('on')"></div></div>
              <div class="settings-row"><div class="desc"><strong>Alertar estoque mínimo</strong><span>Sinaliza materiais cujo saldo atingiu o mínimo configurado.</span></div><div class="toggle on" onclick="this.classList.toggle('on')"></div></div>
              <div class="settings-row"><div class="desc"><strong>Ratear custos fixos</strong><span>Preparado para cálculo de lucro líquido por centro de resultado.</span></div><div class="toggle" onclick="this.classList.toggle('on')"></div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Integrações</h3></div>
            <div class="card-body">
              <div class="settings-row"><div class="desc"><strong>Notion</strong><span>Fonte atual para migração de pacientes, custos, honorários e estoque.</span></div><span class="badge b-green">Referência conectada</span></div>
              <div class="settings-row"><div class="desc"><strong>Banco de preços</strong><span>Assistente busca Dental Cremer, Dental Speed e Surya Dental e calcula custo fracionado.</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>Consumo automático</strong><span>Ao lançar procedimento, materiais da ficha preenchem o custo (editável).</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>Leitor de boletos</strong><span>Escaneia boleto (câmera/arquivo/linha digitável), lança em Custos e alerta duplicatas.</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>Código de barras</strong><span>Lê EAN/código do material para localizar e movimentar estoque.</span></div><span class="badge b-green">Ativo</span></div>
              <div class="settings-row"><div class="desc"><strong>IA de tomografia</strong><span>Avalia arquivos de planejamento ICON/CBCT na aba Planejamento.</span></div><span class="badge b-green">Ativo</span></div>
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
<script src="<?= chevalier_asset_url('assets/js/planning-calendar.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/app.js') ?>"></script>
<script src="<?= chevalier_asset_url('assets/js/update-manager.js') ?>" defer></script>
</body>
</html>