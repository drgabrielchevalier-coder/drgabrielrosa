<?php
declare(strict_types=1);

/**
 * Cliente Notaas (NFS-e).
 * Chave: define('NOTAAS_API_KEY', 'ntaas_...') em api/config.local.php
 * Opcionais: NOTAAS_ALIQUOTA_ISS, NOTAAS_SERVICO_CODIGO, NOTAAS_SERVICO_DESCRICAO
 */

require_once __DIR__ . '/config.php';

const NOTAAS_API_BASE = 'https://platform.notaas.com.br/api/v1';

function chevalier_notaas_key(): string
{
    return defined('NOTAAS_API_KEY') ? trim((string) NOTAAS_API_KEY) : '';
}

function chevalier_notaas_configured(): bool
{
    $k = chevalier_notaas_key();
    return $k !== '' && str_starts_with($k, 'ntaas_');
}

function chevalier_notaas_aliquota(): float
{
    if (defined('NOTAAS_ALIQUOTA_ISS') && is_numeric(NOTAAS_ALIQUOTA_ISS)) {
        return (float) NOTAAS_ALIQUOTA_ISS;
    }
    return 5.0;
}

function chevalier_notaas_servico_codigo(): string
{
    if (defined('NOTAAS_SERVICO_CODIGO') && trim((string) NOTAAS_SERVICO_CODIGO) !== '') {
        return trim((string) NOTAAS_SERVICO_CODIGO);
    }
    return '';
}

function chevalier_notaas_servico_descricao(): string
{
    if (defined('NOTAAS_SERVICO_DESCRICAO') && trim((string) NOTAAS_SERVICO_DESCRICAO) !== '') {
        return trim((string) NOTAAS_SERVICO_DESCRICAO);
    }
    return 'Serviços odontológicos / honorários profissionais';
}

/**
 * Upsert de defines em config.local.php (preserva demais linhas).
 *
 * @param array<string,string|null> $defines valor null = não alterar; '' = remover linha
 */
function chevalier_config_local_upsert(array $defines): bool
{
    $localPath = __DIR__ . '/config.local.php';
    $existing = is_file($localPath) ? (string) file_get_contents($localPath) : "<?php\ndeclare(strict_types=1);\n\n";
    $lines = preg_split("/\r\n|\n|\r/", $existing) ?: [];
    $out = [];
    $seen = array_fill_keys(array_keys($defines), false);

    foreach ($lines as $line) {
        $matched = false;
        foreach ($defines as $name => $value) {
            if (preg_match('/define\s*\(\s*[\'"]' . preg_quote($name, '/') . '[\'"]/', $line)) {
                $matched = true;
                $seen[$name] = true;
                if ($value === null) {
                    $out[] = $line;
                } elseif ($value !== '') {
                    $out[] = "define('{$name}', " . var_export($value, true) . ');';
                }
                // empty string = drop the define line
                break;
            }
        }
        if (!$matched) {
            $out[] = $line;
        }
    }

    foreach ($defines as $name => $value) {
        if ($seen[$name] || $value === null || $value === '') {
            continue;
        }
        $out[] = "define('{$name}', " . var_export($value, true) . ');';
    }

    $content = implode("\n", $out);
    if (!str_ends_with($content, "\n")) {
        $content .= "\n";
    }
    return file_put_contents($localPath, $content) !== false;
}

/**
 * @param array<string,mixed>|null $body
 * @return array{ok:bool,status:int,data?:array,error?:string,raw?:string}
 */
function chevalier_notaas_request(string $method, string $path, ?array $body = null): array
{
    $apiKey = chevalier_notaas_key();
    if ($apiKey === '') {
        return ['ok' => false, 'status' => 0, 'error' => 'NOTAAS_API_KEY não configurada em api/config.local.php'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'status' => 0, 'error' => 'cURL PHP indisponível no servidor'];
    }

    $url = rtrim(NOTAAS_API_BASE, '/') . '/' . ltrim($path, '/');
    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'status' => 0, 'error' => 'Falha ao iniciar cURL'];
    }

    $headers = [
        'Accept: application/json',
        'x-api-key: ' . $apiKey,
    ];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_TIMEOUT => 45,
        CURLOPT_CONNECTTIMEOUT => 15,
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);

    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['ok' => false, 'status' => $status, 'error' => 'cURL: ' . $err, 'raw' => is_string($raw) ? $raw : ''];
    }

    $data = null;
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $data = $decoded;
        }
    }

    $ok = $status >= 200 && $status < 300;
    if (!$ok) {
        $msg = is_array($data)
            ? (string) ($data['error'] ?? $data['message'] ?? $data['detail'] ?? 'Erro Notaas HTTP ' . $status)
            : ('Erro Notaas HTTP ' . $status);
        return ['ok' => false, 'status' => $status, 'error' => $msg, 'data' => $data ?? [], 'raw' => is_string($raw) ? $raw : ''];
    }

    return ['ok' => true, 'status' => $status, 'data' => $data ?? [], 'raw' => is_string($raw) ? $raw : ''];
}
