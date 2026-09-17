<?php
declare(strict_types=1);
require_once __DIR__ . '/auth-lib.php';
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

chevalier_auth_boot();
chevalier_security_headers();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'logout') {
    // Prefer POST+CSRF; GET logout still allowed but regenerates session cleanup
    $who = chevalier_auth_user();
    chevalier_audit('logout', $who);
    chevalier_auth_logout();
    header('Location: ../login.php');
    exit;
}

if ($method === 'GET' && $action === 'me') {
    echo json_encode([
        'ok' => true,
        'loggedIn' => chevalier_auth_logged_in(),
        'user' => chevalier_auth_user(),
        'csrf' => chevalier_csrf_token(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: 'null', true);
    if (!is_array($data)) {
        $data = $_POST;
    }
    $user = trim((string) ($data['user'] ?? $data['email'] ?? ''));
    $pass = (string) ($data['pass'] ?? $data['password'] ?? '');
    $csrf = (string) ($data['csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!chevalier_csrf_validate($csrf)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Token CSRF inválido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($user === '' || $pass === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Informe usuário e senha.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $bucket = 'login:' . chevalier_client_ip() . ':' . strtolower($user);
    $limit = chevalier_rate_limit_hit($bucket, 8, 900);
    if (!$limit['ok']) {
        http_response_code(429);
        echo json_encode([
            'ok' => false,
            'error' => 'Muitas tentativas. Aguarde e tente novamente.',
            'retryAfter' => $limit['retryAfter'],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!chevalier_auth_check($user, $pass)) {
        usleep(350000);
        chevalier_audit('login_fail', $user, 'api_invalid');
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Usuário ou senha inválidos.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    chevalier_rate_limit_clear($bucket);
    chevalier_auth_login($user);
    chevalier_audit('login_ok', $user, 'api');
    echo json_encode([
        'ok' => true,
        'user' => $user,
        'redirect' => 'index.php',
        'csrf' => chevalier_csrf_token(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
