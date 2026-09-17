<?php
declare(strict_types=1);

/**
 * IA de avaliação de tomografia / planejamento odontológico.
 * Usa OpenAI Vision se OPENAI_API_KEY estiver em config.local.php;
 * caso contrário, gera análise clínica estruturada local (checklist CBCT).
 */
require_once __DIR__ . '/auth-lib.php';
require_once __DIR__ . '/config.php';
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

$fileId = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($data['fileId'] ?? ''));
$patient = trim((string) ($data['patient'] ?? ''));
$region = trim((string) ($data['region'] ?? 'Não informado'));
$notes = trim((string) ($data['notes'] ?? ''));
$goal = trim((string) ($data['goal'] ?? 'Planejamento de implante'));

$root = dirname(__DIR__);
$dir = $root . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'planning';
$meta = null;
$imagePath = null;
$imageMime = null;

if ($fileId !== '') {
    $metaFile = $dir . DIRECTORY_SEPARATOR . $fileId . '.json';
    if (is_file($metaFile)) {
        $meta = json_decode((string) file_get_contents($metaFile), true);
        if (is_array($meta) && !empty($meta['stored'])) {
            $imagePath = $dir . DIRECTORY_SEPARATOR . basename((string) $meta['stored']);
            $imageMime = (string) ($meta['mime'] ?? '');
            if ($patient === '' && !empty($meta['patient'])) {
                $patient = (string) $meta['patient'];
            }
            if ($notes === '' && !empty($meta['notes'])) {
                $notes = (string) $meta['notes'];
            }
        }
    }
}

function chevalier_tomo_local_analysis(?array $meta, ?string $imagePath, string $patient, string $region, string $notes, string $goal): array
{
    $w = 0;
    $h = 0;
    $brightness = null;
    $contrastHint = null;
    if ($imagePath && is_file($imagePath) && function_exists('getimagesize')) {
        $info = @getimagesize($imagePath);
        if (is_array($info)) {
            $w = (int) ($info[0] ?? 0);
            $h = (int) ($info[1] ?? 0);
        }
    }
    if ($imagePath && is_file($imagePath) && function_exists('imagecreatefromstring')) {
        $bin = @file_get_contents($imagePath);
        if ($bin !== false) {
            $im = @imagecreatefromstring($bin);
            if ($im) {
                $sw = imagesx($im);
                $sh = imagesy($im);
                $step = max(1, (int) floor(min($sw, $sh) / 40));
                $sum = 0;
                $n = 0;
                for ($y = 0; $y < $sh; $y += $step) {
                    for ($x = 0; $x < $sw; $x += $step) {
                        $rgb = imagecolorat($im, $x, $y);
                        $r = ($rgb >> 16) & 0xFF;
                        $g = ($rgb >> 8) & 0xFF;
                        $b = $rgb & 0xFF;
                        $sum += (0.299 * $r + 0.587 * $g + 0.114 * $b);
                        $n++;
                    }
                }
                imagedestroy($im);
                if ($n > 0) {
                    $brightness = round($sum / $n, 1);
                    if ($brightness < 60) {
                        $contrastHint = 'Imagem escura — verificar janela/nível da CBCT ou exportar fatia com maior contraste.';
                    } elseif ($brightness > 200) {
                        $contrastHint = 'Imagem muito clara — pode haver saturação; confirme corticais e densidades.';
                    } else {
                        $contrastHint = 'Brilho aparente adequado para revisão visual preliminar.';
                    }
                }
            }
        }
    }

    $ext = strtolower((string) ($meta['ext'] ?? ''));
    $name = (string) ($meta['name'] ?? $meta['title'] ?? 'arquivo');
    $isDicom = in_array($ext, ['dcm', 'dicom'], true);
    $isPdf = $ext === 'pdf';
    $isIcon = $ext === 'icon' || str_contains(strtolower($name), 'icon');

    $checklist = [
        'Identificar arco e sítio(s) de interesse no exame.',
        'Medir altura e espessura óssea no corte cross-sectional.',
        'Avaliar densidade relativa (tipo Misch I–IV) no leito planejado.',
        'Mapear nervo alveolar inferior / forame mentual (mandíbula) ou seio maxilar / fossa nasal (maxila).',
        'Verificar espessura da cortical vestibular/lingual e defeitos (deiscência/fenestração).',
        'Definir diâmetro/comprimento do implante com margem de segurança ≥2 mm de estruturas nobres.',
        'Considerar enxerto, levantamento de seio ou expansão se volume insuficiente.',
        'Conferir qualidade do export ICON/guia (precisão do scanbody / alinhamento).',
    ];

    $risks = [];
    $suggestions = [];
    $findings = [];

    if ($isDicom) {
        $findings[] = 'Arquivo DICOM detectado — ideal para revisão volumétrica; abra também no visualizador CBCT de preferência.';
    } elseif ($isPdf) {
        $findings[] = 'PDF de planejamento — a IA analisa o relatório; confirme medidas nas fatias originais.';
    } elseif ($isIcon) {
        $findings[] = 'Arquivo ICON / export de planejamento guiado identificado.';
    } elseif ($w > 0 && $h > 0) {
        $findings[] = "Imagem {$w}×{$h}px recebida para análise visual preliminar.";
    } else {
        $findings[] = 'Arquivo de planejamento recebido; análise baseada em checklist clínico + metadados.';
    }

    if ($contrastHint) {
        $findings[] = $contrastHint;
    }
    if ($region !== '' && strcasecmp($region, 'Não informado') !== 0) {
        $findings[] = 'Região informada: ' . $region . '.';
        if (preg_match('/mand|inf|36|37|46|47|38|48/i', $region)) {
            $risks[] = 'Atenção ao canal mandibular e distância ao forame mentual.';
            $suggestions[] = 'Traçar nervo no software e manter ≥2 mm de segurança ao ápice do implante.';
        }
        if (preg_match('/max|sup|16|17|26|27|seio/i', $region)) {
            $risks[] = 'Avaliar seio maxilar, espessura residual e necessidade de levantamento.';
            $suggestions[] = 'Se altura residual <6–8 mm, considerar short implant ou sinus lift.';
        }
    }
    if ($goal !== '') {
        $findings[] = 'Objetivo do caso: ' . $goal . '.';
    }
    if ($notes !== '') {
        $findings[] = 'Notas clínicas: ' . $notes;
    }

    $risks[] = 'Esta análise não substitui laudo radiológico nem a decisão clínica presencial.';
    $suggestions[] = 'Documentar medidas (altura/espessura) e captura de tela da fatia crítica no prontuário.';
    $suggestions[] = 'Se houver guia ICON, validar estabilidade do scan e offset soft-tissue antes da cirurgia.';

    $summary = 'Avaliação preliminar de planejamento odontológico'
        . ($patient !== '' ? ' para ' . $patient : '')
        . '. Modo local (checklist CBCT + metadados do arquivo). '
        . 'Revise as estruturas anatômicas listadas antes de definir o implante.';

    return [
        'mode' => 'local',
        'provider' => 'Chevalier Planning AI (local)',
        'summary' => $summary,
        'patient' => $patient,
        'region' => $region,
        'goal' => $goal,
        'findings' => $findings,
        'boneQuality' => 'A classificar na fatia (Misch I–IV) — confirme densidade no leito.',
        'anatomicRisks' => $risks,
        'implantSuggestions' => $suggestions,
        'checklist' => $checklist,
        'image' => [
            'width' => $w,
            'height' => $h,
            'brightness' => $brightness,
            'name' => $name,
            'ext' => $ext,
        ],
        'disclaimer' => 'Ferramenta de apoio ao planejamento. Não constitui diagnóstico radiológico definitivo.',
        'generatedAt' => gmdate('c'),
    ];
}

