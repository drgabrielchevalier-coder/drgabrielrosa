<?php
declare(strict_types=1);

/**
 * Recuperação de senha: tokens de uso único, hash-only, expiração curta.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/mail-lib.php';

const CHEVALIER_RESET_TTL_SEC = 3600; // 1 hora
const CHEVALIER_RESET_MAX_ACTIVE = 3;

function chevalier_auth_email(): string
{
    if (defined('AUTH_EMAIL') && filter_var((string) AUTH_EMAIL, FILTER_VALIDATE_EMAIL)) {
        return strtolower(trim((string) AUTH_EMAIL));
    }
    return '';
}

function chevalier_auth_email_configured(): bool
{
    return chevalier_auth_email() !== '';
}

function chevalier_app_base_url(): string
{
    if (defined('APP_BASE_URL') && trim((string) APP_BASE_URL) !== '') {
        return rtrim(trim((string) APP_BASE_URL), '/');
    }
    $https = chevalier_is_https();
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $host = preg_replace('/[^a-zA-Z0-9.:\[\]_-]/', '', $host) ?: 'localhost';
    $dir = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/')));
    if ($dir === '/' || $dir === '\\' || $dir === '.') {
        $dir = '';
    }
    // Se o script está em /api/, sobe um nível
    if (str_ends_with($dir, '/api')) {
        $dir = substr($dir, 0, -4);
    }
    return ($https ? 'https' : 'http') . '://' . $host . $dir;
}

function chevalier_password_reset_storage_dir(): string
{
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $ht = $dir . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "Require all denied\n");
    }
    return $dir;
}

function chevalier_password_reset_ensure_table(): ?PDO
{
    try {
        require_once __DIR__ . '/db.php';
        $pdo = chevalier_pdo();
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS password_resets (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(120) NOT NULL,
                email VARCHAR(190) NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at INT UNSIGNED NOT NULL,
                used_at INT UNSIGNED NULL DEFAULT NULL,
                created_at INT UNSIGNED NOT NULL,
                request_ip VARCHAR(64) NOT NULL DEFAULT "",
                INDEX (token_hash),
                INDEX (expires_at),
                INDEX (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
        return $pdo;
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * @return list<array<string,mixed>>
 */
