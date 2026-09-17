<?php
declare(strict_types=1);

require_once __DIR__ . '/auth-lib.php';
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

chevalier_auth_boot();
chevalier_security_headers();
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
        'origin' => 'https://www.dentalcremer.com.br',
        'shcode' => 'SH-743969',
        'engine' => 'minhadental',
    ],
    'spirit' => [
        'id' => 'spirit',
        'name' => 'Dental Speed',
        'search' => 'https://www.dentalspeed.com/busca?busca=',
        'origin' => 'https://www.dentalspeed.com',
        'shcode' => 'SH-176187',
        'engine' => 'minhadental',
        'note' => 'Referência para “Dental Spirit” / lojas odontológicas digitais.',
    ],
    'surya' => [
        'id' => 'surya',
        'name' => 'Surya Dental',
        'search' => 'https://www.suryadental.com.br/catalogsearch/result/?q=',
        'origin' => 'https://www.suryadental.com.br',
        'engine' => 'surya_graphql',
    ],
];

function chevalier_browser_ua(): string
{
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
}

function chevalier_http_request(string $url, array $opts = []): array
{
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'status' => 0, 'body' => '', 'error' => 'cURL indisponível no servidor.'];
    }
    $method = strtoupper((string) ($opts['method'] ?? 'GET'));
    $headerMap = [
        'accept' => 'Accept: application/json, text/plain, */*',
        'user-agent' => 'User-Agent: ' . chevalier_browser_ua(),
    ];
    foreach (($opts['headers'] ?? []) as $header) {
        if (!is_string($header) || !str_contains($header, ':')) {
            continue;
        }
        [$name, $value] = explode(':', $header, 2);
        $headerMap[strtolower(trim($name))] = trim($name) . ': ' . ltrim($value);
    }
    $headers = array_values($headerMap);
    $ch = curl_init($url);
    $curlOpts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 4,
        CURLOPT_TIMEOUT => 14,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => chevalier_browser_ua(),
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($method === 'POST') {
        $curlOpts[CURLOPT_POST] = true;
        $curlOpts[CURLOPT_POSTFIELDS] = $opts['body'] ?? '';
    } elseif ($method !== 'GET') {
        $curlOpts[CURLOPT_CUSTOMREQUEST] = $method;
        if (array_key_exists('body', $opts)) {
            $curlOpts[CURLOPT_POSTFIELDS] = $opts['body'];
        }
    }
    curl_setopt_array($ch, $curlOpts);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false) {
        return ['ok' => false, 'status' => $status, 'body' => '', 'error' => $err ?: 'Falha de rede'];
    }
    return ['ok' => $status >= 200 && $status < 400, 'status' => $status, 'body' => (string) $body, 'error' => $err];
}

function chevalier_abs_url(string $link, string $origin): string
{
    $link = trim($link);
    if ($link === '') {
        return $origin;
    }
    if (str_starts_with($link, '//')) {
        return 'https:' . $link;
    }
    if (preg_match('#^https?://#i', $link)) {
        return $link;
    }
    return rtrim($origin, '/') . '/' . ltrim($link, '/');
}

function chevalier_norm(string $s): string
{
    $s = trim($s);
    if (function_exists('mb_strtolower')) {
        $s = mb_strtolower($s, 'UTF-8');
    } else {
        $s = strtolower($s);
    }
    $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
    return $s;
}

function chevalier_strlen(string $s): int
{
    return function_exists('mb_strlen') ? (int) mb_strlen($s, 'UTF-8') : strlen($s);
}

function chevalier_tokens(string $s): array
{
    $s = chevalier_norm($s);
    $parts = preg_split('/[^a-z0-9à-ü.]+/u', $s) ?: [];
    $out = [];
    foreach ($parts as $p) {
        $p = trim($p);
        if (chevalier_strlen($p) >= 2) {
            $out[] = $p;
        }
    }
    return array_values(array_unique($out));
}

/**
 * @param list<array{title:string,brand?:string,price:float,url:string}> $products
 * @return array{suggested:?float,prices:list<float>,match:?array,products:list<array>}
 */
