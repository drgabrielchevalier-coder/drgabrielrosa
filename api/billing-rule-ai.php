<?php
declare(strict_types=1);

/**
 * Interpreta regra de cobrança de clínica em linguagem natural → JSON estruturado.
 * Usa OpenAI se OPENAI_API_KEY estiver definido; senão, parser local em português.
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

$text = trim((string) ($data['text'] ?? $data['rule'] ?? ''));
$clinicName = trim((string) ($data['clinicName'] ?? ''));
if ($text === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Descreva a regra de cobrança.'], JSON_UNESCAPED_UNICODE);
    exit;
}

function chevalier_billing_local_parse(string $text): array
{
    $t = mb_strtolower($text, 'UTF-8');
    $billing = [
        'version' => 1,
        'shareMode' => 'procedure',
        'professionalPercent' => 50,
        'fixedAmount' => 0,
        'cardFeeEnabled' => false,
        'cardFeePercent' => 0,
        'cardFeeOn' => 'share',
        'materialsPaidBy' => 'doctor',
        'reimburseComponents' => false,
        'reimburseMaterials' => false,
        'reimburseLab' => false,
        'notes' => $text,
        'aiSummary' => '',
        'examplePracticed' => 3000,
        'exampleComponents' => 200,
        'exampleMaterials' => 0,
        'exampleLab' => 0,
    ];

    if (preg_match_all('/(\d{1,3})\s*%/u', $t, $m)) {
        $pcts = array_map('intval', $m[1]);
        if (in_array(50, $pcts, true) && preg_match('/profissional|pra mim|para mim|eu recebo|cirurgi/u', $t)) {
            $billing['shareMode'] = 'percent';
            $billing['professionalPercent'] = 50;
        } elseif ($pcts) {
            $pro = $pcts[0];
            if ($pro > 0 && $pro <= 100) {
                $billing['shareMode'] = 'percent';
                $billing['professionalPercent'] = $pro;
            }
        }
    }

    if (preg_match('/valor fechado|honor[aá]rio fixo|recebo\s+r\$\s*(\d+[.,]?\d*)/u', $t, $fm)) {
        $billing['shareMode'] = 'fixed';
        if (!empty($fm[1])) {
            $billing['fixedAmount'] = (float) str_replace(',', '.', $fm[1]);
        } elseif (preg_match('/r\$\s*(\d+[.,]?\d*)/u', $t, $rm)) {
            $billing['fixedAmount'] = (float) str_replace(',', '.', $rm[1]);
        }
    }

    if (preg_match('/n[aã]o\s+descont|sem\s+taxa|isento.*cart/u', $t)) {
        $billing['cardFeeEnabled'] = false;
        $billing['cardFeePercent'] = 0;
    } elseif (preg_match('/cart[aã]o|taxa\s+de\s+cart|maquininha|cr[eé]dito/u', $t)) {
        $billing['cardFeeEnabled'] = true;
        $fee = 10;
        if (preg_match('/(?:cart[aã]o|taxa)[^0-9]{0,24}(\d{1,3})\s*%/u', $t, $cm)) {
            $fee = (int) $cm[1];
        } elseif (preg_match('/(\d{1,3})\s*%[^.]{0,40}cart/u', $t, $cm2)) {
            $fee = (int) $cm2[1];
        }
        $billing['cardFeePercent'] = $fee;
        $billing['cardFeeOn'] = preg_match('/valor praticado|do total|sobre o total/u', $t) ? 'practiced' : 'share';
    }

    if (preg_match('/reembols|paga\s+(?:o\s+)?(?:material|componente)|devolve|cl[ií]nica\s+(?:ainda\s+)?(?:me\s+)?paga/u', $t)) {
        $billing['reimburseComponents'] = true;
        $billing['materialsPaidBy'] = 'clinic';
        if (preg_match('/material|biomaterial|enxerto/u', $t)) {
            $billing['reimburseMaterials'] = true;
        }
        if (preg_match('/lab|laborat|pr[oó]tese/u', $t)) {
            $billing['reimburseLab'] = true;
        }
    } elseif (preg_match('/material\s+por\s+(?:minha|sua)\s+conta|eu\s+pago\s+o\s+material|n[aã]o\s+divide/u', $t)) {
        $billing['materialsPaidBy'] = 'doctor';
    } elseif (preg_match('/divide\s+material|cl[ií]nica\s+paga\s+material/u', $t)) {
        $billing['materialsPaidBy'] = 'clinic';
    }

    if (preg_match('/r\$\s*3\.?000|3000|tr[eê]s mil/u', $t)) {
        $billing['examplePracticed'] = 3000;
    }

    $bits = [];
    if ($billing['shareMode'] === 'percent') {
        $bits[] = $billing['professionalPercent'] . '% para você';
    } elseif ($billing['shareMode'] === 'fixed') {
        $bits[] = 'valor fechado';
    } else {
        $bits[] = 'conforme procedimento';
    }
    if ($billing['cardFeeEnabled']) {
        $bits[] = 'cartão −' . $billing['cardFeePercent'] . '%';
    } else {
        $bits[] = 'sem taxa de cartão';
    }
    if ($billing['reimburseComponents'] || $billing['reimburseMaterials']) {
        $bits[] = 'reembolso de material/componentes';
    }
    $billing['aiSummary'] = implode(' · ', $bits);

    return $billing;
}

function chevalier_billing_openai(string $apiKey, string $text, string $clinicName): ?array
{
    if ($apiKey === '' || !function_exists('curl_init')) {
        return null;
    }
    $clinic = $clinicName !== '' ? $clinicName : 'a clínica';
    $prompt = "Você configura o algoritmo de cobrança de um cirurgião-dentista em prestação de serviço. "
        . "Clínica: {$clinic}. Regra descrita pelo usuário:\n\"\"\"{$text}\"\"\"\n"
        . "Responda SOMENTE JSON com: shareMode (procedure|percent|fixed), professionalPercent (0-100), "
        . "fixedAmount (number), cardFeeEnabled (bool), cardFeePercent (0-100), cardFeeOn (share|practiced), "
        . "materialsPaidBy (doctor|clinic), reimburseComponents (bool), reimburseMaterials (bool), reimburseLab (bool), "
        . "notes (string curta), aiSummary (string curta em português), examplePracticed (number), exampleComponents (number). "
        . "Exemplo típico Gerlúcia: implante 3000, 50% profissional, desconta 10% cartão da parte do profissional, "
        . "clínica reembolsa componentes → shareMode=percent, professionalPercent=50, cardFeeEnabled=true, "
        . "cardFeePercent=10, cardFeeOn=share, reimburseComponents=true, materialsPaidBy=clinic.";

    $payload = [
        'model' => defined('OPENAI_VISION_MODEL') ? OPENAI_VISION_MODEL : 'gpt-4o-mini',
        'messages' => [
            ['role' => 'system', 'content' => 'Extraia regras financeiras odontológicas em JSON. Português do Brasil.'],
            ['role' => 'user', 'content' => $prompt],
        ],
        'response_format' => ['type' => 'json_object'],
        'max_tokens' => 800,
        'temperature' => 0.2,
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 45,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) {
        return null;
    }
    $json = json_decode($body, true);
    $content = (string) ($json['choices'][0]['message']['content'] ?? '');
    $parsed = json_decode($content, true);
    if (!is_array($parsed)) {
        return null;
    }
    $parsed['notes'] = $parsed['notes'] ?? $text;
    $parsed['version'] = 1;
    return $parsed;
}

$apiKey = defined('OPENAI_API_KEY') ? (string) OPENAI_API_KEY : '';
$billing = null;
$mode = 'local';
if ($apiKey !== '') {
    $billing = chevalier_billing_openai($apiKey, $text, $clinicName);
    if (is_array($billing)) {
        $mode = 'openai';
    }
}
if (!is_array($billing)) {
    $billing = chevalier_billing_local_parse($text);
    $mode = 'local';
}

echo json_encode([
    'ok' => true,
    'mode' => $mode,
    'billing' => $billing,
    'clinicName' => $clinicName !== '' ? $clinicName : null,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
