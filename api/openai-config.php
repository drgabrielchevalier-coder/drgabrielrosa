<?php
declare(strict_types=1);

/**
 * Status e configuração da chave OpenAI (grava em config.local.php).
 */
require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/openai-lib.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

chevalier_auth_boot();
chevalier_security_headers();
if (!chevalier_auth_logged_in()) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'needsAuth' => true, 'error' => 'Faça login.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $key = chevalier_openai_key();
    $masked = '';
    if ($key !== '') {
        $masked = substr($key, 0, 7) . '…' . substr($key, -4);
    }
    echo json_encode([
        'ok' => true,
        'configured' => chevalier_openai_configured(),
        'maskedKey' => $masked,
        'chatModel' => chevalier_openai_chat_model(),
        'visionModel' => chevalier_openai_vision_model(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

chevalier_csrf_require();
$raw = chevalier_request_body();
$data = json_decode($raw ?: 'null', true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = (string) ($data['action'] ?? 'save');
if ($action === 'test') {
    if (!chevalier_openai_configured()) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Configure a chave OpenAI antes de testar.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $res = chevalier_openai_chat([
        ['role' => 'user', 'content' => 'Responda apenas JSON {"pong":true,"model":"ok"}'],
    ], ['json' => true, 'max_tokens' => 40, 'temperature' => 0]);
    if (!$res['ok']) {
        http_response_code(502);
        echo json_encode(['ok' => false, 'error' => $res['error'] ?? 'Falha no teste'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode([
        'ok' => true,
        'tested' => true,
        'model' => $res['data']['model'] ?? null,
        'parsed' => $res['data']['parsed'] ?? null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$apiKey = trim((string) ($data['apiKey'] ?? ''));
$chatModel = trim((string) ($data['chatModel'] ?? ''));
$visionModel = trim((string) ($data['visionModel'] ?? ''));

if ($apiKey !== '' && !str_starts_with($apiKey, 'sk-')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'A chave OpenAI deve começar com sk-'], JSON_UNESCAPED_UNICODE);
    exit;
}

$localPath = __DIR__ . '/config.local.php';
$existing = is_file($localPath) ? (string) file_get_contents($localPath) : "<?php\ndeclare(strict_types=1);\n\n";

// Preserve non-OpenAI defines by rewriting only OpenAI lines
$lines = preg_split("/\r\n|\n|\r/", $existing) ?: [];
$out = [];
$seenKey = false;
$seenChat = false;
$seenVision = false;
foreach ($lines as $line) {
    if (preg_match("/define\s*\(\s*['\"]OPENAI_API_KEY['\"]/", $line)) {
        if ($apiKey !== '') {
            $out[] = "define('OPENAI_API_KEY', " . var_export($apiKey, true) . ');';
            $seenKey = true;
        }
        // empty apiKey = keep existing line
        elseif (trim($line) !== '') {
            $out[] = $line;
            $seenKey = true;
        }
        continue;
    }
    if (preg_match("/define\s*\(\s*['\"]OPENAI_CHAT_MODEL['\"]/", $line)) {
        if ($chatModel !== '') {
            $out[] = "define('OPENAI_CHAT_MODEL', " . var_export($chatModel, true) . ');';
            $seenChat = true;
        } else {
            $out[] = $line;
            $seenChat = true;
        }
        continue;
    }
    if (preg_match("/define\s*\(\s*['\"]OPENAI_VISION_MODEL['\"]/", $line)) {
        if ($visionModel !== '') {
            $out[] = "define('OPENAI_VISION_MODEL', " . var_export($visionModel, true) . ');';
            $seenVision = true;
        } else {
            $out[] = $line;
            $seenVision = true;
        }
        continue;
    }
    $out[] = $line;
}

if ($apiKey !== '' && !$seenKey) {
    $out[] = "define('OPENAI_API_KEY', " . var_export($apiKey, true) . ');';
}
if ($chatModel !== '' && !$seenChat) {
    $out[] = "define('OPENAI_CHAT_MODEL', " . var_export($chatModel, true) . ');';
}
if ($visionModel !== '' && !$seenVision) {
    $out[] = "define('OPENAI_VISION_MODEL', " . var_export($visionModel, true) . ');';
}

$content = implode("\n", $out);
if (!str_ends_with($content, "\n")) {
    $content .= "\n";
}

if (file_put_contents($localPath, $content) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Não foi possível gravar api/config.local.php'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Reload constants for this request is hard (already defined). Report based on file.
$masked = $apiKey !== '' ? (substr($apiKey, 0, 7) . '…' . substr($apiKey, -4)) : '';
echo json_encode([
    'ok' => true,
    'saved' => true,
    'configured' => $apiKey !== '' || chevalier_openai_configured(),
    'maskedKey' => $masked,
    'note' => 'Chave salva. Recarregue a página para as próximas chamadas usarem a nova chave.',
], JSON_UNESCAPED_UNICODE);