function chevalier_rank_products(array $products, string $name, string $brand): array
{
    $nameTokens = chevalier_tokens($name);
    $brandNorm = chevalier_norm($brand);
    $primary = $nameTokens[0] ?? '';
    $scored = [];
    foreach ($products as $p) {
        $title = (string) ($p['title'] ?? '');
        $pBrand = (string) ($p['brand'] ?? '');
        $price = (float) ($p['price'] ?? 0);
        if ($price < 0.5 || $price > 200000) {
            continue;
        }
        $hay = chevalier_norm($title . ' ' . $pBrand);
        if ($primary !== '' && !str_contains($hay, $primary)) {
            continue;
        }
        $score = 0;
        $matched = 0;
        foreach ($nameTokens as $i => $tok) {
            if ($tok !== '' && str_contains($hay, $tok)) {
                $score += ($i === 0) ? 10 : 3;
                $matched++;
            }
        }
        if ($brandNorm !== '') {
            if (str_contains($hay, $brandNorm) || str_contains(chevalier_norm($pBrand), $brandNorm)) {
                $score += 12;
            } else {
                $score -= 4;
            }
        }
        if ($primary === 'implante') {
            $pos = strpos($hay, 'implante');
            if ($pos === false || $pos > 10) {
                $score -= 12;
            }
            foreach (['analogo', 'análogo', 'transfer', 'pilar', 'coping', 'cilindro', 'pinca', 'pinça'] as $acc) {
                if (str_contains($hay, $acc)) {
                    $score -= 10;
                }
            }
        }
        $need = max(1, count($nameTokens) <= 2 ? count($nameTokens) : count($nameTokens) - 1);
        if ($matched < $need || $score < 6) {
            continue;
        }
        $scored[] = [
            'score' => $score,
            'title' => $title,
            'brand' => $pBrand,
            'price' => round($price, 2),
            'url' => (string) ($p['url'] ?? ''),
        ];
    }
    usort($scored, static function ($a, $b) {
        if ($a['score'] !== $b['score']) {
            return $b['score'] <=> $a['score'];
        }
        return $a['price'] <=> $b['price'];
    });
    $top = array_slice($scored, 0, 6);
    $prices = array_values(array_unique(array_map(static fn ($x) => $x['price'], $top)));
    sort($prices);
    $match = $top[0] ?? null;
    return [
        'suggested' => $match['price'] ?? null,
        'prices' => array_slice($prices, 0, 8),
        'match' => $match,
        'products' => $top,
    ];
}

function chevalier_search_minhadental(array $sup, string $query, string $name, string $brand): array
{
    $url = 'https://busca.minhadental.com/v3/Search/GetSuggestionTerms?' . http_build_query([
        'shcode' => $sup['shcode'],
        'sizeTerms' => 3,
        'sizeProducts' => 12,
        'term' => $query,
    ]);
    $fetch = chevalier_http_request($url, [
        'headers' => [
            'Origin: ' . $sup['origin'],
            'Referer: ' . $sup['origin'] . '/',
        ],
    ]);
    if (!$fetch['ok']) {
        return [
            'ok' => false,
            'status' => $fetch['status'],
            'error' => $fetch['error'] ?: ('HTTP ' . $fetch['status']),
            'suggested' => null,
            'prices' => [],
            'match' => null,
            'productUrl' => null,
        ];
    }
    $json = json_decode($fetch['body'], true);
    if (!is_array($json)) {
        return [
            'ok' => false,
            'status' => $fetch['status'],
            'error' => 'Resposta inválida da busca',
            'suggested' => null,
            'prices' => [],
            'match' => null,
            'productUrl' => null,
        ];
    }
    $products = [];
    foreach (($json['Products'] ?? []) as $row) {
        if (!is_array($row)) {
            continue;
        }
        $price = $row['FinalPrice'] ?? $row['SalePrice'] ?? $row['Price'] ?? null;
        if (!is_numeric($price)) {
            continue;
        }
        $link = (string) ($row['Link'] ?? $row['Id'] ?? '');
        $products[] = [
            'title' => (string) ($row['Title'] ?? ''),
            'brand' => (string) ($row['Brand'] ?? ''),
            'price' => (float) $price,
            'url' => chevalier_abs_url($link, $sup['origin']),
        ];
    }
    $ranked = chevalier_rank_products($products, $name, $brand);
    return [
        'ok' => true,
        'status' => $fetch['status'],
        'error' => null,
        'suggested' => $ranked['suggested'],
        'prices' => $ranked['prices'],
        'match' => $ranked['match'],
        'productUrl' => $ranked['match']['url'] ?? null,
    ];
}

