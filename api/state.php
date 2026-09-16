<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/db.php';

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
    $row = $pdo->query('SELECT payload FROM app_state WHERE id = 1')->fetch();
    echo json_encode([
        'ok' => true,
        'state' => $row ? json_decode($row['payload'], true) : null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: 'null', true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'JSON invalido'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare('INSERT INTO app_state (id, payload) VALUES (1, :payload)
        ON DUPLICATE KEY UPDATE payload = VALUES(payload)');
    $stmt->execute(['payload' => json_encode($data, JSON_UNESCAPED_UNICODE)]);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Metodo nao permitido'], JSON_UNESCAPED_UNICODE);
