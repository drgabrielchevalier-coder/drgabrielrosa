<?php
declare(strict_types=1);

/**
 * Emissão / consulta de NFS-e via Notaas.
 *
 * POST { action: "emit"|"status", ... }
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

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
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

if (!chevalier_notaas_configured()) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Configure a chave Notaas em Configurações.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = (string) ($data['action'] ?? 'emit');

if ($action === 'status') {
    $invoiceId = trim((string) ($data['invoiceId'] ?? ''));
    if ($invoiceId === '' || !preg_match('/^[a-zA-Z0-9_-]+$/', $invoiceId)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invoiceId inválido'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $res = chevalier_notaas_request('GET', '/invoices/' . rawurlencode($invoiceId) . '/status');
    if (!$res['ok']) {
        http_response_code(502);
        echo json_encode([
            'ok' => false,
            'error' => $res['error'] ?? 'Falha ao consultar status',
            'csrf' => chevalier_csrf_token(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $payload = is_array($res['data'] ?? null) ? $res['data'] : [];
    echo json_encode([
        'ok' => true,
        'invoiceId' => $invoiceId,
        'status' => (string) ($payload['status'] ?? ''),
        'chNFSe' => $payload['chNFSe'] ?? null,
        'nNFSe' => $payload['nNFSe'] ?? ($payload['numeroNfe'] ?? null),
        'issuedAt' => $payload['issuedAt'] ?? ($payload['emittedAt'] ?? null),
        'errorCode' => $payload['errorCode'] ?? null,
        'errorMessage' => $payload['errorMessage'] ?? null,
        'raw' => $payload,
        'csrf' => chevalier_csrf_token(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action !== 'emit') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ação inválida'], JSON_UNESCAPED_UNICODE);
    exit;
}

$tomadorNome = trim((string) ($data['tomadorNome'] ?? ''));
$tomadorDoc = preg_replace('/\D+/', '', (string) ($data['tomadorDoc'] ?? '')) ?: '';
$tomadorEmail = trim((string) ($data['tomadorEmail'] ?? ''));
$descricao = trim((string) ($data['descricao'] ?? ''));
$codigo = preg_replace('/\D+/', '', (string) ($data['codigo'] ?? '')) ?: chevalier_notaas_servico_codigo();
$total = isset($data['total']) ? (float) $data['total'] : 0.0;
$aliquota = isset($data['aliquotaIss']) ? (float) $data['aliquotaIss'] : chevalier_notaas_aliquota();
$referencia = trim((string) ($data['referencia'] ?? ''));
$patientId = trim((string) ($data['patientId'] ?? ''));

if ($descricao === '') {
    $descricao = chevalier_notaas_servico_descricao();
}
if ($total <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Informe um valor total maior que zero.'], JSON_UNESCAPED_UNICODE);
    exit;
}
if ($aliquota < 0 || $aliquota > 100) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Alíquota ISS inválida.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$body = [
    'servico' => [
        'descricao' => mb_substr($descricao, 0, 2000),
    ],
    'valores' => [
        'total' => round($total, 2),
        'aliquotaIss' => $aliquota,
    ],
];
if ($codigo !== '') {
    $body['servico']['codigo'] = $codigo;
}
if ($referencia !== '') {
    $body['referencia'] = mb_substr($referencia, 0, 60);
} elseif ($patientId !== '') {
    $body['referencia'] = 'chevalier-' . mb_substr($patientId, 0, 40);
}

$docLen = strlen($tomadorDoc);
if ($tomadorNome !== '' || $docLen > 0) {
    if ($tomadorNome === '' || ($docLen !== 11 && $docLen !== 14)) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Tomador identificado exige nome + CPF (11) ou CNPJ (14 dígitos). Deixe ambos vazios para consumidor final, se o município permitir.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $tomador = ['nome' => mb_substr($tomadorNome, 0, 300)];
    if ($docLen === 11) {
        $tomador['cpf'] = $tomadorDoc;
    } else {
        $tomador['cnpj'] = $tomadorDoc;
    }
    if ($tomadorEmail !== '' && filter_var($tomadorEmail, FILTER_VALIDATE_EMAIL)) {
        $tomador['email'] = $tomadorEmail;
    }
    $body['tomador'] = $tomador;
}

$res = chevalier_notaas_request('POST', '/emitir', $body);
if (!$res['ok']) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => $res['error'] ?? 'Falha ao emitir NFS-e',
        'details' => $res['data'] ?? null,
        'csrf' => chevalier_csrf_token(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$payload = is_array($res['data'] ?? null) ? $res['data'] : [];
echo json_encode([
    'ok' => true,
    'queued' => (bool) ($payload['queued'] ?? true),
    'invoiceId' => (string) ($payload['invoiceId'] ?? ''),
    'status' => (string) ($payload['status'] ?? 'queued'),
    'pollUrl' => $payload['pollUrl'] ?? null,
    'referencia' => $payload['referencia'] ?? ($body['referencia'] ?? null),
    'csrf' => chevalier_csrf_token(),
], JSON_UNESCAPED_UNICODE);
