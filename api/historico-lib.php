<?php
declare(strict_types=1);

/**
 * Mescla históricos empacotados (assets/data/*-historico.json) no payload app_state.
 * Idempotente via importId + flags em state.imports.
 * V2: upsert por importId para corrigir status/progresso financeiros.
 */
function chevalier_historico_sources(): array
{
    return [
        ['id' => 'allon', 'file' => 'allon-historico.json', 'flag' => 'allonHistoricoV2', 'kind' => 'patients', 'clinicId' => 'allon', 'origin' => 'Prestação', 'sourceTag' => 'allon-historico'],
        ['id' => 'daniele', 'file' => 'daniele-historico.json', 'flag' => 'danieleHistoricoV2', 'kind' => 'patients', 'clinicId' => 'daniele', 'origin' => 'Prestação', 'sourceTag' => 'daniele-historico'],
        ['id' => 'gerlucia', 'file' => 'gerlucia-historico.json', 'flag' => 'gerluciaHistoricoV2', 'kind' => 'patients', 'clinicId' => 'gerlucia', 'origin' => 'Prestação', 'sourceTag' => 'gerlucia-historico'],
        ['id' => 'particular', 'file' => 'particular-historico.json', 'flag' => 'particularHistoricoV2', 'kind' => 'patients', 'clinicId' => 'particular', 'origin' => 'Particular', 'sourceTag' => 'particular-historico'],
        ['id' => 'custos', 'file' => 'custos-historico.json', 'flag' => 'custosHistoricoV2', 'kind' => 'costs', 'sourceTag' => 'custos-historico'],
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

function chevalier_historico_patient_fields(array $rec): array
{
    $procId = (string) ($rec['procedureId'] ?? 'proc-historico-livre');
    return [
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
        'lab' => (float) ($rec['lab'] ?? 0),
        'components' => (float) ($rec['components'] ?? 0),
        'clinical' => (float) ($rec['clinical'] ?? 0),
        'progress' => (string) ($rec['progress'] ?? 'Em tratamento'),
        'observation' => (string) ($rec['observation'] ?? ''),
        'notes' => (string) ($rec['notes'] ?? $rec['observation'] ?? ''),
        'monthRef' => (string) ($rec['monthRef'] ?? ''),
        'labFlag' => (string) ($rec['labFlag'] ?? ''),
        'practicedValue' => (float) ($rec['practicedValue'] ?? 0),
        'billingSnap' => [
            'practiced' => (float) ($rec['practicedValue'] ?? 0),
            'netShare' => (float) ($rec['value'] ?? 0),
        ],
    ];
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
    $byImport = [];
    foreach ($state['patients'] as $i => $p) {
        if (!empty($p['importId'])) {
            $byImport[(string) $p['importId']] = $i;
        }
    }
    $clinicId = (string) ($data['clinicId'] ?? $src['clinicId'] ?? 'particular');
    $origin = (string) ($data['origin'] ?? $src['origin'] ?? 'Prestação');
    $sourceTag = (string) ($src['sourceTag'] ?? 'historico');
    $touched = 0;
    foreach ($records as $rec) {
        if (!is_array($rec) || empty($rec['importId'])) {
            continue;
        }
        $importId = (string) $rec['importId'];
        $fields = chevalier_historico_patient_fields($rec);
        if (isset($byImport[$importId])) {
            $i = $byImport[$importId];
            $state['patients'][$i] = array_merge($state['patients'][$i], $fields, [
                'importSource' => $sourceTag,
                'name' => (string) ($rec['name'] ?? $state['patients'][$i]['name'] ?? ''),
            ]);
            $touched++;
            continue;
        }
        $state['patients'][] = array_merge([
            'id' => chevalier_historico_uid(),
            'importId' => $importId,
            'importSource' => $sourceTag,
            'name' => (string) ($rec['name'] ?? ''),
            'origin' => $origin,
            'clinicId' => $clinicId,
            'cost' => 0,
            'consumedItems' => [],
        ], $fields);
        $byImport[$importId] = count($state['patients']) - 1;
        $touched++;
    }
    return $touched;
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
    $byImport = [];
    foreach ($state['costs'] as $i => $c) {
        if (!empty($c['importId'])) {
            $byImport[(string) $c['importId']] = $i;
        }
    }
    $sourceTag = (string) ($src['sourceTag'] ?? 'custos-historico');
    $touched = 0;
    foreach ($records as $rec) {
        if (!is_array($rec) || empty($rec['importId'])) {
            continue;
        }
        $importId = (string) $rec['importId'];
        $fields = [
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
        if (isset($byImport[$importId])) {
            $i = $byImport[$importId];
            $state['costs'][$i] = array_merge($state['costs'][$i], $fields);
            $touched++;
            continue;
        }
        $state['costs'][] = array_merge([
            'id' => chevalier_historico_uid(),
            'importId' => $importId,
        ], $fields);
        $byImport[$importId] = count($state['costs']) - 1;
        $touched++;
    }
    return $touched;
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