function chevalier_password_reset_file_load(): array
{
    $file = chevalier_password_reset_storage_dir() . '/password_resets.json';
    if (!is_file($file)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

/**
 * @param list<array<string,mixed>> $rows
 */
function chevalier_password_reset_file_save(array $rows): bool
{
    $file = chevalier_password_reset_storage_dir() . '/password_resets.json';
    $ok = file_put_contents(
        $file,
        json_encode(array_values($rows), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        LOCK_EX
    ) !== false;
    if ($ok) {
        @chmod($file, 0600);
    }
    return $ok;
}

function chevalier_password_reset_hash(string $token): string
{
    return hash('sha256', $token);
}

/**
 * Cria token de redefinição. Retorna o token em claro só para montar o e-mail.
 *
 * @return array{ok:bool,token?:string,error?:string}
 */
function chevalier_password_reset_create(string $email, string $ip = ''): array
{
    $email = strtolower(trim($email));
    $linked = chevalier_auth_email();
    if ($linked === '' || !hash_equals($linked, $email)) {
        return ['ok' => false, 'error' => 'email_mismatch'];
    }

    $creds = chevalier_auth_credentials();
    $username = (string) ($creds['user'] ?? 'gabriel');
    $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $hash = chevalier_password_reset_hash($token);
    $now = time();
    $expires = $now + CHEVALIER_RESET_TTL_SEC;

    $pdo = chevalier_password_reset_ensure_table();
    if ($pdo) {
        // Limpa tokens expirados / excedentes
        $pdo->prepare('DELETE FROM password_resets WHERE expires_at < :now OR used_at IS NOT NULL')
            ->execute(['now' => $now]);
        $cntStmt = $pdo->prepare(
            'SELECT id FROM password_resets WHERE username = :u AND used_at IS NULL AND expires_at >= :now ORDER BY created_at ASC'
        );
        $cntStmt->execute(['u' => $username, 'now' => $now]);
        $activeIds = $cntStmt->fetchAll(PDO::FETCH_COLUMN);
        while (count($activeIds) >= CHEVALIER_RESET_MAX_ACTIVE) {
            $oldest = array_shift($activeIds);
            if ($oldest === null) {
                break;
            }
            $pdo->prepare('DELETE FROM password_resets WHERE id = :id')->execute(['id' => $oldest]);
        }
        $stmt = $pdo->prepare(
            'INSERT INTO password_resets (username, email, token_hash, expires_at, created_at, request_ip)
             VALUES (:username, :email, :token_hash, :expires_at, :created_at, :request_ip)'
        );
        $stmt->execute([
            'username' => $username,
            'email' => $email,
            'token_hash' => $hash,
            'expires_at' => $expires,
            'created_at' => $now,
            'request_ip' => substr($ip, 0, 64),
        ]);
    } else {
        $rows = array_values(array_filter(
            chevalier_password_reset_file_load(),
            static fn ($r) => is_array($r)
                && empty($r['used_at'])
                && (int) ($r['expires_at'] ?? 0) >= $now
        ));
        $mine = array_values(array_filter($rows, static fn ($r) => ($r['username'] ?? '') === $username));
        if (count($mine) >= CHEVALIER_RESET_MAX_ACTIVE) {
            // remove o mais antigo deste usuário
            usort($rows, static fn ($a, $b) => ((int) ($a['created_at'] ?? 0)) <=> ((int) ($b['created_at'] ?? 0)));
            foreach ($rows as $i => $r) {
                if (($r['username'] ?? '') === $username) {
                    unset($rows[$i]);
                    break;
                }
            }
            $rows = array_values($rows);
        }
        $rows[] = [
            'username' => $username,
            'email' => $email,
            'token_hash' => $hash,
            'expires_at' => $expires,
            'created_at' => $now,
            'used_at' => null,
            'request_ip' => substr($ip, 0, 64),
        ];
        if (!chevalier_password_reset_file_save($rows)) {
            return ['ok' => false, 'error' => 'storage'];
        }
    }

    return ['ok' => true, 'token' => $token];
}

/**
 * @return array{ok:bool,username?:string,error?:string}
 */
function chevalier_password_reset_peek(string $token): array
{
    $token = trim($token);
    if ($token === '' || strlen($token) < 20) {
        return ['ok' => false, 'error' => 'invalid'];
    }
    $hash = chevalier_password_reset_hash($token);
    $now = time();

    $pdo = chevalier_password_reset_ensure_table();
    if ($pdo) {
        $stmt = $pdo->prepare(
            'SELECT username, expires_at, used_at FROM password_resets WHERE token_hash = :h LIMIT 1'
        );
        $stmt->execute(['h' => $hash]);
        $row = $stmt->fetch();
        if (!$row || !empty($row['used_at']) || (int) $row['expires_at'] < $now) {
            return ['ok' => false, 'error' => 'expired'];
        }
        return ['ok' => true, 'username' => (string) $row['username']];
    }

    foreach (chevalier_password_reset_file_load() as $row) {
        if (!is_array($row)) {
            continue;
        }
        if (!hash_equals((string) ($row['token_hash'] ?? ''), $hash)) {
            continue;
        }
        if (!empty($row['used_at']) || (int) ($row['expires_at'] ?? 0) < $now) {
            return ['ok' => false, 'error' => 'expired'];
        }
        return ['ok' => true, 'username' => (string) ($row['username'] ?? '')];
    }
    return ['ok' => false, 'error' => 'invalid'];
}

/**
 * Consome o token (uso único) e define nova senha.
 *
 * @return array{ok:bool,error?:string}
 */
function chevalier_password_reset_consume(string $token, string $newPassword): array
{
    $peek = chevalier_password_reset_peek($token);
    if (!$peek['ok']) {
        return ['ok' => false, 'error' => $peek['error'] ?? 'invalid'];
    }

    $strength = chevalier_password_validate_strength($newPassword);
    if (!$strength['ok']) {
        return ['ok' => false, 'error' => (string) ($strength['error'] ?? 'Senha inválida.')];
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    if ($hash === false) {
        return ['ok' => false, 'error' => 'hash'];
    }
    if (!chevalier_auth_persist_password_hash($hash)) {
        return ['ok' => false, 'error' => 'persist'];
    }

    $tokenHash = chevalier_password_reset_hash($token);
    $now = time();
    $pdo = chevalier_password_reset_ensure_table();
    if ($pdo) {
        $pdo->prepare('UPDATE password_resets SET used_at = :u WHERE token_hash = :h')
            ->execute(['u' => $now, 'h' => $tokenHash]);
        // Invalida demais tokens ativos do usuário
        $pdo->prepare(
            'UPDATE password_resets SET used_at = :u WHERE username = :user AND used_at IS NULL AND token_hash <> :h'
        )->execute(['u' => $now, 'user' => (string) $peek['username'], 'h' => $tokenHash]);
    } else {
        $rows = chevalier_password_reset_file_load();
        foreach ($rows as &$row) {
            if (!is_array($row)) {
                continue;
            }
            if (($row['username'] ?? '') === ($peek['username'] ?? '') && empty($row['used_at'])) {
                $row['used_at'] = $now;
            }
        }
        unset($row);
        chevalier_password_reset_file_save($rows);
    }

    return ['ok' => true];
}

/**
 * @return array{ok:bool,error?:string}
 */
function chevalier_password_validate_strength(string $password): array
{
    if (strlen($password) < 10) {
        return ['ok' => false, 'error' => 'A senha deve ter pelo menos 10 caracteres.'];
    }
    if (strlen($password) > 200) {
        return ['ok' => false, 'error' => 'Senha longa demais.'];
    }
    if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        return ['ok' => false, 'error' => 'Use letras e números na nova senha.'];
    }
    return ['ok' => true];
}

function chevalier_auth_persist_password_hash(string $hash): bool
{
    // Grava hash e remove senha em texto claro do config.local.php
    return chevalier_config_local_upsert_auth([
        'AUTH_PASS_HASH' => $hash,
        'AUTH_PASS' => '',
    ]);
}

/**
 * Upsert seguro de defines AUTH_* / MAIL_* em config.local.php.
 *
 * @param array<string,string> $defines valor '' remove a linha
 */
function chevalier_config_local_upsert_auth(array $defines): bool
{
    if (function_exists('chevalier_config_local_upsert')) {
        return chevalier_config_local_upsert($defines);
    }
    $localPath = __DIR__ . '/config.local.php';
    $existing = is_file($localPath) ? (string) file_get_contents($localPath) : "<?php\ndeclare(strict_types=1);\n\n";
    $lines = preg_split("/\r\n|\n|\r/", $existing) ?: [];
    $out = [];
    $seen = array_fill_keys(array_keys($defines), false);
    foreach ($lines as $line) {
        $matched = false;
        foreach ($defines as $name => $value) {
            if (preg_match('/define\s*\(\s*[\'"]' . preg_quote($name, '/') . '[\'"]/', $line)) {
                $matched = true;
                $seen[$name] = true;
                if ($value !== '') {
                    $out[] = "define('{$name}', " . var_export($value, true) . ');';
                }
                break;
            }
        }
        if (!$matched) {
            $out[] = $line;
        }
    }
    foreach ($defines as $name => $value) {
        if ($seen[$name] || $value === '') {
            continue;
        }
        $out[] = "define('{$name}', " . var_export($value, true) . ');';
    }
    $content = implode("\n", $out);
    if (!str_ends_with($content, "\n")) {
        $content .= "\n";
    }
    $ok = file_put_contents($localPath, $content, LOCK_EX) !== false;
    if ($ok) {
        @chmod($localPath, 0600);
    }
    return $ok;
}

/**
 * Solicita reset: resposta genérica (anti-enumeração). Envia e-mail só se o endereço for o vinculado.
 *
 * @return array{ok:bool,sent:bool,error?:string}
 */
function chevalier_password_reset_request(string $email, string $ip = ''): array
{
    $emailNorm = strtolower(trim($email));
    $generic = ['ok' => true, 'sent' => false];

    if (!chevalier_auth_email_configured()) {
        return ['ok' => false, 'sent' => false, 'error' => 'Recuperação de senha ainda não está configurada (AUTH_EMAIL).'];
    }
    if (!filter_var($emailNorm, FILTER_VALIDATE_EMAIL)) {
        // Mesma mensagem pública; não revela
        return $generic;
    }

    $linked = chevalier_auth_email();
    if (!hash_equals($linked, $emailNorm)) {
        return $generic;
    }

    $created = chevalier_password_reset_create($emailNorm, $ip);
    if (!$created['ok'] || empty($created['token'])) {
        return ['ok' => false, 'sent' => false, 'error' => 'Não foi possível gerar o link agora. Tente novamente em instantes.'];
    }

    $link = chevalier_app_base_url() . '/reset-password.php?token=' . rawurlencode((string) $created['token']);
    $mins = (int) (CHEVALIER_RESET_TTL_SEC / 60);
    $text = "Olá,\n\n"
        . "Recebemos um pedido para redefinir a senha do sistema Dr Gabriel Rosa.\n\n"
        . "Abra este link (válido por {$mins} minutos, uso único):\n"
        . "{$link}\n\n"
        . "Se você não pediu isso, ignore este e-mail — sua senha permanece igual.\n\n"
        . "— Dr Gabriel Rosa · Gestão\n";

    $html = '<div style="font-family:Georgia,serif;color:#1d1f1c;line-height:1.55;max-width:560px">'
        . '<p>Olá,</p>'
        . '<p>Recebemos um pedido para redefinir a senha do sistema <strong>Dr Gabriel Rosa</strong>.</p>'
        . '<p><a href="' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '" '
        . 'style="display:inline-block;padding:12px 18px;background:#171816;color:#f7f2e7;text-decoration:none;border-radius:10px">'
        . 'Redefinir senha</a></p>'
        . '<p style="font-size:13px;color:#73786f">O link vale por ' . $mins . ' minutos e só pode ser usado uma vez.</p>'
        . '<p style="font-size:13px;color:#73786f">Se você não pediu isso, ignore este e-mail.</p>'
        . '<p style="font-size:12px;color:#9a9080">Dr Gabriel Rosa · Gestão</p>'
        . '</div>';

    $mail = chevalier_mail_send($emailNorm, 'Redefinição de senha · Dr Gabriel Rosa', $text, $html);
    if (!$mail['ok']) {
        chevalier_audit('password_reset_mail_fail', chevalier_auth_credentials()['user'] ?? '', substr((string) ($mail['error'] ?? ''), 0, 200));
        return ['ok' => false, 'sent' => false, 'error' => 'Não foi possível enviar o e-mail. Verifique MAIL_FROM/SMTP no servidor.'];
    }

    chevalier_audit('password_reset_sent', chevalier_auth_credentials()['user'] ?? '', 'mail_ok');
    return ['ok' => true, 'sent' => true];
}
