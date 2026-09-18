<?php
declare(strict_types=1);
require_once __DIR__ . '/api/app-version-lib.php';

/**
 * Contato público da landing (Instagram bio).
 * Preencha o WhatsApp com DDI+DDD+número, só dígitos. Ex.: 5521999999999
 */
$LANDING_WHATSAPP = '';
$LANDING_EMAIL = 'drgabrielchevalier@hotmail.com';
$LANDING_LATTES = 'http://lattes.cnpq.br/9376004341430383';
$LANDING_INSTAGRAM = ''; // ex.: https://instagram.com/seuusuario — envie o @ quando quiser

$waDigits = preg_replace('/\D+/', '', $LANDING_WHATSAPP) ?: '';
$waMsg = rawurlencode('Olá, Dr. Gabriel Rosa! Vim pelo Instagram e gostaria de agendar uma consulta.');
$ctaHref = $waDigits !== ''
    ? 'https://wa.me/' . $waDigits . '?text=' . $waMsg
    : 'mailto:' . $LANDING_EMAIL . '?subject=' . rawurlencode('Agendar consulta — Dr Gabriel Rosa');
$ctaLabel = $waDigits !== '' ? 'Agendar consulta' : 'Agendar por e-mail';
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
<meta name="description" content="Dr Gabriel Rosa — cirurgião-dentista. Cirurgia oral, implantodontia, prótese e harmonização orofacial. Agende sua avaliação.">
<meta name="theme-color" content="#0d0e0c">
<meta property="og:title" content="Dr Gabriel Rosa — Reabilitação Oral &amp; Estética">
<meta property="og:description" content="Cirurgia oral, implantodontia e reabilitação. Atendimento clínico com foco em estética e função.">
<meta property="og:type" content="website">
<meta property="og:image" content="<?= htmlspecialchars('assets/img/gabriel-rosa-portrait.jpg', ENT_QUOTES, 'UTF-8') ?>">
<link rel="icon" type="image/svg+xml" href="<?= chevalier_asset_url('assets/img/favicon.svg') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/landing.css') ?>">
</head>
<body class="lp">
  <a class="lp-skip" href="#conteudo">Ir ao conteúdo</a>

  <header class="lp-top">
    <a class="lp-brand" href="#topo" aria-label="Dr Gabriel Rosa">
      <img src="<?= chevalier_asset_url('assets/img/logo-gabriel-rosa-wide.png') ?>" width="220" height="64" alt="Dr Gabriel Rosa — Reabilitação Oral &amp; Estética">
    </a>
    <a class="lp-login" href="login.php" title="Acesso ao sistema">Entrar</a>
  </header>

  <main id="conteudo">
    <section class="lp-hero" id="topo">
      <div class="lp-hero-media" aria-hidden="true">
        <img class="lp-hero-photo" src="<?= chevalier_asset_url('assets/img/gabriel-rosa-portrait.jpg') ?>" alt="" width="800" height="1373" fetchpriority="high">
        <div class="lp-hero-veil"></div>
      </div>
      <div class="lp-hero-copy">
        <p class="lp-kicker">Cirurgião-dentista · RJ</p>
        <h1 class="lp-name">Dr Gabriel Rosa</h1>
        <p class="lp-tag">Reabilitação oral &amp; estética com precisão cirúrgica e olhar clínico.</p>
        <div class="lp-cta-row">
          <a class="lp-btn lp-btn-primary" href="<?= htmlspecialchars($ctaHref, ENT_QUOTES, 'UTF-8') ?>" <?= $ctaExternal ? 'target="_blank" rel="noopener"' : '' ?>>
            <?= htmlspecialchars($ctaLabel, ENT_QUOTES, 'UTF-8') ?>
            <?php if ($waDigits !== ''): ?>
              <svg class="lp-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.82c4.46 0 8.09 3.63 8.09 8.09 0 4.46-3.63 8.09-8.09 8.09-1.42 0-2.81-.37-4.03-1.07l-.29-.17-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.24-4.32c0-4.46 3.63-8.09 8.04-8.09zm4.42 10.5c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.19-1.42-1.33-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/></svg>
            <?php endif; ?>
          </a>
        </div>
      </div>
    </section>

    <section class="lp-section lp-focus" data-reveal>
      <h2>O que eu trato</h2>
      <p class="lp-lead">Da cirurgia oral à reabilitação sobre implantes — planejamento cuidadoso para função, estética e longevidade.</p>
      <ul class="lp-focus-list">
        <li>
          <strong>Cirurgia oral</strong>
          <span>Extrações, enxertos e procedimentos em hospitais de referência.</span>
        </li>
        <li>
          <strong>Implantodontia</strong>
          <span>Planejamento guiado, levantamentos e reabilitação implantossuportada.</span>
        </li>
        <li>
          <strong>Prótese dentária</strong>
          <span>Coroas, facetas e protocolos com acabamento estético.</span>
        </li>
        <li>
          <strong>Harmonização orofacial</strong>
          <span>Equilíbrio facial alinhado à reabilitação oral.</span>
        </li>
      </ul>
    </section>

    <section class="lp-section lp-about" data-reveal>
      <div class="lp-about-grid">
        <figure class="lp-about-photo">
          <img src="<?= chevalier_asset_url('assets/img/gabriel-rosa-portrait.jpg') ?>" width="800" height="1373" alt="Retrato profissional do Dr Gabriel Rosa" loading="lazy">
        </figure>
        <div class="lp-about-copy">
          <p class="lp-eyebrow">Sobre o doutor</p>
          <h2>Formação clínica e gestão em saúde bucal</h2>
          <p>Cirurgião-dentista formado pela Universidade Iguaçu (UNIG, 2022), com trajetória em cirurgia oral, implantodontia, prótese e harmonização orofacial. Estágios supervisionados em Cirurgia Bucomaxilofacial em hospitais de referência, com procedimentos de média e alta complexidade.</p>
          <p>Atua também na gestão pública: coordenação de Saúde Bucal no município de Duque de Caxias (RJ), com planejamento estratégico, protocolos clínicos e ampliação do acesso à odontologia.</p>
          <a class="lp-text-link" href="<?= htmlspecialchars($LANDING_LATTES, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener">Ver Currículo Lattes →</a>
        </div>
      </div>
    </section>

    <section class="lp-section lp-path" data-reveal>
      <h2>Formação</h2>
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

    <section class="lp-section lp-close" data-reveal>
      <h2>Pronto para o próximo passo?</h2>
      <p class="lp-lead">Avaliação clínica com plano claro — função, estética e acompanhamento.</p>
      <a class="lp-btn lp-btn-primary" href="<?= htmlspecialchars($ctaHref, ENT_QUOTES, 'UTF-8') ?>" <?= $ctaExternal ? 'target="_blank" rel="noopener"' : '' ?>>
        <?= htmlspecialchars($ctaLabel, ENT_QUOTES, 'UTF-8') ?>
      </a>
      <p class="lp-mail">
        <a href="mailto:<?= htmlspecialchars($LANDING_EMAIL, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($LANDING_EMAIL, ENT_QUOTES, 'UTF-8') ?></a>
      </p>
    </section>
  </main>

  <footer class="lp-foot">
    <img class="lp-foot-mark" src="<?= chevalier_asset_url('assets/img/mark-gr.png') ?>" width="40" height="40" alt="">
    <p><strong>Dr Gabriel Rosa</strong><br>Reabilitação Oral &amp; Estética</p>
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
