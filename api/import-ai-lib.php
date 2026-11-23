<?php
declare(strict_types=1);

/**
 * Normaliza a resposta da IA da importação assistida (api/import-ai.php).
 * Saída no formato do assistente (assets/js/import-assist.js):
 *   kind, clinic, headers[], rows[] (objetos coluna → valor), mapping{campo do sistema → coluna}, notes
 */

/** Campos do sistema que a IA pode mapear (iguais a PATIENT_FIELDS / COST_FIELDS do import-assist.js). */
function chevalier_import_ai_fields(): array
{
    return [
        'patients' => ['Nome', 'Honorários', 'Valor', 'Data', 'Data da Cobrança', 'Financeiro', 'Progresso', 'Observação', 'Tipo', 'Lab', 'Componentes', 'CC'],
        'costs' => ['Descrição', 'Valor', 'Data', 'Vencimento', 'Tipo', 'CUSTOS', 'Forma de Pg', 'Status Pg', 'NF-E', 'Texto'],
    ];
}

function chevalier_import_ai_cell($v): string
{
    if (is_bool($v)) {
        return $v ? 'sim' : 'não';
    }
    if (is_int($v) || is_float($v)) {
        // número vindo da IA: devolve em formato BR para o parser de dinheiro do app
        return is_float($v) ? number_format($v, 2, ',', '.') : (string) $v;
    }
    if (!is_scalar($v)) {
        return '';
    }
    return mb_substr(trim(preg_replace('/\s+/u', ' ', (string) $v) ?? ''), 0, 500);
}

/**
 * @param array<string,mixed> $parsed
 * @return array{kind:string,clinic:string,headers:list<string>,rows:list<array<string,string>>,mapping:array<string,string>,notes:string,period:string}
 */
function chevalier_import_ai_normalize(array $parsed, string $kindHint = ''): array
{
    $kind = (string) ($parsed['kind'] ?? '');
    if (!in_array($kind, ['patients', 'costs'], true)) {
        $kind = in_array($kindHint, ['patients', 'costs'], true) ? $kindHint : 'patients';
    }

    // cabeçalhos: texto, sem vazio, sem repetição
    $headers = [];
    foreach (is_array($parsed['headers'] ?? null) ? $parsed['headers'] : [] as $i => $h) {
        $h = mb_substr(trim((string) (is_scalar($h) ? $h : '')), 0, 60);
        if ($h === '') {
            $h = 'Coluna ' . ($i + 1);
        }
        $base = $h;
        $n = 2;
        while (in_array($h, $headers, true)) {
            $h = $base . ' (' . $n++ . ')';
        }
        $headers[] = $h;
    }

    $rows = [];
    foreach (is_array($parsed['rows'] ?? null) ? $parsed['rows'] : [] as $r) {
        if (count($rows) >= 1000) {
            break;
        }
        $obj = [];
        if (is_array($r) && array_keys($r) === range(0, count($r) - 1)) {
            foreach ($headers as $i => $h) {
                $obj[$h] = chevalier_import_ai_cell($r[$i] ?? '');
            }
        } elseif (is_array($r)) {
            foreach ($headers as $h) {
                $obj[$h] = chevalier_import_ai_cell($r[$h] ?? '');
            }
        } else {
            continue;
        }
        $filled = array_filter($obj, static fn ($v) => $v !== '');
        if (!$filled) {
            continue;
        }
        // descarta linhas de total/subtotal que a IA possa ter transcrito
        $first = mb_strtolower((string) reset($filled));
        if (preg_match('/^(total|subtotal|soma|totais)\b/u', $first)) {
            continue;
        }
        $rows[] = $obj;
    }

    $allowed = chevalier_import_ai_fields()[$kind];
    $mapping = [];
    foreach (is_array($parsed['mapping'] ?? null) ? $parsed['mapping'] : [] as $field => $col) {
        $field = (string) $field;
        $col = (string) (is_scalar($col) ? $col : '');
        if (in_array($field, $allowed, true) && in_array($col, $headers, true)) {
            $mapping[$field] = $col;
        }
    }

    return [
        'kind' => $kind,
        'clinic' => mb_substr(trim((string) (is_scalar($parsed['clinic'] ?? null) ? $parsed['clinic'] : '')), 0, 120),
        'headers' => $headers,
        'rows' => $rows,
        'mapping' => $mapping,
        'notes' => mb_substr(trim((string) (is_scalar($parsed['notes'] ?? null) ? $parsed['notes'] : '')), 0, 600),
        'period' => mb_substr(trim((string) (is_scalar($parsed['period'] ?? null) ? $parsed['period'] : '')), 0, 60),
    ];
}
