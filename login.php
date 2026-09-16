<?php
declare(strict_types=1);
require_once __DIR__ . '/api/auth-lib.php';
require_once __DIR__ . '/api/app-version-lib.php';

chevalier_auth_boot();
if (chevalier_auth_logged_in()) {
    header('Location: index.php');
    exit;
}

$error = '';
$next = isset($_GET['next']) ? (string) $_GET['next'] : 'index.php';
if ($next === '' || str_contains($next, '://') || str_starts_with($next, '//')) {
    $next = 'index.php';
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $user = trim((string) ($_POST['user'] ?? ''));
    $pass = (string) ($_POST['pass'] ?? '');
    if (chevalier_auth_check($user, $pass)) {
        chevalier_auth_login($user);
        header('Location: ' . $next);
        exit;
    }
    $error = 'Usuário ou senha inválidos.';
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Entrar · Chevalier Gestão</title>
<meta name="theme-color" content="#171816">
<meta name="description" content="Acesso ao Chevalier Gestão — clínica e performance.">
<link rel="icon" type="image/svg+xml" href="<?= chevalier_asset_url('assets/img/favicon.svg') ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
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
      <p class="login-kicker">Chevalier Gestão</p>
      <h1>Clínica &amp; Performance</h1>
      <p class="login-lead">Entre para acompanhar produção, custos, próteses e resultado por clínica.</p>
    </section>

    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-panel-brand">
        <div class="login-mark">CG</div>
        <div>
          <h2 id="login-title">Bem-vindo de volta</h2>
          <p>Acesse sua área de gestão.</p>
        </div>
      </div>

      <?php if ($error !== ''): ?>
        <div class="login-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>

      <form class="login-form" method="post" action="login.php?next=<?= htmlspecialchars(rawurlencode($next), ENT_QUOTES, 'UTF-8') ?>" autocomplete="on">
        <label class="login-field">
          <span>Usuário</span>
          <input type="text" name="user" required autofocus placeholder="Seu usuário" value="<?= htmlspecialchars((string) ($_POST['user'] ?? ''), ENT_QUOTES, 'UTF-8') ?>">
        </label>
        <label class="login-field">
          <span>Senha</span>
          <input type="password" name="pass" required placeholder="••••••••">
        </label>
        <button type="submit" class="login-submit">Entrar</button>
      </form>
      <p class="login-foot">Chevalier Gestão · acesso restrito</p>
    </section>
  </main>
</body>
</html>
