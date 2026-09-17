<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth-lib.php';

chevalier_auth_boot();
chevalier_security_headers();
chevalier_auth_require_api();

try {
    $pdo = chevalier_pdo();
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'needsSetup' => true,
        'error' => $e->getMessage(),
        'setupUrl' => 'api/setup.php',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $row = $pdo->query('SELECT payload, UNIX_TIMESTAMP(updated_at) AS ts FROM app_state WHERE id = 1')->fetch();
    echo json_encode([
        'ok' => true,
        'state' => $row ? json_decode($row['payload'], true) : null,
        'updatedAt' => $row ? (int) ($row['ts'] ?? 0) : 0,
        'csrf' => chevalier_csrf_token(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    chevalier_csrf_require();
    $raw = chevalier_request_body();
    $data = json_decode($raw ?: 'null', true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'JSON inválido'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // Não persistir token CSRF dentro do blob do app
    unset($data['csrf']);

    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > 8_000_000) {
        http_response_code(413);
        echo json_encode(['ok' => false, 'error' => 'Estado grande demais para gravar.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare('INSERT INTO app_state (id, payload) VALUES (1, :payload)
        ON DUPLICATE KEY UPDATE payload = VALUES(payload)');
    $stmt->execute(['payload' => $json]);
    $ts = (int) $pdo->query('SELECT UNIX_TIMESTAMP(updated_at) FROM app_state WHERE id = 1')->fetchColumn();
    echo json_encode(['ok' => true, 'updatedAt' => $ts, 'csrf' => chevalier_csrf_token()], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
