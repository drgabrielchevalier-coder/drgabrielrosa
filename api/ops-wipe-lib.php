<?php
declare(strict_types=1);

/**
 * Zera dados operacionais (pacientes, cobranças/recebimentos, custos,
 * próteses, movimentações) preservando clínicas, procedimentos e
 * catálogo de materiais com estoque = 0.
 * Sela flags de histórico para não reimportar automaticamente.
 */

function chevalier_ops_wipe_version(): int
{
    return 1;
}

function chevalier_seal_historico_imports(array &$state): void
{
    if (!isset($state['imports']) || !is_array($state['imports'])) {
        $state['imports'] = [];
    }
    $meta = [
        'at' => date('Y-m-d'),
        'added' => 0,
        'total' => 0,
        'source' => 'ops-wipe',
        'sealed' => true,
    ];
    foreach (chevalier_historico_sources() as $src) {
        $state['imports'][$src['flag']] = $meta;
    }
    // Flags V1 legadas (caso algum caminho antigo ainda as leia)
    foreach ([
        'allonHistoricoV1',
        'danieleHistoricoV1',
        'gerluciaHistoricoV1',
        'particularHistoricoV1',
        'custosHistoricoV1',
    ] as $flag) {
        $state['imports'][$flag] = $meta;
    }
}

/**
 * @param array<string,mixed> $state
 * @return array<string,mixed>
 */
function chevalier_wipe_operational_state(array $state): array
{
    $state['patients'] = [];
    $state['people'] = [];
    $state['costs'] = [];
    $state['payroll'] = [];
    $state['prostheses'] = [];
    $state['reminders'] = [];
    $state['plans'] = [];
    $state['importBatches'] = [];
    $state['nfImports'] = [];
    $state['stockLedger'] = [];

    if (isset($state['materials']) && is_array($state['materials'])) {
        foreach ($state['materials'] as $i => $m) {
            if (!is_array($m)) {
                continue;
            }
            $state['materials'][$i]['stock'] = 0;
            $state['materials'][$i]['updated'] = date('Y-m-d');
        }
    }

    chevalier_seal_historico_imports($state);
    $state['opsWipeVersion'] = chevalier_ops_wipe_version();
    $state['opsWipedAt'] = date('c');
    if (!isset($state['schemaVersion'])) {
        $state['schemaVersion'] = 5;
    }

    return $state;
}

/**
 * Aplica wipe one-shot se a versão de limpeza do código for maior que a do estado.
 *
 * @param array<string,mixed> $state
 */
function chevalier_maybe_auto_wipe_ops(array &$state): bool
{
    $ver = (int) ($state['opsWipeVersion'] ?? 0);
    if ($ver >= chevalier_ops_wipe_version()) {
        return false;
    }
    $state = chevalier_wipe_operational_state($state);
    return true;
}
