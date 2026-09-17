<?php
declare(strict_types=1);

/**
 * Sessão, autenticação, CSRF e rate-limit do Chevalier Gestão.
 */
function chevalier_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    $fwd = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    return $fwd === 'https';
}

function chevalier_auth_boot(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('chevalier_sess');
    $secure = chevalier_is_https();
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => $secure,
        'cookie_samesite' => 'Lax',
        'use_strict_mode' => true,
        'use_only_cookies' => true,
    ]);
    if (empty($_SESSION['chevalier_csrf'])) {
        $_SESSION['chevalier_csrf'] = bin2hex(random_bytes(32));
    }
}

function chevalier_csrf_token(): string
{
    chevalier_auth_boot();
    return (string) ($_SESSION['chevalier_csrf'] ?? '');
}

function chevalier_csrf_validate(?string $token): bool
{
    chevalier_auth_boot();
    $expected = (string) ($_SESSION['chevalier_csrf'] ?? '');
    if ($expected === '' || $token === null || $token === '') {
        return false;
    }
    return hash_equals($expected, $token);
}

function chevalier_csrf_require(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf'] ?? null;
    if ($token === null) {
        $raw = file_get_contents('php://input');
        if (is_string($raw) && $raw !== '') {
            $json = json_decode($raw, true);
            if (is_array($json) && isset($json['csrf'])) {
                $token = (string) $json['csrf'];
            }
            // Restore body for later readers via temp stash
            $GLOBALS['__chevalier_raw_body'] = $raw;
        }
    }
    if (!chevalier_csrf_validate(is_string($token) ? $token : null)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['ok' => false, 'error' => 'Token CSRF inválido ou ausente.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function chevalier_request_body(): string
{
    if (isset($GLOBALS['__chevalier_raw_body']) && is_string($GLOBALS['__chevalier_raw_body'])) {
        return $GLOBALS['__chevalier_raw_body'];
    }
    return (string) file_get_contents('php://input');
}

function chevalier_client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    return preg_replace('/[^0-9a-fA-F:.]/', '', $ip) ?: '0.0.0.0';
}

function chevalier_rate_limit_path(): string
{
    $dir = sys_get_temp_dir() . '/chevalier_rate';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

/**
 * @return array{ok:bool,retryAfter:int,remaining:int}
 */
function chevalier_rate_limit_hit(string $bucket, int $max = 8, int $windowSec = 900): array
{
    $key = hash('sha256', $bucket);
    $file = chevalier_rate_limit_path() . '/' . $key . '.json';
    $now = time();
    $data = ['fails' => [], 'lockUntil' => 0];
    if (is_file($file)) {
        $parsed = json_decode((string) file_get_contents($file), true);
        if (is_array($parsed)) {
            $data = array_merge($data, $parsed);
        }
    }
    $lockUntil = (int) ($data['lockUntil'] ?? 0);
    if ($lockUntil > $now) {
        return ['ok' => false, 'retryAfter' => $lockUntil - $now, 'remaining' => 0];
    }
    $fails = array_values(array_filter((array) ($data['fails'] ?? []), static fn ($t) => is_int($t) || ctype_digit((string) $t)));
    $fails = array_map('intval', $fails);
    $fails = array_values(array_filter($fails, static fn ($t) => ($now - $t) < $windowSec));
    $fails[] = $now;
    $remaining = max(0, $max - count($fails));
    $lock = 0;
    if (count($fails) >= $max) {
        $lock = $now + $windowSec;
        $remaining = 0;
    }
    file_put_contents($file, json_encode(['fails' => $fails, 'lockUntil' => $lock], JSON_UNESCAPED_UNICODE), LOCK_EX);
    @chmod($file, 0600);
    return ['ok' => $lock === 0, 'retryAfter' => $lock > $now ? ($lock - $now) : 0, 'remaining' => $remaining];
}

function chevalier_rate_limit_clear(string $bucket): void
{
    $file = chevalier_rate_limit_path() . '/' . hash('sha256', $bucket) . '.json';
    if (is_file($file)) {
        @unlink($file);
    }
}

function chevalier_auth_credentials(): array
{
    require_once __DIR__ . '/config.php';
    $user = defined('AUTH_USER') ? (string) AUTH_USER : 'gabriel';
    $pass = defined('AUTH_PASS') ? (string) AUTH_PASS : '';
    $hash = defined('AUTH_PASS_HASH') ? (string) AUTH_PASS_HASH : '';
    // Compatibilidade: se não houver hash nem senha, mantém legado (não ideal).
    if ($hash === '' && $pass === '') {
        $pass = 'chevalier';
    }
    return ['user' => $user, 'pass' => $pass, 'hash' => $hash];
}

function chevalier_auth_check(string $user, string $pass): bool
{
    $creds = chevalier_auth_credentials();
    if (!hash_equals(strtolower($creds['user']), strtolower(trim($user)))) {
        return false;
    }
    if ($creds['hash'] !== '') {
        return password_verify($pass, $creds['hash']);
    }
    return $creds['pass'] !== '' && hash_equals($creds['pass'], $pass);
}

function chevalier_auth_logged_in(): bool
{
    chevalier_auth_boot();
    return !empty($_SESSION['chevalier_user']);
}

function chevalier_auth_user(): string
{
    chevalier_auth_boot();
    return (string) ($_SESSION['chevalier_user'] ?? '');
}

function chevalier_auth_login(string $user): void
{
    chevalier_auth_boot();
    session_regenerate_id(true);
    $_SESSION['chevalier_user'] = $user;
    $_SESSION['chevalier_login_at'] = time();
    $_SESSION['chevalier_csrf'] = bin2hex(random_bytes(32));
}

function chevalier_auth_logout(): void
{
    chevalier_auth_boot();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', (bool) $p['secure'], (bool) $p['httponly']);
    }
    session_destroy();
}

function chevalier_auth_require(): void
{
    if (chevalier_auth_logged_in()) {
        return;
    }
    $next = $_SERVER['REQUEST_URI'] ?? 'index.php';
    header('Location: login.php?next=' . rawurlencode($next));
    exit;
}

function chevalier_auth_require_api(): void
{
    if (chevalier_auth_logged_in()) {
        return;
    }
    http_response_code(401);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'ok' => false,
        'needsAuth' => true,
        'error' => 'Faça login para continuar.',
        'loginUrl' => 'login.php',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function chevalier_security_headers(): void
{
    if (!headers_sent()) {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
        if (chevalier_is_https()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }
}

function chevalier_audit(string $event, string $username = '', string $detail = ''): void
{
    try {
        require_once __DIR__ . '/db.php';
        $pdo = chevalier_pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO auth_audit (event, username, ip, detail) VALUES (:event, :username, :ip, :detail)'
        );
        $stmt->execute([
            'event' => substr($event, 0, 40),
            'username' => substr($username, 0, 120),
            'ip' => substr(chevalier_client_ip(), 0, 64),
            'detail' => substr($detail, 0, 255),
        ]);
    } catch (Throwable $e) {
        // Auditoria é best-effort — não quebra login se o banco ainda não estiver configurado.
    }
}