function chevalier_tomo_openai(string $apiKey, ?string $imagePath, ?string $imageMime, string $patient, string $region, string $notes, string $goal, ?array $meta): ?array
{
    if ($apiKey === '' || !$imagePath || !is_file($imagePath)) {
        return null;
    }
    $mime = $imageMime ?: 'image/jpeg';
    if (!str_starts_with($mime, 'image/')) {
        // Vision only for raster images; fall back local for DICOM/PDF/ZIP
        return null;
    }
    $bin = file_get_contents($imagePath);
    if ($bin === false) {
        return null;
    }
    $b64 = base64_encode($bin);
    $prompt = "Você é um cirurgião-dentista especialista em implantodontia e radiologia odontológica. "
        . "Avalie esta imagem de planejamento/tomografia odontológica. "
        . "Paciente: {$patient}. Região: {$region}. Objetivo: {$goal}. Notas: {$notes}. "
        . "Responda em JSON com chaves: summary (string), boneQuality (string), findings (array de strings), "
        . "anatomicRisks (array), implantSuggestions (array), checklist (array). "
        . "Seja objetivo, em português do Brasil. Não invente medidas numéricas se não forem legíveis na imagem.";

    $payload = [
        'model' => defined('OPENAI_VISION_MODEL') ? OPENAI_VISION_MODEL : 'gpt-4o-mini',
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'text', 'text' => $prompt],
                ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
            ],
        ]],
        'response_format' => ['type' => 'json_object'],
        'max_tokens' => 1200,
    ];

    if (!function_exists('curl_init')) {
        return null;
    }
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 60,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) {
        return null;
    }
    $json = json_decode($body, true);
    $text = (string) ($json['choices'][0]['message']['content'] ?? '');
    $parsed = json_decode($text, true);
    if (!is_array($parsed)) {
        return null;
    }
    return [
        'mode' => 'openai',
        'provider' => 'OpenAI Vision',
        'summary' => (string) ($parsed['summary'] ?? ''),
        'patient' => $patient,
        'region' => $region,
        'goal' => $goal,
        'findings' => array_values((array) ($parsed['findings'] ?? [])),
        'boneQuality' => (string) ($parsed['boneQuality'] ?? ''),
        'anatomicRisks' => array_values((array) ($parsed['anatomicRisks'] ?? [])),
        'implantSuggestions' => array_values((array) ($parsed['implantSuggestions'] ?? [])),
        'checklist' => array_values((array) ($parsed['checklist'] ?? [])),
        'disclaimer' => 'Análise por modelo de visão. Confirme sempre no exame original e na clínica.',
        'generatedAt' => gmdate('c'),
    ];
}

$apiKey = defined('OPENAI_API_KEY') ? (string) OPENAI_API_KEY : '';
$analysis = null;
if ($apiKey !== '') {
    $analysis = chevalier_tomo_openai($apiKey, $imagePath, $imageMime, $patient, $region, $notes, $goal, is_array($meta) ? $meta : null);
}
if ($analysis === null) {
    $analysis = chevalier_tomo_local_analysis(is_array($meta) ? $meta : null, $imagePath, $patient, $region, $notes, $goal);
}

echo json_encode([
    'ok' => true,
    'analysis' => $analysis,
    'fileId' => $fileId !== '' ? $fileId : null,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
