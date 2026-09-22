<?php
declare(strict_types=1);
require_once __DIR__ . '/api/app-version-lib.php';

/**
 * Contato público da landing.
 * Preencha WhatsApp (DDI+DDD+número, só dígitos) e Instagram quando tiver.
 */
$LANDING_WHATSAPP = '5521967329133';
$LANDING_EMAIL = 'drgabrielchevalier@hotmail.com';
$LANDING_LATTES = 'http://lattes.cnpq.br/9376004341430383';
$LANDING_INSTAGRAM = 'https://instagram.com/dr_gabrielrosa';
$LANDING_CRO = 'CRO-RJ 52957';

$waDigits = preg_replace('/\D+/', '', $LANDING_WHATSAPP) ?: '';
$waMsg = rawurlencode('Olá, Dr. Gabriel Rosa! Vi a landing e gostaria de agendar uma avaliação.');
$ctaHref = $waDigits !== ''
    ? 'https://wa.me/' . $waDigits . '?text=' . $waMsg
    : 'mailto:' . $LANDING_EMAIL . '?subject=' . rawurlencode('Agendar avaliação — Dr Gabriel Rosa');
$ctaLabel = $waDigits !== '' ? 'Agendar avaliação' : 'Agendar por e-mail';
$ctaExternal = true;

