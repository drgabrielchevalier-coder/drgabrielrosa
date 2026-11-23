<?php
declare(strict_types=1);

/**
 * Interpreta regra de cobrança de clínica via OpenAI (sem resposta pronta).
 */
require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/openai-lib.php';
require_once __DIR__ . '/billing-rule-ai-lib.php';
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

// catálogo de procedimentos (id, nome, especialidade) para a IA separar as categorias
$catalog = [];
$validIds = [];
foreach (array_slice(is_array($data['procedures'] ?? null) ? $data['procedures'] : [], 0, 500) as $p) {
    if (!is_array($p)) {
        continue;
    }
    $id = mb_substr(trim((string) ($p['id'] ?? '')), 0, 80);
    $name = mb_substr(trim((string) ($p['name'] ?? '')), 0, 120);
    if ($id === '' || $name === '') {
        continue;
    }
    $validIds[] = $id;
    $spec = mb_substr(trim((string) ($p['specialty'] ?? '')), 0, 40);
    $catalog[] = $id . ' | ' . $name . ($spec !== '' ? ' | ' . $spec : '');
}

$clinic = $clinicName !== '' ? $clinicName : 'a clínica';
$prompt = "Você configura o algoritmo de cobrança de um cirurgião-dentista em prestação de serviço. "
    . "Clínica: {$clinic}. Regra descrita pelo usuário:\n\"\"\"{$text}\"\"\"\n\n"
    . "A regra pode ter VÁRIAS partes com cobranças diferentes por tipo de procedimento "
    . "(ex.: valor fechado para cirurgia de implante, outro para enxerto, % para endodontia, % para os demais). "
    . "Separe cada parte em uma categoria. Responda SOMENTE JSON:\n"
    . "{\"categories\":[{\"label\":\"nome curto da categoria\",\"shareMode\":\"fixed|percent|mixed\","
    . "\"fixedAmount\":número (R$ que o dentista recebe por procedimento, se fixo/misto),"
    . "\"professionalPercent\":número 0-100 (se percentual/misto),"
    . "\"procedureIds\":[ids do catálogo abaixo que pertencem a esta categoria],"
    . "\"keywords\":[palavras que identificam a categoria]}],"
    . "\"default\":{\"label\":\"Demais procedimentos\",\"shareMode\":\"percent|fixed|mixed|procedure\",\"professionalPercent\":número,\"fixedAmount\":número},"
    . "\"cardFeeEnabled\":bool,\"cardFeePercent\":0-100,\"cardFeeOn\":\"share|practiced\",\"cardFeePaidBy\":\"doctor|clinic|split\","
    . "\"materialsPaidBy\":\"doctor|clinic\",\"reimburseComponents\":bool,\"reimburseMaterials\":bool,\"reimburseLab\":bool,"
    . "\"aiSummary\":\"resumo curto em português\"}\n"
    . "Regras: \"default\" é o que vale para os procedimentos não citados (\"demais procedimentos\"); "
    . "se o texto não disser nada sobre os demais, use shareMode \"procedure\" (cada um segue a própria ficha). "
    . "Coloque cada procedimento do catálogo em no máximo uma categoria, a mais específica "
    . "(ex.: \"Coroa sobre implante\" é prótese/coroa, NÃO cirurgia de implante; \"Implante + enxerto (pacote)\" fica na cirurgia de implante, "
    . "a menos que o texto diga outra coisa). Não invente valores que não estão no texto."
    . ($catalog ? "\n\nCatálogo (id | nome | especialidade):\n" . implode("\n", $catalog) : '');

$res = chevalier_openai_chat([
    ['role' => 'system', 'content' => 'Extraia regras financeiras odontológicas em JSON, separando categorias de procedimentos. Português do Brasil. Interprete o texto do usuário — sem resposta genérica.'],
    ['role' => 'user', 'content' => $prompt],
], ['json' => true, 'max_tokens' => 4000, 'temperature' => 0.1, 'timeout' => 90]);

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
$billing = chevalier_billing_ai_normalize($billing, $validIds);
$billing['notes'] = $text;
$billing['version'] = 1;

echo json_encode([
    'ok' => true,
    'mode' => 'openai',
    'provider' => 'OpenAI',
    'model' => $res['data']['model'] ?? null,
    'billing' => $billing,
    'clinicName' => $clinicName !== '' ? $clinicName : null,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
