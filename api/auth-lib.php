<?php
declare(strict_types=1);

/**
 * Sessão e autenticação do Chevalier Gestão.
 */
function chevalier_auth_boot(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_name('chevalier_sess');
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
            'use_strict_mode' => true,
        ]);
    }
}

function chevalier_auth_credentials(): array
{
    require_once __DIR__ . '/config.php';
    $user = defined('AUTH_USER') ? (string) AUTH_USER : 'gabriel';
    $pass = defined('AUTH_PASS') ? (string) AUTH_PASS : 'chevalier';
    $hash = defined('AUTH_PASS_HASH') ? (string) AUTH_PASS_HASH : '';
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
    return hash_equals($creds['pass'], $pass);
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
