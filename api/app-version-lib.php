<?php
declare(strict_types=1);

/**
 * Assinatura da versão do Chevalier Gestão.
 * Muda automaticamente quando arquivos de aplicação são alterados.
 */
function chevalier_app_build(string $root): string
{
    $root = rtrim($root, DIRECTORY_SEPARATOR);
    $paths = [];
    $topFiles = [
        '.htaccess', 'home.php', 'index.php', 'index.html', 'login.php', 'release.json', 'manifest.json',
    ];
    foreach ($topFiles as $name) {
        $file = $root . DIRECTORY_SEPARATOR . $name;
        if (is_file($file)) {
            $paths[] = $file;
        }
    }

    foreach (['assets', 'api'] as $dirName) {
        $dir = $root . DIRECTORY_SEPARATOR . $dirName;
        if (!is_dir($dir)) {
            continue;
        }
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $fileInfo) {
            if (!$fileInfo->isFile()) {
                continue;
            }
            $path = $fileInfo->getPathname();
            $base = $fileInfo->getBasename();
            if ($dirName === 'api' && in_array($base, ['config.php', 'config.local.php'], true)) {
                continue;
            }
            if (!preg_match('/(?:\.php|\.js|\.css|\.svg|\.json|\.html|\.htaccess)$/i', $base)) {
                continue;
            }
            $paths[] = $path;
        }
    }

    sort($paths, SORT_STRING);
    $ctx = hash_init('sha256');
    foreach ($paths as $path) {
        $relative = ltrim(str_replace($root, '', $path), DIRECTORY_SEPARATOR);
        hash_update($ctx, $relative . "\0");
        $handle = @fopen($path, 'rb');
        if ($handle) {
            hash_update_stream($ctx, $handle);
            fclose($handle);
        }
        hash_update($ctx, "\0");
    }
    return substr(hash_final($ctx), 0, 16);
}

function chevalier_release_manifest(string $root): array
{
    $file = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'release.json';
    if (!is_file($file)) {
        return [];
    }
    $raw = @file_get_contents($file);
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [];
    }
    $changes = [];
    foreach (($data['changes'] ?? []) as $change) {
        if (is_string($change)) {
            $text = trim($change);
        } elseif (is_array($change)) {
            $title = trim((string) ($change['title'] ?? ''));
            $detail = trim((string) ($change['detail'] ?? ''));
            $text = trim($title . ($title !== '' && $detail !== '' ? ': ' : '') . $detail);
        } else {
            $text = '';
        }
        if ($text !== '') {
            $changes[] = function_exists('mb_substr') ? mb_substr($text, 0, 240) : substr($text, 0, 240);
        }
        if (count($changes) >= 8) {
            break;
        }
    }
    return [
        'version' => trim((string) ($data['version'] ?? '')),
        'name' => trim((string) ($data['name'] ?? '')),
        'releasedAt' => trim((string) ($data['releasedAt'] ?? '')),
        'changes' => $changes,
    ];
}

function chevalier_asset_url(string $path): string
{
    $file = dirname(__DIR__) . '/' . ltrim($path, '/');
    $version = is_file($file) ? (string) filemtime($file) : (string) time();
    return htmlspecialchars($path . '?v=' . $version, ENT_QUOTES, 'UTF-8');
}
