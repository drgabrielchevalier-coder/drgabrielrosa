<?php
declare(strict_types=1);

/**
 * Cliente OpenAI compartilhado (chat + vision).
 * Chave: define('OPENAI_API_KEY', 'sk-...') em api/config.local.php
 * Modelos opcionais: OPENAI_CHAT_MODEL, OPENAI_VISION_MODEL
 */

require_once __DIR__ . '/config.php';

function chevalier_openai_key(): string
{
    return defined('OPENAI_API_KEY') ? trim((string) OPENAI_API_KEY) : '';
}

function chevalier_openai_configured(): bool
{
    $k = chevalier_openai_key();
    return $k !== '' && str_starts_with($k, 'sk-');
}

function chevalier_openai_chat_model(): string
{
    if (defined('OPENAI_CHAT_MODEL') && trim((string) OPENAI_CHAT_MODEL) !== '') {
        return trim((string) OPENAI_CHAT_MODEL);
    }
    if (defined('OPENAI_VISION_MODEL') && trim((string) OPENAI_VISION_MODEL) !== '') {
        return trim((string) OPENAI_VISION_MODEL);
    }
    return 'gpt-4o-mini';
}

function chevalier_openai_vision_model(): string
{
    if (defined('OPENAI_VISION_MODEL') && trim((string) OPENAI_VISION_MODEL) !== '') {
        return trim((string) OPENAI_VISION_MODEL);
    }
    return chevalier_openai_chat_model();
}

/**
 * @param list<array<string,mixed>> $messages
 * @param array<string,mixed> $opts
 * @return array{ok:bool,data?:array,error?:string,raw?:string,status?:int}
 */
function chevalier_openai_chat(array $messages, array $opts = []): array
{
    $apiKey = chevalier_openai_key();
    if ($apiKey === '') {
        return ['ok' => false, 'error' => 'OPENAI_API_KEY não configurada em api/config.local.php'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => 'cURL PHP indisponível no servidor'];
    }

    $payload = [
        'model' => (string) ($opts['model'] ?? chevalier_openai_chat_model()),
        'messages' => $messages,
        'temperature' => isset($opts['temperature']) ? (float) $opts['temperature'] : 0.2,
        'max_tokens' => isset($opts['max_tokens']) ? (int) $opts['max_tokens'] : 1600,
    ];
    if (!empty($opts['json'])) {
        $payload['response_format'] = ['type' => 'json_object'];
    }

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => (int) ($opts['timeout'] ?? 90),
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $errno) {
        return ['ok' => false, 'error' => 'Falha de rede OpenAI: ' . ($err ?: 'desconhecida'), 'status' => $status];
    }
    if ($status < 200 || $status >= 300) {
        $j = json_decode($body, true);
        $msg = is_array($j) ? (string) ($j['error']['message'] ?? $body) : $body;
        return ['ok' => false, 'error' => 'OpenAI HTTP ' . $status . ': ' . mb_substr($msg, 0, 400), 'status' => $status, 'raw' => $body];
    }

    $json = json_decode($body, true);
    if (!is_array($json)) {
        return ['ok' => false, 'error' => 'Resposta OpenAI inválida', 'raw' => $body];
    }
    $text = (string) ($json['choices'][0]['message']['content'] ?? '');
    $parsed = null;
    if (!empty($opts['json'])) {
        $parsed = json_decode($text, true);
        if (!is_array($parsed)) {
            return ['ok' => false, 'error' => 'OpenAI não retornou JSON válido', 'raw' => $text];
        }
    }

    return [
        'ok' => true,
        'data' => [
            'text' => $text,
            'parsed' => $parsed,
            'model' => (string) ($json['model'] ?? $payload['model']),
            'usage' => $json['usage'] ?? null,
        ],
        'status' => $status,
    ];
}
