<?php
declare(strict_types=1);
require_once __DIR__ . '/api/auth-lib.php';
require_once __DIR__ . '/api/app-version-lib.php';
require_once __DIR__ . '/api/password-reset-lib.php';

chevalier_auth_boot();
chevalier_security_headers();
if (chevalier_auth_logged_in()) {
    header('Location: index.php');
    exit;
}

$error = '';
$okMsg = '';
$emailValue = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $csrf = (string) ($_POST['csrf'] ?? '');
    $emailValue = trim((string) ($_POST['email'] ?? ''));
    if (!chevalier_csrf_validate($csrf)) {
        $error = 'Sessão expirada. Recarregue a página e tente de novo.';
    } else {
        $bucketIp = 'pwdreset:ip:' . chevalier_client_ip();
        $bucketMail = 'pwdreset:mail:' . strtolower($emailValue);
        $limitIp = chevalier_rate_limit_hit($bucketIp, 5, 900);
        $limitMail = chevalier_rate_limit_hit($bucketMail, 3, 1800);
        if (!$limitIp['ok'] || !$limitMail['ok']) {
            $retry = max($limitIp['retryAfter'], $limitMail['retryAfter']);
            $mins = max(1, (int) ceil($retry / 60));
            $error = "Muitas tentativas. Aguarde cerca de {$mins} min e tente novamente.";
        } else {
            // Resposta uniforme + atraso constante (anti-enumeração / timing)
            usleep(400000);
            $result = chevalier_password_reset_request($emailValue, chevalier_client_ip());
            if (!$result['ok'] && !empty($result['error']) && str_contains((string) $result['error'], 'AUTH_EMAIL')) {
                $error = (string) $result['error'];
            } elseif (!$result['ok'] && !empty($result['error']) && ($result['sent'] ?? false) === false && str_contains((string) $result['error'], 'e-mail')) {
                $error = (string) $result['error'];
            } else {
                // Mensagem genérica — não confirma se o e-mail existe
                $okMsg = 'Se este e-mail estiver vinculado à conta, enviamos um link para redefinir a senha. Verifique a caixa de entrada e o spam.';
                $emailValue = '';
            }
        }
    }
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
$csrf = htmlspecialchars(chevalier_csrf_token(), ENT_QUOTES, 'UTF-8');
$configured = chevalier_auth_email_configured();
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Esqueci minha senha · Dr Gabriel Rosa</title>
<meta name="theme-color" content="#0d0e0c">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" type="image/png" href="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/login.css') ?>">
</head>
<body class="login-body">
  <div class="login-stage" aria-hidden="true">
    <div class="login-blur-layer">
      <span class="orb orb-a"></span>
      <span class="orb orb-b"></span>
      <span class="orb orb-c"></span>
      <span class="orb orb-d"></span>
      <span class="haze"></span>
    </div>
    <div class="login-vignette"></div>
  </div>

  <main class="login-shell">
    <section class="login-hero">
      <img class="login-hero-logo" src="<?= chevalier_asset_url('assets/img/brand/logo-stacked-on-dark.png') ?>" width="720" height="315" alt="Dr Gabriel Rosa — Reabilitação Oral &amp; Estética">
      <p class="login-lead">Recupere o acesso com o e-mail vinculado à sua conta.</p>
    </section>

    <section class="login-panel" aria-labelledby="forgot-title">
      <div class="login-panel-brand">
        <img class="login-mark-img" src="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>" width="48" height="48" alt="">
        <div>
          <h2 id="forgot-title">Esqueci minha senha</h2>
          <p>Enviaremos um link seguro de redefinição.</p>
        </div>
      </div>

      <?php if ($error !== ''): ?>
        <div class="login-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>
      <?php if ($okMsg !== ''): ?>
        <div class="login-ok" role="status"><?= htmlspecialchars($okMsg, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>

      <?php if (!$configured): ?>
        <div class="login-error" role="alert">A recuperação ainda não está ativa no servidor. Configure <code>AUTH_EMAIL</code> e <code>MAIL_FROM</code> em <code>api/config.local.php</code>.</div>
      <?php elseif ($okMsg === ''): ?>
        <form class="login-form" method="post" action="forgot-password.php" autocomplete="on">
          <input type="hidden" name="csrf" value="<?= $csrf ?>">
          <label class="login-field">
            <span>E-mail vinculado à conta</span>
            <input type="email" name="email" required autofocus maxlength="190" placeholder="seu@email.com" value="<?= htmlspecialchars($emailValue, ENT_QUOTES, 'UTF-8') ?>" autocomplete="email">
          </label>
          <p class="login-hint">O sistema só envia o link se o e-mail coincidir com o cadastrado. O link expira em 1 hora e é de uso único.</p>
          <button type="submit" class="login-submit">Enviar link de redefinição</button>
        </form>
      <?php endif; ?>

      <p class="login-foot"><a class="login-link" href="login.php">← Voltar ao login</a></p>
    </section>
  </main>
</body>
</html>
