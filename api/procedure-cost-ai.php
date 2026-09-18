<?php
declare(strict_types=1);

/**
 * IA de custos — UMA chamada unificada:
 * - normaliza embalagem (g / ml / un)
 * - sugere consumo fracionado no procedimento
 * - estima custo/preço
 * Sem modos redundantes (materials / fraction / analyze separados).
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

if (!chevalier_openai_configured()) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'needsOpenAI' => true,
        'error' => 'Configure sua chave OpenAI em Configurações para recalcular a ficha.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$name = trim((string) ($data['name'] ?? ''));
$specialty = trim((string) ($data['specialty'] ?? ''));
$kind = trim((string) ($data['kind'] ?? 'clinico'));
$currentItems = is_array($data['items'] ?? null) ? $data['items'] : [];
$materials = is_array($data['materials'] ?? null) ? $data['materials'] : [];
$price = (float) ($data['price'] ?? 0);
$extra = (float) ($data['extra'] ?? 0);

if ($name === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Informe o nome do procedimento.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Catálogo enxuto (menos tokens = menos delay / falha)
$catalog = [];
foreach (array_slice($materials, 0, 60) as $m) {
    if (!is_array($m)) {
        continue;
    }
    $id = (string) ($m['id'] ?? '');
    if ($id === '') {
        continue;
    }
    $catalog[] = [
        'id' => $id,
        'name' => (string) ($m['name'] ?? ''),
        'brand' => (string) ($m['brand'] ?? ''),
        'type' => (string) ($m['type'] ?? ''),
        'pack' => (string) ($m['pack'] ?? ''),
        'packContent' => (float) ($m['packContent'] ?? 0),
        'packUnit' => (string) ($m['packUnit'] ?? ''),
        'price' => (float) ($m['price'] ?? 0),
        'unitCost' => (float) ($m['unitCost'] ?? 0),
    ];
}

$itemsBrief = [];
foreach ($currentItems as $it) {
    if (!is_array($it)) {
        continue;
    }
    $itemsBrief[] = [
        'materialId' => (string) ($it['materialId'] ?? ''),
        'qty' => (float) ($it['qty'] ?? 0),
    ];
}

$system = <<<'SYS'
Você é especialista em custos odontológicos clínicos no Brasil.
Objetivo: precificar o PROCEDIMENTO com consumo FRACIONADO — nunca cobrir a embalagem inteira quando o uso é parcial.

Regras obrigatórias:
1) packContent + packUnit descrevem a embalagem comercial (ex.: cimento resinoso RelyX U200 ≈ 8.5 g; ácido 37% seringa ≈ 2.5 ml; microbrush caixa = 100 un; anestésico = 50 tubetes; luva = 50 pares).
2) qty = quantidade USADA no procedimento na MESMA unidade (ex.: cimentação de coroa unitária usa ~0.2–0.4 g de cimento, NÃO 1 kit).
3) unitCost implícito = price / packContent. Custo da linha = unitCost × qty.
4) Para "1 kit" sem gramas/ml explícitos, INFIRA o conteúdo típico do produto (g ou ml) e preencha pack + packContent + packUnit.
5) Rendimento estimado = packContent / qty (quantos procedimentos a embalagem cobre).
6) Use APENAS materialId do catálogo. Não invente ids.
7) Responda SOMENTE JSON válido em português.
SYS;

$user = "Procedimento: {$name}\nEspecialidade: {$specialty}\nTipo: {$kind}\n"
    . "Preço base atual: {$price}\nLab/extra atual: {$extra}\n"
    . "Itens atuais da ficha: " . json_encode($itemsBrief, JSON_UNESCAPED_UNICODE) . "\n"
    . "Catálogo (use estes ids):\n" . json_encode($catalog, JSON_UNESCAPED_UNICODE) . "\n\n"
    . "Faça em um único JSON:\n"
    . "{\n"
    . "  \"materials\": [{\"id\":\"...\",\"pack\":\"8.5 g\",\"packContent\":8.5,\"packUnit\":\"g\",\"rationale\":\"...\"}],\n"
    . "  \"items\": [{\"materialId\":\"...\",\"qty\":0.3,\"useUnit\":\"g\",\"rationale\":\"uso típico em cimentação unitária\",\"yield\":28}],\n"
    . "  \"extra\": number,\n"
    . "  \"suggestedPrice\": number,\n"
    . "  \"estimatedCost\": number,\n"
    . "  \"marginPct\": number,\n"
    . "  \"analysis\": \"texto curto explicando o fracionamento\",\n"
    . "  \"findings\": [\"...\"],\n"
    . "  \"packNotes\": [\"Cimento: 8.5 g na embalagem, ~0.3 g por coroa → ~28 cimentações\"]\n"
    . "}\n"
    . "Exemplo mental: se cimento custa R\$265 e tem 8.5 g, unitário ≈ R\$31,18/g; uso 0.3 g → custo ≈ R\$9,35 (não R\$265).";

$res = chevalier_openai_chat([
    ['role' => 'system', 'content' => $system],
    ['role' => 'user', 'content' => $user],
], [
    'json' => true,
    'temperature' => 0.15,
    'max_tokens' => 1800,
    'timeout' => 55,
]);

if (!$res['ok']) {
    $err = (string) ($res['error'] ?? 'Falha OpenAI');
    // Mensagens mais claras para rate limit / billing
    if (stripos($err, '429') !== false || stripos($err, 'rate') !== false) {
        $err = 'OpenAI sobrecarregada ou limite atingido. Aguarde alguns segundos e tente de novo. ' . $err;
    } elseif (stripos($err, 'insufficient_quota') !== false || stripos($err, 'billing') !== false) {
        $err = 'Saldo/assinatura OpenAI insuficiente. Verifique billing em platform.openai.com. ' . $err;
    } elseif (stripos($err, 'timeout') !== false || stripos($err, 'timed out') !== false) {
        $err = 'A OpenAI demorou demais (timeout). Tente novamente com a ficha aberta. ' . $err;
    }
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => $err], JSON_UNESCAPED_UNICODE);
    exit;
}

$parsed = $res['data']['parsed'] ?? [];
if (!is_array($parsed)) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'OpenAI não retornou JSON válido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$idSet = [];
foreach ($catalog as $c) {
    $idSet[$c['id']] = true;
}

$materialsOut = [];
foreach ((array) ($parsed['materials'] ?? []) as $m) {
    if (!is_array($m)) {
        continue;
    }
    $id = (string) ($m['id'] ?? '');
    if ($id === '' || !isset($idSet[$id])) {
        continue;
    }
    $content = (float) ($m['packContent'] ?? 0);
    $unit = strtolower(trim((string) ($m['packUnit'] ?? 'un')));
    if ($content <= 0) {
        continue;
    }
    $pack = trim((string) ($m['pack'] ?? ''));
    if ($pack === '') {
        $pack = rtrim(rtrim(number_format($content, 2, '.', ''), '0'), '.') . ' ' . $unit;
    }
    $materialsOut[] = [
        'id' => $id,
        'pack' => $pack,
        'packContent' => $content,
        'packUnit' => $unit,
        'rationale' => (string) ($m['rationale'] ?? ''),
    ];
}

$itemsOut = [];
foreach ((array) ($parsed['items'] ?? []) as $it) {
    if (!is_array($it)) {
        continue;
    }
    $mid = (string) ($it['materialId'] ?? '');
    $qty = (float) ($it['qty'] ?? 0);
    if ($mid === '' || $qty <= 0 || !isset($idSet[$mid])) {
        continue;
    }
    $itemsOut[] = [
        'materialId' => $mid,
        'qty' => round($qty, 4),
        'useUnit' => (string) ($it['useUnit'] ?? ''),
        'yield' => isset($it['yield']) ? (float) $it['yield'] : null,
        'rationale' => (string) ($it['rationale'] ?? ''),
    ];
}

echo json_encode([
    'ok' => true,
    'mode' => 'openai',
    'provider' => 'OpenAI',
    'model' => $res['data']['model'] ?? null,
    'materials' => $materialsOut,
    'items' => $itemsOut,
    'extra' => isset($parsed['extra']) ? (float) $parsed['extra'] : null,
    'suggestedPrice' => isset($parsed['suggestedPrice']) ? (float) $parsed['suggestedPrice'] : null,
    'estimatedCost' => isset($parsed['estimatedCost']) ? (float) $parsed['estimatedCost'] : null,
    'marginPct' => isset($parsed['marginPct']) ? (float) $parsed['marginPct'] : null,
    'analysis' => (string) ($parsed['analysis'] ?? ''),
    'findings' => array_values((array) ($parsed['findings'] ?? [])),
    'packNotes' => array_values((array) ($parsed['packNotes'] ?? [])),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
