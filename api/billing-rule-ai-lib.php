<?php
declare(strict_types=1);

/**
 * Normaliza a interpretação da IA da regra de cobrança de uma clínica (api/billing-rule-ai.php).
 *
 * Formato devolvido ao painel:
 *   default    → regra dos "demais procedimentos" (vira o Padrão da clínica)
 *   categories → [{label, shareMode, professionalPercent, fixedAmount, procedureIds[]}]
 *                (viram regras "Por procedimento" com category = label)
 *   + campos gerais (taxa de cartão, materiais, reembolsos, resumo)
 */

function chevalier_billing_ai_mode($v, string $fallback = ''): string
{
    $v = strtolower(trim((string) (is_scalar($v) ? $v : '')));
    $alias = ['percentual' => 'percent', 'porcentagem' => 'percent', 'fixo' => 'fixed', 'valor fechado' => 'fixed', 'misto' => 'mixed'];
    $v = $alias[$v] ?? $v;
    return in_array($v, ['procedure', 'percent', 'fixed', 'mixed'], true) ? $v : $fallback;
}

function chevalier_billing_ai_num($v, float $max = 1e9): float
{
    if (is_string($v)) {
        $s = preg_replace('/[^0-9,.\-]/', '', $v) ?? '';
        if (str_contains($s, ',')) {
            $s = str_replace(',', '.', str_replace('.', '', $s));
        }
        $v = is_numeric($s) ? (float) $s : 0.0;
    }
    $n = is_int($v) || is_float($v) ? (float) $v : 0.0;
    return round(max(0.0, min($max, $n)), 2);
}

/**
 * @param array<string,mixed> $parsed resposta da IA
 * @param list<string> $validIds ids de procedimentos do catálogo
 * @return array<string,mixed>
 */
function chevalier_billing_ai_normalize(array $parsed, array $validIds): array
{
    $valid = array_flip($validIds);
    $used = [];
    $categories = [];
    foreach (is_array($parsed['categories'] ?? null) ? $parsed['categories'] : [] as $c) {
        if (!is_array($c)) {
            continue;
        }
        $mode = chevalier_billing_ai_mode($c['shareMode'] ?? '');
        if ($mode === '' || $mode === 'procedure') {
            continue;
        }
        $label = mb_substr(trim((string) (is_scalar($c['label'] ?? null) ? $c['label'] : '')), 0, 80);
        if ($label === '') {
            $label = 'Categoria ' . (count($categories) + 1);
        }
        $ids = [];
        foreach (is_array($c['procedureIds'] ?? null) ? $c['procedureIds'] : [] as $id) {
            $id = (string) (is_scalar($id) ? $id : '');
            // cada procedimento em uma categoria só (a primeira, mais específica, vence)
            if (isset($valid[$id]) && !isset($used[$id])) {
                $ids[] = $id;
                $used[$id] = true;
            }
        }
        $categories[] = [
            'label' => $label,
            'shareMode' => $mode,
            'professionalPercent' => chevalier_billing_ai_num($c['professionalPercent'] ?? 0, 100),
            'fixedAmount' => chevalier_billing_ai_num($c['fixedAmount'] ?? 0),
            'procedureIds' => $ids,
            'keywords' => array_values(array_filter(array_map(
                static fn ($k) => mb_substr(trim((string) (is_scalar($k) ? $k : '')), 0, 40),
                is_array($c['keywords'] ?? null) ? $c['keywords'] : []
            ))),
        ];
    }

    $d = is_array($parsed['default'] ?? null) ? $parsed['default'] : [];
    $defMode = chevalier_billing_ai_mode($d['shareMode'] ?? '', '');
    if ($defMode === '') {
        // sem regra para os demais: cada procedimento segue a própria ficha
        $defMode = chevalier_billing_ai_mode($parsed['shareMode'] ?? '', $categories ? 'procedure' : 'percent');
    }
    $default = [
        'shareMode' => $defMode,
        'professionalPercent' => chevalier_billing_ai_num($d['professionalPercent'] ?? ($parsed['professionalPercent'] ?? 0), 100),
        'fixedAmount' => chevalier_billing_ai_num($d['fixedAmount'] ?? ($parsed['fixedAmount'] ?? 0)),
        'label' => mb_substr(trim((string) (is_scalar($d['label'] ?? null) ? $d['label'] : 'Demais procedimentos')), 0, 80) ?: 'Demais procedimentos',
    ];

    $bool = static fn ($v) => filter_var($v, FILTER_VALIDATE_BOOLEAN);
    $onlyIn = static fn ($v, array $ok, string $fb) => in_array($v, $ok, true) ? $v : $fb;

    return [
        // campos do Padrão (compatível com o formato antigo)
        'shareMode' => $default['shareMode'],
        'professionalPercent' => $default['professionalPercent'],
        'fixedAmount' => $default['fixedAmount'],
        'cardFeeEnabled' => $bool($parsed['cardFeeEnabled'] ?? false),
        'cardFeePercent' => chevalier_billing_ai_num($parsed['cardFeePercent'] ?? 0, 100),
        'cardFeeOn' => $onlyIn($parsed['cardFeeOn'] ?? 'share', ['share', 'practiced'], 'share'),
        'cardFeePaidBy' => $onlyIn($parsed['cardFeePaidBy'] ?? 'doctor', ['doctor', 'clinic', 'split'], 'doctor'),
        'materialsPaidBy' => $onlyIn($parsed['materialsPaidBy'] ?? 'doctor', ['doctor', 'clinic'], 'doctor'),
        'reimburseComponents' => $bool($parsed['reimburseComponents'] ?? false),
        'reimburseMaterials' => $bool($parsed['reimburseMaterials'] ?? false),
        'reimburseLab' => $bool($parsed['reimburseLab'] ?? false),
        'aiSummary' => mb_substr(trim((string) (is_scalar($parsed['aiSummary'] ?? null) ? $parsed['aiSummary'] : '')), 0, 200),
        'default' => $default,
        'categories' => $categories,
    ];
}
