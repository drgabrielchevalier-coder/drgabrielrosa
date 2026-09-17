<?php
declare(strict_types=1);

require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/config.php';

chevalier_auth_boot();
chevalier_security_headers();
chevalier_auth_require(); // somente usuário logado configura o banco

$connected = false;
$error = '';
$saved = false;

if (is_file(__DIR__ . '/config.local.php') && defined('DB_PASS') && DB_PASS !== '') {
    try {
        require_once __DIR__ . '/db.php';
        chevalier_pdo();
        $connected = true;
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && !$connected) {
    if (!chevalier_csrf_validate((string) ($_POST['csrf'] ?? ''))) {
        $error = 'Token CSRF inválido. Recarregue a página.';
    } else {
        $pass = (string) ($_POST['db_pass'] ?? '');
        $host = trim((string) ($_POST['db_host'] ?? 'localhost')) ?: 'localhost';
        $name = trim((string) ($_POST['db_name'] ?? DB_NAME)) ?: DB_NAME;
        $user = trim((string) ($_POST['db_user'] ?? DB_USER)) ?: DB_USER;

        if ($pass === '') {
            $error = 'Informe a senha do usuário MySQL.';
        } elseif (!preg_match('/^[a-zA-Z0-9._-]+$/', $host) || !preg_match('/^[a-zA-Z0-9_]+$/', $name) || !preg_match('/^[a-zA-Z0-9_]+$/', $user)) {
            $error = 'Host, banco ou usuário com caracteres inválidos.';
        } else {
            try {
                $pdo = new PDO(
                    'mysql:host=' . $host . ';dbname=' . $name . ';charset=utf8mb4',
                    $user,
                    $pass,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                $pdo->exec(
                    'CREATE TABLE IF NOT EXISTS app_state (
                        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
                        payload LONGTEXT NOT NULL,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
                );
                $pdo->exec(
                    'CREATE TABLE IF NOT EXISTS auth_audit (
                        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        event VARCHAR(40) NOT NULL,
                        username VARCHAR(120) NOT NULL DEFAULT "",
                        ip VARCHAR(64) NOT NULL DEFAULT "",
                        detail VARCHAR(255) NOT NULL DEFAULT "",
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        INDEX (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
                );

                $localPath = __DIR__ . '/config.local.php';
                if (is_file($localPath)) {
                    throw new RuntimeException('config.local.php já existe. Remova-o manualmente no servidor para reconfigurar.');
                }

                $export = "<?php\n" .
                    "declare(strict_types=1);\n" .
                    "define('DB_HOST', " . var_export($host, true) . ");\n" .
                    "define('DB_NAME', " . var_export($name, true) . ");\n" .
                    "define('DB_USER', " . var_export($user, true) . ");\n" .
                    "define('DB_PASS', " . var_export($pass, true) . ");\n";

                if (file_put_contents($localPath, $export, LOCK_EX) === false) {
                    throw new RuntimeException('Não foi possível gravar api/config.local.php');
                }
                @chmod($localPath, 0600);
                $connected = true;
                $saved = true;
            } catch (Throwable $e) {
                $error = $e->getMessage();
            }
        }
    }
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
$csrf = htmlspecialchars(chevalier_csrf_token(), ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dr Gabriel Rosa — MySQL</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;background:#171816;color:#ecece6;margin:0;padding:40px 16px}
  .box{max-width:520px;margin:0 auto;background:#22231f;border:1px solid #33342f;border-radius:16px;padding:28px}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#b7b7ad;line-height:1.5}
  label{display:block;font-size:12px;margin:14px 0 6px;color:#cfcfc6}
  input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #3a3b36;background:#111210;color:#fff}
  button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:10px;background:#d7b56d;font-weight:700;cursor:pointer}
  .ok{color:#9ad27a}
  .err{color:#f0a3a3}
  .hint{font-size:12px;color:#8f948b}
</style>
</head>
<body>
<div class="box">
  <h1>Conectar banco MySQL</h1>
  <p class="hint">Acesso restrito a usuários autenticados. Logado como <strong><?= htmlspecialchars(chevalier_auth_user(), ENT_QUOTES, 'UTF-8') ?></strong>.</p>
  <?php if ($connected): ?>
    <p class="ok"><?php echo $saved ? 'Banco conectado e tabela criada.' : 'O banco já está conectado.'; ?></p>
    <p>Os lançamentos do sistema passam a ser gravados em <strong><?php echo htmlspecialchars(DB_NAME, ENT_QUOTES, 'UTF-8'); ?></strong>.</p>
    <p><a href="../index.php" style="color:#d7b56d">Abrir o sistema</a></p>
  <?php else: ?>
    <p>Use a senha do banco MySQL (a mesma do phpMyAdmin no hPanel).</p>
    <?php if ($error): ?><p class="err"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
    <form method="post" autocomplete="off">
      <input type="hidden" name="csrf" value="<?= $csrf ?>">
      <label>Host</label>
      <input name="db_host" value="localhost" required pattern="[A-Za-z0-9._-]+">
      <label>Banco</label>
      <input name="db_name" value="<?php echo htmlspecialchars(DB_NAME, ENT_QUOTES, 'UTF-8'); ?>" required pattern="[A-Za-z0-9_]+">
      <label>Usuário</label>
      <input name="db_user" value="<?php echo htmlspecialchars(DB_USER, ENT_QUOTES, 'UTF-8'); ?>" required pattern="[A-Za-z0-9_]+">
      <label>Senha</label>
      <input name="db_pass" type="password" required>
      <button type="submit">Conectar e criar tabela</button>
    </form>
  <?php endif; ?>
</div>
</body>
</html>
