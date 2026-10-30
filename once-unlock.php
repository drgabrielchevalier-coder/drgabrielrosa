<?php
declare(strict_types=1);

/**
 * Desbloqueio de emergência — USO ÚNICO.
 * Remova este arquivo após redefinir a senha.
 */
require_once __DIR__ . '/api/auth-lib.php';
require_once __DIR__ . '/api/app-version-lib.php';
require_once __DIR__ . '/api/password-reset-lib.php';

chevalier_auth_boot();
chevalier_security_headers();

// Hash SHA-256 da chave privada (nunca a chave em claro no código)
const CHEVALIER_ONCE_UNLOCK_HASH = '49bfe827d868e598c6be04f5fa7e6db8e057409eced1f7729cf424074b4c6055';
const CHEVALIER_ONCE_UNLOCK_EXPIRES = 1793400153; // ~2h a partir da emissão

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Robots-Tag: noindex, nofollow');

$usedFile = __DIR__ . '/api/storage/once-unlock.used';
$error = '';
$okMsg = '';
$key = (string) ($_GET['k'] ?? $_POST['k'] ?? '');
$keyOk = $key !== '' && hash_equals(CHEVALIER_ONCE_UNLOCK_HASH, hash('sha256', $key));

if (is_file($usedFile)) {
    http_response_code(410);
    $error = 'Este desbloqueio já foi usado e está desativado.';
    $keyOk = false;
} elseif (time() > CHEVALIER_ONCE_UNLOCK_EXPIRES) {
    http_response_code(410);
    $error = 'Este link de emergência expirou. Peça um novo ao assistente.';
    $keyOk = false;
} elseif (!$keyOk) {
    http_response_code(403);
    $error = 'Chave inválida.';
}

if ($keyOk && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $bucket = 'onceunlock:' . chevalier_client_ip();
    $limit = chevalier_rate_limit_hit($bucket, 8, 900);
    if (!$limit['ok']) {
        $keyOk = false;
        $error = 'Muitas tentativas. Aguarde alguns minutos.';
    }
}

if ($keyOk && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && $error === '') {
    $csrf = (string) ($_POST['csrf'] ?? '');
    $pass = (string) ($_POST['pass'] ?? '');
    $pass2 = (string) ($_POST['pass2'] ?? '');
    if (!chevalier_csrf_validate($csrf)) {
        $error = 'Sessão expirada. Recarregue e tente de novo.';
    } elseif ($pass !== $pass2) {
        $error = 'As senhas não coincidem.';
    } else {
        $strength = chevalier_password_validate_strength($pass);
        if (!$strength['ok']) {
            $error = (string) ($strength['error'] ?? 'Senha inválida.');
        } else {
            $hash = password_hash($pass, PASSWORD_DEFAULT);
            if ($hash === false || !chevalier_auth_persist_password_hash($hash)) {
                $error = 'Não foi possível gravar a nova senha no servidor (api/config.local.php).';
            } else {
                @file_put_contents($usedFile, (string) time(), LOCK_EX);
                @chmod($usedFile, 0600);
                chevalier_audit('once_unlock_ok', 'gabriel', 'password_rotated');
                if (chevalier_auth_logged_in()) {
                    chevalier_auth_logout();
                    chevalier_auth_boot();
                }
                $okMsg = 'Senha redefinida. Este link foi desativado. Entre com o usuário gabriel e a nova senha.';
                $keyOk = false;
            }
        }
    }
}

$csrf = htmlspecialchars(chevalier_csrf_token(), ENT_QUOTES, 'UTF-8');
$keySafe = htmlspecialchars($key, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Desbloqueio · Dr Gabriel Rosa</title>
<meta name="robots" content="noindex,nofollow">
<link rel="stylesheet" href="<?= chevalier_asset_url('assets/css/login.css') ?>">
</head>
<body class="login-body">
<main class="login-shell" style="grid-template-columns:1fr;max-width:520px">
  <section class="login-panel">
    <div class="login-panel-brand">
      <img class="login-mark-img" src="<?= chevalier_asset_url('assets/img/brand/mark-gr-gold.png') ?>" width="48" height="48" alt="">
      <div>
        <h2>Desbloqueio de emergência</h2>
        <p>Uso único · usuário gabriel</p>
      </div>
    </div>
    <?php if ($error !== ''): ?>
      <div class="login-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endif; ?>
    <?php if ($okMsg !== ''): ?>
      <div class="login-ok" role="status"><?= htmlspecialchars($okMsg, ENT_QUOTES, 'UTF-8') ?></div>
      <p class="login-foot"><a class="login-link" href="login.php">Ir para o login →</a></p>
    <?php elseif ($keyOk): ?>
      <form class="login-form" method="post" action="once-unlock.php?k=<?= rawurlencode($key) ?>">
        <input type="hidden" name="csrf" value="<?= $csrf ?>">
        <input type="hidden" name="k" value="<?= $keySafe ?>">
        <label class="login-field">
          <span>Nova senha</span>
          <input type="password" name="pass" required minlength="10" maxlength="200" autocomplete="new-password" autofocus>
        </label>
        <label class="login-field">
          <span>Confirmar senha</span>
          <input type="password" name="pass2" required minlength="10" maxlength="200" autocomplete="new-password">
        </label>
        <p class="login-hint">Mínimo 10 caracteres, com letras e números. Depois deste uso o link deixa de funcionar.</p>
        <button type="submit" class="login-submit">Salvar nova senha</button>
      </form>
    <?php else: ?>
      <p class="login-foot"><a class="login-link" href="login.php">Voltar ao login</a></p>
    <?php endif; ?>
  </section>
</main>
</body>
</html>
