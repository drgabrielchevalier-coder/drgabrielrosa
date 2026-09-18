<?php
declare(strict_types=1);

/**
 * IA de custos de procedimento: materiais usados (qtd clínica), fracionamento de embalagem
 * e análise de custo unitário — sempre via OpenAI (sem resposta pronta).
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
        'error' => 'Configure sua chave OpenAI em Configurações (ou api/config.local.php) para usar a IA de custos.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$mode = (string) ($data['mode'] ?? 'analyze'); // analyze | suggest_materials | fraction_packs
$name = trim((string) ($data['name'] ?? ''));
$specialty = trim((string) ($data['specialty'] ?? ''));
$kind = trim((string) ($data['kind'] ?? 'clinico'));
$currentItems = is_array($data['items'] ?? null) ? $data['items'] : [];
$materials = is_array($data['materials'] ?? null) ? $data['materials'] : [];
$price = (float) ($data['price'] ?? 0);
$extra = (float) ($data['extra'] ?? 0);

// Limita catálogo enviado ao modelo
$catalog = [];
foreach (array_slice($materials, 0, 180) as $m) {
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
Você é um especialista em custos odontológicos (cirurgia, implante, prótese, endodontia) no Brasil.
Use conhecimento de literatura clínica e práticas de consultório para estimar CONSUMO por procedimento
(ex.: microbrush: embalagem com 100 un → uso típico 2–4 un por restauração; anestésico: tubetes por exodontia).
Regras:
1) qty = unidades CONSUMIDAS no procedimento (não a embalagem inteira).
2) Prefira materialId do catálogo fornecido. Só invente nome se não houver equivalente.
3) Considere fracionamento: custo unitário = preço_embalagem / unidades_na_embalagem.
4) Responda SOMENTE JSON válido em português.
SYS;

if ($mode === 'fraction_packs') {
    $user = "Analise estes materiais e corrija/normalize a embalagem (pack) e o número de unidades (packUnits) "
        . "com base em embalagens comerciais típicas no Brasil (ex.: '100 un', '50 tubetes', '1 kit').\n"
        . "Catálogo:\n" . json_encode($catalog, JSON_UNESCAPED_UNICODE) . "\n"
        . "Retorne JSON: {\"materials\":[{\"id\":\"...\",\"pack\":\"...\",\"packUnits\":number,\"rationale\":\"...\"}],\"notes\":\"...\"}";
} elseif ($mode === 'suggest_materials') {
    $user = "Procedimento: {$name}\nEspecialidade: {$specialty}\nTipo: {$kind}\n"
        . "Monte a ficha de consumo (materiais + qty clínicas).\n"
        . "Catálogo disponível (use estes ids):\n" . json_encode($catalog, JSON_UNESCAPED_UNICODE) . "\n"
        . "Retorne JSON: {\"items\":[{\"materialId\":\"id_do_catalogo\",\"qty\":number,\"rationale\":\"...\"}],"
        . "\"extra\":number,\"suggestedPrice\":number,\"analysis\":\"texto curto\",\"packNotes\":[\"...\"]}";
} else {
    // analyze
    $user = "Analise o custo deste procedimento odontológico.\n"
        . "Nome: {$name}\nEspecialidade: {$specialty}\nTipo: {$kind}\n"
        . "Preço base atual: {$price}\nLab/extra atual: {$extra}\n"
        . "Itens atuais: " . json_encode($itemsBrief, JSON_UNESCAPED_UNICODE) . "\n"
        . "Catálogo (para ids, packs e custos unitários já fracionados):\n"
        . json_encode($catalog, JSON_UNESCAPED_UNICODE) . "\n"
        . "Tarefas: (1) validar se a ficha de materiais está completa; (2) ajustar qty com consumo clínico realista; "
        . "(3) apontar fracionamentos (ex. microbrush 100 un); (4) estimar custo total e margem; "
        . "(5) sugerir preço mínimo se preço=0.\n"
        . "Retorne JSON: {\"items\":[{\"materialId\":\"...\",\"qty\":number,\"rationale\":\"...\"}],"
        . "\"extra\":number,\"suggestedPrice\":number,\"estimatedCost\":number,\"marginPct\":number,"
        . "\"analysis\":\"parágrafo\",\"findings\":[\"...\"],\"packNotes\":[\"...\"],\"risks\":[\"...\"]}";
}

$res = chevalier_openai_chat([
    ['role' => 'system', 'content' => $system],
    ['role' => 'user', 'content' => $user],
], [
    'json' => true,
    'temperature' => 0.25,
    'max_tokens' => 2200,
    'timeout' => 90,
]);

if (!$res['ok']) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => $res['error'] ?? 'Falha OpenAI'], JSON_UNESCAPED_UNICODE);
    exit;
}

$parsed = $res['data']['parsed'] ?? [];
if (!is_array($parsed)) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido da OpenAI'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Normaliza items para só ids existentes quando possível
$idSet = [];
foreach ($catalog as $c) {
    $idSet[$c['id']] = true;
}
$itemsOut = [];
foreach ((array) ($parsed['items'] ?? []) as $it) {
    if (!is_array($it)) {
        continue;
    }
    $mid = (string) ($it['materialId'] ?? '');
    $qty = (float) ($it['qty'] ?? 0);
    if ($mid === '' || $qty <= 0) {
        continue;
    }
    if (!isset($idSet[$mid])) {
        continue;
    }
    $itemsOut[] = [
        'materialId' => $mid,
        'qty' => round($qty, 3),
        'rationale' => (string) ($it['rationale'] ?? ''),
    ];
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
    $materialsOut[] = [
        'id' => $id,
        'pack' => (string) ($m['pack'] ?? ''),
        'packUnits' => (float) ($m['packUnits'] ?? 0),
        'rationale' => (string) ($m['rationale'] ?? ''),
    ];
}

echo json_encode([
    'ok' => true,
    'mode' => 'openai',
    'provider' => 'OpenAI',
    'model' => $res['data']['model'] ?? null,
    'requestMode' => $mode,
    'items' => $itemsOut,
    'materials' => $materialsOut,
    'extra' => isset($parsed['extra']) ? (float) $parsed['extra'] : null,
    'suggestedPrice' => isset($parsed['suggestedPrice']) ? (float) $parsed['suggestedPrice'] : null,
    'estimatedCost' => isset($parsed['estimatedCost']) ? (float) $parsed['estimatedCost'] : null,
    'marginPct' => isset($parsed['marginPct']) ? (float) $parsed['marginPct'] : null,
    'analysis' => (string) ($parsed['analysis'] ?? ''),
    'findings' => array_values((array) ($parsed['findings'] ?? [])),
    'packNotes' => array_values((array) ($parsed['packNotes'] ?? [])),
    'risks' => array_values((array) ($parsed['risks'] ?? [])),
    'notes' => (string) ($parsed['notes'] ?? ''),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
