<?php
declare(strict_types=1);

/**
 * Mescla históricos empacotados (assets/data/*-historico.json) no payload app_state.
 * Idempotente via importId + flags em state.imports.
 */
function chevalier_historico_sources(): array
{
    return [
        ['id' => 'allon', 'file' => 'allon-historico.json', 'flag' => 'allonHistoricoV1', 'kind' => 'patients', 'clinicId' => 'allon', 'origin' => 'Prestação', 'sourceTag' => 'allon-historico'],
        ['id' => 'daniele', 'file' => 'daniele-historico.json', 'flag' => 'danieleHistoricoV1', 'kind' => 'patients', 'clinicId' => 'daniele', 'origin' => 'Prestação', 'sourceTag' => 'daniele-historico'],
        ['id' => 'gerlucia', 'file' => 'gerlucia-historico.json', 'flag' => 'gerluciaHistoricoV1', 'kind' => 'patients', 'clinicId' => 'gerlucia', 'origin' => 'Prestação', 'sourceTag' => 'gerlucia-historico'],
        ['id' => 'particular', 'file' => 'particular-historico.json', 'flag' => 'particularHistoricoV1', 'kind' => 'patients', 'clinicId' => 'particular', 'origin' => 'Particular', 'sourceTag' => 'particular-historico'],
        ['id' => 'custos', 'file' => 'custos-historico.json', 'flag' => 'custosHistoricoV1', 'kind' => 'costs', 'sourceTag' => 'custos-historico'],
    ];
}

function chevalier_historico_uid(): string
{
    return substr(bin2hex(random_bytes(8)), 0, 12);
}