header('Cache-Control: public, max-age=300');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Dr Gabriel Rosa — Reabilitação Oral &amp; Estética</title>
<meta name="description" content="Dr Gabriel Rosa — cirurgião-dentista. Cirurgia oral, implantodontia, prótese e harmonização orofacial. Avaliação com plano claro.">
<meta name="theme-color" content="#0e0c0b">
<meta property="og:title" content="Dr Gabriel Rosa — Reabilitação Oral &amp; Estética">
<meta property="og:description" content="Cirurgia, implantes e reabilitação com precisão clínica e olhar estético.">
<meta property="og:type" content="website">
<meta property="og:image" content="<?= htmlspecialchars('assets/img/gabriel-rosa-portrait.jpg', ENT_QUOTES, 'UTF-8') ?>">
<link rel="icon" type="image/png" href="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=boska@400,500,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/landing.css') ?>">
</head>
<body class="lp">
  <a class="lp-skip" href="#conteudo">Ir ao conteúdo</a>

  <header class="lp-top" id="topo">
    <a class="lp-brand" href="#topo" aria-label="Dr Gabriel Rosa — início">
      <img src="<?= chevalier_asset_url('assets/img/brand/logo-horizontal-on-dark.png') ?>" width="220" height="48" alt="Dr Gabriel Rosa">
    </a>
    <nav class="lp-top-nav" aria-label="Principal">
      <a href="#tratamentos">Tratamentos</a>
      <a href="#sobre">Sobre</a>
      <a href="#formacao">Formação</a>
      <a href="#contato">Contato</a>
      <?php if ($LANDING_INSTAGRAM !== ''): ?>
        <a class="lp-social" href="<?= htmlspecialchars($LANDING_INSTAGRAM, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" aria-label="Instagram">IG</a>
      <?php endif; ?>
      <a class="lp-top-cta" href="<?= htmlspecialchars($ctaHref, ENT_QUOTES, 'UTF-8') ?>" <?= $ctaExternal ? 'target="_blank" rel="noopener"' : '' ?>>Avaliação</a>
      <a class="lp-login" href="login.php" title="Área restrita">Entrar</a>
    </nav>
    <button type="button" class="lp-menu-btn" id="lpMenuBtn" aria-expanded="false" aria-controls="lpDrawer" aria-label="Abrir menu">
      <span></span><span></span>
    </button>
  </header>

  <div class="lp-drawer" id="lpDrawer" hidden>
    <a href="#tratamentos">Tratamentos</a>
    <a href="#sobre">Sobre</a>
    <a href="#formacao">Formação</a>
    <a href="#contato">Contato</a>
    <a class="lp-btn lp-btn-primary" href="<?= htmlspecialchars($ctaHref, ENT_QUOTES, 'UTF-8') ?>" <?= $ctaExternal ? 'target="_blank" rel="noopener"' : '' ?>><?= htmlspecialchars($ctaLabel, ENT_QUOTES, 'UTF-8') ?></a>
  </div>

  <main id="conteudo">
    <section class="lp-hero">
      <div class="lp-hero-glow" aria-hidden="true"></div>
      <div class="lp-hero-copy">
        <p class="lp-kicker">Cirurgião-dentista · Rio de Janeiro</p>
        <h1 class="lp-name">Dr Gabriel Rosa</h1>
        <p class="lp-tag">Reabilitação oral &amp; estética com precisão cirúrgica — implantes, prótese e cirurgia pensados para função e beleza duradouras.</p>
        <div class="lp-cta-row">
          <a class="lp-btn lp-btn-primary" href="<?= htmlspecialchars($ctaHref, ENT_QUOTES, 'UTF-8') ?>" <?= $ctaExternal ? 'target="_blank" rel="noopener"' : '' ?>>
            <?= htmlspecialchars($ctaLabel, ENT_QUOTES, 'UTF-8') ?>
          </a>
          <a class="lp-btn lp-btn-ghost" href="#sobre">Conhecer o doutor</a>
        </div>
        <?php if ($LANDING_CRO !== ''): ?>
          <p class="lp-cro"><?= htmlspecialchars($LANDING_CRO, ENT_QUOTES, 'UTF-8') ?></p>
        <?php endif; ?>
      </div>
      <div class="lp-hero-media">
        <div class="lp-hero-ring" aria-hidden="true"></div>
        <img
          class="lp-hero-photo"
          src="<?= chevalier_asset_url('assets/img/gabriel-rosa-portrait.jpg') ?>"
          alt="Dr Gabriel Rosa em consultório"
          width="1086"
          height="1448"
          fetchpriority="high"
        >
        <div class="lp-hero-fade" aria-hidden="true"></div>
      </div>
    </section>

    <section class="lp-strip" aria-label="Especialidades">
      <ul>
        <li>Cirurgia oral</li>
        <li>Implantodontia</li>
        <li>Prótese dentária</li>
        <li>Harmonização orofacial</li>
      </ul>
    </section>

    <section class="lp-section lp-treat" id="tratamentos" data-reveal>
      <div class="lp-section-head">
        <p class="lp-eyebrow">Tratamentos</p>
        <h2>O plano certo para o seu caso</h2>
        <p class="lp-lead">Cada sorriso começa com diagnóstico, imagem e um caminho claro — sem pressa, sem protocolo genérico.</p>
      </div>
      <ul class="lp-treat-grid">
        <li>
          <span class="lp-treat-n">01</span>
          <strong>Cirurgia oral</strong>
          <p>Extrações, enxertos e procedimentos de média e alta complexidade, com segurança e recuperação acompanhada.</p>
        </li>
        <li>
          <span class="lp-treat-n">02</span>
          <strong>Implantodontia</strong>
          <p>Planejamento guiado, levantamentos e reabilitação implantossuportada para devolver mastigação e estética.</p>
        </li>
        <li>
          <span class="lp-treat-n">03</span>
          <strong>Prótese &amp; estética</strong>
          <p>Coroas, facetas e protocolos com acabamento fino — harmonia entre dente, gengiva e face.</p>
        </li>
        <li>
          <span class="lp-treat-n">04</span>
          <strong>Harmonização orofacial</strong>
          <p>Equilíbrio facial alinhado à reabilitação oral, com naturalidade e proporção.</p>
        </li>
      </ul>
    </section>

    <section class="lp-about" id="sobre" data-reveal>
      <div class="lp-about-media">
        <img
          src="<?= chevalier_asset_url('assets/img/gabriel-rosa-portrait-crop.jpg') ?>"
          width="1086"
          height="900"
          alt="Retrato do Dr Gabriel Rosa"
          loading="lazy"
        >
      </div>
      <div class="lp-about-copy">
        <p class="lp-eyebrow">Sobre</p>
        <h2>Técnica, presença e clareza no consultório</h2>
        <p class="lp-quote">A imagem que o paciente confia é a mesma que o clínico entrega: postura, precisão e um plano que se entende.</p>
        <p>Cirurgião-dentista formado pela Universidade Iguaçu (UNIG, 2022), com trajetória em cirurgia oral, implantodontia, prótese e harmonização orofacial. Estágios supervisionados em Cirurgia Bucomaxilofacial em hospitais de referência.</p>
        <p>Também atua na gestão pública — coordenação de Saúde Bucal em Duque de Caxias (RJ) — unindo visão clínica e organização de cuidado.</p>
        <a class="lp-text-link" href="<?= htmlspecialchars($LANDING_LATTES, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener">Currículo Lattes</a>
      </div>
    </section>

    <section class="lp-section lp-path" id="formacao" data-reveal>
      <div class="lp-section-head">
        <p class="lp-eyebrow">Percurso</p>
        <h2>Formação</h2>
      </div>
      <ol class="lp-timeline">
        <li>
          <span class="lp-year">2024–2026</span>
          <div>
            <strong>Especialização em Implantodontia</strong>
            <span>Capacite Institute · 1.560h · levantamento de seio maxilar</span>
          </div>
        </li>
        <li>
          <span class="lp-year">2025–2026</span>
          <div>
            <strong>Gestão em Saúde Pública e Coletiva</strong>
            <span>Universidade Estácio de Sá · 520h</span>
          </div>
        </li>
        <li>
          <span class="lp-year">2023–2024</span>
          <div>
            <strong>Harmonização Orofacial</strong>
            <span>Instituto Orofacial das Américas — IOA RIO · 480h</span>
          </div>
        </li>
        <li>
          <span class="lp-year">2022–2023</span>
          <div>
            <strong>Prótese Dentária</strong>
            <span>IOA RIO · 420h · próteses sobre implantes</span>
          </div>
        </li>
        <li>
          <span class="lp-year">2024</span>
          <div>
            <strong>Cirurgia Bucomaxilofacial</strong>
            <span>Estágios em hospitais de referência · +1.800h supervisionadas</span>
          </div>
        </li>
        <li>
          <span class="lp-year">2018–2022</span>
          <div>
            <strong>Graduação em Odontologia</strong>
            <span>Universidade Iguaçu — UNIG</span>
          </div>
        </li>
      </ol>
    </section>

    <section class="lp-close" id="contato" data-reveal>
      <p class="lp-eyebrow">Próximo passo</p>
      <h2>Avaliação com plano claro</h2>
      <p class="lp-lead">Conte o que incomoda no sorriso ou na mastigação — montamos o caminho juntos, com transparência.</p>
      <a class="lp-btn lp-btn-primary" href="<?= htmlspecialchars($ctaHref, ENT_QUOTES, 'UTF-8') ?>" <?= $ctaExternal ? 'target="_blank" rel="noopener"' : '' ?>>
        <?= htmlspecialchars($ctaLabel, ENT_QUOTES, 'UTF-8') ?>
      </a>
      <p class="lp-mail">
        <a href="mailto:<?= htmlspecialchars($LANDING_EMAIL, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($LANDING_EMAIL, ENT_QUOTES, 'UTF-8') ?></a>
      </p>
    </section>
  </main>

  <footer class="lp-foot">
    <img class="lp-foot-mark" src="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>" width="48" height="48" alt="">
    <p><strong>DR GABRIEL ROSA</strong><br>Reabilitação Oral &amp; Estética</p>
    <nav class="lp-foot-nav" aria-label="Rodapé">
      <?php if ($LANDING_INSTAGRAM !== ''): ?>
        <a href="<?= htmlspecialchars($LANDING_INSTAGRAM, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener">Instagram</a>
      <?php endif; ?>
      <a href="<?= htmlspecialchars($LANDING_LATTES, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener">Lattes</a>
      <a href="login.php">Área restrita</a>
    </nav>
    <p class="lp-copy">© <?= date('Y') ?> Dr Gabriel Rosa</p>
  </footer>

  <script src="<?= chevalier_asset_url('assets/js/landing.js') ?>" defer></script>
</body>
</html>
