<?php
declare(strict_types=1);

/**
 * Normaliza a interpretação da IA de descrições livres de procedimento
 * (ex.: "Rasp c/ prof + Rest 24") → procedimentos do catálogo + dente/região.
 * Usado por api/procedure-match-ai.php.
 */

/** Dente FDI (permanente 11–48, decíduo 51–85) ou região curta ("superior", "quadrante 1"…). */
function chevalier_match_tooth($v): string
{
    $s = trim((string) (is_scalar($v) ? $v : ''));
    if ($s === '') {
        return '';
    }
    if (preg_match_all('/\b([1-8][1-8])\b/', $s, $m)) {
        $teeth = array_values(array_filter($m[1], static function ($t) {
            $q = (int) $t[0];
            $n = (int) $t[1];
            return ($q <= 4 && $n >= 1 && $n <= 8) || ($q >= 5 && $n >= 1 && $n <= 5);
        }));
        if ($teeth) {
            return implode(', ', array_unique($teeth));
        }
    }
    return mb_substr($s, 0, 30);
}

/**
 * @param array<string,mixed> $parsed resposta da IA: {"results":[{"i":0,"items":[{procedureId,tooth,newName,specialty,kind}]}]}
 * @param list<string> $validIds ids do catálogo
 * @param int $count quantidade de textos enviados
 * @return list<list<array<string,string>>> itens por índice do texto
 */
function chevalier_match_normalize(array $parsed, array $validIds, int $count): array
{
    $valid = array_flip($validIds);
    $specs = ['cirurgia', 'implante', 'protese', 'endodontia', 'periodontia', 'clinica', 'ortodontia', 'pediatria', 'diagnostico', 'hof'];
    $out = array_fill(0, max(0, $count), []);
    foreach (is_array($parsed['results'] ?? null) ? $parsed['results'] : [] as $pos => $r) {
        if (!is_array($r)) {
            continue;
        }
        $i = isset($r['i']) && is_numeric($r['i']) ? (int) $r['i'] : (int) $pos;
        if ($i < 0 || $i >= $count) {
            continue;
        }
        $items = [];
        foreach (array_slice(is_array($r['items'] ?? null) ? $r['items'] : [], 0, 8) as $it) {
            if (!is_array($it)) {
                continue;
            }
            $id = (string) (is_scalar($it['procedureId'] ?? null) ? $it['procedureId'] : '');
            $tooth = chevalier_match_tooth($it['tooth'] ?? '');
            if ($id !== '' && isset($valid[$id])) {
                $items[] = ['procedureId' => $id, 'tooth' => $tooth];
                continue;
            }
            $newName = mb_substr(trim((string) (is_scalar($it['newName'] ?? null) ? $it['newName'] : '')), 0, 80);
            if ($newName === '') {
                continue;
            }
            $spec = (string) ($it['specialty'] ?? 'clinica');
            $items[] = [
                'procedureId' => '',
                'tooth' => $tooth,
                'newName' => mb_strtoupper(mb_substr($newName, 0, 1)) . mb_substr($newName, 1),
                'specialty' => in_array($spec, $specs, true) ? $spec : 'clinica',
                'kind' => ($it['kind'] ?? '') === 'cirurgico' ? 'cirurgico' : 'clinico',
            ];
        }
        $out[$i] = $items;
    }
    return $out;
}
