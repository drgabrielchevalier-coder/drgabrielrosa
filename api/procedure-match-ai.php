<?php
declare(strict_types=1);

/**
 * POST autenticado: a IA interpreta descrições livres de procedimento (importação de planilhas
 * antigas) e vincula cada parte a um procedimento do catálogo, com dente/região.
 * Ex.: "Rasp c/ prof + Rest 24" → Raspagem + Profilaxia + Restauração (dente 24).
 * O usuário revisa e confirma no assistente de importação.
 *
 * Body JSON: { texts: string[] (até 80), procedures: [{id,name,specialty}], csrf }
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/openai-lib.php';
require_once __DIR__ . '/procedure-match-lib.php';

chevalier_auth_boot();
chevalier_security_headers();
chevalier_auth_require_api();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

chevalier_csrf_require();

function match_ai_fail(int $status, string $error, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $error, 'csrf' => chevalier_csrf_token()] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!chevalier_openai_configured()) {
    match_ai_fail(400, 'Para a IA interpretar os procedimentos, configure a chave OpenAI em Configurações → OpenAI.', ['needsOpenAI' => true]);
}

$body = json_decode(chevalier_request_body() ?: 'null', true);
if (!is_array($body)) {
    match_ai_fail(400, 'JSON inválido');
}

$texts = [];
foreach (array_slice(is_array($body['texts'] ?? null) ? $body['texts'] : [], 0, 80) as $t) {
    $texts[] = mb_substr(trim((string) (is_scalar($t) ? $t : '')), 0, 200);
}
if (!$texts) {
    match_ai_fail(400, 'Nenhuma descrição para interpretar.');
}

$catalog = [];
$validIds = [];
foreach (array_slice(is_array($body['procedures'] ?? null) ? $body['procedures'] : [], 0, 600) as $p) {
    if (!is_array($p)) {
        continue;
    }
    $id = mb_substr(trim((string) ($p['id'] ?? '')), 0, 80);
    $name = mb_substr(trim((string) ($p['name'] ?? '')), 0, 120);
    if ($id === '' || $name === '') {
        continue;
    }
    $validIds[] = $id;
    $catalog[] = $id . ' | ' . $name . ' | ' . mb_substr(trim((string) ($p['specialty'] ?? '')), 0, 40);
}

$lines = [];
foreach ($texts as $i => $t) {
    $lines[] = $i . ': ' . $t;
}

$prompt = "Você é um cirurgião-dentista brasileiro organizando um histórico de atendimentos escrito à mão/abreviado. "
    . "Para cada descrição numerada, identifique TODOS os procedimentos citados e vincule cada um ao procedimento do catálogo mais adequado, "
    . "com o dente (numeração FDI, ex.: 24) ou a região quando houver.\n"
    . "Abreviações comuns: rasp = raspagem; prof = profilaxia; rest = restauração; exo = exodontia; endo = endodontia/tratamento de canal; "
    . "c/ = com; + separa procedimentos; números de 2 dígitos 11–48 ou 51–85 são dentes.\n"
    . "Regras: \"Raspagem com profilaxia\" = dois itens (raspagem + profilaxia). Restauração sem indicação de tamanho → \"Restauração simples\". "
    . "Exodontia sem indicação → \"Exodontia simples\" (decíduo se o dente for 51–85). "
    . "Se um procedimento NÃO existir no catálogo, não force: use procedureId \"\" e preencha newName (nome claro em português), "
    . "specialty (cirurgia|implante|protese|endodontia|periodontia|clinica|ortodontia|pediatria|diagnostico|hof) e kind (clinico|cirurgico). "
    . "Repita o item quando houver vários dentes com o mesmo procedimento (um item por dente). Não invente procedimentos que não estão no texto.\n"
    . "Responda SOMENTE JSON: {\"results\":[{\"i\":0,\"items\":[{\"procedureId\":\"id\",\"tooth\":\"24\",\"newName\":\"\",\"specialty\":\"\",\"kind\":\"\"}]}]}\n\n"
    . "Catálogo (id | nome | especialidade):\n" . implode("\n", $catalog)
    . "\n\nDescrições:\n" . implode("\n", $lines);

$chat = chevalier_openai_chat([
    ['role' => 'system', 'content' => 'Você classifica procedimentos odontológicos em JSON. Português do Brasil. Seja fiel ao texto.'],
    ['role' => 'user', 'content' => $prompt],
], ['json' => true, 'temperature' => 0, 'max_tokens' => 6000, 'timeout' => 120]);

if (!$chat['ok'] || !is_array($chat['data']['parsed'] ?? null)) {
    match_ai_fail(502, 'Falha ao interpretar com a IA: ' . ($chat['error'] ?? 'resposta inválida'));
}

echo json_encode([
    'ok' => true,
    'results' => chevalier_match_normalize($chat['data']['parsed'], $validIds, count($texts)),
    'model' => $chat['data']['model'] ?? null,
    'csrf' => chevalier_csrf_token(),
], JSON_UNESCAPED_UNICODE);
