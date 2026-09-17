<?php
declare(strict_types=1);

require_once __DIR__ . '/auth-lib.php';
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

chevalier_auth_boot();
if (!chevalier_auth_logged_in()) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'needsAuth' => true, 'error' => 'Faça login.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$SUPPLIERS = [
    'cremer' => [
        'id' => 'cremer',
        'name' => 'Dental Cremer',
        'search' => 'https://www.dentalcremer.com.br/pesquisa?t=',
    ],
    'spirit' => [
        'id' => 'spirit',
        'name' => 'Dental Speed',
        'search' => 'https://www.dentalspeed.com/busca?busca=',
        'note' => 'Referência para “Dental Spirit” / lojas odontológicas digitais.',
    ],
    'surya' => [
        'id' => 'surya',
        'name' => 'Surya Dental',
        'search' => 'https://www.suryadental.com.br/catalogsearch/result/?q=',
    ],
];

function chevalier_http_get(string $url): array
{
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'status' => 0, 'body' => '', 'error' => 'cURL indisponível no servidor.'];
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 4,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: pt-BR,pt;q=0.9,en;q=0.8',
        ],
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false) {
        return ['ok' => false, 'status' => $status, 'body' => '', 'error' => $err ?: 'Falha de rede'];
    }
    return ['ok' => $status >= 200 && $status < 400, 'status' => $status, 'body' => (string) $body, 'error' => $err];
}

function chevalier_extract_prices(string $html): array
{
    $prices = [];
    if (preg_match_all('/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/u', $html, $m)) {
        foreach ($m[1] as $raw) {
            $n = str_replace('.', '', $raw);
            $n = str_replace(',', '.', $n);
            $v = (float) $n;
            if ($v >= 1 && $v <= 50000) {
                $prices[] = round($v, 2);
            }
        }
    }
    $prices = array_values(array_unique($prices));
    sort($prices);
    return array_slice($prices, 0, 8);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    echo json_encode([
        'ok' => true,
        'suppliers' => array_values($SUPPLIERS),
        'hint' => 'Envie POST com materials[{id,name,brand,pack,price}] para sincronizar.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: 'null', true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$materials = $data['materials'] ?? [];
if (!is_array($materials) || !$materials) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Informe materials.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$wanted = $data['suppliers'] ?? ['cremer', 'spirit', 'surya'];
if (!is_array($wanted)) {
    $wanted = ['cremer', 'spirit', 'surya'];
}
$wanted = array_values(array_intersect(array_keys($SUPPLIERS), array_map('strval', $wanted)));
if (!$wanted) {
    $wanted = ['cremer', 'spirit', 'surya'];
}

$results = [];
foreach (array_slice($materials, 0, 25) as $mat) {
    if (!is_array($mat)) {
        continue;
    }
    $id = (string) ($mat['id'] ?? '');
    $name = trim((string) ($mat['name'] ?? ''));
    $brand = trim((string) ($mat['brand'] ?? ''));
    if ($id === '' || $name === '') {
        continue;
    }
    $query = trim($name . ' ' . $brand);
    $entry = [
        'id' => $id,
        'name' => $name,
        'brand' => $brand,
        'pack' => (string) ($mat['pack'] ?? ''),
        'currentPrice' => (float) ($mat['price'] ?? 0),
        'offers' => [],
        'links' => [],
    ];
    foreach ($wanted as $sid) {
        $sup = $SUPPLIERS[$sid];
        $url = $sup['search'] . rawurlencode($query);
        $entry['links'][] = [
            'supplier' => $sup['name'],
            'supplierId' => $sid,
            'url' => $url,
        ];
        $fetch = chevalier_http_get($url);
        $prices = $fetch['ok'] ? chevalier_extract_prices($fetch['body']) : [];
        $best = $prices[0] ?? null;
        $entry['offers'][] = [
            'supplier' => $sup['name'],
            'supplierId' => $sid,
            'url' => $url,
            'ok' => (bool) $fetch['ok'],
            'status' => $fetch['status'],
            'error' => $fetch['ok'] ? null : ($fetch['error'] ?: ('HTTP ' . $fetch['status'])),
            'prices' => $prices,
            'suggested' => $best,
        ];
    }
    $valid = array_values(array_filter(array_map(static fn ($o) => $o['suggested'], $entry['offers'])));
    $entry['bestPrice'] = $valid ? min($valid) : null;
    $results[] = $entry;
}

echo json_encode([
    'ok' => true,
    'checkedAt' => gmdate('c'),
    'suppliers' => array_values(array_map(static fn ($id) => $SUPPLIERS[$id], $wanted)),
    'results' => $results,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
