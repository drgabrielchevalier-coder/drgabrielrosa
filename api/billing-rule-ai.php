<?php
declare(strict_types=1);

/**
 * Interpreta regra de cobrança de clínica via OpenAI (sem resposta pronta).
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

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
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

$text = trim((string) ($data['text'] ?? $data['rule'] ?? ''));
$clinicName = trim((string) ($data['clinicName'] ?? ''));
if ($text === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Descreva a regra de cobrança.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!chevalier_openai_configured()) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'needsOpenAI' => true,
        'error' => 'Configure sua chave OpenAI em Configurações para interpretar regras com IA.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$clinic = $clinicName !== '' ? $clinicName : 'a clínica';
$prompt = "Você configura o algoritmo de cobrança de um cirurgião-dentista em prestação de serviço. "
    . "Clínica: {$clinic}. Regra descrita pelo usuário:\n\"\"\"{$text}\"\"\"\n"
    . "Responda SOMENTE JSON com: shareMode (procedure|percent|fixed), professionalPercent (0-100), "
    . "fixedAmount (number), cardFeeEnabled (bool), cardFeePercent (0-100), cardFeeOn (share|practiced), "
    . "materialsPaidBy (doctor|clinic), reimburseComponents (bool), reimburseMaterials (bool), reimburseLab (bool), "
    . "notes (string curta), aiSummary (string curta em português), examplePracticed (number), exampleComponents (number). "
    . "Exemplo: implante 3000, 50% profissional, 10% cartão na parte do profissional, reembolso de componentes "
    . "→ shareMode=percent, professionalPercent=50, cardFeeEnabled=true, cardFeePercent=10, cardFeeOn=share, "
    . "reimburseComponents=true, materialsPaidBy=clinic.";

$res = chevalier_openai_chat([
    ['role' => 'system', 'content' => 'Extraia regras financeiras odontológicas em JSON. Português do Brasil. Interprete o texto do usuário — sem resposta genérica.'],
    ['role' => 'user', 'content' => $prompt],
], ['json' => true, 'max_tokens' => 800, 'temperature' => 0.2, 'timeout' => 60]);

if (!$res['ok']) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => $res['error'] ?? 'Falha OpenAI'], JSON_UNESCAPED_UNICODE);
    exit;
}

$billing = $res['data']['parsed'] ?? null;
if (!is_array($billing)) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'OpenAI não retornou JSON válido'], JSON_UNESCAPED_UNICODE);
    exit;
}
$billing['notes'] = $billing['notes'] ?? $text;
$billing['version'] = 1;

echo json_encode([
    'ok' => true,
    'mode' => 'openai',
    'provider' => 'OpenAI',
    'model' => $res['data']['model'] ?? null,
    'billing' => $billing,
    'clinicName' => $clinicName !== '' ? $clinicName : null,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
