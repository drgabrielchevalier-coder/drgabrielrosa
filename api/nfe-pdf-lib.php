<?php
declare(strict_types=1);

/**
 * Normaliza a resposta da IA para o DANFE (api/nfe-pdf-ai.php) no mesmo
 * formato do parser de XML (assets/js/nfe-stock.js → parseNfeXml).
 */

function nfe_pdf_num($v): float
{
    if (is_int($v) || is_float($v)) {
        return (float) $v;
    }
    $s = trim((string) $v);
    if ($s === '') {
        return 0.0;
    }
    $s = preg_replace('/[^0-9,.\-]/', '', $s) ?? '';
    if (str_contains($s, ',')) {
        $s = str_replace('.', '', $s);
        $s = str_replace(',', '.', $s);
    }
    return is_numeric($s) ? (float) $s : 0.0;
}

function nfe_pdf_str($v, int $max = 300): string
{
    return mb_substr(trim((string) (is_scalar($v) ? $v : '')), 0, $max);
}

/**
 * @param array<string,mixed> $parsed
 * @return array{meta:array<string,mixed>,items:list<array<string,mixed>>}
 */
function chevalier_nfe_pdf_normalize(array $parsed): array
{
    $m = is_array($parsed['meta'] ?? null) ? $parsed['meta'] : [];
    $key = preg_replace('/\D+/', '', (string) ($m['key'] ?? '')) ?? '';
    $date = nfe_pdf_str($m['date'] ?? '', 20);
    if (preg_match('#^(\d{2})/(\d{2})/(\d{4})#', $date, $d)) {
        $date = "{$d[3]}-{$d[2]}-{$d[1]}";
    }
    $meta = [
        'key' => strlen($key) === 44 ? $key : '',
        'number' => ltrim(preg_replace('/\D+/', '', (string) ($m['number'] ?? '')) ?? '', '0'),
        'series' => nfe_pdf_str($m['series'] ?? '', 10),
        'date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : '',
        'supplier' => nfe_pdf_str($m['supplier'] ?? ''),
        'supplierCnpj' => preg_replace('/\D+/', '', (string) ($m['supplierCnpj'] ?? '')) ?? '',
        'total' => round(nfe_pdf_num($m['total'] ?? 0), 2),
    ];

    $items = [];
    foreach (is_array($parsed['items'] ?? null) ? $parsed['items'] : [] as $it) {
        if (!is_array($it)) {
            continue;
        }
        $name = nfe_pdf_str($it['name'] ?? '');
        $qty = nfe_pdf_num($it['qty'] ?? 0);
        $unitCost = nfe_pdf_num($it['unitCost'] ?? 0);
        $total = nfe_pdf_num($it['total'] ?? 0);
        if ($unitCost <= 0 && $qty > 0 && $total > 0) {
            $unitCost = $total / $qty;
        }
        if ($name === '' || $qty <= 0) {
            continue;
        }
        $barcode = preg_replace('/\D+/', '', (string) ($it['barcode'] ?? '')) ?? '';
        $items[] = [
            'name' => $name,
            'qty' => round($qty, 4),
            'unitCost' => round($unitCost, 4),
            'total' => round($total > 0 ? $total : $qty * $unitCost, 2),
            'unit' => nfe_pdf_str($it['unit'] ?? '', 10) ?: 'UN',
            'barcode' => (strlen($barcode) >= 8 && !preg_match('/^0+$/', $barcode)) ? $barcode : '',
            'sku' => nfe_pdf_str($it['sku'] ?? '', 60),
            'ncm' => preg_replace('/\D+/', '', (string) ($it['ncm'] ?? '')) ?? '',
        ];
    }

    return ['meta' => $meta, 'items' => $items];
}