function chevalier_historico_load_json(string $file): ?array
{
    $path = dirname(__DIR__) . '/assets/data/' . basename($file);
    if (!is_file($path)) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function chevalier_historico_merge_patients(array &$state, array $data, array $src): int
{
    $records = $data['records'] ?? [];
    if (!is_array($records) || !$records) {
        return 0;
    }
    if (!isset($state['patients']) || !is_array($state['patients'])) {
        $state['patients'] = [];
    }
    $existing = [];
    foreach ($state['patients'] as $p) {
        if (!empty($p['importId'])) {
            $existing[(string) $p['importId']] = true;
        }
    }
    $clinicId = (string) ($data['clinicId'] ?? $src['clinicId'] ?? 'particular');
    $origin = (string) ($data['origin'] ?? $src['origin'] ?? 'Prestação');
    $sourceTag = (string) ($src['sourceTag'] ?? 'historico');
    $added = 0;
    foreach ($records as $rec) {
        if (!is_array($rec) || empty($rec['importId']) || isset($existing[(string) $rec['importId']])) {
            continue;
        }
        $procId = (string) ($rec['procedureId'] ?? 'proc-historico-livre');
        $patient = [
            'id' => chevalier_historico_uid(),
            'importId' => (string) $rec['importId'],
            'importSource' => $sourceTag,
            'name' => (string) ($rec['name'] ?? ''),
            'origin' => $origin,
            'clinicId' => $clinicId,
            'procedureId' => $procId,
            'lines' => [[
                'procedureId' => $procId,
                'qty' => 1,
                'tooth' => (string) ($rec['tooth'] ?? ''),
                'honorarium' => (float) ($rec['value'] ?? 0),
                'practicedValue' => (float) ($rec['practicedValue'] ?? 0),
            ]],
            'date' => (string) ($rec['date'] ?? date('Y-m-d')),
            'value' => (float) ($rec['value'] ?? 0),
            'received' => (float) ($rec['received'] ?? 0),
            'due' => (string) ($rec['due'] ?? $rec['date'] ?? date('Y-m-d')),
            'status' => (string) ($rec['status'] ?? 'À receber'),
            'cost' => 0,
            'lab' => (float) ($rec['lab'] ?? 0),
            'components' => (float) ($rec['components'] ?? 0),
            'clinical' => (float) ($rec['clinical'] ?? 0),
            'progress' => (string) ($rec['progress'] ?? 'Em tratamento'),
            'observation' => (string) ($rec['observation'] ?? ''),
            'notes' => (string) ($rec['notes'] ?? $rec['observation'] ?? ''),
            'monthRef' => (string) ($rec['monthRef'] ?? ''),
            'practicedValue' => (float) ($rec['practicedValue'] ?? 0),
            'consumedItems' => [],
            'billingSnap' => [
                'practiced' => (float) ($rec['practicedValue'] ?? 0),
                'netShare' => (float) ($rec['value'] ?? 0),
            ],
        ];
        $state['patients'][] = $patient;
        $existing[(string) $rec['importId']] = true;
        $added++;
    }
    return $added;
}

function chevalier_historico_merge_costs(array &$state, array $data, array $src): int
{
    $records = $data['records'] ?? [];
    if (!is_array($records) || !$records) {
        return 0;
    }
    if (!isset($state['costs']) || !is_array($state['costs'])) {
        $state['costs'] = [];
    }
    $existing = [];
    foreach ($state['costs'] as $c) {
        if (!empty($c['importId'])) {
            $existing[(string) $c['importId']] = true;
        }
    }
    $sourceTag = (string) ($src['sourceTag'] ?? 'custos-historico');
    $added = 0;
    foreach ($records as $rec) {
        if (!is_array($rec) || empty($rec['importId']) || isset($existing[(string) $rec['importId']])) {
            continue;
        }
        $state['costs'][] = [
            'id' => chevalier_historico_uid(),
            'importId' => (string) $rec['importId'],
            'importSource' => $sourceTag,
            'desc' => (string) ($rec['desc'] ?? 'Custo'),
            'type' => (string) ($rec['type'] ?? 'OUTROS'),
            'center' => (string) ($rec['center'] ?? 'Geral'),
            'date' => (string) ($rec['date'] ?? date('Y-m-d')),
            'due' => (string) ($rec['due'] ?? $rec['date'] ?? date('Y-m-d')),
            'method' => (string) ($rec['method'] ?? 'PIX'),
            'value' => (float) ($rec['value'] ?? 0),
            'status' => (string) ($rec['status'] ?? 'À PAGAR'),
            'notes' => (string) ($rec['notes'] ?? ''),
            'monthRef' => (string) ($rec['monthRef'] ?? ''),
        ];
        $existing[(string) $rec['importId']] = true;
        $added++;
    }
    return $added;
}

/**
 * @return array{patients:int,costs:int,changed:bool}
 */
function chevalier_historico_apply_to_state(array &$state, bool $force = false): array
{
    if (!isset($state['imports']) || !is_array($state['imports'])) {
        $state['imports'] = [];
    }
    $patients = 0;
    $costs = 0;
    foreach (chevalier_historico_sources() as $src) {
        $flag = $src['flag'];
        if (!$force && !empty($state['imports'][$flag])) {
            continue;
        }
        $data = chevalier_historico_load_json($src['file']);
        if (!$data || empty($data['records']) || !is_array($data['records'])) {
            $state['imports'][$flag] = [
                'at' => date('Y-m-d'),
                'added' => 0,
                'total' => 0,
                'source' => $src['file'],
                'empty' => true,
            ];
            continue;
        }
        $kind = (string) ($data['kind'] ?? $src['kind'] ?? 'patients');
        $batchPatients = 0;
        $batchCosts = 0;
        if ($kind === 'costs') {
            $batchCosts = chevalier_historico_merge_costs($state, $data, $src);
            $costs += $batchCosts;
        } else {
            $batchPatients = chevalier_historico_merge_patients($state, $data, $src);
            $patients += $batchPatients;
        }
        $prev = $state['imports'][$flag] ?? [];
        $state['imports'][$flag] = [
            'at' => date('Y-m-d'),
            'added' => (int) ($prev['added'] ?? 0) + $batchPatients + $batchCosts,
            'lastBatch' => $batchPatients + $batchCosts,
            'total' => count($data['records']),
            'source' => (string) ($data['source'] ?? $src['file']),
        ];
    }
    return ['patients' => $patients, 'costs' => $costs, 'changed' => ($patients + $costs) > 0];
}
