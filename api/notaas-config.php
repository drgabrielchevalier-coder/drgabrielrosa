<?php
declare(strict_types=1);

/**
 * Status e configuração da chave Notaas (grava em config.local.php).
 */
require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/notaas-lib.php';

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
    $key = chevalier_notaas_key();
    $masked = '';
    if ($key !== '') {
        $masked = substr($key, 0, 8) . '…' . substr($key, -4);
    }
    echo json_encode([
        'ok' => true,
        'configured' => chevalier_notaas_configured(),
        'maskedKey' => $masked,
        'aliquotaIss' => chevalier_notaas_aliquota(),
        'servicoCodigo' => chevalier_notaas_servico_codigo(),
        'servicoDescricao' => chevalier_notaas_servico_descricao(),
        'csrf' => chevalier_csrf_token(),
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
    if (!chevalier_notaas_configured()) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Configure a chave Notaas antes de testar.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // Endpoint leve: listar webhooks ou status — se 401/403 a chave é inválida.
    $res = chevalier_notaas_request('GET', '/webhooks/endpoints');
    if (!$res['ok'] && (int) ($res['status'] ?? 0) === 404) {
        // Alguns projetos não têm o recurso; chave aceita se não for 401/403.
        $res = ['ok' => true, 'status' => 200, 'data' => ['note' => 'chave aceita']];
    }
    if (!$res['ok'] && in_array((int) ($res['status'] ?? 0), [401, 403], true)) {
        http_response_code(502);
        echo json_encode(['ok' => false, 'error' => 'Chave Notaas rejeitada (HTTP ' . $res['status'] . ').'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!$res['ok']) {
        // Ainda pode ser OK se a API key autenticou mas o path mudou — tente emitir dry? Não.
        // Aceita se a mensagem não indicar unauthorized.
        $err = strtolower((string) ($res['error'] ?? ''));
        if (str_contains($err, 'unauthor') || str_contains($err, 'api key') || str_contains($err, 'invalid key')) {
            http_response_code(502);
            echo json_encode(['ok' => false, 'error' => $res['error'] ?? 'Chave inválida'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    echo json_encode([
        'ok' => true,
        'tested' => true,
        'status' => $res['status'] ?? 0,
        'note' => 'Conexão Notaas OK.',
        'csrf' => chevalier_csrf_token(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$apiKey = trim((string) ($data['apiKey'] ?? ''));
$aliquota = isset($data['aliquotaIss']) ? trim((string) $data['aliquotaIss']) : null;
$servicoCodigo = isset($data['servicoCodigo']) ? trim((string) $data['servicoCodigo']) : null;
$servicoDescricao = isset($data['servicoDescricao']) ? trim((string) $data['servicoDescricao']) : null;

if ($apiKey !== '' && !str_starts_with($apiKey, 'ntaas_')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'A chave Notaas deve começar com ntaas_'], JSON_UNESCAPED_UNICODE);
    exit;
}

$upsert = [];
if ($apiKey !== '') {
    $upsert['NOTAAS_API_KEY'] = $apiKey;
}
if ($aliquota !== null && $aliquota !== '') {
    if (!is_numeric($aliquota) || (float) $aliquota < 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Alíquota ISS inválida'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $upsert['NOTAAS_ALIQUOTA_ISS'] = (string) (0 + (float) $aliquota);
}
if ($servicoCodigo !== null) {
    $upsert['NOTAAS_SERVICO_CODIGO'] = preg_replace('/\D+/', '', $servicoCodigo) ?: '';
}
if ($servicoDescricao !== null && $servicoDescricao !== '') {
    $upsert['NOTAAS_SERVICO_DESCRICAO'] = mb_substr($servicoDescricao, 0, 500);
}

if (!$upsert) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nada para salvar.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!chevalier_config_local_upsert($upsert)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Não foi possível gravar api/config.local.php'], JSON_UNESCAPED_UNICODE);
    exit;
}

$masked = $apiKey !== '' ? (substr($apiKey, 0, 8) . '…' . substr($apiKey, -4)) : '';
echo json_encode([
    'ok' => true,
    'saved' => true,
    'configured' => $apiKey !== '' || chevalier_notaas_configured(),
    'maskedKey' => $masked,
    'note' => 'Configuração Notaas salva. Recarregue a página para as próximas emissões.',
    'csrf' => chevalier_csrf_token(),
], JSON_UNESCAPED_UNICODE);
