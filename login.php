<?php
declare(strict_types=1);
require_once __DIR__ . '/api/auth-lib.php';
require_once __DIR__ . '/api/app-version-lib.php';

chevalier_auth_boot();
chevalier_security_headers();
if (chevalier_auth_logged_in()) {
    header('Location: index.php');
    exit;
}

$error = '';
$next = isset($_GET['next']) ? (string) $_GET['next'] : 'index.php';
if ($next === '' || str_contains($next, '://') || str_starts_with($next, '//') || str_contains($next, "\n") || str_contains($next, "\r")) {
    $next = 'index.php';
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $csrf = (string) ($_POST['csrf'] ?? '');
    if (!chevalier_csrf_validate($csrf)) {
        $error = 'Sessão expirada. Recarregue a página e tente de novo.';
    } else {
        $user = trim((string) ($_POST['user'] ?? ''));
        $pass = (string) ($_POST['pass'] ?? '');
        $bucket = 'login:' . chevalier_client_ip() . ':' . strtolower($user);
        $limit = chevalier_rate_limit_hit($bucket, 8, 900);
        if (!$limit['ok']) {
            $mins = max(1, (int) ceil($limit['retryAfter'] / 60));
            $error = "Muitas tentativas. Tente novamente em {$mins} min.";
        } elseif ($user === '' || $pass === '') {
            $error = 'Informe usuário e senha.';
        } elseif (chevalier_auth_check($user, $pass)) {
            chevalier_rate_limit_clear($bucket);
            chevalier_auth_login($user);
            chevalier_audit('login_ok', $user);
            header('Location: ' . $next);
            exit;
        } else {
            usleep(350000);
            chevalier_audit('login_fail', $user, 'invalid_credentials');
            $error = 'Usuário ou senha inválidos.';
        }
    }
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
$csrf = htmlspecialchars(chevalier_csrf_token(), ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Entrar · Dr Gabriel Rosa</title>
<meta name="theme-color" content="#0d0e0c">
<meta name="description" content="Acesso ao sistema do Dr Gabriel Rosa — reabilitação oral e estética.">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" type="image/png" href="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=boska@500,700&display=swap" rel="stylesheet">
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
      <p class="login-lead">Entre para acompanhar produção, custos, próteses e resultado por clínica.</p>
    </section>

    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-panel-brand">
        <img class="login-mark-img" src="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>" width="48" height="48" alt="">
        <div>
          <h2 id="login-title">Bem-vindo de volta</h2>
          <p>Acesse sua área de gestão.</p>
        </div>
      </div>

      <?php if ($error !== ''): ?>
        <div class="login-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>

      <form class="login-form" method="post" action="login.php?next=<?= htmlspecialchars(rawurlencode($next), ENT_QUOTES, 'UTF-8') ?>" autocomplete="on">
        <input type="hidden" name="csrf" value="<?= $csrf ?>">
        <label class="login-field">
          <span>Usuário</span>
          <input type="text" name="user" required autofocus placeholder="Seu usuário" maxlength="80" value="<?= htmlspecialchars((string) ($_POST['user'] ?? ''), ENT_QUOTES, 'UTF-8') ?>">
        </label>
        <label class="login-field">
          <span>Senha</span>
          <input type="password" name="pass" required placeholder="••••••••" maxlength="200" autocomplete="current-password">
        </label>
        <button type="submit" class="login-submit">Entrar</button>
      </form>
      <p class="login-foot">Dr Gabriel Rosa · acesso restrito</p>
    </section>
  </main>
</body>
</html>
