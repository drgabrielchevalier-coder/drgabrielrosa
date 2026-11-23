<?php
declare(strict_types=1);

/**
 * POST autenticado: lê um DANFE (PDF da NF-e) e devolve os itens no mesmo
 * formato do parser de XML (assets/js/nfe-stock.js → parseNfeXml).
 *
 * O navegador extrai o texto do PDF (pdf.js) e, se o PDF for escaneado,
 * manda as páginas como imagem. Aqui só chamamos a OpenAI e normalizamos.
 *
 * Body JSON: { text?: string, images?: string[] (data:image/jpeg;base64,...), fileName?: string, csrf }
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/openai-lib.php';
require_once __DIR__ . '/nfe-pdf-lib.php';

chevalier_auth_boot();
chevalier_security_headers();
chevalier_auth_require_api();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

chevalier_csrf_require();

function nfe_pdf_fail(int $status, string $error, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $error, 'csrf' => chevalier_csrf_token()] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!chevalier_openai_configured()) {
    nfe_pdf_fail(400, 'Para ler PDF, configure a chave OpenAI em Configurações → OpenAI. O XML funciona sem ela.', ['needsOpenAI' => true]);
}

$raw = chevalier_request_body();
if (strlen($raw) > 12_000_000) {
    nfe_pdf_fail(413, 'PDF grande demais. Envie o XML da NF-e ou um PDF com menos páginas.');
}
$body = json_decode($raw ?: 'null', true);
if (!is_array($body)) {
    nfe_pdf_fail(400, 'JSON inválido');
}

$text = trim((string) ($body['text'] ?? ''));
if (mb_strlen($text) > 120000) {
    $text = mb_substr($text, 0, 120000);
}
$images = [];
foreach (array_slice(is_array($body['images'] ?? null) ? $body['images'] : [], 0, 4) as $img) {
    $img = (string) $img;
    if (preg_match('#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$#', $img) && strlen($img) <= 4_000_000) {
        $images[] = $img;
    }
}
if ($text === '' && !$images) {
    nfe_pdf_fail(400, 'Não consegui ler o conteúdo do PDF.');
}

$instructions = 'Você extrai dados de DANFE (documento auxiliar da NF-e brasileira). '
    . 'Responda SOMENTE um JSON com o formato: '
    . '{"meta":{"key":"44 dígitos da chave de acesso, só números","number":"número da NF","series":"série",'
    . '"date":"data de emissão AAAA-MM-DD","supplier":"razão social do emitente","supplierCnpj":"só números",'
    . '"total":valor total da nota em número},'
    . '"items":[{"name":"descrição do produto","sku":"código do produto","ncm":"NCM","unit":"unidade comercial",'
    . '"qty":quantidade em número,"unitCost":valor unitário em número,"total":valor total do item em número,'
    . '"barcode":"EAN/GTIN se aparecer, senão vazio"}]}. '
    . 'Números com ponto decimal (1.234,56 vira 1234.56). Inclua todos os itens da tabela de produtos, '
    . 'na ordem, sem inventar. Se um campo não aparecer, use "" ou 0.';

$userContent = [];
if ($text !== '') {
    $userContent[] = ['type' => 'text', 'text' => "Texto extraído do DANFE:\n\n" . $text];
}
foreach ($images as $img) {
    $userContent[] = ['type' => 'image_url', 'image_url' => ['url' => $img, 'detail' => 'high']];
}
if (!$text) {
    $userContent[] = ['type' => 'text', 'text' => 'O DANFE veio como imagem (PDF escaneado). Leia as páginas acima.'];
}

$chat = chevalier_openai_chat([
    ['role' => 'system', 'content' => $instructions],
    ['role' => 'user', 'content' => $userContent],
], [
    'json' => true,
    'temperature' => 0,
    'max_tokens' => 6000,
    'timeout' => 120,
    'model' => $images ? chevalier_openai_vision_model() : chevalier_openai_chat_model(),
]);

if (!$chat['ok'] || !is_array($chat['data']['parsed'] ?? null)) {
    nfe_pdf_fail(502, 'Falha ao ler o PDF com a IA: ' . ($chat['error'] ?? 'resposta inválida'));
}

$parsed = $chat['data']['parsed'];

$norm = chevalier_nfe_pdf_normalize($parsed);
$meta = $norm['meta'];
$items = $norm['items'];

if (!$items) {
    nfe_pdf_fail(422, 'Não encontrei itens de produto nesse PDF. Confira se é o DANFE da NF-e ou use o XML.');
}

echo json_encode([
    'ok' => true,
    'meta' => $meta,
    'items' => $items,
    'mode' => $images ? 'vision' : 'text',
    'model' => $chat['data']['model'] ?? null,
    'csrf' => chevalier_csrf_token(),
], JSON_UNESCAPED_UNICODE);
