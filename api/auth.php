<?php
declare(strict_types=1);
require_once __DIR__ . '/auth-lib.php';
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

chevalier_auth_boot();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'logout') {
    chevalier_auth_logout();
    header('Location: ../login.php');
    exit;
}

if ($method === 'GET' && $action === 'me') {
    echo json_encode([
        'ok' => true,
        'loggedIn' => chevalier_auth_logged_in(),
        'user' => chevalier_auth_user(),
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
    if ($user === '' || $pass === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Informe usuário e senha.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!chevalier_auth_check($user, $pass)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Usuário ou senha inválidos.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    chevalier_auth_login($user);
    echo json_encode(['ok' => true, 'user' => $user, 'redirect' => 'index.php'], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
