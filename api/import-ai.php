<?php
declare(strict_types=1);

/**
 * POST autenticado: a IA lê um documento (folha de honorários, relatório de custos…) e devolve
 * a tabela para a importação assistida, com tipo, clínica e mapeamento sugeridos.
 * O usuário ainda confere o mapeamento, revisa as linhas e confirma no assistente.
 *
 * Body JSON: { text?: string, images?: string[] (data:image/...;base64), fileName?, kindHint?, clinics?: string[], csrf }
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/openai-lib.php';
require_once __DIR__ . '/import-ai-lib.php';

chevalier_auth_boot();
chevalier_security_headers();
chevalier_auth_require_api();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

chevalier_csrf_require();

function import_ai_fail(int $status, string $error, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $error, 'csrf' => chevalier_csrf_token()] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!chevalier_openai_configured()) {
    import_ai_fail(400, 'Para a IA ler documentos, configure a chave OpenAI em Configurações → OpenAI. CSV e XLSX no padrão funcionam sem ela.', ['needsOpenAI' => true]);
}

$raw = chevalier_request_body();
if (strlen($raw) > 14_000_000) {
    import_ai_fail(413, 'Documento grande demais. Envie menos páginas ou uma foto menor.');
}
$body = json_decode($raw ?: 'null', true);
if (!is_array($body)) {
    import_ai_fail(400, 'JSON inválido');
}

$text = trim((string) ($body['text'] ?? ''));
if (mb_strlen($text) > 150000) {
    $text = mb_substr($text, 0, 150000);
}
$images = [];
foreach (array_slice(is_array($body['images'] ?? null) ? $body['images'] : [], 0, 4) as $img) {
    $img = (string) $img;
    if (preg_match('#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$#', $img) && strlen($img) <= 4_500_000) {
        $images[] = $img;
    }
}
if ($text === '' && !$images) {
    import_ai_fail(400, 'Não consegui ler o conteúdo do documento.');
}
$kindHint = in_array($body['kindHint'] ?? '', ['patients', 'costs'], true) ? (string) $body['kindHint'] : '';
$clinics = [];
foreach (array_slice(is_array($body['clinics'] ?? null) ? $body['clinics'] : [], 0, 30) as $c) {
    $c = mb_substr(trim((string) (is_scalar($c) ? $c : '')), 0, 80);
    if ($c !== '') {
        $clinics[] = $c;
    }
}

$fields = chevalier_import_ai_fields();
$instructions = 'Você lê documentos de um consultório odontológico brasileiro e transcreve a tabela principal para importação. '
    . 'Tipos: "patients" = folha/planilha de honorários ou atendimentos (uma linha por paciente/procedimento); '
    . '"costs" = despesas/contas a pagar. '
    . 'Responda SOMENTE JSON: {"kind":"patients|costs","clinic":"nome da clínica do documento ou \"\"",'
    . '"period":"mês/período de referência ou \"\"","headers":["nomes das colunas como no documento"],'
    . '"rows":[["valores na ordem dos headers"]],"mapping":{"campo do sistema":"header"},'
    . '"notes":"1-2 frases em português: o que é o documento e qualquer dúvida para o usuário conferir"}. '
    . 'Regras: transcreva TODAS as linhas de dados, na ordem, sem inventar; ignore linhas de total/subtotal e cabeçalhos repetidos; '
    . 'mantenha datas como DD/MM/AAAA e valores como no documento (ex.: 1.250,00); '
    . 'se o documento não tiver cabeçalho, crie nomes curtos e claros; '
    . 'se a data for só do período (ex.: "outubro/2026"), deixe a coluna de data vazia e informe em "period". '
    . 'Campos do sistema para "mapping" — patients: ' . implode(', ', $fields['patients'])
    . ' (Nome = paciente; Honorários = valor que o dentista recebe; Valor = valor cobrado do paciente/procedimento; '
    . 'Data = data do atendimento; Data da Cobrança = vencimento/repasse; Financeiro = status de pagamento; '
    . 'Progresso = etapa clínica; Observação = procedimento/dente/observação; Tipo = tipo de procedimento; '
    . 'Lab = custo de laboratório; Componentes = custo de componentes; CC = custo da clínica). '
    . 'costs: ' . implode(', ', $fields['costs']) . '. '
    . 'Mapeie só o que existir no documento.'
    . ($clinics ? ' Clínicas cadastradas: ' . implode('; ', $clinics) . '. Em "clinic", use exatamente um desses nomes se o documento for de uma delas.' : '')
    . ($kindHint ? ' O usuário indicou o tipo: ' . $kindHint . '.' : '');

$userContent = [];
if ($text !== '') {
    $userContent[] = ['type' => 'text', 'text' => 'Documento: ' . mb_substr((string) ($body['fileName'] ?? ''), 0, 120) . "\n\n" . $text];
}
foreach ($images as $img) {
    $userContent[] = ['type' => 'image_url', 'image_url' => ['url' => $img, 'detail' => 'high']];
}
if ($text === '') {
    $userContent[] = ['type' => 'text', 'text' => 'O documento veio como imagem (foto ou PDF escaneado). Leia as páginas acima.'];
}

$chat = chevalier_openai_chat([
    ['role' => 'system', 'content' => $instructions],
    ['role' => 'user', 'content' => $userContent],
], [
    'json' => true,
    'temperature' => 0,
    'max_tokens' => 12000,
    'timeout' => 150,
    'model' => $images ? chevalier_openai_vision_model() : chevalier_openai_chat_model(),
]);

if (!$chat['ok'] || !is_array($chat['data']['parsed'] ?? null)) {
    import_ai_fail(502, 'Falha ao ler o documento com a IA: ' . ($chat['error'] ?? 'resposta inválida'));
}

$out = chevalier_import_ai_normalize($chat['data']['parsed'], $kindHint);
if (!$out['headers'] || !$out['rows']) {
    import_ai_fail(422, 'A IA não encontrou uma tabela de lançamentos nesse documento. Confira o arquivo ou envie a planilha.');
}

echo json_encode(['ok' => true, 'mode' => $images ? 'vision' : 'text', 'model' => $chat['data']['model'] ?? null, 'csrf' => chevalier_csrf_token()] + $out, JSON_UNESCAPED_UNICODE);
