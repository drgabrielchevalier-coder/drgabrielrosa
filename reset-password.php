<?php
declare(strict_types=1);
require_once __DIR__ . '/api/auth-lib.php';
require_once __DIR__ . '/api/app-version-lib.php';
require_once __DIR__ . '/api/password-reset-lib.php';

chevalier_auth_boot();
chevalier_security_headers();

$token = trim((string) ($_GET['token'] ?? $_POST['token'] ?? ''));
$error = '';
$okMsg = '';
$peek = $token !== '' ? chevalier_password_reset_peek($token) : ['ok' => false, 'error' => 'invalid'];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $csrf = (string) ($_POST['csrf'] ?? '');
    $pass = (string) ($_POST['pass'] ?? '');
    $pass2 = (string) ($_POST['pass2'] ?? '');
    $bucket = 'pwdreset:consume:' . chevalier_client_ip();
    $limit = chevalier_rate_limit_hit($bucket, 8, 900);

    if (!chevalier_csrf_validate($csrf)) {
        $error = 'Sessão expirada. Recarregue a página.';
    } elseif (!$limit['ok']) {
        $mins = max(1, (int) ceil($limit['retryAfter'] / 60));
        $error = "Muitas tentativas. Aguarde {$mins} min.";
    } elseif (!$peek['ok']) {
        $error = 'Este link é inválido ou já expirou. Solicite um novo em “Esqueci minha senha”.';
    } elseif ($pass !== $pass2) {
        $error = 'As senhas não coincidem.';
    } else {
        usleep(250000);
        $result = chevalier_password_reset_consume($token, $pass);
        if (!$result['ok']) {
            $code = (string) ($result['error'] ?? '');
            $map = [
                'expired' => 'Este link expirou. Solicite um novo.',
                'invalid' => 'Link inválido. Solicite um novo.',
                'persist' => 'Não foi possível gravar a nova senha no servidor.',
                'hash' => 'Falha ao proteger a senha.',
            ];
            if (isset($map[$code])) {
                $error = $map[$code];
            } elseif ($code !== '') {
                $error = $code; // mensagens de força da senha já vêm legíveis
            } else {
                $error = 'Não foi possível redefinir a senha.';
            }
            chevalier_audit('password_reset_fail', (string) ($peek['username'] ?? ''), substr($code, 0, 80));
        } else {
            chevalier_rate_limit_clear($bucket);
            chevalier_audit('password_reset_ok', (string) ($peek['username'] ?? ''), 'hash_updated');
            // Encerra qualquer sessão antiga e força novo login
            if (chevalier_auth_logged_in()) {
                chevalier_auth_logout();
                chevalier_auth_boot();
            }
            $okMsg = 'Senha atualizada com sucesso. Você já pode entrar com a nova senha.';
            $peek = ['ok' => false, 'error' => 'used'];
            $token = '';
        }
    }
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
$csrf = htmlspecialchars(chevalier_csrf_token(), ENT_QUOTES, 'UTF-8');
$tokenSafe = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
$canForm = $peek['ok'] === true && $okMsg === '';
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Redefinir senha · Dr Gabriel Rosa</title>
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
      <p class="login-lead">Escolha uma senha forte. O link é de uso único.</p>
    </section>

    <section class="login-panel" aria-labelledby="reset-title">
      <div class="login-panel-brand">
        <img class="login-mark-img" src="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>" width="48" height="48" alt="">
        <div>
          <h2 id="reset-title">Nova senha</h2>
          <p>Mínimo 10 caracteres, com letras e números.</p>
        </div>
      </div>

      <?php if ($error !== ''): ?>
        <div class="login-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>
      <?php if ($okMsg !== ''): ?>
        <div class="login-ok" role="status"><?= htmlspecialchars($okMsg, ENT_QUOTES, 'UTF-8') ?></div>
        <p class="login-foot"><a class="login-link" href="login.php">Ir para o login →</a></p>
      <?php elseif (!$canForm): ?>
        <div class="login-error" role="alert">Este link é inválido ou já expirou.</div>
        <p class="login-foot"><a class="login-link" href="forgot-password.php">Solicitar novo link</a> · <a class="login-link" href="login.php">Login</a></p>
      <?php else: ?>
        <form class="login-form" method="post" action="reset-password.php" autocomplete="off">
          <input type="hidden" name="csrf" value="<?= $csrf ?>">
          <input type="hidden" name="token" value="<?= $tokenSafe ?>">
          <label class="login-field">
            <span>Nova senha</span>
            <input type="password" name="pass" required minlength="10" maxlength="200" autocomplete="new-password" autofocus placeholder="••••••••••">
          </label>
          <label class="login-field">
            <span>Confirmar senha</span>
            <input type="password" name="pass2" required minlength="10" maxlength="200" autocomplete="new-password" placeholder="••••••••••">
          </label>
          <button type="submit" class="login-submit">Salvar nova senha</button>
        </form>
        <p class="login-foot"><a class="login-link" href="login.php">← Voltar ao login</a></p>
      <?php endif; ?>
    </section>
  </main>
</body>
</html>