function chevalier_search_surya(array $sup, string $query, string $name, string $brand): array
{
    $gql = '{ products(search: ' . json_encode($query, JSON_UNESCAPED_UNICODE) . ', pageSize: 12) { items { name sku url_key price_range { minimum_price { final_price { value } regular_price { value } } } } } }';
    // Preferir Accept mínimo no GraphQL — alguns CDNs bloqueiam Accept longo.
    $fetch = chevalier_http_request($sup['origin'] . '/graphql', [
        'method' => 'POST',
        'body' => json_encode(['query' => $gql], JSON_UNESCAPED_UNICODE),
        'headers' => [
            'Content-Type: application/json',
            'Accept: */*',
            'Origin: ' . $sup['origin'],
            'Referer: ' . $sup['origin'] . '/',
        ],
    ]);
    if (!$fetch['ok']) {
        return [
            'ok' => false,
            'status' => $fetch['status'],
            'error' => $fetch['error'] ?: ('HTTP ' . $fetch['status']),
            'suggested' => null,
            'prices' => [],
            'match' => null,
            'productUrl' => null,
        ];
    }
    $json = json_decode($fetch['body'], true);
    if (!is_array($json) || !empty($json['errors'])) {
        $msg = is_array($json['errors'][0]['message'] ?? null)
            ? 'Erro GraphQL'
            : (string) ($json['errors'][0]['message'] ?? 'Resposta inválida da Surya');
        return [
            'ok' => false,
            'status' => $fetch['status'],
            'error' => $msg,
            'suggested' => null,
            'prices' => [],
            'match' => null,
            'productUrl' => null,
        ];
    }
    $products = [];
    foreach (($json['data']['products']['items'] ?? []) as $row) {
        if (!is_array($row)) {
            continue;
        }
        $final = $row['price_range']['minimum_price']['final_price']['value'] ?? null;
        $regular = $row['price_range']['minimum_price']['regular_price']['value'] ?? null;
        $price = is_numeric($final) ? (float) $final : (is_numeric($regular) ? (float) $regular : null);
        if ($price === null) {
            continue;
        }
        $urlKey = trim((string) ($row['url_key'] ?? ''));
        $products[] = [
            'title' => (string) ($row['name'] ?? ''),
            'brand' => '',
            'price' => $price,
            'url' => $urlKey !== '' ? ($sup['origin'] . '/' . ltrim($urlKey, '/')) : $sup['origin'],
        ];
    }
    $ranked = chevalier_rank_products($products, $name, $brand);
    return [
        'ok' => true,
        'status' => $fetch['status'],
        'error' => null,
        'suggested' => $ranked['suggested'],
        'prices' => $ranked['prices'],
        'match' => $ranked['match'],
        'productUrl' => $ranked['match']['url'] ?? null,
    ];
}

function chevalier_search_supplier(array $sup, string $query, string $name, string $brand): array
{
    if (($sup['engine'] ?? '') === 'surya_graphql') {
        return chevalier_search_surya($sup, $query, $name, $brand);
    }
    return chevalier_search_minhadental($sup, $query, $name, $brand);
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

chevalier_csrf_require();
$raw = chevalier_request_body();
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
        $searchUrl = $sup['search'] . rawurlencode($query);
        $entry['links'][] = [
            'supplier' => $sup['name'],
            'supplierId' => $sid,
            'url' => $searchUrl,
        ];
        $found = chevalier_search_supplier($sup, $query, $name, $brand);
        $productUrl = $found['productUrl'] ?: $searchUrl;
        $matchTitle = is_array($found['match'] ?? null) ? (string) ($found['match']['title'] ?? '') : '';
        $entry['offers'][] = [
            'supplier' => $sup['name'],
            'supplierId' => $sid,
            'url' => $productUrl,
            'searchUrl' => $searchUrl,
            'ok' => (bool) $found['ok'],
            'status' => $found['status'],
            'error' => $found['ok'] ? null : ($found['error'] ?: ('HTTP ' . $found['status'])),
            'prices' => $found['prices'],
            'suggested' => $found['suggested'],
            'matchTitle' => $matchTitle !== '' ? $matchTitle : null,
        ];
    }
    $valid = array_values(array_filter(
        array_map(static fn ($o) => $o['suggested'], $entry['offers']),
        static fn ($v) => $v !== null
    ));
    $entry['bestPrice'] = $valid ? min($valid) : null;
    $results[] = $entry;
}

echo json_encode([
    'ok' => true,
    'checkedAt' => gmdate('c'),
    'suppliers' => array_values(array_map(static fn ($id) => $SUPPLIERS[$id], $wanted)),
    'results' => $results,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
