<?php
declare(strict_types=1);

/**
 * POST autenticado: zera dados operacionais no app_state.
 * Preserva clínicas, procedimentos e materiais (estoque = 0).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/historico-lib.php';
require_once __DIR__ . '/ops-wipe-lib.php';

chevalier_auth_boot();
chevalier_security_headers();
chevalier_auth_require_api();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

chevalier_csrf_require();

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

$row = $pdo->query('SELECT payload FROM app_state WHERE id = 1')->fetch();
$existing = $row ? json_decode((string) ($row['payload'] ?? ''), true) : null;
if (!is_array($existing)) {
    $existing = [
        'clinics' => [],
        'materials' => [],
        'procedures' => [],
        'schemaVersion' => 5,
    ];
}

$beforePatients = isset($existing['patients']) && is_array($existing['patients'])
    ? count($existing['patients']) : 0;
$beforeMaterials = isset($existing['materials']) && is_array($existing['materials'])
    ? count($existing['materials']) : 0;

$wiped = chevalier_wipe_operational_state($existing);

$json = json_encode($wiped, JSON_UNESCAPED_UNICODE);
if ($json === false || strlen($json) > 8_000_000) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'Estado grande demais para gravar.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO app_state (id, payload) VALUES (1, :payload)
    ON DUPLICATE KEY UPDATE payload = VALUES(payload)');
$stmt->execute(['payload' => $json]);
$ts = (int) $pdo->query('SELECT UNIX_TIMESTAMP(updated_at) FROM app_state WHERE id = 1')->fetchColumn();

echo json_encode([
    'ok' => true,
    'state' => $wiped,
    'updatedAt' => $ts,
    'clearedPatients' => $beforePatients,
    'materialsKept' => $beforeMaterials,
    'opsWipeVersion' => chevalier_ops_wipe_version(),
    'csrf' => chevalier_csrf_token(),
], JSON_UNESCAPED_UNICODE);
